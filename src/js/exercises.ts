import { DefaultLobsterOutlet, SimpleExerciseLobsterOutlet } from "./view/simOutlets";
import { trim } from "lodash";

$(() => {

    let exID = 1;

    $(".lobster-ex").each(function() {

        $(this).append(`
            <div>
                <ul style="position: relative;" class="lobster-simulation-outlet-tabs nav nav-tabs">
                    <div style="position: absolute; right: 0; bottom: 0; padding-bottom: 3px">
                        <div style="display: inline-block">
                        </div>
                    </div>

                    <li><a data-toggle="tab" href="#lobster-ex-${exID}-compilation-pane">Compilation</a></li>
                    <li class="active"><a data-toggle="tab" href="#lobster-ex-${exID}-source-pane">Source Code</a></li>
                    <li><a class="lobster-simulate-tab" data-toggle="tab" href="#lobster-ex-${exID}-sim-pane">Simulation</a></li>

                </ul>

                <div class="tab-content">
                    <div id="lobster-ex-${exID}-compilation-pane" class="lobster-compilation-pane tab-pane fade">
                        <div>
                            <h3>Compilation Units</h3>
                            <p>A program may be composed of many different compilation units (a.k.a translation units), one for each source file
                                that needs to be compiled into the executable program. Generally, you want a compilation
                                unit for each .cpp file, and these are the files you would list out in a compile command.
                                The files being used for this purpose are highlighted below. Note that files may be
                                indirectly used if they are #included in other compilation units, even if they are not
                                selected to form a compilation unit here.
                            </p>
                            <p style="font-weight: bold;">
                                Click files below to toggle whether they are being used to create a compilation unit.
                            </p>
                            <ul class="translation-units-list list-inline">
                            </ul>
                        </div>
                        <div>
                            <h3>Compilation Errors</h3>
                            <p>These errors were based on your last compilation.
                            </p>
                            <ul class="compilation-notes-list">
                            </ul>
                        </div>
                    </div>

                    <div id="lobster-ex-${exID}-source-pane" class="lobster-source-pane tab-pane fade active in">
                        <div style="padding-top:5px; padding-bottom: 5px;">
                            <ul style="display:inline-block; vertical-align: middle;" class="project-files nav nav-pills"></ul>
                            
                            <button class = "btn btn-primary runButton" style="float:right; margin-left: 1em"><span class="glyphicon glyphicon-play-circle"></span> Simulate</span></button>
                            <div class = "compilation-status-outlet" style="float:right">
                            </div>
                        </div>
                        <div class="codeMirrorEditor" style = "position: relative; background-color: #272822">
                            <!--<textarea style="position: absolute; overflow-y: hidden; height: 2000px; color: black"></textarea>-->
                            <!--<div style="height: 400px;"></div>-->
                        </div>

                        <div class="annotationMessagesContainer" style="position: absolute; bottom: 0; left: 0px; right: 0px; overflow: hidden; text-align: center; pointer-events: none">
                            <div class="annotationMessages">
                                <div style="height: 100px; margin-left: 5px; float: right;">
                                    <img src="img/lobster_teaching.jpg" class="lobsterRecursionImage" style="height: 90px; margin-left: 5px;"/>
                                    <img src="img/lobster_recursion.jpg" class="lobsterTeachingImage" style="display:none; height: 90px; margin-left: 5px;"/>
                                    <div style="padding-right: 5px; text-align: center"><button>Thanks!</button></div>
                                </div>
                                <div style="height: 100%; overflow-y: auto"><table style="height: 110px; margin-left: auto; margin-right: auto"><tr><td><div class="annotation-message"></div></td></tr></table></div>
                            </div>
                        </div>
                    </div>
                    <div id="lobster-ex-${exID}-sim-pane" class="lobster-sim-pane tab-pane fade">
                        <div style="position: relative">
                            <div class="runningProgress" style="position: absolute; right: 0; top: 0; margin: 5px; margin-right: 20px; padding: 5px; background-color: rgba(255,255,255,0.7);">
                                Thinking...
                                <!--<progress style="display: inline-block; vertical-align: top"></progress>-->
                            </div>
                            <div class="alerts-container">
                                <div class="alerts">
                                    <div style="display:inline-block; padding: 5px">
                                        <div style="height: 100px; margin-left: 5px; float: right;">
                                            <img src="img/lobster.png" style="height: 80px; margin-left: 5px;"/>
                                            <div style="padding-right: 5px; text-align: right"><button>Dismiss</button></div>
                                        </div>
                                        <table style="height: 110px"><tr><td><div class="alerts-message"></div></td></tr></table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- <p style = "width: 394px; padding: 5px;" class = "_outlet readOnly memory">memory</p> -->
                        <table style="width: 100%; margin-top: 5px; ">
                            <tr>
                                <td style="width: 30%; min-width: 260px; vertical-align: top; height: 100%">
                                    <div style="position: relative; display: flex; flex-direction: column;">
                                        <div style="margin-bottom: 5px;">
                                            <button class = "restart btn btn-warning-muted"><span class="glyphicon glyphicon-fast-backward"></span> Restart</button>
                                            <!--<span style = "display: inline-block; width: 4ch"></span>-->
                                            <!-- <button class = "stepOver">Step Over</button> -->
                                            <!-- <button class = "stepOut">Step Out</button> -->
                                            <!-- <button class = "runToEnd">Run</button> -->
                                            <!-- <button class = "pause">Pause</button> -->
                                            <!-- <button class = "skipToEnd">Skip to End (FAST)</button> -->

                                            <!--Show Functions<input type="checkbox" class="stepInto"/>-->
                                            <button class = "stepBackward btn btn-success-muted"><span class="glyphicon glyphicon-arrow-left"></span> Back</button>
                                            <input type="hidden" style="width: 4ch" class="stepBackwardNum" value="1" />

                                            
                                            <input type="hidden" style="display: none; width: 4ch" class="stepForwardNum" value="1" />
                                            <button class = "stepForward btn btn-success-muted">Step <span class="glyphicon glyphicon-arrow-right"></span></button>
                                            <!--<input type="checkbox" id="tcoCheckbox" checked="false" />-->
                                        </div>
                                        <div class="console" style="position: relative; min-height: 80px; resize: vertical; background-color: rgb(39, 40, 34); color: white;">
                                            <span style = "position: absolute; top: 5px; right: 5px;">Console</span>
                                            <span class="lobster-console-contents"></span>
                                        </div>
                                        <div style = "margin-top: 5px; text-align: center;">Memory</div>
                                        <div style="overflow-y: auto; overflow-x: hidden; flex-grow: 1;"><div style="height: 300px;" class="memory readOnly"></div></div>

                                    </div>
                                </td>
                                <td style="position: relative; vertical-align: top;">
                                    <div class = "codeStack readOnly" style="display: block; margin-left: 5px; overflow-y: auto; position: absolute; width: 100%; height: 100%; white-space: nowrap;"> </div>
                                </td>
                            </tr>
                        </table>

                    </div>
                </div>

            </div>

        `)


        let lobsterOutlet = new SimpleExerciseLobsterOutlet($(this));
        let projectEditor = lobsterOutlet.projectEditor;

        let filename = $(this).find(".lobster-ex-file-name").html()?.trim() ?? "file.cpp";
        let initCode = $(this).find(".lobster-ex-init-code").html()?.trim() ?? "";

        projectEditor.setProject("Test Project", [{name: filename, code: initCode, isTranslationUnit: "yes"}]);

        projectEditor.turnOnAutoCompile(500);

        ++exID;
    })



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