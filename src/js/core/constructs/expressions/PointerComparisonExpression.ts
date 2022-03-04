import { SimulationEvent } from "../../runtime/Simulation";
import { PointerType, Bool, similarType, subType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription, SemanticContext } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../CPPConstruct";
import { CPPError } from "../../compilation/errors";
import { CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { AnalyticConstruct } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { RelationalBinaryOperatorExpressionASTNode, t_RelationalBinaryOperators } from "../../../ast/ast_expressions";
import { checkForNullptrEquivalence } from "../../../analysis/semantic_equivalence";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { BinaryOperatorExpression } from "./BinaryOperatorExpression";
import { RELATIONAL_BINARY_OPERATIONS } from "./RelationalBinaryOperatorExpression";
import { createRuntimeExpression } from "./expressions";
import { NullPointerConversion, ArrayToPointerConversion, PointerToBooleanConversion } from "./ImplicitConversion";








export class PointerComparisonExpression extends BinaryOperatorExpression<RelationalBinaryOperatorExpressionASTNode> {
    public readonly construct_type = "pointer_comparison_expression";

    public readonly type: Bool;
    public readonly valueCategory = "prvalue";

    public readonly left: TypedExpression<PointerType, "prvalue">;
    public readonly right: TypedExpression<PointerType, "prvalue">;

    public readonly operator!: t_RelationalBinaryOperators; // Narrows type from base

    public constructor(context: ExpressionContext, ast: RelationalBinaryOperatorExpressionASTNode | undefined, left: TypedExpression<PointerType, "prvalue">,
        right: TypedExpression<PointerType, "prvalue">, operator: t_RelationalBinaryOperators) {
        super(context, ast, operator);

        this.attach(this.left = left);
        this.attach(this.right = right);

        this.type = new Bool();

        if (!(similarType(left.type, right.type) || subType(left.type, right.type) || subType(right.type, left.type))) {
            this.addNote(CPPError.expr.pointer_comparison.same_pointer_type_required(this, left, right));
        }

        if (left instanceof NullPointerConversion || right instanceof NullPointerConversion) {
            if (this.operator === "==" || this.operator === "!=") {
                if (left instanceof ArrayToPointerConversion || right instanceof ArrayToPointerConversion) {
                    this.addNote(CPPError.expr.pointer_comparison.null_literal_array_equality(this));
                }
            }
            else { // operator is <, <=, >, or >=
                this.addNote(CPPError.expr.pointer_comparison.null_literal_comparison(this));
            }
        }

    }

    // public createRuntimeExpression(this: CompiledPointerComparisonExpression, parent: RuntimeConstruct) : RuntimePointerComparisonExpression;
    // public createRuntimeExpression<T extends PointerType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression(this: CompiledPointerComparisonExpression, parent: RuntimeConstruct) : RuntimePointerComparisonExpression {
    //     return new RuntimePointerComparisonExpression(this, parent);
    // }
    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        if (other.construct_type === this.construct_type) {
            return other.operator === this.operator
                && this.areChildrenSemanticallyEquivalent(other, ec);
        }
        if (other instanceof PointerToBooleanConversion) {
            return checkForNullptrEquivalence(other, this, ec);
        }

        return false;
    }
}

export interface TypedPointerComparisonExpression extends PointerComparisonExpression, t_TypedExpression {
}

export interface CompiledPointerComparisonExpression<OperandT extends PointerType = PointerType> extends TypedPointerComparisonExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<OperandT, "prvalue">;
    readonly right: CompiledExpression<OperandT, "prvalue">;
}

export class RuntimePointerComparisonExpression<OperandT extends PointerType = PointerType> extends SimpleRuntimeExpression<Bool, "prvalue", CompiledPointerComparisonExpression<OperandT>> {

    public left: RuntimeExpression<OperandT, "prvalue">;
    public right: RuntimeExpression<OperandT, "prvalue">;

    public constructor(model: CompiledPointerComparisonExpression<OperandT>, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {
        let leftResult = this.left.evalResult;
        let rightResult = this.right.evalResult;

        if (this.model.operator !== "==" && this.model.operator !== "!=") {
            if (!leftResult.type.isArrayPointerType() || !rightResult.type.isArrayPointerType() || leftResult.type.arrayObject !== rightResult.type.arrayObject) {
                this.sim.eventOccurred(SimulationEvent.UNSPECIFIED_BEHAVIOR, "It looks like you're trying to see which pointer comes before/after in memory, but this only makes sense if both pointers come from the same array. I don't think that's the case here.", true);
            }
        }

        let result = RELATIONAL_BINARY_OPERATIONS[this.model.operator](this.left.evalResult, this.right.evalResult);
        this.setEvalResult(result);

    }
}
