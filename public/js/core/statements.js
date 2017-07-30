var Lobster = Lobster || {};

Lobster.Statements = {
	
	create : function(stmt, context){
		var type = stmt.statement.toLowerCase();
        var stmtClass = this[type] || Statements.Unsupported;
        return stmtClass.instance(stmt, context);
	}
	
};
var Statements = Lobster.Statements;

var Statement = Statements.Statement = CPPConstruct.extend({
   _name: "Statement",
    instType: "stmt",

    done : function(sim, inst){
        sim.pop(inst);
        inst.send("reset");
    }
});

Statements.Unsupported = Statement.extend({
    _name: "Statements.Unsupported",
    compile : function(){
        this.addNote(CPPError.expr.unsupported(this, this.englishName ? "(" + this.englishName + ")" : ""));
    }
});

Statements.Labeled = Statements.Unsupported.extend({
    _name: "Statements.Labeled",
    englishName: "labeled statement"
});

Statements.Switch = Statements.Unsupported.extend({
    _name: "Statements.Switch",
    englishName: "switch statement"
});

/**
 * @property {Expression} expression
 *
 * * When creating an instance, specify these options
 *  - expression
 *
 */
Statements.Expression = Statement.extend({
    _name: "ExpressionStatement",
    initIndex: "expr",

    init : function(source, context) {
        this.initParent(source, context);
        this.expression = this.i_createAndConnectChild(source.expression);
    },

    compile : function(){
        this.expression.compile();
	},

	upNext : function(sim, inst){
        if (inst.index === "expr"){
            this.expression.createAndPushInstance(sim, inst);
            inst.index = "done";
        }
		return true;
	},
	
	stepForward : function(sim, inst){
        this.done(sim, inst);
	},

    isTailChild : function(child){
        return {isTail: true};
    }
});

Statements.Null = Statements.Expression.extend({
    _name : "NullStatement"
});

/**
 * @property {Declaration} declaration
 *
 * * When creating an instance, specify these options
 *  - declaration
 *
 */
Statements.Declaration = Statement.extend({
    _name: "DeclarationStatement",
    initIndex: "decl",

    init : function(source, context) {
        this.initParent(source, context);
        this.declaration = this.i_createAndConnectChild(source.declaration);
    },

    compile : function(){
		this.declaration.compile();

        if (!isA(this.declaration, Declarations.Declaration)){
            this.addNote(CPPError.stmt.declaration(this, this.declaration));
        }
	},
	
	upNext : function(sim, inst){
        if (inst.index === "decl"){
            this.declaration.createAndPushInstance(sim, inst);
            inst.index = "done";
        }
        else{
            this.done(sim, inst);
        }
		return true;
	},
	
	stepForward : function(sim, inst){
		// nothing to do
	},

    isTailChild : function(child){
        return {isTail: true};
    }
});



/**
 * @property {ReturnInitializer} returnInitializer
 * @property {?Expression} expression
 * @property {Type} returnType
 *
 * When creating an instance, specify these options
 *  - expression (optional)
 *
 */
Statements.Return = Statement.extend({
    _name: "Return",

    init : function(source, context) {
        this.initParent(source, context);

        // If we have a return expression, create an initializer with that expression
        if (source.expression) {
            this.returnInitializer = ReturnInitializer.instance({
                args: [source.expression]
            }, {parent: this});
            this.expression = this.returnInitializer.expression;
        }
        else {
            this.expression = null;
        }
    },

    compile : function() {

        // Find function to which this return corresponds
        var returnType = this.returnType = this.containingFunction().type.returnType;

        if (this.expression){
            this.returnInitializer.compile(ReturnEntity.instance(returnType));
            this.sub.returnInitializer = this.returnInitializer;
        }

        // A return statement with no expression is only allowed in void functions.
        // At the moment, constructors/destructors are hacked to have void return type,
        // so this check is ok for return statements in a constructor.
        if (!this.code.expression && !isA(returnType, Types.Void)){
            this.addNote(CPPError.stmt._return.empty(this))
        }

        // TODO maybe put this back in. pretty sure return initializer will give some kind of error for this anyway
        //// A return statement with a non-void expression can only be used in functions that return a value (i.e. non-void)
        //if (this.code.expression && !isA(this.expression.type, Types.Void) && isA(returnType, Types.Void)){
        //    this.addNote(CPPError.stmt._return.exprVoid(this));
        //    return;
        //}
	},

	stepForward : function(sim, inst){
		if (inst.index === "afterChildren") {
            var func = inst.funcContext;
            func.returnValueSet = true;

            inst.send("returned", {call: func.parent});
            inst.index = "returned";
            return true; // go again to returned
        }
        else if (inst.index === "returned"){
            var func = inst.funcContext;
            sim.popUntil(func);
			//func.done(sim);
			// return true;
		}
		//nothing to do
		// sim.push("expr", this.expression.createAndPushInstance());
		// sim.pop(inst);
		// sim.stepForward();
	},
    isTailChild : function(child){
        return {isTail: true,
            reason: "The recursive call is immediately followed by a return."};
    }
});


/**
 * @property {BlockScope} blockScope
 * @property {Number} length - The number of statements within the block
 * @property {Statement[]} statements
 *
 * When creating an instance, specify these
 *  - statements
 *
 */
Statements.Block = Statements.Compound = Statement.extend({
    _name: "Block",
    initIndex: 0,

    init: function(source, context){
        this.initParent(source, context);

        this.blockScope = this.i_createBlockScope();

        var self = this;
        this.statements = source.statements.map(function(stmt){
            self.i_createAndConnectChild(stmt, {scope: self.blockScope});
        });
        this.length = this.code.statements.length;

    },

    i_createBlockScope : function() {
        return BlockScope.instance(this.contextualScope);
    },

    compile : function(){

        // Compile all the statements
        this.statements.forEach(function(stmt){
            stmt.compile();
        });
    },

    createInstance : function(){
        var inst = Statement.createInstance.apply(this, arguments);
        inst.childInstances = {};
        inst.childInstances.statements = [];
        return inst;
    },

    upNext : function(sim, inst){
        if (inst.index >= this.statements.length){
            this.done(sim, inst);
        }
        else{
            inst.send("index", inst.index);
            var nextStmt = this.statements[inst.index++];
            inst.childInstances.statements.push(nextStmt.createAndPushInstance(sim, inst));
        }
        return true;
    },

    stepForward : function(sim, inst){
        // No work to be done here? Should be enough to delegate to statements
        // via upNext.
    },

    isTailChild : function(child){
        var last = this.statements.last();
        if (child !== last){
            if (child === this.statements[this.statements.length-2] && isA(last, Statements.Return) && !last.hasExpression){
                return {isTail: true,
                    reason: "The only thing after the recursive call is an empty return.",
                    others: [last]
                }
            }
            else{
                var others = [];
                for (var otherIndex = this.statements.length-1; this.statements[otherIndex] !== child && otherIndex >= 0; --otherIndex){
                    var other = this.statements[otherIndex];
                    if (!(isA(other, Statements.Return) && !other.expression)){
                        others.unshift(other);
                    }
                }
                return {isTail: false,
                    reason: "There are other statements in this block that will execute after the recursive call.",
                    others: others
                }
            }
        }
        else{
            return {isTail: true};
        }
    }
});

Statements.FunctionBodyBlock = Statements.Block.extend({
    _name: "FunctionBodyBlock",

    i_createBlockScope : function() {
        return FunctionBlockScope.instance(this.contextualScope);
    }
});



//TODO: switch is disallowed for now (here and in grammar)
Statements.Selection = Statement.extend({
    _name: "Selection",
    initIndex: "condition",

    init : function(source, context) {
        this.initParent(source, context);
        this.condition = this.i_createAndConnectChild(source.condition);
        this.then = this.i_createAndConnectChild(source.then);
        this.otherwise = this.i_createAndConnectChild(source.otherwise);

    },

    compile : function(){

        // Compile condition, convert to bool
        this.condition.compile();
        this.condition = standardConversion(this.condition, Types.Bool.instance());
        if (!isA(this.condition.type, Types.Bool)){
            this.addNote(CPPError.stmt.selection.condition_bool(this, this.condition));
        }

        this.then.compile();

        this.otherwise && this.otherwise.compile();
    },

    upNext : function(sim, inst){
        if(inst.index == "condition"){
            inst.condition = this.condition.createAndPushInstance(sim, inst);
            inst.index = "body";
            return true;
        }
        else if (inst.index == "body"){
            if(inst.condition.evalValue.value){
                inst.then = this.then.createAndPushInstance(sim, inst);
                inst.index = "done";
                return true;
            }
            else{
                if (this.otherwise) {
                    inst.otherwise = this.otherwise.createAndPushInstance(sim, inst);
                }
                inst.index = "done";
                return true;
            }
        }
        else{
            this.done(sim, inst);
            return true;
        }
    },

    stepForward : function(sim, inst){

    },

    isTailChild : function(child){
        if (child === this.condition){
            return {isTail: false,
                reason: "After the function returns, one of the branches will run.",
                others: [this.then, this.otherwise]
            }
        }
        else{
            if (this.otherwise){
                //if (child === this.then){
                    return {isTail: true,
                        reason: "Only one branch in a selection structure (i.e. if/else) can ever execute, so don't worry about the code in the other branches."
                    };
                //}
                //else{
                //    return {isTail: true,
                //        reason: "Don't worry about the code in the if branch - if the recursive call even happened it means we took the else branch."
                //    };
                //}
            }
            else{
                return {isTail: true
                };
            }
        }
    }
});


Statements.Iteration = Statement.extend({
    isTailChild : function(child){
        return {
            isTail: false,
            reason: "If the loop goes around again, then that would be more work after the recursive call.",
            others: [this]
        };
    }
});

Statements.While = Statements.Iteration.extend({
    _name: "While",
    initIndex: "condition",

    init : function(source, context) {
        this.initParent(source, context);

        this.body = this.i_createAndConnectChild(source.body);

        // TODO: technically, the C++ standard allows a declaration as the condition for a while loop.
        // This appears to be currently impossible in Lobster, but when implemented it will require
        // special implementation of the scope of the body if it's not already a block.
        // Or maybe we could just decide to parse it correctly (will still require some changes), but
        // then simply say it's not supported since it's such a rare thing.
        this.condition = this.i_createAndConnectChild(source.condition, {
            scope : (isA(this.body, Statements.Block) ? this.body.blockScope : this.contextualScope)
        });

    },

    compile : function(){

        this.condition.compile();
        this.condition = standardConversion(this.condition, Types.Bool.instance());
        if (!isA(this.condition.type, Types.Bool)){
            this.addNote(CPPError.stmt.iteration.condition_bool(this.condition, this.condition))
        }

        this.body.compile();
    },

    upNext : function(sim, inst){
        if (inst.index == "wait"){
            return false;
        }
        else if(inst.index == "condition"){
            inst.send("reset");
            inst.condition = this.condition.createAndPushInstance(sim, inst);
            inst.index = "checkCond";
            return true;
        }
        else if (inst.index == "checkCond"){
            if(inst.condition.evalValue.value) {
                inst.index = "body";
            }
            else{
                this.done(sim, inst);
            }
            return true;
        }
        else if (inst.index == "body"){
            inst.body = this.body.createAndPushInstance(sim, inst);
            inst.index = "wait";
            return true;
        }
    },

    stepForward : function(sim, inst){
        if (inst.index == "wait") {
            inst.index = "condition"; // remove the wait index on iterations after the first
        }
    }
});


Statements.DoWhile = Statements.While.extend({
    _name: "DoWhile",
    initIndex: "body"
});


Statements.For = Statements.Iteration.extend({
    _name: "For",
    initIndex: "init",

    init : function(source, context) {
        this.initParent(source, context);

        this.body = this.i_createAndConnectChild(source.body);

        this.bodyScope = (isA(this.body, Statements.Block) ? this.body.blockScope : BlockScope.instance(this.contextualScope);

        // Note: grammar ensures this will be an expression or declaration statement
        this.initial = this.i_createAndConnectChild(source.initial, {scope: bodyScope});


        this.condition = this.i_createAndConnectChild(source.condition, {
            scope : (isA(this.body, Statements.Block) ? this.bodyScope : this.contextualScope)
        });

    },

    compile : function(){

        this.body = Statements.create(this.code.body, {parent: this});

        var bodyScope = isA(this.body, Statements.Block) ? this.bodyScope : this.contextualScope;

        this.forInit.compile();

        this.condition = Expressions.createExpressionFromASTSource(this.code.condition, {parent: this, scope: bodyScope});
        this.condition.compile();
        this.condition = standardConversion(this.condition, Types.Bool.instance());

        if (!isA(this.condition.type, Types.Bool)){
            this.addNote(CPPError.stmt.iteration.condition_bool(this.condition, this.condition))
        }

        this.body.compile();

        this.post = Expressions.createExpressionFromASTSource(this.code.post, {parent: this, scope: bodyScope});
        this.post.compile();
    },


    upNext : function(sim, inst){
        if (inst.index == "wait"){
            return false;
        }
        else if (inst.index == "init"){
            inst.forInit = this.forInit.createAndPushInstance(sim, inst);
            inst.index = "condition";
            return true;
        }
        else if(inst.index == "condition"){
            inst.send("reset");
            inst.condition = this.condition.createAndPushInstance(sim, inst);
            inst.index = "body";
            return true;
        }
        else if (inst.index == "body"){
            if(inst.condition.evalValue.value){
                inst.body = this.body.createAndPushInstance(sim, inst);
                inst.index = "post";
                return true;
            }
            else{
                this.done(sim, inst);
                return true;
            }
        }
        else if (inst.index == "post"){
            inst.post = this.post.createAndPushInstance(sim, inst);
            inst.index = "wait";
            return true;
        }
    },

    stepForward : function(sim, inst){
        inst.index = "condition"; // remove the wait index on iterations after the first
    }
});



Statements.Break = Statement.extend({
    _name: "Break",
    compile : function(){

        var container = this.parent;
        while(container && !isA(container, Statements.Iteration)){
            container = container.parent;
        }

        this.container = container;

        // container should exist, otherwise this break is somewhere it shouldn't be
        if (!container || !isA(container, Statements.Iteration)){
            this.addNote(CPPError.stmt._break.location(this, this.condition));
        }
    },

    createAndPushInstance : function(sim, inst){
        var inst = CPPConstructInstance.instance(sim, this, "break", "stmt", inst);
        sim.push(inst);
        return inst;
    },

    stepForward : function(sim, inst){
        if (inst.index == "break"){
            var containerInst = inst.findParentByModel(this.container);
//            inst.send("returned", {call: func.parent});
            containerInst.done(sim);
            // return true;
        }
    }
});


Statements.Continue = Statements.Unsupported.extend({
    _name: "Statements.Continue",
    englishName: "continue statement"
});


Statements.TemporaryDeallocator = Statement.extend({
    _name: "TemporaryDeallocator",

    init: function (code, context, temporaries) {
        this.initParent(code, context);
        this.temporaries = temporaries;
    },

    compile : function(){

    },

    //stepForward : function(sim, inst){
    //
    //},

    upNext : function(sim, inst){
        for (var key in this.temporaries){
            var tempObjInst = this.temporaries[key].lookup(sim, inst.parent);
            if (tempObjInst) {
                sim.memory.deallocateTemporaryObject(tempObjInst, inst);
            }
        }
        this.done(sim, inst);
        return true;
    },

    isTailChild : function(child){
        return {isTail: true};
    }
});



// hack to make sure I don't mess up capitalization
for (key in Statements){
	Statements[key.toLowerCase()] = Statements[key];
}
