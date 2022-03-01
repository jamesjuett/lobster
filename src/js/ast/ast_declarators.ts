import { ASTNode } from "./ASTNode";
import { ParameterDeclarationASTNode } from "./ast_declarations";
import { ExpressionASTNode } from "./ast_expressions";
import { IdentifierASTNode } from "./ast_identifiers";
import { InitializerASTNode } from "./ast_initializers";

export interface ArrayPostfixDeclaratorASTNode {
    readonly kind: "array";
    readonly size?: ExpressionASTNode;
}

export interface FunctionPostfixDeclaratorASTNode {
    readonly kind: "function";
    readonly size: ExpressionASTNode;
    readonly args: readonly ParameterDeclarationASTNode[];
    readonly const?: boolean;
}

export interface DeclaratorASTNode extends ASTNode {
    readonly pureVirtual?: boolean;
    readonly override?: boolean;
    readonly sub?: DeclaratorASTNode; // parentheses
    readonly pointer?: DeclaratorASTNode;
    readonly reference?: DeclaratorASTNode;
    readonly const?: boolean;
    readonly volatile?: boolean;
    readonly name?: IdentifierASTNode;
    readonly postfixes?: readonly (
        | ArrayPostfixDeclaratorASTNode
        | FunctionPostfixDeclaratorASTNode
    )[];
}

export interface DeclaratorInitASTNode extends DeclaratorASTNode {
    readonly initializer?: InitializerASTNode;
}
