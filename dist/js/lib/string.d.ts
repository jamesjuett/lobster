import { MemberSubobject, CPPObject } from "../core/objects";
import { Char, PointerType, CompleteClassType } from "../core/types";
export declare function getDataPtr(obj: CPPObject<CompleteClassType>): MemberSubobject<PointerType<Char>>;
