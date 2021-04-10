import { BasicCPPConstruct, SuccessfullyCompiled, RuntimeConstruct, TranslationUnitContext, BlockContext, SemanticContext } from "./constructs";
import { ASTNode } from "../ast/ASTNode";
import { CompleteClassType, BoundedArrayType } from "./types";
import { ObjectEntity, BoundReferenceEntity, GlobalVariableEntity } from "./entities";
import { CompiledFunctionCall, FunctionCall } from "./FunctionCall";
import { RuntimeBlock, RuntimeForStatement } from "./statements";
import { Simulation } from "./Simulation";
import { AnalyticConstruct } from "./predicates";
export declare abstract class ObjectDeallocator extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    readonly construct_type = "ObjectDeallocator";
    readonly objectTargets: readonly ObjectEntity[];
    readonly referenceTargets: readonly BoundReferenceEntity[];
    /**
     * Contains any constructs responsible for cleanup of compound objects, either
     * a FunctionCall to a destructor, or a deallocator for each of the elements in an array
     */
    readonly compoundCleanupConstructs: readonly (FunctionCall | ObjectDeallocator | undefined)[];
    constructor(context: TranslationUnitContext, targets: readonly (ObjectEntity | BoundReferenceEntity)[]);
    createRuntimeConstruct(this: CompiledObjectDeallocator, parentOrSim: RuntimeConstruct | Simulation): RuntimeObjectDeallocator;
    protected addNoDestructorNote(obj: ObjectEntity<CompleteClassType>): void;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export interface CompiledObjectDeallocator extends ObjectDeallocator, SuccessfullyCompiled {
    readonly compoundCleanupConstructs: readonly (CompiledFunctionCall | CompiledObjectDeallocator | undefined)[];
}
export declare class RuntimeObjectDeallocator extends RuntimeConstruct<CompiledObjectDeallocator> {
    private index?;
    private currentObjectTarget?;
    readonly parent: RuntimeBlock | RuntimeForStatement;
    constructor(model: CompiledObjectDeallocator, parentOrSim: RuntimeConstruct | Simulation);
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
declare class LocalDeallocator extends ObjectDeallocator {
    constructor(context: BlockContext);
    protected addNoDestructorNote(obj: ObjectEntity<CompleteClassType>): void;
}
export declare function createLocalDeallocator(context: BlockContext): LocalDeallocator;
declare class StaticDeallocator extends ObjectDeallocator {
    protected addNoDestructorNote(obj: ObjectEntity<CompleteClassType>): void;
}
export declare function createStaticDeallocator(context: TranslationUnitContext, staticVariables: readonly GlobalVariableEntity[]): StaticDeallocator;
declare class ArrayDeallocator extends ObjectDeallocator {
    private addedDtorNote;
    constructor(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>);
    protected addNoDestructorNote(obj: ObjectEntity<CompleteClassType>): void;
}
export declare function createArrayDeallocator(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>): ArrayDeallocator;
declare class MemberDeallocator extends ObjectDeallocator {
    private addedDtorNote;
    constructor(context: TranslationUnitContext, target: ObjectEntity<CompleteClassType>);
    protected addNoDestructorNote(obj: ObjectEntity<CompleteClassType>): void;
}
export declare function createMemberDeallocator(context: TranslationUnitContext, target: ObjectEntity<CompleteClassType>): MemberDeallocator;
export {};
