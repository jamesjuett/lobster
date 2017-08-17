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