"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Program_1 = require("../core/Program");
const opaqueExpression_1 = require("../core/opaqueExpression");
const types_1 = require("../core/types");
const runtimeEnvironment_1 = require("../core/runtimeEnvironment");
const util_1 = require("../util/util");
let MATH_FUNCTIONS = [
    { n: 1, name: "cos", fn: x => Math.cos(x) },
    { n: 1, name: "sin", fn: x => Math.sin(x) },
    { n: 1, name: "tan", fn: x => Math.tan(x) },
    { n: 1, name: "acos", fn: x => Math.acos(x) },
    { n: 1, name: "asin", fn: x => Math.asin(x) },
    { n: 1, name: "atan", fn: x => Math.atan(x) },
    { n: 2, name: "atan2", fn: (x, y) => Math.atan2(x, y) },
    { n: 1, name: "cosh", fn: x => Math.cosh(x) },
    { n: 1, name: "sinh", fn: x => Math.sinh(x) },
    { n: 1, name: "tanh", fn: x => Math.tanh(x) },
    { n: 1, name: "acosh", fn: x => Math.acosh(x) },
    { n: 1, name: "asinh", fn: x => Math.asinh(x) },
    { n: 1, name: "atanh", fn: x => Math.atanh(x) },
    { n: 1, name: "exp", fn: x => Math.exp(x) },
    // {name: "frexp", fn: x => ???},
    { n: 2, name: "ldexp", fn: (x, exp) => x * Math.pow(2, exp) },
    { n: 1, name: "log", fn: x => Math.log(x) },
    { n: 1, name: "log10", fn: x => Math.log10(x) },
    { n: 1, name: "exp2", fn: x => Math.pow(2, x) },
    { n: 1, name: "expm1", fn: x => Math.exp(x) - 1 },
    // {n: 1, name: "ilogb", fn: x => ???},
    { n: 1, name: "log1p", fn: x => Math.log(1 + x) },
    { n: 1, name: "log2", fn: x => Math.log2(1 + x) },
    // {n: 1, name: "logb", fn: x => ???},
    // {n: 1, name: "scalbn", fn: x => ???},
    // {n: 1, name: "scalbln", fn: x => ???},
    { n: 2, name: "pow", fn: (x, y) => Math.pow(x, y) },
    { n: 2, name: "hypot", fn: (x, y) => Math.hypot(x, y) },
    { n: 1, name: "sqrt", fn: x => Math.sqrt(x) },
    { n: 1, name: "cbrt", fn: x => Math.cbrt(x) },
    // {n: 1, name: "erf", fn: x => ???},
    // {n: 1, name: "erfc", fn: x => ???},
    // {n: 1, name: "tgamma", fn: x => ???},
    // {n: 1, name: "lgamma", fn: x => ???},
    { n: 1, name: "ceil", fn: x => Math.ceil(x) },
    { n: 1, name: "floor", fn: x => Math.floor(x) },
    { n: 1, name: "trunc", fn: x => Math.trunc(x) },
    { n: 1, name: "round", fn: x => Math.round(x) },
    // {name: "lround", fn: ???},
    // {name: "llround", fn: ???},
    // {name: "rint", fn: ???},
    // {name: "lrint", fn: ???},
    // {name: "llrint", fn: ???},
    // {name: "nearbyint", fn: ???},
    { n: 0, name: "nan", fn: () => NaN },
    // {name: "nextafter", fn: x => ???},
    // {name: "nexttoward", fn: x => ???},
    { n: 1, name: "abs", fn: x => Math.abs(x) },
    { n: 1, name: "fabs", fn: x => Math.abs(x) },
];
// modf
// fmod
// {name: "remainder", fn: ???},
// {name: "remquo", fn: ???},
// copysign
// fdim
// fmax
// fmin
// fma x*y+z
// fpclassify
// isfinite
// isinf
// isnan
// isnormal
// signbit
// isgreater
// isgreaterequal
// isless
// islessequal
// islessgreater
// isunordered
function sourceForNoArgMathFn(name) {
    return (`double ${name}() {
  return @cmath_${name};
}`);
}
function sourceForUnaryMathFn(name) {
    return (`double ${name}(double x) {
  return @cmath_${name};
}`);
}
function sourceForBinaryMathFn(name) {
    return (`double ${name}(double x, double y) {
  return @cmath_${name};
}`);
}
Program_1.registerLibraryHeader("cmath", new Program_1.SourceFile("cmath.h", `

${MATH_FUNCTIONS.map(mathFn => {
    if (mathFn.n === 0) {
        return sourceForNoArgMathFn(mathFn.name);
    }
    else if (mathFn.n === 1) {
        return sourceForUnaryMathFn(mathFn.name);
    }
    else if (mathFn.n === 2) {
        return sourceForBinaryMathFn(mathFn.name);
    }
    else {
        util_1.assertNever(mathFn);
    }
}).join("\n\n")}

`, true));
function registerNoArgMathFn(name, fn) {
    opaqueExpression_1.registerOpaqueExpression("cmath_" + name, {
        type: types_1.Double.DOUBLE,
        valueCategory: "prvalue",
        operate: (rt) => {
            return new runtimeEnvironment_1.Value(fn(), types_1.Double.DOUBLE);
        }
    });
}
function registerUnaryMathFn(name, fn) {
    opaqueExpression_1.registerOpaqueExpression("cmath_" + name, {
        type: types_1.Double.DOUBLE,
        valueCategory: "prvalue",
        operate: (rt) => {
            return opaqueExpression_1.getLocal(rt, "x").getValue().modify(fn);
        }
    });
}
function registerBinaryMathFn(name, fn) {
    opaqueExpression_1.registerOpaqueExpression("cmath_" + name, {
        type: types_1.Double.DOUBLE,
        valueCategory: "prvalue",
        operate: (rt) => {
            return opaqueExpression_1.getLocal(rt, "x").getValue()
                .combine(opaqueExpression_1.getLocal(rt, "y").getValue(), fn);
        }
    });
}
MATH_FUNCTIONS.forEach(mathFn => {
    if (mathFn.n === 0) {
        registerNoArgMathFn(mathFn.name, mathFn.fn);
    }
    else if (mathFn.n === 1) {
        registerUnaryMathFn(mathFn.name, mathFn.fn);
    }
    else if (mathFn.n === 2) {
        registerBinaryMathFn(mathFn.name, mathFn.fn);
    }
    else {
        util_1.assertNever(mathFn);
    }
});
//# sourceMappingURL=cmath.js.map