"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectSaveOutlet = exports.LobsterApplication = void 0;
const checkpoints_1 = require("../analysis/checkpoints");
const exercises_1 = require("../exercises");
const Project_1 = require("../core/Project");
const SimpleExerciseLobsterOutlet_1 = require("../view/SimpleExerciseLobsterOutlet");
const observe_1 = require("../util/observe");
const util_1 = require("../util/util");
const octicons_1 = require("./octicons");
const projects_1 = require("./projects");
const simple_exercise_outlet_1 = require("./simple_exercise_outlet");
const user_1 = require("./user");
const courses_1 = require("./courses");
const exercises_2 = require("./exercises");
const extras_1 = require("../analysis/extras");
const Program_1 = require("../core/Program");
/**
 * Expects elements with these ids to be present:
 * - lobster-log-in-button
 * - lobster-my-projects
 */
class LobsterApplication {
    constructor() {
        this.myProjectsList = new projects_1.ProjectList($("#lobster-my-projects"));
        this.courseProjectsList = new projects_1.ProjectList($("#lobster-course-projects"));
        this.currentCreateProjectList = this.myProjectsList;
        $(".lobster-lobster").append(simple_exercise_outlet_1.createSimpleExerciseOutlet("1"));
        this.setUpElements();
        $('[data-toggle="tooltip"]').tooltip();
        let defaultProject = createDefaultProject();
        this.lobsterOutlet = new SimpleExerciseLobsterOutlet_1.SimpleExerciseLobsterOutlet($(".lobster-lobster"), defaultProject);
        this.projectSaveOutlet = new ProjectSaveOutlet($(".lobster-project-save-outlet"), defaultProject, (project) => projects_1.saveProjectContents(project));
        this.activeProject = this.setProject(defaultProject, false);
        this.logInButtonElem = $(".lobster-log-in-button");
        util_1.assert(this.logInButtonElem.length > 0);
        observe_1.listenTo(this, this.myProjectsList);
        observe_1.listenTo(this, this.courseProjectsList);
        observe_1.listenTo(this, user_1.USERS);
        user_1.USERS.checkLogin();
        this.loadCourses();
    }
    setUpElements() {
        // Create Project Modal
        $("#lobster-create-project-form").on("submit", (e) => {
            e.preventDefault();
            let name = $("#lobster-create-project-name").val();
            this.createProject(this.currentCreateProjectList, {
                name: name,
                contents: JSON.stringify({
                    name: name,
                    files: [{
                            name: "main.cpp",
                            code: `#include <iostream>\n\nusing namespace std;\n\nint main() {\n  cout << "Hello ${name}!" << endl;\n}`,
                            isTranslationUnit: true
                        }]
                })
            });
            $("#lobster-create-project-modal").modal("hide");
        });
        // Edit (and delete) Project Modal
        $("#lobster-edit-project-modal").on('show.bs.modal', () => {
            var _a;
            $("#lobster-edit-project-name").val(this.activeProject.name);
            $('#lobster-edit-project-is-public').prop("checked", (_a = this.activeProjectData) === null || _a === void 0 ? void 0 : _a.is_public);
        });
        $("#lobster-edit-project-form").on("submit", (e) => {
            e.preventDefault();
            this.editActiveProject($("#lobster-edit-project-name").val(), $('#lobster-edit-project-is-public').is(":checked"));
            $("#lobster-edit-project-modal").modal("hide");
        });
        $("#lobster-edit-project-delete").on("click", (e) => {
            e.preventDefault();
            this.deleteActiveProject();
            $("#lobster-edit-project-modal").modal("hide");
        });
        // Edit Exercise Modal
        Object.keys(exercises_1.EXERCISE_SPECIFICATIONS).forEach((key) => $("#lobster-exercise-key-choices").append(`<option value="${key}">`));
        $("#lobster-edit-exercise-modal").on('show.bs.modal', () => {
            var _a, _b;
            $("#lobster-edit-exercise-key").val((_b = (_a = this.activeProjectData) === null || _a === void 0 ? void 0 : _a.exercise.exercise_key) !== null && _b !== void 0 ? _b : "");
        });
        $("#lobster-edit-exercise-form").on("submit", (e) => {
            e.preventDefault();
            this.editActiveExercise($("#lobster-edit-exercise-key").val());
            $("#lobster-edit-exercise-modal").modal("hide");
        });
        // "Make a personal copy" button
        $("#lobster-personal-copy-button").on("click", (e) => {
            if (!this.activeProjectData) {
                return;
            }
            this.createProject(this.myProjectsList, {
                name: this.activeProjectData.name,
                exercise_id: this.activeProjectData.exercise.id,
                contents: projects_1.stringifyProjectContents(this.activeProject)
            });
        });
        // Project Add File Modal
        $("#lobster-project-add-file-form").on("submit", (e) => {
            e.preventDefault();
            let name = $("#lobster-project-add-file-name").val();
            this.activeProject.addFile(new Program_1.SourceFile(name, "// " + name), false);
            $("#lobster-project-add-file-modal").modal("hide");
        });
    }
    onUserLoggedIn(user) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            this.logInButtonElem.html(`${octicons_1.ICON_PERSON} ${user.email}`);
            // Don't need to await any of the things below, it's fine
            // if they happen in parallel and resolve in an arbitrary order
            let desiredId = (_a = this.activeProject.id) !== null && _a !== void 0 ? _a : getProjectIdFromLocationHash();
            if (desiredId) {
                this.loadProject(desiredId);
            }
            this.refreshMyProjectsList();
            this.refreshCourseProjectsList();
        });
    }
    onUserLoggedOut(user) {
        this.logInButtonElem.html("Sign In");
        delete this.activeProjectData;
        this.setProject(createDefaultProject(), false);
    }
    onProjectSelected(projectData) {
        return __awaiter(this, void 0, void 0, function* () {
            this.loadProject(projectData.id);
        });
    }
    onCreateProjectClicked(message) {
        return __awaiter(this, void 0, void 0, function* () {
            this.currentCreateProjectList = message.source;
            $("#lobster-create-project-modal").modal("show");
        });
    }
    loadProject(project_id) {
        return __awaiter(this, void 0, void 0, function* () {
            // Save previous project (note that the request for a save
            // gets ignored if it wasn't a cloud project, so this is fine)
            this.activeProject.requestSave();
            let projectData = yield projects_1.getFullProject(project_id);
            return this.setProjectFromData(projectData);
        });
    }
    setProjectFromData(projectData) {
        return __awaiter(this, void 0, void 0, function* () {
            this.activeProjectData = projectData; // will be undefined if no exercise
            let exerciseSpec = exercises_1.getExerciseSpecification(projectData.exercise.exercise_key);
            let extras = extras_1.getExtras(projectData.exercise.exercise_key).concat(extras_1.getExtras(projectData.exercise.extra_keys));
            return this.setProject(new Project_1.Project(projectData.name, projectData.id, projects_1.parseProjectContents(projectData).files, new Project_1.Exercise(exerciseSpec !== null && exerciseSpec !== void 0 ? exerciseSpec : exercises_1.DEFAULT_EXERCISE), extras).turnOnAutoCompile(), projectData.write_access);
        });
    }
    refreshMyProjectsList() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.myProjectsList.setProjects(yield projects_1.getMyProjects());
            }
            catch (e) {
                // TODO
            }
        });
    }
    refreshCourseProjectsList() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.currentCourse) {
                try {
                    if (user_1.USERS.currentUser) {
                        this.courseProjectsList.setProjects(yield projects_1.getCourseProjects(this.currentCourse.id));
                    }
                    else {
                        this.courseProjectsList.setProjects(yield projects_1.getPublicCourseProjects(this.currentCourse.id));
                    }
                }
                catch (e) {
                    // TODO
                }
            }
        });
    }
    setProject(project, write_access) {
        this.activeProject = project;
        $("#lobster-project-name").html(project.name);
        this.lobsterOutlet.setProject(project);
        this.projectSaveOutlet.setProject(project, write_access);
        this.myProjectsList.setActiveProject(project.id);
        this.courseProjectsList.setActiveProject(project.id);
        window.location.hash = project.id ? "" + project.id : "";
        this.updateButtons();
        return project;
    }
    updateButtons() {
        var _a;
        if ((_a = this.activeProjectData) === null || _a === void 0 ? void 0 : _a.write_access) {
            $("#lobster-edit-project-modal-button").show();
            $("#lobster-edit-exercise-modal-button").show();
            $("#lobster-personal-copy-button").hide();
        }
        else {
            $("#lobster-edit-project-modal-button").hide();
            $("#lobster-edit-exercise-modal-button").hide();
            $("#lobster-personal-copy-button").show();
        }
        if (user_1.USERS.currentUser) {
            $("#lobster-personal-copy-button").prop("disabled", false);
        }
        else {
            $("#lobster-personal-copy-button").prop("disabled", true);
        }
    }
    createProject(projectList, data) {
        return __awaiter(this, void 0, void 0, function* () {
            let newProject = projectList === this.myProjectsList
                ? yield projects_1.createUserProject(data)
                : yield projects_1.createCourseProject(this.currentCourse.id, data);
            projectList.createProject(newProject);
            return this.setProjectFromData(newProject);
        });
    }
    editActiveProject(name, is_public) {
        return __awaiter(this, void 0, void 0, function* () {
            this.activeProject.setName(name);
            if (this.activeProject.id) {
                let updates = {
                    id: this.activeProject.id,
                    name: name,
                    is_public: is_public
                };
                $("#lobster-project-name").html(name);
                yield projects_1.editProject(updates);
                this.myProjectsList.editProject(this.activeProject.id, updates);
                this.courseProjectsList.editProject(this.activeProject.id, updates);
            }
        });
    }
    deleteActiveProject() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.activeProject.id) {
                return; // If it doesn't have an ID, it's just the local default project
            }
            yield projects_1.deleteProject(this.activeProject.id);
            this.myProjectsList.deleteProject(this.activeProject.id);
            this.courseProjectsList.deleteProject(this.activeProject.id);
        });
    }
    loadCourses() {
        return __awaiter(this, void 0, void 0, function* () {
            this.setCourses(yield courses_1.getCourses());
        });
    }
    setCourses(courseData) {
        let courseList = $("#lobster-course-list");
        courseList.empty();
        courseData.forEach(course => {
            let li = $("<li></li>").appendTo(courseList);
            $(`<a>${course.short_name}</a>`).on("click", (e) => {
                e.preventDefault();
                this.loadCourse(course);
            }).appendTo(li);
        });
    }
    loadCourse(course) {
        return __awaiter(this, void 0, void 0, function* () {
            this.currentCourse = course;
            yield this.refreshCourseProjectsList();
            $("#lobster-course-list-name").html(course.short_name);
        });
    }
    editActiveExercise(exercise_key) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            this.activeProject.exercise.changeSpecification((_a = exercises_1.getExerciseSpecification(exercise_key)) !== null && _a !== void 0 ? _a : exercises_1.DEFAULT_EXERCISE);
            if (this.activeProjectData) {
                this.activeProjectData.exercise.exercise_key = exercise_key;
                yield exercises_2.saveExercise(this.activeProjectData.exercise);
            }
        });
    }
}
__decorate([
    observe_1.messageResponse("userLoggedIn", "unwrap")
], LobsterApplication.prototype, "onUserLoggedIn", null);
__decorate([
    observe_1.messageResponse("userLoggedOut", "unwrap")
], LobsterApplication.prototype, "onUserLoggedOut", null);
__decorate([
    observe_1.messageResponse("projectSelected", "unwrap")
], LobsterApplication.prototype, "onProjectSelected", null);
__decorate([
    observe_1.messageResponse("createProjectClicked")
], LobsterApplication.prototype, "onCreateProjectClicked", null);
exports.LobsterApplication = LobsterApplication;
function createDefaultProject() {
    return new Project_1.Project("[unnamed project]", undefined, [
        { name: "file.cpp", code: `#include <iostream>\n\nusing namespace std;\n\nint main() {\n  cout << "Hello World!" << endl;\n}`, isTranslationUnit: true }
    ], new Project_1.Exercise(exercises_1.makeExerciseSpecification({
        checkpoints: [
            new checkpoints_1.OutputCheckpoint('Print "Hello World!"', checkpoints_1.outputComparator("Hello World!", true))
        ]
    }))).turnOnAutoCompile();
}
function getProjectIdFromLocationHash() {
    let hash = window.location.hash;
    let id;
    if (hash.length > 1) {
        id = parseInt(hash.slice(1));
        if (isNaN(id)) {
            id = undefined;
        }
    }
    return id;
}
class ProjectSaveOutlet {
    constructor(element, project, saveAction, autosaveInterval = 30000) {
        this.isSaved = true;
        this.isEnabled = true;
        this.isAutosaveOn = true;
        this.element = element;
        this.saveAction = saveAction;
        this.saveButtonElem =
            $('<button class="btn"></button>')
                .prop("disabled", true)
                .html('<span class="glyphicon glyphicon-floppy-remove"></span>')
                .on("click", () => {
                this.saveProject();
            });
        this.element.append(this.saveButtonElem);
        if (autosaveInterval !== false) {
            setInterval(() => this.autosaveCallback(), autosaveInterval);
        }
        this.project = this.setProject(project, true);
    }
    setProject(project, isEnabled) {
        if (project !== this.project) {
            observe_1.stopListeningTo(this, this.project);
            this.project = project;
            observe_1.listenTo(this, project);
        }
        this.isEnabled = isEnabled;
        if (isEnabled) {
            this.onSaveSuccessful();
        }
        else {
            this.onSaveDisabled();
        }
        return project;
    }
    autosaveCallback() {
        if (this.isAutosaveOn) {
            this.saveProject();
        }
    }
    saveProject() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || this.isSaved) {
                return;
            }
            try {
                this.onSaveAttempted();
                yield this.saveAction(this.project);
                this.onSaveSuccessful();
            }
            catch (err) {
                this.onSaveFailed();
            }
        });
    }
    onSaveDisabled() {
        this.isSaved = true;
        this.saveButtonElem.prop("disabled", true);
        this.removeButtonClasses();
        this.saveButtonElem.addClass("btn-default");
        this.saveButtonElem.html('<i class="lobster-save-button-icon bi bi-cloud-slash"></i>');
    }
    onSaveSuccessful() {
        this.isSaved = true;
        this.saveButtonElem.prop("disabled", false);
        this.removeButtonClasses();
        this.saveButtonElem.addClass("btn-success-muted");
        this.saveButtonElem.html('<i class="lobster-save-button-icon bi bi-cloud-check"></i>');
    }
    onUnsavedChanges() {
        this.isSaved = false;
        this.removeButtonClasses();
        this.saveButtonElem.addClass("btn-warning-muted");
        this.saveButtonElem.html('<i class="lobster-save-button-icon bi bi-cloud-arrow-up"></i>');
    }
    onSaveAttempted() {
        this.removeButtonClasses();
        this.saveButtonElem.addClass("btn-warning-muted");
        this.saveButtonElem.html('<i class="lobster-save-button-icon bi bi-cloud-arrow-up pulse"></i>');
    }
    onSaveFailed() {
        this.removeButtonClasses();
        this.saveButtonElem.addClass("btn-danger-muted");
        this.saveButtonElem.html('<i class="lobster-save-button-icon bi bi-cloud-slash"></i>');
    }
    removeButtonClasses() {
        this.saveButtonElem.removeClass("btn-default");
        this.saveButtonElem.removeClass("btn-success-muted");
        this.saveButtonElem.removeClass("btn-warning-muted");
        this.saveButtonElem.removeClass("btn-danger-muted");
    }
    onProjectChanged() {
        if (this.isEnabled) {
            this.onUnsavedChanges();
        }
    }
    onSaveRequested() {
        this.saveProject();
    }
}
__decorate([
    observe_1.messageResponse("nameSet"),
    observe_1.messageResponse("fileAdded"),
    observe_1.messageResponse("fileRemoved"),
    observe_1.messageResponse("fileContentsSet"),
    observe_1.messageResponse("translationUnitAdded"),
    observe_1.messageResponse("translationUnitRemoved"),
    observe_1.messageResponse("translationUnitStatusSet")
], ProjectSaveOutlet.prototype, "onProjectChanged", null);
__decorate([
    observe_1.messageResponse("saveRequested")
], ProjectSaveOutlet.prototype, "onSaveRequested", null);
exports.ProjectSaveOutlet = ProjectSaveOutlet;
//# sourceMappingURL=application.js.map