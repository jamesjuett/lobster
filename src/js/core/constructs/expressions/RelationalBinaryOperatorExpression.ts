import { Bool, sameType, ArithmeticType, isArithmeticType, isPointerType, isBoundedArrayType, isPotentiallyCompleteClassType, AtomicType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription, SemanticContext, areSemanticallyEquivalent } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../CPPConstruct";
import { CPPError } from "../../compilation/errors";
import { assertNever } from "../../../util/util";
import { Expression, CompiledExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { AnalyticConstruct, Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { RelationalBinaryOperatorExpressionASTNode, t_RelationalBinaryOperators } from "../../../ast/ast_expressions";
import { checkForZeroEquivalence } from "../../../analysis/semantic_equivalence";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { BinaryOperatorExpression } from "./BinaryOperatorExpression";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";
import { selectOperatorOverload } from "./selectOperatorOverload";
import { OperatorOverloadExpression } from "./OperatorOverloadExpression";
import { usualArithmeticConversions, convertToPRValue, IntegralToBooleanConversion, isIntegerLiteralZero, NullPointerConversion } from "./ImplicitConversion";
import { PointerComparisonExpression } from "./PointerComparisonExpression";
import { Value } from "../../runtime/Value";

function lt(left: number, right: number) { return left < right; }
function gt(left: number, right: number) { return left > right; }
function lte(left: number, right: number) { return left <= right; }
function gte(left: number, right: number) { return left >= right; }
function eq(left: number, right: number) { return left == right; }
function ne(left: number, right: number) { return left != right; }

export const RELATIONAL_BINARY_OPERATIONS: { [k in t_RelationalBinaryOperators]: <T extends AtomicType>(left: Value<T>, right: Value<T>) => Value<Bool> }
    = {
    "<": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, lt);
    },
    ">": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, gt);
    },
    "<=": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, lte);
    },
    ">=": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, gte);
    },
    "==": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, eq);
    },
    "!=": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, ne);
    },
}

export class RelationalBinaryOperatorExpression extends BinaryOperatorExpression<RelationalBinaryOperatorExpressionASTNode> {
    public readonly construct_type = "relational_binary_operator_expression";

    public readonly type = Bool.BOOL;

    public readonly left: Expression;
    public readonly right: Expression;

    public readonly operator!: t_RelationalBinaryOperators; // Narrows type from base

    protected constructor(context: ExpressionContext, ast: RelationalBinaryOperatorExpressionASTNode, left: Expression, right: Expression, operator: t_RelationalBinaryOperators) {
        super(context, ast, operator);

        if (!left.isWellTyped() || !right.isWellTyped()) {
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }

        // Arithmetic types are required (note: pointer comparisons have their own PointerRelationalOperation class)
        if (!Predicates.isTypedExpression(left, isArithmeticType) || !Predicates.isTypedExpression(right, isArithmeticType)) {
            this.addNote(CPPError.expr.binary.arithmetic_operands(this, this.operator, left, right));
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }

        let [convertedLeft, convertedRight] = usualArithmeticConversions(left, right);

        if (!sameType(convertedLeft.type!, convertedRight.type!)) {
            this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, convertedLeft, convertedRight));
        }

        this.attach(this.left = convertedLeft);
        this.attach(this.right = convertedRight);
    }

    public static createFromAST(ast: RelationalBinaryOperatorExpressionASTNode, context: ExpressionContext): RelationalBinaryOperatorExpression | PointerComparisonExpression | OperatorOverloadExpression {

        let left: Expression = createExpressionFromAST(ast.left, context);
        let right: Expression = createExpressionFromAST(ast.right, context);
        let op = ast.operator;

        // If either one is a class type, we consider operator overloads
        if (Predicates.isTypedExpression(left, isPotentiallyCompleteClassType) || Predicates.isTypedExpression(right, isPotentiallyCompleteClassType)) {
            let overload = selectOperatorOverload(context, ast, op, [left, right]);
            if (overload) {
                return overload;
            }
        }

        if (Predicates.isTypedExpression(left, isPointerType) || Predicates.isTypedExpression(left, isBoundedArrayType, "lvalue")) {
            if (Predicates.isTypedExpression(right, isPointerType) || Predicates.isTypedExpression(right, isBoundedArrayType, "lvalue")) {
                return new PointerComparisonExpression(context, ast, convertToPRValue(left), convertToPRValue(right), op);
            }
            else if (isIntegerLiteralZero(right)) {
                let convertedLeft = convertToPRValue(left);
                return new PointerComparisonExpression(context, ast, convertedLeft, new NullPointerConversion(right, convertedLeft.type), op);
            }
        }
        else if (isIntegerLiteralZero(left) && (Predicates.isTypedExpression(right, isPointerType) || Predicates.isTypedExpression(right, isBoundedArrayType, "lvalue"))) {
            let convertedRight = convertToPRValue(right);
            return new PointerComparisonExpression(context, ast, new NullPointerConversion(left, convertedRight.type), convertedRight, op);
        }

        return new RelationalBinaryOperatorExpression(context, ast, left, right, ast.operator);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        if (other.construct_type === this.construct_type) {
            if (other.operator === this.operator && this.areChildrenSemanticallyEquivalent(other, ec)) {
                return true;
            }

            switch (this.operator) {
                // commutative operators
                case "!=":
                case "==":
                    if (other.operator === this.operator
                        && areSemanticallyEquivalent(this.left, other.right, ec)
                        && areSemanticallyEquivalent(this.right, other.left, ec)) {
                        return true;
                    }
                    break;
                case "<":
                    if (other.operator === ">"
                        && areSemanticallyEquivalent(this.left, other.right, ec)
                        && areSemanticallyEquivalent(this.right, other.left, ec)) {
                        return true;
                    }
                    break;
                case "<=":
                    if (other.operator === ">="
                        && areSemanticallyEquivalent(this.left, other.right, ec)
                        && areSemanticallyEquivalent(this.right, other.left, ec)) {
                        return true;
                    }
                    break;
                case ">":
                    if (other.operator === "<"
                        && areSemanticallyEquivalent(this.left, other.right, ec)
                        && areSemanticallyEquivalent(this.right, other.left, ec)) {
                        return true;
                    }
                    break;
                case ">=":
                    if (other.operator === "<="
                        && areSemanticallyEquivalent(this.left, other.right, ec)
                        && areSemanticallyEquivalent(this.right, other.left, ec)) {
                        return true;
                    }
                    break;
                default:
                    assertNever(this.operator);

            }
        }

        if (other instanceof IntegralToBooleanConversion) {
            return checkForZeroEquivalence(other, this, ec);
        }

        return false;
    }
}

export interface TypedRelationalBinaryOperatorExpression extends RelationalBinaryOperatorExpression, t_TypedExpression {
}

export interface CompiledRelationalBinaryOperatorExpression<OperandT extends ArithmeticType = ArithmeticType> extends TypedRelationalBinaryOperatorExpression, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<OperandT, "prvalue">;
    readonly right: CompiledExpression<OperandT, "prvalue">;
}

export class RuntimeRelationalBinaryOperator<OperandT extends ArithmeticType = ArithmeticType> extends SimpleRuntimeExpression<Bool, "prvalue", CompiledRelationalBinaryOperatorExpression<OperandT>> {

    public readonly left: RuntimeExpression<OperandT, "prvalue">;
    public readonly right: RuntimeExpression<OperandT, "prvalue">;

    public constructor(model: CompiledRelationalBinaryOperatorExpression<OperandT>, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {
        // Not sure why the cast here is necessary but apparently Typescript needs it
        this.setEvalResult(RELATIONAL_BINARY_OPERATIONS[this.model.operator](this.left.evalResult, this.right.evalResult));
    }
}
