import assign from "lodash/assign";
import { Observable } from "../util/observe";
import { CONSTRUCT_CLASSES } from "./constructClasses";
import { assert, Mutable } from "../util/util";
import { SourceCode } from "./lexical";
import { FunctionDefinition } from "./declarations";
import { Scope, TemporaryObjectEntity, FunctionEntity, ObjectEntity, UnboundReferenceEntity, ParameterEntity, ReturnReferenceEntity } from "./entities";
import { TranslationUnit } from "./Program";
import { SemanticException } from "./semanticExceptions";
import { Simulation } from "./Simulation";
import { Type, ClassType, ObjectType, VoidType, Reference, PotentialReturnType } from "./types";
import { Note, CPPError, Description, Explanation } from "./errors";
import { Value, MemoryFrame } from "./runtimeEnvironment";
import { CPPObject, CPPObjectType } from "./objects";
import * as Util from "../util/util";
import { Expression, TypedExpression, RuntimeExpression, ValueCategory } from "./expressions";
import { standardConversion } from "./standardConversions";
import { CopyInitializer, RuntimeCopyInitializer } from "./initializers";
import { clone } from "lodash";

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

interface Attachable<T> {
    attachTo : (parent: T) => void;
};

export abstract class CPPConstruct {

    public static readonly constructKind : symbol = Symbol("CPPConstruct");

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

    public abstract readonly parent?: CPPConstruct;
    public readonly children: readonly CPPConstruct[] = [];
    
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

    public attach<T extends CPPConstruct>(this: T, child: Attachable<T> ) {
        child.attachTo(this);
        // TODO: add notes from child?
    }

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
    // readonly parent?: ExecutableConstruct; // TODO: is this increased specificity necessary now that parent can be undefined
    // readonly containingFunction: FunctionDefinition;
    readonly context: ExecutableConstructContext;
    
}

export interface CompiledConstruct {
    
    // _t_isCompiled is here to prevent (otherwise) structurally equivalent non-compiled constructs
    // from being assignable to a compiled expression type
    // TODO: maybe better to use a symbol here?
    readonly _t_isCompiled: never;
}

export interface CompiledExecutableConstruct extends ExecutableConstruct, CompiledConstruct {

}

export interface ExecutableConstructContext extends ConstructContext {
    readonly containingFunction: FunctionDefinition;
}

export abstract class InstructionConstruct extends CPPConstruct implements ExecutableConstruct {

    public abstract readonly parent?: ExecutableConstruct; // Narrows type of parent property of CPPConstruct
    public readonly context!: ExecutableConstructContext; // TODO: narrows type of parent property, but needs to be done in safe way (with parent property made abstract)

    public readonly containingFunction: FunctionDefinition;
    
    protected constructor(context: ExecutableConstructContext) {
        super(context);

        this.containingFunction = context.containingFunction;
    }

    public abstract isTailChild(child: CPPConstruct) : {isTail: boolean};
}

export interface CompiledInstructionConstruct extends InstructionConstruct, CompiledConstruct {

}

export abstract class PotentialFullExpression extends InstructionConstruct {
    
    public readonly parent?: InstructionConstruct; // Narrows type of parent property of CPPConstruct

    public readonly temporaryObjects: TemporaryObjectEntity[] = [];
    public readonly temporaryDeallocator?: TemporaryDeallocator;


    public attachTo(parent: InstructionConstruct) {
        (<InstructionConstruct>this.parent) = parent;
        parent.children.push(this); // rudeness approved here

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
            return Util.assertFalse("failed to find full expression for " + this);
        }

        return this.parent.findFullExpression();
    }

    private addTemporaryObject(tempObjEnt: TemporaryObjectEntity) {
        assert(!this.parent, "Temporary objects may not be added to a full expression after it has been attached.")
        this.temporaryObjects.push(tempObjEnt);
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

    public constructor(context: ExecutableConstructContext, temporaryObjects: TemporaryObjectEntity[] ) {
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

    public attachTo(parent: InstructionConstruct) {
        (<InstructionConstruct>this.parent) = parent;
        parent.children.push(this); // rudeness approved here

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

    public constructor(context: ConstructContext, unsupportedName: string) {
        super(context);
        this.addNote(CPPError.lobster.unsupported(this, unsupportedName));
    }
}

export type StackType = "statement" | "expression" |  "function" | "initializer" |"call";

export abstract class RuntimeConstruct<C extends CompiledExecutableConstruct = CompiledExecutableConstruct> {

    public readonly observable = new Observable(this);

    public readonly sim: Simulation;
    public readonly model: C;
    public readonly stackType: StackType;

    public readonly pushedChildren: {[index: string]: RuntimeConstruct};

    private readonly parent: RuntimeConstruct;
    public abstract readonly containingRuntimeFunction: RuntimeFunction;

    public readonly stepsTaken: number;
    public readonly isActive: boolean = false;

    public isDone: boolean = false;

    // TODO: refactor pauses. maybe move them to the implementation
    private pauses: {[index:string]: any} = {}; // TODO: remove any type
    
    public constructor (model: C, stackType: StackType, parent: RuntimeConstruct) {
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
export type ExecutableRuntimeConstruct = RuntimeConstruct;// = RuntimeFunction | RuntimeInstruction;

export abstract class RuntimeInstruction<C extends CompiledInstructionConstruct = CompiledInstructionConstruct> extends RuntimeConstruct<C> {

    public readonly containingRuntimeFunction: RuntimeFunction;

    public constructor (model: C, stackType: StackType, parent: ExecutableRuntimeConstruct) {
        super(model, stackType, parent);
        this.containingRuntimeFunction = parent.containingRuntimeFunction;
    }
}


export abstract class RuntimePotentialFullExpression<C extends CompiledPotentialFullExpression = CompiledPotentialFullExpression> extends RuntimeInstruction<C> {

    public readonly temporaryDeallocator?: RuntimeTemporaryDeallocator;

    public constructor(model: C, stackType: StackType, parent: ExecutableRuntimeConstruct) {
        super(model, stackType, parent);
        if (this.model.temporaryDeallocator) {
            this.temporaryDeallocator = this.model.temporaryDeallocator.createRuntimeConstruct(this);
        }
    }

    protected done() {
        if (this.temporaryDeallocator) {
            this.sim.push(this.temporaryDeallocator);
        }
        super.done();
    }
}

export class RuntimeTemporaryDeallocator extends RuntimeInstruction<CompiledTemporaryDeallocator> {

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




export class RuntimeFunction extends RuntimeConstruct<CompiledFunctionDefinition> {

    public readonly caller: RuntimeFunctionCall;
    public readonly containingRuntimeFunction: RuntimeFunction;

    public readonly stackFrame?: MemoryFrame;

    /**
     * The object returned by the function, either an original returned-by-reference or a temporary
     * object created to hold a return-by-value. Once the function call has been executed, will be
     * defined unless it's a void function.
     */
    public readonly returnObject?: CPPObjectType<ObjectType>;

    public readonly hasControl: boolean = false;

    public constructor (model: CompiledFunctionDefinition, parent: RuntimeFunctionCall) {
        super(model, "function", parent);
  
        // A function is its own containing function context
        this.containingRuntimeFunction = this;

        this.caller = parent;
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
     *  - 
     */
    public setReturnObject(obj: CPPObjectType<ObjectType>) {
        // This should only be used once
        Util.assert(!this.returnObject);
        (<Mutable<this>>this).returnObject = obj;

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

export class FunctionCall extends PotentialFullExpression {
    
    public readonly func: FunctionEntity;
    public readonly args: readonly TypedExpression<ObjectType>[];
    public readonly receiver?: ObjectEntity<ClassType>;

    public readonly argInitializers: readonly CopyInitializer[];
    
    public readonly returnTarget: TemporaryObjectEntity | UnboundReferenceEntity | null;
    /**
     * A FunctionEntity must be provided to specify which function is being called.
     *
     * A receiver entity may be provided here, and if it is, the function call guarantees it will
     * be looked up in a runtime context BEFORE the function has been "called" (i.e. before a new
     * stack frame has been pushed and control has been given over to the called function). This in
     * particular is important for e.g. a ParameterEntity used as the receiver of a constructor call
     * when a class-type parameter is passed by value to some function. If it were looked up instead
     * after the call, it would try to find a parameter of the constructor rather than of the function,
     * which isn't right.
     *
     * If a receiver entity is not provided here, a receiver object must be specified at runtime when
     * a runtime construct for this function call is created.
     *
     * @param context 
     * @param func Specifies which function is being called.
     * @param args Arguments to the function.
     * @param receiver 
     */
    public constructor(context: ExecutableConstructContext, func: FunctionEntity, args: readonly TypedExpression<ObjectType>[], receiver?: ObjectEntity<ClassType>) {
        super(context);

        this.func = func;
        this.args = clone(args);
        this.receiver = receiver;

        // Note that the args are NOT added as children here. Instead, they are owned by whatever
        // construct contains the function call and are attached to the construct tree there.

        // Create initializers for each argument/parameter pair
        this.argInitializers = args.map((arg, i) => {
            return CopyInitializer.create(context, new ParameterEntity(arg.type, i), [arg]);
        });

        // TODO
        // this.isRecursive = this.func.definition === this.context.containingFunction;

        // No returns for void functions, of course.
        // If return by reference, the return object already exists and no need to create a temporary.
        // Else, for a return by value, we do need to create a temporary object.
        let returnType = this.func.type.returnType;
        if (returnType instanceof VoidType) {
            this.returnTarget = null;
        }
        else if (returnType instanceof Reference) {
            this.returnTarget = new ReturnReferenceEntity(returnType.refTo);
        }
        else {
            this.returnTarget = this.createTemporaryObject(returnType, (this.func.name || "unknown") + "() [return]");
        }

        // TODO: need to check that it's not an auxiliary function call before adding these?
        this.context.containingFunction.addCall(this);
        this.translationUnit.registerFunctionCall(this); // TODO: is this needed?
    }

    public checkLinkingProblems() {
        if (!this.func.isLinked()) {
            if (this.func.isLibraryUnsupported()) {
                let note = CPPError.link.library_unsupported(this, this.func);
                this.addNote(note);
                return note;
            }
            else {
                let note = CPPError.link.def_not_found(this, this.func);
                this.addNote(note);
                return note;
            }
        }
        return null;
    }

    // tailRecursionCheck : function(){
    //     if (this.isTail !== undefined) {
    //         return;
    //     }

    //     var child = this;
    //     var parent = this.parent;
    //     var isTail = true;
    //     var reason = null;
    //     var others = [];
    //     var first = true;
    //     while(!isA(child, FunctionDefinition) && !isA(child, Statements.Return)) {
    //         var result = parent.isTailChild(child);
    //         if (!result.isTail) {
    //             isTail = false;
    //             reason = result.reason;
    //             others = result.others || [];
    //             break;
    //         }

    //         //if (!first && child.tempDeallocator){
    //         //    isTail = false;
    //         //    reason = "The full expression containing this recursive call has temporary objects that need to be deallocated after the call returns.";
    //         //    others = [];
    //         //    break;
    //         //}
    //         //first = false;


    //         reason = reason || result.reason;

    //         child = parent;
    //         parent = child.parent;
    //     }

    //     this.isTail = isTail;
    //     this.isTailReason = reason;
    //     this.isTailOthers = others;
    //     //this.containingFunction().isTailRecursive = this.containingFunction().isTailRecursive && isTail;

    //     this.canUseTCO = this.isRecursive && this.isTail;
    // },

    public createRuntimeFunctionCall<T extends PotentialReturnType = PotentialReturnType, V extends ValueCategory = ValueCategory>(this: CompiledFunctionCall<T,V>, parent: RuntimeExpression) : RuntimeFunctionCall<T,V> {
        return new RuntimeFunctionCall<T,V>(this, parent);
    }

    // isTailChild : function(child){
    //     return {isTail: false,
    //         reason: "A quick rule is that a function call can never be tail recursive if it is an argument to another function call. The outer function call will always happen afterward!",
    //         others: [this]
    //     };
    // },

    // // TODO: what is this? should it be describeEvalResult? or explain? probably not just describe since that is for objects
    // describe : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //     var desc = {};
    //     desc.message = "a call to " + this.func.describe(sim).message;
    //     return desc;
    // }

}

export interface CompiledFunctionCall<T extends PotentialReturnType = PotentialReturnType, V extends ValueCategory = ValueCategory> extends FunctionCall, CompiledConstruct {
    
}

const INDEX_FUNCTION_CALL_PUSH = 0;
const INDEX_FUNCTION_CALL_ARGUMENTS = 1;
const INDEX_FUNCTION_CALL_CALL = 2;
const INDEX_FUNCTION_CALL_RETURN = 2;
export class RuntimeFunctionCall<T extends PotentialReturnType = PotentialReturnType, V extends ValueCategory = ValueCategory> extends RuntimeInstruction {

    public readonly model!: CompiledFunctionCall<T,V>; // narrows type of member in base class

    // public readonly functionDef : FunctionDefinition;
    public readonly calledFunction : RuntimeFunction;
    public readonly argInitializers: readonly RuntimeCopyInitializer[];

    public readonly receiver?: CPPObject<ClassType>

    // public readonly hasBeenCalled: boolean = false;

    private index : typeof INDEX_FUNCTION_CALL_PUSH | typeof INDEX_FUNCTION_CALL_ARGUMENTS | typeof INDEX_FUNCTION_CALL_CALL | typeof INDEX_FUNCTION_CALL_RETURN = INDEX_FUNCTION_CALL_PUSH;

    public constructor (model: CompiledFunctionCall, parent: ExecutableRuntimeConstruct) {
        super(model, "call", parent);
        let functionDef = this.model.func.definition!.runtimeLookup(); // TODO
        
        // Create argument initializer instances
        this.argInitializers = this.model.argInitializers.map((aInit) => aInit.createRuntimeInitializer(this));



        // TODO: TCO? would reuse this.containingRuntimeFunction instead of creating new
        
         // for non-member functions, receiver undefined
        this.receiver = this.model.receiver && this.model.receiver.runtimeLookup(this);
        this.calledFunction = functionDef.createRuntimeFunction(this, this.receiver);

                // TODO: TCO? if using TCO, don't create a new return object, just reuse the old one
        if (this.model.returnTarget instanceof TemporaryObjectEntity) {
            // If return-by-value, set return object to temporary
            this.calledFunction.setReturnObject(this.model.returnTarget.objectInstance(this));
        }
        this.index = INDEX_FUNCTION_CALL_CALL;
    }

    protected upNextImpl(): void {
        if (this.index === INDEX_FUNCTION_CALL_ARGUMENTS) {
            // Push all argument initializers. Push in reverse so they run left to right
            // (although this is not strictly necessary given they are indeterminately sequenced)
            for(var i = this.argInitializers.length-1; i >= 0; --i) {
                this.sim.push(this.argInitializers[i]);
            }
        }
        else if (this.index === INDEX_FUNCTION_CALL_RETURN) {
            if (!this.returnObject) {
                this.setReturnObject(null);
            }
            this.calledFunction.loseControl();
            this.containingRuntimeFunction.gainControl();
            this.done();
            this.sim.pop();
        }
    }
    
    protected stepForwardImpl(): void {
        if (this.index === INDEX_FUNCTION_CALL_PUSH) {

            // TODO: TCO? just do a tailCallReset, send "tailCalled" message

            this.calledFunction.pushStackFrame();
            this.index = INDEX_FUNCTION_CALL_ARGUMENTS;
        }
        else if (this.index === INDEX_FUNCTION_CALL_CALL) {

            this.containingRuntimeFunction.loseControl();
            this.sim.push(this.calledFunction);
            this.calledFunction.gainControl();
            this.receiver && this.receiver.callReceived();

            // (<Mutable<this>>this).hasBeenCalled = true;
            this.observable.send("called", this.calledFunction);
            
            this.index = INDEX_FUNCTION_CALL_RETURN;
        }
        
    }
}


// export class MainCall extends CPPConstruct {
    
//     public readonly mainFunc: FunctionEntity;

//     public readonly returnTarget: TemporaryObjectEntity | UnboundReferenceEntity | null;
   
//     public constructor(context: ConstructContext) {
//         super(context);

//         this.func = func;
//         this.args = clone(args);
//         this.receiver = receiver;

//         // Note that the args are NOT added as children here. Instead, they are owned by whatever
//         // construct contains the function call and are attached to the construct tree there.

//         // Create initializers for each argument/parameter pair
//         this.argInitializers = args.map((arg, i) => {
//             return CopyInitializer.create(context, new ParameterEntity(arg.type, i), [arg]);
//         });

//         // TODO
//         // this.isRecursive = this.func.definition === this.context.containingFunction;

//         // No returns for void functions, of course.
//         // If return by reference, the return object already exists and no need to create a temporary.
//         // Else, for a return by value, we do need to create a temporary object.
//         let returnType = this.func.type.returnType;
//         if (returnType instanceof VoidType) {
//             this.returnTarget = null;
//         }
//         else if (returnType instanceof Reference) {
//             this.returnTarget = new ReturnReferenceEntity(returnType.refTo);
//         }
//         else {
//             this.returnTarget = this.createTemporaryObject(returnType, (this.func.name || "unknown") + "() [return]");
//         }

//         // TODO: need to check that it's not an auxiliary function call before adding these?
//         this.context.containingFunction.addCall(this);
//         this.translationUnit.registerFunctionCall(this); // TODO: is this needed?
//     }

//     public checkLinkingProblems() {
//         if (!this.func.isLinked()) {
//             if (this.func.isLibraryUnsupported()) {
//                 let note = CPPError.link.library_unsupported(this, this.func);
//                 this.addNote(note);
//                 return note;
//             }
//             else {
//                 let note = CPPError.link.def_not_found(this, this.func);
//                 this.addNote(note);
//                 return note;
//             }
//         }
//         return null;
//     }

//     // tailRecursionCheck : function(){
//     //     if (this.isTail !== undefined) {
//     //         return;
//     //     }

//     //     var child = this;
//     //     var parent = this.parent;
//     //     var isTail = true;
//     //     var reason = null;
//     //     var others = [];
//     //     var first = true;
//     //     while(!isA(child, FunctionDefinition) && !isA(child, Statements.Return)) {
//     //         var result = parent.isTailChild(child);
//     //         if (!result.isTail) {
//     //             isTail = false;
//     //             reason = result.reason;
//     //             others = result.others || [];
//     //             break;
//     //         }

//     //         //if (!first && child.tempDeallocator){
//     //         //    isTail = false;
//     //         //    reason = "The full expression containing this recursive call has temporary objects that need to be deallocated after the call returns.";
//     //         //    others = [];
//     //         //    break;
//     //         //}
//     //         //first = false;


//     //         reason = reason || result.reason;

//     //         child = parent;
//     //         parent = child.parent;
//     //     }

//     //     this.isTail = isTail;
//     //     this.isTailReason = reason;
//     //     this.isTailOthers = others;
//     //     //this.containingFunction().isTailRecursive = this.containingFunction().isTailRecursive && isTail;

//     //     this.canUseTCO = this.isRecursive && this.isTail;
//     // },

//     public createRuntimeFunctionCall<T extends PotentialReturnType = PotentialReturnType, V extends ValueCategory = ValueCategory>(this: CompiledFunctionCall<T,V>, parent: RuntimeExpression) : RuntimeFunctionCall<T,V> {
//         return new RuntimeFunctionCall<T,V>(this, parent);
//     }

//     // isTailChild : function(child){
//     //     return {isTail: false,
//     //         reason: "A quick rule is that a function call can never be tail recursive if it is an argument to another function call. The outer function call will always happen afterward!",
//     //         others: [this]
//     //     };
//     // },

//     // // TODO: what is this? should it be describeEvalResult? or explain? probably not just describe since that is for objects
//     // describe : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//     //     var desc = {};
//     //     desc.message = "a call to " + this.func.describe(sim).message;
//     //     return desc;
//     // }

// }

// export interface CompiledFunctionCall<T extends PotentialReturnType = PotentialReturnType, V extends ValueCategory = ValueCategory> extends FunctionCall, CompiledConstruct {
    
// }

// const INDEX_FUNCTION_CALL_PUSH = 0;
// const INDEX_FUNCTION_CALL_ARGUMENTS = 1;
// const INDEX_FUNCTION_CALL_CALL = 2;
// const INDEX_FUNCTION_CALL_RETURN = 2;
// export class RuntimeFunctionCall<T extends PotentialReturnType = PotentialReturnType, V extends ValueCategory = ValueCategory> extends RuntimeInstruction {

//     public readonly model!: CompiledFunctionCall<T,V>; // narrows type of member in base class

//     // public readonly functionDef : FunctionDefinition;
//     public readonly calledFunction : RuntimeFunction;
//     public readonly argInitializers: readonly RuntimeCopyInitializer[];

//     public readonly receiver?: CPPObject<ClassType>

//     /**
//      * The object returned by the function, either an original returned-by-reference or a temporary
//      * object created to hold a return-by-value. Once the function call has been executed, will be
//      * defined unless it's a void function, in which case it will be null.
//      */
//     public readonly returnObject?: CPPObjectType<ObjectType> | null;

//     // public readonly hasBeenCalled: boolean = false;

//     private index : typeof INDEX_FUNCTION_CALL_PUSH | typeof INDEX_FUNCTION_CALL_ARGUMENTS | typeof INDEX_FUNCTION_CALL_CALL | typeof INDEX_FUNCTION_CALL_RETURN = INDEX_FUNCTION_CALL_PUSH;

//     public constructor (model: CompiledFunctionCall, parent: ExecutableRuntimeConstruct) {
//         super(model, "call", parent);
//         let functionDef = this.model.func.definition!.runtimeLookup(); // TODO
        
//         // Create argument initializer instances
//         this.argInitializers = this.model.argInitializers.map((aInit) => aInit.createRuntimeInitializer(this));

//         // TODO: TCO? if using TCO, don't create a new return object, just reuse the old one
//         if (this.model.returnTarget instanceof TemporaryObjectEntity) {
//             this.setReturnObject(this.model.returnTarget.objectInstance(this));
//         }

//         // TODO: TCO? would reuse this.containingRuntimeFunction instead of creating new
        
//          // for non-member functions, receiver undefined
//         this.receiver = this.model.receiver && this.model.receiver.runtimeLookup(this);
//         this.calledFunction = functionDef.createRuntimeFunction(this, this.receiver);
        
//         this.index = INDEX_FUNCTION_CALL_CALL;
//     }

//     public setReturnObject(obj: CPPObjectType<ObjectType> | null) {
//         // This should only be used once
//         Util.assert(!this.returnObject);
//         (<Mutable<this>>this).returnObject = obj;

//     }

//     protected upNextImpl(): void {
//         if (this.index === INDEX_FUNCTION_CALL_ARGUMENTS) {
//             // Push all argument initializers. Push in reverse so they run left to right
//             // (although this is not strictly necessary given they are indeterminately sequenced)
//             for(var i = this.argInitializers.length-1; i >= 0; --i) {
//                 this.sim.push(this.argInitializers[i]);
//             }
//         }
//         else if (this.index === INDEX_FUNCTION_CALL_RETURN) {
//             if (!this.returnObject) {
//                 this.setReturnObject(null);
//             }
//             this.calledFunction.loseControl();
//             this.containingRuntimeFunction.gainControl();
//             this.done();
//             this.sim.pop();
//         }
//     }
    
//     protected stepForwardImpl(): void {
//         if (this.index === INDEX_FUNCTION_CALL_PUSH) {

//             // TODO: TCO? just do a tailCallReset, send "tailCalled" message

//             this.calledFunction.pushStackFrame();
//             this.index = INDEX_FUNCTION_CALL_ARGUMENTS;
//         }
//         else if (this.index === INDEX_FUNCTION_CALL_CALL) {

//             this.containingRuntimeFunction.loseControl();
//             this.sim.push(this.calledFunction);
//             this.calledFunction.gainControl();
//             this.receiver && this.receiver.callReceived();

//             // (<Mutable<this>>this).hasBeenCalled = true;
//             this.observable.send("called", this.calledFunction);
            
//             this.index = INDEX_FUNCTION_CALL_RETURN;
//         }
        
//     }
// }




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

