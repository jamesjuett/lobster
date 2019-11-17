import { Memory, MemoryFrame } from "../core/runtimeEnvironment";
import { addListener, listenTo, MessageResponses, messageResponse, stopListeningTo, Message } from "../util/observe";
import * as SVG from "@svgdotjs/svg.js";
import { CPPObject, ArraySubobject, BaseSubobject, DynamicObject } from "../core/objects";
import { AtomicType, ObjectType, Char, PointerType, BoundedArrayType, ArrayElemType, ClassType, Int } from "../core/types";
import { Mutable } from "../util/util";
import { Simulation } from "../core/Simulation";
import { RuntimeConstruct, RuntimeFunction } from "../core/constructs";
import { ProjectEditor, CompilationOutlet, ProjectSaveOutlet, CompilationStatusOutlet } from "./editors";

const FADE_DURATION = 300;
const SLIDE_DURATION = 400;

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


//         var self = this;
// //        self.setList(["fact.cpp", "hailstone.cpp", "countDigits.cpp"]);
//         this.url = url;
//         this.programs = {};
//         this.loadList();
//     },

//     loadList : function() {
//         var self = this;
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
//         var self = this;

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
//         var self = this;

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
//         var self = this;

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





export class SimulationOutlet {

    public readonly sim?: Simulation;

    private readonly element: JQuery;
    private readonly runningProgressElem: JQuery;

    public _act!: MessageResponses;

    public constructor(element: JQuery) {
        this.element = element;

        this.runningProgressElem = element.find(".runningProgress");

        
        if ((elem = element.find(".console")).length !== 0) {
            this.consoleOutlet = Outlets.HtmlOutlet.instance(elem, true).listenTo(this.sim.console);
        }
        // if ((elem = element.find(".semanticProblems")).length !== 0) {
        //     this.problemsElem = elem;
        //     //this.problems = Outlets.List.instance(elem, $("<li></li>")).listenTo(sim.semanticProblems);
        // }
        if ((elem = element.find(".stackFrames")).length !== 0) {
            if (this.useSourceSimulation) {
                this.stackFrames = Outlets.CPP.SourceSimulation.instance(elem, this.sim, this);
                this.listenTo(this.stackFrames);
            }
            else{
                this.stackFrames = Outlets.CPP.SimulationStack.instance(elem, this.sim, this);
                this.listenTo(this.stackFrames);
            }
        }
        //if ((elem = element.find(".stackFrames2")).length !== 0) {
        //    //this.stackFrames2 = Outlets.CPP.SimulationStack.instance(elem, sim, this);
        //    this.stackFrames2 = Outlets.CPP.SourceSimulation.instance(elem, sim, this);
        //    this.listenTo(this.stackFrames2);
        //}
        if ((elem = element.find(".memory")).length !== 0) {
            this.memory = Outlets.CPP.Memory.instance(elem, this.sim.memory);
        }
        // TODO REMOVE
        // if ((elem = element.find(".codeSelect")).length !== 0) {
        //
        //     this.codeName = ValueEntity.instance(false, "");
        //     this.codeName.addListener(Actor.instance(function(msg) {
        //
        //         $.ajax({
        //             type: 'GET',
        //             url: '/api/user/jjuett/' + msg.data,
        //             dataType: 'text',
        //             success: function(text) {
        //                 self.sim.code.setValue(text);
        //             }
        //
        //         });
        //
        //     }));
        //     this.codeSelect = Outlets.ValueOutlet.instance(elem).converse(this.codeName);
        // }

        this.runButton = element.find(".runButton");

        // if (element.find(".saveName").length !== 0) {
        //     var filenameRegex = /^[a-zA-Z0-9\._-]+$/;
            // this.saveNameEnt = ValueEntity.instance("saveName", "program");
            // ValueOutlet.instance(element.find(".saveName")).converse(this.saveNameEnt);

            // this.editor.saveFunc = this.saveFunc;

            // this.saveButton.click(this.saveFunc);

        // }




        var buttons = this.buttons = {};

        buttons.restart = element.find(".restart");
        buttons.restart.click(function() {
            self.restart();
        });
        var stepForwardNumEnt = ValueEntity.instance("stepForwardNum", "1");
        element.find(".stepForwardNum").length !== 0 && ValueOutlet.instance(element.find(".stepForwardNum")).converse(stepForwardNumEnt);

        buttons.stepForward = element.find(".stepForward");
        buttons.stepForward.click(function() {
            self.stepForward(parseInt(stepForwardNumEnt.value()));
        });

        buttons.stepOver = element.find("button.stepOver");
        buttons.stepOver.click(function() {
            self.stepOver();
        });

        buttons.stepOut = element.find("button.stepOut");
        buttons.stepOut.click(function() {
            self.stepOut();
        });

        buttons.skipToEnd = element.find("button.skipToEnd");
        buttons.skipToEnd.click(function() {
            self.skipToEnd();
        });

        buttons.runToEnd = element.find("button.runToEnd");
        buttons.runToEnd.click(function() {
            self.runToEnd();
        });

        buttons.pause = element.find("button.pause");
        buttons.pause.click(function() {
            self.pause();
        });
        this.skipFunctions = false;
        //element.find("input.stepInto").change(function() {
        //    self.skipFunctions = !$(this).is(":checked");
        //});


        if (element.find(".stepBackwardNum").length !== 0) {
            var stepBackwardNumEnt = ValueEntity.instance("stepBackwardNum", "1");
            ValueOutlet.instance(element.find(".stepBackwardNum")).converse(stepBackwardNumEnt);
            buttons.stepBackward = element.find(".stepBackward");
            buttons.stepBackward.click(function () {
                self.stepBackward(parseInt(stepBackwardNumEnt.value()));
            });
        }



        var self = this;
        element.find(".simPane").on("mousewheel", function(e) {
            if (e.ctrlKey) {
                self.mousewheel(e);
            }
            else{
                return true;
            }
        });

        element.find(".stackFrames").on("mousedown", function(e) {
            element.find("#simPane").focus();
            //alert("hi");
        });

        $(document).on("keydown", function(e) {
            //console.log(e.which);
            if (element.find("#simPane").css("display") !== "none") {
                if (e.which == 39 || e.which == 83) {
                    self.stepForward();
                    e.preventDefault();
                    e.stopPropagation();
                }
                else if (e.which == 37) {
                    self.stepBackward();
                    e.preventDefault();
                    e.stopPropagation();
                }
                //else if (e.which == 40) {
                //    self.stepOver();
                //}
                //else if (e.which == 38) {
                //    self.stepOut();
                //}
            }
        });
        // .on("keypress", "*", function(e) {
        //     if (element.find("#simPane").css("display") !== "none") {
        //         if (e.which == 39 || e.which == 83 || e.which == 37) {
        //             e.preventDefault();
        //             e.stopPropagation();
        //         }
        //     }
        // });



        this.alerts = element.find(".alerts");
        this.alerts.find("button").click(function() {
            self.hideAlerts();
        });
    }

    public setSimulation(sim: Simulation) {
        this.clearSimulation();
        (<Mutable<this>>this).sim = sim;
        listenTo(this, sim);
    }

    public clearSimulation() {
        if (this.sim) {
            stopListeningTo(this, this.sim);
        }
        delete (<Mutable<this>>this).sim;
    }

}


export class DefaultLobsterOutlet {

    public projectEditor: ProjectEditor;
    public simulationOutlet: SimulationOutlet;

    private readonly element: JQuery;
    private readonly tabsElem: JQuery;

    public _act!: MessageResponses;

    public constructor(element: JQuery) {
        this.element = element;

        // Set up simulation and source tabs
        // var sourceTab = element.find(".sourceTab");
        // var simTab = element.find(".simTab");

        this.tabsElem = element.find(".lobster-simulation-outlet-tabs");

        this.projectEditor = new ProjectEditor(element.find("#sourcePane"));

        // TODO: HACK to make codeMirror refresh correctly when sourcePane becomes visible
        this.tabsElem.find('a[href="#sourcePane"]').on("shown.bs.tab", function() {
            self.projectEditor.refreshEditorView();
        });

        this.simulationOutlet = new SimulationOutlet(element.find("#simPane"));

        element.find(".runButton").click(() => {
            let program = this.projectEditor.program;
            if (program.isRunnable()) {
                this.simulationOutlet.setSimulation(new Simulation(program));
            }
            $("#simulateTab").tab("show");
        });

        new CompilationOutlet(element.find("#compilationPane"), this.projectEditor);

        new CompilationStatusOutlet(element.find(".compilation-status-outlet"), this.projectEditor);
        new ProjectSaveOutlet(element.find(".project-save-outlet"), this.projectEditor);

        this.annotationMessages = element.find(".annotationMessages");
        this.annotationMessages.find("button").click(function() {
            self.hideAnnotationMessage();
        });
        this.afterAnnotation = [];
    },

    getProgram : function() {
        return this.projectEditor.getProgram();
    },

    initListeners : function() {
        // this.log && this.log.listenTo(this);
        // this.log && this.log.listenTo(this.editor);
    },

    setEnabledButtons : function(enabled, def) {
        def = def || false;
        for(var key in this.buttons) {
            if (enabled.hasOwnProperty(key)) {
                this.buttons[key].prop("disabled", !enabled[key]);
            }
            else{
                this.buttons[key].prop("disabled", !def);
            }
        }
    },

    loadProject : function(projectName) {
        // TODO NEW: warn about losing unsaved changes

        this.projectEditor.loadProject(projectName);

    },

    restart : function() {
        this.setEnabledButtons({}, true);
        this.sim.start();
    },

    stepForward : function(n) {
        this.setAnimationsOn(true);
        this.runningProgress.css("visibility", "visible");
        var self = this;
        setTimeout(function() {
            self.sim.stepForward(n);
            self.runningProgress.css("visibility", "hidden");
        },1);
    },

    stepOver : function() {
        this.runningProgress.css("visibility", "visible");

        RuntimeConstruct.prototype.silent = true;
        this.setAnimationsOn(false);
        this.setEnabledButtons({"pause":true});

        this.sim.speed = Simulation.MAX_SPEED;
        var self = this;
        this.sim.stepOver({
            after : function() {
                RuntimeConstruct.prototype.silent = false;
                self.stackFrames.refresh();
                setTimeout(function() {self.setAnimationsOn(true);}, 10);
                self.runningProgress.css("visibility", "hidden");
                self.setEnabledButtons({
                    "pause": false
                }, true);
                self.element.find(".simPane").focus();
            }
        });
    },

    stepOut : function() {
        this.runningProgress.css("visibility", "visible");

        RuntimeConstruct.prototype.silent = true;
        this.setAnimationsOn(false);
        this.setEnabledButtons({"pause":true});

        this.sim.speed = Simulation.MAX_SPEED;
        var self = this;
        this.sim.stepOut({
            after : function() {
                RuntimeConstruct.prototype.silent = false;
                self.stackFrames.refresh();
                setTimeout(function() {self.setAnimationsOn(true);}, 10);
                self.runningProgress.css("visibility", "hidden");
                self.setEnabledButtons({
                    "pause": false
                }, true);
                self.element.find(".simPane").focus();
            }
        });
    },


    // TODO this has some bugs where the thing can get skipped over lol
    //runTo : function(data) {
    //    this.runToEnd({stopIfTrue: function(sim) {
    //        var topInst = sim.peek();
    //        return topInst.model === data.code && topInst.parent === data.parentInst;
    //    }});
    //},

    runToEnd : function() {
        this.runningProgress.css("visibility", "visible");

        //RuntimeConstruct.prototype.silent = true;
        this.setAnimationsOn(false);
        this.setEnabledButtons({"pause":true});

        var self = this;
        this.sim.speed = 1;
        this.sim.autoRun({after: function() {
            //RuntimeConstruct.prototype.silent = false;
            //self.stackFrames.refresh();
            setTimeout(function() {self.setAnimationsOn(true);}, 10);
            //self.setEnabledButtons({
            //    skipToEnd: true,
            //    restart: true
            //}, false);
            self.runningProgress.css("visibility", "hidden");
        }});
    },

    skipToEnd : function() {
        this.runningProgress.css("visibility", "visible");

        RuntimeConstruct.prototype.silent = true;
        this.setAnimationsOn(false);
        this.setEnabledButtons({"pause":true});

        var self = this;
        this.sim.speed = Simulation.MAX_SPEED;
        this.sim.autoRun({after: function() {
            RuntimeConstruct.prototype.silent = false;
            self.stackFrames.refresh();
            setTimeout(function() {self.setAnimationsOn(true);}, 10);
            //self.setEnabledButtons({
            //    skipToEnd: true,
            //    restart: true
            //}, false);
            self.runningProgress.css("visibility", "hidden");
        }});




    },

    pause : function() {
        this.sim.pause();
    },

    stepBackward : function(n) {
        if (this.ignoreStepBackward) {return;}

        this.runningProgress.css("visibility", "visible");
        var self = this;

        RuntimeConstruct.prototype.silent = true;
        this.setAnimationsOn(false);
        this.ignoreStepBackward = true;
        setTimeout(function() {
            self.sim.stepBackward(n);
            RuntimeConstruct.prototype.silent = false;
            self.stackFrames.refresh();
            setTimeout(function() {self.setAnimationsOn(true);}, 10);
            self.setEnabledButtons({
                "pause": false
            }, true);
            self.runningProgress.css("visibility", "hidden");
            self.ignoreStepBackward = false;
        }, 100);

    },

    loadCode : function(program) {
        // this.saveNameEnt.setValue(program.name);
    },

    setAnimationsOn : function(animOn) {
        if (animOn) {
            //RuntimeConstruct.prototype.silent = false;
//        this.silent = false;
            Outlets.CPP.CPP_ANIMATIONS = true;
            $.fx.off = false;
            $("body").removeClass("noTransitions").height(); // .height() is to force reflow

        }
        else{
            $("body").addClass("noTransitions").height(); // .height() is to force reflow
            $.fx.off = true;
            Outlets.CPP.CPP_ANIMATIONS = false; // TODO not sure I need this
//        this.silent = true;
//            RuntimeConstruct.prototype.silent = true;
        }
    },

    hideAlerts : function() {
        this.alerts.css("left", "450px");
        $(".codeInstance.current").removeClass("current");
    },

    hideAnnotationMessage : function() {
        this.annotationMessages.css("top", "125px");
        
        if (this.afterAnnotation.length > 0) {
            this.afterAnnotation.forEach(function(fn) {fn();})
            this.afterAnnotation.length = 0;
        }
    },

    _act : {
        loadCode : "loadCode",
        loadProject : "loadProject",
        requestFocus : function(msg) {
            if (msg.source === this.projectEditor) {
                var self = this;
                var response = function() {
                    self.tabsElem.find('a[href="#sourcePane"]').off("shown.bs.tab", response);
                    msg.data();
                };
                // TODO: HACK to make codeMirror refresh correctly when sourcePane becomes visible
                this.tabsElem.find('a[href="#sourcePane"]').on("shown.bs.tab", msg.data);
                this.tabsElem.find('a[href="#sourcePane"]').tab("show");
            }
        },
        fullCompilationFinished : function() {
            if(!this.projectEditor.getProgram().hasErrors()) {
                this.sim.setProgram(this.projectEditor.getProgram());
                this.restart();
            }
        },
        runTo: "runTo",
        skipToEnd: "skipToEnd",
        // compiled : function(msg) {
        //     this.errorStatus.setValue("Compilation successful!");
        //     this.statusElem.removeClass("error");
        //     this.runButton.css("display", "inline-block");
        // },
        syntaxError : function(msg) {
            var err = msg.data;
            this.errorStatus.setValue("Syntax error at line " + err.line + ", column " + err.column/* + ": " + err.message*/);
            this.statusElem.addClass("error");
            this.runButton.css("display", "none");
        },
        unknownError : function(msg) {
            this.errorStatus.setValue("Oops! Something went wrong. You may be trying to use an unsupported feature of C++. Or you may have stumbled upon a bug. Feel free to let me know at jjuett@umich.edu if you think something is wrong.");
            this.statusElem.addClass("error");
            this.runButton.css("display", "none");
        },
        annotationMessage : function(msg) {
            this.hideAnnotationMessage();
            var text = msg.data.text;
            if (msg.data.after) {
                this.afterAnnotation.unshift(msg.data.after);
            }
            this.annotationMessages.find(".annotation-message").html(text);
            this.annotationMessages.css("top", "0px");
            if (msg.data.aboutRecursion) {
                this.annotationMessages.find(".lobsterTeachingImage").css("display", "inline");
                this.annotationMessages.find(".lobsterRecursionImage").css("display", "none");
            }
            else{
                this.annotationMessages.find(".lobsterTeachingImage").css("display", "none");
                this.annotationMessages.find(".lobsterRecursionImage").css("display", "inline");
            }
        },

        alert : function(msg) {
            msg = msg.data;
            this.pause();
            this.alerts.find(".alerts-message").html(msg);
            this.alerts.css("left", "0px");
        },
        explain : function(msg) {
            msg = msg.data;
            this.alerts.find(".alerts-message").html(msg);
            this.alerts.css("left", "0px");
        },
        closeMessage : function() {
            this.hideAlerts();
        },
        started : function(msg) {
            this.hideAlerts();
        },
        paused : function(msg) {
            //this.i_paused = true;
            this.setEnabledButtons({
                "pause": false
            }, true);
            this.element.find(".simPane").focus();
            this.runningProgress.css("visibility", "hidden");
        },
        atEnded : function(msg) {
            this.setEnabledButtons({
                restart: true,
                stepBackward: true
            },false);
            this.runningProgress.css("visibility", "hidden");
        },
        beforeStepForward: function(msg) {
//            if (data.inst.model.isA(Statements.Statement)) {
            var oldGets = $(".code-memoryObject .get");
            var oldSets = $(".code-memoryObject .set");
            setTimeout(function() {
                oldGets.removeClass("get");
                oldSets.removeClass("set");
            }, 300);
//                alert("hi");
//            }
        }
    },

    mousewheel : function(ev) {
        ev.preventDefault();
        if (ev.deltaY < 0) {
            this.stepForward();
        }
        else{
//            this.stepBackward();
        }
    },

    freeze : function() {

    },

    unfreeze : function() {

    }

});



var SVG_DEFS : {[index: string]: }= {};


export class MemoryOutlet {

    public readonly memory: Memory;
    
    public readonly temporaryObjectsOutlet: TemporaryObjectsOutlet;
    public readonly stackFramesOutlet: StackFramesOutlet;
    public readonly heapOutlet: HeapOutlet;

    private readonly element: JQuery;
    private readonly svgElem: JQuery;
    private readonly svg: SVG.Dom;
    
    
    public constructor(element: JQuery, memory: Memory) {
        
        this.element = element.addClass("memory");
        this.memory = memory;

        listenTo(this, memory);

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

        this.temporaryObjectsOutlet = new TemporaryObjectsOutlet($("<div></div>").appendTo(this.element), this.memory, this);
        this.stackFramesOutlet = new StackFramesOutlet($("<div></div>").appendTo(this.element), this.memory, this);
        this.heapOutlet = new HeapOutlet($("<div></div>").appendTo(this.element), this.memory, this);

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

export abstract class MemoryObjectOutlet<T extends ObjectType> {

    public readonly object: CPPObject<T>;
    
    protected readonly memoryOutlet: MemoryOutlet;
    
    protected readonly element: JQuery;
    protected abstract readonly objElem: JQuery;
    private svgElem? : JQuery;
    private svg?: SVG.Dom;
    
    public _act!: MessageResponses;

    public constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet)
    {
        this.element = element.addClass("code-memoryObject");
        this.object = object;
        this.memoryOutlet = memoryOutlet;

        listenTo(this, object);
    }

    abstract protected updateObject() : void;

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

    useSVG() {
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
            this.entityElem = $("<div class='entity'>" + (this.object.name || "") + "</div>");
        }
        this.element.append(this.entityElem);

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

// Lobster.Outlets.CPP.TreeMemoryObject = Outlets.CPP.SingleMemoryObject.extend({
//     _name: "TreeMemoryObject",

//     init: function(element, object, memoryOutlet) {
//         this.initParent(element, object, memoryOutlet);
//         this.objElem.css("white-space", "pre");
//     },

//     updateObject : function() {
//         this.objElem.html(breadthFirstTree(this.object.rawValue()));
//     }
// });


// TODO: should this really extends SingleMemoryObject? it completely overrides updateObject,
//       so the might not really be much useful that's inherited. Or maybe better, SingleMemoryObject
//       should make updateObject abstract and the default behavior there should move to a new subclass
//       like RegularMemoryObject or something like that.
export class PointerMemoryObject<T extends PointerType> extends SingleMemoryObject<T> {
    
    private static instances : PointerMemoryObject<PointerType>[] = [];
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

        PointerMemoryObject.instances.push(this);
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
    //     //var self = this;
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

export class ReferenceMemoryObject<T extends ObjectType> extends MemoryObjectOutlet<T> {

    public constructor(element: JQuery, object: T, memoryOutlet: MemoryOutlet) {
        super(element, object, memoryOutlet);

        this.element.addClass("code-memoryObjectSingle");

        this.addrElem = $("<td class='address'></td>");
        this.objElem = $("<td><div class='entity'>"+(this.object.name || "")+
            "</div><div class='code-memoryObject-object'>"+
            "</div></td>");
        this.element.append("<table><tr></tr></table>");
        this.element.find("tr").append(this.addrElem).append(this.objElem);
        this.objElem = this.objElem.find(".code-memoryObject-object");

        return this;
    },

    bound : function() {
        if (this.object.refersTo.name) {
            this.objElem.html(this.object.refersTo.name);
        }
        else{
            this.objElem.html("@"+this.object.refersTo.address);
        }
//            this.objElem = $("<td><div class='entity'>"+(this.object.name || "")+
//                "</div><div class='code-memoryObject-object'>"+this.object.valueString()+
//                "</div></td>");
        this.bytesWritten();
    },

    updateObject : function() {
//        this.objElem.html(this.object.valueString());
    },
    _act: copyMixin(Outlets.CPP.MemoryObject._act, {
        bound: "bound"
    })
});

export class ArrayMemoryObject<T extends BoundedArrayType> extends MemoryObjectOutlet<T> {

    protected readonly objElem : JQuery;
    private readonly addrElem : JQuery;

    private readonly elemOutlets: MemoryObjectOutlet[];

    public constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet) {
        super(element, object, memoryOutlet);

        this.element.addClass("code-memoryObjectArray");

        this.addrElem = $("<div class='address'>0x"+this.object.address+"</div>");
        this.nameElem = $('<div class="entity">'+(this.object.name || "")+'</div>');
        this.objElem = $("<div class='array'></div>");

        this.elemOutlets = this.object.getArrayElemSubobjects().map((elemSubobject: ArraySubobject<T["elemType"]>, i: number) => {
            let elemElem = $('<div></div>');
            let elemContainer = $('<div style="display: inline-block; margin-bottom: 5px; text-align: center" class="arrayElem"></div>');
            elemContainer.append(elemElem);
            elemContainer.append('<div style="line-height: 1ch; font-size: 6pt">'+i+'</div>');
            this.objElem.append(elemContainer);
            if (elemSubobject.type.isClassType()) {
                this.elemOutlets.push(createMemoryObjectOutlet(elemElem, elemSubobject, this.memoryOutlet));
            }
            else{
                this.elemOutlets.push(new ArrayElemMemoryObject(elemElem, elemSubobject, this.memoryOutlet));
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

export class ClassMemoryObject<T extends ClassType> extends MemoryObjectOutlet<T> {

    protected readonly objElem: JQuery;
    private readonly addrElem: JQuery;

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

        let memberOutlets = [];

        for(var i = 0; i < this.length; ++i) {
            var elemElem = $("<div></div>");
            membersElem.append(elemElem);
            memberOutlets.push(createMemoryObjectOutlet(elemElem, this.object.subobjects[i], this.memoryOutlet));
//            if (i % 10 == 9) {
//                this.objElem.append("<br />");
            // }
        }
        this.objElem.append(membersElem);

        this.element.append(this.objElem);

        return this;
    }

    protected updateObject() {
        // nothing to do. member object outlets should handle stuff
    }
}



export function createMemoryObjectOutlet(elem: JQuery, obj: CPPObject, memoryOutlet: MemoryOutlet) {
    if(obj.type.isReferenceType()) {
        return new ReferenceMemoryObject(elem, obj, memoryOutlet);
    }
    else if(obj.type.isPointerType()) {
        return new PointerMemoryObject(elem, <CPPObject<PointerType>>obj, memoryOutlet);
    }
    else if(obj.type.isBoundedArrayType()) {
        return new ArrayMemoryObject(elem, <CPPObject<BoundedArrayType>>obj, memoryOutlet);
    }
    else if(obj.type.isClassType()) {
        return new ClassMemoryObject(elem, <CPPObject<ClassType>>obj, memoryOutlet);
    }
    else{
        return new SingleMemoryObject(elem, <CPPObject<AtomicType>>obj, memoryOutlet);
    }
}

export class StackFrameOutlet {

    private readonly memoryOutlet: MemoryOutlet;
    
    private readonly element: JQuery;

    public readonly frame: MemoryFrame;
    
    public _act!: MessageResponses;

    private readonly customizations : StackFrameCustomization;

    public constructor(element: JQuery, frame: MemoryFrame, memoryOutlet: MemoryOutlet) {
        this.element = element;
        this.frame = frame;
        this.memoryOutlet = memoryOutlet;
        
        listenTo(this, frame);

        this.customizations = OutletCustomizations.func[this.frame.func.entityId];
        if (!this.customizations) {
            this.customizations = OutletCustomizations.func[this.frame.func.entityId] = {
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
        
        header.append(this.frame.func.name);
        header.append(minimizeButton);

        // REMOVE: this is taken care of by actually adding a memory object for the this pointer
        //if (this.frame.func.isMemberFunction) {
        //    var elem = $("<div></div>");
        //    createMemoryObjectOutlet(elem, this.frame.objects[key], this.memoryOutlet);
        //    body.append(elem);
        //}

        for(var key in this.frame.objects) {
            var elem = $("<div></div>");
            createMemoryObjectOutlet(elem, this.frame.objects[key], this.memoryOutlet);
            body.prepend(elem);
        }
        for(var key in this.frame.references) {
            var elem = $("<div></div>");
            createMemoryObjectOutlet(elem, this.frame.references[key], this.memoryOutlet);
            body.prepend(elem);
        }
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
    func: <{[index: string]: StackFrameCustomization}>{
        
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
    }

    @messageResponse("framePushed")
    private framePushed(msg: Message<MemoryFrame>) {
        //if (msg.data.func.isImplicit()) {
        //    return;
        //}
        let frame = msg.data;
        let frameElem = $("<div style=\"display: none\"></div>");
        new StackFrameOutlet(frameElem, frame, this.memoryOutlet);

        this.frameElems.push(frameElem);
        this.framesElem.prepend(frameElem);
        if (Outlets.CPP.CPP_ANIMATIONS) {
            (this.frameElems.length == 1 ? frameElem.fadeIn(FADE_DURATION) : frameElem.slideDown(SLIDE_DURATION));
        }
        else{
            frameElem.css({display: "block"});
        }
    }

    @messageResponse("framePopped")
    private framePopped() {
        //if (msg.data.func.isImplicit()) {
        //    return;
        //}
//            if (this.frames.length == 1) {
//                var popped = this.frames.last();
//                this.frames.pop();
//                popped.remove();
//            }
//            else{
        if (Outlets.CPP.CPP_ANIMATIONS) {
            let popped = this.frameElems.pop()!;
            popped.slideUp(SLIDE_DURATION, function() {
                $(this).remove();
            });
        }
        else{
            let popped = this.frameElems.pop()!;
            popped.remove();
        }
//            }
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

        return this;
    }

    
    @messageResponse("heapObjectAllocated")
    private heapObjectAllocated(msg: Message<CPPObject>) {
        let obj = msg.data;
        var elem = $("<div style='display: none'></div>");
        createMemoryObjectOutlet(elem, obj, this.memoryOutlet);

        this.objectElems[obj.address] = elem;
        this.objectsElem.prepend(elem);
        if (Outlets.CPP.CPP_ANIMATIONS) {
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
        if (Outlets.CPP.CPP_ANIMATIONS) {
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

export class RunningCodeOutlet {

    protected element: JQuery;
    protected simOutlet: SimulationOutlet;
    protected overlayElem: JQuery;
    protected stackFramesElem: JQuery;
    
    public readonly sim: Simulation;
    
    public _act!: MessageResponses;

    public constructor(element: JQuery, sim: Simulation, simOutlet: SimulationOutlet) {
        this.element = element;
        this.sim = sim;
        this.simOutlet = simOutlet;
        listenTo(this, sim);
        
        this.overlayElem = $("<div class='overlays'></div>");
        this.stackFramesElem = $("<div class='code-simStack'></div>");

        this.element.append(this.overlayElem);
        this.element.append(this.stackFramesElem);

    }

    @messageResponse("mainCallPushed")
    private pushed(msg: Message<RuntimeFunction<Int>>) {
        // main has no caller, so we have to handle creating the outlet here
        this.mainCall = Outlets.CPP.FunctionCall.instance(codeInst, this);

    }

    public valueTransferOverlay(from: JQuery, to: JQuery, html: string, duration: number, afterCallback: () => void) {
        if (Outlets.CPP.CPP_ANIMATIONS) {
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
                if(afterCallback) {
                    afterCallback();
                }
                $(this).remove();
            });
        }
        else{
            if (afterCallback) {
                afterCallback();
            }
        }
    }

    // afterFullStep : function(inst) {
    //     if (!inst) { return; }
    //     var self = this;
    //     inst.identify("idCodeOutlet", function(codeOutlet) {
    //         if (codeOutlet.simOutlet === self) {
    //             self.scrollTo(codeOutlet)
    //         }
    //     });
    // }

    // scrollTo : Class._ABSTRACT,

    started : function() {
        $(".code-memoryObject .get").removeClass("get");
    }

    refresh : function() {
        this.cleared();
        this.mainCall.removeInstance();
        this.mainCall = Outlets.CPP.FunctionCall.instance(this.sim.mainCallInstance(), this);
        this.started();
        var last = this.sim.i_execStack.last();
        if (last) {
            last.send("upNext");
        }
    }

    _act : {
        pushed: true,
        started: true,
        cleared: true,
        afterFullStep: true
    }
}

export class SimulationStackOutlet extends RunningCodeOutlet {

    private readonly frameElems: JQuery[];

    public constructor(element: JQuery, sim: Simulation, simOutlet: SimulationOutlet) {
        super(element, sim, simOutlet);

        this.element.addClass("code-simulation");

        this.frameElems = [];
        // this.framesElement = this.element;


        return this;
    }

    public pushFunction(rtFunc: RuntimeFunction, callOutlet: FunctionCallOutlet) {
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
        let funcOutlet = Outlets.CPP.Function.instance(functionElem, rtFunc, this, callOutlet);

        // Animate!
        if (Outlets.CPP.CPP_ANIMATIONS) {
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

    public popFunction(rtFunc: RuntimeFunction) {
        //if (rtFunc.model.isImplicit()) {
        //    return;
        //}
        var popped = this.frameElems.pop()!;
        if (this.frameElems.length == 0 || !Outlets.CPP.CPP_ANIMATIONS) {
            popped.remove();
        }
        else{
            popped.slideUp(SLIDE_DURATION, function() {
                $(this).remove();
            });
        }
    }

    protected cleared() {
        this.frameElems.clear();
        this.stackFramesElem.children().remove();
    }

    //refresh : Class.ADDITIONALLY(function() {
    //    this.frames.clear();
    //    this.stackFramesElem.children().remove();
    //}),

    // protected scrollTo(codeOutlet) {
    //     //var self = this;
    //     //var thisTop = this.element.offset().top;
    //     //var codeTop = codeOutlet.element.offset().top;
    //     //this.element.finish().animate({
    //     //    scrollTop: codeOutlet.element.offset().top - self.stackFramesElem.offset().top
    //     //}, 1000);
    // }

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
//         var self = this;
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
//         var self = this;
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
//         var self = this;
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

