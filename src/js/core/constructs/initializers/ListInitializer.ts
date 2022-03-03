import { assertNever } from "../../../util/util";
import { ArrayAggregateInitializerOutlet, ConstructOutlet } from "../../../view/codeOutlets";
import { TranslationUnitContext } from "../../compilation/contexts";
import { ArraySubobjectEntity, ObjectEntity, ObjectEntityType, UnboundReferenceEntity } from "../../compilation/entities";
import { CPPError } from "../../compilation/errors";
import { Simulation } from "../../runtime/Simulation";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { AtomicType, BoundedArrayType, CompleteClassType, CompleteObjectType, ReferenceType } from "../../compilation/types";
import { InvalidConstruct, RuntimeConstruct, SuccessfullyCompiled } from "../constructs";
import { CompiledExpression, Expression } from "../expressions/Expression";
import { InitializerListExpression } from "../expressions/InitializerListExpression";
import { ClassDirectInitializer, CompiledDirectInitializer, DirectInitializer, RuntimeDirectInitializer } from "./DirectInitializer";
import { Initializer, RuntimeInitializer } from "./Initializer";
import { CompiledValueInitializer, RuntimeValueInitializer, ValueInitializer } from "./ValueInitializer";














export abstract class ListInitializer extends Initializer {

    public static create(context: TranslationUnitContext, target: UnboundReferenceEntity, args: readonly Expression[]): InvalidConstruct;
    public static create(context: TranslationUnitContext, target: ObjectEntity<AtomicType>, args: readonly Expression[]): InvalidConstruct;
    public static create(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>, args: readonly Expression[]): InvalidConstruct; //ArrayListInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<CompleteClassType>, args: readonly Expression[]): ClassDirectInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity, args: readonly Expression[]): ClassDirectInitializer | InvalidConstruct;
    public static create(context: TranslationUnitContext, target: ObjectEntity | UnboundReferenceEntity, args: readonly Expression[]): ClassDirectInitializer | InvalidConstruct;
    public static create(context: TranslationUnitContext, target: ObjectEntity | UnboundReferenceEntity, args: readonly Expression[]): ListInitializer | InvalidConstruct {
        if (target.type.isReferenceType()) { // check for presence of bindTo to detect reference entities
            return new InvalidConstruct(context, undefined, CPPError.declaration.init.list_reference_prohibited, args);
        }
        else if (target.type.isAtomicType()) {
            return new InvalidConstruct(context, undefined, CPPError.declaration.init.list_atomic_prohibited, args);
        }
        else if (target.type.isBoundedArrayType()) {
            return new ArrayAggregateInitializer(context, <ObjectEntity<BoundedArrayType>>target, args);
        }
        else if (target.type.isCompleteClassType()) {
            if (target.type.isAggregate()) {
                return new InvalidConstruct(context, undefined, CPPError.declaration.init.aggregate_unsupported, args);
            }

            let initializerList = new InitializerListExpression(context, undefined, args);
            return new ClassDirectInitializer(context, <ObjectEntity<CompleteClassType>>target, [initializerList], "direct");
        }
        else {
            return assertNever(target.type);
        }
    }

    public abstract readonly target: ObjectEntity | UnboundReferenceEntity;
    public abstract readonly args: readonly Expression[];

    public constructor(context: TranslationUnitContext) {
        super(context, undefined);
    }

    public abstract createRuntimeInitializer<T extends ObjectEntityType>(this: CompiledListInitializer<T>, parent: RuntimeConstruct): RuntimeListInitializer<T>;
}


export interface CompiledListInitializer<T extends ObjectEntityType = ObjectEntityType> extends ListInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<Exclude<T, ReferenceType>> | UnboundReferenceEntity<Extract<T, ReferenceType>>;
    readonly args: readonly CompiledExpression[];
}

export abstract class RuntimeListInitializer<T extends ObjectEntityType = ObjectEntityType, C extends CompiledListInitializer<T> = CompiledListInitializer<T>> extends RuntimeInitializer<C> {

    protected constructor(model: C, parent: RuntimeConstruct) {
        super(model, parent);
    }

}



export class ArrayAggregateInitializer extends ListInitializer {
    public readonly construct_type = "ArrayAggregateInitializer";

    public readonly kind = "list";

    public readonly target: ObjectEntity<BoundedArrayType>;
    public readonly args: readonly Expression[];

    public readonly elemInitializers: readonly (DirectInitializer | ValueInitializer)[];
    public readonly explicitElemInitializers: readonly DirectInitializer[];
    public readonly implicitElemInitializers: readonly ValueInitializer[];

    public constructor(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>, args: readonly Expression[]) {
        super(context);

        this.target = target;
        let arraySize = target.type.numElems;

        if (args.length > arraySize) {
            // TODO: this seems like a weird error to give. why not something more specific?
            this.addNote(CPPError.param.numParams(this));
            // No need to bail out, though. We can still generate initializers
            // for all of the arguments that do correspond to an in-bounds element.
        }

        // Note that the args are NOT attached as children to the array aggregate initializer.
        // Instead, they are attached to the initializers.
        // Create initializers for each explicitly-initialized element
        this.explicitElemInitializers = args.map((arg, i) => DirectInitializer.create(context, new ArraySubobjectEntity(target, i), [arg], "copy"));

        let remainingElemInits: ValueInitializer[] = [];
        for (let i = args.length; i < arraySize; ++i) {
            remainingElemInits.push(ValueInitializer.create(context, new ArraySubobjectEntity(target, i)));
        }
        this.implicitElemInitializers = remainingElemInits;

        this.elemInitializers = [];
        this.elemInitializers = this.elemInitializers.concat(this.explicitElemInitializers, this.implicitElemInitializers);
        this.attachAll(this.elemInitializers);

        // An array with all the final arguments (after conversions) for the explicitly-initialized array elements
        this.args = this.explicitElemInitializers.map(elemInit => elemInit.args[0]);
    }

    public createRuntimeInitializer<T extends BoundedArrayType>(this: CompiledArrayAggregateInitializer<T>, parent: RuntimeConstruct): RuntimeArrayAggregateInitializer<T>;
    public createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledListInitializer<T>, parent: RuntimeConstruct): never;
    public createRuntimeInitializer<T extends BoundedArrayType>(this: CompiledArrayAggregateInitializer<T>, parent: RuntimeConstruct): RuntimeArrayAggregateInitializer<T> {
        return new RuntimeArrayAggregateInitializer(this, parent);
    }

    public createDefaultOutlet(this: CompiledArrayAggregateInitializer, element: JQuery, parent?: ConstructOutlet): ArrayAggregateInitializerOutlet {
        return new ArrayAggregateInitializerOutlet(element, this, parent);
    }

    // TODO; change explain everywhere to be separate between compile time and runtime constructs
    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.runtimeLookup(rtConstruct).describe();
        let rhsDesc = this.args[0].describeEvalResult(0);
        return { message: (targetDesc.name || targetDesc.message) + " will be initialized with " + (rhsDesc.name || rhsDesc.message) + "." };
    }
}

export interface CompiledArrayAggregateInitializer<T extends BoundedArrayType = BoundedArrayType> extends ArrayAggregateInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly target: ObjectEntity<Exclude<T, ReferenceType>>; // Not sure why, but the Exclude here is needed to make TS happy
    readonly args: readonly CompiledExpression[];

    readonly elemInitializers: readonly (CompiledDirectInitializer | CompiledValueInitializer)[];
    readonly explicitElemInitializers: readonly CompiledDirectInitializer[];
    readonly implicitElemInitializers: readonly CompiledValueInitializer[];
}

export class RuntimeArrayAggregateInitializer<T extends BoundedArrayType = BoundedArrayType> extends RuntimeListInitializer<T, CompiledArrayAggregateInitializer<T>> {

    private index = 0;

    public readonly elemInitializers: readonly (RuntimeDirectInitializer | RuntimeValueInitializer)[];
    public readonly explicitElemInitializers: readonly RuntimeDirectInitializer[];
    public readonly implicitElemInitializers: readonly RuntimeValueInitializer[];

    public constructor(model: CompiledArrayAggregateInitializer<T>, parent: RuntimeConstruct) {
        super(model, parent);
        // Create argument initializer instances
        this.explicitElemInitializers = this.model.explicitElemInitializers.map(init => init.createRuntimeInitializer(this));
        this.implicitElemInitializers = this.model.implicitElemInitializers.map(init => init.createRuntimeInitializer(this));
        this.elemInitializers = [];
        this.elemInitializers = this.elemInitializers.concat(this.explicitElemInitializers, this.implicitElemInitializers);
    }

    protected upNextImpl() {
        if (this.index < this.model.elemInitializers.length) {
            this.sim.push(this.elemInitializers[this.index++]);
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
