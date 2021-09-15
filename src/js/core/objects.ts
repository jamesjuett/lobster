import { Type, BoundedArrayType, AtomicType, PointerType, ObjectPointerType, ArrayPointerType, ArrayElemType, Char, Int, CompleteObjectType, CompleteClassType, toHexadecimalString } from "./types";
import { Observable } from "../util/observe";
import { assert, Mutable, asMutable } from "../util/util";
import { Memory, Value, RawValueType } from "./runtimeEnvironment";
import { RuntimeConstruct } from "./constructs";
import { LocalVariableDefinition, GlobalVariableDefinition, CompiledGlobalVariableDefinition, ParameterDefinition, CompiledClassDefinition } from "./declarations";
import { BoundReferenceEntity } from "./entities";

export interface ObjectDescription {
    name: string;
    message: string;
}

abstract class ObjectData<T extends CompleteObjectType> {
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

    public abstract kill(rt?: RuntimeConstruct): void;

    public abstract zeroInitialize(): void;
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

    public zeroInitialize() {
        this.setRawValue(0, false);
    }

    public kill() {
        // no subobjects, do nothing
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
        for (let i = 0; i < this.object.type.numElems; ++i) {
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

    public numArrayElemSubobjects(): number {
        return this.elemObjects.length;
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

    public zeroInitialize() {
        this.elemObjects.forEach(elemObj => elemObj.zeroInitialize());
    }

    public kill(rt?: RuntimeConstruct) {
        this.elemObjects.forEach(elemObj => elemObj.kill(rt));
    }
}

class ClassObjectData<T extends CompleteClassType> extends ObjectData<T> {

    private readonly subobjects: readonly Subobject[];
    private readonly baseSubobjects: readonly BaseSubobject[];
    private readonly memberSubobjects: readonly MemberSubobject[];
    private readonly memberObjectMap: {[index: string]: CPPObject | undefined} = {};

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
        if (classDef.baseType) {
            let baseObj = new BaseSubobject(this.object, classDef.baseType, memory, subAddr);
            asMutable(this.baseSubobjects).push(baseObj);
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

    public getMemberObject(name: string) : CPPObject | undefined {
        return this.memberObjectMap[name] ?? this.baseSubobjects[0]?.getMemberObject(name);
    }

    public bindMemberReference(name: string, obj: CPPObject<CompleteObjectType>) {
        this.memberObjectMap[name] = obj;
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

    public zeroInitialize() {
        this.subobjects.forEach(subobj => subobj.zeroInitialize());
    }
    
    public kill(rt?: RuntimeConstruct) {
        this.subobjects.forEach(subobj => subobj.kill(rt));
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

export type CPPObjectStorageKind =
    "automatic" |
    "dynamic" |
    "static" |
    "temporary" |
    "subobject" |
    "invalid";

type ObjectValueRepresentation<T extends CompleteObjectType> =
    T extends AtomicType ? Value<T> :
    T extends BoundedArrayType<infer Elem_type> ? ObjectValueRepresentation<Elem_type>[] :
    T extends CompleteClassType ? { [index: string]: ObjectRawValueRepresentation<CompleteObjectType> } : never;

type ObjectRawValueRepresentation<T extends CompleteObjectType> =
    T extends AtomicType ? RawValueType :
    T extends BoundedArrayType<infer Elem_type> ? ObjectRawValueRepresentation<Elem_type>[] :
    T extends CompleteClassType ? { [index: string]: ObjectRawValueRepresentation<CompleteObjectType> } : unknown;

// TODO: it may be more elegant to split into 3 derived types of CPPObject for arrays, classes, and
// atomic objects and use a public factory function to create the appropriate instance based on the
// template parameter. (Rather than the current awkward composition and conditional method strategy)
export abstract class CPPObject<T extends CompleteObjectType = CompleteObjectType> {

    private static _nextObjectId = 0;

    public readonly observable = new Observable(this);

    /**
     * Objects that result from a named declaration will have a name. For others
     * (e.g. dynamically allocated objects, temporary objects), this will be undefined.
     */
    public readonly name?: string;
    public readonly type: T;
    public readonly size: number;
    public readonly address: number;
    public readonly objectId;

    public abstract readonly storageKind: CPPObjectStorageKind;

    private readonly data: any;

    public readonly isAlive: boolean;
    public readonly deallocatedBy?: RuntimeConstruct;

    private _isValid: boolean;

    private readonly auxiliaryData : {[index: string]: any} = {};

    public constructor(type: T, memory: Memory, address: number) {
        this.type = type;
        this.size = type.size;
        this.objectId = CPPObject._nextObjectId++;
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

        // Object is not alive until it is initialized
        this.isAlive = false;

        // Validity is determined by the data this object currently holds
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
    public numArrayElemSubobjects<AT extends BoundedArrayType>(this: CPPObject<AT>): number {
        return this.data.numArrayElemSubobjects();
    }

    // Only allowed if receiver matches CPPObject<ArrayType<Elem_type>>
    public getArrayElemSubobjectByAddress<AT extends BoundedArrayType>(this: CPPObject<AT>, address: number): ArraySubobject<AT["elemType"]> {
        return this.data.getArrayElemSubobjectByAddress(address);
    }

    /**
     * Only allowed if receiver matches CPPObject<CompleteClassType>
     * Note that this returns CPPObject rather than MemberSubobject because
     * a reference member may refer to an external object that is not a subobject
     * @param this 
     * @param name 
     */
    public getMemberObject(this: CPPObject<CompleteClassType>, name: string) {
        return (<ClassObjectData<CompleteClassType>>this.data).getMemberObject(name);
    }

    // Only allowed if receiver matches CPPObject<CompleteClassType>
    public bindMemberReference(this: CPPObject<CompleteClassType>, name: string, obj: CPPObject<CompleteObjectType>) {
        return (<ClassObjectData<CompleteClassType>>this.data).bindMemberReference(name, obj);
    }

    // Only allowed if receiver matches CPPObject<CompleteClassType>
    public getBaseSubobject(this: CPPObject<CompleteClassType>) {
        return (<ClassObjectData<CompleteClassType>>this.data).getBaseSubobject();
    }

    public subobjectValueWritten() {
        this.observable.send("valueWritten");
    }

    public toString() {
        return "@" + this.address;
    }

    public beginLifetime() {
        assert(!this.isAlive);
        asMutable(this).isAlive = true;
        this.observable.send("lifetimeBegan", this);
    }

    public kill(rt?: RuntimeConstruct) {

        // kill subobjects
        this.data.kill(rt);

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

    // Only allowed if receiver matches CPPObject<ArrayType<Elem_type>>
    public decayToPointer<AT extends BoundedArrayType>(this: CPPObject<AT>) : Value<ArrayPointerType<AT["elemType"]>> {
        return this.getArrayElemSubobject(0).getPointerTo();
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

        this._onValueSet(write);
    }

    public _onValueSet(write: boolean) {

    }

    public writeValue<T_Atomic extends AtomicType>(this: CPPObject<T_Atomic>, newValue: Value<T_Atomic>) {
        this.setValue(newValue, true);
    }

    /**
     * Begins this object's lifetime and initializes its value.
     * May only be called on objects of atomic type.
     * @param this 
     * @param newValue 
     */
    public initializeValue<T_Atomic extends AtomicType>(this: CPPObject<T_Atomic>, newValue: Value<T_Atomic>) {
        this.beginLifetime();
        this.writeValue(newValue);
    }

    public zeroInitialize() {
        this.data.zeroInitialize();
        this.setValidity(true);
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

    public abstract isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is CPPObject<NarrowedT>;

    public hasStorage(storageKind: "dynamic") : this is DynamicObject;
    public hasStorage(storageKind: "automatic") : this is AutoObject;
    public hasStorage(storageKind: "subobject") : this is Subobject;
    public hasStorage(storageKind: "temporary") : this is TemporaryObject;
    public hasStorage(storageKind: "invalid") : this is InvalidObject;
    public hasStorage(storageKind: CPPObjectStorageKind) {
        return this.storageKind === storageKind;
    }

    /**
     * Notify this object that a reference has been bound to it
     */
    public onReferenceBound(entity: BoundReferenceEntity) {
        this.observable.send("referenceBoundToMe", entity);
    }

    /**
     * Notify this object that a reference has been unbound from it
     * (e.g. that reference went out of scope)
     */
    public onReferenceUnbound(entity: BoundReferenceEntity) {
        this.observable.send("referenceUnbound", entity);
    }

    public abstract describe(): ObjectDescription;

    public setAuxiliaryData(key: string, data: any) {
        this.auxiliaryData[key] = data;
    }

    public getAuxiliaryData(key: string) {
        return this.auxiliaryData[key];
    }

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

export class AutoObject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {

    public readonly storageKind = "automatic";

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
    
    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is AutoObject<NarrowedT> {
        return predicate(this.type);
    }

}


export class MainReturnObject extends CPPObject<Int> {

    public readonly storageKind = "static";

    public constructor(memory: Memory) {
        super(Int.INT, memory, 0); // HACK: put it at address 0. probably won't cause any issues since it's not allocated
    }

    public isTyped<NarrowedT extends Int>(predicate: (t:Int) => t is NarrowedT) : this is MainReturnObject;
    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends Int>(predicate: (t:Int) => t is NarrowedT) : this is MainReturnObject {
        return predicate(this.type);
    }

    public describe(): ObjectDescription {
        return { name: "[main() return]", message: "The value returned from main." }
    }

}

export class StaticObject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {

    public readonly storageKind = "static";

    public readonly name: string;

    public constructor(public readonly def: CompiledGlobalVariableDefinition, type: T, memory: Memory, address: number) {
        super(type, memory, address);
        this.name = def.name;
    }

    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is StaticObject<NarrowedT> {
        return predicate(this.type);
    }

    public describe(): ObjectDescription {
        return this.def.declaredEntity.describe();
    }

}

export class DynamicObject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {

    public readonly storageKind = "dynamic";

    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is DynamicObject<NarrowedT> {
        return predicate(this.type);
    }

    public describe(): ObjectDescription {
        return { name: `[dynamic @${this.address}]`, message: `the heap object at ${toHexadecimalString(this.address)}` };
    }

}

export class InvalidObject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {

    public readonly storageKind = "invalid";

    public constructor(type: T, memory: Memory, address: number) {
        super(type, memory, address);
        this.setValidity(false);
        this.kill();
    }
    
    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is InvalidObject<NarrowedT> {
        return predicate(this.type);
    }

    public describe(): ObjectDescription {
        return { name: `[invalid @${this.address}]`, message: `an invalid object at ${toHexadecimalString(this.address)}` };
    }
}

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

export class StringLiteralObject extends CPPObject<BoundedArrayType<Char>> {

    public readonly storageKind = "static";

    public constructor(type: BoundedArrayType<Char>, memory: Memory, address: number) {
        super(type, memory, address);
    }

    public isTyped<NarrowedT extends BoundedArrayType<Char>>(predicate: (t:BoundedArrayType<Char>) => t is NarrowedT) : this is StringLiteralObject;
    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends BoundedArrayType<Char>>(predicate: (t:BoundedArrayType<Char>) => t is NarrowedT) : this is StringLiteralObject {
        return predicate(this.type);
    }

    public describe(): ObjectDescription {
        return { name: `[string literal @${this.address}]`, message: `string literal at ${toHexadecimalString(this.address)}` }
    }

}

abstract class Subobject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {

    public readonly storageKind = "subobject";

    public readonly containingObject: CPPObject<BoundedArrayType | CompleteClassType>;

    public constructor(containingObject: CPPObject<BoundedArrayType | CompleteClassType>, type: T, memory: Memory, address: number) {
        super(type, memory, address);
        this.containingObject = containingObject;
    }

    public _onValueSet(write: boolean) {
        if (write) {
            this.containingObject.subobjectValueWritten();
        }
    }
}

export class ArraySubobject<T extends ArrayElemType = ArrayElemType> extends Subobject<T> {

    public readonly containingObject!: CPPObject<BoundedArrayType<T>>; // Handled by parent (TODO: is this a good idea?) lol no i don't think so
    public readonly index: number;

    public constructor(arrObj: CPPObject<BoundedArrayType<T>>, index: number, memory: Memory, address: number) {
        super(arrObj, arrObj.type.elemType, memory, address);
        this.index = index;
    }

    public getPointerTo() {
        return new Value(this.address, new ArrayPointerType(this.containingObject));
    }

    public isTyped<NarrowedT extends ArrayElemType>(predicate: (t:ArrayElemType) => t is NarrowedT) : this is ArraySubobject<NarrowedT>;
    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends ArrayElemType>(predicate: (t:ArrayElemType) => t is NarrowedT) : this is ArraySubobject<NarrowedT> {
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

export class BaseSubobject extends Subobject<CompleteClassType> {

    public readonly containingObject!: CPPObject<CompleteClassType>; // Handled by parent (TODO: is this a good idea?)

    public constructor(containingObject: CPPObject<CompleteClassType>, type: CompleteClassType, memory: Memory, address: number) {
        super(containingObject, type, memory, address);
    }

    public isTyped<NarrowedT extends CompleteClassType>(predicate: (t:CompleteClassType) => t is NarrowedT) : this is BaseSubobject;
    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends CompleteClassType>(predicate: (t:CompleteClassType) => t is NarrowedT) : this is BaseSubobject {
        return predicate(this.type);
    }

    public describe(): ObjectDescription {
        let contDesc = this.containingObject.describe();
        return { name: `[${this.type.className} base of ${contDesc.name}]`, message: "the " + this.type.className + " base of " + contDesc.message };
    }
}

export class MemberSubobject<T extends CompleteObjectType = CompleteObjectType> extends Subobject<T> {

    public readonly containingObject!: CPPObject<CompleteClassType>; // Handled by parent (TODO: is this a good idea?)
    public readonly name: string;

    public constructor(containingObject: CPPObject<CompleteClassType>, type: T, name: string, memory: Memory, address: number) {
        super(containingObject, type, memory, address);
        this.name = name;
    }

    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is MemberSubobject<NarrowedT> {
        return predicate(this.type);
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

export class TemporaryObject<T extends CompleteObjectType = CompleteObjectType> extends CPPObject<T> {

    public readonly storageKind = "temporary";

    private description: string;

    // public static create<T extends ObjectType>(type: T, memory: Memory, address: number, name?: string) : T extends ObjectType ? TemporaryObject<T> : never {
    //     return <any> new TemporaryObject(type, memory, address, name);
    // }

    public constructor(type: T, memory: Memory, address: number, description: string) {
        super(type, memory, address);
        this.description = description;
        // this.entityId = tempObjEntity.entityId;
    }

    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is TemporaryObject<NarrowedT> {
        return predicate(this.type);
    }

    public describe(): ObjectDescription {
        return { name: this.description, message: "the temporary object " + this.name };
    }
}