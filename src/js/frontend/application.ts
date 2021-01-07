import Cookies from "js-cookie";
import { SimpleExerciseLobsterOutlet } from "../exercises";
import { listenTo, messageResponse, MessageResponses } from "../util/observe";
import { assert, Mutable } from "../util/util";
import { Project } from "../view/editors";
import { ICON_PERSON } from "./octicons";
import { parseFiles as extractProjectFiles, getMyProjects, MyProjects, ProjectData, saveProject, createProject } from "./projects";
import { createSimpleExerciseOutlet as createSimpleExerciseOutletHTML, createSimpleExerciseOutletModals } from "./simple_exercise_outlet";
import { USERS, Users, UserInfo as UserData } from "./user";


/**
 * Expects elements with these classes to be present:
 * - lobster-log-in-button
 * - lobster-my-projects
 */
export class LobsterApplication {

    public _act!: MessageResponses;

    public readonly myProjects: MyProjects;
    public readonly lobster: SimpleExerciseLobsterOutlet;

    public readonly activeProjectId?: number;

    private readonly logInButtonElem: JQuery;

    public constructor() {
        this.myProjects = new MyProjects($(".lobster-my-projects"));

        this.setUpModals();

        $(".lobster-lobster").append(createSimpleExerciseOutletHTML("1"));
        this.lobster = new SimpleExerciseLobsterOutlet(
            $(".lobster-lobster"),
            new Project("Test Project", [
                { name: "file.cpp", code: "int main() {\n  int x = 2;\n}", isTranslationUnit: true },
                { name: "file2.cpp", code: "blah wheee", isTranslationUnit: false }
            ]),
            "Nice work!"
        ).onSave((project: Project) => saveProject(project));
        this.lobster.project.turnOnAutoCompile();

        this.logInButtonElem = $(".lobster-log-in-button");
        assert(this.logInButtonElem.length > 0);

        let hash = window.location.hash;
        if (hash.length > 1) {
            this.activeProjectId = parseInt(hash.slice(1));
            if (isNaN(this.activeProjectId)) {
                this.activeProjectId = undefined;
            }
        }

        listenTo(this, this.myProjects);
        listenTo(this, USERS);

        USERS.checkLogin();
    }
    
    private setUpModals() {
        $("body").append(createSimpleExerciseOutletModals());

        $("#lobster-create-project-form").on("submit", (e) => {
            e.preventDefault();
            this.createProject($("#lobster-create-project-name").val() as string);
            $("#lobster-create-project-modal").modal("hide");
        });
    }

    @messageResponse("userLoggedIn", "unwrap")
    protected onUserLoggedIn(user: UserData) {
        this.logInButtonElem.html(`${ICON_PERSON} ${user.email}`);

        this.refreshProjects();
    }
    
    @messageResponse("userLoggedOut", "unwrap")
    protected onUserLoggedOut(user: UserData) {
        this.logInButtonElem.html("Sign In");

        (<Mutable<this>>this).activeProjectId = undefined;
    }
    
    @messageResponse("projectSelected", "unwrap")
    protected onProjectSelected(projectData: ProjectData) {
        this.lobster.setProject(
            new Project(
                projectData.name,
                extractProjectFiles(projectData),
                projectData.id
            )
        );
        
        (<Mutable<this>>this).activeProjectId = projectData.id;
        this.myProjects.setActiveProject(this.activeProjectId);
    }

    private async refreshProjects() {
        this.setProjects(await getMyProjects());
    }

    private setProjects(projects: readonly ProjectData[]) {
        this.myProjects.setProjects(projects);
        this.myProjects.setActiveProject(this.activeProjectId);
    }

    private async createProject(name: string) {
        let newProject = await createProject(name);
        this.setProjects([...this.myProjects.projects, newProject]);

    }

}