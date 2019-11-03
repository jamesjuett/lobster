"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("../util/util");
var observe_1 = require("../util/observe");
var objects_1 = require("./objects");
var types_1 = require("./types");
var last_1 = __importDefault(require("lodash/last"));
var entities_1 = require("./entities");
// export type ValueType<T extends AtomicType> = T extends AtomicType ? Value<T> : never;
var Value = /** @class */ (function () {
    // TODO: ts: change any type for value to match type expected for CPP type of value
    function Value(rawValue, type, isValid) {
        if (isValid === void 0) { isValid = true; }
        // TODO: remove this.value in favor of using rawValue() function
        this.rawValue = rawValue;
        this.type = type;
        this._isValid = isValid;
    }
    ;
    Object.defineProperty(Value.prototype, "isValid", {
        get: function () {
            // Note: this is implemented as a getter since it is necessary to call isValueValid on the type each time.
            //       e.g. A type with RTTI like an object pointer may become invalid if the object dies.
            return this._isValid && this.type.isValueValid(this.rawValue);
        },
        enumerable: true,
        configurable: true
    });
    Value.prototype.clone = function (valueToClone) {
        if (valueToClone === void 0) { valueToClone = this.rawValue; }
        return new Value(valueToClone, this.type, this.isValid);
    };
    Value.prototype.invalidated = function () {
        return new Value(this.rawValue, this.type, false);
    };
    Value.prototype.equals = function (otherValue) {
        return new Value(this.rawValue === otherValue.rawValue ? 1 : 0, new types_1.Bool(), this.isValid && otherValue.isValid);
    };
    Value.prototype.rawEquals = function (otherRawValue) {
        return this.rawValue === otherRawValue;
    };
    Value.prototype.combine = function (otherValue, combiner) {
        util_1.assert(types_1.sameType(this.type, otherValue.type));
        return new Value(combiner(this.rawValue, otherValue.rawValue), this.type, this.isValid && otherValue.isValid);
    };
    Value.prototype.pointerOffset = function (offsetValue, subtract) {
        if (subtract === void 0) { subtract = false; }
        return new Value((subtract ?
            this.rawValue - this.type.ptrTo.size * offsetValue.rawValue :
            this.rawValue + this.type.ptrTo.size * offsetValue.rawValue), this.type, this.isValid && offsetValue.isValid);
    };
    Value.prototype.pointerDifference = function (otherValue) {
        return new Value((this.rawValue - otherValue.rawValue) / this.type.ptrTo.size, new types_1.Int(), this.isValid && otherValue.isValid);
    };
    Value.prototype.compare = function (otherValue, comparer) {
        util_1.assert(types_1.sameType(this.type, otherValue.type));
        return new Value(comparer(this.rawValue, otherValue.rawValue) ? 1 : 0, new types_1.Bool(), this.isValid && otherValue.isValid);
    };
    Value.prototype.modify = function (modifier) {
        return new Value(modifier(this.rawValue), this.type, this.isValid);
    };
    Value.prototype.toString = function () {
        return this.valueString();
    };
    Value.prototype.valueString = function () {
        return this.type.valueToString(this.rawValue);
    };
    // TODO: perhaps this should be moved to the ostream class
    Value.prototype.valueToOstreamString = function () {
        return this.type.valueToOstreamString(this.rawValue);
    };
    /**
     * This should be used VERY RARELY. The only time to use it is if you have a temporary Value instance
     * that you're using locally and want to keep updating its raw value to something else before passing
     * to something like memory.dereference(). For example, this is done when traversing through a cstring by
     * getting the value of the pointer initially, then ad hoc updating that value as you move through the cstring.
     */
    Value.prototype.setRawValue = function (rawValue) {
        this.rawValue = rawValue;
        this.isValid = this.isValid && this.type.isValueValid(this.rawValue);
    };
    Value.prototype.describe = function () {
        return { message: this.valueString() };
    };
    Value._name = "Value";
    return Value;
}());
exports.Value = Value;
var Memory = /** @class */ (function () {
    function Memory(capacity, staticCapacity, stackCapacity) {
        this.observable = new observe_1.Observable(this);
        this.capacity = capacity || 10000;
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
        this.temporaryCapacity = 10000;
        this.temporaryEnd = this.temporaryStart + this.temporaryCapacity;
        util_1.assert(this.staticCapacity < this.capacity && this.stackCapacity < this.capacity && this.heapCapacity < this.capacity);
        util_1.assert(this.heapEnd == this.capacity);
        this.reset();
    }
    Memory.prototype.reset = function () {
        // memory is a sequence of bytes, addresses starting at 0
        this.bytes = new Array(this.capacity + this.temporaryCapacity);
        for (var i = 0; i < this.capacity + this.temporaryCapacity; ++i) {
            this.bytes[i] = Math.floor(Math.random() * 100);
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
    };
    Memory.prototype.getByte = function (addr) {
        return this.bytes[addr];
    };
    Memory.prototype.readByte = function (addr) {
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
    };
    Memory.prototype.getBytes = function (addr, num) {
        return this.bytes.slice(addr, addr + num);
    };
    Memory.prototype.readBytes = function (addr, num) {
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
    };
    Memory.prototype.setByte = function (addr, value) {
        this.bytes[addr] = value;
        // Notify any object that is interested in that byte
        // var begin = ad - Type.getMaxSize();
        //for(var i = ad; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj && obj.size > ad - i){
        //        obj.byteSet(ad, value);//.send("byteSet", {addr: ad, value: value});
        //    }
        //}
    };
    Memory.prototype.writeByte = function (addr, value) {
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
    };
    Memory.prototype.setBytes = function (addr, values) {
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
    };
    Memory.prototype.writeBytes = function (addr, values) {
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
    };
    // Attempts to dereference a pointer and retreive the object it points to.
    // Takes in a Value of pointer type. Must point to an object type.
    // Returns the most recently allocated object at the given address.
    // This may be an object which is no longer alive (has been deallocated).
    // If no object is found, or an object of a type that does not match the pointed-to type is found,
    // returns an anonymous object representing the given address interpreted as the requested type.
    // (In C++, reading/writing to this object will cause undefined behavior.)
    // TODO: prevent writing to zero or negative address objects?
    Memory.prototype.dereference = function (ptr) {
        util_1.assert(ptr.type.isObjectPointer());
        var addr = ptr.rawValue;
        // Handle special cases for pointers with RTTI
        if (ptr.type instanceof types_1.ArrayPointer) {
            return ptr.type.arrayObject.getArrayElemSubobjectByAddress(addr);
        }
        if (ptr.type instanceof types_1.ObjectPointer && ptr.type.isValueValid(addr)) {
            return ptr.type.pointedObject;
        }
        // Grab object from memory
        var obj = this.objects[addr];
        if (obj && (types_1.similarType(obj.type, ptr.type.ptrTo) || types_1.subType(obj.type, ptr.type.ptrTo))) {
            return obj;
        }
        // If the object wasn't there or doesn't match the type we asked for (ignoring const)
        // then we need to create an anonymous object of the appropriate type instead
        return new objects_1.InvalidObject(ptr.type, this, addr);
    };
    Memory.prototype.allocateObject = function (object) {
        this.objects[object.address] = object;
    };
    /**
     * Ends the lifetime of an object at the given address. Its data actually remains in memory, but is marked as dead and invalid.
     * If no object exists at the given address, does nothing. If the object is already dead, does nothing.
     * @param addr
     * @param killer The runtime construct that killed the object
     */
    Memory.prototype.killObject = function (addr, killer) {
        var obj = this.objects[addr];
        if (obj && obj.isAlive) {
            obj.kill(killer);
        }
    };
    Memory.prototype.allocateStringLiteral = function (stringLiteralEntity) {
        var str = stringLiteralEntity.str;
        if (!this.stringLiteralMap[str]) {
            // only need to allocate a string literal object if we didn't already have an identical one
            var object = stringLiteralEntity.objectInstance(this, this.staticTop);
            this.allocateObject(object);
            // record the string literal in case we see more that are the same in the future
            this.stringLiteralMap[str] = object;
            // write value of string literal into the object
            types_1.Char.jsStringToNullTerminatedCharArray(str).forEach(function (c, i) {
                object.getArrayElemSubobject(i).setValue(new Value(c, types_1.Char.CHAR));
            });
            // adjust location for next static object
            this.staticTop += object.size;
        }
    };
    Memory.prototype.getStringLiteral = function (str) {
        return this.stringLiteralMap[str];
    };
    Memory.prototype.allocateStatic = function (def) {
        var obj = new objects_1.StaticObject(def, def.declaredEntity.type, this, this.staticTop);
        this.allocateObject(obj);
        this.staticTop += obj.size;
        this.staticObjects[def.declaredEntity.qualifiedName] = obj;
    };
    Memory.prototype.staticLookup = function (staticEntity) {
        return this.staticObjects[staticEntity.qualifiedName];
    };
    Memory.prototype.allocateTemporaryObject = function (tempEntity) {
        var obj = new objects_1.TemporaryObject(tempEntity.type, this, this.temporaryBottom, tempEntity.name);
        this.allocateObject(obj);
        this.temporaryBottom += tempEntity.type.size;
        this.temporaryObjects[tempEntity.entityId] = obj;
        this.observable.send("temporaryObjectAllocated", obj);
        return obj;
    };
    // TODO: think of some way to prevent accidentally calling the other deallocate directly with a temporary obj
    Memory.prototype.deallocateTemporaryObject = function (obj, killer) {
        this.killObject(obj.address, killer);
        //this.temporaryBottom += obj.type.size;
        delete this.temporaryObjects[obj.address];
        this.observable.send("temporaryObjectDeallocated", obj);
    };
    Memory._name = "Memory";
    return Memory;
}());
exports.Memory = Memory;
;
var MemoryStack = /** @class */ (function () {
    function MemoryStack(memory, start) {
        this.observable = new observe_1.Observable(this);
        this.memory = memory;
        this.start = start;
        this.top = start;
        this.frames = [];
    }
    // public clear() {
    //     this.frames.length = 0;
    //     this.top = this.start;
    // }
    MemoryStack.prototype.topFrame = function () {
        return last_1.default(this.frames);
    };
    MemoryStack.prototype.pushFrame = function (rtFunc) {
        var frame = new MemoryFrame(this.memory, this.top, rtFunc);
        this.top += frame.size;
        this.frames.push(frame);
        this.memory.observable.send("framePushed", frame);
        return frame;
    };
    MemoryStack.prototype.popFrame = function (rtConstruct) {
        var frame = this.frames.pop();
        if (!frame) {
            return util_1.assertFalse();
        }
        frame.pop(rtConstruct);
        this.top -= frame.size;
        this.memory.observable.send("framePopped", frame);
    };
    MemoryStack.prototype.toString = function () {
        var str = "<ul class=\"stackFrames\">";
        for (var i = 0; i < this.frames.length; ++i) {
            var frame = this.frames[i];
            str += "<li>" + frame.toString() + "</li>";
        }
        str += "</ul>";
        return str;
    };
    MemoryStack._name = "MemoryStack";
    return MemoryStack;
}());
var MemoryHeap = /** @class */ (function () {
    function MemoryHeap(memory, end) {
        this.observable = new observe_1.Observable(this);
        this.memory = memory;
        this.end = end;
        this.bottom = end;
        this.objectMap = {};
    }
    MemoryHeap._name = "MemoryHeap";
    return MemoryHeap;
}());
var MemoryFrame = /** @class */ (function () {
    function MemoryFrame(memory, start, rtFunc) {
        var _this = this;
        this.observable = new observe_1.Observable(this);
        this.localObjectsByEntityId = {};
        this.localReferencesByEntityId = {};
        this.memory = memory;
        this.start = start;
        this.func = rtFunc;
        this.size = 0;
        var addr = this.start;
        // TODO: add this pointer back in
        // if (this.func.model.isMemberFunction) {
        //     let obj = new ThisObject(new ObjectPointer(rtFunc.receiver), memory, addr);
        //     obj.setValue(rtFunc.receiver.getPointerTo());
        //     addr += obj.size;
        //     this.localObjectsByEntityId[obj.entityId] = obj;
        //     this.size += obj.size;
        // }
        // Push objects for all entities in the block
        rtFunc.model.context.functionLocals.localObjects.forEach(function (objEntity) {
            if (objEntity instanceof entities_1.AutoEntity) {
                // Create and allocate the object
                var obj = new objects_1.AutoObject(objEntity.definition, objEntity.type, memory, addr);
                _this.localObjectsByEntityId[objEntity.entityId] = obj;
                // Move on to next address afterward
                addr += obj.size;
                _this.size += obj.size;
            }
        });
        this.end = this.start + this.size;
    }
    // TODO: is this ever used?
    MemoryFrame.prototype.toString = function () {
        var str = "";
        for (var key in this.localObjectsByEntityId) {
            var obj = this.localObjectsByEntityId[key];
            //			if (!obj.type){
            // str += "<span style=\"background-color:" + obj.color + "\">" + key + " = " + obj + "</span>\n";
            str += "<span>" + obj + "</span>\n";
            //			}
        }
        return str;
    };
    MemoryFrame.prototype.getLocalObject = function (entity) {
        return this.localObjectsByEntityId[entity.entityId];
    };
    MemoryFrame.prototype.referenceLookup = function (entity) {
        return this.localReferencesByEntityId[entity.entityId] || util_1.assertFalse("Attempt to look up referred object before reference was bound.");
    };
    MemoryFrame.prototype.bindReference = function (entity, obj) {
        this.localReferencesByEntityId[entity.entityId] = obj;
    };
    // public setUpReferenceInstances() {
    //     this.scope.referenceObjects.forEach((ref: LocalReferenceEntity) => {
    //         this.localReferencesByEntityId[ref.entityId] = undefined;
    //         //self.memory.allocateObject(ref, addr);
    //         //addr += ref.type.size;
    //     });
    // }
    MemoryFrame.prototype.pop = function (rtConstruct) {
        for (var key in this.localObjectsByEntityId) {
            var obj = this.localObjectsByEntityId[key];
            // Note this does nothing if the object was already deallocated (e.g. going out of scope of a nested block, destructor was called)
            this.memory.killObject(obj.address, rtConstruct);
        }
    };
    MemoryFrame._name = "MemoryFrame";
    return MemoryFrame;
}());
exports.MemoryFrame = MemoryFrame;
;
//# sourceMappingURL=runtimeEnvironment.js.map