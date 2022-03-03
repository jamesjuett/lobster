import { ArithmeticType, isArithmeticType, isIntegralType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { CPPError } from "../../compilation/errors";
import { Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { UnaryMinusExpressionASTNode } from "../../../ast/ast_expressions";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { UnaryOperatorExpression } from "./UnaryOperatorExpression";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";
import { integralPromotion, convertToPRValue,  } from "./ImplicitConversion";








export class UnaryMinusExpression extends UnaryOperatorExpression<UnaryMinusExpressionASTNode> {
    public readonly construct_type = "unary_minus_expression";

    public readonly type?: ArithmeticType;
    public readonly valueCategory = "prvalue";

    public readonly operand: Expression;

    public readonly operator = "-";

    public constructor(context: ExpressionContext, ast: UnaryMinusExpressionASTNode, operand: Expression) {
        super(context, ast);

        if (!operand.isWellTyped()) {
            this.attach(this.operand = operand);
            return;
        }

        if (Predicates.isTypedExpression(operand, isIntegralType)) {
            let convertedOperand = integralPromotion(convertToPRValue(operand));
            this.type = convertedOperand.type;
            this.attach(this.operand = convertedOperand);
        }
        else if (Predicates.isTypedExpression(operand, isArithmeticType)) {
            let convertedOperand = convertToPRValue(operand);
            this.type = convertedOperand.type;
            this.attach(this.operand = convertedOperand);
        }
        else {
            this.addNote(CPPError.expr.unaryMinus.operand(this));
            this.attach(this.operand = operand);
            return;
        }
    }

    public static createFromAST(ast: UnaryMinusExpressionASTNode, context: ExpressionContext): UnaryMinusExpression {
        return new UnaryMinusExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedUnaryMinusExpression<T extends ArithmeticType = ArithmeticType> extends UnaryMinusExpression, t_TypedExpression {
    readonly type: T;
    readonly operand: TypedExpression<T, "prvalue">;
}

export interface CompiledUnaryMinusExpression<T extends ArithmeticType = ArithmeticType> extends TypedUnaryMinusExpression<T>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpression<T, "prvalue">;
}

export class RuntimeUnaryMinusExpression<T extends ArithmeticType> extends SimpleRuntimeExpression<T, "prvalue", CompiledUnaryMinusExpression<T>> {

    public operand: RuntimeExpression<T, "prvalue">;

    public constructor(model: CompiledUnaryMinusExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.setSubexpressions([this.operand]);
    }

    protected operate() {
        this.setEvalResult(<this["evalResult"]>this.operand.evalResult.arithmeticNegate());
    }

}
