import { ExerciseCompletionPredicate } from "./core/Project";
import { Checkpoint } from "./analysis/checkpoints";
export declare type ExerciseSpecification = {
    starterCode: string;
    checkpoints: readonly Checkpoint[];
    completionCriteria: ExerciseCompletionPredicate;
    completionMessage: string;
};
export declare const DEFAULT_EXERCISE: ExerciseSpecification;
export declare function getExerciseSpecification(exercise_key: string): ExerciseSpecification | undefined;
export declare function makeExerciseSpecification(spec: Partial<ExerciseSpecification>): ExerciseSpecification;
export declare const EXERCISE_SPECIFICATIONS: {
    [index: string]: Partial<ExerciseSpecification> | undefined;
};
