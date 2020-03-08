import { CPPConstruct, isSuccessfullyCompiled } from "./constructs";
import { Program, TranslationUnit } from "./Program";
import { AssignmentExpression, BinaryOperatorExpression, NumericLiteralExpression } from "./expressions";
import { CPPError, Note, NoteKind, CompilerNote } from "./errors";
import { Constructor } from "../util/util";
import { FunctionCallExpression } from "./functionCall";
import { VariableDefinition, FunctionDefinition, LocalVariableDefinition, CompiledSimpleDeclaration, TypedLocalVariableDefinition, SimpleDeclaration } from "./declarations";
import { DirectInitializer } from "./initializers";
import { ForStatement, CompiledForStatement, UnsupportedStatement } from "./statements";
import { BoundedArrayType, isBoundedArrayType, ObjectType, Type, ReferenceType, isVoidType, isAtomicType, isObjectType, isClassType, isIntegralType, isPointerType, isFunctionType } from "./types";
import { Expression } from "./expressionBase";
import { Predicates } from "./predicates";

export type CPPConstructTest<Original extends CPPConstruct, T extends Original> = (construct: Original) => construct is T;

export type CPPConstructFunctor<T extends CPPConstruct> = (construct: T) => void;

export function constructTest<Original extends CPPConstruct, T extends Original>(constructClass: Function & { prototype: T }) {
    return <CPPConstructTest<Original, T>>((construct: Original) => construct instanceof constructClass);
}

// export function compiledConstructTest<Original extends CPPConstruct, T extends Original>(constructClass: Function & { prototype: T }) {
//     return <CPPConstructTest<Original, T["t_compiled"]>>((construct: Original) => construct instanceof constructClass && construct.isSuccessfullyCompiled());
// }

export function exploreConstructs<T extends CPPConstruct>(root: CPPConstruct | TranslationUnit | Program, test: CPPConstructTest<CPPConstruct, T>, fn: CPPConstructFunctor<T>) {

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

export function findConstructs<T extends CPPConstruct>(root: CPPConstruct | TranslationUnit | Program, test: CPPConstructTest<CPPConstruct, T>) {
    let found : T[] = [];
    exploreConstructs(root, test, (matchedConstruct: T) => {
        found.push(matchedConstruct);
    });
    return found;
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

    // 1. Find all simple declarations in the program
    let simpleDecls = findConstructs(program, Predicates.FunctionDeclaration);

    // 2. Narrow those down to only the ones that are pointer declarations
    let funcDecls = simpleDecls.filter(Predicates.SimpleDeclaration.typed(isPointerType));

    // 3. Or just do 1 and 2 with a more specific findConstructs call
    let funcDecls2 = findConstructs(program, Predicates.SimpleDeclaration.typed(isPointerType));

    let afdljs = simpleDecls[0];
    if (Predicates.isTyped(afdljs, isFunctionType)) {
        afdljs
    }

    let whichIntDefsAreSecretlyClasses = integralDefs.filter(SimpleDeclaration.typedPredicate(isClassType));
    //  ^ Type of that is never[], because it's impossible!

    let forLoops = findConstructs(program, constructTest(ForStatement));
    forLoops.forEach(forLoop => {
        forLoop.condition // <--- Type of .condition here is Expression
        forLoop.condition.type
        // ^ Type of .type here is VoidType | AtomicType | BoundedArrayType<ArrayElemType> |
        //                         ClassType | FunctionType | ReferenceType<ObjectType> |
        //                         ArrayOfUnknownBoundType<ArrayElemType> | undefined

        if (forLoop.isSuccessfullyCompiled()) { // Inside this if, TS does type inference based on a proper for loop
            forLoop.condition // <--- Type of .condition here is CompiledExpression<Bool, "prvalue">
            forLoop.condition.type // <--- Type of .type here is Bool

        }
    });

    let x!: never;
    let y = 3 / x;
    // // let arrayDefs = filterConstructsByType<LocalVariableDefinition, TypedLocalVariableDefinition<ObjectType | ReferenceType>, ObjectType | ReferenceType, BoundedArrayType>(isBoundedArrayType, varDefs);
    // // arrayDefs[0].type
    // let arrayDefs = filterConstructsByType<BoundedArrayType>(isBoundedArrayType, varDefs);
    arrayDefs[0].type.length
    // let x!: LocalVariableDefinition;

    // if (x.isTypedDeclaration(isBoundedArrayType)()) {
    //     x.type
    // }

    // isBoundedArrayTypedDeclaration(x);
    // let blah = varDefs.filter(isBoundedArrayTypedDeclaration);
    // blah[0].type
    // arrayDefs[0].type
    // if (arrayDefs.length === 0) {
    //     return;
    // }
    // let arrayDef = arrayDefs[0];
    // if (!arrayDef.isBoundedArrayTyped()) {
    //     return;
    // }
    // let arraySize = arrayDef.type.length;

    // // let forLoops = findConstructs(program, constructTest(ForStatement));
    // // let compiledForLoops = forLoops.filter(isSuccessfullyCompiled);
    // let compiledForLoops = findConstructs(program, compiledConstructTest(ForStatement));

    // let targets = compiledForLoops.filter((fl) => {
    //     let cond = fl.condition;
    //     if (!(cond instanceof BinaryOperatorExpression)) {
    //         return false;
    //     }
    //     return cond.operator === "<=" && cond.right instanceof NumericLiteralExpression && cond.right.value.rawValue === arraySize;
    // });
    // targets.forEach(target => target.addNote(new CompilerNote(target, NoteKind.WARNING, "blah", "Oops")));

    // let test!: AssignmentExpression[];
    // let sdf = test.filter((t) => t.isBoundedArrayTyped());



}