"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IstreamBufferOutlet = exports.CodeStackOutlet = exports.RunningCodeOutlet = exports.TemporaryObjectsOutlet = exports.HeapOutlet = exports.StackFramesOutlet = exports.StackFrameOutlet = exports.createMemoryObjectOutlet = exports.VectorMemoryObject = exports.InlinePointedArrayOutlet = exports.StringMemoryObject = exports.ClassMemoryObjectOutlet = exports.ArrayElemMemoryObjectOutlet = exports.ArrayMemoryObjectOutlet = exports.ReferenceMemoryOutlet = exports.PointerMemoryObjectOutlet = exports.SingleMemoryObject = exports.MemoryObjectOutlet = exports.MemoryOutlet = exports.DefaultLobsterOutlet = exports.SimulationOutlet = void 0;
const observe_1 = require("../util/observe");
const SVG = __importStar(require("@svgdotjs/svg.js"));
const objects_1 = require("../core/objects");
const types_1 = require("../core/types");
const util_1 = require("../util/util");
const Simulation_1 = require("../core/Simulation");
const editors_1 = require("./editors");
const simulationRunners_1 = require("../core/simulationRunners");
const entities_1 = require("../core/entities");
const codeOutlets_1 = require("./codeOutlets");
const functions_1 = require("../core/functions");
const CPP_ANIMATIONS_1 = require("./CPP_ANIMATIONS");
const FADE_DURATION = 300;
const SLIDE_DURATION = 400;
const VALUE_TRANSFER_DURATION = 500;
function findExactlyOne(element, selector) {
    let found = element.find(selector);
    util_1.assert(found.length === 1, `Within the SimulationOutlet's element, there must be contained EXACTLY ONE element with the selector "${selector}".`);
    return found;
}
const DEFAULT_RUNNER_DELAY = 0;
class SimulationOutlet {
    constructor(element) {
        this.runnerDelay = DEFAULT_RUNNER_DELAY;
        this.breadcrumbs = [];
        this.element = element;
        this.runningProgressElem = findExactlyOne(element, ".runningProgress");
        this.consoleContentsElem = findExactlyOne(element, ".lobster-console-contents");
        this.codeStackOutlet = new CodeStackOutlet(findExactlyOne(element, ".codeStack"));
        this.memoryOutlet = new MemoryOutlet(findExactlyOne(element, ".lobster-memory"));
        this.cinBufferOutlet = new IstreamBufferOutlet(findExactlyOne(element, ".lobster-cin-buffer"), "cin");
        let stepForwardNumElem = findExactlyOne(element, ".stepForwardNum").val(1);
        let stepBackwardNumElem = findExactlyOne(element, ".stepBackwardNum").val(1);
        this.buttonElems = {
            restart: element.find(".restart").click(() => {
                this.restart().catch(() => { });
            }),
            stepForward: element.find(".stepForward").click(() => {
                this.stepForward(parseInt("" + stepForwardNumElem.val())).catch(() => { });
            }),
            stepOver: element.find("button.stepOver").click(() => {
                this.stepOver().catch(() => { });
            }),
            stepOut: element.find("button.stepOut").click(() => {
                this.stepOut().catch(() => { });
            }),
            // skipToEnd : element.find("button.skipToEnd").click(() => {
            //     this.skipToEnd().catch(() => {});
            // }),
            runToEnd: element.find("button.runToEnd").click(() => {
                this.runToEnd().catch(() => { });
            }),
            pause: element.find("button.pause").click(() => {
                this.pause();
            }),
            stepBackward: element.find(".stepBackward").click(() => {
                this.stepBackward(parseInt("" + stepBackwardNumElem.val())).catch(() => { });
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
            if (element.find(".lobster-sim-pane").css("display") !== "none") {
                if (e.which == 39) {
                    this.stepForward().catch(() => { });
                    e.preventDefault();
                    e.stopPropagation();
                }
                else if (e.which == 37) {
                    if (this.buttonElems["stepBackward"].prop("disabled")) {
                        return;
                    }
                    this.stepBackward().catch(() => { });
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        });
        this.cinEntryElem = findExactlyOne(element, ".lobster-console-user-input-entry")
            .on("keydown", (e) => {
            var _a;
            if (e.which == 13) { // keycode 13 is <enter>
                e.preventDefault();
                let input = this.cinEntryElem.val() || undefined;
                if (!input) {
                    return;
                }
                this.cinEntryElem.val("");
                (_a = this.sim) === null || _a === void 0 ? void 0 : _a.cinInput(input + "\n");
            }
        });
        findExactlyOne(element, ".console").on("click", () => {
            var _a;
            if (!getSelection() || ((_a = getSelection()) === null || _a === void 0 ? void 0 : _a.toString()) === "") {
                this.cinEntryElem.focus();
            }
        });
        this.alertsElem = element.find(".alerts");
        this.alertsElem.find("button").click(() => {
            this.hideAlerts();
        });
    }
    setSimulation(sim) {
        this.clearSimulation();
        this.sim = sim;
        observe_1.listenTo(this, sim);
        this.simRunner = new simulationRunners_1.AsynchronousSimulationRunner(this.sim, this.runnerDelay);
        this.codeStackOutlet.setSimulation(sim);
        this.memoryOutlet.setMemory(sim.memory);
        this.cinBufferOutlet.setIstream(sim.cin);
        this.consoleContentsElem.html(sim.outputProduced.map(out => out.kind === Simulation_1.SimulationOutputKind.COUT
            ? out.text
            : `<span class="lobster-console-user-input">${out.text}</span>`).join(""));
    }
    clearSimulation() {
        this.codeStackOutlet.clearSimulation();
        this.memoryOutlet.clearMemory();
        this.cinBufferOutlet.clearIstream();
        if (this.sim) {
            observe_1.stopListeningTo(this, this.sim);
        }
        delete this.sim;
        delete this.simRunner;
        this.breadcrumbs = [];
    }
    refreshSimulation() {
        this.codeStackOutlet.refreshSimulation();
        if (this.sim) {
            this.memoryOutlet.setMemory(this.sim.memory);
            this.cinBufferOutlet.setIstream(this.sim.cin);
        }
        else {
            this.memoryOutlet.clearMemory();
            this.cinBufferOutlet.clearIstream();
        }
    }
    setEnabledButtons(enabled, enabledDefault = false) {
        Object.keys(this.buttonElems).forEach(buttonName => {
            if (enabled.hasOwnProperty(buttonName)) {
                this.buttonElems[buttonName].prop("disabled", !enabled[buttonName]);
            }
            else {
                this.buttonElems[buttonName].prop("disabled", !enabledDefault);
            }
        });
    }
    restart() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.sim) {
                return;
            }
            this.setEnabledButtons({}, true);
            yield this.simRunner.reset();
            while (!this.sim.globalAllocator.isDone) {
                yield this.simRunner.stepForward();
            }
            if (this.sim) {
                this.breadcrumbs = [];
            }
        });
    }
    stepForward(n = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.sim) {
                return;
            }
            // this.setAnimationsOn(true);
            if (n !== 1) {
                this.runningProgressElem.css("visibility", "visible");
            }
            this.leaveBreadcrumb();
            // let top = this.sim.top();
            // if (top instanceof RuntimeFunctionCall && top.model.func.firstDeclaration.context.isLibrary) {
            //     CPP_ANIMATIONS = false;
            yield this.simRunner.stepOverLibrary(n);
            //     CPP_ANIMATIONS = true;
            // }
            // else {
            //     await this.simRunner!.stepForward(n);
            // }
            if (n !== 1) {
                this.runningProgressElem.css("visibility", "hidden");
            }
        });
    }
    leaveBreadcrumb() {
        if (this.sim) {
            if (this.breadcrumbs.length === 0 || this.sim.stepsTaken !== this.breadcrumbs[this.breadcrumbs.length - 1]) {
                this.breadcrumbs.push(this.sim.stepsTaken);
            }
        }
    }
    stepOver() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.sim) {
                return;
            }
            this.runningProgressElem.css("visibility", "visible");
            // this.setAnimationsOn(false);
            this.setEnabledButtons({ "pause": true });
            this.leaveBreadcrumb();
            // this.sim.speed = Simulation.MAX_SPEED;
            yield this.simRunner.stepOver();
            // setTimeout(function() {this.setAnimationsOn(true);}, 10);
            this.runningProgressElem.css("visibility", "hidden");
            this.setEnabledButtons({
                "pause": false
            }, true);
            this.element.find(".simPane").focus();
        });
    }
    stepOut() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.sim) {
                return;
            }
            this.runningProgressElem.css("visibility", "visible");
            // RuntimeConstruct.prototype.silent = true;
            // this.setAnimationsOn(false);
            this.setEnabledButtons({ "pause": true });
            // this.sim.speed = Simulation.MAX_SPEED;
            this.leaveBreadcrumb();
            yield this.simRunner.stepOut();
            // RuntimeConstruct.prototype.silent = false;
            // setTimeout(function() {this.setAnimationsOn(true);}, 10);
            this.runningProgressElem.css("visibility", "hidden");
            this.setEnabledButtons({
                "pause": false
            }, true);
            this.element.find(".simPane").focus();
        });
    }
    runToEnd() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.sim) {
                return;
            }
            this.runningProgressElem.css("visibility", "visible");
            //RuntimeConstruct.prototype.silent = true;
            // this.setAnimationsOn(false);
            this.setEnabledButtons({ "pause": true });
            this.leaveBreadcrumb();
            // this.sim.speed = 1;
            yield this.simRunner.stepToEndOfMain();
            this.pause();
            //RuntimeConstruct.prototype.silent = false;
            //self.codeStackOutlet.refresh();
            // setTimeout(function() {self.setAnimationsOn(true);}, 10);
            //self.setEnabledButtons({
            //    skipToEnd: true,
            //    restart: true
            //}, false);
            this.runningProgressElem.css("visibility", "hidden");
        });
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
    pause() {
        if (!this.sim) {
            return;
        }
        this.simRunner.pause();
        this.setEnabledButtons({
            "pause": false
        }, true);
        this.element.find(".simPane").focus();
        this.runningProgressElem.css("visibility", "hidden");
    }
    stepBackward(n = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.sim) {
                return;
            }
            this.runningProgressElem.css("visibility", "visible");
            // RuntimeConstruct.prototype.silent = true;
            // this.setAnimationsOn(false);
            // Temporarily detach from simulation
            let breadcrumbs = this.breadcrumbs;
            let targetSteps = this.breadcrumbs.length >= n
                ? breadcrumbs.splice(this.breadcrumbs.length - n, n)[0]
                : this.sim.stepsTaken - n;
            let newSim = yield simulationRunners_1.asyncCloneSimulation(this.sim, targetSteps);
            // await this.simRunner!.stepBackward(n);
            // RuntimeConstruct.prototype.silent = false;
            this.setSimulation(newSim);
            this.breadcrumbs = breadcrumbs;
            // setTimeout(function() {this.setAnimationsOn(true);}, 10);
            this.setEnabledButtons({
                "pause": false
            }, true);
            this.runningProgressElem.css("visibility", "hidden");
        });
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
    hideAlerts() {
        this.alertsElem.css("left", "450px");
        $(".codeInstance.current").removeClass("current");
    }
    cout(msg) {
        this.consoleContentsElem.append(msg.data);
        this.element.find(".console").scrollTop(this.element.find(".console")[0].scrollHeight);
    }
    onCinInput(msg) {
        this.consoleContentsElem.append(`<span class="lobster-console-user-input">${msg.data}</span>`);
        this.element.find(".console").scrollTop(this.element.find(".console")[0].scrollHeight);
    }
    onEventOccurred(data) {
        if (data.event === Simulation_1.SimulationEvent.ASSERTION_FAILURE) {
            this.consoleContentsElem.append(`<span class="lobster-console-error">${data.message + "\n"}</span>`);
            this.element.find(".console").scrollTop(this.element.find(".console")[0].scrollHeight);
        }
    }
    reset() {
        //this.i_paused = true;
        this.setEnabledButtons({
            "pause": false
        }, true);
        this.element.find(".simPane").focus();
        this.runningProgressElem.css("visibility", "hidden");
        this.consoleContentsElem.html("");
    }
    atEnded() {
        this.setEnabledButtons({
            restart: true,
            stepBackward: true
        }, false);
        this.runningProgressElem.css("visibility", "hidden");
    }
}
__decorate([
    observe_1.messageResponse("cout")
], SimulationOutlet.prototype, "cout", null);
__decorate([
    observe_1.messageResponse("cinInput")
], SimulationOutlet.prototype, "onCinInput", null);
__decorate([
    observe_1.messageResponse("eventOccurred", "unwrap")
], SimulationOutlet.prototype, "onEventOccurred", null);
__decorate([
    observe_1.messageResponse("reset")
], SimulationOutlet.prototype, "reset", null);
__decorate([
    observe_1.messageResponse("atEnded")
], SimulationOutlet.prototype, "atEnded", null);
exports.SimulationOutlet = SimulationOutlet;
class DefaultLobsterOutlet {
    constructor(element, project) {
        this.element = element;
        this.project = project;
        // Set up simulation and source tabs
        // var sourceTab = element.find(".sourceTab");
        // var simTab = element.find(".simTab");
        this.tabsElem = element.find(".lobster-simulation-outlet-tabs");
        this.projectEditor = new editors_1.ProjectEditor(element.find(".lobster-source-pane"), this.project);
        // TODO: HACK to make codeMirror refresh correctly when sourcePane becomes visible
        this.tabsElem.find('a.lobster-sim-tab').on("shown.bs.tab", () => {
            this.projectEditor.refreshEditorView();
        });
        this.simulationOutlet = new SimulationOutlet(element.find(".lobster-sim-pane"));
        let runButtonElem = element.find(".runButton")
            .on("click", () => {
            let program = this.project.program;
            if (program.isRunnable()) {
                let sim = new Simulation_1.Simulation(program);
                while (!sim.globalAllocator.isDone) {
                    sim.stepForward(); // TODO: put this loop in simulation runners in function to skip stuff before main
                }
                this.setSimulation(sim);
            }
            this.element.find(".lobster-simulate-tab").tab("show");
        });
        new editors_1.CompilationOutlet(element.find(".lobster-compilation-pane"), this.project);
        new editors_1.CompilationStatusOutlet(element.find(".compilation-status-outlet"), this.project);
        // new ProjectSaveOutlet(element.find(".project-save-outlet"), this.projectEditor);
        // this.annotationMessagesElem = element.find(".annotationMessages");
        // this.annotationMessagesElem.find("button").click(() => {
        //     this.hideAnnotationMessage();
        // });
        // this.afterAnnotation = [];
    }
    setSimulation(sim) {
        this.clearSimulation();
        this.sim = sim;
        observe_1.listenTo(this, sim);
        this.simulationOutlet.setSimulation(sim);
    }
    clearSimulation() {
        this.simulationOutlet.clearSimulation();
        if (this.sim) {
            observe_1.stopListeningTo(this, this.sim);
        }
        delete this.sim;
    }
    // private hideAnnotationMessage() {
    //     this.annotationMessagesElem.css("top", "125px");
    //     if (this.afterAnnotation.length > 0) {
    //         this.afterAnnotation.forEach(fn => fn());
    //         this.afterAnnotation.length = 0;
    //     }
    // }
    requestFocus(msg) {
        if (msg.source === this.projectEditor) {
            this.tabsElem.find('a.lobster-source-tab').tab("show");
        }
    }
    beforeStepForward(msg) {
        var oldGets = $(".code-memoryObject .get");
        var oldSets = $(".code-memoryObject .set");
        setTimeout(() => {
            oldGets.removeClass("get");
            oldSets.removeClass("set");
        }, 300);
    }
}
__decorate([
    observe_1.messageResponse("requestFocus")
], DefaultLobsterOutlet.prototype, "requestFocus", null);
__decorate([
    observe_1.messageResponse("beforeStepForward")
], DefaultLobsterOutlet.prototype, "beforeStepForward", null);
exports.DefaultLobsterOutlet = DefaultLobsterOutlet;
class MemoryOutlet {
    constructor(element) {
        /**
         * Maps from object ID to the outlet that represents that object.
         */
        this.objectOutlets = {};
        /**
         * Used to track SVG elements for pointer arrows. Maps from the object ID
         * for the pointer to the SVG element
         */
        this.pointerSVGElems = {};
        this.svgOverlays = [];
        this.element = element.addClass("lobster-memory");
        this.svgElem = $('<div style="position: absolute; left:0; right:0; top: 0; bottom: 0; pointer-events: none; z-index: 10"></div>');
        this.svg = SVG.SVG().addTo(this.svgElem[0]);
        this.SVG_DEFS = {
            arrowStart: this.svg.marker(3, 3, function (add) {
                add.circle(3).fill({ color: '#fff' });
            }),
            arrowEnd: this.svg.marker(6, 6, function (add) {
                add.path("M0,1 L0,5.5 L4,3 L0,1").fill({ color: '#fff' });
            })
        };
        this.element.append(this.svgElem);
        this.svgUpdateThread = window.setInterval(() => this.updateSvg(), 20);
    }
    dispose() {
        clearInterval(this.svgUpdateThread);
    }
    setMemory(memory) {
        this.clearMemory();
        this.memory = memory;
        observe_1.listenTo(this, memory);
        this.temporaryObjectsOutlet = new TemporaryObjectsOutlet($("<div></div>").appendTo(this.element), memory, this);
        this.stackFramesOutlet = new StackFramesOutlet($("<div></div>").appendTo(this.element), memory, this);
        this.heapOutlet = new HeapOutlet($("<div></div>").appendTo(this.element), memory, this);
        // Since the simulation has already started, some objects will already be allocated
        memory.allLiveObjects().forEach(obj => this.onObjectAllocated(obj));
    }
    clearMemory() {
        delete this.temporaryObjectsOutlet;
        delete this.stackFramesOutlet;
        delete this.heapOutlet;
        this.element.children().filter((index, element) => element !== this.svgElem[0]).remove();
        this.onReset();
        if (this.memory) {
            observe_1.stopListeningTo(this, this.memory);
        }
        delete this.memory;
    }
    registerObjectOutlet(outlet) {
        this.objectOutlets[outlet.object.objectId] = outlet;
    }
    disposeObjectOutlet(outlet) {
        delete this.objectOutlets[outlet.object.objectId];
    }
    getObjectOutletById(objectId) {
        return this.objectOutlets[objectId];
    }
    addSVGOverlay(overlay) {
        this.svgOverlays.push(overlay);
    }
    updateSvg() {
        this.svgOverlays = this.svgOverlays.filter(svgOverlay => svgOverlay.update());
    }
    // @messageResponse("pointerPointed")
    // private pointerPointed(msg: Message<{pointer: BoundReferenceEntity, pointee: CPPObject}>) {
    //     let {pointer, pointee} = msg.data;
    // }
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
    onObjectAllocated(object) {
        if (object.type.isPointerToCompleteObjectType()) {
            this.addSVGOverlay(new SVGPointerArrowMemoryOverlay(object, this));
        }
    }
    onReset() {
        this.objectOutlets = {};
        Object.values(this.pointerSVGElems).forEach(line => line === null || line === void 0 ? void 0 : line.remove());
        this.pointerSVGElems = {};
        this.svgOverlays.forEach(overlay => overlay.remove());
        this.svgOverlays = [];
    }
}
__decorate([
    observe_1.messageResponse("objectAllocated", "unwrap")
], MemoryOutlet.prototype, "onObjectAllocated", null);
__decorate([
    observe_1.messageResponse("reset")
], MemoryOutlet.prototype, "onReset", null);
exports.MemoryOutlet = MemoryOutlet;
class SVGMemoryOverlay {
    constructor(memoryOutlet) {
        this.memoryOutlet = memoryOutlet;
    }
}
class SVGPointerArrowMemoryOverlay extends SVGMemoryOverlay {
    constructor(object, memoryOutlet) {
        super(memoryOutlet);
        this.object = object;
        this.line = memoryOutlet.svg.line(0, 0, 0, 0)
            .stroke({ color: '#fff', width: 1 });
        this.line.marker("start", memoryOutlet.SVG_DEFS.arrowStart);
        this.line.marker("end", memoryOutlet.SVG_DEFS.arrowEnd);
        this.update();
    }
    update() {
        var _a, _b;
        if (!this.object.isAlive) {
            this.line.remove();
            return false;
        }
        let pointerElem = (_a = this.memoryOutlet.getObjectOutletById(this.object.objectId)) === null || _a === void 0 ? void 0 : _a.objElem;
        let targetElem;
        if (this.object.type.isArrayPointerType()) {
            let targetIndex = this.object.type.toIndex(this.object.rawValue());
            let arr = this.object.type.arrayObject;
            let numElems = arr.type.numElems;
            let arrOutlet = this.memoryOutlet.getObjectOutletById(arr.objectId);
            if (0 <= targetIndex && targetIndex < numElems) {
                targetElem = arrOutlet === null || arrOutlet === void 0 ? void 0 : arrOutlet.elemOutlets[targetIndex].objElem;
            }
            else if (targetIndex === numElems) {
                targetElem = arrOutlet === null || arrOutlet === void 0 ? void 0 : arrOutlet.onePast;
            }
        }
        else if (this.object.type.isObjectPointerType()) {
            let targetObject = this.object.type.getPointedObject();
            if (targetObject && targetObject.isAlive) {
                targetElem = (_b = this.memoryOutlet.getObjectOutletById(targetObject.objectId)) === null || _b === void 0 ? void 0 : _b.objElem;
            }
        }
        if (!pointerElem || !targetElem) {
            this.line.hide();
            return true;
        }
        let { startOffset, endOffset } = this.getPointerArrowOffsets(pointerElem, targetElem);
        this.line.plot(startOffset.left, startOffset.top, endOffset.left, endOffset.top);
        // this.line.marker("start", this.memoryOutlet.SVG_DEFS.arrowStart);
        // this.line.marker("end", this.memoryOutlet.SVG_DEFS.arrowEnd);
        this.line.show();
        return true;
    }
    getPointerArrowOffsets(pointerElem, targetElem) {
        let endOffset = targetElem.offset();
        endOffset.left += targetElem.outerWidth() / 2;
        //endOffset.top += targetElem.outerHeight();
        let startOffset = pointerElem.offset();
        startOffset.left += pointerElem.outerWidth() / 2;
        // If start is below end (greater offset), we move top of end to bottom.
        if (startOffset.top > endOffset.top) {
            endOffset.top += targetElem.outerHeight();
        }
        else {
            startOffset.top += pointerElem.outerHeight();
        }
        let svgElemOffset = this.memoryOutlet.svgElem.offset();
        startOffset.left -= svgElemOffset.left;
        startOffset.top -= svgElemOffset.top;
        endOffset.left -= svgElemOffset.left;
        endOffset.top -= svgElemOffset.top;
        return { startOffset, endOffset };
    }
    remove() {
        this.line.remove();
    }
}
class MemoryObjectOutlet {
    constructor(element, object, memoryOutlet, name) {
        this.element = element.addClass("code-memoryObject");
        this.object = object;
        this.memoryOutlet = memoryOutlet;
        memoryOutlet.registerObjectOutlet(this);
        this.names = name ? [name] : [];
        observe_1.listenTo(this, object);
    }
    disconnect() {
        observe_1.stopListeningTo(this, this.object);
    }
    valueRead() {
        this.objElem.addClass("get");
    }
    valueWritten() {
        this.updateObject();
        this.objElem.addClass("set");
    }
    onReferenceBoundToMe(refEntity) {
        if (refEntity.name) {
            util_1.asMutable(this.names).push(refEntity.name);
            this.onNamesUpdate();
        }
    }
    onReferenceUnbound(refEntity) {
        if (refEntity.name) {
            let i = this.names.indexOf(refEntity.name);
            if (i !== -1) {
                util_1.asMutable(this.names).splice(i, 1);
            }
            this.onNamesUpdate();
        }
    }
    deallocated() {
        this.element.addClass("deallocated");
    }
    leaked() {
        this.element.addClass("leaked");
    }
    unleaked() {
        //this.element.removeClass("leaked"); // TODO: why is this commented?
    }
    validitySet(isValid) {
        if (isValid) {
            this.objElem.removeClass("invalid");
        }
        else {
            this.objElem.addClass("invalid");
        }
    }
    callReceived() {
        this.element.addClass("receiver");
    }
    callEnded() {
        this.element.removeClass("receiver");
    }
    findOutlet(callback) {
        callback(this);
    }
    useSVG() {
        this.svgElem = $('<div style="position: absolute; width: 100%; height: 100%; left: 0px; top: 0px; pointer-events: none"></div>');
        this.svg = SVG.SVG(this.svgElem[0]);
        this.element.append(this.svgElem);
    }
}
__decorate([
    observe_1.messageResponse("valueRead"),
    observe_1.messageResponse("byteRead"),
    observe_1.messageResponse("bytesRead")
], MemoryObjectOutlet.prototype, "valueRead", null);
__decorate([
    observe_1.messageResponse("valueWritten"),
    observe_1.messageResponse("byteWritten"),
    observe_1.messageResponse("bytesWritten")
], MemoryObjectOutlet.prototype, "valueWritten", null);
__decorate([
    observe_1.messageResponse("referenceBoundToMe", "unwrap")
], MemoryObjectOutlet.prototype, "onReferenceBoundToMe", null);
__decorate([
    observe_1.messageResponse("referenceUnbound", "unwrap")
], MemoryObjectOutlet.prototype, "onReferenceUnbound", null);
__decorate([
    observe_1.messageResponse("deallocated")
], MemoryObjectOutlet.prototype, "deallocated", null);
__decorate([
    observe_1.messageResponse("leaked")
], MemoryObjectOutlet.prototype, "leaked", null);
__decorate([
    observe_1.messageResponse("unleaked")
], MemoryObjectOutlet.prototype, "unleaked", null);
__decorate([
    observe_1.messageResponse("validitySet", "unwrap")
], MemoryObjectOutlet.prototype, "validitySet", null);
__decorate([
    observe_1.messageResponse("callReceived")
], MemoryObjectOutlet.prototype, "callReceived", null);
__decorate([
    observe_1.messageResponse("callEnded")
], MemoryObjectOutlet.prototype, "callEnded", null);
__decorate([
    observe_1.messageResponse("findOutlet")
], MemoryObjectOutlet.prototype, "findOutlet", null);
exports.MemoryObjectOutlet = MemoryObjectOutlet;
class SingleMemoryObject extends MemoryObjectOutlet {
    constructor(element, object, memoryOutlet) {
        super(element, object, memoryOutlet, object.name);
        this.element.addClass("code-memoryObjectSingle");
        this.addrElem = $(`<div class='address'>${types_1.toHexadecimalString(this.object.address)}</div>`);
        this.element.append(this.addrElem);
        this.objElem = $("<div class='code-memoryObject-object'>" + this.object.getValue().valueString() + "</div>");
        this.element.append(this.objElem);
        this.element.append("<span> </span>");
        this.element.append(this.namesElem = $("<div class='entity'>" + (this.object.name || "") + "</div>"));
        this.updateObject();
    }
    onNamesUpdate() {
        this.namesElem.html(this.names.join(", "));
    }
    updateObject() {
        var elem = this.objElem;
        var str = this.object.getValue().valueString();
        if (this.object.type.isType(types_1.Char)) {
            str = str.substr(1, str.length - 2);
        }
        elem.html(str);
        if (this.object.isValueValid()) {
            elem.removeClass("invalid");
        }
        else {
            elem.addClass("invalid");
        }
    }
}
exports.SingleMemoryObject = SingleMemoryObject;
// TODO: should this really extends SingleMemoryObject? it completely overrides updateObject,
//       so the might not really be much useful that's inherited. Or maybe better, SingleMemoryObject
//       should make updateObject abstract and the default behavior there should move to a new subclass
//       like RegularMemoryObject or something like that.
class PointerMemoryObjectOutlet extends SingleMemoryObject {
    constructor(element, object, memoryOutlet) {
        super(element, object, memoryOutlet);
        this.pointedObjectListener = {
            _act: {
                "deallocated": () => this.updateObject()
            }
        };
        this.useSVG();
        this.objElem.css("white-space", "pre");
        this.ptdArrayElem = $('<div class="ptd-array"></div>');
        this.element.append(this.ptdArrayElem);
    }
    // private updateArrow() {
    //     if (!this.pointedObject || !this.pointedObject.isAlive) {
    //         this.clearArrow();
    //     }
    //     else if (this.object.type.isArrayPointerType()) {
    //         // this.makeArrayPointerArrow();
    //     }
    //     else if (this.object.type.isObjectPointerType()) {
    //         // this.makeObjectPointerArrow();
    //     }
    // }
    // private clearArrow() {
    //     if (this.arrow) { this.arrow.remove(); }
    //     delete this.arrow;
    // }
    updateObject() {
        var elem = this.objElem;
        let newPointedObject;
        if (this.object.type.isArrayPointerType()) {
            newPointedObject = this.object.type.arrayObject;
        }
        else if (this.object.type.isObjectPointerType()) {
            newPointedObject = this.object.type.getPointedObject();
        }
        if (this.pointedObject !== newPointedObject) {
            if (this.pointedObject) {
                observe_1.stopListeningTo(this.pointedObjectListener, this.pointedObject, "deallocated");
            }
            this.pointedObject = newPointedObject;
            if (newPointedObject) {
                observe_1.listenTo(this.pointedObjectListener, newPointedObject, "deallocated");
            }
        }
        elem.html(this.object.getValue().valueString());
        if (this.object.isValueValid()) {
            elem.removeClass("invalid");
        }
        else {
            elem.addClass("invalid");
        }
    }
}
exports.PointerMemoryObjectOutlet = PointerMemoryObjectOutlet;
// setInterval(function() {
//     var temp = Outlets.CPP.CPP_ANIMATIONS;
//     Outlets.CPP.CPP_ANIMATIONS = false;
//     Outlets.CPP.PointerMemoryObject.updateArrows();
//     Outlets.CPP.CPP_ANIMATIONS = temp;
// }, 20);
class ReferenceMemoryOutlet {
    constructor(element, entity) {
        this.element = element.addClass("code-memoryObject");
        this.entity = entity;
        this.element.addClass("code-memoryObjectSingle");
        this.addrElem = $("<div>&nbsp;</div>").appendTo(element);
        $(`<div class='entity'>${entity.name || ""}</div>`).appendTo(element);
        this.objElem = $(`<div class="code-memoryObject-object"></div>`).appendTo(element);
        return this;
    }
    bind(object) {
        this.object = object;
        if (object.name) {
            this.objElem.html(object.name);
        }
        else {
            this.objElem.html("@" + object.address);
        }
    }
}
exports.ReferenceMemoryOutlet = ReferenceMemoryOutlet;
class ArrayMemoryObjectOutlet extends MemoryObjectOutlet {
    constructor(element, object, memoryOutlet) {
        super(element, object, memoryOutlet);
        this.element.addClass("code-memoryObjectArray");
        this.objElem = $("<div class='array'></div>");
        this.elemOutlets = this.object.getArrayElemSubobjects().map((elemSubobject, i) => {
            let elemElem = $('<div></div>');
            let elemContainer = $('<div style="display: inline-block; margin-bottom: 5px; text-align: center" class="arrayElem"></div>');
            elemContainer.append(elemElem);
            elemContainer.append('<div style="line-height: 1ch; font-size: 6pt">' + i + '</div>');
            this.objElem.append(elemContainer);
            if (elemSubobject.type.isPotentiallyCompleteClassType()) {
                return createMemoryObjectOutlet(elemElem, elemSubobject, this.memoryOutlet);
            }
            else {
                return new ArrayElemMemoryObjectOutlet(elemElem, elemSubobject, this.memoryOutlet);
            }
        });
        this.onePast = $(`
        <div style="display: inline-block; margin-bottom: 5px; text-align: center" class="arrayElem">
            <div class="code-memoryObject array"><span class="code-memoryObject-object" style="border-style: dashed;border-color: #7c3a3a;">&nbsp;</span></div>
            <div style="line-height: 1ch;font-size: 6pt;color: #c50000;">${this.object.type.numElems}</div>
        </div>`).appendTo(this.objElem);
        this.updateObject();
        this.element.append(this.objElem);
    }
    updateObject() {
        // I think nothing to do here, since the array subobjects should update themselves?
        //        var elemType = this.object.type.elemType;
        //        var value = this.object.getValue();
        //        for(var i = 0; i < this.length; ++i) {
        //            this.elemOutlets[i].updateObject();
        //        }
    }
    onNamesUpdate() {
        // TODO
    }
}
exports.ArrayMemoryObjectOutlet = ArrayMemoryObjectOutlet;
class ArrayElemMemoryObjectOutlet extends MemoryObjectOutlet {
    constructor(element, object, memoryOutlet) {
        super(element, object, memoryOutlet);
        this.element.addClass("array");
        this.objElem = $('<span class="code-memoryObject-object"></span>');
        this.element.append(this.objElem);
        this.updateObject();
    }
    updateObject() {
        let str = this.object.getValue().valueString();
        if (this.object.type.isType(types_1.Char)) {
            str = str.substr(1, str.length - 2);
        }
        this.objElem.html(str);
        if (this.object.isValueValid()) {
            this.objElem.removeClass("invalid");
        }
        else {
            this.objElem.addClass("invalid");
        }
    }
    onNamesUpdate() {
        // TODO
    }
}
exports.ArrayElemMemoryObjectOutlet = ArrayElemMemoryObjectOutlet;
class ClassMemoryObjectOutlet extends MemoryObjectOutlet {
    constructor(element, object, memoryOutlet) {
        super(element, object, memoryOutlet);
        this.element.addClass("code-memoryObjectClass");
        this.objElem = $("<div class='classObject'></div>");
        var className = this.object.type.className + (this.object instanceof objects_1.BaseSubobject ? " (base)" : "");
        let classHeaderElem = $('<div class="classHeader"></div>');
        this.objElem.append(classHeaderElem);
        // Only show name and address for object if not a base class subobject
        if (!(this.object instanceof objects_1.BaseSubobject)) {
            if (this.object instanceof objects_1.DynamicObject) {
                this.addrElem = $("<td class='address'>" + types_1.toHexadecimalString(this.object.address) + "</td>");
                classHeaderElem.append(this.addrElem);
            }
            if (this.object.name) {
                let entityElem = $("<div class='entity'>" + (this.object.name || "") + "</div>");
                classHeaderElem.append(entityElem);
            }
        }
        classHeaderElem.append($('<span class="className">' + className + '</span>'));
        let membersElem = $('<div class="members"></div>');
        let baseObj = this.object.getBaseSubobject();
        if (baseObj) {
            createMemoryObjectOutlet($("<div></div>").appendTo(membersElem), baseObj, this.memoryOutlet);
        }
        // let baseType: CompleteClassType | undefined = this.object.type;
        // while (baseType = baseType.classDefinition.baseClass) {
        //     baseType.classDefinition.memberVariableEntities.forEach(memEntity => {
        //         let memName = memEntity.name;
        //         if (memEntity instanceof MemberReferenceEntity) {
        //             new ReferenceMemoryOutlet($("<div></div>").appendTo(membersElem), memEntity);
        //         }
        //         else {
        //             createMemoryObjectOutlet($("<div></div>").appendTo(membersElem), this.object.getMemberObject(memName)!, this.memoryOutlet);
        //         }
        //     });
        // }
        this.object.type.classDefinition.memberVariableEntities.forEach(memEntity => {
            let memName = memEntity.name;
            if (memEntity instanceof entities_1.MemberReferenceEntity) {
                new ReferenceMemoryOutlet($("<div></div>").appendTo(membersElem), memEntity);
            }
            else {
                createMemoryObjectOutlet($("<div></div>").appendTo(membersElem), this.object.getMemberObject(memName), this.memoryOutlet);
            }
        });
        this.objElem.append(membersElem);
        this.element.append(this.objElem);
        return this;
    }
    updateObject() {
        // nothing to do. member object outlets should handle stuff
    }
    onNamesUpdate() {
        // TODO
    }
}
exports.ClassMemoryObjectOutlet = ClassMemoryObjectOutlet;
class StringMemoryObject extends MemoryObjectOutlet {
    constructor(element, object, memoryOutlet) {
        super(element, object, memoryOutlet);
        this.element.addClass("code-memoryObjectSingle");
        this.addrElem = $("<div class='address'>" + types_1.toHexadecimalString(this.object.address) + "</div>");
        this.element.append(this.addrElem);
        this.objElem = $("<div class='code-memoryObject-object'>" + codeOutlets_1.getValueString(this.object.getMemberObject("data_ptr").getValue()) + "</div>");
        this.element.append(this.objElem);
        if (this.object.name) {
            this.element.append("<span> </span>");
            this.element.append($("<div class='entity'>" + (this.object.name || "") + "</div>"));
        }
        this.updateObject();
    }
    updateObject() {
        var elem = this.objElem;
        let dataPtrVal = this.object.getMemberObject("data_ptr").getValue();
        var str = dataPtrVal.isTyped(types_1.isArrayPointerToType(types_1.Char)) ? codeOutlets_1.cstringToString(dataPtrVal) : codeOutlets_1.getValueString(dataPtrVal);
        if (this.object.type.isType(types_1.Char)) {
            str = str.substr(1, str.length - 2);
        }
        elem.html(str);
        if (this.object.getMemberObject("data_ptr").isValueValid()) {
            elem.removeClass("invalid");
        }
        else {
            elem.addClass("invalid");
        }
    }
    onNamesUpdate() {
        // TODO
    }
}
exports.StringMemoryObject = StringMemoryObject;
class InlinePointedArrayOutlet extends MemoryObjectOutlet {
    // private dataPtr: 
    constructor(element, object, memoryOutlet) {
        super(element, object, memoryOutlet);
        this.objElem = $("<span></span>").appendTo(this.element);
        // this.objElem = $("<div class='code-memoryObject-object'>" + getValueString((<CPPObject<PointerType<Char>>>this.object.getMemberObject("data_ptr")).getValue()) + "</div>");
        // this.element.append(this.objElem);
        // if (this.object.name) {
        //     this.element.append("<span> </span>");
        //     this.element.append($("<div class='entity'>" + (this.object.name || "") + "</div>"));
        // }
        this.updateObject();
    }
    setArrayOutlet(arrayObject) {
        var _a;
        (_a = this.arrayOutlet) === null || _a === void 0 ? void 0 : _a.disconnect();
        this.objElem.empty();
        delete this.arrayOutlet;
        if (arrayObject) {
            this.arrayOutlet = new ArrayMemoryObjectOutlet(this.objElem, arrayObject, this.memoryOutlet);
        }
    }
    updateObject() {
        var _a;
        let type = this.object.type;
        if (!type.isArrayPointerType()) {
            this.setArrayOutlet(undefined);
            return;
        }
        let pointedArr = type.arrayObject;
        if (pointedArr !== ((_a = this.arrayOutlet) === null || _a === void 0 ? void 0 : _a.object)) {
            this.setArrayOutlet(pointedArr);
        }
    }
    onNamesUpdate() {
        // TODO
    }
}
exports.InlinePointedArrayOutlet = InlinePointedArrayOutlet;
class VectorMemoryObject extends MemoryObjectOutlet {
    constructor(element, object, memoryOutlet) {
        super(element, object, memoryOutlet);
        if (this.object.name) {
            this.element.append("<span> </span>");
            this.element.append($("<div class='entity'>" + (this.object.name || "") + "</div>"));
        }
        this.objElem = $("<div></div>").appendTo(this.element);
        new InlinePointedArrayOutlet(this.objElem, this.object.getMemberObject("data_ptr"), memoryOutlet);
    }
    updateObject() {
    }
    onNamesUpdate() {
        // TODO
    }
}
exports.VectorMemoryObject = VectorMemoryObject;
// export class VectorMemoryObject<T extends CompleteClassType> extends MemoryObjectOutlet<T> {
//     protected readonly addrElem : JQuery;
//     public readonly objElem : JQuery;
//     private arrayOutlet?: ArrayMemoryObjectOutlet<ArithmeticType>;
//     private dataPtr: 
//     public constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet) {
//         super(element, object, memoryOutlet);
//         this.element.addClass("code-memoryObjectSingle");
//         this.addrElem = $("<div class='address'>"+toHexadecimalString(this.object.address)+"</div>");
//         this.element.append(this.addrElem);
//         this.objElem = $("<span></span>").appendTo(this.element);
//         // this.objElem = $("<div class='code-memoryObject-object'>" + getValueString((<CPPObject<PointerType<Char>>>this.object.getMemberObject("data_ptr")).getValue()) + "</div>");
//         // this.element.append(this.objElem);
//         // if (this.object.name) {
//         //     this.element.append("<span> </span>");
//         //     this.element.append($("<div class='entity'>" + (this.object.name || "") + "</div>"));
//         // }
//         this.updateObject();
//     }
//     protected updateObject() {
//         new ArrayMemoryObjectOutlet(this.objElem, (<CPPObject<ArrayPointerType>>object.getMemberObject("data_ptr")).type.arrayObject, memoryOutlet);
//         // var elem = this.objElem;
//         // var str = getValueString((<CPPObject<PointerType<Char>>>this.object.getMemberObject("data_ptr")).getValue());
//         // if (this.object.type.isType(Char)) {
//         //     str = str.substr(1,str.length-2);
//         // }
//         // elem.html(str);
//         // if ((<CPPObject<PointerType<Char>>>this.object.getMemberObject("data_ptr")).isValueValid()) {
//         //     elem.removeClass("invalid");
//         // }
//         // else{
//         //     elem.addClass("invalid");
//         // }
//     }
// }
function createMemoryObjectOutlet(elem, obj, memoryOutlet) {
    if (obj.isTyped(types_1.isPointerType)) {
        util_1.assert(obj.type.ptrTo.isCompleteObjectType(), "pointers to incomplete types should not exist at runtime");
        return new PointerMemoryObjectOutlet(elem, obj, memoryOutlet);
    }
    else if (obj.isTyped(types_1.isBoundedArrayType)) {
        return new ArrayMemoryObjectOutlet(elem, obj, memoryOutlet);
    }
    else if (obj.isTyped(types_1.isCompleteClassType)) {
        if (obj.type.className === "string") {
            return new StringMemoryObject(elem, obj, memoryOutlet);
        }
        if (obj.type.className.indexOf("vector") !== -1) {
            return new VectorMemoryObject(elem, obj, memoryOutlet);
        }
        return new ClassMemoryObjectOutlet(elem, obj, memoryOutlet);
    }
    else {
        return new SingleMemoryObject(elem, obj, memoryOutlet);
    }
}
exports.createMemoryObjectOutlet = createMemoryObjectOutlet;
class StackFrameOutlet {
    constructor(element, frame, memoryOutlet) {
        this.referenceOutletsByEntityId = {};
        this.element = element;
        this.frame = frame;
        this.func = frame.func;
        this.memoryOutlet = memoryOutlet;
        observe_1.listenTo(this, frame);
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
        let body = $("<div></div>");
        this.element.append(body);
        let minimizeButton = $("<span class='button'></span>");
        if (this.customizations.minimize === "show") {
            minimizeButton.html("hide");
        }
        else {
            minimizeButton.html("show");
            body.css("display", "none");
        }
        minimizeButton.click(() => {
            body.slideToggle();
            if (minimizeButton.html() === "hide") {
                minimizeButton.html("show");
                this.customizations.minimize = "hide";
            }
            else {
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
    referenceBound(msg) {
        let { entity, object } = msg.data;
        this.referenceOutletsByEntityId[entity.entityId].bind(object);
    }
}
__decorate([
    observe_1.messageResponse("referenceBound")
], StackFrameOutlet.prototype, "referenceBound", null);
exports.StackFrameOutlet = StackFrameOutlet;
const OutletCustomizations = {
    temporaryObjects: {
        minimize: "hide"
    },
    func: {}
};
class StackFramesOutlet {
    constructor(element, memory, memoryOutlet) {
        this.frameElems = [];
        this.element = element;
        this.memoryOutlet = memoryOutlet;
        this.memory = memory;
        observe_1.listenTo(this, memory);
        this.memoryOutlet = memoryOutlet;
        this.element.addClass("code-memoryStack");
        let header = $("<div class='header'>The Stack</div>");
        this.element.append(header);
        this.framesElem = $('<div></div>');
        this.element.append(this.framesElem);
        this.memory.stack.frames.forEach(frame => this.pushFrame(frame));
    }
    pushFrame(frame) {
        let frameElem = $("<div style=\"display: none\"></div>");
        new StackFrameOutlet(frameElem, frame, this.memoryOutlet);
        this.frameElems.push(frameElem);
        this.framesElem.prepend(frameElem);
        if (frame.func.model.context.isLibrary) {
            // leave display as none
        }
        else if (CPP_ANIMATIONS_1.CPP_ANIMATIONS) {
            (this.frameElems.length == 1 ? frameElem.fadeIn(FADE_DURATION) : frameElem.slideDown(SLIDE_DURATION));
        }
        else {
            frameElem.css({ display: "block" });
        }
    }
    framePushed(msg) {
        this.pushFrame(msg.data);
    }
    popFrame() {
        if (CPP_ANIMATIONS_1.CPP_ANIMATIONS) {
            let popped = this.frameElems.pop();
            popped.slideUp(SLIDE_DURATION, function () {
                $(this).remove();
            });
        }
        else {
            let popped = this.frameElems.pop();
            popped.remove();
        }
    }
    framePopped() {
        this.popFrame();
    }
    reset() {
        this.frameElems.length = 0;
        this.framesElem.children("div").remove();
    }
}
__decorate([
    observe_1.messageResponse("framePushed")
], StackFramesOutlet.prototype, "framePushed", null);
__decorate([
    observe_1.messageResponse("framePopped")
], StackFramesOutlet.prototype, "framePopped", null);
__decorate([
    observe_1.messageResponse("reset")
], StackFramesOutlet.prototype, "reset", null);
exports.StackFramesOutlet = StackFramesOutlet;
class HeapOutlet {
    constructor(element, memory, memoryOutlet) {
        this.objectElems = {};
        this.element = element.addClass("code-memoryHeap");
        this.memory = memory;
        this.memoryOutlet = memoryOutlet;
        let header = $("<div class='header'>The Heap</div>");
        this.element.append(header);
        this.objectsElem = $("<div></div>");
        this.element.append(this.objectsElem);
        observe_1.listenTo(this, memory);
        this.objectElems = {};
        for (let key in this.memory.heap.objectMap) {
            this.heapObjectAllocated(this.memory.heap.objectMap[key]);
        }
    }
    heapObjectAllocated(obj) {
        var elem = $("<div style='display: none'></div>");
        createMemoryObjectOutlet(elem, obj, this.memoryOutlet);
        this.objectElems[obj.address] = elem;
        this.objectsElem.prepend(elem);
        if (CPP_ANIMATIONS_1.CPP_ANIMATIONS) {
            elem.slideDown(SLIDE_DURATION);
        }
        else {
            elem.css({ display: "block" });
        }
    }
    heapObjectDeleted(msg) {
        var addr = msg.data.address;
        if (this.objectElems[addr]) {
            this.objectElems[addr].fadeOut(function () {
                $(this).remove();
            });
            delete this.objectElems[addr];
        }
    }
    reset() {
        this.objectElems = {};
        this.objectsElem.children().remove();
    }
}
__decorate([
    observe_1.messageResponse("heapObjectAllocated", "unwrap")
], HeapOutlet.prototype, "heapObjectAllocated", null);
__decorate([
    observe_1.messageResponse("heapObjectDeleted")
], HeapOutlet.prototype, "heapObjectDeleted", null);
__decorate([
    observe_1.messageResponse("reset")
], HeapOutlet.prototype, "reset", null);
exports.HeapOutlet = HeapOutlet;
class TemporaryObjectsOutlet {
    constructor(element, memory, memoryOutlet) {
        this.objectElems = {};
        this.element = element.addClass("code-memoryTemporaryObjects");
        this.memory = memory;
        this.memoryOutlet = memoryOutlet;
        this.customizations = OutletCustomizations.temporaryObjects;
        let header = $("<div class='header'>Temporary Objects</div>");
        this.element.append(header);
        this.objectsElem = $("<div></div>");
        this.element.append(this.objectsElem);
        let minimizeButton = $("<span class='button'></span>");
        if (this.customizations.minimize === "show") {
            minimizeButton.html("hide");
        }
        else {
            minimizeButton.html("show");
            this.objectsElem.css("display", "none");
        }
        minimizeButton.click(() => {
            this.objectsElem.slideToggle();
            if (minimizeButton.html() === "hide") {
                minimizeButton.html("show");
                this.customizations.minimize = "hide";
            }
            else {
                minimizeButton.html("hide");
                this.customizations.minimize = "show";
            }
        });
        header.append(minimizeButton);
        observe_1.listenTo(this, memory);
        this.objectElems = {};
        return this;
    }
    temporaryObjectAllocated(msg) {
        var obj = msg.data;
        var elem = $("<div style='display: none'></div>");
        createMemoryObjectOutlet(elem, obj, this.memoryOutlet);
        this.objectElems[obj.address] = elem;
        this.objectsElem.prepend(elem);
        if (CPP_ANIMATIONS_1.CPP_ANIMATIONS) {
            elem.slideDown(SLIDE_DURATION);
        }
        else {
            elem.css({ display: "block" });
        }
    }
    temporaryObjectDeallocated(msg) {
        var addr = msg.data.address;
        if (this.objectElems[addr]) {
            this.objectElems[addr].fadeOut(function () {
                $(this).remove();
            });
            delete this.objectElems[addr];
        }
    }
    reset() {
        this.objectElems = {};
        this.objectsElem.children().remove();
    }
}
__decorate([
    observe_1.messageResponse("temporaryObjectAllocated")
], TemporaryObjectsOutlet.prototype, "temporaryObjectAllocated", null);
__decorate([
    observe_1.messageResponse("temporaryObjectDeallocated")
], TemporaryObjectsOutlet.prototype, "temporaryObjectDeallocated", null);
__decorate([
    observe_1.messageResponse("reset")
], TemporaryObjectsOutlet.prototype, "reset", null);
exports.TemporaryObjectsOutlet = TemporaryObjectsOutlet;
class RunningCodeOutlet {
    constructor(element) {
        this.element = element;
        this.overlayElem = $("<div class='overlays'></div>");
        this.stackFramesElem = $("<div class='code-simStack'></div>");
        this.element.append(this.overlayElem);
        this.element.append(this.stackFramesElem);
    }
    setSimulation(sim) {
        this.clearSimulation();
        this.sim = sim;
        observe_1.listenTo(this, sim);
        observe_1.listenTo(this, sim.memory);
        this.refreshSimulation();
    }
    clearSimulation() {
        if (this.sim) {
            observe_1.stopListeningTo(this, this.sim);
            observe_1.stopListeningTo(this, this.sim.memory);
        }
        delete this.sim;
        this.refreshSimulation();
    }
    valueTransferOverlay(from, to, html, afterCallback, duration = VALUE_TRANSFER_DURATION) {
        if (CPP_ANIMATIONS_1.CPP_ANIMATIONS) {
            let simOff = this.element.offset();
            let fromOff = from.offset();
            let toOff = to.offset();
            let fromWidth = from.css("width");
            let toWidth = to.css("width");
            if (!simOff || !fromOff || !toOff) {
                return;
            }
            let over = $("<div class='code overlayValue'>" + html + "</div>");
            over.css({ left: fromOff.left - simOff.left, top: fromOff.top - simOff.top + this.element[0].scrollTop });
            over.css({ width: fromWidth });
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
        else {
            afterCallback && afterCallback();
        }
    }
    reset() {
        this.refreshSimulation();
    }
    pushed(frame) {
        this.pushFunction(frame.func);
    }
    popped(msg) {
        if (msg.data instanceof functions_1.RuntimeFunction) {
            this.popFunction();
        }
    }
}
__decorate([
    observe_1.messageResponse("reset")
], RunningCodeOutlet.prototype, "reset", null);
__decorate([
    observe_1.messageResponse("framePushed", "unwrap")
], RunningCodeOutlet.prototype, "pushed", null);
__decorate([
    observe_1.messageResponse("popped")
], RunningCodeOutlet.prototype, "popped", null);
exports.RunningCodeOutlet = RunningCodeOutlet;
class CodeStackOutlet extends RunningCodeOutlet {
    constructor(element) {
        super(element);
        this.functionOutlets = [];
        /**
         * Maps from runtime ID of a RuntimeFunction to the outlet
         * that represents the call to that function.
         */
        this.callOutlets = {};
        this.element.addClass("code-simulation");
        this.frameElems = [];
        // this.framesElement = this.element;
        return this;
    }
    pushFunction(rtFunc) {
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
        let funcOutlet = new codeOutlets_1.FunctionOutlet(functionElem, rtFunc, this);
        this.functionOutlets.push(funcOutlet);
        // Animate!
        if (rtFunc.model.context.isLibrary) {
            // don't animate in
        }
        else if (CPP_ANIMATIONS_1.CPP_ANIMATIONS) {
            (this.frameElems.length == 1 ? frame.fadeIn(FADE_DURATION) : frame.slideDown({ duration: SLIDE_DURATION, progress: function () {
                    //                elem.scrollTop = elem.scrollHeight;
                } }));
        }
        else {
            frame.css({ display: "block" });
            //            this.element[0].scrollTop = this.element[0].scrollHeight;
        }
        return funcOutlet;
    }
    popFunction() {
        //if (rtFunc.model.isImplicit()) {
        //    return;
        //}
        let popped = this.frameElems.pop();
        if (this.frameElems.length == 0 || !CPP_ANIMATIONS_1.CPP_ANIMATIONS) {
            popped.remove();
        }
        else {
            popped.slideUp(SLIDE_DURATION, function () {
                $(this).remove();
            });
        }
        let funcOutlet = this.functionOutlets.pop();
        funcOutlet.removeInstance(); // TODO: may not be necessary since the function should remove itself when popped?
        observe_1.stopListeningTo(this, funcOutlet);
    }
    refreshSimulation() {
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
    childOutletAdded(data) {
        observe_1.listenTo(this, data.child);
    }
    valueTransferStart(data) {
        let { num, start, html } = data;
        let paramOutlet = this.functionOutlets[this.functionOutlets.length - 1].parameterOutlets[num];
        let end = paramOutlet.passedValueElem;
        this.valueTransferOverlay(start, end, html, () => paramOutlet.setPassedContents(html));
    }
    functionCalled(data) {
        this.callOutlets[data.func.runtimeId] = data.outlet;
    }
    returnPassed(data) {
        let { func, start, html, result } = data;
        let callOutlet = this.callOutlets[func.runtimeId];
        if (callOutlet === null || callOutlet === void 0 ? void 0 : callOutlet.returnOutlet) {
            let end = callOutlet.returnOutlet.returnDestinationElement;
            this.valueTransferOverlay(start, end, html, () => { var _a; return (_a = callOutlet === null || callOutlet === void 0 ? void 0 : callOutlet.returnOutlet) === null || _a === void 0 ? void 0 : _a.setReturnedResult(result); });
            delete this.callOutlets[func.runtimeId];
        }
    }
}
__decorate([
    observe_1.messageResponse("childOutletAdded", "unwrap")
], CodeStackOutlet.prototype, "childOutletAdded", null);
__decorate([
    observe_1.messageResponse("parameterPassed", "unwrap")
], CodeStackOutlet.prototype, "valueTransferStart", null);
__decorate([
    observe_1.messageResponse("registerCallOutlet", "unwrap")
], CodeStackOutlet.prototype, "functionCalled", null);
__decorate([
    observe_1.messageResponse("returnPassed", "unwrap")
], CodeStackOutlet.prototype, "returnPassed", null);
exports.CodeStackOutlet = CodeStackOutlet;
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
class IstreamBufferOutlet {
    constructor(element, name) {
        this.element = element.addClass("lobster-istream-buffer");
        element.append(`<span class="lobster-istream-buffer-name">${name} buffer</span>`);
        this.name = name;
        this.bufferContentsElem = $('<div class="lobster-istream-buffer-contents"></div>').appendTo(element);
    }
    setIstream(istream) {
        this.clearIstream();
        this.istream = istream;
        observe_1.listenTo(this, istream);
        this.onBufferUpdate(istream.buffer);
    }
    clearIstream() {
        this.bufferContentsElem.html("");
        if (this.istream) {
            observe_1.stopListeningTo(this, this.istream);
        }
        delete this.istream;
    }
    onBufferUpdate(contents) {
        this.bufferContentsElem.html(`cin <span class="glyphicon glyphicon-arrow-left"></span> ${contents}`);
    }
}
__decorate([
    observe_1.messageResponse("bufferUpdated", "unwrap")
], IstreamBufferOutlet.prototype, "onBufferUpdate", null);
exports.IstreamBufferOutlet = IstreamBufferOutlet;
//# sourceMappingURL=simOutlets.js.map