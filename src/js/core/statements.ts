
import { InstructionConstruct, RuntimeInstruction, UnsupportedConstruct, ASTNode, ExecutableConstruct, ConstructContext, CPPConstruct, RuntimeConstruct, ExecutableRuntimeConstruct, RuntimeExpression, ExecutableConstructContext } from "./constructs";
import { addDefaultPropertiesToPrototype } from "../util/util";
import { Expression } from "./expressions";
import { Simulation } from "./Simulation";
import { Declaration } from "./declarations";

export abstract class Statement extends InstructionConstruct {

    public readonly parent?: ExecutableConstruct;

    public attach(parent: ExecutableConstruct) {
        (<ExecutableConstruct>this.parent) = parent;
        parent.children.push(this); // rudeness approved here
    }

    public abstract createRuntimeStatement(parent: ExecutableRuntimeConstruct) : RuntimeStatement;

}

export abstract class RuntimeStatement<Construct_type extends Statement = Statement> extends RuntimeInstruction<Construct_type> {
    
    public constructor (model: Construct_type, parent: ExecutableRuntimeConstruct) {
        super(model, "statement", parent);
    }


    public popped() {
        super.popped();
        this.observable.send("reset");
    }

}



export class LabeledStatement extends UnsupportedConstruct {
    protected readonly unsupportedName!: string;
    protected static readonly _defaultProps = addDefaultPropertiesToPrototype(
        LabeledStatement,
        {
            unsupportedName: "labeled statement"
        }
    );
}



export class SwitchStatement extends UnsupportedConstruct {
    protected readonly unsupportedName!: string;
    protected static readonly _defaultProps = addDefaultPropertiesToPrototype(
        LabeledStatement,
        {
            unsupportedName: "switch statement"
        }
    );
}





export interface ExpressionStatementASTNode extends ASTNode {
    expression: ExpressionASTNode;
}

export class ExpressionStatement extends Statement {

    public readonly expression: Expression;

    public static createFromAST(ast: ExpressionStatementASTNode, context: ExecutableConstructContext) {
        return new ExpressionStatement(context,
            Expression.createFromAST(ast.expression, context)
        );
    }

    public constructor(context: ExecutableConstructContext, expression: Expression) {
        super(context);
        this.addChild(this.expression = expression);
    }

    public createRuntimeStatement(parent: ExecutableRuntimeConstruct) {
        return new RuntimeExpressionStatement(this, parent);
    }

    public isTailChild(child: CPPConstruct) {
        return {isTail: true};
    }
}

export class RuntimeExpressionStatement extends RuntimeStatement<ExpressionStatement> {

    public expression: RuntimeExpression;
    private index = "expr";

    public constructor (model: ExpressionStatement, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.expression = this.model.expression.createRuntimeExpression(this);
    }

	protected upNextImpl() {
        if (this.index === "expr") {
            this.sim.push(this.expression);
            this.index = "done";
        }
		return true;
	}
	
	protected stepForwardImpl() {
        this.sim.pop();
        return false;
	}
}





export class NullStatement extends Statement {

    public createRuntimeStatement(parent: ExecutableRuntimeConstruct) {
        return new RuntimeNullStatement(this, parent);
    }
}

export class RuntimeNullStatement extends RuntimeStatement<NullStatement> {

    public constructor (model: NullStatement, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
    }

    public upNextImpl() {
        return false;
    }

    public stepForwardImpl() {
        return false;
    }

}







export interface DeclarationStatementASTNode extends ASTNode {
    declaration: DeclarationASTNode;
}

export class DeclarationStatement extends Statement {

    public readonly declaration: Declaration;

    public static createFromAST(ast: DeclarationStatementASTNode, context: ExecutableConstructContext) {
        return new DeclarationStatement(context,
            Declaration.createFromAST(ast.declaration, context)
        );
    }

    public constructor(context: ExecutableConstructContext, declaration: Declaration) {
        super(context);
        this.addChild(this.declaration = declaration);
    }

    public createRuntimeStatement(parent: ExecutableRuntimeConstruct) {
        return new RuntimeDeclarationStatement(this, parent);
    }

    public isTailChild(child: CPPConstruct) {
        return {isTail: true};
    }
}

export class RuntimeDeclarationStatement extends RuntimeStatement<DeclarationStatement> {

    private index = 0;

    public constructor (model: DeclarationStatement, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
    }
	
    protected upNextImpl() {
        let initializers = this.model.declaration.initializers;
        if (this.index < initializers.length) {
            let init = initializers[this.index];
            if(init) { // TODO: is this if check necessary? shouldn't there always be an initializer (even if it's a default one?)
                this.observable.send("initializing", this.index);
                let runtimeInit = init.createRuntimeInitializer(this);
                this.sim.push(runtimeInit);
            }
            ++this.index;
            this.wait();
            return true;
        }
        else{
            this.sim.pop();
            return true;
        }
    }

    public stepForwardImpl() {
        return false;
    }
}



/**
 * @property {ReturnInitializer} returnInitializer
 * @property {?Expression} expression
 * @property {Type} returnType
 *
 * When creating an instance, specify these options
 *  - expression (optional)
 *
 */
export var Return = Statement.extend({
    _name: "Return",

    i_createFromAST : function(ast) {
        Statements.Return._parent.i_createFromAST.apply(this, arguments);

        // If we have a return expression, create an initializer with that expression
        if (ast.expression) {

            // Create a detatched expression to pass to the initializer. The initializer will then
            // attach it at the right place in the construct tree, but this will allow us to hold on
            // to a reference to it here. :)
            this.expression = Expression.create(ast.expression, null); // the null context indicates detatched
            this.returnInitializer = ReturnInitializer.instance({
                args: [this.expression]
            }, {parent: this});
            this.i_childrenToExecute = ["returnInitializer"];
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
        }

        // A return statement with no expression is only allowed in void functions.
        // At the moment, constructors/destructors are hacked to have void return type,
        // so this check is ok for return statements in a constructor.
        if (!this.expression && !isA(returnType, Types.Void)){
            this.addNote(CPPError.stmt.returnStatement.empty(this))
        }

        // TODO maybe put this back in. pretty sure return initializer will give some kind of error for this anyway
        //// A return statement with a non-void expression can only be used in functions that return a value (i.e. non-void)
        //if (this.expression && !isA(this.expression.type, Types.Void) && isA(returnType, Types.Void)){
        //    this.addNote(CPPError.stmt.returnStatement.exprVoid(this));
        //    return;
        //}
	},

	stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        var func = inst.containingRuntimeFunction();
        func.encounterReturnStatement();

		if (inst.index === "afterChildren") {
            inst.send("returned", {call: func.parent});
            inst.index = "returned";
            return true; // go again to returned
        }
        else if (inst.index === "returned"){
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
export var Block = Statement.extend({
    _name: "Block",
    initIndex: 0,

    i_createFromAST : function(ast){
        Statements.Block._parent.i_createFromAST.apply(this, arguments);

        this.blockScope = this.i_createBlockScope();

        var self = this;
        this.statements = ast.statements.map(function(stmt){
            return self.i_createChild(stmt, {scope: self.blockScope});
        });

        this.length = this.statements.length;

    },

    i_createBlockScope : function() {
        return BlockScope.instance(this.contextualScope);
    },

    compile : function(){
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

    upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
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

    stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
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
export {Block as Compound};

export var FunctionBodyBlock = Statements.Block.extend({
    _name: "FunctionBodyBlock",

    i_createBlockScope : function() {
        return FunctionBlockScope.instance(this.contextualScope);
    }
});

export var OpaqueFunctionBodyBlock = Statement.extend({
    _name: "OpaqueFunctionBodyBlock",

    i_createFromAST : function(ast){
        Statements.OpaqueFunctionBodyBlock._parent.i_createFromAST.apply(this, arguments);

        this.blockScope = FunctionBlockScope.instance(this.contextualScope);
        this.effects = ast.effects;
    },

    // upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //     if (inst.index >= this.statements.length){
    //         this.done(sim, inst);
    //     }
    //     else{
    //         inst.send("index", inst.index);
    //         var nextStmt = this.statements[inst.index++];
    //         inst.childInstances.statements.push(nextStmt.createAndPushInstance(sim, inst));
    //     }
    //     return true;
    // },

    stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        // No work to be done here? Should be enough to delegate to statements
        // via upNext.
        this.effects(sim, inst);
        this.done(sim,inst);
        return true;
    },

    isTailChild : function(){
        return {isTail: true};
    }
});



export var Selection = Statement.extend({
    _name: "Selection",
    initIndex: "condition",

    i_childrenToCreate : ["condition", "then", "otherwise"],

    compile : function(){

        // Compile condition, convert to bool if not already, error if can't convert
        this.condition.compile();
        this.condition = standardConversion(this.condition, Types.Bool.instance());
        if (!isA(this.condition.type, Types.Bool)){
            this.addNote(CPPError.stmt.selection.condition_bool(this, this.condition));
        }

        this.then.compile();

        // else branch may not be specified, so only compile if it is
        this.otherwise && this.otherwise.compile();
    },

    upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
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

    stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){

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


export var Iteration = Statement.extend({
    isTailChild : function(child){
        return {
            isTail: false,
            reason: "If the loop goes around again, then that would be more work after the recursive call.",
            others: [this]
        };
    }
});

export var While = Iteration.extend({
    _name: "While",
    initIndex: "condition",

    i_createFromAST : function(ast) {
        Statements.While._parent.i_createFromAST.apply(this, arguments);

        this.body = this.i_createChild(ast.body);

        // TODO: technically, the C++ standard allows a declaration as the condition for a while loop.
        // This appears to be currently impossible in Lobster, but when implemented it will require
        // special implementation of the scope of the body if it's not already a block.
        // Or maybe we could just decide to parse it correctly (will still require some changes), but
        // then simply say it's not supported since it's such a rare thing.
        this.condition = this.i_createChild(ast.condition, {
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

    upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
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

    stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        if (inst.index == "wait") {
            inst.index = "condition"; // remove the wait index on iterations after the first
        }
    }
});


export var DoWhile = While.extend({
    _name: "DoWhile",
    initIndex: "body"
});


export var For = Iteration.extend({
    _name: "For",
    initIndex: "init",

    init : function(ast, context) {
        this.initParent(ast, context);

        this.body = this.i_createChild(ast.body);

        // If the body is already a block, we can just use its scope. Otherwise, create one for the for loop.
        this.bodyScope = (isA(this.body, Statements.Block) ? this.body.blockScope : BlockScope.instance(this.contextualScope));

        // Note: grammar ensures this will be an expression or declaration statement
        this.initial = this.i_createChild(ast.initial, {scope: this.bodyScope});

        this.condition = this.i_createChild(ast.condition, {scope : this.bodyScope});

        this.post = this.i_createChild(ast.post, {scope : this.bodyScope});

    },

    compile : function(){
        this.initial.compile();

        this.condition.compile();
        this.condition = standardConversion(this.condition, Types.Bool.instance());
        if (!isA(this.condition.type, Types.Bool)){
            this.addNote(CPPError.stmt.iteration.condition_bool(this.condition, this.condition))
        }

        this.body.compile();

        this.post.compile();
    },


    upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        if (inst.index == "wait"){
            return false;
        }
        else if (inst.index == "init"){
            inst.initial = this.initial.createAndPushInstance(sim, inst);
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

    stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        inst.index = "condition"; // remove the wait index on iterations after the first
    }
});



export var Break = Statement.extend({
    _name: "Break",

    compile : function() {
        // Theoretically this could be put into the i_createFromAST function since it only uses
        // syntactic information to determine whether the break is inside an iteration statement,
        // but it would feel weird to add an error note before the compile function even runs... :/

        var container = this.parent;
        while(container && !isA(container, Statements.Iteration)){
            container = container.parent;
        }

        this.container = container;

        // container should exist, otherwise this break is somewhere it shouldn't be
        if (!container || !isA(container, Statements.Iteration)){
            this.addNote(CPPError.stmt.breakStatement.location(this, this.condition));
        }
    },

    createAndPushInstance : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        var inst = RuntimeConstruct.instance(sim, this, "break", "stmt", inst);
        sim.push(inst);
        return inst;
    },

    stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        if (inst.index == "break"){
            var containerInst = inst.findParentByModel(this.container);
//            inst.send("returned", {call: func.parent});
            containerInst.done(sim); // TODO: should be done with simulation stack instead of parent
            // return true;
        }
    }
});


export var Continue = Unsupported.extend({
    _name: "Statements.Continue",
    englishName: "continue statement"
});


export var TemporaryDeallocator = Statement.extend({
    _name: "TemporaryDeallocator",

    compile : function(temporaries){
        this.temporaries = temporaries;

        // TODO: we could put a check for necessary destructors here...I think there's one somewhere else already,
        // but it might be kind of elegant to put it here.
    },

    //stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //
    //},

    upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        for (var key in this.temporaries){
            var tempObjInst = this.temporaries[key].runtimeLookup(sim, inst.parent);
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
