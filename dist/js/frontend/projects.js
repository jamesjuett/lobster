"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProject = exports.createCourseProject = exports.createUserProject = exports.saveProjectContents = exports.editProject = exports.getPublicCourseProjects = exports.getCourseProjects = exports.getFullProject = exports.getMyProjects = exports.ProjectList = exports.stringifyProjectContents = exports.parseProjectContents = void 0;
const observe_1 = require("../util/observe");
const util_1 = require("../util/util");
const user_1 = require("./user");
const axios_1 = __importDefault(require("axios"));
const octicons_1 = require("./octicons");
function parseProjectContents(projectData) {
    return JSON.parse(projectData.contents);
}
exports.parseProjectContents = parseProjectContents;
function stringifyProjectContents(project) {
    return JSON.stringify({
        name: project.name,
        files: project.getFileData()
    });
}
exports.stringifyProjectContents = stringifyProjectContents;
class ProjectList {
    constructor(element) {
        this.observable = new observe_1.Observable(this);
        this.projects = [];
        util_1.assert(element.length > 0);
        this.element = element;
        this.listElem = $('<div class="list-group lobster-project-list"></div>').appendTo(element);
    }
    setProjects(projects) {
        this.projects = projects;
        delete this.activeProjectId;
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
        $(`<a class="list-group-item" style="text-align: center">${octicons_1.icon_middle(octicons_1.ICON_PLUS)}</a>`)
            .appendTo(this.listElem)
            .on("click", () => this.observable.send("createProjectClicked"));
        this.setActiveProject(this.activeProjectId);
    }
    setActiveProject(projectId) {
        if (this.activeProjectId) {
            this.listElem.children()
                .removeClass("active");
        }
        this.activeProjectId = projectId;
        if (this.activeProjectId) {
            let activeIndex = this.projects.findIndex(p => p.id === projectId);
            if (activeIndex !== -1) {
                this.listElem.children().eq(activeIndex)
                    .addClass("active");
            }
        }
    }
    createProject(newProject) {
        this.setProjects([...this.projects, newProject]);
    }
    editProject(projectId, data) {
        let projectsCopy = this.projects.map(p => p.id === projectId ? Object.assign({}, p, data) : p);
        this.setProjects(projectsCopy);
    }
    deleteProject(projectId) {
        let projectsCopy = [...this.projects];
        projectsCopy.splice(this.projects.findIndex(p => p.id === projectId), 1);
        this.setProjects(projectsCopy);
    }
}
exports.ProjectList = ProjectList;
function getMyProjects() {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch(`api/users/me/projects`, {
            method: 'GET',
            headers: {
                'Authorization': 'bearer ' + user_1.USERS.getBearerToken()
            }
        });
        let projects = yield response.json();
        projects.sort((p1, p2) => p1.name.localeCompare(p2.name));
        return projects;
    });
}
exports.getMyProjects = getMyProjects;
function getFullProject(project_id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (user_1.USERS.currentUser) {
            const response = yield fetch(`api/projects/${project_id}/full`, {
                method: 'GET',
                headers: {
                    'Authorization': 'bearer ' + user_1.USERS.getBearerToken()
                }
            });
            return yield response.json();
        }
        else {
            const response = yield fetch(`public_api/projects/${project_id}/full`, {
                method: 'GET',
            });
            return yield response.json();
        }
    });
}
exports.getFullProject = getFullProject;
function getCourseProjects(course_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch(`api/courses/${course_id}/projects`, {
            method: 'GET',
            headers: {
                'Authorization': 'bearer ' + user_1.USERS.getBearerToken()
            }
        });
        let projects = yield response.json();
        projects.sort((p1, p2) => p1.name.localeCompare(p2.name));
        return projects;
    });
}
exports.getCourseProjects = getCourseProjects;
function getPublicCourseProjects(course_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch(`public_api/courses/${course_id}/projects`, {
            method: 'GET'
        });
        let projects = yield response.json();
        projects.sort((p1, p2) => p1.name.localeCompare(p2.name));
        return projects;
    });
}
exports.getPublicCourseProjects = getPublicCourseProjects;
function editProject(projectData) {
    return __awaiter(this, void 0, void 0, function* () {
        return axios_1.default({
            url: `api/projects/${projectData.id}`,
            method: "PATCH",
            data: projectData,
            headers: {
                'Authorization': 'bearer ' + user_1.USERS.getBearerToken()
            }
        });
    });
}
exports.editProject = editProject;
function saveProjectContents(project) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!project.id) {
            return; // If it doesn't have an ID, it's just the local default project
        }
        return axios_1.default({
            url: `api/projects/${project.id}`,
            method: "PATCH",
            data: {
                contents: JSON.stringify({
                    name: project.name,
                    files: project.getFileData()
                })
            },
            headers: {
                'Authorization': 'bearer ' + user_1.USERS.getBearerToken()
            }
        });
    });
}
exports.saveProjectContents = saveProjectContents;
function createUserProject(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield axios_1.default({
            url: `api/users/me/projects/`,
            method: "POST",
            data: data,
            headers: {
                'Authorization': 'bearer ' + user_1.USERS.getBearerToken()
            }
        });
        return yield response.data;
    });
}
exports.createUserProject = createUserProject;
function createCourseProject(course_id, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield axios_1.default({
            url: `api/courses/${course_id}/projects/`,
            method: "POST",
            data: data,
            headers: {
                'Authorization': 'bearer ' + user_1.USERS.getBearerToken()
            }
        });
        return yield response.data;
    });
}
exports.createCourseProject = createCourseProject;
function deleteProject(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield axios_1.default({
            url: `api/projects/${id}`,
            method: "DELETE",
            headers: {
                'Authorization': 'bearer ' + user_1.USERS.getBearerToken()
            }
        });
    });
}
exports.deleteProject = deleteProject;
//# sourceMappingURL=projects.js.map