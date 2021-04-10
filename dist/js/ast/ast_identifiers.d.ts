import { ASTNode } from "./ASTNode";
export interface UnqualifiedIdentifierASTNode extends ASTNode {
    construct_type: "unqualified_identifier";
    readonly identifier: string;
}
export interface QualifiedIdentifierComponentASTNode extends ASTNode {
    readonly identifier: string;
}
export interface QualifiedIdentifierASTNode extends ASTNode {
    construct_type: "qualified_identifier";
    components: readonly QualifiedIdentifierComponentASTNode[];
}
export declare type IdentifierASTNode = UnqualifiedIdentifierASTNode | QualifiedIdentifierASTNode;
