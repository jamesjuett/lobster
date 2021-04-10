"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeGlobalObjectAllocator = exports.GlobalObjectAllocator = exports.ContextualLocals = exports.InvalidConstruct = exports.BasicCPPConstruct = exports.RuntimeConstruct = exports.CPPConstruct = exports.areSemanticallyEquivalent = exports.areAllSemanticallyEquivalent = exports.createMemberSpecificationContext = exports.createOutOfLineFunctionDefinitionContext = exports.isMemberSpecificationContext = exports.createClassContext = exports.isClassContext = exports.createLoopContext = exports.isBlockContext = exports.isMemberBlockContext = exports.createBlockContext = exports.isMemberFunctionContext = exports.createFunctionContext = exports.isFunctionContext = exports.createExpressionContextWithReceiverType = exports.createExpressionContextWithParameterTypes = exports.createLibraryContext = exports.createTranslationUnitContext = exports.createImplicitContext = exports.EMPTY_SOURCE = void 0;
const entities_1 = require("./entities");
const errors_1 = require("./errors");
const util_1 = require("../util/util");
const observe_1 = require("../util/observe");
exports.EMPTY_SOURCE = { line: 0, column: 0, start: 0, end: 0, text: "" };
function createImplicitContext(context) {
    return Object.assign({}, context, { implicit: true });
}
exports.createImplicitContext = createImplicitContext;
function createTranslationUnitContext(parentContext, translationUnit, contextualScope) {
    return Object.assign({}, parentContext, { translationUnit: translationUnit, contextualScope: contextualScope, isLibrary: false });
}
exports.createTranslationUnitContext = createTranslationUnitContext;
function createLibraryContext(parentContext) {
    return Object.assign({}, parentContext, { isLibrary: true });
}
exports.createLibraryContext = createLibraryContext;
function createExpressionContextWithParameterTypes(parentContext, contextualParameterTypes) {
    return Object.assign({}, parentContext, { contextualParameterTypes: contextualParameterTypes });
}
exports.createExpressionContextWithParameterTypes = createExpressionContextWithParameterTypes;
function createExpressionContextWithReceiverType(parentContext, contextualReceiverType) {
    return Object.assign({}, parentContext, { contextualReceiverType: contextualReceiverType });
}
exports.createExpressionContextWithReceiverType = createExpressionContextWithReceiverType;
function isFunctionContext(context) {
    return !!(context.containingFunction);
}
exports.isFunctionContext = isFunctionContext;
function createFunctionContext(parentContext, containingFunction, contextualReceiverType) {
    return Object.assign({}, parentContext, {
        containingFunction: containingFunction,
        functionLocals: new ContextualLocals(),
        contextualReceiverType: contextualReceiverType
    });
}
exports.createFunctionContext = createFunctionContext;
function isMemberFunctionContext(context) {
    return isFunctionContext(context) && !!context.contextualReceiverType;
}
exports.isMemberFunctionContext = isMemberFunctionContext;
function createBlockContext(parentContext, sharedScope) {
    return Object.assign({}, parentContext, {
        contextualScope: sharedScope || new entities_1.BlockScope(parentContext.translationUnit, parentContext.contextualScope),
        blockLocals: new ContextualLocals()
    });
}
exports.createBlockContext = createBlockContext;
function isMemberBlockContext(context) {
    return !!context.contextualReceiverType;
}
exports.isMemberBlockContext = isMemberBlockContext;
function isBlockContext(context) {
    return context.contextualScope instanceof entities_1.BlockScope;
}
exports.isBlockContext = isBlockContext;
function createLoopContext(parentContext) {
    return Object.assign({}, parentContext, {
        withinLoop: true
    });
}
exports.createLoopContext = createLoopContext;
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
function isClassContext(context) {
    return !!context.containingClass; // && !!(context as ClassContext).classMembers;
}
exports.isClassContext = isClassContext;
function createClassContext(parentContext, classEntity, baseClass, templateType) {
    var _a;
    return Object.assign({}, parentContext, {
        contextualScope: new entities_1.ClassScope(parentContext.translationUnit, classEntity.name, parentContext.contextualScope, (_a = baseClass === null || baseClass === void 0 ? void 0 : baseClass.definition) === null || _a === void 0 ? void 0 : _a.context.contextualScope),
        baseClass: baseClass,
        containingClass: classEntity,
        templateType: templateType
    });
}
exports.createClassContext = createClassContext;
function isMemberSpecificationContext(context) {
    return isClassContext(context) && !!context.accessLevel;
}
exports.isMemberSpecificationContext = isMemberSpecificationContext;
function createOutOfLineFunctionDefinitionContext(declarationContext, newParent) {
    return Object.assign({}, declarationContext, {
        contextualScope: declarationContext.contextualScope.createAlternateParentProxy(newParent.contextualScope),
        translationUnit: newParent.translationUnit
    });
}
exports.createOutOfLineFunctionDefinitionContext = createOutOfLineFunctionDefinitionContext;
function createMemberSpecificationContext(classContext, accessLevel) {
    return Object.assign({}, classContext, {
        accessLevel: accessLevel
    });
}
exports.createMemberSpecificationContext = createMemberSpecificationContext;
function areAllSemanticallyEquivalent(constructs, others, equivalenceContext) {
    return constructs.length === others.length
        && constructs.every((c, i) => c.isSemanticallyEquivalent(others[i], equivalenceContext));
}
exports.areAllSemanticallyEquivalent = areAllSemanticallyEquivalent;
function areSemanticallyEquivalent(construct, other, equivalenceContext) {
    return !!(construct === other // also handles case of both undefined
        || construct && other && construct.isSemanticallyEquivalent(other, equivalenceContext));
}
exports.areSemanticallyEquivalent = areSemanticallyEquivalent;
class CPPConstruct {
    constructor(context, ast) {
        this.notes = new errors_1.NoteRecorder();
        this.children = [];
        this.constructId = CPPConstruct.NEXT_ID++;
        this.context = context;
        if (ast) {
            this.ast = ast;
            util_1.assert(ast.source, "AST source is undefined. A track() call is likely missing in the grammar.");
            if (this.context.translationUnit) {
                util_1.asMutable(this).sourceReference = this.context.translationUnit.getSourceReference(ast.source.line, ast.source.column, ast.source.start, ast.source.end);
            }
        }
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
    attach(child) {
        util_1.asMutable(this.children).push(child);
        child.onAttach(this);
        // TODO: add notes from child?
    }
    attachAll(children) {
        children.forEach((child) => this.attach(child));
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
    explain(sim, rtConstruct) {
        return { message: "[No explanation available.]" };
    }
    describe(sim, rtConstruct) {
        return { message: "[No description available.]" };
    }
    addNote(note) {
        this.notes.addNote(note);
        if (this.context.translationUnit) {
            this.context.translationUnit.addNote(note);
        }
        // if (this.parent && this.i_auxiliaryLevel === this.parent.i_auxiliaryLevel) {
        //     this.parent.addNote(note);
        // }
    }
    getContainedNotes() {
        let allNotes = new errors_1.NoteRecorder();
        allNotes.addNotes(this.notes.allNotes);
        this.children.forEach(child => allNotes.addNotes(child.getContainedNotes().allNotes));
        return allNotes;
    }
    // getNotes : function() {
    //     return this.i_notes;
    // },
    getNearestSourceReference() {
        let construct = this;
        while (!construct.sourceReference && construct.parent) {
            construct = construct.parent;
        }
        return construct.sourceReference || this.context.translationUnit.getSourceReference(0, 0, 0, 0);
    }
    // public abstract readonly _t: {
    //     compiled: CompiledConstruct
    // };
    isSuccessfullyCompiled() {
        return !this.getContainedNotes().hasErrors;
    }
    isSemanticallyEquivalent(other, equivalenceContext) {
        return this.isSemanticallyEquivalent_impl(other, equivalenceContext);
    }
    ;
    areChildrenSemanticallyEquivalent(other, equivalenceContext) {
        return this.children.length === other.children.length
            && this.children.every((c, i) => c.isSemanticallyEquivalent(other.children[i], equivalenceContext));
    }
    entitiesUsed() {
        let ents = [];
        this.children.forEach(c => c.entitiesUsed().forEach(e => ents.push(e)));
        return ents;
    }
}
exports.CPPConstruct = CPPConstruct;
CPPConstruct.NEXT_ID = 0;
class RuntimeConstruct {
    constructor(model, stackType, parentOrSim) {
        this.observable = new observe_1.Observable(this);
        this.children = {};
        this.runtimeId = RuntimeConstruct.NEXT_ID++;
        this.isActive = false;
        this.isUpNext = false;
        this.isWaiting = false;
        this.isDone = false;
        this.cleanupStarted = false;
        // TODO: refactor pauses. maybe move them to the implementation
        this.pauses = {}; // TODO: remove any type
        this.model = model;
        this.stackType = stackType;
        if (parentOrSim instanceof RuntimeConstruct) {
            util_1.assert(this.parent !== this, "Code instance may not be its own parent");
            this.sim = parentOrSim.sim;
            util_1.assert(parentOrSim.sim === this.sim, "Runtime construct may not belong to a different simulation than its parent.");
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
    setContainingRuntimeFunction(func) {
        this.containingRuntimeFunction = func;
    }
    setContextualReceiver(obj) {
        this.contextualReceiver = obj;
    }
    /**
     * WARNING: The contextualReceiver property may be undefined, even though it's type suggests it will always
     * be defined. In most places where it is accessed, there is an implicit assumption that the runtime construct
     * for whom the lookup is being performed is situated in a context where there is a contextual receiver (e.g.
     * inside a member function) and the client code would end up needing a non-null assertion anyway. Those
     * non-null assertions are annoying, so instead we trick the type system and trust that this property will
     * be used appropriately by the programmer.
     */
    get contextualReceiver() {
        var _a;
        return (_a = this.containingRuntimeFunction) === null || _a === void 0 ? void 0 : _a.receiver;
    }
    /**
     * REQUIRES: this instance is on the top of the execution stack
     */
    stepForward() {
        this.observable.send("stepForward");
        return this.stepForwardImpl();
    }
    upNext() {
        this.isUpNext = true;
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
            if (this.cleanupConstruct && !this.cleanupConstruct.isDone) {
                this.sim.push(this.cleanupConstruct);
            }
            else {
                this.sim.pop();
            }
        }
        else {
            return this.upNextImpl();
        }
    }
    setPauseWhenUpNext() {
        this.pauses["upNext"] = { pauseWhenUpNext: true };
    }
    wait() {
        this.isUpNext = false;
        this.isWaiting = true;
        this.observable.send("wait");
    }
    afterPushed() {
        this.isActive = true;
        this.observable.send("pushed");
    }
    setCleanupConstruct(cleanupConstruct) {
        this.cleanupConstruct = cleanupConstruct;
    }
    startCleanup() {
        this.cleanupStarted = true;
        // If we're on top of the stack, go ahead and start the cleanup
        // (otherwise, wait until the next time we're on top and receive an upNext)
        // We do need to do this now, since startCleanup() could be called from
        // somewhere where we don't immediately get another upNext()
        if (this === this.sim.top()) {
            if (this.cleanupConstruct) {
                this.sim.push(this.cleanupConstruct);
            }
            else {
                this.sim.pop();
            }
        }
    }
    afterPopped() {
        this.isActive = false;
        this.isUpNext = false;
        this.isWaiting = false;
        this.isDone = true;
        this.observable.send("popped", this);
    }
    addChild(child) {
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
    findParentByModel(model) {
        var parent = this.parent;
        while (parent && parent.model.constructId != model.constructId) {
            parent = parent.parent;
        }
        return parent;
    }
    explain() {
        return this.model.explain(this.sim, this);
    }
    describe() {
        return this.model.describe(this.sim, this);
    }
}
exports.RuntimeConstruct = RuntimeConstruct;
RuntimeConstruct.NEXT_ID = 0;
class BasicCPPConstruct extends CPPConstruct {
    constructor(context, ast) {
        super(context, ast);
    }
    onAttach(parent) {
        this.parent = parent;
    }
}
exports.BasicCPPConstruct = BasicCPPConstruct;
class InvalidConstruct extends BasicCPPConstruct {
    constructor(context, ast, errorFn, children) {
        super(context, ast);
        this.construct_type = "invalid_construct";
        this.addNote(this.note = errorFn(this));
        children === null || children === void 0 ? void 0 : children.forEach(child => this.attach(child));
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && other.note.id === this.note.id
            && this.areChildrenSemanticallyEquivalent(other, equivalenceContext);
    }
}
exports.InvalidConstruct = InvalidConstruct;
class ContextualLocals {
    constructor() {
        this.localVariables = [];
        this.localObjects = [];
        this.localReferences = [];
        this.localVariablesByEntityId = {};
    }
    registerLocalVariable(local) {
        util_1.assert(!this.localVariablesByEntityId[local.entityId]);
        this.localVariablesByEntityId[local.entityId] = local;
        util_1.asMutable(this.localVariables).push(local);
        if (local.variableKind === "object") {
            util_1.asMutable(this.localObjects).push(local);
        }
        else {
            util_1.asMutable(this.localReferences).push(local);
        }
    }
}
exports.ContextualLocals = ContextualLocals;
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
class GlobalObjectAllocator extends CPPConstruct {
    constructor(context, globalObjects) {
        super(context, undefined); // Has no AST
        this.construct_type = "GlobalObjectAllocator";
        this.globalObjects = globalObjects;
    }
    onAttach(parent) {
        throw new Error("Method not implemented.");
    }
    createRuntimeConstruct(sim) {
        return new RuntimeGlobalObjectAllocator(this, sim);
    }
    // public isTailChild(child: ExecutableConstruct) {
    //     return {isTail: true};
    // }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && areAllSemanticallyEquivalent(this.globalObjects, other.globalObjects, equivalenceContext);
    }
}
exports.GlobalObjectAllocator = GlobalObjectAllocator;
class RuntimeGlobalObjectAllocator extends RuntimeConstruct {
    constructor(model, sim) {
        super(model, "statement", sim); // TODO: is "statement" the right stack type here? should I make a new one?
        this.index = 0;
    }
    upNextImpl() {
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
    stepForwardImpl() {
        return false;
    }
}
exports.RuntimeGlobalObjectAllocator = RuntimeGlobalObjectAllocator;
//# sourceMappingURL=constructs.js.map