import {
  SingleTranslationUnitTest,
  NoErrorsNoWarningsVerifier,
  NoBadRuntimeEventsVerifier,
  EndOfMainStateVerifier,
  OutputVerifier,
} from './verifiers';

export function createObjectLifetimeTests() {
  new SingleTranslationUnitTest(
    'Local array ctors/dtors',
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
`),
    ]
  );

  new SingleTranslationUnitTest(
    'Static and Automatic Lifetimes',
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
      new OutputVerifier(`Bird ctor: 0
Bird ctor: 1
Bird ctor: 2
tweet
Bird dtor: 2
Bird ctor: 2
tweet
Bird dtor: 2
Bird ctor: 2
tweet
Bird dtor: 2
tweet
tweet
Bird dtor: 1
Bird dtor: 0
`),
    ]
  );

  new SingleTranslationUnitTest(
    'Classes, Bases, and Members (simple)',
    `#include <string>
#include <iostream>
using namespace std;

class Base {
public:
  int id;
  Base(int id) : id(id) { cout << "Base ctor " << id << endl; }
  ~Base() { cout << "Base dtor " << id << endl; }
};

class Mem1 {
public:
  int id;
  Mem1(int id) : id(id) { cout << "Mem1 ctor " << id << endl; }
  ~Mem1() { cout << "Mem1 dtor " << id << endl; }
};

class MemBase {
public:
  int id;
  MemBase(int id) : id(id) { cout << "MemBase ctor " << id << endl; }
  ~MemBase() { cout << "MemBase dtor " << id << endl; }
};

class Mem2 : public MemBase {
public:
  int id;
  Mem2(int id) : MemBase(id), id(id) { cout << "Mem2 ctor " << id << endl; }
  ~Mem2() { cout << "Mem2 dtor " << id << endl; }
};

class Test : public Base {
public:
  Mem1 m1;
  Mem2 m2;
    int id;
  Test() : Base(0), m1(0), m2(0), id(0) { cout << "Test ctor " << id << endl; }
  Test(int id) : Base(id), m1(id), m2(id), id(id) { cout << "Test ctor " << id << endl; }
  ~Test() { cout << "Test dtor " << id << endl; }
};

int main() {
  Test test(1);
}`,
    [
      new NoErrorsNoWarningsVerifier(),
      new NoBadRuntimeEventsVerifier(true),
      new OutputVerifier(`Base ctor 1
Mem1 ctor 1
MemBase ctor 1
Mem2 ctor 1
Test ctor 1
Test dtor 1
Mem2 dtor 1
MemBase dtor 1
Mem1 dtor 1
Base dtor 1
`),
    ]
  );

  new SingleTranslationUnitTest(
    'Classes, Bases, and Members (full)',
    `#include <string>
#include <iostream>
using namespace std;

class Base {
public:
  int id;
  Base(int id) : id(id) { cout << "Base ctor " << id << endl; }
  ~Base() { cout << "Base dtor " << id << endl; }
};

class Mem1 {
public:
  int id;
  Mem1(int id) : id(id) { cout << "Mem1 ctor " << id << endl; }
  ~Mem1() { cout << "Mem1 dtor " << id << endl; }
};

class MemBase {
public:
  int id;
  MemBase(int id) : id(id) { cout << "MemBase ctor " << id << endl; }
  ~MemBase() { cout << "MemBase dtor " << id << endl; }
};

class Mem2 : public MemBase {
public:
  int id;
  Mem2(int id) : MemBase(id), id(id) { cout << "Mem2 ctor " << id << endl; }
  ~Mem2() { cout << "Mem2 dtor " << id << endl; }
};

class Test : public Base {
public:
  Mem1 m1;
  Mem2 m2;
    int id;
  Test() : Base(0), m1(0), m2(0), id(0) { cout << "Test ctor " << id << endl; }
  Test(int id) : Base(id), m1(id), m2(id), id(id) { cout << "Test ctor " << id << endl; }
  ~Test() { cout << "Test dtor " << id << endl; }
};

void func(Test &r) {
  cout << "func() called" << endl;
  for(int i = 0; i < 2; ++i) {
    Test t(2);
  }
  Test t(3);
}

int main() {
  Test test(1);
  func(test);
  Test *p = new Test(4);
  delete p;
  Test arr[3];
}`,
    [
      new NoErrorsNoWarningsVerifier(),
      new NoBadRuntimeEventsVerifier(true),
      new OutputVerifier(`Base ctor 1
Mem1 ctor 1
MemBase ctor 1
Mem2 ctor 1
Test ctor 1
func() called
Base ctor 2
Mem1 ctor 2
MemBase ctor 2
Mem2 ctor 2
Test ctor 2
Test dtor 2
Mem2 dtor 2
MemBase dtor 2
Mem1 dtor 2
Base dtor 2
Base ctor 2
Mem1 ctor 2
MemBase ctor 2
Mem2 ctor 2
Test ctor 2
Test dtor 2
Mem2 dtor 2
MemBase dtor 2
Mem1 dtor 2
Base dtor 2
Base ctor 3
Mem1 ctor 3
MemBase ctor 3
Mem2 ctor 3
Test ctor 3
Test dtor 3
Mem2 dtor 3
MemBase dtor 3
Mem1 dtor 3
Base dtor 3
Base ctor 4
Mem1 ctor 4
MemBase ctor 4
Mem2 ctor 4
Test ctor 4
Test dtor 4
Mem2 dtor 4
MemBase dtor 4
Mem1 dtor 4
Base dtor 4
Base ctor 0
Mem1 ctor 0
MemBase ctor 0
Mem2 ctor 0
Test ctor 0
Base ctor 0
Mem1 ctor 0
MemBase ctor 0
Mem2 ctor 0
Test ctor 0
Base ctor 0
Mem1 ctor 0
MemBase ctor 0
Mem2 ctor 0
Test ctor 0
Test dtor 0
Mem2 dtor 0
MemBase dtor 0
Mem1 dtor 0
Base dtor 0
Test dtor 0
Mem2 dtor 0
MemBase dtor 0
Mem1 dtor 0
Base dtor 0
Test dtor 0
Mem2 dtor 0
MemBase dtor 0
Mem1 dtor 0
Base dtor 0
Test dtor 1
Mem2 dtor 1
MemBase dtor 1
Mem1 dtor 1
Base dtor 1
`),
    ]
  );
}
