"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var error_1 = require("error");
exports.SemanticException = Class.extend({
    _name: "SemanticException",
    annotation: Class._ABSTRACT
});
exports.BadLookup = exports.SemanticException.extend({
    _name: "BadLookup",
    init: function (scope, name, paramTypes, isThisConst) {
        this.scope = scope;
        this.name = name;
        this.paramTypes = paramTypes;
        this.isThisConst = isThisConst;
    },
    annotation: function (src) {
        return this.errorFunc(src, this.name, this.paramTypes, this.isThisConst);
    }
});
exports.Ambiguity = exports.BadLookup.extend({
    _name: "Ambiguity",
    errorFunc: error_1.CPPError.lookup.ambiguous
});
exports.NoMatch = exports.BadLookup.extend({
    _name: "NoMatch",
    errorFunc: error_1.CPPError.lookup.no_match
});
// NOTE: Hidden here is really only when the entity doing the hiding was a function.
exports.Hidden = exports.BadLookup.extend({
    _name: "Hidden",
    errorFunc: error_1.CPPError.lookup.hidden
});
exports.NotFound = exports.BadLookup.extend({
    _name: "NotFound",
    errorFunc: error_1.CPPError.lookup.not_found
});
exports.NoSuchMember = exports.BadLookup.extend({
    _name: "NoSuchMember",
    errorFunc: error_1.CPPError.lookup.not_found
});
exports.NonCovariantReturnTypes = exports.SemanticException.extend({
    _name: "NonCovariantReturnTypes",
    init: function (overrider, overridden) {
        this.overrider = overrider;
        this.overridden = overridden;
    },
    annotation: function (src) {
        return error_1.CPPError.declaration.func.nonCovariantReturnType(src, this.overrider.type.returnType, this.overridden.type.returnType);
    }
});
exports.SemanticExceptionWrapper = exports.SemanticException.extend({
    _name: "SemanticExceptionWrapper",
    init: function (errorFunc, args) {
        this.i_errorFunc = errorFunc;
        this.i_args = args;
    },
    annotation: function (src) {
        var args = this.i_args.clone();
        args.unshift(src);
        return this.i_errorFunc.apply(null, args);
    }
});
//# sourceMappingURL=semanticExceptions.js.map