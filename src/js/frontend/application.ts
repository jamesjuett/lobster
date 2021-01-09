import Cookies from "js-cookie";
import { EXERCISE_CHECKPOINTS, getExerciseCheckpoints, OutputCheckpoint, outputComparator } from "../analysis/checkpoints";
import { Project } from "../core/Project";
import { SimpleExerciseLobsterOutlet } from "../exercises";
import { listenTo, messageResponse, MessageResponses } from "../util/observe";
import { assert, Mutable } from "../util/util";
import { ICON_PERSON } from "./octicons";
import { parseFiles as extractProjectFiles, getMyProjects, MyProjects, ProjectData, saveProject, createProject, deleteProject, getExercise, ExerciseData } from "./projects";
import { createSimpleExerciseOutlet as createSimpleExerciseOutletHTML } from "./simple_exercise_outlet";
import { USERS, Users, UserInfo as UserData } from "./user";
import axios from 'axios';


/**
 * Expects elements with these classes to be present:
 * - lobster-log-in-button
 * - lobster-my-projects
 */
export class LobsterApplication {

    public _act!: MessageResponses;

    public readonly myProjects: MyProjects;
    public readonly lobster: SimpleExerciseLobsterOutlet;

    public readonly activeProject: Project;

    private readonly logInButtonElem: JQuery;

    public constructor() {
        this.myProjects = new MyProjects($(".lobster-my-projects"));

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

        listenTo(this, this.myProjects);
        listenTo(this, USERS);

        USERS.checkLogin();
    }
    
    private setUpModals() {
        // Create Project Modal
        $("#lobster-create-project-form").on("submit", (e) => {
            e.preventDefault();
            this.createProject($("#lobster-create-project-name").val() as string);
            $("#lobster-create-project-modal").modal("hide");
        });

        // Edit (and delete) Project Modal
        $("#lobster-edit-project-modal").on('show.bs.modal', () => {
            $("#lobster-edit-project-name").val(this.activeProject.name)
        });
        $("#lobster-edit-project-form").on("submit", (e) => {
            e.preventDefault();
            this.editProject($("#lobster-edit-project-name").val() as string);
            $("#lobster-edit-project-modal").modal("hide");
        });
        $("#lobster-edit-project-delete").on("click", (e) => {
            e.preventDefault();
            this.deleteProject();
            $("#lobster-edit-project-modal").modal("hide");
        });

    }

    @messageResponse("userLoggedIn", "unwrap")
    protected async onUserLoggedIn(user: UserData) {
        this.logInButtonElem.html(`${ICON_PERSON} ${user.email}`);

        await this.refreshProjects();

        if (!this.activeProject.id) {
            let desiredId = getProjectIdFromLocationHash();
            let firstProject = this.myProjects.projects.find(p => p.id === desiredId);
            if (firstProject) {
                this.setProject(await createProjectFromData(firstProject));
            }
        }
    }
    
    @messageResponse("userLoggedOut", "unwrap")
    protected onUserLoggedOut(user: UserData) {
        this.logInButtonElem.html("Sign In");

        this.setProject(createDefaultProject());
    }
    
    @messageResponse("projectSelected", "unwrap")
    protected async onProjectSelected(projectData: ProjectData) {
        this.setProject(await createProjectFromData(projectData));
    }

    private async refreshProjects() {
        this.setProjects(await getMyProjects());
        this.myProjects.setActiveProject(this.activeProject.id);
    }

    private setProject(project: Project) {
        (<Mutable<this>>this).activeProject = project;
        $("#lobster-project-name").html(project.name);
        this.lobster.setProject(project);
        this.myProjects.setActiveProject(project.id);
        window.location.hash = project.id ? ""+project.id : "";
        return project;
    }

    private setProjects(projects: readonly ProjectData[]) {
        this.myProjects.setProjects(projects);
    }

    private async createProject(name: string) {
        let newProject = await createProject(name);
        this.setProjects([...this.myProjects.projects, newProject]);
        this.setProject(await createProjectFromData(newProject));
    }

    private async editProject(name: string) {
        this.activeProject.setName(name);
        await this.lobster.projectSaveOutlet?.saveProject();
        let projectsCopy = this.myProjects.projects.map(
            p => p.id === this.activeProject.id ? Object.assign({}, p, {name: name}) : p
        );
        this.setProjects(projectsCopy);
        this.setProject(this.activeProject);
    }

    private async deleteProject() {
        if (!this.activeProject.id) {
            return; // If it doesn't have an ID, it's just the local default project
        }
        await deleteProject(this.activeProject.id);
        let projectsCopy = [...this.myProjects.projects];
        projectsCopy.splice(this.myProjects.projects.findIndex(p => p.id === this.activeProject.id), 1);
        this.setProjects(projectsCopy);
    }

}

async function createProjectFromData(projectData: ProjectData) {
    let ex: ExerciseData | undefined;
    if (projectData.exercise_id) {
        ex = await getExercise(projectData.exercise_id);
    }
    return new Project(
        projectData.name,
        projectData.id,
        extractProjectFiles(projectData),
        {
            checkpoints: getExerciseCheckpoints(ex?.checkpoint_keys ?? [])
        }
    ).turnOnAutoCompile();
}

function createDefaultProject() {
    return new Project(
        "[unnamed project]",
        undefined, [
            { name: "file.cpp", code: `#include <iostream>\n\nusing namespace std;\n\nint main() {\n  cout << "Hello World!" << endl;\n}`, isTranslationUnit: true }
        ], {
            checkpoints: [
                new OutputCheckpoint('Print "Hello World!"', outputComparator("Hello World!", true))
            ]
        }
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


