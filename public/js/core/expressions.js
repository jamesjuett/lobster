var Lobster = Lobster || {};

Lobster.Expressions = {
	
	createExpr : function(expr, context){
        if (isA(expr, EntityExpression)){
            return expr;
        }
        assert(context);
		// if (!this[expr.expression.toLowerCase()]){
			// alert(expr.expression.toLowerCase());
		// }
//        console.log("Creating expression " + expr.expression);
        var exprClass = this[expr.expression.toLowerCase()];
        exprClass = exprClass || Expressions.Unsupported;
        var expr = exprClass.instance(expr, context);
//        if (context && context.desiredType){
//            expr = standardConversion(expr, context.desiredType);
//        }
        return expr;
	}
	
};
var Expressions = Lobster.Expressions;

var VALUE_ID = 0;

var Value = Expressions.Value = Class.extend({
    _name: "Value",
    init: function(value, type, options){
        this.value = value;
        this.type = type;

        if(options && options.invalid){
            this._invalid = true;
        }
    },
    instanceString : function(){
        return this.valueString();
    },
    valueString : function(){
        return this.type.valueToString(this.value);
    },
    coutString : function(){
        return this.type.coutString(this.value);
    },
    getValue : function(){
        return this;
    },
    rawValue : function(){
        return this.value;
    },
    isValueValid : function(){
        return !this._invalid && this.type.isValueValid(this.value);
    },
    describe : function(){
        return {message: this.valueString()};
    }
});

var Expression = Expressions.Expression = CPPCode.extend({
    _name: "Expression",
    type: Types.Unknown.instance(),
    initIndex : "subexpressions",
    instType : "expr",
    conversionLength: 0,
    init: function(code, context){
        this.initParent(code, context);
        this.sub = {};
        this.originalSub = {};
    },
    compile : function(scope) {
        this.compileScope = scope;

        // Create and compile all subexpressions
        // Also attempt standard conversions specified in the subMetas

        for (var subName in this.subMetas) {
            var subMeta = this.subMetas[subName];
            var sub = this[subName] = this.sub[subName] = this.originalSub[subName] = Expressions.createExpr(this.code[subMeta.parsedName || subName], {parent: this});
            this.semanticProblems.pushAll(sub.compile(scope));

            if (subMeta.convertTo) {
                sub = this[subName] = this.sub[subName] = standardConversion(sub, subMeta.convertTo);
            }
            else if (subMeta.rvalue) {
                sub = this[subName] = this.sub[subName] = standardConversion1(sub);
            }
        }

        // If subexpressions have problems, just forget it :(
        if (this.semanticProblems.errors.length > 0) {
            return this.semanticProblems;
        }

        // Attempt custom conversions
        this.convert();

        // Type check
        this.typeCheck();

        this.compileTemporarires(scope);


        // if (this.isFullExpression()){
        //     this.semanticProblems.addWidget(ExpressionAnnotation.instance(this));
        // }

        return this.semanticProblems;
    },
    compileTemporarires : function(scope){
        if (this.temporaryObjects) {
            this.temporariesToDestruct = [];
            for (var entId in this.temporaryObjects){
                var tempEnt = this.temporaryObjects[entId];
                if (isA(tempEnt.type, Types.Class)){
                    var dest = tempEnt.type.getDestructor();
                    if (dest) {
                        var call = FunctionCall.instance(null, {parent: this, receiver: tempEnt});
                        this.i_compileChild(call, scope, dest, []);
                        this.temporariesToDestruct.push(call);
                    }
                    else{
                        this.semanticProblems.push(CPPError.decl.dtor.no_destructor_temporary(tempEnt.creator.model, tempEnt));
                    }
                }
            }

            this.tempDeallocator = Statements.TemporaryDeallocator.instance("", {parent: this}, this.temporaryObjects);
            this.i_compileChild(this.tempDeallocator);
        }
    },

    convert : function(){

    },
    typeCheck : function(){

    },
//    compileSubexpressions : function(scope){
//		this.subexpressionProblems = {};
//		for (var key in this.subexpressions){
//            var probs = this.subexpressions[key].compile(scope)
//			this.semanticProblems.pushAll(probs);
//			this.subexpressionProblems[key] = probs;
//		}
//	},

//    typeCheck : Class._ABSTRACT,



    processNonMemberOverload : function(args, op){
        try{
            var overloadedOp = this.compileScope.requiredLookup("operator"+op, {
                own:true, paramTypes:args.map(function(arg){return arg.type;})
            });
            this.funcCall = this.sub.funcCall = FunctionCall.instance(this.code, {parent:this});
            this.sub.funcCall.compile(this.compileScope, overloadedOp, args.map(function(arg){return arg.code;}));
            this.type = this.sub.funcCall.type;
            this.valueCategory = this.sub.funcCall.valueCategory;
            this.subSequence = this.overloadSubSequence;
        }
        catch(e){
            if (isA(e, SemanticExceptions.BadLookup)){
                this.semanticProblems.push(CPPError.expr.overloadLookup(this, op));
                this.semanticProblems.push(e.annotation(this));
                return this.semanticProblems;
            }
            else{
                throw e;
            }
        }
    },


    processMemberOverload : function(thisArg, args, op){
        try{
            var overloadedOp = thisArg.type.scope.requiredLookup("operator"+op, {
                own:true, paramTypes:args.map(function(arg){return arg.type;})
            });
            this.funcCall = this.sub.funcCall = FunctionCall.instance(this.code, {parent:this});
            this.sub.funcCall.compile(this.compileScope, overloadedOp, args.map(function(arg){return arg.code;}));
            this.type = this.sub.funcCall.type;
            this.valueCategory = this.sub.funcCall.valueCategory;
            this.subSequence = this.overloadSubSequence;
        }
        catch(e){
            if (isA(e, SemanticExceptions.BadLookup)){
                this.semanticProblems.push(CPPError.expr.overloadLookup(this, op));
                this.semanticProblems.push(e.annotation(this));
                return this.semanticProblems;
            }
            else{
                throw e;
            }
        }
    },




    upNext : function(sim, inst){
        // Evaluate subexpressions
        if (inst.index === "subexpressions"){
            this.pushChildInstances(sim, inst);
            inst.index = "operate";
            inst.wait();
            return true;
        }

        return CPPCode.upNext.apply(this, arguments);
    },
	
	done : function(sim, inst){
		sim.pop(inst);

        // Take care of any temporary objects owned by this expression
        // Push destructors after, because we want them to run first (its a stack)
        if (this.tempDeallocator){
            this.tempDeallocator.createAndPushInstance(sim, inst);
        }
        if(this.temporariesToDestruct){
            this.temporariesToDestruct.forEach(function(tempObj){
                tempObj.createAndPushInstance(sim, inst)
            });
        }

	},

    isTailChild : function(child){
        return {isTail: false};
    },

    createTemporaryObject : function(type, name){
        var tempObj = TemporaryObjectEntity.instance(type, this, this.findFullExpression(), name);
        //this.createdTemporaries = this.createdTemporaries || [];
        //this.createdTemporaries.push(tempObj);
        return tempObj;
    },

    addTemporaryObject : function(tempObj){
        this.temporaryObjects = this.temporaryObjects || {};
        this.temporaryObjects[tempObj.entityId] = tempObj;
    },

    removeTemporaryObject : function(tempObj){
        if (this.temporaryObjects){
            delete this.temporaryObjects[tempObj.entityId];
        }
    },

    isFullExpression : function(){

        // Special case - an auxiliary expression is always its own full expression.
        // e.g. We don't want temporaries from auxiliary expressions to sneak in!
        if (this.context.auxiliary){
            return true;
        }

        // Special case - initializer that is in context of declaration and does not require function call is not
        // considered an expression.
        // So if our parent is one of these, then we are the full expression!
        var parent = this.context.parent;
        if (isA(parent, Initializer) && (isA(parent.parent, Declaration) && !parent.makesFunctionCall)){
            return true;
        }

        return !isA(this.context.parent, Expression);
    },

    /**
     * Returns the nearest full expression containing this expression (possibly itself).
     * @param inst
     */
    findFullExpression : function(){
        if (this.isFullExpression()){
            return this;
        }
        else{
            return this.context.parent.findFullExpression();
        }
    },

    // TODO NEW It appears this was once used, but as far as I can tell, it does
    // nothing because it is only called once from the CPPCode constructor and
    // on the first call, it just delegates the work to the parent class version.
    // I've commented it out for now and will remove it later after regression
    // testing is more mature.
    // setContext : function(context){
    //     // Don't do anything special for first time
    //     if (!this.context.parent){
    //         CPPCode.setContext.apply(this, arguments);
    //         return;
    //     }
    //
    //     var oldFull = this.findFullExpression();
    //     CPPCode.setContext.apply(this, arguments);
    //
    //     // If this construct's containing full expression has changed, we need to reassign
    //     // that new full expression as the owner of any temporaries this construct would
    //     // have sent to its old full expression. We don't know which of the temporaries
    //     // from the old full expression those were (they could have come from elsewhere),
    //     // so we just update them all.
    //     var newFull = this.findFullExpression();
    //     if (oldFull !== newFull && oldFull.temporaryObjects){
    //         for(var id in oldFull.temporaryObjects){
    //             oldFull.temporaryObjects[id].updateOwner();
    //         }
    //     }
    // },
    isWellTyped : function(){
        return this.type && !isA(this.type, Types.Unknown);
    },
    describeEvalValue : function(depth, sim, inst){
        if (inst && inst.evalValue){
            return inst.evalValue.describe();
        }
        else if (depth == 0){
            return {message: "the result of " + this.code.text};
        }
        else{
            return {message: "the result of " + this.code.text};
        }
    }
});
//Object.defineProperty(Expression, "type", {
//    get : function() { return this._type; },
//    set : function(t) {
//        if (isA(t, Types.Reference)){
//            this._type = t.refTo;
//        }
//        else{
//            this._type = t;
//        }
//    }
//})

Expressions.Unsupported = Expression.extend({
    _name: "Unsupported",
    valueCategory: "prvalue",
    typeCheck : function(){
        this.semanticProblems.push(CPPError.expr.unsupported(this, this.englishName ? "(" + this.englishName + ")" : ""));
    }
});

Expressions.Null = Expression.extend({
    _name: "Null",
    valueCategory: "prvalue",
    createAndPushInstance : function(sim, inst){
//        var inst =  CPPCodeInstance.instance(sim, this, "subexpressions", "expr", inst);
//        sim.push(inst);
//        return inst;
    }
});

var Conversions = Lobster.Conversions = {};

var ImplicitConversion = Conversions.ImplicitConversion = Expression.extend({
    _name: "ImplicitConversion",
    init: function(from, toType, valueCategory){
        assert(isA(toType, Type) && toType._isInstance);
        this.initParent(from.code, {parent: from.parent});
        this.from = this.sub.from = from;
        from.parent = this;
        this.type = toType;
        this.valueCategory = valueCategory;

        if (isA(from), Conversions.ImplicitConversion){
            this.conversionLength = from.conversionLength+1;
        }
        else{
            this.conversionLength = 1;
        }
    },
//    compile : function(scope){
//
//        this.op = this.code.op;
//        this.operand = this.sub.operand = Expressions.createExpr(this.code.sub, {parent:this});
//
//        this.compileSubexpressions(scope);
//
//        return this.semanticProblems;
//    },
    compile : function(scope){
        this.compileTemporarires(scope);
        return this.semanticProblems;
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
            return {message: "the value of " + this.code.text};
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
        assert(from.type.isIntegral);
        assert(toType.isIntegral);
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
        assert(from.type.isIntegral);
        assert(toType.isFloatingPoint);
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
        assert(from.type.isFloatingPoint);
        assert(toType.isIntegral);
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
        assert(from.type.isIntegral);
        assert(toType.isIntegral);
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

    if (toType.isFloatingPoint){
        if (from.type.isIntegral){
            return Conversions.IntegralFloatingConversion.instance(from, toType);
        }
    }

    if (toType.isIntegral){
        if (from.type.isIntegral){
            return Conversions.IntegralConversion.instance(from, toType);
        }
        if (from.type.isFloatingPoint){
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
    if (expr.type.isIntegral && !isA(expr.type, Types.Int)) {
        return Conversions.IntegralPromotion.instance(expr, Types.Int.instance());
    }
    else{
        return expr;
    }
};


Expressions.Comma = Expression.extend({
    _name: "Comma",
    englishName: "comma",
    subMetas : {
        left: {},
        right: {}
    },
    subSequence : ["left", "right"],
    typeCheck : function(){
        this.type = this.sub.right.type;
        this.valueCategory = this.sub.right.valueCategory;
    },

    stepForward : function(sim, inst){

        // Evaluate subexpressions
        if (inst.index === "operate"){
            inst.setEvalValue(inst.childInstances.right.evalValue);
            this.done(sim, inst);
        }
    },

    isTailChild : function(child){
        if (child === this.sub.right){
            return {isTail: true,
                reason: "The recursive call is on the right side of the comma, so it is guaranteed to be evaluated last."
            };
        }
        else{
            return {isTail: false,
                reason: "The expression on the right of the comma will be evaluated after the recursive call.",
                others: [this.sub.right]
            };
        }
    }
});


Expressions.Ternary = Expression.extend({
    _name: "Ternary",
    englishName: "ternary",
    subMetas : {
        _if: {convertTo: Types.Bool.instance()},
        then: {},
        _else: {}
    },
    initIndex: "cond",

    convert : function(){
        var sub = this.sub;

        // If one of the expressions is a prvalue, make the other one as well
        if (sub.then.valueCategory === "prvalue" && sub._else.valueCategory === "lvalue"){
            this._else = sub._else = standardConversion1(sub._else);
        }

        if (sub._else.valueCategory === "prvalue" && sub.then.valueCategory === "lvalue"){
            this.then = sub.then = standardConversion1(sub.then);
        }
    },

    typeCheck : function(){
        var sub = this.sub;

        if (!isA(sub._if.type, Types.Bool)){
            this.semanticProblems.push(CPPError.expr.ternary.cond_bool(sub._if, sub._if.type));
        }
        if (!sameType(sub.then.type, sub._else.type)) {
            this.semanticProblems.push(CPPError.expr.ternary.sameType(this, this.then, this._else));
        }
        if (isA(sub.then.type, Types.Void) || isA(sub._else.type, Types.Void)) {
            this.semanticProblems.push(CPPError.expr.ternary.noVoid(this, this.then, this._else));
        }
        if (sub.then.valueCategory !== sub._else.valueCategory){
            this.semanticProblems.push(CPPError.expr.ternary.sameValueCategory(this));
        }

        this.type = this.then.type;
        this.valueCategory = this.then.valueCategory;
    },

    upNext : function(sim, inst){
        if (inst.index === "cond"){
            inst._if = this.sub._if.createAndPushInstance(sim, inst);
            inst.index = "checkCond";
            return true;
        }
        else if (inst.index === "checkCond"){
            if(inst._if.evalValue.value){
                inst.then = this.sub.then.createAndPushInstance(sim, inst);
            }
            else{
                inst._else = this.sub._else.createAndPushInstance(sim, inst);
            }
            inst.index = "operate";
            return true;
        }
    },

    stepForward : function(sim, inst){

        // Evaluate subexpressions
        if (inst.index === "operate"){
            inst.setEvalValue(inst._if.evalValue.value ? inst.then.evalValue : inst._else.evalValue);
            this.done(sim, inst);
        }
    },

    isTailChild : function(child){
        if (child === this.sub._if){
            return {isTail: false,
                reason: "One of the two subexpressions in the ternary operator will be evaluated after the function call.",
                others: [this.sub.then, this.sub._else]
            };
        }
        else{
            return {isTail: true};
        }
    }
});


var Assignment = Expressions.Assignment = Expression.extend({
    _name: "Assignment",
    valueCategory : "lvalue",
    subMetas : {
        lhs: {}
    },
    subSequence : ["lhs", "rhs"],
    overloadSubSequence : ["lhs", "funcCall"], // does not include rhs because function call does that
    convert : function(){

        if (!this.lhs.isWellTyped()){
            return this.semanticProblems;
        }

        // Check for overloaded assignment
        // NOTE: don't have to worry about lhs reference type because it will have been adjusted to non-reference
        if (isA(this.lhs.type, Types.Class)){
            //var assnOp = this.lhs.type.memberMap["operator="];
            var auxRhs = Expressions.createExpr(this.code.rhs, {parent: this, auxiliary: true});
            auxRhs.compile(this.compileScope);

            try{
                var assnOp = this.lhs.type.scope.requiredLookup("operator=", {
                    own:true, paramTypes:[auxRhs.type]
                });
            }
            catch(e){
                if (isA(e, SemanticExceptions.BadLookup)){
                    this.semanticProblems.push(CPPError.expr.overloadLookup(this, "="));
                    this.semanticProblems.push(e.annotation(this));
                    return this.semanticProblems;
                }
                else{
                    throw e;
                }
            }

            if (assnOp){
                this.funcCall = this.sub.funcCall = FunctionCall.instance(this.code, {parent:this});
                this.sub.funcCall.compile(this.compileScope, assnOp, [this.code.rhs]);
                this.type = this.sub.funcCall.type;
                this.subSequence = this.overloadSubSequence;
            }
            else{
                this.semanticProblems.push(CPPError.expr.assignment.not_defined(this, this.lhs.type));
            }
        }
        else{
            //Non-class type
            // Attempt standard conversion of rhs to match cv-unqualified type of lhs, including lvalue to rvalue
            this.rhs = this.sub.rhs = this.createAndCompileChildExpr(this.code.rhs, this.compileScope, this.lhs.type.cvUnqualified());
        }
    },
    typeCheck : function(){

        if (!this.lhs.isWellTyped()){
            return this.semanticProblems;
        }

        // All type checking is handled by the function call child it's overloaded.
        if (this.funcCall){
            return;
        }

        // Type Check
        if (this.lhs.valueCategory != "lvalue") {
            this.semanticProblems.push(CPPError.expr.assignment.lhs_lvalue(this));
        }

        if (this.lhs.type.isConst) {
            this.semanticProblems.push(CPPError.expr.assignment.lhs_const(this));
        }

        // Checking for non overloaded cases where we have an rhs
        if (this.rhs){

            if (!this.rhs.isWellTyped()){
                return this.semanticProblems;
            }

            //If non-class type, check against cv-unqualified version of lhs type
            if (!isA(this.lhs.type, Types.Class)){
                if (!sameType(this.rhs.type, this.lhs.type.cvUnqualified())) {
                    this.semanticProblems.push(CPPError.expr.assignment.convert(this, this.lhs, this.rhs));
                }
            }
            else{
                // Checking is done by function call child :)
            }

            // Just for fun
            if (isA(this.lhs, Identifier) && isA(this.rhs, Identifier) && this.lhs.entity === this.rhs.entity){
                this.semanticProblems.push(CPPError.expr.assignment.self(this, this.lhs.entity));
            }
        }



        this.type = this.lhs.type;
    },

    upNext : Class.ADDITIONALLY(function(sim, inst){
        if (this.sub.funcCall){
            this.sub.funcCall.setReceiver(sim, inst.childInstances.funcCall, RuntimeEntity.instance(this.lhs.type, inst.childInstances.lhs));
        }
    }),

    stepForward : function(sim, inst){

        if (inst.index == "operate"){

            if (this.sub.funcCall){
                // Assignment operator function call has already taken care of the "assignment".
                // Just evaluate to returned value from assignment operator.
                inst.setEvalValue(inst.childInstances.funcCall.evalValue);
                this.done(sim, inst);
                //return true;
            }
            else{
                // lhs and rhs are already evaluated
                // result of lhs should be an lvalue
                var lhs = inst.childInstances.lhs.evalValue;
                var rhs = inst.childInstances.rhs.evalValue;

                lhs.writeValue(rhs);

                inst.setEvalValue(lhs);
                this.done(sim, inst);
            }
        }
    },

    isTailChild : function(child){
        return {isTail: false,
            reason: "The assignment itself will happen after the recursive call returns.",
            others: [this]
        };
    },

    explain : function(sim, inst){
        var lhs = this.lhs.describeEvalValue(0, sim, inst && inst.childInstances && inst.childInstances.lhs);
        var rhs = this.rhs.describeEvalValue(0, sim, inst && inst.childInstances && inst.childInstances.rhs);
        return {message: (rhs.name || rhs.message) + " will be assigned to " + (lhs.name || lhs.message) + "."};
    }
});

var beneathConversions = function(expr){
    while(isA(expr, Conversions.ImplicitConversion)){
        expr = expr.from;
    }
    return expr;
};

Expressions.CompoundAssignment = Expression.extend({
    _name: "CompoundAssignment",
    valueCategory : "lvalue",
    subMetas : {
//        left : {},
//        right : {}
    },
    init: function(code, context){
        this.initParent(code, context);
        this.op = this.code.op;
        var binCode = copyMixin(this.code, {
            left: this.code.lhs,
            right: this.code.rhs,
            operator: this.op.substring(0, this.op.length-1)
        });
        var binaryOpClass = BINARY_OPS[this.op.substring(0, this.op.length-1)];
        this.rhs = binaryOpClass.instance(binCode, {parent: this});
    },

    compile : function(scope) {

        //compiles left and right
        this.semanticProblems.pushAll(this.rhs.compile(scope));

        if(this.semanticProblems.errors.length > 0){
            return this.semanticProblems;
        }


        // left should be a standard conversion sequence
        // we want to extract the pre-conversion expression for lhs
        this.lhs = beneathConversions(this.rhs.left);

        // Attempt to convert rhs (a binary operation) back to type of lhs
        this.rhs = standardConversion(this.rhs, this.lhs.type);

        // Type Check
        if (this.lhs.valueCategory !== "lvalue") {
            this.semanticProblems.push(CPPError.expr.assignment.lhs_lvalue(this));
        }

        if (!sameType(this.rhs.type, this.lhs.type)) {
            this.semanticProblems.push(CPPError.expr.assignment.convert(this, this.lhs, this.rhs));
        }

        this.type = this.lhs.type;

        this.compileTemporarires(scope);
//        return Expression.compile.call(this, scope);
        return this.semanticProblems;
    },

    upNext : function(sim, inst){
        // Evaluate subexpressions
        if (inst.index == "subexpressions") {
            inst.rhs = this.rhs.createAndPushInstance(sim, inst);
            //inst.leftInst = CPPCodeInstance.instance(sim, this.rhs.left, "subexpressions", "expr", inst);
            //inst.rightInst = CPPCodeInstance.instance(sim, this.rhs.right, "subexpressions", "expr", inst);
            //
            //// Push rhs
            //sim.push(inst.leftInst);
            //sim.push(inst.rightInst);

            inst.index = "operate";
            return true;
        }
    },

    stepForward : function(sim, inst){
        if (inst.index === "operate"){
            // extract lvalue on lhs that may be underneath a standard conversion sequence
            // note: this is only applicable in compound assignment. in regular lhs will never be converted
            var findLhs = inst.rhs;
            while(isA(findLhs.model, ImplicitConversion)){
                findLhs = findLhs.childInstances.from; // strip conversions off result of binary op
            }
            findLhs = findLhs.childInstances.left; // go to left argument of binary op
            while(isA(findLhs.model, ImplicitConversion)){
                findLhs = findLhs.childInstances.from; // strip conversions off left operand
            }

            var lhs = findLhs.evalValue;
            var rhs = inst.rhs.evalValue;

            lhs.writeValue(rhs);

            inst.setEvalValue(lhs);
            this.done(sim, inst);
        }
    },

    isTailChild : function(child){
        return {isTail: false,
            reason: "The compound assignment itself will happen after the recursive call returns.",
            others: [this]
        };
    }
});

var usualArithmeticConversions = function(){
    // Only do conversions if both are arithmetic
    if (!this.left.type.isArithmetic || !this.right.type.isArithmetic){
        return;
    }

    // TODO If either has scoped enumeration type, no conversions are performed

    // TODO If either is long double, the other shall be converted to long double

    // If either is double, the other shall be converted to double
    if (isA(this.left.type, Types.Double)){
        this.right = this.sub.right = standardConversion(this.right, Types.Double.instance(), {suppressLTR:true});
        return;
    }
    if (isA(this.right.type, Types.Double)){
        this.left = this.sub.left = standardConversion(this.left, Types.Double.instance(), {suppressLTR:true});
        return;
    }
    // If either is float, the other shall be converted to float

    if (isA(this.left.type, Types.Float)){
        this.right = this.sub.right = standardConversion(this.right, Types.Float.instance(), {suppressLTR:true});
        return;
    }
    if (isA(this.right.type, Types.Float)){
        this.left = this.sub.left = standardConversion(this.left, Types.Float.instance(), {suppressLTR:true});
        return;
    }

    // Otherwise, do integral promotions
    this.left = this.sub.left = integralPromotion(this.left);
    this.right = this.sub.right = integralPromotion(this.right);

//    var operands = integralPromotions({left:this.left, right:this.right});
//    this.left = this.sub.left = operands.left;
//    this.right = this.sub.right = operands.right;

    // If both operands have the same type, no further conversion is needed
    if (sameType(this.left.type, this.right.type)){
        return;
    }

    // Otherwise, if both operands have signed or both have unsigned types,
    // operand with type of lesser integer conversion rank shall be converted
    // to the type of the operand with greater rank
};


var BinaryOp = Expressions.BinaryOp = Expression.extend({
    _name: "BinaryOp",
    valueCategory : "prvalue",
    subMetas : {
        left: {},
        right: {}
    },
    subSequence : ["left", "right"],
    memberOverloadSubSequence : ["left", "funcCall"], // does not include rhs because function call does that
    overloadSubSequence : ["funcCall"], // does not include rhs because function call does that
    init: function(code, context){
        this.initParent(code, context);
        this.associativity = this.code.associativity;
        this.op = this.code.operator;
    },
    instance: function(code, context) {
        if (this !== Expressions.BinaryOp){
            return Expressions.BinaryOp._parent.instance.apply(this, arguments);
        }
        var desiredSubClass = BINARY_OPS[code.operator];
        return desiredSubClass.instance(code, context);
    },

    compile : function(scope){

        // Compile left
        var auxLeft = Expressions.createExpr(this.code.left, {parent: this, auxiliary: true});
        var auxRight = Expressions.createExpr(this.code.right, {parent: this, auxiliary: true});

        auxLeft.compile(scope);
        auxRight.compile(scope);

        // If either has problems that prevent us from determining type, nothing more can be done
        if (!auxLeft.isWellTyped() || !auxRight.isWellTyped()){
            this.semanticProblems.pushAll(auxLeft.semanticProblems);
            this.semanticProblems.pushAll(auxRight.semanticProblems);
            return this.semanticProblems;
        }

        if (isA(auxLeft.type, Types.Class) || isA(auxRight.type, Types.Class)){
            // If left one is of class type, we look for overloads
            var overloadOp =
                auxLeft.type.scope && auxLeft.type.scope.singleLookup("operator" + this.op, {
                    own:true, paramTypes:[auxRight.type]
                }) ||
                scope.singleLookup("operator" + this.op, {
                    paramTypes:[auxLeft.type, auxRight.type]
                });
            this.isMemberOverload = isA(overloadOp, MemberFunctionEntity);
            if (overloadOp){
                this.funcCall = this.sub.funcCall = FunctionCall.instance(this.code, {parent:this});
                if (this.isMemberOverload){
                    this.left = this.sub.left = this.createAndCompileChildExpr(this.code.left, scope);
                    this.sub.funcCall.compile(scope, overloadOp, [this.code.right]);
                    this.subSequence = this.memberOverloadSubSequence;
                }
                else{
                    this.sub.funcCall.compile(scope, overloadOp, [this.code.left, this.code.right]);
                    this.subSequence = this.overloadSubSequence;
                }
                this.type = this.sub.funcCall.type;
                this.valueCategory = this.sub.funcCall.valueCategory;
            }
            else{
                this.semanticProblems.push(CPPError.expr.binary.overload_not_found(this, this.op, auxLeft.type, auxRight.type));
            }
        }
        else{
            this.left = this.sub.left = this.createAndCompileChildExpr(this.code.left, scope);
            this.right = this.sub.right = this.createAndCompileChildExpr(this.code.right, scope);

            // If either has problems that prevent us from determining type, nothing more can be done
            if (!this.left.isWellTyped() || !this.right.isWellTyped()){
                this.semanticProblems.pushAll(this.left.semanticProblems);
                this.semanticProblems.pushAll(this.right.semanticProblems);
                return this.semanticProblems;
            }

            this.convert();

            this.typeCheck();
            this.compileTemporarires(scope);
        }
        return this.semanticProblems;
    },

    usualArithmeticConversions : function(){

        return usualArithmeticConversions.apply(this);

    },

    convert : function(){
        this.left = this.sub.left = standardConversion1(this.left);
        this.right = this.sub.right = standardConversion1(this.right);

        if (this.left.type.isArithmetic && this.right.type.isArithmetic) { // Regular arithmetic
            this.usualArithmeticConversions();
            // After usual arithmetic conversions they should be the same type
        }
    },

    // Default typecheck assumes the operands should be the same type
    typeCheck : function(){
        if (sameType(this.left.type, this.right.type)){
            if (!this.requiresArithmeticOperands || this.left.type.isArithmetic && this.right.type.isArithmetic){
                if(!this.type || isA(this.type, Types.Unknown)){
                    this.type = this.left.type;
                }
                return true;
            }
        }

        this.semanticProblems.push(CPPError.expr.invalid_binary_operands(this, this.op, this.left, this.right));
        return false;
    },

    upNext : function(sim, inst){
        // Push lhs, rhs, and function call (if lhs class type)
        var toReturn = Expression.upNext.apply(this, arguments);

        // If using an overloaded member operator, set receiver for function call instance
        if (this.sub.funcCall && this.isMemberOverload){
            this.sub.funcCall.setReceiver(sim, inst.childInstances.funcCall, RuntimeEntity.instance(this.left.type, inst.childInstances.left));
        }

        return toReturn;
    },

	stepForward : function(sim, inst){
        if (inst.index === "operate"){
            if (this.sub.funcCall){
                // Assignment operator function call has already taken care of the "assignment".
                // Just evaluate to returned value from assignment operator.
                inst.setEvalValue(inst.childInstances.funcCall.evalValue);
                this.done(sim, inst);
                //return true;
            }

            else{
                var result = this.operate(inst.childInstances.left.evalValue, inst.childInstances.right.evalValue, sim, inst);
                if (result) {
                    inst.setEvalValue(result);
                }
                this.done(sim, inst);
            }
        }
	},

    isTailChild : function(child){
        return {isTail: false,
            reason: "The " + this.op + " operation will happen after the recursive call.",
            others: [this]
        };
    }
});

// TODO cv-combined types and composite pointer types

Expressions.BinaryOpRelational = Expressions.BinaryOp.extend({
    _name: "BinaryOpRelational",
    type: Types.Bool.instance(),

    convert : function(){
        Expressions.BinaryOp.convert.apply(this);

        if (isA(this.left.type, Types.Pointer) && isA(this.right, Literal) && isA(this.right.type, Types.Int) && this.right.value.rawValue() == 0){
            this.right = this.sub.right = Conversions.NullPointerConversion.instance(this.right, this.left.type);
        }
        if (isA(this.right.type, Types.Pointer) && isA(this.left, Literal) && isA(this.left.type, Types.Int) && this.left.value.rawValue() == 0){
            this.left = this.sub.left = Conversions.NullPointerConversion.instance(this.left, this.right.type);
        }
    },

    typeCheck : function(){

        if (isA(this.left.type, Types.Pointer)){
            if (!isA(this.right.type, Types.Pointer)){
                // TODO this is a hack until I implement functions to determine cv-combined type and composite pointer types
                this.semanticProblems.push(CPPError.expr.invalid_binary_operands(this, this.op, this.left, this.right));
                return false;
            }
        }
        else if (!Expressions.BinaryOp.typeCheck.apply(this)){
            return false;
        }

        if (this.overloadOp){
            return true;
        }
        // after first if, we know left and right have same type
        else if(this.left.type.isArithmetic){
            return true;
        }
        else if (isA(this.left.type, Types.String)){
            this.isStringComparison = true;
            return true;
        }
        else if(isA(this.left.type, Types.Pointer)){
            this.isPointerComparision = true;
            return true;
        }
        else{
            this.semanticProblems.push(CPPError.expr.invalid_binary_operands(this, this.op, this.left, this.right));
        }
    },

    operate : function(left, right, sim, inst){
        if (this.isPointerComparision) {
            if (!this.allowDiffArrayPointers && (!isA(left.type, Types.ArrayPointer) || !isA(right.type, Types.ArrayPointer) || left.type.arrObj !== right.type.arrObj)){
                sim.alert("It looks like you're trying to see which pointer comes before/after in memory, but this only makes sense if both pointers come from the same array. I don't think that's the case here.");
            }
            return Value.instance(this.compare(left.value, right.value), this.type); // TODO match C++ arithmetic
        }
        else{
            return Value.instance(this.compare(left.value, right.value), this.type); // TODO match C++ arithmetic
        }
    }
});


Expressions.BinaryOpLogical = Expressions.BinaryOp.extend({
    _name: "BinaryOpLogical",
    type: Types.Bool.instance(),
    //subMetas: {
    //    left: {convertTo : Types.Bool.instance()},
    //    right: {convertTo : Types.Bool.instance()}
    //},

    convert : function(){
        // Don't do binary operator custom conversions
        this.left = this.sub.left = standardConversion(this.sub.left, Types.Bool.instance());
        this.right = this.sub.right = standardConversion(this.sub.right, Types.Bool.instance());
    },
    typeCheck : function(){
        if (!Expressions.BinaryOp.typeCheck.apply(this)){
            return false;
        }
        else if(isA(this.left.type, Types.Bool)){
            return true;
        }
        else{
            this.semanticProblems.push(CPPError.expr.invalid_binary_operands(this, this.op, this.left, this.right));
        }
    },
    upNext : function(sim, inst){
        // Override this to prevent general pushSubexpressions
        // and ensure that short circuit is done correctly.
        if (this.sub.funcCall){
            return Expressions.BinaryOp.upNext.apply(this, arguments);
        }

        if (inst.index === "subexpressions") {
            inst.childInstances = {};
            inst.childInstances.left = this.sub.left.createAndPushInstance(sim, inst);
            inst.send("wait", 1);
            inst.index = "subexpressions2";
            return true;
        }
        else if (inst.index === "subexpressions2"){
            if(inst.childInstances.left.evalValue.value == this.shortCircuitValue){
                inst.index = "shortCircuit";
                return false;
            }
            else {
                inst.childInstances.right = this.sub.right.createAndPushInstance(sim, inst);
                inst.send("wait", 1);
                inst.index = "operate";
                return true;
            }
        }
        return false;
    },
    stepForward : function(sim, inst){
        if (inst.index == "operate") {
            return Expressions.BinaryOp.stepForward.apply(this, arguments);
        }
        else{ // "shortCirucit"
            inst.setEvalValue(inst.childInstances.left.evalValue);
            this.done(sim, inst);
        }
    },
    operate : function(left, right, sim, inst){
        return Value.instance(this.combine(left.value, right.value), this.type); // TODO match C++ arithmetic
    },

    isTailChild : function(child){
        if (child === this.sub.left){
            return {isTail: false,
                reason: "The right operand of the " + this.op + " operator may need to be checked if it does not short circuit.",
                others: [this.sub.right]
            };
        }
        else{
            return {isTail: true,
                reason: "Because the " + this.op + " operator short circuits, the right operand is guaranteed to be evaluated last and its result is used directly (no combination with left side needed)."
            };
        }
    }


});


var BINARY_OPS = Expressions.BINARY_OPS = {
    "|" : Expressions.Unsupported.extend({
        _name: "BinaryOp[|]",
        englishName: "bitwise or"
    }),
    "&" : Expressions.Unsupported.extend({
        _name: "BinaryOp[&]",
        englishName: "bitwise and"
    }),
    "^" : Expressions.Unsupported.extend({
        _name: "BinaryOp[^]",
        englishName: "bitwise xor"
    }),
    "||": Expressions.BinaryOpLogical.extend({
        _name: "BinaryOp[||]",
        shortCircuitValue: true,
        combine : function(left, right){
            return left || right;
        }
    }),
    "&&": Expressions.BinaryOpLogical.extend({
        _name: "BinaryOp[&&]",
        shortCircuitValue: false,
        combine : function(left, right){
            return left && right;
        }
    }),
    "+": Expressions.BinaryOp.extend({
        _name: "BinaryOp[+]",

        typeCheck : function(){
            // Check if it's pointer arithmetic
            if (isA(this.left.type, Types.Pointer) || isA(this.right.type, Types.Pointer)) {
                if (isA(this.right.type, Types.Pointer)){
                    // Switch so left operand is always the pointer
                    var temp = this.left;
                    this.left = this.right;
                    this.right = temp;

                    this.sub.left = this.left;
                    this.sub.right = this.right;
                }

                if (this.right.type.isIntegral || this.right.type.isEnum){
                    this.type = this.left.type;
                    this.isPointerArithmetic = true;
                    this.type = this.left.type;
                    return true;
                }
            }
//            else if(!Expressions.BinaryOp.typeCheck.apply(this)){
//                return false;
//            }
            else if(this.left.type.isArithmetic && this.right.type.isArithmetic){
                this.type = this.left.type;
                return true;
            }

            this.semanticProblems.push(CPPError.expr.invalid_binary_operands(this, this.op, this.left, this.right));
        },

        operate : function(left, right, sim, inst){
            if (this.isPointerArithmetic) {
                // Can assume pointer is always on left
                var result = Value.instance(left.value + right.value * this.left.type.ptrTo.size, left.type);
                if (isA(left.type, Types.ArrayPointer)){
                    // Check that we haven't run off the array
                    if (result.value < result.type.min()){
                        //sim.alert("Oops. That pointer just wandered off the beginning of its array.");
                    }
                    else if (result.type.onePast() < result.value){
                        //sim.alert("Oops. That pointer just wandered off the end of its array.");
                    }

                    return result;
                }
                else{
                    // If the RTTI works well enough, this should always be unsafe
                    sim.alert("Uh, I don't think you're supposed to do arithmetic with that pointer. It's not pointing into an array.");
                    return result;
                }
            }
            else{
                return Value.instance(left.value + right.value, this.left.type, {invalid: !left.isValueValid() || !right.isValueValid }); // TODO match C++ arithmetic
            }
        }
    }),

    "-": Expressions.BinaryOp.extend({
        _name: "BinaryOp[-]",

        typeCheck : function(){

            // Check if it's pointer arithmetic
            if (isA(this.left.type, Types.Pointer) && isA(this.right.type, Types.Pointer) && similarType(this.left.type, this.right.type)) {
                this.type = Types.Int.instance();
                this.valueCategory = "prvalue";
                this.isPointerArithmetic = true;
                return true;
            }
            else if (isA(this.left.type, Types.Pointer) && this.right.type.isIntegral) {
                this.type = this.left.type;
                this.valueCategory = "prvalue";
                this.isPointerArithmetic = true;
                return true;
            }
            else if(!Expressions.BinaryOp.typeCheck.apply(this)){
                return false;
            }
            else if(this.left.type.isArithmetic && this.right.type.isArithmetic){
                return true;
            }

            this.semanticProblems.push(CPPError.expr.invalid_binary_operands(this, this.op, this.left, this.right));
        },

        operate : function(left, right, sim, inst){
            if (this.isPointerArithmetic) {
                if (this.right.type.isIntegral){
                    // pointer - integral
                    var result = Value.instance(left.value - right.value * this.left.type.ptrTo.size, left.type);
                    if (isA(left.type, Types.ArrayPointer)){
                        // Check that we haven't run off the array
                        if (result.value < result.type.min()){
                            //sim.alert("Oops. That pointer just wandered off the beginning of its array.");
                        }
                        else if (result.type.onePast() < result.value){
                            //sim.alert("Oops. That pointer just wandered off the end of its array.");
                        }
                    }
                    else{
                        // If the RTTI works well enough, this should always be unsafe
                        sim.alert("Uh, I don't think you're supposed to do arithmetic with that pointer. It's not pointing into an array.");
                    }
                    return result;
                }
                else{
                    // pointer - pointer
                    if (left.value == right.value){
                        // If it's the same address, I guess we can let it slide...
                    }
                    else if (isA(left.type, Types.ArrayPointer) && isA(right.type, Types.ArrayPointer)){
                        // Make sure they're both from the same array
                        if (left.type.arrObj !== right.type.arrObj){
                            sim.alert("Egad! Those pointers are pointing into two different arrays! Why are you subtracting them?");
                        }
                    }
                    else{
                        // If the RTTI works well enough, this should always be unsafe
                        sim.alert("Hm, I can't verify both of these pointers are from the same array. You probably shouldn't be subtracting them.");
                    }
                    return Value.instance((left.value - right.value) / this.left.type.ptrTo.size, Types.Int.instance());
                }
            }
            else{
                return Value.instance(left.value - right.value, this.left.type); // TODO match C++ arithmetic
            }
        }


    }),
    "*": Expressions.BinaryOp.extend({
        _name: "BinaryOp[*]",
        requiresArithmeticOperands : true,

        operate : function(left, right, sim, inst){
            return Value.instance(left.value * right.value, this.left.type); // TODO match C++ arithmetic
        }

    }),
    "/": Expressions.BinaryOp.extend({
        _name: "BinaryOp[/]",
        requiresArithmeticOperands : true,

        operate : function(left, right, sim, inst){
            if (this.left.type.isIntegral){
                return Value.instance(integerDivision(left.value, right.value), this.left.type); // TODO match C++ arithmetic
            }
            else{
                return Value.instance(floatingDivision(left.value, right.value), this.left.type); // TODO match C++ arithmetic
            }

        }

    }),
    "%": Expressions.BinaryOp.extend({
        _name: "BinaryOp[%]",
        requiresArithmeticOperands : true,

        typeCheck : function(){
            if (!Expressions.BinaryOp.typeCheck.apply(this)){
                return false;
            }
            else if(this.left.type.isIntegral && this.right.type.isIntegral){
                return true;
            }
            else{
                this.semanticProblems.push(CPPError.expr.invalid_binary_operands(this, this.op, this.left, this.right));
            }
        },

        operate : function(left, right, sim, inst){
            return Value.instance(modulo(left.value, right.value), this.left.type); // TODO match C++ arithmetic
        }

    }),
    "<": Expressions.BinaryOpRelational.extend({
        _name: "BinaryOp[<]",
        compare : function(left, right){
            return left < right;
        }

    }),
    "==": Expressions.BinaryOpRelational.extend({
        _name: "BinaryOp[==]",
        allowDiffArrayPointers: true,
        compare : function(left, right){
            return left == right;
        }

    }),
    "!=": Expressions.BinaryOpRelational.extend({
        _name: "BinaryOp[!=]",
        allowDiffArrayPointers: true,
        compare : function(left, right){
            return left != right;
        }

    }),
    ">": Expressions.BinaryOpRelational.extend({
        _name: "BinaryOp[>]",
        compare : function(left, right){
            return left > right;
        }

    }),
    "<=": Expressions.BinaryOpRelational.extend({
        _name: "BinaryOp[<=]",
        compare : function(left, right){
            return left <= right;
        }

    }),
    ">=": Expressions.BinaryOpRelational.extend({
        _name: "BinaryOp[>=]",
        compare : function(left, right){
            return left >= right;
        }

    }),
    "<<": Expressions.BinaryOp.extend({

        operate: function(left, right, sim, inst){
            if (isA(this.left.type, Types.OStream)) {
                sim.cout(right);
            }
            return left;
        },
        convert : function(){
            // only do lvalue to rvalue for right
            this.right = this.sub.right = standardConversion1(this.right);
        },
        typeCheck : function(){
            if (isA(this.left.type, Types.OStream) && !isA(this.right.type, Types.Void)) {
                this.type = this.left.type;
                this.valueCategory = this.left.valueCategory;
                return true;
            }

            this.semanticProblems.push(CPPError.expr.invalid_binary_operands(this, this.op, this.left, this.right));
        },
        stepForward : function(sim, inst){
            Expressions.BinaryOp.stepForward.apply(this, arguments);

            // Peek at next expression. If it is also << operator or a literal or endl, then go ahead
            var next = sim.peek();
            return isA(next.model, BINARY_OPS["<<"]) || isA(next.model, Literal) || isA(next.model, Conversions.LValueToRValue) && isA(next.model.from, Identifier) && next.model.from.entity === sim.endlEntity;
        }
    }),
    ">>": Expressions.BinaryOp.extend({

        operate: function(left, right, sim, inst){
            if (isA(this.left.type, Types.IStream)) {
                sim.cin(right);
            }
            return left;
        },
        convert : function(){
            // do nothing
            // (no lvalue to rvalue)
        },
        typeCheck : function(){
            if (isA(this.left.type, Types.IStream) && this.right.valueCategory == "lvalue") {
                this.type = this.left.type;
                this.valueCategory = this.left.valueCategory;
                return true;
            }

            this.semanticProblems.push(CPPError.expr.invalid_binary_operands(this, this.op, this.left, this.right));
        }
    })
};




var UnaryOp = Expressions.UnaryOp = Expression.extend({
    _name: "UnaryOp",
    //subMetas : {
    //    operand : {parsedName : "sub"}
    //},
    subSequence : ["operand"],
    memberOverloadSubSequence : ["operand", "funcCall"], // does not include rhs because function call does that
    overloadSubSequence : ["funcCall"], // does not include rhs because function call does that
    init: function(code, context){
        this.initParent(code, context);
        this.op = this.code.op;
    },

    compile : function(scope){
        var auxOperand = Expressions.createExpr(this.code.sub, {parent: this, auxiliary: true});
        auxOperand.compile(scope);

        if (isA(auxOperand.type, Types.Class)){
            // If it's of class type, we look for overloads
            var overloadOp = auxOperand.type.scope.singleLookup("operator" + this.op, {
                    own:true, paramTypes:[]
                }) ||
                scope.singleLookup("operator" + this.op, {
                    paramTypes:[auxOperand.type]
                });

            this.isMemberOverload = isA(overloadOp, MemberFunctionEntity);
            if (overloadOp){
                this.funcCall = this.sub.funcCall = FunctionCall.instance(this.code, {parent:this});
                if (this.isMemberOverload){
                    this.operand = this.sub.operand = this.createAndCompileChildExpr(this.code.sub, scope);
                    this.sub.funcCall.compile(scope, overloadOp, []);
                    this.subSequence = this.memberOverloadSubSequence;
                }
                else{
                    this.sub.funcCall.compile(scope, overloadOp, [this.code.sub]);
                    this.subSequence = this.overloadSubSequence;
                }
                this.type = this.sub.funcCall.type;
                this.valueCategory = this.sub.funcCall.valueCategory;
            }
            else{

                this.operand = this.sub.operand = this.createAndCompileChildExpr(this.code.sub, scope);

                this.convert();

                this.typeCheck();

                this.compileTemporarires(scope);
            }
        }
        else{
            this.operand = this.sub.operand = this.createAndCompileChildExpr(this.code.sub, scope);

            this.convert();

            this.typeCheck();

            this.compileTemporarires(scope);
        }
        return this.semanticProblems;
    },

    upNext : function(sim, inst){
        // Push lhs, rhs, and function call (if lhs class type)
        var toReturn = Expression.upNext.apply(this, arguments);

        // If using an assignment operator, set receiver for function call instance
        if (this.sub.funcCall && this.isMemberOverload){
            this.sub.funcCall.setReceiver(sim, inst.childInstances.funcCall, RuntimeEntity.instance(this.operand.type, inst.childInstances.operand));
        }

        return toReturn;
    },

    stepForward: function(sim, inst){
        if (inst.index === "operate"){
            if (this.sub.funcCall){
                // Assignment operator function call has already taken care of the "assignment".
                // Just evaluate to returned value from assignment operator.
                inst.setEvalValue(inst.childInstances.funcCall.evalValue);
                this.done(sim, inst);
                //return true;
            }
            else{
                this.operate(sim, inst);
                this.done(sim, inst);
            }
        }
    },

    operate: Class._ABSTRACT,

    isTailChild : function(child){
        return {isTail: false,
            reason: "The " + this.op + " operation will happen after the recursive call.",
            others: [this]
        };
    }
});

var Dereference = Expressions.Dereference = UnaryOp.extend({
    _name: "Dereference",
    valueCategory: "lvalue",
    //subMetas : {
    //    operand : {parsedName : "sub", convertTo: Types.Pointer}
    //},
    convert : function(){
        this.operand = this.sub.operand = standardConversion(this.operand, Types.Pointer);
    },
    typeCheck : function(){
        // Type check
        if (!isA(this.operand.type, Types.Pointer)) {
            this.semanticProblems.push(CPPError.expr.dereference.pointer(this, this.operand.type));
        }
        else if (!(this.operand.type.ptrTo.isObjectType || isA(this.operand.type.ptrTo, Types.Function))){
            this.semanticProblems.push(CPPError.expr.dereference.pointerToObjectType(this, this.operand.type));
        }
        else{
            this.type = this.operand.type.ptrTo;
        }
    },

    operate: function(sim, inst){
        if (isA(this.operand.type.ptrTo, Types.Function)){
            //function pointer
            inst.setEvalValue(inst.childInstances.operand.evalValue.value);
        }
        else{
            var ptr = inst.childInstances.operand.evalValue;
            var addr = ptr.rawValue();


            var invalidated = false;

            // If it's a null pointer, give message
            if (Types.Pointer.isNull(addr)){
                sim.crash("Ow! Your code just dereferenced a null pointer!");
                invalidated = true;
            }
            else if (Types.Pointer.isNegative(addr)){
                sim.crash("Uh, wow. The pointer you're trying to dereference has a negative address.\nThanks a lot.");
                invalidated = true;
            }
            else if (isA(ptr.type, Types.ArrayPointer)){
                // If it's an array pointer, make sure it's in bounds and not one-past
                if (addr < ptr.type.min()){
                    sim.alert("That pointer has wandered off the beginning of its array. Dereferencing it might cause a segfault, or worse - you might just access/change other memory outside the array.");
                    invalidated = true;
                }
                else if (ptr.type.onePast() < addr){
                    sim.alert("That pointer has wandered off the end of its array. Dereferencing it might cause a segfault, or worse - you might just access/change other memory outside the array.");
                    invalidated = true;
                }
                else if (addr == ptr.type.onePast()){
                    sim.alert("That pointer is one past the end of its array. Do you have an off-by-one error?. Dereferencing it might cause a segfault, or worse - you might just access/change other memory outside the array.");
                    invalidated = true;
                }

            }

            var obj = sim.memory.getObject(ptr);

            // Note: dead object is not necessarily invalid. Invalid has to do with the value
            // while dead/alive has to do with the object itself. Reading from dead object does
            // yield an invalid value though.
            if (!obj.isAlive()){
                DeadObjectMessage.instance(obj, {fromDereference:true}).display(sim, inst);
            }

            if (invalidated){
                obj.invalidate();
            }
            inst.setEvalValue(obj);
        }
    },

    describeEvalValue : function(depth, sim, inst){
        if (inst && inst.evalValue){
            return inst.evalValue.describe();
        }
        else if (depth == 0){
            return {message: "the result of " + this.code.text};
        }
        else{
            return {message: "the object at address " + this.operand.describeEvalValue(depth-1, sim, this.childInstance(sim, inst, "operand")).message};
        }
    },

    explain : function(sim, inst){
        if (inst && inst.childInstances && inst.childInstances.operand && inst.childInstances.operand.evalValue){
            return {message: "We will find the object at address " + inst.childInstances.operand.evalValue.describe().message}
        }
        else{
            return {message: "The result of " + this.operand.describeEvalValue(0, sim, inst && inst.childInstances && inst.childInstances.operand).message + " will be dereferenced. This is, the result is a pointer/address and we will follow the pointer to see what object lives there."};
        }
    }
});

var AddressOf = Expressions.AddressOf = UnaryOp.extend({
    _name: "AddressOf",
    valueCategory: "prvalue",

    typeCheck : function(){
        // operand must be an lvalue
        if(this.operand.valueCategory !== "lvalue"){
            this.semanticProblems.push(CPPError.expr.addressOf.lvalue_required(this));
        }

        this.type = Types.Pointer.instance(this.operand.type);

        return this.semanticProblems;
    },

    operate: function(sim, inst){
        var obj = inst.childInstances.operand.evalValue;
        inst.setEvalValue(obj.getPointerTo());
    }
});


Expressions.UnaryPlus = UnaryOp.extend({
    _name: "UnaryPlus",
    valueCategory: "prvalue",

    convert : function(){
        this.operand = this.sub.operand = standardConversion1(this.operand);
        if (this.operand.type.isIntegral){
            this.operand = this.sub.operand = integralPromotion(this.operand);
        }
    },

    typeCheck : function(){
        if(this.operand.type.isArithmetic || isA(this.operand.type, Types.Pointer)) {
            this.type = this.operand.type;
            return true;
        }
        else{
            this.semanticProblems.push(CPPError.expr.unaryPlus.operand(this));
            return false;
        }
    },

    operate: function(sim, inst){
        var val = inst.childInstances.operand.evalValue.value;
        inst.setEvalValue(Value.instance(val, this.type));
    }
});

Expressions.UnaryMinus = UnaryOp.extend({
    _name: "UnaryMinus",
    valueCategory: "prvalue",

    convert : function(){
        this.operand = this.sub.operand = standardConversion1(this.operand);
        if (this.operand.type.isIntegral){
            this.operand = this.sub.operand = integralPromotion(this.operand);
        }
    },

    typeCheck : function(){
        if(this.operand.type.isArithmetic) {
            this.type = this.operand.type;
            return true;
        }
        else{
            this.semanticProblems.push(CPPError.expr.unaryMinus.operand(this));
            return false;
        }
    },

    operate: function(sim, inst){
        var val = inst.childInstances.operand.evalValue.value;
        inst.setEvalValue(Value.instance(-val, this.type));
    }
});

Expressions.LogicalNot = UnaryOp.extend({
    _name: "LogicalNot",
    valueCategory: "prvalue",
    type: Types.Bool.instance(),
    subMetas : {
        operand : {parsedName : "sub"}
    },
    convert : function(){
        this.operand = this.sub.operand = standardConversion(this.operand, Types.Bool.instance());
    },

    typeCheck : function(){
        // Type check
        if (!isA(this.operand.type, Types.Bool)){
            this.semanticProblems.push(CPPError.expr.logicalNot.operand_bool(this, this.operand));
        }
    },

    operate: function(sim, inst){
        inst.setEvalValue(Value.instance(!inst.childInstances.operand.evalValue.value, this.type));
    }
});

Expressions.BitwiseNot = Expressions.Unsupported.extend({
    _name: "BitwiseNot",
    englishName: "bitwise not"
});

var Prefix = Expressions.Prefix = UnaryOp.extend({
    _name: "Prefix",
    valueCategory: "lvalue",
    subMetas : {
        operand : {parsedName : "sub"}
    },
    typeCheck : function(){
        // Type check
        if (this.operand.type.isArithmetic || isA(this.operand.type, Types.Pointer)) {
            this.type = this.operand.type;

            if (this.op == "--" && isA(this.operand.type, Types.Bool)){
                this.semanticProblems.push(CPPError.expr.invalid_operand(this, this.op, this.operand));
            }

            else if (this.operand.valueCategory === "lvalue") {
                return true;
            }
            else{
                this.semanticProblems.push(CPPError.expr.lvalue_operand(this, this.op));
            }
        }
        else{
            this.semanticProblems.push(CPPError.expr.invalid_operand(this, this.op, this.operand));
        }
    },
    operate: function(sim, inst){
        var obj = inst.childInstances.operand.evalValue;
        var amount = (isA(this.type, Types.Pointer) ? this.type.ptrTo.size : 1);

        var oldValue = readValueWithAlert(obj, sim, this.operand, inst.childInstances.operand);
        var newRawValue = this.op === "++" ? oldValue.rawValue() + amount : oldValue.rawValue() - amount;

        if (isA(obj.type, Types.ArrayPointer)){
            // Check that we haven't run off the array
            if (newRawValue < obj.type.min()){
                //sim.alert("Oops. That pointer just wandered off the beginning of its array.");
            }
            else if (obj.type.onePast() < newRawValue){
                //sim.alert("Oops. That pointer just wandered off the end of its array.");
            }
        }
        else if (isA(obj.type, Types.Pointer)){
            // If the RTTI works well enough, this should always be unsafe
            sim.alert("Uh, I don't think you're supposed to do arithmetic with that pointer. It's not pointing into an array.");
        }

        obj.writeValue(Value.instance(newRawValue, oldValue.type, {invalid: !oldValue.isValueValid()}));
        inst.setEvalValue(obj);
    },

    explain : function(sim, inst){
        var evdesc = this.operand.describeEvalValue(0, sim, inst && inst.childInstances && inst.childInstances.operand).message;
        var incDec = this.op === "++" ? "incremented" : "decremented";
        return {message: "First, the value of " + evdesc + " will be " + incDec + " by one. Then this expression as a whole will evaluate to the new value of " + evdesc + "."};
    }
});

Expressions.Increment = Expression.extend({
    _name: "Increment",
    valueCategory: "prvalue",
    subMetas : {
        operand : {}
    },
    typeCheck : function(){
        // Type check
        if (this.operand.type.isArithmetic || isA(this.operand.type, Types.Pointer)) {
            this.type = this.operand.type;

            if (this.operand.valueCategory === "lvalue") {
                return true;
            }
            else{
                this.semanticProblems.push(CPPError.expr.lvalue_operand(this, "++"));
            }
        }
        else{
            this.semanticProblems.push(CPPError.expr.invalid_operand(this, "++", this.operand));
        }
    },
    stepForward : function(sim, inst){

        // Evaluate subexpressions
        if (inst.index == "operate"){
            var obj = inst.childInstances.operand.evalValue;
            var amount = (isA(this.type, Types.Pointer) ? this.type.ptrTo.size : 1);
            var oldValue = readValueWithAlert(obj, sim, this.operand, inst.childInstances.operand);
            var newRawValue = oldValue.rawValue() + amount;


            if (isA(obj.type, Types.ArrayPointer)){
                // Check that we haven't run off the array
                if (newRawValue < obj.type.min()){
                    //sim.alert("Oops. That pointer just wandered off the beginning of its array.");
                }
                else if (obj.type.onePast() < newRawValue){
                    //sim.alert("Oops. That pointer just wandered off the end of its array.");
                }
            }
            else if (isA(obj.type, Types.Pointer)){
                // If the RTTI works well enough, this should always be unsafe
                sim.alert("Uh, I don't think you're supposed to do arithmetic with that pointer. It's not pointing into an array.");
            }


            obj.writeValue(Value.instance(newRawValue, oldValue.type, {invalid: !oldValue.isValueValid()}));
            inst.setEvalValue(oldValue);
            this.done(sim, inst);
        }
    }
});

Expressions.Decrement = Expression.extend({
    _name: "Decrement",
    valueCategory: "prvalue",
    subMetas : {
        operand : {}
    },
    typeCheck : function(){
        // Type check
        if (this.operand.type.isArithmetic || isA(this.operand.type, Types.Pointer)) {
            this.type = this.operand.type;

            if (this.op = "--" && isA(this.operand.type, Types.Bool)){
                this.semanticProblems.push(CPPError.expr.invalid_operand(this, this.op, this.operand));
            }
            else if (this.operand.valueCategory === "lvalue") {
                return true;
            }
            else{
                this.semanticProblems.push(CPPError.expr.lvalue_operand(this, this.op));
            }
        }
        else{
            this.semanticProblems.push(CPPError.expr.invalid_operand(this, this.op, this.operand));
        }
    },
    stepForward : function(sim, inst){

        // Evaluate subexpressions
        if (inst.index == "operate"){
            var obj = inst.childInstances.operand.evalValue;
            var amount = (isA(this.type, Types.Pointer) ? this.type.ptrTo.size : 1);
            var oldValue = readValueWithAlert(obj, sim, this.operand, inst.childInstances.operand);
            var newRawValue = oldValue.rawValue() - amount;

            if (isA(obj.type, Types.ArrayPointer)){
                // Check that we haven't run off the array
                if (newRawValue < obj.type.min()){
                    //sim.alert("Oops. That pointer just wandered off the beginning of its array.");
                }
                else if (obj.type.onePast() < newRawValue){
                    //sim.alert("Oops. That pointer just wandered off the end of its array.");
                }
            }
            else if (isA(obj.type, Types.Pointer)){
                // If the RTTI works well enough, this should always be unsafe
                sim.alert("Uh, I don't think you're supposed to do arithmetic with that pointer. It's not pointing into an array.");
            }

            obj.writeValue(Value.instance(newRawValue, oldValue.type, {invalid: !oldValue.isValueValid()}));
            inst.setEvalValue(oldValue);
            this.done(sim, inst);
        }
    }
});




var Subscript = Expressions.Subscript = Expression.extend({
    _name: "Subscript",
    valueCategory: "lvalue",
    subSequence : ["operand", "offset"],
    overloadSubSequence : ["operand"], // does not include offset because function call does that

    compile : Class.BEFORE(function(scope){

        this.compileScope = scope;
        this.operand = this.sub.operand = this.createAndCompileChildExpr(this.code.operand, scope);

        // Check for overload
        if (isA(this.operand.type, Types.Class)){
            this.isOverloaded = true;

            var auxOffset = Expressions.createExpr(this.code.sub, {parent: this, auxiliary: true});
            auxOffset.compile(scope);

            this.processMemberOverload(this.operand, [auxOffset], "[]");


            // add check for problems before adding anything here
        }
        else{
            this.operand = this.sub.operand = standardConversion(this.operand, Types.Pointer);
            this.offset = this.sub.offset = this.createAndCompileChildExpr(this.code.sub, scope, Types.Int.instance());
        }
    }),

    typeCheck : function(){
        if (this.isOverloaded){
            return;
        }
        if (!isA(this.operand.type, Types.Pointer)) {
            this.semanticProblems.push(CPPError.expr.array_operand(this, this.operand.type));
        }
        else{
            this.type = this.operand.type.ptrTo;
        }

        if (!isA(this.offset.type, Types.Int)) {
            this.semanticProblems.push(CPPError.expr.array_offset(this, this.offset.type));
        }
    },


    upNext : function(sim, inst){
        if (this.isOverloaded)
        {
            if (inst.index === "subexpressions"){
                inst.childInstances = {};
                inst.childInstances.operand = this.operand.createAndPushInstance(sim, inst);
                inst.index = "operate";
                return true;
            }
            else if (inst.index === "operate"){
                inst.childInstances.funcCall = this.funcCall.createAndPushInstance(sim, inst, inst.childInstances.operand.evalValue);
                inst.index = "done";
                return true;
            }
            else{
                inst.setEvalValue(inst.childInstances.funcCall.evalValue);
                this.done(sim, inst);
                return true;
            }
        }
        else{
            Expressions.Subscript._parent.upNext.apply(this, arguments);
        }
    },

    stepForward : function(sim, inst){

        // Evaluate subexpressions
        if (inst.index === "operate"){
            // sub and operand are already evaluated
            // result of operand should be a pointer
            // result of sub should be an integer
            var offset = inst.childInstances.offset.evalValue;
            var ptr = inst.childInstances.operand.evalValue;
            ptr = Value.instance(ptr.value+offset.value*this.type.size, ptr.type);
            var addr = ptr.value;



            var invalidated = false;

            if (Types.Pointer.isNegative(addr)){
                sim.crash("Good work. You subscripted so far backwards off the beginning of the array you went to a negative address. -__-");
                invalidated = true;
            }
            else if (isA(ptr.type, Types.ArrayPointer)){
                // If it's an array pointer, make sure it's in bounds and not one-past
                if (addr < ptr.type.min()){
                    sim.alert("That subscript operation goes off the beginning of the array. This could cause a segfault, or worse - you might just access/change other memory outside the array.");
                    invalidated = true;
                }
                else if (ptr.type.onePast() < addr){
                    sim.alert("That subscript operation goes off the end of the array. This could cause a segfault, or worse - you might just access/change other memory outside the array.");
                    invalidated = true;
                }
                else if (addr == ptr.type.onePast()){
                    sim.alert("That subscript accesses the element one past the end of the array. This could cause a segfault, or worse - you might just access/change other memory outside the array.");
                    invalidated = true;
                }

            }

            var obj = sim.memory.getObject(ptr);

            // Note: dead object is not necessarily invalid. Invalid has to do with the value
            // while dead/alive has to do with the object itself. Reading from dead object does
            // yield an invalid value though.
            if (!obj.isAlive()){
                DeadObjectMessage.instance(obj, {fromSubscript:true}).display(sim, inst);
            }

            if (invalidated){
                obj.invalidate();
            }
            inst.setEvalValue(obj);
            this.done(sim, inst);
        }
    },

    isTailChild : function(child){
        return {isTail: false,
            reason: "The subscripting will happen after the recursive call returns.",
            others: [this]
        };
    }
});

var Dot = Expressions.Dot = Expression.extend({
    _name: "Dot",
    subMetas : {
        operand : {}
    },
    init: function(code, context){
        this.initParent(code, context);
        this.memberName = this.code.member.identifier;
    },
    typeCheck : function(){
        if (!isA(this.operand.type, Types.Class)) {
            this.semanticProblems.push(CPPError.expr.dot.class_type(this));
            return false;
        }

        // Find out what this identifies
        try {
            this.entity = this.operand.type.scope.requiredLookup(this.memberName, copyMixin(this.context, {isThisConst:this.operand.type.isConst}));
            this.type = this.entity.type;
        }
        catch(e){
            if (isA(e, SemanticExceptions.BadLookup)){
                this.semanticProblems.push(CPPError.expr.dot.memberLookup(this, this.operand.type, this.memberName));
                this.semanticProblems.push(e.annotation(this));
            }
            else{
                throw e;
            }
        }
        //if (isA(this.type, Types.Reference)){
        //    this.type = this.type.refTo;
        //}

        //var mem;
        //if (mem = this.operand.type.memberMap[this.memberName]) {
        //    this.memberIndex = mem.memberIndex;
        //}
        //else{
        //    this.semanticProblems.push(CPPError.expr.dot.no_such_member(this, this.operand, this.memberName));
        //    return false;
        //}

        if (isA(this.type, Types.Reference)){
            this.type = this.type.refTo;
            this.valueCategory = "lvalue";
        }
        else if (this.operand.valueCategory === "lvalue"){
            this.valueCategory = "lvalue";
        }
        else{
            this.valueCategory = "xvalue";
        }
        //this.type = this.operand.type.members[this.memberIndex].type;

    },

    upNext : function(sim, inst){
        if (inst.index === "subexpressions"){
            return Expression.upNext.apply(this, arguments);
        }
        else{
            // entity may be MemberSubobjectEntity but should never be an AutoEntity
            assert(!isA(this.entity, AutoEntity));
            var operand = inst.childInstances.operand.evalValue;
            inst.memberOf = operand;
            inst.receiver = operand;
            inst.setEvalValue(this.entity.lookup(sim, inst));
            this.done(sim, inst);
            return true;
        }
    },

    isTailChild : function(child){
        return {isTail: false,
            reason: "The dot operation itself will happen after the recursive call returns.",
            others: [this]
        };
    }
});



var Arrow = Expressions.Arrow = Expression.extend({
    _name: "Arrow",
    valueCategory: "lvalue",
    subMetas : {
        operand : {convertTo: Types.Pointer}
    },
    init: function(code, context){
        this.initParent(code, context);
        this.memberName = this.code.member.identifier;
    },
    typeCheck : function(){
        if (!isA(this.operand.type, Types.Pointer) || !isA(this.operand.type.ptrTo, Types.Class)) {
            this.semanticProblems.push(CPPError.expr.arrow.class_pointer_type(this));
            return false;
        }

        // Find out what this identifies
        try{
            this.entity = this.operand.type.ptrTo.scope.requiredLookup(this.memberName, copyMixin(this.context, {isThisConst:this.operand.type.ptrTo.isConst}));
            this.type = this.entity.type;
        }
        catch(e){
            if (isA(e, SemanticExceptions.BadLookup)){
                this.semanticProblems.push(CPPError.expr.arrow.memberLookup(this, this.operand.type.ptrTo, this.memberName));
                this.semanticProblems.push(e.annotation(this));
            }
            else{
                throw e;
            }
        }
    },

    stepForward : function(sim, inst){

        if (inst.index == "operate"){
            var addr = inst.childInstances.operand.evalValue;
            if (Types.Pointer.isNull(addr.rawValue())){
                sim.crash("Ow! Your code just tried to use the arrow operator on a null pointer!");
            }
            var obj = sim.memory.getObject(addr, this.operand.type.ptrTo);
            inst.memberOf = obj;
            inst.receiver = obj;
            inst.setEvalValue(this.entity.lookup(sim, inst));

            this.done(sim, inst);
            return true;
        }
    },

    isTailChild : function(child){
        return {isTail: false,
            reason: "The arrow operation itself will happen after the recursive call returns.",
            others: [this]
        };
    }
});






var clone_tree = function(tree){
	var copy = {};
	if (tree.left || tree.right){
		copy.left = clone_tree(tree.left);
		copy.right = clone_tree(tree.right);
		copy.elt = tree.elt;
        copy.depth = tree.depth;
		return copy;
	}
	else{
		return {};
	}
};

var PREDEFINED_FUNCTIONS = {
    rand : function(args, sim, inst){
        return Value.instance(Math.floor(sim.nextRandom() * 32767), Types.Int.instance());
    },
    list_make : function(args){
        if (args.length == 0){
            return Value.instance([], Types.List_t.instance());
        }
        else{
            var temp = args[1].evalValue.value.clone();
            temp.unshift(args[0].evalValue.value);
            return Value.instance(temp, Types.List_t.instance());
        }
    },
	list_isEmpty : function(args){
		return Value.instance(args[0].evalValue.value.length == 0, Types.Bool.instance());
	},
	list_first : function(args, sim){
        if (args[0].evalValue.value.length === 0){
            sim.alert("Oops!<br />You can't use list_first on an empty list!");
        }
		return Value.instance(args[0].evalValue.value[0], Types.Int.instance());
	},
    list_rest : function(args, sim){
        if (args[0].evalValue.value.length === 0){
            sim.alert("Oops!<br />You can't use list_rest on an empty list!");
        }
        var temp = args[0].evalValue.value.clone();
        temp.shift();
        return Value.instance(temp, Types.List_t.instance());
    },
    list_print : function(args, sim){
        sim.cout(args[0].evalValue);
        return Value.instance("", Types.Void.instance());
    },
    list_magic_reverse : function(args){
        var temp = args[0].evalValue.value.clone();
        temp.reverse();
        return Value.instance(temp, Types.List_t.instance());
    },
    list_magic_append : function(args){
        var temp = args[0].evalValue.value.concat(args[1].evalValue.value);
        return Value.instance(temp, Types.List_t.instance());
    },



	tree_make : function(args){
		if (args.length == 0){
			return Value.instance({}, Types.Tree_t.instance());
		}
		else{
			var left = clone_tree(args[1].evalValue.value);
			var right = clone_tree(args[2].evalValue.value);
			var elt = args[0].evalValue.value;
            var depth = Math.max(left.depth || 0, right.depth || 0) + 1;
			return Value.instance({left: left, elt: elt, right: right, depth: depth}, Types.Tree_t.instance());
		}
	},
	tree_isEmpty : function(args){
		return Value.instance(!args[0].evalValue.value.left, Types.Bool.instance());
	},
	tree_elt : function(args, sim){
        if (!args[0].evalValue.value || args[0].evalValue.value.elt === undefined){
            sim.alert("Oops!<br />You can't use tree_elt on an empty tree!");
        }
		return Value.instance(args[0].evalValue.value.elt, Types.Int.instance());
	},
	tree_left : function(args, sim){
        if (!args[0].evalValue.value || args[0].evalValue.value.elt === undefined){
            sim.alert("Oops!<br />You can't use tree_left on an empty tree!");
        }
		return Value.instance(args[0].evalValue.value.left, Types.Tree_t.instance());
	},
	tree_right : function(args, sim){
        if (!args[0].evalValue.value || args[0].evalValue.value.elt === undefined){
            sim.alert("Oops!<br />You can't use tree_right on an empty tree!");
        }
		return Value.instance(args[0].evalValue.value.right, Types.Tree_t.instance());
	},
    tree_print : function(args, sim){
        sim.cout(args[0].evalValue);
        return Value.instance("", Types.Void.instance());
    },
    //tree_magic_insert : function(args, sim){
    //    var tree = args[0].evalValue.value;
    //    var elt = args[1].evalValue.value;
    //    while(tree.elt !== undefined){
    //        tree = (elt < tree.elt ? tree.left : tree.right);
    //    }
    //    tree.elt = elt;
    //    tree.left = {};
    //    tree.right = {};
    //},

    make_face : function(args, sim, inst){
        var obj = createAnonObject(Types.Array.instance(Types.Int.instance(), 100), sim.memory, args[0].evalValue.value);
        obj.writeValue(
     [0,0,1,1,1,1,1,0,0,0,
     0,1,0,0,0,0,0,1,0,0,
     1,0,1,0,0,0,1,0,1,0,
     1,0,0,0,0,0,0,0,1,0,
     1,0,0,0,1,0,0,0,1,0,
     1,0,0,0,0,0,0,0,1,0,
     1,0,0,0,0,0,1,0,1,0,
     1,0,0,1,1,1,0,0,1,0,
     0,1,0,0,0,0,0,1,0,0,
     0,0,1,1,1,1,1,0,0,0]);
        return Value.instance("", Types.Void.instance());
    },
    "assert" : function(args, sim, inst){
        if(!args[0].evalValue.value){
            sim.alert("Yikes! An assert failed! <br /><span class='code'>" + inst.model.code.text + "</span> on line " + inst.model.code.line + ".");
        }
        return Value.instance("", Types.Void.instance());
    },
    "pause" : function(args, sim, inst){
        sim.pause();
        return Value.instance("", Types.Void.instance());
    },
    "pauseIf" : function(args, sim, inst){
        if(args[0].evalValue.value){
            sim.pause();
        }
        return Value.instance("", Types.Void.instance());
    }
};


var FunctionCall = Expression.extend({
    _name: "FunctionCall",
    initIndex: "arguments",
    instType: "expr",

    compile : function(scope, func, args) {
        var self = this;
        assert(isA(func, FunctionEntity));
        assert(Array.isArray(args));
        this.func = func;
        //this.args = args;

        if (!this.context.auxiliary){
            scope.addCall(this);
        }

        if (this.func.isMain && !this.context.isMainCall){
            this.semanticProblems.push(CPPError.expr.functionCall.numParams(this));

        }

        // Is the function statically bound?
        if (this.func.isStaticallyBound()){
            this.staticFunction = this.func;
            this.isRecursive = !this.context.isMainCall && this.staticFunction === this.context.func.entity;
        }

        this.type = this.func.type.returnType;

        if (isA(this.type, Types.Reference)){
            this.returnByReference = true;
            this.valueCategory = "lvalue";
            // Adjust to T from reference to T
            this.type = this.type.refTo;
        }
        else{
            this.valueCategory = "prvalue";
        }


        // Check that we have the right number of parameters
        // Note: at the moment, this is not already "checked" by name lookup / overload resolution
        if (args.length !== this.func.type.paramTypes.length){
            this.semanticProblems.push(CPPError.expr.functionCall.numParams(this));
            return this.semanticProblems;
        }

        // Parameter passing is done by copy initialization, so create initializers.
        this.argInitializers = args.map(function(arg, i){
            var init = ParameterInitializer.instance(arg.code, {parent: self});
            self.semanticProblems.pushAll(init.compile(scope,
                ParameterEntity.instance(self.func,i),
                [arg]
            ));
            init.initIndex = "afterChildren"; // These initializers expect their expression to already be evaluated
            return init;
        });

        if (!isA(this.func.decl, MagicFunctionDefinition)){
            // If we are returning by value, then we need to create a temporary object to copy-initialize.
            // If we are returning by reference, this.returnObject will be bound to what we return.
            // Temporary references do not use extra space and won't be automatically destructed.
            if (!this.returnByReference && !isA(this.type, Types.Void)){
                this.returnByValue = true;
                this.returnObject = this.createTemporaryObject(this.func.type.returnType, (this.func.name || "unknown") + "() [return]");
            }

            if (!this.context.isMainCall){
                // Register as a function call in our function context
                this.context.func.calls.push(this);
            }
        }

        return Expression.compile.apply(this, arguments);
    },

    checkLinkingProblems : function(){
        var linkingProblems = SemanticProblems.instance();
        if (!this.func.isLinked()){
            linkingProblems.push(CPPError.link.def_not_found(this, this.func));
        }
        this.semanticProblems.pushAll(linkingProblems);
        return linkingProblems;
    },

    tailRecursionCheck : function(semanticProblems){
        if (this.isTail !== undefined) {
            return;
        }

        var child = this;
        var parent = this.parent;
        var isTail = true;
        var reason = null;
        var others = [];
        var first = true;
        while(!isA(child, FunctionDefinition) && !isA(child, Statements.Return)) {
            var result = parent.isTailChild(child);
            if (!result.isTail) {
                isTail = false;
                reason = result.reason;
                others = result.others || [];
                break;
            }

            //if (!first && child.tempDeallocator){
            //    isTail = false;
            //    reason = "The full expression containing this recursive call has temporary objects that need to be deallocated after the call returns.";
            //    others = [];
            //    break;
            //}
            //first = false;


            reason = reason || result.reason;

            child = parent;
            parent = child.parent;
        }

        this.isTail = isTail;
        this.isTailReason = reason;
        this.isTailOthers = others;
        //this.context.func.isTailRecursive = this.context.func.isTailRecursive && isTail;

        this.canUseTCO = this.isRecursive && this.isTail;
    },

    createInstance : function(sim, parent, receiver){
        var inst = Expression.createInstance.apply(this, arguments);
        inst.receiver = receiver;

        if (!inst.receiver && this.context.receiver){
            // Used for constructors. Make sure to look up in context of parent instance
            // or else you'll be looking at the wrong thing for parameter entities.
            inst.receiver = this.context.receiver.lookup(sim, parent);
        }

        // For function pointers. It's a hack!
        if (parent && parent.pointedFunction) {
            inst.pointedFunction = parent.pointedFunction;
        }

        var funcDecl = inst.funcDecl = this.func.lookup(sim, inst).decl;

        if (isA(funcDecl, MagicFunctionDefinition)){
            return inst; //nothing more to do
        }

        if (this.canUseTCO){
            inst.func = inst.funcContext;
            //funcDecl.tailCallReset(sim, inst.func); // TODO why was this ever here?
            //inst.send("tailCalled", inst.func);
        }
        else{
            inst.func = funcDecl.createInstance(sim, inst);
            //inst.send("called", inst.func);
        }

        // Create argument initializer instances
        inst.argInits = this.argInitializers.map(function(argInit){
            argInit = argInit.createInstance(sim, inst, inst.func);
            return argInit;
        });
        inst.func.model.setArguments(sim, inst.func, inst.argInits);

        if (this.canUseTCO) {
            // If we are using TCO, don't create a new return object. Just use the already existing one from the function.
            inst.returnObject = inst.func.model.getReturnObject(sim, inst);
        }
        else{
            // If we are NOT using TCO, we need to create the return object.
            if (this.returnByValue) {
                // Return by value, create the instance of the returnObject and give it to the function we're calling.
                inst.returnObject = this.returnObject.objectInstance(inst);
            }
            else if (this.returnByReference) {
                // Return by reference, create the reference for the function to bind to its return value
                inst.returnObject = ReferenceEntity.instance(null, this.func.type.returnType).autoInstance();
            }
            // else it was void

            inst.func.model.setReturnObject(sim, inst.func, inst.returnObject);
        }

        return inst;
    },

    setReceiver : function(sim, inst, receiver){
        inst.receiver = receiver;
    },

    upNext : function(sim, inst){
        var self = this;
        if (!inst.receiver){
            inst.receiver = inst.funcContext.receiver;
        }
        if (inst.index === "arguments"){

            // If it's a magic function, just push expressions
            if (isA(inst.funcDecl, MagicFunctionDefinition)){
                inst.args = this.argInitializers.map(function(argInit){
                    return argInit.args[0].createAndPushInstance(sim, argInit.createInstance(sim, inst));
                });
            }
            else{
                // Push the expressions that evaluate our arguments.
                for(var i = this.argInitializers.length-1; i >= 0; --i){
                    this.argInitializers[i].pushChildInstances(sim, inst.argInits[i]); // expressions are children of initializers
                }
            }

            inst.index = "call";

            return true;
        }
        else if (inst.index == "return"){
            // Unless return type is void, we will have this.returnObject
            if (this.returnByReference) {
                inst.setEvalValue(inst.returnObject.lookup(sim, inst)); // lookup here in case its a reference
            }
            else if (this.returnByValue){
                if (isA(this.type, Types.Class)) {
                    inst.setEvalValue(inst.returnObject.lookup(sim, inst));
                }
                else{
                    inst.setEvalValue(inst.returnObject.lookup(sim, inst).getValue());
                }
                //}
                //else{
                //    // A hack of my own because I don't want to have to treat prvalues as possibly temporary objects
                //    inst.setEvalValue(Value.instance(inst.returnObject.getValue(), inst.returnObject.type));
                //}
            }
            else {
                // nothing to do it must be void
                inst.setEvalValue(inst.func.returnValue);
            }

            this.done(sim, inst);
            return true;
        }
    },

    stepForward : function(sim, inst){
        //if (this.func && this.func.decl && this.func.decl.context.implicit){
        //    setTimeout(function(){
        //        while (!inst.hasBeenPopped){
        //            sim.stepForward();
        //        }
        //    },0);
        //}
        if (inst.index == "call"){

            // Handle magic functions as special case
            if (isA(inst.funcDecl, MagicFunctionDefinition)){
                var preFn = PREDEFINED_FUNCTIONS[inst.funcDecl.name];
                assert(preFn, "Cannot find internal implementation of magic function.");

                // Note: magic functions just want args, not initializers (because they're magic!)
                inst.setEvalValue(preFn(inst.args, sim, inst));
                this.done(sim, inst);
                return false;
            }

            if (inst.receiver) {
                inst.func.receiver = inst.receiver = inst.receiver.lookup(sim, inst);
                inst.receiver.callReceived();
            }



            if (this.canUseTCO){
                inst.funcDecl.tailCallReset(sim, inst.func, inst);
                inst.send("tailCalled", inst.func);
            }
            else{
                // Push the stack frame
                var frame = sim.memory.stack.pushFrame(inst);
                inst.func.setFrame(frame);

                sim.push(inst.func);
                inst.send("called", inst.func);
                inst.hasBeenCalled = true;
            }

            // Push initializers for function arguments, unless magic function
            for (var i = inst.argInits.length-1; i >= 0; --i){
                sim.push(inst.argInits[i]);
            }

            inst.index = "return";
        }
    },

    isTailChild : function(child){
        return {isTail: false,
            reason: "A quick rule is that a function call can never be tail recursive if it is an argument to another function call. The outer function call will always happen afterward!",
            others: [this]
        };
    },

    describe : function(sim, inst){
        var desc = {};
        desc.message = "a call to " + this.func.describe(sim).message;
        return desc;
    }
});

// TODO change grammar to use "functionCallExpr"
var FunctionCallExpr = Expressions.FunctionCall = Expression.extend({
    _name: "FunctionCallExpr",
    initIndex: "operand",

    compile : function(scope) {
        var self = this;

        this.code.args = this.code.args || [];

        // Need to select function, so have to compile auxiliary arguments
        var auxArgs = this.code.args.map(function(arg){
            var auxArg = Expressions.createExpr(arg, {parent: self, auxiliary: true});
            auxArg.compile(scope);
            return auxArg;
        });

        // If any auxiliary arguments have semantic problems, we cannot recover
        auxArgs.forEach(function(aa){
            self.semanticProblems.pushAll(aa.semanticProblems);
        });

        if (this.semanticProblems.hasErrors()){ return this.semanticProblems; }

        var argTypes = auxArgs.map(function(arg){
            return arg.type;
        });
        this.operand = this.operand = Expressions.createExpr(this.code.operand, {parent:this, paramTypes: argTypes});

        this.i_compileChild(this.operand, scope);

        if (this.semanticProblems.hasErrors()){
            return this.semanticProblems;
        }

        this.bindFunction(scope);

        if (this.semanticProblems.hasErrors()){
            return this.semanticProblems;
        }

        var funcCall = this.funcCall = FunctionCall.instance(this.code, {parent:this});
        this.semanticProblems.pushAll(funcCall.compile(scope, this.boundFunction, this.code.args));

        this.type = funcCall.type;
        this.valueCategory = funcCall.valueCategory;

        return Expression.compile.apply(this, arguments);
    },

    bindFunction : function(){
        var self = this;
        if (isA(this.operand.type, Types.Class)){
            // Check for function call operator and if so, find function
            var callOp = this.operand.type.memberMap["operator()"];
            if (callOp){
                this.callOp = callOp;
                this.boundFunction = this.callOp;
                this.type = noRef(callOp.type.returnType);
            }
            else{
                this.semanticProblems.push(CPPError.expr.functionCall.not_defined(this, this.operand.type));
                return this.semanticProblems;
            }
        }
        else if (isA(this.operand.entity, FunctionEntity)){
            // If it's an identifier, dot, arrow, etc. that denote an entity - just bind that
            this.staticFunction = this.operand.entity;
            this.staticFunctionType = this.staticFunction.type;
            this.boundFunction = this.operand.entity;
        }
        else if (isA(this.operand.type, Types.Pointer) && isA(this.operand.type.ptrTo, Types.Function)){
            this.staticFunctionType = this.operand.type.ptrTo;
            this.boundFunction = PointedFunctionEntity.instance(this.operand.type.ptrTo);
            this.operand = standardConversion1(this.operand);
        }
        else if (isA(this.operand.type, Types.Function)){
            this.staticFunctionType = this.operand.type;
            this.boundFunction = PointedFunctionEntity.instance(this.operand.type);
        }
        else{
            this.semanticProblems.push(CPPError.expr.functionCall.operand(this, this.operand));
            return this.semanticProblems;
        }

    },

    upNext : function(sim, inst) {
        if (inst.index === "operand") {
            inst.operand = this.operand.createAndPushInstance(sim, inst);
            inst.index = "call";
            return true;
        }
        else if (inst.index === "call"){
            // If it's a function pointer, set info for evaluated operand function entity
            if (isA(this.operand.type, Types.Pointer) && isA(this.operand.type.ptrTo, Types.Function)){
                inst.pointedFunction = inst.operand.evalValue.rawValue();
            }
            // TODO: hack on next line has || inst.operand.evalValue
            inst.funcCall = this.funcCall.createAndPushInstance(sim, inst, inst.operand.receiver || isA(this.operand.type, Types.Class) && inst.operand.evalValue);
            inst.wait();
            inst.index = "done";
            return true;
        }
        else {
            inst.setEvalValue(inst.funcCall.evalValue);
            this.done(sim, inst);
        }
        return true;
    },

    isTailChild : function(child){
        return {isTail: child === this.funcCall
        };
    }
});


Expressions.StaticCast = Expressions.Unsupported.extend({
    _name: "StaticCast",
    englishName: "static_cast"
});
Expressions.DynamicCast = Expressions.Unsupported.extend({
    _name: "DynamicCast",
    englishName: "dynamic_cast"
});
Expressions.ReinterpretCast = Expressions.Unsupported.extend({
    _name: "ReinterpretCast",
    englishName: "reinterpret_cast"
});
Expressions.ConstCast = Expressions.Unsupported.extend({
    _name: "ConstCast",
    englishName: "const_cast"
});
Expressions.Cast = Expressions.Unsupported.extend({
    _name: "Cast",
    englishName: "C-Style Cast"
});





var NewExpression = Lobster.Expressions.NewExpression = Expressions.Expression.extend({
    _name: "NewExpression",
    valueCategory: "prvalue",
    initIndex: "allocate",
    compile : function(scope){

        // Compile the type specifier
        this.typeSpec = TypeSpecifier.instance(this.code.specs, {parent:this});
        this.semanticProblems.pushAll(this.typeSpec.compile(scope));

        this.heapType = this.typeSpec.type;

        // Compile declarator if it exists
        if(this.code.declarator) {
            this.declarator = Declarator.instance(this.code.declarator, {parent: this}, this.heapType);
            this.semanticProblems.pushAll(this.declarator.compile(scope));
            this.heapType = this.declarator.type;
        }

        if (isA(this.heapType, Types.Array)){
            this.type = Types.Pointer.instance(this.heapType.elemType);
            if (this.declarator.dynamicLengthExpression){
                this.dynamicLength = this.createAndCompileChildExpr(this.declarator.dynamicLengthExpression, scope, Types.Int.instance());
                this.initIndex = "length";
            }
        }
        else {
            this.type = Types.Pointer.instance(this.heapType);
        }

        var entity = NewObjectEntity.instance(this.heapType);

        var initCode = this.code.initializer || {args: []};
        if (isA(this.heapType, Types.Class) || initCode.args.length == 1){
            this.initializer = DirectInitializer.instance(initCode, {parent: this});
            this.i_compileChild(this.initializer, scope, entity, initCode.args);
        }
        else if (initCode.args.length == 0){
            this.initializer = DefaultInitializer.instance(initCode, {parent: this});
            this.i_compileChild(this.initializer, scope, entity);
        }
        else{
            this.semanticProblems.push(CPPError.decl.init.scalar_args(this, this.heapType));
        }

        this.compileTemporarires(scope);

        return this.semanticProblems;
    },

    upNext : function(sim, inst){
        if (inst.index === "length"){
            inst.dynamicLength = this.dynamicLength.createAndPushInstance(sim, inst);
            inst.index = "allocate";
            return true;
        }
        else if (inst.index === "init"){
            var initInst = this.initializer.createAndPushInstance(sim, inst);
            initInst.allocatedObject = inst.allocatedObject;
            inst.index = "operate";
            return true;
        }
    },

    stepForward : function(sim, inst){

        // Dynamic memory - doesn't get added to any scope, but we create on the heap

        if (inst.index === "allocate") {
            var heapType = this.heapType;

            // If it's an array, we need to use the dynamic length
            if (this.dynamicLength) {
                var len = inst.dynamicLength.evalValue.rawValue();
                if (len === 0){
                    sim.alert("Sorry, but I can't allocate a dynamic array of zero length. I know there's technically an old C-style hack that uses zero-length arrays, but hey, I'm just a lobster. I'll go ahead and allocate an array of length 1 instead.");
                    len = 1;
                }
                else if (len < 0){
                    sim.alert("I can't allocate an array of negative length. That doesn't even make sense. I'll just allocate an array of length 1 instead.");
                    len = 1;
                }
                heapType = Types.Array.instance(this.heapType.elemType, len);
            }

            var entity = DynamicObjectEntity.instance(heapType, this);

            var obj = sim.memory.heap.newObject(entity);
            sim.i_pendingNews.push(obj);
            inst.allocatedObject = obj;
            inst.index = "init"; // Always use an initializer. If there isn't one, then it will just be default
            //if (this.initializer){
            //    inst.index = "init";
            //}
            //else{
            //    inst.index = "operate";
            //}
            //return true;
        }
        else if (inst.index === "operate") {
            if (isA(this.heapType, Types.Array)){
                // RTTI for array pointer
                inst.setEvalValue(Value.instance(inst.allocatedObject.address, Types.ArrayPointer.instance(inst.allocatedObject)));
            }
            else{
                inst.setEvalValue(Value.instance(inst.allocatedObject.address, Types.ObjectPointer.instance(inst.allocatedObject)));
            }
            sim.i_pendingNews.pop();
            this.done(sim, inst);
        }

    },
    explain : function(){
        if (this.initializer){
            return {message: "A new object of type " + this.heapType.describe().name + " will be created on the heap."};
        }
        else{
            return {message: "A new object of type " + this.heapType.describe().name + " will be created on the heap."};
    }
    }
});




var Delete = Expressions.Delete = Expression.extend({
    _name: "Delete",
    valueCategory: "prvalue",
    type: Types.Void.instance(),
    subMetas : {
        operand : {parsedName : "target", convertTo: Types.Pointer}
    },
    convert : function(){
        // If one of the expressions is a prvalue, make the other one as well
        //if (isA(this.sub.operand.type, Types.Class)){
        //    this.operand = this.sub.operand = standardConversion1(Types.Pointer);
        //}
    },
    typeCheck : function(){

        if (isA(this.operand.type.ptrTo, Types.Class)){
            var classType = this.operand.type.ptrTo;
            var dest = classType.getDestructor();
            //TODO not found and ambiguous
            if (isA(dest, FunctionEntity)){
                //this.assnOp = assnOp;
                //this.type = noRef(assnOp.type.returnType);
                // Attempt standard conversion of rhs to match lhs, without lvalue to rvalue
                //this.rhs = this.sub.rhs = standardConversion(this.rhs, this.lhs.type, {suppressLTR:true});

                this.funcCall = this.funcCall = FunctionCall.instance(this.code, {parent:this});
                this.i_compileChild(this.funcCall, this.compileScope, dest, []);
                this.type = this.funcCall.type;
            }
            else{
                this.semanticProblems.push(CPPError.expr.delete.no_destructor(this, classType));
            }
        }

        // Type check
        if (!isA(this.operand.type, Types.Pointer)) {
            this.semanticProblems.push(CPPError.expr.delete.pointer(this, this.operand.type));
        }
        else if (!this.operand.type.ptrTo.isObjectType){
            this.semanticProblems.push(CPPError.expr.delete.pointerToObjectType(this, this.operand.type));
        }
    },
    stepForward : function(sim, inst){

        if (!inst.alreadyDestructed){
            var ptr = inst.childInstances.operand.evalValue;
            if (Types.Pointer.isNull(ptr.rawValue())){
                this.done(sim, inst);
                return;
            }

            // If it's an array pointer, just grab array object to delete from RTTI.
            // Otherwise ask memory what object it's pointing to.
            var obj;
            if (isA(ptr.type, Types.ArrayPointer)){
                obj = ptr.type.arrObj;
            }
            else{
                obj = sim.memory.getObject(ptr);
            }

            if (!isA(obj, DynamicObjectEntity)) {
                if (isA(obj, AutoObjectInstance)) {
                    sim.alert("Oh no! The pointer you gave to <span class='code'>delete</span> was pointing to something on the stack!");
                }
                else {
                    sim.alert("Oh no! The pointer you gave to <span class='code'>delete</span> wasn't pointing to a valid heap object.");
                }
                this.done(sim, inst);
                return;
            }

            if (isA(obj.type, Types.Array)){
                sim.alert("You tried to delete an array object with a <span class='code'>delete</span> expression. Did you forget to use the delete[] syntax?");
                this.done(sim, inst);
                return;
            }

            //if (!similarType(obj.type, this.operand.type.ptrTo)) {
            //    sim.alert("The type of the pointer you gave to <span class='code'>delete</span> is different than the type of the object I found on the heap - that's a bad thing!");
            //    this.done(sim, inst);
            //    return;
            //}

            if (!obj.isAlive()) {
                DeadObjectMessage.instance(obj, {fromDelete:true}).display(sim, inst);
                this.done(sim, inst);
                return;
            }

            inst.alreadyDestructed = true;
            if(this.funcCall){
                // Set obj as receiver for virtual destructor lookup
                var dest = this.funcCall.createAndPushInstance(sim, inst, obj);
            }
            else{
                return true;
            }
        }
        else{
            var deleted = sim.memory.heap.deleteObject(inst.childInstances.operand.evalValue.value, inst);
            this.done(sim, inst);
        }

    },

    isTailChild : function(child){
        return {isTail: false,
            reason: "The delete operation will happen after the recursive call returns.",
            others: [this]
        };
    }
});


var DeleteArray = Expressions.DeleteArray = Expressions.Delete.extend({
    _name: "DeleteArray",

    stepForward: function(sim, inst){
        var ptr = inst.childInstances.operand.evalValue;
        if(Types.Pointer.isNull(ptr.rawValue())){
            this.done(sim, inst);
            return;
        }

        // If it's an array pointer, just grab array object to delete from RTTI.
        // Otherwise ask memory what object it's pointing to.
        var obj;
        if (isA(ptr.type, Types.ArrayPointer)){
            obj = ptr.type.arrObj;
        }
        else{
            obj = sim.memory.getObject(ptr);
        }

        // Check to make sure we're deleting a valid heap object.
        if (!isA(obj, DynamicObjectEntity)) {
            if (isA(obj, AutoObjectInstance)) {
                sim.alert("Oh no! The pointer you gave to <span class='code'>delete[]</span> was pointing to something on the stack!");
            }
            else {
                sim.alert("Oh no! The pointer you gave to <span class='code'>delete[]</span> wasn't pointing to a valid heap object.");
            }
            this.done(sim, inst);
            return;
        }

        if (!isA(obj.type, Types.Array)) {
            sim.alert("You tried to delete a non-array object with a <span class='code'>delete[]</span> expression. Oops!");
            this.done(sim, inst);
            return;
        }

        //if (!similarType(obj.type.elemType, this.operand.type.ptrTo)) {
        //    sim.alert("The type of the pointer you gave to <span class='code'>delete</span> is different than the element type of the array object I found on the heap - that's a bad thing!");
        //    this.done(sim, inst);
        //    return;
        //}

        if (!obj.isAlive()) {
            DeadObjectMessage.instance(obj, {fromDelete:true}).display(sim, inst);
            this.done(sim, inst);
            return;
        }

        var deleted = sim.memory.heap.deleteObject(inst.childInstances.operand.evalValue.value, inst);
        this.done(sim, inst);
    },

    isTailChild : function(child){
        return {isTail: false,
            reason: "The delete[] operation will happen after the recursive call returns.",
            others: [this]
        };
    }
});

// TODO: This appears to work but I'm pretty sure I copy/pasted from NewExpression and never finished changing it.
var ConstructExpression = Lobster.Expressions.Construct = Expressions.Expression.extend({
    _name: "ConstructExpression",
    valueCategory: "prvalue",
    initIndex: "init",
    compile : function(scope){

        // Compile the type specifier
        this.typeSpec = TypeSpecifier.instance([this.code.type], {parent:this});
        this.semanticProblems.pushAll(this.typeSpec.compile(scope));

        this.type = this.typeSpec.type;

        // Compile declarator if it exists
        if(this.code.declarator) {
            this.declarator = Declarator.instance(this.code.declarator, {parent: this}, this.heapType);
            this.semanticProblems.pushAll(this.declarator.compile(scope));
            this.heapType = this.declarator.type;
        }

        this.entity = this.createTemporaryObject(this.type, "[temp " + this.type + "]");

        if (isA(this.type, Types.Class) || this.code.args.length == 1){
            this.initializer = DirectInitializer.instance(this.code, {parent: this});
            this.i_compileChild(this.initializer, scope, this.entity, this.code.args);
        }
        else{
            this.semanticProblems.push(CPPError.decl.init.scalar_args(this, this.type));
        }

        this.compileTemporarires(scope);

        return this.semanticProblems;
    },

    createInstance : function(sim, parent, receiver){
        var inst = Expression.createInstance.apply(this, arguments);
        inst.tempObject = this.entity.objectInstance(inst);
        return inst;
    },

    upNext : function(sim, inst){
        if (inst.index === "init"){
            var initInst = this.initializer.createAndPushInstance(sim, inst);
            inst.index = "done";
            return true;
        }
        else{
            if (isA(this.type, Types.class)){
                inst.setEvalValue(inst.tempObject);
            }
            else{
                inst.setEvalValue(inst.tempObject.readValue());
            }
            this.done(sim, inst);
        }
    }


});





var KEYWORDS = [
    "alignas", "continue", "friend", "register", "true",
    "alignof", "decltype", "goto", "reinterpret_cast", "try",
    "asm", "default", "if", "return", "typedef",
    "auto", "delete", "inline", "short", "typeid",
    "bool", "do", "int", "signed", "typename",
    "break", "double", "long", "sizeof", "union",
    "case", "dynamic_cast", "mutable", "static", "unsigned",
    "catch", "else", "namespace", "static_assert", "using",
    "char", "enum", "new", "static_cast", "virtual",
    "char16_t", "explicit", "noexcept", "struct", "void",
    "char32_t", "export", "nullptr", "switch", "volatile",
    "class", "extern", "operator", "template", "wchar_t",
    "const", "false", "private", "this", "while",
    "constexpr", "float", "protected", "thread_local",
    "const_cast", "for", "public", "throw"
];

var ALT_OPS = [
    "and", "and_eq", "bitand", "bitor", "compl", "not",
    "not_eq", "or", "or_eq", "xor", "xor_eq"
];

var identifierToText = function(qualId){
    if (Array.isArray(qualId)){ // If it's actually a qualified id
        return qualId.reduce(function(str,id,i){
            return str + (i > 0 ? "::" : "") + id.identifier;
        },"");
    }
    else{
        return qualId; // If it's an unqualified id
    }
};

var Identifier = Expressions.Identifier = Expression.extend({
    _name: "Identifier",
    valueCategory: "lvalue",
    initIndex: false,
    qualifiedNameString : function(names){
        if (!Array.isArray(names)){
            return names;
        }
        return names.map(function(id){return id.identifier}).join("::")
    },
    init: function(code, context){
        this.initParent(code, context);
        this.identifier = this.code.identifier;
        this.identifierText = identifierToText(this.identifier);
    },
    typeCheck : function(){
        checkIdentifier(this, this.identifier, this.semanticProblems);

		try{
            this.entity = this.compileScope.requiredLookup(this.identifier, copyMixin(this.context, {isThisConst:this.context.func.type.isThisConst}));

            if(isA(this.entity, CPPEntity)) {
                this.type = this.entity.type;
                if(isA(this.type, Types.IStream)){
                    this.semanticProblems.push(makeError(this, "warning", "Sorry, <span class='code'>cin</span> is not supported yet :(."));
                }
            }

            if (isA(this.type, Types.Reference)){
                this.type = this.type.refTo;
            }
        }
        catch(e){
            if (isA(e, SemanticExceptions.BadLookup)){
                this.semanticProblems.push(e.annotation(this));
            }
            else{
                throw e;
            }
        }

	},

    upNext : function(sim, inst){
        inst.setEvalValue(this.entity.lookup(sim, inst));

        this.done(sim, inst);
        return true;
    },

    describeEvalValue : function(depth, sim, inst){
        if (inst && inst.evalValue){
            return inst.evalValue.describe();
        }
        // Note don't care about depth since we always just use identifier
        else{
            return this.entity.describe(sim, inst);
        }
    },

    explain : function(sim, inst) {
        return {message: this.entity.name};
    }
});




var ThisExpression = Expressions.ThisExpression = Expression.extend({
    _name: "ThisExpression",
    valueCategory: "prvalue",
    compile : function(scope){
        var func = this.context.func;
        if (func.isMemberFunction){
            this.type = Types.Pointer.instance(func.receiverType);
        }
        else{
            this.semanticProblems.push(CPPError.expr.this_memberFunc(this));
        }
        return this.semanticProblems;
    },
    stepForward : function(sim, inst){
        // Set this pointer with RTTI to point to receiver
        inst.setEvalValue(Value.instance(inst.funcContext.receiver.address, Types.ObjectPointer.instance(inst.funcContext.receiver)));
        this.done(sim, inst);
    }
});

var EntityExpression = Expressions.EntityExpression = Expression.extend({
    _name: "EntityExpression",
    valueCategory: "lvalue",
    init : function(entity, code, context){
        this.initParent(code, context);
        this.entity = entity;
        this.type = this.entity.type;
    },
    compile : function(scope){
        return this.semanticProblems;
    },
    upNext : function(sim, inst){
        inst.setEvalValue(this.entity.lookup(sim, inst));
        this.done(sim, inst);
    }
});





var parseCPPChar = function(litValue){
    return escapeString(litValue).charCodeAt(0);
};

var literalJSParse = {
	"int": parseInt,
	"float": parseFloat,
	"double": parseFloat,
    "char": parseCPPChar,
    "string": escapeString
};
var literalTypes = {
	"int": Types.Int.instance(),
	"float": Types.Double.instance(),
	"double": Types.Double.instance(),
    "bool": Types.Bool.instance(),
    "char" : Types.Char.instance(),
    "string": Types.String.instance()
};

var Literal = Expressions.Literal = Expression.extend({
    _name: "Literal",
    initIndex: false,
    compile : function(scope){
		
		var semanticProblems = this.semanticProblems;
		var code = this.code;
		
		var conv = literalJSParse[code.type];
		var val = (conv ? conv(code.value) : code.value);
		
		var typeClass = literalTypes[code.type];
        this.type = typeClass;
        this.valueCategory = "prvalue";
        this.value = Value.instance(val, this.type);  //TODO fix this (needs type?)

//        if (code.type === "string"){
//            this.type = Types.Array.instance(Types.Char, val.length+1);
//            this.valueCategory = "prvalue";
//            val = val.split("");
//            val.push(0);
//            this.value = Value.instance(val, this.type);
//        }

		return semanticProblems;
	},

    upNext : function(sim, inst){
        inst.evalValue = this.value;
        this.done(sim, inst);
        return true;
    },

    describeEvalValue : function(depth, sim, inst){
        var str = this.value.toString();
        return {name: str, message: str};
    }
	
//	stepForward : function(sim, inst){
//		this.done(sim, inst);
//		return true;
//	}
});

var Parentheses = Expressions.Parentheses = Expression.extend({
    _name: "Parentheses",
    subMetas:{
        subExpr: {parsedName: "sub"}
    },

    typeCheck : function(){
        this.type = this.subExpr.type;
        this.valueCategory = this.subExpr.valueCategory;

    },

    upNext : function(sim, inst) {
        if (inst.index == "subexpressions") {
            this.pushChildInstances(sim, inst);
            inst.index = "done";
            return true;
        }
        else {
            inst.setEvalValue(inst.childInstances.subExpr.evalValue);
            this.done(sim, inst);
        }
        return true;
    },

    isTailChild : function(child){
        return {isTail: true};
    }
});

// hack to make sure I don't mess up capitalization
for (var key in Expressions){
	Expressions[key.toLowerCase()] = Expressions[key];
}
