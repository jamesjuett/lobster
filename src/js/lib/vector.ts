import { registerLibraryHeader, SourceFile } from '../core/Program';
import { MemberSubobject, CPPObject } from '../core/objects';
import {
  Int,
  Char,
  PointerType,
  BoundedArrayType,
  CompleteObjectType,
  ReferenceType,
  CompleteClassType,
  ArrayPointerType,
  Size_t,
  VoidType,
  PotentiallyCompleteClassType,
  Bool,
  isArrayPointerType,
  Double,
  ArrayElemType,
  AtomicType,
  ArithmeticType,
} from '../core/types';
import {
  runtimeObjectLookup,
  VariableEntity,
  LocalVariableEntity,
  LocalObjectEntity,
  LocalReferenceEntity,
} from '../core/entities';
import { Value } from '../core/runtimeEnvironment';
import { SimulationEvent } from '../core/Simulation';
import {
  registerOpaqueExpression,
  RuntimeOpaqueExpression,
  OpaqueExpressionImpl,
  lookupTypeInContext,
  getLocal,
} from '../core/opaqueExpression';
import { ExpressionContext, isClassContext } from '../core/constructs';
import { assert } from '../util/util';
import { Expression, RuntimeExpression } from '../core/expressionBase';
import { nth } from 'lodash';

const initialVectorCapacity = 4;

function instantiateVectorTemplate(element_type: string) {
  return `class vector<${element_type}> {
private:
    size_t _size;
    size_t _capacity;
    ${element_type}* data_ptr;
public:
    vector() : _size(0), _capacity(${initialVectorCapacity}) {
        @vector::vector_default;
    }
    
    vector(size_t n) : _size(n) {
        @vector::vector_int;
    }
    
    vector(size_t n, ${element_type} val) : _size(n) {
        @vector::vector_int_elt;
    }
    
    vector(initializer_list<${element_type}> elts) {
        @vector::vector_initializer_list;
    }

    vector(const vector<${element_type}> &other) {
        @vector::vector_copy;
    }

    ~vector<${element_type}>() {
        @vector::~vector;
    }

    vector<${element_type}> &operator=(const vector<${element_type}> &rhs) {
        return @vector::operator=_vector;
    }

    size_t size() const {
        return _size;
    }
   
    void clear() {
        @vector::clear;
    }

    bool empty() const {
        return _size == 0;
    }

    void push_back(${element_type} val) {
        @vector::push_back;
    }

    void pop_back() {
        @vector::pop_back;
    }

    ${element_type} &operator[](size_t pos) {
        return data_ptr[pos];
    }

    const ${element_type} &operator[](size_t pos) const {
        return data_ptr[pos];
    }

    ${element_type} &at(size_t pos) {
        return data_ptr[pos];
    }

    const ${element_type} &at(size_t pos) const {
        return data_ptr[pos];
    }

    ${element_type} &front(size_t pos) {
        return data_ptr[0];
    }

    const ${element_type} &front(size_t pos) const {
        return data_ptr[0];
    }

    ${element_type} &back(size_t pos) {
        return data_ptr[_size-1];
    }

    const ${element_type} &back(size_t pos) const {
        return data_ptr[_size-1];
    }

};

// bool operator==(const vector${element_type} &left, const vector${element_type} &right) {
//     return @operator==_vector_vector;
// }

// bool operator!=(const string &left, const string &right) {
//     return !@operator==_string_string;
// }


`;
}

registerLibraryHeader(
  'vector',
  new SourceFile(
    'vector.h',
    instantiateVectorTemplate('int') +
      instantiateVectorTemplate('double') +
      instantiateVectorTemplate('char') +
      instantiateVectorTemplate('bool'),
    true
  )
);

function getCapacity(obj: CPPObject<CompleteClassType>) {
  return <MemberSubobject<Int>>obj.getMemberObject('_capacity');
}

function getSize(obj: CPPObject<CompleteClassType>) {
  return <MemberSubobject<Int>>obj.getMemberObject('_size');
}

export function getDataPtr(obj: CPPObject<CompleteClassType>) {
  return <MemberSubobject<ArrayPointerType<AtomicType>>>obj.getMemberObject('data_ptr');
}

function allocateNewArray(
  rt: RuntimeExpression,
  rec: CPPObject<CompleteClassType>,
  newCapacity: Value<Int>
) {
  let elt_type = getDataPtr(rec).type.ptrTo.cvUnqualified();
  let arrObj = rt.sim.memory.heap.allocateNewObject(
    new BoundedArrayType(elt_type, newCapacity.rawValue)
  );
  arrObj.getArrayElemSubobjects().forEach(elem => elem.beginLifetime());
  arrObj.beginLifetime();

  // store pointer to new array
  getDataPtr(rec).writeValue(arrObj.getArrayElemSubobject(0).getPointerTo());
  getCapacity(rec).writeValue(newCapacity);
  return arrObj;
}

registerOpaqueExpression('vector::vector_default', <OpaqueExpressionImpl<VoidType, 'prvalue'>>{
  type: VoidType.VOID,
  valueCategory: 'prvalue',
  operate: (rt: RuntimeOpaqueExpression<VoidType, 'prvalue'>) => {
    allocateNewArray(rt, rt.contextualReceiver, new Value(initialVectorCapacity, Int.INT));
    // set set in member initializer list
  },
});

registerOpaqueExpression('vector::vector_int', <OpaqueExpressionImpl<VoidType, 'prvalue'>>{
  type: VoidType.VOID,
  valueCategory: 'prvalue',
  operate: (rt: RuntimeOpaqueExpression<VoidType, 'prvalue'>) => {
    let initialCapacity = getLocal<Int>(rt, 'n')
      .getValue()
      .modify(x => Math.max(x, initialVectorCapacity));

    allocateNewArray(rt, rt.contextualReceiver, initialCapacity);
    // size set in member initializer list
  },
});

registerOpaqueExpression('vector::vector_int_elt', <OpaqueExpressionImpl<VoidType, 'prvalue'>>{
  type: VoidType.VOID,
  valueCategory: 'prvalue',
  operate: (rt: RuntimeOpaqueExpression<VoidType, 'prvalue'>) => {
    let n = getLocal<Int>(rt, 'n').getValue();
    let initialCapacity = n.modify(x => Math.max(x, initialVectorCapacity));

    let arr = allocateNewArray(rt, rt.contextualReceiver, initialCapacity);
    // size set in member initializer list

    let val = getLocal<AtomicType>(rt, 'val').getValue();
    let n_raw = n.rawValue;
    for (let i = 0; i < n_raw; ++i) {
      arr.getArrayElemSubobject(i).writeValue(val);
    }
  },
});

registerOpaqueExpression('vector::vector_initializer_list', <
  OpaqueExpressionImpl<VoidType, 'prvalue'>
>{
  type: VoidType.VOID,
  valueCategory: 'prvalue',
  operate: (rt: RuntimeOpaqueExpression<VoidType, 'prvalue'>) => {
    let elts = getLocal<CompleteClassType>(rt, 'elts');
    let begin = <CPPObject<ArrayPointerType<ArithmeticType>>>elts.getMemberObject('begin');
    let elems = begin.type.arrayObject.getArrayElemSubobjects();

    let n = new Value(elems.length, Int.INT);
    let initialCapacity = n.modify(x => Math.max(x, initialVectorCapacity));

    getSize(rt.contextualReceiver).writeValue(n);

    let arr = allocateNewArray(rt, rt.contextualReceiver, initialCapacity);
    // size set in member initializer list

    let n_raw = n.rawValue;
    for (let i = 0; i < n_raw; ++i) {
      arr.getArrayElemSubobject(i).writeValue(elems[i].getValue());
    }
  },
});

registerOpaqueExpression('vector::vector_copy', <OpaqueExpressionImpl<VoidType, 'prvalue'>>{
  type: VoidType.VOID,
  valueCategory: 'prvalue',
  operate: (rt: RuntimeOpaqueExpression<VoidType, 'prvalue'>) => {
    let rec = rt.contextualReceiver;
    let other = getLocal<CompleteClassType>(rt, 'other');
    let otherSize = getSize(other).getValue();
    let otherArr = getDataPtr(other).type.arrayObject;

    let arr = allocateNewArray(
      rt,
      rec,
      otherSize.modify(x => Math.max(x, initialVectorCapacity))
    );
    let n = otherSize.rawValue;
    for (let i = 0; i < n; ++i) {
      arr.getArrayElemSubobject(i).writeValue(otherArr.getArrayElemSubobject(i).getValue());
    }
    getSize(rec).writeValue(otherSize);
  },
});

registerOpaqueExpression('vector::~vector', {
  type: VoidType.VOID,
  valueCategory: 'prvalue',
  operate: (rt: RuntimeOpaqueExpression) => {
    rt.sim.memory.heap.deleteByAddress(getDataPtr(rt.contextualReceiver).getValue().rawValue);
  },
});

registerOpaqueExpression('vector::operator=_vector', <
  OpaqueExpressionImpl<CompleteClassType, 'lvalue'>
>{
  type: (context: ExpressionContext) => {
    assert(isClassContext(context));
    return context.containingClass.type;
  },
  valueCategory: 'lvalue',
  operate: (rt: RuntimeOpaqueExpression<CompleteClassType, 'lvalue'>) => {
    let rec = rt.contextualReceiver;
    let rhs = getLocal<CompleteClassType>(rt, 'rhs');

    // Do nothing if self-assignment
    if (rt.contextualReceiver.address === rhs.address) {
      return rt.contextualReceiver;
    }

    rt.sim.memory.heap.deleteByAddress(getDataPtr(rec).rawValue());

    let otherSize = getSize(rhs).getValue();
    let otherArr = getDataPtr(rhs).type.arrayObject;

    let arr = allocateNewArray(
      rt,
      rec,
      otherSize.modify(x => Math.max(x, initialVectorCapacity))
    );
    let n = otherSize.rawValue;
    for (let i = 0; i < n; ++i) {
      arr.getArrayElemSubobject(i).writeValue(otherArr.getArrayElemSubobject(i).getValue());
    }
    getSize(rec).writeValue(otherSize);

    return rec;
  },
});

// registerOpaqueExpression("string::string_cstring", {
//     type: VoidType.VOID,
//     valueCategory: "prvalue",
//     operate: (rt: RuntimeOpaqueExpression) => {
//         let {charValues, validLength} = extractCharsFromCString(rt, getLocal<PointerType<Char>>(rt, "cstr").getValue());
//         copyFromCString(rt, rt.contextualReceiver, charValues, validLength);

//     }
// });

// registerOpaqueExpression("string::string_cstring_n", {
//     type: VoidType.VOID,
//     valueCategory: "prvalue",
//     operate: (rt: RuntimeOpaqueExpression) => {
//         let {charValues, validLength} = extractCharsFromCString(rt, getLocal<PointerType<Char>>(rt, "cstr").getValue(), getLocal<Int>(rt, "n").getValue());
//         copyFromCString(rt, rt.contextualReceiver, charValues, validLength);
//     }
// });

// // fill constructor from char
// registerOpaqueExpression("string::string_fill", {
//     type: VoidType.VOID,
//     valueCategory: "prvalue",
//     operate: (rt: RuntimeOpaqueExpression) => {

//         let rec = rt.contextualReceiver;
//         let numChars = getLocal<Int>(rt, "n").getValue();
//         let char = getLocal<Char>(rt, "c").getValue();

//         getSize(rec).writeValue(numChars);
//         getCapacity(rec).writeValue(numChars.addRaw(1));

//         // allocate array
//         let arrElems = allocateNewArray(rt, rec, numChars.rawValue + 1, []);

//         // fill array
//         arrElems.forEach((arrElem, i) => arrElem.writeValue(char));

//     }
// });

// registerOpaqueExpression("string::~string", {
//     type: VoidType.VOID,
//     valueCategory: "prvalue",
//     operate: (rt: RuntimeOpaqueExpression) => {
//         rt.sim.memory.heap.deleteByAddress(getDataPtr(rt.contextualReceiver).getValue().rawValue);
//     }
// });

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

// registerOpaqueExpression("string::capacity", <OpaqueExpressionImpl<Int, "lvalue">> {
//     type: Int.INT,
//     valueCategory: "lvalue",
//     operate: (rt: RuntimeOpaqueExpression<Int, "lvalue">) => {
//         return getCapacity(rt.contextualReceiver);
//     }
// });

registerOpaqueExpression('vector::clear', <OpaqueExpressionImpl<VoidType, 'prvalue'>>{
  type: VoidType.VOID,
  valueCategory: 'prvalue',
  operate: (rt: RuntimeOpaqueExpression<VoidType, 'prvalue'>) => {
    let rec = rt.contextualReceiver;
    getSize(rec).writeValue(new Value(0, Int.INT));
    getDataPtr(rec)
      .type.arrayObject.getArrayElemSubobjects()
      .forEach(elemObj => elemObj.setValidity(false));
  },
});

registerOpaqueExpression('vector::push_back', <OpaqueExpressionImpl<VoidType, 'prvalue'>>{
  type: VoidType.VOID,
  valueCategory: 'prvalue',
  operate: (rt: RuntimeOpaqueExpression<VoidType, 'prvalue'>) => {
    let rec = rt.contextualReceiver;
    let size = getSize(rec);
    let cap = getCapacity(rec);
    let arr = getDataPtr(rec).type.arrayObject;

    if (size.rawValue() === cap.rawValue()) {
      // grow array
      let oldArr = getDataPtr(rec).type.arrayObject;
      arr = allocateNewArray(
        rt,
        rec,
        cap.getValue().modify(x => 2 * x)
      );
      oldArr
        .getArrayElemSubobjects()
        .forEach((elemObj, i) => arr.getArrayElemSubobject(i).writeValue(elemObj.getValue()));
      rt.sim.memory.heap.deleteByAddress(oldArr.address, rt);
    }

    // add new object to back
    arr
      .getArrayElemSubobject(size.rawValue())
      .writeValue(getLocal<AtomicType>(rt, 'val').getValue());

    size.writeValue(size.getValue().addRaw(1));
  },
});

registerOpaqueExpression('vector::pop_back', <OpaqueExpressionImpl<VoidType, 'prvalue'>>{
  type: VoidType.VOID,
  valueCategory: 'prvalue',
  operate: (rt: RuntimeOpaqueExpression<VoidType, 'prvalue'>) => {
    let rec = rt.contextualReceiver;
    let size = getSize(rec);

    // decrease size by 1
    size.writeValue(size.getValue().subRaw(1));

    // popped element data is still there but is invalid
    let arr = getDataPtr(rec).type.arrayObject;
    arr.getArrayElemSubobject(size.getValue().rawValue).setValidity(false);
  },
});

// registerOpaqueExpression("string::empty", <OpaqueExpressionImpl<Bool, "prvalue">>{
//     type: Bool.BOOL,
//     valueCategory: "prvalue",
//     operate: (rt: RuntimeOpaqueExpression<Bool, "prvalue">) => {
//         return getSize(rt.contextualReceiver).getValue().equals(Int.ZERO);
//     }
// });

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

// registerOpaqueExpression(
//     "vector::operator[]",
//     <OpaqueExpressionImpl<AtomicType, "lvalue">> {
//         type: (context: ExpressionContext) => {
//             assert(isClassContext(context));
//             return context.templateType;
//         },
//         valueCategory: "lvalue",
//         operate: (rt: RuntimeOpaqueExpression<AtomicType, "lvalue">) => {
//             let ptr = getDataPtr(rt.contextualReceiver).getValue();
//             let pos = getLocal<Int>(rt, "pos").getValue();
//             ptr = ptr.pointerOffset(pos);

//             if (!ptr.isValid) {
//                 rt.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "It looks like the position you requested is out of bounds for that vector. The element reference you got back just refers to memory junk somewhere!");
//             }

//             return rt.sim.memory.dereference(ptr);
//         }
//     }
// );

// registerOpaqueExpression(
//     "vector::operator[]_const",
//     <OpaqueExpressionImpl<AtomicType, "lvalue">> {
//         type: (context: ExpressionContext) => {
//             assert(isClassContext(context) && context.templateType);
//             return context.templateType.cvQualified(true);
//         },
//         valueCategory: "lvalue",
//         operate: (rt: RuntimeOpaqueExpression<AtomicType, "lvalue">) => {
//             let ptr = getDataPtr(rt.contextualReceiver).getValue();
//             let pos = getLocal<Int>(rt, "pos").getValue();
//             ptr = ptr.pointerOffset(pos);

//             if (!ptr.isValid) {
//                 rt.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "It looks like the position you requested is out of bounds for that vector. The element reference you got back just refers to memory junk somewhere!");
//             }

//             return rt.sim.memory.dereference(ptr);
//         }
//     }
// );

// registerOpaqueExpression(
//     "string::at",
//     <OpaqueExpressionImpl<Char, "lvalue">> {
//         type: Char.CHAR,
//         valueCategory: "lvalue",
//         operate: (rt: RuntimeOpaqueExpression<Char, "lvalue">) => {
//             let ptr = getDataPtr(rt.contextualReceiver).getValue();
//             let pos = getLocal<Int>(rt, "pos").getValue();
//             ptr = ptr.pointerOffset(pos);

//             if (!ptr.isValid) {
//                 rt.sim.eventOccurred(SimulationEvent.CRASH, "It looks like the position you requested is out of bounds for that string. The character reference you got back just refers to memory junk somewhere!");
//             }

//             return rt.sim.memory.dereference(ptr);
//         }
//     }
// );

// registerOpaqueExpression(
//     "string::at_const",
//     <OpaqueExpressionImpl<Char, "lvalue">> {
//         type: new Char(true),
//         valueCategory: "lvalue",
//         operate: (rt: RuntimeOpaqueExpression<Char, "lvalue">) => {
//             let ptr = getDataPtr(rt.contextualReceiver).getValue();
//             let pos = getLocal<Int>(rt, "pos").getValue();
//             ptr = ptr.pointerOffset(pos);

//             if (!ptr.isValid) {
//                 rt.sim.eventOccurred(SimulationEvent.CRASH, "It looks like the position you requested is out of bounds for that string. The character reference you got back just refers to memory junk somewhere!");
//             }

//             return rt.sim.memory.dereference(ptr);
//         }
//     }
// );

// registerOpaqueExpression(
//     "string::front",
//     <OpaqueExpressionImpl<Char, "lvalue">> {
//         type: Char.CHAR,
//         valueCategory: "lvalue",
//         operate: (rt: RuntimeOpaqueExpression<Char, "lvalue">) => {
//             return rt.sim.memory.dereference(getDataPtr(rt.contextualReceiver).getValue());
//     }
// });

// registerOpaqueExpression(
//     "string::front_const",
//     <OpaqueExpressionImpl<Char, "lvalue">> {
//         type: new Char(true),
//         valueCategory: "lvalue",
//         operate: (rt: RuntimeOpaqueExpression<Char, "lvalue">) => {
//             return rt.sim.memory.dereference(getDataPtr(rt.contextualReceiver).getValue());
//     }
// });

// registerOpaqueExpression(
//     "operator+_string_string",
//     <OpaqueExpressionImpl<VoidType, "prvalue">> {
//         type: VoidType.VOID,
//         valueCategory: "prvalue",
//         operate: (rt: RuntimeOpaqueExpression<VoidType, "prvalue">) => {
//             let returnObject = <CPPObject<CompleteClassType>>rt.containingRuntimeFunction.returnObject;
//             assert(returnObject, "String + operator lacking return-by-value object");

//             addFromCStrings(rt, returnObject,
//                             getDataPtr(getLocal<CompleteClassType>(rt, "left")).getValue(),
//                             getDataPtr(getLocal<CompleteClassType>(rt, "right")).getValue());
//         }
//     }
// );

// registerOpaqueExpression(
//     "operator+_string_cstring",
//     <OpaqueExpressionImpl<VoidType, "prvalue">> {
//         type: VoidType.VOID,
//         valueCategory: "prvalue",
//         operate: (rt: RuntimeOpaqueExpression<VoidType, "prvalue">) => {
//             let returnObject = <CPPObject<CompleteClassType>>rt.containingRuntimeFunction.returnObject;
//             assert(returnObject, "String + operator lacking return-by-value object");

//             addFromCStrings(rt, returnObject,
//                             getDataPtr(getLocal<CompleteClassType>(rt, "str")).getValue(),
//                             getLocal<PointerType<Char>>(rt, "cstr").getValue());
//         }
//     }
// );

// registerOpaqueExpression(
//     "operator+_cstring_string",
//     <OpaqueExpressionImpl<VoidType, "prvalue">> {
//         type: VoidType.VOID,
//         valueCategory: "prvalue",
//         operate: (rt: RuntimeOpaqueExpression<VoidType, "prvalue">) => {
//             let returnObject = <CPPObject<CompleteClassType>>rt.containingRuntimeFunction.returnObject;
//             assert(returnObject, "String + operator lacking return-by-value object");

//             addFromCStrings(rt, returnObject,
//                             getLocal<PointerType<Char>>(rt, "cstr").getValue(),
//                             getDataPtr(getLocal<CompleteClassType>(rt, "str")).getValue());
//         }
//     }
// );

// registerOpaqueExpression(
//     "operator+_string_char",
//     <OpaqueExpressionImpl<VoidType, "prvalue">> {
//         type: VoidType.VOID,
//         valueCategory: "prvalue",
//         operate: (rt: RuntimeOpaqueExpression<VoidType, "prvalue">) => {
//             let returnObject = <CPPObject<CompleteClassType>>rt.containingRuntimeFunction.returnObject;
//             assert(returnObject, "String + operator lacking return-by-value object");

//             let left = getLocal<CompleteClassType>(rt, "str");
//             let right = getLocal<Char>(rt, "c");

//             let {charValues: leftChars, validLength: leftValidLength} = extractCharsFromCString(rt, getDataPtr(left).getValue());
//             leftChars.pop(); // remove null char that would otherwise be in the middle of left + right
//             leftChars.push(right.getValue());
//             leftChars.push(Char.NULL_CHAR); // add back on null char

//             let newCapacity = new Value(leftChars.length, Int.INT, leftValidLength);
//             let newSize = newCapacity.subRaw(1);

//             getCapacity(returnObject).writeValue(newCapacity);
//             getSize(returnObject).writeValue(newSize);

//             // allocate new array with enough space
//             allocateNewArray(rt, returnObject, newCapacity.rawValue, leftChars);
//         }
//     }
// );

// registerOpaqueExpression(
//     "operator+_char_string",
//     <OpaqueExpressionImpl<VoidType, "prvalue">> {
//         type: VoidType.VOID,
//         valueCategory: "prvalue",
//         operate: (rt: RuntimeOpaqueExpression<VoidType, "prvalue">) => {
//             let returnObject = <CPPObject<CompleteClassType>>rt.containingRuntimeFunction.returnObject;
//             assert(returnObject, "String + operator lacking return-by-value object");

//             let left = getLocal<Char>(rt, "c");
//             let right = getLocal<CompleteClassType>(rt, "str");

//             let {charValues: rightChars, validLength: rightValidLength} = extractCharsFromCString(rt, getDataPtr(right).getValue());
//             rightChars.unshift(left.getValue())

//             let newCapacity = new Value(rightChars.length, Int.INT, rightValidLength);
//             let newSize = newCapacity.subRaw(1);

//             getCapacity(returnObject).writeValue(newCapacity);
//             getSize(returnObject).writeValue(newSize);

//             // allocate new array with enough space
//             allocateNewArray(rt, returnObject, newCapacity.rawValue, rightChars);
//         }
//     }
// );

// registerOpaqueExpression(
//     "operator==_string_string",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareStrings((left, right) => left === right)
//     }
// );

// registerOpaqueExpression(
//     "operator!=_string_string",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareStrings((left, right) => left !== right)
//     }
// );

// registerOpaqueExpression(
//     "operator<_string_string",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareStrings((left, right) => left < right)
//     }
// );

// registerOpaqueExpression(
//     "operator<=_string_string",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareStrings((left, right) => left <= right)
//     }
// );

// registerOpaqueExpression(
//     "operator>_string_string",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareStrings((left, right) => left > right)
//     }
// );

// registerOpaqueExpression(
//     "operator>=_string_string",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareStrings((left, right) => left >= right)
//     }
// );

// registerOpaqueExpression(
//     "operator==_string_cstring",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareStringCstring((left, right) => left === right)
//     }
// );

// registerOpaqueExpression(
//     "operator!=_string_cstring",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareStringCstring((left, right) => left !== right)
//     }
// );

// registerOpaqueExpression(
//     "operator<_string_cstring",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareStringCstring((left, right) => left < right)
//     }
// );

// registerOpaqueExpression(
//     "operator<=_string_cstring",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareStringCstring((left, right) => left <= right)
//     }
// );

// registerOpaqueExpression(
//     "operator>_string_cstring",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareStringCstring((left, right) => left > right)
//     }
// );

// registerOpaqueExpression(
//     "operator>=_string_cstring",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareStringCstring((left, right) => left >= right)
//     }
// );

// registerOpaqueExpression(
//     "operator==_cstring_string",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareCstringString((left, right) => left === right)
//     }
// );

// registerOpaqueExpression(
//     "operator!=_cstring_string",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareCstringString((left, right) => left !== right)
//     }
// );

// registerOpaqueExpression(
//     "operator<_cstring_string",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareCstringString((left, right) => left < right)
//     }
// );

// registerOpaqueExpression(
//     "operator<=_cstring_string",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareCstringString((left, right) => left <= right)
//     }
// );

// registerOpaqueExpression(
//     "operator>_cstring_string",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareCstringString((left, right) => left > right)
//     }
// );

// registerOpaqueExpression(
//     "operator>=_cstring_string",
//     <OpaqueExpressionImpl<Bool, "prvalue">> {
//         type: Bool.BOOL,
//         valueCategory: "prvalue",
//         operate: compareCstringString((left, right) => left >= right)
//     }
// );

// registerOpaqueExpression(
//     "operator<<_ostream_string",
//     <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
//         type: lookupTypeInContext("ostream"),
//         valueCategory: "lvalue",
//         operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
//             rt.sim.cout(getDataPtr(getLocal<CompleteClassType>(rt, "str")).getValue());
//             return getLocal<CompleteClassType>(rt, "os");
//         }
//     }
// );

// registerOpaqueExpression(
//     "operator>>_istream_string",
//     <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
//         type: lookupTypeInContext("istream"),
//         valueCategory: "lvalue",
//         upNext: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
//             if (rt.sim.cin.buffer.length === 0) {
//                 rt.sim.blockUntilCin();
//             }
//         },
//         operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
//             rt.sim.cin.skipws();
//             let chars = Char.jsStringToNullTerminatedCharArray(rt.sim.cin.extractWordFromBuffer());

//             let str = getLocal<CompleteClassType>(rt, "str");

//             rt.sim.memory.heap.deleteByAddress(getDataPtr(str).getValue().rawValue);
//             copyFromCString(rt, str, chars)
//             return getLocal<CompleteClassType>(rt, "is");
//         }
//     }
// );

// registerOpaqueExpression(
//     "getline_istream_string",
//     <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
//         type: lookupTypeInContext("istream"),
//         valueCategory: "lvalue",
//         upNext: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
//             if (rt.sim.cin.buffer.length === 0) {
//                 rt.sim.blockUntilCin();
//             }
//         },
//         operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {

//             let chars = Char.jsStringToNullTerminatedCharArray(rt.sim.cin.extractLineFromBuffer());

//             let str = getLocal<CompleteClassType>(rt, "str");

//             rt.sim.memory.heap.deleteByAddress(getDataPtr(str).getValue().rawValue);
//             copyFromCString(rt, str, chars)
//             return getLocal<CompleteClassType>(rt, "is");
//         }
//     }
// );

// registerOpaqueExpression(
//     "string::operator=_string",
//     <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
//         type: lookupTypeInContext("string"),
//         valueCategory: "lvalue",
//         operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
//             let rec = rt.contextualReceiver;
//             let rhs = getLocal<CompleteClassType>(rt, "rhs");

//             rt.sim.memory.heap.deleteByAddress(getDataPtr(rec).getValue().rawValue);
//             let {charValues, validLength} = extractCharsFromCString(rt, getDataPtr(rhs).getValue());
//             copyFromCString(rt, rt.contextualReceiver, charValues, validLength);
//             return rt.contextualReceiver;
//         }
//     }
// );

// registerOpaqueExpression(
//     "string::operator=_cstring",
//     <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
//         type: lookupTypeInContext("string"),
//         valueCategory: "lvalue",
//         operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
//             let rec = rt.contextualReceiver;
//             let cstr = getLocal<PointerType<Char>>(rt, "cstr");

//             rt.sim.memory.heap.deleteByAddress(getDataPtr(rec).getValue().rawValue);
//             let {charValues, validLength} = extractCharsFromCString(rt, cstr.getValue());
//             copyFromCString(rt, rt.contextualReceiver, charValues, validLength);
//             return rt.contextualReceiver;
//         }
//     }
// );

// registerOpaqueExpression(
//     "string::operator=_char",
//     <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
//         type: lookupTypeInContext("string"),
//         valueCategory: "lvalue",
//         operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
//             let rec = rt.contextualReceiver;
//             let c = getLocal<Char>(rt, "c");

//             rt.sim.memory.heap.deleteByAddress(getDataPtr(rec).getValue().rawValue);
//             copyFromCString(rt, rt.contextualReceiver, [c.getValue(), Char.NULL_CHAR]);
//             return rt.contextualReceiver;
//         }
//     }
// );

// registerOpaqueExpression(
//     "string::operator+=_string",
//     <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
//         type: lookupTypeInContext("string"),
//         valueCategory: "lvalue",
//         operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
//             addFromCStrings(rt, rt.contextualReceiver,
//                 getDataPtr(rt.contextualReceiver).getValue(),
//                 getDataPtr(getLocal<CompleteClassType>(rt, "rhs")).getValue(), true);
//             return rt.contextualReceiver;
//         }
//     }
// );

// registerOpaqueExpression(
//     "string::operator+=_cstring",
//     <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
//         type: lookupTypeInContext("string"),
//         valueCategory: "lvalue",
//         operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
//             addFromCStrings(rt, rt.contextualReceiver,
//                 getDataPtr(rt.contextualReceiver).getValue(),
//                 getLocal<PointerType<Char>>(rt, "cstr").getValue(), true);
//             return rt.contextualReceiver;
//         }
//     }
// );

// registerOpaqueExpression(
//     "string::operator+=_char",
//     <OpaqueExpressionImpl<PotentiallyCompleteClassType, "lvalue">> {
//         type: lookupTypeInContext("string"),
//         valueCategory: "lvalue",
//         operate: (rt: RuntimeOpaqueExpression<PotentiallyCompleteClassType, "lvalue">) => {
//             let rec = rt.contextualReceiver;
//             let c = getLocal<Char>(rt, "c");

//             let orig = extractCharsFromCString(rt, getDataPtr(rt.contextualReceiver).getValue());
//             rt.sim.memory.heap.deleteByAddress(getDataPtr(rec).getValue().rawValue);
//             copyFromCString(rt, rt.contextualReceiver, [...orig.charValues, c.getValue(), Char.NULL_CHAR], orig.validLength);
//             return rt.contextualReceiver;
//         }
//     }
// );

// registerOpaqueExpression(
//     "stoi",
//     <OpaqueExpressionImpl<Int, "prvalue">> {
//         type: Int.INT,
//         valueCategory: "prvalue",
//         operate: (rt: RuntimeOpaqueExpression<Int, "prvalue">) => {
//             let str = extractStringValue(rt, getDataPtr(getLocal<CompleteClassType>(rt, "str")).getValue());
//             let val = parseInt(str);
//             if (!Number.isNaN(val)) {
//                 return new Value(val, Int.INT);
//             }
//             else {
//                 return new Value(Math.floor(Math.random()*100), Int.INT, false);
//             }
//         }
//     }
// );

// registerOpaqueExpression(
//     "stod",
//     <OpaqueExpressionImpl<Double, "prvalue">> {
//         type: Double.DOUBLE,
//         valueCategory: "prvalue",
//         operate: (rt: RuntimeOpaqueExpression<Double, "prvalue">) => {
//             let str = extractStringValue(rt, getDataPtr(getLocal<CompleteClassType>(rt, "str")).getValue());
//             let val = parseFloat(str);
//             if (!Number.isNaN(val)) {
//                 return new Value(val, Double.DOUBLE);
//             }
//             else {
//                 return new Value(Math.floor(Math.random()*100), Double.DOUBLE, false);
//             }
//         }
//     }
// );
