"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExtras = void 0;
const declarations_1 = require("../core/declarations");
const errors_1 = require("../core/errors");
const initializers_1 = require("../core/initializers");
const predicates_1 = require("../core/predicates");
const types_1 = require("../core/types");
const analysis_1 = require("./analysis");
const loops_1 = require("./loops");
function getExtras(extra_keys) {
    var _a;
    if (typeof extra_keys === "string") {
        return (_a = EXTRAS[extra_keys]) !== null && _a !== void 0 ? _a : [];
    }
    else {
        let extras = [];
        extra_keys.forEach(ck => { var _a; return (_a = EXTRAS[ck]) === null || _a === void 0 ? void 0 : _a.forEach(c => extras.push(c)); });
        return extras;
    }
}
exports.getExtras = getExtras;
let loop_control_vars = (program) => {
    let loops = analysis_1.findConstructs(program, predicates_1.Predicates.isLoop);
    loops.forEach(loop => {
        let loopControlVars = loops_1.findLoopControlVars(loop);
        program.addNote(new errors_1.CompilerNote(loop.condition, errors_1.NoteKind.STYLE, "loop_control_vars", `It appears that the variable(s) [${loopControlVars.map(v => v.name).join(",")}] control this loop.`));
    });
};
const EXTRAS = {
    "loop_control_vars": [loop_control_vars],
    // "eecs280_ex_lab2_squareArray": [loop_control_vars],
    "loop_hardcoded_condition": [(program) => {
            let loop = analysis_1.findFirstConstruct(program, predicates_1.Predicates.isLoop);
            if (!loop) {
                return false;
            }
            // verify loop condition does NOT contain a number
            let hardcodedLimit = analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKind("numeric_literal_expression"));
            if (hardcodedLimit) {
                program.addNote(new errors_1.CompilerNote(loop.condition, errors_1.NoteKind.STYLE, "heuristic_loop_hardcoded_size", `Uh oh! It looks like you've got a hardcoded number ${hardcodedLimit.value.rawValue} for the loop size. This might work for a specific case, but wouldn't work generally.`));
                return false;
            }
        }],
    "loop_condition_vector_off_by_one": [(program) => {
            let loop = analysis_1.findFirstConstruct(program, predicates_1.Predicates.isLoop);
            if (!loop) {
                return false;
            }
            // verify loop condition contains a relational operator
            if (!analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKind("relational_binary_operator_expression"))) {
                return false;
            }
            // if loop condition does not contain a call to vector.size() return false
            if (!analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byFunctionCallName("size"))) {
                return false;
            }
            // tricky - don't look for subscript expressions, since with a vector it's actually
            // an overloaded [] and we need to look for that as a function call
            let indexingOperations = analysis_1.findConstructs(loop.body, predicates_1.Predicates.isIndexingOperation);
            // loop condition contains size (from before), but also has <= or >=
            // and no arithmetic operators or pre/post increments that could make up for the equal to part
            // (e.g. i <= v.size() is very much wrong, but i <= v.size() - 1 is ok)
            let conditionOperator = analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKind("relational_binary_operator_expression"));
            if (conditionOperator) {
                if (!analysis_1.findFirstConstruct(loop.condition, predicates_1.Predicates.byKinds(["arithmetic_binary_operator_expression", "prefix_increment_expression", "postfix_increment_expression"]))) {
                    if (conditionOperator.operator === "<=" || conditionOperator.operator === ">=") {
                        if (!indexingOperations.some(indexingOp => analysis_1.findFirstConstruct(indexingOp, predicates_1.Predicates.byKinds([
                            "arithmetic_binary_operator_expression",
                            "prefix_increment_expression",
                            "postfix_increment_expression"
                        ])))) {
                            program.addNote(new errors_1.CompilerNote(conditionOperator, errors_1.NoteKind.STYLE, "loop_condition_vector_off_by_one", `Double check the limit in this condition. I think there might be an off-by-one error that takes you out of bounds if you're using the ${conditionOperator.operator} operator.`));
                            return false;
                        }
                    }
                }
            }
            return true;
        }],
    "eecs280_ex_swap_by_pointer": [
        (program) => {
            let swapPtdInts = analysis_1.findConstructs(program, analysis_1.constructTest(declarations_1.FunctionDefinition))
                .find(def => def.declaration.name === "swap");
            let main = analysis_1.findConstructs(program, analysis_1.constructTest(declarations_1.FunctionDefinition))
                .find(def => def.declaration.name === "main");
            if (!swapPtdInts || !main) {
                return;
            }
            let assignments = analysis_1.findConstructs(swapPtdInts, predicates_1.Predicates.byKind("assignment_expression"));
            let pointerAssignments = assignments.filter(predicates_1.Predicates.byTypedExpression(types_1.isPointerType));
            let localDefs = analysis_1.findConstructs(swapPtdInts, predicates_1.Predicates.byKind("local_variable_definition"));
            let pointerDefs = localDefs.filter(predicates_1.Predicates.byTypedDeclaration(types_1.isPointerType));
            let intDefs = localDefs.filter(predicates_1.Predicates.byTypedDeclaration(types_1.isType(types_1.Int)));
            let intParams = swapPtdInts.parameters.filter(predicates_1.Predicates.byTypedDeclaration(types_1.isType(types_1.Int)));
            // Heuristic 1
            // At least two assignments, but no variable declarations. Forgot a temporary?
            if (assignments.length >= 2 && localDefs.length == 0) {
                assignments.forEach(assn => assn.addNote(new errors_1.CompilerNote(assn, errors_1.NoteKind.STYLE, "analysis.1", "It's just a guess, but one of these assignments might end up accidentally overwriting some important data when you run your code. Check out the simulation to see ;).")));
            }
            // Heuristic 2
            // Only one variable declaration and it's a pointer. Also at least one assignment in terms of pointers.
            if (program.isRunnable() && localDefs.length === 1
                && localDefs[0].type && localDefs[0].type.isPointerType()
                && pointerAssignments.length >= 1) {
                swapPtdInts.declaration.addNote(new errors_1.CompilerNote(swapPtdInts.declaration, errors_1.NoteKind.STYLE, "analysis.2", "Check out the visualization of your code. What kinds of things are being swapped? Is it the arrows (i.e. pointers) or the values? Which do you want? What does that mean about where you should have the * operator in your code?"));
            }
            // Heuristic 3
            // Declare a non-pointer but assign a pointer to it.
            intDefs.filter(def => {
                var _a;
                return def.initializer && def.initializer instanceof initializers_1.DirectInitializer && ((_a = def.initializer.args[0].type) === null || _a === void 0 ? void 0 : _a.isPointerType());
            }).forEach(def => {
                def.addNote(new errors_1.CompilerNote(def, errors_1.NoteKind.STYLE, "analysis.3", `This line is trying to put an address into a variable that declared to hold ${def.type.englishString(false)} value. Pointers (which have addresses for values) can't be stored into variables that hold plain values.`));
            });
            // Heuristic 4
            // Parameters that are pass-by-value (and not pass-by-pointer)
            if (program.isRunnable() && assignments.length >= 2) {
                if (intParams.length >= 2) {
                    swapPtdInts.declaration.addNote(new errors_1.CompilerNote(swapPtdInts.declaration, errors_1.NoteKind.STYLE, "analysis.4", `It looks like you've got a fair bit of code written to do the swap. But take a moment now to go ahead and simulate what you have. Look at the variables on the stack frames for main and your swap function as it runs. Are the variables in main getting changed, as desired? If not, why not? Does it have anything to do with the way you're passing the function parameters?`));
                }
            }
            // Heuristic 5
            // Pass by value paramParam in swap with same name as param in main
            intParams.filter(param => analysis_1.findConstructs(main, predicates_1.Predicates.byKind("local_variable_definition")).find(def => def.name === param.name)).forEach(param => param.addNote(new errors_1.CompilerNote(param, errors_1.NoteKind.STYLE, "analysis.4", `Note that the parameter ${param.name} is not the same variable as the ${param.name} declared in main(). The two variables have different scopes and correspond to separate objects at runtime.`)));
        }
    ]
};
//# sourceMappingURL=extras.js.map