import { SimulationEvent } from "../../runtime/Simulation";
import { CompleteObjectType, PointerType, isType, Int, isPointerType, isPotentiallyCompleteClassType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../CPPConstruct";
import { CPPError } from "../../compilation/errors";
import { Value } from "../../runtime/Value";
import { VCResultTypes, Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { SubscriptExpressionOutlet } from "../../../view/constructs/ExpressionOutlets";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { SubscriptExpressionASTNode } from "../../../ast/ast_expressions";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";
import { selectOperatorOverload } from "./selectOperatorOverload";
import { OperatorOverloadExpression, InvalidOperatorOverloadExpression } from "./OperatorOverloadExpression";
import { convertToPRValue, standardConversion } from "./ImplicitConversion";








export class SubscriptExpression extends Expression<SubscriptExpressionASTNode> {
    public readonly construct_type = "subscript_expression";

    public readonly type?: CompleteObjectType;
    public readonly valueCategory = "lvalue";

    public readonly operand: Expression;
    public readonly offset: Expression;

    public constructor(context: ExpressionContext, ast: SubscriptExpressionASTNode, operand: Expression, offset: Expression) {
        super(context, ast);

        this.attach(this.operand = operand.isWellTyped() ? convertToPRValue(operand) : operand);
        this.attach(this.offset = offset.isWellTyped() ? standardConversion(offset, Int.INT) : offset);

        if (this.operand.isWellTyped()) {
            if (Predicates.isTypedExpression(this.operand, isPointerType)) {
                if (this.operand.type.isPointerToCompleteObjectType()) {
                    this.type = this.operand.type.ptrTo;
                }
                else {
                    this.addNote(CPPError.expr.subscript.incomplete_element_type(this, this.operand.type));
                }
            }
            else {
                this.addNote(CPPError.expr.subscript.invalid_operand_type(this, this.operand.type));
            }
        }

        if (this.offset.isWellTyped() && !Predicates.isTypedExpression(this.offset, isType(Int))) {
            this.addNote(CPPError.expr.subscript.invalid_offset_type(this, this.offset.type));
        }
    }

    public static createFromAST(ast: SubscriptExpressionASTNode, context: ExpressionContext): SubscriptExpression | OperatorOverloadExpression {

        let operand = createExpressionFromAST(ast.operand, context);
        let offset = createExpressionFromAST(ast.offset, context);

        // Consider an assignment operator overload if the LHS is class type
        if (Predicates.isTypedExpression(operand, isPotentiallyCompleteClassType)) {
            return selectOperatorOverload(context, ast, "[]", [operand, offset]) ??
                new InvalidOperatorOverloadExpression(context, ast, "[]", [operand, offset]);;
        }

        return new SubscriptExpression(context, ast, operand, offset);
    }

    // public createRuntimeExpression<T extends ObjectType>(this: CompiledSubscriptExpression<T>, parent: RuntimeConstruct) : RuntimeSubscriptExpression<T>;
    // public createRuntimeExpression<T extends ObjectType, V extends ValueCategory>(this: CompiledExpressionBase<T,V>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends ObjectType>(this: CompiledSubscriptExpression<T>, parent: RuntimeConstruct) : RuntimeSubscriptExpression<T> {
    //     return new RuntimeSubscriptExpression(this, parent);
    // }
    public createDefaultOutlet(this: CompiledSubscriptExpression, element: JQuery, parent?: ConstructOutlet) {
        return new SubscriptExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

}

export interface TypedSubscriptExpression<T extends CompleteObjectType = CompleteObjectType> extends SubscriptExpression, t_TypedExpression {
    readonly type: T;

    readonly operand: TypedExpression<PointerType<T>, "prvalue">;
}

export interface CompiledSubscriptExpression<T extends CompleteObjectType = CompleteObjectType> extends TypedSubscriptExpression<T>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpression<PointerType<T>, "prvalue">;
    readonly offset: CompiledExpression<Int, "prvalue">;
}

export class RuntimeSubscriptExpression<T extends CompleteObjectType = CompleteObjectType> extends SimpleRuntimeExpression<T, "lvalue", CompiledSubscriptExpression<T>> {

    public operand: RuntimeExpression<PointerType<T>, "prvalue">;
    public offset: RuntimeExpression<Int, "prvalue">;

    public constructor(model: CompiledSubscriptExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.offset = createRuntimeExpression(this.model.offset, this);
        this.setSubexpressions([this.operand, this.offset]);
    }

    protected operate() {

        let operand = <Value<PointerType<T>>>this.operand.evalResult;
        let offset = <Value<Int>>this.offset.evalResult;
        let ptr = operand.pointerOffset(offset);
        let addr = ptr.rawValue;

        if (PointerType.isNegative(addr)) {
            this.sim.eventOccurred(SimulationEvent.CRASH, "Good work. You subscripted so far backwards off the beginning of the array you went to a negative address. -__-", true);
        }
        else if (ptr.type.isArrayPointerType()) {
            // If it's an array pointer, make sure it's in bounds and not one-past
            if (addr < ptr.type.min()) {
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "That subscript operation goes off the beginning of the array. This could cause a segfault, or worse - you might just access/change other memory outside the array.", true);
            }
            else if (ptr.type.onePast() < addr) {
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "That subscript operation goes off the end of the array. This could cause a segfault, or worse - you might just access/change other memory outside the array.", true);
            }
            else if (addr == ptr.type.onePast()) {
                // TODO: technically this is not undefined behavior unless the result of the dereference undergoes an lvalue-to-rvalue conversion to look up the object
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "That subscript accesses the element one past the end of the array. This could cause a segfault, or worse - you might just access/change other memory outside the array.", true);
            }

        }

        var obj = this.sim.memory.dereference(ptr);

        // // Note: dead object is not necessarily invalid. Invalid has to do with the value
        // // while dead/alive has to do with the object itself. Reading from dead object does
        // // yield an invalid value though.
        // // TODO: add this back in
        // if (!obj.isAlive()){
        //     DeadObjectMessage.instance(obj, {fromSubscript:true}).display(sim, inst);
        // }
        this.setEvalResult(<VCResultTypes<T, "lvalue">>obj);
    }

}
