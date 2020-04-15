import { CPPConstruct } from "./constructs";
import { Program, TranslationUnit } from "./Program";
import {
    AssignmentExpression,
    AnalyticBinaryOperatorExpression,
    NumericLiteralExpression,
    IdentifierExpression,
    AnalyticExpression,
} from "./expressions";
import { CPPError, Note, NoteKind, CompilerNote } from "./errors";
import { Constructor } from "../util/util";
import { FunctionCallExpression } from "./functionCall";
import {
    VariableDefinition,
    FunctionDefinition,
    LocalVariableDefinition,
    TypedLocalVariableDefinition,
} from "./declarations";
import { DirectInitializer } from "./initializers";
import {
    ForStatement,
    CompiledForStatement,
    UnsupportedStatement,
    WhileStatement,
} from "./statements";
import {
    BoundedArrayType,
    isBoundedArrayType,
    ObjectType,
    Type,
    ReferenceType,
    isVoidType,
    isAtomicType,
    isObjectType,
    isClassType,
    isIntegralType,
    isPointerType,
    isFunctionType,
    isType,
    Int,
    sameType,
    Double,
} from "./types";
import { Expression } from "./expressionBase";
import { Predicates, AnalyticConstruct } from "./predicates";
import { commands } from "codemirror";

export type CPPConstructTest<Original extends CPPConstruct, T extends Original> = (
    construct: Original
) => construct is T;

export type CPPConstructFunctor<T extends CPPConstruct> = (construct: T) => void;

export function constructTest<Original extends CPPConstruct, T extends Original>(
    constructClass: Function & { prototype: T }
) {
    return <CPPConstructTest<Original, T>>(
        ((construct: Original) => construct instanceof constructClass)
    );
}

// export function compiledConstructTest<Original extends CPPConstruct, T extends Original>(constructClass: Function & { prototype: T }) {
//     return <CPPConstructTest<Original, T["t_compiled"]>>((construct: Original) => construct instanceof constructClass && construct.isSuccessfullyCompiled());
// }

export function exploreConstructs<T extends CPPConstruct>(
    root: CPPConstruct | TranslationUnit | Program,
    test: CPPConstructTest<CPPConstruct, T>,
    fn: CPPConstructFunctor<T>
) {
    if (root instanceof Program) {
        for (let tuName in root.translationUnits) {
            exploreConstructs(root.translationUnits[tuName], test, fn);
        }
        return;
    }

    if (root instanceof TranslationUnit) {
        root.topLevelDeclarations.forEach(decl => exploreConstructs(decl, test, fn));
        return;
    }

    if (test(root)) {
        fn(root);
    }

    root.children.forEach(child => exploreConstructs(child, test, fn));
}

export function findConstructs<T extends AnalyticConstruct>(
    root: CPPConstruct | TranslationUnit | Program,
    test: CPPConstructTest<AnalyticConstruct, T>
) {
    let found: T[] = [];
    exploreConstructs(root, test, (matchedConstruct: T) => {
        found.push(matchedConstruct);
    });
    return found;
}

export function findFirstConstruct<T extends AnalyticConstruct>(
    root: CPPConstruct | TranslationUnit | Program,
    test: CPPConstructTest<AnalyticConstruct, T>
) {
    return findConstructs(root, test)[0];
}

// type TypedFilterable<Original extends CPPConstruct, Narrowed extends Original> = Original & {
//     typedPredicate<T extends Type>(typePredicate: (o: Type) => o is T) : (decl: Original) => decl is Narrowed;
// }

// export function filterConstructsByType<T extends Type, Original extends CPPConstruct, Narrowed extends Original>(typePredicate: (o: Type) => o is T, constructs: readonly Original[] & readonly TypedFilterable<Original, Narrowed>[]) {
//     if (constructs.length === 0) {
//         return [];
//     }

//     return constructs.filter(createTypeConstructFilter(typePredicate));
// }

// // export function createTypeConstructFilter<OriginalT extends Type, T extends OriginalT>(typePredicate: (o: OriginalT) => o is T) {
// //     return <Original extends CPPConstruct, Narrowed extends Original>(arr: readonly (OriginalT & TypedFilterable<Original, Narrowed, OriginalT>)[]) => arr.filter(typePredicate);
// // }

// interface TypeConstructFilter<Original extends CPPConstruct, Narrowed extends Original> {
//     (original: Original) : original is Narrowed;
// }

// export function createTypeConstructFilter<OriginalT extends Type, T extends OriginalT>(typePredicate: (o: OriginalT) => o is T) {
//     return <Original extends CPPConstruct, Narrowed extends Original>(original: TypedFilterable<Original, Narrowed, OriginalT>) => original.typedPredicate(typePredicate)(original);
// }

// export function filterConstructs<Original extends CPPConstruct, T extends Original>(constructs: readonly Original[], test: CPPConstructTest<Original, T>) {
//     return constructs.filter(test);
// }

// Why is explicit type declaration necessary? otherwise I get string can't be used to index into object of type blah
export const projectAnalyses: { [projectName: string]: (p: Program) => void } = {
    "Test Project": analyze,
};

// TODO probably move to predicates.ts
function isUpdateAssignment(exp: AnalyticConstruct): exp is AssignmentExpression {
    let lhs: IdentifierExpression;
    return (
        Predicates.byKind("assignment_expression")(exp) &&
        Predicates.byKind("identifier_expression")(exp.lhs) &&
        (lhs = exp.lhs) &&
        findConstructs(exp.rhs, Predicates.byIdentifierName(lhs.name)).length !== 0
    );
}

// TODO predicate for increment statement so that it can be used in findConstructs
function findIncrementStatements(construct: CPPConstruct) {
    // Proof of concept one-liner
    /* let inc = findConstructs(loop,
        // Predicates.byKinds(["prefix_increment_expression", "prefix_decrement_expression",
        //                     "postfix_increment_expression", "postfix_decrement_expression",
        //                     "compound_assignment_expression"]) ||
        (e) : e is IdentifierExpression | AssignmentExpression => Predicates.byKind("identifier_expression")(e) ||
        isUpdateAssignment(e)
        ); */

    // Find increments -> includes post/prefix inc/dec, compound assg, all constructs for which isUpdateAssignment returns true for
    // As of right now, only update assignments are implemented, so TODO is also include the others
    return findConstructs(construct, isUpdateAssignment);
}

// ASK JAMES -> ok to have CPPConstruct param type? Is there a better fit for this? (AnalyticConstruct caused analyzer errors)
function hasIncrement(construct: CPPConstruct) {
    return findIncrementStatements(construct).length !== 0; // TODO include other incr types when they're implemented
}

function hasDoubleIncrement(loop: ForStatement) {
    const inc1 = findIncrementStatements(loop.body).pop(); // Assuming the last update assg is the increment
    return (
        inc1 &&
        // Need to check that names equal to reject case where there are two update assgs that refer to different names
        findFirstConstruct(inc1.lhs, Predicates.byKind("identifier_expression")).name ===
            findFirstConstruct(
                findIncrementStatements(loop.post)[0].lhs,
                Predicates.byKind("identifier_expression")
            ).name
    );
}

// TODO add cases for <=, >, >=
function offByOneCondition(loop: ForStatement | WhileStatement, bound: number) {
    const loop_bound = findFirstConstruct(
        loop.condition,
        Predicates.byKind("numeric_literal_expression")
    );
    return Math.abs(bound - loop_bound.value.rawValue) === 1;
}

function checkOffByOneCondition(loop: ForStatement | WhileStatement, bound: number) {
    if (offByOneCondition(loop, bound)) {
        loop.condition.addNote(
            new CompilerNote(
                loop.condition,
                NoteKind.ERROR,
                "loop_condition_off_by_one",
                "It seems like the condition of your loop may be slightly off."
            )
        );
    }
}

function eecs183_l03_03(program: Program) {
    // Find average function
    let avgFunc = findFirstConstruct(program, Predicates.byFunctionName("average"));
    if (!avgFunc) {
        return;
    }

    // Check function params -> TODO should probably be common helper
    let params = avgFunc.parameters;
    if (params.length !== 2) {
        avgFunc.addNote(
            new CompilerNote(
                avgFunc,
                NoteKind.ERROR,
                "EECS183.L04_02.incorrect_param_count",
                "Need 2 params."
            )
        );
    } else {
        params.forEach(param => {
            if (param.type && !sameType(param.type, Double.DOUBLE)) {
                param.addNote(
                    new CompilerNote(
                        param,
                        NoteKind.ERROR,
                        "EECS183.L04_02.incorrect_param_count",
                        "Incorrect param type."
                    )
                );
            }
        });
    }

    // Check for lack of return statement -> TODO should probably be common helper
    // let localVars = findConstructs(avgFunc, Predicates.byKind("local_variable_definition"));
    let returnStatement = findConstructs(avgFunc, Predicates.byKind("return_statement"));
    if (!returnStatement) {
        avgFunc.addNote(
            new CompilerNote(
                avgFunc,
                NoteKind.ERROR,
                "EECS183.L04_02.no_return_stmt",
                "No return stmt found."
            )
        );
    }

    // Ensure student enters correct return type to function
    let retType = avgFunc.type.returnType;
    if (!sameType(retType, Double.DOUBLE)) {
        avgFunc.addNote(
            new CompilerNote(
                avgFunc,
                NoteKind.ERROR,
                "EECS183.L04_02.incorrect_return_type",
                "Return type should be double."
            )
        );
    }

    // Check that the student wraps division in parens
    findConstructs(avgFunc, Predicates.byKind("arithmetic_binary_operator_expression")).forEach(
        op => {
            if (op.operator === "+") {
                (<AnalyticExpression[]>op.children)
                    .filter(Predicates.byKind("arithmetic_binary_operator_expression"))
                    .filter(childOp => childOp.operator === "/")
                    .forEach(childOp =>
                        childOp.addNote(
                            new CompilerNote(
                                childOp,
                                NoteKind.ERROR,
                                "EECS183.L04_02.order_of_operations",
                                "Use parentheses!"
                            )
                        )
                    );
            }
        }
    );

    // TODO Find local variable ints initialized by a narrowing conversion from a double
    // localVars.filter(Predicates.byTypedDeclaration(isType(Int)))
    //     .filter(def => {
    //         let init = def.initializer;
    //         if(init && init instanceof AtomicDirectInitializer) {
    //             let arg = init.arg;
    //             if (arg && Predicates.byKind("ImplicitConversion")(<AnalyticExpression>arg)) {
    //                 arg.from.type == int
    //                 arg.toType == double
    //             }
    //         }
    //     });
}

function checkIncrements(loop: ForStatement | WhileStatement) {
    if (!hasIncrement(loop)) {
        loop.addNote(
            new CompilerNote(
                loop,
                NoteKind.ERROR,
                "no_loop_increment",
                "Loop doesn't have an increment!"
            )
        );
    } else if (Predicates.byKind("for_statement")(loop) && hasDoubleIncrement(loop)) {
        loop.addNote(
            new CompilerNote(
                loop,
                NoteKind.ERROR,
                "double_loop_increment",
                "Loop has two increments!"
            )
        );
    }
}

function eecs183_l07_01(program: Program) {
    const loop = findFirstConstruct(
        program,
        Predicates.byKinds(["for_statement", "while_statement"])
    );
    if (!loop) {
        return;
    }

    checkIncrements(loop);
    checkOffByOneCondition(loop, 4);
}

function eecs183_l08_01(program: Program) {
    const loop = findFirstConstruct(
        program,
        Predicates.byKinds(["for_statement", "while_statement"])
    );
    if (!loop) return;

    checkIncrements(loop);
    checkOffByOneCondition(loop, 0);

    const cond_name = findFirstConstruct(
        loop.condition,
        Predicates.byKind("identifier_expression")
    );
    if (cond_name.name === "base") {
        cond_name.addNote(
            new CompilerNote(
                cond_name,
                NoteKind.ERROR,
                "eecs183.L08.01.base_in_loop_condition",
                // ASK JAMES -> have this case be specifically for uses of base, or just anything that isn't exponent?
                "Think about how many times you should be doing the multiplication. Is base the right number to use here?"
            )
        );
    }

    const pow_fn = findFirstConstruct(program, Predicates.byFunctionName("pow"));
    const result_var = findFirstConstruct(
        findFirstConstruct(pow_fn, Predicates.byKind("local_variable_definition")),
        Predicates.byKind("numeric_literal_expression")
    );
    if (result_var && result_var.value.rawValue !== 1) {
        result_var.addNote(
            new CompilerNote(
                result_var,
                NoteKind.ERROR,
                "eecs183.L08.01.result_var_not_started_at_one",
                `Try starting your result variable at 1 instead of ${result_var.value.rawValue}`
            )
        );
    }

    const mult = findFirstConstruct(loop.body, isUpdateAssignment);
    if (!mult) return;
    const operation = findFirstConstruct(
        mult,
        Predicates.byKind("arithmetic_binary_operator_expression")
    );
    const base = findFirstConstruct(mult, Predicates.byIdentifierName("base"));
    if (operation.operator !== "*") {
        mult.addNote(
            new CompilerNote(
                mult,
                NoteKind.ERROR,
                "eecs183.l08.01.no_multiplication",
                "Multiplication may be useful for doing this computation."
            )
        );
    }
    if (!base) {
        mult.addNote(
            new CompilerNote(
                mult,
                NoteKind.ERROR,
                "eecs183.l08.01.not_using_base",
                "Think about how exponents work. What value should you multiply by each time?"
            )
        );
    }
}

function eecs183_l10_01(program: Program) {
    const triple = findFirstConstruct(program, Predicates.byFunctionName("triple"));
    if (!triple) return;

    const return_stmt = findFirstConstruct(triple, Predicates.byKind("return_statement"));
    if (return_stmt) {
        return_stmt.addNote(
            new CompilerNote(
                return_stmt,
                NoteKind.ERROR,
                "eecs183.l10.01.return_stmt_in_triple",
                "You shouldn't need to return from this function. How else could you modify to_triple from this function?"
            )
        );
    }

    if (triple.parameters.length !== 1) {
        triple.addNote(
            new CompilerNote(
                triple,
                NoteKind.ERROR,
                "incorrect_param_count",
                `It looks like you ${
                    triple.parameters.length > 1 ? "have too many" : "don't have enough"
                } parameters in ${triple.name}.`
            )
        );
    } else {
        if (!(triple.parameters[0].type instanceof ReferenceType)) {
            triple.parameters[0].addNote(
                new CompilerNote(
                    triple.parameters[0],
                    NoteKind.ERROR,
                    "eecs183.l10.01.fn_param_not_reference_type",
                    "Function param is not a reference!"
                )
            );
        }
    }

    const main = findFirstConstruct(program, Predicates.byFunctionName("main"));
    const assg = findFirstConstruct(main, Predicates.byKind("assignment_expression"));
    if (assg && findConstructs(assg.rhs, Predicates.byKind("function_call_expression"))) {
        assg.addNote(
            new CompilerNote(
                assg,
                NoteKind.ERROR,
                "eecs183.l10.01.assigning_from_triple_call",
                "It looks like you're trying to change to_triple by assigning it the return value of triple. You shouldn't need to do this. Think about how you could use a reference to do this instead."
            )
        );
    }

    const triple_call = findFirstConstruct(main, Predicates.byKind("function_call_expression"));
    if (!triple_call || triple_call.call?.func.name !== "triple") return;
    const arg = findFirstConstruct(triple_call, Predicates.byKind("address_of_expression"));
    if (arg) {
        arg.addNote(
            new CompilerNote(
                arg,
                NoteKind.ERROR,
                "eecs183.l10.01.passes_address_of_to_triple",
                "When you pass a variable by reference into a function, you don't need to pass the address of that variable."
            )
        );
    }
}

function analyze(program: Program) {
    const swap = findFirstConstruct(program, Predicates.byFunctionName("swap"));
    if (!swap) return;

    // Check correctness of params
    if (swap.parameters.length !== 2) {
        swap.addNote(
            new CompilerNote(
                swap,
                NoteKind.ERROR,
                "eecs183.l10.02.swap_incorrect_param_count",
                "Incorrect number of params!"
            )
        );
    } else {
        swap.parameters.forEach(param => {
            if (!(param.type instanceof ReferenceType)) {
                param.addNote(
                    new CompilerNote(
                        param,
                        NoteKind.ERROR,
                        "eecs183.l10.02.swap_incorrect_param_type",
                        "Incorrect swap param types!"
                    )
                );
            }
        });
    }

    // Check for use of a temp variable in swap operation
    const assignments = findConstructs(swap, Predicates.byKind("assignment_expression"));
    if (
        assignments.length >= 2 &&
        !findFirstConstruct(swap, Predicates.byKind("local_variable_definition"))
    ) {
        assignments.forEach(assg => {
            assg.addNote(
                new CompilerNote(
                    assg,
                    NoteKind.ERROR,
                    "eecs183.l10.02.missing_temp_var_in_swap",
                    "It's just a guess, but one of these assignments might end up accidentally overwriting some important data when you run your code. Check out the simulation to see ;)."
                )
            );
        });
    }
}

// export function analyze(program: Program) {

//     let swapPtdInts = findConstructs(program, constructTest(FunctionDefinition))
//         .find(def => def.declaration.name === "swap");
//     let main = findConstructs(program, constructTest(FunctionDefinition))
//         .find(def => def.declaration.name === "main");

//     if (!swapPtdInts || !main) {
//         return;
//     }

//     let assignments = findConstructs(swapPtdInts, constructTest(AssignmentExpression));
//     let pointerAssignments = findConstructs(swapPtdInts, constructTest(AssignmentExpression))
//         .filter(assn => assn.isPointerTyped());

//     let localDefs = findConstructs(swapPtdInts, constructTest(VariableDefinition));
//     let pointerDefs = localDefs.filter(def => def.type && def.type.isPointerType());
//     let nonPointerDefs = localDefs.filter(def => def.type && !def.type.isPointerType());

//     let passByValueParams = swapPtdInts.parameters.filter(
//         param => param.type && param.type.isObjectType() && !param.type.isPointerType()
//     );

//     // Heuristic 1
//     // At least two assignments, but no variable declarations. Forgot a temporary?
//     if (assignments.length >= 2 && localDefs.length == 0) {
//         assignments.forEach(assn => assn.addNote(new CompilerNote(assn, NoteKind.STYLE, "analysis.1", "It's just a guess, but one of these assignments might end up accidentally overwriting some important data when you run your code. Check out the simulation to see ;).")));
//     }

//     // Heuristic 2
//     // Only one variable declaration and it's a pointer. Also at least one assignment in terms of pointers.
//     if (program.isRunnable() && localDefs.length === 1
//         && localDefs[0].type && localDefs[0].type.isPointerType()
//         && pointerAssignments.length >= 1) {

//         swapPtdInts.declaration.addNote(new CompilerNote(swapPtdInts.declaration, NoteKind.STYLE, "analysis.2", "Check out the visualization of your code. What kinds of things are being swapped? Is it the arrows (i.e. pointers) or the values? Which do you want? What does that mean about where you should have the * operator in your code?"));
//     }

//     // Heuristic 3
//     // Declare a non-pointer but assign a pointer to it.
//     nonPointerDefs.filter(def => {
//         return def.initializer && def.initializer instanceof DirectInitializer && def.initializer.args[0].isPointerTyped();
//     }).forEach(def => {
//         def.addNote(new CompilerNote(def, NoteKind.STYLE, "analysis.3",
//             `This line is trying to put an address into a variable that declared to hold ${def.type!.englishString(false)} value. Pointers (which have addresses for values) can't be stored into variables that hold plain values.`));
//     });

//     // Heuristic 4
//     // Parameters that are pass-by-value (and not pass-by-pointer)
//     if (program.isRunnable() && assignments.length >= 2) {
//         if (passByValueParams.length >= 2) {

//             swapPtdInts.declaration.addNote(new CompilerNote(swapPtdInts.declaration, NoteKind.STYLE, "analysis.4",
//                 `It looks like you've got a fair bit of code written to do the swap. But take a moment now to go ahead and simulate what you have. Look at the variables on the stack frames for main and your swap function as it runs. Are the variables in main getting changed, as desired? If not, why not? Does it have anything to do with the way you're passing the function parameters?`));
//         }
//     }

//     // Heuristic 5
//     // Pass by value paramParam in swap with same name as param in main
//     passByValueParams.filter(
//         param => findConstructs(main!, constructTest(VariableDefinition)).find(def => def.name === param.name)
//     ).forEach(
//         param => param.addNote(new CompilerNote(param, NoteKind.STYLE, "analysis.4",
//             `Note that the parameter ${param.name} is not the same variable as the ${param.name} declared in main(). The two variables have different scopes and correspond to separate objects at runtime.`))
//     );

//     // for (let tuName in program.translationUnits) {
//     //     program.translationUnits[tuName].topLevelDeclarations.forEach(
//     //         decl => exploreConstructs(decl,
//     //             constructTest(AssignmentExpression),
//     //             (assn: AssignmentExpression) => assn.addNote(CPPError.lobster.unsupported_feature(assn, "crabs"))
//     //         )
//     //     );
//     // }
// }

// function analyze2(program: Program) {

//     // 1. Find all local variable definitions in the program
//     let pointerTypedConstructs = findConstructs(program, Predicates.byTypedExpression(isPointerType));
//     let localDefs = findConstructs(program, Predicates.byKinds(["local_variable_definition", "global_variable_definition"]));

//     // 2. Narrow those down to only the ones that define pointer variables
//     let pointerDefs = findConstructs(program, Predicates.byTypedDeclaration(isPointerType))
//         .filter(Predicates.byKind("local_variable_definition"));
//     let pointerDef2 = localDefs.filter(Predicates.byTypedDeclaration(isPointerType));

//     // 3. Find everything with a function type (e.g. a parentheses expression around a function identifier)
//     let funcDecls2 = findConstructs(program, Predicates.byTypedExpression(isFunctionType));

//     // 4. An impossible ask, filter our pointer definitions down to those with class type.
//     //    Our predicates are smart enough to rule this out! The type returned from filter is never[]!
//     let whichPointerDefsAreSecretlyClasses = pointerDefs.filter(Predicates.byTypedDeclaration(isClassType));

//     // 5.a. Find all logical binary operators
//     let binOps = findConstructs(program, Predicates.byKind("logical_binary_operator_expression"));
//     let t5 = binOps[0].type; // type is Bool

//     // type of left5 is Expression. While the compiler knows a logical binary operator (e.g. &&) will always
//     // yield a bool, it doesn't know that the operands it was given are any particular type
//     let left5 = binOps[0].left;
// }

// function analyze2(program: Program) {

//     // 1. Find all local variable definitions in the program
//     let pointerTypedConstructs = findConstructs(program, Predicates.byTypedExpression(isPointerType));
//     let localDefs = findConstructs(program, Predicates.byKind("local_variable_definition"));

//     // 2. Narrow those down to only the ones that define pointer variables
//     let pointerDefs = pointerTypedConstructs.filter(Predicates.byKind("local_variable_definition"));
//     let pointerDef2 = localDefs.filter(Predicates.byTypedExpression(isPointerType));

//     // 3. Find everything with a function type. This could be a function declaration or definition,
//     // or curiously enough some kinds of expressions (e.g. a parentheses expression around a function identifier)
//     let funcDecls2 = findConstructs(program, Predicates.byTypedExpression(isFunctionType));

//     // 4. An impossible ask, filter our pointer definitions down to those with class type.
//     //    Our predicates are smart enough to rule this out! The type returned from filter is never[]!
//     let whichPointerDefsAreSecretlyClasses = pointerDefs.filter(Predicates.byTypedExpression(isClassType));

//     // 5.a. Find all logical binary operators
//     let binOps = findConstructs(program, Predicates.byKind("logical_binary_operator_expression"));
//     let t5 = binOps[0].type; // type is Bool

//     // type is Expression. While the compiler knows a logical binary operator (e.g. &&) will always
//     // yield a bool, it doesn't know that the operands it was given are any particular type
//     let left5 = binOps[0].left;

//     // 5.b.
//     // let compiledBinOps = binOps.filter();

//     // let forLoops = findConstructs(program, Predicates.byKind("for_statement"));
//     // forLoops.forEach(forLoop => {
//     //     forLoop.condition // <--- Type of .condition here is Expression
//     //     forLoop.condition.type
//     //     // ^ Type of .type here is VoidType | AtomicType | BoundedArrayType<ArrayElemType> |
//     //     //                         ClassType | FunctionType | ReferenceType<ObjectType> |
//     //     //                         ArrayOfUnknownBoundType<ArrayElemType> | undefined

//     //     if (forLoop.isSuccessfullyCompiled()) { // Inside this if, TS does type inference based on a proper for loop
//     //         forLoop.condition // <--- Type of .condition here is CompiledExpression<Bool, "prvalue">
//     //         forLoop.condition.type // <--- Type of .type here is Bool

//     //     }
//     // });

//     // let x!: never;
//     // let y = 3 / x;
//     // // // let arrayDefs = filterConstructsByType<LocalVariableDefinition, TypedLocalVariableDefinition<ObjectType | ReferenceType>, ObjectType | ReferenceType, BoundedArrayType>(isBoundedArrayType, varDefs);
//     // // // arrayDefs[0].type
//     // // let arrayDefs = filterConstructsByType<BoundedArrayType>(isBoundedArrayType, varDefs);
//     // arrayDefs[0].type.length
//     // let x!: LocalVariableDefinition;

//     // if (x.isTypedDeclaration(isBoundedArrayType)()) {
//     //     x.type
//     // }

//     // isBoundedArrayTypedDeclaration(x);
//     // let blah = varDefs.filter(isBoundedArrayTypedDeclaration);
//     // blah[0].type
//     // arrayDefs[0].type
//     // if (arrayDefs.length === 0) {
//     //     return;
//     // }
//     // let arrayDef = arrayDefs[0];
//     // if (!arrayDef.isBoundedArrayTyped()) {
//     //     return;
//     // }
//     // let arraySize = arrayDef.type.length;

//     // // let forLoops = findConstructs(program, constructTest(ForStatement));
//     // // let compiledForLoops = forLoops.filter(isSuccessfullyCompiled);
//     // let compiledForLoops = findConstructs(program, compiledConstructTest(ForStatement));

//     // let targets = compiledForLoops.filter((fl) => {
//     //     let cond = fl.condition;
//     //     if (!(cond instanceof BinaryOperatorExpression)) {
//     //         return false;
//     //     }
//     //     return cond.operator === "<=" && cond.right instanceof NumericLiteralExpression && cond.right.value.rawValue === arraySize;
//     // });
//     // targets.forEach(target => target.addNote(new CompilerNote(target, NoteKind.WARNING, "blah", "Oops")));

//     // let test!: AssignmentExpression[];
//     // let sdf = test.filter((t) => t.isBoundedArrayTyped());

// }
