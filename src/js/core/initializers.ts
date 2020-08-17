import { ASTNode, SuccessfullyCompiled, TranslationUnitContext, RuntimeConstruct, CPPConstruct, CompiledTemporaryDeallocator, ExpressionContext, BlockContext, ClassContext, MemberFunctionContext, MemberBlockContext, BasicCPPConstruct, createImplicitContext } from "./constructs";
import { PotentialFullExpression, RuntimePotentialFullExpression } from "./PotentialFullExpression";
import { ExpressionASTNode, StringLiteralExpression, CompiledStringLiteralExpression, RuntimeStringLiteralExpression, createRuntimeExpression, standardConversion, overloadResolution, createExpressionFromAST } from "./expressions";
import { ObjectEntity, UnboundReferenceEntity, ArraySubobjectEntity, FunctionEntity, ReceiverEntity, BaseSubobjectEntity, MemberObjectEntity, ObjectEntityType } from "./entities";
import { CompleteObjectType, AtomicType, BoundedArrayType, referenceCompatible, sameType, Char, FunctionType, VoidType, CompleteClassType, PotentiallyCompleteObjectType, ReferenceType, ReferredType } from "./types";
import { assertFalse, assert, asMutable, assertNever } from "../util/util";
import { CPPError } from "./errors";
import { Simulation } from "./Simulation";
import { CPPObject } from "./objects";
import { Expression, CompiledExpression, RuntimeExpression, allWellTyped } from "./expressionBase";
import { InitializerOutlet, ConstructOutlet, AtomicDefaultInitializerOutlet, ArrayDefaultInitializerOutlet, ReferenceDirectInitializerOutlet, AtomicDirectInitializerOutlet, ReferenceCopyInitializerOutlet, AtomicCopyInitializerOutlet, ClassDefaultInitializerOutlet, ClassDirectInitializerOutlet, ClassCopyInitializerOutlet, CtorInitializerOutlet } from "../view/codeOutlets";
import { Value } from "./runtimeEnvironment";
import { FunctionCall, CompiledFunctionCall, RuntimeFunctionCall } from "./functionCall";
import { Statement } from "./statements";
import { CtorInitializerASTNode } from "./declarations";

export type InitializerASTNode = DirectInitializerASTNode | CopyInitializerASTNode | InitializerListASTNode;

export type InitializerKind = "default" | DirectInitializerKind | "list";

export abstract class Initializer extends PotentialFullExpression {

    public abstract readonly target: ObjectEntity | UnboundReferenceEntity;

    public abstract createRuntimeInitializer(parent: RuntimeConstruct): RuntimeInitializer;

    public abstract createDefaultOutlet(this: CompiledInitializer, element: JQuery, parent?: ConstructOutlet): InitializerOutlet;

    public isTailChild(child: CPPConstruct) {
        return { isTail: true };
    }

    public abstract readonly kind: InitializerKind;

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
            return new ClassDefaultInitializer(context, <ObjectEntity<CompleteClassType>> target);
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

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct): never {
        return assertFalse("A default initializer for a reference is not allowed.");
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
        }
        else {
            this.elementInitializers = [];
            for (let i = 0; i < type.length; ++i) {
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

        if (targetType.length === 0) {
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
            this.sim.push(this.elementInitializers[this.index++])
        }
        else {
            let target = this.model.target.runtimeLookup(this);
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
        let overloadResult = overloadResolution(target.type.classDefinition.constructors, []);
        if (!overloadResult.selected) {
            this.addNote(CPPError.declaration.init.no_default_constructor(this, this.target));
            return;
        }

        this.ctor = overloadResult.selected;

        this.ctorCall = new FunctionCall(context, this.ctor, []);
        this.attach(this.ctorCall);
        // this.args = this.ctorCall.args;
    }

    public createRuntimeInitializer<T extends CompleteClassType>(this: CompiledClassDefaultInitializer<T>, parent: RuntimeConstruct) : RuntimeClassDefaultInitializer<T>;
    public createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledDefaultInitializer<T>, parent: RuntimeConstruct) : never;
    public createRuntimeInitializer<T extends CompleteClassType>(this: CompiledClassDefaultInitializer<T>, parent: RuntimeConstruct) : RuntimeClassDefaultInitializer<T> {
        return new RuntimeClassDefaultInitializer(this, parent);
    }

    public createDefaultOutlet(this: CompiledClassDefaultInitializer, element: JQuery, parent?: ConstructOutlet): ClassDefaultInitializerOutlet {
        return new ClassDefaultInitializerOutlet(element, this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.describe();
        // TODO: what if there is an error that causes no ctor to be found/available
        return {message: (targetDesc.name || targetDesc.message) + " will be initialized using " + this.ctorCall!.describe(sim, rtConstruct).message};
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

    public constructor (model: CompiledClassDefaultInitializer<T>, parent: RuntimeConstruct) {
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
            this.observable.send("initialized", target);
            this.startCleanup();
        }
    }

    public stepForwardImpl() {
        // do nothing
    }

}







export interface DirectInitializerASTNode extends ASTNode {
    construct_type: "direct_initializer";
    args: ExpressionASTNode[];
}


export type DirectInitializerKind = "direct" | "copy";

export abstract class DirectInitializer extends Initializer {

    public static create(context: TranslationUnitContext, target: UnboundReferenceEntity, args: readonly Expression[], kind: DirectInitializerKind): ReferenceDirectInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<AtomicType>, args: readonly Expression[], kind: DirectInitializerKind): AtomicDirectInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>, args: readonly Expression[], kind: DirectInitializerKind) : ArrayDirectInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<CompleteClassType>, args: readonly Expression[], kind: DirectInitializerKind) : ClassDirectInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity, args: readonly Expression[], kind: DirectInitializerKind): AtomicDirectInitializer | ArrayDirectInitializer | ClassDirectInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity | UnboundReferenceEntity, args: readonly Expression[], kind: DirectInitializerKind): ReferenceDirectInitializer | AtomicDirectInitializer | ArrayDirectInitializer | ClassDirectInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity | UnboundReferenceEntity, args: readonly Expression[], kind: DirectInitializerKind): DirectInitializer {
        if (target.type.isReferenceType()) { // check for presence of bindTo to detect reference entities
            return new ReferenceDirectInitializer(context, <UnboundReferenceEntity>target, args, kind);
        }
        else if (target.type.isAtomicType()) {
            return new AtomicDirectInitializer(context, <ObjectEntity<AtomicType>>target, args, kind);
        }
        else if (target.type.isBoundedArrayType()) {
            return new ArrayDirectInitializer(context, <ObjectEntity<BoundedArrayType>>target, args, kind);
        }
        else if (target.type.isCompleteClassType()) {
            return new ClassDirectInitializer(context, <ObjectEntity<CompleteClassType>> target, args, kind);
        }
        else {
            return assertNever(target.type);
        }
    }

    public abstract readonly target: ObjectEntity | UnboundReferenceEntity;
    public abstract readonly args: readonly Expression[];

    public readonly kind: DirectInitializerKind;

    public constructor(context: TranslationUnitContext, kind: DirectInitializerKind) {
        super(context, undefined);
        this.kind = kind;
    }

    public abstract createRuntimeInitializer<T extends ObjectEntityType>(this: CompiledDirectInitializer<T>, parent: RuntimeConstruct): RuntimeDirectInitializer<T>;
}


export interface CompiledDirectInitializer<T extends ObjectEntityType = ObjectEntityType> extends DirectInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<Exclude<T, ReferenceType>> | UnboundReferenceEntity<Extract<T, ReferenceType>>;
    readonly args: readonly CompiledExpression[];
}

export abstract class RuntimeDirectInitializer<T extends ObjectEntityType = ObjectEntityType, C extends CompiledDirectInitializer<T> = CompiledDirectInitializer<T>> extends RuntimeInitializer<C> {

    protected constructor(model: C, parent: RuntimeConstruct) {
        super(model, parent);
    }

}


export class ReferenceDirectInitializer extends DirectInitializer {
    public readonly construct_type = "ReferenceDirectInitializer";

    public readonly target: UnboundReferenceEntity;
    public readonly args: readonly Expression[];
    public readonly arg?: Expression;

    public constructor(context: TranslationUnitContext, target: UnboundReferenceEntity, args: readonly Expression[], kind: DirectInitializerKind) {
        super(context, kind);
        this.target = target;

        assert(args.length > 0, "Direct initialization must have at least one argument. (Otherwise it should be a default initialization.)");
        this.args = args;

        // Note: It is ONLY ok to attach them all right away because no conversions are
        // layered over the expressions for a reference initialization
        args.forEach((a) => { this.attach(a); });

        // Note: With a reference, no conversions are done
        if (this.args.length > 1) {
            this.addNote(CPPError.declaration.init.referenceBindMultiple(this));
            return;
        }

        this.arg = this.args[0];
        if (!this.arg.isWellTyped()) {
            return;
        }

        let targetType = target.type;
        if (!referenceCompatible(this.arg.type, targetType)) {
            this.addNote(CPPError.declaration.init.referenceType(this, this.arg.type, targetType));
        }
        else if (this.arg.valueCategory === "prvalue" && !targetType.isConst) {
            this.addNote(CPPError.declaration.init.referencePrvalueConst(this));
        }
        else if (this.arg.valueCategory === "prvalue") {
            this.addNote(CPPError.lobster.referencePrvalue(this));
        }
    }

    public createRuntimeInitializer<T extends ReferenceType<CompleteObjectType>>(this: CompiledReferenceDirectInitializer<T>, parent: RuntimeConstruct): RuntimeReferenceDirectInitializer<T>;
    public createRuntimeInitializer<T extends ReferenceType<CompleteObjectType>>(this: CompiledDirectInitializer<T>, parent: RuntimeConstruct): never;
    public createRuntimeInitializer<T extends ReferenceType<CompleteObjectType>>(this: CompiledReferenceDirectInitializer<T>, parent: RuntimeConstruct): RuntimeReferenceDirectInitializer<T> {
        return new RuntimeReferenceDirectInitializer(this, parent);
    }

    public createDefaultOutlet(this: CompiledReferenceDirectInitializer, element: JQuery, parent?: ConstructOutlet): ReferenceDirectInitializerOutlet {
        return this.kind === "direct" ?
            new ReferenceDirectInitializerOutlet(element, this, parent) :
            new ReferenceCopyInitializerOutlet(element, this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.describe();
        let rhsDesc = this.args[0].describeEvalResult(0);
        return { message: (targetDesc.name || targetDesc.message) + " will be bound to " + (rhsDesc.name || rhsDesc.message) + "." };
    }
}

export interface CompiledReferenceDirectInitializer<T extends ReferenceType = ReferenceType> extends ReferenceDirectInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: UnboundReferenceEntity<Extract<T, ReferenceType>>; // Not sure why, but the Extract here is needed to make TS happy
    readonly args: readonly CompiledExpression[];

    // Note: Compilation of the initializer checks for reference compatibility, which should ensure
    // that the expression actually has the same type T as the reference to be bound. (For subtypes
    // that are reference compatible, this is fine, since T will still be ClassType for both.)
    readonly arg: CompiledExpression<ReferredType<T>, "lvalue">;
}

export class RuntimeReferenceDirectInitializer<T extends ReferenceType<CompleteObjectType> = ReferenceType<CompleteObjectType>> extends RuntimeDirectInitializer<T, CompiledReferenceDirectInitializer<T>> {

    public readonly args: readonly RuntimeExpression<ReferredType<T>, "lvalue">[];
    public readonly arg: RuntimeExpression<ReferredType<T>, "lvalue">;

    private alreadyPushed = false;

    public constructor(model: CompiledReferenceDirectInitializer<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.arg = createRuntimeExpression(this.model.arg, this);
        this.args = [this.arg];
    }

    protected upNextImpl() {
        if (!this.alreadyPushed) {
            this.sim.push(this.arg);
            this.alreadyPushed = true;
        }
    }

    // private notifyPassing() {
    //     if (this.model.kind === "parameter") {
    //         this.observable.send("passByReference",
    //             {
    //                 target: <PassByReferenceParameterEntity<T>>this.model.target,
    //                 arg: this.arg
    //             });
    //     }
    //     else if (this.model.kind === "return") {
    //         this.observable.send("returnByReference",
    //             {
    //                 target: <ReturnByReferenceEntity<T>>this.model.target,
    //                 arg: this.arg
    //             });
    //     }
    // }

    public stepForwardImpl() {
        this.model.target.bindTo(this, <CPPObject<ReferredType<T>>>this.arg.evalResult);  //TODO not sure at all why this cast is necessary
        // this.notifyPassing();
        this.observable.send("referenceInitialized", this);
        this.startCleanup();
    }
}

export class AtomicDirectInitializer extends DirectInitializer {
    public readonly construct_type = "AtomicDirectInitializer";

    public readonly target: ObjectEntity<AtomicType>;
    public readonly args: readonly Expression[];
    public readonly arg?: Expression;

    public constructor(context: TranslationUnitContext, target: ObjectEntity<AtomicType>, args: readonly Expression[], kind: DirectInitializerKind) {
        super(context, kind);

        this.target = target;

        let targetType = target.type;

        assert(args.length > 0, "Direct initialization must have at least one argument. (Otherwise it should be a default initialization.)");

        if (args.length > 1) {
            this.attachAll(this.args = args);
            this.addNote(CPPError.declaration.init.scalar_args(this, targetType));
            return;
        }

        let arg = args[0];

        //Attempt standard conversion to declared type, including lvalue to rvalue conversions
        if (!arg.isWellTyped()) {
            this.args = args;
            this.attach(this.arg = arg); // only need to attach this one, because we're guaranteed args.length === 1 at this point
            return;
        }

        let typedArg = standardConversion(arg, targetType);
        this.args = [typedArg];
        this.attach(this.arg = typedArg);

        if (!sameType(typedArg.type, targetType)) {
            this.addNote(CPPError.declaration.init.convert(this, typedArg.type, targetType));
        }

        // TODO: need to check that the arg is a prvalue


    }

    public createRuntimeInitializer<T extends AtomicType>(this: CompiledAtomicDirectInitializer<T>, parent: RuntimeConstruct): RuntimeAtomicDirectInitializer<T>;
    public createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledDirectInitializer<T>, parent: RuntimeConstruct): never;
    public createRuntimeInitializer<T extends AtomicType>(this: any, parent: RuntimeConstruct): RuntimeAtomicDirectInitializer<T> {
        return new RuntimeAtomicDirectInitializer(<CompiledAtomicDirectInitializer<T>>this, parent);
    }

    public createDefaultOutlet(this: CompiledAtomicDirectInitializer, element: JQuery, parent?: ConstructOutlet): AtomicDirectInitializerOutlet {
        return this.kind === "direct" ?
            new AtomicDirectInitializerOutlet(element, this, parent) :
            new AtomicCopyInitializerOutlet(element, this, parent);
    }

    // TODO; change explain everywhere to be separate between compile time and runtime constructs
    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.runtimeLookup(rtConstruct).describe();
        let rhsDesc = this.args[0].describeEvalResult(0);
        return { message: (targetDesc.name || targetDesc.message) + " will be initialized with " + (rhsDesc.name || rhsDesc.message) + "." };
    }
}

export interface CompiledAtomicDirectInitializer<T extends AtomicType = AtomicType> extends AtomicDirectInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<Exclude<T, ReferenceType>>; // Not sure why, but the Exclude here is needed to make TS happy
    readonly args: readonly CompiledExpression[];
    readonly arg: CompiledExpression<T, "prvalue">;
}

export class RuntimeAtomicDirectInitializer<T extends AtomicType = AtomicType> extends RuntimeDirectInitializer<T, CompiledAtomicDirectInitializer<T>> {

    public readonly args: readonly RuntimeExpression<T, "prvalue">[];
    public readonly arg: RuntimeExpression<T, "prvalue">;

    private alreadyPushed = false;

    public constructor(model: CompiledAtomicDirectInitializer<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.arg = createRuntimeExpression(this.model.arg, this);
        this.args = [this.arg];
    }

    protected upNextImpl() {
        if (!this.alreadyPushed) {
            this.sim.push(this.arg);
            this.alreadyPushed = true;
        }
    }

    // private notifyPassing() {
    //     if (this.model.kind === "parameter") {
    //     }
    //     else if (this.model.kind === "return") {
    //         this.observable.send("returnByAtomicValue",
    //             {
    //                 target: <ReturnObjectEntity<T>>this.model.target,
    //                 arg: this.arg
    //             });
    //     }
    // }

    public stepForwardImpl() {
        let target = this.model.target.runtimeLookup(this);
        target.writeValue(this.arg.evalResult);
        this.observable.send("atomicObjectInitialized", this);
        // this.notifyPassing();
        this.startCleanup();
    }
}


/**
 * Note: Only allowed use is to initialize a char array from a string literal, but this can readily be
 * created in the course of compiling a program if the code attempts to directly initialize an array. That's
 * desirable, because this class will give the appropriate error messages if it's anything other than a
 * char array initialized from a string literal.
 */
export class ArrayDirectInitializer extends DirectInitializer {
    public readonly construct_type = "ArrayDirectInitializer";

    public readonly target: ObjectEntity<BoundedArrayType>;
    public readonly args: readonly Expression[];
    public readonly arg?: StringLiteralExpression;

    public constructor(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>, args: readonly Expression[], kind: "direct" | "copy") {
        super(context, kind);

        this.target = target;
        this.args = args;
        args.forEach((a) => { this.attach(a); });

        // TS type system ensures target is array type, but need to check element type and that args are a single string literal
        let targetType = target.type;
        let firstArg = args[0];
        if (targetType.elemType.isType(Char) && args.length === 1 && firstArg.isStringLiteralExpression()) {
            this.arg = firstArg;

            if (firstArg.type.length > targetType.length) {
                this.addNote(CPPError.declaration.init.stringLiteralLength(this, firstArg.type.length, targetType.length));
            }
        }
        else {
            this.addNote(CPPError.declaration.init.array_string_literal(this, targetType));
        }
    }

    public createRuntimeInitializer(this: CompiledArrayDirectInitializer, parent: RuntimeConstruct): RuntimeArrayDirectInitializer;
    public createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledDirectInitializer<T>, parent: RuntimeConstruct): never;
    public createRuntimeInitializer(this: any, parent: RuntimeConstruct): RuntimeArrayDirectInitializer {
        return new RuntimeArrayDirectInitializer(this, parent);
    }

    public createDefaultOutlet(this: CompiledAtomicDirectInitializer, element: JQuery, parent?: ConstructOutlet): AtomicDirectInitializerOutlet {
        return this.kind === "direct" ?
            new AtomicDirectInitializerOutlet(element, this, parent) :
            new AtomicCopyInitializerOutlet(element, this, parent);
    }

    // TODO; change explain everywhere to be separate between compile time and runtime constructs
    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.runtimeLookup(rtConstruct).describe();
        let rhsDesc = this.args[0].describeEvalResult(0);
        return { message: (targetDesc.name || targetDesc.message) + " (a character array) will be initialized from the string literal " + rhsDesc + ". Remember that a null character is automatically appended!" };
    }
}

export interface CompiledArrayDirectInitializer extends ArrayDirectInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<BoundedArrayType<Char>>;
    readonly args: readonly CompiledStringLiteralExpression[];
    readonly arg: CompiledStringLiteralExpression;
}

export class RuntimeArrayDirectInitializer extends RuntimeDirectInitializer<BoundedArrayType<Char>, CompiledArrayDirectInitializer> {

    public readonly arg: RuntimeStringLiteralExpression;
    public readonly args: readonly RuntimeStringLiteralExpression[];

    private alreadyPushed = false;

    public constructor(model: CompiledArrayDirectInitializer, parent: RuntimeConstruct) {
        super(model, parent);
        this.arg = createRuntimeExpression(this.model.arg, this);
        this.args = [this.arg];
    }

    protected upNextImpl() {
        if (!this.alreadyPushed) {
            this.sim.push(this.arg);
            this.alreadyPushed = true;
        }
    }

    public stepForwardImpl() {

        let target = this.model.target.runtimeLookup(this);
        let charsToWrite = this.arg.evalResult.getValue();

        // pad with zeros
        while (charsToWrite.length < target.type.length) {
            charsToWrite.push(new Value(Char.NULL_CHAR, Char.CHAR));
        }

        let arrayElemSubobjects = target.getArrayElemSubobjects();

        // should be true if compilation was successful
        assert(charsToWrite.length == arrayElemSubobjects.length);

        charsToWrite.forEach((c, i) => arrayElemSubobjects[i].writeValue(c));

        this.observable.send("initialized", target);
        this.startCleanup();
    }
}



// export class ClassDefaultInitializer extends DefaultInitializer {
//     public readonly construct_type = "ClassDefaultInitializer";

//     public readonly target: ObjectEntity<CompleteClassType>;
//     public readonly ctor?: FunctionEntity;
//     public readonly ctorCall?: FunctionCall;

//     public constructor(context: TranslationUnitContext, target: ObjectEntity<CompleteClassType>) {
//         super(context, undefined);

//         this.target = target;

//         // Try to find default constructor. Not using lookup because constructors have no name.
//         let overloadResult = overloadResolution(target.type.classDefinition.constructors, []);
//         if (!overloadResult.selected) {
//             this.addNote(CPPError.declaration.init.no_default_constructor(this, this.target));
//             return;
//         }

//         this.ctor = overloadResult.selected;

//         this.ctorCall = new FunctionCall(context, this.ctor, [], this.target);
//         this.attach(this.ctorCall);
//         // this.args = this.ctorCall.args;
//     }

//     public createRuntimeInitializer<T extends CompleteClassType>(this: CompiledClassDefaultInitializer<T>, parent: RuntimeConstruct) : RuntimeClassDefaultInitializer<T>;
//     public createRuntimeInitializer<T extends ObjectType>(this: CompiledDefaultInitializer<T>, parent: RuntimeConstruct) : never;
//     public createRuntimeInitializer<T extends CompleteClassType>(this: CompiledClassDefaultInitializer<T>, parent: RuntimeConstruct) : RuntimeClassDefaultInitializer<T> {
//         return new RuntimeClassDefaultInitializer(this, parent);
//     }

//     public createDefaultOutlet(this: CompiledClassDefaultInitializer, element: JQuery, parent?: ConstructOutlet): ClassDefaultInitializerOutlet {
//         return new ClassDefaultInitializerOutlet(element, this, parent);
//     }

//     public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
//         let targetDesc = this.target.describe();
//         // TODO: what if there is an error that causes no ctor to be found/available
//         return {message: (targetDesc.name || targetDesc.message) + " will be initialized using " + this.ctorCall!.describe(sim, rtConstruct).message};
//     }
// }

// export interface CompiledClassDefaultInitializer<T extends CompleteClassType = CompleteClassType> extends ClassDefaultInitializer, SuccessfullyCompiled {
//     readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    
//     readonly target: ObjectEntity<T>;
//     readonly ctor: FunctionEntity<FunctionType<VoidType>>;
//     readonly ctorCall: CompiledFunctionCall<FunctionType<VoidType>>;
// }




export class ClassDirectInitializer extends DirectInitializer {
    public readonly construct_type = "ClassDirectInitializer";

    public readonly target: ObjectEntity<CompleteClassType>;
    public readonly args: readonly Expression[];
    
    public readonly ctor?: FunctionEntity<FunctionType<VoidType>>;
    public readonly ctorCall?: FunctionCall;

    public constructor(context: TranslationUnitContext, target: ObjectEntity<CompleteClassType>, args: readonly Expression[], kind: DirectInitializerKind) {
        super(context, kind);

        this.target = target;

        assert(args.length > 0, "Direct initialization must have at least one argument. (Otherwise it should be a default initialization.)");

        // If any arguments are not well typed, we can't select a constructor
        if (!allWellTyped(args)) {
            this.attachAll(this.args = args);
            // ctor and ctorCall remain undefined
            return;
        }

        // Try to find a matching constructor. Not using lookup because constructors have no name.
        let argTypes = args.map(arg => arg.type);
        let overloadResult = overloadResolution(target.type.classDefinition.constructors, argTypes);
        if (!overloadResult.selected) {
            this.addNote(CPPError.declaration.init.matching_constructor(this, this.target, argTypes));
            this.attachAll(this.args = args);
            return;
        }

        this.ctor = overloadResult.selected;

        this.ctorCall = new FunctionCall(context, this.ctor, args);
        this.attach(this.ctorCall);
        this.args = this.ctorCall.args;


    }

    public createRuntimeInitializer<T extends CompleteClassType>(this: CompiledClassDirectInitializer<T>, parent: RuntimeConstruct): RuntimeClassDirectInitializer<T>;
    public createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledDirectInitializer<T>, parent: RuntimeConstruct): never;
    public createRuntimeInitializer<T extends CompleteClassType>(this: CompiledClassDirectInitializer<T>, parent: RuntimeConstruct): RuntimeClassDirectInitializer<T> {
        return new RuntimeClassDirectInitializer(this, parent);
    }

    public createDefaultOutlet(this: CompiledClassDirectInitializer, element: JQuery, parent?: ConstructOutlet): ClassDirectInitializerOutlet {
        return this.kind === "direct" ?
            new ClassDirectInitializerOutlet(element, this, parent) :
            new ClassCopyInitializerOutlet(element, this, parent);
    }

    // TODO; change explain everywhere to be separate between compile time and runtime constructs
    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.runtimeLookup(rtConstruct).describe();
        let rhsDesc = this.args[0].describeEvalResult(0);
        return { message: (targetDesc.name || targetDesc.message) + " will be initialized with " + (rhsDesc.name || rhsDesc.message) + "." };
    }
}

export interface CompiledClassDirectInitializer<T extends CompleteClassType = CompleteClassType> extends ClassDirectInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    
    readonly target: ObjectEntity<Exclude<T, ReferenceType>>; // Not sure why, but the Exclude here is needed to make TS happy
    readonly args: readonly CompiledExpression[];
    
    readonly ctor: FunctionEntity<FunctionType<VoidType>>;
    readonly ctorCall: CompiledFunctionCall<FunctionType<VoidType>>;
}

export class RuntimeClassDirectInitializer<T extends CompleteClassType = CompleteClassType> extends RuntimeDirectInitializer<T, CompiledClassDirectInitializer<T>> {

    public readonly ctorCall: RuntimeFunctionCall<FunctionType<VoidType>>;

    private index = "callCtor";

    public constructor (model: CompiledClassDirectInitializer<T>, parent: RuntimeConstruct) {
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
            this.observable.send("initialized", target);
            this.startCleanup();
        }
    }

    public stepForwardImpl() {
        // do nothing
    }

}





// export class ClassDirectInitializer extends DirectInitializer {

//     public readonly target: ObjectEntity<ClassType>;
//     public readonly args: readonly Expression[];

//     public readonly ctor: ConstructorEntity?;
//     public readonly ctorCall: MemberFunctionCall?;

//     public constructor(context: TranslationUnitContext, target: ObjectEntity<ClassType>, args: readonly Expression[]) {
//         super(context);

//         this.target = target;

//         let targetType = target.type;

//         // Need to select constructor, so have to compile auxiliary arguments
//         let {ctor, problems} = overloadResolution(targetType.cppClass.ctors, args);

//         if (ctor) {
//             this.ctor = ctor;
//             this.args = args;
//             this.ctorCall = new FunctionCall(context, ctor, args, this.target);
//             this.attach(this.ctorCall);
//             // Note: in the case a suitable function call can be constructed, arguments are not
//             // attached here since they are attached under the function call.
//         }
//         else {
//             this.addNote(CPPError.declaration.init.matching_constructor(this, this.target,
//                 args.map(function (arg) {return arg.type;})));
//             this.attachAll(this.args = args);
//             return;
//         }


//     }

//     public createRuntimeInitializer<T extends ClassType>(this: CompiledClassDirectInitializer<T>, parent: RuntimeConstruct) : RuntimeClassDirectInitializer<T>;
//     public createRuntimeInitializer<T extends ObjectType>(this: CompiledDirectInitializer<T>, parent: RuntimeConstruct) : never;
//     public createRuntimeInitializer<T extends ClassType>(this: any, parent: RuntimeConstruct) : RuntimeClassDirectInitializer<T> {
//         return new RuntimeClassDirectInitializer(<CompiledClassDirectInitializer<T>>this, parent);
//     }

//     // TODO; change explain everywhere to be separate between compile time and runtime constructs
//     public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
//         let targetDesc = this.target.describe();
//         // TODO: what if there is an error that causes no ctor to be found/available
//         return {message: (targetDesc.name || targetDesc.message) + " will be initialized using " + this.ctorCall.describe().message};
//     }
// }

// export interface CompiledClassDirectInitializer<T extends ClassType> extends ClassDirectInitializer, SuccessfullyCompiled {


//     readonly target: ObjectEntity<T>;
//     readonly args: readonly Expression[];

//     readonly ctor: ConstructorEntity<T>;
//     readonly ctorCall: CompiledFunctionCall<VoidType, "prvalue">;
// }

// export class RuntimeClassDirectInitializer<T extends ClassType> extends RuntimeDirectInitializer<T, CompiledClassDirectInitializer<T>> {

//     public readonly ctorCall: RuntimeFunctionCall<VoidType, "prvalue">;

//     private index = "callCtor";

//     public constructor (model: CompiledClassDirectInitializer<T>, parent: RuntimeConstruct) {
//         super(model, parent);
//         this.ctorCall = this.model.ctorCall.createRuntimeFunctionCall(this);
//     }

//     protected upNextImpl() {
//         if (this.index === "callCtor") {
//             this.sim.push(this.ctorCall);
//             this.index = "done";
//         }
//         else {
//             target = this.model.target.runtimeLookup(this);
//             this.observable.send("initialized", target);
//             this.startCleaningUp();
//         }
//     }

//     public stepForwardImpl() {
//         // do nothing
//     }
// }



export interface CopyInitializerASTNode extends ASTNode {
    readonly construct_type: "copy_initializer";
    readonly args: ExpressionASTNode[];
}


type DelegatedConstructorCtorInitializerComponent = {
    kind: "delegatedConstructor",
    args: readonly Expression[]
}

type BaseCtorInitializerComponent = {
    kind: "base",
    args: readonly Expression[]
}

type MemberCtorInitializerComponent = {
    kind: "member",
    name: string;
    args: readonly Expression[]
}

type CtorInitializerComponent =
    DelegatedConstructorCtorInitializerComponent |
    BaseCtorInitializerComponent |
    MemberCtorInitializerComponent;

export class CtorInitializer extends BasicCPPConstruct<MemberBlockContext, CtorInitializerASTNode> {
    public readonly construct_type = "ctor_initializer";

    public readonly target: ReceiverEntity;

    public readonly delegatedConstructorInitializer?: ClassDirectInitializer;
    public readonly baseInitializer?: ClassDefaultInitializer | ClassDirectInitializer;
    public readonly memberInitializers: readonly (DefaultInitializer | DirectInitializer)[] = [];
    public readonly memberInitializersByName: { [index: string]: DirectInitializer | DefaultInitializer | undefined } = { };

    public static createFromAST(ast: CtorInitializerASTNode, context: MemberFunctionContext) {
        return new CtorInitializer(context, ast, ast.initializers.map(memInitAST => {
            let receiverType = context.contextualReceiverType;
            let baseType = receiverType.classDefinition.baseClass;

            let memName = memInitAST.member.identifier;
            let args = memInitAST.args.map(argAST => createExpressionFromAST(argAST, context));

            if (memName === receiverType.className) {
                return <DelegatedConstructorCtorInitializerComponent>{
                    kind: "delegatedConstructor",
                    args: args
                };
            }
            else if (baseType && memName === baseType.className) {
                return <BaseCtorInitializerComponent>{
                    kind: "base",
                    args: args
                };
            }
            else {
                return <MemberCtorInitializerComponent>{
                    kind: "member",
                    name: memName,
                    args: args
                };
            }
        }));
    }

    public constructor(context: MemberBlockContext, ast: CtorInitializerASTNode, components: readonly CtorInitializerComponent[]) {
        super(context, ast);

        let receiverType = context.contextualReceiverType;

        this.target = new ReceiverEntity(receiverType);

        let baseType = receiverType.classDefinition.baseClass;

        
        assert(context.containingFunction.firstDeclaration.isConstructor);

        // Initial processing of ctor initializer components list
        for (let i = 0; i < components.length; ++i) {
            let comp = components[i];
            if (comp.kind === "delegatedConstructor") {

                let delegatedCtor = new ClassDirectInitializer(context, this.target, comp.args, "direct")
                this.attach(delegatedCtor);

                if (this.delegatedConstructorInitializer) {
                    delegatedCtor.addNote(CPPError.declaration.ctor.init.multiple_delegates(delegatedCtor));
                }
                else {
                    this.delegatedConstructorInitializer = delegatedCtor;
                    if (components.length > 1) {
                        // If there's a delegating constructor call, no other initializers are allowed
                        delegatedCtor.addNote(CPPError.declaration.ctor.init.delegate_only(delegatedCtor));
                    }
                }
            }
            else if (comp.kind === "base") {
                // Theoretically we shouldn't have a base init provided if
                // there wasn't a base class to match the name of the init against
                assert(baseType);

                let baseInit = new ClassDirectInitializer(context, new BaseSubobjectEntity(this.target, baseType), comp.args, "direct");
                this.attach(baseInit);

                if (!this.baseInitializer) {
                    this.baseInitializer = baseInit;
                }
                else {
                    baseInit.addNote(CPPError.declaration.ctor.init.multiple_base_inits(baseInit));
                }
            }
            else {
                let memName = comp.name;
                let memEntity = receiverType.classDefinition.memberEntitiesByName[memName];
                if (memEntity) {
                    let memInit = DirectInitializer.create(context, memEntity, comp.args, "direct");
                    this.attach(memInit);

                    if (!this.memberInitializersByName[memName]) {
                        this.memberInitializersByName[memName] = memInit;
                    }
                    else {
                        this.addNote(CPPError.declaration.ctor.init.multiple_member_inits(this));
                    }
                }
                else {
                    this.addNote(CPPError.declaration.ctor.init.improper_name(this, receiverType, memName));
                }
            }
        }

        // If there's a base class and no explicit base initializer, add a default one
        if (baseType && !this.baseInitializer) {
            this.baseInitializer = new ClassDefaultInitializer(createImplicitContext(context), new BaseSubobjectEntity(this.target, baseType));
        }

        receiverType.classDefinition.memberEntities.forEach(memEntity => {
            let memName = memEntity.name;
            let memInit = this.memberInitializersByName[memName];

            // If there wasn't an explicit initializer, we need to provide a default one
            if (!memInit) {
                memInit = DefaultInitializer.create(context, memEntity);
                this.attach(memInit);
                this.memberInitializersByName[memName] = memInit;
            }

            // Add to list of member initializers in order (same order as entities/declarations in class def)
            asMutable(this.memberInitializers).push(memInit);
        });
        
        // TODO out of order warnings
    }

    public createRuntimeCtorInitializer(this: CompiledCtorInitializer, parent: RuntimeConstruct): RuntimeCtorInitializer {
        return new RuntimeCtorInitializer(this, parent);
    }

    public createDefaultOutlet(this: CompiledCtorInitializer, element: JQuery, parent?: ConstructOutlet) {
        return new CtorInitializerOutlet(element, this, parent);
    }

}

export interface CompiledCtorInitializer extends CtorInitializer, SuccessfullyCompiled {

    readonly delegatedConstructorInitializer?: CompiledClassDirectInitializer;
    readonly baseInitializer?: CompiledClassDefaultInitializer | CompiledClassDirectInitializer;
    readonly memberInitializers: readonly (CompiledDefaultInitializer | CompiledDirectInitializer)[];
    readonly memberInitializersByName: { [index: string]: CompiledClassDefaultInitializer | CompiledDirectInitializer | undefined };
}


const INDEX_CTOR_INITIALIZER_DELEGATE = 0;
const INDEX_CTOR_INITIALIZER_BASE = 1;
const INDEX_CTOR_INITIALIZER_MEMBERS = 2;
export class RuntimeCtorInitializer extends RuntimeConstruct<CompiledCtorInitializer> {

    public readonly delegatedConstructorInitializer?: RuntimeClassDirectInitializer;
    public readonly baseInitializer?: RuntimeClassDefaultInitializer | RuntimeClassDirectInitializer;
    public readonly memberInitializers: readonly (RuntimeDefaultInitializer | RuntimeDirectInitializer)[];

    private index: number;
    private memberIndex = 0;

    public constructor (model: CompiledCtorInitializer, parent: RuntimeConstruct) {
        super(model, "ctor-initializer", parent);
        this.delegatedConstructorInitializer = this.model.delegatedConstructorInitializer?.createRuntimeInitializer(this);

        // Dummy ternary needed by type system due to union and this parameter shenanagins
        this.baseInitializer = this.model.baseInitializer instanceof ClassDefaultInitializer ?
            this.model.baseInitializer?.createRuntimeInitializer(this) :
            this.model.baseInitializer?.createRuntimeInitializer(this);

        // Dummy ternary needed by type system due to union and this parameter shenanagins
        this.memberInitializers = this.model.memberInitializers.map(memInit => memInit instanceof DefaultInitializer ?
            memInit.createRuntimeInitializer(this) :
            memInit.createRuntimeInitializer(this)
        );

        if (this.delegatedConstructorInitializer) {
            this.index = INDEX_CTOR_INITIALIZER_DELEGATE;
        }
        else if (this.baseInitializer) {
            this.index = INDEX_CTOR_INITIALIZER_BASE;
        }
        else {
            this.index = INDEX_CTOR_INITIALIZER_MEMBERS;
        }
    }

    protected upNextImpl() {
        if (this.index === INDEX_CTOR_INITIALIZER_DELEGATE) {

            // Non-null assertion due to the way index is set in constructor above
            this.sim.push(this.delegatedConstructorInitializer!);
            
            if (this.baseInitializer) {
                this.index = INDEX_CTOR_INITIALIZER_BASE;
            }
            else {
                this.index = INDEX_CTOR_INITIALIZER_MEMBERS;
            }
        }
        else if (this.index === INDEX_CTOR_INITIALIZER_BASE) {
            // Non-null assertion due to the way index is set in constructor above
            this.sim.push(this.baseInitializer!);
            this.index = INDEX_CTOR_INITIALIZER_MEMBERS;
        }
        else {
            if (this.memberIndex < this.memberInitializers.length) {
                this.sim.push(this.memberInitializers[this.memberIndex++]);
            }
            else {
                this.startCleanup();
            }
        }
    }

    public stepForwardImpl() {
        // do nothing
    }
}




// export var ConstructorDefinition = FunctionDefinition.extend({
//     _name: "ConstructorDefinition",

//     i_childrenToExecute: ["memberInitializers", "body"], // TODO: why do regular functions have member initializers??


//     instance : function(ast, context){
//         assert(context);
//         assert(isA(context.containingClass, Types.Class));
//         assert(context.hasOwnProperty("access"));
//         // Make sure it's actually a constructor
//         if (ast.name.identifier !== context.containingClass.className){
//             // oops was actually a function with missing return type
//             return FunctionDefinition.instance(ast, context);
//         }

//         return ConstructorDefinition._parent.instance.apply(this, arguments);
//     },

//     compileDeclaration : function() {
//         FunctionDefinition.compileDeclaration.apply(this, arguments);

//         if (!this.hasErrors()){
//             this.i_containingClass.addConstructor(this.entity);
//         }
//     },

//     compileDeclarator : function(){
//         var ast = this.ast;


//         // NOTE: a constructor doesn't have a "name", and so we don't need to add it to any scope.
//         // However, to make lookup easier, we give all constructors their class name plus the null character. LOL
//         // TODO: this is silly. remove it pls :)
//         this.name = this.i_containingClass.className + "\0";

//         // Compile the parameters
//         var args = this.ast.args;
//         this.params = [];
//         this.paramTypes = [];
//         for (var j = 0; j < args.length; ++j) {
//             var paramDecl = Parameter.instance(args[j], {parent: this, scope: this.bodyScope});
//             paramDecl.compile();
//             this.params.push(paramDecl);
//             this.paramTypes.push(paramDecl.type);
//         }
//         this.isDefaultConstructor = this.params.length == 0;

//         this.isCopyConstructor = this.params.length == 1
//         && (isA(this.paramTypes[0], this.i_containingClass) ||
//         isA(this.paramTypes[0], Types.Reference) && isA(this.paramTypes[0].refTo, this.i_containingClass));


//         // Give error for copy constructor that passes by value
//         if (this.isCopyConstructor && isA(this.paramTypes[0], this.i_containingClass)){
//             this.addNote(CPPError.declaration.ctor.copy.pass_by_value(this.params[0], this.paramTypes[0], this.params[0].name));
//         }

//         // I know this is technically wrong but I think it makes things run smoother
//         this.type = Types.Function.instance(Types.Void.instance(), this.paramTypes);
//     },

//     compileDefinition : function(){
//         var self = this;
//         var ast = this.ast;

//         if (!ast.body){
//             this.addNote(CPPError.class_def.ctor_def(this));
//             return;
//         }

//         this.compileCtorInitializer();

//         // Call parent class version. Will handle body, automatic object destruction, etc.
//         FunctionDefinition.compileDefinition.apply(this, arguments);
//     },

//     compileCtorInitializer : function(){
//         var memInits = this.ast.initializer || [];

//         // First, check to see if this is a delegating constructor.
//         // TODO: check on whether someone could techinically declare a member variable with the same name
//         // as the class and how that affects the logic here.
//         var targetConstructor = null;
//         for(var i = 0; i < memInits.length; ++i){
//             if (memInits[i].member.identifier == this.i_containingClass.className){
//                 targetConstructor = i;
//                 break;
//             }
//         }

//         // It is a delegating constructor
//         if (targetConstructor !== null){
//             targetConstructor = memInits.splice(targetConstructor, 1)[0];
//             // If it is a delegating constructor, there can be no other memInits
//             if (memInits.length === 0){ // should be 0 since one removed
//                 var mem = MemberInitializer.instance(targetConstructor, {parent: this, scope: this.bodyScope});
//                 mem.compile(ReceiverEntity.instance(this.i_containingClass));
//                 this.memberInitializers.push(mem);
//             }
//             else{
//                 this.addNote(CPPError.declaration.ctor.init.delegating_only(this));
//             }
//             return;
//         }

//         // It is a non-delegating constructor

//         // If there is a base class subobject, initialize it
//         var base;
//         if (base = this.i_containingClass.getBaseClass()){
//             // Check to see if there is a base class initializer.
//             var baseInits = memInits.filter(function(memInit){
//                 return memInit.member.identifier === base.className;
//             });
//             memInits = memInits.filter(function(memInit){
//                 return memInit.member.identifier !== base.className;
//             });

//             if (baseInits.length > 1){
//                 this.addNote(CPPError.declaration.ctor.init.multiple_base_inits(this));
//             }
//             else if (baseInits.length === 1){
//                 var mem = MemberInitializer.instance(baseInits[0], {parent: this, scope: this.bodyScope});
//                 mem.compile(this.i_containingClass.baseClassEntities[0]);
//                 this.memberInitializers.push(mem);
//             }
//             else{
//                 var mem = DefaultMemberInitializer.instance(this.ast, {parent: this, scope: this.bodyScope});
//                 mem.compile(this.i_containingClass.baseClassEntities[0]);
//                 this.memberInitializers.push(mem);
//                 mem.isMemberInitializer = true;
//             }
//         }

//         // Initialize non-static data members of the class

//         // Create a map of name to initializer. Initially all initializers are null.
//         var initMap = {};
//         this.i_containingClass.memberSubobjectEntities.forEach(function(objMember){
//             initMap[objMember.name] = objMember;
//         });

//         // Iterate through all the member initializers and associate them with appropriate member
//         for(var i = 0; i < memInits.length; ++i){
//             var memInit = memInits[i];

//             // Make sure this type has a member of the given name
//             var memberName = memInit.member.identifier;
//             if (initMap.hasOwnProperty(memberName)) {
//                 var mem = MemberInitializer.instance(memInit, {parent: this, scope: this.bodyScope});
//                 mem.compile(initMap[memberName]);
//                 initMap[memberName] = mem;
//             }
//             else{
//                 this.addNote(CPPError.declaration.ctor.init.improper_member(this, this.i_containingClass, memberName));
//             }
//         }

//         // Now iterate through members again in declaration order. Add associated member initializer
//         // from above or default initializer if there wasn't one.

//         var self = this;
//         this.i_containingClass.memberSubobjectEntities.forEach(function(objMember){
//             if (isA(initMap[objMember.name], MemberInitializer)){
//                 self.memberInitializers.push(initMap[objMember.name]);
//             }
//             else if (isA(objMember.type, Types.Class) || isA(objMember.type, Types.Array)){
//                 var mem = DefaultMemberInitializer.instance(self.ast, {parent: self, scope: self.bodyScope});
//                 mem.compile(objMember);
//                 self.memberInitializers.push(mem);
//                 mem.isMemberInitializer = true;
//             }
//             else{
//                 // No need to do anything for non-class types since default initialization does nothing
//             }
//         });
//     },

//     isTailChild : function(child){
//         return {isTail: false};
//     },

//     describe : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var desc = {};
//         if (this.isDefaultConstructor){
//             desc.message = "the default constructor for the " + this.i_containingClass.className + " class";
//         }
//         else if (this.isCopyConstructor){
//             desc.message = "the copy constructor for the " + this.i_containingClass.className + " class";
//         }
//         else{
//             desc.message = "a constructor for the " + this.i_containingClass.className + " class";
//         }
//         return desc
//     }
// });




// TODO: These should really be "class aliases" rather than derived classes, however
// it doesn't seem like Typescript has any proper mechanism for this.
// export abstract class CopyInitializer extends DirectInitializer { };
// export interface CompiledCopyInitializer<T extends ObjectType = ObjectType> extends CompiledDirectInitializer<T> { };
// export abstract class RuntimeCopyInitializer extends RuntimeDirectInitializer { };

// export class ReferenceCopyInitializer extends ReferenceDirectInitializer { };
// export interface CompiledReferenceCopyInitializer<T extends ObjectType = ObjectType> extends CompiledReferenceDirectInitializer<T> { };
// export class RuntimeReferenceCopyInitializer extends RuntimeReferenceDirectInitializer { };

// export class AtomicCopyInitializer extends AtomicDirectInitializer { };
// export interface CompiledAtomicCopyInitializer<T extends AtomicType = AtomicType> extends CompiledAtomicDirectInitializer<T> { };
// export class RuntimeAtomicCopyInitializer extends RuntimeAtomicDirectInitializer { };
// export class ArrayCopyInitializer extends ArrayDirectInitializer { };
// export class RuntimeArrayCopyInitializer extends RuntimeArrayDirectInitializer { };
// export class ClassCopyInitializer extends ClassDirectInitializer { };
// export class RuntimeClassCopyInitializer extends RuntimeClassDirectInitializer { };




// /**
//  * Note: only use is in implicitly defined copy constructor
//  */
// export class ArrayMemberInitializer extends Initializer {

//      // Note: this are not MemberSubobjectEntity since they might need to apply to a nested array inside an array member
//     public readonly target: ObjectEntity<BoundedArrayType>;
//     public readonly otherMember: ObjectEntity<BoundedArrayType>;

//     public readonly elementInitializers: DirectInitializer[] = [];

//     public constructor(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>,
//                        otherMember: ObjectEntity<BoundedArrayType>) {
//         super(context);

//         this.target = target;
//         this.otherMember = otherMember;
//         let targetType = target.type;

//         for(let i = 0; i < targetType.length; ++i) {
//             let elemInit;
//             // COMMENTED BELOW BECAUSE MULTIDIMENSIONAL ARRAYS ARE NOT ALLOWED
//             // if (targetType.elemType instanceof BoundedArrayType) {
//             //     elemInit = new ArrayMemberInitializer(context,
//             //         new ArraySubobjectEntity(target, i),
//             //         new ArraySubobjectEntity(<ObjectEntity<BoundedArrayType<BoundedArrayType>>>otherMember, i));
//             // }
//             // else {
//                 elemInit = DirectInitializer.create(context,
//                     new ArraySubobjectEntity(target, i),
//                     [new EntityExpression(context, new ArraySubobjectEntity(otherMember, i))]);
//             // }

//             this.elementInitializers.push(elemInit);
//             this.attach(elemInit);

//             if(elemInit.hasErrors) {
//                 this.addNote(CPPError.declaration.init.array_direct_init(this));
//                 break;
//             }
//         }

//     }

//     public createRuntimeInitializer(this: CompiledArrayMemberInitializer, parent: RuntimeConstruct) {
//         return new RuntimeArrayMemberInitializer(this, parent);
//     }

//     public explain(sim: Simulation, rtConstruct: RuntimeConstruct) : Explanation {
//         let targetDesc = this.target.describe();
//         let targetType = this.target.type;
//         let otherMemberDesc = this.otherMember.describe();

//         if (targetType.length === 0) {
//             return {message: "No initialization is performed for " + (targetDesc.name || targetDesc.message) + "because the array has length 0."};
//         }
//         else {
//             return {message: "Each element of " + (targetDesc.name || targetDesc.message) + " will be default-initialized with the value of the"
//                 + "corresponding element of " + (otherMemberDesc.name || otherMemberDesc.message) + ". For example, " +
//                 this.elementInitializers[0].explain(sim, rtConstruct) };
//         }
//     }
// }

// export interface CompiledArrayMemberInitializer extends ArrayMemberInitializer, SuccessfullyCompiled {
//     readonly elementInitializers: CompiledDirectInitializer[];
// }

// export class RuntimeArrayMemberInitializer extends RuntimeInitializer<CompiledArrayMemberInitializer> {

//     public readonly elementInitializers: RuntimeDirectInitializer[];

//     private index = 0;

//     public constructor (model: CompiledArrayMemberInitializer, parent: RuntimeConstruct) {
//         super(model, parent);
//         this.elementInitializers = this.model.elementInitializers.map((elemInit) => {
//             return elemInit.createRuntimeInitializer(this);
//         });
//     }

//     protected upNextImpl() {
//         if (this.elementInitializers && this.index < this.elementInitializers.length) {
//             this.sim.push(this.elementInitializers[this.index++])
//         }
//         else {
//             target = this.model.target.runtimeLookup(this);
//             this.observable.send("initialized", target);
//             this.startCleaningUp();
//         }
//     }

//     public stepForwardImpl() {
//         // do nothing
//     }
// }





// export var ParameterInitializer = CopyInitializer.extend({
//     _name : "ParameterInitializer",

//     explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var exp = ParameterInitializer._parent.explain.apply(this, arguments);
//         exp.message = exp.message + "\n\n(Parameter passing is done by copy-initialization.)";
//         return exp;
//     }
// });

// export var ReturnInitializer = CopyInitializer.extend({
//     _name : "ReturnInitializer",

//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct) {

//         // Need to handle return-by-reference differently, since there is no actual reference that
//         // gets bound. (The runtimeLookup for the return entity would yield null). Instead, we just
//         // set the return object for the enclosing function to the evaluated argument (which should
//         // have yielded an object).
//         if (isA(this.entity.type, Types.Reference)) {
//             inst.containingRuntimeFunction().setReturnValue(inst.childInstances.args[0].evalResult);
//             this.done(sim, inst);
//             return;
//         }

//         return ReturnInitializer._parent.stepForward.apply(this, arguments);
//     }
// });

// export var MemberInitializer = DirectInitializer.extend({
//     _name : "MemberInitializer",
//     isMemberInitializer: true
// });

// export var DefaultMemberInitializer = DefaultInitializer.extend({
//     _name : "DefaultMemberInitializer",
//     isMemberInitializer: true
// });

// export var NewDirectInitializer = DirectInitializer.extend({
//     _name : "NewDirectInitializer",
//     i_runtimeConstructClass : RuntimeNewInitializer
// });


// export var NewDefaultInitializer = DefaultInitializer.extend({
//     _name : "NewDefaultInitializer",
//     i_runtimeConstructClass : RuntimeNewInitializer
// });


export interface InitializerListASTNode extends ASTNode {
    readonly construct_type: "initializer_list";
    readonly args: ExpressionASTNode[];
}

// export var InitializerList = CPPConstruct.extend({
//     _name : "InitializerList",
//     init: function(ast, context) {
//         this.initParent(ast, context);
//         this.initializerListLength = ast.args.length;
//     },
//     compile : function(entity){
//         assert(entity, "Initializer context must specify entity to be initialized!");
//         this.i_entityToInitialize = entity;
//         var ast = this.ast;
//         var type = this.i_entityToInitialize.type;

//         if (!isA(type, Types.Array)){
//             this.addNote(CPPError.declaration.init.list_array(this));
//         }
//         else if (type.length !== ast.args.length){
//             this.addNote(CPPError.declaration.init.list_length(this, type.length));
//         }

//         if (this.hasErrors()){ return; }

//         var list = ast.args;
//         //this.initializerList = [];
//         this.i_childrenToExecute = [];
//         for(var i = 0; i < list.length; ++i){
//             var initListElem = this["arg"+i] = this.i_createAndCompileChildExpr(list[i], type.elemType);
//             this.i_childrenToExecute.push("arg"+i);

//             if(!sameType(initListElem.type, type.elemType)){
//                 this.addNote(CPPError.declaration.init.convert(initListElem, initListElem.type, type.elemType));
//             }
//             else if (initListElem.isNarrowingConversion){
//                 // TODO: as of now, still need to add code that identifies certain conversions as narrowing
//                 this.addNote(CPPError.declaration.init.list_narrowing(initListElem, initListElem.from.type, type.elemType));
//             }
//             //this.initializerList.push(initListElem);
//         }

//         return;
//     },

//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index !== "afterChildren"){
//             return;
//         }
//         var obj = this.i_entityToInitialize.runtimeLookup(sim, inst);

//         var arr = [];
//         for(var i = 0; i < this.initializerListLength; ++i){
//             arr[i] = inst.childInstances["arg"+i].evalResult.getValue();
//         }
//         obj.writeValue(arr);

//         inst.index = "done";
//         this.done(sim, inst);
//     }
// });
