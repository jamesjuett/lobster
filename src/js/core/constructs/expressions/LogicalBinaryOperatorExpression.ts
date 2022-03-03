import { isType, Bool, isPotentiallyCompleteClassType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { CPPError } from "../../compilation/errors";
import { Value, RawValueType } from "../../runtime/Value";
import { Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { LogicalBinaryOperatorExpressionASTNode, t_LogicalBinaryOperators } from "../../../ast/ast_expressions";
import { BinaryOperatorExpression } from "./BinaryOperatorExpression";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";
import { selectOperatorOverload } from "./selectOperatorOverload";
import { OperatorOverloadExpression } from "./NonMemberOperatorOverloadExpression";
import { standardConversion } from "./ImplicitConversion";








export class LogicalBinaryOperatorExpression extends BinaryOperatorExpression<LogicalBinaryOperatorExpressionASTNode> {
    public readonly construct_type = "logical_binary_operator_expression";

    public readonly type = new Bool();

    public readonly left: Expression;
    public readonly right: Expression;

    public readonly operator!: t_LogicalBinaryOperators; // Narrows type from base

    protected constructor(context: ExpressionContext, ast: LogicalBinaryOperatorExpressionASTNode | undefined, left: Expression, right: Expression, operator: t_LogicalBinaryOperators) {
        super(context, ast, operator);

        if (left.isWellTyped() && right.isWellTyped()) {
            this.attach(this.left = this.compileLogicalSubexpression(left));
            this.attach(this.right = this.compileLogicalSubexpression(right));
        }
        else {
            this.attach(this.left = left);
            this.attach(this.right = right);
        }
    }

    private compileLogicalSubexpression(subexpr: TypedExpression) {
        subexpr = standardConversion(subexpr, Bool.BOOL);
        if (!isType(subexpr.type, Bool)) {
            this.addNote(CPPError.expr.binary.boolean_operand(this, this.operator, subexpr));
        }
        return subexpr;
    }

    public static createFromAST(ast: LogicalBinaryOperatorExpressionASTNode, context: ExpressionContext): LogicalBinaryOperatorExpression | OperatorOverloadExpression {

        let left = createExpressionFromAST(ast.left, context);
        let right = createExpressionFromAST(ast.right, context);

        // If either one is a class type, we consider operator overloads
        if (Predicates.isTypedExpression(left, isPotentiallyCompleteClassType) || Predicates.isTypedExpression(right, isPotentiallyCompleteClassType)) {
            let overload = selectOperatorOverload(context, ast, ast.operator, [left, right]);
            if (overload) {
                return overload;
            }
        }

        return new LogicalBinaryOperatorExpression(context, ast, left, right, ast.operator);
    }

    // public createRuntimeExpression(this: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct) : RuntimeLogicalBinaryOperatorExpression;
    // public createRuntimeExpression<T extends AtomicType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression(this: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct) : RuntimeLogicalBinaryOperatorExpression {
    //     return new RuntimeLogicalBinaryOperatorExpression(this, parent);
    // }
    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

}

export interface TypedLogicalBinaryOperatorExpression extends LogicalBinaryOperatorExpression, t_TypedExpression {
}

export interface CompiledLogicalBinaryOperatorExpression extends TypedLogicalBinaryOperatorExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<Bool, "prvalue">;
    readonly right: CompiledExpression<Bool, "prvalue">;
}

export class RuntimeLogicalBinaryOperatorExpression extends RuntimeExpression<Bool, "prvalue", CompiledLogicalBinaryOperatorExpression> {

    public left: RuntimeExpression<Bool, "prvalue">;
    public right: RuntimeExpression<Bool, "prvalue">;

    private index = "left";

    private hasShortCircuited?: boolean;

    public constructor(model: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
    }

    protected upNextImpl() {
        if (this.index === "left") {
            this.sim.push(this.left);
            this.index = "right";
        }
        else if (this.index === "right") {
            let shortCircuitReslt = this.model.operator === "&&" ? 0 : 1;
            this.hasShortCircuited = this.left.evalResult.rawEquals(shortCircuitReslt);

            if (!this.hasShortCircuited) {
                // only push right child if we have not short circuited
                this.sim.push(this.right);
            }
            this.index = "operate";
        }
    }

    protected stepForwardImpl() {
        if (this.hasShortCircuited) {
            this.setEvalResult(this.left.evalResult);
        }
        else {
            this.setEvalResult(this.operate(this.left.evalResult, this.right.evalResult));
        }
        this.startCleanup();
    }

    private operate(left: Value<Bool>, right: Value<Bool>) {
        return left.combine(right, (a: RawValueType, b: RawValueType) => {
            return this.model.operator == "&&" ? a && b : a || b;
        });
    }
}
