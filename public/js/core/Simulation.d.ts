import { Observable } from "../util/observe";
import { RunnableProgram } from "./Program";
import { Memory, Value } from "./runtimeEnvironment";
import { RuntimeConstruct, RuntimeGlobalObjectAllocator } from "./constructs";
import { CPPRandom } from "../util/util";
import { MainReturnObject } from "./objects";
import { Int, AtomicType, FunctionType, PotentiallyCompleteObjectType, ReferenceType, ReferredType, ArithmeticType } from "./types";
import { RuntimeDirectInitializer } from "./initializers";
import { PassByReferenceParameterEntity, PassByValueParameterEntity } from "./entities";
import { RuntimeExpression } from "./expressionBase";
import { RuntimeFunction } from "./functions";
export declare enum SimulationEvent {
    UNDEFINED_BEHAVIOR = "undefined_behavior",
    UNSPECIFIED_BEHAVIOR = "unspecified_behavior",
    IMPLEMENTATION_DEFINED_BEHAVIOR = "implementation_defined_behavior",
    MEMORY_LEAK = "memory_leak",
    ASSERTION_FAILURE = "assertion_failure",
    CRASH = "crash"
}
export declare enum SimulationActionKind {
    STEP_FORWARD = 0,
    CIN_INPUT = 1
}
export interface StepForwardAction {
    kind: SimulationActionKind.STEP_FORWARD;
}
export interface CinInputAction {
    kind: SimulationActionKind.CIN_INPUT;
    text: string;
}
export declare type SimulationAction = StepForwardAction | CinInputAction;
export declare const STEP_FORWARD_ACTION: StepForwardAction;
export declare enum SimulationOutputKind {
    COUT = 0,
    CIN_ECHO = 1
}
export interface CoutOutput {
    kind: SimulationOutputKind.COUT;
    text: string;
}
export interface CinEchoOutput {
    kind: SimulationOutputKind.CIN_ECHO;
    text: string;
}
export declare type SimulationOutput = CoutOutput | CinEchoOutput;
export declare type SimulationMessages = "started" | "reset" | "mainCalled" | "pushed" | "popped" | "beforeUpNext" | "afterUpNext" | "beforeStepForward" | "afterStepForward" | "afterFullStep" | "atEnded" | "parameterPassedByReference" | "parameterPassedByAtomicValue" | "returnPassed" | "istreamBufferUpdated" | "cout" | "cinInput" | "eventOccurred";
export declare class Simulation {
    readonly observable: Observable<SimulationMessages>;
    readonly program: RunnableProgram;
    readonly memory: Memory;
    private readonly _execStack;
    readonly execStack: readonly RuntimeConstruct[];
    readonly random: CPPRandom;
    readonly stepsTaken: number;
    private readonly _actionsTaken;
    readonly actionsTaken: readonly SimulationAction[];
    readonly allOutput: string;
    readonly outputProduced: readonly SimulationOutput[];
    readonly cin: SimulationInputStream;
    readonly rng: CPPRandom;
    readonly isPaused: boolean;
    readonly atEnd: boolean;
    readonly isBlockingUntilCin: boolean;
    private readonly pendingNews;
    private leakCheckIndex;
    private alertsOff;
    private readonly _eventsOccurred;
    readonly eventsOccurred: {
        [p in SimulationEvent]: readonly string[];
    };
    readonly mainReturnObject: MainReturnObject;
    readonly mainFunction: RuntimeFunction<FunctionType<Int>>;
    readonly globalAllocator: RuntimeGlobalObjectAllocator;
    constructor(program: RunnableProgram, cin?: SimulationInputStream);
    clone(stepsTaken?: number): Simulation;
    reset(): void;
    private start;
    private callMain;
    push(rt: RuntimeConstruct): void;
    top(): RuntimeConstruct<import("./constructs").CompiledConstruct> | undefined;
    /**
     * Removes the top runtime construct from the execution stack.
     * Does nothing if there's nothing on the execution stack.
     */
    pop(): RuntimeConstruct<import("./constructs").CompiledConstruct> | undefined;
    popUntil(rt: RuntimeConstruct): void;
    topFunction(): RuntimeFunction | undefined;
    private allocateStringLiterals;
    takeAction(action: SimulationAction): void;
    stepForward(): void;
    private upNext;
    stepToEnd(): void;
    parameterPassedByReference<T extends ReferenceType<PotentiallyCompleteObjectType>>(target: PassByReferenceParameterEntity<T>, arg: RuntimeExpression<ReferredType<T>, "lvalue">): void;
    parameterPassedByAtomicValue<T extends AtomicType>(target: PassByValueParameterEntity<T>, arg: RuntimeExpression<T, "prvalue">): void;
    returnPassed(rt: RuntimeDirectInitializer): void;
    cinInput(text: string): void;
    blockUntilCin(): void;
    cout(value: Value): void;
    eventOccurred(event: SimulationEvent, message: string, showAlert?: boolean): void;
    hasEventOccurred(event: SimulationEvent): boolean;
    printState(): string;
}
export declare class SimulationInputStream {
    readonly observable: Observable<"bufferUpdated">;
    readonly trimws: boolean;
    readonly buffer: string;
    reset(): this;
    addToBuffer(s: string): this;
    private updateBuffer;
    skipws(): void;
    extractAndParseFromBuffer(type: ArithmeticType): import("./types").ParsingResult<ArithmeticType>;
    extractCharFromBuffer(): string;
    extractWordFromBuffer(): string;
    extractLineFromBuffer(): string;
}
