import { PotentialParameterType, ClassType, Type, sameType, ObjectType, BoundedArrayType, Char, ArrayElemType, FunctionType, referenceCompatible } from "./types";
import { CPPError, Note } from "./errors";
import { assert, Mutable, assertFalse } from "../util/util";
import { Program } from "./Program";
import { Observable } from "../util/observe";
import { Description, RuntimeConstruct, PotentialFullExpression, RuntimePotentialFullExpression } from "./constructs";
import { SimpleDeclaration, FunctionDefinition } from "./declarations";
import { CPPObject, AutoObject, StaticObject, StringLiteralObject, TemporaryObject } from "./objects";
import { Memory } from "./runtimeEnvironment";
import { Expression } from "./expressions";


interface NormalLookupOptions {
    readonly kind: "normal";
    readonly own?: boolean;
    readonly noBase?: boolean;
    readonly paramTypes?: PotentialParameterType[]
    readonly receiverType? : ClassType;
}

interface ExactLookupOptions {
    readonly kind: "exact";
    readonly own?: boolean;
    readonly noBase?: boolean;
    readonly paramTypes: PotentialParameterType[]
    readonly receiverType?: ClassType;
}

export type NameLookupOptions = NormalLookupOptions | ExactLookupOptions;

export class Scope {

    // private static HIDDEN = Symbol("HIDDEN");
    // private static NO_MATCH = Symbol("NO_MATCH");

    private readonly entities: {[index:string]: DeclaredEntity | FunctionEntity[] | undefined};
    public readonly parent?: Scope;

    public constructor(parent?: Scope) {
        this.entities = {};
        this.parent = parent;
    }

    public toString() {
        let str = "";
        for(let key in this.entities) {
            str += this.entities[key] + "\n";
        }
        return str;
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
     * @param {DeclaredEntity} newEntity - The entity to attempt to add.
     * @returns {DeclaredEntity} Either the entity that was added, or an existing one already there, assuming it was compatible.
     * @throws  {SemanticException} If an error prevents the entity being added successfully. (e.g. Function declarations with
     * the same signature but a mismatch of return types, duplicate definition)
     */
    public addDeclaredEntity<T extends Type>(newEntity: DeclaredEntity<T>) {
        let existingEntity = this.entities[newEntity.name];

        if (!existingEntity) { // No previous entity with this name, so just add it
            this.entities[newEntity.name] = newEntity;
            // this.declaredEntityAdded(newEntity);
            return newEntity;
        }
        
        if (newEntity instanceof FunctionEntity) {
            return this.mergeDeclaredFunctionEntity(newEntity, existingEntity);
        }
        else {
            return this.mergeDeclaredNonFunctionEntity(newEntity, existingEntity);
        }
    }
    
    private mergeDeclaredNonFunctionEntity<T extends Type>(newEntity: DeclaredEntity<T>, existingEntity: DeclaredEntity | FunctionEntity[]) {
        if (Array.isArray(existingEntity)) { // an array indicates a function overload group was found
            throw CPPError.declaration.type_mismatch(newEntity.declaration, newEntity, existingEntity[0]);
        }
        else {
            // both are non-functions, so check that the types are the same
            if (!sameType(newEntity.type, existingEntity.type)) { // an array indicates a function overload group was found
                throw CPPError.declaration.type_mismatch(newEntity.declaration, newEntity, existingEntity);
            }
            return existingEntity;
        }
    }

    private mergeDeclaredFunctionEntity<T extends Type>(newEntity: FunctionEntity, existingEntity: DeclaredEntity | FunctionEntity[]) {
        if (!Array.isArray(existingEntity)) { // It's not a function overload group
            DeclaredEntity.merge(newEntity, existingEntity);
            return existingEntity;
        }
        else { // It is a function overload group, check each other function found
            let matchingFunction = existingEntity.find((otherFunc) => {
                // Look for any function with the same signature
                // Functions with different signatures are different overloads and are fine
                if (newEntity.type.sameSignature(otherFunc.type)) {

                    // If they have mismatched return types, that's a problem.
                    if (!newEntity.type.sameReturnType(otherFunc.type)) {
                        throw CPPError.declaration.func.returnTypesMatch([newEntity.declaration, otherFunc.declaration], newEntity.name);
                    }

                    // As a sanity check, make sure they're the same type.
                    // But this should already be true, given that they have the same signature and return type.
                    if (!sameType(newEntity.type, otherFunc.type)) { // an array indicates a function overload group was found
                        throw CPPError.declaration.type_mismatch(newEntity.declaration, newEntity, otherFunc);
                    }

                    // Terminates early when the first match is found.
                    // It's not possible there would be more than one match, since only one
                    // FunctionEntity with the same signature would be allowed in the array.
                    return true;
                }
            });
            
            if (matchingFunction) {
                return matchingFunction;
            }

            // If none were found with the same signature, this is a new overload, so go ahead and add it
            existingEntity.push(newEntity);
            // this.declaredEntityAdded(newEntity);
            return newEntity;
        }

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

    public lookup(name: string, options: NameLookupOptions) : DeclaredEntity | FunctionEntity[] | undefined {
        options = options || {};

        assert(!name.includes("::"), "Qualified name used with unqualified loookup function.");

        let ent = this.entities[name];

        // If we don't have an entity in this scope and we didn't specify we
        // wanted an own entity, look in parent scope (if there is one)
        if (!ent && !options.own && this.parent) {
            return this.parent.lookup(name, options);
        }

        // If we didn't find anything, return null
        if (!ent) {
            return undefined;
        }

        if (!Array.isArray(ent)) {
            // If it's not an array, it's a single entity so return it
            return ent;
        }
        else {
            let viable = ent; // a set of potentially viable function overloads

            // If we're looking for an exact match of parameter types
            if (options.kind === "exact") {
                const paramTypes = options.paramTypes;
                viable = ent.filter((cand) => {

                    // Check that parameter types match
                    if (!cand.type.sameParamTypes(paramTypes))

                    if (options.receiverType) {
                        // if receiver type is defined, candidate must also have
                        // a receiver and the presence/absence of const must match
                        // NOTE: the actual receiver type does not need to match, just the constness
                        return cand.type.receiverType && options.receiverType.isConst === cand.type.isConst;
                    }
                    else {
                        // if no receiver type is defined, candidate must not have a receiver
                        return !cand.type.receiverType;
                    }
                    return cand.type.sameParamTypes(paramTypes);
                });

                return viable;
            }

            // If we're looking for something that could be called with given parameter types, including conversions
            else if (options.paramTypes) {
                // var params = options.params || options.paramTypes && fakeExpressionsFromTypes(options.paramTypes);
                viable = overloadResolution(ent, options.paramTypes, options.receiverType).viable || [];
            }

            return viable;
            // // Hack to get around overloadResolution sometimes returning not an array
            // if (viable && !Array.isArray(viable)){
            //     viable = [viable];
            // }

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

    // protected declaredEntityAdded(ent: DeclaredEntity) {
    //     if (ent instanceof AutoEntity) {
            
    //     }
    // }

    // private addAutomaticEntity : function(obj){
    //     assert(this.parent, "Objects with automatic storage duration should always be inside some block scope inside a function.");
    //     this.parent.addAutomaticEntity(obj);
    // },
    // private addReferenceEntity : function(obj){
    //     assert(this.parent);
    //     this.parent.addReferenceEntity(obj);
    // },
    // private addStaticEntity : function(ent) {
    //     this.sim.addStaticEntity(ent);
    // },
    // merge : function() {
        // Nothing in here should have linkage, right?
        // Unless I allow function/class declarations, etc. inside blocks, which I currently don't
    // }


}

// export class FunctionBlockScope extends BlockScope {
//     _name: "FunctionBlockScope",
//     init: function(parent, sim){
//         this.initParent(parent, sim);
//         this.automaticObjects = [];
//         this.referenceObjects = [];
//     },
//     addAutomaticEntity : function(obj){
//         this.automaticObjects.push(obj);
//     },
//     addReferenceEntity : function(obj){
//         this.referenceObjects.push(obj);
//     },
//     addStaticEntity : function(ent) {
//         this.sim.addStaticEntity(ent);
//     }
// }

export class NamespaceScope extends Scope {

    public readonly name: string;
    private readonly children: {[index:string]: NamespaceScope | undefined};

    public constructor(name: string, program: Program, parent?: NamespaceScope) {
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
    // addAutomaticEntity : function(obj){
    //     assert(false, "Can't add an automatic entity to a namespace scope.");
    // },
    // addReferenceEntity : function(obj){
    //     assert(false, "TODO");
    // },
    // addStaticEntity : function(ent) {
    //     this.sim.addStaticEntity(ent);
    // },

    // merge : function (otherScope, onErr) {
    //     for(var name in otherScope.entities){
    //         var otherEntity = otherScope.entities[name];
    //         if (Array.isArray(otherEntity)) {
    //             for(var i = 0; i < otherEntity.length; ++i) {
    //                 try {
    //                     this.addDeclaredEntity(otherEntity[i]);
    //                 }
    //                 catch (e) {
    //                     onErr(e);
    //                 }
    //             }
    //         }
    //         else{
    //             try {
    //                 this.addDeclaredEntity(otherEntity);
    //             }
    //             catch (e) {
    //                 onErr(e);
    //             }
    //         }
    //     }

    //     // Merge in all child scopes from the other
    //     for(var childName in otherScope.children) {
    //         if (!this.children[childName]) {
    //             // If a matching child scope doesn't already exist, create it
    //             this.children[childName] = NamespaceScope.instance(childName, this, this.sim);
    //         }

    //         this.children[childName].merge(otherScope.children[childName], onErr);
    //     }
    // }
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

    public abstract describe() : Description;

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

export abstract class DeclaredEntity<T extends Type = Type> extends NamedEntity<T> {

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

    public readonly declaration: SimpleDeclaration;
    // public readonly definition?: SimpleDeclaration;

    public constructor(type: T, decl: SimpleDeclaration) {
        super(type, decl.name);
        this.declaration = decl;
    }

    // public setDefinition(definition: SimpleDeclaration) {
    //     (<SimpleDeclaration>this.definition) = definition;
    // }

    // public isDefined() {
    //     return !!this.definition;
    // }

    // TODO: when namespaces are implemented, need to fix this function
    public getFullyQualifiedName() {
        return "::" + this.name;
    }

    // public isLibraryConstruct() {
    //     return this.decl.isLibraryConstruct();
    // }

    // public isLibraryUnsupported() {
    //     return this.decl.isLibraryUnsupported();
    // }
};



export interface ObjectEntity<T extends ObjectType = ObjectType> extends CPPEntity<T> {
    runtimeLookup(rtConstruct: RuntimeConstruct) : CPPObject<T>;
}

export class AutoEntity<T extends ObjectType = ObjectType> extends DeclaredEntity<T> implements ObjectEntity<T> {
    
    public readonly isParameter: boolean;

    public constructor(type: T, decl: SimpleDeclaration, isParameter?: boolean) {
        super(type, decl);
        this.isParameter = !!isParameter;
    }

    public toString() {
        return this.name + " (" + this.type + ")";
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) : AutoObject<T> {
        // TODO: revisit the non-null assertion below
        return rtConstruct.containingRuntimeFunction!.stackFrame!.getLocalObject(this);
    }

    public describe() {
        return {message: `the ${this.isParameter ? "parameter" : "local variable"} ${this.name}`};
    }
};



export interface BoundReferenceEntity<T extends ObjectType = ObjectType> extends CPPEntity<T>, ObjectEntity<T> {
    runtimeLookup(rtConstruct: RuntimeConstruct) : CPPObject<T>;
}

export interface UnboundReferenceEntity<T extends ObjectType = ObjectType> extends CPPEntity<T> {
    bindTo(rtConstruct : RuntimeConstruct, obj: CPPObject<T>) : void;
}

export class LocalReferenceEntity<T extends ObjectType = ObjectType> extends DeclaredEntity<T> implements BoundReferenceEntity<T>, UnboundReferenceEntity<T> {

    public readonly isParameter: boolean;

    public constructor(type: T, decl: SimpleDeclaration, isParameter: boolean = false) {
        super(type, decl);
        this.isParameter = isParameter;
    }

    public bindTo(rtConstruct : RuntimeConstruct, obj: CPPObject<T>) {
        rtConstruct.containingRuntimeFunction!.stackFrame!.bindReference(this, obj);
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) : CPPObject<T> {
        // TODO: revisit the non-null assertions below
        return rtConstruct.containingRuntimeFunction!.stackFrame!.referenceLookup<T>(this);
    }

    public describe() {
        return {message: `the ${this.isParameter ? "reference parameter" : "reference"} ${this.name}`};
    }
};

export type LocalVariableEntity<T extends ObjectType = ObjectType> = AutoEntity<T> | LocalReferenceEntity<T>;

export class StaticEntity<T extends ObjectType = ObjectType> extends DeclaredEntity<T> implements ObjectEntity<T> {
    protected static _name =  "StaticEntity";

    // storage: "static",
    constructor(type: T, decl: SimpleDeclaration) {
        super(type, decl);
    }

    public toString() {
        return this.name + " (" + this.type + ")";
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) : StaticObject<T> {
        return rtConstruct.sim.memory.staticLookup(this);
    }
    
    public describe() {
        return {name: this.name, message: "the variable " + this.name};
    }
};

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
export class ReturnObjectEntity extends CPPEntity<ObjectType> implements ObjectEntity<ObjectType> {
    
    public runtimeLookup(rtConstruct: RuntimeConstruct) : CPPObject<ObjectType> {
        let returnObject = rtConstruct.containingRuntimeFunction.returnObject;
        if (!returnObject) {
            throw "Error: Runtime lookup performed for the return object of a function, but the return object does not currently exist.";
        }
        return returnObject;
    }
    
    public describe() {
        // TODO: add info about which function? would need to be specified when the return value is created
        return {message: "the return object"};
    }
};

export class ReturnByReferenceEntity<T extends ObjectType = ObjectType> extends CPPEntity<T> implements UnboundReferenceEntity<T> {
    
    public bindTo(rtConstruct : RuntimeConstruct, obj: CPPObject<T>) {
        rtConstruct.containingRuntimeFunction.setReturnObject(obj);
    }

    public describe() {
        // TODO: add info about which function? would need to be specified when the return value is created
        return {message: "the object returned by reference"};
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

export class StringLiteralEntity extends CPPEntity<BoundedArrayType> implements ObjectEntity<BoundedArrayType> {

    public readonly str: string;
    public readonly type!: BoundedArrayType<Char>; // handled by parent

    public constructor(str: string) {
        super(new BoundedArrayType(new Char(true), str.length + 1)); // + 1 for null char
        this.str = str;
    }

    public objectInstance(memory: Memory, address: number) {
        return new StringLiteralObject(this.type, memory, address);
    }

    public toString() {
        return "string literal \"" + Util.unescapeString(this.str) + "\"";
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) {
        return rtConstruct.sim.memory.getStringLiteral(this.str);
    }

    public describe() {
        return {message: "the string literal \"" + Util.unescapeString(this.str) + "\""};
    }
};

// TODO: will need to add a class for ReferenceParameterEntity
export class PassByValueParameterEntity<T extends ObjectType> extends CPPEntity<T> implements ObjectEntity<T> {

    public readonly calledFunction: FunctionEntity;
    public readonly type: T;
    public readonly num: number;

    public constructor(calledFunction: FunctionEntity, type: T, num: number) {
        super(type);
        this.calledFunction = calledFunction;
        this.type = type;
        this.num = num;
        Util.assert(sameType(calledFunction.type.paramTypes[num], type), "Inconsistent type for ParameterEntity.");
    }

    public toString() {
        let definition = this.calledFunction.definition;
        if (definition) {
            return `The parameter ${definition.implementation.parameters[this.num].name} of the called function ${this.calledFunction.name}`
        }
        else {
            return `Parameter #${this.num+1} of the called function`;
        }
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) {
        // Getting the function at runtime already takes care of polymorphism for virtual functions
        // Note: rtConstruct.containingRuntimeFunction is not correct here since the lookup would occur
        // in the context of the calling function.
        var func = rtConstruct.sim.topFunction();

        if (!func) {
            return Util.assertFalse("ParameterEntity lookup failed because there were no functions on the execution stack.");
        }

        if (func.model.func !== this.calledFunction) {
            return Util.assertFalse("ParameterEntity looked up, but its corresponding function does not match the top function on the stack at runtime.");
        }

        // Look up the parameter (as a local variable) in the context of the top function on the stack.
        let paramObj = func.model.parameters[this.num].runtimeLookup(func);
        
        Util.assert(sameType(paramObj.type, this.type));
        return <CPPObject<T>>paramObj;
    }

    public describe() {
        return {message: "parameter " + this.num + " of " + this.calledFunction.describe().message};
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
        let desc : Description = {
            message: "element " + this.index + " of " + arrDesc.message
        };
        if (arrDesc.name){
            desc.name = arrDesc.name + "[" + this.index + "]";
        }
        return desc;
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

    constructor(type: T, creator: PotentialFullExpression, owner: PotentialFullExpression, description: string) {
        super(type);
        this.creator = creator;
        this.owner = owner;
        this.name = name; // TODO: change when I check over usages of .name and replace with description or something
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
        if (!(rtConstruct instanceof RuntimePotentialFullExpression)) {
            return assertFalse();
        }
        return <TemporaryObject<T>>rtConstruct.containingFullExpression.temporaryObjects[this.entityId];
    }

    public describe() {
        return {message: this.name}; // TOOD: eventually change implementation when I remove name
    }

}



export class FunctionEntity extends DeclaredEntity<FunctionType> {
    protected static readonly _name = "FunctionEntity";

    public readonly type!: FunctionType; // ! - Initialized by parent constructor

    public readonly definition?: FunctionDefinition; //TODO narrows type from base class, should be made abstract?

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
    // public getPointerTo() {
    //     return new Value(this, this.type);
    // }

    public isMain() {
        return this.getFullyQualifiedName() === "::main";
    }

    public describe() {
        return this.declaration.describe();
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


// TODO: Update this so it does not modify the arguments passed in. This is essential.

interface OverloadCandidateResult {
    readonly candidate: FunctionEntity;
    readonly notes: readonly Note[];
}

export interface OverloadResolutionResult {
    readonly candidates: OverloadCandidateResult[];
    readonly viable: FunctionEntity[];
    readonly selected: FunctionEntity;
}

export function overloadResolution(candidates: readonly FunctionEntity[], argTypes: readonly PotentialParameterType[], receiverType?: ClassType) : OverloadResolutionResult {

    // TODO: add these checks, and send errors back to construct that calls this if they aren't met
    // Should return the function selected as well as an array of object-typed params that contain
    // any implicit conversions necessary.
    
    // if (!allWellTyped(args)) {
    //     // If arguments are not well-typed, we can't continue onward to select a function
    //     // and create a function call, so instead just give up attach arguments here.
    //     this.attachAll(args);
    //     return;
    // }

    // if (!allObjectTyped(args)) {
    //     // Only object types may be passed as arguments to functions.
    //     this.addNote(CPPError.declaration.init.no_default_constructor(this, this.target)); // TODO: fix
    //     this.attachAll(args);
    //     return;
    // }

    // Find the constructor
    let viable: FunctionEntity[] = [];
    let resultCandidates : readonly OverloadCandidateResult[] = candidates.map((candidate) => {

        let tempArgs = [];
        var notes: Note[] = [];

        // Check argument types against parameter types
        let candidateParamTypes = candidate.type.paramTypes;
        if (argTypes.length !== candidateParamTypes.length) {
            notes.push(CPPError.param.numParams(candidate.declaration));
        }
        // TODO: add back in with member functions
        // else if (receiverType.isConst && cand instanceof MemberFunctionEntity && !cand.type.isThisConst){
        //     problems.push(CPPError.param.thisConst(cand.declaration));
        // }
        else{
            argTypes.forEach((argType, i) => {
                let candidateParamType = candidateParamTypes[i];
                if (candidateParamType.isReferenceType()) {
                    // tempArgs.push(args[i]);
                    if(!referenceCompatible(argType, candidateParamType.refTo)) {
                        notes.push(CPPError.param.paramReferenceType(candidate.declaration, argType, candidateParamType));
                    }
                    //else if (args[i].valueCategory !== "lvalue"){
                    //    problems.push(CPPError.param.paramReferenceLvalue(args[i]));
                    //}
                }
                else {
                    // tempArgs.push(standardConversion(args[i], argTypes[i]));
                    if(!isStandardConvertible(argType, candidateParamType)) {
                        notes.push(CPPError.param.paramType(candidate.declaration, argType, candidateParamType));
                    }

                }
            });
        }

        if (notes.length == 0) { // All notes in this function are errors, so if there are any it's not viable
            viable.push(candidate);
        }

        return {candidate: candidate, notes: notes};
    });

    let selected = viable.reduce((best, current) => {
        if (convLen(current.type.paramTypes) < convLen(best.type.paramTypes)) {
            return current;
        }
        else {
            return best;
        }
    });

    return {
        candidates: resultCandidates,
        viable: viable,
        selected: selected
    }
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