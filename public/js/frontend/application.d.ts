import { Project } from "../core/Project";
import { SimpleExerciseLobsterOutlet } from "../exercises";
import { MessageResponses } from "../util/observe";
import { ProjectList, ProjectData } from "./projects";
import { UserInfo as UserData } from "./user";
/**
 * Expects elements with these classes to be present:
 * - lobster-log-in-button
 * - lobster-my-projects
 */
export declare class LobsterApplication {
    _act: MessageResponses;
    readonly myProjectsList: ProjectList;
    readonly courseProjectsList: ProjectList;
    readonly lobster: SimpleExerciseLobsterOutlet;
    readonly myProjects?: ProjectData[];
    readonly courseProjects?: ProjectData[];
    readonly activeProject: Project;
    readonly currentCourseId?: number;
    private readonly logInButtonElem;
    constructor();
    private setUpModals;
    protected onUserLoggedIn(user: UserData): Promise<void>;
    protected onUserLoggedOut(user: UserData): void;
    protected onProjectSelected(projectData: ProjectData): Promise<void>;
    private loadProject;
    private refreshMyProjectsList;
    private refreshCourseProjectsList;
    private setProject;
    private createProject;
    private editActiveProject;
    private deleteActiveProject;
    private loadCourses;
    private setCourses;
    private loadCourse;
}
