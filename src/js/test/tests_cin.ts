import { checkLocalAtomicVariableValues } from "../analysis/runtime";
import { SingleTranslationUnitTest, NoErrorsNoWarningsVerifier, NoBadRuntimeEventsVerifier, EndOfMainStateVerifier } from "./verifiers";

export function createCinTests() {
  new SingleTranslationUnitTest(
    "EECS 183 cin test 1",
    `#include <iostream>
using namespace std;

int main() {
  double x = 2, y = 4; 
  char ch;
  cin >> x >> ch >> y; 
  cout << x * y;
}`,
    [
      new NoErrorsNoWarningsVerifier(),
      new NoBadRuntimeEventsVerifier(true),
      new EndOfMainStateVerifier(sim => {
        let mainFrame = sim.memory.stack.topFrame();
        return !!mainFrame && checkLocalAtomicVariableValues(mainFrame, {
          x: 2.5,
          y: 2.0,
          ch: "*".charCodeAt(0)
        });
      }, "2.5 * 2.0")
    ]
  );


  new SingleTranslationUnitTest(
    "EECS 183 cin test 2",
    `#include <iostream>
using namespace std;

int main() {
  double x = 2, y = 3, z = 0;
  char ch;
  cin >> x >> ch >> y;
  cout << x + y;
}`,
    [
      new NoErrorsNoWarningsVerifier(),
      new NoBadRuntimeEventsVerifier(true),
      new EndOfMainStateVerifier(sim => {
        let mainFrame = sim.memory.stack.topFrame();
        return !!mainFrame && checkLocalAtomicVariableValues(mainFrame, {
          x: 3.5,
          y: 3.5,
          z: 0,
          ch: "+".charCodeAt(0)
        });
      }, "3.5 + 3.5")
    ]
  );
}