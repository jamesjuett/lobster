var Lobster = Lobster || {};
var CPP = Lobster.CPP = Lobster.CPP || {};




var CPPConstruct = Lobster.CPPConstruct = Class.extend({
    _name: "CPPConstruct",
    _nextId: 0,
    initIndex: "pushChildren",

    i_childrenToCreate : [],
    i_childrenToConvert : {},
    i_childrenToExecute : [],

    create : function(ast, context, classToUse) {
        // if ast is actually already a (detatched) construct, just attach it to the
        // provided context rather than creating a new one.
        if (isA(ast, CPPConstruct)) {
            assert(!ast.isAttached());
            ast.attach(context);
            return ast;
        }

        var constructClass = classToUse || CONSTRUCT_CLASSES[ast["construct_type"]];
        assert(constructClass, "Unrecognized construct_type.");
        return constructClass.instance(ast, context);
    },
    //
    // createWithChildren : function(children, context) {
    //     var construct = this.instance(context);
    //     this.i_createWithChildrenImpl(construct, children, context);
    //
    //     return construct;
    // },

    // context parameter is often just parent code element in form
    // {parent: theParent}, but may also have additional information
    init: function (ast, context) {
        assert(ast || ast === null);
        ast = ast || {};
        assert(context || context === null);
        this.id = CPPConstruct._nextId++;
        this.children = [];
        this.i_notes = [];
        this.i_hasErrors = false;

        this.ast = ast;
        if (ast.code) {
            this.code = ast.code;
        }
        if (ast.library_id) {
            this.i_libraryId = ast.library_id;
        }
        if (ast.library_unsupported) {
            this.i_library_unsupported = true;
        }

        this.i_isAttached = false;
        if (context) {
            this.attach(context);
        }
    },

    attach : function(context) {
        this.i_setContext(context);
        this.i_createFromAST(this.ast, context);
        this.i_isAttached = true;
    },

    isAttached : function() {
        return this.i_isAttached;
    },

    /**
     * Default for derived classes, pulls children from i_childrenToCreate array.
     * Derived classes may also provide an override if they need customization (e.g. providing
     * a different scope in the context for children, getting extra properties from the AST, etc.)
     * @param ast
     */
    i_createFromAST : function(ast, context) {
        for(var i = 0; i < this.i_childrenToCreate.length; ++i) {
            var childName = this.i_childrenToCreate[i];
            this[childName] = this.i_createChild(ast[childName]);
        }
    },

    i_createChild : function(ast, context) {
        if (!ast) {return ast;}
        if (Array.isArray(ast)){
            var self = this;
            return ast.map(function(a) {
                return self.i_createChild(a, context);
            });
        }

        return CPPConstruct.create(ast, mixin({parent:this}, context || {}));
    },

    // i_createAndConnectChild : function(source, context) {
    //     return this.i_connectChild(this.i_createChild(source, context));
    // },

    // i_connectChild : function(childConstruct) {
    //     if(!childConstruct) {return childConstruct;}
    //     childConstruct.i_context.parent = this;
    //     childConstruct.i_setContext(childConstruct.i_context);
    //     this.children.push(childConstruct);
    //     return childConstruct;
    // },

    i_setContext : function(context){
        assert(!this.i_isAttached);
        this.i_isAttached = true;
        assert(context.hasOwnProperty("parent"));
        assert(!context.parent || isA(context.parent, CPPConstruct));
        assert(!context.parent || context.parent.isAttached());
        this.parent = context.parent;

        // Use containing function from context or inherit from parent
        this.i_containingFunction = context.func || (this.parent && this.parent.i_containingFunction);

        // Use implicit from context or inherit from parent
        this.i_isImplicit = context.implicit || (this.parent && this.parent.i_isImplicit);

        // If auxiliary, increase auxiliary level over parent. If no parent, use default of 0
        if (this.parent){
            if (context.auxiliary) {
                this.i_auxiliaryLevel = this.parent.i_auxiliaryLevel + 1;
            }
            else {
                this.i_auxiliaryLevel = this.parent.i_auxiliaryLevel;
            }
        }
        else{
            this.i_auxiliaryLevel = 0;
        }

        // If a contextual scope was specified, use that. Otherwise inherit from parent
        this.contextualScope = context.scope || (this.parent && this.parent.contextualScope);

        // Use translation unit from context or inherit from parent
        this.i_translationUnit = context.translationUnit || (this.parent && this.parent.i_translationUnit);

        // If the parent is an usupported library construct, so are its children (including this one)
        if (this.parent && this.parent.i_library_unsupported) {
            this.i_library_unsupported = true;
        }

        // If this contruct is not auxiliary WITH RESPECT TO ITS PARENT, then we should
        // add it as a child. Otherwise, if this construct is auxiliary in that sense we don't.
        if (this.parent && this.i_auxiliaryLevel === this.parent.i_auxiliaryLevel) {
            this.parent.children.push(this);
        }
    },

    getSourceReference : function() {
        return this.i_translationUnit.getSourceReferenceForConstruct(this);
    },

    hasSourceCode : function() {
        return !!this.code;
    },

    getSourceCode : function() {
        return this.code;
    },

    getSourceText : function() {
        return this.code ? this.code.text : "an expression";
    },

    isLibraryConstruct : function() {
        return this.i_libraryId !== undefined;
    },

    getLibraryId : function() {
        return this.i_libraryId;
    },

    isLibraryUnsupported : function () {
        return this.i_library_unsupported;
    },

    getTranslationUnit : function() {
        return this.i_translationUnit;
    },

    /**
     * Default for derived classes, simply compiles children from i_childrenToCreate array.
     * Usually, derived classes will need to override (e.g. to do any typechecking at all)
     */
    compile: function() {
        this.i_compileChildren();
    },

    i_compileChildren: function() {
        for(var i = 0; i < this.i_childrenToCreate.length; ++i) {
            var childName = this.i_childrenToCreate[i];
            this[childName].compile();
        }
    },

    tryCompile : function(){
        try{
            return this.compile.apply(this, arguments);
        }
        catch(e){
            if (isA(e, SemanticException)){
                this.addNote(e.annotation(this));
            }
            else{
                throw e;
            }
        }
    },

    isTailChild : function(child){
        return {isTail: false};
    },

    done : function(sim, inst){
        sim.pop(inst);
    },

    createInstance : function(sim, parent){
        return CPPConstructInstance.instance(sim, this, this.initIndex, this.instType, parent);
    },

    createAndPushInstance : function(sim, parent){
        var inst = this.createInstance.apply(this, arguments);
        sim.push(inst);
        return inst;
    },

    i_createAndCompileChildExpr : function(ast, convertTo){
        var child = this.i_createChild(ast);
        child.tryCompile();
        if (convertTo){
            child = standardConversion(child, convertTo);
        }
        return child;
    },

    pushChildInstances : function(sim, inst){

        inst.childInstances = inst.childInstances || {};
        for(var i = this.i_childrenToExecute.length-1; i >= 0; --i){
            var childName = this.i_childrenToExecute[i];
            var child = this[childName];
            if (Array.isArray(child)){
                // Note: no nested arrays, but that really seems unnecessary
                var childArr = inst.childInstances[childName] = [];
                for(var j = child.length-1; j >= 0; --j){
                    childArr.unshift(child[j].createAndPushInstance(sim, inst));
                }
            }
            else{
                inst.childInstances[childName] = child.createAndPushInstance(sim, inst);
            }
        }
        //inst.send("wait", this.sub.length);
    },

    childInstance : function(sim, inst, name){
        return inst && inst.childInstances && inst.childInstances[name];
    },

    executionContext : function(sim, inst){
        return inst.funcContext;
    },

    upNext : function(sim, inst){
        // Evaluate subexpressions
        if (inst.index === "pushChildren"){
            this.pushChildInstances(sim, inst);
            inst.index = "afterChildren";
            inst.wait();
            return true;
        }
        else if (inst.index === "done"){
            this.done(sim, inst);
            return true;
        }
        return false;
    },

    stepForward : function(sim, inst){

    },

    explain : function(sim, inst){
        return {message: "[No explanation available.]", ignore: true};
    },
    describe : function(sim, inst){
        return {message: "[No description available.]", ignore: false};
    },
    /**
     *
     * @param {Note} note
     */
    addNote : function(note) {
        this.i_notes.push(note);
        if (note.getType() === Note.TYPE_ERROR) {
            this.i_hasErrors = true;
        }
        if (this.parent && this.i_auxiliaryLevel === this.parent.i_auxiliaryLevel) {
            this.parent.addNote(note);
        }
    },

    getNotes : function() {
        return this.i_notes;
    },

    hasErrors : function() {
        return this.i_hasErrors;
    },

    getSourceReference : function() {
        return this.i_translationUnit.getSourceReferenceForConstruct(this);
    },

    isAuxiliary : function() {
        return this.i_auxiliaryLevel > 0;
    },

    isImplicit : function() {
        return this.i_isImplicit;
    },

    containingFunction : function() {
        return this.i_containingFunction;
    }
});

var FakeConstruct = Class.extend({
    _name : "FakeConstruct",

    init: function () {

        this.id = CPPConstruct._nextId++;
        this.children = [];

        // this.i_notes = [];
        // this.i_hasErrors = false;

        // this.i_setContext(context);
    },


    getSourceReference : function() {
        return null;
    }
});

var FakeDeclaration = FakeConstruct.extend({
    _name : FakeDeclaration,

    init : function(name, type) {
        this.initParent();
        this.name = name;
        this.type = type;
    }
});


var CPPConstructInstance = Lobster.CPPConstructInstance = Class.extend(Observable,{
    _name: "CPPConstructInstance",
    //silent: true,
    init: function (sim, model, index, stackType, parent) {
        this.initParent();
        this.sim = sim;
        this.model = model;
        this.index = index;

        this.stackType = stackType;

        this.subCalls = [];
        this.parent = parent;
        this.pushedChildren = [];
        assert(this.parent || this.model.i_isMainCall, "All code instances must have a parent.");
        assert(this.parent !== this, "Code instance may not be its own parent");
        if (this.parent) {

            if (this.stackType != "call") {
                this.parent.pushChild(this);
            }
            else {
                this.parent.pushSubCall(this);
            }

            // Will be replaced later in call instance subclass with self
            this.funcContext = this.parent.funcContext;

        }

        if (this.model.i_isMainCall){
            this.funcContext = this;
        }

        this.stepsTaken = sim.stepsTaken();
        this.pauses = {};
    },
    instanceString : function(){
        return "instance of " + this._name + " (" + this.model._name + ")";
    },
    stepForward : function(){
        return this.model.stepForward(this.sim, this);
    },
    upNext : function(){
        for(var key in this.pauses){
            var p = this.pauses[key];
            if (p.pauseWhenUpNext ||
                p.pauseAtIndex !== undefined && this.index == p.pauseAtIndex){
                this.sim.pause();
                p.callback && p.callback();
                delete this.pauses[key];
                break;
            }
        }
        this.send("upNext");
        this.funcContext.send("currentFunction");
        return this.model.upNext(this.sim, this);
    },
    setPauseWhenUpNext : function(){
        this.pauses["upNext"] = {pauseWhenUpNext: true};
    },
    wait : function(){
        this.send("wait");
    },
    done : function(){
        if (this.model.done){
            return this.model.done(this.sim, this);
        }
    },
    pushed : function(){
//		this.update({pushed: this});
    },
    popped : function(){
        this.hasBeenPopped = true;
        this.send("popped", this);
    },
    pushChild : function(child){
        this.pushedChildren.push(child);
        this.send("childPushed", child);
    },
    pushSubCall : function(subCall){
        this.subCalls.push(subCall);
        this.send("subCallPushed", subCall);
    },
    setFrame : function(frame){
        this.frame = frame;
//		this.update({frameSet: this.frame});
    },
    findParent : function(stackType){
        if (stackType){
            var parent = this.parent;
            while(parent && parent.stackType != stackType){
                parent = parent.parent;
            }
            return parent;
        }
        else{
            return this.parent;
        }
    },
    findParentByModel : function(model){
        assert(isA(model, CPPConstruct));

        var parent = this.parent;
        while(parent && parent.model.id != model.id){
            parent = parent.parent;
        }
        return parent;
    },
    nearestReceiver : function(){
        return this.receiver || this.funcContext.receiver || this.parent && this.parent.nearestReceiver();
    },

    setEvalValue: function(value){
        this.evalValue = value;
        this.send("evaluated", this.evalValue);
    },

    executionContext : function(){
        return this.model.executionContext(this.sim, this);
    },

    explain : function(){
        return this.model.explain(this.sim, this);
    },
    describe : function(){
        return this.model.describe(this.sim, this);
    }
});


//var CPPCallInstance = Lobster.CPPCallInstance = CPPConstructInstance.extend({
//    init: function (sim, model, index, parent) {
//        this.initParent(sim, model, index, "call", parent);
//        this.funcContext = this;
//    }
//});


var Scope = Lobster.Scope = Class.extend({
    _name: "Scope",
    _nextPrefix: 0,
    HIDDEN: [],
    NO_MATCH: [],
    init: function(parent, sim){
        this.prefix = this._nextPrefix++;
        this.entities = {};
        this.parent = parent;
        this.sim = sim; // TODO rename sim to translationUnit
        if (!this.sim && this.parent) {
            this.sim = this.parent.sim;
        }
    },
    instanceString : function(){
        var str = "";
        for(var key in this.entities){
            str += this.entities[key] + "\n";
        }
        return str;
    },
    addEntity : function(ent){
        if (isA(ent, StaticEntity)){
            this.addStaticEntity(ent);
        }
        else if (isA(ent, AutoEntity)){
            this.addAutomaticEntity(ent);
        }
        else if (isA(ent, ReferenceEntity)){
            this.addReferenceEntity(ent);
        }

        if (isA(ent, FunctionEntity)){
            if (!this.entities[ent.name]){
                this.entities[ent.name] = [];
            }
            this.entities[ent.name].push(ent);
        }
        else{
            this.entities[ent.name] = ent;
        }
    },

    allEntities : function() {
        var ents = [];
        for(var name in this.entities) {
            if (Array.isArray(this.entities[name])) {
                ents.pushAll(this.entities[name]);
            }
            else{
                ents.push(this.entities[name]);
            }
        }
        return ents;
    },

    // TODO NEW: this documentation is kind of messy (but hey, at least it exists!)
    /**
     * Attempts to add a new entity to this scope.
     * @param {DeclaredEntity} entity - The entity to attempt to add.
     * @returns {DeclaredEntity} Either the entity that was added, or an existing one already there, assuming it was compatible.
     * @throws  {SemanticException} If an error prevents the entity being added successfully. (e.g. Function declarations with
     * the same signature but a mismatch of return types, duplicate definition)
     */
    addDeclaredEntity : function(entity) {
        var otherEnt = this.ownEntity(entity.name);

        if (!otherEnt){ // No previous entity with this name, so just add it
            this.addEntity(entity);
        }
        else if (Array.isArray(otherEnt)){ // Array means a set of functions, check each one
            for (var i = 0; i < otherEnt.length; ++i){
                var otherFunc = otherEnt[i];

                // Look for any function with the same signature
                if (entity.type.sameSignature(otherFunc.type)) {

                    // If they have mismatched return types, that's a problem.
                    if (!entity.type.sameReturnType(otherFunc.type)){
                        throw CPPError.declaration.func.returnTypesMatch([entity.decl, otherFunc.decl], entity.name);
                    }

                    DeclaredEntity.merge(entity, otherFunc);

                    // Terminates early when the first match is found. It's not possible there would be more than one match.
                    return otherFunc;
                }
            }

            // If none were found with the same signature, this is an overload, so go ahead and add it
            this.addEntity(entity);

        }
        else{
            DeclaredEntity.merge(entity, otherEnt);
            return otherEnt;
        }
    },

    ownEntity : function(name){
        return this.entities[name];
    },

    singleLookup : function(name, options){
        var result = this.lookup(name, options);
        if (Array.isArray(result)){
            return result[0];
        }
        else{
            return result;
        }
    },
    requiredLookup : function(name, options){
        return this.i_requiredLookupImpl(this.lookup(name, options), name, options);
    },
    i_requiredLookupImpl : function(res, name, options) {
        options = options || {};
        if (!res){
            if (options.paramTypes || options.params){
                throw SemanticExceptions.NoMatch.instance(this, name,
                    options.paramTypes || options.params && options.params.map(function(p){return p.type;}),
                    options.isThisConst
                );
            }
            else{
                throw SemanticExceptions.NotFound.instance(this, name);
            }
        }
        else if(Array.isArray(res)){
            if (res === Scope.HIDDEN){
                throw SemanticExceptions.Hidden.instance(this, name,
                options.paramTypes || options.params && options.params.map(function(p){return p.type;}),
                    options.isThisConst);
            }
            if (res.length === 0){
                throw SemanticExceptions.NoMatch.instance(this, name,
                    options.paramTypes || options.params && options.params.map(function(p){return p.type;}),
                    options.isThisConst
                );
            }
            if (res.length > 1){
                throw SemanticExceptions.Ambiguity.instance(this, name);
            }
            return res[0];
        }

        return res;
    },
    qualifiedLookup : function(names, options){
        assert(Array.isArray(names) && names.length > 0);
        var scope = this.sim.getGlobalScope();
        for(var i = 0; scope && i < names.length - 1; ++i){
            scope = scope.children[names[i].identifier];
        }

        if (!scope){
            return null;
        }

        var name = names.last().identifier;
        var result = scope.lookup(name, copyMixin(options, {qualified:true}));

        // Qualified lookup suppresses virtual function call mechanism, so if we
        // just looked up a MemberFunctionEntity, we create a proxy to do that.
        if (Array.isArray(result)){
            result = result.map(function(elem){
                return isA(elem, MemberFunctionEntity) ? elem.suppressedVirtualProxy() : elem;
            });
        }
        return result;
    },

    lookup : function(name, options){
        options = options || {};

        // Handle qualified lookup specially
        if (Array.isArray(name)){
            return this.qualifiedLookup(name, options);
        }

        var ent = this.entities[name];

        // If we don't have an entity in this scope and we didn't specify we
        // wanted an own entity, look in parent scope (if there is one)
        if (!ent && !options.own && this.parent){
            return this.parent.lookup(name, options);
        }

        // If we didn't find anything, return null
        if (!ent){
            return null;
        }

        // If it's an array, that means its a set of functions
        if (Array.isArray(ent)){

            var viable = ent;

            // If we're looking for an exact match of parameter types
            if (options.exactMatch){
                var paramTypes = options.paramTypes || options.params.map(function(p){return p.type});
                viable =  ent.filter(function(cand){
                    if (options.isThisConst && isA(cand.MemberFunctionEntity) && !cand.type.isThisConst){
                        return false;
                    }
                    return cand.type.sameParamTypes(paramTypes);
                });
            }

            // If we're looking for something that could be called with given parameter types
            else if (options.params || options.paramTypes){
                var params = options.params || options.paramTypes && fakeExpressionsFromTypes(options.paramTypes);
                viable = overloadResolution(ent, params, options.isThisConst) || [];
            }

            // Hack to get around overloadResolution sometimes returning not an array
            if (viable && !Array.isArray(viable)){
                viable = [viable];
            }

            // If viable is empty, not found.
            if (viable && viable.length === 0){
                // Check to see if we could have found it except for name hiding
                if (!options.own && this.parent){
                    var couldHave = this.parent.lookup(name, options);
                    if (couldHave && (!Array.isArray(couldHave) || couldHave.length === 1 || couldHave === Scope.HIDDEN)){
                        if (options.noNameHiding){
                            return couldHave;
                        }
                        else{
                            return Scope.HIDDEN;
                        }
                    }
                }
                return Scope.NO_MATCH;
            }
            else{
                return viable;
            }

        }

        // If it's not an array, just return it
        return ent;
    },

    // Don't use from outside >:(
    //lookupFunctions : function(name, context){
    //    if (this.entities.hasOwnProperty(name)){
    //        var own = this.entities[name];
    //        if (Array.isArray(own)){
    //            if (this.parent){
    //                return own.clone().pushAll(this.parent.lookupFunctions(name, context));
    //            }
    //            else{
    //                return own.clone();
    //            }
    //        }
    //    }
    //
    //    if (this.parent){
    //        return this.parent.lookupFunctions(name, context);
    //    }
    //    else{
    //        return [];
    //    }
    //},
    addAutomaticEntity : Class._ABSTRACT,
    addReferenceEntity : Class._ABSTRACT,
    addStaticEntity : Class._ABSTRACT,
    merge : Class._ABSTRACT


});

var BlockScope = Scope.extend({
    _name: "BlockScope",
    addAutomaticEntity : function(obj){
        assert(this.parent, "Objects with automatic storage duration should always be inside some block scope inside a function.");
        this.parent.addAutomaticEntity(obj);
    },
    addReferenceEntity : function(obj){
        assert(this.parent);
        this.parent.addReferenceEntity(obj);
    },
    addStaticEntity : function(ent) {
        this.sim.addStaticEntity(ent);
    },
    merge : function() {
        // Nothing in here should have linkage, right?
        // Unless I allow function/class declarations, etc. inside blocks, which I currently don't
    }


});

var FunctionBlockScope = BlockScope.extend({
    _name: "FunctionBlockScope",
    init: function(parent, sim){
        this.initParent(parent, sim);
        this.automaticObjects = [];
        this.referenceObjects = [];
    },
    addAutomaticEntity : function(obj){
        this.automaticObjects.push(obj);
    },
    addReferenceEntity : function(obj){
        this.referenceObjects.push(obj);
    },
    addStaticEntity : function(ent) {
        this.sim.addStaticEntity(ent);
    }
});

var NamespaceScope = Scope.extend({

    init: function(name, parent, sim){
        assert(!parent || isA(parent, NamespaceScope));
        this.initParent(parent, sim);
        this.name = name;
        this.children = {};
        if(this.parent){
            this.parent.addChild(this);
        }
    },
    addChild : function(child){
        if(child.name){
            this.children[child.name] = child;
        }
    },
    addAutomaticEntity : function(obj){
        assert(false, "Can't add an automatic entity to a namespace scope.");
    },
    addReferenceEntity : function(obj){
        assert(false, "TODO");
    },
    addStaticEntity : function(ent) {
        this.sim.addStaticEntity(ent);
    },

    merge : function (otherScope, onErr) {
        for(var name in otherScope.entities){
            var otherEntity = otherScope.entities[name];
            if (Array.isArray(otherEntity)) {
                for(var i = 0; i < otherEntity.length; ++i) {
                    try {
                        this.addDeclaredEntity(otherEntity[i]);
                    }
                    catch (e) {
                        onErr(e);
                    }
                }
            }
            else{
                try {
                    this.addDeclaredEntity(otherEntity);
                }
                catch (e) {
                    onErr(e);
                }
            }
        }

        // Merge in all child scopes from the other
        for(var childName in otherScope.children) {
            if (!this.children[childName]) {
                // If a matching child scope doesn't already exist, create it
                this.children[childName] = NamespaceScope.instance(childName, this, this.sim);
            }

            this.children[childName].merge(otherScope.children[childName], onErr);
        }
    }
});


var ClassScope = NamespaceScope.extend({
    _name: "ClassScope",

    init: function(name, parent, base, sim){
        this.initParent(name, parent, sim);
        if(base){
            assert(isA(base, ClassScope));
            this.base = base;
        }
    },

    lookup : function(name, options){
        options = options || {};
        // If specified, will not look up in base class scopes
        if (options.noBase){
            return Scope.lookup.apply(this, arguments);
        }

        return this.memberLookup(name, options) || Scope.lookup.apply(this, arguments);
    },

    requiredMemberLookup : function(name, options){
        return this.i_requiredLookupImpl(this.memberLookup(name, options), name, options);
    },
    memberLookup : function(name, options){
        var own = Scope.lookup.call(this, name, copyMixin(options, {own:true}));
        if (!own){
            return !options.noBase && this.base && this.base.memberLookup(name, options);
        }
        if (Array.isArray(own) && own.length === 0){
            // Check to see if we could have found it except for name hiding
            // (If we ever got an array, rather than just null, it means we found a match
            // with the name for a set of overloaded functions, but none were viable)
            if (!options.noBase && this.base){
                var couldHave = this.base.memberLookup(name, options);
                if (couldHave && (!Array.isArray(couldHave) || couldHave.length === 1 || couldHave === Scope.HIDDEN)){
                    if (options.noNameHiding){
                        return couldHave;
                    }
                    else{
                        return Scope.HIDDEN;
                    }
                }
            }
            return Scope.NO_MATCH;
        }
        return own;
    }
});


var CPPEntity = Class.extend(Observable, {
    _name: "CPPEntity",
    _nextEntityId: 0,

    linkage: "none", // TODO NEW make this abstract

    type: Class._ABSTRACT, // TODO NEW this should really just be part of the constructor for CPPEntity

    init: function(name){
        this.initParent();
        this.entityId = CPPEntity._nextEntityId++;
        this.name = name;
        // TODO wat is this for?
        this.color = randomColor();
    },
    lookup : function(sim, inst){
        return this;
    },
    nameString : function(){
        return this.name;
    },
    describe : function(sim, inst){
        return {message: "[No description available.]"};
    },
    initialized : function(){
        // default impl, do nothing
    },
    isInitialized : function(){
        // default impl, do nothing
        return true;
    },
    setInitializer : function (init) {
        this.i_init = init;
    },
    getInitializer : function() {
        return this.i_init;
    },
    isLibraryConstruct : function() {
        return false
    },
    isLibraryUnsupported : function() {
        return false;
    }
});
CPP.CPPEntity = CPPEntity;

var DeclaredEntity = CPPEntity.extend({
    _name : "DeclaredEntity",

    /**
     * If neither entity is defined, does nothing.
     * If exactly one entity is defined, gives that definition to the other one as well.
     * If both entities are defined, throws an exception. If the entities are functions with
     * the same signature and different return types, throws an exception.
     * REQUIRES: Both entities should have the same type. (for functions, the same signature)
     * @param {DeclaredEntity} entity1 - An entity already present in a scope.
     * @param {DeclaredEntity} entity2 - A new entity matching the original one.
     * @throws {Note}
     */
    merge : function(entity1, entity2) {

        // TODO: Add support for "forward declarations" of a class/struct

        // Special case: ignore magic functions
        if (isA(entity1, MagicFunctionEntity) || isA(entity2, MagicFunctionEntity)) {
            return;
        }

        // Special case: if both are definitions for the same class, it's ok ONLY if they have exactly the same tokens
        if (isA(entity1.decl, ClassDeclaration) && isA(entity2.decl, ClassDeclaration)
            && entity1.type.className === entity2.type.className) {
            if (entity1.decl.isLibraryConstruct() && entity2.decl.isLibraryConstruct() !== undefined
                && entity1.decl.getLibraryId() === entity2.decl.getLibraryId() ||
                entity1.decl.hasSourceCode() && entity2.decl.hasSourceCode() &&
                entity1.decl.getSourceText().replace(/\s/g,'') === entity2.decl.getSourceText().text.replace(/\s/g,'')) {
                // exactly same tokens, so it's fine

                // merge the types too, so that the type system recognizes them as the same
                Types.Class.merge(entity1.type, entity2.type);

                return;
            }
            else {
                throw CPPError.link.class_same_tokens([entity1.decl, entity2.decl], entity1, entity2);
            }
        }

        // If they're not the same type, that's a problem
        if (!sameType(entity1.type, entity2.type)) {
            throw CPPError.link.type_mismatch(entity1.decl, entity1, entity2);
        }

        // Special case: if both are definitions of a member inside the same class, ignore them. (The class definitions
        // have already been checked above and must be the same at this point, so it's pointless and will cause errors
        // to try to merge them.)
        if (isA(entity1.decl, MemberDeclaration)) {
            return;
        }
        if (isA(entity1.decl, FunctionDefinition) && entity1.decl.isInlineMemberFunction) {
            return;
        }

        // Attempt to merge the two
        if (!entity2.isDefined() && !entity1.isDefined()) {
            // If both are declarations, just keep the old one
        }
        else if (entity2.isDefined() && entity1.isDefined()) {
            // If both are definitions, that's a problem.
            throw CPPError.link.multiple_def([entity1.decl, entity2.decl], entity1.name);
        }
        else { // one of them is defined and one is undefined
            var undefinedEntity = entity1;
            var definedEntity = entity2;
            if (entity1.isDefined()) {
                undefinedEntity = entity2;
                definedEntity = entity1;
            }

            // Check return types for functions
            if (isA(entity1, FunctionEntity)) {
                // If they have mismatched return types, that's a problem.
                if (!entity1.type.sameReturnType(entity2.type)){
                    throw CPPError.link.func.returnTypesMatch([entity1.decl, entity2.decl], entity1.name);
                }
            }

            // If a previous declaration, and now a new definition, merge
            undefinedEntity.setDefinition(definedEntity.definition);
        }
    },

    init : function(decl) {
        this.initParent(decl.name, decl.type);
        this.decl = decl;
        this.type = decl.type;
    },

    setDefinition : function(definition) {
        this.definition = definition;
    },

    isDefined : function() {
        return !!this.definition;
    },

    // TODO: when namespaces are implemented, need to fix this function
    getFullyQualifiedName : function() {
        return "::" + this.name;
    },

    isLibraryConstruct : function() {
        return this.decl.isLibraryConstruct();
    },

    isLibraryUnsupported : function() {
        return this.decl.isLibraryUnsupported();
    }
});
CPP.DeclaredEntity = DeclaredEntity;

// TODO: create a separate class for runtime references that doesn't extend DeclaredEntity
var ReferenceEntity = CPP.ReferenceEntity = CPP.DeclaredEntity.extend({
    _name: "ReferenceEntity",
    storage: "automatic", // TODO: is this correct?
    init: function (decl, type) {
        this.initParent(decl || {name: null, type: type});
    },
    allocated : function(){},
    bindTo : function(refersTo){
        assert(isA(refersTo, ObjectEntity) || isA(refersTo, ReferenceEntity)); // Must refer to a concrete thingy

        // If the thing we refer to is a reference, look it up first so we refer to the source.
        // This eliminates chains of references, which for now is what I want.
        if (isA(refersTo, ReferenceEntity)) {
            this.refersTo = refersTo.lookup();
        }
        else{
            this.refersTo = refersTo;
        }
        this.send("bound");
    },

    lookup : function(sim, inst){
        return inst.funcContext.frame.referenceLookup(this).lookup(sim, inst);
    },
    autoInstance : function(){
        return ReferenceEntityInstance.instance(this);
    },
    describe : function(){
        if (isA(this.decl, Declarations.Parameter)){
            return {message: "the reference parameter " + this.name};
        }
        else{
            return {message: "the reference " + this.name};
        }
    }
});


var ReferenceEntityInstance = CPP.ReferenceEntityInstance = CPP.ReferenceEntity.extend({
    _name: "ReferenceEntityInstance",
    init: function (entity) {
        this.initParent(entity.decl, entity.type);
    },
    // TODO: I think this should be removed
    // bindTo : function(refersTo){
    //     assert(isA(refersTo, ObjectEntity) || isA(refersTo, ReferenceEntity)); // Must refer to a concrete thingy
    //
    //     // If the thing we refer to is a reference, look it up first so we refer to the source.
    //     // This eliminates chains of references, which for now is what I want.
    //     if (isA(refersTo, ReferenceEntity)) {
    //         this.refersTo = refersTo.lookup();
    //     }
    //     else{
    //         this.refersTo = refersTo;
    //     }
    //     this.send("bound");
    // },

    lookup : function(){
        // It's possible someone will be looking up the reference in order to bind it (e.g. auxiliary reference used
        // in function return), so if we aren't bound to anything return ourselves.
        return this.refersTo || this;
    }

});

var ObjectEntity = CPP.ObjectEntity = CPP.CPPEntity.extend({
    _name: "ObjectEntity",
    storage: Class._ABSTRACT,

    init: function(name, type){
        this.initParent(name);
        this.type = type;
        this.size = type.size;
        assert(this.size != 0, "Size cannot be 0."); // SCARY

        this.nonRefType = this.type;
        if (isA(this.type, Types.Reference) && isA(this.type.refTo, Types.Class)){
            this.nonRefType = this.type.refTo;
        }

        if (isA(this.type, Types.Array)){
            this.isArray = true;
            // If array, make subobjects for all elements
            this.elemObjects = [];
            for(var i = 0; i < this.type.length; ++i){
                this.elemObjects.push(ArraySubobject.instance(this, i));
            }
        }
        else if (isA(this.nonRefType, Types.Class)){
            this.isClass = true;
            // If class, make subobjects for all members

            var classType = this.nonRefType;


            // TODO I think the 3 statements below can be replaced with:
            var self = this;
            //this.subobjects = classType.subobjectEntities.map(function(mem){
            //    return mem.objectInstance(self);
            //});
            this.subobjects = [];
            this.i_memberSubobjectMap = {};
            this.i_baseSubobjects = [];
            classType.baseClassSubobjectEntities.forEach(function(baseEntity){
                var baseSubobj = baseEntity.objectInstance(self);
                self.subobjects.push(baseSubobj);
                self.i_baseSubobjects.push(baseSubobj);
            });
            classType.memberSubobjectEntities.map(function(memEntity){
                var subobj = memEntity.objectInstance(self);
                self.subobjects.push(subobj);
                self.i_memberSubobjectMap[memEntity.name] = subobj;
            });

        }
    },

    // HACK: I should split this class into subclasses/mixins for objects of class type or array type
    // Then this function should also only exist in the appropriate specialized classes
    getMemberSubobject : function(name) {
        return this.i_memberSubobjectMap && this.i_memberSubobjectMap[name];
    },

    // HACK: I should split this class into subclasses/mixins for objects of class type or array type
    // Then this function should also only exist in the appropriate specialized classes
    memberSubobjectValueWritten : function() {
        this.send("valueWritten");
    },

    arrayElemValueWritten : function() {
        this.send("valueWritten");
    },

    instanceString : function(){
        return "@"+ this.address;
    },
    valueString : function(){
        return this.type.valueToString(this.rawValue());
    },
    nameString : function(){
        return this.name || "0x" + this.address;
    },
    valueToOstreamString : function(){
        return this.type.valueToOstreamString(this.rawValue());
    },
    isAlive : function(){
        return !!this.alive;
    },
    allocated : function(memory, address, inst){
        this.alive = true;
        this.memory = memory;
        this.address = address;

        // Allocate subobjects if needed
        if(this.isArray){
            var subAddr = this.address;
            for(var i = 0; i < this.type.length; ++i){
                this.elemObjects[i].allocated(memory, subAddr);
                subAddr += this.type.elemType.size;
            }
        }
        else if (this.isClass){
            var subAddr = this.address;
            for(var i = 0; i < this.subobjects.length; ++i){
                this.subobjects[i].allocated(memory, subAddr);
                subAddr += this.subobjects[i].type.size;
            }
        }

        this.send("allocated");
    },
    deallocated : function(inst){
        this.alive = false;
        this.deallocatedByInst = inst;
        this.send("deallocated");
        // deallocate subobjects if needed
        //if(this.isArray){
        //    for(var i = 0; i < this.type.length; ++i){
        //        this.elemObjects[i].deallocated();
        //    }
        //}
        //else if (this.isClass){
        //    for(var i = 0; i < this.subobjects.length; ++i){
        //        this.subobjects[i].deallocated();
        //    }
        //}
    },
    obituary : function(){
        return {killer: this.deallocatedByInst};
    },
    getPointerTo : function(){
        assert(this.address, "Must be allocated before you can get pointer to object.");
        return Value.instance(this.address, Types.ObjectPointer.instance(this));
    },
    getSubobject : function(addr, memory){
        if(this.isArray){
            var offset = (addr - this.address) / this.type.elemType.size;
            if (0 <= offset && offset < this.elemObjects.length) {
                return this.elemObjects[offset];
            }
            else {
                var outOfBoundsObj = ArraySubobject.instance(this, offset);
                outOfBoundsObj.allocated(memory, this.address + offset * this.type.elemType.size);
                return outOfBoundsObj;
            }
            // for(var i = 0; i < this.type.length; ++i){
            //     var subObj = this.elemObjects[i];
            //     if (subObj.address === addr){
            //         return subObj;
            //     }
            // }
        }
        else if (this.isClass){
            for(var i = 0; i < this.subobjects.length; ++i){
                var subObj = this.subobjects[i];
                if (subObj.address === addr){
                    return subObj;
                }
            }
        }

        // Sorry, can't help you
        return null;
    },
    getValue : function(read){
        if (this.isValueValid()){
            return Value.instance(this.rawValue(read), this.type);
        }
        else{
            return Value.instance(this.rawValue(read), this.type, {invalid:true});
        }
    },
    readRawValue : function(){
        return this.rawValue(true);
    },
    rawValue : function(read){
        if (this.isArray){
            var arr = [];
            for(var i = 0; i < this.nonRefType.length; ++i){
                // use rawValue here to deeply remove Value object wrappers
                arr.push(this.elemObjects[i].getValue(read));
            }
            return arr;
        }
        else if (this.isClass){
            var val = [];
            for(var i = 0; i < this.subobjects.length; ++i) {
                // use rawValue here to deeply remove Value object wrappers
                val.push(this.subobjects[i].rawValue(read));
            }
            return val;
        }
        else{
            if (read) {
                var bytes = this.memory.readBytes(this.address, this.size, this);
                var val = this.nonRefType.bytesToValue(bytes);
                this.send("valueRead", val);
                return val;
            }
            else {
                var bytes = this.memory.getBytes(this.address, this.size);
                return this.nonRefType.bytesToValue(bytes);
            }
        }
    },
    setValue : function(newValue, write){

        // It's possible newValue could be another object.
        // Handle this as a special case by first looking up value.
        if (isA(newValue, ObjectEntity)){
            newValue = newValue.getValue(write);
        }

        if (isA(newValue, Value)){
            this.setValidity(newValue.isValueValid());
            // Accept new RTTI
            this.type = newValue.type;
            newValue = newValue.rawValue();
        }
        else{
            // assume it was valid
            this.setValidity(true);
        }


        if (this.isArray){
            for(var i = 0; i < this.nonRefType.length; ++i){
                this.elemObjects[i].setValue(newValue[i], write);
            }
        }
        else if (this.isClass){
            for(var i = 0; i < this.subobjects.length; ++i) {
                this.subobjects[i].setValue(newValue[i], write);
            }
        }
        else{
            if(write){
                this.memory.writeBytes(this.address, this.nonRefType.valueToBytes(newValue), this);
                this.send("valueWritten", newValue);
            }
            else{
                this.memory.setBytes(this.address, this.nonRefType.valueToBytes(newValue), this);
            }
        }
    },

    readValue : function(){
        return this.getValue(true);
    },
    writeValue : function(newValue){
        this.setValue(newValue, true);
    },
    byteRead: function(addr){
        if (this.isArray){
            // If array, find the subobject containing the byte
            this.elemObjects[(addr - this.address) / this.nonRefType.elemType.size].byteRead(addr);
        }
        else if (this.isClass){
            var ad = this.address;
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(ad = ad + mem.type.size > addr){
                    ad.byteRead(addr);
                    break;
                }
            }
        }
        else{
            this.send("byteRead", {addr: addr});
        }
    },
    bytesRead: function(addr, length){
        if (this.isArray) {
            var beginIndex = Math.max(0, Math.floor(( addr - this.address ) / this.nonRefType.elemType.size));
            var endIndex = Math.min(
                beginIndex + Math.ceil(length / this.nonRefType.elemType.size),
                this.nonRefType.length);

            for (var i = beginIndex; i < endIndex; ++i) {
                this.elemObjects[i].bytesRead(addr, length);
            }
        }
        else if (this.isClass){
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(addr < mem.address + mem.type.size && mem.address < addr + length){ // check for overlap
                    mem.bytesRead(addr, length);
                }
                else if (mem.address > addr +length){
                    // break if we are now in members past affected bytes
                    break;
                }
            }
        }
        else{
            this.send("bytesRead", {addr: addr, length: length});
        }
    },
    byteSet: function(addr, value){
        if (this.isArray){
            // If array, find the subobject containing the byte
            this.elemObjects[(addr - this.address) / this.nonRefType.elemType.size].byteSet(addr, value);
        }
        else if (this.isClass){
            var ad = this.address;
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(ad = ad + mem.type.size > addr){
                    mem.byteSet(addr, value);
                    break;
                }
            }
        }
        else{
            this.send("byteSet", {addr: addr, value: value});
        }
    },
    bytesSet: function(addr, values){
        var length = values.length;
        if (this.isArray) {
            var beginIndex = Math.max(0, Math.floor(( addr - this.address ) / this.nonRefType.elemType.size));
            var endIndex = Math.min(
                beginIndex + Math.ceil(length / this.nonRefType.elemType.size),
                this.nonRefType.length);

            for (var i = beginIndex; i < endIndex; ++i) {
                this.elemObjects[i].bytesSet(addr, values);
            }
        }
        else if (this.isClass){
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(addr < mem.address + mem.type.size && mem.address < addr + length){ // check for overlap
                    mem.bytesSet(addr, values);
                }
                else if (mem.address > addr +length){
                    // break if we are now in members past affected bytes
                    break;
                }
            }
        }
        else{
            this.send("bytesSet", {addr: addr, values: values});
        }
    },
    byteWritten: function(addr, value){
        if (this.isArray){
            // If array, find the subobject containing the byte
            this.elemObjects[(addr - this.address) / this.nonRefType.elemType.size].byteWritten(addr, value);
        }
        else if (this.isClass){
            var ad = this.address;
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(ad = ad + mem.type.size > addr){
                    mem.byteWritten(addr, value);
                    break;
                }
            }
        }
        else{
            this.send("byteWritten", {addr: addr, value: value});
        }
    },
    bytesWritten: function(addr, values){
        var length = values.length;
        if (this.isArray) {
            var beginIndex = Math.max(0, Math.floor(( addr - this.address ) / this.nonRefType.elemType.size));
            var endIndex = Math.min(
                beginIndex + Math.ceil(length / this.nonRefType.elemType.size),
                this.nonRefType.length);

            for (var i = beginIndex; i < endIndex; ++i) {
                this.elemObjects[i].bytesWritten(addr, values);
            }
        }
        else if (this.isClass){
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(addr < mem.address + mem.type.size && mem.address < addr + length){ // check for overlap
                    mem.bytesWritten(addr, values);
                }
                else if (mem.address > addr +length){
                    // break if we are now in members past affected bytes
                    break;
                }
            }
        }
        else{
            this.send("bytesWritten", {addr: addr, values: values});
        }
    },
    callReceived : function(){
        this.send("callReceived", this);
    },
    callEnded : function(){
        this.send("callEnded", this);
    },
    setValidity : function(valid){
        this._isValid = valid;
        this.send("validitySet", valid);
    },
    invalidate : function(){
        this.setValidity(false);
    },
    validate : function(){
        this.setValidity(true);
    },
    isValueValid : function(){
        return this._isValid && this.type.isValueValid(this.rawValue());
    },
    isValueDereferenceable : function() {
        return this._isValid && this.type.isValueDereferenceable(this.rawValue());
    },
    describe : function(){
        var w1 = isA(this.decl, Declarations.Parameter) ? "parameter " : "object ";
        return {name: this.name, message: "the " + w1 + (this.name || ("at 0x" + this.address))};
    },
    initialized : function(){
        this._initialized = true;
    },
    // TODO: doesn't work for class-type objects
    // ^^^ why not? looks like it should work to me
    isInitialized : function(){
        return !!this._initialized;
    }

});


var ThisObject = CPP.ThisObject = ObjectEntity.extend({
    _name: "ThisObject",
    storage: "automatic"
});

var StaticEntity = CPP.StaticEntity = CPP.DeclaredEntity.extend({
    _name: "StaticEntity",
    storage: "static",
    init: function(decl){
        this.initParent(decl);
    },
    objectInstance: function(){
        return StaticObjectInstance.instance(this);
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    lookup : function(sim, inst) {
        return sim.memory.staticLookup(this).lookup(sim, inst);
    }

});

var DynamicObject = CPP.DynamicObject = CPP.ObjectEntity.extend({
    _name: "DynamicObject",
    storage: "dynamic",
    init: function(type, name){
        this.initParent(name || null, type);
    },
    instanceString : function(){
        return "Heap object at " + this.address + " (" + this.type + ")";
    },
    leaked : function(sim){
        if (!this.hasBeenLeaked){
            this.hasBeenLeaked = true;
            sim.memoryLeaked("Oh no! Some memory just got lost. It's highlighted in red in the memory display.")
            this.send("leaked");
        }
    },
    unleaked : function(sim){
        this.send("unleaked");
    },
    describe : function(){
        return {message: "the heap object " + (this.name || "at 0x" + this.address)};
    }
});

var AutoEntity = CPP.AutoEntity = CPP.DeclaredEntity.extend({
    _name: "AutoEntity",
    storage: "automatic",
    init: function(decl){
        this.initParent(decl);
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    objectInstance: function(){
        return AutoObjectInstance.instance(this);
    },
    lookup: function (sim, inst) {
        // We lookup first on the current stack frame and then call
        // lookup again in case it's a reference or something.
        return inst.funcContext.frame.lookup(this).lookup(sim, inst);
    },
    describe : function(){
        if (isA(this.decl, Declarations.Parameter)){
            return {message: "the parameter " + this.name};
        }
        else{
            return {message: "the local variable " + this.name};
        }
    }
});

//var TemporaryReferenceEntity = CPP.TemporaryReferenceEntity = CPP.CPPEntity.extend({
//    _name: "TemporaryReferenceEntity",
//    storage: "automatic",
//    init: function(refersTo){
//        assert(isA(refersTo, ObjectEntity));
//        this.initParent(refersTo.name);
//        this.type = decl.type;
//        this.decl = decl;
//    },
//    instanceString : function(){
//        return this.name + " (" + this.type + ")";
//    },
//    lookup: function (sim, inst) {
//        return inst.funcContext.frame.lookup(this);
//    }
//});

var AutoObjectInstance = CPP.AutoObjectInstance = CPP.ObjectEntity.extend({
    _name: "AutoObjectInstance",
    storage: "automatic",
    init: function(autoObj){
        this.initParent(autoObj.name, autoObj.type);
        this.decl = autoObj.decl;
        this.entityId = autoObj.entityId;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    }
});

var StaticObjectInstance = CPP.StaticObjectInstance = CPP.ObjectEntity.extend({
    _name: "StaticObjectInstance",
    storage: "static",
    init: function(staticEnt){
        this.initParent(staticEnt.name, staticEnt.type);
        this.decl = staticEnt.decl;
        this.entityId = staticEnt.entityId;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    }
});



var ParameterEntity = CPP.ParameterEntity = CPP.CPPEntity.extend({
    _name: "ParameterEntity",
    storage: "automatic",
    init: function(func, num){
        assert(isA(func, FunctionEntity) || isA(func, PointedFunctionEntity));
        assert(num !== undefined);

        this.num = num;
        this.func = func;

        this.initParent("Parameter "+num+" of "+func.name);
        this.type = func.type.paramTypes[num];
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    objectInstance: function(){
        return AutoObjectInstance.instance(this);
    },
    lookup: function (sim, inst) {
        // In case function was polymorphic or a function pointer, look it up
        var func = this.func.lookup(sim, inst.parent);

        // Now we can look up object entity associated with this parameter
        var objEntity = func.definition.params[this.num].entity;

        return objEntity.lookup(sim, inst.calledFunction);
    },
    describe : function(){
        return {message: "parameter " + this.num + " of " + this.func.describe().message};
    }

});

var ReturnEntity = CPP.ReturnEntity = CPP.CPPEntity.extend({
    _name: "ReturnEntity",
    storage: "automatic",
    init: function(type){
        this.initParent("return value");
        this.type = type;
    },
    instanceString : function(){
        return "return value (" + this.type + ")";
    },
    lookup: function (sim, inst) {
        return inst.funcContext.model.getReturnObject(sim, inst.funcContext).lookup(sim, inst);
    }
});

var ReceiverEntity = CPP.ReceiverEntity = CPP.CPPEntity.extend({
    _name: "ReceiverEntity",
    storage: "automatic",
    init: function(type){
        assert(isA(type, Types.Class));
        this.initParent(type.className);
        this.type = type;
    },
    instanceString : function(){
        return "function receiver (" + this.type + ")";
    },
    lookup: function (sim, inst) {
        var rec = inst.memberOf || inst.funcContext.receiver;
        return rec.lookup(sim, inst);
    },
    describe : function(sim, inst){
        if (inst){
            return {message: "the receiver of this call to " + inst.funcContext.describe(sim, inst.funcContext).message + " (i.e. *this) "};
        }
        else {
            return {message: "the receiver of this call (i.e. *this)"};
        }
    }
});



var NewObjectEntity = CPP.NewObjectEntity = CPP.CPPEntity.extend({
    _name: "NewObjectEntity",
    storage: "automatic",
    init: function(type){
        this.initParent(null);
        this.type = type;
    },
    instanceString : function(){
        return "object (" + this.type + ")";
    },
    lookup: function (sim, inst) {
        return inst.allocatedObject.lookup(sim, inst);
    },
    describe : function(){
        return {message: "the object ("+this.type+") created by new"};
    }

});

var RuntimeEntity = CPP.RuntimeEntity = CPP.ObjectEntity.extend({
    _name: "RuntimeEntity",
    storage: "automatic",
    init: function(type, inst){
        this.initParent(null, type);
        this.inst = inst;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    lookup: function (sim, inst) {
        return this.inst.evalValue.lookup(sim, inst);
    }
});

var ArraySubobjectEntity = CPP.ArraySubobjectEntity = CPP.CPPEntity.extend({
    _name: "ArraySubobjectEntity",
    storage: "none",
    init: function(arrayEntity, index){
        assert(isA(arrayEntity.type, Types.Array));
        this.initParent(arrayEntity.name + "[" + index + "]");
        this.arrayEntity = arrayEntity;
        this.type = arrayEntity.type.elemType;
        this.index = index;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    lookup: function (sim, inst) {
        return this.arrayEntity.lookup(sim, inst).elemObjects[this.index].lookup(sim, inst);
    },
    objectInstance : function(arrObj){
        return ArraySubobject.instance(arrObj, this.index);
    },
    describe : function(){
        var desc = {};
        var arrDesc = this.arrayEntity.describe();
        desc.message = "element " + this.index + " of " + arrDesc.message;
        if (arrDesc.name){
            desc.name = arrDesc.name + "[" + this.index + "]";
        }
        return desc;
    }
});

var BaseClassSubobjectEntity = CPP.BaseClassSubobjectEntity = CPP.CPPEntity.extend({
    _name: "BaseClassSubobjectEntity",
    storage: "none",
    init: function(type, memberOfType, access){
        assert(isA(type, Types.Class));
        this.initParent(type.className);
        this.type = type;
        if (!this.type._isInstance){
            this.type = this.type.instance(); // TODO remove once type is actually passed in as instance
        }
        this.memberOfType = memberOfType;
        this.access = access;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    lookup: function (sim, inst) {
        var memberOf = inst.memberOf || inst.funcContext.receiver;

        while(memberOf && !isA(memberOf.type, this.type)){ // TODO: this isA should probably be changed to a type function
            memberOf = memberOf.type.getBaseClass() && memberOf.i_baseSubobjects[0];
        }
        assert(memberOf, "Internal lookup failed to find subobject in class or base classes.");

        return memberOf.lookup(sim, inst);
    },
    objectInstance : function(parentObj){
        return BaseClassSubobject.instance(this.type, parentObj);
    },
    describe : function(){
        return {message: "the " + this.name + " base object of " + this.memberOfType.className};
    }
});

var MemberSubobjectEntity = DeclaredEntity.extend({
    _name: "MemberSubobjectEntity",
    storage: "none",
    init: function(decl, memberOfType){
        this.initParent(decl);
        if (!this.type._isInstance){
            this.type = this.type.instance(); // TODO remove once type is actually passed in as instance
        }
        this.memberOfType = memberOfType;
        this.access = decl.access;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    lookup: function (sim, inst) {
        var memberOf = inst.memberOf || inst.funcContext.receiver;

        while(memberOf && !memberOf.type.isInstanceOf(this.memberOfType)){
            memberOf = memberOf.type.getBaseClass() && memberOf.i_baseSubobjects[0];
        }

        assert(memberOf, "Internal lookup failed to find subobject in class or base classses.");

        return memberOf.getMemberSubobject(this.name).lookup(sim, inst); // I think the lookup here is in case of reference members?
    },
    objectInstance : function(parentObj){
        return MemberSubobject.instance(this.type, parentObj, this.name);
    },
    describe : function(sim, inst){
        if (inst){
            var memberOf = inst.memberOf || inst.funcContext.receiver;
            if (memberOf.name){
                return {message: this.memberOf.name + "." + this.name};
            }
            else{
                return {message: "the member " + this.name + " of " + memberOf.describe(sim, inst).message};
            }
        }
        else{
            return {message: "the " + this.name + " member of the " + this.memberOfType.className + " class"};
        }
    }
});

var AnonObject = CPP.AnonObject = CPP.ObjectEntity.extend({
    _name: "AnonObject",
    storage: "temp",
    init: function(type, name){
        this.initParent(name || null, type);
    },
    nameString : function(){
        return this.name || "@" + this.address;
    }/*,
     isAlive : function(){
     return false;
     }*/
});


var Subobject = CPP.Subobject = CPP.ObjectEntity.extend({
    _name: "Subobject",
    parentObject : Class._ABSTRACT,
    isAlive : function(){
        return this.parentObject().isAlive();
    },
    obituary : function(){
        return this.parentObject().obituary();
    }
});



var ArraySubobject = CPP.ArraySubobject = CPP.Subobject.extend({
    _name: "ArraySubobject",
    storage: "temp",
    init: function(arrObj, index){
        this.initParent(null, arrObj.type.elemType);
        this.arrObj = arrObj;
        this.index = index;
    },
    nameString : function(){
        return this.name || "@" + this.address;
    },
    parentObject : function(){
        return this.arrObj;
    },
    getPointerTo : function(){
        assert(this.address, "Must be allocated before you can get pointer to object.");
        return Value.instance(this.address, Types.ArrayPointer.instance(this.arrObj));
    },
    describe : function(){
        var desc = {};
        var arrDesc = this.arrObj.describe();
        desc.message = "element " + this.index + " of " + arrDesc.message;
        if (arrDesc.name){
            desc.name = arrDesc.name + "[" + this.index + "]";
        }
        return desc;
    },
    isAlive : function() {
        return ArraySubobject._parent.isAlive.apply(this, arguments) && this.isInBounds();
    },
    isValueValid : function() {
        return Lobster.CPP.ArraySubobject._parent.isValueValid.apply(this, arguments) && this.isInBounds();
    },
    isInBounds : function() {
        var offset = (this.address - this.arrObj.address) / this.type.size;
        return 0 <= offset && offset < this.arrObj.elemObjects.length;
    },
    setValue : function(newValue, write) {
        ArraySubobject._parent.setValue.apply(this, arguments);
        write && this.arrObj.arrayElemValueWritten(this);
    }
});



var TemporaryObjectEntity = CPP.TemporaryObjectEntity = CPP.CPPEntity.extend({
    _name: "TemporaryObjectEntity",
    storage: "temp",
    init: function(type, creator, owner, name){
        this.initParent(name || null);
        this.type = type;
        this.creator = creator;
        this.setOwner(owner);
    },
    setOwner : function(newOwner){
        if (newOwner === this.owner)
            if (this.owner){
                this.owner.removeTemporaryObject(this);
            }
        this.owner = newOwner;
        this.owner.addTemporaryObject(this);
    },
    updateOwner : function(){
        var newOwner = this.creator.findFullExpression();
        if (newOwner === this.owner){ return; }
        if (this.owner){
            this.owner.removeTemporaryObject(this);
        }
        this.owner = newOwner;
        this.owner.addTemporaryObject(this);
    },
    objectInstance: function(creatorInst){
        var obj = creatorInst.sim.memory.allocateTemporaryObject(this);

        var inst = creatorInst;
        while (inst.model !== this.owner){
            inst = inst.parent;
        }

        inst.temporaryObjects = inst.temporaryObjects || {};
        inst.temporaryObjects[obj.entityId] = obj;
        return obj;
    },
    lookup: function (sim, inst) {
        var ownerInst = inst;
        while (ownerInst.model !== this.owner){
            ownerInst = ownerInst.parent;
        }
        var tempObjInst = ownerInst.temporaryObjects[this.entityId];
        return tempObjInst && tempObjInst.lookup(sim, inst);
    }
});

var TemporaryObjectInstance = CPP.TemporaryObjectInstance = CPP.ObjectEntity.extend({
    _name: "TemporaryObject",
    storage: "temp",
    init: function(tempObjEntity){
        this.initParent(tempObjEntity.name, tempObjEntity.type);
        this.entityId = tempObjEntity.entityId;
    },
    nameString : function(){
        return "@" + this.address;
    }
});

var BaseClassSubobject = CPP.BaseClassSubobject = CPP.Subobject.extend({
    _name: "BaseClassSubobject",
    storage: "none",
    init: function(type, parent){
        assert(isA(type, Types.Class));
        this.initParent("-"+type.className, type);
        this.parent = parent;
        this.storage = parent.storage;
    },
    parentObject : function(){
        return this.parent;
    },
    nameString : function(){
        return this.parent.nameString();
    },
    describe : function(){
        return {message: "the " + this.type.className + " base of " + this.parentObject().describe().message};
    }
});

var MemberSubobject = CPP.MemberSubobject = CPP.Subobject.extend({
    _name: "MemberSubobject",
    storage: "none",
    init: function(type, parent, name){
        this.initParent(name || null, type);
        this.parent = parent;
        this.storage = parent.storage;
    },
    parentObject : function(){
        return this.parent;
    },
    nameString : function(){
        return this.parent.nameString() + "." + this.name;
    },
    describe : function(){
        var parent = this.parentObject();
        if (parent.name){
            return {message: parent.name + "." + this.name};
        }
        else{
            return {message: "the member " + this.name + " of " + parent.describe().message};
        }
    },
    setValue : function(newValue, write) {
        MemberSubobject._parent.setValue.apply(this, arguments);
        write && this.parent.memberSubobjectValueWritten(this);
    }
});

var createAnonObject = function(type, memory, address){
    var obj = AnonObject.instance(type);
    obj.allocated(memory, address);
    return obj;
};

var FunctionEntity = CPP.FunctionEntity = CPP.DeclaredEntity.extend({
    _name: "FunctionEntity",
    init: function(decl){
        this.initParent(decl);
    },
    isStaticallyBound : function(){
        return true;
    },
    isVirtual : function(){
        return false;
    },
    instanceString : function() {
        return this.name;
    },
    nameString : function(){
        return this.name;
    },
    describe : function(sim, inst){
        return this.decl.describe(sim, inst);
    },
    isLinked : function() {
        return this.isDefined();
    },
    getPointerTo : function() {
        return Value.instance(this, this.type);
    }
});

var MagicFunctionEntity = CPP.MagicFunctionEntity = CPP.FunctionEntity.extend({
    init : function(decl) {
        this.initParent(decl);
        this.setDefinition(decl);
    }
});


var MemberFunctionEntity = CPP.MemberFunctionEntity = CPP.FunctionEntity.extend({
    _name: "MemberFunctionEntity",
    isMemberFunction: true,
    init: function(decl, containingClass, virtual){
        this.initParent(decl);
        this.i_containingClass = containingClass;
        this.virtual = virtual;
        this.pureVirtual = decl.pureVirtual;
        // May be set to virtual if it's discovered to be an overrider
        // for a virtual function in a base class

        this.checkForOverride();
    },
    checkForOverride : function(){
        if (!this.i_containingClass.getBaseClass()){
            return;
        }

        // Find the nearest overrider of a hypothetical virtual function.
        // If any are virtual, this one would have already been set to be
        // also virtual by this same procedure, so checking this one is sufficient.
        // If we override any virtual function, this one is too.
        var overridden = this.i_containingClass.getBaseClass().classScope.singleLookup(this.name, {
            paramTypes: this.type.paramTypes, isThisConst: this.type.isThisConst,
            exactMatch:true, own:true, noNameHiding:true});

        if (overridden && isA(overridden, FunctionEntity) && overridden.virtual){
            this.virtual = true;
            // Check to make sure that the return types are covariant
            if (!covariantType(this.type.returnType, overridden.type.returnType)){
                throw SemanticExceptions.NonCovariantReturnTypes.instance(this, overridden);
            }
        }
    },
    isStaticallyBound : function(){
        return !this.virtual;
    },
    isVirtual : function(){
        return this.virtual;
    },
    isLinked : function(){
        return this.virtual && this.pureVirtual || this.isDefined();
    },
    lookup : function(sim, inst){
        if (this.virtual){
            // If it's a virtual function start from the class scope of the dynamic type
            var receiver = inst.nearestReceiver().lookup(sim, inst);
            assert(receiver, "dynamic function lookup requires receiver");
            var dynamicType = receiver.type;

            // Sorry this is hacky :(
            // If it's a destructor, we look instead for the destructor of the dynamic type
            var func;
            if (isA(this.definition, DestructorDefinition)) {
                func = dynamicType.destructor;
            }
            else{
                func = dynamicType.classScope.singleLookup(this.name, {
                    paramTypes: this.type.paramTypes, isThisConst: this.type.isThisConst,
                    exactMatch:true, own:true, noNameHiding:true});
            }
            assert(func, "Failed to find virtual function implementation during lookup.");
            return func;
        }
        else{
            return this;
        }
    },
    suppressedVirtualProxy : function(){
        return this.proxy({
            virtual: false
        });
    }

});


var PointedFunctionEntity = CPP.PointedFunctionEntity = CPPEntity.extend({
    _name: "FunctionEntity",
    init: function(type){
        this.initParent("Unknown function of type " + type);
        this.type = type;
    },
    isStaticallyBound : function(){
        return true;
    },
    instanceString : function() {
        return this.name;
    },
    nameString : function(){
        return this.name;
    },
    lookup : function(sim, inst){
        return inst.pointedFunction.lookup(sim,inst);
    },
    isLinked : function(){
        return true;
    },
    isVirtual : function() {
        return false;
    }
});

//var FunctionEntityGroup = CPP.FunctionEntityGroup = CPP.CPPEntity.extend({
//    _name: "FunctionEntityGroup",
//    init: function(name){
//        this.initParent(name);
//        this.arr = [];
//    },
//    push : function(ent){
//        this.arr.push(ent);
//    },
//    instanceString : function() {
//        return this.name;
//    },
//    nameString : function(){
//        return this.name;
//    }
//});



var TypeEntity = CPP.TypeEntity = CPP.DeclaredEntity.extend({
    _name: "TypeEntity",
    init: function(decl){
        this.initParent(decl);
    },
    instanceString : function() {
        return "TypeEntity: " + this.type.instanceString();
    },
    nameString : function(){
        return this.name;
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

// TODO: clean this up so it doesn't depend on trying to imitate the interface of an expression.
// Probably would be best to just create an "AuxiliaryExpression" class for something like this.
var fakeExpressionsFromTypes = function(types){
    var exprs = [];
    for (var i = 0; i < types.length; ++i){
        exprs[i] = AuxiliaryExpression.instance(types[i]);
        // exprs[i] = {type: types[i], ast: null, valueCategory: "prvalue", context: {parent:null}, parent:null, conversionLength: 0};
    }
    return exprs;
};










var Memory = Lobster.Memory = Class.extend(Observable, {
    _name: "Memory",
    init: function(capacity, staticCapacity, stackCapacity){
        this.initParent();

        this.capacity = capacity || 10000;
        this.staticCapacity = staticCapacity || Math.floor(this.capacity / 10);
        this.stackCapacity = stackCapacity || Math.floor((this.capacity - this.staticCapacity) / 2);
        this.heapCapacity = this.capacity - this.staticCapacity - this.stackCapacity;

        this.bubble = true;
        this.staticStart = 0;
        this.staticTop = this.staticStart + 4;
        this.staticEnd = this.staticStart + this.staticCapacity;
        this.staticObjects = {};

        this.stackStart = this.staticEnd;
        this.stackEnd = this.stackStart + this.stackCapacity;

        this.heapStart = this.stackEnd;
        this.heapEnd = this.heapStart + this.heapCapacity;

        this.temporaryStart = this.heapEnd + 100;
        this.temporaryBottom = this.temporaryStart;
        this.temporaryCapacity = 10000;
        this.temporaryEnd = this.temporaryStart + this.temporaryCapacity;

        assert(this.staticCapacity < this.capacity && this.stackCapacity < this.capacity && this.heapCapacity < this.capacity);
        assert(this.heapEnd == this.capacity);

    },

    reset : function(){

        // memory is a sequence of bytes, addresses starting at 0
        this.bytes = new Array(this.capacity + this.temporaryCapacity);
        for(var i = 0; i < this.capacity + this.temporaryCapacity; ++i){
            this.bytes[i] = Math.floor(Math.random() * 100);
        }

        this.objects = {};
        this.staticTop = this.staticStart+4;
        this.staticObjects = {};
        this.temporaryBottom = this.temporaryStart;

        this.stack = MemoryStack.instance(this, this.staticEnd);
        this.heap = MemoryHeap.instance(this, this.heapEnd);
        this.temporaryObjects = {};
        this.send("reset");
    },

//    clear : function(){
//        for(var i = 0; i < this.capacity; ++i){
//            this.bytes[i] = 0;
//        }
//        this.stack = null;
//        this.heap = null;
//        this.objects = {};
//        this.send("cleared");
//    },
    allocateObject : function(object, addr){
        this.objects[addr] = object;
        object.allocated(this, addr);
    },
    deallocateObject : function(addr, inst){
        assert(addr !== undefined);
        var obj = this.objects[addr];
        if (obj){
            obj.deallocated(inst);
        }
        // I'm just leaving the dead objects here for now, that way we can provide better messages if a dead object is looked up
        //delete this.objects[addr];
    },
    allocateStatic : function(staticEntity){
        var object = staticEntity.objectInstance();
        this.allocateObject(object, this.staticTop);
        this.staticTop += object.size;
        this.staticObjects[staticEntity.getFullyQualifiedName()] = object;

        if(staticEntity.defaultValue !== undefined){
            object.setValue(staticEntity.defaultValue);
        }
        else if (staticEntity.type.defaultValue !== undefined){
            object.setValue(staticEntity.type.defaultValue);
        }
    },

    staticLookup : function(staticEntity) {
        return this.staticObjects[staticEntity.getFullyQualifiedName()];
    },

    getByte : function(addr){
        return this.bytes[addr];
    },
    readByte : function(ad, fromObj){

        // Notify any other object that is interested in that byte
        // var begin = ad - Type.getMaxSize();
        //for(var i = ad; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj == fromObj) { continue; }
        //    if (obj && obj.size > ad - i){
        //        obj.byteRead(ad);
        //    }
        //}
        return this.bytes[ad];
    },
    getBytes : function(addr, num){
        return this.bytes.slice(addr, addr + num);
    },
    readBytes : function(ad, num, fromObj){
        var end = ad + num;

        // Notify any other object that is interested in that byte
        // var begin = ad - Type.getMaxSize();
        //for(var i = end-1; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj == fromObj) { continue; }
        //    if (obj && obj.size > ad - i){
        //        obj.bytesRead(ad, end-ad);//.send("bytesRead", {addr: ad, length: end-ad});
        //    }
        //}

        return this.bytes.slice(ad, end);
    },
    setByte : function(ad, value){
        this.bytes[ad] = value;

        // Notify any object that is interested in that byte
        // var begin = ad - Type.getMaxSize();
        //for(var i = ad; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj && obj.size > ad - i){
        //        obj.byteSet(ad, value);//.send("byteSet", {addr: ad, value: value});
        //    }
        //}
    },
    writeByte : function(ad, value, fromObj){
        this.bytes[ad] = value;

        // Notify any other object that is interested in that byte
        // var begin = ad - Type.getMaxSize();
        //for(var i = ad; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj == fromObj) { continue; }
        //    if (obj && obj.size > ad - i){
        //        obj.byteWritten(ad, value);//.send("byteWritten", {addr: ad, value: value});
        //    }
        //}
    },
    setBytes : function(ad, values){

        for(var i = 0; i < values.length; ++i){
            this.bytes[ad+i] = values[i];
        }

        // Notify any other object that is interested in that byte
        //var begin = ad - Type.getMaxSize();
        //for(var i = ad+values.length; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj && obj.size > ad - i){
        //        obj.bytesSet(ad, values);//.send("byteSet", {addr: ad, values: values});
        //    }
        //}
    },
    writeBytes : function(ad, values, fromObj){

        //TODO remove this commented code
        //if (isA(fromObj, TemporaryObject)){
        //    var objBytes = this.temporaryObjects[fromObj.entityId];
        //    if (!objBytes){
        //        objBytes = new Array(fromObj.size);
        //        for(var i = 0; i < fromObj.size; ++i){
        //            objBytes[i] = 0;
        //        }
        //        this.temporaryObjects[fromObj.entityId] = objBytes;
        //    }
        //    return;
        //}

        for(var i = 0; i < values.length; ++i){
            this.bytes[ad+i] = values[i];
        }

        // Notify any other object that is interested in that byte
        //var begin = ad - Type.getMaxSize();
        //for(var i = ad+values.length-1; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj == fromObj) { continue; }
        //    if (obj && obj.size > ad - i){
        //        obj.bytesWritten(ad, values);//.send("bytesWritten", {addr: ad, values: values});
        //    }
        //}
    },

//    makeObject : function(entity, addr){
//        return this.objects[addr] = CPPObject.instance(entity, this, addr);
//    },
    // Takes in a Value or ObjectEntity of pointer type. Must point to an object type
    // Returns the most recently allocated object at the given address.
    // This may be an object which is no longer alive (has been deallocated).
    getObject: function(ptr, type){
        assert(isA(ptr, Value) || isA(ptr, ObjectEntity));
        assert(ptr.type.isObjectPointer());
        type = type || ptr.type.ptrTo;

        var addr = ptr.rawValue();

        // Handle special cases for pointers with RTTI
        if (isA(ptr.type, Types.ArrayPointer)){
            return ptr.type.arrObj.getSubobject(addr, this);

        }
        else if (isA(ptr.type, Types.ObjectPointer)  && ptr.type.isValueValid(addr)){
            return ptr.type.obj;
        }

        // Grab object from memory
        var obj = this.objects[addr];

        if (obj && (similarType(obj.type. type) || subType(obj.type, type))){
            return obj;
        }

        // If the object wasn't there or doesn't match the type we asked for (ignoring const)
        // then we need to create an anonymous object of the appropriate type instead
        return createAnonObject(type, this, addr);
    },
    allocateTemporaryObject: function(tempEntity){
        var obj = TemporaryObjectInstance.instance(tempEntity);
        this.allocateObject(obj, this.temporaryBottom);
        this.temporaryBottom += tempEntity.type.size;
        this.temporaryObjects[tempEntity.entityId] = obj;
        this.send("temporaryObjectAllocated", obj);

        if(tempEntity.defaultValue !== undefined){
            obj.setValue(tempEntity.defaultValue);
        }
        else if (tempEntity.type.defaultValue !== undefined){
            obj.setValue(tempEntity.type.defaultValue);
        }

        return obj;
    },
    deallocateTemporaryObject: function(obj, inst){
        this.deallocateObject(obj, inst);
        //this.temporaryBottom += obj.type.size;
        delete this.temporaryObjects[obj];
        this.send("temporaryObjectDeallocated", obj);
    }
});

var MemoryStack = Class.extend(Observable, {
    _name: "MemoryStack",
    init: function(memory, start){
        this.initParent();

        this.memory = memory;
        this.start = start;
        this.top = start;
        this.frames = [];
    },
    clear : function(){
        this.frames.length = 0;
        this.top = this.start;
    },
    topFrame : function(){
        return this.frames.last();
    },
    pushFrame : function(func){
        var frame = MemoryFrame.instance(func.funcDeclModel.bodyScope, this.memory, this.top, func);
        this.top += frame.size;
        this.frames.push(frame);

        // Take care of reference parameters


        this.memory.send("framePushed", frame);
        return frame;
    },
    popFrame : function(inst){
        var frame = this.frames.pop();
        for (var key in frame.objects){
            var obj = frame.objects[key];
            this.memory.deallocateObject(obj.address, inst)
        }
        this.top -= frame.size;
        this.memory.send("framePopped", frame);
    },
    instanceString : function(){
        var str = "<ul class=\"stackFrames\">";
        for(var i = 0; i < this.frames.length; ++i){
            var frame = this.frames[i];
            str += "<li>" + frame.toString() + "</li>";
        }
        str += "</ul>";
        return str;
    }
});

var MemoryHeap = Class.extend(Observable, {
    _name: "MemoryHeap",
    props : {
        memory: {type: Memory},
        bottom: {type: "number"}
    },
    init: function(memory, end){
        this.memory = memory;
        this.end = end;
        this.bottom = end;
        this.objectMap = {};

        this.initParent();
    },
    clear : function(){
        this.objects.length = 0;
    },
    allocateNewObject: function(obj){
        this.bottom -= obj.type.size;
        this.memory.allocateObject(obj, this.bottom);
        this.objectMap[obj.address] = obj;
        this.memory.send("heapObjectAllocated", obj);


        if(obj.defaultValue !== undefined){
            obj.setValue(obj.defaultValue);
        }
        else if (obj.type.defaultValue !== undefined){
            obj.setValue(obj.type.defaultValue);
        }
    },

    deleteObject: function(addr, inst){
        var obj = this.objectMap[addr];
        if (obj) {
            delete this.objectMap[addr];
            this.memory.deallocateObject(addr, inst);
            this.memory.send("heapObjectDeleted", obj);
            // Note: responsibility for running destructor lies elsewhere
        }
        return obj;
    }
});

//TODO search for StackFrame, .stack, .heap, .objects

var MemoryFrame = Lobster.CPP.MemoryFrame = Class.extend(Observable, {
    _name: "MemoryFrame",
    props : {
        scope: {type: FunctionBlockScope},
        memory: {type: Memory},
        start: {type: "number"},
        size: {type: "number"}
    },
    init: function(scope, memory, start, func){
        var self = this;
        this.scope = scope;
        this.memory = memory;
        this.start = start;
        this.func = func.funcDeclModel;
        var funcInst = func;

        this.initParent();

        this.size = 0;
        this.objects = {};
        this.references = {};

        var addr = this.start;

        if(this.func.isMemberFunction){
            var obj = ThisObject.instance("this", Types.ObjectPointer.instance(funcInst.receiver));

            // Allocate object
            this.memory.allocateObject(obj, addr);
            obj.setValue(funcInst.receiver.getPointerTo());
            addr += obj.size;

            this.objects[obj.entityId] = obj;
            this.size += obj.size;
        }

        this.setUpReferenceInstances();

        // Push objects for all entities in the frame
        var autos = scope.automaticObjects;
        for (var i = 0; i < autos.length; ++i) {
            var objEntity = autos[i];

            // Create instance of the object
            obj = objEntity.objectInstance();

            // Allocate object
            this.memory.allocateObject(obj, addr);
            addr += obj.size;

            this.objects[obj.entityId] = obj;
            this.size += obj.size;

            if(objEntity.defaultValue !== undefined){
                obj.setValue(objEntity.defaultValue);
            }
            else if (objEntity.type.defaultValue !== undefined){
                obj.setValue(objEntity.type.defaultValue);
            }
//                console.log("----" + key);
        }


        this.end = this.start + this.size;
    },

    instanceString : function(){
        var str = "";
        for(var key in this.objects){
            var obj = this.objects[key];
//			if (!obj.type){
            // str += "<span style=\"background-color:" + obj.color + "\">" + key + " = " + obj + "</span>\n";
            str += "<span>" + obj + "</span>\n";
//			}
        }
        return str;
    },

    lookup : function(entity){
        // Extra lookup will do nothing for auto objects, but will find actual
        // object for references.
        return this.objects[entity.entityId].lookup();
    },
    referenceLookup : function(entity){
        return this.references[entity.entityId].lookup();
    },
    setUpReferenceInstances : function(){
        var self = this;
        this.scope.referenceObjects.forEach(function(ref){
            self.references[ref.entityId] = ref.autoInstance();
            //self.memory.allocateObject(ref, addr);
            //addr += ref.type.size;
        });
    }

});

//var entityLookup = function (sim) {
//    var stackFrame = sim.memory.stack.topFrame();
////        var globalFrame = sim.memory.globalFrame;
//    var obj = stackFrame.lookup(this.entity);// || globalFrame.lookup(this.entity);
//    inst.setEvalValue(obj);
//}
