import 'mocha';
import { expect } from 'chai';
import { Program, SourceFile } from '../js/core/Program';
import { areSemanticallyEquivalent } from '../js/core/constructs';

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

});