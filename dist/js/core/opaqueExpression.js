"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocal = exports.lookupTypeInContext = exports.RuntimeOpaqueExpression = exports.OpaqueExpression = exports.registerOpaqueExpression = void 0;
const util_1 = require("../util/util");
const expressionBase_1 = require("./expressionBase");
const codeOutlets_1 = require("../view/codeOutlets");
const OPAQUE_EXPRESSIONS = {
// "test": <OpaqueExpressionImpl> {
//     type: VoidType.VOID,
//     valueCategory: "prvalue",
//     operate: (rt: RuntimeOpaqueExpression<VoidType,"prvalue">) => { rt.sim.cout(new Value(10, Int.INT)); }
// }
};
function registerOpaqueExpression(id, impl) {
    util_1.assert(!OPAQUE_EXPRESSIONS[id]);
    OPAQUE_EXPRESSIONS[id] = impl;
}
exports.registerOpaqueExpression = registerOpaqueExpression;
class OpaqueExpression extends expressionBase_1.Expression {
    constructor(context, impl, ast) {
        super(context, undefined);
        this.construct_type = "opaque_expression";
        this.impl = impl;
        if (typeof impl.type === "function") {
            this.type = impl.type(context);
        }
        else {
            this.type = impl.type;
        }
        this.valueCategory = impl.valueCategory;
    }
    static createFromAST(ast, context) {
        util_1.assert(OPAQUE_EXPRESSIONS[ast.id]);
        return new OpaqueExpression(context, OPAQUE_EXPRESSIONS[ast.id], ast);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.OpaqueExpressionOutlet(element, this, parent);
    }
    isTailChild(child) {
        return { isTail: true };
    }
    // TODO
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.OpaqueExpression = OpaqueExpression;
class RuntimeOpaqueExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
    }
    upNextImpl() {
        this.model.impl.upNext && this.model.impl.upNext(this);
    }
    isVoid() {
        return this.model.type.isVoidType();
    }
    stepForwardImpl() {
        let result = this.model.impl.operate(this);
        if (!this.model.type.isVoidType()) {
            this.setEvalResult(result);
        }
        this.startCleanup();
    }
}
exports.RuntimeOpaqueExpression = RuntimeOpaqueExpression;
function lookupTypeInContext(typeName) {
    return (context) => {
        let customType = context.contextualScope.lookup(typeName);
        util_1.assert((customType === null || customType === void 0 ? void 0 : customType.declarationKind) === "class");
        return customType.type.cvUnqualified();
    };
}
exports.lookupTypeInContext = lookupTypeInContext;
function getLocal(rt, name) {
    let local = rt.model.context.contextualScope.lookup(name);
    if (local.variableKind === "object") {
        return local.runtimeLookup(rt);
    }
    else {
        return local.runtimeLookup(rt);
    }
}
exports.getLocal = getLocal;
//# sourceMappingURL=opaqueExpression.js.map