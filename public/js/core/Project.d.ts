import { Checkpoint } from "../analysis/checkpoints";
import { Observable } from "../util/observe";
import { Note } from "./errors";
import { SourceFile, Program } from "./Program";
export interface FileData {
    readonly name: string;
    readonly code: string;
    readonly isTranslationUnit: boolean;
}
declare type ProjectMessages = "nameSet" | "compilationOutOfDate" | "compilationFinished" | "fileAdded" | "fileRemoved" | "fileContentsSet" | "translationUnitAdded" | "translationUnitRemoved" | "translationUnitStatusSet" | "checkpointEvaluationStarted" | "checkpointEvaluationFinished" | "noteAdded";
export declare type ProjectExtras = {
    checkpoints?: readonly Checkpoint[];
};
export declare class Project {
    observable: Observable<ProjectMessages>;
    readonly name: string;
    readonly id?: number;
    readonly sourceFiles: readonly SourceFile[];
    private translationUnitNames;
    readonly checkpoints: readonly Checkpoint[];
    readonly checkpointStatuses: readonly boolean[];
    readonly program: Program;
    readonly isCompilationOutOfDate: boolean;
    private pendingAutoCompileTimeout?;
    private autoCompileDelay?;
    constructor(name: string, id: number | undefined, files: readonly FileData[], extras?: ProjectExtras);
    setName(name: string): void;
    getFileData(): readonly FileData[];
    addFile(file: SourceFile, isTranslationUnit: boolean): void;
    removeFile(filename: string): void;
    setFileContents(file: SourceFile): void;
    setTranslationUnit(name: string, isTranslationUnit: boolean): void;
    recompile(): void;
    evaluateCheckpoints(): Promise<void>;
    isTranslationUnit(name: string): boolean;
    /**
     * Toggles whether a source file in this project is being used as a translation unit
     * and should be compiled as part of the program. The name given for the translation
     * unit to be toggled must match the name of one of this project's source files.
     * @param tuName
     */
    toggleTranslationUnit(tuName: string): void;
    private compilationOutOfDate;
    private dispatchAutoCompile;
    /**
     * Turns on auto-compilation. Any changes to the project source will
     * trigger a recompile, which begins after no subsequent changes have
     * been made within the specified delay.
     * @param autoCompileDelay
     */
    turnOnAutoCompile(autoCompileDelay?: number): this;
    turnOffAutoCompile(): this;
    addNote(note: Note): void;
}
export {};
