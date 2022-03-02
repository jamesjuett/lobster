import { CPPConstruct } from "../core/CPPConstruct";
import { Program, TranslationUnit } from "../core/Program";
import { AssignmentExpression, AnalyticBinaryOperatorExpression, NumericLiteralExpression, IdentifierExpression, AnalyticExpression } from "../core/expressions";
import { CPPError, Note, NoteKind, CompilerNote } from "../core/errors";
import { Constructor } from "../util/util";
import { FunctionCallExpression } from "../core/FunctionCallExpression";
import { VariableDefinition, FunctionDefinition, LocalVariableDefinition, TypedLocalVariableDefinition } from "../core/declarations";
import { DirectInitializer } from "../core/initializers";
import { ForStatement, CompiledForStatement, UnsupportedStatement } from "../core/statements";
import { BoundedArrayType, isBoundedArrayType, CompleteObjectType, Type, ReferenceType, isVoidType, isAtomicType, isCompleteObjectType, isPotentiallyCompleteClassType, isIntegralType, isPointerType, isFunctionType, isType, Int, sameType, Double } from "../core/types";
import { Expression } from "../core/expressionBase";
import { Predicates, AnalyticConstruct } from "../core/predicates";
import { isUnqualifiedIdentifier } from "../core/lexical";

export type CPPConstructTest<Original extends CPPConstruct, T extends Original> = (construct: Original) => construct is T;

export type CPPConstructFunctor<T extends CPPConstruct> = (construct: T, stop: () => void ) => void;

export function constructTest<Original extends CPPConstruct, T extends Original>(constructClass: Function & { prototype: T }) {
    return <CPPConstructTest<Original, T>>((construct: Original) => construct instanceof constructClass);
}

export function exploreConstructs<T extends CPPConstruct>(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: CPPConstructTest<CPPConstruct, T>, fn: CPPConstructFunctor<T>, keepGoing?: {b: boolean}) : void;
export function exploreConstructs(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: CPPConstruct) => boolean, fn: CPPConstructFunctor<CPPConstruct>, keepGoing?: {b: boolean}) : void;
export function exploreConstructs(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: AnalyticConstruct) => boolean, fn: CPPConstructFunctor<AnalyticConstruct>, keepGoing?: {b: boolean}) : void;
export function exploreConstructs(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: AnalyticConstruct) => boolean, fn: CPPConstructFunctor<AnalyticConstruct>, keepGoing: {b: boolean} = {b: true}) {

    if (root instanceof Program) {
        for (let tuName in root.translationUnits) {
            exploreConstructs(root.translationUnits[tuName], test, fn, keepGoing);
        }
        return;
    }

    if (root instanceof TranslationUnit) {
        root.topLevelDeclarations.forEach(decl => exploreConstructs(decl, test, fn, keepGoing));
        return;
    }

    if (Array.isArray(root)) {
        root.forEach(r => exploreConstructs(r, test, fn, keepGoing));
        return;
    }

    if (keepGoing.b && test(<AnalyticConstruct>root)) {
        fn(<AnalyticConstruct>root, () => { keepGoing.b = false; });
    }

    root.children.forEach(child => exploreConstructs(child, test, fn, keepGoing));
}

export function findConstructs<T extends AnalyticConstruct>(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: CPPConstructTest<AnalyticConstruct, T>) : T[];
export function findConstructs(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: CPPConstruct) => boolean) : CPPConstruct[];
export function findConstructs(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: AnalyticConstruct) => boolean) : AnalyticConstruct[];
export function findConstructs(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: AnalyticConstruct) => boolean) {
    let found: CPPConstruct[] = [];
    exploreConstructs(root, test, (matchedConstruct: CPPConstruct) => {
        found.push(matchedConstruct);
    });
    return found;
}

export function findFirstConstruct<T extends AnalyticConstruct>(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: CPPConstructTest<AnalyticConstruct, T>) : T | undefined;
export function findFirstConstruct(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: CPPConstruct) => boolean) : CPPConstruct | undefined;
export function findFirstConstruct(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: AnalyticConstruct) => boolean) : AnalyticConstruct | undefined;
export function findFirstConstruct(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: AnalyticConstruct) => boolean) {
    let found: CPPConstruct | undefined;
    exploreConstructs(root, test, (matchedConstruct: CPPConstruct, stop: () => void) => {
        found = matchedConstruct;
        stop();
    });
    return found;
}

export function containsConstruct<T extends AnalyticConstruct>(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: CPPConstructTest<AnalyticConstruct, T>) : boolean;
export function containsConstruct(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: CPPConstruct) => boolean) : boolean;
export function containsConstruct(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: AnalyticConstruct) => boolean) : boolean;
export function containsConstruct(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: AnalyticConstruct) => boolean) {
    return !!findFirstConstruct(root, test);
}



function analyze2(program: Program) {

    // 1. Find all local variable definitions in the program
    let pointerTypedConstructs = findConstructs(program, Predicates.byTypedExpression(isPointerType));
    let localDefs = findConstructs(program, Predicates.byKinds(["local_variable_definition", "global_variable_definition"]));

    // 2. Narrow those down to only the ones that define pointer variables
    let pointerDefs = findConstructs(program, Predicates.byTypedDeclaration(isPointerType))
        .filter(Predicates.byKind("local_variable_definition"));
    let pointerDef2 = localDefs.filter(Predicates.byTypedDeclaration(isPointerType));

    // 3. Find everything with a function type (e.g. a parentheses expression around a function identifier)
    let funcDecls2 = findConstructs(program, Predicates.byTypedExpression(isFunctionType));

    // 4. An impossible ask, filter our pointer definitions down to those with class type.
    //    Our predicates are smart enough to rule this out! The type returned from filter is never[]!
    let whichPointerDefsAreSecretlyClasses = pointerDefs.filter(Predicates.byTypedDeclaration(isPotentiallyCompleteClassType));

    // 5.a. Find all logical binary operators
    let binOps = findConstructs(program, Predicates.byKind("logical_binary_operator_expression"));
    let t5 = binOps[0].type; // type is Bool

    // type of left5 is Expression. While the compiler knows a logical binary operator (e.g. &&) will always
    // yield a bool, it doesn't know that the operands it was given are any particular type
    let left5 = binOps[0].left;


}

export function eecs183_l03_03(program: Program) {

    // Find average function
    let avgFunc = findFirstConstruct(program, Predicates.byFunctionName("average"));
    if (!avgFunc) {
        return;
    }

    // Check function params -> TODO should probably be common helper
    let params = avgFunc.parameters;
    if (params.length !== 2) {
        avgFunc.addNote(new CompilerNote(avgFunc, NoteKind.ERROR, "EECS183.L04_02.incorrect_param_count", "Need 2 params."));
    } else {
        params.forEach(param => {
            if (param.type && !sameType(param.type, Double.DOUBLE)) {
                param.addNote(new CompilerNote(param, NoteKind.ERROR, "EECS183.L04_02.incorrect_param_count", "Incorrect param type."));
            }
        })
    }

    // Check for lack of return statement -> TODO should probably be common helper
    // let localVars = findConstructs(avgFunc, Predicates.byKind("local_variable_definition"));
    let returnStatement = findConstructs(avgFunc, Predicates.byKind("return_statement"));
    if (!returnStatement) {
        avgFunc.addNote(new CompilerNote(avgFunc, NoteKind.ERROR, "EECS183.L04_02.no_return_stmt", "No return stmt found."));
    }

    // Ensure student enters correct return type to function
    let retType = avgFunc.type.returnType;
    if (!sameType(retType, Double.DOUBLE)) {
        avgFunc.addNote(new CompilerNote(avgFunc, NoteKind.ERROR, "EECS183.L04_02.incorrect_return_type", "Return type should be double."));
    }

    // Check that the student wraps division in parens
    findConstructs(avgFunc, Predicates.byKind("arithmetic_binary_operator_expression"))
        .forEach(op => {
            if (op.operator === "+") {
                (<AnalyticExpression[]>op.children)
                    .filter(Predicates.byKind("arithmetic_binary_operator_expression"))
                    .filter(childOp => childOp.operator === "/")
                    .forEach(childOp => childOp.addNote(new CompilerNote(childOp, NoteKind.ERROR, "EECS183.L04_02.order_of_operations", "Use parentheses!")))
            }
        });

    // Find local variable ints initialized by a narrowing conversion from a double
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

export function isUpdateAssignment(exp: AnalyticConstruct): exp is AssignmentExpression {

    // if (Predicates.byKind("assignment_expression")(exp)) {
    //     let lhs = <AnalyticExpression>exp.lhs;

    //     if (Predicates.byKind("identifier_expression")(lhs)) {
    //         let rhs_id = findConstructs(exp.rhs, Predicates.byIdentifierName(lhs.name));
    //         return rhs_id.length !== 0;
    //     }
    // }

    // return true;
    let lhs: IdentifierExpression;
    return Predicates.byKind("assignment_expression")(exp) &&
        Predicates.byKind("identifier_expression")(exp.lhs) && (lhs = exp.lhs) &&
        isUnqualifiedIdentifier(lhs.name) && findConstructs(lhs, Predicates.byIdentifierName(lhs.name)).length !== 0;
}

// ASK JAMES -> ok to have CPPConstruct param type? Is there a better fit for this? (AnalyticConstruct caused analyzer errors)
// export function hasIncrement(construct: CPPConstruct) {
//     // Proof of concept one-liner
//     /* let inc = findConstructs(loop,
//         // Predicates.byKinds(["prefix_increment_expression", "prefix_decrement_expression",
//         //                     "postfix_increment_expression", "postfix_decrement_expression",
//         //                     "compound_assignment_expression"]) ||
//         (e) : e is IdentifierExpression | AssignmentExpression => Predicates.byKind("identifier_expression")(e) ||
//         isUpdateAssignment(e)
//         ); */

//     // Find increments -> includes post/prefix inc/dec, compound assg, all constructs for which isUpdateAssignment returns true for
//     // As of right now, only update assignments are implemented, so TODO is also include the others
//     return findConstructs(construct, isUpdateAssignment).length !== 0; // TODO include other incr types when they're implemented
// }

// function hasDoubleIncrement(loop: ForStatement) {
//     // return findConstructs(loop.body, isUpdateAssignment).length !== 0 && findConstructs(loop.post, isUpdateAssignment).length !== 0;
//     return hasIncrement(loop.body) && hasIncrement(loop.post);
// }

// function analyze_wip(program: Program) {
//     // EECS183.L07_01
//     const loop = findFirstConstruct(program, Predicates.byKinds(["for_statement", "while_statement"]));
//     if (!loop) {
//         return;
//     }
//     if (!hasIncrement(loop)) {
//         loop.addNote(new CompilerNote(loop, NoteKind.ERROR, "EECS183.L04_02.no_loop_increment", "Loop doesn't have an increment!"));
//     } else if (Predicates.byKind("for_statement")(loop) && hasDoubleIncrement(loop)) {
//         loop.addNote(new CompilerNote(loop, NoteKind.ERROR, "EECS183.L04_02.double_loop_increment", "Loop has two increments!"));
//     }

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