"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var assign_1 = __importDefault(require("lodash/assign"));
function asMutable(obj) {
    return obj;
}
exports.asMutable = asMutable;
function debug(message, category) {
    if (category) {
        console.log(category + ": " + message);
        $(".debug." + category).html("" + message); //""+ is to force conversion to string (via .toString if object)
    }
    else {
        console.log(message);
        $(".debug.debugAll").html("" + message); //""+ is to force conversion to string (via .toString if object)
    }
}
exports.debug = debug;
function assert(condition, message) {
    if (message === void 0) { message = ""; }
    if (!condition)
        throw Error("Assert failed: " + message);
}
exports.assert = assert;
;
function assertFalse(message) {
    if (message === void 0) { message = ""; }
    throw Error("Assert failed: " + message);
}
exports.assertFalse = assertFalse;
;
function addDefaultPropertiesToPrototype(ctor, props) {
    assign_1.default(ctor.prototype, props);
}
exports.addDefaultPropertiesToPrototype = addDefaultPropertiesToPrototype;
function createMethodMixin(mix) {
    return function (targetProto, name) {
        targetProto[name] = mix;
    };
}
exports.createMethodMixin = createMethodMixin;
function htmlDecoratedOperator(operator, cssClass) {
    return "<span class='codeInstance " + (cssClass || "") + "'>" + operator + "<span class='highlight'></span></span>";
}
exports.htmlDecoratedOperator = htmlDecoratedOperator;
;
function htmlDecoratedKeyword(keyword) {
    return '<span class="code-keyword">' + keyword + '</span>';
}
exports.htmlDecoratedKeyword = htmlDecoratedKeyword;
;
function htmlDecoratedType(type) {
    return '<span class="code-type">' + type.toString() + '</span>';
}
exports.htmlDecoratedType = htmlDecoratedType;
;
function htmlDecoratedName(name, type) {
    return '<span class="code-name"><span class = "highlight"></span><span class="type">' + type.englishString() + '</span>' + name + '</span>';
}
exports.htmlDecoratedName = htmlDecoratedName;
;
function htmlDecoratedValue(value) {
    return '<span class="code-literal">' + value + '</span>';
}
exports.htmlDecoratedValue = htmlDecoratedValue;
;
var escapes = ["\\\"", "\\'", "\\?", "\\\\", "\\a", "\\b", "\\f", "\\n", "\\r", "\\t", "\\v", "\\0"];
var escaped = ["\"", "\'", "", "\\", "", "\b", "\f", "\n", "\r", "\t", "\v", "\0"];
function escapeString(text) {
    for (var i = 0; i < escapes.length; ++i) {
        text = text.replace(escapes[i], escaped[i]);
    }
    return text;
}
exports.escapeString = escapeString;
;
function unescapeString(text) {
    var newStr = "";
    for (var i = 0; i < text.length; ++i) {
        var c = text[i];
        for (var j = 0; j < escaped.length; ++j) {
            if (c === escaped[j]) {
                c = escapes[j];
                break;
            }
        }
        newStr += c;
    }
    return newStr;
}
exports.unescapeString = unescapeString;
;
var CPPRandom = /** @class */ (function () {
    function CPPRandom() {
        this.seed = 0;
    }
    CPPRandom.prototype.setRandomSeed = function (newSeed) {
        this.seed = newSeed;
    };
    CPPRandom.prototype.random = function (min, max) {
        if (min === void 0) { min = 0; }
        if (max === void 0) { max = 1; }
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seededRandom(this.seed, min, max);
    };
    CPPRandom.prototype.seededRandom = function (seed, min, max) {
        if (min === void 0) { min = 0; }
        if (max === void 0) { max = 1; }
        var rnd = seed % 233280 / 233280;
        rnd = min + rnd * (max - min);
        rnd = Math.max(min, Math.min(max, rnd));
        return rnd;
    };
    return CPPRandom;
}());
exports.CPPRandom = CPPRandom;
//# sourceMappingURL=util.js.map