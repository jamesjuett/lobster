import { MemberSubobject, CPPObject } from "../core/objects";
import { CompleteClassType, ArrayPointerType, AtomicType } from "../core/types";
export declare function getDataPtr(obj: CPPObject<CompleteClassType>): MemberSubobject<ArrayPointerType<AtomicType>>;
