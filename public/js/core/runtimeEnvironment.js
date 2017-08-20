var Lobster = Lobster || {};
var CPP = Lobster.CPP = Lobster.CPP || {};




var Memory = Lobster.Memory = Class.extend(Observable, {
    _name: "Memory",
    init: function(capacity, staticCapacity, stackCapacity){
        this.initParent();

        this.capacity = capacity || 10000;
        this.staticCapacity = staticCapacity || Math.floor(this.capacity / 10);
        this.stackCapacity = stackCapacity || Math.floor((this.capacity - this.staticCapacity) / 2);
        this.heapCapacity = this.capacity - this.staticCapacity - this.stackCapacity;

        this.bubble = true;
        this.staticStart = 0;
        this.staticTop = this.staticStart + 4;
        this.staticEnd = this.staticStart + this.staticCapacity;
        this.staticObjects = {};

        this.stackStart = this.staticEnd;
        this.stackEnd = this.stackStart + this.stackCapacity;

        this.heapStart = this.stackEnd;
        this.heapEnd = this.heapStart + this.heapCapacity;

        this.temporaryStart = this.heapEnd + 100;
        this.temporaryBottom = this.temporaryStart;
        this.temporaryCapacity = 10000;
        this.temporaryEnd = this.temporaryStart + this.temporaryCapacity;

        assert(this.staticCapacity < this.capacity && this.stackCapacity < this.capacity && this.heapCapacity < this.capacity);
        assert(this.heapEnd == this.capacity);

    },

    reset : function(){

        // memory is a sequence of bytes, addresses starting at 0
        this.bytes = new Array(this.capacity + this.temporaryCapacity);
        for(var i = 0; i < this.capacity + this.temporaryCapacity; ++i){
            this.bytes[i] = Math.floor(Math.random() * 100);
        }

        this.objects = {};
        this.i_stringLiteralMap = {};
        this.staticTop = this.staticStart+4;
        this.staticObjects = {};
        this.temporaryBottom = this.temporaryStart;

        this.stack = MemoryStack.instance(this, this.staticEnd);
        this.heap = MemoryHeap.instance(this, this.heapEnd);
        this.temporaryObjects = {};
        this.send("reset");
    },

//    clear : function(){
//        for(var i = 0; i < this.capacity; ++i){
//            this.bytes[i] = 0;
//        }
//        this.stack = null;
//        this.heap = null;
//        this.objects = {};
//        this.send("cleared");
//    },
    allocateObject : function(object, addr){
        this.objects[addr] = object;
        object.allocated(this, addr);
    },
    deallocateObject : function(addr, inst){
        assert(addr !== undefined);
        var obj = this.objects[addr];
        if (obj){
            obj.deallocated(inst);
        }
        // I'm just leaving the dead objects here for now, that way we can provide better messages if a dead object is looked up
        //delete this.objects[addr];
    },

    allocateStringLiteral : function(stringLiteralEntity) {
        var str = stringLiteralEntity.getLiteralString();
        if (!this.i_stringLiteralMap[str]) {
            // only need to allocate a string literal object if we didn't already have an identical one
            var object = stringLiteralEntity.objectInstance();
            this.allocateObject(object, this.staticTop);

            // record the string literal in case we see more that are the same in the future
            this.i_stringLiteralMap[str] = object;

            // write value of string literal into the object
            object.writeValue(Types.Char.jsStringToNullTerminatedCharArray(str));

            // adjust location for next static object
            this.staticTop += object.size;
        }

    },

    getStringLiteral : function(str) {
        return this.i_stringLiteralMap[str];
    },

    allocateStatic : function(staticEntity){
        var object = staticEntity.objectInstance();
        this.allocateObject(object, this.staticTop);
        this.staticTop += object.size;
        this.staticObjects[staticEntity.getFullyQualifiedName()] = object;

        if(staticEntity.defaultValue !== undefined){
            object.setValue(staticEntity.defaultValue);
        }
        else if (staticEntity.type.defaultValue !== undefined){
            object.setValue(staticEntity.type.defaultValue);
        }
    },

    staticLookup : function(staticEntity) {
        return this.staticObjects[staticEntity.getFullyQualifiedName()];
    },

    getByte : function(addr){
        return this.bytes[addr];
    },
    readByte : function(ad, fromObj){

        // Notify any other object that is interested in that byte
        // var begin = ad - Type.getMaxSize();
        //for(var i = ad; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj == fromObj) { continue; }
        //    if (obj && obj.size > ad - i){
        //        obj.byteRead(ad);
        //    }
        //}
        return this.bytes[ad];
    },
    getBytes : function(addr, num){
        return this.bytes.slice(addr, addr + num);
    },
    readBytes : function(ad, num, fromObj){
        var end = ad + num;

        // Notify any other object that is interested in that byte
        // var begin = ad - Type.getMaxSize();
        //for(var i = end-1; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj == fromObj) { continue; }
        //    if (obj && obj.size > ad - i){
        //        obj.bytesRead(ad, end-ad);//.send("bytesRead", {addr: ad, length: end-ad});
        //    }
        //}

        return this.bytes.slice(ad, end);
    },
    setByte : function(ad, value){
        this.bytes[ad] = value;

        // Notify any object that is interested in that byte
        // var begin = ad - Type.getMaxSize();
        //for(var i = ad; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj && obj.size > ad - i){
        //        obj.byteSet(ad, value);//.send("byteSet", {addr: ad, value: value});
        //    }
        //}
    },
    writeByte : function(ad, value, fromObj){
        this.bytes[ad] = value;

        // Notify any other object that is interested in that byte
        // var begin = ad - Type.getMaxSize();
        //for(var i = ad; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj == fromObj) { continue; }
        //    if (obj && obj.size > ad - i){
        //        obj.byteWritten(ad, value);//.send("byteWritten", {addr: ad, value: value});
        //    }
        //}
    },
    setBytes : function(ad, values){

        for(var i = 0; i < values.length; ++i){
            this.bytes[ad+i] = values[i];
        }

        // Notify any other object that is interested in that byte
        //var begin = ad - Type.getMaxSize();
        //for(var i = ad+values.length; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj && obj.size > ad - i){
        //        obj.bytesSet(ad, values);//.send("byteSet", {addr: ad, values: values});
        //    }
        //}
    },
    writeBytes : function(ad, values, fromObj){

        //TODO remove this commented code
        //if (isA(fromObj, TemporaryObject)){
        //    var objBytes = this.temporaryObjects[fromObj.entityId];
        //    if (!objBytes){
        //        objBytes = new Array(fromObj.size);
        //        for(var i = 0; i < fromObj.size; ++i){
        //            objBytes[i] = 0;
        //        }
        //        this.temporaryObjects[fromObj.entityId] = objBytes;
        //    }
        //    return;
        //}

        for(var i = 0; i < values.length; ++i){
            this.bytes[ad+i] = values[i];
        }

        // Notify any other object that is interested in that byte
        //var begin = ad - Type.getMaxSize();
        //for(var i = ad+values.length-1; begin < i; --i){
        //    var obj = this.objects[i];
        //    if (obj == fromObj) { continue; }
        //    if (obj && obj.size > ad - i){
        //        obj.bytesWritten(ad, values);//.send("bytesWritten", {addr: ad, values: values});
        //    }
        //}
    },

//    makeObject : function(entity, addr){
//        return this.objects[addr] = CPPObject.instance(entity, this, addr);
//    },
    // Takes in a Value or CPPObject of pointer type. Must point to an object type
    // Returns the most recently allocated object at the given address.
    // This may be an object which is no longer alive (has been deallocated).
    getObject: function(ptr, type){
        assert(isA(ptr, Value) || isA(ptr, CPPObject));
        assert(ptr.type.isObjectPointer());
        type = type || ptr.type.ptrTo;

        var addr = ptr.rawValue();

        // Handle special cases for pointers with RTTI
        if (isA(ptr.type, Types.ArrayPointer)){
            return ptr.type.arrObj.getSubobject(addr);

        }
        else if (isA(ptr.type, Types.ObjectPointer)  && ptr.type.isValueValid(addr)){
            return ptr.type.obj;
        }

        // Grab object from memory
        var obj = this.objects[addr];

        if (obj && (similarType(obj.type. type) || subType(obj.type, type))){
            return obj;
        }

        // If the object wasn't there or doesn't match the type we asked for (ignoring const)
        // then we need to create an anonymous object of the appropriate type instead
        return createAnonObject(type, this, addr);
    },
    allocateTemporaryObject: function(tempEntity){
        var obj = TemporaryObjectInstance.instance(tempEntity);
        this.allocateObject(obj, this.temporaryBottom);
        this.temporaryBottom += tempEntity.type.size;
        this.temporaryObjects[tempEntity.entityId] = obj;
        this.send("temporaryObjectAllocated", obj);

        if(tempEntity.defaultValue !== undefined){
            obj.setValue(tempEntity.defaultValue);
        }
        else if (tempEntity.type.defaultValue !== undefined){
            obj.setValue(tempEntity.type.defaultValue);
        }

        return obj;
    },
    deallocateTemporaryObject: function(obj, inst){
        this.deallocateObject(obj, inst);
        //this.temporaryBottom += obj.type.size;
        delete this.temporaryObjects[obj];
        this.send("temporaryObjectDeallocated", obj);
    }
});

var MemoryStack = Class.extend(Observable, {
    _name: "MemoryStack",
    init: function(memory, start){
        this.initParent();

        this.memory = memory;
        this.start = start;
        this.top = start;
        this.frames = [];
    },
    clear : function(){
        this.frames.length = 0;
        this.top = this.start;
    },
    topFrame : function(){
        return this.frames.last();
    },
    pushFrame : function(func){
        var frame = MemoryFrame.instance(func.funcDeclModel.bodyScope, this.memory, this.top, func);
        this.top += frame.size;
        this.frames.push(frame);

        // Take care of reference parameters


        this.memory.send("framePushed", frame);
        return frame;
    },
    popFrame : function(inst){
        var frame = this.frames.pop();
        for (var key in frame.objects){
            var obj = frame.objects[key];
            this.memory.deallocateObject(obj.address, inst)
        }
        this.top -= frame.size;
        this.memory.send("framePopped", frame);
    },
    instanceString : function(){
        var str = "<ul class=\"stackFrames\">";
        for(var i = 0; i < this.frames.length; ++i){
            var frame = this.frames[i];
            str += "<li>" + frame.toString() + "</li>";
        }
        str += "</ul>";
        return str;
    }
});

var MemoryHeap = Class.extend(Observable, {
    _name: "MemoryHeap",
    props : {
        memory: {type: Memory},
        bottom: {type: "number"}
    },
    init: function(memory, end){
        this.memory = memory;
        this.end = end;
        this.bottom = end;
        this.objectMap = {};

        this.initParent();
    },
    clear : function(){
        this.objects.length = 0;
    },
    allocateNewObject: function(obj){
        this.bottom -= obj.type.size;
        this.memory.allocateObject(obj, this.bottom);
        this.objectMap[obj.address] = obj;
        this.memory.send("heapObjectAllocated", obj);


        if(obj.defaultValue !== undefined){
            obj.setValue(obj.defaultValue);
        }
        else if (obj.type.defaultValue !== undefined){
            obj.setValue(obj.type.defaultValue);
        }
    },

    deleteObject: function(addr, inst){
        var obj = this.objectMap[addr];
        if (obj) {
            delete this.objectMap[addr];
            this.memory.deallocateObject(addr, inst);
            this.memory.send("heapObjectDeleted", obj);
            // Note: responsibility for running destructor lies elsewhere
        }
        return obj;
    }
});

//TODO search for StackFrame, .stack, .heap, .objects

var MemoryFrame = Lobster.CPP.MemoryFrame = Class.extend(Observable, {
    _name: "MemoryFrame",

    init: function(scope, memory, start, func){
        var self = this;
        this.scope = scope;
        this.memory = memory;
        this.start = start;
        this.func = func.funcDeclModel;
        var funcInst = func;

        this.initParent();

        this.size = 0;
        this.objects = {};
        this.references = {};

        var addr = this.start;

        if(this.func.isMemberFunction){
            var obj = ThisObject.instance("this", Types.ObjectPointer.instance(funcInst.getReceiver()));

            // Allocate object
            this.memory.allocateObject(obj, addr);
            obj.setValue(funcInst.getReceiver().getPointerTo());
            addr += obj.size;

            this.objects[obj.entityId] = obj;
            this.size += obj.size;
        }

        this.setUpReferenceInstances();

        // Push objects for all entities in the frame
        var autos = scope.automaticObjects;
        for (var i = 0; i < autos.length; ++i) {
            var objEntity = autos[i];

            // Create instance of the object
            obj = objEntity.objectInstance();

            // Allocate object
            this.memory.allocateObject(obj, addr);
            addr += obj.size;

            this.objects[obj.entityId] = obj;
            this.size += obj.size;

            if(objEntity.defaultValue !== undefined){
                obj.setValue(objEntity.defaultValue);
            }
            else if (objEntity.type.defaultValue !== undefined){
                obj.setValue(objEntity.type.defaultValue);
            }
//                console.log("----" + key);
        }


        this.end = this.start + this.size;
    },

    instanceString : function(){
        var str = "";
        for(var key in this.objects){
            var obj = this.objects[key];
//			if (!obj.type){
            // str += "<span style=\"background-color:" + obj.color + "\">" + key + " = " + obj + "</span>\n";
            str += "<span>" + obj + "</span>\n";
//			}
        }
        return str;
    },

    getObjectForEntity : function(entity){
        return this.objects[entity.entityId];
    },
    referenceLookup : function(entity){
        return this.references[entity.entityId].runtimeLookup();
    },
    setUpReferenceInstances : function(){
        var self = this;
        this.scope.referenceObjects.forEach(function(ref){
            self.references[ref.entityId] = ref.runtimeInstance();
            //self.memory.allocateObject(ref, addr);
            //addr += ref.type.size;
        });
    }

});