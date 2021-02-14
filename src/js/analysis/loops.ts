import { Predicates } from "../core/predicates";
import { WhileStatement, ForStatement } from "../core/statements";
import { containsConstruct } from "./analysis";

// Note that this doesn't account for traversal by iterator at all
export function findLoopControlVars(loop: WhileStatement | ForStatement) {

    // all variables available based on the loop's context
    let vars = loop.body.context.contextualScope.availableVars();

    if (loop.construct_type === "while_statement") {
        // candidates are used in the condition and the body
        let candidates = vars.filter(
            v => containsConstruct(loop.condition, Predicates.byVariableIdentifier(v))
                && containsConstruct(loop.body, Predicates.byVariableIdentifier(v))
        );

        // candidates must be incremented in some way within the loop
        // (i.e. in either the body or condition)
        candidates = candidates.filter(cand =>
            containsConstruct(loop, Predicates.byVariableAssignedTo(cand)) || 
            containsConstruct(loop, Predicates.byVariableIncremented(cand))
        );

        return candidates;
    }
    else { // for loop
        // candiates are used in the condition and one other place
        let candidates = vars.filter(v => {
            if (!containsConstruct(loop.condition, Predicates.byVariableIdentifier(v))) {
                return false;
            }
            return containsConstruct(loop.initial, Predicates.byVariableIdentifier(v)) ||
                    containsConstruct(loop.body, Predicates.byVariableIdentifier(v)) ||
                    loop.post && containsConstruct(loop.post, Predicates.byVariableIdentifier(v));
        });

        // candidates must be incremented in some way within the loop
        candidates = candidates.filter(cand =>
            containsConstruct(loop, Predicates.byVariableAssignedTo(cand)) || 
            containsConstruct(loop, Predicates.byVariableIncremented(cand))
        );

        return candidates;
    }

}