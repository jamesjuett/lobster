import { Program, TranslationUnit, SourceReference } from "./Program";
import { Scope, FunctionEntity, LocalObjectEntity, LocalVariableEntity, LocalReferenceEntity, BlockScope, ClassEntity, ClassScope, CompleteClassEntity, CPPEntity } from "./entities";
import { Note, NoteRecorder } from "./errors";
import { Simulation } from "./Simulation";
import { Observable } from "../util/observe";
import { AtomicType, CompleteClassType, ExpressionType } from "./types";
import { GlobalVariableDefinition, CompiledGlobalVariableDefinition } from "./declarations";
import { RuntimeFunction } from "./functions";
import { CPPObject } from "./objects";
import { ASTNode } from "../ast/ASTNode";
import { AccessSpecifier } from "../ast/ast_declarations";
import { AnalyticConstruct } from "./predicates";
export interface ConstructDescription {
    name?: string;
    message: string;
}
export interface Explanation {
    message: string;
}
export declare const EMPTY_SOURCE: {
    line: number;
    column: number;
    start: number;
    end: number;
    text: string;
};
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
    readonly containingClass?: ClassEntity;
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
    readonly functionLocals: ContextualLocals;
    readonly contextualReceiverType?: CompleteClassType;
}
export declare function isFunctionContext(context: TranslationUnitContext): context is FunctionContext;
export declare function createFunctionContext(parentContext: TranslationUnitContext, containingFunction: FunctionEntity, contextualReceiverType: CompleteClassType): MemberFunctionContext;
export declare function createFunctionContext(parentContext: TranslationUnitContext, containingFunction: FunctionEntity, contextualReceiverType?: CompleteClassType): FunctionContext;
export declare function isMemberFunctionContext(context: TranslationUnitContext): context is MemberFunctionContext;
export interface MemberFunctionContext extends FunctionContext {
    readonly contextualReceiverType: CompleteClassType;
}
export interface BlockContext extends FunctionContext {
    readonly contextualScope: BlockScope;
    readonly blockLocals: ContextualLocals;
    readonly withinLoop?: true;
}
export declare function createBlockContext(parentContext: FunctionContext, sharedScope?: BlockScope): BlockContext;
export declare function isMemberBlockContext(context: BlockContext): context is MemberBlockContext;
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
    readonly baseClass?: CompleteClassEntity;
    readonly containingClass: ClassEntity;
    readonly templateType?: AtomicType;
}
export declare function createClassContext(parentContext: TranslationUnitContext, classEntity: ClassEntity, baseClass?: CompleteClassEntity, templateType?: AtomicType): ClassContext;
export declare function isMemberSpecificationContext(context: TranslationUnitContext): context is MemberSpecificationContext;
export declare function createOutOfLineFunctionDefinitionContext(declarationContext: MemberSpecificationContext, newParent: TranslationUnitContext): MemberSpecificationContext & {
    contextualScope: any;
    translationUnit: TranslationUnit;
};
export interface MemberSpecificationContext extends ClassContext {
    readonly accessLevel: AccessSpecifier;
}
export declare function createMemberSpecificationContext(classContext: ClassContext, accessLevel: AccessSpecifier): MemberSpecificationContext;
export declare type SemanticContext = {};
export declare function areAllSemanticallyEquivalent(constructs: readonly CPPConstruct[], others: readonly CPPConstruct[], equivalenceContext: SemanticContext): boolean;
export declare function isAnythingConstruct(construct: CPPConstruct | undefined): boolean;
export declare function areSemanticallyEquivalent(construct: CPPConstruct | undefined, other: CPPConstruct | undefined, equivalenceContext: SemanticContext): boolean;
export declare abstract class CPPConstruct<ContextType extends ProgramContext = ProgramContext, ASTType extends ASTNode = ASTNode> {
    abstract readonly construct_type: string;
    readonly t_analytic: AnalyticConstruct;
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
    isSemanticallyEquivalent(other: CPPConstruct, equivalenceContext: SemanticContext): boolean;
    abstract isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
    areChildrenSemanticallyEquivalent(other: CPPConstruct, equivalenceContext: SemanticContext): boolean;
    entitiesUsed(): CPPEntity[];
}
export interface SuccessfullyCompiled {
    readonly _t_isCompiled: never;
}
export interface CompiledConstruct extends CPPConstruct, SuccessfullyCompiled {
}
export declare type TranslationUnitConstruct<ASTType extends ASTNode = ASTNode> = CPPConstruct<TranslationUnitContext, ASTType>;
export declare type StackType = "statement" | "expression" | "function" | "initializer" | "call" | "ctor-initializer" | "cleanup";
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
    setCleanupConstruct(cleanupConstruct: RuntimeConstruct): void;
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
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export declare class ContextualLocals {
    readonly localVariables: readonly LocalVariableEntity[];
    readonly localObjects: readonly LocalObjectEntity[];
    readonly localReferences: readonly LocalReferenceEntity[];
    readonly localVariablesByEntityId: {
        [index: number]: LocalVariableEntity;
    };
    registerLocalVariable(local: LocalVariableEntity): void;
}
export declare class GlobalObjectAllocator extends CPPConstruct {
    readonly construct_type = "GlobalObjectAllocator";
    readonly parent?: undefined;
    readonly globalObjects: readonly GlobalVariableDefinition[];
    constructor(context: ProgramContext, globalObjects: readonly GlobalVariableDefinition[]);
    protected onAttach(parent: this["parent"]): void;
    createRuntimeConstruct(this: CompiledGlobalObjectAllocator, sim: Simulation): RuntimeGlobalObjectAllocator;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
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
