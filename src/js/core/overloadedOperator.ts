import { Expression, ValueCategory, allWellTyped, TypedExpression, CompiledExpression, RuntimeExpression, VCResultTypes } from "./expressionBase";
import { PeelReference, CompleteReturnType, peelReference, ReferenceType, CompleteObjectType, FunctionType, AtomicType, CompleteClassType } from "./types";
import { FunctionCall, TypedFunctionCall, CompiledFunctionCall, RuntimeFunctionCall } from "./functionCall";
import { ExpressionContext, createExpressionContextWithParameterTypes, ConstructDescription, SuccessfullyCompiled, CompiledTemporaryDeallocator, RuntimeConstruct } from "./constructs";
import { IdentifierExpression, DotExpression, ArrowExpression, createExpressionFromAST, CompiledFunctionIdentifierExpression, CompiledFunctionDotExpression, RuntimeFunctionIdentifierExpression, RuntimeFunctionDotExpression, createRuntimeExpression, BinaryOperatorExpressionASTNode, t_BinaryOperators, entityLookup, overloadResolution } from "./expressions";
import { CPPError } from "./errors";
import { FunctionEntity } from "./entities";
import { LOBSTER_MAGIC_FUNCTIONS, MAGIC_FUNCTION_NAMES } from "./lexical";
import { ConstructOutlet, BinaryOperatorOverloadExpressionOutlet } from "../view/codeOutlets";
import { Mutable, assertFalse, assert } from "../util/util";
import { CPPObject } from "./objects";

export class BinaryOperatorOverloadExpression extends Expression<BinaryOperatorExpressionASTNode> {
    public readonly construct_type = "binary_operator_overload_expression";

    public readonly type?: PeelReference<CompleteReturnType>;
    public readonly valueCategory?: ValueCategory;

    public readonly operator: t_BinaryOperators;

    public readonly originalLeft: Expression;
    public readonly originalRight: Expression;

    public readonly call?: FunctionCall;

    public constructor(context: ExpressionContext, ast: BinaryOperatorExpressionASTNode | undefined, operator: t_BinaryOperators,
                       left: Expression, right: Expression) {
        super(context, ast);

        this.operator = operator;
        this.originalLeft = left;
        this.originalRight = right;

        // If any arguments are not well typed, we can't select a function.
        if (!left.isWellTyped() || !right.isWellTyped()) {
            // type, valueCategory, and call remain undefined
            this.attach(left);
            this.attach(right);
            return;
        }
        
        let lookupResult = context.contextualScope.lookup("operator" + this.operator, { kind: "normal" });

        if (!lookupResult) {
            this.addNote(CPPError.expr.binaryOperatorOverload.no_such_overload(this, this.operator));
            return;
        }

        // These are not possible since you can't have a variable or
        // class with a name of e.g. "operator+"
        assert(lookupResult.declarationKind !== "variable");
        assert(lookupResult.declarationKind !== "class");

        let overloadResult = overloadResolution(lookupResult.overloads, [left.type, right.type]);
        let selectedFunctionEntity = overloadResult.selected;

        if (!selectedFunctionEntity) {
            // type, valueCategory, and call remain undefined
            this.addNote(CPPError.expr.binaryOperatorOverload.no_such_overload(this, this.operator));
            this.attach(left);
            this.attach(right);
            return;
        }

        if (!selectedFunctionEntity.returnsCompleteType()) {
            this.addNote(CPPError.expr.functionCall.incomplete_return_type(this, selectedFunctionEntity.type.returnType));
            this.attach(left);
            this.attach(right);
            return;
        }

        let returnType = selectedFunctionEntity.type.returnType;
        this.type = peelReference(returnType);
        this.valueCategory = returnType instanceof ReferenceType ? "lvalue" : "prvalue";

        // If we get to here, we don't attach the args directly since they will be attached under the function call.
        this.attach(this.call = new FunctionCall(
            context,
            selectedFunctionEntity,[left, right]));
    }

    public createDefaultOutlet(this: CompiledBinaryOperatorOverloadExpression, element: JQuery, parent?: ConstructOutlet) {
        return new BinaryOperatorOverloadExpressionOutlet(element, this, parent);
    }

    // TODO
    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }




    // isTailChild : function(child){
    //     return {isTail: child === this.funcCall
    //     };
    // }
}

export interface TypedBinaryOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends BinaryOperatorOverloadExpression {
    readonly type: T
    readonly valueCategory: V;
    readonly call: TypedFunctionCall<FunctionType<CompleteReturnType>>;
}

export interface CompiledBinaryOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends TypedBinaryOperatorOverloadExpression<T, V>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure


    readonly originalLeft: CompiledExpression;
    readonly originalRight: CompiledExpression;
    readonly call: CompiledFunctionCall<FunctionType<CompleteReturnType>>;
}

const INDEX_BINARY_OPERATOR_OVERLOAD_EXPRESSION_CALL = 1;
const INDEX_BINARY_OPERATOR_OVERLOAD_EXPRESSION_RETURN = 2;
export class RuntimeBinaryOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T, V, CompiledBinaryOperatorOverloadExpression<T, V>> {

    public readonly call: RuntimeFunctionCall<FunctionType<CompleteReturnType>>;

    public readonly index: typeof INDEX_BINARY_OPERATOR_OVERLOAD_EXPRESSION_CALL | typeof INDEX_BINARY_OPERATOR_OVERLOAD_EXPRESSION_RETURN = INDEX_BINARY_OPERATOR_OVERLOAD_EXPRESSION_CALL;

    public constructor(model: CompiledBinaryOperatorOverloadExpression<T,V>, parent: RuntimeConstruct) {
        super(model, parent);
        this.call = this.model.call.createRuntimeFunctionCall(this, undefined);
    }

    protected upNextImpl() {
        if (!this.call.isDone) {
            this.sim.push(this.call);
        }
        else {

            // Note: cannot use this.model.type here, since that is the type of the function
            // call expression, which would have had the reference type removed if this was return
            // by reference. Instead, use the return type of the called function itself, which will have
            // the reference type intact.
            let returnType = this.model.call.func.type.returnType;

            // NOTE: below is copied from RuntimeFunctionCallExpresssion
            if (returnType.isVoidType()) {
                // this.setEvalResult(null); // TODO: type system won't allow this currently
            }
            else if (returnType.isReferenceType()) {
                // Return by reference is lvalue and yields the returned object
                let retObj = <CPPObject>this.call!.calledFunction.returnObject!;
                this.setEvalResult(<VCResultTypes<T,V>>retObj);
            }
            else if (returnType.isAtomicType()) {
                // Return by value of atomic type. In this case, we can look up
                // the value of the return object and use that as the eval result
                let retObj = <CPPObject<AtomicType>>this.call!.calledFunction.returnObject!;
                this.setEvalResult(<VCResultTypes<T,V>>retObj.getValue());
            }
            else {
                // Return by value of a non-atomic type. In this case, it's still a prvalue
                // but is the temporary object rather than its value.
                let retObj = <CPPObject>this.call!.calledFunction.returnObject!;
                this.setEvalResult(<VCResultTypes<T,V>>retObj);
            }
            this.startCleanup();
        }
    }

    protected stepForwardImpl() {
        // nothing to do
    }
}