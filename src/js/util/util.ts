import assign from "lodash/assign";

export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

export function asMutable<T>(obj: T) : Mutable<T> {
    return <Mutable<T>>obj;
}



export function assert(condition: boolean, message: string = "") {
    if (!condition)
        throw Error("Assert failed: " + message);
};

export function assertFalse(message: string = "") : never {
    throw Error("Assert failed: " + message);
};


export function createMethodMixin<TargetType, MethodName extends keyof TargetType>(mix: TargetType[MethodName]) {
    return (targetProto: TargetType, name: MethodName) => {
        targetProto[name] = mix;
    }
}

export type Constructor<T> = new (...args: any[]) => T;

export type Overwrite<T1, T2> = Pick<T1, Exclude<keyof T1, keyof T2>> & T2;

// https://stackoverflow.com/questions/50125893/typescript-derive-map-from-discriminated-union
export type DiscriminateUnion<T, K extends keyof T, V extends T[K]> = 
    T extends Record<K, V> ? T : never;
export type MapDiscriminatedUnion<T extends Record<K, string>, K extends keyof T> =
  { [V in T[K]]: DiscriminateUnion<T, K, V> };

// export function htmlDecoratedOperator(operator, cssClass){
//     return "<span class='codeInstance " + (cssClass || "") + "'>" + operator + "<span class='highlight'></span></span>";
// };

// export function htmlDecoratedKeyword(keyword){
//     return '<span class="code-keyword">' + keyword + '</span>';
// };

export function htmlDecoratedType(typeString: string) {
    return '<span class="code-type">' + typeString + '</span>';
};

// export function htmlDecoratedName(name, type){
//     return '<span class="code-name"><span class = "highlight"></span><span class="type">' + type.englishString() + '</span>' + name + '</span>';
// };

// export function htmlDecoratedValue(value){
//     return '<span class="code-literal">' + value + '</span>';
// };


var escapes = ["\\\"", "\\'", "\\?", "\\\\", "\\a", "\\b", "\\f", "\\n", "\\r", "\\t", "\\v", "\\0"];
var escaped = ["\"", "\'", "", "\\", "", "\b", "\f", "\n", "\r", "\t", "\v", "\0"];

export function escapeString(text: string) {
    for(var i = 0; i < escapes.length; ++i){
        text = text.replace(escapes[i], escaped[i]);
    }
    return text;
};
export function unescapeString(text: string){
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

export class CPPRandom {

    private seed = 0;

    public setRandomSeed(newSeed: number) {
        this.seed = newSeed;
    }

    public random(min: number = 0, max: number = 1) {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seededRandom(this.seed, min, max);
    }

    public seededRandom(seed: number, min: number = 0, max: number = 1) {
        var rnd = seed % 233280 / 233280;
    
        rnd = min + rnd * (max - min);
        rnd = Math.max(min, Math.min(max, rnd));
        return rnd;
    }
}