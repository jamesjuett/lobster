import { CompleteObjectType, VoidType } from "../../compilation/types";
import { ExpressionContext } from "../../compilation/contexts";
import { SuccessfullyCompiled } from "../CPPConstruct";
import { ValueCategory, Expression, CompiledExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { UnaryOperatorExpressionOutlet } from "../../../view/constructs/ExpressionOutlets";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { t_UnaryOperators, UnaryOperatorExpressionASTNode } from "../../../ast/ast_expressions";
import { LogicalNotExpression } from "./LogicalNotExpression";
import { UnaryMinusExpression } from "./UnaryMinusExpression";
import { UnaryPlusExpression } from "./UnaryPlusExpression";
import { AddressOfExpression } from "./AddressOfExpression";
import { DereferenceExpression } from "./DereferenceExpression";
import { PrefixIncrementExpression } from "./PrefixIncrementExpression";

export abstract class UnaryOperatorExpression<ASTType extends UnaryOperatorExpressionASTNode = UnaryOperatorExpressionASTNode> extends Expression<ASTType> {

    public abstract readonly type?: CompleteObjectType | VoidType; // VoidType is due to delete, delete[]

    public abstract readonly operand: Expression;

    public abstract readonly operator: t_UnaryOperators;

    protected constructor(context: ExpressionContext, ast: ASTType | undefined) {
        super(context, ast);
    }

    public createDefaultOutlet(this: CompiledUnaryOperatorExpression, element: JQuery, parent?: ConstructOutlet) {
        return new UnaryOperatorExpressionOutlet(element, this, parent);
    }
}

export type AnalyticUnaryOperatorExpression =
    DereferenceExpression |
    AddressOfExpression |
    UnaryPlusExpression |
    UnaryMinusExpression |
    LogicalNotExpression |
    PrefixIncrementExpression;

export interface TypedUnaryOperatorExpression<T extends CompleteObjectType | VoidType = CompleteObjectType | VoidType, V extends ValueCategory = ValueCategory> extends UnaryOperatorExpression, t_TypedExpression {
    readonly type: T;
    readonly valueCategory: ValueCategory;
}

export interface CompiledUnaryOperatorExpression<T extends CompleteObjectType | VoidType = CompleteObjectType | VoidType, V extends ValueCategory = ValueCategory> extends TypedUnaryOperatorExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly operand: CompiledExpression;
}


export interface RuntimeUnaryOperatorExpression extends RuntimeExpression<CompleteObjectType | VoidType, ValueCategory, CompiledUnaryOperatorExpression<CompleteObjectType | VoidType>> {

    readonly operand: RuntimeExpression;

}
