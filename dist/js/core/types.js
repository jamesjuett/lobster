"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayPointerType = exports.PointerType = exports.toHexadecimalString = exports.Double = exports.Float = exports.FloatingPointType = exports.Bool = exports.Size_t = exports.Int = exports.Char = exports.ArithmeticType = exports.SimpleType = exports.AtomicType = exports.VoidType = exports.isCompleteParameterType = exports.isPotentialParameterType = exports.isCompleteReturnType = exports.isPotentialReturnType = exports.isCompleteObjectType = exports.isIncompleteObjectType = exports.isPotentiallyCompleteObjectType = exports.isVoidType = exports.isFunctionType = exports.isArrayElemType = exports.isPotentiallyCompleteArrayType = exports.isArrayOfUnknownBoundType = exports.isBoundedArrayOfType = exports.isBoundedArrayType = exports.isCompleteClassType = exports.isPotentiallyCompleteClassType = exports.isReferenceToCompleteType = exports.isReferenceType = exports.isObjectPointerType = exports.isArrayPointerToType = exports.isArrayPointerType = exports.isPointerToCompleteType = exports.isPointerToType = exports.isPointerType = exports.isFloatingPointType = exports.isIntegralType = exports.isArithmeticType = exports.isAtomicType = exports.isCvConvertible = exports.referenceRelated = exports.referenceCompatible = exports.covariantType = exports.subType = exports.similarType = exports.sameType = exports.isType = void 0;
exports.builtInTypes = exports.isBuiltInTypeName = exports.FunctionType = exports.createClassType = exports.ArrayOfUnknownBoundType = exports.BoundedArrayType = exports.peelReference = exports.ReferenceType = exports.ObjectPointerType = void 0;
const util_1 = require("../util/util");
const runtimeEnvironment_1 = require("./runtimeEnvironment");
const lexical_1 = require("./lexical");
var vowels = ["a", "e", "i", "o", "u"];
function isVowel(c) {
    return vowels.indexOf(c) != -1;
}
;
function isType(typeOrCtor, ctor) {
    if (typeOrCtor instanceof TypeBase) {
        return typeOrCtor.isType(ctor);
    }
    else {
        return (type) => type.isType(typeOrCtor);
    }
}
exports.isType = isType;
;
function sameType(type1, type2) {
    // console.log(`comparing ${type1} and ${type2}`);
    // console.log(!!(type1 === type2 || type1 && type2 && type1.sameType(type2)));
    return !!(type1 === type2 || type1 && type2 && type1.sameType(type2));
}
exports.sameType = sameType;
;
function similarType(type1, type2) {
    return !!(type1 === type2 || type1 && type2 && type1.similarType(type2));
}
exports.similarType = similarType;
;
function subType(type1, type2) {
    return type1.isPotentiallyCompleteClassType() && type2.isPotentiallyCompleteClassType() && type1.isDerivedFrom(type2);
}
exports.subType = subType;
;
var covariantType = function (derived, base) {
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
exports.covariantType = covariantType;
function referenceCompatible(from, to) {
    return from && to && from.isReferenceCompatible(to);
}
exports.referenceCompatible = referenceCompatible;
;
function referenceRelated(from, to) {
    return from && to && from.isReferenceRelated(to);
}
exports.referenceRelated = referenceRelated;
;
function isCvConvertible(fromType, toType) {
    if (fromType === null || toType === null) {
        return false;
    }
    // t1 and t2 must be similar
    if (!similarType(fromType, toType)) {
        return false;
    }
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
}
exports.isCvConvertible = isCvConvertible;
;
class TypeBase {
    constructor(isConst = false, isVolatile = false) {
        this.isConst = isConst;
        // TODO ignore volatile completely? for now (and perhaps forever lol)
        this.isVolatile = isVolatile;
    }
    getCVString() {
        return (this.isConst ? "const " : "") + (this.isVolatile ? "volatile " : "");
    }
    toString() {
        return this.typeString(false, "");
    }
    /**
     * Returns true if this type object is an instance of the given Type class
     */
    isType(ctor) {
        return this instanceof ctor;
    }
    isAtomicType() {
        return this instanceof AtomicType;
    }
    isArithmeticType() {
        return this instanceof ArithmeticType;
    }
    isIntegralType() {
        return this instanceof Char ||
            this instanceof Int ||
            this instanceof Size_t ||
            this instanceof Bool;
    }
    isFloatingPointType() {
        return this instanceof FloatingPointType;
    }
    isPointerType() {
        return this instanceof PointerType;
    }
    isPointerToCompleteObjectType() {
        return this.isPointerType() && this.ptrTo.isCompleteObjectType();
    }
    isArrayPointerType() {
        return this instanceof ArrayPointerType;
    }
    isObjectPointerType() {
        return this instanceof ObjectPointerType;
    }
    isPointerToType(ctor) {
        return this.isPointerType() && this.ptrTo instanceof ctor;
    }
    isArrayPointerToType(ctor) {
        return this.isArrayPointerType() && this.ptrTo instanceof ctor;
    }
    isReferenceType() {
        return this instanceof ReferenceType;
    }
    isReferenceToCompleteType() {
        return this.isReferenceType() && this.refTo.isCompleteObjectType();
    }
    isPotentiallyCompleteClassType() {
        return this instanceof ClassTypeBase;
    }
    isCompleteClassType() {
        return this instanceof ClassTypeBase && this.isComplete();
    }
    isIncompleteClassType() {
        return this instanceof ClassTypeBase && !this.isComplete();
    }
    isBoundedArrayType() {
        return this instanceof BoundedArrayType;
    }
    isArrayOfUnknownBoundType() {
        return this instanceof ArrayOfUnknownBoundType;
    }
    isPotentiallyCompleteArrayType() {
        return this instanceof BoundedArrayType || this instanceof ArrayOfUnknownBoundType;
    }
    isArrayElemType() {
        return this instanceof AtomicType || this.isPotentiallyCompleteClassType();
    }
    isFunctionType() {
        return this instanceof FunctionType;
    }
    isVoidType() {
        return this instanceof VoidType;
    }
    isPotentiallyCompleteObjectType() {
        return this.isAtomicType() || this.isPotentiallyCompleteArrayType() || this.isPotentiallyCompleteClassType();
    }
    isIncompleteObjectType() {
        return this.isArrayOfUnknownBoundType() || this.isIncompleteClassType();
    }
    isCompleteObjectType() {
        return this.isAtomicType() || this.isBoundedArrayType() || this.isCompleteClassType();
    }
    isPotentialReturnType() {
        return this.isAtomicType() || this.isPotentiallyCompleteClassType() || this.isReferenceType() || this.isVoidType();
    }
    isCompleteReturnType() {
        return this.isAtomicType() || this.isCompleteClassType() || this.isReferenceType() || this.isVoidType();
    }
    isPotentialParameterType() {
        return this.isAtomicType() || this.isPotentiallyCompleteClassType() || this.isReferenceType();
    }
    isCompleteParameterType() {
        return this.isAtomicType() || this.isCompleteClassType() || this.isReferenceType();
    }
    /**
     * Returns true if this type is reference-related (see C++ standard) to the type other.
     * @param other
     */
    isReferenceRelated(other) {
        return sameType(this.cvUnqualified(), other.refTo.cvUnqualified()) ||
            subType(this.cvUnqualified(), other.refTo.cvUnqualified());
    }
    /**
     * Returns true if this type is reference-compatible (see C++ standard) to the type other.
     * @param {ExpressionType} other
     * @returns {boolean}
     */
    isReferenceCompatible(other) {
        return this.isReferenceRelated(other) && (other.refTo.isConst || !this.isConst) && (other.refTo.isVolatile || !this.isVolatile);
    }
    /**
     * Returns a C++ styled string representation of this type, with the base type excluded as
     * would be suitable for only printing the declarator part of a declaration.
     * @param varname The name of the variable. May be the empty string.
     */
    declaratorString(varname) {
        return this.typeString(true, varname);
    }
    /**
     * Both the name and message are just a C++ styled string representation of the type.
     * @returns {{name: {String}, message: {String}}}
     */
    describe() {
        var str = this.typeString(false, "");
        return { name: str, message: str };
    }
    /**
     * If this is a compound type, returns the "next" type.
     * e.g. if this is a pointer-to-int, returns int
     * e.g. if this ia a reference to pointer-to-int, returns int
     * e.g. if this is an array of bool, returns bool
     */
    getCompoundNext() {
        return null;
    }
    /**
     * Returns true if this type is either const or volatile (or both)
     * @returns {boolean}
     */
    isCVQualified() {
        return this.isConst || this.isVolatile;
    }
    // TODO: perhaps make a way to clone a type with a particular cv qualification rather than the proxy approach, which seems more fragile
    /**
     * Returns a cv-unqualified copy of this type.
     */
    cvUnqualified() {
        return this.cvQualified(false, false);
    }
    /**
     * Returns a copy of this type with the specified cv-qualifications.
     */
    cvQualified(isConst = false, isVolatile = false) {
        return this._cvQualifiedImpl(isConst, isVolatile);
    }
}
TypeBase._name = "Type";
;
/**
 * Helper function for functions that create string representations of types.
 */
function parenthesize(thisType, outside, str) {
    return thisType.precedence < outside.precedence ? "(" + str + ")" : str;
}
function isAtomicType(type) {
    return type.isAtomicType();
}
exports.isAtomicType = isAtomicType;
function isArithmeticType(type) {
    return type.isArithmeticType();
}
exports.isArithmeticType = isArithmeticType;
function isIntegralType(type) {
    return type.isIntegralType();
}
exports.isIntegralType = isIntegralType;
function isFloatingPointType(type) {
    return type.isFloatingPointType();
}
exports.isFloatingPointType = isFloatingPointType;
function isPointerType(type) {
    return type.isPointerType();
}
exports.isPointerType = isPointerType;
function isPointerToType(ctor) {
    return ((type) => type.isPointerToType(ctor));
}
exports.isPointerToType = isPointerToType;
function isPointerToCompleteType(type) {
    return type.isPointerToCompleteObjectType();
}
exports.isPointerToCompleteType = isPointerToCompleteType;
function isArrayPointerType(type) {
    return type.isArrayPointerType();
}
exports.isArrayPointerType = isArrayPointerType;
function isArrayPointerToType(ctor) {
    return ((type) => type.isArrayPointerToType(ctor));
}
exports.isArrayPointerToType = isArrayPointerToType;
function isObjectPointerType(type) {
    return type.isObjectPointerType();
}
exports.isObjectPointerType = isObjectPointerType;
function isReferenceType(type) {
    return type.isReferenceType();
}
exports.isReferenceType = isReferenceType;
function isReferenceToCompleteType(type) {
    return type.isReferenceToCompleteType();
}
exports.isReferenceToCompleteType = isReferenceToCompleteType;
function isPotentiallyCompleteClassType(type) {
    return type.isPotentiallyCompleteClassType();
}
exports.isPotentiallyCompleteClassType = isPotentiallyCompleteClassType;
function isCompleteClassType(type) {
    return type.isCompleteClassType();
}
exports.isCompleteClassType = isCompleteClassType;
function isBoundedArrayType(type) {
    return type.isBoundedArrayType();
}
exports.isBoundedArrayType = isBoundedArrayType;
function isBoundedArrayOfType(typePredicate) {
    return ((type) => !!(type.isBoundedArrayType() && typePredicate(type.elemType)));
}
exports.isBoundedArrayOfType = isBoundedArrayOfType;
function isArrayOfUnknownBoundType(type) {
    return type.isArrayOfUnknownBoundType();
}
exports.isArrayOfUnknownBoundType = isArrayOfUnknownBoundType;
function isPotentiallyCompleteArrayType(type) {
    return type.isPotentiallyCompleteArrayType();
}
exports.isPotentiallyCompleteArrayType = isPotentiallyCompleteArrayType;
function isArrayElemType(type) {
    return type.isArrayElemType();
}
exports.isArrayElemType = isArrayElemType;
function isFunctionType(type) {
    return type.isFunctionType();
}
exports.isFunctionType = isFunctionType;
function isVoidType(type) {
    return type.isVoidType();
}
exports.isVoidType = isVoidType;
function isPotentiallyCompleteObjectType(type) {
    return type.isPotentiallyCompleteObjectType();
}
exports.isPotentiallyCompleteObjectType = isPotentiallyCompleteObjectType;
function isIncompleteObjectType(type) {
    return type.isIncompleteObjectType();
}
exports.isIncompleteObjectType = isIncompleteObjectType;
function isCompleteObjectType(type) {
    return type.isCompleteObjectType();
}
exports.isCompleteObjectType = isCompleteObjectType;
function isPotentialReturnType(type) {
    return type.isPotentialReturnType();
}
exports.isPotentialReturnType = isPotentialReturnType;
function isCompleteReturnType(type) {
    return type.isCompleteReturnType();
}
exports.isCompleteReturnType = isCompleteReturnType;
function isPotentialParameterType(type) {
    return type.isPotentialParameterType();
}
exports.isPotentialParameterType = isPotentialParameterType;
function isCompleteParameterType(type) {
    return type.isCompleteParameterType();
}
exports.isCompleteParameterType = isCompleteParameterType;
class VoidType extends TypeBase {
    constructor() {
        super(...arguments);
        this.type_kind = "void";
        this.precedence = 0;
    }
    isComplete() { return true; }
    sameType(other) {
        return other instanceof VoidType
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    }
    similarType(other) {
        return other instanceof VoidType;
    }
    typeString(excludeBase, varname, decorated) {
        return "void";
    }
    englishString(plural) {
        return "void";
    }
    _cvQualifiedImpl(isConst, isVolatile) {
        return new VoidType(isConst, isVolatile);
    }
}
exports.VoidType = VoidType;
VoidType.VOID = new VoidType();
/**
 * Represents a type for an object that has a value.
 */
class ValueType extends TypeBase {
    /**
     * Converts a sequence of bytes (i.e. the C++ object representation) of a value of
     * this type into the raw value used to represent it internally in Lobster (i.e. a javascript value).
     * @param bytes
     */
    bytesToValue(bytes) {
        // HACK: the whole value is stored in the first byte
        return bytes[0];
    }
    /**
     * Converts a raw value representing a value of this type to a sequence of bytes
     * (i.e. the C++ object representation)
     * @param value
     */
    valueToBytes(value) {
        var bytes = [];
        // HACK: store the whole value in the first byte and zero out the rest. thanks javascript :)
        bytes[0] = value;
        for (var i = 1; i < this.size; ++i) {
            bytes.push(0);
        }
        return bytes;
    }
    /**
     * Returns the string representation of the given raw value for this Type that would be
     * printed to an ostream.
     * Note that the raw value representation for the type in Lobster is just a javascript
     * value. It is not the C++ value representation for the type.
     * TODO: This is a hack that may eventually be removed since printing to a stream should
     * really be handled by overloaded << operator functions.
     * @param value
     */
    valueToOstreamString(value) {
        return this.valueToString(value);
    }
}
class AtomicType extends ValueType {
    constructor() {
        super(...arguments);
        this.type_kind = "AtomicType";
        this.isAtomic = true;
    }
    isDefaultConstructible(userDefinedOnly = false) {
        return !userDefinedOnly;
    }
    isCopyConstructible() {
        return true;
    }
    isCopyAssignable() {
        return !this.isConst;
    }
    isDestructible() {
        return true;
    }
}
exports.AtomicType = AtomicType;
class SimpleType extends AtomicType {
    constructor() {
        super(...arguments);
        this.precedence = 0;
    }
    sameType(other) {
        return other instanceof SimpleType
            && other.simpleType === this.simpleType
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    }
    similarType(other) {
        return other instanceof SimpleType
            && other.simpleType === this.simpleType;
    }
    typeString(excludeBase, varname, decorated) {
        if (excludeBase) {
            return varname ? varname : "";
        }
        else {
            let typeStr = this.getCVString() + this.simpleType;
            return (decorated ? util_1.htmlDecoratedType(typeStr) : typeStr) + (varname ? " " + varname : "");
        }
    }
    englishString(plural) {
        // no recursive calls to this.simpleType.englishString() here
        // because this.simpleType is just a string representing the type
        var word = this.getCVString() + this.simpleType;
        return (plural ? this.simpleType + "s" : (isVowel(word.charAt(0)) ? "an " : "a ") + word);
    }
    valueToString(value) {
        return "" + value;
    }
    isValueValid(value) {
        return true;
    }
}
exports.SimpleType = SimpleType;
function createSuccessParsingResult(result) {
    return {
        kind: "success",
        result: result
    };
}
function createErrorParsingResult() {
    return { kind: "error" };
}
class ArithmeticType extends SimpleType {
}
exports.ArithmeticType = ArithmeticType;
class IntegralTypeBase extends ArithmeticType {
}
class Char extends IntegralTypeBase {
    constructor() {
        super(...arguments);
        this.simpleType = "char";
        this.size = 1;
    }
    static isNullChar(value) {
        return value.rawValue === 0;
    }
    static jsStringToNullTerminatedCharArray(str) {
        var chars = str.split("").map(function (c) {
            return c.charCodeAt(0);
        });
        chars.push(0); // null character
        return chars.map(c => new runtimeEnvironment_1.Value(c, Char.CHAR));
    }
    valueToString(value) {
        return "'" + util_1.unescapeString(String.fromCharCode(value)) + "'";
    }
    valueToOstreamString(value) {
        // use <number> assertion based on the assumption this will only be used with proper raw values that are numbers
        return String.fromCharCode(value);
    }
    _cvQualifiedImpl(isConst, isVolatile) {
        return new Char(isConst, isVolatile);
    }
    parse(s) {
        if (s.length > 0) {
            return createSuccessParsingResult(new runtimeEnvironment_1.Value(s.charCodeAt(0), this, true));
        }
        else {
            return createErrorParsingResult();
        }
    }
}
exports.Char = Char;
Char.CHAR = new Char();
Char.NULL_CHAR = new runtimeEnvironment_1.Value(0, Char.CHAR);
class Int extends IntegralTypeBase {
    constructor() {
        super(...arguments);
        this.simpleType = "int";
        this.size = 4;
    }
    _cvQualifiedImpl(isConst, isVolatile) {
        return new Int(isConst, isVolatile);
    }
    parse(s) {
        let p = parseInt(s);
        if (!Number.isNaN(p)) {
            return createSuccessParsingResult(new runtimeEnvironment_1.Value(p, this, true));
        }
        else {
            return createErrorParsingResult();
        }
    }
}
exports.Int = Int;
Int.INT = new Int();
Int.ZERO = new runtimeEnvironment_1.Value(0, Int.INT);
;
class Size_t extends IntegralTypeBase {
    constructor() {
        super(...arguments);
        this.simpleType = "size_t";
        this.size = 8;
    }
    _cvQualifiedImpl(isConst, isVolatile) {
        return new Size_t(isConst, isVolatile);
    }
    parse(s) {
        let p = parseInt(s);
        if (!Number.isNaN(p)) {
            return createSuccessParsingResult(new runtimeEnvironment_1.Value(p, this, true));
        }
        else {
            return createErrorParsingResult();
        }
    }
}
exports.Size_t = Size_t;
class Bool extends IntegralTypeBase {
    constructor() {
        super(...arguments);
        this.simpleType = "bool";
        this.size = 1;
    }
    _cvQualifiedImpl(isConst, isVolatile) {
        return new Bool(isConst, isVolatile);
    }
    parse(s) {
        let p = parseInt(s);
        if (!Number.isNaN(p)) {
            return createSuccessParsingResult(new runtimeEnvironment_1.Value(p === 0 ? 0 : 1, this, true));
        }
        else {
            return createErrorParsingResult();
        }
    }
}
exports.Bool = Bool;
Bool.BOOL = new Bool();
// TODO: add support for Enums
class FloatingPointType extends ArithmeticType {
    valueToString(value) {
        // use <number> assertion based on the assumption this will only be used with proper raw values that are numbers
        var str = "" + value;
        return str.indexOf(".") != -1 ? str : str + ".";
    }
    valueToOstreamString(value) {
        return "" + value;
    }
}
exports.FloatingPointType = FloatingPointType;
class Float extends FloatingPointType {
    constructor() {
        super(...arguments);
        this.simpleType = "float";
        this.size = 4;
    }
    _cvQualifiedImpl(isConst, isVolatile) {
        return new Float(isConst, isVolatile);
    }
    parse(s) {
        let p = parseFloat(s);
        if (!Number.isNaN(p)) {
            return createSuccessParsingResult(new runtimeEnvironment_1.Value(p, this, true));
        }
        else {
            return createErrorParsingResult();
        }
    }
}
exports.Float = Float;
Float.FLOAT = new Float();
class Double extends FloatingPointType {
    constructor() {
        super(...arguments);
        this.simpleType = "double";
        this.size = 8;
    }
    _cvQualifiedImpl(isConst, isVolatile) {
        return new Double(isConst, isVolatile);
    }
    parse(s) {
        let p = parseFloat(s);
        if (!Number.isNaN(p)) {
            return createSuccessParsingResult(new runtimeEnvironment_1.Value(p, this, true));
        }
        else {
            return createErrorParsingResult();
        }
    }
}
exports.Double = Double;
Double.DOUBLE = new Double();
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
function toHexadecimalString(addr) {
    return "0x" + addr.toString(16);
}
exports.toHexadecimalString = toHexadecimalString;
class PointerType extends AtomicType {
    constructor(ptrTo, isConst, isVolatile) {
        super(isConst, isVolatile);
        this.size = 8;
        this.precedence = 1;
        this.ptrTo = ptrTo;
    }
    static isNull(value) {
        return value === 0;
    }
    static isNegative(value) {
        return value < 0;
    }
    getCompoundNext() {
        return this.ptrTo;
    }
    sameType(other) {
        return other instanceof PointerType
            && this.ptrTo.sameType(other.ptrTo)
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    }
    similarType(other) {
        return other instanceof PointerType
            && this.ptrTo.similarType(other.ptrTo);
    }
    typeString(excludeBase, varname, decorated) {
        return this.ptrTo.typeString(excludeBase, parenthesize(this, this.ptrTo, this.getCVString() + "*" + varname), decorated);
    }
    englishString(plural) {
        return (plural ? this.getCVString() + "pointers to" : "a " + this.getCVString() + "pointer to") + " " + this.ptrTo.englishString(false);
    }
    valueToString(value) {
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
    isValueDereferenceable(value) {
        return this.isValueValid(value);
    }
    isValueValid(value) {
        return true;
    }
    _cvQualifiedImpl(isConst, isVolatile) {
        return new PointerType(this.ptrTo, isConst, isVolatile);
    }
}
exports.PointerType = PointerType;
class ArrayPointerType extends PointerType {
    constructor(arrayObject, isConst, isVolatile) {
        super(arrayObject.type.elemType, isConst, isVolatile);
        this.arrayObject = arrayObject;
    }
    min() {
        return this.arrayObject.address;
    }
    onePast() {
        return this.arrayObject.address + this.arrayObject.type.size;
    }
    isValueValid(value) {
        if (!this.arrayObject.isAlive) {
            return false;
        }
        var arrayObject = this.arrayObject;
        return arrayObject.address <= value && value <= arrayObject.address + arrayObject.type.size;
    }
    isValueDereferenceable(value) {
        return this.isValueValid(value) && value !== this.onePast();
    }
    toIndex(addr) {
        return Math.trunc((addr - this.arrayObject.address) / this.arrayObject.type.elemType.size);
    }
    _cvQualifiedImpl(isConst, isVolatile) {
        return new ArrayPointerType(this.arrayObject, isConst, isVolatile);
    }
}
exports.ArrayPointerType = ArrayPointerType;
class ObjectPointerType extends PointerType {
    constructor(obj, isConst, isVolatile) {
        super(obj.type, isConst, isVolatile);
        this.pointedObject = obj;
    }
    getPointedObject() {
        return this.pointedObject;
    }
    isValueValid(value) {
        return this.pointedObject.isAlive && this.pointedObject.address === value;
    }
    _cvQualifiedImpl(isConst, isVolatile) {
        return new ObjectPointerType(this.pointedObject, isConst, isVolatile);
    }
}
exports.ObjectPointerType = ObjectPointerType;
class ReferenceType extends TypeBase {
    constructor(refTo) {
        // References have no notion of const (they can't be re-bound anyway)
        super(false, false);
        this.precedence = 1;
        this.refTo = refTo;
    }
    isComplete() { return true; }
    getCompoundNext() {
        return this.refTo;
    }
    sameType(other) {
        return other instanceof ReferenceType && this.refTo.sameType(other.refTo);
    }
    //Note: I don't think similar types even make sense with references. See standard 4.4
    similarType(other) {
        return other instanceof ReferenceType && this.refTo.similarType(other.refTo);
    }
    typeString(excludeBase, varname, decorated) {
        return this.refTo.typeString(excludeBase, parenthesize(this, this.refTo, this.getCVString() + "&" + varname), decorated);
    }
    englishString(plural) {
        return this.getCVString() + (plural ? "references to" : "a reference to") + " " + this.refTo.englishString(false);
    }
    valueToString(value) {
        return "" + value;
    }
    _cvQualifiedImpl(isConst, isVolatile) {
        return new ReferenceType(this.refTo);
    }
}
exports.ReferenceType = ReferenceType;
function peelReference(type) {
    if (!type) {
        return type;
    }
    if (type instanceof ReferenceType) {
        return type.refTo;
    }
    else {
        return type; // will either be an object type or void type
    }
}
exports.peelReference = peelReference;
;
// Represents the type of an array. This is not an ObjectType because an array does
// not have a value that can be read/written. The Elem_type type parameter must be
// an AtomicType or ClassType. (Note that this rules out arrays of arrays, which are currently not supported.)
class BoundedArrayType extends TypeBase {
    constructor(elemType, length) {
        // TODO: sanity check the semantics here, but I don't think it makes sense for an array itself to be volatile
        super(false, false);
        this.precedence = 2;
        this.elemType = elemType;
        this.numElems = length;
        this.size = elemType.size * length;
    }
    isComplete(context) {
        return true; // Hardcoded true for now since arrays of incomplete element type are not supported in Lobster
        // Completeness may change if elemType completeness changes
        // (e.g. array of potentially (in)complete class type objects)
        // return this.elemType.isComplete(context);
    }
    getCompoundNext() {
        return this.elemType;
    }
    sameType(other) {
        return other instanceof BoundedArrayType && this.elemType.sameType(other.elemType) && this.numElems === other.numElems;
    }
    similarType(other) {
        return other instanceof BoundedArrayType && this.elemType.similarType(other.elemType) && this.numElems === other.numElems;
    }
    typeString(excludeBase, varname, decorated) {
        return this.elemType.typeString(excludeBase, varname + "[" + this.numElems + "]", decorated);
    }
    englishString(plural) {
        return (plural ? "arrays of " : "an array of ") + this.numElems + " " + this.elemType.englishString(this.numElems > 1);
    }
    _cvQualifiedImpl(isConst, isVolatile) {
        return new BoundedArrayType(this.elemType, this.numElems); // Note arrays don't have cv qualifications so they are ignored here
    }
    adjustToPointerType() {
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
    isDefaultConstructible(userDefinedOnly = false) {
        return this.elemType.isDefaultConstructible(userDefinedOnly);
    }
    isCopyConstructible(requireConstSource) {
        return this.elemType.isCopyConstructible(requireConstSource);
    }
    isCopyAssignable(requireConstSource) {
        return this.elemType.isCopyAssignable(requireConstSource);
    }
    isDestructible() {
        return this.elemType.isDestructible();
    }
}
exports.BoundedArrayType = BoundedArrayType;
class ArrayOfUnknownBoundType extends TypeBase {
    constructor(elemType, sizeExpressionAST) {
        super(false, false);
        this.precedence = 2;
        this.elemType = elemType;
        this.sizeExpressionAST = sizeExpressionAST;
    }
    isComplete() {
        return false;
    }
    getCompoundNext() {
        return this.elemType;
    }
    sameType(other) {
        return other instanceof ArrayOfUnknownBoundType && this.elemType.sameType(other.elemType);
    }
    similarType(other) {
        return other instanceof ArrayOfUnknownBoundType && this.elemType.similarType(other.elemType);
    }
    typeString(excludeBase, varname, decorated) {
        return this.elemType.typeString(excludeBase, varname + "[]", decorated);
    }
    englishString(plural) {
        return (plural ? "arrays of unknown bound of " : "an array of unknown bound of ") + this.elemType.englishString(true);
    }
    _cvQualifiedImpl(isConst, isVolatile) {
        return new ArrayOfUnknownBoundType(this.elemType, this.sizeExpressionAST);
    }
    adjustToPointerType() {
        return new PointerType(this.elemType, false, false);
    }
}
exports.ArrayOfUnknownBoundType = ArrayOfUnknownBoundType;
class ClassTypeBase extends TypeBase {
    constructor(classId, className, qualifiedName, shared, isConst = false, isVolatile = false) {
        super(isConst, isVolatile);
        this.precedence = 0;
        this.templateParameters = [];
        this.classId = classId;
        this.className = className;
        this.qualifiedName = qualifiedName;
        this.shared = shared;
    }
    get classDefinition() {
        return this.shared.classDefinition;
    }
    get size() {
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
    get classScope() {
        var _a;
        return (_a = this.shared.classDefinition) === null || _a === void 0 ? void 0 : _a.context.contextualScope;
    }
    setDefinition(def) {
        this.shared.classDefinition = def;
    }
    isComplete(context) {
        // TODO: also consider whether the context is one in which the class
        // is temporarily considered complete, e.g. a member function definition
        // ^ Actually, depending on how lobster sequences the compilation, this
        // might not be necessary, since the compilation of the member function
        // bodies might just come after the classDefinition is set.
        return !!this.shared.classDefinition;
    }
    sameType(other) {
        return this.similarType(other)
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    }
    similarType(other) {
        return other instanceof ClassTypeBase
            && sameClassType(this, other);
    }
    isDerivedFrom(other) {
        var _a, _b;
        var b = (_a = this.classDefinition) === null || _a === void 0 ? void 0 : _a.baseType;
        while (b) {
            if (similarType(other, b)) {
                return true;
            }
            b = (_b = b.classDefinition) === null || _b === void 0 ? void 0 : _b.baseType;
        }
        return false;
    }
    typeString(excludeBase, varname, decorated) {
        if (excludeBase) {
            return varname ? varname : "";
        }
        else {
            return this.getCVString() + (decorated ? util_1.htmlDecoratedType(this.className) : this.className) + (varname ? " " + varname : "");
        }
    }
    englishString(plural) {
        return this.getCVString() + (plural ? this.className + "s" : (isVowel(this.className.charAt(0)) ? "an " : "a ") + this.className);
    }
    //     englishString : function(plural){
    //     },
    //     valueToString : function(value){
    //         return JSON.stringify(value, null, 2);
    //     },
    _cvQualifiedImpl(isConst, isVolatile) {
        return new ClassTypeBase(this.classId, this.className, this.qualifiedName, this.shared, isConst, isVolatile);
    }
    isDefaultConstructible(userDefinedOnly = false) {
        let defaultCtor = this.classDefinition.defaultConstructor;
        return !!defaultCtor && (!userDefinedOnly || defaultCtor.isUserDefined);
    }
    isCopyConstructible(requireConstSource) {
        return !!this.classDefinition.constCopyConstructor
            || !requireConstSource && !!this.classDefinition.nonConstCopyConstructor;
    }
    isCopyAssignable(requireConstSource) {
        return !!this.classDefinition.lookupAssignmentOperator(requireConstSource, this.isConst);
    }
    isDestructible() {
        return !!this.classDefinition.destructor;
    }
    isAggregate() {
        // Aggregates may not have private member variables
        if (this.classDefinition.memberVariableEntities.some(memEnt => memEnt.firstDeclaration.context.accessLevel === "private")) {
            return false;
        }
        // Aggregates may not have user-provided constructors
        if (this.classDefinition.constructorDeclarations.some(ctorDecl => !ctorDecl.context.implicit)) {
            return false;
        }
        // Aggregates may not have base classes (until c++17)
        if (this.classDefinition.baseType) {
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
function sameClassType(thisClass, otherClass) {
    // Note the any casts are to grant "friend" access to private members of ClassTypeBase
    return thisClass.classId === otherClass.classId
        || lexical_1.qualifiedNamesEq(thisClass.qualifiedName, otherClass.qualifiedName)
        || (!!thisClass.shared.classDefinition && thisClass.shared.classDefinition === otherClass.shared.classDefinition);
}
let nextClassId = 0;
function createClassType(className, qualifiedName) {
    return new ClassTypeBase(nextClassId++, className, qualifiedName, {});
}
exports.createClassType = createClassType;
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
class FunctionType extends TypeBase {
    constructor(returnType, paramTypes, receiverType) {
        super(false, false);
        this.type_kind = "function";
        this.precedence = 2;
        this.receiverType = receiverType;
        // Top-level const on return type is ignored for non-class types
        // (It's a value semantics thing.)
        // TODO: why are PointerType and ReferenceType included here?
        // shouldn't const be ignored on returns of const pointers due to value semantics (but not pointers-to-const)
        // and for references you can't have a const reference anyway so it's not meaningful
        if (!(returnType.isPotentiallyCompleteClassType() || returnType.isPointerType() || returnType.isReferenceType())) {
            this.returnType = returnType.cvUnqualified();
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
    isComplete() { return true; }
    _cvQualifiedImpl(isConst, isVolatile) {
        return new FunctionType(this.returnType, this.paramTypes, this.receiverType);
    }
    sameType(other) {
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
    similarType(other) {
        return this.sameType(other);
    }
    sameParamTypes(other) {
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
    sameReturnType(other) {
        return this.returnType.sameType(other.returnType);
    }
    sameReceiverType(other) {
        if (!this.receiverType || !other.receiverType) {
            // If either does not have a receiver, return true only if neither has a receiver
            return !this.receiverType && !other.receiverType;
        }
        return this.receiverType.sameType(other.receiverType);
    }
    sameSignature(other) {
        return this.sameReceiverType(other) && this.sameParamTypes(other);
    }
    isPotentialOverriderOf(other) {
        var _a, _b, _c, _d;
        return this.sameParamTypes(other)
            && ((_a = this.receiverType) === null || _a === void 0 ? void 0 : _a.isConst) === ((_b = other.receiverType) === null || _b === void 0 ? void 0 : _b.isConst)
            && ((_c = this.receiverType) === null || _c === void 0 ? void 0 : _c.isVolatile) == ((_d = other.receiverType) === null || _d === void 0 ? void 0 : _d.isVolatile);
    }
    typeString(excludeBase, varname, decorated = false) {
        return this.returnType.typeString(excludeBase, varname + this.paramStrType, decorated);
    }
    englishString(plural) {
        return (plural ? "functions that take " : "a function that takes ") + this.paramStrEnglish + " " +
            (plural ? "and return " : "and returns ") + this.returnType.englishString(false);
    }
}
exports.FunctionType = FunctionType;
const builtInTypeNames = new Set(["char", "int", "size_t", "bool", "float", "double", "void"]);
function isBuiltInTypeName(name) {
    return builtInTypeNames.has(name);
}
exports.isBuiltInTypeName = isBuiltInTypeName;
exports.builtInTypes = {
    "char": Char,
    "int": Int,
    "size_t": Int,
    "bool": Bool,
    "float": Float,
    "double": Double,
    "void": VoidType
};
//# sourceMappingURL=types.js.map