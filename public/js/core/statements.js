var Lobster = Lobster || {};

Lobster.Statements = {
	
	create : function(stmt, context){
		var type = stmt.statement.toLowerCase();
        var stmtClass = this[type] || Statements.Unsupported;
        return stmtClass.instance(stmt, context);
	}
	
};
var Statements = Lobster.Statements;

var Statement = Statements.Statement = CPPCode.extend({
   _name: "Statement",
    instType: "stmt",

    done : function(sim, inst){
        sim.pop(inst);
        inst.send("reset");
    }
});

Statements.Unsupported = Statement.extend({
    _name: "Unsupported",
    compile : function(){
        this.addNote(CPPError.expr.unsupported(this, this.englishName ? "(" + this.englishName + ")" : ""));
    }
});

Statements.Labeled = Statements.Unsupported.extend({
    _name: "Labeled",
    englishName: "labeled statement"
});

Statements.Expression = Statement.extend({
    _name: "ExpressionStatement",
    initIndex: "expr",
    compile : function(){
		this.expression = this.createAndCompileChildExpr(this.code.expr);
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



Statements.Declaration = Statement.extend({
    _name: "DeclarationStatement",
    initIndex: "decl",
    compile : function(scope){
		this.declaration = Declarations.create(this.code, {parent: this});
		this.declaration.compile(scope);

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



Statements.Return = Statement.extend({
    _name: "Return",
    compile : function(scope){

        // Find function to which this return corresponds
        var func = this.context.func;
        var returnType = this.returnType = func.type.returnType;

        this.hasExpression = !!this.code.expr;
        if (this.code.expr){
            this.sub.returnInit = ReturnInitializer.instance(this.code, {parent: this});
            this.sub.returnInit.compile(scope, ReturnEntity.instance(returnType), [this.code.expr]);
        }

        // A return statement with no expression is only allowed in void functions.
        // At the moment, constructors/destructors are hacked to have void return type.
        if (!this.code.expr && !isA(func.type.returnType, Types.Void)){
            this.addNote(CPPError.stmt._return.empty(this))
        }

        // TODO maybe put this back in. pretty sure return initializer will give some kind of error for this anyway
        //// A return statement with a non-void expression can only be used in functions that return a value (i.e. non-void)
        //if (this.code.expr && !isA(this.expression.type, Types.Void) && isA(func.type.returnType, Types.Void)){
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





Statements.Block = Statements.Compound = Statement.extend({
    _name: "Block",
    initIndex: 0,
    init: function(code, context){
        this.initParent(code, context);
        this.length = this.code.statements.length;
    },
    compile : function(parentScope){

        // if my parent is a function, just use scope from that
        if (isA(this.parent, Declarations.FunctionDefinition)){
            this.scope = this.parent.scope;
        }
        else if (this.context.scope){
            this.scope = this.context.scope;
        }
        else {
            this.scope = BlockScope.instance(parentScope);
        }

        // Compile all the statements
        this.statements = [];
        for(var i = 0; i < this.length; ++i){
            var stmt = this.statements[i] = Statements.create(this.code.statements[i], {parent: this});
            stmt.compile(this.scope);
        }
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





//TODO: switch is disallowed for now (here and in grammar)
Statements.Selection = Statement.extend({
    _name: "Selection",
    initIndex: "condition",
    compile : function(scope){
        this["if"] = Expressions.createExpr(this.code["if"], {parent: this});
        this["if"].compile(scope);
        this["if"] = standardConversion(this["if"], Types.Bool.instance());
        if (!isA(this["if"].type, Types.Bool)){
            this.addNote(CPPError.stmt.selection.cond_bool(this, this["if"]));
        }

        this.then = Statements.create(this.code.then, {parent: this});
        this.then.compile(scope);

        if (this.code["else"]){
            this["else"] = Statements.create(this.code["else"], {parent: this});
            this["else"].compile(scope);
        }
    },

    upNext : function(sim, inst){
        if(inst.index == "condition"){
            inst["if"] = this["if"].createAndPushInstance(sim, inst);
            inst.index = "body";
            return true;
        }
        else if (inst.index == "body"){
            if(inst["if"].evalValue.value){
                inst.then = this.then.createAndPushInstance(sim, inst);
                inst.index = "done";
                return true;
            }
            else{
                if (this["else"]) {
                    inst["else"] = this["else"].createAndPushInstance(sim, inst);
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
        if (child === this["if"]){
            return {isTail: false,
                reason: "After the function returns, one of the branches will run.",
                others: [this.then, this["else"]]
            }
        }
        else{
            if (this["else"]){
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
    compile : function(scope){

        this.scope = BlockScope.instance(scope);

        this.cond = Expressions.createExpr(this.code.cond, {parent:this});
        this.cond.compile(this.scope);
        this.cond = standardConversion(this.cond, Types.Bool.instance());

        if (!isA(this.cond.type, Types.Bool)){
            this.addNote(CPPError.stmt.iteration.cond_bool(this.cond, this.cond))
        }

        this.body = Statements.create(this.code.body, {parent: this, scope: this.scope});
        this.body.compile(this.scope);
    },

    upNext : function(sim, inst){
        if (inst.index == "wait"){
            return false;
        }
        else if(inst.index == "condition"){
            inst.send("reset");
            inst.cond = this.cond.createAndPushInstance(sim, inst);
            inst.index = "checkCond";
            return true;
        }
        else if (inst.index == "checkCond"){
            if(inst.cond.evalValue.value) {
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
    initIndex: "body",
});


Statements.For = Statements.Iteration.extend({
    _name: "For",
    initIndex: "init",
    compile : function(scope){

        this.scope = BlockScope.instance(scope);

        // Note: grammar ensures this will be an expression or declaration statement
        this.forInit = Statements.create(this.code.init, {parent: this});
        this.forInit.compile(this.scope);

        this.cond = Expressions.createExpr(this.code.cond, {parent: this});
        this.cond.compile(this.scope);
        this.cond = standardConversion(this.cond, Types.Bool.instance());

        if (!isA(this.cond.type, Types.Bool)){
            this.addNote(CPPError.stmt.iteration.cond_bool(this.cond, this.cond))
        }

        this.body = Statements.create(this.code.body, {parent: this, scope: this.scope});
        this.body.compile(this.scope);

        this.post = Expressions.createExpr(this.code.post, {parent: this});
        this.post.compile(this.scope);
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
            inst.cond = this.cond.createAndPushInstance(sim, inst);
            inst.index = "body";
            return true;
        }
        else if (inst.index == "body"){
            if(inst.cond.evalValue.value){
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
    compile : function(scope){

        var container = this.parent;
        while(container && !isA(container, Statements.Iteration)){
            container = container.parent;
        }

        this.container = container;

        // container should exist, otherwise this break is somewhere it shouldn't be
        if (!container || !isA(container, Statements.Iteration)){
            this.addNote(CPPError.stmt._break.location(this, this["if"]));
        }
    },

    createAndPushInstance : function(sim, inst){
        var inst = CPPCodeInstance.instance(sim, this, "break", "stmt", inst);
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

Statements.TemporaryDeallocator = Statement.extend({
    _name: "TemporaryDeallocator",

    init: function (code, context, temporaries) {
        this.initParent(code, context);
        this.temporaries = temporaries;
    },

    compile : function(scope){

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
