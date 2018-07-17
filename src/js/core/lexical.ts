import {NoteHandler} from "./errors";

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

export const ALT_OPS = new Set([
    "and", "and_eq", "bitand", "bitor", "compl", "not",
    "not_eq", "or", "or_eq", "xor", "xor_eq"
]);

//TODO: not sure if this is the right place for this. May be bettor suited for error.ts
export var checkIdentifier = function(src: CPPConstruct, iden: string, noteHandler: NoteHandler) {
    if (Array.isArray(iden)) {
        iden.forEach(function(elem) {
            checkIdentifier(src, elem.identifier, noteHandler);
        });
    }
    // Check that identifier is not a keyword or an alternative representation for an operator
    if (KEYWORDS.has(iden)) {
        noteHandler.addNote(CPPError.iden.keyword(src, iden));
    }
    if (ALT_OPS.has(iden)) {
        noteHandler.addNote(CPPError.iden.alt_op(src, iden));
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