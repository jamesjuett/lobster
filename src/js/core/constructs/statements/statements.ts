import { AnythingConstructASTNode } from "../../../ast/ASTNode";
import { BlockASTNode, BreakStatementASTNode, ContinueStatementASTNode, DeclarationStatementASTNode, DoWhileStatementASTNode, ExpressionStatementASTNode, ForStatementASTNode, IfStatementASTNode, LabeledStatementASTNode, NullStatementASTNode, ReturnStatementASTNode, StatementASTNode, WhileStatementASTNode } from "../../../ast/ast_statements";
import { BlockContext } from "../../compilation/contexts";
import { RuntimeFunction } from "../../compilation/functions";
import { RuntimeConstruct } from "../constructs";
import { AnythingStatement } from "./AnythingStatement";
import { Block, CompiledBlock, RuntimeBlock } from "./Block";
import { BreakStatement, CompiledBreakStatement, RuntimeBreakStatement } from "./BreakStatement";
import { DeclarationStatement, CompiledDeclarationStatement, RuntimeDeclarationStatement } from "./DeclarationStatement";
import { ExpressionStatement, CompiledExpressionStatement, RuntimeExpressionStatement } from "./ExpressionStatement";
import { ForStatement, CompiledForStatement, RuntimeForStatement } from "./ForStatement";
import { IfStatement, CompiledIfStatement, RuntimeIfStatement } from "./IfStatement";
import { NullStatement, CompiledNullStatement, RuntimeNullStatement } from "./NullStatement";
import { ReturnStatement, CompiledReturnStatement, RuntimeReturnStatement } from "./ReturnStatement";
import { CompiledStatement, RuntimeStatement } from "./Statement";
import { UnsupportedStatement } from "./UnsupportedStatement";
import { WhileStatement, CompiledWhileStatement, RuntimeWhileStatement } from "./WhileStatement";


const StatementConstructsMap = {
    "labeled_statement": (ast: LabeledStatementASTNode, context: BlockContext) => new UnsupportedStatement(context, ast, "labeled statement"),
    "block": (ast: BlockASTNode, context: BlockContext) => Block.createFromAST(ast, context),
    "if_statement": (ast: IfStatementASTNode, context: BlockContext) => IfStatement.createFromAST(ast, context),
    "while_statement": (ast: WhileStatementASTNode, context: BlockContext) => WhileStatement.createFromAST(ast, context),
    "dowhile_statement": (ast: DoWhileStatementASTNode, context: BlockContext) => new UnsupportedStatement(context, ast, "do-while loop"),
    "for_statement": (ast: ForStatementASTNode, context: BlockContext) => ForStatement.createFromAST(ast, context),
    "break_statement": (ast: BreakStatementASTNode, context: BlockContext) => BreakStatement.createFromAST(ast, context),
    "continue_statement": (ast: ContinueStatementASTNode, context: BlockContext) => new UnsupportedStatement(context, ast, "continue statement"),
    "return_statement": (ast: ReturnStatementASTNode, context: BlockContext) => ReturnStatement.createFromAST(ast, context),
    "declaration_statement": (ast: DeclarationStatementASTNode, context: BlockContext) => DeclarationStatement.createFromAST(ast, context),
    "expression_statement": (ast: ExpressionStatementASTNode, context: BlockContext) => ExpressionStatement.createFromAST(ast, context),
    "null_statement": (ast: NullStatementASTNode, context: BlockContext) => new NullStatement(context, ast),
    "anything_construct": (ast: AnythingConstructASTNode, context: BlockContext) => new AnythingStatement(context, ast)
}

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
    "break_statement" : CompiledBreakStatement;
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
    "break_statement" : (construct: CompiledBreakStatement, parent: RuntimeStatement) => new RuntimeBreakStatement(construct, parent),
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

export type AnalyticStatement =
    //LabeledStatement |
    Block |
    IfStatement |
    WhileStatement |
    // DoWhileStatement |
    ForStatement |
    BreakStatement |
    // ContinueStatement |
    ReturnStatement |
    DeclarationStatement |
    ExpressionStatement |
    NullStatement |
    UnsupportedStatement;


