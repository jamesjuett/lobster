import { SimulationEvent } from "../../runtime/Simulation";
import { IntegralType, PointerType, ArrayPointerType, isIntegralType, isPointerType, PointerToCompleteType as PointerToCompleteObjectType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { CPPError } from "../../compilation/errors";
import { VCResultTypes, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { ArithmeticBinaryOperatorExpressionASTNode } from "../../../ast/ast_expressions";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { BinaryOperatorExpression } from "./BinaryOperatorExpression";
import { createRuntimeExpression } from "./expressions";






export class PointerOffsetExpression extends BinaryOperatorExpression<ArithmeticBinaryOperatorExpressionASTNode> {
    public readonly construct_type = "pointer_offset_expression";

    public readonly type?: PointerType;

    public readonly left: TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">;
    public readonly right: TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">;

    public readonly pointer?: TypedExpression<PointerType, "prvalue">;
    public readonly offset?: TypedExpression<IntegralType, "prvalue">;

    public readonly pointerOnLeft?: boolean;

    public readonly operator!: "+" | "-"; // Narrows type from base

    public constructor(context: ExpressionContext, ast: ArithmeticBinaryOperatorExpressionASTNode,
        left: TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">,
        right: TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">,
        operator: "+" | "-") {
        super(context, ast, operator);

        // NOT NEEDED ASSUMING THEY COME IN ALREADY WELL TYPED AS APPROPRIATE FOR POINTER OFFSET
        // if (left.isWellTyped() && right.isWellTyped()) {
        //     left = convertToPRValue(left);
        //     right = convertToPRValue(right);
        // }
        this.attach(this.left = left);
        this.attach(this.right = right);

        if (!left.isWellTyped() || !right.isWellTyped()) {
            return;
        }

        if (Predicates.isTypedExpression(left, isPointerType) && Predicates.isTypedExpression(right, isIntegralType)) {
            this.pointerOnLeft = true;
            this.pointer = left;
            this.offset = right;
            this.type = this.pointer.type;

            if (!left.type.isPointerToCompleteObjectType()) {
                this.addNote(CPPError.expr.pointer_offset.incomplete_pointed_type(this, left.type));
            }
        }
        else if (Predicates.isTypedExpression(left, isIntegralType) && Predicates.isTypedExpression(right, isPointerType)) {
            this.pointerOnLeft = false;
            this.pointer = right;
            this.offset = left;
            this.type = this.pointer.type;

            if (!right.type.isPointerToCompleteObjectType()) {
                this.addNote(CPPError.expr.pointer_offset.incomplete_pointed_type(this, right.type));
            }
        }
        else {
            this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, left, right));
        }
    }

    // public createRuntimeExpression<T extends PointerType>(this: CompiledPointerOffsetExpression<T>, parent: RuntimeConstruct) : RuntimePointerOffset<T>;
    // public createRuntimeExpression<T extends PointerType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends PointerType>(this: CompiledPointerOffsetExpression<T>, parent: RuntimeConstruct) : RuntimePointerOffset<T> {
    //     return new RuntimePointerOffset(this, parent);
    // }
    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedPointerOffsetExpression<T extends PointerType = PointerType> extends PointerOffsetExpression, t_TypedExpression {
    readonly type: T;

    readonly left: TypedExpression<T, "prvalue"> | TypedExpression<IntegralType, "prvalue">;
    readonly right: TypedExpression<T, "prvalue"> | TypedExpression<IntegralType, "prvalue">;

    readonly pointer: TypedExpression<T, "prvalue">;
    readonly offset: TypedExpression<IntegralType, "prvalue">;
}

export interface CompiledPointerOffsetExpression<T extends PointerToCompleteObjectType = PointerToCompleteObjectType> extends TypedPointerOffsetExpression<T>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<T, "prvalue"> | CompiledExpression<IntegralType, "prvalue">;
    readonly right: CompiledExpression<T, "prvalue"> | CompiledExpression<IntegralType, "prvalue">;

    readonly pointer: CompiledExpression<T, "prvalue">;
    readonly offset: CompiledExpression<IntegralType, "prvalue">;

    readonly pointerOnLeft?: boolean;
}


export class RuntimePointerOffset<T extends PointerToCompleteObjectType = PointerToCompleteObjectType> extends SimpleRuntimeExpression<T, "prvalue", CompiledPointerOffsetExpression<T>> {

    public readonly left: RuntimeExpression<T, "prvalue"> | RuntimeExpression<IntegralType, "prvalue">;
    public readonly right: RuntimeExpression<T, "prvalue"> | RuntimeExpression<IntegralType, "prvalue">;

    public readonly pointer: RuntimeExpression<T, "prvalue">;
    public readonly offset: RuntimeExpression<IntegralType, "prvalue">;

    public constructor(model: CompiledPointerOffsetExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.pointer = createRuntimeExpression(this.model.pointer, this);
        this.offset = createRuntimeExpression(this.model.offset, this);
        if (model.pointerOnLeft) {
            this.left = this.pointer;
            this.right = this.offset;
        }
        else {
            this.left = this.offset;
            this.right = this.pointer;
        }
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {

        // code below computes the new address after pointer addition, while preserving RTTI
        //   result = pointer + offset * pointerSize
        let result = this.pointer.evalResult.pointerOffset(this.offset.evalResult, this.model.operator === "-");
        this.setEvalResult(<VCResultTypes<T, "prvalue">>result); // not sure why cast is necessary here

        let resultType = result.type;
        if (resultType.isType(ArrayPointerType)) {
            // Check that we haven't run off the array
            if (result.rawValue < resultType.min()) {
                //sim.alert("Oops. That pointer just wandered off the beginning of its array.");
            }
            else if (resultType.onePast() < result.rawValue) {
                //sim.alert("Oops. That pointer just wandered off the end of its array.");
            }
        }
        else {
            // If the RTTI works well enough, this should always be unsafe
            this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "Uh, I don't think you're supposed to do arithmetic with that pointer. It's not pointing into an array.", true);
        }
    }
}
