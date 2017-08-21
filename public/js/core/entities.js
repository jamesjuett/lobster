var Lobster = Lobster || {};
var CPP = Lobster.CPP = Lobster.CPP || {};

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

    // TODO: this should be a member function of the Program class
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

        // TODO: remove this. it seems much cleaner to force elsewhere to explicitly
        // user either regular (i.e. unqualified) or qualified lookup
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

    /**
     * Most entities will have a natural type, but a few will not (e.g. namespaces). In this case,
     * the type will be null.
     * @param {Type?} type
     */
    init: function(type){
        this.entityId = CPPEntity._nextEntityId++;
        this.type = type;
    },

    /**
     * Default behavior - no runtime object associated with this entity. Just return ourselves.
     * Derived classes may override and return either a more specific entity (e.g. a dynamically
     * bound derived class version of a virtual function) or an object that exists at runtime (e.g.
     * getting the object named by a variable in some context).
     *
     * The context for the lookup is provided by two parameters. The first is the Simulation object,
     * which can be used e.g. to query memory for an object. The second is a RuntimeConstruct instance
     * relevant to the lookup.
     * @param sim
     * @param inst
     * @returns {CPPEntity}
     */
    runtimeLookup :  function(sim, inst){
        return this;
    },

    describe : Class._ABSTRACT,

    isLibraryConstruct : function() {
        return false
    },
    isLibraryUnsupported : function() {
        return false;
    }

    //TODO: function for isOdrUsed()?
});
CPP.CPPEntity = CPPEntity;

var NamedEntity = CPPEntity.extend({
    _name : "NamedEntity",

    linkage: "none", // TODO NEW make this abstract

    /**
     * All NamedEntitys will have a name, but in some cases this might be null. e.g. an unnamed namespace.
     * @param {Type} type
     * @param {string} name
     */
    init : function(type, name) {
        this.initParent(type);
        this.name = name;
    }


});
CPP.NamedEntity = NamedEntity;

var DeclaredEntity = NamedEntity.extend({
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
        this.initParent(decl.type, decl.name);
        this.decl = decl;
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

var ReferenceEntity = CPP.ReferenceEntity = CPP.DeclaredEntity.extend({
    _name: "ReferenceEntity",
    storage: "automatic", // TODO: is this correct? No. It's not, because references may not even require storage at all, but I'm not sure if taking it out will break something.

    runtimeLookup :  function(sim, inst){
        return inst.containingRuntimeFunction().stackFrame.referenceLookup(this).runtimeLookup(sim, inst);
    },
    runtimeInstance : function(){
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

// TODO: determine what should actually be the base class here
var ReferenceEntityInstance = CPP.ReferenceEntityInstance = CPP.DeclaredEntity.extend({
    _name: "ReferenceEntityInstance",
    init: function (entity) {
        this.initParent(entity.decl);
    },
    allocated : function(){},

    runtimeLookup :  function(){
        // It's possible someone will be looking up the reference in order to bind it (e.g. auxiliary reference used
        // in function return), so if we aren't bound to anything return ourselves.
        return this.refersTo || this; // Don't need chained lookup here since this.refersTo should never be another reference
    },
    bindTo : function(refersTo){
        assert(isA(refersTo, CPPObject) || isA(refersTo, ReferenceEntityInstance)); // Must refer to a concrete thingy

        // If the thing we refer to is a reference, look it up first so we refer to the source.
        // This eliminates chains of references, which for now is what I want.
        if (isA(refersTo, ReferenceEntityInstance)) {
            this.refersTo = refersTo.runtimeLookup();
        }
        else{
            this.refersTo = refersTo;
        }
        this.send("bound");
    },

    describe : function(){
        if (this.refersTo) {
            return {message: "the reference " + this.name + " (which is bound to " + this.refersTo.describe().message + ")"};
        }
        else {
            return {message: "the reference " + this.name + " (which has not yet been bound to an object)"};
        }
    }
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
    runtimeLookup :  function(sim, inst) {
        return sim.memory.staticLookup(this).runtimeLookup(sim, inst);
    },

    // TODO: these can be removed if declaration/definition classes are reworked such that
    //       the initializer can be easily retrieved from the definition. e.g. if multiple definitions
    //       from several declarators on a single line are actually treated as several definitions (as they
    //       really should be)
    setInitializer : function (init) {
        this.i_init = init;
    },
    getInitializer : function() {
        return this.i_init;
    }
});

var StringLiteralEntity = CPP.StringLiteralEntity = CPPEntity.extend({
    _name: "StringLiteralEntity",
    storage: "static",
    init: function(str){
        this.initParent(Types.Array.instance(Types.Char.instance(true), str.length + 1)); // + 1 for null char
        this.i_str = str;
    },
    objectInstance : function() {
        return StringLiteralObject.instance(this.type);
    },
    instanceString : function(){
        return "string literal \"" + unescapeString(this.i_str) + "\"";
    },
    getLiteralString : function() {
        return this.i_str;
    },
    runtimeLookup :  function(sim, inst) {
        return sim.memory.getStringLiteral(this.i_str);
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
    runtimeLookup :  function (sim, inst) {
        // We lookup first on the current stack frame and then call
        // lookup again in case it's a reference or something.
        return inst.containingRuntimeFunction().stackFrame.getObjectForEntity(this).runtimeLookup(sim, inst);
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
    runtimeLookup :  function (sim, inst) {
        // Getting the function at runtime already takes care of polymorphism for virtual functions
        var func = sim.topFunction();

        // Now we can look up object entity associated with this parameter
        var objEntity = func.model.params[this.num].entity;

        // Look it up in the context of the top function on the stack.
        return objEntity.runtimeLookup(sim, func);
    },
    describe : function(){
        return {message: "parameter " + this.num + " of " + this.func.describe().message};
    }

});

var ReturnEntity = CPP.ReturnEntity = CPP.CPPEntity.extend({
    _name: "ReturnEntity",
    storage: "automatic",

    instanceString : function() {
        return "return value (" + this.type + ")";
    },
    /**
     * If this is return-by-value (i.e. non-reference type), returns the temporary return object for the currently
     * executing function. If it is return-by-reference, there is only a return object if the return has already been
     * processed and the returned object has been set. If so, this function returns that object, otherwise null.
     * If the return type is void, returns null.
     * @param sim
     * @param inst
     * @returns {CPPObject?}
     */
    runtimeLookup :  function (sim, inst) {
        if (isA(type, Types.Void)) {
            return null;
        }
        else {
            return inst.containingRuntimeFunction().getReturnObject();
        }
    }
});

var ReceiverEntity = CPP.ReceiverEntity = CPP.CPPEntity.extend({
    _name: "ReceiverEntity",
    storage: "automatic",
    init: function(type){
        assert(isA(type, Types.Class));
        this.initParent(type);
    },
    instanceString : function(){
        return "function receiver (" + this.type + ")";
    },
    runtimeLookup :  function (sim, inst) {
        return inst.contextualReceiver();
    },
    describe : function(sim, inst){
        if (inst){
            return {message: "the receiver of this call to " + inst.containingRuntimeFunction().describe().message + " (i.e. *this) "};
        }
        else {
            return {message: "the receiver of this call (i.e. *this)"};
        }
    }
});



var NewObjectEntity = CPP.NewObjectEntity = CPP.CPPEntity.extend({
    _name: "NewObjectEntity",
    storage: "automatic",
    instanceString : function(){
        return "object (" + this.type + ")";
    },
    runtimeLookup :  function (sim, inst) {
        // no additional runtimeLookup() needed on the object since it will never be a reference
        return inst.getAllocatedObject();
    },
    describe : function(){
        return {message: "the dynamically allocated object (of type "+this.type+") created by new"};
    }

});

var ArraySubobjectEntity = CPP.ArraySubobjectEntity = CPP.CPPEntity.extend({
    _name: "ArraySubobjectEntity",
    storage: "none",
    init: function(arrayEntity, index){
        assert(isA(arrayEntity.type, Types.Array));
        this.initParent(arrayEntity.type.elemType);
        this.i_arrayEntity = arrayEntity;
        this.i_index = index;
    },

    runtimeLookup :  function (sim, inst) {
        return this.i_arrayEntity.runtimeLookup(sim, inst).elemObjects[this.i_index].runtimeLookup(sim, inst);
    },
    objectInstance : function(arrObj){
        return ArraySubobject.instance(arrObj, this.i_index);
    },
    describe : function(){
        var desc = {};
        var arrDesc = this.i_arrayEntity.describe();
        desc.message = "element " + this.i_index + " of " + arrDesc.message;
        if (arrDesc.name){
            desc.name = arrDesc.name + "[" + this.i_index + "]";
        }
        return desc;
    }
});

var BaseClassSubobjectEntity = CPP.BaseClassSubobjectEntity = CPP.CPPEntity.extend({
    _name: "BaseClassSubobjectEntity",
    storage: "none",
    init: function(type, memberOfType, access){
        assert(isA(type, Types.Class));
        assert(isA(memberOfType, Types.Class));
        this.initParent(type);
        if (!this.type._isInstance){
            this.type = this.type.instance(); // TODO remove once type is actually passed in as instance
        }
        this.memberOfType = memberOfType;
        this.access = access;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    runtimeLookup :  function (sim, inst) {
        var recObj = inst.contextualReceiver();

        while(recObj && !isA(recObj.type, this.type)){ // TODO: this isA should probably be changed to a type function
            recObj = recObj.type.getBaseClass() && recObj.i_baseSubobjects[0];
        }
        assert(recObj, "Internal lookup failed to find subobject in class or base classes.");

        return recObj.runtimeLookup(sim, inst);
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
        assert(this.type._isInstance); // TODO: remove once I can confirm the type is always instantiated
        this.memberOfType = memberOfType;
        this.access = decl.access;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    runtimeLookup :  function (sim, inst) {
        var recObj = inst.contextualReceiver();

        while(recObj && !recObj.type.isInstanceOf(this.memberOfType)){
            recObj = recObj.type.getBaseClass() && recObj.i_baseSubobjects[0];
        }

        assert(recObj, "Internal lookup failed to find subobject in class or base classses.");

        return recObj.getMemberSubobject(this.name).runtimeLookup(sim, inst); // I think the lookup here is in case of reference members?
    },
    objectInstance : function(parentObj){
        return MemberSubobject.instance(this.type, parentObj, this.name);
    },
    describe : function(sim, inst){
        if (inst){
            var recObj = inst.contextualReceiver();
            if (recObj.name){
                return {message: recObj.name + "." + this.name};
            }
            else{
                return {message: "the member " + this.name + " of " + recObj.describe(sim, inst).message};
            }
        }
        else{
            return {message: "the " + this.name + " member of the " + this.memberOfType.className + " class"};
        }
    }
});

var TemporaryObjectEntity = CPP.TemporaryObjectEntity = CPP.CPPEntity.extend({
    _name: "TemporaryObjectEntity",
    storage: "temp",
    init: function(type, creator, owner, name){
        this.initParent(type);
        this.creator = creator;
        this.setOwner(owner);
        this.name = name; // TODO: change when I check over usages of .name and replace with description or something
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
    runtimeLookup :  function (sim, inst) {
        var ownerInst = inst;
        while (ownerInst.model !== this.owner){
            ownerInst = ownerInst.parent;
        }
        var tempObjInst = ownerInst.temporaryObjects[this.entityId];
        return tempObjInst && tempObjInst.runtimeLookup(sim, inst);
    }
});

var FunctionEntity = CPP.FunctionEntity = CPP.DeclaredEntity.extend({
    _name: "FunctionEntity",
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
    runtimeLookup :  function(sim, inst){
        if (this.virtual){
            // If it's a virtual function start from the class scope of the dynamic type
            var receiver = inst.contextualReceiver();
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
        this.initParent(type);
        this.name = "Unknown function of type " + type;
    },
    isStaticallyBound : function(){
        return true;
    },
    instanceString : function() {
        return this.name;
    },
    runtimeLookup :  function(sim, inst){
        return inst.pointedFunction.runtimeLookup(sim,inst);
    },
    isLinked : function(){
        return true;
    },
    isVirtual : function() {
        return false;
    }
});



var TypeEntity = CPP.TypeEntity = CPP.DeclaredEntity.extend({
    _name: "TypeEntity",
    instanceString : function() {
        return "TypeEntity: " + this.type.instanceString();
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