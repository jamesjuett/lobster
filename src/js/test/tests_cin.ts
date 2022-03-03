import { checkLocalAtomicVariableValues } from "../analysis/runtime";
import { IOState } from "../core/compilation/streams";
import { SingleTranslationUnitTest, NoErrorsNoWarningsVerifier, NoBadRuntimeEventsVerifier, EndOfMainStateVerifier, OutputVerifier } from "./verifiers";

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
      new NoBadRuntimeEventsVerifier(true, "2.5 * 2.0"),
      new EndOfMainStateVerifier(sim => {
        let mainFrame = sim.memory.stack.topFrame();
        return !!mainFrame && checkLocalAtomicVariableValues(mainFrame, {
          x: 2.5,
          y: 2.0,
          ch: "*".charCodeAt(0)
        });
      }, "2.5 * 2.0") // input typed to cin
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
      new NoBadRuntimeEventsVerifier(true, "3.5 + 3.5"),
      new EndOfMainStateVerifier(sim => {
        let mainFrame = sim.memory.stack.topFrame();
        return !!mainFrame && checkLocalAtomicVariableValues(mainFrame, {
          x: 3.5,
          y: 3.5,
          z: 0,
          ch: "+".charCodeAt(0)
        });
      }, "3.5 + 3.5") // input typed to cin
    ]
  );


  new SingleTranslationUnitTest(
    "cin fail/clear test 1",
    `#include <iostream>
using namespace std;

int main() {
  int x, y, z;
  cin >> x >> y >> z;
  cout << x << " " << y << " " << z << endl;
  cin.clear();
  char c;
  cin >> c >> y >> z;
  cout << c << endl;
  cout << x << " " << y << " " << z << endl;
}`,
    [
      new NoErrorsNoWarningsVerifier(),
      new NoBadRuntimeEventsVerifier(true, "3 4 a 5 6"),
      new OutputVerifier(
`3 4 0
a
3 5 6
`, "3 4 a 5 6" // input typed to cin
      )
    ]
  );
  
  new SingleTranslationUnitTest(
    "cin iostate",
    `#include <iostream>
using namespace std;

int main() {
  // We don't test good/bad/fail/eof separately from rdstate because
  // the implementations of those are straightforward and tested elsewhere.

  int x = 42, y = 42, z = 42;
  char a = 'j', b = 'j', c = 'j';

  // read 1, valid input
  cin >> x;
  assert(x == 1);
  assert(cin.rdstate() == ${IOState.good});

  // read a, invalid input
  cin >> y;
  assert(y == 0);
  assert(cin.rdstate() == ${IOState.fail});

  // clear, state should now be good
  cin.clear();
  assert(cin.rdstate() == ${IOState.good});

  // read a, valid input
  cin >> a;
  assert(a == 'a');
  assert(cin.rdstate() == ${IOState.good});

  // read b, invalid input
  cin >> y;
  assert(y == 0);
  assert(cin.rdstate() == ${IOState.fail});

  // attempt to read b again, still invalid
  cin >> y;
  assert(y == 0);
  assert(cin.rdstate() == ${IOState.fail});

  // attempt to read b again, still invalid
  cin >> y;
  assert(y == 0);
  assert(cin.rdstate() == ${IOState.fail});

  // attempt to read b again after clearing, still invalid
  cin.clear();
  assert(cin.rdstate() == ${IOState.good});
  cin >> y;
  assert(y == 0);
  assert(cin.rdstate() == ${IOState.fail});

  // attempt to read b and would be valid, but does nothing since failbit set
  cin >> b;
  assert(b == 'j'); // note that a 0 is not read into b in this case
  assert(cin.rdstate() == ${IOState.fail});

  // clear state, then a valid read for b
  cin.clear();
  cin >> b;
  assert(b == 'b');
  assert(cin.rdstate() == ${IOState.good});

  // read 2 into c, valid since 2 is a character
  cin >> c;
  assert(c == '2'); // '2' not 2
  assert(cin.rdstate() == ${IOState.good});


}`,
    [
      new NoErrorsNoWarningsVerifier(),
      new NoBadRuntimeEventsVerifier(
        true,
        "1 a b 2" // input typed to cin
      )
    ]
  );

  


  new SingleTranslationUnitTest(
    "cin double parsing",
    `#include <iostream>
#include <string>
using namespace std;

int main() {

  double x;
  string s;

  cin >> x;
  assert(x == 2.5);
  assert(cin.rdstate() == ${IOState.good});

  cin >> x;
  assert(x == 2.0);
  assert(cin.rdstate() == ${IOState.good});

  cin >> x;
  assert(x == 2.);
  assert(cin.rdstate() == ${IOState.good});

  cin >> x;
  assert(x == 3);
  assert(cin.rdstate() == ${IOState.good});

  cin >> x;
  assert(x == 2.5);
  assert(cin.rdstate() == ${IOState.good});

  cin >> s;
  assert(s == "blah");
  assert(cin.rdstate() == ${IOState.good});

  cin >> x;
  assert(x == 2.0);
  assert(cin.rdstate() == ${IOState.good});

  cin >> s;
  assert(s == "whee");
  assert(cin.rdstate() == ${IOState.good});

  cin >> x;
  assert(x == 2.);
  assert(cin.rdstate() == ${IOState.good});

  cin >> s;
  assert(s == "whoa");
  assert(cin.rdstate() == ${IOState.good});

  cin >> x;
  assert(x == 2.5);
  assert(cin.rdstate() == ${IOState.good});

  cin >> x;
  assert(x == .5);
  assert(cin.rdstate() == ${IOState.good});

  cin >> x;
  assert(x == 0.0005);
  assert(cin.rdstate() == ${IOState.good});

  cin >> x;
  assert(x == 0.0005);
  assert(cin.rdstate() == ${IOState.good});

  cin >> x;
  assert(x == 0.0005);
  assert(cin.rdstate() == ${IOState.good});

  cin >> x;
  assert(x == 0.234);
  assert(cin.rdstate() == ${IOState.good});
}`,
    [
      new NoErrorsNoWarningsVerifier(),
      new NoBadRuntimeEventsVerifier(
        true,
        "2.5 2.0 2. 3 2.5blah 2.0whee 2.whoa 2.5.5 0.0005 000.0005 000.0005.234" // input typed to cin
      )
    ]
  );
}