import { ProgramTest, SingleTranslationUnitTest, NoErrorsNoWarningsVerifier, NoBadRuntimeEventsVerifier, BasicSynchronousRunnerTest, NoteVerifier, OutputVerifier, EndOfMainStateVerifier } from "./verifiers";
import { CompilationNotesOutlet } from "../view/editors";

import "../lib/standard"
import { checkLocalAtomicVariableValues } from "../analysis/runtime";
import { createCinTests } from "./tests_cin";
import { createDynamicMemoryTests } from "./tests_dynamic_memory";
import { createObjectLifetimeTests } from "./tests_object_lifetime";

$(() => {
    var numTests = 0;
    var numTestsSuccessful = 0;

    var showTest = (test: ProgramTest) => {
        var programElem = $('<div class="col-xs-6"></div>');

        programElem.append("Translation Units: <br />");
        for(var name in test.program.translationUnits) {
            programElem.append("<code>" + name + "</code><br />");
        }

        programElem.append("Source Files: <br />");
        var filesElem = $("<pre></pre>");
        filesElem.hide();
        var showFilesButton = $('<button class="btn btn-primary">Show</button>');
        showFilesButton.click(function() {
            showFilesButton.html(showFilesButton.html() === "Show" ? "Hide" : "Show");
            filesElem.toggle();
        });
        programElem.append(showFilesButton);
        for (let tuName in test.program.translationUnits) {
            var sourceFile = test.program.sourceFiles[tuName];
            test.program.translationUnits
            filesElem.append(sourceFile.name + "\n" + sourceFile.text);
        }
        programElem.append(filesElem);


        var resultsElem = $('<div class="col-xs-6"></div>');
//            resultsElem.append(test.results.status);
//            resultsElem.append("<br />");
        var success = true;
        for(var i = 0; i < test.results.length; ++i) {
            var result = test.results[i];

            var statusElem = $("<span class='label'>"+result.status+"</span>");
            statusElem.addClass(result.status === "success" ? "label-success" : "label-danger");
            resultsElem.append(statusElem);
            resultsElem.append(" " + result.verifierName);
            resultsElem.append("<br />");
            resultsElem.append(result.message + "<br />");

            if (result.status !== "success") {
                success = false;
            }
        }
        let notesElem = $("<ul></ul>").appendTo(resultsElem);
        (new CompilationNotesOutlet(notesElem)).updateNotes(test.program);

        var testElem = $('<div class="container lobster-test-result"></div>');
        testElem.append("<h4>" + test.name + "</h4>");
        testElem.append(programElem);
        testElem.append(resultsElem);
        $("#regression_tests").append(testElem);

        ++numTests;
        if (success) {
            ++numTestsSuccessful;
        }
        $("#allTestsResults").html(numTestsSuccessful + "/" + numTests + " tests successful")
    };

    ProgramTest.setDefaultReporter(showTest);

    // Empty main
    new SingleTranslationUnitTest(
        "Empty Main",
        "int main() { }",
        [
            new NoErrorsNoWarningsVerifier(),
            new NoBadRuntimeEventsVerifier(true)
        ]
    );

    // ---------- Basic Declaration Tests ----------
    
    new SingleTranslationUnitTest(
      "Simple Error",
`int main() {
  int &x;
  int *ptr = 3;
}`,
      [
          new NoteVerifier([
            {line: 2, id: "declaration.init.referenceBind"},
            {line: 3, id: "declaration.init.convert"},
          ])
      ]
    );

    // ---------- Basic Declaration Tests ----------

    var basicDeclarationTestCode =
        `int main() {
  // A variety of declartions, including pointers and references
  int var = 3;
  int *ptr = &var;
  int **ptr2 = &ptr;
  int ***ptr3 = &ptr2;
  int &ref = var;
  int &ref2 = ref;
  int *&ref_to_ptr = ptr;
  int var2 = var;
  int var3 = *ptr;
  int var4 = **ptr2;
  int var5 = ref;
  int var6 = *ref_to_ptr;

  // Check that they all have the same value
  assert(var == 3);
  assert(*ptr == 3);
  assert(**ptr2 == 3);
  assert(***ptr3 == 3);
  assert(ref == 3);
  assert(ref2 == 3);
  assert(*ref_to_ptr == 3);
  assert(var2 == 3);
  assert(var3 == 3);
  assert(var4 == 3);
  assert(var5 == 3);
  assert(var6 == 3);
  

  // Check that they have same/different addresses as they should
  assert(ptr == &var);
  assert(&ref == &var);
  assert(&ref2 == &ref);
  assert(&var2 != &var);
  assert(&ref_to_ptr == &ptr);
  assert(&ref_to_ptr == ptr2);

  // change via reference, check that the change is reflected everywhere
  ref = 4;
  assert(ref == 4);
  assert(var == 4);
  assert(*ptr == 4);
  assert(*ref_to_ptr == 4);

  // change via pointer, check that the change is reflected everywhere
  *ptr = 5;
  assert(ref == 5);
  assert(var == 5);
  assert(*ptr == 5);
  assert(*ref_to_ptr == 5);

  // test basic declaration of arrays
  // int arr[3];
  // int arr2[4] = {1, 2, 3, 99};
  // int *ptrArr[2];
  // int *ptrArr2[3] = {ptr, *ptr2, ref_to_ptr};
  // assert(arr2[2] == 3);
  // assert(ptrArr2[0] == &var);

  // arr2[3] = *ptrArr2[2];
  // assert(arr2[3] == var);

}`;
    var fundamentalTypesToTest = ["int", "double", "char"];
    fundamentalTypesToTest.map(function(t) {
        new SingleTranslationUnitTest(
            "Basic Declaration Test - " + t,
            basicDeclarationTestCode.replace(/int/g, t),
            [
                new NoErrorsNoWarningsVerifier(),
                new NoBadRuntimeEventsVerifier(true)
            ]
        );
    });

        // ---------- Basic String Literal Test ----------

        new SingleTranslationUnitTest(
          "Basic String Literal Test",
`bool strs_equal(const char *str1, const char *str2) {
  while(*str1 || *str2) {
    if (*str1 != *str2) {
      return false;
    }
    str1 = str1 + 1;
    str2 = str2 + 1;
  }
  return true;
}

void strcpy(char *dst, const char *src) {
  while(*src) {
    *dst = *src;
    src = src + 1;
    dst = dst + 1;
  }
  *dst = '\0';
}

int main() {
  char str[4] = "hey";
  int x = 2 + 3;
  const char *str2 = "hey";
  char const *str3 = "hey";
  
  assert(str != "hey");
  assert(str != str2);
  assert(str2 == str3);
  
  str2 = "hello";
  str3 = "hello";
  
  assert(str2 == str3);
  
  char big[10] = "hi";
  
  assert(big[2] == 0);
  assert(big[3] == 0);
  assert(big[9] == 0);
  char test = *big;
  strcpy(big, str2);
  assert(strs_equal(big, "hello"));
  strcpy(big, "hey");
  
  assert(strs_equal(big, "hey"));
}`,
          [
              new NoErrorsNoWarningsVerifier(),
              new NoBadRuntimeEventsVerifier(true)
          ]
      );

      // ---------- Basic Reference Test ----------
  
      new SingleTranslationUnitTest(
          "Basic Reference Test",
  `int main() {
  int x = 3;
  int &y = x;
  assert(y == 3);
  x = 10;
  assert(y == 10);
  y = 5;
  assert(x == 5); 
}`,
          [
              new NoErrorsNoWarningsVerifier(),
              new NoBadRuntimeEventsVerifier(true)
          ]
      );

      // ---------- Const Reference Test ----------
  
      new SingleTranslationUnitTest(
          "Const Reference Test",
  `int main() {
  int x;
  int &rx = x;
  const int &crx = x;
  rx = 10;
  crx = 10;
  rx = crx;
  crx = rx;
  
  const int y;
  int &ry = y;
  const int &cry = y;
  ry = 10;
  cry = 10;
  ry = cry;
  cry = ry;
  
  rx = ry;
  rx = cry;
  crx = ry;
  crx = cry;
  
  ry = rx;
  ry = crx;
  cry = rx;
  cry = crx;
}
`,
    [
      new NoteVerifier([
        {line: 6, id: "expr.assignment.lhs_const"},
        {line: 8, id: "expr.assignment.lhs_const"},
        {line: 11, id: "declaration.init.referenceConstness"},
        {line: 14, id: "expr.assignment.lhs_const"},
        {line: 16, id: "expr.assignment.lhs_const"},
        {line: 20, id: "expr.assignment.lhs_const"},
        {line: 21, id: "expr.assignment.lhs_const"},
        {line: 25, id: "expr.assignment.lhs_const"},
        {line: 26, id: "expr.assignment.lhs_const"},
      ])
    ]);


      

      // ---------- Basic Reference Test ----------
  
      new SingleTranslationUnitTest(
          "Basic Reference Test",
  `int main() {
  int x = 3;
  int &y = x;
  assert(y == 3);
  x = 10;
  assert(y == 10);
  y = 5;
  assert(x == 5); 
}`,
          [
              new NoErrorsNoWarningsVerifier(),
              new NoBadRuntimeEventsVerifier(true)
          ]
      );


    // ---------- Basic Selection Test ----------

    new SingleTranslationUnitTest(
        "Basic Selection Test",
`int main() {
  int a = 3;
  int b = 4;

  // Basic if/else
  if (a == 3) {
    a = a + 1;
  }
  assert(a == 4);

  if (b == 10) {
    assert(false);
  }
  else {
    assert(true);
  }

  // Scope tests
  int c = 0;
  if (true) {
    c = c + 1;
  }
  if (false) {
    c = c - 1;
  }
  else {
    c = c + 1;
  }
  assert(c == 2);

  int d = 0;
  if (true) {
    int d = 10;
  }
  if (false) {
    int d = 10;
  }
  else {
    int d = 10;
  }
  assert(d == 0);
  
  int e = 0;
  if (true) e = e + 1;
  if (false) e = e - 1;
  else e = e + 1;
  assert(e == 2);

  int f = 0;
  if (true) int f = 10;
  if (false) int f = 10;
  else int f = 10;
  assert(f == 0);

  // TODO: add test for error when something inside selection scope is used outside
}`,
        [
            new NoErrorsNoWarningsVerifier(),
            new NoBadRuntimeEventsVerifier(true)
        ]
    );
  
    // ---------- Basic Iteration Test ----------

    new SingleTranslationUnitTest(
        "Basic Iteration Test",
        `int main() {
  int x = 4;
  int y = 4;

  int count = 0;
  while (y > 0) {
    y = y - 1;
    count = count + 1;
  }
  assert(y == 0);
  assert(count == 4);

  for(int i = 0; i < 10; i = i + 1) {
    y = y + 1;
  }
  assert(y == 10);

  for(int i = 0; i < 10; i = i + 1) {
    y = y + 1;
  }
  assert(y == 20);

  // int z = 3;
  // do {
  //   z =  + 1;
  // }
  // while(z == 4);
  // assert(z == 5);

  int a = 5;
  while (a > 0) {
    a = a - 1;
    if (a < 3) {
      break;
    }
  }
  assert(a == 2);

  for(; a < 10; a = a + 1) {
    if (a > 3) {
      if (a > 4) {
        if (a == 5) {
          break;
        }
      }
    }
  }
  assert(a == 5);

  // Expression statements
  x = x + 1;
  x;
  x == x;

  // Compound statement
  {
    int blah = x;
    x + 1;
    x = x + 1;
    assert(blah + 1 == x);
  }

  // Null statements
  ;;;
  {
    ;
    x + 1; ; y = 3;
  }

}`,
        [
            new NoErrorsNoWarningsVerifier(),
            new NoBadRuntimeEventsVerifier(true)
        ]
    );








        // ---------- Basic Expression Test ----------

        new SingleTranslationUnitTest(
          "Basic Expression Test",
          `int plus2(int x) {
    return x + 2;
  }
  
  int func(int x, int &y, int *z) {
    x = 2;
    y = 2;
    *z = 2;
    z = 0;
    return 2;
  }
  
  class TestClass {
  public:
    int mem1;
    double mem2;
  };
  
  int main() {
  
    // Literals
    int a = 3;
    double b = 4.5;
    char c = 'x';
    bool d = true;
    a = 4;
    b = 83.4;
    c = 'a';
    d = false;
  
    // Identifiers implicitly tested in other tests
  
    // Parentheses
    int f = 5;
    int g = 10;
    assert(f + g * 2 == 25);
    assert((f + g) * 2 == 30);
    assert((f) + (((g)) + 2) * (2 == 25) == 5);
  
    // Subscript
    int arr_a[5] = {5, 6, 7, 8, 9};
    assert(arr_a[0] == 5);
    assert(arr_a[3] == 8);
    assert(arr_a[4] == 9);
    arr_a[0] = 10;
    int *ptr_a = &arr_a[1];
    assert(ptr_a[0] == 6);
    assert(ptr_a[-1] == 10);
    assert(ptr_a[2] == 8);
    assert(ptr_a == arr_a + 1);
  
    // Function call
    int h = plus2(3);
    assert(h == 5);
    assert(plus2(5) == 7);
    int i1 = 5;
    int i2 = 5;
    int i3 = 5;
    int *i3_ptr = &i3;
    int i4 = func(i1, i2, i3_ptr);
    assert(i1 == 5);
    assert(i2 == 2);
    assert(i3 == 2);
    assert(i4 == 2);
    assert(i3_ptr == &i3);
  
    // Function call with function pointer
    // int (*func_ptr)(int, int&, int*) = func;
    // int (*func_ptr2)(int, int&, int*) = &func;
    // int (*func_ptr3)(int, int&, int*) = *func;
    // i1 = i2 = i3 = 5;
    // func_ptr(i1, i2, i3_ptr);
    // assert(i1 == 5);
    // assert(i2 == 2);
    // assert(i3 == 2);
    // assert(i4 == 2);
    // assert(i3_ptr == &i3);
    // i1 = i2 = i3 = 5;
    // (*func_ptr)(i1, i2, i3_ptr);
    // assert(i1 == 5);
    // assert(i2 == 2);
    // assert(i3 == 2);
    // assert(i4 == 2);
    // assert(i3_ptr == &i3);
  
    // Member access with . and ->
    TestClass j;
    j.mem1 = 5;
    j.mem2 = 4.5;
    assert(j.mem1 + 2 == 5 + 2);
    assert(j.mem2 + 2.1 == 4.5 + 2.1);
    TestClass *j_ptr = &j;
    j_ptr->mem1 = 2;
    j_ptr->mem2 = 3.14;
    assert(j_ptr->mem1 + 1 == 2 + 1);
    assert(j_ptr->mem2 + 0.99 == 3.14 + 0.99);
  
    // Increment/decrement
    int k = 5;
    assert(++k == 6);
    assert(k == 6);
    assert(k++ == 6);
    assert(k == 7);
    ++k = 10;
    assert(k == 10);
  
    int l = 5;
    assert(--l == 4);
    assert(l == 4);
    assert(l-- == 4);
    assert(l == 3);
    --l = 10;
    assert(l == 10);
  
    int m = 5;
    assert((++m)-- == 6);
    assert(m == 5);
  
    // Unary operators
    int n = 5;
    int n1 = +n; assert(n1 == 5);
    int n2 = +6; assert(n2 == 6);
    int n3 = -n; assert(n3 == -5);
    int n4 = -6; assert(n4 == -6);
    bool o = true;
    o = !o;
    assert(o == false);
    assert(!o);
    assert(!!!o);
    assert(!!true);
  
    // Address of and dereference
    int p = 5;
    int *p_ptr = &p;
    int &p_ref = p;
    assert(*p_ptr == p);
    assert(p_ptr == &p);
    assert(**&p_ptr == p);
    assert(*p_ptr = 10);
    assert(p == 10);
  
    // new/delete/delete[]
    // int *q1 = new int(3);
    // double *q2 = new double(4.5);
    // double **q3 = new (double*)(q2);
  
    // delete q1;
    // delete *q3;
    // delete q3;
  }`,
          [
              new NoErrorsNoWarningsVerifier(),
              new NoBadRuntimeEventsVerifier(true)
          ]
      );





      // ---------- Basic Parameter Test ----------

  new SingleTranslationUnitTest(
      "Basic Parameter Test",
      `int func1(int x, int y) {
  x = x + 10;
  y = y + 10;
  return x;
}

int *func2(int &x, int *ptr) {
  x = x + 10;
  *ptr = *ptr + 10;
  return ptr;
}

int & func3(int *ptr) {
  *ptr = *ptr + 10;
  return *ptr;
}

int main() {
  int a = 1;
  int b = 2;
  int c = func1(a, b);
  assert(a == 1);
  assert(b == 2);
  assert(c == 11);
  
  int *d = func2(a, &b);
  assert(a == 11);
  assert(b == 12);
  assert(*d == 12);
  
  int e = 2;
  int f = func3(&e);
  f = f + 10;
  assert(e = 12);
  assert(f = 22);
  assert(&e != &f);
  
  int g = 2;
  int &h = func3(&g);
  h = h + 10;
  assert(g == 22);
  assert(h == 22);
  assert(&g == &h);
  
  int i = 3;
  int &j = *func2(i, &i);
  j = j + 10;
  assert(i == 33);
  assert(j == 33);
  
}`,
      [
          new NoErrorsNoWarningsVerifier(),
          new NoBadRuntimeEventsVerifier(true)
      ]
  );

  
  
// ---------- Basic Class Test ----------

new SingleTranslationUnitTest(
"Basic Class Test",
`class A {
  public:
    
    int x;
    double &y;
    int *z;
    
    A(int x, double &y, int *z)
     : x(x), y(y), z(z) {
      
    }
  
  	int func(int mult) {
      return x * mult;
    }
  
    double &getY() {
      return y;
    }
  };
  
  int main() {
    int x = 1;
    double y = 2;
    int z = 3;
    A a(x, y, &z);
    
    assert(a.x == x);
    assert(x == 1);
    assert(&a.x != &x);
    
    assert(a.y == y);
    assert(y == 2);
    assert(&a.y == &y);
    a.y = 5;
    assert(a.y == 5);
    assert(y == 5);
    assert(&a.y == &y);
    
    assert(*a.z == z);
    assert(z == 3);
    *a.z = 7;
    assert(*a.z == 7);
    assert(z == 7);
    
    assert(a.func(3) == 3);
    assert(a.getY() == 5.0);
    assert(&a.getY() == &a.y);
    
    A *ptr = &a;
    x = 1;
    y = 2;
    a.x = 1;
    a.y = 2;
    *a.z = 3;
    
    assert(ptr->x == a.x);
    assert(ptr->y == a.y);
    assert(ptr->z == a.z);
    assert(&ptr->x == &a.x);
    assert(&ptr->y == &a.y);
    assert(&ptr->z == &a.z);
  	
    assert(ptr->x == x);
    assert(x == 1);
    assert(&ptr->x != &x);
    
    assert(ptr->y == y);
    assert(y == 2);
    assert(&ptr->y == &y);
    ptr->y = 5;
    assert(ptr->y == 5);
    assert(y == 5);
    assert(&ptr->y == &y);
    
    assert(*ptr->z == z);
    assert(z == 3);
    *ptr->z = 7;
    assert(*ptr->z == 7);
    assert(z == 7);
    
    assert(ptr->func(3) == 3);
    assert(ptr->getY() == 5.0);
    assert(&ptr->getY() == &a.y);
  }`,
[
    new NoErrorsNoWarningsVerifier(),
    new NoBadRuntimeEventsVerifier(true)
]
);


// ---------- Basic Class Composition Test ----------

new SingleTranslationUnitTest(
  "Basic Class Composition Test",
  `class Coffee {
    public:  
      int creams;
      int sugars;
      bool isDecaf;
    
      // Regular coffee with creams/sugars
      Coffee(int creams, int sugars) : creams(creams), sugars(sugars), isDecaf(false) {}
    
      // This ctor can specify regular/decaf
      Coffee(int creams, int sugars,
             bool isDecaf) : creams(creams), sugars(sugars), isDecaf(isDecaf) {}
    
      void addCream() {
        creams = creams + 1;
      }
    
      void addSugar() {
        sugars = sugars + 1;
      }
      
    };
    
    class Triangle {
    public:
      int a, b, c;
    
      Triangle()
        : a(1), b(1), c(1) { }
    
      Triangle(int side)
        : a(side), b(side), c(side) { }
    
      Triangle(int a_in, int b_in, int c_in)
        : a(a_in), b(b_in), c(c_in) { }
    };
    
    class Professor {
    public:
      int id;
      Coffee favCoffee;
      Triangle favTriangle;
    
      Professor(int id)
       : id(id), favCoffee(0, 0, true) {
      }
      
      Professor()
        : id(2), favCoffee(2, 2), favTriangle(3, 4, 5) { }
      
    };
    
    
    int main() {
      Professor prof1(1);
      assert(prof1.id == 1);
      assert(prof1.favCoffee.creams == 0);
      assert(prof1.favCoffee.sugars == 0);
      assert(prof1.favCoffee.isDecaf == true);
      assert(prof1.favTriangle.a == 1);
      assert(prof1.favTriangle.b == 1);
      assert(prof1.favTriangle.c == 1);
      
      Professor prof2;
      assert(prof2.id == 2);
      assert(prof2.favCoffee.creams == 2);
      assert(prof2.favCoffee.sugars == 2);
      assert(prof2.favCoffee.isDecaf == false);
      assert(prof2.favTriangle.a == 3);
      assert(prof2.favTriangle.b == 4);
      assert(prof2.favTriangle.c == 5);
      
      assert(&prof1 != &prof2);
      assert(&prof1.favCoffee != &prof2.favCoffee);
      assert(&prof1.favTriangle != &prof2.favTriangle);
      
    }`,
  [
      new NoErrorsNoWarningsVerifier(),
      new NoBadRuntimeEventsVerifier(true)
  ]
  );




// ---------- Big Three Test ----------

new SingleTranslationUnitTest(
  "Big Three Test",
  `#include <iostream>
using namespace std;

class Mole {
public:
  Mole(int s_in)
    : s(s_in) {
    cout << "Mole ctor: "
         << s << endl;
  }
  
  Mole(const Mole &other)
    : s(other.s) {
    cout << "Mole copy ctor: "
         << s << endl;
  }
  
  Mole &operator=(const Mole &rhs) {
    cout << "Mole assignment op: "
         << "assign " << rhs.s << " to " << s << endl;
    s = rhs.s;
    return *this;
  }

  ~Mole() {
    cout << "Mole dtor: "
         << s << endl;
  }

private:
  int s;
};

Mole * func() {
  Mole m(12);
  return &m;
}

Mole & func2(Mole m, Mole &mr) {
  Mole m3(mr);
  return m3;
}

Mole func3() {
  Mole m(99);
  return m;
}

int main() {
  Mole m(3);
  Mole *mPtr;
  cout << "Line 1" << endl; // Line 1
  mPtr = func();
  mPtr = mPtr;
  cout << "Line 2" <<  endl; // Line 2
  if (3 < 5) {
    Mole m_if(4);
  }
  cout << "Line 3" << endl; // Line 3
  func();
  cout << "Line 4" << endl; // Line 4
  Mole m6(22);
  m6 = m;
  Mole &m4 = func2(m, m6);
  Mole m5(88);
  m5 = func3();
  Mole m8(func3());
  Mole m9 = func3();
  cout << "end of main" << endl;
}
`,
  [
      new NoErrorsNoWarningsVerifier(),
      new NoBadRuntimeEventsVerifier(true),
      new OutputVerifier(`Mole ctor: 3
Line 1
Mole ctor: 12
Mole dtor: 12
Line 2
Mole ctor: 4
Mole dtor: 4
Line 3
Mole ctor: 12
Mole dtor: 12
Line 4
Mole ctor: 22
Mole assignment op: assign 3 to 22
Mole copy ctor: 3
Mole copy ctor: 3
Mole dtor: 3
Mole dtor: 3
Mole ctor: 88
Mole ctor: 99
Mole copy ctor: 99
Mole dtor: 99
Mole assignment op: assign 99 to 88
Mole dtor: 99
Mole ctor: 99
Mole copy ctor: 99
Mole dtor: 99
Mole copy ctor: 99
Mole dtor: 99
Mole ctor: 99
Mole copy ctor: 99
Mole dtor: 99
Mole copy ctor: 99
Mole dtor: 99
end of main
Mole dtor: 99
Mole dtor: 99
Mole dtor: 99
Mole dtor: 3
Mole dtor: 3
`)
  ]
  );



    // ---------- Constructor Declaration Test ----------
    
    new SingleTranslationUnitTest(
      "Constructor Declaration Test",
`class A {
public:
  A();
  A(int);
  A A(int, double);
  B(int);
  int A(int, double);
  void A();
  B(int);
  A();
};

int main() {
  
}`,
      [
          new NoteVerifier([
            {line: 5, id: "declaration.ctor.return_type_prohibited"},
            {line: 6, id: "declaration.missing_type_specifier"},
            {line: 7, id: "declaration.ctor.return_type_prohibited"},
            {line: 8, id: "declaration.ctor.return_type_prohibited"},
            {line: 8, id: "declaration.ctor.previous_declaration"},
            {line: 9, id: "declaration.missing_type_specifier"},
            {line: 10, id: "declaration.ctor.previous_declaration"},
          ])
      ]
    );

        // ---------- Basic Default Ctor Test ----------
    
new SingleTranslationUnitTest(
"Basic Default Constructor Test",
`class A {
  private:
    int a;
    int b;
  public:
    A() {};
  };
  
  int main() {
    int x = 2;
    A a;
    int y = 2;
  }`,
[
    new NoErrorsNoWarningsVerifier(),
    new NoBadRuntimeEventsVerifier(true)
]
);
    
      // ---------- Basic SimulationRunner Test ----------

      new SingleTranslationUnitTest(
        "Basic SimulationRunner Test",
        `int main() {

  int a = 3;
  double b = 4.5;
  char c = 'x';
  bool d = true;
  a = 4;
  b = 83.4;
  c = 'a';
  d = false;
  int f = 5;
  int g = 10;
  assert(f + g * 2 == 25);
  assert((f + g) * 2 == 30);
  assert((f) + (((g)) + 2) * (2 == 25) == 5);
}`,
        [
            new BasicSynchronousRunnerTest()
        ]
    );
    
      // ---------- Basic Virtual Function Test ----------

      new SingleTranslationUnitTest(
        "Basic Virtual Function Test",
        `#include <iostream>
using namespace std;

class Fruit {
public: 
  int f1() { return 1; }
  virtual int f2() { return 2; } 
};  
  
class Citrus : public Fruit {  
public:  
  int f1() { return 3; } 
  int f2() override { return 4; }
}; 

class Lemon : public Citrus {
public:
  int f1() { return 5; }
  int f2() override { return 6; }
};

int main() { 
  Fruit fruit;
  Citrus citrus;
  Lemon lemon;  
  Fruit *fPtr = &lemon;
  Citrus *cPtr = &citrus; 

  int result = 0;
  cout << fruit.f2() << endl;
  cout << citrus.f1() << endl;
  cout << fPtr->f1() << endl;
  cout << fPtr->f2() << endl;
  cout << cPtr->f2() << endl;
  cPtr = &lemon;
  cout << cPtr->f1() << endl;
  cout << cPtr->f2() << endl;
}`,
        [
            new NoErrorsNoWarningsVerifier(),
            new NoBadRuntimeEventsVerifier(true),
            new OutputVerifier(`2
3
1
6
4
3
6
`)
        ]
    );
    

        createCinTests();
        createObjectLifetimeTests();
        createDynamicMemoryTests();

    // string test
    
        new SingleTranslationUnitTest(
            "Basic String Test",
            `#include <iostream>
    #include <string>
    using namespace std;
    
    int main() {
      string s1;
      char cstr[10] = "hello";
      for(int i = 0; i < 10-1; ++i) {
        cstr[i] = 'x';
      }
      string s2(cstr);
      cout << "hello" << endl;
    }`,
            [
                new NoErrorsNoWarningsVerifier(),
                new NoBadRuntimeEventsVerifier(true)
            ]
        );

        

// Basic Compound Assignment---------------------

    new SingleTranslationUnitTest(
      "Basic Compound Assignment Test",
      `#include <iostream>
using namespace std;

int main() {
  
  int x = 132;
  x += 1;
  x /= 2;
  x *= 3;
  x += 4;
  x %= 5;
  x >>= 6;
  x <<= 7;
  x &= 8;
  x ^= 9;
  x |= 10;
  
  int y = 2;
  y = y + 1;
  y = y / 2;
  y = y * 3;
  y = y + 4;
  y = y % 5;
  y = y >> 6;
  y = y << 7;
  y = y & 8;
  y = y ^ 9;
  y = y | 10;
  
  assert(x == y);
  
  cout << x << endl;
}`,
      [
          new NoErrorsNoWarningsVerifier(),
          new NoBadRuntimeEventsVerifier(true)
      ]
  );



// Basic Array Aggregate Initialization---------------------

new SingleTranslationUnitTest(
  "Basic Array Aggregate Initialization Test",
  `using namespace std;

int func(int x) {
  return x -1;
}

int main() {


  int i = 0, arr[5] = {42, arr[i++], arr[i++], arr[i++], arr[i++]};
  while (i >= 0) {
    assert(arr[i--] == 42);
  }
  int arr2[5] = {arr[1] + arr[2], arr[3] / 3};
  assert(arr2[0] == *arr2 && arr2[0] == 84);
  assert(arr2[1] == 14);
  assert(arr2[2] == 0);
  assert(arr2[3] == 0);
  assert(arr2[4] == 0);
  int arr3[5] = {func(arr[4])};
  assert(arr3[0] == 41);
  assert(arr3[1] == 0);
  assert(arr3[2] == 0);
  assert(arr3[3] == 0);
  assert(arr3[4] == 0);
}`,
  [
      new NoErrorsNoWarningsVerifier(),
      new NoBadRuntimeEventsVerifier(true)
  ]
);







});



/**
 * Complicated class declarations and stuff
class A;
class * B;
class C * D;
class {} * E;
class {} F;
class G H;
extern class G2 H2;
class I {} J;
class K {} & L = K();
const class M {} & N = M();
const class O & P = O();

int main() {

}
 */