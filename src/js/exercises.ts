import { SimulationOutlet } from "./view/simOutlets";
import { ProjectEditor, CompilationOutlet, CompilationStatusOutlet } from "./view/editors";
import { Simulation } from "./core/Simulation";
import { MessageResponses, listenTo, stopListeningTo, messageResponse, Message } from "./util/observe";
import { assert, Mutable } from "./util/util";
import { RuntimeConstruct } from "./core/constructs";
import { decode } from "he";
import { createSimpleExerciseOutlet } from "./frontend/simple_exercise_outlet";
import { Exercise, Project } from "./core/Project";
import { Checkpoint, getExerciseCheckpoints } from "./analysis/checkpoints";

import "./lib/cstdlib"
import "./lib/cmath"
import "./lib/string"
import "./lib/vector"
import { CheckpointsOutlet } from "./view/checkpointOutlets";

$(() => {

    let exID = 1;

    $(".lobster-ex").each(function() {

        $(this).append(createSimpleExerciseOutlet(""+exID));

        let filename = $(this).find(".lobster-ex-file-name").html()?.trim() ?? "file.cpp";
        let projectName = $(this).find(".lobster-ex-project-name").html()?.trim() ?? "UnnamedProject";
        let completeMessage = $(this).find(".lobster-ex-complete-message").html()?.trim() ?? "Well done! Exercise complete!";
        let initCode = decode($(this).find(".lobster-ex-init-code").html()?.trim() ?? "");
        if (initCode === "") {
            initCode = EXERCISE_STARTER_CODE[projectName] ?? "";
        }

        let project = new Project(
          projectName,
          undefined,
          [{name: filename, code: initCode, isTranslationUnit: true}],
          new Exercise(getExerciseCheckpoints(projectName)));
        project.turnOnAutoCompile(500);

        let exOutlet = new SimpleExerciseLobsterOutlet($(this), project, completeMessage);

        ++exID;
    });



});


export class SimpleExerciseLobsterOutlet {
    
    private projectEditor: ProjectEditor;
    private simulationOutlet: SimulationOutlet;
    
    public readonly project: Project;
    public readonly completeMessage: string;

    public readonly sim?: Simulation;

    private readonly element: JQuery;
    private readonly tabsElem: JQuery;
    // private readonly annotationMessagesElem: JQuery;

    public readonly compilationOutlet: CompilationOutlet
    public readonly compilationStatusOutlet: CompilationStatusOutlet
    public readonly checkpointsOutlet: CheckpointsOutlet

    public _act!: MessageResponses;

    public constructor(element: JQuery, project: Project, completeMessage: string) {
        this.element = element;
        this.completeMessage = completeMessage;
        // Set up simulation and source tabs
        // var sourceTab = element.find(".sourceTab");
        // var simTab = element.find(".simTab");

        this.tabsElem = element.find(".lobster-simulation-outlet-tabs");

        // TODO: HACK to make codeMirror refresh correctly when sourcePane becomes visible
        this.tabsElem.find('a.lobster-source-tab').on("shown.bs.tab", () => {
            this.projectEditor.refreshEditorView();
        });

        this.simulationOutlet = new SimulationOutlet(element.find(".lobster-sim-pane"));

        let runButtonElem = element.find(".runButton")
            .click(() => {
            let program = this.project.program;
            if (program.isRunnable()) {
                let sim = new Simulation(program);
                while(!sim.globalAllocator.isDone) {
                    sim.stepForward(); // TODO: put this loop in simulation runners in function to skip stuff before main
                }
                this.setSimulation(sim);
            }
            this.element.find(".lobster-simulate-tab").tab("show");
        });

        this.projectEditor = new ProjectEditor(element.find(".lobster-source-pane"), project);
        this.compilationOutlet = new CompilationOutlet(element.find(".lobster-compilation-pane"), project);
        this.compilationStatusOutlet = new CompilationStatusOutlet(element.find(".compilation-status-outlet"), project);
        this.checkpointsOutlet = new CheckpointsOutlet(element.find(".lobster-ex-checkpoints"), project.exercise, completeMessage);
        
        this.project = project;

        
    }
    
    public setProject(project: Project) {
        (<Mutable<this>>this).project = project;

        this.projectEditor.setProject(project);
        this.compilationOutlet.setProject(project);
        this.compilationStatusOutlet.setProject(project);
        this.checkpointsOutlet.setExercise(project.exercise);
        
        return this.project;
    }

    public setSimulation(sim: Simulation) {
        this.clearSimulation();
        (<Mutable<this>>this).sim = sim;
        listenTo(this, sim);

        this.simulationOutlet.setSimulation(sim);
    }
    
    public clearSimulation() {
        this.simulationOutlet.clearSimulation();

        if (this.sim) {
            stopListeningTo(this, this.sim);
        }
        delete (<Mutable<this>>this).sim;
    }

    // private hideAnnotationMessage() {
    //     this.annotationMessagesElem.css("top", "125px");
        
    //     if (this.afterAnnotation.length > 0) {
    //         this.afterAnnotation.forEach(fn => fn());
    //         this.afterAnnotation.length = 0;
    //     }
    // }

    @messageResponse("requestFocus")
    protected requestFocus(msg: Message<undefined>) {
        if (msg.source === this.projectEditor) {
            this.tabsElem.find('a.lobster-source-tab').tab("show");
        }
    }

    
    @messageResponse("beforeStepForward")
    protected beforeStepForward(msg: Message<RuntimeConstruct>) {
        var oldGets = $(".code-memoryObject .get");
        var oldSets = $(".code-memoryObject .set");
        setTimeout(() => {
            oldGets.removeClass("get");
            oldSets.removeClass("set");
        }, 300);
    }

    // _act : {
    //     loadCode : "loadCode",
    //     loadProject : "loadProject",

    //     annotationMessage : function(msg) {
    //         this.hideAnnotationMessage();
    //         var text = msg.data.text;
    //         if (msg.data.after) {
    //             this.afterAnnotation.unshift(msg.data.after);
    //         }
    //         this.annotationMessagesElem.find(".annotation-message").html(text);
    //         this.annotationMessagesElem.css("top", "0px");
    //         if (msg.data.aboutRecursion) {
    //             this.annotationMessagesElem.find(".lobsterTeachingImage").css("display", "inline");
    //             this.annotationMessagesElem.find(".lobsterRecursionImage").css("display", "none");
    //         }
    //         else{
    //             this.annotationMessagesElem.find(".lobsterTeachingImage").css("display", "none");
    //             this.annotationMessagesElem.find(".lobsterRecursionImage").css("display", "inline");
    //         }
    //     },

    //     alert : function(msg) {
    //         msg = msg.data;
    //         this.pause();
    //         this.alertsElem.find(".alerts-message").html(msg);
    //         this.alertsElem.css("left", "0px");
    //     },
    //     explain : function(msg) {
    //         msg = msg.data;
    //         this.alertsElem.find(".alerts-message").html(msg);
    //         this.alertsElem.css("left", "0px");
    //     },
    //     closeMessage : function() {
    //         this.hideAlerts();
    //     },
    //     started : function(msg) {
    //         this.hideAlerts();
    //     },
    // }

//     mousewheel : function(ev) {
//         ev.preventDefault();
//         if (ev.deltaY < 0) {
//             this.stepForward();
//         }
//         else{
// //            this.stepBackward();
//         }
//     }

}






const EXERCISE_STARTER_CODE : {[index: string]: string} = {
    "ch12_01_ex":
`#include <iostream>
using namespace std;

int main() {
  cout << "Hello World!" << endl;
  
  int x = 10 + 5;

  // Compute y and z for a final result of z = 120

  cout << "The result is " << z << "!" << endl;
}`,

    "ch12_02_ex":
`#include <iostream>
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
}`,

    "ch12_04_ex":
`#include <iostream>
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
  
}`,

    "ch12_04_ex_stopwatch":
`#include <iostream>
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

    "ch12_05_ex":
`#include <iostream>
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
}`,

    "ch13_02_ex":
`#include <iostream>
using namespace std;

int main() {

// TODO: Put your code here!


cout << "done!" << endl;
}`,

    "ch13_03_ex" :
`#include <iostream>
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

    "ch13_04_ex":
`#include <iostream>
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

    "ch13_05_ex":
`#include <iostream>
using namespace std;

int main() {
    int N = 5;
  
    // YOUR CODE HERE
  
  
  
  
  
  
  
  }`,

    "ch13_06_ex":
`#include <iostream>
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

    "ch13_06_ex_2":
`#include <iostream>
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

    "ch14_02_ex":
`#include <iostream>
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
}`,

    "ch14_03_ex":
`#include <iostream>
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

    "ch14_04_ex":
`#include <iostream>
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
}`,

    "ch15_ex_echo":
`#include <iostream>
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

"ch15_ex_repeat":
`#include <iostream>
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
}
`,

"ch16_ex_printDoubled":
`#include <iostream>
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
} 

`,

"ch16_ex_all_negative":
`#include <iostream>
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

"ch17_ex_encrypt_word":
`#include <iostream>
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

"ch17_ex_unit_testing":
`#include <iostream>
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

"ch18_ex_printRover":
`#include <iostream>
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
}
`,

"ch19_ex_printVecOfInts":
`#include <iostream>
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
}
`
}

