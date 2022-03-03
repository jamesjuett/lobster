import { assert } from "../../util/util";
import { Bool, similarType, sameType, AtomicType, IntegralType, Int, PointerToCompleteType } from "../compilation/types";

export type RawValueType = number; // HACK - can be resolved if I make the raw value type used depend on the Type parameter

// export type ValueType<T extends AtomicType> = T extends AtomicType ? Value<T> : never;

export class Value<T extends AtomicType = AtomicType> {
    private static _name = "Value";

    public readonly type: T;
    private readonly _isValid: boolean;

    public readonly rawValue: RawValueType;


    // TODO: ts: change any type for value to match type expected for CPP type of value
    constructor(rawValue: RawValueType, type: T, isValid: boolean = true) {
        // TODO: remove this.value in favor of using rawValue() function
        this.rawValue = rawValue;
        this.type = type;
        this._isValid = isValid;
    };

    public get isValid() {
        // Note: this is implemented as a getter since it is necessary to call isValueValid on the type each time.
        //       e.g. A type with RTTI like an object pointer may become invalid if the object dies.
        return this._isValid && this.type.isValueValid(this.rawValue);
    }

    public isTyped<NarrowedT extends AtomicType>(predicate: (t:AtomicType) => t is NarrowedT) : this is Value<NarrowedT> {
        return predicate(this.type);
    }

    public clone(valueToClone: RawValueType = this.rawValue) {
        return new Value<T>(valueToClone, this.type, this.isValid);
    }

    public cvUnqualified() {
        return new Value<T>(this.rawValue, this.type.cvUnqualified(), this.isValid);
    }

    public cvQualified(isConst: boolean, isVolatile: boolean = false) {
        return new Value<T>(this.rawValue, this.type.cvQualified(isConst, isVolatile), this.isValid);
    }

    public invalidated() {
        return new Value<T>(this.rawValue, this.type, false);
    }

    public equals(otherValue: Value<T>) {
        return new Value<Bool>(
            this.rawValue === otherValue.rawValue ? 1 : 0,
            new Bool(),
            this.isValid && otherValue.isValid);
    }

    public rawEquals(otherRawValue: RawValueType) {
        return this.rawValue === otherRawValue;
    }

    public combine(otherValue: Value<T>, combiner: (a: RawValueType, b: RawValueType) => RawValueType) {
        assert(similarType(this.type, otherValue.type));
        return new Value<T>(
            combiner(this.rawValue, otherValue.rawValue),
            this.type,
            this.isValid && otherValue.isValid);
    }

    public pointerOffset<T extends PointerToCompleteType>(this: Value<T>, offsetValue: Value<IntegralType>, subtract: boolean = false) {
        return new Value<T>(
            (subtract ?
                this.rawValue - this.type.ptrTo.size * offsetValue.rawValue :
                this.rawValue + this.type.ptrTo.size * offsetValue.rawValue),
            this.type,
            this.isValid && offsetValue.isValid);
    }

    public pointerOffsetRaw<T extends PointerToCompleteType>(this: Value<T>, rawOffsetValue: number, subtract: boolean = false) {
        return new Value<T>(
            (subtract ?
                this.rawValue - this.type.ptrTo.size * rawOffsetValue :
                this.rawValue + this.type.ptrTo.size * rawOffsetValue),
            this.type,
            this.isValid);
    }

    public pointerDifference(this: Value<PointerToCompleteType>, otherValue: Value<PointerToCompleteType>) {
        return new Value<Int>(
            (this.rawValue - otherValue.rawValue) / this.type.ptrTo.size,
            new Int(),
            this.isValid && otherValue.isValid);
    }

    public compare(otherValue: Value<T>, comparer: (a: RawValueType, b: RawValueType) => boolean) {
        assert(similarType(this.type, otherValue.type));
        return new Value<Bool>(
            comparer(this.rawValue, otherValue.rawValue) ? 1 : 0,
            new Bool(),
            this.isValid && otherValue.isValid);
    }

    public modify(modifier: (a: RawValueType) => RawValueType) {
        return new Value<T>(
            modifier(this.rawValue),
            this.type,
            this.isValid);
    }
    
    public add(otherValue: Value<T>) {
        return this.combine(otherValue, (a,b) => a + b);
    }

    public addRaw(x: number) {
        return this.modify(a => a + x);
    }
    
    public sub(otherValue: Value<T>) {
        return this.combine(otherValue, (a,b) => a - b);
    }

    public subRaw(x: number) {
        return this.modify(a => a - x);
    }
    
    public arithmeticNegate() {
        return this.modify(a => -a);
    }
    
    public logicalNot() {
        return this.modify(a => a === 0 ? 1 : 0);
    }

    public toString() {
        return this.valueString();
    }

    public valueString() {
        return this.type.valueToString(this.rawValue);
    }

    // TODO: perhaps this should be moved to the ostream class
    public valueToOstreamString() {
        return this.type.valueToOstreamString(this.rawValue);
    }

    /**
     * This should be used VERY RARELY. The only time to use it is if you have a temporary Value instance
     * that you're using locally and want to keep updating its raw value to something else before passing
     * to something like memory.dereference(). For example, this is done when traversing through a cstring by
     * getting the value of the pointer initially, then ad hoc updating that value as you move through the cstring.
     */
    public setRawValue(rawValue: RawValueType) {
        (<RawValueType>this.rawValue) = rawValue;
        (<boolean>this.isValid) = this.isValid && this.type.isValueValid(this.rawValue);
    }

    public describe() {
        return { message: this.valueString() };
    }
}

