/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { Program, SourceFile, SourceReference } from "../core/Program";
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import '../../css/lobster.css';
import 'codemirror/mode/clike/clike.js';
import 'codemirror/addon/display/fullscreen.js';
import 'codemirror/keymap/sublime.js';
import { Observable, MessageResponses } from "../util/observe";
import { Note } from "../core/errors";
export interface FileData {
    readonly name: string;
    readonly code: string;
    readonly isTranslationUnit: boolean;
}
declare type ProjectMessages = "nameSet" | "compilationFinished" | "compilationOutOfDate" | "fileAdded" | "fileRemoved" | "fileContentsSet" | "translationUnitAdded" | "translationUnitRemoved" | "translationUnitStatusSet" | "noteAdded";
export declare class Project {
    observable: Observable<ProjectMessages>;
    readonly name: string;
    readonly id?: number;
    readonly sourceFiles: readonly SourceFile[];
    private translationUnitNames;
    readonly program: Program;
    readonly isCompilationOutOfDate: boolean;
    private pendingAutoCompileTimeout?;
    private autoCompileDelay?;
    constructor(name: string, files: readonly FileData[], id?: number);
    setName(name: string): void;
    getFileData(): readonly FileData[];
    addFile(file: SourceFile, isTranslationUnit: boolean): void;
    removeFile(filename: string): void;
    setFileContents(file: SourceFile): void;
    setTranslationUnit(name: string, isTranslationUnit: boolean): void;
    recompile(): void;
    isTranslationUnit(name: string): boolean;
    /**
     * Toggles whether a source file in this project is being used as a translation unit
     * and should be compiled as part of the program. The name given for the translation
     * unit to be toggled must match the name of one of this project's source files.
     * @param tuName
     */
    toggleTranslationUnit(tuName: string): void;
    private compilationOutOfDate;
    private dispatchAutoCompile;
    /**
     * Turns on auto-compilation. Any changes to the project source will
     * trigger a recompile, which begins after no subsequent changes have
     * been made within the specified delay.
     * @param autoCompileDelay
     */
    turnOnAutoCompile(autoCompileDelay?: number): this;
    turnOffAutoCompile(): this;
    addNote(note: Note): void;
}
/**
 * This class manages all of the source files associated with a project and the editors
 * for those files. It is also owns the Program object and controls its compilation. It
 * also internally routes annotations (e.g. for compilation errors) to the appropriate
 * editor based on the source reference of the annotation.
 */
export declare class ProjectEditor {
    private static instances;
    _act: MessageResponses;
    readonly isOpen: boolean;
    private filesElem;
    private fileTabsMap;
    private fileEditorsMap;
    private currentFileEditor?;
    private codeMirror;
    private codeMirrorElem;
    readonly project: Project;
    constructor(element: JQuery, project: Project);
    setProject(project: Project): void;
    private onFileAdded;
    private onFileRemoved;
    onCompilationFinished(): void;
    onNoteAdded(note: Note): void;
    selectFile(filename: string): void;
    selectFirstFile(): void;
    refreshEditorView(): void;
    gotoSourceReference(sourceRef: SourceReference): void;
    private textChanged;
}
export declare type ProjectSaveAction = (project: Project) => Promise<any>;
export declare class ProjectSaveOutlet {
    _act: MessageResponses;
    readonly project: Project;
    readonly isSaved: boolean;
    private saveAction;
    private readonly element;
    private readonly saveButtonElem;
    private isAutosaveOn;
    constructor(element: JQuery, project: Project, saveAction: ProjectSaveAction, autosaveInterval?: number | false);
    setProject(project: Project): Project;
    private autosaveCallback;
    saveProject(): Promise<void>;
    private onSaveSuccessful;
    private onUnsavedChanges;
    private onSaveAttempted;
    private onSaveFailed;
    private onProjectChanged;
}
/**
 * Allows a user to view and manage the compilation scheme for a program.
 */
export declare class CompilationOutlet {
    _act: MessageResponses;
    readonly project: Project;
    private readonly compilationNotesOutlet;
    private readonly element;
    private readonly translationUnitsListElem;
    constructor(element: JQuery, project: Project);
    setProject(project: Project): Project;
    private updateButtons;
    private onCompilationFinished;
}
/**
 * Shows all of the compilation errors/warnings/etc. for the current project.
 */
export declare class CompilationNotesOutlet {
    observable: Observable<string>;
    _act: MessageResponses;
    private readonly element;
    constructor(element: JQuery);
    updateNotes(program: Program): void;
    private createBadgeForNote;
    private gotoSourceReference;
}
export declare class CompilationStatusOutlet {
    _act: MessageResponses;
    readonly project: Project;
    private readonly element;
    private readonly notesElem;
    private readonly errorsButton;
    private readonly numErrorsElem;
    private readonly warningsButton;
    private readonly numWarningsElem;
    private readonly styleButton;
    private readonly numStyleElem;
    private readonly compileButton;
    private compileButtonText;
    constructor(element: JQuery, project: Project);
    setProject(project: Project): Project;
    private onCompilationFinished;
    private onCompilationOutOfDate;
}
export declare class FileEditor {
    private static instances;
    observable: Observable;
    readonly file: SourceFile;
    readonly doc: CodeMirror.Doc;
    private readonly gutterErrors;
    private syntaxErrorLineHandle?;
    /**
    *
    * @param {SourceFile} sourceFile The initial contents of this editor.
    */
    constructor(file: SourceFile);
    private onEdit;
    addMark(sourceRef: SourceReference, cssClass: string): CodeMirror.TextMarker;
    clearMarks(): void;
    addGutterError(line: number, text: string): JQuery<HTMLElement>;
    removeGutterError(line: number): void;
    clearGutterErrors(): void;
    addWidget(sourceRef: SourceReference, elem: JQuery): void;
    clearSyntaxError(): void;
    setSyntaxError(line: number): void;
    gotoSourceReference(sourceRef: SourceReference): void;
}
export {};
