import { BoundedArrayType, AtomicType, PointerType, ArrayPointerType, ArrayElemType, Char, Int, CompleteObjectType, CompleteClassType } from "./types";
import { Observable } from "../util/observe";
import { Memory, Value, RawValueType } from "./runtimeEnvironment";
import { RuntimeConstruct } from "./constructs";
import { LocalVariableDefinition, CompiledGlobalVariableDefinition, ParameterDefinition } from "./declarations";
export interface ObjectDescription {
    name: string;
    message: string;
}
declare type ObjectValueRepresentation<T extends CompleteObjectType> = T extends AtomicType ? Value<T> : T extends BoundedArrayType<infer Elem_type> ? ObjectValueRepresentation<Elem_type>[] : T extends CompleteClassType ? {
    [index: string]: ObjectRawValueRepresentation<CompleteObjectType>;
} : never;
declare type ObjectRawValueRepresentation<T extends CompleteObjectType> = T extends AtomicType ? RawValueType : T extends BoundedArrayType<infer Elem_type> ? ObjectRawValueRepresentation<Elem_type>[] : T extends CompleteClassType ? {
    [index: string]: ObjectRawValueRepresentation<CompleteObjectType>;
} : unknown;
export declare abstract class CPPObject<T extends CompleteObjectType = CompleteObjectType> {
    readonly observable: Observable<string>;
    /**
     * Objects that result from a named declaration will have a name. For others
     * (e.g. dynamically allocated objects, temporary objects), this will be undefined.
     */
    readonly name?: string;
    readonly type: T;
    readonly size: number;
    readonly address: number;
    private readonly data;
    readonly isAlive: boolean;
    readonly deallocatedBy?: RuntimeConstruct;
    private _isValid;
    constructor(type: T, memory: Memory, address: number);
    getArrayElemSubobject<AT extends BoundedArrayType>(this: CPPObject<AT>, index: number): ArraySubobject<AT["elemType"]>;
    getArrayElemSubobjects<AT extends BoundedArrayType>(this: CPPObject<AT>): readonly ArraySubobject<AT["elemType"]>[];
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
    kill(rt?: RuntimeConstruct): void;
    getPointerTo(): Value<PointerType<T>>;
    getValue(read?: boolean): ObjectValueRepresentation<T>;
    rawValue(): ObjectRawValueRepresentation<T>;
    readValue(): ObjectValueRepresentation<T>;
    setValue<T_Atomic extends AtomicType>(this: CPPObject<T_Atomic>, newValue: Value<T_Atomic>, write?: boolean): void;
    _onValueSet(write: boolean): void;
    writeValue<T_Atomic extends AtomicType>(this: CPPObject<T_Atomic>, newValue: Value<T_Atomic>): void;
    isValueValid<T_Atomic extends AtomicType>(this: CPPObject<T_Atomic>): boolean;
    callReceived(): void;
    callEnded(): void;
    setValidity(valid: boolean): void;
    isTyped<NarrowedT extends CompleteObjectType>(predicate: (t: CompleteObjectType) => t is NarrowedT): this is CPPObject<NarrowedT>;
    abstract describe(): ObjectDescription;
}
export declare class AutoObject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {
    readonly name: string;
    readonly def: LocalVariableDefinition | ParameterDefinition;
    constructor(def: LocalVariableDefinition | ParameterDefinition, type: T, memory: Memory, address: number);
    describe(): ObjectDescription;
}
export declare class MainReturnObject extends CPPObject<Int> {
    constructor(memory: Memory);
    describe(): ObjectDescription;
}
export declare class StaticObject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {
    readonly def: CompiledGlobalVariableDefinition;
    readonly name: string;
    constructor(def: CompiledGlobalVariableDefinition, type: T, memory: Memory, address: number);
    describe(): ObjectDescription;
}
export declare class DynamicObject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {
    describe(): ObjectDescription;
}
export declare class InvalidObject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {
    constructor(type: T, memory: Memory, address: number);
    describe(): ObjectDescription;
}
export declare class ThisObject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {
    describe(): ObjectDescription;
}
export declare class StringLiteralObject extends CPPObject<BoundedArrayType<Char>> {
    constructor(type: BoundedArrayType<Char>, memory: Memory, address: number);
    describe(): ObjectDescription;
}
declare abstract class Subobject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {
    readonly containingObject: CPPObject<BoundedArrayType | CompleteClassType>;
    constructor(containingObject: CPPObject<BoundedArrayType | CompleteClassType>, type: T, memory: Memory, address: number);
    _onValueSet(write: boolean): void;
}
export declare class ArraySubobject<T extends ArrayElemType = ArrayElemType> extends Subobject<T> {
    readonly containingObject: CPPObject<BoundedArrayType<T>>;
    readonly index: number;
    constructor(arrObj: CPPObject<BoundedArrayType<T>>, index: number, memory: Memory, address: number);
    getPointerTo(): Value<ArrayPointerType<T>>;
    describe(): {
        name: string;
        message: string;
    };
}
export declare class BaseSubobject extends Subobject<CompleteClassType> {
    readonly containingObject: CPPObject<CompleteClassType>;
    constructor(containingObject: CPPObject<CompleteClassType>, type: CompleteClassType, memory: Memory, address: number);
    describe(): ObjectDescription;
}
export declare class MemberSubobject<T extends CompleteObjectType = CompleteObjectType> extends Subobject<T> {
    readonly containingObject: CPPObject<CompleteClassType>;
    readonly name: string;
    constructor(containingObject: CPPObject<CompleteClassType>, type: T, name: string, memory: Memory, address: number);
    describe(): {
        name: string;
        message: string;
    };
}
export declare class TemporaryObject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {
    private description;
    constructor(type: T, memory: Memory, address: number, description: string);
    describe(): ObjectDescription;
}
export {};
