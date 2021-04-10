"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleExerciseLobsterOutlet = void 0;
const simOutlets_1 = require("./simOutlets");
const editors_1 = require("./editors");
const Simulation_1 = require("../core/Simulation");
const observe_1 = require("../util/observe");
const checkpointOutlets_1 = require("./checkpointOutlets");
const InstantMemoryDiagramOutlet_1 = require("./InstantMemoryDiagramOutlet");
class SimpleExerciseLobsterOutlet {
    constructor(element, project) {
        this.element = element;
        // Set up simulation and source tabs
        // var sourceTab = element.find(".sourceTab");
        // var simTab = element.find(".simTab");
        this.tabsElem = element.find(".lobster-simulation-outlet-tabs");
        // TODO: HACK to make codeMirror refresh correctly when sourcePane becomes visible
        this.tabsElem.find('a.lobster-source-tab').on("shown.bs.tab", () => {
            this.projectEditor.refreshEditorView();
        });
        this.simulationOutlet = new simOutlets_1.SimulationOutlet(element.find(".lobster-sim-pane"));
        this.simulateTabElem = element.find(".lobster-simulate-tab");
        this.setSimulationTabEnabled(false);
        let runButtonElem = element.find(".runButton")
            .click(() => {
            let program = this.project.program;
            if (program.isRunnable()) {
                let sim = new Simulation_1.Simulation(program);
                while (!sim.globalAllocator.isDone) {
                    sim.stepForward(); // TODO: put this loop in simulation runners in function to skip stuff before main
                }
                this.setSimulation(sim);
            }
            this.simulateTabElem.tab("show");
        });
        this.projectEditor = new editors_1.ProjectEditor(element.find(".lobster-source-pane"), project);
        this.compilationOutlet = new editors_1.CompilationOutlet(element.find(".lobster-compilation-pane"), project);
        this.compilationStatusOutlet = new editors_1.CompilationStatusOutlet(element.find(".compilation-status-outlet"), project);
        this.checkpointsOutlet = new checkpointOutlets_1.CheckpointsOutlet(element.find(".lobster-ex-checkpoints"), project.exercise);
        let IMDOElem = element.find(".lobster-instant-memory-diagram");
        this.instantMemoryDiagramOutlet = new InstantMemoryDiagramOutlet_1.InstantMemoryDiagramOutlet(IMDOElem, project, false);
        this.isInstantMemoryDiagramActive = false;
        element.find(".lobster-instant-memory-diagram-buttons button").on("click", () => {
            ["active", "btn-default", "btn-primary"].forEach(c => element.find(".lobster-instant-memory-diagram-buttons button").toggleClass(c));
            this.isInstantMemoryDiagramActive = !this.isInstantMemoryDiagramActive;
            this.instantMemoryDiagramOutlet.setActive(this.isInstantMemoryDiagramActive);
            if (this.isInstantMemoryDiagramActive) {
                IMDOElem.show();
            }
            else {
                IMDOElem.hide();
            }
        });
        this.project = project;
    }
    setProject(project) {
        this.project = project;
        this.projectEditor.setProject(project);
        this.compilationOutlet.setProject(project);
        this.compilationStatusOutlet.setProject(project);
        this.checkpointsOutlet.setExercise(project.exercise);
        this.instantMemoryDiagramOutlet.setProject(project);
        return this.project;
    }
    setSimulation(sim) {
        this.clearSimulation();
        this.sim = sim;
        observe_1.listenTo(this, sim);
        this.simulationOutlet.setSimulation(sim);
        this.setSimulationTabEnabled(true);
    }
    clearSimulation() {
        this.setSimulationTabEnabled(false);
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
    setSimulationTabEnabled(isEnabled) {
        if (isEnabled) {
            this.simulateTabElem.parent().removeClass("disabled");
        }
        else {
            this.simulateTabElem.parent().addClass("disabled");
        }
    }
}
__decorate([
    observe_1.messageResponse("requestFocus")
], SimpleExerciseLobsterOutlet.prototype, "requestFocus", null);
__decorate([
    observe_1.messageResponse("beforeStepForward")
], SimpleExerciseLobsterOutlet.prototype, "beforeStepForward", null);
exports.SimpleExerciseLobsterOutlet = SimpleExerciseLobsterOutlet;
//# sourceMappingURL=SimpleExerciseLobsterOutlet.js.map