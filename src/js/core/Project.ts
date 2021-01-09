import { Checkpoint } from "../analysis/checkpoints";
import { Observable } from "../util/observe";
import { Mutable, assert, asMutable } from "../util/util";
import { Note } from "./errors";
import { SourceFile, Program } from "./Program";

export interface FileData {
    readonly name: string;
    readonly code: string;
    readonly isTranslationUnit: boolean;
}

type ProjectMessages =
    "nameSet" |
    "compilationOutOfDate" |
    "compilationFinished" |
    "fileAdded" |
    "fileRemoved" |
    "fileContentsSet" |
    "translationUnitAdded" |
    "translationUnitRemoved" |
    "translationUnitStatusSet" |
    "checkpointEvaluationStarted" |
    "checkpointEvaluationFinished" |
    "noteAdded";

export type ProjectExtras = {
    checkpoints?: readonly Checkpoint[]
}

export class Project {

    public observable = new Observable<ProjectMessages>(this);

    public readonly name: string;
    public readonly id?: number;

    public readonly sourceFiles: readonly SourceFile[] = [];
    private translationUnitNames: Set<string> = new Set<string>();

    public readonly checkpoints: readonly Checkpoint[];
    public readonly checkpointStatuses: readonly boolean[];

    public readonly program!: Program; // ! set by call to this.recompile() in ctor
    
    public readonly isCompilationOutOfDate: boolean = true;

    private pendingAutoCompileTimeout?: number;
    private autoCompileDelay?: number;

    public constructor(name: string, id: number | undefined, files: readonly FileData[], extras?: ProjectExtras) {
        this.name = name;
        this.id = id;

        this.checkpoints = extras?.checkpoints ?? [];
        this.checkpointStatuses = extras?.checkpoints?.map(c => false) ?? [];

        files.forEach(f => this.addFile(new SourceFile(f.name, f.code), f.isTranslationUnit));

        this.recompile();
    }
    
    public setName(name: string) {
        (<Mutable<this>>this).name = name;
        this.observable.send("nameSet");
    }

    public getFileData() : readonly FileData[] {
        return this.sourceFiles.map(sf => ({
            name: sf.name,
            code: sf.text,
            isTranslationUnit: this.translationUnitNames.has(sf.name)
        }));
    }

    public addFile(file: SourceFile, isTranslationUnit: boolean) {

        let i = this.sourceFiles.findIndex(sf => sf.name === file.name);
        assert(i === -1, "Attempt to add duplicate file.");

        // Add file
        asMutable(this.sourceFiles).push(file);

        // Add a translation unit if appropriate
        if (isTranslationUnit) {
            this.translationUnitNames.add(file.name);
        }

        this.observable.send("fileAdded", file);

        this.compilationOutOfDate();
    }

    public removeFile(filename: string) {
        let i = this.sourceFiles.findIndex(f => f.name === filename);
        assert(i !== -1, "Attempt to remove nonexistent file from project.");

        // Remove file
        let [removed] = asMutable(this.sourceFiles).splice(i,1);

        // clear out previous record of whether it was a translation unit
        this.translationUnitNames.delete(filename);

        this.observable.send("fileRemoved", removed);

    }

    public setFileContents(file: SourceFile) {
        
        let i = this.sourceFiles.findIndex(sf => sf.name === file.name);
        assert(i !== -1, "Cannot update contents for a file that is not part of this project.");

        // Update file contents
        asMutable(this.sourceFiles)[i] = file;

        this.observable.send("fileContentsSet", file);

        this.compilationOutOfDate();
    }

    public setTranslationUnit(name: string, isTranslationUnit: boolean) {
        
        let i = this.sourceFiles.findIndex(sf => sf.name === name);
        assert(i !== -1, "Cannot update translation unit status for a file that is not part of this project.");

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

    public recompile() {
        (<Mutable<this>>this).program = new Program(this.sourceFiles, this.translationUnitNames);

        // if (this.name) {
        //     projectAnalyses[this.name] && projectAnalyses[this.name](this.program);
        // }

        this.observable.send("compilationFinished", this.program);

        this.evaluateCheckpoints();
    }

    public async evaluateCheckpoints() {
        this.observable.send("checkpointEvaluationStarted", this);

        (<Mutable<this>>this).checkpointStatuses = await Promise.all(this.checkpoints.map(
            async (checkpoint, i) => {
                try {
                    return await checkpoint.evaluate(this);
                }
                catch {
                    return false; // TODO: this results in a false when interrupted - maybe I should let the interruption propagate?
                }
            }
        ));

        this.observable.send("checkpointEvaluationFinished", this);
    }

    public isTranslationUnit(name: string) {
        return this.translationUnitNames.has(name);
    }

    /**
     * Toggles whether a source file in this project is being used as a translation unit
     * and should be compiled as part of the program. The name given for the translation
     * unit to be toggled must match the name of one of this project's source files.
     * @param tuName
     */
    public toggleTranslationUnit(tuName: string) {
        // If it's a valid source file, its name will be a key in the map
        assert(this.sourceFiles.map(sf => sf.name).indexOf(tuName) !== -1, `No source file found for translation unit: ${tuName}`);

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

    private compilationOutOfDate() {
        (<Mutable<this>>this).isCompilationOutOfDate = true;
        this.observable.send("compilationOutOfDate");
        
        if (this.autoCompileDelay !== undefined) {
            this.dispatchAutoCompile();
        }
    }

    private dispatchAutoCompile() {
        assert(this.autoCompileDelay !== undefined);
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
    public turnOnAutoCompile(autoCompileDelay: number = 500) {
        this.autoCompileDelay = autoCompileDelay;
        if (this.isCompilationOutOfDate) {
            this.dispatchAutoCompile();
        }
        return this;
    }

    public turnOffAutoCompile() {
        this.autoCompileDelay = undefined;
        return this;
    }

    public addNote(note: Note) {
        this.program.addNote(note);
        this.observable.send("noteAdded", note);
    }

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
    //     if (projectData.length > 0) {
    //         this.filesElem.children().first().addClass("active"); // TODO: should the FileEditor be doing this instead?
    //         this.selectFile(projectData[0]["name"]);
    //     }

    //     this.recompile();
    // }
}