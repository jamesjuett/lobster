import { NoteHandler } from "./errors";
import { TranslationUnitConstruct } from "./constructs";
import { IdentifierASTNode } from "../ast/ast_identifiers";
export declare const KEYWORDS: Set<string>;
export declare enum MAGIC_FUNCTION_NAMES {
    assert = "assert",
    pause = "pause",
    pauseIf = "pauseIf"
}
export declare const LOBSTER_MAGIC_FUNCTIONS: Set<string>;
export declare const LOBSTER_KEYWORDS: Set<string>;
export declare const ALT_OPS: Set<string>;
export declare function checkIdentifier(src: TranslationUnitConstruct, name: LexicalIdentifier, noteHandler: NoteHandler): void;
export declare function getUnqualifiedName(name: LexicalIdentifier): UnqualifiedName;
export declare function getQualifiedName(name: LexicalIdentifier): QualifiedName;
export declare function composeQualifiedName(prefix: LexicalIdentifier, name: LexicalIdentifier): {
    components: string[];
    str: string;
};
export declare type UnqualifiedName = string;
export declare type QualifiedName = {
    readonly components: readonly string[];
    readonly str: string;
};
export declare type LexicalIdentifier = string | QualifiedName;
export declare function isUnqualifiedName(name: LexicalIdentifier): name is UnqualifiedName;
export declare function isQualifiedName(name: LexicalIdentifier): name is QualifiedName;
export declare function astToIdentifier(ast: IdentifierASTNode): LexicalIdentifier;
export declare function identifierToString(id: LexicalIdentifier): string;
export declare function isUnqualifiedIdentifier(id: LexicalIdentifier): id is string;
export declare function isQualifiedIdentifier(id: LexicalIdentifier): id is QualifiedName;
export declare function qualifiedNamesEq(qid1: QualifiedName, qid2: QualifiedName): boolean;
