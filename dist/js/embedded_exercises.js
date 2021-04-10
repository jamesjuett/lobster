"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const he_1 = require("he");
const embeddedExerciseOutlet_1 = require("./view/embeddedExerciseOutlet");
const Project_1 = require("./core/Project");
const exercises_1 = require("./exercises");
require("./lib/standard");
const SimpleExerciseLobsterOutlet_1 = require("./view/SimpleExerciseLobsterOutlet");
$(() => {
    let exID = 1;
    $(".lobster-ex").each(function () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        $(this).append(embeddedExerciseOutlet_1.createRunestoneExerciseOutlet("" + exID));
        let filename = (_b = (_a = $(this).find(".lobster-ex-file-name").html()) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : "file.cpp";
        let exKey = (_f = (_d = (_c = $(this).find(".lobster-ex-key").html()) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : (_e = $(this).find(".lobster-ex-project-name").html()) === null || _e === void 0 ? void 0 : _e.trim()) !== null && _f !== void 0 ? _f : "UnnamedProject";
        let exerciseSpec = (_g = exercises_1.getExerciseSpecification(exKey)) !== null && _g !== void 0 ? _g : exercises_1.DEFAULT_EXERCISE;
        let completionMessage = (_j = (_h = $(this).find(".lobster-ex-completion-message").html()) === null || _h === void 0 ? void 0 : _h.trim()) !== null && _j !== void 0 ? _j : (_k = $(this).find(".lobster-ex-complete-message").html()) === null || _k === void 0 ? void 0 : _k.trim();
        if (completionMessage) {
            exerciseSpec.completionMessage = completionMessage;
        }
        let initCode = he_1.decode((_p = (_m = (_l = $(this).find(".lobster-ex-starter-code").html()) === null || _l === void 0 ? void 0 : _l.trim()) !== null && _m !== void 0 ? _m : (_o = $(this).find(".lobster-ex-init-code").html()) === null || _o === void 0 ? void 0 : _o.trim()) !== null && _p !== void 0 ? _p : "");
        if (initCode) {
            exerciseSpec.starterCode = initCode;
        }
        let project = new Project_1.Project(exKey, undefined, [{ name: filename, code: exerciseSpec.starterCode, isTranslationUnit: true }], new Project_1.Exercise(exerciseSpec));
        project.turnOnAutoCompile(500);
        let exOutlet = new SimpleExerciseLobsterOutlet_1.SimpleExerciseLobsterOutlet($(this), project);
        ++exID;
    });
});
//# sourceMappingURL=embedded_exercises.js.map