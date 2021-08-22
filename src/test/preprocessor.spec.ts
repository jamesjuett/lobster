import 'mocha';
import { expect } from 'chai';
import { Program, SourceFile } from '../js/core/Program';
import "../js/lib/standard"

describe('#include', () => {

  it('includes user files', () => {
    let p1 = new Program([
      new SourceFile("test.cpp",
`#include "test.h"
int main() {
  x + 2;
}`
      ),
      new SourceFile("test.h",
`int x = 3;`
      ),
    ], new Set<string>(["test.cpp"]));

    expect(p1.notes.hasSyntaxErrors).is.false;
    expect(p1.notes.hasErrors).is.false;
    expect(p1.notes.hasWarnings).is.false;
  });

  it('includes libraries', () => {
    let p1 = new Program([
      new SourceFile("test.cpp",
`#include <iostream>
using namespace std;
int main() {
  cout << "hello world!" << endl;
}`
      )
    ], new Set<string>(["test.cpp"]));

    expect(p1.notes.hasSyntaxErrors).is.false;
    expect(p1.notes.hasErrors).is.false;
    expect(p1.notes.hasWarnings).is.false;
  });

  it('adds syntax errors to included files', () => {
    let p1 = new Program([
      new SourceFile("test.cpp",
`#include "test.h"
int main() {
  x + 2;
}`
      ),
      new SourceFile("test.h",
`int x = 3;
int y = 4+;`
      ),
    ], new Set<string>(["test.cpp"]));

    expect(p1.notes.hasErrors).is.true;
    let ref = p1.notes.allNotes[0].primarySourceReference;
    expect(ref?.sourceFile.name).to.equal("test.h");
  });

});