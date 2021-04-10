"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeExpression = exports.allObjectTyped = exports.allWellTyped = exports.Expression = void 0;
const constructs_1 = require("./constructs");
const PotentialFullExpression_1 = require("./PotentialFullExpression");
const types_1 = require("./types");
const predicates_1 = require("./predicates");
class Expression extends PotentialFullExpression_1.PotentialFullExpression {
    constructor(context, ast) {
        super(context, ast);
        this.conversionLength = 0;
    }
    isWellTyped() {
        return !!this.type && !!this.valueCategory;
    }
    isPrvalue() {
        return this.valueCategory === "prvalue";
    }
    isLvalue() {
        return this.valueCategory === "lvalue";
    }
    isStringLiteralExpression() {
        return false;
    }
    // public isSuccessfullyCompiled() : this is Compiled<this> {
    //     return !this.hasErrors;
    // }
    isTailChild(child) {
        return { isTail: false };
    }
    isSemanticallyEquivalent_impl(other, ec) {
        return other.construct_type === this.construct_type
            && constructs_1.areAllSemanticallyEquivalent(this.children, other.children, ec);
    }
}
exports.Expression = Expression;
function allWellTyped(expressions) {
    return expressions.every((expr) => { return expr.isWellTyped(); });
}
exports.allWellTyped = allWellTyped;
function allObjectTyped(expressions) {
    return expressions.every((expr) => { return predicates_1.Predicates.isTypedExpression(expr, types_1.isCompleteObjectType); });
}
exports.allObjectTyped = allObjectTyped;
// : { // Otherwise, T is NOT possibly an ObjectType. This could happen with e.g. an lvalue expression that yields a function
//     readonly prvalue: number;
//     readonly xvalue: number;
//     readonly lvalue: number;
// };
class RuntimeExpression extends PotentialFullExpression_1.RuntimePotentialFullExpression {
    constructor(model, parent) {
        super(model, "expression", parent);
    }
    setEvalResult(value) {
        this.evalResult = value;
        this.observable.send("evaluated", value);
    }
}
exports.RuntimeExpression = RuntimeExpression;
//# sourceMappingURL=expressionBase.js.map