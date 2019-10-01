import * as Util from "../util/util";
import {CPPConstruct, BasicCPPConstruct, ConstructContext} from "./constructs";
import {CPPError} from "./errors";
import {Value, RawValueType, byte} from "./runtimeEnvironment";
import {Description} from "./errors";
import { CPPObject, Subobject } from "./objects";
import flatten from "lodash/flatten";
import { NameLookupOptions, ClassScope, CPPEntity, FunctionEntity, MemberFunctionEntity, BaseClassEntity, Scope, ConstructorEntity, MemberVariableEntity, TypeEntity } from "./entities";
import { QualifiedName, fullyQualifiedNameToUnqualified } from "./lexical";
import { ExpressionASTNode } from "./expressions";
import { StorageSpecifier, StorageSpecifierKey } from "./declarations";

var vowels = ["a", "e", "i", "o", "u"];
function isVowel(c: string) {
    return vowels.indexOf(c) != -1;
};






export var userTypeNames = {};
export const builtInTypes : {[index:string]: Util.Constructor<Type>} = {};

export var defaultUserTypeNames = {
    ostream : true,
    istream : true,
    size_t : true
};

export function isType<T extends Type>(type: Type, ctor: Util.Constructor<T>) : type is InstanceType<typeof ctor> {
    return type.isType(ctor);
};

export function sameType(type1: Type, type2: Type) {
    return type1.sameType(type2);
};

export function similarType(type1: Type, type2: Type) {
    return type1.similarType(type2);
};

// TODO subType function is dangerous :( (I think I originally wrote this because Type overall doesn't have isDerivedFrom)
export function subType(type1: ClassType, type2: ClassType) {
    return type1 instanceof ClassType && type2 instanceof ClassType && type1.isDerivedFrom(type2);
};

export var covariantType = function(derived: Type, base: Type){
    if (sameType(derived, base)){
        return true;
    }

    var dc;
    var bc;
    if (derived instanceof PointerType && base instanceof PointerType){
        dc = derived.ptrTo;
        bc = base.ptrTo;
    }
    else if (derived instanceof ReferenceType && base instanceof ReferenceType){
        dc = derived.refTo;
        bc = base.refTo;
    }
    else{
        return false; // not both pointers or both references
    }

    // Must be pointers or references to class type
    if (!(dc instanceof ClassType) || !(bc instanceof ClassType)){
        return false;
    }

    // dc must be derived from bc
    if (!dc.isDerivedFrom(bc)){
        return false;
    }

    // Pointers/References must have the same cv-qualification
    if (derived.isConst != base.isConst || derived.isVolatile != base.isVolatile){
        return false;
    }

    // dc must have same or less cv-qualification as bc
    if (dc.isConst && !bc.isConst || dc.isVolatile && !bc.isVolatile){
        return false;
    }

    // Yay we made it!
    return true;
};

export function referenceCompatible(from: Type, to: Type){
    return from && to && from.isReferenceCompatible(to);
};

// export function noRef<T extends ObjectType | Reference>(type : T) : ObjectType {
//     if(type instanceof Reference) {
//         return type.refTo;
//     }
//     else{
//         return type;
//     }
// };

export function isCvConvertible(t1: Type, t2: Type){

    // t1 and t2 must be similar
    if (!similarType(t1,t2)){ return false; }

    // Discard 0th level of cv-qualification signatures, we don't care about them.
    // (It's essentially a value semantics thing, we're making a copy so top level const doesn't matter.)
    t1 = t1.getCompoundNext();
    t2 = t2.getCompoundNext();

    // check that t2 has const everywhere that t1 does
    // also if we ever find a difference, t2 needs const everywhere leading
    // up to it (but not including) (and not including discarded 0th level).
    var t2AllConst = true;
    while(t1 && t2){ //similar so they should run out at same time
        if (t1.isConst && !t2.isConst){
            return false;
        }
        else if (!t1.isConst && t2.isConst && !t2AllConst){
            return false;
        }

        // Update allConst
        t2AllConst = t2AllConst && t2.isConst;
        t1 = t1.getCompoundNext();
        t2 = t2.getCompoundNext();
    }

    // If no violations, t1 is convertable to t2
    return true;
};

// interface DefaultTypeProperties {
//     size: number;
//     precedence: number;
//     isArithmeticType?: boolean;
//     isIntegralType?: boolean;
//     isFloatingPointType?: boolean;
//     isComplete?: boolean;
// }

abstract class TypeBase {
    public static readonly _name = "Type";

    /**
     * Used in parenthesization of string representations of types.
     * e.g. Array types have precedence 2, whereas Pointer types have precedence 1.
     */
    public abstract readonly precedence: number;

    public abstract readonly isArithmeticType: boolean;
    public abstract readonly isIntegralType: boolean;
    public abstract readonly isFloatingPointType: boolean;
    public abstract readonly isComplete: boolean;

    // regular member properties
    public readonly isConst: boolean;
    public readonly isVolatile: boolean;

    public constructor(isConst: boolean = false, isVolatile: boolean = false) {
        this.isConst = isConst;
        // TODO ignore volatile completely? for now (and perhaps forever lol)
        this.isVolatile = isVolatile;
    }

    public getCVString() {
        return (this.isConst ? "const " : "") + (this.isVolatile ? "volatile " : "");
    }

    public toString() {
        return this.typeString(false, "");
    }

    /**
     * Returns true if this type object is an instance of the given Type class
     */
    public isType<T extends Type>(ctor: Util.Constructor<T>) : this is InstanceType<typeof ctor> {
        return this instanceof ctor;
    }

    public isObjectType() : this is ObjectType {
        return this instanceof ObjectType;
    }
    
    public isAtomicType() : this is AtomicType {
        return this instanceof AtomicType;
    }

    public isPointerType() : this is PointerType {
        return this instanceof PointerType;
    }

    public isReferenceType() : this is ReferenceType {
        return this instanceof ReferenceType;
    }

    public isClassType() : this is ClassType {
        return this instanceof ClassType;
    }

    public isBoundedArrayType() : this is BoundedArrayType {
        return this instanceof BoundedArrayType;
    }

    public isArrayOfUnknownBoundType() : this is ArrayOfUnknownBoundType {
        return this instanceof ArrayOfUnknownBoundType;
    }

    public isGenericArrayType() : this is BoundedArrayType | ArrayOfUnknownBoundType {
        return this instanceof BoundedArrayType || this instanceof ArrayOfUnknownBoundType;
    }

    public isFunctionType() : this is FunctionType {
        return this instanceof FunctionType;
    }

    public isArrayElemType() : this is ArrayElemType {
        return this instanceof AtomicType || this instanceof ClassType;
    }

    public isVoidType() : this is VoidType {
        return this instanceof VoidType;
    }
    
    public isPotentialReturnType() : this is PotentialReturnType {
        return this instanceof ObjectType || this instanceof ReferenceType || this instanceof VoidType;
    }

    public isPotentialParameterType() : this is PotentialParameterType {
        return this instanceof ObjectType || this instanceof ReferenceType;
    }

    /**
     * Returns true if other represents exactly the same type as this, including cv-qualifications.
     */
    public abstract sameType(other: Type) : boolean;

    /**
     * Returns true if other represents the same type as this, ignoring cv-qualifications.
     */
    public abstract similarType(other: Type) : boolean;


    /**
     * Returns true if this type is reference-related (see C++ standard) to the type other.
     * @param other
     */
    public isReferenceRelated(this: Type, other: Type) : boolean {
        return sameType(this.cvUnqualified(), other.cvUnqualified()) ||
            subType(this.cvUnqualified(),other.cvUnqualified());
    }

    /**
     * Returns true if this type is reference-compatible (see C++ standard) to the type other.
     * @param {Type} other
     * @returns {boolean}
     */
    public isReferenceCompatible(this: Type, other: Type) {
        return this.isReferenceRelated(other) && (other.isConst || !this.isConst) && (other.isVolatile || !this.isVolatile);
    }

    /**
     * Returns a C++ styled string representation of this type.
     * @param excludeBase If true, exclude the base type.
     * @param varname The name of the variable. May be the empty string.
     * @param decorated If true, html tags will be added.
     */
    public abstract typeString(excludeBase: boolean, varname: string, decorated?: boolean) : string;

    /**
     * Returns a C++ styled string representation of this type, with the base type excluded as
     * would be suitable for only printing the declarator part of a declaration.
     * @param varname The name of the variable. May be the empty string.
     */
    public declaratorString(varname: string) {
        return this.typeString(true, varname);
    }

    /**
     * Returns a string representing a type as it might be read verbally in english.
     * e.g. int const * var[5] --> "an array of 5 pointers to const int"
     * @param plural Whether the returned string should be plural.
     */
    public abstract englishString(plural: boolean) : string;

    /**
     * Helper function for functions that create string representations of types.
     */
    protected parenthesize(outside: Type, str: string) {
        return this.precedence < outside.precedence ? "(" + str + ")" : str;
    }

    /**
     * Both the name and message are just a C++ styled string representation of the type.
     * @returns {{name: {String}, message: {String}}}
     */
    public describe() : Description {
        var str = this.typeString(false, "");
        return {name: str, message: str};
    }

    /**
     * If this is a compound type, returns the "next" type.
     * e.g. if this is a pointer-to-int, returns int
     * e.g. if this ia a reference to pointer-to-int, returns int
     * e.g. if this is an array of bool, returns bool
     */
    public getCompoundNext() : Type | null {
        return null;
    }

    /**
     * Returns true if this type is either const or volatile (or both)
     * @returns {boolean}
     */
    public isCVQualified() {
        return this.isConst || this.isVolatile;
    }

    // TODO: perhaps make a way to clone a type with a particular cv qualification rather than the proxy approach, which seems more fragile

    /**
     * Returns a cv-unqualified copy of this type.
     */
    public cvUnqualified() {
        return this.cvQualified(false, false);
    }

    /**
     * Returns a copy of this type with the specified cv-qualifications.
     */
    public cvQualified(isConst: boolean, isVolatile: boolean = false): this {
        return <this>this.cvQualifiedImpl(isConst, isVolatile);
    }

    protected abstract cvQualifiedImpl(isConst: boolean, isVolatile: boolean): TypeBase;
};

// /**
//  * Used when a compilation error causes an unknown type.
//  */
// export class Unknown extends Type {


//     public sameType(other: Type) : boolean {
//         return false;
//     }

//     public similarType(other: Type) : boolean{
//         return false;
//     }

// 	public typeString(excludeBase: boolean, varname: string, decorated: boolean) {
//         return "<unknown>";
//     }
    
// 	public englishString(plural: boolean) {
// 		return "an unknown type";
//     }
    
// 	public valueToString(value: RawValueType) {
//         Util.assert(false);
//         return "";
//     }
    
//     public isValueValid(value: RawValueType) {
//         return false;
//     }
// }

// builtInTypes["unknown"] = Unknown;

// export let UNKNOWN_TYPE = new Unknown();

export type Type = VoidType | ObjectType | FunctionType | ReferenceType | ArrayOfUnknownBoundType;

export class VoidType extends TypeBase {
    
    public static readonly VOID = new VoidType();

    public readonly isArithmeticType = false;
    public readonly isIntegralType = false;
    public readonly isFloatingPointType = false;
    public readonly isComplete = true;

    public readonly precedence = 0;

    public sameType(other: Type) : boolean {
        return other instanceof VoidType
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    }

    public similarType(other: Type) : boolean {
        return other instanceof VoidType;
    }

	public typeString(excludeBase: boolean, varname: string, decorated: boolean) {
        return "void";
    }
    
	public englishString(plural: boolean) {
		return "void";
    }
    
    protected cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new VoidType(isConst, isVolatile);
    }
}
builtInTypes["void"] = VoidType;

/**
 * Represents a type for an object that exists in memory and takes up some space.
 * Has a size property, but NOT necessarily a value. (e.g. an array).
 */
export abstract class ObjectType extends TypeBase {
    public abstract readonly size: number;
}

export type PotentialReturnType = ObjectType | ReferenceType | VoidType;

export type PotentialParameterType = AtomicType | ClassType | ReferenceType; // Does not include arrays

/**
 * Represents a type for an object that has a value.
 */
abstract class ValueType extends ObjectType {

    /**
     * Converts a sequence of bytes (i.e. the C++ object representation) of a value of
     * this type into the raw value used to represent it internally in Lobster (i.e. a javascript value).
     * @param bytes
     */
    public bytesToValue(bytes: byte[]) : RawValueType {
        // HACK: the whole value is stored in the first byte
        return bytes[0];
    }

    /**
     * Converts a raw value representing a value of this type to a sequence of bytes
     * (i.e. the C++ object representation)
     * @param value
     */
    public valueToBytes(value: RawValueType) {
        var bytes = [];
        // HACK: store the whole value in the first byte and zero out the rest. thanks javascript :)
        bytes[0] = value;
        for(var i = 1; i < this.size-1; ++i){
            bytes.push(0);
        }
        return <byte[]>bytes;
    }

    /**
     * Returns whether a given raw value for this type is valid. For example, a pointer type may track runtime
     * type information about the array from which it was originally derived. If the pointer value increases such
     * that it wanders over the end of that array, its value becomes invalid.
     * @param value
     */
    public abstract isValueValid(value: RawValueType) : boolean;

    /**
     * Returns a human-readable string representation of the given raw value for this Type.
     * This is the representation that might be displayed to the user when inspecting the
     * value of an object.
     * Note that the value representation for the type in Lobster is just a javascript
     * value. It is not the C++ value representation for the type.
     * @param value
     */
    public abstract valueToString(value: RawValueType) : string;

    /**
     * Returns the string representation of the given raw value for this Type that would be
     * printed to an ostream.
     * Note that the raw value representation for the type in Lobster is just a javascript
     * value. It is not the C++ value representation for the type.
     * TODO: This is a hack that may eventually be removed since printing to a stream should
     * really be handled by overloaded << operator functions.
     * @param value
     */
    public valueToOstreamString(value: RawValueType) {
        return this.valueToString(value);
    }
}



export abstract class AtomicType extends ValueType {
    public readonly isAtomic = true;

}

export abstract class SimpleType extends AtomicType {
    
    /**
     * Subclasses must implement a concrete type property that should be a
     * string indicating the kind of type e.g. "int", "double", "bool", etc.
     */
    protected abstract simpleType: string;

    public readonly isComplete = true;
    public readonly precedence = 0;

    public sameType(other: Type) : boolean {
        return other instanceof SimpleType
            && other.simpleType === this.simpleType
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    }

    public similarType(other: Type) : boolean{
        return other instanceof SimpleType
            && other.simpleType === this.simpleType;
    }

	public typeString(excludeBase: boolean, varname: string, decorated: boolean) {
        if (excludeBase) {
            return varname ? varname : "";
        }
        else{
            return this.getCVString() + (decorated ? Util.htmlDecoratedType(this.simpleType) : this.simpleType) + (varname ? " " + varname : "");
        }
    }
    
	public englishString(plural: boolean) {
		// no recursive calls to this.simpleType.englishString() here
		// because this.simpleType is just a string representing the type
        var word = this.getCVString() + this.simpleType;
		return (plural ? this.simpleType+"s" : (isVowel(word.charAt(0)) ? "an " : "a ") + word);
    }
    
	public valueToString(value: RawValueType) {
		return ""+value;
    }
    
    public isValueValid(value: RawValueType) {
        return true;
    }
}



// TODO: This was an idea for a hack to store C++ object data into a javascript object. I don't think it's going to be used anywhere.
// var _Universal_data = SimpleType.extend({
//     _name: "_Universal_data",
//     simpleType: "_universal_data",
//     size: 16
// });
// builtInTypes["_universal_data"] = _Universal_data;

export abstract class IntegralType extends SimpleType {
    public readonly isFloatingPointType = false;
    public readonly isIntegralType = true;
    public readonly isArithmeticType = true;
    
}


export class Char extends IntegralType {
    
    protected readonly simpleType = "char";
    public readonly size = 1;

    public static readonly NULL_CHAR = 0;

    public static isNullChar(value: RawValueType) {
        return value === this.NULL_CHAR;
    }

    public static jsStringToNullTerminatedCharArray(str: string) {
        var chars = str.split("").map(function(c){
            return c.charCodeAt(0);
        });
        chars.push(Char.NULL_CHAR);
        return chars;
    }

    public valueToString(value: RawValueType) {
        // use <number> assertion based on the assumption this will only be used with proper raw values that are numbers
        return "'" + Util.unescapeString(String.fromCharCode(<number>value)) + "'";//""+value;
    }
    public valueToOstreamString(value: RawValueType) {
        // use <number> assertion based on the assumption this will only be used with proper raw values that are numbers
        return String.fromCharCode(<number>value);
    }
    
    protected cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new Char(isConst, isVolatile);
    }
}
builtInTypes["char"] = Char;

export class Int extends IntegralType {
    public static readonly INT = new Int();

    protected readonly simpleType = "int";
    public readonly size = 4;
    
    protected cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new Int(isConst, isVolatile);
    }
};

builtInTypes["int"] = Int;

export class Size_t extends IntegralType {
    protected readonly simpleType = "size_t";
    public readonly size = 8;
    
    protected cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new Size_t(isConst, isVolatile);
    }
}
builtInTypes["size_t"] = Size_t;

export class Bool extends IntegralType {
    public static readonly BOOL = new Bool();

    protected readonly simpleType = "bool";
    public readonly size = 1;
    
    protected cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new Bool(isConst, isVolatile);
    }
}
builtInTypes["bool"] = Bool;

// TODO: add support for Enums



export abstract class FloatingPointType extends SimpleType {

    public readonly isIntegralType = false;
    public readonly isFloatingPointType = true;
    public readonly isArithmeticType = true;

    public valueToString(value: RawValueType) {
        // use <number> assertion based on the assumption this will only be used with proper raw values that are numbers
        var str = ""+<number>value;
        return str.indexOf(".") != -1 ? str : str + ".";
    }
}

export class Float extends FloatingPointType {

    public static readonly FLOAT = new Float();

    protected readonly simpleType = "float";
    public readonly size = 4;
    
    protected cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new Float(isConst, isVolatile);
    }
}
builtInTypes["float"] = Float;

export class Double extends FloatingPointType {

    public static readonly DOUBLE = new Double();

    protected readonly simpleType = "double";
    public readonly size = 8;
    
    protected cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new Double(isConst, isVolatile);
    }
}
builtInTypes["double"] = Double;

// TODO: OStream shouldn't be a primitive type, should be an instrinsic class
// export class OStream extends SimpleType {
//     public isArithmeticType: boolean;
//     public isIntegralType: boolean;
//     public isFloatingPointType: boolean;
//     protected readonly simpleType = "ostream";
//     public readonly size = 4;

// }
// builtInTypes["ostream"] = OStream;

// TODO: add support for istream
// export class IStream = SimpleType.extend({
//     _name: "IStream",
//     simpleType: "istream",
//     size: 4,

//     valueToString : function(value){
//         return JSON.stringify(value);
//     }
// });
// builtInTypes["istream"] = IStream;



export interface ArithmeticType extends SimpleType {
    readonly isArithmeticType: true;
}

//TODO: create separate function pointer type???

export class PointerType extends AtomicType {
    public isArithmeticType = false;
    public isIntegralType = false;
    public isFloatingPointType = false;

    public readonly size = 8;
    public readonly precedence = 1;
    public readonly isComplete = true;

    public static isNull(value: RawValueType) {
        return <number>value === 0;
    }

    public static isNegative(value: RawValueType) {
        return <number>value < 0;
    }

    public readonly ptrTo: ObjectType; // TODO: add | VoidType for void pointers? or just make that a whole separate VoidPointer class?

    public constructor(ptrTo: ObjectType, isConst?: boolean, isVolatile?: boolean) {
        super(isConst, isVolatile);
        this.ptrTo = ptrTo;
    }

    public getCompoundNext() {
        return this.ptrTo;
    }

    public sameType(other: Type) : boolean {
        return other instanceof PointerType
            && this.ptrTo.sameType(other.ptrTo)
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    }

    public similarType(other: Type) : boolean {
        return other instanceof PointerType
            && this.ptrTo.similarType(other.ptrTo);
    }

    public typeString(excludeBase: boolean, varname: string, decorated: boolean) {
        return this.ptrTo.typeString(excludeBase, this.parenthesize(this.ptrTo, this.getCVString() + "*" + varname), decorated);
    }

    public englishString(plural: boolean) {
        return (plural ? this.getCVString()+"pointers to" : "a " +this.getCVString()+"pointer to") + " " + this.ptrTo.englishString();
    }

    public valueToString(value: RawValueType) {
        // TODO: clean up when function pointers are reimplemented
        // if (this.ptrTo instanceof FunctionType && value) {
        //     return value.name;
        // }
        // else{
            return "0x" + value;
        // }
    }

    public isObjectPointer() {
        return this.ptrTo.isObjectType();
    }

    /**
     * Returns whether a given raw value for this type is dereferenceable. For pointer types, the given raw value is dereferenceable
     * if the result of the dereference will be a live object. An example of the distinction between validity and
     * dereferenceability for pointer types would be an array pointer. The pointer value (an address) is dereferenceable
     * if it is within the bounds of the array. It is valid in those same locations plus also the location one space
     * past the end (but not dereferenceable there). All other address values are invalid.
     * @param value
     */
    public isValueDereferenceable(value: RawValueType) {
        return this.isValueValid(value);
    }

    public isValueValid(value: RawValueType) {
        return true;
    }
    
    protected cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new PointerType(this.ptrTo, isConst, isVolatile);
    }
}

export class ArrayPointer extends PointerType {

    public readonly arrayObject: CPPObject<BoundedArrayType>;

    public constructor(arrayObject: CPPObject<BoundedArrayType>, isConst?: boolean, isVolatile?: boolean) {
        super(arrayObject.type.elemType, isConst, isVolatile);
        this.arrayObject = arrayObject;
    }

    public min() {
        return this.arrayObject.address;
    }

    public onePast() {
        return this.arrayObject.address + this.arrayObject.type.size;
    }

    public isValueValid(value: RawValueType) {
        if (!this.arrayObject.isAlive){
            return false;
        }
        var arrayObject = this.arrayObject;
        return arrayObject.address <= value && value <= arrayObject.address + arrayObject.type.size;
    }

    public isValueDereferenceable(value: RawValueType) {
        return this.isValueValid(value) && value !== this.onePast();
    }

    public toIndex(addr: number) {
        return Math.trunc((addr - this.arrayObject.address) /  this.arrayObject.type.elemType.size);
    }

    protected cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new ArrayPointer(this.arrayObject, isConst, isVolatile);
    }
}

export class ObjectPointer extends PointerType {

    public readonly pointedObject: CPPObject<ObjectType>;

    public constructor(obj: CPPObject<ObjectType>, isConst?: boolean, isVolatile?: boolean) {
        super(obj.type, isConst, isVolatile);
        this.pointedObject = obj;
    }

    public getPointedObject() {
        return this.pointedObject;
    }
    
    public isValueValid(value: RawValueType) {
        return this.pointedObject.isAlive && this.pointedObject.address === value;
    }

    protected cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new ObjectPointer(this.pointedObject, isConst, isVolatile);
    }
}


export class ReferenceType extends TypeBase {
    public readonly isArithmeticType = false;
    public readonly isIntegralType = false;
    public readonly isFloatingPointType = false;

    public readonly precedence = 1;
    public readonly isComplete = true;

    public readonly refTo: ObjectType;

    public constructor(refTo: ObjectType, isConst?: boolean, isVolatile?: boolean) {
        // References have no notion of const (they can't be re-bound anyway)
        super(false, isVolatile);
        this.refTo = refTo;
    }

    public getCompoundNext() {
        return this.refTo;
    }

    public sameType(other: Type) : boolean {
        return other instanceof ReferenceType && this.refTo.sameType(other.refTo);
    }

    //Note: I don't think similar types even make sense with references. See standard 4.4
    public similarType(other: Type) : boolean {
        return other instanceof ReferenceType && this.refTo.similarType(other.refTo);
    }

    public typeString(excludeBase: boolean, varname: string, decorated: boolean) {
		return this.refTo.typeString(excludeBase, this.parenthesize(this.refTo, this.getCVString() + "&" + varname), decorated);
    }
    
	public englishString(plural: boolean) {
		return this.getCVString() + (plural ? "references to" : "a reference to") + " " + this.refTo.englishString(false);
    }
    
	public valueToString(value: RawValueType){
		return ""+value;
    }
    
    protected cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new ReferenceType(this.refTo, isConst, isVolatile);
    }
}

export type noRefType<T> = T extends ReferenceType ? T["refTo"] : T;

export type ArrayElemType = AtomicType | ClassType;

// Represents the type of an array. This is not an ObjectType because an array does
// not have a value that can be read/written. The Elem_type type parameter must be
// an AtomicType or ClassType. (Note that this rules out arrays of arrays, which are currently not supported.)
export class BoundedArrayType<Elem_type extends ArrayElemType = ArrayElemType> extends ObjectType {
    
    public readonly size: number;

    public readonly isArithmeticType = false;
    public readonly isIntegralType = false;
    public readonly isFloatingPointType = false;

    public readonly precedence = 2;

    public readonly elemType: Elem_type;
    public readonly length: number;

    public constructor(elemType: Elem_type, length: number) {

        // TODO: sanity check the semantics here, but I don't think it makes sense for an array itself to be volatile
        super(false, false);

        this.elemType = elemType;
        this.length = length;
        this.size = elemType.size * length;
    }

    public get isComplete() {
        // Note: this class does not currently represent "array of unknown bound" types.
        // Should that change, additional logic would be needed here since those are considered
        // incomplete types.
        
        // Completeness may change if elemType completeness changes
        // (e.g. array of potentially (in)complete class type objects)
        return this.elemType.isComplete;
    }

    public getCompoundNext() {
        return this.elemType;
    }

    public sameType(other: Type) : boolean {
        return other instanceof BoundedArrayType && this.elemType.sameType(other.elemType) && this.length === other.length;
    }

    public similarType(other: Type) : boolean {
        return other instanceof BoundedArrayType && this.elemType.similarType(other.elemType) && this.length === other.length;
    }

    public typeString(excludeBase: boolean, varname: string, decorated: boolean) {
		return this.elemType.typeString(excludeBase, varname +  "["+this.length+"]", decorated);
    }
    
	public englishString(plural: boolean) {
        return (plural ? "arrays of " : "an array of ") + this.length + " " + this.elemType.englishString(this.length > 1);
    }
    
    protected cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new BoundedArrayType(this.elemType, this.length); // Note arrays don't have cv qualifications so they are ignored here
    }
    
    public adjustToPointerType() {
        return new PointerType(this.elemType, false, false);
    }

	// public valueToString(value: RawValueType) {
	// 	return ""+value;
    // }
    
    // public bytesToValue(bytes: byte[]) : never {
    //     return Util.assertFalse(); // TODO: actually change type hierarchy so ArrayTypes do not support a mechanism for reading/writing their value
    //     // var arr = [];
    //     // var elemSize = this.elemType.size;
    //     // for(var i = 0; i < bytes.length; i += elemSize){
    //     //     arr.push(this.elemType.bytesToValue(bytes.slice(i, i + elemSize)));
    //     // }
    //     // return arr;
    // }
    // public valueToBytes(value: RawValueType) : never {
    //     return Util.assertFalse(); // TODO: actually change type hierarchy so ArrayTypes do not support a mechanism for reading/writing their value
    //     // return flatten(value.map(
    //     //     (elem: RawValueType) => { return this.elemType.valueToBytes(elem); }
    //     // ));
    // }
}


export class ArrayOfUnknownBoundType<Elem_type extends ArrayElemType = ArrayElemType> extends TypeBase {
    
    public readonly isArithmeticType = false;
    public readonly isIntegralType = false;
    public readonly isFloatingPointType = false;

    public readonly precedence = 2;

    public readonly elemType: Elem_type;

    public readonly isComplete = false;

    public readonly sizeExpressionAST?: ExpressionASTNode;

    public constructor(elemType: Elem_type, sizeExpressionAST?: ExpressionASTNode) {
        super(false, false);
        this.elemType = elemType;
        this.sizeExpressionAST = sizeExpressionAST;
    }

    public getCompoundNext() {
        return this.elemType;
    }

    public sameType(other: Type) : boolean {
        return other instanceof ArrayOfUnknownBoundType && this.elemType.sameType(other.elemType);
    }

    public similarType(other: Type) : boolean {
        return other instanceof ArrayOfUnknownBoundType && this.elemType.similarType(other.elemType);
    }

    public typeString(excludeBase: boolean, varname: string, decorated: boolean) {
		return this.elemType.typeString(excludeBase, varname +  "[]", decorated);
    }
    
	public englishString(plural: boolean) {
        return (plural ? "arrays of unknown bound of " : "an array of unknown bound of ") + this.elemType.englishString(true);
    }
    
    protected cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new ArrayOfUnknownBoundType(this.elemType, this.sizeExpressionAST);
    }

    public adjustToPointerType() {
        return new PointerType(this.elemType, false, false);
    }
}

// TODO: Add a type for an incomplete class

// TODO: get rid of or move this comment somewhere appropriate
/**
 * memberEntities - an array of all member entities. does not inlcude constructors, destructor, or base class subobject entities
 * subobjectEntities - an array containing all subobject entities, include base class subobjects and member subobjects
 * baseClassEntities - an array containing entities for any base class subobjects
 * memberSubobjectEntities - an array containing entities for member subobjects (does not contain base class subobjects)
 * constructors - an array of the constructor entities for this class. may be empty if no constructors
 * destructor - the destructor entity for this class. might be null if doesn't have a destructor
 */



    // TODO: HACK to make ClassType exist but do nothing for now
export class ClassType extends ObjectType {
    public size: number= 0;
    public readonly precedence: number = 0;
    public readonly isArithmeticType: boolean = false;
    public readonly isIntegralType: boolean = false;
    public readonly isFloatingPointType: boolean = false;
    public readonly isComplete: boolean = false;
    public sameType(other: Type): boolean {
        throw new Error("Method not implemented.");
    }
    public similarType(other: Type): boolean {
        throw new Error("Method not implemented.");
    }
    public typeString(excludeBase: boolean, varname: string, decorated?: boolean | undefined): string {
        throw new Error("Method not implemented.");
    }
    public englishString(plural: boolean): string {
        throw new Error("Method not implemented.");
    }
    
    protected cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        // TODO
        return new ClassType(isConst, isVolatile);
    }
}

// export class ClassType extends ObjectType {
//     public isValueValid(value: number): boolean {
//         throw new Error("Method not implemented.");
//     }
//     public valueToString(value: number): string {
//         throw new Error("Method not implemented.");
//     }
//     public isArithmeticType = false;
//     public isIntegralType = false;
//     public isFloatingPointType = false;

//     public englishString(plural: boolean): string {
//         throw new Error("Method not implemented.");
//     }
//     public readonly precedence = 0;

//     public readonly cppClass: CPPClass;

//     public constructor(cppClass: CPPClass, isConst?: boolean, isVolatile?: boolean) {
//         super(isConst, isVolatile);

//         this.cppClass = cppClass;
//     }

//     public get isComplete() {
//         return this.cppClass.isComplete;
//     }

//     public get size() {
//         return this.cppClass.size;
//     }

//     public sameType(other: Type) {
//         //alert(other.isA(this._class));
//         return this.similarType(other)
//             && other.isConst === this.isConst
//             && other.isVolatile === this.isVolatile;
//     }

//     public similarType(other: Type) {
//         return other instanceof ClassType && other.cppClass.fullyQualifiedName === this.cppClass.fullyQualifiedName;
//     }
//     typeString : function(excludeBase, varname, decorated){
//         if (excludeBase) {
//             return varname ? varname : "";
//         }
//         else{
//             return this.getCVString() + (decorated ? Util.htmlDecoratedType(this.className) : this.className) + (varname ? " " + varname : "");
//         }
//     },
//     englishString : function(plural){
//         // no recursive calls to this.type.englishString() here
//         // because this.type is just a string representing the type
//         return this.getCVString() + (plural ? this.className+"s" : (isVowel(this.className.charAt(0)) ? "an " : "a ") + this.className);
//     },
//     valueToString : function(value){
//         return JSON.stringify(value, null, 2);
//     },
//     bytesToValue : function(bytes){
//         var val = {};
//         var b = 0;
//         for(var i = 0; i < this.memberSubobjectEntities.length; ++i) {
//             var mem = this.memberSubobjectEntities[i];
//             val[mem.name] = mem.type.bytesToValue(bytes.slice(b, b + mem.type.size));
//             b += mem.type.size;
//         }
//         return val;
//     },
//     valueToBytes : function(value){
//         var bytes = [];
//         for(var i = 0; i < this.memberSubobjectEntities.length; ++i) {
//             var mem = this.memberSubobjectEntities[i];
//             bytes.pushAll(mem.type.valueToBytes(value[mem.name]));
//         }
//         return bytes;
//     }
// }

// export class CPPClass {

//     private static nextClassId = 0;

//     public readonly name: string;
//     public readonly fullyQualifiedName: string;
//     public readonly size: number = 1;
//     private actuallyZeroSize = true;

//     // TODO: there isn't really a need to store entities in here. just the types would be fine and entities for the named
//     // members would still go in the class scope. Base class entities aren't really needed at all.
//     public readonly scope: ClassScope;
//     private memberEntities : MemberVariableEntity[] = [];
//     private subobjectEntities: (MemberVariableEntity | BaseClassEntity)[] = [];
//     public readonly baseClassEntities: BaseClassEntity[] = [];
//     public readonly memberSubobjectEntities: MemberVariableEntity[] = [];
//     public ctors: ConstructorEntity[] = [];
//     public destructor?: DestructorEntity;

//     public readonly isComplete: boolean;
    
//     public constructor(fullyQualifiedName: string, parentScope: Scope, baseClass: ClassEntity) {
//         this.fullyQualifiedName = fullyQualifiedName;
//         this.name = fullyQualifiedNameToUnqualified(fullyQualifiedName);
//         this.scope = ClassScope.instance(name, parentScope, baseClass);

//         if (baseClass) {
//             let baseEntity = new BaseClassEntity(baseClass, this, "public");
//             this.baseClassEntities.push(baseEntity);
//             this.subobjectEntities.push(baseEntity);
//             this.size += base.type.size;
//         }

//         this.isComplete = false;
//     }

//     public getBaseClass() {
//         if (this.baseClassEntities.length > 0) {
//             return this.baseClassEntities[0];
//         }
//         else {
//             return null;
//         }
//     }

//     public memberLookup(memberName: string, options: NameLookupOptions) {
//         return this.scope.memberLookup(memberName, options);
//     }

//     public requiredMemberLookup(memberName: string, options: NameLookupOptions) {
//         return this.scope.requiredMemberLookup(memberName, options);
//     }

//     public hasMember(memberName: string, options: NameLookupOptions) {
//         return !!this.memberLookup(memberName, options);
//     }

//     public addMember(mem: CPPEntity) {
//         Util.assert(!this.isComplete, "May not modify a class definition once it has been completed.");
//         this.scope.addDeclaredEntity(mem);
//         this.memberEntities.push(mem);
//         if(mem.type.isObjectType()){
//             if (this.actuallyZeroSize){
//                 (<number>this.size) = 0;
//                 this.actuallyZeroSize = false;
//             }
            
//             this.memberSubobjectEntities.push(mem);
//             this.subobjectEntities.push(mem);
//             (<number>this.size) += mem.type.size;
//         }
//     }

//     public addConstructor(constructor: ConstructorEntity) {
//         Util.assert(!this.isComplete, "May not modify a class definition once it has been completed.");
//         this.ctors.push(constructor);
//     }

//     public addDestructor(destructor: DestructorEntity) {
//         Util.assert(!this.isComplete, "May not modify a class definition once it has been completed.");
//         this.destructor = destructor;
//     }

//     public getDefaultConstructor() {
//         return this.scope.singleLookup(this.name+"\0", {
//             own:true, noBase:true, exactMatch:true,
//             paramTypes:[]});
//     }

//     public getCopyConstructor(requireConst: boolean){
//         return this.scope.singleLookup(this.name+"\0", {
//                 own:true, noBase:true, exactMatch:true,
//                 paramTypes:[new Reference(new ClassType(this, true))]}) ||
//             !requireConst &&
//             this.scope.singleLookup(this.name+"\0", {
//                 own:true, noBase:true, exactMatch:true,
//                 paramTypes:[new Reference(new ClassType(this))]});
//     }

//     public getAssignmentOperator(requireConst: boolean, isThisConst: boolean) {
//         return this.scope.singleLookup("operator=", {
//                 own:true, noBase:true, exactMatch:true,
//                 paramTypes:[new ClassType(this)]}) ||
//             this.scope.singleLookup("operator=", {
//                 own:true, noBase:true, exactMatch:true,
//                 paramTypes:[new Reference(new ClassType(this, true))]}) ||
//             !requireConst &&
//             this.scope.singleLookup("operator=", {
//                 own:true, noBase:true, exactMatch:true,
//                 paramTypes:[new Reference(new ClassType(this))]})

//     }

//     public makeComplete() {
//         (<boolean>this.isComplete) = true;
//     }

//     // TODO: think about whether this is necessary (it probably is, or maybe just the class scopes would need to be merged?)
//     // merge : function(class1, class2) {
//     //     class1.i_classId = class2.i_classId = Math.min(class1.i_classId, class2.i_classId);
//     // },

//     public isDerivedFrom(potentialBase: ClassEntity) {
//         var b = this.getBaseClass();
//         while(b) {
//             if (similarType(potentialBase.type, b.type)) {
//                 return true;
//             }
//             b = b.base;
//         }
//         return false;
//     }



// }
// export {ClassType as Class};



// REQUIRES: returnType must be a type
//           argTypes must be an array of types
export class FunctionType extends TypeBase {
    public isArithmeticType = false;
    public isIntegralType = false;
    public isFloatingPointType = false;
    public isComplete = true;
    
    public readonly precedence = 2;

    public readonly returnType: PotentialReturnType;
    public readonly paramTypes: readonly PotentialParameterType[];
    public readonly receiverType?: ClassType;

    private paramStrType: string;
    private paramStrEnglish: string;
    
    public constructor(returnType: PotentialReturnType, paramTypes: readonly PotentialParameterType[], isConst?: boolean, isVolatile?: boolean, receiverType?: ClassType) {
        super(isConst, isVolatile);

        this.receiverType = receiverType;

        // Top-level const on return type is ignored for non-class types
        // (It's a value semantics thing.)
        if(!(returnType instanceof ClassType || returnType instanceof PointerType || returnType instanceof ReferenceType)){
            this.returnType = returnType.cvUnqualified();
        }
        else{
            this.returnType = returnType;
        }

        // Top-level const on parameter types is ignored for non-class types
        this.paramTypes = paramTypes.map((ptype) => ptype instanceof ClassType ? ptype : ptype.cvUnqualified());

        this.paramStrType = "(";
        for (var i = 0; i < paramTypes.length; ++i){
            this.paramStrType += (i == 0 ? "" : ",") + paramTypes[i];
        }
        this.paramStrType += ")";

        this.paramStrEnglish = "(";
        for (var i = 0; i < paramTypes.length; ++i){
            this.paramStrEnglish += (i == 0 ? "" : ", ") + paramTypes[i].englishString(false);
        }
        this.paramStrEnglish += ")";
    }
    
    protected cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new FunctionType(this.returnType, this.paramTypes, isConst, isVolatile, this.receiverType);
    }

    public sameType(other: Type) {
        if (!other){
            return false;
        }
        if (!(other instanceof FunctionType)) {
            return false;
        }
        if (!this.sameReturnType(other)){
            return false;
        }
        if (!this.sameParamTypes(other)){
            return false;
        }
        // TODO: should this be here?
        // if (!this.sameReceiverType(other)) {
        //     return false;
        // }
        return true;
    }

    // TODO: Check definition of similar types for functions
    public similarType(other: Type) {
        return this.sameType(other);
    }

    public sameParamTypes(other: FunctionType | readonly PotentialParameterType[]) {
        let otherParamTypes = other instanceof FunctionType ? other.paramTypes : other;
        if (this.paramTypes.length !== otherParamTypes.length){
            return false;
        }
        for(var i = 0; i < this.paramTypes.length; ++i){
            if (!this.paramTypes[i].sameType(otherParamTypes[i])){
                return false;
            }
        }
        return true;
    }

    public sameReturnType(other: FunctionType) {
        return this.returnType.sameType(other.returnType);
    }

    public sameReceiverType(other: FunctionType) {
        if (!this.receiverType || !other.receiverType) {
            // If either does not have a receiver, return true only if neither has a receiver
            return !this.receiverType && !other.receiverType;
        }

        return this.receiverType.sameType(other.receiverType);
    }

    public sameSignature(other: FunctionType) {
        return this.sameReceiverType(other) && this.sameParamTypes(other);
    }

    public isPotentialOverriderOf(other: FunctionType) {
        return this.sameParamTypes(other) && this.isConst === other.isConst && this.isVolatile == other.isVolatile;
    }

    public typeString(excludeBase: boolean, varname: string, decorated?: boolean) {
        return this.returnType.typeString(excludeBase, varname + this.paramStrType, decorated);
    }

    public englishString(plural: boolean) {
        return (plural ? "functions that take " : "a function that takes ") + this.paramStrEnglish + " " +
               (plural ? "and return " : "and returns ") + this.returnType.englishString(false);
    }
}
export {FunctionType as Function};