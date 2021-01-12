import { registerLibraryHeader, SourceFile } from "../core/Program";
import { MemberSubobject, CPPObject } from "../core/objects";
import { Int, Char, PointerType, BoundedArrayType, CompleteObjectType, ReferenceType, CompleteClassType, ArrayPointerType, Size_t, VoidType, PotentiallyCompleteClassType, Bool, isArrayPointerType, Double } from "../core/types";
import { runtimeObjectLookup, VariableEntity, LocalVariableEntity, LocalObjectEntity, LocalReferenceEntity } from "../core/entities";
import { Value } from "../core/runtimeEnvironment";
import { SimulationEvent } from "../core/Simulation";
import { registerOpaqueExpression, RuntimeOpaqueExpression, OpaqueExpressionImpl, lookupTypeInContext, getLocal } from "../core/opaqueExpression";
import { ExpressionContext } from "../core/constructs";
import { assert } from "../util/util";
import { Expression, RuntimeExpression } from "../core/expressionBase";
import { nth } from "lodash";


function extractCharsFromCString(rt: RuntimeExpression, ptrValue: Value<PointerType<Char>>, nToCopy?: Value<Int>) {
    let sim = rt.sim;
    let ptrType = ptrValue.type;

    if (PointerType.isNull(ptrValue.rawValue)) {
        sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "Oops, the char* you're using was null. This results in undefined behavior.");
        return {charValues: [], validLength: false};
    }

    let charValuesToCopy : Value<Char>[] = [];
    let outOfBounds = false;
    let seenInvalidChar = false;

    let c = sim.memory.dereference(ptrValue).getValue();
    // Copy in-bounds characters until null char or limit
    while ((!nToCopy || nToCopy.rawValue > 0) && ptrType.isValueDereferenceable(ptrValue.rawValue) && !Char.isNullChar(c)) {
        if (!c.isValid) {
            seenInvalidChar = true;
        }
        charValuesToCopy.push(seenInvalidChar ? c.invalidated() : c);
        ptrValue = ptrValue.pointerOffset(new Value(1, Int.INT));
        c = sim.memory.dereference(ptrValue).getValue();
        nToCopy = nToCopy?.subRaw(1);
    }

    if (!ptrType.isValueDereferenceable(ptrValue.rawValue)) {
        // We stopped previously because the pointer was no longer safely dereferenceable, so
        // now we'll go ahead and let the pointer keep going, but stop it after a while to prevent
        // an infinite loop.
        outOfBounds = true;
        let count = 0;
        let limit = 100;
        while (count < limit && !Char.isNullChar(c)) {
            // invalidate c here since even if was a valid char value, the fact we got this particular
            // value is a coincidence because we were off the end of an arary in no man's land
            charValuesToCopy.push(c.invalidated());
            ptrValue = ptrValue.pointerOffset(new Value(1, Int.INT));
            c = sim.memory.dereference(ptrValue).getValue();
            ++count;
        }

        if (!isArrayPointerType(ptrType)) {
            if (count === limit) {
                sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "Oops, that char* wasn't pointing into an array, which means you get undefined behavior with the pointer running off through random memory. I let it go for a while, but stopped it after copying " + limit + " junk values.");
            }
            else if (count > 0) {
                sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "Oops, that char* wasn't pointing into an array, which means you get undefined behavior with the pointer running off through random memory. It looks like it happened to hit a null byte in memory and stopped " + count + " characters past the end of the array.");
            }
            else {
                sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "Oops, that char* wasn't pointing into an array, which means you get undefined behavior with the pointer running off through random memory. Somehow you got lucky and the first random thing it hit was a null byte, which stopped it. Don't count on this.");
            }
        }
        else {
            if (count === limit) {
                sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "I was trying to read from an array through that char*, but it ran off the end of the array before finding a null character! I let it run through memory for a while, but stopped it after copying " + limit + " junk values.");
            }
            else if (count > 0) {
                sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "I was trying to read from an array through that char*, but it ran off the end of the array before finding a null character! It looks like it happened to hit a null byte in memory and stopped " + count + " characters past the end of the array.");
            }
            else {
                sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "I was trying to read from an array through that char*, but it ran off the end of the array before finding a null character! Somehow you got lucky and the first random thing it hit was a null byte, which stopped it. Don't count on this.");
            }
        }
    }
    else {
        if (!isArrayPointerType(ptrType)) {
            sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "Oops, that char* wasn't pointing into an array, which can lead to undefined behavior.");
        }
    }

    // Use the null char we found or a synthetic (invalid) one for the last thing to copy
    if (!outOfBounds && Char.isNullChar(c)) {
        charValuesToCopy.push(c);
    }
    else {
        charValuesToCopy.push(Char.NULL_CHAR.invalidated());
    }

    return {charValues: charValuesToCopy, validLength: !seenInvalidChar && !outOfBounds && (!nToCopy || nToCopy.isValid)};
};

function copyFromCString(rt: RuntimeExpression, str: CPPObject<CompleteClassType>, charsToCopy: readonly Value<Char>[], validLength: boolean = true) {
    
    // If something was uncertain that could have affected the length, invalidate capacity/size
    getCapacity(str).writeValue(new Value(charsToCopy.length, Int.INT, validLength));
    getSize(str).writeValue(new Value(charsToCopy.length-1, Int.INT, validLength));

    allocateNewArray(rt, str, charsToCopy.length, charsToCopy);
}

// var resizeStrang = function(sim: Simulation, rtConstruct: RuntimeConstruct, n, c) {
//     var rec = ReceiverEntity.instance(this.containingFunction().receiverType).runtimeLookup(sim, inst);
//     var rawSize = rec.getMemberSubobject("_size").rawValue();
//     var rawCapacity = rec.getMemberSubobject("_capacity").rawValue();

//     if (!n.isValueValid()) {
//         rec.invalidate();
//     }


//     var rawN = n.rawValue();
//     if (rawN == rawSize) {
//         // right size already, do nothing
//     }
//     else if (rawN < rawSize) {
//         // We want less, so just change size variable
//     }
//     else if (rawN < rawCapacity) {
//         // We want more, and we have enough capacity (for n chars plus null char)
//         var arrObj = sim.memory.dereference(rec.getMemberSubobject("data_ptr")).arrObj;
//         for(var i = rawSize; i < rawN; ++i) {
//             arrObj.getArrayElemSubobject(i).writeValue(c);
//         }

//         // add null char
//         arrObj.getArrayElemSubobject(rawN).writeValue(Value.instance(Types.Char.NULL_CHAR, Types.Char.instance()));

//     }
//     else {
//         // We want more, but don't have enough capacity. make new array
//         var arrObj = sim.memory.dereference(rec.getMemberSubobject("data_ptr")).arrObj;

//         var charsToCopy = [];
//         var i = 0;
//         for( ; i < rawSize; ++i) {
//             charsToCopy.push(arrObj.getArrayElemSubobject(i));
//         }
//         for( ; i < rawN; ++i) {
//             charsToCopy.push(c);
//         }

//         // add a null char
//         charsToCopy.push(Value.instance(Types.Char.NULL_CHAR, Types.Char.instance()));

//         var rec = ReceiverEntity.instance(this.containingFunction().receiverType).runtimeLookup(sim, inst);
//         rec.getMemberSubobject("_capacity").writeValue(n.plus(1));

//         // deep copy the array
//         var arrObj = DynamicObject.instance(Types.Array.instance(Types.Char.instance(), charsToCopy.length));
//         sim.memory.heap.allocateNewObject(arrObj);
//         arrObj.writeValue(charsToCopy);

//         // delete old array
//         deleteHeapArray(sim, inst, rec.getMemberSubobject("data_ptr"));

//         // store pointer to new array
//         var addr = Value.instance(arrObj.address, Types.ArrayPointer.instance(arrObj));
//         this.blockScope.requiredLookup("data_ptr").runtimeLookup(sim, inst).writeValue(addr);


//     }
//     // else do nothing since it was the right length to start with

//     // actually update the size
//     rec.getMemberSubobject("_size").writeValue(n);
// };

// var replaceStrangArrayWith = function(sim: Simulation, rtConstruct: RuntimeConstruct, contents) {

//     var rec = ReceiverEntity.instance(this.containingFunction().receiverType).runtimeLookup(sim, inst);

//     // delete old array
//     deleteHeapArray(sim, inst, rec.getMemberSubobject("data_ptr"));

//     // set regular members
//     rec.getMemberSubobject("_capacity").writeValue(contents.length + 1);
//     rec.getMemberSubobject("_size").writeValue(contents.length);

//     // make new array for the new contents and null char
//     var arrObj = DynamicObject.instance(Types.Array.instance(Types.Char.instance(), contents.length + 1));
//     sim.memory.heap.allocateNewObject(arrObj);
//     arrObj.writeValue(contents.concat([Value.instance(Types.Char.NULL_CHAR, Types.Char.instance())]));

//     // store pointer to new array
//     var addr = Value.instance(arrObj.address, Types.ArrayPointer.instance(arrObj));
//     rec.getMemberSubobject("data_ptr").writeValue(addr);

// };

const initialStrangCapacity = 8;

registerLibraryHeader("string",
    new SourceFile("string.h",
`

class ostream {};
class istream {};

class string {
private:
    size_t _size;
    size_t _capacity;
    char * data_ptr;
public:
    string() {
        @string::string_default;
    }

    string(const string &other) {
        @string::string_copy;
    }

    // string(const string &other, size_t pos, size_t len) {
    //     @string::string_substring_1;
    // }

    // string(const string &other, size_t pos) {
    //     @string::string_substring_2;
    // }

    string(const char *cstr) {
        @string::string_cstring;
    }

    string(const char *cstr, size_t n) {
        @string::string_cstring_n;
    }

    string(size_t n, char c) {
        @string::string_fill;
    }

    // ~string() {
    //     @string::~string;
    // }

    string &operator=(const string &rhs) {
        return @string::operator=_string;
    }

    string &operator=(const char *cstr) {
        return @string::operator=_cstring;
    }

    string &operator=(char c) {
        return @string::operator=_char;
    }

    string &operator+=(const string &rhs) {
        return @string::operator+=_string;
    }

    string &operator+=(const char *cstr) {
        return @string::operator+=_cstring;
    }

    string &operator+=(char c) {
        return @string::operator+=_char;
    }

    // void begin() @library_unsupported;
    // void end() @library_unsupported;
    // void rbegin() @library_unsupported;
    // void rend() @library_unsupported;
    // void cbegin() const @library_unsupported;
    // void cend() const @library_unsupported;
    // void crbegin() const @library_unsupported;
    // void crend() const @library_unsupported;

    size_t size() const {
        return @string::size;
    }

    size_t length() const {
        return @string::length;
    }
    
    // size_t max_size() const @library_unsupported;

    // void resize(size_t n, char c) {
    //     @string::resize_1;
    // }

    // void resize(size_t n) {
    //     @string::resize_2;
    // }

    size_t capacity() const {
        return @string::capacity;
    }

    // void reserve() @library_unsupported;
    // void reserve(size_t n) @library_unsupported;

    void clear() {
        @string::clear;
    }

    bool empty() const {
        return @string::empty;
    }

    // void shrink_to_fit() @library_unsupported;

    char &operator[](size_t pos) {
        return @string::operator[];
    }

    const char &operator[](size_t pos) const {
        return @string::operator[]_const;
    }

    char &at(size_t pos) {
        return @string::at;
    }

    const char &at(size_t pos) const {
        return @string::at_const;
    }

    char &front(size_t pos) {
        return @string::front;
    }

    const char &front(size_t pos) const {
        return @string::front_const;
    }
};

string operator+(const string &left, const string &right) {
    @operator+_string_string;
}

string operator+(const string &str, const char *cstr) {
    @operator+_string_cstring;
}

string operator+(const char *cstr, const string &str) {
    @operator+_cstring_string;
}

string operator+(const string &str, char c) {
    @operator+_string_char;
}

string operator+(char c, const string &str) {
    @operator+_char_string;
}

bool operator==(const string &left, const string &right) {
    return @operator==_string_string;
}

bool operator!=(const string &left, const string &right) {
    return @operator!=_string_string;
}

bool operator<(const string &left, const string &right) {
    return @operator<_string_string;
}

bool operator<=(const string &left, const string &right) {
    return @operator<=_string_string;
}

bool operator>(const string &left, const string &right) {
    return @operator>_string_string;
}

bool operator>=(const string &left, const string &right) {
    return @operator>=_string_string;
}

bool operator==(const string &left, const char *right) {
    return @operator==_string_cstring;
}

bool operator!=(const string &left, const char *right) {
    return @operator!=_string_cstring;
}

bool operator<(const string &left, const char *right) {
    return @operator<_string_cstring;
}

bool operator<=(const string &left, const char *right) {
    return @operator<=_string_cstring;
}

bool operator>(const string &left, const char *right) {
    return @operator>_string_cstring;
}

bool operator>=(const string &left, const char *right) {
    return @operator>=_string_cstring;
}

bool operator==(const char *left, const string &right) {
    return @operator==_cstring_string;
}

bool operator!=(const char *left, const string &right) {
    return @operator!=_cstring_string;
}

bool operator<(const char *left, const string &right) {
    return @operator<_cstring_string;
}

bool operator<=(const char *left, const string &right) {
    return @operator<=_cstring_string;
}

bool operator>(const char *left, const string &right) {
    return @operator>_cstring_string;
}

bool operator>=(const char *left, const string &right) {
    return @operator>=_cstring_string;
}

ostream &operator<<(ostream &os, const string &str) {
    return @operator<<_ostream_string;
}

istream &operator>>(istream &is, string &str) {
    return @operator>>_istream_string;
}

istream &getline(istream &is, string &str) {
    return @getline_istream_string;
}

int stoi(const string &str) {
    return @stoi;
}

int stol(const string &str) {
    return @stoi;
}

int stod(const string &str) {
    return @stod;
}

int stof(const string &str) {
    return @stod;
}`, true
    )
);

function getCapacity(obj: CPPObject<CompleteClassType>) {
    return <MemberSubobject<Int>>obj.getMemberObject("_capacity");
}

function getSize(obj: CPPObject<CompleteClassType>) {
    return <MemberSubobject<Int>>obj.getMemberObject("_size");
}

export function getDataPtr(obj: CPPObject<CompleteClassType>) {
    return <MemberSubobject<PointerType<Char>>>obj.getMemberObject("data_ptr");
}

function extractStringValue(rt: RuntimeExpression, cstr: Value<PointerType<Char>>) {
    return extractCharsFromCString(rt, cstr).charValues.map(c => String.fromCharCode(c.rawValue)).join("");
}

registerOpaqueExpression("string::string_default", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {
        getCapacity(rt.contextualReceiver).writeValue(new Value(initialStrangCapacity, Int.INT));
        getSize(rt.contextualReceiver).writeValue(new Value(0, Int.INT));

        allocateNewArray(rt, rt.contextualReceiver, initialStrangCapacity, [Char.NULL_CHAR])
        // let obj = rt.sim.memory.heap.allocateNewObject(new BoundedArrayType(Char.CHAR, initialStrangCapacity));
    }
});

registerOpaqueExpression("string::string_copy", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

        let rec = rt.contextualReceiver;
        let other = getLocal<CompleteClassType>(rt, "other");

        let {charValues, validLength} = extractCharsFromCString(rt, getDataPtr(other).getValue());
        copyFromCString(rt, rec, charValues, validLength);
    }
});

// Substring ctor (with 3rd argument provided)
// registerOpaqueExpression("string::string_substring_1", {
//     type: VoidType.VOID,
//     valueCategory: "prvalue",
//     operate: (rt: RuntimeOpaqueExpression) => {

//         let rec = rt.contextualReceiver;
//         let other = getLocal<CompleteClassType>(rt, "other");
//         let pos = getLocal<Int>(rt, "pos").getValue();
        
//         let availableChars = getSize(other).getValue().sub(pos);

//         if (availableChars.rawValue < 0) {
//             rt.sim.eventOccurred(SimulationEvent.CRASH, "The start position you requested in this string constructor is greater than the length of the other string.");
//         }
//         else {
//             let len = getLocal<Int>(rt, "len").getValue();
//             let newSize = len.combine(availableChars, (a,b) => Math.min(a,b));
//             let newCapacity = newSize.addRaw(1);
            
//             let newChars = extractCharsFromCString(rt, getDataPtr(other).getValue()).charValues.slice(pos.rawValue, pos.rawValue + newSize.rawValue);
            
//             // copy regular members
//             getCapacity(rec).writeValue(newCapacity);
//             getSize(rec).writeValue(newSize);

//             // deep copy the array
//             newChars.push(Char.NULL_CHAR);
//             allocateNewArray(rt, rec, newCapacity.rawValue, newChars);
//         }

//     }
// });

// // Substring ctor (without 3rd argument, so use default)
// registerOpaqueExpression("string::string_substring_2", {
//     type: VoidType.VOID,
//     valueCategory: "prvalue",
//     operate: (rt: RuntimeOpaqueExpression) => {
//         let rec = rt.contextualReceiver;
//         let other = getLocal<CompleteClassType>(rt, "other");
//         let pos = getLocal<Int>(rt, "pos").getValue();
        
//         let availableChars = getSize(other).getValue().sub(pos);

//         if (availableChars.rawValue < 0) {
//             rt.sim.eventOccurred(SimulationEvent.CRASH, "The start position you requested in this string constructor is greater than the length of the other string.");
//         }
//         else {
//             let newSize = availableChars;
//             let newCapacity = newSize.addRaw(1);
            
//             // copy regular members
//             getCapacity(rec).writeValue(newCapacity);
//             getSize(rec).writeValue(newSize);

//             // deep copy the array
//             let newChars = extractCharsFromCString(rt, getDataPtr(other).getValue()).charValues.slice(pos.rawValue, pos.rawValue + newSize.rawValue);
//             newChars.push(Char.NULL_CHAR);
//             allocateNewArray(rt, rec, newCapacity.rawValue, newChars);
//         }

//     }
// });

registerOpaqueExpression("string::string_cstring", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {
        let {charValues, validLength} = extractCharsFromCString(rt, getLocal<PointerType<Char>>(rt, "cstr").getValue());
        copyFromCString(rt, rt.contextualReceiver, charValues, validLength);

        
    }
});

registerOpaqueExpression("string::string_cstring_n", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {
        let {charValues, validLength} = extractCharsFromCString(rt, getLocal<PointerType<Char>>(rt, "cstr").getValue(), getLocal<Int>(rt, "n").getValue());
        copyFromCString(rt, rt.contextualReceiver, charValues, validLength);
    }
});

// fill constructor from char
registerOpaqueExpression("string::string_fill", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

        let rec = rt.contextualReceiver;
        let numChars = getLocal<Int>(rt, "n").getValue();
        let char = getLocal<Char>(rt, "c").getValue();

        getSize(rec).writeValue(numChars);
        getCapacity(rec).writeValue(numChars.addRaw(1));

        // allocate array
        let arrElems = allocateNewArray(rt, rec, numChars.rawValue + 1, []);

        // fill array
        arrElems.forEach((arrElem, i) => arrElem.writeValue(char));

    }
});

registerOpaqueExpression("string::~string", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {
        rt.sim.memory.heap.deleteObject(getDataPtr(rt.contextualReceiver).getValue().rawValue);
    }
});

registerOpaqueExpression("string::size", <OpaqueExpressionImpl<Int, "lvalue">> {
    type: Int.INT,
    valueCategory: "lvalue",
    operate: (rt: RuntimeOpaqueExpression<Int, "lvalue">) => {
        return getSize(rt.contextualReceiver);
    }
});

registerOpaqueExpression("string::length", <OpaqueExpressionImpl<Int, "lvalue">> {
    type: Int.INT,
    valueCategory: "lvalue",
    operate: (rt: RuntimeOpaqueExpression<Int, "lvalue">) => {
        return getSize(rt.contextualReceiver);
    }
});

// registerOpaqueExpression("string::resize_1", {
//     type: VoidType.VOID,
//     valueCategory: "prvalue",
//     operate: (rt: RuntimeOpaqueExpression) => {

//     }
// });

// registerOpaqueExpression("string::resize_2", {
//     type: VoidType.VOID,
//     valueCategory: "prvalue",
//     operate: (rt: RuntimeOpaqueExpression) => {

//     }
// });

registerOpaqueExpression("string::capacity", <OpaqueExpressionImpl<Int, "lvalue">> {
    type: Int.INT,
    valueCategory: "lvalue",
    operate: (rt: RuntimeOpaqueExpression<Int, "lvalue">) => {
        return getCapacity(rt.contextualReceiver);
    }
});

registerOpaqueExpression("string::clear", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {
        let rec = rt.contextualReceiver;
        let firstElem = rt.sim.memory.dereference(getDataPtr(rec).getValue());
        firstElem.writeValue(Char.NULL_CHAR);
        getSize(rec).writeValue(new Value(0, Int.INT));
    }
});

registerOpaqueExpression("string::empty", <OpaqueExpressionImpl<Bool, "prvalue">>{
    type: Bool.BOOL,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression<Bool, "prvalue">) => {
        return getSize(rt.contextualReceiver).getValue().equals(Int.ZERO);
    }
});

// registerOpaqueExpression("string::operator[]", {
//     type: VoidType.VOID,
//     valueCategory: "prvalue",
//     operate: (rt: RuntimeOpaqueExpression) => {

//     }
// });

// registerOpaqueExpression("string::operator[]_const", {
//     type: VoidType.VOID,
//     valueCategory: "prvalue",
//     operate: (rt: RuntimeOpaqueExpression) => {

//     }
// });

registerOpaqueExpression(
    "string::operator[]",
    <OpaqueExpressionImpl<Char, "lvalue">> {
        type: Char.CHAR,
        valueCategory: "lvalue",
        operate: (rt: RuntimeOpaqueExpression<Char, "lvalue">) => {
            let ptr = getDataPtr(rt.contextualReceiver).getValue();
            let pos = getLocal<Int>(rt, "pos").getValue();
            ptr = ptr.pointerOffset(pos);

            if (!ptr.isValid) {
                rt.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "It looks like the position you requested is out of bounds for that string. The character reference you got back just refers to memory junk somewhere!");
            }

            return rt.sim.memory.dereference(ptr);
        }
    }
);

registerOpaqueExpression(
    "string::operator[]_const",
    <OpaqueExpressionImpl<Char, "lvalue">> {
        type: new Char(true),
        valueCategory: "lvalue",
        operate: (rt: RuntimeOpaqueExpression<Char, "lvalue">) => {
            let ptr = getDataPtr(rt.contextualReceiver).getValue();
            let pos = getLocal<Int>(rt, "pos").getValue();
            ptr = ptr.pointerOffset(pos);

            if (!ptr.isValid) {
                rt.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "It looks like the position you requested is out of bounds for that string. The character reference you got back just refers to memory junk somewhere!");
            }

            return rt.sim.memory.dereference(ptr);
        }
    }
);

registerOpaqueExpression(
    "string::at",
    <OpaqueExpressionImpl<Char, "lvalue">> {
        type: Char.CHAR,
        valueCategory: "lvalue",
        operate: (rt: RuntimeOpaqueExpression<Char, "lvalue">) => {
            let ptr = getDataPtr(rt.contextualReceiver).getValue();
            let pos = getLocal<Int>(rt, "pos").getValue();
            ptr = ptr.pointerOffset(pos);

            if (!ptr.isValid) {
                rt.sim.eventOccurred(SimulationEvent.CRASH, "It looks like the position you requested is out of bounds for that string. The character reference you got back just refers to memory junk somewhere!");
            }

            return rt.sim.memory.dereference(ptr);
        }
    }
);

registerOpaqueExpression(
    "string::at_const",
    <OpaqueExpressionImpl<Char, "lvalue">> {
        type: new Char(true),
        valueCategory: "lvalue",
        operate: (rt: RuntimeOpaqueExpression<Char, "lvalue">) => {
            let ptr = getDataPtr(rt.contextualReceiver).getValue();
            let pos = getLocal<Int>(rt, "pos").getValue();
            ptr = ptr.pointerOffset(pos);

            if (!ptr.isValid) {
                rt.sim.eventOccurred(SimulationEvent.CRASH, "It looks like the position you requested is out of bounds for that string. The character reference you got back just refers to memory junk somewhere!");
            }

            return rt.sim.memory.dereference(ptr);
        }
    }
);

registerOpaqueExpression(
    "string::front",
    <OpaqueExpressionImpl<Char, "lvalue">> {
        type: Char.CHAR,
        valueCategory: "lvalue",
        operate: (rt: RuntimeOpaqueExpression<Char, "lvalue">) => {
            return rt.sim.memory.dereference(getDataPtr(rt.contextualReceiver).getValue());
    }
});

registerOpaqueExpression(
    "string::front_const",
    <OpaqueExpressionImpl<Char, "lvalue">> {
        type: new Char(true),
        valueCategory: "lvalue",
        operate: (rt: RuntimeOpaqueExpression<Char, "lvalue">) => {
            return rt.sim.memory.dereference(getDataPtr(rt.contextualReceiver).getValue());
    }
});




function addFromCStrings(rt: RuntimeExpression, result: CPPObject<CompleteClassType>, left: Value<PointerType<Char>>, right: Value<PointerType<Char>>, deleteOld: boolean = false) {
    let {charValues: leftChars, validLength: leftValidLength} = extractCharsFromCString(rt, left);
    leftChars.pop(); // remove null char that would otherwise be in the middle of left + right
    let {charValues: rightChars, validLength: rightValidLength} = extractCharsFromCString(rt, right);

    let newChars = leftChars.concat(rightChars);

    let newCapacity = new Value(newChars.length, Int.INT, leftValidLength && rightValidLength);
    let newSize = newCapacity.subRaw(1);

    getCapacity(result).writeValue(newCapacity);
    getSize(result).writeValue(newSize);

    if (deleteOld) {
        rt.sim.memory.heap.deleteObject(getDataPtr(result).getValue().rawValue);
    }
    // allocate new array with enough space
    allocateNewArray(rt, result, newCapacity.rawValue, newChars);
}

registerOpaqueExpression(
    "operator+_string_string",
    <OpaqueExpressionImpl<VoidType, "prvalue">> {
        type: VoidType.VOID,
        valueCategory: "prvalue",
        operate: (rt: RuntimeOpaqueExpression<VoidType, "prvalue">) => {
            let returnObject = <CPPObject<CompleteClassType>>rt.containingRuntimeFunction.returnObject;
            assert(returnObject, "String + operator lacking return-by-value object");

            addFromCStrings(rt, returnObject,
                            getDataPtr(getLocal<CompleteClassType>(rt, "left")).getValue(),
                            getDataPtr(getLocal<CompleteClassType>(rt, "right")).getValue());
        }
    }
);

registerOpaqueExpression(
    "operator+_string_cstring",
    <OpaqueExpressionImpl<VoidType, "prvalue">> {
        type: VoidType.VOID,
        valueCategory: "prvalue",
        operate: (rt: RuntimeOpaqueExpression<VoidType, "prvalue">) => {
            let returnObject = <CPPObject<CompleteClassType>>rt.containingRuntimeFunction.returnObject;
            assert(returnObject, "String + operator lacking return-by-value object");

            addFromCStrings(rt, returnObject,
                            getDataPtr(getLocal<CompleteClassType>(rt, "str")).getValue(),
                            getLocal<PointerType<Char>>(rt, "cstr").getValue());
        }
    }
);

registerOpaqueExpression(
    "operator+_cstring_string",
    <OpaqueExpressionImpl<VoidType, "prvalue">> {
        type: VoidType.VOID,
        valueCategory: "prvalue",
        operate: (rt: RuntimeOpaqueExpression<VoidType, "prvalue">) => {
            let returnObject = <CPPObject<CompleteClassType>>rt.containingRuntimeFunction.returnObject;
            assert(returnObject, "String + operator lacking return-by-value object");

            addFromCStrings(rt, returnObject,
                            getLocal<PointerType<Char>>(rt, "cstr").getValue(),
                            getDataPtr(getLocal<CompleteClassType>(rt, "str")).getValue());
        }
    }
);

registerOpaqueExpression(
    "operator+_string_char",
    <OpaqueExpressionImpl<VoidType, "prvalue">> {
        type: VoidType.VOID,
        valueCategory: "prvalue",
        operate: (rt: RuntimeOpaqueExpression<VoidType, "prvalue">) => {
            let returnObject = <CPPObject<CompleteClassType>>rt.containingRuntimeFunction.returnObject;
            assert(returnObject, "String + operator lacking return-by-value object");

            let left = getLocal<CompleteClassType>(rt, "str");
            let right = getLocal<Char>(rt, "c");

                            
            let {charValues: leftChars, validLength: leftValidLength} = extractCharsFromCString(rt, getDataPtr(left).getValue());
            leftChars.pop(); // remove null char that would otherwise be in the middle of left + right
            leftChars.push(right.getValue());
            leftChars.push(Char.NULL_CHAR); // add back on null char

            let newCapacity = new Value(leftChars.length, Int.INT, leftValidLength);
            let newSize = newCapacity.subRaw(1);

            getCapacity(returnObject).writeValue(newCapacity);
            getSize(returnObject).writeValue(newSize);

            // allocate new array with enough space
            allocateNewArray(rt, returnObject, newCapacity.rawValue, leftChars);
        }
    }
);

registerOpaqueExpression(
    "operator+_char_string",
    <OpaqueExpressionImpl<VoidType, "prvalue">> {
        type: VoidType.VOID,
        valueCategory: "prvalue",
        operate: (rt: RuntimeOpaqueExpression<VoidType, "prvalue">) => {
            let returnObject = <CPPObject<CompleteClassType>>rt.containingRuntimeFunction.returnObject;
            assert(returnObject, "String + operator lacking return-by-value object");

            let left = getLocal<Char>(rt, "c");
            let right = getLocal<CompleteClassType>(rt, "str");

                            
            let {charValues: rightChars, validLength: rightValidLength} = extractCharsFromCString(rt, getDataPtr(right).getValue());
            rightChars.unshift(left.getValue())

            let newCapacity = new Value(rightChars.length, Int.INT, rightValidLength);
            let newSize = newCapacity.subRaw(1);

            getCapacity(returnObject).writeValue(newCapacity);
            getSize(returnObject).writeValue(newSize);

            // allocate new array with enough space
            allocateNewArray(rt, returnObject, newCapacity.rawValue, rightChars);
        }
    }
);

function compareStrings(compare: (left: string, right: string) => boolean) {
    return (rt: RuntimeOpaqueExpression<Bool, "prvalue">) => {
        let left = getLocal<CompleteClassType>(rt, "left");
        let right = getLocal<CompleteClassType>(rt, "right");

        // TODO: this doesn't preserve runtime type validity information
        return new Value(compare(extractStringValue(rt, getDataPtr(left).getValue()), extractStringValue(rt, getDataPtr(right).getValue())) ? 1 : 0, Bool.BOOL);
    };
}

function compareStringCstring(compare: (left: string, right: string) => boolean) {
    return (rt: RuntimeOpaqueExpression<Bool, "prvalue">) => {
        let left = getLocal<CompleteClassType>(rt, "left");
        let right = getLocal<PointerType<Char>>(rt, "right");

        // TODO: this doesn't preserve runtime type validity information
        return new Value(compare(extractStringValue(rt, getDataPtr(left).getValue()), extractStringValue(rt, right.getValue())) ? 1 : 0, Bool.BOOL);
    };
}

function compareCstringString(compare: (left: string, right: string) => boolean) {
    return (rt: RuntimeOpaqueExpression<Bool, "prvalue">) => {
        let left = getLocal<PointerType<Char>>(rt, "left");
        let right = getLocal<CompleteClassType>(rt, "right");

        // TODO: this doesn't preserve runtime type validity information
        return new Value(compare(extractStringValue(rt, left.getValue()), extractStringValue(rt, getDataPtr(right).getValue())) ? 1 : 0, Bool.BOOL);
    };
}

registerOpaqueExpression(
    "operator==_string_string",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareStrings((left, right) => left === right)
    }
);

registerOpaqueExpression(
    "operator!=_string_string",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareStrings((left, right) => left !== right)
    }
);

registerOpaqueExpression(
    "operator<_string_string",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareStrings((left, right) => left < right)
    }
);

registerOpaqueExpression(
    "operator<=_string_string",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareStrings((left, right) => left <= right)
    }
);

registerOpaqueExpression(
    "operator>_string_string",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareStrings((left, right) => left > right)
    }
);

registerOpaqueExpression(
    "operator>=_string_string",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareStrings((left, right) => left >= right)
    }
);

registerOpaqueExpression(
    "operator==_string_cstring",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareStringCstring((left, right) => left === right)
    }
);

registerOpaqueExpression(
    "operator!=_string_cstring",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareStringCstring((left, right) => left !== right)
    }
);

registerOpaqueExpression(
    "operator<_string_cstring",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareStringCstring((left, right) => left < right)
    }
);

registerOpaqueExpression(
    "operator<=_string_cstring",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareStringCstring((left, right) => left <= right)
    }
);

registerOpaqueExpression(
    "operator>_string_cstring",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareStringCstring((left, right) => left > right)
    }
);

registerOpaqueExpression(
    "operator>=_string_cstring",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareStringCstring((left, right) => left >= right)
    }
);

registerOpaqueExpression(
    "operator==_cstring_string",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareCstringString((left, right) => left === right)
    }
);

registerOpaqueExpression(
    "operator!=_cstring_string",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareCstringString((left, right) => left !== right)
    }
);

registerOpaqueExpression(
    "operator<_cstring_string",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareCstringString((left, right) => left < right)
    }
);

registerOpaqueExpression(
    "operator<=_cstring_string",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareCstringString((left, right) => left <= right)
    }
);

registerOpaqueExpression(
    "operator>_cstring_string",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareCstringString((left, right) => left > right)
    }
);

registerOpaqueExpression(
    "operator>=_cstring_string",
    <OpaqueExpressionImpl<Bool, "prvalue">> {
        type: Bool.BOOL,
        valueCategory: "prvalue",
        operate: compareCstringString((left, right) => left >= right)
    }
);

registerOpaqueExpression(
    "operator<<_ostream_string",
    <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
        type: lookupTypeInContext("ostream"),
        valueCategory: "lvalue",
        operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
            rt.sim.cout(getDataPtr(getLocal<CompleteClassType>(rt, "str")).getValue());
            return getLocal<CompleteClassType>(rt, "os");
        }
    }
);

registerOpaqueExpression(
    "operator>>_istream_string",
    <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
        type: lookupTypeInContext("istream"),
        valueCategory: "lvalue",
        upNext: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
            if (rt.sim.cin.buffer.length === 0) {
                rt.sim.blockUntilCin();
            }
        },
        operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
            rt.sim.cin.skipws();
            let chars = Char.jsStringToNullTerminatedCharArray(rt.sim.cin.extractWordFromBuffer());

            let str = getLocal<CompleteClassType>(rt, "str");

            rt.sim.memory.heap.deleteObject(getDataPtr(str).getValue().rawValue);
            copyFromCString(rt, str, chars)
            return getLocal<CompleteClassType>(rt, "is");
        }
    }
);

registerOpaqueExpression(
    "getline_istream_string",
    <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
        type: lookupTypeInContext("istream"),
        valueCategory: "lvalue",
        upNext: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
            if (rt.sim.cin.buffer.length === 0) {
                rt.sim.blockUntilCin();
            }
        },
        operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {

            let chars = Char.jsStringToNullTerminatedCharArray(rt.sim.cin.extractLineFromBuffer());

            let str = getLocal<CompleteClassType>(rt, "str");

            rt.sim.memory.heap.deleteObject(getDataPtr(str).getValue().rawValue);
            copyFromCString(rt, str, chars)
            return getLocal<CompleteClassType>(rt, "is");
        }
    }
);


registerOpaqueExpression(
    "string::operator=_string",
    <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
        type: lookupTypeInContext("string"),
        valueCategory: "lvalue",
        operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
            let rec = rt.contextualReceiver;
            let rhs = getLocal<CompleteClassType>(rt, "rhs");
            
            // do nothing if self assignment
            if (rec.address === rhs.address) {
                return rec;
            }

            rt.sim.memory.heap.deleteObject(getDataPtr(rec).getValue().rawValue);
            let {charValues, validLength} = extractCharsFromCString(rt, getDataPtr(rhs).getValue());
            copyFromCString(rt, rec, charValues, validLength);
            return rec;
        }
    }
);

registerOpaqueExpression(
    "string::operator=_cstring",
    <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
        type: lookupTypeInContext("string"),
        valueCategory: "lvalue",
        operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
            let rec = rt.contextualReceiver;
            let cstr = getLocal<PointerType<Char>>(rt, "cstr");

            let oldArrAddr = getDataPtr(rec).getValue().rawValue;
            
            let {charValues, validLength} = extractCharsFromCString(rt, cstr.getValue());
            copyFromCString(rt, rt.contextualReceiver, charValues, validLength);

            rt.sim.memory.heap.deleteObject(oldArrAddr);

            return rt.contextualReceiver;
        }
    }
);

registerOpaqueExpression(
    "string::operator=_char",
    <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
        type: lookupTypeInContext("string"),
        valueCategory: "lvalue",
        operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
            let rec = rt.contextualReceiver;
            let c = getLocal<Char>(rt, "c");
            
            rt.sim.memory.heap.deleteObject(getDataPtr(rec).getValue().rawValue);
            copyFromCString(rt, rt.contextualReceiver, [c.getValue(), Char.NULL_CHAR]);
            return rt.contextualReceiver;
        }
    }
);

registerOpaqueExpression(
    "string::operator+=_string",
    <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
        type: lookupTypeInContext("string"),
        valueCategory: "lvalue",
        operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
            addFromCStrings(rt, rt.contextualReceiver,
                getDataPtr(rt.contextualReceiver).getValue(),
                getDataPtr(getLocal<CompleteClassType>(rt, "rhs")).getValue(), true);
            return rt.contextualReceiver;
        }
    }
);

registerOpaqueExpression(
    "string::operator+=_cstring",
    <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
        type: lookupTypeInContext("string"),
        valueCategory: "lvalue",
        operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
            addFromCStrings(rt, rt.contextualReceiver,
                getDataPtr(rt.contextualReceiver).getValue(),
                getLocal<PointerType<Char>>(rt, "cstr").getValue(), true);
            return rt.contextualReceiver;
        }
    }
);

registerOpaqueExpression(
    "string::operator+=_char",
    <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
        type: lookupTypeInContext("string"),
        valueCategory: "lvalue",
        operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
            let rec = rt.contextualReceiver;
            let c = getLocal<Char>(rt, "c");
            
            let orig = extractCharsFromCString(rt, getDataPtr(rt.contextualReceiver).getValue());
            rt.sim.memory.heap.deleteObject(getDataPtr(rec).getValue().rawValue);
            copyFromCString(rt, rt.contextualReceiver, [...orig.charValues, c.getValue(), Char.NULL_CHAR], orig.validLength);
            return rt.contextualReceiver;
        }
    }
);



registerOpaqueExpression(
    "stoi",
    <OpaqueExpressionImpl<Int, "prvalue">> {
        type: Int.INT,
        valueCategory: "prvalue",
        operate: (rt: RuntimeOpaqueExpression<Int, "prvalue">) => {
            let str = extractStringValue(rt, getDataPtr(getLocal<CompleteClassType>(rt, "str")).getValue());
            let val = parseInt(str);
            if (!Number.isNaN(val)) {
                return new Value(val, Int.INT);
            }
            else {
                return new Value(Math.floor(Math.random()*100), Int.INT, false);
            }
        }
    }
);


registerOpaqueExpression(
    "stod",
    <OpaqueExpressionImpl<Double, "prvalue">> {
        type: Double.DOUBLE,
        valueCategory: "prvalue",
        operate: (rt: RuntimeOpaqueExpression<Double, "prvalue">) => {
            let str = extractStringValue(rt, getDataPtr(getLocal<CompleteClassType>(rt, "str")).getValue());
            let val = parseFloat(str);
            if (!Number.isNaN(val)) {
                return new Value(val, Double.DOUBLE);
            }
            else {
                return new Value(Math.floor(Math.random()*100), Double.DOUBLE, false);
            }
        }
    }
);




function allocateNewArray(rt: RuntimeExpression, rec: CPPObject<CompleteClassType>, newCapacity: number, values: readonly Value<Char>[]) {
    let arrObj = rt.sim.memory.heap.allocateNewObject(new BoundedArrayType(Char.CHAR, newCapacity));
    let arrElems = arrObj.getArrayElemSubobjects();

    values.forEach((val, i) => arrElems[i].writeValue(val));

    // store pointer to new array
    getDataPtr(rec).writeValue(arrElems[0].getPointerTo());
    return arrElems;
}
// var strangAst = {
//     construct_type : "class_declaration",
//     library_id : "strang",
//     head : {
//         bases : null,
//         key : "class",
//         name : {
//             identifier : "strang"
//         }
//     },
//     member_specs : [
//         {
//             access : "public",
//             members : [


//                 // fill ctor
//                 {
//                     construct_type : "constructor_definition",
//                     args : Lobster.cPlusPlusParser.parse("size_t n, char c", {startRule : "argument_declaration_list"}),
//                     initializer : null,
//                     name : { identifier : "strang"},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var n = this.blockScope.requiredLookup("n").runtimeLookup(sim, inst).getValue();
//                             var c = this.blockScope.requiredLookup("c").runtimeLookup(sim, inst).getValue();

//                             var charValuesToCopy = [];
//                             var rawN = n.rawValue();
//                             for(var i = 0; i < rawN; ++i) {
//                                 charValuesToCopy.push(c);
//                             }

//                             // add a null char
//                             charValuesToCopy.push(Value.instance(Types.Char.NULL_CHAR, Types.Char.instance()));

//                             var rec = ReceiverEntity.instance(this.containingFunction().receiverType).runtimeLookup(sim, inst);
//                             rec.getMemberSubobject("_capacity").writeValue(n.plus(1));
//                             rec.getMemberSubobject("_size").writeValue(n);

//                             // deep copy the array
//                             var arrObj = DynamicObject.instance(Types.Array.instance(Types.Char.instance(), charValuesToCopy.length));
//                             sim.memory.heap.allocateNewObject(arrObj);
//                             arrObj.writeValue(charValuesToCopy);

//                             // store pointer to new array
//                             var addr = Value.instance(arrObj.address, Types.ArrayPointer.instance(arrObj));
//                             this.blockScope.requiredLookup("data_ptr").runtimeLookup(sim, inst).writeValue(addr);
//                         }
//                     }, null)
//                 },

//                 // destructor
//                 {
//                     construct_type : "destructor_definition",
//                     name : {identifier: "~strang"},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var rec = ReceiverEntity.instance(this.containingFunction().receiverType).runtimeLookup(sim, inst);
//                             deleteHeapArray(sim, inst, rec.getMemberSubobject("data_ptr"));
//                         }
//                     }, null)
//                 },

//                 // Copy assignment operator
//                 {
//                     construct_type : "function_definition",
//                     declarator : Lobster.cPlusPlusParser.parse("&operator=(const strang &rhs)", {startRule : "declarator"}),
//                     specs : {storageSpecs : [], typeSpecs : ["strang"]},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var rec = ReceiverEntity.instance(this.containingFunction().receiverType).runtimeLookup(sim, inst);
//                             var rhs = this.blockScope.requiredLookup("rhs").runtimeLookup(sim, inst);

//                             // check for self-assignment, where we just do nothing
//                             if (rec.address == rhs.address) {
//                                 var retType = this.containingFunction().type.returnType;
//                                 var re = ReturnEntity.instance(retType);
//                                 re.runtimeLookup(sim, inst).bindTo(rec);
//                                 return;
//                             }

//                             // delete old array
//                             deleteHeapArray(sim, inst, rec.getMemberSubobject("data_ptr"));

//                             var newSize = rhs.getMemberSubobject("_size").getValue();
//                             var newCapacity = newSize.plus(1);

//                             // copy regular members
//                             rec.getMemberSubobject("_capacity").writeValue(newCapacity);
//                             rec.getMemberSubobject("_size").writeValue(newSize);

//                             // deep copy the array
//                             var arrObj = DynamicObject.instance(Types.Array.instance(Types.Char.instance(), newCapacity));
//                             sim.memory.heap.allocateNewObject(arrObj);
//                             var otherArrValue = rhs.getMemberSubobject("data_ptr").type.arrObj.getValue();
//                             otherArrValue.setRawValue(otherArrValue.rawValue().slice(0, newCapacity));
//                             arrObj.writeValue(otherArrValue);

//                             // store pointer to new array
//                             var addr = Value.instance(arrObj.address, Types.ArrayPointer.instance(arrObj));
//                             this.blockScope.requiredLookup("data_ptr").runtimeLookup(sim, inst).writeValue(addr);

//                             var re = ReturnEntity.instance(this.containingFunction().type.returnType);
//                             re.runtimeLookup(sim, inst).bindTo(rec);
//                         }
//                     }, null)
//                 },

//                 // cstring assignment operator
//                 {
//                     construct_type : "function_definition",
//                     declarator : Lobster.cPlusPlusParser.parse("&operator=(const char *cstr)", {startRule : "declarator"}),
//                     specs : {storageSpecs : [], typeSpecs : ["strang"]},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {

//                             var rec = ReceiverEntity.instance(this.containingFunction().receiverType).runtimeLookup(sim, inst);

//                             // delete old array
//                             deleteHeapArray(sim, inst, rec.getMemberSubobject("data_ptr"));

//                             var ptrValue = this.blockScope.requiredLookup("cstr").runtimeLookup(sim, inst).getValue();
//                             copyFromCString.call(this, sim, inst, ptrValue);

//                             var re = ReturnEntity.instance(this.containingFunction().type.returnType);
//                             re.runtimeLookup(sim, inst).bindTo(rec);
//                         }
//                     }, null)
//                 },

//                 // single char assignment operator
//                 {
//                     construct_type : "function_definition",
//                     declarator : Lobster.cPlusPlusParser.parse("&operator=(char c)", {startRule : "declarator"}),
//                     specs : {storageSpecs : [], typeSpecs : ["strang"]},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {

//                             replaceStrangArrayWith.call(this, sim, inst, [this.blockScope.requiredLookup("c").runtimeLookup(sim, inst).getValue()]);

//                             var rec = ReceiverEntity.instance(this.containingFunction().receiverType).runtimeLookup(sim, inst);
//                             var re = ReturnEntity.instance(this.containingFunction().type.returnType);
//                             re.runtimeLookup(sim, inst).bindTo(rec);
//                         }
//                     }, null)
//                 },

//                 // Iterator functions - unsupported
//                 mixin(Lobster.cPlusPlusParser.parse("void begin();", {startRule: "member_declaration"}),
//                     {library_unsupported : true}),
//                 mixin(Lobster.cPlusPlusParser.parse("void end();", {startRule: "member_declaration"}),
//                     {library_unsupported : true}),
//                 mixin(Lobster.cPlusPlusParser.parse("void rbegin();", {startRule: "member_declaration"}),
//                     {library_unsupported : true}),
//                 mixin(Lobster.cPlusPlusParser.parse("void rend();", {startRule: "member_declaration"}),
//                     {library_unsupported : true}),
//                 mixin(Lobster.cPlusPlusParser.parse("void cbegin() const;", {startRule: "member_declaration"}),
//                     {library_unsupported : true}),
//                 mixin(Lobster.cPlusPlusParser.parse("void cend() const;", {startRule: "member_declaration"}),
//                     {library_unsupported : true}),
//                 mixin(Lobster.cPlusPlusParser.parse("void crbegin() const;", {startRule: "member_declaration"}),
//                     {library_unsupported : true}),
//                 mixin(Lobster.cPlusPlusParser.parse("void crend() const;", {startRule: "member_declaration"}),
//                     {library_unsupported : true}),

//                 // function size()
//                 {
//                     construct_type : "function_definition",
//                     declarator : Lobster.cPlusPlusParser.parse("size() const", {startRule : "declarator"}),
//                     specs : {storageSpecs : [], typeSpecs : ["size_t"]},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var size = this.blockScope.requiredLookup("_size").runtimeLookup(sim, inst);
//                             var returnObject = this.containingFunction().getReturnObject(sim, inst.containingRuntimeFunction());
//                             returnObject.writeValue(size);
//                         }
//                     }, null)
//                 },

//                 // function length()
//                 {
//                     construct_type : "function_definition",
//                     declarator : Lobster.cPlusPlusParser.parse("length() const", {startRule : "declarator"}),
//                     specs : {storageSpecs : [], typeSpecs : ["size_t"]},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var size = this.blockScope.requiredLookup("_size").runtimeLookup(sim, inst);
//                             var returnObject = this.containingFunction().getReturnObject(sim, inst.containingRuntimeFunction());
//                             returnObject.writeValue(size);
//                         }
//                     }, null)
//                 },

//                 // function max_size() - unsupported
//                 mixin(Lobster.cPlusPlusParser.parse("size_t max_size() const;", {startRule: "member_declaration"}),
//                     {library_unsupported : true}),

//                 // function resize(size_t n, char c)
//                 {
//                     construct_type : "function_definition",
//                     declarator : Lobster.cPlusPlusParser.parse("resize(size_t n, char c)", {startRule : "declarator"}),
//                     specs : {storageSpecs : [], typeSpecs : ["void"]},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var n = this.blockScope.requiredLookup("n").runtimeLookup(sim, inst).getValue();
//                             var c = this.blockScope.requiredLookup("c").runtimeLookup(sim, inst);
//                             resizeStrang.call(this, sim, inst, n, c);
//                         }
//                     }, null)
//                 },


//                 // function resize(size_t n)
//                 {
//                     construct_type : "function_definition",
//                     declarator : Lobster.cPlusPlusParser.parse("resize(size_t n)", {startRule : "declarator"}),
//                     specs : {storageSpecs : [], typeSpecs : ["void"]},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var n = this.blockScope.requiredLookup("n").runtimeLookup(sim, inst).getValue();
//                             resizeStrang.call(this, sim, inst, n, Types.Char.NULL_CHAR);
//                         }
//                     }, null)
//                 },

//                 // function capacity()
//                 {
//                     construct_type : "function_definition",
//                     declarator : Lobster.cPlusPlusParser.parse("capacity() const", {startRule : "declarator"}),
//                     specs : {storageSpecs : [], typeSpecs : ["size_t"]},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var size = this.blockScope.requiredLookup("_capacity").runtimeLookup(sim, inst);
//                             var returnObject = this.containingFunction().getReturnObject(sim, inst.containingRuntimeFunction());
//                             returnObject.writeValue(size);
//                         }
//                     }, null)
//                 },

//                 // function reserve() - unsupported
//                 mixin(Lobster.cPlusPlusParser.parse("void reserve();", {startRule: "member_declaration"}),
//                     {library_unsupported : true}),
//                 mixin(Lobster.cPlusPlusParser.parse("void reserve(size_t n);", {startRule: "member_declaration"}),
//                     {library_unsupported : true}),

//                 // function clear()
//                 {
//                     construct_type : "function_definition",
//                     declarator : Lobster.cPlusPlusParser.parse("clear()", {startRule : "declarator"}),
//                     specs : {storageSpecs : [], typeSpecs : ["void"]},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             replaceStrangArrayWith.call(this, sim, inst, []);
//                         }
//                     }, null)
//                 },

//                 // function empty()
//                 {
//                     construct_type : "function_definition",
//                     declarator : Lobster.cPlusPlusParser.parse("empty() const", {startRule : "declarator"}),
//                     specs : {storageSpecs : [], typeSpecs : ["bool"]},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var size = this.blockScope.requiredLookup("_size").runtimeLookup(sim, inst).getValue();
//                             var returnObject = this.containingFunction().getReturnObject(sim, inst.containingRuntimeFunction());
//                             returnObject.writeValue(size.equals(0));
//                         }
//                     }, null)
//                 },

//                 // function shrink_to_fit() - unsupported
//                 mixin(Lobster.cPlusPlusParser.parse("void shrink_to_fit();", {startRule: "member_declaration"}),
//                     {library_unsupported : true}),

//                 // function operator[] non-const
//                 {
//                     construct_type : "function_definition",
//                     declarator : Lobster.cPlusPlusParser.parse("&operator[](size_t pos)", {startRule : "declarator"}),
//                     specs : {storageSpecs : [], typeSpecs : ["char"]},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var ptr = this.blockScope.requiredLookup("data_ptr").runtimeLookup(sim, inst).getValue();
//                             var pos = this.blockScope.requiredLookup("pos").runtimeLookup(sim, inst);
//                             ptr.setRawValue(ptr.rawValue() + pos.rawValue() * ptr.type.ptrTo.size);

//                             if (!ptr.isValueValid()) {
//                                 sim.undefinedBehavior("It looks like the position you requested is out of bounds for that string. The character reference you got back just refers to memory junk somewhere!");
//                             }

//                             var obj = sim.memory.dereference(ptr);

//                             var returnRef = ReturnEntity.instance(this.containingFunction().type.returnType).runtimeLookup(sim, inst);
//                             returnRef.bindTo(obj);


//                         }
//                     }, null)
//                 },

//                 // function operator[] const
//                 {
//                     construct_type : "function_definition",
//                     declarator : Lobster.cPlusPlusParser.parse("&operator[](size_t pos) const", {startRule : "declarator"}),
//                     specs : {storageSpecs : [], typeSpecs : ["const", "char"]},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var ptr = this.blockScope.requiredLookup("data_ptr").runtimeLookup(sim, inst).getValue();
//                             var pos = this.blockScope.requiredLookup("pos").runtimeLookup(sim, inst);
//                             ptr.setRawValue(ptr.rawValue() + pos.rawValue() * ptr.type.ptrTo.size);

//                             if (!ptr.isValueValid()) {
//                                 sim.undefinedBehavior("It looks like the position you requested is out of bounds for that string. The character reference you got back just refers to memory junk somewhere!");
//                             }

//                             var obj = sim.memory.dereference(ptr);

//                             var returnRef = ReturnEntity.instance(this.containingFunction().type.returnType).runtimeLookup(sim, inst);
//                             returnRef.bindTo(obj);


//                         }
//                     }, null)
//                 },

//                 // function at() non-const
//                 {
//                     construct_type : "function_definition",
//                     declarator : Lobster.cPlusPlusParser.parse("&at(size_t pos)", {startRule : "declarator"}),
//                     specs : {storageSpecs : [], typeSpecs : ["char"]},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var ptr = this.blockScope.requiredLookup("data_ptr").runtimeLookup(sim, inst).getValue();
//                             var pos = this.blockScope.requiredLookup("pos").runtimeLookup(sim, inst);
//                             ptr.setRawValue(ptr.rawValue() + pos.rawValue() * ptr.type.ptrTo.size);

//                             if (!ptr.isValueValid()) {
//                                 sim.undefinedBehavior("It looks like the position you requested is out of bounds for that string. The character reference you got back just refers to memory junk somewhere!");
//                             }

//                             var obj = sim.memory.dereference(ptr);

//                             var returnRef = ReturnEntity.instance(this.containingFunction().type.returnType).runtimeLookup(sim, inst);
//                             returnRef.bindTo(obj);


//                         }
//                     }, null)
//                 },

//                 // function at() const
//                 {
//                     construct_type : "function_definition",
//                     declarator : Lobster.cPlusPlusParser.parse("&at(size_t pos) const", {startRule : "declarator"}),
//                     specs : {storageSpecs : [], typeSpecs : ["const", "char"]},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var ptr = this.blockScope.requiredLookup("data_ptr").runtimeLookup(sim, inst).getValue();
//                             var pos = this.blockScope.requiredLookup("pos").runtimeLookup(sim, inst);
//                             ptr.setRawValue(ptr.rawValue() + pos.rawValue() * ptr.type.ptrTo.size);

//                             if (!ptr.isValueValid()) {
//                                 sim.undefinedBehavior("It looks like the position you requested is out of bounds for that string. The character reference you got back just refers to memory junk somewhere!");
//                             }

//                             var obj = sim.memory.dereference(ptr);

//                             var returnRef = ReturnEntity.instance(this.containingFunction().type.returnType).runtimeLookup(sim, inst);
//                             returnRef.bindTo(obj);


//                         }
//                     }, null)
//                 },

//                 // function front() non-const
//                 {
//                     construct_type : "function_definition",
//                     declarator : Lobster.cPlusPlusParser.parse("&front()", {startRule : "declarator"}),
//                     specs : {storageSpecs : [], typeSpecs : ["char"]},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var ptr = this.blockScope.requiredLookup("data_ptr").runtimeLookup(sim, inst).getValue();

//                             if (!ptr.isValueValid()) {
//                                 sim.undefinedBehavior("It looks like the position you requested is out of bounds for that string. The character reference you got back just refers to memory junk somewhere!");
//                             }

//                             var obj = sim.memory.dereference(ptr);

//                             var returnRef = ReturnEntity.instance(this.containingFunction().type.returnType).runtimeLookup(sim, inst);
//                             returnRef.bindTo(obj);


//                         }
//                     }, null)
//                 },

//                 // function front() const
//                 {
//                     construct_type : "function_definition",
//                     declarator : Lobster.cPlusPlusParser.parse("&at(size_t pos) const", {startRule : "declarator"}),
//                     specs : {storageSpecs : [], typeSpecs : ["const", "char"]},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var ptr = this.blockScope.requiredLookup("data_ptr").runtimeLookup(sim, inst).getValue();
//                             var pos = this.blockScope.requiredLookup("pos").runtimeLookup(sim, inst);
//                             ptr.setRawValue(ptr.rawValue() + pos.rawValue() * ptr.type.ptrTo.size);

//                             if (!ptr.isValueValid()) {
//                                 sim.undefinedBehavior("It looks like the position you requested is out of bounds for that string. The character reference you got back just refers to memory junk somewhere!");
//                             }

//                             var obj = sim.memory.dereference(ptr);

//                             var returnRef = ReturnEntity.instance(this.containingFunction().type.returnType).runtimeLookup(sim, inst);
//                             returnRef.bindTo(obj);


//                         }
//                     }, null)
//                 }
//             ]
//         }
//     ]
// };

// var strangDefinition = ClassDeclaration.instance(strangAst, {
//     parent: null,
//     scope : this.i_globalScope,
//     translationUnit : this,
//     func: globalFunctionContext
// });
// strangDefinition.tryCompileDeclaration();
// strangDefinition.tryCompileDefinition();
// this.topLevelDeclarations.push(strangDefinition);
// this.addNotes(strangDefinition.getNotes());
// strangDefinition.classTypeClass.valueToString = function() {

// };
// strangDefinition.classTypeClass.isValueValid = function() {
//     return false;
// };