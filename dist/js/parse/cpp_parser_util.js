"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFunctionDefinition = exports.parseDeclarator = void 0;
const cpp_parser_1 = require("../parse/cpp_parser");
function parseDeclarator(text) {
    return cpp_parser_1.parse(text, { startRule: "declarator" });
}
exports.parseDeclarator = parseDeclarator;
function parseFunctionDefinition(text) {
    return cpp_parser_1.parse(text, { startRule: "function_definition" });
}
exports.parseFunctionDefinition = parseFunctionDefinition;
//# sourceMappingURL=cpp_parser_util.js.map