import { Type, BoundedArrayType, AtomicType, PointerType, ObjectPointerType, ArrayPointerType, ArrayElemType, Char, Int, ObjectType, CompleteClassType } from "./types";
import { Observable } from "../util/observe";
import { assert, Mutable, asMutable } from "../util/util";
import { Memory, Value, RawValueType } from "./runtimeEnvironment";
import { RuntimeConstruct } from "./constructs";
import { LocalVariableDefinition, GlobalVariableDefinition, CompiledGlobalVariableDefinition, ParameterDefinition, CompiledClassDefinition } from "./declarations";

export interface ObjectDescription {
    name: string;
    message: string;
}

abstract class ObjectData<T extends ObjectType> {
    protected readonly object: CPPObject<T>;
    protected readonly size: number;
    protected readonly memory: Memory;
    protected readonly address: number;

    public constructor(object: CPPObject<T>, memory: Memory, address: number) {
        this.object = object;
        this.size = this.object.size;
        this.memory = memory;
        this.address = address;
    }

    // public abstract rawValue() : RawValueType;

    // public abstract setRawValue(newValue: RawValueType, write: boolean) : void;
};

class AtomicObjectData<T extends AtomicType> extends ObjectData<T> {

    public getValue(isValid: boolean) {
        return new Value<T>(this.rawValue(), this.object.type, isValid);
    }

    public rawValue() {
        var bytes = this.memory.readBytes(this.address, this.size);
        return this.object.type.bytesToValue(bytes);
    }

    public setRawValue(newValue: RawValueType, write: boolean) {
        this.memory.writeBytes(this.address, this.object.type.valueToBytes(newValue));
    }

}

class ArrayObjectData<Elem_type extends ArrayElemType> extends ObjectData<BoundedArrayType<Elem_type>> {

    // public static create<Elem_type extends ArrayElemType>(object: CPPObject<BoundedArrayType<Elem_type>>, memory: Memory, address: number) {
    //     return new ArrayObjectData<BoundedArrayType>(object, memory, address);
    // } 

    private readonly elemObjects: ArraySubobject<Elem_type>[];

    public constructor(object: CPPObject<BoundedArrayType<Elem_type>>, memory: Memory, address: number) {
        super(object, memory, address);

        let subAddr = this.address;
        this.elemObjects = [];
        for (let i = 0; i < this.object.type.length; ++i) {
            this.elemObjects.push(new ArraySubobject(this.object, i, memory, subAddr));
            subAddr += this.object.type.elemType.size;
        }
    }

    public getArrayElemSubobjectByAddress(address: number) {
        let index = (address - this.address) / this.object.type.elemType.size;
        return this.getArrayElemSubobject(index);
    }

    public getArrayElemSubobject(index: number): ArraySubobject<Elem_type> {
        if (0 <= index && index < this.elemObjects.length) {
            return this.elemObjects[index];
        }
        else {
            let outOfBoundsObj = new ArraySubobject(this.object, index,
                this.memory, this.address + index * this.object.type.elemType.size);
            outOfBoundsObj.setValidity(false);
            return outOfBoundsObj;
        }
    }

    public getArrayElemSubobjects(): readonly ArraySubobject<Elem_type>[] {
        return this.elemObjects;
    }

    public getValue() {
        return this.elemObjects.map((elemObj) => { return elemObj.getValue(); });
    }


    public rawValue() {
        return this.elemObjects.map((elemObj) => { return elemObj.rawValue(); });
    }

    // public setRawValue(newValue: RawValueType, write: boolean) {
    //     for(var i = 0; i < (<ArrayType>this.object.type).length; ++i){
    //         this.elemObjects[i].setValue(newValue[i], write);
    //     }
    // }
}

class ClassObjectData<T extends CompleteClassType> extends ObjectData<T> {

    private readonly subobjects: readonly Subobject[];
    private readonly baseSubobjects: readonly BaseSubobject[];
    private readonly memberSubobjects: readonly MemberSubobject[];
    private readonly memberSubobjectMap: {[index: string]: CPPObject | undefined} = {};

    public constructor(object: CPPObject<T>, memory: Memory, address: number) {
        super(object, memory, address);

        let subAddr = this.address;

        let classDef = this.object.type.classDefinition;

        assert(classDef?.isSuccessfullyCompiled(), "Cannot create an object at runtime for a class type that has not been defined and successfully compiled.");

        // this.baseSubobjects = classDef.baseSpecifiers.map((base) => {
        //     let subObj = new BaseSubobject(this.object, base.baseEntity.type, memory, subAddr);
        //     // let subObj = base.objectInstance(this.object, memory, subAddr);
        //     subAddr += subObj.size;
        //     return subObj;
        // });
        this.baseSubobjects = [];
        if (classDef.baseClass) {
            let baseObj = new BaseSubobject(this.object, classDef.baseClass, memory, subAddr);
            asMutable(this.baseSubobjects).push(baseObj);
            subAddr += baseObj.size;
        }

        this.memberSubobjects = classDef.memberObjects.map((mem) => {
            let subObj = new MemberSubobject(this.object, mem.type, mem.name, memory, subAddr);
            // let subObj = mem.objectInstance(this.object, memory, subAddr);
            subAddr += subObj.size;
            this.memberSubobjectMap[mem.name] = subObj;
            return subObj;
        });

        this.subobjects = [];
        this.subobjects = this.subobjects.concat(this.baseSubobjects).concat(this.memberSubobjects);
    }

    public getMemberSubobject(name: string) : CPPObject | undefined {
        return this.memberSubobjectMap[name] ?? this.baseSubobjects[0]?.getMemberSubobject(name);
    }

    public bindMemberReference(name: string, obj: CPPObject<ObjectType>) {
        this.memberSubobjectMap[name] = obj;
    }

    public getBaseSubobject() : BaseSubobject | undefined {
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
    public getValue(): never {
        throw new Error("Not implemented");
    }


    public rawValue(): never {
        throw new Error("Not implemented");
    }
}

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

type ObjectValueRepresentation<T extends ObjectType> =
    T extends AtomicType ? Value<T> :
    T extends BoundedArrayType<infer Elem_type> ? ObjectValueRepresentation<Elem_type>[] :
    T extends CompleteClassType ? { [index: string]: ObjectRawValueRepresentation<ObjectType> } : never;

type ObjectRawValueRepresentation<T extends ObjectType> =
    T extends AtomicType ? RawValueType :
    T extends BoundedArrayType<infer Elem_type> ? ObjectRawValueRepresentation<Elem_type>[] :
    T extends CompleteClassType ? { [index: string]: ObjectRawValueRepresentation<ObjectType> } : unknown;

// TODO: it may be more elegant to split into 3 derived types of CPPObject for arrays, classes, and
// atomic objects and use a public factory function to create the appropriate instance based on the
// template parameter. (Rather than the current awkward composition and conditional method strategy)
export abstract class CPPObject<T extends ObjectType = ObjectType> {

    public readonly observable = new Observable(this);

    /**
     * Objects that result from a named declaration will have a name. For others
     * (e.g. dynamically allocated objects, temporary objects), this will be undefined.
     */
    public readonly name?: string;
    public readonly type: T;
    public readonly size: number;
    public readonly address: number;

    private readonly data: any;

    public readonly isAlive: boolean;
    public readonly deallocatedBy?: RuntimeConstruct;

    private _isValid: boolean;

    public constructor(type: T, memory: Memory, address: number) {
        this.type = type;
        this.size = type.size;
        assert(this.size != 0, "Size cannot be 0."); // SCARY

        if (this.type.isBoundedArrayType()) {
            // this.isArray = true;
            this.data = <any>new ArrayObjectData(<any>this, memory, address);
        }
        else if (this.type.isCompleteClassType()) {
            this.data = <any>new ClassObjectData(<any>this, memory, address);
        }
        else {
            this.data = <any>new AtomicObjectData(<any>this, memory, address);
        }

        this.address = address;

        this.isAlive = true;
        this._isValid = false;
    }

    // Only allowed if receiver matches CPPObject<ArrayType<Elem_type>>
    public getArrayElemSubobject<AT extends BoundedArrayType>(this: CPPObject<AT>, index: number): ArraySubobject<AT["elemType"]> {
        return this.data.getArrayElemSubobject(index);
    }

    // Only allowed if receiver matches CPPObject<ArrayType<Elem_type>>
    public getArrayElemSubobjects<AT extends BoundedArrayType>(this: CPPObject<AT>): readonly ArraySubobject<AT["elemType"]>[] {
        return this.data.getArrayElemSubobjects();
    }

    // Only allowed if receiver matches CPPObject<ArrayType<Elem_type>>
    public getArrayElemSubobjectByAddress<AT extends BoundedArrayType>(this: CPPObject<AT>, address: number): ArraySubobject<AT["elemType"]> {
        return this.data.getArrayElemSubobjectByAddress(address);
    }

    // Only allowed if receiver matches CPPObject<CompleteClassType>
    public getMemberSubobject(this: CPPObject<CompleteClassType>, name: string) {
        return this.data.getMemberSubobject(name);
    }

    // Only allowed if receiver matches CPPObject<CompleteClassType>
    public bindMemberReference(this: CPPObject<CompleteClassType>, name: string, obj: CPPObject<ObjectType>) {
        return this.data.bindMemberReference(name);
    }

    // Only allowed if receiver matches CPPObject<CompleteClassType>
    public getBaseSubobject(this: CPPObject<CompleteClassType>) {
        return this.data.getBaseSubobject();
    }

    public subobjectValueWritten() {
        this.observable.send("valueWritten");
    }

    public toString() {
        return "@" + this.address;
    }

    public kill(rt?: RuntimeConstruct) {
        (<Mutable<this>>this).isAlive = false;
        this._isValid = false;
        if (rt) {
            (<Mutable<this>>this).deallocatedBy = rt;
        }
        this.observable.send("deallocated");
    }

    public getPointerTo(): Value<PointerType<T>> {
        return new Value(this.address, new ObjectPointerType(this));
    }

    public getValue(read: boolean = false): ObjectValueRepresentation<T> {
        let val = this.data.getValue(this._isValid);
        if (read) {
            this.observable.send("valueRead", val);
        }
        return <any>val;
    }

    public rawValue(): ObjectRawValueRepresentation<T> {
        return <any>this.data.rawValue();
    }

    public readValue(): ObjectValueRepresentation<T> {
        return this.getValue(true);
    }

    public setValue<T_Atomic extends AtomicType>(this: CPPObject<T_Atomic>, newValue: Value<T_Atomic>, write: boolean = false) {

        this._isValid = newValue.isValid;

        // Accept new RTTI
        // However, we need to retain our own CV qualifiers
        asMutable(this).type = newValue.type.cvQualified(this.type.isConst, this.type.isVolatile);

        this.data.setRawValue(newValue.rawValue, write);

        if (write) {
            this.observable.send("valueWritten", newValue);
        }

        this.onValueSet(write);
    }

    protected onValueSet(write: boolean) {

    }

    public writeValue<T_Atomic extends AtomicType>(this: CPPObject<T_Atomic>, newValue: Value<T_Atomic>) {
        this.setValue(newValue, true);
    }

    public isValueValid<T_Atomic extends AtomicType>(this: CPPObject<T_Atomic>): boolean {
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


    public callReceived() {
        this.observable.send("callReceived", this);
    }

    public callEnded() {
        this.observable.send("callEnded", this);
    }

    public setValidity(valid: boolean) {
        this._isValid = valid;
        this.observable.send("validitySet", valid);
    }

    public abstract describe(): ObjectDescription;

};

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

export class AutoObject<T extends ObjectType = ObjectType> extends CPPObject<T> {

    public readonly name: string;

    public readonly def: LocalVariableDefinition | ParameterDefinition

    public constructor(def: LocalVariableDefinition | ParameterDefinition, type: T, memory: Memory, address: number) {
        super(type, memory, address);
        this.def = def;
        this.name = def.name;
    }

    public describe(): ObjectDescription {
        return this.def.declaredEntity.describe();
    }

}


export class MainReturnObject extends CPPObject<Int> {

    public constructor(memory: Memory) {
        super(Int.INT, memory, 0); // HACK: put it at address 0. probably won't cause any issues since it's not allocated
    }

    public describe(): ObjectDescription {
        return { name: "[main() return]", message: "The value returned from main." }
    }

}

export class StaticObject<T extends ObjectType = ObjectType> extends CPPObject<T> {

    public readonly name: string;

    public constructor(public readonly def: CompiledGlobalVariableDefinition, type: T, memory: Memory, address: number) {
        super(type, memory, address);
        this.name = name;
    }

    public describe(): ObjectDescription {
        return this.def.declaredEntity.describe();
    }

}

export class DynamicObject<T extends ObjectType = ObjectType> extends CPPObject<T> {

    public describe(): ObjectDescription {
        return { name: `[dynamic @${this.address}]`, message: `the heap object at 0x${this.address}` };
    }

}

export class InvalidObject<T extends ObjectType = ObjectType> extends CPPObject<T> {

    public constructor(type: T, memory: Memory, address: number) {
        super(type, memory, address);
        this.setValidity(false);
        this.kill()
    }

    public describe(): ObjectDescription {
        return { name: `[invalid @${this.address}`, message: `an invalid object at 0x${this.address}` };
    }
}

export class ThisObject<T extends ObjectType = ObjectType> extends CPPObject<T> {

    public describe(): ObjectDescription {
        return { name: "this", message: "the this pointer" };
    }

}

export class StringLiteralObject extends CPPObject<BoundedArrayType<Char>> {

    public constructor(type: BoundedArrayType<Char>, memory: Memory, address: number) {
        super(type, memory, address);
    }

    public describe(): ObjectDescription {
        return { name: `[string literal @${this.address}]`, message: "string literal at 0x" + this.address }
    }

}

abstract class Subobject<T extends ObjectType = ObjectType> extends CPPObject<T> {

    public readonly containingObject: CPPObject<BoundedArrayType | CompleteClassType>;

    public constructor(containingObject: CPPObject<BoundedArrayType | CompleteClassType>, type: T, memory: Memory, address: number) {
        super(type, memory, address);
        this.containingObject = containingObject;
    }

    get isAlive() {
        return this.containingObject.isAlive;
    }

    set isAlive(ignored: boolean) {

    }

    get deallocatedBy() {
        return this.containingObject.deallocatedBy;
    }

    protected onValueSet(write: boolean) {
        if (write) {
            this.containingObject.subobjectValueWritten();
        }
    }
}

export class ArraySubobject<T extends ArrayElemType = ArrayElemType> extends Subobject<T> {

    public readonly containingObject!: CPPObject<BoundedArrayType<T>>; // Handled by parent (TODO: is this a good idea?)
    public readonly index: number;

    public constructor(arrObj: CPPObject<BoundedArrayType<T>>, index: number, memory: Memory, address: number) {
        super(arrObj, arrObj.type.elemType, memory, address);
        this.index = index;
    }

    public getPointerTo() {
        return new Value(this.address, new ArrayPointerType(this.containingObject));
    }

    describe() {
        var arrDesc = this.containingObject.describe();
        return {
            name: arrDesc.name + "[" + this.index + "]",
            message: "element " + this.index + " of " + arrDesc.message,
        };
    }

}

export class BaseSubobject extends Subobject<CompleteClassType> {

    public readonly containingObject!: CPPObject<CompleteClassType>; // Handled by parent (TODO: is this a good idea?)

    public constructor(containingObject: CPPObject<CompleteClassType>, type: CompleteClassType, memory: Memory, address: number) {
        super(containingObject, type, memory, address);
    }

    public describe(): ObjectDescription {
        let contDesc = this.containingObject.describe();
        return { name: `[${this.type.className} base of ${contDesc.name}]`, message: "the " + this.type.className + " base of " + contDesc.message };
    }
}

export class MemberSubobject<T extends ObjectType = ObjectType> extends Subobject<T> {

    public readonly containingObject!: CPPObject<CompleteClassType>; // Handled by parent (TODO: is this a good idea?)
    public readonly name: string;

    public constructor(containingObject: CPPObject<CompleteClassType>, type: T, name: string, memory: Memory, address: number) {
        super(containingObject, type, memory, address);
        this.name = name;
    }

    public describe() {
        var parent = this.containingObject;
        let parentDesc = parent.describe();
        return {
            name: parentDesc.name + "." + this.name,
            message: "the member " + this.name + " of " + parentDesc.message
        }
    }
}


// export type TemporaryObjectType<T extends ObjectType> = T extends ObjectType ? TemporaryObject<T> : never;

export class TemporaryObject<T extends ObjectType = ObjectType> extends CPPObject<T> {

    private description: string;

    // public static create<T extends ObjectType>(type: T, memory: Memory, address: number, name?: string) : T extends ObjectType ? TemporaryObject<T> : never {
    //     return <any> new TemporaryObject(type, memory, address, name);
    // }

    public constructor(type: T, memory: Memory, address: number, description: string) {
        super(type, memory, address);
        this.description = description;
        // this.entityId = tempObjEntity.entityId;
    }

    public describe(): ObjectDescription {
        return { name: this.description, message: "the temporary object " + this.name };
    }
}