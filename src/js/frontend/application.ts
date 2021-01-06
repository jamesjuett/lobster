import Cookies from "js-cookie";
import { SimpleExerciseLobsterOutlet } from "../exercises";
import { listenTo, messageResponse, MessageResponses } from "../util/observe";
import { assert } from "../util/util";
import { Project } from "../view/editors";
import { ICON_PERSON } from "./octicons";
import { extractFiles as extractProjectFiles, MyProjects, ProjectData } from "./projects";
import { createSimpleExerciseOutlet as createSimpleExerciseOutletHTML } from "./simple_exercise_outlet";
import { User, UserInfo as UserData } from "./user";


/**
 * Expects elements with these classes to be present:
 * - lobster-log-in-button
 * - lobster-my-projects
 */
export class LobsterApplication {

    public _act!: MessageResponses;

    public readonly myProjects: MyProjects;
    public readonly user: User;
    public readonly lobster: SimpleExerciseLobsterOutlet;

    private readonly logInButtonElem: JQuery;

    public constructor() {
        this.myProjects = new MyProjects($(".lobster-my-projects"));
        this.user = new User();
        $(".lobster-lobster").append(createSimpleExerciseOutletHTML("1"));
        this.lobster = new SimpleExerciseLobsterOutlet(
            $(".lobster-lobster"),
            new Project("Test Project", [
                { name: "file.cpp", code: "int main() {\n  int x = 2;\n}", isTranslationUnit: true },
                { name: "file2.cpp", code: "blah wheee", isTranslationUnit: false }
            ]),
            "Nice work!"
        );
        this.lobster.project.turnOnAutoCompile();

        listenTo(this, this.myProjects);
        listenTo(this, this.user);

        this.logInButtonElem = $(".lobster-log-in-button");
        assert(this.logInButtonElem.length > 0);

        this.user.checkLogin();
    }

    public async refreshProjects() {
        
        const response = await fetch(`api/users/me/projects`, {
            method: 'GET',
            headers: {
                'Authorization': 'bearer ' + Cookies.get('bearer')
            }
        });

        let projects: ProjectData[] = await response.json();
        this.myProjects.setProjects(projects);

    }
    
    @messageResponse("userLoggedIn", "unwrap")
    protected onUserLoggedIn(user: UserData) {
        this.logInButtonElem.html(`${ICON_PERSON} ${user.email}`);

        this.refreshProjects();
    }
    
    @messageResponse("userLoggedOut", "unwrap")
    protected onUserLoggedOut(user: UserData) {
        this.logInButtonElem.html("Sign In");
    }
    
    @messageResponse("projectSelected", "unwrap")
    protected onProjectSelected(projectData: ProjectData) {
        console.log(projectData.name + " selected");
        this.lobster.setProject(
            new Project(
                projectData.name,
                extractProjectFiles(projectData)
            )
        );
    }

    

}