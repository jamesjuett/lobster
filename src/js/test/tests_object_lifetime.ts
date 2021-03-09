import { SingleTranslationUnitTest, NoErrorsNoWarningsVerifier, NoBadRuntimeEventsVerifier, EndOfMainStateVerifier, OutputVerifier } from "./verifiers";

export function createObjectLifetimeTests() {
  new SingleTranslationUnitTest(
    "Local array ctors/dtors",
    `#include <iostream>
using namespace std;

int ID = 0;

class Mole {
public:
  Mole()
    : id(ID++) {
    cout << "Mole ctor: " << id << endl;
  }

  ~Mole() {
    cout << "Mole dtor: " << id << endl;
  }

private:
  int id;
};

int main() {
  Mole arr[4];
}`,
    [
      new NoErrorsNoWarningsVerifier(),
      new NoBadRuntimeEventsVerifier(true),
      new OutputVerifier(`Mole ctor: 0
Mole ctor: 1
Mole ctor: 2
Mole ctor: 3
Mole dtor: 3
Mole dtor: 2
Mole dtor: 1
Mole dtor: 0
`)
    ]
  );

  new SingleTranslationUnitTest(
    "Bird Lifetimes (Static and Automatic)",
    `#include <iostream>
#include <string>
using namespace std;

class Bird {
private:
  int ID;
public:
  Bird(int id_in)
   : ID(id_in) {
    cout << "Bird ctor: " << ID << endl;
  }
  
  ~Bird() {
    cout << "Bird dtor: " << ID << endl;
  }
  
  void talk() {
    cout << "tweet" << endl;
  }
};

Bird b_global(0);

int main() {
  Bird b1(1);
  for (int i = 0; i < 3; ++i) {
    Bird b2(2);
    b2.talk();
  }
  b1.talk();
  if (100 < 2) {
    Bird b3(3);
    b3.talk();
  }
  else {
    Bird *ptrToB1 = &b1;
    ptrToB1->talk();
  }
}`,
    [
      new NoErrorsNoWarningsVerifier(),
      new NoBadRuntimeEventsVerifier(true),
      new OutputVerifier(`Bird ctor 0
Bird ctor 1
Bird ctor 2
tweet
Bird dtor 2
Bird ctor 2
tweet
Bird dtor 2
Bird ctor 2
tweet
Bird dtor 2
tweet
tweet
Bird dtor 1
Bird dtor 0
`)
    ]
  );
}