import { Type } from "../core/types";
export declare type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};
export declare function asMutable<T>(obj: T): Mutable<T>;
export declare function isInstance<T>(ctor: new (...args: any[]) => T): (x: any) => x is T;
export declare function assert(condition: any, message?: string): asserts condition;
export declare function assertFalse(message?: string): never;
export declare function assertNever(x: never): never;
export declare function createMethodMixin<TargetType, MethodName extends keyof TargetType>(mix: TargetType[MethodName]): (targetProto: TargetType, name: MethodName) => void;
export declare type Constructor<T> = new (...args: any[]) => T;
export declare type Overwrite<T1, T2> = Pick<T1, Exclude<keyof T1, keyof T2>> & T2;
export declare type DiscriminateUnion<T, K extends keyof T, V extends T[K]> = T extends Record<K, V> ? T : never;
export declare type MapDiscriminatedUnion<T extends Record<K, string>, K extends keyof T> = {
    [V in T[K]]: DiscriminateUnion<T, K, V>;
};
export declare function htmlDecoratedOperator(operator: string, cssClass: string): string;
export declare function htmlDecoratedKeyword(keyword: string): string;
export declare function htmlDecoratedType(type: string): string;
export declare function htmlDecoratedName(name: string, type?: Type): string;
export declare function htmlDecoratedValue(value: string): string;
export declare function htmlDecoratedObject(value: string): string;
export declare function escapeString(text: string): string;
export declare function unescapeString(text: string): string;
export declare class CPPRandom {
    private seed;
    constructor(seed?: number);
    setRandomSeed(newSeed: number): void;
    random(min?: number, max?: number): number;
    randomInteger(min: number, max: number): number;
    seededRandom(seed: number, min?: number, max?: number): number;
}
