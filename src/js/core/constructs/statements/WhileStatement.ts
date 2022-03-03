import { WhileStatementASTNode } from "../../../ast/ast_statements";
import { asMutable, Mutable } from "../../../util/util";
import { ConstructOutlet, WhileStatementOutlet } from "../../../view/codeOutlets";
import { areSemanticallyEquivalent, BlockContext, createBlockContext, createLoopContext, SemanticContext } from "../../compilation/contexts";
import { CPPError } from "../../compilation/errors";
import { AnalyticConstruct, Predicates } from "../../../analysis/predicates";
import { Bool, isType } from "../../compilation/types";
import { SuccessfullyCompiled } from "../constructs";
import { CompiledExpression, Expression } from "../expressions/Expression";
import { RuntimeExpression } from "../expressions/RuntimeExpression";
import { createExpressionFromAST, createRuntimeExpression } from "../expressions/expressions";
import { standardConversion } from "../expressions/ImplicitConversion";
import { CompiledStatement, Statement, RuntimeStatement } from "./Statement";
import { createStatementFromAST, createRuntimeStatement } from "./statements";


export class WhileStatement extends Statement<WhileStatementASTNode> {
    public readonly construct_type = "while_statement";

    public readonly condition: Expression;
    public readonly body: Statement;

    public static createFromAST(ast: WhileStatementASTNode, outerContext: BlockContext): WhileStatement {

        let whileContext = createLoopContext(outerContext);

        // If the body substatement is not a block, it gets its own implicit block context.
        // (If the substatement is a block, it creates its own block context, so we don't do that here.)
        let body = ast.body.construct_type === "block" ?
            createStatementFromAST(ast.body, whileContext) :
            createStatementFromAST(ast.body, createBlockContext(whileContext));

        return new WhileStatement(whileContext, ast, createExpressionFromAST(ast.condition, whileContext), body);
    }

    public constructor(context: BlockContext, ast: WhileStatementASTNode, condition: Expression, body: Statement) {
        super(context, ast);

        if (condition.isWellTyped()) {
            this.attach(this.condition = standardConversion(condition, Bool.BOOL));
        }
        else {
            this.attach(this.condition = condition);
        }

        this.attach(this.body = body);

        if (this.condition.isWellTyped() && !Predicates.isTypedExpression(this.condition, isType(Bool))) {
            this.addNote(CPPError.stmt.iteration.condition_bool(this, this.condition));
        }
    }



    public createDefaultOutlet(this: CompiledWhileStatement, element: JQuery, parent?: ConstructOutlet) {
        return new WhileStatementOutlet(element, this, parent);
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && areSemanticallyEquivalent(this.condition, other.condition, equivalenceContext)
            && areSemanticallyEquivalent(this.body, other.body, equivalenceContext);
    }
}

export interface CompiledWhileStatement extends WhileStatement, SuccessfullyCompiled {
    readonly condition: CompiledExpression<Bool, "prvalue">;
    readonly body: CompiledStatement;
}

export class RuntimeWhileStatement extends RuntimeStatement<CompiledWhileStatement> {

    public readonly condition: RuntimeExpression<Bool, "prvalue">;
    public readonly body?: RuntimeStatement;

    private index = 0;

    public constructor(model: CompiledWhileStatement, parent: RuntimeStatement) {
        super(model, parent);
        this.condition = createRuntimeExpression(model.condition, this);
        // Do not create body here, since it might not actually run
    }

    private static upNextFns = [
        (rt: RuntimeWhileStatement) => {
            rt.sim.push(rt.condition);
        },
        (rt: RuntimeWhileStatement) => {
            if (rt.condition.evalResult.rawValue === 1) {
                rt.sim.push(asMutable(rt).body = createRuntimeStatement(rt.model.body, rt));
            }
            else {
                rt.startCleanup();
            }
        },
        (rt: RuntimeWhileStatement) => {
            // Do nothing, pass to stepForward, which will reset
        }
    ];

    protected upNextImpl() {
        RuntimeWhileStatement.upNextFns[this.index](this);
        this.index = (this.index + 1) % RuntimeWhileStatement.upNextFns.length;
    }

    public stepForwardImpl() {
        (<Mutable<this>>this).condition = createRuntimeExpression(this.model.condition, this);
        delete (<Mutable<this>>this).body;

    }

}
