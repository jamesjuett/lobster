/**
 * @author James
 */

var Lobster = Lobster || {};
Lobster.Outlets.CPP = Lobster.Outlets.CPP || {};

Lobster.Outlets.CPP.Code = WebOutlet.extend({
    _name: "Outlets.CPP.Code",
    init: function (element, code, simOutlet, parent) {
        this.initParent(element);

        this.simOutlet = simOutlet;

        if (code.isA(CPPConstruct)){
            this.code = code;
        }
        else if (code.isA(CPPConstructInstance)){
            this.code = code.model;
        }
        else{
            assert(false); // must be one of those two
        }

        if (parent){
            parent.addChild(this);
        }

        // children are stored by the ID of the CPPConstruct they display
        this.children = {};

        this.element.addClass("codeInstance");
        this.element.append("<span class=\"highlight\"></span>");
        this.menuElem = $('<span class="menu"></span>');
        this.element.append(this.menuElem);

        this.createElement();

        if (code.isA(CPPConstructInstance)){
            this.setInstance(code);
        }
    },

    createElement: function(){
        // hook
    },

    setInstance: function(inst){
        if (this.inst){
            this.removeInstance(this.inst);
            //this.inst.removeListener(this);
        }
        this.inst = inst;
        if (this.inst){
            inst.addListener(this);
        }
        //this.element.addClass("hasInst");
        this.instanceSet();
        for(var i = 0; i < this.inst.pushedChildren.length; ++i){
            this.childPushed(this.inst.pushedChildren[i]);
        }
//        console.log("instance set for " + this._name);
    },

    instanceSet : function(){
        this.element.removeClass("upNext");
        this.element.removeClass("wait");
    },

    removeInstance : function(){

        // Note: should be a fact that if I have no instance, neither do my children
        var inst = this.inst;
        if (this.inst){

            // Stop listening
            this.inst.removeListener(this);

            // First remove children instances (deepest children first)
            for (var c in this.children){
                this.children[c].removeInstance();
            }

            // TODO: This comment was here but I don't know why I made that choice??? I changed it back.
            // We don't actually delete the instance or stop listening to it here.
            // We only do that when a different instance is set.
            this.instanceRemoved(inst);
        }
        //this.element.removeClass("hasInst");
    },

    instanceRemoved : function(){
        this.element.removeClass("upNext");
        this.element.removeClass("wait");
    },

    addChild: function(child){
        this.children[child.code.id] = child;
        child.parent = this;
        return child;
    },

    upNext: function(){
        this.element.removeClass("wait");
        this.element.addClass("upNext");

        //// Find function outlet in ancestors and scroll so this is visible
        //if (!isA(this, Outlets.CPP.Statement) || isA(this, Outlets.CPP.Block)){
        //    return;
        //}
        //
        //var parent = this.element.closest(".codeInstance.function");
        //
        //if (parent){
        //    var parentTop = parent.offset().top;
        //    var top = this.element.offset().top;
        //    if(top != parentTop){
        //        var old = parent.scrollTop();
        //        if (Math.abs(old - (top - parentTop)) > 50){
        //            parent.scrollTop(top - parentTop);
        //        }
        //    }
        //}
    },

    wait: function(){
        this.element.removeClass("upNext");
        this.element.addClass("wait");
    },

    popped: function(){
        if (this.inst.stackType == "call"){
            this.simOutlet.popFunction(this.inst);
        }
        this.element.removeClass("upNext");
        this.element.removeClass("wait");
    },

    // Called when child instance is created under any instance this
    // outlet is listening to. Looks for a child outlet of this outlet
    // that is waiting for the code model associated with the instance.
    // Propagates the child instance upward through ancestors until one
    // is found that was waiting for it.
    childPushed : function(childInst){
        var childOutlet = this.children[childInst.model.id];
        if (childOutlet){
            childOutlet.setInstance(childInst);
            return;
        }

        if (this.parent){
            this.parent.childPushed(childInst);
        }
        else{
            // Just ignore it?
            console.log("WARNING! Child instance pushed for which no corresponding child outlet was found! (" + childInst.model.toString() + ")");
        }
    },

    setCurrent: function(isCurrent) {
        if (isCurrent){
            this.addClass("current");
        }
        else{
            this.removeClass("current");
        }
    },

    _act: {
        childPushed: "childPushed",
        upNext: function(){
            this.upNext();
        },
        wait: function(){
            this.wait();
        },
        popped: function(){
            this.popped();
        },
        reset: function(){
            this.removeInstance();
        },
        current: "current",
        uncurrent: true,
        idCodeOutlet: Observer._IDENTIFY
    }
});

Lobster.Outlets.CPP.Function = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.Function",

    init: function(element, codeOrInst, simOutlet, parent){
        //assert(isA(callInst, CPPConstructInstance) && isA(callInst.model, FunctionCall));
        this.initParent(element, codeOrInst, simOutlet, parent);



    },
    createElement : function(){
        this.element.addClass("function");

        // Set up DOM and child outlets
        if (!isA(this.code, ConstructorDefinition) && !isA(this.code, DestructorDefinition)){ // Constructors/destructors use this outlet too for now and they don't have return type
            var returnTypeElem = $('<span class="code-returnType">' + this.code.type.returnType.toString() + "</span>");
            this.element.append(returnTypeElem);
            this.element.append(" ");
        }
        var nameElem = $('<span class="code-functionName">' + this.code.name + "</span>");


        this.element.append(nameElem);

        this.paramsElem = $("<span></span>");
        this.setUpParams();
        this.element.append(this.paramsElem);


        // ctor-initializer
        var memInits = this.code.memberInitializers;
        if (memInits && memInits.length > 0){
            this.element.append("\n : ");
            for(var i = 0; i < memInits.length; ++i){
                var mem = memInits[i];
                this.element.append(htmlDecoratedName(mem.entity.name, mem.entity.type));
                var memElem = $("<span></span>");
                this.addChild(createCodeOutlet(memElem, mem, this.simOutlet));
                this.element.append(memElem);
                if (i != memInits.length - 1){
                    this.element.append(", ");
                }
            }
        }

        var bodyElem = $("<span></span>");
        this.body = Outlets.CPP.Block.instance(bodyElem, this.code.body, this.simOutlet);
        this.element.append(bodyElem);
        this.addChild(this.body);

        var self = this;
        if (this.code.autosToDestruct){
            this.code.autosToDestruct.forEach(function(dest){
                self.addChild(Outlets.CPP.FunctionCall.instance(dest, self.simOutlet, self, []));
            });
        }
        if (this.code.membersToDestruct){
            this.code.membersToDestruct.forEach(function(dest){
                self.addChild(Outlets.CPP.FunctionCall.instance(dest, self.simOutlet, self, []));
            });
        }
        if (this.code.basesToDestruct){
            this.code.basesToDestruct.forEach(function(dest){
                self.addChild(Outlets.CPP.FunctionCall.instance(dest, self.simOutlet, self, []));
            });
        }

    },

    setUpParams : function(){
        var paramCodes = this.inst ? this.inst.caller.argInits : this.code.params;
        this.paramsElem.empty();
        this.paramsElem.append("(");
        //var paramElems = [];
        for(var i = 0; i < paramCodes.length; ++i) {
            var elem = $("<span></span>");
            var paramOutlet = Outlets.CPP.Parameter.instance(elem, paramCodes[i], this.simOutlet, this);
            //this.addChild(paramOutlet);
            //paramElems.push(elem);
            this.paramsElem.append(elem);
            if (i < paramCodes.length - 1) {
                this.paramsElem.append(", ");
            }
        }
        this.paramsElem.append(")");
    },

    instanceSet : function(){
        Outlets.CPP.Function._parent.instanceSet.apply(this, arguments);
        this.setUpParams();
    },

    _act: mixin({}, Outlets.CPP.Code._act, {

        returned: function(msg){
            // Nothing for now
        },
        tailCalled : function(msg){
            this.setUpParams();
        },
        reset : function(msg){
            this.body.removeInstance();
        },
        paramsFinished : function(msg){
            if (this.inst && this.inst.reusedFrame){
                var inst  = this.inst;
                this.removeInstance();
                this.setInstance(inst);
            }
        },
        currentFunction : function(){
            this.simOutlet.element.find(".currentFunction").removeClass("currentFunction");
            this.element.addClass("currentFunction");
        }

    }, true)
});

var curlyOpen = "<span class=\"curly-open\">{</span>";
var curlyClose = "<span class=\"curly-close\">}</span>";

Lobster.Outlets.CPP.Block = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.Block",

//    init: function(element, code, simOutlet){
//        this.initParent(element, code, simOutlet);
//    },

    createElement: function(){
        this.element.removeClass("codeInstance");
        this.element.addClass("braces");
        this.element.append(curlyOpen);
        this.element.append("<br />");
        var inner = this.innerElem = $("<span class=\"inner\"><span class=\"highlight\"></span></span>");
        inner.addClass("block");
        this.element.append(inner);

        this.gotoLinks = [];
        //var statementElems = [];
        for(var i = 0; i < this.code.statements.length; ++i){
            var lineElem = $('<span class="blockLine"></span>');
            var elem = $("<span></span>");
            var child = createCodeOutlet(elem, this.code.statements[i], this.simOutlet);
            this.addChild(child);

            var gotoLink = $('<span class="gotoLink link">>></span>');
            lineElem.append(gotoLink);
            this.gotoLinks.push(gotoLink);
            //gotoLink.css("visibility", "hidden");
            var self = this;

            // wow this is really ugly lol. stupid closures
            gotoLink.click(
                function (x) {
                    return function () {
                        if (!self.inst){
                            return;
                        }

                        var me = $(this);
                        //if (self.gotoInProgress){
                        //    return;
                        //}
                        //self.gotoInProgress = true;
                        var temp = me.html();
                        if (me.html() == "&lt;&lt;"){
                            self.simOutlet.simOutlet.stepBackward(self.simOutlet.sim.stepsTaken() - self.inst.childInstances.statements[x].stepsTaken);
                            return;
                        }


                        me.addClass("inProgress");

                        self.inst.pauses[x] = {pauseAtIndex: x, callback: function(){
                            //self.gotoInProgress = false;
                            me.removeClass("inProgress");
                        }};
                        //if (self.inst.pauses[x]){
                            self.simOutlet.send("skipToEnd");
                        //}
                    };
                }(i));

            lineElem.append(elem);
            inner.append(lineElem);
            inner.append("<br />");
        }
        this.element.append("<br />");
        this.element.append(curlyClose);

//        this.element.append("}");


    },

    instanceSet : function(){
        Outlets.CPP.Block._parent.instanceSet.apply(this, arguments);
        for(var i = 0; i < this.inst.index; ++i){
            this.gotoLinks[i].html("<<").css("visibility", "visible");
        }
        for(var i = this.inst.index; i < this.gotoLinks.length; ++i){
            this.gotoLinks[i].html(">>").css("visibility", "visible");
        }
    },
    instanceRemoved : function(){
        Outlets.CPP.Block._parent.instanceRemoved.apply(this, arguments);
        for(var i = 0; i < this.gotoLinks.length; ++i){
            this.gotoLinks[i].html(">>").css("visibility", "hidden");
        }
    },
    _act: mixin({}, Outlets.CPP.Code._act, {

        index: function(msg){
            this.gotoLinks[msg.data].html("<<");
            //this.gotoLinks[msg.data].css("visibility", "hidden");
        }

    }, true)
});

Lobster.Outlets.CPP.Statement = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.Statement",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("statement");
    },

    // Statements get reset after being popped
    setInstance : function(inst){
        if (!inst.hasBeenPopped){
            Outlets.CPP.Statement._parent.setInstance.apply(this, arguments);
        }
    }
});

Lobster.Outlets.CPP.DeclarationStatement = Outlets.CPP.Statement.extend({
    _name: "Outlets.CPP.DeclarationStatement",

    createElement: function(){
        var elem = $("<span></span>")
        this.addChild(createCodeOutlet(elem, this.code.declaration, this.simOutlet));
        this.element.append(elem);
        this.element.append(";");

    }
});

Lobster.Outlets.CPP.ExpressionStatement = Outlets.CPP.Statement.extend({
    _name: "Outlets.CPP.ExpressionStatement",

    createElement: function(){
        var elem = $("<span></span>")
        this.addChild(createCodeOutlet(elem, this.code.expression, this.simOutlet));
        this.element.append(elem);
        this.element.append(";");
    }
});

Lobster.Outlets.CPP.Selection = Outlets.CPP.Statement.extend({
    _name: "Outlets.CPP.Selection",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("selection");
    },

    createElement: function(){
        this.element.append(htmlDecoratedKeyword("if"));
        this.element.append('(');

        var ifElem = $("<span></span>");
        this.addChild(createCodeOutlet(ifElem, this.code.condition, this.simOutlet));
        this.element.append(ifElem);

        this.element.append(") ");

        var thenElem = $("<span></span>");
        this.addChild(createCodeOutlet(thenElem, this.code.then, this.simOutlet));
        this.element.append(thenElem);

        if (this.code.otherwise){
            this.element.append("<br />");
            this.element.append(htmlDecoratedKeyword("else"));
            this.element.append(" ");
            var elseElem = $("<span></span>");
            this.addChild(createCodeOutlet(elseElem, this.code.otherwise, this.simOutlet));
            this.element.append(elseElem);
        }
    }
});

Lobster.Outlets.CPP.While = Outlets.CPP.Statement.extend({
    _name: "Outlets.CPP.While",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-while");
    },

    createElement: function(){
        this.element.append(htmlDecoratedKeyword("while"));
        this.element.append("(");

        var condElem = $("<span></span>")
        this.addChild(this.condition = createCodeOutlet(condElem, this.code.condition, this.simOutlet));
        this.element.append(condElem);

        this.element.append(") ");

        var bodyElem = $("<span></span>")
        this.addChild(this.body = createCodeOutlet(bodyElem, this.code.body, this.simOutlet));
        this.element.append(bodyElem);

    },

    _act: $.extend({}, Outlets.CPP.Statement._act, {
        reset: function(){
            this.condition.removeInstance();
            this.body.removeInstance();
        }
    })
});

Lobster.Outlets.CPP.DoWhile = Outlets.CPP.Statement.extend({
    _name: "Outlets.CPP.DoWhile",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-doWhile");
    },

    createElement: function(){
        this.element.append(htmlDecoratedKeyword("do"));

        var bodyElem = $("<span></span>")
        this.addChild(this.body = createCodeOutlet(bodyElem, this.code.body, this.simOutlet));
        this.element.append(bodyElem);

        this.element.append("\n" + htmlDecoratedKeyword("while") + "(");

        var condElem = $("<span></span>")
        this.addChild(this.condition = createCodeOutlet(condElem, this.code.condition, this.simOutlet));
        this.element.append(condElem);

        this.element.append(") ");


    },

    _act: $.extend({}, Outlets.CPP.Statement._act, {
        reset: function(){
            this.condition.removeInstance();
            this.body.removeInstance();
        }
    })
});



Lobster.Outlets.CPP.For = Outlets.CPP.Statement.extend({
    _name: "Outlets.CPP.For",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-for");
    },

    createElement: function(){
        this.element.append(htmlDecoratedKeyword("for"));
        this.element.append("(");

        var initElem = $("<span></span>")
        this.addChild(this.initial = createCodeOutlet(initElem, this.code.initial, this.simOutlet));
        this.element.append(initElem);

        this.element.append(" ");

        var condElem = $("<span></span>")
        this.addChild(this.condition = createCodeOutlet(condElem, this.code.condition, this.simOutlet));
        this.element.append(condElem);

        this.element.append("; ");

        var postElem = $("<span></span>")
        this.addChild(this.post = createCodeOutlet(postElem, this.code.post, this.simOutlet));
        this.element.append(postElem);

        this.element.append(") ");

        var bodyElem = $("<span></span>")
        this.addChild(this.body = createCodeOutlet(bodyElem, this.code.body, this.simOutlet));
        this.element.append(bodyElem);

    },

    _act: $.extend({}, Outlets.CPP.Statement._act, {
        reset: function(){
            this.condition.removeInstance();
            this.body.removeInstance();
            this.post.removeInstance();
        }
    })
});

Lobster.Outlets.CPP.Return = Outlets.CPP.Statement.extend({
    _name: "Outlets.CPP.Return",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("return");
        this.argOutlets = [];
        this.element.append('<span class="code-keyword">return</span>');

        var exprElem = this.exprElem = $("<span></span>");
        if (this.code.returnInitializer) {
            this.element.append(" ");
            this.argOutlets.push(this.expr = this.addChild(createCodeOutlet(exprElem, this.code.returnInitializer, this.simOutlet)));
        }
        this.element.append(exprElem);

        this.element.append(";");
    },

    _act : mixin({}, Outlets.CPP.Code._act, {
        returned: function(msg){
            var data = msg.data;

            // If it's main just return
            if (this.code.containingFunction().isMain){
                return;
            }

            if (this.expr) {
                this.inst.funcContext.parent.send("returned", this.argOutlets[0]);
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

        this.element.append(htmlDecoratedKeyword("break"));
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
        this.element.append(htmlDecoratedType(this.code.typeSpec.type));
        this.element.append(" ");

        var declaratorElems = this.declaratorElems = [];
        for(var i = 0; i < this.code.declarators.length; ++i){

            // Create element for declarator
            var decl = this.code.declarators[i];
            var declElem = $('<span class="codeInstance code-declarator"><span class="highlight"></span></span>');
            declaratorElems.push(declElem);
            declElem.append(decl.type.declaratorString(htmlDecoratedName(decl.name, decl.type)));
            this.element.append(declElem);

            // Create element for initializer, if there is one
            if(this.code.initializers[i]){
                var initElem = $("<span></span>");
                this.addChild(createCodeOutlet(initElem, this.code.initializers[i], this.simOutlet));
                this.element.append(initElem);
            }

            // Add commas where needed
            if (i < this.code.declarators.length - 1){
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

        //if (this.code.funcCall){
        //    var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.funcCall, this.simOutlet, this, [this.argOutlet]);
        //    this.addChild(callOutlet);
        //}
        this.element.append(this.initValueElem = $("<div> </div>"));

        if(this.inst){
            // If it's associated with an instance of an initializer
            var obj = this.code.entity.lookup(this.simOutlet.simOutlet.sim, this.inst);
            this.element.append(obj.type.typeString(false, htmlDecoratedName(obj.name, obj.type), true));
        }
        else{
            // If it's associated with a non-instance parameter
            this.element.append(this.code.entity.type.typeString(false, htmlDecoratedName(this.code.entity.name, this.code.entity.type), true));
        }

        //this.element.append("<br />");

    },

    createElement: function(){

//          this.element.append(this.code.argument.evalValue.valueString());

    },
    instanceRemoved : function(){
        var x = 3;
    },

    _act: copyMixin(Outlets.CPP.Code._act, {
        initialized: function(msg){
            var obj = msg.data;
            var val;
            if (isA(obj, ReferenceEntity)){
                val = "@"+obj.refersTo.nameString(); // TODO make a different animation for reference binding
            }
            else{
                val = obj.valueString();
            }
            val = htmlDecoratedValue(val);
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
        this.addChild(createCodeOutlet(exprElem, this.code.initExpr, this.simOutlet));
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

        for (var i = 0; i < this.code.initializerListLength; ++i) {
            var argElem = $("<span></span>");
            this.addChild(createCodeOutlet(argElem, this.code.sub["arg"+i], this.simOutlet));
            this.element.append(argElem);
            if (i < this.code.initializerListLength - 1) {
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
        if (this.code.funcCall){
            this.addChild(Outlets.CPP.FunctionCall.instance(this.code.funcCall, this.simOutlet, this, this.argOutlets));
        }
        if (this.code.arrayElemInitializers){
            this.code.arrayElemInitializers.forEach(function(elemInit){
                self.addChild(Outlets.CPP.DefaultInitializer.instance(element, elemInit, simOutlet));
            });
        }

        if (this.code.temporariesToDestruct){
            this.code.temporariesToDestruct.forEach(function(tempDest){
                self.addChild(Outlets.CPP.FunctionCall.instance(tempDest, self.simOutlet, self, []));
            });
        }

        if (this.code.isMemberInitializer) {
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

        var length = this.code.numArgs;
        if (length > 0 || this.code.isMemberInitializer) {
            this.element.append("(");
        }

        var self = this;

        if (this.code.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.funcCall, this.simOutlet, this, this.argOutlets);
            this.addChild(callOutlet);

            this.argOutlets = callOutlet.argOutlets;
            this.argOutlets.forEach(function(argOutlet,i,arr){
                self.addChild(argOutlet);
                self.element.append(argOutlet.element);
                if (i < arr.length - 1) {
                    self.element.append(", ");
                }
            });
        }
        else{
            this.argOutlets = this.code.args.map(function(arg,i,arr){
                var argElem = $("<span></span>");
                var argOutlet = self.addChild(createCodeOutlet(argElem, arg, self.simOutlet));
                self.element.append(argElem);
                if (i < arr.length - 1) {
                    self.element.append(", ");
                }
                return argOutlet;
            });
        }


        if (length > 0 || this.code.isMemberInitializer){
            this.element.append(")");
        }


        if (this.code.temporariesToDestruct){
            this.code.temporariesToDestruct.forEach(function(tempDest){
                self.addChild(Outlets.CPP.FunctionCall.instance(tempDest, self.simOutlet, self, []));
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

        if (isA(this.code.parent, Declaration)){
            this.element.append(" = ");
        }
        var self = this;
        if (this.code.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.funcCall, this.simOutlet, this, this.argOutlets);
            this.addChild(callOutlet);

            this.argOutlets = callOutlet.argOutlets;
            this.argOutlets.forEach(function(argOutlet,i,arr){
                self.addChild(argOutlet);
                self.element.append(argOutlet.element);
                if (i < arr.length - 1) {
                    self.element.append(", ");
                }
            });
        }
        else{
            this.argOutlets = this.code.args.map(function(arg,i,arr){
                var argElem = $("<span></span>");
                var argOutlet = self.addChild(createCodeOutlet(argElem, arg, self.simOutlet));
                self.element.append(argElem);
                if (i < arr.length - 1) {
                    self.element.append(", ");
                }
                return argOutlet;
            });
        }


        if (this.code.temporariesToDestruct){
            this.code.temporariesToDestruct.forEach(function(tempDest){
                self.addChild(Outlets.CPP.FunctionCall.instance(tempDest, self.simOutlet, self, []));
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
        if (this.code.isFullExpression()) {this.element.addClass("fullExpression");}

        this.evalValueElem = $("<span class='hidden'></span>"); // TODO fix this ugly hack
        this.wrapper = $("<span class='wrapper'></span>");
        this.exprElem = $("<span class='expr'></span>"); // TODO fix this ugly hack
        this.wrapper.append(this.exprElem);
        this.wrapper.append(this.evalValueElem);

        this.element.append(this.wrapper);

        this.element.append("<span class='exprType'>" + (this.code.type ? this.code.type.toString() : "") + "</span>");

        if (this.code.temporariesToDestruct){
            var self = this;
            this.code.temporariesToDestruct.forEach(function(tempDest){
                self.addChild(Outlets.CPP.FunctionCall.instance(tempDest, self.simOutlet, self, []));
            });
        }

        //if (this.code.isFullExpression()){
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

    setEvalValue : function(value, suppressAnimation){
        this.showingEvalValue = true;
        // If it's void, don't do anything
        if (value === undefined || isA(value.type, Types.Void)){
            return;
        }

        if (value.isA(ObjectEntity) || value.isA(FunctionEntity)){
            this.evalValueElem.html(value.nameString());
            this.evalValueElem.addClass("lvalue");
        }
        else{  // value.isA(Value)
            if (isA(value.type, Types.Tree_t)){
                this.evalValueElem.html(breadthFirstTree(value.rawValue()));
            }
            else{
                this.evalValueElem.html(value.valueString());
            }
            this.evalValueElem.addClass("rvalue");
            if (!value.isValueValid()){
                this.evalValueElem.addClass("invalid");
            }
        }

        if(Outlets.CPP.CPP_ANIMATIONS && !suppressAnimation) {
            this.wrapper.animate({
                width: this.evalValueElem.css("width")
            }, 500, function () {
                $(this).css("width", "auto");
            });
//                this.evalValueElem.animate({
//                    width: this.evalValueElem.css("width")
//                }, 500, function () {
//                    $(this).css("width", "auto");
//                });
        }

        //if (suppressAnimation){
        //    this.evalValueElem.addClass("noTransitions").height();
        //    this.exprElem.addClass("noTransitions").height();
        //}

        this.evalValueElem.removeClass("hidden");//.fadeTo(EVAL_FADE_DURATION, 1);
        this.exprElem.addClass("hidden");//.fadeTo(EVAL_FADE_DURATION, 0);

        //if (suppressAnimation){
        //    this.evalValueElem.removeClass("noTransitions").height();
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
////                this.evalValueElem.animate({
////                    width: this.evalValueElem.css("width")
////                }, 500, function () {
////                    $(this).css("width", "auto");
////                });
//        }
        var self = this;
        //setTimeout(function() {
            self.exprElem.removeClass("hidden");//.fadeTo(RESET_FADE_DURATION, 1);
            self.evalValueElem.addClass("hidden");//.fadeTo(RESET_FADE_DURATION, 0);

            self.element.removeClass("rvalue");
            self.element.removeClass("lvalue");
            self.wrapper.css("width", "auto");
        //}, 2000);
    },

    instanceSet : function(){
        Outlets.CPP.Expression._parent.instanceSet.apply(this, arguments);
        if (this.inst.evalValue){
            this.setEvalValue(this.inst.evalValue, true);
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
            this.setEvalValue(value);


//            console.log("expression evaluated to " + value.value);
        },
        returned: function(msg){
            var value = msg.data;
            this.setEvalValue(value);

//            if(Outlets.CPP.CPP_ANIMATIONS) {
//                this.wrapper.animate({
//                    width: this.evalValueElem.css("width")
//                }, 500, function () {
//                    $(this).css("width", "auto");
//                });
//            }

            //this.evalValueElem.removeClass("hidden");//.fadeTo(EVAL_FADE_DURATION, 1);
            //this.exprElem.addClass("hidden");//.fadeTo(EVAL_FADE_DURATION, 0);

//            console.log("expression evaluated to " + value.value);
        }
    })




});

Lobster.Outlets.CPP.Assignment = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Assignment",
    htmlOperator : htmlDecoratedOperator("=", "code-assignmentOp"),

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("assignment");


        var self = this;
        var lhsElem = $("<span></span>");
        this.addChild(createCodeOutlet(lhsElem, this.code.lhs, this.simOutlet));
        this.exprElem.append(lhsElem);

        this.exprElem.append(" " + this.htmlOperator + " ");

        if (this.code.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.funcCall, this.simOutlet, this);
            this.addChild(callOutlet);

            this.argOutlets = callOutlet.argOutlets;
            this.argOutlets.forEach(function(argOutlet,i,arr){
                self.addChild(argOutlet);
                self.exprElem.append(argOutlet.element);
                if (i < arr.length - 1) {
                    self.exprElem.append(", ");
                }
            });
        }
        else{
            var rhsElem = $("<span></span>");
            this.argOutlets = [];
            this.argOutlets.push(this.addChild(createCodeOutlet(rhsElem, this.code.rhs, this.simOutlet)));
            this.exprElem.append(rhsElem);
        }
    },

    _act: mixin({}, Outlets.CPP.Expression._act, {

        returned: function(msg){
            var value = msg.data;
            this.setEvalValue(value);

//            if(Outlets.CPP.CPP_ANIMATIONS) {
//                this.wrapper.animate({
//                    width: this.evalValueElem.css("width")
//                }, 500, function () {
//                    $(this).css("width", "auto");
//                });
//            }

            this.evalValueElem.removeClass("hidden");//.fadeTo(EVAL_FADE_DURATION, 1);
            this.exprElem.addClass("hidden");//.fadeTo(EVAL_FADE_DURATION, 0);

//            console.log("expression evaluated to " + value.value);
        }

    }, true)
});

Lobster.Outlets.CPP.Ternary = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Ternary",
    htmlOperator1 : htmlDecoratedOperator("?", "code-ternaryOp"),
    htmlOperator2 : htmlDecoratedOperator(":", "code-ternaryOp"),

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-ternary");

        var elem = $("<span></span>");
        this.addChild(createCodeOutlet(elem, this.code.condition, this.simOutlet));
        this.exprElem.append(elem);

        this.exprElem.append(" " + this.htmlOperator1 + " ");

        elem = $("<span></span>");
        this.addChild(createCodeOutlet(elem, this.code.then, this.simOutlet));
        this.exprElem.append(elem);

        this.exprElem.append(" " + this.htmlOperator2 + " ");

        elem = $("<span></span>");
        this.addChild(createCodeOutlet(elem, this.code.otherwise, this.simOutlet));
        this.exprElem.append(elem);
    }
});

Lobster.Outlets.CPP.Comma = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Comma",
    htmlOperator: htmlDecoratedOperator(",", "code-binaryOp"),

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-comma");

        var elem = $("<span></span>");
        this.addChild(createCodeOutlet(elem, this.code.left, this.simOutlet));
        this.exprElem.append(elem);

        this.exprElem.append(" " + this.htmlOperator + " ");

        elem = $("<span></span>");
        this.addChild(createCodeOutlet(elem, this.code.right, this.simOutlet));
        this.exprElem.append(elem);
    }
});

Lobster.Outlets.CPP.CompoundAssignment = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.CompoundAssignment",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("compoundAssignment");

        //var lhsElem = $("<span></span>");
        //this.addChild(createCodeOutlet(lhsElem, this.code.rhs.left, this.simOutlet));
        //this.exprElem.append(lhsElem);
        //
        //this.exprElem.append(" " + htmlDecoratedOperator(this.code.operator, "code-compoundAssignmentOp") + " ");

        var rhsElem = $("<span></span>");
        var rhsOutlet = createCodeOutlet(rhsElem, this.code.rhs, this.simOutlet);
        this.addChild(rhsOutlet);
        this.exprElem.append(rhsElem);
        rhsElem.find(".code-binaryOp").first().replaceWith(htmlDecoratedOperator(this.code.operator, "code-compoundAssignmentOp"));
    }
});

Lobster.Outlets.CPP.FunctionCall = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.FunctionCall",

    init: function (code, simOutlet, returnOutlet) {
        var self = this;
        this.initParent(null, code, simOutlet);

        this.returnOutlet = returnOutlet;


        this.argOutlets = this.code.argInitializers.map(function(argInit){
            return createCodeOutlet($("<span></span>"), argInit, self.simOutlet);
        });
    },

    instanceSet : Class.ADDITIONALLY(function(){
        if (this.inst.hasBeenCalled && !this.inst.func.hasBeenPopped){
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
            var data = sourceOutlet.inst && sourceOutlet.inst.childInstances && sourceOutlet.inst.childInstances.args && sourceOutlet.inst.childInstances.args[0] && sourceOutlet.inst.childInstances.args[0].evalValue;
            if (!data){
                return;
            }
            this.simOutlet.valueTransferOverlay(sourceOutlet, this.returnOutlet, htmlDecoratedValue(data.instanceString()), 500,
                function () {
                    if(self.returnOutlet) { // may have evaporated if we're moving too fast
                        self.returnOutlet.setEvalValue(data);
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

        if (this.code.funcCall.func.isVirtual()){
            this.element.addClass("virtual");
        }


        if (this.code.recursiveStatus === "recursive" && this.code.isTail) {
            this.element.addClass("tail");
        }

        var operandElem = $("<span></span>");
        this.addChild(createCodeOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem);

//        if (this.code.operand.)
//        this.exprElem.append(this.code.operand.entity.name + "(");
        this.exprElem.append("(");

        var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.funcCall, this.simOutlet, this, this.argOutlets);
        this.addChild(callOutlet);

        this.argOutlets = callOutlet.argOutlets;
        this.argOutlets.forEach(function(argOutlet,i,arr){
            self.addChild(argOutlet);
            self.exprElem.append(argOutlet.element);
            if (i < arr.length - 1) {
                self.exprElem.append(", ");
            }
        });


        this.exprElem.append(")");
        if (this.code.funcCall.func.isVirtual()){
            this.exprElem.append("<sub>v</sub>");
        }
    },

    _act: mixin({}, Outlets.CPP.Expression._act, {

//        calleeOutlet : function(callee, source){
//            this.addChild(callee);
//        },

        returned: function(msg){
            var value = msg.data;
            this.setEvalValue(value);

            this.evalValueElem.removeClass("hidden");
            this.exprElem.addClass("hidden");
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

        if (this.code.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.funcCall, this.simOutlet, this);
            this.addChild(callOutlet);

            this.argOutlets = callOutlet.argOutlets;

            // If it's a member function call there will only be one argument and we need to add the left
            if (this.code.isMemberOverload){
                var elem = $("<span></span>");
                this.addChild(createCodeOutlet(elem, this.code.left, this.simOutlet));
                this.exprElem.append(elem);
                this.exprElem.append(" " + htmlDecoratedOperator(this.code.operator, "code-binaryOp") + " ");
            }

            var self = this;
            this.argOutlets.forEach(function(argOutlet,i,arr){
                self.addChild(argOutlet);
                self.exprElem.append(argOutlet.element);
                if (i < arr.length - 1) {
                    self.exprElem.append(" " + self.code.operator + " ");
                }
            });
        }
        else{
            var elem = $("<span></span>");
            this.addChild(createCodeOutlet(elem, this.code.left, this.simOutlet));
            this.exprElem.append(elem);

            this.exprElem.append(" <span class='codeInstance code-binaryOp'>" + this.code.operator + "<span class='highlight'></span></span> ");

            var elem = $("<span></span>");
            this.addChild(createCodeOutlet(elem, this.code.right, this.simOutlet));
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

        this.exprElem.append(htmlDecoratedOperator(this.code.operator, "code-unaryOp"));
        this.addSpace && this.exprElem.append(" ");

        if (this.code.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.funcCall, this.simOutlet, this);
            this.addChild(callOutlet);
            this.argOutlets = callOutlet.argOutlets;

            // If it's a member function call there will be no arguments and we need to add the operand
            if (this.code.isMemberOverload) {
                var elem = $("<span></span>");
                this.addChild(createCodeOutlet(elem, this.code.operand, this.simOutlet));
                this.exprElem.append(elem)
            }
            else{
                this.addChild(this.argOutlets[0]);
                this.exprElem.append(this.argOutlets[0].element);
            }
        }
        else{
            var elem = $("<span></span>");
            this.addChild(createCodeOutlet(elem, this.code.operand, this.simOutlet));
            this.exprElem.append(elem)
        }
    },
    upNext: function(){
        Outlets.CPP.Expression.upNext.apply(this, arguments);
        var temp = this.element.find(".code-unaryOp").first().addClass("upNext");
//        console.log("upNext for " + this.code.code.text);
    }
});

Lobster.Outlets.CPP.NewExpression = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.NewExpression",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-newExpression");
        this.exprElem.append(htmlDecoratedOperator("new", "code-unaryOp"));
        this.exprElem.append(" ");

        if (isA(this.code.heapType, Types.Array) && this.code.dynamicLength){
            this.exprElem.append(this.code.heapType.elemType.typeString(false, '[<span class="dynamicLength"></span>]'));
            this.addChild(createCodeOutlet(this.exprElem.find(".dynamicLength"), this.code.dynamicLength, this.simOutlet));
        }
        else{
            this.exprElem.append(htmlDecoratedType(this.code.heapType));
        }

        if (this.code.initializer) {
            var initElem = $("<span></span>");
            this.addChild(createCodeOutlet(initElem, this.code.initializer, this.simOutlet));
            this.exprElem.append(initElem);
        }


    },
    upNext: function(){
        Outlets.CPP.Expression.upNext.apply(this, arguments);
        var temp = this.element.find(".code-unaryOp").first().addClass("upNext");
//        console.log("upNext for " + this.code.code.text);
    }
});

Lobster.Outlets.CPP.Delete = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Delete",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-delete");
        this.exprElem.append(htmlDecoratedOperator("delete", "code-unaryOp"));
        this.exprElem.append(" ");
        var operandElem = $("<span></span>");
        this.addChild(createCodeOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        if (this.code.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.funcCall, this.simOutlet, this, []);
            this.addChild(callOutlet);
        }
    }
});


Lobster.Outlets.CPP.DeleteArray = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.DeleteArray",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-deleteArray");
        this.exprElem.append(htmlDecoratedOperator("delete[]", "code-unaryOp"));
        this.exprElem.append(" ");
        var operandElem = $("<span></span>");
        this.addChild(createCodeOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem);


    }
});



Lobster.Outlets.CPP.ConstructExpression = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.ConstructExpression",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-constructExpression");
        this.exprElem.append(htmlDecoratedType(this.code.type));

        if (this.code.initializer) {
            var initElem = $("<span></span>");
            this.addChild(createCodeOutlet(initElem, this.code.initializer, this.simOutlet));
            this.exprElem.append(initElem);
        }
    }
});



Lobster.Outlets.CPP.LogicalNot = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.LogicalNot",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-logicalNot");
        this.exprElem.append(htmlDecoratedOperator(this.code.operator, "code-unaryOp"));
        var operandElem = $("<span></span>");
        this.addChild(createCodeOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem)
    }
});

Lobster.Outlets.CPP.Prefix = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Prefix",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-prefix");
        this.exprElem.append(htmlDecoratedOperator(this.code.operator, "code-unaryOp"));
        var operandElem = $("<span></span>");
        this.addChild(createCodeOutlet(operandElem, this.code.operand, this.simOutlet));
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
        this.addChild(createCodeOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        this.exprElem.append(htmlDecoratedOperator("++", "code-postfixOp"));
    }
});
Lobster.Outlets.CPP.Decrement = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Decrement",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        var operandElem = $("<span></span>");
        this.addChild(createCodeOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        this.exprElem.append(htmlDecoratedOperator("--", "code-postfixOp"));
    }
});


Lobster.Outlets.CPP.Subscript = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Subscript",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        var operandElem = $("<span></span>");
        this.addChild(createCodeOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        this.element.addClass("code-subscript");
        this.exprElem.append(htmlDecoratedOperator("[", "code-postfixOp"));


        if (this.code.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.funcCall, this.simOutlet, this);
            this.addChild(callOutlet);

            this.argOutlets = callOutlet.argOutlets;
            this.addChild(this.argOutlets[0]);
            this.exprElem.append(this.argOutlets[0].element);
        }
        else{
            var offsetElem = $("<span></span>");
            this.addChild(createCodeOutlet(offsetElem, this.code.offset, this.simOutlet));
            this.exprElem.append(offsetElem);
        }

        this.exprElem.append(htmlDecoratedOperator("]", "code-postfixOp"));
    }
});

Lobster.Outlets.CPP.Dot = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Dot",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        var operandElem = $("<span></span>");
        this.addChild(createCodeOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        this.element.addClass("code-dot");
        this.exprElem.append(htmlDecoratedOperator(".", "code-postfixOp"));

        this.exprElem.append(htmlDecoratedName(this.code.memberName, this.code.type));
    },

    setEvalValue : function(value) {

    }
});

Lobster.Outlets.CPP.Arrow = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Arrow",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        var operandElem = $("<span></span>");
        this.addChild(createCodeOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        this.element.addClass("code-dot");
        this.exprElem.append(htmlDecoratedOperator("->", "code-postfixOp"));

        this.exprElem.append(htmlDecoratedName(this.code.memberName, this.code.type));
    },

    setEvalValue : function(value) {

    }
});

Lobster.Outlets.CPP.AddressOf = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.AddressOf",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-addressOf");
        this.exprElem.append(htmlDecoratedOperator("&", "code-unaryOp"));
        var operandElem = $("<span></span>");
        this.addChild(createCodeOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem)
    }
});

Lobster.Outlets.CPP.UnaryPlus = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.UnaryPlus",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-unaryPlus");
        this.exprElem.append(htmlDecoratedOperator("+", "code-unaryOp"));
        var operandElem = $("<span></span>");
        this.addChild(createCodeOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem)
    }
});

Lobster.Outlets.CPP.UnaryMinus = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.UnaryMinus",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-unaryMinus");
        this.exprElem.append(htmlDecoratedOperator("-", "code-unaryOp"));
        var operandElem = $("<span></span>");
        this.addChild(createCodeOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem)
    }
});

Lobster.Outlets.CPP.Parentheses = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Parentheses",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.exprElem.append("(");
        var elem = $("<span></span>");
        this.addChild(createCodeOutlet(elem, this.code.subexpression, this.simOutlet));
        this.exprElem.append(elem);
        this.exprElem.append(")");
    }
});

Lobster.Outlets.CPP.Identifier = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Identifier",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.exprElem.addClass("code-name");

        if (Array.isArray(this.code.identifier)){ // Qualified name
            this.exprElem.append(this.code.identifier.map(function(id){return id.identifier}).join("::"));
        }
        else{
            this.exprElem.append(this.code.identifier);
        }
    },

    setEvalValue : function(value) {

    }
});

Lobster.Outlets.CPP.Literal = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Literal",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.exprElem.addClass("code-literal");
        this.exprElem.append(this.code.value.valueString());
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
        this.addChild(createCodeOutlet(fromElem, this.code.from, this.simOutlet));
        this.exprElem.append(fromElem)
    }
});

Lobster.Outlets.CPP.LValueToRValue = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.LValueToRValue",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-lValueToRValue");
        var fromElem = $("<span></span>");
        this.addChild(createCodeOutlet(fromElem, this.code.from, this.simOutlet));
        this.exprElem.append(fromElem)
    }
});

Lobster.Outlets.CPP.QualificationConversion = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.QualificationConversion",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-qualificationConversion");
        var fromElem = $("<span></span>");
        this.addChild(createCodeOutlet(fromElem, this.code.from, this.simOutlet));
        this.exprElem.append(fromElem)
    }
});

Lobster.Outlets.CPP.ArrayToPointer = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.ArrayToPointer",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-arrayToPointer");
        var fromElem = $("<span></span>");
        this.addChild(createCodeOutlet(fromElem, this.code.from, this.simOutlet));
        this.exprElem.append(fromElem)
    }
});

var createCodeOutlet = function(element, code, simOutlet){
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
DEFAULT_CODE_OUTLETS[Statements.Compound] = Outlets.CPP.Block;
DEFAULT_CODE_OUTLETS[Statements.Declaration] = Outlets.CPP.DeclarationStatement;
DEFAULT_CODE_OUTLETS[Statements.Expression] = Outlets.CPP.ExpressionStatement;
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
