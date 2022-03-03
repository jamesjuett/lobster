import { assert, Mutable } from "../../../../util/util";
import { areSemanticallyEquivalent, SemanticContext, TranslationUnitContext } from "../../../compilation/contexts";
import { areEntitiesSemanticallyEquivalent, VariableEntity } from "../../../compilation/entities";
import { AnalyticConstruct } from "../../../../analysis/predicates";
import { CompleteObjectType, ReferenceType } from "../../../compilation/types";
import { InvalidConstruct } from "../../constructs";
import { Expression } from "../../expressions/Expression";
import { DefaultInitializer } from "../../initializers/DefaultInitializer";
import { DirectInitializer } from "../../initializers/DirectInitializer";
import { Initializer } from "../../initializers/Initializer";
import { ListInitializer } from "../../initializers/ListInitializer";
import { SimpleDeclaration } from "../SimpleDeclaration";



export type VariableDefinitionType = CompleteObjectType | ReferenceType;

export abstract class VariableDefinitionBase<ContextType extends TranslationUnitContext = TranslationUnitContext> extends SimpleDeclaration<ContextType> {

    public readonly initializer?: Initializer;

    public abstract readonly type: VariableDefinitionType;
    public abstract readonly declaredEntity: VariableEntity;

    private setInitializer(init: Initializer) {
        assert(!this.initializer); // should only be called once
        (<Mutable<this>>this).initializer = init;
        this.attach(init);
        this.initializerWasSet(init);
        return this;
    }

    protected initializerWasSet(init: Initializer) {
        // hook for subclasses
    }

    public setDefaultInitializer() {
        return this.setInitializer(DefaultInitializer.create(this.context, this.declaredEntity));
    }

    public setDirectInitializer(args: readonly Expression[]) {
        return this.setInitializer(DirectInitializer.create(this.context, this.declaredEntity, args, "direct"));
    }

    public setCopyInitializer(args: readonly Expression[]) {
        return this.setInitializer(DirectInitializer.create(this.context, this.declaredEntity, args, "copy"));
    }

    public setInitializerList(args: readonly Expression[]) {
        // TODO implement initializer lists
        let init = ListInitializer.create(this.context, this.declaredEntity, args);
        if (init instanceof InvalidConstruct) {
            this.attach(init);
            return;
        }
        return this.setInitializer(init);
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return this.construct_type === other.construct_type && other instanceof VariableDefinitionBase
            && areEntitiesSemanticallyEquivalent(this.declaredEntity, other.declaredEntity, equivalenceContext)
            && areSemanticallyEquivalent(this.initializer, other.initializer, equivalenceContext);
    }

    public entitiesUsed() {
        return [this.declaredEntity];
    }
}


