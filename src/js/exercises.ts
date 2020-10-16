import { SimulationOutlet } from "./view/simOutlets";
import { Project, ProjectEditor, CompilationOutlet, CompilationStatusOutlet } from "./view/editors";
import { Simulation } from "./core/Simulation";
import { MessageResponses, listenTo, stopListeningTo, messageResponse, Message, Observable } from "./util/observe";
import { Mutable } from "./util/util";
import { RuntimeConstruct } from "./core/constructs";
import { decode } from "he";
import { AsynchronousSimulationRunner } from "./core/simulationRunners";

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
                                <td style="width: 30%; min-width: 260px; vertical-align: top; height: 100%">
                                    <div style="position: relative; display: flex; flex-direction: column;">
                                        <div style="margin-bottom: 5px;">
                                            <button class = "restart btn btn-warning-muted"><span class="glyphicon glyphicon-fast-backward"></span> Restart</button>
                                            <!--<span style = "display: inline-block; width: 4ch"></span>-->
                                            <!-- <button class = "stepOver">Step Over</button> -->
                                            <!-- <button class = "stepOut">Step Out</button> -->
                                            <!-- <button class = "runToEnd">Run</button> -->
                                            <!-- <button class = "pause">Pause</button> -->
                                            <!-- <button class = "skipToEnd">Skip to End (FAST)</button> -->

                                            <!--Show Functions<input type="checkbox" class="stepInto"/>-->
                                            <button class = "stepBackward btn btn-success-muted"><span class="glyphicon glyphicon-arrow-left"></span> Back</button>
                                            <input type="hidden" style="width: 4ch" class="stepBackwardNum" value="1" />

                                            
                                            <input type="hidden" style="display: none; width: 4ch" class="stepForwardNum" value="1" />
                                            <button class = "stepForward btn btn-success-muted">Step <span class="glyphicon glyphicon-arrow-right"></span></button>
                                            <!--<input type="checkbox" id="tcoCheckbox" checked="false" />-->
                                        </div>
                                        <div class="console" style="position: relative; min-height: 80px; resize: vertical; background-color: rgb(39, 40, 34); color: white;">
                                            <span style = "position: absolute; top: 5px; right: 5px;">Console</span>
                                            <span class="lobster-console-contents"></span>
                                        </div>
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
                <div class="panel panel-default" style="margin-top: 0.5em;">
                    <div class="panel-heading">Exercise Checkpoints</div>
                    <div class="lobster-ex-checkpoints panel-body">
                        
                    </div>
                </div>
            </div>

        `)

        let filename = $(this).find(".lobster-ex-file-name").html()?.trim() ?? "file.cpp";
        let projectName = $(this).find(".lobster-ex-project-name").html()?.trim() ?? "UnnamedProject";
        let initCode = decode($(this).find(".lobster-ex-init-code").html()?.trim() ?? "");

        let project = new Project(projectName, [{name: filename, code: initCode, isTranslationUnit: true}]);
        project.turnOnAutoCompile(500);

        let exOutlet = new SimpleExerciseLobsterOutlet($(this), project);

        ++exID;
    });



});


export class SimpleExerciseLobsterOutlet {
    
    private projectEditor: ProjectEditor;
    private simulationOutlet: SimulationOutlet;
    
    public readonly project: Project;
    public readonly sim?: Simulation;

    private readonly element: JQuery;
    private readonly tabsElem: JQuery;
    // private readonly annotationMessagesElem: JQuery;


    public _act!: MessageResponses;

    public constructor(element: JQuery, project = new Project("unnammed project", [])) {
        this.element = element;
        this.project = project;
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
                this.setSimulation(new Simulation(program));
            }
            this.element.find(".lobster-simulate-tab").tab("show");
        });

        new CompilationOutlet(element.find(".lobster-compilation-pane"), this.project);
        new CompilationStatusOutlet(element.find(".compilation-status-outlet"), this.project);

        new CheckpointsOutlet(element.find(".lobster-ex-checkpoints"), project, getExerciseCheckpoints(project.name));
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
    private requestFocus(msg: Message<undefined>) {
        if (msg.source === this.projectEditor) {
            this.tabsElem.find('a.lobster-source-tab').tab("show");
        }
    }

    
    @messageResponse("beforeStepForward")
    private beforeStepForward(msg: Message<RuntimeConstruct>) {
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
    
    public readonly project: Project;
    public readonly checkpoints: readonly Checkpoint[];
    
    private readonly element: JQuery;
    private readonly checkpointOutlets: readonly CheckpointOutlet[];

    public constructor(element: JQuery, project: Project, checkpoints: readonly Checkpoint[]) {
        this.element = element;
        this.project = project;
        this.checkpoints = checkpoints;

        this.checkpointOutlets = checkpoints.map(c => new CheckpointOutlet(
            $(`<span class="lobster-checkpoint"></span>`).appendTo(element),
            project,
            c
        ));
    }
};


const completeStatus = '<span class="glyphicon glyphicon-ok lobster-complete-glyphicon"></span>';
const incompleteStatus = '<span class="glyphicon glyphicon-option-horizontal lobster-incomplete-glyphicon"></span>';

export class CheckpointOutlet {
    
    private readonly element: JQuery;
    private readonly statusElem: JQuery;

    public readonly project: Project;
    public readonly checkpoint: Checkpoint;

    public _act!: MessageResponses;

    public constructor(element: JQuery, project: Project, checkpoint: Checkpoint) {
        this.project = project;
        listenTo(this, project);
        
        this.checkpoint = checkpoint;
        
        this.element = element;
        element.append(this.checkpoint.name + ": ");
        
        this.statusElem = $("<span></span>").appendTo(element);
    }

    @messageResponse("compilationFinished")
    private async onCompilationFinished() {

        if (await this.checkpoint.evaluate(this.project)) {
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

    public readonly stepLimit: number;

    private expected: (output: string) => boolean;
    
    private runner?: AsynchronousSimulationRunner;

    public constructor(name: string, expected: (output: string) => boolean, stepLimit: number = 1000) {
        super(name);
        this.expected = expected;
        this.stepLimit = stepLimit;
    }

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
        let runner = this.runner = new AsynchronousSimulationRunner(sim);
        try {
            await runner.stepToEnd(0, this.stepLimit);
            return sim.atEnd && this.expected(sim.allOutput);
        }
        catch {
            return false;
        }
    }
    
}

function getExerciseCheckpoints(projectName: string) {
    return EXERCISE_CHECKPOINTS[projectName] ?? [];
}

const EXERCISE_CHECKPOINTS : {[index: string]: readonly Checkpoint[]} = {
    "ch13_ex_1": [
        new IsCompiledCheckpoint("Compiles"),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output === "9 7 5 3 1 done!\n";
        })
    ]
}