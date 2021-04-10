/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { CompilationOutlet, CompilationStatusOutlet } from "./editors";
import { Simulation } from "../core/Simulation";
import { MessageResponses, Message } from "../util/observe";
import { RuntimeConstruct } from "../core/constructs";
import { Project } from "../core/Project";
import { CheckpointsOutlet } from "./checkpointOutlets";
export declare class SimpleExerciseLobsterOutlet {
    private projectEditor;
    private simulationOutlet;
    private instantMemoryDiagramOutlet;
    private isInstantMemoryDiagramActive;
    readonly project: Project;
    readonly sim?: Simulation;
    private readonly element;
    private readonly tabsElem;
    private readonly simulateTabElem;
    readonly compilationOutlet: CompilationOutlet;
    readonly compilationStatusOutlet: CompilationStatusOutlet;
    readonly checkpointsOutlet: CheckpointsOutlet;
    _act: MessageResponses;
    constructor(element: JQuery, project: Project);
    setProject(project: Project): Project;
    setSimulation(sim: Simulation): void;
    clearSimulation(): void;
    protected requestFocus(msg: Message<undefined>): void;
    protected beforeStepForward(msg: Message<RuntimeConstruct>): void;
    setSimulationTabEnabled(isEnabled: boolean): void;
}
