import { assert } from "./util/util";
import { decode } from "he";
import { createRunestoneExerciseOutlet } from "./view/embeddedExerciseOutlet";
import { Exercise, Project } from "./core/Project";
import { Checkpoint } from "./analysis/checkpoints";
import { DEFAULT_EXERCISE, getExerciseSpecification } from "./exercises";

import "./lib/standard"
import { SimpleExerciseLobsterOutlet } from "./view/SimpleExerciseLobsterOutlet";

$(() => {

    let exID = 1;

    $(".lobster-ex").each(function() {

        $(this).append(createRunestoneExerciseOutlet(""+exID));

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

        let exOutlet = new SimpleExerciseLobsterOutlet($(this), project);

        ++exID;
    });



});