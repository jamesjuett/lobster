"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Exercise = exports.COMPLETION_ALL_CHECKPOINTS = exports.COMPLETION_LAST_CHECKPOINT = exports.Project = void 0;
const observe_1 = require("../util/observe");
const util_1 = require("../util/util");
const Program_1 = require("./Program");
class Project {
    constructor(name, id, files, exercise, extras = []) {
        this.observable = new observe_1.Observable(this);
        this.sourceFiles = [];
        this.translationUnitNames = new Set();
        this.isCompilationOutOfDate = true;
        this.name = name;
        this.id = id;
        this.exercise = exercise === null || exercise === void 0 ? void 0 : exercise.setProject(this);
        this.extras = extras;
        files.forEach(f => this.addFile(new Program_1.SourceFile(f.name, f.code), f.isTranslationUnit));
        this.program = new Program_1.Program([], new Set()); // will get replaced immediately
        this.recompile();
    }
    setName(name) {
        this.name = name;
        this.observable.send("nameSet");
    }
    getFileData() {
        return this.sourceFiles.map(sf => ({
            name: sf.name,
            code: sf.text,
            isTranslationUnit: this.translationUnitNames.has(sf.name)
        }));
    }
    addFile(file, isTranslationUnit) {
        let i = this.sourceFiles.findIndex(sf => sf.name === file.name);
        util_1.assert(i === -1, "Attempt to add duplicate file.");
        // Add file
        util_1.asMutable(this.sourceFiles).push(file);
        // Add a translation unit if appropriate
        if (isTranslationUnit) {
            this.translationUnitNames.add(file.name);
        }
        this.observable.send("fileAdded", file);
        this.compilationOutOfDate();
    }
    removeFile(filename) {
        let i = this.sourceFiles.findIndex(f => f.name === filename);
        util_1.assert(i !== -1, "Attempt to remove nonexistent file from project.");
        // Remove file
        let [removed] = util_1.asMutable(this.sourceFiles).splice(i, 1);
        // clear out previous record of whether it was a translation unit
        this.translationUnitNames.delete(filename);
        this.observable.send("fileRemoved", removed);
    }
    setFileContents(file) {
        let i = this.sourceFiles.findIndex(sf => sf.name === file.name);
        util_1.assert(i !== -1, "Cannot update contents for a file that is not part of this project.");
        // Update file contents
        util_1.asMutable(this.sourceFiles)[i] = file;
        this.observable.send("fileContentsSet", file);
        this.compilationOutOfDate();
    }
    setTranslationUnit(name, isTranslationUnit) {
        let i = this.sourceFiles.findIndex(sf => sf.name === name);
        util_1.assert(i !== -1, "Cannot update translation unit status for a file that is not part of this project.");
        // Update translation unit status
        if (isTranslationUnit) {
            this.translationUnitNames.add(name);
        }
        else {
            this.translationUnitNames.delete(name);
        }
        this.observable.send("translationUnitStatusSet", name);
        this.compilationOutOfDate();
    }
    recompile() {
        try {
            this.program = new Program_1.Program(this.sourceFiles, this.translationUnitNames);
        }
        catch (e) {
            console.log("Unexpected Lobster crash during compilation. :(");
            console.log(e);
            this.sourceFiles.forEach(sf => {
                console.log(sf.name);
                console.log(sf.text);
            });
        }
        this.extras.forEach(extra => extra(this.program));
        this.observable.send("compilationFinished", this.program);
        this.exercise.update();
    }
    isTranslationUnit(name) {
        return this.translationUnitNames.has(name);
    }
    /**
     * Toggles whether a source file in this project is being used as a translation unit
     * and should be compiled as part of the program. The name given for the translation
     * unit to be toggled must match the name of one of this project's source files.
     * @param tuName
     */
    toggleTranslationUnit(tuName) {
        // If it's a valid source file, its name will be a key in the map
        util_1.assert(this.sourceFiles.map(sf => sf.name).indexOf(tuName) !== -1, `No source file found for translation unit: ${tuName}`);
        if (this.translationUnitNames.has(tuName)) {
            this.translationUnitNames.delete(tuName);
            this.observable.send("translationUnitRemoved", tuName);
        }
        else {
            this.translationUnitNames.add(tuName);
            this.observable.send("translationUnitAdded", tuName);
        }
        this.compilationOutOfDate();
    }
    compilationOutOfDate() {
        this.isCompilationOutOfDate = true;
        this.observable.send("compilationOutOfDate");
        if (this.autoCompileDelay !== undefined) {
            this.dispatchAutoCompile();
        }
    }
    dispatchAutoCompile() {
        util_1.assert(this.autoCompileDelay !== undefined);
        // Clear old recompile timeout if one was pending
        if (this.pendingAutoCompileTimeout) {
            clearTimeout(this.pendingAutoCompileTimeout);
            this.pendingAutoCompileTimeout = undefined;
        }
        // Start new autocomplete timeout
        this.pendingAutoCompileTimeout = window.setTimeout(() => {
            this.recompile();
            // no longer a pending timeout once this one finishes
            this.pendingAutoCompileTimeout = undefined;
        }, this.autoCompileDelay);
    }
    /**
     * Turns on auto-compilation. Any changes to the project source will
     * trigger a recompile, which begins after no subsequent changes have
     * been made within the specified delay.
     * @param autoCompileDelay
     */
    turnOnAutoCompile(autoCompileDelay = 500) {
        this.autoCompileDelay = autoCompileDelay;
        if (this.isCompilationOutOfDate) {
            this.dispatchAutoCompile();
        }
        return this;
    }
    turnOffAutoCompile() {
        this.autoCompileDelay = undefined;
        return this;
    }
    addNote(note) {
        this.program.addNote(note);
        this.observable.send("noteAdded", note);
    }
    requestSave() {
        this.observable.send("saveRequested");
    }
}
exports.Project = Project;
const COMPLETION_LAST_CHECKPOINT = (ex) => ex.checkpointCompletions[ex.checkpoints.length - 1];
exports.COMPLETION_LAST_CHECKPOINT = COMPLETION_LAST_CHECKPOINT;
const COMPLETION_ALL_CHECKPOINTS = (ex) => ex.checkpointCompletions.every(status => status);
exports.COMPLETION_ALL_CHECKPOINTS = COMPLETION_ALL_CHECKPOINTS;
class Exercise {
    constructor(spec) {
        this.observable = new observe_1.Observable(this);
        this.checkpoints = spec.checkpoints;
        this.checkpointEvaluationsFinished = this.checkpoints.map(c => false);
        this.checkpointCompletions = this.checkpoints.map(c => false);
        this.completionCriteria = spec.completionCriteria;
        this.completionMessage = spec.completionMessage;
    }
    setProject(project) {
        util_1.assert(!this.project);
        this.project = project;
        return this;
    }
    changeSpecification(spec) {
        util_1.asMutable(this).checkpoints = spec.checkpoints;
        util_1.asMutable(this).checkpointEvaluationsFinished = this.checkpoints.map(c => false);
        util_1.asMutable(this).checkpointCompletions = this.checkpoints.map(c => false);
        this.completionCriteria = spec.completionCriteria;
        util_1.asMutable(this).completionMessage = spec.completionMessage;
        this.observable.send("exerciseChanged", this);
        this.update();
    }
    update() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.evaluateCheckpoints();
        });
    }
    evaluateCheckpoints() {
        return __awaiter(this, void 0, void 0, function* () {
            util_1.assert(this.project);
            util_1.asMutable(this).checkpointEvaluationsFinished = this.checkpoints.map(c => false);
            this.observable.send("allCheckpointEvaluationStarted", this);
            this.checkpointCompletions = yield Promise.all(this.checkpoints.map((checkpoint, i) => __awaiter(this, void 0, void 0, function* () {
                try {
                    let result = yield checkpoint.evaluate(this.project);
                    util_1.asMutable(this.checkpointEvaluationsFinished)[i] = true;
                    util_1.asMutable(this.checkpointCompletions)[i] = result;
                    this.observable.send("checkpointEvaluationFinished", this);
                    return result;
                }
                catch (_a) {
                    return false; // TODO: this results in a false when interrupted - maybe I should let the interruption propagate?
                }
            })));
            this.observable.send("allCheckpointEvaluationFinished", this);
        });
    }
    get isComplete() {
        return this.completionCriteria(this);
    }
}
exports.Exercise = Exercise;
//# sourceMappingURL=Project.js.map