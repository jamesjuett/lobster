import { ArrayPointerType, Bool, Char, isAtomicType, isCompleteClassType, isType, PointerType } from "../../core/compilation/types";
import { CPPObject } from "../../core/runtime/objects";
import { Value } from "../../core/runtime/Value";
import { htmlDecoratedObject, unescapeString } from "../../util/util";

export const EVAL_FADE_DURATION = 500;
export const RESET_FADE_DURATION = 500;

export let CPP_ANIMATIONS = true;

export function SET_ANIMATIONS(onOff: boolean) {
    CPP_ANIMATIONS = onOff;
}

export function getValueString(value: Value) {
    if (value.isTyped(isType(Bool))) {
        return value.rawValue === 1 ? "true" : "false";
    }
    return value.valueString();
}


export function cstringToString(value: Value<ArrayPointerType<Char>>) {
    let offset = value.type.toIndex(value.rawValue);
    let chars = value.type.arrayObject.getValue().slice(offset);
    if (chars.length === 0) {
        // pointer was outside of cstring, bail out
        return '"???..."';
    }
    let cstr = "";
    for(let i = 0; !Char.isNullChar(chars[i]); ++i) {
        cstr += unescapeString(String.fromCharCode(chars[i].rawValue));
        if (i === chars.length - 1) {
            cstr += "???...";
            break;
        }
        else if (i >= 10) {
            cstr += "...";
            break;
        }
    }
    return `"${cstr}"`;
}



export function getObjectString(obj: CPPObject) {
    let name = obj.describe().name;
    if (name.startsWith("[")) {
        if (obj.isTyped(isAtomicType)) {
            return htmlDecoratedObject(getValueString(obj.getValue()));
        }
        else if (obj.isTyped(isCompleteClassType) && obj.type.className === "string") { // TODO make this robust to check for the actual string, not just something named string.
            return htmlDecoratedObject(getValueString((<CPPObject<PointerType<Char>>>obj.getMemberObject("data_ptr")).getValue()));
        }
        else {
            return htmlDecoratedObject("");
        }
    }

    return name;
}
