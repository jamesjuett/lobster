
import {Program, SourceFile} from "../core/Program";
import { Simulation, SimulationEvent } from "../core/Simulation";
import { assert } from "../util/util";

interface VerificationStatus {
    readonly verifierName: string;
    readonly status: "success" | "failure" | "exception";
    readonly message: string;
    readonly exception?: any;
}

const VERIFICATION_SUCCESSFUL : Omit<VerificationStatus, "verifierName"> = {status: "success", message: "test successful"};

export abstract class TestVerifier {
    public readonly abstract verifierName: string;

    public verify(program: Program) : VerificationStatus {
        // try{
            return Object.assign({verifierName: this.verifierName}, this.verifyImpl(program));
        // }
        // catch(e) {
        //     return {verifierName: this.verifierName, status: "exception", message: "The test crashed with an uncaught exception", exception: e};
        // }
    }

    protected abstract verifyImpl(program: Program) : Omit<VerificationStatus, "verifierName">;
}



export class NoErrorsNoWarningsVerifier extends TestVerifier {
    public readonly verifierName = "NoErrorsNoWarningsVerifier";

    protected verifyImpl(program: Program) : Omit<VerificationStatus, "verifierName"> {
        if (!program.notes.hasErrors && !program.notes.hasWarnings) {
            return VERIFICATION_SUCCESSFUL;
        }
        else {
            return {status: "failure", message: "There were errors or warnings, but there shouldn't have been."};
        }
    }
}

export class NoAssertionFailuresVerifier extends TestVerifier {
    public readonly verifierName = "NoAssertionFailureVerifier";

    protected verifyImpl(program: Program) : Omit<VerificationStatus, "verifierName"> {
        if (!program.isRunnable()) {
            return {status: "failure", message: "The program either failed to compile or is missing a main function."};
        }

        let sim = new Simulation(program);
        sim.stepToEnd();

        if (sim.hasEventOccurred(SimulationEvent.ASSERTION_FAILURE)) {
            return {status: "failure", message: "An assertion in the program failed when run."};
        }
        else {
            return VERIFICATION_SUCCESSFUL;
        }
    }
}


export class NoCrashesVerifier extends TestVerifier {
    public readonly verifierName = "NoCrashesVerifier";

    protected verifyImpl(program: Program) : Omit<VerificationStatus, "verifierName"> {
        if (!program.isRunnable()) {
            return {status: "failure", message: "The program either failed to compile or is missing a main function."};
        }

        let sim = new Simulation(program);
        sim.stepToEnd();

        if (sim.hasEventOccurred(SimulationEvent.CRASH)) {
            return {status: "failure", message: "An assertion in the program failed when run."};
        }
        else {
            return VERIFICATION_SUCCESSFUL;
        }
    }
}

/**
 * Checks that no assertions fail and no crashes occur.
 */
export class NoBadRuntimeEventsVerifier extends TestVerifier {
    public readonly verifierName = "NoBadRuntimeEventsVerifier";
    
    public readonly resetAndTestAgain: boolean;

    public constructor(resetAndTestAgain: boolean) {
        super();
        this.resetAndTestAgain = resetAndTestAgain;
    }

    protected verifyImpl(program: Program) : Omit<VerificationStatus, "verifierName"> {
        if (!program.isRunnable()) {
            return {status: "failure", message: "The program either failed to compile or is missing a main function."};
        }

        let eventsToCheck = [
            SimulationEvent.UNDEFINED_BEHAVIOR,
            SimulationEvent.UNSPECIFIED_BEHAVIOR,
            SimulationEvent.IMPLEMENTATION_DEFINED_BEHAVIOR,
            SimulationEvent.MEMORY_LEAK,
            SimulationEvent.ASSERTION_FAILURE,
            SimulationEvent.CRASH];

        let sim = new Simulation(program);
        sim.stepToEnd();

        let stepsTaken1 = sim.stepsTaken;

        for(let i = 0; i < eventsToCheck.length; ++i) {
            let event = eventsToCheck[i];
            if (sim.hasEventOccurred(event)) {
                return {status: "failure", message: "An unexpected runtime event (" + event + ") occurred."};
            }
        }

        if (this.resetAndTestAgain) {
            sim.reset();
            sim.stepToEnd();
            
            let stepsTaken2 = sim.stepsTaken;
    
            for(let i = 0; i < eventsToCheck.length; ++i) {
                let event = eventsToCheck[i];
                if (sim.hasEventOccurred(event)) {
                    return {status: "failure", message: "The simulation worked the first time, but an unexpected runtime event (" + event + ") occurred after resetting and running again."};
                }
            }
            
            if (stepsTaken1 !== stepsTaken2) {
                return {status: "failure", message: "The simulation took a different number of steps to finish the 2nd time it ran (after a reset)."};
            }
        }

        return VERIFICATION_SUCCESSFUL;
    }
}

type TestReporter = (test: ProgramTest) => void;

export class ProgramTest {

    private static _defaultReporter?: TestReporter;

    public static setDefaultReporter(reporter: TestReporter) {
        ProgramTest._defaultReporter = reporter;
    }

    public readonly name: string;
    public readonly program: Program;
    public readonly results: readonly VerificationStatus[];
    
    public constructor(name: string, sourceFiles: readonly SourceFile[], translationUnits: readonly string[],
        verifiers: TestVerifier | readonly TestVerifier[], reporter: TestReporter | undefined = ProgramTest._defaultReporter) {
        
        assert(reporter !== undefined, "Individual reporter or default reporter must be specified.");

        this.name = name;
        if (verifiers instanceof TestVerifier) {
            verifiers = [verifiers];
        }

        this.program = new Program(sourceFiles, translationUnits);

        this.results = verifiers.map((verifier) => {
            return verifier.verify(this.program);
        });

        reporter && reporter(this);
    }
}

export class SingleTranslationUnitTest extends ProgramTest {

    public constructor(name: string, sourceText: string, verifiers: TestVerifier | readonly TestVerifier[]) {
        super(name, [new SourceFile("test.cpp", sourceText)], ["test.cpp"], verifiers);
    }
    
}