import { assert, assertNever, Mutable } from "../../../util/util";
import { AtomicCopyInitializerOutlet, AtomicDirectInitializerOutlet, ClassCopyInitializerOutlet, ClassDirectInitializerOutlet, ConstructOutlet, ReferenceCopyInitializerOutlet, ReferenceDirectInitializerOutlet } from "../../../view/codeOutlets";
import { TranslationUnitContext } from "../../compilation/contexts";
import { FunctionEntity, ObjectEntity, ObjectEntityType, UnboundReferenceEntity } from "../../compilation/entities";
import { CPPError } from "../../compilation/errors";
import { CPPObject } from "../../runtime/objects";
import { Simulation } from "../../runtime/Simulation";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { AtomicType, BoundedArrayType, Char, CompleteClassType, CompleteObjectType, FunctionType, referenceCompatible, referenceRelated, ReferenceType, ReferredType, sameType, VoidType } from "../../compilation/types";
import { RuntimeConstruct, SuccessfullyCompiled } from "../constructs";
import { allWellTyped, CompiledExpression, Expression } from "../expressions/Expression";
import { RuntimeExpression } from "../expressions/RuntimeExpression";
import { createRuntimeExpression } from "../expressions/expressions";
import { standardConversion } from "../expressions/ImplicitConversion";
import { overloadResolution } from "../../compilation/overloads";
import { CompiledStringLiteralExpression, RuntimeStringLiteralExpression, StringLiteralExpression } from "../expressions/StringLiteralExpression";
import { CompiledFunctionCall, FunctionCall, RuntimeFunctionCall } from "../FunctionCall";
import { Initializer, RuntimeInitializer } from "./Initializer";






export type DirectInitializerKind = "direct" | "copy";

export abstract class DirectInitializer extends Initializer {

    public static create(context: TranslationUnitContext, target: UnboundReferenceEntity, args: readonly Expression[], kind: DirectInitializerKind): ReferenceDirectInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<AtomicType>, args: readonly Expression[], kind: DirectInitializerKind): AtomicDirectInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>, args: readonly Expression[], kind: DirectInitializerKind): ArrayDirectInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<CompleteClassType>, args: readonly Expression[], kind: DirectInitializerKind): ClassDirectInitializer;
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
            return new ClassDirectInitializer(context, <ObjectEntity<CompleteClassType>>target, args, kind);
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

        if (args.length > 1) {
            this.addNote(CPPError.declaration.init.referenceBindMultiple(this));
            this.attachAll(this.args = args);
            return;
        }

        // Below this line, we can assume only one arg
        let arg = args[0];
        if (!arg.isWellTyped()) {
            this.attach(this.arg = arg);
            this.args = [arg];
            return;
        }

        let targetType = target.type;
        let isReferenceCompatible = referenceCompatible(arg.type, targetType);
        let isReferenceRelated = referenceRelated(arg.type, targetType);

        if (arg.valueCategory === "lvalue") {

            if (isReferenceCompatible) {
                // no further checking needed
            }
            else {
                if (isReferenceRelated) {
                    // If they are reference-related, the only thing preventing binding this
                    // reference was a matter of constness
                    this.addNote(CPPError.declaration.init.referenceConstness(this, arg.type, targetType));
                }
                else {
                    // They are not reference-related, but a conversion and temporary might allow the
                    // binding if and only if the reference is const-qualified.
                    // For example (consts below are all necessary):
                    // int i = 2;
                    // const double &dr = i; // convert to int, apply temporary materialization
                    // const string &str = "hi"; // convert to string using ctor, apply temporary materialization
                    if (!targetType.refTo.isConst) {
                        // can't make non-const reference to a prvalue
                        this.addNote(CPPError.declaration.init.referencePrvalueConst(this));
                    }
                    // Generic error for non-reference-compatible type
                    // Note that user-defined conversion functions might come into play here
                    this.addNote(CPPError.declaration.init.referenceType(this, arg.type, targetType));
                }
            }
        }

        else { //arg.valueCategory === "prvalue"
            if (!targetType.refTo.isConst) {
                // can't make non-const reference to a prvalue
                this.addNote(CPPError.declaration.init.referencePrvalueConst(this));
            }


            // can't bind to a prvalue. exception is that prvalues with class type must really be temporary objects
            // we'll allow this for now. note that the lifetimes don't get extended, which is still TODO
            else if (!arg.type.isCompleteClassType()) {
                this.addNote(CPPError.lobster.referencePrvalue(this));
            }
        }

        this.attach(this.arg = arg);
        this.args = [arg];
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
        this.model.target.bindTo(this, <CPPObject<ReferredType<T>>>this.arg.evalResult); //TODO not sure at all why this cast is necessary

        // this.notifyPassing();
        this.observable.send("referenceInitialized", this);
        this.startCleanup();
    }
}

export class AtomicDirectInitializer extends DirectInitializer {
    public readonly construct_type = "AtomicDirectInitializer";

    public readonly target: ObjectEntity<AtomicType>;
    public readonly args: readonly Expression[];
    public readonly arg: Expression;

    public constructor(context: TranslationUnitContext, target: ObjectEntity<AtomicType>, args: readonly Expression[], kind: DirectInitializerKind) {
        super(context, kind);

        this.target = target;

        let targetType = target.type;

        assert(args.length > 0, "Direct initialization must have at least one argument. (Otherwise it should be a default initialization.)");

        if (args.length > 1) {
            this.arg = args[0];
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
        target.initializeValue(this.arg.evalResult);
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

            if (firstArg.type.numElems > targetType.numElems) {
                this.addNote(CPPError.declaration.init.stringLiteralLength(this, firstArg.type.numElems, targetType.numElems));
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
        while (charsToWrite.length < target.type.numElems) {
            charsToWrite.push(Char.NULL_CHAR);
        }

        let arrayElemSubobjects = target.getArrayElemSubobjects();

        // should be true if compilation was successful
        assert(charsToWrite.length == arrayElemSubobjects.length);

        charsToWrite.forEach((c, i) => arrayElemSubobjects[i].initializeValue(c));

        target.beginLifetime();
        this.observable.send("arrayObjectInitialized", this);
        this.startCleanup();
    }
}


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

        this.ctorCall = new FunctionCall(context, this.ctor, args, target.type.cvUnqualified());
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

    public readonly ctorCall?: RuntimeFunctionCall<FunctionType<VoidType>>;

    private index = "callCtor";

    public constructor(model: CompiledClassDirectInitializer<T>, parent: RuntimeConstruct) {
        super(model, parent);
    }

    protected upNextImpl() {
        if (this.index === "callCtor") {
            (<Mutable<this>>this).ctorCall = this.model.ctorCall.createRuntimeFunctionCall(this, this.model.target.runtimeLookup(this));
            this.sim.push(this.ctorCall!);
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
