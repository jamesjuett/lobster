import { areSemanticallyEquivalent, SemanticContext } from '../core/constructs';
import { Expression } from '../core/expressionBase';
import {
  ToBooleanConversion,
  AnalyticExpression,
  AssignmentExpression,
  CompoundAssignmentExpression,
  RelationalBinaryOperatorExpression,
  isIntegerLiteralZero,
  NullPointerConversion,
  PointerComparisonExpression,
  PointerToBooleanConversion,
} from '../core/expressions';
import { Predicates } from '../core/predicates';
import { AtomicType, PointerType } from '../core/types';

export function assignmentEquivalence(
  assn: AssignmentExpression,
  compound: CompoundAssignmentExpression,
  ec: SemanticContext
) {
  let thisRhs = <AnalyticExpression>assn.rhs;
  return (
    areSemanticallyEquivalent(assn.lhs, compound.lhs, ec) &&
    Predicates.isBinaryOperatorExpression(thisRhs) &&
    // Two possibilities:
    //   Other's rhs is our rhs.left and compound's lhs is our rhs.right
    //   OR compound's rhs is our rhs.right and compound's lhs is our rhs.left
    ((areSemanticallyEquivalent(compound.rhs, thisRhs.left, ec) &&
      areSemanticallyEquivalent(compound.lhs, thisRhs.right, ec)) ||
      (areSemanticallyEquivalent(compound.rhs, thisRhs.right, ec) &&
        areSemanticallyEquivalent(compound.lhs, thisRhs.left, ec)))
  );
}

export function checkForZeroEquivalence<T extends AtomicType>(
  boolConv: ToBooleanConversion<T>,
  rel: RelationalBinaryOperatorExpression,
  ec: SemanticContext
) {
  if (rel.operator === '!=') {
    if (
      (areSemanticallyEquivalent(boolConv.from, rel.left, ec) &&
        isEquivalentToZero(<AnalyticExpression>rel.right)) ||
      (areSemanticallyEquivalent(boolConv.from, rel.right, ec) &&
        isEquivalentToZero(<AnalyticExpression>rel.left))
    ) {
      return true;
    }
  }

  return false;
}

export function checkForNullptrEquivalence<T extends PointerType>(
  boolConv: PointerToBooleanConversion<T>,
  rel: PointerComparisonExpression,
  ec: SemanticContext
) {
  if (rel.operator === '!=') {
    if (
      (areSemanticallyEquivalent(boolConv.from, rel.left, ec) &&
        rel.right instanceof NullPointerConversion) ||
      (areSemanticallyEquivalent(boolConv.from, rel.right, ec) &&
        rel.left instanceof NullPointerConversion)
    ) {
      return true;
    }
  }

  return false;
}

function isEquivalentToZero(expr: AnalyticExpression): boolean {
  return (
    isIntegerLiteralZero(expr) ||
    (expr.construct_type === 'ImplicitConversion' &&
      isEquivalentToZero(<AnalyticExpression>expr.from))
  );
}
