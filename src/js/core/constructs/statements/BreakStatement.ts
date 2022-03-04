import { AnalyticConstruct } from "../../../analysis/predicates";
import { BreakStatementASTNode } from "../../../ast/ast_statements";
import { assert } from "../../../util/util";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { BreakStatementOutlet } from "../../../view/constructs/StatementOutlets";
import { BlockContext, SemanticContext } from "../../compilation/contexts";
import { CPPError } from "../../compilation/errors";
import { RuntimeConstruct, SuccessfullyCompiled } from "../CPPConstruct";
import { Expression } from "../expressions/Expression";
import { RuntimeStatement, Statement } from "./Statement";


export class BreakStatement extends Statement<BreakStatementASTNode> {
    public readonly construct_type = "break_statement";

    public static createFromAST(ast: BreakStatementASTNode, context: BlockContext) {
        return new BreakStatement(context, ast);
    }

    public constructor(context: BlockContext, ast: BreakStatementASTNode, expression?: Expression) {
        super(context, ast);

        if (!context.withinLoop) {
            this.addNote(CPPError.stmt.breakStatement.location(this));
        }

    }

    public createDefaultOutlet(this: CompiledBreakStatement, element: JQuery, parent?: ConstructOutlet) {
        return new BreakStatementOutlet(element, this, parent);
    }

    // isTailChild : function(child){
    //     return {isTail: true,
    //         reason: "The recursive call is immediately followed by a return."};
    // }
    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type;
    }
}

export interface CompiledBreakStatement extends BreakStatement, SuccessfullyCompiled {
}

export class RuntimeBreakStatement extends RuntimeStatement<CompiledBreakStatement> {

    public constructor(model: CompiledBreakStatement, parent: RuntimeStatement) {
        super(model, parent);
    }

    protected upNextImpl() {
        // nothing
    }

    public stepForwardImpl() {
        let construct: RuntimeConstruct = this;

        // start cleanup for everything on the way up to the loop
        while (construct.model.construct_type !== "while_statement" && construct.model.construct_type !== "for_statement") {
            construct.startCleanup();

            // This is ensured by successful compilation - break must occur in a loop or there's an error
            assert(construct.parent);

            construct = construct.parent!;
        }

        // start cleanup for the loop
        construct.startCleanup();
    }
}
