import Cookies from "js-cookie";
import { SimpleExerciseLobsterOutlet } from "../exercises";
import { listenTo, messageResponse, MessageResponses } from "../util/observe";
import { assert, Mutable } from "../util/util";
import { Project } from "../view/editors";
import { ICON_PERSON } from "./octicons";
import { parseFiles as extractProjectFiles, getMyProjects, MyProjects, ProjectData, saveProject, createProject, deleteProject } from "./projects";
import { createSimpleExerciseOutlet as createSimpleExerciseOutletHTML } from "./simple_exercise_outlet";
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
        // $("#lobster-edit-project-form").on("submit", (e) => {
        //     e.preventDefault();
        //     this.editProject($("#lobster-edit-project-name").val() as string);
        //     $("#lobster-edit-project-modal").modal("hide");
        // });
        $("#lobster-edit-project-delete").on("click", (e) => {
            e.preventDefault();
            this.deleteProject();
            $("#lobster-edit-project-modal").modal("hide");
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

        this.setProject(createDefaultProject());
    }
    
    @messageResponse("projectSelected", "unwrap")
    protected onProjectSelected(projectData: ProjectData) {
        this.setProject(new Project(
            projectData.name,
            extractProjectFiles(projectData),
            projectData.id
        ).turnOnAutoCompile());
    }

    private async refreshProjects() {
        this.setProjects(await getMyProjects());
        this.myProjects.setActiveProject(this.activeProject.id ?? getProjectIdFromLocationHash());
    }

    private setProject(project: Project) {
        (<Mutable<this>>this).activeProject = project;
        $("#lobster-project-name").html(project.name);
        this.lobster.setProject(project);
        this.myProjects.setActiveProject(project.id);
        return project;
    }

    private setProjects(projects: readonly ProjectData[]) {
        this.myProjects.setProjects(projects);
    }

    private async createProject(name: string) {
        let newProject = await createProject(name);
        this.setProjects([...this.myProjects.projects, newProject]);
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

function createDefaultProject() {
    return new Project("[unnamed project]", [
        { name: "file.cpp", code: `#include <iostream>\n\nusing namespace std;\n\nint main() {\n  cout << "Hello World!" << endl;\n}`, isTranslationUnit: true }
    ]).turnOnAutoCompile();
}

// export function createModals() {
//     return $(`
//     <div id="lobster-create-project-modal" class="modal fade" tabindex="-1" role="dialog">
//         <div class="modal-dialog" role="document">
//         <div class="modal-content">
//             <div class="modal-header">
//                 <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
//                 <h4 class="modal-title">New Project</h4>
//             </div>
//             <div class="modal-body">
//             <form class="form" id="lobster-create-project-form" >
//                 <label for="lobster-create-project-name" class="control-label">Project Name</label>
//                 <br />
//                 <input type="text" minlength="1" maxlength="100" class="form-control" id="lobster-create-project-name" required>
//                 <br />
//                 <div style="text-align: right">
//                     <button class="btn btn-default" data-dismiss="modal">Cancel</button>
//                     <button type="submit" class="btn btn-primary">Create</button>
//                 </div>
//             </form>
//             </div>
//         </div>
//         </div>
//     </div>
//     `);
// }