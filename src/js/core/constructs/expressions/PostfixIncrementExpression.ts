import { CPPObject } from "../../runtime/objects";
import { isType, Bool, ArithmeticType, Int, isArithmeticType, PointerToCompleteType as PointerToCompleteObjectType, isPointerToCompleteObjectType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../CPPConstruct";
import { CPPError } from "../../compilation/errors";
import { Value } from "../../runtime/Value";
import { Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { PostfixIncrementExpressionOutlet } from "../../../view/constructs/ExpressionOutlets";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { PostfixIncrementExpressionASTNode } from "../../../ast/ast_expressions";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";




export class PostfixIncrementExpression extends Expression<PostfixIncrementExpressionASTNode> {
    public readonly construct_type = "postfix_increment_expression";

    public readonly type?: ArithmeticType | PointerToCompleteObjectType;
    public readonly valueCategory = "prvalue";

    public readonly operand: Expression;

    public readonly operator: "++" | "--";

    public constructor(context: ExpressionContext, ast: PostfixIncrementExpressionASTNode, operand: Expression) {
        super(context, ast);
        this.operator = ast.operator;

        this.attach(this.operand = operand);

        if (!operand.isWellTyped()) {
            return;
        }

        if (!operand.isLvalue()) {
            this.addNote(CPPError.expr.postfixIncrement.lvalue_required(this));
        }
        else if (this.operator === "--" && Predicates.isTypedExpression(operand, isType(Bool))) {
            this.addNote(CPPError.expr.postfixIncrement.decrement_bool_prohibited(this));
        }
        else if (Predicates.isTypedExpression(operand, isArithmeticType) || Predicates.isTypedExpression(operand, isPointerToCompleteObjectType)) {

            // Use cv-unqualified type since result is a prvalue
            this.type = operand.type.cvUnqualified();

            if (operand.type.isConst) {
                this.addNote(CPPError.expr.postfixIncrement.const_prohibited(this, this.operator));
            }
        }
        else {
            this.addNote(CPPError.expr.postfixIncrement.operand(this));
        }
    }

    public static createFromAST(ast: PostfixIncrementExpressionASTNode, context: ExpressionContext): PostfixIncrementExpression {
        return new PostfixIncrementExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }

    public createDefaultOutlet(this: CompiledPostfixIncrementExpression, element: JQuery, parent?: ConstructOutlet) {
        return new PostfixIncrementExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedPostfixIncrementExpression<T extends ArithmeticType | PointerToCompleteObjectType = ArithmeticType | PointerToCompleteObjectType> extends PostfixIncrementExpression, t_TypedExpression {
    readonly type: T;
    readonly operand: TypedExpression<T, "lvalue">;
}

export interface CompiledPostfixIncrementExpression<T extends ArithmeticType | PointerToCompleteObjectType = ArithmeticType | PointerToCompleteObjectType> extends TypedPostfixIncrementExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpression<T, "lvalue">;
}

export class RuntimePostfixIncrementExpression<T extends ArithmeticType | PointerToCompleteObjectType = ArithmeticType | PointerToCompleteObjectType> extends SimpleRuntimeExpression<T, "prvalue", CompiledPostfixIncrementExpression<T>> {

    public operand: RuntimeExpression<T, "lvalue">;

    public constructor(model: CompiledPostfixIncrementExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.setSubexpressions([this.operand]);
    }

    protected operate() {

        let obj: CPPObject<ArithmeticType | PointerToCompleteObjectType> = this.operand.evalResult;
        let prevValue = obj.getValue();
        // TODO: add alert if value is invalid??
        // e.g. readValueWithAlert(evalValue, sim, this.from, inst.childInstances.from);
        // Three cases below:
        //   - Special case. ++ on a boolean just makes it true
        //   - arithmetic types modify by a delta
        //   - pointers handled specially
        let delta = this.model.operator === "++" ? 1 : -1;
        let newValue = prevValue.isTyped(isType(Bool)) ? new Value(1, Bool.BOOL) :
            prevValue.isTyped(isArithmeticType) ? prevValue.modify(v => v + delta) :
                prevValue.pointerOffset(new Value(delta, Int.INT));

        this.setEvalResult(<this["evalResult"]>prevValue);
        obj.writeValue(newValue);

        //         if (isA(obj.type, Types.ArrayPointer)){
        //             // Check that we haven't run off the array
        //             if (newRawValue < obj.type.min()){
        //                 if (obj.isValueValid()){ // it was valid but is just now becoming invalid
        //                     sim.alert("Oops. That pointer just wandered off the beginning of its array.");
        //                 }
        //             }
        //             else if (obj.type.onePast() < newRawValue){
        //                 if (obj.isValueValid()){ // it was valid but is just now becoming invalid
        //                     sim.alert("Oops. That pointer just wandered off the end of its array.");
        //                 }
        //             }
        //         }
        //         else if (isA(obj.type, Types.Pointer)){
        //             // If the RTTI works well enough, this should always be unsafe
        //             sim.undefinedBehavior("Uh, I don't think you're supposed to do arithmetic with that pointer. It's not pointing into an array.");
        //         }
    }

}
