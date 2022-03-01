import {
    BasicCPPConstruct,
    SuccessfullyCompiled,
    RuntimeConstruct,
    TranslationUnitContext,
    BlockContext,
    SemanticContext,
} from "./constructs";
import { ASTNode } from "../ast/ASTNode";
import { CPPError } from "./errors";
import {
    isReferenceToCompleteType,
    isCompleteClassType,
    CompleteClassType,
    isBoundedArrayType,
    BoundedArrayType,
} from "./types";
import {
    LocalObjectEntity,
    ObjectEntity,
    BoundReferenceEntity,
    ArraySubobjectEntity,
    GlobalObjectEntity,
    GlobalVariableEntity,
} from "./entities";
import { assert } from "../util/util";
import { CompiledFunctionCall, FunctionCall } from "./FunctionCall";
import { CPPObject } from "./objects";
import { RuntimeBlock, RuntimeForStatement } from "./statements";
import { Simulation } from "./Simulation";
import { AnalyticConstruct } from "./predicates";

export abstract class ObjectDeallocator extends BasicCPPConstruct<
    TranslationUnitContext,
    ASTNode
> {
    public readonly construct_type = "ObjectDeallocator";

    public readonly objectTargets: readonly ObjectEntity[];
    public readonly referenceTargets: readonly BoundReferenceEntity[];

    /**
     * Contains any constructs responsible for cleanup of compound objects, either
     * a FunctionCall to a destructor, or a deallocator for each of the elements in an array
     */
    public readonly compoundCleanupConstructs: readonly (
        | FunctionCall
        | ObjectDeallocator
        | undefined
    )[];

    public constructor(
        context: TranslationUnitContext,
        targets: readonly (ObjectEntity | BoundReferenceEntity)[]
    ) {
        super(context, undefined); // Has no AST

        this.objectTargets = <ObjectEntity[]>(
            targets.filter((t) => t.variableKind === "object")
        );
        this.referenceTargets = <BoundReferenceEntity[]>(
            targets.filter((t) => t.variableKind === "reference")
        );

        this.compoundCleanupConstructs = this.objectTargets.map((obj) => {
            if (obj.isTyped(isCompleteClassType)) {
                // If it's a class type object, we need to call its destructor
                let dtor = obj.type.classDefinition.destructor;
                if (dtor) {
                    let dtorCall = new FunctionCall(
                        context,
                        dtor,
                        [],
                        obj.type
                    );
                    this.attach(dtorCall);
                    return dtorCall;
                } else {
                    this.addNoDestructorNote(obj);
                    return undefined;
                }
            } else if (obj.isTyped(isBoundedArrayType)) {
                // If it's an array, we recursively need to cleanup the elements
                return createArrayDeallocator(context, obj);
            } else {
                // object doesn't need any special cleanup (e.g. an atomic object)
                return undefined;
            }
        });
    }

    public createRuntimeConstruct(
        this: CompiledObjectDeallocator,
        parentOrSim: RuntimeConstruct | Simulation
    ) {
        return new RuntimeObjectDeallocator(this, parentOrSim);
    }

    protected addNoDestructorNote(obj: ObjectEntity<CompleteClassType>) {
        this.addNote(CPPError.declaration.dtor.no_destructor(this, obj));
    }

    public isSemanticallyEquivalent_impl(
        other: AnalyticConstruct,
        equivalenceContext: SemanticContext
    ): boolean {
        return other.construct_type === this.construct_type;
        // TODO semantic equivalence
    }
}

export interface CompiledObjectDeallocator
    extends ObjectDeallocator,
        SuccessfullyCompiled {
    readonly compoundCleanupConstructs: readonly (
        | CompiledFunctionCall
        | CompiledObjectDeallocator
        | undefined
    )[];
}

export class RuntimeObjectDeallocator extends RuntimeConstruct<CompiledObjectDeallocator> {
    private index?: number;
    private currentObjectTarget?: CPPObject;
    public readonly parent!: RuntimeBlock | RuntimeForStatement; // narrows type from base class

    public constructor(
        model: CompiledObjectDeallocator,
        parentOrSim: RuntimeConstruct | Simulation
    ) {
        super(model, "cleanup", parentOrSim);
    }

    protected upNextImpl() {
        if (this.index === undefined) {
            return;
        }

        // Cleanup previous target that has just finished its destructor
        // or array element cleanup
        if (this.currentObjectTarget?.isAlive) {
            this.sim.memory.killObject(this.currentObjectTarget, this);
        }

        while (this.index > 0) {
            --this.index;

            this.currentObjectTarget =
                this.model.objectTargets[this.index].runtimeLookup(this);

            if (!this.currentObjectTarget.isAlive) {
                // skip any objects that aren't alive (i.e. weren't ever constructed)
                continue;
            }

            let ccc = this.model.compoundCleanupConstructs[this.index];
            if (!ccc) {
                // no compound cleanup construct, just destroy the object
                this.sim.memory.killObject(this.currentObjectTarget, this);
                continue;
            }

            if (ccc?.construct_type === "FunctionCall") {
                // call destructor
                assert(this.currentObjectTarget.isTyped(isCompleteClassType));
                this.sim.push(
                    ccc.createRuntimeFunctionCall(
                        this,
                        this.currentObjectTarget
                    )
                );
                return; // leave so that dtor can run
            } else if (ccc?.construct_type === "ObjectDeallocator") {
                this.sim.push(ccc.createRuntimeConstruct(this));
                return; // leave so that array elem deallocator can run
            }
        }

        // Once we get here, all objects have been cleaned up and we
        // just have references left
        this.model.referenceTargets.forEach((refEntity) => {
            // If the program is running, and this reference was bound
            // to some object, the referred type should have
            // been completed.
            assert(refEntity.isTyped(isReferenceToCompleteType));

            // destroying a reference doesn't really require doing anything,
            // but we notify the referred object this reference has been removed
            refEntity.runtimeLookup(this)?.onReferenceUnbound(refEntity);
        });
        // Require at least one active step before leaving
        this.startCleanup();
    }

    public stepForwardImpl() {
        // Require at least one stepforward before doing anything
        // intentionally 1 too large - gets adjusted in first upNextImpl
        this.index = this.model.objectTargets.length;
    }
}

class LocalDeallocator extends ObjectDeallocator {
    public constructor(context: BlockContext) {
        super(context, context.blockLocals.localVariables);
    }

    protected addNoDestructorNote(obj: ObjectEntity<CompleteClassType>) {
        this.addNote(
            CPPError.declaration.dtor.no_destructor_local(
                this,
                <LocalObjectEntity<CompleteClassType>>obj
            )
        );
    }
}

export function createLocalDeallocator(context: BlockContext) {
    return new LocalDeallocator(context);
}

class StaticDeallocator extends ObjectDeallocator {
    protected addNoDestructorNote(obj: ObjectEntity<CompleteClassType>) {
        this.addNote(
            CPPError.declaration.dtor.no_destructor_static(
                this,
                <GlobalObjectEntity<CompleteClassType>>obj
            )
        );
    }
}

export function createStaticDeallocator(
    context: TranslationUnitContext,
    staticVariables: readonly GlobalVariableEntity[]
) {
    return new StaticDeallocator(context, staticVariables);
}

class ArrayDeallocator extends ObjectDeallocator {
    private addedDtorNote: boolean;

    public constructor(
        context: TranslationUnitContext,
        target: ObjectEntity<BoundedArrayType>
    ) {
        let elems: ArraySubobjectEntity[] = [];
        for (let i = 0; i < target.type.numElems; ++i) {
            elems.push(new ArraySubobjectEntity(target, i));
        }
        super(context, elems);
        this.addedDtorNote = false;
    }

    protected addNoDestructorNote(obj: ObjectEntity<CompleteClassType>) {
        if (!this.addedDtorNote) {
            this.addNote(
                CPPError.declaration.dtor.no_destructor_array(
                    this,
                    <ArraySubobjectEntity<CompleteClassType>>obj
                )
            );
            this.addedDtorNote = true; // only add this note once per array
        }
    }
}

export function createArrayDeallocator(
    context: TranslationUnitContext,
    target: ObjectEntity<BoundedArrayType>
) {
    return new ArrayDeallocator(context, target);
}

class MemberDeallocator extends ObjectDeallocator {
    private addedDtorNote: boolean;

    public constructor(
        context: TranslationUnitContext,
        target: ObjectEntity<CompleteClassType>
    ) {
        let classDef = target.type.classDefinition;
        super(context, classDef.getBaseAndMemberEntities());
        this.addedDtorNote = false;
    }

    protected addNoDestructorNote(obj: ObjectEntity<CompleteClassType>) {
        if (!this.addedDtorNote) {
            this.addNote(
                CPPError.declaration.dtor.no_destructor_array(
                    this,
                    <ArraySubobjectEntity<CompleteClassType>>obj
                )
            );
            this.addedDtorNote = true; // only add this note once per array
        }
    }
}

export function createMemberDeallocator(
    context: TranslationUnitContext,
    target: ObjectEntity<CompleteClassType>
) {
    return new MemberDeallocator(context, target);
}
