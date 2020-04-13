import { FunctionType, ClassType, VoidType, NoRefType, ObjectType, ReferenceType, AtomicType } from "./types";
import { RuntimeConstruct } from "./constructs";
import { CompiledFunctionDefinition } from "./declarations";
import { RuntimeFunctionCall } from "./functionCall";
import { MemoryFrame, Value } from "./runtimeEnvironment";
import { CPPObject } from "./objects";
import { RuntimeBlock, createRuntimeStatement } from "./statements";
import { Simulation } from "./Simulation";
import { Mutable, assert } from "../util/util";
import { LocalObjectEntity, LocalReferenceEntity } from "./entities";

enum RuntimeFunctionIndices {

}

export class RuntimeFunction<T extends FunctionType = FunctionType> extends RuntimeConstruct<CompiledFunctionDefinition<T>> {

    public readonly caller?: RuntimeFunctionCall;
    // public readonly containingRuntimeFunction: this;

    public readonly stackFrame?: MemoryFrame;

    public readonly receiver?: CPPObject<ClassType>;

    /**
     * The object returned by the function, either an original returned-by-reference or a temporary
     * object created to hold a return-by-value. Once the function call has been executed, will be
     * defined unless it's a void function.
     */
    public readonly returnObject?: T extends FunctionType<VoidType> ? undefined : CPPObject<NoRefType<Exclude<T["returnType"],VoidType>>>;

    public readonly hasControl: boolean = false;

    public readonly body: RuntimeBlock;

    public constructor (model: CompiledFunctionDefinition<T>, sim: Simulation, caller: RuntimeFunctionCall | null, receiver?: CPPObject<ClassType>) {
        super(model, "function", caller || sim);
        if (caller) { this.caller = caller };
        this.receiver = receiver;
        // A function is its own containing function context
        // this.containingRuntimeFunction = this;
        this.body = createRuntimeStatement(this.model.body, this);
    }
    

    // setCaller : function(caller) {
    //     this.i_caller = caller;
    // },

    public pushStackFrame() {
        (<Mutable<this>>this).stackFrame = this.sim.memory.stack.pushFrame(this);
    }

    public popStackFrame() {
        this.sim.memory.stack.popFrame(this);
    }

    /**
     * Sets the return object for this function. May only be invoked once.
     * e.g.
     *  - return-by-value: The caller should set the return object to a temporary object, whose value
     *                     may be initialized by a return statement.
     *  - return-by-reference: When the function is finished, is set to the object returned.
     */
    public setReturnObject<T extends FunctionType<ObjectType | ReferenceType>>(this: RuntimeFunction<T>, obj: CPPObject<NoRefType<T["returnType"]>>) {
        // This should only be used once
        assert(!this.returnObject);
        (<Mutable<RuntimeFunction<FunctionType<ObjectType>> | RuntimeFunction<FunctionType<ReferenceType>>>>this).returnObject = obj;

    }

    public getParameterObject(num: number) {
        let param = this.model.parameters[num].declaredEntity;
        assert(param instanceof LocalObjectEntity, "Can't look up an object for a reference parameter.");
        assert(this.stackFrame);
        return this.stackFrame.localObjectLookup(param);
    }

    public initializeParameterObject(num: number, value: Value<AtomicType>) {
        let param = this.model.parameters[num].declaredEntity;
        assert(param instanceof LocalObjectEntity, "Can't look up an object for a reference parameter.");
        assert(this.stackFrame);
        assert(param.type.isAtomicType());
        this.stackFrame.initializeLocalObject(<LocalObjectEntity<AtomicType>>param, <Value<AtomicType>>value);
    }

    public bindReferenceParameter(num: number, obj: CPPObject) {
        let param = this.model.parameters[num].declaredEntity;
        assert(param instanceof LocalReferenceEntity, "Can't bind an object parameter like a reference.");
        assert(this.stackFrame);
        return this.stackFrame.bindLocalReference(param, obj);
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
            this.popStackFrame();
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