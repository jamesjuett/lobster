import { ObjectType, Type, AtomicType, BoundedArrayType, PointerType, ArrayPointerType, Int, Bool, IntegralType, Float, Double, FloatingPointType, similarType, subType, sameType, isCvConvertible, ArithmeticType, ArrayElemType, isType } from "./types";
import { SimpleRuntimeExpression, NumericLiteral } from "./expressions";
import { Description, SuccessfullyCompiled, CompiledTemporaryDeallocator, RuntimeConstruct } from "./constructs";
import { Value } from "./runtimeEnvironment";
import { assert } from "../util/util";
import { CompiledExpression, Expression, VCResultTypes, RuntimeExpression, ValueCategory, TypedExpression, SpecificTypedExpression } from "./expressionBase";

export abstract class ImplicitConversion<FromType extends ObjectType = ObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends ObjectType = ObjectType, ToVC extends ValueCategory = ValueCategory> extends Expression {
    
    public readonly from: TypedExpression<FromType, FromVC>;
    public readonly type: ToType;
    public readonly valueCategory: ToVC;
    
    public readonly conversionLength: number;

    public constructor(from: TypedExpression<FromType, FromVC>, toType: ToType, valueCategory: ToVC) {
        super(from.context);
        this.attach(this.from = from);
        this.type = toType;
        this.valueCategory = valueCategory;

        if (from instanceof ImplicitConversion) {
            this.conversionLength = from.conversionLength + 1;
        }
        else{
            this.conversionLength = 1;
        }
    }

    public createRuntimeExpression<FromType extends ObjectType, FromVC extends ValueCategory, ToType extends ObjectType, ToVC extends ValueCategory>(this: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct) : RuntimeImplicitConversion<FromType, FromVC, ToType, ToVC>;
    public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : never;
    public createRuntimeExpression<FromType extends ObjectType, FromVC extends ValueCategory, ToType extends ObjectType, ToVC extends ValueCategory>(this: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct) : RuntimeImplicitConversion<FromType, FromVC, ToType, ToVC> {
        return new RuntimeImplicitConversion(this, parent);
    }

    public abstract operate(fromEvalResult: VCResultTypes<FromType, FromVC>) : VCResultTypes<ToType, ToVC>;

    
    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }
}

export interface CompiledImplicitConversion<FromType extends ObjectType = ObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends ObjectType = ObjectType, ToVC extends ValueCategory = ValueCategory> extends ImplicitConversion<FromType, FromVC, ToType, ToVC>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    
    readonly from: CompiledExpression<FromType, FromVC>;
}

export class RuntimeImplicitConversion<FromType extends ObjectType = ObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends ObjectType = ObjectType, ToVC extends ValueCategory = ValueCategory>
    extends SimpleRuntimeExpression<ToType, ToVC, CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>> {
        
    public readonly from: RuntimeExpression<FromType, FromVC>;
    
    public constructor(model: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct) {
        super(model, parent);
        this.from = this.model.from.createRuntimeExpression(this);
        this.setSubexpressions([this.from]);
    }
        
    protected operate(): void {
        this.setEvalResult(this.model.operate(this.from.evalResult));
    }
    // isTailChild : function(child){
    //     return {isTail: false,
    //         reason: "An implicit conversion (" + (this.englishName || this._name) + ") takes place after the function call returns."
    //     };
    // }

}


// Type 1 Conversions
// LValueToRValue, ArrayToPointer, FunctionToPointer


export class LValueToRValue<T extends AtomicType> extends ImplicitConversion<T, "lvalue", T, "prvalue"> {
    
    public constructor(from: TypedExpression<T, "lvalue">) {
        super(from, from.type.cvUnqualified(), "prvalue");
    }
    
    public operate(fromEvalResult: VCResultTypes<T, "lvalue">) {
        return <VCResultTypes<T, "prvalue">>fromEvalResult.getValue(); // Cast technically necessary here
        // TODO: add alert if value is invalid
        // e.g. inst.setEvalResult(readValueWithAlert(evalValue, sim, this.from, inst.childInstances.from));
    }

    // describeEvalResult : function(depth, sim, inst){
    //     if (inst && inst.evalResult){
    //         return inst.evalResult.describe();
    //     }
    //     else if (depth == 0){
    //         return {message: "the value of " + this.getSourceText()};
    //     }
    //     else{
    //         return {message: "the value of " + this.from.describeEvalResult(depth-1,sim, inst && inst.childInstances && inst.childInstances.from).message};
    //     }
    // },

    // explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //     return {message: "The value of " + this.from.describeEvalResult(0, sim, inst && inst.childInstances && inst.childInstances.from).message + " will be looked up."};
    // }

}

export class ArrayToPointer<T extends BoundedArrayType> extends ImplicitConversion<T, "lvalue", PointerType, "prvalue"> {

    public constructor(from: TypedExpression<T, "lvalue">) {
        super(from, from.type.adjustToPointerType(), "prvalue");
    }

    public operate(fromEvalResult: VCResultTypes<BoundedArrayType, "lvalue">) {
        return new Value(fromEvalResult.address, new ArrayPointerType(fromEvalResult));
    }

    // explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //     return {message: "In this case (and most others), using the name of an array in an expression will yield a the address of its first element. That's what happens here."};
    // }
}



// export var FunctionToPointer = ImplicitConversion.extend({
//     _name: "FunctionToPointer",
//     init: function(from){
//         assert(isA(from.type, Types.Function));
//         this.initParent(from, Types.Pointer.instance(from.type), "prvalue");
//     },

//     operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var func = inst.childInstances.from.evalResult;
//         inst.setEvalResult(Value.instance(func, this.type));
//     },

//     explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         return {message: "Using the name of a function in an expression will yield a pointer to that function."};
//     }
// });

// Type 2 Conversions

/**
 * All type conversions ignore cv-qualifications on the given destination type. Instead,
 * the converted type retains the cv-qualifications of the source type.
 */
abstract class TypeConversion<FromType extends AtomicType, ToType extends AtomicType>
    extends ImplicitConversion<FromType, "prvalue", ToType, "prvalue"> {

    public constructor(from: TypedExpression<FromType, "prvalue">, toType: ToType) {
        super(from, toType.cvQualified(from.type.isConst, from.type.isVolatile), "prvalue");
    }

}

class NoOpTypeConversion<FromType extends AtomicType, ToType extends AtomicType>
    extends TypeConversion<FromType, ToType> {

    public constructor(from: TypedExpression<FromType, "prvalue">, toType: ToType) {
        super(from, toType);
    }
    
    public operate(fromEvalResult: VCResultTypes<FromType, "prvalue">) {
        return <VCResultTypes<ToType, "prvalue">>new Value(fromEvalResult.rawValue, this.type); // Cast technically necessary here
    }
}

export class NullPointerConversion<P extends PointerType> extends NoOpTypeConversion<Int, P> {

    public constructor(from: NumericLiteral<Int>, toType: P) {
        super(from, toType);
        assert(from.value.rawValue === 0);
    }

}

export class PointerConversion<FromType extends PointerType, ToType extends PointerType> extends NoOpTypeConversion<FromType, ToType> {

}

export class PointerToBooleanConversion extends NoOpTypeConversion<PointerType, Bool> {
    public constructor(from: TypedExpression<PointerType, "prvalue">) {
        super(from, Bool.BOOL);
    }
}

export class IntegralPromotion<FromType extends IntegralType, ToType extends IntegralType> extends NoOpTypeConversion<FromType, ToType> {

}

export class IntegralConversion<FromType extends IntegralType, ToType extends IntegralType> extends NoOpTypeConversion<FromType, ToType> {

}


export class FloatingPointPromotion extends NoOpTypeConversion<Float, Double> {
    public constructor(from: TypedExpression<Float, "prvalue">) {
        super(from, Double.DOUBLE);
    }
}

export class FloatingPointConversion<FromType extends FloatingPointType, ToType extends FloatingPointType> extends NoOpTypeConversion<FromType, ToType> {

}

export class IntegralToFloatingConversion<FromType extends IntegralType, ToType extends FloatingPointType> extends NoOpTypeConversion<FromType, ToType> {

}


export class FloatingToIntegralConversion<T extends FloatingPointType> extends TypeConversion<T, IntegralType> {

    public operate(fromEvalResult: VCResultTypes<T, "prvalue">) {
        if (this.type.isType(Bool)) {
            return new Value(fromEvalResult.rawValue === 0 ? 0 : 1, Int.INT);
        }
        return new Value(Math.trunc(fromEvalResult.rawValue), Int.INT);
    }

}


// TODO: remove this. no longer needed now that we have real strings
// StringToCStringConversion = ImplicitConversion.extend({
//     _name: "StringToCStringConversion",
//     init: function(from, toType){
//         assert(from.valueCategory === "prvalue");
//         assert(isA(from.type, Types.String));
//         assert(isA(toType, Types.Array) && isA(toType.elemType, Types.Char));
//         this.initParent(from, toType, "prvalue");
//     },
//
//     operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         // I think only thing I really need here is to handle booleans gracefully
//         // Adding 0.0 should do the trick.
//         var cstr = inst.childInstances.from.evalResult.value;
//         inst.setEvalResult(Value.instance(cstr.split(""), Types.String));
//     }
// });

// Qualification conversions

export class QualificationConversion<T extends AtomicType> extends ImplicitConversion<T, "prvalue", T, "prvalue"> {

    public constructor(from: TypedExpression<T, "prvalue">, toType: T) {
        super(from, toType, "prvalue");
        assert(similarType(from.type, toType));
    }
    
    public operate(fromEvalResult: VCResultTypes<T, "prvalue">) {
        return <VCResultTypes<T, "prvalue">>new Value(fromEvalResult.rawValue, this.type); // Cast technically necessary here
    }
}

export function convertToPRValue<T extends AtomicType>(from: SpecificTypedExpression<T>) : TypedExpression<T, "prvalue">;
export function convertToPRValue<Elem_type extends ArrayElemType>(from: TypedExpression<BoundedArrayType<Elem_type>, "lvalue">) : TypedExpression<PointerType<Elem_type>, "prvalue">;
export function convertToPRValue(from: SpecificTypedExpression<AtomicType> | TypedExpression<BoundedArrayType, "lvalue">) : TypedExpression<AtomicType, "prvalue">;
export function convertToPRValue(from: TypedExpression) : TypedExpression;
export function convertToPRValue(from: TypedExpression) {

    if (from.isBoundedArrayTyped()) {
        return new ArrayToPointer(from);
    }

    if (!from.isAtomicTyped()) {
        return from;
    }

    // based on union input type, it must be atomic typed if we get to here

    if (from.isPrvalue()) {
        return from;
    }
    
    // must be an lvalue if we get to here


    // TODO: add back in for function pointers
    // if (from.type instanceof FunctionType) {
    //     return new FunctionToPointer(from);
    // }

    return new LValueToRValue(from);
};

export function typeConversion(from: TypedExpression<PointerType, "prvalue">, toType: Bool) : TypedExpression<Bool, "prvalue">;
export function typeConversion(from: TypedExpression<Double, "prvalue">, toType: Float) : TypedExpression<Float, "prvalue">;
export function typeConversion(from: TypedExpression<IntegralType, "prvalue">, toType: IntegralType) : TypedExpression<IntegralType, "prvalue">;
export function typeConversion(from: TypedExpression<FloatingPointType, "prvalue">, toType: IntegralType) : TypedExpression<IntegralType, "prvalue">;
export function typeConversion(from: TypedExpression<IntegralType, "prvalue">, toType: FloatingPointType) : TypedExpression<FloatingPointType, "prvalue">;
export function typeConversion(from: TypedExpression<FloatingPointType, "prvalue">, toType: FloatingPointType) : TypedExpression<FloatingPointType, "prvalue">;
export function typeConversion<SimilarType extends AtomicType>(from: TypedExpression<SimilarType, "prvalue">, toType: SimilarType) : TypedExpression<SimilarType, "prvalue">;
export function typeConversion<FromType extends AtomicType, ToType extends AtomicType>(from: TypedExpression<FromType, "prvalue">, toType: ToType) : TypedExpression<FromType, "prvalue"> | TypedExpression<ToType, "prvalue">;
export function typeConversion(from: TypedExpression<AtomicType, "prvalue">, toType: AtomicType) {

    if (similarType(from.type, toType)) {
        return from;
    }

    if (toType.isPointerType() && (from instanceof NumericLiteral) && isType(from.type, Int) && from.value.rawValue === 0) {
        return new NullPointerConversion(from, toType);
    }

    if (toType.isPointerType() && toType.ptrTo.isClassType() &&
        from.isPointerTyped() && from.type.ptrTo.isClassType() &&
        subType(from.type.ptrTo, toType.ptrTo)) {
        // Note that cv qualifications on the new destination pointer type don't need to be set, since
        // they are ignored by the PointerConversion anyway (the source type's cv qualifications are set).
        // However, we do need to preserve the cv-qualifications on the pointed-to type.
        return new PointerConversion(from, new PointerType(toType.ptrTo.cvQualified(from.type.ptrTo.isConst, from.type.ptrTo.isVolatile)));
    }

    if (toType.isType(Bool) && from.isPointerTyped()) {
        return new PointerToBooleanConversion(from);
    }

    if (toType.isType(Double) && from.isTyped(Float)) {
        return new FloatingPointPromotion(from);
    }

    if (toType.isIntegralType()) {
        if (from.isIntegralTyped()) {
            return new IntegralConversion(from, toType);
        }
        if (from.isFloatingPointTyped()) {
            return new FloatingToIntegralConversion(from, toType);
        }
    }

    if (toType.isFloatingPointType()) {
        if (from.isIntegralTyped()) {
            return new IntegralToFloatingConversion(from, toType);
        }
        if (from.isFloatingPointTyped()) {
            return new FloatingPointConversion(from, toType);
        }
    }

    return from;
};

export function qualificationConversion(from: TypedExpression<AtomicType, "prvalue">, toType: AtomicType) {

    if (sameType(from.type, toType)) {
        return from;
    }

    if (from.valueCategory === "prvalue" && isCvConvertible(from.type, toType)) {
        return new QualificationConversion(from, toType);
    }

    return from;
};

export interface StandardConversionOptions {
    readonly suppressLTR?: true;
}

/**
 * Attempts to generate a standard conversion sequence of the given expression to the given
 * destination type. 
 * @param from The original expression
 * @param toType The destination type
 * @param options 
 */
export function standardConversion(from: TypedExpression, toType: Type, options: StandardConversionOptions = {}) {

    // Unless the object is atomic typed or is an array, Lobster currently doesn't support
    // any standard conversions. Note in particular this means user-defined converison functions
    // for class-typed objects are not supported.
    if (!(from.isAtomicTyped() || from.isBoundedArrayTyped())) {
        return from;
    }

    if (!toType.isAtomicType()) {
        return from;
    }

    if (!options.suppressLTR) {
        let fromPrvalue = convertToPRValue(from);
        fromPrvalue = typeConversion(fromPrvalue, toType);
        fromPrvalue = qualificationConversion(fromPrvalue, toType);
        return fromPrvalue;
    }

    return from;
};

export function integralPromotion(expr: TypedExpression<IntegralType, "prvalue">) {
    if (expr.isIntegralTyped() && !expr.isTyped(Int)) {
        return new IntegralPromotion(expr, Int.INT);
    }
    else{
        return expr;
    }
};

export function usualArithmeticConversions(leftOrig: SpecificTypedExpression<ArithmeticType>, rightOrig: SpecificTypedExpression<ArithmeticType>) {
    
    let left = convertToPRValue(leftOrig);
    let right = convertToPRValue(rightOrig);

    // TODO If either has scoped enumeration type, no conversions are performed

    // TODO If either is long double, the other shall be converted to long double

    // If either is double, the other shall be converted to double
    if (left.isTyped(Double)) {
        right = typeConversion(right, Double.DOUBLE);
        return [left, right];
    }
    if (right.isTyped(Double)) {
        left = typeConversion(left, Double.DOUBLE);
        return [left, right];
    }
    // If either is float, the other shall be converted to float

    if (left.isTyped(Float)) {
        right = typeConversion(right, Float.FLOAT);
        return [left, right];
    }
    if (right.isTyped(Float)) {
        left = typeConversion(left, Float.FLOAT);
        return [left, right];
    }

    // Otherwise, do integral promotions
    if (left.isIntegralTyped()) {
        left = integralPromotion(left);
    }
    if (right.isIntegralTyped()) {
        right = integralPromotion(right);
    }

    // If both operands have the same type, no further conversion is needed
    if (sameType(left.type, right.type)){
        return [left, right];
    }

    // TODO: Otherwise, if both operands have signed or both have unsigned types,
    // operand with type of lesser integer conversion rank shall be converted
    // to the type of the operand with greater rank
    return [left, right];
}

