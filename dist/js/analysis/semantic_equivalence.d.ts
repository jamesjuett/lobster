import { SemanticContext } from "../core/constructs";
import { ToBooleanConversion, AssignmentExpression, CompoundAssignmentExpression, RelationalBinaryOperatorExpression, PointerComparisonExpression, PointerToBooleanConversion } from "../core/expressions";
import { AtomicType, PointerType } from "../core/types";
export declare function assignmentEquivalence(assn: AssignmentExpression, compound: CompoundAssignmentExpression, ec: SemanticContext): boolean;
export declare function checkForZeroEquivalence<T extends AtomicType>(boolConv: ToBooleanConversion<T>, rel: RelationalBinaryOperatorExpression, ec: SemanticContext): boolean;
export declare function checkForNullptrEquivalence<T extends PointerType>(boolConv: PointerToBooleanConversion<T>, rel: PointerComparisonExpression, ec: SemanticContext): boolean;
