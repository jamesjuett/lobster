import { Program, SourceFile, SourceReference } from "../core/Program";
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/mode/xml/xml.js';
import 'codemirror/addon/display/fullscreen.js';
import '../../styles/components/_codemirror.css';
import { assert, Mutable, asMutable } from "../util/util";
import { Observable, messageResponse, Message, addListener, MessageResponses } from "../util/observe";
import { Note, SyntaxNote, NoteKind } from "../core/errors";

const API_URL_LOAD_PROJECT = "/api/me/project/get/";
const API_URL_SAVE_PROJECT = "/api/me/project/save/";

/**
 * This class manages all of the source files associated with a project and the editors
 * for those files. It is also owns the Program object and controls its compilation. It
 * also internally routes annotations (e.g. for compilation errors) to the appropriate
 * editor based on the source reference of the annotation.
 */
export class ProjectEditor {

    private static instances: ProjectEditor[] = [];

    public observable: Observable = new Observable(this);
    public _act: MessageResponses = {};

    public static onBeforeUnload() {
        let unsaved = this.instances.find(inst => inst.isOpen && !inst.isSaved);
        return "The project \"" + unsaved.projectName + "\" has unsaved changes.";
    }

    public readonly projectName?: string;
    public readonly sourceFiles: readonly SourceFile[] = [];
    public readonly translationUnitNames: readonly string[];
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
            mode: FileEditor.CODE_MIRROR_MODE,
            theme: "monokai",
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

        ProjectEditor.instances.push(this);

        this.program = new Program([], []);
    }

    /**
     * Toggles whether a source file in this project is being used as a translation unit
     * and should be compiled as part of the program. The name given for the translation
     * unit to be toggled must match the name of one of this project's source files.
     * @param tuName 
     */
    public toggleTranslationUnit(tuName: string) {
        assert(!!this.sourceFiles.find(file => file.name === tuName), `No source file found for translation unit: ${tuName}`);
        if (!!this.translationUnitNames.find(name => name === tuName)) {
            
        }
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
            isTranslationUnit: this.isTranslationUnit[file.name] ? "yes" : "no"
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

    private setProject(projectName: string, projectData: readonly any[]) {

        this.clearProject();

        let _this = <Mutable<this>>this;

        _this.isOpen = true;
        _this.isSaved = true;
        _this.projectName = projectName;
        document.title = projectName; // TODO: this is too aggressive. replace in favor of projectLoaded message

        projectData.forEach(fileData => this.createFile(fileData));
        
        // Set first file to be active
        if (projectData.length > 0) {
            this.filesElem.children().first().addClass("active"); // TODO: should the FileEditor be doing this instead?
            this.selectFile(projectData[0]["name"]);
        }

        this.recompile();
        this.observable.send("projectLoaded");
    }

    public recompile() {
        (<Mutable<this>>this).program = new Program(this.sourceFiles, Object.keys(this.isTranslationUnit));

        this.fileEditors.keys().forEach((ed: string) => this.fileEditors[ed].clearAnnotations());
        
        this.program.notes.allNotes.forEach(note => {
            let sourceRef = note.primarySourceReference;
            if (sourceRef) {
                let editor = this.fileEditors[sourceRef.sourceFile.name];
                editor.addAnnotation(GutterAnnotation.instance(
                    sourceRef,
                    note.kind,
                    note.message
                ));
            }
        });

        // TODO NEW Return support for widgets elsewhere.
        // Perhaps reimplement as a generic kind of SemanticNote class
        // for(var i = 0; i < this.i_semanticProblems.widgets.length; ++i){
        //     // alert(this.i_semanticProblems.get(i));
        //     this.send("addAnnotation", this.i_semanticProblems.widgets[i]);
        // }
    }

    private clearSyntaxErrors() {
        Object.keys(this.fileEditors).forEach((ed: string) => {
            ed.clearSyntaxErrors();
        })
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
    private showSyntaxError(sourceRef: SourceReference) {

        // TODO NEW: This actually needs to be selected based on a reverse mapping of line numbers for includes
        // ^^ that TODO may already be fixed?
        let editor = this.fileEditors[sourceRef.sourceFile.name];

        editor.clearSyntaxErrors();

        if (editor.syntaxErrorLineHandle) {
            editor.i_doc.removeLineClass(editor.syntaxErrorLineHandle, "background", "syntaxError");
        }
        editor.syntaxErrorLineHandle = editor.i_doc.addLineClass(sourceRef.line-1, "background", "syntaxError");
        // sourceEditor.clearAnnotations();
    }

    private clearProject() {

        this.fileTabs = {};
        this.filesElem.empty();

        for (let filename in this.fileEditors) {
            this.fileEditors[filename].removeListener(this);
        }
        this.fileEditors = {};
        
        let _this = <Mutable<this>>this;

        _this.sourceFiles = [];
        _this.isTranslationUnit = {};
        _this.isOpen = false;
        _this.isSaved = true;
        _this.projectName = "";

        this.recompile();
        this.observable.send("projectCleared");
    }

    private createFile(fileData: any) {
        let fileName = fileData["name"];

        // Create the file itself
        let sourceFile = new SourceFile(fileName, fileData["code"]);
        asMutable(this.sourceFiles).push(sourceFile);
        addListener(sourceFile, this);

        // Create a FileEditor object to manage editing the file
        let fileEd = FileEditor.instance(fileName, sourceFile);
        this.fileEditors[fileName] = fileEd;
        addListener(fileEd, this);

        // Create tab to select this file for viewing/editing
        let item = $('<li></li>');
        let link = $('<a href="" data-toggle="pill">' + fileData["name"] + '</a>');
        link.on("shown.bs.tab", () => this.selectFile(fileName));
        item.append(link);
        this.fileTabs[fileData["name"]] = link;
        this.filesElem.append(item);

        // Add a translation unit if appropriate
        if (fileData["isTranslationUnit"] === "yes") {
            this.isTranslationUnit[fileName] = true;
        }
    }

    private selectFile(filename: string) {
        assert(this.fileEditors[filename]);
        this.codeMirror.swapDoc(this.fileEditors[filename].getDoc());
    }

    public refreshEditorView() {
        this.codeMirror.refresh();

        // scroll cursor (indicated by null) into view with vertical margin of 50 pixels
        this.codeMirror.scrollIntoView(null, 50);
    }

    @messageResponse()
    private requestFocus(msg: Message) {
        this.observable.send("requestFocus");
        if (msg.source instanceof FileEditor) {
            this.fileTabs[msg.source.getFileName()].tab("show");
        }
    }

    @messageResponse()
    private textChanged() {
        this.setSaved(false);
    }



    // setSource : function(src){
    //     this.i_sourceCode = src;
    // },

}
$(window).bind("beforeunload", ProjectEditor.onBeforeUnload);

class ProjectSaveOutlet {

    public observable = new Observable(this);
    public _act: MessageResponses = {};

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
class CompilationOutlet {

    public _act: MessageResponses = {};
    
    private readonly projectEditor: ProjectEditor;
    private readonly compilationNotesOutlet: CompilationNotesOutlet;

    private readonly element: JQuery;
    private readonly translationUnitsListElem: JQuery;

    public constructor(element: JQuery, projectEditor: ProjectEditor) {
        this.element = element;
        this.projectEditor = projectEditor;

        this.translationUnitsListElem = element.find(".translation-units-list");
        assert(this.translationUnitsListElem.length > 0, "CompilationOutlet must contain an element with the 'translation-units-list' class.");

        this.compilationNotesOutlet = CompilationNotesOutlet.instance(element.find(".compilation-notes-list"), projectEditor);
        assert(this.translationUnitsListElem.length > 0, "CompilationOutlet must contain an element with the 'compilation-notes-list' class.");

        addListener(projectEditor, this);

    }

    @messageResponse("sourceFileAdded")
    @messageResponse("sourceFileRemoved")
    @messageResponse("translationUnitCreated")
    @messageResponse("translationUnitRemoved")
    private updateButtons() {
        this.translationUnitsListElem.empty();

        // Create buttons for each file to toggle whether it's a translation unit or not
        for(let fileName in this.projectEditor.sourceFiles) {

            let button = $('<button class="btn">' + fileName + '</button>')
            .addClass(this.projectEditor.isTranslationUnit[fileName] ? "btn-info" : "text-muted")
            .click(() => this.projectEditor.toggleTranslationUnit());

            this.translationUnitsListElem.append($('<li></li>').append(button));
        }
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
class CompilationNotesOutlet {

    public _act: MessageResponses = {};

    private readonly projectEditor: ProjectEditor;

    private readonly element: JQuery;

    public constructor(element: JQuery, projectEditor: ProjectEditor) {
        this.element = element;
        this.projectEditor = projectEditor;

        addListener(projectEditor, this);

    }

    private updateNotes() {
        this.element.empty();

        this.projectEditor.program.notes.allNotes.forEach(note => {

            let item = $('<li></li>').append(this.createBadgeForNote(note)).append(" ");

            let ref = note.primarySourceReference;
            if (ref) {
                let sourceReferenceElem = $('<span class="lobster-source-reference"></span>');
                new SourceReferenceOutlet(sourceReferenceElem, ref, this.projectEditor.program);
                item.append(sourceReferenceElem).append(" ");
            }

            item.append(note.message);

            this.element.append(item);
        });
    }


    @messageResponse("compilationFinished")
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
}

class CompilationStatusOutlet {

    public _act: MessageResponses = {};

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
    
    private readonly element: JQuery;
    private readonly projectEditor: ProjectEditor;
    private readonly sourceRef: SourceReference;

    public constructor(element: JQuery, projectEditor: ProjectEditor, sourceRef: SourceReference) {
        this.element = element;
        this.projectEditor = projectEditor;
        this.sourceRef = sourceRef;
        var link = $('<a><code>' + sourceRef.sourceFile.name + ':' + sourceRef.line + '</code></a>');

        link.click(() => {
            this.projectEditor.gotoSourceReference(sourceRef);
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

class FileEditor {

    private static instances: FileEditor[] = [];
    
    public observable: Observable = new Observable(this);
    public _act: MessageResponses = {};

    public readonly file: SourceFile;
    
    private readonly doc: CodeMirror.Doc;

    private readonly element: JQuery;

    private readonly annotations: Annotation[] = [];
    private readonly gutterErrors: {elem: JQuery, num: number}[] = [];

     /**
     *
     * @param {SourceFile} sourceFile The initial contents of this editor.
     */
    public constructor(file: SourceFile) {
        this.file = file;
        this.doc = CodeMirror.Doc(file.text, CODEMIRROR_MODE);

        CodeMirror.on(this.doc,"change", () => { this.onEdit(); });

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

    public addGutterError(line: number, text: string) {
        --line;
        let marker = this.gutterErrors[line];
        if (!marker){
            marker = this.gutterErrors[line] = {
                elem:$('<div class="gutterError">!<div></div></div>'),
                num: 0
            };
        }
        let elem = $('<div class="errorNote">'+text+'</div>');
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

    public addWidget(sourceRef: SourceReference, elem: JQuery) {
        let from = this.doc.posFromIndex(sourceRef.start);
        let ed = this.doc.getEditor();
        if (ed) {
            ed.addWidget(from, elem[0], false);
        }
    }

    public addAnnotation(ann: Annotation){
        ann.onAdd(this);
        this.annotations.push(ann);
    }

    public clearAnnotations() {
        for(var i = 0; i < this.annotations.length; ++i){
            this.annotations[i].onRemove(this);
        }
        this.annotations.length = 0;
    }

    public gotoSourceReference(sourceRef: SourceReference) {
        console.log("got the message " + sourceRef.sourceFile.getName() + ":" + sourceRef.line);
        // this.send("requestFocus", function() {});
        this.doc.setCursor(sourceRef.line, sourceRef.column, {scroll:true});
        // self.doc.scrollIntoView(, 10);
        // });
    }
    

});