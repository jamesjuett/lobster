import { TemporaryObjectEntity } from "./entities";
import { assert } from "../util/util";
import { CompleteClassType, isCompleteClassType } from "./types";
import { TemporaryObject } from "./objects";
import { TranslationUnitContext, SemanticContext } from "./contexts";
import { BasicCPPConstruct, SuccessfullyCompiled, RuntimeConstruct } from "./constructs";
import { ASTNode } from "../ast/ASTNode";
import { CPPError } from "./errors";
import { FunctionCall, CompiledFunctionCall } from "./FunctionCall";
import { AnalyticConstruct } from "./predicates";
import { PotentialFullExpression, RuntimePotentialFullExpression } from "./PotentialFullExpression";



export class TemporaryDeallocator extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    public readonly construct_type = "TemporaryDeallocator";

    public readonly parent?: PotentialFullExpression;
    public readonly temporaryObjects: TemporaryObjectEntity[];

    public readonly dtors: (FunctionCall | undefined)[];

    public constructor(context: TranslationUnitContext, temporaryObjects: TemporaryObjectEntity[]) {
        super(context, undefined); // Has no AST
        this.temporaryObjects = temporaryObjects;

        this.dtors = temporaryObjects.map((temp) => {
            if (temp.isTyped(isCompleteClassType)) {
                let dtor = temp.type.classDefinition.destructor;
                if (dtor) {
                    let dtorCall = new FunctionCall(context, dtor, [], temp.type);
                    this.attach(dtorCall);
                    return dtorCall;
                }
                else {
                    this.addNote(CPPError.declaration.dtor.no_destructor_temporary(temp.owner, temp));
                }
            }
            return undefined;
        });
    }

    public createRuntimeConstruct(this: CompiledTemporaryDeallocator, parent: RuntimePotentialFullExpression) {
        return new RuntimeTemporaryDeallocator(this, parent);
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type;
        // TODO semantic equivalence
    }
}

export interface CompiledTemporaryDeallocator extends TemporaryDeallocator, SuccessfullyCompiled {

    readonly dtors: (CompiledFunctionCall | undefined)[];

}

export class RuntimeTemporaryDeallocator extends RuntimeConstruct<CompiledTemporaryDeallocator> {

    private index = 0;
    private justDestructed: TemporaryObject<CompleteClassType> | undefined = undefined;
    public readonly parent!: RuntimePotentialFullExpression; // narrows type from base class

    public constructor(model: CompiledTemporaryDeallocator, parent: RuntimePotentialFullExpression) {
        super(model, "expression", parent);
    }

    protected upNextImpl() {

        let tempObjects = this.model.temporaryObjects;

        if (this.justDestructed) {
            this.sim.memory.killObject(this.justDestructed, this);
            this.justDestructed = undefined;
        }

        while (this.index < tempObjects.length) {
            // Destroy temp at given index
            let temp = tempObjects[this.index];
            let dtor = this.model.dtors[this.index];
            ++this.index;

            if (temp.isTyped(isCompleteClassType)) {
                // a temp class-type object, so we call the dtor
                assert(dtor);
                let obj = temp.runtimeLookup(this.parent);
                if (!obj) {
                    // some obscure cases (e.g. non-evaluated operand of ternary operator)
                    // where the temporary object might not ever have been allocated
                    continue;
                }
                this.sim.push(dtor.createRuntimeFunctionCall(this, obj));

                // need to destroy the object once dtor is done, so we keep track of it here
                this.justDestructed = obj;

                // return so that the dtor, which is now on top of the stack, can run instead
                return;
            }
            else {
                let obj = temp.runtimeLookup(this.parent);
                if (!obj) {
                    // some obscure cases (e.g. non-evaluated operand of ternary operator)
                    // where the temporary object might not ever have been allocated
                    return;
                }
                // a temp non-class-type object, no dtor needed.
                this.sim.memory.deallocateTemporaryObject(obj, this);
            }
        }

        this.startCleanup();
    }

    public stepForwardImpl() {
    }
}
