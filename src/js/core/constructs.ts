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
import { Type, ClassType } from "./types";
import { Note, CPPError, Description, Explanation } from "./errors";
import { Value, MemoryFrame } from "./runtimeEnvironment";
import { CPPObject } from "./objects";
import * as Util from "../util/util";

export interface ASTNode {
    construct_type: string;
    code?: SourceCode;
    library_id?: number;
    library_unsupported?: boolean;
};

export interface ConstructContext {
    translationUnit: TranslationUnit;
    contextualScope: Scope;
    source?: SourceCode;
    implicit?: boolean;
    libraryId?: number;
    libraryUnsupported?: boolean;
}

export class GlobalProgramConstruct {
    // public readonly contextualScope: Scope;
    // public readonly translationUnit: TranslationUnit;
    // public readonly isImplicit = false;
    // public readonly isAuxiliary = false;

    // public addChild(child: CPPConstruct) {
    //     // Do nothing lol we don't care to collect them here
    // }
}

export abstract class CPPConstruct {

    private static NEXT_ID = 0;
    // initIndex: "pushChildren",

    // i_childrenToCreate : [],
    // i_childrenToConvert : {},
    // i_childrenToExecute : [],

    public static createFromAST(ast: ASTNode, context: ConstructContext) {

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
        return new constructCtor(ast, context);
    }
    //
    // createWithChildren : function(children, context) {
    //     var construct = this.instance(context);
    //     this.i_createWithChildrenImpl(construct, children, context);
    //
    //     return construct;
    // },
    
    public readonly id: number;

    public readonly notes: Note[] = []; 
    public readonly hasErrors: boolean = false;

    public readonly context: ConstructContext;
    public readonly translationUnit: TranslationUnit;
    public readonly contextualScope: Scope;
    public readonly source?: SourceCode;
    public readonly isImplicit?: boolean;
    public readonly libraryId?: number;
    public readonly isLibraryUnsupported?: boolean;

    public readonly parent?: CPPConstruct | GlobalProgramConstruct;
    public readonly children: CPPConstruct[] = [];
    
    protected constructor(context: ConstructContext) {
        this.id = CPPConstruct.NEXT_ID++;

        this.context = context;
        this.translationUnit = context.translationUnit;
        this.contextualScope = context.contextualScope
        if (context.source) { this.source = context.source; }
        if (context.implicit) { this.isImplicit = true; }

        // TODO: figure out library stuff
        // if (context.libraryId) {
        //     this.libraryId = context.libraryId;
        // }
        // if (context.libraryUnsupported) {
        //     this.isLibraryUnsupported = true;
        // }

        
        // TODO: figure out library stuff
        // If the parent is an usupported library construct, so are its children (including this one)
        // if (this.parent && this.parent.library_unsupported) {
        //     this.i_library_unsupported = true;
        // }

        // If this contruct is NOT auxiliary WITH RESPECT TO ITS PARENT (as indicated by context.auxiliary), then we should
        // add it as a child. Otherwise, if this construct is auxiliary in that sense we don't.
        // if (context.parent) {
        //     // This cast here is a hack to get around the type system not liking
        //     // the fact that addChild is public in GlobalProgramConstruct but private in CPPConstruct
        //     // (the union type only contains the public methods)
        //     (<CPPConstruct>this.parent).addChild(this);
        // }
    }

    public addChild(child: CPPConstruct) {
        this.children.push(child);
        (<CPPConstruct|GlobalProgramConstruct>child.parent) = this;

        //TODO: add all notes from child?
        //TODO: if child has errors, this has errors
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

    // public getSourceText() {
    //     return this.ast.code ? this.ast.code.text : "an expression";
    // }

    public isLibraryConstruct() {
        return this.libraryId !== undefined;
    }

    public getLibraryId() {
        return this.libraryId;
    }

    // compile: function() {
    //     this.i_compileChildren();
    // },

    // i_compileChildren: function() {
    //     for(var i = 0; i < this.i_childrenToCreate.length; ++i) {
    //         var childName = this.i_childrenToCreate[i];
    //         this[childName].compile();
    //     }
    // },

    // public tryCompile() {
    //     try{
    //         this.compile.apply(this, arguments);
    //     }
    //     catch(e){
    //         if (e instanceof SemanticException) {
    //             this.addNote(e.annotation(this));
    //         }
    //         else{
    //             throw e;
    //         }
    //     }
    // }

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

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) : Explanation {
        return {message: "[No explanation available.]", ignore: true};
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) : Description {
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

export interface ExecutableConstruct extends CPPConstruct {
    readonly parent?: ExecutableConstruct; // TODO: is this increased specificity necessary now that parent can be undefined
    readonly containingFunction: FunctionDefinition;
}

export interface ExecutableConstructContext extends ConstructContext {
    readonly containingFunction: FunctionDefinition;
}

export abstract class InstructionConstruct extends CPPConstruct implements ExecutableConstruct {

    public readonly parent?: ExecutableConstruct;

    public readonly containingFunction: FunctionDefinition;
    
    protected constructor(context: ExecutableConstructContext) {
        super(context);

        // Use containing function from context or inherit from parent
        this.containingFunction = context.containingFunction;
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


export abstract class UnsupportedConstruct extends CPPConstruct {

    // propetry expected of subclasses. For efficiency, they can define it using
    // Util.addDefaultPropertiesToPrototype
    protected abstract readonly unsupportedName: string;

    public compile() {
        this.addNote(CPPError.lobster.unsupported(this, this.unsupportedName));
    }
}


export abstract class RuntimeConstruct<Construct_type extends ExecutableConstruct = ExecutableConstruct> {

    public readonly observable = new Observable(this);

    public readonly sim: Simulation;
    public readonly model: Construct_type;
    public readonly stackType: string;

    public readonly pushedChildren: {[index: string]: RuntimeConstruct};

    private readonly parent: RuntimeConstruct;
    public abstract readonly containingRuntimeFunction: RuntimeFunction;

    public readonly stepsTaken: number;
    public readonly isActive: boolean = false;

    // TODO: refactor pauses. maybe move them to the implementation
    private pauses: {[index:string]: any} = {}; // TODO: remove any type
    
    public constructor (model: Construct_type, stackType: string, parent: RuntimeConstruct) {
        this.model = model;

        this.stackType = stackType;

        this.parent = parent;
        this.sim = parent.sim;
        this.pushedChildren = {}; // TODO: change name (the children are not necessarily pushed)
        assert(this.parent !== this, "Code instance may not be its own parent");
        
        // if (this.parent) {

            this.parent.addChild(this);


        // }

        this.stepsTaken = sim.stepsTaken();
    }

    /**
     * REQUIRES: this instance is on the top of the execution stack
     */
    public stepForward() {
        this.observable.send("stepForward");
        return this.stepForwardImpl();
    }

    protected abstract stepForwardImpl() : void;

    public upNext() {
        for(var key in this.pauses){
            var p = this.pauses[key];
            if (p.pauseWhenUpNext //||
                // p.pauseAtIndex !== undefined && this.index == p.pauseAtIndex){
            ){
                this.sim.pause();
                p.callback && p.callback();
                delete this.pauses[key];
                break;
            }
        }
        this.observable.send("upNext");
        return this.upNextImpl();
    }

    protected abstract upNextImpl() : void;

    public setPauseWhenUpNext() {
        this.pauses["upNext"] = {pauseWhenUpNext: true};
    }

    protected wait() {
        this.observable.send("wait");
    }

    public pushed() {
        (<boolean>this.isActive) = true;
        this.observable.send("pushed");
    }

    public popped() {
        (<boolean>this.isActive) = false;
        this.observable.send("popped", this);
    }

    private addChild(child: RuntimeConstruct) {
        this.pushedChildren[child.model.id] = child;
        this.observable.send("childPushed", child);
    }
    
    // findParent : function(stackType){
    //     if (stackType){
    //         var parent = this.parent;
    //         while(parent && parent.stackType != stackType){
    //             parent = parent.parent;
    //         }
    //         return parent;
    //     }
    //     else{
    //         return this.parent;
    //     }
    // },

    public findParentByModel(model: ExecutableConstruct) {
        var parent = this.parent;
        while(parent && parent.model.id != model.id){
            parent = parent.parent;
        }
        return parent;
    }

    public contextualReceiver() {
        return this.containingRuntimeFunction.receiver;
    }

    public explain() {
        return this.model.explain(this.sim, this);
    }

    public describe() {
        return this.model.describe(this.sim, this);
    }
}

// TODO: this is just the same as RuntimeConstruct right now
export type ExecutableRuntimeConstruct = RuntimeConstruct;// = RuntimeFunction | RuntimeInstruction;

export abstract class RuntimeInstruction<Construct_type extends InstructionConstruct = InstructionConstruct>
    extends RuntimeConstruct<Construct_type> {
    
    public readonly containingRuntimeFunction: RuntimeFunction;

    public constructor (model: Construct_type, stackType: string, parent: ExecutableRuntimeConstruct) {
        super(model, stackType, parent);
        this.containingRuntimeFunction = parent.containingRuntimeFunction;
    }
}

export class RuntimeFunction extends RuntimeConstruct<FunctionDefinition> {

    public readonly caller: RuntimeFunctionCall;
    public readonly containingRuntimeFunction: RuntimeFunction;

    public readonly stackFrame?: MemoryFrame;
    public readonly returnObject?: CPPObject;

    public readonly hasControl: boolean = false;

    public constructor (model: FunctionDefinition, parent: RuntimeFunctionCall) {
        super(model, "function", parent);
  
        // A function is its own containing function context
        this.containingRuntimeFunction = this;

        this.caller = parent;
    }

    public setReturnObject(returnObject: CPPObject) {
        (<CPPObject>this.returnObject) = returnObject;
    }

    

    // setCaller : function(caller) {
    //     this.i_caller = caller;
    // },

    public pushStackFrame() {
        (<MemoryFrame>this.stackFrame) = this.sim.memory.stack.pushFrame(this);
    }

    public gainControl() {
        (<boolean>this.hasControl) = true;
        this.observable.send("gainControl");
    }

    public loseControl() {
        (<boolean>this.hasControl) = true;
        this.observable.send("loseControl");
    }

    // private encounterReturnStatement : function() {
    //     this.i_returnStatementEncountered = true;
    // },

    // returnStatementEncountered : function() {
    //     return this.i_returnStatementEncountered;
    // }
}

export class RuntimeMemberFunction extends RuntimeFunction {

    public readonly receiver: CPPObject<ClassType>;

    public constructor (model: FunctionDefinition, parent: RuntimeFunctionCall, receiver: CPPObject<ClassType>) {
        super(model, parent);
        this.receiver = receiver;
    }

}

export class RuntimeExpression extends RuntimeInstruction {
    
    public readonly evalValue?: Value | CPPObject;

    public setEvalValue(value: Value) {
        (<Value>this.evalValue) = value;
        this.observable.send("evaluated", this.evalValue);
    }
    
}

export class RuntimeFunctionCall extends RuntimeInstruction {

    public readonly calledFunction: RuntimeFunction;
}

export class RuntimeMemberFunctionCall extends RuntimeFunctionCall {
    
    public readonly calledFunction: RuntimeMemberFunction;
}

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

