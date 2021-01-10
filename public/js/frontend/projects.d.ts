/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { Observable } from "../util/observe";
import { FileData, Project } from "../core/Project";
export declare type ProjectData = {
    id: number;
    exercise_id?: number | null;
    last_modified: string;
    contents: string;
    is_public: boolean;
    name: string;
};
export declare function parseFiles(projectData: ProjectData): FileData[];
export declare function stringifyFiles(files: readonly FileData[]): string;
export declare class ProjectList {
    observable: Observable<"projectSelected">;
    private element;
    private listElem;
    readonly projects: readonly ProjectData[];
    readonly activeProjectId?: number;
    constructor(element: JQuery);
    setProjects(projects: readonly ProjectData[]): void;
    setActiveProject(projectId: number | undefined): void;
    createProject(newProject: ProjectData): void;
    editProject(projectId: number, data: Partial<ProjectData>): void;
    deleteProject(projectId: number): void;
}
export declare function getMyProjects(): Promise<ProjectData[]>;
export declare function getProject(project_id: number): Promise<ProjectData>;
export declare function getCourseProjects(course_id: number): Promise<ProjectData[]>;
export declare function saveProject(project: Project): Promise<import("axios").AxiosResponse<any> | undefined>;
export declare function createProject(name: string): Promise<ProjectData>;
export declare function deleteProject(id: number): Promise<import("axios").AxiosResponse<any>>;
export declare type ExerciseData = {
    id: number;
    name: string;
    starter_project_id: number;
    checkpoint_keys: string[];
};
export declare function getFullExercise(exercise_id: number): Promise<ExerciseData>;
