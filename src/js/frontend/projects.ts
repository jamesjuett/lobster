import Cookies from "js-cookie";
import { Observable } from "../util/observe";
import { assert, Mutable } from "../util/util";
import { FileData, Project } from "../view/editors";
import { UserInfo, USERS } from "./user";
import axios from 'axios';
import { icon_middle, ICON_PLUS } from "./octicons";

export type ProjectData = {
    id: number;
    exercise_id?: number | null;
    last_modified: string; // date
    contents: string;
    is_public: boolean;
    name: string;
}

export function parseFiles(projectData: ProjectData) : FileData[] {
    return JSON.parse(projectData.contents).files;
}

export function stringifyFiles(files: readonly FileData[]) : string {
    return JSON.stringify(files);
}

type ProjectListMessages =
    "projectSelected";


export class MyProjects {

    public observable = new Observable<ProjectListMessages>(this);

    private element: JQuery;
    private listElem: JQuery;

    public readonly projects: readonly ProjectData[] = [];

    public readonly activeProjectId?: number;

    public constructor(element: JQuery) {
        assert(element.length > 0);
        this.element = element;
        this.listElem = $('<div class="list-group"></div>').appendTo(element);
    }

    public setProjects(projects: readonly ProjectData[]) {
        (<Mutable<this>>this).projects = projects;

        delete (<Mutable<this>>this).activeProjectId;
        this.listElem.empty();

        projects.forEach(project => {
            $(`<a href="#${project.id}" class="list-group-item">${project.name}</a>`)
                .appendTo(this.listElem)
                .on("click", () => {
                    this.observable.send("projectSelected", project);
                });
        });

        $(`<a class="list-group-item" data-toggle="modal" data-target="#lobster-create-project-modal" style="text-align: center">${icon_middle(ICON_PLUS)}</a>`)
            .appendTo(this.listElem);
    }

    public setActiveProject(projectId: number | undefined) {
        if (this.activeProjectId) {
            this.listElem.children()
                .removeClass("active")
                // .find("button").remove(); // remove edit button
        }

        (<Mutable<this>>this).activeProjectId = projectId;

        if (this.activeProjectId) {
            let activeIndex = this.projects.findIndex(p => p.id === projectId);
            if (activeIndex === -1) {
                activeIndex = this.projects.length;
            }
            this.listElem.children().eq(activeIndex)
                .addClass("active")
                // .append($(
                //     `<button data-toggle="modal" data-target="#lobster-edit-project-modal" style="fill: white">${icon_middle(ICON_PENCIL)}</button>`
                // ));
        }
    }

    
}


export async function getMyProjects() {
        
    const response = await fetch(`api/users/me/projects`, {
        method: 'GET',
        headers: {
            'Authorization': 'bearer ' + USERS.getBearerToken()
        }
    });

    let projects: ProjectData[] = await response.json();
    return projects;
}

export async function saveProject(project: Project) {
    if (!project.id) {
        return; // If it doesn't have an ID, it's just the local default project
    }

    return axios({
        url: `api/projects/${project.id!}`,
        method: "PATCH",
        data: {
            contents: JSON.stringify({
                name: project.name,
                files: project.getFileData()
            })
        },
        headers: {
            'Authorization': 'bearer ' + USERS.getBearerToken()
        }
    });

}

export async function createProject(name: string) {

    const response = await axios({
        url: `api/projects/`,
        method: "POST",
        data: {
            name: name,
            contents: JSON.stringify({
                name: name,
                files: <FileData[]>[{
                    name: "main.cpp",
                    code: `#include <iostream>\n\nusing namespace std;\n\nint main() {\n  cout << "Hello ${name}!" << endl;\n}`,
                    isTranslationUnit: true
                }]
            })
        },
        headers: {
            'Authorization': 'bearer ' + USERS.getBearerToken()
        }
    });

    return await response.data as ProjectData;
}

export async function deleteProject(id: number) {

    return await axios({
        url: `api/projects/${id}`,
        method: "DELETE",
        headers: {
            'Authorization': 'bearer ' + USERS.getBearerToken()
        }
    });

}