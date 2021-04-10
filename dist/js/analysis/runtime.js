"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkLocalAtomicVariableValues = void 0;
const types_1 = require("../core/types");
function checkLocalAtomicVariableValues(frame, targets, requireValid = true) {
    for (let name in targets) {
        let obj = frame.localObjectsByName[name];
        if (!obj || !obj.isTyped(types_1.isAtomicType)) {
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
exports.checkLocalAtomicVariableValues = checkLocalAtomicVariableValues;
//# sourceMappingURL=runtime.js.map