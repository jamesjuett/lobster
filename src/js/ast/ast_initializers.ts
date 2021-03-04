import { ASTNode } from "./ASTNode";
import { ExpressionASTNode, InitializerListExpressionASTNode } from "./ast_expressions";


export type InitializerASTNode = DirectInitializerASTNode | CopyInitializerASTNode | ListInitializerASTNode;

export type NewInitializerASTNode = DirectInitializerASTNode | ListInitializerASTNode;


export interface DirectInitializerASTNode extends ASTNode {
    construct_type: "direct_initializer";
    args: ExpressionASTNode[];
}

export interface CopyInitializerASTNode extends ASTNode {
    readonly construct_type: "copy_initializer";
    readonly args: ExpressionASTNode[];
}

export interface ListInitializerASTNode extends ASTNode {
    readonly construct_type: "list_initializer";
    readonly arg: InitializerListExpressionASTNode;
}