import { FunctionEntity, TemporaryObjectEntity } from "./entities";
import { AtomicType, CompleteClassType, CompleteReturnType, FunctionType, ReferenceType, VoidType } from "./types";
import { CPPObject } from "./objects";
import { TranslationUnitContext, SuccessfullyCompiled, RuntimeConstruct, SemanticContext } from "./constructs";
import { CompiledDirectInitializer, DirectInitializer, RuntimeDirectInitializer } from "./initializers";
import { CompiledExpression, Expression, TypedExpression } from "./expressionBase";
import { RuntimeFunction } from "./functions";
import { PotentialFullExpression, CompiledTemporaryDeallocator, RuntimePotentialFullExpression } from "./PotentialFullExpression";
import { AnalyticConstruct } from "./predicates";
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
    createRuntimeFunctionCall<T extends FunctionType<CompleteReturnType> = FunctionType<CompleteReturnType>>(this: CompiledFunctionCall<T>, parent: RuntimeConstruct, receiver: CPPObject<CompleteClassType> | undefined): RuntimeFunctionCall<T>;
    isReturnByValue(): this is TypedFunctionCall<FunctionType<AtomicType | CompleteClassType>>;
    isReturnByReference(): this is TypedFunctionCall<FunctionType<ReferenceType>>;
    isReturnVoid(): this is TypedFunctionCall<FunctionType<VoidType>>;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
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
