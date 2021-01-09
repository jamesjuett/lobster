import { Program } from "../core/Program";
import { Project } from "../core/Project";
export declare abstract class Checkpoint {
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
export declare function outputComparator(desiredOutput: string, ignoreWhitespace?: boolean): (output: string) => boolean;
export declare class StaticAnalysisCheckpoint extends Checkpoint {
    private criterion;
    private runner?;
    constructor(name: string, criterion: (program: Program, project: Project) => boolean);
    evaluate(project: Project): Promise<boolean>;
}
export declare function getExerciseCheckpoints(checkpoints_key: string | string[]): readonly Checkpoint[];
export declare const EXERCISE_CHECKPOINTS: {
    [index: string]: readonly Checkpoint[] | undefined;
};
