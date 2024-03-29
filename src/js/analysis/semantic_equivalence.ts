import { areSemanticallyEquivalent, SemanticContext } from "../core/compilation/contexts";
import { Expression } from "../core/constructs/expressions/Expression";
import { AnalyticExpression } from "../core/constructs/expressions/expressions";
import { ToBooleanConversion, isIntegerLiteralZero, NullPointerConversion, PointerToBooleanConversion } from "../core/constructs/expressions/ImplicitConversion";
import { PointerComparisonExpression } from "../core/constructs/expressions/PointerComparisonExpression";
import { RelationalBinaryOperatorExpression } from "../core/constructs/expressions/RelationalBinaryOperatorExpression";
import { CompoundAssignmentExpression } from "../core/constructs/expressions/CompoundAssignmentExpression";
import { AssignmentExpression } from "../core/constructs/expressions/AssignmentExpression";
import { Predicates } from "./predicates";
import { AtomicType, PointerType } from "../core/compilation/types";

export function assignmentEquivalence(assn: AssignmentExpression, compound: CompoundAssignmentExpression, ec: SemanticContext) {
    let thisRhs = <AnalyticExpression>assn.rhs;
        return areSemanticallyEquivalent(assn.lhs, compound.lhs, ec)
            && Predicates.isBinaryOperatorExpression(thisRhs)

            // Two possibilities:
            //   Other's rhs is our rhs.left and compound's lhs is our rhs.right
            //   OR compound's rhs is our rhs.right and compound's lhs is our rhs.left
            && (
                areSemanticallyEquivalent(compound.rhs, thisRhs.left, ec) && areSemanticallyEquivalent(compound.lhs, thisRhs.right, ec)
                || areSemanticallyEquivalent(compound.rhs, thisRhs.right, ec) && areSemanticallyEquivalent(compound.lhs, thisRhs.left, ec)
            );
}

export function checkForZeroEquivalence<T extends AtomicType>(boolConv: ToBooleanConversion<T>, rel: RelationalBinaryOperatorExpression, ec: SemanticContext) {
    
    if (rel.operator === "!=") {
        if (areSemanticallyEquivalent(boolConv.from, rel.left, ec) && (isEquivalentToZero(<AnalyticExpression>rel.right)) ||
            areSemanticallyEquivalent(boolConv.from, rel.right, ec) && (isEquivalentToZero(<AnalyticExpression>rel.left))) {
            return true;
        }
    }

    return false;
}

export function checkForNullptrEquivalence<T extends PointerType>(boolConv: PointerToBooleanConversion<T>, rel: PointerComparisonExpression, ec: SemanticContext) {
    
    if (rel.operator === "!=") {
        if (areSemanticallyEquivalent(boolConv.from, rel.left, ec) && rel.right instanceof NullPointerConversion ||
            areSemanticallyEquivalent(boolConv.from, rel.right, ec) && rel.left instanceof NullPointerConversion) {
            return true;
        }
    }

    return false;
}

function isEquivalentToZero(expr: AnalyticExpression) : boolean {
    return isIntegerLiteralZero(expr) || expr.construct_type === "ImplicitConversion" && isEquivalentToZero(<AnalyticExpression>expr.from);
}