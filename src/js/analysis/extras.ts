import { FunctionDefinition } from '../core/declarations';
import { CompilerNote, NoteKind } from '../core/errors';
import { AssignmentExpression } from '../core/expressions';
import { DirectInitializer } from '../core/initializers';
import { Predicates } from '../core/predicates';
import { Program } from '../core/Program';
import { Project } from '../core/Project';
import { Simulation } from '../core/Simulation';
import { AsynchronousSimulationRunner } from '../core/simulationRunners';
import {
  Int,
  isCompleteObjectType,
  isPointerType,
  isPotentiallyCompleteObjectType,
  isType,
} from '../core/types';
import { findFirstConstruct, findConstructs, containsConstruct, constructTest } from './analysis';
import { findLoopControlVars } from './loops';

export type StaticAnalysisExtra = (program: Program) => void;

export function getExtras(extra_keys: string | readonly string[]) {
  if (typeof extra_keys === 'string') {
    return EXTRAS[extra_keys] ?? [];
  } else {
    let extras: StaticAnalysisExtra[] = [];
    extra_keys.forEach(ck => EXTRAS[ck]?.forEach(c => extras.push(c)));
    return extras;
  }
}
let loop_control_vars = (program: Program) => {
  let loops = findConstructs(program, Predicates.isLoop);
  loops.forEach(loop => {
    let loopControlVars = findLoopControlVars(loop);
    program.addNote(
      new CompilerNote(
        loop.condition,
        NoteKind.STYLE,
        'loop_control_vars',
        `It appears that the variable(s) [${loopControlVars
          .map(v => v.name)
          .join(',')}] control this loop.`
      )
    );
  });
};
const EXTRAS: { [index: string]: readonly StaticAnalysisExtra[] | undefined } = {
  loop_control_vars: [loop_control_vars],
  // "eecs280_ex_lab2_squareArray": [loop_control_vars],
  loop_hardcoded_condition: [
    (program: Program) => {
      let loop = findFirstConstruct(program, Predicates.isLoop);
      if (!loop) {
        return false;
      }

      // verify loop condition does NOT contain a number
      let hardcodedLimit = findFirstConstruct(
        loop.condition,
        Predicates.byKind('numeric_literal_expression')
      );
      if (hardcodedLimit) {
        program.addNote(
          new CompilerNote(
            loop.condition,
            NoteKind.STYLE,
            'heuristic_loop_hardcoded_size',
            `Uh oh! It looks like you've got a hardcoded number ${hardcodedLimit.value.rawValue} for the loop size. This might work for a specific case, but wouldn't work generally.`
          )
        );
        return false;
      }
    },
  ],
  loop_condition_vector_off_by_one: [
    (program: Program) => {
      let loop = findFirstConstruct(program, Predicates.isLoop);
      if (!loop) {
        return false;
      }

      // verify loop condition contains a relational operator
      if (
        !findFirstConstruct(
          loop.condition,
          Predicates.byKind('relational_binary_operator_expression')
        )
      ) {
        return false;
      }

      // if loop condition does not contain a call to vector.size() return false
      if (!findFirstConstruct(loop.condition, Predicates.byFunctionCallName('size'))) {
        return false;
      }

      // tricky - don't look for subscript expressions, since with a vector it's actually
      // an overloaded [] and we need to look for that as a function call
      let indexingOperations = findConstructs(loop.body, Predicates.isIndexingOperation);

      // loop condition contains size (from before), but also has <= or >=
      // and no arithmetic operators or pre/post increments that could make up for the equal to part
      // (e.g. i <= v.size() is very much wrong, but i <= v.size() - 1 is ok)
      let conditionOperator = findFirstConstruct(
        loop.condition,
        Predicates.byKind('relational_binary_operator_expression')
      );
      if (conditionOperator) {
        if (
          !findFirstConstruct(
            loop.condition,
            Predicates.byKinds([
              'arithmetic_binary_operator_expression',
              'prefix_increment_expression',
              'postfix_increment_expression',
            ])
          )
        ) {
          if (conditionOperator.operator === '<=' || conditionOperator.operator === '>=') {
            if (
              !indexingOperations.some(indexingOp =>
                findFirstConstruct(
                  indexingOp,
                  Predicates.byKinds([
                    'arithmetic_binary_operator_expression',
                    'prefix_increment_expression',
                    'postfix_increment_expression',
                  ])
                )
              )
            ) {
              program.addNote(
                new CompilerNote(
                  conditionOperator,
                  NoteKind.STYLE,
                  'loop_condition_vector_off_by_one',
                  `Double check the limit in this condition. I think there might be an off-by-one error that takes you out of bounds if you're using the ${conditionOperator.operator} operator.`
                )
              );
              return false;
            }
          }
        }
      }

      return true;
    },
  ],
  eecs280_ex_swap_by_pointer: [
    (program: Program) => {
      let swapPtdInts = findConstructs(program, constructTest(FunctionDefinition)).find(
        def => def.declaration.name === 'swap'
      );
      let main = findConstructs(program, constructTest(FunctionDefinition)).find(
        def => def.declaration.name === 'main'
      );

      if (!swapPtdInts || !main) {
        return;
      }

      let assignments = findConstructs(swapPtdInts, Predicates.byKind('assignment_expression'));
      let pointerAssignments = assignments.filter(Predicates.byTypedExpression(isPointerType));

      let localDefs = findConstructs(swapPtdInts, Predicates.byKind('local_variable_definition'));
      let pointerDefs = localDefs.filter(Predicates.byTypedDeclaration(isPointerType));
      let intDefs = localDefs.filter(Predicates.byTypedDeclaration(isType(Int)));

      let intParams = swapPtdInts.parameters.filter(Predicates.byTypedDeclaration(isType(Int)));

      // Heuristic 1
      // At least two assignments, but no variable declarations. Forgot a temporary?
      if (assignments.length >= 2 && localDefs.length == 0) {
        assignments.forEach(assn =>
          assn.addNote(
            new CompilerNote(
              assn,
              NoteKind.STYLE,
              'analysis.1',
              "It's just a guess, but one of these assignments might end up accidentally overwriting some important data when you run your code. Check out the simulation to see ;)."
            )
          )
        );
      }

      // Heuristic 2
      // Only one variable declaration and it's a pointer. Also at least one assignment in terms of pointers.
      if (
        program.isRunnable() &&
        localDefs.length === 1 &&
        localDefs[0].type &&
        localDefs[0].type.isPointerType() &&
        pointerAssignments.length >= 1
      ) {
        swapPtdInts.declaration.addNote(
          new CompilerNote(
            swapPtdInts.declaration,
            NoteKind.STYLE,
            'analysis.2',
            'Check out the visualization of your code. What kinds of things are being swapped? Is it the arrows (i.e. pointers) or the values? Which do you want? What does that mean about where you should have the * operator in your code?'
          )
        );
      }

      // Heuristic 3
      // Declare a non-pointer but assign a pointer to it.
      intDefs
        .filter(def => {
          return (
            def.initializer &&
            def.initializer instanceof DirectInitializer &&
            def.initializer.args[0].type?.isPointerType()
          );
        })
        .forEach(def => {
          def.addNote(
            new CompilerNote(
              def,
              NoteKind.STYLE,
              'analysis.3',
              `This line is trying to put an address into a variable that declared to hold ${def.type!.englishString(
                false
              )} value. Pointers (which have addresses for values) can't be stored into variables that hold plain values.`
            )
          );
        });

      // Heuristic 4
      // Parameters that are pass-by-value (and not pass-by-pointer)
      if (program.isRunnable() && assignments.length >= 2) {
        if (intParams.length >= 2) {
          swapPtdInts.declaration.addNote(
            new CompilerNote(
              swapPtdInts.declaration,
              NoteKind.STYLE,
              'analysis.4',
              `It looks like you've got a fair bit of code written to do the swap. But take a moment now to go ahead and simulate what you have. Look at the variables on the stack frames for main and your swap function as it runs. Are the variables in main getting changed, as desired? If not, why not? Does it have anything to do with the way you're passing the function parameters?`
            )
          );
        }
      }

      // Heuristic 5
      // Pass by value paramParam in swap with same name as param in main
      intParams
        .filter(param =>
          findConstructs(main!, Predicates.byKind('local_variable_definition')).find(
            def => def.name === param.name
          )
        )
        .forEach(param =>
          param.addNote(
            new CompilerNote(
              param,
              NoteKind.STYLE,
              'analysis.4',
              `Note that the parameter ${param.name} is not the same variable as the ${param.name} declared in main(). The two variables have different scopes and correspond to separate objects at runtime.`
            )
          )
        );
    },
  ],
};
