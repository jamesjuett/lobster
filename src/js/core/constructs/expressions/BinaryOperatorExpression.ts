import { AtomicType } from "../../compilation/types";
import { ExpressionContext } from "../../compilation/contexts";
import { SuccessfullyCompiled } from "../constructs";
import { Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { ConstructOutlet, BinaryOperatorExpressionOutlet } from "../../../view/codeOutlets";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { BinaryOperatorExpressionASTNode, t_ArithmeticBinaryOperators, t_BinaryOperators } from "../../../ast/ast_expressions";
import { LogicalBinaryOperatorExpression } from "./LogicalBinaryOperatorExpression";
import { PointerComparisonExpression } from "./PointerComparisonExpression";
import { RelationalBinaryOperatorExpression } from "./RelationalBinaryOperatorExpression";
import { InputOperatorExpression } from "./InputOperatorExpression";
import { OutputOperatorExpression } from "./OutputOperatorExpression";
import { PointerOffsetExpression } from "./PointerOffsetExpression";
import { PointerDifferenceExpression } from "./PointerDifferenceExpression";
import { ArithmeticBinaryOperatorExpression } from "./ArithmeticBinaryOperatorExpression";
import { Value } from "../../runtime/Value";



export abstract class BinaryOperatorExpression<ASTType extends BinaryOperatorExpressionASTNode = BinaryOperatorExpressionASTNode> extends Expression<ASTType> {

    public abstract readonly construct_type:
        "arithmetic_binary_operator_expression" |
        "relational_binary_operator_expression" |
        "logical_binary_operator_expression" |
        "pointer_offset_expression" |
        "pointer_difference_expression" |
        "pointer_comparison_expression";

    public abstract readonly type?: AtomicType;
    public readonly valueCategory = "prvalue";

    public abstract readonly left: Expression;
    public abstract readonly right: Expression;

    public readonly operator: t_BinaryOperators;

    protected constructor(context: ExpressionContext, ast: ASTType | undefined, operator: t_BinaryOperators) {
        super(context, ast);
        this.operator = operator;
    }

    public createDefaultOutlet(this: CompiledBinaryOperatorExpression, element: JQuery, parent?: ConstructOutlet) {
        return new BinaryOperatorExpressionOutlet(element, this, parent);
    }
}
// export interface CompiledBinaryOperatorExpressionBase<T extends AtomicType = AtomicType>

export type AnalyticBinaryOperatorExpression =
    ArithmeticBinaryOperatorExpression |
    PointerDifferenceExpression |
    PointerOffsetExpression |
    OutputOperatorExpression |
    InputOperatorExpression |
    RelationalBinaryOperatorExpression |
    PointerComparisonExpression |
    LogicalBinaryOperatorExpression;

export interface TypedBinaryOperatorExpression<T extends AtomicType = AtomicType> extends BinaryOperatorExpression, t_TypedExpression {
    readonly type: T;
    readonly left: TypedExpression<AtomicType, "prvalue">;
    readonly right: TypedExpression<AtomicType, "prvalue">;
}

export interface CompiledBinaryOperatorExpression<T extends AtomicType = AtomicType> extends TypedBinaryOperatorExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    // Note valueCategory is defined as "prvalue" in BinaryOperator
    readonly left: CompiledExpression<AtomicType, "prvalue">;
    readonly right: CompiledExpression<AtomicType, "prvalue">;
}

export interface RuntimeBinaryOperator extends RuntimeExpression<AtomicType, "prvalue", CompiledBinaryOperatorExpression<AtomicType>> {

    readonly left: RuntimeExpression<AtomicType, "prvalue">;
    readonly right: RuntimeExpression<AtomicType, "prvalue">;

}
