import { ExpressionASTNode, t_BinaryOperators, t_CompoundAssignmentOperators } from "../../../ast/ast_expressions";
import { assert } from "../../../util/util";
import { ExpressionContext } from "../../compilation/contexts";
import { overloadResolution } from "../../compilation/overloads";
import { DeclaredScopeEntry } from "../../compilation/scopes";
import { CompleteClassType } from "../../compilation/types";
import { allWellTyped, Expression, TypedExpression } from "./Expression";
import { MemberOperatorOverloadExpression, NonMemberOperatorOverloadExpression } from "./OperatorOverloadExpression";






export function selectOperatorOverload(context: ExpressionContext, ast: ExpressionASTNode, operator: t_OverloadableOperators, originalArgs: Expression[]) {

    if (!allWellTyped(originalArgs)) {
        return undefined;
    }

    let leftmost = originalArgs[0];

    let operatorFunctionName = "operator" + operator;

    let lookupResult: DeclaredScopeEntry | undefined;
    let adjustedArgs: Expression[] | undefined;
    let receiverType: CompleteClassType | undefined;
    if (leftmost.type.isCompleteClassType()) {
        // Attempt member lookup for operator overload function
        adjustedArgs = originalArgs.slice(1);
        lookupResult = leftmost.type.classScope.lookup(operatorFunctionName, { kind: "normal", noParent: true });
        receiverType = leftmost.type;
    }

    // If we didn't find a member option
    if (!lookupResult) {
        lookupResult = context.contextualScope.lookup(operatorFunctionName, { kind: "normal" });
        adjustedArgs = originalArgs;
        receiverType = undefined;
    }

    // If we still don't have anything
    if (!lookupResult || !adjustedArgs) {
        return undefined;
    }

    // These are not possible since you can't have a variable or
    // class with a name of e.g. "operator+"
    assert(lookupResult.declarationKind !== "variable");
    assert(lookupResult.declarationKind !== "class");

    let selected = overloadResolution(lookupResult.overloads, adjustedArgs.map(arg => arg.type), receiverType).selected;

    if (selected) {
        if (selected.isMemberFunction) {
            return new MemberOperatorOverloadExpression(context, ast, operator, <TypedExpression<CompleteClassType>>leftmost, adjustedArgs, selected);
        }
        else {
            return new NonMemberOperatorOverloadExpression(context, ast, operator, adjustedArgs, selected);
        }
    }
    else {
        return undefined;
    }
}
// TODO
// export type NonMemberOperatorOverloadExpressionAST =
//     BinaryOperatorExpressionASTNode |
//     AssignmentExpressionASTNode;

export type t_OverloadableOperators =
    t_CompoundAssignmentOperators |
    t_BinaryOperators |
    "=" |
    "+=" |
    "[]";


