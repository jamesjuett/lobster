import {ASTNode, ExpressionContext, CPPConstruct, SuccessfullyCompiled, ConstructDescription, CompiledTemporaryDeallocator, RuntimeConstruct } from "./constructs"
import { Value } from "./runtimeEnvironment";
import { Int, ExpressionType, VoidType } from "./types";
import { assert } from "../util/util";
import { Expression, ValueCategory, VCResultTypes, RuntimeExpression, t_TypedExpression } from "./expressionBase";
import { ConstructOutlet, OpaqueExpressionOutlet } from "../view/codeOutlets";

export type OpaqueExpressionImpl<T extends ExpressionType = ExpressionType, VC extends ValueCategory = ValueCategory> = {
    type: T | ((context: ExpressionContext) => T),
    valueCategory: VC,
    operate: (rt: RuntimeOpaqueExpression<T,VC>) => T extends VoidType ? void : VCResultTypes<T,VC>
}

const OPAQUE_EXPRESSIONS : {[index: string]: OpaqueExpressionImpl} = {
    "test": <OpaqueExpressionImpl> {
        type: VoidType.VOID,
        valueCategory: "prvalue",
        operate: (rt: RuntimeOpaqueExpression<VoidType,"prvalue">) => { rt.sim.cout(new Value(10, Int.INT)); }
    }
};

export function registerOpaqueExpression<T extends ExpressionType = ExpressionType, VC extends ValueCategory = ValueCategory>(id: string, impl: OpaqueExpressionImpl<T,VC>) {
    assert(!OPAQUE_EXPRESSIONS[id]);
    OPAQUE_EXPRESSIONS[id] = <any>impl;
}

export interface OpaqueExpressionASTNode extends ASTNode {
    readonly construct_type: "opaque_expression";
    readonly id: string;
}

export class OpaqueExpression<T extends ExpressionType = ExpressionType, VC extends ValueCategory = ValueCategory> extends Expression<OpaqueExpressionASTNode> {
    public readonly construct_type = "opaque_expression";
    
    public readonly type: T;
    public readonly valueCategory: VC;

    public readonly impl: OpaqueExpressionImpl<T,VC>;

    public static createFromAST(ast: OpaqueExpressionASTNode, context: ExpressionContext) {
        assert(OPAQUE_EXPRESSIONS[ast.id]);
        return new OpaqueExpression(context, OPAQUE_EXPRESSIONS[ast.id], ast);
    }

    public constructor(context: ExpressionContext, impl: OpaqueExpressionImpl<T,VC>, ast?: OpaqueExpressionASTNode) {
        super(context, undefined);
        this.impl = impl;
        if (typeof impl.type === "function") {
            this.type = impl.type(context);
        }
        else {
            this.type = impl.type;
        }
        this.valueCategory = impl.valueCategory;
    }

    public createDefaultOutlet(this: CompiledOpaqueExpression, element: JQuery, parent?: ConstructOutlet) {
        return new OpaqueExpressionOutlet(element, this, parent);
    }

    public isTailChild(child: CPPConstruct) {
        return { isTail: true };
    }
    
    // TODO
    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedOpaqueExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends OpaqueExpression<T,V>, t_TypedExpression {

}

export interface CompiledOpaqueExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TypedOpaqueExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export class RuntimeOpaqueExpression<T extends ExpressionType = ExpressionType, VC extends ValueCategory = ValueCategory> extends RuntimeExpression<T,VC,CompiledOpaqueExpression<T,VC>> {

    public constructor(model: CompiledOpaqueExpression<T,VC>, parent: RuntimeConstruct) {
        super(model, parent);
    }

    protected upNextImpl() {
        // Nothing to do
    }

    private isVoid() : this is RuntimeOpaqueExpression<VoidType> {
        return this.model.type.isVoidType();
    }

    protected stepForwardImpl() {
        let result = this.model.impl.operate(this);
        if (!this.model.type.isVoidType()) {
            this.setEvalResult(<VCResultTypes<T,VC>>result);
        }
        this.startCleanup();
    }
}