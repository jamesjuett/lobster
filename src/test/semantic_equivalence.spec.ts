import 'mocha';
import { expect } from 'chai';
import { Program, SourceFile } from '../js/core/compilation/Program';
import { areSemanticallyEquivalent } from '../js/core/compilation/contexts';

describe('mk2html() function', () => {

  // it('treats implicit conversion of pointers to bool as equivalent to ptr != 0', () => {
  //   let p1 = new Program([
  //       new SourceFile("test.cpp", "int main() { int *ptr; if (ptr != 0) {*ptr;} }")
  //   ], new Set<string>(["test.cpp"]));
    
  //   let p2 = new Program([
  //       new SourceFile("test.cpp", "int main() { int *ptr; if (ptr) {*ptr;} }")
  //   ], new Set<string>(["test.cpp"]));

  //   expect(areSemanticallyEquivalent(
  //       p1.mainFunction!,
  //       p2.mainFunction!,
  //       {}
  //   )).is.true;
  // });

  

  it('considers chunks', () => {
    let p1 = new Program([
        new SourceFile("test.cpp", "int main() { int x = 1; 2 + 3; }")
    ], new Set<string>(["test.cpp"]));
    
    let p2 = new Program([
        new SourceFile("test.cpp", "int main() { 2 + 3; int x = 1; }")
    ], new Set<string>(["test.cpp"]));

    expect(areSemanticallyEquivalent(
        p1.mainFunction!,
        p2.mainFunction!,
        {}
    )).is.true;
  });

  it('differentiates numeric literals in return statements', () => {
    let p1 = new Program([
        new SourceFile("test.cpp", "int main() { return 0; }")
    ], new Set<string>(["test.cpp"]));
    
    let p2 = new Program([
        new SourceFile("test.cpp", "int main() { return 1; }")
    ], new Set<string>(["test.cpp"]));

    expect(!areSemanticallyEquivalent(
        p1.mainFunction!,
        p2.mainFunction!,
        {}
    )).is.true;
  });

  it('works for indexing', () => {
    let p1 = new Program([
        new SourceFile("test.cpp", "int main() { int arr[3]; int x; return arr[x]; }")
    ], new Set<string>(["test.cpp"]));
    
    let p2 = new Program([
        new SourceFile("test.cpp", "int main() { int arr[3]; int x; return arr[x]; }")
    ], new Set<string>(["test.cpp"]));

    expect(areSemanticallyEquivalent(
        p1.mainFunction!,
        p2.mainFunction!,
        {}
    )).is.true;
  });

  it('treats prefix/postfix ++/-- full expressions as equivalent', () => {
    let p1 = new Program([
        new SourceFile("test.cpp", `
            int main() {
                for(int i = 0; i < 10; ++i ) { ++i; }
                for(int i = 0; i < 10; --i ) { --i; }
            }`)
    ], new Set<string>(["test.cpp"]));
    
    let p2 = new Program([
        new SourceFile("test.cpp", `
            int main() {
                for(int i = 0; i < 10; i++ ) { i++; }
                for(int i = 0; i < 10; i-- ) { i--; }
            }`)
    ], new Set<string>(["test.cpp"]));

    expect(areSemanticallyEquivalent(
        p1.mainFunction!,
        p2.mainFunction!,
        {}
    )).is.true;
  });

  it('differentiates prefix/posftix ++/-- subexpressions', () => {
    let p1 = new Program([
        new SourceFile("test.cpp", `
            int main() {
                int x = 0;
                int y = ++x;
            }`)
    ], new Set<string>(["test.cpp"]));
    
    let p2 = new Program([
        new SourceFile("test.cpp", `
            int main() {
                int x = 0;
                int y = x++;
            }`)
    ], new Set<string>(["test.cpp"]));

    let p3 = new Program([
        new SourceFile("test.cpp", `
            int main() {
                int x = 0;
                int y = --x;
            }`)
    ], new Set<string>(["test.cpp"]));
    
    let p4 = new Program([
        new SourceFile("test.cpp", `
            int main() {
                int x = 0;
                int y = x--;
            }`)
    ], new Set<string>(["test.cpp"]));

    expect(areSemanticallyEquivalent(
        p1.mainFunction!,
        p2.mainFunction!,
        {}
    )).is.false;

    expect(areSemanticallyEquivalent(
        p3.mainFunction!,
        p4.mainFunction!,
        {}
    )).is.false;
  });

  it('treats relational operators as commutative', () => {
    let p1 = new Program([
        new SourceFile("test.cpp", `
            #include <iostream>
            #include <string>
            #include <vector>
            using namespace std;

            int main() {
            vector<double> input = {3., 5., 2., 3.};
            double lower = 1.;
            double upper = 4.;
            for (size_t i = 0; i < input.size(); ++i){
                if (input[i] < lower || input[i] > upper){
                return false;
                }
            }
            return true;

            }`)
    ], new Set<string>(["test.cpp"]));
    
    let p2 = new Program([
        new SourceFile("test.cpp", `
            #include <iostream>
            #include <string>
            #include <vector>
            using namespace std;

            int main() {
            vector<double> input = {3., 5., 2., 3.};
            double lower = 1.;
            double upper = 4.;
            for (size_t i = 0; i < input.size(); ++i){
                if (lower > input[i]  ||  upper < input[i]){
                return false;
                }
            }
            return true;

            }`)
    ], new Set<string>(["test.cpp"]));

    expect(areSemanticallyEquivalent(
        p1.mainFunction!,
        p2.mainFunction!,
        {}
    )).is.true;
  });
});