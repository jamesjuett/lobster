import { ExpressionASTNode } from "./expressions";

import { ExpressionContext, RuntimeConstruct, CPPConstruct, ConstructDescription, SuccessfullyCompiled, CompiledTemporaryDeallocator } from "./constructs";
import { PotentialFullExpression, RuntimePotentialFullExpression } from "./PotentialFullExpression";

import { Type, ObjectType, AtomicType, ArithmeticType, IntegralType, FloatingPointType, PointerType, ReferenceType, ClassType, BoundedArrayType, ArrayOfUnknownBoundType, FunctionType } from "./types";

import { Constructor, Mutable } from "../util/util";

import { FunctionEntity } from "./entities";

import { Value } from "./runtimeEnvironment";

import { CPPObject } from "./objects";
import { ConstructOutlet, ExpressionOutlet } from "../view/codeOutlets";


export type ValueCategory = "prvalue" | "lvalue";

export abstract class Expression<ASTType extends ExpressionASTNode = ExpressionASTNode> extends PotentialFullExpression<ExpressionContext, ASTType> {

    public abstract readonly type?: Type;
    public abstract readonly valueCategory?: ValueCategory;
    public readonly conversionLength: number = 0;

    protected constructor(context: ExpressionContext) {
        super(context);
    }

    public abstract createRuntimeExpression<T extends Type = Type, V extends ValueCategory = ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : RuntimeExpression<T,V>;

    public abstract createDefaultOutlet(this: CompiledExpression, element: JQuery, parent?: ConstructOutlet): ExpressionOutlet;

    public isWellTyped() : this is SpecificTypedExpression<Type,ValueCategory> {
        return !!this.type && !!this.valueCategory;
    }

    public isTyped<T extends Type>(ctor: Constructor<T>) : this is SpecificTypedExpression<T, ValueCategory> {
        return !!this.type && this.type.isType(ctor);
    }

    public isObjectTyped() : this is SpecificTypedExpression<ObjectType, ValueCategory> {
        return !!this.type && this.type.isObjectType();
    }

    public isAtomicTyped() : this is SpecificTypedExpression<AtomicType, ValueCategory> {
        return !!this.type && this.type.isAtomicType();
    }

    public isArithmeticTyped() : this is SpecificTypedExpression<ArithmeticType, ValueCategory> {
        return !!this.type && this.type.isArithmeticType();
    }

    public isIntegralTyped() : this is SpecificTypedExpression<IntegralType, ValueCategory> {
        return !!this.type && this.type.isIntegralType();
    }

    public isFloatingPointTyped() : this is SpecificTypedExpression<FloatingPointType, ValueCategory> {
        return !!this.type && this.type.isFloatingPointType();
    }

    public isPointerTyped() : this is SpecificTypedExpression<PointerType, ValueCategory> {
        return !!this.type && this.type.isPointerType();
    }

    public isReferenceTyped() : this is SpecificTypedExpression<ReferenceType, ValueCategory> {
        return !!this.type && this.type.isReferenceType();
    }

    public isClassTyped() : this is SpecificTypedExpression<ClassType, ValueCategory> {
        return !!this.type && this.type.isClassType();
    }

    public isBoundedArrayTyped() : this is SpecificTypedExpression<BoundedArrayType, "lvalue"> {
        return !!this.type && this.type.isBoundedArrayType();
    }

    public isArrayOfUnknownBoundTyped() : this is SpecificTypedExpression<ArrayOfUnknownBoundType, "lvalue"> {
        return !!this.type && this.type.isArrayOfUnknownBoundType();
    }

    public isGenericArrayTyped() : this is SpecificTypedExpression<BoundedArrayType | ArrayOfUnknownBoundType, "lvalue"> {
        return !!this.type && this.type.isGenericArrayType();
    }

    public isFunctionTyped() : this is SpecificTypedExpression<FunctionType> {
        return !!this.type && this.type.isFunctionType();
    }

    public isPrvalue<T extends Type, V extends ValueCategory>(this: TypedExpression<T,V>) : this is TypedExpression<T,"prvalue"> {
        return this.valueCategory === "prvalue";
    }

    public isLvalue<T extends Type, V extends ValueCategory>(this: TypedExpression<T,V>) : this is TypedExpression<T,"lvalue"> {
        return this.valueCategory === "lvalue";
    }

    // public isSuccessfullyCompiled() : this is Compiled<this> {
    //     return !this.hasErrors;
    // }

    public isTailChild(child: CPPConstruct) {
        return {isTail: false};
    }

    public abstract describeEvalResult(depth: number) : ConstructDescription;
}

export interface CompiledExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> extends Expression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly type: T;
    readonly valueCategory: V;
}

export type SpecificCompiledExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> = V extends ValueCategory ? CompiledExpression<T,V> : never;

export interface WellTyped<T extends Type = Type, V extends ValueCategory = ValueCategory> {
    readonly type: T;
    readonly valueCategory: V;
}

export interface TypedExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> extends Expression {
    readonly type: T;
    readonly valueCategory: V;
}

export type SpecificTypedExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> = V extends ValueCategory ? TypedExpression<T,V> : never;


export function allWellTyped(expressions: Expression[]): expressions is TypedExpression[];
export function allWellTyped(expressions: readonly Expression[]): expressions is readonly TypedExpression[];
export function allWellTyped(expressions: readonly Expression[]): expressions is readonly TypedExpression[] {
    return expressions.every((expr) => { return expr.isWellTyped(); });
}

export function allObjectTyped(expressions: Expression[]): expressions is TypedExpression<ObjectType>[];
export function allObjectTyped(expressions: readonly Expression[]): expressions is readonly TypedExpression<ObjectType>[];
export function allObjectTyped(expressions: readonly Expression[]): expressions is readonly TypedExpression<ObjectType>[] {
    return expressions.every((expr) => { return expr.isObjectTyped(); });
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
    : T extends ObjectType ? (
        
        // e.g. If T is actually ObjectType, then it could be an AtomicType and we go with the first option Value<AtomicType> | CPPObject<T>.
        //      However, if T is actually ClassType, then it can't be an AtomicType and we go with the second option of only CPPObject<T>
        V extends "prvalue" ? (AtomicType extends T ? Value<AtomicType> | CPPObject<T> : CPPObject<T>) :
        V extends "xvalue" ? CPPObject<T> :
        CPPObject<T> // lvalue
    )
    : /*ObjectType extends T ?*/ ( // That is, T is more general, so it's possible T is an AtomicType or an ObjectType
        V extends "prvalue" ? Value<AtomicType> | CPPObject<ObjectType> :
        V extends "xvalue" ? CPPObject<ObjectType> :
        CPPObject<ObjectType> // lvalue
    )
    // : { // Otherwise, T is NOT possibly an ObjectType. This could happen with e.g. an lvalue expression that yields a function
    //     readonly prvalue: number;
    //     readonly xvalue: number;
    //     readonly lvalue: number;
    // };

export abstract class RuntimeExpression<T extends Type = Type, V extends ValueCategory = ValueCategory, C extends CompiledExpression<T,V> = CompiledExpression<T,V>> extends RuntimePotentialFullExpression<C> {
    
    /**
     * WARNING: The evalResult property may be undefined, even though it's type suggests it will always
     * be defined. In most places where it is accessed, there is an implicit assumption that the expression
     * will already have been evaluated and the client code would end up needing a non-null assertion anyway.
     * However, those non-null assertions actually introduce some tricky complications with VCResultTypes,
     * which cause type errors and are a huge pain. So instead we tell the type system to trust us.
     */
    public readonly evalResult!: VCResultTypes<T,V>;

    public constructor(model: C, parent: RuntimeConstruct) {
        super(model, "expression", parent);
    }

    protected setEvalResult(value: VCResultTypes<T,V>) {
        (<Mutable<this>>this).evalResult = value;
    }
}
