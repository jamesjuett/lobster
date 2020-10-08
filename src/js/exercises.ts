import { DefaultLobsterOutlet, SimpleExerciseLobsterOutlet } from "./view/simOutlets";

$(() => {

    let element = $("#lobster1");

    let lobsterOutlet = new SimpleExerciseLobsterOutlet($("#lobster1"));
    let projectEditor = lobsterOutlet.projectEditor;

    projectEditor.setProject("Test Project", [{name: "file.cpp", code: "int main() {\n  int x = 2;\n}", isTranslationUnit: "yes"}, {name: "file2.cpp", code: "blah wheee", isTranslationUnit: "no"} ]);



//        console = ValueEntity.instance();

    // if ((elem = statusElem = element.find(".status")).length !== 0) {
    //     status = Outlets.HtmlOutlet.instance(elem, true).listenTo(errorStatus);
    // }
    // if ((elem = element.find(".console")).length !== 0) {
    //     consoleOutlet = Outlets.HtmlOutlet.instance(elem, true).listenTo(sim.console);
    // }

    // if ((elem = element.find(".stackFrames")).length !== 0) {
    //     if (useSourceSimulation){
    //         stackFrames = Outlets.CPP.SourceSimulation.instance(elem, sim, this);
    //         listenTo(stackFrames);
    //     }
    //     else{
    //         stackFrames = Outlets.CPP.SimulationStack.instance(elem, sim, this);
    //         listenTo(stackFrames);
    //     }
    // }
    
    // if ((elem = element.find(".memory")).length !== 0) {
    //     memory = Outlets.CPP.Memory.instance(elem, sim.memory);
    // }

    // runButton = element.find(".runButton");


});