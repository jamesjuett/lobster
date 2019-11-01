import { BasicCPPConstruct, RuntimeConstruct, PotentialFullExpression, RuntimePotentialFullExpression, SuccessfullyCompiled, ConstructContext, CompiledTemporaryDeallocator } from "./constructs";
import { FunctionEntity, ObjectEntity, TemporaryObjectEntity, PassByValueParameterEntity, LocalVariableEntity, LocalReferenceEntity, AutoEntity, PassByReferenceParameterEntity } from "./entities";
import { RuntimeBlock, CompiledBlock } from "./statements";
import { PotentialReturnType, ClassType, ObjectType, ReferenceType, NoRefType, VoidType, FunctionType } from "./types";
import { MemoryFrame } from "./runtimeEnvironment";
import { CPPObject } from "./objects";
import { Simulation } from "./Simulation";
import { Mutable, assert, asMutable } from "../util/util";
import { TypedExpression, ValueCategory } from "./expressions";
import { CopyInitializer, RuntimeCopyInitializer, CompiledCopyInitializer } from "./initializers";
import { clone } from "lodash";
import { CPPError } from "./errors";
import { CompiledFunctionDefinition } from "./declarations";


export interface FunctionContext extends ConstructContext {
    readonly containingFunction: FunctionEntity;
    readonly functionLocals: FunctionLocals;
}

export function createFunctionContext(context: ConstructContext, containingFunction: FunctionEntity) : FunctionContext {
    return Object.assign({}, context, {containingFunction: containingFunction, functionLocals: new FunctionLocals()});
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
        if (local instanceof AutoEntity) {
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

    public constructor (model: CompiledFunctionDefinition, parent: RuntimeFunctionCall);
    public constructor (model: CompiledFunctionDefinition, sim: Simulation);
    public constructor (model: CompiledFunctionDefinition, parentOrSim: RuntimeFunctionCall | Simulation ) {
        super(model, "function", <any>parentOrSim);
        if (parentOrSim instanceof RuntimeFunctionCall) {
            this.caller = parentOrSim;
        }

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
            this.sim.pop();
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


export class FunctionCall extends PotentialFullExpression {
    
    public readonly func: FunctionEntity;
    public readonly args: readonly TypedExpression[];
    public readonly receiver?: ObjectEntity<ClassType>;

    public readonly argInitializers: readonly CopyInitializer[];
    
    public readonly returnByValueTarget?: TemporaryObjectEntity;
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
    public constructor(context: ConstructContext, func: FunctionEntity, args: readonly TypedExpression[], receiver?: ObjectEntity<ClassType>) {
        super(context);

        this.func = func;
        this.args = clone(args);
        this.receiver = receiver;

        // Note that the args are NOT attached as children here. Instead, they are attached to the initializers.

        // Create initializers for each argument/parameter pair
        this.argInitializers = args.map((arg, i) => {
            let paramType = this.func.type.paramTypes[i];
            if (paramType.isReferenceType()) {
                return CopyInitializer.create(context, new PassByReferenceParameterEntity(this.func, paramType.refTo, i), [arg]);
            }
            else {
                return CopyInitializer.create(context, new PassByValueParameterEntity(this.func, paramType, i), [arg]);
            }
        });

        // TODO
        // this.isRecursive = this.func.definition === this.context.containingFunction;

        // No returns for void functions, of course.
        // If return by reference, the return object already exists and no need to create a temporary.
        // Else, for a return by value, we do need to create a temporary object.
        let returnType = this.func.type.returnType;
        if ( !(returnType instanceof VoidType) && !(returnType instanceof ReferenceType)) {
            this.returnByValueTarget = this.createTemporaryObject(returnType, (this.func.name || "unknown") + "() [return]");
        }

        // TODO: need to check that it's not an auxiliary function call before adding these?
        // this.context.containingFunction.addCall(this);
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

    public createRuntimeFunctionCall<T extends PotentialReturnType = PotentialReturnType, V extends ValueCategory = ValueCategory>(this: CompiledFunctionCall<T,V>, parent: RuntimePotentialFullExpression) : RuntimeFunctionCall<T,V> {
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

export interface CompiledFunctionCall<T extends PotentialReturnType = PotentialReturnType> extends FunctionCall, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    
    readonly args: readonly TypedExpression[];
    readonly argInitializers: readonly CompiledCopyInitializer[];
    readonly returnByValueTarget?: T extends ObjectType ? TemporaryObjectEntity<T> : undefined;
}

const INDEX_FUNCTION_CALL_PUSH = 0;
const INDEX_FUNCTION_CALL_ARGUMENTS = 1;
const INDEX_FUNCTION_CALL_CALL = 2;
const INDEX_FUNCTION_CALL_RETURN = 2;
export class RuntimeFunctionCall<T extends PotentialReturnType = PotentialReturnType> extends RuntimePotentialFullExpression<CompiledFunctionCall<T>> {

    public readonly model!: CompiledFunctionCall<T>; // narrows type of member in base class

    // public readonly functionDef : FunctionDefinition;
    public readonly calledFunction : RuntimeFunction<T>;
    public readonly argInitializers: readonly RuntimeCopyInitializer[];

    public readonly receiver?: CPPObject<ClassType>

    // public readonly hasBeenCalled: boolean = false;

    private index : typeof INDEX_FUNCTION_CALL_PUSH | typeof INDEX_FUNCTION_CALL_ARGUMENTS | typeof INDEX_FUNCTION_CALL_CALL | typeof INDEX_FUNCTION_CALL_RETURN = INDEX_FUNCTION_CALL_PUSH;

    public constructor (model: CompiledFunctionCall<T>, parent: RuntimeConstruct) {
        super(model, "call", parent);
        let functionDef = this.model.func.definition!; // TODO
        
        // Create argument initializer instances
        this.argInitializers = this.model.argInitializers.map((aInit) => aInit.createRuntimeInitializer(this));



        // TODO: TCO? would reuse this.containingRuntimeFunction instead of creating new
        
         // for non-member functions, receiver undefined
        this.receiver = this.model.receiver && this.model.receiver.runtimeLookup(this);
        this.calledFunction = functionDef.createRuntimeFunction(this, this.receiver);

                // TODO: TCO? if using TCO, don't create a new return object, just reuse the old one
        if (this.model.returnByValueTarget) {
            // If return-by-value, set return object to temporary
            let cf = <RuntimeFunction<ObjectType>>this.calledFunction; // TODO: may be able to get rid of this cast if CompiledFunctionDefinition provided more info about return type
            cf.setReturnObject(this.model.returnByValueTarget.objectInstance(this));
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
