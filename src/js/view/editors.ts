import { Program, SourceFile, SourceReference } from "../core/Program";
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/mode/xml/xml.js';
import 'codemirror/addon/display/fullscreen.js';
import '../../styles/components/_codemirror.css';
import { assert, Mutable, asMutable } from "../util/util";
import { Observable, messageResponse, Message, addListener, MessageResponses } from "../util/observe";
import { Note, SyntaxNote } from "../core/errors";

const API_URL_LOAD_PROJECT = "/api/me/project/get/";
const API_URL_SAVE_PROJECT = "/api/me/project/save/";

/**
 * This class manages all of the source files associated with a project and the editors
 * for those files. It is also owns the Program object and controls its compilation. It
 * also internally routes annotations (e.g. for compilation errors) to the appropriate
 * editor based on the source reference of the annotation.
 */
export class ProjectEditor {

    public observable: Observable;
    public _act: MessageResponses;

    private static instances: ProjectEditor[] = [];

    public static onBeforeUnload() {
        let unsaved = this.instances.find(inst => inst.isOpen && !inst.isSaved);
        return "The project \"" + unsaved.projectName + "\" has unsaved changes.";
    }

    public readonly projectName?: string;
    public readonly sourceFiles: readonly SourceFile[] = [];
    public readonly isTranslationUnit: {[index: string]: boolean} = [];
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

    private recompile() {
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

    public observable = new Observable(this);
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

    @messageResponse("reset")
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

var NoteCSSClasses = {};
NoteCSSClasses[Note.TYPE_ERROR] = "lobster-note-error";
NoteCSSClasses[Note.TYPE_WARNING] = "lobster-note-warning";
NoteCSSClasses[Note.TYPE_STYLE] = "lobster-note-style";
NoteCSSClasses[Note.TYPE_OTHER] = "lobster-note-other";

var NoteDescriptions= {};
NoteDescriptions[Note.TYPE_ERROR] = "Error";
NoteDescriptions[Note.TYPE_WARNING] = "Warning";
NoteDescriptions[Note.TYPE_STYLE] = "Style";
NoteDescriptions[Note.TYPE_OTHER] = "Info";

/**
 * Allows a user to view and manage the compilation scheme for a program.
 */
var CompilationNotesOutlet = Class.extend(Observer, {
    _name: "CompilationNotesOutlet",

    init: function (element, program) {
        this.i_element = element;
        this.i_program = program;

        this.listenTo(program);

    },

    i_updateNotes : function() {
        this.i_element.empty();

        var self = this;
        this.i_program.getNotes().forEach(function(note) {

            var item = $('<li></li>');
            item.append(self.i_createBadgeForNote(note)).append(" ");

            var ref = note.getSourceReference();
            if (ref){
                var sourceReferenceElem = $('<span class="lobster-source-reference"></span>');
                SourceReferenceOutlet.instance(sourceReferenceElem, ref, self.i_program);
                item.append(sourceReferenceElem).append(" ");
            }

            item.append(note.getMessage());

            self.i_element.append(item);
        });
    },

    i_createBadgeForNote : function(note) {
        var elem = $('<span class="label"></span>');

        // hacky special case
        if (isA(note, SyntaxNote)) {
            elem.html("Syntax Error");
        }
        else {
            elem.html(NoteDescriptions[note.getType()]);
        }

        elem.addClass(NoteCSSClasses[note.getType()]);

        return elem;
    },

    _act : {
        reset : "i_updateNotes",
        fullCompilationFinished : "i_updateNotes"
    }
});

var CompilationStatusOutlet = Class.extend(Observer, {
    _name: "CompilationStatusOutlet",

    init: function (element, program) {
        this.i_element = element;
        this.i_program = program;


        this.i_notesElem = $('<span></span>').appendTo(this.i_element).hide();
        this.i_errorsButton = $('<button class="btn btn-danger-muted" style="padding: 6px 6px;"></button>')
            .append(this.i_numErrorsElem = $('<span></span>'))
            .append(" ")
            .append('<span class="glyphicon glyphicon-remove"></span>')
            .appendTo(this.i_notesElem);
        this.i_notesElem.append(" ");
        this.i_warningsButton = $('<button class="btn btn-warning-muted" style="padding: 6px 6px;"></button>')
            .append(this.i_numWarningsElem = $('<span></span>'))
            .append(" ")
            .append('<span class="glyphicon glyphicon-alert"></span>')
            .appendTo(this.i_notesElem);
        this.i_notesElem.append(" ");
        this.i_styleButton = $('<button class="btn btn-style-muted" style="padding: 6px 6px;"></button>')
            .append(this.i_numStyleElem = $('<span></span>'))
            .append(" ")
            .append('<span class="glyphicon glyphicon-sunglasses"></span>')
            .appendTo(this.i_notesElem);

        this.i_element.append(" ");

        var self = this;
        this.i_compileButtonText = "Compile";
        this.i_compileButton = $('<button class="btn btn-warning-muted"><span class="glyphicon glyphicon-wrench"></span> Compile</button>')
            .click(function() {
                self.i_compileButtonText = "Compiling";
                self.i_compileButton.html('<span class = "glyphicon glyphicon-refresh spin"></span> ' + self.i_compileButtonText);

                // check offsetHeight to force a redraw operation
                // then wrap fullCompile in a timeout which goes on stack after redraw
                // var redraw = self.i_compileButton.offsetHeight;
                // self.i_compileButton.offsetHeight = redraw;
                window.setTimeout(function() {
                    self.i_program.fullCompile();
                },1);
            })
            /*.hover(
                function(){
                    oldStatus = self.i_compileButton.html();
                    self.i_compileButton.css("width", self.i_compileButton.width() + "px");
                    self.i_compileButton.html("Recompile?");
                },
                function(){
                    self.i_compileButton.html(oldStatus);
                    self.i_compileButton.css("width", "auto");
                }
            )*/;


        this.i_element.append(this.i_compileButton);



        this.listenTo(program);

    },

    _act : {
        reset : function () {

        },
        projectLoaded : function() {

        },
        fullCompilationFinished : function() {
            this.i_notesElem.show();
            this.i_numErrorsElem.html(this.i_program.getNotes().filter(function(note) {
                    return note.getType() === Note.TYPE_ERROR;
                }
            ).length);
            this.i_numWarningsElem.html(this.i_program.getNotes().filter(function(note) {
                    return note.getType() === Note.TYPE_WARNING;
                }
            ).length);
            this.i_numStyleElem.html(this.i_program.getNotes().filter(function(note) {
                    return note.getType() === Note.TYPE_STYLE;
                }
            ).length);
        },
        isCompilationUpToDate : function (msg) {
            if (msg.data) {
                this.i_compileButton.removeClass("btn-warning-muted");
                this.i_compileButton.addClass("btn-success-muted");
                this.i_compileButton.html('<span class="glyphicon glyphicon-ok"></span> Compiled');
            }
            else {
                this.i_compileButton.removeClass("btn-success-muted");
                this.i_compileButton.addClass("btn-warning-muted");
                this.i_compileButton.html('<span class="glyphicon glyphicon-wrench"></span> Compile');
            }
        }
    }
});

var SourceReferenceOutlet = Class.extend({
    _name : "SourceReferenceOutlet",

    /**
     *
     * @param element
     * @param {SourceReference} sourceReference
     */
    init : function (element, sourceReference) {
        this.i_element = element;
        var link = $('<a><code>' + sourceReference.sourceFile.getName() + ':' + sourceReference.line + '</code></a>');

        link.click(function() {
            sourceReference.sourceFile.send("gotoSourceReference", sourceReference, this);
        });

        element.append(link);
    }
});


var IDLE_MS_BEFORE_UPDATE = 500;

var FileEditor = Lobster.Outlets.CPP.FileEditor = Class.extend(Observable, Observer, {
    _name: "FileEditor",
    CODE_MIRROR_MODE : "text/x-c++src",
    DEFAULT_CONFIG : {
        initCode: "int main(){\n  \n}"
    },
    s_instances : [],
    /**
     *
     * @param {String} fileName The name of the file.
     * @param {SourceFile} sourceFile The source file to be edited by this editor.
     * @param config
     */
    init: function(fileName, sourceFile, config) {
        this.i_fileName = fileName;
        this.i_sourceFile = sourceFile;
        this.i_doc =  CodeMirror.Doc(sourceFile.getText(), this.CODE_MIRROR_MODE);

        this.i_config = makeDefaulted(config, Outlets.CPP.FileEditor.DEFAULT_CONFIG);
        this.initParent();

        this.i_annotations = [];
        this.i_gutterErrors = [];


        // TODO NEW is this still being used?
        var self = this;
        this.i_doc.on("change", function(e){
            self.i_onEdit();
        });

        this.listenTo(sourceFile);


        //this.loadCode({name: "program.cpp", code: this.i_config.initCode});
        FileEditor.s_instances.push(this);
    },

    getDoc : function() {
        return this.i_doc;
    },

    getText : function() {
        return this.i_doc.getValue();
    },

    getFileName : function() {
        return this.i_fileName;
    },

    // loadCode : function(program){
    //     this.i_programName = program.name;
    //     var code = program.code;
    //     this.i_doc.setValue(code);
    //     this.setSource(code);
    //     this.send("userAction", UserActions.LoadCode.instance(code));
    // },

    i_onEdit : function() {
        var newText = this.getText();


        // TODO omg what a hack
        //Use for building parser :p
        // console.log(peg.generate(newText,{
        //    cache: true,
        //    allowedStartRules: ["start", "function_body", "declaration", "declarator", "member_declaration", "argument_declaration_list"],
        //    output: "source"
        // }));
        // return;

        if(this.i_onEditTimeout){
            clearTimeout(this.i_onEditTimeout);
        }
        var self = this;
        this.i_onEditTimeout = setTimeout(function(){
            self.i_sourceFile.setText(self.getText());
        }, IDLE_MS_BEFORE_UPDATE);
    },

    addMark : function(sourceReference, cssClass){
        var doc = this.i_doc;
        var from = doc.posFromIndex(sourceReference.start);
        var to = doc.posFromIndex(sourceReference.end);
        return doc.markText(from, to, {startStyle: "begin", endStyle: "end", className: "codeMark " + cssClass});
    },

    addGutterError : function(line, text){
        --line;
        var marker = this.i_gutterErrors[line];
        if (!marker){
            marker = this.i_gutterErrors[line] = {
                elem:$('<div class="gutterError">!<div></div></div>'),
                num: 0
            };
        }
        var elem = $('<div class="errorNote">'+text+'</div>');
        marker.elem.children("div").append(elem);
        ++marker.num;
        if (marker.num === 1){
            this.i_doc.setGutterMarker(line, "errors", marker.elem[0]);
        }
        return elem;
    },

    removeGutterError : function(line){
        --line;
        var marker = this.i_gutterErrors[line];
        if (marker){
            --marker.num;
            if (marker.num == 0){
                this.i_doc.setGutterMarker(line, "errors",null);
            }
        }
    },


    addWidget : function(sourceReference, elem){
        var from = this.i_doc.posFromIndex(sourceReference.start);

        this.i_doc.addWidget(from, elem[0], false);
    },

    addAnnotation : function(ann) {

        ann.onAdd(this);
        this.i_annotations.push(ann);
    },

    clearAnnotations : function(){
        for(var i = 0; i < this.i_annotations.length; ++i){
            this.i_annotations[i].onRemove(this);
        }

        this.i_annotations.length = 0;
    },

    _act : {
        gotoSourceReference : function(msg) {
            var ref = msg.data;
            console.log("got the message " + ref.sourceFile.getName() + ":" + ref.line);
            var self = this;
            this.send("requestFocus", function() {});
            this.i_doc.setCursor({line: ref.line, ch: ref.column}, {scroll:true});
            // self.i_doc.scrollIntoView(, 10);
            // });
        }
    }

});