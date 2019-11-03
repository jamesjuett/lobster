"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var types_1 = require("./types");
var observe_1 = require("../util/observe");
var util_1 = require("../util/util");
var runtimeEnvironment_1 = require("./runtimeEnvironment");
var ObjectData = /** @class */ (function () {
    function ObjectData(object, memory, address) {
        this.object = object;
        this.size = this.object.size;
        this.memory = memory;
        this.address = address;
    }
    return ObjectData;
}());
;
var AtomicObjectData = /** @class */ (function (_super) {
    __extends(AtomicObjectData, _super);
    function AtomicObjectData() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AtomicObjectData.prototype.rawValue = function () {
        var bytes = this.memory.readBytes(this.address, this.size);
        return this.object.type.bytesToValue(bytes);
    };
    AtomicObjectData.prototype.setRawValue = function (newValue, write) {
        this.memory.writeBytes(this.address, this.object.type.valueToBytes(newValue));
    };
    return AtomicObjectData;
}(ObjectData));
var ArrayObjectData = /** @class */ (function (_super) {
    __extends(ArrayObjectData, _super);
    function ArrayObjectData(object, memory, address) {
        var _this = _super.call(this, object, memory, address) || this;
        var subAddr = _this.address;
        _this.elemObjects = [];
        for (var i = 0; i < _this.object.type.length; ++i) {
            _this.elemObjects.push(new ArraySubobject(_this.object, i, memory, subAddr));
            subAddr += _this.object.type.elemType.size;
        }
        return _this;
    }
    ArrayObjectData.create = function (object, memory, address) {
        return new ArrayObjectData(object, memory, address);
    };
    ArrayObjectData.prototype.getArrayElemSubobjectByAddress = function (address) {
        var index = (address - this.address) / this.object.type.elemType.size;
        return this.getArrayElemSubobject(index);
    };
    ArrayObjectData.prototype.getArrayElemSubobject = function (index) {
        if (0 <= index && index < this.elemObjects.length) {
            return this.elemObjects[index];
        }
        else {
            var outOfBoundsObj = new ArraySubobject(this.object, index, this.memory, this.address + index * this.object.type.elemType.size);
            return outOfBoundsObj;
        }
    };
    return ArrayObjectData;
}(ObjectData));
var ClassObjectData = /** @class */ (function (_super) {
    __extends(ClassObjectData, _super);
    function ClassObjectData() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ClassObjectData;
}(ObjectData));
// interface CPPObjectDescriptor<T extends ObjectType> {
//     describe(obj: CPPObject<T>) : Description;
// }
// const OBJECT_DESCRIPTORS = {
//     DEFAULT : {
//         describe: (obj: CPPObject<ObjectType>) => {
//             return {message: "an object at 0x" + obj.address};
//         }
//     },
//     AUTO : {
//         describe: (obj: CPPObject<ObjectType>) => {
//             return {message: "the heap object at 0x" + obj.address};
//         }
//     },
//     DYNAMIC : {
//         describe: (obj: CPPObject<ObjectType>) => {
//             return {message: "the heap object at 0x" + obj.address};
//         }
//     },
//     INVALID : {
//         describe: (obj: CPPObject<ObjectType>) => {
//             return {message: "an invalid object at 0x" + obj.address};
//         }
//     },
//     THIS : {
//         describe: (obj: CPPObject<Pointer>) => {
//             return {name: "this", message: "the this pointer"};
//         }
//     },
//     STRING_LITERAL : {
//         describe: (obj: CPPObject<ArrayType>) => {
//             return {message: "string literal at 0x" + obj.address};
//         }
//     }
// }
// class EntityObjectDescriptor {
//     private entity: CPPEntity;
//     constructor(entity: CPPEntity) {
//         this.entity = entity;
//     }
//     describe(obj: CPPObject) {
//         return this.entity.describe();
//     }
// }
// TODO: it may be more elegant to split into 3 derived types of CPPObject for arrays, classes, and
// atomic objects and use a public factory function to create the appropriate instance based on the
// template parameter. (Rather than the current awkward composition and conditional method strategy)
var CPPObject = /** @class */ (function () {
    function CPPObject(type, memory, address) {
        this.observable = new observe_1.Observable(this);
        this.type = type;
        this.size = type.size;
        util_1.assert(this.size != 0, "Size cannot be 0."); // SCARY
        if (this.type instanceof types_1.BoundedArrayType) {
            // this.isArray = true;
            this.data = ArrayObjectData.create(this, memory, address);
        }
        else if (this.type instanceof types_1.ClassType) {
            this.data = new ClassObjectData(this, memory, address);
        }
        else {
            this.data = new AtomicObjectData(this, memory, address);
        }
        this.address = address;
        this.isAlive = true;
        this._isValid = false;
    }
    // Only allowed if receiver matches CPPObject<ArrayType<Elem_type>>
    CPPObject.prototype.getArrayElemSubobject = function (index) {
        return this.data.getArrayElemSubobject(index);
    };
    // Only allowed if receiver matches CPPObject<ArrayType<Elem_type>>
    CPPObject.prototype.getArrayElemSubobjectByAddress = function (address) {
        return this.data.getArrayElemSubobjectByAddress(address);
    };
    // // Only allowed if receiver matches CPPObject<ClassType>
    // public getMemberSubobject(this: CPPObject<ClassType>, name: string) : MemberSubobject {
    //     return (<ClassObjectData<ClassType>>this.data).getMemberSubobject(name);
    // }
    // // Only allowed if receiver matches CPPObject<ClassType>
    // public getBaseSubobject(this: CPPObject<ClassType>) : BaseSubobject | undefined {
    //     return (<ClassObjectData<ClassType>>this.data).getBaseSubobject();
    // }
    CPPObject.prototype.subobjectValueWritten = function () {
        this.observable.send("valueWritten");
    };
    CPPObject.prototype.toString = function () {
        return "@" + this.address;
    };
    // TODO: figure out precisely what this is used for and make sure overrides actually provide appropriate strings
    // public nameString() {
    //     return "@" + this.address;
    // }
    CPPObject.prototype.kill = function (rt) {
        this.isAlive = false;
        this._isValid = false;
        if (rt) {
            this.deallocatedBy = rt;
        }
        this.observable.send("deallocated");
    };
    CPPObject.prototype.getPointerTo = function () {
        return new runtimeEnvironment_1.Value(this.address, new types_1.ObjectPointer(this));
    };
    CPPObject.prototype.getValue = function (read) {
        if (read === void 0) { read = false; }
        var val = new runtimeEnvironment_1.Value(this.getRawValue(), this.type, this._isValid);
        if (read) {
            this.observable.send("valueRead", val);
        }
        return val;
    };
    CPPObject.prototype.getRawValue = function () {
        return this.data.rawValue();
    };
    CPPObject.prototype.readValue = function () {
        return this.getValue(true);
    };
    CPPObject.prototype.setValue = function (newValue, write) {
        if (write === void 0) { write = false; }
        this._isValid = newValue.isValid;
        // Accept new RTTI
        util_1.asMutable(this).type = newValue.type;
        this.data.setRawValue(newValue.rawValue, write);
        if (write) {
            this.observable.send("valueWritten", newValue);
        }
        this.onValueSet(write);
    };
    CPPObject.prototype.onValueSet = function (write) {
    };
    CPPObject.prototype.writeValue = function (newValue) {
        this.setValue(newValue, true);
    };
    CPPObject.prototype.isValueValid = function () {
        return this._isValid && this.type.isValueValid(this.getRawValue());
    };
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
    CPPObject.prototype.callReceived = function () {
        this.observable.send("callReceived", this);
    };
    CPPObject.prototype.callEnded = function () {
        this.observable.send("callEnded", this);
    };
    CPPObject.prototype.setValidity = function (valid) {
        this._isValid = valid;
        this.observable.send("validitySet", valid);
    };
    return CPPObject;
}());
exports.CPPObject = CPPObject;
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
var AutoObject = /** @class */ (function (_super) {
    __extends(AutoObject, _super);
    function AutoObject(def, type, memory, address) {
        var _this = _super.call(this, type, memory, address) || this;
        _this.def = def;
        return _this;
    }
    AutoObject.prototype.describe = function () {
        return this.def.declaredEntity.describe();
    };
    return AutoObject;
}(CPPObject));
exports.AutoObject = AutoObject;
var MainReturnObject = /** @class */ (function (_super) {
    __extends(MainReturnObject, _super);
    function MainReturnObject(memory) {
        return _super.call(this, types_1.Int.INT, memory, 0) || this;
    }
    MainReturnObject.prototype.describe = function () {
        return { message: "The value returned from main." };
    };
    return MainReturnObject;
}(CPPObject));
exports.MainReturnObject = MainReturnObject;
var StaticObject = /** @class */ (function (_super) {
    __extends(StaticObject, _super);
    function StaticObject(def, type, memory, address) {
        var _this = _super.call(this, type, memory, address) || this;
        _this.def = def;
        return _this;
    }
    StaticObject.prototype.describe = function () {
        return this.def.declaredEntity.describe();
    };
    return StaticObject;
}(CPPObject));
exports.StaticObject = StaticObject;
var DynamicObject = /** @class */ (function (_super) {
    __extends(DynamicObject, _super);
    function DynamicObject() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DynamicObject.prototype.describe = function () {
        return { message: "the heap object at 0x" + this.address };
    };
    return DynamicObject;
}(CPPObject));
exports.DynamicObject = DynamicObject;
var InvalidObject = /** @class */ (function (_super) {
    __extends(InvalidObject, _super);
    function InvalidObject() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    InvalidObject.prototype.describe = function () {
        return { message: "an invalid object at 0x" + this.address };
    };
    return InvalidObject;
}(CPPObject));
exports.InvalidObject = InvalidObject;
var ThisObject = /** @class */ (function (_super) {
    __extends(ThisObject, _super);
    function ThisObject() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ThisObject.prototype.describe = function () {
        return { name: "this", message: "the this pointer" };
    };
    return ThisObject;
}(CPPObject));
exports.ThisObject = ThisObject;
var StringLiteralObject = /** @class */ (function (_super) {
    __extends(StringLiteralObject, _super);
    function StringLiteralObject(type, memory, address) {
        return _super.call(this, type, memory, address) || this;
    }
    StringLiteralObject.prototype.describe = function () {
        return { message: "string literal at 0x" + this.address };
    };
    return StringLiteralObject;
}(CPPObject));
exports.StringLiteralObject = StringLiteralObject;
var Subobject = /** @class */ (function (_super) {
    __extends(Subobject, _super);
    function Subobject(containingObject, type, memory, address) {
        var _this = _super.call(this, type, memory, address) || this;
        _this.containingObject = containingObject;
        return _this;
    }
    Object.defineProperty(Subobject.prototype, "isAlive", {
        get: function () {
            return this.containingObject.isAlive;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Subobject.prototype, "deallocatedBy", {
        get: function () {
            return this.containingObject.deallocatedBy;
        },
        enumerable: true,
        configurable: true
    });
    Subobject.prototype.onValueSet = function (write) {
        if (write) {
            this.containingObject.subobjectValueWritten();
        }
    };
    return Subobject;
}(CPPObject));
var ArraySubobject = /** @class */ (function (_super) {
    __extends(ArraySubobject, _super);
    function ArraySubobject(arrObj, index, memory, address) {
        var _this = _super.call(this, arrObj, arrObj.type.elemType, memory, address) || this;
        _this.index = index;
        return _this;
    }
    ArraySubobject.prototype.getPointerTo = function () {
        return new runtimeEnvironment_1.Value(this.address, new types_1.ArrayPointer(this.containingObject));
    };
    ArraySubobject.prototype.describe = function () {
        var arrDesc = this.containingObject.describe();
        var desc = {
            message: "element " + this.index + " of " + arrDesc.message,
        };
        if (arrDesc.name) {
            desc.name = arrDesc.name + "[" + this.index + "]";
        }
        return desc;
    };
    return ArraySubobject;
}(Subobject));
exports.ArraySubobject = ArraySubobject;
var BaseSubobject = /** @class */ (function (_super) {
    __extends(BaseSubobject, _super);
    function BaseSubobject(containingObject, type, memory, address) {
        return _super.call(this, containingObject, type, memory, address) || this;
    }
    BaseSubobject.prototype.describe = function () {
        return { message: "the " + this.type.name + " base of " + this.containingObject.describe().message };
    };
    return BaseSubobject;
}(Subobject));
exports.BaseSubobject = BaseSubobject;
var MemberSubobject = /** @class */ (function (_super) {
    __extends(MemberSubobject, _super);
    function MemberSubobject(containingObject, type, name, memory, address) {
        var _this = _super.call(this, containingObject, type, memory, address) || this;
        _this.name = name;
        return _this;
    }
    MemberSubobject.prototype.describe = function () {
        var parent = this.containingObject;
        var parentDesc = parent.describe();
        var desc = {
            message: "the member " + this.name + " of " + parentDesc.message
        };
        if (parentDesc.name) {
            desc.name = parentDesc.name + "." + this.name;
        }
        return desc;
    };
    return MemberSubobject;
}(Subobject));
exports.MemberSubobject = MemberSubobject;
// export type TemporaryObjectType<T extends ObjectType> = T extends ObjectType ? TemporaryObject<T> : never;
var TemporaryObject = /** @class */ (function (_super) {
    __extends(TemporaryObject, _super);
    // public static create<T extends ObjectType>(type: T, memory: Memory, address: number, name?: string) : T extends ObjectType ? TemporaryObject<T> : never {
    //     return <any> new TemporaryObject(type, memory, address, name);
    // }
    function TemporaryObject(type, memory, address, name) {
        var _this = _super.call(this, type, memory, address) || this;
        _this.name = name;
        return _this;
        // this.entityId = tempObjEntity.entityId;
    }
    TemporaryObject.prototype.nameString = function () {
        return "@" + this.address;
    };
    TemporaryObject.prototype.describe = function () {
        return name ? { name: this.name, message: "the temporary object " + this.name } : { message: "a temporary object" };
    };
    return TemporaryObject;
}(CPPObject));
exports.TemporaryObject = TemporaryObject;
//# sourceMappingURL=objects.js.map