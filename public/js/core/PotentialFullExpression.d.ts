import { TemporaryObjectEntity } from "./entities";
import { CompleteObjectType } from "./types";
import { TemporaryObject } from "./objects";
import { TranslationUnitContext, ASTNode, BasicCPPConstruct, TemporaryDeallocator, SuccessfullyCompiled, CompiledTemporaryDeallocator, RuntimeConstruct, RuntimeTemporaryDeallocator, StackType, CPPConstruct } from "./constructs";
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
