import { PointerType, isFunctionType, isCompleteObjectType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { CPPError } from "../../compilation/errors";
import { Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { AddressOfExpressionASTNode } from "../../../ast/ast_expressions";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { UnaryOperatorExpression } from "./UnaryOperatorExpression";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";








export class AddressOfExpression extends UnaryOperatorExpression<AddressOfExpressionASTNode> {
    public readonly construct_type = "address_of_expression";

    public readonly type?: PointerType;
    public readonly valueCategory = "prvalue";

    public readonly operand: Expression;

    public readonly operator = "&";

    public constructor(context: ExpressionContext, ast: AddressOfExpressionASTNode, operand: Expression) {
        super(context, ast);

        this.attach(this.operand = operand);

        if (!operand.isWellTyped()) {
            return;
        }

        if (operand.valueCategory !== "lvalue") {
            this.addNote(CPPError.expr.addressOf.lvalue_required(this));
        }

        if (Predicates.isTypedExpression(operand, isFunctionType)) {
            this.addNote(CPPError.lobster.unsupported_feature(this, "Function Pointers"));
            return;
        }

        if (!Predicates.isTypedExpression(operand, isCompleteObjectType)) {
            this.addNote(CPPError.expr.addressOf.object_type_required(this));
            return;
        }

        this.type = new PointerType(operand.type);
    }

    public static createFromAST(ast: AddressOfExpressionASTNode, context: ExpressionContext): AddressOfExpression {
        return new AddressOfExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }

    // public createRuntimeExpression<T extends ObjectType>(this: CompiledAddressOfExpression<T>, parent: RuntimeConstruct) : RuntimeAddressOfExpression<T>;
    // public createRuntimeExpression<T extends ObjectType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends ObjectType>(this: CompiledAddressOfExpression<T>, parent: RuntimeConstruct) : RuntimeAddressOfExpression<T> {
    //     return new RuntimeAddressOfExpression(this, parent);
    // }
    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedAddressOfExpression<T extends PointerType = PointerType> extends AddressOfExpression, t_TypedExpression {
    readonly type: T;
    readonly operand: TypedExpression<T["ptrTo"]>;
}

export interface CompiledAddressOfExpression<T extends PointerType = PointerType> extends TypedAddressOfExpression<T>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpression<T["ptrTo"], "lvalue">;
}

export class RuntimeAddressOfExpression<T extends PointerType> extends SimpleRuntimeExpression<T, "prvalue", CompiledAddressOfExpression<T>> {

    public operand: RuntimeExpression<T["ptrTo"], "lvalue">;

    public constructor(model: CompiledAddressOfExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.setSubexpressions([this.operand]);
    }

    protected operate() {
        this.setEvalResult(<this["evalResult"]>this.operand.evalResult.getPointerTo());
    }

}
