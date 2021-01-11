export declare type ExerciseData = {
    id: number;
    name: string;
    starter_project_id: number;
    exercise_key: string;
    extra_keys: string[];
};
export declare function getFullExercise(exercise_id: number): Promise<ExerciseData>;
export declare function saveExercise(exercise: ExerciseData): Promise<import("axios").AxiosResponse<any>>;
