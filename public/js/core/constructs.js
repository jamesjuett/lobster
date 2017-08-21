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
        return (this.i_runtimeConstructClass || RuntimeConstruct).instance(sim, this, this.initIndex, this.instType, parent);
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


var RuntimeConstruct = Lobster.RuntimeConstruct = Class.extend(Observable,{
    _name: "RuntimeConstruct",
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

            // Inherit the containing function from parent. Derived classes (e.g. RuntimeFunction) may
            // overwrite this as needed (e.g. RuntimeFunction is its own containing function)
            this.i_containingRuntimeFunction = this.parent.i_containingRuntimeFunction;

        }

        this.stepsTaken = sim.stepsTaken();
        this.pauses = {};
    },

    /**
     * Returns the RuntimeFunction containing this runtime construct.
     * @returns {RuntimeFunction}
     */
    containingRuntimeFunction : function() {
        return this.i_containingRuntimeFunction;
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
    contextualReceiver : function(){
        return this.containingRuntimeFunction().getReceiver();
    },

    setEvalValue: function(value){
        this.evalValue = value;
        this.send("evaluated", this.evalValue);
    },

    explain : function(){
        return this.model.explain(this.sim, this);
    },
    describe : function(){
        return this.model.describe(this.sim, this);
    }
});

RuntimeFunction = RuntimeConstruct.extend({
    _name : "RuntimeFunction",

    init : function() {
        this.initParent.apply(this, arguments);
        this.i_containingRuntimeFunction = this;
        this.i_caller = this.parent;
    },

    setReturnObject : function(returnObject){
        this.i_returnObject = returnObject;
    },

    getReturnObject : function(){
        return this.i_returnObject;
    },

    setReceiver : function(receiver) {
        this.i_receiver = receiver;
    },

    getReceiver : function() {
        return this.i_receiver;
    },

    setCaller : function(caller) {
        this.i_caller = caller;
    },

    getCaller : function() {
        return this.i_caller;
    },

    pushStackFrame : function() {
        this.stackFrame = this.sim.memory.stack.pushFrame(this);
    },

    gainControl : function() {
        this.i_hasControl = true;
        this.send("gainControl");
    },

    loseControl : function() {
        delete this.i_hasControl;
        this.send("loseControl");
    },

    hasControl : function() {
        return this.i_hasControl;
    },

    encounterReturnStatement : function() {
        this.i_returnStatementEncountered = true;
    },

    returnStatementEncountered : function() {
        return this.i_returnStatementEncountered;
    }
});

/**
 * Represents either a dot or arrow operator at runtime.
 * Provides a context that may change how entities are looked up based
 * on the object the member is being accessed from. e.g. A virtual member
 * function lookup depends on the actual (i.e. dynamic) type of the object
 * on which it was called.
 */
RuntimeMemberAccess = RuntimeConstruct.extend({
    _name : "RuntimeMemberAccess",

    setObjectAccessedFrom : function(obj) {
        this.i_objectAccessedFrom = obj;
    },

    contextualReceiver : function(){
        return this.i_objectAccessedFrom;
    }
});

RuntimeNewInitializer = RuntimeConstruct.extend({
    _name : "RuntimeNewInitializer",

    setAllocatedObject : function(obj) {
        this.i_allocatedObject = obj;
    },
    getAllocatedObject : function() {
        return this.i_allocatedObject;
    }
});

