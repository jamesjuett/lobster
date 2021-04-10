"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNumericLiteralValueFromAST = void 0;
const util_1 = require("../util/util");
function parseCPPChar(litValue) {
    return util_1.escapeString(litValue).charCodeAt(0);
}
;
const literalJSParse = {
    "int": parseInt,
    "float": parseFloat,
    "double": parseFloat,
    "bool": (b) => (b ? 1 : 0),
    "char": parseCPPChar
};
function parseNumericLiteralValueFromAST(ast) {
    return literalJSParse[ast.type](ast.value);
}
exports.parseNumericLiteralValueFromAST = parseNumericLiteralValueFromAST;
//# sourceMappingURL=ast_expressions.js.map