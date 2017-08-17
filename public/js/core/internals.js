var Lobster = Lobster || {};
var CPP = Lobster.CPP = Lobster.CPP || {};




var CPPConstruct = Lobster.CPPConstruct = Class.extend({
    _name: "CPPConstruct",
    _nextId: 0,
    initIndex: "pushChildren",

    i_childrenToCreate : [],
    i_childrenToConvert : {},
    i_childrenToExecute : [],

    create : function(ast, context, classToUse) {
        // if ast is actually already a (detatched) construct, just attach it to the
        // provided context rather than creating a new one.
        if (isA(ast, CPPConstruct)) {
            assert(!ast.isAttached());
            ast.attach(context);
            return ast;
        }

        var constructClass = classToUse || CONSTRUCT_CLASSES[ast["construct_type"]];
        assert(constructClass, "Unrecognized construct_type.");
        return constructClass.instance(ast, context);
    },
    //
    // createWithChildren : function(children, context) {
    //     var construct = this.instance(context);
    //     this.i_createWithChildrenImpl(construct, children, context);
    //
    //     return construct;
    // },

    // context parameter is often just parent code element in form
    // {parent: theParent}, but may also have additional information
    init: function (ast, context) {
        assert(ast || ast === null);
        ast = ast || {};
        assert(context || context === null);
        this.id = CPPConstruct._nextId++;
        this.children = [];
        this.i_notes = [];
        this.i_hasErrors = false;

        this.ast = ast;
        if (ast.code) {
            this.code = ast.code;
        }
        if (ast.library_id) {
            this.i_libraryId = ast.library_id;
        }
        if (ast.library_unsupported) {
            this.i_library_unsupported = true;
        }

        this.i_isAttached = false;
        if (context) {
            this.attach(context);
        }
    },

    attach : function(context) {
        this.i_setContext(context);
        this.i_createFromAST(this.ast, context);
        this.i_isAttached = true;
    },

    isAttached : function() {
        return this.i_isAttached;
    },

    /**
     * Default for derived classes, pulls children from i_childrenToCreate array.
     * Derived classes may also provide an override if they need customization (e.g. providing
     * a different scope in the context for children, getting extra properties from the AST, etc.)
     * @param ast
     */
    i_createFromAST : function(ast, context) {
        for(var i = 0; i < this.i_childrenToCreate.length; ++i) {
            var childName = this.i_childrenToCreate[i];
            this[childName] = this.i_createChild(ast[childName]);
        }
    },

    i_createChild : function(ast, context) {
        if (!ast) {return ast;}
        if (Array.isArray(ast)){
            var self = this;
            return ast.map(function(a) {
                return self.i_createChild(a, context);
            });
        }

        return CPPConstruct.create(ast, mixin({parent:this}, context || {}));
    },

    // i_createAndConnectChild : function(source, context) {
    //     return this.i_connectChild(this.i_createChild(source, context));
    // },

    // i_connectChild : function(childConstruct) {
    //     if(!childConstruct) {return childConstruct;}
    //     childConstruct.i_context.parent = this;
    //     childConstruct.i_setContext(childConstruct.i_context);
    //     this.children.push(childConstruct);
    //     return childConstruct;
    // },

    i_setContext : function(context){
        assert(!this.i_isAttached);
        this.i_isAttached = true;
        assert(context.hasOwnProperty("parent"));
        assert(!context.parent || isA(context.parent, CPPConstruct));
        assert(!context.parent || context.parent.isAttached());
        this.parent = context.parent;

        // Use containing function from context or inherit from parent
        this.i_containingFunction = context.func || (this.parent && this.parent.i_containingFunction);

        // Use implicit from context or inherit from parent
        this.i_isImplicit = context.implicit || (this.parent && this.parent.i_isImplicit);

        // If auxiliary, increase auxiliary level over parent. If no parent, use default of 0
        if (this.parent){
            if (context.auxiliary) {
                this.i_auxiliaryLevel = this.parent.i_auxiliaryLevel + 1;
            }
            else {
                this.i_auxiliaryLevel = this.parent.i_auxiliaryLevel;
            }
        }
        else{
            this.i_auxiliaryLevel = 0;
        }

        // If a contextual scope was specified, use that. Otherwise inherit from parent
        this.contextualScope = context.scope || (this.parent && this.parent.contextualScope);

        // Use translation unit from context or inherit from parent
        this.i_translationUnit = context.translationUnit || (this.parent && this.parent.i_translationUnit);

        // If the parent is an usupported library construct, so are its children (including this one)
        if (this.parent && this.parent.i_library_unsupported) {
            this.i_library_unsupported = true;
        }

        // If this contruct is not auxiliary WITH RESPECT TO ITS PARENT, then we should
        // add it as a child. Otherwise, if this construct is auxiliary in that sense we don't.
        if (this.parent && this.i_auxiliaryLevel === this.parent.i_auxiliaryLevel) {
            this.parent.children.push(this);
        }
    },

    getSourceReference : function() {
        return this.i_translationUnit.getSourceReferenceForConstruct(this);
    },

    hasSourceCode : function() {
        return !!this.code;
    },

    getSourceCode : function() {
        return this.code;
    },

    getSourceText : function() {
        return this.code ? this.code.text : "an expression";
    },

    isLibraryConstruct : function() {
        return this.i_libraryId !== undefined;
    },

    getLibraryId : function() {
        return this.i_libraryId;
    },

    isLibraryUnsupported : function () {
        return this.i_library_unsupported;
    },

    getTranslationUnit : function() {
        return this.i_translationUnit;
    },

    /**
     * Default for derived classes, simply compiles children from i_childrenToCreate array.
     * Usually, derived classes will need to override (e.g. to do any typechecking at all)
     */
    compile: function() {
        this.i_compileChildren();
    },

    i_compileChildren: function() {
        for(var i = 0; i < this.i_childrenToCreate.length; ++i) {
            var childName = this.i_childrenToCreate[i];
            this[childName].compile();
        }
    },

    tryCompile : function(){
        try{
            return this.compile.apply(this, arguments);
        }
        catch(e){
            if (isA(e, SemanticException)){
                this.addNote(e.annotation(this));
            }
            else{
                throw e;
            }
        }
    },

    isTailChild : function(child){
        return {isTail: false};
    },

    done : function(sim, inst){
        sim.pop(inst);
    },

    createInstance : function(sim, parent){
        return CPPConstructInstance.instance(sim, this, this.initIndex, this.instType, parent);
    },

    createAndPushInstance : function(sim, parent){
        var inst = this.createInstance.apply(this, arguments);
        sim.push(inst);
        return inst;
    },

    i_createAndCompileChildExpr : function(ast, convertTo){
        var child = this.i_createChild(ast);
        child.tryCompile();
        if (convertTo){
            child = standardConversion(child, convertTo);
        }
        return child;
    },

    pushChildInstances : function(sim, inst){

        inst.childInstances = inst.childInstances || {};
        for(var i = this.i_childrenToExecute.length-1; i >= 0; --i){
            var childName = this.i_childrenToExecute[i];
            var child = this[childName];
            if (Array.isArray(child)){
                // Note: no nested arrays, but that really seems unnecessary
                var childArr = inst.childInstances[childName] = [];
                for(var j = child.length-1; j >= 0; --j){
                    childArr.unshift(child[j].createAndPushInstance(sim, inst));
                }
            }
            else{
                inst.childInstances[childName] = child.createAndPushInstance(sim, inst);
            }
        }
        //inst.send("wait", this.sub.length);
    },

    childInstance : function(sim, inst, name){
        return inst && inst.childInstances && inst.childInstances[name];
    },

    executionContext : function(sim, inst){
        return inst.funcContext;
    },

    upNext : function(sim, inst){
        // Evaluate subexpressions
        if (inst.index === "pushChildren"){
            this.pushChildInstances(sim, inst);
            inst.index = "afterChildren";
            inst.wait();
            return true;
        }
        else if (inst.index === "done"){
            this.done(sim, inst);
            return true;
        }
        return false;
    },

    stepForward : function(sim, inst){

    },

    explain : function(sim, inst){
        return {message: "[No explanation available.]", ignore: true};
    },
    describe : function(sim, inst){
        return {message: "[No description available.]", ignore: false};
    },
    /**
     *
     * @param {Note} note
     */
    addNote : function(note) {
        this.i_notes.push(note);
        if (note.getType() === Note.TYPE_ERROR) {
            this.i_hasErrors = true;
        }
        if (this.parent && this.i_auxiliaryLevel === this.parent.i_auxiliaryLevel) {
            this.parent.addNote(note);
        }
    },

    getNotes : function() {
        return this.i_notes;
    },

    hasErrors : function() {
        return this.i_hasErrors;
    },

    getSourceReference : function() {
        return this.i_translationUnit.getSourceReferenceForConstruct(this);
    },

    isAuxiliary : function() {
        return this.i_auxiliaryLevel > 0;
    },

    isImplicit : function() {
        return this.i_isImplicit;
    },

    containingFunction : function() {
        return this.i_containingFunction;
    }
});

var FakeConstruct = Class.extend({
    _name : "FakeConstruct",

    init: function () {

        this.id = CPPConstruct._nextId++;
        this.children = [];

        // this.i_notes = [];
        // this.i_hasErrors = false;

        // this.i_setContext(context);
    },


    getSourceReference : function() {
        return null;
    }
});

var FakeDeclaration = FakeConstruct.extend({
    _name : FakeDeclaration,

    init : function(name, type) {
        this.initParent();
        this.name = name;
        this.type = type;
    }
});


var CPPConstructInstance = Lobster.CPPConstructInstance = Class.extend(Observable,{
    _name: "CPPConstructInstance",
    //silent: true,
    init: function (sim, model, index, stackType, parent) {
        this.initParent();
        this.sim = sim;
        this.model = model;
        this.index = index;

        this.stackType = stackType;

        this.subCalls = [];
        this.parent = parent;
        this.pushedChildren = {};
        assert(this.parent || this.model.i_isMainCall, "All code instances must have a parent.");
        assert(this.parent !== this, "Code instance may not be its own parent");
        if (this.parent) {

            if (this.stackType != "call") {
                this.parent.pushChild(this);
            }
            else {
                this.parent.pushSubCall(this);
            }

            // Will be replaced later in call instance subclass with self
            this.funcContext = this.parent.funcContext;

        }

        if (this.model.i_isMainCall){
            this.funcContext = this;
        }

        this.stepsTaken = sim.stepsTaken();
        this.pauses = {};
    },
    instanceString : function(){
        return "instance of " + this._name + " (" + this.model._name + ")";
    },
    stepForward : function(){
        return this.model.stepForward(this.sim, this);
    },
    upNext : function(){
        for(var key in this.pauses){
            var p = this.pauses[key];
            if (p.pauseWhenUpNext ||
                p.pauseAtIndex !== undefined && this.index == p.pauseAtIndex){
                this.sim.pause();
                p.callback && p.callback();
                delete this.pauses[key];
                break;
            }
        }
        this.send("upNext");
        this.funcContext.send("currentFunction");
        return this.model.upNext(this.sim, this);
    },
    setPauseWhenUpNext : function(){
        this.pauses["upNext"] = {pauseWhenUpNext: true};
    },
    wait : function(){
        this.send("wait");
    },
    done : function(){
        if (this.model.done){
            return this.model.done(this.sim, this);
        }
    },
    pushed : function(){
//		this.update({pushed: this});
    },
    popped : function(){
        this.hasBeenPopped = true;
        this.send("popped", this);
    },
    pushChild : function(child){
        this.pushedChildren[child.model.id] = child;
        this.send("childPushed", child);
    },
    pushSubCall : function(subCall){
        this.subCalls.push(subCall);
        this.send("subCallPushed", subCall);
    },
    setFrame : function(frame){
        this.frame = frame;
//		this.update({frameSet: this.frame});
    },
    findParent : function(stackType){
        if (stackType){
            var parent = this.parent;
            while(parent && parent.stackType != stackType){
                parent = parent.parent;
            }
            return parent;
        }
        else{
            return this.parent;
        }
    },
    findParentByModel : function(model){
        assert(isA(model, CPPConstruct));

        var parent = this.parent;
        while(parent && parent.model.id != model.id){
            parent = parent.parent;
        }
        return parent;
    },
    nearestReceiver : function(){
        return this.receiver || this.funcContext.receiver || this.parent && this.parent.nearestReceiver();
    },

    setEvalValue: function(value){
        this.evalValue = value;
        this.send("evaluated", this.evalValue);
    },

    executionContext : function(){
        return this.model.executionContext(this.sim, this);
    },

    explain : function(){
        return this.model.explain(this.sim, this);
    },
    describe : function(){
        return this.model.describe(this.sim, this);
    }
});


//var CPPCallInstance = Lobster.CPPCallInstance = CPPConstructInstance.extend({
//    init: function (sim, model, index, parent) {
//        this.initParent(sim, model, index, "call", parent);
//        this.funcContext = this;
//    }
//});




var ObjectEntity = CPP.ObjectEntity = CPP.CPPEntity.extend({
    _name: "ObjectEntity",
    storage: Class._ABSTRACT,

    init: function(name, type){
        this.initParent(name);
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
        if (isA(newValue, ObjectEntity)){
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
    },
    initialized : function(){
        this._initialized = true;
    },
    // TODO: doesn't work for class-type objects
    // ^^^ why not? looks like it should work to me
    // TODO: plot twist I should just remove this function. it's almost exclusively used to detect when
    // a function finishes without its return object being initialized. However, I feel like there are much
    // better ways to do this.
    isInitialized : function(){
        return !!this._initialized;
    }

});


var ThisObject = CPP.ThisObject = ObjectEntity.extend({
    _name: "ThisObject",
    storage: "automatic"
});

var StaticEntity = CPP.StaticEntity = CPP.DeclaredEntity.extend({
    _name: "StaticEntity",
    storage: "static",
    init: function(decl){
        this.initParent(decl);
    },
    objectInstance: function(){
        return StaticObjectInstance.instance(this);
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    lookup : function(sim, inst) {
        return sim.memory.staticLookup(this).lookup(sim, inst);
    }
});

var StringLiteralEntity = CPP.StringLiteralEntity = CPPEntity.extend({
    _name: "StringLiteralEntity",
    storage: "static",
    init: function(str){
        this.initParent(null);
        this.type = Types.Array.instance(Types.Char.instance(true), str.length + 1); // + 1 for null char
        this.i_str = str;
    },
    objectInstance : function() {
        return StringLiteralObject.instance(this.type);
    },
    instanceString : function(){
        return "string literal \"" + unescapeString(this.i_str) + "\"";
    },
    getLiteralString : function() {
        return this.i_str;
    },
    lookup : function(sim, inst) {
        return sim.memory.getStringLiteral(this.i_str);
    }
});



var StringLiteralObject = CPP.StringLiteralObject = CPP.ObjectEntity.extend({
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

var DynamicObject = CPP.DynamicObject = CPP.ObjectEntity.extend({
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

var AutoEntity = CPP.AutoEntity = CPP.DeclaredEntity.extend({
    _name: "AutoEntity",
    storage: "automatic",
    init: function(decl){
        this.initParent(decl);
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    objectInstance: function(){
        return AutoObjectInstance.instance(this);
    },
    lookup: function (sim, inst) {
        // We lookup first on the current stack frame and then call
        // lookup again in case it's a reference or something.
        return inst.funcContext.frame.lookup(this).lookup(sim, inst);
    },
    describe : function(){
        if (isA(this.decl, Declarations.Parameter)){
            return {message: "the parameter " + this.name};
        }
        else{
            return {message: "the local variable " + this.name};
        }
    }
});

//var TemporaryReferenceEntity = CPP.TemporaryReferenceEntity = CPP.CPPEntity.extend({
//    _name: "TemporaryReferenceEntity",
//    storage: "automatic",
//    init: function(refersTo){
//        assert(isA(refersTo, ObjectEntity));
//        this.initParent(refersTo.name);
//        this.type = decl.type;
//        this.decl = decl;
//    },
//    instanceString : function(){
//        return this.name + " (" + this.type + ")";
//    },
//    lookup: function (sim, inst) {
//        return inst.funcContext.frame.lookup(this);
//    }
//});

var AutoObjectInstance = CPP.AutoObjectInstance = CPP.ObjectEntity.extend({
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

var StaticObjectInstance = CPP.StaticObjectInstance = CPP.ObjectEntity.extend({
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



var ParameterEntity = CPP.ParameterEntity = CPP.CPPEntity.extend({
    _name: "ParameterEntity",
    storage: "automatic",
    init: function(func, num){
        assert(isA(func, FunctionEntity) || isA(func, PointedFunctionEntity));
        assert(num !== undefined);

        this.num = num;
        this.func = func;

        this.initParent("Parameter "+num+" of "+func.name);
        this.type = func.type.paramTypes[num];
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    objectInstance: function(){
        return AutoObjectInstance.instance(this);
    },
    lookup: function (sim, inst) {
        // In case function was polymorphic or a function pointer, look it up
        var func = this.func.lookup(sim, inst.parent);

        // Now we can look up object entity associated with this parameter
        var objEntity = func.definition.params[this.num].entity;

        return objEntity.lookup(sim, inst.calledFunction);
    },
    describe : function(){
        return {message: "parameter " + this.num + " of " + this.func.describe().message};
    }

});

var ReturnEntity = CPP.ReturnEntity = CPP.CPPEntity.extend({
    _name: "ReturnEntity",
    storage: "automatic",
    init: function(type){
        this.initParent("return value");
        this.type = type;
    },
    instanceString : function(){
        return "return value (" + this.type + ")";
    },
    lookup: function (sim, inst) {
        return inst.funcContext.model.getReturnObject(sim, inst.funcContext).lookup(sim, inst);
    }
});

var ReceiverEntity = CPP.ReceiverEntity = CPP.CPPEntity.extend({
    _name: "ReceiverEntity",
    storage: "automatic",
    init: function(type){
        assert(isA(type, Types.Class));
        this.initParent(type.className);
        this.type = type;
    },
    instanceString : function(){
        return "function receiver (" + this.type + ")";
    },
    lookup: function (sim, inst) {
        var rec = inst.memberOf || inst.funcContext.receiver;
        return rec.lookup(sim, inst);
    },
    describe : function(sim, inst){
        if (inst){
            return {message: "the receiver of this call to " + inst.funcContext.describe(sim, inst.funcContext).message + " (i.e. *this) "};
        }
        else {
            return {message: "the receiver of this call (i.e. *this)"};
        }
    }
});



var NewObjectEntity = CPP.NewObjectEntity = CPP.CPPEntity.extend({
    _name: "NewObjectEntity",
    storage: "automatic",
    init: function(type){
        this.initParent(null);
        this.type = type;
    },
    instanceString : function(){
        return "object (" + this.type + ")";
    },
    lookup: function (sim, inst) {
        return inst.allocatedObject.lookup(sim, inst);
    },
    describe : function(){
        return {message: "the object ("+this.type+") created by new"};
    }

});

var RuntimeEntity = CPP.RuntimeEntity = CPP.ObjectEntity.extend({
    _name: "RuntimeEntity",
    storage: "automatic",
    init: function(type, inst){
        this.initParent(null, type);
        this.inst = inst;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    lookup: function (sim, inst) {
        return this.inst.evalValue.lookup(sim, inst);
    }
});

var ArraySubobjectEntity = CPP.ArraySubobjectEntity = CPP.CPPEntity.extend({
    _name: "ArraySubobjectEntity",
    storage: "none",
    init: function(arrayEntity, index){
        assert(isA(arrayEntity.type, Types.Array));
        this.initParent(arrayEntity.name + "[" + index + "]");
        this.arrayEntity = arrayEntity;
        this.type = arrayEntity.type.elemType;
        this.index = index;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    lookup: function (sim, inst) {
        return this.arrayEntity.lookup(sim, inst).elemObjects[this.index].lookup(sim, inst);
    },
    objectInstance : function(arrObj){
        return ArraySubobject.instance(arrObj, this.index);
    },
    describe : function(){
        var desc = {};
        var arrDesc = this.arrayEntity.describe();
        desc.message = "element " + this.index + " of " + arrDesc.message;
        if (arrDesc.name){
            desc.name = arrDesc.name + "[" + this.index + "]";
        }
        return desc;
    }
});

var BaseClassSubobjectEntity = CPP.BaseClassSubobjectEntity = CPP.CPPEntity.extend({
    _name: "BaseClassSubobjectEntity",
    storage: "none",
    init: function(type, memberOfType, access){
        assert(isA(type, Types.Class));
        this.initParent(type.className);
        this.type = type;
        if (!this.type._isInstance){
            this.type = this.type.instance(); // TODO remove once type is actually passed in as instance
        }
        this.memberOfType = memberOfType;
        this.access = access;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    lookup: function (sim, inst) {
        var memberOf = inst.memberOf || inst.funcContext.receiver;

        while(memberOf && !isA(memberOf.type, this.type)){ // TODO: this isA should probably be changed to a type function
            memberOf = memberOf.type.getBaseClass() && memberOf.i_baseSubobjects[0];
        }
        assert(memberOf, "Internal lookup failed to find subobject in class or base classes.");

        return memberOf.lookup(sim, inst);
    },
    objectInstance : function(parentObj){
        return BaseClassSubobject.instance(this.type, parentObj);
    },
    describe : function(){
        return {message: "the " + this.name + " base object of " + this.memberOfType.className};
    }
});

var MemberSubobjectEntity = DeclaredEntity.extend({
    _name: "MemberSubobjectEntity",
    storage: "none",
    init: function(decl, memberOfType){
        this.initParent(decl);
        if (!this.type._isInstance){
            this.type = this.type.instance(); // TODO remove once type is actually passed in as instance
            assert(false); // TODO: I don't think this code actually gets used, so the above TODO could be resolved
        }
        this.memberOfType = memberOfType;
        this.access = decl.access;
    },
    instanceString : function(){
        return this.name + " (" + this.type + ")";
    },
    lookup: function (sim, inst) {
        var memberOf = inst.memberOf || inst.funcContext.receiver;

        while(memberOf && !memberOf.type.isInstanceOf(this.memberOfType)){
            memberOf = memberOf.type.getBaseClass() && memberOf.i_baseSubobjects[0];
        }

        assert(memberOf, "Internal lookup failed to find subobject in class or base classses.");

        return memberOf.getMemberSubobject(this.name).lookup(sim, inst); // I think the lookup here is in case of reference members?
    },
    objectInstance : function(parentObj){
        return MemberSubobject.instance(this.type, parentObj, this.name);
    },
    describe : function(sim, inst){
        if (inst){
            var memberOf = inst.memberOf || inst.funcContext.receiver;
            if (memberOf.name){
                return {message: this.memberOf.name + "." + this.name};
            }
            else{
                return {message: "the member " + this.name + " of " + memberOf.describe(sim, inst).message};
            }
        }
        else{
            return {message: "the " + this.name + " member of the " + this.memberOfType.className + " class"};
        }
    }
});

var AnonObject = CPP.AnonObject = CPP.ObjectEntity.extend({
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


var Subobject = CPP.Subobject = CPP.ObjectEntity.extend({
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



var TemporaryObjectEntity = CPP.TemporaryObjectEntity = CPP.CPPEntity.extend({
    _name: "TemporaryObjectEntity",
    storage: "temp",
    init: function(type, creator, owner, name){
        this.initParent(name || null);
        this.type = type;
        this.creator = creator;
        this.setOwner(owner);
    },
    setOwner : function(newOwner){
        if (newOwner === this.owner)
            if (this.owner){
                this.owner.removeTemporaryObject(this);
            }
        this.owner = newOwner;
        this.owner.addTemporaryObject(this);
    },
    updateOwner : function(){
        var newOwner = this.creator.findFullExpression();
        if (newOwner === this.owner){ return; }
        if (this.owner){
            this.owner.removeTemporaryObject(this);
        }
        this.owner = newOwner;
        this.owner.addTemporaryObject(this);
    },
    objectInstance: function(creatorInst){
        var obj = creatorInst.sim.memory.allocateTemporaryObject(this);

        var inst = creatorInst;
        while (inst.model !== this.owner){
            inst = inst.parent;
        }

        inst.temporaryObjects = inst.temporaryObjects || {};
        inst.temporaryObjects[obj.entityId] = obj;
        return obj;
    },
    lookup: function (sim, inst) {
        var ownerInst = inst;
        while (ownerInst.model !== this.owner){
            ownerInst = ownerInst.parent;
        }
        var tempObjInst = ownerInst.temporaryObjects[this.entityId];
        return tempObjInst && tempObjInst.lookup(sim, inst);
    }
});

var TemporaryObjectInstance = CPP.TemporaryObjectInstance = CPP.ObjectEntity.extend({
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

var FunctionEntity = CPP.FunctionEntity = CPP.DeclaredEntity.extend({
    _name: "FunctionEntity",
    init: function(decl){
        this.initParent(decl);
    },
    isStaticallyBound : function(){
        return true;
    },
    isVirtual : function(){
        return false;
    },
    instanceString : function() {
        return this.name;
    },
    nameString : function(){
        return this.name;
    },
    describe : function(sim, inst){
        return this.decl.describe(sim, inst);
    },
    isLinked : function() {
        return this.isDefined();
    },
    getPointerTo : function() {
        return Value.instance(this, this.type);
    }
});

var MagicFunctionEntity = CPP.MagicFunctionEntity = CPP.FunctionEntity.extend({
    init : function(decl) {
        this.initParent(decl);
        this.setDefinition(decl);
    }
});


var MemberFunctionEntity = CPP.MemberFunctionEntity = CPP.FunctionEntity.extend({
    _name: "MemberFunctionEntity",
    isMemberFunction: true,
    init: function(decl, containingClass, virtual){
        this.initParent(decl);
        this.i_containingClass = containingClass;
        this.virtual = virtual;
        this.pureVirtual = decl.pureVirtual;
        // May be set to virtual if it's discovered to be an overrider
        // for a virtual function in a base class

        this.checkForOverride();
    },
    checkForOverride : function(){
        if (!this.i_containingClass.getBaseClass()){
            return;
        }

        // Find the nearest overrider of a hypothetical virtual function.
        // If any are virtual, this one would have already been set to be
        // also virtual by this same procedure, so checking this one is sufficient.
        // If we override any virtual function, this one is too.
        var overridden = this.i_containingClass.getBaseClass().classScope.singleLookup(this.name, {
            paramTypes: this.type.paramTypes, isThisConst: this.type.isThisConst,
            exactMatch:true, own:true, noNameHiding:true});

        if (overridden && isA(overridden, FunctionEntity) && overridden.virtual){
            this.virtual = true;
            // Check to make sure that the return types are covariant
            if (!covariantType(this.type.returnType, overridden.type.returnType)){
                throw SemanticExceptions.NonCovariantReturnTypes.instance(this, overridden);
            }
        }
    },
    isStaticallyBound : function(){
        return !this.virtual;
    },
    isVirtual : function(){
        return this.virtual;
    },
    isLinked : function(){
        return this.virtual && this.pureVirtual || this.isDefined();
    },
    lookup : function(sim, inst){
        if (this.virtual){
            // If it's a virtual function start from the class scope of the dynamic type
            var receiver = inst.nearestReceiver().lookup(sim, inst);
            assert(receiver, "dynamic function lookup requires receiver");
            var dynamicType = receiver.type;

            // Sorry this is hacky :(
            // If it's a destructor, we look instead for the destructor of the dynamic type
            var func;
            if (isA(this.definition, DestructorDefinition)) {
                func = dynamicType.destructor;
            }
            else{
                func = dynamicType.classScope.singleLookup(this.name, {
                    paramTypes: this.type.paramTypes, isThisConst: this.type.isThisConst,
                    exactMatch:true, own:true, noNameHiding:true});
            }
            assert(func, "Failed to find virtual function implementation during lookup.");
            return func;
        }
        else{
            return this;
        }
    },
    suppressedVirtualProxy : function(){
        return this.proxy({
            virtual: false
        });
    }

});


var PointedFunctionEntity = CPP.PointedFunctionEntity = CPPEntity.extend({
    _name: "FunctionEntity",
    init: function(type){
        this.initParent("Unknown function of type " + type);
        this.type = type;
    },
    isStaticallyBound : function(){
        return true;
    },
    instanceString : function() {
        return this.name;
    },
    nameString : function(){
        return this.name;
    },
    lookup : function(sim, inst){
        return inst.pointedFunction.lookup(sim,inst);
    },
    isLinked : function(){
        return true;
    },
    isVirtual : function() {
        return false;
    }
});

//var FunctionEntityGroup = CPP.FunctionEntityGroup = CPP.CPPEntity.extend({
//    _name: "FunctionEntityGroup",
//    init: function(name){
//        this.initParent(name);
//        this.arr = [];
//    },
//    push : function(ent){
//        this.arr.push(ent);
//    },
//    instanceString : function() {
//        return this.name;
//    },
//    nameString : function(){
//        return this.name;
//    }
//});



var TypeEntity = CPP.TypeEntity = CPP.DeclaredEntity.extend({
    _name: "TypeEntity",
    init: function(decl){
        this.initParent(decl);
    },
    instanceString : function() {
        return "TypeEntity: " + this.type.instanceString();
    },
    nameString : function(){
        return this.name;
    }
});
















// Selects from candidates the function that is the best match
// for the arguments in the args array. Also modifies args so
// that each argument is amended with any implicit conversions
// necessary for the match.
// Options:
//   problems - an array that will be filled with an entry for each candidate
//              consisting of an array of any semantic problems that prevent it
//              from being chosen.

var convLen = function(args) {
    var total = 0;
    for (var i = 0; i < args.length; ++i) {
        total += args[i].conversionLength;
    }
    return total;
};

var overloadResolution = function(candidates, args, isThisConst, options){
    options = options || {};
    // Find the constructor
    var cand;
    var tempArgs;
    var viable = [];
    for(var c = 0; c < candidates.length; ++c){
        cand = candidates[c];
        tempArgs = [];
        var problems = [];
        options.problems && options.problems.push(problems);

        // Check argument types against parameter types
        var paramTypes = cand.paramTypes || cand.type.paramTypes;
        if (args.length !== paramTypes.length){
            problems.push(CPPError.param.numParams(args[i]));
        }
        else if (isThisConst && cand.isMemberFunction && !cand.type.isThisConst){
            problems.push(CPPError.param.thisConst(args[i]));
        }
        else{
            for(var i = 0; i < args.length; ++i){
                if (isA(paramTypes[i], Types.Reference)){
                    tempArgs.push(args[i]);
                    if(!referenceCompatible(args[i].type, paramTypes[i].refTo)){
                        problems.push(CPPError.param.paramReferenceType(args[i], args[i].type, paramTypes[i]));
                    }
                    //else if (args[i].valueCategory !== "lvalue"){
                    //    problems.push(CPPError.param.paramReferenceLvalue(args[i]));
                    //}
                }
                else{
                    tempArgs.push(standardConversion(args[i], paramTypes[i]));
                    if(!sameType(tempArgs[i].type, paramTypes[i])){
                        problems.push(CPPError.param.paramType(args[i], args[i].type, paramTypes[i]));
                    }

                }
            }
        }

        if (problems.length == 0) {
            viable.push({
                cand: cand,
                args: tempArgs.clone()
            });
        }
    }

    if (viable.length == 0){
        return null;
    }


    var selected = viable[0];
    var bestLen = convLen(selected.args);
    for(var i = 1; i < viable.length; ++i){
        var v = viable[i];
        var vLen = convLen(v.args);
        if (vLen < bestLen){
            selected = v;
            bestLen = vLen;
        }
    }

    for(var i = 0; i < selected.args.length; ++i){
        args[i] = selected.args[i];
    }

    return selected.cand;
};

// TODO: clean this up so it doesn't depend on trying to imitate the interface of an expression.
// Probably would be best to just create an "AuxiliaryExpression" class for something like this.
var fakeExpressionsFromTypes = function(types){
    var exprs = [];
    for (var i = 0; i < types.length; ++i){
        exprs[i] = AuxiliaryExpression.instance(types[i]);
        // exprs[i] = {type: types[i], ast: null, valueCategory: "prvalue", context: {parent:null}, parent:null, conversionLength: 0};
    }
    return exprs;
};










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
    // Takes in a Value or ObjectEntity of pointer type. Must point to an object type
    // Returns the most recently allocated object at the given address.
    // This may be an object which is no longer alive (has been deallocated).
    getObject: function(ptr, type){
        assert(isA(ptr, Value) || isA(ptr, ObjectEntity));
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
    props : {
        scope: {type: FunctionBlockScope},
        memory: {type: Memory},
        start: {type: "number"},
        size: {type: "number"}
    },
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
            var obj = ThisObject.instance("this", Types.ObjectPointer.instance(funcInst.receiver));

            // Allocate object
            this.memory.allocateObject(obj, addr);
            obj.setValue(funcInst.receiver.getPointerTo());
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

    lookup : function(entity){
        // Extra lookup will do nothing for auto objects, but will find actual
        // object for references.
        return this.objects[entity.entityId].lookup();
    },
    referenceLookup : function(entity){
        return this.references[entity.entityId].lookup();
    },
    setUpReferenceInstances : function(){
        var self = this;
        this.scope.referenceObjects.forEach(function(ref){
            self.references[ref.entityId] = ref.autoInstance();
            //self.memory.allocateObject(ref, addr);
            //addr += ref.type.size;
        });
    }

});

//var entityLookup = function (sim) {
//    var stackFrame = sim.memory.stack.topFrame();
////        var globalFrame = sim.memory.globalFrame;
//    var obj = stackFrame.lookup(this.entity);// || globalFrame.lookup(this.entity);
//    inst.setEvalValue(obj);
//}
