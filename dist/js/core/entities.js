"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectOverloadedDefinition = exports.ClassEntity = exports.FunctionEntity = exports.TemporaryObjectEntity = exports.MemberReferenceEntity = exports.MemberObjectEntity = exports.MemberAccessEntity = exports.BaseSubobjectEntity = exports.DynamicLengthArrayNextElementEntity = exports.ArraySubobjectEntity = exports.NewArrayEntity = exports.NewObjectEntity = exports.ReceiverEntity = exports.PassByReferenceParameterEntity = exports.PassByValueParameterEntity = exports.ReturnByReferenceEntity = exports.ReturnObjectEntity = exports.GlobalObjectEntity = exports.LocalReferenceEntity = exports.LocalObjectEntity = exports.runtimeObjectLookup = exports.FunctionOverloadGroup = exports.NamedEntity = exports.areEntitiesSemanticallyEquivalent = exports.CPPEntity = exports.ClassScope = exports.NamespaceScope = exports.NamedScope = exports.BlockScope = exports.Scope = void 0;
const types_1 = require("./types");
const util_1 = require("../util/util");
const observe_1 = require("../util/observe");
const constructs_1 = require("./constructs");
const objects_1 = require("./objects");
const errors_1 = require("./errors");
class Scope {
    constructor(translationUnit, parent) {
        // private static HIDDEN = Symbol("HIDDEN");
        // private static NO_MATCH = Symbol("NO_MATCH");
        this.entities = {};
        this.hiddenClassEntities = {};
        this.typeEntities = {};
        this.children = {};
        // This assertion is no longer always true due to out-of-line function definitions
        // assert(!parent || translationUnit === parent.translationUnit);
        this.translationUnit = translationUnit;
        this.parent = parent;
    }
    addChild(child) {
        this.children[child.name] = child;
    }
    /** Attempts to declare a variable in this scope.
     * @param newEntity The variable being declared.
     * @returns Either the entity that was added, or an existing one already there, assuming it was compatible.
     * If an error prevents the entity being added successfully, returns the error instead. (e.g. A previous
     * declaration with the same name but a different type.)
     */
    declareVariableEntity(newEntity) {
        let entityName = newEntity.name;
        let existingEntity = this.entities[entityName];
        // No previous declaration for this name
        if (!existingEntity) {
            this.variableEntityCreated(newEntity);
            return this.entities[entityName] = newEntity;
        }
        // If there is an existing class entity, it may be displaced and effectively hidden.
        if (existingEntity.declarationKind === "class") {
            // Note: because a class entity cannot displace another class entity, we can
            // assume that there is no hidden class entity already
            this.hiddenClassEntities[entityName] = existingEntity;
            this.variableEntityCreated(newEntity);
            return this.entities[entityName] = newEntity;
        }
        // Previous declaration for this name, but different kind of symbol
        if (existingEntity.declarationKind !== "variable") {
            return errors_1.CPPError.declaration.symbol_mismatch(newEntity.firstDeclaration, newEntity);
        }
        // Previous declaration of variable with same name, attempt to merge
        let entityOrError = newEntity.mergeInto(existingEntity);
        // If we got the new entity back, it means it was added to the scope for the first time
        if (entityOrError === newEntity) {
            this.variableEntityCreated(newEntity);
        }
        // Cast below is based on trusting mergeInto will only ever return the
        // existing entity if the types and types of entities matched.
        return entityOrError;
    }
    variableEntityCreated(newEntity) {
        // Do nothing. Subclasses may choose to register entities.
        // e.g. Namespace scopes will register global object entities with linker.
    }
    /** Attempts to declare a function in this scope.
     * @param newEntity - The function being declared.
     * @returns Either the entity that was added, or an existing one already there, assuming it was compatible.
     * If an error prevents the entity being added successfully, returns the error instead. (e.g. A previous
     * function declaration with the same signature but a different return type.)
     */
    declareFunctionEntity(newEntity) {
        let entityName = newEntity.name;
        let existingEntity = this.entities[entityName];
        // No previous declaration for this name
        if (!existingEntity) {
            this.entities[entityName] = new FunctionOverloadGroup([newEntity]);
            // this.functionEntityCreated(newEntity);
            return newEntity;
        }
        // If there is an existing class entity, it may be displaced and effectively hidden.
        if (existingEntity.declarationKind === "class") {
            // Note: because a class entity cannot displace another class entity, we can
            // assume that there is no hidden class entity already
            this.hiddenClassEntities[entityName] = existingEntity;
            this.entities[entityName] = new FunctionOverloadGroup([newEntity]);
            // this.functionEntityCreated(newEntity);
            return newEntity;
        }
        // Previous declaration for this name, but different kind of symbol
        if (!(existingEntity instanceof FunctionOverloadGroup)) {
            return errors_1.CPPError.declaration.symbol_mismatch(newEntity.firstDeclaration, newEntity);
        }
        // Function overload group of previously existing functions, attempt to merge
        let entityOrError = newEntity.mergeInto(existingEntity);
        // If we got the new entity back, it means it was added to the scope for the first time
        // if (entityOrError === newEntity) {
        //     this.functionEntityCreated(newEntity);
        // }
        return entityOrError;
    }
    // protected functionEntityCreated(newEntity: FunctionEntity) {
    // }
    /** Attempts to declare a class in this scope. TODO docs: this documentation is out of date
     * @param newEntity - The class being declared.
     * @returns Either the entity that was added, or an existing one already there, assuming it was compatible.
     * If an error prevents the entity being added successfully. (e.g. An error due to
     * multiple definitions of the same class within a single translation unit.)
     */
    declareClassEntity(newEntity) {
        let entityName = newEntity.name;
        let existingEntity = this.entities[entityName];
        // No previous declaration for this name
        if (!existingEntity) {
            this.classEntityCreated(newEntity);
            return this.entities[entityName] = newEntity;
        }
        // Previous declaration for this name, but different kind of symbol
        if (!(existingEntity instanceof ClassEntity)) {
            return errors_1.CPPError.declaration.symbol_mismatch(newEntity.firstDeclaration, newEntity);
        }
        // Note that we don't displace existing class entities as new variables or functions do.
        // Instead, either the new/existing class entities are compatible (i.e. they do result in
        // a multiple definition error), or they will generate an error.
        // There was a previous class declaration, attempt to merge
        let entityOrError = newEntity.mergeInto(existingEntity);
        // If we got the new entity back, it means it was added to the scope for the first time
        if (entityOrError === newEntity) {
            this.classEntityCreated(newEntity);
        }
        return entityOrError;
    }
    classEntityCreated(newEntity) {
        // A function declaration has linkage. The linkage is presumed to be external, because Lobster does not
        // support using the static keyword or unnamed namespaces to specify internal linkage.
        // It has linkage regardless of whether this is a namespace scope or a block scope.
        newEntity.registerWithLinker();
    }
    // protected declaredEntityAdded(ent: DeclaredEntity) {
    // }
    // public singleLookup(name: string, options: NameLookupOptions) {
    //     var result = this.lookup(name, options);
    //     if (Array.isArray(result)){
    //         return result[0];
    //     }
    //     else{
    //         return result;
    //     }
    // }
    // public requiredLookup(name, options){
    //     return this.i_requiredLookupImpl(this.lookup(name, options), name, options);
    // }
    // private i_requiredLookupImpl(res, name, options) {
    //     options = options || {};
    //     if (!res){
    //         if (options.paramTypes || options.params){
    //             throw SemanticExceptions.NoMatch.instance(this, name,
    //                 options.paramTypes || options.params && options.params.map(function(p){return p.type;}),
    //                 options.isThisConst
    //             );
    //         }
    //         else{
    //             throw SemanticExceptions.NotFound.instance(this, name);
    //         }
    //     }
    //     else if(Array.isArray(res)){
    //         if (res === Scope.HIDDEN){
    //             throw SemanticExceptions.Hidden.instance(this, name,
    //                 options.paramTypes || options.params && options.params.map(function(p){return p.type;}),
    //                 options.isThisConst);
    //         }
    //         if (res.length === 0){
    //             throw SemanticExceptions.NoMatch.instance(this, name,
    //                 options.paramTypes || options.params && options.params.map(function(p){return p.type;}),
    //                 options.isThisConst
    //             );
    //         }
    //         if (res.length > 1){
    //             throw SemanticExceptions.Ambiguity.instance(this, name);
    //         }
    //         return res[0];
    //     }
    //     return res;
    // }
    /**
     * Performs unqualified name lookup of a given name in this scope. Returns the entity found, or undefined
     * if no entity can be found. Note that the entity found may be a function overload group. Lookup may
     * may search through parent scopes. The lookup process can be customized by providing a set of `NameLookupOptions` (
     * see documentation for the `NameLookupOptions` type for more details.) If the entity found is not a
     * function overload group, "normal" lookup is the same as "exact lookup" (the contextual parameter types
     * and receiver type are ignored at that point even if provided.)
     * @param name An unqualified name to be looked up.
     * @param options A set of options to customize the lookup process.
     * @returns
     */
    lookup(name, options = { kind: "normal" }) {
        options = options || {};
        util_1.assert(!name.includes("::"), "Qualified name used with unqualified lookup function.");
        // Note: We do not need to check this.hiddenClassEntities here. If a class entity
        // is hidden by another entity of the same name in the same scope, the only way to
        // access it is through an elaborated type specifier
        let ent = this.entities[name];
        // If we don't have an entity in this scope and we didn't specify we
        // wanted an own entity, look in parent scope (if there is one)
        if (!ent && !options.noParent && this.parent) {
            return this.parent.lookup(name, Object.assign({}, options));
        }
        // If we didn't find anything, return undefined
        if (!ent) {
            return undefined;
        }
        if (!(ent instanceof FunctionOverloadGroup)) {
            // If it's not an function overload group, it's a single entity so return it
            return ent;
        }
        else {
            let viable = ent.overloads; // a set of potentially viable function overloads
            // If we're looking for an exact match of parameter types
            if (options.kind === "exact") {
                const paramTypes = options.paramTypes;
                const receiverType = options.receiverType;
                viable = ent.overloads.filter((cand) => {
                    // Check that parameter types match
                    if (!cand.type.sameParamTypes(paramTypes))
                        if (receiverType) {
                            // if receiver type is defined, candidate must also have
                            // a receiver and the presence/absence of const must match
                            // NOTE: the actual receiver type does not need to match, just the constness
                            return cand.type.receiverType && receiverType.isConst === cand.type.isConst;
                        }
                        else {
                            // if no receiver type is defined, candidate must not have a receiver
                            return !cand.type.receiverType;
                        }
                    return cand.type.sameParamTypes(paramTypes);
                });
                if (viable.length > 0) {
                    return new FunctionOverloadGroup(viable);
                }
                else {
                    return undefined;
                }
            }
            // // If we're looking for something that could be called with given parameter types, including conversions
            // else if (options.paramTypes) {
            //     // var params = options.params || options.paramTypes && fakeExpressionsFromTypes(options.paramTypes);
            //     viable = overloadResolution(ent, options.paramTypes, options.receiverType).viable || [];
            //     return viable[0];
            //     // TODO - should give error if there's multiple elements i.e. an ambiguity
            // }
            return new FunctionOverloadGroup(viable);
            // // If viable is empty, not found.
            // if (viable && viable.length === 0){
            //     // Check to see if we could have found it except for name hiding
            //     if (!options.own && this.parent){
            //         var couldHave = this.parent.lookup(name, options);
            //         if (couldHave && (!Array.isArray(couldHave) || couldHave.length === 1 || couldHave === Scope.HIDDEN)){
            //             if (options.noNameHiding){
            //                 return couldHave;
            //             }
            //             else{
            //                 return Scope.HIDDEN;
            //             }
            //         }
            //     }
            //     return Scope.NO_MATCH;
            // }
            // else{
            //     return viable;
            // }
        }
    }
    availableVars() {
        let vars = [];
        Object.values(this.entities).forEach(entity => (entity === null || entity === void 0 ? void 0 : entity.declarationKind) === "variable" && vars.push(entity));
        return this.parent ? vars.concat(this.parent.availableVars()) : vars;
    }
}
exports.Scope = Scope;
class BlockScope extends Scope {
}
exports.BlockScope = BlockScope;
class NamedScope extends Scope {
    constructor(translationUnit, name, parent) {
        super(translationUnit, parent);
        this.name = name;
        if (parent) {
            parent.addChild(this);
        }
    }
}
exports.NamedScope = NamedScope;
class NamespaceScope extends NamedScope {
    constructor(translationUnit, name, parent) {
        super(translationUnit, name, parent);
    }
    variableEntityCreated(newEntity) {
        super.variableEntityCreated(newEntity);
        if (newEntity instanceof GlobalObjectEntity) {
            this.translationUnit.context.program.registerGlobalObjectEntity(newEntity);
        }
    }
}
exports.NamespaceScope = NamespaceScope;
class ClassScope extends NamedScope {
    /**
     *
     * @param translationUnit
     * @param name The unqualified name of the class
     * @param parent
     * @param base
     */
    constructor(translationUnit, name, parent, base) {
        super(translationUnit, name, parent);
        this.base = base;
    }
    createAlternateParentProxy(newParent) {
        let proxy = Object.create(this);
        proxy.parent = newParent;
        return proxy;
    }
    variableEntityCreated(newEntity) {
        super.variableEntityCreated(newEntity);
        // TODO: add linkage when static members are implemented
        // if (newEntity instanceof StaticMemberObjectEntity) {
        //     this.translationUnit.context.program.registerGlobalObjectEntity(newEntity);
        // }
    }
    /**
     * Performs unqualified name lookup of a given name in this class scope. The
     * behavior and customization options are similar to `lookup()` in the Scope
     * class, except that the base class scope (if it exists) will be searched
     * before parent scopes.
     * @param name An unqualified name to be looked up.
     * @param options A set of options to customize the lookup process.
     */
    lookup(name, options = { kind: "normal" }) {
        let ownMember = super.lookup(name, Object.assign({}, options, { noBase: true, noParent: true }));
        if (ownMember) {
            return ownMember;
        }
        let baseMember = this.base && !options.noBase && this.base.lookup(name, Object.assign({}, options, { noParent: true }));
        if (baseMember) {
            return baseMember;
        }
        let parentMember = this.parent && !options.noParent && this.parent.lookup(name, Object.assign({}, options, { noBase: true }));
        if (parentMember) {
            return parentMember;
        }
        // returns undefined
    }
}
exports.ClassScope = ClassScope;
class CPPEntity {
    /**
     * Most entities will have a natural type, but a few will not (e.g. namespaces). In this case,
     * I haven't decided what to do.
     * TODO: fix this - there should probably be a subtype or interface for a TypedEntity
     */
    constructor(type) {
        this.observable = new observe_1.Observable(this);
        this.entityId = CPPEntity._nextEntityId++;
        this.type = type;
    }
    // // TODO: does this belong here?
    // public isLibraryConstruct() {
    //     return false
    // }
    // // TODO: does this belong here?
    // public isLibraryUnsupported() {
    //     return false;
    // }
    //TODO: function for isOdrUsed()?
    isSemanticallyEquivalent(other, equivalenceContext) {
        return types_1.sameType(other.type, this.type);
        // TODO semantic equivalence
    }
}
exports.CPPEntity = CPPEntity;
CPPEntity._nextEntityId = 0;
function areEntitiesSemanticallyEquivalent(entity, other, equivalenceContext) {
    return !!(entity === other // also handles case of both undefined
        || entity && other && entity.isSemanticallyEquivalent(other, equivalenceContext));
}
exports.areEntitiesSemanticallyEquivalent = areEntitiesSemanticallyEquivalent;
class NamedEntity extends CPPEntity {
    /**
     * All NamedEntitys will have a name, but in some cases this might be "". e.g. an unnamed namespace.
     */
    constructor(type, name) {
        super(type);
        this.name = name;
    }
}
exports.NamedEntity = NamedEntity;
class DeclaredEntityBase extends NamedEntity {
    // TODO: not sure this should really be here as an abstract property?
    // public abstract readonly firstDeclaration: SimpleDeclaration | ParameterDeclaration | ClassDeclaration;
    // public abstract readonly declarations: readonly NonMemberSimpleDeclaration[] | readonly ParameterDefinition[] | readonly ClassDeclaration[];
    // public readonly definition?: SimpleDeclaration;
    constructor(type, name) {
        super(type, name);
    }
}
;
/**
 * Attempts to merge definitions. If neither entity is defined, does nothing and returns
 * the existing entity. If exactly one entity is defined, sets the definition for the
 * other one to match and returns the existing entity. If both are defined, this is an error
 * condition, so does nothing and returns false.
 * @param newEntity
 * @param existingEntity
 */
function mergeDefinitionInto(newEntity, existingEntity) {
    if (newEntity.definition && existingEntity.definition) {
        if (newEntity.definition === existingEntity.definition) {
            // literally the same definition, that's fine.
            return existingEntity;
        }
        else {
            // not literally same definition, so this is an error
            return undefined;
        }
    }
    // One of them may have a definition, if so copy it over
    if (newEntity.definition) {
        // we have a definition but they don't
        util_1.asMutable(existingEntity).definition = newEntity.definition;
    }
    else if (existingEntity.definition) {
        // they have a definition but we don't
        util_1.asMutable(newEntity).definition = existingEntity.definition;
    }
    return existingEntity;
}
class FunctionOverloadGroup {
    constructor(overloads) {
        this.declarationKind = "function";
        this.name = overloads[0].name;
        this.overloads = this._overloads = overloads.slice();
    }
    addOverload(overload) {
        this._overloads.push(overload);
    }
    /**
     * Selects a function from the given overload group based on the signature of
     * the provided function type. (Note there's no consideration of function names here.)
     * WARNING: This function does NOT perform overload resolution. For example, it does
     * not consider the possibility of implicit conversions, which is a part of full overload
     * resolution. It simply looks for an overload with a matching signature.
     */
    selectOverloadBySignature(type) {
        return this.overloads.find(func => type.sameSignature(func.type));
    }
}
exports.FunctionOverloadGroup = FunctionOverloadGroup;
function runtimeObjectLookup(entity, rtConstruct) {
    if (entity.variableKind === "object") {
        return entity.runtimeLookup(rtConstruct);
    }
    else if (entity.variableKind === "reference") {
        return entity.runtimeLookup(rtConstruct) || util_1.assertFalse("Attempted to look up a reference before it was bound.");
    }
    else {
        util_1.assertNever(entity);
    }
}
exports.runtimeObjectLookup = runtimeObjectLookup;
class VariableEntityBase extends DeclaredEntityBase {
    constructor() {
        super(...arguments);
        this.declarationKind = "variable";
    }
}
class LocalObjectEntity extends VariableEntityBase {
    constructor(type, def, isParameter = false) {
        super(type, def.name);
        this.variableKind = "object";
        this.variableLocation = "local";
        this.firstDeclaration = def;
        this.declarations = [def];
        this.definition = def;
        this.isParameter = isParameter;
    }
    toString() {
        return this.name + " (" + this.type + ")";
    }
    mergeInto(existingEntity) {
        // Redeclaration of local is never ok
        return errors_1.CPPError.declaration.prev_local(this.firstDeclaration, this.name);
    }
    runtimeLookup(rtConstruct) {
        // TODO: revisit the non-null assertion below
        return rtConstruct.containingRuntimeFunction.stackFrame.localObjectLookup(this);
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        return { name: this.name, message: `the ${this.isParameter ? "parameter" : "local variable"} ${this.name}` };
    }
}
exports.LocalObjectEntity = LocalObjectEntity;
;
class LocalReferenceEntity extends VariableEntityBase {
    constructor(type, def, isParameter = false) {
        super(type, def.name);
        this.variableKind = "reference";
        this.variableLocation = "local";
        this.name = def.name;
        this.firstDeclaration = def;
        this.declarations = [def];
        this.definition = def;
        this.isParameter = isParameter;
    }
    mergeInto(existingEntity) {
        // Redeclaration of local is never ok
        return errors_1.CPPError.declaration.prev_local(this.firstDeclaration, this.name);
    }
    bindTo(rtConstruct, obj) {
        rtConstruct.containingRuntimeFunction.stackFrame.bindLocalReference(this, obj);
    }
    runtimeLookup(rtConstruct) {
        // TODO: revisit the non-null assertions below
        return rtConstruct.containingRuntimeFunction.stackFrame.localReferenceLookup(this);
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        return { name: this.name, message: `the ${this.isParameter ? "reference parameter" : "reference"} ${this.name}` };
    }
}
exports.LocalReferenceEntity = LocalReferenceEntity;
;
class GlobalObjectEntity extends VariableEntityBase {
    // storage: "static",
    constructor(type, decl) {
        super(type, decl.name);
        this.variableKind = "object";
        this.variableLocation = "global";
        this.firstDeclaration = decl;
        this.declarations = [decl];
        // Note: this.definition is not set here because it is set later during the linking process.
        // Eventually, this constructor will take in a GlobalObjectDeclaration instead, but that would
        // require support for the extern keyword or static member variables (although that might be
        // a separate class entirely)
        this.qualifiedName = decl.qualifiedName;
    }
    toString() {
        return this.name + " (" + this.type + ")";
    }
    mergeInto(existingEntity) {
        var _a;
        if (!types_1.sameType(this.type, existingEntity.type)) {
            return errors_1.CPPError.declaration.type_mismatch(this.firstDeclaration, this, existingEntity);
        }
        return (_a = mergeDefinitionInto(this, existingEntity)) !== null && _a !== void 0 ? _a : errors_1.CPPError.declaration.variable.multiple_def(this.definition, existingEntity.definition);
    }
    registerWithLinker() {
        this.firstDeclaration.context.translationUnit.program.registerGlobalObjectEntity(this);
    }
    link(def) {
        util_1.assert(!this.definition, "link() should not be called for an entity that is already defined.");
        if (def) {
            this.definition = def;
        }
        else {
            this.declarations.forEach((decl) => decl.addNote(errors_1.CPPError.link.def_not_found(decl, this)));
        }
    }
    runtimeLookup(rtConstruct) {
        return rtConstruct.sim.memory.staticLookup(this);
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        return { name: this.name, message: "the variable " + this.name };
    }
}
exports.GlobalObjectEntity = GlobalObjectEntity;
;
// TODO: implement global references
// export class GlobalReferenceEntity<T extends ObjectType = ObjectType> extends DeclaredEntity<T> implements BoundReferenceEntity<T>, UnboundReferenceEntity<T> {
//     public bindTo(rtConstruct : RuntimeConstruct, obj: CPPObject<T>) {
//         rtConstruct.containingRuntimeFunction.stackFrame!.bindReference(this, obj);
//     }
//     public runtimeLookup(rtConstruct: RuntimeConstruct) : CPPObject<T> {
//         // TODO: revisit the non-null assertion below
//         return rtConstruct.containingRuntimeFunction.stackFrame!.referenceLookup(this);
//     }
//     public describe() {
//         if (this.decl instanceof Declarations.Parameter){
//             return {message: "the reference parameter " + this.name};
//         }
//         else{
//             return {message: "the reference " + this.name};
//         }
//     }
// };
/**
 * Looking this entity up at runtime yields the return object of the containing runtime function.
 * Note this is generally only something you would want in the context of a return-by-value
 * function, in which case the return object is a temporary object created to eventually be initialized
 * with the returned value. In a pass-by-reference function, the return object will only exist once the
 * return has been processed and it is set to the returned object. In void function, there is no return
 * object.
 * @throws Throws an exception if the return object does not exist.
 */
class ReturnObjectEntity extends CPPEntity {
    constructor() {
        super(...arguments);
        this.variableKind = "object";
    }
    runtimeLookup(rtConstruct) {
        let returnObject = rtConstruct.containingRuntimeFunction.returnObject;
        if (!returnObject) {
            throw "Error: Runtime lookup performed for the return object of a function, but the return object does not currently exist.";
        }
        return returnObject;
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        // TODO: add info about which function? would need to be specified when the return value is created
        return { name: "[return]", message: "the return object" };
    }
}
exports.ReturnObjectEntity = ReturnObjectEntity;
;
class ReturnByReferenceEntity extends CPPEntity {
    bindTo(rtConstruct, obj) {
        // Assume a ReturnByReferenceEntity will only be bound in the context of a return
        // for a return-by-reference function, thus the cast
        let func = rtConstruct.containingRuntimeFunction;
        func.setReturnObject(obj);
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        // TODO: add info about which function? would need to be specified when the return value is created
        return { name: "[&return]", message: "the object returned by reference" };
    }
}
exports.ReturnByReferenceEntity = ReturnByReferenceEntity;
;
// TODO: determine what should actually be the base class here
// TODO: I think this should be an object?
// TODO: I don't think this should be an object! Move to runtimeEnvironment.ts?
// TODO: Is this needed? Can wherever uses it just keep track of the actual objects?
// export class RuntimeReference<T extends ObjectType = ObjectType> {
//     public readonly observable = new Observable(this);
//     public readonly entity: BoundReferenceEntity<T>;
//     public readonly refersTo: CPPObject<T>;
//     public constructor(entity: BoundReferenceEntity<T>, refersTo: CPPObject<T>) {
//         this.entity = entity;
//         this.refersTo = refersTo;
//         // Initially refers to a dead object at address 0
//         // TODO: this is a bad idea, so I removed it
//         // this.refersTo = new AnonymousObject(this.entity.type, memory, 0);
//     }
//     // public bindTo(refersTo: CPPObject) {
//     //     (<typeof RuntimeReference.prototype.refersTo>this.refersTo) = refersTo;
//     //     this.observable.send("bound");
//     // }
//     public describe() {
//         if (this.refersTo) {
//             return {message: "the reference " + this.entity.name + " (which is bound to " + this.refersTo.describe().message + ")"};
//         }
//         else {
//             return {message: "the reference " + this.entity.name + " (which has not yet been bound to an object)"};
//         }
//     }
// };
// TODO: will need to add a class for ReferenceParameterEntity
class PassByValueParameterEntity extends CPPEntity {
    constructor(calledFunction, type, num) {
        super(type);
        this.variableKind = "object";
        this.calledFunction = calledFunction;
        this.type = type;
        this.num = num;
        util_1.assert(types_1.sameType(calledFunction.type.paramTypes[num], type), "Inconsistent type for parameter entity.");
    }
    runtimeLookup(rtConstruct) {
        var _a;
        let pendingCalledFunction = (_a = rtConstruct.sim.memory.stack.topFrame()) === null || _a === void 0 ? void 0 : _a.func;
        util_1.assert(pendingCalledFunction);
        util_1.assert(pendingCalledFunction.model === this.calledFunction.definition);
        let paramObj = pendingCalledFunction.getParameterObject(this.num);
        util_1.assert(types_1.sameType(paramObj.type, this.type));
        return paramObj;
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        let definition = this.calledFunction.definition;
        if (definition) {
            return definition.parameters[this.num].declaredEntity.describe();
        }
        else {
            return { name: `Parameter #${this.num + 1}`, message: `Parameter #${this.num + 1} of the called function` };
        }
    }
}
exports.PassByValueParameterEntity = PassByValueParameterEntity;
;
class PassByReferenceParameterEntity extends CPPEntity {
    constructor(calledFunction, type, num) {
        super(type);
        this.calledFunction = calledFunction;
        this.num = num;
        util_1.assert(types_1.sameType(calledFunction.type.paramTypes[num], type), "Inconsistent type for parameter entity.");
    }
    bindTo(rtConstruct, obj) {
        var _a;
        let pendingCalledFunction = (_a = rtConstruct.sim.memory.stack.topFrame()) === null || _a === void 0 ? void 0 : _a.func;
        util_1.assert(pendingCalledFunction);
        util_1.assert(pendingCalledFunction.model === this.calledFunction.definition);
        pendingCalledFunction.bindReferenceParameter(this.num, obj);
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        let definition = this.calledFunction.definition;
        if (definition) {
            return definition.parameters[this.num].declaredEntity.describe();
        }
        else {
            return { name: `Parameter #${this.num + 1}`, message: `Parameter #${this.num + 1} of the called function` };
        }
    }
}
exports.PassByReferenceParameterEntity = PassByReferenceParameterEntity;
;
class ReceiverEntity extends CPPEntity {
    constructor(type) {
        super(type);
        this.variableKind = "object";
    }
    toString() {
        return "function receiver (" + this.type + ")";
    }
    runtimeLookup(rtConstruct) {
        return rtConstruct.contextualReceiver;
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        // if (rtConstruct){
        //     return {message: "the receiver of this call to " + rtConstruct.containingRuntimeFunction().describe().message + " (i.e. *this) "};
        // }
        // else {
        return { name: "*this", message: "the receiver of this call (i.e. *this)" };
        // }
    }
}
exports.ReceiverEntity = ReceiverEntity;
;
class NewObjectEntity extends CPPEntity {
    constructor() {
        super(...arguments);
        this.variableKind = "object";
    }
    runtimeLookup(rtConstruct) {
        // no additional runtimeLookup() needed on the object since it will never be a reference
        while (rtConstruct.model.construct_type !== "new_expression" && rtConstruct.parent) {
            rtConstruct = rtConstruct.parent;
        }
        util_1.assert(rtConstruct.model.construct_type === "new_expression");
        let newRtConstruct = rtConstruct;
        util_1.assert(newRtConstruct.allocatedObject);
        return newRtConstruct.allocatedObject;
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        return { name: "a new heap object", message: "the dynamically allocated object (of type " + this.type + ") created by new" };
    }
}
exports.NewObjectEntity = NewObjectEntity;
;
class NewArrayEntity extends CPPEntity {
    constructor() {
        super(...arguments);
        this.variableKind = "object";
    }
    runtimeLookup(rtConstruct) {
        while (rtConstruct.model.construct_type !== "new_array_expression" && rtConstruct.parent) {
            rtConstruct = rtConstruct.parent;
        }
        util_1.assert(rtConstruct.model.construct_type === "new_array_expression");
        let newRtConstruct = rtConstruct;
        return newRtConstruct.allocatedObject;
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        return { name: "a new dynamically sized array", message: "the dynamically allocated/sized array (of element type " + this.type + ") created by new" };
    }
}
exports.NewArrayEntity = NewArrayEntity;
;
class ArraySubobjectEntity extends CPPEntity {
    constructor(arrayEntity, index) {
        super(arrayEntity.type.elemType);
        this.variableKind = "object";
        this.arrayEntity = arrayEntity;
        this.index = index;
    }
    runtimeLookup(rtConstruct) {
        return this.arrayEntity.runtimeLookup(rtConstruct).getArrayElemSubobject(this.index);
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        let arrDesc = this.arrayEntity.describe();
        return {
            name: arrDesc.name + "[" + this.index + "]",
            message: "element " + this.index + " of " + arrDesc.message
        };
    }
}
exports.ArraySubobjectEntity = ArraySubobjectEntity;
class DynamicLengthArrayNextElementEntity extends CPPEntity {
    constructor(arrayEntity) {
        super(arrayEntity.type.elemType);
        this.variableKind = "object";
        this.arrayEntity = arrayEntity;
    }
    runtimeLookup(rtConstruct) {
        while (rtConstruct.model.construct_type !== "new_array_expression" && rtConstruct.parent) {
            rtConstruct = rtConstruct.parent;
        }
        util_1.assert(rtConstruct.model.construct_type === "new_array_expression");
        let newRtConstruct = rtConstruct;
        return newRtConstruct.nextElemToInit;
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        let arrDesc = this.arrayEntity.describe();
        return {
            name: arrDesc.name + "[?]",
            message: "the next element of " + arrDesc.message + " to be initialized"
        };
    }
}
exports.DynamicLengthArrayNextElementEntity = DynamicLengthArrayNextElementEntity;
class BaseSubobjectEntity extends CPPEntity {
    constructor(containingEntity, type) {
        var _a;
        super(type);
        this.variableKind = "object";
        this.containingEntity = containingEntity;
        // This should always be true as long as we don't allow multiple inheritance
        util_1.assert((_a = this.containingEntity.type.classDefinition.baseType) === null || _a === void 0 ? void 0 : _a.similarType(type));
    }
    runtimeLookup(rtConstruct) {
        return this.containingEntity.runtimeLookup(rtConstruct).getBaseSubobject();
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        return {
            name: "the " + this.type.className + " base class of " + this.containingEntity.describe().name,
            message: "the " + this.type.className + " base class subobject of " + this.containingEntity.describe()
        };
    }
}
exports.BaseSubobjectEntity = BaseSubobjectEntity;
class MemberAccessEntity extends CPPEntity {
    constructor(containingEntity, type, name) {
        super(type);
        this.variableKind = "object";
        this.containingEntity = containingEntity;
        this.name = name;
    }
    runtimeLookup(rtConstruct) {
        // Cast below should be <CPPObject<T>>, NOT MemberSubobject<T>.
        // See return type and documentation for getMemberSubobject()
        return this.containingEntity.runtimeLookup(rtConstruct).getMemberObject(this.name);
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        let containingObjectDesc = this.containingEntity.describe();
        return {
            name: containingObjectDesc.name + "." + this.name,
            message: "the " + this.name + " member of " + containingObjectDesc.message
        };
    }
}
exports.MemberAccessEntity = MemberAccessEntity;
// export class BaseClassEntity extends CPPEntity<ClassType> implements ObjectEntity<ClassType> {
//     protected static readonly _name = "BaseClassEntity";
//     // storage: "none",
//     public readonly access: string;
//     public readonly memberOfType: ClassType;
//     constructor(type: ClassType, memberOfType: ClassType, access: string) {
//         super(type);
//         this.memberOfType = memberOfType;
//         this.access = access;
//     }
//     public toString() {
//         return "the " + this.type.className + " base object of " + this.memberOfType.className;
//     }
//     public runtimeLookup(rtConstruct: RuntimeConstruct) {
//         var recObj = rtConstruct.contextualReceiver();
//         while(recObj && !(recObj.type instanceof this.type)){ // TODO: this isA should probably be changed to a type function
//             recObj = recObj.type.getBaseClass() && recObj.i_baseSubobjects[0];
//         }
//         Util.assert(recObj, "Internal lookup failed to find subobject in class or base classes.");
//         return recObj;
//     }
//     public objectInstance(parentObj: CPPObject<ClassType>, memory: Memory, address: number) {
//         return new BaseSubobject(parentObj, this.type, memory, address);
//     }
//     public describe() {
//         return {message: "the " + this.type.className + " base object of " + this.memberOfType.className};
//     }
// };
class MemberVariableEntityBase extends VariableEntityBase {
    constructor(type, decl) {
        super(type, decl.name);
        this.variableLocation = "member";
        this.firstDeclaration = decl;
        this.declarations = [decl];
    }
    toString() {
        return this.name + " (" + this.type + ")";
    }
    mergeInto(existingEntity) {
        // Redeclaration of member variable is never ok
        return errors_1.CPPError.declaration.prev_member(this.firstDeclaration, this.name);
    }
    describe() {
        return { name: this.name, message: `the member ${this.name}` };
        // if (rtConstruct){
        //     var recObj = rtConstruct.contextualReceiver();
        //     if (recObj.name){
        //         return {message: recObj.name + "." + this.name};
        //     }
        //     else{
        //         return {message: "the member " + this.name + " of " + recObj.describe().message};
        //     }
        // }
        // else{
        //     return {
        //         name: this.memberOfType.className + "." + this.name,
        //         message: "the " + this.name + " member of the " + this.memberOfType.className + " class"
        //     };
        // }
    }
}
;
class MemberObjectEntity extends MemberVariableEntityBase {
    constructor() {
        super(...arguments);
        this.variableKind = "object";
    }
    runtimeLookup(rtConstruct) {
        // Cast below should be <CPPObject<T>>, NOT MemberSubobject<T>.
        // See return type and documentation for getMemberObject()
        return rtConstruct.contextualReceiver.getMemberObject(this.name);
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
}
exports.MemberObjectEntity = MemberObjectEntity;
class MemberReferenceEntity extends MemberVariableEntityBase {
    constructor() {
        super(...arguments);
        this.variableKind = "reference";
    }
    runtimeLookup(rtConstruct) {
        // Cast below should be <CPPObject<T>>, NOT MemberSubobject<T>.
        // See return type and documentation for getMemberObject()
        return rtConstruct.contextualReceiver.getMemberObject(this.name);
    }
    bindTo(rtConstruct, obj) {
        rtConstruct.contextualReceiver.bindMemberReference(this.name, obj);
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
}
exports.MemberReferenceEntity = MemberReferenceEntity;
;
class TemporaryObjectEntity extends CPPEntity {
    constructor(type, creator, owner, name) {
        super(type);
        this.variableKind = "object";
        this.creator = creator;
        this.owner = owner;
        this.name = name;
    }
    setOwner(newOwner) {
        this.owner = newOwner;
    }
    objectInstance(creatorRt) {
        let objInst = creatorRt.sim.memory.allocateTemporaryObject(this);
        let owner = creatorRt.containingFullExpression;
        owner.temporaryObjects[this.entityId] = objInst;
        return objInst;
    }
    runtimeLookup(rtConstruct) {
        // Some hacky casts and assertions in this implementation
        // if (!(rtConstruct instanceof RuntimePotentialFullExpression)) { // removed since it causes an issue with a circular import dependency
        //     return assertFalse();
        // }
        return rtConstruct.containingFullExpression.temporaryObjects[this.entityId];
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        return { name: this.name, message: this.name }; // TOOD: eventually change implementation when I remove name
    }
}
exports.TemporaryObjectEntity = TemporaryObjectEntity;
TemporaryObjectEntity._name = "TemporaryObjectEntity";
let FE_overrideID = 0;
class FunctionEntity extends DeclaredEntityBase {
    // storage: "static",
    constructor(type, decl) {
        super(type, decl.name);
        this.declarationKind = "function";
        this.isOdrUsed = false;
        this.overriders = {};
        this.firstDeclaration = decl;
        this.declarations = [decl];
        this.isMemberFunction = decl.isMemberFunction;
        this.isVirtual = decl.isVirtual;
        this.isPureVirtual = false;
        this.isConstructor = decl.isConstructor;
        this.isDestructor = decl.isDestructor;
        this.qualifiedName = decl.qualifiedName;
        this.isImplicit = !!decl.context.implicit;
        this.isUserDefined = !decl.context.implicit;
        this.overrideID = FE_overrideID++;
        if (this.isMemberFunction) {
            util_1.assert(constructs_1.isClassContext(decl.context));
            this.overriders[decl.context.containingClass.qualifiedName.str] = this;
        }
    }
    addDeclaration(decl) {
        util_1.asMutable(this.declarations).push(decl);
    }
    addDeclarations(decls) {
        decls.forEach((decl) => util_1.asMutable(this.declarations).push(decl));
    }
    toString() {
        return this.name;
    }
    registerOverrider(containingClass, overrider) {
        var _a;
        this.overriders[containingClass.qualifiedName.str] = overrider;
        (_a = this.overrideTarget) === null || _a === void 0 ? void 0 : _a.registerOverrider(containingClass, overrider);
    }
    setOverrideTarget(target) {
        util_1.assert(!this.overrideTarget, "A single FunctionEntity may not have multiple override targets.");
        util_1.asMutable(this).overrideTarget = target;
    }
    // private checkForOverride(baseClass: ClassDefinition) {
    //     baseClass.memberFunctionEntities.forEach(func => {
    //         if (func.type.sameSignature(this.type)) {
    //             func.registerOverrider(this);
    //         }
    //     })
    //     // Find the nearest overrider of a hypothetical virtual function.
    //     // If any are virtual, this one would have already been set to be
    //     // also virtual by this same procedure, so checking this one is sufficient.
    //     // If we override any virtual function, this one is too.
    //     var overridden = this.containingClass.getBaseClass().classScope.singleLookup(this.name, {
    //         paramTypes: this.type.paramTypes, isThisConst: this.type.isThisConst,
    //         exactMatch:true, own:true, noNameHiding:true});
    //     if (overridden && overridden instanceof FunctionEntity && overridden.isVirtual){
    //         (<boolean>this.isVirtual) = true;
    //         // Check to make sure that the return types are covariant
    //         if (!covariantType(this.type.returnType, overridden.type.returnType)){
    //             throw SemanticExceptions.NonCovariantReturnTypes.instance(this, overridden);
    //         }
    //     }
    // }
    mergeInto(overloadGroup) {
        var _a;
        //check each other function found
        let matchingFunction = overloadGroup.selectOverloadBySignature(this.type);
        if (!matchingFunction) {
            // If none were found with the same signature, this is a new overload, so go ahead and add it
            overloadGroup.addOverload(this);
            return this;
        }
        // If they have mismatched return types, that's a problem.
        if (!this.type.sameReturnType(matchingFunction.type)) {
            return errors_1.CPPError.declaration.func.returnTypesMatch([this.firstDeclaration, matchingFunction.firstDeclaration], this.name);
        }
        // As a sanity check, make sure they're the same type.
        // But this should already be true, given that they have the same signature and return type.
        if (!types_1.sameType(this.type, matchingFunction.type)) {
            return errors_1.CPPError.declaration.type_mismatch(this.firstDeclaration, this, matchingFunction);
        }
        matchingFunction.addDeclarations(this.declarations);
        return (_a = mergeDefinitionInto(this, matchingFunction)) !== null && _a !== void 0 ? _a : errors_1.CPPError.declaration.func.multiple_def(this.definition, matchingFunction.definition);
    }
    setDefinition(def) {
        if (!this.definition) {
            this.definition = def;
        }
        else {
            def.addNote(errors_1.CPPError.declaration.func.multiple_def(def, this.definition));
        }
    }
    registerWithLinker() {
        this.firstDeclaration.context.program.registerFunctionEntity(this);
    }
    link(def) {
        util_1.assert(!this.definition, "link() should not be called for an entity that is already defined.");
        if (def) {
            // found an overload group of function definitions, check for one
            // with matching signature to the given linked entity
            let overload = selectOverloadedDefinition(def.definitions, this.type);
            if (!overload) {
                if (this.isOdrUsed) {
                    this.declarations.forEach((decl) => decl.addNote(errors_1.CPPError.link.func.no_matching_overload(decl, this)));
                }
                return;
            }
            // check return type
            if (!this.type.sameReturnType(overload.declaration.type)) {
                this.declarations.forEach((decl) => decl.addNote(errors_1.CPPError.link.func.returnTypesMatch(decl, this)));
                return;
            }
            this.definition = overload;
        }
        else {
            if (this.isMemberFunction && this.isVirtual && !this.isPureVirtual) {
                // All (non-pure) virtual functions must have a definition
                this.declarations.forEach((decl) => decl.addNote(errors_1.CPPError.link.func.virtual_def_required(decl, this)));
            }
            else if (this.isOdrUsed) {
                // Functions that are ODR-used must have a definition
                this.declarations.forEach((decl) => decl.addNote(errors_1.CPPError.link.func.def_not_found(decl, this)));
            }
            // Otherwise, it's ok for the function to not have a definition because it is never used
        }
    }
    isMain() {
        return this.qualifiedName.str === "main";
    }
    getDynamicallyBoundFunction(receiver) {
        if (!this.isVirtual) {
            util_1.assert(this.definition, "non virtual function must have a definition!");
            return this.definition;
        }
        else {
            util_1.assert(receiver, "virtual function dynamic binding requires a receiver");
            while (receiver instanceof objects_1.BaseSubobject) {
                receiver = receiver.containingObject;
            }
            let dynamicType = receiver.type;
            let finalOverrider;
            while (!finalOverrider && dynamicType) {
                finalOverrider = this.overriders[dynamicType.qualifiedName.str];
                dynamicType = dynamicType.classDefinition.baseType;
            }
            return (finalOverrider === null || finalOverrider === void 0 ? void 0 : finalOverrider.definition) || this.definition;
        }
    }
    registerCall(call) {
        this.isOdrUsed = true;
    }
    returnsVoid() {
        return this.type.returnType.isVoidType();
    }
    returnsCompleteType() {
        return this.type.returnType.isCompleteReturnType();
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        return {
            name: this.name,
            message: `the ${this.name} function`
        };
    }
}
exports.FunctionEntity = FunctionEntity;
class ClassEntity extends DeclaredEntityBase {
    constructor(decl) {
        // Ask the type system for the appropriate type.
        // Because Lobster only supports mechanisms for class declaration that yield
        // classes with external linkage, it is sufficient to use the fully qualified
        // class name to distinguish types from each other.
        super(types_1.createClassType(decl.name, decl.qualifiedName), decl.name);
        this.declarationKind = "class";
        this.firstDeclaration = decl;
        this.declarations = [decl];
        this.qualifiedName = decl.qualifiedName;
    }
    isComplete() {
        return !!this.definition && this.type.isCompleteClassType();
    }
    toString() {
        return this.name;
    }
    addDeclaration(decl) {
        util_1.asMutable(this.declarations).push(decl);
    }
    addDeclarations(decls) {
        decls.forEach((decl) => util_1.asMutable(this.declarations).push(decl));
    }
    /**
     * Merge this class entity into a previous existing class entity.
     * If exactly one of the entities has a definition, the other one assumes
     * that definition as well. If both have a definition, an error is returned
     * unless the two are literally the same definition. (Note that an error
     * is thrown in the case of separate definitions with the same exact source
     * tokens, because the use of `mergeInto` means these definitions occur in the
     * same translation unit, which is prohibited.)
     * @param existingEntity
     */
    mergeInto(existingEntity) {
        var _a;
        existingEntity.addDeclarations(this.declarations);
        return (_a = mergeDefinitionInto(this, existingEntity)) !== null && _a !== void 0 ? _a : errors_1.CPPError.declaration.classes.multiple_def(this.definition, existingEntity.definition);
    }
    setDefinition(def) {
        if (!this.definition) {
            this.definition = def;
            this.type.setDefinition(def);
        }
        else {
            def.addNote(errors_1.CPPError.declaration.classes.multiple_def(def, this.definition));
        }
    }
    registerWithLinker() {
        this.firstDeclaration.context.translationUnit.program.registerClassEntity(this);
    }
    link(def) {
        util_1.assert(!this.definition, "link() should not be called for an entity that is already defined.");
        if (def) {
            this.setDefinition(def);
        }
        else {
            this.declarations.forEach((decl) => decl.addNote(errors_1.CPPError.link.classes.def_not_found(decl, this)));
        }
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        return {
            name: this.name,
            message: `the ${this.name} function`
        };
    }
}
exports.ClassEntity = ClassEntity;
// export class MagicFunctionEntity extends FunctionEntity {
//     public constructor(decl: SimpleDeclaration) {
//         super(decl);
//         this.setDefinition(decl);
//     }
//     public describe() {
//         return {message: "no description available"};
//     }
// }
// export class MemberFunctionEntity extends FunctionEntity {
//     public readonly containingClass: Types.Class;
//     public readonly isVirtual: boolean;
//     public readonly pureVirtual: boolean;
//     constructor(decl: SimpleDeclaration, containingClass: Types.Class, isVirtual: boolean) {
//         super(decl);
//         this.containingClass = containingClass;
//         this.isVirtual = isVirtual;
//         this.pureVirtual = decl.pureVirtual;
//         // May also be set to virtual later if it's discovered to be an overrider
//         // for a virtual function in a base class
//         this.checkForOverride();
//     }
//     public isStaticallyBound() {
//         return !this.isVirtual;
//     }
//     public isLinked() {
//         return this.virtual && this.pureVirtual || this.isDefined();
//     }
//     public runtimeLookup(sim: Simulation, rtConstruct: RuntimeConstruct) {
//         if (this.isVirtual){
//             // If it's a virtual function start from the class scope of the dynamic type
//             var receiver = rtConstruct.contextualReceiver();
//             Util.assert(receiver, "dynamic function lookup requires receiver");
//             var dynamicType = receiver.type;
//             // Sorry this is hacky :(
//             // If it's a destructor, we look instead for the destructor of the dynamic type
//             var func;
//             if (this.definition instanceof DestructorDefinition) {
//                 func = dynamicType.destructor;
//             }
//             else{
//                 func = dynamicType.classScope.singleLookup(this.name, {
//                     paramTypes: this.type.paramTypes, isThisConst: this.type.isThisConst,
//                     exactMatch:true, own:true, noNameHiding:true});
//             }
//             Util.assert(func, "Failed to find virtual function implementation during lookup.");
//             return func;
//         }
//         else{
//             return this;
//         }
//     }
//     public suppressedVirtualProxy() : MemberFunctionEntity {
//         var proxy = Object.create(this);
//         proxy.isVirtual = false;
//         return proxy;
//     }
// };
// export class ConstructorEntity extends MemberFunctionEntity {
// }
// export class PointedFunctionEntity extends CPPEntity {
//     protected static readonly _name = "FunctionEntity";
//     private readonly desc: string;
//     constructor(type: Type) {
//         super(type);
//         this.desc = "Unknown function of type " + type;
//     }
//     public isStaticallyBound() {
//         return true;
//     }
//     public toString() {
//         return this.desc;
//     }
//     public runtimeLookup(sim: Simulation, rtConstruct: RuntimeConstruct) {
//         return rtConstruct.pointedFunction.runtimeLookup(sim, rtConstruct);
//     }
//     public isLinked() {
//         return true;
//     }
//     public describe() {
//         return {message: "no description available"};
//     }
// }
// export class TypeEntity extends DeclaredEntity {
//     protected static readonly _name = "TypeEntity";
//     public toString() {
//         return "TypeEntity: " + this.type.instanceString();
//     }
//     public describe() {
//         return this.type.describe();
//     }
// };
function convLen(args) {
    return args.reduce((res, exp) => res + exp.conversionLength, 0);
}
;
// Selects from candidates the function that is the best match
// for the arguments in the args array. Also modifies args so
// that each argument is amended with any implicit conversions
// necessary for the match.
// Options:
//   problems - an array that will be filled with an entry for each candidate
//              consisting of an array of any semantic problems that prevent it
//              from being chosen.
/**
 * Selects a function from the given overload group based on the signature of
 * the provided function type. (Note there's no consideration of function names here.)
 */
function selectOverloadedDefinition(overloadGroup, type) {
    return overloadGroup.find(func => type.sameSignature(func.declaration.type));
}
exports.selectOverloadedDefinition = selectOverloadedDefinition;
//# sourceMappingURL=entities.js.map