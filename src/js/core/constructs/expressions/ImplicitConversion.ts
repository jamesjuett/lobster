import { CompleteObjectType, AtomicType, IntegralType, PointerType, BoundedArrayType, isType, Bool, sameType, ArithmeticType, Int, Float, Double, similarType, subType, ArrayElemType, FloatingPointType, isCvConvertible, CompleteClassType, isAtomicType, isIntegralType, isPointerType, isBoundedArrayType, isCompleteClassType, isFloatingPointType, ExpressionType } from "../../compilation/types";
import { ConstructDescription, SemanticContext, areSemanticallyEquivalent } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { Value } from "../../runtime/Value";
import { assert } from "../../../util/util";
import { VCResultTypes, ValueCategory, Expression, CompiledExpression, TypedExpression, SpecificTypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { ConstructOutlet, LValueToRValueOutlet, ArrayToPointerOutlet, TypeConversionOutlet, QualificationConversionOutlet, StreamToBoolOutlet } from "../../../view/codeOutlets";
import { AnalyticConstruct, Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { checkForNullptrEquivalence, checkForZeroEquivalence } from "../../../analysis/semantic_equivalence";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { NullptrExpression, CompiledNullptrExpression } from "./NullptrExpression";
import { NumericLiteralExpression, CompiledNumericLiteralExpression } from "./NumericLiteralExpression";
import { AuxiliaryExpression } from "./AuxiliaryExpression";
import { createRuntimeExpression, AnalyticTypedExpression, AnalyticExpression } from "./expressions";

// Standard conversions





export abstract class ImplicitConversion<FromType extends CompleteObjectType = CompleteObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends CompleteObjectType = CompleteObjectType, ToVC extends ValueCategory = ValueCategory> extends Expression {
    public readonly construct_type = "ImplicitConversion";

    public readonly from: TypedExpression<FromType, FromVC>;
    public readonly type: ToType;
    public readonly valueCategory: ToVC;

    public readonly conversionLength: number;

    public constructor(from: TypedExpression<FromType, FromVC>, toType: ToType, valueCategory: ToVC) {
        super(from.context, undefined);
        this.attach(this.from = from);
        this.type = toType;
        this.valueCategory = valueCategory;

        if (from instanceof ImplicitConversion) {
            this.conversionLength = from.conversionLength + 1;
        }
        else {
            this.conversionLength = 1;
        }
    }

    public createRuntimeExpression<FromType extends CompleteObjectType, FromVC extends ValueCategory, ToType extends CompleteObjectType, ToVC extends ValueCategory>(this: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct): RuntimeImplicitConversion<FromType, FromVC, ToType, ToVC>;
    public createRuntimeExpression<T extends ExpressionType, V extends ValueCategory>(this: CompiledExpression<T, V>, parent: RuntimeConstruct): never;
    public createRuntimeExpression<FromType extends CompleteObjectType, FromVC extends ValueCategory, ToType extends CompleteObjectType, ToVC extends ValueCategory>(this: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct): RuntimeImplicitConversion<FromType, FromVC, ToType, ToVC> {
        return new RuntimeImplicitConversion(this, parent);
    }

    public abstract operate(fromEvalResult: VCResultTypes<FromType, FromVC>): VCResultTypes<ToType, ToVC>;


    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedImplicitConversion<FromType extends CompleteObjectType = CompleteObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends CompleteObjectType = CompleteObjectType, ToVC extends ValueCategory = ValueCategory> extends ImplicitConversion<FromType, FromVC, ToType, ToVC>, t_TypedExpression {
}

export interface CompiledImplicitConversion<FromType extends CompleteObjectType = CompleteObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends CompleteObjectType = CompleteObjectType, ToVC extends ValueCategory = ValueCategory> extends TypedImplicitConversion<FromType, FromVC, ToType, ToVC>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly from: CompiledExpression<FromType, FromVC>;
}

export class RuntimeImplicitConversion<FromType extends CompleteObjectType = CompleteObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends CompleteObjectType = CompleteObjectType, ToVC extends ValueCategory = ValueCategory>
    extends SimpleRuntimeExpression<ToType, ToVC, CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>> {

    public readonly from: RuntimeExpression<FromType, FromVC>;

    public constructor(model: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct) {
        super(model, parent);
        this.from = createRuntimeExpression(this.model.from, this);
        this.setSubexpressions([this.from]);
    }

    protected operate(): void {
        this.setEvalResult(this.model.operate(this.from.evalResult));
    }
}
// export type AnalyticImplicitConversion<FromType extends ObjectType = ObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends ObjectType = ObjectType, ToVC extends ValueCategory = ValueCategory> = 
//     LValueToRValueConversion<FromType> |
//     ArrayToPointerConversion |
//     TypeConversion |
//     QualificationConversion;
// Type 1 Conversions
// LValueToRValue, ArrayToPointer, FunctionToPointer

export class LValueToRValueConversion<T extends AtomicType> extends ImplicitConversion<T, "lvalue", T, "prvalue"> {
    // public readonly construct_type = "LValueToRValueConversion";
    public constructor(from: TypedExpression<T, "lvalue">) {
        super(from, from.type.cvUnqualified(), "prvalue");
    }

    public operate(fromEvalResult: VCResultTypes<T, "lvalue">) {
        return <VCResultTypes<T, "prvalue">>fromEvalResult.getValue(); // Cast technically necessary here


        // TODO: add alert if value is invalid
        // e.g. inst.setEvalResult(readValueWithAlert(evalValue, sim, this.from, inst.childInstances.from));
    }

    public createDefaultOutlet(this: CompiledLValueToRValueConversion, element: JQuery, parent?: ConstructOutlet) {
        return new LValueToRValueOutlet(element, this, parent);
    }

}
export interface TypedLValueToRValueConversion<T extends AtomicType = AtomicType> extends LValueToRValueConversion<T>, t_TypedExpression {
}

export interface CompiledLValueToRValueConversion<T extends AtomicType = AtomicType> extends TypedLValueToRValueConversion<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly from: CompiledExpression<T, "lvalue">; // satisfies CompiledImplicitConversion and LValueToRValue structure
}

export class ArrayToPointerConversion<T extends BoundedArrayType> extends ImplicitConversion<T, "lvalue", PointerType, "prvalue"> {
    // public readonly construct_type = "ArrayToPointerConversion";
    public constructor(from: TypedExpression<T, "lvalue">) {
        super(from, from.type.adjustToPointerType(), "prvalue");
    }

    public operate(fromEvalResult: VCResultTypes<BoundedArrayType, "lvalue">) {
        return fromEvalResult.decayToPointer();
    }

    public createDefaultOutlet(this: CompiledArrayToPointerConversion, element: JQuery, parent?: ConstructOutlet) {
        return new ArrayToPointerOutlet(element, this, parent);
    }

}

export interface TypedArrayToPointerConversion<T extends BoundedArrayType = BoundedArrayType> extends ArrayToPointerConversion<T>, t_TypedExpression {
}

export interface CompiledArrayToPointerConversion<T extends BoundedArrayType = BoundedArrayType> extends TypedArrayToPointerConversion<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly from: CompiledExpression<T, "lvalue">; // satisfies CompiledImplicitConversion and ArrayToPointer structure
}



export class StreamToBoolConversion extends ImplicitConversion<CompleteClassType, "lvalue", Bool, "prvalue"> {
    // public readonly construct_type = "StreamToBoolConversion";
    public constructor(from: TypedExpression<CompleteClassType, "lvalue">) {
        super(from, Bool.BOOL, "prvalue");
    }

    public operate(fromEvalResult: VCResultTypes<CompleteClassType, "lvalue">) {
        // evaluates to false if .fail() is true, otherwise true
        return new Value(fromEvalResult.getAuxiliaryData("stream").fail() ? 0 : 1, Bool.BOOL);
    }

    public createDefaultOutlet(this: CompiledStreamToBoolConversion, element: JQuery, parent?: ConstructOutlet) {
        return new StreamToBoolOutlet(element, this, parent);
    }

}

export interface TypedStreamToBoolConversion extends StreamToBoolConversion, t_TypedExpression {
}

export interface CompiledStreamToBoolConversion extends TypedStreamToBoolConversion, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly from: CompiledExpression<CompleteClassType, "lvalue">; // satisfies CompiledImplicitConversion and IstreamToBool structure
}
// /**
//  * A conversion that ensures a prvalue, which may or may not be an object, is
//  * "materialized" into an lvalue that is an object and to which a reference may be bound.
//  * 
//  * Note that Lobster handles "guaranteed copy elision" a bit differently than the
//  * standard. The standard (C++17 and beyond) basically says that prvalues don't ever
//  * create temporary objects, instead, a prvalue is simply an expression that has the
//  * ability to initialize an object or an operand to an operator. For example, in
//  * `int func(); int i = func();`, C++17 and beyond considers that there is no "temporary
//  * return object" that the return statement for `func()` initailizes. Rather, the call
//  * to `func()` is simply a prvalue that doesn't initialize anything until the compiler
//  * sees the context of `int i = ` and the return target becomes `i`.
//  * Lobster handles this differently. Lobster's concept of a prvalue is that it may itself
//  * already be a temporary object. It will go ahead and create the temporary return
//  * object in the above example and then simply elide the copy behind the scenes. (So that
//  * e.g. if it was a class-type object and not an int, there would be no extra copy ctor).
//  */
// export class TemporaryMaterializationConversion<T extends CompleteObjectType> extends ImplicitConversion<T, "prvalue", T, "lvalue"> {
//     public readonly materializedObject?: TemporaryObjectEntity<T>;
//     public readonly initializer: DirectInitializer;
//     public constructor(from: TypedExpression<T, "prvalue">) {
//         super(from, from.type, "lvalue");
//         // if the expression is of non-class type, 
//         this.materializedObject = this.createTemporaryObject(this.type, "[materialized temporary]");
//         this.initializer = DirectInitializer.create(this.context, this.materializedObject, [from], "direct");
//     }
//     public operate(fromEvalResult: VCResultTypes<T, "prvalue">) {
//         if (fromEvalResult instanceof Value) {
//             let materializedObject = this.materializedObject.objectInstance(this);
//         }
//         // this.materializedObject.setV
//         let eltsPointer = this.elementsArray!.getArrayElemSubobject(0).getPointerTo();
//         (<CPPObject<PointerType<ArithmeticType>>>this.materializedObject!.getMemberObject("begin")!).setValue(eltsPointer);
//         (<CPPObject<PointerType<ArithmeticType>>>this.materializedObject!.getMemberObject("begin")!).setValue(eltsPointer.pointerOffsetRaw(this.elements.length));
//         this.setEvalResult(<this["evalResult"]><unknown>this.materializedObject!);
//         return <VCResultTypes<T, "lvalue">>fromEvalResult.getValue(); // Cast technically necessary here
//         // TODO: add alert if value is invalid
//         // e.g. inst.setEvalResult(readValueWithAlert(evalValue, sim, this.from, inst.childInstances.from));
//     }
//     public createDefaultOutlet(this: CompiledTemporaryMaterializationConversion, element: JQuery, parent?: ConstructOutlet) {
//         return new TemporaryMaterializationOutlet(element, this, parent);
//     }
//     // describeEvalResult : function(depth, sim, inst){
//     //     if (inst && inst.evalResult){
//     //         return inst.evalResult.describe();
//     //     }
//     //     else if (depth == 0){
//     //         return {message: "the value of " + this.getSourceText()};
//     //     }
//     //     else{
//     //         return {message: "the value of " + this.from.describeEvalResult(depth-1,sim, inst && inst.childInstances && inst.childInstances.from).message};
//     //     }
//     // },
//     // explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//     //     return {message: "The value of " + this.from.describeEvalResult(0, sim, inst && inst.childInstances && inst.childInstances.from).message + " will be looked up."};
//     // }
// }
// export interface TypedTemporaryMaterializationConversion<T extends AtomicType = AtomicType> extends TemporaryMaterializationConversion<T>, t_TypedExpression {
// }
// export interface CompiledTemporaryMaterializationConversion<T extends AtomicType = AtomicType> extends TypedTemporaryMaterializationConversion<T>, SuccessfullyCompiled {
//     readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
//     readonly from: CompiledExpression<T, "lvalue">; // satisfies CompiledImplicitConversion and TemporaryMaterialization structure
// }
// export var FunctionToPointer = ImplicitConversion.extend({
//     _name: "FunctionToPointer",
//     init: function(from){
//         assert(isA(from.type, Types.Function));
//         this.initParent(from, Types.Pointer.instance(from.type), "prvalue");
//     },
//     operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var func = inst.childInstances.from.evalResult;
//         inst.setEvalResult(Value.instance(func, this.type));
//     },
//     explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         return {message: "Using the name of a function in an expression will yield a pointer to that function."};
//     }
// });
// Type 2 Conversions
/**
 * All type conversions ignore (top-level) cv-qualifications on the given destination
 * type. This is because type conversions only operate on prvalues of atomic type,
 * which cannot be cv-qualified. For convenience, the user may still specify a
 * cv-qualified type and the cv-unqualified version will be used instead.
 */




abstract class TypeConversion<FromType extends AtomicType, ToType extends AtomicType>
    extends ImplicitConversion<FromType, "prvalue", ToType, "prvalue"> {

    public constructor(from: TypedExpression<FromType, "prvalue">, toType: ToType) {
        super(from, toType.cvUnqualified(), "prvalue");
    }

    public createDefaultOutlet(this: CompiledTypeConversion, element: JQuery, parent?: ConstructOutlet): TypeConversionOutlet {
        return new TypeConversionOutlet(element, this, parent);
    }

}

export interface TypedTypeConversion<FromType extends AtomicType = AtomicType, ToType extends AtomicType = AtomicType> extends TypeConversion<FromType, ToType>, t_TypedExpression {
}

export interface CompiledTypeConversion<FromType extends AtomicType = AtomicType, ToType extends AtomicType = AtomicType> extends TypedTypeConversion<FromType, ToType>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly from: CompiledExpression<FromType, "prvalue">; // satisfies CompiledImplicitConversion and TypeConversion structure
}

abstract class NoOpTypeConversion<FromType extends AtomicType, ToType extends AtomicType>
    extends TypeConversion<FromType, ToType> {

    public constructor(from: TypedExpression<FromType, "prvalue">, toType: ToType) {
        super(from, toType);
    }

    public operate(fromEvalResult: VCResultTypes<FromType, "prvalue">) {
        return <VCResultTypes<ToType, "prvalue">>new Value(fromEvalResult.rawValue, this.type, fromEvalResult.isValid); // Cast technically necessary here
    }
}

export type IntegerLiteralZero = CompiledNumericLiteralExpression<Int> & { value: Value<Int> & { rawValue: 0; }; } | CompiledNullptrExpression;

export class NullPointerConversion<P extends PointerType> extends NoOpTypeConversion<Int, P> {
    // public readonly construct_type = "NullPointerConversion";
    readonly from!: IntegerLiteralZero; // narrows from base type

    public constructor(from: IntegerLiteralZero, toType: P) {
        super(from, toType);
    }

}

export interface TypedNullPointerConversion<P extends PointerType> extends NullPointerConversion<P>, t_TypedExpression {
}

export interface CompiledNullPointerConversion<P extends PointerType> extends TypedNullPointerConversion<P>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly from: IntegerLiteralZero;
}


export class PointerConversion<FromType extends PointerType, ToType extends PointerType> extends NoOpTypeConversion<FromType, ToType> {
}

export interface TypedPointerConversion<FromType extends PointerType, ToType extends PointerType> extends TypedTypeConversion<FromType, ToType> {
}

export interface CompiledPointerConversion<FromType extends PointerType, ToType extends PointerType> extends CompiledTypeConversion<FromType, ToType> {
}

export abstract class ToBooleanConversion<T extends AtomicType = AtomicType> extends TypeConversion<T, Bool> {

    public constructor(from: TypedExpression<T, "prvalue">) {
        super(from, Bool.BOOL);
    }

    public operate(fromEvalResult: VCResultTypes<T, "prvalue">) {
        return new Value(fromEvalResult.rawValue === 0 ? 0 : 1, Bool.BOOL, fromEvalResult.isValid);
    }

}

export class PointerToBooleanConversion<T extends PointerType = PointerType> extends ToBooleanConversion<T> {
    // public readonly construct_type = "PointerToBooleanConversion";
    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        if (other.construct_type === this.construct_type) {
            return areSemanticallyEquivalent(this.from, other.from, ec);
        }

        if (other.construct_type === "pointer_comparison_expression") {
            return checkForNullptrEquivalence(this, other, ec);
        }

        return false;
    }
}
export class FloatingToBooleanConversion<T extends FloatingPointType = FloatingPointType> extends ToBooleanConversion<T> {
}
export class IntegralToBooleanConversion<T extends IntegralType = IntegralType> extends ToBooleanConversion<T> {
    // public readonly construct_type = "IntegralToBooleanConversion";
    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        if (other.construct_type === this.construct_type) {
            return areSemanticallyEquivalent(this.from, other.from, ec);
        }

        if (other.construct_type === "relational_binary_operator_expression") {
            return checkForZeroEquivalence(this, other, ec);
        }

        return false;
    }
}

export class IntegralPromotion<FromType extends IntegralType, ToType extends IntegralType> extends NoOpTypeConversion<FromType, ToType> {
}

export class IntegralConversion<FromType extends IntegralType, ToType extends IntegralType> extends NoOpTypeConversion<FromType, ToType> {
}


export class FloatingPointPromotion extends NoOpTypeConversion<Float, Double> {
    // public readonly construct_type = "FloatingPointPromotion";
    public constructor(from: TypedExpression<Float, "prvalue">) {
        super(from, Double.DOUBLE);
    }
}

export class FloatingPointConversion<FromType extends FloatingPointType, ToType extends FloatingPointType> extends NoOpTypeConversion<FromType, ToType> {
}

export class IntegralToFloatingConversion<FromType extends IntegralType, ToType extends FloatingPointType> extends NoOpTypeConversion<FromType, ToType> {
}


export class FloatingToIntegralConversion<T extends FloatingPointType> extends TypeConversion<T, IntegralType> {
    // public readonly construct_type = "FloatingToIntegralConversion";
    public operate(fromEvalResult: VCResultTypes<T, "prvalue">) {
        if (this.type.isType(Bool)) {
            return new Value(fromEvalResult.rawValue === 0 ? 0 : 1, Int.INT, fromEvalResult.isValid);
        }
        return new Value(Math.trunc(fromEvalResult.rawValue), Int.INT, fromEvalResult.isValid);
    }

}
// TODO: remove this. no longer needed now that we have real strings
// StringToCStringConversion = ImplicitConversion.extend({
//     _name: "StringToCStringConversion",
//     init: function(from, toType){
//         assert(from.valueCategory === "prvalue");
//         assert(isA(from.type, Types.String));
//         assert(isA(toType, Types.Array) && isA(toType.elemType, Types.Char));
//         this.initParent(from, toType, "prvalue");
//     },
//
//     operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         // I think only thing I really need here is to handle booleans gracefully
//         // Adding 0.0 should do the trick.
//         var cstr = inst.childInstances.from.evalResult.value;
//         inst.setEvalResult(Value.instance(cstr.split(""), Types.String));
//     }
// });
// Qualification conversions


export class QualificationConversion<T extends AtomicType = AtomicType> extends ImplicitConversion<T, "prvalue", T, "prvalue"> {
    // public readonly construct_type = "QualificationConversion";
    public constructor(from: TypedExpression<T, "prvalue">, toType: T) {
        super(from, toType, "prvalue");
        assert(similarType(from.type, toType));
    }

    public createDefaultOutlet(this: CompiledQualificationConversion, element: JQuery, parent?: ConstructOutlet) {
        return new QualificationConversionOutlet(element, this, parent);
    }

    public operate(fromEvalResult: VCResultTypes<T, "prvalue">) {
        return <VCResultTypes<T, "prvalue">>fromEvalResult.cvQualified(this.type.isConst, this.type.isVolatile);
    }

}

export interface TypedQualificationConversion<T extends AtomicType = AtomicType> extends QualificationConversion<T>, t_TypedExpression {
}

export interface CompiledQualificationConversion<T extends AtomicType = AtomicType> extends TypedQualificationConversion<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly from: CompiledExpression<T, "prvalue">; // satisfies CompiledImplicitConversion and QualificationConversion structure
}

export function convertToPRValue<T extends AtomicType>(from: SpecificTypedExpression<T>): TypedExpression<T, "prvalue">;
export function convertToPRValue<Elem_type extends ArrayElemType>(from: TypedExpression<BoundedArrayType<Elem_type>, "lvalue">): TypedExpression<PointerType<Elem_type>, "prvalue">;
export function convertToPRValue(from: SpecificTypedExpression<PointerType> | TypedExpression<BoundedArrayType, "lvalue">): TypedExpression<PointerType, "prvalue">;
export function convertToPRValue(from: SpecificTypedExpression<AtomicType> | TypedExpression<BoundedArrayType, "lvalue">): TypedExpression<AtomicType, "prvalue">;
export function convertToPRValue(from: TypedExpression): TypedExpression;
export function convertToPRValue(from: any): TypedExpression {

    let analyticFrom = <AnalyticTypedExpression<AnalyticExpression>>from;

    if (Predicates.isTypedExpression(analyticFrom, isBoundedArrayType, "lvalue")) {
        return new ArrayToPointerConversion(analyticFrom);
    }

    if (!Predicates.isTypedExpression(analyticFrom, isAtomicType)) {
        return analyticFrom;
    }

    // based on union input type, it must be atomic typed if we get to here
    if (analyticFrom.isPrvalue()) {
        return analyticFrom;
    }

    // must be an lvalue if we get to here
    // assert(x.isLvalue());
    // TODO: add back in for function pointers
    // if (from.type instanceof FunctionType) {
    //     return new FunctionToPointer(from);
    // }
    return new LValueToRValueConversion(analyticFrom);
}
;

export function typeConversion(from: TypedExpression<PointerType, "prvalue">, toType: Bool): TypedExpression<Bool, "prvalue">;
export function typeConversion(from: TypedExpression<Double, "prvalue">, toType: Float): TypedExpression<Float, "prvalue">;
export function typeConversion(from: TypedExpression<IntegralType, "prvalue">, toType: IntegralType): TypedExpression<IntegralType, "prvalue">;
export function typeConversion(from: TypedExpression<FloatingPointType, "prvalue">, toType: IntegralType): TypedExpression<IntegralType, "prvalue">;
export function typeConversion(from: TypedExpression<IntegralType, "prvalue">, toType: FloatingPointType): TypedExpression<FloatingPointType, "prvalue">;
export function typeConversion(from: TypedExpression<FloatingPointType, "prvalue">, toType: FloatingPointType): TypedExpression<FloatingPointType, "prvalue">;
export function typeConversion<SimilarType extends AtomicType>(from: TypedExpression<SimilarType, "prvalue">, toType: SimilarType): TypedExpression<SimilarType, "prvalue">;
export function typeConversion<FromType extends AtomicType, ToType extends AtomicType>(from: TypedExpression<FromType, "prvalue">, toType: ToType): TypedExpression<FromType, "prvalue"> | TypedExpression<ToType, "prvalue">;
export function typeConversion(from: TypedExpression<AtomicType, "prvalue">, toType: AtomicType) {

    if (similarType(from.type, toType)) {
        return from;
    }

    if (toType.isPointerType() && isIntegerLiteralZero(from)) {
        return new NullPointerConversion(from, toType);
    }

    if (toType.isPointerType() && toType.ptrTo.isPotentiallyCompleteClassType() &&
        Predicates.isTypedExpression(from, isPointerType) && from.type.ptrTo.isPotentiallyCompleteClassType() &&
        subType(from.type.ptrTo, toType.ptrTo)) {
        // Note that cv qualifications on the new destination pointer type don't need to be set, since
        // they are ignored by the PointerConversion anyway (the result is always cv-unqualified).
        // However, we do need to preserve the cv-qualifications on the pointed-to type.
        return new PointerConversion(from, new PointerType(toType.ptrTo.cvQualified(from.type.ptrTo.isConst, from.type.ptrTo.isVolatile)));
    }

    if (toType.isType(Bool)) {
        if (Predicates.isTypedExpression(from, isPointerType)) {
            return new PointerToBooleanConversion(from);
        }
        else if (Predicates.isTypedExpression(from, isFloatingPointType)) {
            return new FloatingToBooleanConversion(from);
        }
        else if (Predicates.isTypedExpression(from, isIntegralType)) {
            return new IntegralToBooleanConversion(from);
        }
    }

    if (toType.isType(Double) && Predicates.isTypedExpression(from, isType(Float))) {
        return new FloatingPointPromotion(from);
    }

    if (toType.isIntegralType()) {
        if (Predicates.isTypedExpression(from, isIntegralType)) {
            return new IntegralConversion(from, toType);
        }
        if (Predicates.isTypedExpression(from, isFloatingPointType)) {
            return new FloatingToIntegralConversion(from, toType);
        }
    }

    if (toType.isFloatingPointType()) {
        if (Predicates.isTypedExpression(from, isIntegralType)) {
            return new IntegralToFloatingConversion(from, toType);
        }
        if (Predicates.isTypedExpression(from, isFloatingPointType)) {
            return new FloatingPointConversion(from, toType);
        }
    }

    return from;
}
;

export function qualificationConversion(from: TypedExpression<AtomicType, "prvalue">, toType: AtomicType) {

    if (sameType(from.type, toType)) {
        return from;
    }

    if (from.valueCategory === "prvalue" && isCvConvertible(from.type, toType)) {
        return new QualificationConversion(from, toType);
    }

    return from;
}
;

export interface StandardConversionOptions {
    readonly suppressLTR?: true;
}
/**
 * Attempts to generate a standard conversion sequence of the given expression to the given
 * destination type.
 * @param from The original expression
 * @param toType The destination type
 * @param options
 */

export function standardConversion(from: TypedExpression, toType: ExpressionType, options: StandardConversionOptions = {}) {

    if (Predicates.isTypedExpression(from, isCompleteClassType, "lvalue") && (from.type.className === "ostream" || from.type.className === "istream")) {
        return new StreamToBoolConversion(from);
    }


    // Unless the object is atomic typed or is an array, Lobster currently doesn't support
    // any standard conversions. Note in particular this means user-defined converison functions
    // for class-typed objects are not supported.
    if (!(Predicates.isTypedExpression(from, isAtomicType) || Predicates.isTypedExpression(from, isBoundedArrayType, "lvalue"))) {
        return from;
    }

    if (!toType.isAtomicType()) {
        return options.suppressLTR ? from : convertToPRValue(from);
    }

    if (!options.suppressLTR) {
        let fromPrvalue = convertToPRValue(from);
        fromPrvalue = typeConversion(fromPrvalue, toType);
        fromPrvalue = qualificationConversion(fromPrvalue, toType);
        return fromPrvalue;
    }

    return from;
}
;

export function integralPromotion(expr: TypedExpression<IntegralType, "prvalue">) {
    if (Predicates.isTypedExpression(expr, isIntegralType) && !Predicates.isTypedExpression(expr, isType(Int))) {
        return new IntegralPromotion(expr, Int.INT);
    }
    else {
        return expr;
    }
}
;

export function isIntegerLiteralZero(from: Expression): from is IntegerLiteralZero {
    return from instanceof NullptrExpression || from instanceof NumericLiteralExpression && isType(from.type, Int) && from.value.rawValue === 0;
}

export function isConvertibleToPointer(from: Expression): from is SpecificTypedExpression<PointerType> | TypedExpression<BoundedArrayType, "lvalue"> | IntegerLiteralZero {
    if (!from.isWellTyped()) {
        return false;
    }
    return Predicates.isTypedExpression(from, isPointerType) || Predicates.isTypedExpression(from, isBoundedArrayType, "lvalue") || isIntegerLiteralZero(from);
}

export function isConvertible(from: TypedExpression, toType: ExpressionType, options: StandardConversionOptions = {}) {
    let aux = new AuxiliaryExpression(from.type, from.valueCategory);
    let converted = standardConversion(aux, toType, options);
    return sameType(converted.type, toType);
}

export function usualArithmeticConversions(leftOrig: SpecificTypedExpression<ArithmeticType>, rightOrig: SpecificTypedExpression<ArithmeticType>) {

    let left = convertToPRValue(leftOrig);
    let right = convertToPRValue(rightOrig);

    // TODO If either has scoped enumeration type, no conversions are performed
    // TODO If either is long double, the other shall be converted to long double
    // If either is double, the other shall be converted to double
    if (Predicates.isTypedExpression(left, isType(Double))) {
        right = typeConversion(right, Double.DOUBLE);
        return [left, right];
    }
    if (Predicates.isTypedExpression(right, isType(Double))) {
        left = typeConversion(left, Double.DOUBLE);
        return [left, right];
    }
    // If either is float, the other shall be converted to float
    if (Predicates.isTypedExpression(left, isType(Float))) {
        right = typeConversion(right, Float.FLOAT);
        return [left, right];
    }
    if (Predicates.isTypedExpression(right, isType(Float))) {
        left = typeConversion(left, Float.FLOAT);
        return [left, right];
    }

    // Otherwise, do integral promotions
    if (Predicates.isTypedExpression(left, isIntegralType)) {
        left = integralPromotion(left);
    }
    if (Predicates.isTypedExpression(right, isIntegralType)) {
        right = integralPromotion(right);
    }

    // If both operands have the same type, no further conversion is needed
    if (sameType(left.type, right.type)) {
        return [left, right];
    }

    // TODO: Otherwise, if both operands have signed or both have unsigned types,
    // operand with type of lesser integer conversion rank shall be converted
    // to the type of the operand with greater rank
    return [left, right];
}
