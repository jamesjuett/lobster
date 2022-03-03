import { CompiledGlobalVariableDefinition, GlobalVariableDefinition } from "./declarations/variable/GlobalVariableDefinition";
import { AnalyticConstruct } from "./predicates";
import { Simulation } from "./Simulation";
import { ProgramContext, SemanticContext, areAllSemanticallyEquivalent } from "./contexts";
import { CPPConstruct, SuccessfullyCompiled, RuntimeConstruct } from "./constructs";

export class GlobalObjectAllocator extends CPPConstruct {
    public readonly construct_type = "GlobalObjectAllocator";

    public readonly parent?: undefined;
    public readonly globalObjects: readonly GlobalVariableDefinition[];

    public constructor(context: ProgramContext, globalObjects: readonly GlobalVariableDefinition[]) {
        super(context, undefined); // Has no AST
        this.globalObjects = globalObjects;
    }

    protected onAttach(parent: this["parent"]): void {
        throw new Error("Method not implemented.");
    }

    public createRuntimeConstruct(this: CompiledGlobalObjectAllocator, sim: Simulation) {
        return new RuntimeGlobalObjectAllocator(this, sim);
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && areAllSemanticallyEquivalent(this.globalObjects, other.globalObjects, equivalenceContext);
    }

}

export interface CompiledGlobalObjectAllocator extends GlobalObjectAllocator, SuccessfullyCompiled {
    readonly globalObjects: readonly CompiledGlobalVariableDefinition[];
}

export class RuntimeGlobalObjectAllocator extends RuntimeConstruct<CompiledGlobalObjectAllocator> {

    private index = 0;

    public constructor(model: CompiledGlobalObjectAllocator, sim: Simulation) {
        super(model, "statement", sim); // TODO: is "statement" the right stack type here? should I make a new one?
    }

    protected upNextImpl() {

        // let dtors = this.model.dtors;
        if (this.index < this.model.globalObjects.length) {
            let objDef = this.model.globalObjects[this.index];
            this.sim.memory.allocateStatic(objDef);
            if (objDef.initializer) {
                this.sim.push(objDef.initializer.createRuntimeInitializer(this));
            }
            ++this.index;
        }
        else {
            this.startCleanup();
        }
    }

    public stepForwardImpl() {
        return false;
    }
}
