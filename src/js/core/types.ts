import { Constructor, htmlDecoratedType, unescapeString } from "../util/util";
import { ConstructDescription, TranslationUnitContext } from "./constructs";
import { byte, RawValueType, Value } from "./runtimeEnvironment";
import { CPPObject } from "./objects";
import { ExpressionASTNode } from "./expressions";
import { ClassDefinition } from "./declarations";
import { ClassScope } from "./entities";
import { RuntimeExpression } from "./expressionBase";
import { SimulationEvent } from "./Simulation";
import { QualifiedName } from "./lexical";




var vowels = ["a", "e", "i", "o", "u"];

function isVowel(c: string) {
    return vowels.indexOf(c) != -1;
    
};






// let USER_TYPE_NAMES = {};
// export function resetUserTypeNames() {
//     USER_TYPE_NAMES = {};
// }

// export let defaultUserTypeNames = {
//     ostream : true,
//     istream : true,
//     size_t : true
// };

export function isType<T extends Type>(ctor: Constructor<T>): (type: Type) => type is InstanceType<typeof ctor>;
export function isType<T extends Type>(type: Type, ctor: Constructor<T>): type is InstanceType<typeof ctor>;
export function isType<T extends Type>(typeOrCtor: Type | Constructor<T>, ctor?: Constructor<T>) {
    if (typeOrCtor instanceof TypeBase) {
        return typeOrCtor.isType(ctor!);
    }
    else {
        return (type: Type) => type.isType(typeOrCtor)
    }
};

export function sameType(type1: Type, type2: Type) {
    return type1.sameType(type2);
};

export function similarType(type1: Type, type2: Type) {
    return type1.similarType(type2);
};

export function subType(type1: Type, type2: Type) {
    return type1.isPotentiallyCompleteClassType() && type2.isPotentiallyCompleteClassType() && type1.isDerivedFrom(type2);
};

export var covariantType = function (derived: Type, base: Type) {
    if (sameType(derived, base)) {
        return true;
    }

    var dc;
    var bc;
    if (derived instanceof PointerType && base instanceof PointerType) {
        dc = derived.ptrTo;
        bc = base.ptrTo;
    }
    else if (derived instanceof ReferenceType && base instanceof ReferenceType) {
        dc = derived.refTo;
        bc = base.refTo;
    }
    else {
        return false; // not both pointers or both references
    }

    // Must be pointers or references to class type
    if (!(dc.isClassType()) || !(bc.isClassType())) {
        return false;
    }

    // dc must be derived from bc
    if (!dc.isDerivedFrom(bc)) {
        return false;
    }

    // Pointers/References must have the same cv-qualification
    if (derived.isConst != base.isConst || derived.isVolatile != base.isVolatile) {
        return false;
    }

    // dc must have same or less cv-qualification as bc
    if (dc.isConst && !bc.isConst || dc.isVolatile && !bc.isVolatile) {
        return false;
    }

    // Yay we made it!
    return true;
};

export function referenceCompatible(from: ExpressionType, to: ReferenceType) {
    return from && to && from.isReferenceCompatible(to);
};

export function referenceRelated(from: ExpressionType, to: ReferenceType) {
    return from && to && from.isReferenceRelated(to);
};

export function isCvConvertible(fromType: Type | null, toType: Type | null) {

    if (fromType === null || toType === null) { return false; }

    // t1 and t2 must be similar
    if (!similarType(fromType, toType)) { return false; }

    // Discard 0th level of cv-qualification signatures, we don't care about them.
    // (It's essentially a value semantics thing, we're making a copy so top level const doesn't matter.)
    fromType = fromType.getCompoundNext();
    toType = toType.getCompoundNext();

    // check that t2 has const everywhere that t1 does
    // also if we ever find a difference, t2 needs const everywhere leading
    // up to it (but not including) (and not including discarded 0th level).
    let t2AllConst = true;
    while (fromType && toType) { //similar so they should run out at same time
        if (fromType.isConst && !toType.isConst) {
            return false;
        }
        else if (!fromType.isConst && toType.isConst && !t2AllConst) {
            return false;
        }

        // Update allConst
        t2AllConst = t2AllConst && toType.isConst;
        fromType = fromType.getCompoundNext();
        toType = toType.getCompoundNext();
    }

    // If no violations, t1 is convertable to t2
    return true;
};

abstract class TypeBase {
    public static readonly _name = "Type";

    /**
     * Used in parenthesization of string representations of types.
     * e.g. Array types have precedence 2, whereas Pointer types have precedence 1.
     */
    public abstract readonly precedence: number;


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
    public isType<T extends Type>(ctor: Constructor<T>): this is InstanceType<typeof ctor> {
        return this instanceof ctor;
    }

    public isAtomicType(): this is AtomicType {
        return this instanceof AtomicType;
    }

    public isArithmeticType(): this is ArithmeticType {
        return this instanceof ArithmeticType;
    }

    public isIntegralType(): this is IntegralType {
        return this instanceof Char ||
                this instanceof Int ||
                this instanceof Size_t ||
                this instanceof Bool;
    }

    public isFloatingPointType(): this is FloatingPointType {
        return this instanceof FloatingPointType;
    }

    public isPointerType(): this is PointerType {
        return this instanceof PointerType;
    }

    public isPointerToCompleteObjectType(): this is PointerToCompleteType {
        return this.isPointerType() && this.ptrTo.isCompleteObjectType();
    }

    public isArrayPointerType(): this is ArrayPointerType {
        return this instanceof ArrayPointerType;
    }

    public isObjectPointerType(): this is ObjectPointerType {
        return this instanceof ObjectPointerType;
    }
    
    public isPointerToType<T extends PotentiallyCompleteObjectType>(ctor: Constructor<T>): this is PointerType<InstanceType<typeof ctor>> {
        return this.isPointerType() && this.ptrTo instanceof ctor;
    }
    
    public isArrayPointerToType<T extends ArrayElemType>(ctor: Constructor<T>): this is ArrayPointerType<InstanceType<typeof ctor>> {
        return this.isArrayPointerType() && this.ptrTo instanceof ctor;
    }

    public isReferenceType(): this is ReferenceType {
        return this instanceof ReferenceType;
    }

    public isReferenceToCompleteType(): this is ReferenceToCompleteType {
        return this.isReferenceType() && this.refTo.isCompleteObjectType();
    }

    public isPotentiallyCompleteClassType(): this is PotentiallyCompleteClassType {
        return this instanceof ClassTypeBase;
    }

    public isCompleteClassType(): this is CompleteClassType {
        return this instanceof ClassTypeBase && this.isComplete();
    }

    public isIncompleteClassType(): this is CompleteClassType {
        return this instanceof ClassTypeBase && !this.isComplete();
    }

    public isBoundedArrayType(): this is BoundedArrayType {
        return this instanceof BoundedArrayType;
    }

    public isArrayOfUnknownBoundType(): this is ArrayOfUnknownBoundType {
        return this instanceof ArrayOfUnknownBoundType;
    }

    public isPotentiallyCompleteArrayType(): this is PotentiallyCompleteArrayType {
        return this instanceof BoundedArrayType || this instanceof ArrayOfUnknownBoundType;
    }

    public isArrayElemType(): this is ArrayElemType {
        return this instanceof AtomicType || this.isPotentiallyCompleteClassType();
    }

    public isFunctionType(): this is FunctionType {
        return this instanceof FunctionType;
    }

    public isVoidType(): this is VoidType {
        return this instanceof VoidType;
    }

    public isPotentiallyCompleteObjectType() : this is PotentiallyCompleteObjectType {
        return this.isAtomicType() || this.isPotentiallyCompleteArrayType() || this.isPotentiallyCompleteClassType();
    }

    public isIncompleteObjectType(): this is IncompleteObjectType {
        return this.isArrayOfUnknownBoundType() || this.isIncompleteClassType();
    }

    public isCompleteObjectType(): this is CompleteObjectType {
        return this.isAtomicType() || this.isBoundedArrayType() || this.isCompleteClassType();
    }

    public isPotentialReturnType(): this is PotentialReturnType {
        return this.isAtomicType() || this.isPotentiallyCompleteClassType() || this.isReferenceType() || this.isVoidType();
    }

    public isCompleteReturnType(): this is CompleteReturnType {
        return this.isAtomicType() || this.isCompleteClassType() || this.isReferenceType() || this.isVoidType();
    }

    public isPotentialParameterType(): this is PotentialParameterType {
        return this.isAtomicType() || this.isPotentiallyCompleteClassType() || this.isReferenceType();
    }

    public isCompleteParameterType(): this is CompleteParameterType {
        return this.isAtomicType() || this.isCompleteClassType() || this.isReferenceType();
    }

    /**
     * Returns true if other represents exactly the same type as this, including cv-qualifications.
     */
    public abstract sameType<T extends Type>(other: T): this is T;
    public abstract sameType(other: Type): boolean;

    /**
     * Returns true if other represents the same type as this, ignoring cv-qualifications.
     */
    public abstract similarType<T extends Type>(other: T): this is T;
    public abstract similarType(other: Type): boolean;


    /**
     * Returns true if this type is reference-related (see C++ standard) to the type other.
     * @param other
     */
    public isReferenceRelated(this: ExpressionType, other: ReferenceType): boolean {
        return sameType(this.cvUnqualified(), other.refTo.cvUnqualified()) ||
            subType(this.cvUnqualified(), other.refTo.cvUnqualified());
    }

    /**
     * Returns true if this type is reference-compatible (see C++ standard) to the type other.
     * @param {ExpressionType} other
     * @returns {boolean}
     */
    public isReferenceCompatible(this: ExpressionType, other: ReferenceType) {
        return this.isReferenceRelated(other) && (other.refTo.isConst || !this.isConst) && (other.refTo.isVolatile || !this.isVolatile);
    }

    /**
     * Returns a C++ styled string representation of this type.
     * @param excludeBase If true, exclude the base type.
     * @param varname The name of the variable. May be the empty string.
     * @param decorated If true, html tags will be added.
     */
    public abstract typeString(excludeBase: boolean, varname: string, decorated?: boolean): string;

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
    public abstract englishString(plural: boolean): string;

    /**
     * Both the name and message are just a C++ styled string representation of the type.
     * @returns {{name: {String}, message: {String}}}
     */
    public describe(): ConstructDescription {
        var str = this.typeString(false, "");
        return { name: str, message: str };
    }

    /**
     * If this is a compound type, returns the "next" type.
     * e.g. if this is a pointer-to-int, returns int
     * e.g. if this ia a reference to pointer-to-int, returns int
     * e.g. if this is an array of bool, returns bool
     */
    public getCompoundNext(): Type | null {
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
    public cvQualified(isConst: boolean = false, isVolatile: boolean = false): this {
        return <this>this._cvQualifiedImpl(isConst, isVolatile);
    }

    /**
     * Internal implementation of `cvQualifiedImpl`. DO NOT call this. It would be
     * a protected function, except that causes issues with newer versions of typescript
     * and intersection types. I suspect there is a TS compiler bug (or breaking change
     * to make rules for assignability stricter) somewhere w.r.t. verifying that protected
     * members of an intersection originate from the same declaration, specifically when
     * narrowing in a conditional type for one of the member types of the Type type union.
     * But I have not put in the time to track it down and submit an issue to the TS github.
     */
    public abstract _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): TypeBase;

};


/**
 * Helper function for functions that create string representations of types.
 */
function parenthesize(thisType: TypeBase, outside: TypeBase, str: string) : string {
    return thisType.precedence < outside.precedence ? "(" + str + ")" : str;
}

export function isAtomicType(type: Type): type is AtomicType {
    return type.isAtomicType();
}

export function isArithmeticType(type: Type): type is ArithmeticType {
    return type.isArithmeticType();
}

export function isIntegralType(type: Type): type is IntegralType {
    return type.isIntegralType();
}

export function isFloatingPointType(type: Type): type is FloatingPointType {
    return type.isFloatingPointType();
}

export function isPointerType(type: Type): type is PointerType {
    return type.isPointerType();
}

export function isPointerToType<T extends PotentiallyCompleteObjectType>(ctor: Constructor<T>): (type: Type) => type is PointerType<T> {
    return <(type: Type) => type is PointerType<T>>((type: Type) => type.isPointerToType(ctor));
}

export function isPointerToCompleteType(type: Type): type is PointerToCompleteType {
    return type.isPointerToCompleteObjectType();
}

export function isArrayPointerType(type: Type): type is ArrayPointerType {
    return type.isArrayPointerType();
}

export function isArrayPointerToType<T extends ArrayElemType>(ctor: Constructor<T>): (type: Type) => type is ArrayPointerType<T> {
    return <(type: Type) => type is ArrayPointerType<T>>((type: Type) => type.isArrayPointerToType(ctor));
}

export function isObjectPointerType(type: Type): type is ObjectPointerType {
    return type.isObjectPointerType();
}

export function isReferenceType(type: Type): type is ReferenceType {
    return type.isReferenceType();
}

export function isReferenceToCompleteType(type: Type): type is ReferenceToCompleteType {
    return type.isReferenceToCompleteType();
}

export function isPotentiallyCompleteClassType(type: Type): type is PotentiallyCompleteClassType {
    return type.isPotentiallyCompleteClassType();
}

export function isCompleteClassType(type: Type): type is CompleteClassType {
    return type.isCompleteClassType();
}

export function isBoundedArrayType(type: Type): type is BoundedArrayType {
    return type.isBoundedArrayType();
}

export function isBoundedArrayOfType<T extends ArrayElemType>(typePredicate: (type: Type)=> type is T): (type: Type) => type is BoundedArrayType<T> {
    return <(type: Type) => type is BoundedArrayType<T>>
            ((type:Type) => !!(type.isBoundedArrayType() && typePredicate(type.elemType)));
}

export function isArrayOfUnknownBoundType(type: Type): type is ArrayOfUnknownBoundType {
    return type.isArrayOfUnknownBoundType();
}

export function isPotentiallyCompleteArrayType(type: Type): type is PotentiallyCompleteArrayType {
    return type.isPotentiallyCompleteArrayType();
}

export function isArrayElemType(type: Type): type is ArrayElemType {
    return type.isArrayElemType();
}

export function isFunctionType(type: Type): type is FunctionType {
    return type.isFunctionType();
}

export function isVoidType(type: Type): type is VoidType {
    return type.isVoidType();
}

export function isPotentiallyCompleteObjectType(type: Type): type is PotentiallyCompleteObjectType {
    return type.isPotentiallyCompleteObjectType();
}

export function isIncompleteObjectType(type: Type): type is IncompleteObjectType {
    return type.isIncompleteObjectType();
}

export function isCompleteObjectType(type: Type): type is CompleteObjectType {
    return type.isCompleteObjectType();
}

export function isPotentialReturnType(type: Type): type is PotentialReturnType {
    return type.isPotentialReturnType();
}

export function isCompleteReturnType(type: Type): type is CompleteReturnType {
    return type.isCompleteReturnType();
}

export function isPotentialParameterType(type: Type): type is PotentialParameterType {
    return type.isPotentialParameterType();
}

export function isCompleteParameterType(type: Type): type is CompleteParameterType {
    return type.isCompleteParameterType();
}


// export function isType<T extends Type>(ctor: Constructor<T>) : this is InstanceType<typeof ctor> {
//     return this instanceof ctor;
// }

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

// export let UNKNOWN_TYPE = new Unknown();

export type Type = VoidType | CompleteObjectType | IncompleteClassType | FunctionType | ReferenceType | ArrayOfUnknownBoundType;

export type ExpressionType = Exclude<Type, ReferenceType>;

export type PotentiallyCompleteObjectType = AtomicType | PotentiallyCompleteArrayType | PotentiallyCompleteClassType;
export type IncompleteObjectType = ArrayOfUnknownBoundType | IncompleteClassType;
export type CompleteObjectType = AtomicType | BoundedArrayType | CompleteClassType;

export type PotentialReturnType = AtomicType | PotentiallyCompleteClassType | ReferenceType | VoidType;
export type CompleteReturnType = AtomicType | CompleteClassType | ReferenceType | VoidType;

// A parameter type may not be an array, since they convert to pointer parameters.
export type PotentialParameterType = AtomicType | PotentiallyCompleteClassType | ReferenceType;
export type CompleteParameterType = AtomicType | CompleteClassType | ReferenceType;


export class VoidType extends TypeBase {

    public readonly type_kind = "void";

    public static readonly VOID = new VoidType();


    public readonly precedence = 0;

    public isComplete() { return true; }

    public sameType(other: Type): boolean {
        return other instanceof VoidType
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    }

    public similarType(other: Type): boolean {
        return other instanceof VoidType;
    }

    public typeString(excludeBase: boolean, varname: string, decorated: boolean) {
        return "void";
    }

    public englishString(plural: boolean) {
        return "void";
    }

    public _cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new VoidType(isConst, isVolatile);
    }

}


// export class MissingType extends TypeBase {

//     public static readonly MISSING = new MissingType();

//     public readonly precedence = 0;

//     public isComplete() { return true; }

//     public sameType(other: Type) : boolean {
//         return true;
//     }

//     public similarType(other: Type) : boolean {
//         return true;
//     }

//     public typeString(excludeBase: boolean, varname: string, decorated: boolean) {
//         return "<missing>";
//     }

//     public englishString(plural: boolean) {
//         return "<missing>";
//     }

//     public cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
//         return new VoidType(isConst, isVolatile);
//     }

// }

/**
 * Represents a type for an object that exists in memory and takes up some space.
 * Has a size property, but NOT necessarily a value. (e.g. an array).
 */
export interface ObjectTypeInterface {
    readonly size: number;

    isDefaultConstructible(userDefinedOnly?: boolean): boolean;
    isCopyConstructible(requireConstSource: boolean): boolean;
    isCopyAssignable(requireConstSource: boolean): boolean;
    isDestructible(): boolean;
    
    // public abstract isComplete(context?: TranslationUnitContext) : this is CompleteObjectType;
}

export type Completed<T extends PotentiallyCompleteObjectType> =
    T extends CompleteObjectType ? T :
    T extends ArrayOfUnknownBoundType<infer E> ? BoundedArrayType<E> :
    T extends IncompleteClassType ? CompleteClassType :
    never

/**
 * Represents a type for an object that has a value.
 */
abstract class ValueType extends TypeBase implements ObjectTypeInterface {

    public abstract size: number;
    public abstract isDefaultConstructible(userDefinedOnly?: boolean): boolean;
    public abstract isCopyConstructible(requireConstSource: boolean): boolean;
    public abstract isCopyAssignable(requireConstSource: boolean): boolean;
    public abstract isDestructible(): boolean;

    /**
     * Converts a sequence of bytes (i.e. the C++ object representation) of a value of
     * this type into the raw value used to represent it internally in Lobster (i.e. a javascript value).
     * @param bytes
     */
    public bytesToValue(bytes: byte[]): RawValueType {
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
        for (var i = 1; i < this.size; ++i) {
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
    public abstract isValueValid(value: RawValueType): boolean;

    /**
     * Returns a human-readable string representation of the given raw value for this Type.
     * This is the representation that might be displayed to the user when inspecting the
     * value of an object.
     * Note that the value representation for the type in Lobster is just a javascript
     * value. It is not the C++ value representation for the type.
     * @param value
     */
    public abstract valueToString(value: RawValueType): string;

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
    public readonly type_kind = "AtomicType";
    public readonly isAtomic = true;

    public isDefaultConstructible(userDefinedOnly = false) {
        return !userDefinedOnly;
    }

    public isCopyConstructible() {
        return true;
    }

    public isCopyAssignable() {
        return !this.isConst;
    }

    public isDestructible() {
        return true;
    }
}

export abstract class SimpleType extends AtomicType {

    /**
     * Subclasses must implement a concrete type property that should be a
     * string indicating the kind of type e.g. "int", "double", "bool", etc.
     */
    public abstract simpleType: string;

    public readonly precedence = 0;

    public sameType(other: Type): boolean {
        return other instanceof SimpleType
            && other.simpleType === this.simpleType
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    }

    public similarType(other: Type): boolean {
        return other instanceof SimpleType
            && other.simpleType === this.simpleType;
    }

    public typeString(excludeBase: boolean, varname: string, decorated: boolean): string {
        if (excludeBase) {
            return varname ? varname : "";
        }
        else {
            let typeStr = this.getCVString() + this.simpleType;
            return (decorated ? htmlDecoratedType(typeStr) : typeStr) + (varname ? " " + varname : "");
        }
    }

    public englishString(plural: boolean) {
        // no recursive calls to this.simpleType.englishString() here
        // because this.simpleType is just a string representing the type
        var word = this.getCVString() + this.simpleType;
        return (plural ? this.simpleType + "s" : (isVowel(word.charAt(0)) ? "an " : "a ") + word);
    }

    public valueToString(value: RawValueType) {
        return "" + value;
    }

    public isValueValid(value: RawValueType) {
        return true;
    }
}


export type ParsingResult<T extends ArithmeticType> = SuccessParsingResult<T> | ErrorParsingResult;

export type SuccessParsingResult<T extends ArithmeticType> = {
    kind: "success";
    result: Value<T>;
}

export type ErrorParsingResult = {
    kind: "error";
};

function createSuccessParsingResult<T extends ArithmeticType>(result: Value<T>) : SuccessParsingResult<T> {
    return {
        kind: "success",
        result: result
    };
}

function createErrorParsingResult() : ErrorParsingResult {
    return {kind: "error"};
}

export abstract class ArithmeticType extends SimpleType {

    public abstract parse(s: string) : ParsingResult<this>;

}

export type AnalyticArithmeticType = IntegralType | AnalyticFloatingPointType;

abstract class IntegralTypeBase extends ArithmeticType {

}

export type IntegralType = Char | Int | Size_t | Bool;


export class Char extends IntegralTypeBase {
    public static readonly CHAR = new Char();

    public readonly simpleType = "char";
    public readonly size = 1;

    public static readonly NULL_CHAR = new Value(0, Char.CHAR);

    public static isNullChar(value: Value<Char>) {
        return value.rawValue === 0;
    }

    public static jsStringToNullTerminatedCharArray(str: string) {
        var chars = str.split("").map(function (c) {
            return c.charCodeAt(0);
        });
        chars.push(0); // null character
        return chars.map(c => new Value(c, Char.CHAR));
    }

    public valueToString(value: RawValueType) {
        return "'" + unescapeString(String.fromCharCode(value)) + "'";
    }
    public valueToOstreamString(value: RawValueType) {
        // use <number> assertion based on the assumption this will only be used with proper raw values that are numbers
        return String.fromCharCode(<number>value);
    }

    public _cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new Char(isConst, isVolatile);
    }

    public parse(s: string) : ParsingResult<this> {
        if (s.length > 0) {
            return createSuccessParsingResult(new Value(s.charCodeAt(0), this, true));
        }
        else {
            return createErrorParsingResult();
        }
    }
}

export class Int extends IntegralTypeBase {
    public static readonly INT = new Int();
    public static readonly ZERO = new Value(0, Int.INT);

    public readonly simpleType = "int";
    public readonly size = 4;

    public _cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new Int(isConst, isVolatile);
    }

    public parse(s: string) : ParsingResult<this> {
        let p = parseInt(s);
        if (!Number.isNaN(p)) {
            return createSuccessParsingResult(new Value(p, this, true));
        }
        else {
            return createErrorParsingResult();
        }
    }
};

export class Size_t extends IntegralTypeBase {
    public readonly simpleType = "size_t";
    public readonly size = 8;

    public _cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new Size_t(isConst, isVolatile);
    }

    public parse(s: string) : ParsingResult<this> {
        let p = parseInt(s);
        if (!Number.isNaN(p)) {
            return createSuccessParsingResult(new Value(p, this, true));
        }
        else {
            return createErrorParsingResult();
        }
    }
}

export class Bool extends IntegralTypeBase {
    public static readonly BOOL = new Bool();

    public readonly simpleType = "bool";
    public readonly size = 1;

    public _cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new Bool(isConst, isVolatile);
    }

    public parse(s: string) : ParsingResult<this> {
        let p = parseInt(s);
        if (!Number.isNaN(p)) {
            return createSuccessParsingResult(new Value(p === 0 ? 0 : 1, this, true));
        }
        else {
            return createErrorParsingResult();
        }
    }
}

// TODO: add support for Enums



export abstract class FloatingPointType extends ArithmeticType {

    public valueToString(value: RawValueType) {
        // use <number> assertion based on the assumption this will only be used with proper raw values that are numbers
        var str = "" + <number>value;
        return str.indexOf(".") != -1 ? str : str + ".";
    }

    public valueToOstreamString(value: RawValueType) {
        return "" + value;
    }
}

export type AnalyticFloatingPointType = Float | Double;

export class Float extends FloatingPointType {

    public static readonly FLOAT = new Float();

    public readonly simpleType = "float";
    public readonly size = 4;

    public _cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new Float(isConst, isVolatile);
    }

    public parse(s: string) : ParsingResult<this> {
        let p = parseFloat(s);
        if (!Number.isNaN(p)) {
            return createSuccessParsingResult(new Value(p, this, true));
        }
        else {
            return createErrorParsingResult();
        }
    }
}

export class Double extends FloatingPointType {

    public static readonly DOUBLE = new Double();

    public readonly simpleType = "double";
    public readonly size = 8;

    public _cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new Double(isConst, isVolatile);
    }
    
    public parse(s: string) : ParsingResult<this> {
        let p = parseFloat(s);
        if (!Number.isNaN(p)) {
            return createSuccessParsingResult(new Value(p, this, true));
        }
        else {
            return createErrorParsingResult();
        }
    }
}

// TODO: OStream shouldn't be a primitive type, should be an instrinsic class
// export class OStream extends SimpleType {
//     public readonly simpleType = "ostream";
//     public readonly size = 4;

// }

// TODO: add support for istream
// export class IStream = SimpleType.extend({
//     _name: "IStream",
//     simpleType: "istream",
//     size: 4,

//     valueToString : function(value){
//         return JSON.stringify(value);
//     }
// });




//TODO: create separate function pointer type???

export function toHexadecimalString(addr: number) {
    return "0x"+addr.toString(16);
}

export class PointerType<PtrTo extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends AtomicType {

    public readonly size = 8;
    public readonly precedence = 1;

    public static isNull(value: RawValueType) {
        return <number>value === 0;
    }

    public static isNegative(value: RawValueType) {
        return <number>value < 0;
    }

    public readonly ptrTo: PtrTo; // TODO: add | VoidType for void pointers? or just make that a whole separate VoidPointer class?

    public constructor(ptrTo: PtrTo, isConst?: boolean, isVolatile?: boolean) {
        super(isConst, isVolatile);
        this.ptrTo = ptrTo;
    }

    public getCompoundNext() {
        return this.ptrTo;
    }

    public sameType(other: Type): boolean {
        return other instanceof PointerType
            && this.ptrTo.sameType(other.ptrTo)
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    }

    public similarType(other: Type): boolean {
        return other instanceof PointerType
            && this.ptrTo.similarType(other.ptrTo);
    }

    public typeString(excludeBase: boolean, varname: string, decorated: boolean) : string {
        return this.ptrTo.typeString(excludeBase, parenthesize(this, this.ptrTo, this.getCVString() + "*" + varname), decorated);
    }

    public englishString(plural: boolean) {
        return (plural ? this.getCVString() + "pointers to" : "a " + this.getCVString() + "pointer to") + " " + this.ptrTo.englishString(false);
    }

    public valueToString(value: RawValueType) {
        // TODO: clean up when function pointers are reimplemented
        // if (this.ptrTo instanceof FunctionType && value) {
        //     return value.name;
        // }
        // else{
        return toHexadecimalString(value);
        // }
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

    public _cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new PointerType(this.ptrTo, isConst, isVolatile);
    }
}

export type PointerToCompleteType = PointerType<CompleteObjectType>;

export class ArrayPointerType<T extends ArrayElemType = ArrayElemType> extends PointerType<T> {

    public readonly arrayObject: CPPObject<BoundedArrayType<T>>;

    public constructor(arrayObject: CPPObject<BoundedArrayType<T>>, isConst?: boolean, isVolatile?: boolean) {
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
        if (!this.arrayObject.isAlive) {
            return false;
        }
        var arrayObject = this.arrayObject;
        return arrayObject.address <= value && value <= arrayObject.address + arrayObject.type.size;
    }

    public isValueDereferenceable(value: RawValueType) {
        return this.isValueValid(value) && value !== this.onePast();
    }

    public toIndex(addr: number) {
        return Math.trunc((addr - this.arrayObject.address) / this.arrayObject.type.elemType.size);
    }

    public _cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new ArrayPointerType(this.arrayObject, isConst, isVolatile);
    }
}

export class ObjectPointerType<T extends CompleteObjectType = CompleteObjectType> extends PointerType<T> {

    public readonly pointedObject: CPPObject<T>;

    public constructor(obj: CPPObject<T>, isConst?: boolean, isVolatile?: boolean) {
        super(obj.type, isConst, isVolatile);
        this.pointedObject = obj;
    }

    public getPointedObject() {
        return this.pointedObject;
    }

    public isValueValid(value: RawValueType) {
        return this.pointedObject.isAlive && this.pointedObject.address === value;
    }

    public _cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new ObjectPointerType(this.pointedObject, isConst, isVolatile);
    }
}


export class ReferenceType<RefTo extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends TypeBase {

    public readonly precedence = 1;

    public readonly refTo: RefTo;

    public constructor(refTo: RefTo) {
        // References have no notion of const (they can't be re-bound anyway)
        super(false, false);
        this.refTo = refTo;
    }

    public isComplete() { return true; }

    public getCompoundNext() {
        return this.refTo;
    }

    public sameType(other: Type): boolean {
        return other instanceof ReferenceType && this.refTo.sameType(other.refTo);
    }

    //Note: I don't think similar types even make sense with references. See standard 4.4
    public similarType(other: Type): boolean {
        return other instanceof ReferenceType && this.refTo.similarType(other.refTo);
    }

    public typeString(excludeBase: boolean, varname: string, decorated: boolean) : string {
        return this.refTo.typeString(excludeBase, parenthesize(this, this.refTo, this.getCVString() + "&" + varname), decorated);
    }

    public englishString(plural: boolean) {
        return this.getCVString() + (plural ? "references to" : "a reference to") + " " + this.refTo.englishString(false);
    }

    public valueToString(value: RawValueType) {
        return "" + value;
    }

    public _cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new ReferenceType(this.refTo);
    }

}

export type ReferenceToCompleteType = ReferenceType<CompleteObjectType>;

export type ReferredType<T extends ReferenceType> = T["refTo"];

export type PeelReference<T extends Type> = T extends ReferenceType ? T["refTo"] : T;

export type ExcludeRefType<T extends Type> = T extends ReferenceType ? never : T;

export function peelReference<T extends Type>(type: T): PeelReference<T>;
export function peelReference<T extends Type>(type: T | undefined): PeelReference<T> | undefined;
export function peelReference<T extends Type>(type: T): PeelReference<T> {
    if (!type) {
        return type;
    }
    if (type instanceof ReferenceType) {
        return type.refTo;
    }
    else {
        return <PeelReference<T>>type; // will either be an object type or void type
    }
};

export type ArrayElemType = AtomicType | CompleteClassType;

// Represents the type of an array. This is not an ObjectType because an array does
// not have a value that can be read/written. The Elem_type type parameter must be
// an AtomicType or ClassType. (Note that this rules out arrays of arrays, which are currently not supported.)
export class BoundedArrayType<Elem_type extends ArrayElemType = ArrayElemType> extends TypeBase implements ObjectTypeInterface {

    public readonly size: number;

    public readonly precedence = 2;

    public readonly elemType: Elem_type;
    public readonly numElems: number;

    public constructor(elemType: Elem_type, length: number) {

        // TODO: sanity check the semantics here, but I don't think it makes sense for an array itself to be volatile
        super(false, false);

        this.elemType = elemType;
        this.numElems = length;
        this.size = elemType.size * length;
    }


    public isComplete(context?: TranslationUnitContext) : this is BoundedArrayType<Elem_type> {

        return true; // Hardcoded true for now since arrays of incomplete element type are not supported in Lobster

        // Completeness may change if elemType completeness changes
        // (e.g. array of potentially (in)complete class type objects)
        // return this.elemType.isComplete(context);
    }

    public getCompoundNext() {
        return this.elemType;
    }

    public sameType(other: Type): boolean {
        return other instanceof BoundedArrayType && this.elemType.sameType(other.elemType) && this.numElems === other.numElems;
    }

    public similarType(other: Type): boolean {
        return other instanceof BoundedArrayType && this.elemType.similarType(other.elemType) && this.numElems === other.numElems;
    }

    public typeString(excludeBase: boolean, varname: string, decorated: boolean) {
        return this.elemType.typeString(excludeBase, varname + "[" + this.numElems + "]", decorated);
    }

    public englishString(plural: boolean) {
        return (plural ? "arrays of " : "an array of ") + this.numElems + " " + this.elemType.englishString(this.numElems > 1);
    }

    public _cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new BoundedArrayType(this.elemType, this.numElems); // Note arrays don't have cv qualifications so they are ignored here
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
    
    public isDefaultConstructible(userDefinedOnly = false) {
        return this.elemType.isDefaultConstructible(userDefinedOnly);
    }
    
    public isCopyConstructible(requireConstSource: boolean) {
        return this.elemType.isCopyConstructible(requireConstSource);
    }
    
    public isCopyAssignable(requireConstSource: boolean) {
        return this.elemType.isCopyAssignable(requireConstSource);
    }
    
    public isDestructible() {
        return this.elemType.isDestructible();
    }
}


export class ArrayOfUnknownBoundType<Elem_type extends ArrayElemType = ArrayElemType> extends TypeBase {

    public readonly precedence = 2;

    public readonly elemType: Elem_type;

    public readonly sizeExpressionAST?: ExpressionASTNode;

    public constructor(elemType: Elem_type, sizeExpressionAST?: ExpressionASTNode) {
        super(false, false);
        this.elemType = elemType;
        this.sizeExpressionAST = sizeExpressionAST;
    }

    public isComplete() : this is BoundedArrayType<Elem_type> {
        return false;
    }

    public getCompoundNext() {
        return this.elemType;
    }

    public sameType(other: Type): boolean {
        return other instanceof ArrayOfUnknownBoundType && this.elemType.sameType(other.elemType);
    }

    public similarType(other: Type): boolean {
        return other instanceof ArrayOfUnknownBoundType && this.elemType.similarType(other.elemType);
    }

    public typeString(excludeBase: boolean, varname: string, decorated: boolean) {
        return this.elemType.typeString(excludeBase, varname + "[]", decorated);
    }

    public englishString(plural: boolean) {
        return (plural ? "arrays of unknown bound of " : "an array of unknown bound of ") + this.elemType.englishString(true);
    }

    public _cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new ArrayOfUnknownBoundType(this.elemType, this.sizeExpressionAST);
    }

    public adjustToPointerType() {
        return new PointerType(this.elemType, false, false);
    }
    
}

export type PotentiallyCompleteArrayType = BoundedArrayType | ArrayOfUnknownBoundType;

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

interface ClassShared {
    classDefinition?: ClassDefinition;
}


class ClassTypeBase extends TypeBase implements Omit<ObjectTypeInterface, "size"> {

    public readonly precedence: number = 0;
    public readonly className: string;
    public readonly qualifiedName: QualifiedName;

    private readonly classId: number;
    private readonly shared: ClassShared;

    public readonly templateParameters: readonly AtomicType[] = [];
    
    /** DO NOT USE. Exists only to ensure CompleteClassType is not structurally assignable to CompleteClassType */
    public readonly t_isComplete!: boolean;

    public constructor(classId: number, className: string, qualifiedName: QualifiedName, shared: ClassShared, isConst: boolean = false, isVolatile: boolean = false) {
        super(isConst, isVolatile);
        this.classId = classId;
        this.className = className;
        this.qualifiedName = qualifiedName;
        this.shared = shared;
    }
    
    public get classDefinition() {
        return this.shared.classDefinition;
    }

    public get size() {
        // An ObjectType is not allowed to have size 0, but a
        // class definition with no members would have object size 0,
        // so we just say the min size of class type objects is 4 bytes
        if (this.shared.classDefinition) {
            return Math.max(this.shared.classDefinition.objectSize, 4);
        }
        else {
            return undefined;
        }
    }

    public get classScope() {
        return this.shared.classDefinition?.context.contextualScope;
    }

    public setDefinition(def: ClassDefinition) {
        this.shared.classDefinition = def;
    }

    public isComplete(context?: TranslationUnitContext) : this is CompleteClassType {
        // TODO: also consider whether the context is one in which the class
        // is temporarily considered complete, e.g. a member function definition
        // ^ Actually, depending on how lobster sequences the compilation, this
        // might not be necessary, since the compilation of the member function
        // bodies might just come after the classDefinition is set.
        return !!this.shared.classDefinition;
    }

    public sameType(other: Type) : boolean {
        return this.similarType(other)
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    }

    public similarType(other: Type) : boolean {
        return other instanceof ClassTypeBase
            && sameClassType(this, other);
    }

    public isDerivedFrom(other: Type) : boolean {
        var b = this.classDefinition?.baseClass;
        while(b) {
            if (similarType(other, b)) {
                return true;
            }
            b = b.classDefinition?.baseClass;
        }
        return false;
    }

    public typeString(excludeBase: boolean, varname: string, decorated?: boolean) {
        if (excludeBase) {
            return varname ? varname : "";
        }
        else{
            return this.getCVString() + (decorated ? htmlDecoratedType(this.className) : this.className) + (varname ? " " + varname : "");
        }
    }

    public englishString(plural: boolean) {
        return this.getCVString() + (plural ? this.className+"s" : (isVowel(this.className.charAt(0)) ? "an " : "a ") + this.className);
    }
    
//     englishString : function(plural){

//     },
//     valueToString : function(value){
//         return JSON.stringify(value, null, 2);
//     },

    public _cvQualifiedImpl(isConst: boolean, isVolatile: boolean) {
        return new ClassTypeBase(this.classId, this.className, this.qualifiedName, this.shared, isConst, isVolatile);
    }
    
    public isDefaultConstructible(this: CompleteClassType, userDefinedOnly = false) {
        let defaultCtor = this.classDefinition.defaultConstructor;
        return !!defaultCtor && (!userDefinedOnly || defaultCtor.isUserDefined);
    }
    
    public isCopyConstructible(this: CompleteClassType, requireConstSource: boolean) {
        return !!this.classDefinition.constCopyConstructor
                || !requireConstSource && !!this.classDefinition.nonConstCopyConstructor;
    }
    
    public isCopyAssignable(this: CompleteClassType, requireConstSource: boolean) {
        return !!this.classDefinition.lookupAssignmentOperator(requireConstSource, this.isConst);
    }
    
    public isDestructible(this: CompleteClassType) {
        return !!this.classDefinition.destructor;
    }

    public isAggregate(this: CompleteClassType) {

        // Aggregates may not have private member variables
        if (this.classDefinition.memberVariableEntities.some(memEnt => memEnt.firstDeclaration.context.accessLevel === "private")) {
            return false;
        }

        // Aggregates may not have user-provided constructors
        if (this.classDefinition.constructorDeclarations.some(ctorDecl => !ctorDecl.context.implicit)) {
            return false;
        }

        // Aggregates may not have base classes (until c++17)
        if (this.classDefinition.baseClass) {
            return false;
        }

        return true;
    }
}

/** Two class types are the same if they originated from the same ClassEntity (e.g.
 *  the same class declaration from the same .h include file, or
 *  two class declarations with the same name in the same scope) or if they have 
 *  been associated with the same definition during linking.
 */
function sameClassType(thisClass: ClassTypeBase, otherClass: ClassTypeBase) {
    // Note the any casts are to grant "friend" access to private members of ClassTypeBase
    return (thisClass as any).classId === (otherClass as any).classId
        || thisClass.qualifiedName === otherClass.qualifiedName
        || (!!(thisClass as any).shared.classDefinition && (thisClass as any).shared.classDefinition === (otherClass as any).shared.classDefinition);
}

export interface IncompleteClassType extends ClassTypeBase {
    /** DO NOT USE. Exists only to ensure CompleteClassType is not structurally assignable to CompleteClassType */
    readonly t_isComplete: false;
}

export interface CompleteClassType extends ClassTypeBase, ObjectTypeInterface {
    
    /** DO NOT USE. Exists only to ensure CompleteClassType is not structurally assignable to CompleteClassType */
    readonly t_isComplete: true;
    
    readonly classDefinition: ClassDefinition;
    readonly size: number;
    readonly classScope: ClassScope;

    isDefaultConstructible(userDefinedOnly?: boolean): boolean;
    isCopyConstructible(requireConstSource: boolean): boolean;
    isCopyAssignable(requireConstSource: boolean): boolean;
    isDestructible(): boolean;
}

export type PotentiallyCompleteClassType = IncompleteClassType | CompleteClassType;

let nextClassId = 0;

export function createClassType(className: string, qualifiedName: QualifiedName) : IncompleteClassType {
    return <IncompleteClassType>new ClassTypeBase(nextClassId++, className, qualifiedName, {});
}

// export class ClassType extends ObjectTypeBase {
//     public isValueValid(value: number): boolean {
//         throw new Error("Method not implemented.");
//     }
//     public valueToString(value: number): string {
//         throw new Error("Method not implemented.");
//     }

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
export class FunctionType<ReturnType extends PotentialReturnType = PotentialReturnType> extends TypeBase {

    public readonly type_kind = "function";

    public readonly precedence = 2;

    public readonly returnType: ReturnType;
    public readonly paramTypes: readonly PotentialParameterType[];
    public readonly receiverType?: PotentiallyCompleteClassType;

    public readonly paramStrType: string;
    public readonly paramStrEnglish: string;

    public constructor(returnType: ReturnType, paramTypes: readonly PotentialParameterType[], receiverType?: PotentiallyCompleteClassType) {
        super(false, false);

        this.receiverType = receiverType;

        // Top-level const on return type is ignored for non-class types
        // (It's a value semantics thing.)
        // TODO: why are PointerType and ReferenceType included here?
        // shouldn't const be ignored on returns of const pointers due to value semantics (but not pointers-to-const)
        // and for references you can't have a const reference anyway so it's not meaningful
        if (!(returnType.isPotentiallyCompleteClassType() || returnType.isPointerType() || returnType.isReferenceType())) {
            this.returnType = <ReturnType>returnType.cvUnqualified();
        }
        else {
            this.returnType = returnType;
        }

        // Top-level const on parameter types is ignored for non-class types
        this.paramTypes = paramTypes.map((ptype) => ptype.isPotentiallyCompleteClassType() ? ptype : ptype.cvUnqualified());

        this.paramStrType = "(";
        for (var i = 0; i < paramTypes.length; ++i) {
            this.paramStrType += (i == 0 ? "" : ",") + paramTypes[i];
        }
        this.paramStrType += ")";

        this.paramStrEnglish = "(";
        for (var i = 0; i < paramTypes.length; ++i) {
            this.paramStrEnglish += (i == 0 ? "" : ", ") + paramTypes[i].englishString(false);
        }
        this.paramStrEnglish += ")";
    }

    public isComplete() { return true; }

    public _cvQualifiedImpl(isConst: boolean, isVolatile: boolean) : FunctionType {
        return new FunctionType(this.returnType, this.paramTypes, this.receiverType);
    }

    public sameType(other: Type) {
        if (!other) {
            return false;
        }
        if (!(other instanceof FunctionType)) {
            return false;
        }
        if (!this.sameReturnType(other)) {
            return false;
        }
        if (!this.sameParamTypes(other)) {
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

    public sameParamTypes(other: FunctionType | readonly Type[]) {
        let otherParamTypes = other instanceof FunctionType ? other.paramTypes : other;
        if (this.paramTypes.length !== otherParamTypes.length) {
            return false;
        }
        for (var i = 0; i < this.paramTypes.length; ++i) {
            if (!this.paramTypes[i].sameType(otherParamTypes[i])) {
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
        return this.sameParamTypes(other)
            && this.receiverType?.isConst === other.receiverType?.isConst
            && this.receiverType?.isVolatile == other.receiverType?.isVolatile;
    }

    public typeString(excludeBase: boolean, varname: string, decorated: boolean = false) {
        return this.returnType.typeString(excludeBase, varname + this.paramStrType, decorated);
    }

    public englishString(plural: boolean) {
        return (plural ? "functions that take " : "a function that takes ") + this.paramStrEnglish + " " +
            (plural ? "and return " : "and returns ") + this.returnType.englishString(false);
    }

}

const builtInTypeNames = new Set(["char", "int", "size_t", "bool", "float", "double", "void"]);
export function isBuiltInTypeName(name: string): name is "char" | "int" | "size_t" | "bool" | "float" | "double" | "void" {
    return builtInTypeNames.has(name);
}
export const builtInTypes = {
    "char": Char,
    "int": Int,
    "size_t": Int,
    "bool": Bool,
    "float": Float,
    "double": Double,
    "void": VoidType
};