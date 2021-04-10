import { ASTNode } from "./ASTNode";
import { DeclaratorInitASTNode, DeclaratorASTNode } from "./ast_declarators";
import { ExpressionASTNode } from "./ast_expressions";
import { UnqualifiedIdentifierASTNode, IdentifierASTNode } from "./ast_identifiers";
import { InitializerASTNode } from "./ast_initializers";
import { BlockASTNode } from "./ast_statements";
export declare type StorageSpecifierKey = "register" | "static" | "thread_local" | "extern" | "mutable";
export declare type StorageSpecifierASTNode = readonly StorageSpecifierKey[];
export interface DeclarationSpecifiersASTNode {
    readonly typeSpecs: TypeSpecifierASTNode;
    readonly storageSpecs: StorageSpecifierASTNode;
    readonly elaboratedTypeSpecifiers: readonly ElaboratedTypeSpecifierASTNode[];
    readonly classSpecifiers: readonly ClassDefinitionASTNode[];
    readonly friend?: boolean;
    readonly typedef?: boolean;
    readonly inline?: boolean;
    readonly explicit?: boolean;
    readonly virtual?: boolean;
}
export declare type DeclarationASTNode = TopLevelDeclarationASTNode | MemberDeclarationASTNode;
export declare type TopLevelDeclarationASTNode = NonMemberSimpleDeclarationASTNode | FunctionDefinitionASTNode | ClassDefinitionASTNode;
export declare type LocalDeclarationASTNode = NonMemberSimpleDeclarationASTNode | FunctionDefinitionASTNode | ClassDefinitionASTNode;
export declare type SimpleDeclarationASTNode = NonMemberSimpleDeclarationASTNode | MemberSimpleDeclarationASTNode;
export interface NonMemberSimpleDeclarationASTNode extends ASTNode {
    readonly construct_type: "simple_declaration";
    readonly specs: DeclarationSpecifiersASTNode;
    readonly declarators: readonly DeclaratorInitASTNode[];
}
export interface ParameterDeclarationASTNode extends ASTNode {
    readonly declarator: DeclaratorASTNode;
    readonly specs: DeclarationSpecifiersASTNode;
    readonly initializer?: InitializerASTNode;
}
export declare type FunctionBodyASTNode = BlockASTNode;
export interface FunctionDefinitionASTNode extends ASTNode {
    readonly construct_type: "function_definition";
    readonly specs: DeclarationSpecifiersASTNode;
    readonly declarator: DeclaratorASTNode;
    readonly ctor_initializer?: CtorInitializerASTNode;
    readonly body: FunctionBodyASTNode;
}
export declare type ClassKey = "struct" | "class";
export interface ElaboratedTypeSpecifierASTNode extends ASTNode {
    readonly construct_type: "elaborated_type_specifier";
    readonly classKey: ClassKey;
    readonly name: UnqualifiedIdentifierASTNode;
}
export interface ClassHeadASTNode extends ASTNode {
    readonly construct_type: "class_head";
    readonly classKey: ClassKey;
    readonly name: UnqualifiedIdentifierASTNode;
    readonly bases: readonly BaseSpecifierASTNode[];
}
export interface BaseSpecifierASTNode extends ASTNode {
    readonly name: IdentifierASTNode;
    readonly virtual?: true;
    readonly access?: AccessSpecifier;
}
export interface ClassDefinitionASTNode extends ASTNode {
    readonly construct_type: "class_definition";
    readonly head: ClassHeadASTNode;
    readonly memberSpecs: readonly MemberSpecificationASTNode[];
}
export declare type AccessSpecifier = "private" | "protected" | "public";
export interface MemberSpecificationASTNode extends ASTNode {
    readonly construct_type: "member_specification";
    readonly access?: AccessSpecifier;
    readonly members: readonly MemberDeclarationASTNode[];
}
export declare type MemberDeclarationASTNode = MemberSimpleDeclarationASTNode | FunctionDefinitionASTNode;
export interface MemberSimpleDeclarationASTNode extends ASTNode {
    readonly construct_type: "simple_member_declaration";
    readonly specs: DeclarationSpecifiersASTNode;
    readonly declarators: readonly DeclaratorInitASTNode[];
}
export interface CtorInitializerASTNode extends ASTNode {
    readonly construct_type: "ctor_initializer";
    readonly initializers: readonly MemberInitializerASTNode[];
}
export interface MemberInitializerASTNode extends ASTNode {
    readonly construct_type: "member_initializer";
    readonly member: UnqualifiedIdentifierASTNode;
    readonly args: readonly ExpressionASTNode[];
}
export declare type SimpleTypeName = string | "char" | "short" | "int" | "bool" | "long" | "signed" | "unsigned" | "float" | "double" | "void";
export declare type TypeSpecifierKey = "const" | "volatile" | "signed" | "unsigned" | "enum";
export declare type TypeSpecifierASTNode = readonly (TypeSpecifierKey | SimpleTypeName | ElaboratedTypeSpecifierASTNode | ClassDefinitionASTNode)[];
