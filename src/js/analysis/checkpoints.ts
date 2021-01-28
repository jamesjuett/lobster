import { CompilerNote, NoteKind } from "../core/errors";
import { Predicates } from "../core/predicates";
import { Program } from "../core/Program";
import { Project } from "../core/Project";
import { Simulation } from "../core/Simulation";
import { AsynchronousSimulationRunner } from "../core/simulationRunners";
import { findFirstConstruct, findConstructs, containsConstruct } from "./analysis";

export abstract class Checkpoint {

    public readonly name: string;

    public constructor(name: string) {
        this.name = name;
    }

    public abstract evaluate(project: Project): Promise<boolean>;
}

export class IsCompiledCheckpoint extends Checkpoint {

    public async evaluate(project: Project) {
        return project.program.isCompiled();
    }

}

function removeWhitespace(str: string) {
    return str.replace(/\s+/g, '');
}

export class OutputCheckpoint extends Checkpoint {

    public readonly input: string;
    public readonly stepLimit: number;

    private expected: (output: string) => boolean;
    
    private runner?: AsynchronousSimulationRunner;

    public constructor(name: string, expected: (output: string) => boolean, input: string = "", stepLimit: number = 1000) {
        super(name);
        this.expected = expected;
        this.input = input;
        this.stepLimit = stepLimit;
    }

    // May throw if interrupted during async running
    public async evaluate(project: Project) {
        
        if (this.runner) {
            this.runner.pause();
            delete this.runner;
        }

        let program = project.program;

        if (!program.isRunnable()) {
            return false;
        }

        let sim = new Simulation(program);
        if (this.input !== "") {
            sim.cin.addToBuffer(this.input)
        }
        let runner = this.runner = new AsynchronousSimulationRunner(sim);

        // may throw if interrupted
        await runner.stepToEnd(0, this.stepLimit, true);
        return sim.atEnd && this.expected(sim.allOutput);
    }
    
}

export function outputComparator(desiredOutput: string, ignoreWhitespace: boolean = false) {
    if (ignoreWhitespace) {
        return (output: string) => {
            return removeWhitespace(output) === removeWhitespace(desiredOutput);
        }
    }
    else {
        return (output: string) => {
            return output === desiredOutput;
        }
    }
}


export class StaticAnalysisCheckpoint extends Checkpoint {

    private criterion: (program: Program, project: Project) => boolean;
    
    private runner?: AsynchronousSimulationRunner;

    public constructor(name: string, criterion: (program: Program, project: Project) => boolean) {
        super(name);
        this.criterion = criterion;
    }

    public async evaluate(project: Project) {
        return this.criterion(project.program, project);
    }
    
}



// export class TestCaseCheckpoint extends Checkpoint {

//     public readonly input: string;
//     public readonly stepLimit: number;

//     private validTest: (assertion: MagicFunctionCallExpressionOutlet) => boolean;
    
//     private runner?: AsynchronousSimulationRunner;

//     public constructor(name: string, validTest: (output: string) => boolean, input: string = "", stepLimit: number = 1000) {
//         super(name);
//         this.validTest = validTest;
//         this.input = input;
//         this.stepLimit = stepLimit;
//     }

//     // May throw if interrupted during async running
//     public async evaluate(project: Project) {
        
//         if (this.runner) {
//             this.runner.pause();
//             delete this.runner;
//         }

//         let program = project.program;

//         if (!program.isRunnable()) {
//             return false;
//         }

//         let sim = new Simulation(program);
//         if (this.input !== "") {
//             sim.cin.addToBuffer(this.input)
//         }
//         let runner = this.runner = new AsynchronousSimulationRunner(sim);

//         // may throw if interrupted
//         await runner.stepToEnd(0, this.stepLimit, true);
//         return sim.atEnd && this.expected(sim.allOutput);
//     }
    
// }

export function getExerciseCheckpoints(checkpoints_key: string | string[]) {
    if (typeof checkpoints_key === "string") {
        return EXERCISE_CHECKPOINTS[checkpoints_key] ?? [];
    }
    else {
        let checkpoints: Checkpoint[] = [];
        checkpoints_key.forEach(ck => EXERCISE_CHECKPOINTS[ck]?.forEach(c => checkpoints.push(c)));
        return checkpoints;
    }
}

export const EXERCISE_CHECKPOINTS : {[index: string]: readonly Checkpoint[] | undefined} = {
    "test_exercise_1": [
        new StaticAnalysisCheckpoint("Declare x", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableName("x"));
        }),
        new StaticAnalysisCheckpoint("Use a for loop", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byKind("for_statement"));
        }),
        new OutputCheckpoint("Print \"Hello World!\"", outputComparator("Hello World!", true))
    ],
    "test_exercise_2": [
        new StaticAnalysisCheckpoint("Declare z", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableName("z"));
        })
    ],
    "ch12_01_ex": [
        new StaticAnalysisCheckpoint("Compute y", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableName("y"));
        }),
        new StaticAnalysisCheckpoint("Compute z", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableName("z"));
        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output === "Hello World!\nThe result is 120!\n";
        })
    ],
    "ch12_04_ex_stopwatch": [
        new StaticAnalysisCheckpoint("Compute h", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableName("h"));
        }),
        new StaticAnalysisCheckpoint("Compute m", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableName("m"));
        }),
        new StaticAnalysisCheckpoint("Compute s", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableName("s"));
        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output === "Hours: 1\nMinutes: 2\nSeconds: 33\n";
        })
    ],
    "ch13_02_ex": [
        new IsCompiledCheckpoint("Compiles"),
        new StaticAnalysisCheckpoint("Start at 9", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableInitialValue(9));
        }),
        new StaticAnalysisCheckpoint("While Loop", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byKind("while_statement"));
        }),
        new StaticAnalysisCheckpoint("Condition", (program: Program) => {
            let loopVar = findFirstConstruct(program, Predicates.byVariableInitialValue(9));
            let loop = findFirstConstruct(program, Predicates.byKind("while_statement"));
            if (!loopVar || !loop) {
                return false;
            }

            // verify loop condition contains the right variable
            if (!findFirstConstruct(loop.condition, Predicates.byIdentifierName(loopVar.name))) {
                return false;
            }

            // verify loop condition contains a number
            if (!findFirstConstruct(loop.condition, Predicates.byKind("numeric_literal_expression"))) {
                return false;
            }

            // verify loop condition contains a relational operator
            if (!findFirstConstruct(loop.condition, Predicates.byKind("relational_binary_operator_expression"))) {
                return false;
            }

            return true;
        }),
        new StaticAnalysisCheckpoint("Update Expression", (program: Program) => {
            let loopVar = findFirstConstruct(program, Predicates.byVariableInitialValue(9));
            let loop = findFirstConstruct(program, Predicates.byKind("while_statement"));
            if (!loopVar || !loop) {
                return false;
            }

            // verify loop body contains an update for the var
            return !! findFirstConstruct(loop.body, Predicates.byVariableUpdate(loopVar.name));
        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output === "9 7 5 3 1 done!\n";
        })
    ],
    "ch13_03_ex": [
        new StaticAnalysisCheckpoint("Use ++", (program: Program) => {
            return !! findConstructs(program, Predicates.byKinds(["prefix_increment_expression", "postfix_increment_expression"])).find(
                construct => construct.operator === "++"
            );
        }),
        new StaticAnalysisCheckpoint("Use --", (program: Program) => {
            return !! findConstructs(program, Predicates.byKinds(["prefix_increment_expression", "postfix_increment_expression"])).find(
                construct => construct.operator === "--"
            );
        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output === "0\n1\n2\n3\n4\n3\n2\n1\n0\ndone!\n";
        })
    ],
    "ch13_04_ex": [
        new StaticAnalysisCheckpoint("for Loop Syntax", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byKind("for_statement"));
        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output === "1 2 4 8 16 32 done!\n";
        })
    ],
    "ch13_05_ex": [
        new StaticAnalysisCheckpoint("Nested Loops", (program: Program) => {
            let outerLoop = findFirstConstruct(program, Predicates.byKinds(["for_statement", "while_statement"]));
            return !!outerLoop && !! findFirstConstruct(outerLoop.body, Predicates.byKinds(["for_statement", "while_statement"]));
        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output === "X\nXX\nXXX\nXXXX\nXXXXX\n";
        })
        
    ],
    "ch13_06_ex": [
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output === "1 5 7 11 13 done!\n";
        })
        
    ],
    "ch13_06_ex_2": [
        // no checkpoints, just an example not an exercise
    ],
    "ch14_03_ex": [
        new OutputCheckpoint("Correct Output", (output: string) => {
            return removeWhitespace(output) === removeWhitespace("X\nXX\nXXX\nXX\nX\n");
        })
        
    ],
    "ch15_ex_echo": [
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output.indexOf("Hi") !== -1
                && output.indexOf("How") !== -1
                && output.indexOf("are") !== -1
                && output.indexOf("you") !== -1
                && output.indexOf("Stop") !== -1
                && output.indexOf("Ok fine I'll stop :(") !== -1;
        }, "Hi\nHow are you\nStop\nSTOP\n")
        
    ],
    "ch15_ex_repeat": [
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output.indexOf("abababab") !== -1
                && output.indexOf("echo echo ") !== -1;
        })
        
    ],
    "ch16_ex_printDoubled": [
        new StaticAnalysisCheckpoint("Start at 0", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableInitialValue(0));
        }),
        new StaticAnalysisCheckpoint("Check against size", (program: Program, project: Project) => {
            let loop = findFirstConstruct(program, Predicates.byKinds(["while_statement", "for_statement"]));
            if (!loop) {
                return false;
            }

            // verify loop condition does NOT contain a number
            let hardcodedLimit = findFirstConstruct(loop.condition, Predicates.byKind("numeric_literal_expression"));
            if (hardcodedLimit) {
                project.addNote(new CompilerNote(loop.condition, NoteKind.STYLE, "hardcoded_vector_size",
                `Uh oh! It looks like you've got a hardcoded number ${hardcodedLimit.value.rawValue} for the loop size. This might work for the test case in main, but what if the function was called on a different vector?`));
                return false;
            }

            // verify loop condition contains a relational operator
            if (!findFirstConstruct(loop.condition, Predicates.byKind("relational_binary_operator_expression"))) {
                return false;
            }

            // if loop condition does not contain a call to vector.size() return false
            if (!findFirstConstruct(loop.condition, Predicates.byFunctionCallName("size"))) {
                return false;
            }

            // tricky - don't look for subscript expressions, since with a vector it's actually
            // an overloaded [] and we need to look for that as a function call
            let indexingOperations = findConstructs(loop.body, Predicates.byOperatorOverloadCall("[]"));

            // loop condition contains size (from before), but also has <= or >=
            // and no arithmetic operators or pre/post increments that could make up for the equal to part
            // (e.g. i <= v.size() is very much wrong, but i <= v.size() - 1 is ok)
            let conditionOperator = findFirstConstruct(loop.condition, Predicates.byKind("relational_binary_operator_expression"));
            if (conditionOperator){
                if (!findFirstConstruct(loop.condition,
                    Predicates.byKinds(["arithmetic_binary_operator_expression", "prefix_increment_expression", "postfix_increment_expression"]))) {
                    if (conditionOperator.operator === "<=" || conditionOperator.operator === ">=") {
                        if (!indexingOperations.some(indexingOp => findFirstConstruct(indexingOp,
                            Predicates.byKinds([
                                "arithmetic_binary_operator_expression",
                                "prefix_increment_expression",
                                "postfix_increment_expression"])
                            ))) {
                                project.addNote(new CompilerNote(conditionOperator, NoteKind.STYLE, "hardcoded_vector_size",
                                    `Double check the limit in this condition. I think there might be an off-by-one error that takes you out of bounds if you're using the ${conditionOperator.operator} operator.`));
                                return false;
                            }
                    }
                }
            }

            return true;
        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output.indexOf("{ 84 84 10 84 }") !== -1
        })
        
    ],
    "ch16_ex_all_negative": [
        new StaticAnalysisCheckpoint("Start at 0", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableInitialValue(0));
        }),
        new StaticAnalysisCheckpoint("Check against size", (program: Program, project: Project) => {
            // Find a loop, either while or for
            let loop = findFirstConstruct(program, Predicates.byKinds(["while_statement", "for_statement"]));
            if (!loop) {
                return false;
            }

            // Give a specific hint if loop condition does contains a number
            let hardcodedLimit = findFirstConstruct(loop.condition, Predicates.byKind("numeric_literal_expression"));
            if (hardcodedLimit) {
                project.addNote(new CompilerNote(loop.condition, NoteKind.STYLE, "hardcoded_vector_size",
                `Uh oh! It looks like you've got a hardcoded number ${hardcodedLimit.value.rawValue} for the loop size. This might work for the test case in main, but what if the function was called on a different vector?`));
                return false;
            }

            // verify loop condition contains a relational operator
            if (!findFirstConstruct(loop.condition, Predicates.byKind("relational_binary_operator_expression"))) {
                return false;
            }

            // if loop condition does not contain a call to vector.size() return false
            if (!findFirstConstruct(loop.condition, Predicates.byFunctionCallName("size"))) {
                return false;
            }

            // tricky - don't look for subscript expressions, since with a vector it's actually
            // an overloaded [] and we need to look for that as a function call
            let indexingOperations = findConstructs(loop.body, Predicates.byOperatorOverloadCall("[]"));

            // loop condition contains size (from before), but also has <= or >=
            // and no arithmetic operators or pre/post increments that could make up for the equal to part
            // (e.g. i <= v.size() is very much wrong, but i <= v.size() - 1 is ok)
            let conditionOperator = findFirstConstruct(loop.condition, Predicates.byKind("relational_binary_operator_expression"));
            if (conditionOperator){
                if (!findFirstConstruct(loop.condition,
                    Predicates.byKinds(["arithmetic_binary_operator_expression", "prefix_increment_expression", "postfix_increment_expression"]))) {
                    if (conditionOperator.operator === "<=" || conditionOperator.operator === ">=") {
                        if (!indexingOperations.some(indexingOp => findFirstConstruct(indexingOp,
                            Predicates.byKinds([
                                "arithmetic_binary_operator_expression",
                                "prefix_increment_expression",
                                "postfix_increment_expression"])
                            ))) {
                                project.addNote(new CompilerNote(conditionOperator, NoteKind.STYLE, "hardcoded_vector_size",
                                    `Double check the limit in this condition. I think there might be an off-by-one error that takes you out of bounds if you're using the ${conditionOperator.operator} operator.`));
                                return false;
                            }
                    }
                }
            }

            return true;
        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return removeWhitespace(output) === removeWhitespace("vec1 all negative? 0\nvec2 all negative? 0\nvec3 all negative? 1\n")
                || removeWhitespace(output) === removeWhitespace("vec1 all negative? false\nvec2 all negative? false\nvec3 all negative? true\n");
        })
        
    ],
    "ch17_ex_encrypt_word": [
        // new StaticAnalysisCheckpoint("Local copy of text parameter", (program: Program) => {
        //     let fn = findFirstConstruct(program, Predicates.byFunctionName("encrypt_word"));
        //     let textParam = fn?.parameters.find(p => p.type?.isCompleteClassType() && p.type.className === "string");
        //     let textParamName = textParam?.name;
        //     if (!fn || !textParam || !textParamName) { return false; }


        //     // find all local string variable definitions
        //     let localStrings = findConstructs(fn, Predicates.byKind("local_variable_definition")).filter(
        //         def => def.type.isCompleteClassType() && def.type.className === "string"
        //     );

        //     let stringAssignments = findConstructs(fn, Predicates.byKind("member_operator_overload_expression")).filter(
        //         assn => assn.receiverExpression.type.className === "string"
        //     );

        //     // one of those either needs to be initialized with "text" parameter or
        //     // later on assigned its value
        //     return localStrings.some(s => s.initializer && containsConstruct(s.initializer, Predicates.byIdentifierName(textParamName!))) ||
        //             stringAssignments.some(assn => containsConstruct(assn, Predicates.byVariableName(textParamName!)));

        // }),
        new StaticAnalysisCheckpoint("loop", (program: Program) => {
            let fn = findFirstConstruct(program, Predicates.byFunctionName("encrypt_word"));
            return !!fn && containsConstruct(fn, Predicates.byKinds(["while_statement", "for_statement"]));
        }),
        new StaticAnalysisCheckpoint("Call shift_letter()", (program: Program) => {
            let fn = findFirstConstruct(program, Predicates.byFunctionName("encrypt_word"));
            let call = fn && findFirstConstruct(fn, Predicates.byFunctionCallName("shift_letter"));
            return !!call?.isSuccessfullyCompiled();

        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output.indexOf("mjqqt") !== -1;
        })
    ],
    "ch17_ex_unit_testing": [
        new StaticAnalysisCheckpoint("Add 3 more test cases (6 total)", (program: Program) => {
            let main = findFirstConstruct(program, Predicates.byFunctionName("main"));
            if (!main) { return false; }
            return findConstructs(main, Predicates.byKind("magic_function_call_expression")).filter(
                call => call.functionName === "assert"
            ).length >= 6;

        })
    ],
    "ch18_ex_printRover": [
        new StaticAnalysisCheckpoint("Print type", (program: Program, project: Project) => {
            let printRover = findFirstConstruct(program, Predicates.byFunctionName("printRover"));
            if (!printRover) { return false; }

            // Give a specific hint if they accidentally use cout in the function
            let cout = findFirstConstruct(printRover, Predicates.byIdentifierName("cout"));
            if (cout) {
                project.addNote(new CompilerNote(cout, NoteKind.STYLE, "cout_in_ostream_function",
                `Oops! This is a very easy mistake to make, since we're all so used to typing cout. But printRover() takes in a particular ostream parameter called 'output', and you should make sure to send your output through that stream (in case it turns out to be different from cout).`));
                return false;
            }

            return findConstructs(printRover, Predicates.byKind("output_operator_expression")).some(
                operator => operator.operator === "<<" && containsConstruct(operator.right, Predicates.byMemberAccessName("type"))
            );
        }),
        new StaticAnalysisCheckpoint("Print id", (program: Program) => {
            let printRover = findFirstConstruct(program, Predicates.byFunctionName("printRover"));
            if (!printRover) { return false; }
            return findConstructs(printRover, Predicates.byKind("non_member_operator_overload_expression")).some(
                operator => operator.operator === "<<" && containsConstruct(operator, Predicates.byMemberAccessName("id"))
            );
        }),
        new StaticAnalysisCheckpoint("Print charge", (program: Program) => {
            let printRover = findFirstConstruct(program, Predicates.byFunctionName("printRover"));
            if (!printRover) { return false; }
            return findConstructs(printRover, Predicates.byKind("output_operator_expression")).some(
                operator => operator.operator === "<<" && containsConstruct(operator.right, Predicates.byMemberAccessName("charge"))
            );
        }),
        new OutputCheckpoint("Correct Output (and formatting)", (output: string) => {
            return removeWhitespace(output) === removeWhitespace("Type 1 Rover #a238 (80%)")
        })
    ],
    "ch19_ex_printVecOfInts": [
        new StaticAnalysisCheckpoint("Start at 0", (program: Program) => {
            return !! findFirstConstruct(program, Predicates.byVariableInitialValue(0));
        }),
        new StaticAnalysisCheckpoint("Check against size", (program: Program, project: Project) => {
            let loop = findFirstConstruct(program, Predicates.byKinds(["while_statement", "for_statement"]));
            if (!loop) {
                return false;
            }

            // verify loop condition does NOT contain a number
            let hardcodedLimit = findFirstConstruct(loop.condition, Predicates.byKind("numeric_literal_expression"));
            if (hardcodedLimit) {
                project.addNote(new CompilerNote(loop.condition, NoteKind.STYLE, "hardcoded_vector_size",
                `Uh oh! It looks like you've got a hardcoded number ${hardcodedLimit.value.rawValue} for the loop size. This might work for the test case in main, but what if the function was called on a different vector?`));
                return false;
            }

            // verify loop condition contains a relational operator
            if (!findFirstConstruct(loop.condition, Predicates.byKind("relational_binary_operator_expression"))) {
                return false;
            }

            // if loop condition does not contain a call to vector.size() return false
            if (!findFirstConstruct(loop.condition, Predicates.byFunctionCallName("size"))) {
                return false;
            }

            // tricky - don't look for subscript expressions, since with a vector it's actually
            // an overloaded [] and we need to look for that as a function call
            let indexingOperations = findConstructs(loop.body, Predicates.byOperatorOverloadCall("[]"));

            // loop condition contains size (from before), but also has <= or >=
            // and no arithmetic operators or pre/post increments that could make up for the equal to part
            // (e.g. i <= v.size() is very much wrong, but i <= v.size() - 1 is ok)
            let conditionOperator = findFirstConstruct(loop.condition, Predicates.byKind("relational_binary_operator_expression"));
            if (conditionOperator){
                if (!findFirstConstruct(loop.condition,
                    Predicates.byKinds(["arithmetic_binary_operator_expression", "prefix_increment_expression", "postfix_increment_expression"]))) {
                    if (conditionOperator.operator === "<=" || conditionOperator.operator === ">=") {
                        if (!indexingOperations.some(indexingOp => findFirstConstruct(indexingOp,
                            Predicates.byKinds([
                                "arithmetic_binary_operator_expression",
                                "prefix_increment_expression",
                                "postfix_increment_expression"])
                            ))) {
                                project.addNote(new CompilerNote(conditionOperator, NoteKind.STYLE, "hardcoded_vector_size",
                                    `Double check the limit in this condition. I think there might be an off-by-one error that takes you out of bounds if you're using the ${conditionOperator.operator} operator.`));
                                return false;
                            }
                    }
                }
            }

            return true;
        }),
        new OutputCheckpoint("Correct Output", (output: string) => {
            return removeWhitespace(output).indexOf(removeWhitespace("{ 1 2 3 4 5 }")) !== -1
                && removeWhitespace(output).indexOf(removeWhitespace("{ 0 -5 94 16 }")) !== -1;
        })
        
    ],
    "eecs280_ex_swap_by_pointer": [
        new OutputCheckpoint("Correct Output", (output: string) => {
            return output.indexOf("a = 5") !== -1
                && output.indexOf("b = 3") !== -1;
        })
        
    ],
}