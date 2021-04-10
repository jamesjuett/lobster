"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileEditor = exports.CompilationStatusOutlet = exports.CompilationNotesOutlet = exports.CompilationOutlet = exports.ProjectEditor = void 0;
const Program_1 = require("../core/Program");
const codemirror_1 = __importDefault(require("codemirror"));
require("codemirror/lib/codemirror.css");
require("../../css/lobster.css");
require("codemirror/mode/clike/clike.js");
require("codemirror/addon/display/fullscreen.js");
require("codemirror/addon/comment/comment.js");
require("codemirror/keymap/sublime.js");
// import '../../styles/components/_codemirror.css';
const util_1 = require("../util/util");
const observe_1 = require("../util/observe");
const errors_1 = require("../core/errors");
/**
 * This class manages all of the source files associated with a project and the editors
 * for those files. It is also owns the Program object and controls its compilation. It
 * also internally routes annotations (e.g. for compilation errors) to the appropriate
 * editor based on the source reference of the annotation.
 */
class ProjectEditor {
    constructor(element, project) {
        // TODO: transfer to Project class
        // public static onBeforeUnload() {
        //     let unsaved = ProjectEditor.instances.find(inst => inst.isOpen && !inst.isSaved);
        //     if (unsaved) {
        //         return "The project \"" + unsaved.project.name + "\" has unsaved changes.";
        //     }
        // }
        this.isOpen = false;
        this.fileButtonsMap = {};
        this.fileEditorsMap = {};
        let codeMirrorElement = this.codeMirrorElem = element.find(".codeMirrorEditor");
        util_1.assert(codeMirrorElement.length > 0, "ProjectEditor element must contain an element with the 'codeMirrorEditor' class.");
        this.codeMirror = codemirror_1.default(codeMirrorElement[0], {
            mode: CODEMIRROR_MODE,
            theme: "lobster",
            lineNumbers: true,
            tabSize: 2,
            keyMap: "sublime",
            extraKeys: {
                "Ctrl-S": () => {
                    this.project.requestSave();
                },
                "Ctrl-/": (editor) => editor.execCommand('toggleComment')
            },
            gutters: ["CodeMirror-linenumbers", "breakpoints", "errors"]
        });
        this.codeMirror.on("gutterClick", (cm, n) => {
            let info = cm.lineInfo(n);
            cm.setGutterMarker(n, "breakpoints", info.gutterMarkers ? null : $(`<div style="color: #a33">●</div>`)[0]);
        });
        // this.codeMirror.setSize(null, "auto");
        this.filesElem = element.find(".project-files");
        util_1.assert(this.filesElem.length > 0, "CompilationOutlet must contain an element with the 'translation-units-list' class.");
        let addFileButton = $('<a data-toggle="modal" data-target="#lobster-project-add-file-modal"><i class="bi bi-file-earmark-plus"></i></a>');
        let liContainer = $("<li></li>");
        liContainer.append(addFileButton);
        this.filesElem.append(liContainer);
        this.setProject(project);
        ProjectEditor.instances.push(this);
    }
    setProject(project) {
        if (this.project) {
            this.project.sourceFiles.forEach(f => this.onFileRemoved(f));
            observe_1.stopListeningTo(this, project);
        }
        this.project = project;
        observe_1.listenTo(this, project);
        project.sourceFiles.forEach(f => this.onFileAdded(f));
    }
    // private loadProject(projectName: string) {
    //     if (!this.isSaved) {
    //         if (!confirm("WARNING: Your current project has unsaved changes. These will be lost if you load a new project. Are you sure?")) {
    //             return;
    //         };
    //     }
    //     $.ajax({
    //         type: "GET",
    //         url: API_URL_LOAD_PROJECT + projectName,
    //         success: (data) => {
    //             if (!data) {
    //                 alert("Project not found! :(");
    //                 return;
    //             }
    //             this.setProject(projectName, data);
    //         },
    //         dataType: "json"
    //     });
    // }
    // @messageResponse("projectCleared")
    // private projectCleared() {
    //     let _this = <Mutable<this>>this;
    //     _this.projectName = "";
    //     _this.sourceFiles = [];
    //     this.translationUnitNamesMap = {};
    //     this.recompile();
    //     _this.isSaved = true;
    //     _this.isOpen = false;
    //     this.fileTabs = {};
    //     this.filesElem.empty();
    //     this.fileEditors = {};
    // }
    // @messageResponse("projectLoaded")
    // private projectLoaded(project: Project) {
    //     this.clearProject();
    //     let _this = <Mutable<this>>this;
    //     project.sourceFiles.forEach(file => this.createFile(file));
    //     _this.isSaved = true;
    //     _this.isOpen = true;
    //     // document.title = projectName; // TODO: this is too aggressive because there may be multiple project editors. replace in favor of projectLoaded message
    //     // Set first file to be active
    //     this.recompile();
    // }
    onFileContentsSet(file) {
        let fileEd = this.fileEditorsMap[file.name];
        fileEd === null || fileEd === void 0 ? void 0 : fileEd.setContents(file.text);
    }
    onFileAdded(file) {
        // Create a FileEditor object to manage editing the file
        let fileEd = new FileEditor(file);
        this.fileEditorsMap[file.name] = fileEd;
        observe_1.addListener(fileEd, this);
        // Create tab to select this file for viewing/editing
        let item = $('<li></li>');
        let link = $('<a>' + file.name + '</a>');
        link.on("click", () => this.selectFile(file.name));
        item.append(link);
        this.fileButtonsMap[file.name] = item;
        this.filesElem.append(item);
        if (Object.keys(this.fileButtonsMap).length === 1) {
            // The first file added
            item.addClass("active");
            this.selectFile(file.name);
        }
    }
    onFileRemoved(file) {
        let fileEd = this.fileEditorsMap[file.name];
        if (!fileEd) {
            return;
        }
        // remove the li containing the link
        this.fileButtonsMap[file.name].remove();
        delete this.fileButtonsMap[file.name];
        delete this.fileEditorsMap[file.name];
        if (this.currentFileEditor === file.name) {
            this.selectFirstFile();
        }
        observe_1.removeListener(fileEd, this);
    }
    onCompilationFinished() {
        Object.keys(this.fileEditorsMap).forEach((ed) => {
            this.fileEditorsMap[ed].clearMarks();
            this.fileEditorsMap[ed].clearGutterErrors();
        });
        this.project.program.notes.allNotes.forEach(note => {
            let sourceRef = note.primarySourceReference;
            if (sourceRef) {
                let editor = this.fileEditorsMap[sourceRef.sourceFile.name];
                editor === null || editor === void 0 ? void 0 : editor.addMark(sourceRef, note.kind);
                editor === null || editor === void 0 ? void 0 : editor.addGutterError(sourceRef.line, note.message);
            }
        });
        // TODO NEW Return support for widgets elsewhere.
        // Perhaps reimplement as a generic kind of SemanticNote class
        // for(var i = 0; i < this.i_semanticProblems.widgets.length; ++i){
        //     // alert(this.i_semanticProblems.get(i));
        //     this.send("addAnnotation", this.i_semanticProblems.widgets[i]);
        // }
    }
    onNoteAdded(note) {
        let sourceRef = note.primarySourceReference;
        if (sourceRef) {
            let editor = this.fileEditorsMap[sourceRef.sourceFile.name];
            editor === null || editor === void 0 ? void 0 : editor.addMark(sourceRef, note.kind);
            editor === null || editor === void 0 ? void 0 : editor.addGutterError(sourceRef.line, note.message);
        }
    }
    selectFile(filename) {
        util_1.assert(this.fileEditorsMap[filename], `File ${filename} does not exist in this project.`);
        this.codeMirrorElem.show();
        this.codeMirror.swapDoc(this.fileEditorsMap[filename].doc);
        this.currentFileEditor = filename;
        this.filesElem.children().removeClass("active");
        this.fileButtonsMap[filename].addClass("active");
    }
    selectFirstFile() {
        let firstFilename = Object.keys(this.fileEditorsMap)[0];
        this.currentFileEditor = firstFilename;
        if (firstFilename) {
            this.selectFile(firstFilename);
        }
        else {
            this.codeMirrorElem.hide();
        }
    }
    refreshEditorView() {
        this.codeMirror.refresh();
        // scroll cursor (indicated by null) into view with vertical margin of 50 pixels
        this.codeMirror.scrollIntoView(null, 50);
    }
    gotoSourceReference(sourceRef) {
        let name = sourceRef.sourceFile.name;
        let editor = this.fileEditorsMap[name];
        if (editor) {
            this.selectFile(name);
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
    textChanged(updatedFile) {
        this.project.setFileContents(updatedFile);
    }
}
ProjectEditor.instances = [];
__decorate([
    observe_1.messageResponse("fileContentsSet", "unwrap")
], ProjectEditor.prototype, "onFileContentsSet", null);
__decorate([
    observe_1.messageResponse("fileAdded", "unwrap")
], ProjectEditor.prototype, "onFileAdded", null);
__decorate([
    observe_1.messageResponse("fileRemoved")
], ProjectEditor.prototype, "onFileRemoved", null);
__decorate([
    observe_1.messageResponse("compilationFinished")
], ProjectEditor.prototype, "onCompilationFinished", null);
__decorate([
    observe_1.messageResponse("noteAdded", "unwrap")
], ProjectEditor.prototype, "onNoteAdded", null);
__decorate([
    observe_1.messageResponse("textChanged", "unwrap")
], ProjectEditor.prototype, "textChanged", null);
exports.ProjectEditor = ProjectEditor;
// $(window).bind("beforeunload", ProjectEditor.onBeforeUnload);
function createCompilationOutletHTML() {
    return `
    <div>
        <h3>Compilation Units</h3>
        <p>A program may be composed of many different compilation units (a.k.a translation units), one for each source file
            that needs to be compiled into the executable program. Generally, you want a compilation
            unit for each .cpp file, and these are the files you would list out in a compile command.
            The files being used for this purpose are highlighted below. Note that files may be
            indirectly used if they are #included in other compilation units, even if they are not
            selected to form a compilation unit here.
        </p>
        <p style="font-weight: bold;">
            Click files below to toggle whether they are being used to create a compilation unit.
        </p>
        <ul class="translation-units-list list-inline">
        </ul>
    </div>
    <div>
        <h3>Compilation Errors</h3>
        <p>These errors were based on your last compilation.
        </p>
        <ul class="compilation-notes-list">
        </ul>
    </div>`;
}
/**
 * Allows a user to view and manage the compilation scheme for a program.
 */
class CompilationOutlet {
    constructor(element, project) {
        this.element = element;
        element.append(createCompilationOutletHTML());
        this.translationUnitsListElem = element.find(".translation-units-list");
        this.compilationNotesOutlet = new CompilationNotesOutlet(element.find(".compilation-notes-list"));
        this.project = this.setProject(project);
    }
    setProject(project) {
        if (project !== this.project) {
            observe_1.stopListeningTo(this, this.project);
            this.project = project;
            observe_1.listenTo(this, project);
        }
        this.updateButtons();
        this.compilationNotesOutlet.updateNotes(project.program);
        return project;
    }
    updateButtons() {
        this.translationUnitsListElem.empty();
        // Create buttons for each file to toggle whether it's a translation unit or not
        this.project.sourceFiles.forEach(file => {
            let button = $('<button class="btn">' + file.name + '</button>')
                .addClass(this.project.isTranslationUnit(file.name) ? "btn-info" : "text-muted")
                .click(() => this.project.toggleTranslationUnit(file.name));
            this.translationUnitsListElem.append($('<li></li>').append(button));
        });
    }
    onCompilationFinished(program) {
        this.compilationNotesOutlet.updateNotes(program);
    }
}
__decorate([
    observe_1.messageResponse("fileAdded"),
    observe_1.messageResponse("fileRemoved"),
    observe_1.messageResponse("translationUnitAdded"),
    observe_1.messageResponse("translationUnitRemoved"),
    observe_1.messageResponse("translationUnitStatusSet")
], CompilationOutlet.prototype, "updateButtons", null);
__decorate([
    observe_1.messageResponse("compilationFinished", "unwrap")
], CompilationOutlet.prototype, "onCompilationFinished", null);
exports.CompilationOutlet = CompilationOutlet;
const NoteCSSClasses = {
    error: "lobster-note-error",
    warning: "lobster-note-warning",
    style: "lobster-note-style",
    other: "lobster-note-other"
};
const NoteDescriptions = {
    error: "Error",
    warning: "Warning",
    style: "Style",
    other: "Other"
};
/**
 * Shows all of the compilation errors/warnings/etc. for the current project.
 */
class CompilationNotesOutlet {
    constructor(element) {
        this.observable = new observe_1.Observable(this);
        this.element = element;
    }
    updateNotes(program) {
        this.element.empty();
        program.notes.allNotes.forEach(note => {
            let item = $('<li></li>').append(this.createBadgeForNote(note)).append(" ");
            let ref = note.primarySourceReference;
            if (ref) {
                let sourceReferenceElem = $('<span class="lobster-source-reference"></span>');
                new SourceReferenceOutlet(sourceReferenceElem, ref);
                item.append(sourceReferenceElem).append(" ");
            }
            item.append(note.id + ": " + note.message);
            this.element.append(item);
        });
    }
    createBadgeForNote(note) {
        var elem = $('<span class="label"></span>');
        // hacky special case
        if (note instanceof errors_1.SyntaxNote) {
            elem.html("Syntax Error");
        }
        else {
            elem.html(NoteDescriptions[note.kind]);
        }
        elem.addClass(NoteCSSClasses[note.kind]);
        return elem;
    }
    gotoSourceReference(msg) {
        this.observable.send("gotoSourceReference", msg.data);
    }
}
__decorate([
    observe_1.messageResponse("gotoSourceReference")
], CompilationNotesOutlet.prototype, "gotoSourceReference", null);
exports.CompilationNotesOutlet = CompilationNotesOutlet;
class CompilationStatusOutlet {
    constructor(element, project) {
        this.element = element;
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
                this.project.recompile();
            }, 1);
        });
        this.element.append(this.compileButton);
        this.element.append(" ");
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
            .append('<i class="bi bi-lightbulb"></i>')
            .appendTo(this.notesElem);
        this.project = this.setProject(project);
    }
    setProject(project) {
        if (project !== this.project) {
            observe_1.stopListeningTo(this, this.project);
            this.project = project;
            observe_1.listenTo(this, project);
        }
        this.onCompilationFinished();
        return project;
    }
    onCompilationFinished() {
        this.notesElem.show();
        this.numErrorsElem.html("" + this.project.program.notes.numNotes(errors_1.NoteKind.ERROR));
        this.numWarningsElem.html("" + this.project.program.notes.numNotes(errors_1.NoteKind.WARNING));
        this.numStyleElem.html("" + this.project.program.notes.numNotes(errors_1.NoteKind.STYLE));
        this.compileButton.removeClass("btn-warning-muted");
        this.compileButton.addClass("btn-success-muted");
        this.compileButton.html('<span class="glyphicon glyphicon-ok"></span> Compiled');
    }
    onCompilationOutOfDate() {
        this.compileButton.removeClass("btn-success-muted");
        this.compileButton.addClass("btn-warning-muted");
        this.compileButton.html('<span class="glyphicon glyphicon-wrench"></span> Compile');
    }
}
__decorate([
    observe_1.messageResponse("compilationFinished")
], CompilationStatusOutlet.prototype, "onCompilationFinished", null);
__decorate([
    observe_1.messageResponse("compilationOutOfDate")
], CompilationStatusOutlet.prototype, "onCompilationOutOfDate", null);
exports.CompilationStatusOutlet = CompilationStatusOutlet;
class SourceReferenceOutlet {
    constructor(element, sourceRef) {
        this.observable = new observe_1.Observable(this);
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
class FileEditor {
    /**
    *
    * @param {SourceFile} sourceFile The initial contents of this editor.
    */
    constructor(file) {
        this.observable = new observe_1.Observable(this);
        // private readonly annotations: Annotation[] = [];
        this.gutterErrors = [];
        this.ignoreContentsSet = false;
        this.file = file;
        this.doc = codemirror_1.default.Doc(file.text, CODEMIRROR_MODE);
        codemirror_1.default.on(this.doc, "change", () => { this.onEdit(); });
        // FileEditor.instances.push(this);
    }
    setContents(contents) {
        if (!this.ignoreContentsSet) {
            this.doc.setValue(contents);
        }
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
    onEdit() {
        this.file = new Program_1.SourceFile(this.file.name, this.doc.getValue());
        // Newer versions of CodeMirror have inconsistent syntax coloring for the * operator
        // when used as part of a declarator vs. other operators like &, [], and (). So here
        // we manually fix the * spans.
        $(".cm-type").filter(function () {
            return $(this).html().trim() === "*";
        }).removeClass("cm-type").addClass("cm-operator");
        this.ignoreContentsSet = true;
        this.observable.send("textChanged", this.file);
        this.ignoreContentsSet = false;
        // if(this.i_onEditTimeout){
        //     clearTimeout(this.i_onEditTimeout);
        // }
        // var self = this;
        // this.i_onEditTimeout = setTimeout(function(){
        //     self.i_sourceFile.setText(self.getText());
        // }, IDLE_MS_BEFORE_UPDATE);
    }
    addMark(sourceRef, cssClass) {
        let from = { line: sourceRef.line - 1, ch: sourceRef.column - 1 };
        let to = { line: sourceRef.line - 1, ch: sourceRef.column - 1 + sourceRef.end - sourceRef.start };
        // var from = this.doc.posFromIndex(sourceRef.start);
        // var to = this.doc.posFromIndex(sourceRef.end);
        return this.doc.markText(from, to, { startStyle: "begin", endStyle: "end", className: "codeMark " + cssClass });
    }
    clearMarks() {
        this.doc.getAllMarks().forEach(mark => mark.clear());
    }
    addGutterError(line, text) {
        --line;
        let marker = this.gutterErrors[line];
        if (!marker) {
            marker = this.gutterErrors[line] = {
                elem: $('<div class="gutterError">!<div></div></div>'),
                num: 0
            };
        }
        let elem = $('<div class="errorNote">- ' + text + '</div>');
        marker.elem.children("div").append(elem);
        ++marker.num;
        let ed = this.doc.getEditor();
        if (marker.num === 1 && ed) {
            ed.setGutterMarker(line, "errors", marker.elem[0]);
        }
        return elem;
    }
    removeGutterError(line) {
        --line;
        let marker = this.gutterErrors[line];
        if (marker) {
            let ed = this.doc.getEditor();
            if (marker.num === 1 && ed) {
                ed.setGutterMarker(line, "errors", null);
            }
        }
    }
    clearGutterErrors() {
        let ed = this.doc.getEditor();
        if (ed) {
            ed.clearGutter("errors");
        }
        this.gutterErrors.length = 0;
    }
    addWidget(sourceRef, elem) {
        let from = this.doc.posFromIndex(sourceRef.start);
        let ed = this.doc.getEditor();
        if (ed) {
            ed.addWidget(from, elem[0], false);
        }
    }
    clearSyntaxError() {
        if (this.syntaxErrorLineHandle) {
            let ed = this.doc.getEditor();
            if (ed) {
                ed.removeLineClass(this.syntaxErrorLineHandle, "background", "syntaxError");
            }
        }
    }
    setSyntaxError(line) {
        this.clearSyntaxError();
        let ed = this.doc.getEditor();
        if (ed) {
            this.syntaxErrorLineHandle = ed.addLineClass(line - 1, "background", "syntaxError");
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
    gotoSourceReference(sourceRef) {
        console.log("got the message " + sourceRef.sourceFile.name + ":" + sourceRef.line);
        // this.send("requestFocus", function() {});
        this.doc.setCursor(sourceRef.line, sourceRef.column, { scroll: true });
        // self.doc.scrollIntoView(, 10);
        // });
    }
}
exports.FileEditor = FileEditor;
FileEditor.instances = [];
//# sourceMappingURL=editors.js.map