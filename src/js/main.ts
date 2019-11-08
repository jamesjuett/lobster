import {ProjectEditor, CompilationOutlet, CompilationStatusOutlet, ProjectSaveOutlet} from "./view/editors";

$(() => {

    let element = $("#lobster1");

    let i_tabsElem = element.find(".lobster-simulation-outlet-tabs");

    let sourcePane = element.find("#sourcePane");
    let projectEditor = new ProjectEditor(sourcePane);

    // TODO: HACK to make codeMirror refresh correctly when sourcePane becomes visible
    i_tabsElem.find('a[href="#sourcePane"]').on("shown.bs.tab", function() {
        projectEditor.refreshEditorView();
    });

    let compilationOutlet = new CompilationOutlet(element.find("#compilationPane"), projectEditor);

    let compilationStatusOutlet = new CompilationStatusOutlet(element.find(".compilation-status-outlet"), projectEditor);
    let projectSaveOutlet = new ProjectSaveOutlet(element.find(".project-save-outlet"), projectEditor);


    // let errorStatus = ValueEntity.instance();


    let runningProgress = element.find(".runningProgress");

    projectEditor.setProject("Test Project", [{name: "file.cpp", code: "blah", isTranslationUnit: "yes"}, {name: "file2.cpp", code: "blah wheee", isTranslationUnit: "yes"} ]);

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