import { FunctionType, sameType, referenceCompatible, CompleteClassType, ExpressionType } from "./types";
import { Note, CPPError } from "./errors";
import { FunctionEntity } from "./entities";
import { AuxiliaryExpression } from "../constructs/expressions/AuxiliaryExpression";
import { standardConversion } from "../constructs/expressions/ImplicitConversion";

interface OverloadCandidateResult {
    readonly candidate: FunctionEntity;
    readonly notes: readonly Note[];
}

export interface OverloadResolutionResult<T extends FunctionType = FunctionType> {
    readonly candidates: readonly OverloadCandidateResult[];
    readonly viable: FunctionEntity<T>[];
    readonly selected?: FunctionEntity<T>;
}
// TODO: see if we could move this to another module? Maybe entities.ts?

export function overloadResolution<T extends FunctionType>(candidates: readonly FunctionEntity<T>[], argTypes: readonly (ExpressionType | undefined)[], receiverType?: CompleteClassType): OverloadResolutionResult<T> {
    // TODO: add these checks, and send errors back to construct that calls this if they aren't met
    // Should return the function selected as well as an array of object-typed params that contain
    // any implicit conversions necessary.

    // if (!allWellTyped(args)) {
    //     // If arguments are not well-typed, we can't continue onward to select a function
    //     // and create a function call, so instead just give up attach arguments here.
    //     this.attachAll(args);
    //     return;
    // }
    // if (!allObjectTyped(args)) {
    //     // Only object types may be passed as arguments to functions.
    //     this.addNote(CPPError.declaration.init.no_default_constructor(this, this.target)); // TODO: fix
    //     this.attachAll(args);
    //     return;
    // }
    // Find the constructor
    let viable: FunctionEntity<T>[] = [];
    let resultCandidates: readonly OverloadCandidateResult[] = candidates.map((candidate) => {

        let tempArgs = [];
        var notes: Note[] = [];

        // Check argument types against parameter types
        let candidateParamTypes = candidate.type.paramTypes;
        if (argTypes.length !== candidateParamTypes.length) {
            notes.push(CPPError.param.numParams(candidate.firstDeclaration));
        }

        // TODO: add back in with member functions
        else if (candidate.isMemberFunction && receiverType?.isConst && !candidate.type.receiverType?.isConst) {
            notes.push(CPPError.param.thisConst(candidate.firstDeclaration, receiverType));
        }
        else {
            argTypes.forEach((argType, i) => {
                if (!argType) {
                    return; // ignore undefined argType, assume it "works" since there will be an error elsewhere already
                }
                let candidateParamType = candidateParamTypes[i];
                if (candidateParamType.isReferenceType()) {
                    // tempArgs.push(args[i]);
                    if (!referenceCompatible(argType, candidateParamType)) {
                        notes.push(CPPError.param.paramReferenceType(candidate.firstDeclaration, argType, candidateParamType));
                    }
                    //else if (args[i].valueCategory !== "lvalue"){
                    //    problems.push(CPPError.param.paramReferenceLvalue(args[i]));
                    //}
                }
                else {
                    // tempArgs.push(standardConversion(args[i], argTypes[i]));
                    // Attempt standard conversion of an auxiliary expression of the argument's type to the param type
                    let auxArg = new AuxiliaryExpression(argType, "lvalue");
                    let convertedArg = standardConversion(auxArg, candidateParamType);

                    if (!sameType(convertedArg.type, candidateParamType)) {
                        notes.push(CPPError.param.paramType(candidate.firstDeclaration, argType, candidateParamType));
                    }

                }
            });
        }

        if (notes.length == 0) { // All notes in this function are errors, so if there are any it's not viable
            viable.push(candidate);
        }

        return { candidate: candidate, notes: notes };
    });

    // TODO: need to determine which of several viable overloads is the best option
    // TODO: need to detect when multiple viable overloads have the same total conversion length, which results in an ambiguity
    // let selected = viable.reduce((best, current) => {
    //     if (convLen(current.type.paramTypes) < convLen(best.type.paramTypes)) {
    //         return current;
    //     }
    //     else {
    //         return best;
    //     }
    // });
    let selected = viable[0] ? viable[0] : undefined;

    return {
        candidates: resultCandidates,
        viable: viable,
        selected: selected
    };
}
;
