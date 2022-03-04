import { AnalyticConstruct } from "../../../analysis/predicates";
import { CommaASTNode, TernaryASTNode } from "../../../ast/ast_expressions";
import { CommaExpressionOutlet, TernaryExpressionOutlet } from "../../../view/constructs/ExpressionOutlets";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { areSemanticallyEquivalent, ConstructDescription, ExpressionContext, SemanticContext } from "../../compilation/contexts";
import { CPPError } from "../../compilation/errors";
import { Bool, ExpressionType, isType, sameType, VoidType } from "../../compilation/types";
import { RuntimeConstruct, SuccessfullyCompiled } from "../CPPConstruct";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { CompiledExpression, Expression, TypedExpression, t_TypedExpression, ValueCategory } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";
import { standardConversion, convertToPRValue } from "./ImplicitConversion";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";


export class CommaExpression extends Expression<CommaASTNode> {
    public readonly construct_type = "comma_expression";

    public readonly type?: ExpressionType;
    public readonly valueCategory?: ValueCategory;

    public readonly left: Expression;
    public readonly right: Expression;

    public constructor(context: ExpressionContext, ast: CommaASTNode, left: Expression, right: Expression) {
        super(context, ast);
        this.type = right.type;
        this.valueCategory = right.valueCategory;
        this.attach(this.left = left);
        this.attach(this.right = right);
    }

    public static createFromAST(ast: CommaASTNode, context: ExpressionContext): CommaExpression {
        return new CommaExpression(context, ast, createExpressionFromAST(ast.left, context), createExpressionFromAST(ast.right, context));
    }

    public createDefaultOutlet(this: CompiledCommaExpression, element: JQuery, parent?: ConstructOutlet) {
        return new CommaExpressionOutlet(element, this, parent);
    }

    // public isTailChild(child: CPPConstruct) {
    //     if (child === this.right){
    //         return {isTail: true,
    //             reason: "The recursive call is on the right side of the comma, so it is guaranteed to be evaluated last."
    //         };
    //     }
    //     else{
    //         return {isTail: false,
    //             reason: "The expression on the right of the comma will be evaluated after the recursive call.",
    //             others: [this.right]
    //         };
    //     }
    // }
    public describeEvalResult(depth: number): ConstructDescription {
        return this.right.describeEvalResult(depth);
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && areSemanticallyEquivalent(this.left, other.left, ec)
            && areSemanticallyEquivalent(this.right, other.right, ec);
    }
}

export interface TypedCommaExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends CommaExpression, t_TypedExpression {
    readonly type: T;
    readonly valueCategory: V;
    readonly right: TypedExpression<T, V>;
}

export interface CompiledCommaExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TypedCommaExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly left: CompiledExpression;
    readonly right: CompiledExpression<T, V>;
}

export class RuntimeComma<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends SimpleRuntimeExpression<T, V, CompiledCommaExpression<T, V>> {

    public left: RuntimeExpression;
    public right: RuntimeExpression<T, V>;

    public constructor(model: CompiledCommaExpression<T, V>, parent: RuntimeConstruct) {
        super(model, parent);
        this.right = createRuntimeExpression(this.model.right, this);
        this.left = createRuntimeExpression(this.model.left, this);
        this.setSubexpressions([this.left, this.right]);
    }

    protected operate() {
        this.setEvalResult(this.right.evalResult);
    }

}

export class TernaryExpression extends Expression<TernaryASTNode> {
    public readonly construct_type = "ternary_expression";

    public readonly type?: ExpressionType;
    public readonly valueCategory?: ValueCategory;

    public readonly condition: Expression;
    public readonly then: Expression;
    public readonly otherwise: Expression;

    public constructor(context: ExpressionContext, ast: TernaryASTNode, condition: Expression, then: Expression, otherwise: Expression) {
        super(context, ast);

        if (condition.isWellTyped()) {
            condition = this.compileCondition(condition);
        }

        if (then.isWellTyped() && otherwise.isWellTyped()) {
            ({ then, otherwise } = this.compileConsequences(then, otherwise));
        }

        this.attach(this.condition = condition);
        this.attach(this.then = then);
        this.attach(this.otherwise = otherwise);

        if (then.type && otherwise.type && sameType(then.type, otherwise.type)) {
            this.type = then.type;
        }
        if (then.valueCategory && then.valueCategory === otherwise.valueCategory) {
            this.valueCategory = then.valueCategory;
        }
    }

    public static createFromAST(ast: TernaryASTNode, context: ExpressionContext): TernaryExpression {
        return new TernaryExpression(context, ast,
            createExpressionFromAST(ast.condition, context),
            createExpressionFromAST(ast.then, context),
            createExpressionFromAST(ast.otherwise, context));
    }

    private compileCondition(condition: TypedExpression) {
        condition = standardConversion(condition, new Bool());
        if (!isType(condition.type, Bool)) {
            this.addNote(CPPError.expr.ternary.condition_bool(condition, condition.type));
        }
        return condition;
    }

    private compileConsequences(then: TypedExpression, otherwise: TypedExpression) {
        // If one of the expressions is a prvalue, attempt to make the other one as well
        if (then.isPrvalue() && otherwise.isLvalue()) {
            otherwise = convertToPRValue(otherwise);
        }
        else if (otherwise.isPrvalue() && then.isLvalue()) {
            then = convertToPRValue(then);
        }


        if (!sameType(then.type, otherwise.type)) {
            this.addNote(CPPError.lobster.ternarySameType(this, then.type, otherwise.type));
        }
        if (isType(then.type, VoidType) || isType(otherwise.type, VoidType)) {
            this.addNote(CPPError.lobster.ternaryNoVoid(this));
        }

        if (then.valueCategory !== otherwise.valueCategory) {
            this.addNote(CPPError.expr.ternary.sameValueCategory(this));
        }

        return { then, otherwise };
    }

    public createDefaultOutlet(this: CompiledTernaryExpression, element: JQuery, parent?: ConstructOutlet) {
        return new TernaryExpressionOutlet(element, this, parent);
    }

    // TODO
    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }



    // public isTailChild(child: CPPConstruct) {
    //     if (child === this.condition){
    //         return {isTail: false,
    //             reason: "One of the two subexpressions in the ternary operator will be evaluated after the function call.",
    //             others: [this.then, this.otherwise]
    //         };
    //     }
    //     else{
    //         return {isTail: true};
    //     }
    // }
    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && areSemanticallyEquivalent(this.condition, other.condition, ec)
            && areSemanticallyEquivalent(this.then, other.then, ec)
            && areSemanticallyEquivalent(this.otherwise, other.otherwise, ec);
        // TODO semantic equivalence (or reversed logic and switched consequences)
    }
}

export interface TypedTernaryExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TernaryExpression, t_TypedExpression {
    readonly type: T;
    readonly valueCategory: V;
    readonly then: TypedExpression<T, V>;
    readonly otherwise: TypedExpression<T, V>;
}

export interface CompiledTernaryExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TypedTernaryExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly condition: CompiledExpression<Bool, "prvalue">;
    readonly then: CompiledExpression<T, V>;
    readonly otherwise: CompiledExpression<T, V>;
}

export class RuntimeTernary<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T, V, CompiledTernaryExpression<T, V>> {

    public condition: RuntimeExpression<Bool, "prvalue">;
    public then: RuntimeExpression<T, V>;
    public otherwise: RuntimeExpression<T, V>;

    private index = "condition";

    public constructor(model: CompiledTernaryExpression<T, V>, parent: RuntimeConstruct) {
        super(model, parent);
        this.condition = createRuntimeExpression(this.model.condition, this);
        this.then = createRuntimeExpression(this.model.then, this);
        this.otherwise = createRuntimeExpression(this.model.otherwise, this);
    }

    protected upNextImpl() {
        if (this.index === "condition") {
            this.sim.push(this.condition);
            this.index = "branch";
        }
        else if (this.index === "branch") {
            if (this.condition.evalResult.rawValue) {
                this.sim.push(this.then);
            }
            else {
                this.sim.push(this.otherwise);
            }
            this.index = "operate";
        }
    }

    protected stepForwardImpl() {
        this.setEvalResult(this.condition.evalResult.rawValue ? this.then.evalResult : this.otherwise.evalResult);
        this.startCleanup();
    }
}
