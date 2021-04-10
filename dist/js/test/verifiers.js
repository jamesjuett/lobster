"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleTranslationUnitTest = exports.ProgramTest = exports.BasicSynchronousRunnerTest = exports.NoBadRuntimeEventsVerifier = exports.EndOfMainStateVerifier = exports.OutputVerifier = exports.NoCrashesVerifier = exports.NoAssertionFailuresVerifier = exports.NoteVerifier = exports.NoErrorsNoWarningsVerifier = exports.TestVerifier = void 0;
const Program_1 = require("../core/Program");
const Simulation_1 = require("../core/Simulation");
const util_1 = require("../util/util");
const simulationRunners_1 = require("../core/simulationRunners");
const VERIFICATION_SUCCESSFUL = { status: "success", message: "test successful" };
class TestVerifier {
    verify(program) {
        try {
            return Object.assign({ verifierName: this.verifierName }, this.verifyImpl(program));
        }
        catch (e) {
            if (e.status && e.status === "failure") {
                return Object.assign({ verifierName: this.verifierName }, e);
            }
            // throw e;
            return { verifierName: this.verifierName, status: "exception", message: "The test crashed with an uncaught exception", exception: e };
        }
    }
}
exports.TestVerifier = TestVerifier;
class NoErrorsNoWarningsVerifier extends TestVerifier {
    constructor() {
        super(...arguments);
        this.verifierName = "NoErrorsNoWarningsVerifier";
    }
    verifyImpl(program) {
        if (!program.notes.hasErrors && !program.notes.hasWarnings) {
            return VERIFICATION_SUCCESSFUL;
        }
        else {
            return { status: "failure", message: "There were errors or warnings, but there shouldn't have been." };
        }
    }
}
exports.NoErrorsNoWarningsVerifier = NoErrorsNoWarningsVerifier;
class NoteVerifier extends TestVerifier {
    constructor(notesToVerify) {
        super();
        this.verifierName = "NoteVerifier";
        this.notesToVerify = notesToVerify;
    }
    verifyImpl(program) {
        let verifiedNotes = [];
        let missingNotes = [];
        let extraNotes = [];
        let notesMap = {};
        program.notes.allNotes.forEach((note) => {
            var _a, _b;
            let notes = (_a = notesMap[note.id]) !== null && _a !== void 0 ? _a : (notesMap[note.id] = []);
            notes.push((_b = note.primarySourceReference) === null || _b === void 0 ? void 0 : _b.line);
        });
        this.notesToVerify.forEach(n => {
            let matchingNotes = notesMap[n.id];
            if (matchingNotes) {
                let i = matchingNotes.indexOf(n.line);
                if (i !== -1) {
                    verifiedNotes.push(n);
                    matchingNotes.splice(i, 1);
                    return;
                }
            }
            missingNotes.push(n);
        });
        for (let id in notesMap) {
            notesMap[id].forEach((line) => extraNotes.push({ line: line, id: id }));
        }
        if (missingNotes.length === 0 && extraNotes.length === 0) {
            return VERIFICATION_SUCCESSFUL;
        }
        else {
            return { status: "failure", message: `There were missing or extra notes.
Verified:
<pre>
${JSON.stringify(verifiedNotes, null, 2)}
</pre>

Missing:
<pre>
${JSON.stringify(missingNotes, null, 2)}
</pre>

Extra:
<pre>
${JSON.stringify(extraNotes, null, 2)}
</pre>
` };
        }
    }
}
exports.NoteVerifier = NoteVerifier;
class NoAssertionFailuresVerifier extends TestVerifier {
    constructor() {
        super(...arguments);
        this.verifierName = "NoAssertionFailureVerifier";
    }
    verifyImpl(program) {
        if (!program.isRunnable()) {
            return { status: "failure", message: "The program either failed to compile or is missing a main function." };
        }
        let sim = new Simulation_1.Simulation(program);
        sim.stepToEnd();
        if (sim.hasEventOccurred(Simulation_1.SimulationEvent.ASSERTION_FAILURE)) {
            return { status: "failure", message: "An assertion in the program failed when run." };
        }
        else {
            return VERIFICATION_SUCCESSFUL;
        }
    }
}
exports.NoAssertionFailuresVerifier = NoAssertionFailuresVerifier;
class NoCrashesVerifier extends TestVerifier {
    constructor() {
        super(...arguments);
        this.verifierName = "NoCrashesVerifier";
    }
    verifyImpl(program) {
        if (!program.isRunnable()) {
            return { status: "failure", message: "The program either failed to compile or is missing a main function." };
        }
        let sim = new Simulation_1.Simulation(program);
        sim.stepToEnd();
        if (sim.hasEventOccurred(Simulation_1.SimulationEvent.CRASH)) {
            return { status: "failure", message: "An assertion in the program failed when run." };
        }
        else {
            return VERIFICATION_SUCCESSFUL;
        }
    }
}
exports.NoCrashesVerifier = NoCrashesVerifier;
class OutputVerifier extends TestVerifier {
    constructor(expectedOutput) {
        super();
        this.verifierName = "OutputVerifier";
        this.expectedOutput = expectedOutput;
    }
    verifyImpl(program) {
        if (!program.isRunnable()) {
            return { status: "failure", message: "The program either failed to compile or is missing a main function." };
        }
        let sim = new Simulation_1.Simulation(program);
        sim.stepToEnd();
        if (sim.allOutput === this.expectedOutput) {
            return VERIFICATION_SUCCESSFUL;
        }
        else {
            return { status: "failure", message: "The program's output did not match what was expected." };
        }
    }
}
exports.OutputVerifier = OutputVerifier;
class EndOfMainStateVerifier extends TestVerifier {
    constructor(criteria, input = "", stepLimit = 1000) {
        super();
        this.verifierName = "EndOfMainStateVerifier";
        this.criteria = criteria;
        this.input = input;
        this.stepLimit = stepLimit;
    }
    verifyImpl(program) {
        if (!program.isRunnable()) {
            return { status: "failure", message: "The program either failed to compile or is missing a main function." };
        }
        let sim = new Simulation_1.Simulation(program);
        if (this.input !== "") {
            sim.cin.addToBuffer(this.input);
        }
        let runner = new simulationRunners_1.SynchronousSimulationRunner(sim);
        runner.stepToEndOfMain(this.stepLimit, true);
        if (this.criteria(sim)) {
            return VERIFICATION_SUCCESSFUL;
        }
        else {
            return { status: "failure", message: "The programs end-of-main state did not match what was expected." };
        }
    }
}
exports.EndOfMainStateVerifier = EndOfMainStateVerifier;
/**
 * Checks that no assertions fail and no crashes occur.
 */
class NoBadRuntimeEventsVerifier extends TestVerifier {
    constructor(resetAndTestAgain) {
        super();
        this.verifierName = "NoBadRuntimeEventsVerifier";
        this.resetAndTestAgain = resetAndTestAgain;
    }
    verifyImpl(program) {
        if (!program.isRunnable()) {
            return { status: "failure", message: "The program either failed to compile or is missing a main function." };
        }
        let eventsToCheck = [
            Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR,
            Simulation_1.SimulationEvent.UNSPECIFIED_BEHAVIOR,
            Simulation_1.SimulationEvent.IMPLEMENTATION_DEFINED_BEHAVIOR,
            Simulation_1.SimulationEvent.MEMORY_LEAK,
            Simulation_1.SimulationEvent.ASSERTION_FAILURE,
            Simulation_1.SimulationEvent.CRASH
        ];
        let sim = new Simulation_1.Simulation(program);
        sim.stepToEnd();
        let stepsTaken1 = sim.stepsTaken;
        for (let i = 0; i < eventsToCheck.length; ++i) {
            let event = eventsToCheck[i];
            if (sim.hasEventOccurred(event)) {
                return { status: "failure", message: "An unexpected runtime event (" + event + ") occurred." };
            }
        }
        if (this.resetAndTestAgain) {
            sim.reset();
            sim.stepToEnd();
            let stepsTaken2 = sim.stepsTaken;
            for (let i = 0; i < eventsToCheck.length; ++i) {
                let event = eventsToCheck[i];
                if (sim.hasEventOccurred(event)) {
                    return { status: "failure", message: "The simulation worked the first time, but an unexpected runtime event (" + event + ") occurred after resetting and running again." };
                }
            }
            if (stepsTaken1 !== stepsTaken2) {
                return { status: "failure", message: "The simulation took a different number of steps to finish the 2nd time it ran (after a reset)." };
            }
        }
        return VERIFICATION_SUCCESSFUL;
    }
}
exports.NoBadRuntimeEventsVerifier = NoBadRuntimeEventsVerifier;
function checkState(sim1, sim2) {
    if (sim1.printState() !== sim2.printState()) {
        throw { status: "failure", message: "The program's state was not what was expected." };
    }
}
class BasicSynchronousRunnerTest extends TestVerifier {
    constructor() {
        super();
        this.verifierName = "SynchronousRunnerTest";
    }
    verifyImpl(program) {
        if (!program.isRunnable()) {
            return { status: "failure", message: "The program either failed to compile or is missing a main function." };
        }
        let sim = new Simulation_1.Simulation(program);
        let simR = new Simulation_1.Simulation(program);
        checkState(sim, simR);
        let runner = new simulationRunners_1.SynchronousSimulationRunner(simR);
        checkState(sim, simR);
        runner.reset();
        checkState(sim, simR);
        sim.stepForward();
        runner.stepForward();
        checkState(sim, simR);
        sim.reset();
        runner.reset();
        checkState(sim, simR);
        for (let i = 0; i < 10; ++i) {
            sim.stepForward();
        }
        runner.stepForward(10);
        checkState(sim, simR);
        sim.reset();
        runner.reset();
        checkState(sim, simR);
        while (!sim.atEnd) {
            sim.stepForward();
        }
        runner.stepToEnd();
        checkState(sim, simR);
        let totalSteps = sim.stepsTaken;
        sim.reset();
        runner.reset();
        checkState(sim, simR);
        for (let i = 0; i < totalSteps - 1; ++i) {
            sim.stepForward();
        }
        runner.stepToEnd();
        runner.stepBackward();
        checkState(sim, simR);
        sim.reset();
        runner.reset();
        checkState(sim, simR);
        for (let i = 0; i < 10; ++i) {
            sim.stepForward();
        }
        runner.stepToEnd();
        runner.stepBackward(totalSteps - 10);
        checkState(sim, simR);
        return VERIFICATION_SUCCESSFUL;
    }
}
exports.BasicSynchronousRunnerTest = BasicSynchronousRunnerTest;
class ProgramTest {
    constructor(name, sourceFiles, translationUnits, verifiers, reporter = ProgramTest._defaultReporter) {
        util_1.assert(reporter !== undefined, "Individual reporter or default reporter must be specified.");
        this.name = name;
        if (verifiers instanceof TestVerifier) {
            verifiers = [verifiers];
        }
        this.verifiers = verifiers;
        this.program = new Program_1.Program(sourceFiles, new Set(translationUnits));
        this.reporter = reporter;
        this.results = this.verifiers.map((verifier) => {
            return verifier.verify(this.program);
        });
        this.reporter(this);
    }
    static setDefaultReporter(reporter) {
        ProgramTest._defaultReporter = reporter;
    }
}
exports.ProgramTest = ProgramTest;
class SingleTranslationUnitTest extends ProgramTest {
    constructor(name, sourceText, verifiers) {
        super(name, [new Program_1.SourceFile("test.cpp", sourceText)], ["test.cpp"], verifiers);
    }
}
exports.SingleTranslationUnitTest = SingleTranslationUnitTest;
// export class AsynchronousProgramTest extends ProgramTest {
//     protected async verifyAndReport() {
//         (<Mutable<this>>this).results = this.verifiers.map((verifier) => {
//             return verifier.verify(this.program);
//         });
//         this.reporter && this.reporter(this);
//     }
// }
//# sourceMappingURL=verifiers.js.map