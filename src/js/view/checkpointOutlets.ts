import { Checkpoint } from "../analysis/checkpoints";
import { Project } from "../core/Project";
import { MessageResponses, stopListeningTo, listenTo, messageResponse } from "../util/observe";
import { Mutable } from "../util/util";

export class CheckpointsOutlet {

    public _act!: MessageResponses;
    
    public readonly project: Project;
    
    private readonly element: JQuery;
    private readonly headerElem: JQuery;
    private readonly completeMessage: string;

    private checkpointsContainerElem: JQuery;

    public constructor(element: JQuery, project: Project, completeMessage: string) {
        this.element = element;
        this.completeMessage = completeMessage;

        this.checkpointsContainerElem = element.find(".panel-body");
        this.headerElem = element.find(".panel-heading").html("Exercise Progress");

        this.project = this.setProject(project);
    }

    public setProject(project: Project) {
        if (project !== this.project) {
            stopListeningTo(this, this.project);
            (<Mutable<this>>this).project = project;
            listenTo(this, project);
        }

        this.onCheckpointEvaluationFinished(project);

        return project;
    }
    
    @messageResponse("checkpointEvaluationStarted", "unwrap")
    private async onCheckpointEvaluationStarted(project: Project) {

        let checkpoints = project.checkpoints;
        this.checkpointsContainerElem.empty();
        checkpoints.map((c, i) => new CheckpointOutlet(
            $(`<span class="lobster-checkpoint"></span>`).appendTo(this.checkpointsContainerElem),
            c.name,
            "thinking"
        ));

    }

    @messageResponse("checkpointEvaluationFinished", "unwrap")
    private async onCheckpointEvaluationFinished(project: Project) {
        
        let checkpoints = project.checkpoints;
        let statuses = project.checkpointStatuses;
        this.checkpointsContainerElem.empty();
        checkpoints.map((c, i) => new CheckpointOutlet(
            $(`<span class="lobster-checkpoint"></span>`).appendTo(this.checkpointsContainerElem),
            c.name,
            statuses[i] ? "complete" : "incomplete"
        ));

        if (statuses.every(Boolean) || this.project.name !== "ch13_03_ex" && this.project.name !== "ch13_04_ex" && statuses[statuses.length - 1]) {
            this.headerElem.html(`<b>${this.completeMessage}</b>`);
            this.element.removeClass("panel-default");
            this.element.removeClass("panel-danger");
            this.element.addClass("panel-success");
        }
        else {
            
            this.element.removeClass("panel-success");
            this.element.removeClass("panel-default");
            this.element.removeClass("panel-danger");
            if (this.project.program.hasSyntaxErrors()) {
                this.headerElem.html("Exercise Progress (Please note: checkpoints cannot be verified due to syntax errors.)");
                this.element.addClass("panel-danger");
            }
            else {
                this.headerElem.html("Exercise Progress");
                this.element.addClass("panel-default");
            }
        }

    }
};


const checkpointStatusIcons = {
    complete: '<i class="bi bi-check2-square lobster-checkpoint-complete-icon"></i>',
    incomplete: '<i class="bi bi-square lobster-checkpoint-incomplete-icon"></i>',
    thinking: '<i class="bi bi-gear-fill lobster-checkpoint-thinking-icon"></i>'
};

type CheckpointStatus = "thinking" | "incomplete" | "complete";

export class CheckpointOutlet {
    
    private readonly element: JQuery;
    private readonly statusElem: JQuery;

    public constructor(element: JQuery, name: string, status: CheckpointStatus) {
        
        this.element = element;
        element.append("&nbsp;" + name);
        
        this.statusElem = $(`<span>${checkpointStatusIcons[status]}</span>`)
            .prependTo(element);
    }

}