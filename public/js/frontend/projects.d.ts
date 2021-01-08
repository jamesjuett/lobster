/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { Observable } from "../util/observe";
import { FileData, Project } from "../view/editors";
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
export declare class MyProjects {
    observable: Observable<"projectSelected">;
    private element;
    private listElem;
    readonly projects: readonly ProjectData[];
    readonly activeProjectId?: number;
    constructor(element: JQuery);
    setProjects(projects: readonly ProjectData[]): void;
    setActiveProject(projectId: number | undefined): void;
}
export declare function getMyProjects(): Promise<ProjectData[]>;
export declare function saveProject(project: Project): Promise<import("axios").AxiosResponse<any>>;
export declare function createProject(name: string): Promise<ProjectData>;
export declare function deleteProject(id: number): Promise<import("axios").AxiosResponse<any>>;
