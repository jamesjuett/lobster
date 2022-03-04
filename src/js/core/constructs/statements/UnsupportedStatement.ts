import { StatementASTNode } from "../../../ast/ast_statements";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { BlockContext, SemanticContext } from "../../compilation/contexts";
import { CPPError } from "../../compilation/errors";
import { AnalyticConstruct } from "../../../analysis/predicates";
import { Statement } from "./Statement";


export class UnsupportedStatement extends Statement {
    public readonly construct_type = "unsupported_statement";

    public constructor(context: BlockContext, ast: StatementASTNode, unsupportedName: string) {
        super(context, ast);
        this.addNote(CPPError.lobster.unsupported_feature(this, unsupportedName));
    }

    public createDefaultOutlet(element: JQuery, parent?: ConstructOutlet): never {
        throw new Error("Cannot create an outlet for an unsupported construct.");
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type;
    }
}
