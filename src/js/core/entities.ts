import { PotentialParameterType, ClassType, Type, ObjectType, sameType, ReferenceType, BoundedArrayType, Char, ArrayElemType, FunctionType, referenceCompatible } from "./types";
import { assert, Mutable, unescapeString, assertFalse, asMutable } from "../util/util";
import { Observable } from "../util/observe";
import { RuntimeConstruct, RuntimeFunction } from "./constructs";
import { PotentialFullExpression, RuntimePotentialFullExpression } from "./PotentialFullExpression";
import { SimpleDeclaration, LocalVariableDefinition, ParameterDefinition, GlobalObjectDefinition, LinkedDefinition, FunctionDefinition, ParameterDeclaration, FunctionDeclaration, ClassDefinition, FunctionDefinitionGroup, ClassDeclaration } from "./declarations";
import { CPPObject, AutoObject, StaticObject, StringLiteralObject, TemporaryObject, ObjectDescription } from "./objects";
import { CPPError } from "./errors";
import { Memory } from "./runtimeEnvironment";
import { Expression } from "./expressionBase";



interface NormalLookupOptions {
    readonly kind: "normal";
    readonly own?: boolean;
    readonly noBase?: boolean;
}

interface ExactLookupOptions {
    readonly kind: "exact";
    readonly own?: boolean;
    readonly noBase?: boolean;
    readonly paramTypes: readonly PotentialParameterType[]
    readonly receiverType?: ClassType;
}

export type NameLookupOptions = NormalLookupOptions | ExactLookupOptions;


/**
 * Discriminated union over entities introduced into a scope by a declaration.
 * Discriminated by .declarationKind property.
 */
export type DeclaredEntity = VariableEntity | FunctionEntity | ClassEntity;

/**
 * Possible results of name lookup.
 */
export type DeclaredScopeEntry = VariableEntity | FunctionOverloadGroup | ClassEntity;


export class Scope {

    // private static HIDDEN = Symbol("HIDDEN");
    // private static NO_MATCH = Symbol("NO_MATCH");

    private readonly entities: {[index:string]: DeclaredScopeEntry | undefined} = {};
    private readonly hiddenClassEntities: {[index:string]: DeclaredScopeEntry | undefined} = {};
    private readonly typeEntities: {[index:string]: ClassEntity | undefined} = {};
    public readonly parent?: Scope;

    public constructor(parent?: Scope) {
        this.parent = parent;
    }

    /** Attempts to declare a variable in this scope.
     * @param newEntity - The variable being declared.
     * @returns Either the entity that was added, or an existing one already there, assuming it was compatible.
     * @throws {CompilerNote} If an error prevents the entity being added successfully. (e.g. A previous declaration
     * with the same name but a different type.)
     */
    public declareVariableEntity<T extends ObjectType>(newEntity: VariableEntity<T>) : VariableEntity<T> {
        let entityName = newEntity.name;
        let existingEntity = this.entities[entityName];
        
        // No previous declaration for this name
        if (!existingEntity) {
            return this.entities[entityName] = newEntity;
        }

        // If there is an existing class entity, it may be displaced and effectively hidden.
        if (existingEntity.declarationKind === "class") {
            // Note: because a class entity cannot displace another class entity, we can
            // assume that there is no hidden class entity already
            this.hiddenClassEntities[entityName] = existingEntity;
            return this.entities[entityName] = newEntity;
        }

        // Previous declaration for this name, but different kind of symbol
        if (existingEntity.declarationKind !== "variable") {
            throw CPPError.declaration.symbol_mismatch(newEntity.declaration, newEntity);
        }

        // Previous declaration of variable with same name, attempt to merge
        return newEntity.mergeInto(existingEntity);
    }

    /** Attempts to declare a function in this scope.
     * @param newEntity - The function being declared.
     * @returns Either the entity that was added, or an existing one already there, assuming it was compatible.
     * @throws {CompilerNote} If an error prevents the entity being added successfully. (e.g. A previous function
     * declaration with the same signature but a different return type.)
     */
    public declareFunctionEntity(newEntity: FunctionEntity) {
        let entityName = newEntity.name;
        let existingEntity = this.entities[entityName];
        
        // No previous declaration for this name
        if (!existingEntity) {
            return this.entities[entityName] = new FunctionOverloadGroup([newEntity]);
        }

        // If there is an existing class entity, it may be displaced and effectively hidden.
        if (existingEntity.declarationKind === "class") {
            // Note: because a class entity cannot displace another class entity, we can
            // assume that there is no hidden class entity already
            this.hiddenClassEntities[entityName] = existingEntity;
            return this.entities[entityName] = new FunctionOverloadGroup([newEntity]);
        }

        // Previous declaration for this name, but different kind of symbol
        if (!(existingEntity instanceof FunctionOverloadGroup)) {
            throw CPPError.declaration.symbol_mismatch(newEntity.declaration, newEntity);
        }

        // Function overload group of previously existing functions, attempt to merge
        return newEntity.mergeInto(existingEntity);
    }

    
    /** Attempts to declare a class in this scope.
     * @param newEntity - The class being declared.
     * @returns Either the entity that was added, or an existing one already there, assuming it was compatible.
     * @throws {CompilerNote} If an error prevents the entity being added successfully. (e.g. An error due to
     * multiple definitions of the same class within a single translation unit.)
     */
    public declareClassEntity(newEntity: ClassEntity) {
        let entityName = newEntity.name;
        let existingEntity = this.entities[entityName];
        
        // No previous declaration for this name
        if (!existingEntity) {
            return this.entities[entityName] = newEntity;
        }

        // Previous declaration for this name, but different kind of symbol
        if (!(existingEntity instanceof ClassEntity)) {
            throw CPPError.declaration.symbol_mismatch(newEntity.declaration, newEntity);
        }
        
        // Note that we don't displace existing class entities as new variables or functions do.
        // Instead, either the new/existing class entities are compatible (i.e. they do result in
        // a multiple definition error), or they will generate an error.

        // There was a previous class declaration, attempt to merge
        return newEntity.mergeInto(existingEntity);
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

    // // TODO: this should be a member function of the Program class
    // public qualifiedLookup(names, options){
    //     assert(Array.isArray(names) && names.length > 0);
    //     var scope = this.sim.getGlobalScope();
    //     for(var i = 0; scope && i < names.length - 1; ++i){
    //         scope = scope.children[names[i].identifier];
    //     }

    //     if (!scope){
    //         return null;
    //     }

    //     var name = names.last().identifier;
    //     var result = scope.lookup(name, copyMixin(options, {qualified:true}));

    //     // Qualified lookup suppresses virtual function call mechanism, so if we
    //     // just looked up a MemberFunctionEntity, we create a proxy to do that.
    //     if (Array.isArray(result)){
    //         result = result.map(function(elem){
    //             return elem instanceof MemberFunctionEntity ? elem.suppressedVirtualProxy() : elem;
    //         });
    //     }
    //     return result;
    // }

    /**
     * Performs unqualified name lookup of a given name in this scope. Returns the entity found, or undefined
     * if no entity can be found. Note that the entity found may be a function overload group. Lookup may
     * may search through parent scopes. The lookup process can be customized by providing a set of `NameLookupOptions` (
     * see documentation for the `NameLookupOptions` type for more details.)
     * @param name An unqualified name to be looked up.
     * @param options A set of options to customize the lookup process.
     * @returns 
     */
    public lookup(name: string, options: NameLookupOptions = {kind:"normal"}) : DeclaredScopeEntry | undefined {
        options = options || {};

        assert(!name.includes("::"), "Qualified name used with unqualified loookup function.");

        // Note: We do not need to check this.hiddenClassEntities here. If a class entity
        // is hidden by another entity of the same name in the same scope, the only way to
        // access it is through an elaborated type specifier
        let ent = this.entities[name];

        // If we don't have an entity in this scope and we didn't specify we
        // wanted an own entity, look in parent scope (if there is one)
        if (!ent && !options.own && this.parent) {
            return this.parent.lookup(name, options);
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

                return new FunctionOverloadGroup(viable);
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
}

export class BlockScope extends Scope {

}

export class NamespaceScope extends Scope {

    public readonly name: string;
    private readonly children: {[index:string]: NamespaceScope | undefined};

    public constructor(name: string, parent?: NamespaceScope) {
        super(parent);
        assert(!parent || parent instanceof NamespaceScope);
        this.name = name;
        this.children = {};
        if(parent) {
            parent.addChild(this);
        }
    }

    private addChild(child: NamespaceScope) {
        if(child.name) {
            this.children[child.name] = child;
        }
    }
}


// export var ClassScope = NamespaceScope.extend({
//     _name: "ClassScope",

//     init: function(name, parent, base, sim){
//         this.initParent(name, parent, sim);
//         if(base){
//             assert(base instanceof ClassScope);
//             this.base = base;
//         }
//     },

//     lookup : function(name, options){
//         options = options || {};
//         // If specified, will not look up in base class scopes
//         if (options.noBase){
//             return Scope.lookup.apply(this, arguments);
//         }

//         return this.memberLookup(name, options) || Scope.lookup.apply(this, arguments);
//     },

//     requiredMemberLookup : function(name, options){
//         return this.i_requiredLookupImpl(this.memberLookup(name, options), name, options);
//     },
//     memberLookup : function(name, options){
//         var own = Scope.lookup.call(this, name, copyMixin(options, {own:true}));
//         if (!own){
//             return !options.noBase && this.base && this.base.memberLookup(name, options);
//         }
//         if (Array.isArray(own) && own.length === 0){
//             // Check to see if we could have found it except for name hiding
//             // (If we ever got an array, rather than just null, it means we found a match
//             // with the name for a set of overloaded functions, but none were viable)
//             if (!options.noBase && this.base){
//                 var couldHave = this.base.memberLookup(name, options);
//                 if (couldHave && (!Array.isArray(couldHave) || couldHave.length === 1 || couldHave === Scope.HIDDEN)){
//                     if (options.noNameHiding){
//                         return couldHave;
//                     }
//                     else{
//                         return Scope.HIDDEN;
//                     }
//                 }
//             }
//             return Scope.NO_MATCH;
//         }
//         return own;
//     }
// });


export interface EntityDescription {
    name: string;
    message: string;
}

export type EntityID = number;

export abstract class CPPEntity<T extends Type = Type> {
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

    public abstract describe() : EntityDescription;

    // // TODO: does this belong here?
    // public isLibraryConstruct() {
    //     return false
    // }

    // // TODO: does this belong here?
    // public isLibraryUnsupported() {
    //     return false;
    // }

    //TODO: function for isOdrUsed()?
};

export abstract class NamedEntity<T extends Type = Type> extends CPPEntity<T> {
    
    public readonly name: string;

    /**
     * All NamedEntitys will have a name, but in some cases this might be "". e.g. an unnamed namespace.
     */
    public constructor(type: T, name: string) {
        super(type);
        this.name = name;
    }
}

export type DeclarationKind = "variable" | "function" | "class";

abstract class DeclaredEntityBase<T extends Type = Type> extends NamedEntity<T> {

    // /**
    //  * If neither entity is defined, does nothing.
    //  * If exactly one entity is defined, gives that definition to the other one as well.
    //  * If both entities are defined, throws an exception. If the entities are functions with
    //  * the same signature and different return types, throws an exception.
    //  * REQUIRES: Both entities should have the same type. (for functions, the same signature)
    //  * @param entity1 - An entity already present in a scope.
    //  * @param entity2 - A new entity matching the original one.
    //  * @throws {Note}
    //  */
    // public static merge(entity1: DeclaredEntity, entity2: DeclaredEntity) {

    //     // TODO: Add support for "forward declarations" of a class/struct

    //     // Special case: ignore magic functions
    //     if (entity1 instanceof MagicFunctionEntity || entity2 instanceof MagicFunctionEntity) {
    //         return;
    //     }

    //     // Special case: if both are definitions for the same class, it's ok ONLY if they have exactly the same tokens
    //     if (entity1.decl instanceof ClassDeclaration && entity2.decl instanceof ClassDeclaration
    //         && entity1.type.className === entity2.type.className) {
    //         if (entity1.decl.isLibraryConstruct() && entity2.decl.isLibraryConstruct() !== undefined
    //             && entity1.decl.getLibraryId() === entity2.decl.getLibraryId() ||
    //             entity1.decl.hasSourceCode() && entity2.decl.hasSourceCode() &&
    //             entity1.decl.getSourceText().replace(/\s/g,'') === entity2.decl.getSourceText().replace(/\s/g,'')) {
    //             // exactly same tokens, so it's fine

    //             // merge the types too, so that the type system recognizes them as the same
    //             Types.Class.merge(entity1.type, entity2.type);

    //             return;
    //         }
    //         else {
    //             throw CPPError.link.class_same_tokens([entity1.decl, entity2.decl], entity1, entity2);
    //         }
    //     }

    //     // If they're not the same type, that's a problem
    //     if (!sameType(entity1.type, entity2.type)) {
    //         throw CPPError.link.type_mismatch(entity1.decl, entity1, entity2);
    //     }

    //     // Special case: if both are definitions of a member inside the same class, ignore them. (The class definitions
    //     // have already been checked above and must be the same at this point, so it's pointless and will cause errors
    //     // to try to merge them.)
    //     if (entity1.decl instanceof MemberDeclaration) {
    //         return;
    //     }
    //     if (entity1.decl instanceof FunctionDefinition && entity1.decl.isInlineMemberFunction) {
    //         return; // TODO: Should we be checking this?
    //     }

    //     // Attempt to merge the two
    //     if (!entity2.isDefined() && !entity1.isDefined()) {
    //         // If both are declarations, just keep the old one
    //     }
    //     else if (entity2.isDefined() && entity1.isDefined()) {
    //         // If both are definitions, that's a problem.
    //         throw CPPError.link.multiple_def([entity1.decl, entity2.decl], entity1.name);
    //     }
    //     else { // one of them is defined and one is undefined
    //         var undefinedEntity = entity1;
    //         var definedEntity = entity2;
    //         if (entity1.isDefined()) {
    //             undefinedEntity = entity2;
    //             definedEntity = entity1;
    //         }

    //         // Check return types for functions
    //         if (entity1 instanceof FunctionEntity) {
    //             // If they have mismatched return types, that's a problem.
    //             if (!entity1.type.sameReturnType(entity2.type)){
    //                 throw CPPError.link.func.returnTypesMatch([entity1.decl, entity2.decl], entity1.name);
    //             }
    //         }

    //         // If a previous declaration, and now a new definition, merge
    //         undefinedEntity.setDefinition(definedEntity.definition);
    //     }
    // }

    public abstract readonly declarationKind: DeclarationKind;

    // TODO: not sure this should really be here as an abstract property?
    public abstract readonly declaration: SimpleDeclaration | ParameterDefinition | ClassDeclaration;
    // public readonly definition?: SimpleDeclaration;

    public constructor(type: T, name: string) {
        super(type, name);
    }

    // public setDefinition(definition: SimpleDeclaration) {
    //     (<SimpleDeclaration>this.definition) = definition;
    // }

    // public isDefined() {
    //     return !!this.definition;
    // }


    // public isLibraryConstruct() {
    //     return this.decl.isLibraryConstruct();
    // }

    // public isLibraryUnsupported() {
    //     return this.decl.isLibraryUnsupported();
    // }
};

export class FunctionOverloadGroup {
    public readonly declarationKind = "function";

    public readonly name: string;
    private readonly _overloads: FunctionEntity[];
    public readonly overloads: readonly FunctionEntity[];

    public constructor(overloads: readonly FunctionEntity[]) {
            this.name = overloads[0].name;
            this.overloads = this._overloads = overloads.slice();
    }

    public addOverload(overload: FunctionEntity) {
        this._overloads.push(overload);
    }

    /**
     * Selects a function from the given overload group based on the signature of
     * the provided function type. (Note there's no consideration of function names here.)
     * WARNING: This function does NOT perform overload resolution. For example, it does
     * not consider the possibility of implicit conversions, which is a part of full overload
     * resolution. It simply looks for an overload with a matching signature.
     */
    public selectOverloadBySignature(type: FunctionType) {
        return this.overloads.find(func => type.sameSignature(func.type));
    }
}

export interface ObjectEntity<T extends ObjectType = ObjectType> extends CPPEntity<T> {
    runtimeLookup(rtConstruct: RuntimeConstruct) : CPPObject<T>;
}

abstract class VariableEntityBase<T extends ObjectType = ObjectType> extends DeclaredEntityBase<T> implements ObjectEntity<T> {
    public readonly declarationKind = "variable";
    
    public abstract runtimeLookup(rtConstruct: RuntimeConstruct) : CPPObject<T>;
    
    public mergeInto(this: VariableEntity<T>, existingEntity: VariableEntity) {
        if (!sameType(this.type, existingEntity.type)) {
            throw CPPError.declaration.type_mismatch(this.declaration, this, existingEntity);
        }
        return <VariableEntity<T>>existingEntity;
    }
}

export class LocalObjectEntity<T extends ObjectType = ObjectType> extends VariableEntityBase<T> {
    public readonly kind = "AutoEntity";
    public readonly isParameter: boolean;

    public readonly declaration: LocalVariableDefinition | ParameterDefinition;
    public readonly definition: LocalVariableDefinition | ParameterDefinition;

    public constructor(type: T, def: LocalVariableDefinition | ParameterDefinition, isParameter: boolean = false) {
        super(type, def.name);
        this.declaration = def;
        this.definition = def;

        this.isParameter = isParameter;
    }

    public toString() {
        return this.name + " (" + this.type + ")";
    }

    public mergeInto(existingEntity: VariableEntityBase) : never {
        // Redeclaration of local is never ok
        throw CPPError.declaration.prev_local(this.declaration, this.name);
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) : AutoObject<T> {
        // TODO: revisit the non-null assertion below
        return rtConstruct.containingRuntimeFunction.stackFrame!.localObjectLookup(this);
    }

    public describe() {
        return {name: this.name, message: `the ${this.isParameter ? "parameter" : "local variable"} ${this.name}`};
    }
};



export interface BoundReferenceEntity<T extends ObjectType = ObjectType> extends CPPEntity<T>, ObjectEntity<T> {
    runtimeLookup(rtConstruct: RuntimeConstruct) : CPPObject<T>;
}

export interface UnboundReferenceEntity<T extends ObjectType = ObjectType> extends CPPEntity<T> {
    bindTo(rtConstruct : RuntimeConstruct, obj: CPPObject<T>) : void;
}

export class LocalReferenceEntity<T extends ObjectType = ObjectType> extends VariableEntityBase<T> implements BoundReferenceEntity<T>, UnboundReferenceEntity<T> {
    public readonly kind = "LocalReferenceEntity";
    public readonly isParameter: boolean;

    public readonly declaration: LocalVariableDefinition | ParameterDefinition;
    public readonly definition: LocalVariableDefinition | ParameterDefinition;

    public constructor(type: T, def: LocalVariableDefinition | ParameterDefinition, isParameter: boolean = false) {
        super(type, def.name);
        this.declaration = def;
        this.definition = def;

        this.isParameter = isParameter;
    }

    public mergeInto(existingEntity: DeclaredScopeEntry) : never {
        // Redeclaration of local is never ok
        throw CPPError.declaration.prev_local(this.declaration, this.name);
    }

    public bindTo(rtConstruct : RuntimeConstruct, obj: CPPObject<T>) {
        rtConstruct.containingRuntimeFunction.stackFrame!.bindLocalReference(this, obj);
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) : CPPObject<T> {
        // TODO: revisit the non-null assertions below
        return rtConstruct.containingRuntimeFunction.stackFrame!.localReferenceLookup<T>(this);
    }

    public describe() {
        return {name: this.name, message: `the ${this.isParameter ? "reference parameter" : "reference"} ${this.name}`};
    }
};

export type LocalVariableEntity<T extends ObjectType = ObjectType> = LocalObjectEntity<T> | LocalReferenceEntity<T>;

export class GlobalObjectEntity<T extends ObjectType = ObjectType> extends VariableEntityBase<T> {

    public readonly qualifiedName: string;
    public readonly declaration: SimpleDeclaration;
    public readonly definition?: GlobalObjectDefinition;
    
    // storage: "static",
    constructor(type: T, decl: GlobalObjectDefinition) {
        super(type, decl.name);
        this.declaration = decl;
        // Note: this.definition is not set here because it is set later during the linking process.
        // Eventually, this constructor will take in a GlobalObjectDeclaration instead, but that would
        // require support for the extern keyword or static member variables (although that might be
        // a separate class entirely)
        this.qualifiedName = "::" + this.name;
    }

    public toString() {
        return this.name + " (" + this.type + ")";
    }

    public link(def: GlobalObjectDefinition | undefined) {
        if (def) {
            (<Mutable<this>>this).definition = def;
        }
        else {
            this.declaration.addNote(CPPError.link.def_not_found(this.declaration, this));
        }
        
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) : StaticObject<T> {
        return rtConstruct.sim.memory.staticLookup(this);
    }
    
    public describe() {
        return {name: this.name, message: "the variable " + this.name};
    }
};

export type VariableEntity<T extends ObjectType = ObjectType> = LocalVariableEntity<T> | GlobalObjectEntity<T>;


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
export class ReturnObjectEntity<T extends ObjectType = ObjectType> extends CPPEntity<T> implements ObjectEntity<T> {
    
    public runtimeLookup(rtConstruct: RuntimeConstruct) : CPPObject<T> {
        let returnObject = rtConstruct.containingRuntimeFunction.returnObject;
        if (!returnObject) {
            throw "Error: Runtime lookup performed for the return object of a function, but the return object does not currently exist.";
        }
        return <CPPObject<T>>returnObject;
    }
    
    public describe() {
        // TODO: add info about which function? would need to be specified when the return value is created
        return {name: "[return]", message: "the return object"};
    }
};

export class ReturnByReferenceEntity<T extends ObjectType = ObjectType> extends CPPEntity<T> implements UnboundReferenceEntity<T> {
    
    public bindTo(rtConstruct : RuntimeConstruct, obj: CPPObject<T>) {
        // Assume a ReturnByReferenceEntity will only be bound in the context of a return
        // for a return-by-reference function, thus the cast
        let func = <RuntimeFunction<ReferenceType<T>>>rtConstruct.containingRuntimeFunction;
        func.setReturnObject(obj);
    }

    public describe() {
        // TODO: add info about which function? would need to be specified when the return value is created
        return {name: "[&return]", message: "the object returned by reference"};
    }
};

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
export class PassByValueParameterEntity<T extends ObjectType = ObjectType> extends CPPEntity<T> implements ObjectEntity<T> {

    public readonly calledFunction: FunctionEntity;
    public readonly type: T;
    public readonly num: number;

    public constructor(calledFunction: FunctionEntity, type: T, num: number) {
        super(type);
        this.calledFunction = calledFunction;
        this.type = type;
        this.num = num;
        assert(sameType(calledFunction.type.paramTypes[num], type), "Inconsistent type for parameter entity.");
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) {

        let pendingCalledFunction = rtConstruct.sim.pendingCalledFunction;
        assert(pendingCalledFunction);
        assert(pendingCalledFunction.model === this.calledFunction.definition);

        let paramObj = pendingCalledFunction.getParameterObject(this.num);
        assert(sameType(paramObj.type, this.type));
        return <AutoObject<T>>paramObj;
    }

    public describe() {
        let definition = this.calledFunction.definition;
        if (definition) {
            return definition.parameters[this.num].declaredEntity!.describe();
        }
        else {
            return {name: `Parameter #${this.num+1}`, message: `Parameter #${this.num+1} of the called function`};
        }
    }

};

export class PassByReferenceParameterEntity<T extends ObjectType = ObjectType> extends CPPEntity<T> implements UnboundReferenceEntity<T> {

    public readonly calledFunction: FunctionEntity;
    public readonly type: T;
    public readonly num: number;

    public constructor(calledFunction: FunctionEntity, type: T, num: number) {
        super(type);
        this.calledFunction = calledFunction;
        this.type = type;
        this.num = num;
        assert(sameType(calledFunction.type.paramTypes[num], new ReferenceType(type)), "Inconsistent type for parameter entity.");
    }

    public bindTo(rtConstruct : RuntimeConstruct, obj: CPPObject<T>) {
        let pendingCalledFunction = rtConstruct.sim.pendingCalledFunction;
        assert(pendingCalledFunction);
        assert(pendingCalledFunction.model === this.calledFunction.definition);

        pendingCalledFunction.bindReferenceParameter(this.num, obj);
    }
    
    public describe() {
        let definition = this.calledFunction.definition;
        if (definition) {
            return definition.parameters[this.num].declaredEntity!.describe();
        }
        else {
            return {name: `Parameter #${this.num+1}`, message: `Parameter #${this.num+1} of the called function`};
        }
    }
};

// export class ReceiverEntity extends CPPEntity<ClassType> implements ObjectEntity<ClassType> {
//     protected static readonly _name: "ReceiverEntity";

//     // storage: "automatic",
    
//     constructor(type: T) {
//         super(type);
//     }

//     public toString() {
//         return "function receiver (" + this.type + ")";
//     }

//     public runtimeLookup(rtConstruct: RuntimeConstruct) {
//         return rtConstruct.contextualReceiver();
//     }

//     public describe() {
//         // if (rtConstruct){
//         //     return {message: "the receiver of this call to " + rtConstruct.containingRuntimeFunction().describe().message + " (i.e. *this) "};
//         // }
//         // else {
//             return {message: "the receiver of this call (i.e. *this)"};
//         // }
//     }
// };



// export class NewObjectEntity<T extends ObjectType = ObjectType> extends CPPEntity<T> implements ObjectEntity<T> {
//     protected static readonly _name = "NewObjectEntity";

//     // storage: "automatic",
    
//     public toString() {
//         return "object (" + this.type + ")";
//     }

//     public runtimeLookup(rtConstruct: RuntimeConstruct) {
//         // no additional runtimeLookup() needed on the object since it will never be a reference
//         return rtConstruct.getAllocatedObject();
//     }

//     public describe() {
//         return {message: "the dynamically allocated object (of type "+this.type+") created by new"};
//     }

// };

export class ArraySubobjectEntity<T extends ArrayElemType = ArrayElemType> extends CPPEntity<T> implements ObjectEntity<T> {

    public readonly arrayEntity: ObjectEntity<BoundedArrayType<T>>;
    public readonly index: number;

    constructor(arrayEntity: ObjectEntity<BoundedArrayType<T>>, index: number) {
        super(arrayEntity.type.elemType);
        this.arrayEntity = arrayEntity;
        this.index = index;
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) {
        return this.arrayEntity.runtimeLookup(rtConstruct).getArrayElemSubobject(this.index);
    }

    public describe() {
        let arrDesc = this.arrayEntity.describe();
        return {
            name: arrDesc.name + "[" + this.index + "]",
            message: "element " + this.index + " of " + arrDesc.message
        };
    }
}

// export class BaseSubobjectEntity extends CPPEntity<ClassType> implements ObjectEntity<ClassType> {

//     public readonly containingEntity: ObjectEntity<ClassType>;

//     constructor(containingEntity: ObjectEntity<ClassType>, type: ClassType) {
//         super(type);
//         this.containingEntity = containingEntity;
//     }

//     public runtimeLookup(rtConstruct: RuntimeConstruct) {
//         // TODO: check on non-null assertion below
//         return this.containingEntity.runtimeLookup(rtConstruct).getBaseSubobject()!;
//     }

//     public describe() {
//         return {message: "the " + this.type.cppClass.name + " base class subobject of " + this.containingEntity.describe()};
//     }
// }



// export class MemberSubobjectEntity<T extends ObjectType = ObjectType> extends CPPEntity<T> implements ObjectEntity<T> {

//     public readonly containingEntity: ObjectEntity<ClassType>;
//     public readonly name: string;

//     constructor(containingEntity: ObjectEntity<ClassType>, type: T, name: string) {
//         super(type);
//         this.containingEntity = containingEntity;
//         this.name = name;
//     }

//     public runtimeLookup(rtConstruct: RuntimeConstruct) {
//         // TODO: check on cast below
//         return <MemberSubobject<T>>this.containingEntity.runtimeLookup(rtConstruct).getMemberSubobject(this.name);
//     }

//     public describe() {
//         let containingObjectDesc = this.containingEntity.describe();
//         let desc : Description = {
//             message: "the " + this.name + " member of " + containingObjectDesc.message
//         }
//         if (containingObjectDesc.name) {
//             desc.name = containingObjectDesc.name + "." + this.name
//         }
//         return desc;
//     }
// }

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

// // TODO: need class for reference members
// export class MemberVariableEntity<T extends ObjectType = ObjectType> extends DeclaredEntity<T> implements ObjectEntity<T> {
//     protected static readonly _name = "MemberVariableEntity";
//     // storage: "none",

//     public readonly access: string;
//     public readonly memberOfType: Types.Class;

//     public constructor(decl: SimpleDeclaration, memberOfType: Types.Class) {
//         super(decl);
//         this.memberOfType = memberOfType;
//         this.access = decl.access;
//     }

//     public toString() {
//         return this.name + " (" + this.type + ")";
//     }

//     public runtimeLookup(rtConstruct: RuntimeConstruct) {
//         var recObj = rtConstruct.contextualReceiver();

//         while(recObj && !recObj.type.similarType(this.memberOfType)) {
//             recObj = recObj.type.getBaseClass() && recObj.i_baseSubobjects[0];
//         }

//         assert(recObj, "Internal lookup failed to find subobject in class or base classses.");

//         return recObj.getMemberSubobject(this.name);
//     }

//     public objectInstance(parentObj: CPPObject<ClassType>, memory: Memory, address: number) {
//         return new MemberSubobject(parentObj, this.type, this.name, memory, address);
//     }

//     public describe() {
//         if (rtConstruct){
//             var recObj = rtConstruct.contextualReceiver();
//             if (recObj.name){
//                 return {message: recObj.name + "." + this.name};
//             }
//             else{
//                 return {message: "the member " + this.name + " of " + recObj.describe().message};
//             }
//         }
//         else{
//             return {
//                 name: this.memberOfType.className + "." + this.name,
//                 message: "the " + this.name + " member of the " + this.memberOfType.className + " class"
//             };
//         }
//     }
// }

export class TemporaryObjectEntity<T extends ObjectType = ObjectType> extends CPPEntity<T> implements ObjectEntity<T> {
    protected static readonly _name = "TemporaryObjectEntity";
    // storage: "temp",

    public readonly creator: PotentialFullExpression;
    public readonly owner: PotentialFullExpression;
    public readonly name: string;

    constructor(type: T, creator: PotentialFullExpression, owner: PotentialFullExpression, name: string) {
        super(type);
        this.creator = creator;
        this.owner = owner;
        this.name = name;
    }

    public setOwner(newOwner: PotentialFullExpression) {
        (<Mutable<this>>this).owner = newOwner;
    }

    public objectInstance(creatorRt: RuntimePotentialFullExpression) {

        let objInst : TemporaryObject<T> = creatorRt.sim.memory.allocateTemporaryObject(this);

        let owner = creatorRt.containingFullExpression;
        owner.temporaryObjects[this.entityId] = objInst;
        return objInst;
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) {
        // Some hacky casts and assertions in this implementation
        // if (!(rtConstruct instanceof RuntimePotentialFullExpression)) { // removed since it causes an issue with a circular import dependency
        //     return assertFalse();
        // }
        return <TemporaryObject<T>>(<RuntimePotentialFullExpression>rtConstruct).containingFullExpression.temporaryObjects[this.entityId];
    }

    public describe() {
        return {name: this.name, message: this.name}; // TOOD: eventually change implementation when I remove name
    }

}



export class FunctionEntity extends DeclaredEntityBase<FunctionType> {
    public readonly declarationKind = "function";
    
    public readonly qualifiedName: string;
    public readonly declaration: FunctionDeclaration;
    public readonly definition?: FunctionDefinition;
    
    // storage: "static",
    constructor(type: FunctionType, decl: FunctionDeclaration) {
        super(type, decl.name);
        this.declaration = decl;
        this.qualifiedName = "::" + this.name;
    }

    public isStaticallyBound() {
        return true;
    }

    public get isVirtual() {// TODO: why do we have this for non-member functions as well?
        return false;
    }

    public toString() {
        return this.name;
    }

    public mergeInto(overloadGroup: FunctionOverloadGroup) {
        //check each other function found
        let matchingFunction = overloadGroup.selectOverloadBySignature(this.type);
        
        if (!matchingFunction) {
            // If none were found with the same signature, this is a new overload, so go ahead and add it
            overloadGroup.addOverload(this);
            return this;
        }

        // If they have mismatched return types, that's a problem.
        if (!this.type.sameReturnType(matchingFunction.type)) {
            throw CPPError.declaration.func.returnTypesMatch([this.declaration, matchingFunction.declaration], this.name);
        }

        // As a sanity check, make sure they're the same type.
        // But this should already be true, given that they have the same signature and return type.
        if (!sameType(this.type, matchingFunction.type)) { // an array indicates a function overload group was found
            throw CPPError.declaration.type_mismatch(this.declaration, this, matchingFunction);
        }

        return matchingFunction;
    }

    public link(def: FunctionDefinitionGroup | undefined) {
        
        if (def) {
            // found an overload group of function definitions, check for one
            // with matching signature to the given linked entity
            let overload = selectOverloadedDefinition(def.definitions, this.type);
            if (!overload) {
                this.declaration.addNote(CPPError.link.func.no_matching_overload(this.declaration, this));
                return;
            }

            // check return type
            if (!this.type.sameReturnType(overload.declaration.type)) {
                this.declaration.addNote(CPPError.link.func.returnTypesMatch(this.declaration, this));
                return;
            }
            
            (<Mutable<this>>this).definition = overload;
        }
        else {
            this.declaration.addNote(CPPError.link.func.def_not_found(this.declaration, this));
        }

    }

    public isMain() {
        return this.qualifiedName === "::main";
    }

    public describe(): EntityDescription {
        return {
            name: this.name,
            message: `the ${this.name} function`
        };
    }
}

export class ClassEntity extends DeclaredEntityBase<ClassType> {
    public readonly declarationKind = "class";
    
    public readonly qualifiedName: string;
    public readonly declaration: ClassDeclaration;
    public readonly definition?: ClassDefinition;
    
    constructor(type: ClassType, decl: ClassDeclaration) {
        super(type, decl.name);
        this.declaration = decl;
        this.qualifiedName = "::" + this.name;
    }

    public toString() {
        return this.name;
    }

    /**
     * Merge this class entity into a previous existing class entity.
     * If exactly one of the entities has a definition, the other one assumes
     * that definition as well. If both have a definition, an error is thrown
     * unless the two are literally the same definition. (Note that an error
     * is thrown in the case of separate definitions with the same exact source
     * tokens, because the use of `mergeInto` means these definitions occur in the
     * same translation unit, which is prohibited.)
     * @param existingEntity 
     * @throws {CompilerNote} If the entities have multiple definitions.
     */
    public mergeInto(existingEntity: ClassEntity) {
        if (this.definition && existingEntity.definition) {
            if (this.definition !== existingEntity.definition) {
                // not literally same definition, so throw an error
                throw CPPError.declaration.classes.multiple_def(this.definition, existingEntity.definition);
            }
        }
        else if (this.definition) {
            // we have a definition but they don't
            asMutable(existingEntity).definition = this.definition;
        }
        else if (existingEntity.definition) {
            // they have a definition but we don't
            asMutable(this).definition = existingEntity.definition;
        }
        else {
            // Neither had a definition, nothing to do.
        }
    }

    public link(def: ClassDefinition | undefined) {
        if (def) {
            (<Mutable<this>>this).definition = def;
        }
        else {
            this.declaration.addNote(CPPError.link.classes.def_not_found(this.declaration, this));
        }
        
    }

    public isMain() {
        return this.qualifiedName === "::main";
    }

    public describe(): EntityDescription {
        return {
            name: this.name,
            message: `the ${this.name} function`
        };
    }
}



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

//     private checkForOverride() {
//         if (!this.containingClass.getBaseClass()) {
//             return;
//         }

//         // Find the nearest overrider of a hypothetical virtual function.
//         // If any are virtual, this one would have already been set to be
//         // also virtual by this same procedure, so checking this one is sufficient.
//         // If we override any virtual function, this one is too.
//         var overridden = this.containingClass.getBaseClass().classScope.singleLookup(this.name, {
//             paramTypes: this.type.paramTypes, isThisConst: this.type.isThisConst,
//             exactMatch:true, own:true, noNameHiding:true});

//         if (overridden && overridden instanceof FunctionEntity && overridden.isVirtual){
//             (<boolean>this.isVirtual) = true;
//             // Check to make sure that the return types are covariant
//             if (!covariantType(this.type.returnType, overridden.type.returnType)){
//                 throw SemanticExceptions.NonCovariantReturnTypes.instance(this, overridden);
//             }
//         }
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


function convLen(args: readonly Expression[]) {
    return args.reduce((res, exp) => res + exp.conversionLength, 0);
};

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
export function selectOverloadedDefinition(overloadGroup: readonly FunctionDefinition[], type: FunctionType) {
    return overloadGroup.find(func => type.sameSignature(func.declaration.type));
}