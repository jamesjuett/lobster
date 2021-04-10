"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findLoopControlVars = void 0;
const predicates_1 = require("../core/predicates");
const analysis_1 = require("./analysis");
// Note that this doesn't account for traversal by iterator at all
function findLoopControlVars(loop) {
    // all variables available based on the loop's context
    let vars = loop.body.context.contextualScope.availableVars();
    if (loop.construct_type === "while_statement") {
        // candidates are used in the condition and the body
        let candidates = vars.filter(v => analysis_1.containsConstruct(loop.condition, predicates_1.Predicates.byVariableIdentifier(v))
            && analysis_1.containsConstruct(loop.body, predicates_1.Predicates.byVariableIdentifier(v)));
        // candidates must be incremented in some way within the loop
        // (i.e. in either the body or condition)
        candidates = candidates.filter(cand => analysis_1.containsConstruct(loop, predicates_1.Predicates.byVariableAssignedTo(cand)) ||
            analysis_1.containsConstruct(loop, predicates_1.Predicates.byVariableIncremented(cand)));
        return candidates;
    }
    else { // for loop
        // candiates are used in the condition and one other place
        let candidates = vars.filter(v => {
            if (!analysis_1.containsConstruct(loop.condition, predicates_1.Predicates.byVariableIdentifier(v))) {
                return false;
            }
            return analysis_1.containsConstruct(loop.initial, predicates_1.Predicates.byVariableIdentifier(v)) ||
                analysis_1.containsConstruct(loop.body, predicates_1.Predicates.byVariableIdentifier(v)) ||
                loop.post && analysis_1.containsConstruct(loop.post, predicates_1.Predicates.byVariableIdentifier(v));
        });
        // candidates must be incremented in some way within the loop
        candidates = candidates.filter(cand => analysis_1.containsConstruct(loop, predicates_1.Predicates.byVariableAssignedTo(cand)) ||
            analysis_1.containsConstruct(loop, predicates_1.Predicates.byVariableIncremented(cand)));
        return candidates;
    }
}
exports.findLoopControlVars = findLoopControlVars;
//# sourceMappingURL=loops.js.map