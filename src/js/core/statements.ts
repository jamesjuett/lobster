import { BasicCPPConstruct, SuccessfullyCompiled, RuntimeConstruct, TranslationUnitContext, ASTNode, CPPConstruct, BlockContext, FunctionContext, InvalidConstruct } from "./constructs";
import { CPPError } from "./errors";
import { ExpressionASTNode, createExpressionFromAST, createRuntimeExpression, standardConversion } from "./expressions";
import { DeclarationASTNode, FunctionDefinition, createSimpleDeclarationFromAST, createDeclarationFromAST, VariableDefinition, ClassDefinition, AnalyticSimpleDeclaration, AnalyticCompiledDeclaration } from "./declarations";
import { DirectInitializer, CompiledDirectInitializer, RuntimeDirectInitializer } from "./initializers";
import { VoidType, ReferenceType, Bool } from "./types";
import { ReturnByReferenceEntity, ReturnObjectEntity, BlockScope, LocalObjectEntity, LocalReferenceEntity } from "./entities";
import { Mutable, asMutable } from "../util/util";
import { Expression, CompiledExpression, RuntimeExpression } from "./expressionBase";
import { StatementOutlet, ConstructOutlet, ExpressionStatementOutlet, NullStatementOutlet, DeclarationStatementOutlet, ReturnStatementOutlet, BlockOutlet, IfStatementOutlet, WhileStatementOutlet, ForStatementOutlet } from "../view/codeOutlets";
import { RuntimeFunction } from "./functions";

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
    "labeled_statement": (ast: LabeledStatementASTNode, context: BlockContext) => new UnsupportedStatement(context, ast, "labeled statement"),
    "block": (ast: BlockASTNode, context: BlockContext) => Block.createFromAST(ast, context),
    "if_statement": (ast: IfStatementASTNode, context: BlockContext) => IfStatement.createFromAST(ast, context),
    "while_statement": (ast: WhileStatementASTNode, context: BlockContext) => WhileStatement.createFromAST(ast, context),
    "dowhile_statement": (ast: DoWhileStatementASTNode, context: BlockContext) => new UnsupportedStatement(context, ast, "do-while loop"),
    "for_statement": (ast: ForStatementASTNode, context: BlockContext) => ForStatement.createFromAST(ast, context),
    "break_statement": (ast: BreakStatementASTNode, context: BlockContext) => new UnsupportedStatement(context, ast, "break statement"),
    "continue_statement": (ast: ContinueStatementASTNode, context: BlockContext) => new UnsupportedStatement(context, ast, "continue statement"),
    "return_statement": (ast: ReturnStatementASTNode, context: BlockContext) => ReturnStatement.createFromAST(ast, context),
    "declaration_statement": (ast: DeclarationStatementASTNode, context: BlockContext) => DeclarationStatement.createFromAST(ast, context),
    "expression_statement": (ast: ExpressionStatementASTNode, context: BlockContext) => ExpressionStatement.createFromAST(ast, context),
    "null_statement": (ast: NullStatementASTNode, context: BlockContext) => new NullStatement(context, ast)
};

export function createStatementFromAST<ASTType extends StatementASTNode>(ast: ASTType, context: BlockContext): ReturnType<(typeof StatementConstructsMap)[ASTType["construct_type"]]> {
    return <any>StatementConstructsMap[ast.construct_type](<any>ast, context);
}

export type CompiledStatementKinds = {
    "unsupported_statement": UnsupportedStatement;
    // "labeled_statement" :
    "block": CompiledBlock;
    "if_statement": CompiledIfStatement;
    "while_statement": CompiledWhileStatement;
    // "dowhile_statement" :
    "for_statement": CompiledForStatement;
    // "break_statement" :
    // "continue_statement" :
    "return_statement": CompiledReturnStatement;
    "declaration_statement": CompiledDeclarationStatement;
    "expression_statement": CompiledExpressionStatement;
    "null_statement": CompiledNullStatement;
};

export type AnalyticCompiledStatement<C extends AnalyticStatement> = CompiledStatementKinds[C["construct_type"]];



const StatementConstructsRuntimeMap = {
    "unsupported_statement": (construct: UnsupportedStatement, parent: RuntimeStatement) => { throw new Error("Cannot create a runtime instance of an unsupported construct."); },
    // "labeled_statement" : (construct: LabeledStatement, parent: RuntimeStatement) => new UnsupportedStatement(context, "labeled statement").setAST(ast),
    "block": (construct: CompiledBlock, parent: RuntimeStatement | RuntimeFunction) => new RuntimeBlock(construct, parent),
    "if_statement": (construct: CompiledIfStatement, parent: RuntimeStatement) => new RuntimeIfStatement(construct, parent),
    "while_statement": (construct: CompiledWhileStatement, parent: RuntimeStatement) => new RuntimeWhileStatement(construct, parent),
    // "dowhile_statement" : (construct: DoWhileStatement, parent: RuntimeStatement) => new UnsupportedStatement(context, "do-while loop").setAST(ast),
    "for_statement": (construct: CompiledForStatement, parent: RuntimeStatement) => new RuntimeForStatement(construct, parent),
    // "break_statement" : (construct: BreakStatement, parent: RuntimeStatement) => new UnsupportedStatement(context, "break statement").setAST(ast),
    // "continue_statement" : (construct: ContinueStatement, parent: RuntimeStatement) => new UnsupportedStatement(context, "continue statement").setAST(ast),
    "return_statement": (construct: CompiledReturnStatement, parent: RuntimeStatement) => new RuntimeReturnStatement(construct, parent),
    "declaration_statement": (construct: CompiledDeclarationStatement, parent: RuntimeStatement) => new RuntimeDeclarationStatement(construct, parent),
    "expression_statement": (construct: CompiledExpressionStatement, parent: RuntimeStatement) => new RuntimeExpressionStatement(construct, parent),
    "null_statement": (construct: CompiledNullStatement, parent: RuntimeStatement) => new RuntimeNullStatement(construct, parent)
};

export function createRuntimeStatement<ConstructType extends CompiledBlock>(construct: ConstructType, parent: RuntimeStatement | RuntimeFunction): ReturnType<(typeof StatementConstructsRuntimeMap)[ConstructType["construct_type"]]>;
export function createRuntimeStatement<ConstructType extends AnalyticStatement, CompiledConstructType extends AnalyticCompiledStatement<ConstructType>>(construct: CompiledConstructType, parent: RuntimeConstruct): ReturnType<(typeof StatementConstructsRuntimeMap)[CompiledConstructType["construct_type"]]>;
export function createRuntimeStatement(construct: CompiledStatement, parent: RuntimeConstruct): RuntimeStatement;
export function createRuntimeStatement<ConstructType extends AnalyticCompiledStatement<AnalyticStatement>>(construct: ConstructType, parent: RuntimeStatement) {
    return <any>StatementConstructsRuntimeMap[construct.construct_type](<any>construct, parent);
}

export abstract class Statement<ASTType extends StatementASTNode = StatementASTNode> extends BasicCPPConstruct<BlockContext, ASTType> {

    public abstract createDefaultOutlet(this: CompiledStatement, element: JQuery, parent?: ConstructOutlet): StatementOutlet;

    public isBlock(): this is Block {
        return false;
    }

}

export interface CompiledStatement extends Statement, SuccessfullyCompiled {

}

export type AnalyticStatement =
    //LabeledStatement |
    Block |
    IfStatement |
    WhileStatement |
    // DoWhileStatement |
    ForStatement |
    // BreakStatement |
    // ContinueStatement |
    ReturnStatement |
    DeclarationStatement |
    ExpressionStatement |
    NullStatement |
    UnsupportedStatement;

export abstract class RuntimeStatement<C extends CompiledStatement = CompiledStatement> extends RuntimeConstruct<C> {

    public readonly containingRuntimeFunction: RuntimeFunction;

    public constructor(model: C, parent: RuntimeStatement | RuntimeFunction) {
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
    public readonly construct_type = "unsupported_statement";

    public constructor(context: BlockContext, ast: StatementASTNode, unsupportedName: string) {
        super(context, ast);
        this.addNote(CPPError.lobster.unsupported_feature(this, unsupportedName));
    }

    public createDefaultOutlet(element: JQuery, parent?: ConstructOutlet): never {
        throw new Error("Cannot create an outlet for an unsupported construct.");
    }
}


export interface ExpressionStatementASTNode extends ASTNode {
    readonly construct_type: "expression_statement";
    readonly expression: ExpressionASTNode;
}

export class ExpressionStatement extends Statement<ExpressionStatementASTNode> {
    public readonly construct_type = "expression_statement";


    public readonly expression: Expression;

    public static createFromAST(ast: ExpressionStatementASTNode, context: BlockContext) {
        return new ExpressionStatement(context, ast, createExpressionFromAST(ast.expression, context));
    }

    public constructor(context: BlockContext, ast: ExpressionStatementASTNode, expression: Expression) {
        super(context, ast);
        this.attach(this.expression = expression);
    }

    public createDefaultOutlet(this: CompiledExpressionStatement, element: JQuery, parent?: ConstructOutlet) {
        return new ExpressionStatementOutlet(element, this, parent);
    }

    public isTailChild(child: CPPConstruct) {
        return { isTail: true };
    }
}

export interface CompiledExpressionStatement extends ExpressionStatement, SuccessfullyCompiled {
    readonly expression: CompiledExpression;
}

export class RuntimeExpressionStatement extends RuntimeStatement<CompiledExpressionStatement> {

    public expression: RuntimeExpression;
    private index = "expr";

    public constructor(model: CompiledExpressionStatement, parent: RuntimeStatement) {
        super(model, parent);
        this.expression = createRuntimeExpression(this.model.expression, this);
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
    public readonly construct_type = "null_statement";



    public createDefaultOutlet(this: CompiledNullStatement, element: JQuery, parent?: ConstructOutlet) {
        return new NullStatementOutlet(element, this, parent);
    }

    public isTailChild(child: CPPConstruct) {
        return { isTail: true }; // Note: NullStatement will never actually have children, so this isn't used
    }
}

export interface CompiledNullStatement extends NullStatement, SuccessfullyCompiled {

}

export class RuntimeNullStatement extends RuntimeStatement<CompiledNullStatement> {

    public constructor(model: CompiledNullStatement, parent: RuntimeStatement) {
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
    public readonly construct_type = "declaration_statement";

    public readonly declarations: readonly AnalyticSimpleDeclaration[] | FunctionDefinition | ClassDefinition | InvalidConstruct;

    public static createFromAST(ast: DeclarationStatementASTNode, context: BlockContext) {
        return new DeclarationStatement(context, ast, createDeclarationFromAST(ast.declaration, context));
    }

    public constructor(context: BlockContext, ast: DeclarationStatementASTNode, declarations: readonly AnalyticSimpleDeclaration[] | FunctionDefinition | ClassDefinition | InvalidConstruct) {
        super(context, ast);

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



    public createDefaultOutlet(this: CompiledDeclarationStatement, element: JQuery, parent?: ConstructOutlet) {
        return new DeclarationStatementOutlet(element, this, parent);
    }

    public isTailChild(child: CPPConstruct) {
        return { isTail: true };
    }
}

export interface CompiledDeclarationStatement extends DeclarationStatement, SuccessfullyCompiled {

    // narrows to compiled version and rules out a FunctionDefinition, ClassDefinition, or InvalidConstruct
    readonly declarations: readonly AnalyticCompiledDeclaration<AnalyticSimpleDeclaration>[];
}

export class RuntimeDeclarationStatement extends RuntimeStatement<CompiledDeclarationStatement> {

    public readonly currentDeclarationIndex: number | null = null;

    public constructor(model: CompiledDeclarationStatement, parent: RuntimeStatement) {
        super(model, parent);
    }

    protected upNextImpl() {
        let nextIndex = this.currentDeclarationIndex === null ? 0 : this.currentDeclarationIndex + 1;

        let initializers = this.model.declarations.map(d => d.initializer);
        if (nextIndex < initializers.length) {
            (<Mutable<this>>this).currentDeclarationIndex = nextIndex;
            let init = initializers[nextIndex];
            if (init) {
                // Only declarations with an initializer (e.g. a variable definition) have something
                // to do at runtime. Others (e.g. typedefs) do nothing.
                this.observable.send("initializing", nextIndex);
                let runtimeInit = init.createRuntimeInitializer(this);
                this.sim.push(runtimeInit);
            }
        }
        else {
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
    public readonly construct_type = "return_statement";

    public readonly expression?: Expression;

    // TODO: Technically, this should be CopyInitializer
    public readonly returnInitializer?: DirectInitializer;

    public static createFromAST(ast: ReturnStatementASTNode, context: BlockContext) {
        return ast.expression
            ? new ReturnStatement(context, ast, createExpressionFromAST(ast.expression, context))
            : new ReturnStatement(context, ast);
    }

    public constructor(context: BlockContext, ast: ReturnStatementASTNode, expression?: Expression) {
        super(context, ast);

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

    public constructor(model: CompiledReturnStatement, parent: RuntimeStatement) {
        super(model, parent);
        if (model.returnInitializer) {
            this.returnInitializer = model.returnInitializer.createRuntimeInitializer(this);
        }
    }

    protected upNextImpl() {
        if (this.index === RuntimeReturnStatementIndices.PUSH_INITIALIZER) {
            if (this.returnInitializer) {
                this.sim.push(this.returnInitializer);
            }
            this.index = RuntimeReturnStatementIndices.RETURN;
        }
    }

    public stepForwardImpl() {
        if (this.index === RuntimeReturnStatementIndices.RETURN) {
            let func = this.containingRuntimeFunction;
            this.observable.send("returned", { call: func.caller })
            this.sim.popUntil(func);
        }
    }
}

export interface BlockASTNode extends ASTNode {
    readonly construct_type: "block";
    readonly statements: readonly StatementASTNode[];
}

function createBlockContext(context: FunctionContext): BlockContext {
    return Object.assign({}, context, {
        contextualScope: new BlockScope(context.translationUnit, context.contextualScope)
    });
}

export class Block extends Statement<BlockASTNode> {
    public readonly construct_type = "block";

    public readonly statements: readonly Statement[] = [];

    public static createFromAST(ast: BlockASTNode, context: FunctionContext) {
        let block = new Block(context, ast);
        ast.statements.forEach((stmtAst) => block.addStatement(createStatementFromAST(stmtAst, block.context)));
        return block;
    }

    public constructor(context: FunctionContext, ast: BlockASTNode) {
        super(createBlockContext(context), ast);
    }

    public isBlock(): this is Block {
        return true;
    }

    public addStatement(statement: Statement) {
        asMutable(this.statements).push(statement);
        this.attach(statement);
    }



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

    public constructor(model: CompiledBlock, parent: RuntimeStatement | RuntimeFunction) {
        super(model, parent);
        this.statements = model.statements.map((stmt) => createRuntimeStatement(stmt, this));
    }

    protected upNextImpl() {
        if (this.index < this.statements.length) {
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



// export class OpaqueBlock extends StatementBase implements SuccessfullyCompiled {

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
    public readonly construct_type = "if_statement";

    public readonly condition: Expression;
    public readonly then: Statement;
    public readonly otherwise?: Statement;

    public static createFromAST(ast: IfStatementASTNode, context: BlockContext): IfStatement {

        let condition = createExpressionFromAST(ast.condition, context);

        // If either of the substatements are not a block, they get their own implicit block context.
        // (If the substatement is a block, it creates its own block context, so we don't do that here.)
        let then = ast.then.construct_type === "block" ?
            createStatementFromAST(ast.then, context) :
            createStatementFromAST(ast.then, createBlockContext(context));

        if (!ast.otherwise) { // no else branch
            return new IfStatement(context, ast, condition, then);
        }
        else { // else branch is present
            // See note above about substatement implicit block context
            let otherwise = ast.otherwise.construct_type === "block" ?
                createStatementFromAST(ast.otherwise, context) :
                createStatementFromAST(ast.otherwise, createBlockContext(context));

            return new IfStatement(context, ast, condition, then, otherwise);
        }
    }

    public constructor(context: BlockContext, ast: IfStatementASTNode, condition: Expression, then: Statement, otherwise?: Statement) {
        super(context, ast);

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

    public constructor(model: CompiledIfStatement, parent: RuntimeStatement) {
        super(model, parent);
        this.condition = createRuntimeExpression(model.condition, this);
        this.then = createRuntimeStatement(model.then, this);
        if (model.otherwise) {
            this.otherwise = createRuntimeStatement(model.otherwise, this);
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
    public readonly construct_type = "while_statement";

    public readonly condition: Expression;
    public readonly body: Statement;

    public static createFromAST(ast: WhileStatementASTNode, context: BlockContext): WhileStatement {

        // If the body substatement is not a block, it gets its own implicit block context.
        // (If the substatement is a block, it creates its own block context, so we don't do that here.)
        let body = ast.body.construct_type === "block" ?
            createStatementFromAST(ast.body, context) :
            createStatementFromAST(ast.body, createBlockContext(context));

        return new WhileStatement(context, ast, createExpressionFromAST(ast.condition, context), body);
    }

    public constructor(context: BlockContext, ast: WhileStatementASTNode, condition: Expression, body: Statement) {
        super(context, ast);

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

    public constructor(model: CompiledWhileStatement, parent: RuntimeStatement) {
        super(model, parent);
        this.condition = createRuntimeExpression(model.condition, this);
        // Do not create body here, since it might not actually run
    }

    private static upNextFns = [
        (rt: RuntimeWhileStatement) => {
            rt.sim.push(rt.condition);
        },
        (rt: RuntimeWhileStatement) => {
            if (rt.condition.evalResult.rawValue === 1) {
                rt.sim.push(asMutable(rt).body = createRuntimeStatement(rt.model.body, rt));
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
        (<Mutable<this>>this).condition = createRuntimeExpression(this.model.condition, this);
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


// The ForStatement class contains additional comments intended
// as a general tutorial included in the `core` README.md

// Generally, constructs provide a template parameter
// to indicate the type of AST node they are created from
export class ForStatement extends Statement<ForStatementASTNode> {

    // The discriminant here matches the one from ForStatementASTNode
    public readonly construct_type = "for_statement";
  
    // All child constructs, this will often (but not always)
    // be parallel to the structure in the AST Node
    public readonly initial: ExpressionStatement | NullStatement | DeclarationStatement;
    public readonly condition: Expression;
    public readonly body: Statement;
    public readonly post: Expression;
  
    // Constructors for language construct classes take
    // in a `context`, which provides contextual information
    // necessary for compilation (e.g. a scope where variables
    // can be looked up, the function that contains this code, etc.).
    // In addition, the child constructs are provided that
    // compose the construct. These children are presumed to
    // have already been constructed with the appropriate context
    // of their own. This is usually done by a createFromAST()
    // function (see below).
    public constructor(context: BlockContext, ast: ForStatementASTNode, initial: ExpressionStatement | NullStatement | DeclarationStatement,
      condition: Expression, body: Statement, post: Expression) {
  
      super(context, ast);
  
      // Use .attach() to build the links in the construct tree
      this.attach(this.initial = initial);
  
      if (condition.isWellTyped()) {
        // If the condition has a type, we can attempt to convert
        // it to a boolean. If such a conversion can be made,
        // we should attach the conversion, which has the original
        // condition as a child. (If it can't be made,
        // standardConversion() just returns the original).
        this.attach(this.condition = standardConversion(condition, Bool.BOOL));
      }
      else {
        // If the condition wasn't well typed, we can't even try
        // the conversion, so we just attach the original condition.
        this.attach(this.condition = condition);
      }
  
      // If our condition is not a bool (and couldn't be converted)
      // to one earlier, give an error. However, if the condition
      // didn't have any type, we don't want error spam, so we won't
      // say anything. (Any non-well-typed exppression will already
      // have an error of its own.) 
      if (this.condition.isWellTyped() && !this.condition.isTyped(Bool)) {
        this.addNote(CPPError.stmt.iteration.condition_bool(this, this.condition));
      }
  
      // Nothing in particular to check here, since as with
      // the initial, we don't care about types or anything.
      // Because of syntax rules baked into the nature of this
      // constructor, we're already guaranteed the body is a
      // statement and the post is an expression as they should be.
      this.attach(this.body = body);
      this.attach(this.post = post);
    }
  
    // The constructor above poses a conundrum. It asks that
    // we pass in fully instantiated, ready-to-go child constructs
    // of which the `ForStatement` will be composed. However,
    // those children cannot be made in a context-insensitive
    // fashion. That's not how C++ works! The resolution is that
    // all context-sensitive stuff is extracted into the `context`
    // provided when constructing the constructs. Generally, this
    // will all be handled in a createFromAST function. It takes
    // in the pure syntax from the AST and does all the hard work
    // of building, situating, and connecting together all the
    // constructs correctly.
    public static createFromAST(ast: ForStatementASTNode, context: BlockContext): ForStatement {
  
      // The context parameter to this function tells us what
      // context the for loop originally occurs in. For example, in:
      // void func() {
      //   for(int i = 0; i < 10; ++i) {
      //     cout << i << endl;
      //   }
      // }
      // `context` refers to the function body block context for `func`
      // Below, we'll also consider the body block context of the inner
      // set of curly braces for the for loop.
  
      // Let's create the body first. But there's one quick exception:
      // Basically, for(...) stmt; is treated equivalently
      // to for(...) { stmt; } according to the C++ standard.
  
      // If the body substatement is not a block, it gets its own implicit block context.
      // (If the substatement is a block, it will create its own block context, so we don't do that here.)
      let body = ast.body.construct_type === "block" ?
        createStatementFromAST(ast.body, context) :
        createStatementFromAST(ast.body, createBlockContext(context));
  
      // NOTE the use of body block context for all the children.
      // e.g. for(int i = 0; i < 10; ++i) { cout << i; }
      // All children (initial, condition, post, body) share the same block
      // context and scope where i is declared.
      return new ForStatement(context, ast,
        createStatementFromAST(ast.initial, body.context),
        createExpressionFromAST(ast.condition, body.context),
        body,
        createExpressionFromAST(ast.post, body.context));
  
      // It's crucial that we handled things this way. Because
      // all of the context-sensitive stuff is handled by the
      // contexts here, the children can all have access to e.g.
      // the correct scope for all their variable lookups.
    }
  
    // Creates an outlet, which will be part of the visualization,
    // for any code that is running with this `ForStatement` as its
    // original model. The specific runtime instance is not attached
    // until later. That's because we might need to display a "shell"
    // of this construct if e.g. the function it resides in gets called
    // and is displayed, but this construct hasn't started executing
    // yet (and may never, depending on control flow through that
    // function!).
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

    public constructor(model: CompiledForStatement, parent: RuntimeStatement) {
        super(model, parent);
        this.initial = createRuntimeStatement(model.initial, this);
        this.condition = createRuntimeExpression(model.condition, this);
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
                rt.sim.push(asMutable(rt).body = createRuntimeStatement(rt.model.body, rt));
            }
            else {
                rt.startCleanup();
            }
        },
        (rt: RuntimeForStatement) => {
            rt.sim.push(asMutable(rt).post = createRuntimeExpression(rt.model.post, rt));
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
        (<Mutable<this>>this).condition = createRuntimeExpression(this.model.condition, this);
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

