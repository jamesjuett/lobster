# lobster

Interactive Program Visualization Tools

This repository is a **complete mess**. I'll clean it up someday. Feel free to look around.

There's a discord now: https://discord.gg/rHvsm3eCu2

# Setup

These instructions cover everything you'll need if you want to do development work for Lobster's frontend, C++ compiler/interpreter, visualization tools, analysis framework, or regression tests.

This is also the place to start if you'd like to create exercises with custom checkpoints and heuristics.

Start by cloning this repository:

```console
git clone https://github.com/jamesjuett/lobster.git
```

Ensure you have `node` and `npm` installed:

```console
sudo apt update
sudo apt install nodejs
```

Install Lobster's dependencies using `npm`:

```console
npm install
```

That's it!

I recommend using VS Code, which has built-in Typescript support, but you can use any editor you like.

# Compilation

Lobster is written in Typescript. That means you need to recompile after any changes to `.ts` files. To compile and bundle the code, use:

```console
npm run build
```

If you make any changes to `grammar.txt`, run this to regenerate the parser module (and then recompile):

```console
./node_modules/pegjs/bin/pegjs --plugin ./node_modules/ts-pegjs/src/tspegjs --allowed-start-rules start,declaration,declarator,function_definition -o src/js/parse/cpp_parser.ts other/grammar.txt
```

# Local Preview

After compiling, just open up `public/index.html`. You won't have any saved files or anything, but you can test out any changes to the compiler, visualizer, or general frontend UI here.

# Creating Embeddable Exercises

Lobster exercises can be embedded by:

1. Make sure your page includes these 3rd part libraries used by Lobster:

```html
<!-- jquery and bootstrap -->
<script
  src="https://code.jquery.com/jquery-3.5.1.min.js"
  integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0="
  crossorigin="anonymous"
></script>
<script
  src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js"
  integrity="sha384-UO2eT0CpHqdSJQ6hJty5KVphtPhzWj9WO1clHTMGa3JDZwrnQq4sF86dIHNDz0W1"
  crossorigin="anonymous"
></script>
<link
  rel="stylesheet"
  href="https://stackpath.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css"
  integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u"
  crossorigin="anonymous"
/>
<script
  src="https://stackpath.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"
  integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa"
  crossorigin="anonymous"
></script>

<!-- bootstrap icons -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.3.0/font/bootstrap-icons.css"
/>
```

2. Copy some files out of this repository and ensure they are included in your page. If you make changes or recompile, you'll need to re-copy.

- `public/css/main.css`
- `public/css/code.css`
- `public/css/frontend.css`
- `public/css/exercises.css`
- `public/js/embedded_exercises.js`

3. The `embedded_exercises.js` script will look for html elements with the `lobster-ex` class and initialize them as Lobster exercises. Here's an example that just creates a simple Lobster example with given starter code. (Note that you need to use html entites for special characters like `<`, `>`, `&`, etc. which is kind of annoying.)

<div class="lobster-ex" style="width: 800px; margin-left: auto; margin-right: auto">
    <!-- <div class="lobster-ex-project-name">ch16_ex_printDoubled</div> -->
    <div class="lobster-ex-init-code">
#include &lt;iostream&gt;
int main() {
  cout &lt;&lt; "Hello world!" &lt;&lt; endl;
}
    </div>
</div>

4. Alternatively, you may specify an exercise key to match up against starter code, checkpoints, heuristics, etc. This is probably how you'll want to handle anything but the very simplest embeds.

```html
<div class="lobster-ex" style="width: 800px; margin-left: auto; margin-right: auto">
  <div class="lobster-ex-key">ch13_03_ex</div>
</div>
```

To define exercises by key, find `EXERCISE_SPECIFICATIONS` in `src/exercises.ts`. Write typescript code to add entries for each new exercise. For example, here's one entry:

```typescript
"ch13_03_ex": {
        starterCode: `#include <iostream>
using namespace std;

int main() {

  int x = 0;

  while (x < 4) {
    cout << x << endl;
    x = x + 1;
  }

  while (x >= 0) {
    cout << x << endl;
    x = x - 1;
  }

  cout << "done!" << endl;
}`,
        completionCriteria: COMPLETION_ALL_CHECKPOINTS,
        checkpoints: [
            new StaticAnalysisCheckpoint("Use ++", (program: Program) => {
                return !!findConstructs(program, Predicates.byKinds(["prefix_increment_expression", "postfix_increment_expression"])).find(
                    construct => construct.operator === "++"
                );
            }),
            new StaticAnalysisCheckpoint("Use --", (program: Program) => {
                return !!findConstructs(program, Predicates.byKinds(["prefix_increment_expression", "postfix_increment_expression"])).find(
                    construct => construct.operator === "--"
                );
            }),
            new OutputCheckpoint("Correct Output", (output: string) => {
                return output === "0\n1\n2\n3\n4\n3\n2\n1\n0\ndone!\n";
            })
        ],
        completionMessage: 'Nice work! The secret word is "bubble".'
    },
```

# Exercise Specifications

## Completion Criteria

An exercise may specify completion criteria. Two predefined criteria are available:

- `COMPLETION_ALL_CHECKPOINTS`
- `COMPLETION_LAST_CHECKPOINT`

You can also provide a custom predicate that takes an `Exercise` as an argument and returns true/false.

## Checkpoints

An exercise specification may includes a list of checkpoints. There are several different kinds of checkpoints. Here are a few characteristic examples:

A checkpoint for compiling without errors:

```typescript
new IsCompiledCheckpoint("Compiles"),
```

Checkpoints based on static analysis of a student's program:

```typescript
new StaticAnalysisCheckpoint("Use ++", (program: Program) => {
    return !!findConstructs(program, Predicates.byKinds(["prefix_increment_expression", "postfix_increment_expression"])).find(
        construct => construct.operator === "++"
    );
}),
```

Checkpoints to run the program and check its output to `cout`:

```typescript
new OutputCheckpoint('Correct Output', (output: string) => {
  // Output must match exactly, including whitespace
  return output === '0\n1\n2\n3\n4\n3\n2\n1\n0\ndone!\n';
});
```

```typescript
new OutputCheckpoint('Output Correct Result', (output: string) => {
  // 2623.4 may appear in larger string
  return output.indexOf('2623.4') !== -1;
});
```

A checkpoint to check the program state (e.g. values of variables) at the end of the `main()` function

```typescript
// Verifies that the array variable arr contains the values [16, 25, 4]
new EndOfMainStateCheckpoint('arr modified to {16, 25, 4}', (sim: Simulation) => {
  let main = sim.program.mainFunction;
  let arrEntity = main.context.functionLocals.localObjects.find(local => local.name === 'arr');

  if (!arrEntity) {
    return false;
  }

  let mainFrame = sim.memory.stack.topFrame()!;
  let arr = mainFrame.localObjectLookup(arrEntity);
  if (!arr.isTyped(isBoundedArrayOfType(isType(Int)))) {
    return false;
  }
  let elts = arr.rawValue();
  return isEqual(elts, [16, 25, 4]);
});
```

# Helpful Links

An easy-to-navigate copy of the C++ language standard  
https://timsong-cpp.github.io/cppwp
