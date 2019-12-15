import {NoteHandler, CPPError} from "./errors";
import { CPPConstruct, ASTNode, TranslationUnitConstruct } from "./constructs";

export const KEYWORDS = new Set([
    "alignas", "continue", "friend", "register", "true",
    "alignof", "decltype", "goto", "reinterpret_cast", "try",
    "asm", "default", "if", "return", "typedef",
    "auto", "delete", "inline", "short", "typeid",
    "bool", "do", "int", "signed", "typename",
    "break", "double", "long", "sizeof", "union",
    "case", "dynamic_cast", "mutable", "static", "unsigned",
    "catch", "else", "namespace", "static_assert", "using",
    "char", "enum", "new", "static_cast", "virtual",
    "char16_t", "explicit", "noexcept", "struct", "void",
    "char32_t", "export", "nullptr", "switch", "volatile",
    "class", "extern", "operator", "template", "wchar_t",
    "const", "false", "private", "this", "while",
    "constexpr", "float", "protected", "thread_local",
    "const_cast", "for", "public", "throw"
]);



export enum MAGIC_FUNCTION_NAMES {
    assert = "assert",
    pause = "pause",
    pauseIf = "pauseIf"
}

export const LOBSTER_KEYWORDS = new Set(Object.keys(MAGIC_FUNCTION_NAMES));

export const ALT_OPS = new Set([
    "and", "and_eq", "bitand", "bitor", "compl", "not",
    "not_eq", "or", "or_eq", "xor", "xor_eq"
]);


// export type UnqualifiedName = string;
// export type QualifiedName = string[];
// export type Name = UnqualifiedName | QualifiedName;

//TODO: not sure if this is the right place for this. May be bettor suited for error.ts
export function checkIdentifier(src: TranslationUnitConstruct, name: string, noteHandler: NoteHandler) {
    
    // Special case for qualified names
    if (name.includes("::")) {
        name.split("::").forEach((elem) => checkIdentifier(src, elem, noteHandler));
        return;
    }

    // Check that identifier is not a C++ keyword, Lobster keyword, or an alternative representation for an operator
    if (KEYWORDS.has(name)) {
        noteHandler.addNote(CPPError.iden.keyword(src, name));
    }
    if (LOBSTER_KEYWORDS.has(name)) {
        noteHandler.addNote(CPPError.lobster.keyword(src, name));
    }
    if (ALT_OPS.has(name)) {
        noteHandler.addNote(CPPError.iden.alt_op(src, name));
    }
};

export function createFullyQualifiedName(...names : string[]) {
    return "::" + names.join("::");
}

export function fullyQualifiedNameToUnqualified(fqname: string) {
    let i = fqname.lastIndexOf("::");
    if (i === -1) {
        return fqname;
    }
    else{
        return fqname.slice(i+2);
    }
}

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