import { BasicCPPConstruct, SuccessfullyCompiled, RuntimeConstruct, TranslationUnitContext, ASTNode,  CPPConstruct, BlockContext, RuntimeFunction, FunctionContext } from "./constructs";
import { CPPError } from "./errors";
import { ExpressionASTNode, createExpressionFromAST } from "./expressions";
import { DeclarationASTNode, SimpleDeclaration, FunctionDefinition, CompiledSimpleDeclaration, createSimpleDeclarationFromAST, createDeclarationFromAST, VariableDefinition } from "./declarations";
import { DirectInitializer, CompiledDirectInitializer, RuntimeDirectInitializer } from "./initializers";
import { VoidType, ReferenceType } from "./types";
import { ReturnByReferenceEntity, ReturnObjectEntity, BlockScope, AutoEntity, LocalReferenceEntity } from "./entities";
import { Mutable, asMutable } from "../util/util";
import { Expression, CompiledExpression, RuntimeExpression } from "./expressionBase";

export type StatementASTNode =
    LabeledStatementASTNode |
    BlockASTNode |
    SelectionStatementASTNode |
    IterationStatementASTNode |
    JumpStatementASTNode |
    DeclarationStatementASTNode |
    ExpressionStatementASTNode |
    NullStatementASTNode;

const StatementConstructsMap = {
    "labeled_statement" : (ast: LabeledStatementASTNode, context: BlockContext) => new UnsupportedStatement(context, "labeled statement").setAST(ast),
    "compound_statement" : (ast: BlockASTNode, context: BlockContext) => Block.createFromAST(ast, context),
    "selection_statement" : (ast: SelectionStatementASTNode, context: BlockContext) => new UnsupportedStatement(context, "selection statement").setAST(ast),
    "while_statement" : (ast: WhileStatementASTNode, context: BlockContext) => new UnsupportedStatement(context, "while loop").setAST(ast),
    "dowhile_statement" : (ast: DoWhileStatementASTNode, context: BlockContext) => new UnsupportedStatement(context, "do-while loop").setAST(ast),
    "for_statement" : (ast: ForStatementASTNode, context: BlockContext) => new UnsupportedStatement(context, "for loop").setAST(ast),
    "break_statement" : (ast: BreakStatementASTNode, context: BlockContext) => new UnsupportedStatement(context, "break statement").setAST(ast),
    "continue_statement" : (ast: ContinueStatementASTNode, context: BlockContext) => new UnsupportedStatement(context, "continue statement").setAST(ast),
    "return_statement" : (ast: ReturnStatementASTNode, context: BlockContext) => ReturnStatement.createFromAST(ast, context),
    "declaration_statement" : (ast: DeclarationStatementASTNode, context: BlockContext) => DeclarationStatement.createFromAST(ast, context),
    "expression_statement": (ast: ExpressionStatementASTNode, context: BlockContext) => ExpressionStatement.createFromAST(ast, context),
    "null_statement": (ast: NullStatementASTNode, context: BlockContext) => new NullStatement(context).setAST(ast)
}

export function createStatementFromAST<ASTType extends StatementASTNode>(ast: ASTType, context: BlockContext) : ReturnType<(typeof StatementConstructsMap)[ASTType["construct_type"]]> {
    return <any>StatementConstructsMap[ast.construct_type](<any>ast, context);
} 

export abstract class Statement<ASTType extends StatementASTNode = StatementASTNode> extends BasicCPPConstruct<BlockContext, ASTType> {

    public abstract createRuntimeStatement(this: CompiledStatement, parent: RuntimeStatement) : RuntimeStatement;

}

export interface CompiledStatement extends Statement, SuccessfullyCompiled {

}

export abstract class RuntimeStatement<C extends CompiledStatement = CompiledStatement> extends RuntimeConstruct<C> {

    public readonly containingRuntimeFunction: RuntimeFunction;

    public constructor (model: C, parent: RuntimeStatement | RuntimeFunction) {
        super(model, "statement", parent);
        if (parent instanceof RuntimeFunction) {
            this.containingRuntimeFunction = parent;
        }
        else {
            this.containingRuntimeFunction = parent.containingRuntimeFunction;
        }
    }

    public afterPopped() {
        super.afterPopped();
        this.observable.send("reset");
    }

}

export class UnsupportedStatement extends Statement {
    public constructor(context: BlockContext, unsupportedName: string) {
        super(context);
        this.addNote(CPPError.lobster.unsupported_feature(this, unsupportedName));
    }

    // Will never be called since an UnsupportedStatement will always have errors and
    // never satisfy the required this context of CompiledStatement
    public createRuntimeStatement(this: CompiledStatement, parent: RuntimeStatement) : never {
        throw new Error("Cannot create a runtime instance of an unsupported construct.");
    }
}


export interface ExpressionStatementASTNode extends ASTNode {
    readonly construct_type: "expression_statement";
    readonly expression: ExpressionASTNode;
}

export class ExpressionStatement extends Statement<ExpressionStatementASTNode> {

    public readonly expression: Expression;

    public static createFromAST(ast: ExpressionStatementASTNode, context: BlockContext) {
        return new ExpressionStatement(context,
            createExpressionFromAST(ast.expression, context)
        ).setAST(ast);
    }

    public constructor(context: BlockContext, expression: Expression) {
        super(context);
        this.attach(this.expression = expression);
    }

    public createRuntimeStatement(this: CompiledExpressionStatement, parent: RuntimeStatement) {
        return new RuntimeExpressionStatement(this, parent);
    }

    public isTailChild(child: CPPConstruct) {
        return {isTail: true};
    }
}

export interface CompiledExpressionStatement extends ExpressionStatement, SuccessfullyCompiled {
    readonly expression: CompiledExpression;
}

export class RuntimeExpressionStatement extends RuntimeStatement<CompiledExpressionStatement> {
    
    public expression: RuntimeExpression;
    private index = "expr";

    public constructor (model: CompiledExpressionStatement, parent: RuntimeStatement) {
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
        this.startCleanup();
        return false;
	}
}


export interface NullStatementASTNode extends ASTNode {
    readonly construct_type: "null_statement";
}

export class NullStatement extends Statement<NullStatementASTNode> {

    public createRuntimeStatement(this: CompiledNullStatement, parent: RuntimeStatement) {
        return new RuntimeNullStatement(this, parent);
    }

    public isTailChild(child: CPPConstruct) {
        return {isTail: true}; // Note: NullStatement will never actually have children, so this isn't used
    }
}

export interface CompiledNullStatement extends NullStatement, SuccessfullyCompiled {
    
}

export class RuntimeNullStatement extends RuntimeStatement<CompiledNullStatement> {

    public constructor (model: CompiledNullStatement, parent: RuntimeStatement) {
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
    readonly construct_type: "declaration_statement";
    readonly declaration: DeclarationASTNode;
}

export class DeclarationStatement extends Statement<DeclarationStatementASTNode> {

    public readonly declarations: readonly SimpleDeclaration[] | FunctionDefinition /* | ClassDefinition*/;

    public static createFromAST(ast: DeclarationStatementASTNode, context: BlockContext) {
        return new DeclarationStatement(context,
            createDeclarationFromAST(ast.declaration, context)
        ).setAST(ast);
    }

    public constructor(context: BlockContext, declarations: readonly SimpleDeclaration[] | FunctionDefinition /* | ClassDefinition*/) {
        super(context);

        if (declarations instanceof FunctionDefinition) {
            this.addNote(CPPError.stmt.function_definition_prohibited(this));
            this.attach(this.declarations = declarations);
            return;
        }

        this.attachAll(this.declarations = declarations);
        
        // else if (declaration instanceof ClassDefinition) {
        //     this.addNote(CPPError.lobster.unsupported_feature(this, "local classes"));
        // }
    }

    public createRuntimeStatement(this: CompiledDeclarationStatement, parent: RuntimeStatement) {
        return new RuntimeDeclarationStatement(this, parent);
    }

    public isTailChild(child: CPPConstruct) {
        return {isTail: true};
    }
}

export interface CompiledDeclarationStatement extends DeclarationStatement, SuccessfullyCompiled {
    
    // narrows to compiled version and rules out a FunctionDefinition or ClassDefinition
    readonly declarations: readonly CompiledSimpleDeclaration[];
}

export class RuntimeDeclarationStatement extends RuntimeStatement<CompiledDeclarationStatement> {

    private index = 0;

    public constructor (model: CompiledDeclarationStatement, parent: RuntimeStatement) {
        super(model, parent);
    }
	
    protected upNextImpl() {

        let initializers = this.model.declarations.map(d => d.initializer);
        if (this.index < initializers.length) {
            let init = initializers[this.index];
            if(init) {
                // Only declarations with an initializer (e.g. a variable definition) have something
                // to do at runtime. Others (e.g. typedefs) do nothing.
                this.observable.send("initializing", this.index);
                let runtimeInit = init.createRuntimeInitializer(this);
                this.sim.push(runtimeInit);
            }
            ++this.index;
            this.wait();
        }
        else{
            this.startCleanup();
        }
    }

    public stepForwardImpl() {
        return false;
    }
}


export type JumpStatementASTNode = BreakStatementASTNode | ContinueStatementASTNode | ReturnStatementASTNode;

export interface BreakStatementASTNode extends ASTNode {
    readonly construct_type: "break_statement";
}

export interface ContinueStatementASTNode extends ASTNode {
    readonly construct_type: "continue_statement";
}

export interface ReturnStatementASTNode extends ASTNode {
    readonly construct_type: "return_statement";
    readonly expression: ExpressionASTNode;
}

export class ReturnStatement extends Statement<ReturnStatementASTNode> {

    public readonly expression?: Expression;

    // TODO: Technically, this should be CopyInitializer
    public readonly returnInitializer?: DirectInitializer;

    public static createFromAST(ast: ReturnStatementASTNode, context: BlockContext) {
        return ast.expression
            ? new ReturnStatement(context, createExpressionFromAST(ast.expression, context)).setAST(ast)
            : new ReturnStatement(context).setAST(ast);
    }

    public constructor(context: BlockContext, expression?: Expression) {
        super(context);

        let returnType = this.context.containingFunction.type.returnType;

        if (returnType instanceof VoidType) {
            if (expression) {
                // We have an expression to return, but the type is void, so that's bad
                this.addNote(CPPError.stmt.returnStatement.exprVoid(this));
                this.attach(this.expression = expression);
            }
            return;
        }

        // A return statement with no expression is only allowed in void functions.
        // At the moment, constructors/destructors are hacked to have void return type,
        // so this check is ok for return statements in a constructor.
        if (!expression) {
            this.addNote(CPPError.stmt.returnStatement.empty(this));
            return;
        }

        if (returnType instanceof ReferenceType) {
            this.returnInitializer = DirectInitializer.create(context, new ReturnByReferenceEntity(returnType.refTo), [expression]);
        }
        else {
            this.returnInitializer = DirectInitializer.create(context, new ReturnObjectEntity(returnType), [expression]);
        }

        // Note: The expression is NOT attached directly here, since it's attached under the initializer.
        this.attach(this.returnInitializer);
    }

    public createRuntimeStatement(this: CompiledReturnStatement, parent: RuntimeStatement) {
        return new RuntimeReturnStatement(this, parent);
    }
    
    // isTailChild : function(child){
    //     return {isTail: true,
    //         reason: "The recursive call is immediately followed by a return."};
    // }
}

export interface CompiledReturnStatement extends ReturnStatement, SuccessfullyCompiled {
    readonly expression?: CompiledExpression;
    readonly returnInitializer?: CompiledDirectInitializer;
}

enum RuntimeReturnStatementIndices {
    PUSH_INITIALIZER,
    RETURN
}

export class RuntimeReturnStatement extends RuntimeStatement<CompiledReturnStatement> {

    public readonly returnInitializer?: RuntimeDirectInitializer;

    private index = RuntimeReturnStatementIndices.PUSH_INITIALIZER;

    public constructor (model: CompiledReturnStatement, parent: RuntimeStatement) {
        super(model, parent);
        if(model.returnInitializer) {
            this.returnInitializer = model.returnInitializer.createRuntimeInitializer(this);
        }
    }
	
    protected upNextImpl() {
        if(this.index === RuntimeReturnStatementIndices.PUSH_INITIALIZER) {
            if (this.returnInitializer) {
                this.sim.push(this.returnInitializer);
            }
            this.index = RuntimeReturnStatementIndices.RETURN;
        }
    }

    public stepForwardImpl() {
        if (this.index === RuntimeReturnStatementIndices.RETURN) {
            let func = this.containingRuntimeFunction;
            this.observable.send("returned", {call: func.caller})
            this.sim.popUntil(func);
        }
    }
}

export interface BlockASTNode extends ASTNode {
    readonly construct_type: "compound_statement";
    readonly statements: readonly StatementASTNode[];
}

function createBlockContext(context: FunctionContext) : BlockContext {
    return Object.assign({}, context, {
        contextualScope: new BlockScope(context.contextualScope),
        localObjects: [],
        localReferences: []
    });
}

export class Block extends Statement<BlockASTNode> {

    public readonly statements: readonly Statement[] = [];

    public readonly blockContext: BlockContext;

    public static createFromAST(ast: BlockASTNode, context: FunctionContext) {
        let block = new Block(context).setAST(ast);
        ast.statements.forEach((stmtAst) => block.addStatement(createStatementFromAST(stmtAst, context)));
        return block;
    }

    public constructor(context: BlockContext) {
        super(context);
        this.blockContext = createBlockContext(context);
    }

    public addStatement(statement: Statement) {
        asMutable(this.statements).push(statement);
        this.attach(statement);
    }

    public createRuntimeStatement(this: CompiledBlock, parent: RuntimeStatement | RuntimeFunction) {
        return new RuntimeBlock(this, parent);
    }

    // isTailChild : function(child){
    //     var last = this.statements.last();
    //     if (child !== last){
    //         if (child === this.statements[this.statements.length-2] && isA(last, Statements.Return) && !last.hasExpression){
    //             return {isTail: true,
    //                 reason: "The only thing after the recursive call is an empty return.",
    //                 others: [last]
    //             }
    //         }
    //         else{
    //             var others = [];
    //             for (var otherIndex = this.statements.length-1; this.statements[otherIndex] !== child && otherIndex >= 0; --otherIndex){
    //                 var other = this.statements[otherIndex];
    //                 if (!(isA(other, Statements.Return) && !other.expression)){
    //                     others.unshift(other);
    //                 }
    //             }
    //             return {isTail: false,
    //                 reason: "There are other statements in this block that will execute after the recursive call.",
    //                 others: others
    //             }
    //         }
    //     }
    //     else{
    //         return {isTail: true};
    //     }
    // }

}

export interface CompiledBlock extends Block, SuccessfullyCompiled {
    readonly statements: readonly CompiledStatement[];
}

export class RuntimeBlock<C extends CompiledBlock = CompiledBlock> extends RuntimeStatement<C> {

    public readonly statements: readonly RuntimeStatement[];

    private index = 0;

    public constructor (model: C, parent: RuntimeStatement | RuntimeFunction) {
        super(model, parent);
        this.statements = model.statements.map((stmt) => stmt.createRuntimeStatement(this));
    }
	
    protected upNextImpl() {
        if(this.index < this.statements.length) {
            this.observable.send("index", this.index);
            this.sim.push(this.statements[this.index++]);
        }
        else {
            this.startCleanup();
        }
    }

    public stepForwardImpl() {
        // Nothing to do here, block doesn't actually do anything but run individual statements.
        // TODO: However, something will ultimately need to be added to run destructors when a
        // block finishes, rather than just when a function finishes.
    }

    
    // isTailChild : function(child){
    //     return {isTail: true,
    //         reason: "The recursive call is immediately followed by a return."};
    // }
}

// export class FunctionBodyBlock extends Block {

//     public constructor(context: ExecutableTranslationUnitContext, functionBlockScope: FunctionBlockScope, statements: readonly Statement[]) {
//         super(context, functionBlockScope, statements);
//     }

// }

// export interface CompiledFunctionBodyBlock extends FunctionBodyBlock, SuccessfullyCompiled {
//     readonly statements: readonly CompiledStatement[];
// }

// export var OpaqueFunctionBodyBlock = Statement.extend({
//     _name: "OpaqueFunctionBodyBlock",

//     i_createFromAST : function(ast){
//         Statements.OpaqueFunctionBodyBlock._parent.i_createFromAST.apply(this, arguments);

//         this.blockScope = FunctionBlockScope.instance(this.contextualScope);
//         this.effects = ast.effects;
//     },

//     // upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//     //     if (inst.index >= this.statements.length){
//     //         this.done(sim, inst);
//     //     }
//     //     else{
//     //         inst.send("index", inst.index);
//     //         var nextStmt = this.statements[inst.index++];
//     //         inst.childInstances.statements.push(nextStmt.createAndPushInstance(sim, inst));
//     //     }
//     //     return true;
//     // },

//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         // No work to be done here? Should be enough to delegate to statements
//         // via upNext.
//         this.effects(sim, inst);
//         this.done(sim,inst);
//         return true;
//     },

//     isTailChild : function(){
//         return {isTail: true};
//     }
// });


export interface SelectionStatementASTNode extends ASTNode {
    readonly construct_type: "selection_statement";
    readonly condition: ExpressionASTNode;
    readonly then: StatementASTNode;
    readonly otherwise: StatementASTNode;
}

// export var Selection = Statement.extend({
//     _name: "Selection",
//     initIndex: "condition",

//     i_childrenToCreate : ["condition", "then", "otherwise"],

//     compile : function(){

//         // Compile condition, convert to bool if not already, error if can't convert
//         this.condition.compile();
//         this.condition = standardConversion(this.condition, Types.Bool.instance());
//         if (!isA(this.condition.type, Types.Bool)){
//             this.addNote(CPPError.stmt.selection.condition_bool(this, this.condition));
//         }

//         this.then.compile();

//         // else branch may not be specified, so only compile if it is
//         this.otherwise && this.otherwise.compile();
//     },

//     upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if(inst.index == "condition"){
//             inst.condition = this.condition.createAndPushInstance(sim, inst);
//             inst.index = "body";
//             return true;
//         }
//         else if (inst.index == "body"){
//             if(inst.condition.evalResult.value){
//                 inst.then = this.then.createAndPushInstance(sim, inst);
//                 inst.index = "done";
//                 return true;
//             }
//             else{
//                 if (this.otherwise) {
//                     inst.otherwise = this.otherwise.createAndPushInstance(sim, inst);
//                 }
//                 inst.index = "done";
//                 return true;
//             }
//         }
//         else{
//             this.done(sim, inst);
//             return true;
//         }
//     },

//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){

//     },

//     isTailChild : function(child){
//         if (child === this.condition){
//             return {isTail: false,
//                 reason: "After the function returns, one of the branches will run.",
//                 others: [this.then, this.otherwise]
//             }
//         }
//         else{
//             if (this.otherwise){
//                 //if (child === this.then){
//                     return {isTail: true,
//                         reason: "Only one branch in a selection structure (i.e. if/else) can ever execute, so don't worry about the code in the other branches."
//                     };
//                 //}
//                 //else{
//                 //    return {isTail: true,
//                 //        reason: "Don't worry about the code in the if branch - if the recursive call even happened it means we took the else branch."
//                 //    };
//                 //}
//             }
//             else{
//                 return {isTail: true
//                 };
//             }
//         }
//     }
// });

export type IterationStatementASTNode = WhileStatementASTNode | DoWhileStatementASTNode | ForStatementASTNode;

export interface WhileStatementASTNode extends ASTNode {
    readonly construct_type: "while_statement";
    readonly condition: ExpressionASTNode;
    readonly body: StatementASTNode;
}

export interface DoWhileStatementASTNode extends ASTNode {
    readonly construct_type: "dowhile_statement";
    readonly condition: ExpressionASTNode;
    readonly body: StatementASTNode;
}

export interface ForStatementASTNode extends ASTNode {
    readonly construct_type: "for_statement";
    readonly condition: ExpressionASTNode;
    readonly initial: ExpressionStatementASTNode | NullStatementASTNode | DeclarationStatementASTNode;
    readonly post: ExpressionASTNode;
    readonly body: StatementASTNode;
}

// export var Iteration = Statement.extend({
//     isTailChild : function(child){
//         return {
//             isTail: false,
//             reason: "If the loop goes around again, then that would be more work after the recursive call.",
//             others: [this]
//         };
//     }
// });

// export var While = Iteration.extend({
//     _name: "While",
//     initIndex: "condition",

//     i_createFromAST : function(ast) {
//         Statements.While._parent.i_createFromAST.apply(this, arguments);

//         this.body = this.i_createChild(ast.body);

//         // TODO: technically, the C++ standard allows a declaration as the condition for a while loop.
//         // This appears to be currently impossible in Lobster, but when implemented it will require
//         // special implementation of the scope of the body if it's not already a block.
//         // Or maybe we could just decide to parse it correctly (will still require some changes), but
//         // then simply say it's not supported since it's such a rare thing.
//         this.condition = this.i_createChild(ast.condition, {
//             scope : (isA(this.body, Statements.Block) ? this.body.blockScope : this.contextualScope)
//         });

//     },

//     compile : function(){

//         this.condition.compile();
//         this.condition = standardConversion(this.condition, Types.Bool.instance());
//         if (!isA(this.condition.type, Types.Bool)){
//             this.addNote(CPPError.stmt.iteration.condition_bool(this.condition, this.condition))
//         }

//         this.body.compile();
//     },

//     upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index == "wait"){
//             return false;
//         }
//         else if(inst.index == "condition"){
//             inst.send("reset");
//             inst.condition = this.condition.createAndPushInstance(sim, inst);
//             inst.index = "checkCond";
//             return true;
//         }
//         else if (inst.index == "checkCond"){
//             if(inst.condition.evalResult.value) {
//                 inst.index = "body";
//             }
//             else{
//                 this.done(sim, inst);
//             }
//             return true;
//         }
//         else if (inst.index == "body"){
//             inst.body = this.body.createAndPushInstance(sim, inst);
//             inst.index = "wait";
//             return true;
//         }
//     },

//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index == "wait") {
//             inst.index = "condition"; // remove the wait index on iterations after the first
//         }
//     }
// });


// export var DoWhile = While.extend({
//     _name: "DoWhile",
//     initIndex: "body"
// });


// export var For = Iteration.extend({
//     _name: "For",
//     initIndex: "init",

//     init : function(ast, context) {
//         this.initParent(ast, context);

//         this.body = this.i_createChild(ast.body);

//         // If the body is already a block, we can just use its scope. Otherwise, create one for the for loop.
//         this.bodyScope = (isA(this.body, Statements.Block) ? this.body.blockScope : BlockScope.instance(this.contextualScope));

//         // Note: grammar ensures this will be an expression or declaration statement
//         this.initial = this.i_createChild(ast.initial, {scope: this.bodyScope});

//         this.condition = this.i_createChild(ast.condition, {scope : this.bodyScope});

//         this.post = this.i_createChild(ast.post, {scope : this.bodyScope});

//     },

//     compile : function(){
//         this.initial.compile();

//         this.condition.compile();
//         this.condition = standardConversion(this.condition, Types.Bool.instance());
//         if (!isA(this.condition.type, Types.Bool)){
//             this.addNote(CPPError.stmt.iteration.condition_bool(this.condition, this.condition))
//         }

//         this.body.compile();

//         this.post.compile();
//     },


//     upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index == "wait"){
//             return false;
//         }
//         else if (inst.index == "init"){
//             inst.initial = this.initial.createAndPushInstance(sim, inst);
//             inst.index = "condition";
//             return true;
//         }
//         else if(inst.index == "condition"){
//             inst.send("reset");
//             inst.condition = this.condition.createAndPushInstance(sim, inst);
//             inst.index = "body";
//             return true;
//         }
//         else if (inst.index == "body"){
//             if(inst.condition.evalResult.value){
//                 inst.body = this.body.createAndPushInstance(sim, inst);
//                 inst.index = "post";
//                 return true;
//             }
//             else{
//                 this.done(sim, inst);
//                 return true;
//             }
//         }
//         else if (inst.index == "post"){
//             inst.post = this.post.createAndPushInstance(sim, inst);
//             inst.index = "wait";
//             return true;
//         }
//     },

//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         inst.index = "condition"; // remove the wait index on iterations after the first
//     }
// });



// export var Break = Statement.extend({
//     _name: "Break",

//     compile : function() {
//         // Theoretically this could be put into the i_createFromAST function since it only uses
//         // syntactic information to determine whether the break is inside an iteration statement,
//         // but it would feel weird to add an error note before the compile function even runs... :/

//         var container = this.parent;
//         while(container && !isA(container, Statements.Iteration)){
//             container = container.parent;
//         }

//         this.container = container;

//         // container should exist, otherwise this break is somewhere it shouldn't be
//         if (!container || !isA(container, Statements.Iteration)){
//             this.addNote(CPPError.stmt.breakStatement.location(this, this.condition));
//         }
//     },

//     createAndPushInstance : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var inst = RuntimeConstruct.instance(sim, this, "break", "stmt", inst);
//         sim.push(inst);
//         return inst;
//     },

//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index == "break"){
//             var containerInst = inst.findParentByModel(this.container);
// //            inst.send("returned", {call: func.parent});
//             containerInst.done(sim); // TODO: should be done with simulation stack instead of parent
//             // return true;
//         }
//     }
// });


// export var Continue = Unsupported.extend({
//     _name: "Statements.Continue",
//     englishName: "continue statement"
// });



export interface LabeledStatementASTNode extends ASTNode {
    readonly construct_type: "labeled_statement";
}

export interface SwitchStatementASTNode extends ASTNode {
    readonly construct_type: "switch_statement";
}

