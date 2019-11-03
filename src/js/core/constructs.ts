import { Program, TranslationUnit, SourceReference } from "./Program";
import { Scope, TemporaryObjectEntity } from "./entities";
import { Note, NoteKind, CPPError } from "./errors";
import { asMutable, Mutable, assertFalse, assert } from "../util/util";
import { Simulation } from "./Simulation";
import { Observable } from "../util/observe";
import { RuntimeFunction, FunctionLocals, FunctionContext } from "./functions";
import { ObjectType, ClassType } from "./types";
import { TemporaryObject } from "./objects";
import { GlobalObjectDefinition, CompiledGlobalObjectDefinition } from "./declarations";



export interface Description {
    name?: string;
    message: string;
    ignore?: boolean; // TODO: check what this is used for
}

export interface Explanation {
    message: string;
    ignore?: boolean; // TODO: check what this is used for
}


export interface ASTNode {
    // readonly construct_type: string;
    readonly source: {
        readonly start : number;
        readonly end : number;
        readonly text : string;
        readonly line : number;
        readonly column : number;
    };
    readonly library_id?: number;
    readonly library_unsupported?: boolean;
};

export interface ProgramContext {
    readonly program: Program;
    readonly implicit?: boolean;
    readonly libraryId?: number;
    readonly libraryUnsupported?: boolean;
}

export interface TranslationUnitContext extends ProgramContext {
    readonly translationUnit: TranslationUnit;
    readonly contextualScope: Scope;
    readonly containingClass?: ClassType;
}

export function createTranslationUnitContext(context: ProgramContext, translationUnit: TranslationUnit, contextualScope: Scope) : TranslationUnitContext {
    return Object.assign({}, context, {translationUnit: translationUnit, contextualScope: contextualScope });
}

export abstract class CPPConstruct<ContextType extends ProgramContext = ProgramContext, ASTType extends ASTNode = ASTNode> {

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

    public readonly context: ContextType;

    public readonly ast?: ASTType;
    public readonly sourceReference?: SourceReference;

    // public readonly libraryId?: number;
    // public readonly isLibraryUnsupported?: boolean;

    public abstract readonly parent?: CPPConstruct;
    public readonly children: readonly CPPConstruct[] = [];
    
    protected constructor(context: ContextType) {
        this.id = CPPConstruct.NEXT_ID++;

        this.context = context;

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

    protected abstract onAttach(parent: this["parent"]) : void;

    /**
     * Used by "createFromAST" static "named constructor" functions in derived classes
     * to set the AST from which a construct was created. Returns `this` for convenience.
     */
    public setAST(this: CPPConstruct<TranslationUnitContext>, ast: ASTType) : this & {ast: ASTType} {
        asMutable(this).ast = ast;
        if (!ast.source) {
            assertFalse("AST source is undefined. A track() call is likely missing in the grammar.");
        }
        asMutable(this).sourceReference = this.context.translationUnit.getSourceReference(ast.source.line, ast.source.column, ast.source.start, ast.source.end);
        return <this & {ast: ASTType}><any>this; // TODO: this whole function is going to go away, so this ugly cast will too
    }

    // public getSourceText() {
    //     return this.ast.code ? this.ast.code.text : "an expression";
    // }

    // public isLibraryConstruct() {
    //     return this.libraryId !== undefined;
    // }

    // public getLibraryId() {
    //     return this.libraryId;
    // }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) : Explanation {
        return {message: "[No explanation available.]", ignore: true};
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) : Description {
        return {message: "[No description available.]", ignore: false};
    }

    public addNote(note: Note) {
        this.notes.push(note);
        if (note.kind === NoteKind.ERROR) {
            (<Mutable<this>>this).hasErrors = true;
        }
        // if (this.parent && this.i_auxiliaryLevel === this.parent.i_auxiliaryLevel) {
        //     this.parent.addNote(note);
        // }
    }

    // getNotes : function() {
    //     return this.i_notes;
    // },
    public getNearestSourceReference(this: CPPConstruct<TranslationUnitContext>) {
        let construct : CPPConstruct = this;
        while (!construct.sourceReference && construct.parent) {
            construct = construct.parent;
        }
        return construct.sourceReference || this.context.translationUnit.getSourceReference(0,0,0,0);
    }
}

export interface SuccessfullyCompiled {
    
    // _t_isCompiled is here to prevent (otherwise) structurally equivalent non-compiled constructs
    // from being assignable to a compiled expression type
    // TODO: maybe better to use a symbol here?
    readonly _t_isCompiled: never;
}


export interface CompiledConstruct extends CPPConstruct, SuccessfullyCompiled {

}

export type StackType = "statement" | "expression" |  "function" | "initializer" |"call";

export abstract class RuntimeConstruct<C extends CompiledConstruct = CompiledConstruct> {

    public readonly observable = new Observable(this);

    public readonly sim: Simulation;
    public readonly model: C;
    public readonly stackType: StackType;

    public readonly pushedChildren: {[index: string]: RuntimeConstruct} = {}; // TODO: change name (the children are not necessarily pushed)

    public readonly parent?: RuntimeConstruct;

    /**
     * WARNING: The containingRuntimeFunction property may be undefined, even though it's type suggests it will always
     * be defined. In most places where it is accessed, there is an implicit assumption that a runtime construct
     * situated inside a function is being used (e.g. looking up an entity that depends on a local function) and the
     * client code would end up needing a non-null assertion anyway. Those non-null assertions are annoying, so
     * instead we trick the type system and trust that this property will be used appropriately by the programmer.
     */
    public readonly containingRuntimeFunction!: RuntimeFunction;

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

        // for(var key in this.pauses){
        //     var p = this.pauses[key];
        //     if (p.pauseWhenUpNext //||
        //         // p.pauseAtIndex !== undefined && this.index == p.pauseAtIndex){
        //     ){
        //         this.sim.pause();
        //         p.callback && p.callback();
        //         delete this.pauses[key];
        //         break;
        //     }
        // }

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

    public findParentByModel(model: CPPConstruct) {
        var parent = this.parent;
        while(parent && parent.model.id != model.id){
            parent = parent.parent;
        }
        return parent;
    }

    public explain() : Explanation {
        return this.model.explain(this.sim, this);
    }

    public describe() : Description {
        return this.model.describe(this.sim, this);
    }
}





export class BasicCPPConstruct<ContextType extends TranslationUnitContext = TranslationUnitContext, ASTType extends ASTNode = ASTNode> extends CPPConstruct<ContextType, ASTType> {

    public parent?: CPPConstruct;

    public constructor(context: ContextType) {
        super(context);
    }

    public onAttach(parent: CPPConstruct) {
        (<Mutable<this>>this).parent = parent;
    }
}

export class InvalidConstruct extends BasicCPPConstruct {

    public readonly note: Note;

    public constructor(context: TranslationUnitContext, errorFn: (construct: CPPConstruct) => Note) {
        super(context);
        this.addNote(this.note = errorFn(this));
    }

}

export abstract class PotentialFullExpression<ContextType extends TranslationUnitContext = TranslationUnitContext, ASTType extends ASTNode = ASTNode> extends BasicCPPConstruct<ContextType, ASTType> {
    
    public readonly parent?: BasicCPPConstruct; // Narrows type of parent property of CPPConstruct

    public readonly temporaryObjects: TemporaryObjectEntity[] = [];
    public readonly temporaryDeallocator?: TemporaryDeallocator;


    public onAttach(parent: BasicCPPConstruct) {

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

    public createTemporaryObject<T extends ObjectType>(type: T, description: string) : TemporaryObjectEntity<T>{
        let fe = this.findFullExpression();
        var tempObjEnt = new TemporaryObjectEntity(type, this, fe, description);
        this.temporaryObjects[tempObjEnt.entityId] = tempObjEnt;
        return tempObjEnt;
    }
}

export interface CompiledPotentialFullExpression extends PotentialFullExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
}

export abstract class RuntimePotentialFullExpression<C extends CompiledPotentialFullExpression = CompiledPotentialFullExpression> extends RuntimeConstruct<C> {

    public readonly temporaryDeallocator?: RuntimeTemporaryDeallocator;
    public readonly temporaryObjects: {[index: number]: TemporaryObject | undefined} = {};

    public readonly containingFullExpression : RuntimePotentialFullExpression;

    public constructor(model: C, stackType: StackType, parent: RuntimeConstruct) {
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



export class TemporaryDeallocator extends BasicCPPConstruct {

    public readonly parent?: PotentialFullExpression;
    public readonly temporaryObjects: TemporaryObjectEntity[];

    // public readonly dtors: (MemberFunctionCall | null)[];

    public constructor(context: TranslationUnitContext, temporaryObjects: TemporaryObjectEntity[] ) {
        super(context);
        this.temporaryObjects = temporaryObjects;

        // TODO CLASSES: add back in destructor calls and dtors member function above
        // this.dtors = temporaryObjects.map((tempEnt) => {
        //     if (tempEnt.type instanceof ClassType) {
        //         var dtor = tempEnt.type.cppClass.destructor;
        //         if (dtor) {
        //             //MemberFunctionCall args are: context, function to call, empty args, receiver
        //             let dtorCall = new MemberFunctionCall(context, dtor, [], <TemporaryObjectEntity<ClassType>>tempEnt);
        //             this.attach(dtorCall);
        //             return dtorCall;
        //         }
        //         else{
        //             this.addNote(CPPError.declaration.dtor.no_destructor_temporary(tempEnt.creator, tempEnt));
        //             return null;
        //         }
        //     }
        // });
    }

    public createRuntimeConstruct(this: CompiledTemporaryDeallocator, parent: RuntimePotentialFullExpression) {
        return new RuntimeTemporaryDeallocator(this, parent);
    }

    // public isTailChild(child: ExecutableConstruct) {
    //     return {isTail: true};
    // }
}

export interface CompiledTemporaryDeallocator extends TemporaryDeallocator, SuccessfullyCompiled {

    // readonly dtors: (CompiledMemberFunctionCall | null)[];

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


        // let dtors = this.model.dtors;
        let dtors : readonly null[] = this.model.temporaryObjects.map(t => null); // TODO CLASSES: replace this hack with above
        if (this.index < dtors.length) {
            // let dtor = dtors[this.index];
            // if (!this.justDestructed && dtor) {
            //     dtor.createRuntimeConstruct(this);
            //     this.sim.push(dtor);
            //     this.justDestructed = true;
            // }
            // else {
                this.sim.memory.deallocateTemporaryObject(this.model.temporaryObjects[this.index].runtimeLookup(this));
                ++this.index;
                // this.justDestructed = false;
            // }
        }
        else{
            this.sim.pop();
        }
    }

    public stepForwardImpl() {
        return false;
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


export class UnsupportedConstruct extends BasicCPPConstruct {
    public constructor(context: TranslationUnitContext, unsupportedName: string) {
        super(context);
        this.addNote(CPPError.lobster.unsupported_feature(this, unsupportedName));
    }
}



// TODO: this is just the same as RuntimeConstruct right now
// export type ExecutableRuntimeConstruct = RuntimeConstruct; // RuntimeFunction | RuntimeInstruction;
// export interface ExecutableRuntimeConstruct extends RuntimeConstruct {
//     // readonly containingRuntimeFunction : RuntimeFunction;
// }
// export abstract class RuntimeInstruction<C extends CompiledInstructionConstruct = CompiledInstructionConstruct> extends RuntimeConstruct<C> {

//     public readonly containingRuntimeFunction: RuntimeFunction;
//     public readonly parent!: ExecutableRuntimeConstruct; // narrows type from base class to be for sure defined

//     public constructor (model: C, stackType: StackType, parent: ExecutableRuntimeConstruct) {
//         super(model, stackType, parent);
//         this.containingRuntimeFunction = parent.containingRuntimeFunction;
//     }
// }

// export interface 













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


export class RuntimeGlobalObjectAllocator {

    public readonly sim: Simulation;

    private index = 0;

    public constructor (sim: Simulation) {
       this.sim = sim;
    }
	
    protected upNextImpl() {

        let globalObjects = this.sim.program.globalObjects;

        // let dtors = this.model.dtors;
        if (this.index < globalObjects.length) {
            let objDef = globalObjects[this.index];
            this.sim.memory.allocateStatic(objDef);
            if (objDef.initializer) {
                this.sim.push(objDef.initializer.createRuntimeInitializer(this));
            }
            ++this.index;
        }
        else{
            this.sim.pop();
        }
    }

    public stepForwardImpl() {
        return false;
    }
}
