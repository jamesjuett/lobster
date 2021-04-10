import { Program } from "../core/Program";
export declare type StaticAnalysisExtra = (program: Program) => void;
export declare function getExtras(extra_keys: string | readonly string[]): readonly StaticAnalysisExtra[];
