import { SimulationOutlet } from "./simOutlets";
import { ProjectEditor, CompilationOutlet, CompilationStatusOutlet } from "./editors";
import { Simulation } from "../core/Simulation";
import { MessageResponses, listenTo, stopListeningTo, messageResponse, Message } from "../util/observe";
import { Mutable } from "../util/util";
import { RuntimeConstruct } from "../core/constructs";
import { Project } from "../core/Project";
import { CheckpointsOutlet } from "./checkpointOutlets";
import { InstantMemoryDiagramOutlet } from "./InstantMemoryDiagramOutlet";



export class SimpleExerciseLobsterOutlet {

  private projectEditor: ProjectEditor;
  private simulationOutlet: SimulationOutlet;
  private instantMemoryDiagramOutlet: InstantMemoryDiagramOutlet;
  private isInstantMemoryDiagramActive: boolean;

  public readonly project: Project;

  public readonly sim?: Simulation;

  private readonly element: JQuery;
  private readonly tabsElem: JQuery;
  private readonly sourceTabElem: JQuery;
  private readonly simulateTabElem: JQuery;
  // private readonly annotationMessagesElem: JQuery;
  public readonly compilationOutlet: CompilationOutlet;
  public readonly compilationStatusOutlet: CompilationStatusOutlet;
  public readonly checkpointsOutlet: CheckpointsOutlet;

  public _act!: MessageResponses;

  public constructor(element: JQuery, project: Project) {
    this.element = element;
    // Set up simulation and source tabs
    // var sourceTab = element.find(".sourceTab");
    // var simTab = element.find(".simTab");
    this.tabsElem = element.find(".lobster-simulation-outlet-tabs");

    // TODO: HACK to make codeMirror refresh correctly when sourcePane becomes visible
    this.tabsElem.find('a.lobster-source-tab').on("shown.bs.tab", () => {
      this.projectEditor.refreshEditorView();
    });

    this.simulationOutlet = new SimulationOutlet(element.find(".lobster-sim-pane"));
    this.sourceTabElem = element.find(".lobster-source-tab");
    this.simulateTabElem = element.find(".lobster-simulate-tab");
    this.setSimulationTabEnabled(false);

    let runButtonElem = element.find(".runButton")
      .click(() => {
        let program = this.project.program;
        if (program.isRunnable()) {
          let sim = new Simulation(program);
          while (!sim.globalAllocator.isDone) {
            sim.stepForward(); // TODO: put this loop in simulation runners in function to skip stuff before main
          }
          this.setSimulation(sim);
        }
        this.simulateTabElem.tab("show");
      }
    );

    
    element.find(".lobster-return-to-source").on("click", () => {
      this.clearSimulation();
      this.element.find(".lobster-source-tab").tab("show");
    });

    this.projectEditor = new ProjectEditor(element.find(".lobster-source-pane"), project);
    this.compilationOutlet = new CompilationOutlet(element.find(".lobster-compilation-pane"), project);
    this.compilationStatusOutlet = new CompilationStatusOutlet(element.find(".compilation-status-outlet"), project);
    this.checkpointsOutlet = new CheckpointsOutlet(element.find(".lobster-ex-checkpoints"), project.exercise);
    let IMDOElem = element.find(".lobster-instant-memory-diagram");
    this.instantMemoryDiagramOutlet = new InstantMemoryDiagramOutlet(IMDOElem, project, false);
    this.isInstantMemoryDiagramActive = false;

    element.find(".lobster-instant-memory-diagram-buttons button").on("click", () => {
      ["active", "btn-default", "btn-primary"].forEach(c => element.find(".lobster-instant-memory-diagram-buttons button").toggleClass(c)
      );
      this.isInstantMemoryDiagramActive = !this.isInstantMemoryDiagramActive;
      this.instantMemoryDiagramOutlet.setActive(this.isInstantMemoryDiagramActive);
      if (this.isInstantMemoryDiagramActive) {
        IMDOElem.show();
      }
      else {
        IMDOElem.hide();
      }
    });

    this.project = project;
  }

  public setProject(project: Project) {
    (<Mutable<this>>this).project = project;

    this.projectEditor.setProject(project);
    this.compilationOutlet.setProject(project);
    this.compilationStatusOutlet.setProject(project);
    this.checkpointsOutlet.setExercise(project.exercise);
    this.instantMemoryDiagramOutlet.setProject(project);

    return this.project;
  }

  public setSimulation(sim: Simulation) {
    this.clearSimulation();
    (<Mutable<this>>this).sim = sim;
    listenTo(this, sim);

    this.simulationOutlet.setSimulation(sim);
    this.setSimulationTabEnabled(true);
  }

  public clearSimulation() {
    this.setSimulationTabEnabled(false);
    this.simulationOutlet.clearSimulation();

    if (this.sim) {
      stopListeningTo(this, this.sim);
    }
    delete (<Mutable<this>>this).sim;
  }

  // private hideAnnotationMessage() {
  //     this.annotationMessagesElem.css("top", "125px");
  //     if (this.afterAnnotation.length > 0) {
  //         this.afterAnnotation.forEach(fn => fn());
  //         this.afterAnnotation.length = 0;
  //     }
  // }
  @messageResponse("requestFocus")
  protected requestFocus(msg: Message<undefined>) {
    if (msg.source === this.projectEditor) {
      this.tabsElem.find('a.lobster-source-tab').tab("show");
    }
  }


  @messageResponse("beforeStepForward")
  protected beforeStepForward(msg: Message<RuntimeConstruct>) {
    var oldGets = $(".code-memoryObject .get");
    var oldSets = $(".code-memoryObject .set");
    setTimeout(() => {
      oldGets.removeClass("get");
      oldSets.removeClass("set");
    }, 300);
  }

  setSimulationTabEnabled(isEnabled: boolean) {
    if (isEnabled) {
      this.simulateTabElem.parent().removeClass("disabled");
    }
    else {
      this.simulateTabElem.parent().addClass("disabled");
    }
  }
}
