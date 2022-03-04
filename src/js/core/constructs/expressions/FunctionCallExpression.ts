import { AnalyticConstruct } from "../../../analysis/predicates";
import { FunctionCallExpressionASTNode } from "../../../ast/ast_expressions";
import { Mutable } from "../../../util/util";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { areAllSemanticallyEquivalent, areSemanticallyEquivalent, ConstructDescription, createExpressionContextWithParameterTypes, ExpressionContext, SemanticContext } from "../../compilation/contexts";
import { FunctionEntity } from "../../compilation/entities";
import { CPPError } from "../../compilation/errors";
import { astToIdentifier, identifierToString, LOBSTER_MAGIC_FUNCTIONS, MAGIC_FUNCTION_NAMES } from "../../compilation/lexical";
import { AtomicType, CompleteReturnType, FunctionType, isPotentiallyCompleteClassType, PeelReference, peelReference, ReferenceType } from "../../compilation/types";
import { CPPObject } from "../../runtime/objects";
import { RuntimeConstruct, SuccessfullyCompiled } from "../CPPConstruct";
import { CompiledFunctionCall, FunctionCall, RuntimeFunctionCall, TypedFunctionCall } from "../FunctionCall";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { ArrowExpression, CompiledFunctionArrowExpression, RuntimeFunctionArrowExpression } from "./ArrowExpression";
import { CompiledFunctionDotExpression, DotExpression, RuntimeFunctionDotExpression } from "./DotExpression";
import { allWellTyped, CompiledExpression, Expression, ValueCategory, VCResultTypes } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { AnalyticExpression, createExpressionFromAST, createRuntimeExpression } from "./expressions";
import { CompiledFunctionIdentifierExpression, IdentifierExpression, RuntimeFunctionIdentifierExpression } from "./IdentifierExpression";
import { MagicFunctionCallExpression } from "./MagicFunctionCallExpression";
import { selectOperatorOverload } from "./selectOperatorOverload";
import { InvalidOperatorOverloadExpression, OperatorOverloadExpression } from "./OperatorOverloadExpression";
import { FunctionCallExpressionOutlet } from "../../../view/constructs/ExpressionOutlets";





// type FunctionResultType<T extends FunctionType> = NoRefType<Exclude<T["returnType"], VoidType>>; // TODO: this isn't used? should I use it somewhere?
// type ReturnTypeVC<RT extends PotentialReturnType> = RT extends ReferenceType ? "lvalue" : "prvalue";

export class FunctionCallExpression extends Expression<FunctionCallExpressionASTNode> {
    public readonly construct_type = "function_call_expression";

    public readonly type?: PeelReference<CompleteReturnType>;
    public readonly valueCategory?: ValueCategory;

    public readonly operand: Expression;
    public readonly originalArgs: readonly Expression[];
    public readonly call?: FunctionCall;

    public constructor(context: ExpressionContext, ast: FunctionCallExpressionASTNode | undefined, operand: Expression, args: readonly Expression[]) {
        super(context, ast);

        this.attach(this.operand = operand);
        this.originalArgs = args;

        // If any arguments are not well typed, we can't select a function.
        if (!allWellTyped(args)) {
            // type, valueCategory, and call remain undefined
            this.attachAll(args);
            return;
        }

        const analytic_operand = <AnalyticExpression>operand;
        if (!(analytic_operand.construct_type === "identifier_expression" || analytic_operand.construct_type === "dot_expression" || analytic_operand.construct_type === "arrow_expression")) {
            this.addNote(CPPError.expr.functionCall.invalid_operand_expression(this, analytic_operand));
            this.attachAll(args);
            return;
        }

        if (!analytic_operand.entity) {
            // type, valueCategory, and call remain undefined
            // analytic_operand will already have an error about the failed lookup
            this.attachAll(args);
            return;
        }

        if (!(analytic_operand.entity instanceof FunctionEntity)) {
            // type, valueCategory, and call remain undefined
            this.addNote(CPPError.expr.functionCall.operand(this, analytic_operand.entity));
            this.attachAll(args);
            return;
        }


        if (!analytic_operand.entity.returnsCompleteType()) {
            this.attachAll(args);
            this.addNote(CPPError.expr.functionCall.incomplete_return_type(this, analytic_operand.entity.type.returnType));
            return;
        }

        let returnType = analytic_operand.entity.type.returnType;
        this.type = peelReference(returnType);

        this.valueCategory = returnType instanceof ReferenceType ? "lvalue" : "prvalue";

        // If we get to here, we don't attach the args directly since they will be attached under the function call.
        this.attach(this.call = new FunctionCall(context, analytic_operand.entity, args, analytic_operand.context.contextualReceiverType));
    }

    public static createFromAST(ast: FunctionCallExpressionASTNode, context: ExpressionContext): FunctionCallExpression | MagicFunctionCallExpression | OperatorOverloadExpression {
        let args = ast.args.map(arg => createExpressionFromAST(arg, context));


        if (ast.operand.construct_type === "identifier_expression") {
            let identifierStr = identifierToString(astToIdentifier(ast.operand.identifier));
            if (LOBSTER_MAGIC_FUNCTIONS.has(identifierStr)) {
                return new MagicFunctionCallExpression(context, ast, <MAGIC_FUNCTION_NAMES>identifierStr, args);
            }
        }

        let contextualParamTypes = args.map(arg => arg.type);
        let operand = createExpressionFromAST(ast.operand, createExpressionContextWithParameterTypes(context, contextualParamTypes));

        // Consider an assignment operator overload if the LHS is class type
        if (operand.isWellTyped() && isPotentiallyCompleteClassType(operand.type)) {
            return selectOperatorOverload(context, ast, "[]", [operand, ...args]) ??
                new InvalidOperatorOverloadExpression(context, ast, "[]", [operand, ...args]);;
        }
        return new FunctionCallExpression(context, ast, operand, args);
    }

    public createDefaultOutlet(this: CompiledFunctionCallExpression, element: JQuery, parent?: ConstructOutlet) {
        return new FunctionCallExpressionOutlet(element, this, parent);
    }

    // TODO
    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && areSemanticallyEquivalent(this.operand, other.operand, ec)
            && areAllSemanticallyEquivalent(this.originalArgs, other.originalArgs, ec);
    }


}
// If it's a complete return type, it might have been behind a reference or maybe not.
// If it's an incomplete type, the only way we could have returned it is if it was behind a reference.
type PossibleVC<T extends PeelReference<CompleteReturnType>> = T extends CompleteReturnType ? ValueCategory : "lvalue";

export interface TypedFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends FunctionCallExpression {
    readonly type: T;
    readonly valueCategory: V;
    readonly call: TypedFunctionCall<FunctionType<CompleteReturnType>>;
}

export interface CompiledFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends TypedFunctionCallExpression<T, V>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure


    readonly operand: CompiledFunctionIdentifierExpression | CompiledFunctionDotExpression | CompiledFunctionArrowExpression;
    readonly originalArgs: readonly CompiledExpression[];
    readonly call: CompiledFunctionCall<FunctionType<CompleteReturnType>>;
}

export const INDEX_FUNCTION_CALL_EXPRESSION_OPERAND = 0;
export const INDEX_FUNCTION_CALL_EXPRESSION_CALL = 1;
export const INDEX_FUNCTION_CALL_EXPRESSION_RETURN = 2;
export class RuntimeFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T, V, CompiledFunctionCallExpression<T, V>> {

    public readonly operand: RuntimeFunctionIdentifierExpression | RuntimeFunctionDotExpression | RuntimeFunctionArrowExpression;
    public readonly call?: RuntimeFunctionCall<FunctionType<CompleteReturnType>>;

    public readonly index: typeof INDEX_FUNCTION_CALL_EXPRESSION_OPERAND | typeof INDEX_FUNCTION_CALL_EXPRESSION_CALL | typeof INDEX_FUNCTION_CALL_EXPRESSION_RETURN = INDEX_FUNCTION_CALL_EXPRESSION_OPERAND;

    public constructor(model: CompiledFunctionCallExpression<T, V>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = <this["operand"]>createRuntimeExpression(this.model.operand, this);
    }

    protected upNextImpl() {
        if (this.index === INDEX_FUNCTION_CALL_EXPRESSION_OPERAND) {
            this.sim.push(this.operand);
            (<Mutable<this>>this).index = INDEX_FUNCTION_CALL_EXPRESSION_CALL;
        }
        else if (this.index === INDEX_FUNCTION_CALL_EXPRESSION_CALL) {
            // We check the contextual receiver here since it changes after the operand is evaluated.
            (<Mutable<this>>this).call = this.model.call.createRuntimeFunctionCall(this, this.operand.contextualReceiver);
            this.sim.push(this.call!);
            (<Mutable<this>>this).index = INDEX_FUNCTION_CALL_EXPRESSION_RETURN;
        }
        else if (this.index === INDEX_FUNCTION_CALL_EXPRESSION_RETURN) {

            // Note: cannot use this.model.type here, since that is the type of the function
            // call expression, which would have had the reference type removed if this was return
            // by reference. Instead, use the return type of the called function itself, which will have
            // the reference type intact.
            let returnType = this.model.call.func.type.returnType;

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
