"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var errors_1 = require("./errors");
exports.KEYWORDS = new Set([
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
exports.ALT_OPS = new Set([
    "and", "and_eq", "bitand", "bitor", "compl", "not",
    "not_eq", "or", "or_eq", "xor", "xor_eq"
]);
// export type UnqualifiedName = string;
// export type QualifiedName = string[];
// export type Name = UnqualifiedName | QualifiedName;
//TODO: not sure if this is the right place for this. May be bettor suited for error.ts
function checkIdentifier(src, name, noteHandler) {
    // Special case for qualified names
    if (name.includes("::")) {
        name.split("::").forEach(function (elem) { return checkIdentifier(src, elem, noteHandler); });
        return;
    }
    // Check that identifier is not a keyword or an alternative representation for an operator
    if (exports.KEYWORDS.has(name)) {
        noteHandler.addNote(errors_1.CPPError.iden.keyword(src, name));
    }
    if (exports.ALT_OPS.has(name)) {
        noteHandler.addNote(errors_1.CPPError.iden.alt_op(src, name));
    }
}
exports.checkIdentifier = checkIdentifier;
;
function createFullyQualifiedName() {
    var names = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        names[_i] = arguments[_i];
    }
    return "::" + names.join("::");
}
exports.createFullyQualifiedName = createFullyQualifiedName;
function fullyQualifiedNameToUnqualified(fqname) {
    var i = fqname.lastIndexOf("::");
    if (i === -1) {
        return fqname;
    }
    else {
        return fqname.slice(i + 2);
    }
}
exports.fullyQualifiedNameToUnqualified = fullyQualifiedNameToUnqualified;
//# sourceMappingURL=lexical.js.map