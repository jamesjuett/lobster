import { PointerType, Int } from "./core/types";
import { parse as cpp_parse } from "./parse/cpp_parser";
import { SourceFile, Program } from "./core/Program";
import { Simulation } from "./core/Simulation";

console.log("hello");
// let x = new PointerType(new Int(), true);
// console.log(x.toString());

let file1 = new SourceFile("test.cpp", "int main() {int x = 2;}");
let program = new Program([file1], ["test.cpp"]);
console.log(program);

if (program.isRunnable()) {
    let sim = new Simulation(program);
    console.log(sim);
    sim.memory.printObjects();
    setInterval(() => {
        sim.stepForward()
        sim.memory.printObjects();
    }, 10000);
    // while(!sim.atEnd) {
    //     sim.stepForward();
    // }
}