import { ASTNode } from "./ASTNode";
import { ExpressionASTNode, InitializerListExpressionASTNode } from "./ast_expressions";
export declare type InitializerASTNode = DirectInitializerASTNode | CopyInitializerASTNode | ListInitializerASTNode;
export declare type NewInitializerASTNode = ValueInitializerASTNode | DirectInitializerASTNode | ListInitializerASTNode;
export interface ValueInitializerASTNode extends ASTNode {
    construct_type: "value_initializer";
}
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
