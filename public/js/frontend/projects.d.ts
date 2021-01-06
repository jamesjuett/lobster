/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { Observable } from "../util/observe";
import { FileData } from "../view/editors";
export declare type ProjectData = {
    id: number;
    exercise_id?: number | null;
    last_modified: string;
    contents: string;
    is_public: boolean;
    name: string;
};
export declare function extractFiles(projectData: ProjectData): FileData[];
export declare class MyProjects {
    observable: Observable<"projectSelected">;
    private element;
    private listElem;
    readonly projects: readonly ProjectData[];
    constructor(element: JQuery);
    setProjects(projects: readonly ProjectData[]): void;
}
