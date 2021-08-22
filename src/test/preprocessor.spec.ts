import 'mocha';
import { expect } from 'chai';
import { Program, SourceFile, SourceReference } from '../js/core/Program';
import "../js/lib/standard"
import { assert } from '../js/util/util';

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

  it('syntax error in included file', () => {
    let test_cpp = new SourceFile("test.cpp",
`#include "test.h"
int main() {
  x + 2;
}`
    );
    let test_h = new SourceFile("test.h",
`int x = 3;
int y = 4+;`
    );

    let p1 = new Program([test_cpp, test_h], new Set<string>(["test.cpp"]));

    expect(p1.notes.hasErrors).is.true;
    expectEquivalentSourceReferences(
      p1.notes.allNotes[0].primarySourceReference,
      new SourceReference(test_h, 2, 11, 21, 22)
    );
  });

  it('syntax error before #include', () => {
    let test_cpp = new SourceFile("test.cpp",
`int z +;
#include "test.h"
int main() {
  x + 2;
}`
    );
    let test_h = new SourceFile("test.h",
`int x = 3;
int y = 4;`
    );

    let p1 = new Program([test_cpp, test_h], new Set<string>(["test.cpp"]));

    expect(p1.notes.hasErrors).is.true;
    expectEquivalentSourceReferences(
      p1.notes.allNotes[0].primarySourceReference,
      new SourceReference(test_cpp, 1, 7, 6, 7)
    );
  });

  it('syntax error before #include', () => {
    let test_cpp = new SourceFile("test.cpp",
`#include "test.h"
int z +;
int main() {
  x + 2;
}`
    );
    let test_h = new SourceFile("test.h",
`int x = 3;
int y = 4;`
    );

    let p1 = new Program([test_cpp, test_h], new Set<string>(["test.cpp"]));

    expect(p1.notes.hasErrors).is.true;
    expectEquivalentSourceReferences(
      p1.notes.allNotes[0].primarySourceReference,
      new SourceReference(test_cpp, 2, 7, 24, 25)
    );
  });

  it('syntax error between #includes', () => {
    let test_cpp = new SourceFile("test.cpp",
`#include "test.h"
int z +;
#include "test2.h"
int main() {
  x + 2;
}`
    );
    let test_h = new SourceFile("test.h",
`int x = 3;
int y = 4;`
    );
    let test_h2 = new SourceFile("test2.h",
`// test2.h
int abc1 = 3;
int abc2 = 3;
int abc3 = 3;`
    );

    let p1 = new Program([test_cpp, test_h, test_h2], new Set<string>(["test.cpp"]));

    expect(p1.notes.hasErrors).is.true;
    console.log("whee" + p1.notes.allNotes[0].primarySourceReference!.line);
    expectEquivalentSourceReferences(
      p1.notes.allNotes[0].primarySourceReference,
      new SourceReference(test_cpp, 2, 7, 24, 25)
    );
  });

  it('syntax error after nested #includes', () => {
    let test_cpp = new SourceFile("test.cpp",
`#include "test.h"
int z +;
int main() {
  x + 2;
}`
    );
    let test_h = new SourceFile("test.h",
`#include "test2.h"
int x = 3;
int y = 4;`
    );
    let test_h2 = new SourceFile("test2.h",
`// test2.h
int abc1 = 3;
int abc2 = 3;
int abc3 = 3;`
    );

    let p1 = new Program([test_cpp, test_h, test_h2], new Set<string>(["test.cpp"]));

    expect(p1.notes.hasErrors).is.true;
    console.log("whee" + p1.notes.allNotes[0].primarySourceReference!.line);
    expectEquivalentSourceReferences(
      p1.notes.allNotes[0].primarySourceReference,
      new SourceReference(test_cpp, 2, 7, 24, 25)
    );
  });

});

function expectEquivalentSourceReferences(ref1: SourceReference | undefined, ref2: SourceReference | undefined) {
  expect(ref1).to.exist; assert(ref1);
  expect(ref2).to.exist; assert(ref2);
  expect(ref1.sourceFile).to.equal(ref2.sourceFile);
  expect(ref1.line).to.equal(ref2.line);
  expect(ref1.column).to.equal(ref2.column);
  expect(ref1.start).to.equal(ref2.start);
  expect(ref1.end).to.equal(ref2.end);
}