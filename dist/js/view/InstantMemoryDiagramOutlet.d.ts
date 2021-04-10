/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { Project } from "../core/Project";
import { MessageResponses } from "../util/observe";
export declare class InstantMemoryDiagramOutlet {
    readonly project: Project;
    readonly isActive: boolean;
    private readonly memoryOutlet;
    private readonly element;
    _act: MessageResponses;
    constructor(element: JQuery, project: Project, isActive: boolean);
    setActive(isActive: boolean): void;
    setProject(project: Project): void;
    private updateMemory;
    onCompilationFinished(): void;
}
