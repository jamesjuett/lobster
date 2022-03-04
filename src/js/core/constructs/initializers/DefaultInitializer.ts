import { assertFalse, assertNever } from "../../../util/util";
import { ArrayDefaultInitializerOutlet, AtomicDefaultInitializerOutlet, ClassDefaultInitializerOutlet } from "../../../view/constructs/InitializerOutlet";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { TranslationUnitContext } from "../../compilation/contexts";
import { ArraySubobjectEntity, FunctionEntity, ObjectEntity, UnboundReferenceEntity } from "../../compilation/entities";
import { CPPError } from "../../compilation/errors";
import { Simulation } from "../../runtime/Simulation";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { AtomicType, BoundedArrayType, CompleteClassType, CompleteObjectType, FunctionType, VoidType } from "../../compilation/types";
import { RuntimeConstruct, SuccessfullyCompiled } from "../CPPConstruct";
import { overloadResolution } from "../../compilation/overloads";
import { CompiledFunctionCall, FunctionCall, RuntimeFunctionCall } from "../FunctionCall";
import { Initializer, RuntimeInitializer } from "./Initializer";






export abstract class DefaultInitializer extends Initializer {

    public static create(context: TranslationUnitContext, target: UnboundReferenceEntity): ReferenceDefaultInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<AtomicType>): AtomicDefaultInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>): ArrayDefaultInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<CompleteClassType>): ClassDefaultInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<CompleteObjectType>): AtomicDefaultInitializer | ArrayDefaultInitializer | ClassDefaultInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity | UnboundReferenceEntity): ReferenceDefaultInitializer | AtomicDefaultInitializer | ArrayDefaultInitializer | ClassDefaultInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity | UnboundReferenceEntity): DefaultInitializer {
        if (target.type.isReferenceType()) {
            return new ReferenceDefaultInitializer(context, <UnboundReferenceEntity>target);
        }
        else if (target.type.isAtomicType()) {
            return new AtomicDefaultInitializer(context, <ObjectEntity<AtomicType>>target);
        }
        else if (target.type.isBoundedArrayType()) {
            return new ArrayDefaultInitializer(context, <ObjectEntity<BoundedArrayType>>target);
        }
        else if (target.type.isCompleteClassType()) {
            return new ClassDefaultInitializer(context, <ObjectEntity<CompleteClassType>>target);
        }
        else {
            return assertNever(target.type);
        }
    }

    public readonly kind = "default";

    public abstract createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledDefaultInitializer<T>, parent: RuntimeConstruct): RuntimeDefaultInitializer<T>;
}

export interface CompiledDefaultInitializer<T extends CompleteObjectType = CompleteObjectType> extends DefaultInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<T>;
}

export abstract class RuntimeDefaultInitializer<T extends CompleteObjectType = CompleteObjectType, C extends CompiledDefaultInitializer<T> = CompiledDefaultInitializer<T>> extends RuntimeInitializer<C> {

    protected constructor(model: C, parent: RuntimeConstruct) {
        super(model, parent);
    }
}

export class ReferenceDefaultInitializer extends DefaultInitializer {
    public readonly construct_type = "ReferenceDefaultInitializer";

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
// Note: No CompiledReferenceDefaultInitializer or RuntimeReferenceDefaultInitializer classes since
//       default initialization of a reference is always ill-formed.

export class AtomicDefaultInitializer extends DefaultInitializer {
    public readonly construct_type = "AtomicDefaultInitializer";

    public readonly target: ObjectEntity<AtomicType>;

    public constructor(context: TranslationUnitContext, target: ObjectEntity<AtomicType>) {
        super(context, undefined);
        this.target = target;
    }

    public createRuntimeInitializer<T extends AtomicType>(this: CompiledAtomicDefaultInitializer<T>, parent: RuntimeConstruct): RuntimeAtomicDefaultInitializer<T>;
    public createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledDefaultInitializer<T>, parent: RuntimeConstruct): never;
    public createRuntimeInitializer<T extends AtomicType>(this: CompiledAtomicDefaultInitializer<T>, parent: RuntimeConstruct): RuntimeAtomicDefaultInitializer<T> {
        return new RuntimeAtomicDefaultInitializer(this, parent);
    }

    public createDefaultOutlet(this: CompiledAtomicDefaultInitializer, element: JQuery, parent?: ConstructOutlet): AtomicDefaultInitializerOutlet {
        return new AtomicDefaultInitializerOutlet(element, this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.describe();
        return { message: "No initialization will take place. " + (targetDesc.name || targetDesc.message) + " will have a junk value." };
    }
}

export interface CompiledAtomicDefaultInitializer<T extends AtomicType = AtomicType> extends AtomicDefaultInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<T>;
}

export class RuntimeAtomicDefaultInitializer<T extends AtomicType = AtomicType> extends RuntimeDefaultInitializer<T, CompiledAtomicDefaultInitializer<T>> {

    public constructor(model: CompiledAtomicDefaultInitializer<T>, parent: RuntimeConstruct) {
        super(model, parent);
    }

    protected upNextImpl() {
        // No initialization. Object has junk value.
        let target = this.model.target.runtimeLookup(this);
        target.beginLifetime();
        this.observable.send("atomicObjectInitialized", this);
        this.startCleanup();
    }

    public stepForwardImpl() {
        // do nothing
    }
}

export class ArrayDefaultInitializer extends DefaultInitializer {
    public readonly construct_type = "ArrayDefaultInitializer";

    public readonly target: ObjectEntity<BoundedArrayType>;
    public readonly elementInitializers?: DefaultInitializer[];

    public constructor(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>) {
        super(context, undefined);

        this.target = target;

        // If it's an array of atomic types, do nothing.
        let type = this.target.type;
        if (type.elemType instanceof AtomicType) {
            // Do nothing
            // TODO: should I create the DefaultInitializers anyway for analysis purposes?
        }
        else {
            this.elementInitializers = [];
            for (let i = 0; i < type.numElems; ++i) {
                let elemInit = DefaultInitializer.create(context, new ArraySubobjectEntity(this.target, i));
                this.elementInitializers.push(elemInit);
                this.attach(elemInit);
                if (elemInit.notes.hasErrors) {
                    this.addNote(CPPError.declaration.init.array_default_init(this));
                    break;
                }
            }
        }

    }

    public createRuntimeInitializer<T extends BoundedArrayType>(this: CompiledArrayDefaultInitializer<T>, parent: RuntimeConstruct): RuntimeArrayDefaultInitializer<T>;
    public createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledDefaultInitializer<T>, parent: RuntimeConstruct): never;
    public createRuntimeInitializer<T extends BoundedArrayType>(this: CompiledArrayDefaultInitializer<T>, parent: RuntimeConstruct): RuntimeArrayDefaultInitializer<T> {
        return new RuntimeArrayDefaultInitializer(this, parent);
    }

    public createDefaultOutlet(this: CompiledArrayDefaultInitializer, element: JQuery, parent?: ConstructOutlet): ArrayDefaultInitializerOutlet {
        return new ArrayDefaultInitializerOutlet(element, this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.describe();
        let targetType = this.target.type;

        if (targetType.numElems === 0) {
            return { message: "No initialization is performed for " + (targetDesc.name || targetDesc.message) + "because the array has length 0." };
        }
        else if (targetType.elemType instanceof AtomicType) {
            return { message: "No initialization will take place. The elements of " + (targetDesc.name || targetDesc.message) + " will have junk values." };
        }
        else {
            return {
                message: "Each element of " + (targetDesc.name || targetDesc.message) + " will be default-initialized. For example, " +
                    this.elementInitializers![0].explain(sim, rtConstruct)
            };
        }
    }

}

export interface CompiledArrayDefaultInitializer<T extends BoundedArrayType = BoundedArrayType> extends ArrayDefaultInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<T>;
    readonly elementInitializers?: CompiledDefaultInitializer<T["elemType"]>[];
}

export class RuntimeArrayDefaultInitializer<T extends BoundedArrayType = BoundedArrayType> extends RuntimeDefaultInitializer<T, CompiledArrayDefaultInitializer<T>> {

    public readonly elementInitializers?: RuntimeDefaultInitializer<T["elemType"]>[];

    private index = 0;

    public constructor(model: CompiledArrayDefaultInitializer<T>, parent: RuntimeConstruct) {
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


export class ClassDefaultInitializer extends DefaultInitializer {
    public readonly construct_type = "ClassDefaultInitializer";

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

    public createRuntimeInitializer<T extends CompleteClassType>(this: CompiledClassDefaultInitializer<T>, parent: RuntimeConstruct): RuntimeClassDefaultInitializer<T>;
    public createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledDefaultInitializer<T>, parent: RuntimeConstruct): never;
    public createRuntimeInitializer<T extends CompleteClassType>(this: CompiledClassDefaultInitializer<T>, parent: RuntimeConstruct): RuntimeClassDefaultInitializer<T> {
        return new RuntimeClassDefaultInitializer(this, parent);
    }

    public createDefaultOutlet(this: CompiledClassDefaultInitializer, element: JQuery, parent?: ConstructOutlet): ClassDefaultInitializerOutlet {
        return new ClassDefaultInitializerOutlet(element, this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.describe();
        // TODO: what if there is an error that causes no ctor to be found/available
        return { message: (targetDesc.name || targetDesc.message) + " will be initialized using " + this.ctorCall!.describe(sim, rtConstruct).message };
    }
}

export interface CompiledClassDefaultInitializer<T extends CompleteClassType = CompleteClassType> extends ClassDefaultInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly target: ObjectEntity<T>;
    readonly ctor: FunctionEntity<FunctionType<VoidType>>;
    readonly ctorCall: CompiledFunctionCall<FunctionType<VoidType>>;
}

export class RuntimeClassDefaultInitializer<T extends CompleteClassType = CompleteClassType> extends RuntimeDefaultInitializer<T, CompiledClassDefaultInitializer<T>> {

    public readonly ctorCall: RuntimeFunctionCall<FunctionType<VoidType>>;

    private index = "callCtor";

    public constructor(model: CompiledClassDefaultInitializer<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.ctorCall = this.model.ctorCall.createRuntimeFunctionCall(this, this.model.target.runtimeLookup(this));
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
        // do nothing
    }

}
