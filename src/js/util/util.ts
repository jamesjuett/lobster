import assign from "lodash/assign";

export function debug(message, category){
    if (category){
        console.log(category + ": " + message);
        $(".debug."+category).html(""+message); //""+ is to force conversion to string (via .toString if object)
    }
    else{
        console.log(message);
        $(".debug.debugAll").html(""+message); //""+ is to force conversion to string (via .toString if object)
    }
}

export function assert(condition: boolean, message: string = "") {
    if (!condition)
        throw Error("Assert failed: " + message);
};

export function assertFalse(message: string = "") : never {
    throw Error("Assert failed: " + message);
};


export function addDefaultPropertiesToPrototype<T>(ctor: {prototype: T}, props: {}) {
    assign(ctor.prototype, props);
}

export type Constructor<T = {}> = new (...args: any[]) => T;




export function htmlDecoratedOperator(operator, cssClass){
    return "<span class='codeInstance " + (cssClass || "") + "'>" + operator + "<span class='highlight'></span></span>";
};

export function htmlDecoratedKeyword(keyword){
    return '<span class="code-keyword">' + keyword + '</span>';
};

export function htmlDecoratedType(type){
    return '<span class="code-type">' + type.toString() + '</span>';
};

export function htmlDecoratedName(name, type){
    return '<span class="code-name"><span class = "highlight"></span><span class="type">' + type.englishString() + '</span>' + name + '</span>';
};

export function htmlDecoratedValue(value){
    return '<span class="code-literal">' + value + '</span>';
};


interface Array<T> {
    clear() : void;
} 
Array.prototype.clear = function () {
    this.length = 0;
}

// TODO: move these somewhere more appropriate
export function integerDivision(num, den){
    return Math.trunc(num / den);
};

export function floatingDivision(num, den){
    return num / den;
};

export function modulo(num, den){
    return num - integerDivision(num, den)*den;
}





var escapes = ["\\\"", "\\'", "\\?", "\\\\", "\\a", "\\b", "\\f", "\\n", "\\r", "\\t", "\\v", "\\0"];
var escaped = ["\"", "\'", "", "\\", "", "\b", "\f", "\n", "\r", "\t", "\v", "\0"];

export function escapeString(text){
    for(var i = 0; i < escapes.length; ++i){
        text = text.replace(escapes[i], escaped[i]);
    }
    return text;
};
export function unescapeString(text){
    var newStr = "";
    for(var i = 0; i < text.length; ++i){
        var c = text[i];
        for(var j = 0; j < escaped.length; ++j){
            if (c === escaped[j]){
                c = escapes[j];
                break;
            }
        }
        newStr += c;
    }
    return newStr;
};