"use strict";
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
exports.StaticAnalysisCheckpoint = exports.EndOfMainStateCheckpoint = exports.outputComparator = exports.OutputCheckpoint = exports.removeWhitespace = exports.IsCompiledCheckpoint = exports.Checkpoint = void 0;
const Simulation_1 = require("../core/Simulation");
const simulationRunners_1 = require("../core/simulationRunners");
class Checkpoint {
    constructor(name) {
        this.name = name;
    }
}
exports.Checkpoint = Checkpoint;
class IsCompiledCheckpoint extends Checkpoint {
    evaluate(project) {
        return __awaiter(this, void 0, void 0, function* () {
            return project.program.isCompiled();
        });
    }
}
exports.IsCompiledCheckpoint = IsCompiledCheckpoint;
function removeWhitespace(str) {
    return str.replace(/\s+/g, '');
}
exports.removeWhitespace = removeWhitespace;
// TODO: reduce duplication with EndOfMainStateCheckpoint
class OutputCheckpoint extends Checkpoint {
    constructor(name, expected, input = "", stepLimit = 1000) {
        super(name);
        this.expected = expected;
        this.input = input;
        this.stepLimit = stepLimit;
    }
    // May throw if interrupted during async running
    evaluate(project) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.runner) {
                this.runner.pause();
                delete this.runner;
            }
            let program = project.program;
            if (!program.isRunnable()) {
                return false;
            }
            let sim = new Simulation_1.Simulation(program);
            if (this.input !== "") {
                sim.cin.addToBuffer(this.input);
            }
            let runner = this.runner = new simulationRunners_1.AsynchronousSimulationRunner(sim);
            // may throw if interrupted
            yield runner.stepToEnd(0, this.stepLimit, true);
            return sim.atEnd && this.expected(sim.allOutput, project);
        });
    }
}
exports.OutputCheckpoint = OutputCheckpoint;
function outputComparator(desiredOutput, ignoreWhitespace = false) {
    if (ignoreWhitespace) {
        return (output) => {
            return removeWhitespace(output) === removeWhitespace(desiredOutput);
        };
    }
    else {
        return (output) => {
            return output === desiredOutput;
        };
    }
}
exports.outputComparator = outputComparator;
class EndOfMainStateCheckpoint extends Checkpoint {
    constructor(name, criteria, input = "", stepLimit = 1000) {
        super(name);
        this.criteria = criteria;
        this.input = input;
        this.stepLimit = stepLimit;
    }
    // May throw if interrupted during async running
    evaluate(project) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.runner) {
                this.runner.pause();
                delete this.runner;
            }
            let program = project.program;
            if (!program.isRunnable()) {
                return false;
            }
            let sim = new Simulation_1.Simulation(program);
            if (this.input !== "") {
                sim.cin.addToBuffer(this.input);
            }
            let runner = this.runner = new simulationRunners_1.AsynchronousSimulationRunner(sim);
            // may throw if interrupted
            yield runner.stepToEndOfMain(0, this.stepLimit, true);
            return sim.atEndOfMain() && this.criteria(sim);
        });
    }
}
exports.EndOfMainStateCheckpoint = EndOfMainStateCheckpoint;
class StaticAnalysisCheckpoint extends Checkpoint {
    constructor(name, criterion) {
        super(name);
        this.criterion = criterion;
    }
    evaluate(project) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.criterion(project.program, project);
        });
    }
}
exports.StaticAnalysisCheckpoint = StaticAnalysisCheckpoint;
//# sourceMappingURL=checkpoints.js.map