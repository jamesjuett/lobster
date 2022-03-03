import type { ASTNode } from "../../ast/ASTNode";
import { asMutable, assert, Mutable } from "../../util/util";
import type { CPPConstruct, SuccessfullyCompiled } from "./constructs";
import { BasicCPPConstruct, RuntimeConstruct } from "./constructs";
import type { SemanticContext, TranslationUnitContext } from "../compilation/contexts";
import { areAllSemanticallyEquivalent } from "../compilation/contexts";
import { CompiledFunctionDefinition } from "./declarations/function/FunctionDefinition";
import type { FunctionEntity } from "../compilation/entities";
import { PassByReferenceParameterEntity, PassByValueParameterEntity, areEntitiesSemanticallyEquivalent, TemporaryObjectEntity } from "../compilation/entities";
import { CPPError } from "../compilation/errors";
import type { CompiledExpression, Expression, TypedExpression } from "./expressions/Expression";
import type { RuntimeFunction } from "../compilation/functions";
import { CompiledDirectInitializer, RuntimeDirectInitializer } from "./initializers/DirectInitializer";
import { DirectInitializer } from "./initializers/DirectInitializer";
import type { CPPObject } from "../objects";
import type { PotentialFullExpression, RuntimePotentialFullExpression } from "./PotentialFullExpression";
import type { AnalyticConstruct } from "../predicates";
import type { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import type { AtomicType, CompleteClassType, CompleteObjectType, CompleteReturnType, FunctionType, ReferenceType, VoidType } from "../types";


export class FunctionCall extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    public readonly construct_type = "FunctionCall";

    public readonly func: FunctionEntity<FunctionType<CompleteReturnType>>;
    public readonly args: readonly Expression[];
    public readonly receiverType?: CompleteClassType;

    public readonly argInitializers?: readonly DirectInitializer[];

    public readonly returnByValueTarget?: TemporaryObjectEntity;

    private readonly temporaryObjects: TemporaryObjectEntity[] = [];

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
    public constructor(context: TranslationUnitContext, func: FunctionEntity<FunctionType<CompleteReturnType>>, args: readonly TypedExpression[], receiverType: CompleteClassType | undefined) {
        super(context, undefined);

        this.func = func;
        this.receiverType = receiverType;

        let paramTypes = this.func.type.paramTypes;
        if (args.length !== paramTypes.length) {
            this.addNote(CPPError.param.numParams(this));
            this.attachAll(this.args = args);
            return;
        }

        // Note - destructors are allowed to ignore const semantics.
        // That is, even though a destructor is a non-const member function,
        // it is allowed to be called on const objects and suspends their constness
        if (this.func.isMemberFunction && !this.func.isDestructor
            && receiverType?.isConst && !this.func.type.receiverType?.isConst) {
            this.addNote(CPPError.param.thisConst(this, receiverType));
        }

        // Create initializers for each argument/parameter pair
        // Note that the args are NOT attached as children to the function call. Instead, they are attached to the initializers.
        this.argInitializers = args.map((arg, i) => {
            let paramType = paramTypes[i];
            if (paramType.isReferenceType()) {
                return DirectInitializer.create(context, new PassByReferenceParameterEntity(this.func, paramType, i), [arg], "copy");
            }
            else {
                assert(paramType.isCompleteParameterType());
                return DirectInitializer.create(context, new PassByValueParameterEntity(this.func, paramType, i), [arg], "copy");
            }
        });
        this.attachAll(this.argInitializers);

        // For convenience, an array with reference to the final arguments (i.e. including conversions) for the call
        this.args = this.argInitializers.map(argInit => argInit.args[0]);

        // TODO
        // this.isRecursive = this.func.definition === this.context.containingFunction;

        // TODO: need to check that it's not an auxiliary function call before adding these?
        // this.context.containingFunction.addCall(this);
        this.context.translationUnit.registerFunctionCall(this); // TODO: is this needed?
        this.func.registerCall(this);

        // No returns for void functions, of course.
        // If return by reference, the return object already exists and no need to create a temporary.
        // Else, for a return by value, we do need to create a temporary object.
        let returnType = this.func.type.returnType;
        if (!returnType.isVoidType() && !returnType.isReferenceType()) {
            let returnTarget = new TemporaryObjectEntity(returnType, this, this, `[${this.func.name}() return]`);
            asMutable(this).returnByValueTarget = returnTarget;
            this.addTemporaryObject(returnTarget);
        }
    }
    
    public override mayManageTemporaryLifetimes() : this is FunctionCall {
        return true;
    }
    
    public findFullExpression(): PotentialFullExpression | FunctionCall {
        return this.parent?.findFullExpression() ?? this;
    }

    public addTemporaryObject(tempObjEnt: TemporaryObjectEntity) {
        assert(!this.parent, "Temporary objects may not be added to a function call after it has been attached.");
        this.temporaryObjects.push(tempObjEnt);
        tempObjEnt.setOwner(this);
    }

    public override onAttach(parent: CPPConstruct) {

        super.onAttach(parent);

        if (this.func.isDestructor) {
            // Exception - implicitly called destructors will not return anything or take any arguments
            // and will thus have no temporary objects. This is good since our parent may be a
            // TemporaryDeallocator object that isn't a potential full epxression.
            return;
        }

        const full_exp = parent.findFullExpression();
        assert(full_exp, "Function calls may only be attached to a parent that is a potential full expression.");
        
        this.temporaryObjects.forEach((tempEnt) => {
            full_exp.addTemporaryObject(tempEnt);
        });
        this.temporaryObjects.length = 0; // clear array
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
    public createRuntimeFunctionCall<T extends FunctionType<CompleteReturnType> = FunctionType<CompleteReturnType>>(
        this: CompiledFunctionCall<T>,
        parent: RuntimeConstruct,
        receiver: CPPObject<CompleteClassType> | undefined): RuntimeFunctionCall<T> {
        return new RuntimeFunctionCall<T>(this, parent, receiver);
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
    public isReturnByValue(): this is TypedFunctionCall<FunctionType<AtomicType | CompleteClassType>> {
        let returnType = this.func.type.returnType;
        return returnType.isAtomicType() || returnType.isCompleteClassType();
    }

    public isReturnByReference(): this is TypedFunctionCall<FunctionType<ReferenceType>> {
        return this.func.type.returnType.isReferenceType();
    }

    public isReturnVoid(): this is TypedFunctionCall<FunctionType<VoidType>> {
        return this.func.type.returnType.isVoidType();
    }
    
    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && areEntitiesSemanticallyEquivalent(this.func, other.func, equivalenceContext)
            && areAllSemanticallyEquivalent(this.args, other.args, equivalenceContext);
    }
}

export interface TypedFunctionCall<T extends FunctionType<CompleteReturnType> = FunctionType<CompleteReturnType>> extends FunctionCall, SuccessfullyCompiled {
    readonly returnByValueTarget: T["returnType"] extends (AtomicType | CompleteClassType) ? TemporaryObjectEntity<T["returnType"]> : undefined;
}

export interface CompiledFunctionCall<T extends FunctionType<CompleteReturnType> = FunctionType<CompleteReturnType>> extends TypedFunctionCall<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly args: readonly CompiledExpression[];
    readonly argInitializers: readonly CompiledDirectInitializer[];
}

export const INDEX_FUNCTION_CALL_PUSH = 0;
export const INDEX_FUNCTION_CALL_ARGUMENTS = 1;
export const INDEX_FUNCTION_CALL_CALL = 2;
export const INDEX_FUNCTION_CALL_RETURN = 3;
export class RuntimeFunctionCall<T extends FunctionType<CompleteReturnType> = FunctionType<CompleteReturnType>> extends RuntimeConstruct<CompiledFunctionCall<T>> {

    public readonly model!: CompiledFunctionCall<T>; // narrows type of member in base class


    // public readonly functionDef : FunctionDefinition;
    public readonly calledFunction: RuntimeFunction<T>;
    public readonly argInitializers: readonly RuntimeDirectInitializer[];

    public readonly receiver?: CPPObject<CompleteClassType>;

    // public readonly hasBeenCalled: boolean = false;
    public readonly index: typeof INDEX_FUNCTION_CALL_PUSH | typeof INDEX_FUNCTION_CALL_ARGUMENTS | typeof INDEX_FUNCTION_CALL_CALL | typeof INDEX_FUNCTION_CALL_RETURN;

    public constructor(model: CompiledFunctionCall<T>, parent: RuntimeConstruct, receiver?: CPPObject<CompleteClassType>) {
        super(model, "call", parent);

        this.receiver = receiver;

        // TODO can i get rid of the non-null assertion or cast here?
        // Basically, the assumption depends on a RuntimeFunctionCall only being created
        // if the program was successfully linked (which also implies the FunctionDefinition was compiled)
        // It also assumes the function definition has the correct return type.
        // Note that the cast to a CompiledFunctionDefinition with return type T is fine w.r.t.
        // covariant return types because T can't ever be more specific than just "a class type".
        let functionDef = <CompiledFunctionDefinition<T>>this.model.func.getDynamicallyBoundFunction(receiver)!;

        // Create argument initializer instances
        this.argInitializers = this.model.argInitializers.map((aInit) => aInit.createRuntimeInitializer(this));

        // TODO: TCO? would reuse this.containingRuntimeFunction instead of creating new
        this.calledFunction = functionDef.createRuntimeFunction(this, this.receiver);

        // TODO: TCO? if using TCO, don't create a new return object, just reuse the old one
        if (this.isReturnByValue()) {
            // If return-by-value, set return object to temporary
            this.calledFunction.setReturnObject(this.model.returnByValueTarget.objectInstance(
                <RuntimePotentialFullExpression>this.findParentByModel(this.model.findFullExpression())
            ));
        }
        this.index = INDEX_FUNCTION_CALL_PUSH;
    }

    protected upNextImpl(): void {
        if (this.index === INDEX_FUNCTION_CALL_ARGUMENTS) {
            // Push all argument initializers. Push in reverse so they run left to right
            // (although this is not strictly necessary given they are indeterminately sequenced)
            for (var i = this.argInitializers.length - 1; i >= 0; --i) {
                this.sim.push(this.argInitializers[i]);
            }
            (<Mutable<this>>this).index = INDEX_FUNCTION_CALL_CALL;
        }
        else if (this.index === INDEX_FUNCTION_CALL_RETURN) {
            this.receiver && this.receiver.callEnded();
            this.calledFunction.loseControl();
            this.containingRuntimeFunction?.gainControl();
            this.startCleanup();
        }
    }

    protected stepForwardImpl(): void {
        if (this.index === INDEX_FUNCTION_CALL_PUSH) {

            // TODO: TCO? just do a tailCallReset, send "tailCalled" message
            this.calledFunction.pushStackFrame();
            (<Mutable<this>>this).index = INDEX_FUNCTION_CALL_ARGUMENTS;
        }
        else if (this.index === INDEX_FUNCTION_CALL_CALL) {

            this.containingRuntimeFunction?.loseControl();
            this.sim.push(this.calledFunction);
            this.calledFunction.gainControl();
            this.receiver && this.receiver.callReceived();

            // (<Mutable<this>>this).hasBeenCalled = true;
            this.observable.send("called", this.calledFunction);

            (<Mutable<this>>this).index = INDEX_FUNCTION_CALL_RETURN;
        }

    }

    public isReturnByValue(): this is RuntimeFunctionCall<FunctionType<AtomicType | CompleteClassType>> {
        return this.model.isReturnByValue();
    }
}
