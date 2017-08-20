var Lobster = Lobster || {};

var Declarations = Lobster.Declarations = {

};

// A POD type
var StorageSpecifier = Lobster.StorageSpecifier = CPPConstruct.extend({
    _name: "StorageSpecifier",
    compile : function(){


        this.numSpecs = 0;
        for(var i = 0; i < this.ast.length; ++i){
            if (this[this.ast[i]]){
                this.addNote(CPPError.declaration.storage.once(this, this.ast[i]));
            }
            else {
                this[this.ast[i]] = true;
                ++this.numSpecs;
                if (this.ast[i] != "static"){
                    this.addNote(CPPError.declaration.storage.unsupported(this, this.ast[i]));
                }
            }

        }
        if (this.ast.length < 2 ||
            this.ast.length == 2 && this.thread_local && (this.static || this.extern)){
            //ok
        }
        else{
            this.addNote(CPPError.declaration.storage.incompatible(this, this.ast));
        }
    }
});


var BaseDeclarationMixin = {
    tryCompileDeclaration : function(){
        try {
            return this.compileDeclaration.apply(this, arguments);
        }
        catch(e) {
            if (isA(e, Note)) {
                this.addNote(e);
            }
            else if (isA(e, SemanticException)){
                this.addNote(e.annotation(this));
            }
            else{
                console.log(e.stack);
                throw e;
            }
        }
    },

    tryCompileDefinition : function(){
        try {
            return this.compileDefinition.apply(this, arguments);
        }
        catch(e) {
            if (isA(e, Note)) {
                this.addNote(e);
            }
            else if (isA(e, SemanticException)){
                this.addNote(e.annotation(this));
            }
            else{
                console.log(e.stack);
                throw e;
            }
        }
    }
};

var Declaration = Lobster.Declarations.Declaration = CPPConstruct.extend(BaseDeclarationMixin, {
    _name: "Declaration",
    instType: "stmt",
    initIndex: 0,
    init: function(ast, context){
        this.initParent(ast, context);
        this.initializers = [];
        this.entities = [];
        return this;
    },

    i_createFromAST : function () {
        Declaration._parent.i_createFromAST.apply(this, arguments);
        this.typeSpec = TypeSpecifier.instance(this.ast.specs.typeSpecs, {parent: this});
        this.storageSpec = StorageSpecifier.instance(this.ast.specs.storageSpecs, {parent:this});
        var self = this;
        this.declarators = this.ast.declarators.map(function(declAst){
            return Declarator.instance(declAst, {parent: self});
        });
    },

    compile : function(){
        this.compileDeclaration();
        this.compileDefinition();
    },

    compileDeclaration : function() {
        var ast = this.ast;

        this.typeSpec.compile();
        this.storageSpec.compile();

        // TODO, if storage is specified, declarators cannot be empty (classes and such)
        if (this.hasErrors()) {
            return;
        }

        this.typedef = !!ast.specs.typedef;
        this.friend = !!ast.specs.friend;
        this.virtual = !!ast.specs.virtual;

        if (this.storageSpec.numSpecs > 0 && this.typedef) {
            this.addNote(CPPError.declaration.storage.typedef(this, this.storageSpec.ast))
        }

        this.i_determineStorage();


        // Compile each declarator with respect to the type specifier
        for (var i = 0; i < this.declarators.length; ++i) {
            var decl = this.declarators[i];
            decl.compile({baseType: this.typeSpec.type});

            // If there are errors in the declarator, don't create an entity or anything.
            if (decl.hasErrors()){
                continue;
            }

            this.makeEntity(decl);
        }
    },

    compileDefinition : function(){
        if (!this.isDefinition){
            return;
        }
        for (var i = 0; i < this.entities.length; ++i) {
            var ent = this.entities[i];
            var decl = ent.decl;
            var initCode = decl.ast.initializer;

            // Compile initializer
            var init;
            if (initCode){
                // TODO: move these to pre-compile phase
                if (initCode.construct_type === "initializer_list"){
                    init = InitializerList.instance(initCode, {parent: this});
                    init.compile(ent);
                }
                else if (initCode.construct_type === "direct_initializer"){
                    init = DirectInitializer.instance(initCode, {parent: this});
                    init.compile(ent);
                }
                else if (initCode.construct_type === "copy_initializer"){
                    init = CopyInitializer.instance(initCode, {parent: this});
                    init.compile(ent);
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

    makeEntity: function(declarator){

        // Note: Due to the mapping from the grammar to constructs, all function definitions go
        // to the FunctionDefinition class.  Thus any functions we encounter here are declarations,
        // not definitions. We also know we're not dealing with member functions here, for similar reasons.

        // TODO: Allow class declarations (although it might be parsed differently and end up in a different
        // class, I'm just putting the note here for now)

        this.isDefinition = !isA(declarator.type, Types.Function)
        && !(this.storageSpec.extern && !(declarator.initializer))
        && !this.typedef;

        var entity;
        if (isA(declarator.type, Types.Function)){
            if (this.virtual){
                this.addNote(CPPError.declaration.func.virtual_member(this));
            }
            entity = FunctionEntity.instance(declarator);
        }
        else if (isA(declarator.type, Types.Reference)) {
            entity = ReferenceEntity.instance(declarator);
        }
        else if (this.storageDuration === "static"){
            entity = StaticEntity.instance(declarator);
        }
        else{
            entity = AutoEntity.instance(declarator);
        }

        if (this.isDefinition) {
            entity.setDefinition(this);
        }

        try{
            this.contextualScope.addDeclaredEntity(entity);
            this.entities.push(entity);
            declarator.entity = entity;
            return entity;
        }
        catch(e){
            if (isA(e, Note)){
                this.addNote(e);
            }
            else{
                throw e;
            }
        }
    },

    isTailChild : function(child){
        return {isTail: false, reason: "The variable must still be initialized with the return value of the function."};
    },

    upNext : function(sim, inst){
        if (inst.index < this.initializers.length){
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


var Parameter = Lobster.Declarations.Parameter = CPPConstruct.extend({
    _name: "Parameter",

    i_createFromAST : function() {
        Parameter._parent.i_createFromAST.apply(this, arguments);
        this.typeSpec = TypeSpecifier.instance(this.ast.specs.typeSpecs, {parent: this});
        this.declarator = Declarator.instance(this.ast.declarator, {parent: this});
    },

    compile : function(){

        this.typeSpec.compile();
        this.declarator.compile({baseType: this.typeSpec.type});

        this.name = this.declarator.name;
        this.type = this.declarator.type;

        // Errors related to parameters of void type are handled elsewhere in function declarator part
        // TODO: Check this mysterious comment that was here ^^^

        if (isA(this.parent.parent, FunctionDefinition) ||
            isA(this.parent, ConstructorDefinition)){ // TODO this is way too hacky....or is it :p
            // TODO: ^^^ yes it is way too hacky. fix will be to make it the responsibility of the enclosing
            // FunctionDefinition (or ConstructorDefinition, etc.) to check its declarator for parameters
            // that have entities that need to be added.


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

// TODO: take baseType as a parameter to compile rather than init
var Declarator = Lobster.Declarator = CPPConstruct.extend({
    _name: "Declarator",

    compile : function(compilationContext){

        this.baseType = compilationContext.baseType;

        var ast = this.ast;
        var type = this.baseType;

        var first = true;
        var isParam = isA(this.parent, Declarations.Parameter);
        var isMember = isA(this.parent, Declarations.Member);

        this.pureVirtual = !!ast.pureVirtual;

        var prev = false;
        var decl = this.ast;
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
                            else if (postfix.size.construct_type !== "literal" && !(innermost && isA(this.parent, Expressions.NewExpression))){
                                this.addNote(CPPError.declaration.array.literal_length_only(this));
                            }
                            else if (postfix.size.construct_type === "literal" && postfix.size.value == 0 && !(innermost && isA(this.parent, Expressions.NewExpression))){
                                this.addNote(CPPError.declaration.array.zero_length(this));
                            }

                            prev = "array";
                            type = Types.Array.instance(type, (postfix.size ? postfix.size.value : undefined)); //Note: grammar doesn't allow const or volatile on array
                            if(innermost && isA(this.parent, Expressions.NewExpression) && postfix.size/* && postfix.size.construct_type !== "literal"*/){
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
        if (!isParam && !isMember && isA(this.type, Types.reference) && !ast.initializer) {
            this.addNote(CPPError.declaration.init.referenceBind(this));
        }

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

var FunctionDefinition = Lobster.Declarations.FunctionDefinition = CPPConstruct.extend(BaseDeclarationMixin, {
    _name: "FunctionDefinition",
    isDefinition: true,
    i_childrenToExecute: ["memberInitializers", "body"], // TODO: why do regular functions have member initializers??
    instType: "call",
    i_runtimeConstructClass : RuntimeFunction,

    init : function(ast, context){
        ast.specs = ast.specs || {typeSpecs: [], storageSpecs: []};
        this.initParent(ast, context);
    },

    attach : function(context) {
        FunctionDefinition._parent.attach.call(this, copyMixin(context, {func: this}));
    },

    i_createFromAST : function(ast, context) {
        FunctionDefinition._parent.i_createFromAST.apply(this, arguments);
        this.calls = [];

        // Check if it's a member function
        if (context.containingClass) {
            this.isMemberFunction = true;
            this.isInlineMemberFunction = true;
            this.i_containingClass = context.containingClass;
            this.receiverType = this.parent.type.instance();
        }
        this.memberInitializers = [];
        this.autosToDestruct = [];

        this.body = CPPConstruct.create(this.ast.body, {func: this, parent: this}, Statements.FunctionBodyBlock);
    },

    compile : function(){
        this.compileDeclaration();
        this.compileDefinition();
    },

    // EFFECTS: returns an array of errors
    compileDeclaration : function(){
        var ast = this.ast;


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
                this.i_containingClass.addMember(this.entity);
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
        var typeSpec = TypeSpecifier.instance(this.ast.specs.typeSpecs, {parent: this});
        typeSpec.compile();
        if (this.hasErrors()){
            return;
        }

        this.virtual = !!this.ast.specs.virtual;

        // Compile the declarator
        var decl = this.declarator = Declarator.instance(this.ast.declarator, {parent: this, scope: this.bodyScope});
        decl.compile({baseType: typeSpec.type});
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

        this.autosToDestruct = this.autosToDestruct.map(function(entityToDestruct){
            var dest = entityToDestruct.type.destructor;
            if (dest){
                var call = FunctionCall.instance({args: []}, {parent: self, scope: self.bodyScope});
                call.compile({
                    func: dest,
                    receiver: entityToDestruct});
                return call;
            }
            else{
                self.addNote(CPPError.declaration.dtor.no_destructor_auto(entityToDestruct.decl, entityToDestruct));
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
        return this.ast.body.statements.length === 0;
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
            entity = MemberFunctionEntity.instance(this, this.i_containingClass, this.virtual);
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

    setArguments : function(sim, inst, args){
        inst.argInitializers = args;
    },

    setReturnObject : function(sim, inst, returnObject){
        inst.i_returnObject = returnObject;
    },

    getReturnObject : function(sim, inst){
        return inst.i_returnObject;
    },

    tailCallReset : function(sim, inst, caller) {

        // Need to unseat all reference that were on the stack frame for the function.
        // Otherwise, lookup weirdness can occur because the reference lookup code wasn't
        // intended to be able to reseat references and parameter initializers will instead
        // think they're supposed to pass into the things that the references on the existing
        // stack frame were referring to.
        inst.stackFrame.setUpReferenceInstances();

        inst.reusedFrame = true;
        inst.setCaller(caller);
        inst.index = this.initIndex;
        sim.popUntil(inst);
        //inst.send("reset"); // don't need i think
        return inst;
    },

    done : function(sim, inst){

        // If non-void return type, check that return object was initialized.
        // Non-void functions should be guaranteed to have a returnObject (even if it might be a reference)
        if (!isA(this.type.returnType, Types.Void) && !inst.returnStatementEncountered()){
            this.flowOffNonVoid(sim, inst);
        }

        if (inst.getReceiver()){
            inst.getReceiver().callEnded();
        }

        sim.memory.stack.popFrame(inst);
        sim.pop(inst);
    },

    flowOffNonVoid : function(sim, inst){
        if (this.isMain){
            inst.i_returnObject.setValue(Value.instance(0, Types.Int.instance()));
        }
        else{
            sim.implementationDefinedBehavior("Yikes! This is a non-void function (i.e. it's supposed to return something), but it ended without hitting a return statement");
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

// TODO: this should be called ClassDefinition
var ClassDeclaration = Lobster.Declarations.ClassDeclaration = CPPConstruct.extend(BaseDeclarationMixin, {
    _name: "ClassDeclaration",

    compile : function(){
        assert(false, "Must use compileDeclaration and compileDefinition separately for a ClassDeclaration.");
    },

    compileDeclaration : function(){
        var ast = this.ast;


        this.key = ast.head.key;
        this.name = ast.head.name.identifier;
        this.members = [];


        // Base classes

        if (this.ast.head.bases && this.ast.head.bases.length > 0){
            if (this.ast.head.bases.length > 1){
                this.addNote(CPPError.class_def.multiple_inheritance(this));
                return;
            }

            try{
                var baseCode = this.ast.head.bases[0];

                // TODO NEW: Use an actual Identifier expression for this
                this.base = this.contextualScope.requiredLookup(baseCode.name.identifier);

                if (!isA(this.base, TypeEntity) || !isA(this.base.type, Types.Class)){
                    this.addNote(CPPError.class_def.base_class_type({ast:baseCode.name}, baseCode.name.identifier));
                }

                if (baseCode.virtual){
                    this.addNote(CPPError.class_def.virtual_inheritance({ast:baseCode.name}, baseCode.name.identifier));
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
            this.classTypeClass = this.type;

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
        for(var i = 0; i < ast.member_specs.length; ++i){
            var spec = ast.member_specs[i];
            var access = spec.access || "private";
            for(var j = 0; j < spec.members.length; ++j){
                spec.members[j].access = access;
                var memDecl = Declaration.create(spec.members[j], {parent:this, scope: this.classScope, containingClass: this.type, access:access});

                // Within member function definitions, class is considered as complete even though it isn't yet
                if (isA(memDecl, FunctionDefinition)){
                    this.type.setTemporarilyComplete();
                }

                memDecl.compileDeclaration();

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


        var hasUserDefinedAssignmentOperator = this.type.hasMember("operator=", {paramTypes: [this.type], isThisConst:false});

        // Rule of the Big Three
        var bigThreeYes = [];
        var bigThreeNo = [];
        (this.type.copyConstructor ? bigThreeYes : bigThreeNo).push("copy constructor");
        (hasUserDefinedAssignmentOperator ? bigThreeYes : bigThreeNo).push("assignment operator");
        (this.type.destructor ? bigThreeYes : bigThreeNo).push("destructor");

        if (0 < bigThreeYes.length && bigThreeYes.length < 3){
            // If it's only because of an empty destructor, suppress warning
            if (bigThreeYes.length === 1 && this.type.destructor && this.type.destructor.decl.emptyBody()){

            }
            else{
                this.addNote(CPPError.class_def.big_three(this, bigThreeYes, bigThreeNo));
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
        if (!hasUserDefinedAssignmentOperator){

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
                return defCon && !defCon.decl.isImplicit();
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
        return ConstructorDefinition.instance(src, {parent:this, scope: this.classScope, containingClass: this.type, access:"public", implicit:true});
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
            return subObj.type.className + "(other)";
        }).concat(this.type.memberSubobjectEntities.map(function(subObj){
            return subObj.type.className + "(other." + subObj.name + ")";
        })).join(", ");

        src += " {}";
        src = Lobster.cPlusPlusParser.parse(src, {startRule:"member_declaration"});

        return ConstructorDefinition.instance(src, {parent:this, scope: this.classScope, containingClass: this.type, access:"public", implicit:true});
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
        return FunctionDefinition.instance(src, {parent:this, scope: this.classScope, containingClass: this.type, access:"public", implicit:true});
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
        return DestructorDefinition.instance(src, {parent:this, scope: this.classScope, containingClass: this.type, access:"public", implicit:true});
    },

    createInstance : function(sim, inst){
        return CPPConstructInstance.instance(sim, this, {decl:0, step:"decl"}, "stmt", inst);
    },

    upNext : function(sim, inst){

    },

    stepForward : function(sim, inst){

    }
});

var MemberDeclaration = Lobster.Declarations.Member = Declaration.extend({
    _name: "MemberDeclaration",
    init: function(ast, context){
        assert(context);
        assert(isA(context.containingClass, Types.Class));
        assert(context.hasOwnProperty("access"));
        this.initParent(ast, context);
    },

    i_createFromAST : function(ast, context) {
        MemberDeclaration._parent.i_createFromAST.apply(this, arguments);
        this.access = context.access;
        this.i_containingClass = context.containingClass;
    },

    i_determineStorage : function(){
        // Determine storage duration based on the kind of scope in which the declaration
        // occurs and any storage specifiers.
        if(this.storageSpec.static){
            this.storageDuration = "static";
        }
        else{
            this.storageDuration = "automatic";
        }
    },

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
            entity = MemberFunctionEntity.instance(decl, this.i_containingClass, this.virtual);
        }
        else if (this.storageDuration === "static"){
            entity = StaticEntity.instance(decl);
        }
        else{
            entity = MemberSubobjectEntity.instance(decl, this.i_containingClass);
            this.isDefinition = false; // TODO NEW: This is a hack. Since implementing a proper linking phase, static stuff may be broken.
        }

        if (this.isDefinition) {
            entity.setDefinition(this);
        }

        try {
            this.entities.push(entity);
            var options = {own: true};
            if (isA(entity, MemberFunctionEntity)) {
                options.paramTypes = entity.type.paramTypes;
                options.exactMatch = true;
                options.noBase = true;
            }
            if ((isA(entity, MemberSubobjectEntity) || isA(entity, MemberFunctionEntity))){
                // We don't check if a conflicting member already exists here - that will be
                // done inside addMember and an exception will be thrown if there is a conflict
                this.i_containingClass.addMember(entity); // this internally adds it to the class scope
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

    i_childrenToExecute: ["memberInitializers", "body"], // TODO: why do regular functions have member initializers??


    instance : function(ast, context){
        assert(context);
        assert(isA(context.containingClass, Types.Class));
        assert(context.hasOwnProperty("access"));
        // Make sure it's actually a constructor
        if (ast.name.identifier !== context.containingClass.className){
            // oops was actually a function with missing return type
            return FunctionDefinition.instance(ast, context);
        }

        return ConstructorDefinition._parent.instance.apply(this, arguments);
    },

    compileDeclaration : function() {
        FunctionDefinition.compileDeclaration.apply(this, arguments);

        if (!this.hasErrors()){
            this.i_containingClass.addConstructor(this.entity);
        }
    },

    compileDeclarator : function(){
        var ast = this.ast;


        // NOTE: a constructor doesn't have a "name", and so we don't need to add it to any scope.
        // However, to make lookup easier, we give all constructors their class name plus the null character. LOL
        // TODO: this is silly. remove it pls :)
        this.name = this.i_containingClass.className + "\0";

        // Compile the parameters
        var args = this.ast.args;
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
        && (isA(this.paramTypes[0], this.i_containingClass) ||
        isA(this.paramTypes[0], Types.Reference) && isA(this.paramTypes[0].refTo, this.i_containingClass));


        // Give error for copy constructor that passes by value
        if (this.isCopyConstructor && isA(this.paramTypes[0], this.i_containingClass)){
            this.addNote(CPPError.declaration.ctor.copy.pass_by_value(this.params[0], this.paramTypes[0], this.params[0].name));
        }

        // I know this is technically wrong but I think it makes things run smoother
        this.type = Types.Function.instance(Types.Void.instance(), this.paramTypes);
    },

    compileDefinition : function(){
        var self = this;
        var ast = this.ast;

        if (!ast.body){
            this.addNote(CPPError.class_def.ctor_def(this));
            return;
        }

        this.compileCtorInitializer();

        // Call parent class version. Will handle body, automatic object destruction, etc.
        FunctionDefinition.compileDefinition.apply(this, arguments);
    },

    compileCtorInitializer : function(){
        var memInits = this.ast.initializer || [];

        // First, check to see if this is a delegating constructor.
        // TODO: check on whether someone could techinically declare a member variable with the same name
        // as the class and how that affects the logic here.
        var targetConstructor = null;
        for(var i = 0; i < memInits.length; ++i){
            if (memInits[i].member.identifier == this.i_containingClass.className){
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
                mem.compile(ReceiverEntity.instance(this.i_containingClass));
                this.memberInitializers.push(mem);
            }
            else{
                this.addNote(CPPError.declaration.ctor.init.delegating_only(this));
            }
            return;
        }

        // It is a non-delegating constructor

        // If there is a base class subobject, initialize it
        var base;
        if (base = this.i_containingClass.getBaseClass()){
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
                mem.compile(this.i_containingClass.baseClassSubobjectEntities[0]);
                this.memberInitializers.push(mem);
            }
            else{
                var mem = DefaultMemberInitializer.instance(this.ast, {parent: this, scope: this.bodyScope});
                mem.compile(this.i_containingClass.baseClassSubobjectEntities[0]);
                this.memberInitializers.push(mem);
                mem.isMemberInitializer = true;
            }
        }

        // Initialize non-static data members of the class

        // Create a map of name to initializer. Initially all initializers are null.
        var initMap = {};
        this.i_containingClass.memberSubobjectEntities.forEach(function(objMember){
            initMap[objMember.name] = objMember;
        });

        // Iterate through all the member initializers and associate them with appropriate member
        for(var i = 0; i < memInits.length; ++i){
            var memInit = memInits[i];

            // Make sure this type has a member of the given name
            var memberName = memInit.member.identifier;
            if (initMap.hasOwnProperty(memberName)) {
                var mem = MemberInitializer.instance(memInit, {parent: this, scope: this.bodyScope});
                mem.compile(initMap[memberName]);
                initMap[memberName] = mem;
            }
            else{
                this.addNote(CPPError.declaration.ctor.init.improper_member(this, this.i_containingClass, memberName));
            }
        }

        // Now iterate through members again in declaration order. Add associated member initializer
        // from above or default initializer if there wasn't one.

        var self = this;
        this.i_containingClass.memberSubobjectEntities.forEach(function(objMember){
            if (isA(initMap[objMember.name], MemberInitializer)){
                self.memberInitializers.push(initMap[objMember.name]);
            }
            else if (isA(objMember.type, Types.Class) || isA(objMember.type, Types.Array)){
                var mem = DefaultMemberInitializer.instance(self.ast, {parent: self, scope: self.bodyScope});
                mem.compile(objMember);
                self.memberInitializers.push(mem);
                mem.isMemberInitializer = true;
            }
            else{
                // No need to do anything for non-class types since default initialization does nothing
            }
        });
    },

    isTailChild : function(child){
        return {isTail: false};
    },

    describe : function(sim, inst){
        var desc = {};
        if (this.isDefaultConstructor){
            desc.message = "the default constructor for the " + this.i_containingClass.className + " class";
        }
        else if (this.isCopyConstructor){
            desc.message = "the copy constructor for the " + this.i_containingClass.className + " class";
        }
        else{
            desc.message = "a constructor for the " + this.i_containingClass.className + " class";
        }
        return desc
    }
});







var DestructorDefinition = Lobster.Declarations.DestructorDefinition = FunctionDefinition.extend({
    _name: "DestructorDefinition",

    init : function(ast, context){
        assert(context);
        assert(isA(context.containingClass, Types.Class));
        assert(context.hasOwnProperty("access"));
        this.initParent(ast, context);
        this.access = context.access;
        this.i_containingClass = context.containingClass;
    },

    compileDeclaration : function() {
        FunctionDefinition.compileDeclaration.apply(this, arguments);
        this.i_containingClass.addDestructor(this.entity);
    },

    compileDeclarator : function() {
        var ast = this.ast;


        // Destructors do have names and can be found via name lookup
        this.name = "~" + this.i_containingClass.className;

        this.virtual = this.ast.virtual;

        // There are no parameters for a destructor
        this.params = [];
        this.paramTypes = [];

        // I know this is technically wrong but I think it makes things run smoother
        this.type = Types.Function.instance(Types.Void.instance(), this.paramTypes);
    },

    compileDefinition: function(){
        var self = this;
        var ast = this.ast;


        if (!ast.body){
            this.addNote(CPPError.class_def.dtor_def(this));
            return;
        }

        // Call parent class version. Will handle body, automatic object destruction, etc.
        FunctionDefinition.compileDefinition.apply(this, arguments);

        this.membersToDestruct = this.i_containingClass.memberSubobjectEntities.filter(function(entity){
            return isA(entity.type, Types.Class);
        }).map(function(entityToDestruct){
            var dest = entityToDestruct.type.destructor;
            if (dest){
                var call = FunctionCall.instance({args: []}, {parent: self});
                call.compile({
                    func: dest,
                    receiver: entityToDestruct});
                return call;
            }
            else{
                self.addNote(CPPError.declaration.dtor.no_destructor_member(entityToDestruct.decl, entityToDestruct, self.i_containingClass));
            }

        });

        this.basesToDestruct = this.i_containingClass.baseClassSubobjectEntities.map(function(entityToDestruct){
            var dest = entityToDestruct.type.destructor;
            if (dest){
                var call = FunctionCall.instance({args: []}, {parent: self});
                call.compile({
                    func: dest,
                    receiver: entityToDestruct});
                return call;
            }
            else{
                self.addNote(CPPError.declaration.dtor.no_destructor_base(entityToDestruct.decl, entityToDestruct, self.i_containingClass));
            }

        });
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

