import { Checkpoint } from '../analysis/checkpoints';
import { StaticAnalysisExtra } from '../analysis/extras';
import { ExerciseSpecification } from '../exercises';
import { listenTo, messageResponse, MessageResponses, Observable } from '../util/observe';
import { Mutable, assert, asMutable } from '../util/util';
import { Note } from './errors';
import { SourceFile, Program } from './Program';

export interface FileData {
  readonly name: string;
  readonly code: string;
  readonly isTranslationUnit: boolean;
}

type ProjectMessages =
  | 'nameSet'
  | 'compilationOutOfDate'
  | 'compilationFinished'
  | 'fileAdded'
  | 'fileRemoved'
  | 'fileContentsSet'
  | 'translationUnitAdded'
  | 'translationUnitRemoved'
  | 'translationUnitStatusSet'
  | 'noteAdded'
  | 'saveRequested';

export class Project {
  public observable = new Observable<ProjectMessages>(this);

  public readonly name: string;
  public readonly id?: number;

  public readonly sourceFiles: readonly SourceFile[] = [];
  private translationUnitNames: Set<string> = new Set<string>();

  public readonly program: Program; // ! set by call to this.recompile() in ctor

  public readonly exercise: Exercise;

  public readonly extras: readonly StaticAnalysisExtra[];

  public readonly isCompilationOutOfDate: boolean = true;

  private pendingAutoCompileTimeout?: number;
  private autoCompileDelay?: number;

  public constructor(
    name: string,
    id: number | undefined,
    files: readonly FileData[],
    exercise: Exercise,
    extras: readonly StaticAnalysisExtra[] = []
  ) {
    this.name = name;
    this.id = id;
    this.exercise = exercise?.setProject(this);
    this.extras = extras;

    files.forEach(f => this.addFile(new SourceFile(f.name, f.code), f.isTranslationUnit));

    this.program = new Program([], new Set<string>()); // will get replaced immediately
    this.recompile();
  }

  public setName(name: string) {
    (<Mutable<this>>this).name = name;
    this.observable.send('nameSet');
  }

  public getFileData(): readonly FileData[] {
    return this.sourceFiles.map(sf => ({
      name: sf.name,
      code: sf.text,
      isTranslationUnit: this.translationUnitNames.has(sf.name),
    }));
  }

  public addFile(file: SourceFile, isTranslationUnit: boolean) {
    let i = this.sourceFiles.findIndex(sf => sf.name === file.name);
    assert(i === -1, 'Attempt to add duplicate file.');

    // Add file
    asMutable(this.sourceFiles).push(file);

    // Add a translation unit if appropriate
    if (isTranslationUnit) {
      this.translationUnitNames.add(file.name);
    }

    this.observable.send('fileAdded', file);

    this.compilationOutOfDate();
  }

  public removeFile(filename: string) {
    let i = this.sourceFiles.findIndex(f => f.name === filename);
    assert(i !== -1, 'Attempt to remove nonexistent file from project.');

    // Remove file
    let [removed] = asMutable(this.sourceFiles).splice(i, 1);

    // clear out previous record of whether it was a translation unit
    this.translationUnitNames.delete(filename);

    this.observable.send('fileRemoved', removed);
  }

  public setFileContents(file: SourceFile) {
    let i = this.sourceFiles.findIndex(sf => sf.name === file.name);
    assert(i !== -1, 'Cannot update contents for a file that is not part of this project.');

    // Update file contents
    asMutable(this.sourceFiles)[i] = file;

    this.observable.send('fileContentsSet', file);

    this.compilationOutOfDate();
  }

  public setTranslationUnit(name: string, isTranslationUnit: boolean) {
    let i = this.sourceFiles.findIndex(sf => sf.name === name);
    assert(
      i !== -1,
      'Cannot update translation unit status for a file that is not part of this project.'
    );

    // Update translation unit status
    if (isTranslationUnit) {
      this.translationUnitNames.add(name);
    } else {
      this.translationUnitNames.delete(name);
    }

    this.observable.send('translationUnitStatusSet', name);

    this.compilationOutOfDate();
  }

  public recompile() {
    try {
      (<Mutable<this>>this).program = new Program(this.sourceFiles, this.translationUnitNames);
    } catch (e) {
      console.log('Unexpected Lobster crash during compilation. :(');
      console.log(e);
      this.sourceFiles.forEach(sf => {
        console.log(sf.name);
        console.log(sf.text);
      });
    }

    this.extras.forEach(extra => extra(this.program));

    this.observable.send('compilationFinished', this.program);

    this.exercise.update();
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
    assert(
      this.sourceFiles.map(sf => sf.name).indexOf(tuName) !== -1,
      `No source file found for translation unit: ${tuName}`
    );

    if (this.translationUnitNames.has(tuName)) {
      this.translationUnitNames.delete(tuName);
      this.observable.send('translationUnitRemoved', tuName);
    } else {
      this.translationUnitNames.add(tuName);
      this.observable.send('translationUnitAdded', tuName);
    }

    this.compilationOutOfDate();
  }

  private compilationOutOfDate() {
    (<Mutable<this>>this).isCompilationOutOfDate = true;
    this.observable.send('compilationOutOfDate');

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
    this.observable.send('noteAdded', note);
  }

  public requestSave() {
    this.observable.send('saveRequested');
  }
}

export type ExerciseMessages =
  | 'allCheckpointEvaluationStarted'
  | 'allCheckpointEvaluationFinished'
  | 'checkpointEvaluationFinished'
  | 'exerciseChanged';

export type ExerciseCompletionPredicate = (ex: Exercise) => boolean;
export const COMPLETION_LAST_CHECKPOINT = (ex: Exercise) =>
  ex.checkpointCompletions[ex.checkpoints.length - 1];
export const COMPLETION_ALL_CHECKPOINTS = (ex: Exercise) =>
  ex.checkpointCompletions.every(status => status);

export class Exercise {
  public readonly project?: Project;

  public readonly checkpoints: readonly Checkpoint[];

  /** Whether or not each checkpoint has finished evaluating */
  public readonly checkpointEvaluationsFinished: readonly boolean[];

  /** Whether or not each checkpoint has passed */
  public readonly checkpointCompletions: readonly boolean[];

  public readonly completionMessage: string;

  private completionCriteria: ExerciseCompletionPredicate;

  public _act!: MessageResponses;
  public observable = new Observable<ExerciseMessages>(this);

  public constructor(spec: ExerciseSpecification) {
    this.checkpoints = spec.checkpoints;
    this.checkpointEvaluationsFinished = this.checkpoints.map(c => false);
    this.checkpointCompletions = this.checkpoints.map(c => false);
    this.completionCriteria = spec.completionCriteria;
    this.completionMessage = spec.completionMessage;
  }

  public setProject(project: Project) {
    assert(!this.project);
    (<Mutable<this>>this).project = project;
    return this;
  }

  public changeSpecification(spec: ExerciseSpecification) {
    asMutable(this).checkpoints = spec.checkpoints;
    asMutable(this).checkpointEvaluationsFinished = this.checkpoints.map(c => false);
    asMutable(this).checkpointCompletions = this.checkpoints.map(c => false);
    this.completionCriteria = spec.completionCriteria;
    asMutable(this).completionMessage = spec.completionMessage;
    this.observable.send('exerciseChanged', this);
    this.update();
  }

  public async update() {
    await this.evaluateCheckpoints();
  }

  private async evaluateCheckpoints() {
    assert(this.project);

    asMutable(this).checkpointEvaluationsFinished = this.checkpoints.map(c => false);
    asMutable(this).checkpointCompletions = this.checkpoints.map(c => false);
    this.observable.send('allCheckpointEvaluationStarted', this);

    await Promise.all(
      this.checkpoints.map(async (checkpoint, i) => {
        try {
          let result = await checkpoint.evaluate(this.project!);
          asMutable(this.checkpointEvaluationsFinished)[i] = true;
          asMutable(this.checkpointCompletions)[i] = result;
          this.observable.send('checkpointEvaluationFinished', this);
          return result;
        } catch {
          return false; // TODO: this results in a false when interrupted - maybe I should let the interruption propagate?
        }
      })
    );

    this.observable.send('allCheckpointEvaluationFinished', this);
  }

  public get isComplete() {
    return this.completionCriteria(this);
  }
}
