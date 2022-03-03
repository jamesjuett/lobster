import { ExpressionStatementASTNode } from "../../../ast/ast_statements";
import { ConstructOutlet, ExpressionStatementOutlet } from "../../../view/codeOutlets";
import { areSemanticallyEquivalent, BlockContext, SemanticContext } from "../../compilation/contexts";
import { AnalyticConstruct } from "../../../analysis/predicates";
import { CPPConstruct, SuccessfullyCompiled } from "../constructs";
import { CompiledExpression, Expression } from "../expressions/Expression";
import { RuntimeExpression } from "../expressions/RuntimeExpression";
import { createExpressionFromAST, createRuntimeExpression } from "../expressions/expressions";
import { Statement, RuntimeStatement } from "./Statement";


export class ExpressionStatement extends Statement<ExpressionStatementASTNode> {
    public readonly construct_type = "expression_statement";


    public readonly expression: Expression;

    public static createFromAST(ast: ExpressionStatementASTNode, context: BlockContext) {
        return new ExpressionStatement(context, ast, createExpressionFromAST(ast.expression, context));
    }

    public constructor(context: BlockContext, ast: ExpressionStatementASTNode, expression: Expression) {
        super(context, ast);
        this.attach(this.expression = expression);
    }

    public createDefaultOutlet(this: CompiledExpressionStatement, element: JQuery, parent?: ConstructOutlet) {
        return new ExpressionStatementOutlet(element, this, parent);
    }

    public isTailChild(child: CPPConstruct) {
        return { isTail: true };
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && areSemanticallyEquivalent(this.expression, other.expression, equivalenceContext);
    }
}

export interface CompiledExpressionStatement extends ExpressionStatement, SuccessfullyCompiled {
    readonly expression: CompiledExpression;
}

export class RuntimeExpressionStatement extends RuntimeStatement<CompiledExpressionStatement> {

    public expression: RuntimeExpression;
    private index = "expr";

    public constructor(model: CompiledExpressionStatement, parent: RuntimeStatement) {
        super(model, parent);
        this.expression = createRuntimeExpression(this.model.expression, this);
    }

    protected upNextImpl() {
        if (this.index === "expr") {
            this.sim.push(this.expression);
            this.index = "done";
        }
        else {
            this.startCleanup();
        }
    }

    protected stepForwardImpl() {
    }
}
