import { RuntimeConstruct } from "../core/constructs/constructs";
import { Project } from "../core/Project";
import { Simulation } from "../core/Simulation";
import { AsynchronousSimulationRunner } from "../core/simulationRunners";
import { MessageResponses, listenTo, stopListeningTo, messageResponse, Message } from "../util/observe";
import { assert, Mutable } from "../util/util";
import { CheckpointsOutlet } from "./checkpointOutlets";
import { ProjectEditor, CompilationOutlet, CompilationStatusOutlet } from "./editors";
import { MemoryOutlet, SimulationOutlet } from "./simOutlets";

export class InstantMemoryDiagramOutlet {
    
    
    public readonly project: Project;
    public readonly isActive: boolean;

    private readonly memoryOutlet: MemoryOutlet;

    private readonly element: JQuery;
    
    public _act!: MessageResponses;

    public constructor(element: JQuery, project: Project, isActive: boolean) {
        this.element = element;
        this.isActive = isActive;

        this.memoryOutlet = new MemoryOutlet(element);

        this.project = project;
        listenTo(this, project);

        
    }
    
    public setActive(isActive: boolean) {
        (<Mutable<this>>this).isActive = isActive;
        this.updateMemory();
    }

    public setProject(project: Project) {
        if (this.project) {
            stopListeningTo(this, this.project);
        }
        (<Mutable<this>>this).project = project;
        listenTo(this, this.project);

        this.updateMemory();
    }

    private async updateMemory() {

        let program = this.project.program;
        if (!this.isActive){
            this.memoryOutlet.clearMemory();
            return;
        }
        
        if (!program.isRunnable()) {
            return;
        }

        let sim =  new Simulation(program);
        this.memoryOutlet.setMemory(sim.memory);
        let simRunner = new AsynchronousSimulationRunner(sim);


        await simRunner.stepToEndOfMain(0, 1000);

        this.element.find(".code-memoryObject .set").removeClass("set");
    }

    @messageResponse("compilationFinished")
    public onCompilationFinished() {

        this.updateMemory();

    }

}