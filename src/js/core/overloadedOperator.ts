import { Expression, ValueCategory, allWellTyped, TypedExpression, CompiledExpression, RuntimeExpression, VCResultTypes } from "./expressionBase";
import { PeelReference, CompleteReturnType, peelReference, ReferenceType, CompleteObjectType, FunctionType, AtomicType, CompleteClassType, ExpressionType } from "./types";
import { FunctionCall, TypedFunctionCall, CompiledFunctionCall, RuntimeFunctionCall } from "./functionCall";
import { ExpressionContext, createExpressionContextWithParameterTypes, ConstructDescription, SuccessfullyCompiled, CompiledTemporaryDeallocator, RuntimeConstruct } from "./constructs";
import { IdentifierExpression, DotExpression, ArrowExpression, createExpressionFromAST, CompiledFunctionIdentifierExpression, CompiledFunctionDotExpression, RuntimeFunctionIdentifierExpression, RuntimeFunctionDotExpression, createRuntimeExpression, BinaryOperatorExpressionASTNode, t_BinaryOperators, entityLookup, overloadResolution, AssignmentExpressionASTNode, ExpressionASTNode } from "./expressions";
import { CPPError, NoteHandler } from "./errors";
import { FunctionEntity, Scope, DeclaredScopeEntry } from "./entities";
import { LOBSTER_MAGIC_FUNCTIONS, MAGIC_FUNCTION_NAMES } from "./lexical";
import { ConstructOutlet, NonMemberOperatorOverloadExpressionOutlet, MemberOperatorOverloadExpressionOutlet } from "../view/codeOutlets";
import { Mutable, assertFalse, assert } from "../util/util";
import { CPPObject } from "./objects";

export function selectOperatorOverload(context: ExpressionContext, ast: ExpressionASTNode, operator: OverloadableOperator, originalArgs: Expression[]) {

    if (!allWellTyped(originalArgs)) {
        return;
    }

    let leftmost = originalArgs[0];

    let operatorFunctionName = "operator" + operator;
    
    let lookupResult: DeclaredScopeEntry | undefined;
    let adjustedArgs: Expression[] | undefined;
    if (leftmost.type.isCompleteClassType()) {
        // Attempt member lookup for operator overload function
        adjustedArgs = originalArgs.slice(1);
        lookupResult = leftmost.type.classScope.lookup(operatorFunctionName, { kind: "normal", noParent: true });
    }

    // If we didn't find a member option
    if (!lookupResult) {
        lookupResult = context.contextualScope.lookup(operatorFunctionName, { kind: "normal" });
        adjustedArgs = originalArgs;
    }

    // If we still don't have anything
    if (!lookupResult || !adjustedArgs) {
        return;
    }

    // These are not possible since you can't have a variable or
    // class with a name of e.g. "operator+"
    assert(lookupResult.declarationKind !== "variable");
    assert(lookupResult.declarationKind !== "class");

    let selected = overloadResolution(lookupResult.overloads, adjustedArgs.map(arg => arg.type)).selected;

    if (selected) {
        if (selected.isMemberFunction()) {
            return new MemberOperatorOverloadExpression(context, ast, operator, <TypedExpression<CompleteClassType>>leftmost, adjustedArgs, selected);
        }
        else {
            return new NonMemberOperatorOverloadExpression(context, ast, operator, adjustedArgs, selected);
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

export type OverloadableOperator = t_BinaryOperators | "=" | "[]";

export class NonMemberOperatorOverloadExpression extends Expression<ExpressionASTNode> {
    public readonly construct_type = "non_member_operator_overload_expression";

    public readonly type?: PeelReference<CompleteReturnType>;
    public readonly valueCategory?: ValueCategory;

    public readonly operator: OverloadableOperator;

    public readonly originalArgs: readonly Expression[];

    public readonly call?: FunctionCall;

    public constructor(context: ExpressionContext, ast: ExpressionASTNode | undefined,
                       operator: OverloadableOperator, args: readonly Expression[],
                       selectedFunctionEntity: FunctionEntity | undefined) {
        super(context, ast);

        this.operator = operator;
        this.originalArgs = args;

        // If any arguments are not well typed, we can't select a function.
        if (!allWellTyped(args)) {
            // type, valueCategory, and call remain undefined
            this.attachAll(args);
            return;
        }

        if (!selectedFunctionEntity) {
            // type, valueCategory, and call remain undefined
            this.addNote(CPPError.expr.binaryOperatorOverload.no_such_overload(this, this.operator));
            this.attachAll(args);
            return;
        }

        if (!selectedFunctionEntity.returnsCompleteType()) {
            this.addNote(CPPError.expr.functionCall.incomplete_return_type(this, selectedFunctionEntity.type.returnType));
            this.attachAll(args);
            return;
        }

        let returnType = selectedFunctionEntity.type.returnType;
        this.type = peelReference(returnType);
        this.valueCategory = returnType instanceof ReferenceType ? "lvalue" : "prvalue";

        // If we get to here, we don't attach the args directly since they will be attached under the function call.
        this.attach(this.call = new FunctionCall(
            context,
            selectedFunctionEntity, args));
    }

    public createDefaultOutlet(this: CompiledNonMemberOperatorOverloadExpression, element: JQuery, parent?: ConstructOutlet) {
        return new NonMemberOperatorOverloadExpressionOutlet(element, this, parent);
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

export interface TypedNonMemberOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends NonMemberOperatorOverloadExpression {
    readonly type: T
    readonly valueCategory: V;
    readonly call: TypedFunctionCall<FunctionType<CompleteReturnType>>;
}

export interface CompiledNonMemberOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends TypedNonMemberOperatorOverloadExpression<T, V>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly originalArgs: readonly CompiledExpression[];
    readonly call: CompiledFunctionCall<FunctionType<CompleteReturnType>>;
}

export class RuntimeNonMemberOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T, V, CompiledNonMemberOperatorOverloadExpression<T, V>> {

    public readonly call: RuntimeFunctionCall<FunctionType<CompleteReturnType>>;

    public constructor(model: CompiledNonMemberOperatorOverloadExpression<T,V>, parent: RuntimeConstruct) {
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





export class MemberOperatorOverloadExpression extends Expression<ExpressionASTNode> {
    public readonly construct_type = "member_operator_overload_expression";

    public readonly type?: PeelReference<CompleteReturnType>;
    public readonly valueCategory?: ValueCategory;

    public readonly operator: OverloadableOperator;

    public readonly originalArgs: readonly Expression[];
    
    public readonly receiverExpression: TypedExpression<CompleteClassType>;
    public readonly call?: FunctionCall;

    public constructor(context: ExpressionContext, ast: ExpressionASTNode | undefined, operator: OverloadableOperator,
                       receiverExpression: TypedExpression<CompleteClassType>, args: readonly Expression[],
                       selectedFunctionEntity: FunctionEntity | undefined) {
        super(context, ast);

        this.operator = operator;
        this.attach(this.receiverExpression = receiverExpression);
        this.originalArgs = args;

        // If any arguments are not well typed, we can't select a function.
        if (!receiverExpression.isWellTyped() || !allWellTyped(args)) {
            // type, valueCategory, and call remain undefined
            this.attachAll(args);
            return;
        }

        if (!selectedFunctionEntity) {
            // type, valueCategory, and call remain undefined
            this.addNote(CPPError.expr.binaryOperatorOverload.no_such_overload(this, this.operator));
            this.attachAll(args);
            return;
        }

        if (!selectedFunctionEntity.returnsCompleteType()) {
            this.addNote(CPPError.expr.functionCall.incomplete_return_type(this, selectedFunctionEntity.type.returnType));
            this.attachAll(args);
            return;
        }

        let returnType = selectedFunctionEntity.type.returnType;
        this.type = peelReference(returnType);
        this.valueCategory = returnType instanceof ReferenceType ? "lvalue" : "prvalue";

        // Attach the right as an argument of the function call.
        // Left is the receiver of that call and was already attached as a child.
        this.attach(this.call = new FunctionCall(
            context,
            selectedFunctionEntity, args));
    }

    public createDefaultOutlet(this: CompiledMemberOperatorOverloadExpression, element: JQuery, parent?: ConstructOutlet) {
        return new MemberOperatorOverloadExpressionOutlet(element, this, parent);
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

export interface TypedMemberOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends MemberOperatorOverloadExpression {
    readonly type: T
    readonly valueCategory: V;
    readonly call: TypedFunctionCall<FunctionType<CompleteReturnType>>;
}

export interface CompiledMemberOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends TypedMemberOperatorOverloadExpression<T, V>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure


    readonly originalArgs: readonly CompiledExpression[];
    readonly receiverExpression: CompiledExpression<CompleteClassType>;
    readonly call: CompiledFunctionCall<FunctionType<CompleteReturnType>>;
}

export class RuntimeMemberOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T, V, CompiledMemberOperatorOverloadExpression<T, V>> {

    public readonly receiverExpression: RuntimeExpression<CompleteClassType>;
    public readonly call?: RuntimeFunctionCall<FunctionType<CompleteReturnType>>;

    public constructor(model: CompiledMemberOperatorOverloadExpression<T,V>, parent: RuntimeConstruct) {
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


export type OperatorOverloadExpression =
    NonMemberOperatorOverloadExpression |
    MemberOperatorOverloadExpression;