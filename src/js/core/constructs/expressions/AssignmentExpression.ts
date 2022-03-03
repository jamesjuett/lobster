import { Simulation } from "../../runtime/Simulation";
import { AtomicType, sameType, isAtomicType, isPotentiallyCompleteClassType, isPotentiallyCompleteArrayType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription, SemanticContext } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { CPPError } from "../../compilation/errors";
import { Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { ConstructOutlet, AssignmentExpressionOutlet } from "../../../view/codeOutlets";
import { AnalyticConstruct, Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { AssignmentExpressionASTNode } from "../../../ast/ast_expressions";
import { assignmentEquivalence } from "../../../analysis/semantic_equivalence";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";
import { selectOperatorOverload } from "./selectOperatorOverload";
import { OperatorOverloadExpression, InvalidOperatorOverloadExpression } from "./NonMemberOperatorOverloadExpression";
import { standardConversion } from "./ImplicitConversion";


export class AssignmentExpression extends Expression<AssignmentExpressionASTNode> {
    public readonly construct_type = "assignment_expression";

    public readonly type?: AtomicType;
    public readonly valueCategory = "lvalue";

    public readonly lhs: Expression;
    public readonly rhs: Expression;

    private constructor(context: ExpressionContext, ast: AssignmentExpressionASTNode, lhs: Expression, rhs: Expression) {
        super(context, ast);

        // If the rhs doesn't have a type or VC, the rest of the analysis doesn't make much sense.
        if (!lhs.isWellTyped() || !rhs.isWellTyped()) {
            this.attach(this.lhs = lhs);
            this.attach(this.rhs = rhs);
            return;
        }

        if (lhs.valueCategory != "lvalue") {
            this.addNote(CPPError.expr.assignment.lhs_lvalue(this));
        }

        let lhsType = lhs.type;

        if (isPotentiallyCompleteClassType(lhsType)) {
            this.addNote(CPPError.expr.assignment.classes_not_assignable(this, lhsType));
        }
        else if (isPotentiallyCompleteArrayType(lhsType)) {
            this.addNote(CPPError.expr.assignment.arrays_not_assignable(this, lhsType));
        }
        else if (isAtomicType(lhsType)) {
            if (lhsType.isConst) {
                this.addNote(CPPError.expr.assignment.lhs_const(this));
            }
        }
        else {
            this.addNote(CPPError.expr.assignment.type_not_assignable(this, lhsType));
        }

        rhs = standardConversion(rhs, lhs.type.cvUnqualified());

        if (rhs.isWellTyped() && !sameType(rhs.type, lhs.type.cvUnqualified())) {
            this.addNote(CPPError.expr.assignment.convert(this, lhs, rhs));
        }


        if (isAtomicType(lhsType)) {
            // A proper assignment may only have atomic type. Anything else is either
            // forbidden (e.g. array assignment) or would be handled by an operator
            // overload instead (e.g. class assignment)
            this.type = lhsType;
        }

        this.attach(this.lhs = lhs);
        this.attach(this.rhs = rhs);
    }

    public static createFromAST(ast: AssignmentExpressionASTNode, context: ExpressionContext): AssignmentExpression | OperatorOverloadExpression {
        let lhs = createExpressionFromAST(ast.lhs, context);
        let rhs = createExpressionFromAST(ast.rhs, context);

        // Consider an assignment operator overload if the LHS is class type
        if (Predicates.isTypedExpression(lhs, isPotentiallyCompleteClassType)) {
            return selectOperatorOverload(context, ast, "=", [lhs, rhs]) ??
                new InvalidOperatorOverloadExpression(context, ast, ast.operator, [lhs, rhs]);
        }

        return new AssignmentExpression(context, ast, lhs, rhs);
    }

    public createDefaultOutlet(this: CompiledAssignmentExpression, element: JQuery, parent?: ConstructOutlet) {
        return new AssignmentExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

    // public isTailChild(child: CPPConstruct) {
    //     return {
    //         isTail: false,
    //         reason: "The assignment itself will happen after the recursive call returns.",
    //         others: [this]
    //     };
    // }
    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        var lhs = this.lhs.describeEvalResult(0);
        var rhs = this.rhs.describeEvalResult(0);
        return { message: "The value of " + (rhs.name || rhs.message) + " will be assigned to " + (lhs.name || lhs.message) + "." };
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        if (other.construct_type === this.construct_type
            && this.areChildrenSemanticallyEquivalent(other, ec)) {
            return true;
        }
        else if (other.construct_type === "compound_assignment_expression") {
            return assignmentEquivalence(this, other, ec);
        }
        return false;
    }
}
// x = x + b
// x += b

export interface TypedAssignmentExpression<T extends AtomicType = AtomicType> extends AssignmentExpression, t_TypedExpression {
    readonly type: T;
    readonly lhs: TypedExpression<T>;
}


export interface CompiledAssignmentExpression<T extends AtomicType = AtomicType> extends TypedAssignmentExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly lhs: CompiledExpression<T, "lvalue">;
    readonly rhs: CompiledExpression<T, "prvalue">;
}


export class RuntimeAssignment<T extends AtomicType = AtomicType> extends SimpleRuntimeExpression<T, "lvalue", CompiledAssignmentExpression<T>> {

    public readonly lhs: RuntimeExpression<T, "lvalue">;
    public readonly rhs: RuntimeExpression<T, "prvalue">;

    public constructor(model: CompiledAssignmentExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.lhs = createRuntimeExpression(this.model.lhs, this);
        this.rhs = createRuntimeExpression(this.model.rhs, this);
        this.setSubexpressions([this.rhs, this.lhs]);
    }

    protected operate() {
        this.lhs.evalResult.writeValue(this.rhs.evalResult);
        this.setEvalResult(this.lhs.evalResult);
    }
}
