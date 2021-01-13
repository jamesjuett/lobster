/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { Observable } from "../util/observe";
import { FileData, Project } from "../core/Project";
import { ExerciseData } from "./exercises";
export declare type CreateProjectData = {
    exercise_id?: number;
    contents: string;
    is_public?: boolean;
    name: string;
};
export declare type ProjectData = {
    id: number;
    exercise_id: number;
    last_modified: string;
    contents: string;
    is_public: boolean;
    name: string;
};
export declare type FullProjectData = ProjectData & {
    exercise: ExerciseData;
    write_access: boolean;
};
export declare function parseProjectContents(projectData: ProjectData): {
    name: string;
    files: FileData[];
};
export declare function stringifyProjectContents(project: Project): string;
declare type ProjectListMessages = "projectSelected" | "createProjectClicked";
export declare class ProjectList {
    observable: Observable<ProjectListMessages>;
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
export declare function getFullProject(project_id: number): Promise<FullProjectData>;
export declare function getCourseProjects(course_id: number): Promise<ProjectData[]>;
export declare function getPublicCourseProjects(course_id: number): Promise<ProjectData[]>;
export declare function editProject(projectData: Partial<ProjectData> & {
    id: number;
}): Promise<import("axios").AxiosResponse<any>>;
export declare function saveProjectContents(project: Project): Promise<import("axios").AxiosResponse<any> | undefined>;
export declare function createUserProject(data: CreateProjectData): Promise<FullProjectData>;
export declare function createCourseProject(course_id: number, data: CreateProjectData): Promise<FullProjectData>;
export declare function deleteProject(id: number): Promise<import("axios").AxiosResponse<any>>;
export {};
