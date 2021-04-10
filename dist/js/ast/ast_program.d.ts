import { TopLevelDeclarationASTNode } from "./ast_declarations";
export interface TranslationUnitAST {
    readonly construct_type: "translation_unit";
    readonly declarations: readonly TopLevelDeclarationASTNode[];
}
