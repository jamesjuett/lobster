import * as Types from "./types";
import { Type, ArrayType, ClassType } from "./types";
import { Observable } from "../util/observe";
import { assert } from "../util/util";
import { Memory } from "./runtimeEnvironment";

abstract class ObjectData {
    protected readonly type: Type;
    protected readonly memory: Memory;
    protected readonly address: number;

    public constructor(type: Type, memory: Memory, address: number) {
        this.type = type;
        this.memory = memory;
        this.address = address;
    }
};

class AtomicObjectData extends ObjectData {

}

class ArrayObjectData extends ObjectData {

    protected readonly type!: ArrayType; // Initialized by parent ctor

    private readonly elemObjects: CPPObject[];

    public constructor(type: ArrayType, memory: Memory, address: number) {
        super(type, memory, address);

        let subAddr = this.address;
        this.elemObjects = [];
        for(let i = 0; i < this.type.length; ++i){
            this.elemObjects.push(ArraySubobject.instance(this, i, memory, subAddr));
            subAddr += this.type.elemType.size;
        } 
    }

    public getArrayElemSubobject(index: number) {
        if (0 <= index && index < this.elemObjects.length) {
            return this.elemObjects[index];
        }
        else {
            var outOfBoundsObj = ArraySubobject.instance(this, index);
            outOfBoundsObj.allocated(this.memory, this.address + index * this.type.elemType.size);
            return outOfBoundsObj;
        }
    }
}

class ClassObjectData extends ObjectData {

    protected readonly type!: ClassType; // Initialized by parent ctor

    public readonly subobjects: Subobject[];
    public readonly baseSubobjects: BaseClassSubobject[];
    public readonly memberSubobjects: MemberSubobject[];
    private readonly memberSubobjectMap: {[index: string]: MemberSubobject} = {};

    public constructor(type: ClassType, memory: Memory, address: Address) {
        super(type, memory, address);
        
        let subAddr = this.address;

        this.baseSubobjects = type.baseClassSubobjectEntities.map((base) => {
            let subObj = base.objectInstance(this, memory, subAddr);
            subAddr += subObj.size;
            return subObj;
        });

        this.memberSubobjects = type.memberSubobjectEntities.map((mem) => {
            let subObj = mem.objectInstance(this, memory, subAddr);
            subAddr += subObj.size;
            this.memberSubobjectMap[mem.name] = subObj;
            return subObj;
        });


        this.subobjects = this.baseSubobjects.concat(this.memberSubobjects);
    }

    public getMemberSubobject(name: string) {
        return this.memberSubobjectMap[name];
    }
}


export class CPPObject {

    public readonly observable = new Observable(this);

    /**
     * This is NOT any sort of official name/symbol for the object.
     * It is just used for a human-readable description, which is often going
     * to be the same as that.
     */
    public readonly name: string;

    public readonly type: Type; // TODO: change to ObjectType type

    public readonly size: number;

    public readonly data: ObjectData;

    public readonly address: number;

    public readonly alive: boolean;

    public constructor(name: string, type: Type, memory: Memory, address: number) {
        this.name = name;
        this.type = type;
        this.size = type.size;
        assert(this.size != 0, "Size cannot be 0."); // SCARY

        if (this.type instanceof ArrayType) {
            // this.isArray = true;
            this.data = new ArrayObjectData(this.type, memory, address);
        }
        else if (this.type instanceof ClassType) {
            this.data = new ClassObjectData(this.type, memory, address);
        }
        else {
            this.data = new AtomicObjectData(this.type, memory, address);
        }

        this.alive = true;
    }


    // HACK: I should split this class into subclasses/mixins for objects of class type or array type
    // Then this function should also only exist in the appropriate specialized classes
    memberSubobjectValueWritten : function() {
        this.send("valueWritten");
    },

    arrayElemValueWritten : function() {
        this.send("valueWritten");
    },

    instanceString : function(){
        return "@"+ this.address;
    },
    valueString : function(){
        return this.type.valueToString(this.rawValue());
    },
    nameString : function(){
        return this.name || "0x" + this.address;
    },
    valueToOstreamString : function(){
        return this.type.valueToOstreamString(this.rawValue());
    },
    isAlive : function(){
        return !!this.alive;
    },
    allocated : function(memory, address, inst){
        this.alive = true;
        this.memory = memory;
        this.address = address;



        this.send("allocated");
    },
    deallocated : function(inst){
        this.alive = false;
        this.deallocatedByInst = inst;
        this.send("deallocated");
        // deallocate subobjects if needed
        //if(this.isArray){
        //    for(var i = 0; i < this.type.length; ++i){
        //        this.elemObjects[i].deallocated();
        //    }
        //}
        //else if (this.isClass){
        //    for(var i = 0; i < this.subobjects.length; ++i){
        //        this.subobjects[i].deallocated();
        //    }
        //}
    },
    obituary : function(){
        return {killer: this.deallocatedByInst};
    },
    getPointerTo : function(){
        assert(this.address, "Must be allocated before you can get pointer to object.");
        return Value.instance(this.address, Types.ObjectPointer.instance(this));
    },
    getSubobject : function(addr){
        if(this.isArray){
            var offset = (addr - this.address) / this.type.elemType.size;
            if (0 <= offset && offset < this.elemObjects.length) {
                return this.elemObjects[offset];
            }
            else {
                var outOfBoundsObj = ArraySubobject.instance(this, offset);
                outOfBoundsObj.allocated(this.memory, this.address + offset * this.type.elemType.size);
                return outOfBoundsObj;
            }
            // for(var i = 0; i < this.type.length; ++i){
            //     var subObj = this.elemObjects[i];
            //     if (subObj.address === addr){
            //         return subObj;
            //     }
            // }
        }
        else if (this.isClass){
            for(var i = 0; i < this.subobjects.length; ++i){
                var subObj = this.subobjects[i];
                if (subObj.address === addr){
                    return subObj;
                }
            }
        }

        // Sorry, can't help you
        return null;
    },
    getValue : function(read){
        if (this.isValueValid()){
            return Value.instance(this.rawValue(read), this.type);
        }
        else{
            return Value.instance(this.rawValue(read), this.type, {invalid:true});
        }
    },
    readRawValue : function(){
        return this.rawValue(true);
    },
    rawValue : function(read){
        if (this.isArray){
            var arr = [];
            for(var i = 0; i < this.nonRefType.length; ++i){
                // use rawValue here to deeply remove Value object wrappers
                arr.push(this.elemObjects[i].getValue(read));
            }
            return arr;
        }
        else if (this.isClass){
            var val = [];
            for(var i = 0; i < this.subobjects.length; ++i) {
                // use rawValue here to deeply remove Value object wrappers
                val.push(this.subobjects[i].rawValue(read));
            }
            return val;
        }
        else{
            if (read) {
                var bytes = this.memory.readBytes(this.address, this.size, this);
                var val = this.nonRefType.bytesToValue(bytes);
                this.send("valueRead", val);
                return val;
            }
            else {
                var bytes = this.memory.getBytes(this.address, this.size);
                return this.nonRefType.bytesToValue(bytes);
            }
        }
    },
    setValue : function(newValue, write){

        // It's possible newValue could be another object.
        // Handle this as a special case by first looking up value.
        if (isA(newValue, CPPObject)){
            newValue = newValue.getValue(write);
        }

        if (isA(newValue, Value)){
            this.setValidity(newValue.isValueValid());
            // Accept new RTTI
            this.type = newValue.type;
            newValue = newValue.rawValue();
        }
        else{
            // assume it was valid
            this.setValidity(true);
        }


        if (this.isArray){
            assert(newValue.length === this.nonRefType.length);
            for(var i = 0; i < this.nonRefType.length; ++i){
                this.elemObjects[i].setValue(newValue[i], write);
            }
        }
        else if (this.isClass){
            assert(newValue.length === this.subobjects.length);
            for(var i = 0; i < this.subobjects.length; ++i) {
                this.subobjects[i].setValue(newValue[i], write);
            }
        }
        else{
            if(write){
                this.memory.writeBytes(this.address, this.nonRefType.valueToBytes(newValue), this);
                this.send("valueWritten", newValue);
            }
            else{
                this.memory.setBytes(this.address, this.nonRefType.valueToBytes(newValue), this);
            }
        }
    },

    readValue : function(){
        return this.getValue(true);
    },
    writeValue : function(newValue){
        this.setValue(newValue, true);
    },
    byteRead: function(addr){
        if (this.isArray){
            // If array, find the subobject containing the byte
            this.elemObjects[(addr - this.address) / this.nonRefType.elemType.size].byteRead(addr);
        }
        else if (this.isClass){
            var ad = this.address;
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(ad = ad + mem.type.size > addr){
                    ad.byteRead(addr);
                    break;
                }
            }
        }
        else{
            this.send("byteRead", {addr: addr});
        }
    },
    bytesRead: function(addr, length){
        if (this.isArray) {
            var beginIndex = Math.max(0, Math.floor(( addr - this.address ) / this.nonRefType.elemType.size));
            var endIndex = Math.min(
                beginIndex + Math.ceil(length / this.nonRefType.elemType.size),
                this.nonRefType.length);

            for (var i = beginIndex; i < endIndex; ++i) {
                this.elemObjects[i].bytesRead(addr, length);
            }
        }
        else if (this.isClass){
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(addr < mem.address + mem.type.size && mem.address < addr + length){ // check for overlap
                    mem.bytesRead(addr, length);
                }
                else if (mem.address > addr +length){
                    // break if we are now in members past affected bytes
                    break;
                }
            }
        }
        else{
            this.send("bytesRead", {addr: addr, length: length});
        }
    },
    byteSet: function(addr, value){
        if (this.isArray){
            // If array, find the subobject containing the byte
            this.elemObjects[(addr - this.address) / this.nonRefType.elemType.size].byteSet(addr, value);
        }
        else if (this.isClass){
            var ad = this.address;
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(ad = ad + mem.type.size > addr){
                    mem.byteSet(addr, value);
                    break;
                }
            }
        }
        else{
            this.send("byteSet", {addr: addr, value: value});
        }
    },
    bytesSet: function(addr, values){
        var length = values.length;
        if (this.isArray) {
            var beginIndex = Math.max(0, Math.floor(( addr - this.address ) / this.nonRefType.elemType.size));
            var endIndex = Math.min(
                beginIndex + Math.ceil(length / this.nonRefType.elemType.size),
                this.nonRefType.length);

            for (var i = beginIndex; i < endIndex; ++i) {
                this.elemObjects[i].bytesSet(addr, values);
            }
        }
        else if (this.isClass){
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(addr < mem.address + mem.type.size && mem.address < addr + length){ // check for overlap
                    mem.bytesSet(addr, values);
                }
                else if (mem.address > addr +length){
                    // break if we are now in members past affected bytes
                    break;
                }
            }
        }
        else{
            this.send("bytesSet", {addr: addr, values: values});
        }
    },
    byteWritten: function(addr, value){
        if (this.isArray){
            // If array, find the subobject containing the byte
            this.elemObjects[(addr - this.address) / this.nonRefType.elemType.size].byteWritten(addr, value);
        }
        else if (this.isClass){
            var ad = this.address;
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(ad = ad + mem.type.size > addr){
                    mem.byteWritten(addr, value);
                    break;
                }
            }
        }
        else{
            this.send("byteWritten", {addr: addr, value: value});
        }
    },
    bytesWritten: function(addr, values){
        var length = values.length;
        if (this.isArray) {
            var beginIndex = Math.max(0, Math.floor(( addr - this.address ) / this.nonRefType.elemType.size));
            var endIndex = Math.min(
                beginIndex + Math.ceil(length / this.nonRefType.elemType.size),
                this.nonRefType.length);

            for (var i = beginIndex; i < endIndex; ++i) {
                this.elemObjects[i].bytesWritten(addr, values);
            }
        }
        else if (this.isClass){
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(addr < mem.address + mem.type.size && mem.address < addr + length){ // check for overlap
                    mem.bytesWritten(addr, values);
                }
                else if (mem.address > addr +length){
                    // break if we are now in members past affected bytes
                    break;
                }
            }
        }
        else{
            this.send("bytesWritten", {addr: addr, values: values});
        }
    },
    callReceived : function(){
        this.send("callReceived", this);
    },
    callEnded : function(){
        this.send("callEnded", this);
    },
    setValidity : function(valid){
        this._isValid = valid;
        this.send("validitySet", valid);
    },
    invalidate : function(){
        this.setValidity(false);
    },
    validate : function(){
        this.setValidity(true);
    },
    isValueValid : function(){
        return this._isValid && this.type.isValueValid(this.rawValue());
    },
    isValueDereferenceable : function() {
        return this._isValid && this.type.isValueDereferenceable(this.rawValue());
    },
    describe : function(){
        var w1 = isA(this.decl, Declarations.Parameter) ? "parameter " : "object ";
        return {name: this.name, message: "the " + w1 + (this.name || ("at 0x" + this.address))};
    }

};


export var ThisObject = CPPObject.extend({
    _name: "ThisObject",
    storage: "automatic"
});




export var StringLiteralObject = CPPObject.extend({
    _name: "StringLiteralObject",
    storage: "static",
    init: function (type) {
        this.initParent(null, type);
    },
    instanceString: function () {
        return "string literal at 0x" + this.address;
    },
    describe: function () {
        return {message: "string literal at 0x" + this.address};
    }
});

export var DynamicObject = CPPObject.extend({
    _name: "DynamicObject",
    storage: "dynamic",
    init: function(type, name){
        this.initParent(name || null, type);
    },
    instanceString : function(){
        return "Heap object at " + this.address + " (" + this.type + ")";
    },
    leaked : function(sim){
        if (!this.hasBeenLeaked){
            this.hasBeenLeaked = true;
            sim.memoryLeaked("Oh no! Some memory just got lost. It's highlighted in red in the memory display.")
            this.send("leaked");
        }
    },
    unleaked : function(sim){
        this.send("unleaked");
    },
    describe : function(){
        return {message: "the heap object " + (this.name || "at 0x" + this.address)};
    }
});



export var AutoObject = CPPObject.extend({
    _name: "AutoObject",
    storage: "automatic",
    init: function(autoObj){
        this.initParent(autoObj.name, autoObj.type);
        this.decl = autoObj.decl;
        this.entityId = autoObj.entityId;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    }
});

export var StaticObjectInstance = CPP.CPPObject.extend({
    _name: "StaticObjectInstance",
    storage: "static",
    init: function(staticEnt){
        this.initParent(staticEnt.name, staticEnt.type);
        this.decl = staticEnt.decl;
        this.entityId = staticEnt.entityId;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    }
});




// TODO: rename?
export var EvaluationResultRuntimeEntity = CPPObject.extend({
    _name: "EvaluationResultRuntimeEntity",
    storage: "automatic",
    init: function(type, inst){
        this.initParent(null, type);
        this.inst = inst;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    runtimeLookup :  function(sim: Simulation, rtConstruct: RuntimeConstruct) {
        return this.inst.evalValue.runtimeLookup(sim, inst);
    }
});



export var AnonObject = CPPObject.extend({
    _name: "AnonObject",
    storage: "temp",
    init: function(type, name){
        this.initParent(name || null, type);
    },
    nameString : function(){
        return this.name || "@" + this.address;
    }/*,
     isAlive : function(){
     return false;
     }*/
});


export var Subobject = CPPObject.extend({
    _name: "Subobject",
    parentObject : Class._ABSTRACT,
    isAlive : function(){
        return this.parentObject().isAlive();
    },
    obituary : function(){
        return this.parentObject().obituary();
    }
});



export var ArraySubobject = Subobject.extend({
    _name: "ArraySubobject",
    storage: "temp",
    init: function(arrObj, index){
        this.initParent(null, arrObj.type.elemType);
        this.arrObj = arrObj;
        this.index = index;
    },
    nameString : function(){
        return this.name || "@" + this.address;
    },
    parentObject : function(){
        return this.arrObj;
    },
    getPointerTo : function(){
        assert(this.address, "Must be allocated before you can get pointer to object.");
        return Value.instance(this.address, Types.ArrayPointer.instance(this.arrObj));
    },
    describe : function(){
        var desc = {};
        var arrDesc = this.arrObj.describe();
        desc.message = "element " + this.index + " of " + arrDesc.message;
        if (arrDesc.name){
            desc.name = arrDesc.name + "[" + this.index + "]";
        }
        return desc;
    },
    isAlive : function() {
        return ArraySubobject._parent.isAlive.apply(this, arguments) && this.isInBounds();
    },
    isValueValid : function() {
        return Lobster.CPP.ArraySubobject._parent.isValueValid.apply(this, arguments) && this.isInBounds();
    },
    isInBounds : function() {
        var offset = (this.address - this.arrObj.address) / this.type.size;
        return 0 <= offset && offset < this.arrObj.elemObjects.length;
    },
    setValue : function(newValue, write) {
        ArraySubobject._parent.setValue.apply(this, arguments);
        write && this.arrObj.arrayElemValueWritten(this);
    }
});





export var TemporaryObjectInstance = CPPObject.extend({
    _name: "TemporaryObject",
    storage: "temp",
    init: function(tempObjEntity){
        this.initParent(tempObjEntity.name, tempObjEntity.type);
        this.entityId = tempObjEntity.entityId;
    },
    nameString : function(){
        return "@" + this.address;
    }
});

export var BaseClassSubobject = Subobject.extend({
    _name: "BaseClassSubobject",
    storage: "none",
    init: function(type, parent){
        assert(isA(type, Types.Class));
        this.initParent("-"+type.className, type);
        this.parent = parent;
        this.storage = parent.storage;
    },
    parentObject : function(){
        return this.parent;
    },
    nameString : function(){
        return this.parent.nameString();
    },
    describe : function(){
        return {message: "the " + this.type.className + " base of " + this.parentObject().describe().message};
    }
});

export var MemberSubobject = Subobject.extend({
    _name: "MemberSubobject",
    storage: "none",
    init: function(type, parent, name){
        this.initParent(name || null, type);
        this.parent = parent;
        this.storage = parent.storage;
    },
    parentObject : function(){
        return this.parent;
    },
    nameString : function(){
        return this.parent.nameString() + "." + this.name;
    },
    describe : function(){
        var parent = this.parentObject();
        if (parent.name){
            return {message: parent.name + "." + this.name};
        }
        else{
            return {message: "the member " + this.name + " of " + parent.describe().message};
        }
    },
    setValue : function(newValue, write) {
        MemberSubobject._parent.setValue.apply(this, arguments);
        write && this.parent.memberSubobjectValueWritten(this);
    }
});

