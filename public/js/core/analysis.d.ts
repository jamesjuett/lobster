import { CPPConstruct } from "./constructs";
import { Program, TranslationUnit } from "./Program";
import { AssignmentExpression } from "./expressions";
import { AnalyticConstruct } from "./predicates";
export declare type CPPConstructTest<Original extends CPPConstruct, T extends Original> = (construct: Original) => construct is T;
export declare type CPPConstructFunctor<T extends CPPConstruct> = (construct: T) => void;
export declare function constructTest<Original extends CPPConstruct, T extends Original>(constructClass: Function & {
    prototype: T;
}): CPPConstructTest<Original, T>;
export declare function exploreConstructs<T extends CPPConstruct>(root: CPPConstruct | TranslationUnit | Program, test: CPPConstructTest<CPPConstruct, T>, fn: CPPConstructFunctor<T>): void;
export declare function findConstructs<T extends AnalyticConstruct>(root: CPPConstruct | TranslationUnit | Program, test: CPPConstructTest<AnalyticConstruct, T>): T[];
export declare function findFirstConstruct<T extends AnalyticConstruct>(root: CPPConstruct | TranslationUnit | Program, test: CPPConstructTest<AnalyticConstruct, T>): T | undefined;
export declare function containsConstruct<T extends AnalyticConstruct>(root: CPPConstruct | TranslationUnit | Program, test: CPPConstructTest<AnalyticConstruct, T>): boolean;
export declare const projectAnalyses: {
    [projectName: string]: (p: Program) => void;
};
export declare function eecs183_l03_03(program: Program): void;
export declare function isUpdateAssignment(exp: AnalyticConstruct): exp is AssignmentExpression;
