// var copyFromCString = function(sim: Simulation, rtConstruct: RuntimeConstruct, ptrValue) {
//     if (Types.Pointer.isNull(ptrValue.rawValue())) {
//         sim.undefinedBehavior("Oops, the char* you're using passed to the string constructor was null. This results in undefined behavior.");
//         return;
//     }

import { registerLibraryHeader, SourceFile } from "../core/Program";
import { MemberSubobject, CPPObject } from "../core/objects";
import { Int, Char, PointerType, BoundedArrayType, CompleteObjectType, ReferenceType, CompleteClassType, ArrayPointerType, Size_t, VoidType } from "../core/types";
import { runtimeObjectLookup, VariableEntity, LocalVariableEntity, LocalObjectEntity, LocalReferenceEntity } from "../core/entities";
import { Value } from "../core/runtimeEnvironment";
import { SimulationEvent } from "../core/Simulation";
import { registerOpaqueExpression, RuntimeOpaqueExpression, OpaqueExpressionImpl } from "../core/opaqueExpression";

//     var charValuesToCopy = [];
//     var outOfBounds = false;
//     var seenInvalidChar = false;

//     var c = sim.memory.dereference(ptrValue).getValue();
//     // Copy in-bounds characters until null char
//     while (ptrValue.isValueDereferenceable() && !Types.Char.isNullChar(c.rawValue())) {
//         if (!c.isValueValid()) {
//             seenInvalidChar = true;
//         }
//         charValuesToCopy.push(seenInvalidChar ? c.invalidate() : c);
//         ptrValue = ptrValue.plus(ptrValue.type.ptrTo.size);
//         c = sim.memory.dereference(ptrValue).getValue();
//     }

//     if (!ptrValue.isValueDereferenceable()) {
//         // We stopped previously because the pointer was no longer safely dereferenceable, so
//         // now we'll go ahead and let the pointer keep going, but stop it after a while to prevent
//         // an infinite loop.
//         outOfBounds = true;
//         var count = 0;
//         var limit = 100;
//         while (count < limit && !Types.Char.isNullChar(c.rawValue())) {
//             // invalidate c here since even if was a valid char value, the fact we got this particular
//             // value is a coincidence because we were off the end of an arary in no man's land
//             charValuesToCopy.push(c.invalidate());
//             ptrValue = ptrValue.plus(ptrValue.type.ptrTo.size);
//             c = sim.memory.dereference(ptrValue).getValue();
//             ++count;
//         }

//         if (!isA(ptrValue.type, Types.ArrayPointer)) {
//             if (count === limit) {
//                 sim.undefinedBehavior("This string constructor expects the char* you give it to be pointing into an array, otherwise you get undefined behavior with the pointer running off through random memory. I let it go for a while, but stopped it after copying " + limit + " junk values.");
//             }
//             else if (count > 0) {
//                 sim.undefinedBehavior("This string constructor expects the char* you give it to be pointing into an array, otherwise you get undefined behavior with the pointer running off through random memory. It looks like it happened to hit a null byte in memory and stopped " + count + " characters past the end of the array.");
//             }
//             else {
//                 sim.undefinedBehavior("This string constructor expects the char* you give it to be pointing into an array, otherwise you get undefined behavior with the pointer running off through random memory. Somehow you got lucky and the first random thing it hit was a null byte, which stopped it. Don't count on this.");
//             }
//         }
//         else {
//             if (count === limit) {
//                 sim.undefinedBehavior("This string constructor was trying to read from an array through the char* you gave it, but it ran off the end of the array before finding a null character! I let it run through memory for a while, but stopped it after copying " + limit + " junk values.");
//             }
//             else if (count > 0) {
//                 sim.undefinedBehavior("This string constructor was trying to read from an array through the char* you gave it, but it ran off the end of the array before finding a null character! It looks like it happened to hit a null byte in memory and stopped " + count + " characters past the end of the array.");
//             }
//             else {
//                 sim.undefinedBehavior("This string constructor was trying to read from an array through the char* you gave it, but it ran off the end of the array before finding a null character! Somehow you got lucky and the first random thing it hit was a null byte, which stopped it. Don't count on this.");
//             }
//         }
//     }
//     else {
//         if (!isA(ptrValue.type, Types.ArrayPointer)) {
//             sim.undefinedBehavior("This string constructor expects the char* you give it to be pointing into an array. That doesn't appear to be the case here, which can lead to undefined behavior.");
//         }
//     }

//     // Use the null char we found or a synthetic (invalid) one for the last thing to copy
//     if (!outOfBounds && Types.Char.isNullChar(c.rawValue())) {
//         charValuesToCopy.push(c);
//     }
//     else {
//         charValuesToCopy.push(Value.instance(Types.Char.NULL_CHAR, Types.Char.instance(), {invalid: true}));
//     }

//     var rec = ReceiverEntity.instance(this.containingFunction().receiverType).runtimeLookup(sim, inst);
//     rec.getMemberSubobject("_capacity").writeValue(charValuesToCopy.length);
//     rec.getMemberSubobject("_size").writeValue(charValuesToCopy.length-1);

//     // If something was uncertain that could have affected the length, invalidate capacity/size
//     if (seenInvalidChar || outOfBounds) {
//         rec.getMemberSubobject("_capacity").invalidate();
//         rec.getMemberSubobject("_size").invalidate();
//     }

//     // deep copy the array
//     var arrObj = DynamicObject.instance(Types.Array.instance(Types.Char.instance(), charValuesToCopy.length));
//     sim.memory.heap.allocateNewObject(arrObj);
//     arrObj.writeValue(charValuesToCopy);

//     // store pointer to new array
//     var addr = Value.instance(arrObj.address, Types.ArrayPointer.instance(arrObj));
//     this.blockScope.requiredLookup("data_ptr").runtimeLookup(sim, inst).writeValue(addr);
// };

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
`class string {
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

    string(const string &other, size_t pos, size_t len) {
        @string::string_substring_1;
    }

    string(const string &other, size_t pos) {
        @string::string_substring_2;
    }

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

    // string &operator=(const string &rhs) {
    //     @string::operator=_copy;
    // }

    // string &operator=(&operator=(const char *cstr)) {
    //     @string::operator=_cstring;
    // }

    // string &operator=(&operator=(char c)) {
    //     @string::operator=_char;
    // }

    // void begin() @library_unsupported;
    // void end() @library_unsupported;
    // void rbegin() @library_unsupported;
    // void rend() @library_unsupported;
    // void cbegin() const @library_unsupported;
    // void cend() const @library_unsupported;
    // void crbegin() const @library_unsupported;
    // void crend() const @library_unsupported;

    size_t size() const {
        @string::size;
    }

    size_t length() const {
        @string::length;
    }
    
    // size_t max_size() const @library_unsupported;

    void resize(size_t n, char c) {
        @string::resize_1;
    }

    void resize(size_t n) {
        @string::resize_2;
    }

    size_t capacity() const {
        @string::capacity;
    }

    // void reserve() @library_unsupported;
    // void reserve(size_t n) @library_unsupported;

    void clear() {
        @string::clear;
    }

    bool empty() const {
        @string::empty;
    }

    // void shrink_to_fit() @library_unsupported;

    char &operator[](size_t pos) {
        @string::operator[];
    }

    const char &operator[](size_t pos) const {
        @string::operator[]_const;
    }

    char &at(size_t pos) {
        @string::at;
    }

    const char &at(size_t pos) const {
        @string::at_const;
    }

    char &front(size_t pos) {
        @string::front;
    }

    const char &front(size_t pos) const {
        @string::front_const;
    }
};`
    )
);


function getCapacity(obj: CPPObject<CompleteClassType>) {
    return <MemberSubobject<Int>>obj.getMemberObject("_capacity");
}

function getSize(obj: CPPObject<CompleteClassType>) {
    return <MemberSubobject<Int>>obj.getMemberObject("_capacity");
}

function getDataPtr(obj: CPPObject<CompleteClassType>) {
    return <MemberSubobject<ArrayPointerType<Char>>>obj.getMemberObject("_capacity");
}

function getLocal<T extends CompleteObjectType>(rt: RuntimeOpaqueExpression, name: string) {
    let local = <LocalObjectEntity<T> | LocalReferenceEntity<ReferenceType<T>>>rt.model.context.contextualScope.lookup(name);
    if(local.variableKind === "object") {
        return local.runtimeLookup(rt);
    }
    else {
        return local.runtimeLookup(rt);
    }
}

registerOpaqueExpression("string::string_default", (rt: RuntimeOpaqueExpression) => {
    getCapacity(rt.contextualReceiver).writeValue(new Value(initialStrangCapacity, Int.INT));
    getSize(rt.contextualReceiver).writeValue(new Value(0, Int.INT));

    let obj = rt.sim.memory.heap.allocateNewObject(new BoundedArrayType(Char.CHAR, initialStrangCapacity));
    getDataPtr(rt.contextualReceiver).writeValue(obj.getArrayElemSubobject(0).getPointerTo());
});

registerOpaqueExpression("string::string_copy", (rt: RuntimeOpaqueExpression) => {

    let rec = rt.contextualReceiver;
    let other = getLocal<CompleteClassType>(rt, "other");
    let newSize = getSize(other).getValue();
    let newCapacity = newSize.add(1);

    // copy regular members
    getCapacity(rec).writeValue(newCapacity);
    getSize(rec).writeValue(newSize);

    // deep copy the array
    let arrObj = rt.sim.memory.heap.allocateNewObject(new BoundedArrayType(Char.CHAR, newCapacity.rawValue));
    let arrElems = arrObj.getArrayElemSubobjects();
    let otherArrElems = getDataPtr(other).type.arrayObject.getArrayElemSubobjects();

    arrElems.forEach((arrElem, i) => arrElem.writeValue(otherArrElems[i].getValue()))

    // store pointer to new array
    getDataPtr(rec).writeValue(arrElems[0].getPointerTo());
});

registerOpaqueExpression("string::string_substring_1", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::string_substring_2", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::string_cstring", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::string_cstring_n", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::string_fill", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::~string", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::operator=_copy", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::operator=_cstring", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::operator=_char", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::size", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::length", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::resize_", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::resize_", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::capacity", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::clear", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::empty", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::operator[]", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::operator[]_const", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::at", {
    type: Char.CHAR,
    valueCategory: "lvalue",
    operate: (rt: RuntimeOpaqueExpression) => {
        let ptr = getDataPtr(rt.contextualReceiver).getValue();
        let pos = getLocal<Int>(rt, "pos").getValue();
        ptr = ptr.pointerOffset(pos);

        if (!ptr.isValid) {
            rt.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "It looks like the position you requested is out of bounds for that string. The character reference you got back just refers to memory junk somewhere!");
        }

        return rt.sim.memory.dereference(ptr);
    }
});

registerOpaqueExpression("string::at_const", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::front", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});

registerOpaqueExpression("string::front_const", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {

    }
});



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

//                 // Default ctor
//                 {
//                     construct_type : "constructor_definition",
//                     args : [],
//                     initializer : null,
//                     name : { identifier : "strang"},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             this.blockScope.requiredLookup("_capacity").runtimeLookup(sim, inst).writeValue(initialStrangCapacity);
//                             this.blockScope.requiredLookup("_size").runtimeLookup(sim, inst).writeValue(0);


//                             var arrType = Types.Array.instance(Types.Char.instance(), initialStrangCapacity);
//                             var arrObj = DynamicObject.instance(arrType);
//                             sim.memory.heap.allocateNewObject(arrObj);

//                             var addr = Value.instance(arrObj.address, Types.ArrayPointer.instance(arrObj));
//                             this.blockScope.requiredLookup("data_ptr").runtimeLookup(sim, inst).writeValue(addr);
//                         }
//                     }, null)
//                 },

//                 // Copy ctor
//                 {
//                     construct_type : "constructor_definition",
//                     args : Lobster.cPlusPlusParser.parse("const strang &other", {startRule : "argument_declaration_list"}),
//                     initializer : null,
//                     name : { identifier : "strang"},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                         }
//                     }, null)
//                 },

//                 // Substring ctor (with 3rd argument provided)
//                 {
//                     construct_type : "constructor_definition",
//                     args : Lobster.cPlusPlusParser.parse("const strang &other, size_t pos, size_t len", {startRule : "argument_declaration_list"}),
//                     initializer : null,
//                     name : { identifier : "strang"},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {

//                             var rec = ReceiverEntity.instance(this.containingFunction().receiverType).runtimeLookup(sim, inst);
//                             var other = this.blockScope.requiredLookup("other").runtimeLookup(sim, inst);

//                             var len = this.blockScope.requiredLookup("len").runtimeLookup(sim, inst).getValue();
//                             var rawPos = this.blockScope.requiredLookup("pos").runtimeLookup(sim, inst).rawValue();

//                             var newCapacity = len.plus(1);
//                             var otherArrValue = other.getMemberSubobject("data_ptr").type.arrObj.getValue();

//                             if (rawPos > otherArrValue.length) {
//                                 sim.exception("The start position you requested in this string constructor is greater than the length of the other string.");
//                             }
//                             else {
//                                 // copy regular members
//                                 rec.getMemberSubobject("_capacity").writeValue(newCapacity);
//                                 rec.getMemberSubobject("_size").writeValue(len);

//                                 // deep copy the array
//                                 var arrObj = DynamicObject.instance(Types.Array.instance(Types.Char.instance(), newCapacity));
//                                 sim.memory.heap.allocateNewObject(arrObj);
//                                 otherArrValue.setRawValue(otherArrValue.rawValue().slice(rawPos, rawPos + newCapacity.rawValue()));
//                                 arrObj.writeValue(otherArrValue);

//                                 // store pointer to new array
//                                 var addr = Value.instance(arrObj.address, Types.ArrayPointer.instance(arrObj));
//                                 this.blockScope.requiredLookup("data_ptr").runtimeLookup(sim, inst).writeValue(addr);
//                             }
//                         }
//                     }, null)
//                 },

//                 // Substring ctor (without 3rd argument, so use default)
//                 {
//                     construct_type : "constructor_definition",
//                     args : Lobster.cPlusPlusParser.parse("const strang &other, size_t pos", {startRule : "argument_declaration_list"}),
//                     initializer : null,
//                     name : { identifier : "strang"},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var rec = ReceiverEntity.instance(this.containingFunction().receiverType).runtimeLookup(sim, inst);
//                             var other = this.blockScope.requiredLookup("other").runtimeLookup(sim, inst);

//                             var rawPos = this.blockScope.requiredLookup("pos").runtimeLookup(sim, inst).rawValue();

//                             var newCapacity = other.getMemberSubobject("_capacity").getValue().minus(rawPos);
//                             var otherArrValue = other.getMemberSubobject("data_ptr").type.arrObj.getValue();

//                             if (rawPos > otherArrValue.length) {
//                                 sim.exception("The start position you requested in this string constructor is greater than the length of the other string.");
//                             }
//                             else {
//                                 // copy regular members
//                                 rec.getMemberSubobject("_capacity").writeValue(newCapacity);
//                                 rec.getMemberSubobject("_size").writeValue(newCapacity.minus(1));

//                                 // deep copy the array
//                                 var arrObj = DynamicObject.instance(Types.Array.instance(Types.Char.instance(), newCapacity));
//                                 sim.memory.heap.allocateNewObject(arrObj);
//                                 otherArrValue.setRawValue(otherArrValue.rawValue().slice(rawPos, rawPos + newCapacity.rawValue()));
//                                 arrObj.writeValue(otherArrValue);

//                                 // store pointer to new array
//                                 var addr = Value.instance(arrObj.address, Types.ArrayPointer.instance(arrObj));
//                                 this.blockScope.requiredLookup("data_ptr").runtimeLookup(sim, inst).writeValue(addr);
//                             }
//                         }
//                     }, null)
//                 },


//                 // ctor from cstring
//                 {
//                     construct_type : "constructor_definition",
//                     args : Lobster.cPlusPlusParser.parse("const char *cstr", {startRule : "argument_declaration_list"}),
//                     initializer : null,
//                     name : { identifier : "strang"},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var ptrValue = this.blockScope.requiredLookup("cstr").runtimeLookup(sim, inst).getValue();
//                             copyFromCString.call(this, sim, inst, ptrValue);

//                         }
//                     }, null)
//                 },

//                 // ctor from cstring with n
//                 {
//                     construct_type : "constructor_definition",
//                     args : Lobster.cPlusPlusParser.parse("const char *cstr, size_t n", {startRule : "argument_declaration_list"}),
//                     initializer : null,
//                     name : { identifier : "strang"},
//                     body : Statements.OpaqueFunctionBodyBlock.instance({
//                         effects : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//                             var ptrValue = this.blockScope.requiredLookup("cstr").runtimeLookup(sim, inst).getValue();
//                             var n = this.blockScope.requiredLookup("n").runtimeLookup(sim, inst).getValue();
//                             var numToCopy = n.rawValue();

//                             if (Types.Pointer.isNull(ptrValue.rawValue())) {
//                                 sim.undefinedBehavior("Oops, the char* you passed to the string constructor was null. This results in undefined behavior.");
//                                 return;
//                             }

//                             var invalidSize = !n.isValueValid();

//                             var charValuesToCopy = [];
//                             var outOfBounds = false;

//                             var c = sim.memory.dereference(ptrValue).getValue();
//                             while (numToCopy > 0) {
//                                 if (!ptrValue.isValueDereferenceable()) {
//                                     outOfBounds = true;
//                                     break; // break and go to second loop that copies all chars as invalid
//                                 }
//                                 charValuesToCopy.push(c);
//                                 ptrValue = ptrValue.plus(ptrValue.type.ptrTo.size);
//                                 c = sim.memory.dereference(ptrValue).getValue();
//                                 --numToCopy;
//                             }

//                             while (numToCopy > 0) {
//                                 charValuesToCopy.push(c.invalidate());
//                                 ptrValue = ptrValue.plus(ptrValue.type.ptrTo.size);
//                                 c = sim.memory.dereference(ptrValue).getValue();
//                                 --numToCopy;
//                             }

//                             // add a null char
//                             charValuesToCopy.push(Value.instance(Types.Char.NULL_CHAR, Types.Char.instance()));

//                             if (outOfBounds) {
//                                 if (!isA(ptrValue.type, Types.ArrayPointer)) {
//                                     sim.undefinedBehavior("You passed a pointer to a single character (rather than an array) to this string constructor, but also asked for more than one char to be copied, which means some memory junk was used to initialize the string.");
//                                 }
//                                 else{
//                                     sim.undefinedBehavior("You asked for more characters to be copied than were in the original source array, which means some memory junk was used to initialize the string.");
//                                 }
//                             }

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