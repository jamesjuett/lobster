import { AnythingConstructASTNode, ASTNode } from "./ASTNode";
import { LocalDeclarationASTNode } from "./ast_declarations";
import { ExpressionASTNode } from "./ast_expressions";
export declare type StatementASTNode = LabeledStatementASTNode | BlockASTNode | IfStatementASTNode | IterationStatementASTNode | JumpStatementASTNode | DeclarationStatementASTNode | ExpressionStatementASTNode | NullStatementASTNode | AnythingConstructASTNode;
export interface ExpressionStatementASTNode extends ASTNode {
    readonly construct_type: "expression_statement";
    readonly expression: ExpressionASTNode;
}
export interface NullStatementASTNode extends ASTNode {
    readonly construct_type: "null_statement";
}
export interface DeclarationStatementASTNode extends ASTNode {
    readonly construct_type: "declaration_statement";
    readonly declaration: LocalDeclarationASTNode;
}
export declare type JumpStatementASTNode = BreakStatementASTNode | ContinueStatementASTNode | ReturnStatementASTNode;
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
export interface BlockASTNode extends ASTNode {
    readonly construct_type: "block";
    readonly statements: readonly StatementASTNode[];
}
export interface IfStatementASTNode extends ASTNode {
    readonly construct_type: "if_statement";
    readonly condition: ExpressionASTNode;
    readonly then: StatementASTNode;
    readonly otherwise?: StatementASTNode;
}
export declare type IterationStatementASTNode = WhileStatementASTNode | DoWhileStatementASTNode | ForStatementASTNode;
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
    readonly post?: ExpressionASTNode;
    readonly body: StatementASTNode;
}
export interface LabeledStatementASTNode extends ASTNode {
    readonly construct_type: "labeled_statement";
}
export interface SwitchStatementASTNode extends ASTNode {
    readonly construct_type: "switch_statement";
}
