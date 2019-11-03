"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var entities_1 = require("./entities");
var errors_1 = require("./errors");
var util_1 = require("../util/util");
var observe_1 = require("../util/observe");
;
function createTranslationUnitContext(context, translationUnit, contextualScope) {
    return Object.assign({}, context, { translationUnit: translationUnit, contextualScope: contextualScope });
}
exports.createTranslationUnitContext = createTranslationUnitContext;
var CPPConstruct = /** @class */ (function () {
    function CPPConstruct(context) {
        this.notes = [];
        this.hasErrors = false;
        this.children = [];
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
    CPPConstruct.prototype.attach = function (child) {
        util_1.asMutable(this.children).push(child);
        child.onAttach(this);
        // TODO: add notes from child?
    };
    CPPConstruct.prototype.attachAll = function (children) {
        var _this = this;
        children.forEach(function (child) { return _this.attach(child); });
    };
    /**
     * Used by "createFromAST" static "named constructor" functions in derived classes
     * to set the AST from which a construct was created. Returns `this` for convenience.
     */
    CPPConstruct.prototype.setAST = function (ast) {
        util_1.asMutable(this).ast = ast;
        if (!ast.source) {
            util_1.assertFalse("AST source is undefined. A track() call is likely missing in the grammar.");
        }
        util_1.asMutable(this).sourceReference = this.context.translationUnit.getSourceReference(ast.source.line, ast.source.column, ast.source.start, ast.source.end);
        return this; // TODO: this whole function is going to go away, so this ugly cast will too
    };
    // public getSourceText() {
    //     return this.ast.code ? this.ast.code.text : "an expression";
    // }
    // public isLibraryConstruct() {
    //     return this.libraryId !== undefined;
    // }
    // public getLibraryId() {
    //     return this.libraryId;
    // }
    CPPConstruct.prototype.explain = function (sim, rtConstruct) {
        return { message: "[No explanation available.]", ignore: true };
    };
    CPPConstruct.prototype.describe = function (sim, rtConstruct) {
        return { message: "[No description available.]", ignore: false };
    };
    CPPConstruct.prototype.addNote = function (note) {
        this.notes.push(note);
        if (note.kind === errors_1.NoteKind.ERROR) {
            this.hasErrors = true;
        }
        // if (this.parent && this.i_auxiliaryLevel === this.parent.i_auxiliaryLevel) {
        //     this.parent.addNote(note);
        // }
    };
    // getNotes : function() {
    //     return this.i_notes;
    // },
    CPPConstruct.prototype.getNearestSourceReference = function () {
        var construct = this;
        while (!construct.sourceReference && construct.parent) {
            construct = construct.parent;
        }
        return construct.sourceReference || this.context.translationUnit.getSourceReference(0, 0, 0, 0);
    };
    CPPConstruct.NEXT_ID = 0;
    return CPPConstruct;
}());
exports.CPPConstruct = CPPConstruct;
var RuntimeConstruct = /** @class */ (function () {
    function RuntimeConstruct(model, stackType, parentOrSim) {
        this.observable = new observe_1.Observable(this);
        this.pushedChildren = {}; // TODO: change name (the children are not necessarily pushed)
        this.isActive = false;
        this.isDone = false;
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
    /**
     * REQUIRES: this instance is on the top of the execution stack
     */
    RuntimeConstruct.prototype.stepForward = function () {
        this.observable.send("stepForward");
        return this.stepForwardImpl();
    };
    RuntimeConstruct.prototype.upNext = function () {
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
    };
    RuntimeConstruct.prototype.done = function () {
        this.isDone = true;
    };
    RuntimeConstruct.prototype.setPauseWhenUpNext = function () {
        this.pauses["upNext"] = { pauseWhenUpNext: true };
    };
    RuntimeConstruct.prototype.wait = function () {
        this.observable.send("wait");
    };
    RuntimeConstruct.prototype.pushed = function () {
        this.isActive = true;
        this.observable.send("pushed");
    };
    RuntimeConstruct.prototype.popped = function () {
        this.isActive = false;
        this.observable.send("popped", this);
    };
    RuntimeConstruct.prototype.addChild = function (child) {
        this.pushedChildren[child.model.id] = child;
        this.observable.send("childPushed", child);
    };
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
    RuntimeConstruct.prototype.findParentByModel = function (model) {
        var parent = this.parent;
        while (parent && parent.model.id != model.id) {
            parent = parent.parent;
        }
        return parent;
    };
    RuntimeConstruct.prototype.explain = function () {
        return this.model.explain(this.sim, this);
    };
    RuntimeConstruct.prototype.describe = function () {
        return this.model.describe(this.sim, this);
    };
    return RuntimeConstruct;
}());
exports.RuntimeConstruct = RuntimeConstruct;
var BasicCPPConstruct = /** @class */ (function (_super) {
    __extends(BasicCPPConstruct, _super);
    function BasicCPPConstruct(context) {
        return _super.call(this, context) || this;
    }
    BasicCPPConstruct.prototype.onAttach = function (parent) {
        this.parent = parent;
    };
    return BasicCPPConstruct;
}(CPPConstruct));
exports.BasicCPPConstruct = BasicCPPConstruct;
var InvalidConstruct = /** @class */ (function (_super) {
    __extends(InvalidConstruct, _super);
    function InvalidConstruct(context, errorFn) {
        var _this = _super.call(this, context) || this;
        _this.addNote(_this.note = errorFn(_this));
        return _this;
    }
    return InvalidConstruct;
}(BasicCPPConstruct));
exports.InvalidConstruct = InvalidConstruct;
var PotentialFullExpression = /** @class */ (function (_super) {
    __extends(PotentialFullExpression, _super);
    function PotentialFullExpression() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.temporaryObjects = [];
        return _this;
    }
    PotentialFullExpression.prototype.onAttach = function (parent) {
        this.parent = parent;
        // This may no longer be a full expression. If so, move temporary entities to
        // their new full expression.
        if (!this.isFullExpression()) {
            var fe_1 = this.findFullExpression();
            this.temporaryObjects.forEach(function (tempEnt) {
                fe_1.addTemporaryObject(tempEnt);
            });
            this.temporaryObjects.length = 0; // clear array
        }
        // Now that we are attached, the assumption is no more temporary entities
        // will be added to this construct or its attached children. (There's an
        // assert in addTemporaryObject() to prevent this.) That means it is now
        // safe to compile and add the temporary deallocator construct as a child.
        if (this.temporaryObjects.length > 0) {
            this.temporaryDeallocator = new TemporaryDeallocator(this.context, this.temporaryObjects);
            this.attach(this.temporaryDeallocator);
        }
    };
    PotentialFullExpression.prototype.isFullExpression = function () {
        if (!this.parent || !(this.parent instanceof PotentialFullExpression)) {
            return true;
        }
        return !this.parent.isFullExpression();
    };
    // TODO: this function can probably be cleaned up so that it doesn't require these ugly runtime checks
    /**
     * Returns the nearest full expression containing this expression (possibly itself).
     * @param inst
     */
    PotentialFullExpression.prototype.findFullExpression = function () {
        if (this.isFullExpression()) {
            return this;
        }
        if (!this.parent || !(this.parent instanceof PotentialFullExpression)) {
            return util_1.assertFalse("failed to find full expression for " + this);
        }
        return this.parent.findFullExpression();
    };
    PotentialFullExpression.prototype.addTemporaryObject = function (tempObjEnt) {
        util_1.assert(!this.parent, "Temporary objects may not be added to a full expression after it has been attached.");
        this.temporaryObjects.push(tempObjEnt);
        tempObjEnt.setOwner(this);
    };
    PotentialFullExpression.prototype.createTemporaryObject = function (type, description) {
        var fe = this.findFullExpression();
        var tempObjEnt = new entities_1.TemporaryObjectEntity(type, this, fe, description);
        this.temporaryObjects[tempObjEnt.entityId] = tempObjEnt;
        return tempObjEnt;
    };
    return PotentialFullExpression;
}(BasicCPPConstruct));
exports.PotentialFullExpression = PotentialFullExpression;
var RuntimePotentialFullExpression = /** @class */ (function (_super) {
    __extends(RuntimePotentialFullExpression, _super);
    function RuntimePotentialFullExpression(model, stackType, parent) {
        var _this = _super.call(this, model, stackType, parent) || this;
        _this.temporaryObjects = {};
        if (_this.model.temporaryDeallocator) {
            _this.temporaryDeallocator = _this.model.temporaryDeallocator.createRuntimeConstruct(_this);
        }
        _this.containingFullExpression = _this.findFullExpression();
        return _this;
    }
    RuntimePotentialFullExpression.prototype.findFullExpression = function () {
        var rt = this;
        while (rt instanceof RuntimePotentialFullExpression && !rt.model.isFullExpression() && rt.parent) {
            rt = rt.parent;
        }
        if (rt instanceof RuntimePotentialFullExpression) {
            return rt;
        }
        else {
            return util_1.assertFalse();
        }
    };
    RuntimePotentialFullExpression.prototype.done = function () {
        if (this.temporaryDeallocator) {
            this.sim.push(this.temporaryDeallocator);
        }
        _super.prototype.done.call(this);
    };
    return RuntimePotentialFullExpression;
}(RuntimeConstruct));
exports.RuntimePotentialFullExpression = RuntimePotentialFullExpression;
var TemporaryDeallocator = /** @class */ (function (_super) {
    __extends(TemporaryDeallocator, _super);
    // public readonly dtors: (MemberFunctionCall | null)[];
    function TemporaryDeallocator(context, temporaryObjects) {
        var _this = _super.call(this, context) || this;
        _this.temporaryObjects = temporaryObjects;
        return _this;
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
    TemporaryDeallocator.prototype.createRuntimeConstruct = function (parent) {
        return new RuntimeTemporaryDeallocator(this, parent);
    };
    return TemporaryDeallocator;
}(BasicCPPConstruct));
exports.TemporaryDeallocator = TemporaryDeallocator;
var RuntimeTemporaryDeallocator = /** @class */ (function (_super) {
    __extends(RuntimeTemporaryDeallocator, _super);
    function RuntimeTemporaryDeallocator(model, parent) {
        var _this = _super.call(this, model, "expression", parent) || this;
        _this.index = 0;
        _this.justDestructed = false;
        return _this;
    }
    RuntimeTemporaryDeallocator.prototype.upNextImpl = function () {
        // for (var key in this.temporaries){
        //     var tempObjInst = this.temporaries[key].runtimeLookup(sim, inst.parent);
        //     if (tempObjInst) {
        //         sim.memory.deallocateTemporaryObject(tempObjInst, inst);
        //     }
        // }
        // this.done(sim, inst);
        // return true;
        // let dtors = this.model.dtors;
        var dtors = this.model.temporaryObjects.map(function (t) { return null; }); // TODO CLASSES: replace this hack with above
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
        else {
            this.sim.pop();
        }
    };
    RuntimeTemporaryDeallocator.prototype.stepForwardImpl = function () {
        return false;
    };
    return RuntimeTemporaryDeallocator;
}(RuntimeConstruct));
exports.RuntimeTemporaryDeallocator = RuntimeTemporaryDeallocator;
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
var UnsupportedConstruct = /** @class */ (function (_super) {
    __extends(UnsupportedConstruct, _super);
    function UnsupportedConstruct(context, unsupportedName) {
        var _this = _super.call(this, context) || this;
        _this.addNote(errors_1.CPPError.lobster.unsupported_feature(_this, unsupportedName));
        return _this;
    }
    return UnsupportedConstruct;
}(BasicCPPConstruct));
exports.UnsupportedConstruct = UnsupportedConstruct;
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
var GlobalObjectAllocator = /** @class */ (function (_super) {
    __extends(GlobalObjectAllocator, _super);
    function GlobalObjectAllocator(context, globalObjects) {
        var _this = _super.call(this, context) || this;
        _this.globalObjects = globalObjects;
        return _this;
    }
    GlobalObjectAllocator.prototype.onAttach = function (parent) {
        throw new Error("Method not implemented.");
    };
    GlobalObjectAllocator.prototype.createRuntimeConstruct = function (sim) {
        return new RuntimeGlobalObjectAllocator(this, sim);
    };
    return GlobalObjectAllocator;
}(CPPConstruct));
exports.GlobalObjectAllocator = GlobalObjectAllocator;
var RuntimeGlobalObjectAllocator = /** @class */ (function (_super) {
    __extends(RuntimeGlobalObjectAllocator, _super);
    function RuntimeGlobalObjectAllocator(model, sim) {
        var _this = _super.call(this, model, "statement", sim) || this;
        _this.index = 0;
        return _this;
    }
    RuntimeGlobalObjectAllocator.prototype.upNextImpl = function () {
        // let dtors = this.model.dtors;
        if (this.index < this.model.globalObjects.length) {
            var objDef = this.model.globalObjects[this.index];
            this.sim.memory.allocateStatic(objDef);
            if (objDef.initializer) {
                this.sim.push(objDef.initializer.createRuntimeInitializer(this));
            }
            ++this.index;
        }
        else {
            this.sim.pop();
        }
    };
    RuntimeGlobalObjectAllocator.prototype.stepForwardImpl = function () {
        return false;
    };
    return RuntimeGlobalObjectAllocator;
}(RuntimeConstruct));
exports.RuntimeGlobalObjectAllocator = RuntimeGlobalObjectAllocator;
//# sourceMappingURL=constructs.js.map