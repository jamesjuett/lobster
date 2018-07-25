import assign from "lodash/assign";
import { Observable } from "../util/observe";
import { CONSTRUCT_CLASSES } from "./constructClasses";
import { assert } from "../util/util";
import { SourceCode } from "./lexical";
import { FunctionDefinition } from "./declarations";
import { Scope } from "./entities";
import { TranslationUnit } from "./Program";
import { SemanticException } from "./semanticExceptions";
import { Simulation } from "./Simulation";
import { Type } from "./types";
import { Note } from "./errors";

export interface ASTNode {
    construct_type: string;
    code?: SourceCode;
    library_id?: number;
    library_unsupported?: boolean;
};

export interface ConstructContext {
    implicit?: boolean;
    auxiliary?: boolean;
}

export class GlobalProgramConstruct {
    public readonly contextualScope: Scope;
    public readonly translationUnit: TranslationUnit;
    public readonly isImplicit = false;
    public readonly isAuxiliary = false;

    public addChild(child: CPPConstruct) {
        // Do nothing lol we don't care to collect them here
    }
}

export abstract class CPPConstruct {

    // _nextId: 0, // TODO: remove if not needed
    // initIndex: "pushChildren",

    // i_childrenToCreate : [],
    // i_childrenToConvert : {},
    // i_childrenToExecute : [],

    public static create(ast: ASTNode, parent: CPPConstruct, context: ConstructContext = {}) {

        // TODO: Determine if allowing detacted constructs is actually necessary
        // if ast is actually already a (detatched) construct, just attach it to the
        // provided context rather than creating a new one.
        // if (isA(ast, CPPConstruct)) {
        //     assert(!ast.isAttached());
        //     if (context) {
        //         if (context.auxiliary) {
        //             return this.create(ast.ast, context);
        //         }
        //         else {
        //             ast.attach(context);
        //         }
        //     }
        //     return ast;
        // }

        var constructCtor = CONSTRUCT_CLASSES[ast["construct_type"]];
        assert(constructCtor !== undefined, "Unrecognized construct_type.");
        return new constructCtor(ast, parent, context);
    }
    //
    // createWithChildren : function(children, context) {
    //     var construct = this.instance(context);
    //     this.i_createWithChildrenImpl(construct, children, context);
    //
    //     return construct;
    // },
    
    public readonly notes: Note[] = []; 
    public readonly hasErrors: boolean = false;

    public readonly parent: CPPConstruct | GlobalProgramConstruct; // TODO: check definite assignment assertions here and below
    public readonly children: CPPConstruct[] = [];
    public readonly contextualScope: Scope;
    public readonly translationUnit: TranslationUnit;
    public readonly isImplicit: boolean;
    public readonly isAuxiliary: boolean;

    public readonly ast: ASTNode;
    // public readonly code:

    public readonly isLibraryUnsupported?: boolean;
    public readonly libraryId?: number;

    // context parameter is often just parent code element in form
    // {parent: theParent}, but may also have additional information
    public constructor(ast: ASTNode, parent: CPPConstruct | GlobalProgramConstruct, context: ConstructContext) {
        // this.id = CPPConstruct._nextId++;

        this.ast = ast;

        // if (ast.code) {
        //     this.code = ast.code;
        // }

        // TODO: figure out library stuff
        // if (ast.library_id) {
        //     this.i_libraryId = ast.library_id;
        // }
        // if (ast.library_unsupported) {
        //     this.i_library_unsupported = true;
        // }

        this.parent = parent;

        // Use implicit from context or inherit from parent
        this.isImplicit = context.implicit || this.parent.isImplicit;

        this.isAuxiliary = context.auxiliary || this.parent.isAuxiliary;

        // If a contextual scope was specified, use that. Otherwise inherit from parent
        this.contextualScope = this.parent.contextualScope;

        // Use translation unit from context or inherit from parent
        this.translationUnit = this.parent && this.parent.translationUnit;

        
        // TODO: figure out library stuff
        // If the parent is an usupported library construct, so are its children (including this one)
        // if (this.parent && this.parent.library_unsupported) {
        //     this.i_library_unsupported = true;
        // }

        // If this contruct is NOT auxiliary WITH RESPECT TO ITS PARENT (as indicated by context.auxiliary), then we should
        // add it as a child. Otherwise, if this construct is auxiliary in that sense we don't.
        if (this.parent && !context.auxiliary) {
            // This cast here is a hack to get around the type system not liking
            // the fact that addChild is public in GlobalProgramConstruct but private in CPPConstruct
            // (the union type only contains the public methods)
            (<CPPConstruct>this.parent).addChild(this);
        }
    }

    private addChild(child: CPPConstruct) {
        this.children.push(child);
    }

    // TODO: remove if not needed
    // private attach(context: ConstructContext) {
    //     this.setContext(context);
    //     this.createFromAST(this.ast, context);
    //     (<boolean>this.isAttached) = true;
    // }

    /**
     * Default for derived classes, pulls children from i_childrenToCreate array.
     * Derived classes may also provide an override if they need customization (e.g. providing
     * a different scope in the context for children, getting extra properties from the AST, etc.)
     * @param ast
     */
    // protected abstract i_createFromAST(ast: ASTNode, context: ConstructContext) : void;
    // //     for(var i = 0; i < this.i_childrenToCreate.length; ++i) {
    // //         var childName = this.i_childrenToCreate[i];
    // //         this[childName] = this.i_createChild(ast[childName]);
    // //     }
    // // }

    // protected createChild(ast: ASTNode, context?: ConstructContext) {
    //     return CPPConstruct.create(ast, assign({parent:this}, context));
    // }

    // protected i_setContext(context: ConstructContext) {        
        
    // }

    public getSourceReference() {
        return this.translationUnit.getSourceReferenceForConstruct(this);
    }

    public hasSourceCode() {
        return !!this.ast.code;
    }

    public getSourceCode() {
        return this.ast.code;
    }

    // public getSourceText() {
    //     return this.ast.code ? this.ast.code.text : "an expression";
    // }

    public isLibraryConstruct() {
        return this.libraryId !== undefined;
    }

    public getLibraryId() {
        return this.libraryId;
    }

    /**
     * Default for derived classes, simply compiles children from i_childrenToCreate array.
     * Usually, derived classes will need to override (e.g. to do any typechecking at all)
     */
    public abstract compile() : void;
    // compile: function() {
    //     this.i_compileChildren();
    // },

    // i_compileChildren: function() {
    //     for(var i = 0; i < this.i_childrenToCreate.length; ++i) {
    //         var childName = this.i_childrenToCreate[i];
    //         this[childName].compile();
    //     }
    // },

    public tryCompile() {
        try{
            this.compile.apply(this, arguments);
        }
        catch(e){
            if (e instanceof SemanticException) {
                this.addNote(e.annotation(this));
            }
            else{
                throw e;
            }
        }
    }

    // createAndPushInstance : function(sim, parent){
    //     var inst = this.createInstance.apply(this, arguments);
    //     sim.push(inst);
    //     return inst;
    // },

    public createAndCompileChildExpr(ast: ASTNode, convertTo: Type) {
        var child = CPPConstruct.create(ast, this);
        child.tryCompile();
        if (convertTo){
            child = standardConversion(child, convertTo);
        }
        return child;
    }

    // public pushChildInstances : function(sim: Simulation, rtConstruct: RuntimeConstruct){

    //     inst.childInstances = inst.childInstances || {};
    //     for(var i = this.i_childrenToExecute.length-1; i >= 0; --i){
    //         var childName = this.i_childrenToExecute[i];
    //         var child = this[childName];
    //         if (Array.isArray(child)){
    //             // Note: no nested arrays, but that really seems unnecessary
    //             var childArr = inst.childInstances[childName] = [];
    //             for(var j = child.length-1; j >= 0; --j){
    //                 childArr.unshift(child[j].createAndPushInstance(sim, inst));
    //             }
    //         }
    //         else{
    //             inst.childInstances[childName] = child.createAndPushInstance(sim, inst);
    //         }
    //     }
    //     //inst.send("wait", this.sub.length);
    // },

    // childInstance : function(sim: Simulation, rtConstruct: RuntimeConstruct, name){
    //     return inst && inst.childInstances && inst.childInstances[name];
    // },

    // upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //     // Evaluate subexpressions
    //     if (inst.index === "pushChildren"){
    //         this.pushChildInstances(sim, inst);
    //         inst.index = "afterChildren";
    //         inst.wait();
    //         return true;
    //     }
    //     else if (inst.index === "done"){
    //         this.done(sim, inst);
    //         return true;
    //     }
    //     return false;
    // },

    // stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){

    // },

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct){
        return {message: "[No explanation available.]", ignore: true};
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct){
        return {message: "[No description available.]", ignore: false};
    }

    public addNote(note: Note) {
        this.notes.push(note);
        if (note.getType() === Note.TYPE_ERROR) {
            (<boolean>this.hasErrors) = true;
        }
        // if (this.parent && this.i_auxiliaryLevel === this.parent.i_auxiliaryLevel) {
        //     this.parent.addNote(note);
        // }
    }

    // getNotes : function() {
    //     return this.i_notes;
    // },
}

class InstructionConstruct extends CPPConstruct {

    public readonly parent!: FunctionDefinition | InstructionConstruct; // Assigned by base class ctor

    public readonly containingFunction: FunctionDefinition;
    
    public constructor(ast: ASTNode, parent: FunctionDefinition | InstructionConstruct, context: ConstructContext = {}) {
        super(ast, parent, context);

        // Use containing function from context or inherit from parent
        this.containingFunction = this.parent.containingFunction;
    }
    
    public isTailChild(child: CPPConstruct) {
        return {isTail: false};
    }
}

// TODO: FakeConstruct and FakeDeclaration are never used
// var FakeConstruct = Class.extend({
//     _name : "FakeConstruct",

//     init: function () {

//         this.id = CPPConstruct._nextId++;
//         this.children = [];

//         // this.i_notes = [];
//         // this.i_hasErrors = false;

//         // this.i_setContext(context);
//     },


//     getSourceReference : function() {
//         return null;
//     }
// });

// var FakeDeclaration = FakeConstruct.extend({
//     _name : FakeDeclaration,

//     init : function(name, type) {
//         this.initParent();
//         this.name = name;
//         this.type = type;
//     }
// });


export class RuntimeConstruct {

    public readonly observable = new Observable(this);
    
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
    }

    public done() {
        this.sim.pop(this);
    }

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
}

export var RuntimeFunction = RuntimeConstruct.extend({
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

export var RuntimeFunctionCall = RuntimeConstruct.extend({
    _name: "RuntimeFunctionCall",

    getRuntimeFunction : function() {
        return this.func;
    }
});

/**
 * Represents either a dot or arrow operator at runtime.
 * Provides a context that may change how entities are looked up based
 * on the object the member is being accessed from. e.g. A virtual member
 * function lookup depends on the actual (i.e. dynamic) type of the object
 * on which it was called.
 */
export var RuntimeMemberAccess = RuntimeConstruct.extend({
    _name : "RuntimeMemberAccess",

    setObjectAccessedFrom : function(obj) {
        this.i_objectAccessedFrom = obj;
    },

    contextualReceiver : function(){
        return this.i_objectAccessedFrom;
    }
});

export var RuntimeNewInitializer = RuntimeConstruct.extend({
    _name : "RuntimeNewInitializer",

    setAllocatedObject : function(obj) {
        this.i_allocatedObject = obj;
    },
    getAllocatedObject : function() {
        return this.i_allocatedObject;
    }
});

