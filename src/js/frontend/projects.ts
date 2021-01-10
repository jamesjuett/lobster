import { Observable } from "../util/observe";
import { assert, Mutable } from "../util/util";
import { USERS } from "./user";
import axios from 'axios';
import { icon_middle, ICON_PLUS } from "./octicons";
import { FileData, Project } from "../core/Project";

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


export class ProjectList {

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
        this.setActiveProject(this.activeProjectId);
    }

    public setActiveProject(projectId: number | undefined) {
        if (this.activeProjectId) {
            this.listElem.children()
                .removeClass("active")
        }

        (<Mutable<this>>this).activeProjectId = projectId;

        if (this.activeProjectId) {
            let activeIndex = this.projects.findIndex(p => p.id === projectId);
            if (activeIndex !== -1) {
                this.listElem.children().eq(activeIndex)
                    .addClass("active");
            }
        }
    }

    public createProject(newProject: ProjectData) {
        this.setProjects([...this.projects, newProject]);
    }

    public editProject(projectId: number, data: Partial<ProjectData>) {
        let projectsCopy = this.projects.map(
            p => p.id === projectId ? Object.assign({}, p, data) : p
        );
        this.setProjects(projectsCopy);
    }

    public deleteProject(projectId: number) {
        let projectsCopy = [...this.projects];
        projectsCopy.splice(this.projects.findIndex(p => p.id === projectId), 1);
        this.setProjects(projectsCopy);
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

export async function getProject(project_id: number) {
        
    const response = await fetch(`api/projects/${project_id}`, {
        method: 'GET',
        headers: {
            'Authorization': 'bearer ' + USERS.getBearerToken()
        }
    });

    return await response.json() as ProjectData;
}

export async function getCourseProjects(course_id: number) {
        
    const response = await fetch(`public_api/courses/${course_id}/projects`, {
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
            name: project.name,
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


export type ExerciseData = {
    id: number;
    name: string;
    starter_project_id: number;
    checkpoint_keys: string[];
}

export async function getFullExercise(exercise_id: number) {
    const response = await axios({
        url: `api/exercises/${exercise_id}/full`,
        method: "GET",
        headers: {
            'Authorization': 'bearer ' + USERS.getBearerToken()
        }
    });

    return await response.data as ExerciseData;
}