import { Observable } from "../util/observe";
import { CPPObject, AutoObject, StringLiteralObject, StaticObject, TemporaryObject, DynamicObject, InvalidObject, ArraySubobject } from "./objects";
import { Bool, ObjectPointerType, ArrayPointerType, PointerType, AtomicType, IntegralType, Int, ArrayElemType, ReferenceType, PointerToCompleteType, CompleteObjectType } from "./types";
import { GlobalObjectEntity, LocalObjectEntity, LocalReferenceEntity, TemporaryObjectEntity } from "./entities";
import { RuntimeConstruct } from "./constructs";
import { CompiledGlobalVariableDefinition } from "./declarations";
import { RuntimeFunction } from "./functions";
export declare type byte = number;
export declare type RawValueType = number;
export declare class Value<T extends AtomicType = AtomicType> {
    private static _name;
    readonly type: T;
    private readonly _isValid;
    readonly rawValue: RawValueType;
    constructor(rawValue: RawValueType, type: T, isValid?: boolean);
    get isValid(): boolean;
    isTyped<NarrowedT extends AtomicType>(predicate: (t: AtomicType) => t is NarrowedT): this is Value<NarrowedT>;
    clone(valueToClone?: RawValueType): Value<T>;
    cvUnqualified(): Value<T>;
    cvQualified(isConst: boolean, isVolatile?: boolean): Value<T>;
    invalidated(): Value<T>;
    equals(otherValue: Value<T>): Value<Bool>;
    rawEquals(otherRawValue: RawValueType): boolean;
    combine(otherValue: Value<T>, combiner: (a: RawValueType, b: RawValueType) => RawValueType): Value<T>;
    pointerOffset<T extends PointerToCompleteType>(this: Value<T>, offsetValue: Value<IntegralType>, subtract?: boolean): Value<T>;
    pointerOffsetRaw<T extends PointerToCompleteType>(this: Value<T>, rawOffsetValue: number, subtract?: boolean): Value<T>;
    pointerDifference(this: Value<PointerToCompleteType>, otherValue: Value<PointerToCompleteType>): Value<Int>;
    compare(otherValue: Value<T>, comparer: (a: RawValueType, b: RawValueType) => boolean): Value<Bool>;
    modify(modifier: (a: RawValueType) => RawValueType): Value<T>;
    add(otherValue: Value<T>): Value<T>;
    addRaw(x: number): Value<T>;
    sub(otherValue: Value<T>): Value<T>;
    subRaw(x: number): Value<T>;
    arithmeticNegate(): Value<T>;
    logicalNot(): Value<T>;
    toString(): string;
    valueString(): string;
    valueToOstreamString(): string;
    /**
     * This should be used VERY RARELY. The only time to use it is if you have a temporary Value instance
     * that you're using locally and want to keep updating its raw value to something else before passing
     * to something like memory.dereference(). For example, this is done when traversing through a cstring by
     * getting the value of the pointer initially, then ad hoc updating that value as you move through the cstring.
     */
    setRawValue(rawValue: RawValueType): void;
    describe(): {
        message: string;
    };
}
export declare class Memory {
    private static _name;
    readonly observable: Observable<string>;
    readonly capacity: number;
    readonly staticCapacity: number;
    readonly stackCapacity: number;
    readonly heapCapacity: number;
    readonly staticStart: number;
    readonly staticEnd: number;
    readonly stackStart: number;
    readonly stackEnd: number;
    readonly heapStart: number;
    readonly heapEnd: number;
    readonly temporaryStart: number;
    readonly temporaryCapacity: number;
    readonly temporaryEnd: number;
    private bytes;
    private objects;
    private stringLiteralMap;
    private staticObjects;
    private temporaryObjects;
    readonly stack: MemoryStack;
    readonly heap: MemoryHeap;
    private staticTop;
    private temporaryBottom;
    constructor(capacity?: number, staticCapacity?: number, stackCapacity?: number);
    reset(): void;
    getByte(addr: number): number;
    readByte(addr: number): number;
    getBytes(addr: number, num: number): number[];
    readBytes(addr: number, num: number): number[];
    setByte(addr: number, value: RawValueType): void;
    writeByte(addr: number, value: RawValueType): void;
    setBytes(addr: number, values: RawValueType[]): void;
    writeBytes(addr: number, values: RawValueType[]): void;
    dereference<Elem_type extends ArrayElemType>(ptr: Value<ArrayPointerType<Elem_type>>): ArraySubobject<Elem_type>;
    dereference<T extends CompleteObjectType>(ptr: Value<ObjectPointerType<T>>): CPPObject<T>;
    dereference<T extends CompleteObjectType>(ptr: Value<PointerType<T>>): CPPObject<T> | InvalidObject<T>;
    allocateObject(object: CPPObject<CompleteObjectType>): void;
    /**
     * Ends the lifetime of an object at the given address. Its data actually remains in memory, but is marked as dead and invalid.
     * If no object exists at the given address, does nothing. If the object is already dead, does nothing.
     * @param addr
     * @param killer The runtime construct that killed the object
     */
    killObject(addr: number, killer?: RuntimeConstruct): void;
    /**
     * Allocates and returns a string literal object, unless a string literal with exactly
     * the same contents has already been allocated, in which case that same object is returned.
     * @param contents
     */
    allocateStringLiteral(contents: string): StringLiteralObject;
    getStringLiteral(str: string): StringLiteralObject | undefined;
    allocateStatic(def: CompiledGlobalVariableDefinition): void;
    staticLookup<T extends CompleteObjectType>(staticEntity: GlobalObjectEntity<T>): StaticObject<T>;
    allocateTemporaryObject<T extends CompleteObjectType>(tempEntity: TemporaryObjectEntity<T>): TemporaryObject<T>;
    deallocateTemporaryObject(obj: TemporaryObject, killer?: RuntimeConstruct): void;
    printObjects(): string;
}
declare class MemoryStack {
    private static readonly _name;
    readonly observable: Observable<string>;
    private top;
    private readonly start;
    private readonly memory;
    private readonly _frames;
    readonly frames: readonly MemoryFrame[];
    constructor(memory: Memory, start: number);
    topFrame(): MemoryFrame | undefined;
    pushFrame(rtFunc: RuntimeFunction): MemoryFrame;
    popFrame(rtConstruct: RuntimeConstruct): undefined;
    toString(): string;
}
declare class MemoryHeap {
    private static readonly _name;
    readonly observable: Observable<string>;
    private bottom;
    private readonly end;
    private readonly memory;
    readonly objectMap: {
        [index: number]: DynamicObject;
    };
    constructor(memory: Memory, end: number);
    allocateNewObject<T extends CompleteObjectType>(type: T): DynamicObject<T>;
    deleteObject(addr: number, killer?: RuntimeConstruct): DynamicObject<CompleteObjectType>;
}
export declare class MemoryFrame {
    private static readonly _name;
    readonly observable: Observable<"referenceBound">;
    private readonly start;
    private readonly end;
    private readonly memory;
    readonly func: RuntimeFunction;
    readonly size: number;
    readonly localObjects: readonly AutoObject[];
    private readonly localObjectsByEntityId;
    private readonly localReferencesByEntityId;
    constructor(memory: Memory, start: number, rtFunc: RuntimeFunction);
    toString(): string;
    localObjectLookup<T extends CompleteObjectType>(entity: LocalObjectEntity<T>): AutoObject<T>;
    initializeLocalObject<T extends AtomicType>(entity: LocalObjectEntity<T>, newValue: Value<T>): void;
    localReferenceLookup<T extends CompleteObjectType>(entity: LocalReferenceEntity<ReferenceType<T>>): CPPObject<T>;
    bindLocalReference(entity: LocalReferenceEntity, obj: CPPObject): void;
    pop(rtConstruct: RuntimeConstruct): void;
}
export {};
