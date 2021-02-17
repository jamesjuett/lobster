import { FunctionEntity, PassByReferenceParameterEntity, PassByValueParameterEntity, TemporaryObjectEntity } from "./entities";
import { Mutable, assertFalse, assert } from "../util/util";
import { AtomicType, CompleteClassType, CompleteObjectType, CompleteReturnType, FunctionType, isCompleteClassType, ReferenceType, VoidType } from "./types";
import { CPPObject, TemporaryObject } from "./objects";
import { TranslationUnitContext, ASTNode, BasicCPPConstruct, SuccessfullyCompiled, RuntimeConstruct, StackType, CPPConstruct } from "./constructs";
import { CPPError } from "./errors";
import { CompiledDirectInitializer, DirectInitializer, RuntimeDirectInitializer } from "./initializers";
import { CompiledExpression, Expression, TypedExpression } from "./expressionBase";
import { CompiledFunctionDefinition } from "./declarations";
import { RuntimeFunction } from "./functions";

export abstract class PotentialFullExpression<ContextType extends TranslationUnitContext = TranslationUnitContext, ASTType extends ASTNode = ASTNode> extends BasicCPPConstruct<ContextType, ASTType> {
    public readonly temporaryObjects: TemporaryObjectEntity[] = [];
    public readonly temporaryDeallocator?: TemporaryDeallocator;
    public onAttach(parent: CPPConstruct) {
        (<Mutable<this>>this).parent = parent;
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
        if (this.temporaryObjects.length > 0) {
            (<TemporaryDeallocator>this.temporaryDeallocator) = new TemporaryDeallocator(this.context, this.temporaryObjects);
            this.attach(this.temporaryDeallocator!);
        }
    }
    public isFullExpression(): boolean {
        return !this.parent || !(this.parent instanceof PotentialFullExpression);
    }
    // TODO: this function can probably be cleaned up so that it doesn't require these ugly runtime checks
    /**
     * Returns the nearest full expression containing this expression (possibly itself).
     * @param inst
     */
    public findFullExpression(): PotentialFullExpression {
        if (this.isFullExpression()) {
            return this;
        }
        if (!this.parent || !(this.parent instanceof PotentialFullExpression)) {
            return assertFalse("failed to find full expression for " + this);
        }
        return this.parent.findFullExpression();
    }
    private addTemporaryObject(tempObjEnt: TemporaryObjectEntity) {
        assert(!this.parent, "Temporary objects may not be added to a full expression after it has been attached.");
        this.temporaryObjects.push(tempObjEnt);
        tempObjEnt.setOwner(this);
    }
    public createTemporaryObject<T extends CompleteObjectType>(type: T, name: string): TemporaryObjectEntity<T> {
        let fe = this.findFullExpression();
        var tempObjEnt = new TemporaryObjectEntity(type, this, fe, name);
        this.temporaryObjects[tempObjEnt.entityId] = tempObjEnt;
        return tempObjEnt;
    }
}

export interface CompiledPotentialFullExpression extends PotentialFullExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
}

export abstract class RuntimePotentialFullExpression<C extends CompiledPotentialFullExpression = CompiledPotentialFullExpression> extends RuntimeConstruct<C> {
    public readonly temporaryDeallocator?: RuntimeTemporaryDeallocator;

    public readonly temporaryObjects: {
        [index: number]: TemporaryObject | undefined;
    } = {};

    public readonly containingFullExpression: RuntimePotentialFullExpression;

    public constructor(model: C, stackType: StackType, parent: RuntimeConstruct) {
        super(model, stackType, parent);
        if (this.model.temporaryDeallocator) {
            this.temporaryDeallocator = this.model.temporaryDeallocator.createRuntimeConstruct(this);
            this.setCleanupConstruct(this.temporaryDeallocator);
        }
        this.containingFullExpression = this.findFullExpression();
    }
    
    private findFullExpression(): RuntimePotentialFullExpression {
        let rt: RuntimeConstruct = this;
        while (rt instanceof RuntimePotentialFullExpression && !rt.model.isFullExpression() && rt.parent) {
            rt = rt.parent;
        }
        if (rt instanceof RuntimePotentialFullExpression) {
            return rt;
        }
        else {
            return assertFalse();
        }
    }
}


export class TemporaryDeallocator extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    public readonly construct_type = "TemporaryDeallocator";

    public readonly parent?: PotentialFullExpression;
    public readonly temporaryObjects: TemporaryObjectEntity[];

    public readonly dtors: (FunctionCall | undefined)[];

    public constructor(context: TranslationUnitContext, temporaryObjects: TemporaryObjectEntity[]) {
        super(context, undefined); // Has no AST
        this.temporaryObjects = temporaryObjects;

        this.dtors = temporaryObjects.map((temp) => {
            if (temp.isTyped(isCompleteClassType)) {
                let dtor = temp.type.classDefinition.destructor;
                if (dtor) {
                    let dtorCall = new FunctionCall(context, dtor, [], temp.type);
                    this.attach(dtorCall);
                    return dtorCall;
                }
                else{
                    this.addNote(CPPError.declaration.dtor.no_destructor_temporary(temp.owner, temp));
                }
            }
            return undefined;
        });
    }

    public createRuntimeConstruct(this: CompiledTemporaryDeallocator, parent: RuntimePotentialFullExpression) {
        return new RuntimeTemporaryDeallocator(this, parent);
    }

}

export interface CompiledTemporaryDeallocator extends TemporaryDeallocator, SuccessfullyCompiled {

    readonly dtors: (CompiledFunctionCall | undefined)[];
    
}

export class RuntimeTemporaryDeallocator extends RuntimeConstruct<CompiledTemporaryDeallocator> {

    private index = 0;
    private justDestructed: TemporaryObject<CompleteClassType> | undefined = undefined;
    public readonly parent!: RuntimePotentialFullExpression; // narrows type from base class

    public constructor(model: CompiledTemporaryDeallocator, parent: RuntimePotentialFullExpression) {
        super(model, "expression", parent);
    }

    protected upNextImpl() {

        let tempObjects = this.model.temporaryObjects;

        if (this.justDestructed) {
            this.sim.memory.killObject(this.justDestructed, this);
            this.justDestructed = undefined;
        }

        while(this.index < tempObjects.length) {
            // Destroy temp at given index
            let temp = tempObjects[this.index];
            let dtor = this.model.dtors[this.index];
            ++this.index;

            if (temp.isTyped(isCompleteClassType)) {
                // a temp class-type object, so we call the dtor
                assert(dtor);
                let obj = temp.runtimeLookup(this.parent);
                this.sim.push(dtor.createRuntimeFunctionCall(this, obj));

                // need to destroy the object once dtor is done, so we keep track of it here
                this.justDestructed = obj;

                // return so that the dtor, which is now on top of the stack, can run instead
                return;
            }
            else {
                // a temp non-class-type object, no dtor needed.
                this.sim.memory.killObject(temp.runtimeLookup(this.parent), this);
            }
        }

        this.startCleanup();
    }

    public stepForwardImpl() {

    }
}






export class FunctionCall extends PotentialFullExpression {
    public readonly construct_type = "FunctionCall";

    public readonly func: FunctionEntity<FunctionType<CompleteReturnType>>;
    public readonly args: readonly Expression[];
    public readonly receiverType?: CompleteClassType;

    public readonly argInitializers?: readonly DirectInitializer[];

    public readonly returnByValueTarget?: TemporaryObjectEntity;
    
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
        if (this.func.isMemberFunction() && !this.func.firstDeclaration.isDestructor
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

        // No returns for void functions, of course.
        // If return by reference, the return object already exists and no need to create a temporary.
        // Else, for a return by value, we do need to create a temporary object.
        let returnType = this.func.type.returnType;
        if (!(returnType instanceof VoidType) && !(returnType instanceof ReferenceType)) {
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

    public isReturnByValue() : this is TypedFunctionCall<FunctionType<AtomicType | CompleteClassType>> {
        let returnType = this.func.type.returnType;
        return returnType.isAtomicType() || returnType.isCompleteClassType();
    }

    public isReturnByReference() : this is TypedFunctionCall<FunctionType<ReferenceType>> {
        return this.func.type.returnType.isReferenceType();
    }

    public isReturnVoid() : this is TypedFunctionCall<FunctionType<VoidType>> {
        return this.func.type.returnType.isVoidType();
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
export class RuntimeFunctionCall<T extends FunctionType<CompleteReturnType> = FunctionType<CompleteReturnType>> extends RuntimePotentialFullExpression<CompiledFunctionCall<T>> {

    public readonly model!: CompiledFunctionCall<T>; // narrows type of member in base class

    // public readonly functionDef : FunctionDefinition;
    public readonly calledFunction: RuntimeFunction<T>;
    public readonly argInitializers: readonly RuntimeDirectInitializer[];

    public readonly receiver?: CPPObject<CompleteClassType>

    // public readonly hasBeenCalled: boolean = false;

    public readonly index: typeof INDEX_FUNCTION_CALL_PUSH | typeof INDEX_FUNCTION_CALL_ARGUMENTS | typeof INDEX_FUNCTION_CALL_CALL | typeof INDEX_FUNCTION_CALL_RETURN;

    public constructor(model: CompiledFunctionCall<T>, parent: RuntimeConstruct, receiver?: CPPObject<CompleteClassType>) {
        super(model, "call", parent);

        this.receiver = receiver;

        // TODO can i get rid of the non-null assertion or cast here?
        // Basically, the assumption depends on a RuntimeFunctionCall only being created
        // if the program was successfully linked (which also implies the FunctionDefinition was compiled)
        // It also assumes the function definition has the correct return type.
        let functionDef = <CompiledFunctionDefinition<T>>this.model.func.definition!;

        // Create argument initializer instances
        this.argInitializers = this.model.argInitializers.map((aInit) => aInit.createRuntimeInitializer(this));



        // TODO: TCO? would reuse this.containingRuntimeFunction instead of creating new

        this.calledFunction = functionDef.createRuntimeFunction(this, this.receiver);

        // TODO: TCO? if using TCO, don't create a new return object, just reuse the old one
        if (this.isReturnByValue()) {
            // If return-by-value, set return object to temporary
            this.calledFunction.setReturnObject(this.model.returnByValueTarget.objectInstance(this));
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

    public isReturnByValue() : this is RuntimeFunctionCall<FunctionType<AtomicType | CompleteClassType>> {
        return this.model.isReturnByValue();
    }
}