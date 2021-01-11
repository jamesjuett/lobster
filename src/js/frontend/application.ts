import Cookies from "js-cookie";
import { EXERCISE_CHECKPOINTS, getExerciseCheckpoints, OutputCheckpoint, outputComparator } from "../analysis/checkpoints";
import { Exercise, Project } from "../core/Project";
import { SimpleExerciseLobsterOutlet } from "../exercises";
import { listenTo, messageResponse, MessageResponses } from "../util/observe";
import { assert, Mutable } from "../util/util";
import { ICON_PERSON } from "./octicons";
import { parseFiles as extractProjectFiles, getMyProjects, ProjectList, ProjectData, saveProject, createProject, deleteProject, getCourseProjects, getProject } from "./projects";
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
    public readonly lobster: SimpleExerciseLobsterOutlet;

    public readonly myProjects?: ProjectData[];
    public readonly courseProjects?: ProjectData[];
    public readonly activeProject: Project;
    public readonly activeExerciseData?: ExerciseData;
    public readonly currentCourse?: CourseData;

    private readonly logInButtonElem: JQuery;

    public constructor() {
        this.myProjectsList = new ProjectList($("#lobster-my-projects"));
        this.courseProjectsList = new ProjectList($("#lobster-course-projects"));

        this.setUpModals();

        $(".lobster-lobster").append(createSimpleExerciseOutletHTML("1"));
        this.lobster = new SimpleExerciseLobsterOutlet(
            $(".lobster-lobster"),
            createDefaultProject(),
            "Nice work!")
            .onSave((project: Project) => saveProject(project));
        
        this.activeProject = this.setProject(createDefaultProject());

        this.logInButtonElem = $(".lobster-log-in-button");
        assert(this.logInButtonElem.length > 0);

        listenTo(this, this.myProjectsList);
        listenTo(this, this.courseProjectsList);
        listenTo(this, USERS);

        USERS.checkLogin();

        this.loadCourses();
    }
    
    private setUpModals() {
        // Create Project Modal
        $("#lobster-create-project-form").on("submit", (e) => {
            e.preventDefault();
            this.createProject($("#lobster-create-project-name").val() as string, this.myProjectsList);
            $("#lobster-create-project-modal").modal("hide");
        });

        // Edit (and delete) Project Modal
        $("#lobster-edit-project-modal").on('show.bs.modal', () => {
            $("#lobster-edit-project-name").val(this.activeProject.name)
        });
        $("#lobster-edit-project-form").on("submit", (e) => {
            e.preventDefault();
            this.editActiveProject($("#lobster-edit-project-name").val() as string);
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
            $("#lobster-edit-exercise-key").val(this.activeExerciseData?.exercise_key ?? "")
        });
        $("#lobster-edit-exercise-form").on("submit", (e) => {
            e.preventDefault();
            this.editActiveExercise($("#lobster-edit-exercise-key").val() as string);
            $("#lobster-edit-exercise-modal").modal("hide");
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

        this.setProject(createDefaultProject());
        delete (<Mutable<this>>this).activeExerciseData;
    }
    
    @messageResponse("projectSelected", "unwrap")
    protected async onProjectSelected(projectData: ProjectData) {
        this.setProject(await this.setProjectFromData(projectData));
    }

    private async loadProject(project_id: number) {
        let projectData = await getProject(project_id);
        this.setProject(await this.setProjectFromData(projectData));
    }

    private async setProjectFromData(projectData: ProjectData) {
        let ex: ExerciseData | undefined;
        if (projectData.exercise_id) {
            ex = await getFullExercise(projectData.exercise_id);
        }

        (<Mutable<this>>this).activeExerciseData = ex; // will be undefined if no exercise

        let checkpoints = ex ? getExerciseCheckpoints(ex?.exercise_key) : [];

        return new Project(
            projectData.name,
            projectData.id,
            extractProjectFiles(projectData),
            new Exercise(checkpoints)
        ).turnOnAutoCompile();
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
                this.courseProjectsList.setProjects(await getCourseProjects(this.currentCourse.id));
            }
            catch (e) {
                // TODO
            }
        }
    }

    private setProject(project: Project) {
        (<Mutable<this>>this).activeProject = project;
        $("#lobster-project-name").html(project.name);
        this.lobster.setProject(project);
        this.myProjectsList.setActiveProject(project.id);
        this.courseProjectsList.setActiveProject(project.id);
        window.location.hash = project.id ? ""+project.id : "";
        return project;
    }

    private async createProject(name: string, projectList: ProjectList) {
        let newProject = await createProject(name);
        projectList.createProject(newProject);
        this.setProject(await this.setProjectFromData(newProject));
    }

    private async editActiveProject(name: string) {
        this.activeProject.setName(name);
        if (this.activeProject.id) {
            await this.lobster.projectSaveOutlet?.saveProject();
            this.myProjectsList.editProject(this.activeProject.id, {name: name});
            this.courseProjectsList.editProject(this.activeProject.id, {name: name});
            this.setProject(this.activeProject);
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
        if (this.activeExerciseData) {
            this.activeExerciseData.exercise_key = exercise_key;
            await saveExercise(this.activeExerciseData);
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


