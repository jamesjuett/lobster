import { assertNever } from "../../../util/util";
import { Expression } from "./Expression";
import { DeclaredScopeEntry } from "../../compilation/scopes";
import { overloadResolution } from "../../compilation/overloads";
import { VariableEntity, FunctionEntity } from "../../compilation/entities";

type EntityLookupError = "not_found" | "ambiguous" | "class_found";
/**
 * Used as a helper for IdentifierExpression, DotExpression, and ArrowExpression, and overloaded operators
 * @param scope
 * @param name
 * @param expression
 */
export function entityLookup(expression: Expression, lookupResult: DeclaredScopeEntry | undefined): VariableEntity | FunctionEntity | EntityLookupError {

    if (!lookupResult) {
        return "not_found";
    }
    else if (lookupResult.declarationKind === "variable") {
        return lookupResult;
    }
    else if (lookupResult.declarationKind === "function") {
        if (lookupResult.overloads.length === 1) {
            // Only one function with that name found, so we just grab it.
            // Any errors will be detected later e.g. when a function call is attempted.
            return lookupResult.overloads[0];
        }
        else {
            // Need to perform overload resolution to select the appropriate function
            // from the function overload group. This depends on contextual parameter types.
            if (expression.context.contextualParameterTypes) {
                let overloadResult = overloadResolution(lookupResult.overloads, expression.context.contextualParameterTypes, expression.context.contextualReceiverType);

                if (overloadResult.selected) {
                    // If a best result has been selected, use that
                    return overloadResult.selected;
                }
                else {
                    // Otherwise, use the best candidate (it is sorted to the front of the candidates in the result)
                    // The errors that made it non-viable will be picked up later e.g. when a function call is attempted.
                    return overloadResult.candidates[0].candidate;
                }
            }
            else {
                return "ambiguous";
            }
        }
    }
    else if (lookupResult.declarationKind === "class") {
        return "class_found";
    }
    else {
        assertNever(lookupResult);
    }
}
