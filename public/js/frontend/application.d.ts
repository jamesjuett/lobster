import { SimpleExerciseLobsterOutlet } from "../exercises";
import { MessageResponses } from "../util/observe";
import { MyProjects, ProjectData } from "./projects";
import { User, UserInfo as UserData } from "./user";
/**
 * Expects elements with these classes to be present:
 * - lobster-log-in-button
 * - lobster-my-projects
 */
export declare class LobsterApplication {
    _act: MessageResponses;
    readonly myProjects: MyProjects;
    readonly user: User;
    readonly lobster: SimpleExerciseLobsterOutlet;
    private readonly logInButtonElem;
    constructor();
    refreshProjects(): Promise<void>;
    protected onUserLoggedIn(user: UserData): void;
    protected onUserLoggedOut(user: UserData): void;
    protected onProjectSelected(projectData: ProjectData): void;
}
