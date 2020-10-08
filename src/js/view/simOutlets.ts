import { Memory, MemoryFrame } from "../core/runtimeEnvironment";
import { addListener, listenTo, MessageResponses, messageResponse, stopListeningTo, Message } from "../util/observe";
import * as SVG from "@svgdotjs/svg.js";
import { CPPObject, ArraySubobject, BaseSubobject, DynamicObject } from "../core/objects";
import { AtomicType, CompleteObjectType, Char, PointerType, BoundedArrayType, ArrayElemType, Int, CompleteClassType } from "../core/types";
import { Mutable, assert, isInstance } from "../util/util";
import { Simulation } from "../core/Simulation";
import { RuntimeConstruct } from "../core/constructs";
import { ProjectEditor, CompilationOutlet, ProjectSaveOutlet, CompilationStatusOutlet } from "./editors";
import { AsynchronousSimulationRunner, SynchronousSimulationRunner, asyncCloneSimulation, synchronousCloneSimulation } from "../core/simulationRunners";
import { BoundReferenceEntity, UnboundReferenceEntity, NamedEntity, PassByReferenceParameterEntity, PassByValueParameterEntity, MemberReferenceEntity } from "../core/entities";
import { FunctionOutlet, ConstructOutlet, FunctionCallOutlet } from "./codeOutlets";
import { RuntimeFunctionIdentifierExpression } from "../core/expressions";
import { RuntimeDirectInitializer } from "../core/initializers";
import { RuntimeExpression } from "../core/expressionBase";
import { RuntimeFunction } from "../core/functions";

const FADE_DURATION = 300;
const SLIDE_DURATION = 400;
const VALUE_TRANSFER_DURATION = 500;

const CPP_ANIMATIONS = true;

// export class CodeList {
    
//     private static instances: CodeList[] = [];

//     public static reloadLists() {
//         this.instances.forEach(ins => ins.loadList());
//     }

//     private element: JQuery;
//     private editor: CodeEditor;


//     public constructor(element: JQuery, url: string, editor: CodeEditor, personal: boolean) {
//         this.initParent(element);
//         this._instances.push(this);
//         element.addClass("codeList");

//         this.editor = editor;
//         // this.editor.converse(this);

//         this.personal = personal;
//         if (personal) {
//             CodeList._personalList = this;
//         }


//         
// //        self.setList(["fact.cpp", "hailstone.cpp", "countDigits.cpp"]);
//         this.url = url;
//         this.programs = {};
//         this.loadList();
//     },

//     loadList : function() {
//         
//         $.ajax({
//             type: "POST",
//             url: this.url + "codeList",
//             data: {idtoken: ID_TOKEN},
//             success: function(data) {
//                 self.setList(data);
//                 CodeList.ajaxSuccessful = true;
//             },
//             dataType: "json"
//         });
//     },

//     setList : function(codeList) {
//         

//         // Was one active before?
// //        this.element.find("")

//         this.programs = {};

//         this.element.empty();
//         for(var i = 0; i < codeList.length; i++) {
//             var program = codeList[i];
//             //console.log(JSON.stringify(program));
//             var isPublic = false;
//             if(typeof program !== "string") {
//                 isPublic = program.isPublic;
//                 program = program.name;
//             }

//             var item = $("<div></div>");
//             if (this.personal) {
//                 var checkbox = $('<input type="checkbox" name="isPublic" value="'+program+'" />');
//                 checkbox[0].checked = (isPublic === "1");
//                 item.append(checkbox);
//                 checkbox.change(function() {
//                     //console.log(JSON.stringify({name: $(this).val(), isPublic: $(this)[0].checked}));
//                     $.post("api/me/setCodePublic", {idtoken: ID_TOKEN, name: $(this).val(), isPublic: $(this)[0].checked}, function() {
//                         console.log("success");
//                     });
//                 });
//             }
//             var link = $('<span class="link">'+program+'</span>');
//             item.append(link);
//             link.click(function() {
//                 if(self.loadCode($(this).html())) {
//                     $(this).addClass("active");
//                 }
//             });

//             this.element.append(item);
//             this.programs[program] = true;
//         }
//     },

//     loadCode : function(name, who) {
//         // TODO NEW put something like this back in somewhere
//         // if(!this.editor.isSaved() && !confirm("Your code has unsaved changes, and loading a file will overwrite them. Are you sure?")) {
//         //     return;
//         // }
//         if(!this.personal && CodeList._personalList && CodeList._personalList.programs[name] && !confirm("WARNING! Loading code from the class repository will overwrite your local copy of the same name! Are you sure?")) {
//             return;
//         }
//         

//         if (who) {
//             $.ajax({
//                 type: "POST",
//                 url: "api/user/" + who + "/" + name,
//                 data: {idtoken: ID_TOKEN},
//                 success: function (data) {
//                     if (!data) {
//                         alert("Program not found! (It is either private or doesn't exist.)")
//                         return;
//                     }
//                     self.send("loadCode", {name: who + "_" + name, code: data});
//                     document.title = name;
//                     $(".codeList .active").removeClass("active");
//                 },
//                 dataType: "text"
//             });

//         }
//         else{
//             $.ajax({
//                 type: "POST",
//                 url: this.url + (this.personal ? "code/" : "course/code/eecs280f16/") + name,
//                 data: {idtoken: ID_TOKEN},
//                 success: function (data) {
//                     if (!data) {
//                         if (name === "program.cpp") {
//                             self.send("loadCode", {name: name, code: "int main() {\n  \n}"});
//                             document.title = name;
//                             $(".codeList .active").removeClass("active");
//                         }
//                         else{
//                             alert("Program not found :(.");
//                         }
//                     }
//                     self.send("loadCode", {name: name, code: data});
//                     document.title = name;
//                     $(".codeList .active").removeClass("active");
//                 },
//                 dataType: "text"
//             });
//         }
//         return true;
//     },
//     _act: {
//         saved: function() {
//             this.loadList();
//         }
//     }

// });

// var ProjectList = Lobster.Outlets.CPP.ProjectList = Class.extend(Observable, {
//     _name: "ProjectList",

//     API_URL : "/api/me/project/list",

//     // element should be a jquery object
//     init: function(element) {
//         this.i_element = element;
//         element.addClass("projectList");

//         this.refresh();
//     },

//     refresh : function() {
//         this.ajax({
//             type: "GET",
//             url: this.API_URL,
//             success: function(data) {
//                 this.i_setList(data);
//             },
//             dataType: "json"
//         });
//     },

//     i_setList : function(projects) {
//         

//         this.i_element.empty();

//         for(var i = 0; i < projects.length; i++) {
//             var project = projects[i];
//             var item = $("<li></li>");
//             var link = $('<a class="link lobster-code" data-toggle="pill">' + project["project"] + '</a>');
//             item.append(link);
//             link.click(function() {
//                 self.send("loadProject", $(this).html());
//             });

//             this.i_element.append(item);
//         }
//     }

// });



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

const DEFAULT_RUNNER_DELAY = 1000;

export class SimulationOutlet {

    public readonly sim?: Simulation;

    private simRunner?: AsynchronousSimulationRunner;
    private runnerDelay = DEFAULT_RUNNER_DELAY;

    public readonly codeStackOutlet: CodeStackOutlet;
    public readonly memoryOutlet: MemoryOutlet;

    private readonly element: JQuery;
    private readonly runningProgressElem: JQuery;
    private readonly buttonElems: {[k in SimulationButtonNames]: JQuery};
    private readonly alertsElem: JQuery;

    private readonly consoleElems: JQuery;

    public _act!: MessageResponses;

    public constructor(element: JQuery) {
        this.element = element;

        this.runningProgressElem = findExactlyOne(element, ".runningProgress");
        this.consoleElems = findExactlyOne(element, ".console");
        this.codeStackOutlet = new CodeStackOutlet(findExactlyOne(element, ".codeStack"));
        this.memoryOutlet = new MemoryOutlet(findExactlyOne(element, ".memory"));

        let stepForwardNumElem = findExactlyOne(element, ".stepForwardNum").val(1);
        let stepBackwardNumElem = findExactlyOne(element, ".stepBackwardNum").val(1);

        this.buttonElems = {
            restart : element.find(".restart").click(() => {
                this.restart().catch(() => {});
            }),
    
            stepForward : element.find(".stepForward").click(() => {
                this.stepForward(parseInt(""+stepForwardNumElem.val())).catch(() => {});
            }),
    
            stepOver : element.find("button.stepOver").click(() => {
                this.stepOver().catch(() => {});
            }),
    
            stepOut : element.find("button.stepOut").click(() => {
                this.stepOut().catch(() => {});
            }),
    
            // skipToEnd : element.find("button.skipToEnd").click(() => {
            //     this.skipToEnd().catch(() => {});
            // }),
    
            runToEnd : element.find("button.runToEnd").click(() => {
                this.runToEnd().catch(() => {});
            }),
    
            pause : element.find("button.pause").click(() => {
                this.pause();
            }),
    
            stepBackward : element.find(".stepBackward").click(() => {
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
            element.find("#simPane").focus();
        });

        $(document).on("keydown", (e) => {
            //console.log(e.which);
            if (element.find("#simPane").css("display") !== "none") {
                if (e.which == 39) {
                    this.stepForward().catch(() => {});
                    e.preventDefault();
                    e.stopPropagation();
                }
                else if (e.which == 37) {
                    if (this.buttonElems["stepBackward"].prop("disabled")) { return; }
                    this.stepBackward().catch(() => {});
                    e.preventDefault();
                    e.stopPropagation();
                }
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
    }
    
    public clearSimulation() {
        this.codeStackOutlet.clearSimulation();
        this.memoryOutlet.clearMemory();

        if (this.sim) {
            stopListeningTo(this, this.sim);
        }
        delete (<Mutable<this>>this).sim;
        delete this.simRunner;
    }

    private refreshSimulation() {
        this.codeStackOutlet.refreshSimulation();
        if (this.sim) {
            this.memoryOutlet.setMemory(this.sim.memory)
        }
        else {
            this.memoryOutlet.clearMemory();
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
    }
    
    private async stepForward(n: number = 1) {
        if (!this.sim) { return; }
        // this.setAnimationsOn(true);
        this.runningProgressElem.css("visibility", "visible");
        await this.simRunner!.stepForward(n);
        this.runningProgressElem.css("visibility", "hidden");
    }
    
    private async stepOver() {
        if (!this.sim) { return; }
        this.runningProgressElem.css("visibility", "visible");
        // this.setAnimationsOn(false);
        this.setEnabledButtons({"pause":true});
        
        // this.sim.speed = Simulation.MAX_SPEED;
        await this.simRunner!.stepOver();
        
        this.refreshSimulation();

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
        
        await this.simRunner!.stepOut();
        
        // RuntimeConstruct.prototype.silent = false;
        this.refreshSimulation();

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
        
        
        // this.sim.speed = 1;
        await this.simRunner!.stepToEnd();


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
        let newSim = await asyncCloneSimulation(this.sim, this.sim.stepsTaken - 1);
        // await this.simRunner!.stepBackward(n);

        // RuntimeConstruct.prototype.silent = false;
        this.setSimulation(newSim);
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
        this.consoleElems.html(msg.data);
    }
    
    @messageResponse("reset")
    private reset() {
        //this.i_paused = true;
        this.setEnabledButtons({
            "pause": false
        }, true);
        this.element.find(".simPane").focus();
        this.runningProgressElem.css("visibility", "hidden");
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
    
    public projectEditor: ProjectEditor;
    public simulationOutlet: SimulationOutlet;
    
    public readonly sim?: Simulation;

    private readonly element: JQuery;
    private readonly tabsElem: JQuery;
    // private readonly annotationMessagesElem: JQuery;

    public _act!: MessageResponses;

    public constructor(element: JQuery) {
        this.element = element;

        // Set up simulation and source tabs
        // var sourceTab = element.find(".sourceTab");
        // var simTab = element.find(".simTab");

        this.tabsElem = element.find(".lobster-simulation-outlet-tabs");

        this.projectEditor = new ProjectEditor(element.find("#sourcePane"));

        // TODO: HACK to make codeMirror refresh correctly when sourcePane becomes visible
        this.tabsElem.find('a[href="#sourcePane"]').on("shown.bs.tab", () => {
            this.projectEditor.refreshEditorView();
        });

        this.simulationOutlet = new SimulationOutlet(element.find("#simPane"));


        let runButtonElem = element.find(".runButton")
            .click(() => {
            let program = this.projectEditor.program;
            if (program.isRunnable()) {
                this.simulationOutlet.setSimulation(new Simulation(program));
            }
            $("#simulateTab").tab("show");
        });

        new CompilationOutlet(element.find("#compilationPane"), this.projectEditor);

        new CompilationStatusOutlet(element.find(".compilation-status-outlet"), this.projectEditor);
        new ProjectSaveOutlet(element.find(".project-save-outlet"), this.projectEditor);

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
            this.tabsElem.find('a[href="#sourcePane"]').tab("show");
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



// var SVG_DEFS : {[index: string]: ???} = {};


export class MemoryOutlet {

    public readonly memory?: Memory;
    
    public readonly temporaryObjectsOutlet?: TemporaryObjectsOutlet;
    public readonly stackFramesOutlet?: StackFramesOutlet;
    public readonly heapOutlet?: HeapOutlet;

    private readonly element: JQuery;
    private readonly svgElem: JQuery;
    private readonly svg: SVG.Dom;
    
    public _act!: MessageResponses;
    
    public constructor(element: JQuery) {
        
        this.element = element.addClass("memory");

        this.svgElem = $('<div style="position: absolute; width: 100%; height: 100%; pointer-events: none; z-index: 10"></div>');
        this.svg = SVG.SVG(this.svgElem[0]);
        // SVG_DEFS.arrowStart = this.svg.marker(6, 6, function(add) {
        //     add.circle(5);
        // }).style({
        //     stroke: "#000000",
        //     fill: "#FFFFFF",
        //     "stroke-width": "1px"
        // });
        // SVG_DEFS.arrowEnd = this.svg.marker(12, 12, function(add) {
        //     add.path("M0,2 L0,11 L8,6 L0,2");
        // }).style({
        //     stroke: "#000000",
        //     fill: "#FFFFFF",
        //     "stroke-width": "1px"
        // });


        this.element.append(this.svgElem);

    }

    public setMemory(memory: Memory) {
        this.clearMemory();
        (<Mutable<this>>this).memory = memory;
        listenTo(this, memory);
        
        (<Mutable<this>>this).temporaryObjectsOutlet = new TemporaryObjectsOutlet($("<div></div>").appendTo(this.element), memory, this);
        (<Mutable<this>>this).stackFramesOutlet = new StackFramesOutlet($("<div></div>").appendTo(this.element), memory, this);
        (<Mutable<this>>this).heapOutlet = new HeapOutlet($("<div></div>").appendTo(this.element), memory, this);
    }
    
    public clearMemory() {
        delete (<Mutable<this>>this).temporaryObjectsOutlet;
        delete (<Mutable<this>>this).stackFramesOutlet;
        delete (<Mutable<this>>this).heapOutlet;

        this.element.children().filter((index, element) => element !== this.svgElem[0]).remove();

        if (this.memory) {
            stopListeningTo(this, this.memory);
        }
        delete (<Mutable<this>>this).memory;
    }

    // private updateArrow : function(arrow, start, end) {
    //     start = start || arrow && arrow.oldStart;
    //     end = end || arrow && arrow.oldEnd;

    //     if (arrow && arrow.oldStart && arrow.oldEnd &&
    //         arrow.oldStart.left === start.left && arrow.oldStart.top === start.top &&
    //         arrow.oldEnd.left === end.left && arrow.oldEnd.top === end.top) {
    //         return arrow;
    //     }

    //     var oldStart = {left:start.left,top:start.top};
    //     var oldEnd = {left:end.left, top:end.top};

    //     var off = this.svgElem.offset();
    //     start.left = start.left - off.left;
    //     start.top = start.top - off.top;
    //     end.left = end.left - off.left;
    //     end.top = end.top - off.top;
    //     if (arrow) {
    //         // If arrow already exists, just update it
    //         if (Outlets.CPP.CPP_ANIMATIONS) {
    //             arrow.animate(300).plot([[start.left,start.top],[end.left,end.top]]/*"M"+start.left+","+start.top+" L"+(end.left+50)+","+end.top*/);
    //         }
    //         else{
    //             arrow.plot([[start.left,start.top],[end.left,end.top]]/*"M"+start.left+","+start.top+" L"+(end.left+50)+","+end.top*/);
    //         }
    //     }
    //     else{
    //         arrow = this.svg.polyline([[start.left,start.top],[end.left,end.top]]/*"M"+start.left+","+start.top+" L"+end.left+","+end.top*/).style({
    //             stroke: "#ccccff",
    //             "stroke-width": "1px",
    //             fill: "none"
    //         });
    //         arrow.marker("start", SVG_DEFS.arrowStart);
    //         arrow.marker("end", SVG_DEFS.arrowEnd);
    //     }

    //     arrow.oldStart = oldStart;
    //     arrow.oldEnd = oldEnd;
    //     return arrow;
    // },
}

export abstract class MemoryObjectOutlet<T extends CompleteObjectType = CompleteObjectType> {

    public readonly object: CPPObject<T>;
    
    protected readonly memoryOutlet: MemoryOutlet;
    
    protected readonly element: JQuery;
    protected abstract readonly objElem: JQuery;
    private svgElem? : JQuery;
    private svg?: SVG.Dom;
    
    public _act!: MessageResponses;

    public constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet) {
        this.element = element.addClass("code-memoryObject");
        this.object = object;
        this.memoryOutlet = memoryOutlet;

        listenTo(this, object);
    }

    protected abstract updateObject() : void;

    @messageResponse("valueRead")
    @messageResponse("byteRead")
    @messageResponse("bytesRead")
    protected valueRead() {
        this.objElem.addClass("get");
    }

    @messageResponse("valueWritten")
    @messageResponse("byteWritten")
    @messageResponse("bytesWritten")
    protected valueWritten() {
        this.updateObject();
        this.objElem.addClass("set");
    }

    @messageResponse("deallocated")
    protected deallocated() {
        this.element.addClass("deallocated");
    }

    @messageResponse("leaked")
    protected leaked() {
        this.element.addClass("leaked");
    }

    @messageResponse("unleaked")
    protected unleaked() {
        //this.element.removeClass("leaked"); // TODO: why is this commented?
    }

    @messageResponse("validitySet")
    protected validitySet(isValid: boolean) {
        if (isValid) {
            this.objElem.removeClass("invalid");
        }
        else{
            this.objElem.addClass("invalid");
        }
    }

    @messageResponse("callReceived")
    protected callReceived() {
        this.element.addClass("receiver");
    }

    @messageResponse("callEnded")
    protected callEnded() {
        this.element.removeClass("receiver");
    }

    @messageResponse("findOutlet")
    protected findOutlet(callback: (t: this) => void) {
        callback(this);
    }

    protected useSVG() {
        this.svgElem = $('<div style="position: absolute; width: 100%; height: 100%; left: 0px; top: 0px; pointer-events: none"></div>');
        this.svg = SVG.SVG(this.svgElem[0]);
        this.element.append(this.svgElem);
    }

    //makeArrow(start, end) {
    //    var off = this.svgElem.offset();
    //    start.left = start.left - off.left;
    //    start.top = start.top - off.top;
    //    end.left = end.left - off.left;
    //    end.top = end.top - off.top;
    //    if (!this.arrow) {
    //        this.arrow = this.svg.polyline([[start.left,start.top],[end.left,end.top]]/*"M"+start.left+","+start.top+" L"+end.left+","+end.top*/).style({
    //            stroke: "#ccccff",
    //            "stroke-width": "1px",
    //            fill: "none"
    //        });
    //        this.arrow.marker("start", SVG_DEFS.arrowStart);
    //        this.arrow.marker("end", SVG_DEFS.arrowEnd);
    //    }
    //    else{
    //        if (Outlets.CPP.CPP_ANIMATIONS) {
    //            this.arrow.animate(300).plot([[start.left,start.top],[end.left,end.top]]/*"M"+start.left+","+start.top+" L"+(end.left+50)+","+end.top*/);
    //        }
    //        else{
    //            this.arrow.plot([[start.left,start.top],[end.left,end.top]]/*"M"+start.left+","+start.top+" L"+(end.left+50)+","+end.top*/);
    //        }
    //    }
    //    return this.arrow;
    //}

}

export class SingleMemoryObject<T extends AtomicType> extends MemoryObjectOutlet<T> {

    protected readonly addrElem : JQuery;
    protected readonly objElem : JQuery;

    public constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet) {
        super(element, object, memoryOutlet);
        
        this.element.addClass("code-memoryObjectSingle");

        this.addrElem = $("<div class='address'>0x"+this.object.address+"</div>");
        this.element.append(this.addrElem);

        this.objElem = $("<div class='code-memoryObject-object'>" + this.object.getValue().valueString() + "</div>");
        this.element.append(this.objElem);

        if (this.object.name) {
            this.element.append("<span> </span>");
            this.element.append($("<div class='entity'>" + (this.object.name || "") + "</div>"));
        }

        this.updateObject();
        
    }

    protected updateObject() {
        var elem = this.objElem;
        var str = this.object.getValue().valueString();
        if (this.object.type.isType(Char)) {
            str = str.substr(1,str.length-2);
        }
        elem.html(str);
        if (this.object.isValueValid()) {
            elem.removeClass("invalid");
        }
        else{
            elem.addClass("invalid");
        }
    }
}


// TODO: should this really extends SingleMemoryObject? it completely overrides updateObject,
//       so the might not really be much useful that's inherited. Or maybe better, SingleMemoryObject
//       should make updateObject abstract and the default behavior there should move to a new subclass
//       like RegularMemoryObject or something like that.
export class PointerMemoryObject<T extends PointerType<CompleteObjectType>> extends SingleMemoryObject<T> {
    
    private static instances : PointerMemoryObject<PointerType<CompleteObjectType>>[] = [];
    public static updateArrows() {
        this.instances = this.instances.filter((ptrMemObj) => {
            if (jQuery.contains($("body")[0], ptrMemObj.element[0])) {
                ptrMemObj.updateArrow();
                return true;
            }
            else{ //Element is detached
                ptrMemObj.clearArrow();
                return false;
            }
        });
    }

    public readonly pointedObject? : CPPObject<T["ptrTo"]>;

    private readonly ptdArrayElem : JQuery;
    private arrow?: SVG.Polyline;

    public constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet) {
        super(element, object, memoryOutlet);

        this.useSVG();

        this.objElem.css("white-space", "pre");
        this.ptdArrayElem = $('<div class="ptd-array"></div>');
        this.element.append(this.ptdArrayElem);

        PointerMemoryObject.instances.push(this); // TODO: memory leak
    }

    private updateArrow() {
        if (!this.pointedObject || !this.pointedObject.isAlive) {
            this.clearArrow();
        }
        else if (this.object.type.isArrayPointerType()) {
            // this.makeArrayPointerArrow();
        }
        else if (this.object.type.isObjectPointerType()) {
            // this.makeObjectPointerArrow();
        }
    }

    private clearArrow() {
        if (this.arrow) { this.arrow.remove(); }
        delete this.arrow;
    }

    protected updateObject() {
        var elem = this.objElem;

        let newPointedObject : CPPObject | undefined;
        if (this.object.type.isArrayPointerType()) {
            newPointedObject = this.object.type.arrayObject;
        }
        else if (this.object.type.isObjectPointerType()) {
            newPointedObject = this.object.type.getPointedObject();
        }

        if (this.pointedObject !== newPointedObject) {
            if (this.pointedObject) {
                stopListeningTo(this, this.pointedObject);
            }

            (<Mutable<this>>this).pointedObject = newPointedObject;

            if (this.pointedObject) {
                listenTo(this, this.pointedObject);
            }
            else{
                this.clearArrow();
            }
        }

        elem.html(this.object.getValue().valueString());

        if (this.object.isValueValid()) {
            elem.removeClass("invalid");
        }
        else{
            elem.addClass("invalid");
        }
    }
    
    protected deallocated() {
        this.updateObject();
    }

    // setPtdArray : function(arrObj) {
    //     //// If null, change to non-pointer array
    //     //if (arrObj === null) {
    //     //    if (this.ptdArray !== null) {
    //     //        this.ptdArrayElem.slideUp(function() {$(this).empty()});
    //     //    }
    //     //    this.arrow && this.arrow.remove();
    //     //    this.arrow = null;
    //     //    this.ptdArray = null;
    //     //    this.ptdArrayOutlet = null;
    //     //    return;
    //     //}
    //     //
    //     //
    //     //// Not null here
    //     //if (this.ptdArray !== arrObj) {
    //     //    if (!this.ptdArray) {
    //     //        this.ptdArray = arrObj;
    //     //        this.ptdArrayOutlet = Outlets.CPP.ArrayMemoryObject.instance(this.ptdArrayElem, this.ptdArray, this.memoryOutlet);
    //     //        // Set arrow to point to appropriate place
    //     //
    //     //        this.ptdArrayElem.slideDown(function() {
    //     //            // Set arrow to point to appropriate place
    //     //            if (self.ptdArray) {
    //     //                self.makePointerArrow();
    //     //            }
    //     //        });
    //     //    }
    //     //    else{
    //     //        this.arrow && this.arrow.remove();
    //     //        this.arrow = null;
    //     //        this.ptdArrayElem.empty();
    //     //        this.ptdArray = arrObj;
    //     //        this.ptdArrayOutlet = Outlets.CPP.ArrayMemoryObject.instance(this.ptdArrayElem, this.ptdArray, this.memoryOutlet);
    //     //        // Set arrow to point to appropriate place
    //     //        if (self.ptdArray) {
    //     //            self.makePointerArrow();
    //     //        }
    //     //    }
    //     //}
    //     //else{
    //     //    if (self.ptdArray) {
    //     //        self.makePointerArrow();
    //     //    }
    //     //}


    // },

    
    // makeObjectPointerArrow : function() {
    //     if (!this.pointedObject) {
    //         return;
    //     }
    //     var endOff;
    //     var pointedOutlet;
    //     if (this.pointedObject.isAlive()) {
    //         this.pointedObject.send("findOutlet", function (outlet) {
    //             pointedOutlet = pointedOutlet || outlet;
    //         });
    //         if (pointedOutlet) {
    //             endOff = pointedOutlet.objElem.offset();
    //             endOff.left += pointedOutlet.objElem.outerWidth()/2;
    //             //endOff.top += pointedOutlet.objElem.outerHeight();

    //             var startOff = this.objElem.offset();
    //             startOff.left += this.objElem.outerWidth()/2;

    //             // If start is below end (greater offset), we move top of end to bottom.
    //             if (startOff.top > endOff.top && pointedOutlet) {
    //                 endOff.top += pointedOutlet.objElem.outerHeight();
    //             }
    //             else{
    //                 startOff.top += this.objElem.outerHeight();
    //             }


    //             this.arrow = this.memoryOutlet.updateArrow(this.arrow, startOff, endOff);
    //         }
    //     }
    // },
    // makeArrayPointerArrow : function() {

    //     var value = this.object.rawValue();
    //     var type = this.object.type;
    //     var off;
    //     var arrayOutlet;
    //     var elem;

    //     if (this.pointedObject.isAlive()) {
    //         this.pointedObject.send("findOutlet", function(outlet) { arrayOutlet = arrayOutlet || outlet; });
    //         if (!arrayOutlet) {
    //             // do nothing
    //             return;
    //         }
    //         else if (value < type.min()) {
    //             var first = arrayOutlet.elemOutlets[0].objElem;
    //             off = first.offset();
    //             var n = type.toIndex(value);
    //             off.left += (n + 0.5) * first.outerWidth() * 0.8;
    //         }
    //         else if (value === type.onePast()) {
    //             var last = elem = arrayOutlet.elemOutlets[type.arrObj.type.length - 1].objElem;
    //             off = last.offset();
    //             off.left += 0.5 * last.outerWidth() * 0.8;
    //             off.top += 1.5 * last.outerHeight() * 0.8;
    //         }
    //         else if (value > type.onePast()) {
    //             var last = elem = arrayOutlet.elemOutlets[type.arrObj.type.length - 1].objElem;
    //             off = last.offset();
    //             var n = type.toIndex(value) - type.arrObj.type.length;
    //             off.left += (n + 1.5) * last.outerWidth() * 0.8;
    //         }
    //         else {
    //             var index = type.toIndex(value);
    //             elem = arrayOutlet.elemOutlets[index].objElem;
    //             //elem.css("background-color", "red");
    //             off = elem.offset();
    //             off.left += elem.outerWidth() / 2 * 0.8;
    //         }
    //     }
    //     //off.top -= 2;
    //     var beginOff = this.objElem.offset();
    //     beginOff.left += this.objElem.outerWidth()/2;


    //     // If start is below end (greater offset), we move top of end to bottom.
    //     if (off && beginOff.top > off.top) {
    //         off.top += elem.outerHeight();
    //     }
    //     else{
    //         beginOff.top += this.objElem.outerHeight();
    //     }

    //     this.arrow = this.memoryOutlet.updateArrow(this.arrow, beginOff, off);
    // }
}

// setInterval(function() {
//     var temp = Outlets.CPP.CPP_ANIMATIONS;
//     Outlets.CPP.CPP_ANIMATIONS = false;
//     Outlets.CPP.PointerMemoryObject.updateArrows();
//     Outlets.CPP.CPP_ANIMATIONS = temp;
// }, 20);

export class ReferenceMemoryOutlet<T extends CompleteObjectType = CompleteObjectType> {

    public readonly entity: (UnboundReferenceEntity | BoundReferenceEntity) & NamedEntity;
    public readonly object?: CPPObject<T>;
    
    private readonly element: JQuery;
    private readonly addrElem: JQuery;
    private readonly objElem: JQuery;

    public constructor(element: JQuery, entity: UnboundReferenceEntity & NamedEntity) {
        this.element = element;
        this.entity = entity;

        this.element.addClass("code-memoryObjectSingle");

        this.addrElem = $("<td class='address'></td>");
        this.objElem = $("<td><div class='entity'>"+(entity.name || "")+
            "</div><div class='code-memoryObject-object'>"+
            "</div></td>");
        this.element.append("<table><tr></tr></table>");
        this.element.find("tr").append(this.addrElem).append(this.objElem);
        this.objElem = this.objElem.find(".code-memoryObject-object");

        return this;
    }

    public bind(object: CPPObject<T>) {
        (<Mutable<this>>this).object = object;

        if (object.name) {
            this.objElem.html(object.name);
        }
        else{
            this.objElem.html("@"+object.address);
        }
    }
}

export class ArrayMemoryObject<T extends ArrayElemType> extends MemoryObjectOutlet<BoundedArrayType<T>> {

    protected readonly objElem : JQuery;
    private readonly nameElem: JQuery;
    private readonly addrElem : JQuery;

    private readonly elemOutlets: MemoryObjectOutlet[];

    public constructor(element: JQuery, object: CPPObject<BoundedArrayType<T>>, memoryOutlet: MemoryOutlet) {
        super(element, object, memoryOutlet);

        this.element.addClass("code-memoryObjectArray");

        this.addrElem = $("<div class='address'>0x"+this.object.address+"</div>");
        this.nameElem = $('<div class="entity">'+(this.object.name || "")+'</div>');
        this.objElem = $("<div class='array'></div>");

        this.elemOutlets = this.object.getArrayElemSubobjects().map((elemSubobject: ArraySubobject<T>, i: number) => {
            let elemElem = $('<div></div>');
            let elemContainer = $('<div style="display: inline-block; margin-bottom: 5px; text-align: center" class="arrayElem"></div>');
            elemContainer.append(elemElem);
            elemContainer.append('<div style="line-height: 1ch; font-size: 6pt">'+i+'</div>');
            this.objElem.append(elemContainer);
            if (elemSubobject.type.isPotentiallyCompleteClassType()) {
                return createMemoryObjectOutlet(elemElem, elemSubobject, this.memoryOutlet);
            }
            else{
                return new ArrayElemMemoryObjectOutlet(elemElem, <ArraySubobject<AtomicType>>elemSubobject, this.memoryOutlet);
            }

            // 2D array
            // if (isA(this.object.type.elemType, Types.Array)) {
            //     this.objElem.append("<br />");
            // }
            //else{
            //    this.objElem.append("<br />");
            //}
//            if (i % 10 == 9) {
//                this.objElem.append("<br />");
            // }
        });

        this.updateObject();
        this.element.append(this.addrElem);
        this.element.append(this.nameElem).append(this.objElem);
    }

    protected updateObject() {
        // I think nothing to do here, since the array subobjects should update themselves?
//        var elemType = this.object.type.elemType;
//        var value = this.object.getValue();
//        for(var i = 0; i < this.length; ++i) {
//            this.elemOutlets[i].updateObject();
//        }
    }

//    updateElems : function(addr, length, func) {
//        var endAddr = addr + length;
//        var beginIndex = Math.floor(( addr - this.object.address ) / this.object.type.elemType.size);
//        var endIndex = Math.min(
//            beginIndex + Math.ceil(length / this.object.type.elemType.size),
//            this.object.type.length);
//
//        for(var i = beginIndex; i < endIndex; ++i) {
//            var elem = this.elemObjects[i];
//            elem[func](Math.max(this.elemObject[i]));
//        }
//    },

//     valueRead: function () {
// //        this.element.find(".code-memoryObject-object").addClass("get");
//     },
//     byteRead: function (data) {
// //        this.updateElems(data.addr, 1, "get")
//     },
//     bytesRead: function (data) {
// //        this.updateElems(data.addr, data.length, "get")
//     },

//     valueWritten: function () {
// //        this.updateObject();
// //        this.element.find(".code-memoryObject-object").addClass("set");
//     },
//     byteWritten: function (data) {
// //        this.updateObject();
// //        this.updateElems(data.addr, 1, "set")
//     },
//     bytesWritten: function (data) {
// //        this.updateObject();
// //        this.updateElems(data.addr, data.values.length, "set")
//     }
}

export class ArrayElemMemoryObjectOutlet<T extends AtomicType> extends MemoryObjectOutlet<T> {

    protected readonly objElem : JQuery;

    public constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet) {
        super(element, object, memoryOutlet);

        this.element.addClass("array");
        this.objElem = $('<span class="code-memoryObject-object"></span>');
        this.element.append(this.objElem);

        this.updateObject();
    }

    protected updateObject() {
        let str = this.object.getValue().valueString();
        if (this.object.type.isType(Char)) {
            str = str.substr(1,str.length-2);
        }
        this.objElem.html(str);
        if (this.object.isValueValid()) {
            this.objElem.removeClass("invalid");
        }
        else{
            this.objElem.addClass("invalid");
        }
    }
}

export class ClassMemoryObject<T extends CompleteClassType> extends MemoryObjectOutlet<T> {

    protected readonly objElem: JQuery;
    private readonly addrElem?: JQuery;

    public constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet) {
        super(element, object, memoryOutlet);
        
        this.element.addClass("code-memoryObjectClass");

        this.objElem = $("<div class='classObject'></div>");

        var className = this.object.type.className + (this.object instanceof BaseSubobject ? " (base)" : "");
        let classHeaderElem = $('<div class="classHeader"></div>');
        this.objElem.append(classHeaderElem);

        // Only show name and address for object if not a base class subobject
        if (!(this.object instanceof BaseSubobject)) {
            if (this.object instanceof DynamicObject) {
                this.addrElem = $("<td class='address'>0x"+this.object.address+"</td>");
                classHeaderElem.append(this.addrElem);
            }

            if (this.object.name) {
                let entityElem = $("<div class='entity'>" + (this.object.name || "") + "</div>");
                classHeaderElem.append(entityElem);
            }
        }

        classHeaderElem.append($('<span class="className">'+className+'</span>'));


        let membersElem = $('<div class="members"></div>');

        this.object.type.classDefinition.memberEntities.forEach(memEntity => {
            let memName = memEntity.name;
            if (memEntity instanceof MemberReferenceEntity) {
                new ReferenceMemoryOutlet($("<div></div>").appendTo(membersElem), memEntity);
            }
            else {
                createMemoryObjectOutlet($("<div></div>").appendTo(membersElem), this.object.getMemberObject(memName)!, this.memoryOutlet);
            }

        })
        
        this.objElem.append(membersElem);

        this.element.append(this.objElem);

        return this;
    }

    protected updateObject() {
        // nothing to do. member object outlets should handle stuff
    }
}



export function createMemoryObjectOutlet(elem: JQuery, obj: CPPObject, memoryOutlet: MemoryOutlet) {
    if(obj.type.isPointerType()) {
        assert(obj.type.ptrTo.isCompleteObjectType(), "pointers to incomplete types should not exist at runtime");
        return new PointerMemoryObject(elem, <CPPObject<PointerType<CompleteObjectType>>>obj, memoryOutlet);
    }
    else if(obj.type.isBoundedArrayType()) {
        return new ArrayMemoryObject(elem, <CPPObject<BoundedArrayType>>obj, memoryOutlet);
    }
    else if(obj.type.isCompleteClassType()) {
        return new ClassMemoryObject(elem, <CPPObject<CompleteClassType>>obj, memoryOutlet);
    }
    else{
        return new SingleMemoryObject(elem, <CPPObject<AtomicType>>obj, memoryOutlet);
    }
}

export class StackFrameOutlet {

    private readonly memoryOutlet: MemoryOutlet;
    
    private readonly element: JQuery;

    public readonly func: RuntimeFunction;
    public readonly frame: MemoryFrame;
    
    private readonly referenceOutletsByEntityId : {[index: number]: ReferenceMemoryOutlet} = {};

    public _act!: MessageResponses;

    private readonly customizations : StackFrameCustomization;

    public constructor(element: JQuery, frame: MemoryFrame, memoryOutlet: MemoryOutlet) {
        this.element = element;
        this.frame = frame;
        this.func = frame.func;
        this.memoryOutlet = memoryOutlet;
        
        listenTo(this, frame);

        let funcId = this.frame.func.model.constructId;

        this.customizations = OutletCustomizations.func[funcId];
        if (!this.customizations) {
            this.customizations = OutletCustomizations.func[funcId] = {
                minimize: "show"
            };
        }

        this.element.addClass("code-stackFrame");

        let header = $("<div class='header'></div>");
        this.element.append(header);

        let body = $("<div class='body'></div>");
        this.element.append(body);

        let minimizeButton = $("<span class='button'></span>");

        if(this.customizations.minimize === "show") {
            minimizeButton.html("hide");
        }
        else{
            minimizeButton.html("show");
            body.css("display", "none");
        }

        minimizeButton.click(() => {
            body.slideToggle();
            if (minimizeButton.html() === "hide") {
                minimizeButton.html("show");
                this.customizations.minimize = "hide";
            }
            else{
                minimizeButton.html("hide");
                this.customizations.minimize = "show";
            }
        });
        
        header.append(this.func.model.declaration.name);
        header.append(minimizeButton);

        // REMOVE: this is taken care of by actually adding a memory object for the this pointer
        //if (this.frame.func.isMemberFunction) {
        //    var elem = $("<div></div>");
        //    createMemoryObjectOutlet(elem, this.frame.objects[key], this.memoryOutlet);
        //    body.append(elem);
        //}

        this.frame.localObjects.forEach(obj => {
            var elem = $("<div></div>");
            createMemoryObjectOutlet(elem, obj, this.memoryOutlet);
            body.prepend(elem);
        });

        this.func.model.context.functionLocals.localReferences.forEach(ref => {
            this.referenceOutletsByEntityId[ref.entityId] = new ReferenceMemoryOutlet($("<div></div>").prependTo(body), ref);
        });
    }

    @messageResponse("referenceBound")
    private referenceBound(msg: Message<{entity: BoundReferenceEntity, object: CPPObject}>) {
        let {entity, object} = msg.data;
        this.referenceOutletsByEntityId[entity.entityId].bind(object)
    }
}

interface StackFrameCustomization {
    minimize: "show" | "hide";
}

interface TemporaryObjectsCustomization {
    minimize: "show" | "hide";
}

const OutletCustomizations = {
    temporaryObjects : <TemporaryObjectsCustomization>{
        minimize: "hide"
    },
    func: <{[index: number]: StackFrameCustomization}>{
        
    }
};


export class StackFramesOutlet {

    private readonly element: JQuery;
    private readonly memoryOutlet: MemoryOutlet;
    private readonly framesElem: JQuery;
    private readonly frameElems: JQuery[] = [];

    public readonly memory: Memory;

    public _act!: MessageResponses;
    
    public constructor(element: JQuery, memory: Memory, memoryOutlet: MemoryOutlet) {
        this.element = element;
        this.memoryOutlet = memoryOutlet;
        this.memory = memory;

        listenTo(this, memory);

        this.memoryOutlet = memoryOutlet;

        this.element.addClass("code-memoryStack");

        let header = $("<div class='header'>The Stack</div>");
        this.element.append(header);

        this.framesElem = $('<div class="body"></div>');
        this.element.append(this.framesElem);

        this.memory.stack.frames.forEach(frame => this.pushFrame(frame));
    }

    private pushFrame(frame: MemoryFrame) {

        let frameElem = $("<div style=\"display: none\"></div>");
        new StackFrameOutlet(frameElem, frame, this.memoryOutlet);

        this.frameElems.push(frameElem);
        this.framesElem.prepend(frameElem);
        if (CPP_ANIMATIONS) {
            (this.frameElems.length == 1 ? frameElem.fadeIn(FADE_DURATION) : frameElem.slideDown(SLIDE_DURATION));
        }
        else{
            frameElem.css({display: "block"});
        }
    }

    @messageResponse("framePushed")
    private framePushed(msg: Message<MemoryFrame>) {
        this.pushFrame(msg.data);
    }

    private popFrame() {
        if (CPP_ANIMATIONS) {
            let popped = this.frameElems.pop()!;
            popped.slideUp(SLIDE_DURATION, function() {
                $(this).remove();
            });
        }
        else{
            let popped = this.frameElems.pop()!;
            popped.remove();
        }
    }

    @messageResponse("framePopped")
    private framePopped() {
        this.popFrame();
    }

    @messageResponse("reset")
    private reset() {
        this.frameElems.length = 0;
        this.framesElem.children("div").remove();
    }
}


export class HeapOutlet {

    private readonly element: JQuery;
    private readonly memoryOutlet: MemoryOutlet;
    private readonly objectsElem: JQuery;
    private objectElems: {[index: number]: JQuery} = {};

    public readonly memory: Memory;

    public _act!: MessageResponses;

    public constructor(element: JQuery, memory: Memory, memoryOutlet: MemoryOutlet) {
        this.element = element.addClass("code-memoryHeap");
        this.memory = memory;
        this.memoryOutlet = memoryOutlet;

        let header = $("<div class='header'>The Heap</div>");
        this.element.append(header);

        this.objectsElem = $("<div></div>");
        this.element.append(this.objectsElem);

        listenTo(this, memory);

        this.objectElems = {};

        for (let key in this.memory.heap.objectMap) {
            this.heapObjectAllocated(this.memory.heap.objectMap[key]);
        }
    }

    

    @messageResponse("heapObjectAllocated", "unwrap")
    private heapObjectAllocated(obj: DynamicObject) {
        var elem = $("<div style='display: none'></div>");
        createMemoryObjectOutlet(elem, obj, this.memoryOutlet);

        this.objectElems[obj.address] = elem;
        this.objectsElem.prepend(elem);
        if (CPP_ANIMATIONS) {
            elem.slideDown(SLIDE_DURATION);
        }
        else{
            elem.css({display: "block"});
        }
    }
    
    @messageResponse("heapObjectDeleted")
    private heapObjectDeleted(msg: Message<CPPObject>) {
        var addr = msg.data.address;
        if (this.objectElems[addr]) {
            this.objectElems[addr].fadeOut(function () {
                $(this).remove();
            });
            delete this.objectElems[addr];
        }
    }
    
    @messageResponse("reset")
    private reset() {
        this.objectElems = {};
        this.objectsElem.children().remove();
    }
}


export class TemporaryObjectsOutlet {

    private readonly element: JQuery;
    private readonly memoryOutlet: MemoryOutlet;
    private readonly objectsElem: JQuery;
    private objectElems: {[index: number]: JQuery} = {};

    public readonly memory: Memory;

    private readonly customizations: TemporaryObjectsCustomization;

    public _act!: MessageResponses;
    
    public constructor(element: JQuery, memory: Memory, memoryOutlet: MemoryOutlet) {
        this.element = element.addClass("code-memoryTemporaryObjects");
        this.memory = memory;
        this.memoryOutlet = memoryOutlet;

        this.customizations = OutletCustomizations.temporaryObjects;

        let header = $("<div class='header'>Temporary Objects</div>");
        this.element.append(header);
        
        this.objectsElem = $("<div></div>");
        this.element.append(this.objectsElem);
        
        let minimizeButton = $("<span class='button'></span>");
        if(this.customizations.minimize === "show") {
            minimizeButton.html("hide");
        }
        else{
            minimizeButton.html("show");
            this.objectsElem.css("display", "none");
        }

        minimizeButton.click(() => {
            this.objectsElem.slideToggle();
            if (minimizeButton.html() === "hide") {
                minimizeButton.html("show");
                this.customizations.minimize = "hide";
            }
            else{
                minimizeButton.html("hide");
                this.customizations.minimize = "show";
            }
        });
        header.append(minimizeButton);

        listenTo(this, memory);


        this.objectElems = {};

        return this;
    }

    @messageResponse("temporaryObjectAllocated")
    private temporaryObjectAllocated(msg: Message<CPPObject>) {
        var obj = msg.data;
        var elem = $("<div style='display: none'></div>");
        createMemoryObjectOutlet(elem, obj, this.memoryOutlet);

        this.objectElems[obj.address] = elem;
        this.objectsElem.prepend(elem);
        if (CPP_ANIMATIONS) {
            elem.slideDown(SLIDE_DURATION);
        }
        else{
            elem.css({display: "block"});
        }
    }
    
    @messageResponse("temporaryObjectDeallocated")
    private temporaryObjectDeallocated(msg: Message<CPPObject>) {
        var addr = msg.data.address;
        if (this.objectElems[addr]) {
            this.objectElems[addr].fadeOut(function () {
                $(this).remove();
            });
            delete this.objectElems[addr];
        }
    }
    
    @messageResponse("reset")
    private reset() {
        this.objectElems = {};
        this.objectsElem.children().remove();
    }
    
}

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
        if (CPP_ANIMATIONS) {
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

        this.sim.memory.stack.frames
            .forEach(frame => this.pushFunction(frame.func));
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


// Lobster.Outlets.CPP.SourceSimulation = Outlets.CPP.RunningCode.extend({
//     _name: "SourceSimulation",
//     init: function(element, sim, simOutlet)
//     {
//         this.initParent(element, sim, simOutlet);

//         this.overlayElem = $("<div class='overlays'></div>");
//         this.functionsElem = $("<div class='code-simStack'></div>");

//         this.element.append(this.overlayElem);
//         this.element.append(this.functionsElem);

//         this.element.addClass("code-simulation");

//         this.functions = {};
//         this.functionInstances = {};
//         // this.framesElement = this.element;


//         return this;
//     },

//     setUpTopLevelDeclarations : function() {
//         
//         this.sim.i_topLevelDeclarations.forEach(function(decl) {
//             if (isA(decl, FunctionDefinition)) {
//                 // Set up DOM element for outlet
//                 var elem = $("<div style= 'display: block'></div>");
//                 var functionElem = $("<div></div>");
//                 elem.append(functionElem);
//                 self.functionsElem.append(elem);

//                 // Create outlet using the element
//                 self.functions[decl.id] = Outlets.CPP.Function.instance(functionElem, decl, self);
//                 self.functionInstances[decl.id] = [];
//             }
//         });
//     },

//     pushFunction : function(funcInst, callOutlet) {

//         var instances = this.functionInstances[funcInst.model.id];

//         if (instances) {
//             // Add instance to stack for each function.
//             instances.push(funcInst);

//             var funcOutlet = this.functions[funcInst.model.id];
//             funcOutlet.setInstance(funcInst);

//             return funcOutlet;
//         }
//     },

//     popFunction : function(funcInst) {

//         var insts = this.functionInstances[funcInst.model.id];
//         var funcOutlet = this.functions[funcInst.model.id];
//         if (insts && funcOutlet) {
//             insts.pop();
//             if (insts.length === 0) {
//                 funcOutlet.removeInstance();
//             }
//             else{
//                 funcOutlet.setInstance(insts.last());
//             }
//         }
//     },

//     valueTransferOverlay : function(fromOutlet, toOutlet, html, duration, afterCallback) {

//         // Check to see if the first function parent of the outlets are the same. If they are, don't animate.
//         // Actual check is done in big if below.
//         var fromFuncOutlet = fromOutlet;
//         var toFuncOutlet = toOutlet;
//         while(fromFuncOutlet && !isA(fromFuncOutlet, Outlets.CPP.Function)) { fromFuncOutlet = fromFuncOutlet.parent;}
//         while(toFuncOutlet && !isA(toFuncOutlet, Outlets.CPP.Function)) { toFuncOutlet = toFuncOutlet.parent;}

//         if (fromFuncOutlet !== toFuncOutlet) {
//             // Use parent implementation to show transfer and do callback
//             Outlets.CPP.SourceSimulation._parent.valueTransferOverlay.apply(this, arguments);
//         }
//         else{
//             // Just do callbacks (which might e.g. have parameter outlet show arg value)
//             afterCallback && afterCallback();
//         }
//     },

//     started: Class.ADDITIONALLY(function() {
//         this.setUpTopLevelDeclarations();
//         
//         this.sim.peek().identify("idCodeOutlet", function(codeOutlet) {
//             if (codeOutlet.simOutlet === self) {
//                 self.scrollTo(codeOutlet)
//             }
//         });
//     }),

//     cleared : function() {
//         this.functions = {};
//         this.functionInstances = {};
//         this.functionsElem.children().remove();
//     },
//     scrollTo : function(codeOutlet) {
//         
//         var thisTop = this.element.offset().top;
//         var codeTop = codeOutlet.element.offset().top;
//         var halfHeight = this.element.height() / 2;

//         // scrollTop value which would put the codeoutlet right at the top.
//         var scrollAtTop = codeOutlet.element.offset().top - self.functionsElem.offset().top;
//         var scrollAtMiddle = scrollAtTop - halfHeight;

//         // compute how much we're off from the middle
//         var diff = scrollAtMiddle - this.element.scrollTop();

//         // If diff, the offset from the middle, is within 30 px of the half height, then scroll to middle
//         if (Math.abs(diff) > halfHeight-30) {
//             if (Outlets.CPP.CPP_ANIMATIONS) {
//                 // TODO: change back to finish() and update local jquery
//                 this.element.clearQueue().animate({
//                     scrollTop: scrollAtMiddle
//                 }, 1000);
//             }
//             else{
//                 this.element.scrollTop(scrollAtMiddle);
//             }
//         }

//         // target


//     }

// });

