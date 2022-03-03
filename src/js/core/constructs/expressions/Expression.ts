import type { AnalyticConstruct } from "../../../analysis/predicates";
import { ExpressionASTNode } from "../../../ast/ast_expressions";
import { ConstructOutlet, ExpressionOutlet } from "../../../view/codeOutlets";
import { areAllSemanticallyEquivalent, ConstructDescription, ExpressionContext, SemanticContext } from "../../compilation/contexts";
import { FunctionEntity } from "../../compilation/entities";
import { AtomicType, CompleteObjectType, ExpressionType, FunctionType, Type } from "../../compilation/types";
import { CPPObject } from "../../runtime/objects";
import { Value } from "../../runtime/Value";
import { CPPConstruct, SuccessfullyCompiled } from "../constructs";
import { PotentialFullExpression } from "../PotentialFullExpression";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { AnalyticExpression } from "./expressions";
import { StringLiteralExpression } from "./StringLiteralExpression";




export type ValueCategory = "prvalue" | "lvalue";

export abstract class Expression<ASTType extends ExpressionASTNode = ExpressionASTNode> extends PotentialFullExpression<ExpressionContext, ASTType> {

    public readonly t_analytic!: AnalyticExpression;

    public abstract readonly type?: ExpressionType;
    public abstract readonly valueCategory?: ValueCategory;
    public readonly conversionLength: number = 0;

    public readonly foo?: string;

    protected constructor(context: ExpressionContext, ast: ASTType | undefined) {
        super(context, ast);
    }

    // public abstract createRuntimeExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : RuntimeExpression<T,V>;

    public abstract createDefaultOutlet(this: CompiledExpression, element: JQuery, parent?: ConstructOutlet): ExpressionOutlet;

    public isWellTyped(): this is TypedExpression {
        return !!this.type && !!this.valueCategory;
    }

    public isPrvalue<T extends ExpressionType, V extends ValueCategory>(this: TypedExpression<T, V>): this is TypedExpression<T, "prvalue"> {
        return this.valueCategory === "prvalue";
    }

    public isLvalue<T extends ExpressionType, V extends ValueCategory>(this: TypedExpression<T, V>): this is TypedExpression<T, "lvalue"> {
        return this.valueCategory === "lvalue";
    }

    public isStringLiteralExpression(): this is StringLiteralExpression {
        return false;
    }

    // public isSuccessfullyCompiled() : this is Compiled<this> {
    //     return !this.hasErrors;
    // }

    public isTailChild(child: CPPConstruct) {
        return { isTail: false };
    }

    public abstract describeEvalResult(depth: number): ConstructDescription;

    public analytic() : AnalyticExpression {
        return <AnalyticExpression><unknown>this;
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && areAllSemanticallyEquivalent(this.children, other.children, ec);
    }
}

export interface t_TypedExpression {
    readonly _t_isTyped: never; // workaround for https://github.com/microsoft/TypeScript/issues/40035
}

export interface TypedExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends Expression<ExpressionASTNode> {
    readonly type: T;
    readonly valueCategory: V;
}

export interface CompiledExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TypedExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export type SpecificCompiledExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> = V extends ValueCategory ? CompiledExpression<T, V> : never;

export interface WellTyped<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> {
    readonly type: T;
    readonly valueCategory: V;
}

export type SpecificTypedExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> = TypedExpression<T, V>;


export function allWellTyped(expressions: Expression[]): expressions is TypedExpression[];
export function allWellTyped(expressions: readonly Expression[]): expressions is readonly TypedExpression[];
export function allWellTyped(expressions: readonly Expression[]): expressions is readonly TypedExpression[] {
    return expressions.every((expr) => { return expr.isWellTyped(); });
}

export function allObjectTyped(expressions: Expression[]): expressions is TypedExpression<CompleteObjectType>[];
export function allObjectTyped(expressions: readonly Expression[]): expressions is readonly TypedExpression<CompleteObjectType>[];
export function allObjectTyped(expressions: readonly Expression[]): expressions is readonly TypedExpression<CompleteObjectType>[] {
    return expressions.every((expr) => { return expr.isWellTyped() && expr.type!.isCompleteObjectType() });
}

export type VCResultTypes<T extends Type, V extends ValueCategory> =
    T extends FunctionType ? (
        V extends "prvalue" ? never :
        V extends "xvalue" ? never :
        FunctionEntity // lvalue
    )
    : T extends AtomicType ? (
        V extends "prvalue" ? Value<T> :
        V extends "xvalue" ? CPPObject<T> :
        CPPObject<T> // lvalue
    )
    : T extends CompleteObjectType ? (

        // e.g. If T is actually ObjectType, then it could be an AtomicType and we go with the first option Value<AtomicType> | CPPObject<T>.
        //      However, if T is actually ClassType, then it can't be an AtomicType and we go with the second option of only CPPObject<T>
        V extends "prvalue" ? (AtomicType extends T ? Value<AtomicType> | CPPObject<T> : CPPObject<T>) :
        V extends "xvalue" ? CPPObject<T> :
        CPPObject<T> // lvalue
    )
    : /*ObjectType extends T ?*/ ( // That is, T is more general, so it's possible T is an AtomicType or an ObjectType
        V extends "prvalue" ? Value<AtomicType> | CPPObject<CompleteObjectType> :
        V extends "xvalue" ? CPPObject<CompleteObjectType> :
        CPPObject<CompleteObjectType> // lvalue
    )

