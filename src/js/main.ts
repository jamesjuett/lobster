import { PointerType, Int } from "./core/types";
import { parse as cpp_parse } from "./parse/cpp_parser";
import {RuntimeConstruct} from "./core/constructs";
import { SourceFile, TranslationUnit } from "./core/Program";

console.log("hello");
// let x = new PointerType(new Int(), true);
// console.log(x.toString());

let file1 = new SourceFile("test.cpp", "int main() {int x = 2;}");
// let program = new Program([file1], ["test.cpp"]);
console.log(file1);