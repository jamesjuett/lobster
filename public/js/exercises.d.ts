/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { Project, CompilationOutlet, CompilationStatusOutlet, ProjectSaveOutlet, ProjectSaveAction } from "./view/editors";
import { Simulation } from "./core/Simulation";
import { MessageResponses, Message } from "./util/observe";
import { RuntimeConstruct } from "./core/constructs";
import { Program } from "./core/Program";
import "./lib/cstdlib";
import "./lib/string";
import "./lib/vector";
export declare class SimpleExerciseLobsterOutlet {
    private projectEditor;
    private simulationOutlet;
    readonly project: Project;
    readonly completeMessage: string;
    readonly sim?: Simulation;
    private readonly element;
    private readonly tabsElem;
    readonly compilationOutlet: CompilationOutlet;
    readonly compilationStatusOutlet: CompilationStatusOutlet;
    readonly checkpointsOutlet: CheckpointsOutlet;
    readonly projectSaveOutlet?: ProjectSaveOutlet;
    _act: MessageResponses;
    constructor(element: JQuery, project: Project, completeMessage: string);
    setProject(project: Project): Project;
    onSave(saveAction: ProjectSaveAction): this;
    setSimulation(sim: Simulation): void;
    clearSimulation(): void;
    protected requestFocus(msg: Message<undefined>): void;
    protected beforeStepForward(msg: Message<RuntimeConstruct>): void;
}
export declare class CheckpointsOutlet {
    _act: MessageResponses;
    readonly project: Project;
    readonly checkpoints: readonly Checkpoint[];
    private readonly element;
    private readonly headerElem;
    private readonly completeMessage;
    private readonly checkpointOutlets;
    constructor(element: JQuery, project: Project, checkpoints: readonly Checkpoint[], completeMessage: string);
    setProject(project: Project): Project;
    protected onCompilationFinished(): Promise<void>;
}
export declare class CheckpointOutlet {
    private readonly element;
    private readonly statusElem;
    constructor(element: JQuery, name: string);
    update(isComplete: boolean): void;
}
declare abstract class Checkpoint {
    readonly name: string;
    constructor(name: string);
    abstract evaluate(project: Project): Promise<boolean>;
}
export declare class IsCompiledCheckpoint extends Checkpoint {
    evaluate(project: Project): Promise<boolean>;
}
export declare class OutputCheckpoint extends Checkpoint {
    readonly input: string;
    readonly stepLimit: number;
    private expected;
    private runner?;
    constructor(name: string, expected: (output: string) => boolean, input?: string, stepLimit?: number);
    evaluate(project: Project): Promise<boolean>;
}
export declare class StaticAnalysisCheckpoint extends Checkpoint {
    private criterion;
    private runner?;
    constructor(name: string, criterion: (program: Program, project: Project) => boolean);
    evaluate(project: Project): Promise<boolean>;
}
export {};
