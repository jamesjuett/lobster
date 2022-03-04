import { ExpressionContext, ConstructDescription, SemanticContext } from "../../compilation/contexts";
import { Expression } from "./Expression";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { AnalyticConstruct } from "../../../analysis/predicates";
import { ExpressionASTNode } from "../../../ast/ast_expressions";

/**
 * A flawed expression
 */

export abstract class InvalidExpression extends Expression<ExpressionASTNode> {

    public readonly type: undefined;
    public readonly valueCategory: undefined;

    public constructor(context: ExpressionContext, ast: ExpressionASTNode) {
        super(context, ast);
    }

    public createDefaultOutlet(this: never, element: JQuery, parent?: ConstructOutlet): never {
        throw new Error("Cannot create an outlet for an invalid expression.");
    }

    public describeEvalResult(depth: number): ConstructDescription {
        return {
            message: "an unsupported expression"
        };
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        return other.construct_type === this.construct_type;
    }
}
