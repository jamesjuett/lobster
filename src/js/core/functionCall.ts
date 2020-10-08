import { TranslationUnitContext, SuccessfullyCompiled, CompiledTemporaryDeallocator, RuntimeConstruct, ASTNode, ExpressionContext, createExpressionContextWithParameterTypes, ConstructDescription } from "./constructs";
import { PotentialFullExpression, RuntimePotentialFullExpression } from "./PotentialFullExpression";
import { FunctionEntity, ObjectEntity, TemporaryObjectEntity, PassByReferenceParameterEntity, PassByValueParameterEntity } from "./entities";
import { ExpressionASTNode, IdentifierExpression, createExpressionFromAST, CompiledFunctionIdentifierExpression, RuntimeFunctionIdentifierExpression, SimpleRuntimeExpression, MagicFunctionCallExpression, createRuntimeExpression, DotExpression, CompiledFunctionDotExpression, RuntimeFunctionDotExpression, ArrowExpression } from "./expressions";
import { VoidType, ReferenceType, PotentialReturnType, CompleteObjectType, PeelReference, peelReference, AtomicType, PotentialParameterType, Bool, sameType, FunctionType, Type, CompleteClassType, isFunctionType, PotentiallyCompleteObjectType, CompleteReturnType, PotentiallyCompleteClassType } from "./types";
import { clone } from "lodash";
import { CPPObject } from "./objects";
import { CompiledFunctionDefinition } from "./declarations";
import { CPPError } from "./errors";
import { allWellTyped, CompiledExpression, RuntimeExpression, VCResultTypes, TypedExpression, ValueCategory, Expression } from "./expressionBase";
import { LOBSTER_KEYWORDS, MAGIC_FUNCTION_NAMES } from "./lexical";
import { Value } from "./runtimeEnvironment";
import { SimulationEvent } from "./Simulation";
import { FunctionCallExpressionOutlet, ConstructOutlet } from "../view/codeOutlets";
import { DirectInitializer, CompiledDirectInitializer, RuntimeDirectInitializer } from "./initializers";
import { Mutable, assert } from "../util/util";
import { RuntimeFunction } from "./functions";
import { Predicates } from "./predicates";
import { param } from "jquery";
export class FunctionCall extends PotentialFullExpression {
    public readonly construct_type = "FunctionCall";

    public readonly func: FunctionEntity<FunctionType<CompleteReturnType>>;
    public readonly args: readonly Expression[];

    public readonly argInitializers: readonly DirectInitializer[];

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
     * @param receiver 
     */
    public constructor(context: TranslationUnitContext, func: FunctionEntity<FunctionType<CompleteReturnType>>, args: readonly TypedExpression[]) {
        super(context, undefined);

        this.func = func;

        // Note that the args are NOT attached as children here. Instead, they are attached to the initializers.

        // Create initializers for each argument/parameter pair
        this.argInitializers = args.map((arg, i) => {
            let paramType = this.func.type.paramTypes[i];
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
        parent: RuntimePotentialFullExpression,
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
        if (this.model.isReturnByValue()) {
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
            this.calledFunction.loseControl();
            this.containingRuntimeFunction.gainControl();
            this.startCleanup();
        }
    }

    protected stepForwardImpl(): void {
        if (this.index === INDEX_FUNCTION_CALL_PUSH) {

            // TODO: TCO? just do a tailCallReset, send "tailCalled" message

            this.calledFunction.pushStackFrame();
            this.sim.setPendingCalledFunction(this.calledFunction);
            (<Mutable<this>>this).index = INDEX_FUNCTION_CALL_ARGUMENTS;
        }
        else if (this.index === INDEX_FUNCTION_CALL_CALL) {

            this.containingRuntimeFunction.loseControl();
            this.sim.push(this.calledFunction);
            this.calledFunction.gainControl();
            this.receiver && this.receiver.callReceived();

            // (<Mutable<this>>this).hasBeenCalled = true;
            this.observable.send("called", this.calledFunction);

            (<Mutable<this>>this).index = INDEX_FUNCTION_CALL_RETURN;
        }

    }
}



export interface FunctionCallExpressionASTNode extends ASTNode {
    readonly construct_type: "function_call_expression";
    readonly operand: ExpressionASTNode;
    readonly args: readonly ExpressionASTNode[];
}

// type FunctionResultType<T extends FunctionType> = NoRefType<Exclude<T["returnType"], VoidType>>; // TODO: this isn't used? should I use it somewhere?
// type ReturnTypeVC<RT extends PotentialReturnType> = RT extends ReferenceType ? "lvalue" : "prvalue";


export class FunctionCallExpression extends Expression<FunctionCallExpressionASTNode> {
    public readonly construct_type = "function_call_expression";

    public readonly type?: PeelReference<CompleteReturnType>;
    public readonly valueCategory?: ValueCategory;

    public readonly operand: Expression;
    public readonly originalArgs: readonly Expression[];
    public readonly call?: FunctionCall;

    public constructor(context: ExpressionContext, ast: FunctionCallExpressionASTNode | undefined, operand: Expression, args: readonly Expression[]) {
        super(context, ast);

        this.attach(this.operand = operand);
        this.originalArgs = args;

        // If any arguments are not well typed, we can't select a function.
        if (!allWellTyped(args)) {
            // type, valueCategory, and call remain undefined
            this.attachAll(args);
            return;
        }

        if (!(operand instanceof IdentifierExpression || operand instanceof DotExpression || operand instanceof ArrowExpression)) {
            this.addNote(CPPError.expr.functionCall.invalid_operand_expression(this, operand));
            this.attachAll(args);
            return;
        }

        if (!operand.entity) {
            // type, valueCategory, and call remain undefined
            // operand will already have an error about the failed lookup
            this.attachAll(args);
            return;
        }

        if (!(operand.entity instanceof FunctionEntity)) {
            // type, valueCategory, and call remain undefined
            this.addNote(CPPError.expr.functionCall.operand(this, operand.entity));
            this.attachAll(args);
            return;
        }


        if (!operand.entity.returnsCompleteType()) {
            this.addNote(CPPError.expr.functionCall.incomplete_return_type(this, operand.entity.type.returnType));
            return;
        }

        let returnType = operand.entity.type.returnType;
        this.type = peelReference(returnType);

        this.valueCategory = returnType instanceof ReferenceType ? "lvalue" : "prvalue";

        // let staticReceiver: ObjectEntity<CompleteClassType> | undefined;
        // if (operand instanceof DotExpression) {
        //     staticReceiver = operand.functionCallReceiver;
        // }

        // If any of the arguments were not ObjectType, lookup wouldn't have found a function.
        // So the cast below should be fine.
        // If we get to here, we don't attach the args directly since they will be attached under the function call.
        // TODO: allow member function calls. (or make them a separate class idk)
        this.attach(this.call = new FunctionCall(
            context,
            operand.entity,
            <readonly TypedExpression<CompleteObjectType, ValueCategory>[]>args));
    }

    public static createFromAST(ast: FunctionCallExpressionASTNode, context: ExpressionContext): FunctionCallExpression | MagicFunctionCallExpression {
        let args = ast.args.map(arg => createExpressionFromAST(arg, context));

        if (ast.operand.construct_type === "identifier_expression") {
            if (LOBSTER_KEYWORDS.has(ast.operand.identifier)) {
                return new MagicFunctionCallExpression(context, ast, <MAGIC_FUNCTION_NAMES>ast.operand.identifier, args);
            }
        }

        let contextualParamTypes = args.map(arg => arg.type);
        return new FunctionCallExpression(context, ast,
            createExpressionFromAST(ast.operand, createExpressionContextWithParameterTypes(context, contextualParamTypes)),
            args);
    }

    public createDefaultOutlet(this: CompiledFunctionCallExpression, element: JQuery, parent?: ConstructOutlet) {
        return new FunctionCallExpressionOutlet(element, this, parent);
    }

    // TODO
    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }




    // isTailChild : function(child){
    //     return {isTail: child === this.funcCall
    //     };
    // }
}

// If it's a complete return type, it might have been behind a reference or maybe not.
// If it's an incomplete type, the only way we could have returned it is if it was behind a reference.
type PossibleVC<T extends PeelReference<CompleteReturnType>> = T extends CompleteReturnType ? ValueCategory : "lvalue";

export interface TypedFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends FunctionCallExpression {
    readonly type: T
    readonly valueCategory: V;
    readonly call: TypedFunctionCall<FunctionType<CompleteReturnType>>;
}

export interface CompiledFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends TypedFunctionCallExpression<T, V>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure


    readonly operand: CompiledFunctionIdentifierExpression | CompiledFunctionDotExpression;
    readonly originalArgs: readonly CompiledExpression[];
    readonly call: CompiledFunctionCall<FunctionType<CompleteReturnType>>;
}

export const INDEX_FUNCTION_CALL_EXPRESSION_OPERAND = 0;
export const INDEX_FUNCTION_CALL_EXPRESSION_CALL = 1;
export const INDEX_FUNCTION_CALL_EXPRESSION_RETURN = 2;
export class RuntimeFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T, V, CompiledFunctionCallExpression<T, V>> {

    public readonly operand: RuntimeFunctionIdentifierExpression | RuntimeFunctionDotExpression;
    public readonly call?: RuntimeFunctionCall<FunctionType<CompleteReturnType>>;

    public readonly index: typeof INDEX_FUNCTION_CALL_EXPRESSION_OPERAND | typeof INDEX_FUNCTION_CALL_EXPRESSION_CALL | typeof INDEX_FUNCTION_CALL_EXPRESSION_RETURN = INDEX_FUNCTION_CALL_EXPRESSION_OPERAND;

    public constructor(model: CompiledFunctionCallExpression<T,V>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = <this["operand"]>createRuntimeExpression(this.model.operand, this);
    }

    protected upNextImpl() {
        if (this.index === INDEX_FUNCTION_CALL_EXPRESSION_OPERAND) {
            this.sim.push(this.operand);
            (<Mutable<this>>this).index = INDEX_FUNCTION_CALL_EXPRESSION_CALL;
        }
        else if (this.index === INDEX_FUNCTION_CALL_EXPRESSION_CALL) {
            // We check the contextual receiver here since it changes after the operand is evaluated.
            (<Mutable<this>>this).call = this.model.call.createRuntimeFunctionCall(this, this.operand.contextualReceiver);
            this.sim.push(this.call!);
            (<Mutable<this>>this).index = INDEX_FUNCTION_CALL_EXPRESSION_RETURN;
        }
        else if (this.index === INDEX_FUNCTION_CALL_EXPRESSION_RETURN) {

            // Note: cannot use this.model.type here, since that is the type of the function
            // call expression, which would have had the reference type removed if this was return
            // by reference. Instead, use the return type of the called function itself, which will have
            // the reference type intact.
            let returnType = this.model.call.func.type.returnType;

            if (returnType.isVoidType()) {
                // this.setEvalResult(null); // TODO: type system won't allow this currently
            }
            else if (returnType.isReferenceType()) {
                // Return by reference is lvalue and yields the returned object
                let retObj = <CPPObject>this.call!.calledFunction.returnObject!;
                this.setEvalResult(<VCResultTypes<T,V>>retObj);
            }
            else if (returnType.isAtomicType()) {
                // Return by value of atomic type. In this case, we can look up
                // the value of the return object and use that as the eval result
                let retObj = <CPPObject<AtomicType>>this.call!.calledFunction.returnObject!;
                this.setEvalResult(<VCResultTypes<T,V>>retObj.getValue());
            }
            else {
                // Return by value of a non-atomic type. In this case, it's still a prvalue
                // but is the temporary object rather than its value.
                let retObj = <CPPObject>this.call!.calledFunction.returnObject!;
                this.setEvalResult(<VCResultTypes<T,V>>retObj);
            }
            this.startCleanup();
        }
    }

    protected stepForwardImpl() {
        // nothing to do
    }
}

// OLD stuff kept in case it's relevant for operator overloads, but probably won't be needed
// export var FunctionCallExpression  = Expression.extend({
//     _name: "FunctionCallExpression",
//     initIndex: "operand",

    // bindFunction : function(argTypes){
    //     var self = this;
    //     if (isA(this.operand.type, Types.Class)){
    //         // Check for function call operator and if so, find function
    //         // TODO: I think this breaks given multiple overloaded function call operators?

    //         try{
    //             this.callOp = this.operand.type.classScope.requiredMemberLookup("operator()", {paramTypes:argTypes, isThisConst: this.operand.type.isConst});
    //             this.boundFunction = this.callOp;
    //             this.type = noRef(this.callOp.type.returnType);
    //         }
    //         catch(e){
    //             if (isA(e, SemanticExceptions.BadLookup)){
    //                 this.addNote(CPPError.expr.functionCall.not_defined(this, this.operand.type, argTypes));
    //                 this.addNote(e.annotation(this));
    //             }
    //             else{
    //                 throw e;
    //             }
    //         }
    //     }
    //     else if (isA(this.operand.entity, FunctionEntity)){ // TODO: use of entity property here feels hacky
    //         // If it's an identifier, dot, arrow, etc. that denote an entity - just bind that
    //         this.staticFunction = this.operand.entity;
    //         this.staticFunctionType = this.staticFunction.type;
    //         this.boundFunction = this.operand.entity;
    //     }
    //     else if (isA(this.operand.type, Types.Pointer) && isA(this.operand.type.ptrTo, Types.Function)){
    //         this.staticFunctionType = this.operand.type.ptrTo;
    //         this.boundFunction = PointedFunctionEntity.instance(this.operand.type.ptrTo);
    //         this.operand = convertToPRValue(this.operand);
    //     }
    //     else if (isA(this.operand.type, Types.Function)){
    //         this.staticFunctionType = this.operand.type;
    //         this.boundFunction = PointedFunctionEntity.instance(this.operand.type);
    //     }
    //     else{
    //         this.addNote(CPPError.expr.functionCall.operand(this, this.operand));
    //     }

    // },


// });
