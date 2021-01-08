import { SimpleExerciseLobsterOutlet } from "../exercises";
import { MessageResponses } from "../util/observe";
import { Project } from "../view/editors";
import { MyProjects, ProjectData } from "./projects";
import { UserInfo as UserData } from "./user";
/**
 * Expects elements with these classes to be present:
 * - lobster-log-in-button
 * - lobster-my-projects
 */
export declare class LobsterApplication {
    _act: MessageResponses;
    readonly myProjects: MyProjects;
    readonly lobster: SimpleExerciseLobsterOutlet;
    readonly activeProject: Project;
    private readonly logInButtonElem;
    constructor();
    private setUpModals;
    protected onUserLoggedIn(user: UserData): void;
    protected onUserLoggedOut(user: UserData): void;
    protected onProjectSelected(projectData: ProjectData): void;
    private refreshProjects;
    private setProject;
    private setProjects;
    private createProject;
    private deleteProject;
}
