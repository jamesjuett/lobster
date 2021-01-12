/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { Project } from "../core/Project";
import { SimpleExerciseLobsterOutlet } from "../exercises";
import { Message, MessageResponses } from "../util/observe";
import { ProjectList, ProjectData, FullProjectData } from "./projects";
import { UserInfo as UserData } from "./user";
import { CourseData } from "./courses";
/**
 * Expects elements with these ids to be present:
 * - lobster-log-in-button
 * - lobster-my-projects
 */
export declare class LobsterApplication {
    _act: MessageResponses;
    readonly myProjectsList: ProjectList;
    readonly courseProjectsList: ProjectList;
    readonly lobsterOutlet: SimpleExerciseLobsterOutlet;
    readonly projectSaveOutlet: ProjectSaveOutlet;
    readonly myProjects?: ProjectData[];
    readonly courseProjects?: ProjectData[];
    readonly activeProject: Project;
    readonly activeProjectData?: FullProjectData;
    readonly currentCourse?: CourseData;
    private currentCreateProjectList;
    private readonly logInButtonElem;
    constructor();
    private setUpElements;
    protected onUserLoggedIn(user: UserData): Promise<void>;
    protected onUserLoggedOut(user: UserData): void;
    protected onProjectSelected(projectData: ProjectData): Promise<void>;
    protected onCreateProjectClicked(message: Message<void>): Promise<void>;
    private loadProject;
    private setProjectFromData;
    private refreshMyProjectsList;
    private refreshCourseProjectsList;
    private setProject;
    private updateButtons;
    private createProject;
    private editActiveProject;
    private deleteActiveProject;
    private loadCourses;
    private setCourses;
    private loadCourse;
    private editActiveExercise;
}
export declare type ProjectSaveAction = (project: Project) => Promise<any>;
export declare class ProjectSaveOutlet {
    _act: MessageResponses;
    readonly project: Project;
    readonly isSaved: boolean;
    readonly isEnabled: boolean;
    private saveAction;
    private readonly element;
    private readonly saveButtonElem;
    private isAutosaveOn;
    constructor(element: JQuery, project: Project, saveAction: ProjectSaveAction, autosaveInterval?: number | false);
    setProject(project: Project, isEnabled: boolean): Project;
    private autosaveCallback;
    saveProject(): Promise<void>;
    private onSaveDisabled;
    private onSaveSuccessful;
    private onUnsavedChanges;
    private onSaveAttempted;
    private onSaveFailed;
    private removeButtonClasses;
    private onProjectChanged;
}
