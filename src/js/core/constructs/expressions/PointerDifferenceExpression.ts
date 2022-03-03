import { SimulationEvent } from "../../runtime/Simulation";
import { PointerType, ArrayPointerType, Int, similarType, PointerToCompleteType as PointerToCompleteObjectType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { CPPError } from "../../compilation/errors";
import { assert } from "../../../util/util";
import { CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { ArithmeticBinaryOperatorExpressionASTNode } from "../../../ast/ast_expressions";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { BinaryOperatorExpression } from "./BinaryOperatorExpression";
import { createRuntimeExpression } from "./expressions";






export class PointerDifferenceExpression extends BinaryOperatorExpression<ArithmeticBinaryOperatorExpressionASTNode> {
    public readonly construct_type = "pointer_difference_expression";

    public readonly type: Int;
    public readonly valueCategory = "prvalue";

    public readonly left: TypedExpression<PointerType, "prvalue">;
    public readonly right: TypedExpression<PointerType, "prvalue">;

    public readonly operator!: "-"; // Narrows type from base

    public constructor(context: ExpressionContext, ast: ArithmeticBinaryOperatorExpressionASTNode, left: TypedExpression<PointerType, "prvalue">, right: TypedExpression<PointerType, "prvalue">) {
        super(context, ast, "-");

        // Not necessary assuming they come in as prvalues that are confirmed to have pointer type.
        // if (left.isWellTyped() && right.isWellTyped()) {
        //     left = convertToPRValue(left);
        //     right = convertToPRValue(right);
        // }
        assert(similarType(left.type, right.type));

        this.attach(this.left = left);
        this.attach(this.right = right);

        this.type = new Int();

        if (!left.type.isPointerToCompleteObjectType()) {
            this.addNote(CPPError.expr.pointer_difference.incomplete_pointed_type(this, left.type));
        }


        // Not necessary assuming they come in as prvalues that are confirmed to have pointer type.
        // if (left.isWellTyped() && right.isWellTyped()) {
        //     if (left.type.isType(Pointer) && right.type.isType(Pointer)) {
        //         this.type = new Int();
        //     }
        //     else {
        //         this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, left, right));
        //         this.type = null;
        //     }
        // }
        // else {
        //     this.type = null;
        // }
    }

    // public createRuntimeExpression(this: CompiledPointerDifferenceExpression, parent: RuntimeConstruct) : RuntimePointerDifference;
    // public createRuntimeExpression<T extends PointerType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression(this: CompiledPointerDifferenceExpression, parent: RuntimeConstruct) : RuntimePointerDifference {
    //     return new RuntimePointerDifference(this, parent);
    // }
    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedPointerDifferenceExpression extends PointerDifferenceExpression, t_TypedExpression {
}

export interface CompiledPointerDifferenceExpression extends TypedPointerDifferenceExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<PointerToCompleteObjectType, "prvalue">;
    readonly right: CompiledExpression<PointerToCompleteObjectType, "prvalue">;
}

export class RuntimePointerDifference extends SimpleRuntimeExpression<Int, "prvalue", CompiledPointerDifferenceExpression> {

    public left: RuntimeExpression<PointerToCompleteObjectType, "prvalue">;
    public right: RuntimeExpression<PointerToCompleteObjectType, "prvalue">;

    public constructor(model: CompiledPointerDifferenceExpression, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {

        let result = this.left.evalResult.pointerDifference(this.right.evalResult);

        let leftArr = this.left.model.type.isType(ArrayPointerType) ? this.left.model.type.arrayObject : null;
        let rightArr = this.right.model.type.isType(ArrayPointerType) ? this.right.model.type.arrayObject : null;

        if (result.rawEquals(0)) {
            // If it's the same address, I guess we can let it slide...
        }
        else if (!leftArr && rightArr) {
            this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "The left pointer in this subtraction is not from an array, so the resulting difference is not meaningful.", true);
            result = result.invalidated();
        }
        else if (leftArr && !rightArr) {
            this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "The right pointer in this subtraction is not from an array, so the resulting difference is not meaningful.", true);
            result = result.invalidated();
        }
        else if (leftArr && rightArr && leftArr !== rightArr) {
            this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "The pointers in this subtraction are pointing into two different arrays, so the resulting difference is not meaningful.", true);
            result = result.invalidated();
        }

        this.setEvalResult(result);

    }
}
