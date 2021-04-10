"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemporaryObject = exports.MemberSubobject = exports.BaseSubobject = exports.ArraySubobject = exports.StringLiteralObject = exports.InvalidObject = exports.DynamicObject = exports.StaticObject = exports.MainReturnObject = exports.AutoObject = exports.CPPObject = void 0;
const types_1 = require("./types");
const observe_1 = require("../util/observe");
const util_1 = require("../util/util");
const runtimeEnvironment_1 = require("./runtimeEnvironment");
class ObjectData {
    constructor(object, memory, address) {
        this.object = object;
        this.size = this.object.size;
        this.memory = memory;
        this.address = address;
    }
}
;
class AtomicObjectData extends ObjectData {
    getValue(isValid) {
        return new runtimeEnvironment_1.Value(this.rawValue(), this.object.type, isValid);
    }
    rawValue() {
        var bytes = this.memory.readBytes(this.address, this.size);
        return this.object.type.bytesToValue(bytes);
    }
    setRawValue(newValue, write) {
        this.memory.writeBytes(this.address, this.object.type.valueToBytes(newValue));
    }
    zeroInitialize() {
        this.setRawValue(0, false);
    }
    kill() {
        // no subobjects, do nothing
    }
}
class ArrayObjectData extends ObjectData {
    constructor(object, memory, address) {
        super(object, memory, address);
        let subAddr = this.address;
        this.elemObjects = [];
        for (let i = 0; i < this.object.type.numElems; ++i) {
            this.elemObjects.push(new ArraySubobject(this.object, i, memory, subAddr));
            subAddr += this.object.type.elemType.size;
        }
    }
    getArrayElemSubobjectByAddress(address) {
        let index = (address - this.address) / this.object.type.elemType.size;
        return this.getArrayElemSubobject(index);
    }
    getArrayElemSubobject(index) {
        if (0 <= index && index < this.elemObjects.length) {
            return this.elemObjects[index];
        }
        else {
            let outOfBoundsObj = new ArraySubobject(this.object, index, this.memory, this.address + index * this.object.type.elemType.size);
            outOfBoundsObj.setValidity(false);
            return outOfBoundsObj;
        }
    }
    getArrayElemSubobjects() {
        return this.elemObjects;
    }
    numArrayElemSubobjects() {
        return this.elemObjects.length;
    }
    getValue() {
        return this.elemObjects.map((elemObj) => { return elemObj.getValue(); });
    }
    rawValue() {
        return this.elemObjects.map((elemObj) => { return elemObj.rawValue(); });
    }
    // public setRawValue(newValue: RawValueType, write: boolean) {
    //     for(var i = 0; i < (<ArrayType>this.object.type).length; ++i){
    //         this.elemObjects[i].setValue(newValue[i], write);
    //     }
    // }
    zeroInitialize() {
        this.elemObjects.forEach(elemObj => elemObj.zeroInitialize());
    }
    kill(rt) {
        this.elemObjects.forEach(elemObj => elemObj.kill(rt));
    }
}
class ClassObjectData extends ObjectData {
    constructor(object, memory, address) {
        super(object, memory, address);
        this.memberObjectMap = {};
        let subAddr = this.address;
        let classDef = this.object.type.classDefinition;
        util_1.assert(classDef === null || classDef === void 0 ? void 0 : classDef.isSuccessfullyCompiled(), "Cannot create an object at runtime for a class type that has not been defined and successfully compiled.");
        // this.baseSubobjects = classDef.baseSpecifiers.map((base) => {
        //     let subObj = new BaseSubobject(this.object, base.baseEntity.type, memory, subAddr);
        //     // let subObj = base.objectInstance(this.object, memory, subAddr);
        //     subAddr += subObj.size;
        //     return subObj;
        // });
        this.baseSubobjects = [];
        if (classDef.baseType) {
            let baseObj = new BaseSubobject(this.object, classDef.baseType, memory, subAddr);
            util_1.asMutable(this.baseSubobjects).push(baseObj);
            subAddr += baseObj.size;
        }
        this.memberSubobjects = classDef.memberObjectEntities.map((mem) => {
            let subObj = new MemberSubobject(this.object, mem.type, mem.name, memory, subAddr);
            // let subObj = mem.objectInstance(this.object, memory, subAddr);
            subAddr += subObj.size;
            this.memberObjectMap[mem.name] = subObj;
            return subObj;
        });
        this.subobjects = [];
        this.subobjects = this.subobjects.concat(this.baseSubobjects).concat(this.memberSubobjects);
    }
    getMemberObject(name) {
        var _a, _b;
        return (_a = this.memberObjectMap[name]) !== null && _a !== void 0 ? _a : (_b = this.baseSubobjects[0]) === null || _b === void 0 ? void 0 : _b.getMemberObject(name);
    }
    bindMemberReference(name, obj) {
        this.memberObjectMap[name] = obj;
    }
    getBaseSubobject() {
        return this.baseSubobjects[0];
    }
    // TODO: Could remove? This isn't currently used and I don't think it's useful for anything
    // public getSubobjectByAddress(address: number) {
    //     for(var i = 0; i < this.subobjects.length; ++i) {
    //         var subObj = this.subobjects[i];
    //         if (subObj.address === address){
    //             return subObj;
    //         }
    //     }
    // }
    // public rawValue() {
    //     return this.subobjects.map((subObj) => { return subObj.rawValue(); });
    // }
    // public setRawValue(newValue: RawValueType, write: boolean) {
    //     for(var i = 0; i < this.subobjects.length; ++i) {
    //         this.subobjects[i].setValue(newValue[i], write);
    //     }
    // }
    getValue() {
        throw new Error("Not implemented");
    }
    rawValue() {
        throw new Error("Not implemented");
    }
    zeroInitialize() {
        this.subobjects.forEach(subobj => subobj.zeroInitialize());
    }
    kill(rt) {
        this.subobjects.forEach(subobj => subobj.kill(rt));
    }
}
// TODO: it may be more elegant to split into 3 derived types of CPPObject for arrays, classes, and
// atomic objects and use a public factory function to create the appropriate instance based on the
// template parameter. (Rather than the current awkward composition and conditional method strategy)
class CPPObject {
    constructor(type, memory, address) {
        this.observable = new observe_1.Observable(this);
        this.type = type;
        this.size = type.size;
        this.objectId = CPPObject._nextObjectId++;
        util_1.assert(this.size != 0, "Size cannot be 0."); // SCARY
        if (this.type.isBoundedArrayType()) {
            // this.isArray = true;
            this.data = new ArrayObjectData(this, memory, address);
        }
        else if (this.type.isCompleteClassType()) {
            this.data = new ClassObjectData(this, memory, address);
        }
        else {
            this.data = new AtomicObjectData(this, memory, address);
        }
        this.address = address;
        // Object is not alive until it is initialized
        this.isAlive = false;
        // Validity is determined by the data this object currently holds
        this._isValid = false;
    }
    // Only allowed if receiver matches CPPObject<ArrayType<Elem_type>>
    getArrayElemSubobject(index) {
        return this.data.getArrayElemSubobject(index);
    }
    // Only allowed if receiver matches CPPObject<ArrayType<Elem_type>>
    getArrayElemSubobjects() {
        return this.data.getArrayElemSubobjects();
    }
    // Only allowed if receiver matches CPPObject<ArrayType<Elem_type>>
    numArrayElemSubobjects() {
        return this.data.numArrayElemSubobjects();
    }
    // Only allowed if receiver matches CPPObject<ArrayType<Elem_type>>
    getArrayElemSubobjectByAddress(address) {
        return this.data.getArrayElemSubobjectByAddress(address);
    }
    /**
     * Only allowed if receiver matches CPPObject<CompleteClassType>
     * Note that this returns CPPObject rather than MemberSubobject because
     * a reference member may refer to an external object that is not a subobject
     * @param this
     * @param name
     */
    getMemberObject(name) {
        return this.data.getMemberObject(name);
    }
    // Only allowed if receiver matches CPPObject<CompleteClassType>
    bindMemberReference(name, obj) {
        return this.data.bindMemberReference(name, obj);
    }
    // Only allowed if receiver matches CPPObject<CompleteClassType>
    getBaseSubobject() {
        return this.data.getBaseSubobject();
    }
    subobjectValueWritten() {
        this.observable.send("valueWritten");
    }
    toString() {
        return "@" + this.address;
    }
    beginLifetime() {
        util_1.assert(!this.isAlive);
        util_1.asMutable(this).isAlive = true;
    }
    kill(rt) {
        // kill subobjects
        this.data.kill(rt);
        this.isAlive = false;
        this._isValid = false;
        if (rt) {
            this.deallocatedBy = rt;
        }
        this.observable.send("deallocated");
    }
    getPointerTo() {
        return new runtimeEnvironment_1.Value(this.address, new types_1.ObjectPointerType(this));
    }
    // Only allowed if receiver matches CPPObject<ArrayType<Elem_type>>
    decayToPointer() {
        return this.getArrayElemSubobject(0).getPointerTo();
    }
    getValue(read = false) {
        let val = this.data.getValue(this._isValid);
        if (read) {
            this.observable.send("valueRead", val);
        }
        return val;
    }
    rawValue() {
        return this.data.rawValue();
    }
    readValue() {
        return this.getValue(true);
    }
    setValue(newValue, write = false) {
        this._isValid = newValue.isValid;
        // Accept new RTTI
        // However, we need to retain our own CV qualifiers
        util_1.asMutable(this).type = newValue.type.cvQualified(this.type.isConst, this.type.isVolatile);
        this.data.setRawValue(newValue.rawValue, write);
        if (write) {
            this.observable.send("valueWritten", newValue);
        }
        this._onValueSet(write);
    }
    _onValueSet(write) {
    }
    writeValue(newValue) {
        this.setValue(newValue, true);
    }
    /**
     * Begins this object's lifetime and initializes its value.
     * May only be called on objects of atomic type.
     * @param this
     * @param newValue
     */
    initializeValue(newValue) {
        this.beginLifetime();
        this.writeValue(newValue);
    }
    zeroInitialize() {
        this.data.zeroInitialize();
        this.setValidity(true);
    }
    isValueValid() {
        return this._isValid && this.type.isValueValid(this.rawValue());
    }
    // TODO: figure out whether this old code is worth keeping
    // originally, these functions were used to notify an object when somebody else
    // messed with (i.e. read/wrote bytes that were part of the object).
    // byteRead: function(addr){
    //     if (this.isArray){
    //         // If array, find the subobject containing the byte
    //         this.elemObjects[(addr - this.address) / this.nonRefType.elemType.size].byteRead(addr);
    //     }
    //     else if (this.isClass){
    //         var ad = this.address;
    //         for(var i = 0; i < this.subobjects.length; ++i) {
    //             var mem = this.subobjects[i];
    //             if(ad = ad + mem.type.size > addr){
    //                 ad.byteRead(addr);
    //                 break;
    //             }
    //         }
    //     }
    //     else{
    //         this.send("byteRead", {addr: addr});
    //     }
    // },
    // bytesRead: function(addr, length){
    //     if (this.isArray) {
    //         var beginIndex = Math.max(0, Math.floor(( addr - this.address ) / this.nonRefType.elemType.size));
    //         var endIndex = Math.min(
    //             beginIndex + Math.ceil(length / this.nonRefType.elemType.size),
    //             this.nonRefType.length);
    //         for (var i = beginIndex; i < endIndex; ++i) {
    //             this.elemObjects[i].bytesRead(addr, length);
    //         }
    //     }
    //     else if (this.isClass){
    //         for(var i = 0; i < this.subobjects.length; ++i) {
    //             var mem = this.subobjects[i];
    //             if(addr < mem.address + mem.type.size && mem.address < addr + length){ // check for overlap
    //                 mem.bytesRead(addr, length);
    //             }
    //             else if (mem.address > addr +length){
    //                 // break if we are now in members past affected bytes
    //                 break;
    //             }
    //         }
    //     }
    //     else{
    //         this.send("bytesRead", {addr: addr, length: length});
    //     }
    // },
    // byteSet: function(addr, value){
    //     if (this.isArray){
    //         // If array, find the subobject containing the byte
    //         this.elemObjects[(addr - this.address) / this.nonRefType.elemType.size].byteSet(addr, value);
    //     }
    //     else if (this.isClass){
    //         var ad = this.address;
    //         for(var i = 0; i < this.subobjects.length; ++i) {
    //             var mem = this.subobjects[i];
    //             if(ad = ad + mem.type.size > addr){
    //                 mem.byteSet(addr, value);
    //                 break;
    //             }
    //         }
    //     }
    //     else{
    //         this.send("byteSet", {addr: addr, value: value});
    //     }
    // },
    // bytesSet: function(addr, values){
    //     var length = values.length;
    //     if (this.isArray) {
    //         var beginIndex = Math.max(0, Math.floor(( addr - this.address ) / this.nonRefType.elemType.size));
    //         var endIndex = Math.min(
    //             beginIndex + Math.ceil(length / this.nonRefType.elemType.size),
    //             this.nonRefType.length);
    //         for (var i = beginIndex; i < endIndex; ++i) {
    //             this.elemObjects[i].bytesSet(addr, values);
    //         }
    //     }
    //     else if (this.isClass){
    //         for(var i = 0; i < this.subobjects.length; ++i) {
    //             var mem = this.subobjects[i];
    //             if(addr < mem.address + mem.type.size && mem.address < addr + length){ // check for overlap
    //                 mem.bytesSet(addr, values);
    //             }
    //             else if (mem.address > addr +length){
    //                 // break if we are now in members past affected bytes
    //                 break;
    //             }
    //         }
    //     }
    //     else{
    //         this.send("bytesSet", {addr: addr, values: values});
    //     }
    // },
    // byteWritten: function(addr, value){
    //     if (this.isArray){
    //         // If array, find the subobject containing the byte
    //         this.elemObjects[(addr - this.address) / this.nonRefType.elemType.size].byteWritten(addr, value);
    //     }
    //     else if (this.isClass){
    //         var ad = this.address;
    //         for(var i = 0; i < this.subobjects.length; ++i) {
    //             var mem = this.subobjects[i];
    //             if(ad = ad + mem.type.size > addr){
    //                 mem.byteWritten(addr, value);
    //                 break;
    //             }
    //         }
    //     }
    //     else{
    //         this.send("byteWritten", {addr: addr, value: value});
    //     }
    // },
    // bytesWritten: function(addr, values){
    //     var length = values.length;
    //     if (this.isArray) {
    //         var beginIndex = Math.max(0, Math.floor(( addr - this.address ) / this.nonRefType.elemType.size));
    //         var endIndex = Math.min(
    //             beginIndex + Math.ceil(length / this.nonRefType.elemType.size),
    //             this.nonRefType.length);
    //         for (var i = beginIndex; i < endIndex; ++i) {
    //             this.elemObjects[i].bytesWritten(addr, values);
    //         }
    //     }
    //     else if (this.isClass){
    //         for(var i = 0; i < this.subobjects.length; ++i) {
    //             var mem = this.subobjects[i];
    //             if(addr < mem.address + mem.type.size && mem.address < addr + length){ // check for overlap
    //                 mem.bytesWritten(addr, values);
    //             }
    //             else if (mem.address > addr +length){
    //                 // break if we are now in members past affected bytes
    //                 break;
    //             }
    //         }
    //     }
    //     else{
    //         this.send("bytesWritten", {addr: addr, values: values});
    //     }
    // },
    callReceived() {
        this.observable.send("callReceived", this);
    }
    callEnded() {
        this.observable.send("callEnded", this);
    }
    setValidity(valid) {
        this._isValid = valid;
        this.observable.send("validitySet", valid);
    }
    hasStorage(storageKind) {
        return this.storageKind === storageKind;
    }
    /**
     * Notify this object that a reference has been bound to it
     */
    onReferenceBound(entity) {
        this.observable.send("referenceBoundToMe", entity);
    }
    /**
     * Notify this object that a reference has been unbound from it
     * (e.g. that reference went out of scope)
     */
    onReferenceUnbound(entity) {
        this.observable.send("referenceUnbound", entity);
    }
}
exports.CPPObject = CPPObject;
CPPObject._nextObjectId = 0;
;
// TODO: Kept some of this in a comment in case it's helpful when reintroducing leak checking
// export class DynamicObject extends CPPObject {
//     private hasBeenLeaked: boolean = false;
//     public constructor(type: ObjectType, memory: Memory, address: number) {
//         super(type, memory, address);
//     }
//     public toString() {
//         return "Heap object at " + this.address + " (" + this.type + ")";
//     }
//     public leaked(sim: Simulation) {
//         if (!this.hasBeenLeaked){
//             this.hasBeenLeaked = true;
//             sim.memoryLeaked("Oh no! Some memory just got lost. It's highlighted in red in the memory display.")
//             this.observable.send("leaked");
//         }
//     }
//     // TODO: Why does this exist? How does something become unleaked??
//     public unleaked(sim: Simulation) {
//         this.observable.send("unleaked");
//     }
//     public describe() {
//         return {message: "the heap object at 0x" + this.address};
//     }
// }
// TODO: remove this?
// export var EvaluationResultRuntimeEntity = CPPObject.extend({
//     _name: "EvaluationResultRuntimeEntity",
//     storage: "automatic",
//     init: function(type, inst){
//         this.initParent(null, type);
//         this.inst = inst;
//     },
//     instanceString : function(){
//         return this.name + " (" + this.type + ")";
//     },
//     runtimeLookup :  function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//         return this.inst.evalResult.runtimeLookup(sim, inst);
//     }
// });
// public static createAutoObject<T extends ObjectType>(entity: AutoEntity<T>, memory: Memory, address: number) {
//     return new CPPObject(entity.type, memory, address, new EntityObjectDescriptor(entity));
// }
class AutoObject extends CPPObject {
    constructor(def, type, memory, address) {
        super(type, memory, address);
        this.storageKind = "automatic";
        this.def = def;
        this.name = def.name;
    }
    describe() {
        return this.def.declaredEntity.describe();
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
}
exports.AutoObject = AutoObject;
class MainReturnObject extends CPPObject {
    constructor(memory) {
        super(types_1.Int.INT, memory, 0); // HACK: put it at address 0. probably won't cause any issues since it's not allocated
        this.storageKind = "static";
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        return { name: "[main() return]", message: "The value returned from main." };
    }
}
exports.MainReturnObject = MainReturnObject;
class StaticObject extends CPPObject {
    constructor(def, type, memory, address) {
        super(type, memory, address);
        this.def = def;
        this.storageKind = "static";
        this.name = def.name;
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        return this.def.declaredEntity.describe();
    }
}
exports.StaticObject = StaticObject;
class DynamicObject extends CPPObject {
    constructor() {
        super(...arguments);
        this.storageKind = "dynamic";
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        return { name: `[dynamic @${this.address}]`, message: `the heap object at ${types_1.toHexadecimalString(this.address)}` };
    }
}
exports.DynamicObject = DynamicObject;
class InvalidObject extends CPPObject {
    constructor(type, memory, address) {
        super(type, memory, address);
        this.storageKind = "invalid";
        this.setValidity(false);
        this.kill();
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        return { name: `[invalid @${this.address}]`, message: `an invalid object at ${types_1.toHexadecimalString(this.address)}` };
    }
}
exports.InvalidObject = InvalidObject;
// export class ThisObject<T extends CompleteClassType = CompleteClassType> extends CPPObject<T> {
//     public isTyped<NarrowedT extends CompleteClassType>(predicate: (t:CompleteClassType) => t is NarrowedT) : this is ThisObject<NarrowedT>;
//     public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is never;
//     public isTyped<NarrowedT extends CompleteClassType>(predicate: (t:CompleteClassType) => t is NarrowedT) : this is ThisObject<NarrowedT> {
//         return predicate(this.type);
//     }
//     public describe(): ObjectDescription {
//         return { name: "this", message: "the this pointer" };
//     }
// }
class StringLiteralObject extends CPPObject {
    constructor(type, memory, address) {
        super(type, memory, address);
        this.storageKind = "static";
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        return { name: `[string literal @${this.address}]`, message: `string literal at ${types_1.toHexadecimalString(this.address)}` };
    }
}
exports.StringLiteralObject = StringLiteralObject;
class Subobject extends CPPObject {
    constructor(containingObject, type, memory, address) {
        super(type, memory, address);
        this.storageKind = "subobject";
        this.containingObject = containingObject;
    }
    _onValueSet(write) {
        if (write) {
            this.containingObject.subobjectValueWritten();
        }
    }
}
class ArraySubobject extends Subobject {
    constructor(arrObj, index, memory, address) {
        super(arrObj, arrObj.type.elemType, memory, address);
        this.index = index;
    }
    getPointerTo() {
        return new runtimeEnvironment_1.Value(this.address, new types_1.ArrayPointerType(this.containingObject));
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        var arrDesc = this.containingObject.describe();
        return {
            name: arrDesc.name + "[" + this.index + "]",
            message: "element " + this.index + " of " + arrDesc.message,
        };
    }
}
exports.ArraySubobject = ArraySubobject;
class BaseSubobject extends Subobject {
    constructor(containingObject, type, memory, address) {
        super(containingObject, type, memory, address);
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        let contDesc = this.containingObject.describe();
        return { name: `[${this.type.className} base of ${contDesc.name}]`, message: "the " + this.type.className + " base of " + contDesc.message };
    }
}
exports.BaseSubobject = BaseSubobject;
class MemberSubobject extends Subobject {
    constructor(containingObject, type, name, memory, address) {
        super(containingObject, type, memory, address);
        this.name = name;
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        var parent = this.containingObject;
        let parentDesc = parent.describe();
        return {
            name: parentDesc.name + "." + this.name,
            message: "the member " + this.name + " of " + parentDesc.message
        };
    }
}
exports.MemberSubobject = MemberSubobject;
// export type TemporaryObjectType<T extends ObjectType> = T extends ObjectType ? TemporaryObject<T> : never;
class TemporaryObject extends CPPObject {
    // public static create<T extends ObjectType>(type: T, memory: Memory, address: number, name?: string) : T extends ObjectType ? TemporaryObject<T> : never {
    //     return <any> new TemporaryObject(type, memory, address, name);
    // }
    constructor(type, memory, address, description) {
        super(type, memory, address);
        this.storageKind = "temporary";
        this.description = description;
        // this.entityId = tempObjEntity.entityId;
    }
    isTyped(predicate) {
        return predicate(this.type);
    }
    describe() {
        return { name: this.description, message: "the temporary object " + this.name };
    }
}
exports.TemporaryObject = TemporaryObject;
//# sourceMappingURL=objects.js.map