"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXERCISE_SPECIFICATIONS = exports.makeExerciseSpecification = exports.getExerciseSpecification = exports.DEFAULT_EXERCISE = void 0;
const lodash_1 = require("lodash");
const errors_1 = require("./core/errors");
const predicates_1 = require("./core/predicates");
const Project_1 = require("./core/Project");
const types_1 = require("./core/types");
const analysis_1 = require("./analysis/analysis");
const loops_1 = require("./analysis/loops");
const checkpoints_1 = require("./analysis/checkpoints");
exports.DEFAULT_EXERCISE = {
    starterCode: "",
    checkpoints: [],
    completionCriteria: Project_1.COMPLETION_LAST_CHECKPOINT,
    completionMessage: "Nice work! Exercise complete!"
};
function getExerciseSpecification(exercise_key) {
    let spec = exports.EXERCISE_SPECIFICATIONS[exercise_key];
    return spec && makeExerciseSpecification(spec);
}
exports.getExerciseSpecification = getExerciseSpecification;
function makeExerciseSpecification(spec) {
    return Object.assign({}, exports.DEFAULT_EXERCISE, spec);
}
exports.makeExerciseSpecification = makeExerciseSpecification;
exports.EXERCISE_SPECIFICATIONS = {
    "test_exercise_1": {
        checkpoints: [
            new checkpoints_1.StaticAnalysisCheckpoint("Declare x", (program) => {
                return !!analysis_1.findFirstConstruct(program, predicates_1.Predicates.byVariableName("x"));
            }),
            new checkpoints_1.StaticAnalysisCheckpoint("Use a for loop", (program) => {
                return !!analysis_1.findFirstConstruct(program, predicates_1.Predicates.byKind("for_statement"));
            }),
            new checkpoints_1.OutputCheckpoint("Print \"Hello World!\"", checkpoints_1.outputComparator("Hello World!", true))
        ]
    },
    "test_exercise_2": {
        checkpoints: [
            new checkpoints_1.StaticAnalysisCheckpoint("Declare z", (program) => {
                return !!analysis_1.findFirstConstruct(program, predicates_1.Predicates.byVariableName("z"));
            })
        ]
    },
    "ch12_01_ex": {
        starterCode: `#include <iostream>
using namespace std;

int main() {
  cout << "Hello World!" << endl;
  
  int x = 10 + 5;

  // Compute y and z for a final result of z = 120

  cout << "The result is " << z << "!" << endl;
}`,
        checkpoints: [
            new checkpoints_1.StaticAnalysisCheckpoint("Compute y", (program) => {
                return !!analysis_1.findFirstConstruct(program, predicates_1.Predicates.byVariableName("y"));
            }),
            new checkpoints_1.StaticAnalysisCheckpoint("Compute z", (program) => {
                return !!analysis_1.findFirstConstruct(program, predicates_1.Predicates.byVariableName("z"));
            }),
            new checkpoints_1.OutputCheckpoint("Correct Output", (output) => {
                return output === "Hello World!\nThe result is 120!\n";
            })
        ]
    },
    "ch12_02_ex": {
        starterCode: `#include <iostream>
using namespace std;

int main() {

  int int_1 = 7;
  double double_1 = 3.5;

  int int_2 = double_1;
  double double_2 = int_1;
  
  int x = false;
  double y = true;

  bool b1 = 1;
  bool b2 = 0;
  bool b3 = 3.14;
  bool b4 = -1;
}`
    },
    "ch12_04_ex": {
        starterCode: `#include <iostream>
using namespace std;

int main() {
  int i1 = 3;
  int i2 = 4;
  
  double d1 = 3.0;
  double d2 = 4.0;
  
  cout << i1 / i2 << endl;
  
  cout << d1 / d2 << endl;
  
  cout << i1 / d2 << endl;
  
  cout << d1 / i2 << endl;
  
}`
    },
    "ch12_04_ex_stopwatch": {
        starterCode: `#include <iostream>
using namespace std;

int main() {
  int x = 3753; // total seconds
  
  
  // TODO: convert to hours, minutes, and seconds!
  // For example, 3753 seconds is: 1 hour, 2 minutes, 33 seconds.
  
  // When you're finished, uncomment these lines to print your info
  //cout << "Hours: " << h << endl;
  //cout << "Minutes: " << m << endl;
  //cout << "Seconds: " << s << endl;
}`,
        checkpoints: [
            new checkpoints_1.StaticAnalysisCheckpoint("Compute h", (program) => {
                return !!analysis_1.findFirstConstruct(program, predicates_1.Predicates.byVariableName("h"));
            }),
            new checkpoints_1.StaticAnalysisCheckpoint("Compute m", (program) => {
                return !!analysis_1.findFirstConstruct(program, predicates_1.Predicates.byVariableName("m"));
            }),
            new checkpoints_1.StaticAnalysisCheckpoint("Compute s", (program) => {
                return !!analysis_1.findFirstConstruct(program, predicates_1.Predicates.byVariableName("s"));
            }),
            new checkpoints_1.OutputCheckpoint("Correct Output", (output) => {
                return output === "Hours: 1\nMinutes: 2\nSeconds: 33\n";
            })
        ]
    },
    "ch12_05_ex": {
        starterCode: `#include <iostream>
using namespace std;

int main() {
  int a = 3;
  int b = 4;
  double c = 3.5;
  double d = 4.3;
  bool e = true;
  
  cout << "test1: " << (a < b) << endl;
  
  cout << "test2: " << (c + 0.5 < d) << endl;
  
  cout << "test3: " << (a > 8 && 2 * a + 8 * b + 7 < 42) << endl;
  
  cout << "test4: " << (a < 1 || c < 10) << endl;
  
  cout << "test5: " << (e || 7 / 2 == 3) << endl;
}`
    },
    "ch13_02_ex": {
        starterCode: `#include <iostream>
using namespace std;

int main() {

// TODO: Put your code here!


cout << "done!" << endl;
}`,
        checkpoints: [
            new checkpoints_1.IsCompiledCheckpoint("Compiles"),
            new checkpoints_1.StaticAnalysisCheckpoint("Start at 9", (program) => {
                return !!analysis_1.findFirstConstruct(program, predicates_1.Predicates.byVariableInitialValue(9));
            }),
            new checkpoints_1.StaticAnalysisCheckpoint("While Loop", (program) => {
                return !!analysis_1.findFirstConstruct(program, predicates_1.Predicates.byKind("while_statement"));
            }),
            new checkpoints_1.StaticAnalysisCheckpoint("Condition", (program) => {
                let loopVar = analysis_1.findFirstConstruct(program, predicates_1.Predicates.byVariableInitialValue(9));
                let loop = analysis_1.findFirstConstruct(program, predicates_1.Predicates.byKind("while_statement"));
                if (!loopVar || !loop) {
                    return false;
                }
                // verify loop condition contains the right variable
                if (!analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byIdentifierName(loopVar.name))) {
                    return false;
                }
                // verify loop condition contains a number
                if (!analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKind("numeric_literal_expression"))) {
                    return false;
                }
                // verify loop condition contains a relational operator
                if (!analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKind("relational_binary_operator_expression"))) {
                    return false;
                }
                return true;
            }),
            new checkpoints_1.StaticAnalysisCheckpoint("Update Expression", (program) => {
                let loopVar = analysis_1.findFirstConstruct(program, predicates_1.Predicates.byVariableInitialValue(9));
                let loop = analysis_1.findFirstConstruct(program, predicates_1.Predicates.byKind("while_statement"));
                if (!loopVar || !loop) {
                    return false;
                }
                // verify loop body contains an update for the var
                return !!analysis_1.findFirstConstruct(loop.body, predicates_1.Predicates.byVariableUpdate(loopVar.name));
            }),
            new checkpoints_1.OutputCheckpoint("Correct Output", (output) => {
                return output === "9 7 5 3 1 done!\n";
            })
        ]
    },
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
        completionCriteria: Project_1.COMPLETION_ALL_CHECKPOINTS,
        checkpoints: [
            new checkpoints_1.StaticAnalysisCheckpoint("Use ++", (program) => {
                return !!analysis_1.findConstructs(program, predicates_1.Predicates.byKinds(["prefix_increment_expression", "postfix_increment_expression"])).find(construct => construct.operator === "++");
            }),
            new checkpoints_1.StaticAnalysisCheckpoint("Use --", (program) => {
                return !!analysis_1.findConstructs(program, predicates_1.Predicates.byKinds(["prefix_increment_expression", "postfix_increment_expression"])).find(construct => construct.operator === "--");
            }),
            new checkpoints_1.OutputCheckpoint("Correct Output", (output) => {
                return output === "0\n1\n2\n3\n4\n3\n2\n1\n0\ndone!\n";
            })
        ]
    },
    "ch13_04_ex": {
        starterCode: `#include <iostream>
using namespace std;

int main() {
  int N = 6;

  int val = 1;
  int x = 0;
  while (x < N) {
    cout << val << " ";
    
    val = val * 2; // Update val by doubling it
    ++x;
  }
  cout << "done!" << endl;
}`,
        completionCriteria: Project_1.COMPLETION_ALL_CHECKPOINTS,
        checkpoints: [
            new checkpoints_1.StaticAnalysisCheckpoint("for Loop Syntax", (program) => {
                return !!analysis_1.findFirstConstruct(program, predicates_1.Predicates.byKind("for_statement"));
            }),
            new checkpoints_1.OutputCheckpoint("Correct Output", (output) => {
                return output === "1 2 4 8 16 32 done!\n";
            })
        ]
    },
    "ch13_05_ex": {
        starterCode: `#include <iostream>
using namespace std;

int main() {
    int N = 5;
  
    // YOUR CODE HERE
  
  
  
  
  
  
  
  }`,
        checkpoints: [
            new checkpoints_1.StaticAnalysisCheckpoint("Nested Loops", (program) => {
                let outerLoop = analysis_1.findFirstConstruct(program, predicates_1.Predicates.byKinds(["for_statement", "while_statement"]));
                return !!outerLoop && !!analysis_1.findFirstConstruct(outerLoop.body, predicates_1.Predicates.byKinds(["for_statement", "while_statement"]));
            }),
            new checkpoints_1.OutputCheckpoint("Correct Output", (output) => {
                return output === "X\nXX\nXXX\nXXXX\nXXXXX\n";
            })
        ]
    },
    "ch13_06_ex": {
        starterCode: `#include <iostream>
using namespace std;

int main() {
  int N = 5;
  int a = 2;
  int b = 3;
  int x = 1; // HINT: Use x to search through numbers
  while(      ) { // HINT: Keep going until you find enough

    if(                       ) { // Check divisibility
      cout << x << " ";
      // HINT: In addition to printing x, update the count
      //       of how many you've found here.
    }

    ++x;
  }
  cout << "done!" << endl;
}`,
        checkpoints: [
            new checkpoints_1.OutputCheckpoint("Correct Output", (output) => {
                return output === "1 5 7 11 13 done!\n";
            })
        ]
    },
    "ch13_06_ex_2": {
        starterCode: `#include <iostream>
using namespace std;

int main() {
  int N = 5;
  int x = 1;
  // Outer loop: iterate through candidate x values
  while(N > 0) {
    int anyDivisible = false;
    // Inner loop: check y values to make sure none divide x
    for (int y = 2; y < x; ++y) {
      if( x % y == 0 ) { // Check divisibility
        anyDivisible = true;
      }
    }
    if( !anyDivisible ) { // were any divisible?
      cout << x << " ";
      --N;
    }
    ++x;
  }
  cout << "done!" << endl;
}`,
        checkpoints: [
        // no checkpoints, just an example not an exercise
        ]
    },
    "ch14_02_ex": {
        starterCode: `#include <iostream>
        using namespace std;
        
        // Returns true if n is prime, false otherwise
        // Works for any number n
        bool isPrime(int n) {
          for(int x = 2; x < n; ++x) {
            if (n % x == 0) {
              return false;
            }
          }
          return true;
        }
        
        int main() {
          int N = 5;
          int x = 2;
          // Iterate through candidate x values
          while(N > 0) {
            if( isPrime(x) ) { // Check primeness
              cout << x << " ";
              --N;
            }
            ++x;
          }
          cout << "done!" << endl;
        }`
    },
    "ch14_03_ex": {
        starterCode: `#include <iostream>
using namespace std;

void print_row_of_X(int num) {
  for (int x = 0; x < num; ++x) {
    cout << "X";
  }
  cout << endl;
}
  
void print_triangle_X3() {
  
  // YOUR CODE HERE!
  
}

int main() {
  print_triangle_X3();
}`,
        checkpoints: [
            new checkpoints_1.OutputCheckpoint("Correct Output", (output) => {
                return checkpoints_1.removeWhitespace(output) === checkpoints_1.removeWhitespace("X\nXX\nXXX\nXX\nX\n");
            })
        ]
    },
    "ch14_04_ex": {
        starterCode: `#include <iostream>
using namespace std;

const double PI = 3.14159;

double circleArea(double rad) {
  return PI * rad * rad;
}

double circleCircumference(double rad) {
  return 2 * PI * rad;
}

int main() {
  double rad = 5;
  cout << "Area: " << circleArea(rad) << endl;
  cout << "Circumference: " << circleCircumference(rad) << endl;
}`
    },
    "ch15_ex_echo": {
        starterCode: `#include <iostream>
#include <string>
using namespace std;
// A very annoying program: It echoes until you say stop
int main() {
  
  // Use to hold input
  string word;

  // TODO: read a word and print it back out
  // continuously until the user enters "STOP"


  // Print at the end (don't remove this)
  cout << "Ok fine I'll stop :(" << endl;
}`,
        checkpoints: [
            new checkpoints_1.OutputCheckpoint("Correct Output", (output) => {
                return output.indexOf("Hi") !== -1
                    && output.indexOf("How") !== -1
                    && output.indexOf("are") !== -1
                    && output.indexOf("you") !== -1
                    && output.indexOf("Stop") !== -1
                    && output.indexOf("Ok fine I'll stop :(") !== -1;
            }, "Hi\nHow are you\nStop\nSTOP\n")
        ]
    },
    "ch15_ex_repeat": {
        starterCode: `#include <iostream>
#include <string>
using namespace std;

string repeat(string s, int n) {


  // TODO: write your code here


}

int main() {
  // DO NOT CHANGE ANY OF THE CODE IN MAIN
  // IT IS USED BY LOBSTER TO CHECK YOUR WORK
  string s = "ab";
  string s2 = repeat(s, 4);
  cout << s2 << endl; // "ababababab"

  cout << repeat("echo ", 2) << endl; // "echo echo "
}`,
        checkpoints: [
            new checkpoints_1.OutputCheckpoint("Correct Output", (output) => {
                return output.indexOf("abababab") !== -1
                    && output.indexOf("echo echo ") !== -1;
            })
        ]
    },
    "ch16_ex_printDoubled": {
        starterCode: `#include <iostream>
#include <vector>
using namespace std;

// prints out double the contents of a vector of ints
void printDoubled(vector<int> vec) {
  cout << "{ ";
  // TODO: add code to traverse the vector and print 2 times each value

  cout << "}" << endl;
}

int main() {
  // DO NOT CHANGE ANY OF THE CODE IN MAIN
  // IT IS USED BY LOBSTER TO CHECK YOUR WORK
  vector<int> someInts(4,42);
  someInts.at(2) = 5; 
  printDoubled(someInts); // prints { 84 84 10 84 }
}`,
        checkpoints: [
            new checkpoints_1.StaticAnalysisCheckpoint("Start at 0", (program) => {
                return !!analysis_1.findFirstConstruct(program, predicates_1.Predicates.byVariableInitialValue(0));
            }),
            new checkpoints_1.StaticAnalysisCheckpoint("Check against size", (program, project) => {
                let loop = analysis_1.findFirstConstruct(program, predicates_1.Predicates.byKinds(["while_statement", "for_statement"]));
                if (!loop) {
                    return false;
                }
                // verify loop condition does NOT contain a number
                let hardcodedLimit = analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKind("numeric_literal_expression"));
                if (hardcodedLimit) {
                    project.addNote(new errors_1.CompilerNote(loop.condition, errors_1.NoteKind.STYLE, "hardcoded_vector_size", `Uh oh! It looks like you've got a hardcoded number ${hardcodedLimit.value.rawValue} for the loop size. This might work for the test case in main, but what if the function was called on a different vector?`));
                    return false;
                }
                // verify loop condition contains a relational operator
                if (!analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKind("relational_binary_operator_expression"))) {
                    return false;
                }
                // if loop condition does not contain a call to vector.size() return false
                if (!analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byFunctionCallName("size"))) {
                    return false;
                }
                // tricky - don't look for subscript expressions, since with a vector it's actually
                // an overloaded [] and we need to look for that as a function call
                let indexingOperations = analysis_1.findConstructs(loop.body, predicates_1.Predicates.byOperatorOverloadCall("[]"));
                // loop condition contains size (from before), but also has <= or >=
                // and no arithmetic operators or pre/post increments that could make up for the equal to part
                // (e.g. i <= v.size() is very much wrong, but i <= v.size() - 1 is ok)
                let conditionOperator = analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKind("relational_binary_operator_expression"));
                if (conditionOperator) {
                    if (!analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKinds(["arithmetic_binary_operator_expression", "prefix_increment_expression", "postfix_increment_expression"]))) {
                        if (conditionOperator.operator === "<=" || conditionOperator.operator === ">=") {
                            if (!indexingOperations.some(indexingOp => analysis_1.findFirstConstruct(indexingOp, predicates_1.Predicates.byKinds([
                                "arithmetic_binary_operator_expression",
                                "prefix_increment_expression",
                                "postfix_increment_expression"
                            ])))) {
                                project.addNote(new errors_1.CompilerNote(conditionOperator, errors_1.NoteKind.STYLE, "hardcoded_vector_size", `Double check the limit in this condition. I think there might be an off-by-one error that takes you out of bounds if you're using the ${conditionOperator.operator} operator.`));
                                return false;
                            }
                        }
                    }
                }
                return true;
            }),
            new checkpoints_1.OutputCheckpoint("Correct Output", (output) => {
                return output.indexOf("{ 84 84 10 84 }") !== -1;
            })
        ]
    },
    "ch16_ex_all_negative": {
        starterCode: `#include <iostream>
#include <vector>
using namespace std;

// Returns whether all the elements in the vector are negative
bool all_negative(const vector<int> &vec) {

  // TODO: iterate and check for any non-negative

}

int main() {
  // DO NOT CHANGE ANY OF THE CODE IN MAIN
  // IT IS USED BY LOBSTER TO CHECK YOUR WORK

  vector<int> vec1 = {0, 5, 10, 36, 8, 19, 1};
  cout << "vec1 all negative? ";
  cout << all_negative(vec1) << endl;

  vector<int> vec2 = {35, 16, -7, 0, 9, 25};
  cout << "vec2 all negative? ";
  cout << all_negative(vec2) << endl;

  vector<int> vec3 = {-4, -16, -99};
  cout << "vec3 all negative? ";
  cout << all_negative(vec3) << endl;
}`,
        checkpoints: [
            new checkpoints_1.StaticAnalysisCheckpoint("Start at 0", (program) => {
                return !!analysis_1.findFirstConstruct(program, predicates_1.Predicates.byVariableInitialValue(0));
            }),
            new checkpoints_1.StaticAnalysisCheckpoint("Check against size", (program, project) => {
                // Find a loop, either while or for
                let loop = analysis_1.findFirstConstruct(program, predicates_1.Predicates.byKinds(["while_statement", "for_statement"]));
                if (!loop) {
                    return false;
                }
                // Give a specific hint if loop condition does contains a number
                let hardcodedLimit = analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKind("numeric_literal_expression"));
                if (hardcodedLimit) {
                    project.addNote(new errors_1.CompilerNote(loop.condition, errors_1.NoteKind.STYLE, "hardcoded_vector_size", `Uh oh! It looks like you've got a hardcoded number ${hardcodedLimit.value.rawValue} for the loop size. This might work for the test case in main, but what if the function was called on a different vector?`));
                    return false;
                }
                // verify loop condition contains a relational operator
                if (!analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKind("relational_binary_operator_expression"))) {
                    return false;
                }
                // if loop condition does not contain a call to vector.size() return false
                if (!analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byFunctionCallName("size"))) {
                    return false;
                }
                // tricky - don't look for subscript expressions, since with a vector it's actually
                // an overloaded [] and we need to look for that as a function call
                let indexingOperations = analysis_1.findConstructs(loop.body, predicates_1.Predicates.byOperatorOverloadCall("[]"));
                // loop condition contains size (from before), but also has <= or >=
                // and no arithmetic operators or pre/post increments that could make up for the equal to part
                // (e.g. i <= v.size() is very much wrong, but i <= v.size() - 1 is ok)
                let conditionOperator = analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKind("relational_binary_operator_expression"));
                if (conditionOperator) {
                    if (!analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKinds(["arithmetic_binary_operator_expression", "prefix_increment_expression", "postfix_increment_expression"]))) {
                        if (conditionOperator.operator === "<=" || conditionOperator.operator === ">=") {
                            if (!indexingOperations.some(indexingOp => analysis_1.findFirstConstruct(indexingOp, predicates_1.Predicates.byKinds([
                                "arithmetic_binary_operator_expression",
                                "prefix_increment_expression",
                                "postfix_increment_expression"
                            ])))) {
                                project.addNote(new errors_1.CompilerNote(conditionOperator, errors_1.NoteKind.STYLE, "hardcoded_vector_size", `Double check the limit in this condition. I think there might be an off-by-one error that takes you out of bounds if you're using the ${conditionOperator.operator} operator.`));
                                return false;
                            }
                        }
                    }
                }
                return true;
            }),
            new checkpoints_1.OutputCheckpoint("Correct Output", (output) => {
                return checkpoints_1.removeWhitespace(output) === checkpoints_1.removeWhitespace("vec1 all negative? 0\nvec2 all negative? 0\nvec3 all negative? 1\n")
                    || checkpoints_1.removeWhitespace(output) === checkpoints_1.removeWhitespace("vec1 all negative? false\nvec2 all negative? false\nvec3 all negative? true\n");
            })
        ]
    },
    "ch17_ex_encrypt_word": {
        starterCode: `#include <iostream>
#include <string>
#include <vector>

using namespace std;

char shift_letter(char c, int offset) {
  // compute original letter "position"
  int pos = c - 'a';
  // adjust position by offset, mod 26
  pos = (pos + offset) % 26;
  // convert "position" back to letter
  return 'a' + pos;
}

string encrypt_word(const string &text, int offset) {
  
  // YOUR CODE HERE
  
}

int main() {
  string s = "hello";
  cout << encrypt_word(s, 5) << endl; // mjqqt
}`,
        checkpoints: [
            // new StaticAnalysisCheckpoint("Local copy of text parameter", (program: Program) => {
            //     let fn = findFirstConstruct(program, Predicates.byFunctionName("encrypt_word"));
            //     let textParam = fn?.parameters.find(p => p.type?.isCompleteClassType() && p.type.className === "string");
            //     let textParamName = textParam?.name;
            //     if (!fn || !textParam || !textParamName) { return false; }
            //     // find all local string variable definitions
            //     let localStrings = findConstructs(fn, Predicates.byKind("local_variable_definition")).filter(
            //         def => def.type.isCompleteClassType() && def.type.className === "string"
            //     );
            //     let stringAssignments = findConstructs(fn, Predicates.byKind("member_operator_overload_expression")).filter(
            //         assn => assn.receiverExpression.type.className === "string"
            //     );
            //     // one of those either needs to be initialized with "text" parameter or
            //     // later on assigned its value
            //     return localStrings.some(s => s.initializer && containsConstruct(s.initializer, Predicates.byIdentifierName(textParamName!))) ||
            //             stringAssignments.some(assn => containsConstruct(assn, Predicates.byVariableName(textParamName!)));
            // }),
            new checkpoints_1.StaticAnalysisCheckpoint("loop", (program) => {
                let fn = analysis_1.findFirstConstruct(program, predicates_1.Predicates.byFunctionName("encrypt_word"));
                return !!fn && analysis_1.containsConstruct(fn, predicates_1.Predicates.byKinds(["while_statement", "for_statement"]));
            }),
            new checkpoints_1.StaticAnalysisCheckpoint("Call shift_letter()", (program) => {
                let fn = analysis_1.findFirstConstruct(program, predicates_1.Predicates.byFunctionName("encrypt_word"));
                let call = fn && analysis_1.findFirstConstruct(fn, predicates_1.Predicates.byFunctionCallName("shift_letter"));
                return !!(call === null || call === void 0 ? void 0 : call.isSuccessfullyCompiled());
            }),
            new checkpoints_1.OutputCheckpoint("Correct Output", (output) => {
                return output.indexOf("mjqqt") !== -1;
            })
        ]
    },
    "ch17_ex_unit_testing": {
        starterCode: `#include <iostream>
#include <string>

using namespace std;

char shift_letter(char c, int offset) {
  // compute original letter "position"
  int pos = c - 'a';
  // adjust position by offset, mod 26
  pos = (pos + offset) % 26;
  // convert "position" back to letter
  return 'a' + pos;
}

int main() {
  string s = "hello";
  assert(shift_letter('b', 3) == 'e');
  assert(shift_letter('y', 3) == 'b');
  assert(shift_letter('e', -1) == 'd');
  
  cout << "Tests finished." << endl;
}`,
        checkpoints: [
            new checkpoints_1.StaticAnalysisCheckpoint("Add 3 more test cases (6 total)", (program) => {
                let main = analysis_1.findFirstConstruct(program, predicates_1.Predicates.byFunctionName("main"));
                if (!main) {
                    return false;
                }
                return analysis_1.findConstructs(main, predicates_1.Predicates.byKind("magic_function_call_expression")).filter(call => call.functionName === "assert").length >= 6;
            })
        ]
    },
    "ch18_ex_printRover": {
        starterCode: `#include <iostream>
#include <string>

using namespace std;

struct Rover {
  int type;
  string id;
  double charge;
};

void printRover(const Rover &rover, ostream &output) {

  // YOUR CODE HERE

}

int main() {
  Rover myRover;
  myRover.type = 1;
  myRover.id = "a238";
  myRover.charge = 0.8;

  // This should print "Type 1 Rover #a238 (80%)"
  printRover(myRover, cout);
  cout << endl; 
}`,
        checkpoints: [
            new checkpoints_1.StaticAnalysisCheckpoint("Print type", (program, project) => {
                let printRover = analysis_1.findFirstConstruct(program, predicates_1.Predicates.byFunctionName("printRover"));
                if (!printRover) {
                    return false;
                }
                // Give a specific hint if they accidentally use cout in the function
                let cout = analysis_1.findFirstConstruct(printRover, predicates_1.Predicates.byIdentifierName("cout"));
                if (cout) {
                    project.addNote(new errors_1.CompilerNote(cout, errors_1.NoteKind.STYLE, "cout_in_ostream_function", `Oops! This is a very easy mistake to make, since we're all so used to typing cout. But printRover() takes in a particular ostream parameter called 'output', and you should make sure to send your output through that stream (in case it turns out to be different from cout).`));
                    return false;
                }
                return analysis_1.findConstructs(printRover, predicates_1.Predicates.byKind("output_operator_expression")).some(operator => operator.operator === "<<" && analysis_1.containsConstruct(operator.right, predicates_1.Predicates.byMemberAccessName("type")));
            }),
            new checkpoints_1.StaticAnalysisCheckpoint("Print id", (program) => {
                let printRover = analysis_1.findFirstConstruct(program, predicates_1.Predicates.byFunctionName("printRover"));
                if (!printRover) {
                    return false;
                }
                return analysis_1.findConstructs(printRover, predicates_1.Predicates.byKind("non_member_operator_overload_expression")).some(operator => operator.operator === "<<" && analysis_1.containsConstruct(operator, predicates_1.Predicates.byMemberAccessName("id")));
            }),
            new checkpoints_1.StaticAnalysisCheckpoint("Print charge", (program) => {
                let printRover = analysis_1.findFirstConstruct(program, predicates_1.Predicates.byFunctionName("printRover"));
                if (!printRover) {
                    return false;
                }
                return analysis_1.findConstructs(printRover, predicates_1.Predicates.byKind("output_operator_expression")).some(operator => operator.operator === "<<" && analysis_1.containsConstruct(operator.right, predicates_1.Predicates.byMemberAccessName("charge")));
            }),
            new checkpoints_1.OutputCheckpoint("Correct Output (and formatting)", (output) => {
                return checkpoints_1.removeWhitespace(output) === checkpoints_1.removeWhitespace("Type 1 Rover #a238 (80%)");
            })
        ]
    },
    "ch19_ex_printVecOfInts": {
        starterCode: `#include <iostream>
#include <vector>
using namespace std;

// prints out the contents of a vector of ints 
void printVecOfInts(vector<int> vec) {
  // TODO: add code to traverse the vector and print each value
  // See the tests in main for formatting examples

}

int main() {
  // DO NOT CHANGE ANY OF THE CODE IN MAIN
  // IT IS USED BY LOBSTER TO CHECK YOUR WORK

  vector<int> someInts = {1, 2, 3, 4, 5};
  printVecOfInts(someInts); // prints { 1 2 3 4 5 }

  vector<int> moreInts = {0, -5, 94, 16};
  printVecOfInts(moreInts); // prints { 0 -5 94 16 }
}`,
        checkpoints: [
            new checkpoints_1.StaticAnalysisCheckpoint("Start at 0", (program) => {
                return !!analysis_1.findFirstConstruct(program, predicates_1.Predicates.byVariableInitialValue(0));
            }),
            new checkpoints_1.StaticAnalysisCheckpoint("Check against size", (program, project) => {
                let loop = analysis_1.findFirstConstruct(program, predicates_1.Predicates.byKinds(["while_statement", "for_statement"]));
                if (!loop) {
                    return false;
                }
                // verify loop condition does NOT contain a number
                let hardcodedLimit = analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKind("numeric_literal_expression"));
                if (hardcodedLimit) {
                    project.addNote(new errors_1.CompilerNote(loop.condition, errors_1.NoteKind.STYLE, "hardcoded_vector_size", `Uh oh! It looks like you've got a hardcoded number ${hardcodedLimit.value.rawValue} for the loop size. This might work for the test case in main, but what if the function was called on a different vector?`));
                    return false;
                }
                // verify loop condition contains a relational operator
                if (!analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKind("relational_binary_operator_expression"))) {
                    return false;
                }
                // if loop condition does not contain a call to vector.size() return false
                if (!analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byFunctionCallName("size"))) {
                    return false;
                }
                // tricky - don't look for subscript expressions, since with a vector it's actually
                // an overloaded [] and we need to look for that as a function call
                let indexingOperations = analysis_1.findConstructs(loop.body, predicates_1.Predicates.byOperatorOverloadCall("[]"));
                // loop condition contains size (from before), but also has <= or >=
                // and no arithmetic operators or pre/post increments that could make up for the equal to part
                // (e.g. i <= v.size() is very much wrong, but i <= v.size() - 1 is ok)
                let conditionOperator = analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKind("relational_binary_operator_expression"));
                if (conditionOperator) {
                    if (!analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKinds(["arithmetic_binary_operator_expression", "prefix_increment_expression", "postfix_increment_expression"]))) {
                        if (conditionOperator.operator === "<=" || conditionOperator.operator === ">=") {
                            if (!indexingOperations.some(indexingOp => analysis_1.findFirstConstruct(indexingOp, predicates_1.Predicates.byKinds([
                                "arithmetic_binary_operator_expression",
                                "prefix_increment_expression",
                                "postfix_increment_expression"
                            ])))) {
                                project.addNote(new errors_1.CompilerNote(conditionOperator, errors_1.NoteKind.STYLE, "hardcoded_vector_size", `Double check the limit in this condition. I think there might be an off-by-one error that takes you out of bounds if you're using the ${conditionOperator.operator} operator.`));
                                return false;
                            }
                        }
                    }
                }
                return true;
            }),
            new checkpoints_1.OutputCheckpoint("Correct Output", (output) => {
                return checkpoints_1.removeWhitespace(output).indexOf(checkpoints_1.removeWhitespace("{ 1 2 3 4 5 }")) !== -1
                    && checkpoints_1.removeWhitespace(output).indexOf(checkpoints_1.removeWhitespace("{ 0 -5 94 16 }")) !== -1;
            })
        ]
    },
    "eecs280_ex_swap_by_pointer": {
        checkpoints: [
            new checkpoints_1.OutputCheckpoint("Correct Output", (output) => {
                return output.indexOf("a = 5") !== -1
                    && output.indexOf("b = 3") !== -1;
            })
        ]
    },
    "loop_control_vars": {
        checkpoints: [
            new checkpoints_1.OutputCheckpoint("Checking Loops", (output) => {
                return true;
            })
        ]
    },
    "eecs280_ex_strcpy": {
        checkpoints: [
            new checkpoints_1.OutputCheckpoint("Correct Output", (output, project) => {
                if (output.indexOf("frogrd") !== -1) {
                    let strcpyFn = analysis_1.findFirstConstruct(project.program, predicates_1.Predicates.byFunctionName("strcpy"));
                    if (strcpyFn) {
                        project.addNote(new errors_1.CompilerNote(strcpyFn.declaration.declarator, errors_1.NoteKind.STYLE, "hint_strcpy_null_char", `Hint: It looks like you're quite close to the right answer! Check out the simulation output. What gets printed? How does that relate to the placement of the null characters in memory?`));
                    }
                    return false;
                }
                let first = output.indexOf("frog");
                if (first === -1) {
                    return false;
                }
                let second = output.indexOf("frog", first + 1);
                return second !== -1;
            })
        ]
    },
    "eecs280_ex_lab2_squareArray": {
        checkpoints: [
            new checkpoints_1.StaticAnalysisCheckpoint("Traversal by Index", (program, project) => {
                let squareArrayFn = analysis_1.findFirstConstruct(program, predicates_1.Predicates.byFunctionName("squareArray"));
                if (!squareArrayFn) {
                    return false;
                }
                // let arrParam = squareArrayFn.parameters[0];
                // if (!Predicates.isTypedDeclaration(arrParam, isPointerToType(Int))) {
                //     return false;
                // }
                // let lenParam = squareArrayFn.parameters[1];
                // if (!Predicates.isTypedDeclaration(lenParam, isType(Int))) {
                //     return false;
                // }
                let loop = analysis_1.findFirstConstruct(squareArrayFn, predicates_1.Predicates.byKinds(["while_statement", "for_statement"]));
                if (!loop) {
                    return false;
                }
                let loopControlVars = loops_1.findLoopControlVars(loop);
                return loopControlVars.some(v => v.isTyped(types_1.isIntegralType));
                // // verify loop condition contains a relational operator
                // let conditionOk = false;
                // let loopCondComp = findFirstConstruct(loop.condition, Predicates.byKind("relational_binary_operator_expression"));
                // if (loopCondComp) {
                //     let compOperands = <AnalyticExpression[]>[loopCondComp.left, loopCondComp.right];
                //     if (compOperands.every(Predicates.byTypedExpression(isType(Int)))) {
                //         let hardcodedLimit = findFirstConstruct(loop.condition, Predicates.byKind("numeric_literal_expression"));
                //         if (hardcodedLimit) {
                //             project.addNote(new CompilerNote(loop.condition, NoteKind.STYLE, "hardcoded_vector_size",
                //             `Uh oh! It looks like you've got a hardcoded number ${hardcodedLimit.value.rawValue} for the loop size. This might work for the test case in main, but what if the function was called on a different vector?`));
                //             return false;
                //         }
                //         else {
                //             conditionOk = true;
                //         }
                //     }
                //     else {
                //         project.addNote(new CompilerNote(loop.condition, NoteKind.STYLE, "traversal_by_index_condition",
                //         `For traversal by index, make sure  This might work for the test case in main, but what if the function was called on a different vector?`));
                //     }
                // }
                // // if loop condition does not contain a call to vector.size() return false
                // if (!findFirstConstruct(loop.condition, Predicates.byFunctionCallName("size"))) {
                //     return false;
                // }
                // // tricky - don't look for subscript expressions, since with a vector it's actually
                // // an overloaded [] and we need to look for that as a function call
                // let indexingOperations = findConstructs(loop.body, Predicates.byOperatorOverloadCall("[]"));
                // // loop condition contains size (from before), but also has <= or >=
                // // and no arithmetic operators or pre/post increments that could make up for the equal to part
                // // (e.g. i <= v.size() is very much wrong, but i <= v.size() - 1 is ok)
                // let conditionOperator = findFirstConstruct(loop.condition, Predicates.byKind("relational_binary_operator_expression"));
                // if (conditionOperator){
                //     if (!findFirstConstruct(loop.condition,
                //         Predicates.byKinds(["arithmetic_binary_operator_expression", "prefix_increment_expression", "postfix_increment_expression"]))) {
                //         if (conditionOperator.operator === "<=" || conditionOperator.operator === ">=") {
                //             if (!indexingOperations.some(indexingOp => findFirstConstruct(indexingOp,
                //                 Predicates.byKinds([
                //                     "arithmetic_binary_operator_expression",
                //                     "prefix_increment_expression",
                //                     "postfix_increment_expression"])
                //                 ))) {
                //                     project.addNote(new CompilerNote(conditionOperator, NoteKind.STYLE, "hardcoded_vector_size",
                //                         `Double check the limit in this condition. I think there might be an off-by-one error that takes you out of bounds if you're using the ${conditionOperator.operator} operator.`));
                //                     return false;
                //                 }
                //         }
                //     }
                // }
            }),
            new checkpoints_1.StaticAnalysisCheckpoint("Traversal by Pointer", (program, project) => {
                let squareArrayFn = analysis_1.findFirstConstruct(program, predicates_1.Predicates.byFunctionName("squareArray"));
                if (!squareArrayFn) {
                    return false;
                }
                let loop = analysis_1.findFirstConstruct(squareArrayFn, predicates_1.Predicates.byKinds(["while_statement", "for_statement"]));
                if (!loop) {
                    return false;
                }
                let loopControlVars = loops_1.findLoopControlVars(loop);
                return loopControlVars.some(v => v.isTyped(types_1.isPointerType));
            }),
            new checkpoints_1.EndOfMainStateCheckpoint("arr modified to {16, 25, 4}", (sim) => {
                let main = sim.program.mainFunction;
                let arrEntity = main.context.functionLocals.localObjects.find(local => local.name === "arr");
                if (!arrEntity) {
                    return false;
                }
                let mainFrame = sim.memory.stack.topFrame();
                let arr = mainFrame.localObjectLookup(arrEntity);
                if (!arr.isTyped(types_1.isBoundedArrayOfType(types_1.isType(types_1.Int)))) {
                    return false;
                }
                let elts = arr.rawValue();
                return lodash_1.isEqual(elts, [16, 25, 4]);
            })
            // new EndOfMainStateCheckpoint("Correct Output", (sim: Simulation) => {
            //     let main = sim.program.mainFunction;
            //     let mainFrame = sim.memory.stack.topFrame()!;
            //     let locals = sim.program.mainFunction.context.functionLocals.localObjects.map(local => local.firstDeclaration);
            //     let localArrays = locals.filter(Predicates.byTypedDeclaration(isBoundedArrayOfType(isType(Int))));
            //     let squareArrayCalls = findConstructs(main, Predicates.byFunctionCallName("squareArray"));
            //     // Filter to only those localArrays that appear in exactly one call to squareArray
            //     localArrays = localArrays.filter(localArr => !!findFirstConstruct(squareArrayCalls, Predicates.byIdentifierName(localArr.name)))
            //     return localArrays.every(localArr => {
            //         if (!))
            //     });
            //     // if (!arrEntity || !(arrEntity instanceof LocalObjectEntity)) {
            //     //     return false;
            //     // }
            //     // let arr = mainFrame.localObjectLookup(arrEntity);
            //     // if (!arr.isTyped(isBoundedArrayOfType(isType(Int)))) {
            //     //     return false;
            //     // }
            //     // let elts = arr.rawValue();
            //     // return isEqual(elts, [])
            // })
        ]
    }
};
//# sourceMappingURL=exercises.js.map