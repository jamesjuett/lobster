import { RawValueType } from "../core/runtime/Value";
import { MemoryFrame } from "../core/runtime/Memory";
import { isAtomicType } from "../core/compilation/types";


export function checkLocalAtomicVariableValues(frame: MemoryFrame, targets: {[index: string]: RawValueType}, requireValid = true) {

    for(let name in targets) {
        let obj = frame.localObjectsByName[name];
        if (!obj || !obj.isTyped(isAtomicType)) {
            return false;
        }
        if (obj.rawValue() !== targets[name]) {
            return false;
        }
        if (requireValid && !obj.isValueValid()) {
            return false;
        }
    }

    return true;
}