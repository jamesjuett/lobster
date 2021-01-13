import { Observable } from "../util/observe";
import { assert, Mutable } from "../util/util";
import { USERS } from "./user";
import axios from 'axios';
import { icon_middle, ICON_PLUS } from "./octicons";
import { FileData, Project } from "../core/Project";
import { ExerciseData } from "./exercises";

export type CreateProjectData = {
    exercise_id?: number;
    contents: string;
    is_public?: boolean;
    name: string;
}

export type ProjectData = {
    id: number;
    exercise_id: number;
    last_modified: string; // date
    contents: string;
    is_public: boolean;
    name: string;
}

export type FullProjectData = ProjectData & {
    exercise: ExerciseData,
    write_access: boolean
}

export function parseProjectContents(projectData: ProjectData) : {name: string, files: FileData[]} {
    return JSON.parse(projectData.contents);
}

export function stringifyProjectContents(project: Project) {
    return JSON.stringify({
        name: project.name,
        files: project.getFileData()
    });
}

type ProjectListMessages =
    "projectSelected" |
    "createProjectClicked";


export class ProjectList {

    public observable = new Observable<ProjectListMessages>(this);

    private element: JQuery;
    private listElem: JQuery;

    public readonly projects: readonly ProjectData[] = [];

    public readonly activeProjectId?: number;

    public constructor(element: JQuery) {
        assert(element.length > 0);
        this.element = element;
        this.listElem = $('<div class="list-group lobster-project-list"></div>').appendTo(element);
    }

    public setProjects(projects: readonly ProjectData[]) {
        (<Mutable<this>>this).projects = projects;

        delete (<Mutable<this>>this).activeProjectId;
        this.listElem.empty();

        projects.forEach(project => {
            $(`<a href="#${project.id}" class="list-group-item">
                ${project.is_public
                    ? '<i class="bi bi-eye" data-toggle="tooltip" data-placement="top" data-container="body" title="Public"></i>'
                    : '<i class="bi bi-eye-slash" data-toggle="tooltip" data-placement="top" data-container="body" title="Private"></i>'}
                ${project.name}
            </a>`)
                .appendTo(this.listElem)
                .on("click", () => {
                    this.observable.send("projectSelected", project);
                })
                .children("i").tooltip();
        });

        $(`<a class="list-group-item" style="text-align: center">${icon_middle(ICON_PLUS)}</a>`)
            .appendTo(this.listElem)
            .on("click", () => this.observable.send("createProjectClicked"));
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
    projects.sort((p1, p2) => p1.name.localeCompare(p2.name));
    return projects;
}

export async function getFullProject(project_id: number) {
    if (USERS.currentUser) {
        const response = await fetch(`api/projects/${project_id}/full`, {
            method: 'GET',
            headers: {
                'Authorization': 'bearer ' + USERS.getBearerToken()
            }
        });
        return await response.json() as FullProjectData;
    }
    else {
        const response = await fetch(`public_api/projects/${project_id}/full`, {
            method: 'GET',
        });
        return await response.json() as FullProjectData;
    }

}

export async function getCourseProjects(course_id: number) {
        
    const response = await fetch(`api/courses/${course_id}/projects`, {
        method: 'GET',
        headers: {
            'Authorization': 'bearer ' + USERS.getBearerToken()
        }
    });

    let projects: ProjectData[] = await response.json();
    projects.sort((p1, p2) => p1.name.localeCompare(p2.name));
    return projects;
}

export async function getPublicCourseProjects(course_id: number) {
        
    const response = await fetch(`public_api/courses/${course_id}/projects`, {
        method: 'GET'
    });

    let projects: ProjectData[] = await response.json();
    projects.sort((p1, p2) => p1.name.localeCompare(p2.name));
    return projects;
}

export async function editProject(projectData: Partial<ProjectData> & {id: number}) {

    return axios({
        url: `api/projects/${projectData.id!}`,
        method: "PATCH",
        data: projectData,
        headers: {
            'Authorization': 'bearer ' + USERS.getBearerToken()
        }
    });

}

export async function saveProjectContents(project: Project) {
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

export async function createUserProject(data: CreateProjectData) {

    const response = await axios({
        url: `api/users/me/projects/`,
        method: "POST",
        data: data,
        headers: {
            'Authorization': 'bearer ' + USERS.getBearerToken()
        }
    });

    return await response.data as FullProjectData;
}


export async function createCourseProject(course_id: number, data: CreateProjectData) {

    const response = await axios({
        url: `api/courses/${course_id}/projects/`,
        method: "POST",
        data: data,
        headers: {
            'Authorization': 'bearer ' + USERS.getBearerToken()
        }
    });

    return await response.data as FullProjectData;
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


