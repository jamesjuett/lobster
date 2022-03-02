import { StringLiteralExpression, AnalyticExpression, CompiledExpressionKinds, AnalyticTypedExpression } from "./expressions";
import { ExpressionASTNode } from "../ast/ast_expressions";

import { ExpressionContext, ConstructDescription, SemanticContext, areAllSemanticallyEquivalent } from "./Contexts";
import { RuntimeConstruct, CPPConstruct, SuccessfullyCompiled } from "./CPPConstruct";
import { CompiledTemporaryDeallocator, PotentialFullExpression, RuntimePotentialFullExpression } from "./PotentialFullExpression";

import { Type, CompleteObjectType, AtomicType, ArithmeticType, IntegralType, FloatingPointType, PointerType, ReferenceType, BoundedArrayType, ArrayOfUnknownBoundType, FunctionType, PotentiallyCompleteClassType, CompleteClassType, isAtomicType, isCompleteObjectType, ExpressionType } from "./types";

import { Constructor, Mutable } from "../util/util";

import { FunctionEntity } from "./entities";

import { Value } from "./runtimeEnvironment";

import { CPPObject } from "./objects";
import { ConstructOutlet, ExpressionOutlet } from "../view/codeOutlets";
import { AnalyticConstruct, Predicates } from "./predicates";


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
    return expressions.every((expr) => { return Predicates.isTypedExpression(expr, isCompleteObjectType) });
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
// : { // Otherwise, T is NOT possibly an ObjectType. This could happen with e.g. an lvalue expression that yields a function
//     readonly prvalue: number;
//     readonly xvalue: number;
//     readonly lvalue: number;
// };


export abstract class RuntimeExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory, C extends CompiledExpression<T, V> = CompiledExpression<T, V>> extends RuntimePotentialFullExpression<C> {

    /**
     * WARNING: The evalResult property may be undefined, even though it's type suggests it will always
     * be defined. In most places where it is accessed, there is an implicit assumption that the expression
     * will already have been evaluated and the client code would end up needing a non-null assertion anyway.
     * However, those non-null assertions actually introduce some tricky complications with VCResultTypes,
     * which cause type errors and are a huge pain. So instead we tell the type system to trust us.
     */
    public readonly evalResult!: VCResultTypes<T, V>;

    public constructor(model: C, parent: RuntimeConstruct) {
        super(model, "expression", parent);
    }

    protected setEvalResult(value: VCResultTypes<T, V>) {
        (<Mutable<this>>this).evalResult = value;
        this.observable.send("evaluated", value);
    }
}
