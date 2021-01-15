import Cookies from "js-cookie";
import { EXERCISE_CHECKPOINTS, getExerciseCheckpoints, OutputCheckpoint, outputComparator } from "../analysis/checkpoints";
import { Exercise, FileData, Project } from "../core/Project";
import { SimpleExerciseLobsterOutlet } from "../exercises";
import { listenTo, Message, messageResponse, MessageResponses, stopListeningTo } from "../util/observe";
import { assert, Mutable } from "../util/util";
import { ICON_PERSON } from "./octicons";
import { getMyProjects, ProjectList, ProjectData, createUserProject, deleteProject, getCourseProjects, getFullProject, createCourseProject, editProject, saveProjectContents, FullProjectData, CreateProjectData, stringifyProjectContents, parseProjectContents, getPublicCourseProjects } from "./projects";
import { createSimpleExerciseOutlet as createSimpleExerciseOutletHTML } from "./simple_exercise_outlet";
import { USERS, Users, UserInfo as UserData } from "./user";
import axios from 'axios';
import { CourseData, getCourses as getPublicCourses } from "./courses";
import { ExerciseData, getFullExercise, saveExercise } from "./exercises";



/**
 * Expects elements with these ids to be present:
 * - lobster-log-in-button
 * - lobster-my-projects
 */
export class LobsterApplication {

    public _act!: MessageResponses;

    public readonly myProjectsList: ProjectList;
    public readonly courseProjectsList: ProjectList;
    public readonly lobsterOutlet: SimpleExerciseLobsterOutlet;
    public readonly projectSaveOutlet: ProjectSaveOutlet;

    public readonly myProjects?: ProjectData[];
    public readonly courseProjects?: ProjectData[];
    public readonly activeProject: Project;
    public readonly activeProjectData?: FullProjectData;
    public readonly currentCourse?: CourseData;

    private currentCreateProjectList: ProjectList;

    private readonly logInButtonElem: JQuery;

    public constructor() {
        this.myProjectsList = new ProjectList($("#lobster-my-projects"));
        this.courseProjectsList = new ProjectList($("#lobster-course-projects"));
        this.currentCreateProjectList = this.myProjectsList;

        $(".lobster-lobster").append(createSimpleExerciseOutletHTML("1"));

        this.setUpElements();

        $('[data-toggle="tooltip"]').tooltip()

        let defaultProject = createDefaultProject();
        
        this.lobsterOutlet = new SimpleExerciseLobsterOutlet(
            $(".lobster-lobster"),
            defaultProject,
            "Nice work!");
        
        this.projectSaveOutlet = new ProjectSaveOutlet(
            $(".lobster-project-save-outlet"),
            defaultProject,
            (project: Project) => saveProjectContents(project));
        
        this.activeProject = this.setProject(defaultProject, false);

        this.logInButtonElem = $(".lobster-log-in-button");
        assert(this.logInButtonElem.length > 0);

        listenTo(this, this.myProjectsList);
        listenTo(this, this.courseProjectsList);
        listenTo(this, USERS);

        USERS.checkLogin();

        this.loadCourses();
    }
    
    private setUpElements() {

        // Create Project Modal
        $("#lobster-create-project-form").on("submit", (e) => {
            e.preventDefault();
            let name = $("#lobster-create-project-name").val() as string;
            this.createProject(
                this.currentCreateProjectList,
                {
                    name: name,
                    contents: JSON.stringify({
                        name: name,
                        files: <FileData[]>[{
                            name: "main.cpp",
                            code: `#include <iostream>\n\nusing namespace std;\n\nint main() {\n  cout << "Hello ${name}!" << endl;\n}`,
                            isTranslationUnit: true
                        }]
                    })
                }
            );
            $("#lobster-create-project-modal").modal("hide");
        });

        // Edit (and delete) Project Modal
        $("#lobster-edit-project-modal").on('show.bs.modal', () => {
            $("#lobster-edit-project-name").val(this.activeProject.name)
        });
        $("#lobster-edit-project-form").on("submit", (e) => {
            e.preventDefault();
            this.editActiveProject(
                $("#lobster-edit-project-name").val() as string,
                $('#lobster-edit-project-is-public').is(":checked"));
            $("#lobster-edit-project-modal").modal("hide");
        });
        $("#lobster-edit-project-delete").on("click", (e) => {
            e.preventDefault();
            this.deleteActiveProject();
            $("#lobster-edit-project-modal").modal("hide");
        });

        // Edit Exercise Modal
        Object.keys(EXERCISE_CHECKPOINTS).forEach(
            (key) => $("#lobster-exercise-key-choices").append(`<option value="${key}">`)
        );
        $("#lobster-edit-exercise-modal").on('show.bs.modal', () => {
            $("#lobster-edit-exercise-key").val(this.activeProjectData?.exercise.exercise_key ?? "")
        });
        $("#lobster-edit-exercise-form").on("submit", (e) => {
            e.preventDefault();
            this.editActiveExercise($("#lobster-edit-exercise-key").val() as string);
            $("#lobster-edit-exercise-modal").modal("hide");
        });

        // "Make a personal copy" button
        $("#lobster-personal-copy-button").on("click", (e) => {
            if (!this.activeProjectData) { return; }
            this.createProject(
                this.myProjectsList,
                {
                    name: this.activeProjectData.name,
                    exercise_id: this.activeProjectData.exercise.id,
                    contents: stringifyProjectContents(this.activeProject)
                }
            );
        });


    }

    @messageResponse("userLoggedIn", "unwrap")
    protected async onUserLoggedIn(user: UserData) {
        this.logInButtonElem.html(`${ICON_PERSON} ${user.email}`);

        // Don't need to await any of the things below, it's fine
        // if they happen in parallel and resolve in an arbitrary order

        let desiredId = this.activeProject.id ?? getProjectIdFromLocationHash();
        if (desiredId) {
            this.loadProject(desiredId);
        }
        
        this.refreshMyProjectsList();
        this.refreshCourseProjectsList();
    }
    
    @messageResponse("userLoggedOut", "unwrap")
    protected onUserLoggedOut(user: UserData) {
        this.logInButtonElem.html("Sign In");

        delete (<Mutable<this>>this).activeProjectData;
        this.setProject(createDefaultProject(), false);
    }
    
    @messageResponse("projectSelected", "unwrap")
    protected async onProjectSelected(projectData: ProjectData) {
        this.loadProject(projectData.id);
    }
    
    @messageResponse("createProjectClicked")
    protected async onCreateProjectClicked(message: Message<void>) {
        this.currentCreateProjectList = message.source;
        $("#lobster-create-project-modal").modal("show");
    }

    private async loadProject(project_id: number) {
        let projectData = await getFullProject(project_id);
        return this.setProjectFromData(projectData);
    }

    private async setProjectFromData(projectData: FullProjectData) {
        (<Mutable<this>>this).activeProjectData = projectData; // will be undefined if no exercise

        let checkpoints = getExerciseCheckpoints(projectData.exercise.exercise_key);

        return this.setProject(new Project(
            projectData.name,
            projectData.id,
            parseProjectContents(projectData).files,
            new Exercise(checkpoints)
        ).turnOnAutoCompile(), projectData.write_access);
    }

    private async refreshMyProjectsList() {
        try {
            this.myProjectsList.setProjects(await getMyProjects());
        }
        catch (e) {
            // TODO
        }
    }

    private async refreshCourseProjectsList() {
        if (this.currentCourse) {
            try {
                if (USERS.currentUser){
                    this.courseProjectsList.setProjects(await getCourseProjects(this.currentCourse.id));
                }
                else {
                    this.courseProjectsList.setProjects(await getPublicCourseProjects(this.currentCourse.id));
                }
            }
            catch (e) {
                // TODO
            }
        }
    }

    private setProject(project: Project, write_access: boolean) {
        (<Mutable<this>>this).activeProject = project;
        $("#lobster-project-name").html(project.name);
        this.lobsterOutlet.setProject(project);
        this.projectSaveOutlet.setProject(project, write_access);
        this.myProjectsList.setActiveProject(project.id);
        this.courseProjectsList.setActiveProject(project.id);
        window.location.hash = project.id ? ""+project.id : "";
        this.updateButtons();
        return project;
    }

    private updateButtons() {
        if (this.activeProjectData?.write_access) {
            $("#lobster-edit-project-modal-button").show();
            $("#lobster-edit-exercise-modal-button").show();
            $("#lobster-personal-copy-button").hide();
        }
        else {
            $("#lobster-edit-project-modal-button").hide();
            $("#lobster-edit-exercise-modal-button").hide();
            $("#lobster-personal-copy-button").show();
        }

        if (USERS.currentUser) {
            $("#lobster-personal-copy-button").prop("disabled", false);
        }
        else {
            $("#lobster-personal-copy-button").prop("disabled", true);
        }
    }

    private async createProject(projectList: ProjectList, data: CreateProjectData) {
        let newProject =
            projectList === this.myProjectsList
                ? await createUserProject(data)
                : await createCourseProject(this.currentCourse!.id, data);
        projectList.createProject(newProject);
        return this.setProjectFromData(newProject);
    }

    private async editActiveProject(name: string, is_public: boolean) {
        this.activeProject.setName(name);
        if (this.activeProject.id) {
            let updates = {
                id: this.activeProject.id,
                name: name,
                is_public: is_public
            };
            $("#lobster-project-name").html(name);
            await editProject(updates);
            this.myProjectsList.editProject(this.activeProject.id, updates);
            this.courseProjectsList.editProject(this.activeProject.id, updates);
        }
    }

    private async deleteActiveProject() {
        if (!this.activeProject.id) {
            return; // If it doesn't have an ID, it's just the local default project
        }
        await deleteProject(this.activeProject.id);
        this.myProjectsList.deleteProject(this.activeProject.id);
        this.courseProjectsList.deleteProject(this.activeProject.id);
    }

    private async loadCourses() {
        this.setCourses(await getPublicCourses());
    }

    private setCourses(courseData: readonly CourseData[]) {
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

    private async loadCourse(course: CourseData) {
        (<Mutable<this>>this).currentCourse = course;
        await this.refreshCourseProjectsList();
        $("#lobster-course-list-name").html(course.short_name);
    }

    private async editActiveExercise(exercise_key: string) {
        this.activeProject.exercise.setCheckpoints(getExerciseCheckpoints(exercise_key));
        if (this.activeProjectData) {
            this.activeProjectData.exercise.exercise_key = exercise_key;
            await saveExercise(this.activeProjectData.exercise);
        }
    }

}

function createDefaultProject() {
    return new Project(
        "[unnamed project]",
        undefined, [
            { name: "file.cpp", code: `#include <iostream>\n\nusing namespace std;\n\nint main() {\n  cout << "Hello World!" << endl;\n}`, isTranslationUnit: true }
        ],
        new Exercise([
                new OutputCheckpoint('Print "Hello World!"', outputComparator("Hello World!", true))
        ])
    ).turnOnAutoCompile();
}

function getProjectIdFromLocationHash() {
    let hash = window.location.hash;
    let id: number | undefined;
    if (hash.length > 1) {
        id = parseInt(hash.slice(1));
        if (isNaN(id)) {
            id = undefined;
        }
    }
    return id;
}



export type ProjectSaveAction = (project: Project) => Promise<any>;

export class ProjectSaveOutlet {

    public _act!: MessageResponses;

    public readonly project: Project;
    public readonly isSaved: boolean = true;
    public readonly isEnabled: boolean = true;

    private saveAction: ProjectSaveAction;

    private readonly element: JQuery;
    private readonly saveButtonElem: JQuery;


    private isAutosaveOn: boolean = true;

    public constructor(element: JQuery, project: Project,
        saveAction: ProjectSaveAction,
        autosaveInterval: number | false = 30000) {

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

    public setProject(project: Project, isEnabled: boolean) {
        if (project !== this.project) {
            stopListeningTo(this, this.project);
            (<Mutable<this>>this).project = project;
            listenTo(this, project);
        }
        
        (<Mutable<this>>this).isEnabled = isEnabled;
        
        if (isEnabled) {
            this.onSaveSuccessful();
        }
        else {
            this.onSaveDisabled();
        }

        return project;
    }

    private autosaveCallback() {
        if (this.isAutosaveOn) {
            this.saveProject();
        }
    }

    public async saveProject() {

        if (!this.isEnabled || this.isSaved) {
            return;
        }
        
        try {
            this.onSaveAttempted();
            await this.saveAction(this.project);
            this.onSaveSuccessful();
        }
        catch(err) {
            this.onSaveFailed();
        }

    }
    
    private onSaveDisabled() {
        (<Mutable<this>>this).isSaved = true;
        this.saveButtonElem.prop("disabled", true);
        this.removeButtonClasses();
        this.saveButtonElem.addClass("btn-default");
        this.saveButtonElem.html('<i class="lobster-save-button-icon bi bi-cloud-slash"></i>');
    }

    private onSaveSuccessful() {
        (<Mutable<this>>this).isSaved = true;
        this.saveButtonElem.prop("disabled", false);
        this.removeButtonClasses();
        this.saveButtonElem.addClass("btn-success-muted");
        this.saveButtonElem.html('<i class="lobster-save-button-icon bi bi-cloud-check"></i>');
    }

    private onUnsavedChanges() {
        (<Mutable<this>>this).isSaved = false;
        this.removeButtonClasses();
        this.saveButtonElem.addClass("btn-warning-muted");
        this.saveButtonElem.html('<i class="lobster-save-button-icon bi bi-cloud-arrow-up"></i>');
    }

    private onSaveAttempted() {
        this.removeButtonClasses();
        this.saveButtonElem.addClass("btn-warning-muted");
        this.saveButtonElem.html('<i class="lobster-save-button-icon bi bi-cloud-arrow-up pulse"></i>');
    }

    private onSaveFailed() {
        this.removeButtonClasses();
        this.saveButtonElem.addClass("btn-danger-muted");
        this.saveButtonElem.html('<i class="lobster-save-button-icon bi bi-cloud-slash"></i>');
    }

    private removeButtonClasses() {
        this.saveButtonElem.removeClass("btn-default");
        this.saveButtonElem.removeClass("btn-success-muted");
        this.saveButtonElem.removeClass("btn-warning-muted");
        this.saveButtonElem.removeClass("btn-danger-muted");
    }

    @messageResponse("nameSet")
    @messageResponse("fileAdded")
    @messageResponse("fileRemoved")
    @messageResponse("fileContentsSet")
    @messageResponse("translationUnitAdded")
    @messageResponse("translationUnitRemoved")
    @messageResponse("translationUnitStatusSet")
    private onProjectChanged() {
        if (this.isEnabled) {
            this.onUnsavedChanges();
        }
    }

    @messageResponse("saveRequested")
    private onSaveRequested() {
        this.saveProject();
    }
}