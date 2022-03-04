import { NullStatementASTNode } from "../../../ast/ast_statements";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { SemanticContext } from "../../compilation/contexts";
import { AnalyticConstruct } from "../../../analysis/predicates";
import { CPPConstruct, SuccessfullyCompiled } from "../CPPConstruct";
import { Statement, RuntimeStatement } from "./Statement";
import { NullStatementOutlet } from "../../../view/constructs/StatementOutlets";


export class NullStatement extends Statement<NullStatementASTNode> {
    public readonly construct_type = "null_statement";



    public createDefaultOutlet(this: CompiledNullStatement, element: JQuery, parent?: ConstructOutlet) {
        return new NullStatementOutlet(element, this, parent);
    }

    public isTailChild(child: CPPConstruct) {
        return { isTail: true }; // Note: NullStatement will never actually have children, so this isn't used
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type;
    }
}

export interface CompiledNullStatement extends NullStatement, SuccessfullyCompiled {
}

export class RuntimeNullStatement extends RuntimeStatement<CompiledNullStatement> {

    public constructor(model: CompiledNullStatement, parent: RuntimeStatement) {
        super(model, parent);
    }

    public upNextImpl() {
        this.startCleanup();
    }

    public stepForwardImpl() {
        // nothing to do
    }

}
