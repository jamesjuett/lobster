var Lobster = Lobster || {};

var Declarations = Lobster.Declarations = {

    create : function(decl, context){
        return this[decl.declaration.toLowerCase()].instance(decl, context);
    },

    createFromASTSource : function(declAST, context) {
        return this[declAST.declaration].createFromASTSource(arguments);
    }

};

// A POD type
var StorageSpecifier = Lobster.StorageSpecifier = CPPCode.extend({
    _name: "StorageSpecifier",
    compile : function(){


        this.numSpecs = 0;
        for(var i = 0; i < this.code.length; ++i){
            if (this[this.code[i]]){
                this.addNote(CPPError.declaration.storage.once(this, this.code[i]));
            }
            else {
                this[this.code[i]] = true;
                ++this.numSpecs;
                if (this.code[i] != "static"){
                    this.addNote(CPPError.declaration.storage.unsupported(this, this.code[i]));
                }
            }

        }
        if (this.code.length < 2 ||
            this.code.length == 2 && this.thread_local && (this.static || this.extern)){
            //ok
        }
        else{
            this.addNote(CPPError.declaration.storage.incompatible(this, this.code));
        }
    }
});


var BaseDeclarationMixin = {
    tryCompileDeclaration : function(){
        try{
            return this.compileDeclaration.apply(this, arguments);
        }
        catch(e){
            if (isA(e, SemanticException)){
                this.addNote(e.annotation(this));
            }
            else{
                console.log(e.stack);
                throw e;
            }
        }
    },

    tryCompileDefinition : function(){
        try{
            return this.compileDefinition.apply(this, arguments);
        }
        catch(e){
            if (isA(e, SemanticException)){
                this.addNote(e.annotation(this));
            }
            else{
                console.log(e.stack);
                throw e;
            }
        }
    }
};

var Declaration = Lobster.Declarations.Declaration = CPPCode.extend(BaseDeclarationMixin, {
    _name: "Declaration",
    instType: "stmt",
    initIndex: 0,
    init: function(code, context){
        code.specs = code.specs || {typeSpecs:[], storageSpecs:[]}; // TODO NEW This should be taken care of in the grammar?
        this.initParent(code, context);
        this.declarators = [];
        this.initializers = [];
        this.entities = [];
        return this;
    },

    compile : function(){
        this.compileDeclaration();
        this.compileDefinition();
    },

    compileDeclaration : function() {
        var code = this.code;


        this.typeSpec = TypeSpecifier.instance(code.specs.typeSpecs, {parent: this});
        this.typeSpec.compile();

        if (this.hasErrors() > 0) {
            return;
        }

        this.storageSpec = StorageSpecifier.instance(code.specs.storageSpecs, {parent:this});
        this.storageSpec.compile();

        // TODO, if storage is specified, declarators cannot be empty (classes and such)
        if (this.hasErrors() > 0) {
            return;
        }

        this.typedef = !!code.specs.typedef;
        this.friend = !!code.specs.friend;
        this.virtual = !!code.specs.virtual;

        if (this.storageSpec.numSpecs > 0 && this.typedef) {
            this.addNote(CPPError.declaration.storage.typedef(this, this.storageSpec.code))
        }

        this.i_determineStorage();


        // Compile each declarator with respect to the type specifier
        for (var i = 0; i < code.declarators.length; ++i) {
            var decl = Declarator.instance(code.declarators[i], {parent: this}, this.typeSpec.type);
            decl.compile();

            // If there are errors in the declarator, don't create an entity or anything.
            if (decl.hasErrors()){
                continue;
            }

            try{
                var entity = decl.entity = this.makeEntity(decl);
            }
            catch(e){
                if (isA(e, SemanticException)){
                    this.addNote(e.annotation(this));
                    return;
                }
                else{
                    console.log(e.stack);
                    throw e;
                }
            }

            if (entity) {
                this.declarators.push(decl);
            }
        }
    },

    compileDefinition : function(){
        if (!this.isDefinition){
            return;
        }
        for (var i = 0; i < this.entities.length; ++i) {
            var ent = this.entities[i];
            var decl = ent.decl;
            var initCode = decl.code.init;

            // Compile initializer
            var init;
            if (initCode){
                if (initCode.initializerList){
                    init = InitializerList.instance(initCode, {parent: this, entity:ent});
                    init.compile();
                }
                else if (initCode.initializer === "direct"){
                    init = DirectInitializer.instance(initCode, {parent: this});
                    init.compile(ent, initCode.args);
                }
                else if (initCode.initializer === "copy"){
                    init = CopyInitializer.instance(initCode, {parent: this});
                    init.compile(ent, initCode.args);
                }
                else{
                    assert(false, "Corrupt initializer :(");
                }
            }
            else{
                if (isA(ent, AutoEntity) && !isA(this, MemberDeclaration)) {
                    init = DefaultInitializer.instance(initCode, {parent: this});
                    init.compile(ent, []);
                }
            }
            this.initializers.push(init);
            ent.setInitializer(init);
        }
    },

    i_determineStorage : function(){
        // Determine storage duration based on the kind of scope in which the declaration
        // occurs and any storage specifiers.
        if(!this.storageSpec.static && !this.storageSpec.extern && isA(this.contextualScope, BlockScope)){
            this.storageDuration = "automatic";
        }
        else{
            this.storageDuration = "static";
        }
    },

    makeEntity: function(decl){

        // Note: we know it's not a function definition because that goes to the FunctionDefinition
        // class.  Thus any functions are not definitions.
        // Don't have to check for classes, for similar reasons.

        this.isDefinition = !isA(decl.type, Types.Function)
        && !(this.storageSpec.extern && !(decl.initializer || decl.initializerList))
        && !this.typedef;

        var entity;
        if (isA(decl.type, Types.Function)){
            if (this.virtual){
                this.addNote(CPPError.declaration.func.virtual_member(this));
            }
            entity = FunctionEntity.instance(decl);
        }
        else if (isA(decl.type, Types.Reference)) {
            entity = ReferenceEntity.instance(decl);
        }
        else if (this.storageDuration === "static"){
            entity = StaticEntity.instance(decl);
        }
        else{
            entity = AutoEntity.instance(decl);
        }

        if (this.isDefinition) {
            entity.setDefinition(this);
        }

        try {
            this.contextualScope.addDeclaredEntity(entity);
            this.entities.push(entity);
            return entity;
        }
        catch(e) {
            this.addNote(e);
            return null;
        }
    },

    isTailChild : function(child){
        return {isTail: false, reason: "The variable must still be initialized with the return value of the function."};
    },

    upNext : function(sim, inst){
        if (inst.index < this.initializers.length/* && (this.storageDuration !== "static" || !this.entities[inst.index].lookup(sim, inst).isInitialized())*/){
            var init = this.initializers[inst.index];
            if(init){
                inst.send("initializing", inst.index);
                init.createAndPushInstance(sim, inst);
            }
            ++inst.index;
            inst.wait();
            return true;
        }
        else{
            this.done(sim, inst);
            return true;
        }
    },

    done : function(sim, inst){
        sim.pop(inst);
    },

    stepForward : function(sim, inst){
        // Don't have to do anything unless there's an initializer, right?

    }
});


var Parameter = Lobster.Declarations.Parameter = CPPCode.extend({
    _name: "Parameter",

    init: function(code, context) {
        code.specs = code.specs || {typeSpecs: [], storageSpecs: []};
        this.initParent(code, context);
    },

    compile : function(){
        // Compile the type specifier
        var typeSpec = this.typeSpec = TypeSpecifier.instance(this.code.specs.typeSpecs, {parent: this});
        typeSpec.compile();

        // Compile the declarator
        var decl = this.declarator = Declarator.instance(this.code.declarator, {parent: this}, typeSpec.type);
        decl.compile();

        this.name = decl.name;
        this.type = decl.type;

        // Errors related to parameters of void type are handled elsewhere in function declarator part

        if (isA(this.parent.parent, FunctionDefinition) ||
            isA(this.parent, ConstructorDefinition)){ // TODO this is way too hacky


            if (isA(this.type, Types.Reference)){
                this.entity = ReferenceEntity.instance(this);
            }
            else{
                this.entity = AutoEntity.instance(this);
                this.entity.setDefinition(this);
            }


            try {
                this.contextualScope.addDeclaredEntity(this.entity);
            }
            catch(e) {
                this.addNote(e);
            }
        }
    },

    stepForward : function(sim, inst){
        assert(false, "Do I ever use this?");
        this.done(sim, inst);
    }
});

var Declarator = Lobster.Declarator = CPPCode.extend({
    _name: "Declarator",
    init: function(code, context, baseType){
        this.initParent(code, context);
        this.baseType = baseType;
    },
    compile : function(){

        var code = this.code;


        var type = this.baseType;

        var decl = this.code;

        var first = true;
        var isParam = isA(this.parent, Declarations.Parameter);
        var isMember = isA(this.parent, Declarations.Member);

        this.pureVirtual = !!code.pureVirtual;

        var prev = false;
        while (decl){

            // alert(JSON.stringify(decl, null, 4));

            // Determine if this is the innnermost thing
            // Annoying, but have to descend into parentheses first
            var tempDecl = decl;
            while(tempDecl.sub){
                tempDecl = tempDecl.sub;
            }
            var innermost = !(tempDecl.pointer || tempDecl.reference || tempDecl.sub);


            if (decl.name){
                this.name = decl.name.identifier;
                checkIdentifier(this, this.name, this);
            }


            if (decl.postfixes){ // postfixes should always be an array if it's there
                var innermostTemp = innermost;
                for(var i = decl.postfixes.length-1; i >= 0; --i){
                    var postfix = decl.postfixes[i];
                    innermost = innermostTemp && i === 0;
                    if(postfix.type == "array"){
                        if (prev && prev == "function") {
                            this.addNote(CPPError.declaration.func.array(this));
                        }
                        if (prev && prev == "reference"){
                            this.addNote(CPPError.declaration.ref.array(this));
                        }
                        // If it's a parameter and it's an array, adjust to pointer
                        if (isParam && innermost && i == decl.postfixes.length - 1) {
                            prev = "pointer"; // Don't think this is necessary
                            type = Types.Pointer.instance(type, decl["const"], decl["volatile"]);
                        }
                        else{
                            //TODO need to evaluate size of array if it's a constant expression
                            if (!postfix.size){
                                this.addNote(CPPError.declaration.array.length_required(this));
                            }
                            else if (postfix.size.expression !== "literal" && !(innermost && isA(this.parent, Expressions.NewExpression))){
                                this.addNote(CPPError.declaration.array.literal_length_only(this));
                            }
                            else if (postfix.size.expression === "literal" && postfix.size.value == 0 && !(innermost && isA(this.parent, Expressions.NewExpression))){
                                this.addNote(CPPError.declaration.array.zero_length(this));
                            }

                            prev = "array";
                            type = Types.Array.instance(type, (postfix.size ? postfix.size.value : undefined)); //Note: grammar doesn't allow const or volatile on array
                            if(innermost && isA(this.parent, Expressions.NewExpression) && postfix.size/* && postfix.size.expression !== "literal"*/){
                                this.dynamicLengthExpression = postfix.size;
                            }
                        }

                    }
                    else if (postfix.type == "function") {

                        if (prev && prev == "function") {
                            this.addNote(CPPError.declaration.func.return_func(this));
                        }
                        if (prev && prev == "array"){
                            this.addNote(CPPError.declaration.func.return_array(this));
                        }
                        prev = "function";

                        var params = [];
                        var paramTypes = [];

                        for (var j = 0; j < postfix.args.length; ++j) {
                            var arg = postfix.args[j];
                            var paramDecl = Parameter.instance(arg, {parent:this});
                            paramDecl.compile();
                            params[j] = paramDecl;
                            paramTypes[j] = paramDecl.declarator.type;
                        }

                        // A parameter list of just (void) specifies no parameters
                        if (paramTypes.length == 1 && isA(paramTypes[0], Types.Void)) {
                            params = [];
                            paramTypes = [];
                        }
                        else {
                            // Otherwise void parameters are bad
                            for (var j = 0; j < paramTypes.length; ++j) {
                                if (isA(paramTypes[j], Types.Void)) {
                                    this.addNote(CPPError.declaration.func.void_param(params[j]));
                                }
                            }
                        }


                        // If a function is the first thing we encounter, record parameters
                        if (isA(this.parent, Declarations.FunctionDefinition)) {
                            this.params = params;
                        }
                        type = Types.Function.instance(type, paramTypes, decl["const"], decl["volatile"], postfix.const);

                        if (isParam && innermost && i == decl.postfixes.length - 1) {
                            prev = "pointer"; // Don't think this is necessary
                            type = Types.Pointer.instance(type);
                        }
                    }

                    first = false;
                }
            }

            // Process pointers/references next
            if (decl.hasOwnProperty("pointer")){
                if (prev && prev == "reference"){
                    this.addNote(CPPError.declaration.ref.pointer(this));
                }
                type = Types.Pointer.instance(type, decl["const"], decl["volatile"]);
                decl = decl.pointer;
                prev = "pointer";
            }
            else if (decl.hasOwnProperty("reference")){
                if (prev && prev == "reference"){
                    this.addNote(CPPError.declaration.ref.ref(this));
                }
                type = Types.Reference.instance(type, decl["const"], decl["volatile"]);
                decl = decl.reference;
                prev = "reference";
            }
            else if (decl.hasOwnProperty("sub")){
                decl = decl.sub;
            }
            else{
                break;
            }

            first = false;
        }
        this.type = type;

        if (isMember && isA(this.type, Types.reference)){
            this.addNote(CPPError.declaration.ref.memberNotSupported(this));
        }
        if (!isParam && !isMember && isA(this.type, Types.reference) && !code.init) {
            this.addNote(CPPError.declaration.init.referenceBind(this));
        }

    }
});

// Selects from candidates the function that is the best match
// for the arguments in the args array. Also modifies args so
// that each argument is amended with any implicit conversions
// necessary for the match.
// Options:
//   problems - an array that will be filled with an entry for each candidate
//              consisting of an array of any semantic problems that prevent it
//              from being chosen.

var convLen = function(args) {
    var total = 0;
    for (var i = 0; i < args.length; ++i) {
        total += args[i].conversionLength;
    }
    return total;
};

var overloadResolution = function(candidates, args, isThisConst, options){
    options = options || {};
    // Find the constructor
    var cand;
    var tempArgs;
    var viable = [];
    for(var c = 0; c < candidates.length; ++c){
        cand = candidates[c];
        tempArgs = [];
        var problems = [];
        options.problems && options.problems.push(problems);

        // Check argument types against parameter types
        var paramTypes = cand.paramTypes || cand.type.paramTypes;
        if (args.length !== paramTypes.length){
            problems.push(CPPError.param.numParams(args[i]));
        }
        else if (isThisConst && cand.isMemberFunction && !cand.type.isThisConst){
            problems.push(CPPError.param.thisConst(args[i]));
        }
        else{
            for(var i = 0; i < args.length; ++i){
                if (isA(paramTypes[i], Types.Reference)){
                    tempArgs.push(args[i]);
                    if(!referenceCompatible(args[i].type, paramTypes[i].refTo)){
                        problems.push(CPPError.param.paramReferenceType(args[i], args[i].type, paramTypes[i]));
                    }
                    //else if (args[i].valueCategory !== "lvalue"){
                    //    problems.push(CPPError.param.paramReferenceLvalue(args[i]));
                    //}
                }
                else{
                    tempArgs.push(standardConversion(args[i], paramTypes[i]));
                    if(!sameType(tempArgs[i].type, paramTypes[i])){
                        problems.push(CPPError.param.paramType(args[i], args[i].type, paramTypes[i]));
                    }

                }
            }
        }

        if (problems.length == 0) {
            viable.push({
                cand: cand,
                args: tempArgs.clone()
            });
        }
    }

    if (viable.length == 0){
        return null;
    }


    var selected = viable[0];
    var bestLen = convLen(selected.args);
    for(var i = 1; i < viable.length; ++i){
        var v = viable[i];
        var vLen = convLen(v.args);
        if (vLen < bestLen){
            selected = v;
            bestLen = vLen;
        }
    }

    for(var i = 0; i < selected.args.length; ++i){
        args[i] = selected.args[i];
    }

    return selected.cand;
};

var fakeExpressionsFromTypes = function(types){
    var exprs = [];
    for (var i = 0; i < types.length; ++i){
        exprs[i] = {type: types[i], valueCategory: "prvalue", context: {parent:null}, parent:null, conversionLength: 0};
    }
    return exprs;
};


var Initializer = Lobster.Initializer = Expression.extend({
    _name: "Initializer",
    init: function (code, context) {
        this.initParent(code, context);
    },
    isTailChild : function(child){
        return {isTail: true};
    }
});


var DefaultInitializer = Lobster.DefaultInitializer = Initializer.extend({
    _name : "DefaultInitializer",
    //initIndex: "explain",
    init: function(code, context) {
        this.initParent(code, context);
    },

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

            this.funcCall = this.sub.funcCall = FunctionCall.instance(this.code, {parent:this, receiver: this.entity});
            this.funcCall.compile(this.myConstructor, args);
            this.args = this.funcCall.args;
        }
        else if (isA(type, Types.Array)){
            // If it's not an array of class type, the initializers do nothing so don't
            // even make them at all.
            if (isA(type.elemType, Types.Class)){
                this.sub.arrayElemInitializers = [];
                for(var i = 0; i < type.length; ++i){
                    var elemInit = DefaultInitializer.instance(this.code, {parent:this});
                    this.sub.arrayElemInitializers.push(elemInit);
                    elemInit.compile(ArraySubobjectEntity.instance(this.entity, i));
                    if (elemInit.hasErrors()){
                        this.addNote(CPPError.declaration.init.array_default_init(this));
                        break;
                    }
                }
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
                exp.message = "Each element of " + (desc.name || desc.message) + " will be initialized using " + this.sub.arrayElemInitializers[0].funcCall.describe(sim).message + ".";
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
    init: function(code, context) {
        this.initParent(code, context);
    },

    compile : function(entity, args) {
        var self = this;
        assert(isA(entity, CPPEntity));
        args = args || [];
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
                return self.createAndCompileChildExpr(arg);
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
                this.sub.args = this.args;
            }
            else if (isA(type, Types.Array) && isA(this.args[0].type, Types.Array) && this.args[0].entity){
                if (this.args.length > 1){
                    this.addNote(CPPError.declaration.init.array_args(this, type));
                }

                this.sub.arrayElemInitializers = [];
                for(var i = 0; i < type.length; ++i){
                    var elemInit = DirectInitializer.instance(this.code, {parent:this});
                    this.sub.arrayElemInitializers.push(elemInit);
                    elemInit.compile(ArraySubobjectEntity.instance(this.entity, i),
                            [EntityExpression.instance(ArraySubobjectEntity.instance(this.args[0].entity, i), null, {parent:this})]);
                    if(elemInit.hasErrors()) {
                        this.addNote(CPPError.declaration.init.array_direct_init(this));
                        break;
                    }
                }
            }
            else{ // Scalar type
                if (this.args.length > 1){
                    this.addNote(CPPError.declaration.init.scalar_args(this, type));
                }

                //Attempt standard conversion to declared type
                arg = this.args[0] = standardConversion(arg, type);

                // Type check
                if (isA(type, Types.Array) && isA(type.elemType, Types.Char)
                    && isA(arg, Expressions.Literal) && isA(arg.type, Types.String)){
                    //if we're initializing a character array from a string literal, check length
                    if (arg.value.value.length + 1 > type.length){
                        this.addNote(CPPError.declaration.init.stringLiteralLength(this, arg.value.value.length + 1, type.length));
                    }
                }
                else if (!sameType(type, arg.type)) {
                    this.addNote(CPPError.declaration.init.convert(this, arg.type, type));
                }
                this.sub.args = this.args;
            }
        }
        else { // if (isA(type, Types.Class))

            // Need to select constructor, so have to compile auxiliary arguments
            var auxArgs = args.map(function (arg) {
                var auxArg = Expressions.createExpr(arg, {parent: self, auxiliary: self.context.auxiliary + 1});
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

            this.funcCall = FunctionCall.instance(this.code, {parent: this, receiver: this.entity});
            this.funcCall.compile(this.myConstructor, args);
            this.args = this.funcCall.args;
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


        if (isA(obj, ReferenceEntity)){ // Proper reference
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
            if (isA(type, Types.Array) && isA(type.elemType, Types.Char) && isA(this.args[0].type, Types.String)) {
                var charArr = inst.childInstances.args[0].evalValue.value.split("");
                for (var i = 0; i < charArr.length; ++i) {
                    charArr[i] = charArr[i].charCodeAt(0);
                }
                charArr.push(0);
                obj.writeValue(charArr);
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
            if (isA(type, Types.Array) && isA(type.elemType, Types.Char) && isA(this.args[0].type, Types.String)) {
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

var InitializerList = Lobster.InitializerList = CPPCode.extend({
    _name : "InitializerList",
    init: function(code, context) {
        assert(context.entity, "Initializer context must specify entity to be initialized!");
        this.initParent(code, context);
        this.initializerListLength = code.initializerList.length;
    },
    compile : function(){
        var code = this.code;
        var type = this.context.entity.type;

        if (!isA(type, Types.Array)){
            this.addNote(CPPError.declaration.init.list_array(this));
        }
        else if (type.length !== code.initializerList.length){
            this.addNote(CPPError.declaration.init.list_length(this, type.length));
        }

        if (this.hasErrors()){ return; }

        var list = code.initializerList;
        //this.initializerList = [];
        for(var i = 0; i < list.length; ++i){
            var initListElem = this.sub["arg"+i] = this.createAndCompileChildExpr(list[i], type.elemType);

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
        var obj = this.context.entity.lookup(sim, inst);

        var arr = [];
        for(var i = 0; i < this.initializerListLength; ++i){
            arr[i] = inst.childInstances["arg"+i].evalValue.getValue();
        }
        obj.writeValue(arr);

        inst.index = "done";
        this.done(sim, inst);
    }
});

// NOTE: Any MagicFunctionDefinitions will be exempt from the ODR during linking
var MagicFunctionDefinition = Declarations.MagicFunctionDefinition = Class.extend({
    _name: "MagicFunctionDefinition",
    isDefinition: true,
    init : function(name, type){
        this.initParent();
        this.name = name;
        this.type = type;
        this.calls = [];
        this.context = {};
    },

    compile : function(){

    }
});

var OVERLOADABLE_OPS = {};

["new[]"
    , "delete[]"
    , "new"
    , "delete"
    , "->*", ">>=", "<<="
    , "+=", "-=", "*=", ",=", "%=", "^="
    , "&=", "|=", "<<", ">>", "==", "!="
    , "<=", ">=", "&&", "||", "++", "--"
    , "->", "()", "[]"
    , "+", "-", "*", "/", "%", "^", "&"
    , "|", "~", "!", "=", "<", ">", ","].forEach(function (op) {
        OVERLOADABLE_OPS["operator" + op] = true;
    });

var FunctionDefinition = Lobster.Declarations.FunctionDefinition = CPPCode.extend(BaseDeclarationMixin, {
    _name: "FunctionDefinition",
    isDefinition: true,
    subSequence: ["memberInitializers", "body"],
    instType: "call",

    createFromASTSource : function(ast, context) {
        // HACK: should handle this when ast is created, I think
        ast.specs = ast.specs || {typeSpecs: [], storageSpecs: []};


    },

    init : function(code, context){
        code.specs = code.specs || {typeSpecs: [], storageSpecs: []};
        this.initParent(code, copyMixin(context, {func: this}));
        this.calls = [];
        if (context.memberOfClass) {
            this.isMemberFunction = true;
            this.isInlineMemberFunction = true;
            this.memberOfClass = context.memberOfClass;
            this.receiverType = this.parent.type.instance();
        }
        this.sub.memberInitializers = [];
        this.autosToDestruct = [];

        this.body = this.sub.body = Statements.FunctionBodyBlock.instance(this.code.body, {func: this, parent: this});
    },

    compile : function(){
        this.compileDeclaration();
        this.compileDefinition();
    },

    // EFFECTS: returns an array of errors
    compileDeclaration : function(){
        var code = this.code;


        // This function's scope (actually scope used for its body block)
        this.bodyScope = this.body.blockScope;

        this.compileDeclarator();
        if (this.hasErrors()){
            return;
        }

        // Add entity to scope
        try{
            if (!this.makeEntity()) {
                return;
            }

            // If main, should have no parameters
            if (this.isMain && this.params.length > 0){
                this.addNote(CPPError.declaration.func.mainParams(this.params[0]));
            }

            if (this.isMemberFunction){
                this.memberOfClass.addMember(this.entity);
            }


            if (!this.isMemberFunction && this.virtual){
                this.addNote(CPPError.declaration.func.virtual_member(this));
            }

            this.checkOverloadSemantics();

        }
        catch(e){
            if (isA(e, SemanticException)){
                this.addNote(e.annotation(this));
                return;
            }
            else{
                console.log(e.stack);
                throw e;
            }
        }
    },

    // Responsible for setting the type, params, and paramTypes properties
    compileDeclarator : function(){
        // Compile the type specifier
        var typeSpec = TypeSpecifier.instance(this.code.specs.typeSpecs, {parent: this});
        typeSpec.compile();
        if (this.hasErrors()){
            return;
        }

        this.virtual = !!this.code.specs.virtual;

        // Compile the declarator
        var decl = this.declarator = Declarator.instance(this.code.declarator, {parent: this, scope: this.bodyScope}, typeSpec.type);
        decl.compile();
        this.name = decl.name;
        this.isMain = this.name === "main";
        this.type = decl.type;

        this.params = this.declarator.params || [];
        this.paramTypes = this.params.map(function(param){
            return param.type;
        });
    },

    compileDefinition : function(){
        var self = this;
        if (this.hasErrors()){
            return;
        }

        // Compile the body
        this.body.compile();

        if (this.hasErrors()){return;}

        // this.semanticProblems.addWidget(DeclarationAnnotation.instance(this));

        this.autosToDestruct = this.bodyScope.automaticObjects.filter(function(obj){
            return isA(obj.type, Types.Class);
        });

        this.bodyScope.automaticObjects.filter(function(obj){
          return isA(obj.type, Types.Array) && isA(obj.type.elemType, Types.Class);
        }).map(function(arr){
          for(var i = 0; i < arr.type.length; ++i){
            self.autosToDestruct.push(ArraySubobjectEntity.instance(arr, i));
          }
        });

        this.autosToDestruct = this.autosToDestruct.map(function(obj){
            var dest = obj.type.destructor;
            if (dest){
                var call = FunctionCall.instance(null, {parent: self, scope: self.bodyScope, receiver: obj});
                call.compile(dest, []);
                return call;
            }
            else{
                self.addNote(CPPError.declaration.dtor.no_destructor_auto(obj.decl, obj));
            }

        });
    },

    checkOverloadSemantics : function(){
        if (this.name === "operator=" || this.name === "operator()" || this.name === "operator[]"){
            if (!this.isMemberFunction){
                this.addNote(CPPError.declaration.func.op_member(this));
            }
        }

        if (this.name === "operator[]" && this.params.length !== 1){
            this.addNote(CPPError.declaration.func.op_subscript_one_param(this));
        }
    },

    emptyBody : function(){
        return this.code.body.statements.length === 0;
    },

    callSearch : function(callback, options){
        options = options || {};
        // this.calls will be filled when the body is being compiled
        // We assume this has already been done for all functions.

        this.callClosure = {};

        var queue = [];
        queue.unshiftAll(this.calls.map(function(call){
            return {call: call, from: null};
        }));

        var search = {
            chain: []
        };
        while (queue.length > 0){
            var next = (options.searchType === "dfs" ? queue.pop() : queue.shift());
            var call = next.call;
            search.chain = next;
            if (search.stop){
                break;
            }
            else if (search.skip){

            }
            else if (call.func.isLinked() && call.func.isStaticallyBound()){

                if (call.staticFunction.decl === this){
                    search.cycle = true;
                }
                else{
                    search.cycle = false;
                    for(var c = next.from; c; c = c.from){
                        if (c.call.staticFunction.entityId === call.staticFunction.entityId){
                            search.cycle = true;
                            break;
                        }
                    }
                }

                callback && callback(search);

                // If there's no cycle, we can push children
                if (!search.cycle && isA(call.staticFunction.decl, FunctionDefinition)) {
                    for(var i = call.staticFunction.decl.calls.length-1; i >= 0; --i){
                        queue.push({call: call.staticFunction.decl.calls[i], from: next});
                    }
                }

                this.callClosure[call.staticFunction.entityId] = true;
            }

        }
    },

    tailRecursionAnalysis : function(annotatedCalls){

        // Assume not recursive at first, will be set to true if it is
        this.isRecursive = false;

        // Assume we can use constant stack space at first, will be set to false if not
        this.constantStackSpace = true;

        //from = from || {start: this, from: null};

        // The from parameter sort of represents all functions which, if seen again, constitute recursion


        //console.log("tail recursion analysis for: " + this.name);
        var self = this;
        this.callSearch(function(search){

            // Ignore non-cycles
            if (!search.cycle){
                return;
            }

            var str = " )";
            var chain = search.chain;
            var cycleStart = chain.call;
            var first = true;
            var inCycle = true;
            var tailCycle = true;
            var nonTailCycleCalls = [];
            var firstCall = chain.call;
            while (chain){
                var call = chain.call;

                // Mark all calls in the cycle as part of a cycle, except the original
                if (chain.from || first){
                    call.isPartOfCycle = true;
                }

                // Make sure we know whether it's a tail call
                call.tailRecursionCheck();

                // At time of writing, this will always be true due to the way call search works
                if (call.staticFunction){
                    // If we know what the call is calling


                    str = (call.staticFunction.name + ", ") + str;
                    if (call.isTail){
                        str = "t-" + str;
                    }
                    if (!first && call.staticFunction === cycleStart.staticFunction){
                        inCycle = false;
                        str = "( " + str;
                    }

                    // This comes after possible change in inCycle because first part of cycle doesn't have to be tail
                    if (inCycle){
                        if (!annotatedCalls[call.id]){
                            // TODO: fix this to not use semanticProblems
                            // self.semanticProblems.addWidget(RecursiveCallAnnotation.instance(call, call.isTail, call.isTailReason, call.isTailOthers));
                            annotatedCalls[call.id] = true;
                        }
                    }
                    if (inCycle && !call.isTail){
                        tailCycle = false;
                        nonTailCycleCalls.push(call);
                    }
                }
                else if (call.staticFunctionType){
                    // Ok at least we know the type we're calling

                }
                else{
                    // Uhh we don't know anything. This really shouldn't happen.
                }
                first = false;
                chain = chain.from;
            }
            //console.log(str + (tailCycle ? " tail" : " non-tail"));

            // We found a cycle so it's certainly recursive
            self.isRecursive = true;

            // If we found a non-tail cycle, it's not tail recursive
            if (!tailCycle){
                self.constantStackSpace = false;
                if (!self.nonTailCycles){
                    self.nonTailCycles = [];
                }
                self.nonTailCycles.push(search.chain);
                self.nonTailCycle = search.chain;
                self.nonTailCycleReason = str;

                if(!self.nonTailCycleCalls){
                    self.nonTailCycleCalls = [];
                }
                self.nonTailCycleCalls.pushAll(nonTailCycleCalls);
            }
        },{
            searchType: "dfs"
        });
        //console.log("");
        //console.log("");

        self.tailRecursionAnalysisDone = true;


        // TODO: fix this to not use semanticProblems
        // this.semanticProblems.addWidget(RecursiveFunctionAnnotation.instance(this));
    },

    makeEntity : function(){
        var entity;
        if (this.isMemberFunction){
            entity = MemberFunctionEntity.instance(this, this.memberOfClass, this.virtual);
        }
        else{
            entity = FunctionEntity.instance(this);
        }


        entity.setDefinition(this);

        this.entity = entity;

        if (!this.isMemberFunction) {
            try {
                this.contextualScope.addDeclaredEntity(entity);
            }
            catch(e) {
                this.addNote(e);
                return null;
            }
        }
        return entity;
    },

    createInstance : function(args){
        var inst = CPPCode.createInstance.apply(this, arguments);
        inst.returnValue = Value.instance("", Types.Void.instance()); // TODO lol hack
        inst.funcContext = inst; // Each function definition starts a new function context.
        inst.caller = inst.parent;
        return inst;
    },

    setArguments : function(sim, inst, args){
        inst.argInitializers = args;
    },

    setReturnObject : function(sim, inst, returnObject){
        inst.returnObject = returnObject;
    },

    getReturnObject : function(sim, inst){
        return inst.returnObject;
    },

    tailCallReset : function(sim, inst, caller) {

        // Need to unseat all reference that were on the stack frame for the function.
        // Otherwise, lookup weirdness can occur because the reference lookup code wasn't
        // intended to be able to reseat references and parameter initializers will instead
        // think they're supposed to pass into the things that the references on the existing
        // stack frame were referring to.
        inst.frame.setUpReferenceInstances();

        inst.reusedFrame = true;
        inst.caller = caller;
        inst.index = this.initIndex;
        sim.popUntil(inst);
        //inst.send("reset"); // don't need i think
        return inst;
    },

    done : function(sim, inst){

        //TODO: if no return value and non-void, undefined behavior
        if (!inst.returnValueSet){
            this.flowOffEndReturn(sim, inst);
        }

        if (inst.receiver){
            inst.receiver.callEnded();
        }

        sim.memory.stack.popFrame(inst);
        sim.pop(inst);
    },

    flowOffEndReturn : function(sim, inst){
        if (this.isMain){
            inst.returnValue = Value.instance(0, Types.Int.instance());
        }
        else if (isA(this.type.returnType, Types.Void)){
            inst.returnValue = Value.instance("", Types.Void.instance());
        }
        else{
            inst.returnValue = Value.instance(0, this.type.returnType);
            sim.alert("Yikes! Your function ended without returning anything! The C++ standard says this is technically implementation defined behavior, but that sounds scary! I'm working on getting smart enough to give you a compiler warning if this might happen.")
        }
    },

    upNext : function(sim, inst){
        if (inst.index === "afterChildren") {
            this.autosToDestruct.forEach(function (autoDest){
                autoDest.createAndPushInstance(sim, inst);
            });
            inst.index = "afterDestructors";
            return true;
        }

        return FunctionDefinition._parent.upNext.apply(this, arguments);
    },

    stepForward : function(sim, inst){
        if (inst.index === "afterDestructors"){
            this.done(sim, inst);
        }
    },

    isTailChild : function(child){
        if (child !== this.body){
            return {isTail: false};
        }
        else if (this.autosToDestruct.length > 0){
            return {
                isTail: false,
                reason: "The highlighted local variables ("

                +
                this.bodyScope.automaticObjects.filter(function(obj){
                    return isA(obj.type, Types.Class);
                }).map(function(obj){

                    return obj.name;

                }).join(",")
                    +

                ") have destructors that will run at the end of the function body (i.e. after any possible recursive call).",
                others: this.bodyScope.automaticObjects.filter(function(obj){
                    return isA(obj.type, Types.Class);
                }).map(function(obj){

                    var decl = obj.decl;
                    if (isA(decl, Declarator)){
                        decl = decl.parent;
                    }
                    return decl;

                })
            }
        }
        else {
            return {isTail: true};
        }
    },
    describe : function(){
        var exp = {};
        exp.message = "a function definition";
        return exp;
    }
});




var ClassDeclaration = Lobster.Declarations.ClassDeclaration = CPPCode.extend(BaseDeclarationMixin, {
    _name: "ClassDeclaration",

    compile : function(){
        assert(false, "Must use compileDeclaration and compileDefinition separately for a ClassDeclaration.");
    },

    compileDeclaration : function(){
        var code = this.code;


        this.key = code.head.key;
        this.name = code.head.name.identifier;
        this.members = [];


        // Base classes

        if (this.code.head.bases && this.code.head.bases.length > 0){
            if (this.code.head.bases.length > 1){
                this.addNote(CPPError.classDef.multiple_inheritance(this));
                return;
            }

            try{
                var baseCode = this.code.head.bases[0];

                // TODO NEW: Use an actual Identifier expression for this
                this.base = this.contextualScope.requiredLookup(baseCode.name.identifier);

                if (!isA(this.base, TypeEntity) || !isA(this.base.type, Types.Class)){
                    this.addNote(CPPError.classDef.base_class_type({code:baseCode.name}, baseCode.name.identifier));
                }

                if (baseCode.virtual){
                    this.addNote(CPPError.classDef.virtual_inheritance({code:baseCode.name}, baseCode.name.identifier));
                }
            }
            catch(e){
                if (isA(e, SemanticExceptions.BadLookup)){
                    this.addNote(e.annotation(this));
                }
                else{
                    throw e;
                }
            }
        }



        // Check that no other type with the same name already exists
        try {
//            console.log("addingEntity " + this.name);
            // class type. will be incomplete initially, but made complete at end of class declaration
            this.type = Types.Class.createClassType(this.name, this.contextualScope, this.base && this.base.type, []);

            this.classScope = this.type.classScope;

            this.entity = TypeEntity.instance(this);

            this.entity.setDefinition(this); // TODO add exception that allows a class to be defined more than once

            this.contextualScope.addDeclaredEntity(this.entity);
        }
        catch(e){
            if (isA(e, Note)){
                this.addNote(e);
                return;
            }
            else {
                throw e;
            }
        }




        // Compile the members


        var memDecls = this.memDecls = [];
        for(var i = 0; i < code.member_specs.length; ++i){
            var spec = code.member_specs[i];
            var access = spec.access || "private";
            for(var j = 0; j < spec.members.length; ++j){
                spec.members[j].access = access;
                var memDecl = Declarations.create(spec.members[j], {parent:this, memberOfClass: this.type, access:access});

                // Within member function definitions, class is considered as complete even though it isn't yet
                if (isA(memDecl, FunctionDefinition)){
                    this.type.setTemporarilyComplete();
                }

                memDecl.compileDeclaration(this.classScope);

                // Remove temporarily complete
                this.type.unsetTemporarilyComplete();

                memDecls.push(memDecl);
            }
        }

        // If there are no constructors, then we need an implicit default constructor
        if(this.type.constructors.length == 0){
            var idc = this.createImplicitDefaultConstructor();
            if (idc){
                idc.compile();
                assert(!idc.hasErrors());
            }
        }

        this.type.copyConstructor = null;
        for(var i = 0; i < this.type.constructors.length; ++i){
            if (this.type.constructors[i].decl.isCopyConstructor){
                this.type.copyConstructor = this.type.constructors[i];
                break;
            }
        }

        // Rule of the Big Three
        var bigThreeYes = [];
        var bigThreeNo = [];
        (this.type.copyConstructor ? bigThreeYes : bigThreeNo).push("copy constructor");
        (this.type.getMember(["operator="]) ? bigThreeYes : bigThreeNo).push("assignment operator");
        (this.type.destructor ? bigThreeYes : bigThreeNo).push("destructor");

        if (0 < bigThreeYes.length && bigThreeYes.length < 3){
            // If it's only because of an empty destructor, suppress warning
            if (bigThreeYes.length === 1 && this.type.destructor && this.type.destructor.decl.emptyBody()){

            }
            else{
                this.addNote(CPPError.classDef.bigThree({code:code.head}, bigThreeYes, bigThreeNo));
            }
        }

        this.customBigThree = bigThreeYes.length > 0;

        if (!this.type.copyConstructor) {
            // Create implicit copy constructor
            var icc = this.createImplicitCopyConstructor();
            if (icc) {
                icc.compile();
                assert(!icc.hasErrors());
                this.type.copyConstructor = icc.entity;
            }
        }

        if (!this.type.destructor) {
            // Create implicit destructor
            var idd = this.createImplicitDestructor();
            if (idd) {
                idd.compile();
                assert(!idd.hasErrors());
            }
        }

        if (!this.type.getMember(["operator="])){

            // Create implicit assignment operator
            var iao = this.createImplicitAssignmentOperator();
            if (iao){
                iao.compile();
                assert(!iao.hasErrors());
            }
        }
    },

    compileDefinition : function() {
        if (this.hasErrors()){
            return;
        }
        for(var i = 0; i < this.memDecls.length; ++i){
            this.memDecls[i].compileDefinition();
        }
    },


    createImplicitDefaultConstructor : function(){
        var self = this;

        // If any data members are of reference type, do not create the implicit default constructor
        if (!this.type.memberSubobjectEntities.every(function(subObj){
                return !isA(subObj.type, Types.Reference);
            })){
            return;
        }

        // If any const data members do not have a user-provided default constructor
        if (!this.type.memberSubobjectEntities.every(function(subObj){
                if (!isA(subObj.type, Types.Class) || !subObj.type.isConst){
                    return true;
                }
                var defCon = subObj.type.getDefaultConstructor();
                return defCon && !defCon.decl.context.implicit;
            })){
            return;
        }

        // If any subobjects do not have a default constructor or destructor
        if (!this.type.subobjectEntities.every(function(subObj){
                return !isA(subObj.type, Types.Class) ||
                    subObj.type.getDefaultConstructor() &&
                    subObj.type.destructor;
            })){
            return;
        }


        var src = this.name + "() {}";
        //TODO: initialize members (i.e. that are classes)
        src = Lobster.cPlusPlusParser.parse(src, {startRule:"member_declaration"});
        return ConstructorDefinition.instance(src, {parent:this, scope: this.classScope, memberOfClass: this.type, access:"public", implicit:true});
    },

    createImplicitCopyConstructor : function(){
        var self = this;
        // If any subobjects are missing a copy constructor, do not create implicit copy ctor
        if (!this.type.subobjectEntities.every(function(subObj){
                return !isA(subObj.type, Types.Class) ||
                    subObj.type.getCopyConstructor(subObj.type.isConst);
            })){
            return;
        }

        // If any subobjects are missing a destructor, do not create implicit copy ctor
        if (!this.type.subobjectEntities.every(function(subObj){
                return !isA(subObj.type, Types.Class) ||
                    subObj.type.destructor;
            })){
            return;
        }

        var src = this.name + "(const " + this.name + " &other)";

        if (this.type.subobjectEntities.length > 0){
            src += "\n : ";
        }
        src += this.type.baseClassSubobjectEntities.map(function(subObj){
            return subObj.name + "(other)";
        }).concat(this.type.memberSubobjectEntities.map(function(subObj){
            return subObj.name + "(other." + subObj.name + ")";
        })).join(", ");

        src += " {}";
        src = Lobster.cPlusPlusParser.parse(src, {startRule:"member_declaration"});

        return ConstructorDefinition.instance(src, {parent:this, scope: this.classScope, memberOfClass: this.type, access:"public", implicit:true});
    },

    createImplicitAssignmentOperator : function () {
        var self = this;
        // Parameter will only be const if all subobjects have assignment ops that take const params
        var canMakeConst = this.type.subobjectEntities.every(function(subObj){
            return !isA(subObj.type, Types.Class) ||
                subObj.type.getAssignmentOperator(true);
        });

        var canMakeNonConst = canMakeConst || this.type.subobjectEntities.every(function(subObj){
            return !isA(subObj.type, Types.Class) ||
                subObj.type.getAssignmentOperator(false);
        });

        // If we can't make non-const, we also can't make const, and we can't make any implicit assignment op
        if (!canMakeNonConst){
            return;
        }
        var constPart = canMakeConst ? "const " : "";

        // If any data member is a reference, we can't make implicit assignment operator
        if (!this.type.memberSubobjectEntities.every(function(subObj){
                return !isA(subObj.type, Types.Reference);
            })){
            return;
        }

        // If any non-class member is const (or array thereof), we can't make implicit assignment operator
        if (!this.type.memberSubobjectEntities.every(function(subObj){
                //return (isA(subObj.type, Types.Class) || !subObj.type.isConst)
                //    && (!isA(subObj.type, Types.Array) || isA(subObj.type.elemType, Types.Class) || !subObj.type.elemType.isConst);
                return !subObj.type.isConst
                    && (!isA(subObj.type, Types.Array) || !subObj.type.elemType.isConst);
            })){
            return;
        }

        var src = this.name + " &operator=(" + constPart + this.name + " &rhs){";

        src += this.type.baseClassSubobjectEntities.map(function(subObj){
            return subObj.type.className + "::operator=(rhs);";
        }).join("\n");

        var mems = this.type.memberSubobjectEntities;
        for(var i = 0; i < mems.length; ++i){
            var mem = mems[i];
            if (isA(mem.type, Types.Array)){
                var tempType = mem.type;
                var subscriptNum = isA(tempType.elemType, Types.Array) ? 1 : "";
                var subscripts = "";
                var closeBrackets = "";
                while(isA(tempType, Types.Array)){
                    src += "for(int i"+subscriptNum+"=0; i"+subscriptNum+"<"+tempType.length+"; ++i"+subscriptNum+"){";
                    subscripts += "[i"+subscriptNum+"]";
                    closeBrackets += "}";
                    tempType = tempType.elemType;
                    subscriptNum += 1;
                }
                src += mem.name + subscripts + " = rhs." + mem.name + "" + subscripts + ";";
                src += closeBrackets;
            }
            else{
                src += mems[i].name + " = rhs." + mems[i].name + ";";
            }
        }
        src += "return *this;}";
        src = Lobster.cPlusPlusParser.parse(src, {startRule:"member_declaration"});
        return FunctionDefinition.instance(src, {parent:this, scope: this.classScope, memberOfClass: this.type, access:"public", implicit:true});
    },

    createImplicitDestructor : function(){
        var self = this;
        // If any subobjects are missing a destructor, do not create implicit destructor
        if (!this.type.subobjectEntities.every(function(subObj){
                return !isA(subObj.type, Types.Class) ||
                    subObj.type.destructor;
            })){
            return;
        }

        var src = "~" + this.type.name + "(){}";
        src = Lobster.cPlusPlusParser.parse(src, {startRule:"member_declaration"});
        return DestructorDefinition.instance(src, {parent:this, scope: this.classScope, memberOfClass: this.type, access:"public", implicit:true});
    },

    createInstance : function(sim, inst){
        return CPPCodeInstance.instance(sim, this, {decl:0, step:"decl"}, "stmt", inst);
    },

    upNext : function(sim, inst){

    },

    stepForward : function(sim, inst){

    }
});

var MemberDeclaration = Lobster.Declarations.Member = Declaration.extend({
    _name: "MemberDeclaration",
    init: function(code, context){
        assert(context);
        assert(isA(context.memberOfClass, Types.Class));
        assert(context.hasOwnProperty("access"));
        this.initParent(code, context);
        this.access = context.access;
        this.memberOfClass = context.memberOfClass;
        this.declarators = [];
        return this;
    },

    // i_determineStorage : function(){
    //     // Determine storage duration based on the kind of scope in which the declaration
    //     // occurs and any storage specifiers.
    //     if(this.storageSpec.static){
    //         this.storageDuration = "static";
    //     }
    //     else{
    //         this.storageDuration = "automatic";
    //     }
    // },

    makeEntity: function(decl){

        // Note: we know it's not a function definition because that goes to the FunctionDefinition
        // class.  Thus any functions are not definitions.
        // Don't have to check for classes, for similar reasons.
        var isDefinition = !isA(decl.type, Types.Function)
            && !(this.storageSpec.extern && !(decl.initializer || decl.initializerList))
            && !this.typedef;

        this.isDefinition = isDefinition;

        var entity;
        if (isA(decl.type, Types.Function)){
            entity = MemberFunctionEntity.instance(decl, this.memberOfClass, this.virtual);
        }
        else if (this.storageDuration === "static"){
            entity = StaticEntity.instance(decl);
        }
        else{
            entity = MemberSubobjectEntity.instance(decl, this.memberOfClass);
            this.isDefinition = false; // TODO NEW: This is a hack. Since implementing a proper linking phase, static stuff may be broken.
        }

        if (this.isDefinition) {
            entity.setDefinition(this);
        }

        try {
            this.entities.push(entity);
            if (isA(entity, MemberSubobjectEntity) && !this.memberOfClass.containsMember(entity.name)){
                this.memberOfClass.addMember(entity); // this internally adds it to the class scope
            }
            return entity;
        }
        catch(e) {
            if (isA(e, Note)){
                this.addNote(e);
                return null;
            }
            else {
                throw e;
            }
        }
    }
});


var ConstructorDefinition = Lobster.Declarations.ConstructorDefinition = FunctionDefinition.extend({
    _name: "ConstructorDefinition",

    instance : function(code, context){
        assert(context);
        assert(isA(context.memberOfClass, Types.Class));
        assert(context.hasOwnProperty("access"));
        // Make sure it's actually a constructor
        if (code.name.identifier !== context.memberOfClass.className){
            // oops was actually a function with missing return type
            return FunctionDefinition.instance(code, context);
        }

        return ConstructorDefinition._parent.instance.apply(this, arguments);
    },

    init : function(code, context){
        this.initParent(code, context);
    },

    compileDeclaration : function() {
        FunctionDefinition.compileDeclaration.apply(this, arguments);

        if (!this.hasErrors()){
            this.memberOfClass.addConstructor(this.entity);
        }
    },

    compileDeclarator : function(){
        var code = this.code;


        // NOTE: a constructor doesn't have a "name", and so we don't need to add it to any scope.
        // However, to make lookup easier, we give all constructors their class name plus the null character. LOL
        // TODO: this is silly. remote it pls :)
        this.name = this.memberOfClass.className + "\0";

        // Compile the parameters
        var args = this.code.args;
        this.params = [];
        this.paramTypes = [];
        for (var j = 0; j < args.length; ++j) {
            var paramDecl = Parameter.instance(args[j], {parent: this, scope: this.bodyScope});
            paramDecl.compile();
            this.params.push(paramDecl);
            this.paramTypes.push(paramDecl.type);
        }
        this.isDefaultConstructor = this.params.length == 0;

        this.isCopyConstructor = this.params.length == 1
        && (isA(this.paramTypes[0], this.memberOfClass) ||
        isA(this.paramTypes[0], Types.Reference) && isA(this.paramTypes[0].refTo, this.memberOfClass));


        // Give error for copy constructor that passes by value
        if (this.isCopyConstructor && isA(this.paramTypes[0], this.memberOfClass)){
            this.addNote(CPPError.declaration.ctor.copy.pass_by_value(this.params[0], this.paramTypes[0], this.params[0].name));
        }

        // I know this is technically wrong but I think it makes things run smoother
        this.type = Types.Function.instance(Types.Void.instance(), this.paramTypes);
    },

    compileDefinition : function(){
        var self = this;
        var code = this.code;

        if (!code.body){
            this.addNote(CPPError.classDef.ctor_def(this));
            return;
        }

        this.compileCtorInitializer();

        // Call parent class version. Will handle body, automatic object destruction, etc.
        FunctionDefinition.compileDefinition.apply(this, arguments);
    },

    compileCtorInitializer : function(){
        var memInits = this.code.initializer || [];

        // First, check to see if this is a delegating constructor.
        var targetConstructor = null;
        for(var i = 0; i < memInits.length; ++i){
            if (memInits[i].member.identifier == this.memberOfClass.className){
                targetConstructor = i;
                break;
            }
        }

        // It is a delegating constructor
        if (targetConstructor !== null){
            targetConstructor = memInits.splice(targetConstructor, 1)[0];
            // If it is a delegating constructor, there can be no other memInits
            if (memInits.length === 0){ // should be 0 since one removed
                var mem = MemberInitializer.instance(targetConstructor, {parent: this, scope: this.bodyScope});
                mem.compile(ReceiverEntity.instance(this.memberOfClass), targetConstructor.args || []);
                this.sub.memberInitializers.push(mem);
            }
            else{
                this.addNote(CPPError.declaration.ctor.init.delegating_only(this));
            }
            return;
        }

        // It is a non-delegating constructor

        // If there is a base class subobject, initialize it
        var base;
        if (base = this.memberOfClass.getBaseClass()){
            // Check to see if there is a base class initializer.
            var baseInits = memInits.filter(function(memInit){
                return memInit.member.identifier === base.className;
            });
            memInits = memInits.filter(function(memInit){
                return memInit.member.identifier !== base.className;
            });

            if (baseInits.length > 1){
                this.addNote(CPPError.declaration.ctor.init.multiple_base_inits(this));
            }
            else if (baseInits.length === 1){
                var mem = MemberInitializer.instance(baseInits[0], {parent: this, scope: this.bodyScope});
                mem.compile(this.memberOfClass.baseClassSubobjectEntities[0], baseInits[0].args || []);
                this.sub.memberInitializers.push(mem);
            }
            else{
                var mem = DefaultMemberInitializer.instance(this.code, {parent: this, scope: this.bodyScope});
                mem.compile(this.memberOfClass.baseClassSubobjectEntities[0]);
                this.sub.memberInitializers.push(mem);
                mem.isMemberInitializer = true;
            }
        }

        // Initialize non-static data members of the class

        // Create a map of name to initializer. Initially all initializers are null.
        var initMap = {};
        this.memberOfClass.memberSubobjectEntities.forEach(function(objMember){
            initMap[objMember.name] = objMember;
        });

        // Iterate through all the member initializers and associate them with appropriate member
        for(var i = 0; i < memInits.length; ++i){
            var memInit = memInits[i];

            // Make sure this type has a member of the given name
            var memberName = memInit.member.identifier;
            if (initMap.hasOwnProperty(memberName)) {
                var mem = MemberInitializer.instance(this, {parent: this, scope: this.bodyScope});
                mem.compile(initMap[memberName], memInit.args || []);
                initMap[memberName] = mem;
            }
            else{
                this.addNote(CPPError.declaration.ctor.init.improper_member(memInit.member));
            }
        }

        // Now iterate through members again in declaration order. Add associated member initializer
        // from above or default initializer if there wasn't one.

        var self = this;
        this.memberOfClass.memberSubobjectEntities.forEach(function(objMember){
            if (isA(initMap[objMember.name], MemberInitializer)){
                self.sub.memberInitializers.push(initMap[objMember.name]);
            }
            else if (isA(objMember.type, Types.Class) || isA(objMember.type, Types.Array)){
                var mem = DefaultMemberInitializer.instance(self.code, {parent: self, scope: self.bodyScope});
                mem.compile(objMember);
                self.sub.memberInitializers.push(mem);
                mem.isMemberInitializer = true;
            }
            else{
                // No need to do anything for non-class types since default initialization does nothing
            }
        });
    },

    flowOffEndReturn : function(sim, inst){
        inst.returnValue = Value.instance("", Types.Void.instance());
    },

    isTailChild : function(child){
        return {isTail: false};
    },

    describe : function(sim, inst){
        var desc = {};
        if (this.isDefaultConstructor){
            desc.message = "the default constructor for the " + this.memberOfClass.className + " class";
        }
        else if (this.isCopyConstructor){
            desc.message = "the copy constructor for the " + this.memberOfClass.className + " class";
        }
        else{
            desc.message = "a constructor for the " + this.memberOfClass.className + " class";
        }
        return desc
    }
});







var DestructorDefinition = Lobster.Declarations.DestructorDefinition = FunctionDefinition.extend({
    _name: "DestructorDefinition",

    init : function(code, context){
        assert(context);
        assert(isA(context.memberOfClass, Types.Class));
        assert(context.hasOwnProperty("access"));
        this.initParent(code, context);
        this.access = context.access;
        this.memberOfClass = context.memberOfClass;
    },

    compileDeclaration : function() {
        FunctionDefinition.compileDeclaration.apply(this, arguments);
        this.memberOfClass.addDestructor(this.entity);
    },

    compileDeclarator : function() {
        var code = this.code;


        // Destructors do have names and can be found via name lookup
        this.name = "~" + this.memberOfClass.className;

        this.virtual = this.code.virtual;

        // There are no parameters for a destructor
        this.params = [];
        this.paramTypes = [];

        // I know this is technically wrong but I think it makes things run smoother
        this.type = Types.Function.instance(Types.Void.instance(), this.paramTypes);
    },

    compileDefinition: function(){
        var self = this;
        var code = this.code;


        if (!code.body){
            this.addNote(CPPError.classDef.dtor_def(this));
            return;
        }

        // Call parent class version. Will handle body, automatic object destruction, etc.
        FunctionDefinition.compileDefinition.apply(this, arguments);

        this.membersToDestruct = this.memberOfClass.memberSubobjectEntities.filter(function(obj){
            return isA(obj.type, Types.Class);
        }).map(function(obj){
            var dest = obj.type.destructor;
            if (dest){
                var call = FunctionCall.instance(null, {parent: self, receiver: obj});
                call.compile(dest, []);
                return call;
            }
            else{
                self.addNote(CPPError.declaration.dtor.no_destructor_member(obj.decl, obj, self.memberOfClass));
            }

        });

        this.basesToDestruct = this.memberOfClass.baseClassSubobjectEntities.map(function(obj){
            var dest = obj.type.destructor;
            if (dest){
                var call = FunctionCall.instance(null, {parent: self, receiver: obj});
                call.compile(dest, []);
                return call;
            }
            else{
                self.addNote(CPPError.declaration.dtor.no_destructor_base(obj.decl, obj, self.memberOfClass));
            }

        });
    },

    flowOffEndReturn : function(sim, inst){
        inst.returnValue = Value.instance("", Types.Void.instance());
    },

    upNext : Class.BEFORE(function(sim, inst){
        if (inst.index === "afterChildren") {
            // These are pushed on a stack and so end up happening
            // in reverse order of the order they are pushed here.
            // Autos first, then members, then bases.
            this.basesToDestruct.forEach(function (dest){
                dest.createAndPushInstance(sim, inst);
            });
            this.membersToDestruct.forEach(function (dest){
                dest.createAndPushInstance(sim, inst);
            });
            // Auto destructors are handled in parent class
        }
    }),

    stepForward : function(sim, inst){
        if (inst.index === "afterDestructors"){
            inst.index = "done";
        }
    },

    isTailChild : function(child){
        return {isTail: false};
    }
});





// hack to make sure I don't mess up capitalization
Declarations["class"] = Declarations.ClassDeclaration;
for (var key in Declarations){
    Declarations[key.toLowerCase()] = Declarations[key];
}

