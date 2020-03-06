import { CPPConstruct } from "./constructs";
import { Program, TranslationUnit } from "./Program";
import { AssignmentExpression, BinaryOperatorExpression, NumericLiteralExpression } from "./expressions";
import { CPPError, Note, NoteKind, CompilerNote } from "./errors";
import { Constructor } from "../util/util";
import { FunctionCallExpression } from "./functionCall";
import { VariableDefinition, FunctionDefinition, LocalVariableDefinition } from "./declarations";
import { DirectInitializer } from "./initializers";
import { ForStatement, CompiledForStatement, UnsupportedStatement } from "./statements";

export type CPPConstructTest<T extends CPPConstruct> = (construct: CPPConstruct) => construct is T;

export type CPPConstructFunctor<T extends CPPConstruct> = (construct: T) => void;

export function constructTest<T extends CPPConstruct>(constructClass: Function & { prototype: T }) {
    return <CPPConstructTest<T>>((construct: CPPConstruct) => construct instanceof constructClass);
}

export function exploreConstructs<T extends CPPConstruct>(root: CPPConstruct | TranslationUnit | Program, test: CPPConstructTest<T>, fn: CPPConstructFunctor<T>) {

    if (root instanceof Program) {
        for(let tuName in root.translationUnits) {
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

export function findConstructs<T extends CPPConstruct>(root: CPPConstruct | TranslationUnit | Program, test: CPPConstructTest<T>) {
    let found : T[] = [];
    exploreConstructs(root, test, (matchedConstruct: T) => {
        found.push(matchedConstruct);
    });
    return found;
}

export function analyze(program: Program) {

    let swapPtdInts = findConstructs(program, constructTest(FunctionDefinition))
        .find(def => def.declaration.name === "swap");
    let main = findConstructs(program, constructTest(FunctionDefinition))
        .find(def => def.declaration.name === "main");
        
    if (!swapPtdInts || !main) {
        return;
    }

    let assignments = findConstructs(swapPtdInts, constructTest(AssignmentExpression));
    let pointerAssignments = findConstructs(swapPtdInts, constructTest(AssignmentExpression))
        .filter(assn => assn.isPointerTyped());

    let localDefs = findConstructs(swapPtdInts, constructTest(VariableDefinition));
    let pointerDefs = localDefs.filter(def => def.type && def.type.isPointerType());
    let nonPointerDefs = localDefs.filter(def => def.type && !def.type.isPointerType());

    let passByValueParams = swapPtdInts.parameters.filter(
        param => param.type && param.type.isObjectType() && !param.type.isPointerType()
    );
        
    // Heuristic 1
    // At least two assignments, but no variable declarations. Forgot a temporary?
    if (assignments.length >= 2 && localDefs.length == 0) {
        assignments.forEach(assn => assn.addNote(new CompilerNote(assn, NoteKind.STYLE, "analysis.1", "It's just a guess, but one of these assignments might end up accidentally overwriting some important data when you run your code. Check out the simulation to see ;).")));
    }

    // Heuristic 2
    // Only one variable declaration and it's a pointer. Also at least one assignment in terms of pointers.
    if (program.isRunnable() && localDefs.length === 1
        && localDefs[0].type && localDefs[0].type.isPointerType()
        && pointerAssignments.length >= 1) {

        swapPtdInts.declaration.addNote(new CompilerNote(swapPtdInts.declaration, NoteKind.STYLE, "analysis.2", "Check out the visualization of your code. What kinds of things are being swapped? Is it the arrows (i.e. pointers) or the values? Which do you want? What does that mean about where you should have the * operator in your code?"));
    }

    // Heuristic 3
    // Declare a non-pointer but assign a pointer to it.
    nonPointerDefs.filter(def => {
        return def.initializer && def.initializer instanceof DirectInitializer && def.initializer.args[0].isPointerTyped();
    }).forEach(def => {
        def.addNote(new CompilerNote(def, NoteKind.STYLE, "analysis.3",
            `This line is trying to put an address into a variable that declared to hold ${def.type!.englishString(false)} value. Pointers (which have addresses for values) can't be stored into variables that hold plain values.`));
    });
    
    // Heuristic 4
    // Parameters that are pass-by-value (and not pass-by-pointer)
    if (program.isRunnable() && assignments.length >= 2) {
        if (passByValueParams.length >= 2) {
            
            swapPtdInts.declaration.addNote(new CompilerNote(swapPtdInts.declaration, NoteKind.STYLE, "analysis.4",
                `It looks like you've got a fair bit of code written to do the swap. But take a moment now to go ahead and simulate what you have. Look at the variables on the stack frames for main and your swap function as it runs. Are the variables in main getting changed, as desired? If not, why not? Does it have anything to do with the way you're passing the function parameters?`));
        }
    }

    // Heuristic 5
    // Pass by value paramParam in swap with same name as param in main
    passByValueParams.filter(
        param => findConstructs(main!, constructTest(VariableDefinition)).find(def => def.name === param.name)
    ).forEach(
        param => param.addNote(new CompilerNote(param, NoteKind.STYLE, "analysis.4",
            `Note that the parameter ${param.name} is not the same variable as the ${param.name} declared in main(). The two variables have different scopes and correspond to separate objects at runtime.`))
    );

    // for (let tuName in program.translationUnits) {
    //     program.translationUnits[tuName].topLevelDeclarations.forEach(
    //         decl => exploreConstructs(decl,
    //             constructTest(AssignmentExpression),
    //             (assn: AssignmentExpression) => assn.addNote(CPPError.lobster.unsupported_feature(assn, "crabs"))
    //         )
    //     );
    // }

    analyze2(program);
}

function analyze2(program: Program) {
    let varDefs = findConstructs(program, constructTest(LocalVariableDefinition));
    let arrayDefs = varDefs.filter(def => def.type.isBoundedArrayType());
    if (arrayDefs.length === 0) {
        return;
    }
    let arrayDefType = arrayDefs[0].type;
    if (!arrayDefType.isBoundedArrayType()) {
        return;
    }
    let arraySize = arrayDefType.length;
    let forLoops = findConstructs(program, constructTest(ForStatement));
    let compiledForLoops : CompiledForStatement[] = <any>forLoops.filter(fl => fl.isSuccessfullyCompiled());
    let targets = compiledForLoops.filter((fl) => {
        let cond = fl.condition;
        if (!(cond instanceof BinaryOperatorExpression)) {
            return false;
        }
        return cond.operator === "<=" && cond.right instanceof NumericLiteralExpression && cond.right.value.rawValue === arraySize;
    });
    targets.forEach(target => target.addNote(new CompilerNote(target, NoteKind.WARNING, "blah", "Oops")));

}