import { Program, TranslationUnit, SourceReference } from "./Program";
import { Scope, TemporaryObjectEntity, FunctionEntity, LocalObjectEntity, LocalVariableEntity, LocalReferenceEntity, BlockScope, ClassEntity, MemberVariableEntity, ClassScope } from "./entities";
import { Note, NoteKind, CPPError, NoteRecorder } from "./errors";
import { asMutable, Mutable, assertFalse, assert } from "../util/util";
import { Simulation } from "./Simulation";
import { Observable } from "../util/observe";
import { ObjectType, ReferenceType, NoRefType, VoidType, PotentialReturnType, Type, AtomicType, FunctionType, CompleteClassType } from "./types";
import { GlobalVariableDefinition, CompiledGlobalVariableDefinition, CompiledFunctionDefinition, ClassDefinition, Declarator, FunctionDefinition, ClassDeclaration, AccessSpecifier } from "./declarations";
import { PotentialFullExpression, RuntimePotentialFullExpression } from "./PotentialFullExpression";
import { RuntimeFunction } from "./functions";
import { CPPObject } from "./objects";




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
        readonly start: number;
        readonly end: number;
        readonly text: string;
        readonly line: number;
        readonly column: number;
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
    readonly containingClass?: ClassEntity;
}

export function createTranslationUnitContext(parentContext: ProgramContext, translationUnit: TranslationUnit, contextualScope: Scope): TranslationUnitContext {
    return Object.assign({}, parentContext, { translationUnit: translationUnit, contextualScope: contextualScope });
}

export interface ExpressionContext extends TranslationUnitContext {
    readonly contextualParameterTypes?: readonly (Type | undefined)[];
    readonly contextualReceiverType?: CompleteClassType;
}

export function createExpressionContext(parentContext: TranslationUnitContext, contextualParameterTypes: readonly (Type | undefined)[]): ExpressionContext {
    return Object.assign({}, parentContext, { contextualParameterTypes: contextualParameterTypes });
}

export interface FunctionContext extends TranslationUnitContext {
    readonly containingFunction: FunctionEntity;
    readonly functionLocals: FunctionLocals;
}

export function createFunctionContext(parentContext: TranslationUnitContext, containingFunction: FunctionEntity): FunctionContext {
    return Object.assign({}, parentContext, { containingFunction: containingFunction, functionLocals: new FunctionLocals() });
}

export interface BlockContext extends FunctionContext {
    readonly contextualScope: BlockScope;
}

export function isBlockContext(context: TranslationUnitContext): context is BlockContext {
    return context.contextualScope instanceof BlockScope;
}



// export class ClassMembers {

//     // public readonly localObjects: readonly AutoEntity[] = [];
//     // public readonly localReferences: readonly LocalReferenceEntity[] = [];
//     // public readonly localVariablesByEntityId: {
//     //     [index: number] : LocalVariableEntity
//     // } = {};

//     public registerMemberVariable(member: MemberVariableEntity) {
//         // assert(!this.localVariablesByEntityId[local.entityId]);
//         // this.localVariablesByEntityId[local.entityId] = local;
//         // if (local.kind === "AutoEntity") {
//         //     asMutable(this.localObjects).push(local)
//         // }
//         // else {
//         //     asMutable(this.localReferences).push(local);
//         // }
//     }
// }

export function isClassContext(context: TranslationUnitContext) : context is ClassContext {
    return !!(context as ClassContext).containingClass; // && !!(context as ClassContext).classMembers;
}

export interface ClassContext extends TranslationUnitContext {
    readonly contextualScope: ClassScope;
    readonly containingClass: ClassEntity;
}

export function createClassContext(parentContext: TranslationUnitContext, classEntity: ClassEntity, baseClass?: ClassEntity): ClassContext {
    return Object.assign({}, parentContext, {
        contextualScope: new ClassScope(parentContext.translationUnit, classEntity.name, parentContext.contextualScope, baseClass?.definition?.context.contextualScope),
        containingClass: classEntity
    });
}

export function isMemberSpecificationContext(context: TranslationUnitContext) : context is MemberSpecificationContext {
    return isClassContext(context) && !!(context as MemberSpecificationContext).accessLevel;
}

export interface MemberSpecificationContext extends ClassContext {
    readonly accessLevel: AccessSpecifier;
}

export function createMemberSpecificationContext(parentContext: ClassContext, accessLevel: AccessSpecifier): MemberSpecificationContext {
    return Object.assign({}, parentContext, {
        accessLevel: accessLevel
    });
}

export abstract class CPPConstruct<ContextType extends ProgramContext = ProgramContext, ASTType extends ASTNode = ASTNode> {
    public abstract readonly construct_type: string;
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

    protected constructor(context: ContextType, ast: ASTType | undefined) {
        this.constructId = CPPConstruct.NEXT_ID++;

        this.context = context;

        ast && this.setAST(ast);

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

    protected abstract onAttach(parent: this["parent"]): void;

    private setAST(ast: ASTType) {
        asMutable(this).ast = ast;
        if (!ast.source) {
            assertFalse("AST source is undefined. A track() call is likely missing in the grammar.");
        }
        if (this.context.translationUnit) {
            asMutable(this).sourceReference = this.context.translationUnit.getSourceReference(ast.source.line, ast.source.column, ast.source.start, ast.source.end);
        }
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

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct): Explanation {
        return { message: "[No explanation available.]" };
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct): ConstructDescription {
        return { message: "[No description available.]" };
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
        let construct: CPPConstruct = this;
        while (!construct.sourceReference && construct.parent) {
            construct = construct.parent;
        }
        return construct.sourceReference || this.context.translationUnit.getSourceReference(0, 0, 0, 0);
    }

    // public abstract readonly _t: {
    //     compiled: CompiledConstruct
    // };

    public isSuccessfullyCompiled(): this is CompiledConstruct {
        return !this.getContainedNotes().hasErrors;
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








export type StackType = "statement" | "expression" | "function" | "initializer" | "call";

export abstract class RuntimeConstruct<C extends CompiledConstruct = CompiledConstruct> {

    public readonly observable = new Observable(this);

    public readonly sim: Simulation;
    public readonly model: C;
    public readonly stackType: StackType;

    public readonly children: { [index: string]: RuntimeConstruct } = {};

    public readonly parent?: RuntimeConstruct;

    private static NEXT_ID = 0;
    public readonly runtimeId: number = RuntimeConstruct.NEXT_ID++;

    /**
     * WARNING: The containingRuntimeFunction property may be undefined, even though it's type suggests it will always
     * be defined. In most places where it is accessed, there is an implicit assumption that a runtime construct
     * situated inside a function is being used (e.g. looking up an entity that depends on a local function) and the
     * client code would end up needing a non-null assertion anyway. Those non-null assertions are annoying, so
     * instead we trick the type system and trust that this property will be used appropriately by the programmer.
     */
    public readonly containingRuntimeFunction!: RuntimeFunction;

    /**
     * WARNING: The contextualReceiver property may be undefined, even though it's type suggests it will always
     * be defined. In most places where it is accessed, there is an implicit assumption that the runtime construct
     * for whom the lookup is being performed is situated in a context where there is a contextual receiver (e.g.
     * inside a member function) and the client code would end up needing a non-null assertion anyway. Those
     * non-null assertions are annoying, so instead we trick the type system and trust that this property will
     * be used appropriately by the programmer.
     */
    public readonly contextualReceiver!: CPPObject<CompleteClassType>;

    public readonly stepsTakenAtStart: number;
    public readonly isActive: boolean = false;
    public readonly isUpNext: boolean = false;
    public readonly isWaiting: boolean = false;
    public readonly isDone: boolean = false;

    private cleanupConstruct?: RuntimeConstruct;
    public readonly cleanupStarted: boolean = false;

    // TODO: refactor pauses. maybe move them to the implementation
    private pauses: { [index: string]: any } = {}; // TODO: remove any type

    public constructor(model: C, stackType: StackType, parentOrSim: RuntimeConstruct | Simulation) {
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

    protected setContainingRuntimeFunction(func: RuntimeFunction) {
        (<Mutable<this>>this).containingRuntimeFunction = func;
    }

    protected setContextualReceiver(obj: CPPObject<CompleteClassType>) {
        (<Mutable<this>>this).contextualReceiver = obj;
    }

    /**
     * REQUIRES: this instance is on the top of the execution stack
     */
    public stepForward() {
        this.observable.send("stepForward");
        return this.stepForwardImpl();
    }

    protected abstract stepForwardImpl(): void;

    public upNext() {
        (<Mutable<this>>this).isUpNext = true;
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

    protected abstract upNextImpl(): void;

    public setPauseWhenUpNext() {
        this.pauses["upNext"] = { pauseWhenUpNext: true };
    }

    public wait() {
        (<Mutable<this>>this).isUpNext = false;
        (<Mutable<this>>this).isWaiting = true;
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

        (<Mutable<this>>this).cleanupStarted = true;
        if (this.cleanupConstruct) {
            this.sim.push(this.cleanupConstruct);
        }
        else {
            this.sim.pop();
        }
    }

    public afterPopped() {
        (<Mutable<this>>this).isActive = false;
        (<Mutable<this>>this).isUpNext = false;
        (<Mutable<this>>this).isWaiting = false;
        (<Mutable<this>>this).isDone = true;
        this.observable.send("popped", this);
    }

    private addChild(child: RuntimeConstruct) {
        this.children[child.model.constructId] = child;
        this.observable.send("childInstanceCreated", child);
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
        while (parent && parent.model.constructId != model.constructId) {
            parent = parent.parent;
        }
        return parent;
    }

    public explain(): Explanation {
        return this.model.explain(this.sim, this);
    }

    public describe(): ConstructDescription {
        return this.model.describe(this.sim, this);
    }
}





export abstract class BasicCPPConstruct<ContextType extends TranslationUnitContext, ASTType extends ASTNode> extends CPPConstruct<ContextType, ASTType> {

    public parent?: CPPConstruct;

    public constructor(context: ContextType, ast: ASTType | undefined) {
        super(context, ast);
    }

    public onAttach(parent: CPPConstruct) {
        (<Mutable<this>>this).parent = parent;
    }
}

export class InvalidConstruct extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    public readonly construct_type = "invalid_construct";

    public readonly note: Note;
    public readonly type: undefined;

    public constructor(context: TranslationUnitContext, ast: ASTNode, errorFn: (construct: CPPConstruct) => Note) {
        super(context, ast);
        this.addNote(this.note = errorFn(this));
    }

}

export class FunctionLocals {

    public readonly localObjects: readonly LocalObjectEntity[] = [];
    public readonly localReferences: readonly LocalReferenceEntity[] = [];
    public readonly localVariablesByEntityId: {
        [index: number]: LocalVariableEntity
    } = {};

    public registerLocalVariable(local: LocalVariableEntity) {
        assert(!this.localVariablesByEntityId[local.entityId]);
        this.localVariablesByEntityId[local.entityId] = local;
        if (local.variableKind === "object") {
            asMutable(this.localObjects).push(local);
        }
        else {
            asMutable(this.localReferences).push(local);
        }
    }
}





























export class TemporaryDeallocator extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    public readonly construct_type = "TemporaryDeallacator";

    public readonly parent?: PotentialFullExpression;
    public readonly temporaryObjects: TemporaryObjectEntity[];

    // public readonly dtors: (MemberFunctionCall | null)[];

    public constructor(context: TranslationUnitContext, temporaryObjects: TemporaryObjectEntity[]) {
        super(context, undefined); // Has no AST
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
    public readonly parent!: RuntimePotentialFullExpression; // narrows type from base class

    public constructor(model: CompiledTemporaryDeallocator, parent: RuntimePotentialFullExpression) {
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

        // TEMPORARY CODE THAT JUST DESTROYS ALL TEMPORARY OBJECTS ASSUMING NO DTORS
        this.model.temporaryObjects.forEach(tempObj => this.sim.memory.deallocateTemporaryObject(tempObj.runtimeLookup(this.parent)));


        // let dtors = this.model.dtors;
        // let dtors : readonly null[] = this.model.temporaryObjects.map(t => null); // TODO CLASSES: replace this hack with above
        // if (this.index < dtors.length) {
        //     // let dtor = dtors[this.index];
        //     // if (!this.justDestructed && dtor) {
        //     //     dtor.createRuntimeConstruct(this);
        //     //     this.sim.push(dtor);
        //     //     this.justDestructed = true;
        //     // }
        //     // else {
        //         this.sim.memory.deallocateTemporaryObject(this.model.temporaryObjects[this.index].runtimeLookup(this.parent));
        //         ++this.index;
        //         // this.justDestructed = false;
        //     // }
        // }
        // else{
        this.startCleanup();
        // }
    }

    public stepForwardImpl() {

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
    public readonly construct_type = "GlobalObjectAllocator";


    public readonly parent?: undefined;
    public readonly globalObjects: readonly GlobalVariableDefinition[];

    public constructor(context: ProgramContext, globalObjects: readonly GlobalVariableDefinition[]) {
        super(context, undefined); // Has no AST
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
    readonly globalObjects: readonly CompiledGlobalVariableDefinition[];
}

export class RuntimeGlobalObjectAllocator extends RuntimeConstruct<CompiledGlobalObjectAllocator> {

    private index = 0;

    public constructor(model: CompiledGlobalObjectAllocator, sim: Simulation) {
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
        else {
            this.startCleanup();
        }
    }

    public stepForwardImpl() {
        return false;
    }
}
