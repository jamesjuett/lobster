import { PointerType, Int } from "./core/types";
import { parse as cpp_parse } from "./parse/cpp_parser";
import { SourceFile, Program } from "./core/Program";
import { Simulation } from "./core/Simulation";

console.log("hello");
// let x = new PointerType(new Int(), true);
// console.log(x.toString());

let file1 = new SourceFile("test.cpp", `

int square(int x) {
    return x * x;
}

int * enigma(int x, int &y, int *ptr) {
    x = x + 1;
    y = y + 1;
    *ptr = *ptr + 1;
    return &y;
}

int main() {
    int x = 2;
    int y = 3;
    int z = 10 * x + y;
    double d1 = 10.5;
    double d2 = 7.2;
    double d3 = d1 + d2;
    z = d1 + d2;
    int blah = d1 + d2 - 10;
    int foo = square(blah);
    int foo2 = 5;
    int e1 = 1;
    int e2 = 2;
    int e3 = 3;
//    int &e4 = enigma(e1, e2, &e3);
//    e4 = e4 + 1;
}
`);
let program = new Program([file1], ["test.cpp"]);
console.log(program);

if (program.isRunnable()) {
    let sim = new Simulation(program);
    console.log(sim);
    sim.memory.printObjects();
    let timeout = setInterval(() => {
        sim.stepForward()
        sim.memory.printObjects();
        if (sim.atEnd) {
            clearInterval(timeout);
        }
    }, 100);
    // while(!sim.atEnd) {
    //     sim.stepForward();
    // }
}