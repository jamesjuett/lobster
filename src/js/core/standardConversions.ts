import {Expression, readValueWithAlert, TypedExpression, ValueCategory, Literal, CompiledExpression, SimpleRuntimeExpression, RuntimeExpression, VCResultTypes, NumericLiteral} from "./expressions";
import {Type, Double, Float, sameType, ArrayType, FunctionType, ClassType, ObjectType, isType, PointerType, Int, subType, Bool, AtomicType, ArrayElemType, ArrayPointer, FloatingPointType, IntegralType} from "./types";
import { assertFalse, assert } from "../util/util";
import { FunctionContext, ExecutableRuntimeConstruct, RuntimeConstruct, CompiledConstruct, ConstructContext } from "./constructs";
import { Value } from "./runtimeEnvironment";
import { Description } from "./errors";
import { CPPObject } from "./objects";

export type ImplicitConversionKind = "lvalue-to-rvalue";

const CONVERSION_OPERATIONS : {[index: ImplicitConversionKind]: (rt: RuntimeImplicitConversion) => void} = {
    "lvalue-to-rvalue" : (rt: RuntimeImplicitConversion) => {
        rt.from.
    }
}

export abstract class ImplicitConversion<FromType extends ObjectType = ObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends ObjectType = ObjectType, ToVC extends ValueCategory = ValueCategory> extends Expression {
    
    public readonly from: TypedExpression<FromType, FromVC>;
    public readonly type: ToType;
    public readonly valueCategory: ToVC;

    public readonly kind : ImplicitConversionKind;
    
    public readonly conversionLength: number;

    public constructor(context: ConstructContext, from: TypedExpression<FromType, FromVC>, toType: ToType, valueCategory: ToVC) {
        super(context);
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

    public createRuntimeExpression<FromType extends ObjectType, FromVC extends ValueCategory, ToType extends ObjectType, ToVC extends ValueCategory>(this: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: ExecutableRuntimeConstruct) : RuntimeImplicitConversion<FromType, FromVC, ToType, ToVC>;
    public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledExpression<T,V>, parent: ExecutableRuntimeConstruct) : never;
    public createRuntimeExpression<FromType extends ObjectType, FromVC extends ValueCategory, ToType extends ObjectType, ToVC extends ValueCategory>(this: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: ExecutableRuntimeConstruct) : RuntimeImplicitConversion<FromType, FromVC, ToType, ToVC> {
        return new RuntimeImplicitConversion(this, parent);
    }

    public abstract operate(fromEvalResult: VCResultTypes<FromType, FromVC>) : VCResultTypes<ToType, ToVC>;

    
    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }
}

export interface CompiledImplicitConversion<FromType extends ObjectType = ObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends ObjectType = ObjectType, ToVC extends ValueCategory = ValueCategory> extends ImplicitConversion<FromType, FromVC, ToType, ToVC>, CompiledConstruct {
    readonly from: CompiledExpression<FromType, FromVC>;
}

export class RuntimeImplicitConversion<FromType extends ObjectType = ObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends ObjectType = ObjectType, ToVC extends ValueCategory = ValueCategory>
    extends SimpleRuntimeExpression<ToType, ToVC, CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>> {
        
    public readonly from: RuntimeExpression<FromType, FromVC>;
    
    public constructor(model: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: ExecutableRuntimeConstruct) {
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


class DoNothing extends ImplicitConversion {
    _name: "DoNothing",
    init: function(from, to, valueCategory){
        this.initParent(from, to, valueCategory);
    },

    operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        var evalValue = inst.childInstances.from.evalResult;
        // Note, we get the type from the evalValue to preserve RTTI
        inst.setEvalResult(Value.instance(evalValue.value, evalValue.type));
    }
});

// Type 1 Conversions
// LValueToRValue, ArrayToPointer, FunctionToPointer


export class LValueToRValue<T extends AtomicType> extends ImplicitConversion<T, "lvalue", T, "prvalue"> {
    
    public constructor(context: ConstructContext, from: TypedExpression<T, "lvalue">) {
        super(context, from, from.type.cvUnqualified(), "prvalue");
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

export class ArrayToPointer<T extends ArrayType> extends ImplicitConversion<T, "lvalue", PointerType, "prvalue"> {

    public constructor(context: ConstructContext, from: TypedExpression<T, "lvalue">) {
        super(context, from, from.type.adjustToPointerType(), "prvalue");
    }

    public operate(fromEvalResult: VCResultTypes<ArrayType, "lvalue">) {
        return new Value(fromEvalResult.address, new ArrayPointer(fromEvalResult));
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
// Qualification conversions

class NoOpConversion<FromType extends AtomicType, ToType extends AtomicType>
    extends ImplicitConversion<FromType, "prvalue", ToType, "prvalue"> {

    public constructor(context: ConstructContext, from: TypedExpression<FromType, "prvalue">, toType: ToType) {
        super(context, from, toType, "prvalue");
    }
    
    public operate(fromEvalResult: VCResultTypes<FromType, "prvalue">) {
        return <VCResultTypes<ToType, "prvalue">>new Value(fromEvalResult.rawValue, this.type); // Cast technically necessary here
    }
}

export class QualificationConversion<FromType extends AtomicType, ToType extends AtomicType> extends NoOpConversion<FromType, ToType> {

}

export class NullPointerConversion<P extends PointerType> extends NoOpConversion<Int, P> {

    public constructor(context: ConstructContext, from: NumericLiteral<Int>, toType: P) {
        super(context, from, toType);
        assert(from.value.rawValue === 0);
    }

}

export class PointerConversion<FromType extends PointerType, ToType extends PointerType> extends NoOpConversion<FromType, ToType> {

}

export class PointerToBooleanConversion extends NoOpConversion<PointerType, Bool> {

}

export class FloatingPointPromotion extends NoOpConversion<Float, Double> {

}

export class IntegralConversion<FromType extends IntegralType, ToType extends IntegralType> extends NoOpConversion<FromType, ToType> {

}

export class IntegralToFloatingConversion<FromType extends IntegralType, ToType extends FloatingPointType> extends NoOpConversion<FromType, ToType> {

}

export var FloatingIntegralConversion = ImplicitConversion.extend({
    _name: "FloatingIntegralConversion",
    init: function(from, toType){
        assert(from.valueCategory === "prvalue");
        assert(from.type.isFloatingPointType);
        assert(toType.isIntegralType);
        this.initParent(from, toType, "prvalue");
    },

    operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        var val = inst.childInstances.from.evalResult.value;
        if (isA(this.type, Types.Bool)) {
            inst.setEvalResult(Value.instance(val != 0, this.type));
        }
        else{
            inst.setEvalResult(Value.instance(Math.trunc(val), this.type));
        }
    }
});


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

//var IntegralPromotion = IntegralPromotion = ImplicitConversion.extend({
//    _name: "IntegralPromotion",
//    init: function(from){
//        // A prvalue of an integer type other than bool, char16_t, char32_t, or wchar_t
//        // whose integer conversion rank is less than the rank of int can be operateed to
//        // a prvalue of type int if int can represent all the values in the source type
//        this.initParent(from, Types.Pointer.instance(from.type.elemType), "prvalue");
//    },
//
//    operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//        var arrObj = inst.childInstances.from.evalResult.object;
//        inst.setEvalResult(Value.instance(arrObj.address, this.type));
//    }
//});



export var IntegralPromotion = ImplicitConversion.extend({
    _name: "IntegralPromotion",
    init: function(from, toType){
        assert(from.valueCategory === "prvalue");
        assert(from.type.isIntegralType);
        assert(toType.isIntegralType);
        this.initParent(from, toType, "prvalue");
    },

    operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//        alert(this.from.type + ", "+  this.type);
        var val = inst.childInstances.from.evalResult.value;
        if (isA(this.from.type, Types.Bool)){ // from bool
            inst.setEvalResult(Value.instance(val ? 1 : 0, this.type));
        }
        else if (isA(this.type, Types.Bool)){ // to bool
            inst.setEvalResult(Value.instance(val != 0 ? true : false, this.type));
        }
        else{
            inst.setEvalResult(Value.instance(val, this.type));
        }
    }
});

export function convertToPRValue<T extends Type>(from: TypedExpression<T, ValueCategory>) : TypedExpression<T, "prvalue"> {

    if (from.valueCategory === "prvalue") {
        return <TypedExpression<T, "prvalue">> from;
    }

    // Don't do lvalue to rvalue conversion on Classes dude // TODO: what does this mean?
    if (from.type instanceof ClassType) {
        return assertFalse("Class type object should never be converted to a prvalue");
    }

    // array to pointer conversion
    if (from.type instanceof ArrayType) {
        return new ArrayToPointer(from);
    }

    if (from.type instanceof FunctionType) {
        return new FunctionToPointer(from);
    }

    // lvalue to rvalue conversion
    if (from.valueCategory === "lvalue" || from.valueCategory === "xvalue"){
        return new LValueToRValue(from);
    }

    return assertFalse("Failed to find matching conversion to convert to prvalue");
};

var standardConversion2 = function(from: TypedExpression<ObjectType, "prvalue">, toType: ObjectType) {

    if (sameType(from.type, toType)){
        return from;
    }

    if (isType(toType, PointerType) && (from instanceof Literal) && isType(from.type, Int) && from.value.rawValue() == 0){
        return NullPointerConversion.instance(from, toType);
    }

    if (isType(toType, PointerType)) {
        if (isType(from.type, PointerType) && subType(from.type.ptrTo, toType.ptrTo)) {
            toType = new PointerType(toType.ptrTo.cvQualified(from.type.ptrTo.isConst, from.type.ptrTo.isVolatile), from.type.isConst, from.type.isVolatile);
            return PointerConversion.instance(from, toType);
        }
    }

    if (isType(toType, Double)){
        if (isType(from.type, Float)){
            return FloatingPointPromotion.instance(from);
        }
    }

    if (isType(toType, Bool)) {
        if (isType(from.type, PointerType)) {
            return PointerToBooleanConversion.instance(from);
        }
    }

    if (toType.isFloatingPointType){
        if (from.type.isIntegralType){
            return IntegralFloatingConversion.instance(from, toType);
        }
    }

    if (toType.isIntegralType){
        if (from.type.isIntegralType){
            return IntegralConversion.instance(from, toType);
        }
        if (from.type.isFloatingPointType){
            return FloatingIntegralConversion.instance(from, toType);
        }
    }

    return from;
};

var standardConversion3 = function(from, toType){

    if (sameType(from.type, toType)){
        return from;
    }

    if (from.valueCategory === "prvalue" && isCvConvertible(from.type, toType)){
        return QualificationConversion.instance(from, toType);
    }

    return from;
};

export function standardConversion(from: TypedExpression, toType: Type, options = {}) : TypedExpression {
    options = options || {};

    if (!options.suppressLTR){
        from = convertToPRValue(from, options);
    }
    from = standardConversion2(from, toType, options);
    from = standardConversion3(from, toType, options);
    return from;
};

export function integralPromotion(expr) {
    if (expr.type.isIntegralType && !isA(expr.type, Types.Int)) {
        return IntegralPromotion.instance(expr, Types.Int.instance());
    }
    else{
        return expr;
    }
};

export function usualArithmeticConversions(left:TypedExpression, right:TypedExpression) {
    // Only do conversions if both are arithmetic
    if (!left.type.isArithmeticType || !right.type.isArithmeticType){
        return {left: left, right: right};
    }
    
    left = convertToPRValue(left);
    right = convertToPRValue(right);

    // TODO If either has scoped enumeration type, no conversions are performed

    // TODO If either is long double, the other shall be converted to long double

    // If either is double, the other shall be converted to double
    if (left.type instanceof Double) {
        right = standardConversion(right, new Double(), {suppressLTR:true});
        return {left: left, right: right};
    }
    if (right.type instanceof Double) {
        left = standardConversion(left, new Double(), {suppressLTR:true});
        return {left: left, right: right};
    }
    // If either is float, the other shall be converted to float

    if (left.type instanceof Float) {
        right = standardConversion(right, new Float(), {suppressLTR:true});
        return {left: left, right: right};
    }
    if (right.type instanceof Float) {
        left = standardConversion(left, new Float(), {suppressLTR:true});
        return {left: left, right: right};
    }

    // Otherwise, do integral promotions
    left = integralPromotion(left);
    right = integralPromotion(right);

    // If both operands have the same type, no further conversion is needed
    if (sameType(left.type, right.type)){
        return {left: left, right: right};
    }

    // TODO: Otherwise, if both operands have signed or both have unsigned types,
    // operand with type of lesser integer conversion rank shall be converted
    // to the type of the operand with greater rank
    return {left: left, right: right};
}

