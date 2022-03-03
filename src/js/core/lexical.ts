import { NoteHandler, CPPError } from "./compilation/errors";
import { CPPConstruct, TranslationUnitConstruct } from "./constructs/constructs";
import { expr } from "jquery";
import { assert } from "../util/util";
import { IdentifierASTNode } from "../ast/ast_identifiers";

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
export const LOBSTER_MAGIC_FUNCTIONS = new Set(Object.keys(MAGIC_FUNCTION_NAMES));


export const LOBSTER_KEYWORDS = new Set(Object.keys(MAGIC_FUNCTION_NAMES));

export const ALT_OPS = new Set([
    "and", "and_eq", "bitand", "bitor", "compl", "not",
    "not_eq", "or", "or_eq", "xor", "xor_eq"
]);


// export type UnqualifiedName = string;
// export type QualifiedName = string[];
// export type Name = UnqualifiedName | QualifiedName;

//TODO: not sure if this is the right place for this. May be bettor suited for error.ts
export function checkIdentifier(src: TranslationUnitConstruct, name: LexicalIdentifier, noteHandler: NoteHandler) {

    // Special case for qualified names
    if (typeof name !== "string") {
        name.components.forEach((elem) => checkIdentifier(src, elem, noteHandler));
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

export function getUnqualifiedName(name: LexicalIdentifier) : UnqualifiedName {
    if (isUnqualifiedName(name)) {
        return name;
    }
    else {
        assert(name.components.length > 0, "Empty qualified name");
        return name.components[name.components.length - 1];
    }
}

export function getQualifiedName(name: LexicalIdentifier) : QualifiedName{
    if (isUnqualifiedName(name)) {
        return {
            components: [name],
            str: name
        };
    }
    else {
        return name;
    }
}

export function composeQualifiedName(prefix: LexicalIdentifier, name: LexicalIdentifier) {
    let n1 = getQualifiedName(prefix);
    let n2 = getQualifiedName(name); 
    return {
        components: n1.components.concat(n2.components),
        str: n1.str + "::" + n2.str
    };
}

export type UnqualifiedName = string;

export type QualifiedName = {
    readonly components: readonly string[];
    readonly str: string;
}

export type LexicalIdentifier = string | QualifiedName;

export function isUnqualifiedName(name: LexicalIdentifier) : name is UnqualifiedName {
    return typeof name === "string";
}

export function isQualifiedName(name: LexicalIdentifier) : name is QualifiedName {
    return typeof name !== "string";
}

export function astToIdentifier(ast: IdentifierASTNode) : LexicalIdentifier {
    if (ast.construct_type === "unqualified_identifier") {
        return ast.identifier;
    }
    else {
        let components = ast.components.map(c => c.identifier);
        return {
            components: components,
            str: components.join("::")
        };
    }
}

export function identifierToString(id: LexicalIdentifier) {
    if (typeof id === "string") {
        return id;
    }
    else {
        return id.str;
    }
}

export function isUnqualifiedIdentifier(id: LexicalIdentifier) : id is string {
    return typeof id === "string";
}

export function isQualifiedIdentifier(id: LexicalIdentifier) : id is QualifiedName {
    return typeof id !== "string";
}

export function qualifiedNamesEq(qid1: QualifiedName, qid2: QualifiedName) {
    return identifierToString(qid1) === identifierToString(qid2);
}