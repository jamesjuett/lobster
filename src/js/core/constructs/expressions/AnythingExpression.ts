import { ExpressionContext, ConstructDescription, SemanticContext } from "../../compilation/contexts";
import { AnythingConstructASTNode } from "../../../ast/ASTNode";
import { CPPError } from "../../compilation/errors";
import { Expression } from "./Expression";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { AnalyticConstruct } from "../../../analysis/predicates";


export class AnythingExpression extends Expression {
    public readonly construct_type = "anything_construct";

    public readonly type: undefined;
    public readonly valueCategory: undefined;

    public constructor(context: ExpressionContext, ast: AnythingConstructASTNode | undefined) {
        super(context, ast);
        this.addNote(CPPError.lobster.anything_construct(this));
    }

    public createDefaultOutlet(element: JQuery, parent?: ConstructOutlet): never {
        throw new Error("Cannot create an outlet for an \"anything\" placeholder construct.");
    }

    public describeEvalResult(depth: number): ConstructDescription {
        return {
            message: "an \"anything\" placeholder expression to support semantic analysis"
        };
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return true;
    }
}
