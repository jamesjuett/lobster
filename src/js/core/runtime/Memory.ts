import { assert, assertFalse, Mutable, CPPRandom } from "../../util/util";
import { Observable } from "../../util/observe";
import { CPPObject, AutoObject, StringLiteralObject, StaticObject, TemporaryObject, DynamicObject, InvalidObject, ArraySubobject } from "./objects";
import { Char, ObjectPointerType, ArrayPointerType, similarType, subType, PointerType, AtomicType, ArrayElemType, BoundedArrayType, ReferenceType, PointerToCompleteType, CompleteObjectType } from "../compilation/types";
import last from "lodash/last";
import { GlobalObjectEntity, LocalObjectEntity, LocalReferenceEntity, TemporaryObjectEntity } from "../compilation/entities";
import { RuntimeConstruct } from "../constructs/constructs";
import { CompiledGlobalVariableDefinition } from "../constructs/declarations/variable/GlobalVariableDefinition";
import { RuntimeFunction } from "../compilation/functions";
import { RawValueType, Value } from "./Value";


export type byte = number; // HACK - can be resolved if I make the memory model realistic and not hacky

export class Memory {
    private static _name = "Memory";

    public readonly observable = new Observable(this);

    public readonly capacity: number;
    public readonly staticCapacity: number;
    public readonly stackCapacity: number;
    public readonly heapCapacity: number;

    public readonly staticStart: number;
    public readonly staticEnd: number;

    public readonly stackStart: number;
    public readonly stackEnd: number;

    public readonly heapStart: number;
    public readonly heapEnd: number;

    public readonly temporaryStart: number;
    public readonly temporaryCapacity: number;
    public readonly temporaryEnd: number;

    // Definite assignment assertions with ! are for properties initialized in the reset function called
    // at the end of the constructor.
    private bytes!: RawValueType[]; //TODO: Hack - instead of real bytes, memory just stores the raw value in the first byte of an object
    private objects!: { [index: number]: CPPObject<CompleteObjectType>; };
    private stringLiteralMap!: { [index: string]: StringLiteralObject | undefined; };
    private staticObjects!: { [index: string]: StaticObject; };
    private temporaryObjects!: { [index: number]: TemporaryObject; };
    public readonly stack!: MemoryStack;
    public readonly heap!: MemoryHeap;

    private staticTop!: number;
    private temporaryBottom!: number;

    constructor(capacity?: number, staticCapacity?: number, stackCapacity?: number) {
        this.capacity = capacity || 100000;
        this.staticCapacity = staticCapacity || Math.floor(this.capacity / 10);
        this.stackCapacity = stackCapacity || Math.floor((this.capacity - this.staticCapacity) / 2);
        this.heapCapacity = this.capacity - this.staticCapacity - this.stackCapacity;

        this.staticStart = 0;
        this.staticEnd = this.staticStart + this.staticCapacity;

        this.stackStart = this.staticEnd;
        this.stackEnd = this.stackStart + this.stackCapacity;

        this.heapStart = this.stackEnd;
        this.heapEnd = this.heapStart + this.heapCapacity;

        this.temporaryStart = this.heapEnd + 100;
        this.temporaryCapacity = 100000;
        this.temporaryEnd = this.temporaryStart + this.temporaryCapacity;

        assert(this.staticCapacity < this.capacity && this.stackCapacity < this.capacity && this.heapCapacity < this.capacity);
        assert(this.heapEnd == this.capacity);

        this.reset();
    }

    public reset() {

        let rng = new CPPRandom(0);

        // memory is a sequence of bytes, addresses starting at 0
        this.bytes = new Array(this.capacity + this.temporaryCapacity);
        for (var i = 0; i < this.capacity + this.temporaryCapacity; ++i) {
            this.bytes[i] = rng.randomInteger(0, 100);
        }

        this.objects = {};
        this.stringLiteralMap = {};
        this.staticTop = this.staticStart + 4;
        this.staticObjects = {};
        this.temporaryBottom = this.temporaryStart;

        (<Mutable<this>>this).stack = new MemoryStack(this, this.staticEnd);
        (<Mutable<this>>this).heap = new MemoryHeap(this, this.heapEnd);
        this.temporaryObjects = {};
        this.observable.send("reset");
    }

    public getByte(addr: number) {
        return this.bytes[addr];
    }

    public readByte(addr: number) {

        // Notify any other object that is interested in that byte
        // var begin = ad - Type.getMaxSize();
        //for(var i = ad; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj == fromObj) { continue; }
        //    if (obj && obj.size > ad - i){
        //        obj.byteRead(ad);
        //    }
        //}
        return this.bytes[addr];
    }

    public getBytes(addr: number, num: number) {
        return this.bytes.slice(addr, addr + num);
    }

    public readBytes(addr: number, num: number) {
        var end = addr + num;

        // Notify any other object that is interested in that byte
        // var begin = ad - Type.getMaxSize();
        //for(var i = end-1; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj == fromObj) { continue; }
        //    if (obj && obj.size > ad - i){
        //        obj.bytesRead(ad, end-ad);//.send("bytesRead", {addr: ad, length: end-ad});
        //    }
        //}
        return this.bytes.slice(addr, end);
    }

    public setByte(addr: number, value: RawValueType) {
        this.bytes[addr] = value;

        // Notify any object that is interested in that byte
        // var begin = ad - Type.getMaxSize();
        //for(var i = ad; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj && obj.size > ad - i){
        //        obj.byteSet(ad, value);//.send("byteSet", {addr: ad, value: value});
        //    }
        //}
    }

    public writeByte(addr: number, value: RawValueType) {
        this.bytes[addr] = value;

        // Notify any other object that is interested in that byte
        // var begin = ad - Type.getMaxSize();
        //for(var i = ad; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj == fromObj) { continue; }
        //    if (obj && obj.size > ad - i){
        //        obj.byteWritten(ad, value);//.send("byteWritten", {addr: ad, value: value});
        //    }
        //}
    }

    public setBytes(addr: number, values: RawValueType[]) {

        for (var i = 0; i < values.length; ++i) {
            this.bytes[addr + i] = values[i];
        }

        // Notify any other object that is interested in that byte
        //var begin = ad - Type.getMaxSize();
        //for(var i = ad+values.length; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj && obj.size > ad - i){
        //        obj.bytesSet(ad, values);//.send("byteSet", {addr: ad, values: values});
        //    }
        //}
    }

    public writeBytes(addr: number, values: RawValueType[]) {
        //TODO remove this commented code
        //if (isA(fromObj, TemporaryObject)){
        //    var objBytes = this.temporaryObjects[fromObj.entityId];
        //    if (!objBytes){
        //        objBytes = new Array(fromObj.size);
        //        for(var i = 0; i < fromObj.size; ++i){
        //            objBytes[i] = 0;
        //        }
        //        this.temporaryObjects[fromObj.entityId] = objBytes;
        //    }
        //    return;
        //}

        for (var i = 0; i < values.length; ++i) {
            this.bytes[addr + i] = values[i];
        }

        // Notify any other object that is interested in that byte
        //var begin = ad - Type.getMaxSize();
        //for(var i = ad+values.length-1; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj == fromObj) { continue; }
        //    if (obj && obj.size > ad - i){
        //        obj.bytesWritten(ad, values);//.send("bytesWritten", {addr: ad, values: values});
        //    }
        //}
    }

    // Attempts to dereference a pointer and retreive the object it points to.
    // Takes in a Value of pointer type. Must point to an object type.
    // Returns the most recently allocated object at the given address.
    // This may be an object which is no longer alive (has been deallocated).
    // If no object is found, or an object of a type that does not match the pointed-to type is found,
    // returns an anonymous object representing the given address interpreted as the requested type.
    // (In C++, reading/writing to this object will cause undefined behavior.)
    // TODO: prevent writing to zero or negative address objects?
    public dereference<Elem_type extends ArrayElemType>(ptr: Value<ArrayPointerType<Elem_type>>): ArraySubobject<Elem_type>;
    public dereference<T extends CompleteObjectType>(ptr: Value<ObjectPointerType<T>>): CPPObject<T>;
    public dereference<T extends CompleteObjectType>(ptr: Value<PointerType<T>>): CPPObject<T> | InvalidObject<T>;
    public dereference(ptr: Value<PointerToCompleteType>): CPPObject | ArraySubobject | InvalidObject {

        var addr = ptr.rawValue;

        // Handle special cases for pointers with RTTI
        if (ptr.type.isArrayPointerType()) {
            return ptr.type.arrayObject.getArrayElemSubobjectByAddress(addr);

        }
        if (ptr.type.isObjectPointerType() && ptr.type.isValueValid(addr)) {
            return ptr.type.pointedObject;
        }

        // Grab object from memory
        var obj = this.objects[addr];

        if (obj && (similarType(obj.type, ptr.type.ptrTo) || subType(obj.type, ptr.type.ptrTo))) {
            return obj;
        }

        // If the object wasn't there or doesn't match the type we asked for (ignoring const)
        // then we need to create an anonymous object of the appropriate type instead
        return new InvalidObject(ptr.type.ptrTo, this, addr);
    }

    public allLiveObjects() {
        return Object.values(this.objects).filter(obj => obj.isAlive);
    }

    public allocateObject(object: CPPObject<CompleteObjectType>) {
        this.objects[object.address] = object;
        this.observable.send("objectAllocated", object);
    }

    /**
     * Ends the lifetime of an object. Its data actually remains in memory, but is marked as dead and invalid.
     * If the object is already dead, does nothing.
     * @param addr
     * @param killer The runtime construct that killed the object
     */
    public killObject(obj: CPPObject, killer?: RuntimeConstruct) {
        if (obj && obj.isAlive) {
            obj.kill(killer);
            this.observable.send("objectKilled", obj);
        }
    }

    /**
     * Allocates and returns a string literal object, unless a string literal with exactly
     * the same contents has already been allocated, in which case that same object is returned.
     * @param contents
     */
    public allocateStringLiteral(contents: string) {
        let previousObj = this.stringLiteralMap[contents];
        if (previousObj) {
            return previousObj;
        }
        else {
            // only need to allocate a string literal object if we didn't already have an identical one
            // length + 1 below is for null character
            let object = new StringLiteralObject(new BoundedArrayType(Char.CHAR, contents.length + 1), this, this.staticTop);
            this.allocateObject(object);
            object.beginLifetime();

            // record the string literal in case we see more that are the same in the future
            this.stringLiteralMap[contents] = object;

            // write value of string literal into the object
            Char.jsStringToNullTerminatedCharArray(contents).forEach((c, i) => {
                object.getArrayElemSubobject(i).setValue(c);
            });

            // adjust location for next static object
            this.staticTop += object.size;
            return object;
        }
    }

    public getStringLiteral(str: string) {
        return this.stringLiteralMap[str];
    }

    public allocateStatic(def: CompiledGlobalVariableDefinition) {
        var obj = new StaticObject(def, def.declaredEntity.type, this, this.staticTop);
        this.allocateObject(obj);
        this.staticTop += obj.size;
        this.staticObjects[def.declaredEntity.qualifiedName.str] = obj;
    }

    public staticLookup<T extends CompleteObjectType>(staticEntity: GlobalObjectEntity<T>) {
        return <StaticObject<T>>this.staticObjects[staticEntity.qualifiedName.str];
    }

    public allocateTemporaryObject<T extends CompleteObjectType>(tempEntity: TemporaryObjectEntity<T>) {
        let obj = new TemporaryObject(tempEntity.type, this, this.temporaryBottom, tempEntity.name);
        this.allocateObject(obj);
        this.temporaryBottom += tempEntity.type.size;
        this.temporaryObjects[tempEntity.entityId] = obj;
        this.observable.send("temporaryObjectAllocated", obj);
        return obj;
    }


    // TODO: think of some way to prevent accidentally calling the other deallocate directly with a temporary obj
    public deallocateTemporaryObject(obj: TemporaryObject, killer?: RuntimeConstruct) {
        this.killObject(obj, killer);
        //this.temporaryBottom += obj.type.size;
        delete this.temporaryObjects[obj.address];
        this.observable.send("temporaryObjectDeallocated", obj);
    }

    public printObjects() {
        let objs: any = {};
        for (let key in this.objects) {
            let obj = this.objects[key];
            let desc = obj.describe();
            if (obj.type.isAtomicType()) {
                let atomicObj = <CPPObject<AtomicType>>obj;
                objs[desc.name || desc.message] = (atomicObj.isValueValid() ? atomicObj.rawValue() : "??");
            }
            else {
                objs[desc.name || desc.message] = obj.rawValue();
            }
        }
        return JSON.stringify(objs, null, 4);
    }
}
;
class MemoryStack {
    private static readonly _name = "MemoryStack";

    public readonly observable = new Observable(this);

    private top: number;
    private readonly start: number;
    private readonly memory: Memory;

    private readonly _frames: MemoryFrame[] = [];
    public readonly frames: readonly MemoryFrame[] = this._frames;

    constructor(memory: Memory, start: number) {
        this.memory = memory;
        this.start = start;
        this.top = start;
    }

    // public clear() {
    //     this.frames.length = 0;
    //     this.top = this.start;
    // }
    public topFrame() {
        return last(this.frames);
    }

    public pushFrame(rtFunc: RuntimeFunction) {
        var frame = new MemoryFrame(this.memory, this.top, rtFunc);
        this.top += frame.size;
        this._frames.push(frame);
        this.memory.observable.send("framePushed", frame);
        return frame;
    }

    public popFrame(rtConstruct: RuntimeConstruct) {
        let frame = this._frames.pop();
        if (!frame) {
            return assertFalse();
        }
        this.top -= frame.size;
        this.memory.observable.send("framePopped", frame);
    }

    public toString() {
        var str = "<ul class=\"stackFrames\">";
        for (var i = 0; i < this.frames.length; ++i) {
            var frame = this.frames[i];
            str += "<li>" + frame.toString() + "</li>";
        }
        str += "</ul>";
        return str;
    }
}
class MemoryHeap {
    private static readonly _name = "MemoryHeap";

    public readonly observable = new Observable(this);

    private bottom: number;
    private readonly end: number;
    private readonly memory: Memory;

    public readonly objectMap: { [index: number]: DynamicObject; };

    // public readonly mostRecentlyAllocatedObject?: DynamicObject;
    public constructor(memory: Memory, end: number) {
        this.memory = memory;
        this.end = end;
        this.bottom = end;
        this.objectMap = {};
    }

    // public clear() {
    //     this.objectMap = {};
    // }
    public allocateNewObject<T extends CompleteObjectType>(type: T) {
        this.bottom -= type.size;
        let obj = new DynamicObject(type, this.memory, this.bottom);
        this.memory.allocateObject(obj);
        this.objectMap[obj.address] = obj;
        this.memory.observable.send("heapObjectAllocated", obj);
        // (<Mutable<this>>this).mostRecentlyAllocatedObject = obj;
        return obj;
    }

    public deleteObject(obj: DynamicObject, killer?: RuntimeConstruct) {
        this.memory.killObject(obj, killer);
        delete this.objectMap[obj.address];
        this.memory.observable.send("heapObjectDeleted", obj);
        // Note: responsibility for running destructor lies elsewhere
        return obj;
    }

    public deleteByAddress(addr: number, killer?: RuntimeConstruct) {
        let obj = this.objectMap[addr];
        if (obj) {
            this.deleteObject(obj);
        }
        return obj;
    }
}
type MemoryFrameMessages = "referenceBound";

export class MemoryFrame {
    private static readonly _name = "MemoryFrame";

    public readonly observable = new Observable<MemoryFrameMessages>(this);

    private readonly start: number;
    private readonly end: number;
    private readonly memory: Memory;

    public readonly func: RuntimeFunction;
    public readonly size: number;

    public readonly localObjects: readonly AutoObject[];
    public readonly localObjectsByName: { [index: string]: AutoObject | undefined; } = {};

    private readonly localObjectsByEntityId: { [index: number]: AutoObject; } = {};
    private readonly localReferencesByEntityId: { [index: number]: CPPObject | undefined; } = {};
    private readonly localReferenceEntities: readonly LocalReferenceEntity[];

    public constructor(memory: Memory, start: number, rtFunc: RuntimeFunction) {
        this.memory = memory;
        this.start = start;
        this.func = rtFunc;

        this.size = 0;

        let addr = this.start;

        // TODO: add this pointer back in
        // if (this.func.model.isMemberFunction) {
        //     let obj = new ThisObject(new ObjectPointer(rtFunc.receiver), memory, addr);
        //     obj.setValue(rtFunc.receiver.getPointerTo());
        //     addr += obj.size;
        //     this.localObjectsByEntityId[obj.entityId] = obj;
        //     this.size += obj.size;
        // }
        let functionLocals = rtFunc.model.context.functionLocals;

        // Push objects for all entities in the block
        this.localObjects = functionLocals.localObjects.map((objEntity) => {

            // Create and allocate the object
            let obj = new AutoObject(objEntity.definition, objEntity.type, memory, addr);
            this.memory.allocateObject(obj);
            this.localObjectsByEntityId[objEntity.entityId] = obj;
            this.localObjectsByName[obj.name] = obj;

            // Move on to next address afterward
            addr += obj.size;
            (<Mutable<this>>this).size += obj.size;

            return obj;
        });

        this.localReferenceEntities = functionLocals.localReferences;

        this.end = this.start + this.size;
    }

    // TODO: is this ever used?
    public toString() {
        var str = "";
        for (var key in this.localObjectsByEntityId) {
            var obj = this.localObjectsByEntityId[key];
            //			if (!obj.type){
            // str += "<span style=\"background-color:" + obj.color + "\">" + key + " = " + obj + "</span>\n";
            str += "<span>" + obj + "</span>\n";
            //			}
        }
        return str;
    }

    public localObjectLookup<T extends CompleteObjectType>(entity: LocalObjectEntity<T>) {
        return <AutoObject<T>>this.localObjectsByEntityId[entity.entityId];
    }

    // TODO: apparently this is not used
    // public initializeLocalObject<T extends AtomicType>(entity: LocalObjectEntity<T>, newValue: Value<T>) {
    //     this.localObjectLookup(entity).writeValue(newValue);
    // }
    public localReferenceLookup<T extends CompleteObjectType>(entity: LocalReferenceEntity<ReferenceType<T>>) {
        return <CPPObject<T> | undefined>this.localReferencesByEntityId[entity.entityId];
    }

    public bindLocalReference(entity: LocalReferenceEntity, obj: CPPObject) {
        this.localReferencesByEntityId[entity.entityId] = obj;
        obj.onReferenceBound(entity);
        this.observable.send("referenceBound", { entity: entity, object: obj });
    }

}
;
