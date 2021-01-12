/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { CompilationOutlet, CompilationStatusOutlet } from "./view/editors";
import { Simulation } from "./core/Simulation";
import { MessageResponses, Message } from "./util/observe";
import { RuntimeConstruct } from "./core/constructs";
import { Project } from "./core/Project";
import "./lib/cstdlib";
import "./lib/string";
import "./lib/vector";
import { CheckpointsOutlet } from "./view/checkpointOutlets";
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
    _act: MessageResponses;
    constructor(element: JQuery, project: Project, completeMessage: string);
    setProject(project: Project): Project;
    setSimulation(sim: Simulation): void;
    clearSimulation(): void;
    protected requestFocus(msg: Message<undefined>): void;
    protected beforeStepForward(msg: Message<RuntimeConstruct>): void;
}
