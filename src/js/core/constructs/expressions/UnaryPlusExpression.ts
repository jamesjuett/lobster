import { PointerType, ArithmeticType, isArithmeticType, isIntegralType, isPointerType, isBoundedArrayType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../CPPConstruct";
import { CPPError } from "../../compilation/errors";
import { Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { UnaryPlusExpressionASTNode } from "../../../ast/ast_expressions";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { UnaryOperatorExpression } from "./UnaryOperatorExpression";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";
import { integralPromotion, convertToPRValue } from "./ImplicitConversion";








export class UnaryPlusExpression extends UnaryOperatorExpression<UnaryPlusExpressionASTNode> {
    public readonly construct_type = "unary_plus_expression";

    public readonly type?: ArithmeticType | PointerType;
    public readonly valueCategory = "prvalue";

    public readonly operand: Expression;

    public readonly operator = "+";

    public constructor(context: ExpressionContext, ast: UnaryPlusExpressionASTNode, operand: Expression) {
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
        else if (Predicates.isTypedExpression(operand, isBoundedArrayType, "lvalue")) {
            let convertedOperand = convertToPRValue(operand);
            this.type = convertedOperand.type;
            this.attach(this.operand = convertedOperand);
        }
        else if (Predicates.isTypedExpression(operand, isPointerType)) {
            let convertedOperand = convertToPRValue(operand);
            this.type = convertedOperand.type;
            this.attach(this.operand = convertedOperand);
        }
        else {
            this.addNote(CPPError.expr.unaryPlus.operand(this));
            this.attach(this.operand = operand);
            return;
        }
    }

    public static createFromAST(ast: UnaryPlusExpressionASTNode, context: ExpressionContext): UnaryPlusExpression {
        return new UnaryPlusExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedUnaryPlusExpression<T extends ArithmeticType | PointerType = ArithmeticType | PointerType> extends UnaryPlusExpression, t_TypedExpression {
    readonly type: T;
    readonly operand: TypedExpression<T, "prvalue">;
}

export interface CompiledUnaryPlusExpression<T extends ArithmeticType | PointerType = ArithmeticType | PointerType> extends TypedUnaryPlusExpression<T>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpression<T, "prvalue">;
}

export class RuntimeUnaryPlusExpression<T extends ArithmeticType | PointerType> extends SimpleRuntimeExpression<T, "prvalue", CompiledUnaryPlusExpression<T>> {

    public operand: RuntimeExpression<T, "prvalue">;

    public constructor(model: CompiledUnaryPlusExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.setSubexpressions([this.operand]);
    }

    protected operate() {
        this.setEvalResult(this.operand.evalResult);
    }

}
