import { FunctionDefinitionASTNode } from "../ast/ast_declarations";
import { DeclaratorASTNode } from "../ast/ast_declarators";
export declare function parseDeclarator(text: string): DeclaratorASTNode;
export declare function parseFunctionDefinition(text: string): FunctionDefinitionASTNode;
