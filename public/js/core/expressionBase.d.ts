/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { ExpressionASTNode, StringLiteralExpression } from "./expressions";
import { ExpressionContext, RuntimeConstruct, CPPConstruct, ConstructDescription, SuccessfullyCompiled, CompiledTemporaryDeallocator } from "./constructs";
import { PotentialFullExpression, RuntimePotentialFullExpression } from "./PotentialFullExpression";
import { Type, CompleteObjectType, AtomicType, FunctionType, ExpressionType } from "./types";
import { FunctionEntity } from "./entities";
import { Value } from "./runtimeEnvironment";
import { CPPObject } from "./objects";
import { ConstructOutlet, ExpressionOutlet } from "../view/codeOutlets";
export declare type ValueCategory = "prvalue" | "lvalue";
export declare abstract class Expression<ASTType extends ExpressionASTNode = ExpressionASTNode> extends PotentialFullExpression<ExpressionContext, ASTType> {
    abstract readonly type?: ExpressionType;
    abstract readonly valueCategory?: ValueCategory;
    readonly conversionLength: number;
    readonly foo?: string;
    protected constructor(context: ExpressionContext, ast: ASTType | undefined);
    abstract createDefaultOutlet(this: CompiledExpression, element: JQuery, parent?: ConstructOutlet): ExpressionOutlet;
    isWellTyped(): this is TypedExpression;
    isTyped<T extends ExpressionType>(type: T): this is TypedExpression<T>;
    isPrvalue<T extends ExpressionType, V extends ValueCategory>(this: TypedExpression<T, V>): this is TypedExpression<T, "prvalue">;
    isLvalue<T extends ExpressionType, V extends ValueCategory>(this: TypedExpression<T, V>): this is TypedExpression<T, "lvalue">;
    isStringLiteralExpression(): this is StringLiteralExpression;
    isTailChild(child: CPPConstruct): {
        isTail: boolean;
    };
    abstract describeEvalResult(depth: number): ConstructDescription;
}
export interface t_TypedExpression {
    readonly _t_isTyped: never;
}
export interface TypedExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends Expression<ExpressionASTNode> {
    readonly type: T;
    readonly valueCategory: V;
}
export interface CompiledExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TypedExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
}
export declare type SpecificCompiledExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> = V extends ValueCategory ? CompiledExpression<T, V> : never;
export interface WellTyped<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> {
    readonly type: T;
    readonly valueCategory: V;
}
export declare type SpecificTypedExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> = TypedExpression<T, V>;
export declare function allWellTyped(expressions: Expression[]): expressions is TypedExpression[];
export declare function allWellTyped(expressions: readonly Expression[]): expressions is readonly TypedExpression[];
export declare function allObjectTyped(expressions: Expression[]): expressions is TypedExpression<CompleteObjectType>[];
export declare function allObjectTyped(expressions: readonly Expression[]): expressions is readonly TypedExpression<CompleteObjectType>[];
export declare type VCResultTypes<T extends Type, V extends ValueCategory> = T extends FunctionType ? (V extends "prvalue" ? never : V extends "xvalue" ? never : FunctionEntity) : T extends AtomicType ? (V extends "prvalue" ? Value<T> : V extends "xvalue" ? CPPObject<T> : CPPObject<T>) : T extends CompleteObjectType ? (V extends "prvalue" ? (AtomicType extends T ? Value<AtomicType> | CPPObject<T> : CPPObject<T>) : V extends "xvalue" ? CPPObject<T> : CPPObject<T>) : (V extends "prvalue" ? Value<AtomicType> | CPPObject<CompleteObjectType> : V extends "xvalue" ? CPPObject<CompleteObjectType> : CPPObject<CompleteObjectType>);
export declare abstract class RuntimeExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory, C extends CompiledExpression<T, V> = CompiledExpression<T, V>> extends RuntimePotentialFullExpression<C> {
    /**
     * WARNING: The evalResult property may be undefined, even though it's type suggests it will always
     * be defined. In most places where it is accessed, there is an implicit assumption that the expression
     * will already have been evaluated and the client code would end up needing a non-null assertion anyway.
     * However, those non-null assertions actually introduce some tricky complications with VCResultTypes,
     * which cause type errors and are a huge pain. So instead we tell the type system to trust us.
     */
    readonly evalResult: VCResultTypes<T, V>;
    constructor(model: C, parent: RuntimeConstruct);
    protected setEvalResult(value: VCResultTypes<T, V>): void;
}
