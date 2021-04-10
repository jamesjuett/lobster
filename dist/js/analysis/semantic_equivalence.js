"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkForNullptrEquivalence = exports.checkForZeroEquivalence = exports.assignmentEquivalence = void 0;
const constructs_1 = require("../core/constructs");
const expressions_1 = require("../core/expressions");
const predicates_1 = require("../core/predicates");
function assignmentEquivalence(assn, compound, ec) {
    let thisRhs = assn.rhs;
    return constructs_1.areSemanticallyEquivalent(assn.lhs, compound.lhs, ec)
        && predicates_1.Predicates.isBinaryOperatorExpression(thisRhs)
        // Two possibilities:
        //   Other's rhs is our rhs.left and compound's lhs is our rhs.right
        //   OR compound's rhs is our rhs.right and compound's lhs is our rhs.left
        && (constructs_1.areSemanticallyEquivalent(compound.rhs, thisRhs.left, ec) && constructs_1.areSemanticallyEquivalent(compound.lhs, thisRhs.right, ec)
            || constructs_1.areSemanticallyEquivalent(compound.rhs, thisRhs.right, ec) && constructs_1.areSemanticallyEquivalent(compound.lhs, thisRhs.left, ec));
}
exports.assignmentEquivalence = assignmentEquivalence;
function checkForZeroEquivalence(boolConv, rel, ec) {
    if (rel.operator === "!=") {
        if (constructs_1.areSemanticallyEquivalent(boolConv.from, rel.left, ec) && (isEquivalentToZero(rel.right)) ||
            constructs_1.areSemanticallyEquivalent(boolConv.from, rel.right, ec) && (isEquivalentToZero(rel.left))) {
            return true;
        }
    }
    return false;
}
exports.checkForZeroEquivalence = checkForZeroEquivalence;
function checkForNullptrEquivalence(boolConv, rel, ec) {
    if (rel.operator === "!=") {
        if (constructs_1.areSemanticallyEquivalent(boolConv.from, rel.left, ec) && rel.right instanceof expressions_1.NullPointerConversion ||
            constructs_1.areSemanticallyEquivalent(boolConv.from, rel.right, ec) && rel.left instanceof expressions_1.NullPointerConversion) {
            return true;
        }
    }
    return false;
}
exports.checkForNullptrEquivalence = checkForNullptrEquivalence;
function isEquivalentToZero(expr) {
    return expressions_1.isIntegerLiteralZero(expr) || expr.construct_type === "ImplicitConversion" && isEquivalentToZero(expr.from);
}
//# sourceMappingURL=semantic_equivalence.js.map