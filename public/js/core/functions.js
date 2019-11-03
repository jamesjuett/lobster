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
var constructs_1 = require("./constructs");
var entities_1 = require("./entities");
var types_1 = require("./types");
var util_1 = require("../util/util");
var initializers_1 = require("./initializers");
var lodash_1 = require("lodash");
function createFunctionContext(context, containingFunction) {
    return Object.assign({}, context, { containingFunction: containingFunction, functionLocals: new FunctionLocals() });
}
exports.createFunctionContext = createFunctionContext;
var FunctionLocals = /** @class */ (function () {
    function FunctionLocals() {
        this.localObjects = [];
        this.localReferences = [];
        this.localVariablesByEntityId = {};
    }
    FunctionLocals.prototype.registerLocalVariable = function (local) {
        util_1.assert(!this.localVariablesByEntityId[local.entityId]);
        this.localVariablesByEntityId[local.entityId] = local;
        if (local instanceof entities_1.AutoEntity) {
            util_1.asMutable(this.localObjects).push(local);
        }
        else {
            util_1.asMutable(this.localReferences).push(local);
        }
    };
    return FunctionLocals;
}());
exports.FunctionLocals = FunctionLocals;
var RuntimeFunctionIndices;
(function (RuntimeFunctionIndices) {
})(RuntimeFunctionIndices || (RuntimeFunctionIndices = {}));
var RuntimeFunction = /** @class */ (function (_super) {
    __extends(RuntimeFunction, _super);
    function RuntimeFunction(model, parentOrSim, receiver) {
        var _this = _super.call(this, model, "function", parentOrSim) || this;
        _this.hasControl = false;
        if (parentOrSim instanceof RuntimeFunctionCall) {
            _this.caller = parentOrSim;
        }
        _this.receiver = receiver;
        // A function is its own containing function context
        // this.containingRuntimeFunction = this;
        _this.body = _this.model.body.createRuntimeStatement(_this);
        return _this;
    }
    // setCaller : function(caller) {
    //     this.i_caller = caller;
    // },
    RuntimeFunction.prototype.pushStackFrame = function () {
        this.stackFrame = this.sim.memory.stack.pushFrame(this);
    };
    /**
     * Sets the return object for this function. May only be invoked once.
     * e.g.
     *  - return-by-value: The caller should set the return object to a temporary object, whose value
     *                     may be initialized by a return statement.
     *  - return-by-reference: When the function is finished, is set to the object returned.
     */
    RuntimeFunction.prototype.setReturnObject = function (obj) {
        // This should only be used once
        util_1.assert(!this.returnObject);
        this.returnObject = obj;
    };
    RuntimeFunction.prototype.gainControl = function () {
        this.hasControl = true;
        this.observable.send("gainControl");
    };
    RuntimeFunction.prototype.loseControl = function () {
        this.hasControl = true;
        this.observable.send("loseControl");
    };
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
    RuntimeFunction.prototype.stepForwardImpl = function () {
    };
    RuntimeFunction.prototype.upNextImpl = function () {
        if (this.body.isDone) {
            this.sim.pop();
        }
        else {
            this.sim.push(this.body);
        }
    };
    return RuntimeFunction;
}(constructs_1.RuntimeConstruct));
exports.RuntimeFunction = RuntimeFunction;
// TODO: is this needed? I think RuntimeFunction may be able to handle all of it.
// export class RuntimeMemberFunction extends RuntimeFunction {
//     public readonly receiver: CPPObject<ClassType>;
//     public constructor (model: FunctionDefinition, parent: RuntimeFunctionCall, receiver: CPPObject<ClassType>) {
//         super(model, parent);
//         this.receiver = receiver;
//     }
// }
var FunctionCall = /** @class */ (function (_super) {
    __extends(FunctionCall, _super);
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
    function FunctionCall(context, func, args, receiver) {
        var _this = _super.call(this, context) || this;
        _this.func = func;
        _this.args = lodash_1.clone(args);
        _this.receiver = receiver;
        // Note that the args are NOT attached as children here. Instead, they are attached to the initializers.
        // Create initializers for each argument/parameter pair
        _this.argInitializers = args.map(function (arg, i) {
            var paramType = _this.func.type.paramTypes[i];
            if (paramType.isReferenceType()) {
                return initializers_1.CopyInitializer.create(context, new entities_1.PassByReferenceParameterEntity(_this.func, paramType.refTo, i), [arg]);
            }
            else {
                return initializers_1.CopyInitializer.create(context, new entities_1.PassByValueParameterEntity(_this.func, paramType, i), [arg]);
            }
        });
        // TODO
        // this.isRecursive = this.func.definition === this.context.containingFunction;
        // No returns for void functions, of course.
        // If return by reference, the return object already exists and no need to create a temporary.
        // Else, for a return by value, we do need to create a temporary object.
        var returnType = _this.func.type.returnType;
        if (!(returnType instanceof types_1.VoidType) && !(returnType instanceof types_1.ReferenceType)) {
            _this.returnByValueTarget = _this.createTemporaryObject(returnType, (_this.func.name || "unknown") + "() [return]");
        }
        // TODO: need to check that it's not an auxiliary function call before adding these?
        // this.context.containingFunction.addCall(this);
        _this.translationUnit.registerFunctionCall(_this); // TODO: is this needed?
        return _this;
    }
    // public checkLinkingProblems() {
    //     if (!this.func.isLinked()) {
    //         if (this.func.isLibraryUnsupported()) {
    //             let note = CPPError.link.library_unsupported(this, this.func);
    //             this.addNote(note);
    //             return note;
    //         }
    //         else {
    //             let note = CPPError.link.def_not_found(this, this.func);
    //             this.addNote(note);
    //             return note;
    //         }
    //     }
    //     return null;
    // }
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
    FunctionCall.prototype.createRuntimeFunctionCall = function (parent) {
        return new RuntimeFunctionCall(this, parent);
    };
    return FunctionCall;
}(constructs_1.PotentialFullExpression));
exports.FunctionCall = FunctionCall;
var INDEX_FUNCTION_CALL_PUSH = 0;
var INDEX_FUNCTION_CALL_ARGUMENTS = 1;
var INDEX_FUNCTION_CALL_CALL = 2;
var INDEX_FUNCTION_CALL_RETURN = 2;
var RuntimeFunctionCall = /** @class */ (function (_super) {
    __extends(RuntimeFunctionCall, _super);
    function RuntimeFunctionCall(model, parent) {
        var _this = _super.call(this, model, "call", parent) || this;
        // public readonly hasBeenCalled: boolean = false;
        _this.index = INDEX_FUNCTION_CALL_PUSH;
        // TODO can i get rid of the non-null assertion or cast here?
        // Basically, the assumption depends on a RuntimeFunctionCall only being created
        // if the program was successfully linked (which also implies the FunctionDefinition was compiled)
        // It also assumes the function definition has the correct return type.
        var functionDef = _this.model.func.definition;
        // Create argument initializer instances
        _this.argInitializers = _this.model.argInitializers.map(function (aInit) { return aInit.createRuntimeInitializer(_this); });
        // TODO: TCO? would reuse this.containingRuntimeFunction instead of creating new
        // for non-member functions, receiver undefined
        _this.receiver = _this.model.receiver && _this.model.receiver.runtimeLookup(_this);
        _this.calledFunction = functionDef.createRuntimeFunction(_this, _this.receiver);
        // TODO: TCO? if using TCO, don't create a new return object, just reuse the old one
        if (_this.model.returnByValueTarget) {
            // If return-by-value, set return object to temporary
            var cf = _this.calledFunction; // TODO: may be able to get rid of this cast if CompiledFunctionDefinition provided more info about return type
            cf.setReturnObject(_this.model.returnByValueTarget.objectInstance(_this));
        }
        _this.index = INDEX_FUNCTION_CALL_CALL;
        return _this;
    }
    RuntimeFunctionCall.prototype.upNextImpl = function () {
        if (this.index === INDEX_FUNCTION_CALL_ARGUMENTS) {
            // Push all argument initializers. Push in reverse so they run left to right
            // (although this is not strictly necessary given they are indeterminately sequenced)
            for (var i = this.argInitializers.length - 1; i >= 0; --i) {
                this.sim.push(this.argInitializers[i]);
            }
        }
        else if (this.index === INDEX_FUNCTION_CALL_RETURN) {
            this.calledFunction.loseControl();
            this.containingRuntimeFunction.gainControl();
            this.done();
            this.sim.pop();
        }
    };
    RuntimeFunctionCall.prototype.stepForwardImpl = function () {
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
    };
    return RuntimeFunctionCall;
}(constructs_1.RuntimePotentialFullExpression));
exports.RuntimeFunctionCall = RuntimeFunctionCall;
//# sourceMappingURL=functions.js.map