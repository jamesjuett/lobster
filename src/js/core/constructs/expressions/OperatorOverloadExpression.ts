import { ExpressionASTNode } from "../../../ast/ast_expressions";
import { Mutable } from "../../../util/util";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { ConstructDescription, ExpressionContext } from "../../compilation/contexts";
import { FunctionEntity } from "../../compilation/entities";
import { CPPError } from "../../compilation/errors";
import { AtomicType, CompleteClassType, CompleteReturnType, FunctionType, PeelReference, peelReference, ReferenceType } from "../../compilation/types";
import { CPPObject } from "../../runtime/objects";
import { RuntimeConstruct, SuccessfullyCompiled } from "../CPPConstruct";
import { CompiledFunctionCall, FunctionCall, RuntimeFunctionCall, TypedFunctionCall } from "../FunctionCall";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { allWellTyped, CompiledExpression, Expression, TypedExpression, ValueCategory, VCResultTypes } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { createRuntimeExpression } from "./expressions";
import { InvalidExpression } from "./InvalidExpression";
import { t_OverloadableOperators } from "./selectOperatorOverload";
import { NonMemberOperatorOverloadExpressionOutlet, MemberOperatorOverloadExpressionOutlet } from "../../../view/constructs/ExpressionOutlets";


export class NonMemberOperatorOverloadExpression extends Expression<ExpressionASTNode> {
    public readonly construct_type = "non_member_operator_overload_expression";

    public readonly type?: PeelReference<CompleteReturnType>;
    public readonly valueCategory?: ValueCategory;

    public readonly operator: t_OverloadableOperators;

    public readonly originalArgs: readonly Expression[];

    public readonly call?: FunctionCall;

    public constructor(context: ExpressionContext, ast: ExpressionASTNode | undefined,
        operator: t_OverloadableOperators, args: readonly Expression[],
        selectedFunctionEntity: FunctionEntity) {
        super(context, ast);

        this.operator = operator;
        this.originalArgs = args;

        // If any arguments are not well typed, we can't select a function.
        if (!allWellTyped(args)) {
            // type, valueCategory, and call remain undefined
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
        this.attach(this.call = new FunctionCall(context, selectedFunctionEntity, args, undefined));
    }

    public createDefaultOutlet(this: CompiledNonMemberOperatorOverloadExpression, element: JQuery, parent?: ConstructOutlet) {
        return new NonMemberOperatorOverloadExpressionOutlet(element, this, parent);
    }

    // TODO
    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }




}

export interface TypedNonMemberOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends NonMemberOperatorOverloadExpression {
    readonly type: T;
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

    public constructor(model: CompiledNonMemberOperatorOverloadExpression<T, V>, parent: RuntimeConstruct) {
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
                this.setEvalResult(<VCResultTypes<T, V>>retObj);
            }
            else if (returnType.isAtomicType()) {
                // Return by value of atomic type. In this case, we can look up
                // the value of the return object and use that as the eval result
                let retObj = <CPPObject<AtomicType>>this.call!.calledFunction.returnObject!;
                this.setEvalResult(<VCResultTypes<T, V>>retObj.getValue());
            }
            else {
                // Return by value of a non-atomic type. In this case, it's still a prvalue
                // but is the temporary object rather than its value.
                let retObj = <CPPObject>this.call!.calledFunction.returnObject!;
                this.setEvalResult(<VCResultTypes<T, V>>retObj);
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

    public readonly operator: t_OverloadableOperators;

    public readonly originalArgs: readonly Expression[];

    public readonly receiverExpression: TypedExpression<CompleteClassType>;
    public readonly call?: FunctionCall;

    public constructor(context: ExpressionContext, ast: ExpressionASTNode | undefined, operator: t_OverloadableOperators,
        receiverExpression: TypedExpression<CompleteClassType>, args: readonly Expression[],
        selectedFunctionEntity: FunctionEntity) {
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
        this.attach(this.call = new FunctionCall(context, selectedFunctionEntity, args, receiverExpression.type));
    }

    public createDefaultOutlet(this: CompiledMemberOperatorOverloadExpression, element: JQuery, parent?: ConstructOutlet) {
        return new MemberOperatorOverloadExpressionOutlet(element, this, parent);
    }

    // TODO
    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }




}

export interface TypedMemberOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends MemberOperatorOverloadExpression {
    readonly type: T;
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

    public constructor(model: CompiledMemberOperatorOverloadExpression<T, V>, parent: RuntimeConstruct) {
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
                this.setEvalResult(<VCResultTypes<T, V>>retObj);
            }
            else if (returnType.isAtomicType()) {
                // Return by value of atomic type. In this case, we can look up
                // the value of the return object and use that as the eval result
                let retObj = <CPPObject<AtomicType>>this.call!.calledFunction.returnObject!;
                this.setEvalResult(<VCResultTypes<T, V>>retObj.getValue());
            }
            else {
                // Return by value of a non-atomic type. In this case, it's still a prvalue
                // but is the temporary object rather than its value.
                let retObj = <CPPObject>this.call!.calledFunction.returnObject!;
                this.setEvalResult(<VCResultTypes<T, V>>retObj);
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
    MemberOperatorOverloadExpression |
    InvalidOperatorOverloadExpression;

export class InvalidOperatorOverloadExpression extends InvalidExpression {
    public readonly construct_type = "invalid_operator_overload_expression";

    public readonly operator: t_OverloadableOperators;
    public readonly originalArgs: readonly Expression[];

    public constructor(context: ExpressionContext, ast: ExpressionASTNode, op: t_OverloadableOperators, originalArgs: readonly Expression[]) {
        super(context, ast);
        this.operator = op;

        if (allWellTyped(originalArgs)) {
            this.addNote(CPPError.expr.operatorOverload.no_such_overload(this, op));
        }

        this.attachAll(this.originalArgs = originalArgs);
    }

    public createDefaultOutlet(this: never, element: JQuery, parent?: ConstructOutlet): never {
        throw new Error("Cannot create an outlet for an invalid expression.");
    }

    public describeEvalResult(depth: number): ConstructDescription {
        return {
            message: "an unsupported expression"
        };
    }
}
