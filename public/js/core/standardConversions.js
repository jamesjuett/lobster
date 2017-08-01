var Conversions = Lobster.Conversions = {};

var ImplicitConversion = Conversions.ImplicitConversion = Expression.extend({
    _name: "ImplicitConversion",
    init: function(from, toType, valueCategory){
        assert(isA(toType, Type) && toType._isInstance);
        this.initParent(from.ast, {parent: from.parent});
        this.from = this.sub.from = from;
        from.parent = this;
        this.type = toType;
        this.valueCategory = valueCategory;

        if (isA(from, Conversions.ImplicitConversion)){
            this.conversionLength = from.conversionLength+1;
        }
        else{
            this.conversionLength = 1;
        }
    },

    compile : function(){
        this.compileTemporarires();
    },

    upNext : function(sim, inst){

        if (inst.index == "subexpressions"){
            return Expression.upNext.apply(this, arguments);
        }
        else if (inst.index == "operate"){
        }
        return false;
    },

    stepForward : function(sim, inst){
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


Conversions.DoNothing = ImplicitConversion.extend({
    _name: "DoNothing",
    init: function(from, to, valueCategory){
        this.initParent(from, to, valueCategory);
    },

    operate : function(sim, inst){
        var evalValue = inst.childInstances.from.evalValue;
        // Note, we get the type from the evalValue to preserve RTTI
        inst.setEvalValue(Value.instance(evalValue.value, evalValue.type));
    }
});

// Type 1 Conversions
// LValueToRValue, ArrayToPointer, FunctionToPointer

var readValueWithAlert = function(evalValue, sim, expr, inst){
    if(!evalValue.isValueValid()){
        var msg = "The value you just got out of " + expr.describeEvalValue(0, sim, inst).message + " isn't valid. It might be uninitialized or it could have come from a dead object.";
        if (evalValue.rawValue() == 0){
            msg += "\n\n(Note: The value just happens to be zero. Don't be fooled! Uninitialized memory isn't guaranteed to be zero.)";
        }
        sim.alert(msg);
    }
    return evalValue.readValue();
};

Conversions.LValueToRValue = Conversions.ImplicitConversion.extend({
    _name: "LValueToRValue",
    init: function(from){
        assert(from.valueCategory === "lvalue" || from.valueCategory === "xvalue");
        var toType = (isA(from.type, Types.Class) ? from.type : from.type.cvUnqualified());
        this.initParent(from, toType, "prvalue");
    },

    operate : function(sim, inst){
        var evalValue = inst.childInstances.from.evalValue;
        // Note, we get the type from the evalValue to preserve RTTI

        inst.setEvalValue(readValueWithAlert(evalValue, sim, this.from, inst.childInstances.from));
    },

    upNext : function(sim, inst){
        if(inst.index === "operate" && isA(this.from, Identifier) && this.from.entity === sim.endlEntity){
            this.stepForward(sim, inst);
            return true;
        }
        else{
            return Conversions.LValueToRValue._parent.upNext.apply(this, arguments);
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

    explain : function(sim, inst){
        return {message: "The value of " + this.from.describeEvalValue(0, sim, inst && inst.childInstances && inst.childInstances.from).message + " will be looked up."};
    }

});

var ArrayToPointer = Conversions.ArrayToPointer = ImplicitConversion.extend({
    _name: "ArrayToPointer",
    init: function(from){
        assert(isA(from.type, Types.Array));
        this.initParent(from, Types.Pointer.instance(from.type.elemType), "prvalue");
    },

    operate : function(sim, inst){
        var arrObj = inst.childInstances.from.evalValue;
        inst.setEvalValue(Value.instance(arrObj.address, Types.ArrayPointer.instance(arrObj)));
    },

    explain : function(sim, inst){
        return {message: "In this case (and most others), using the name of an array in an expression will yield a the address of its first element. That's what happens here."};
    }
});



var FunctionToPointer = Conversions.FunctionToPointer = ImplicitConversion.extend({
    _name: "FunctionToPointer",
    init: function(from){
        assert(isA(from.type, Types.Function));
        this.initParent(from, Types.Pointer.instance(from.type), "prvalue");
    },

    operate : function(sim, inst){
        var func = inst.childInstances.from.evalValue;
        inst.setEvalValue(Value.instance(func, this.type));
    },

    explain : function(sim, inst){
        return {message: "Using the name of a function in an expression will yield a pointer to that function."};
    }
});

// Type 2 Conversions
// Qualification conversions

Conversions.QualificationConversion = Conversions.ImplicitConversion.extend({
    _name: "QualificationConversion",
    init: function(from, toType){
        assert(from.valueCategory === "prvalue");
        this.initParent(from, toType, "prvalue");
    },

    operate : function(sim, inst){
        var evalValue = inst.childInstances.from.evalValue;
        inst.setEvalValue(evalValue.getValue());
    }
});

Conversions.NullPointerConversion = Conversions.DoNothing.extend({
    _name: "NullPointerConversion",
    init : function(from, to){
        assert(isA(from, Expressions.Literal));
        assert(isA(from.type, Types.Int));
        assert(from.value.rawValue() == 0);
        assert(from.valueCategory === "prvalue");
        this.initParent(from, to, "prvalue");
    },
    operate : function(sim, inst){
        inst.setEvalValue(Value.instance(0, this.type));
    }
});

Conversions.PointerConversion = Conversions.DoNothing.extend({
    _name: "PointerConversion",
    init : function(from, to){
        assert(from.valueCategory === "prvalue");
        this.initParent(from, to, "prvalue");
    }
});

Conversions.PointerToBooleanConversion = ImplicitConversion.extend({
    _name: "PointerToBooleanConversion",
    init: function(from){
        assert(from.valueCategory === "prvalue");
        assert(isA(from.type, Types.Pointer));
        this.initParent(from, Types.Bool.instance(), "prvalue");
    },

    operate : function(sim, inst){
//        alert(this.from.type + ", "+  this.type);
        var val = inst.childInstances.from.evalValue.value;
        inst.setEvalValue(Value.instance(val != 0 ? true : false, this.type));
    }
});

Conversions.FloatingPointPromotion = Conversions.DoNothing.extend({
    _name: "FloatingPointPromotion",
    init : function(from){
        assert(isA(from.type, Types.Float));
        assert(from.valueCategory === "prvalue");
        this.initParent(from, Types.Double.instance(), "prvalue");
    }
});

Conversions.IntegralConversion = ImplicitConversion.extend({
    _name: "IntegralConversion",
    init: function(from, toType){
        assert(from.valueCategory === "prvalue");
        assert(from.type.isIntegralType);
        assert(toType.isIntegralType);
        this.initParent(from, toType, "prvalue");
        this.englishName = from.type.englishString() + " to " + toType.englishString();
    },

    operate : function(sim, inst){
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


Conversions.IntegralFloatingConversion = ImplicitConversion.extend({
    _name: "IntegralFloatingConversion",
    init: function(from, toType){
        assert(from.valueCategory === "prvalue");
        assert(from.type.isIntegralType);
        assert(toType.isFloatingPointType);
        this.initParent(from, toType, "prvalue");
    },

    operate : function(sim, inst){
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

Conversions.FloatingIntegralConversion = ImplicitConversion.extend({
    _name: "FloatingIntegralConversion",
    init: function(from, toType){
        assert(from.valueCategory === "prvalue");
        assert(from.type.isFloatingPointType);
        assert(toType.isIntegralType);
        this.initParent(from, toType, "prvalue");
    },

    operate : function(sim, inst){
        var val = inst.childInstances.from.evalValue.value;
        if (isA(this.type, Types.Bool)) {
            inst.setEvalValue(Value.instance(val != 0, this.type));
        }
        else{
            inst.setEvalValue(Value.instance(Math.trunc(val), this.type));
        }
    }
});


Conversions.StringToCStringConversion = ImplicitConversion.extend({
    _name: "StringToCStringConversion",
    init: function(from, toType){
        assert(from.valueCategory === "prvalue");
        assert(isA(from.type, Types.String));
        assert(isA(toType, Types.Array) && isA(toType.elemType, Types.Char));
        this.initParent(from, toType, "prvalue");
    },

    operate : function(sim, inst){
        // I think only thing I really need here is to handle booleans gracefully
        // Adding 0.0 should do the trick.
        var cstr = inst.childInstances.from.evalValue.value;
        inst.setEvalValue(Value.instance(cstr.split(""), Types.String));
    }
});

//var IntegralPromotion = Conversions.IntegralPromotion = ImplicitConversion.extend({
//    _name: "IntegralPromotion",
//    init: function(from){
//        // A prvalue of an integer type other than bool, char16_t, char32_t, or wchar_t
//        // whose integer conversion rank is less than the rank of int can be operateed to
//        // a prvalue of type int if int can represent all the values in the source type
//        this.initParent(from, Types.Pointer.instance(from.type.elemType), "prvalue");
//    },
//
//    operate : function(sim, inst){
//        var arrObj = inst.childInstances.from.evalValue.object;
//        inst.setEvalValue(Value.instance(arrObj.address, this.type));
//    }
//});



Conversions.IntegralPromotion = ImplicitConversion.extend({
    _name: "IntegralPromotion",
    init: function(from, toType){
        assert(from.valueCategory === "prvalue");
        assert(from.type.isIntegralType);
        assert(toType.isIntegralType);
        this.initParent(from, toType, "prvalue");
    },

    operate : function(sim, inst){
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

var standardConversion1 = function(from){

    // TODO function to pointer conversion

    // Don't do lvalue to rvalue conversion on Classes dude
    if (isA(from.type, Types.Class)){
        return from;
    }

    // array to pointer conversion
    if (isA(from.type, Types.Array)) {
        return Conversions.ArrayToPointer.instance(from);
    }

    if (isA(from.type, Types.Function)){
        return Conversions.FunctionToPointer.instance(from);
    }

    // lvalue to rvalue conversion
    if (from.valueCategory === "lvalue" || from.valueCategory === "xvalue"){
        return Conversions.LValueToRValue.instance(from);
    }

    return from;
};

var standardConversion2 = function(from, toType, options){

    if (sameType(from.type, toType)){
        return from;
    }

    if (isA(toType, Types.Pointer) && isA(from, Literal) && isA(from.type, Types.Int) && from.value.rawValue() == 0){
        return Conversions.NullPointerConversion.instance(from, toType);
    }

    if (isA(toType, Types.Pointer) && toType._isInstance){
        if (isA(from.type, Types.Pointer) && subType(from.type.ptrTo, toType.ptrTo)){
            toType = Types.Pointer.instance(toType.ptrTo.cvQualified(from.type.ptrTo.isConst, from.type.ptrTo.isVolatile), from.type.isConst, from.type.isVolatile);
            return Conversions.PointerConversion.instance(from, toType);
        }
    }

    if (isA(toType, Types.Double)){
        if (isA(from.type, Types.Float)){
            return Conversions.FloatingPointPromotion.instance(from);
        }
    }

    if (isA(toType, Types.Bool)){
        if (isA(from.type, Types.Pointer)){
            return Conversions.PointerToBooleanConversion.instance(from);
        }
    }

    if (toType.isFloatingPointType){
        if (from.type.isIntegralType){
            return Conversions.IntegralFloatingConversion.instance(from, toType);
        }
    }

    if (toType.isIntegralType){
        if (from.type.isIntegralType){
            return Conversions.IntegralConversion.instance(from, toType);
        }
        if (from.type.isFloatingPointType){
            return Conversions.FloatingIntegralConversion.instance(from, toType);
        }
    }


//    if (isA(from.type, Types.String) && isA(toType, Types.Array) && isA(toType.elemType, Types.Char)){
//        var originalFrom = from;
//        while (originalFrom.from){
//            originalFrom = originalFrom.from;
//        }
//        if(isA(originalFrom, Expressions.Literal)) {
//            return Conversions.StringToCStringConversion.instance(from, toType);
//        }
//    }

    return from;
};

var standardConversion3 = function(from, toType){

    if (sameType(from.type, toType)){
        return from;
    }

    if (from.valueCategory === "prvalue" && isCvConvertible(from.type, toType)){
        return Conversions.QualificationConversion.instance(from, toType);
    }

    return from;
};

var standardConversion = function(from, toType, options){
    options = options || {};

    if (!options.suppressLTR){
        from = standardConversion1(from, options);
    }
    from = standardConversion2(from, toType, options);
    from = standardConversion3(from, toType, options);
    return from;
};

var integralPromotion = function(expr){
    if (expr.type.isIntegralType && !isA(expr.type, Types.Int)) {
        return Conversions.IntegralPromotion.instance(expr, Types.Int.instance());
    }
    else{
        return expr;
    }
};

