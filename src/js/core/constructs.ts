import { Program, TranslationUnit, SourceReference } from "./Program";
import { Scope, TemporaryObjectEntity, FunctionEntity, AutoEntity, LocalVariableEntity, LocalReferenceEntity, BlockScope } from "./entities";
import { Note, NoteKind, CPPError, NoteRecorder } from "./errors";
import { asMutable, Mutable, assertFalse, assert } from "../util/util";
import { Simulation } from "./Simulation";
import { Observable } from "../util/observe";
import { ObjectType, ClassType, ReferenceType, NoRefType, VoidType, PotentialReturnType, Type } from "./types";
import { CPPObject } from "./objects";
import { GlobalObjectDefinition, CompiledGlobalObjectDefinition, CompiledFunctionDefinition } from "./declarations";
import { RuntimeBlock } from "./statements";
import { MemoryFrame } from "./runtimeEnvironment";
import { RuntimeFunctionCall } from "./functionCall";
import { PotentialFullExpression, RuntimePotentialFullExpression } from "./PotentialFullExpression";




export interface ConstructDescription {
    name?: string;
    message: string;
}

export interface Explanation {
    message: string;
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
    readonly translationUnit?: TranslationUnit;
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

export interface ExpressionContext extends TranslationUnitContext {
    readonly contextualParameterTypes?: readonly (Type | undefined)[];
    readonly contextualReceiverType?: ClassType;
}

export function createExpressionContext(context: TranslationUnitContext, contextualParameterTypes: readonly (Type | undefined)[]) : ExpressionContext {
    return Object.assign({}, context, {contextualParameterTypes: contextualParameterTypes});
}

export interface FunctionContext extends TranslationUnitContext {
    readonly containingFunction: FunctionEntity;
    readonly functionLocals: FunctionLocals;
}

export function createFunctionContext(context: TranslationUnitContext, containingFunction: FunctionEntity) : FunctionContext {
    return Object.assign({}, context, {containingFunction: containingFunction, functionLocals: new FunctionLocals()});
}

export interface BlockContext extends FunctionContext {
    readonly contextualScope: BlockScope;
}

export function isBlockContext(context: TranslationUnitContext) : context is BlockContext {
    return context.contextualScope instanceof BlockScope;
}

export abstract class CPPConstruct<ContextType extends ProgramContext = ProgramContext, ASTType extends ASTNode = ASTNode> {

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
    
    public readonly constructId: number;

    public readonly notes = new NoteRecorder();

    public readonly context: ContextType;

    public readonly ast?: ASTType;
    public readonly sourceReference?: SourceReference;

    // public readonly libraryId?: number;
    // public readonly isLibraryUnsupported?: boolean;

    public abstract readonly parent?: CPPConstruct;
    public readonly children: readonly CPPConstruct[] = [];
    
    protected constructor(context: ContextType) {
        this.constructId = CPPConstruct.NEXT_ID++;

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
        return {message: "[No explanation available.]"};
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct) : ConstructDescription {
        return {message: "[No description available.]"};
    }

    public addNote(note: Note) {
        this.notes.addNote(note);
        if (this.context.translationUnit) { this.context.translationUnit.addNote(note); }
        // if (this.parent && this.i_auxiliaryLevel === this.parent.i_auxiliaryLevel) {
        //     this.parent.addNote(note);
        // }
    }

    public getContainedNotes() {
        let allNotes = new NoteRecorder();
        allNotes.addNotes(this.notes.allNotes);
        this.children.forEach(child => allNotes.addNotes(child.getContainedNotes().allNotes));
        return allNotes;
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

export type TranslationUnitConstruct<ASTType extends ASTNode = ASTNode> = CPPConstruct<TranslationUnitContext, ASTType>;

export interface SuccessfullyCompiled {
    
    // _t_isCompiled is here to prevent (otherwise) structurally equivalent non-compiled constructs
    // from being assignable to a compiled expression type
    // TODO: maybe better to use a symbol here?
    readonly _t_isCompiled: never;
}


export interface CompiledConstruct extends CPPConstruct, SuccessfullyCompiled {

}

export type StackType = "statement" | "expression" |  "function" | "initializer" | "call";

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
    public readonly isDone: boolean = false;

    private cleanupConstruct?: RuntimeConstruct;
    private cleanupStarted: boolean = false;

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
        if (this.cleanupStarted) {
            this.sim.pop();
            return;
        }
        else {
            return this.upNextImpl();
        }
    }

    protected abstract upNextImpl() : void;

    public setPauseWhenUpNext() {
        this.pauses["upNext"] = {pauseWhenUpNext: true};
    }

    protected wait() {
        this.observable.send("wait");
    }

    public afterPushed() {
        (<boolean>this.isActive) = true;
        this.observable.send("pushed");
    }

    protected setCleanupConstruct(cleanupConstruct: RuntimeConstruct) {
        this.cleanupConstruct = cleanupConstruct;
    }

    public startCleanup() {

        // Cleanup should not be started if you have children pending on the stack
        assert(this === this.sim.top());
        
        this.cleanupStarted = true;
        if (this.cleanupConstruct) {
            this.sim.push(this.cleanupConstruct);
        }
        else {
            this.sim.pop();
        }
    }

    public afterPopped() {
        (<Mutable<this>>this).isDone = true;
        (<boolean>this.isActive) = false;
        this.observable.send("popped", this);
    }

    private addChild(child: RuntimeConstruct) {
        this.pushedChildren[child.model.constructId] = child;
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
        while(parent && parent.model.constructId != model.constructId){
            parent = parent.parent;
        }
        return parent;
    }

    public explain() : Explanation {
        return this.model.explain(this.sim, this);
    }

    public describe() : ConstructDescription {
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

export class FunctionLocals {

    public readonly localObjects: readonly AutoEntity[] = [];
    public readonly localReferences: readonly LocalReferenceEntity[] = [];
    public readonly localVariablesByEntityId: {
        [index: number] : LocalVariableEntity
    } = {};

    public registerLocalVariable(local: LocalVariableEntity) {
        assert(!this.localVariablesByEntityId[local.entityId]);
        this.localVariablesByEntityId[local.entityId] = local;
        if (local.kind === "AutoEntity") {
            asMutable(this.localObjects).push(local)
        }
        else {
            asMutable(this.localReferences).push(local);
        }
    }
}

enum RuntimeFunctionIndices {

}

export class RuntimeFunction<T extends PotentialReturnType = PotentialReturnType> extends RuntimeConstruct<CompiledFunctionDefinition> {

    public readonly caller?: RuntimeFunctionCall;
    // public readonly containingRuntimeFunction: this;

    public readonly stackFrame?: MemoryFrame;

    public readonly receiver?: CPPObject<ClassType>;

    /**
     * The object returned by the function, either an original returned-by-reference or a temporary
     * object created to hold a return-by-value. Once the function call has been executed, will be
     * defined unless it's a void function.
     */
    public readonly returnObject?: CPPObject<NoRefType<Exclude<T,VoidType>>>;

    public readonly hasControl: boolean = false;

    public readonly body: RuntimeBlock;

    public constructor (model: CompiledFunctionDefinition, sim: Simulation, caller: RuntimeFunctionCall | null, receiver?: CPPObject<ClassType>) {
        super(model, "function", caller || sim);
        if (caller) { this.caller = caller };
        this.receiver = receiver;
        // A function is its own containing function context
        // this.containingRuntimeFunction = this;
        this.body = this.model.body.createRuntimeStatement(this);
    }
    

    // setCaller : function(caller) {
    //     this.i_caller = caller;
    // },

    public pushStackFrame() {
        (<Mutable<this>>this).stackFrame = this.sim.memory.stack.pushFrame(this);
    }

    /**
     * Sets the return object for this function. May only be invoked once.
     * e.g.
     *  - return-by-value: The caller should set the return object to a temporary object, whose value
     *                     may be initialized by a return statement.
     *  - return-by-reference: When the function is finished, is set to the object returned.
     */
    public setReturnObject<T extends ObjectType | ReferenceType>(this: RuntimeFunction<T>, obj: CPPObject<NoRefType<T>>) {
        // This should only be used once
        assert(!this.returnObject);
        (<Mutable<RuntimeFunction<ObjectType> | RuntimeFunction<ReferenceType>>>this).returnObject = obj;

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

    
    // tailCallReset : function(sim: Simulation, rtConstruct: RuntimeConstruct, caller) {

    //     // Need to unseat all reference that were on the stack frame for the function.
    //     // Otherwise, lookup weirdness can occur because the reference lookup code wasn't
    //     // intended to be able to reseat references and parameter initializers will instead
    //     // think they're supposed to pass into the things that the references on the existing
    //     // stack frame were referring to.
    //     inst.stackFrame.setUpReferenceInstances();

    //     inst.reusedFrame = true;
    //     inst.setCaller(caller);
    //     inst.index = this.initIndex;
    //     sim.popUntil(inst);
    //     //inst.send("reset"); // don't need i think
    //     return inst;
    // },
    
    protected stepForwardImpl(): void {

    }

    protected upNextImpl(): void {
        if (this.body.isDone) {
            this.startCleanup();
        }
        else {
            this.sim.push(this.body);
        }
    }
    
    // upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    // }

    // stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //     if (inst.index === "afterDestructors"){
    //         this.done(sim, inst);
    //     }
    // }

    // done : function(sim: Simulation, rtConstruct: RuntimeConstruct){

    //     // If non-void return type, check that return object was initialized.
    //     // Non-void functions should be guaranteed to have a returnObject (even if it might be a reference)
    //     if (!isA(this.type.returnType, Types.Void) && !inst.returnStatementEncountered()){
    //         this.flowOffNonVoid(sim, inst);
    //     }

    //     if (inst.receiver){
    //         inst.receiver.callEnded();
    //     }

    //     sim.memory.stack.popFrame(inst);
    //     sim.pop(inst);
    // }

    // flowOffNonVoid : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //     if (this.isMain){
    //         inst.i_returnObject.setValue(Value.instance(0, Types.Int.instance()));
    //     }
    //     else{
    //         sim.implementationDefinedBehavior("Yikes! This is a non-void function (i.e. it's supposed to return something), but it ended without hitting a return statement");
    //     }
    // }

}

// TODO: is this needed? I think RuntimeFunction may be able to handle all of it.
// export class RuntimeMemberFunction extends RuntimeFunction {

//     public readonly receiver: CPPObject<ClassType>;

//     public constructor (model: FunctionDefinition, parent: RuntimeFunctionCall, receiver: CPPObject<ClassType>) {
//         super(model, parent);
//         this.receiver = receiver;
//     }

// }





























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
            this.startCleanup();
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




export class GlobalObjectAllocator extends CPPConstruct {
    

    public readonly parent?: undefined;
    public readonly globalObjects: readonly GlobalObjectDefinition[];

    public constructor(context: ProgramContext, globalObjects: readonly GlobalObjectDefinition[] ) {
        super(context);
        this.globalObjects = globalObjects;
    }
    
    protected onAttach(parent: this["parent"]): void {
        throw new Error("Method not implemented.");
    }

    public createRuntimeConstruct(this: CompiledGlobalObjectAllocator, sim: Simulation) {
        return new RuntimeGlobalObjectAllocator(this, sim);
    }

    // public isTailChild(child: ExecutableConstruct) {
    //     return {isTail: true};
    // }
}

export interface CompiledGlobalObjectAllocator extends GlobalObjectAllocator, SuccessfullyCompiled {
    readonly globalObjects: readonly CompiledGlobalObjectDefinition[];
}

export class RuntimeGlobalObjectAllocator extends RuntimeConstruct<CompiledGlobalObjectAllocator> {

    private index = 0;

    public constructor (model: CompiledGlobalObjectAllocator, sim: Simulation) {
        super(model, "statement", sim); // TODO: is "statement" the right stack type here? should I make a new one?
    }
	
    protected upNextImpl() {

        // let dtors = this.model.dtors;
        if (this.index < this.model.globalObjects.length) {
            let objDef = this.model.globalObjects[this.index];
            this.sim.memory.allocateStatic(objDef);
            if (objDef.initializer) {
                this.sim.push(objDef.initializer.createRuntimeInitializer(this));
            }
            ++this.index;
        }
        else{
            this.startCleanup();
        }
    }

    public stepForwardImpl() {
        return false;
    }
}
