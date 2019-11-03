"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var types_1 = require("./types");
var expressions_1 = require("./expressions");
var runtimeEnvironment_1 = require("./runtimeEnvironment");
var util_1 = require("../util/util");
var ImplicitConversion = /** @class */ (function (_super) {
    __extends(ImplicitConversion, _super);
    function ImplicitConversion(from, toType, valueCategory) {
        var _this = _super.call(this, from.context) || this;
        _this.attach(_this.from = from);
        _this.type = toType;
        _this.valueCategory = valueCategory;
        if (from instanceof ImplicitConversion) {
            _this.conversionLength = from.conversionLength + 1;
        }
        else {
            _this.conversionLength = 1;
        }
        return _this;
    }
    ImplicitConversion.prototype.createRuntimeExpression = function (parent) {
        return new RuntimeImplicitConversion(this, parent);
    };
    ImplicitConversion.prototype.describeEvalResult = function (depth) {
        throw new Error("Method not implemented.");
    };
    return ImplicitConversion;
}(expressions_1.Expression));
exports.ImplicitConversion = ImplicitConversion;
var RuntimeImplicitConversion = /** @class */ (function (_super) {
    __extends(RuntimeImplicitConversion, _super);
    function RuntimeImplicitConversion(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.from = _this.model.from.createRuntimeExpression(_this);
        _this.setSubexpressions([_this.from]);
        return _this;
    }
    RuntimeImplicitConversion.prototype.operate = function () {
        this.setEvalResult(this.model.operate(this.from.evalResult));
    };
    return RuntimeImplicitConversion;
}(expressions_1.SimpleRuntimeExpression));
exports.RuntimeImplicitConversion = RuntimeImplicitConversion;
// Type 1 Conversions
// LValueToRValue, ArrayToPointer, FunctionToPointer
var LValueToRValue = /** @class */ (function (_super) {
    __extends(LValueToRValue, _super);
    function LValueToRValue(from) {
        return _super.call(this, from, from.type.cvUnqualified(), "prvalue") || this;
    }
    LValueToRValue.prototype.operate = function (fromEvalResult) {
        return fromEvalResult.getValue(); // Cast technically necessary here
        // TODO: add alert if value is invalid
        // e.g. inst.setEvalResult(readValueWithAlert(evalValue, sim, this.from, inst.childInstances.from));
    };
    return LValueToRValue;
}(ImplicitConversion));
exports.LValueToRValue = LValueToRValue;
var ArrayToPointer = /** @class */ (function (_super) {
    __extends(ArrayToPointer, _super);
    function ArrayToPointer(from) {
        return _super.call(this, from, from.type.adjustToPointerType(), "prvalue") || this;
    }
    ArrayToPointer.prototype.operate = function (fromEvalResult) {
        return new runtimeEnvironment_1.Value(fromEvalResult.address, new types_1.ArrayPointer(fromEvalResult));
    };
    return ArrayToPointer;
}(ImplicitConversion));
exports.ArrayToPointer = ArrayToPointer;
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
 * All type conversions ignore cv-qualifications on the given destination type. Instead,
 * the converted type retains the cv-qualifications of the source type.
 */
var TypeConversion = /** @class */ (function (_super) {
    __extends(TypeConversion, _super);
    function TypeConversion(from, toType) {
        return _super.call(this, from, toType.cvQualified(from.type.isConst, from.type.isVolatile), "prvalue") || this;
    }
    return TypeConversion;
}(ImplicitConversion));
var NoOpTypeConversion = /** @class */ (function (_super) {
    __extends(NoOpTypeConversion, _super);
    function NoOpTypeConversion(from, toType) {
        return _super.call(this, from, toType) || this;
    }
    NoOpTypeConversion.prototype.operate = function (fromEvalResult) {
        return new runtimeEnvironment_1.Value(fromEvalResult.rawValue, this.type); // Cast technically necessary here
    };
    return NoOpTypeConversion;
}(TypeConversion));
var NullPointerConversion = /** @class */ (function (_super) {
    __extends(NullPointerConversion, _super);
    function NullPointerConversion(from, toType) {
        var _this = _super.call(this, from, toType) || this;
        util_1.assert(from.value.rawValue === 0);
        return _this;
    }
    return NullPointerConversion;
}(NoOpTypeConversion));
exports.NullPointerConversion = NullPointerConversion;
var PointerConversion = /** @class */ (function (_super) {
    __extends(PointerConversion, _super);
    function PointerConversion() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return PointerConversion;
}(NoOpTypeConversion));
exports.PointerConversion = PointerConversion;
var PointerToBooleanConversion = /** @class */ (function (_super) {
    __extends(PointerToBooleanConversion, _super);
    function PointerToBooleanConversion(from) {
        return _super.call(this, from, types_1.Bool.BOOL) || this;
    }
    return PointerToBooleanConversion;
}(NoOpTypeConversion));
exports.PointerToBooleanConversion = PointerToBooleanConversion;
var IntegralPromotion = /** @class */ (function (_super) {
    __extends(IntegralPromotion, _super);
    function IntegralPromotion() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return IntegralPromotion;
}(NoOpTypeConversion));
exports.IntegralPromotion = IntegralPromotion;
var IntegralConversion = /** @class */ (function (_super) {
    __extends(IntegralConversion, _super);
    function IntegralConversion() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return IntegralConversion;
}(NoOpTypeConversion));
exports.IntegralConversion = IntegralConversion;
var FloatingPointPromotion = /** @class */ (function (_super) {
    __extends(FloatingPointPromotion, _super);
    function FloatingPointPromotion(from) {
        return _super.call(this, from, types_1.Double.DOUBLE) || this;
    }
    return FloatingPointPromotion;
}(NoOpTypeConversion));
exports.FloatingPointPromotion = FloatingPointPromotion;
var FloatingPointConversion = /** @class */ (function (_super) {
    __extends(FloatingPointConversion, _super);
    function FloatingPointConversion() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return FloatingPointConversion;
}(NoOpTypeConversion));
exports.FloatingPointConversion = FloatingPointConversion;
var IntegralToFloatingConversion = /** @class */ (function (_super) {
    __extends(IntegralToFloatingConversion, _super);
    function IntegralToFloatingConversion() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return IntegralToFloatingConversion;
}(NoOpTypeConversion));
exports.IntegralToFloatingConversion = IntegralToFloatingConversion;
var FloatingToIntegralConversion = /** @class */ (function (_super) {
    __extends(FloatingToIntegralConversion, _super);
    function FloatingToIntegralConversion() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    FloatingToIntegralConversion.prototype.operate = function (fromEvalResult) {
        if (this.type.isType(types_1.Bool)) {
            return new runtimeEnvironment_1.Value(fromEvalResult.rawValue === 0 ? 0 : 1, types_1.Int.INT);
        }
        return new runtimeEnvironment_1.Value(Math.trunc(fromEvalResult.rawValue), types_1.Int.INT);
    };
    return FloatingToIntegralConversion;
}(TypeConversion));
exports.FloatingToIntegralConversion = FloatingToIntegralConversion;
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
var QualificationConversion = /** @class */ (function (_super) {
    __extends(QualificationConversion, _super);
    function QualificationConversion(from, toType) {
        var _this = _super.call(this, from, toType, "prvalue") || this;
        util_1.assert(types_1.similarType(from.type, toType));
        return _this;
    }
    QualificationConversion.prototype.operate = function (fromEvalResult) {
        return new runtimeEnvironment_1.Value(fromEvalResult.rawValue, this.type); // Cast technically necessary here
    };
    return QualificationConversion;
}(ImplicitConversion));
exports.QualificationConversion = QualificationConversion;
function convertToPRValue(from) {
    if (from.isBoundedArrayTyped()) {
        return new ArrayToPointer(from);
    }
    if (!from.isAtomicTyped()) {
        return from;
    }
    // based on union input type, it must be atomic typed if we get to here
    if (from.isPrvalue()) {
        return from;
    }
    // must be an lvalue if we get to here
    // TODO: add back in for function pointers
    // if (from.type instanceof FunctionType) {
    //     return new FunctionToPointer(from);
    // }
    return new LValueToRValue(from);
}
exports.convertToPRValue = convertToPRValue;
;
function typeConversion(from, toType) {
    if (types_1.similarType(from.type, toType)) {
        return from;
    }
    if (toType.isPointerType() && (from instanceof expressions_1.NumericLiteral) && types_1.isType(from.type, types_1.Int) && from.value.rawValue === 0) {
        return new NullPointerConversion(from, toType);
    }
    if (toType.isPointerType() && toType.ptrTo.isClassType() &&
        from.isPointerTyped() && from.type.ptrTo.isClassType() &&
        types_1.subType(from.type.ptrTo, toType.ptrTo)) {
        // Note that cv qualifications on the new destination pointer type don't need to be set, since
        // they are ignored by the PointerConversion anyway (the source type's cv qualifications are set).
        // However, we do need to preserve the cv-qualifications on the pointed-to type.
        return new PointerConversion(from, new types_1.PointerType(toType.ptrTo.cvQualified(from.type.ptrTo.isConst, from.type.ptrTo.isVolatile)));
    }
    if (toType.isType(types_1.Bool) && from.isPointerTyped()) {
        return new PointerToBooleanConversion(from);
    }
    if (toType.isType(types_1.Double) && from.isTyped(types_1.Float)) {
        return new FloatingPointPromotion(from);
    }
    if (toType.isIntegralType()) {
        if (from.isIntegralTyped()) {
            return new IntegralConversion(from, toType);
        }
        if (from.isFloatingPointTyped()) {
            return new FloatingToIntegralConversion(from, toType);
        }
    }
    if (toType.isFloatingPointType()) {
        if (from.isIntegralTyped()) {
            return new IntegralToFloatingConversion(from, toType);
        }
        if (from.isFloatingPointTyped()) {
            return new FloatingPointConversion(from, toType);
        }
    }
    return from;
}
exports.typeConversion = typeConversion;
;
function qualificationConversion(from, toType) {
    if (types_1.sameType(from.type, toType)) {
        return from;
    }
    if (from.valueCategory === "prvalue" && types_1.isCvConvertible(from.type, toType)) {
        return new QualificationConversion(from, toType);
    }
    return from;
}
exports.qualificationConversion = qualificationConversion;
;
/**
 * Attempts to generate a standard conversion sequence of the given expression to the given
 * destination type.
 * @param from The original expression
 * @param toType The destination type
 * @param options
 */
function standardConversion(from, toType, options) {
    if (options === void 0) { options = {}; }
    options = options || {};
    // Unless the object is atomic typed or is an array, Lobster currently doesn't support
    // any standard conversions. Note in particular this means user-defined converison functions
    // for class-typed objects are not supported.
    if (!(from.isAtomicTyped() || from.isBoundedArrayTyped())) {
        return from;
    }
    if (!toType.isAtomicType()) {
        return from;
    }
    if (!options.suppressLTR) {
        var fromPrvalue = convertToPRValue(from);
        fromPrvalue = typeConversion(fromPrvalue, toType);
        fromPrvalue = qualificationConversion(fromPrvalue, toType);
        return fromPrvalue;
    }
    return from;
}
exports.standardConversion = standardConversion;
;
function integralPromotion(expr) {
    if (expr.isIntegralTyped() && !expr.isTyped(types_1.Int)) {
        return new IntegralPromotion(expr, types_1.Int.INT);
    }
    else {
        return expr;
    }
}
exports.integralPromotion = integralPromotion;
;
function usualArithmeticConversions(leftOrig, rightOrig) {
    var left = convertToPRValue(leftOrig);
    var right = convertToPRValue(rightOrig);
    // TODO If either has scoped enumeration type, no conversions are performed
    // TODO If either is long double, the other shall be converted to long double
    // If either is double, the other shall be converted to double
    if (left.isTyped(types_1.Double)) {
        right = typeConversion(right, types_1.Double.DOUBLE);
        return [left, right];
    }
    if (right.isTyped(types_1.Double)) {
        left = typeConversion(left, types_1.Double.DOUBLE);
        return [left, right];
    }
    // If either is float, the other shall be converted to float
    if (left.isTyped(types_1.Float)) {
        right = typeConversion(right, types_1.Float.FLOAT);
        return [left, right];
    }
    if (right.isTyped(types_1.Float)) {
        left = typeConversion(left, types_1.Float.FLOAT);
        return [left, right];
    }
    // Otherwise, do integral promotions
    if (left.isIntegralTyped()) {
        left = integralPromotion(left);
    }
    if (right.isIntegralTyped()) {
        right = integralPromotion(right);
    }
    // If both operands have the same type, no further conversion is needed
    if (types_1.sameType(left.type, right.type)) {
        return [left, right];
    }
    // TODO: Otherwise, if both operands have signed or both have unsigned types,
    // operand with type of lesser integer conversion rank shall be converted
    // to the type of the operand with greater rank
    return [left, right];
}
exports.usualArithmeticConversions = usualArithmeticConversions;
//# sourceMappingURL=standardConversions.js.map