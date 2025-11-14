import { CPPObject } from "../../runtime/objects";
import { isType, Bool, ArithmeticType, Int, isArithmeticType, PointerToCompleteType as PointerToCompleteObjectType, isPointerToCompleteObjectType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription, SemanticContext, areSemanticallyEquivalent } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../CPPConstruct";
import { CPPError } from "../../compilation/errors";
import { Value } from "../../runtime/Value";
import { Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { AnalyticConstruct, Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { PrefixIncrementExpressionASTNode } from "../../../ast/ast_expressions";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { UnaryOperatorExpression } from "./UnaryOperatorExpression";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";








export class PrefixIncrementExpression extends UnaryOperatorExpression<PrefixIncrementExpressionASTNode> {
    public readonly construct_type = "prefix_increment_expression";

    public readonly type?: ArithmeticType | PointerToCompleteObjectType;
    public readonly valueCategory = "lvalue";

    public readonly operand: Expression;

    public readonly operator: "++" | "--";

    public constructor(context: ExpressionContext, ast: PrefixIncrementExpressionASTNode, operand: Expression) {
        super(context, ast);
        this.operator = ast.operator;

        this.attach(this.operand = operand);

        if (!operand.isWellTyped()) {
            return;
        }

        if (!operand.isLvalue()) {
            this.addNote(CPPError.expr.prefixIncrement.lvalue_required(this));
        }
        else if (this.operator === "--" && Predicates.isTypedExpression(operand, isType(Bool))) {
            this.addNote(CPPError.expr.prefixIncrement.decrement_bool_prohibited(this));
        }
        else if (Predicates.isTypedExpression(operand, isArithmeticType) || Predicates.isTypedExpression(operand, isPointerToCompleteObjectType)) {
            this.type = operand.type;
            if (operand.type.isConst) {
                this.addNote(CPPError.expr.prefixIncrement.const_prohibited(this));
            }
        }
        else {
            this.addNote(CPPError.expr.prefixIncrement.operand(this));
        }
    }

    public static createFromAST(ast: PrefixIncrementExpressionASTNode, context: ExpressionContext): PrefixIncrementExpression {
        return new PrefixIncrementExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

    public override isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {

        if (other.construct_type !== "prefix_increment_expression"
            && other.construct_type !== "postfix_increment_expression") { 
            return false;
        }

        if (other.operator !== this.operator) {
            return false;
        }

        if (other.construct_type === this.construct_type) {
            // both prefix or both postfix, equiv depends on operands
            return areSemanticallyEquivalent(this.operand, other.operand, ec);
        }

        if (this.isFullExpression() && other.isFullExpression()) {
            // both are full expressions, not subexpressions, so
            // prefix vs postfix doesn't matter
            return areSemanticallyEquivalent(this.operand, other.operand, ec);
        }
        
        return false;
    }
}

export interface TypedPrefixIncrementExpression<T extends ArithmeticType | PointerToCompleteObjectType = ArithmeticType | PointerToCompleteObjectType> extends PrefixIncrementExpression, t_TypedExpression {
    readonly type: T;
    readonly operand: TypedExpression<T, "lvalue">;
}

export interface CompiledPrefixIncrementExpression<T extends ArithmeticType | PointerToCompleteObjectType = ArithmeticType | PointerToCompleteObjectType> extends TypedPrefixIncrementExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpression<T, "lvalue">;
}

export class RuntimePrefixIncrementExpression<T extends ArithmeticType | PointerToCompleteObjectType> extends SimpleRuntimeExpression<T, "lvalue", CompiledPrefixIncrementExpression<T>> {

    public operand: RuntimeExpression<T, "lvalue">;

    public constructor(model: CompiledPrefixIncrementExpression<T>, parent: RuntimeConstruct) {
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

        obj.writeValue(newValue);
        this.setEvalResult(<this["evalResult"]>obj);

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
