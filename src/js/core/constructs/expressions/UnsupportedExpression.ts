import { ExpressionContext, ConstructDescription, SemanticContext } from "../../compilation/contexts";
import { CPPError } from "../../compilation/errors";
import { Expression } from "./Expression";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { AnalyticConstruct } from "../../../analysis/predicates";
import { ExpressionASTNode } from "../../../ast/ast_expressions";

/**
 * An expression not currently supported by Lobster.
 */

export class UnsupportedExpression extends Expression<ExpressionASTNode> {
    public readonly construct_type = "unsupported_expression";

    public readonly type = undefined;
    public readonly valueCategory = undefined;
    private readonly unsupportedName: string;

    public constructor(context: ExpressionContext, ast: ExpressionASTNode, unsupportedName: string) {
        super(context, ast);
        this.unsupportedName = unsupportedName;
        this.addNote(CPPError.lobster.unsupported_feature(this, unsupportedName));
    }

    public createDefaultOutlet(this: never, element: JQuery, parent?: ConstructOutlet): never {
        throw new Error("Cannot create an outlet for an unsupported construct.");
    }

    public describeEvalResult(depth: number): ConstructDescription {
        return {
            message: "an unsupported expression"
        };
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && other.unsupportedName === this.unsupportedName;
    }

}
