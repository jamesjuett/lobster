import {CPPError} from "error"

export var SemanticException = Class.extend({
    _name: "SemanticException",
    annotation : Class._ABSTRACT
});

export var BadLookup = SemanticException.extend({
    _name: "BadLookup",
    init : function(scope, name, paramTypes, isThisConst){
        this.scope = scope;
        this.name = name;
        this.paramTypes = paramTypes;
        this.isThisConst = isThisConst;
    },
    annotation : function(src){
        return this.errorFunc(src, this.name, this.paramTypes, this.isThisConst);
    }

});

export var Ambiguity = BadLookup.extend({
    _name: "Ambiguity",
    errorFunc: CPPError.lookup.ambiguous
});

export var NoMatch = BadLookup.extend({
    _name: "NoMatch",
    errorFunc: CPPError.lookup.no_match

});

// NOTE: Hidden here is really only when the entity doing the hiding was a function.
export var Hidden = BadLookup.extend({
    _name: "Hidden",
    errorFunc: CPPError.lookup.hidden
});

export var NotFound = BadLookup.extend({
    _name: "NotFound",
    errorFunc: CPPError.lookup.not_found
});

export var NoSuchMember = BadLookup.extend({
    _name: "NoSuchMember",
    errorFunc: CPPError.lookup.not_found
});



export var NonCovariantReturnTypes = SemanticException.extend({
    _name: "NonCovariantReturnTypes",
    init : function(overrider, overridden){
        this.overrider = overrider;
        this.overridden = overridden;
    },
    annotation : function(src){
        return CPPError.declaration.func.nonCovariantReturnType(src, this.overrider.type.returnType, this.overridden.type.returnType);
    }

});


export var SemanticExceptionWrapper = SemanticException.extend({
    _name: "SemanticExceptionWrapper",
    init : function(errorFunc, args){
        this.i_errorFunc = errorFunc;
        this.i_args = args;
    },
    annotation : function(src){
        var args = this.i_args.clone();
        args.unshift(src);
        return this.i_errorFunc.apply(null, args);
    }

});