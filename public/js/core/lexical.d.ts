import { NoteHandler } from "./errors";
import { ASTNode, TranslationUnitConstruct } from "./constructs";
export declare const KEYWORDS: Set<string>;
export declare enum MAGIC_FUNCTION_NAMES {
    assert = "assert",
    pause = "pause",
    pauseIf = "pauseIf"
}
export declare const LOBSTER_MAGIC_FUNCTIONS: Set<string>;
export declare const LOBSTER_KEYWORDS: Set<string>;
export declare const ALT_OPS: Set<string>;
export declare function checkIdentifier(src: TranslationUnitConstruct, name: string, noteHandler: NoteHandler): void;
export declare function createFullyQualifiedName(...names: string[]): string;
export declare function fullyQualifiedNameToUnqualified(fqname: string): string;
export interface SourceCode {
    text: string;
    line: number;
    column: number;
    start: number;
    end: number;
}
export interface IdentifierASTNode extends ASTNode {
    readonly identifier: string;
}
