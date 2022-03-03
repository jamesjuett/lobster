import { CPPObject } from "../../runtime/objects";
import { Simulation } from "../../runtime/Simulation";
import { IntegralType, ArithmeticType, isArithmeticType, isIntegralType, isPotentiallyCompleteClassType, PointerToCompleteType as PointerToCompleteObjectType, isPointerToCompleteObjectType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription, SemanticContext } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { CPPError } from "../../compilation/errors";
import { Value } from "../../runtime/Value";
import { assertFalse } from "../../../util/util";
import { VCResultTypes, Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { ConstructOutlet, CompoundAssignmentExpressionOutlet } from "../../../view/codeOutlets";
import { AnalyticConstruct, Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { CompoundAssignmentExpressionASTNode, t_ArithmeticBinaryOperators, t_CompoundAssignmentOperators } from "../../../ast/ast_expressions";
import { assignmentEquivalence } from "../../../analysis/semantic_equivalence";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";
import { selectOperatorOverload } from "./selectOperatorOverload";
import { OperatorOverloadExpression, InvalidOperatorOverloadExpression } from "./NonMemberOperatorOverloadExpression";
import { convertToPRValue, standardConversion } from "./ImplicitConversion";
import { ARITHMETIC_BINARY_OPERATIONS } from "./ArithmeticBinaryOperatorExpression";


export class CompoundAssignmentExpression extends Expression<CompoundAssignmentExpressionASTNode> {
    public readonly construct_type = "compound_assignment_expression";

    public readonly type?: PointerToCompleteObjectType | ArithmeticType;
    public readonly valueCategory = "lvalue";

    public readonly lhs: Expression;
    public readonly rhs: Expression;

    public readonly operator: t_CompoundAssignmentOperators;
    public readonly equivalentBinaryOp: t_ArithmeticBinaryOperators;

    private constructor(context: ExpressionContext, ast: CompoundAssignmentExpressionASTNode, lhs: Expression, rhs: Expression) {
        super(context, ast);

        this.operator = ast.operator;
        this.equivalentBinaryOp = <t_ArithmeticBinaryOperators>this.operator.slice(0, -1); // remove = which is last char of operator string


        // If the rhs doesn't have a type or VC, the rest of the analysis doesn't make much sense.
        if (!lhs.isWellTyped() || !rhs.isWellTyped()) {
            this.attach(this.lhs = lhs);
            this.attach(this.rhs = rhs);
            return;
        }

        if (lhs.valueCategory != "lvalue") {
            this.addNote(CPPError.expr.assignment.lhs_lvalue(this));
        }
        else if (lhs.type.isConst) {
            this.addNote(CPPError.expr.assignment.lhs_const(this));
        }

        // TODO: add a check for a modifiable type (e.g. an array type is not modifiable)
        if (lhs.type.isConst) {
            this.addNote(CPPError.expr.assignment.lhs_const(this));
        }

        // Check if it's a pointer offset
        if ((this.equivalentBinaryOp === "+" || this.equivalentBinaryOp === "-") &&
            Predicates.isTypedExpression(lhs, isPointerToCompleteObjectType) && Predicates.isTypedExpression(rhs, isIntegralType)) {
            rhs = convertToPRValue(rhs);
        }

        // otherwise it's an arithmetic binary operation
        else {

            // % operator and shift operators require integral operands
            if ((this.equivalentBinaryOp === "%" || this.equivalentBinaryOp === "<<" || this.equivalentBinaryOp == ">>") &&
                (!Predicates.isTypedExpression(lhs, isIntegralType) || !Predicates.isTypedExpression(rhs, isIntegralType))) {
                this.addNote(CPPError.expr.binary.integral_operands(this, this.operator, lhs, rhs));
                this.attach(this.lhs = lhs);
                this.attach(this.rhs = rhs);
                return;
            }

            //Otherwise, Arithmetic types are required
            if (!Predicates.isTypedExpression(lhs, isArithmeticType) || !Predicates.isTypedExpression(rhs, isArithmeticType)) {
                this.addNote(CPPError.expr.binary.arithmetic_operands(this, this.operator, lhs, rhs));
                this.attach(this.lhs = lhs);
                this.attach(this.rhs = rhs);
                return;
            }

            rhs = standardConversion(rhs, lhs.type.cvUnqualified());
        }

        this.type = lhs.type;
        this.attach(this.lhs = lhs);
        this.attach(this.rhs = rhs);
    }

    public static createFromAST(ast: CompoundAssignmentExpressionASTNode, context: ExpressionContext): CompoundAssignmentExpression | OperatorOverloadExpression {
        let lhs = createExpressionFromAST(ast.lhs, context);
        let rhs = createExpressionFromAST(ast.rhs, context);

        // Consider a compound assignment operator overload if the LHS is class type
        if (Predicates.isTypedExpression(lhs, isPotentiallyCompleteClassType)) {
            return selectOperatorOverload(context, ast, ast.operator, [lhs, rhs]) ??
                new InvalidOperatorOverloadExpression(context, ast, ast.operator, [lhs, rhs]);
        }

        return new CompoundAssignmentExpression(context, ast, lhs, rhs);
    }

    public createDefaultOutlet(this: CompiledCompoundAssignmentExpression, element: JQuery, parent?: ConstructOutlet) {
        return new CompoundAssignmentExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

    // public isTailChild(child: CPPConstruct) {
    //     return {
    //         isTail: false,
    //         reason: "The compound assignment itself will happen after the recursive call returns.",
    //         others: [this]
    //     };
    // }
    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        var lhs = this.lhs.describeEvalResult(0);
        var rhs = this.rhs.describeEvalResult(0);
        return { message: `The value of ${lhs.name || lhs.message} ${this.equivalentBinaryOp} ${rhs.name || rhs.message} will be assigned to ${lhs.name || lhs.message}.` };
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        if (other.construct_type === this.construct_type
            && this.areChildrenSemanticallyEquivalent(other, ec)) {
            return true;
        }
        else if (other.construct_type === "assignment_expression") {
            return assignmentEquivalence(other, this, ec);
        }
        return false;
    }
}

export interface TypedCompoundAssignmentExpression<T extends PointerToCompleteObjectType | ArithmeticType = PointerToCompleteObjectType | ArithmeticType> extends CompoundAssignmentExpression, t_TypedExpression {
    readonly type: T;
    readonly lhs: TypedExpression<T>;
}


export interface CompiledCompoundAssignmentExpression<T extends PointerToCompleteObjectType | ArithmeticType = PointerToCompleteObjectType | ArithmeticType> extends TypedCompoundAssignmentExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly lhs: CompiledExpression<T, "lvalue">;
    readonly rhs: CompiledExpression<T, "prvalue">;
}


export class RuntimeCompoundAssignment<T extends PointerToCompleteObjectType | ArithmeticType = PointerToCompleteObjectType | ArithmeticType> extends SimpleRuntimeExpression<T, "lvalue", CompiledCompoundAssignmentExpression<T>> {

    public readonly lhs: RuntimeExpression<T, "lvalue">;
    public readonly rhs: RuntimeExpression<T, "prvalue">;

    public constructor(model: CompiledCompoundAssignmentExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.lhs = createRuntimeExpression(this.model.lhs, this);
        this.rhs = createRuntimeExpression(this.model.rhs, this);
        this.setSubexpressions([this.rhs, this.lhs]);
    }

    protected operate() {
        let lhsObj: CPPObject<ArithmeticType> | CPPObject<PointerToCompleteObjectType> = this.lhs.evalResult;

        if (lhsObj.isTyped(isArithmeticType)) {
            let newVal = ARITHMETIC_BINARY_OPERATIONS[this.model.equivalentBinaryOp](lhsObj.getValue(), <Value<ArithmeticType>>this.rhs.evalResult);
            lhsObj.writeValue(newVal);
        }
        else if (lhsObj.isTyped(isPointerToCompleteObjectType)) {
            // operator must be + or -, otherwise wouldn't have compiled
            let delta = (<RuntimeExpression<IntegralType, "prvalue">><unknown>this.rhs).evalResult;
            if (this.model.equivalentBinaryOp === "-") {
                delta = delta.arithmeticNegate();
            }
            let newVal = lhsObj.getValue().pointerOffset(delta);
            lhsObj.writeValue(newVal);
        }
        else {
            assertFalse();
        }

        this.setEvalResult(<VCResultTypes<T, "lvalue">>lhsObj);
    }
}
