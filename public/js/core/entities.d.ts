import { PotentialParameterType, Type, CompleteObjectType, ReferenceType, BoundedArrayType, ArrayElemType, FunctionType, PotentiallyCompleteClassType, CompleteClassType, VoidType, CompleteReturnType } from "./types";
import { Observable } from "../util/observe";
import { RuntimeConstruct } from "./constructs";
import { PotentialFullExpression, RuntimePotentialFullExpression } from "./PotentialFullExpression";
import { LocalVariableDefinition, ParameterDefinition, GlobalVariableDefinition, FunctionDefinition, FunctionDeclaration, ClassDefinition, FunctionDefinitionGroup, ClassDeclaration, MemberVariableDeclaration } from "./declarations";
import { CPPObject, AutoObject, StaticObject, TemporaryObject, ArraySubobject, BaseSubobject } from "./objects";
import { CompilerNote } from "./errors";
import { TranslationUnit } from "./Program";
import { FunctionCall } from "./functionCall";
interface NormalLookupOptions {
    readonly kind: "normal";
    readonly noParent?: boolean;
    readonly noBase?: boolean;
}
interface ExactLookupOptions {
    readonly kind: "exact";
    readonly noParent?: boolean;
    readonly noBase?: boolean;
    readonly paramTypes: readonly PotentialParameterType[];
    readonly receiverType?: CompleteClassType;
}
export declare type NameLookupOptions = NormalLookupOptions | ExactLookupOptions;
/**
 * Discriminated union over entities introduced into a scope by a declaration.
 * Discriminated by .declarationKind property.
 */
export declare type DeclaredEntity = VariableEntity | FunctionEntity | ClassEntity;
/**
 * Possible results of name lookup.
 */
export declare type DeclaredScopeEntry = VariableEntity | FunctionOverloadGroup | ClassEntity;
export declare class Scope {
    private readonly entities;
    private readonly hiddenClassEntities;
    private readonly typeEntities;
    readonly translationUnit: TranslationUnit;
    readonly parent?: Scope;
    constructor(translationUnit: TranslationUnit, parent?: Scope);
    /** Attempts to declare a variable in this scope.
     * @param newEntity The variable being declared.
     * @returns Either the entity that was added, or an existing one already there, assuming it was compatible.
     * If an error prevents the entity being added successfully, returns the error instead. (e.g. A previous
     * declaration with the same name but a different type.)
     */
    declareVariableEntity<EntityT extends VariableEntity>(newEntity: EntityT): EntityT | CompilerNote;
    protected variableEntityCreated(newEntity: VariableEntity): void;
    /** Attempts to declare a function in this scope.
     * @param newEntity - The function being declared.
     * @returns Either the entity that was added, or an existing one already there, assuming it was compatible.
     * If an error prevents the entity being added successfully, returns the error instead. (e.g. A previous
     * function declaration with the same signature but a different return type.)
     */
    declareFunctionEntity(newEntity: FunctionEntity): FunctionEntity<FunctionType<import("./types").PotentialReturnType>> | CompilerNote;
    /** Attempts to declare a class in this scope. TODO docs: this documentation is out of date
     * @param newEntity - The class being declared.
     * @returns Either the entity that was added, or an existing one already there, assuming it was compatible.
     * If an error prevents the entity being added successfully. (e.g. An error due to
     * multiple definitions of the same class within a single translation unit.)
     */
    declareClassEntity(newEntity: ClassEntity): ClassEntity | CompilerNote;
    protected classEntityCreated(newEntity: ClassEntity): void;
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
    lookup(name: string, options?: NameLookupOptions): DeclaredScopeEntry | undefined;
}
export declare class BlockScope extends Scope {
}
export declare class NamespaceScope extends Scope {
    readonly name: string;
    constructor(translationUnit: TranslationUnit, name: string, parent?: NamespaceScope);
    protected variableEntityCreated(newEntity: VariableEntity): void;
}
export declare class ClassScope extends Scope {
    readonly name: string;
    readonly base?: ClassScope;
    /**
     *
     * @param translationUnit
     * @param name The unqualified name of the class
     * @param parent
     * @param base
     */
    constructor(translationUnit: TranslationUnit, name: string, parent?: Scope | ClassScope, base?: ClassScope);
    protected variableEntityCreated(newEntity: VariableEntity): void;
    /**
     * Performs unqualified name lookup of a given name in this class scope. The
     * behavior and customization options are similar to `lookup()` in the Scope
     * class, except that the base class scope (if it exists) will be searched
     * before parent scopes.
     * @param name An unqualified name to be looked up.
     * @param options A set of options to customize the lookup process.
     */
    lookup(name: string, options?: NameLookupOptions): DeclaredScopeEntry | undefined;
}
export interface EntityDescription {
    name: string;
    message: string;
}
export declare type EntityID = number;
export declare abstract class CPPEntity<T extends Type = Type> {
    private static _nextEntityId;
    readonly observable: Observable<string>;
    readonly entityId: number;
    readonly type: T;
    /**
     * Most entities will have a natural type, but a few will not (e.g. namespaces). In this case,
     * I haven't decided what to do.
     * TODO: fix this - there should probably be a subtype or interface for a TypedEntity
     */
    constructor(type: T);
    abstract describe(): EntityDescription;
}
export declare abstract class NamedEntity<T extends Type = Type> extends CPPEntity<T> {
    readonly name: string;
    /**
     * All NamedEntitys will have a name, but in some cases this might be "". e.g. an unnamed namespace.
     */
    constructor(type: T, name: string);
}
export declare type DeclarationKind = "variable" | "function" | "class";
declare abstract class DeclaredEntityBase<T extends Type = Type> extends NamedEntity<T> {
    abstract readonly declarationKind: DeclarationKind;
    constructor(type: T, name: string);
}
export declare class FunctionOverloadGroup {
    readonly declarationKind = "function";
    readonly name: string;
    private readonly _overloads;
    readonly overloads: readonly FunctionEntity[];
    constructor(overloads: readonly FunctionEntity[]);
    addOverload(overload: FunctionEntity): void;
    /**
     * Selects a function from the given overload group based on the signature of
     * the provided function type. (Note there's no consideration of function names here.)
     * WARNING: This function does NOT perform overload resolution. For example, it does
     * not consider the possibility of implicit conversions, which is a part of full overload
     * resolution. It simply looks for an overload with a matching signature.
     */
    selectOverloadBySignature(type: FunctionType): FunctionEntity | undefined;
}
export declare type ObjectEntityType = CompleteObjectType | ReferenceType;
export interface ObjectEntity<T extends CompleteObjectType = CompleteObjectType> extends CPPEntity<T> {
    runtimeLookup(rtConstruct: RuntimeConstruct): CPPObject<T>;
    readonly variableKind: "object";
}
export interface BoundReferenceEntity<T extends ReferenceType = ReferenceType> extends CPPEntity<T> {
    runtimeLookup<X extends CompleteObjectType>(this: BoundReferenceEntity<ReferenceType<X>>, rtConstrcut: RuntimeConstruct): CPPObject<X>;
    readonly variableKind: "reference";
}
export interface UnboundReferenceEntity<T extends ReferenceType = ReferenceType> extends CPPEntity<T> {
    bindTo<X extends CompleteObjectType>(this: UnboundReferenceEntity<ReferenceType<X>>, rtConstruct: RuntimeConstruct, obj: CPPObject<X>): void;
}
export declare function runtimeObjectLookup<T extends CompleteObjectType>(entity: ObjectEntity<T> | BoundReferenceEntity<ReferenceType<T>>, rtConstruct: RuntimeConstruct): CPPObject<T>;
declare abstract class VariableEntityBase<T extends ObjectEntityType = ObjectEntityType> extends DeclaredEntityBase<T> {
    readonly declarationKind = "variable";
    abstract readonly variableKind: "reference" | "object";
    abstract readonly variableLocation: "local" | "global" | "member";
}
export declare class LocalObjectEntity<T extends CompleteObjectType = CompleteObjectType> extends VariableEntityBase<T> implements ObjectEntity<T> {
    readonly variableKind = "object";
    readonly variableLocation = "local";
    readonly isParameter: boolean;
    readonly firstDeclaration: LocalVariableDefinition | ParameterDefinition;
    readonly declarations: readonly LocalVariableDefinition[] | readonly ParameterDefinition[];
    readonly definition: LocalVariableDefinition | ParameterDefinition;
    constructor(type: T, def: LocalVariableDefinition | ParameterDefinition, isParameter?: boolean);
    toString(): string;
    mergeInto(existingEntity: VariableEntity): CompilerNote;
    runtimeLookup(rtConstruct: RuntimeConstruct): AutoObject<T>;
    describe(): {
        name: string;
        message: string;
    };
}
export declare class LocalReferenceEntity<T extends ReferenceType = ReferenceType> extends VariableEntityBase<T> implements BoundReferenceEntity<T>, UnboundReferenceEntity<T> {
    readonly variableKind = "reference";
    readonly variableLocation = "local";
    readonly isParameter: boolean;
    readonly firstDeclaration: LocalVariableDefinition | ParameterDefinition;
    readonly declarations: readonly LocalVariableDefinition[] | readonly ParameterDefinition[];
    readonly definition: LocalVariableDefinition | ParameterDefinition;
    constructor(type: T, def: LocalVariableDefinition | ParameterDefinition, isParameter?: boolean);
    mergeInto(existingEntity: VariableEntity): CompilerNote;
    bindTo<X extends CompleteObjectType>(this: LocalReferenceEntity<ReferenceType<X>>, rtConstruct: RuntimeConstruct, obj: CPPObject<X>): void;
    runtimeLookup<X extends CompleteObjectType>(this: LocalReferenceEntity<ReferenceType<X>>, rtConstruct: RuntimeConstruct): CPPObject<X>;
    describe(): {
        name: string;
        message: string;
    };
}
export declare type LocalVariableEntity = LocalObjectEntity | LocalReferenceEntity;
export declare class GlobalObjectEntity<T extends CompleteObjectType = CompleteObjectType> extends VariableEntityBase<T> {
    readonly variableKind = "object";
    readonly variableLocation = "global";
    readonly qualifiedName: string;
    readonly firstDeclaration: GlobalVariableDefinition;
    readonly declarations: readonly GlobalVariableDefinition[];
    readonly definition?: GlobalVariableDefinition;
    constructor(type: T, decl: GlobalVariableDefinition);
    toString(): string;
    mergeInto(existingEntity: VariableEntity): VariableEntity | CompilerNote;
    registerWithLinker(): void;
    link(def: GlobalVariableDefinition | undefined): void;
    runtimeLookup(rtConstruct: RuntimeConstruct): StaticObject<T>;
    describe(): {
        name: string;
        message: string;
    };
}
export declare type MemberVariableEntity = MemberObjectEntity | MemberReferenceEntity;
export declare type VariableEntity = LocalVariableEntity | GlobalObjectEntity | MemberVariableEntity;
/**
 * Looking this entity up at runtime yields the return object of the containing runtime function.
 * Note this is generally only something you would want in the context of a return-by-value
 * function, in which case the return object is a temporary object created to eventually be initialized
 * with the returned value. In a pass-by-reference function, the return object will only exist once the
 * return has been processed and it is set to the returned object. In void function, there is no return
 * object.
 * @throws Throws an exception if the return object does not exist.
 */
export declare class ReturnObjectEntity<T extends CompleteObjectType = CompleteObjectType> extends CPPEntity<T> implements ObjectEntity<T> {
    readonly variableKind = "object";
    runtimeLookup(rtConstruct: RuntimeConstruct): CPPObject<T>;
    describe(): {
        name: string;
        message: string;
    };
}
export declare class ReturnByReferenceEntity<T extends ReferenceType = ReferenceType> extends CPPEntity<T> implements UnboundReferenceEntity<T> {
    bindTo<X extends CompleteObjectType>(this: ReturnByReferenceEntity<ReferenceType<X>>, rtConstruct: RuntimeConstruct, obj: CPPObject<X>): void;
    describe(): {
        name: string;
        message: string;
    };
}
export declare class PassByValueParameterEntity<T extends CompleteObjectType = CompleteObjectType> extends CPPEntity<T> implements ObjectEntity<T> {
    readonly variableKind = "object";
    readonly calledFunction: FunctionEntity;
    readonly type: T;
    readonly num: number;
    constructor(calledFunction: FunctionEntity, type: T, num: number);
    runtimeLookup(rtConstruct: RuntimeConstruct): AutoObject<T>;
    describe(): {
        name: string;
        message: string;
    };
}
export declare class PassByReferenceParameterEntity<T extends ReferenceType = ReferenceType> extends CPPEntity<T> implements UnboundReferenceEntity<T> {
    readonly calledFunction: FunctionEntity;
    readonly num: number;
    constructor(calledFunction: FunctionEntity, type: T, num: number);
    bindTo<X extends CompleteObjectType>(this: PassByReferenceParameterEntity<ReferenceType<X>>, rtConstruct: RuntimeConstruct, obj: CPPObject<X>): void;
    describe(): {
        name: string;
        message: string;
    };
}
export declare class ReceiverEntity extends CPPEntity<CompleteClassType> implements ObjectEntity<CompleteClassType> {
    readonly variableKind = "object";
    constructor(type: CompleteClassType);
    toString(): string;
    runtimeLookup(rtConstruct: RuntimeConstruct): CPPObject<CompleteClassType>;
    describe(): {
        name: string;
        message: string;
    };
}
export declare class ArraySubobjectEntity<T extends ArrayElemType = ArrayElemType> extends CPPEntity<T> implements ObjectEntity<T> {
    readonly variableKind = "object";
    readonly arrayEntity: ObjectEntity<BoundedArrayType<T>>;
    readonly index: number;
    constructor(arrayEntity: ObjectEntity<BoundedArrayType<T>>, index: number);
    runtimeLookup(rtConstruct: RuntimeConstruct): ArraySubobject<T>;
    describe(): {
        name: string;
        message: string;
    };
}
export declare class BaseSubobjectEntity extends CPPEntity<CompleteClassType> implements ObjectEntity<CompleteClassType> {
    readonly variableKind = "object";
    readonly containingEntity: ObjectEntity<CompleteClassType>;
    constructor(containingEntity: ObjectEntity<CompleteClassType>, type: CompleteClassType);
    runtimeLookup(rtConstruct: RuntimeConstruct): BaseSubobject;
    describe(): {
        name: string;
        message: string;
    };
}
export declare class MemberAccessEntity<T extends CompleteObjectType = CompleteObjectType> extends CPPEntity<T> implements ObjectEntity<T> {
    readonly variableKind = "object";
    readonly containingEntity: ObjectEntity<CompleteClassType>;
    readonly name: string;
    constructor(containingEntity: ObjectEntity<CompleteClassType>, type: T, name: string);
    runtimeLookup(rtConstruct: RuntimeConstruct): CPPObject<T>;
    describe(): {
        name: string;
        message: string;
    };
}
declare abstract class MemberVariableEntityBase<T extends ObjectEntityType = ObjectEntityType> extends VariableEntityBase<T> {
    readonly variableLocation = "member";
    readonly firstDeclaration: MemberVariableDeclaration;
    readonly declarations: readonly MemberVariableDeclaration[];
    readonly definition: undefined;
    constructor(type: T, decl: MemberVariableDeclaration);
    toString(): string;
    mergeInto(existingEntity: VariableEntity): CompilerNote;
    describe(): {
        name: string;
        message: string;
    };
}
export declare class MemberObjectEntity<T extends CompleteObjectType = CompleteObjectType> extends MemberVariableEntityBase<T> {
    readonly variableKind = "object";
    runtimeLookup(rtConstruct: RuntimeConstruct): CPPObject<T>;
}
export declare class MemberReferenceEntity<T extends ReferenceType = ReferenceType> extends MemberVariableEntityBase<T> implements BoundReferenceEntity<T>, UnboundReferenceEntity<T> {
    readonly variableKind = "reference";
    runtimeLookup<X extends CompleteObjectType>(this: MemberReferenceEntity<ReferenceType<X>>, rtConstruct: RuntimeConstruct): CPPObject<X>;
    bindTo<X extends CompleteObjectType>(this: MemberReferenceEntity<ReferenceType<X>>, rtConstruct: RuntimeConstruct, obj: CPPObject<X>): void;
}
export declare class TemporaryObjectEntity<T extends CompleteObjectType = CompleteObjectType> extends CPPEntity<T> implements ObjectEntity<T> {
    readonly variableKind = "object";
    protected static readonly _name = "TemporaryObjectEntity";
    readonly creator: PotentialFullExpression;
    readonly owner: PotentialFullExpression;
    readonly name: string;
    constructor(type: T, creator: PotentialFullExpression, owner: PotentialFullExpression, name: string);
    setOwner(newOwner: PotentialFullExpression): void;
    objectInstance(creatorRt: RuntimePotentialFullExpression): TemporaryObject<T>;
    runtimeLookup(rtConstruct: RuntimeConstruct): TemporaryObject<T>;
    describe(): {
        name: string;
        message: string;
    };
}
export declare class FunctionEntity<T extends FunctionType = FunctionType> extends DeclaredEntityBase<T> {
    readonly declarationKind = "function";
    readonly qualifiedName: string;
    readonly firstDeclaration: FunctionDeclaration;
    readonly declarations: readonly FunctionDeclaration[];
    readonly definition?: FunctionDefinition;
    readonly isConstructor: boolean;
    readonly isOdrUsed: boolean;
    readonly isImplicit: boolean;
    readonly isUserDefined: boolean;
    constructor(type: T, decl: FunctionDeclaration);
    addDeclaration(decl: FunctionDeclaration): void;
    addDeclarations(decls: readonly FunctionDeclaration[]): void;
    isStaticallyBound(): boolean;
    get isVirtual(): boolean;
    toString(): string;
    mergeInto(overloadGroup: FunctionOverloadGroup): FunctionEntity | CompilerNote;
    setDefinition(def: FunctionDefinition): void;
    registerWithLinker(): void;
    link(def: FunctionDefinitionGroup | undefined): void;
    isMain(): boolean;
    isMemberFunction(): boolean;
    registerCall(call: FunctionCall): void;
    returnsVoid(): this is FunctionEntity<FunctionType<VoidType>>;
    returnsCompleteType(): this is FunctionEntity<FunctionType<CompleteReturnType>>;
    describe(): EntityDescription;
}
export declare class ClassEntity extends DeclaredEntityBase<PotentiallyCompleteClassType> {
    readonly declarationKind = "class";
    readonly qualifiedName: string;
    readonly firstDeclaration: ClassDeclaration;
    readonly declarations: readonly ClassDeclaration[];
    readonly definition?: ClassDefinition;
    constructor(decl: ClassDeclaration);
    isComplete(): this is CompleteClassEntity;
    toString(): string;
    addDeclaration(decl: ClassDeclaration): void;
    addDeclarations(decls: readonly ClassDeclaration[]): void;
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
    mergeInto(existingEntity: ClassEntity): ClassEntity | CompilerNote;
    setDefinition(def: ClassDefinition): void;
    registerWithLinker(): void;
    link(def: ClassDefinition | undefined): void;
    isMain(): boolean;
    describe(): EntityDescription;
}
export interface CompleteClassEntity extends ClassEntity {
    readonly type: CompleteClassType;
    readonly definition: ClassDefinition;
}
/**
 * Selects a function from the given overload group based on the signature of
 * the provided function type. (Note there's no consideration of function names here.)
 */
export declare function selectOverloadedDefinition(overloadGroup: readonly FunctionDefinition[], type: FunctionType): FunctionDefinition | undefined;
export {};
