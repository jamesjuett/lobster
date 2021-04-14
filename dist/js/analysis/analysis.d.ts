import { CPPConstruct } from "../core/constructs";
import { Program, TranslationUnit } from "../core/Program";
import { AssignmentExpression } from "../core/expressions";
import { AnalyticConstruct } from "../core/predicates";
export declare type CPPConstructTest<Original extends CPPConstruct, T extends Original> = (construct: Original) => construct is T;
export declare type CPPConstructFunctor<T extends CPPConstruct> = (construct: T, stop: () => void) => void;
export declare function constructTest<Original extends CPPConstruct, T extends Original>(constructClass: Function & {
    prototype: T;
}): CPPConstructTest<Original, T>;
export declare function exploreConstructs<T extends CPPConstruct>(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: CPPConstructTest<CPPConstruct, T>, fn: CPPConstructFunctor<T>, keepGoing?: {
    b: boolean;
}): void;
export declare function exploreConstructs(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: CPPConstruct) => boolean, fn: CPPConstructFunctor<CPPConstruct>, keepGoing?: {
    b: boolean;
}): void;
export declare function exploreConstructs(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: AnalyticConstruct) => boolean, fn: CPPConstructFunctor<AnalyticConstruct>, keepGoing?: {
    b: boolean;
}): void;
export declare function findConstructs<T extends AnalyticConstruct>(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: CPPConstructTest<AnalyticConstruct, T>): T[];
export declare function findConstructs(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: CPPConstruct) => boolean): CPPConstruct[];
export declare function findConstructs(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: AnalyticConstruct) => boolean): AnalyticConstruct[];
export declare function findFirstConstruct<T extends AnalyticConstruct>(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: CPPConstructTest<AnalyticConstruct, T>): T | undefined;
export declare function findFirstConstruct(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: CPPConstruct) => boolean): CPPConstruct | undefined;
export declare function findFirstConstruct(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: AnalyticConstruct) => boolean): AnalyticConstruct | undefined;
export declare function containsConstruct<T extends AnalyticConstruct>(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: CPPConstructTest<AnalyticConstruct, T>): boolean;
export declare function containsConstruct(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: CPPConstruct) => boolean): boolean;
export declare function containsConstruct(root: CPPConstruct | CPPConstruct[] | TranslationUnit | Program, test: (construct: AnalyticConstruct) => boolean): boolean;
export declare function eecs183_l03_03(program: Program): void;
export declare function isUpdateAssignment(exp: AnalyticConstruct): exp is AssignmentExpression;
