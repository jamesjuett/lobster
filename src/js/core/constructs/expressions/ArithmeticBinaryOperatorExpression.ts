import { IntegralType, PointerType, sameType, ArithmeticType, isArithmeticType, isIntegralType, isPointerType, isBoundedArrayType, isPotentiallyCompleteClassType, AtomicType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription, SemanticContext, areSemanticallyEquivalent, areAllSemanticallyEquivalent } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../CPPConstruct";
import { CPPError } from "../../compilation/errors";
import { assertNever } from "../../../util/util";
import { VCResultTypes, Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { AnalyticConstruct, Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { ArithmeticBinaryOperatorExpressionASTNode, t_ArithmeticBinaryOperators } from "../../../ast/ast_expressions";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { BinaryOperatorExpression } from "./BinaryOperatorExpression";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";
import { selectOperatorOverload } from "./selectOperatorOverload";
import { OperatorOverloadExpression } from "./OperatorOverloadExpression";
import { usualArithmeticConversions, convertToPRValue } from "./ImplicitConversion";
import { InputOperatorExpression } from "./InputOperatorExpression";
import { OutputOperatorExpression } from "./OutputOperatorExpression";
import { PointerOffsetExpression } from "./PointerOffsetExpression";
import { PointerDifferenceExpression } from "./PointerDifferenceExpression";
import { Value } from "../../runtime/Value";


function add(left: number, right: number) { return left + right; }
function sub(left: number, right: number) { return left - right; }
function mult(left: number, right: number) { return left * right; }
function intDiv(left: number, right: number) { return Math.trunc(left / right); };
function floatDiv(left: number, right: number) { return left / right; };
function mod(left: number, right: number) { return left - intDiv(left, right) * right; }
function bitAnd(left: number, right: number) { return left & right; }
function bitXor(left: number, right: number) { return left ^ right; }
function bitOr(left: number, right: number) { return left | right; }
function bitShiftLeft(left: number, right: number) { return left << right; }
function bitShiftRight(left: number, right: number) { return left >>> right; } // TODO: is the sign preserving bit shift right more consistent with C++?

// Note: AtomicType here is much wider than needed. T should theoretically only ever be Int, Double, or Float
export const ARITHMETIC_BINARY_OPERATIONS: { [k in t_ArithmeticBinaryOperators]: <T extends AtomicType>(left: Value<T>, right: Value<T>) => Value<T> }
    = {
    "+": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, add);
    },
    "-": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, sub);
    },
    "*": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, mult);
    },
    "/": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        if (left.type.isIntegralType()) {
            return left.combine(right, intDiv);
        }
        else {
            return left.combine(right, floatDiv);
        }
    },
    "%": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, mod);
    },
    "&": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, bitAnd);
    },
    "^": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, bitXor);
    },
    "|": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, bitOr);
    },
    "<<": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, bitShiftLeft);
    },
    ">>": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, bitShiftRight);
    }
}


export class ArithmeticBinaryOperatorExpression extends BinaryOperatorExpression<ArithmeticBinaryOperatorExpressionASTNode> {
    public readonly construct_type = "arithmetic_binary_operator_expression";

    public readonly type?: ArithmeticType;

    public readonly left: Expression;
    public readonly right: Expression;

    public readonly operator!: t_ArithmeticBinaryOperators; // Narrows type from base

    protected constructor(context: ExpressionContext, ast: ArithmeticBinaryOperatorExpressionASTNode, left: Expression, right: Expression, operator: t_ArithmeticBinaryOperators) {
        super(context, ast, operator);

        if (!left.isWellTyped() || !right.isWellTyped()) {
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }

        // Arithmetic types are required
        if (!Predicates.isTypedExpression(left, isArithmeticType) || !Predicates.isTypedExpression(right, isArithmeticType)) {
            this.addNote(CPPError.expr.binary.arithmetic_operands(this, this.operator, left, right));
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }

        // % operator and shift operators require integral operands
        if ((operator === "%" || operator === "<<" || operator == ">>") &&
            (!Predicates.isTypedExpression(left, isIntegralType) || !Predicates.isTypedExpression(right, isIntegralType))) {
            this.addNote(CPPError.expr.binary.integral_operands(this, this.operator, left, right));
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }

        let [convertedLeft, convertedRight] = usualArithmeticConversions(left, right);


        if (sameType(convertedLeft.type!, convertedRight.type!)) {
            this.type = convertedLeft.type;
        }
        else {
            this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, convertedLeft, convertedRight));
        }

        this.attach(this.left = convertedLeft);
        this.attach(this.right = convertedRight);
    }

    public static createFromAST(ast: ArithmeticBinaryOperatorExpressionASTNode, context: ExpressionContext): ArithmeticBinaryOperatorExpression | PointerDifferenceExpression | PointerOffsetExpression | OutputOperatorExpression | InputOperatorExpression | OperatorOverloadExpression {
        let left: Expression = createExpressionFromAST(ast.left, context);
        let right: Expression = createExpressionFromAST(ast.right, context);
        let op = ast.operator;

        // HACK: only consider operator overloads if both are class type.
        // TODO: eventually, all input/output expressions should probably
        // be implemented as overloaded operators. 
        if (Predicates.isTypedExpression(left, isPotentiallyCompleteClassType) || Predicates.isTypedExpression(right, isPotentiallyCompleteClassType)) {
            let overload = selectOperatorOverload(context, ast, op, [left, right]);
            if (overload) {
                return overload;
            }
        }

        // If operator is "<<" and the left operand is an ostream, treat as output operation
        if (op === "<<" && Predicates.isTypedExpression(left, isPotentiallyCompleteClassType) && left.type.className === "ostream" && left.isLvalue()) {

            return new OutputOperatorExpression(context, ast, left, right);
        }

        // If operator is ">>" and the left operand is an ostream, treat as output operation
        if (op === ">>" && Predicates.isTypedExpression(left, isPotentiallyCompleteClassType) && left.type.className === "istream" && left.isLvalue()) {

            return new InputOperatorExpression(context, ast, left, right);
        }

        // If operator is "-" and both are pointers or arrays, it's a pointer difference
        // Note that although integer 0 is convertible to a pointer, that conversion should
        // not be applied here since the 0 should just be interpreted as a pointer offset.
        if (op === "-" && (Predicates.isTypedExpression(left, isPointerType) || Predicates.isTypedExpression(left, isBoundedArrayType, "lvalue"))
            && (Predicates.isTypedExpression(right, isPointerType) || Predicates.isTypedExpression(right, isBoundedArrayType, "lvalue"))) {

            return new PointerDifferenceExpression(context, ast,
                convertToPRValue(left),
                convertToPRValue(right));
        }

        // If operator is "-" or "+" and it's a combination of pointer plus integer, it's a pointer offset
        if (op === "-" || op === "+") {
            if ((Predicates.isTypedExpression(left, isPointerType) || Predicates.isTypedExpression(left, isBoundedArrayType, "lvalue")) && Predicates.isTypedExpression(right, isIntegralType) ||
                (Predicates.isTypedExpression(right, isPointerType) || Predicates.isTypedExpression(right, isBoundedArrayType, "lvalue")) && Predicates.isTypedExpression(left, isIntegralType)) {
                return new PointerOffsetExpression(context, ast,
                    <TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">>convertToPRValue(left),
                    <TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">>convertToPRValue(right),
                    op);
            }
        }

        return new ArithmeticBinaryOperatorExpression(context, ast, left, right, op);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        if (other.construct_type !== this.construct_type) {
            return false;
        }

        if (other.operator === this.operator && areAllSemanticallyEquivalent(this.children, other.children, ec)) {
            return true;
        }

        // Commutative operators
        switch (this.operator) {
            // commutative operators
            case "+":
            case "*":
            case "&":
            case "|":
            case "^":
                if (other.operator === this.operator
                    && areSemanticallyEquivalent(this.left, other.right, ec)
                    && areSemanticallyEquivalent(this.right, other.left, ec)) {
                    return true;
                }
                break;
            case "-":
            case "/":
            case "%":
            case "<<":
            case ">>":
                return false;
                break;
            default:
                assertNever(this.operator);

        }

        return false;
    }
}

export interface TypedArithmeticBinaryOperatorExpression<T extends ArithmeticType = ArithmeticType> extends ArithmeticBinaryOperatorExpression, t_TypedExpression {
    readonly type: T;
    readonly left: TypedExpression<T, "prvalue">;
    readonly right: TypedExpression<T, "prvalue">;
}

export interface CompiledArithmeticBinaryOperatorExpression<T extends ArithmeticType = ArithmeticType> extends TypedArithmeticBinaryOperatorExpression<T>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<T, "prvalue">;
    readonly right: CompiledExpression<T, "prvalue">;
}
// TODO: rename this or maybe create two separate classes for Arithmetic and Logical

export class RuntimeArithmeticBinaryOperator<T extends ArithmeticType = ArithmeticType> extends SimpleRuntimeExpression<T, "prvalue", CompiledArithmeticBinaryOperatorExpression<T>> {

    public readonly left: RuntimeExpression<T, "prvalue">;
    public readonly right: RuntimeExpression<T, "prvalue">;

    public constructor(model: CompiledArithmeticBinaryOperatorExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {
        // Not sure why the cast here is necessary but apparently Typescript needs it
        this.setEvalResult(<VCResultTypes<T, "prvalue">>ARITHMETIC_BINARY_OPERATIONS[this.model.operator](this.left.evalResult, this.right.evalResult));
    }
}
