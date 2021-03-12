import { checkLocalAtomicVariableValues } from "../analysis/runtime";
import { SingleTranslationUnitTest, NoErrorsNoWarningsVerifier, NoBadRuntimeEventsVerifier, EndOfMainStateVerifier, OutputVerifier } from "./verifiers";

export function createDynamicMemoryTests() {
  new SingleTranslationUnitTest(
    "Basic New/Delete Test",
    `#include <iostream>
using namespace std;

int main() {
  int *p = new int(3);
  assert(*p == 3);
  delete p;
}`,
    [
      new NoErrorsNoWarningsVerifier(),
      new NoBadRuntimeEventsVerifier(true)
    ]
  );

  new SingleTranslationUnitTest(
    "Basic New/Delete Test",
    `#include <iostream>

using namespace std;

class A {
public:
  A() {
    cout << "hi" << endl;
  }
  
  ~A() {
    cout << "bye" << endl;
  }
};

int main() {
  A a;
  cout << "1" << endl;
  int *x = new int(3);
  cout << "2" << endl;
  A *arr = new A[5];
  cout << "3" << endl;
  delete[] arr;
  cout << "4" << endl;
} `,
    [
      new NoErrorsNoWarningsVerifier(),
      new NoBadRuntimeEventsVerifier(true),
      new OutputVerifier(`hi
1
2
hi
hi
hi
hi
hi
3
bye
bye
bye
bye
bye
4
bye
`)
    ]
  );

}