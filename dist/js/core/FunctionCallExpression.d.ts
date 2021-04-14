/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { SuccessfullyCompiled, RuntimeConstruct, ExpressionContext, ConstructDescription, SemanticContext } from "./constructs";
import { CompiledTemporaryDeallocator } from "./PotentialFullExpression";
import { CompiledFunctionCall, FunctionCall, RuntimeFunctionCall, TypedFunctionCall } from "./FunctionCall";
import { CompiledFunctionIdentifierExpression, RuntimeFunctionIdentifierExpression, MagicFunctionCallExpression, CompiledFunctionDotExpression, RuntimeFunctionDotExpression, CompiledFunctionArrowExpression, RuntimeFunctionArrowExpression } from "./expressions";
import { FunctionCallExpressionASTNode } from "../ast/ast_expressions";
import { PeelReference, FunctionType, CompleteReturnType } from "./types";
import { CompiledExpression, RuntimeExpression, ValueCategory, Expression } from "./expressionBase";
import { FunctionCallExpressionOutlet, ConstructOutlet } from "../view/codeOutlets";
import { AnalyticConstruct } from "./predicates";
export declare class FunctionCallExpression extends Expression<FunctionCallExpressionASTNode> {
    readonly construct_type = "function_call_expression";
    readonly type?: PeelReference<CompleteReturnType>;
    readonly valueCategory?: ValueCategory;
    readonly operand: Expression;
    readonly originalArgs: readonly Expression[];
    readonly call?: FunctionCall;
    constructor(context: ExpressionContext, ast: FunctionCallExpressionASTNode | undefined, operand: Expression, args: readonly Expression[]);
    static createFromAST(ast: FunctionCallExpressionASTNode, context: ExpressionContext): FunctionCallExpression | MagicFunctionCallExpression;
    createDefaultOutlet(this: CompiledFunctionCallExpression, element: JQuery, parent?: ConstructOutlet): FunctionCallExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean;
}
export interface TypedFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends FunctionCallExpression {
    readonly type: T;
    readonly valueCategory: V;
    readonly call: TypedFunctionCall<FunctionType<CompleteReturnType>>;
}
export interface CompiledFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends TypedFunctionCallExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly operand: CompiledFunctionIdentifierExpression | CompiledFunctionDotExpression | CompiledFunctionArrowExpression;
    readonly originalArgs: readonly CompiledExpression[];
    readonly call: CompiledFunctionCall<FunctionType<CompleteReturnType>>;
}
export declare const INDEX_FUNCTION_CALL_EXPRESSION_OPERAND = 0;
export declare const INDEX_FUNCTION_CALL_EXPRESSION_CALL = 1;
export declare const INDEX_FUNCTION_CALL_EXPRESSION_RETURN = 2;
export declare class RuntimeFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T, V, CompiledFunctionCallExpression<T, V>> {
    readonly operand: RuntimeFunctionIdentifierExpression | RuntimeFunctionDotExpression | RuntimeFunctionArrowExpression;
    readonly call?: RuntimeFunctionCall<FunctionType<CompleteReturnType>>;
    readonly index: typeof INDEX_FUNCTION_CALL_EXPRESSION_OPERAND | typeof INDEX_FUNCTION_CALL_EXPRESSION_CALL | typeof INDEX_FUNCTION_CALL_EXPRESSION_RETURN;
    constructor(model: CompiledFunctionCallExpression<T, V>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
