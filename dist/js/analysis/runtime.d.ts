import { MemoryFrame, RawValueType } from "../core/runtimeEnvironment";
export declare function checkLocalAtomicVariableValues(frame: MemoryFrame, targets: {
    [index: string]: RawValueType;
}, requireValid?: boolean): boolean;
