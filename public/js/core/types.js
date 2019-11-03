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
var util_1 = require("../util/util");
var vowels = ["a", "e", "i", "o", "u"];
function isVowel(c) {
    return vowels.indexOf(c) != -1;
}
;
// let USER_TYPE_NAMES = {};
// export function resetUserTypeNames() {
//     USER_TYPE_NAMES = {};
// }
// export let defaultUserTypeNames = {
//     ostream : true,
//     istream : true,
//     size_t : true
// };
function isType(type, ctor) {
    return type.isType(ctor);
}
exports.isType = isType;
;
function sameType(type1, type2) {
    return type1.sameType(type2);
}
exports.sameType = sameType;
;
function similarType(type1, type2) {
    return type1.similarType(type2);
}
exports.similarType = similarType;
;
function subType(type1, type2) {
    return type1 instanceof ClassType && type2 instanceof ClassType && type1.isDerivedFrom(type2);
}
exports.subType = subType;
;
exports.covariantType = function (derived, base) {
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
    if (!(dc instanceof ClassType) || !(bc instanceof ClassType)) {
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
function referenceCompatible(from, to) {
    return from && to && from.isReferenceCompatible(to);
}
exports.referenceCompatible = referenceCompatible;
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
    var t2AllConst = true;
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
var TypeBase = /** @class */ (function () {
    function TypeBase(isConst, isVolatile) {
        if (isConst === void 0) { isConst = false; }
        if (isVolatile === void 0) { isVolatile = false; }
        this.isConst = isConst;
        // TODO ignore volatile completely? for now (and perhaps forever lol)
        this.isVolatile = isVolatile;
    }
    TypeBase.prototype.getCVString = function () {
        return (this.isConst ? "const " : "") + (this.isVolatile ? "volatile " : "");
    };
    TypeBase.prototype.toString = function () {
        return this.typeString(false, "");
    };
    /**
     * Returns true if this type object is an instance of the given Type class
     */
    TypeBase.prototype.isType = function (ctor) {
        return this instanceof ctor;
    };
    TypeBase.prototype.isObjectType = function () {
        return this instanceof ObjectType;
    };
    TypeBase.prototype.isAtomicType = function () {
        return this instanceof AtomicType;
    };
    TypeBase.prototype.isArithmeticType = function () {
        return this instanceof ArithmeticType;
    };
    TypeBase.prototype.isIntegralType = function () {
        return this instanceof IntegralType;
    };
    TypeBase.prototype.isFloatingPointType = function () {
        return this instanceof FloatingPointType;
    };
    TypeBase.prototype.isPointerType = function () {
        return this instanceof PointerType;
    };
    TypeBase.prototype.isReferenceType = function () {
        return this instanceof ReferenceType;
    };
    TypeBase.prototype.isClassType = function () {
        return this instanceof ClassType;
    };
    TypeBase.prototype.isBoundedArrayType = function () {
        return this instanceof BoundedArrayType;
    };
    TypeBase.prototype.isArrayOfUnknownBoundType = function () {
        return this instanceof ArrayOfUnknownBoundType;
    };
    TypeBase.prototype.isGenericArrayType = function () {
        return this instanceof BoundedArrayType || this instanceof ArrayOfUnknownBoundType;
    };
    TypeBase.prototype.isFunctionType = function () {
        return this instanceof FunctionType;
    };
    TypeBase.prototype.isArrayElemType = function () {
        return this instanceof AtomicType || this instanceof ClassType;
    };
    TypeBase.prototype.isVoidType = function () {
        return this instanceof VoidType;
    };
    TypeBase.prototype.isPotentialReturnType = function () {
        return this instanceof ObjectType || this instanceof ReferenceType || this instanceof VoidType;
    };
    TypeBase.prototype.isPotentialParameterType = function () {
        return this instanceof ObjectType || this instanceof ReferenceType;
    };
    /**
     * Returns true if this type is reference-related (see C++ standard) to the type other.
     * @param other
     */
    TypeBase.prototype.isReferenceRelated = function (other) {
        return sameType(this.cvUnqualified(), other.cvUnqualified()) ||
            subType(this.cvUnqualified(), other.cvUnqualified());
    };
    /**
     * Returns true if this type is reference-compatible (see C++ standard) to the type other.
     * @param {Type} other
     * @returns {boolean}
     */
    TypeBase.prototype.isReferenceCompatible = function (other) {
        return this.isReferenceRelated(other) && (other.isConst || !this.isConst) && (other.isVolatile || !this.isVolatile);
    };
    /**
     * Returns a C++ styled string representation of this type, with the base type excluded as
     * would be suitable for only printing the declarator part of a declaration.
     * @param varname The name of the variable. May be the empty string.
     */
    TypeBase.prototype.declaratorString = function (varname) {
        return this.typeString(true, varname);
    };
    /**
     * Helper function for functions that create string representations of types.
     */
    TypeBase.prototype.parenthesize = function (outside, str) {
        return this.precedence < outside.precedence ? "(" + str + ")" : str;
    };
    /**
     * Both the name and message are just a C++ styled string representation of the type.
     * @returns {{name: {String}, message: {String}}}
     */
    TypeBase.prototype.describe = function () {
        var str = this.typeString(false, "");
        return { name: str, message: str };
    };
    /**
     * If this is a compound type, returns the "next" type.
     * e.g. if this is a pointer-to-int, returns int
     * e.g. if this ia a reference to pointer-to-int, returns int
     * e.g. if this is an array of bool, returns bool
     */
    TypeBase.prototype.getCompoundNext = function () {
        return null;
    };
    /**
     * Returns true if this type is either const or volatile (or both)
     * @returns {boolean}
     */
    TypeBase.prototype.isCVQualified = function () {
        return this.isConst || this.isVolatile;
    };
    // TODO: perhaps make a way to clone a type with a particular cv qualification rather than the proxy approach, which seems more fragile
    /**
     * Returns a cv-unqualified copy of this type.
     */
    TypeBase.prototype.cvUnqualified = function () {
        return this.cvQualified(false, false);
    };
    /**
     * Returns a copy of this type with the specified cv-qualifications.
     */
    TypeBase.prototype.cvQualified = function (isConst, isVolatile) {
        if (isVolatile === void 0) { isVolatile = false; }
        return this.cvQualifiedImpl(isConst, isVolatile);
    };
    TypeBase._name = "Type";
    return TypeBase;
}());
;
var VoidType = /** @class */ (function (_super) {
    __extends(VoidType, _super);
    function VoidType() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.isComplete = true;
        _this.precedence = 0;
        return _this;
    }
    VoidType.prototype.sameType = function (other) {
        return other instanceof VoidType
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    };
    VoidType.prototype.similarType = function (other) {
        return other instanceof VoidType;
    };
    VoidType.prototype.typeString = function (excludeBase, varname, decorated) {
        return "void";
    };
    VoidType.prototype.englishString = function (plural) {
        return "void";
    };
    VoidType.prototype.cvQualifiedImpl = function (isConst, isVolatile) {
        return new VoidType(isConst, isVolatile);
    };
    VoidType.VOID = new VoidType();
    return VoidType;
}(TypeBase));
exports.VoidType = VoidType;
/**
 * Represents a type for an object that exists in memory and takes up some space.
 * Has a size property, but NOT necessarily a value. (e.g. an array).
 */
var ObjectType = /** @class */ (function (_super) {
    __extends(ObjectType, _super);
    function ObjectType() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ObjectType;
}(TypeBase));
exports.ObjectType = ObjectType;
/**
 * Represents a type for an object that has a value.
 */
var ValueType = /** @class */ (function (_super) {
    __extends(ValueType, _super);
    function ValueType() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Converts a sequence of bytes (i.e. the C++ object representation) of a value of
     * this type into the raw value used to represent it internally in Lobster (i.e. a javascript value).
     * @param bytes
     */
    ValueType.prototype.bytesToValue = function (bytes) {
        // HACK: the whole value is stored in the first byte
        return bytes[0];
    };
    /**
     * Converts a raw value representing a value of this type to a sequence of bytes
     * (i.e. the C++ object representation)
     * @param value
     */
    ValueType.prototype.valueToBytes = function (value) {
        var bytes = [];
        // HACK: store the whole value in the first byte and zero out the rest. thanks javascript :)
        bytes[0] = value;
        for (var i = 1; i < this.size - 1; ++i) {
            bytes.push(0);
        }
        return bytes;
    };
    /**
     * Returns the string representation of the given raw value for this Type that would be
     * printed to an ostream.
     * Note that the raw value representation for the type in Lobster is just a javascript
     * value. It is not the C++ value representation for the type.
     * TODO: This is a hack that may eventually be removed since printing to a stream should
     * really be handled by overloaded << operator functions.
     * @param value
     */
    ValueType.prototype.valueToOstreamString = function (value) {
        return this.valueToString(value);
    };
    return ValueType;
}(ObjectType));
var AtomicType = /** @class */ (function (_super) {
    __extends(AtomicType, _super);
    function AtomicType() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.isAtomic = true;
        return _this;
    }
    return AtomicType;
}(ValueType));
exports.AtomicType = AtomicType;
var SimpleType = /** @class */ (function (_super) {
    __extends(SimpleType, _super);
    function SimpleType() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.isComplete = true;
        _this.precedence = 0;
        return _this;
    }
    SimpleType.prototype.sameType = function (other) {
        return other instanceof SimpleType
            && other.simpleType === this.simpleType
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    };
    SimpleType.prototype.similarType = function (other) {
        return other instanceof SimpleType
            && other.simpleType === this.simpleType;
    };
    SimpleType.prototype.typeString = function (excludeBase, varname, decorated) {
        if (excludeBase) {
            return varname ? varname : "";
        }
        else {
            return this.getCVString() + (decorated ? util_1.htmlDecoratedType(this.simpleType) : this.simpleType) + (varname ? " " + varname : "");
        }
    };
    SimpleType.prototype.englishString = function (plural) {
        // no recursive calls to this.simpleType.englishString() here
        // because this.simpleType is just a string representing the type
        var word = this.getCVString() + this.simpleType;
        return (plural ? this.simpleType + "s" : (isVowel(word.charAt(0)) ? "an " : "a ") + word);
    };
    SimpleType.prototype.valueToString = function (value) {
        return "" + value;
    };
    SimpleType.prototype.isValueValid = function (value) {
        return true;
    };
    return SimpleType;
}(AtomicType));
exports.SimpleType = SimpleType;
var ArithmeticType = /** @class */ (function (_super) {
    __extends(ArithmeticType, _super);
    function ArithmeticType() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ArithmeticType;
}(SimpleType));
exports.ArithmeticType = ArithmeticType;
var IntegralType = /** @class */ (function (_super) {
    __extends(IntegralType, _super);
    function IntegralType() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return IntegralType;
}(ArithmeticType));
exports.IntegralType = IntegralType;
var Char = /** @class */ (function (_super) {
    __extends(Char, _super);
    function Char() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.simpleType = "char";
        _this.size = 1;
        return _this;
    }
    Char.isNullChar = function (value) {
        return value === this.NULL_CHAR;
    };
    Char.jsStringToNullTerminatedCharArray = function (str) {
        var chars = str.split("").map(function (c) {
            return c.charCodeAt(0);
        });
        chars.push(Char.NULL_CHAR);
        return chars;
    };
    Char.prototype.valueToString = function (value) {
        return "'" + util_1.unescapeString(String.fromCharCode(value)) + "'";
    };
    Char.prototype.valueToOstreamString = function (value) {
        // use <number> assertion based on the assumption this will only be used with proper raw values that are numbers
        return String.fromCharCode(value);
    };
    Char.prototype.cvQualifiedImpl = function (isConst, isVolatile) {
        return new Char(isConst, isVolatile);
    };
    Char.CHAR = new Char();
    Char.NULL_CHAR = 0;
    return Char;
}(IntegralType));
exports.Char = Char;
var Int = /** @class */ (function (_super) {
    __extends(Int, _super);
    function Int() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.simpleType = "int";
        _this.size = 4;
        return _this;
    }
    Int.prototype.cvQualifiedImpl = function (isConst, isVolatile) {
        return new Int(isConst, isVolatile);
    };
    Int.INT = new Int();
    return Int;
}(IntegralType));
exports.Int = Int;
;
var Size_t = /** @class */ (function (_super) {
    __extends(Size_t, _super);
    function Size_t() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.simpleType = "size_t";
        _this.size = 8;
        return _this;
    }
    Size_t.prototype.cvQualifiedImpl = function (isConst, isVolatile) {
        return new Size_t(isConst, isVolatile);
    };
    return Size_t;
}(IntegralType));
exports.Size_t = Size_t;
var Bool = /** @class */ (function (_super) {
    __extends(Bool, _super);
    function Bool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.simpleType = "bool";
        _this.size = 1;
        return _this;
    }
    Bool.prototype.cvQualifiedImpl = function (isConst, isVolatile) {
        return new Bool(isConst, isVolatile);
    };
    Bool.BOOL = new Bool();
    return Bool;
}(IntegralType));
exports.Bool = Bool;
// TODO: add support for Enums
var FloatingPointType = /** @class */ (function (_super) {
    __extends(FloatingPointType, _super);
    function FloatingPointType() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    FloatingPointType.prototype.valueToString = function (value) {
        // use <number> assertion based on the assumption this will only be used with proper raw values that are numbers
        var str = "" + value;
        return str.indexOf(".") != -1 ? str : str + ".";
    };
    return FloatingPointType;
}(ArithmeticType));
exports.FloatingPointType = FloatingPointType;
var Float = /** @class */ (function (_super) {
    __extends(Float, _super);
    function Float() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.simpleType = "float";
        _this.size = 4;
        return _this;
    }
    Float.prototype.cvQualifiedImpl = function (isConst, isVolatile) {
        return new Float(isConst, isVolatile);
    };
    Float.FLOAT = new Float();
    return Float;
}(FloatingPointType));
exports.Float = Float;
var Double = /** @class */ (function (_super) {
    __extends(Double, _super);
    function Double() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.simpleType = "double";
        _this.size = 8;
        return _this;
    }
    Double.prototype.cvQualifiedImpl = function (isConst, isVolatile) {
        return new Double(isConst, isVolatile);
    };
    Double.DOUBLE = new Double();
    return Double;
}(FloatingPointType));
exports.Double = Double;
// TODO: OStream shouldn't be a primitive type, should be an instrinsic class
// export class OStream extends SimpleType {
//     protected readonly simpleType = "ostream";
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
var PointerType = /** @class */ (function (_super) {
    __extends(PointerType, _super);
    function PointerType(ptrTo, isConst, isVolatile) {
        var _this = _super.call(this, isConst, isVolatile) || this;
        _this.size = 8;
        _this.precedence = 1;
        _this.isComplete = true;
        _this.ptrTo = ptrTo;
        return _this;
    }
    PointerType.isNull = function (value) {
        return value === 0;
    };
    PointerType.isNegative = function (value) {
        return value < 0;
    };
    PointerType.prototype.getCompoundNext = function () {
        return this.ptrTo;
    };
    PointerType.prototype.sameType = function (other) {
        return other instanceof PointerType
            && this.ptrTo.sameType(other.ptrTo)
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    };
    PointerType.prototype.similarType = function (other) {
        return other instanceof PointerType
            && this.ptrTo.similarType(other.ptrTo);
    };
    PointerType.prototype.typeString = function (excludeBase, varname, decorated) {
        return this.ptrTo.typeString(excludeBase, this.parenthesize(this.ptrTo, this.getCVString() + "*" + varname), decorated);
    };
    PointerType.prototype.englishString = function (plural) {
        return (plural ? this.getCVString() + "pointers to" : "a " + this.getCVString() + "pointer to") + " " + this.ptrTo.englishString(false);
    };
    PointerType.prototype.valueToString = function (value) {
        // TODO: clean up when function pointers are reimplemented
        // if (this.ptrTo instanceof FunctionType && value) {
        //     return value.name;
        // }
        // else{
        return "0x" + value;
        // }
    };
    PointerType.prototype.isObjectPointer = function () {
        return this.ptrTo.isObjectType();
    };
    /**
     * Returns whether a given raw value for this type is dereferenceable. For pointer types, the given raw value is dereferenceable
     * if the result of the dereference will be a live object. An example of the distinction between validity and
     * dereferenceability for pointer types would be an array pointer. The pointer value (an address) is dereferenceable
     * if it is within the bounds of the array. It is valid in those same locations plus also the location one space
     * past the end (but not dereferenceable there). All other address values are invalid.
     * @param value
     */
    PointerType.prototype.isValueDereferenceable = function (value) {
        return this.isValueValid(value);
    };
    PointerType.prototype.isValueValid = function (value) {
        return true;
    };
    PointerType.prototype.cvQualifiedImpl = function (isConst, isVolatile) {
        return new PointerType(this.ptrTo, isConst, isVolatile);
    };
    return PointerType;
}(AtomicType));
exports.PointerType = PointerType;
var ArrayPointer = /** @class */ (function (_super) {
    __extends(ArrayPointer, _super);
    function ArrayPointer(arrayObject, isConst, isVolatile) {
        var _this = _super.call(this, arrayObject.type.elemType, isConst, isVolatile) || this;
        _this.arrayObject = arrayObject;
        return _this;
    }
    ArrayPointer.prototype.min = function () {
        return this.arrayObject.address;
    };
    ArrayPointer.prototype.onePast = function () {
        return this.arrayObject.address + this.arrayObject.type.size;
    };
    ArrayPointer.prototype.isValueValid = function (value) {
        if (!this.arrayObject.isAlive) {
            return false;
        }
        var arrayObject = this.arrayObject;
        return arrayObject.address <= value && value <= arrayObject.address + arrayObject.type.size;
    };
    ArrayPointer.prototype.isValueDereferenceable = function (value) {
        return this.isValueValid(value) && value !== this.onePast();
    };
    ArrayPointer.prototype.toIndex = function (addr) {
        return Math.trunc((addr - this.arrayObject.address) / this.arrayObject.type.elemType.size);
    };
    ArrayPointer.prototype.cvQualifiedImpl = function (isConst, isVolatile) {
        return new ArrayPointer(this.arrayObject, isConst, isVolatile);
    };
    return ArrayPointer;
}(PointerType));
exports.ArrayPointer = ArrayPointer;
var ObjectPointer = /** @class */ (function (_super) {
    __extends(ObjectPointer, _super);
    function ObjectPointer(obj, isConst, isVolatile) {
        var _this = _super.call(this, obj.type, isConst, isVolatile) || this;
        _this.pointedObject = obj;
        return _this;
    }
    ObjectPointer.prototype.getPointedObject = function () {
        return this.pointedObject;
    };
    ObjectPointer.prototype.isValueValid = function (value) {
        return this.pointedObject.isAlive && this.pointedObject.address === value;
    };
    ObjectPointer.prototype.cvQualifiedImpl = function (isConst, isVolatile) {
        return new ObjectPointer(this.pointedObject, isConst, isVolatile);
    };
    return ObjectPointer;
}(PointerType));
exports.ObjectPointer = ObjectPointer;
var ReferenceType = /** @class */ (function (_super) {
    __extends(ReferenceType, _super);
    function ReferenceType(refTo, isConst, isVolatile) {
        var _this = 
        // References have no notion of const (they can't be re-bound anyway)
        _super.call(this, false, isVolatile) || this;
        _this.precedence = 1;
        _this.isComplete = true;
        _this.refTo = refTo;
        return _this;
    }
    ReferenceType.prototype.getCompoundNext = function () {
        return this.refTo;
    };
    ReferenceType.prototype.sameType = function (other) {
        return other instanceof ReferenceType && this.refTo.sameType(other.refTo);
    };
    //Note: I don't think similar types even make sense with references. See standard 4.4
    ReferenceType.prototype.similarType = function (other) {
        return other instanceof ReferenceType && this.refTo.similarType(other.refTo);
    };
    ReferenceType.prototype.typeString = function (excludeBase, varname, decorated) {
        return this.refTo.typeString(excludeBase, this.parenthesize(this.refTo, this.getCVString() + "&" + varname), decorated);
    };
    ReferenceType.prototype.englishString = function (plural) {
        return this.getCVString() + (plural ? "references to" : "a reference to") + " " + this.refTo.englishString(false);
    };
    ReferenceType.prototype.valueToString = function (value) {
        return "" + value;
    };
    ReferenceType.prototype.cvQualifiedImpl = function (isConst, isVolatile) {
        return new ReferenceType(this.refTo, isConst, isVolatile);
    };
    return ReferenceType;
}(TypeBase));
exports.ReferenceType = ReferenceType;
function noRef(type) {
    if (type instanceof ReferenceType) {
        return type.refTo;
    }
    else {
        return type; // will either be an object type or void type
    }
}
exports.noRef = noRef;
;
// Represents the type of an array. This is not an ObjectType because an array does
// not have a value that can be read/written. The Elem_type type parameter must be
// an AtomicType or ClassType. (Note that this rules out arrays of arrays, which are currently not supported.)
var BoundedArrayType = /** @class */ (function (_super) {
    __extends(BoundedArrayType, _super);
    function BoundedArrayType(elemType, length) {
        var _this = 
        // TODO: sanity check the semantics here, but I don't think it makes sense for an array itself to be volatile
        _super.call(this, false, false) || this;
        _this.precedence = 2;
        _this.elemType = elemType;
        _this.length = length;
        _this.size = elemType.size * length;
        return _this;
    }
    Object.defineProperty(BoundedArrayType.prototype, "isComplete", {
        get: function () {
            // Note: this class does not currently represent "array of unknown bound" types.
            // Should that change, additional logic would be needed here since those are considered
            // incomplete types.
            // Completeness may change if elemType completeness changes
            // (e.g. array of potentially (in)complete class type objects)
            return this.elemType.isComplete;
        },
        enumerable: true,
        configurable: true
    });
    BoundedArrayType.prototype.getCompoundNext = function () {
        return this.elemType;
    };
    BoundedArrayType.prototype.sameType = function (other) {
        return other instanceof BoundedArrayType && this.elemType.sameType(other.elemType) && this.length === other.length;
    };
    BoundedArrayType.prototype.similarType = function (other) {
        return other instanceof BoundedArrayType && this.elemType.similarType(other.elemType) && this.length === other.length;
    };
    BoundedArrayType.prototype.typeString = function (excludeBase, varname, decorated) {
        return this.elemType.typeString(excludeBase, varname + "[" + this.length + "]", decorated);
    };
    BoundedArrayType.prototype.englishString = function (plural) {
        return (plural ? "arrays of " : "an array of ") + this.length + " " + this.elemType.englishString(this.length > 1);
    };
    BoundedArrayType.prototype.cvQualifiedImpl = function (isConst, isVolatile) {
        return new BoundedArrayType(this.elemType, this.length); // Note arrays don't have cv qualifications so they are ignored here
    };
    BoundedArrayType.prototype.adjustToPointerType = function () {
        return new PointerType(this.elemType, false, false);
    };
    return BoundedArrayType;
}(ObjectType));
exports.BoundedArrayType = BoundedArrayType;
var ArrayOfUnknownBoundType = /** @class */ (function (_super) {
    __extends(ArrayOfUnknownBoundType, _super);
    function ArrayOfUnknownBoundType(elemType, sizeExpressionAST) {
        var _this = _super.call(this, false, false) || this;
        _this.precedence = 2;
        _this.isComplete = false;
        _this.elemType = elemType;
        _this.sizeExpressionAST = sizeExpressionAST;
        return _this;
    }
    ArrayOfUnknownBoundType.prototype.getCompoundNext = function () {
        return this.elemType;
    };
    ArrayOfUnknownBoundType.prototype.sameType = function (other) {
        return other instanceof ArrayOfUnknownBoundType && this.elemType.sameType(other.elemType);
    };
    ArrayOfUnknownBoundType.prototype.similarType = function (other) {
        return other instanceof ArrayOfUnknownBoundType && this.elemType.similarType(other.elemType);
    };
    ArrayOfUnknownBoundType.prototype.typeString = function (excludeBase, varname, decorated) {
        return this.elemType.typeString(excludeBase, varname + "[]", decorated);
    };
    ArrayOfUnknownBoundType.prototype.englishString = function (plural) {
        return (plural ? "arrays of unknown bound of " : "an array of unknown bound of ") + this.elemType.englishString(true);
    };
    ArrayOfUnknownBoundType.prototype.cvQualifiedImpl = function (isConst, isVolatile) {
        return new ArrayOfUnknownBoundType(this.elemType, this.sizeExpressionAST);
    };
    ArrayOfUnknownBoundType.prototype.adjustToPointerType = function () {
        return new PointerType(this.elemType, false, false);
    };
    return ArrayOfUnknownBoundType;
}(TypeBase));
exports.ArrayOfUnknownBoundType = ArrayOfUnknownBoundType;
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
var ClassType = /** @class */ (function (_super) {
    __extends(ClassType, _super);
    function ClassType() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.size = 0;
        _this.precedence = 0;
        _this.isComplete = false;
        _this.className = "";
        _this.name = "";
        return _this;
    }
    ClassType.prototype.sameType = function (other) {
        throw new Error("Method not implemented.");
    };
    ClassType.prototype.similarType = function (other) {
        throw new Error("Method not implemented.");
    };
    ClassType.prototype.isDerivedFrom = function (other) {
        throw new Error("Method not implemented.");
    };
    ClassType.prototype.typeString = function (excludeBase, varname, decorated) {
        throw new Error("Method not implemented.");
    };
    ClassType.prototype.englishString = function (plural) {
        throw new Error("Method not implemented.");
    };
    ClassType.prototype.cvQualifiedImpl = function (isConst, isVolatile) {
        // TODO
        return new ClassType(isConst, isVolatile);
    };
    return ClassType;
}(ObjectType));
exports.ClassType = ClassType;
// export class ClassType extends ObjectType {
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
var FunctionType = /** @class */ (function (_super) {
    __extends(FunctionType, _super);
    function FunctionType(returnType, paramTypes, isConst, isVolatile, receiverType) {
        var _this = _super.call(this, isConst, isVolatile) || this;
        _this.isComplete = true;
        _this.precedence = 2;
        _this.receiverType = receiverType;
        // Top-level const on return type is ignored for non-class types
        // (It's a value semantics thing.)
        if (!(returnType instanceof ClassType || returnType instanceof PointerType || returnType instanceof ReferenceType)) {
            _this.returnType = returnType.cvUnqualified();
        }
        else {
            _this.returnType = returnType;
        }
        // Top-level const on parameter types is ignored for non-class types
        _this.paramTypes = paramTypes.map(function (ptype) { return ptype instanceof ClassType ? ptype : ptype.cvUnqualified(); });
        _this.paramStrType = "(";
        for (var i = 0; i < paramTypes.length; ++i) {
            _this.paramStrType += (i == 0 ? "" : ",") + paramTypes[i];
        }
        _this.paramStrType += ")";
        _this.paramStrEnglish = "(";
        for (var i = 0; i < paramTypes.length; ++i) {
            _this.paramStrEnglish += (i == 0 ? "" : ", ") + paramTypes[i].englishString(false);
        }
        _this.paramStrEnglish += ")";
        return _this;
    }
    FunctionType.prototype.cvQualifiedImpl = function (isConst, isVolatile) {
        return new FunctionType(this.returnType, this.paramTypes, isConst, isVolatile, this.receiverType);
    };
    FunctionType.prototype.sameType = function (other) {
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
    };
    // TODO: Check definition of similar types for functions
    FunctionType.prototype.similarType = function (other) {
        return this.sameType(other);
    };
    FunctionType.prototype.sameParamTypes = function (other) {
        var otherParamTypes = other instanceof FunctionType ? other.paramTypes : other;
        if (this.paramTypes.length !== otherParamTypes.length) {
            return false;
        }
        for (var i = 0; i < this.paramTypes.length; ++i) {
            if (!this.paramTypes[i].sameType(otherParamTypes[i])) {
                return false;
            }
        }
        return true;
    };
    FunctionType.prototype.sameReturnType = function (other) {
        return this.returnType.sameType(other.returnType);
    };
    FunctionType.prototype.sameReceiverType = function (other) {
        if (!this.receiverType || !other.receiverType) {
            // If either does not have a receiver, return true only if neither has a receiver
            return !this.receiverType && !other.receiverType;
        }
        return this.receiverType.sameType(other.receiverType);
    };
    FunctionType.prototype.sameSignature = function (other) {
        return this.sameReceiverType(other) && this.sameParamTypes(other);
    };
    FunctionType.prototype.isPotentialOverriderOf = function (other) {
        return this.sameParamTypes(other) && this.isConst === other.isConst && this.isVolatile == other.isVolatile;
    };
    FunctionType.prototype.typeString = function (excludeBase, varname, decorated) {
        if (decorated === void 0) { decorated = false; }
        return this.returnType.typeString(excludeBase, varname + this.paramStrType, decorated);
    };
    FunctionType.prototype.englishString = function (plural) {
        return (plural ? "functions that take " : "a function that takes ") + this.paramStrEnglish + " " +
            (plural ? "and return " : "and returns ") + this.returnType.englishString(false);
    };
    return FunctionType;
}(TypeBase));
exports.FunctionType = FunctionType;
var builtInTypeNames = new Set(["char", "int", "bool", "float", "double", "void"]);
function isBuiltInTypeName(name) {
    return builtInTypeNames.has(name);
}
exports.isBuiltInTypeName = isBuiltInTypeName;
exports.builtInTypes = {
    "char": Char,
    "int": Int,
    "bool": Bool,
    "float": Float,
    "double": Double,
    "void": VoidType
};
//# sourceMappingURL=types.js.map