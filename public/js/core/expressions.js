var Lobster = Lobster || {};

Lobster.Expressions = {};
var Expressions = Lobster.Expressions;

var VALUE_ID = 0;

var Value = Class.extend({
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
    valueToOstreamString : function(){
        return this.type.valueToOstreamString(this.value);
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
/**
 * Standard compilation phase for expressions:
 *   1. Compile children (with no special context - if this is needed, you'll need to override compile())
 *   2. Perform any conversions specified in this.i_childrenToConvert. the lvalue-to-rvalue conversion is not suppressed
 *   3. If any errors have been reported by children, abort. The rest of the sequence is skipped
 *   4. Call the this.convert() hook. Put custom conversion code here.
 *   5. Call the this.typeCheck() hook. Put custom typechecking here. After this function is called, the expression should
 *      have this.type and this.valueCategory set correct, although this does not mean the function necessarily has to do
 *      this (e.g. some expressions always have the same type or value category, so these properties may be set initially
 *      at the class level).
 *   6. Compile any temporary objects for whom this is the enclosing full expression.
 *
 */
var Expression = Expressions.Expression = CPPConstruct.extend({
    _name: "Expression",
    type: Types.Unknown.instance(),
    initIndex : "subexpressions",
    instType : "expr",
    conversionLength: 0,

    i_childrenToConvert : {},
    i_childrenToExecute : [],

    i_convertChildren: function() {
        for (var childName in this.i_childrenToConvert) {
            this[childName] = standardConversion(this[childName], this.i_childrenToConvert[childName]);
        }
    },

    compile : function() {

        // Parent compile - will compile all children specified in i_childrenToCreate
        CPPConstruct.compile.apply(this, arguments);

        // Apply any standard conversions specified in i_childrenToConvert
        this.i_convertChildren();

        // If subexpressions have problems, just forget it :(
        if (this.hasErrors()) {
            return;
        }

        // Attempt custom conversions
        this.convert();

        // Type check
        this.typeCheck();

        this.compileTemporarires();


        // if (this.isFullExpression()){
        //     this.semanticProblems.addWidget(ExpressionAnnotation.instance(this));
        // }
    },
    compileTemporarires : function(){
        if (this.temporaryObjects) {
            this.temporariesToDestruct = [];
            for (var entId in this.temporaryObjects){
                var tempEnt = this.temporaryObjects[entId];
                if (isA(tempEnt.type, Types.Class)){
                    var dest = tempEnt.type.destructor;
                    if (dest) {
                        var call = FunctionCall.instance({args: []}, {parent: this});
                        call.compile({func: dest, receiver: tempEnt});
                        this.temporariesToDestruct.push(call);
                    }
                    else{
                        this.addNote(CPPError.declaration.dtor.no_destructor_temporary(tempEnt.creator.model, tempEnt));
                    }
                }
            }

            this.tempDeallocator = Statements.TemporaryDeallocator.instance(null, {parent: this});
            this.tempDeallocator.compile(this.temporaryObjects);
        }
    },

    convert : function(){

    },
    typeCheck : function(){

    },

    // processNonMemberOverload : function(args, op){
    //     try{
    //         var overloadedOp = this.contextualScope.requiredLookup("operator"+op, {
    //             own:true, paramTypes:args.map(function(arg){return arg.type;})
    //         });
    //         this.funcCall = this.sub.funcCall = FunctionCall.instance(this.code, {parent:this});
    //         this.sub.funcCall.compile(overloadedOp, args.map(function(arg){return arg.code;}));
    //         this.type = this.sub.funcCall.type;
    //         this.valueCategory = this.sub.funcCall.valueCategory;
    //         this.i_childrenToExecute = this.i_childrenToExecuteForOverload;
    //     }
    //     catch(e){
    //         if (isA(e, SemanticExceptions.BadLookup)){
    //             this.addNote(CPPError.expr.overloadLookup(this, op));
    //             this.addNote(e.annotation(this));
    //             return;
    //         }
    //         else{
    //             throw e;
    //         }
    //     }
    // },


    compileMemberOverload : function(thisArg, argAsts, op){
        var auxArgs = argAsts.map(function(argAst){
            return CPPConstruct.create(argAst, {parent: this, auxiliary: true});
        });

        try{
            var overloadedOp = thisArg.type.classScope.requiredLookup("operator"+op, {
                own:true, paramTypes:auxArgs.map(function(arg){return arg.type;})
            });

            this.isOverload = true;
            this.isMemberOverload = true;
            this.funcCall = FunctionCall.instance({args: argAsts}, {parent:this});
            this.funcCall.compile({func: overloadedOp});
            this.type = this.funcCall.type;
            this.valueCategory = this.funcCall.valueCategory;
            this.i_childrenToExecute = this.i_childrenToExecuteForMemberOverload;
        }
        catch(e){
            if (isA(e, SemanticExceptions.BadLookup)){
                this.addNote(CPPError.expr.overloadLookup(this, op));
                this.addNote(e.annotation(this));
                return;
            }
            else{
                throw e;
            }
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
        if (this.isAuxiliary()){
            return true;
        }

        // Special case - initializer that is in context of declaration and does not require function call is not
        // considered an expression.
        // So if our parent is one of these, then we are the full expression!
        var parent = this.parent;
        if (isA(parent, Initializer) && (isA(parent.parent, Declaration) && !parent.makesFunctionCall)){
            return true;
        }

        return !isA(this.parent, Expression);
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
            return this.parent.findFullExpression();
        }
    },

    // TODO NEW It appears this was once used, but as far as I can tell, it does
    // nothing because it is only called once from the CPPConstruct constructor and
    // on the first call, it just delegates the work to the parent class version.
    // I've commented it out for now and will remove it later after regression
    // testing is more mature.
    // setContext : function(context){
    //     // Don't do anything special for first time
    //     if (!this.parent){
    //         CPPConstruct.setContext.apply(this, arguments);
    //         return;
    //     }
    //
    //     var oldFull = this.findFullExpression();
    //     CPPConstruct.setContext.apply(this, arguments);
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
            return {message: "the result of " + this.getSourceText()};
        }
        else{
            return {message: "the result of " + this.getSourceText()};
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

        return CPPConstruct.upNext.apply(this, arguments);
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

	}
});


Expressions.Unsupported = Expression.extend({
    _name: "Unsupported",
    valueCategory: "prvalue",
    typeCheck : function(){
        this.addNote(CPPError.expr.unsupported(this, this.englishName ? "(" + this.englishName + ")" : ""));
    }
});

Expressions.Null = Expression.extend({
    _name: "Null",
    valueCategory: "prvalue",
    createAndPushInstance : function(sim, inst){
        // Do nothing
    }
});




Expressions.Comma = Expression.extend({
    _name: "Comma",
    englishName: "comma",
    i_childrenToCreate : ["left", "right"],
    i_childrenToExecute : ["left", "right"],
    typeCheck : function(){
        this.type = this.right.type;
        this.valueCategory = this.right.valueCategory;
    },

    stepForward : function(sim, inst){

        // Evaluate subexpressions
        if (inst.index === "operate"){
            inst.setEvalValue(inst.childInstances.right.evalValue);
            this.done(sim, inst);
        }
    },

    isTailChild : function(child){
        if (child === this.right){
            return {isTail: true,
                reason: "The recursive call is on the right side of the comma, so it is guaranteed to be evaluated last."
            };
        }
        else{
            return {isTail: false,
                reason: "The expression on the right of the comma will be evaluated after the recursive call.",
                others: [this.right]
            };
        }
    }
});


Expressions.Ternary = Expression.extend({
    _name: "Ternary",
    englishName: "ternary",
    i_childrenToCreate : ["condition", "then", "otherwise"],
    i_childrenToConvert : {
        condition: Types.Bool.instance()
    },
    initIndex: "cond",

    convert : function(){
        // If one of the expressions is a prvalue, make the other one as well
        if (this.then.valueCategory === "prvalue" && this.otherwise.valueCategory === "lvalue"){
            this.otherwise = standardConversion1(this.otherwise);
        }
        else if (this.otherwise.valueCategory === "prvalue" && this.then.valueCategory === "lvalue"){
            this.then = standardConversion1(this.then);
        }
    },

    typeCheck : function(){
        if (!isA(this.condition.type, Types.Bool)){
            this.addNote(CPPError.expr.ternary.condition_bool(this.condition, this.condition.type));
        }
        if (!sameType(this.then.type, this.otherwise.type)) {
            this.addNote(CPPError.expr.ternary.sameType(this, this.then, this.otherwise));
        }
        if (isA(this.then.type, Types.Void) || isA(this.otherwise.type, Types.Void)) {
            this.addNote(CPPError.expr.ternary.noVoid(this, this.then, this.otherwise));
        }
        if (this.then.valueCategory !== this.otherwise.valueCategory){
            this.addNote(CPPError.expr.ternary.sameValueCategory(this));
        }

        this.type = this.then.type;
        this.valueCategory = this.then.valueCategory;
    },

    upNext : function(sim, inst){
        if (inst.index === "cond"){
            inst.condition = this.condition.createAndPushInstance(sim, inst);
            inst.index = "checkCond";
            return true;
        }
        else if (inst.index === "checkCond"){
            if(inst.condition.evalValue.value){
                inst.then = this.then.createAndPushInstance(sim, inst);
            }
            else{
                inst.otherwise = this.otherwise.createAndPushInstance(sim, inst);
            }
            inst.index = "operate";
            return true;
        }
    },

    stepForward : function(sim, inst){

        // Evaluate subexpressions
        if (inst.index === "operate"){
            inst.setEvalValue(inst.condition.evalValue.value ? inst.then.evalValue : inst.otherwise.evalValue);
            this.done(sim, inst);
        }
    },

    isTailChild : function(child){
        if (child === this.condition){
            return {isTail: false,
                reason: "One of the two subexpressions in the ternary operator will be evaluated after the function call.",
                others: [this.then, this.otherwise]
            };
        }
        else{
            return {isTail: true};
        }
    }
});

/**
 * @property {Expression} lhs
 * @property {?Expression} rhs - only available after compilation. may be null, either if lhs has compilation errors
 * and isn't well-typed, or if this is an overloaded assignment.
 * @property {?FunctionCall} funcCall - only available after compilation. may be null, either if lhs has compilation
 * errors and isn't well-typed, or if this is a regular, non-overloaded assignment
 *
 */
var Assignment = Expressions.Assignment = Expression.extend({
    _name: "Assignment",
    valueCategory : "lvalue",
    isOverload : false,
    isMemberOverload : true,
    i_childrenToCreate : ["lhs"],
    i_childrenToExecute : ["lhs", "rhs"],
    i_childrenToExecuteForOverload : ["lhs", "funcCall"], // does not include rhs because function call does that

    convert : function(){

        // If the lhs doesn't have a type, the rest of the analysis doesn't make much sense.
        if (!this.lhs.isWellTyped()){
            return;
        }

        // Check for overloaded assignment
        // NOTE: don't have to worry about lhs reference type because it will have been adjusted to non-reference
        if (isA(this.lhs.type, Types.Class)){
            // Class-type LHS means we check for an overloaded = operator

            // Compile the RHS as an auxiliary expression so that we can figure out its type without impacting the construct tree
            var auxRhs = CPPConstruct.create(this.ast.rhs, {parent: this, auxiliary: true});
            auxRhs.compile();

            try{
                // Look for an overloaded = operator that we can use with an argument of the RHS type
                // Note: "own" here means don't look in parent scope containing the class definition, but we still
                // look in the scope of any base classes that exist due to the class scope performing member lookup
                var assnOp = this.lhs.type.classScope.requiredLookup("operator=", {
                    own:true, paramTypes:[auxRhs.type]
                });

                // TODO: It looks like this if/else isn't necessary due to requiredLookup throwing an exception if not found
                if (assnOp){
                    this.isOverload = true;
                    this.isMemberOverload = true;
                    this.funcCall = FunctionCall.instance({args: [this.ast.rhs]}, {parent:this});
                    this.funcCall.compile({func: assnOp});
                    this.type = this.funcCall.type;
                    this.i_childrenToExecute = this.i_childrenToExecuteForOverload;
                }
                else{
                    this.addNote(CPPError.expr.assignment.not_defined(this, this.lhs.type));
                }
            }
            catch(e){
                if (isA(e, SemanticExceptions.BadLookup)){
                    this.addNote(CPPError.expr.overloadLookup(this, "="));
                    this.addNote(e.annotation(this));
                }
                else{
                    throw e;
                }
            }
        }
        else{
            // Non-class type, so this is regular assignment. Create and compile the rhs, and then attempt
            // standard conversion of rhs to match cv-unqualified type of lhs, including lvalue to rvalue conversion
            this.rhs = this.i_createAndCompileChildExpr(this.ast.rhs, this.lhs.type.cvUnqualified());
        }
    },

    typeCheck : function(){

        // If the lhs doesn't have a type, we didn't make an rhs or a funcCall, so we can't type check anything
        if (!this.lhs.isWellTyped()){
            return;
        }

        // All type checking is handled by the function call child if it's overloaded.
        if (this.funcCall){
            return;
        }

        // ----- Type checking below here is only applied for regular, non-overloaded assignment -----

        if (this.lhs.valueCategory != "lvalue") {
            this.addNote(CPPError.expr.assignment.lhs_lvalue(this));
        }

        if (this.lhs.type.isConst) {
            this.addNote(CPPError.expr.assignment.lhs_const(this));
        }

        if (!this.rhs.isWellTyped()){
            return;
        }

        if (!sameType(this.rhs.type, this.lhs.type.cvUnqualified())) {
            this.addNote(CPPError.expr.assignment.convert(this, this.lhs, this.rhs));
        }

        // warning for self assignment
        if (isA(this.lhs, Identifier) && isA(this.rhs, Identifier) && this.lhs.entity === this.rhs.entity){
            this.addNote(CPPError.expr.assignment.self(this, this.lhs.entity));
        }

        this.type = this.lhs.type;
    },

    upNext : Class.ADDITIONALLY(function(sim, inst){
        if (this.funcCall){
            this.funcCall.setReceiver(sim, inst.childInstances.funcCall, RuntimeEntity.instance(this.lhs.type, inst.childInstances.lhs));
        }
    }),

    stepForward : function(sim, inst){

        if (inst.index == "operate"){

            if (this.funcCall){
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

// TODO: there might be a better way to implement this. currently it reuses code from BinaryOperator, but I feel
// a little bit icky about how it does it and the way it treats the construct tree
var CompoundAssignment = Expressions.CompoundAssignment = Expression.extend({
    _name: "CompoundAssignment",
    valueCategory : "lvalue",

    i_createFromAST: function(ast){
        CompoundAssignment._parent.i_createFromAST.apply(this, arguments);

        // Basically this uses a binary operator expression to do most of the work
        // e.g. x += y should be equivalent (to a certain extent) to x = x + y

        this.operator = ast.operator;
        var binaryOp = this.operator.substring(0, this.operator.length-1); // remove the = from the operator e.g. += becomes +
        var binAst = copyMixin(ast, {
            left: ast.lhs,
            right: ast.rhs,
            operator: binaryOp
        });
        var binaryOpClass = BINARY_OPS[binaryOp];
        this.i_binaryOp = binaryOpClass.instance(binAst, {parent: this});
    },

    compile : function() {

        //compiles left and right
        this.i_binaryOp.compile();

        if(this.hasErrors()){
            return;
        }

        // left should be a standard conversion sequence
        // we want to extract the pre-conversion expression for lhs
        this.lhs = beneathConversions(this.i_binaryOp.left);

        // Attempt to convert rhs (a binary operation) back to type of lhs
        this.rhs = standardConversion(this.i_binaryOp, this.lhs.type);

        // Type Check
        if (this.lhs.valueCategory !== "lvalue") {
            this.addNote(CPPError.expr.assignment.lhs_lvalue(this));
        }

        if (!sameType(this.rhs.type, this.lhs.type)) {
            this.addNote(CPPError.expr.assignment.convert(this, this.lhs, this.rhs));
        }

        this.type = this.lhs.type;

        this.compileTemporarires();
    },

    upNext : function(sim, inst){
        // Evaluate subexpressions
        if (inst.index == "subexpressions") {
            inst.rhs = this.rhs.createAndPushInstance(sim, inst);
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

var BinaryOperator = Expressions.BinaryOperator = Expression.extend({
    _name: "BinaryOperator",
    valueCategory : "prvalue",
    isOverload : false,
    i_childrenToExecute : ["left", "right"],
    i_childrenToExecuteForMemberOverload : ["left", "funcCall"], // does not include rhs because function call does that
    i_childrenToExecuteForOverload : ["funcCall"], // does not include rhs because function call does that

    instance: function(ast, context) {

        // ONLY if instance was called directly on Expressions.BinaryOperator, then we want
        // to sneakily select the correct derived class and instantiate that instead :)
        if (this === Expressions.BinaryOperator){
            var desiredSubClass = BINARY_OPS[ast.operator];
            return desiredSubClass.instance(ast, context);
        }

        // Otherwise (e.g. if called on a derived class this inherits this instance function), just use
        // the regular instance function from the parent class.
        return Expression.instance.apply(this, arguments);
    },


    i_createFromAST : function(ast, context){
        BinaryOperator._parent.i_createFromAST.apply(this, arguments);
        this.associativity = ast.associativity;
        this.operator = ast.operator;
    },

    compile : function(){

        // Compile left
        var auxLeft = CPPConstruct.create(this.ast.left, {parent: this, auxiliary: true});
        var auxRight = CPPConstruct.create(this.ast.right, {parent: this, auxiliary: true});

        auxLeft.compile();
        auxRight.compile();

        // If either has problems that prevent us from determining type, nothing more can be done
        if (!auxLeft.isWellTyped() || !auxRight.isWellTyped()){

            // Add the notes from the auxiliary arguments to explain what went wrong
            // (they weren't added normally since they were auxiliary)
            var self = this;
            auxLeft.getNotes().forEach(function(note) {self.addNote(note);});
            auxRight.getNotes().forEach(function(note) {self.addNote(note);});

            return;
        }

        // We have a type for both the left and right operands, so we next check whether we're looking for an
        // operator overload. That's the case if either of the operands has class type.
        if (isA(auxLeft.type, Types.Class) || isA(auxRight.type, Types.Class)){
            // Overload case

            // First, look for a member overload in left class type.
            var overloadOp = auxLeft.type.classScope && auxLeft.type.classScope.singleLookup("operator" + this.operator, {
                own:true, paramTypes:[auxRight.type]
            });

            // If we didn't find a member overload, next look for a non-member overload
            if (!overloadOp) {
                overloadOp = this.contextualScope.singleLookup("operator" + this.operator, {
                    paramTypes: [auxLeft.type, auxRight.type]
                });
            }

            if (overloadOp){
                this.isOverload = true;
                this.isMemberOverload = isA(overloadOp, MemberFunctionEntity);


                if (this.isMemberOverload){
                    // Member overload means left operand is our direct child, right operand is argument to function call
                    this.left = this.i_createAndCompileChildExpr(this.ast.left);
                    this.funcCall = FunctionCall.instance({args: [this.ast.right]}, {parent:this});
                    this.funcCall.compile({func: overloadOp});
                    this.i_childrenToExecute = this.i_childrenToExecuteForMemberOverload;
                }
                else{
                    // Non-member overload means both left and right are arguments of the function call
                    this.funcCall = FunctionCall.instance({args: [this.ast.left, this.ast.right]}, {parent:this});
                    this.funcCall.compile({func: overloadOp});
                    this.i_childrenToExecute = this.i_childrenToExecuteForOverload;
                }

                this.type = this.funcCall.type;
                this.valueCategory = this.funcCall.valueCategory;
            }
            else{
                // TODO: add in notes from attempted lookup operations for the member and non-member overloads
                this.addNote(CPPError.expr.binary.overload_not_found(this, this.operator, auxLeft.type, auxRight.type));
            }
        }
        else{
            // Non-overload case

            this.left = this.i_createAndCompileChildExpr(this.ast.left);
            this.right = this.i_createAndCompileChildExpr(this.ast.right);

            // If either has problems that prevent us from determining type, nothing more can be done
            if (!this.left.isWellTyped() || !this.right.isWellTyped()) {
                return;
            }

            this.convert();

            this.typeCheck();
        }

        // TODO: this used to just be in the else case, but I think that was a mistake
        this.compileTemporarires();
    },

    usualArithmeticConversions : function(){
        // Only do conversions if both are arithmetic
        if (!this.left.type.isArithmeticType || !this.right.type.isArithmeticType){
            return;
        }

        // TODO If either has scoped enumeration type, no conversions are performed

        // TODO If either is long double, the other shall be converted to long double

        // If either is double, the other shall be converted to double
        if (isA(this.left.type, Types.Double)){
            this.right = standardConversion(this.right, Types.Double.instance(), {suppressLTR:true});
            return;
        }
        if (isA(this.right.type, Types.Double)){
            this.left = standardConversion(this.left, Types.Double.instance(), {suppressLTR:true});
            return;
        }
        // If either is float, the other shall be converted to float

        if (isA(this.left.type, Types.Float)){
            this.right = standardConversion(this.right, Types.Float.instance(), {suppressLTR:true});
            return;
        }
        if (isA(this.right.type, Types.Float)){
            this.left = standardConversion(this.left, Types.Float.instance(), {suppressLTR:true});
            return;
        }

        // Otherwise, do integral promotions
        this.left = integralPromotion(this.left);
        this.right = integralPromotion(this.right);

        // If both operands have the same type, no further conversion is needed
        if (sameType(this.left.type, this.right.type)){
            return;
        }

        // Otherwise, if both operands have signed or both have unsigned types,
        // operand with type of lesser integer conversion rank shall be converted
        // to the type of the operand with greater rank

    },

    convert : function(){
        this.left = standardConversion1(this.left);
        this.right = standardConversion1(this.right);

        if (this.left.type.isArithmeticType && this.right.type.isArithmeticType) { // Regular arithmetic
            this.usualArithmeticConversions();
            // After usual arithmetic conversions they should be the same type
        }
    },

    // Default typecheck assumes the operands should be the same type
    typeCheck : function(){
        if (sameType(this.left.type, this.right.type)){
            if (!this.requiresArithmeticOperands || this.left.type.isArithmeticType && this.right.type.isArithmeticType){
                if(!this.type || isA(this.type, Types.Unknown)){
                    this.type = this.left.type;
                }
                return true;
            }
        }

        this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, this.left, this.right));
        return false;
    },

    upNext : function(sim, inst){
        // Push lhs, rhs, and function call (if lhs class type)
        var toReturn = Expression.upNext.apply(this, arguments);

        // If using an overloaded member operator, set receiver for function call instance
        if (this.funcCall && this.isMemberOverload){
            this.funcCall.setReceiver(sim, inst.childInstances.funcCall, RuntimeEntity.instance(this.left.type, inst.childInstances.left));
        }

        return toReturn;
    },

	stepForward : function(sim, inst){
        if (inst.index === "operate"){
            if (this.funcCall){
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
            reason: "The " + this.operator + " operation will happen after the recursive call.",
            others: [this]
        };
    }
});

// TODO cv-combined types and composite pointer types

Expressions.BinaryOperatorRelational = Expressions.BinaryOperator.extend({
    _name: "BinaryOperatorRelational",
    type: Types.Bool.instance(),

    convert : function(){
        Expressions.BinaryOperator.convert.apply(this);

        if (isA(this.left.type, Types.Pointer) && isA(this.right, Literal) && isA(this.right.type, Types.Int) && this.right.value.rawValue() == 0){
            this.right = Conversions.NullPointerConversion.instance(this.right, this.left.type);
        }
        if (isA(this.right.type, Types.Pointer) && isA(this.left, Literal) && isA(this.left.type, Types.Int) && this.left.value.rawValue() == 0){
            this.left = Conversions.NullPointerConversion.instance(this.left, this.right.type);
        }
    },

    typeCheck : function(){

        // Note: typeCheck is only called if it's not an overload

        if (isA(this.left.type, Types.Pointer)){
            if (!isA(this.right.type, Types.Pointer)){
                // TODO this is a hack until I implement functions to determine cv-combined type and composite pointer types
                this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, this.left, this.right));
                return false;
            }
        }
        else if (!Expressions.BinaryOperator.typeCheck.apply(this)){
            return false;
        }

        // after first if, we know left and right have same type
        else if(this.left.type.isArithmeticType){
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
            this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, this.left, this.right));
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


Expressions.BinaryOperatorLogical = Expressions.BinaryOperator.extend({
    _name: "BinaryOperatorLogical",
    type: Types.Bool.instance(),

    convert : function(){
        // Don't do binary operator custom conversions
        this.left = standardConversion(this.left, Types.Bool.instance());
        this.right = standardConversion(this.right, Types.Bool.instance());
    },

    typeCheck : function(){
        if (!Expressions.BinaryOperator.typeCheck.apply(this)){
            return false;
        }
        else if(isA(this.left.type, Types.Bool)){
            return true;
        }
        else{
            this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, this.left, this.right));
        }
    },

    upNext : function(sim, inst){
        // Override this to prevent general pushSubexpressions
        // and ensure that short circuit is done correctly.

        // Don't do special stuff if it's an overload
        if (this.isOverload){
            return Expressions.BinaryOperator.upNext.apply(this, arguments);
        }

        if (inst.index === "subexpressions") {
            inst.childInstances = {};
            inst.childInstances.left = this.left.createAndPushInstance(sim, inst);
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
                inst.childInstances.right = this.right.createAndPushInstance(sim, inst);
                inst.send("wait", 1);
                inst.index = "operate";
                return true;
            }
        }
        return false;
    },
    stepForward : function(sim, inst){
        if (inst.index == "operate") {
            return Expressions.BinaryOperator.stepForward.apply(this, arguments);
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
        if (child === this.left){
            return {isTail: false,
                reason: "The right operand of the " + this.operator + " operator may need to be checked if it does not short circuit.",
                others: [this.right]
            };
        }
        else{
            return {isTail: true,
                reason: "Because the " + this.operator + " operator short circuits, the right operand is guaranteed to be evaluated last and its result is used directly (no combination with left side needed)."
            };
        }
    }


});


var BINARY_OPS = Expressions.BINARY_OPS = {
    "|" : Expressions.Unsupported.extend({
        _name: "BinaryOperator[|]",
        englishName: "bitwise or"
    }),
    "&" : Expressions.Unsupported.extend({
        _name: "BinaryOperator[&]",
        englishName: "bitwise and"
    }),
    "^" : Expressions.Unsupported.extend({
        _name: "BinaryOperator[^]",
        englishName: "bitwise xor"
    }),
    "||": Expressions.BinaryOperatorLogical.extend({
        _name: "BinaryOperator[||]",
        shortCircuitValue: true,
        combine : function(left, right){
            return left || right;
        }
    }),
    "&&": Expressions.BinaryOperatorLogical.extend({
        _name: "BinaryOperator[&&]",
        shortCircuitValue: false,
        combine : function(left, right){
            return left && right;
        }
    }),
    "+": Expressions.BinaryOperator.extend({
        _name: "BinaryOperator[+]",

        typeCheck : function(){
            // Check if it's pointer arithmetic
            if (isA(this.left.type, Types.Pointer) || isA(this.right.type, Types.Pointer)) {
                if (isA(this.right.type, Types.Pointer)){
                    // Switch so left operand is always the pointer
                    var temp = this.left;
                    this.left = this.right;
                    this.right = temp;
                }

                if (this.right.type.isIntegralType || this.right.type.isEnum){
                    this.type = this.left.type;
                    this.isPointerArithmetic = true;
                    this.type = this.left.type;
                    return true;
                }
            }
//            else if(!Expressions.BinaryOperator.typeCheck.apply(this)){
//                return false;
//            }
            else if(this.left.type.isArithmeticType && this.right.type.isArithmeticType){
                this.type = this.left.type;
                return true;
            }

            this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, this.left, this.right));
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

    "-": Expressions.BinaryOperator.extend({
        _name: "BinaryOperator[-]",

        typeCheck : function(){

            // Check if it's pointer arithmetic
            if (isA(this.left.type, Types.Pointer) && isA(this.right.type, Types.Pointer) && similarType(this.left.type, this.right.type)) {
                this.type = Types.Int.instance();
                this.valueCategory = "prvalue";
                this.isPointerArithmetic = true;
                return true;
            }
            else if (isA(this.left.type, Types.Pointer) && this.right.type.isIntegralType) {
                this.type = this.left.type;
                this.valueCategory = "prvalue";
                this.isPointerArithmetic = true;
                return true;
            }
            else if(!Expressions.BinaryOperator.typeCheck.apply(this)){
                return false;
            }
            else if(this.left.type.isArithmeticType && this.right.type.isArithmeticType){
                return true;
            }

            this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, this.left, this.right));
        },

        operate : function(left, right, sim, inst){
            if (this.isPointerArithmetic) {
                if (this.right.type.isIntegralType){
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
    "*": Expressions.BinaryOperator.extend({
        _name: "BinaryOperator[*]",
        requiresArithmeticOperands : true,

        operate : function(left, right, sim, inst){
            return Value.instance(left.value * right.value, this.left.type); // TODO match C++ arithmetic
        }

    }),
    "/": Expressions.BinaryOperator.extend({
        _name: "BinaryOperator[/]",
        requiresArithmeticOperands : true,

        operate : function(left, right, sim, inst){
            if (this.left.type.isIntegralType){
                return Value.instance(integerDivision(left.value, right.value), this.left.type); // TODO match C++ arithmetic
            }
            else{
                return Value.instance(floatingDivision(left.value, right.value), this.left.type); // TODO match C++ arithmetic
            }

        }

    }),
    "%": Expressions.BinaryOperator.extend({
        _name: "BinaryOperator[%]",
        requiresArithmeticOperands : true,

        typeCheck : function(){
            if (!Expressions.BinaryOperator.typeCheck.apply(this)){
                return false;
            }
            else if(this.left.type.isIntegralType && this.right.type.isIntegralType){
                return true;
            }
            else{
                this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, this.left, this.right));
            }
        },

        operate : function(left, right, sim, inst){
            return Value.instance(modulo(left.value, right.value), this.left.type); // TODO match C++ arithmetic
        }

    }),
    "<": Expressions.BinaryOperatorRelational.extend({
        _name: "BinaryOperator[<]",
        compare : function(left, right){
            return left < right;
        }

    }),
    "==": Expressions.BinaryOperatorRelational.extend({
        _name: "BinaryOperator[==]",
        allowDiffArrayPointers: true,
        compare : function(left, right){
            return left == right;
        }

    }),
    "!=": Expressions.BinaryOperatorRelational.extend({
        _name: "BinaryOperator[!=]",
        allowDiffArrayPointers: true,
        compare : function(left, right){
            return left != right;
        }

    }),
    ">": Expressions.BinaryOperatorRelational.extend({
        _name: "BinaryOperator[>]",
        compare : function(left, right){
            return left > right;
        }

    }),
    "<=": Expressions.BinaryOperatorRelational.extend({
        _name: "BinaryOperator[<=]",
        compare : function(left, right){
            return left <= right;
        }

    }),
    ">=": Expressions.BinaryOperatorRelational.extend({
        _name: "BinaryOperator[>=]",
        compare : function(left, right){
            return left >= right;
        }

    }),
    "<<": Expressions.BinaryOperator.extend({

        operate: function(left, right, sim, inst){
            if (isA(this.left.type, Types.OStream)) {
                sim.cout(right);
            }
            return left;
        },
        convert : function(){
            // only do lvalue to rvalue for right
            this.right = standardConversion1(this.right);
        },
        typeCheck : function(){
            if (isA(this.left.type, Types.OStream) && !isA(this.right.type, Types.Void)) {
                this.type = this.left.type;
                this.valueCategory = this.left.valueCategory;
                return true;
            }

            this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, this.left, this.right));
        },
        stepForward : function(sim, inst){
            Expressions.BinaryOperator.stepForward.apply(this, arguments);

            // Peek at next expression. If it is also << operator or a literal or endl, then go ahead
            var next = sim.peek();
            return isA(next.model, BINARY_OPS["<<"]) || isA(next.model, Literal) || isA(next.model, Conversions.LValueToRValue) && isA(next.model.from, Identifier) && next.model.from.entity === sim.endlEntity;
        }
    }),
    ">>": Expressions.BinaryOperator.extend({

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

            this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, this.left, this.right));
        }
    })
};




var UnaryOp = Expressions.UnaryOp = Expression.extend({
    _name: "UnaryOp",
    i_childrenToExecute : ["operand"],
    i_childrenToExecuteForMemberOverload : ["operand", "funcCall"], // does not include rhs because function call does that
    i_childrenToExecuteForOverload : ["funcCall"], // does not include rhs because function call does that

    i_createFromAST : function(ast, context){
        UnaryOp._parent.i_createFromAST.apply(this, arguments);
        this.operator = ast.operator;
    },

    compile : function(){

        var auxOperand = CPPConstruct.create(this.ast.operand, {parent: this, auxiliary: true});
        auxOperand.compile();

        if (isA(auxOperand.type, Types.Class)){
            // If it's of class type, we look for overloads
            var overloadOp = auxOperand.type.classScope.singleLookup("operator" + this.operator, {
                own:true, paramTypes:[]
            });
            if (!overloadOp) {
                overloadOp = this.contextualScope.singleLookup("operator" + this.operator, {
                    paramTypes: [auxOperand.type]
                });
            }

            if (overloadOp){
                this.isOverload = true;
                this.isMemberOverload = isA(overloadOp, MemberFunctionEntity);

                if (this.isMemberOverload){
                    // Member overload means operand is our direct child, and no arguments to function call
                    this.operand = this.i_createAndCompileChildExpr(this.ast.operand);
                    this.funcCall = FunctionCall.instance({args: []}, {parent:this});
                    this.funcCall.compile({func: overloadOp});
                    this.i_childrenToExecute = this.i_childrenToExecuteForMemberOverload;
                }
                else{
                    // Non-member overload means operand is the argument to the function call
                    this.funcCall = FunctionCall.instance({args: [this.ast.operand]}, {parent:this});
                    this.funcCall.compile({func: overloadOp});
                    this.i_childrenToExecute = this.i_childrenToExecuteForOverload;
                }
                this.type = this.funcCall.type;
                this.valueCategory = this.funcCall.valueCategory;
            }
            else{

                // TODO: this appears to allow compilation to proceed for a class-type operand with
                // no overloads found, but that's doomed to fail (I think?). Perhaps my thought was
                // the error messages provided if you accidentally used a unary operator e.g. * with
                // a class-type operand were more illustrative if they said something like "you can't use
                // * with a non-pointer type rather than oops i can't find an overload for * with this class type
                this.operand = this.i_createAndCompileChildExpr(this.ast.operand);
                this.convert();
                this.typeCheck();
                this.compileTemporarires();
            }
        }
        else{
            this.operand = this.i_createAndCompileChildExpr(this.ast.operand);
            this.convert();
            this.typeCheck();
            this.compileTemporarires();
        }
    },

    upNext : function(sim, inst){
        // Push lhs, rhs, and function call (if lhs class type)
        var toReturn = Expression.upNext.apply(this, arguments);

        // If using an assignment operator, set receiver for function call instance
        if (this.funcCall && this.isMemberOverload){
            this.funcCall.setReceiver(sim, inst.childInstances.funcCall, RuntimeEntity.instance(this.operand.type, inst.childInstances.operand));
        }

        return toReturn;
    },

    stepForward: function(sim, inst){
        if (inst.index === "operate"){
            if (this.funcCall){
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
            reason: "The " + this.operator + " operation will happen after the recursive call.",
            others: [this]
        };
    }
});

var Dereference = Expressions.Dereference = UnaryOp.extend({
    _name: "Dereference",
    valueCategory: "lvalue",
    convert : function(){
        this.operand = this.operand = standardConversion(this.operand, Types.Pointer);
    },
    typeCheck : function(){
        // Type check
        if (!isA(this.operand.type, Types.Pointer)) {
            this.addNote(CPPError.expr.dereference.pointer(this, this.operand.type));
        }
        else if (!(this.operand.type.ptrTo.isObjectType || isA(this.operand.type.ptrTo, Types.Function))){
            this.addNote(CPPError.expr.dereference.pointerToObjectType(this, this.operand.type));
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
            return {message: "the result of " + this.getSourceText()};
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
            this.addNote(CPPError.expr.addressOf.lvalue_required(this));
        }

        this.type = Types.Pointer.instance(this.operand.type);
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
        this.operand = this.operand = standardConversion1(this.operand);
        if (this.operand.type.isIntegralType){
            this.operand = this.operand = integralPromotion(this.operand);
        }
    },

    typeCheck : function(){
        if(this.operand.type.isArithmeticType || isA(this.operand.type, Types.Pointer)) {
            this.type = this.operand.type;
            return true;
        }
        else{
            this.addNote(CPPError.expr.unaryPlus.operand(this));
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
        this.operand = this.operand = standardConversion1(this.operand);
        if (this.operand.type.isIntegralType){
            this.operand = this.operand = integralPromotion(this.operand);
        }
    },

    typeCheck : function(){
        if(this.operand.type.isArithmeticType) {
            this.type = this.operand.type;
            return true;
        }
        else{
            this.addNote(CPPError.expr.unaryMinus.operand(this));
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

    convert : function(){
        this.operand = standardConversion(this.operand, Types.Bool.instance());
    },

    typeCheck : function(){
        // Type check
        if (!isA(this.operand.type, Types.Bool)){
            this.addNote(CPPError.expr.logicalNot.operand_bool(this, this.operand));
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
    typeCheck : function(){
        // Type check
        if (this.operand.type.isArithmeticType || isA(this.operand.type, Types.Pointer)) {
            this.type = this.operand.type;

            if (this.operator == "--" && isA(this.operand.type, Types.Bool)){
                this.addNote(CPPError.expr.invalid_operand(this, this.operator, this.operand));
            }

            else if (this.operand.valueCategory === "lvalue") {
                return true;
            }
            else{
                this.addNote(CPPError.expr.lvalue_operand(this, this.operator));
            }
        }
        else{
            this.addNote(CPPError.expr.invalid_operand(this, this.operator, this.operand));
        }
    },
    operate: function(sim, inst){
        var obj = inst.childInstances.operand.evalValue;
        var amount = (isA(this.type, Types.Pointer) ? this.type.ptrTo.size : 1);

        var oldValue = readValueWithAlert(obj, sim, this.operand, inst.childInstances.operand);
        var newRawValue = this.operator === "++" ? oldValue.rawValue() + amount : oldValue.rawValue() - amount;

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
        var incDec = this.operator === "++" ? "incremented" : "decremented";
        return {message: "First, the value of " + evdesc + " will be " + incDec + " by one. Then this expression as a whole will evaluate to the new value of " + evdesc + "."};
    }
});


// TODO: Consolidate postfix increment/decrement into one class.  consider also merging subscript
// TODO: Allow overriding postfix increment/decrement
Expressions.Increment = Expression.extend({
    _name: "Increment",
    valueCategory: "prvalue",
    i_childrenToCreate : ["operand"],
    i_childrenToExecute : ["operand"],

    typeCheck : function(){
        // Type check
        if (this.operand.type.isArithmeticType || isA(this.operand.type, Types.Pointer)) {
            this.type = this.operand.type;

            if (this.operand.valueCategory === "lvalue") {
                return true;
            }
            else{
                this.addNote(CPPError.expr.lvalue_operand(this, "++"));
            }
        }
        else{
            this.addNote(CPPError.expr.invalid_operand(this, "++", this.operand));
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
    i_childrenToCreate : ["operand"],
    i_childrenToExecute : ["operand"],
    typeCheck : function(){
        // Type check
        if (this.operand.type.isArithmeticType || isA(this.operand.type, Types.Pointer)) {
            this.type = this.operand.type;

            if (this.operator = "--" && isA(this.operand.type, Types.Bool)){
                this.addNote(CPPError.expr.invalid_operand(this, this.operator, this.operand));
            }
            else if (this.operand.valueCategory === "lvalue") {
                return true;
            }
            else{
                this.addNote(CPPError.expr.lvalue_operand(this, this.operator));
            }
        }
        else{
            this.addNote(CPPError.expr.invalid_operand(this, this.operator, this.operand));
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



// TODO: Allow overloading Subscript with initializer list
var Subscript = Expressions.Subscript = Expression.extend({
    _name: "Subscript",
    valueCategory: "lvalue",
    i_childrenToCreate : ["operand"],
    i_childrenToExecute : ["operand", "arg"],
    i_childrenToExecuteForMemberOverload : ["operand"], // does not include offset because function call does that

    compile : function(){

        this.operand.compile();

        // Check for overload
        if (isA(this.operand.type, Types.Class)){
            this.compileMemberOverload(this.operand, [this.ast.arg], "[]");
        }
        else{
            this.operand = standardConversion(this.operand, Types.Pointer);
            this.arg = this.i_createAndCompileChildExpr(this.ast.arg, Types.Int.instance());

            this.convert();
            this.typeCheck();
            this.compileTemporarires();
        }
    },

    typeCheck : function(){
        if (!isA(this.operand.type, Types.Pointer)) {
            this.addNote(CPPError.expr.array_operand(this, this.operand.type));
        }
        else{
            this.type = this.operand.type.ptrTo;
        }

        if (!isA(this.arg.type, Types.Int)) {
            this.addNote(CPPError.expr.array_offset(this, this.arg.type));
        }
    },


    upNext : function(sim, inst){
        if (this.isOverload)
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
            var offset = inst.childInstances.arg.evalValue;
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
    i_childrenToCreate : ["operand"],
    i_childrenToExecute : ["operand"],

    i_createFromAST : function(ast, context) {
        Dot._parent.i_createFromAST.apply(this, arguments);
        this.memberName = ast.member.identifier;
    },

    compile : function(compilationContext) {
        this.i_paramTypes = compilationContext && compilationContext.paramTypes;
        Expressions.Dot._parent.compile.apply(this, arguments);
    },

    typeCheck : function(){
        if (!isA(this.operand.type, Types.Class)) {
            this.addNote(CPPError.expr.dot.class_type(this));
            return false;
        }

        // Find out what this identifies
        try {
            this.entity = this.operand.type.classScope.requiredLookup(this.memberName, {paramTypes: this.i_paramTypes, isThisConst:this.operand.type.isConst});
            this.type = this.entity.type;
        }
        catch(e){
            if (isA(e, SemanticExceptions.BadLookup)){
                this.addNote(CPPError.expr.dot.memberLookup(this, this.operand.type, this.memberName));
                // TODO: why is this commented?
                // this.addNote(e.annotation(this));
            }
            else{
                throw e;
            }
        }

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
    i_childrenToCreate : ["operand"],
    i_childrenToConvert : {
        operand : Types.Pointer.instance()
    },
    i_childrenToExecute : ["operand"],

    i_createFromAST : function(ast, context) {
        Arrow._parent.i_createFromAST.apply(this, arguments);
        this.memberName = ast.member.identifier;
    },

    compile : function(compilationContext) {
        this.i_paramTypes = compilationContext && compilationContext.paramTypes;
        Expressions.Dot._parent.compile.apply(this, arguments);
    },

    typeCheck : function(){
        if (!isA(this.operand.type, Types.Pointer) || !isA(this.operand.type.ptrTo, Types.Class)) {
            this.addNote(CPPError.expr.arrow.class_pointer_type(this));
            return false;
        }

        // Find out what this identifies
        try{
            this.entity = this.operand.type.ptrTo.classScope.requiredLookup(this.memberName, {paramTypes: this.i_paramTypes, isThisConst:this.operand.type.ptrTo.isConst});
            this.type = this.entity.type;
        }
        catch(e){
            if (isA(e, SemanticExceptions.BadLookup)){
                this.addNote(CPPError.expr.arrow.memberLookup(this, this.operand.type.ptrTo, this.memberName));
                // this.addNote(e.annotation(this));
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




var PREDEFINED_FUNCTIONS = {
    rand : function(args, sim, inst){
        return Value.instance(Math.floor(sim.nextRandom() * 32767), Types.Int.instance());
    },
    "assert" : function(args, sim, inst){
        if(!args[0].evalValue.value){
            sim.alert("Yikes! An assert failed! <br /><span class='code'>" + inst.model.getSourceText() + "</span> on line " + inst.model.getSourceText() + ".");
            sim.assertionFailed();
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

    i_createFromAST : function(ast, context) {
        FunctionCall._parent.i_createFromAST.apply(this, arguments);

        assert(Array.isArray(this.ast.args));
        if (context.isMainCall) {
            this.i_isMainCall = true;
        }

        // Create initializers for the parameters, which will be given the arguments from our ast
        var self = this;
        this.argInitializers = this.ast.args.map(function(argAst){
            return ParameterInitializer.instance({args: [argAst]}, {parent: self});
        });
    },

    compile : function(compilationContext) {
        this.receiver = compilationContext.receiver || null;
        this.func = compilationContext.func;

        var self = this;
        assert(isA(this.func, FunctionEntity));

        // TODO: what is this??
        if (this.func.isMain && !this.i_isMainCall){
            this.addNote(CPPError.expr.functionCall.numParams(this));
        }

        // Is the function statically bound?
        if (this.func.isStaticallyBound()){
            this.staticFunction = this.func;
            // TODO: add error if main is called recursively
            this.isRecursive = !this.i_isMainCall && this.staticFunction === this.containingFunction().entity;
        }

        this.type = this.func.type.returnType;

        if (isA(this.type, Types.Reference)){
            this.returnByReference = true;
            this.valueCategory = "lvalue";
            // Adjust to T from reference to T
            this.type = this.type.refTo;
        }
        else {
            this.valueCategory = "prvalue";
            if (!isA(this.type, Types.Void)){
                this.returnByValue = true;
            }
        }


        // Check that we have the right number of parameters
        // Note: at the moment, this is not already "checked" by name lookup / overload resolution
        // TODO: I'm pretty sure this comment no longer applies, but I guess I should check
        if (this.argInitializers.length !== this.func.type.paramTypes.length){
            this.addNote(CPPError.expr.functionCall.numParams(this));
            return;
        }

        // Parameter passing is done by copy initialization, so create initializers.
        this.argInitializers.forEach(function(argInit, i) {
            argInit.compile(ParameterEntity.instance(self.func,i));
            argInit.initIndex = "afterChildren"; // These initializers expect their expression to already be evaluated
        });

        if (!isA(this.func.definition, MagicFunctionDefinition)){
            // If we are returning by value, then we need to create a temporary object to copy-initialize.
            // If we are returning by reference, inst.returnObject will be bound to what we return.
            // Temporary references do not use extra space and won't be automatically destructed.
            if (!this.returnByReference && !isA(this.type, Types.Void)){
                this.returnObject = this.createTemporaryObject(this.func.type.returnType, (this.func.name || "unknown") + "() [return]");
            }

            if (!this.i_isMainCall && !this.isAuxiliary()){
                // Register as a function call in our function context
                this.containingFunction().calls.push(this);

                // Register as a call in the translation unit (this is used during the linking process later)
                this.i_translationUnit.registerFunctionCall(this);
            }
        }

        return Expression.compile.apply(this, arguments);
    },

    checkLinkingProblems : function(){
        if (!this.func.isLinked()){
            var note = CPPError.link.def_not_found(this, this.func);
            this.addNote(note);
            return note;
        }
        return null;
    },

    tailRecursionCheck : function(){
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
        //this.containingFunction().isTailRecursive = this.containingFunction().isTailRecursive && isTail;

        this.canUseTCO = this.isRecursive && this.isTail;
    },

    createInstance : function(sim, parent, receiver){
        var inst = Expression.createInstance.apply(this, arguments);
        inst.receiver = receiver;

        if (!inst.receiver && this.receiver){
            // Used for constructors. Make sure to look up in context of parent instance
            // or else you'll be looking at the wrong thing for parameter entities.
            inst.receiver = this.receiver.lookup(sim, parent);
        }

        // For function pointers. It's a hack!
        if (parent && parent.pointedFunction) {
            inst.pointedFunction = parent.pointedFunction;
        }

        var funcDecl = inst.funcDecl = this.func.lookup(sim, inst).definition;

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
        //if (this.func && this.func.decl && this.func.decl.isImplicit()){
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

var FunctionCallExpression = Expressions.FunctionCallExpression = Expression.extend({
    _name: "FunctionCallExpression",
    initIndex: "operand",

    i_createFromAST : function(ast, context) {
        FunctionCallExpression._parent.i_createFromAST.apply(this, arguments);
        this.operand = this.i_createChild(ast.operand);
    },

    compile : function() {
        var self = this;

        // Need to select function, so have to compile auxiliary arguments
        var auxArgs = this.ast.args.map(function(arg){
            var auxArg = CPPConstruct.create(arg, {parent: self, auxiliary: true});
            auxArg.tryCompile();
            return auxArg;
        });

        // If we already have errors from any auxiliary arguments, we cannot recover
        if (auxArgs.some(function(auxArg) {return auxArg.hasErrors()})){
            // Add the notes from the auxiliary arguments (they weren't added normally since they were auxiliary)
            auxArgs.forEach(function(auxArg){
                auxArg.getNotes().forEach(function(note) {
                    self.addNote(note);
                });
            });
            return;
        }

        var argTypes = auxArgs.map(function(arg){
            return arg.type;
        });

        this.operand.compile({paramTypes: argTypes});

        if (this.hasErrors()){
            return;
        }

        this.bindFunction();

        if (this.hasErrors()){
            return;
        }

        var funcCall = this.funcCall = FunctionCall.instance({args: this.ast.args}, {parent:this});
        funcCall.compile({func: this.boundFunction});

        this.type = funcCall.type;
        this.valueCategory = funcCall.valueCategory;

        return Expression.compile.apply(this, arguments);
    },

    bindFunction : function(){
        var self = this;
        if (isA(this.operand.type, Types.Class)){
            // Check for function call operator and if so, find function
            // TODO: I think this breaks given multiple overloaded function call operators?
            var callOp = this.operand.type.getMember(["operator()"]);
            if (callOp){
                this.callOp = callOp;
                this.boundFunction = this.callOp;
                this.type = noRef(callOp.type.returnType);
            }
            else{
                this.addNote(CPPError.expr.functionCall.not_defined(this, this.operand.type));
                return;
            }
        }
        else if (isA(this.operand.entity, FunctionEntity)){ // TODO: use of entity property here feels hacky
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
            this.addNote(CPPError.expr.functionCall.operand(this, this.operand));
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
            // TODO: remember why that's a hack and not just the right thing to do
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
    compile : function(){

        // Compile the type specifier
        this.typeSpec = TypeSpecifier.instance(this.ast.specs, {parent:this});
        this.typeSpec.compile();

        this.heapType = this.typeSpec.type;

        // Compile declarator if it exists
        if(this.ast.declarator) {
            this.declarator = Declarator.instance(this.ast.declarator, {parent: this});
            this.declarator.compile({baseType: this.heapType});
            this.heapType = this.declarator.type;
        }

        if (isA(this.heapType, Types.Array)){
            this.type = Types.Pointer.instance(this.heapType.elemType);
            if (this.declarator.dynamicLengthExpression){
                this.dynamicLength = this.i_createAndCompileChildExpr(this.declarator.dynamicLengthExpression, Types.Int.instance());
                this.initIndex = "length";
            }
        }
        else {
            this.type = Types.Pointer.instance(this.heapType);
        }

        var entity = NewObjectEntity.instance(this.heapType);

        var initCode = this.ast.initializer || {args: []};
        if (isA(this.heapType, Types.Class) || initCode.args.length == 1){
            this.initializer = DirectInitializer.instance(initCode, {parent: this});
            this.initializer.compile(entity);
        }
        else if (initCode.args.length == 0){
            this.initializer = DefaultInitializer.instance(initCode, {parent: this});
            this.initializer.compile(entity);
        }
        else{
            this.addNote(CPPError.declaration.init.scalar_args(this, this.heapType));
        }

        this.compileTemporarires();
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
                // RTTI for object pointer
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
    i_childrenToCreate : ["operand"],
    i_childrenToConvert : {
        "operand" : Types.Pointer.instance()
    },
    i_childrenToExecute : ["operand"],

    typeCheck : function(){

        if (isA(this.operand.type.ptrTo, Types.Class)){
            var classType = this.operand.type.ptrTo;
            var dest = classType.destructor;
            //TODO not found and ambiguous
            if (isA(dest, FunctionEntity)){
                //this.assnOp = assnOp;
                //this.type = noRef(assnOp.type.returnType);
                // Attempt standard conversion of rhs to match lhs, without lvalue to rvalue
                //this.rhs = this.sub.rhs = standardConversion(this.rhs, this.lhs.type, {suppressLTR:true});

                this.funcCall = this.funcCall = FunctionCall.instance({args: []}, {parent:this});
                this.funcCall.compile({func: dest});
                this.type = this.funcCall.type;
            }
            else{
                this.addNote(CPPError.expr.delete.no_destructor(this, classType));
            }
        }

        // Type check
        if (!isA(this.operand.type, Types.Pointer)) {
            this.addNote(CPPError.expr.delete.pointer(this, this.operand.type));
        }
        else if (!this.operand.type.ptrTo.isObjectType){
            this.addNote(CPPError.expr.delete.pointerToObjectType(this, this.operand.type));
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
    compile : function(){

        // Compile the type specifier
        this.typeSpec = TypeSpecifier.instance([this.ast.type], {parent:this});
        this.typeSpec.compile();

        this.type = this.typeSpec.type;

        // Compile declarator if it exists
        if(this.ast.declarator) {
            this.declarator = Declarator.instance(this.ast.declarator, {parent: this});
            this.declarator.compile({baseType: this.heapType});
            this.heapType = this.declarator.type;
        }

        this.entity = this.createTemporaryObject(this.type, "[temp " + this.type + "]");

        if (isA(this.type, Types.Class) || this.ast.args.length == 1){
            this.initializer = DirectInitializer.instance(this.ast, {parent: this});
            this.initializer.compile(this.entity);
        }
        else{
            this.addNote(CPPError.declaration.init.scalar_args(this, this.type));
        }

        this.compileTemporarires();
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
    i_createFromAST: function(ast, context){

        Identifier._parent.i_createFromAST.apply(this, arguments);
        this.identifier = this.ast.identifier;
        this.identifierText = identifierToText(this.identifier);
    },

    compile : function(compilationContext) {
        this.i_paramTypes = compilationContext && compilationContext.paramTypes;
        Expressions.Identifier._parent.compile.apply(this, arguments);
    },

    typeCheck : function(){
        checkIdentifier(this, this.identifier, this);

		try{
            this.entity = this.contextualScope.requiredLookup(this.identifier, {paramTypes: this.i_paramTypes, isThisConst:this.containingFunction().type.isThisConst});

            if(isA(this.entity, CPPEntity)) {
                this.type = this.entity.type;
                if(isA(this.type, Types.IStream)){
                    this.addNote(CPPError.other.cin_not_supported(this));
                }
            }

            if (isA(this.type, Types.Reference)){
                this.type = this.type.refTo;
            }
        }
        catch(e){
            if (isA(e, SemanticExceptions.BadLookup)){
                this.addNote(e.annotation(this));
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
    compile : function(){
        var func = this.containingFunction();
        if (func.isMemberFunction){
            this.type = Types.Pointer.instance(func.receiverType);
        }
        else{
            this.addNote(CPPError.expr.thisExpr.memberFunc(this));
        }
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
    init : function(entity, ast, context){
        this.initParent(ast, context);
        this.entity = entity;
        this.type = this.entity.type;
    },
    compile : function(){

    },
    upNext : function(sim, inst){
        inst.setEvalValue(this.entity.lookup(sim, inst));
        this.done(sim, inst);
    }
});



var AuxiliaryExpression = Expressions.AuxiliaryExpression = Expression.extend({
    _name: "AuxiliaryExpression",
    valueCategory: "prvalue",
    init : function(type){
        this.initParent(null, null);
        this.type = type
    },
    compile : function(){
        // Do nothing
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
    compile : function(){

		
		var conv = literalJSParse[this.ast.type];
		var val = (conv ? conv(this.ast.value) : this.ast.value);
		
		var typeClass = literalTypes[this.ast.type];
        this.type = typeClass;
        this.valueCategory = "prvalue";
        this.value = Value.instance(val, this.type);  //TODO fix this (needs type?)

//        if (this.ast.type === "string"){
//            this.type = Types.Array.instance(Types.Char, val.length+1);
//            this.valueCategory = "prvalue";
//            val = val.split("");
//            val.push(0);
//            this.value = Value.instance(val, this.type);
//        }
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
    i_childrenToCreate : ["subexpression"],
    i_childrenToExecute : ["subexpression"],

    typeCheck : function(){
        this.type = this.subexpression.type;
        this.valueCategory = this.subexpression.valueCategory;

    },

    upNext : function(sim, inst) {
        if (inst.index == "subexpressions") {
            this.pushChildInstances(sim, inst);
            inst.index = "done";
            return true;
        }
        else {
            inst.setEvalValue(inst.childInstances.subexpression.evalValue);
            this.done(sim, inst);
        }
        return true;
    },

    isTailChild : function(child){
        return {isTail: true};
    }
});

// // hack to make sure I don't mess up capitalization
// for (var key in Expressions){
// 	Expressions[key.toLowerCase()] = Expressions[key];
// }
