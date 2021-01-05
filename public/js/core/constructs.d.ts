import { Program, TranslationUnit, SourceReference } from "./Program";
import { Scope, TemporaryObjectEntity, FunctionEntity, LocalObjectEntity, LocalVariableEntity, LocalReferenceEntity, BlockScope, ClassEntity, ClassScope, CompleteClassEntity } from "./entities";
import { Note, NoteRecorder } from "./errors";
import { Simulation } from "./Simulation";
import { Observable } from "../util/observe";
import { AtomicType, CompleteClassType, ExpressionType } from "./types";
import { GlobalVariableDefinition, CompiledGlobalVariableDefinition, AccessSpecifier } from "./declarations";
import { PotentialFullExpression, RuntimePotentialFullExpression } from "./PotentialFullExpression";
import { RuntimeFunction } from "./functions";
import { CPPObject } from "./objects";
export interface ConstructDescription {
    name?: string;
    message: string;
}
export interface Explanation {
    message: string;
}
export interface ASTNode {
    readonly source: {
        readonly start: number;
        readonly end: number;
        readonly text: string;
        readonly line: number;
        readonly column: number;
    };
    readonly library_id?: number;
    readonly library_unsupported?: boolean;
}
export interface ProgramContext {
    readonly program: Program;
    readonly translationUnit?: TranslationUnit;
    readonly implicit?: boolean;
    readonly libraryId?: number;
    readonly libraryUnsupported?: boolean;
}
export declare function createImplicitContext<ContextType extends ProgramContext>(context: ContextType): ContextType;
export interface TranslationUnitContext extends ProgramContext {
    readonly translationUnit: TranslationUnit;
    readonly contextualScope: Scope;
    readonly containingClass?: CompleteClassEntity;
    readonly isLibrary: boolean;
}
export declare function createTranslationUnitContext(parentContext: ProgramContext, translationUnit: TranslationUnit, contextualScope: Scope): TranslationUnitContext;
export declare function createLibraryContext(parentContext: TranslationUnitContext): TranslationUnitContext;
export interface ExpressionContext extends TranslationUnitContext {
    readonly contextualParameterTypes?: readonly (ExpressionType | undefined)[];
    readonly contextualReceiverType?: CompleteClassType;
}
export declare function createExpressionContextWithParameterTypes(parentContext: TranslationUnitContext, contextualParameterTypes: readonly (ExpressionType | undefined)[]): ExpressionContext;
export declare function createExpressionContextWithReceiverType(parentContext: TranslationUnitContext, contextualReceiverType: CompleteClassType): ExpressionContext;
export interface FunctionContext extends TranslationUnitContext {
    readonly containingFunction: FunctionEntity;
    readonly functionLocals: FunctionLocals;
    readonly contextualReceiverType?: CompleteClassType;
}
export declare function createFunctionContext(parentContext: TranslationUnitContext, containingFunction: FunctionEntity, contextualReceiverType: CompleteClassType): MemberFunctionContext;
export declare function createFunctionContext(parentContext: TranslationUnitContext, containingFunction: FunctionEntity, contextualReceiverType?: CompleteClassType): FunctionContext;
export declare function isMemberFunctionContext(context: FunctionContext): context is MemberFunctionContext;
export interface MemberFunctionContext extends FunctionContext {
    readonly contextualReceiverType: CompleteClassType;
}
export interface BlockContext extends FunctionContext {
    readonly contextualScope: BlockScope;
    readonly withinLoop?: true;
}
export interface MemberBlockContext extends BlockContext {
    readonly contextualReceiverType: CompleteClassType;
}
export declare function isBlockContext(context: TranslationUnitContext): context is BlockContext;
export declare function createLoopContext<C extends BlockContext>(parentContext: C): C & {
    withinLoop: boolean;
};
export declare function isClassContext(context: TranslationUnitContext): context is ClassContext;
export interface ClassContext extends TranslationUnitContext {
    readonly contextualScope: ClassScope;
    readonly containingClass: CompleteClassEntity;
    readonly templateType?: AtomicType;
}
export declare function createClassContext(parentContext: TranslationUnitContext, classEntity: ClassEntity, baseClass?: ClassEntity, templateType?: AtomicType): ClassContext;
export declare function isMemberSpecificationContext(context: TranslationUnitContext): context is MemberSpecificationContext;
export interface MemberSpecificationContext extends ClassContext {
    readonly accessLevel: AccessSpecifier;
}
export declare function createMemberSpecificationContext(parentContext: ClassContext, accessLevel: AccessSpecifier): MemberSpecificationContext;
export declare abstract class CPPConstruct<ContextType extends ProgramContext = ProgramContext, ASTType extends ASTNode = ASTNode> {
    abstract readonly construct_type: string;
    private static NEXT_ID;
    readonly constructId: number;
    readonly notes: NoteRecorder;
    readonly context: ContextType;
    readonly ast?: ASTType;
    readonly sourceReference?: SourceReference;
    abstract readonly parent?: CPPConstruct;
    readonly children: readonly CPPConstruct[];
    protected constructor(context: ContextType, ast: ASTType | undefined);
    attach(child: CPPConstruct): void;
    attachAll(children: readonly CPPConstruct[]): void;
    protected abstract onAttach(parent: this["parent"]): void;
    explain(sim: Simulation, rtConstruct: RuntimeConstruct): Explanation;
    describe(sim: Simulation, rtConstruct: RuntimeConstruct): ConstructDescription;
    addNote(note: Note): void;
    getContainedNotes(): NoteRecorder;
    getNearestSourceReference(this: CPPConstruct<TranslationUnitContext>): SourceReference;
    isSuccessfullyCompiled(): this is CompiledConstruct;
}
export declare type TranslationUnitConstruct<ASTType extends ASTNode = ASTNode> = CPPConstruct<TranslationUnitContext, ASTType>;
export interface SuccessfullyCompiled {
    readonly _t_isCompiled: never;
}
export interface CompiledConstruct extends CPPConstruct, SuccessfullyCompiled {
}
export declare type StackType = "statement" | "expression" | "function" | "initializer" | "call" | "ctor-initializer";
export declare abstract class RuntimeConstruct<C extends CompiledConstruct = CompiledConstruct> {
    readonly observable: Observable<string>;
    readonly sim: Simulation;
    readonly model: C;
    readonly stackType: StackType;
    readonly children: {
        [index: string]: RuntimeConstruct;
    };
    readonly parent?: RuntimeConstruct;
    private static NEXT_ID;
    readonly runtimeId: number;
    /**
     * WARNING: The containingRuntimeFunction property may be undefined, even though it's type suggests it will always
     * be defined. In most places where it is accessed, there is an implicit assumption that a runtime construct
     * situated inside a function is being used (e.g. looking up an entity that depends on a local function) and the
     * client code would end up needing a non-null assertion anyway. Those non-null assertions are annoying, so
     * instead we trick the type system and trust that this property will be used appropriately by the programmer.
     */
    readonly containingRuntimeFunction: RuntimeFunction;
    readonly stepsTakenAtStart: number;
    readonly isActive: boolean;
    readonly isUpNext: boolean;
    readonly isWaiting: boolean;
    readonly isDone: boolean;
    private cleanupConstruct?;
    readonly cleanupStarted: boolean;
    private pauses;
    constructor(model: C, stackType: StackType, parentOrSim: RuntimeConstruct | Simulation);
    protected setContainingRuntimeFunction(func: RuntimeFunction): void;
    protected setContextualReceiver(obj: CPPObject<CompleteClassType>): void;
    /**
     * WARNING: The contextualReceiver property may be undefined, even though it's type suggests it will always
     * be defined. In most places where it is accessed, there is an implicit assumption that the runtime construct
     * for whom the lookup is being performed is situated in a context where there is a contextual receiver (e.g.
     * inside a member function) and the client code would end up needing a non-null assertion anyway. Those
     * non-null assertions are annoying, so instead we trick the type system and trust that this property will
     * be used appropriately by the programmer.
     */
    get contextualReceiver(): CPPObject<CompleteClassType>;
    /**
     * REQUIRES: this instance is on the top of the execution stack
     */
    stepForward(): void;
    protected abstract stepForwardImpl(): void;
    upNext(): void;
    protected abstract upNextImpl(): void;
    setPauseWhenUpNext(): void;
    wait(): void;
    afterPushed(): void;
    protected setCleanupConstruct(cleanupConstruct: RuntimeConstruct): void;
    startCleanup(): void;
    afterPopped(): void;
    private addChild;
    findParentByModel(model: CPPConstruct): RuntimeConstruct<CompiledConstruct> | undefined;
    explain(): Explanation;
    describe(): ConstructDescription;
}
export declare abstract class BasicCPPConstruct<ContextType extends TranslationUnitContext, ASTType extends ASTNode> extends CPPConstruct<ContextType, ASTType> {
    parent?: CPPConstruct;
    constructor(context: ContextType, ast: ASTType | undefined);
    onAttach(parent: CPPConstruct): void;
}
export declare class InvalidConstruct extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    readonly construct_type = "invalid_construct";
    readonly note: Note;
    readonly type: undefined;
    constructor(context: TranslationUnitContext, ast: ASTNode | undefined, errorFn: (construct: CPPConstruct) => Note, children?: readonly CPPConstruct[]);
}
export declare class FunctionLocals {
    readonly localObjects: readonly LocalObjectEntity[];
    readonly localReferences: readonly LocalReferenceEntity[];
    readonly localVariablesByEntityId: {
        [index: number]: LocalVariableEntity;
    };
    registerLocalVariable(local: LocalVariableEntity): void;
}
export declare class TemporaryDeallocator extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    readonly construct_type = "TemporaryDeallacator";
    readonly parent?: PotentialFullExpression;
    readonly temporaryObjects: TemporaryObjectEntity[];
    constructor(context: TranslationUnitContext, temporaryObjects: TemporaryObjectEntity[]);
    createRuntimeConstruct(this: CompiledTemporaryDeallocator, parent: RuntimePotentialFullExpression): RuntimeTemporaryDeallocator;
}
export interface CompiledTemporaryDeallocator extends TemporaryDeallocator, SuccessfullyCompiled {
}
export declare class RuntimeTemporaryDeallocator extends RuntimeConstruct<CompiledTemporaryDeallocator> {
    private index;
    private justDestructed;
    readonly parent: RuntimePotentialFullExpression;
    constructor(model: CompiledTemporaryDeallocator, parent: RuntimePotentialFullExpression);
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
export declare class GlobalObjectAllocator extends CPPConstruct {
    readonly construct_type = "GlobalObjectAllocator";
    readonly parent?: undefined;
    readonly globalObjects: readonly GlobalVariableDefinition[];
    constructor(context: ProgramContext, globalObjects: readonly GlobalVariableDefinition[]);
    protected onAttach(parent: this["parent"]): void;
    createRuntimeConstruct(this: CompiledGlobalObjectAllocator, sim: Simulation): RuntimeGlobalObjectAllocator;
}
export interface CompiledGlobalObjectAllocator extends GlobalObjectAllocator, SuccessfullyCompiled {
    readonly globalObjects: readonly CompiledGlobalVariableDefinition[];
}
export declare class RuntimeGlobalObjectAllocator extends RuntimeConstruct<CompiledGlobalObjectAllocator> {
    private index;
    constructor(model: CompiledGlobalObjectAllocator, sim: Simulation);
    protected upNextImpl(): void;
    stepForwardImpl(): boolean;
}
