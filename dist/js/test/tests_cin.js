"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCinTests = void 0;
const runtime_1 = require("../analysis/runtime");
const verifiers_1 = require("./verifiers");
function createCinTests() {
    new verifiers_1.SingleTranslationUnitTest("EECS 183 cin test 1", `#include <iostream>
using namespace std;

int main() {
  double x = 2, y = 4; 
  char ch;
  cin >> x >> ch >> y; 
  cout << x * y;
}`, [
        new verifiers_1.NoErrorsNoWarningsVerifier(),
        new verifiers_1.NoBadRuntimeEventsVerifier(true),
        new verifiers_1.EndOfMainStateVerifier(sim => {
            let mainFrame = sim.memory.stack.topFrame();
            return !!mainFrame && runtime_1.checkLocalAtomicVariableValues(mainFrame, {
                x: 2.5,
                y: 2.0,
                ch: "*".charCodeAt(0)
            });
        }, "2.5 * 2.0")
    ]);
    new verifiers_1.SingleTranslationUnitTest("EECS 183 cin test 2", `#include <iostream>
using namespace std;

int main() {
  double x = 2, y = 3, z = 0;
  char ch;
  cin >> x >> ch >> y;
  cout << x + y;
}`, [
        new verifiers_1.NoErrorsNoWarningsVerifier(),
        new verifiers_1.NoBadRuntimeEventsVerifier(true),
        new verifiers_1.EndOfMainStateVerifier(sim => {
            let mainFrame = sim.memory.stack.topFrame();
            return !!mainFrame && runtime_1.checkLocalAtomicVariableValues(mainFrame, {
                x: 3.5,
                y: 3.5,
                z: 0,
                ch: "+".charCodeAt(0)
            });
        }, "3.5 + 3.5")
    ]);
}
exports.createCinTests = createCinTests;
//# sourceMappingURL=tests_cin.js.map