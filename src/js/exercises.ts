import { SimulationOutlet } from "./view/simOutlets";
import { Project, ProjectEditor, CompilationOutlet, CompilationStatusOutlet } from "./view/editors";
import { Simulation } from "./core/Simulation";
import { MessageResponses, listenTo, stopListeningTo, messageResponse, Message, Observable } from "./util/observe";
import { Mutable } from "./util/util";
import { RuntimeConstruct } from "./core/constructs";
import { decode } from "he";
import { AsynchronousSimulationRunner } from "./core/simulationRunners";
import { Program } from "./core/Program";
import { Predicates } from "./core/predicates";
import { findFirstConstruct, findConstructs } from "./core/analysis";

import "./lib/cstdlib"
import "./lib/string"
import "./lib/vector"
import { CompilerNote, NoteKind } from "./core/errors";

$(() => {

    let exID = 1;

    $(".lobster-ex").each(function() {

        $(this).append(`
            <div>
                <ul style="position: relative;" class="lobster-simulation-outlet-tabs nav nav-tabs">
                    <div style="position: absolute; right: 0; bottom: 0; padding-bottom: 3px">
                        <div style="display: inline-block">
                        </div>
                    </div>

                    <li><a data-toggle="tab" href="#lobster-ex-${exID}-compilation-pane">Compilation</a></li>
                    <li class="active"><a data-toggle="tab" href="#lobster-ex-${exID}-source-pane">Source Code</a></li>
                    <li><a class="lobster-simulate-tab" data-toggle="tab" href="#lobster-ex-${exID}-sim-pane">Simulation</a></li>

                </ul>

                <div class="tab-content">
                    <div id="lobster-ex-${exID}-compilation-pane" class="lobster-compilation-pane tab-pane fade">
                        <div>
                            <h3>Compilation Units</h3>
                            <p>A program may be composed of many different compilation units (a.k.a translation units), one for each source file
                                that needs to be compiled into the executable program. Generally, you want a compilation
                                unit for each .cpp file, and these are the files you would list out in a compile command.
                                The files being used for this purpose are highlighted below. Note that files may be
                                indirectly used if they are #included in other compilation units, even if they are not
                                selected to form a compilation unit here.
                            </p>
                            <p style="font-weight: bold;">
                                Click files below to toggle whether they are being used to create a compilation unit.
                            </p>
                            <ul class="translation-units-list list-inline">
                            </ul>
                        </div>
                        <div>
                            <h3>Compilation Errors</h3>
                            <p>These errors were based on your last compilation.
                            </p>
                            <ul class="compilation-notes-list">
                            </ul>
                        </div>
                    </div>

                    <div id="lobster-ex-${exID}-source-pane" class="lobster-source-pane tab-pane fade active in">
                        <div style="padding-top:5px; padding-bottom: 5px;">
                            <ul style="display:inline-block; vertical-align: middle;" class="project-files nav nav-pills"></ul>
                            
                            <button class = "btn btn-primary runButton" style="float:right; margin-left: 1em"><span class="glyphicon glyphicon-play-circle"></span> Simulate</span></button>
                            <div class = "compilation-status-outlet" style="float:right">
                            </div>
                        </div>
                        <div class="codeMirrorEditor" style = "position: relative; background-color: #272822">
                            <!--<textarea style="position: absolute; overflow-y: hidden; height: 2000px; color: black"></textarea>-->
                            <!--<div style="height: 400px;"></div>-->
                        </div>

                        <div class="annotationMessagesContainer" style="position: absolute; bottom: 0; left: 0px; right: 0px; overflow: hidden; text-align: center; pointer-events: none">
                            <div class="annotationMessages">
                                <div style="height: 100px; margin-left: 5px; float: right;">
                                    <img src="img/lobster_teaching.jpg" class="lobsterRecursionImage" style="height: 90px; margin-left: 5px;"/>
                                    <img src="img/lobster_recursion.jpg" class="lobsterTeachingImage" style="display:none; height: 90px; margin-left: 5px;"/>
                                    <div style="padding-right: 5px; text-align: center"><button>Thanks!</button></div>
                                </div>
                                <div style="height: 100%; overflow-y: auto"><table style="height: 110px; margin-left: auto; margin-right: auto"><tr><td><div class="annotation-message"></div></td></tr></table></div>
                            </div>
                        </div>
                    </div>
                    <div id="lobster-ex-${exID}-sim-pane" class="lobster-sim-pane tab-pane fade">
                        <div style="position: relative">
                            <div class="runningProgress" style="position: absolute; right: 0; top: 0; margin: 5px; margin-right: 20px; padding: 5px; background-color: rgba(255,255,255,0.7);">
                                Thinking...
                                <!--<progress style="display: inline-block; vertical-align: top"></progress>-->
                            </div>
                            <div class="alerts-container">
                                <div class="alerts">
                                    <div style="display:inline-block; padding: 5px">
                                        <div style="height: 100px; margin-left: 5px; float: right;">
                                            <img src="img/lobster.png" style="height: 80px; margin-left: 5px;"/>
                                            <div style="padding-right: 5px; text-align: right"><button>Dismiss</button></div>
                                        </div>
                                        <table style="height: 110px"><tr><td><div class="alerts-message"></div></td></tr></table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- <p style = "width: 394px; padding: 5px;" class = "_outlet readOnly memory">memory</p> -->
                        <table style="width: 100%; margin-top: 5px; ">
                            <tr>
                                <td style="min-width: 260px; width: 260px; max-width: 260px; vertical-align: top; height: 100%">
                                    <div style="position: relative; display: flex; flex-direction: column;">
                                        <div style="margin-bottom: 5px;">
                                            <button class = "restart btn btn-warning-muted" style="font-size: 12px; padding: 6px 6px"><span class="glyphicon glyphicon-fast-backward"></span> Restart</button>
                                            <!--<span style = "display: inline-block; width: 4ch"></span>-->
                                            <!-- <button class = "stepOver">Step Over</button> -->
                                            <!-- <button class = "stepOut">Step Out</button> -->
                                            <button class = "runToEnd btn btn-success-muted" style="font-size: 12px; padding: 6px 6px">Run <span class="glyphicon glyphicon-fast-forward"></button>
                                            <button class = "pause btn btn-warning-muted" style="font-size: 12px; padding: 6px 6px"><span class="glyphicon glyphicon-pause"></button>
                                            <!-- <button class = "skipToEnd"><span class="glyphicon glyphicon-fast-forward"></button> -->

                                            <!--Show Functions<input type="checkbox" class="stepInto"/>-->
                                            <button class = "stepBackward btn btn-success-muted" style="font-size: 12px; padding: 6px 6px"><span class="glyphicon glyphicon-arrow-left"></span></button>
                                            <input type="hidden" style="width: 4ch" class="stepBackwardNum" value="1" />

                                            
                                            <input type="hidden" style="display: none; width: 4ch" class="stepForwardNum" value="1" />
                                            <button class = "stepForward btn btn-success-muted" style="font-size: 12px; padding: 6px 6px">Step <span class="glyphicon glyphicon-arrow-right"></span></button>
                                            <!--<input type="checkbox" id="tcoCheckbox" checked="false" />-->
                                        </div>
                                        <div class="console">
                                            <span style = "position: absolute; top: 5px; right: 5px; pointer-events: none;">Console</span>
                                            <span class="lobster-console-contents"></span>
                                            <input type="text" class="lobster-console-user-input-entry"></span>
                                        </div>
                                        <div class="lobster-cin-buffer" style = "margin-top: 5px;"></div>
                                        <div style = "margin-top: 5px; text-align: center;">Memory</div>
                                        <div style="overflow-y: auto; overflow-x: hidden; flex-grow: 1;"><div style="height: 300px;" class="memory readOnly"></div></div>

                                    </div>
                                </td>
                                <td style="position: relative; vertical-align: top;">
                                    <div class = "codeStack readOnly" style="display: block; margin-left: 5px; overflow-y: auto; position: absolute; width: 100%; height: 100%; white-space: nowrap;"> </div>
                                </td>
                            </tr>
                        </table>

                    </div>
                </div>
                <div class="lobster-ex-checkpoints panel panel-default" style="margin-top: 0.5em;">
                    <div class="panel-heading"></div>
                    <div class="panel-body">
                        
                    </div>
                </div>
            </div>

        `)

        let filename = $(this).find(".lobster-ex-file-name").html()?.trim() ?? "file.cpp";
        let projectName = $(this).find(".lobster-ex-project-name").html()?.trim() ?? "UnnamedProject";
        let completeMessage = $(this).find(".lobster-ex-complete-message").html()?.trim() ?? "Well done! Exercise complete!";
        let initCode = decode($(this).find(".lobster-ex-init-code").html()?.trim() ?? "");
        if (initCode === "") {
            initCode = EXERCISE_STARTER_CODE[projectName] ?? "";
        }

        let project = new Project(projectName, [{name: filename, code: initCode, isTranslationUnit: true}]);
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


    public _act!: MessageResponses;

    public constructor(element: JQuery, project: Project, completeMessage: string) {
        this.element = element;
        this.project = project;
        this.completeMessage = completeMessage;
        // Set up simulation and source tabs
        // var sourceTab = element.find(".sourceTab");
        // var simTab = element.find(".simTab");

        this.tabsElem = element.find(".lobster-simulation-outlet-tabs");

        this.projectEditor = new ProjectEditor(element.find(".lobster-source-pane"), this.project);

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

        new CompilationOutlet(element.find(".lobster-compilation-pane"), this.project);
        new CompilationStatusOutlet(element.find(".compilation-status-outlet"), this.project);

        new CheckpointsOutlet(element.find(".lobster-ex-checkpoints"), project, getExerciseCheckpoints(project.name), completeMessage);
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

export class CheckpointsOutlet {

    public _act!: MessageResponses;
    
    public readonly project: Project;
    public readonly checkpoints: readonly Checkpoint[];
    
    private readonly element: JQuery;
    private readonly headerElem: JQuery;
    private readonly completeMessage: string;

    private readonly checkpointOutlets: readonly CheckpointOutlet[];

    public constructor(element: JQuery, project: Project, checkpoints: readonly Checkpoint[], completeMessage: string) {
        this.element = element;
        this.project = project;
        listenTo(this, project);
        this.checkpoints = checkpoints;
        this.completeMessage = completeMessage;

        if (this.checkpoints.length === 0) {
            this.element.hide();
        }

        let checkpointsContainerElem = element.find(".panel-body");
        this.headerElem = element.find(".panel-heading").html("Exercise Progress");

        this.checkpointOutlets = checkpoints.map(c => new CheckpointOutlet(
            $(`<span class="lobster-checkpoint"></span>`).appendTo(checkpointsContainerElem),
            c.name
        ));
    }

    @messageResponse("compilationFinished")
    protected async onCompilationFinished() {

        let statuses = await Promise.all(this.checkpoints.map(
            async (checkpoint, i) => {
                try {
                    let passed = await checkpoint.evaluate(this.project);
                    this.checkpointOutlets[i].update(passed);
                    return passed;
                }
                catch {
                    return false;
                }
            }
        ));

        if (statuses.every(Boolean) || this.project.name !== "ch13_03_ex" && this.project.name !== "ch13_04_ex" && statuses[statuses.length - 1]) {
            this.headerElem.html(`<b>${this.completeMessage}</b>`);
            this.element.removeClass("panel-default");
            this.element.removeClass("panel-danger");
            this.element.addClass("panel-success");
        }
        else {
            
            this.element.removeClass("panel-success");
            this.element.removeClass("panel-default");
            this.element.removeClass("panel-danger");
            if (this.project.program.hasSyntaxErrors()) {
                this.headerElem.html("Exercise Progress (Please note: checkpoints cannot be verified due to syntax errors.)");
                this.element.addClass("panel-danger");
            }
            else {
                this.headerElem.html("Exercise Progress");
                this.element.addClass("panel-default");
            }
        }

    }
};


const completeStatus = '<span class="glyphicon glyphicon-ok lobster-complete-glyphicon"></span>';
const incompleteStatus = '<span class="glyphicon glyphicon-option-horizontal lobster-incomplete-glyphicon"></span>';

export class CheckpointOutlet {
    
    private readonly element: JQuery;
    private readonly statusElem: JQuery;

    public constructor(element: JQuery, name: string) {
        
        this.element = element;
        element.append(name + " ");
        
        this.statusElem = $("<span></span>").appendTo(element);
    }

    public update(isComplete: boolean) {

        if (isComplete) {
            this.statusElem.html(completeStatus);
        }
        else {
            this.statusElem.html(incompleteStatus);
        }

    }

}

abstract class Checkpoint {

    public readonly name: string;

    public constructor(name: string) {
        this.name = name;
    }

    public abstract async evaluate(project: Project): Promise<boolean>;
}

export class IsCompiledCheckpoint extends Checkpoint {

    public async evaluate(project: Project) {
        return project.program.isCompiled();
    }

}

export class OutputCheckpoint extends Checkpoint {

    public readonly input: string;
    public readonly stepLimit: number;

    private expected: (output: string) => boolean;
    
    private runner?: AsynchronousSimulationRunner;

    public constructor(name: string, expected: (output: string) => boolean, input: string = "", stepLimit: number = 1000) {
        super(name);
        this.expected = expected;
        this.input = input;
        this.stepLimit = stepLimit;
    }

    // May throw if interrupted during async running
    public async evaluate(project: Project) {
        
        if (this.runner) {
            this.runner.pause();
            delete this.runner;
        }

        let program = project.program;

        if (!program.isRunnable()) {
            return false;
        }

        let sim = new Simulation(program);
        if (this.input !== "") {
            sim.cin.addToBuffer(this.input)
        }
        let runner = this.runner = new AsynchronousSimulationRunner(sim);

        // may throw if interrupted
        await runner.stepToEnd(0, this.stepLimit, true);
        return sim.atEnd && this.expected(sim.allOutput);
    }
    
}



export class StaticAnalysisCheckpoint extends Checkpoint {

    private criterion: (program: Program, project: Project) => boolean;
    
    private runner?: AsynchronousSimulationRunner;

    public constructor(name: string, criterion: (program: Program, project: Project) => boolean) {
        super(name);
        this.criterion = criterion;
    }

    public async evaluate(project: Project) {
        return this.criterion(project.program, project);
    }
    
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

`
}

function getExerciseCheckpoints(projectName: string) {
    return EXERCISE_CHECKPOINTS[projectName] ?? [];
}

const EXERCISE_CHECKPOINTS : {[index: string]: readonly Checkpoint[]} = {
    "ch12_01_ex": [
        new StaticAnalysisCheckpoint("Compute y", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableName("y"));
        }),
        new StaticAnalysisCheckpoint("Compute z", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableName("z"));
        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output === "Hello World!\nThe result is 120!\n";
        })
    ],
    "ch12_04_ex_stopwatch": [
        new StaticAnalysisCheckpoint("Compute h", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableName("h"));
        }),
        new StaticAnalysisCheckpoint("Compute m", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableName("m"));
        }),
        new StaticAnalysisCheckpoint("Compute s", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableName("s"));
        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output === "Hours: 1\nMinutes: 2\nSeconds: 33\n";
        })
    ],
    "ch13_02_ex": [
        new IsCompiledCheckpoint("Compiles"),
        new StaticAnalysisCheckpoint("Start at 9", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableInitialValue(9));
        }),
        new StaticAnalysisCheckpoint("While Loop", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byKind("while_statement"));
        }),
        new StaticAnalysisCheckpoint("Condition", (program: Program) => {
            let loopVar = findFirstConstruct(program, Predicates.byVariableInitialValue(9));
            let loop = findFirstConstruct(program, Predicates.byKind("while_statement"));
            if (!loopVar || !loop) {
                return false;
            }

            // verify loop condition contains the right variable
            if (!findFirstConstruct(loop.condition, Predicates.byIdentifierName(loopVar.name))) {
                return false;
            }

            // verify loop condition contains a number
            if (!findFirstConstruct(loop.condition, Predicates.byKind("numeric_literal_expression"))) {
                return false;
            }

            // verify loop condition contains a relational operator
            if (!findFirstConstruct(loop.condition, Predicates.byKind("relational_binary_operator_expression"))) {
                return false;
            }

            return true;
        }),
        new StaticAnalysisCheckpoint("Update Expression", (program: Program) => {
            let loopVar = findFirstConstruct(program, Predicates.byVariableInitialValue(9));
            let loop = findFirstConstruct(program, Predicates.byKind("while_statement"));
            if (!loopVar || !loop) {
                return false;
            }

            // verify loop body contains an update for the var
            return !! findFirstConstruct(loop.body, Predicates.byVariableUpdate(loopVar.name));
        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output === "9 7 5 3 1 done!\n";
        })
    ],
    "ch13_03_ex": [
        new StaticAnalysisCheckpoint("Use ++", (program: Program) => {
            return !! findConstructs(program, Predicates.byKinds(["prefix_increment_expression", "postfix_increment_expression"])).find(
                construct => construct.operator === "++"
            );
        }),
        new StaticAnalysisCheckpoint("Use --", (program: Program) => {
            return !! findConstructs(program, Predicates.byKinds(["prefix_increment_expression", "postfix_increment_expression"])).find(
                construct => construct.operator === "--"
            );
        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output === "0\n1\n2\n3\n4\n3\n2\n1\n0\ndone!\n";
        })
    ],
    "ch13_04_ex": [
        new StaticAnalysisCheckpoint("for Loop Syntax", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byKind("for_statement"));
        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output === "1 2 4 8 16 32 done!\n";
        })
    ],
    "ch13_05_ex": [
        new StaticAnalysisCheckpoint("Nested Loops", (program: Program) => {
            let outerLoop = findFirstConstruct(program, Predicates.byKinds(["for_statement", "while_statement"]));
            return !!outerLoop && !! findFirstConstruct(outerLoop.body, Predicates.byKinds(["for_statement", "while_statement"]));
        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output === "X\nXX\nXXX\nXXXX\nXXXXX\n";
        })
        
    ],
    "ch13_06_ex": [
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output === "1 5 7 11 13 done!\n";
        })
        
    ],
    "ch13_06_ex_2": [
        // no checkpoints, just an example not an exercise
    ],
    "ch14_03_ex": [
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output.replace(/\s+/g, '') === "X\nXX\nXXX\nXX\nX\n".replace(/\s+/g, '');
        })
        
    ],
    "ch15_ex_echo": [
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output.indexOf("Hi") !== -1
                && output.indexOf("How") !== -1
                && output.indexOf("are") !== -1
                && output.indexOf("you") !== -1
                && output.indexOf("Stop") !== -1
                && output.indexOf("Ok fine I'll stop :(") !== -1;
        }, "Hi\nHow are you\nStop\nSTOP\n")
        
    ],
    "ch15_ex_repeat": [
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output.indexOf("abababab") !== -1
                && output.indexOf("echo echo ") !== -1;
        })
        
    ],
    "ch16_ex_printDoubled": [
        new StaticAnalysisCheckpoint("Start at 0", (program: Program,) => {
            return !! findFirstConstruct(program, Predicates.byVariableInitialValue(0));
        }),
        new StaticAnalysisCheckpoint("Check against size", (program: Program, project: Project) => {
            let loop = findFirstConstruct(program, Predicates.byKinds(["while_statement", "for_statement"]));
            if (!loop) {
                return false;
            }

            // verify loop condition does NOT contain a number
            let hardcodedLimit = findFirstConstruct(loop.condition, Predicates.byKind("numeric_literal_expression"));
            if (hardcodedLimit) {
                project.addNote(new CompilerNote(loop.condition, NoteKind.STYLE, "hardcoded_vector_size",
                `Uh oh! It looks like you've got a hardcoded number ${hardcodedLimit.value.rawValue} for the loop size. This might work for the test case in main, but what if the function was called on a different vector?`));
                return false;
            }

            // verify loop condition contains a relational operator
            if (!findFirstConstruct(loop.condition, Predicates.byKind("relational_binary_operator_expression"))) {
                return false;
            }

            // if loop condition does not contain a call to vector.size() return false
            if (!findFirstConstruct(loop.condition, Predicates.byFunctionCallName("size"))) {
                return false;
            }

            // tricky - don't look for subscript expressions, since with a vector it's actually
            // an overloaded [] and we need to look for that as a function call
            let indexingOperations = findConstructs(loop.body, Predicates.byOperatorOverloadCall("[]"));

            // loop condition contains size (from before), but also has <= or >=
            // and no arithmetic operators or pre/post increments that could make up for the equal to part
            // (e.g. i <= v.size() is very much wrong, but i <= v.size() - 1 is ok)
            let conditionOperator = findFirstConstruct(loop.condition, Predicates.byKind("relational_binary_operator_expression"));
            if (conditionOperator){
                if (!findFirstConstruct(loop.condition,
                    Predicates.byKinds(["arithmetic_binary_operator_expression", "prefix_increment_expression", "postfix_increment_expression"]))) {
                    if (conditionOperator.operator === "<=" || conditionOperator.operator === ">=") {
                        if (!indexingOperations.some(indexingOp => findFirstConstruct(indexingOp,
                            Predicates.byKinds([
                                "arithmetic_binary_operator_expression",
                                "prefix_increment_expression",
                                "postfix_increment_expression"])
                            ))) {
                                project.addNote(new CompilerNote(conditionOperator, NoteKind.STYLE, "hardcoded_vector_size",
                                    `Double check the limit in this condition. I think there might be an off-by-one error that takes you out of bounds if you're using the ${conditionOperator.operator} operator.`));
                                return false;
                            }
                    }
                }
            }

            return true;
        }),
        new StaticAnalysisCheckpoint("Nested Loops", (program: Program) => {
            let outerLoop = findFirstConstruct(program, Predicates.byKinds(["for_statement", "while_statement"]));
            return !!outerLoop && !! findFirstConstruct(outerLoop.body, Predicates.byKinds(["for_statement", "while_statement"]));
        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output.indexOf("{ 84 84 10 84 }") !== -1
        })
        
    ]
}
