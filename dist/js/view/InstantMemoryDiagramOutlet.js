"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
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
exports.InstantMemoryDiagramOutlet = void 0;
const Simulation_1 = require("../core/Simulation");
const simulationRunners_1 = require("../core/simulationRunners");
const observe_1 = require("../util/observe");
const simOutlets_1 = require("./simOutlets");
class InstantMemoryDiagramOutlet {
    constructor(element, project, isActive) {
        this.element = element;
        this.isActive = isActive;
        this.memoryOutlet = new simOutlets_1.MemoryOutlet(element);
        this.project = project;
        observe_1.listenTo(this, project);
    }
    setActive(isActive) {
        this.isActive = isActive;
        this.updateMemory();
    }
    setProject(project) {
        if (this.project) {
            observe_1.stopListeningTo(this, this.project);
        }
        this.project = project;
        observe_1.listenTo(this, this.project);
        this.updateMemory();
    }
    updateMemory() {
        return __awaiter(this, void 0, void 0, function* () {
            let program = this.project.program;
            if (!this.isActive) {
                this.memoryOutlet.clearMemory();
                return;
            }
            if (!program.isRunnable()) {
                return;
            }
            let sim = new Simulation_1.Simulation(program);
            this.memoryOutlet.setMemory(sim.memory);
            let simRunner = new simulationRunners_1.AsynchronousSimulationRunner(sim);
            yield simRunner.stepToEndOfMain(0, 1000);
        });
    }
    onCompilationFinished() {
        this.updateMemory();
    }
}
__decorate([
    observe_1.messageResponse("compilationFinished")
], InstantMemoryDiagramOutlet.prototype, "onCompilationFinished", null);
exports.InstantMemoryDiagramOutlet = InstantMemoryDiagramOutlet;
//# sourceMappingURL=InstantMemoryDiagramOutlet.js.map