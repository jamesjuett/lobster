import { assertFalse, assertNever } from "../../../util/util";
import { ArrayValueInitializerOutlet, AtomicValueInitializerOutlet, ClassValueInitializerOutlet, ConstructOutlet } from "../../../view/codeOutlets";
import { TranslationUnitContext } from "../../compilation/contexts";
import { ArraySubobjectEntity, FunctionEntity, ObjectEntity, UnboundReferenceEntity } from "../../compilation/entities";
import { CPPError } from "../../compilation/errors";
import { CPPObject } from "../../runtime/objects";
import { Value } from "../../runtime/Value";
import { Simulation } from "../../runtime/Simulation";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { AtomicType, BoundedArrayType, CompleteClassType, CompleteObjectType, FunctionType, VoidType } from "../../compilation/types";
import { RuntimeConstruct, SuccessfullyCompiled } from "../constructs";
import { overloadResolution } from "../../compilation/overloads";
import { CompiledFunctionCall, FunctionCall, RuntimeFunctionCall } from "../FunctionCall";
import { Initializer, RuntimeInitializer } from "./Initializer";






export abstract class ValueInitializer extends Initializer {

    public static create(context: TranslationUnitContext, target: UnboundReferenceEntity): ReferenceValueInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<AtomicType>): AtomicValueInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>): ArrayValueInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<CompleteClassType>): ClassValueInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<CompleteObjectType>): AtomicValueInitializer | ArrayValueInitializer | ClassValueInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity | UnboundReferenceEntity): ReferenceValueInitializer | AtomicValueInitializer | ArrayValueInitializer | ClassValueInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity | UnboundReferenceEntity): ValueInitializer {
        if (target.type.isReferenceType()) {
            return new ReferenceValueInitializer(context, <UnboundReferenceEntity>target);
        }
        else if (target.type.isAtomicType()) {
            return new AtomicValueInitializer(context, <ObjectEntity<AtomicType>>target);
        }
        else if (target.type.isBoundedArrayType()) {
            return new ArrayValueInitializer(context, <ObjectEntity<BoundedArrayType>>target);
        }
        else if (target.type.isCompleteClassType()) {
            return new ClassValueInitializer(context, <ObjectEntity<CompleteClassType>>target);
        }
        else {
            return assertNever(target.type);
        }
    }

    public readonly kind = "value";

    public abstract createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledValueInitializer<T>, parent: RuntimeConstruct): RuntimeValueInitializer<T>;
}

export interface CompiledValueInitializer<T extends CompleteObjectType = CompleteObjectType> extends ValueInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<T>;
}

export abstract class RuntimeValueInitializer<T extends CompleteObjectType = CompleteObjectType, C extends CompiledValueInitializer<T> = CompiledValueInitializer<T>> extends RuntimeInitializer<C> {

    protected constructor(model: C, parent: RuntimeConstruct) {
        super(model, parent);
    }
}
// NOTE: NOT POSSIBLE TO VALUE-INITIALIZE A REFERENCE

export class AtomicValueInitializer extends ValueInitializer {
    public readonly construct_type = "AtomicValueInitializer";

    public readonly target: ObjectEntity<AtomicType>;

    public constructor(context: TranslationUnitContext, target: ObjectEntity<AtomicType>) {
        super(context, undefined);
        this.target = target;
    }

    public createRuntimeInitializer<T extends AtomicType>(this: CompiledAtomicValueInitializer<T>, parent: RuntimeConstruct): RuntimeAtomicValueInitializer<T>;
    public createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledValueInitializer<T>, parent: RuntimeConstruct): never;
    public createRuntimeInitializer<T extends AtomicType>(this: CompiledAtomicValueInitializer<T>, parent: RuntimeConstruct): RuntimeAtomicValueInitializer<T> {
        return new RuntimeAtomicValueInitializer(this, parent);
    }

    public createDefaultOutlet(this: CompiledAtomicValueInitializer, element: JQuery, parent?: ConstructOutlet): AtomicValueInitializerOutlet {
        return new AtomicValueInitializerOutlet(element, this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.describe();
        return { message: `${targetDesc.name || targetDesc.message} is "value-initialized" to the equivalent of a 0 value for its type.` };
    }
}

export interface CompiledAtomicValueInitializer<T extends AtomicType = AtomicType> extends AtomicValueInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<T>;
}

export class RuntimeAtomicValueInitializer<T extends AtomicType = AtomicType> extends RuntimeValueInitializer<T, CompiledAtomicValueInitializer<T>> {

    public constructor(model: CompiledAtomicValueInitializer<T>, parent: RuntimeConstruct) {
        super(model, parent);
    }

    protected upNextImpl() {
        // Initialized to equivalent of 0 in target type
        let target = this.model.target.runtimeLookup(this);
        target.initializeValue(new Value(0, target.type));
        this.observable.send("atomicObjectInitialized", this);
        this.startCleanup();
    }

    public stepForwardImpl() {
        // do nothing
    }
}

export class ReferenceValueInitializer extends ValueInitializer {
    public readonly construct_type = "ReferenceValueInitializer";

    public readonly target: UnboundReferenceEntity;

    public constructor(context: TranslationUnitContext, target: UnboundReferenceEntity) {
        super(context, undefined);
        this.target = target;

        // Cannot default initialize a reference
        this.addNote(CPPError.declaration.init.referenceBind(this));
    }

    public createRuntimeInitializer(parent: RuntimeConstruct): never {
        return assertFalse("A default initializer for a reference is not allowed.");
    }

    public createDefaultOutlet(element: JQuery, parent?: ConstructOutlet) {
        return assertFalse("Cannot create an outlet for a reference default initializer, since such an initializer is always ill-formed.");
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.describe();
        return { message: "As a reference, " + (targetDesc.name || targetDesc.message) + " must be bound to something. (It cannot be left un-initialized.)" };
    }
}
// Note: No CompiledReferenceValueInitializer or RuntimeReferenceValueInitializer classes since
//       default initialization of a reference is always ill-formed.

export class ArrayValueInitializer extends ValueInitializer {
    public readonly construct_type = "ArrayValueInitializer";

    public readonly target: ObjectEntity<BoundedArrayType>;
    public readonly elementInitializers?: ValueInitializer[];

    public constructor(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>) {
        super(context, undefined);

        this.target = target;

        // If it's an array of atomic types, do nothing.
        this.elementInitializers = [];
        for (let i = 0; i < target.type.numElems; ++i) {
            let elemInit = ValueInitializer.create(context, new ArraySubobjectEntity(target, i));
            this.elementInitializers.push(elemInit);
            this.attach(elemInit);
            if (elemInit.notes.hasErrors) {
                this.addNote(CPPError.declaration.init.array_value_init(this));
                break;
            }
        }

    }

    public createRuntimeInitializer<T extends BoundedArrayType>(this: CompiledArrayValueInitializer<T>, parent: RuntimeConstruct): RuntimeArrayValueInitializer<T>;
    public createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledValueInitializer<T>, parent: RuntimeConstruct): never;
    public createRuntimeInitializer<T extends BoundedArrayType>(this: CompiledArrayValueInitializer<T>, parent: RuntimeConstruct): RuntimeArrayValueInitializer<T> {
        return new RuntimeArrayValueInitializer(this, parent);
    }

    public createDefaultOutlet(this: CompiledArrayValueInitializer, element: JQuery, parent?: ConstructOutlet): ArrayValueInitializerOutlet {
        return new ArrayValueInitializerOutlet(element, this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.describe();
        let targetType = this.target.type;

        if (targetType.numElems === 0) {
            return { message: "No initialization is performed for " + (targetDesc.name || targetDesc.message) + "because the array has length 0." };
        }
        else if (targetType.elemType instanceof AtomicType) {
            return { message: `The elements of ${targetDesc.name || targetDesc.message} will be "value-initialized" to the equivalent of a 0 value for their type.` };
        }
        else {
            return {
                message: "Each element of " + (targetDesc.name || targetDesc.message) + " will be value-initialized. For example, " +
                    this.elementInitializers![0].explain(sim, rtConstruct)
            };
        }
    }

}

export interface CompiledArrayValueInitializer<T extends BoundedArrayType = BoundedArrayType> extends ArrayValueInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<T>;
    readonly elementInitializers?: CompiledValueInitializer<T["elemType"]>[];
}

export class RuntimeArrayValueInitializer<T extends BoundedArrayType = BoundedArrayType> extends RuntimeValueInitializer<T, CompiledArrayValueInitializer<T>> {

    public readonly elementInitializers?: RuntimeValueInitializer<T["elemType"]>[];

    private index = 0;

    public constructor(model: CompiledArrayValueInitializer<T>, parent: RuntimeConstruct) {
        super(model, parent);
        if (this.model.elementInitializers) {
            this.elementInitializers = this.model.elementInitializers.map((elemInit) => {
                return elemInit.createRuntimeInitializer(this);
            });
        }
    }

    protected upNextImpl() {
        if (this.elementInitializers && this.index < this.elementInitializers.length) {
            this.sim.push(this.elementInitializers[this.index++]);
        }
        else {
            let target = this.model.target.runtimeLookup(this);
            target.beginLifetime();
            this.observable.send("arrayObjectInitialized", this);
            this.startCleanup();
        }
    }

    public stepForwardImpl() {
        // do nothing
    }

}


export class ClassValueInitializer extends ValueInitializer {
    public readonly construct_type = "ClassValueInitializer";

    public readonly target: ObjectEntity<CompleteClassType>;
    public readonly ctor?: FunctionEntity<FunctionType<VoidType>>;
    public readonly ctorCall?: FunctionCall;

    public constructor(context: TranslationUnitContext, target: ObjectEntity<CompleteClassType>) {
        super(context, undefined);

        this.target = target;

        // Try to find default constructor. Not using lookup because constructors have no name.
        // TODO: do I need to tell overloadResolution what the receiver type is here? they're all ctors i guess
        let overloadResult = overloadResolution(target.type.classDefinition.constructors, []);
        if (!overloadResult.selected) {
            this.addNote(CPPError.declaration.init.no_default_constructor(this, this.target));
            return;
        }

        this.ctor = overloadResult.selected;

        this.ctorCall = new FunctionCall(context, this.ctor, [], target.type.cvUnqualified());
        this.attach(this.ctorCall);
        // this.args = this.ctorCall.args;
    }

    public createRuntimeInitializer<T extends CompleteClassType>(this: CompiledClassValueInitializer<T>, parent: RuntimeConstruct): RuntimeClassValueInitializer<T>;
    public createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledValueInitializer<T>, parent: RuntimeConstruct): never;
    public createRuntimeInitializer<T extends CompleteClassType>(this: CompiledClassValueInitializer<T>, parent: RuntimeConstruct): RuntimeClassValueInitializer<T> {
        return new RuntimeClassValueInitializer(this, parent);
    }

    public createDefaultOutlet(this: CompiledClassValueInitializer, element: JQuery, parent?: ConstructOutlet): ClassValueInitializerOutlet {
        return new ClassValueInitializerOutlet(element, this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.describe();
        // TODO: what if there is an error that causes no ctor to be found/available
        if (!this.ctor) {
            return { message: (targetDesc.name || targetDesc.message) + " cannot be initialized because the " + this.target.type + " class has no default constructor." };
        }
        else if (this.ctor.isImplicit) {
            return { message: (targetDesc.name || targetDesc.message) + " will be zero-initialized, followed by initialization using " + this.ctorCall!.describe(sim, rtConstruct).message };
        }
        else {
            return { message: (targetDesc.name || targetDesc.message) + " will be initialized using " + this.ctorCall!.describe(sim, rtConstruct).message };
        }
    }
}

export interface CompiledClassValueInitializer<T extends CompleteClassType = CompleteClassType> extends ClassValueInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly target: ObjectEntity<T>;
    readonly ctor: FunctionEntity<FunctionType<VoidType>>;
    readonly ctorCall: CompiledFunctionCall<FunctionType<VoidType>>;
}

export class RuntimeClassValueInitializer<T extends CompleteClassType = CompleteClassType> extends RuntimeValueInitializer<T, CompiledClassValueInitializer<T>> {

    public readonly ctorCall: RuntimeFunctionCall<FunctionType<VoidType>>;

    private index;
    public readonly target: CPPObject<T>;

    public constructor(model: CompiledClassValueInitializer<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.target = this.model.target.runtimeLookup(this);
        this.ctorCall = this.model.ctorCall.createRuntimeFunctionCall(this, this.target);
        this.index = this.model.ctor.isImplicit ? "zeroOut" : "callCtor";
    }

    protected upNextImpl() {
        if (this.index === "callCtor") {
            this.sim.push(this.ctorCall);
            this.index = "done";
        }
        else {
            let target = this.model.target.runtimeLookup(this);
            target.beginLifetime();
            this.observable.send("classObjectInitialized", this);
            this.startCleanup();
        }
    }

    public stepForwardImpl() {
        if (this.index === "zeroOut") {
            this.target.zeroInitialize();
            this.index = "callCtor";
        }
    }

}
