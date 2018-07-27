import * as Util from "../util/util";
import {CPPError, Note} from "./errors";
import * as SemanticExceptions from "./semanticExceptions";
import { Observable } from "../util/observe";
import {Type, covariantType, ArrayType, ClassType} from "./types";
import {Declaration} from "./declarations";
import {Initializer} from "./initializers";
import {Description} from "./errors";
import { CPPObject, AnonymousObject, AutoObject, StaticObject, ArrayObjectData } from "./objects";
import {standardConversion} from "./standardConversions";
import * as Expressions from "./expressions";
import {Expression} from "./expressions";
import { Value, Memory } from "./runtimeEnvironment";
import { RuntimeConstruct, ExecutableRuntimeConstruct } from "./constructs";

export interface LookupOptions {
    own?: boolean;
    noBase?: boolean;
    exactMatch?: boolean;
    paramTypes?: Type[]
}

export class Scope {

    private static _name = "Scope";
    private static HIDDEN = Symbol("HIDDEN");
    private static NO_MATCH = Symbol("NO_MATCH");

    private readonly entities: {[index:string]: CPPEntity | CPPEntity[]};
    private parent: Scope?;

    constructor(parent: Scope | null) {
        this.entities = {};
        this.parent = parent;
    }

    public toString() {
        var str = "";
        for(var key in this.entities){
            str += this.entities[key] + "\n";
        }
        return str;
    }

    // TODO: refactor so that you always call one of the more specific functions?
    private addEntity(ent: DeclaredEntity) {
        if (ent instanceof StaticEntity) {
            this.addStaticEntity(ent);
        }
        else if (ent instanceof AutoEntity) {
            this.addAutomaticEntity(ent);
        }
        else if (ent instanceof ReferenceEntity){
            this.addReferenceEntity(ent);
        }

        if (ent instanceof FunctionEntity){
            if (!this.entities[ent.name]) {
                this.entities[ent.name] = [];
            }
            this.entities[ent.name].push(ent);
        }
        else{
            this.entities[ent.name] = ent;
        }
    }

    public allEntities() {
        var ents = [];
        for(var name in this.entities) {
            if (Array.isArray(this.entities[name])) {
                var e = <CPPEntity[]>this.entities[name];
                for(let i = 0; i < e.length; ++i) {
                    ents.push(e[i]);
                }
            }
            else{
                ents.push(this.entities[name]);
            }
        }
        return ents;
    }

    // TODO NEW: this documentation is kind of messy (but hey, at least it exists!)
    /**
     * Attempts to add a new entity to this scope.
     * @param {DeclaredEntity} entity - The entity to attempt to add.
     * @returns {DeclaredEntity} Either the entity that was added, or an existing one already there, assuming it was compatible.
     * @throws  {SemanticException} If an error prevents the entity being added successfully. (e.g. Function declarations with
     * the same signature but a mismatch of return types, duplicate definition)
     */
    public addDeclaredEntity(entity: DeclaredEntity) {
        var otherEnt = this.ownEntity(entity.name);

        if (!otherEnt) { // No previous entity with this name, so just add it
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

    public ownEntity(name: string) {
        return this.entities[name];
    }

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
                return elem instanceof MemberFunctionEntity ? elem.suppressedVirtualProxy() : elem;
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

export var BlockScope = Scope.extend({
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

export class FunctionBlockScope extends BlockScope {
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
}

export var NamespaceScope = Scope.extend({

    init: function(name, parent, sim){
        assert(!parent || parent instanceof NamespaceScope);
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


export var ClassScope = NamespaceScope.extend({
    _name: "ClassScope",

    init: function(name, parent, base, sim){
        this.initParent(name, parent, sim);
        if(base){
            assert(base instanceof ClassScope);
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


export abstract class CPPEntity<T extends Type = Type> {
    protected static _name = "CPPEntity";
    private static _nextEntityId = 0;

    public readonly observable = new Observable(this);

    public readonly entityId: number;
    public readonly type: T;

    /**
     * Most entities will have a natural type, but a few will not (e.g. namespaces). In this case,
     * the type will be null.
     * TODO: fix this - there should probably be a subtype or interface for a TypedEntity or ObjectEntity
     */
    public constructor(type: T) {
        this.entityId = CPPEntity._nextEntityId++;
        this.type = type;
    }

    // TODO: typescript - commenting this out and seeing how much chaos it creates
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
     */
    // runtimeLookup : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
    //     return this;
    // }

    public abstract describe(sim: Simulation, rtConstruct: RuntimeConstruct) : Description;

    // TODO: does this belong here?
    public isLibraryConstruct() {
        return false
    }

    // TODO: does this belong here?
    public isLibraryUnsupported() {
        return false;
    }

    //TODO: function for isOdrUsed()?
};

export interface ObjectEntity<T extends Type = Type> extends CPPEntity<T> {
    public runtimeLookup(rtConstruct: ExecutableRuntimeConstruct) : CPPObject<T>;
}

export abstract class NamedEntity<T extends Type = Type> extends CPPEntity<T> {
    protected static _name = "NamedEntity";

    // public static linkage: "none", // TODO NEW make this abstract

    public readonly name: string;

    /**
     * All NamedEntitys will have a name, but in some cases this might be "". e.g. an unnamed namespace.
     */
    public constructor(type: Type, name: string) {
        super(type);
        this.name = name;
    }
}

export class DeclaredEntity<T extends Type = Type> extends NamedEntity<T> {
    protected static _name = "DeclaredEntity";

    /**
     * If neither entity is defined, does nothing.
     * If exactly one entity is defined, gives that definition to the other one as well.
     * If both entities are defined, throws an exception. If the entities are functions with
     * the same signature and different return types, throws an exception.
     * REQUIRES: Both entities should have the same type. (for functions, the same signature)
     * @param entity1 - An entity already present in a scope.
     * @param entity2 - A new entity matching the original one.
     * @throws {Note}
     */
    public static merge(entity1: DeclaredEntity, entity2: DeclaredEntity) {

        // TODO: Add support for "forward declarations" of a class/struct

        // Special case: ignore magic functions
        if (entity1 instanceof MagicFunctionEntity || entity2 instanceof MagicFunctionEntity) {
            return;
        }

        // Special case: if both are definitions for the same class, it's ok ONLY if they have exactly the same tokens
        if (entity1.decl instanceof ClassDeclaration && entity2.decl instanceof ClassDeclaration
            && entity1.type.className === entity2.type.className) {
            if (entity1.decl.isLibraryConstruct() && entity2.decl.isLibraryConstruct() !== undefined
                && entity1.decl.getLibraryId() === entity2.decl.getLibraryId() ||
                entity1.decl.hasSourceCode() && entity2.decl.hasSourceCode() &&
                entity1.decl.getSourceText().replace(/\s/g,'') === entity2.decl.getSourceText().replace(/\s/g,'')) {
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
        if (entity1.decl instanceof MemberDeclaration) {
            return;
        }
        if (entity1.decl instanceof FunctionDefinition && entity1.decl.isInlineMemberFunction) {
            return; // TODO: Should we be checking this?
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
            if (entity1 instanceof FunctionEntity) {
                // If they have mismatched return types, that's a problem.
                if (!entity1.type.sameReturnType(entity2.type)){
                    throw CPPError.link.func.returnTypesMatch([entity1.decl, entity2.decl], entity1.name);
                }
            }

            // If a previous declaration, and now a new definition, merge
            undefinedEntity.setDefinition(definedEntity.definition);
        }
    }

    public readonly declaration: Declaration;
    public readonly definition?: Declaration;
    public readonly initializer?: Initializer;

    public constructor(decl: Declaration) {
        super(decl.type, decl.name);
        this.declaration = decl;
    }

    public setDefinition(definition: Declaration) {
        (<Declaration>this.definition) = definition;
    }

    public isDefined() {
        return !!this.definition;
    }

    // TODO: when namespaces are implemented, need to fix this function
    public getFullyQualifiedName() {
        return "::" + this.name;
    }

    public isLibraryConstruct() {
        return this.decl.isLibraryConstruct();
    }

    public isLibraryUnsupported() {
        return this.decl.isLibraryUnsupported();
    }

    // TODO: these can be removed if declaration/definition classes are reworked such that
    //       the initializer can be easily retrieved from the definition. e.g. if multiple definitions
    //       from several declarators on a single line are actually treated as several definitions (as they
    //       really should be)
    public setInitializer(init: Initializer) {
        (<Initializer>this.initializer) = init;
    }
};

//TODO: rename to specifically for local references
export class ReferenceEntity<T extends Type = Type> extends DeclaredEntity<T> implements ObjectEntity<T> {
    protected static _name = "ReferenceEntity";
    // storage: "automatic", // TODO: is this correct? No. It's not, because references may not even require storage at all, but I'm not sure if taking it out will break something.

    public runtimeLookup(rtConstruct: ExecutableRuntimeConstruct) : CPPObject<T> {
        // TODO: revisit the non-null assertion below
        return rtConstruct.containingRuntimeFunction.stackFrame!.referenceLookup(this).refersTo;
    }

    public runtimeInstance(memory: Memory) {
        return new RuntimeReference(this, memory);
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) {
        if (this.decl instanceof Declarations.Parameter){
            return {message: "the reference parameter " + this.name};
        }
        else{
            return {message: "the reference " + this.name};
        }
    }
};

// TODO: determine what should actually be the base class here
// TODO: I think this should be an object?
// TOOD: I don't think this should be an object! Move to runtimeEnvironment.ts?
export class RuntimeReference<T extends Type = Type> {
    protected static readonly _name = "ReferenceEntityInstance";

    public readonly observable = new Observable(this);

    public readonly entity: ReferenceEntity<T>;
    public readonly refersTo: CPPObject<T>; // TODO: this needs to be initially bound to some fake object. Otherwise, Lobster will crash if simulated code looks up a reference before it is bound (tricky but possible).

    public constructor(entity: ReferenceEntity<T>, memory: Memory) {
        this.entity = entity;
        
        // Initially refers to a dead object at address 0
        this.refersTo = new AnonymousObject(this.entity.type, memory, 0);
    }

    public bindTo(refersTo: CPPObject) {
        (<typeof RuntimeReference.prototype.refersTo>this.refersTo) = refersTo;
        this.observable.send("bound");
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) {
        if (this.refersTo) {
            return {message: "the reference " + this.entity.name + " (which is bound to " + this.refersTo.describe().message + ")"};
        }
        else {
            return {message: "the reference " + this.entity.name + " (which has not yet been bound to an object)"};
        }
    }
};

export class StaticEntity<T extends Type = Type> extends DeclaredEntity<T> implements ObjectEntity<T> {
    protected static _name =  "StaticEntity";

    // storage: "static",
    constructor(decl: Declaration) {
        super(decl);
    }

    public objectInstance() {
        return new StaticObject(this);
    }

    public toString() {
        return this.name + " (" + this.type + ")";
    }

    public runtimeLookup(rtConstruct: ExecutableRuntimeConstruct) : StaticObject<T> {
        return rtConstruct.sim.memory.staticLookup(this);
    }
    
    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) {
        return {name: this.name, message: "the variable " + this.name};
    }
};

export class StringLiteralEntity extends CPPEntity<ArrayType> implements ObjectEntity<ArrayType> {
    protected static _name = "StringLiteralEntity";
    // storage: "static",

    public readonly str: string;

    public constructor(str: string) {
        super(Types.Array.instance(Types.Char.instance(true), str.length + 1)); // + 1 for null char
        this.str = str;
    }

    public objectInstance() {
        return new StringLiteralObject(this.type);
    }

    public toString() {
        return "string literal \"" + Util.unescapeString(this.str) + "\"";
    }

    public runtimeLookup(rtConstruct: ExecutableRuntimeConstruct) {
        return rtConstruct.sim.memory.getStringLiteral(this.str);
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) {
        return {message: "the string literal \"" + Util.unescapeString(this.str) + "\""};
    }
};


export class AutoEntity<T extends Type = Type> extends DeclaredEntity<T> implements ObjectEntity<T> {
    protected readonly _name = "AutoEntity";

    // storage: "automatic",
    
    public constructor(decl: Declaration) {
        super(decl);
    }

    public toString() {
        return this.name + " (" + this.type + ")";
    }

    public objectInstance() {
        return new AutoObject(this);
    }

    public runtimeLookup(rtConstruct: ExecutableRuntimeConstruct) : AutoObject<T> {
        // TODO: revisit the non-null assertion below
        return rtConstruct.containingRuntimeFunction.stackFrame!.getLocalObject(this);
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) {
        if (this.decl instanceof Declarations.Parameter){  // TODO: can this ever be a parameter??
            return {message: "the parameter " + this.name};
        }
        else{
            return {message: "the local variable " + this.name};
        }
    }
};

export class ParameterEntity<T extends Type = Type> extends CPPEntity<T> implements ObjectEntity<T> {
    protected readonly _name = "ParameterEntity";
    // storage: "automatic",

    public readonly num: number;

    public constructor(type: Type, num: number) {
        super(type);
        this.num = num;
    }

    public toString() {
        return "parameter " + this.num + " of the called function";
    }

    public runtimeLookup(rtConstruct: ExecutableRuntimeConstruct) {
        // Getting the function at runtime already takes care of polymorphism for virtual functions
        var func = rtConstruct.sim.topFunction();

        // Now we can look up object entity associated with this parameter
        var objEntity = func.model.params[this.num].entity;

        // Look it up in the context of the top function on the stack.
        return objEntity.runtimeLookup(sim, func);
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) {
        return {message: "parameter " + this.num + " of " + this.func.describe().message};
    }

};

export class ReturnEntity<T extends Type = Type> extends CPPEntity<T> implements ObjectEntity<T> {
    protected static _name = "ReturnEntity";

    // storage: "automatic",

    public toString() {
        return "return value (" + this.type + ")";
    }
    
    /**
     * REQUIRES: This function assumes the return object for the containing runtime function has already been set.
     * If this is return-by-value (i.e. non-reference type), that is the temporary return object for the currently
     * executing function. If it is return-by-reference, there is only a return object if the return has already been
     * processed and the returned object has been set. If so, this function returns that object, otherwise null.
     * If the return type is void, returns null.
     */
    public runtimeLookup(rtConstruct: ExecutableRuntimeConstruct) {
        // TODO: consider again the stuff that got commented. shouldn't it be the case that if a ReturnEntity exists, it's not a void function?
        // if (this.type instanceof Types.Void) {
        //     return null;
        // }
        // else {
            // TODO: revisit non-null assertion below
            return <CPPObject<T>>rtConstruct.containingRuntimeFunction.returnObject!;
        // }
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) {
        // TODO: add info about which function? would need to be specified when the return value is created
        return {message: "the return value"};
    }
};

export class ReceiverEntity extends CPPEntity<ClassType> implements ObjectEntity<ClassType> {
    protected static readonly _name: "ReceiverEntity";

    // storage: "automatic",
    
    constructor(type: T) {
        super(type);
    }

    public toString() {
        return "function receiver (" + this.type + ")";
    }

    public runtimeLookup(rtConstruct: ExecutableRuntimeConstruct) {
        return rtConstruct.contextualReceiver();
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct){
        if (rtConstruct){
            return {message: "the receiver of this call to " + rtConstruct.containingRuntimeFunction().describe().message + " (i.e. *this) "};
        }
        else {
            return {message: "the receiver of this call (i.e. *this)"};
        }
    }
};



export class NewObjectEntity<T extends Type = Type> extends CPPEntity<T> implements ObjectEntity<T> {
    protected static readonly _name = "NewObjectEntity";

    // storage: "automatic",
    
    public toString() {
        return "object (" + this.type + ")";
    }

    public runtimeLookup(rtConstruct: ExecutableRuntimeConstruct) {
        // no additional runtimeLookup() needed on the object since it will never be a reference
        return rtConstruct.getAllocatedObject();
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) {
        return {message: "the dynamically allocated object (of type "+this.type+") created by new"};
    }

};

export class ArraySubobjectEntity<T extends Type = Type> extends CPPEntity<T> implements ObjectEntity<T> {
    protected static readonly _name = "ArraySubobjectEntity";
    // storage: "none",

    public readonly arrayEntity: ObjectEntity<ArrayType<T>>;
    public readonly index: number;

    constructor(arrayEntity: ObjectEntity<ArrayType<T>>, index: number) {
        super(arrayEntity.type.elemType);
        this.arrayEntity = arrayEntity;
        this.index = index;
    }

    public runtimeLookup(rtConstruct: ExecutableRuntimeConstruct) {
        return this.arrayEntity.runtimeLookup(rtConstruct).getArrayElemSubobject(this.index);
    }


    // TODO: I don't think this ever gets used?
    public objectInstance(arrObj: CPPObject) {
        return new ArraySubobject(arrObj, this.index);
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) {
        let arrDesc = this.arrayEntity.describe(sim, rtConstruct);
        let desc : Description = {
            message: "element " + this.index + " of " + arrDesc.message
        };
        if (arrDesc.name){
            desc.name = arrDesc.name + "[" + this.index + "]";
        }
        return desc;
    }
}

export class BaseClassSubobjectEntity<T extends Type = Type> extends CPPEntity<T> {
    protected static readonly _name = "BaseClassSubobjectEntity";
    // storage: "none",

    public readonly access: string;
    public readonly memberOfType: Types.Class;

    constructor(type: Type, memberOfType: Types.Class, access: string) {
        super(type);
        this.memberOfType = memberOfType;
        this.access = access;
    }

    public toString() {
        return "the " + this.type.className + " base object of " + this.memberOfType.className;
    }

    public runtimeLookup(sim: Simulation, rtConstruct: RuntimeConstruct) {
        var recObj = rtConstruct.contextualReceiver();

        while(recObj && !(recObj.type instanceof this.type)){ // TODO: this isA should probably be changed to a type function
            recObj = recObj.type.getBaseClass() && recObj.i_baseSubobjects[0];
        }
        Util.assert(recObj, "Internal lookup failed to find subobject in class or base classes.");

        return recObj.runtimeLookup(sim, inst);
    }
    
    public objectInstance(parentObj: CPPObject) {
        return new BaseClassSubobject(this.type, parentObj);
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) {
        return {message: "the " + this.type.className + " base object of " + this.memberOfType.className};
    }
};

export class MemberSubobjectEntity<T extends Type = Type> extends DeclaredEntity<T> {
    protected static readonly _name = "MemberSubobjectEntity";
    // storage: "none",

    public readonly access: string;
    public readonly memberOfType: Types.Class;

    public constructor(decl: Declaration, memberOfType: Types.Class) {
        super(decl);
        this.memberOfType = memberOfType;
        this.access = decl.access;
    }

    public toString() {
        return this.name + " (" + this.type + ")";
    }

    public runtimeLookup(sim: Simulation, rtConstruct: RuntimeConstruct) {
        var recObj = rtConstruct.contextualReceiver();

        while(recObj && !recObj.type.similarType(this.memberOfType)) {
            recObj = recObj.type.getBaseClass() && recObj.i_baseSubobjects[0];
        }

        assert(recObj, "Internal lookup failed to find subobject in class or base classses.");

        return recObj.getMemberSubobject(this.name).runtimeLookup(sim, inst); // I think the lookup here is in case of reference members?
    }

    public objectInstance(parentObj: CPPObject) {
        return MemberSubobject.instance(this.type, parentObj, this.name);
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct){
        if (rtConstruct){
            var recObj = rtConstruct.contextualReceiver();
            if (recObj.name){
                return {message: recObj.name + "." + this.name};
            }
            else{
                return {message: "the member " + this.name + " of " + recObj.describe(sim, rtConstruct).message};
            }
        }
        else{
            return {
                name: this.memberOfType.className + "." + this.name,
                message: "the " + this.name + " member of the " + this.memberOfType.className + " class"
            };
        }
    }
}

export class TemporaryObjectEntity<T extends Type = Type> extends CPPEntity<T> {
    protected static readonly _name = "TemporaryObjectEntity";
    // storage: "temp",

    public readonly creator: CPPConstruct;
    public readonly owner: CPPConstruct;
    public readonly name: string;

    constructor(type: Type, creator: CPPConstruct, owner: CPPConstruct, name: string) {
        super(type);
        this.creator = creator;
        this.setOwner(owner);
        this.name = name; // TODO: change when I check over usages of .name and replace with description or something
    }

    public setOwner(newOwner: CPPConstruct) {
        if (newOwner === this.owner)
            if (this.owner){
                this.owner.removeTemporaryObject(this);
            }
        (<string>this.owner) = newOwner;
        this.owner.addTemporaryObject(this);
    }

    public updateOwner() {
        var newOwner = this.creator.findFullExpression();
        if (newOwner === this.owner){ return; }
        if (this.owner){
            this.owner.removeTemporaryObject(this);
        }
        (<string>this.owner) = newOwner;
        this.owner.addTemporaryObject(this);
    }

    public objectInstance(creatorRt: RuntimeConstruct){
        var obj = creatorRt.sim.memory.allocateTemporaryObject(this);

        var inst = creatorRt;
        while (inst.model !== this.owner){
            inst = inst.parent;
        }

        inst.temporaryObjects = inst.temporaryObjects || {};
        inst.temporaryObjects[obj.entityId] = obj;
        return obj;
    }

    public runtimeLookup(sim: Simulation, rtConstruct: RuntimeConstruct) {
        var ownerInst = rtConstruct;
        while (ownerInst.model !== this.owner){
            ownerInst = ownerInst.parent;
        }
        var tempObjInst = ownerInst.temporaryObjects[this.entityId];
        return tempObjInst && tempObjInst.runtimeLookup(sim, rtConstruct);
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) {
        return {message: this.name}; // TOOD: eventually change implementation when I remove name
    }

}

export class FunctionEntity extends DeclaredEntity<Types.FunctionType> {
    protected static readonly _name = "FunctionEntity";

    public readonly type!: Types.Function; // ! - Initialized by parent constructor

    public isStaticallyBound() {
        return true;
    }

    public get isVirtual() {// TODO: why do we have this for non-member functions as well?
        return false;
    }

    public toString() {
        return this.name;
    }

    public nameString() {
        return this.name;
    }

    public isLinked() {
        return this.isDefined();
    }

    // TODO: check on what this is here for
    public getPointerTo() {
        return new Value(this, this.type);
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) {
        return this.decl.describe(sim, rtConstruct);
    }
}

export class MagicFunctionEntity extends FunctionEntity {
    public constructor(decl: Declaration) {
        super(decl);
        this.setDefinition(decl);
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) {
        return {message: "no description available"};
    }
}


export class MemberFunctionEntity extends FunctionEntity {
    protected static readonly _name = "MemberFunctionEntity";

    public readonly containingClass: Types.Class;
    public readonly isVirtual: boolean;
    public readonly pureVirtual: boolean;

    constructor(decl: Declaration, containingClass: Types.Class, isVirtual: boolean) {
        super(decl);
        this.containingClass = containingClass;
        this.isVirtual = isVirtual;
        this.pureVirtual = decl.pureVirtual;
        // May also be set to virtual later if it's discovered to be an overrider
        // for a virtual function in a base class

        this.checkForOverride();
    }

    private checkForOverride() {
        if (!this.containingClass.getBaseClass()) {
            return;
        }

        // Find the nearest overrider of a hypothetical virtual function.
        // If any are virtual, this one would have already been set to be
        // also virtual by this same procedure, so checking this one is sufficient.
        // If we override any virtual function, this one is too.
        var overridden = this.containingClass.getBaseClass().classScope.singleLookup(this.name, {
            paramTypes: this.type.paramTypes, isThisConst: this.type.isThisConst,
            exactMatch:true, own:true, noNameHiding:true});

        if (overridden && overridden instanceof FunctionEntity && overridden.isVirtual){
            (<boolean>this.isVirtual) = true;
            // Check to make sure that the return types are covariant
            if (!covariantType(this.type.returnType, overridden.type.returnType)){
                throw SemanticExceptions.NonCovariantReturnTypes.instance(this, overridden);
            }
        }
    }

    public isStaticallyBound() {
        return !this.isVirtual;
    }

    public isLinked() {
        return this.virtual && this.pureVirtual || this.isDefined();
    }

    public runtimeLookup(sim: Simulation, rtConstruct: RuntimeConstruct) {
        if (this.isVirtual){
            // If it's a virtual function start from the class scope of the dynamic type
            var receiver = rtConstruct.contextualReceiver();
            Util.assert(receiver, "dynamic function lookup requires receiver");
            var dynamicType = receiver.type;

            // Sorry this is hacky :(
            // If it's a destructor, we look instead for the destructor of the dynamic type
            var func;
            if (this.definition instanceof DestructorDefinition) {
                func = dynamicType.destructor;
            }
            else{
                func = dynamicType.classScope.singleLookup(this.name, {
                    paramTypes: this.type.paramTypes, isThisConst: this.type.isThisConst,
                    exactMatch:true, own:true, noNameHiding:true});
            }
            Util.assert(func, "Failed to find virtual function implementation during lookup.");
            return func;
        }
        else{
            return this;
        }
    }

    public suppressedVirtualProxy() : MemberFunctionEntity {
        var proxy = Object.create(this);
        proxy.isVirtual = false;
        return proxy;
    }

};

export class ConstructorEntity extends MemberFunctionEntity {

}


export class PointedFunctionEntity extends CPPEntity {
    protected static readonly _name = "FunctionEntity";

    private readonly desc: string;

    constructor(type: Type) {
        super(type);
        this.desc = "Unknown function of type " + type;
    }

    public isStaticallyBound() {
        return true;
    }

    public toString() {
        return this.desc;
    }

    public runtimeLookup(sim: Simulation, rtConstruct: RuntimeConstruct) {
        return rtConstruct.pointedFunction.runtimeLookup(sim, rtConstruct);
    }

    public isLinked() {
        return true;
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) {
        return {message: "no description available"};
    }
}



export class TypeEntity extends DeclaredEntity {
    protected static readonly _name = "TypeEntity";

    public toString() {
        return "TypeEntity: " + this.type.instanceString();
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) {
        return this.type.describe(sim, rtConstruct);
    }
};

// Selects from candidates the function that is the best match
// for the arguments in the args array. Also modifies args so
// that each argument is amended with any implicit conversions
// necessary for the match.
// Options:
//   problems - an array that will be filled with an entry for each candidate
//              consisting of an array of any semantic problems that prevent it
//              from being chosen.

var convLen = function(args: Expression[]) {
    var total = 0;
    for (var i = 0; i < args.length; ++i) {
        total += args[i].conversionLength;
    }
    return total;
};

export function overloadResolution<T extends FunctionEntity>(candidates: T[], args: Expression[], isThisConst?: boolean = false, candidateProblems?: Note[]){
    // Find the constructor
    let viable = [];
    for(var c = 0; c < candidates.length; ++c){
        let cand = candidates[c];
        let tempArgs = [];
        var problems: Note[] = [];
        candidateProblems && candidateProblems.push(problems);

        // Check argument types against parameter types
        var paramTypes = cand.type.paramTypes;
        if (args.length !== paramTypes.length){
            problems.push(CPPError.param.numParams(cand.declaration));
        }
        else if (isThisConst && cand instanceof MemberFunctionEntity && !cand.type.isThisConst){
            problems.push(CPPError.param.thisConst(cand.declaration));
        }
        else{
            for(var i = 0; i < args.length; ++i){
                if (paramTypes[i] instanceof Types.Reference){
                    tempArgs.push(args[i]);
                    if(!Types.referenceCompatible(args[i].type, paramTypes[i].refTo)){
                        problems.push(CPPError.param.paramReferenceType(args[i], args[i].type, paramTypes[i]));
                    }
                    //else if (args[i].valueCategory !== "lvalue"){
                    //    problems.push(CPPError.param.paramReferenceLvalue(args[i]));
                    //}
                }
                else{
                    tempArgs.push(standardConversion(args[i], paramTypes[i]));
                    if(!Types.sameType(tempArgs[i].type, paramTypes[i])){
                        problems.push(CPPError.param.paramType(args[i], args[i].type, paramTypes[i]));
                    }

                }
            }
        }

        if (problems.length == 0) {
            viable.push({
                cand: cand,
                args: tempArgs
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
var fakeExpressionsFromTypes = function(types: Type[]) {
    var exprs = [];
    for (var i = 0; i < types.length; ++i){
        exprs[i] = Expressions.AuxiliaryExpression.instance(types[i]);
        // exprs[i] = {type: types[i], ast: null, valueCategory: "prvalue", context: {parent:null}, parent:null, conversionLength: 0};
    }
    return exprs;
};