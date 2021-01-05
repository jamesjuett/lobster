import { Constructor } from "../util/util";
import { ConstructDescription, TranslationUnitContext } from "./constructs";
import { byte, RawValueType, Value } from "./runtimeEnvironment";
import { CPPObject } from "./objects";
import { ExpressionASTNode } from "./expressions";
import { ClassDefinition } from "./declarations";
import { ClassScope } from "./entities";
export declare function isType<T extends Type>(ctor: Constructor<T>): (type: Type) => type is InstanceType<typeof ctor>;
export declare function isType<T extends Type>(type: Type, ctor: Constructor<T>): type is InstanceType<typeof ctor>;
export declare function sameType(type1: Type, type2: Type): boolean;
export declare function similarType(type1: Type, type2: Type): boolean;
export declare function subType(type1: Type, type2: Type): boolean;
export declare var covariantType: (derived: Type, base: Type) => boolean;
export declare function referenceCompatible(from: ExpressionType, to: ReferenceType): boolean;
export declare function isCvConvertible(fromType: Type | null, toType: Type | null): boolean;
declare abstract class TypeBase {
    static readonly _name = "Type";
    /**
     * Used in parenthesization of string representations of types.
     * e.g. Array types have precedence 2, whereas Pointer types have precedence 1.
     */
    abstract readonly precedence: number;
    readonly isConst: boolean;
    readonly isVolatile: boolean;
    constructor(isConst?: boolean, isVolatile?: boolean);
    getCVString(): string;
    toString(): string;
    /**
     * Returns true if this type object is an instance of the given Type class
     */
    isType<T extends Type>(ctor: Constructor<T>): this is InstanceType<typeof ctor>;
    isAtomicType(): this is AtomicType;
    isArithmeticType(): this is ArithmeticType;
    isIntegralType(): this is IntegralType;
    isFloatingPointType(): this is FloatingPointType;
    isPointerType(): this is PointerType;
    isPointerToCompleteType(): this is PointerToCompleteType;
    isArrayPointerType(): this is ArrayPointerType;
    isObjectPointerType(): this is ObjectPointerType;
    isPointerToType<T extends PotentiallyCompleteObjectType>(ctor: Constructor<T>): this is PointerType<InstanceType<typeof ctor>>;
    isArrayPointerToType<T extends ArrayElemType>(ctor: Constructor<T>): this is ArrayPointerType<InstanceType<typeof ctor>>;
    isReferenceType(): this is ReferenceType;
    isPotentiallyCompleteClassType(): this is PotentiallyCompleteClassType;
    isCompleteClassType(): this is CompleteClassType;
    isIncompleteClassType(): this is CompleteClassType;
    isBoundedArrayType(): this is BoundedArrayType;
    isArrayOfUnknownBoundType(): this is ArrayOfUnknownBoundType;
    isPotentiallyCompleteArrayType(): this is BoundedArrayType | ArrayOfUnknownBoundType;
    isArrayElemType(): this is ArrayElemType;
    isFunctionType(): this is FunctionType;
    isVoidType(): this is VoidType;
    isPotentiallyCompleteObjectType(): this is PotentiallyCompleteObjectType;
    isIncompleteObjectType(): this is IncompleteObjectType;
    isCompleteObjectType(): this is CompleteObjectType;
    isPotentialReturnType(): this is PotentialReturnType;
    isCompleteReturnType(): this is CompleteReturnType;
    isPotentialParameterType(): this is PotentialParameterType;
    isCompleteParameterType(): this is CompleteParameterType;
    /**
     * Returns true if other represents exactly the same type as this, including cv-qualifications.
     */
    abstract sameType<T extends Type>(other: T): this is T;
    abstract sameType(other: Type): boolean;
    /**
     * Returns true if other represents the same type as this, ignoring cv-qualifications.
     */
    abstract similarType<T extends Type>(other: T): this is T;
    abstract similarType(other: Type): boolean;
    /**
     * Returns true if this type is reference-related (see C++ standard) to the type other.
     * @param other
     */
    isReferenceRelated(this: ExpressionType, other: ReferenceType): boolean;
    /**
     * Returns true if this type is reference-compatible (see C++ standard) to the type other.
     * @param {ExpressionType} other
     * @returns {boolean}
     */
    isReferenceCompatible(this: ExpressionType, other: ReferenceType): boolean;
    /**
     * Returns a C++ styled string representation of this type.
     * @param excludeBase If true, exclude the base type.
     * @param varname The name of the variable. May be the empty string.
     * @param decorated If true, html tags will be added.
     */
    abstract typeString(excludeBase: boolean, varname: string, decorated?: boolean): string;
    /**
     * Returns a C++ styled string representation of this type, with the base type excluded as
     * would be suitable for only printing the declarator part of a declaration.
     * @param varname The name of the variable. May be the empty string.
     */
    declaratorString(varname: string): string;
    /**
     * Returns a string representing a type as it might be read verbally in english.
     * e.g. int const * var[5] --> "an array of 5 pointers to const int"
     * @param plural Whether the returned string should be plural.
     */
    abstract englishString(plural: boolean): string;
    /**
     * Both the name and message are just a C++ styled string representation of the type.
     * @returns {{name: {String}, message: {String}}}
     */
    describe(): ConstructDescription;
    /**
     * If this is a compound type, returns the "next" type.
     * e.g. if this is a pointer-to-int, returns int
     * e.g. if this ia a reference to pointer-to-int, returns int
     * e.g. if this is an array of bool, returns bool
     */
    getCompoundNext(): Type | null;
    /**
     * Returns true if this type is either const or volatile (or both)
     * @returns {boolean}
     */
    isCVQualified(): boolean;
    /**
     * Returns a cv-unqualified copy of this type.
     */
    cvUnqualified(): this;
    /**
     * Returns a copy of this type with the specified cv-qualifications.
     */
    cvQualified(isConst?: boolean, isVolatile?: boolean): this;
    /**
     * Internal implementation of `cvQualifiedImpl`. DO NOT call this. It would be
     * a protected function, except that causes issues with newer versions of typescript
     * and intersection types. I suspect there is a TS compiler bug (or breaking change
     * to make rules for assignability stricter) somewhere w.r.t. verifying that protected
     * members of an intersection originate from the same declaration, specifically when
     * narrowing in a conditional type for one of the member types of the Type type union.
     * But I have not put in the time to track it down and submit an issue to the TS github.
     */
    abstract _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): TypeBase;
    abstract areLValuesAssignable(): boolean;
}
export declare function isAtomicType(type: Type): type is AtomicType;
export declare function isArithmeticType(type: Type): type is ArithmeticType;
export declare function isIntegralType(type: Type): type is IntegralType;
export declare function isFloatingPointType(type: Type): type is FloatingPointType;
export declare function isPointerType(type: Type): type is PointerType;
export declare function isPointerToType<T extends PotentiallyCompleteObjectType>(ctor: Constructor<T>): (type: Type) => type is PointerType<T>;
export declare function isPointerToCompleteType(type: Type): type is PointerToCompleteType;
export declare function isArrayPointerType(type: Type): type is ArrayPointerType;
export declare function isArrayPointerToType<T extends ArrayElemType>(ctor: Constructor<T>): (type: Type) => type is ArrayPointerType<T>;
export declare function isObjectPointerType(type: Type): type is ObjectPointerType;
export declare function isReferenceType(type: Type): type is ReferenceType;
export declare function isPotentiallyCompleteClassType(type: Type): type is PotentiallyCompleteClassType;
export declare function isCompleteClassType(type: Type): type is CompleteClassType;
export declare function isBoundedArrayType(type: Type): type is BoundedArrayType;
export declare function isArrayOfUnknownBoundType(type: Type): type is ArrayOfUnknownBoundType;
export declare function isGenericArrayType(type: Type): type is BoundedArrayType | ArrayOfUnknownBoundType;
export declare function isArrayElemType(type: Type): type is ArrayElemType;
export declare function isFunctionType(type: Type): type is FunctionType;
export declare function isVoidType(type: Type): type is VoidType;
export declare function isPotentiallyCompleteObjectType(type: Type): type is PotentiallyCompleteObjectType;
export declare function isIncompleteObjectType(type: Type): type is IncompleteObjectType;
export declare function isCompleteObjectType(type: Type): type is CompleteObjectType;
export declare function isPotentialReturnType(type: Type): type is PotentialReturnType;
export declare function isCompleteReturnType(type: Type): type is CompleteReturnType;
export declare function isPotentialParameterType(type: Type): type is PotentialParameterType;
export declare function isCompleteParameterType(type: Type): type is CompleteParameterType;
export declare type Type = VoidType | CompleteObjectType | IncompleteClassType | FunctionType | ReferenceType | ArrayOfUnknownBoundType;
export declare type ExpressionType = Exclude<Type, ReferenceType>;
export declare type PotentiallyCompleteObjectType = AtomicType | BoundedArrayType | ArrayOfUnknownBoundType | PotentiallyCompleteClassType;
export declare type IncompleteObjectType = ArrayOfUnknownBoundType | IncompleteClassType;
export declare type CompleteObjectType = AtomicType | BoundedArrayType | CompleteClassType;
export declare type PotentialReturnType = AtomicType | PotentiallyCompleteClassType | ReferenceType | VoidType;
export declare type CompleteReturnType = AtomicType | CompleteClassType | ReferenceType | VoidType;
export declare type PotentialParameterType = AtomicType | PotentiallyCompleteClassType | ReferenceType;
export declare type CompleteParameterType = AtomicType | CompleteClassType | ReferenceType;
export declare class VoidType extends TypeBase {
    readonly type_kind = "void";
    static readonly VOID: VoidType;
    readonly precedence = 0;
    isComplete(): boolean;
    sameType(other: Type): boolean;
    similarType(other: Type): boolean;
    typeString(excludeBase: boolean, varname: string, decorated: boolean): string;
    englishString(plural: boolean): string;
    _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): VoidType;
    areLValuesAssignable(): boolean;
}
/**
 * Represents a type for an object that exists in memory and takes up some space.
 * Has a size property, but NOT necessarily a value. (e.g. an array).
 */
export declare abstract class ObjectTypeBase extends TypeBase {
    abstract readonly size: number;
}
export declare type Completed<T extends PotentiallyCompleteObjectType> = T extends CompleteObjectType ? T : T extends ArrayOfUnknownBoundType<infer E> ? BoundedArrayType<E> : T extends IncompleteClassType ? CompleteClassType : never;
/**
 * Represents a type for an object that has a value.
 */
declare abstract class ValueType extends ObjectTypeBase {
    /**
     * Converts a sequence of bytes (i.e. the C++ object representation) of a value of
     * this type into the raw value used to represent it internally in Lobster (i.e. a javascript value).
     * @param bytes
     */
    bytesToValue(bytes: byte[]): RawValueType;
    /**
     * Converts a raw value representing a value of this type to a sequence of bytes
     * (i.e. the C++ object representation)
     * @param value
     */
    valueToBytes(value: RawValueType): number[];
    /**
     * Returns whether a given raw value for this type is valid. For example, a pointer type may track runtime
     * type information about the array from which it was originally derived. If the pointer value increases such
     * that it wanders over the end of that array, its value becomes invalid.
     * @param value
     */
    abstract isValueValid(value: RawValueType): boolean;
    /**
     * Returns a human-readable string representation of the given raw value for this Type.
     * This is the representation that might be displayed to the user when inspecting the
     * value of an object.
     * Note that the value representation for the type in Lobster is just a javascript
     * value. It is not the C++ value representation for the type.
     * @param value
     */
    abstract valueToString(value: RawValueType): string;
    /**
     * Returns the string representation of the given raw value for this Type that would be
     * printed to an ostream.
     * Note that the raw value representation for the type in Lobster is just a javascript
     * value. It is not the C++ value representation for the type.
     * TODO: This is a hack that may eventually be removed since printing to a stream should
     * really be handled by overloaded << operator functions.
     * @param value
     */
    valueToOstreamString(value: RawValueType): string;
    areLValuesAssignable(): boolean;
}
export declare abstract class AtomicType extends ValueType {
    readonly type_kind = "AtomicType";
    readonly isAtomic = true;
    isDefaultConstructible(userDefinedOnly?: boolean): boolean;
    isDestructible(): boolean;
}
export declare abstract class SimpleType extends AtomicType {
    /**
     * Subclasses must implement a concrete type property that should be a
     * string indicating the kind of type e.g. "int", "double", "bool", etc.
     */
    abstract simpleType: string;
    readonly precedence = 0;
    sameType(other: Type): boolean;
    similarType(other: Type): boolean;
    typeString(excludeBase: boolean, varname: string, decorated: boolean): string;
    englishString(plural: boolean): string;
    valueToString(value: RawValueType): string;
    isValueValid(value: RawValueType): boolean;
}
export declare type ParsingResult<T extends ArithmeticType> = SuccessParsingResult<T> | ErrorParsingResult;
export declare type SuccessParsingResult<T extends ArithmeticType> = {
    kind: "success";
    result: Value<T>;
};
export declare type ErrorParsingResult = {
    kind: "error";
};
export declare abstract class ArithmeticType extends SimpleType {
    abstract parse(s: string): ParsingResult<this>;
}
export declare type AnalyticArithmeticType = AnalyticIntegralType | AnalyticFloatingPointType;
export declare abstract class IntegralType extends ArithmeticType {
}
export declare type AnalyticIntegralType = Char | Int | Size_t | Bool;
export declare class Char extends IntegralType {
    static readonly CHAR: Char;
    readonly simpleType = "char";
    readonly size = 1;
    static readonly NULL_CHAR: Value<Char>;
    static isNullChar(value: Value<Char>): boolean;
    static jsStringToNullTerminatedCharArray(str: string): Value<Char>[];
    valueToString(value: RawValueType): string;
    valueToOstreamString(value: RawValueType): string;
    _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): Char;
    parse(s: string): ParsingResult<this>;
}
export declare class Int extends IntegralType {
    static readonly INT: Int;
    static readonly ZERO: Value<Int>;
    readonly simpleType = "int";
    readonly size = 4;
    _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): Int;
    parse(s: string): ParsingResult<this>;
}
export declare class Size_t extends IntegralType {
    readonly simpleType = "size_t";
    readonly size = 8;
    _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): Size_t;
    parse(s: string): ParsingResult<this>;
}
export declare class Bool extends IntegralType {
    static readonly BOOL: Bool;
    readonly simpleType = "bool";
    readonly size = 1;
    _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): Bool;
    parse(s: string): ParsingResult<this>;
}
export declare abstract class FloatingPointType extends ArithmeticType {
    valueToString(value: RawValueType): string;
    valueToOstreamString(value: RawValueType): string;
}
export declare type AnalyticFloatingPointType = Float | Double;
export declare class Float extends FloatingPointType {
    static readonly FLOAT: Float;
    readonly simpleType = "float";
    readonly size = 4;
    _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): Float;
    parse(s: string): ParsingResult<this>;
}
export declare class Double extends FloatingPointType {
    static readonly DOUBLE: Double;
    readonly simpleType = "double";
    readonly size = 8;
    _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): Double;
    parse(s: string): ParsingResult<this>;
}
export declare class PointerType<PtrTo extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends AtomicType {
    readonly size = 8;
    readonly precedence = 1;
    static isNull(value: RawValueType): boolean;
    static isNegative(value: RawValueType): boolean;
    readonly ptrTo: PtrTo;
    constructor(ptrTo: PtrTo, isConst?: boolean, isVolatile?: boolean);
    getCompoundNext(): PtrTo;
    sameType(other: Type): boolean;
    similarType(other: Type): boolean;
    typeString(excludeBase: boolean, varname: string, decorated: boolean): string;
    englishString(plural: boolean): string;
    valueToString(value: RawValueType): string;
    /**
     * Returns whether a given raw value for this type is dereferenceable. For pointer types, the given raw value is dereferenceable
     * if the result of the dereference will be a live object. An example of the distinction between validity and
     * dereferenceability for pointer types would be an array pointer. The pointer value (an address) is dereferenceable
     * if it is within the bounds of the array. It is valid in those same locations plus also the location one space
     * past the end (but not dereferenceable there). All other address values are invalid.
     * @param value
     */
    isValueDereferenceable(value: RawValueType): boolean;
    isValueValid(value: RawValueType): boolean;
    _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): PointerType<PtrTo>;
}
export declare type PointerToCompleteType = PointerType<CompleteObjectType>;
export declare class ArrayPointerType<T extends ArrayElemType = ArrayElemType> extends PointerType<T> {
    readonly arrayObject: CPPObject<BoundedArrayType<T>>;
    constructor(arrayObject: CPPObject<BoundedArrayType<T>>, isConst?: boolean, isVolatile?: boolean);
    min(): number;
    onePast(): number;
    isValueValid(value: RawValueType): boolean;
    isValueDereferenceable(value: RawValueType): boolean;
    toIndex(addr: number): number;
    _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): ArrayPointerType<T>;
}
export declare class ObjectPointerType<T extends CompleteObjectType = CompleteObjectType> extends PointerType<T> {
    readonly pointedObject: CPPObject<T>;
    constructor(obj: CPPObject<T>, isConst?: boolean, isVolatile?: boolean);
    getPointedObject(): CPPObject<T>;
    isValueValid(value: RawValueType): boolean;
    _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): ObjectPointerType<T>;
}
export declare class ReferenceType<RefTo extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends TypeBase {
    readonly precedence = 1;
    readonly refTo: RefTo;
    constructor(refTo: RefTo);
    isComplete(): boolean;
    getCompoundNext(): RefTo;
    sameType(other: Type): boolean;
    similarType(other: Type): boolean;
    typeString(excludeBase: boolean, varname: string, decorated: boolean): string;
    englishString(plural: boolean): string;
    valueToString(value: RawValueType): string;
    _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): ReferenceType<RefTo>;
    areLValuesAssignable(): boolean;
}
export declare type ReferredType<T extends ReferenceType> = T["refTo"];
export declare type PeelReference<T extends Type> = T extends ReferenceType ? T["refTo"] : T;
export declare type ExcludeRefType<T extends Type> = T extends ReferenceType ? never : T;
export declare function peelReference<T extends Type>(type: T): PeelReference<T>;
export declare function peelReference<T extends Type>(type: T | undefined): PeelReference<T> | undefined;
export declare type ArrayElemType = AtomicType | CompleteClassType;
export declare class BoundedArrayType<Elem_type extends ArrayElemType = ArrayElemType> extends ObjectTypeBase {
    readonly size: number;
    readonly precedence = 2;
    readonly elemType: Elem_type;
    readonly length: number;
    constructor(elemType: Elem_type, length: number);
    isComplete(context?: TranslationUnitContext): this is BoundedArrayType<Elem_type>;
    getCompoundNext(): Elem_type;
    sameType(other: Type): boolean;
    similarType(other: Type): boolean;
    typeString(excludeBase: boolean, varname: string, decorated: boolean): string;
    englishString(plural: boolean): string;
    _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): BoundedArrayType<Elem_type>;
    adjustToPointerType(): PointerType<Elem_type>;
    areLValuesAssignable(): boolean;
    isDefaultConstructible(userDefinedOnly?: boolean): boolean;
    isDestructible(): boolean;
}
export declare class ArrayOfUnknownBoundType<Elem_type extends ArrayElemType = ArrayElemType> extends TypeBase {
    readonly precedence = 2;
    readonly elemType: Elem_type;
    readonly sizeExpressionAST?: ExpressionASTNode;
    constructor(elemType: Elem_type, sizeExpressionAST?: ExpressionASTNode);
    isComplete(): this is BoundedArrayType<Elem_type>;
    getCompoundNext(): Elem_type;
    sameType(other: Type): boolean;
    similarType(other: Type): boolean;
    typeString(excludeBase: boolean, varname: string, decorated: boolean): string;
    englishString(plural: boolean): string;
    _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): ArrayOfUnknownBoundType<Elem_type>;
    adjustToPointerType(): PointerType<Elem_type>;
    areLValuesAssignable(): boolean;
}
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
declare class ClassTypeBase extends TypeBase {
    readonly precedence: number;
    readonly className: string;
    private readonly classId;
    private readonly shared;
    readonly templateParameters: readonly AtomicType[];
    /** DO NOT USE. Exists only to ensure CompleteClassType is not structurally assignable to CompleteClassType */
    readonly t_isComplete: boolean;
    constructor(classId: number, className: string, shared: ClassShared, isConst?: boolean, isVolatile?: boolean);
    get classDefinition(): ClassDefinition | undefined;
    get size(): number | undefined;
    get classScope(): ClassScope | undefined;
    setDefinition(def: ClassDefinition): void;
    isComplete(context?: TranslationUnitContext): this is CompleteClassType;
    sameType(other: Type): boolean;
    similarType(other: Type): boolean;
    isDerivedFrom(other: Type): boolean;
    typeString(excludeBase: boolean, varname: string, decorated?: boolean): string;
    englishString(plural: boolean): string;
    _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): ClassTypeBase;
    areLValuesAssignable(): boolean;
    isDefaultConstructible(this: CompleteClassType, userDefinedOnly?: boolean): boolean;
    isDestructible(this: CompleteClassType): boolean;
    isAggregate(this: CompleteClassType): boolean;
}
export interface IncompleteClassType extends ClassTypeBase {
    /** DO NOT USE. Exists only to ensure CompleteClassType is not structurally assignable to CompleteClassType */
    readonly t_isComplete: false;
}
export interface CompleteClassType extends ClassTypeBase {
    /** DO NOT USE. Exists only to ensure CompleteClassType is not structurally assignable to CompleteClassType */
    readonly t_isComplete: true;
    readonly classDefinition: ClassDefinition;
    readonly size: number;
    readonly classScope: ClassScope;
    isDefaultConstructible(userDefinedOnly?: boolean): boolean;
    isDestructible(): boolean;
}
export declare type PotentiallyCompleteClassType = IncompleteClassType | CompleteClassType;
export declare function createClassType(className: string): IncompleteClassType;
export declare class FunctionType<ReturnType extends PotentialReturnType = PotentialReturnType> extends TypeBase {
    readonly type_kind = "function";
    readonly precedence = 2;
    readonly returnType: ReturnType;
    readonly paramTypes: readonly PotentialParameterType[];
    readonly receiverType?: PotentiallyCompleteClassType;
    private paramStrType;
    private paramStrEnglish;
    constructor(returnType: ReturnType, paramTypes: readonly PotentialParameterType[], receiverType?: PotentiallyCompleteClassType);
    isComplete(): boolean;
    _cvQualifiedImpl(isConst: boolean, isVolatile: boolean): FunctionType;
    sameType(other: Type): boolean;
    similarType(other: Type): boolean;
    sameParamTypes(other: FunctionType | readonly Type[]): boolean;
    sameReturnType(other: FunctionType): boolean;
    sameReceiverType(other: FunctionType): boolean;
    sameSignature(other: FunctionType): boolean;
    isPotentialOverriderOf(other: FunctionType): boolean;
    typeString(excludeBase: boolean, varname: string, decorated?: boolean): string;
    englishString(plural: boolean): string;
    areLValuesAssignable(): boolean;
}
export declare function isBuiltInTypeName(name: string): name is "char" | "int" | "size_t" | "bool" | "float" | "double" | "void";
export declare const builtInTypes: {
    char: typeof Char;
    int: typeof Int;
    size_t: typeof Int;
    bool: typeof Bool;
    float: typeof Float;
    double: typeof Double;
    void: typeof VoidType;
};
export {};
