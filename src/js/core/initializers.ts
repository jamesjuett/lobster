import { Expression, FunctionCall, StringLiteral, EntityExpression, RuntimeExpression, TypedExpression, CompiledExpression } from "./expressions";
import { InstructionConstruct, ExecutableConstruct, ASTNode, ConstructContext, ExecutableConstructContext, RuntimeInstruction, ExecutableRuntimeConstruct, RuntimeConstruct, PotentialFullExpression, CompiledConstruct, CompiledFunctionCall, RuntimeFunctionCall } from "./constructs";
import { CPPEntity, overloadResolution, FunctionEntity, ConstructorEntity, ArraySubobjectEntity, ObjectEntity, MemberSubobjectEntity, UnboundReferenceEntity } from "./entities";
import { Reference, ClassType, AtomicType, ArrayType, Type, referenceCompatible, sameType, Char, ObjectType, Int, VoidType } from "./types";
import { CPPError, Explanation } from "./errors";
import { assertFalse } from "../util/util"
import { CPPObject } from "./objects";
import { Simulation } from "./Simulation";
import { Value } from "./runtimeEnvironment";
import { standardConversion } from "./standardConversions";


export abstract class Initializer extends PotentialFullExpression {

    public abstract readonly target: ObjectEntity | UnboundReferenceEntity;

    public abstract createRuntimeInitializer(parent: ExecutableRuntimeConstruct) : RuntimeInitializer;

    public isTailChild(child: ExecutableConstruct) {
        return {isTail: true};
    }

}

export interface CompiledInitializer<T extends ObjectType = ObjectType> extends Initializer, CompiledConstruct {
    readonly target: ObjectEntity<T>;
} 

export abstract class RuntimeInitializer<C extends CompiledInitializer = CompiledInitializer> extends RuntimeInstruction<C> {

    protected constructor (model: C, parent: ExecutableRuntimeConstruct) {
        super(model, "initializer", parent);
    }

}





export abstract class DefaultInitializer extends Initializer {

    public static create(context: ExecutableConstructContext, target: ReferenceEntity) : ReferenceDefaultInitializer;
    public static create(context: ExecutableConstructContext, target: ObjectEntity<AtomicType>) : AtomicDefaultInitializer;
    public static create(context: ExecutableConstructContext, target: ObjectEntity<ArrayType>) : ArrayDefaultInitializer;
    public static create(context: ExecutableConstructContext, target: ObjectEntity<ClassType>) : ClassDefaultInitializer;
    public static create(context: ExecutableConstructContext, target: ObjectEntity) : DefaultInitializer {
        if (target instanceof ReferenceEntity) {
            return new ReferenceDefaultInitializer(context, <ReferenceEntity> target);
        }
        else if (target.type instanceof AtomicType) {
            return new AtomicDefaultInitializer(context, <ObjectEntity<AtomicType>> target);
        }
        else if (target.type instanceof ArrayType) {
            return new ArrayDefaultInitializer(context, <ObjectEntity<ArrayType>> target);
        }
        else if (target.type instanceof ClassType) {
            return new ClassDefaultInitializer(context, <ObjectEntity<ClassType>> target);
        }
        else{
            return assertFalse();
        }
    }
    
    public abstract createRuntimeInitializer(parent: ExecutableRuntimeConstruct) : RuntimeDefaultInitializer;
}

export interface CompiledDefaultInitializer<T extends ObjectType = ObjectType> extends DefaultInitializer, CompiledConstruct {
    readonly target: ObjectEntity<T>;
}

export abstract class RuntimeDefaultInitializer<T extends ObjectType, C extends CompiledDefaultInitializer<T> = CompiledDefaultInitializer<T>> extends RuntimeInitializer<C> {

    protected constructor (model: C, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
    }
}

export class ReferenceDefaultInitializer extends DefaultInitializer {

    public readonly target: UnboundReferenceEntity;

    public constructor(context: ExecutableConstructContext, target: UnboundReferenceEntity) {
        super(context);
        this.target = target;

        // Cannot default initialize a reference
        this.addNote(CPPError.declaration.init.referenceBind(this));
    }

    public createRuntimeInitializer(parent: ExecutableRuntimeConstruct) : never {
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

    public constructor(context: ExecutableConstructContext, target: ObjectEntity<AtomicType>) {
        super(context);
        this.target = target;
    }

    public createRuntimeInitializer<T extends AtomicType>(this: CompiledAtomicDefaultInitializer<T>, parent: ExecutableRuntimeConstruct) : RuntimeAtomicDefaultInitializer<T> {
        return new RuntimeAtomicDefaultInitializer(this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.describe();
        return {message: "No initialization will take place. " + (targetDesc.name || targetDesc.message) + " will have a junk value."};
    }
}

export interface CompiledAtomicDefaultInitializer<T extends AtomicType = AtomicType> extends AtomicDefaultInitializer, CompiledConstruct {
    readonly target: ObjectEntity<T>;
}

export class RuntimeAtomicDefaultInitializer<T extends AtomicType = AtomicType> extends RuntimeDefaultInitializer<T, CompiledAtomicDefaultInitializer<T>> {

    public readonly target: CPPObject<T>;

    public constructor (model: CompiledAtomicDefaultInitializer<T>, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.target = this.model.target.runtimeLookup(this);
    }
	
    protected upNextImpl() {
        // No initialization. Object has junk value.
        this.observable.send("initialized", this.target);
        this.sim.pop();
    }

    public stepForwardImpl() {
        // do nothing
    }
}

export class ArrayDefaultInitializer extends DefaultInitializer {

    public readonly target: ObjectEntity<ArrayType>;
    public readonly elementInitializers?: DefaultInitializer[];

    public constructor(context: ExecutableConstructContext, target: ObjectEntity<ArrayType>) {
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
                if (elemInit.hasErrors) {
                    this.addNote(CPPError.declaration.init.array_default_init(this));
                    break;
                }
            }
        }

    }

    public createRuntimeInitializer<T extends ArrayType>(this: CompiledArrayDefaultInitializer<T>, parent: ExecutableRuntimeConstruct) : RuntimeArrayDefaultInitializer<T> {
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

export interface CompiledArrayDefaultInitializer<T extends ArrayType = ArrayType> extends ArrayDefaultInitializer, CompiledConstruct {
    
    readonly target: ObjectEntity<T>;
    readonly elementInitializers?: CompiledDefaultInitializer<T["elemType"]>[];
}

export class RuntimeArrayDefaultInitializer<T extends ArrayType = ArrayType> extends RuntimeDefaultInitializer<T, CompiledArrayDefaultInitializer<T>> {

    public readonly target: CPPObject<T>;
    public readonly elementInitializers?: RuntimeDefaultInitializer<T["elemType"]>[];

    private index = 0;

    public constructor (model: CompiledArrayDefaultInitializer<T>, parent: ExecutableRuntimeConstruct) {
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
            this.sim.pop();
        }
    }

    public stepForwardImpl() {
        // do nothing
    }
    
}

export class ClassDefaultInitializer extends DefaultInitializer {

    public readonly target: ObjectEntity<ClassType>;
    public readonly ctor: ConstructorEntity?;
    public readonly ctorCall: MemberFunctionCall?;

    public constructor(context: ExecutableConstructContext, target: ObjectEntity<ClassType>) {
        super(context);

        this.target = target;

        // Try to find default constructor. Not using lookup because constructors have no name.
        this.ctor = overloadResolution(target.type.cppClass.ctors, []);
        if (!this.ctor) {
            this.addNote(CPPError.declaration.init.no_default_constructor(this, this.target));
            return;
        }
        
        //MemberFunctionCall args are: context, function to call, receiver, ctor args
        this.ctorCall = new MemberFunctionCall(context, this.ctor, this.target, []);
        this.attach(this.ctorCall);
        // this.args = this.ctorCall.args;
    }

    public createRuntimeInitializer<T extends ClassType>(this: CompiledClassDefaultInitializer<T>, parent: ExecutableRuntimeConstruct) : RuntimeClassDefaultInitializer<T> {
        return new RuntimeClassDefaultInitializer(this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.describe();
        // TODO: what if there is an error that causes no ctor to be found/available
        return {message: (targetDesc.name || targetDesc.message) + " will be initialized using " + this.ctorCall.describe().message};
    }
}

export interface CompiledClassDefaultInitializer<T extends ClassType = ClassType> extends ClassDefaultInitializer, CompiledConstruct {

    readonly target: ObjectEntity<T>;
    readonly ctor: ConstructorEntity<T>;
    readonly ctorCall: CompiledFunctionCall<VoidType, "prvalue">;
}

export class RuntimeClassDefaultInitializer<T extends ClassType = ClassType> extends RuntimeDefaultInitializer<T, CompiledClassDefaultInitializer<T>> {

    public readonly target: CPPObject<ClassType>;
    public readonly ctorCall: RuntimeFunctionCall<VoidType, "prvalue">;

    private index = "callCtor";
    
    public constructor (model: CompiledClassDefaultInitializer<T>, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.target = model.target.runtimeLookup(this);
        this.ctorCall = this.model.ctorCall.createRuntimeFunctionCall(this);
    }
	
    protected upNextImpl() {
        if (this.index === "callCtor") {
            this.sim.push(this.ctorCall);
            this.index = "done";
        }
        else {
            this.observable.send("initialized", this.target);
            this.sim.pop();
        }
    }

    public stepForwardImpl() {
        // do nothing
    }

}







export interface DirectInitializerASTNode extends ASTNode {
    args: ExpressionASTNode[];
}

export type CopyInitializerASTNode = DirectInitializerASTNode;

export abstract class DirectInitializer extends Initializer {

    // NOTE: removed since I don't think it makes sense to create an initializer directly from an AST (and it doesn't match the base signature of CPPConstruct.createFromAST)
    // public static createFromAST<T extends Type>(ast: DirectInitializerASTNode, context: ExecutableConstructContext, target: ObjectEntity<T>) {
    //     return this.create(context, target,
    //         ast.args.map((a) => {
    //             return Expression.createFromAST(a, context);
    //         })
    //     )
    // }

    public static create(context: ExecutableConstructContext, target: UnboundReferenceEntity, args: Expression[]) : ReferenceDirectInitializer;
    public static create(context: ExecutableConstructContext, target: ObjectEntity<AtomicType>, args: Expression[]) : AtomicDirectInitializer;
    public static create(context: ExecutableConstructContext, target: ObjectEntity<ArrayType>, args: Expression[]) : ArrayDirectInitializer;
    public static create(context: ExecutableConstructContext, target: ObjectEntity<ClassType>, args: Expression[]) : ClassDirectInitializer;
    public static create(context: ExecutableConstructContext, target: ObjectEntity, args: Expression[]) : DirectInitializer;
    public static create(context: ExecutableConstructContext, target: ObjectEntity | UnboundReferenceEntity, args: Expression[]) : DirectInitializer {
        if (target instanceof ReferenceEntity) {
            return new ReferenceDirectInitializer(context, target, args);
        }
        else if (target.type instanceof AtomicType) {
            return new AtomicDirectInitializer(context, <ObjectEntity<AtomicType>> target, args);
        }
        else if (target.type instanceof ArrayType) {
            return new ArrayDirectInitializer(context, <ObjectEntity<ArrayType>> target, args);
        }
        else if (target.type instanceof ClassType) {
            return new ClassDirectInitializer(context, <ObjectEntity<ClassType>> target, args);
        }
        else{
            return assertFalse();
        }
    }

    public abstract readonly args: Expression[];

    // NOTE: this isn't redundant - it's here to make it protected rather than the public inherited one
    protected constructor(context: ExecutableConstructContext) {
        super(context);
    }
    
    public abstract createRuntimeInitializer(parent: ExecutableRuntimeConstruct) : RuntimeDirectInitializer;
}


export interface CompiledDirectInitializer extends DirectInitializer {
    readonly args: CompiledExpression[];
}

export abstract class RuntimeDirectInitializer extends RuntimeInitializer {

    public readonly model!: DirectInitializer; // narrows type of member in base class

    protected constructor (model: DirectInitializer, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
    }

}


export class ReferenceDirectInitializer extends DirectInitializer {

    public readonly target: UnboundReferenceEntity;
    public readonly args: Expression[];

    public constructor(context: ExecutableConstructContext, target: UnboundReferenceEntity, args: Expression[]) {
        super(context);
        this.target = target;
        
        this.args = args;
        args.forEach((a) => {this.attach(a);});

        // Note: With a reference, no conversions are done
        if (this.args.length > 1){
            this.addNote(CPPError.declaration.init.referenceBindMultiple(this));
            return;
        }
        
        let targetType = target.type;
        let arg = this.args[0];
        if (!referenceCompatible(arg.type, targetType)) {
            this.addNote(CPPError.declaration.init.referenceType(this, arg, targetType));
        }
        else if (arg.valueCategory === "prvalue" && !targetType.isConst){
            this.addNote(CPPError.declaration.init.referencePrvalueConst(this));
        }
        else if (arg.valueCategory === "prvalue"){
            this.addNote(CPPError.lobster.referencePrvalue(this));
        }
    }

    public createRuntimeInitializer(this: CompiledReferenceDirectInitializer, parent: ExecutableRuntimeConstruct) {
        return new RuntimeReferenceDirectInitializer(this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.runtimeLookup(rtConstruct).describe();
        let rhsDesc = this.args[0].describeEvalResult(0);
        return {message: (targetDesc.name || targetDesc.message) + " will be bound to " + (rhsDesc.name || rhsDesc.message) + "."};
    }
}

// export namespace ReferenceDirectInitializer {
//     export interface Compiled extends ReferenceDirectInitializer {
//         args: RuntimeExpression.LValue[];
//     }
// }


export interface CompiledReferenceDirectInitializer extends ReferenceDirectInitializer {
    readonly args: CompiledExpression[];
}

export class RuntimeReferenceDirectInitializer extends RuntimeDirectInitializer<CompiledReferenceDirectInitializer> {

    public readonly args: RuntimeExpression[];

    private argIndex = 0;

    public constructor (model: CompiledReferenceDirectInitializer, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.args = this.model.args.map((a) => {
            return a.createRuntimeExpression(this);
        });
    }

    protected upNextImpl() {
        if (this.argIndex < this.args.length) {
            this.sim.push(this.args[this.argIndex++]);
        }
    }
    
    public stepForwardImpl() {
        let rtRef = this.model.target.getRuntimeReference(this);
        rtRef.bindTo(
            <CPPObject>this.args[0].evalResult
        );
        this.observable.send("initialized", rtRef);
        this.sim.pop();
    }
}


export class AtomicDirectInitializer extends DirectInitializer {

    public readonly target: ObjectEntity<AtomicType>;
    public readonly args: Expression[];

    public constructor(context: ExecutableConstructContext, target: ObjectEntity<AtomicType>, args: Expression[]) {
        super(context);
        
        this.target = target;
        
        let targetType = target.type;

        if (args.length > 1){
            this.addNote(CPPError.declaration.init.scalar_args(this, targetType));
        }

        //Attempt standard conversion to declared type, including lvalue to rvalue conversions
        let arg = standardConversion(args[0], targetType);

        if (!sameType(arg.type, targetType)) {
            this.addNote(CPPError.declaration.init.convert(this, arg.type, targetType));
        }
        
        args[0] = arg;
        this.args = args;
        args.forEach((a) => {this.attach(a);});
        
    }

    public createRuntimeInitializer(parent: ExecutableRuntimeConstruct) {
        return new RuntimeAtomicDirectInitializer(this, parent);
    }

    // TODO; change explain everywhere to be separate between compile time and runtime constructs
    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.runtimeLookup(rtConstruct).describe();
        let rhsDesc = this.args[0].describeEvalResult(0);
        return {message: (targetDesc.name || targetDesc.message) + " will be initialized with " + (rhsDesc.name || rhsDesc.message) + "."};
    }
}

export class RuntimeAtomicDirectInitializer extends RuntimeDirectInitializer<AtomicDirectInitializer> {

    public readonly target: CPPObject<AtomicType>;
    public readonly args: RuntimeExpression[];

    private argIndex = 0;

    public constructor (model: AtomicDirectInitializer, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.target = this.model.target.runtimeLookup(this);
        this.args = this.model.args.map((a) => {
            return a.createRuntimeExpression(this);
        });
    }

    protected upNextImpl() {
        if (this.argIndex < this.args.length) {
            this.sim.push(this.args[this.argIndex++]);
        }
    }

    public stepForwardImpl() {
        this.target.writeValue(<Value<AtomicType>>this.args[0].evalResult);
        this.observable.send("initialized", this.target);
        this.sim.pop();
    }
}


/**
 * Note: Only allowed use is to initialize a char array from a string literal
 */
export class ArrayDirectInitializer extends DirectInitializer {

    public readonly target: ObjectEntity<ArrayType>;
    public readonly args: Expression[];

    public constructor(context: ExecutableConstructContext, target: ObjectEntity<ArrayType>, args: Expression[]) {
        super(context);
        
        this.target = target;
        let targetType = target.type;

        // TS type system ensures target is array type, need to check element type and that args are a single string literal
        if (targetType.elemType instanceof Char && args.length === 1 && args[0] instanceof StringLiteral) {
            let arg = <StringLiteral>args[0];
            
            if (arg.type.length > targetType.length){
                this.addNote(CPPError.declaration.init.stringLiteralLength(this, arg.type.length, targetType.length));
            }
        }
        else {
            this.addNote(CPPError.declaration.init.array_string_literal(this, targetType));
        }

        this.args = args;
        args.forEach((a) => {this.attach(a);});
        
    }

    public createRuntimeInitializer(parent: ExecutableRuntimeConstruct) {
        return new RuntimeArrayDirectInitializer(this, parent);
    }

    // TODO; change explain everywhere to be separate between compile time and runtime constructs
    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.runtimeLookup(rtConstruct).describe();
        let rhsDesc = this.args[0].describeEvalResult(0);
        return {message: (targetDesc.name || targetDesc.message) + " (a character array) will be initialized from the string literal " + rhsDesc + ". Remember that a null character is automatically appended!"};
    }
}

export class RuntimeArrayDirectInitializer extends RuntimeDirectInitializer<ArrayDirectInitializer> {

    public readonly target: CPPObject<ArrayType>;
    public readonly args: RuntimeExpression[];

    private argIndex = 0;

    public constructor (model: ArrayDirectInitializer, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.target = this.model.target.runtimeLookup(this);
        this.args = this.model.args.map((a) => {
            return a.createRuntimeExpression(this);
        });
    }

    protected upNextImpl() {
        if (this.argIndex < this.args.length) {
            this.sim.push(this.args[this.argIndex++]);
        }
    }

    public stepForwardImpl() {
        
        var charsToWrite = this.args[0].evalResult.rawValue();

        // pad with zeros
        while (charsToWrite.length < this.target.type.length) {
            charsToWrite.push(Char.NULL_CHAR);
        }

        this.target.writeValue(charsToWrite);
        this.observable.send("initialized", this.target);
        this.sim.pop();
    }
}


export class ClassDirectInitializer extends DirectInitializer {

    public readonly target: ObjectEntity<ClassType>;
    public readonly args: Expression[];

    public readonly ctor: ConstructorEntity?;
    public readonly ctorCall: MemberFunctionCall?;

    public constructor(context: ExecutableConstructContext, target: ObjectEntity<ClassType>, args: Expression[]) {
        super(context);
        
        this.target = target;
        
        let targetType = target.type;

        


        // Need to select constructor, so have to compile auxiliary arguments
        this.ctor = overloadResolution(targetType.cppClass.ctors, args);

        if (!this.ctor) {
            if (args.length == 0) {
                this.addNote(CPPError.declaration.init.no_default_constructor(this, this.target));
            }
            else {
                this.addNote(CPPError.declaration.init.matching_constructor(this, this.target,
                    args.map(function (aa) {
                        return aa.type;
                    })));
            }
            this.args = args;
            return;
        }

        
        this.ctorCall = new MemberFunctionCall(context, this.ctor, this.target, args);
        this.args = this.ctorCall.args;
        this.attach(this.ctorCall);
        // NOTE: we do NOT add funcCall to i_childrenToExecute here. it's added manually in stepForward
    }

    public createRuntimeInitializer(parent: ExecutableRuntimeConstruct) {
        return new RuntimeClassDirectInitializer(this, parent);
    }

    // TODO; change explain everywhere to be separate between compile time and runtime constructs
    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.describe();
        // TODO: what if there is an error that causes no ctor to be found/available
        return {message: (targetDesc.name || targetDesc.message) + " will be initialized using " + this.ctorCall.describe().message};
    }
}

export class RuntimeClassDirectInitializer extends RuntimeDirectInitializer<ClassDirectInitializer> {

    public readonly target: CPPObject<ClassType>;
    
    public readonly ctorCall: RuntimeMemberFunctionCall;

    private index = "callCtor";

    public constructor (model: ClassDirectInitializer, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.target = this.model.target.runtimeLookup(this);
        this.ctorCall = this.model.ctorCall.createRuntimeMemberFunctionCall(this);
    }

    protected upNextImpl() {
        if (this.index === "callCtor") {
            this.sim.push(this.ctorCall);
            this.index = "done";
        }
        else {
            this.observable.send("initialized", this.target);
            this.sim.pop();
        }
    }

    public stepForwardImpl() {
        // do nothing
    }
}


// TODO: These should really be "class aliases" rather than derived classes, however
// it doesn't seem like Typescript has any proper mechanism for this.
export abstract class CopyInitializer extends DirectInitializer { };
export abstract class RuntimeCopyInitializer extends RuntimeDirectInitializer { };
export class ReferenceCopyInitializer extends ReferenceDirectInitializer { };
export class RuntimeReferenceCopyInitializer extends RuntimeReferenceDirectInitializer { };
export class AtomicCopyInitializer extends AtomicDirectInitializer { };
export class RuntimeAtomicCopyInitializer extends RuntimeAtomicDirectInitializer { };
export class ArrayCopyInitializer extends ArrayDirectInitializer { };
export class RuntimeArrayCopyInitializer extends RuntimeArrayDirectInitializer { };
export class ClassCopyInitializer extends ClassDirectInitializer { };
export class RuntimeClassCopyInitializer extends RuntimeClassDirectInitializer { };




/**
 * Note: only use is in implicitly defined copy constructor
 */
export class ArrayMemberInitializer extends Initializer {

     // Note: this are not MemberSubobjectEntity since they might need to apply to a nested array inside an array member
    public readonly target: ObjectEntity<ArrayType>;
    public readonly otherMember: ObjectEntity<ArrayType>;
    
    public readonly elementInitializers: (DefaultInitializer | ArrayMemberInitializer)[] = [];

    public constructor(context: ExecutableConstructContext, target: ObjectEntity<ArrayType>,
                       otherMember: ObjectEntity<ArrayType>) {
        super(context);
        
        this.target = target;
        this.otherMember = otherMember;
        let targetType = target.type;

        for(let i = 0; i < targetType.length; ++i) {
            let elemInit;
            if (targetType.elemType instanceof ArrayType) {
                elemInit = new ArrayMemberInitializer(context,
                    new ArraySubobjectEntity(<ObjectEntity<ArrayType<ArrayType>>>target, i),
                    new ArraySubobjectEntity(<ObjectEntity<ArrayType<ArrayType>>>otherMember, i));
            }
            else {
                elemInit = DirectInitializer.create(context,
                    new ArraySubobjectEntity(target, i),
                    [new EntityExpression(context, new ArraySubobjectEntity(otherMember, i))]);
            }

            this.attach(elemInit);

            if(elemInit.hasErrors) {
                this.addNote(CPPError.declaration.init.array_direct_init(this));
                break;
            }
        }
        
    }

    public createRuntimeInitializer(parent: ExecutableRuntimeConstruct) {
        return new RuntimeArrayMemberInitializer(this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) : Explanation {
        let targetDesc = this.target.describe();
        let targetType = this.target.type;
        let otherMemberDesc = this.otherMember.describe();
        
        if (targetType.length === 0) {
            return {message: "No initialization is performed for " + (targetDesc.name || targetDesc.message) + "because the array has length 0."};
        }
        else {
            return {message: "Each element of " + (targetDesc.name || targetDesc.message) + " will be default-initialized with the value of the"
                + "corresponding element of " + (otherMemberDesc.name || otherMemberDesc.message) + ". For example, " +
                this.elementInitializers[0].explain(sim, rtConstruct) };
        }
    }
}

export class RuntimeArrayMemberInitializer extends RuntimeInitializer<ArrayMemberInitializer> {

    public readonly target: CPPObject<ArrayType>;
    public readonly elementInitializers: (RuntimeDefaultInitializer | RuntimeArrayMemberInitializer)[];

    private index = 0;

    public constructor (model: ArrayMemberInitializer, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.target = this.model.target.runtimeLookup(this);
        this.elementInitializers = this.model.elementInitializers.map((elemInit) => {
            return elemInit.createRuntimeInitializer(this);
        });
    }
	
    protected upNextImpl() {
        if (this.elementInitializers && this.index < this.elementInitializers.length) {
            this.sim.push(this.elementInitializers[this.index++])
        }
        else {
            this.observable.send("initialized", this.target);
            this.sim.pop();
        }
    }

    public stepForwardImpl() {
        // do nothing
    }
}





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



export var InitializerList = CPPConstruct.extend({
    _name : "InitializerList",
    init: function(ast, context) {
        this.initParent(ast, context);
        this.initializerListLength = ast.args.length;
    },
    compile : function(entity){
        assert(entity, "Initializer context must specify entity to be initialized!");
        this.i_entityToInitialize = entity;
        var ast = this.ast;
        var type = this.i_entityToInitialize.type;

        if (!isA(type, Types.Array)){
            this.addNote(CPPError.declaration.init.list_array(this));
        }
        else if (type.length !== ast.args.length){
            this.addNote(CPPError.declaration.init.list_length(this, type.length));
        }

        if (this.hasErrors()){ return; }

        var list = ast.args;
        //this.initializerList = [];
        this.i_childrenToExecute = [];
        for(var i = 0; i < list.length; ++i){
            var initListElem = this["arg"+i] = this.i_createAndCompileChildExpr(list[i], type.elemType);
            this.i_childrenToExecute.push("arg"+i);

            if(!sameType(initListElem.type, type.elemType)){
                this.addNote(CPPError.declaration.init.convert(initListElem, initListElem.type, type.elemType));
            }
            else if (initListElem.isNarrowingConversion){
                // TODO: as of now, still need to add code that identifies certain conversions as narrowing
                this.addNote(CPPError.declaration.init.list_narrowing(initListElem, initListElem.from.type, type.elemType));
            }
            //this.initializerList.push(initListElem);
        }

        return;
    },

    stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        if (inst.index !== "afterChildren"){
            return;
        }
        var obj = this.i_entityToInitialize.runtimeLookup(sim, inst);

        var arr = [];
        for(var i = 0; i < this.initializerListLength; ++i){
            arr[i] = inst.childInstances["arg"+i].evalResult.getValue();
        }
        obj.writeValue(arr);

        inst.index = "done";
        this.done(sim, inst);
    }
});
