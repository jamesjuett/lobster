import { ASTNode, PotentialFullExpression, SuccessfullyCompiled, RuntimePotentialFullExpression, TranslationUnitContext, RuntimeConstruct, CPPConstruct, CompiledTemporaryDeallocator } from "./constructs";
import { ExpressionASTNode } from "./expressions";
import { ObjectEntity, UnboundReferenceEntity, ArraySubobjectEntity } from "./entities";
import { ObjectType, AtomicType, BoundedArrayType, referenceCompatible, sameType } from "./types";
import { assertFalse } from "../util/util";
import { CPPError } from "./errors";
import { Simulation } from "./Simulation";
import { CPPObject } from "./objects";
import { standardConversion } from "./standardConversions";
import { Expression, CompiledExpression, RuntimeExpression } from "./expressionBase";

export type InitializerASTNode = DirectInitializerASTNode | CopyInitializerASTNode;

export abstract class Initializer extends PotentialFullExpression {

    public abstract readonly target: ObjectEntity | UnboundReferenceEntity;

    public abstract createRuntimeInitializer(parent: RuntimeConstruct) : RuntimeInitializer;

    public isTailChild(child: CPPConstruct) {
        return {isTail: true};
    }

}

export interface CompiledInitializer<T extends ObjectType = ObjectType> extends Initializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<T> | UnboundReferenceEntity<T>;
} 

export abstract class RuntimeInitializer<C extends CompiledInitializer = CompiledInitializer> extends RuntimePotentialFullExpression<C> {

    protected constructor (model: C, parent: RuntimeConstruct) {
        super(model, "initializer", parent);
    }

}





export abstract class DefaultInitializer extends Initializer {

    public static create(context: TranslationUnitContext, target: UnboundReferenceEntity) : ReferenceDefaultInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<AtomicType>) : AtomicDefaultInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>) : ArrayDefaultInitializer;
    // public static create(context: TranslationUnitContext, target: ObjectEntity<ClassType>) : ClassDefaultInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<ObjectType>) : DefaultInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity | UnboundReferenceEntity) : DefaultInitializer {
        if ((<UnboundReferenceEntity>target).bindTo) {
            return new ReferenceDefaultInitializer(context, <UnboundReferenceEntity> target);
        }
        else if (target.type instanceof AtomicType) {
            return new AtomicDefaultInitializer(context, <ObjectEntity<AtomicType>> target);
        }
        else if (target.type instanceof BoundedArrayType) {
            return new ArrayDefaultInitializer(context, <ObjectEntity<BoundedArrayType>> target);
        }
        // else if (target.type instanceof ClassType) {
        //     return new ClassDefaultInitializer(context, <ObjectEntity<ClassType>> target);
        // }
        else{
            return assertFalse();
        }
    }

    public abstract createRuntimeInitializer<T extends ObjectType>(this: CompiledDefaultInitializer<T>, parent: RuntimeConstruct) : RuntimeDefaultInitializer<T>;
}

export interface CompiledDefaultInitializer<T extends ObjectType = ObjectType> extends DefaultInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<T>;
}

export abstract class RuntimeDefaultInitializer<T extends ObjectType = ObjectType, C extends CompiledDefaultInitializer<T> = CompiledDefaultInitializer<T>> extends RuntimeInitializer<C> {

    protected constructor (model: C, parent: RuntimeConstruct) {
        super(model, parent);
    }
}

export class ReferenceDefaultInitializer extends DefaultInitializer {

    public readonly target: UnboundReferenceEntity;

    public constructor(context: TranslationUnitContext, target: UnboundReferenceEntity) {
        super(context);
        this.target = target;

        // Cannot default initialize a reference
        this.addNote(CPPError.declaration.init.referenceBind(this));
    }

    public createRuntimeInitializer(parent: RuntimeConstruct) : never {
        return assertFalse("A default initializer for a reference is not allowed.");
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) : never {
        return assertFalse("A default initializer for a reference is not allowed.");
    }
}

// Note: No CompiledReferenceDefaultInitializer or RuntimeReferenceDefaultInitializer classes since
//       default initialization of a reference is always ill-formed.


export class AtomicDefaultInitializer extends DefaultInitializer {

    public readonly target: ObjectEntity<AtomicType>;

    public constructor(context: TranslationUnitContext, target: ObjectEntity<AtomicType>) {
        super(context);
        this.target = target;
    }

    public createRuntimeInitializer<T extends AtomicType>(this: CompiledAtomicDefaultInitializer<T>, parent: RuntimeConstruct) : RuntimeAtomicDefaultInitializer<T>;
    public createRuntimeInitializer<T extends ObjectType>(this: CompiledDefaultInitializer<T>, parent: RuntimeConstruct) : never;
    public createRuntimeInitializer<T extends AtomicType>(this: CompiledAtomicDefaultInitializer<T>, parent: RuntimeConstruct) : RuntimeAtomicDefaultInitializer<T> {
        return new RuntimeAtomicDefaultInitializer(this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.describe();
        return {message: "No initialization will take place. " + (targetDesc.name || targetDesc.message) + " will have a junk value."};
    }
}

export interface CompiledAtomicDefaultInitializer<T extends AtomicType = AtomicType> extends AtomicDefaultInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<T>;
}

export class RuntimeAtomicDefaultInitializer<T extends AtomicType = AtomicType> extends RuntimeDefaultInitializer<T, CompiledAtomicDefaultInitializer<T>> {

    public readonly target: CPPObject<T>;

    public constructor (model: CompiledAtomicDefaultInitializer<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.target = this.model.target.runtimeLookup(this);
    }
	
    protected upNextImpl() {
        // No initialization. Object has junk value.
        this.observable.send("initialized", this.target);
        this.startCleanup();
    }

    public stepForwardImpl() {
        // do nothing
    }
}

export class ArrayDefaultInitializer extends DefaultInitializer {

    public readonly target: ObjectEntity<BoundedArrayType>;
    public readonly elementInitializers?: DefaultInitializer[];

    public constructor(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>) {
        super(context);
        
        this.target = target;

        // If it's an array of atomic types, do nothing.
        let type = this.target.type;
        if (type.elemType instanceof AtomicType) {
            // Do nothing
        }
        else {
            this.elementInitializers = [];
            for(let i = 0; i < type.length; ++i){
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

    public createRuntimeInitializer<T extends BoundedArrayType>(this: CompiledArrayDefaultInitializer<T>, parent: RuntimeConstruct) : RuntimeArrayDefaultInitializer<T>;
    public createRuntimeInitializer<T extends ObjectType>(this: CompiledDefaultInitializer<T>, parent: RuntimeConstruct) : never;
    public createRuntimeInitializer<T extends BoundedArrayType>(this: CompiledArrayDefaultInitializer<T>, parent: RuntimeConstruct) : RuntimeArrayDefaultInitializer<T> {
        return new RuntimeArrayDefaultInitializer(this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.describe();
        let targetType = this.target.type;
        
        if (targetType.length === 0) {
            return {message: "No initialization is performed for " + (targetDesc.name || targetDesc.message) + "because the array has length 0."};
        }
        else if (targetType.elemType instanceof AtomicType) {
            return {message: "No initialization will take place. The elements of " + (targetDesc.name || targetDesc.message) + " will have junk values." };
        }
        else {
            return {message: "Each element of " + (targetDesc.name || targetDesc.message) + " will be default-initialized. For example, " +
                this.elementInitializers![0].explain(sim, rtConstruct) };
        }
    }

}

export interface CompiledArrayDefaultInitializer<T extends BoundedArrayType = BoundedArrayType> extends ArrayDefaultInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<T>;
    readonly elementInitializers?: CompiledDefaultInitializer<T["elemType"]>[];
}

export class RuntimeArrayDefaultInitializer<T extends BoundedArrayType = BoundedArrayType> extends RuntimeDefaultInitializer<T, CompiledArrayDefaultInitializer<T>> {

    public readonly target: CPPObject<T>;
    public readonly elementInitializers?: RuntimeDefaultInitializer<T["elemType"]>[];

    private index = 0;

    public constructor (model: CompiledArrayDefaultInitializer<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.target = this.model.target.runtimeLookup(this);
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
            this.observable.send("initialized", this.target);
            this.startCleanup();
        }
    }

    public stepForwardImpl() {
        // do nothing
    }
    
}

// export class ClassDefaultInitializer extends DefaultInitializer {

//     public readonly target: ObjectEntity<ClassType>;
//     public readonly ctor: ConstructorEntity?;
//     public readonly ctorCall: MemberFunctionCall?;

//     public constructor(context: TranslationUnitContext, target: ObjectEntity<ClassType>) {
//         super(context);

//         this.target = target;

//         // Try to find default constructor. Not using lookup because constructors have no name.
//         this.ctor = overloadResolution(target.type.cppClass.ctors, []);
//         if (!this.ctor) {
//             this.addNote(CPPError.declaration.init.no_default_constructor(this, this.target));
//             return;
//         }
        
//         //MemberFunctionCall args are: context, function to call, receiver, ctor args
//         this.ctorCall = new MemberFunctionCall(context, this.ctor, this.target, []);
//         this.attach(this.ctorCall);
//         // this.args = this.ctorCall.args;
//     }

//     public createRuntimeInitializer<T extends ClassType>(this: CompiledClassDefaultInitializer<T>, parent: RuntimeConstruct) : RuntimeClassDefaultInitializer<T>;
//     public createRuntimeInitializer<T extends ObjectType>(this: CompiledDefaultInitializer<T>, parent: RuntimeConstruct) : never;
//     public createRuntimeInitializer<T extends ClassType>(this: CompiledClassDefaultInitializer<T>, parent: RuntimeConstruct) : RuntimeClassDefaultInitializer<T> {
//         return new RuntimeClassDefaultInitializer(this, parent);
//     }

//     public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
//         let targetDesc = this.target.describe();
//         // TODO: what if there is an error that causes no ctor to be found/available
//         return {message: (targetDesc.name || targetDesc.message) + " will be initialized using " + this.ctorCall.describe().message};
//     }
// }

// export interface CompiledClassDefaultInitializer<T extends ClassType = ClassType> extends ClassDefaultInitializer, SuccessfullyCompiled {

//     readonly target: ObjectEntity<T>;
//     readonly ctor: ConstructorEntity<T>;
//     readonly ctorCall: CompiledFunctionCall<VoidType, "prvalue">;
// }

// export class RuntimeClassDefaultInitializer<T extends ClassType = ClassType> extends RuntimeDefaultInitializer<T, CompiledClassDefaultInitializer<T>> {

//     public readonly target: CPPObject<ClassType>;
//     public readonly ctorCall: RuntimeFunctionCall<VoidType, "prvalue">;

//     private index = "callCtor";
    
//     public constructor (model: CompiledClassDefaultInitializer<T>, parent: RuntimeConstruct) {
//         super(model, parent);
//         this.target = model.target.runtimeLookup(this);
//         this.ctorCall = this.model.ctorCall.createRuntimeFunctionCall(this);
//     }
	
//     protected upNextImpl() {
//         if (this.index === "callCtor") {
//             this.sim.push(this.ctorCall);
//             this.index = "done";
//         }
//         else {
//             this.observable.send("initialized", this.target);
//             this.startCleaningUp();
//         }
//     }

//     public stepForwardImpl() {
//         // do nothing
//     }

// }







export interface DirectInitializerASTNode extends ASTNode {
    construct_type: "direct_initializer";
    args: ExpressionASTNode[];
}



export abstract class DirectInitializer extends Initializer {

    // NOTE: removed since I don't think it makes sense to create an initializer directly from an AST (and it doesn't match the base signature of CPPConstruct.createFromAST)
    // public static createFromAST<T extends Type>(ast: DirectInitializerASTNode, context: TranslationUnitContext, target: ObjectEntity<T>) {
    //     return this.create(context, target,
    //         ast.args.map((a) => {
    //             return Expression.createFromAST(a, context);
    //         })
    //     )
    // }

    public static create(context: TranslationUnitContext, target: UnboundReferenceEntity, args: readonly Expression[]) : ReferenceDirectInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity<AtomicType>, args: readonly Expression[]) : AtomicDirectInitializer;
    // public static create(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>, args: readonly Expression[]) : ArrayDirectInitializer;
    // public static create(context: TranslationUnitContext, target: ObjectEntity<ClassType>, args: readonly Expression[]) : ClassDirectInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity, args: readonly Expression[]) : DirectInitializer;
    public static create(context: TranslationUnitContext, target: ObjectEntity | UnboundReferenceEntity, args: readonly Expression[]) : DirectInitializer {
        if ((<UnboundReferenceEntity>target).bindTo) {
            return new ReferenceDirectInitializer(context, <UnboundReferenceEntity>target, args);
        }
        else if (target.type instanceof AtomicType) {
            return new AtomicDirectInitializer(context, <ObjectEntity<AtomicType>> target, args);
        }
        // else if (target.type instanceof BoundedArrayType) {
        //     return new ArrayDirectInitializer(context, <ObjectEntity<BoundedArrayType>> target, args);
        // }
        // else if (target.type instanceof ClassType) {
        //     return new ClassDirectInitializer(context, <ObjectEntity<ClassType>> target, args);
        // }
        else{
            return assertFalse();
        }
    }

    public abstract readonly args: readonly Expression[];

    public abstract createRuntimeInitializer<T extends ObjectType>(this: CompiledDirectInitializer<T>, parent: RuntimeConstruct) : RuntimeDirectInitializer<T>;
}


export interface CompiledDirectInitializer<T extends ObjectType = ObjectType> extends DirectInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<T> | UnboundReferenceEntity<T>;
    readonly args: readonly CompiledExpression[];
}

export abstract class RuntimeDirectInitializer<T extends ObjectType = ObjectType, C extends CompiledDirectInitializer<T> = CompiledDirectInitializer<T>> extends RuntimeInitializer<C> {

    protected constructor (model: C, parent: RuntimeConstruct) {
        super(model, parent);
    }

}


export class ReferenceDirectInitializer extends DirectInitializer {

    public readonly target: UnboundReferenceEntity;
    public readonly args: readonly Expression[];
    public readonly arg?: Expression;

    public constructor(context: TranslationUnitContext, target: UnboundReferenceEntity, args: readonly Expression[]) {
        super(context);
        this.target = target;
        
        this.args = args;
        args.forEach((a) => {this.attach(a);});

        // Note: With a reference, no conversions are done
        if (this.args.length > 1){
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
        else if (this.arg.valueCategory === "prvalue" && !targetType.isConst){
            this.addNote(CPPError.declaration.init.referencePrvalueConst(this));
        }
        else if (this.arg.valueCategory === "prvalue"){
            this.addNote(CPPError.lobster.referencePrvalue(this));
        }
    }

    public createRuntimeInitializer<T extends ObjectType>(this: CompiledReferenceDirectInitializer<T>, parent: RuntimeConstruct) : RuntimeReferenceDirectInitializer<T>;
    public createRuntimeInitializer<T extends ObjectType>(this: CompiledDirectInitializer<T>, parent: RuntimeConstruct) : never;
    public createRuntimeInitializer<T extends ObjectType>(this: any, parent: RuntimeConstruct) : RuntimeReferenceDirectInitializer<T> {
        return new RuntimeReferenceDirectInitializer(<CompiledReferenceDirectInitializer<T>>this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.describe();
        let rhsDesc = this.args[0].describeEvalResult(0);
        return {message: (targetDesc.name || targetDesc.message) + " will be bound to " + (rhsDesc.name || rhsDesc.message) + "."};
    }
}

export interface CompiledReferenceDirectInitializer<T extends ObjectType = ObjectType> extends ReferenceDirectInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: UnboundReferenceEntity<T>;
    readonly args: readonly CompiledExpression[];

    // Note: Compilation of the initializer checks for reference compatibility, which should ensure
    // that the expression actually has the same type T as the reference to be bound. (For subtypes
    // that are reference compatible, this is fine, since T will still be ClassType for both.)
    readonly arg: CompiledExpression<T, "lvalue">;
}

export class RuntimeReferenceDirectInitializer<T extends ObjectType = ObjectType> extends RuntimeDirectInitializer<T, CompiledReferenceDirectInitializer<T>> {

    public readonly arg: RuntimeExpression<T, "lvalue">;

    private alreadyPushed = false;

    public constructor (model: CompiledReferenceDirectInitializer<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.arg = this.model.arg.createRuntimeExpression(this);
    }

    protected upNextImpl() {
        if (!this.alreadyPushed) {
            this.sim.push(this.arg);
            this.alreadyPushed = true;
        }
    }
    
    public stepForwardImpl() {
        let rtRef = this.model.target.bindTo(this, <CPPObject<T>>this.arg.evalResult);  //TODO not sure at all why this cast is necessary
        this.observable.send("initialized", rtRef);
        this.startCleanup();
    }
}


export class AtomicDirectInitializer extends DirectInitializer {

    public readonly target: ObjectEntity<AtomicType>;
    public readonly args: readonly Expression[];
    public readonly arg?: Expression;

    public constructor(context: TranslationUnitContext, target: ObjectEntity<AtomicType>, args: readonly Expression[]) {
        super(context);
        
        this.target = target;
        
        let targetType = target.type;

        this.args = args;
        args.forEach((a) => {this.attach(a);});

        if (args.length > 1){
            this.addNote(CPPError.declaration.init.scalar_args(this, targetType));
            return;
        }
        
        this.arg = args[0];

        //Attempt standard conversion to declared type, including lvalue to rvalue conversions
        if (!this.arg.isWellTyped()) {
            return;
        }

        let typedArg = standardConversion(this.arg, targetType);
        this.arg = typedArg;

        if (!sameType(typedArg.type, targetType)) {
            this.addNote(CPPError.declaration.init.convert(this, typedArg.type, targetType));
        }
        
        // TODO: need to check that the arg is a prvalue
        
        
    }

    public createRuntimeInitializer<T extends AtomicType>(this: CompiledAtomicDirectInitializer<T>, parent: RuntimeConstruct) : RuntimeAtomicDirectInitializer<T>;
    public createRuntimeInitializer<T extends ObjectType>(this: CompiledDirectInitializer<T>, parent: RuntimeConstruct) : never;
    public createRuntimeInitializer<T extends AtomicType>(this: any, parent: RuntimeConstruct) : RuntimeAtomicDirectInitializer<T> {
        return new RuntimeAtomicDirectInitializer(<CompiledAtomicDirectInitializer<T>>this, parent);
    }

    // TODO; change explain everywhere to be separate between compile time and runtime constructs
    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.runtimeLookup(rtConstruct).describe();
        let rhsDesc = this.args[0].describeEvalResult(0);
        return {message: (targetDesc.name || targetDesc.message) + " will be initialized with " + (rhsDesc.name || rhsDesc.message) + "."};
    }
}

export interface CompiledAtomicDirectInitializer<T extends AtomicType = AtomicType> extends AtomicDirectInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly target: ObjectEntity<T>;
    readonly args: readonly CompiledExpression[];
    readonly arg: CompiledExpression<T, "prvalue">;
}

export class RuntimeAtomicDirectInitializer<T extends AtomicType = AtomicType> extends RuntimeDirectInitializer<T, CompiledAtomicDirectInitializer<T>> {

    public readonly target: CPPObject<AtomicType>;
    public readonly arg: RuntimeExpression<T, "prvalue">;

    private alreadyPushed = false;

    public constructor (model: CompiledAtomicDirectInitializer<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.target = this.model.target.runtimeLookup(this);
        this.arg = this.model.arg.createRuntimeExpression(this);
    }

    protected upNextImpl() {
        if (!this.alreadyPushed) {
            this.sim.push(this.arg);
            this.alreadyPushed = true;
        }
    }

    public stepForwardImpl() {
        this.target.writeValue(this.arg.evalResult);
        this.observable.send("initialized", this.target);
        this.startCleanup();
    }
}


// /**
//  * Note: Only allowed use is to initialize a char array from a string literal, but this can readily be
//  * created in the course of compiling a program if the code attempts to directly initialize an array. That's
//  * desirable, because this class will give the appropriate error messages if it's anything other than a
//  * char array initialized from a string literal.
//  */
// export class ArrayDirectInitializer extends DirectInitializer {

//     public readonly target: ObjectEntity<BoundedArrayType>;
//     public readonly args: readonly Expression[];
//     public readonly arg?: StringLiteral;

//     public constructor(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>, args: readonly Expression[]) {
//         super(context);
        
//         this.target = target;
//         let targetType = target.type;

//         // TS type system ensures target is array type, need to check element type and that args are a single string literal
//         if (targetType.elemType instanceof Char && args.length === 1 && args[0] instanceof StringLiteral) {
//             let arg = this.arg = <StringLiteral>args[0];
            
//             if (arg.type.length > targetType.length){
//                 this.addNote(CPPError.declaration.init.stringLiteralLength(this, arg.type.length, targetType.length));
//             }
//         }
//         else {
//             this.addNote(CPPError.declaration.init.array_string_literal(this, targetType));
//         }

//         this.args = args;
//         args.forEach((a) => {this.attach(a);});
        
//     }

//     public createRuntimeInitializer(parent: RuntimeConstruct) {
//         return new RuntimeArrayDirectInitializer(this, parent);
//     }

//     // TODO; change explain everywhere to be separate between compile time and runtime constructs
//     public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
//         let targetDesc = this.target.runtimeLookup(rtConstruct).describe();
//         let rhsDesc = this.args[0].describeEvalResult(0);
//         return {message: (targetDesc.name || targetDesc.message) + " (a character array) will be initialized from the string literal " + rhsDesc + ". Remember that a null character is automatically appended!"};
//     }
// }

// export interface CompiledArrayDirectInitializer extends ArrayDirectInitializer, SuccessfullyCompiled {
//     readonly target: ObjectEntity<BoundedArrayType<Char>>;
//     readonly args: CompiledExpression[];
//     readonly arg: CompiledStringLiteral;
// }

// export class RuntimeArrayDirectInitializer extends RuntimeDirectInitializer<BoundedArrayType<Char>, CompiledArrayDirectInitializer> {

//     public readonly target: CPPObject<BoundedArrayType>;
//     public readonly arg: RuntimeStringLiteral;

//     private alreadyPushed = false;

//     public constructor (model: CompiledArrayDirectInitializer, parent: RuntimeConstruct) {
//         super(model, parent);
//         this.target = this.model.target.runtimeLookup(this);
//         this.arg = this.model.arg.createRuntimeExpression(this);
//     }

//     protected upNextImpl() {
//         if (!this.alreadyPushed) {
//             this.sim.push(this.arg);
//             this.alreadyPushed = true;
//         }
//     }

//     public stepForwardImpl() {
        
//         var charsToWrite = this.arg.evalResult.rawValue();

//         // pad with zeros
//         while (charsToWrite.length < this.target.type.length) {
//             charsToWrite.push(Char.NULL_CHAR);
//         }

//         this.target.writeValue(charsToWrite);
//         this.observable.send("initialized", this.target);
//         this.startCleaningUp();
//     }
// }


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

//     public readonly target: CPPObject<ClassType>;
    
//     public readonly ctorCall: RuntimeFunctionCall<VoidType, "prvalue">;

//     private index = "callCtor";

//     public constructor (model: CompiledClassDirectInitializer<T>, parent: RuntimeConstruct) {
//         super(model, parent);
//         this.target = this.model.target.runtimeLookup(this);
//         this.ctorCall = this.model.ctorCall.createRuntimeFunctionCall(this);
//     }

//     protected upNextImpl() {
//         if (this.index === "callCtor") {
//             this.sim.push(this.ctorCall);
//             this.index = "done";
//         }
//         else {
//             this.observable.send("initialized", this.target);
//             this.startCleaningUp();
//         }
//     }

//     public stepForwardImpl() {
//         // do nothing
//     }
// }



export interface CopyInitializerASTNode extends ASTNode {
    construct_type: "copy_initializer";
    args: ExpressionASTNode[];
}

// TODO: These should really be "class aliases" rather than derived classes, however
// it doesn't seem like Typescript has any proper mechanism for this.
export abstract class CopyInitializer extends DirectInitializer { };
export interface CompiledCopyInitializer<T extends ObjectType = ObjectType> extends CompiledDirectInitializer<T> { };
export abstract class RuntimeCopyInitializer extends RuntimeDirectInitializer { };

export class ReferenceCopyInitializer extends ReferenceDirectInitializer { };
export interface CompiledReferenceCopyInitializer<T extends ObjectType = ObjectType> extends CompiledReferenceDirectInitializer<T> { };
export class RuntimeReferenceCopyInitializer extends RuntimeReferenceDirectInitializer { };

export class AtomicCopyInitializer extends AtomicDirectInitializer { };
export interface CompiledAtomicCopyInitializer<T extends AtomicType = AtomicType> extends CompiledAtomicDirectInitializer<T> { };
export class RuntimeAtomicCopyInitializer extends RuntimeAtomicDirectInitializer { };
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

//     public readonly target: CPPObject<BoundedArrayType>;
//     public readonly elementInitializers: RuntimeDirectInitializer[];

//     private index = 0;

//     public constructor (model: CompiledArrayMemberInitializer, parent: RuntimeConstruct) {
//         super(model, parent);
//         this.target = this.model.target.runtimeLookup(this);
//         this.elementInitializers = this.model.elementInitializers.map((elemInit) => {
//             return elemInit.createRuntimeInitializer(this);
//         });
//     }
	
//     protected upNextImpl() {
//         if (this.elementInitializers && this.index < this.elementInitializers.length) {
//             this.sim.push(this.elementInitializers[this.index++])
//         }
//         else {
//             this.observable.send("initialized", this.target);
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
