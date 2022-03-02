import { DefaultLobsterOutlet } from './view/simOutlets';

import './lib/standard';
import { Users } from './frontend/user';
import { ProjectList } from './frontend/projects';
import { LobsterApplication } from './frontend/application';

$(async () => {
  // let element = $("#lobster1");

  // let i_tabsElem = element.find(".lobster-simulation-outlet-tabs");

  // let project = new Project("Test Project", [{name: "file.cpp", code: "int main() {\n  int x = 2;\n}", isTranslationUnit: true}, {name: "file2.cpp", code: "blah wheee", isTranslationUnit: false} ]);
  // // let sourcePane = element.find("#sourcePane");
  // let lobsterOutlet = new DefaultLobsterOutlet($("#lobster1"), );

  let app = new LobsterApplication();

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
