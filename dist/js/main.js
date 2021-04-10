"use strict";
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
require("./lib/standard");
const application_1 = require("./frontend/application");
$(() => __awaiter(void 0, void 0, void 0, function* () {
    // let element = $("#lobster1");
    // let i_tabsElem = element.find(".lobster-simulation-outlet-tabs");
    // let project = new Project("Test Project", [{name: "file.cpp", code: "int main() {\n  int x = 2;\n}", isTranslationUnit: true}, {name: "file2.cpp", code: "blah wheee", isTranslationUnit: false} ]);
    // // let sourcePane = element.find("#sourcePane");
    // let lobsterOutlet = new DefaultLobsterOutlet($("#lobster1"), );
    let app = new application_1.LobsterApplication();
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
}));
//# sourceMappingURL=main.js.map