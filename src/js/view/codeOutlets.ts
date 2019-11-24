import { CPPConstruct, RuntimeConstruct, CompiledConstruct, RuntimeFunction } from "../core/constructs";
import { SimulationOutlet } from "./simOutlets";
import { Mutable } from "../util/util";
import { listenTo, stopListeningTo, messageResponse, Message, MessageResponses } from "../util/observe";
import { CompiledFunctionDefinition } from "../core/declarations";
import { RuntimeBlock, CompiledBlock, RuntimeStatement, CompiledStatement, RuntimeDeclarationStatement, CompiledDeclarationStatement, RuntimeExpressionStatement, CompiledExpressionStatement, RuntimeIfStatement, CompiledIfStatement, RuntimeWhileStatement, CompiledWhileStatement, CompiledForStatement, RuntimeForStatement, RuntimeReturnStatement } from "../core/statements";

const EVAL_FADE_DURATION = 500;
const RESET_FADE_DURATION = 500;

export abstract class ConstructOutlet<RTConstruct_type extends RuntimeConstruct = RuntimeConstruct> {

    protected readonly element: JQuery;
    protected readonly construct: RTConstruct_type["model"];
    protected readonly simOutlet: SimulationOutlet;

    public readonly parent?: ConstructOutlet;
    public readonly inst?: RTConstruct_type;

    public _act!: MessageResponses;

    /**
     * Children are stored by the ID of the CPPConstruct they display.
     */
    private readonly children: {[index: number]: ConstructOutlet} = {}; 
    
    public constructor(element: JQuery, construct: RTConstruct_type["model"], simOutlet: SimulationOutlet, parent?: ConstructOutlet) {
        this.element = element;
        this.construct = construct;
        this.simOutlet = simOutlet;

        if (parent) {
            parent.addChildOutlet(this);
        }

        this.element.addClass("codeInstance");
        this.element.append("<span class=\"highlight\"></span>");
    }

    public setRuntimeInstance(inst: RTConstruct_type) {
        if (this.inst) {
            this.removeInstance();
        }

        (<Mutable<this>>this).inst = inst;
        if (this.inst) {
            listenTo(this, inst);
        }

        this.element.removeClass("upNext");
        this.element.removeClass("wait");
        this.instanceSet();

        for(let id in inst.pushedChildren) {
            this.childPushed(inst.pushedChildren[id]);
        }
    }

    protected instanceSet(inst: RTConstruct_type) {

    }

    public removeInstance() {

        // Note: should be a fact that if I have no instance, neither do my children
        if (this.inst) {

            // First remove children instances (deepest children first, due to recursion)
            for (let c in this.children){
                this.children[c].removeInstance();
            }

            stopListeningTo(this, this.inst);

            delete (<Mutable<this>>this).inst;
            
            this.element.removeClass("upNext");
            this.element.removeClass("wait");
            this.instanceRemoved();
        }
    }

    protected instanceRemoved() {

    }

    private addChildOutlet(child: ConstructOutlet) {
        this.children[child.construct.id] = child;
        (<Mutable<ConstructOutlet>>child).parent = this;
    }
    
    private setChildInstance(childInst: RuntimeConstruct) {
        let childOutlet = this.children[childInst.model.id];

        // If we have a child outlet waiting, go for it
        if (childOutlet) {
            childOutlet.setRuntimeInstance(childInst);
            return;
        }

        // Otherwise, pass to parent that may have a suitable outlet
        // TODO: does this ever actually happen?
        if (this.parent) {
            this.parent.setChildInstance(childInst);
        }
        else{
            // Just ignore it?
            console.log("WARNING! Child instance pushed for which no corresponding child outlet was found! (" + childInst.model.toString() + ")");
        }
    }


    @messageResponse("upNext")
    private upNext() {
        this.element.removeClass("wait");
        this.element.addClass("upNext");
    }

    @messageResponse("wait")
    private wait() {
        this.element.removeClass("upNext");
        this.element.addClass("wait");
    }

    // TODO: move this to a function subclass?
    @messageResponse("popped")
    private popped() {
        // this.inst! must be defined if this function is called, since it would have had to send the message
        if (this.inst!.stackType == "function") {
            this.simOutlet.popFunction(this.inst);
        }
        this.element.removeClass("upNext");
        this.element.removeClass("wait");
    }

    // Called when child instance is created under any instance this
    // outlet is listening to. Looks for a child outlet of this outlet
    // that is waiting for the code model associated with the instance.
    // Propagates the child instance upward through ancestors until one
    // is found that was waiting for it.
    @messageResponse("childPushed")
    private childPushed(msg: Message<RuntimeConstruct>) {
        this.setChildInstance(msg.data);
    }

    @messageResponse("current")
    private current() {
        this.element.addClass("current");
    }

    @messageResponse("uncurrent")
    private uncurrent() {
        this.element.removeClass("current");
    }

    _act: {
        idCodeOutlet: Observer._IDENTIFY
    }
}

export class FunctionOutlet extends ConstructOutlet<RuntimeFunction> {

    public readonly body: BlockOutlet;

    private readonly paramsElem: JQuery;

    public constructor(element: JQuery, rtFunc: RuntimeFunction, simOutlet: SimulationOutlet, parent?: ConstructOutlet) {
        super(element, rtFunc.model, simOutlet, parent);

        this.element.addClass("function");

        // Set up DOM and child outlets
        // if (!isA(this.code, ConstructorDefinition) && !isA(this.code, DestructorDefinition)){ // Constructors/destructors use this outlet too for now and they don't have return type
        //     var returnTypeElem = $('<span class="code-returnType">' + this.construct.type.returnType.toString() + "</span>");
        //     this.element.append(returnTypeElem);
        //     this.element.append(" ");
        // }
        var nameElem = $('<span class="code-functionName">' + this.construct.name + "</span>");
        this.element.append(nameElem);

        this.paramsElem = $("<span>()</span>");
        this.element.append(this.paramsElem);


        // ctor-initializer
        // let memInits = this.construct.memberInitializers;
        // if (memInits && memInits.length > 0){
        //     this.element.append("\n : ");
        //     for(let i = 0; i < memInits.length; ++i){
        //         let mem = memInits[i];
        //         this.element.append(Util.htmlDecoratedName(mem.entity.name, mem.entity.type));
        //         let memElem = $("<span></span>");
        //         this.addChildOutlet(createCodeOutlet(memElem, mem, this.simOutlet));
        //         this.element.append(memElem);
        //         if (i != memInits.length - 1){
        //             this.element.append(", ");
        //         }
        //     }
        // }

        let bodyElem = $("<span></span>").appendTo(this.element);
        this.body = new BlockOutlet(bodyElem, this.construct.body, this.simOutlet, this);

        // if (this.construct.autosToDestruct){
        //     this.construct.autosToDestruct.forEach((dest) => {
        //         this.addChildOutlet(Outlets.CPP.FunctionCall.instance(dest, this.simOutlet, this, []));
        //     });
        // }
        // if (this.construct.membersToDestruct){
        //     this.construct.membersToDestruct.forEach((dest) => {
        //         this.addChildOutlet(Outlets.CPP.FunctionCall.instance(dest, this.simOutlet, this, []));
        //     });
        // }
        // if (this.construct.basesToDestruct){
        //     this.construct.basesToDestruct.forEach((dest) => {
        //         this.addChildOutlet(Outlets.CPP.FunctionCall.instance(dest, this.simOutlet, this, []));
        //     });
        // }

        this.setRuntimeInstance(rtFunc);
        
    }

    protected instanceSet(inst: RuntimeFunction) {

        if (inst.hasControl) {
            this.element.addClass("hasControl");
        }

        if (!inst.caller) {
            // special case - if no caller, it must be the main function
            return;
        }

        // Set up parameter outlets
        let paramConstructs = inst.caller.argInitializers;
        this.paramsElem.empty();
        this.paramsElem.append("(");
        //let paramElems = [];
        for(let i = 0; i < paramConstructs.length; ++i) {
            let elem = $("<span></span>");
            let paramOutlet = new ParameterOutlet(elem, paramConstructs[i], this.simOutlet, this);
            //this.addChildOutlet(paramOutlet);
            //paramElems.push(elem);
            this.paramsElem.append(elem);
            if (i < paramConstructs.length - 1) {
                this.paramsElem.append(", ");
            }
        }
        this.paramsElem.append(")");
    }

    @messageResponse("gainControl")
    private gainControl() {
        this.element.addClass("hasControl");
    }

    @messageResponse("loseControl")
    private loseControl() {
        this.element.removeClass("hasControl");
    }



    // _act: mixin({}, Outlets.CPP.Code._act, {

    //     tailCalled : function(msg){
    //         this.setUpParams();
    //     },
    //     reset : function(msg){
    //         this.body.removeInstance();
    //     }

    // }, true)
}

var curlyOpen = "<span class=\"curly-open\">{</span>";
var curlyClose = "<span class=\"curly-close\">}</span>";

export class BlockOutlet extends ConstructOutlet<RuntimeBlock> {

    public constructor(element: JQuery, construct: CompiledBlock, simOutlet: SimulationOutlet, parent?: ConstructOutlet) {
        super(element, construct, simOutlet, parent);
        
        this.element.removeClass("codeInstance");
        this.element.addClass("braces");
        this.element.append(curlyOpen);
        this.element.append("<br />");
        let innerElem = $("<span class=\"inner\"><span class=\"highlight\"></span></span>");
        innerElem.addClass("block");
        this.element.append(innerElem);

        // this.gotoLinks = [];
        //let statementElems = [];
        this.construct.statements.forEach(stmt => {
            let lineElem = $('<span class="blockLine"></span>');
            let elem = $("<span></span>");
            let child = createCodeOutlet(elem, stmt, this.simOutlet, this);

            // let gotoLink = $('<span class="gotoLink link">>></span>');
            // lineElem.append(gotoLink);
            // this.gotoLinks.push(gotoLink);
            // //gotoLink.css("visibility", "hidden");
            // let self = this;

            // // wow this is really ugly lol. stupid closures
            // gotoLink.click(
            //     function (x) {
            //         return function () {
            //             if (!self.inst){
            //                 return;
            //             }

            //             var me = $(this);
            //             //if (self.gotoInProgress){
            //             //    return;
            //             //}
            //             //self.gotoInProgress = true;
            //             var temp = me.html();
            //             if (me.html() == "&lt;&lt;"){
            //                 self.simOutlet.simOutlet.stepBackward(self.simOutlet.sim.stepsTaken() - self.inst.childInstances.statements[x].stepsTaken);
            //                 return;
            //             }


            //             me.addClass("inProgress");

            //             self.inst.pauses[x] = {pauseAtIndex: x, callback: function(){
            //                 //self.gotoInProgress = false;
            //                 me.removeClass("inProgress");
            //             }};
            //             //if (self.inst.pauses[x]){
            //                 self.simOutlet.send("skipToEnd");
            //             //}
            //         };
            //     }(i));

            lineElem.append(elem);
            innerElem.append(lineElem);
            innerElem.append("<br />");
        });

        this.element.append("<br />");
        this.element.append(curlyClose);

//        this.element.append("}");


    }

    // instanceSet : function(){
    //     Outlets.CPP.Block._parent.instanceSet.apply(this, arguments);
    //     for(var i = 0; i < this.inst.index; ++i){
    //         this.gotoLinks[i].html("<<").css("visibility", "visible");
    //     }
    //     for(var i = this.inst.index; i < this.gotoLinks.length; ++i){
    //         this.gotoLinks[i].html(">>").css("visibility", "visible");
    //     }
    // }

    // instanceRemoved : function(){
    //     Outlets.CPP.Block._parent.instanceRemoved.apply(this, arguments);
    //     for(var i = 0; i < this.gotoLinks.length; ++i){
    //         this.gotoLinks[i].html(">>").css("visibility", "hidden");
    //     }
    // },

    // _act: mixin({}, Outlets.CPP.Code._act, {

    //     index: function(msg){
    //         this.gotoLinks[msg.data].html("<<");
    //         //this.gotoLinks[msg.data].css("visibility", "hidden");
    //     }

    // }, true)
}


// Lobster.Outlets.CPP.OpaqueFunctionBodyBlock = Outlets.CPP.Code.extend({
//     _name: "Outlets.CPP.OpaqueFunctionBodyBlock",

//     createElement: function(){
//         this.element.removeClass("codeInstance");
//         this.element.addClass("braces");
//         this.element.append(curlyOpen);
//         this.element.append("<br />");
//         var inner = this.innerElem = $("<span class=\"inner\"><span class=\"highlight\"></span></span>");
//         inner.addClass("block");
//         this.element.append(inner);
//         var lineElem = $('<span class="blockLine">// Implementation not shown</span>');
//         inner.append(lineElem);
//         inner.append("<br />");
//         this.element.append("<br />");
//         this.element.append(curlyClose);
//     }
// });

export class StatementOutlet<RTConstruct_type extends RuntimeStatement = RuntimeStatement> extends ConstructOutlet<RTConstruct_type> {

    public constructor(element: JQuery, construct: RTConstruct_type["model"], simOutlet: SimulationOutlet, parent?: ConstructOutlet) {
        super(element, construct, simOutlet, parent);
        this.element.addClass("statement");
    }

    // TODO: I don't think this is important, so it should probably be removed
    // // Statements get reset after being popped
    // setInstance : function(inst){
    //     if (inst.isActive){
    //         Outlets.CPP.Statement._parent.setInstance.apply(this, arguments);
    //     }
    // }
    
    @messageResponse("reset")
    private reset() {
        this.removeInstance();
    }

}

export class DeclarationStatementOutlet extends StatementOutlet<RuntimeDeclarationStatement> {

    public readonly declaration: DeclarationOutlet;
    
    public constructor(element: JQuery, construct: CompiledDeclarationStatement, simOutlet: SimulationOutlet, parent?: ConstructOutlet) {
        super(element, construct, simOutlet, parent);

        var elem = $("<span></span>")
        // TODO: needs to support the possibility of multiple declarations on one line.
        //       That was originally implemented in the DeclarationOutlet class, but should
        //       be moved here now that there is a presumption that the declaration itself
        //       will only declare one thing, but a declaration statement may have multiple
        //       declarations.
        this.declaration = createCodeOutlet(elem, this.construct.declaration, this.simOutlet, this);
        this.element.append(elem);
        this.element.append(";");
    }
}

export class ExpressionStatementOutlet extends StatementOutlet<RuntimeExpressionStatement> {

    public readonly expression: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledExpressionStatement, simOutlet: SimulationOutlet, parent?: ConstructOutlet) {
        super(element, construct, simOutlet, parent);

        let elem = $("<span></span>")
        this.expression = createCodeOutlet(elem, this.construct.expression, this.simOutlet, this);
        this.element.append(elem);
        this.element.append(";");
    }

}

export class IfStatementOutlet extends StatementOutlet<RuntimeIfStatement> {
    
    public readonly condition: ExpressionOutlet;
    public readonly then: StatementOutlet;
    public readonly otherwise?: StatementOutlet;

    public constructor(element: JQuery, construct: CompiledIfStatement, simOutlet: SimulationOutlet, parent?: ConstructOutlet) {
        super(element, construct, simOutlet, parent);

        this.element.addClass("selection");

        this.element.append(htmlDecoratedKeyword("if"));
        this.element.append('(');

        let ifElem = $("<span></span>");
        this.condition = createCodeOutlet(ifElem, this.construct.condition, this.simOutlet, this);
        this.element.append(ifElem);

        this.element.append(") ");

        let thenElem = $("<span></span>");
        this.then = createCodeOutlet(thenElem, this.construct.then, this.simOutlet, this);
        this.element.append(thenElem);

        if (this.construct.otherwise){
            this.element.append("<br />");
            this.element.append(Util.htmlDecoratedKeyword("else"));
            this.element.append(" ");
            let elseElem = $("<span></span>");
            this.otherwise = createCodeOutlet(elseElem, this.construct.otherwise, this.simOutlet, this);
            this.element.append(elseElem);
        }
    }
}

export class WhileStatementOutlet extends StatementOutlet<RuntimeWhileStatement> {
    
    public readonly condition: ExpressionOutlet;
    public readonly body: StatementOutlet;

    public constructor(element: JQuery, construct: CompiledWhileStatement, simOutlet: SimulationOutlet, parent?: ConstructOutlet) {
        super(element, construct, simOutlet, parent);

        this.element.addClass("code-while");

        this.element.append(Util.htmlDecoratedKeyword("while"));
        this.element.append("(");

        var condElem = $("<span></span>");
        this.condition = createCodeOutlet(condElem, this.construct.condition, this.simOutlet, this);
        this.element.append(condElem);

        this.element.append(") ");

        var bodyElem = $("<span></span>");
        this.body = createCodeOutlet(bodyElem, this.construct.body, this.simOutlet, this);
        this.element.append(bodyElem);
    }
}

// Lobster.Outlets.CPP.DoWhile = Outlets.CPP.Statement.extend({
//     _name: "Outlets.CPP.DoWhile",

//     init: function(element, code, simOutlet){
//         this.initParent(element, code, simOutlet);
//         this.element.addClass("code-doWhile");
//     },

//     createElement: function(){
//         this.element.append(Util.htmlDecoratedKeyword("do"));

//         var bodyElem = $("<span></span>")
//         this.addChildOutlet(this.body = createCodeOutlet(bodyElem, this.construct.body, this.simOutlet));
//         this.element.append(bodyElem);

//         this.element.append("\n" + Util.htmlDecoratedKeyword("while") + "(");

//         var condElem = $("<span></span>")
//         this.addChildOutlet(this.condition = createCodeOutlet(condElem, this.construct.condition, this.simOutlet));
//         this.element.append(condElem);

//         this.element.append(") ");


//     },

//     _act: $.extend({}, Outlets.CPP.Statement._act, {
//         reset: function(){
//             this.condition.removeInstance();
//             this.body.removeInstance();
//         }
//     })
// });



export class ForStatementOutlet extends StatementOutlet<RuntimeForStatement> {

    public readonly initial: ExpressionStatementOutlet | NullStatementOutlet | DeclarationStatementOutlet;
    public readonly condition: ExpressionStatementOutlet;
    public readonly post: ExpressionStatementOutlet;
    public readonly body: StatementOutlet;

    public constructor(element: JQuery, construct: CompiledForStatement, simOutlet: SimulationOutlet, parent?: ConstructOutlet) {
        super(element, construct, simOutlet, parent);

        this.element.addClass("code-for");

        this.element.append(Util.htmlDecoratedKeyword("for"));
        this.element.append("(");

        var initElem = $("<span></span>");
        this.initial = createCodeOutlet(initElem, this.construct.initial, this.simOutlet, this);
        this.element.append(initElem);

        this.element.append(" ");

        var condElem = $("<span></span>");
        this.condition = createCodeOutlet(condElem, this.construct.condition, this.simOutlet, this);
        this.element.append(condElem);

        this.element.append("; ");

        var postElem = $("<span></span>");
        this.post = createCodeOutlet(postElem, this.construct.post, this.simOutlet, this);
        this.element.append(postElem);

        this.element.append(") ");

        var bodyElem = $("<span></span>");
        this.body = createCodeOutlet(bodyElem, this.construct.body, this.simOutlet, this);
        this.element.append(bodyElem);

    }
}

export class ReturnOutlet extends StatementOutlet<RuntimeReturnStatement> {
    _name: "Outlets.CPP.Return",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("return");
        this.argOutlets = [];
        this.element.append('<span class="code-keyword">return</span>');

        var exprElem = this.exprElem = $("<span></span>");
        if (this.construct.returnInitializer) {
            this.element.append(" ");
            this.argOutlets.push(this.expr = this.addChildOutlet(createCodeOutlet(exprElem, this.construct.returnInitializer, this.simOutlet)));
        }
        this.element.append(exprElem);

        this.element.append(";");
    },

    _act : mixin({}, Outlets.CPP.Code._act, {
        returned: function(msg){
            var data = msg.data;

            // If it's main just return
            if (this.construct.containingFunction().isMain){
                return;
            }

            if (this.expr) {
                this.inst.containingRuntimeFunction().parent.send("returned", this.argOutlets[0]);
            }

        }
    }),

    createElement: function(){}
});

Lobster.Outlets.CPP.Break = Outlets.CPP.Statement.extend({
    _name: "Outlets.CPP.Break",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("break");

        this.element.append(Util.htmlDecoratedKeyword("break"));
        this.element.append(";");
    },

    createElement: function(){}
});

Lobster.Outlets.CPP.Declaration = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.Declaration",

//    init: function(element, code, simOutlet){
//        this.initParent(element, code, simOutlet);
//    },

    createElement: function(){
        this.element.addClass("codeInstance");
        this.element.addClass("declaration");
        this.element.append(Util.htmlDecoratedType(this.construct.typeSpec.type));
        this.element.append(" ");

        var declaratorElems = this.declaratorElems = [];
        for(var i = 0; i < this.construct.declarators.length; ++i){

            // Create element for declarator
            var decl = this.construct.declarators[i];
            var declElem = $('<span class="codeInstance code-declarator"><span class="highlight"></span></span>');
            declaratorElems.push(declElem);
            declElem.append(decl.type.declaratorString(Util.htmlDecoratedName(decl.name, decl.type)));
            this.element.append(declElem);

            // Create element for initializer, if there is one
            if(this.construct.initializers[i]){
                var initElem = $("<span></span>");
                this.addChildOutlet(createCodeOutlet(initElem, this.construct.initializers[i], this.simOutlet));
                this.element.append(initElem);
            }

            // Add commas where needed
            if (i < this.construct.declarators.length - 1){
                this.element.append(", ");
            }
        }

    },
    instanceRemoved : function(){
        this.setCurrentDeclaratorIndex(null);
    },
    setCurrentDeclaratorIndex : function(decl){
        // Remove from old
        if (this.currentDeclarator){
            this.currentDeclarator.removeClass("active");
        }

        // Set new or set to null
        if (decl || decl === 0){
            this.currentDeclarator = this.declaratorElems[decl];
            this.currentDeclarator.addClass("active");
        }
        else{
            this.currentDeclarator = null;
        }
    },
    _act : mixin({}, Outlets.CPP.Code._act, {
        initializing: function(msg){
            this.setCurrentDeclaratorIndex(msg.data);
        }
    })
});

Lobster.Outlets.CPP.Parameter = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.Parameter",

    init: function(element, code, simOutlet, parent){
        this.initParent(element, code, simOutlet, parent);
        //this.argOutlet = argOutlet;

        this.element.addClass("codeInstance");
        this.element.addClass("declaration");
        this.element.addClass("parameter");

        //if (this.construct.funcCall){
        //    var callOutlet = Outlets.CPP.FunctionCall.instance(this.construct.funcCall, this.simOutlet, this, [this.argOutlet]);
        //    this.addChildOutlet(callOutlet);
        //}
        this.element.append(this.initValueElem = $("<div> </div>"));

        if(this.inst){
            // If it's associated with an instance of an initializer
            var obj = this.construct.entity.runtimeLookup(this.simOutlet.simOutlet.sim, this.inst);
            this.element.append(obj.type.typeString(false, Util.htmlDecoratedName(obj.name, obj.type), true));
        }
        else{
            // If it's associated with a non-instance parameter
            this.element.append(this.construct.entity.type.typeString(false, Util.htmlDecoratedName(this.construct.entity.name, this.construct.entity.type), true));
        }

        //this.element.append("<br />");

    },

    createElement: function(){

//          this.element.append(this.construct.argument.evalResult.valueString());

    },
    instanceRemoved : function(){
        var x = 3;
    },

    _act: copyMixin(Outlets.CPP.Code._act, {
        initialized : function(msg){
            var obj = msg.data;
            var val;
            if (isA(obj, ReferenceEntityInstance)){
                val = "@"+obj.refersTo.nameString(); // TODO make a different animation for reference binding
            }
            else{
                val = obj.valueString();
            }
            val = Util.htmlDecoratedValue(val);
            var argOutlet = this.inst.identify("idArgOutlet");
            if (argOutlet && argOutlet.simOutlet === this.simOutlet){
                var self = this;
                this.simOutlet.valueTransferOverlay(argOutlet, this, val, 500, function(){
                    // I decided that the parameter text shouldn't change. It already changes in memory display.
                    // Changed my mind again. Now it does display underneath.
                    self.initValueElem.html(val);
                });
            }
            else{
                this.initValueElem.html(val);
            }
        }
    })
});


Lobster.Outlets.CPP.Initializer = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.Initializer",

    init: function (element, code, simOutlet) {
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-initializer");

        var exprElem = $("<span></span>");
        this.element.append(exprElem);
        this.addChildOutlet(createCodeOutlet(exprElem, this.construct.initExpr, this.simOutlet));
    },
    _act : copyMixin(Outlets.CPP.Code._act, {
        "idArgOutlet" : Observer._IDENTIFY
    })
});

Lobster.Outlets.CPP.InitializerList = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.InitializerList",

    init: function (element, code, simOutlet) {
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-initializerList");

        this.element.append("{");

        for (var i = 0; i < this.construct.initializerListLength; ++i) {
            var argElem = $("<span></span>");
            this.addChildOutlet(createCodeOutlet(argElem, this.code["arg"+i], this.simOutlet));
            this.element.append(argElem);
            if (i < this.construct.initializerListLength - 1) {
                this.element.append(", ");
            }
        }

        this.element.append("}");
    },
    _act : copyMixin(Outlets.CPP.Code._act, {
        "idArgOutlet" : Observer._IDENTIFY
    })
});


Lobster.Outlets.CPP.DefaultInitializer = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.DefaultInitializer",

    init: function (element, code, simOutlet) {
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-defaultInitializer");

        var self = this;

        this.argOutlets = [];
        if (this.construct.funcCall){
            this.addChildOutlet(Outlets.CPP.FunctionCall.instance(this.construct.funcCall, this.simOutlet, this, this.argOutlets));
        }
        if (this.construct.arrayElemInitializers){
            this.construct.arrayElemInitializers.forEach(function(elemInit){
                self.addChildOutlet(Outlets.CPP.DefaultInitializer.instance(element, elemInit, simOutlet));
            });
        }

        if (this.construct.temporariesToDestruct){
            this.construct.temporariesToDestruct.forEach(function(tempDest){
                self.addChildOutlet(Outlets.CPP.FunctionCall.instance(tempDest, self.simOutlet, self, []));
            });
        }

        if (this.construct.isMemberInitializer) {
            this.element.append("()");
        }
    },
    _act : copyMixin(Outlets.CPP.Code._act, {
        "idArgOutlet" : Observer._IDENTIFY
    })
});

Lobster.Outlets.CPP.DirectInitializer = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.DirectInitializer",

    init: function (element, code, simOutlet) {
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-directInitializer");

        var length = this.construct.numArgs;
        if (length > 0 || this.construct.isMemberInitializer) {
            this.element.append("(");
        }

        var self = this;

        if (this.construct.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.construct.funcCall, this.simOutlet, this, this.argOutlets);
            this.addChildOutlet(callOutlet);

            this.argOutlets = callOutlet.argOutlets;
            this.argOutlets.forEach(function(argOutlet,i,arr){
                self.addChildOutlet(argOutlet);
                self.element.append(argOutlet.element);
                if (i < arr.length - 1) {
                    self.element.append(", ");
                }
            });
        }
        else{
            this.argOutlets = this.construct.args.map(function(arg,i,arr){
                var argElem = $("<span></span>");
                var argOutlet = self.addChildOutlet(createCodeOutlet(argElem, arg, self.simOutlet));
                self.element.append(argElem);
                if (i < arr.length - 1) {
                    self.element.append(", ");
                }
                return argOutlet;
            });
        }


        if (length > 0 || this.construct.isMemberInitializer){
            this.element.append(")");
        }


        if (this.construct.temporariesToDestruct){
            this.construct.temporariesToDestruct.forEach(function(tempDest){
                self.addChildOutlet(Outlets.CPP.FunctionCall.instance(tempDest, self.simOutlet, self, []));
            });
        }

    },
    _act : copyMixin(Outlets.CPP.Code._act, {
        "idArgOutlet" : Observer._IDENTIFY
    })
});


Lobster.Outlets.CPP.CopyInitializer = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.CopyInitializer",

    init: function (element, code, simOutlet, options) {
        options = options || {};
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-copyInitializer");

        if (isA(this.construct.parent, Declaration)){
            this.element.append(" = ");
        }
        var self = this;
        if (this.construct.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.construct.funcCall, this.simOutlet, this, this.argOutlets);
            this.addChildOutlet(callOutlet);

            this.argOutlets = callOutlet.argOutlets;
            this.argOutlets.forEach(function(argOutlet,i,arr){
                self.addChildOutlet(argOutlet);
                self.element.append(argOutlet.element);
                if (i < arr.length - 1) {
                    self.element.append(", ");
                }
            });
        }
        else{
            this.argOutlets = this.construct.args.map(function(arg,i,arr){
                var argElem = $("<span></span>");
                var argOutlet = self.addChildOutlet(createCodeOutlet(argElem, arg, self.simOutlet));
                self.element.append(argElem);
                if (i < arr.length - 1) {
                    self.element.append(", ");
                }
                return argOutlet;
            });
        }


        if (this.construct.temporariesToDestruct){
            this.construct.temporariesToDestruct.forEach(function(tempDest){
                self.addChildOutlet(Outlets.CPP.FunctionCall.instance(tempDest, self.simOutlet, self, []));
            });
        }

    },
    _act : copyMixin(Outlets.CPP.Code._act, {
        "idArgOutlet" : Observer._IDENTIFY
    })
});


Lobster.Outlets.CPP.ParameterInitializer = Outlets.CPP.CopyInitializer.extend({
    _name: "Outlets.CPP.ParameterInitializer"

});

Lobster.Outlets.CPP.ReturnInitializer = Outlets.CPP.CopyInitializer.extend({
    _name: "Outlets.CPP.ReturnInitializer"
});



Lobster.Outlets.CPP.Expression = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.Expression",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("expression");
        if (this.construct.isFullExpression()) {this.element.addClass("fullExpression");}

        this.evalResultElem = $("<span class='lobster-hidden-expression' style='opacity:0'></span>"); // TODO fix this ugly hack
        this.wrapper = $("<span class='lobster-expression-wrapper'></span>");
        this.exprElem = $("<span class='expr'></span>"); // TODO fix this ugly hack
        this.wrapper.append(this.exprElem);
        this.wrapper.append(this.evalResultElem);

        this.element.append(this.wrapper);

        this.element.append("<span class='exprType'>" + (this.construct.type ? this.construct.type.toString() : "") + "</span>");

        if (this.construct.temporariesToDestruct){
            var self = this;
            this.construct.temporariesToDestruct.forEach(function(tempDest){
                self.addChildOutlet(Outlets.CPP.FunctionCall.instance(tempDest, self.simOutlet, self, []));
            });
        }

        //if (this.construct.isFullExpression()){
        //    var self = this;
        //    this.exprElem.hover(function(){
        //        //alert("hi");
        //        self.element.addClass("current");
        //    },function(){
        //        //alert("hi");
        //        self.element.removeClass("current");
        //        //self.simOutlet.sim.closeMessage();
        //    }).click(function(){
        //        self.simOutlet.sim.explain(self.inst ? self.inst.explain() : self.code.explain(self.simOutlet.sim));
        //    });
        //}
    },

    createElement : function(){

    },

    setEvalResult : function(value, suppressAnimation){
        this.showingEvalValue = true;
        // If it's void, don't do anything
        if (value === undefined || isA(value.type, Types.Void)){
            return;
        }

        if (value.isA(CPPObject) || value.isA(FunctionEntity)){
            this.evalResultElem.html(value.nameString());
            this.evalResultElem.addClass("lvalue");
        }
        else{  // value.isA(Value)
            if (isA(value.type, Types.Tree_t)){
                this.evalResultElem.html(breadthFirstTree(value.rawValue()));
            }
            else{
                this.evalResultElem.html(value.valueString());
            }
            this.evalResultElem.addClass("rvalue");
            if (!value.isValueValid()){
                this.evalResultElem.addClass("invalid");
            }
        }

        if(Outlets.CPP.CPP_ANIMATIONS && !suppressAnimation) {
            this.wrapper.animate({
                width: this.evalResultElem.css("width")
            }, 500, function () {
                $(this).css("width", "auto");
            });
//                this.evalResultElem.animate({
//                    width: this.evalResultElem.css("width")
//                }, 500, function () {
//                    $(this).css("width", "auto");
//                });
        }

        //if (suppressAnimation){
        //    this.evalResultElem.addClass("noTransitions").height();
        //    this.exprElem.addClass("noTransitions").height();
        //}

        this.evalResultElem.removeClass("lobster-hidden-expression").fadeTo(EVAL_FADE_DURATION, 1);
        this.exprElem.addClass("lobster-hidden-expression").fadeTo(EVAL_FADE_DURATION, 0);

        //if (suppressAnimation){
        //    this.evalResultElem.removeClass("noTransitions").height();
        //    this.exprElem.removeClass("noTransitions").height();
        //}
    },

    removeEvalValue : function(){
        this.showingEvalValue = false;
//        if(Outlets.CPP.CPP_ANIMATIONS) {
//            this.wrapper.animate({
//                width: this.exprElem.css("width")
//            }, 500, function () {
//                $(this).css("width", "auto");
//            });
////                this.evalResultElem.animate({
////                    width: this.evalResultElem.css("width")
////                }, 500, function () {
////                    $(this).css("width", "auto");
////                });
//        }
        var self = this;
        //setTimeout(function() {
            self.exprElem.removeClass("lobster-hidden-expression").fadeTo(RESET_FADE_DURATION, 1);
            self.evalResultElem.addClass("lobster-hidden-expression").fadeTo(RESET_FADE_DURATION, 0);

            self.element.removeClass("rvalue");
            self.element.removeClass("lvalue");
            self.wrapper.css("width", "auto");
        //}, 2000);
    },

    instanceSet : function(){
        Outlets.CPP.Expression._parent.instanceSet.apply(this, arguments);
        if (this.inst.evalResult){
            this.setEvalResult(this.inst.evalResult, true);
        }
        else{
            this.removeEvalValue();
        }
    },

    instanceRemoved : function(inst){
        Outlets.CPP.Expression._parent.instanceSet.apply(this, arguments);
        this.removeEvalValue();
    },

    _act: $.extend({}, Outlets.CPP.Code._act, {
        evaluated: function(msg){
            var value = msg.data;
            this.setEvalResult(value);


//            console.log("expression evaluated to " + value.value);
        },
        returned: function(msg){
            var value = msg.data;
            this.setEvalResult(value);

//            if(Outlets.CPP.CPP_ANIMATIONS) {
//                this.wrapper.animate({
//                    width: this.evalResultElem.css("width")
//                }, 500, function () {
//                    $(this).css("width", "auto");
//                });
//            }

            //this.evalResultElem.removeClass("lobster-hidden-expression");//.fadeTo(EVAL_FADE_DURATION, 1);
            //this.exprElem.addClass("lobster-hidden-expression");//.fadeTo(EVAL_FADE_DURATION, 0);

//            console.log("expression evaluated to " + value.value);
        }
    })




});

Lobster.Outlets.CPP.Assignment = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Assignment",
    htmlOperator : Util.htmlDecoratedOperator("=", "code-assignmentOp"),

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("assignment");


        var self = this;
        var lhsElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(lhsElem, this.construct.lhs, this.simOutlet));
        this.exprElem.append(lhsElem);

        this.exprElem.append(" " + this.htmlOperator + " ");

        if (this.construct.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.construct.funcCall, this.simOutlet, this);
            this.addChildOutlet(callOutlet);

            this.argOutlets = callOutlet.argOutlets;
            this.argOutlets.forEach(function(argOutlet,i,arr){
                self.addChildOutlet(argOutlet);
                self.exprElem.append(argOutlet.element);
                if (i < arr.length - 1) {
                    self.exprElem.append(", ");
                }
            });
        }
        else{
            var rhsElem = $("<span></span>");
            this.argOutlets = [];
            this.argOutlets.push(this.addChildOutlet(createCodeOutlet(rhsElem, this.construct.rhs, this.simOutlet)));
            this.exprElem.append(rhsElem);
        }
    },

    _act: mixin({}, Outlets.CPP.Expression._act, {

        returned: function(msg){
            var value = msg.data;
            this.setEvalResult(value);

//            if(Outlets.CPP.CPP_ANIMATIONS) {
//                this.wrapper.animate({
//                    width: this.evalResultElem.css("width")
//                }, 500, function () {
//                    $(this).css("width", "auto");
//                });
//            }

            this.evalResultElem.removeClass("lobster-hidden-expression").fadeTo(EVAL_FADE_DURATION, 1);
            this.exprElem.addClass("lobster-hidden-expression").fadeTo(EVAL_FADE_DURATION, 0);

//            console.log("expression evaluated to " + value.value);
        }

    }, true)
});

Lobster.Outlets.CPP.Ternary = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Ternary",
    htmlOperator1 : Util.htmlDecoratedOperator("?", "code-ternaryOp"),
    htmlOperator2 : Util.htmlDecoratedOperator(":", "code-ternaryOp"),

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-ternary");

        var elem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(elem, this.construct.condition, this.simOutlet));
        this.exprElem.append(elem);

        this.exprElem.append(" " + this.htmlOperator1 + " ");

        elem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(elem, this.construct.then, this.simOutlet));
        this.exprElem.append(elem);

        this.exprElem.append(" " + this.htmlOperator2 + " ");

        elem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(elem, this.construct.otherwise, this.simOutlet));
        this.exprElem.append(elem);
    }
});

Lobster.Outlets.CPP.Comma = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Comma",
    htmlOperator: Util.htmlDecoratedOperator(",", "code-binaryOp"),

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-comma");

        var elem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(elem, this.construct.left, this.simOutlet));
        this.exprElem.append(elem);

        this.exprElem.append(" " + this.htmlOperator + " ");

        elem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(elem, this.construct.right, this.simOutlet));
        this.exprElem.append(elem);
    }
});

Lobster.Outlets.CPP.CompoundAssignment = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.CompoundAssignment",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("compoundAssignment");

        //var lhsElem = $("<span></span>");
        //this.addChildOutlet(createCodeOutlet(lhsElem, this.construct.rhs.left, this.simOutlet));
        //this.exprElem.append(lhsElem);
        //
        //this.exprElem.append(" " + Util.htmlDecoratedOperator(this.construct.operator, "code-compoundAssignmentOp") + " ");

        var rhsElem = $("<span></span>");
        var rhsOutlet = createCodeOutlet(rhsElem, this.construct.rhs, this.simOutlet);
        this.addChildOutlet(rhsOutlet);
        this.exprElem.append(rhsElem);
        rhsElem.find(".code-binaryOp").first().replaceWith(Util.htmlDecoratedOperator(this.construct.operator, "code-compoundAssignmentOp"));
    }
});

Lobster.Outlets.CPP.FunctionCall = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.FunctionCall",

    init: function (code, simOutlet, returnOutlet) {
        var self = this;
        this.initParent(null, code, simOutlet);

        this.returnOutlet = returnOutlet;


        this.argOutlets = this.construct.argInitializers.map(function(argInit){
            return createCodeOutlet($("<span></span>"), argInit, self.simOutlet);
        });
    },

    instanceSet : Class.ADDITIONALLY(function(){
        if (this.inst.hasBeenCalled && this.inst.func.isActive){
            var funcOutlet = this.simOutlet.pushFunction(this.inst.func, this);
            funcOutlet && this.listenTo(funcOutlet);
        }
    }),

    _act: mixin({}, Outlets.CPP.Code._act, {

        returned: function(msg){
            // This may be the case for main, constructors, destructors, etc.
            if (!this.returnOutlet){
                return;
            }
            var sourceOutlet = msg.data;

            var self = this;
            var data = sourceOutlet.inst && sourceOutlet.inst.childInstances && sourceOutlet.inst.childInstances.args && sourceOutlet.inst.childInstances.args[0] && sourceOutlet.inst.childInstances.args[0].evalResult;
            if (!data){
                return;
            }
            this.simOutlet.valueTransferOverlay(sourceOutlet, this.returnOutlet, Util.htmlDecoratedValue(data.instanceString()), 500,
                function () {
                    if(self.returnOutlet) { // may have evaporated if we're moving too fast
                        self.returnOutlet.setEvalResult(data);
                    }
                });
        },
        tailCalled : function(msg){
            var callee = msg.data;
            callee.send("tailCalled", this);
        },
        called : function(msg){
            var callee = msg.data;
            assert(this.simOutlet);
            if (!this.simOutlet.simOutlet.autoRunning || !this.simOutlet.simOutlet.skipFunctions){
                var funcOutlet = this.simOutlet.pushFunction(this.inst.func, this);
                funcOutlet && this.listenTo(funcOutlet);
            }
        },
        idCodeOutlet: false // do nothing


    }, true)
});

Lobster.Outlets.CPP.FunctionCallExpression = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.FunctionCallExpression",

    init: function (element, code, simOutlet) {
        var self = this;
        this.initParent(element, code, simOutlet);
        this.element.addClass("functionCall");

        if (this.construct.funcCall.func.isVirtual()){
            this.element.addClass("virtual");
        }


        if (this.construct.recursiveStatus === "recursive" && this.construct.isTail) {
            this.element.addClass("tail");
        }

        var operandElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(operandElem, this.construct.operand, this.simOutlet));
        this.exprElem.append(operandElem);

//        if (this.construct.operand.)
//        this.exprElem.append(this.construct.operand.entity.name + "(");
        this.exprElem.append("(");

        var callOutlet = Outlets.CPP.FunctionCall.instance(this.construct.funcCall, this.simOutlet, this, this.argOutlets);
        this.addChildOutlet(callOutlet);

        this.argOutlets = callOutlet.argOutlets;
        this.argOutlets.forEach(function(argOutlet,i,arr){
            self.addChildOutlet(argOutlet);
            self.exprElem.append(argOutlet.element);
            if (i < arr.length - 1) {
                self.exprElem.append(", ");
            }
        });


        this.exprElem.append(")");
        if (this.construct.funcCall.func.isVirtual()){
            this.exprElem.append("<sub>v</sub>");
        }
    },

    _act: mixin({}, Outlets.CPP.Expression._act, {

//        calleeOutlet : function(callee, source){
//            this.addChildOutlet(callee);
//        },

        returned: function(msg){
            var value = msg.data;
            this.setEvalResult(value);

            this.evalResultElem.removeClass("lobster-hidden-expression");
            this.exprElem.addClass("lobster-hidden-expression");
        },
        tailCalled : function(msg){
            var callee = msg.data;
            callee.send("tailCalled", this);
        }

    }, true)
});

Lobster.Outlets.CPP.BinaryOperator = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.BinaryOperator",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        if (this.construct.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.construct.funcCall, this.simOutlet, this);
            this.addChildOutlet(callOutlet);

            this.argOutlets = callOutlet.argOutlets;

            // If it's a member function call there will only be one argument and we need to add the left
            if (this.construct.isMemberOverload){
                var elem = $("<span></span>");
                this.addChildOutlet(createCodeOutlet(elem, this.construct.left, this.simOutlet));
                this.exprElem.append(elem);
                this.exprElem.append(" " + Util.htmlDecoratedOperator(this.construct.operator, "code-binaryOp") + " ");
            }

            var self = this;
            this.argOutlets.forEach(function(argOutlet,i,arr){
                self.addChildOutlet(argOutlet);
                self.exprElem.append(argOutlet.element);
                if (i < arr.length - 1) {
                    self.exprElem.append(" " + self.code.operator + " ");
                }
            });
        }
        else{
            var elem = $("<span></span>");
            this.addChildOutlet(createCodeOutlet(elem, this.construct.left, this.simOutlet));
            this.exprElem.append(elem);

            this.exprElem.append(" <span class='codeInstance code-binaryOp'>" + this.construct.operator + "<span class='highlight'></span></span> ");

            var elem = $("<span></span>");
            this.addChildOutlet(createCodeOutlet(elem, this.construct.right, this.simOutlet));
            this.exprElem.append(elem);
        }
    },

    upNext: function(){
        Outlets.CPP.Expression.upNext.apply(this, arguments);
        this.element.find(".code-binaryOp").first().addClass("upNext");
    },

    wait: function(){
        this.element.find(".code-binaryOp").first().removeClass("upNext");
        Outlets.CPP.Expression.wait.apply(this, arguments);
    },

    instanceSet : function(){
        Outlets.CPP.BinaryOperator._parent.instanceSet.apply(this, arguments);
        this.element.find(".code-binaryOp").first().removeClass("upNext");
    },

    instanceRemoved : function(){
        Outlets.CPP.BinaryOperator._parent.instanceRemoved.apply(this, arguments);
        this.element.find(".code-binaryOp").first().removeClass("upNext");
    }
});

Lobster.Outlets.CPP.UnaryOp = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.UnaryOp",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.exprElem.append(Util.htmlDecoratedOperator(this.construct.operator, "code-unaryOp"));
        this.addSpace && this.exprElem.append(" ");

        if (this.construct.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.construct.funcCall, this.simOutlet, this);
            this.addChildOutlet(callOutlet);
            this.argOutlets = callOutlet.argOutlets;

            // If it's a member function call there will be no arguments and we need to add the operand
            if (this.construct.isMemberOverload) {
                var elem = $("<span></span>");
                this.addChildOutlet(createCodeOutlet(elem, this.construct.operand, this.simOutlet));
                this.exprElem.append(elem)
            }
            else{
                this.addChildOutlet(this.argOutlets[0]);
                this.exprElem.append(this.argOutlets[0].element);
            }
        }
        else{
            var elem = $("<span></span>");
            this.addChildOutlet(createCodeOutlet(elem, this.construct.operand, this.simOutlet));
            this.exprElem.append(elem)
        }
    },
    upNext: function(){
        Outlets.CPP.Expression.upNext.apply(this, arguments);
        var temp = this.element.find(".code-unaryOp").first().addClass("upNext");
//        console.log("upNext for " + this.construct.code.text);
    }
});

Lobster.Outlets.CPP.NewExpression = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.NewExpression",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-newExpression");
        this.exprElem.append(Util.htmlDecoratedOperator("new", "code-unaryOp"));
        this.exprElem.append(" ");

        if (isA(this.construct.heapType, Types.Array) && this.construct.dynamicLength){
            this.exprElem.append(this.construct.heapType.elemType.typeString(false, '[<span class="dynamicLength"></span>]'));
            this.addChildOutlet(createCodeOutlet(this.exprElem.find(".dynamicLength"), this.construct.dynamicLength, this.simOutlet));
        }
        else{
            this.exprElem.append(Util.htmlDecoratedType(this.construct.heapType));
        }

        if (this.construct.initializer) {
            var initElem = $("<span></span>");
            this.addChildOutlet(createCodeOutlet(initElem, this.construct.initializer, this.simOutlet));
            this.exprElem.append(initElem);
        }


    },
    upNext: function(){
        Outlets.CPP.Expression.upNext.apply(this, arguments);
        var temp = this.element.find(".code-unaryOp").first().addClass("upNext");
//        console.log("upNext for " + this.construct.code.text);
    }
});

Lobster.Outlets.CPP.Delete = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Delete",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-delete");
        this.exprElem.append(Util.htmlDecoratedOperator("delete", "code-unaryOp"));
        this.exprElem.append(" ");
        var operandElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(operandElem, this.construct.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        if (this.construct.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.construct.funcCall, this.simOutlet, this, []);
            this.addChildOutlet(callOutlet);
        }
    }
});


Lobster.Outlets.CPP.DeleteArray = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.DeleteArray",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-deleteArray");
        this.exprElem.append(Util.htmlDecoratedOperator("delete[]", "code-unaryOp"));
        this.exprElem.append(" ");
        var operandElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(operandElem, this.construct.operand, this.simOutlet));
        this.exprElem.append(operandElem);


    }
});



Lobster.Outlets.CPP.ConstructExpression = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.ConstructExpression",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-constructExpression");
        this.exprElem.append(Util.htmlDecoratedType(this.construct.type));

        if (this.construct.initializer) {
            var initElem = $("<span></span>");
            this.addChildOutlet(createCodeOutlet(initElem, this.construct.initializer, this.simOutlet));
            this.exprElem.append(initElem);
        }
    }
});



Lobster.Outlets.CPP.LogicalNot = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.LogicalNot",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-logicalNot");
        this.exprElem.append(Util.htmlDecoratedOperator(this.construct.operator, "code-unaryOp"));
        var operandElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(operandElem, this.construct.operand, this.simOutlet));
        this.exprElem.append(operandElem)
    }
});

Lobster.Outlets.CPP.Prefix = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Prefix",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-prefix");
        this.exprElem.append(Util.htmlDecoratedOperator(this.construct.operator, "code-unaryOp"));
        var operandElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(operandElem, this.construct.operand, this.simOutlet));
        this.exprElem.append(operandElem)
    }
});

Lobster.Outlets.CPP.Dereference = Outlets.CPP.UnaryOp.extend({
    _name: "Outlets.CPP.Dereference",
    textOp : "*",
    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-dereference");
    }
});


Lobster.Outlets.CPP.Increment = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Increment",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        var operandElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(operandElem, this.construct.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        this.exprElem.append(Util.htmlDecoratedOperator("++", "code-postfixOp"));
    }
});
Lobster.Outlets.CPP.Decrement = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Decrement",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        var operandElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(operandElem, this.construct.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        this.exprElem.append(Util.htmlDecoratedOperator("--", "code-postfixOp"));
    }
});


Lobster.Outlets.CPP.Subscript = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Subscript",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        var operandElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(operandElem, this.construct.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        this.element.addClass("code-subscript");
        this.exprElem.append(Util.htmlDecoratedOperator("[", "code-postfixOp"));


        if (this.construct.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.construct.funcCall, this.simOutlet, this);
            this.addChildOutlet(callOutlet);

            this.argOutlets = callOutlet.argOutlets;
            this.addChildOutlet(this.argOutlets[0]);
            this.exprElem.append(this.argOutlets[0].element);
        }
        else{
            var offsetElem = $("<span></span>");
            this.addChildOutlet(createCodeOutlet(offsetElem, this.construct.arg, this.simOutlet));
            this.exprElem.append(offsetElem);
        }

        this.exprElem.append(Util.htmlDecoratedOperator("]", "code-postfixOp"));
    }
});

Lobster.Outlets.CPP.Dot = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Dot",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        var operandElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(operandElem, this.construct.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        this.element.addClass("code-dot");
        this.exprElem.append(Util.htmlDecoratedOperator(".", "code-postfixOp"));

        this.exprElem.append(Util.htmlDecoratedName(this.construct.memberName, this.construct.type));
    },

    setEvalResult : function(value) {

    }
});

Lobster.Outlets.CPP.Arrow = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Arrow",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        var operandElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(operandElem, this.construct.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        this.element.addClass("code-dot");
        this.exprElem.append(Util.htmlDecoratedOperator("->", "code-postfixOp"));

        this.exprElem.append(Util.htmlDecoratedName(this.construct.memberName, this.construct.type));
    },

    setEvalResult : function(value) {

    }
});

Lobster.Outlets.CPP.AddressOf = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.AddressOf",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-addressOf");
        this.exprElem.append(Util.htmlDecoratedOperator("&", "code-unaryOp"));
        var operandElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(operandElem, this.construct.operand, this.simOutlet));
        this.exprElem.append(operandElem)
    }
});

Lobster.Outlets.CPP.UnaryPlus = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.UnaryPlus",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-unaryPlus");
        this.exprElem.append(Util.htmlDecoratedOperator("+", "code-unaryOp"));
        var operandElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(operandElem, this.construct.operand, this.simOutlet));
        this.exprElem.append(operandElem)
    }
});

Lobster.Outlets.CPP.UnaryMinus = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.UnaryMinus",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-unaryMinus");
        this.exprElem.append(Util.htmlDecoratedOperator("-", "code-unaryOp"));
        var operandElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(operandElem, this.construct.operand, this.simOutlet));
        this.exprElem.append(operandElem)
    }
});

Lobster.Outlets.CPP.Parentheses = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Parentheses",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.exprElem.append("(");
        var elem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(elem, this.construct.subexpression, this.simOutlet));
        this.exprElem.append(elem);
        this.exprElem.append(")");
    }
});

Lobster.Outlets.CPP.Identifier = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Identifier",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.exprElem.addClass("code-name");

        if (Array.isArray(this.construct.identifier)){ // Qualified name
            this.exprElem.append(this.construct.identifier.map(function(id){return id.identifier}).join("::"));
        }
        else{
            this.exprElem.append(this.construct.identifier);
        }
    },

    setEvalResult : function(value) {

    }
});

Lobster.Outlets.CPP.Literal = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Literal",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.exprElem.addClass("code-literal");
        this.exprElem.append(this.construct.value.valueString());
    }
});

Lobster.Outlets.CPP.ThisExpression = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.ThisExpression",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.exprElem.addClass("code-this");
        this.exprElem.append("this");
    }
});

Lobster.Outlets.CPP.ImplicitConversion = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.ImplicitConversion",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-implicitConversion");
        var fromElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(fromElem, this.construct.from, this.simOutlet));
        this.exprElem.append(fromElem)
    }
});

Lobster.Outlets.CPP.LValueToRValue = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.LValueToRValue",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-lValueToRValue");
        var fromElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(fromElem, this.construct.from, this.simOutlet));
        this.exprElem.append(fromElem)
    }
});

Lobster.Outlets.CPP.QualificationConversion = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.QualificationConversion",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-qualificationConversion");
        var fromElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(fromElem, this.construct.from, this.simOutlet));
        this.exprElem.append(fromElem)
    }
});

Lobster.Outlets.CPP.ArrayToPointer = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.ArrayToPointer",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-arrayToPointer");
        var fromElem = $("<span></span>");
        this.addChildOutlet(createCodeOutlet(fromElem, this.construct.from, this.simOutlet));
        this.exprElem.append(fromElem)
    }
});

var createCodeOutlet = function(element, code, simOutlet){
    assert(code);
    assert(simOutlet);
    var outletClass = DEFAULT_CODE_OUTLETS[code._class];
    if (outletClass) {
        return outletClass.instance(element, code, simOutlet);
    }
    else if(code.isA(Expressions.BinaryOperator)){
        return Outlets.CPP.BinaryOperator.instance(element, code, simOutlet);
    }
    else if(code.isA(Conversions.ImplicitConversion)){
        return Outlets.CPP.ImplicitConversion.instance(element, code, simOutlet);
    }
    else if(code.isA(Expressions.Expression)){
        return Outlets.CPP.Expression.instance(element, code, simOutlet);
    }
    else{
        return Outlets.CPP.Code.instance(element, code, simOutlet);
    }

};

var DEFAULT_CODE_OUTLETS = {};
DEFAULT_CODE_OUTLETS[Statements.Block] = Outlets.CPP.Block;
DEFAULT_CODE_OUTLETS[Statements.FunctionBodyBlock] = Outlets.CPP.Block;
DEFAULT_CODE_OUTLETS[Statements.OpaqueFunctionBodyBlock] = Outlets.CPP.OpaqueFunctionBodyBlock;
DEFAULT_CODE_OUTLETS[Statements.DeclarationStatement] = Outlets.CPP.DeclarationStatement;
DEFAULT_CODE_OUTLETS[Statements.ExpressionStatement] = Outlets.CPP.ExpressionStatement;
DEFAULT_CODE_OUTLETS[Statements.Selection] = Outlets.CPP.Selection;
DEFAULT_CODE_OUTLETS[Statements.While] = Outlets.CPP.While;
DEFAULT_CODE_OUTLETS[Statements.DoWhile] = Outlets.CPP.DoWhile;
DEFAULT_CODE_OUTLETS[Statements.For] = Outlets.CPP.For;
DEFAULT_CODE_OUTLETS[Statements.Return] = Outlets.CPP.Return;
DEFAULT_CODE_OUTLETS[Statements.Break] = Outlets.CPP.Break;
DEFAULT_CODE_OUTLETS[Declarations.Declaration] = Outlets.CPP.Declaration;
DEFAULT_CODE_OUTLETS[Declarations.Parameter] = Outlets.CPP.Parameter;
//DEFAULT_CODE_OUTLETS[Initializer] = Outlets.CPP.Initializer;
DEFAULT_CODE_OUTLETS[DefaultInitializer] = Outlets.CPP.DefaultInitializer;
DEFAULT_CODE_OUTLETS[DefaultMemberInitializer] = Outlets.CPP.DefaultInitializer;
DEFAULT_CODE_OUTLETS[MemberInitializer] = Outlets.CPP.DirectInitializer;
DEFAULT_CODE_OUTLETS[DirectInitializer] = Outlets.CPP.DirectInitializer;
DEFAULT_CODE_OUTLETS[CopyInitializer] = Outlets.CPP.CopyInitializer;
DEFAULT_CODE_OUTLETS[ParameterInitializer] = Outlets.CPP.ParameterInitializer;
DEFAULT_CODE_OUTLETS[ReturnInitializer] = Outlets.CPP.ReturnInitializer;
DEFAULT_CODE_OUTLETS[InitializerList] = Outlets.CPP.InitializerList;
DEFAULT_CODE_OUTLETS[Expressions.Expression] = Outlets.CPP.Expression;
DEFAULT_CODE_OUTLETS[Expressions.BinaryOperator] = Outlets.CPP.BinaryOperator;
//DEFAULT_CODE_OUTLETS[Expressions.BINARY_OPS["+"]] = Outlets.CPP.BinaryOperator;
DEFAULT_CODE_OUTLETS[Expressions.Assignment] = Outlets.CPP.Assignment;
DEFAULT_CODE_OUTLETS[Expressions.Ternary] = Outlets.CPP.Ternary;
DEFAULT_CODE_OUTLETS[Expressions.Comma] = Outlets.CPP.Comma;
DEFAULT_CODE_OUTLETS[Expressions.CompoundAssignment] = Outlets.CPP.CompoundAssignment;
DEFAULT_CODE_OUTLETS[Expressions.FunctionCallExpression] = Outlets.CPP.FunctionCallExpression;
DEFAULT_CODE_OUTLETS[Expressions.Subscript] = Outlets.CPP.Subscript;
DEFAULT_CODE_OUTLETS[Expressions.Dot] = Outlets.CPP.Dot;
DEFAULT_CODE_OUTLETS[Expressions.Arrow] = Outlets.CPP.Arrow;
DEFAULT_CODE_OUTLETS[Expressions.Increment] = Outlets.CPP.Increment;
DEFAULT_CODE_OUTLETS[Expressions.Decrement] = Outlets.CPP.Decrement;
DEFAULT_CODE_OUTLETS[Expressions.NewExpression] = Outlets.CPP.NewExpression;
DEFAULT_CODE_OUTLETS[Expressions.Delete] = Outlets.CPP.Delete;
DEFAULT_CODE_OUTLETS[Expressions.DeleteArray] = Outlets.CPP.DeleteArray;
DEFAULT_CODE_OUTLETS[Expressions.Construct] = Outlets.CPP.ConstructExpression;
DEFAULT_CODE_OUTLETS[Expressions.LogicalNot] = Outlets.CPP.LogicalNot;
DEFAULT_CODE_OUTLETS[Expressions.Prefix] = Outlets.CPP.Prefix;
DEFAULT_CODE_OUTLETS[Expressions.Dereference] = Outlets.CPP.Dereference;
DEFAULT_CODE_OUTLETS[Expressions.AddressOf] = Outlets.CPP.AddressOf;
DEFAULT_CODE_OUTLETS[Expressions.UnaryPlus] = Outlets.CPP.UnaryPlus;
DEFAULT_CODE_OUTLETS[Expressions.UnaryMinus] = Outlets.CPP.UnaryMinus;
DEFAULT_CODE_OUTLETS[Expressions.Parentheses] = Outlets.CPP.Parentheses;
DEFAULT_CODE_OUTLETS[Expressions.Identifier] = Outlets.CPP.Identifier;
DEFAULT_CODE_OUTLETS[Expressions.Literal] = Outlets.CPP.Literal;
DEFAULT_CODE_OUTLETS[Expressions.ThisExpression] = Outlets.CPP.ThisExpression;


DEFAULT_CODE_OUTLETS[Conversions.ArrayToPointer] = Outlets.CPP.ArrayToPointer;
DEFAULT_CODE_OUTLETS[Conversions.LValueToRValue] = Outlets.CPP.LValueToRValue;
DEFAULT_CODE_OUTLETS[Conversions.QualificationConversion] = Outlets.CPP.QualificationConversion;
