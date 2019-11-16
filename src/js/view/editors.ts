import { Program, SourceFile, SourceReference } from "../core/Program";
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import '../../css/lobster.css';
import 'codemirror/mode/clike/clike.js';
import 'codemirror/addon/display/fullscreen.js';
// import '../../styles/components/_codemirror.css';
import { assert, Mutable, asMutable } from "../util/util";
import { Observable, messageResponse, Message, addListener, MessageResponses } from "../util/observe";
import { Note, SyntaxNote, NoteKind, NoteRecorder } from "../core/errors";
import { analyze } from "../core/analysis";

const API_URL_LOAD_PROJECT = "/api/me/project/get/";
const API_URL_SAVE_PROJECT = "/api/me/project/save/";

interface FileData {
    readonly name: string;
    readonly code: string;
    readonly isTranslationUnit: "yes" | "no";
}

/**
 * This class manages all of the source files associated with a project and the editors
 * for those files. It is also owns the Program object and controls its compilation. It
 * also internally routes annotations (e.g. for compilation errors) to the appropriate
 * editor based on the source reference of the annotation.
 */
export class ProjectEditor {

    private static instances: ProjectEditor[] = [];

    public observable: Observable = new Observable(this);
    public _act!: MessageResponses;

    public static onBeforeUnload() {
        let unsaved = ProjectEditor.instances.find(inst => inst.isOpen && !inst.isSaved);
        if (unsaved) {
            return "The project \"" + unsaved.projectName + "\" has unsaved changes.";
        }
    }

    public readonly projectName?: string;
    public readonly sourceFiles: readonly SourceFile[] = [];
    private translationUnitNamesMap: {[index: string]: boolean} = {};
    public readonly program: Program;

    public readonly isSaved: boolean = true;
    public readonly isOpen: boolean = false;

    private fileTabs: {[index: string]: JQuery} = {};
    private filesElem: JQuery;
    private fileEditors: {[index: string]: FileEditor} = {};

    private codeMirror: CodeMirror.Editor;

    public constructor(element: JQuery) {
        
        let codeMirrorElement = element.find(".codeMirrorEditor");
        assert(codeMirrorElement.length > 0, "ProjectEditor element must contain an element with the 'codeMirrorEditor' class.");
        this.codeMirror = CodeMirror(codeMirrorElement[0], {
            mode: CODEMIRROR_MODE,
            theme: "lobster",
            lineNumbers: true,
            tabSize: 2,
            extraKeys: {
                "Ctrl-S" : () => {
                    if (!this.isSaved) {
                        this.saveProject();
                    }
                },

            },
            gutters: ["CodeMirror-linenumbers", "errors"]
        });

        this.filesElem = element.find(".project-files");
        assert(this.filesElem.length > 0, "CompilationOutlet must contain an element with the 'translation-units-list' class.");
        
        this.program = new Program([], []);
        
        ProjectEditor.instances.push(this);
    }

    public isTranslationUnit(tuName: string) {
        // If it's a valid source file, its name will be a key in the map
        assert(tuName in this.translationUnitNamesMap, `No source file found for translation unit: ${tuName}`);
        
        return this.translationUnitNamesMap[tuName];
    }

    /**
     * Toggles whether a source file in this project is being used as a translation unit
     * and should be compiled as part of the program. The name given for the translation
     * unit to be toggled must match the name of one of this project's source files.
     * @param tuName 
     */
    public toggleTranslationUnit(tuName: string) {
        // If it's a valid source file, its name will be a key in the map
        assert(tuName in this.translationUnitNamesMap, `No source file found for translation unit: ${tuName}`);
        
        let isTU = this.translationUnitNamesMap[tuName] = !this.translationUnitNamesMap[tuName];
        if (isTU) {
            this.observable.send("translationUnitAdded");
        }
        else {
            this.observable.send("translationUnitRemoved");
        }

        this.compilationOutOfDate();
    }

    private loadProject(projectName: string) {
        // TODO NEW: warn about losing unsaved changes
        if (!this.isSaved) {
            if (!confirm("WARNING: Your current project has unsaved changes. These will be lost if you load a new project. Are you sure?")) {
                return;
            };
        }

        $.ajax({
            type: "GET",
            url: API_URL_LOAD_PROJECT + projectName,
            success: (data) => {
                if (!data) {
                    alert("Project not found! :(");
                    return;
                }
                this.setProject(projectName, data);
            },
            dataType: "json"
        });

    }

    public saveProject() {
        let projectFiles = this.sourceFiles.map((file) => ({
            name: file.name,
            text: file.text,
            isTranslationUnit: this.isTranslationUnit(file.name) ? "yes" : "no"
        }));

        $.ajax({
            type: "POST",
            url: API_URL_SAVE_PROJECT + this.projectName,
            data: {files: projectFiles},
            success: () => {
                console.log("saved successfully");
                this.setSaved(true);
            },
            dataType: "json"
        });
        this.observable.send("saveAttempted");
    }

    public setSaved(isSaved: boolean) {
        (<Mutable<this>>this).isSaved = isSaved;
        if (!isSaved) {
            this.observable.send("unsavedChanges");
        }
        else {
            this.observable.send("saveSuccessful");
        }
    }

    private clearProject() {
        let _this = <Mutable<this>>this;

        _this.projectName = "";
        _this.sourceFiles = [];
        this.translationUnitNamesMap = {};
        this.recompile();

        _this.isSaved = true;
        _this.isOpen = false;
        
        this.fileTabs = {};
        this.filesElem.empty();
        this.fileEditors = {};

        this.observable.send("projectCleared");
    }

    public setProject(projectName: string, projectData: readonly FileData[]) {

        this.clearProject();

        let _this = <Mutable<this>>this;

        _this.projectName = projectName;
        projectData.forEach(fileData => this.createFile(fileData));

        _this.isSaved = true;
        _this.isOpen = true;

        document.title = projectName; // TODO: this is too aggressive. replace in favor of projectLoaded message

        // Set first file to be active
        if (projectData.length > 0) {
            this.filesElem.children().first().addClass("active"); // TODO: should the FileEditor be doing this instead?
            this.selectFile(projectData[0]["name"]);
        }

        this.recompile();
        this.observable.send("projectLoaded");
    }

    private createFile(fileData: FileData) {
        let fileName = fileData.name;

        // Create the file itself
        let sourceFile = new SourceFile(fileName, fileData.code);
        asMutable(this.sourceFiles).push(sourceFile);

        // Add a translation unit if appropriate
        this.translationUnitNamesMap[fileName] = fileData.isTranslationUnit === "yes";

        // Create a FileEditor object to manage editing the file
        let fileEd = new FileEditor(sourceFile);
        this.fileEditors[fileName] = fileEd;
        addListener(fileEd, this);

        // Create tab to select this file for viewing/editing
        let item = $('<li></li>');
        let link = $('<a href="" data-toggle="pill">' + fileData.name + '</a>');
        link.on("shown.bs.tab", () => this.selectFile(fileName));
        item.append(link);
        this.fileTabs[fileData.name] = link;
        this.filesElem.append(item);
    }

    private compilationOutOfDate() {
        this.observable.send("compilationOutOfDate");
    }

    public recompile() {
        (<Mutable<this>>this).program = new Program(this.sourceFiles,
            this.sourceFiles.map(file => file.name).filter(name => this.isTranslationUnit(name)));

        analyze(this.program);

        Object.keys(this.fileEditors).forEach((ed: string) => {
            this.fileEditors[ed].clearMarks();
            this.fileEditors[ed].clearGutterErrors();
        });
        
        this.program.notes.allNotes.forEach(note => {
            let sourceRef = note.primarySourceReference;
            if (sourceRef) {
                let editor = this.fileEditors[sourceRef.sourceFile.name];
                editor.addMark(sourceRef, note.kind);
                editor.addGutterError(sourceRef.line, note.message);
            }
        });

        // TODO NEW Return support for widgets elsewhere.
        // Perhaps reimplement as a generic kind of SemanticNote class
        // for(var i = 0; i < this.i_semanticProblems.widgets.length; ++i){
        //     // alert(this.i_semanticProblems.get(i));
        //     this.send("addAnnotation", this.i_semanticProblems.widgets[i]);
        // }
        this.observable.send("compilationFinished", this.program);
    }

    private selectFile(filename: string) {
        assert(!!this.fileEditors[filename], `File ${filename} does not exist in this project.`);
        this.codeMirror.swapDoc(this.fileEditors[filename].doc);
    }

    public refreshEditorView() {
        this.codeMirror.refresh();

        // scroll cursor (indicated by null) into view with vertical margin of 50 pixels
        this.codeMirror.scrollIntoView(null, 50);
    }

    public gotoSourceReference(sourceRef: SourceReference) {
        let name = sourceRef.sourceFile.name;
        let editor = this.fileEditors[name];
        if (editor) {
            this.fileTabs[name].tab("show");
            editor.gotoSourceReference(sourceRef);
        }
        
    }

    // @messageResponse()
    // private requestFocus(msg: Message) {
    //     this.observable.send("requestFocus");
    //     if (msg.source instanceof FileEditor) {
    //         this.fileTabs[msg.source.file.name].tab("show");
    //     }
    // }

    @messageResponse()
    private textChanged(msg: Message) {
        let updatedFile: SourceFile = msg.data;
        let i = this.sourceFiles.findIndex(file => file.name === updatedFile.name);
        asMutable(this.sourceFiles)[i] = updatedFile;
        this.setSaved(false);
        this.compilationOutOfDate();
    }


//     @messageResponse()
//     private parsed(msg: Message) {

//         // TODO NEW: This actually needs to be selected based on a reverse mapping of line numbers for includes
//         var tu = msg.source;
//         var editor = this.i_fileEditors[tu.getName()];

//         if (editor.syntaxErrorLineHandle) {
//             editor.i_doc.removeLineClass(editor.syntaxErrorLineHandle, "background", "syntaxError");
//         }
//         if (msg.data){
//             var err = msg.data;
// //            this.marks.push(this.i_doc.markText({line: err.line-1, ch: err.column-1}, {line:err.line-1, ch:err.column},
// //                {className: "syntaxError"}));
//             editor.syntaxErrorLineHandle = editor.i_doc.addLineClass(err.line-1, "background", "syntaxError");
//             // editor.clearAnnotations();
//         }
//     },

    // setSource : function(src){
    //     this.i_sourceCode = src;
    // },

}
$(window).bind("beforeunload", ProjectEditor.onBeforeUnload);

export class ProjectSaveOutlet {

    public observable = new Observable(this);
    public _act!: MessageResponses;

    private readonly projectEditor: ProjectEditor;

    private readonly element: JQuery;
    private readonly saveButtonElem: JQuery;

    private isAutosaveOn: boolean = true;

    public constructor(element: JQuery, projectEditor: ProjectEditor) {
        this.element = element;
        this.projectEditor = projectEditor;
        addListener(projectEditor, this);

        this.saveButtonElem = 
            $('<button class="btn btn-default"></button>')
            .prop("disabled", true)
            .html('<span class="glyphicon glyphicon-floppy-remove"></span>')
            .on("click", () => {
                this.saveAction();
            });

        this.element.append(this.saveButtonElem);

        setInterval(() => this.autosaveCallback(), 30000);


    }

    private saveAction() {
        if (this.projectEditor.isOpen && !this.projectEditor.isSaved) {
            this.projectEditor.saveProject();
        }
    }

    private autosaveCallback() {
        if (this.isAutosaveOn) {
            this.saveAction();
        }
    }

    @messageResponse()
    private projectLoaded() {
        this.saveButtonElem.prop("disabled", false);
        this.saveButtonElem.removeClass("btn-default");
        this.saveButtonElem.removeClass("btn-warning-muted");
        this.saveButtonElem.addClass("btn-success-muted");
        this.saveButtonElem.html('<span class="glyphicon glyphicon-floppy-saved"></span>');
    }
    
    @messageResponse()
    private unsavedChanges() {
        this.saveButtonElem.removeClass("btn-default");
        this.saveButtonElem.removeClass("btn-success-muted");
        this.saveButtonElem.addClass("btn-warning-muted");
        this.saveButtonElem.html('<span class="glyphicon glyphicon-floppy-disk"></span>');
    }
    
    @messageResponse()
    private saveAttempted() {
        this.saveButtonElem.removeClass("btn-default");
        this.saveButtonElem.removeClass("btn-success-muted");
        this.saveButtonElem.addClass("btn-warning-muted");
        this.saveButtonElem.html('<span class="glyphicon glyphicon-floppy-open pulse"></span>');
    }
    
    @messageResponse()
    private saveSuccessful() {
        this.saveButtonElem.removeClass("btn-default");
        this.saveButtonElem.removeClass("btn-warning-muted");
        this.saveButtonElem.addClass("btn-success-muted");
        this.saveButtonElem.html('<span class="glyphicon glyphicon-floppy-saved"></span>');
    }

}


/**
 * Allows a user to view and manage the compilation scheme for a program.
 */
export class CompilationOutlet {

    public _act!: MessageResponses;
    
    private readonly projectEditor: ProjectEditor;
    private readonly compilationNotesOutlet: CompilationNotesOutlet;

    private readonly element: JQuery;
    private readonly translationUnitsListElem: JQuery;

    public constructor(element: JQuery, projectEditor: ProjectEditor) {
        this.element = element;
        this.projectEditor = projectEditor;

        this.translationUnitsListElem = element.find(".translation-units-list");
        assert(this.translationUnitsListElem.length > 0, "CompilationOutlet must contain an element with the 'translation-units-list' class.");

        this.compilationNotesOutlet = new CompilationNotesOutlet(element.find(".compilation-notes-list"));
        assert(this.translationUnitsListElem.length > 0, "CompilationOutlet must contain an element with the 'compilation-notes-list' class.");
        addListener(this.compilationNotesOutlet, projectEditor);
        addListener(projectEditor, this.compilationNotesOutlet);

        addListener(projectEditor, this);

    }

    @messageResponse("projectCleared")
    @messageResponse("projectLoaded")
    @messageResponse("sourceFileAdded")
    @messageResponse("sourceFileRemoved")
    @messageResponse("translationUnitAdded")
    @messageResponse("translationUnitRemoved")
    private updateButtons() {
        this.translationUnitsListElem.empty();

        // Create buttons for each file to toggle whether it's a translation unit or not
        this.projectEditor.sourceFiles.forEach(file => {

            let button = $('<button class="btn">' + file.name + '</button>')
            .addClass(this.projectEditor.isTranslationUnit(file.name) ? "btn-info" : "text-muted")
            .click(() => this.projectEditor.toggleTranslationUnit(file.name));

            this.translationUnitsListElem.append($('<li></li>').append(button));
        });
    }
}

const NoteCSSClasses : {[K in NoteKind]: string} = {
    error: "lobster-note-error",
    warning: "lobster-note-warning",
    style: "lobster-note-style",
    other: "lobster-note-other"
};

const NoteDescriptions : {[K in NoteKind]: string} = {
    error: "Error",
    warning: "Warning",
    style: "Style",
    other: "Other"
};

/**
 * Shows all of the compilation errors/warnings/etc. for the current project.
 */
export class CompilationNotesOutlet {

    public observable = new Observable(this);
    public _act!: MessageResponses;

    private readonly element: JQuery;

    public constructor(element: JQuery) {
        this.element = element;
    }

    public updateNotes(notes: Program): void; 
    public updateNotes(msg: Message<Program>): void;
    @messageResponse("compilationFinished")
    public updateNotes(program: Program | Message<Program>) {

        if (!(program instanceof Program)) {
            program = program.data;
        }

        this.element.empty();

        program.notes.allNotes.forEach(note => {

            let item = $('<li></li>').append(this.createBadgeForNote(note)).append(" ");

            let ref = note.primarySourceReference;
            if (ref) {
                let sourceReferenceElem = $('<span class="lobster-source-reference"></span>');
                new SourceReferenceOutlet(sourceReferenceElem, ref);
                item.append(sourceReferenceElem).append(" ");
            }

            item.append(note.message);

            this.element.append(item);
        });
    }

    private createBadgeForNote(note: Note) {
        var elem = $('<span class="label"></span>');

        // hacky special case
        if (note instanceof SyntaxNote) {
            elem.html("Syntax Error");
        }
        else {
            elem.html(NoteDescriptions[note.kind]);
        }

        elem.addClass(NoteCSSClasses[note.kind]);

        return elem;
    }
    
    @messageResponse("gotoSourceReference")
    private gotoSourceReference(msg: Message<SourceReference>) {
        this.observable.send("gotoSourceReference", msg.data);
    }
}

export class CompilationStatusOutlet {

    public _act!: MessageResponses;

    private readonly projectEditor: ProjectEditor;

    private readonly element: JQuery;
    
    private readonly notesElem: JQuery;
    private readonly errorsButton: JQuery;
    private readonly numErrorsElem: JQuery;
    private readonly warningsButton: JQuery;
    private readonly numWarningsElem: JQuery;
    private readonly styleButton: JQuery;
    private readonly numStyleElem: JQuery;
    private readonly compileButton: JQuery;
    private compileButtonText: string;

    public constructor(element: JQuery, projectEditor: ProjectEditor) {
        this.element = element;
        this.projectEditor = projectEditor;

        this.notesElem = $('<span></span>').appendTo(this.element).hide();
        this.errorsButton = $('<button class="btn btn-danger-muted" style="padding: 6px 6px;"></button>')
            .append(this.numErrorsElem = $('<span></span>'))
            .append(" ")
            .append('<span class="glyphicon glyphicon-remove"></span>')
            .appendTo(this.notesElem);
        this.notesElem.append(" ");
        this.warningsButton = $('<button class="btn btn-warning-muted" style="padding: 6px 6px;"></button>')
            .append(this.numWarningsElem = $('<span></span>'))
            .append(" ")
            .append('<span class="glyphicon glyphicon-alert"></span>')
            .appendTo(this.notesElem);
        this.notesElem.append(" ");
        this.styleButton = $('<button class="btn btn-style-muted" style="padding: 6px 6px;"></button>')
            .append(this.numStyleElem = $('<span></span>'))
            .append(" ")
            .append('<span class="glyphicon glyphicon-sunglasses"></span>')
            .appendTo(this.notesElem);

        this.element.append(" ");

        this.compileButtonText = "Compile";
        this.compileButton = $('<button class="btn btn-warning-muted"><span class="glyphicon glyphicon-wrench"></span> Compile</button>')
            .click(() => {
                this.compileButtonText = "Compiling";
                this.compileButton.html('<span class = "glyphicon glyphicon-refresh spin"></span> ' + this.compileButtonText);

                // check offsetHeight to force a redraw operation
                // then wrap fullCompile in a timeout which happens after redraw
                // var redraw = this.compileButton.offsetHeight;
                // this.compileButton.offsetHeight = redraw;
                // ^^^TODO apparently the above isn't necessary?
                window.setTimeout(() => {
                    this.projectEditor.recompile();
                },1);
            })
            /*.hover(
                function(){
                    oldStatus = this.compileButton.html();
                    this.compileButton.css("width", this.compileButton.width() + "px");
                    this.compileButton.html("Recompile?");
                },
                function(){
                    this.compileButton.html(oldStatus);
                    this.compileButton.css("width", "auto");
                }
            )*/;


        this.element.append(this.compileButton);



        addListener(projectEditor, this);

    }

    @messageResponse("compilationFinished")
    private onCompilationFinished() {
        this.notesElem.show();
        this.numErrorsElem.html("" + this.projectEditor.program.notes.numNotes(NoteKind.ERROR));
        this.numWarningsElem.html("" + this.projectEditor.program.notes.numNotes(NoteKind.WARNING));
        this.numStyleElem.html("" + this.projectEditor.program.notes.numNotes(NoteKind.STYLE));
        
        this.compileButton.removeClass("btn-warning-muted");
        this.compileButton.addClass("btn-success-muted");
        this.compileButton.html('<span class="glyphicon glyphicon-ok"></span> Compiled');
    }

    @messageResponse("compilationOutOfDate")
    private compilationOutOfDate() {
        this.compileButton.removeClass("btn-success-muted");
        this.compileButton.addClass("btn-warning-muted");
        this.compileButton.html('<span class="glyphicon glyphicon-wrench"></span> Compile');
    }
}

class SourceReferenceOutlet {
    
    public observable = new Observable(this);

    private readonly element: JQuery;
    private readonly sourceRef: SourceReference;

    public constructor(element: JQuery, sourceRef: SourceReference) {
        this.element = element;
        this.sourceRef = sourceRef;
        var link = $('<a><code>' + sourceRef.sourceFile.name + ':' + sourceRef.line + '</code></a>');

        link.click(() => {
            this.observable.send("gotoSourceReference", sourceRef);
        });

        element.append(link);
    }
}


const IDLE_MS_BEFORE_UPDATE = 500;
const CODEMIRROR_MODE = "text/x-c++src";
// const FILE_EDITOR_DEFAULT_SOURCE : SourceFile = {
//     name: 
//     text: "int main(){\n  \n}",
// }

export class FileEditor {

    private static instances: FileEditor[] = [];
    
    public observable: Observable = new Observable(this);

    public readonly file: SourceFile;
    public readonly doc: CodeMirror.Doc;

    // private readonly annotations: Annotation[] = [];
    private readonly gutterErrors: {elem: JQuery, num: number}[] = [];
    private syntaxErrorLineHandle?: CodeMirror.LineHandle;

     /**
     *
     * @param {SourceFile} sourceFile The initial contents of this editor.
     */
    public constructor(file: SourceFile) {
        this.file = file;
        this.doc = CodeMirror.Doc(file.text, CODEMIRROR_MODE);

        CodeMirror.on(this.doc, "change", () => { this.onEdit(); });

        FileEditor.instances.push(this);
    }

    // public setFile() {

    // }
    // loadCode : function(program){
    //     this.i_programName = program.name;
    //     var code = program.code;
    //     this.i_doc.setValue(code);
    //     this.setSource(code);
    //     this.send("userAction", UserActions.LoadCode.instance(code));
    // },

    private onEdit() {
        (<Mutable<this>>this).file = new SourceFile(this.file.name, this.doc.getValue());

        // Newer versions of CodeMirror have inconsistent syntax coloring for the * operator
        // when used as part of a declarator vs. other operators like &, [], and (). So here
        // we manually fix the * spans.
        $(".cm-type").filter(function() {
            return $(this).html().trim() === "*"
        }).removeClass("cm-type").addClass("cm-operator");

        this.observable.send("textChanged", this.file);



        // if(this.i_onEditTimeout){
        //     clearTimeout(this.i_onEditTimeout);
        // }
        // var self = this;
        // this.i_onEditTimeout = setTimeout(function(){
        //     self.i_sourceFile.setText(self.getText());
        // }, IDLE_MS_BEFORE_UPDATE);
    }

    public addMark(sourceRef: SourceReference, cssClass: string){
        var from = this.doc.posFromIndex(sourceRef.start);
        var to = this.doc.posFromIndex(sourceRef.end);
        return this.doc.markText(from, to, {startStyle: "begin", endStyle: "end", className: "codeMark " + cssClass});
    }

    public clearMarks() {
        this.doc.getAllMarks().forEach(mark => mark.clear());
    }

    public addGutterError(line: number, text: string) {
        --line;
        let marker = this.gutterErrors[line];
        if (!marker){
            marker = this.gutterErrors[line] = {
                elem:$('<div class="gutterError">!<div></div></div>'),
                num: 0
            };
        }
        let elem = $('<div class="errorNote">- '+text+'</div>');
        marker.elem.children("div").append(elem);
        ++marker.num;
        let ed = this.doc.getEditor();
        if (marker.num === 1 && ed) {
            ed.setGutterMarker(line, "errors", marker.elem[0]);
        }
        return elem;
    }

    public removeGutterError(line: number) {
        --line;
        let marker = this.gutterErrors[line];
        if (marker) {
            let ed = this.doc.getEditor();
            if (marker.num === 1 && ed){
                ed.setGutterMarker(line, "errors",null);
            }
        }
    }

    public clearGutterErrors() {
        let ed = this.doc.getEditor();
        if (ed) {
            ed.clearGutter("errors");
        }
        this.gutterErrors.length = 0;
    }

    public addWidget(sourceRef: SourceReference, elem: JQuery) {
        let from = this.doc.posFromIndex(sourceRef.start);
        let ed = this.doc.getEditor();
        if (ed) {
            ed.addWidget(from, elem[0], false);
        }
    }

    public clearSyntaxError() {
        if (this.syntaxErrorLineHandle) {
            let ed = this.doc.getEditor();
            if (ed) {
                ed.removeLineClass(this.syntaxErrorLineHandle, "background", "syntaxError");
            }
        }
    }

    public setSyntaxError(line: number) {
        this.clearSyntaxError();
        let ed = this.doc.getEditor();
        if (ed) {
            this.syntaxErrorLineHandle = ed.addLineClass(line-1, "background", "syntaxError");
        }
    }

    // public addAnnotation(ann: Annotation) {
    //     ann.onAdd(this);
    //     this.annotations.push(ann);
    // }

    // public clearAnnotations() {
    //     for(var i = 0; i < this.annotations.length; ++i){
    //         this.annotations[i].onRemove(this);
    //     }
    //     this.annotations.length = 0;
    // }

    public gotoSourceReference(sourceRef: SourceReference) {
        console.log("got the message " + sourceRef.sourceFile.name + ":" + sourceRef.line);
        // this.send("requestFocus", function() {});
        this.doc.setCursor(sourceRef.line, sourceRef.column, {scroll:true});
        // self.doc.scrollIntoView(, 10);
        // });
    }

}