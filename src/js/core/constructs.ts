import { SourceReference, Program, TranslationUnit } from "./Program";
import { Scope, FunctionEntity, TemporaryObjectEntity } from "./entities";
import { ClassType, Type, ObjectType } from "./types";
import { Note, Explanation, Description, CPPError } from "./errors";
import { asMutable, Mutable, assertFalse, assert } from "../util/util";
import { standardConversion } from "./standardConversions";
import { Simulation } from "./Simulation";
import { Observable } from "../util/observe";
import { RuntimeFunction } from "./functions";
import { TemporaryObject } from "./objects";


export interface ASTNode {
    construct_type?: string;
    sourceReference?: SourceReference;
    library_id?: number;
    library_unsupported?: boolean;
};

export interface ConstructContext {
    program: Program;
    translationUnit: TranslationUnit;
    contextualScope: Scope;
    containingClass?: ClassType;
    implicit?: boolean;
    libraryId?: number;
    libraryUnsupported?: boolean;
}


// export function createConstructFromAST(ast: ASTNode, context: ConstructContext) {

//     // TODO: Determine if allowing detacted constructs is actually necessary
//     // if ast is actually already a (detatched) construct, just attach it to the
//     // provided context rather than creating a new one.
//     // if (isA(ast, CPPConstruct)) {
//     //     assert(!ast.isAttached());
//     //     if (context) {
//     //         if (context.auxiliary) {
//     //             return this.create(ast.ast, context);
//     //         }
//     //         else {
//     //             ast.attach(context);
//     //         }
//     //     }
//     //     return ast;
//     // }
//     TODO this //needs to be a separate function that calls createFromAST on individual types based on the AST
//     var constructCtor = CONSTRUCT_CLASSES[ast["construct_type"]];
//     assert(constructCtor !== undefined, "Unrecognized construct_type.");
//     return new constructCtor(ast, context);
// }

export abstract class CPPConstruct<ASTType = ASTNode> {

    public static readonly constructKind : symbol = Symbol("CPPConstruct");

    private static NEXT_ID = 0;
    // initIndex: "pushChildren",

    // i_childrenToCreate : [],
    // i_childrenToConvert : {},
    // i_childrenToExecute : [],
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

    public readonly ast?: ASTType;
    public readonly sourceReference?: SourceReference;

    public readonly isImplicit?: boolean;
    public readonly libraryId?: number;
    public readonly isLibraryUnsupported?: boolean;

    public abstract readonly parent?: CPPConstruct;
    public readonly children: readonly CPPConstruct[] = [];
    
    protected constructor(context: ConstructContext) {
        this.id = CPPConstruct.NEXT_ID++;

        this.context = context;
        this.translationUnit = context.translationUnit;
        this.contextualScope = context.contextualScope
        if (context.sourceReference) { this.sourceReference = context.sourceReference; }
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

    public attach(child: CPPConstruct) {
        asMutable(this.children).push(child);
        child.onAttach(this);
        // TODO: add notes from child?
    }

    public attachAll(children: readonly CPPConstruct[]) {
        children.forEach((child) => this.attach(child));
    }

    public abstract onAttach(parent: CPPConstruct) : void;

    // public addChild(child: CPPConstruct) {
    //     this.children.push(child);
    //     (<CPPConstruct|GlobalProgramConstruct>child.parent) = this;

    //     //TODO: add all notes from child?
    //     //TODO: if child has errors, this has errors
    // }

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

    /**
     * Used by "createFromAST" static "named constructor" functions in derived classes
     * to set the AST from which a construct was created. Returns `this` for convenience.
     */
    protected setAST(ast: ASTType) {
        (<Mutable<this>>this).ast = ast;
        if (ast.sourceReference) {
            this.sourceReference = this.sourceReference;
        }
        return this;
    }

    public get sourceReference() {
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

export interface CompiledConstruct {
    
    // _t_isCompiled is here to prevent (otherwise) structurally equivalent non-compiled constructs
    // from being assignable to a compiled expression type
    // TODO: maybe better to use a symbol here?
    readonly _t_isCompiled: never;
}

export class BasicCPPConstruct extends CPPConstruct {

    public parent?: CPPConstruct;

    public constructor(context: ConstructContext) {
        super(context);
    }

    public onAttach(parent: CPPConstruct) {
        (<Mutable<this>>this).parent = parent;
    }
}

export class InvalidConstruct extends BasicCPPConstruct {

    public readonly note: Note;

    public constructor(context: ConstructContext, errorFn: (construct: CPPConstruct) => Note) {
        super(context);
        this.addNote(this.note = errorFn(this));
    }

}

export interface ExecutableConstruct extends CPPConstruct {
    // readonly parent?: ExecutableConstruct; // TODO: is this increased specificity necessary now that parent can be undefined
    readonly containingFunction: FunctionEntity;
    readonly context: FunctionContext;
    
}

export interface CompiledConstruct {
    
    // _t_isCompiled is here to prevent (otherwise) structurally equivalent non-compiled constructs
    // from being assignable to a compiled expression type
    // TODO: maybe better to use a symbol here?
    readonly _t_isCompiled: never;
}

export interface CompiledExecutableConstruct extends CPPConstruct, CompiledConstruct {

}

export interface FunctionContext extends ConstructContext {
    readonly containingFunction: FunctionEntity;
}

export abstract class InstructionConstruct extends CPPConstruct {

    public abstract readonly parent?: ExecutableConstruct; // Narrows type of parent property of CPPConstruct
    // public readonly context!: ExecutableConstructContext; // TODO: narrows type of parent property, but needs to be done in safe way (with parent property made abstract)

    // public readonly containingFunction: FunctionEntity;
    
    protected constructor(context: ConstructContext) {
        super(context);

        // this.containingFunction = context.containingFunction;
    }

    // public abstract isTailChild(child: CPPConstruct) : {isTail: boolean};
}

export interface CompiledInstructionConstruct extends InstructionConstruct, CompiledConstruct {

}

export abstract class PotentialFullExpression extends InstructionConstruct {
    
    public readonly parent?: InstructionConstruct; // Narrows type of parent property of CPPConstruct

    public readonly temporaryObjects: TemporaryObjectEntity[] = [];
    public readonly temporaryDeallocator?: TemporaryDeallocator;


    public onAttach(parent: CPPConstruct) {

        if (!(parent instanceof InstructionConstruct)) {
            throw new Error("A PotentialFullExpression may only be attached to a parent that is an InstructionConstruct.");
        }

        (<Mutable<this>>this).parent = parent;

        // This may no longer be a full expression. If so, move temporary entities to
        // their new full expression.
        if (!this.isFullExpression()) {
            let fe = this.findFullExpression();
            this.temporaryObjects.forEach((tempEnt) => {
                fe.addTemporaryObject(tempEnt);
            });
            this.temporaryObjects.length = 0; // clear array
        }

        // Now that we are attached, the assumption is no more temporary entities
        // will be added to this construct or its attached children. (There's an
        // assert in addTemporaryObject() to prevent this.) That means it is now
        // safe to compile and add the temporary deallocator construct as a child.
        if(this.temporaryObjects.length > 0) {
            (<TemporaryDeallocator>this.temporaryDeallocator) = new TemporaryDeallocator(this.context, this.temporaryObjects);
            this.attach(this.temporaryDeallocator!);
        }
    }

    public isFullExpression() : boolean {
        if (!this.parent || !(this.parent instanceof PotentialFullExpression)) {
            return true;
        }

        return !this.parent.isFullExpression();
    }

    // TODO: this function can probably be cleaned up so that it doesn't require these ugly runtime checks
    /**
     * Returns the nearest full expression containing this expression (possibly itself).
     * @param inst
     */
    public findFullExpression() : PotentialFullExpression {
        if (this.isFullExpression()) {
            return this;
        }

        if (!this.parent || !(this.parent instanceof PotentialFullExpression)) {
            return assertFalse("failed to find full expression for " + this);
        }

        return this.parent.findFullExpression();
    }

    private addTemporaryObject(tempObjEnt: TemporaryObjectEntity) {
        assert(!this.parent, "Temporary objects may not be added to a full expression after it has been attached.")
        this.temporaryObjects.push(tempObjEnt);
        tempObjEnt.setOwner(this);
    }

    public createTemporaryObject<T extends ObjectType>(type: T, description: string) {
        let fe = this.findFullExpression();
        var tempObjEnt = new TemporaryObjectEntity(type, this, fe, description);
        this.temporaryObjects[tempObjEnt.entityId] = tempObjEnt;
        return tempObjEnt;
    }
}

export interface CompiledPotentialFullExpression extends PotentialFullExpression, CompiledConstruct {

}

export class TemporaryDeallocator extends InstructionConstruct {

    public readonly parent?: PotentialFullExpression;
    public readonly temporaryObjects: TemporaryObjectEntity[];

    public readonly dtors: (MemberFunctionCall | null)[];

    public constructor(context: FunctionContext, temporaryObjects: TemporaryObjectEntity[] ) {
        super(context);
        this.temporaryObjects = temporaryObjects;

        this.dtors = temporaryObjects.map((tempEnt) => {
            if (tempEnt.type instanceof ClassType) {
                var dtor = tempEnt.type.cppClass.destructor;
                if (dtor) {
                    //MemberFunctionCall args are: context, function to call, empty args, receiver
                    let dtorCall = new MemberFunctionCall(context, dtor, [], <TemporaryObjectEntity<ClassType>>tempEnt);
                    this.attach(dtorCall);
                    return dtorCall;
                }
                else{
                    this.addNote(CPPError.declaration.dtor.no_destructor_temporary(tempEnt.creator, tempEnt));
                    return null;
                }
            }
        });
    }

    public createRuntimeConstruct(parent: RuntimePotentialFullExpression) {
        return new RuntimeTemporaryDeallocator(this, parent);
    }

    /**
     * DO NOT CALL THIS FUNCTION. Instead, call parent.attach(child), which in turn calls this.
     * @param parent 
     */
    public onAttach(parent: InstructionConstruct) {
        (<InstructionConstruct>this.parent) = parent;

    }


    public isTailChild(child: ExecutableConstruct) {
        return {isTail: true};
    }
}

export interface CompiledTemporaryDeallocator extends TemporaryDeallocator, CompiledConstruct {

    readonly dtors: (CompiledMemberFunctionCall | null)[];

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

    public readonly parent?: ExecutableConstruct; // Narrows type of property in base class

    public constructor(context: ConstructContext, unsupportedName: string) {
        super(context);
        this.addNote(CPPError.lobster.unsupported_feature(this, unsupportedName));
    }

    public onAttach(parent: ExecutableConstruct) {
        (<Mutable<this>>this).parent = parent;
    }
}

export type StackType = "statement" | "expression" |  "function" | "initializer" |"call";

export abstract class RuntimeConstruct<C extends CompiledExecutableConstruct = CompiledExecutableConstruct> {

    public readonly observable = new Observable(this);

    public readonly sim: Simulation;
    public readonly model: C;
    public readonly stackType: StackType;

    public readonly pushedChildren: {[index: string]: RuntimeConstruct} = {}; // TODO: change name (the children are not necessarily pushed)

    public readonly parent?: RuntimeConstruct;
    public readonly containingRuntimeFunction?: RuntimeFunction;

    public readonly stepsTakenAtStart: number;
    public readonly isActive: boolean = false;

    public isDone: boolean = false;

    // TODO: refactor pauses. maybe move them to the implementation
    private pauses: {[index:string]: any} = {}; // TODO: remove any type
    
    public constructor (model: C, stackType: StackType, parentOrSim: RuntimeConstruct | Simulation) {
        this.model = model;
        this.stackType = stackType;
        
        if (parentOrSim instanceof RuntimeConstruct) {
            assert(this.parent !== this, "Code instance may not be its own parent");

            this.sim = parentOrSim.sim;
            assert(parentOrSim.sim === this.sim, "Runtime construct may not belong to a different simulation than its parent.")
            
            this.parent = parentOrSim;
            this.parent.addChild(this);

            if (parentOrSim.containingRuntimeFunction) {
                this.containingRuntimeFunction = parentOrSim.containingRuntimeFunction;
            }
        }
        else {
            this.sim = parentOrSim;
        }

        this.stepsTakenAtStart = this.sim.stepsTaken;
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
        this.observable.send("upNext");

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

        return this.upNextImpl();
    }

    protected abstract upNextImpl() : void;

    protected done() {
        this.isDone = true;
    }

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
// export type ExecutableRuntimeConstruct = RuntimeConstruct; // RuntimeFunction | RuntimeInstruction;
export interface ExecutableRuntimeConstruct extends RuntimeConstruct {
    readonly containingRuntimeFunction : RuntimeFunction;
}
// export abstract class RuntimeInstruction<C extends CompiledInstructionConstruct = CompiledInstructionConstruct> extends RuntimeConstruct<C> {

//     public readonly containingRuntimeFunction: RuntimeFunction;
//     public readonly parent!: ExecutableRuntimeConstruct; // narrows type from base class to be for sure defined

//     public constructor (model: C, stackType: StackType, parent: ExecutableRuntimeConstruct) {
//         super(model, stackType, parent);
//         this.containingRuntimeFunction = parent.containingRuntimeFunction;
//     }
// }


export abstract class RuntimePotentialFullExpression<C extends CompiledPotentialFullExpression = CompiledPotentialFullExpression> extends RuntimeConstruct<C> {

    public readonly temporaryDeallocator?: RuntimeTemporaryDeallocator;
    public readonly temporaryObjects: {[index: number]: TemporaryObject | undefined} = {};

    public readonly containingFullExpression : RuntimePotentialFullExpression;

    public constructor(model: C, stackType: StackType, parent: ExecutableRuntimeConstruct) {
        super(model, stackType, parent);
        if (this.model.temporaryDeallocator) {
            this.temporaryDeallocator = this.model.temporaryDeallocator.createRuntimeConstruct(this);
        }
        this.containingFullExpression = this.findFullExpression();
    }

    private findFullExpression() : RuntimePotentialFullExpression {

        let rt : RuntimeConstruct = this;
        while (rt instanceof RuntimePotentialFullExpression && !rt.model.isFullExpression() && rt.parent) {
            rt = rt.parent;
        }

        if (rt instanceof RuntimePotentialFullExpression) {
            return rt;
        }
        else {
            return assertFalse();
        }
    }

    protected done() {
        if (this.temporaryDeallocator) {
            this.sim.push(this.temporaryDeallocator);
        }
        super.done();
    }
}

export class RuntimeTemporaryDeallocator extends RuntimeConstruct<CompiledTemporaryDeallocator> {

    private index = 0;
    private justDestructed: boolean = false;

    public constructor (model: CompiledTemporaryDeallocator, parent: RuntimePotentialFullExpression) {
        super(model, "expression", parent);
    }
	
    protected upNextImpl() {

        // for (var key in this.temporaries){
        //     var tempObjInst = this.temporaries[key].runtimeLookup(sim, inst.parent);
        //     if (tempObjInst) {
        //         sim.memory.deallocateTemporaryObject(tempObjInst, inst);
        //     }
        // }
        // this.done(sim, inst);
        // return true;


        let dtors = this.model.dtors;
        if (this.index < dtors.length) {
            let dtor = dtors[this.index];
            if (!this.justDestructed && dtor) {
                dtor.createRuntimeConstruct(this);
                this.sim.push(dtor);
                this.justDestructed = true;
            }
            else {
                this.sim.memory.deallocateTemporaryObject(this.model.temporaryObjects[this.index].runtimeLookup(this));
                ++this.index;
                this.justDestructed = false;
            }
        }
        else{
            this.sim.pop();
        }
    }

    public stepForwardImpl() {
        return false;
    }
}








// /**
//  * Represents either a dot or arrow operator at runtime.
//  * Provides a context that may change how entities are looked up based
//  * on the object the member is being accessed from. e.g. A virtual member
//  * function lookup depends on the actual (i.e. dynamic) type of the object
//  * on which it was called.
//  */
// export var RuntimeMemberAccess = RuntimeConstruct.extend({
//     _name : "RuntimeMemberAccess",

//     setObjectAccessedFrom : function(obj) {
//         this.i_objectAccessedFrom = obj;
//     },

//     contextualReceiver : function(){
//         return this.i_objectAccessedFrom;
//     }
// });

// export var RuntimeNewInitializer = RuntimeConstruct.extend({
//     _name : "RuntimeNewInitializer",

//     setAllocatedObject : function(obj) {
//         this.i_allocatedObject = obj;
//     },
//     getAllocatedObject : function() {
//         return this.i_allocatedObject;
//     }
// });



// TODO: change this to a static initialization construct that properly checks
//       whether all static initializers are compiled.
export class GlobalExecutionConstruct extends CPPConstruct implements CompiledConstruct {
    
    public parent: undefined;
    public _t_isCompiled!: never;

    public onAttach(parent: CPPConstruct) {
        throw new Error("GlobalExecutionConstruct should never be attached as a child of another construct.");
    }

    public createRuntimeGlobalExecution() {

    }

}

export class RuntimeGlobalExecution extends RuntimeConstruct<GlobalExecutionConstruct> {

    protected stepForwardImpl(): void {
        throw new Error("Method not implemented.");
    }

    protected upNextImpl(): void {
        throw new Error("Method not implemented.");
    }

    
}
