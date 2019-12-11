import { TranslationUnitContext, SuccessfullyCompiled, CompiledTemporaryDeallocator, RuntimeFunction, RuntimeConstruct, ASTNode, ExpressionContext, createExpressionContext, ConstructDescription } from "./constructs";
import { PotentialFullExpression, RuntimePotentialFullExpression } from "./PotentialFullExpression";
import { FunctionEntity, ObjectEntity, TemporaryObjectEntity, PassByReferenceParameterEntity, PassByValueParameterEntity } from "./entities";
import { ExpressionASTNode, IdentifierExpression, createExpressionFromAST, CompiledFunctionIdentifier, RuntimeFunctionIdentifier, SimpleRuntimeExpression, MagicFunctionCallExpression } from "./expressions";
import { ClassType, VoidType, ReferenceType, PotentialReturnType, ObjectType, NoRefType, noRef, AtomicType, PotentialParameterType, Bool, sameType } from "./types";
import { clone } from "lodash";
import { CPPObject } from "./objects";
import { CompiledFunctionDefinition } from "./declarations";
import { CPPError } from "./errors";
import { Expression, allWellTyped, CompiledExpression, RuntimeExpression, VCResultTypes, TypedExpression, ValueCategory } from "./expressionBase";
import { LOBSTER_KEYWORDS, MAGIC_FUNCTION_NAMES } from "./lexical";
import { standardConversion } from "./standardConversions";
import { Value } from "./runtimeEnvironment";
import { SimulationEvent } from "./Simulation";
import { FunctionCallExpressionOutlet, ConstructOutlet } from "../view/codeOutlets";
import { DirectInitializer, CompiledDirectInitializer, RuntimeDirectInitializer } from "./initializers";

export class FunctionCall extends PotentialFullExpression {
    
    public readonly func: FunctionEntity;
    public readonly args: readonly TypedExpression[];
    public readonly receiver?: ObjectEntity<ClassType>;

    public readonly argInitializers: readonly DirectInitializer[];
    
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
    public constructor(context: TranslationUnitContext, func: FunctionEntity, args: readonly TypedExpression[], receiver?: ObjectEntity<ClassType>) {
        super(context);

        this.func = func;
        this.args = clone(args);
        this.receiver = receiver;

        // Note that the args are NOT attached as children here. Instead, they are attached to the initializers.

        // Create initializers for each argument/parameter pair
        this.argInitializers = args.map((arg, i) => {
            let paramType = this.func.type.paramTypes[i];
            if (paramType.isReferenceType()) {
                return DirectInitializer.create(context, new PassByReferenceParameterEntity(this.func, paramType.refTo, i), [arg], "copy");
            }
            else {
                return DirectInitializer.create(context, new PassByValueParameterEntity(this.func, paramType, i), [arg], "copy");
            }
        });
        this.attachAll(this.argInitializers);

        // TODO
        // this.isRecursive = this.func.definition === this.context.containingFunction;

        // No returns for void functions, of course.
        // If return by reference, the return object already exists and no need to create a temporary.
        // Else, for a return by value, we do need to create a temporary object.
        let returnType = this.func.type.returnType;
        if ( !(returnType instanceof VoidType) && !(returnType instanceof ReferenceType)) {
            this.returnByValueTarget = this.createTemporaryObject(returnType, `[${this.func.name}() return]`);
        }

        // TODO: need to check that it's not an auxiliary function call before adding these?
        // this.context.containingFunction.addCall(this);
        this.context.translationUnit.registerFunctionCall(this); // TODO: is this needed?
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

    public createRuntimeFunctionCall<T extends PotentialReturnType = PotentialReturnType, V extends ValueCategory = ValueCategory>(this: CompiledFunctionCall<T>, parent: RuntimePotentialFullExpression) : RuntimeFunctionCall<T> {
        return new RuntimeFunctionCall<T>(this, parent);
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
    readonly argInitializers: readonly CompiledDirectInitializer[];
    readonly returnByValueTarget?: T extends ObjectType ? TemporaryObjectEntity<T> : undefined;
}

const INDEX_FUNCTION_CALL_PUSH = 0;
const INDEX_FUNCTION_CALL_ARGUMENTS = 1;
const INDEX_FUNCTION_CALL_CALL = 2;
const INDEX_FUNCTION_CALL_RETURN = 3;
export class RuntimeFunctionCall<T extends PotentialReturnType = PotentialReturnType> extends RuntimePotentialFullExpression<CompiledFunctionCall<T>> {

    public readonly model!: CompiledFunctionCall<T>; // narrows type of member in base class

    // public readonly functionDef : FunctionDefinition;
    public readonly calledFunction : RuntimeFunction<T>;
    public readonly argInitializers: readonly RuntimeDirectInitializer[];

    public readonly receiver?: CPPObject<ClassType>

    // public readonly hasBeenCalled: boolean = false;

    private index : typeof INDEX_FUNCTION_CALL_PUSH | typeof INDEX_FUNCTION_CALL_ARGUMENTS | typeof INDEX_FUNCTION_CALL_CALL | typeof INDEX_FUNCTION_CALL_RETURN;

    public constructor (model: CompiledFunctionCall<T>, parent: RuntimeConstruct) {
        super(model, "call", parent);

        // TODO can i get rid of the non-null assertion or cast here?
        // Basically, the assumption depends on a RuntimeFunctionCall only being created
        // if the program was successfully linked (which also implies the FunctionDefinition was compiled)
        // It also assumes the function definition has the correct return type.
        let functionDef = <CompiledFunctionDefinition<T>>this.model.func.definition!;
        
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
        this.index = INDEX_FUNCTION_CALL_PUSH;
    }

    protected upNextImpl(): void {
        if (this.index === INDEX_FUNCTION_CALL_ARGUMENTS) {
            // Push all argument initializers. Push in reverse so they run left to right
            // (although this is not strictly necessary given they are indeterminately sequenced)
            for(var i = this.argInitializers.length-1; i >= 0; --i) {
                this.sim.push(this.argInitializers[i]);
            }
            this.index = INDEX_FUNCTION_CALL_CALL;
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



export interface FunctionCallExpressionASTNode extends ASTNode {
    readonly construct_type: "function_call_expression";
    readonly operand: ExpressionASTNode;
    readonly args: readonly ExpressionASTNode[];
}

type FunctionResultType<RT extends PotentialReturnType> = NoRefType<Exclude<RT,VoidType>>;
type FunctionVC<RT extends PotentialReturnType> = RT extends ReferenceType ? "lvalue" : "prvalue";


export class FunctionCallExpression extends Expression<FunctionCallExpressionASTNode> {
    
    public readonly type?: ObjectType | VoidType;
    public readonly valueCategory?: ValueCategory;

    public readonly operand: Expression
    public readonly args: readonly Expression[];
    public readonly call?: FunctionCall;

    public constructor(context: ExpressionContext, operand: Expression, args: readonly Expression[]) {
        super(context);
        
        this.attach(this.operand = operand);
        this.args = args;

        // If any arguments are not well typed, we can't select a function.
        if (!allWellTyped(args)) {
            // type, valueCategory, and call remain undefined
            this.attachAll(args);
            return;
        }

        if (!(operand instanceof IdentifierExpression)) {
            this.addNote(CPPError.expr.functionCall.invalid_operand_expression(this, operand));
            this.attachAll(args);
            return;
        }
        
        if (!operand.entity) {
            // type, valueCategory, and call remain undefined
            this.attachAll(args);
            return;
        }
        
        if (!(operand.entity instanceof FunctionEntity)) {
            // type, valueCategory, and call remain undefined
            this.addNote(CPPError.expr.functionCall.operand(this, operand.entity));
            this.attachAll(args);
            return;
        }

        this.type = noRef(operand.entity.type.returnType);

        this.valueCategory = operand.entity.type.returnType instanceof ReferenceType ? "lvalue" : "prvalue";

        // If any of the arguments were not ObjectType, lookup wouldn't have found a function.
        // So the cast below should be fine.
        // If we get to here, we don't attach the args directly since they will be attached under the function call.
        // TODO: allow member function calls. (or make them a separate class idk)
        this.call = new FunctionCall(context, operand.entity, <readonly TypedExpression<ObjectType, ValueCategory>[]>args);
    }

    public static createFromAST(ast: FunctionCallExpressionASTNode, context: ExpressionContext) : FunctionCallExpression | MagicFunctionCallExpression {
        let args = ast.args.map(arg => createExpressionFromAST(arg, context));

        if (ast.operand.construct_type === "identifier_expression") {
            if (LOBSTER_KEYWORDS.has(ast.operand.identifier)) {
                return new MagicFunctionCallExpression(context, <MAGIC_FUNCTION_NAMES>ast.operand.identifier, args).setAST(ast);
            }
        }

        let contextualParamTypes = args.map(arg => arg.type);
        return new FunctionCallExpression(context,
            createExpressionFromAST(ast.operand, createExpressionContext(context, contextualParamTypes)),
            args).setAST(ast);
    }
    
    public createRuntimeExpression<RT extends PotentialReturnType>(this: CompiledFunctionCallExpression<RT>, parent: RuntimeConstruct) : RuntimeFunctionCallExpression<RT>
    public createRuntimeExpression<T extends ObjectType, V extends ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : never;
    public createRuntimeExpression<RT extends PotentialReturnType>(this: CompiledFunctionCallExpression<RT>, parent: RuntimeConstruct) : RuntimeFunctionCallExpression<RT> {
        return new RuntimeFunctionCallExpression(this, parent);
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

export interface CompiledFunctionCallExpression<RT extends PotentialReturnType = PotentialReturnType> extends FunctionCallExpression, SuccessfullyCompiled {
    
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly type: FunctionResultType<RT>;
    readonly valueCategory: FunctionVC<RT>;
    
    readonly operand: CompiledFunctionIdentifier;
    readonly args: readonly CompiledExpression[];
    readonly call: CompiledFunctionCall<RT>;
}

const INDEX_FUNCTION_CALL_EXPRESSION_OPERAND = 0;
const INDEX_FUNCTION_CALL_EXPRESSION_CALL = 1;
const INDEX_FUNCTION_CALL_EXPRESSION_RETURN = 2;
export class RuntimeFunctionCallExpression<RT extends PotentialReturnType = PotentialReturnType> extends RuntimeExpression<FunctionResultType<RT>, FunctionVC<RT>, CompiledFunctionCallExpression<RT>> {

    public readonly operand: RuntimeFunctionIdentifier;
    public readonly args: readonly RuntimeExpression[];
    public readonly call: RuntimeFunctionCall<RT>;

    private index : typeof INDEX_FUNCTION_CALL_EXPRESSION_OPERAND | typeof INDEX_FUNCTION_CALL_EXPRESSION_CALL | typeof INDEX_FUNCTION_CALL_EXPRESSION_RETURN = INDEX_FUNCTION_CALL_EXPRESSION_OPERAND;

    public constructor (model: CompiledFunctionCallExpression<RT>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = this.model.operand.createRuntimeExpression(this);
        this.args = this.model.args.map((arg) => arg.createRuntimeExpression(this));
        this.call = this.model.call.createRuntimeFunctionCall(this);
    }

	protected upNextImpl() {
        if (this.index === INDEX_FUNCTION_CALL_EXPRESSION_OPERAND) {
            this.sim.push(this.operand);
            this.index = INDEX_FUNCTION_CALL_EXPRESSION_CALL;
        }
        else if (this.index === INDEX_FUNCTION_CALL_EXPRESSION_CALL) {
            this.sim.push(this.call);
            this.index = INDEX_FUNCTION_CALL_EXPRESSION_RETURN;
            return true;
        }
        else if (this.index === INDEX_FUNCTION_CALL_EXPRESSION_RETURN ) {
            if (this.model.type.isVoidType()) {
                // this.setEvalResult(null); // TODO: type system won't allow this currently
            }

            if (this.model.isReferenceTyped()) {
                // Return by reference is lvalue and yields the returned object
                this.setEvalResult(<VCResultTypes<FunctionResultType<RT>, FunctionVC<RT>>>this.call.calledFunction.returnObject!);
            }
            else if (this.model.isAtomicTyped()) {
                // Return by value of atomic type. In this case, we can look up
                // the value of the return object and use that as the eval result
                let retObj = <CPPObject<AtomicType>><unknown>this.call.calledFunction.returnObject!; // I don't understand why Typescript forces the hard cast here
                this.setEvalResult(<VCResultTypes<FunctionResultType<RT>, FunctionVC<RT>>>retObj.getValue());
            }
            else {
                // Return by value of a non-atomic type. In this case, it's still a prvalue
                // but is the temporary object rather than its value.
                this.setEvalResult(<VCResultTypes<FunctionResultType<RT>, FunctionVC<RT>>>this.call.calledFunction.returnObject!);
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
