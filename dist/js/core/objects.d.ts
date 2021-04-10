import { BoundedArrayType, AtomicType, PointerType, ArrayPointerType, ArrayElemType, Char, Int, CompleteObjectType, CompleteClassType } from "./types";
import { Observable } from "../util/observe";
import { Memory, Value, RawValueType } from "./runtimeEnvironment";
import { RuntimeConstruct } from "./constructs";
import { LocalVariableDefinition, CompiledGlobalVariableDefinition, ParameterDefinition } from "./declarations";
import { BoundReferenceEntity } from "./entities";
export interface ObjectDescription {
    name: string;
    message: string;
}
export declare type CPPObjectStorageKind = "automatic" | "dynamic" | "static" | "temporary" | "subobject" | "invalid";
declare type ObjectValueRepresentation<T extends CompleteObjectType> = T extends AtomicType ? Value<T> : T extends BoundedArrayType<infer Elem_type> ? ObjectValueRepresentation<Elem_type>[] : T extends CompleteClassType ? {
    [index: string]: ObjectRawValueRepresentation<CompleteObjectType>;
} : never;
declare type ObjectRawValueRepresentation<T extends CompleteObjectType> = T extends AtomicType ? RawValueType : T extends BoundedArrayType<infer Elem_type> ? ObjectRawValueRepresentation<Elem_type>[] : T extends CompleteClassType ? {
    [index: string]: ObjectRawValueRepresentation<CompleteObjectType>;
} : unknown;
export declare abstract class CPPObject<T extends CompleteObjectType = CompleteObjectType> {
    private static _nextObjectId;
    readonly observable: Observable<string>;
    /**
     * Objects that result from a named declaration will have a name. For others
     * (e.g. dynamically allocated objects, temporary objects), this will be undefined.
     */
    readonly name?: string;
    readonly type: T;
    readonly size: number;
    readonly address: number;
    readonly objectId: number;
    abstract readonly storageKind: CPPObjectStorageKind;
    private readonly data;
    readonly isAlive: boolean;
    readonly deallocatedBy?: RuntimeConstruct;
    private _isValid;
    constructor(type: T, memory: Memory, address: number);
    getArrayElemSubobject<AT extends BoundedArrayType>(this: CPPObject<AT>, index: number): ArraySubobject<AT["elemType"]>;
    getArrayElemSubobjects<AT extends BoundedArrayType>(this: CPPObject<AT>): readonly ArraySubobject<AT["elemType"]>[];
    numArrayElemSubobjects<AT extends BoundedArrayType>(this: CPPObject<AT>): number;
    getArrayElemSubobjectByAddress<AT extends BoundedArrayType>(this: CPPObject<AT>, address: number): ArraySubobject<AT["elemType"]>;
    /**
     * Only allowed if receiver matches CPPObject<CompleteClassType>
     * Note that this returns CPPObject rather than MemberSubobject because
     * a reference member may refer to an external object that is not a subobject
     * @param this
     * @param name
     */
    getMemberObject(this: CPPObject<CompleteClassType>, name: string): CPPObject<CompleteObjectType> | undefined;
    bindMemberReference(this: CPPObject<CompleteClassType>, name: string, obj: CPPObject<CompleteObjectType>): void;
    getBaseSubobject(this: CPPObject<CompleteClassType>): BaseSubobject | undefined;
    subobjectValueWritten(): void;
    toString(): string;
    beginLifetime(): void;
    kill(rt?: RuntimeConstruct): void;
    getPointerTo(): Value<PointerType<T>>;
    decayToPointer<AT extends BoundedArrayType>(this: CPPObject<AT>): Value<ArrayPointerType<AT["elemType"]>>;
    getValue(read?: boolean): ObjectValueRepresentation<T>;
    rawValue(): ObjectRawValueRepresentation<T>;
    readValue(): ObjectValueRepresentation<T>;
    setValue<T_Atomic extends AtomicType>(this: CPPObject<T_Atomic>, newValue: Value<T_Atomic>, write?: boolean): void;
    _onValueSet(write: boolean): void;
    writeValue<T_Atomic extends AtomicType>(this: CPPObject<T_Atomic>, newValue: Value<T_Atomic>): void;
    /**
     * Begins this object's lifetime and initializes its value.
     * May only be called on objects of atomic type.
     * @param this
     * @param newValue
     */
    initializeValue<T_Atomic extends AtomicType>(this: CPPObject<T_Atomic>, newValue: Value<T_Atomic>): void;
    zeroInitialize(): void;
    isValueValid<T_Atomic extends AtomicType>(this: CPPObject<T_Atomic>): boolean;
    callReceived(): void;
    callEnded(): void;
    setValidity(valid: boolean): void;
    abstract isTyped<NarrowedT extends CompleteObjectType>(predicate: (t: CompleteObjectType) => t is NarrowedT): this is CPPObject<NarrowedT>;
    hasStorage(storageKind: "dynamic"): this is DynamicObject;
    hasStorage(storageKind: "automatic"): this is AutoObject;
    hasStorage(storageKind: "subobject"): this is Subobject;
    hasStorage(storageKind: "temporary"): this is TemporaryObject;
    hasStorage(storageKind: "invalid"): this is InvalidObject;
    /**
     * Notify this object that a reference has been bound to it
     */
    onReferenceBound(entity: BoundReferenceEntity): void;
    /**
     * Notify this object that a reference has been unbound from it
     * (e.g. that reference went out of scope)
     */
    onReferenceUnbound(entity: BoundReferenceEntity): void;
    abstract describe(): ObjectDescription;
}
export declare class AutoObject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {
    readonly storageKind = "automatic";
    readonly name: string;
    readonly def: LocalVariableDefinition | ParameterDefinition;
    constructor(def: LocalVariableDefinition | ParameterDefinition, type: T, memory: Memory, address: number);
    describe(): ObjectDescription;
    isTyped<NarrowedT extends CompleteObjectType>(predicate: (t: CompleteObjectType) => t is NarrowedT): this is AutoObject<NarrowedT>;
}
export declare class MainReturnObject extends CPPObject<Int> {
    readonly storageKind = "static";
    constructor(memory: Memory);
    isTyped<NarrowedT extends Int>(predicate: (t: Int) => t is NarrowedT): this is MainReturnObject;
    isTyped<NarrowedT extends CompleteObjectType>(predicate: (t: CompleteObjectType) => t is NarrowedT): this is never;
    describe(): ObjectDescription;
}
export declare class StaticObject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {
    readonly def: CompiledGlobalVariableDefinition;
    readonly storageKind = "static";
    readonly name: string;
    constructor(def: CompiledGlobalVariableDefinition, type: T, memory: Memory, address: number);
    isTyped<NarrowedT extends CompleteObjectType>(predicate: (t: CompleteObjectType) => t is NarrowedT): this is StaticObject<NarrowedT>;
    describe(): ObjectDescription;
}
export declare class DynamicObject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {
    readonly storageKind = "dynamic";
    isTyped<NarrowedT extends CompleteObjectType>(predicate: (t: CompleteObjectType) => t is NarrowedT): this is DynamicObject<NarrowedT>;
    describe(): ObjectDescription;
}
export declare class InvalidObject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {
    readonly storageKind = "invalid";
    constructor(type: T, memory: Memory, address: number);
    isTyped<NarrowedT extends CompleteObjectType>(predicate: (t: CompleteObjectType) => t is NarrowedT): this is InvalidObject<NarrowedT>;
    describe(): ObjectDescription;
}
export declare class StringLiteralObject extends CPPObject<BoundedArrayType<Char>> {
    readonly storageKind = "static";
    constructor(type: BoundedArrayType<Char>, memory: Memory, address: number);
    isTyped<NarrowedT extends BoundedArrayType<Char>>(predicate: (t: BoundedArrayType<Char>) => t is NarrowedT): this is StringLiteralObject;
    isTyped<NarrowedT extends CompleteObjectType>(predicate: (t: CompleteObjectType) => t is NarrowedT): this is never;
    describe(): ObjectDescription;
}
declare abstract class Subobject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {
    readonly storageKind = "subobject";
    readonly containingObject: CPPObject<BoundedArrayType | CompleteClassType>;
    constructor(containingObject: CPPObject<BoundedArrayType | CompleteClassType>, type: T, memory: Memory, address: number);
    _onValueSet(write: boolean): void;
}
export declare class ArraySubobject<T extends ArrayElemType = ArrayElemType> extends Subobject<T> {
    readonly containingObject: CPPObject<BoundedArrayType<T>>;
    readonly index: number;
    constructor(arrObj: CPPObject<BoundedArrayType<T>>, index: number, memory: Memory, address: number);
    getPointerTo(): Value<ArrayPointerType<T>>;
    isTyped<NarrowedT extends ArrayElemType>(predicate: (t: ArrayElemType) => t is NarrowedT): this is ArraySubobject<NarrowedT>;
    isTyped<NarrowedT extends CompleteObjectType>(predicate: (t: CompleteObjectType) => t is NarrowedT): this is never;
    describe(): {
        name: string;
        message: string;
    };
}
export declare class BaseSubobject extends Subobject<CompleteClassType> {
    readonly containingObject: CPPObject<CompleteClassType>;
    constructor(containingObject: CPPObject<CompleteClassType>, type: CompleteClassType, memory: Memory, address: number);
    isTyped<NarrowedT extends CompleteClassType>(predicate: (t: CompleteClassType) => t is NarrowedT): this is BaseSubobject;
    isTyped<NarrowedT extends CompleteObjectType>(predicate: (t: CompleteObjectType) => t is NarrowedT): this is never;
    describe(): ObjectDescription;
}
export declare class MemberSubobject<T extends CompleteObjectType = CompleteObjectType> extends Subobject<T> {
    readonly containingObject: CPPObject<CompleteClassType>;
    readonly name: string;
    constructor(containingObject: CPPObject<CompleteClassType>, type: T, name: string, memory: Memory, address: number);
    isTyped<NarrowedT extends CompleteObjectType>(predicate: (t: CompleteObjectType) => t is NarrowedT): this is MemberSubobject<NarrowedT>;
    describe(): {
        name: string;
        message: string;
    };
}
export declare class TemporaryObject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {
    readonly storageKind = "temporary";
    private description;
    constructor(type: T, memory: Memory, address: number, description: string);
    isTyped<NarrowedT extends CompleteObjectType>(predicate: (t: CompleteObjectType) => t is NarrowedT): this is TemporaryObject<NarrowedT>;
    describe(): ObjectDescription;
}
export {};
