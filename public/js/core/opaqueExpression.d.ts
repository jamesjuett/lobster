/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { ASTNode, ExpressionContext, CPPConstruct, SuccessfullyCompiled, ConstructDescription, CompiledTemporaryDeallocator, RuntimeConstruct } from "./constructs";
import { ExpressionType, VoidType, CompleteObjectType } from "./types";
import { Expression, ValueCategory, VCResultTypes, RuntimeExpression, t_TypedExpression } from "./expressionBase";
import { ConstructOutlet, OpaqueExpressionOutlet } from "../view/codeOutlets";
export declare type OpaqueExpressionImpl<T extends ExpressionType = ExpressionType, VC extends ValueCategory = ValueCategory> = {
    type: T | ((context: ExpressionContext) => T);
    valueCategory: VC;
    upNext?: (rt: RuntimeOpaqueExpression<T, VC>) => void;
    operate: (rt: RuntimeOpaqueExpression<T, VC>) => T extends VoidType ? void : VCResultTypes<T, VC>;
};
export declare function registerOpaqueExpression<T extends ExpressionType = ExpressionType, VC extends ValueCategory = ValueCategory>(id: string, impl: OpaqueExpressionImpl<T, VC>): void;
export interface OpaqueExpressionASTNode extends ASTNode {
    readonly construct_type: "opaque_expression";
    readonly id: string;
}
export declare class OpaqueExpression<T extends ExpressionType = ExpressionType, VC extends ValueCategory = ValueCategory> extends Expression<OpaqueExpressionASTNode> {
    readonly construct_type = "opaque_expression";
    readonly type: T;
    readonly valueCategory: VC;
    readonly impl: OpaqueExpressionImpl<T, VC>;
    static createFromAST(ast: OpaqueExpressionASTNode, context: ExpressionContext): OpaqueExpression<import("./types").AtomicType | import("./types").BoundedArrayType<import("./types").ArrayElemType> | import("./types").CompleteClassType | import("./types").IncompleteClassType | VoidType | import("./types").FunctionType<import("./types").PotentialReturnType> | import("./types").ArrayOfUnknownBoundType<import("./types").ArrayElemType>, ValueCategory>;
    constructor(context: ExpressionContext, impl: OpaqueExpressionImpl<T, VC>, ast?: OpaqueExpressionASTNode);
    createDefaultOutlet(this: CompiledOpaqueExpression, element: JQuery, parent?: ConstructOutlet): OpaqueExpressionOutlet;
    isTailChild(child: CPPConstruct): {
        isTail: boolean;
    };
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedOpaqueExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends OpaqueExpression<T, V>, t_TypedExpression {
}
export interface CompiledOpaqueExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TypedOpaqueExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
}
export declare class RuntimeOpaqueExpression<T extends ExpressionType = ExpressionType, VC extends ValueCategory = ValueCategory> extends RuntimeExpression<T, VC, CompiledOpaqueExpression<T, VC>> {
    constructor(model: CompiledOpaqueExpression<T, VC>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    private isVoid;
    protected stepForwardImpl(): void;
}
export declare function lookupTypeInContext(typeName: string): (context: ExpressionContext) => import("./types").PotentiallyCompleteClassType;
export declare function getLocal<T extends CompleteObjectType>(rt: RuntimeExpression, name: string): import("./objects").CPPObject<T>;
