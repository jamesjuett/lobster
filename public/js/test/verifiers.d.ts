import { Program, SourceFile } from "../core/Program";
interface VerificationStatus {
    readonly verifierName: string;
    readonly status: "success" | "failure" | "exception";
    readonly message: string;
    readonly exception?: any;
}
export declare abstract class TestVerifier {
    abstract readonly verifierName: string;
    verify(program: Program): VerificationStatus;
    protected abstract verifyImpl(program: Program): Omit<VerificationStatus, "verifierName">;
}
export declare class NoErrorsNoWarningsVerifier extends TestVerifier {
    readonly verifierName = "NoErrorsNoWarningsVerifier";
    protected verifyImpl(program: Program): Omit<VerificationStatus, "verifierName">;
}
export interface NoteVerification {
    readonly line: number | undefined;
    readonly id: string;
}
export declare class NoteVerifier extends TestVerifier {
    readonly verifierName = "NoteVerifier";
    readonly notesToVerify: readonly NoteVerification[];
    constructor(notesToVerify: readonly NoteVerification[]);
    protected verifyImpl(program: Program): Omit<VerificationStatus, "verifierName">;
}
export declare class NoAssertionFailuresVerifier extends TestVerifier {
    readonly verifierName = "NoAssertionFailureVerifier";
    protected verifyImpl(program: Program): Omit<VerificationStatus, "verifierName">;
}
export declare class NoCrashesVerifier extends TestVerifier {
    readonly verifierName = "NoCrashesVerifier";
    protected verifyImpl(program: Program): Omit<VerificationStatus, "verifierName">;
}
/**
 * Checks that no assertions fail and no crashes occur.
 */
export declare class NoBadRuntimeEventsVerifier extends TestVerifier {
    readonly verifierName = "NoBadRuntimeEventsVerifier";
    readonly resetAndTestAgain: boolean;
    constructor(resetAndTestAgain: boolean);
    protected verifyImpl(program: Program): Omit<VerificationStatus, "verifierName">;
}
export declare class BasicSynchronousRunnerTest extends TestVerifier {
    readonly verifierName = "SynchronousRunnerTest";
    constructor();
    protected verifyImpl(program: Program): Omit<VerificationStatus, "verifierName">;
}
declare type TestReporter = (test: ProgramTest) => void;
export declare class ProgramTest {
    private static _defaultReporter?;
    static setDefaultReporter(reporter: TestReporter): void;
    readonly name: string;
    readonly program: Program;
    readonly verifiers: readonly TestVerifier[];
    readonly results: readonly VerificationStatus[];
    protected readonly reporter: TestReporter;
    constructor(name: string, sourceFiles: readonly SourceFile[], translationUnits: readonly string[], verifiers: TestVerifier | readonly TestVerifier[], reporter?: TestReporter | undefined);
}
export interface FinishedProgramTest extends ProgramTest {
    readonly results: readonly VerificationStatus[];
}
export declare class SingleTranslationUnitTest extends ProgramTest {
    constructor(name: string, sourceText: string, verifiers: TestVerifier | readonly TestVerifier[]);
}
export {};
