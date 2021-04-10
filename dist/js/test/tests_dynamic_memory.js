"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDynamicMemoryTests = void 0;
const verifiers_1 = require("./verifiers");
function createDynamicMemoryTests() {
    new verifiers_1.SingleTranslationUnitTest("Basic New/Delete Test", `#include <iostream>
using namespace std;

int main() {
  int *p = new int(3);
  assert(*p == 3);
  delete p;
}`, [
        new verifiers_1.NoErrorsNoWarningsVerifier(),
        new verifiers_1.NoBadRuntimeEventsVerifier(true)
    ]);
    new verifiers_1.SingleTranslationUnitTest("Basic New/Delete Test", `#include <iostream>

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
} `, [
        new verifiers_1.NoErrorsNoWarningsVerifier(),
        new verifiers_1.NoBadRuntimeEventsVerifier(true),
        new verifiers_1.OutputVerifier(`hi
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
    ]);
}
exports.createDynamicMemoryTests = createDynamicMemoryTests;
//# sourceMappingURL=tests_dynamic_memory.js.map