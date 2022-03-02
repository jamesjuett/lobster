import { Program, SourceFile } from '../core/Program';
import { Simulation, SimulationEvent } from '../core/Simulation';
import { assert, Mutable } from '../util/util';
import { SynchronousSimulationRunner } from '../core/simulationRunners';
import { Line } from '@svgdotjs/svg.js';

interface VerificationStatus {
  readonly verifierName: string;
  readonly status: 'success' | 'failure' | 'exception';
  readonly message: string;
  readonly exception?: any;
}

const VERIFICATION_SUCCESSFUL: Omit<VerificationStatus, 'verifierName'> = {
  status: 'success',
  message: 'test successful',
};

export abstract class TestVerifier {
  public abstract readonly verifierName: string;

  public verify(program: Program): VerificationStatus {
    try {
      return Object.assign({ verifierName: this.verifierName }, this.verifyImpl(program));
    } catch (e) {
      if (e.status && e.status === 'failure') {
        return Object.assign({ verifierName: this.verifierName }, e);
      }

      // throw e;
      return {
        verifierName: this.verifierName,
        status: 'exception',
        message: 'The test crashed with an uncaught exception',
        exception: e,
      };
    }
  }

  protected abstract verifyImpl(program: Program): Omit<VerificationStatus, 'verifierName'>;
}

export class NoErrorsNoWarningsVerifier extends TestVerifier {
  public readonly verifierName = 'NoErrorsNoWarningsVerifier';

  protected verifyImpl(program: Program): Omit<VerificationStatus, 'verifierName'> {
    if (!program.notes.hasErrors && !program.notes.hasWarnings) {
      return VERIFICATION_SUCCESSFUL;
    } else {
      return {
        status: 'failure',
        message: "There were errors or warnings, but there shouldn't have been.",
      };
    }
  }
}

export interface NoteVerification {
  readonly line: number | undefined;
  readonly id: string;
}

export class NoteVerifier extends TestVerifier {
  public readonly verifierName = 'NoteVerifier';

  public readonly notesToVerify: readonly NoteVerification[];

  public constructor(notesToVerify: readonly NoteVerification[]) {
    super();
    this.notesToVerify = notesToVerify;
  }

  protected verifyImpl(program: Program): Omit<VerificationStatus, 'verifierName'> {
    let verifiedNotes: NoteVerification[] = [];
    let missingNotes: NoteVerification[] = [];
    let extraNotes: NoteVerification[] = [];

    let notesMap: { [index: string]: (number | undefined)[] } = {};
    program.notes.allNotes.forEach(note => {
      let notes = notesMap[note.id] ?? (notesMap[note.id] = []);
      notes.push(note.primarySourceReference?.line);
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
      notesMap[id].forEach(line => extraNotes.push({ line: line, id: id }));
    }

    if (missingNotes.length === 0 && extraNotes.length === 0) {
      return VERIFICATION_SUCCESSFUL;
    } else {
      return {
        status: 'failure',
        message: `There were missing or extra notes.
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
`,
      };
    }
  }
}

export class NoAssertionFailuresVerifier extends TestVerifier {
  public readonly verifierName = 'NoAssertionFailureVerifier';

  protected verifyImpl(program: Program): Omit<VerificationStatus, 'verifierName'> {
    if (!program.isRunnable()) {
      return {
        status: 'failure',
        message: 'The program either failed to compile or is missing a main function.',
      };
    }

    let sim = new Simulation(program);
    sim.stepToEnd();

    if (sim.hasEventOccurred(SimulationEvent.ASSERTION_FAILURE)) {
      return { status: 'failure', message: 'An assertion in the program failed when run.' };
    } else {
      return VERIFICATION_SUCCESSFUL;
    }
  }
}

export class NoCrashesVerifier extends TestVerifier {
  public readonly verifierName = 'NoCrashesVerifier';

  protected verifyImpl(program: Program): Omit<VerificationStatus, 'verifierName'> {
    if (!program.isRunnable()) {
      return {
        status: 'failure',
        message: 'The program either failed to compile or is missing a main function.',
      };
    }

    let sim = new Simulation(program);
    sim.stepToEnd();

    if (sim.hasEventOccurred(SimulationEvent.CRASH)) {
      return { status: 'failure', message: 'An assertion in the program failed when run.' };
    } else {
      return VERIFICATION_SUCCESSFUL;
    }
  }
}

export class OutputVerifier extends TestVerifier {
  public readonly verifierName = 'OutputVerifier';

  public readonly expectedOutput: string;

  public readonly input: string;
  public readonly stepLimit: number;

  public constructor(expectedOutput: string, input: string = '', stepLimit: number = 1000) {
    super();
    this.expectedOutput = expectedOutput;
    this.input = input;
    this.stepLimit = stepLimit;
  }

  protected verifyImpl(program: Program): Omit<VerificationStatus, 'verifierName'> {
    if (!program.isRunnable()) {
      return {
        status: 'failure',
        message: 'The program either failed to compile or is missing a main function.',
      };
    }

    let sim = new Simulation(program);
    if (this.input !== '') {
      sim.cin.addToBuffer(this.input);
    }
    let runner = new SynchronousSimulationRunner(sim);
    runner.stepToEnd(this.stepLimit, true);

    if (!sim.atEnd) {
      return {
        status: 'failure',
        message:
          'The simulation did not reach the end of the program. (It may also have terminated due to unavialable input.)',
      };
    }

    if (sim.allOutput === this.expectedOutput) {
      return VERIFICATION_SUCCESSFUL;
    } else {
      return {
        status: 'failure',
        message: "The program's output did not match what was expected.",
      };
    }
  }
}

export class EndOfMainStateVerifier extends TestVerifier {
  public readonly verifierName = 'EndOfMainStateVerifier';

  public readonly input: string;
  public readonly stepLimit: number;

  private criteria: (sim: Simulation) => boolean;

  public constructor(
    criteria: (sim: Simulation) => boolean,
    input: string = '',
    stepLimit: number = 1000
  ) {
    super();
    this.criteria = criteria;
    this.input = input;
    this.stepLimit = stepLimit;
  }

  protected verifyImpl(program: Program): Omit<VerificationStatus, 'verifierName'> {
    if (!program.isRunnable()) {
      return {
        status: 'failure',
        message: 'The program either failed to compile or is missing a main function.',
      };
    }

    let sim = new Simulation(program);
    if (this.input !== '') {
      sim.cin.addToBuffer(this.input);
    }
    let runner = new SynchronousSimulationRunner(sim);
    runner.stepToEndOfMain(this.stepLimit, true);

    if (!sim.atEndOfMain) {
      return {
        status: 'failure',
        message:
          'The simulation did not reach the end of the main function. (It may also have terminated due to unavialable input.)',
      };
    }

    if (this.criteria(sim)) {
      return VERIFICATION_SUCCESSFUL;
    } else {
      return {
        status: 'failure',
        message: 'The programs end-of-main state did not match what was expected.',
      };
    }
  }
}

/**
 * Checks that no assertions fail and no crashes occur.
 */
export class NoBadRuntimeEventsVerifier extends TestVerifier {
  public readonly verifierName = 'NoBadRuntimeEventsVerifier';

  public readonly input: string;
  public readonly stepLimit: number;

  public readonly resetAndTestAgain: boolean;

  public constructor(resetAndTestAgain: boolean, input: string = '', stepLimit: number = 1000) {
    super();
    this.resetAndTestAgain = resetAndTestAgain;
    this.input = input;
    this.stepLimit = stepLimit;
  }

  protected verifyImpl(program: Program): Omit<VerificationStatus, 'verifierName'> {
    if (!program.isRunnable()) {
      return {
        status: 'failure',
        message: 'The program either failed to compile or is missing a main function.',
      };
    }

    let eventsToCheck = [
      SimulationEvent.UNDEFINED_BEHAVIOR,
      SimulationEvent.UNSPECIFIED_BEHAVIOR,
      SimulationEvent.IMPLEMENTATION_DEFINED_BEHAVIOR,
      SimulationEvent.MEMORY_LEAK,
      SimulationEvent.ASSERTION_FAILURE,
      SimulationEvent.CRASH,
    ];

    let sim = new Simulation(program);
    if (this.input !== '') {
      sim.cin.addToBuffer(this.input);
    }
    let runner = new SynchronousSimulationRunner(sim);
    runner.stepToEnd(this.stepLimit, true);

    if (!sim.atEnd) {
      return {
        status: 'failure',
        message:
          'The simulation did not reach the end of the program. (It may also have terminated due to unavialable input.)',
      };
    }

    let stepsTaken1 = sim.stepsTaken;

    for (let i = 0; i < eventsToCheck.length; ++i) {
      let event = eventsToCheck[i];
      if (sim.hasEventOccurred(event)) {
        return {
          status: 'failure',
          message: 'An unexpected runtime event (' + event + ') occurred.',
        };
      }
    }

    if (this.resetAndTestAgain) {
      runner.reset();
      if (this.input !== '') {
        sim.cin.addToBuffer(this.input);
      }
      runner.stepToEnd(this.stepLimit, true);

      if (!sim.atEnd) {
        return {
          status: 'failure',
          message:
            'The simulation did not reach the end of the program. (It may also have terminated due to unavialable input.)',
        };
      }

      let stepsTaken2 = sim.stepsTaken;

      for (let i = 0; i < eventsToCheck.length; ++i) {
        let event = eventsToCheck[i];
        if (sim.hasEventOccurred(event)) {
          return {
            status: 'failure',
            message:
              'The simulation worked the first time, but an unexpected runtime event (' +
              event +
              ') occurred after resetting and running again.',
          };
        }
      }

      if (stepsTaken1 !== stepsTaken2) {
        return {
          status: 'failure',
          message:
            'The simulation took a different number of steps to finish the 2nd time it ran (after a reset).',
        };
      }
    }

    return VERIFICATION_SUCCESSFUL;
  }
}

function checkState(sim1: Simulation, sim2: Simulation) {
  if (sim1.printState() !== sim2.printState()) {
    throw { status: 'failure', message: "The program's state was not what was expected." };
  }
}

export class BasicSynchronousRunnerTest extends TestVerifier {
  public readonly verifierName = 'SynchronousRunnerTest';

  public constructor() {
    super();
  }

  protected verifyImpl(program: Program): Omit<VerificationStatus, 'verifierName'> {
    if (!program.isRunnable()) {
      return {
        status: 'failure',
        message: 'The program either failed to compile or is missing a main function.',
      };
    }

    let sim = new Simulation(program);
    let simR = new Simulation(program);

    checkState(sim, simR);

    let runner = new SynchronousSimulationRunner(simR);
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

type TestReporter = (test: ProgramTest) => void;

export class ProgramTest {
  private static _defaultReporter?: TestReporter;

  public static setDefaultReporter(reporter: TestReporter) {
    ProgramTest._defaultReporter = reporter;
  }

  public readonly name: string;
  public readonly program: Program;
  public readonly verifiers: readonly TestVerifier[];
  public readonly results: readonly VerificationStatus[];

  protected readonly reporter: TestReporter;

  public constructor(
    name: string,
    sourceFiles: readonly SourceFile[],
    translationUnits: readonly string[],
    verifiers: TestVerifier | readonly TestVerifier[],
    reporter: TestReporter | undefined = ProgramTest._defaultReporter
  ) {
    assert(reporter !== undefined, 'Individual reporter or default reporter must be specified.');

    this.name = name;

    if (verifiers instanceof TestVerifier) {
      verifiers = [verifiers];
    }
    this.verifiers = verifiers;

    this.program = new Program(sourceFiles, new Set<string>(translationUnits));

    this.reporter = reporter!;

    this.results = this.verifiers.map(verifier => {
      return verifier.verify(this.program);
    });

    this.reporter(<FinishedProgramTest>this);
  }
}

export interface FinishedProgramTest extends ProgramTest {
  readonly results: readonly VerificationStatus[];
}

export class SingleTranslationUnitTest extends ProgramTest {
  public constructor(
    name: string,
    sourceText: string,
    verifiers: TestVerifier | readonly TestVerifier[]
  ) {
    super(name, [new SourceFile('test.cpp', sourceText)], ['test.cpp'], verifiers);
  }
}

// export class AsynchronousProgramTest extends ProgramTest {

//     protected async verifyAndReport() {

//         (<Mutable<this>>this).results = this.verifiers.map((verifier) => {
//             return verifier.verify(this.program);
//         });

//         this.reporter && this.reporter(this);

//     }
// }
