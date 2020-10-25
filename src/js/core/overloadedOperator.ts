import { Expression, ValueCategory, allWellTyped, TypedExpression, CompiledExpression, RuntimeExpression, VCResultTypes } from "./expressionBase";
import { PeelReference, CompleteReturnType, peelReference, ReferenceType, CompleteObjectType, FunctionType, AtomicType, CompleteClassType, ExpressionType } from "./types";
import { FunctionCall, TypedFunctionCall, CompiledFunctionCall, RuntimeFunctionCall } from "./functionCall";
import { ExpressionContext, createExpressionContextWithParameterTypes, ConstructDescription, SuccessfullyCompiled, CompiledTemporaryDeallocator, RuntimeConstruct } from "./constructs";
import { IdentifierExpression, DotExpression, ArrowExpression, createExpressionFromAST, CompiledFunctionIdentifierExpression, CompiledFunctionDotExpression, RuntimeFunctionIdentifierExpression, RuntimeFunctionDotExpression, createRuntimeExpression, BinaryOperatorExpressionASTNode, t_BinaryOperators, entityLookup, overloadResolution, AssignmentExpressionASTNode, ExpressionASTNode } from "./expressions";
import { CPPError, NoteHandler } from "./errors";
import { FunctionEntity, Scope, DeclaredScopeEntry } from "./entities";
import { LOBSTER_MAGIC_FUNCTIONS, MAGIC_FUNCTION_NAMES } from "./lexical";
import { ConstructOutlet, BinaryNonMemberOperatorOverloadExpressionOutlet, BinaryMemberOperatorOverloadExpressionOutlet } from "../view/codeOutlets";
import { Mutable, assertFalse, assert } from "../util/util";
import { CPPObject } from "./objects";

export function selectBinaryOperatorOverload(context: ExpressionContext, ast: ExpressionASTNode, operator: OverloadableOperator, left: Expression, right: Expression) {

    if (!left.isWellTyped() || !right.isWellTyped()) {
        return;
    }

    let leftType = left.type;
    let rightType = right.type;

    let operatorFunctionName = "operator" + operator;
    
    let lookupResult: DeclaredScopeEntry | undefined;
    let argTypes: ExpressionType[] | undefined;
    if (leftType.isCompleteClassType()) {
        // Attempt member lookup for operator overload function
        lookupResult = leftType.classScope.lookup(operatorFunctionName, { kind: "normal", noParent: true });
        argTypes = [right.type];
    }

    // If we didn't find a member option
    if (!lookupResult) {
        lookupResult = context.contextualScope.lookup(operatorFunctionName, { kind: "normal" });
        argTypes = [left.type, right.type];
    }

    // If we still don't have anything
    if (!lookupResult || !argTypes) {
        return;
    }

    // These are not possible since you can't have a variable or
    // class with a name of e.g. "operator+"
    assert(lookupResult.declarationKind !== "variable");
    assert(lookupResult.declarationKind !== "class");

    let selected = overloadResolution(lookupResult.overloads, argTypes).selected;

    if (selected) {
        if (selected.isMemberFunction()) {
            return new MemberBinaryOperatorOverloadExpression(context, ast, operator, <TypedExpression<CompleteClassType>>left, right, selected);
        }
        else {
            return new NonMemberBinaryOperatorOverloadExpression(context, ast, operator, left, right, selected);
        }
    }
    else {
        return undefined;
    }
}

// TODO
// export type NonMemberOperatorOverloadExpressionAST =
//     BinaryOperatorExpressionASTNode |
//     AssignmentExpressionASTNode;

export type OverloadableOperator = t_BinaryOperators | "=";

export class NonMemberBinaryOperatorOverloadExpression extends Expression<ExpressionASTNode> {
    public readonly construct_type = "non_member_binary_operator_overload_expression";

    public readonly type?: PeelReference<CompleteReturnType>;
    public readonly valueCategory?: ValueCategory;

    public readonly operator: OverloadableOperator;

    public readonly originalLeft: Expression;
    public readonly originalRight: Expression;

    public readonly call?: FunctionCall;

    public constructor(context: ExpressionContext, ast: ExpressionASTNode | undefined,
                       operator: OverloadableOperator, left: Expression, right: Expression,
                       selectedFunctionEntity: FunctionEntity | undefined) {
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

    public createDefaultOutlet(this: CompiledNonMemberBinaryOperatorOverloadExpression, element: JQuery, parent?: ConstructOutlet) {
        return new BinaryNonMemberOperatorOverloadExpressionOutlet(element, this, parent);
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

export interface TypedNonMemberBinaryOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends NonMemberBinaryOperatorOverloadExpression {
    readonly type: T
    readonly valueCategory: V;
    readonly call: TypedFunctionCall<FunctionType<CompleteReturnType>>;
}

export interface CompiledNonMemberBinaryOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends TypedNonMemberBinaryOperatorOverloadExpression<T, V>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure


    readonly originalLeft: CompiledExpression;
    readonly originalRight: CompiledExpression;
    readonly call: CompiledFunctionCall<FunctionType<CompleteReturnType>>;
}

export class RuntimeNonMemberBinaryOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T, V, CompiledNonMemberBinaryOperatorOverloadExpression<T, V>> {

    public readonly call: RuntimeFunctionCall<FunctionType<CompleteReturnType>>;

    public constructor(model: CompiledNonMemberBinaryOperatorOverloadExpression<T,V>, parent: RuntimeConstruct) {
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





export class MemberBinaryOperatorOverloadExpression extends Expression<ExpressionASTNode> {
    public readonly construct_type = "member_binary_operator_overload_expression";

    public readonly type?: PeelReference<CompleteReturnType>;
    public readonly valueCategory?: ValueCategory;

    public readonly operator: OverloadableOperator;

    public readonly originalRight: Expression;
    
    public readonly receiverExpression: TypedExpression<CompleteClassType>;
    public readonly call?: FunctionCall;

    public constructor(context: ExpressionContext, ast: ExpressionASTNode | undefined,
                       operator: OverloadableOperator, left: TypedExpression<CompleteClassType>, right: Expression,
                       selectedFunctionEntity: FunctionEntity | undefined) {
        super(context, ast);

        this.operator = operator;
        this.attach(this.receiverExpression = left);
        this.originalRight = right;

        // If any arguments are not well typed, we can't select a function.
        if (!left.isWellTyped() || !right.isWellTyped()) {
            // type, valueCategory, and call remain undefined
            this.attach(right);
            return;
        }

        if (!selectedFunctionEntity) {
            // type, valueCategory, and call remain undefined
            this.addNote(CPPError.expr.binaryOperatorOverload.no_such_overload(this, this.operator));
            this.attach(right);
            return;
        }

        if (!selectedFunctionEntity.returnsCompleteType()) {
            this.addNote(CPPError.expr.functionCall.incomplete_return_type(this, selectedFunctionEntity.type.returnType));
            this.attach(right);
            return;
        }

        let returnType = selectedFunctionEntity.type.returnType;
        this.type = peelReference(returnType);
        this.valueCategory = returnType instanceof ReferenceType ? "lvalue" : "prvalue";

        // Attach the right as an argument of the function call.
        // Left is the receiver of that call and was already attached as a child.
        this.attach(this.call = new FunctionCall(
            context,
            selectedFunctionEntity,[right]));
    }

    public createDefaultOutlet(this: CompiledMemberBinaryOperatorOverloadExpression, element: JQuery, parent?: ConstructOutlet) {
        return new BinaryMemberOperatorOverloadExpressionOutlet(element, this, parent);
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

export interface TypedMemberBinaryOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends MemberBinaryOperatorOverloadExpression {
    readonly type: T
    readonly valueCategory: V;
    readonly call: TypedFunctionCall<FunctionType<CompleteReturnType>>;
}

export interface CompiledMemberBinaryOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends TypedMemberBinaryOperatorOverloadExpression<T, V>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure


    readonly originalRight: CompiledExpression;
    readonly receiverExpression: CompiledExpression<CompleteClassType>;
    readonly call: CompiledFunctionCall<FunctionType<CompleteReturnType>>;
}

export class RuntimeMemberBinaryOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T, V, CompiledMemberBinaryOperatorOverloadExpression<T, V>> {

    public readonly receiverExpression: RuntimeExpression<CompleteClassType>;
    public readonly call?: RuntimeFunctionCall<FunctionType<CompleteReturnType>>;

    public constructor(model: CompiledMemberBinaryOperatorOverloadExpression<T,V>, parent: RuntimeConstruct) {
        super(model, parent);
        this.receiverExpression = createRuntimeExpression(this.model.receiverExpression, this);
    }

    protected upNextImpl() {
        if (!this.receiverExpression.isDone) {
            this.sim.push(this.receiverExpression);
        }
        else if (!this.call) {
            (<Mutable<this>>this).call = this.model.call.createRuntimeFunctionCall(this, this.receiverExpression.evalResult);
            this.sim.push(this.call!);
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


export type BinaryOperatorOverloadExpression =
    NonMemberBinaryOperatorOverloadExpression |
    MemberBinaryOperatorOverloadExpression;