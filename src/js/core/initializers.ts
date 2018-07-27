import { Expression, FunctionCall } from "./expressions";
import { InstructionConstruct, ExecutableConstruct, ASTNode, ConstructContext, ExecutableConstructContext, RuntimeInstruction, ExecutableRuntimeConstruct } from "./constructs";
import { CPPEntity, overloadResolution, FunctionEntity, ConstructorEntity, ArraySubobjectEntity } from "./entities";
import { Reference, ClassType, AtomicType, ArrayType } from "./types";
import { CPPError } from "./errors";
import { assertFalse } from "../util/util";
import { CPPObject } from "./objects";


export abstract class Initializer extends InstructionConstruct {
    
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

    public abstract readonly entity: CPPEntity;

    public static create(context: ExecutableConstructContext, entity: CPPEntity) : DefaultInitializer {
        if (entity.type instanceof AtomicType) {
            return new AtomicDefaultInitializer(context, <CPPEntity<AtomicType>> entity);
        }
        else if (entity.type instanceof ClassType) {
            return new ClassDefaultInitializer(context, <CPPEntity<ClassType>> entity);
        }
        else if (entity.type instanceof ArrayType) {
            return new ArrayDefaultInitializer(context, <CPPEntity<ArrayType>> entity);
        }
        else{
            return assertFalse();
        }
    }

    protected constructor(context: ExecutableConstructContext) {
        super(context);
    }
    
    public abstract createRuntimeInitializer(parent: ExecutableRuntimeConstruct) : RuntimeDefaultInitializer;

    upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
        if (inst.index === "operate"){
            if (isA(this.entity.type, Types.Class) || isA(this.entity.type, Types.Array)) {
                // Nothing to do, handled by child initializers for each element
                var ent = this.entity.runtimeLookup(sim, inst);
                this.done(sim, inst);
                return true;
            }
            else{
                return false;
            }
        }
        else{
            return DefaultInitializer._parent.upNext.apply(this, arguments);
        }
    },

    explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        var exp = {message:""};
        var type = this.entity.type;
        var obj = inst && this.entity.runtimeLookup(sim, inst) || this.entity;
        var desc = obj.describe();

        if (isA(type, Types.Class)) {
            exp.message = (desc.name || desc.message) + " will be initialized using " + this.funcCall.describe(sim).message + ".";
        }
        else if (isA(type, Types.Array)) {
            if (type.length === 0){
                exp.message = "No initialization is performed because the array has length 0.";
            }
            else if (isA(type.elemType, Types.Class)){
                exp.message = "Each element of " + (desc.name || desc.message) + " will be initialized using " + this.arrayElemInitializers[0].funcCall.describe(sim).message + ".";
            }
            else{
                exp.message = "No initialization will take place. The elements of " + (desc.name || desc.message) + " will have junk values.";
            }
        }
        else{
            exp.message = "No initialization will take place. " + obj.describe().message + " will have a junk value.";
        }
        return exp;
    }
}

export abstract class RuntimeDefaultInitializer<Construct_type extends DefaultInitializer = DefaultInitializer>
    extends RuntimeInitializer<Construct_type> {

    public abstract readonly target: CPPObject;

}

export class AtomicDefaultInitializer extends DefaultInitializer {

    public readonly entity: CPPEntity<AtomicType>;

    public constructor(context: ExecutableConstructContext, entity: CPPEntity<AtomicType>) {
        super(context);
        
        this.entity = entity;

        if (entity.type instanceof Reference) {
            // Cannot default initialize a reference
            this.addNote(CPPError.declaration.init.referenceBind(this));
            return;
        }
    }

    public createRuntimeInitializer(parent: ExecutableRuntimeConstruct) {
        return new RuntimeAtomicDefaultInitializer(this, parent);
    }
}

export class RuntimeAtomicDefaultInitializer extends RuntimeDefaultInitializer<AtomicDefaultInitializer> {

    public readonly object: CPPObject<AtomicType>;

    private index = 0;

    public constructor (model: AtomicDefaultInitializer, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.object = this.model.entity.
    }
	
    protected upNextImpl() {
        // No initialization. Object has junk value.
        var obj = this.model.entity.runtimeLookup(sim, inst);
        this.observable.send("initialized", obj);
        this.sim.pop();
        return true;
    }

    public stepForwardImpl() {
        return false;
    }
}

export class ClassDefaultInitializer extends DefaultInitializer {

    public readonly entity: CPPEntity<ClassType>;
    public readonly ctor: ConstructorEntity?;
    public readonly ctorCall: MemberFunctionCall?;

    public constructor(context: ExecutableConstructContext, entity: CPPEntity<ClassType>) {
        super(context);

        this.entity = entity;

        // Try to find default constructor. Not using lookup because constructors have no name.
        this.ctor = overloadResolution(entity.type.cppClass.ctors, []);
        if (!this.ctor) {
            this.addNote(CPPError.declaration.init.no_default_constructor(this, this.entity));
            return;
        }
        
        //MemberFunctionCall args are: context, function to call, receiver, ctor args
        this.ctorCall = new MemberFunctionCall(context, this.ctor, this.entity, []);
        this.addChild(this.ctorCall);
        // this.args = this.ctorCall.args;
    }

    public createRuntimeInitializer(parent: ExecutableRuntimeConstruct) {
        return new RuntimeClassDefaultInitializer(this, parent);
    }
}

export class RuntimeClassDefaultInitializer extends RuntimeDefaultInitializer<ClassDefaultInitializer> {

    private index = "callCtor";
    public readonly ctorCall: RuntimeMemberFunctionCall;

    public constructor (model: ClassDefaultInitializer, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
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

export class ArrayDefaultInitializer extends DefaultInitializer {

    public readonly entity: CPPEntity<ArrayType>;
    public readonly elementInitializers?: DefaultInitializer[];

    public constructor(context: ExecutableConstructContext, entity: CPPEntity<ArrayType>) {
        super(context);
        
        this.entity = entity;

        // If it's not an array of class type, the initializers do nothing so don't
        // even make them at all.
        let type = this.entity.type;
        if (type.elemType instanceof ClassType) {
            this.elementInitializers = [];
            for(let i = 0; i < type.length; ++i){
                let elemInit = DefaultInitializer.create(context, new ArraySubobjectEntity(this.entity, i));
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

}

export class RuntimeArrayDefaultInitializer extends RuntimeDefaultInitializer<ArrayDefaultInitializer> {

    private index = 0;
    public readonly elementInitializers?: RuntimeDefaultInitializer[];

    public constructor (model: ArrayDefaultInitializer, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        if (this.model.elementInitializers) {
            this.elementInitializers = this.model.elementInitializers.map((elemInit) => {
                return elemInit.createRuntimeInitializer(this);
            })
            this.index = "pushInits";
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











var DirectCopyInitializerBase = Initializer.extend({
    _name : "DirectCopyInitializerBase",

    compile : function(entity) {
        var self = this;
        assert(isA(entity, CPPEntity));
        var args = this.ast.args;
        assert(Array.isArray(args));
        this.entity = entity;

        var type = this.type = this.entity.type;

        this.numArgs = args.length;

        // Note: make sure to set this before modifying context of arguments.
        // They need to know so they can decide if this is their full expression.
        this.makesFunctionCall = isA(type, Types.Class);

        // If we aren't making a function call, we can go ahead and compile args now
        if (!this.makesFunctionCall){
            // Compile all expressions as children
            this.args = args.map(function(arg){
                if (isA(arg, EntityExpression)){
                    return arg;
                }
                return self.i_createAndCompileChildExpr(arg);
            });
            var arg = this.args[0];
            if (isA(type, Types.Reference)) {
                // With a reference, no conversions are done
                if (this.args.length > 1){
                    this.addNote(CPPError.declaration.init.referenceBindMultiple(this));
                }
                else if (!referenceCompatible(arg.type, type.refTo)){
                    this.addNote(CPPError.declaration.init.referenceType(this, arg, type));
                }
                else if (!isA(type.refTo, Types.Class) && arg.valueCategory !== "lvalue"){
                    this.addNote(CPPError.declaration.init.referenceLvalue(this));
                }
                else if (arg.valueCategory === "prvalue" && !type.refTo.isConst){
                    this.addNote(CPPError.declaration.init.referencePrvalueConst(this));
                }
                this.i_childrenToExecute = ["args"];
            }
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
            else{ // Scalar type
                if (this.args.length > 1){
                    this.addNote(CPPError.declaration.init.scalar_args(this, type));
                }

                //Attempt standard conversion to declared type
                arg = this.args[0] = standardConversion(arg, type);

                // Type check
                if (!sameType(type, arg.type)) {
                    this.addNote(CPPError.declaration.init.convert(this, arg.type, type));
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

        if (isA(this.entity.type, Types.Void)){
            this.done(sim, inst);
            return;
        }

        //sim.explain(this.explain(sim, inst));
        var obj = this.entity.runtimeLookup(sim, inst);
        assert(obj, "Tried to look up entity to initialize but object was null.");
        var type = this.entity.type;


        if (isA(type, Types.Reference)) {
            obj.bindTo(inst.childInstances.args[0].evalValue);
            inst.send("initialized", obj);
            this.done(sim, inst);
        }
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
            else if (isA(type, Types.Array)) {
                // Nothing to do, handled by child initializers
            }
            else {
                obj.writeValue(inst.childInstances.args[0].evalValue);
            }
            inst.send("initialized", obj);
            this.done(sim, inst);
        }
    },

    explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        var exp = {message:""};
        var type = this.entity.type;
        var obj = inst && this.entity.runtimeLookup(sim, inst) || this.entity;
        if (isA(type, Types.Reference)) {
            var rhs = this.args[0].describeEvalValue(0, sim, inst && inst.childInstances && inst.childInstances.args[0]).message;
            exp.message = obj.describe().message + " will be bound to " + rhs + ".";
        }
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
                var rhs = this.args[0].describeEvalValue(0, sim, inst && inst.childInstances && inst.childInstances.args[0]).message;
                exp.message = obj.describe().message + " will be initialized with " + rhs + ".";
            }
        }
        return exp;
    }
});

export var DirectInitializer = DirectCopyInitializerBase.extend({
    _name : "DirectInitializer"

    //upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //    sim.explain("Direct initializer up next!");
    //    return DefaultInitializer._parent.upNext.apply(this, arguments);
    //}
});

export var CopyInitializer = DirectCopyInitializerBase.extend({
    _name : "CopyInitializer"

    //upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //    sim.explain("Copy initializer up next!");
    //    return DefaultInitializer._parent.upNext.apply(this, arguments);
    //}
});

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
