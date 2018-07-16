import {Expression, readValueWithAlert} from "./expressions";
import {Type} from "./types";

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
        var evalValue = inst.childInstances.from.evalValue;
        // Note, we get the type from the evalValue to preserve RTTI
        inst.setEvalValue(Value.instance(evalValue.value, evalValue.type));
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
        var evalValue = inst.childInstances.from.evalValue;
        // Note, we get the type from the evalValue to preserve RTTI

        inst.setEvalValue(readValueWithAlert(evalValue, sim, this.from, inst.childInstances.from));
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

    describeEvalValue : function(depth, sim, inst){
        if (inst && inst.evalValue){
            return inst.evalValue.describe();
        }
        else if (depth == 0){
            return {message: "the value of " + this.getSourceText()};
        }
        else{
            return {message: "the value of " + this.from.describeEvalValue(depth-1,sim, inst && inst.childInstances && inst.childInstances.from).message};
        }
    },

    explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        return {message: "The value of " + this.from.describeEvalValue(0, sim, inst && inst.childInstances && inst.childInstances.from).message + " will be looked up."};
    }

});

export var ArrayToPointer = ImplicitConversion.extend({
    _name: "ArrayToPointer",
    init: function(from){
        assert(isA(from.type, Types.Array));
        this.initParent(from, Types.Pointer.instance(from.type.elemType), "prvalue");
    },

    operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        var arrObj = inst.childInstances.from.evalValue;
        inst.setEvalValue(Value.instance(arrObj.address, Types.ArrayPointer.instance(arrObj)));
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
        var func = inst.childInstances.from.evalValue;
        inst.setEvalValue(Value.instance(func, this.type));
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
        var evalValue = inst.childInstances.from.evalValue;
        inst.setEvalValue(evalValue.getValue());
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
        inst.setEvalValue(Value.instance(0, this.type));
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
        var val = inst.childInstances.from.evalValue.value;
        inst.setEvalValue(Value.instance(val != 0 ? true : false, this.type));
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
        var val = inst.childInstances.from.evalValue.value;
        if (isA(this.from.type, Types.Bool)){ // from bool
            inst.setEvalValue(Value.instance(val ? 1 : 0, this.type));
        }
        else if (isA(this.type, Types.Bool)){ // to bool
            inst.setEvalValue(Value.instance(val != 0 ? true : false, this.type));
        }
        else{
            inst.setEvalValue(Value.instance(val, this.type));
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
        var val = inst.childInstances.from.evalValue.value;
        if (isA(this.from.type, Types.Bool)){ // bool to floating
            inst.setEvalValue(Value.instance(val ? 1.0 : 0.0, this.type));
        }
        else{
            inst.setEvalValue(Value.instance(val, this.type));
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
        var val = inst.childInstances.from.evalValue.value;
        if (isA(this.type, Types.Bool)) {
            inst.setEvalValue(Value.instance(val != 0, this.type));
        }
        else{
            inst.setEvalValue(Value.instance(Math.trunc(val), this.type));
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
//         var cstr = inst.childInstances.from.evalValue.value;
//         inst.setEvalValue(Value.instance(cstr.split(""), Types.String));
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
//        var arrObj = inst.childInstances.from.evalValue.object;
//        inst.setEvalValue(Value.instance(arrObj.address, this.type));
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
        var val = inst.childInstances.from.evalValue.value;
        if (isA(this.from.type, Types.Bool)){ // from bool
            inst.setEvalValue(Value.instance(val ? 1 : 0, this.type));
        }
        else if (isA(this.type, Types.Bool)){ // to bool
            inst.setEvalValue(Value.instance(val != 0 ? true : false, this.type));
        }
        else{
            inst.setEvalValue(Value.instance(val, this.type));
        }
    }
});

// TODO: replace external uses of this function with a wrapper function that has a more meaningful name
export var standardConversion1 = function(from){

    // TODO function to pointer conversion

    // Don't do lvalue to rvalue conversion on Classes dude
    if (isA(from.type, Types.Class)){
        return from;
    }

    // array to pointer conversion
    if (isA(from.type, Types.Array)) {
        return ArrayToPointer.instance(from);
    }

    if (isA(from.type, Types.Function)){
        return FunctionToPointer.instance(from);
    }

    // lvalue to rvalue conversion
    if (from.valueCategory === "lvalue" || from.valueCategory === "xvalue"){
        return LValueToRValue.instance(from);
    }

    return from;
};

var standardConversion2 = function(from, toType, options){

    if (sameType(from.type, toType)){
        return from;
    }

    if (isA(toType, Types.Pointer) && isA(from, Literal) && isA(from.type, Types.Int) && from.value.rawValue() == 0){
        return NullPointerConversion.instance(from, toType);
    }

    if (isA(toType, Types.Pointer) && toType._isInstance){
        if (isA(from.type, Types.Pointer) && subType(from.type.ptrTo, toType.ptrTo)){
            toType = Types.Pointer.instance(toType.ptrTo.cvQualified(from.type.ptrTo.isConst, from.type.ptrTo.isVolatile), from.type.isConst, from.type.isVolatile);
            return PointerConversion.instance(from, toType);
        }
    }

    if (isA(toType, Types.Double)){
        if (isA(from.type, Types.Float)){
            return FloatingPointPromotion.instance(from);
        }
    }

    if (isA(toType, Types.Bool)){
        if (isA(from.type, Types.Pointer)){
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

export var standardConversion = function(from: Expression, toType: Type, options = {}){
    options = options || {};

    if (!options.suppressLTR){
        from = standardConversion1(from, options);
    }
    from = standardConversion2(from, toType, options);
    from = standardConversion3(from, toType, options);
    return from;
};

export var integralPromotion = function(expr){
    if (expr.type.isIntegralType && !isA(expr.type, Types.Int)) {
        return IntegralPromotion.instance(expr, Types.Int.instance());
    }
    else{
        return expr;
    }
};

