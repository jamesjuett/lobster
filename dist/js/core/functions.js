"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeFunction = void 0;
const constructs_1 = require("./constructs");
const statements_1 = require("./statements");
const util_1 = require("../util/util");
const entities_1 = require("./entities");
var RuntimeFunctionIndices;
(function (RuntimeFunctionIndices) {
})(RuntimeFunctionIndices || (RuntimeFunctionIndices = {}));
class RuntimeFunction extends constructs_1.RuntimeConstruct {
    constructor(model, sim, caller, receiver) {
        var _a;
        super(model, "function", caller || sim);
        // T extends FunctionType<VoidType> ? undefined :
        // T extends FunctionType<ReferenceType<CompleteObjectType>> ? CPPObject<ReferredType<T["returnType"]>> :
        // T extends (FunctionType<AtomicType> | FunctionType<CompleteClassType>) ? CPPObject<T["returnType"]> :
        // T extends FunctionType<infer T> ? 
        // never; // includese FunctionType<ReferenceType<IncompleteObjectType>> - that should never be created at runtime
        this.hasControl = false;
        if (caller) {
            this.caller = caller;
        }
        ;
        this.receiver = receiver;
        // A function is its own containing function context
        this.setContainingRuntimeFunction(this);
        this.ctorInitializer = (_a = model.ctorInitializer) === null || _a === void 0 ? void 0 : _a.createRuntimeCtorInitializer(this);
        this.body = statements_1.createRuntimeStatement(model.body, this);
        if (model.memberDeallocator) {
            this.memberDeallocator = model.memberDeallocator.createRuntimeConstruct(this);
            this.setCleanupConstruct(this.memberDeallocator);
        }
    }
    // setCaller : function(caller) {
    //     this.i_caller = caller;
    // },
    pushStackFrame() {
        this.stackFrame = this.sim.memory.stack.pushFrame(this);
    }
    popStackFrame() {
        this.sim.memory.stack.popFrame(this);
    }
    setReturnObject(obj) {
        // This should only be used once
        util_1.assert(!this.returnObject);
        this.returnObject = obj;
    }
    getParameterObject(num) {
        let param = this.model.parameters[num].declaredEntity;
        util_1.assert((param === null || param === void 0 ? void 0 : param.variableKind) === "object", "Can't look up an object for a reference parameter.");
        util_1.assert(this.stackFrame);
        return this.stackFrame.localObjectLookup(param);
    }
    // TODO: apparently this is not used?
    // public initializeParameterObject(num: number, value: Value<AtomicType>) {
    //     let param = this.model.parameters[num].declaredEntity;
    //     assert(param instanceof LocalObjectEntity, "Can't look up an object for a reference parameter.");
    //     assert(this.stackFrame);
    //     assert(param.type.isAtomicType());
    //     this.stackFrame.initializeLocalObject(<LocalObjectEntity<AtomicType>>param, <Value<AtomicType>>value);
    // }
    bindReferenceParameter(num, obj) {
        let param = this.model.parameters[num].declaredEntity;
        util_1.assert(param instanceof entities_1.LocalReferenceEntity, "Can't bind an object parameter like a reference.");
        util_1.assert(this.stackFrame);
        return this.stackFrame.bindLocalReference(param, obj);
    }
    gainControl() {
        this.hasControl = true;
        this.observable.send("gainControl");
    }
    loseControl() {
        this.hasControl = true;
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
    stepForwardImpl() {
        this.popStackFrame();
        this.startCleanup();
    }
    upNextImpl() {
        if (this.ctorInitializer && !this.ctorInitializer.isDone) {
            this.sim.push(this.ctorInitializer);
        }
        else if (!this.body.isDone) {
            this.sim.push(this.body);
        }
    }
}
exports.RuntimeFunction = RuntimeFunction;
// TODO: is this needed? I think RuntimeFunction may be able to handle all of it.
// export class RuntimeMemberFunction extends RuntimeFunction {
//     public readonly receiver: CPPObject<ClassType>;
//     public constructor (model: FunctionDefinition, parent: RuntimeFunctionCall, receiver: CPPObject<ClassType>) {
//         super(model, parent);
//         this.receiver = receiver;
//     }
// }
//# sourceMappingURL=functions.js.map