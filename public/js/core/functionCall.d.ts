/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { TranslationUnitContext, SuccessfullyCompiled, CompiledTemporaryDeallocator, RuntimeConstruct, ASTNode, ExpressionContext, ConstructDescription } from "./constructs";
import { PotentialFullExpression, RuntimePotentialFullExpression } from "./PotentialFullExpression";
import { FunctionEntity, TemporaryObjectEntity } from "./entities";
import { ExpressionASTNode, CompiledFunctionIdentifierExpression, RuntimeFunctionIdentifierExpression, MagicFunctionCallExpression, CompiledFunctionDotExpression, RuntimeFunctionDotExpression, CompiledFunctionArrowExpression, RuntimeFunctionArrowExpression } from "./expressions";
import { VoidType, ReferenceType, PeelReference, AtomicType, FunctionType, CompleteClassType, CompleteReturnType } from "./types";
import { CPPObject } from "./objects";
import { CompiledExpression, RuntimeExpression, TypedExpression, ValueCategory, Expression } from "./expressionBase";
import { FunctionCallExpressionOutlet, ConstructOutlet } from "../view/codeOutlets";
import { DirectInitializer, CompiledDirectInitializer, RuntimeDirectInitializer } from "./initializers";
import { RuntimeFunction } from "./functions";
export declare class FunctionCall extends PotentialFullExpression {
    readonly construct_type = "FunctionCall";
    readonly func: FunctionEntity<FunctionType<CompleteReturnType>>;
    readonly args: readonly Expression[];
    readonly receiverType?: CompleteClassType;
    readonly argInitializers?: readonly DirectInitializer[];
    readonly returnByValueTarget?: TemporaryObjectEntity;
    /**
     * A FunctionEntity must be provided to specify which function is being called. The
     * return type of that function must be complete (if it's not, such a function call
     * should generate an error - the constructs that use FunctionCall should take care
     * of checking for this before making the FunctionCall and generate an error otherwise).
     *
     * @param context
     * @param func Specifies which function is being called.
     * @param args Arguments to the function.
     * @param receiverType
     */
    constructor(context: TranslationUnitContext, func: FunctionEntity<FunctionType<CompleteReturnType>>, args: readonly TypedExpression[], receiverType: CompleteClassType | undefined);
    createRuntimeFunctionCall<T extends FunctionType<CompleteReturnType> = FunctionType<CompleteReturnType>>(this: CompiledFunctionCall<T>, parent: RuntimePotentialFullExpression, receiver: CPPObject<CompleteClassType> | undefined): RuntimeFunctionCall<T>;
    isReturnByValue(): this is TypedFunctionCall<FunctionType<AtomicType | CompleteClassType>>;
    isReturnByReference(): this is TypedFunctionCall<FunctionType<ReferenceType>>;
    isReturnVoid(): this is TypedFunctionCall<FunctionType<VoidType>>;
}
export interface TypedFunctionCall<T extends FunctionType<CompleteReturnType> = FunctionType<CompleteReturnType>> extends FunctionCall, SuccessfullyCompiled {
    readonly returnByValueTarget: T["returnType"] extends (AtomicType | CompleteClassType) ? TemporaryObjectEntity<T["returnType"]> : undefined;
}
export interface CompiledFunctionCall<T extends FunctionType<CompleteReturnType> = FunctionType<CompleteReturnType>> extends TypedFunctionCall<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly args: readonly CompiledExpression[];
    readonly argInitializers: readonly CompiledDirectInitializer[];
}
export declare const INDEX_FUNCTION_CALL_PUSH = 0;
export declare const INDEX_FUNCTION_CALL_ARGUMENTS = 1;
export declare const INDEX_FUNCTION_CALL_CALL = 2;
export declare const INDEX_FUNCTION_CALL_RETURN = 3;
export declare class RuntimeFunctionCall<T extends FunctionType<CompleteReturnType> = FunctionType<CompleteReturnType>> extends RuntimePotentialFullExpression<CompiledFunctionCall<T>> {
    readonly model: CompiledFunctionCall<T>;
    readonly calledFunction: RuntimeFunction<T>;
    readonly argInitializers: readonly RuntimeDirectInitializer[];
    readonly receiver?: CPPObject<CompleteClassType>;
    readonly index: typeof INDEX_FUNCTION_CALL_PUSH | typeof INDEX_FUNCTION_CALL_ARGUMENTS | typeof INDEX_FUNCTION_CALL_CALL | typeof INDEX_FUNCTION_CALL_RETURN;
    constructor(model: CompiledFunctionCall<T>, parent: RuntimeConstruct, receiver?: CPPObject<CompleteClassType>);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
    isReturnByValue(): this is RuntimeFunctionCall<FunctionType<AtomicType | CompleteClassType>>;
}
export interface FunctionCallExpressionASTNode extends ASTNode {
    readonly construct_type: "function_call_expression";
    readonly operand: ExpressionASTNode;
    readonly args: readonly ExpressionASTNode[];
}
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
