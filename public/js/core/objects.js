var Lobster = Lobster || {};
var CPP = Lobster.CPP = Lobster.CPP || {};

var CPPObject = CPP.CPPObject = Class.extend(Observable, {
    _name: "CPPObject",
    storage: Class._ABSTRACT,

    init: function(name, type){
        this.name = name;
        this.type = type;
        this.size = type.size;
        assert(this.size != 0, "Size cannot be 0."); // SCARY

        this.nonRefType = this.type;
        if (isA(this.type, Types.Reference) && isA(this.type.refTo, Types.Class)){
            this.nonRefType = this.type.refTo;
        }

        if (isA(this.type, Types.Array)){
            this.isArray = true;
            // If array, make subobjects for all elements
            this.elemObjects = [];
            for(var i = 0; i < this.type.length; ++i){
                this.elemObjects.push(ArraySubobject.instance(this, i));
            }
        }
        else if (isA(this.nonRefType, Types.Class)){
            this.isClass = true;
            // If class, make subobjects for all members

            var classType = this.nonRefType;


            // TODO I think the 3 statements below can be replaced with:
            var self = this;
            //this.subobjects = classType.subobjectEntities.map(function(mem){
            //    return mem.objectInstance(self);
            //});
            this.subobjects = [];
            this.i_memberSubobjectMap = {};
            this.i_baseSubobjects = [];
            classType.baseClassSubobjectEntities.forEach(function(baseEntity){
                var baseSubobj = baseEntity.objectInstance(self);
                self.subobjects.push(baseSubobj);
                self.i_baseSubobjects.push(baseSubobj);
            });
            classType.memberSubobjectEntities.map(function(memEntity){
                var subobj = memEntity.objectInstance(self);
                self.subobjects.push(subobj);
                self.i_memberSubobjectMap[memEntity.name] = subobj;
            });

        }
    },

    // TODO: Ultimately, I don't think this is needed, but I think I use it occassionally.
    // Remove and fix places after we have more thorough regression testing (or typescript)
    runtimeLookup :  function(sim, inst){
        return this;
    },

    // HACK: I should split this class into subclasses/mixins for objects of class type or array type
    // Then this function should also only exist in the appropriate specialized classes
    getMemberSubobject : function(name) {
        return this.i_memberSubobjectMap && this.i_memberSubobjectMap[name];
    },

    // HACK: I should split this class into subclasses/mixins for objects of class type or array type
    // Then this function should also only exist in the appropriate specialized classes
    getArrayElemSubobject : function (index) {
        if (0 <= index && index < this.elemObjects.length) {
            return this.elemObjects[index];
        }
        else {
            var outOfBoundsObj = ArraySubobject.instance(this, index);
            outOfBoundsObj.allocated(this.memory, this.address + index * this.type.elemType.size);
            return outOfBoundsObj;
        }
    },

    // HACK: I should split this class into subclasses/mixins for objects of class type or array type
    // Then this function should also only exist in the appropriate specialized classes
    memberSubobjectValueWritten : function() {
        this.send("valueWritten");
    },

    arrayElemValueWritten : function() {
        this.send("valueWritten");
    },

    instanceString : function(){
        return "@"+ this.address;
    },
    valueString : function(){
        return this.type.valueToString(this.rawValue());
    },
    nameString : function(){
        return this.name || "0x" + this.address;
    },
    valueToOstreamString : function(){
        return this.type.valueToOstreamString(this.rawValue());
    },
    isAlive : function(){
        return !!this.alive;
    },
    allocated : function(memory, address, inst){
        this.alive = true;
        this.memory = memory;
        this.address = address;

        // Allocate subobjects if needed
        if(this.isArray){
            var subAddr = this.address;
            for(var i = 0; i < this.type.length; ++i){
                this.elemObjects[i].allocated(memory, subAddr);
                subAddr += this.type.elemType.size;
            }
        }
        else if (this.isClass){
            var subAddr = this.address;
            for(var i = 0; i < this.subobjects.length; ++i){
                this.subobjects[i].allocated(memory, subAddr);
                subAddr += this.subobjects[i].type.size;
            }
        }

        this.send("allocated");
    },
    deallocated : function(inst){
        this.alive = false;
        this.deallocatedByInst = inst;
        this.send("deallocated");
        // deallocate subobjects if needed
        //if(this.isArray){
        //    for(var i = 0; i < this.type.length; ++i){
        //        this.elemObjects[i].deallocated();
        //    }
        //}
        //else if (this.isClass){
        //    for(var i = 0; i < this.subobjects.length; ++i){
        //        this.subobjects[i].deallocated();
        //    }
        //}
    },
    obituary : function(){
        return {killer: this.deallocatedByInst};
    },
    getPointerTo : function(){
        assert(this.address, "Must be allocated before you can get pointer to object.");
        return Value.instance(this.address, Types.ObjectPointer.instance(this));
    },
    getSubobject : function(addr){
        if(this.isArray){
            var offset = (addr - this.address) / this.type.elemType.size;
            if (0 <= offset && offset < this.elemObjects.length) {
                return this.elemObjects[offset];
            }
            else {
                var outOfBoundsObj = ArraySubobject.instance(this, offset);
                outOfBoundsObj.allocated(this.memory, this.address + offset * this.type.elemType.size);
                return outOfBoundsObj;
            }
            // for(var i = 0; i < this.type.length; ++i){
            //     var subObj = this.elemObjects[i];
            //     if (subObj.address === addr){
            //         return subObj;
            //     }
            // }
        }
        else if (this.isClass){
            for(var i = 0; i < this.subobjects.length; ++i){
                var subObj = this.subobjects[i];
                if (subObj.address === addr){
                    return subObj;
                }
            }
        }

        // Sorry, can't help you
        return null;
    },
    getValue : function(read){
        if (this.isValueValid()){
            return Value.instance(this.rawValue(read), this.type);
        }
        else{
            return Value.instance(this.rawValue(read), this.type, {invalid:true});
        }
    },
    readRawValue : function(){
        return this.rawValue(true);
    },
    rawValue : function(read){
        if (this.isArray){
            var arr = [];
            for(var i = 0; i < this.nonRefType.length; ++i){
                // use rawValue here to deeply remove Value object wrappers
                arr.push(this.elemObjects[i].getValue(read));
            }
            return arr;
        }
        else if (this.isClass){
            var val = [];
            for(var i = 0; i < this.subobjects.length; ++i) {
                // use rawValue here to deeply remove Value object wrappers
                val.push(this.subobjects[i].rawValue(read));
            }
            return val;
        }
        else{
            if (read) {
                var bytes = this.memory.readBytes(this.address, this.size, this);
                var val = this.nonRefType.bytesToValue(bytes);
                this.send("valueRead", val);
                return val;
            }
            else {
                var bytes = this.memory.getBytes(this.address, this.size);
                return this.nonRefType.bytesToValue(bytes);
            }
        }
    },
    setValue : function(newValue, write){

        // It's possible newValue could be another object.
        // Handle this as a special case by first looking up value.
        if (isA(newValue, CPPObject)){
            newValue = newValue.getValue(write);
        }

        if (isA(newValue, Value)){
            this.setValidity(newValue.isValueValid());
            // Accept new RTTI
            this.type = newValue.type;
            newValue = newValue.rawValue();
        }
        else{
            // assume it was valid
            this.setValidity(true);
        }


        if (this.isArray){
            assert(newValue.length === this.nonRefType.length);
            for(var i = 0; i < this.nonRefType.length; ++i){
                this.elemObjects[i].setValue(newValue[i], write);
            }
        }
        else if (this.isClass){
            assert(newValue.length === this.subobjects.length);
            for(var i = 0; i < this.subobjects.length; ++i) {
                this.subobjects[i].setValue(newValue[i], write);
            }
        }
        else{
            if(write){
                this.memory.writeBytes(this.address, this.nonRefType.valueToBytes(newValue), this);
                this.send("valueWritten", newValue);
            }
            else{
                this.memory.setBytes(this.address, this.nonRefType.valueToBytes(newValue), this);
            }
        }
    },

    readValue : function(){
        return this.getValue(true);
    },
    writeValue : function(newValue){
        this.setValue(newValue, true);
    },
    byteRead: function(addr){
        if (this.isArray){
            // If array, find the subobject containing the byte
            this.elemObjects[(addr - this.address) / this.nonRefType.elemType.size].byteRead(addr);
        }
        else if (this.isClass){
            var ad = this.address;
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(ad = ad + mem.type.size > addr){
                    ad.byteRead(addr);
                    break;
                }
            }
        }
        else{
            this.send("byteRead", {addr: addr});
        }
    },
    bytesRead: function(addr, length){
        if (this.isArray) {
            var beginIndex = Math.max(0, Math.floor(( addr - this.address ) / this.nonRefType.elemType.size));
            var endIndex = Math.min(
                beginIndex + Math.ceil(length / this.nonRefType.elemType.size),
                this.nonRefType.length);

            for (var i = beginIndex; i < endIndex; ++i) {
                this.elemObjects[i].bytesRead(addr, length);
            }
        }
        else if (this.isClass){
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(addr < mem.address + mem.type.size && mem.address < addr + length){ // check for overlap
                    mem.bytesRead(addr, length);
                }
                else if (mem.address > addr +length){
                    // break if we are now in members past affected bytes
                    break;
                }
            }
        }
        else{
            this.send("bytesRead", {addr: addr, length: length});
        }
    },
    byteSet: function(addr, value){
        if (this.isArray){
            // If array, find the subobject containing the byte
            this.elemObjects[(addr - this.address) / this.nonRefType.elemType.size].byteSet(addr, value);
        }
        else if (this.isClass){
            var ad = this.address;
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(ad = ad + mem.type.size > addr){
                    mem.byteSet(addr, value);
                    break;
                }
            }
        }
        else{
            this.send("byteSet", {addr: addr, value: value});
        }
    },
    bytesSet: function(addr, values){
        var length = values.length;
        if (this.isArray) {
            var beginIndex = Math.max(0, Math.floor(( addr - this.address ) / this.nonRefType.elemType.size));
            var endIndex = Math.min(
                beginIndex + Math.ceil(length / this.nonRefType.elemType.size),
                this.nonRefType.length);

            for (var i = beginIndex; i < endIndex; ++i) {
                this.elemObjects[i].bytesSet(addr, values);
            }
        }
        else if (this.isClass){
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(addr < mem.address + mem.type.size && mem.address < addr + length){ // check for overlap
                    mem.bytesSet(addr, values);
                }
                else if (mem.address > addr +length){
                    // break if we are now in members past affected bytes
                    break;
                }
            }
        }
        else{
            this.send("bytesSet", {addr: addr, values: values});
        }
    },
    byteWritten: function(addr, value){
        if (this.isArray){
            // If array, find the subobject containing the byte
            this.elemObjects[(addr - this.address) / this.nonRefType.elemType.size].byteWritten(addr, value);
        }
        else if (this.isClass){
            var ad = this.address;
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(ad = ad + mem.type.size > addr){
                    mem.byteWritten(addr, value);
                    break;
                }
            }
        }
        else{
            this.send("byteWritten", {addr: addr, value: value});
        }
    },
    bytesWritten: function(addr, values){
        var length = values.length;
        if (this.isArray) {
            var beginIndex = Math.max(0, Math.floor(( addr - this.address ) / this.nonRefType.elemType.size));
            var endIndex = Math.min(
                beginIndex + Math.ceil(length / this.nonRefType.elemType.size),
                this.nonRefType.length);

            for (var i = beginIndex; i < endIndex; ++i) {
                this.elemObjects[i].bytesWritten(addr, values);
            }
        }
        else if (this.isClass){
            for(var i = 0; i < this.subobjects.length; ++i) {
                var mem = this.subobjects[i];
                if(addr < mem.address + mem.type.size && mem.address < addr + length){ // check for overlap
                    mem.bytesWritten(addr, values);
                }
                else if (mem.address > addr +length){
                    // break if we are now in members past affected bytes
                    break;
                }
            }
        }
        else{
            this.send("bytesWritten", {addr: addr, values: values});
        }
    },
    callReceived : function(){
        this.send("callReceived", this);
    },
    callEnded : function(){
        this.send("callEnded", this);
    },
    setValidity : function(valid){
        this._isValid = valid;
        this.send("validitySet", valid);
    },
    invalidate : function(){
        this.setValidity(false);
    },
    validate : function(){
        this.setValidity(true);
    },
    isValueValid : function(){
        return this._isValid && this.type.isValueValid(this.rawValue());
    },
    isValueDereferenceable : function() {
        return this._isValid && this.type.isValueDereferenceable(this.rawValue());
    },
    describe : function(){
        var w1 = isA(this.decl, Declarations.Parameter) ? "parameter " : "object ";
        return {name: this.name, message: "the " + w1 + (this.name || ("at 0x" + this.address))};
    }

});


var ThisObject = CPP.ThisObject = CPPObject.extend({
    _name: "ThisObject",
    storage: "automatic"
});




var StringLiteralObject = CPP.StringLiteralObject = CPP.CPPObject.extend({
    _name: "StringLiteralObject",
    storage: "static",
    init: function (type) {
        this.initParent(null, type);
    },
    instanceString: function () {
        return "string literal at 0x" + this.address;
    },
    describe: function () {
        return {message: "string literal at 0x" + this.address};
    }
});

var DynamicObject = CPP.DynamicObject = CPP.CPPObject.extend({
    _name: "DynamicObject",
    storage: "dynamic",
    init: function(type, name){
        this.initParent(name || null, type);
    },
    instanceString : function(){
        return "Heap object at " + this.address + " (" + this.type + ")";
    },
    leaked : function(sim){
        if (!this.hasBeenLeaked){
            this.hasBeenLeaked = true;
            sim.memoryLeaked("Oh no! Some memory just got lost. It's highlighted in red in the memory display.")
            this.send("leaked");
        }
    },
    unleaked : function(sim){
        this.send("unleaked");
    },
    describe : function(){
        return {message: "the heap object " + (this.name || "at 0x" + this.address)};
    }
});



var AutoObjectInstance = CPP.AutoObjectInstance = CPP.CPPObject.extend({
    _name: "AutoObjectInstance",
    storage: "automatic",
    init: function(autoObj){
        this.initParent(autoObj.name, autoObj.type);
        this.decl = autoObj.decl;
        this.entityId = autoObj.entityId;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    }
});

var StaticObjectInstance = CPP.StaticObjectInstance = CPP.CPPObject.extend({
    _name: "StaticObjectInstance",
    storage: "static",
    init: function(staticEnt){
        this.initParent(staticEnt.name, staticEnt.type);
        this.decl = staticEnt.decl;
        this.entityId = staticEnt.entityId;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    }
});





var EvaluationResultRuntimeEntity = CPP.EvaluationResultRuntimeEntity = CPP.CPPObject.extend({
    _name: "EvaluationResultRuntimeEntity",
    storage: "automatic",
    init: function(type, inst){
        this.initParent(null, type);
        this.inst = inst;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    runtimeLookup :  function (sim, inst) {
        return this.inst.evalValue.runtimeLookup(sim, inst);
    }
});



var AnonObject = CPP.AnonObject = CPP.CPPObject.extend({
    _name: "AnonObject",
    storage: "temp",
    init: function(type, name){
        this.initParent(name || null, type);
    },
    nameString : function(){
        return this.name || "@" + this.address;
    }/*,
     isAlive : function(){
     return false;
     }*/
});


var Subobject = CPP.Subobject = CPP.CPPObject.extend({
    _name: "Subobject",
    parentObject : Class._ABSTRACT,
    isAlive : function(){
        return this.parentObject().isAlive();
    },
    obituary : function(){
        return this.parentObject().obituary();
    }
});



var ArraySubobject = CPP.ArraySubobject = CPP.Subobject.extend({
    _name: "ArraySubobject",
    storage: "temp",
    init: function(arrObj, index){
        this.initParent(null, arrObj.type.elemType);
        this.arrObj = arrObj;
        this.index = index;
    },
    nameString : function(){
        return this.name || "@" + this.address;
    },
    parentObject : function(){
        return this.arrObj;
    },
    getPointerTo : function(){
        assert(this.address, "Must be allocated before you can get pointer to object.");
        return Value.instance(this.address, Types.ArrayPointer.instance(this.arrObj));
    },
    describe : function(){
        var desc = {};
        var arrDesc = this.arrObj.describe();
        desc.message = "element " + this.index + " of " + arrDesc.message;
        if (arrDesc.name){
            desc.name = arrDesc.name + "[" + this.index + "]";
        }
        return desc;
    },
    isAlive : function() {
        return ArraySubobject._parent.isAlive.apply(this, arguments) && this.isInBounds();
    },
    isValueValid : function() {
        return Lobster.CPP.ArraySubobject._parent.isValueValid.apply(this, arguments) && this.isInBounds();
    },
    isInBounds : function() {
        var offset = (this.address - this.arrObj.address) / this.type.size;
        return 0 <= offset && offset < this.arrObj.elemObjects.length;
    },
    setValue : function(newValue, write) {
        ArraySubobject._parent.setValue.apply(this, arguments);
        write && this.arrObj.arrayElemValueWritten(this);
    }
});





var TemporaryObjectInstance = CPP.TemporaryObjectInstance = CPP.CPPObject.extend({
    _name: "TemporaryObject",
    storage: "temp",
    init: function(tempObjEntity){
        this.initParent(tempObjEntity.name, tempObjEntity.type);
        this.entityId = tempObjEntity.entityId;
    },
    nameString : function(){
        return "@" + this.address;
    }
});

var BaseClassSubobject = CPP.BaseClassSubobject = CPP.Subobject.extend({
    _name: "BaseClassSubobject",
    storage: "none",
    init: function(type, parent){
        assert(isA(type, Types.Class));
        this.initParent("-"+type.className, type);
        this.parent = parent;
        this.storage = parent.storage;
    },
    parentObject : function(){
        return this.parent;
    },
    nameString : function(){
        return this.parent.nameString();
    },
    describe : function(){
        return {message: "the " + this.type.className + " base of " + this.parentObject().describe().message};
    }
});

var MemberSubobject = CPP.MemberSubobject = CPP.Subobject.extend({
    _name: "MemberSubobject",
    storage: "none",
    init: function(type, parent, name){
        this.initParent(name || null, type);
        this.parent = parent;
        this.storage = parent.storage;
    },
    parentObject : function(){
        return this.parent;
    },
    nameString : function(){
        return this.parent.nameString() + "." + this.name;
    },
    describe : function(){
        var parent = this.parentObject();
        if (parent.name){
            return {message: parent.name + "." + this.name};
        }
        else{
            return {message: "the member " + this.name + " of " + parent.describe().message};
        }
    },
    setValue : function(newValue, write) {
        MemberSubobject._parent.setValue.apply(this, arguments);
        write && this.parent.memberSubobjectValueWritten(this);
    }
});

var createAnonObject = function(type, memory, address){
    var obj = AnonObject.instance(type);
    obj.allocated(memory, address);
    return obj;
};

