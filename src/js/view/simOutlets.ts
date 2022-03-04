import { MemoryFrame } from "../core/runtime/Memory";
import { addListener, listenTo, MessageResponses, messageResponse, stopListeningTo, Message } from "../util/observe";
import { Int, ArrayPointerType, ArithmeticType, isArrayPointerType } from "../core/compilation/types";
import { Mutable, assert, isInstance } from "../util/util";
import { Simulation, SimulationOutputKind, SimulationEvent } from "../core/runtime/Simulation";
import { RuntimeConstruct } from "../core/constructs/CPPConstruct";
import { ProjectEditor, CompilationOutlet, CompilationStatusOutlet } from "./editors";
import { AsynchronousSimulationRunner, SynchronousSimulationRunner, asyncCloneSimulation, synchronousCloneSimulation } from "../core/runtime/simulationRunners";
import { PassByReferenceParameterEntity, PassByValueParameterEntity } from "../core/compilation/entities";
import { CPP_ANIMATIONS } from "./constructs/common";
import { FunctionCallOutlet } from "./constructs/FunctionCallOutlet";
import { FunctionOutlet } from "./constructs/FunctionOutlet";
import { ConstructOutlet } from "./constructs/ConstructOutlet";
import { RuntimeFunctionIdentifierExpression } from "../core/constructs/expressions/IdentifierExpression";
import { RuntimeAtomicDirectInitializer, RuntimeDirectInitializer } from "../core/constructs/initializers/DirectInitializer";
import { RuntimeExpression } from "../core/constructs/expressions/RuntimeExpression";
import { RuntimeFunction } from "../core/compilation/functions";
import { Exercise, Project } from "../core/Project";
import { IOState } from "../core/compilation/streams";
import { IstreamBufferOutlet } from "./IstreamBufferOutlet";
import { TemporaryObjectsCustomization, StackFrameCustomization } from "./memory/StackFrameOutlet";
import { MemoryOutlet } from "./memory/MemoryOutlet";

export const FADE_DURATION = 300;
export const SLIDE_DURATION = 400;
const VALUE_TRANSFER_DURATION = 500;


type SimulationButtonNames =
    "restart" |
    "stepForward" |
    "stepOver" |
    "stepOut" |
    "runToEnd" |
    "pause" |
    "stepBackward";

function findExactlyOne(element: JQuery, selector: string) {
    let found = element.find(selector);
    assert(found.length === 1, `Within the SimulationOutlet's element, there must be contained EXACTLY ONE element with the selector "${selector}".`);
    return found;
}

const DEFAULT_RUNNER_DELAY = 0;

export class SimulationOutlet {

    public readonly sim?: Simulation;

    private simRunner?: AsynchronousSimulationRunner;
    private runnerDelay = DEFAULT_RUNNER_DELAY;

    public readonly codeStackOutlet: CodeStackOutlet;
    public readonly memoryOutlet: MemoryOutlet;
    public readonly cinBufferOutlet: IstreamBufferOutlet;

    private readonly element: JQuery;
    private readonly runningProgressElem: JQuery;
    private readonly buttonElems: {[k in SimulationButtonNames]: JQuery};
    private readonly alertsElem: JQuery;

    private readonly consoleContentsElem: JQuery;
    private readonly cinEntryElem: JQuery;

    private breadcrumbs: number[] = [];

    public _act!: MessageResponses;

    public constructor(element: JQuery) {
        this.element = element;

        this.runningProgressElem = findExactlyOne(element, ".runningProgress");
        this.consoleContentsElem = findExactlyOne(element, ".lobster-console-contents");
        this.codeStackOutlet = new CodeStackOutlet(findExactlyOne(element, ".codeStack"));
        this.memoryOutlet = new MemoryOutlet(findExactlyOne(element, ".lobster-memory"));
        this.cinBufferOutlet = new IstreamBufferOutlet(findExactlyOne(element, ".lobster-cin-buffer"), "cin");

        let stepForwardNumElem = findExactlyOne(element, ".stepForwardNum").val(1);
        let stepBackwardNumElem = findExactlyOne(element, ".stepBackwardNum").val(1);

        this.buttonElems = {
            restart : element.find(".restart").on("click", () => {
                this.restart().catch(() => {});
            }),
    
            stepForward : element.find(".stepForward").on("click", () => {
                this.stepForward(parseInt(""+stepForwardNumElem.val())).catch(() => {});
            }),
    
            stepOver : element.find("button.stepOver").on("click", () => {
                this.stepOver().catch(() => {});
            }),
    
            stepOut : element.find("button.stepOut").on("click", () => {
                this.stepOut().catch(() => {});
            }),
    
            // skipToEnd : element.find("button.skipToEnd").on("click", () => {
            //     this.skipToEnd().catch(() => {});
            // }),
    
            runToEnd : element.find("button.runToEnd").on("click", () => {
                this.runToEnd().catch(() => {});
            }),
    
            pause : element.find("button.pause").on("click", () => {
                this.pause();
            }),
    
            stepBackward : element.find(".stepBackward").on("click", () => {
                this.stepBackward(parseInt(""+stepBackwardNumElem.val())).catch(() => {});
            }),
        };

        // element.find(".simPane").on("mousewheel", (e) => {
        //     if (e.ctrlKey) {
        //         self.mousewheel(e);
        //     }
        //     else{
        //         return true;
        //     }
        // });

        element.find(".stackFrames").on("mousedown", (e) => {
            element.find(".lobster-sim-pane").focus();
        });

        $(document).on("keydown", (e) => {
            //console.log(e.which);
            if (element.find(".lobster-sim-pane").addBack(".lobster-sim-pane").css("display") !== "none") {
                if (e.which == 39) {
                    this.stepForward().catch(() => {});
                    // e.preventDefault();
                    // e.stopPropagation();
                }
                else if (e.which == 37) {
                    if (this.buttonElems["stepBackward"].prop("disabled")) { return; }
                    this.stepBackward().catch(() => {});
                    // e.preventDefault();
                    // e.stopPropagation();
                }
            }
        });

        this.cinEntryElem = findExactlyOne(element, ".lobster-console-user-input-entry")
            .on("keydown", (e) => {
                if (e.which == 13) { // keycode 13 is <enter>
                    e.preventDefault();
                    let input = <string>this.cinEntryElem.val() || undefined;
                    if (!input) {
                        return;
                    }
                    this.cinEntryElem.val("");
                    this.sim?.cinInput(input + "\n")
                }
            });
        findExactlyOne(element, ".console").on("click", () => {
            if (!getSelection() || getSelection()?.toString() === "") {
                this.cinEntryElem.focus();
            }
        });

        this.alertsElem = element.find(".alerts");
        this.alertsElem.find("button").click(() => {
            this.hideAlerts();
        });
    }

    public setSimulation(sim: Simulation) {
        this.clearSimulation();
        (<Mutable<this>>this).sim = sim;
        listenTo(this, sim);
        this.simRunner = new AsynchronousSimulationRunner(this.sim!, this.runnerDelay);

        this.codeStackOutlet.setSimulation(sim);
        this.memoryOutlet.setMemory(sim.memory);
        this.cinBufferOutlet.setIstream(sim.cin);
        this.consoleContentsElem.html(sim.outputProduced.map(
            out => out.kind === SimulationOutputKind.COUT
                ? out.text
                : `<span class="lobster-console-user-input">${out.text}</span>`).join(""));
    }
    
    public clearSimulation() {
        this.codeStackOutlet.clearSimulation();
        this.memoryOutlet.clearMemory();
        this.cinBufferOutlet.clearIstream();

        if (this.sim) {
            stopListeningTo(this, this.sim);
        }
        delete (<Mutable<this>>this).sim;
        delete this.simRunner;
        this.breadcrumbs = [];
    }

    private refreshSimulation() {
        this.codeStackOutlet.refreshSimulation();
        if (this.sim) {
            this.memoryOutlet.setMemory(this.sim.memory)
            this.cinBufferOutlet.setIstream(this.sim.cin);
        }
        else {
            this.memoryOutlet.clearMemory();
            this.cinBufferOutlet.clearIstream();
        }
    }

    private setEnabledButtons(enabled: Partial<{[k in SimulationButtonNames]: boolean}>, enabledDefault: boolean = false) {
        (Object.keys(this.buttonElems) as SimulationButtonNames[]).forEach(buttonName => {
            if (enabled.hasOwnProperty(buttonName)) {
                this.buttonElems[buttonName].prop("disabled", !enabled[buttonName]);
            }
            else{
                this.buttonElems[buttonName].prop("disabled", !enabledDefault);
            }
        });
    }

    private async restart() {
        if (!this.sim) { return; }
        this.setEnabledButtons({}, true);
        await this.simRunner!.reset();
        while(!this.sim.globalAllocator.isDone) {
            await this.simRunner!.stepForward();
        }
        if (this.sim) {
            this.breadcrumbs = [];
        }
    }
    
    private async stepForward(n: number = 1) {
        if (!this.sim) { return; }
        // this.setAnimationsOn(true);
        if (n !== 1) {
            this.runningProgressElem.css("visibility", "visible");
        }
        
        this.leaveBreadcrumb();

        // let top = this.sim.top();
        // if (top instanceof RuntimeFunctionCall && top.model.func.firstDeclaration.context.isLibrary) {
        //     CPP_ANIMATIONS = false;
            await this.simRunner!.stepOverLibrary(n);
        //     CPP_ANIMATIONS = true;
        // }
        // else {
        //     await this.simRunner!.stepForward(n);
        // }


        if (n !== 1) {
            this.runningProgressElem.css("visibility", "hidden");
        }
    }
    
    private leaveBreadcrumb() {
        if (this.sim) {
            if (this.breadcrumbs.length === 0 || this.sim.stepsTaken !== this.breadcrumbs[this.breadcrumbs.length-1]) {
                this.breadcrumbs.push(this.sim.stepsTaken);
            }
        }
    }

    private async stepOver() {
        if (!this.sim) { return; }
        this.runningProgressElem.css("visibility", "visible");
        // this.setAnimationsOn(false);
        this.setEnabledButtons({"pause":true});

        this.leaveBreadcrumb();
        
        // this.sim.speed = Simulation.MAX_SPEED;
        await this.simRunner!.stepOver();

        // setTimeout(function() {this.setAnimationsOn(true);}, 10);
        
        this.runningProgressElem.css("visibility", "hidden");
        this.setEnabledButtons({
                "pause": false
            }, true);
        this.element.find(".simPane").focus();
    }

    private async stepOut() {
        if (!this.sim) { return; }
        this.runningProgressElem.css("visibility", "visible");
        
        // RuntimeConstruct.prototype.silent = true;
        // this.setAnimationsOn(false);
        this.setEnabledButtons({"pause":true});
        
        // this.sim.speed = Simulation.MAX_SPEED;

        this.leaveBreadcrumb();
        
        await this.simRunner!.stepOut();
        
        // RuntimeConstruct.prototype.silent = false;

        // setTimeout(function() {this.setAnimationsOn(true);}, 10);
        this.runningProgressElem.css("visibility", "hidden");
        this.setEnabledButtons({
            "pause": false
        }, true);
        this.element.find(".simPane").focus();
       
    }
    
    
    private async runToEnd() {
        if (!this.sim) { return; }
        this.runningProgressElem.css("visibility", "visible");
        

        //RuntimeConstruct.prototype.silent = true;
        // this.setAnimationsOn(false);
        this.setEnabledButtons({"pause":true});
        
        this.leaveBreadcrumb();
        
        // this.sim.speed = 1;
        await this.simRunner!.stepToEndOfMain();
        this.pause();


        //RuntimeConstruct.prototype.silent = false;
        //self.codeStackOutlet.refresh();
        // setTimeout(function() {self.setAnimationsOn(true);}, 10);
        //self.setEnabledButtons({
            //    skipToEnd: true,
            //    restart: true
            //}, false);
        this.runningProgressElem.css("visibility", "hidden");
    }
        
    // private async skipToEnd() {
    //         if (!this.sim) { return; }
    //         this.runningProgressElem.css("visibility", "visible");
            
    //         RuntimeConstruct.prototype.silent = true;
    //         this.setAnimationsOn(false);
    //         this.setEnabledButtons({"pause":true});

            
    //         this.sim.speed = Simulation.MAX_SPEED;
    //         this.sim.autoRun({after: function() {
    //             RuntimeConstruct.prototype.silent = false;
    //             self.codeStackOutlet.refresh();
    //             setTimeout(function() {self.setAnimationsOn(true);}, 10);
    //             //self.setEnabledButtons({
    //                 //    skipToEnd: true,
    //                 //    restart: true
    //                 //}, false);
    //                 self.runningProgressElem.css("visibility", "hidden");
    //     }});

        

        
    // }
    
    private pause() {
        if (!this.sim) { return; }
        this.simRunner!.pause();

        this.setEnabledButtons({
            "pause": false
        }, true);
        this.element.find(".simPane").focus();
        this.runningProgressElem.css("visibility", "hidden");
    }
    
    private async stepBackward(n: number = 1) {
        if (!this.sim) { return; }
        
        this.runningProgressElem.css("visibility", "visible");
                
        // RuntimeConstruct.prototype.silent = true;
        // this.setAnimationsOn(false);

        // Temporarily detach from simulation

        let breadcrumbs = this.breadcrumbs;
        let targetSteps = this.breadcrumbs.length >= n
            ? breadcrumbs.splice(this.breadcrumbs.length - n, n)[0]
            : this.sim.stepsTaken - n;

        let newSim = await asyncCloneSimulation(this.sim, targetSteps);
        // await this.simRunner!.stepBackward(n);

        // RuntimeConstruct.prototype.silent = false;
        this.setSimulation(newSim);
        this.breadcrumbs = breadcrumbs;
        // setTimeout(function() {this.setAnimationsOn(true);}, 10);
        this.setEnabledButtons({
            "pause": false
        }, true);
        this.runningProgressElem.css("visibility", "hidden");
    }
    
    
    // private setAnimationsOn(animOn: boolean) {
    //     if (animOn) {
    //         Outlets.CPP.CPP_ANIMATIONS = true;
    //         $.fx.off = false;
    //         $("body").removeClass("noTransitions").height(); // .height() is to force reflow

    //     }
    //     else{
    //         $("body").addClass("noTransitions").height(); // .height() is to force reflow
    //         $.fx.off = true;
    //         Outlets.CPP.CPP_ANIMATIONS = false; // TODO not sure I need this
    //     }
    // }
    
    private hideAlerts() {
        this.alertsElem.css("left", "450px");
        $(".codeInstance.current").removeClass("current");
    }
    
    @messageResponse("cout")
    private cout(msg: Message<string>) {
        this.consoleContentsElem.append(msg.data);
        this.element.find(".console").scrollTop(this.element.find(".console")[0].scrollHeight);
    }

    @messageResponse("cinInput")
    private onCinInput(msg: Message<string>) {
        this.consoleContentsElem.append(`<span class="lobster-console-user-input">${msg.data}</span>`);
        this.element.find(".console").scrollTop(this.element.find(".console")[0].scrollHeight);
    }

    @messageResponse("eventOccurred", "unwrap")
    private onEventOccurred(data: {event: SimulationEvent, message: string}) {
        if(data.event === SimulationEvent.ASSERTION_FAILURE) {
            this.consoleContentsElem.append(`<span class="lobster-console-error">${data.message + "\n"}</span>`);
            this.element.find(".console").scrollTop(this.element.find(".console")[0].scrollHeight);
        }
    }
    
    @messageResponse("reset")
    private reset() {
        //this.i_paused = true;
        this.setEnabledButtons({
            "pause": false
        }, true);
        this.element.find(".simPane").focus();
        this.runningProgressElem.css("visibility", "hidden");
        this.consoleContentsElem.html("");
    }

    @messageResponse("atEnded")
    private atEnded() {
        this.setEnabledButtons({
            restart: true,
            stepBackward: true
        },false);
        this.runningProgressElem.css("visibility", "hidden");
    }
}


export class DefaultLobsterOutlet {
    
    private projectEditor: ProjectEditor;
    private simulationOutlet: SimulationOutlet;
    
    public readonly project: Project;
    public readonly sim?: Simulation;

    private readonly element: JQuery;
    private readonly tabsElem: JQuery;
    // private readonly annotationMessagesElem: JQuery;

    public _act!: MessageResponses;

    public constructor(element: JQuery, project: Project) {
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
            .on("click", () => {
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

        
        element.find(".lobster-return-to-source").on("click", () => {
            this.clearSimulation();
            this.element.find(".lobster-source-tab").tab("show");
        });

        let co = element.find(".lobster-compilation-pane");
        if (co.length === 0) { co = $("#lobster-compilation-pane"); }
        new CompilationOutlet(co, this.project);

        new CompilationStatusOutlet(element.find(".compilation-status-outlet"), this.project);
        // new ProjectSaveOutlet(element.find(".project-save-outlet"), this.projectEditor);

        // this.annotationMessagesElem = element.find(".annotationMessages");
        // this.annotationMessagesElem.find("button").click(() => {
        //     this.hideAnnotationMessage();
        // });
        // this.afterAnnotation = [];
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







export const OutletCustomizations = {
    temporaryObjects : <TemporaryObjectsCustomization>{
        minimize: "hide"
    },
    func: <{[index: number]: StackFrameCustomization}>{
        
    }
};


export abstract class RunningCodeOutlet {

    protected element: JQuery;
    protected overlayElem: JQuery;
    protected stackFramesElem: JQuery;
    
    public readonly sim?: Simulation;
    
    public _act!: MessageResponses;

    public constructor(element: JQuery) {
        this.element = element;
        
        this.overlayElem = $("<div class='overlays'></div>");
        this.stackFramesElem = $("<div class='code-simStack'></div>");

        this.element.append(this.overlayElem);
        this.element.append(this.stackFramesElem);
    }

    public setSimulation(sim: Simulation) {
        this.clearSimulation();
        (<Mutable<this>>this).sim = sim;
        listenTo(this, sim);
        listenTo(this, sim.memory);
        this.refreshSimulation();
    }
    
    public clearSimulation() {
        if (this.sim) {
            stopListeningTo(this, this.sim);
            stopListeningTo(this, this.sim.memory);
        }
        delete (<Mutable<this>>this).sim;
        this.refreshSimulation();
    }


    public abstract pushFunction(rtFunc: RuntimeFunction) : void;
    public abstract popFunction() : void;

    public valueTransferOverlay(from: JQuery, to: JQuery, html: string, afterCallback?: () => void, duration: number = VALUE_TRANSFER_DURATION) {
        if (CPP_ANIMATIONS) {
            let simOff = this.element.offset();
            let fromOff = from.offset();
            let toOff = to.offset();
            let fromWidth = from.css("width");
            let toWidth = to.css("width");

            if (!simOff || !fromOff || !toOff) {
                return;
            }

            let over = $("<div class='code overlayValue'>" + html + "</div>");
            over.css({left: fromOff.left - simOff.left, top : fromOff.top - simOff.top + this.element[0].scrollTop});
            over.css({width: fromWidth});
            this.overlayElem.prepend(over);
            over.animate({
                left: toOff.left - simOff.left,
                top: toOff.top - simOff.top + this.element[0].scrollTop,
                width: toWidth
            }, duration, function () {
                afterCallback && afterCallback();
                $(this).remove();
            });
        }
        else{
            afterCallback && afterCallback();
        }
    }

    public abstract refreshSimulation() : void;

    @messageResponse("reset")
    private reset() {
        this.refreshSimulation();
    }

    @messageResponse("framePushed", "unwrap")
    private pushed(frame: MemoryFrame) {
        this.pushFunction(frame.func);
    }

    @messageResponse("popped")
    private popped(msg: Message<RuntimeConstruct>) {
        if (msg.data instanceof RuntimeFunction) {
            this.popFunction();
        }
    }

    // afterFullStep : function(inst) {
    //     if (!inst) { return; }
    //     
    //     inst.identify("idCodeOutlet", function(codeOutlet) {
    //         if (codeOutlet.simOutlet === self) {
    //             self.scrollTo(codeOutlet)
    //         }
    //     });
    // }

    // scrollTo : Class._ABSTRACT,

    // started : function() {
    //     $(".code-memoryObject .get").removeClass("get");
    // }

    // _act : {
    //     started: true,
    //     cleared: true,
    //     afterFullStep: true
    // }
}

export class CodeStackOutlet extends RunningCodeOutlet {

    private frameElems: JQuery[];
    private functionOutlets: FunctionOutlet[] = [];
    
    public _act!: MessageResponses;

    /**
     * Maps from runtime ID of a RuntimeFunction to the outlet
     * that represents the call to that function.
     */
    private callOutlets: {[index: number]: FunctionCallOutlet | undefined } = {};

    public constructor(element: JQuery) {
        super(element);

        this.element.addClass("code-simulation");

        this.frameElems = [];
        // this.framesElement = this.element;


        return this;
    }

    public pushFunction(rtFunc: RuntimeFunction) {
        //if (rtFunc.model.isImplicit()) {
        //    return;
        //}

        // Set up DOM element for outlet
        let frame = $("<div style= 'display: none'></div>");
        let functionElem = $("<div></div>");
        frame.append(functionElem);
        this.frameElems.push(frame);
        this.stackFramesElem.prepend(frame);

        // Create outlet using the element
        let funcOutlet = new FunctionOutlet(functionElem, rtFunc, this);
        this.functionOutlets.push(funcOutlet);

        // Animate!
        
        if (rtFunc.model.context.isLibrary) {
            // don't animate in
        }
        else if (CPP_ANIMATIONS) {
            (this.frameElems.length == 1 ? frame.fadeIn(FADE_DURATION) : frame.slideDown({duration: SLIDE_DURATION, progress: function() {
//                elem.scrollTop = elem.scrollHeight;
                }}));
        }
        else{
            frame.css({display: "block"});
//            this.element[0].scrollTop = this.element[0].scrollHeight;
        }


        return funcOutlet;
    }

    public popFunction() {
        //if (rtFunc.model.isImplicit()) {
        //    return;
        //}
        let popped = this.frameElems.pop()!;
        if (this.frameElems.length == 0 || !CPP_ANIMATIONS) {
            popped.remove();
        }
        else{
            popped.slideUp(SLIDE_DURATION, function() {
                $(this).remove();
            });
        }

        let funcOutlet = this.functionOutlets.pop()!;
        funcOutlet.removeInstance(); // TODO: may not be necessary since the function should remove itself when popped?
        stopListeningTo(this, funcOutlet);

    }

    public refreshSimulation() {
        this.frameElems = [];
        this.stackFramesElem.children().remove();
        this.functionOutlets.forEach(functionOutlet => functionOutlet.removeInstance());
        this.functionOutlets = [];
        this.callOutlets = {};
        
        if (!this.sim || this.sim.execStack.length === 0) {
            return;
        }

        this.sim.memory.stack.frames.forEach(frame => this.pushFunction(frame.func));
    }

    //refresh : Class.ADDITIONALLY(function() {
    //    this.frames.clear();
    //    this.stackFramesElem.children().remove();
    //}),

    // protected scrollTo(codeOutlet) {
    //     //
    //     //var thisTop = this.element.offset().top;
    //     //var codeTop = codeOutlet.element.offset().top;
    //     //this.element.finish().animate({
    //     //    scrollTop: codeOutlet.element.offset().top - self.stackFramesElem.offset().top
    //     //}, 1000);
    // }

    // @messageResponse("parameterPassedByReference", "unwrap")
    // protected parameterPassedByReference<T extends ObjectType>(data: {target: PassByReferenceParameterEntity<T>, arg: RuntimeExpression<T, "lvalue">}) {
    //     let {target, arg} = data;
    //     console.log("parameter passed by reference");
    //     console.log(`target function entity ID: ${target.calledFunction.entityId}, name: ${target.calledFunction.name}`);
    //     console.log(`parameter number: ${target.num}`);
    //     console.log(`arg construct ID: ${arg.model.constructId}`);
    //     console.log(`arg eval result name: ${arg.evalResult.name}, address: ${arg.evalResult.address}`);
    // }

    // @messageResponse("parameterPassedByAtomicValue", "unwrap")
    // protected parameterPassedByAtomicValue<T extends AtomicType>(data: {target: PassByValueParameterEntity<T>, arg: RuntimeExpression<T, "prvalue">}) {
    //     let {target, arg} = data;
    //     console.log("parameter passed by value");
    //     console.log(`target function entity ID: ${target.calledFunction.entityId}, name: ${target.calledFunction.name}`);
    //     console.log(`parameter number: ${target.num}`);
    //     console.log(`arg construct ID: ${arg.model.constructId}`);
    //     console.log(`arg eval result value: ${arg.evalResult.rawValue}, type: ${arg.evalResult.type}`);
    // }
    
    // @messageResponse("returnPassed", "unwrap")
    // protected returnPassed(rt: RuntimeDirectInitializer) {
    //     console.log("return passed");
    // }

    @messageResponse("childOutletAdded", "unwrap")
    protected childOutletAdded(data: {parent: ConstructOutlet, child: ConstructOutlet}) {
        listenTo(this, data.child);
    }

    @messageResponse("parameterPassed", "unwrap")
    protected valueTransferStart(data: {num: number, start: JQuery, html: string}) {
        let {num, start, html} = data;
        let paramOutlet = this.functionOutlets[this.functionOutlets.length - 1].parameterOutlets[num]
        let end = paramOutlet.passedValueElem;
        this.valueTransferOverlay(start, end, html, () => paramOutlet.setPassedContents(html));
    }
    
    @messageResponse("registerCallOutlet", "unwrap")
    protected functionCalled(data: {outlet: FunctionCallOutlet, func: RuntimeFunction}) {
        this.callOutlets[data.func.runtimeId] = data.outlet;
    }

    @messageResponse("returnPassed", "unwrap")
    protected returnPassed(data: {func: RuntimeFunction, start: JQuery, html: string, result: any}) {
        let {func, start, html, result} = data;
        let callOutlet = this.callOutlets[func.runtimeId];
        if (callOutlet?.returnOutlet) {
            let end = callOutlet.returnOutlet.returnDestinationElement;
            this.valueTransferOverlay(start, end, html, () => callOutlet?.returnOutlet?.setReturnedResult(result));
            delete this.callOutlets[func.runtimeId];
        }
    }
}






