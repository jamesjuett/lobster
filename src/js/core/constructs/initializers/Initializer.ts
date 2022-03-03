import { ConstructOutlet, InitializerOutlet } from "../../../view/codeOutlets";
import { areAllSemanticallyEquivalent, SemanticContext } from "../../compilation/contexts";
import { areEntitiesSemanticallyEquivalent, NewArrayEntity, ObjectEntity, ObjectEntityType, UnboundReferenceEntity } from "../../compilation/entities";
import { AnalyticConstruct } from "../../predicates";
import { CompiledTemporaryDeallocator } from "../../TemporaryDeallocator";
import { ReferenceType } from "../../types";
import { CPPConstruct, RuntimeConstruct, SuccessfullyCompiled } from "../constructs";
import { PotentialFullExpression, RuntimePotentialFullExpression } from "../PotentialFullExpression";
import { DirectInitializerKind } from "./DirectInitializer";

export type InitializerKind = "default" | "value" | DirectInitializerKind | "list";

export abstract class Initializer extends PotentialFullExpression {

    public abstract readonly target: NewArrayEntity | ObjectEntity | UnboundReferenceEntity;

    public abstract createRuntimeInitializer(parent: RuntimeConstruct): RuntimeInitializer;

    public abstract createDefaultOutlet(this: CompiledInitializer, element: JQuery, parent?: ConstructOutlet): InitializerOutlet;

    public isTailChild(child: CPPConstruct) {
        return { isTail: true };
    }

    public abstract readonly kind: InitializerKind;

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && areEntitiesSemanticallyEquivalent(this.target, (<Initializer>other).target, equivalenceContext)
            && areAllSemanticallyEquivalent(this.children, other.children, equivalenceContext);
        // TODO semantic equivalence
    }
}

export interface CompiledInitializer<T extends ObjectEntityType = ObjectEntityType> extends Initializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<Exclude<T, ReferenceType>> | UnboundReferenceEntity<Extract<T, ReferenceType>>;
}

export abstract class RuntimeInitializer<C extends CompiledInitializer = CompiledInitializer> extends RuntimePotentialFullExpression<C> {

    protected constructor(model: C, parent: RuntimeConstruct) {
        super(model, "initializer", parent);
    }

}













