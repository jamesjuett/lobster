import {Expression, readValueWithAlert, TypedExpression, ValueCategory, Literal, CompiledExpression} from "./expressions";
import {Type, Double, Float, sameType, ArrayType, FunctionType, ClassType, ObjectType, isType, PointerType, Int, subType, Bool} from "./types";
import { assertFalse } from "../util/util";

export var ImplicitConversion = Expression.extend({
    _name: "ImplicitConversion",
    i_childrenToExecute : ["from"],
    init: function(from, toType, valueCategory){
        assert(isA(toType, Type) && toType._isInstance);
        this.initParent(from.ast, {parent: from.parent});
        this.from = from;
        from.parent = this;
        this.type = toType;
        this.valueCategory = valueCategory;

        if (isA(from, ImplicitConversion)){
            this.conversionLength = from.conversionLength+1;
        }
        else{
            this.conversionLength = 1;
        }
    },

    compile : function(){
        this.compileTemporarires();
    },

    upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){

        if (inst.index == "subexpressions"){
            return Expression.upNext.apply(this, arguments);
        }
        else if (inst.index == "operate"){
        }
        return false;
    },

    stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        if(inst.index == "operate") {
            this.operate(sim, inst);
            this.done(sim, inst);
            return false;
        }
    },

    operate: Class._ABSTRACT,

    isTailChild : function(child){
        return {isTail: false,
            reason: "An implicit conversion (" + (this.englishName || this._name) + ") takes place after the function call returns."
        };
    }

});


var DoNothing = ImplicitConversion.extend({
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


export var LValueToRValue = ImplicitConversion.extend({
    _name: "LValueToRValue",
    init: function(from){
        assert(from.valueCategory === "lvalue" || from.valueCategory === "xvalue");
        var toType = (isA(from.type, Types.Class) ? from.type : from.type.cvUnqualified());
        this.initParent(from, toType, "prvalue");
    },

    operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        var evalValue = inst.childInstances.from.evalResult;
        // Note, we get the type from the evalValue to preserve RTTI

        inst.setEvalResult(readValueWithAlert(evalValue, sim, this.from, inst.childInstances.from));
    },

    upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        if(inst.index === "operate" && isA(this.from, Identifier) && this.from.entity === sim.endlEntity){
            this.stepForward(sim, inst);
            return true;
        }
        else{
            return LValueToRValue._parent.upNext.apply(this, arguments);
        }
    },

    describeEvalResult : function(depth, sim, inst){
        if (inst && inst.evalResult){
            return inst.evalResult.describe();
        }
        else if (depth == 0){
            return {message: "the value of " + this.getSourceText()};
        }
        else{
            return {message: "the value of " + this.from.describeEvalResult(depth-1,sim, inst && inst.childInstances && inst.childInstances.from).message};
        }
    },

    explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        return {message: "The value of " + this.from.describeEvalResult(0, sim, inst && inst.childInstances && inst.childInstances.from).message + " will be looked up."};
    }

});

export var ArrayToPointer = ImplicitConversion.extend({
    _name: "ArrayToPointer",
    init: function(from){
        assert(isA(from.type, Types.Array));
        this.initParent(from, Types.Pointer.instance(from.type.elemType), "prvalue");
    },

    operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        var arrObj = inst.childInstances.from.evalResult;
        inst.setEvalResult(Value.instance(arrObj.address, Types.ArrayPointer.instance(arrObj)));
    },

    explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        return {message: "In this case (and most others), using the name of an array in an expression will yield a the address of its first element. That's what happens here."};
    }
});



export var FunctionToPointer = ImplicitConversion.extend({
    _name: "FunctionToPointer",
    init: function(from){
        assert(isA(from.type, Types.Function));
        this.initParent(from, Types.Pointer.instance(from.type), "prvalue");
    },

    operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        var func = inst.childInstances.from.evalResult;
        inst.setEvalResult(Value.instance(func, this.type));
    },

    explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        return {message: "Using the name of a function in an expression will yield a pointer to that function."};
    }
});

// Type 2 Conversions
// Qualification conversions

export var QualificationConversion = ImplicitConversion.extend({
    _name: "QualificationConversion",
    init: function(from, toType){
        assert(from.valueCategory === "prvalue");
        this.initParent(from, toType, "prvalue");
    },

    operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        var evalValue = inst.childInstances.from.evalResult;
        inst.setEvalResult(evalValue.getValue());
    }
});

export var NullPointerConversion = DoNothing.extend({
    _name: "NullPointerConversion",
    init : function(from, to){
        assert(isA(from, Expressions.Literal));
        assert(isA(from.type, Types.Int));
        assert(from.value.rawValue() == 0);
        assert(from.valueCategory === "prvalue");
        this.initParent(from, to, "prvalue");
    },
    operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        inst.setEvalResult(Value.instance(0, this.type));
    }
});

export var PointerConversion = DoNothing.extend({
    _name: "PointerConversion",
    init : function(from, to){
        assert(from.valueCategory === "prvalue");
        this.initParent(from, to, "prvalue");
    }
});

export var PointerToBooleanConversion = ImplicitConversion.extend({
    _name: "PointerToBooleanConversion",
    init: function(from){
        assert(from.valueCategory === "prvalue");
        assert(isA(from.type, Types.Pointer));
        this.initParent(from, Types.Bool.instance(), "prvalue");
    },

    operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//        alert(this.from.type + ", "+  this.type);
        var val = inst.childInstances.from.evalResult.value;
        inst.setEvalResult(Value.instance(val != 0 ? true : false, this.type));
    }
});

export var FloatingPointPromotion = DoNothing.extend({
    _name: "FloatingPointPromotion",
    init : function(from){
        assert(isA(from.type, Types.Float));
        assert(from.valueCategory === "prvalue");
        this.initParent(from, Types.Double.instance(), "prvalue");
    }
});

export var IntegralConversion = ImplicitConversion.extend({
    _name: "IntegralConversion",
    init: function(from, toType){
        assert(from.valueCategory === "prvalue");
        assert(from.type.isIntegralType);
        assert(toType.isIntegralType);
        this.initParent(from, toType, "prvalue");
        this.englishName = from.type.englishString() + " to " + toType.englishString();
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


export var IntegralFloatingConversion = ImplicitConversion.extend({
    _name: "IntegralFloatingConversion",
    init: function(from, toType){
        assert(from.valueCategory === "prvalue");
        assert(from.type.isIntegralType);
        assert(toType.isFloatingPointType);
        this.initParent(from, toType, "prvalue");
    },

    operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        // I think only thing I really need here is to handle booleans gracefully
        // Adding 0.0 should do the trick.
        var val = inst.childInstances.from.evalResult.value;
        if (isA(this.from.type, Types.Bool)){ // bool to floating
            inst.setEvalResult(Value.instance(val ? 1.0 : 0.0, this.type));
        }
        else{
            inst.setEvalResult(Value.instance(val, this.type));
        }
    }
});

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

