import { isType, Bool } from "../../compilation/types";
import { ExpressionContext, ConstructDescription } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../CPPConstruct";
import { CPPError } from "../../compilation/errors";
import { Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { LogicalNotExpressionASTNode } from "../../../ast/ast_expressions";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { UnaryOperatorExpression } from "./UnaryOperatorExpression";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";
import { standardConversion } from "./ImplicitConversion";








export class LogicalNotExpression extends UnaryOperatorExpression<LogicalNotExpressionASTNode> {
    public readonly construct_type = "logical_not_expression";

    public readonly type = Bool.BOOL;
    public readonly valueCategory = "prvalue";

    public readonly operand: Expression;

    public readonly operator = "!";

    public constructor(context: ExpressionContext, ast: LogicalNotExpressionASTNode, operand: Expression) {
        super(context, ast);

        if (!operand.isWellTyped()) {
            this.attach(this.operand = operand);
            return;
        }

        let convertedOperand = standardConversion(operand, Bool.BOOL);

        if (!Predicates.isTypedExpression(convertedOperand, isType(Bool))) {
            this.addNote(CPPError.expr.logicalNot.operand_bool(this, operand));
            this.attach(this.operand = operand);
        }

        this.attach(this.operand = convertedOperand);
    }

    public static createFromAST(ast: LogicalNotExpressionASTNode, context: ExpressionContext): LogicalNotExpression {
        return new LogicalNotExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedLogicalNotExpression extends LogicalNotExpression, t_TypedExpression {
    readonly operand: TypedExpression<Bool, "prvalue">;
}

export interface CompiledLogicalNotExpression extends TypedLogicalNotExpression, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpression<Bool, "prvalue">;
}

export class RuntimeLogicalNotExpression extends SimpleRuntimeExpression<Bool, "prvalue", CompiledLogicalNotExpression> {

    public operand: RuntimeExpression<Bool, "prvalue">;

    public constructor(model: CompiledLogicalNotExpression, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.setSubexpressions([this.operand]);
    }

    protected operate() {
        this.setEvalResult(this.operand.evalResult.logicalNot());
    }

}
