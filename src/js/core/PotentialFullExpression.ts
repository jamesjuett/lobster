import { TemporaryObjectEntity } from "./entities";
import { Mutable, assertFalse, assert } from "../util/util";
import { CompleteClassType, CompleteObjectType, isCompleteClassType } from "./types";
import { TemporaryObject } from "./objects";
import { TranslationUnitContext, BasicCPPConstruct, SuccessfullyCompiled, RuntimeConstruct, StackType, CPPConstruct, SemanticContext } from "./constructs";
import { ASTNode } from "../ast/ASTNode";
import { CPPError } from "./errors";
import { FunctionCall, CompiledFunctionCall } from "./FunctionCall";
import { AnalyticConstruct } from "./predicates";

export abstract class PotentialFullExpression<ContextType extends TranslationUnitContext = TranslationUnitContext, ASTType extends ASTNode = ASTNode> extends BasicCPPConstruct<ContextType, ASTType> {
    public readonly temporaryObjects: TemporaryObjectEntity[] = [];
    public readonly temporaryDeallocator?: TemporaryDeallocator;
    public onAttach(parent: CPPConstruct) {
        (<Mutable<this>>this).parent = parent;
        // This may no longer be a full expression. If so, move temporary entities to
        // their new full expression.
        if (!this.isFullExpression()) {
            let fe = this.findFullExpression();
            this.temporaryObjects.forEach((tempEnt) => {
                fe.addTemporaryObject(tempEnt);
            });
            this.temporaryObjects.length = 0; // clear array
        }
        // Now that we are attached, the assumption is no more temporary entities
        // will be added to this construct or its attached children. (There's an
        // assert in addTemporaryObject() to prevent this.) That means it is now
        // safe to compile and add the temporary deallocator construct as a child.
        if (this.temporaryObjects.length > 0) {
            (<TemporaryDeallocator>this.temporaryDeallocator) = new TemporaryDeallocator(this.context, this.temporaryObjects);
            this.attach(this.temporaryDeallocator!);
        }
    }
    public isFullExpression(): boolean {
        return !this.parent || !(this.parent instanceof PotentialFullExpression);
    }
    // TODO: this function can probably be cleaned up so that it doesn't require these ugly runtime checks
    /**
     * Returns the nearest full expression containing this expression (possibly itself).
     * @param inst
     */
    public findFullExpression(): PotentialFullExpression {
        if (this.isFullExpression()) {
            return this;
        }
        if (!this.parent || !(this.parent instanceof PotentialFullExpression)) {
            return assertFalse("failed to find full expression for " + this);
        }
        return this.parent.findFullExpression();
    }
    private addTemporaryObject(tempObjEnt: TemporaryObjectEntity) {
        assert(!this.parent, "Temporary objects may not be added to a full expression after it has been attached.");
        this.temporaryObjects.push(tempObjEnt);
        tempObjEnt.setOwner(this);
    }
    public createTemporaryObject<T extends CompleteObjectType>(type: T, name: string): TemporaryObjectEntity<T> {
        let fe = this.findFullExpression();
        var tempObjEnt = new TemporaryObjectEntity(type, this, fe, name);
        this.temporaryObjects[tempObjEnt.entityId] = tempObjEnt;
        return tempObjEnt;
    }
}

export interface CompiledPotentialFullExpression extends PotentialFullExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
}

export abstract class RuntimePotentialFullExpression<C extends CompiledPotentialFullExpression = CompiledPotentialFullExpression> extends RuntimeConstruct<C> {
    public readonly temporaryDeallocator?: RuntimeTemporaryDeallocator;

    public readonly temporaryObjects: {
        [index: number]: TemporaryObject | undefined;
    } = {};

    public readonly containingFullExpression: RuntimePotentialFullExpression;

    public constructor(model: C, stackType: StackType, parent: RuntimeConstruct) {
        super(model, stackType, parent);
        if (this.model.temporaryDeallocator) {
            this.temporaryDeallocator = this.model.temporaryDeallocator.createRuntimeConstruct(this);
            this.setCleanupConstruct(this.temporaryDeallocator);
        }
        this.containingFullExpression = this.findFullExpression();
    }
    
    private findFullExpression(): RuntimePotentialFullExpression {
        let rt: RuntimeConstruct = this;
        while (rt instanceof RuntimePotentialFullExpression && !rt.model.isFullExpression() && rt.parent) {
            rt = rt.parent;
        }
        if (rt instanceof RuntimePotentialFullExpression) {
            return rt;
        }
        else {
            return assertFalse();
        }
    }
}


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
                else{
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

        while(this.index < tempObjects.length) {
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






