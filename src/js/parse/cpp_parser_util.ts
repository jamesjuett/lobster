import { FunctionDefinitionASTNode } from "../ast/ast_declarations";
import { DeclaratorASTNode } from "../ast/ast_declarators";
import { parse as cpp_parse } from "../parse/cpp_parser";

export function parseDeclarator(text: string) {
    return <DeclaratorASTNode>cpp_parse(text, {startRule: "declarator"});
}

export function parseFunctionDefinition(text: string) {
    return <FunctionDefinitionASTNode>cpp_parse(text, {startRule: "function_definition"});
}