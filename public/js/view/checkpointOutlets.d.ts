/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { Exercise } from "../core/Project";
import { MessageResponses } from "../util/observe";
export declare class CheckpointsOutlet {
    _act: MessageResponses;
    readonly exercise: Exercise;
    private readonly element;
    private readonly headerElem;
    private readonly completeMessage;
    private checkpointsContainerElem;
    constructor(element: JQuery, exercise: Exercise, completeMessage: string);
    setExercise(exercise: Exercise): Exercise;
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
