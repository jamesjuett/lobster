import { FunctionType, VoidType, CompleteObjectType, ReferenceType, AtomicType, CompleteClassType, CompleteReturnType, ReferredType } from "./types";
import { RuntimeConstruct } from "./constructs";
import { CompiledFunctionDefinition } from "./declarations";
import { RuntimeFunctionCall } from "./functionCall";
import { MemoryFrame, Value } from "./runtimeEnvironment";
import { CPPObject } from "./objects";
import { RuntimeBlock } from "./statements";
import { Simulation } from "./Simulation";
import { RuntimeCtorInitializer } from "./initializers";
export declare class RuntimeFunction<T extends FunctionType<CompleteReturnType> = FunctionType<CompleteReturnType>> extends RuntimeConstruct<CompiledFunctionDefinition<T>> {
    readonly caller?: RuntimeFunctionCall;
    readonly stackFrame?: MemoryFrame;
    readonly receiver?: CPPObject<CompleteClassType>;
    /**
     * The object returned by the function, either an original returned-by-reference or a temporary
     * object created to hold a return-by-value. Once the function call has been executed, will be
     * defined unless it's a void function.
     */
    readonly returnObject?: T extends FunctionType<infer RT> ? (RT extends VoidType ? undefined : RT extends CompleteObjectType ? CPPObject<RT> : RT extends ReferenceType<CompleteObjectType> ? CPPObject<ReferredType<RT>> : never) : never;
    readonly hasControl: boolean;
    readonly ctorInitializer?: RuntimeCtorInitializer;
    readonly body: RuntimeBlock;
    constructor(model: CompiledFunctionDefinition<T>, sim: Simulation, caller: RuntimeFunctionCall | null, receiver?: CPPObject<CompleteClassType>);
    pushStackFrame(): void;
    popStackFrame(): void;
    /**
     * Sets the return object for this function. May only be invoked once.
     * e.g.
     *  - return-by-value: The caller should set the return object to a temporary object, whose value
     *                     may be initialized by a return statement.
     *  - return-by-reference: When the function is finished, is set to the object returned.
     */
    setReturnObject<T extends FunctionType<AtomicType | CompleteClassType>>(this: RuntimeFunction<T>, obj: CPPObject<T["returnType"]>): void;
    setReturnObject<T extends ReferenceType<CompleteObjectType>>(this: RuntimeFunction<FunctionType<T>>, obj: CPPObject<ReferredType<T>>): void;
    getParameterObject(num: number): import("./objects").AutoObject<CompleteObjectType>;
    initializeParameterObject(num: number, value: Value<AtomicType>): void;
    bindReferenceParameter(num: number, obj: CPPObject): void;
    gainControl(): void;
    loseControl(): void;
    protected stepForwardImpl(): void;
    protected upNextImpl(): void;
}
