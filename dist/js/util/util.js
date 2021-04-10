"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CPPRandom = exports.unescapeString = exports.escapeString = exports.htmlDecoratedObject = exports.htmlDecoratedValue = exports.htmlDecoratedName = exports.htmlDecoratedType = exports.htmlDecoratedKeyword = exports.htmlDecoratedOperator = exports.createMethodMixin = exports.assertNever = exports.assertFalse = exports.assert = exports.isInstance = exports.asMutable = void 0;
const he_1 = require("he");
function asMutable(obj) {
    return obj;
}
exports.asMutable = asMutable;
// https://github.com/microsoft/TypeScript/issues/5101
function isInstance(ctor) {
    return (x => x instanceof ctor);
}
exports.isInstance = isInstance;
function assert(condition, message = "") {
    if (!condition) {
        throw Error("Assert failed: " + message);
    }
}
exports.assert = assert;
;
function assertFalse(message = "") {
    throw Error("Assert failed: " + message);
}
exports.assertFalse = assertFalse;
;
// https://www.typescriptlang.org/docs/handbook/advanced-types.html#exhaustiveness-checking
function assertNever(x) {
    throw new Error("Unexpected object: " + x);
}
exports.assertNever = assertNever;
function createMethodMixin(mix) {
    return (targetProto, name) => {
        targetProto[name] = mix;
    };
}
exports.createMethodMixin = createMethodMixin;
function htmlDecoratedOperator(operator, cssClass) {
    return "<span class='codeInstance " + (cssClass || "") + "'>" + he_1.encode(operator) + "<span class='lobster-highlight'></span></span>";
}
exports.htmlDecoratedOperator = htmlDecoratedOperator;
;
function htmlDecoratedKeyword(keyword) {
    return '<span class="code-keyword">' + he_1.encode(keyword) + '</span>';
}
exports.htmlDecoratedKeyword = htmlDecoratedKeyword;
;
function htmlDecoratedType(type) {
    return '<span class="code-type">' + he_1.encode(type) + '</span>';
}
exports.htmlDecoratedType = htmlDecoratedType;
;
function htmlDecoratedName(name, type) {
    if (type) {
        return '<span class="code-name"><span class = "lobster-highlight"></span><span class="type">' + he_1.encode(type.englishString(false)) + '</span>' + name + '</span>';
    }
    else {
        return '<span class="code-name"><span class = "lobster-highlight"></span>' + he_1.encode(name) + '</span>';
    }
}
exports.htmlDecoratedName = htmlDecoratedName;
;
function htmlDecoratedValue(value) {
    return '<span class="code-literal">' + he_1.encode(value) + '</span>';
}
exports.htmlDecoratedValue = htmlDecoratedValue;
;
function htmlDecoratedObject(value) {
    return '<span class="code-object">' + he_1.encode(value) + '</span>';
}
exports.htmlDecoratedObject = htmlDecoratedObject;
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
class CPPRandom {
    constructor(seed = 0) {
        this.seed = seed;
    }
    setRandomSeed(newSeed) {
        this.seed = newSeed;
    }
    random(min = 0, max = 1) {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seededRandom(this.seed, min, max);
    }
    randomInteger(min, max) {
        return Math.floor(this.random(min, max));
    }
    seededRandom(seed, min = 0, max = 1) {
        var rnd = seed % 233280 / 233280;
        rnd = min + rnd * (max - min);
        rnd = Math.max(min, Math.min(max, rnd));
        return rnd;
    }
}
exports.CPPRandom = CPPRandom;
//# sourceMappingURL=util.js.map