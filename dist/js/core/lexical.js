"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qualifiedNamesEq = exports.isQualifiedIdentifier = exports.isUnqualifiedIdentifier = exports.identifierToString = exports.astToIdentifier = exports.isQualifiedName = exports.isUnqualifiedName = exports.composeQualifiedName = exports.getQualifiedName = exports.getUnqualifiedName = exports.checkIdentifier = exports.ALT_OPS = exports.LOBSTER_KEYWORDS = exports.LOBSTER_MAGIC_FUNCTIONS = exports.MAGIC_FUNCTION_NAMES = exports.KEYWORDS = void 0;
const errors_1 = require("./errors");
const util_1 = require("../util/util");
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
var MAGIC_FUNCTION_NAMES;
(function (MAGIC_FUNCTION_NAMES) {
    MAGIC_FUNCTION_NAMES["assert"] = "assert";
    MAGIC_FUNCTION_NAMES["pause"] = "pause";
    MAGIC_FUNCTION_NAMES["pauseIf"] = "pauseIf";
})(MAGIC_FUNCTION_NAMES = exports.MAGIC_FUNCTION_NAMES || (exports.MAGIC_FUNCTION_NAMES = {}));
exports.LOBSTER_MAGIC_FUNCTIONS = new Set(Object.keys(MAGIC_FUNCTION_NAMES));
exports.LOBSTER_KEYWORDS = new Set(Object.keys(MAGIC_FUNCTION_NAMES));
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
    if (typeof name !== "string") {
        name.components.forEach((elem) => checkIdentifier(src, elem, noteHandler));
        return;
    }
    // Check that identifier is not a C++ keyword, Lobster keyword, or an alternative representation for an operator
    if (exports.KEYWORDS.has(name)) {
        noteHandler.addNote(errors_1.CPPError.iden.keyword(src, name));
    }
    if (exports.LOBSTER_KEYWORDS.has(name)) {
        noteHandler.addNote(errors_1.CPPError.lobster.keyword(src, name));
    }
    if (exports.ALT_OPS.has(name)) {
        noteHandler.addNote(errors_1.CPPError.iden.alt_op(src, name));
    }
}
exports.checkIdentifier = checkIdentifier;
;
function getUnqualifiedName(name) {
    if (isUnqualifiedName(name)) {
        return name;
    }
    else {
        util_1.assert(name.components.length > 0, "Empty qualified name");
        return name.components[name.components.length - 1];
    }
}
exports.getUnqualifiedName = getUnqualifiedName;
function getQualifiedName(name) {
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
exports.getQualifiedName = getQualifiedName;
function composeQualifiedName(prefix, name) {
    let n1 = getQualifiedName(prefix);
    let n2 = getQualifiedName(name);
    return {
        components: n1.components.concat(n2.components),
        str: n1.str + "::" + n2.str
    };
}
exports.composeQualifiedName = composeQualifiedName;
function isUnqualifiedName(name) {
    return typeof name === "string";
}
exports.isUnqualifiedName = isUnqualifiedName;
function isQualifiedName(name) {
    return typeof name !== "string";
}
exports.isQualifiedName = isQualifiedName;
function astToIdentifier(ast) {
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
exports.astToIdentifier = astToIdentifier;
function identifierToString(id) {
    if (typeof id === "string") {
        return id;
    }
    else {
        return id.str;
    }
}
exports.identifierToString = identifierToString;
function isUnqualifiedIdentifier(id) {
    return typeof id === "string";
}
exports.isUnqualifiedIdentifier = isUnqualifiedIdentifier;
function isQualifiedIdentifier(id) {
    return typeof id !== "string";
}
exports.isQualifiedIdentifier = isQualifiedIdentifier;
function qualifiedNamesEq(qid1, qid2) {
    return identifierToString(qid1) === identifierToString(qid2);
}
exports.qualifiedNamesEq = qualifiedNamesEq;
//# sourceMappingURL=lexical.js.map