"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputOperatorExpressionOutlet = exports.OutputOperatorExpressionOutlet = exports.BinaryOperatorExpressionOutlet = exports.MemberOperatorOverloadExpressionOutlet = exports.NonMemberOperatorOverloadExpressionOutlet = exports.MagicFunctionCallExpressionOutlet = exports.ArgumentInitializerOutlet = exports.FunctionCallOutlet = exports.FunctionCallExpressionOutlet = exports.CommaExpressionOutlet = exports.TernaryExpressionOutlet = exports.CompoundAssignmentExpressionOutlet = exports.AssignmentExpressionOutlet = exports.ExpressionOutlet = exports.ArrayMemberInitializerOutlet = exports.ArrayAggregateInitializerOutlet = exports.ClassCopyInitializerOutlet = exports.ReferenceCopyInitializerOutlet = exports.AtomicCopyInitializerOutlet = exports.CopyInitializerOutlet = exports.ClassDirectInitializerOutlet = exports.ArrayDirectInitializerOutlet = exports.ReferenceDirectInitializerOutlet = exports.AtomicDirectInitializerOutlet = exports.ClassValueInitializerOutlet = exports.ArrayValueInitializerOutlet = exports.AtomicValueInitializerOutlet = exports.ClassDefaultInitializerOutlet = exports.ArrayDefaultInitializerOutlet = exports.AtomicDefaultInitializerOutlet = exports.InitializerOutlet = exports.ReturnInitializerOutlet = exports.ReturnStatementOutlet = exports.BreakStatementOutlet = exports.ForStatementOutlet = exports.WhileStatementOutlet = exports.IfStatementOutlet = exports.NullStatementOutlet = exports.ExpressionStatementOutlet = exports.DeclarationStatementOutlet = exports.StatementOutlet = exports.BlockOutlet = exports.CtorInitializerOutlet = exports.ParameterOutlet = exports.FunctionOutlet = exports.PotentialFullExpressionOutlet = exports.ConstructOutlet = exports.cstringToString = exports.getValueString = exports.CODE_ANIMATIONS = void 0;
exports.addChildStatementOutlet = exports.addChildInitializerOutlet = exports.addChildExpressionOutlet = exports.createStatementOutlet = exports.createInitializerOutlet = exports.createExpressionOutlet = exports.QualificationConversionOutlet = exports.StreamToBoolOutlet = exports.ArrayToPointerOutlet = exports.LValueToRValueOutlet = exports.TypeConversionOutlet = exports.ThisExpressionOutlet = exports.OpaqueExpressionOutlet = exports.StringLiteralExpressionOutlet = exports.NumericLiteralOutlet = exports.IdentifierOutlet = exports.InitializerListOutlet = exports.ParenthesesOutlet = exports.ArrowExpressionOutlet = exports.DotExpressionOutlet = exports.SubscriptExpressionOutlet = exports.PostfixIncrementExpressionOutlet = exports.DeleteArrayExpressionOutlet = exports.DeleteExpressionOutlet = exports.NewArrayExpressionOutlet = exports.NewExpressionOutlet = exports.UnaryOperatorExpressionOutlet = void 0;
const util_1 = require("../util/util");
const observe_1 = require("../util/observe");
const declarations_1 = require("../core/declarations");
const statements_1 = require("../core/statements");
const objects_1 = require("../core/objects");
const entities_1 = require("../core/entities");
const runtimeEnvironment_1 = require("../core/runtimeEnvironment");
const types_1 = require("../core/types");
const he_1 = require("he");
const lexical_1 = require("../core/lexical");
const EVAL_FADE_DURATION = 500;
const RESET_FADE_DURATION = 500;
exports.CODE_ANIMATIONS = true;
const CSTRING_PRINT_LIMIT = 10;
function getValueString(value) {
    if (value.isTyped(types_1.isType(types_1.Bool))) {
        return value.rawValue === 1 ? "true" : "false";
    }
    // if (value.isTyped(isArrayPointerToType(Char))) {
    //     let offset = value.type.toIndex(value.rawValue);
    //     let chars = value.type.arrayObject.getValue().slice(offset);
    //     if (chars.length === 0) {
    //         // pointer was outside of cstring, bail out
    //         return '"???..."';
    //     }
    //     let cstr = "";
    //     for(let i = 0; !Char.isNullChar(chars[i]); ++i) {
    //         cstr += unescapeString(String.fromCharCode(chars[i].rawValue));
    //         if (i === chars.length - 1) {
    //             cstr += "???...";
    //             break;
    //         }
    //         else if (i >= 10) {
    //             cstr += "...";
    //             break;
    //         }
    //     }
    //     return `"${cstr}"`;
    // }
    // else {
    return value.valueString();
    // }
}
exports.getValueString = getValueString;
function cstringToString(value) {
    let offset = value.type.toIndex(value.rawValue);
    let chars = value.type.arrayObject.getValue().slice(offset);
    if (chars.length === 0) {
        // pointer was outside of cstring, bail out
        return '"???..."';
    }
    let cstr = "";
    for (let i = 0; !types_1.Char.isNullChar(chars[i]); ++i) {
        cstr += util_1.unescapeString(String.fromCharCode(chars[i].rawValue));
        if (i === chars.length - 1) {
            cstr += "???...";
            break;
        }
        else if (i >= 10) {
            cstr += "...";
            break;
        }
    }
    return `"${cstr}"`;
}
exports.cstringToString = cstringToString;
function getObjectString(obj) {
    let name = obj.describe().name;
    if (name.startsWith("[")) {
        if (obj.isTyped(types_1.isAtomicType)) {
            return util_1.htmlDecoratedObject(getValueString(obj.getValue()));
        }
        else if (obj.isTyped(types_1.isCompleteClassType) && obj.type.className === "string") { // TODO make this robust to check for the actual string, not just something named string.
            return util_1.htmlDecoratedObject(getValueString(obj.getMemberObject("data_ptr").getValue()));
        }
        else {
            return util_1.htmlDecoratedObject("");
        }
    }
    return name;
}
class ConstructOutlet {
    constructor(element, construct, parent) {
        this.observable = new observe_1.Observable(this);
        this.outletID = ConstructOutlet._ID++;
        /**
         * Children are stored by the ID of the CPPConstruct they display.
         */
        this.children = {};
        this.element = element;
        this.construct = construct;
        if (parent) {
            parent.addChildOutlet(this);
        }
        this.element.addClass("codeInstance");
        this.element.append("<span class=\"lobster-highlight\"></span>");
    }
    setRuntimeInstance(inst) {
        if (this.inst) {
            this.removeInstance();
        }
        this.inst = inst;
        if (this.inst) {
            observe_1.listenTo(this, inst);
        }
        for (let id in inst.children) {
            this.setChildInstance(inst.children[id]);
        }
        this.instanceSet(inst);
    }
    instanceSet(inst) {
        this.element.toggleClass("upNext", inst.isUpNext);
        this.element.toggleClass("wait", inst.isWaiting);
    }
    removeInstance() {
        // Note: should be a fact that if I have no instance, neither do my children
        if (this.inst) {
            // First remove children instances (deepest children first, due to recursion)
            for (let c in this.children) {
                this.children[c].removeInstance();
            }
            observe_1.stopListeningTo(this, this.inst);
            let oldInst = this.inst;
            delete this.inst;
            this.instanceRemoved(oldInst);
        }
    }
    instanceRemoved(oldInst) {
        this.element.removeClass("upNext");
        this.element.removeClass("wait");
    }
    addChildOutlet(child) {
        this.children[child.construct.constructId] = child;
        child.parent = this;
        this.observable.send("childOutletAdded", { parent: this, child: child });
    }
    setChildInstance(childInst) {
        let childOutlet = this.children[childInst.model.constructId];
        // If we have a child outlet waiting, go for it
        if (childOutlet) {
            childOutlet.setRuntimeInstance(childInst);
            return;
        }
        // TODO: took this out. not currently used. decide if I actually want this
        // Although we didn't find an outlet for this child construct here,
        // we should give its children a chance to get added here
        // for(let id in childInst.children) {
        //     this.setChildInstance(childInst.children[id]);
        // }
        // Otherwise, pass to parent that may have a suitable outlet
        if (this.parent) {
            this.parent.setChildInstance(childInst);
        }
        else {
            console.log("WARNING! Child instance pushed for which no corresponding child outlet was found! (" + childInst.model.constructId + ")");
        }
    }
    upNext() {
        this.element.removeClass("wait");
        this.element.addClass("upNext");
    }
    wait() {
        this.element.removeClass("upNext");
        this.element.addClass("wait");
    }
    popped() {
        this.element.removeClass("upNext");
        this.element.removeClass("wait");
    }
    // Called when child instance is created under any instance this
    // outlet is listening to. Looks for a child outlet of this outlet
    // that is waiting for the code model associated with the instance.
    // Propagates the child instance upward through ancestors until one
    // is found that was waiting for it.
    childInstanceCreated(msg) {
        this.setChildInstance(msg.data);
    }
    current() {
        this.element.addClass("current");
    }
    uncurrent() {
        this.element.removeClass("current");
    }
    identifyCodeOutlet(msg) {
        msg.data(this);
    }
}
ConstructOutlet._ID = 0;
__decorate([
    observe_1.messageResponse("upNext")
], ConstructOutlet.prototype, "upNext", null);
__decorate([
    observe_1.messageResponse("wait")
], ConstructOutlet.prototype, "wait", null);
__decorate([
    observe_1.messageResponse("popped")
], ConstructOutlet.prototype, "popped", null);
__decorate([
    observe_1.messageResponse("childInstanceCreated")
], ConstructOutlet.prototype, "childInstanceCreated", null);
__decorate([
    observe_1.messageResponse("current")
], ConstructOutlet.prototype, "current", null);
__decorate([
    observe_1.messageResponse("uncurrent")
], ConstructOutlet.prototype, "uncurrent", null);
__decorate([
    observe_1.messageResponse("identifyCodeOutlet")
], ConstructOutlet.prototype, "identifyCodeOutlet", null);
exports.ConstructOutlet = ConstructOutlet;
class PotentialFullExpressionOutlet extends ConstructOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        // if (this.construct.temporaryDeallocator) {
        //     this.construct.temporaryDeallocator.dtors.forEach((tempDest) => {
        //         this.addChildOutlet(Outlets.CPP.FunctionCall.instance(tempDest, this, []));
        //     });
        // }
        //if (this.construct.isFullExpression()){
        //    var this = this;
        //    this.exprElem.hover(() => {
        //        //alert("hi");
        //        this.element.addClass("current");
        //    },() => {
        //        //alert("hi");
        //        this.element.removeClass("current");
        //        //this.simOutlet.sim.closeMessage();
        //    }).click(() => {
        //        this.simOutlet.sim.explain(this.inst ? this.inst.explain() : this.code.explain(this.simOutlet.sim));
        //    });
        //}
    }
}
exports.PotentialFullExpressionOutlet = PotentialFullExpressionOutlet;
class FunctionOutlet extends ConstructOutlet {
    constructor(element, rtFunc, listener) {
        super(element, rtFunc.model);
        this.parameterOutlets = [];
        listener && observe_1.listenTo(listener, this);
        this.element.addClass("function");
        // Constructors/destructors have a dummy return type of void in the representation,
        // but we don't want to show that in the visualization.
        if (!this.construct.declaration.isConstructor) {
            var returnTypeElem = $('<span class="code-returnType">' + this.construct.type.returnType.toString() + "</span>");
            this.element.append(returnTypeElem);
            this.element.append(" ");
        }
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
        //         this.element.append(htmlDecoratedName(mem.entity.name, mem.entity.type));
        //         let memElem = $("<span></span>");
        //         createCodeOutlet(memElem, mem, this);
        //         this.element.append(memElem);
        //         if (i != memInits.length - 1){
        //             this.element.append(", ");
        //         }
        //     }
        // }
        if (this.construct.ctorInitializer) {
            this.element.append("<br />");
            this.ctorInitializer = new CtorInitializerOutlet($("<span></span>").appendTo(this.element), this.construct.ctorInitializer, this);
        }
        let bodyElem = $("<span></span>").appendTo(this.element);
        this.body = new BlockOutlet(bodyElem, this.construct.body, this);
        // if (this.construct.autosToDestruct){
        //     this.construct.autosToDestruct.forEach((dest) => {
        //         this.addChildOutlet(Outlets.CPP.FunctionCall.instance(dest, this, []));
        //     });
        // }
        // if (this.construct.membersToDestruct){
        //     this.construct.membersToDestruct.forEach((dest) => {
        //         this.addChildOutlet(Outlets.CPP.FunctionCall.instance(dest, this, []));
        //     });
        // }
        // if (this.construct.basesToDestruct){
        //     this.construct.basesToDestruct.forEach((dest) => {
        //         this.addChildOutlet(Outlets.CPP.FunctionCall.instance(dest, this, []));
        //     });
        // }
        this.setRuntimeInstance(rtFunc);
    }
    instanceSet(inst) {
        super.instanceSet(inst);
        if (inst.hasControl) {
            this.element.addClass("hasControl");
        }
        if (!inst.caller) {
            // special case - if no caller, it must be the main function
            this.paramsElem.html("()");
            return;
        }
        // Set up parameter outlets
        this.paramsElem.empty();
        this.paramsElem.append("(");
        //let paramElems = [];
        let paramDefs = inst.model.parameters;
        this.parameterOutlets = paramDefs.map((paramDef, i) => {
            let elem = $("<span></span>");
            let paramOutlet = new ParameterOutlet(elem, paramDef);
            //this.addChildOutlet(paramOutlet);
            //paramElems.push(elem);
            this.paramsElem.append(elem);
            if (i < paramDefs.length - 1) {
                this.paramsElem.append(", ");
            }
            return paramOutlet;
        });
        this.paramsElem.append(")");
    }
    gainControl() {
        this.element.addClass("hasControl");
    }
    loseControl() {
        this.element.removeClass("hasControl");
    }
    valueWritten(msg) {
        let obj = msg.source;
    }
}
__decorate([
    observe_1.messageResponse("gainControl")
], FunctionOutlet.prototype, "gainControl", null);
__decorate([
    observe_1.messageResponse("loseControl")
], FunctionOutlet.prototype, "loseControl", null);
__decorate([
    observe_1.messageResponse("valueWritten")
], FunctionOutlet.prototype, "valueWritten", null);
exports.FunctionOutlet = FunctionOutlet;
class ParameterOutlet {
    constructor(element, paramDef) {
        this.element = element;
        this.element.addClass("codeInstance");
        this.element.addClass("declaration");
        this.element.addClass("parameter");
        this.element.append(this.passedValueElem = $("<div> </div>"));
        this.element.append(paramDef.type.typeString(false, util_1.htmlDecoratedName(paramDef.name || "", paramDef.type), true));
    }
    setPassedContents(html) {
        this.passedValueElem.html(html);
    }
}
exports.ParameterOutlet = ParameterOutlet;
class CtorInitializerOutlet extends ConstructOutlet {
    constructor(element, construct, parent) {
        var _a, _b, _c;
        super(element, construct, parent);
        this.element.addClass("code-ctor-initializer");
        this.element.append(" : ");
        if (construct.delegatedConstructorInitializer) {
            this.element.append(construct.delegatedConstructorInitializer.target.type.className);
            this.element.append("(");
            this.delegatedConstructorInitializer = (_a = construct.delegatedConstructorInitializer) === null || _a === void 0 ? void 0 : _a.createDefaultOutlet($("<span></span>").appendTo(this.element), this);
            this.element.append(")");
        }
        let first = !this.delegatedConstructorInitializer;
        if (((_b = construct.baseInitializer) === null || _b === void 0 ? void 0 : _b.kind) === "default") {
            if (!first) {
                this.element.append(", ");
            }
            else {
                first = false;
            }
            this.element.append(util_1.htmlDecoratedName(construct.baseInitializer.target.type.className));
            this.element.append("(");
            this.baseInitializer = construct.baseInitializer.createDefaultOutlet($("<span></span>").appendTo(this.element), this);
            this.element.append(")");
        }
        else if (((_c = construct.baseInitializer) === null || _c === void 0 ? void 0 : _c.kind) === "direct") {
            if (!first) {
                this.element.append(", ");
            }
            else {
                first = false;
            }
            this.element.append(util_1.htmlDecoratedName(construct.baseInitializer.target.type.className));
            this.element.append("(");
            this.baseInitializer = construct.baseInitializer.createDefaultOutlet($("<span></span>").appendTo(this.element), this);
            this.element.append(")");
        }
        this.memberInitializers = construct.memberInitializers.map(memInit => {
            if (!first) {
                this.element.append(", ");
            }
            else {
                first = false;
            }
            this.element.append(util_1.htmlDecoratedName((memInit.target).name));
            this.element.append("(");
            let memInitOutlet = memInit.createDefaultOutlet($("<span></span>").appendTo(this.element), this);
            this.element.append(")");
            return memInitOutlet;
        });
        this.element.append(" ");
    }
}
exports.CtorInitializerOutlet = CtorInitializerOutlet;
// export class PassByValueParameterOutlet extends ParameterOutlet {
//     private object: AutoObject;
//     public _act!: MessageResponses;
//     public constructor(element: JQuery, paramDef: CompiledParameterDefinition, object: AutoObject) {
//         super(element, paramDef);
//         this.object = object;
//         listenTo(this, object);
//     }
// }
var curlyOpen = "<span class=\"curly-open\">{</span>";
var curlyClose = "<span class=\"curly-close\">}</span>";
class BlockOutlet extends ConstructOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.removeClass("codeInstance");
        this.element.addClass("braces");
        this.element.append(" "); // spaces before braces :)
        this.element.append(curlyOpen);
        this.element.append("<br />");
        let innerElem = $("<span class=\"inner\"><span class=\"lobster-highlight\"></span></span>");
        innerElem.addClass("code-indentedBlockBody");
        this.element.append(innerElem);
        // this.gotoLinks = [];
        //let statementElems = [];
        this.construct.statements.forEach(stmt => {
            let lineElem = $('<span class="blockLine"></span>');
            let elem = $("<span></span>");
            let child = createStatementOutlet(elem, stmt, this);
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
}
exports.BlockOutlet = BlockOutlet;
// Lobster.Outlets.CPP.OpaqueFunctionBodyBlock = Outlets.CPP.Code.extend({
//     _name: "Outlets.CPP.OpaqueFunctionBodyBlock",
//     createElement: function(){
//         this.element.removeClass("codeInstance");
//         this.element.addClass("braces");
//         this.element.append(curlyOpen);
//         this.element.append("<br />");
//         var inner = this.innerElem = $("<span class=\"inner\"><span class=\"lobster-highlight\"></span></span>");
//         inner.addClass("code-indentedBlockBody");
//         this.element.append(inner);
//         var lineElem = $('<span class="blockLine">// Implementation not shown</span>');
//         inner.append(lineElem);
//         inner.append("<br />");
//         this.element.append("<br />");
//         this.element.append(curlyClose);
//     }
// });
class StatementOutlet extends ConstructOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("statement");
    }
}
exports.StatementOutlet = StatementOutlet;
function allLocalVariableDefinitions(declarations) {
    return declarations.every(decl => decl instanceof declarations_1.LocalVariableDefinition);
}
class DeclarationStatementOutlet extends StatementOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.initializerOutlets = [];
        this.declaratorElems = [];
        this.currentDeclarationIndex = null;
        let declarationElem = $("<span></span>");
        declarationElem.addClass("codeInstance");
        declarationElem.addClass("declaration");
        // TODO: add support for other kinds of declarations that aren't variable definitions
        let declarations = this.construct.declarations;
        if (!allLocalVariableDefinitions(declarations)) {
            return;
        }
        // Non-null assertion below because type specifier's baseType must be defined if
        // the declarator of this variable definition got created.
        declarationElem.append(util_1.htmlDecoratedType(declarations[0].typeSpecifier.baseType.toString()));
        declarationElem.append(" ");
        declarations.forEach((declaration, i) => {
            // Create element for declarator
            let declElem = $('<span class="codeInstance code-declarator"><span class="lobster-highlight"></span></span>');
            this.declaratorElems.push(declElem);
            declElem.append(declaration.type.declaratorString(util_1.htmlDecoratedName(declaration.name, declaration.type)));
            declarationElem.append(declElem);
            // Create element for initializer, if there is one
            if (declaration.initializer) {
                switch (declaration.initializer.kind) {
                    case "direct":
                        declarationElem.append("(");
                        break;
                    case "copy":
                        declarationElem.append(" = ");
                        break;
                    case "list":
                        declarationElem.append(" = { ");
                        break;
                    case "value":
                        declarationElem.append("{");
                        break;
                    case "default": break;
                    default:
                        util_1.assertNever(declaration.initializer.kind);
                        break;
                }
                util_1.asMutable(this.initializerOutlets).push(createInitializerOutlet($("<span></span>").appendTo(declarationElem), declaration.initializer, this));
                switch (declaration.initializer.kind) {
                    case "direct":
                        declarationElem.append(")");
                        break;
                    case "copy": break;
                    case "list":
                        declarationElem.append(" }");
                        break;
                    case "value":
                        declarationElem.append("}");
                        break;
                    case "default": break;
                    default:
                        util_1.assertNever(declaration.initializer.kind);
                        break;
                }
            }
            else {
                util_1.asMutable(this.initializerOutlets).push(undefined);
            }
            // Add commas where needed
            if (i < declarations.length - 1) {
                declarationElem.append(", ");
            }
        });
        this.element.append(declarationElem);
        this.element.append(";");
    }
    instanceSet(inst) {
        super.instanceSet(inst);
        this.setCurrentDeclarationIndex(inst.isActive ? inst.currentDeclarationIndex : null);
    }
    instanceRemoved(oldInst) {
        this.setCurrentDeclarationIndex(null);
        super.instanceRemoved(oldInst);
    }
    setCurrentDeclarationIndex(current) {
        // Remove from previous current
        if (this.currentDeclarationIndex !== null) {
            this.declaratorElems[this.currentDeclarationIndex].removeClass("active");
        }
        // Set new or set to null
        this.currentDeclarationIndex = current;
        if (current !== null) {
            this.declaratorElems[current].addClass("active");
        }
    }
    initializing(msg) {
        this.setCurrentDeclarationIndex(msg.data);
    }
    popped() {
        super.popped();
        this.setCurrentDeclarationIndex(null);
    }
}
__decorate([
    observe_1.messageResponse("initializing")
], DeclarationStatementOutlet.prototype, "initializing", null);
__decorate([
    observe_1.messageResponse("popped")
], DeclarationStatementOutlet.prototype, "popped", null);
exports.DeclarationStatementOutlet = DeclarationStatementOutlet;
class ExpressionStatementOutlet extends StatementOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.expression = addChildExpressionOutlet(this.element, this.construct.expression, this);
        this.element.append(";");
    }
    instanceSet(inst) {
        super.instanceSet(inst);
        if (!inst.isActive) {
            this.expression.hideEvalValueRecursive();
        }
    }
    popped() {
        super.popped();
        this.expression.hideEvalValueRecursive();
    }
}
__decorate([
    observe_1.messageResponse("popped")
], ExpressionStatementOutlet.prototype, "popped", null);
exports.ExpressionStatementOutlet = ExpressionStatementOutlet;
class NullStatementOutlet extends StatementOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.append(";");
    }
}
exports.NullStatementOutlet = NullStatementOutlet;
class IfStatementOutlet extends StatementOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("selection");
        this.element.append(util_1.htmlDecoratedKeyword("if"));
        this.element.append('(');
        this.condition = addChildExpressionOutlet(this.element, construct.condition, this);
        this.element.append(")");
        this.then = addChildStatementOutlet(this.element, this.construct.then, this);
        if (this.construct.otherwise) {
            this.element.append("<br />");
            this.element.append(util_1.htmlDecoratedKeyword("else"));
            this.otherwise = addChildStatementOutlet(this.element, this.construct.otherwise, this);
        }
    }
}
exports.IfStatementOutlet = IfStatementOutlet;
class WhileStatementOutlet extends StatementOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("code-while");
        this.element.append(util_1.htmlDecoratedKeyword("while"));
        this.element.append("(");
        this.condition = addChildExpressionOutlet(this.element, construct.condition, this);
        this.element.append(") ");
        this.body = addChildStatementOutlet(this.element, construct.body, this);
    }
}
exports.WhileStatementOutlet = WhileStatementOutlet;
// Lobster.Outlets.CPP.DoWhile = Outlets.CPP.Statement.extend({
//     _name: "Outlets.CPP.DoWhile",
//     init: function(element, code, simOutlet){
//         this.initParent(element, code, simOutlet);
//         this.element.addClass("code-doWhile");
//     },
//     createElement: function(){
//         this.element.append(htmlDecoratedKeyword("do"));
//         var bodyElem = $("<span></span>")
//         this.addChildOutlet(this.body = createCodeOutlet(bodyElem, this.construct.body, this.simOutlet));
//         this.element.append(bodyElem);
//         this.element.append("\n" + htmlDecoratedKeyword("while") + "(");
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
class ForStatementOutlet extends StatementOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("code-for");
        this.element.append(util_1.htmlDecoratedKeyword("for"));
        this.element.append("(");
        this.initial = addChildStatementOutlet(this.element, construct.initial, this);
        this.element.append(" ");
        this.condition = addChildExpressionOutlet(this.element, construct.condition, this);
        this.element.append("; ");
        this.post = construct.post && addChildExpressionOutlet(this.element, construct.post, this);
        this.element.append(") ");
        this.body = addChildStatementOutlet(this.element, construct.body, this);
    }
}
exports.ForStatementOutlet = ForStatementOutlet;
class BreakStatementOutlet extends StatementOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        element.append('<span class="code-keyword">break</span>');
        element.append(";");
    }
}
exports.BreakStatementOutlet = BreakStatementOutlet;
class ReturnStatementOutlet extends StatementOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        element.addClass("return");
        element.append('<span class="code-keyword">return</span>');
        if (construct.returnInitializer) {
            element.append(" ");
            this.returnInitializer = new ReturnInitializerOutlet($("<span></span>").appendTo(element), construct.returnInitializer, this);
        }
        element.append(";");
    }
}
exports.ReturnStatementOutlet = ReturnStatementOutlet;
class ReturnInitializerOutlet extends ConstructOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.expression = addChildExpressionOutlet(element, construct.args[0], this);
    }
    referenceInitialized(data) {
        var _a;
        let obj = data.args[0].evalResult;
        this.observable.send("returnPassed", {
            func: data.containingRuntimeFunction,
            start: this.element,
            html: util_1.htmlDecoratedName((_a = obj.name) !== null && _a !== void 0 ? _a : `@${obj.address}`),
            result: obj
        });
    }
    atomicObjectInitialized(data) {
        let value = data.args[0].evalResult;
        this.observable.send("returnPassed", {
            func: data.containingRuntimeFunction,
            start: this.element,
            html: util_1.htmlDecoratedValue(getValueString(value)),
            result: value
        });
    }
}
__decorate([
    observe_1.messageResponse("referenceInitialized", "unwrap")
], ReturnInitializerOutlet.prototype, "referenceInitialized", null);
__decorate([
    observe_1.messageResponse("atomicObjectInitialized", "unwrap")
], ReturnInitializerOutlet.prototype, "atomicObjectInitialized", null);
exports.ReturnInitializerOutlet = ReturnInitializerOutlet;
// export class Initializer<RTInitializer_type extends RuntimeInitializer = RuntimeInitializer> extends ConstructOutlet<RTInitializer_type> {
//     public constructor(element: JQuery, construct: RTInitializer_type["model"], parent?: ConstructOutlet) {
//         super(element, construct, parent);
//         this.element.addClass("code-initializer");
//         var exprElem = $("<span></span>");
//         this.element.append(exprElem);
//         this.arg = createCodeOutlet(exprElem, this.construct.initExpr, this.simOutlet);
//     }
//     // _act : copyMixin(Outlets.CPP.Code._act, {
//     //     "idArgOutlet" : Observer._IDENTIFY
//     // })
// }
// Lobster.Outlets.CPP.InitializerList = Outlets.CPP.Code.extend({
//     _name: "Outlets.CPP.InitializerList",
//     init: function (element, code, simOutlet) {
//         this.initParent(element, code, simOutlet);
//         this.element.addClass("code-initializerList");
//         this.element.append("{");
//         for (var i = 0; i < this.construct.initializerListLength; ++i) {
//             var argElem = $("<span></span>");
//             createCodeOutlet(argElem, this.code["arg"+i], this);
//             this.element.append(argElem);
//             if (i < this.construct.initializerListLength - 1) {
//                 this.element.append(", ");
//             }
//         }
//         this.element.append("}");
//     },
//     _act : copyMixin(Outlets.CPP.Code._act, {
//         "idArgOutlet" : Observer._IDENTIFY
//     })
// });
class InitializerOutlet extends PotentialFullExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("code-initializer-" + this.construct.kind);
    }
}
exports.InitializerOutlet = InitializerOutlet;
class AtomicDefaultInitializerOutlet extends InitializerOutlet {
}
exports.AtomicDefaultInitializerOutlet = AtomicDefaultInitializerOutlet;
class ArrayDefaultInitializerOutlet extends InitializerOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        if (this.construct.elementInitializers) {
            this.elementInitializerOutlets = this.construct.elementInitializers.map(elemInit => createInitializerOutlet(element, elemInit, this));
        }
    }
}
exports.ArrayDefaultInitializerOutlet = ArrayDefaultInitializerOutlet;
class ClassDefaultInitializerOutlet extends InitializerOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        // this.element.append(htmlDecoratedType(construct.target.type.className));
        this.ctorCallOutlet = new FunctionCallOutlet($("<span></span>").appendTo(this.element), construct.ctorCall, this);
    }
}
exports.ClassDefaultInitializerOutlet = ClassDefaultInitializerOutlet;
class AtomicValueInitializerOutlet extends InitializerOutlet {
}
exports.AtomicValueInitializerOutlet = AtomicValueInitializerOutlet;
class ArrayValueInitializerOutlet extends InitializerOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        if (this.construct.elementInitializers) {
            this.elementInitializerOutlets = this.construct.elementInitializers.map(elemInit => createInitializerOutlet(element, elemInit, this));
        }
    }
}
exports.ArrayValueInitializerOutlet = ArrayValueInitializerOutlet;
class ClassValueInitializerOutlet extends InitializerOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.ctorCallOutlet = new FunctionCallOutlet($("<span></span>").appendTo(this.element), construct.ctorCall, this);
    }
}
exports.ClassValueInitializerOutlet = ClassValueInitializerOutlet;
class AtomicDirectInitializerOutlet extends InitializerOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.argOutlet = addChildExpressionOutlet(this.element, construct.arg, this);
    }
}
exports.AtomicDirectInitializerOutlet = AtomicDirectInitializerOutlet;
class ReferenceDirectInitializerOutlet extends InitializerOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.argOutlet = addChildExpressionOutlet(this.element, construct.arg, this);
    }
}
exports.ReferenceDirectInitializerOutlet = ReferenceDirectInitializerOutlet;
class ArrayDirectInitializerOutlet extends InitializerOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        if (construct.kind === "direct") {
            this.argOutlet = addChildExpressionOutlet(this.element, construct.arg, this);
        }
        else {
            this.argOutlet = addChildExpressionOutlet(this.element, construct.arg, this);
        }
    }
}
exports.ArrayDirectInitializerOutlet = ArrayDirectInitializerOutlet;
class ClassDirectInitializerOutlet extends InitializerOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.ctorCallOutlet = new FunctionCallOutlet($("<span></span>").appendTo(this.element), construct.ctorCall, this);
    }
}
exports.ClassDirectInitializerOutlet = ClassDirectInitializerOutlet;
class CopyInitializerOutlet extends InitializerOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("code-copyInitializer");
    }
}
exports.CopyInitializerOutlet = CopyInitializerOutlet;
class AtomicCopyInitializerOutlet extends InitializerOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.argOutlet = addChildExpressionOutlet(this.element, construct.arg, this);
    }
}
exports.AtomicCopyInitializerOutlet = AtomicCopyInitializerOutlet;
class ReferenceCopyInitializerOutlet extends InitializerOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.argOutlet = addChildExpressionOutlet(this.element, construct.arg, this);
    }
}
exports.ReferenceCopyInitializerOutlet = ReferenceCopyInitializerOutlet;
class ClassCopyInitializerOutlet extends InitializerOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.ctorCallOutlet = new FunctionCallOutlet($("<span></span>").appendTo(this.element), construct.ctorCall, this);
    }
}
exports.ClassCopyInitializerOutlet = ClassCopyInitializerOutlet;
class ArrayAggregateInitializerOutlet extends InitializerOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.elemInitializerOutlets = construct.elemInitializers.map((elemInit, i) => {
            if (i > 0) {
                this.element.append(", ");
            }
            return createInitializerOutlet($("<span></span>").appendTo(this.element), elemInit, this);
        });
    }
}
exports.ArrayAggregateInitializerOutlet = ArrayAggregateInitializerOutlet;
class ArrayMemberInitializerOutlet extends InitializerOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.append(util_1.htmlDecoratedName("other." + construct.target.name));
    }
}
exports.ArrayMemberInitializerOutlet = ArrayMemberInitializerOutlet;
class ExpressionOutlet extends PotentialFullExpressionOutlet {
    constructor(element, construct, parent, animateEvaluation = true) {
        super(element, construct, parent);
        this.showingEvalResult = false;
        this.animateEvaluation = animateEvaluation;
        this.element.addClass("expression");
        if (this.construct.isFullExpression()) {
            this.element.addClass("fullExpression");
        }
        this.evalResultElem = $("<span class='lobster-hidden-expression' style='opacity:0'></span>"); // TODO fix this ugly hack
        this.wrapperElem = $("<span class='lobster-expression-wrapper'></span>");
        this.exprElem = $("<span class='expr'></span>"); // TODO fix this ugly hack
        this.wrapperElem.append(this.exprElem);
        this.wrapperElem.append(this.evalResultElem);
        this.element.append(this.wrapperElem);
        this.element.append("<span class='exprType'>" + he_1.encode(this.construct.type.toString()) + "</span>");
    }
    setEvalResult(result, suppressAnimation = false) {
        if (result instanceof entities_1.FunctionEntity) {
            this.evalResultElem.html(result.describe().message);
            this.evalResultElem.addClass("lvalue");
        }
        else if (result instanceof objects_1.CPPObject && result.type.isCompleteObjectType()) {
            let r = result;
            this.evalResultElem.html(getObjectString(r));
            this.evalResultElem.addClass("lvalue");
            if (!r.isAlive || r.isTyped(types_1.isAtomicType) && !r.isValueValid()) {
                this.evalResultElem.find(".code-object").addClass("invalid");
            }
        }
        else if (result instanceof runtimeEnvironment_1.Value) { // result.isA(Value)
            this.evalResultElem.html(getValueString(result));
            this.evalResultElem.addClass("rvalue");
            if (!result.isValid) {
                this.evalResultElem.addClass("invalid");
            }
        }
        else {
            util_1.assertFalse("unexpected evalResult type for expression outlet");
        }
        this.showEvalResult(suppressAnimation);
    }
    showEvalResult(suppressAnimation = false) {
        if (this.showingEvalResult) {
            return;
        }
        this.showingEvalResult = true;
        if (!this.animateEvaluation) {
            return;
        }
        if (exports.CODE_ANIMATIONS && !suppressAnimation) {
            this.wrapperElem.animate({
                width: this.evalResultElem.css("width")
            }, 500, function () {
                $(this).css("width", "auto");
            });
        }
        this.evalResultElem.removeClass("lobster-hidden-expression").fadeTo(EVAL_FADE_DURATION, 1);
        this.exprElem.addClass("lobster-hidden-expression").fadeTo(EVAL_FADE_DURATION, 0);
    }
    removeEvalValue() {
        this.showingEvalResult = false;
        if (!this.animateEvaluation) {
            return;
        }
        //        if(CODE_ANIMATIONS) {
        //            this.wrapperElem.animate({
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
        //setTimeout(function() {
        this.exprElem.removeClass("lobster-hidden-expression").fadeTo(RESET_FADE_DURATION, 1).finish();
        this.evalResultElem.addClass("lobster-hidden-expression").fadeTo(RESET_FADE_DURATION, 0).finish();
        this.element.removeClass("rvalue");
        this.element.removeClass("lvalue");
        this.wrapperElem.css("width", "auto");
        //}, 2000);
    }
    hideEvalValueRecursive() {
        this.removeEvalValue();
        for (let cKey in this.children) {
            let c = this.children[cKey];
            if (c instanceof ExpressionOutlet) {
                c.hideEvalValueRecursive();
            }
        }
    }
    instanceSet(inst) {
        super.instanceSet(inst);
        if (inst.evalResult) {
            this.setEvalResult(inst.evalResult, true);
        }
        else {
            this.removeEvalValue();
        }
    }
    instanceRemoved(oldInst) {
        this.removeEvalValue();
        super.instanceRemoved(oldInst);
    }
    evaluated(msg) {
        this.setEvalResult(msg.data);
    }
}
__decorate([
    observe_1.messageResponse("evaluated")
], ExpressionOutlet.prototype, "evaluated", null);
exports.ExpressionOutlet = ExpressionOutlet;
const ASSIGNMENT_OP_HTML = util_1.htmlDecoratedOperator("=", "code-assignmentOp");
class AssignmentExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("assignment");
        this.lhs = addChildExpressionOutlet(this.exprElem, this.construct.lhs, this);
        this.exprElem.append(" " + ASSIGNMENT_OP_HTML + " ");
        this.rhs = addChildExpressionOutlet(this.exprElem, this.construct.rhs, this);
    }
}
exports.AssignmentExpressionOutlet = AssignmentExpressionOutlet;
class CompoundAssignmentExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("compound-assignment");
        this.lhs = addChildExpressionOutlet(this.exprElem, this.construct.lhs, this);
        this.exprElem.append(" " + util_1.htmlDecoratedOperator(this.construct.operator, "code-compoundAssignmentOp") + " ");
        this.rhs = addChildExpressionOutlet(this.exprElem, this.construct.rhs, this);
    }
}
exports.CompoundAssignmentExpressionOutlet = CompoundAssignmentExpressionOutlet;
const TERNARY_OP_HTML1 = util_1.htmlDecoratedOperator("?", "code-ternaryOp");
const TERNARY_OP_HTML2 = util_1.htmlDecoratedOperator(":", "code-ternaryOp");
class TernaryExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("code-ternary");
        this.condition = addChildExpressionOutlet(this.exprElem, this.construct.condition, this);
        this.exprElem.append(" " + TERNARY_OP_HTML1 + " ");
        this.then = addChildExpressionOutlet(this.exprElem, this.construct.then, this);
        this.exprElem.append(" " + TERNARY_OP_HTML2 + " ");
        this.otherwise = addChildExpressionOutlet(this.exprElem, this.construct.otherwise, this);
    }
}
exports.TernaryExpressionOutlet = TernaryExpressionOutlet;
const COMMA_OP_HTML = util_1.htmlDecoratedOperator(",", "code-binaryOp");
class CommaExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("code-comma");
        this.left = addChildExpressionOutlet(this.exprElem, this.construct.left, this);
        this.exprElem.append(" " + COMMA_OP_HTML + " ");
        this.right = addChildExpressionOutlet(this.exprElem, this.construct.right, this);
    }
}
exports.CommaExpressionOutlet = CommaExpressionOutlet;
class FunctionCallExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("functionCall");
        this.returnDestinationElement = this.exprElem;
        // if (this.construct.funcCall.func.isVirtual()){
        //     this.element.addClass("virtual");
        // }
        // if (this.construct.recursiveStatus === "recursive" && this.construct.isTail) {
        //     this.element.addClass("tail");
        // }
        this.operandOutlet = createExpressionOutlet($('<span class="functionCall-operand"></span>').appendTo(this.exprElem), construct.operand, this);
        this.exprElem.append("(");
        this.callOutlet = new FunctionCallOutlet($("<span></span>").appendTo(this.exprElem), construct.call, this, this);
        this.exprElem.append(")");
        // if (this.construct.funcCall.func.isVirtual()){
        //     this.exprElem.append("<sub>v</sub>");
        // }
    }
    setReturnedResult(result, suppressAnimation = false) {
        this.setEvalResult(result);
    }
}
exports.FunctionCallExpressionOutlet = FunctionCallExpressionOutlet;
class FunctionCallOutlet extends ConstructOutlet {
    constructor(element, construct, parent, returnOutlet, argumentSeparator = ", ") {
        super(element, construct, parent);
        this.returnOutlet = returnOutlet;
        this.argInitializerOutlets = construct.argInitializers.map((argInit, i) => {
            if (i > 0) {
                this.element.append(argumentSeparator);
            }
            return new ArgumentInitializerOutlet($("<span></span>").appendTo(this.element), argInit, this);
        });
    }
    instanceSet(inst) {
        // Only need to register if it's active. If it's not active it
        // either hasn't been called yet and will be registered when it is,
        // or it's already returned and been popped off the stack so it
        // doesn't need to be registered.
        if (inst.isActive) {
            this.registerCallOutlet(inst.calledFunction);
        }
    }
    registerCallOutlet(data) {
        this.observable.send("registerCallOutlet", { outlet: this, func: data });
    }
}
__decorate([
    observe_1.messageResponse("called", "unwrap")
], FunctionCallOutlet.prototype, "registerCallOutlet", null);
exports.FunctionCallOutlet = FunctionCallOutlet;
class ArgumentInitializerOutlet extends ConstructOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("code-argumentInitializer");
        this.expressionOutlet = addChildExpressionOutlet(this.element, construct.args[0], this);
    }
    referenceInitialized(data) {
        var _a;
        let obj = data.args[0].evalResult;
        this.observable.send("parameterPassed", {
            num: data.model.target.num,
            start: this.element,
            html: util_1.htmlDecoratedName((_a = obj.name) !== null && _a !== void 0 ? _a : `@${obj.address}`)
        });
    }
    atomicObjectInitialized(data) {
        this.observable.send("parameterPassed", {
            num: data.model.target.num,
            start: this.element,
            html: util_1.htmlDecoratedValue(getValueString(data.args[0].evalResult))
        });
    }
}
__decorate([
    observe_1.messageResponse("referenceInitialized", "unwrap")
], ArgumentInitializerOutlet.prototype, "referenceInitialized", null);
__decorate([
    observe_1.messageResponse("atomicObjectInitialized", "unwrap")
], ArgumentInitializerOutlet.prototype, "atomicObjectInitialized", null);
exports.ArgumentInitializerOutlet = ArgumentInitializerOutlet;
class MagicFunctionCallExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("functionCall");
        this.exprElem.append(util_1.htmlDecoratedName(this.construct.functionName) + "(");
        this.argOutlets = this.construct.args.map((argInit, i) => {
            if (i > 0) {
                this.exprElem.append(", ");
            }
            return addChildExpressionOutlet(this.exprElem, argInit, this);
        });
        this.exprElem.append(")");
        // if (this.construct.funcCall.func.isVirtual()){
        //     this.exprElem.append("<sub>v</sub>");
        // }
    }
}
exports.MagicFunctionCallExpressionOutlet = MagicFunctionCallExpressionOutlet;
class NonMemberOperatorOverloadExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("functionCall");
        this.returnDestinationElement = this.exprElem;
        this.callOutlet = new FunctionCallOutlet($("<span></span>").appendTo(this.exprElem), construct.call, this, this, ` ${this.construct.operator} `);
    }
    setReturnedResult(result, suppressAnimation = false) {
        this.setEvalResult(result);
    }
}
exports.NonMemberOperatorOverloadExpressionOutlet = NonMemberOperatorOverloadExpressionOutlet;
class MemberOperatorOverloadExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("functionCall");
        this.returnDestinationElement = this.exprElem;
        if (this.construct.operator === "[]") {
            this.receiverOutlet = addChildExpressionOutlet(this.exprElem, this.construct.receiverExpression, this);
            this.exprElem.append("<span class='codeInstance code-binaryOp'>[<span class='lobster-highlight'></span></span>");
            this.callOutlet = new FunctionCallOutlet($("<span></span>").appendTo(this.exprElem), construct.call, this, this);
            this.exprElem.append("<span class='codeInstance code-binaryOp'>]<span class='lobster-highlight'></span></span>");
        }
        else {
            this.receiverOutlet = addChildExpressionOutlet(this.exprElem, this.construct.receiverExpression, this);
            this.exprElem.append(" <span class='codeInstance code-binaryOp'>" + this.construct.operator + "<span class='lobster-highlight'></span></span> ");
            this.callOutlet = new FunctionCallOutlet($("<span></span>").appendTo(this.exprElem), construct.call, this, this, ` ${this.construct.operator} `);
        }
    }
    setReturnedResult(result, suppressAnimation = false) {
        this.setEvalResult(result);
    }
}
exports.MemberOperatorOverloadExpressionOutlet = MemberOperatorOverloadExpressionOutlet;
class BinaryOperatorExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        // if (this.construct.funcCall){
        //     var callOutlet = Outlets.CPP.FunctionCall.instance(this.construct.funcCall, this);
        //     this.addChildOutlet(callOutlet);
        //     this.argOutlets = callOutlet.argOutlets;
        //     // If it's a member function call there will only be one argument and we need to add the left
        //     if (this.construct.isMemberOverload){
        //         var elem = $("<span></span>");
        //         createCodeOutlet(elem, this.construct.left, this);
        //         this.exprElem.append(elem);
        //         this.exprElem.append(" " + htmlDecoratedOperator(this.construct.operator, "code-binaryOp") + " ");
        //     }
        //     var self = this;
        //     this.argOutlets.forEach(function(argOutlet,i,arr){
        //         self.addChildOutlet(argOutlet);
        //         self.exprElem.append(argOutlet.element);
        //         if (i < arr.length - 1) {
        //             self.exprElem.append(" " + self.code.operator + " ");
        //         }
        //     });
        // }
        this.left = addChildExpressionOutlet(this.exprElem, this.construct.left, this);
        this.exprElem.append(" <span class='codeInstance code-binaryOp'>" + this.construct.operator + "<span class='lobster-highlight'></span></span> ");
        this.right = addChildExpressionOutlet(this.exprElem, this.construct.right, this);
    }
}
exports.BinaryOperatorExpressionOutlet = BinaryOperatorExpressionOutlet;
class OutputOperatorExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.left = addChildExpressionOutlet(this.exprElem, this.construct.left, this);
        this.exprElem.append(" <span class='codeInstance code-binaryOp'>" + this.construct.operator + "<span class='lobster-highlight'></span></span> ");
        this.right = addChildExpressionOutlet(this.exprElem, this.construct.right, this);
    }
}
exports.OutputOperatorExpressionOutlet = OutputOperatorExpressionOutlet;
class InputOperatorExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.left = addChildExpressionOutlet(this.exprElem, this.construct.left, this);
        this.exprElem.append(" <span class='codeInstance code-binaryOp'>" + this.construct.operator + "<span class='lobster-highlight'></span></span> ");
        this.right = addChildExpressionOutlet(this.exprElem, this.construct.right, this);
    }
}
exports.InputOperatorExpressionOutlet = InputOperatorExpressionOutlet;
class UnaryOperatorExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.exprElem.append(util_1.htmlDecoratedOperator(this.construct.operator, "code-unaryOp"));
        // if (this.construct.funcCall) {
        //     var callOutlet = Outlets.CPP.FunctionCall.instance(this.construct.funcCall, this);
        //     this.addChildOutlet(callOutlet);
        //     this.argOutlets = callOutlet.argOutlets;
        //     // If it's a member function call there will be no arguments and we need to add the operand
        //     if (this.construct.isMemberOverload) {
        //         var elem = $("<span></span>");
        //         createCodeOutlet(elem, this.construct.operand, this);
        //         this.exprElem.append(elem)
        //     }
        //     else{
        //         this.addChildOutlet(this.argOutlets[0]);
        //         this.exprElem.append(this.argOutlets[0].element);
        //     }
        // }
        // else{
        this.operand = addChildExpressionOutlet(this.exprElem, this.construct.operand, this);
        // }
    }
}
exports.UnaryOperatorExpressionOutlet = UnaryOperatorExpressionOutlet;
class NewExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.exprElem.append(util_1.htmlDecoratedOperator("new", "code-unaryOp"));
        this.exprElem.append(" ");
        this.exprElem.append(util_1.htmlDecoratedType(this.construct.createdType.toString()));
        if (this.construct.initializer) {
            switch (this.construct.initializer.kind) {
                case "direct":
                    this.exprElem.append("(");
                    break;
                case "list":
                    this.exprElem.append("{ ");
                    break;
                case "value":
                    this.exprElem.append("(");
                    break;
                case "default": break;
                case "copy": break;
                default: util_1.assertNever(this.construct.initializer.kind);
            }
            this.initializerOutlet = createInitializerOutlet($("<span></span>").appendTo(this.exprElem), this.construct.initializer, this);
            switch (this.construct.initializer.kind) {
                case "direct":
                    this.exprElem.append(")");
                    break;
                case "list":
                    this.exprElem.append(" }");
                    break;
                case "value":
                    this.exprElem.append(")");
                    break;
                case "default": break;
                case "copy": break;
                default: util_1.assertNever(this.construct.initializer.kind);
            }
        }
    }
}
exports.NewExpressionOutlet = NewExpressionOutlet;
class NewArrayExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.exprElem.append(util_1.htmlDecoratedOperator("new", "code-unaryOp"));
        this.exprElem.append(" ");
        if (this.construct.createdType.isBoundedArrayType()) {
            this.exprElem.append(util_1.htmlDecoratedType(this.construct.createdType.toString()));
        }
        else {
            this.exprElem.append(util_1.htmlDecoratedType(this.construct.createdType.elemType.toString()));
            this.exprElem.append("[");
            this.dynamicLengthExpression = addChildExpressionOutlet(this.exprElem, this.construct.dynamicLengthExpression, this);
            this.exprElem.append("]");
        }
        if (this.construct.individualElementInitializers.length > 0) {
            this.exprElem.append("{ ");
            this.individualElementInitializerOutlets = this.construct.individualElementInitializers.map(elemInit => createInitializerOutlet($("<span></span>").appendTo(this.exprElem), elemInit, this));
            this.exprElem.append(" }");
        }
        else {
            this.individualElementInitializerOutlets = [];
        }
    }
}
exports.NewArrayExpressionOutlet = NewArrayExpressionOutlet;
class DeleteExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.exprElem.append(util_1.htmlDecoratedOperator("delete", "code-unaryOp"));
        this.exprElem.append(" ");
        this.operand = addChildExpressionOutlet(this.exprElem, this.construct.operand, this);
    }
}
exports.DeleteExpressionOutlet = DeleteExpressionOutlet;
class DeleteArrayExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.exprElem.append(util_1.htmlDecoratedOperator("delete[]", "code-unaryOp"));
        this.exprElem.append(" ");
        this.operand = addChildExpressionOutlet(this.exprElem, this.construct.operand, this);
    }
}
exports.DeleteArrayExpressionOutlet = DeleteArrayExpressionOutlet;
// Lobster.Outlets.CPP.NewExpression = Outlets.CPP.Expression.extend({
//     _name: "Outlets.CPP.NewExpression",
//     init: function(element, code, simOutlet){
//         this.initParent(element, code, simOutlet);
//         this.element.addClass("code-newExpression");
//         this.exprElem.append(htmlDecoratedOperator("new", "code-unaryOp"));
//         this.exprElem.append(" ");
//         if (isA(this.construct.heapType, Types.Array) && this.construct.dynamicLength){
//             this.exprElem.append(this.construct.heapType.elemType.typeString(false, '[<span class="dynamicLength"></span>]'));
//             createCodeOutlet(this.exprElem.find(".dynamicLength"), this.construct.dynamicLength, this);
//         }
//         else{
//             this.exprElem.append(htmlDecoratedType(this.construct.heapType));
//         }
//         if (this.construct.initializer) {
//             var initElem = $("<span></span>");
//             createCodeOutlet(initElem, this.construct.initializer, this);
//             this.exprElem.append(initElem);
//         }
//     },
//     upNext: function(){
//         Outlets.CPP.Expression.upNext.apply(this, arguments);
//         var temp = this.element.find(".code-unaryOp").first().addClass("upNext");
// //        console.log("upNext for " + this.construct.code.text);
//     }
// });
// Lobster.Outlets.CPP.Delete = Outlets.CPP.Expression.extend({
//     _name: "Outlets.CPP.Delete",
//     init: function(element, code, simOutlet){
//         this.initParent(element, code, simOutlet);
//         this.element.addClass("code-delete");
//         this.exprElem.append(htmlDecoratedOperator("delete", "code-unaryOp"));
//         this.exprElem.append(" ");
//         var operandElem = $("<span></span>");
//         createCodeOutlet(operandElem, this.construct.operand, this);
//         this.exprElem.append(operandElem);
//         if (this.construct.funcCall){
//             var callOutlet = Outlets.CPP.FunctionCall.instance(this.construct.funcCall, this, []);
//             this.addChildOutlet(callOutlet);
//         }
//     }
// });
// Lobster.Outlets.CPP.DeleteArray = Outlets.CPP.Expression.extend({
//     _name: "Outlets.CPP.DeleteArray",
//     init: function(element, code, simOutlet){
//         this.initParent(element, code, simOutlet);
//         this.element.addClass("code-deleteArray");
//         this.exprElem.append(htmlDecoratedOperator("delete[]", "code-unaryOp"));
//         this.exprElem.append(" ");
//         var operandElem = $("<span></span>");
//         createCodeOutlet(operandElem, this.construct.operand, this);
//         this.exprElem.append(operandElem);
//     }
// });
// Lobster.Outlets.CPP.ConstructExpression = Outlets.CPP.Expression.extend({
//     _name: "Outlets.CPP.ConstructExpression",
//     init: function(element, code, simOutlet){
//         this.initParent(element, code, simOutlet);
//         this.element.addClass("code-constructExpression");
//         this.exprElem.append(htmlDecoratedType(this.construct.type));
//         if (this.construct.initializer) {
//             var initElem = $("<span></span>");
//             createCodeOutlet(initElem, this.construct.initializer, this);
//             this.exprElem.append(initElem);
//         }
//     }
// });
class PostfixIncrementExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.operand = addChildExpressionOutlet(this.exprElem, this.construct.operand, this);
        this.exprElem.append(util_1.htmlDecoratedOperator(this.construct.operator, "code-unaryOp"));
    }
}
exports.PostfixIncrementExpressionOutlet = PostfixIncrementExpressionOutlet;
// Lobster.Outlets.CPP.Increment = Outlets.CPP.Expression.extend({
//     _name: "Outlets.CPP.Increment",
//     init: function(element, code, simOutlet){
//         this.initParent(element, code, simOutlet);
//         var operandElem = $("<span></span>");
//         createCodeOutlet(operandElem, this.construct.operand, this);
//         this.exprElem.append(operandElem);
//         this.exprElem.append(htmlDecoratedOperator("++", "code-postfixOp"));
//     }
// });
// Lobster.Outlets.CPP.Decrement = Outlets.CPP.Expression.extend({
//     _name: "Outlets.CPP.Decrement",
//     init: function(element, code, simOutlet){
//         this.initParent(element, code, simOutlet);
//         var operandElem = $("<span></span>");
//         createCodeOutlet(operandElem, this.construct.operand, this);
//         this.exprElem.append(operandElem);
//         this.exprElem.append(htmlDecoratedOperator("--", "code-postfixOp"));
//     }
// });
class SubscriptExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("code-subscript");
        this.operand = addChildExpressionOutlet(this.exprElem, this.construct.operand, this);
        this.exprElem.append(util_1.htmlDecoratedOperator("[", "code-postfixOp"));
        this.offset = addChildExpressionOutlet(this.exprElem, this.construct.offset, this);
        this.exprElem.append(util_1.htmlDecoratedOperator("]", "code-postfixOp"));
    }
}
exports.SubscriptExpressionOutlet = SubscriptExpressionOutlet;
class DotExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent, false);
        this.operand = addChildExpressionOutlet(this.exprElem, this.construct.operand, this);
        this.exprElem.append(util_1.htmlDecoratedOperator(".", "code-postfixOp"));
        this.exprElem.append(util_1.htmlDecoratedName(construct.entity.name, construct.entity.type));
    }
}
exports.DotExpressionOutlet = DotExpressionOutlet;
class ArrowExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent, false);
        this.operand = addChildExpressionOutlet(this.exprElem, this.construct.operand, this);
        this.exprElem.append(util_1.htmlDecoratedOperator("->", "code-postfixOp"));
        this.exprElem.append(construct.entity.name);
    }
}
exports.ArrowExpressionOutlet = ArrowExpressionOutlet;
class ParenthesesOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent, false);
        this.exprElem.append("(");
        this.subexpression = addChildExpressionOutlet(this.exprElem, this.construct.subexpression, this);
        this.exprElem.append(")");
    }
}
exports.ParenthesesOutlet = ParenthesesOutlet;
class InitializerListOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent, false);
        this.exprElem.append("{");
        this.elements = construct.elements.map((elem, i) => {
            if (i > 0) {
                this.exprElem.append(", ");
            }
            return addChildExpressionOutlet(this.exprElem, elem, this);
        });
        this.exprElem.append("}");
    }
}
exports.InitializerListOutlet = InitializerListOutlet;
class IdentifierOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent, false);
        this.exprElem.addClass("code-name");
        this.exprElem.append(lexical_1.identifierToString(this.construct.name));
    }
}
exports.IdentifierOutlet = IdentifierOutlet;
class NumericLiteralOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent, false);
        this.exprElem.addClass("code-literal");
        this.exprElem.append(getValueString(this.construct.value));
    }
}
exports.NumericLiteralOutlet = NumericLiteralOutlet;
class StringLiteralExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent, false);
        this.exprElem.addClass("code-string-literal");
        this.exprElem.append(`"${this.construct.str}"`);
    }
}
exports.StringLiteralExpressionOutlet = StringLiteralExpressionOutlet;
class OpaqueExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent, false);
        this.exprElem.addClass("code-opaque-expression");
        this.exprElem.append("/* IMPLEMENTATION NOT SHOWN */");
    }
}
exports.OpaqueExpressionOutlet = OpaqueExpressionOutlet;
class ThisExpressionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.exprElem.append(util_1.htmlDecoratedKeyword("this"));
    }
}
exports.ThisExpressionOutlet = ThisExpressionOutlet;
class TypeConversionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("code-implicitConversion");
        this.from = addChildExpressionOutlet(this.exprElem, this.construct.from, this);
    }
}
exports.TypeConversionOutlet = TypeConversionOutlet;
class LValueToRValueOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("code-lValueToRValue");
        this.from = addChildExpressionOutlet(this.exprElem, this.construct.from, this);
    }
}
exports.LValueToRValueOutlet = LValueToRValueOutlet;
class ArrayToPointerOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("code-arrayToPointer");
        this.from = addChildExpressionOutlet(this.exprElem, this.construct.from, this);
    }
}
exports.ArrayToPointerOutlet = ArrayToPointerOutlet;
class StreamToBoolOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("code-streamToBool");
        this.from = addChildExpressionOutlet(this.exprElem, this.construct.from, this);
    }
}
exports.StreamToBoolOutlet = StreamToBoolOutlet;
class QualificationConversionOutlet extends ExpressionOutlet {
    constructor(element, construct, parent) {
        super(element, construct, parent);
        this.element.addClass("code-qualificationConversion");
        this.from = addChildExpressionOutlet(this.exprElem, this.construct.from, this);
    }
}
exports.QualificationConversionOutlet = QualificationConversionOutlet;
function createExpressionOutlet(element, construct, parent) {
    return construct.createDefaultOutlet(element, parent);
}
exports.createExpressionOutlet = createExpressionOutlet;
function createInitializerOutlet(element, construct, parent) {
    return construct.createDefaultOutlet(element, parent);
}
exports.createInitializerOutlet = createInitializerOutlet;
function createStatementOutlet(element, construct, parent) {
    return construct.createDefaultOutlet(element, parent);
}
exports.createStatementOutlet = createStatementOutlet;
function addChildExpressionOutlet(parentElement, construct, parent) {
    return createExpressionOutlet($("<span></span>").appendTo(parentElement), construct, parent);
}
exports.addChildExpressionOutlet = addChildExpressionOutlet;
function addChildInitializerOutlet(parentElement, construct, parent) {
    return createInitializerOutlet($("<span></span>").appendTo(parentElement), construct, parent);
}
exports.addChildInitializerOutlet = addChildInitializerOutlet;
function addChildStatementOutlet(parentElement, construct, parent, indented = true) {
    let childElem = $("<span></span>");
    if (!construct.isBlock() && construct.parent instanceof statements_1.Block) {
        parentElement.append("<br />");
        childElem.addClass("code-indentedBlockBody");
    }
    return createStatementOutlet(childElem.appendTo(parentElement), construct, parent);
}
exports.addChildStatementOutlet = addChildStatementOutlet;
// var createCodeOutlet = function(element, code, parent){
//     assert(code);
//     assert(simOutlet);
//     var outletClass = DEFAULT_CODE_OUTLETS[code._class];
//     if (outletClass) {
//         return outletClass.instance(element, code, simOutlet);
//     }
//     else if(code.isA(Expressions.BinaryOperator)){
//         return Outlets.CPP.BinaryOperator.instance(element, code, simOutlet);
//     }
//     else if(code.isA(Conversions.ImplicitConversion)){
//         return Outlets.CPP.ImplicitConversion.instance(element, code, simOutlet);
//     }
//     else if(code.isA(Expressions.Expression)){
//         return Outlets.CPP.Expression.instance(element, code, simOutlet);
//     }
//     else{
//         return Outlets.CPP.Code.instance(element, code, simOutlet);
//     }
// };
// var DEFAULT_CODE_OUTLETS = {};
// DEFAULT_CODE_OUTLETS[Statements.Block] = Outlets.CPP.Block;
// DEFAULT_CODE_OUTLETS[Statements.FunctionBodyBlock] = Outlets.CPP.Block;
// DEFAULT_CODE_OUTLETS[Statements.OpaqueFunctionBodyBlock] = Outlets.CPP.OpaqueFunctionBodyBlock;
// DEFAULT_CODE_OUTLETS[Statements.DeclarationStatement] = Outlets.CPP.DeclarationStatement;
// DEFAULT_CODE_OUTLETS[Statements.ExpressionStatement] = Outlets.CPP.ExpressionStatement;
// DEFAULT_CODE_OUTLETS[Statements.Selection] = Outlets.CPP.Selection;
// DEFAULT_CODE_OUTLETS[Statements.While] = Outlets.CPP.While;
// DEFAULT_CODE_OUTLETS[Statements.DoWhile] = Outlets.CPP.DoWhile;
// DEFAULT_CODE_OUTLETS[Statements.For] = Outlets.CPP.For;
// DEFAULT_CODE_OUTLETS[Statements.Return] = Outlets.CPP.Return;
// DEFAULT_CODE_OUTLETS[Statements.Break] = Outlets.CPP.Break;
// DEFAULT_CODE_OUTLETS[Declarations.Declaration] = Outlets.CPP.Declaration;
// DEFAULT_CODE_OUTLETS[Declarations.Parameter] = Outlets.CPP.Parameter;
// //DEFAULT_CODE_OUTLETS[Initializer] = Outlets.CPP.Initializer;
// DEFAULT_CODE_OUTLETS[DefaultInitializer] = Outlets.CPP.DefaultInitializer;
// DEFAULT_CODE_OUTLETS[DefaultMemberInitializer] = Outlets.CPP.DefaultInitializer;
// DEFAULT_CODE_OUTLETS[MemberInitializer] = Outlets.CPP.DirectInitializer;
// DEFAULT_CODE_OUTLETS[DirectInitializer] = Outlets.CPP.DirectInitializer;
// DEFAULT_CODE_OUTLETS[CopyInitializer] = Outlets.CPP.CopyInitializer;
// DEFAULT_CODE_OUTLETS[ParameterInitializer] = Outlets.CPP.ParameterInitializer;
// DEFAULT_CODE_OUTLETS[ReturnInitializer] = Outlets.CPP.ReturnInitializer;
// DEFAULT_CODE_OUTLETS[InitializerList] = Outlets.CPP.InitializerList;
// DEFAULT_CODE_OUTLETS[Expressions.Expression] = Outlets.CPP.Expression;
// DEFAULT_CODE_OUTLETS[Expressions.BinaryOperator] = Outlets.CPP.BinaryOperator;
// //DEFAULT_CODE_OUTLETS[Expressions.BINARY_OPS["+"]] = Outlets.CPP.BinaryOperator;
// DEFAULT_CODE_OUTLETS[Expressions.Assignment] = Outlets.CPP.Assignment;
// DEFAULT_CODE_OUTLETS[Expressions.Ternary] = Outlets.CPP.Ternary;
// DEFAULT_CODE_OUTLETS[Expressions.Comma] = Outlets.CPP.Comma;
// DEFAULT_CODE_OUTLETS[Expressions.CompoundAssignment] = Outlets.CPP.CompoundAssignment;
// DEFAULT_CODE_OUTLETS[Expressions.FunctionCallExpression] = Outlets.CPP.FunctionCallExpression;
// DEFAULT_CODE_OUTLETS[Expressions.Subscript] = Outlets.CPP.Subscript;
// DEFAULT_CODE_OUTLETS[Expressions.Dot] = Outlets.CPP.Dot;
// DEFAULT_CODE_OUTLETS[Expressions.Arrow] = Outlets.CPP.Arrow;
// DEFAULT_CODE_OUTLETS[Expressions.Increment] = Outlets.CPP.Increment;
// DEFAULT_CODE_OUTLETS[Expressions.Decrement] = Outlets.CPP.Decrement;
// DEFAULT_CODE_OUTLETS[Expressions.NewExpression] = Outlets.CPP.NewExpression;
// DEFAULT_CODE_OUTLETS[Expressions.Delete] = Outlets.CPP.Delete;
// DEFAULT_CODE_OUTLETS[Expressions.DeleteArray] = Outlets.CPP.DeleteArray;
// DEFAULT_CODE_OUTLETS[Expressions.Construct] = Outlets.CPP.ConstructExpression;
// DEFAULT_CODE_OUTLETS[Expressions.LogicalNot] = Outlets.CPP.LogicalNot;
// DEFAULT_CODE_OUTLETS[Expressions.Prefix] = Outlets.CPP.Prefix;
// DEFAULT_CODE_OUTLETS[Expressions.Dereference] = Outlets.CPP.Dereference;
// DEFAULT_CODE_OUTLETS[Expressions.AddressOf] = Outlets.CPP.AddressOf;
// DEFAULT_CODE_OUTLETS[Expressions.UnaryPlus] = Outlets.CPP.UnaryPlus;
// DEFAULT_CODE_OUTLETS[Expressions.UnaryMinus] = Outlets.CPP.UnaryMinus;
// DEFAULT_CODE_OUTLETS[Expressions.Parentheses] = Outlets.CPP.Parentheses;
// DEFAULT_CODE_OUTLETS[Expressions.Identifier] = Outlets.CPP.Identifier;
// DEFAULT_CODE_OUTLETS[Expressions.Literal] = Outlets.CPP.Literal;
// DEFAULT_CODE_OUTLETS[Expressions.ThisExpression] = Outlets.CPP.ThisExpression;
// DEFAULT_CODE_OUTLETS[Conversions.ArrayToPointer] = Outlets.CPP.ArrayToPointer;
// DEFAULT_CODE_OUTLETS[Conversions.LValueToRValue] = Outlets.CPP.LValueToRValue;
// DEFAULT_CODE_OUTLETS[Conversions.QualificationConversion] = Outlets.CPP.QualificationConversion;
//# sourceMappingURL=codeOutlets.js.map