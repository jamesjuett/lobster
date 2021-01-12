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
import { Project } from "../core/Project";
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
