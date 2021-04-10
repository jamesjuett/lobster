"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeFunctionCall = exports.INDEX_FUNCTION_CALL_RETURN = exports.INDEX_FUNCTION_CALL_CALL = exports.INDEX_FUNCTION_CALL_ARGUMENTS = exports.INDEX_FUNCTION_CALL_PUSH = exports.FunctionCall = void 0;
const entities_1 = require("./entities");
const util_1 = require("../util/util");
const types_1 = require("./types");
const constructs_1 = require("./constructs");
const errors_1 = require("./errors");
const initializers_1 = require("./initializers");
const PotentialFullExpression_1 = require("./PotentialFullExpression");
class FunctionCall extends PotentialFullExpression_1.PotentialFullExpression {
    /**
     * A FunctionEntity must be provided to specify which function is being called. The
     * return type of that function must be complete (if it's not, such a function call
     * should generate an error - the constructs that use FunctionCall should take care
     * of checking for this before making the FunctionCall and generate an error otherwise).
     *
     * @param context
     * @param func Specifies which function is being called.
     * @param args Arguments to the function.
     * @param receiverType
     */
    constructor(context, func, args, receiverType) {
        var _a;
        super(context, undefined);
        this.construct_type = "FunctionCall";
        this.func = func;
        this.receiverType = receiverType;
        let paramTypes = this.func.type.paramTypes;
        if (args.length !== paramTypes.length) {
            this.addNote(errors_1.CPPError.param.numParams(this));
            this.attachAll(this.args = args);
            return;
        }
        // Note - destructors are allowed to ignore const semantics.
        // That is, even though a destructor is a non-const member function,
        // it is allowed to be called on const objects and suspends their constness
        if (this.func.isMemberFunction && !this.func.isDestructor
            && (receiverType === null || receiverType === void 0 ? void 0 : receiverType.isConst) && !((_a = this.func.type.receiverType) === null || _a === void 0 ? void 0 : _a.isConst)) {
            this.addNote(errors_1.CPPError.param.thisConst(this, receiverType));
        }
        // Create initializers for each argument/parameter pair
        // Note that the args are NOT attached as children to the function call. Instead, they are attached to the initializers.
        this.argInitializers = args.map((arg, i) => {
            let paramType = paramTypes[i];
            if (paramType.isReferenceType()) {
                return initializers_1.DirectInitializer.create(context, new entities_1.PassByReferenceParameterEntity(this.func, paramType, i), [arg], "copy");
            }
            else {
                util_1.assert(paramType.isCompleteParameterType());
                return initializers_1.DirectInitializer.create(context, new entities_1.PassByValueParameterEntity(this.func, paramType, i), [arg], "copy");
            }
        });
        this.attachAll(this.argInitializers);
        // For convenience, an array with reference to the final arguments (i.e. including conversions) for the call
        this.args = this.argInitializers.map(argInit => argInit.args[0]);
        // TODO
        // this.isRecursive = this.func.definition === this.context.containingFunction;
        // No returns for void functions, of course.
        // If return by reference, the return object already exists and no need to create a temporary.
        // Else, for a return by value, we do need to create a temporary object.
        let returnType = this.func.type.returnType;
        if (!(returnType instanceof types_1.VoidType) && !(returnType instanceof types_1.ReferenceType)) {
            this.returnByValueTarget = this.createTemporaryObject(returnType, `[${this.func.name}() return]`);
        }
        // TODO: need to check that it's not an auxiliary function call before adding these?
        // this.context.containingFunction.addCall(this);
        this.context.translationUnit.registerFunctionCall(this); // TODO: is this needed?
        this.func.registerCall(this);
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
    createRuntimeFunctionCall(parent, receiver) {
        return new RuntimeFunctionCall(this, parent, receiver);
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
    isReturnByValue() {
        let returnType = this.func.type.returnType;
        return returnType.isAtomicType() || returnType.isCompleteClassType();
    }
    isReturnByReference() {
        return this.func.type.returnType.isReferenceType();
    }
    isReturnVoid() {
        return this.func.type.returnType.isVoidType();
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && entities_1.areEntitiesSemanticallyEquivalent(this.func, other.func, equivalenceContext)
            && constructs_1.areAllSemanticallyEquivalent(this.args, other.args, equivalenceContext);
    }
}
exports.FunctionCall = FunctionCall;
exports.INDEX_FUNCTION_CALL_PUSH = 0;
exports.INDEX_FUNCTION_CALL_ARGUMENTS = 1;
exports.INDEX_FUNCTION_CALL_CALL = 2;
exports.INDEX_FUNCTION_CALL_RETURN = 3;
class RuntimeFunctionCall extends PotentialFullExpression_1.RuntimePotentialFullExpression {
    constructor(model, parent, receiver) {
        super(model, "call", parent);
        this.receiver = receiver;
        // TODO can i get rid of the non-null assertion or cast here?
        // Basically, the assumption depends on a RuntimeFunctionCall only being created
        // if the program was successfully linked (which also implies the FunctionDefinition was compiled)
        // It also assumes the function definition has the correct return type.
        // Note that the cast to a CompiledFunctionDefinition with return type T is fine w.r.t.
        // covariant return types because T can't ever be more specific than just "a class type".
        let functionDef = this.model.func.getDynamicallyBoundFunction(receiver);
        // Create argument initializer instances
        this.argInitializers = this.model.argInitializers.map((aInit) => aInit.createRuntimeInitializer(this));
        // TODO: TCO? would reuse this.containingRuntimeFunction instead of creating new
        this.calledFunction = functionDef.createRuntimeFunction(this, this.receiver);
        // TODO: TCO? if using TCO, don't create a new return object, just reuse the old one
        if (this.isReturnByValue()) {
            // If return-by-value, set return object to temporary
            this.calledFunction.setReturnObject(this.model.returnByValueTarget.objectInstance(this));
        }
        this.index = exports.INDEX_FUNCTION_CALL_PUSH;
    }
    upNextImpl() {
        var _a;
        if (this.index === exports.INDEX_FUNCTION_CALL_ARGUMENTS) {
            // Push all argument initializers. Push in reverse so they run left to right
            // (although this is not strictly necessary given they are indeterminately sequenced)
            for (var i = this.argInitializers.length - 1; i >= 0; --i) {
                this.sim.push(this.argInitializers[i]);
            }
            this.index = exports.INDEX_FUNCTION_CALL_CALL;
        }
        else if (this.index === exports.INDEX_FUNCTION_CALL_RETURN) {
            this.receiver && this.receiver.callEnded();
            this.calledFunction.loseControl();
            (_a = this.containingRuntimeFunction) === null || _a === void 0 ? void 0 : _a.gainControl();
            this.startCleanup();
        }
    }
    stepForwardImpl() {
        var _a;
        if (this.index === exports.INDEX_FUNCTION_CALL_PUSH) {
            // TODO: TCO? just do a tailCallReset, send "tailCalled" message
            this.calledFunction.pushStackFrame();
            this.index = exports.INDEX_FUNCTION_CALL_ARGUMENTS;
        }
        else if (this.index === exports.INDEX_FUNCTION_CALL_CALL) {
            (_a = this.containingRuntimeFunction) === null || _a === void 0 ? void 0 : _a.loseControl();
            this.sim.push(this.calledFunction);
            this.calledFunction.gainControl();
            this.receiver && this.receiver.callReceived();
            // (<Mutable<this>>this).hasBeenCalled = true;
            this.observable.send("called", this.calledFunction);
            this.index = exports.INDEX_FUNCTION_CALL_RETURN;
        }
    }
    isReturnByValue() {
        return this.model.isReturnByValue();
    }
}
exports.RuntimeFunctionCall = RuntimeFunctionCall;
//# sourceMappingURL=FunctionCall.js.map