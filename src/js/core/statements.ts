import { BasicCPPConstruct, SuccessfullyCompiled, RuntimeConstruct, TranslationUnitContext, ASTNode,  CPPConstruct, BlockContext, RuntimeFunction, FunctionContext, InvalidConstruct } from "./constructs";
import { CPPError } from "./errors";
import { ExpressionASTNode, createExpressionFromAST } from "./expressions";
import { DeclarationASTNode, SimpleDeclaration, FunctionDefinition, CompiledSimpleDeclaration, createSimpleDeclarationFromAST, createDeclarationFromAST, VariableDefinition, ClassDefinition } from "./declarations";
import { DirectInitializer, CompiledDirectInitializer, RuntimeDirectInitializer } from "./initializers";
import { VoidType, ReferenceType, Bool } from "./types";
import { ReturnByReferenceEntity, ReturnObjectEntity, BlockScope, LocalObjectEntity, LocalReferenceEntity } from "./entities";
import { Mutable, asMutable } from "../util/util";
import { Expression, CompiledExpression, RuntimeExpression } from "./expressionBase";
import { standardConversion } from "./standardConversions";
import { StatementOutlet, ConstructOutlet, ExpressionStatementOutlet, NullStatementOutlet, DeclarationStatementOutlet, ReturnStatementOutlet, BlockOutlet, IfStatementOutlet, WhileStatementOutlet, ForStatementOutlet } from "../view/codeOutlets";

export type StatementASTNode =
    LabeledStatementASTNode |
    BlockASTNode |
    IfStatementASTNode |
    IterationStatementASTNode |
    JumpStatementASTNode |
    DeclarationStatementASTNode |
    ExpressionStatementASTNode |
    NullStatementASTNode;

const StatementConstructsMap = {
    "labeled_statement" : (ast: LabeledStatementASTNode, context: BlockContext) => new UnsupportedStatement(context, "labeled statement").setAST(ast),
    "block" : (ast: BlockASTNode, context: BlockContext) => Block.createFromAST(ast, context),
    "if_statement" : (ast: IfStatementASTNode, context: BlockContext) => IfStatement.createFromAST(ast, context),
    "while_statement" : (ast: WhileStatementASTNode, context: BlockContext) => WhileStatement.createFromAST(ast, context),
    "dowhile_statement" : (ast: DoWhileStatementASTNode, context: BlockContext) => new UnsupportedStatement(context, "do-while loop").setAST(ast),
    "for_statement" : (ast: ForStatementASTNode, context: BlockContext) => ForStatement.createFromAST(ast, context),
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

    public abstract createDefaultOutlet(this: CompiledStatement, element: JQuery, parent?: ConstructOutlet): StatementOutlet;

    public isBlock() : this is Block {
        return false;
    }

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
    
    public createDefaultOutlet(element: JQuery, parent?: ConstructOutlet) : never {
        throw new Error("Cannot create an outlet for an unsupported construct.");
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
    
    public createDefaultOutlet(this: CompiledExpressionStatement, element: JQuery, parent?: ConstructOutlet) {
        return new ExpressionStatementOutlet(element, this, parent);
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
        else {
            this.startCleanup();
        }
	}
	
	protected stepForwardImpl() {
        
	}
}


export interface NullStatementASTNode extends ASTNode {
    readonly construct_type: "null_statement";
}

export class NullStatement extends Statement<NullStatementASTNode> {

    public createRuntimeStatement(this: CompiledNullStatement, parent: RuntimeStatement) {
        return new RuntimeNullStatement(this, parent);
    }
    
    public createDefaultOutlet(this: CompiledNullStatement, element: JQuery, parent?: ConstructOutlet) {
        return new NullStatementOutlet(element, this, parent);
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

    public readonly declarations: readonly SimpleDeclaration[] | FunctionDefinition | ClassDefinition | InvalidConstruct;

    public static createFromAST(ast: DeclarationStatementASTNode, context: BlockContext) {
        return new DeclarationStatement(context,
            createDeclarationFromAST(ast.declaration, context)
        ).setAST(ast);
    }

    public constructor(context: BlockContext, declarations: readonly SimpleDeclaration[] | FunctionDefinition | ClassDefinition | InvalidConstruct) {
        super(context);

        if (declarations instanceof InvalidConstruct) {
            this.attach(this.declarations = declarations);
            return;
        }

        if (declarations instanceof FunctionDefinition) {
            this.addNote(CPPError.stmt.function_definition_prohibited(this));
            this.attach(this.declarations = declarations);
            return;
        }

        if (declarations instanceof ClassDefinition) {
            this.addNote(CPPError.lobster.unsupported_feature(this, "local classes"));
            this.attach(this.declarations = declarations);
            return;
        }

        this.attachAll(this.declarations = declarations);
    }

    public createRuntimeStatement(this: CompiledDeclarationStatement, parent: RuntimeStatement) {
        return new RuntimeDeclarationStatement(this, parent);
    }
    
    public createDefaultOutlet(this: CompiledDeclarationStatement, element: JQuery, parent?: ConstructOutlet) {
        return new DeclarationStatementOutlet(element, this, parent);
    }

    public isTailChild(child: CPPConstruct) {
        return {isTail: true};
    }
}

export interface CompiledDeclarationStatement extends DeclarationStatement, SuccessfullyCompiled {
    
    // narrows to compiled version and rules out a FunctionDefinition, ClassDefinition, or InvalidConstruct
    readonly declarations: readonly CompiledSimpleDeclaration[];
}

export class RuntimeDeclarationStatement extends RuntimeStatement<CompiledDeclarationStatement> {

    public readonly currentDeclarationIndex : number | null = null;

    public constructor (model: CompiledDeclarationStatement, parent: RuntimeStatement) {
        super(model, parent);
    }
	
    protected upNextImpl() {
        let nextIndex = this.currentDeclarationIndex === null ? 0 : this.currentDeclarationIndex + 1;

        let initializers = this.model.declarations.map(d => d.initializer);
        if (nextIndex < initializers.length) {
            (<Mutable<this>>this).currentDeclarationIndex = nextIndex;
            let init = initializers[nextIndex];
            if(init) {
                // Only declarations with an initializer (e.g. a variable definition) have something
                // to do at runtime. Others (e.g. typedefs) do nothing.
                this.observable.send("initializing", nextIndex);
                let runtimeInit = init.createRuntimeInitializer(this);
                this.sim.push(runtimeInit);
            }
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
            this.returnInitializer = DirectInitializer.create(context, new ReturnByReferenceEntity(returnType.refTo), [expression], "copy");
        }
        else {
            this.returnInitializer = DirectInitializer.create(context, new ReturnObjectEntity(returnType), [expression], "copy");
        }

        // Note: The expression is NOT attached directly here, since it's attached under the initializer.
        this.attach(this.returnInitializer);
    }

    public createRuntimeStatement(this: CompiledReturnStatement, parent: RuntimeStatement) {
        return new RuntimeReturnStatement(this, parent);
    }
    
    public createDefaultOutlet(this: CompiledReturnStatement, element: JQuery, parent?: ConstructOutlet) {
        return new ReturnStatementOutlet(element, this, parent);
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
    readonly construct_type: "block";
    readonly statements: readonly StatementASTNode[];
}

function createBlockContext(context: FunctionContext) : BlockContext {
    return Object.assign({}, context, {
        contextualScope: new BlockScope(context.translationUnit, context.contextualScope)
    });
}

export class Block extends Statement<BlockASTNode> {

    public readonly statements: readonly Statement[] = [];

    public static createFromAST(ast: BlockASTNode, context: FunctionContext) {
        let block = new Block(context).setAST(ast);
        ast.statements.forEach((stmtAst) => block.addStatement(createStatementFromAST(stmtAst, block.context)));
        return block;
    }

    public constructor(context: FunctionContext) {
        super(createBlockContext(context));
    }

    public isBlock() : this is Block {
        return true;
    }

    public addStatement(statement: Statement) {
        asMutable(this.statements).push(statement);
        this.attach(statement);
    }

    public createRuntimeStatement(this: CompiledBlock, parent: RuntimeStatement | RuntimeFunction) {
        return new RuntimeBlock(this, parent);
    }
    
    public createDefaultOutlet(this: CompiledBlock, element: JQuery, parent?: ConstructOutlet) : BlockOutlet;
    public createDefaultOutlet(this: CompiledStatement, element: JQuery, parent?: ConstructOutlet) : never;
    public createDefaultOutlet(this: CompiledBlock, element: JQuery, parent?: ConstructOutlet) {
        return new BlockOutlet(element, this, parent);
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

export class RuntimeBlock extends RuntimeStatement<CompiledBlock> {

    public readonly statements: readonly RuntimeStatement[];

    private index = 0;

    public constructor (model: CompiledBlock, parent: RuntimeStatement | RuntimeFunction) {
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



// export class OpaqueBlock extends Statement implements SuccessfullyCompiled {
    
//     public _t_isCompiled: never;

//     private readonly effects: (rtBlock: RuntimeOpaqueBlock) => void;

//     public constructor(context: BlockContext, effects: (rtBlock: RuntimeOpaqueBlock) => void) {
//         super(context);
//         this.effects = effects;
//     }

//     public createRuntimeStatement(parent: RuntimeStatement | RuntimeFunction) {
//         return new RuntimeOpaqueBlock(this, parent, this.effects);
//     }

// }

// export class RuntimeOpaqueBlock extends RuntimeStatement<OpaqueBlock> {

//     private effects: (rtBlock: RuntimeOpaqueBlock) => void;

//     public constructor (model: OpaqueBlock, parent: RuntimeStatement | RuntimeFunction, effects: (rtBlock: RuntimeOpaqueBlock) => void) {
//         super(model, parent);
//         this.effects = effects;
//     }
	
//     protected upNextImpl() {
//         // Nothing to do
//     }

//     public stepForwardImpl() {
//         this.effects(this);
//         this.startCleanup();
//     }

    
//     // isTailChild : function(child){
//     //     return {isTail: true,
//     //         reason: "The recursive call is immediately followed by a return."};
//     // }
// }



export interface IfStatementASTNode extends ASTNode {
    readonly construct_type: "if_statement";
    readonly condition: ExpressionASTNode;
    readonly then: StatementASTNode;
    readonly otherwise?: StatementASTNode;
}

export class IfStatement extends Statement<IfStatementASTNode> {

    public readonly condition: Expression;
    public readonly then: Statement;
    public readonly otherwise?: Statement;

    public static createFromAST(ast: IfStatementASTNode, context: BlockContext) : IfStatement {

        let condition = createExpressionFromAST(ast.condition, context);

        // If either of the substatements are not a block, they get their own implicit block context.
        // (If the substatement is a block, it creates its own block context, so we don't do that here.)
        let then = ast.then.construct_type === "block" ?
            createStatementFromAST(ast.then, context) :
            createStatementFromAST(ast.then, createBlockContext(context));

        if (!ast.otherwise) { // no else branch
            return new IfStatement(context, condition, then);
        }
        else { // else branch is present
            // See note above about substatement implicit block context
            let otherwise = ast.otherwise.construct_type === "block" ?
                createStatementFromAST(ast.otherwise, context) :
                createStatementFromAST(ast.otherwise, createBlockContext(context));

            return new IfStatement(context, condition, then, otherwise);
        }
    }

    public constructor(context: BlockContext, condition: Expression, then: Statement, otherwise?: Statement) {
        super(context);

        if (condition.isWellTyped()) {
            this.attach(this.condition = standardConversion(condition, Bool.BOOL));
        }
        else {
            this.attach(this.condition = condition);
        }

        this.attach(this.then = then);
        if (otherwise) {
            this.attach(this.otherwise = otherwise);
        }
        
        if (this.condition.isWellTyped() && !this.condition.isTyped(Bool)) {
            this.addNote(CPPError.stmt.if.condition_bool(this, this.condition));
        }
    }

    public createRuntimeStatement(this: CompiledIfStatement, parent: RuntimeStatement) {
        return new RuntimeIfStatement(this, parent);
    }

    public createDefaultOutlet(this: CompiledIfStatement, element: JQuery, parent?: ConstructOutlet) {
        return new IfStatementOutlet(element, this, parent);
    }

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
//                         reason: "Only one branch in an if/else structure can ever execute, so don't worry about the code in the other branches."
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

}

export interface CompiledIfStatement extends IfStatement, SuccessfullyCompiled {
    readonly condition: CompiledExpression<Bool, "prvalue">;
    readonly then: CompiledStatement;
    readonly otherwise?: CompiledStatement;
}

export class RuntimeIfStatement extends RuntimeStatement<CompiledIfStatement> {

    public readonly condition: RuntimeExpression<Bool, "prvalue">;
    public readonly then: RuntimeStatement;
    public readonly otherwise?: RuntimeStatement;

    private index = 0;

    public constructor (model: CompiledIfStatement, parent: RuntimeStatement) {
        super(model, parent);
        this.condition = model.condition.createRuntimeExpression(this);
        this.then = model.then.createRuntimeStatement(this);
        if (model.otherwise) {
            this.otherwise = model.otherwise.createRuntimeStatement(this);
        }
    }

    private static upNextFns = [
        (rt: RuntimeIfStatement) => {
            rt.sim.push(rt.condition);
        },
        (rt: RuntimeIfStatement) => {
            if (rt.condition.evalResult.rawValue) {
                rt.sim.push(rt.then);
            }
            else if (rt.otherwise) {
                rt.sim.push(rt.otherwise);
            }
        },
        (rt: RuntimeIfStatement) => {
            rt.startCleanup();
        },
    ]

    protected upNextImpl() {
        RuntimeIfStatement.upNextFns[this.index++](this);
    }

    public stepForwardImpl() {
        // Nothing to do here
    }
}




export type IterationStatementASTNode = WhileStatementASTNode | DoWhileStatementASTNode | ForStatementASTNode;

export interface WhileStatementASTNode extends ASTNode {
    readonly construct_type: "while_statement";
    readonly condition: ExpressionASTNode;
    readonly body: StatementASTNode;
}

export class WhileStatement extends Statement<WhileStatementASTNode> {

    public readonly condition: Expression;
    public readonly body: Statement;

    public static createFromAST(ast: WhileStatementASTNode, context: BlockContext) : WhileStatement {

        // If the body substatement is not a block, it gets its own implicit block context.
        // (If the substatement is a block, it creates its own block context, so we don't do that here.)
        let body = ast.body.construct_type === "block" ?
            createStatementFromAST(ast.body, context) :
            createStatementFromAST(ast.body, createBlockContext(context));

        return new WhileStatement(context,
            createExpressionFromAST(ast.condition, context),
            body);
    }

    public constructor(context: BlockContext, condition: Expression, body: Statement) {
        super(context);

        if (condition.isWellTyped()) {
            this.attach(this.condition = standardConversion(condition, Bool.BOOL));
        }
        else {
            this.attach(this.condition = condition);
        }

        this.attach(this.body = body);
        
        if (this.condition.isWellTyped() && !this.condition.isTyped(Bool)) {
            this.addNote(CPPError.stmt.iteration.condition_bool(this, this.condition));
        }
    }

    public createRuntimeStatement(this: CompiledWhileStatement, parent: RuntimeStatement) {
        return new RuntimeWhileStatement(this, parent);
    }

    public createDefaultOutlet(this: CompiledWhileStatement, element: JQuery, parent?: ConstructOutlet) {
        return new WhileStatementOutlet(element, this, parent);
    }

}

export interface CompiledWhileStatement extends WhileStatement, SuccessfullyCompiled {
    readonly condition: CompiledExpression<Bool, "prvalue">;
    readonly body: CompiledStatement;
}

export class RuntimeWhileStatement extends RuntimeStatement<CompiledWhileStatement> {

    public readonly condition: RuntimeExpression<Bool, "prvalue">;
    public readonly body?: RuntimeStatement;

    private index = 0;

    public constructor (model: CompiledWhileStatement, parent: RuntimeStatement) {
        super(model, parent);
        this.condition = model.condition.createRuntimeExpression(this);
        // Do not create body here, since it might not actually run
    }

    private static upNextFns = [
        (rt: RuntimeWhileStatement) => {
            rt.sim.push(rt.condition);
        },
        (rt: RuntimeWhileStatement) => {
            if (rt.condition.evalResult.rawValue === 1) {
                rt.sim.push(asMutable(rt).body = rt.model.body.createRuntimeStatement(rt));
            }
            else {
                rt.startCleanup();
            }
        },
        (rt: RuntimeWhileStatement) => {
            // Do nothing, pass to stepForward, which will reset
        }
    ]

    protected upNextImpl() {
        RuntimeWhileStatement.upNextFns[this.index](this);
        this.index = (this.index + 1) % RuntimeWhileStatement.upNextFns.length;
    }

    public stepForwardImpl() {
        (<Mutable<this>>this).condition = this.model.condition.createRuntimeExpression(this);
        delete (<Mutable<this>>this).body;

    }
    
//     isTailChild : function(child){
//         return {
//             isTail: false,
//             reason: "If the loop goes around again, then that would be more work after the recursive call.",
//             others: [this]
//         };
//     }
}

export interface DoWhileStatementASTNode extends ASTNode {
    readonly construct_type: "dowhile_statement";
    readonly condition: ExpressionASTNode;
    readonly body: StatementASTNode;
}

// export var DoWhile = While.extend({
//     _name: "DoWhile",
//     initIndex: "body"
// });

export interface ForStatementASTNode extends ASTNode {
    readonly construct_type: "for_statement";
    readonly condition: ExpressionASTNode;
    readonly initial: ExpressionStatementASTNode | NullStatementASTNode | DeclarationStatementASTNode;
    readonly post: ExpressionASTNode;
    readonly body: StatementASTNode;
}


export class ForStatement extends Statement<ForStatementASTNode> {

    public readonly initial: ExpressionStatement | NullStatement | DeclarationStatement;
    public readonly condition: Expression;
    public readonly body: Statement;
    public readonly post: Expression;
    
    public static createFromAST(ast: ForStatementASTNode, context: BlockContext) : ForStatement {

        // If the body substatement is not a block, it gets its own implicit block context.
        // (If the substatement is a block, it creates its own block context, so we don't do that here.)
        let body = ast.body.construct_type === "block" ?
            createStatementFromAST(ast.body, context) :
            createStatementFromAST(ast.body, createBlockContext(context));

        // NOTE the use of body context for all the children.
        // e.g. for(int i = 0; i < 10; ++i) { cout << i; }
        // All children (initial, condition, post, body) share the same block
        // context and scope where i is declared.
        return new ForStatement(context,
            createStatementFromAST(ast.initial, body.context),
            createExpressionFromAST(ast.condition, body.context),
            body,
            createExpressionFromAST(ast.post, body.context));
    }

    public constructor(context: BlockContext, initial: ExpressionStatement | NullStatement | DeclarationStatement,
            condition: Expression, body: Statement, post: Expression) {

        super(context);

        this.attach(this.initial = initial);

        if (condition.isWellTyped()) {
            this.attach(this.condition = standardConversion(condition, Bool.BOOL));
        }
        else {
            this.attach(this.condition = condition);
        }
        
        if (this.condition.isWellTyped() && !this.condition.isTyped(Bool)) {
            this.addNote(CPPError.stmt.iteration.condition_bool(this, this.condition));
        }

        this.attach(this.body = body);
        this.attach(this.post = post);
    }

    public createRuntimeStatement(this: CompiledForStatement, parent: RuntimeStatement) {
        return new RuntimeForStatement(this, parent);
    }

    public createDefaultOutlet(this: CompiledForStatement, element: JQuery, parent?: ConstructOutlet) {
        return new ForStatementOutlet(element, this, parent);
    }

}

export interface CompiledForStatement extends ForStatement, SuccessfullyCompiled {
    readonly initial: CompiledExpressionStatement | CompiledNullStatement | CompiledDeclarationStatement;
    readonly condition: CompiledExpression<Bool, "prvalue">;
    readonly body: CompiledStatement;
    readonly post: CompiledExpression;
}

export class RuntimeForStatement extends RuntimeStatement<CompiledForStatement> {

    public readonly initial: RuntimeExpressionStatement | RuntimeNullStatement | RuntimeDeclarationStatement;
    public readonly condition: RuntimeExpression<Bool, "prvalue">;
    public readonly body?: RuntimeStatement;
    public readonly post?: RuntimeExpression;

    private index = 0;

    public constructor (model: CompiledForStatement, parent: RuntimeStatement) {
        super(model, parent);
        this.initial = (<CompiledExpressionStatement & CompiledNullStatement & CompiledDeclarationStatement>model.initial).createRuntimeStatement(this); // HACK cast
        this.condition = model.condition.createRuntimeExpression(this);
        // Do not create body here, since it might not actually run
    }

    private static upNextFns = [
        (rt: RuntimeForStatement) => {
            rt.sim.push(rt.initial);
        },
        (rt: RuntimeForStatement) => {
            rt.sim.push(rt.condition);
        },
        (rt: RuntimeForStatement) => {
            if (rt.condition.evalResult.rawValue === 1) {
                rt.sim.push(asMutable(rt).body = rt.model.body.createRuntimeStatement(rt));
            }
            else {
                rt.startCleanup();
            }
        },
        (rt: RuntimeForStatement) => {
            rt.sim.push(asMutable(rt).post = rt.model.post.createRuntimeExpression(rt));
        },
        (rt: RuntimeForStatement) => {
            // Do nothing, pass to stepForward, which will reset
        }
    ]

    protected upNextImpl() {
        RuntimeForStatement.upNextFns[this.index++](this);
        if (this.index == RuntimeForStatement.upNextFns.length) {
            this.index = 1; // reset to 1 rather than 0, since 0 is the initial which only happens once
        }
    }

    public stepForwardImpl() {
        (<Mutable<this>>this).condition = this.model.condition.createRuntimeExpression(this);
        delete (<Mutable<this>>this).body;
        delete (<Mutable<this>>this).post;

    }
    
//     isTailChild : function(child){
//         return {
//             isTail: false,
//             reason: "If the loop goes around again, then that would be more work after the recursive call.",
//             others: [this]
//         };
//     }
}




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

