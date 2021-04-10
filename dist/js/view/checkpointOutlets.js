"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
exports.CheckpointOutlet = exports.CheckpointsOutlet = void 0;
const observe_1 = require("../util/observe");
const util_1 = require("../util/util");
// TODO: this should probably STORE and listen to Exercise rather than Project?
class CheckpointsOutlet {
    constructor(element, exercise) {
        this.element = element;
        this.checkpointsContainerElem = element.find(".panel-body");
        this.headerElem = element.find(".panel-heading").html("Exercise Progress");
        this.exercise = this.setExercise(exercise);
    }
    setExercise(exercise) {
        if (exercise !== this.exercise) {
            observe_1.stopListeningTo(this, this.exercise);
            this.exercise = exercise;
            observe_1.listenTo(this, exercise);
        }
        this.onCheckpointEvaluationFinished(exercise);
        return exercise;
    }
    onCheckpointEvaluationStarted(exercise) {
        return __awaiter(this, void 0, void 0, function* () {
            util_1.assert(exercise);
            let checkpoints = exercise.checkpoints;
            this.checkpointsContainerElem.empty();
            checkpoints.map((c, i) => new CheckpointOutlet($(`<span class="lobster-checkpoint"></span>`).appendTo(this.checkpointsContainerElem), c.name, "thinking"));
        });
    }
    onCheckpointEvaluationFinished(exercise) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            util_1.assert(exercise);
            let checkpoints = exercise.checkpoints;
            let finished = exercise.checkpointEvaluationsFinished;
            let completions = exercise.checkpointCompletions;
            this.checkpointsContainerElem.empty();
            checkpoints.map((c, i) => new CheckpointOutlet($(`<span class="lobster-checkpoint"></span>`).appendTo(this.checkpointsContainerElem), c.name, finished[i] ? (completions[i] ? "complete" : "incomplete") : "thinking"));
            // TODO remove special cases here, set completion policy
            // if (statuses.every(Boolean) || this.exercise.name !== "ch13_03_ex" && this.exercise.name !== "ch13_04_ex" && statuses[statuses.length - 1]) {
            if (exercise.isComplete) {
                this.headerElem.html(`<b>${this.exercise.completionMessage}</b>`);
                this.element.removeClass("panel-default");
                this.element.removeClass("panel-danger");
                this.element.addClass("panel-success");
            }
            else {
                this.element.removeClass("panel-success");
                this.element.removeClass("panel-default");
                this.element.removeClass("panel-danger");
                if ((_a = this.exercise.project) === null || _a === void 0 ? void 0 : _a.program.hasSyntaxErrors()) {
                    this.headerElem.html("Exercise Progress (Please note: checkpoints cannot be verified due to syntax errors.)");
                    this.element.addClass("panel-danger");
                }
                else {
                    this.headerElem.html("Exercise Progress");
                    this.element.addClass("panel-default");
                }
            }
        });
    }
}
__decorate([
    observe_1.messageResponse("allCheckpointEvaluationStarted", "unwrap")
], CheckpointsOutlet.prototype, "onCheckpointEvaluationStarted", null);
__decorate([
    observe_1.messageResponse("checkpointEvaluationFinished", "unwrap")
], CheckpointsOutlet.prototype, "onCheckpointEvaluationFinished", null);
exports.CheckpointsOutlet = CheckpointsOutlet;
;
const checkpointStatusIcons = {
    complete: '<i class="bi bi-check-square lobster-checkpoint-complete-icon"></i>',
    incomplete: '<i class="bi bi-square lobster-checkpoint-incomplete-icon"></i>',
    thinking: '<i class="bi bi-gear-fill lobster-checkpoint-thinking-icon"></i>'
};
class CheckpointOutlet {
    constructor(element, name, status) {
        this.element = element;
        element.append("&nbsp;" + name);
        this.statusElem = $(`<span>${checkpointStatusIcons[status]}</span>`)
            .prependTo(element);
    }
}
exports.CheckpointOutlet = CheckpointOutlet;
//# sourceMappingURL=checkpointOutlets.js.map