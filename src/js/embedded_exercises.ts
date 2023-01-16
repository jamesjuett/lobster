import { assert } from "./util/util";
import { decode } from "he";
import { createEmbeddedExerciseOutlet } from "./view/embeddedExerciseOutlet";
import { Exercise, Project } from "./core/Project";
import { Checkpoint } from "./analysis/checkpoints";
import { DEFAULT_EXERCISE, getExerciseSpecification } from "./exercises";

import "./lib/standard"
import { SimpleExerciseLobsterOutlet } from "./view/SimpleExerciseLobsterOutlet";

import "../../public/css/main.css";
import "../../public/css/code.css";
import "../../public/css/buttons.css";
import "../../public/css/exercises.css";
import "../../public/css/frontend.css";

$(() => {

    let exID = 1;

    $(".lobster-ex").each(function() {

        $(this).append(createEmbeddedExerciseOutlet(""+exID));

        let filename = $(this).find(".lobster-ex-file-name").html()?.trim() ?? "file.cpp";
        let exKey = $(this).find(".lobster-ex-key").html()?.trim() ??
                          $(this).find(".lobster-ex-project-name").html()?.trim() ?? "UnnamedProject";

        let exerciseSpec = getExerciseSpecification(exKey) ?? DEFAULT_EXERCISE;

        let completionMessage = $(this).find(".lobster-ex-completion-message").html()?.trim() ?? $(this).find(".lobster-ex-complete-message").html()?.trim();
        if (completionMessage) {
          exerciseSpec.completionMessage = completionMessage;
        }
        let initCode = decode($(this).find(".lobster-ex-starter-code").html()?.trim() ?? $(this).find(".lobster-ex-init-code").html()?.trim() ?? "");
        if (initCode) {
          exerciseSpec.starterCode = initCode;
        }

        let project = new Project(
          exKey,
          undefined,
          [{name: filename, code: exerciseSpec.starterCode, isTranslationUnit: true}],
          new Exercise(exerciseSpec));
        project.turnOnAutoCompile(500);

        if (exerciseSpec.checkpoints.length === 0) {
          $(this).find(".lobster-embedded-height-control").addClass("lobster-ex-no-checkpoints");
        }

        let exOutlet = new SimpleExerciseLobsterOutlet($(this), project);

        // setInterval(() => {
        //   try {
        //     if ((<any>window).updateIframeCode) {
        //       (<any>window).updateIframeCode(exOutlet.project.sourceFiles[0].text);
        //     }
        //   }
        //   catch(e) {

        //   }
        // }, 1000);

        ++exID;
    });



});