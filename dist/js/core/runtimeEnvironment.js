"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryFrame = exports.Memory = exports.Value = void 0;
const util_1 = require("../util/util");
const observe_1 = require("../util/observe");
const objects_1 = require("./objects");
const types_1 = require("./types");
const last_1 = __importDefault(require("lodash/last"));
// export type ValueType<T extends AtomicType> = T extends AtomicType ? Value<T> : never;
class Value {
    // TODO: ts: change any type for value to match type expected for CPP type of value
    constructor(rawValue, type, isValid = true) {
        // TODO: remove this.value in favor of using rawValue() function
        this.rawValue = rawValue;
        this.type = type;
        this._isValid = isValid;
    }
    ;
    get isValid() {
        // Note: this is implemented as a getter since it is necessary to call isValueValid on the type each time.
        //       e.g. A type with RTTI like an object pointer may become invalid if the object dies.
        return this._isValid && this.type.isValueValid(this.rawValue);
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    clone(valueToClone = this.rawValue) {
        return new Value(valueToClone, this.type, this.isValid);
    }
    cvUnqualified() {
        return new Value(this.rawValue, this.type.cvUnqualified(), this.isValid);
    }
    cvQualified(isConst, isVolatile = false) {
        return new Value(this.rawValue, this.type.cvQualified(isConst, isVolatile), this.isValid);
    }
    invalidated() {
        return new Value(this.rawValue, this.type, false);
    }
    equals(otherValue) {
        return new Value(this.rawValue === otherValue.rawValue ? 1 : 0, new types_1.Bool(), this.isValid && otherValue.isValid);
    }
    rawEquals(otherRawValue) {
        return this.rawValue === otherRawValue;
    }
    combine(otherValue, combiner) {
        util_1.assert(types_1.similarType(this.type, otherValue.type));
        return new Value(combiner(this.rawValue, otherValue.rawValue), this.type, this.isValid && otherValue.isValid);
    }
    pointerOffset(offsetValue, subtract = false) {
        return new Value((subtract ?
            this.rawValue - this.type.ptrTo.size * offsetValue.rawValue :
            this.rawValue + this.type.ptrTo.size * offsetValue.rawValue), this.type, this.isValid && offsetValue.isValid);
    }
    pointerOffsetRaw(rawOffsetValue, subtract = false) {
        return new Value((subtract ?
            this.rawValue - this.type.ptrTo.size * rawOffsetValue :
            this.rawValue + this.type.ptrTo.size * rawOffsetValue), this.type, this.isValid);
    }
    pointerDifference(otherValue) {
        return new Value((this.rawValue - otherValue.rawValue) / this.type.ptrTo.size, new types_1.Int(), this.isValid && otherValue.isValid);
    }
    compare(otherValue, comparer) {
        util_1.assert(types_1.similarType(this.type, otherValue.type));
        return new Value(comparer(this.rawValue, otherValue.rawValue) ? 1 : 0, new types_1.Bool(), this.isValid && otherValue.isValid);
    }
    modify(modifier) {
        return new Value(modifier(this.rawValue), this.type, this.isValid);
    }
    add(otherValue) {
        return this.combine(otherValue, (a, b) => a + b);
    }
    addRaw(x) {
        return this.modify(a => a + x);
    }
    sub(otherValue) {
        return this.combine(otherValue, (a, b) => a - b);
    }
    subRaw(x) {
        return this.modify(a => a - x);
    }
    arithmeticNegate() {
        return this.modify(a => -a);
    }
    logicalNot() {
        return this.modify(a => a === 0 ? 1 : 0);
    }
    toString() {
        return this.valueString();
    }
    valueString() {
        return this.type.valueToString(this.rawValue);
    }
    // TODO: perhaps this should be moved to the ostream class
    valueToOstreamString() {
        return this.type.valueToOstreamString(this.rawValue);
    }
    /**
     * This should be used VERY RARELY. The only time to use it is if you have a temporary Value instance
     * that you're using locally and want to keep updating its raw value to something else before passing
     * to something like memory.dereference(). For example, this is done when traversing through a cstring by
     * getting the value of the pointer initially, then ad hoc updating that value as you move through the cstring.
     */
    setRawValue(rawValue) {
        this.rawValue = rawValue;
        this.isValid = this.isValid && this.type.isValueValid(this.rawValue);
    }
    describe() {
        return { message: this.valueString() };
    }
}
exports.Value = Value;
Value._name = "Value";
class Memory {
    constructor(capacity, staticCapacity, stackCapacity) {
        this.observable = new observe_1.Observable(this);
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
        util_1.assert(this.staticCapacity < this.capacity && this.stackCapacity < this.capacity && this.heapCapacity < this.capacity);
        util_1.assert(this.heapEnd == this.capacity);
        this.reset();
    }
    reset() {
        let rng = new util_1.CPPRandom(0);
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
        this.stack = new MemoryStack(this, this.staticEnd);
        this.heap = new MemoryHeap(this, this.heapEnd);
        this.temporaryObjects = {};
        this.observable.send("reset");
    }
    getByte(addr) {
        return this.bytes[addr];
    }
    readByte(addr) {
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
    getBytes(addr, num) {
        return this.bytes.slice(addr, addr + num);
    }
    readBytes(addr, num) {
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
    setByte(addr, value) {
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
    writeByte(addr, value) {
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
    setBytes(addr, values) {
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
    writeBytes(addr, values) {
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
    dereference(ptr) {
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
        if (obj && (types_1.similarType(obj.type, ptr.type.ptrTo) || types_1.subType(obj.type, ptr.type.ptrTo))) {
            return obj;
        }
        // If the object wasn't there or doesn't match the type we asked for (ignoring const)
        // then we need to create an anonymous object of the appropriate type instead
        return new objects_1.InvalidObject(ptr.type.ptrTo, this, addr);
    }
    allLiveObjects() {
        return Object.values(this.objects).filter(obj => obj.isAlive);
    }
    allocateObject(object) {
        this.objects[object.address] = object;
        this.observable.send("objectAllocated", object);
    }
    /**
     * Ends the lifetime of an object. Its data actually remains in memory, but is marked as dead and invalid.
     * If the object is already dead, does nothing.
     * @param addr
     * @param killer The runtime construct that killed the object
     */
    killObject(obj, killer) {
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
    allocateStringLiteral(contents) {
        let previousObj = this.stringLiteralMap[contents];
        if (previousObj) {
            return previousObj;
        }
        else {
            // only need to allocate a string literal object if we didn't already have an identical one
            // length + 1 below is for null character
            let object = new objects_1.StringLiteralObject(new types_1.BoundedArrayType(types_1.Char.CHAR, contents.length + 1), this, this.staticTop);
            this.allocateObject(object);
            // record the string literal in case we see more that are the same in the future
            this.stringLiteralMap[contents] = object;
            // write value of string literal into the object
            types_1.Char.jsStringToNullTerminatedCharArray(contents).forEach((c, i) => {
                object.getArrayElemSubobject(i).setValue(c);
            });
            // adjust location for next static object
            this.staticTop += object.size;
            return object;
        }
    }
    getStringLiteral(str) {
        return this.stringLiteralMap[str];
    }
    allocateStatic(def) {
        var obj = new objects_1.StaticObject(def, def.declaredEntity.type, this, this.staticTop);
        this.allocateObject(obj);
        this.staticTop += obj.size;
        this.staticObjects[def.declaredEntity.qualifiedName.str] = obj;
    }
    staticLookup(staticEntity) {
        return this.staticObjects[staticEntity.qualifiedName.str];
    }
    allocateTemporaryObject(tempEntity) {
        let obj = new objects_1.TemporaryObject(tempEntity.type, this, this.temporaryBottom, tempEntity.name);
        this.allocateObject(obj);
        this.temporaryBottom += tempEntity.type.size;
        this.temporaryObjects[tempEntity.entityId] = obj;
        this.observable.send("temporaryObjectAllocated", obj);
        return obj;
    }
    // TODO: think of some way to prevent accidentally calling the other deallocate directly with a temporary obj
    deallocateTemporaryObject(obj, killer) {
        this.killObject(obj, killer);
        //this.temporaryBottom += obj.type.size;
        delete this.temporaryObjects[obj.address];
        this.observable.send("temporaryObjectDeallocated", obj);
    }
    printObjects() {
        let objs = {};
        for (let key in this.objects) {
            let obj = this.objects[key];
            let desc = obj.describe();
            if (obj.type.isAtomicType()) {
                let atomicObj = obj;
                objs[desc.name || desc.message] = (atomicObj.isValueValid() ? atomicObj.rawValue() : "??");
            }
            else {
                objs[desc.name || desc.message] = obj.rawValue();
            }
        }
        return JSON.stringify(objs, null, 4);
    }
}
exports.Memory = Memory;
Memory._name = "Memory";
;
class MemoryStack {
    constructor(memory, start) {
        this.observable = new observe_1.Observable(this);
        this._frames = [];
        this.frames = this._frames;
        this.memory = memory;
        this.start = start;
        this.top = start;
    }
    // public clear() {
    //     this.frames.length = 0;
    //     this.top = this.start;
    // }
    topFrame() {
        return last_1.default(this.frames);
    }
    pushFrame(rtFunc) {
        var frame = new MemoryFrame(this.memory, this.top, rtFunc);
        this.top += frame.size;
        this._frames.push(frame);
        this.memory.observable.send("framePushed", frame);
        return frame;
    }
    popFrame(rtConstruct) {
        let frame = this._frames.pop();
        if (!frame) {
            return util_1.assertFalse();
        }
        this.top -= frame.size;
        this.memory.observable.send("framePopped", frame);
    }
    toString() {
        var str = "<ul class=\"stackFrames\">";
        for (var i = 0; i < this.frames.length; ++i) {
            var frame = this.frames[i];
            str += "<li>" + frame.toString() + "</li>";
        }
        str += "</ul>";
        return str;
    }
}
MemoryStack._name = "MemoryStack";
class MemoryHeap {
    // public readonly mostRecentlyAllocatedObject?: DynamicObject;
    constructor(memory, end) {
        this.observable = new observe_1.Observable(this);
        this.memory = memory;
        this.end = end;
        this.bottom = end;
        this.objectMap = {};
    }
    // public clear() {
    //     this.objectMap = {};
    // }
    allocateNewObject(type) {
        this.bottom -= type.size;
        let obj = new objects_1.DynamicObject(type, this.memory, this.bottom);
        this.memory.allocateObject(obj);
        this.objectMap[obj.address] = obj;
        this.memory.observable.send("heapObjectAllocated", obj);
        // (<Mutable<this>>this).mostRecentlyAllocatedObject = obj;
        return obj;
    }
    deleteObject(obj, killer) {
        this.memory.killObject(obj, killer);
        delete this.objectMap[obj.address];
        this.memory.observable.send("heapObjectDeleted", obj);
        // Note: responsibility for running destructor lies elsewhere
        return obj;
    }
    deleteByAddress(addr, killer) {
        let obj = this.objectMap[addr];
        if (obj) {
            this.deleteObject(obj);
        }
        return obj;
    }
}
MemoryHeap._name = "MemoryHeap";
class MemoryFrame {
    constructor(memory, start, rtFunc) {
        this.observable = new observe_1.Observable(this);
        this.localObjectsByName = {};
        this.localObjectsByEntityId = {};
        this.localReferencesByEntityId = {};
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
            let obj = new objects_1.AutoObject(objEntity.definition, objEntity.type, memory, addr);
            this.memory.allocateObject(obj);
            this.localObjectsByEntityId[objEntity.entityId] = obj;
            this.localObjectsByName[obj.name] = obj;
            // Move on to next address afterward
            addr += obj.size;
            this.size += obj.size;
            return obj;
        });
        this.localReferenceEntities = functionLocals.localReferences;
        this.end = this.start + this.size;
    }
    // TODO: is this ever used?
    toString() {
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
    localObjectLookup(entity) {
        return this.localObjectsByEntityId[entity.entityId];
    }
    // TODO: apparently this is not used
    // public initializeLocalObject<T extends AtomicType>(entity: LocalObjectEntity<T>, newValue: Value<T>) {
    //     this.localObjectLookup(entity).writeValue(newValue);
    // }
    localReferenceLookup(entity) {
        return this.localReferencesByEntityId[entity.entityId];
    }
    bindLocalReference(entity, obj) {
        this.localReferencesByEntityId[entity.entityId] = obj;
        obj.onReferenceBound(entity);
        this.observable.send("referenceBound", { entity: entity, object: obj });
    }
}
exports.MemoryFrame = MemoryFrame;
MemoryFrame._name = "MemoryFrame";
;
//# sourceMappingURL=runtimeEnvironment.js.map