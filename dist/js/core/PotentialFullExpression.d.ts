import { TemporaryObjectEntity } from "./entities";
import { CompleteObjectType } from "./types";
import { TemporaryObject } from "./objects";
import { TranslationUnitContext, BasicCPPConstruct, SuccessfullyCompiled, RuntimeConstruct, StackType, CPPConstruct, SemanticContext } from "./constructs";
import { ASTNode } from "../ast/ASTNode";
import { FunctionCall, CompiledFunctionCall } from "./FunctionCall";
import { AnalyticConstruct } from "./predicates";
export declare abstract class PotentialFullExpression<ContextType extends TranslationUnitContext = TranslationUnitContext, ASTType extends ASTNode = ASTNode> extends BasicCPPConstruct<ContextType, ASTType> {
    readonly temporaryObjects: TemporaryObjectEntity[];
    readonly temporaryDeallocator?: TemporaryDeallocator;
    onAttach(parent: CPPConstruct): void;
    isFullExpression(): boolean;
    /**
     * Returns the nearest full expression containing this expression (possibly itself).
     * @param inst
     */
    findFullExpression(): PotentialFullExpression;
    private addTemporaryObject;
    createTemporaryObject<T extends CompleteObjectType>(type: T, name: string): TemporaryObjectEntity<T>;
}
export interface CompiledPotentialFullExpression extends PotentialFullExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
}
export declare abstract class RuntimePotentialFullExpression<C extends CompiledPotentialFullExpression = CompiledPotentialFullExpression> extends RuntimeConstruct<C> {
    readonly temporaryDeallocator?: RuntimeTemporaryDeallocator;
    readonly temporaryObjects: {
        [index: number]: TemporaryObject | undefined;
    };
    readonly containingFullExpression: RuntimePotentialFullExpression;
    constructor(model: C, stackType: StackType, parent: RuntimeConstruct);
    private findFullExpression;
}
export declare class TemporaryDeallocator extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    readonly construct_type = "TemporaryDeallocator";
    readonly parent?: PotentialFullExpression;
    readonly temporaryObjects: TemporaryObjectEntity[];
    readonly dtors: (FunctionCall | undefined)[];
    constructor(context: TranslationUnitContext, temporaryObjects: TemporaryObjectEntity[]);
    createRuntimeConstruct(this: CompiledTemporaryDeallocator, parent: RuntimePotentialFullExpression): RuntimeTemporaryDeallocator;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export interface CompiledTemporaryDeallocator extends TemporaryDeallocator, SuccessfullyCompiled {
    readonly dtors: (CompiledFunctionCall | undefined)[];
}
export declare class RuntimeTemporaryDeallocator extends RuntimeConstruct<CompiledTemporaryDeallocator> {
    private index;
    private justDestructed;
    readonly parent: RuntimePotentialFullExpression;
    constructor(model: CompiledTemporaryDeallocator, parent: RuntimePotentialFullExpression);
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
