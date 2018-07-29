import { Expression, FunctionCall } from "./expressions";
import { InstructionConstruct, ExecutableConstruct, ASTNode, ConstructContext, ExecutableConstructContext, RuntimeInstruction, ExecutableRuntimeConstruct, RuntimeConstruct, RuntimeExpression } from "./constructs";
import { CPPEntity, overloadResolution, FunctionEntity, ConstructorEntity, ArraySubobjectEntity, ObjectEntity, ReferenceEntity } from "./entities";
import { Reference, ClassType, AtomicType, ArrayType, Type, referenceCompatible, sameType } from "./types";
import { CPPError } from "./errors";
import { assertFalse } from "../util/util"
import { CPPObject } from "./objects";
import { Simulation } from "./Simulation";
import { Value } from "./runtimeEnvironment";
import { standardConversion } from "./standardConversions";


export abstract class Initializer extends InstructionConstruct {

    public abstract readonly target: ObjectEntity;

    public abstract createRuntimeInitializer(parent: ExecutableRuntimeConstruct) : RuntimeInitializer;

    public isTailChild(child: ExecutableConstruct) {
        return {isTail: true};
    }

}

export abstract class RuntimeInitializer<Construct_type extends Initializer = Initializer> extends RuntimeInstruction<Construct_type> {
    
    protected constructor (model: Construct_type, parent: ExecutableRuntimeConstruct) {
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

    // NOTE: this isn't redundant - it's here to make it protected rather than the public inherited one
    protected constructor(context: ExecutableConstructContext) {
        super(context);
    }
    
    public abstract createRuntimeInitializer(parent: ExecutableRuntimeConstruct) : RuntimeDefaultInitializer;
}

export abstract class RuntimeDefaultInitializer<Construct_type extends DefaultInitializer = DefaultInitializer>
    extends RuntimeInitializer<Construct_type> {

}

export class ReferenceDefaultInitializer extends DefaultInitializer {

    public readonly target: ReferenceEntity<AtomicType>;

    public constructor(context: ExecutableConstructContext, target: ReferenceEntity<AtomicType>) {
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

export class AtomicDefaultInitializer extends DefaultInitializer {

    public readonly target: ObjectEntity<AtomicType>;

    public constructor(context: ExecutableConstructContext, target: ObjectEntity<AtomicType>) {
        super(context);
        this.target = target;
    }

    public createRuntimeInitializer(parent: ExecutableRuntimeConstruct) {
        return new RuntimeAtomicDefaultInitializer(this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let target = rtConstruct ? this.target.runtimeLookup(rtConstruct) : this.target;
        let targetDesc = target.describe();
        return {message: "No initialization will take place. " + (targetDesc.name || targetDesc.message) + " will have a junk value."};
    }
}

export class RuntimeAtomicDefaultInitializer extends RuntimeDefaultInitializer<AtomicDefaultInitializer> {

    public readonly target: CPPObject<AtomicType>;

    public constructor (model: AtomicDefaultInitializer, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.target = this.model.target.runtimeLookup(this);
    }
	
    protected upNextImpl() {
        // No initialization. Object has junk value.
        this.observable.send("initialized", this.target);
        this.sim.pop();
        return true;
    }

    public stepForwardImpl() {
        return false;
    }
}

export class ArrayDefaultInitializer extends DefaultInitializer {

    public readonly target: ObjectEntity<ArrayType>;
    public readonly elementInitializers?: DefaultInitializer[];

    public constructor(context: ExecutableConstructContext, target: ObjectEntity<ArrayType>) {
        super(context);
        
        this.target = target;

        // If it's not an array of class type, the initializers do nothing so don't
        // even make them at all.
        let type = this.target.type;
        if (type.elemType instanceof ClassType) {
            this.elementInitializers = [];
            for(let i = 0; i < type.length; ++i){
                let elemInit = DefaultInitializer.create(context, new ArraySubobjectEntity(this.target, i));
                this.elementInitializers.push(elemInit);
                this.addChild(elemInit);
                if (elemInit.hasErrors) {
                    this.addNote(CPPError.declaration.init.array_default_init(this));
                    break;
                }
            }
        }

    }

    public createRuntimeInitializer(parent: ExecutableRuntimeConstruct) {
        return new RuntimeArrayDefaultInitializer(this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let target = rtConstruct ? this.target.runtimeLookup(rtConstruct) : this.target;
        let targetDesc = target.describe();
        return {message: (targetDesc.name || targetDesc.message) + " will be initialized using " this.ctorCall.describe().message};

        if (target.type.length === 0) {
            return {message: "No initialization is performed for " + (targetDesc.name || targetDesc.message) + "because the array has length 0."};
        }
        else if (target.type.elemType instanceof ClassType) {
            // TODO: what if there are errors and/or no element initializers??
            return {message: "Each element of " + (targetDesc.name || targetDesc.message) + " will be initialized using a default constructor." };
        }
        else {
            return {message: "No initialization will take place. The elements of " + (targetDesc.name || targetDesc.message) + " will have junk values." };
        }
    }

}

export class RuntimeArrayDefaultInitializer extends RuntimeDefaultInitializer<ArrayDefaultInitializer> {

    public readonly target: CPPObject<ArrayType>;
    public readonly elementInitializers?: RuntimeDefaultInitializer[];

    private index = 0;

    public constructor (model: ArrayDefaultInitializer, parent: ExecutableRuntimeConstruct) {
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
            this.sim.pop();
        }
        return false;
    }

    public stepForwardImpl() {
        return false;
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
        this.addChild(this.ctorCall);
        // this.args = this.ctorCall.args;
    }

    public createRuntimeInitializer(parent: ExecutableRuntimeConstruct) {
        return new RuntimeClassDefaultInitializer(this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let target = rtConstruct ? this.target.runtimeLookup(rtConstruct) : this.target;
        let targetDesc = target.describe();
        // TODO: what if there is an error that causes no ctor to be found/available
        return {message: (targetDesc.name || targetDesc.message) + " will be initialized using " + this.ctorCall.describe().message};
    }
}

export class RuntimeClassDefaultInitializer extends RuntimeDefaultInitializer<ClassDefaultInitializer> {

    public readonly target: CPPObject<ClassType>;
    public readonly ctorCall: RuntimeMemberFunctionCall;

    private index = "callCtor";
    
    public constructor (model: ClassDefaultInitializer, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.target = model.target.runtimeLookup(this);
        this.ctorCall = this.model.ctorCall.createRuntimeMemberFunctionCall(this);
    }
	
    protected upNextImpl() {
        if (this.index === "callCtor") {
            this.sim.push(this.ctorCall);
            this.index = "done";
            return true;
        }
        else {
            this.sim.pop();
            return true;
        }
    }

    public stepForwardImpl() {
        return false;
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

    public static create(context: ExecutableConstructContext, target: ReferenceEntity, args: Expression[]) : AtomicDirectInitializer;
    public static create(context: ExecutableConstructContext, target: ObjectEntity<AtomicType>, args: Expression[]) : AtomicDirectInitializer;
    public static create(context: ExecutableConstructContext, target: ObjectEntity<ArrayType>, args: Expression[]) : ArrayDirectInitializer;
    public static create(context: ExecutableConstructContext, target: ObjectEntity<ClassType>, args: Expression[]) : ClassDirectInitializer;
    public static create(context: ExecutableConstructContext, target: ObjectEntity, args: Expression[]) : DirectInitializer {
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

export abstract class RuntimeDirectInitializer<Construct_type extends DirectInitializer = DirectInitializer>
    extends RuntimeInitializer<Construct_type> {

}


export class ReferenceDirectInitializer extends DirectInitializer {

    public readonly target: ReferenceEntity;
    public readonly args: Expression[];

    public constructor(context: ExecutableConstructContext, target: ReferenceEntity, args: Expression[]) {
        super(context);
        this.target = target;
        
        this.args = args;
        args.forEach((a) => {this.addChild(a);});

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

    public createRuntimeInitializer(parent: ExecutableRuntimeConstruct) {
        return new RuntimeReferenceDirectInitializer(this, parent);
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.runtimeLookup(rtConstruct).describe();
        let rhsDesc = this.args[0].describeEvalValue(0);
        return {message: (targetDesc.name || targetDesc.message) + " will be bound to " + (rhsDesc.name || rhsDesc.message) + "."};
    }
}

// export namespace ReferenceDirectInitializer {
//     export interface Compiled extends ReferenceDirectInitializer {
//         args: RuntimeExpression.LValue[];
//     }
// }

export class RuntimeReferenceDirectInitializer extends RuntimeDirectInitializer<ReferenceDirectInitializer> {

    public readonly args: RuntimeExpression[];

    private argIndex = 0;

    public constructor (model: ReferenceDirectInitializer, parent: ExecutableRuntimeConstruct) {
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
            <CPPObject>this.args[0].evalValue
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
        args.forEach((a) => {this.addChild(a);});
        
    }

    public createRuntimeInitializer(parent: ExecutableRuntimeConstruct) {
        return new RuntimeAtomicDirectInitializer(this, parent);
    }

    // TODO; change explain everywhere to be separate between compile time and runtime constructs
    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let targetDesc = this.target.runtimeLookup(rtConstruct).describe();
        let rhsDesc = this.args[0].describeEvalValue(0);
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
        this.target.writeValue(<Value<AtomicType>>this.args[0].evalValue);
        this.observable.send("initialized", this.target);
        this.sim.pop();
    }
}



export class DirectCopyInitializerBase2 = Initializer.extend({
    _name : "DirectCopyInitializerBase",

    compile : function(entity) {
        var self = this;
        this.numArgs = args.length;

        // Note: make sure to set this before modifying context of arguments.
        // They need to know so they can decide if this is their full expression.
        this.makesFunctionCall = isA(type, Types.Class);

        // If we aren't making a function call, we can go ahead and compile args now
        if (!this.makesFunctionCall){
            // Compile all expressions as children
            var arg = this.args[0];
            else if (isA(type, Types.Array) && isA(this.args[0].type, Types.Array) && this.args[0].entity){
                if (this.args.length > 1){
                    this.addNote(CPPError.declaration.init.array_args(this, type));
                }

                this.arrayElemInitializers = [];
                for(var i = 0; i < type.length; ++i){
                    // TODO: find a way to clean up these shenanagins for array initalization.
                    // Or decide that this is an inherent quirk of the language and throw up my hands.
                    // A slight improvement might be creating a fake AST node that just starts with the entity
                    // and then when it compiles it actually does nothing. This would still be trickery, but wouldn't
                    // require the check for EntityExpression and treating it differently elsewhere.
                    // TODO: Fix this by having a special initializer class for array subobjects?
                    var elemInit = DirectInitializer.instance({args: [EntityExpression.instance(ArraySubobjectEntity.instance(this.args[0].entity, i), null, null)]}, {parent:this});
                    this.arrayElemInitializers.push(elemInit);
                    elemInit.compile(ArraySubobjectEntity.instance(this.entity, i));
                    if(elemInit.hasErrors()) {
                        this.addNote(CPPError.declaration.init.array_direct_init(this));
                        break;
                    }
                    this.i_childrenToExecute = ["arrayElemInitializers"];
                }
            }
            else if (isA(type, Types.Array) && isA(type.elemType, Types.Char)
                && isA(arg, Expressions.StringLiteral)) {
                //if we're initializing a character array from a string literal, check length
                if (arg.type.length > type.length){
                    this.addNote(CPPError.declaration.init.stringLiteralLength(this, arg.type.length, type.length));
                }
                this.i_childrenToExecute = ["args"];

            }
        }
        else { // if (isA(type, Types.Class))

            // Need to select constructor, so have to compile auxiliary arguments
            var auxArgs = args.map(function (arg) {
                if (isA(arg, EntityExpression)){
                    return arg;
                }
                var auxArg = Expression.create(arg, {parent: self, auxiliary: true});
                auxArg.compile();
                return auxArg;
            });
            this.myConstructor = overloadResolution(type.constructors, auxArgs);

            if (!this.myConstructor) {
                if (args.length == 0) {
                    this.addNote(CPPError.declaration.init.no_default_constructor(this, this.entity));
                }
                else {
                    this.addNote(CPPError.declaration.init.matching_constructor(this, this.entity,
                        auxArgs.map(function (aa) {
                            return aa.type;
                        })));
                }
                return;
            }

            this.funcCall = FunctionCall.instance({args: args}, {parent: this});
            this.funcCall.compile({
                func: this.myConstructor,
                receiver: this.entity});
            this.args = this.funcCall.args;
            // NOTE: we do NOT add funcCall to i_childrenToExecute here. it's added manually in stepForward
        }

        return Lobster.DirectCopyInitializerBase._parent.compile.apply(this, arguments);
    },

    stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){

        //sim.explain(this.explain(sim, inst));
        var obj = this.entity.runtimeLookup(sim, inst);
        assert(obj, "Tried to look up entity to initialize but object was null.");
        var type = this.entity.type;


        
        else if (isA(type, Types.Class)) {

            // Look up the receiver in this context and set it at runtime for the constructor.
            // This is important because for parameter initializers, which use parameter entities,
            // the context of the constructor would yield a parameter of that constructor rather
            // that the parameter of the functions (which is being initialized via the constructor and
            // should be the receiver),

            this.funcCall.createAndPushInstance(sim, inst);
            inst.index = "done";
            return true;
        }
        else{
            // Handle char[] initialization from string literal as special case
            if (isA(type, Types.Array) && isA(type.elemType, Types.Char) && isA(this.args[0], Expressions.StringLiteral)) {
                var charsToWrite = inst.childInstances.args[0].evalValue.rawValue();

                // pad with zeros
                while (charsToWrite.length < type.length) {
                    charsToWrite.push(Types.Char.NULL_CHAR);
                }

                obj.writeValue(charsToWrite);
            }
            else {
                
            }
            inst.send("initialized", obj);
            this.done(sim, inst);
        }
    },

    explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        var exp = {message:""};
        var type = this.entity.type;
        var obj = inst && this.entity.runtimeLookup(sim, inst) || this.entity;
        
        
        else if (isA(type, Types.Class)) {
            exp.message = obj.describe().message + " will be initialized using " + this.funcCall.describe(sim).message + ".";
        }
        else {
            // Handle char[] initialization from string literal as special case
            if (isA(type, Types.Array) && isA(type.elemType, Types.Char) && isA(this.args[0], Expressions.StringLiteral)) {
                exp.message = obj.describe().message + " (a character array) will be initialized from a string literal. Remember that a null character is automatically appended!";
            }
            else if (isA(type, Types.Array)) {
                exp.message = "Each element in the array will be initialized on its own.";
            }
            else {
            }
        }
        return exp;
    }
});

// export var DirectInitializer = DirectCopyInitializerBase.extend({
//     _name : "DirectInitializer"

//     //upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//     //    sim.explain("Direct initializer up next!");
//     //    return DefaultInitializer._parent.upNext.apply(this, arguments);
//     //}
// });

// export var CopyInitializer = DirectCopyInitializerBase.extend({
//     _name : "CopyInitializer"

//     //upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//     //    sim.explain("Copy initializer up next!");
//     //    return DefaultInitializer._parent.upNext.apply(this, arguments);
//     //}
// });

export var ParameterInitializer = CopyInitializer.extend({
    _name : "ParameterInitializer",

    explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        var exp = ParameterInitializer._parent.explain.apply(this, arguments);
        exp.message = exp.message + "\n\n(Parameter passing is done by copy-initialization.)";
        return exp;
    }
});

export var ReturnInitializer = CopyInitializer.extend({
    _name : "ReturnInitializer",

    stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct) {

        // Need to handle return-by-reference differently, since there is no actual reference that
        // gets bound. (The runtimeLookup for the return entity would yield null). Instead, we just
        // set the return object for the enclosing function to the evaluated argument (which should
        // have yielded an object).
        if (isA(this.entity.type, Types.Reference)) {
            inst.containingRuntimeFunction().setReturnValue(inst.childInstances.args[0].evalValue);
            this.done(sim, inst);
            return;
        }

        return ReturnInitializer._parent.stepForward.apply(this, arguments);
    }
});

export var MemberInitializer = DirectInitializer.extend({
    _name : "MemberInitializer",
    isMemberInitializer: true
});

export var DefaultMemberInitializer = DefaultInitializer.extend({
    _name : "DefaultMemberInitializer",
    isMemberInitializer: true
});

export var NewDirectInitializer = DirectInitializer.extend({
    _name : "NewDirectInitializer",
    i_runtimeConstructClass : RuntimeNewInitializer
});


export var NewDefaultInitializer = DefaultInitializer.extend({
    _name : "NewDefaultInitializer",
    i_runtimeConstructClass : RuntimeNewInitializer
});



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
            arr[i] = inst.childInstances["arg"+i].evalValue.getValue();
        }
        obj.writeValue(arr);

        inst.index = "done";
        this.done(sim, inst);
    }
});
