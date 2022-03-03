import { Checkpoint } from '../analysis/checkpoints';
import { Exercise, Project } from '../core/Project';
import { MessageResponses, stopListeningTo, listenTo, messageResponse } from '../util/observe';
import { assert, Mutable } from '../util/util';

// TODO: this should probably STORE and listen to Exercise rather than Project?

export class CheckpointsOutlet {
  public _act!: MessageResponses;

  public readonly exercise: Exercise;

  private readonly element: JQuery;
  private readonly headerElem: JQuery;

  private checkpointsContainerElem: JQuery;

  public constructor(element: JQuery, exercise: Exercise) {
    this.element = element;

    this.checkpointsContainerElem = element.find('.panel-body');
    this.headerElem = element.find('.panel-heading').html('Exercise Progress');

    this.exercise = this.setExercise(exercise);
  }

  public setExercise(exercise: Exercise) {
    if (exercise !== this.exercise) {
      stopListeningTo(this, this.exercise);
      (<Mutable<this>>this).exercise = exercise;
      listenTo(this, exercise);
    }

    if (exercise.checkpoints.length > 0) {
      this.element.show();
      $('.lobster-simulation-height').css('height', 'calc(100vh - 200px)');
    } else {
      this.element.hide();
      $('.lobster-simulation-height').css('height', 'calc(100vh - 70px)');
    }

    this.onCheckpointEvaluationFinished(exercise);

    return exercise;
  }

  @messageResponse('allCheckpointEvaluationStarted', 'unwrap')
  private async onCheckpointEvaluationStarted(exercise: Exercise) {
    assert(exercise);
    let checkpoints = exercise.checkpoints;
    this.checkpointsContainerElem.empty();
    checkpoints.map(
      (c, i) =>
        new CheckpointOutlet(
          $(`<span class="lobster-checkpoint"></span>`).appendTo(this.checkpointsContainerElem),
          c.name,
          'thinking'
        )
    );
  }

  @messageResponse('checkpointEvaluationFinished', 'unwrap')
  private async onCheckpointEvaluationFinished(exercise: Exercise) {
    assert(exercise);
    let checkpoints = exercise.checkpoints;
    let finished = exercise.checkpointEvaluationsFinished;
    let completions = exercise.checkpointCompletions;
    this.checkpointsContainerElem.empty();
    checkpoints.map(
      (c, i) =>
        new CheckpointOutlet(
          $(`<span class="lobster-checkpoint"></span>`).appendTo(this.checkpointsContainerElem),
          c.name,
          finished[i] ? (completions[i] ? 'complete' : 'incomplete') : 'thinking'
        )
    );

    // TODO remove special cases here, set completion policy
    // if (statuses.every(Boolean) || this.exercise.name !== "ch13_03_ex" && this.exercise.name !== "ch13_04_ex" && statuses[statuses.length - 1]) {
    if (exercise.isComplete) {
      this.headerElem.html(`<b>${this.exercise.completionMessage}</b>`);
      this.element.removeClass('panel-default');
      this.element.removeClass('panel-danger');
      this.element.addClass('panel-success');
    } else {
      this.element.removeClass('panel-success');
      this.element.removeClass('panel-default');
      this.element.removeClass('panel-danger');
      if (this.exercise.project?.program.hasSyntaxErrors()) {
        this.headerElem.html(
          'Exercise Progress (Please note: checkpoints cannot be verified due to syntax errors.)'
        );
        this.element.addClass('panel-danger');
      } else {
        this.headerElem.html('Exercise Progress');
        this.element.addClass('panel-default');
      }
    }
  }
}

const checkpointStatusIcons = {
  complete: '<i class="bi bi-check-square lobster-checkpoint-complete-icon"></i>',
  incomplete: '<i class="bi bi-square lobster-checkpoint-incomplete-icon"></i>',
  thinking: '<i class="bi bi-gear-fill lobster-checkpoint-thinking-icon"></i>',
};

type CheckpointStatus = 'thinking' | 'incomplete' | 'complete';

export class CheckpointOutlet {
  private readonly element: JQuery;
  private readonly statusElem: JQuery;

  public constructor(element: JQuery, name: string, status: CheckpointStatus) {
    this.element = element;
    element.append('&nbsp;' + name);

    this.statusElem = $(`<span>${checkpointStatusIcons[status]}</span>`).prependTo(element);
  }
}
