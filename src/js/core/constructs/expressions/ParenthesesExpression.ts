import { ExpressionType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription, SemanticContext, areSemanticallyEquivalent } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../CPPConstruct";
import { ValueCategory, Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { ParenthesesOutlet } from "../../../view/constructs/ExpressionOutlets";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { AnalyticConstruct } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { ParenthesesExpressionASTNode } from "../../../ast/ast_expressions";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";




export class ParenthesesExpression extends Expression<ParenthesesExpressionASTNode> {
    public readonly construct_type = "parentheses_expression";

    public readonly type?: ExpressionType;
    public readonly valueCategory?: ValueCategory;

    public readonly subexpression: Expression;

    public constructor(context: ExpressionContext, ast: ParenthesesExpressionASTNode | undefined, subexpression: Expression) {
        super(context, ast);

        this.attach(this.subexpression = subexpression);
        this.type = subexpression.type;
        this.valueCategory = subexpression.valueCategory;

    }

    public static createFromAST(ast: ParenthesesExpressionASTNode, context: ExpressionContext): ParenthesesExpression {
        return new ParenthesesExpression(context, ast, createExpressionFromAST(ast.subexpression, context));
    }

    public createDefaultOutlet(this: CompiledParenthesesExpression, element: JQuery, parent?: ConstructOutlet) {
        return new ParenthesesOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        if (other.construct_type === this.construct_type) {
            return areSemanticallyEquivalent(this.subexpression, other.subexpression, ec);
        }

        if (areSemanticallyEquivalent(this.subexpression, other, ec)) {
            return true;
        }

        return false;
    }

}

export interface TypedParenthesesExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends ParenthesesExpression, t_TypedExpression {
    readonly type: T;
    readonly valueCategory: V;

    readonly subexpression: TypedExpression<T, V>;
}

export interface CompiledParenthesesExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TypedParenthesesExpression<T, V>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly subexpression: CompiledExpression<T, V>;
}
const INDEX_PARENTHESES_SUBEXPRESSIONS = 0;
const INDEX_PARENTHESES_DONE = 1;
export class RuntimeParentheses<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T, V, CompiledParenthesesExpression<T, V>> {

    public subexpression: RuntimeExpression<T, V>;

    private index: typeof INDEX_PARENTHESES_SUBEXPRESSIONS | typeof INDEX_PARENTHESES_DONE = INDEX_PARENTHESES_SUBEXPRESSIONS;

    public constructor(model: CompiledParenthesesExpression<T, V>, parent: RuntimeConstruct) {
        super(model, parent);
        this.subexpression = createRuntimeExpression(this.model.subexpression, this);
    }

    protected upNextImpl() {
        if (this.index === INDEX_PARENTHESES_SUBEXPRESSIONS) {
            this.sim.push(this.subexpression);
            this.index = INDEX_PARENTHESES_DONE;
        }
        else {
            this.setEvalResult(this.subexpression.evalResult);
            this.startCleanup();
        }
    }

    protected stepForwardImpl() {
        // Do nothing
    }
}
