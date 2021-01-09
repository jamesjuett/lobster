/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { Project } from "../core/Project";
import { MessageResponses } from "../util/observe";
export declare class CheckpointsOutlet {
    _act: MessageResponses;
    readonly project: Project;
    private readonly element;
    private readonly headerElem;
    private readonly completeMessage;
    private checkpointsContainerElem;
    constructor(element: JQuery, project: Project, completeMessage: string);
    setProject(project: Project): Project;
    private onCheckpointEvaluationStarted;
    private onCheckpointEvaluationFinished;
}
declare type CheckpointStatus = "thinking" | "incomplete" | "complete";
export declare class CheckpointOutlet {
    private readonly element;
    private readonly statusElem;
    constructor(element: JQuery, name: string, status: CheckpointStatus);
}
export {};
