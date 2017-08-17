var Initializer = Lobster.Initializer = Expression.extend({
    _name: "Initializer",
    isTailChild : function(child){
        return {isTail: true};
    }
});


var DefaultInitializer = Lobster.DefaultInitializer = Initializer.extend({
    _name : "DefaultInitializer",
    //initIndex: "explain",

    compile : function(entity) {
        assert(isA(entity, CPPEntity));
        this.entity = entity;
        var args = [];

        var type = this.type = this.entity.type;

        this.numArgs = 0;


        if (isA(type, Types.Reference)) {
            // Cannot default initialize a reference
            this.addNote(CPPError.declaration.init.referenceBind(this));
            return;
        }
        else if (isA(type, Types.Class)){
            // Try to find default constructor. Not using lookup because constructors have no name.
            this.myConstructor = overloadResolution(type.constructors, []);
            if (!this.myConstructor) {
                this.addNote(CPPError.declaration.init.no_default_constructor(this, this.entity));
                return;
            }

            this.funcCall = this.funcCall = FunctionCall.instance({args: args}, {parent:this});
            this.funcCall.compile({
                func: this.myConstructor,
                receiver: this.entity});
            this.args = this.funcCall.args;
            this.i_childrenToExecute = ["funcCall"];
        }
        else if (isA(type, Types.Array)){
            // If it's not an array of class type, the initializers do nothing so don't
            // even make them at all.
            if (isA(type.elemType, Types.Class)){
                this.arrayElemInitializers = [];
                for(var i = 0; i < type.length; ++i){
                    var elemInit = DefaultInitializer.instance(this.ast, {parent:this});
                    this.arrayElemInitializers.push(elemInit);
                    elemInit.compile(ArraySubobjectEntity.instance(this.entity, i));
                    if (elemInit.hasErrors()){
                        this.addNote(CPPError.declaration.init.array_default_init(this));
                        break;
                    }
                }
                this.i_childrenToExecute = ["arrayElemInitializers"];
            }
        }
        else{
            // Do nothing
            if(!isA(type, Types.Pointer)){
                this.addNote(CPPError.declaration.init.uninitialized(this, this.entity));
            }
        }



        return DefaultInitializer._parent.compile.apply(this, arguments);
    },

    upNext : function(sim, inst){
        if (inst.index === "operate"){
            if (isA(this.entity.type, Types.Class) || isA(this.entity.type, Types.Array)) {
                // Nothing to do, handled by child initializers for each element
                var ent = this.entity.lookup(sim, inst);
                ent && ent.initialized();
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

    stepForward : function(sim, inst){
        // Will only get to here if it's a non-class, non-array type.

        var obj = this.entity.lookup(sim, inst);
        assert(obj, "Tried to look up entity to initialize but object was null.");
        // No initialization. Object has junk value.
        // Object should be invalidated by default and nobody has written to it.
        obj.initialized();
        inst.send("initialized", obj);
        this.done(sim, inst);
    },

    explain : function(sim, inst){
        var exp = {message:""};
        var type = this.entity.type;
        var obj = inst && this.entity.lookup(sim, inst) || this.entity;
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
});

Lobster.DirectCopyInitializerBase = Initializer.extend({
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
                    var elemInit = DirectInitializer.instance({args: [EntityExpression.instance(ArraySubobjectEntity.instance(this.args[0].entity, i), null, {parent:this})]}, {parent:this});
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

    upNext : function(sim, inst){
        //sim.explain(this.explain(sim, inst));
        if (inst.index === "done"){
            var ent = this.entity.lookup(sim, inst);
            ent && ent.initialized();
        }
        return Lobster.DirectCopyInitializerBase._parent.upNext.apply(this, arguments);
    },

    stepForward : function(sim, inst){

        if (isA(this.entity.type, Types.Void)){
            this.done(sim, inst);
            return;
        }

        //sim.explain(this.explain(sim, inst));
        var obj = this.entity.lookup(sim, inst);
        assert(obj, "Tried to look up entity to initialize but object was null.");
        var type = this.entity.type;


        if (isA(obj, ReferenceEntity)){ // Proper reference // TODO: should this be ReferenceEntityInstance? or check this.entity instead?
            obj.bindTo(inst.childInstances.args[0].evalValue);
            obj.initialized();
            inst.send("initialized", obj);
            this.done(sim, inst);
        }
        else if (isA(type, Types.Reference)) { // Old reference, TODO remove
            assert(false, "Should never be using old reference mechanism.");
            // obj.allocated(sim.memory, inst.childInstances.args[0].evalValue.address);
            // obj.initialized();
            // inst.send("initialized", obj);
            // this.done(sim, inst);
        }
        else if (isA(type, Types.Class)) {
            // Nothing to do, handled by function call child
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
            obj.initialized();
            inst.send("initialized", obj);
            this.done(sim, inst);
        }
    },

    explain : function(sim, inst){
        var exp = {message:""};
        var type = this.entity.type;
        var obj = inst && this.entity.lookup(sim, inst) || this.entity;
        if (isA(obj, ReferenceEntity)){ // Proper reference
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

var DirectInitializer = Lobster.DirectInitializer = Lobster.DirectCopyInitializerBase.extend({
    _name : "DirectInitializer"

    //upNext : function(sim, inst){
    //    sim.explain("Direct initializer up next!");
    //    return DefaultInitializer._parent.upNext.apply(this, arguments);
    //}
});

var CopyInitializer = Lobster.CopyInitializer = Lobster.DirectCopyInitializerBase.extend({
    _name : "CopyInitializer"

    //upNext : function(sim, inst){
    //    sim.explain("Copy initializer up next!");
    //    return DefaultInitializer._parent.upNext.apply(this, arguments);
    //}
});

var ParameterInitializer = Lobster.ParameterInitializer = Lobster.CopyInitializer.extend({
    _name : "ParameterInitializer",

    createInstance : function(sim, parent, calledFunction){
        var inst = ParameterInitializer._parent.createInstance.apply(this, arguments);
        inst.calledFunction = calledFunction;
        return inst;
    },

    executionContext : function(sim, inst){
        return inst.calledFunction;
    },

    explain : function(sim, inst){
        var exp = ParameterInitializer._parent.explain.apply(this, arguments);
        exp.message = exp.message + "\n\n(Parameter passing is done by copy-initialization.)";
        return exp;
    }
});

var ReturnInitializer = Lobster.ReturnInitializer = Lobster.CopyInitializer.extend({
    _name : "ReturnInitializer"
});

var MemberInitializer = Lobster.MemberInitializer = Lobster.DirectInitializer.extend({
    _name : "MemberInitializer",
    isMemberInitializer: true
});

var DefaultMemberInitializer = Lobster.DefaultMemberInitializer = Lobster.DefaultInitializer.extend({
    _name : "DefaultMemberInitializer",
    isMemberInitializer: true
});

var InitializerList = Lobster.InitializerList = CPPConstruct.extend({
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

    stepForward : function(sim, inst){
        if (inst.index !== "afterChildren"){
            return;
        }
        var obj = this.i_entityToInitialize.lookup(sim, inst);

        var arr = [];
        for(var i = 0; i < this.initializerListLength; ++i){
            arr[i] = inst.childInstances["arg"+i].evalValue.getValue();
        }
        obj.writeValue(arr);

        inst.index = "done";
        this.done(sim, inst);
    }
});
