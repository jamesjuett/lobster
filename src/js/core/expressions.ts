import clone from "lodash/clone";
import * as Util from "../util/util";
import { ASTNode, ConstructContext, CPPConstruct, ExecutableConstruct, ExecutableConstructContext, ExecutableRuntimeConstruct, PotentialFullExpression, RuntimeConstruct, RuntimePotentialFullExpression, InstructionConstruct } from "./constructs";
import { CPPEntity, FunctionEntity, MemberFunctionEntity, ParameterEntity, ObjectEntity } from "./entities";
import { CPPError, Description } from "./errors";
import { checkIdentifier } from "./lexical";
import { CPPObject } from "./objects";
import { Value, RawValueType } from "./runtimeEnvironment";
import { Simulation } from "./Simulation";
import { convertToPRValue, integralPromotion, standardConversion, usualArithmeticConversions } from "./standardConversions";
import { AtomicType, Bool, isType, ObjectType, sameType, Type, VoidType, FunctionType, ClassType, Pointer, Int, IntegralType, ArrayPointer } from "./types";
import { CopyInitializer, DirectInitializer } from "./initializers";

export function readValueWithAlert(obj: CPPObject, sim: Simulation) {
    let value = obj.readValue();
    if(!value.isValid) {
        let objDesc = obj.describe();
        var msg = "The value you just got out of " + (objDesc.name || objDesc.message) + " isn't valid. It might be uninitialized or it could have come from a dead object.";
        if (value.rawValue === 0){
            msg += "\n\n(Note: The value just happens to be zero. Don't be fooled! Uninitialized memory isn't guaranteed to be zero.)";
        }
        sim.undefinedBehavior(msg);
    }
    return value;
};

// TODO: ensure that an expression is never considered compiled unless its children are compiled

/**
 * Standard compilation phase for expressions:
 *   1. Compile children (with no special context - if this is needed, you'll need to override compile())
 *   2. Perform any conversions specified in this.i_childrenToConvert. the lvalue-to-rvalue conversion is not suppressed
 *   3. If any errors have been reported by children, abort. The rest of the sequence is skipped
 *   4. Call the this.convert() hook. Put custom conversion code here.
 *   5. Call the this.typeCheck() hook. Put custom typechecking here. After this function is called, the expression should
 *      have this.type and this.valueCategory set correct, although this does not mean the function necessarily has to do
 *      this (e.g. some expressions always have the same type or value category, so these properties may be set initially
 *      at the class level).
 *   6. Compile any temporary objects for whom this is the enclosing full expression.
 *
 */

// TODO: use symbols here?
export type ValueCategory = "prvalue" | "xvalue" | "lvalue";

export interface ExpressionASTNode extends ASTNode {

}

export abstract class Expression extends PotentialFullExpression {

    public static createFromAST(ast: ExpressionASTNode, context: ConstructContext) : Expression {
        return super.createFromAST(ast, context);
    }

    public abstract readonly type: Type?;
    public abstract readonly valueCategory: ValueCategory?;
    public readonly conversionLength: number = 0;

    public abstract readonly _t_compiled!: CompiledExpression;

    public createRuntimeExpression<T extends Type = Type, VC extends ValueCategory = ValueCategory>(this: TypedCompiledExpression<T,VC>, parent: ExecutableRuntimeConstruct) : RuntimeExpressionBase<TypedCompiledExpression<T,VC>>;
    public createRuntimeExpression(this: CompiledExpression, parent: ExecutableRuntimeConstruct) : RuntimeExpression {
        return this.createRuntimeExpression_impl(parent);
    }

    protected abstract createRuntimeExpression_impl(parent: ExecutableRuntimeConstruct) : RuntimeExpression;

    public isWellTyped() : this is TypedExpression<Type,ValueCategory> {
        return this.type !== null && this.valueCategory !== null;
    }

    // public isSuccessfullyCompiled() : this is Compiled<this> {
    //     return !this.hasErrors;
    // }

    public isTailChild(child: ExecutableConstruct) {
        return {isTail: false};
    }

    public abstract describeEvalResult(depth: number) : Description;
    //     return {message: "the result of " + this.getSourceText()};
    // }
}

export interface CompiledExpression extends Expression {
    readonly type: Type;
    readonly valueCategory: ValueCategory;

    // _t_isCompiled is here to prevent (otherwise) structurally equivalent non-compiled expressions
    // from being assignable to a compiled expression type
    // TODO: maybe better to use a symbol here?
    readonly _t_isCompiled: void;
}


export interface TypedExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> extends Expression {
    readonly type: T;
    readonly valueCategory: V;
}

// Note: it's important that TypedCompiledExpression<Type, ValueCategory> is structurally equivalent to CompiledExpression
export interface TypedCompiledExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> extends CompiledExpression, TypedExpression {
    readonly type: T;
    readonly valueCategory: V;
}


type CompiledExpressionBase<E extends Expression> = E & CompiledExpression;
type TypedCompiledExpressionBase<E extends Expression, T extends Type = Type, V extends ValueCategory = ValueCategory> = E & TypedCompiledExpression<T,V>;

type SimilarTypedCompiledExpression<CE extends TypedCompiledExpression> = TypedCompiledExpression<CE["type"], CE["valueCategory"]>;

export type Compiled<E extends Expression> = E["_t_compiled"];

type VCResultTypes<T extends Type> = 
T extends AtomicType ? {
    readonly prvalue: Value<T>;
    readonly xvalue: CPPObject<T>;
    readonly lvalue: CPPObject<T>;
} : T extends ObjectType ? {
    readonly prvalue: never;
    readonly xvalue: CPPObject<T>;
    readonly lvalue: CPPObject<T>;
} : never;

// type VCResultTypes<T extends Type> =
//     T extends AtomicType ? {
//         readonly prvalue: Value<T>;
//         readonly xvalue: CPPObject<T>;
//         readonly lvalue: CPPObject<T>;
//     }
//     :
//     T extends ObjectType ? {
//         readonly prvalue: AtomicType extends T ? Value<AtomicType> : never; // Still possible it's an Atomic Type
//         readonly xvalue: CPPObject<T>;
//         readonly lvalue: CPPObject<T>;
//     }
//     : ObjectType extends T ? { // That is, T is more general, so it's possible T is an AtomicType or an ObjectType
//         readonly prvalue: Value<AtomicType>;
//         readonly xvalue: CPPObject<ObjectType>;
//         readonly lvalue: CPPObject<ObjectType>; // TODO: add functions/arrays as possible results
//     } : { // Otherwise, T is NOT possibly an ObjectType. This could happen with e.g. an lvalue expression that yields a function
//         readonly prvalue: never;
//         readonly xvalue: never;
//         readonly lvalue: never; // TODO: add functions/arrays as possible results
//     };

//     prvalue: T extends AtomicType ? Value<T> :
//              AtomicType extends T ? Value<AtomicType> :
//              never;
//     xvalue: T extends ObjectType ? CPPObject<T> :
//             ObjectType extends T ? CPPObject<ObjectType> :
//             never;
//     lvalue: T extends ObjectType ? CPPObject<T> :
//             ObjectType extends T ? CPPObject<ObjectType> :
//             never; // TODO: add functions/arrays as possible results
// }

type EvalResultType<E extends CompiledExpression> = VCResultTypes<E["type"]>[E["valueCategory"]];

export interface RuntimeExpression<CE extends CompiledExpression = CompiledExpression> extends RuntimePotentialFullExpression<CE> {
    
    public readonly evalResult: EvalResultType<CE>?;
}

export abstract class RuntimeExpressionBase<CE extends CompiledExpression>
    extends RuntimePotentialFullExpression<CE> implements RuntimeExpression<CE>{
        
    public readonly evalResult: EvalResultType<CE>? = null;

    public constructor(model: CE, parent: ExecutableRuntimeConstruct) {
        super(model, "expression", parent);
    }

    protected setEvalResult(value: EvalResultType<CE>) {
        (<EvalResultType<CE>>this.evalResult) = value;
    }

}

export class UnsupportedExpression extends Expression {

    public readonly type = null;
    public readonly valueCategory = null;

    public readonly _t_compiled!: CompiledExpression;

    public constructor(context: ExecutableConstructContext, unsupportedName: string) {
        super(context);
        this.addNote(CPPError.lobster.unsupported(this, unsupportedName));
    }

    // public isSuccessfullyCompiled(): this is CompiledExpression {
    //     return false;
    // }

    public createRuntimeExpression_impl(parent: ExecutableRuntimeConstruct) : never {
        return Util.assertFalse();
    }

    public describeEvalResult(depth: number) {
        return {message: "the result of an unsupported expression"};
    };
}








    // processNonMemberOverload : function(args, op){
    //     try{
    //         var overloadedOp = this.contextualScope.requiredLookup("operator"+op, {
    //             own:true, paramTypes:args.map(function(arg){return arg.type;})
    //         });
    //         this.funcCall = this.sub.funcCall = FunctionCall.instance(this.code, {parent:this});
    //         this.sub.funcCall.compile(overloadedOp, args.map(function(arg){return arg.code;}));
    //         this.type = this.sub.funcCall.type;
    //         this.valueCategory = this.sub.funcCall.valueCategory;
    //         this.i_childrenToExecute = this.i_childrenToExecuteForOverload;
    //     }
    //     catch(e){
    //         if (isA(e, SemanticExceptions.BadLookup)){
    //             this.addNote(CPPError.expr.overloadLookup(this, op));
    //             this.addNote(e.annotation(this));
    //             return;
    //         }
    //         else{
    //             throw e;
    //         }
    //     }
    // },


    // compileMemberOverload : function(thisArg, argAsts, isThisConst, op){
    //     var self = this;
    //     var auxArgs = argAsts.map(function(argAst){
    //         var auxArg = CPPConstruct.create(argAst, {parent: self, auxiliary: true});
    //         auxArg.tryCompile();
    //         return auxArg;
    //     });

    //     try{
    //         var overloadedOp = thisArg.type.classScope.requiredLookup("operator"+op, {
    //             own:true, paramTypes:auxArgs.map(function(arg){return arg.type;}),
    //             isThisConst: isThisConst
    //         });

    //         this.isOverload = true;
    //         this.isMemberOverload = true;
    //         this.funcCall = FunctionCall.instance({args: argAsts}, {parent:this});
    //         this.funcCall.compile({func: overloadedOp});
    //         this.type = this.funcCall.type;
    //         this.valueCategory = this.funcCall.valueCategory;
    //         this.i_childrenToExecute = this.i_childrenToExecuteForMemberOverload;
    //     }
    //     catch(e){
    //         if (isA(e, SemanticExceptions.BadLookup)){
    //             this.addNote(CPPError.expr.overloadLookup(this, op));
    //             this.addNote(e.annotation(this));
    //             return;
    //         }
    //         else{
    //             throw e;
    //         }
    //     }
    // }



export class SimpleRuntimeExpression<CE extends CompiledExpression = CompiledExpression> extends RuntimeExpressionBase<CE> {

    private index = 0;

    private subexpressions: RuntimeConstruct[] = [];

    public constructor (model: CE, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
    }

    protected setSubexpressions(subexpressions: RuntimeConstruct[]) {
        this.subexpressions = subexpressions;
    }

    protected upNextImpl() {
        if (this.index === 0) { // subexpressions
            // push subexpressions in reverse order since it's a stack
            for (let i = this.subexpressions.length - 1; i >= 0; --i) {
                this.sim.push(this.subexpressions[i]);
            }
            this.index = 1; // operate
        }
    }
    
    protected stepForwardImpl() {
        this.operate();
        this.done();
    }

    protected abstract operate() : void;
}


// abstract class LRExpression extends Expression {
//     t_compiledType! : Expression["t_compiledType"] & {
//         left: CompiledExpression<Expression, Type, "prvalue">;
//         right: CompiledExpression<Expression, Type, "prvalue">;
//     }
// };


type t_OverloadableOperators =
    "+" | "-" | "*" | "/" | "%" |
    "&" | "|" | "^" | "~" | "<<" | ">>" | "<" | ">" | "<=" |
    ">=" | "==" | "!=" | "&&" | "||" | "!" | "++" | "--" |
    "+=" | "-=" | "*=" | "/=" | "%=" | "&=" | "|=" | "^=" | "<<=" | ">>=" |
    "," | "->" | "->*" | "()" | "[]";


export class OperatorOverload extends Expression {

    public readonly type: Type?;
    public readonly valueCategory: ValueCategory?;

    public readonly operator: t_OverloadableOperators;
    public readonly operands: Expression[];
    
    public readonly isMemberOverload?: boolean;
    public readonly overloadFunctionCall?: FunctionCall; 

    public readonly _t_compiled!: CompiledOperatorOverload;

    private constructor(context: ExecutableConstructContext, operands: Expression[], operator: t_OverloadableOperators) {
        super(context);

        this.operator = operator;
        this.operands = operands; // These may go through conversions when attached to a function call, but this member contains the "raw" versions

        // If any of the operands are not well-typed, can't compile
        if (!this.hasWellTypedOperands(operands)) {
            this.type = null;
            this.valueCategory = null;

            // In this case, attach operands directly as children.
            operands.forEach((expr) => {this.attach(expr);});
            return;
        }

        // Sanity check that at least one of the operands has class-type
        Util.assert(operands.length > 0, "Operator overload must have at least one operand.");
        Util.assert(operands.some((expr) => {return isType(expr.type, ClassType);}), "At least one operand in a non-member overload must have class-type.");


        let overloadFunction : FunctionEntity? = null;

        // If the leftmost operand is class-type, we can look for a member overload
        let leftmost = operands[0];
        if (isType(leftmost.type, ClassType)) {
            let entity = leftmost.type.cppClass.scope.singleLookup("operator" + this.operator, {
                own:true, params:[operands.slice(1)], isThisConst : leftmost.type.isConst
            });
            
            Util.assert(entity instanceof FunctionEntity, "Non-function entity found for operator overload name lookup.");
            overloadFunction = <FunctionEntity>entity;
        }
        
        // If we didn't find a member overload, next look for a non-member overload
        if (!overloadFunction) {
            let entity = this.contextualScope.singleLookup("operator" + this.operator, {
                params: operands
            });
            
            Util.assert(entity instanceof FunctionEntity, "Non-function entity found for operator overload name lookup.");
            overloadFunction = <FunctionEntity>entity;
        }


        if (overloadFunction) {
            this.isMemberOverload = overloadFunction instanceof MemberFunctionEntity;


            if (this.isMemberOverload) {
                // Member overload means leftmost operand is our directly attached child, other operands are arguments to function call.
                this.attach(operands[0]);
                this.attach(this.overloadFunctionCall = new FunctionCall(context, overloadFunction, operands.slice(1)));
                // The receiver of the function call is set at runtime after the operand is evaluated
            }
            else{
                // Non-member overload means all operands are arguments of the function call
                this.attach(this.overloadFunctionCall = new FunctionCall(context, overloadFunction, operands));
            }

            this.type = this.overloadFunctionCall.type;
            this.valueCategory = this.overloadFunctionCall.valueCategory;
        }
        else{
            // TODO: add in notes from attempted lookup operations for the member and non-member overloads
            this.addNote(CPPError.expr.binary.overload_not_found(this, operator, operands));

            this.type = null;
            this.valueCategory = null;

            // If we didn't find a function to use, just attach operands directly as children.
            operands.forEach((expr) => {this.attach(expr);});
        }
    }

    private hasWellTypedOperands(operands: Expression[]) : operands is TypedExpression[] {
        return operands.every((expr) => { return expr.isWellTyped(); });
    }

    public createRuntimeExpression_impl<T extends Type, V extends ValueCategory>(this: CompiledOperatorOverload<T,V>, parent: ExecutableRuntimeConstruct) : RuntimeOperatorOverload<CompiledOperatorOverload<T,V>> {
        return new RuntimeOperatorOverload(this, parent);
    }
    
    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }



    // upNext : Class.ADDITIONALLY(function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //     if (this.funcCall){
    //         inst.childInstances.funcCall.getRuntimeFunction().setReceiver(EvaluationResultRuntimeEntity.instance(this.lhs.type, inst.childInstances.lhs));
    //     }
    // }),

    // stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){

    //     if (inst.index == "operate"){

    //         if (this.funcCall){
    //             // Assignment operator function call has already taken care of the "assignment".
    //             // Just evaluate to returned value from assignment operator.
    //             inst.setEvalResult(inst.childInstances.funcCall.evalResult);
    //             this.done(sim, inst);
    //             //return true;
    //         }
    //         else{
    //         }
    //     }
    // },

}

export interface CompiledOperatorOverload<T extends Type = Type, V extends ValueCategory = ValueCategory> extends TypedCompiledExpressionBase<OperatorOverload,T,V> {

    public readonly operands: CompiledExpression[];
    
    public readonly isMemberOverload: boolean;
    public readonly overloadFunctionCall: FunctionCall<T,V>; 
}


export class Comma extends Expression {
    
    public static readonly constructKind = Symbol("Comma");

    public readonly type: Type?;
    public readonly valueCategory: ValueCategory?;

    public readonly left: Expression;
    public readonly right: Expression;

    public readonly _t_compiled! : CompiledComma;

    public constructor(context: ExecutableConstructContext, left: Expression, right: Expression) {
        super(context);
        this.attach(this.left = left);
        this.attach(this.right = right);

        this.type = right.type;
        this.valueCategory = right.valueCategory
    }
    
    // public isSuccessfullyCompiled(): this is Comma<true> {
    //     return !this.hasErrors;
    // }

    public createRuntimeExpression_impl<T extends Type, V extends ValueCategory>(this: CompiledComma<T,V>, parent: ExecutableRuntimeConstruct) : RuntimeComma<CompiledComma<T,V>> {
        return new RuntimeComma(this, parent);
    }

    public isTailChild(child: ExecutableConstruct) {
        if (child === this.right){
            return {isTail: true,
                reason: "The recursive call is on the right side of the comma, so it is guaranteed to be evaluated last."
            };
        }
        else{
            return {isTail: false,
                reason: "The expression on the right of the comma will be evaluated after the recursive call.",
                others: [this.right]
            };
        }
    }

    public describeEvalResult(depth: number) {
        return this.right.describeEvalResult(depth);
    }
}


export interface CompiledComma<T extends Type = Type, V extends ValueCategory = ValueCategory> extends TypedCompiledExpressionBase<Comma,T,V> {
    readonly left: CompiledExpression;
    readonly right: TypedCompiledExpression<T,V>;
}

export class RuntimeComma<CE extends CompiledComma = CompiledComma> extends SimpleRuntimeExpression<CE> {

    public left: RuntimeExpression;
    public right: RuntimeExpressionBase<SimilarTypedCompiledExpression<CE>>;

    public constructor (model: CE, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.left = this.model.left.createRuntimeExpression(this);
        this.right = this.model.right.createRuntimeExpression(this);
        this.setSubexpressions([this.left, this.right]);
    }

    protected operate() {
        this.setEvalResult(this.right.evalResult!);
    }

}


export class Ternary extends Expression {
    
    public readonly type: Type?;
    public readonly valueCategory: ValueCategory?;

    public readonly condition: Expression;
    public readonly then: Expression;
    public readonly otherwise: Expression;
    
    public readonly _t_compiled!: CompiledTernary;

    // public isSuccessfullyCompiled(): this is Ternary<true> {
    //     return !this.hasErrors;
    // }

    public constructor(context: ExecutableConstructContext, condition: Expression, then: Expression, otherwise: Expression) {
        super(context);
        
        if(condition.isWellTyped()) {
            condition = this.compileCondition(condition);
        }

        if (then.isWellTyped() && otherwise.isWellTyped()) {
            ({then, otherwise} = this.compileConsequences(then, otherwise));
        }

        this.attach(this.condition = condition);
        this.attach(this.then = then);
        this.attach(this.otherwise = otherwise);

        this.type = then.type;
        this.valueCategory = then.valueCategory;
    }

    private compileCondition(condition : TypedExpression) {
        condition = standardConversion(condition, new Bool());
        if (!isType(condition.type, Bool)) {
            this.addNote(CPPError.expr.ternary.condition_bool(condition, condition.type));
        }
        return condition;
    }

    private compileConsequences(then: TypedExpression, otherwise: TypedExpression) {
        // If one of the expressions is a prvalue, attempt to make the other one as well
        if (then.valueCategory === "prvalue" && otherwise.valueCategory === "lvalue"){
            otherwise = convertToPRValue(otherwise);
        }
        else if (otherwise.valueCategory === "prvalue" && then.valueCategory === "lvalue"){
            then = convertToPRValue(then);
        }
    

        if (!sameType(then.type, otherwise.type)) {
            this.addNote(CPPError.lobster.ternarySameType(this, then, otherwise));
        }
        if (isType(then.type, VoidType) || isType(otherwise.type, VoidType)) {
            this.addNote(CPPError.lobster.ternaryNoVoid(this));
        }
        
        if (then.valueCategory !== otherwise.valueCategory){
            this.addNote(CPPError.expr.ternary.sameValueCategory(this));
        }
        
        return {then, otherwise};
    }

    public createRuntimeExpression_impl<T extends Type, V extends ValueCategory>(this: CompiledTernary<T, V>, parent: ExecutableRuntimeConstruct) : RuntimeTernary<CompiledTernary<T,V>>{
        return new RuntimeTernary(this, parent);
    }

    // TODO
    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }

    

    public isTailChild(child: ExecutableConstruct) {
        if (child === this.condition){
            return {isTail: false,
                reason: "One of the two subexpressions in the ternary operator will be evaluated after the function call.",
                others: [this.then, this.otherwise]
            };
        }
        else{
            return {isTail: true};
        }
    }
}

export interface CompiledTernary<T extends Type = Type, V extends ValueCategory = ValueCategory> extends TypedCompiledExpressionBase<Ternary,T,V> {
    readonly condition: TypedCompiledExpression<Bool, "prvalue">;
    readonly then: CompiledExpression;
    readonly otherwise: CompiledExpression;
}

export class RuntimeTernary<CE extends CompiledTernary = CompiledTernary> extends RuntimeExpressionBase<CE> {

    public condition: RuntimeExpressionBase<TypedCompiledExpression<Bool, "prvalue">>;
    public then: RuntimeExpressionBase<SimilarTypedCompiledExpression<CE>>;
    public otherwise: RuntimeExpressionBase<SimilarTypedCompiledExpression<CE>>;

    private index = "condition";

    public constructor (model: CE, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.condition = this.model.condition.createRuntimeExpression(this);
        this.then = this.model.then.createRuntimeExpression(this);
        this.otherwise = this.model.otherwise.createRuntimeExpression(this);
    }

	protected upNextImpl() {
        if (this.index === "condition") {
            this.sim.push(this.condition);
            this.index = "branch";
        }
        else if (this.index === "branch") {
            if(this.condition.evalResult!.rawValue) {
                this.sim.push(this.then);
            }
            else{
                this.sim.push(this.otherwise)
            }
            this.index = "operate";
        }
	}
	
	protected stepForwardImpl() {
        this.setEvalResult(this.then ? this.then.evalResult! : this.otherwise!.evalResult!);
        this.sim.pop();
	}
}

export class Assignment extends Expression {
    // public readonly 
    // valueCategory : "lvalue",
    // isOverload : false,
    // isMemberOverload : true,
    // i_childrenToCreate : ["lhs"],
    // i_childrenToExecute : ["lhs", "rhs"],
    // i_childrenToExecuteForOverload : ["lhs", "funcCall"], // does not include rhs because function call does that

    public readonly type: Type?;
    public readonly valueCategory = "lvalue";

    public readonly lhs: Expression;
    public readonly rhs: Expression;
    
    public readonly _t_compiled!: CompiledAssignment;

    private constructor(context: ExecutableConstructContext, lhs: Expression, rhs: Expression) {
        super(context);

        // If the lhs/rhs doesn't have a type or VC, the rest of the analysis doesn't make much sense.
        if (!lhs.isWellTyped() || !rhs.isWellTyped()) {
            this.type = null;
            this.attach(this.lhs = lhs);
            this.attach(this.rhs = rhs);
            return;
        }

        rhs = standardConversion(rhs, lhs.type.cvUnqualified());

        if (lhs.valueCategory && lhs.valueCategory != "lvalue") {
            this.addNote(CPPError.expr.assignment.lhs_lvalue(this));
        }

        // TODO: add a check for a modifiable type (e.g. an array type is not modifiable)

        if (lhs.type.isConst) {
            this.addNote(CPPError.expr.assignment.lhs_const(this));
        }

        if (rhs.type && !sameType(rhs.type, lhs.type.cvUnqualified())) {
            this.addNote(CPPError.expr.assignment.convert(this, lhs, rhs));
        }

        // warning for self assignment
        if (lhs instanceof Identifier && rhs instanceof Identifier && lhs.entity === rhs.entity) {
            this.addNote(CPPError.expr.assignment.self(this, lhs.entity));
        }

        // TODO: do we need to check that lhs is an AtomicType? or is that necessary given all the other checks?

        this.type = lhs.type;
        this.attach(this.lhs = lhs);
        this.attach(this.rhs = rhs);
    }

    public createRuntimeExpression_impl<T extends AtomicType>(this: CompiledAssignment<T>, parent: ExecutableRuntimeConstruct) : RuntimeAssignment<CompiledAssignment<T>> {
        return new RuntimeAssignment(this, parent);
    }
    
    // TODO
    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }


    // convert : function(){

        

    //     // Check for overloaded assignment
    //     // NOTE: don't have to worry about lhs reference type because it will have been adjusted to non-reference
    //     if (isA(this.lhs.type, Types.Class)){
    //         // Class-type LHS means we check for an overloaded = operator

    //         // Compile the RHS as an auxiliary expression so that we can figure out its type without impacting the construct tree
    //         var auxRhs = CPPConstruct.create(this.ast.rhs, {parent: this, auxiliary: true});
    //         auxRhs.compile();

    //         try{
    //             // Look for an overloaded = operator that we can use with an argument of the RHS type
    //             // Note: "own" here means don't look in parent scope containing the class definition, but we still
    //             // look in the scope of any base classes that exist due to the class scope performing member lookup
    //             var assnOp = this.lhs.type.classScope.requiredMemberLookup("operator=", {
    //                 paramTypes:[auxRhs.type],
    //                 isThisConst: this.lhs.type.isConst
    //             });

    //             // TODO: It looks like this if/else isn't necessary due to requiredLookup throwing an exception if not found
    //             if (assnOp){
    //                 this.isOverload = true;
    //                 this.isMemberOverload = true;
    //                 this.funcCall = FunctionCall.instance({args: [this.ast.rhs]}, {parent:this});
    //                 this.funcCall.compile({func: assnOp});
    //                 this.type = this.funcCall.type;
    //                 this.i_childrenToExecute = this.i_childrenToExecuteForOverload;
    //             }
    //             else{
    //                 this.addNote(CPPError.expr.assignment.not_defined(this, this.lhs.type));
    //             }
    //         }
    //         catch(e){
    //             if (isA(e, SemanticExceptions.BadLookup)){
    //                 this.addNote(CPPError.expr.overloadLookup(this, "="));
    //                 this.addNote(e.annotation(this));
    //             }
    //             else{
    //                 throw e;
    //             }
    //         }
    //     }
    //     // else{
    //     //     // Non-class type, so this is regular assignment. Create and compile the rhs, and then attempt
    //     //     // standard conversion of rhs to match cv-unqualified type of lhs, including lvalue to rvalue conversion
    //     // }
    // },


    // upNext : Class.ADDITIONALLY(function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //     if (this.funcCall){
    //         inst.childInstances.funcCall.getRuntimeFunction().setReceiver(EvaluationResultRuntimeEntity.instance(this.lhs.type, inst.childInstances.lhs));
    //     }
    // }),

    // stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){

    //     if (inst.index == "operate"){

    //         if (this.funcCall){
    //             // Assignment operator function call has already taken care of the "assignment".
    //             // Just evaluate to returned value from assignment operator.
    //             inst.setEvalResult(inst.childInstances.funcCall.evalResult);
    //             this.done(sim, inst);
    //             //return true;
    //         }
    //         else{
    //         }
    //     }
    // },

    public isTailChild(child: ExecutableConstruct) {
        return {isTail: false,
            reason: "The assignment itself will happen after the recursive call returns.",
            others: [this]
        };
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        var lhs = this.lhs.describeEvalResult(0);
        var rhs = this.rhs.describeEvalResult(0);
        return {message: "The value of " + (rhs.name || rhs.message) + " will be assigned to " + (lhs.name || lhs.message) + "."};
    }
}

export interface CompiledAssignment<T extends AtomicType = AtomicType> extends TypedCompiledExpressionBase<Assignment,T,"lvalue"> {
    readonly lhs: TypedCompiledExpression<AtomicType, "lvalue">
    readonly rhs: TypedCompiledExpression<AtomicType, "prvalue">
}


export class RuntimeAssignment<CE extends CompiledAssignment = CompiledAssignment> extends SimpleRuntimeExpression<CE> {

    public readonly lhs: RuntimeExpressionBase<TypedCompiledExpression<CE["type"], "lvalue">>;
    public readonly rhs: RuntimeExpressionBase<TypedCompiledExpression<CE["type"], "prvalue">>

    public constructor (model: CE, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.lhs = this.model.lhs.createRuntimeExpression(this);
        this.rhs = this.model.rhs.createRuntimeExpression(this);
        this.setSubexpressions([this.rhs, this.lhs]);
    }

	protected operate() {
        this.lhs.evalResult!.writeValue(this.rhs.evalResult!);
        this.setEvalResult(this.lhs.evalResult!);
	}
}

// var beneathConversions = function(expr){
//     while(isA(expr, Conversions.ImplicitConversion)){
//         expr = expr.from;
//     }
//     return expr;
// };

// TODO: there might be a better way to implement this. currently it reuses code from BinaryOperator, but I feel
// a little bit icky about how it does it and the way it treats the construct tree
// export var CompoundAssignment  = Expression.extend({
//     _name: "CompoundAssignment",
//     valueCategory : "lvalue",

//     i_createFromAST: function(ast){
//         CompoundAssignment._parent.i_createFromAST.apply(this, arguments);

//         // Basically this uses a binary operator expression to do most of the work
//         // e.g. x += y should be equivalent (to a certain extent) to x = x + y

//         this.operator = ast.operator;
//         var binaryOp = this.operator.substring(0, this.operator.length-1); // remove the = from the operator e.g. += becomes +
//         var binAst = copyMixin(ast, {
//             left: ast.lhs,
//             right: ast.rhs,
//             operator: binaryOp
//         });
//         var binaryOpClass = BINARY_OPS[binaryOp];
//         this.i_binaryOp = binaryOpClass.instance(binAst, {parent: this});
//     },

//     compile : function() {

//         //compiles left and right
//         this.i_binaryOp.compile();

//         if(this.hasErrors()){
//             return;
//         }

//         // left should be a standard conversion sequence
//         // we want to extract the pre-conversion expression for lhs
//         this.lhs = beneathConversions(this.i_binaryOp.left);

//         // Attempt to convert rhs (a binary operation) back to type of lhs
//         this.rhs = standardConversion(this.i_binaryOp, this.lhs.type);

//         // Type Check
//         if (this.lhs.valueCategory !== "lvalue") {
//             this.addNote(CPPError.expr.assignment.lhs_lvalue(this));
//         }

//         if (!sameType(this.rhs.type, this.lhs.type)) {
//             this.addNote(CPPError.expr.assignment.convert(this, this.lhs, this.rhs));
//         }

//         this.type = this.lhs.type;

//         this.compileTemporarires();
//     },

//     upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         // Evaluate subexpressions
//         if (inst.index == "subexpressions") {
//             inst.rhs = this.rhs.createAndPushInstance(sim, inst);
//             inst.index = "operate";
//             return true;
//         }
//     },

//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index === "operate"){
//             // extract lvalue on lhs that may be underneath a standard conversion sequence
//             // note: this is only applicable in compound assignment. in regular lhs will never be converted
//             var findLhs = inst.rhs;
//             while(isA(findLhs.model, ImplicitConversion)){
//                 findLhs = findLhs.childInstances.from; // strip conversions off result of binary op
//             }
//             findLhs = findLhs.childInstances.left; // go to left argument of binary op
//             while(isA(findLhs.model, ImplicitConversion)){
//                 findLhs = findLhs.childInstances.from; // strip conversions off left operand
//             }

//             var lhs = findLhs.evalResult;
//             var rhs = inst.rhs.evalResult;

//             lhs.writeValue(rhs);

//             inst.setEvalResult(lhs);
//             this.done(sim, inst);
//         }
//     },

//     isTailChild : function(child){
//         return {isTail: false,
//             reason: "The compound assignment itself will happen after the recursive call returns.",
//             others: [this]
//         };
//     }
// });


export function add(left: number, right: number) {
    return left + right;
}

export function sub(left: number, right: number) {
    return left - right;
}

export function mult(left: number, right: number) {
    return left * right;
}

export function intDiv(left: number, right: number){
    return Math.trunc(left / right);
};

export function floatDiv(left: number, right: number){
    return left / right;
};

export function mod(left: number, right: number){
    return left - intDiv(left, right)*right;
}

export function lt(left: number, right: number){
    return left < right;
}

export function gt(left: number, right: number){
    return left > right;
}

export function lte(left: number, right: number){
    return left <= right;
}

export function gte(left: number, right: number){
    return left >= right;
}

export function eq(left: number, right: number){
    return left == right;
}

export function ne(left: number, right: number){
    return left == right;
}

export function bitAnd(left: number, right: number){
    return left & right;
}

export function bitXor(left: number, right: number){
    return left ^ right;
}

export function bitOr(left: number, right: number){
    return left | right;
}

export function bitShiftLeft(left: number, right: number){
    return left << right;
}

export function bitShiftRight(left: number, right: number){
    return left >>> right; // TODO: is the sign preserving bit shift right more consistent with C++?
}


type t_ArithmeticBinaryOperators = "+" | "-" | "*" | "/" | "%" | "&" | "^" | "|" | "<<" | ">>" | "<" | ">" | "<=" | ">=" | "==" | "!=";
type t_LogicalBinaryOperators = "&&" | "||";
type t_BinaryOperators = t_ArithmeticBinaryOperators | t_LogicalBinaryOperators;

const ArithmeticBinaryOperatorsYieldBool = new Set(["<", ">", "<=", ">=", "==", "!="]);

function binaryOperate(op: t_BinaryOperators, left: Value<AtomicType>, right: Value<AtomicType>) {
    return SIMPLE_BINARY_OPERATIONS[op](left, right);
}

const SIMPLE_BINARY_OPERATIONS : {[index:string]: (left: Value<AtomicType>, right: Value<AtomicType>) => Value<AtomicType>}
    = {
    "+" : function(left: Value<AtomicType>, right: Value<AtomicType>) {
        return left.combine(right, add);
    },
    "-" : function(left: Value<AtomicType>, right: Value<AtomicType>) {
        return left.combine(right, sub);
    },
    "*" : function(left: Value<AtomicType>, right: Value<AtomicType>) {
        return left.combine(right, mult);
    },
    "/" : function(left: Value<AtomicType>, right: Value<AtomicType>) {
        if (left.type.isIntegralType) {
            return left.combine(right, intDiv);
        }
        else {
            return left.combine(right, floatDiv);
        }
    },
    "%" : function(left: Value<AtomicType>, right: Value<AtomicType>) {
        return left.combine(right, mod);
    },
    "&" : function(left: Value<AtomicType>, right: Value<AtomicType>) {
        return left.combine(right, bitAnd);
    },
    "^" : function(left: Value<AtomicType>, right: Value<AtomicType>) {
        return left.combine(right, bitXor);
    },
    "|" : function(left: Value<AtomicType>, right: Value<AtomicType>) {
        return left.combine(right, bitOr);
    },
    "<<" : function(left: Value<AtomicType>, right: Value<AtomicType>) {
        return left.combine(right, bitShiftLeft);
    },
    ">>" : function(left: Value<AtomicType>, right: Value<AtomicType>) {
        return left.combine(right, bitShiftRight);
    },


    "<" : function(left: Value<AtomicType>, right: Value<AtomicType>) {
        return left.compare(right, lt);
    },
    ">" : function(left: Value<AtomicType>, right: Value<AtomicType>) {
        return left.compare(right, gt);
    },
    "<=" : function(left: Value<AtomicType>, right: Value<AtomicType>) {
        return left.compare(right, lte);
    },
    ">=" : function(left: Value<AtomicType>, right: Value<AtomicType>) {
        return left.compare(right, gte);
    },
    "==" : function(left: Value<AtomicType>, right: Value<AtomicType>) {
        return left.compare(right, eq);
    },
    "!=" : function(left: Value<AtomicType>, right: Value<AtomicType>) {
        return left.compare(right, ne);
    },
}

export abstract class BinaryOperator extends Expression {
    
    public abstract readonly type: Type?;
    public readonly valueCategory = "prvalue";

    public abstract readonly left: Expression;
    public abstract readonly right: Expression;

    public readonly operator: t_BinaryOperators;
    
    public readonly _t_compiled!: CompiledBinaryOperator;

    protected constructor(context: ExecutableConstructContext, operator: t_BinaryOperators) {
        super(context)
        this.operator = operator;
    }
}

export interface CompiledBinaryOperator<T extends AtomicType = AtomicType> extends TypedCompiledExpressionBase<BinaryOperator,T,"prvalue"> {
    readonly left: TypedCompiledExpression<AtomicType, "prvalue">
    readonly right: TypedCompiledExpression<AtomicType, "prvalue">
}

export class RuntimeSimpleBinaryOperator<CE extends CompiledBinaryOperator = CompiledBinaryOperator> extends SimpleRuntimeExpression<CE> {

    public left: RuntimeExpressionBase<TypedCompiledExpression<AtomicType, "prvalue">>;
    public right: RuntimeExpressionBase<TypedCompiledExpression<AtomicType, "prvalue">>;

    public constructor (model: CE, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.left = this.model.left.createRuntimeExpression(this);
        this.right = this.model.right.createRuntimeExpression(this);
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {
        this.setEvalResult(<EvalResultType<CE>>binaryOperate(this.model.operator, this.left.evalResult!, this.right.evalResult!));
    }
}



class ArithmeticBinaryOperator extends BinaryOperator {
    
    public readonly type: AtomicType?;

    public readonly left: Expression;
    public readonly right: Expression;

    public readonly operator!: t_ArithmeticBinaryOperators; // Narrows type from base

    protected constructor(context: ExecutableConstructContext, left: Expression, right: Expression, operator: t_ArithmeticBinaryOperators) {
        super(context, operator);

        if (!left.isWellTyped() || !right.isWellTyped()) {
            this.type = null;
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }
        
        // Arithmetic types are required
        if (!left.type.isArithmeticType || !right.type.isArithmeticType) {
            this.addNote(CPPError.expr.binary.arithmetic_operands(this, this.operator, left, right));
            this.type = null;
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }

        // % operator and shift operators require integral operands
        if ((operator === "%" || operator === "<<" || operator == ">>") &&
            (!left.type.isIntegralType || !right.type.isIntegralType)) {
            this.addNote(CPPError.expr.binary.arithmetic_operands(this, this.operator, left, right));
            this.type = null;
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }

        ({left, right} = usualArithmeticConversions(left, right));

        
        if (!sameType(left.type!, right.type!)) {
            this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, left, right));
        }

        if (ArithmeticBinaryOperatorsYieldBool.has(this.operator)) {
            this.type = new Bool();
        }
        else {
            this.type = <AtomicType>left.type; //NOTE: this cast is valid since arithmeticType implies AtomicType. TODO: work this into the type hierarchy?
        }
        this.attach(this.left = left);
        this.attach(this.right = right);
    }


    public createRuntimeExpression_impl<T extends AtomicType>(this: CompiledBinaryOperator<T>, parent: ExecutableRuntimeConstruct) : RuntimeSimpleBinaryOperator<CompiledBinaryOperator<T>> {
        return new RuntimeSimpleBinaryOperator(this, parent);
    }

    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }
}




class PointerOffset extends BinaryOperator {
    
    public readonly type: Pointer?;

    public readonly left: Expression;
    public readonly right: Expression;

    public readonly pointer?: TypedExpression<Pointer, "prvalue">;
    public readonly offset?: TypedExpression<IntegralType, "prvalue">;

    public readonly pointerOnLeft?: boolean;

    public readonly operator! : "+"; // Narrows type from base

    protected constructor(context: ExecutableConstructContext, left: Expression, right: Expression) {
        super(context, "+");

        if (left.isWellTyped() && right.isWellTyped()) {
            left = convertToPRValue(left);
            right = convertToPRValue(right);
        }

        this.attach(this.left = left);
        this.attach(this.right = right);

        if (left.isWellTyped() && right.isWellTyped()) {
            
            if (left.type.isType(Pointer) && right.type.isIntegralType) {
                this.pointerOnLeft = true;
                this.pointer = <TypedExpression<Pointer, "prvalue">> left;
                this.offset = <TypedExpression<IntegralType, "prvalue">> right;
                this.type = this.pointer.type;
            }
            else if (left.type.isIntegralType && right.type.isType(Pointer)) {
                this.pointerOnLeft = false;
                this.pointer = <TypedExpression<Pointer, "prvalue">> right;
                this.offset = <TypedExpression<IntegralType, "prvalue">> left;
                this.type = this.pointer.type;
            }
            else {
                this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, left, right));
                this.type = null;
            }
        }
        else {
            this.type = null;
        }
    }

    public createRuntimeExpression_impl(this: CompiledPointerOffset, parent: ExecutableRuntimeConstruct) : RuntimeSimpleBinaryOperator<CompiledPointerOffset> {
        return new RuntimePointerOffset(this, parent);
    }

    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }
}

export interface CompiledPointerOffset extends TypedCompiledExpressionBase<PointerOffset,Pointer,"prvalue"> {
    readonly left: TypedCompiledExpression<AtomicType, "prvalue">
    readonly right: TypedCompiledExpression<AtomicType, "prvalue">
    
    public readonly pointer: TypedCompiledExpression<Pointer, "prvalue">;
    public readonly offset: TypedCompiledExpression<IntegralType, "prvalue">;
    
    public readonly pointerOnLeft?: boolean;
}


export class RuntimePointerOffset<CE extends CompiledPointerOffset = CompiledPointerOffset> extends SimpleRuntimeExpression<CE> {

    public left: RuntimeExpressionBase<TypedCompiledExpression<AtomicType, "prvalue">>;
    public right: RuntimeExpressionBase<TypedCompiledExpression<AtomicType, "prvalue">>;

    public pointer: RuntimeExpressionBase<TypedCompiledExpression<Pointer, "prvalue">>;
    public offset: RuntimeExpressionBase<TypedCompiledExpression<IntegralType, "prvalue">>;

    public constructor (model: CE, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.pointer = this.model.pointer.createRuntimeExpression(this);
        this.offset = this.model.offset.createRuntimeExpression(this);
        if (model.pointerOnLeft) {
            this.left = this.pointer;
            this.right = this.offset;
        }
        else {
            this.left = this.offset;
            this.right = this.pointer;
        }
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {

        // code below computes the new address after pointer addition, while preserving RTTI
        //   result = pointer + offset * pointerSize
        let result = this.pointer.evalResult!.pointerOffset(this.offset.evalResult!);
        this.setEvalResult(result);

        if (result.type.isType(ArrayPointer)){
            // Check that we haven't run off the array
            if (result.rawValue < result.type.min()){
                //sim.alert("Oops. That pointer just wandered off the beginning of its array.");
            }
            else if (result.type.onePast() < result.rawValue){
                //sim.alert("Oops. That pointer just wandered off the end of its array.");
            }
        }
        else{
            // If the RTTI works well enough, this should always be unsafe
            this.sim.undefinedBehavior("Uh, I don't think you're supposed to do arithmetic with that pointer. It's not pointing into an array.");
        }
    }
}


class PointerDifference extends BinaryOperator {
    
    public readonly type: IntegralType?;

    public readonly left: Expression;
    public readonly right: Expression;

    public readonly operator! : "-"; // Narrows type from base

    protected constructor(context: ExecutableConstructContext, left: Expression, right: Expression) {
        super(context, "-");

        if (left.isWellTyped() && right.isWellTyped()) {
            left = convertToPRValue(left);
            right = convertToPRValue(right);
        }

        this.attach(this.left = left);
        this.attach(this.right = right);

        if (left.isWellTyped() && right.isWellTyped()) {
            
            if (left.type.isType(Pointer) && right.type.isType(Pointer)) {
                this.type = new Int();
            }
            else {
                this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, left, right));
                this.type = null;
            }
        }
        else {
            this.type = null;
        }
    }

    public createRuntimeExpression_impl(this: CompiledPointerDifference, parent: ExecutableRuntimeConstruct) : RuntimeSimpleBinaryOperator<CompiledPointerDifference> {
        return new RuntimePointerDifference(this, parent);
    }

    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }
}

export interface CompiledPointerDifference extends TypedCompiledExpressionBase<PointerDifference,IntegralType,"prvalue"> {
    readonly left: TypedCompiledExpression<Pointer, "prvalue">
    readonly right: TypedCompiledExpression<Pointer, "prvalue">
}

export class RuntimePointerDifference<CE extends CompiledPointerDifference = CompiledPointerDifference> extends SimpleRuntimeExpression<CE> {

    public left: RuntimeExpressionBase<TypedCompiledExpression<Pointer, "prvalue">>;
    public right: RuntimeExpressionBase<TypedCompiledExpression<Pointer, "prvalue">>;

    public constructor (model: CE, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.left = this.model.left.createRuntimeExpression(this);
        this.right = this.model.right.createRuntimeExpression(this);HTMLTableDataCellElement
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {
        
        let result = this.left.evalResult!.pointerDifference(this.right.evalResult!);

        let leftArr = this.left.model.type.isType(ArrayPointer) ? this.left.model.type.arrayObject : null;
        let rightArr = this.right.model.type.isType(ArrayPointer) ? this.right.model.type.arrayObject : null;

        if (result.rawEquals(0)) {
            // If it's the same address, I guess we can let it slide...
        }
        else if (!leftArr && rightArr) {
            this.sim.undefinedBehavior("The left pointer in this subtraction is not from an array, so the resulting difference is not meaningful.");
            result = result.invalidated();
        }
        else if (leftArr && !rightArr) {
            this.sim.undefinedBehavior("The right pointer in this subtraction is not from an array, so the resulting difference is not meaningful.");
            result = result.invalidated();
        }
        else if (leftArr && rightArr && leftArr !== rightArr) {
            this.sim.undefinedBehavior("The pointers in this subtraction are pointing into two different arrays, so the resulting difference is not meaningful.");
            result = result.invalidated();
        }

        this.setEvalResult(result);

    }
}



// PointerRelationalBinaryOperator


//     convert : function(){

//         if (isA(this.left.type, Types.Pointer) && isA(this.right, Literal) && isA(this.right.type, Types.Int) && this.right.value.rawValue() == 0){
//             this.right = Conversions.NullPointerConversion.instance(this.right, this.left.type);
//         }
//         if (isA(this.right.type, Types.Pointer) && isA(this.left, Literal) && isA(this.left.type, Types.Int) && this.left.value.rawValue() == 0){
//             this.left = Conversions.NullPointerConversion.instance(this.left, this.right.type);
//         }
//     },

//     typeCheck : function(){

//         // Note: typeCheck is only called if it's not an overload

//         if (isA(this.left.type, Types.Pointer)){
//             if (!isA(this.right.type, Types.Pointer)){
//                 // TODO this is a hack until I implement functions to determine cv-combined type and composite pointer types
//                 this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, this.left, this.right));
//                 return false;
//             }
//         }
//     },

//     operate : function(left, right, sim, inst){
//         if (this.isPointerComparision) {
//             if (!this.allowDiffArrayPointers && (!isA(left.type, Types.ArrayPointer) || !isA(right.type, Types.ArrayPointer) || left.type.arrObj !== right.type.arrObj)){
//                 sim.unspecifiedBehavior("It looks like you're trying to see which pointer comes before/after in memory, but this only makes sense if both pointers come from the same array. I don't think that's the case here.");
//             }
//             return Value.instance(this.compare(left.value, right.value), this.type); // TODO match C++ arithmetic
//         }
//     }
// });

class LogicalBinaryOperator extends BinaryOperator {
    
    public readonly type: Bool = new Bool();

    public readonly left: Expression;
    public readonly right: Expression;

    public readonly operator!: t_LogicalBinaryOperators; // Narrows type from base

    protected constructor(context: ExecutableConstructContext, left: Expression, right: Expression, operator: t_LogicalBinaryOperators) {
        super(context, operator);

        if (left.isWellTyped() && right.isWellTyped()) {
            this.attach(this.left = this.compileLogicalSubexpression(left));
            this.attach(this.right = this.compileLogicalSubexpression(right));
        }
        else {
            this.attach(this.left = left);
            this.attach(this.right = right);
        }
    }

    private compileLogicalSubexpression(subexpr : TypedExpression) {
        subexpr = standardConversion(subexpr, Bool.BOOL);
        if (!isType(subexpr.type, Bool)) {
            this.addNote(CPPError.expr.binary.boolean_operand(this, this.operator, subexpr));
        }
        return subexpr;
    }
    
    public createRuntimeExpression_impl<T extends AtomicType>(this: CompiledBinaryOperator<T>, parent: ExecutableRuntimeConstruct) : RuntimeSimpleBinaryOperator<CompiledBinaryOperator<T>> {
        return new RuntimeSimpleBinaryOperator(this, parent);
    }

    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }
    
    public isTailChild(child: ExecutableConstruct) {
        if (child === this.left){
            return {isTail: false,
                reason: "The right operand of the " + this.operator + " operator may need to be checked if it does not short circuit.",
                others: [this.right]
            };
        }
        else{
            return {isTail: true,
                reason: "Because the " + this.operator + " operator short circuits, the right operand is guaranteed to be evaluated last and its result is used directly (no combination with left side needed)."
            };
        }
    }
}


export interface CompiledLogicalBinaryOperator extends TypedCompiledExpressionBase<LogicalBinaryOperator,Bool,"prvalue">{
    readonly left: TypedCompiledExpression<Bool, "prvalue">
    readonly right: TypedCompiledExpression<Bool, "prvalue">
}

export class RuntimeLogicalBinaryOperator extends RuntimeExpressionBase<CompiledLogicalBinaryOperator> {

    public left: RuntimeExpressionBase<TypedCompiledExpression<Bool, "prvalue">>;
    public right: RuntimeExpressionBase<TypedCompiledExpression<Bool, "prvalue">>;

    private index = "left";

    private hasShortCircuited?: boolean;

    public constructor (model: CompiledLogicalBinaryOperator, parent: ExecutableRuntimeConstruct) {
        super(model, parent);
        this.left = this.model.left.createRuntimeExpression(this);
        this.right = this.model.right.createRuntimeExpression(this);
    }

	protected upNextImpl() {
        if (this.index === "left") {
            this.sim.push(this.left);
            this.index = "right";
        }
        else if (this.index === "right") {
            let shortCircuitReslt = this.model.operator === "&&" ? 0 : 1;
            this.hasShortCircuited = this.left.evalResult!.rawEquals(shortCircuitReslt);

            if (!this.hasShortCircuited) {
                // only push right child if we have not short circuited
                this.sim.push(this.right);
            }
            this.index = "operate";
        }
	}
	
	protected stepForwardImpl() {
        if (this.hasShortCircuited) {
            this.setEvalResult(this.left.evalResult!);
        }
        else {
            this.setEvalResult(this.operate(this.left.evalResult!, this.right.evalResult!));
        }
        this.sim.pop();
    }
    
    private operate(left: Value<Bool>, right: Value<Bool>) {
        return left.combine(right, (a: RawValueType, b: RawValueType) => {
            return this.model.operator == "&&" ? a && b : a || b;
        });
    }
}



// export var UnaryOp  = Expression.extend({
//     _name: "UnaryOp",
//     i_childrenToExecute : ["operand"],
//     i_childrenToExecuteForMemberOverload : ["operand", "funcCall"], // does not include rhs because function call does that
//     i_childrenToExecuteForOverload : ["funcCall"], // does not include rhs because function call does that

//     i_createFromAST : function(ast, context){
//         UnaryOp._parent.i_createFromAST.apply(this, arguments);
//         this.operator = ast.operator;
//     },

//     compile : function(){

//         var auxOperand = CPPConstruct.create(this.ast.operand, {parent: this, auxiliary: true});
//         auxOperand.compile();

//         if (isA(auxOperand.type, Types.Class)){
//             // If it's of class type, we look for overloads
//             var overloadOp = auxOperand.type.classScope.singleLookup("operator" + this.operator, {
//                 own:true, paramTypes:[], isThisConst : auxOperand.type.isConst
//             });
//             if (!overloadOp) {
//                 overloadOp = this.contextualScope.singleLookup("operator" + this.operator, {
//                     paramTypes: [auxOperand.type]
//                 });
//             }

//             if (overloadOp){
//                 this.isOverload = true;
//                 this.isMemberOverload = isA(overloadOp, MemberFunctionEntity);

//                 if (this.isMemberOverload){
//                     // Member overload means operand is our direct child, and no arguments to function call
//                     this.operand = this.i_createAndCompileChildExpr(this.ast.operand);
//                     this.funcCall = FunctionCall.instance({args: []}, {parent:this});
//                     this.funcCall.compile({func: overloadOp});
//                     this.i_childrenToExecute = this.i_childrenToExecuteForMemberOverload;
//                 }
//                 else{
//                     // Non-member overload means operand is the argument to the function call
//                     this.funcCall = FunctionCall.instance({args: [this.ast.operand]}, {parent:this});
//                     this.funcCall.compile({func: overloadOp});
//                     this.i_childrenToExecute = this.i_childrenToExecuteForOverload;
//                 }
//                 this.type = this.funcCall.type;
//                 this.valueCategory = this.funcCall.valueCategory;
//             }
//             else{

//                 // TODO: this appears to allow compilation to proceed for a class-type operand with
//                 // no overloads found, but that's doomed to fail (I think?). Perhaps my thought was
//                 // the error messages provided if you accidentally used a unary operator e.g. * with
//                 // a class-type operand were more illustrative if they said something like "you can't use
//                 // * with a non-pointer type rather than oops i can't find an overload for * with this class type
//                 this.operand = this.i_createAndCompileChildExpr(this.ast.operand);
//                 this.convert();
//                 this.typeCheck();
//                 this.compileTemporarires();
//             }
//         }
//         else{
//             this.operand = this.i_createAndCompileChildExpr(this.ast.operand);
//             this.convert();
//             this.typeCheck();
//             this.compileTemporarires();
//         }
//     },

//     upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         // Push lhs, rhs, and function call (if lhs class type)
//         var toReturn = Expression.upNext.apply(this, arguments);

//         // If using an assignment operator, set receiver for function call instance
//         if (this.funcCall && this.isMemberOverload){
//             inst.childInstances.funcCall.calledFunction.setReceiver(EvaluationResultRuntimeEntity.instance(this.operand.type, inst.childInstances.operand));
//         }

//         return toReturn;
//     },

//     stepForward: function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index === "operate"){
//             if (this.funcCall){
//                 // Assignment operator function call has already taken care of the "assignment".
//                 // Just evaluate to returned value from assignment operator.
//                 inst.setEvalResult(inst.childInstances.funcCall.evalResult);
//                 this.done(sim, inst);
//                 //return true;
//             }
//             else{
//                 this.operate(sim, inst);
//                 this.done(sim, inst);
//             }
//         }
//     },

//     operate: Class._ABSTRACT,

//     isTailChild : function(child){
//         return {isTail: false,
//             reason: "The " + this.operator + " operation will happen after the recursive call.",
//             others: [this]
//         };
//     }
// });

// export var Dereference = UnaryOp.extend({
//     _name: "Dereference",
//     valueCategory: "lvalue",
//     convert : function(){
//         this.operand = this.operand = standardConversion(this.operand, Types.Pointer);
//     },
//     typeCheck : function(){
//         // Type check
//         if (!isA(this.operand.type, Types.Pointer)) {
//             this.addNote(CPPError.expr.dereference.pointer(this, this.operand.type));
//         }
//         else if (!(this.operand.type.ptrTo.isObjectType || isA(this.operand.type.ptrTo, Types.Function))){
//             this.addNote(CPPError.expr.dereference.pointerToObjectType(this, this.operand.type));
//         }
//         else{
//             this.type = this.operand.type.ptrTo;
//         }
//     },

//     operate: function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (isA(this.operand.type.ptrTo, Types.Function)){
//             //function pointer
//             inst.setEvalResult(inst.childInstances.operand.evalResult);
//         }
//         else{
//             var ptr = inst.childInstances.operand.evalResult;
//             var addr = ptr.rawValue();



//             // If it's a null pointer, give message
//             if (Types.Pointer.isNull(addr)){
//                 sim.crash("Ow! Your code just dereferenced a null pointer!");
//             }
//             else if (Types.Pointer.isNegative(addr)){
//                 sim.crash("Uh, wow. The pointer you're trying to dereference has a negative address.\nThanks a lot.");
//             }
//             else if (isA(ptr.type, Types.ArrayPointer)){
//                 // If it's an array pointer, make sure it's in bounds and not one-past
//                 if (addr < ptr.type.min()){
//                     sim.undefinedBehavior("That pointer has wandered off the beginning of its array. Dereferencing it might cause a segfault, or worse - you might just access/change other memory outside the array.");
//                 }
//                 else if (ptr.type.onePast() < addr){
//                     sim.undefinedBehavior("That pointer has wandered off the end of its array. Dereferencing it might cause a segfault, or worse - you might just access/change other memory outside the array.");
//                 }
//                 else if (addr == ptr.type.onePast()){
//                     // TODO: technically this is not undefined behavior unless the result of the dereference undergoes an lvalue-to-rvalue conversion to look up the object
//                     sim.undefinedBehavior("That pointer is one past the end of its array. Do you have an off-by-one error?. Dereferencing it might cause a segfault, or worse - you might just access/change other memory outside the array.");
//                 }

//             }

//             var obj = sim.memory.dereference(ptr);

//             // Note: dead object is not necessarily invalid. Invalid has to do with the value
//             // while dead/alive has to do with the object itself. Reading from dead object does
//             // yield an invalid value though.
//             if (!obj.isAlive()){
//                 DeadObjectMessage.instance(obj, {fromDereference:true}).display(sim, inst);
//             }

//             inst.setEvalResult(obj);
//         }
//     },

//     describeEvalResult : function(depth, sim, inst){
//         if (inst && inst.evalResult){
//             return inst.evalResult.describe();
//         }
//         else if (depth == 0){
//             return {message: "the result of " + this.getSourceText()};
//         }
//         else{
//             return {message: "the object at address " + this.operand.describeEvalResult(depth-1, sim, this.childInstance(sim, inst, "operand")).message};
//         }
//     },

//     explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst && inst.childInstances && inst.childInstances.operand && inst.childInstances.operand.evalResult){
//             return {message: "We will find the object at address " + inst.childInstances.operand.evalResult.describe().message}
//         }
//         else{
//             return {message: "The result of " + this.operand.describeEvalResult(0, sim, inst && inst.childInstances && inst.childInstances.operand).message + " will be dereferenced. This is, the result is a pointer/address and we will follow the pointer to see what object lives there."};
//         }
//     }
// });

// export var AddressOf = UnaryOp.extend({
//     _name: "AddressOf",
//     valueCategory: "prvalue",

//     typeCheck : function(){
//         // operand must be an lvalue
//         if(this.operand.valueCategory !== "lvalue"){
//             this.addNote(CPPError.expr.addressOf.lvalue_required(this));
//         }

//         this.type = Types.Pointer.instance(this.operand.type);
//     },

//     operate: function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var obj = inst.childInstances.operand.evalResult;

//         inst.setEvalResult(obj.getPointerTo());
//     }
// });


// export var UnaryPlus = UnaryOp.extend({
//     _name: "UnaryPlus",
//     valueCategory: "prvalue",

//     convert : function(){
//         this.operand = this.operand = convertToPRValue(this.operand);
//         if (this.operand.type.isIntegralType){
//             this.operand = this.operand = integralPromotion(this.operand);
//         }
//     },

//     typeCheck : function(){
//         if(this.operand.type.isArithmeticType || isA(this.operand.type, Types.Pointer)) {
//             this.type = this.operand.type;
//             return true;
//         }
//         else{
//             this.addNote(CPPError.expr.unaryPlus.operand(this));
//             return false;
//         }
//     },

//     operate: function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var val = inst.childInstances.operand.evalResult.value;
//         inst.setEvalResult(Value.instance(val, this.type));
//     }
// });

// export var UnaryMinus = UnaryOp.extend({
//     _name: "UnaryMinus",
//     valueCategory: "prvalue",

//     convert : function(){
//         this.operand = this.operand = convertToPRValue(this.operand);
//         if (this.operand.type.isIntegralType){
//             this.operand = this.operand = integralPromotion(this.operand);
//         }
//     },

//     typeCheck : function(){
//         if(this.operand.type.isArithmeticType) {
//             this.type = this.operand.type;
//             return true;
//         }
//         else{
//             this.addNote(CPPError.expr.unaryMinus.operand(this));
//             return false;
//         }
//     },

//     operate: function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var val = inst.childInstances.operand.evalResult.value;
//         inst.setEvalResult(Value.instance(-val, this.type));
//     }
// });

// export var LogicalNot = UnaryOp.extend({
//     _name: "LogicalNot",
//     valueCategory: "prvalue",
//     type: Types.Bool.instance(),

//     convert : function(){
//         this.operand = standardConversion(this.operand, Types.Bool.instance());
//     },

//     typeCheck : function(){
//         // Type check
//         if (!isA(this.operand.type, Types.Bool)){
//             this.addNote(CPPError.expr.logicalNot.operand_bool(this, this.operand));
//         }
//     },

//     operate: function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         inst.setEvalResult(Value.instance(!inst.childInstances.operand.evalResult.value, this.type));
//     }
// });

// export var BitwiseNot = Unsupported.extend({
//     _name: "BitwiseNot",
//     englishName: "bitwise not"
// });

// export var Prefix = UnaryOp.extend({
//     _name: "Prefix",
//     valueCategory: "lvalue",
//     typeCheck : function(){
//         // Type check
//         if (this.operand.type.isArithmeticType || isA(this.operand.type, Types.Pointer)) {
//             this.type = this.operand.type;

//             if (this.operator == "--" && isA(this.operand.type, Types.Bool)){
//                 this.addNote(CPPError.expr.invalid_operand(this, this.operator, this.operand));
//             }

//             else if (this.operand.valueCategory === "lvalue") {
//                 return true;
//             }
//             else{
//                 this.addNote(CPPError.expr.lvalue_operand(this, this.operator));
//             }
//         }
//         else{
//             this.addNote(CPPError.expr.invalid_operand(this, this.operator, this.operand));
//         }
//     },
//     operate: function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var obj = inst.childInstances.operand.evalResult;
//         var amount = (isA(this.type, Types.Pointer) ? this.type.ptrTo.size : 1);

//         var oldValue = readValueWithAlert(obj, sim, this.operand, inst.childInstances.operand);
//         var newRawValue = this.operator === "++" ? oldValue.rawValue() + amount : oldValue.rawValue() - amount;

//         if (isA(obj.type, Types.ArrayPointer)){
//             // Check that we haven't run off the array
//             if (newRawValue < obj.type.min()){
//                 if (obj.isValueValid()){ // it was valid but is just now becoming invalid
//                     sim.alert("Oops. That pointer just wandered off the beginning of its array.");
//                 }
//             }
//             else if (obj.type.onePast() < newRawValue){
//                 if (obj.isValueValid()){ // it was valid but is just now becoming invalid
//                     sim.alert("Oops. That pointer just wandered off the end of its array.");
//                 }
//             }
//         }
//         else if (isA(obj.type, Types.Pointer)){
//             // If the RTTI works well enough, this should always be unsafe
//             sim.undefinedBehavior("Uh, I don't think you're supposed to do arithmetic with that pointer. It's not pointing into an array.");
//         }

//         obj.writeValue(Value.instance(newRawValue, oldValue.type, {invalid: !oldValue.isValueValid()}));
//         inst.setEvalResult(obj);
//     },

//     explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var evdesc = this.operand.describeEvalResult(0, sim, inst && inst.childInstances && inst.childInstances.operand).message;
//         var incDec = this.operator === "++" ? "incremented" : "decremented";
//         return {message: "First, the value of " + evdesc + " will be " + incDec + " by one. Then this expression as a whole will evaluate to the new value of " + evdesc + "."};
//     }
// });


// // TODO: Consolidate postfix increment/decrement into one class.  consider also merging subscript
// // TODO: Allow overriding postfix increment/decrement
// export var Increment  = Expression.extend({
//     _name: "Increment",
//     valueCategory: "prvalue",
//     i_childrenToCreate : ["operand"],
//     i_childrenToExecute : ["operand"],

//     typeCheck : function(){
//         // Type check
//         if (this.operand.type.isArithmeticType || isA(this.operand.type, Types.Pointer)) {
//             this.type = this.operand.type;

//             if (this.operand.valueCategory === "lvalue") {
//                 return true;
//             }
//             else{
//                 this.addNote(CPPError.expr.lvalue_operand(this, "++"));
//             }
//         }
//         else{
//             this.addNote(CPPError.expr.invalid_operand(this, "++", this.operand));
//         }
//     },

//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){

//         // Evaluate subexpressions
//         if (inst.index == "operate"){
//             var obj = inst.childInstances.operand.evalResult;
//             var amount = (isA(this.type, Types.Pointer) ? this.type.ptrTo.size : 1);
//             var oldValue = readValueWithAlert(obj, sim, this.operand, inst.childInstances.operand);
//             var newRawValue = oldValue.rawValue() + amount;


//             if (isA(obj.type, Types.ArrayPointer)){
//                 // Check that we haven't run off the array
//                 if (newRawValue < obj.type.min()){
//                     //sim.alert("Oops. That pointer just wandered off the beginning of its array.");
//                 }
//                 else if (obj.type.onePast() < newRawValue){
//                     //sim.alert("Oops. That pointer just wandered off the end of its array.");
//                 }
//             }
//             else if (isA(obj.type, Types.Pointer)){
//                 // If the RTTI works well enough, this should always be unsafe
//                 sim.undefinedBehavior("Uh, I don't think you're supposed to do arithmetic with that pointer. It's not pointing into an array.");
//             }


//             obj.writeValue(Value.instance(newRawValue, oldValue.type, {invalid: !oldValue.isValueValid()}));
//             inst.setEvalResult(oldValue);
//             this.done(sim, inst);
//         }
//     }
// });

// export var Decrement  = Expression.extend({
//     _name: "Decrement",
//     valueCategory: "prvalue",
//     i_childrenToCreate : ["operand"],
//     i_childrenToExecute : ["operand"],
//     typeCheck : function(){
//         // Type check
//         if (this.operand.type.isArithmeticType || isA(this.operand.type, Types.Pointer)) {
//             this.type = this.operand.type;

//             if (this.operator = "--" && isA(this.operand.type, Types.Bool)){
//                 this.addNote(CPPError.expr.invalid_operand(this, this.operator, this.operand));
//             }
//             else if (this.operand.valueCategory === "lvalue") {
//                 return true;
//             }
//             else{
//                 this.addNote(CPPError.expr.lvalue_operand(this, this.operator));
//             }
//         }
//         else{
//             this.addNote(CPPError.expr.invalid_operand(this, this.operator, this.operand));
//         }
//     },
//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){

//         // Evaluate subexpressions
//         if (inst.index == "operate"){
//             var obj = inst.childInstances.operand.evalResult;
//             var amount = (isA(this.type, Types.Pointer) ? this.type.ptrTo.size : 1);
//             var oldValue = readValueWithAlert(obj, sim, this.operand, inst.childInstances.operand);
//             var newRawValue = oldValue.rawValue() - amount;

//             if (isA(obj.type, Types.ArrayPointer)){
//                 // Check that we haven't run off the array
//                 if (newRawValue < obj.type.min()){
//                     //sim.alert("Oops. That pointer just wandered off the beginning of its array.");
//                 }
//                 else if (obj.type.onePast() < newRawValue){
//                     //sim.alert("Oops. That pointer just wandered off the end of its array.");
//                 }
//             }
//             else if (isA(obj.type, Types.Pointer)){
//                 // If the RTTI works well enough, this should always be unsafe
//                 sim.undefinedBehavior("Uh, I don't think you're supposed to do arithmetic with that pointer. It's not pointing into an array.");
//             }

//             obj.writeValue(Value.instance(newRawValue, oldValue.type, {invalid: !oldValue.isValueValid()}));
//             inst.setEvalResult(oldValue);
//             this.done(sim, inst);
//         }
//     }
// });



// // TODO: Allow overloading Subscript with initializer list
// export var Subscript  = Expression.extend({
//     _name: "Subscript",
//     valueCategory: "lvalue",
//     i_childrenToCreate : ["operand"],
//     i_childrenToExecute : ["operand", "arg"],
//     i_childrenToExecuteForMemberOverload : ["operand"], // does not include offset because function call does that

//     compile : function(){

//         this.operand.compile();

//         // Check for overload
//         if (isA(this.operand.type, Types.Class)){
//             this.compileMemberOverload(this.operand, [this.ast.arg], this.operand.type.isConst, "[]");
//         }
//         else{
//             this.operand = standardConversion(this.operand, Types.Pointer);
//             this.arg = this.i_createAndCompileChildExpr(this.ast.arg, Types.Int.instance());

//             this.convert();
//             this.typeCheck();
//             this.compileTemporarires();
//         }
//     },

//     typeCheck : function(){
//         if (!isA(this.operand.type, Types.Pointer)) {
//             this.addNote(CPPError.expr.array_operand(this, this.operand.type));
//         }
//         else{
//             this.type = this.operand.type.ptrTo;
//         }

//         if (!isA(this.arg.type, Types.Int)) {
//             this.addNote(CPPError.expr.array_offset(this, this.arg.type));
//         }
//     },


//     upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (this.isOverload)
//         {
//             if (inst.index === "subexpressions"){
//                 inst.childInstances = {};
//                 inst.childInstances.operand = this.operand.createAndPushInstance(sim, inst);
//                 inst.index = "operate";
//                 return true;
//             }
//             else if (inst.index === "operate"){
//                 inst.childInstances.funcCall = this.funcCall.createAndPushInstance(sim, inst, inst.childInstances.operand.evalResult);
//                 inst.index = "done";
//                 return true;
//             }
//             else{
//                 inst.setEvalResult(inst.childInstances.funcCall.evalResult);
//                 this.done(sim, inst);
//                 return true;
//             }
//         }
//         else{
//             Expressions.Subscript._parent.upNext.apply(this, arguments);
//         }
//     },

//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){

//         // Evaluate subexpressions
//         if (inst.index === "operate"){
//             // sub and operand are already evaluated
//             // result of operand should be a pointer
//             // result of sub should be an integer
//             var offset = inst.childInstances.arg.evalResult;
//             var ptr = inst.childInstances.operand.evalResult;
//             ptr = Value.instance(ptr.value+offset.value*this.type.size, ptr.type);
//             var addr = ptr.value;



//             if (Types.Pointer.isNegative(addr)){
//                 sim.crash("Good work. You subscripted so far backwards off the beginning of the array you went to a negative address. -__-");
//             }
//             else if (isA(ptr.type, Types.ArrayPointer)){
//                 // If it's an array pointer, make sure it's in bounds and not one-past
//                 if (addr < ptr.type.min()){
//                     sim.undefinedBehavior("That subscript operation goes off the beginning of the array. This could cause a segfault, or worse - you might just access/change other memory outside the array.");
//                 }
//                 else if (ptr.type.onePast() < addr){
//                     sim.undefinedBehavior("That subscript operation goes off the end of the array. This could cause a segfault, or worse - you might just access/change other memory outside the array.");
//                 }
//                 else if (addr == ptr.type.onePast()){
//                     // TODO: technically this is not undefined behavior unless the result of the dereference undergoes an lvalue-to-rvalue conversion to look up the object
//                     sim.undefinedBehavior("That subscript accesses the element one past the end of the array. This could cause a segfault, or worse - you might just access/change other memory outside the array.");
//                 }

//             }

//             var obj = sim.memory.dereference(ptr);

//             // Note: dead object is not necessarily invalid. Invalid has to do with the value
//             // while dead/alive has to do with the object itself. Reading from dead object does
//             // yield an invalid value though.
//             if (!obj.isAlive()){
//                 DeadObjectMessage.instance(obj, {fromSubscript:true}).display(sim, inst);
//             }

//             inst.setEvalResult(obj);
//             this.done(sim, inst);
//         }
//     },

//     isTailChild : function(child){
//         return {isTail: false,
//             reason: "The subscripting will happen after the recursive call returns.",
//             others: [this]
//         };
//     }
// });

// export var Dot  = Expression.extend({
//     _name: "Dot",
//     i_runtimeConstructClass : RuntimeMemberAccess,
//     i_childrenToCreate : ["operand"],
//     i_childrenToExecute : ["operand"],

//     i_createFromAST : function(ast, context) {
//         Dot._parent.i_createFromAST.apply(this, arguments);
//         this.memberName = ast.member.identifier;
//     },

//     compile : function(compilationContext) {
//         this.i_paramTypes = compilationContext && compilationContext.paramTypes;
//         Expressions.Dot._parent.compile.apply(this, arguments);
//     },

//     typeCheck : function(){
//         if (!isA(this.operand.type, Types.Class)) {
//             this.addNote(CPPError.expr.dot.class_type(this));
//             return false;
//         }

//         // Find out what this identifies
//         try {
//             this.entity = this.operand.type.classScope.requiredMemberLookup(this.memberName, {paramTypes: this.i_paramTypes, isThisConst:this.operand.type.isConst});
//             this.type = this.entity.type;
//         }
//         catch(e){
//             if (isA(e, SemanticExceptions.BadLookup)){
//                 // this.addNote(CPPError.expr.dot.memberLookup(this, this.operand.type, this.memberName));
//                 // TODO: why is this commented?
//                 this.addNote(e.annotation(this));
//             }
//             else{
//                 throw e;
//             }
//         }

//         if (isA(this.type, Types.Reference)){
//             this.type = this.type.refTo;
//             this.valueCategory = "lvalue";
//         }
//         else if (this.operand.valueCategory === "lvalue"){
//             this.valueCategory = "lvalue";
//         }
//         else{
//             this.valueCategory = "xvalue";
//         }
//     },

//     upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index === "subexpressions"){
//             return Expression.upNext.apply(this, arguments);
//         }
//         else{
//             // entity may be MemberVariableEntity but should never be an AutoEntity
//             assert(!isA(this.entity, AutoEntity));
//             inst.setObjectAccessedFrom(inst.childInstances.operand.evalResult);
//             inst.setEvalResult(this.entity.runtimeLookup(sim, inst));
//             this.done(sim, inst);
//             return true;
//         }
//     },

//     isTailChild : function(child){
//         return {isTail: false,
//             reason: "The dot operation itself will happen after the recursive call returns.",
//             others: [this]
//         };
//     }
// });



// export var Arrow  = Expression.extend({
//     _name: "Arrow",
//     i_runtimeConstructClass : RuntimeMemberAccess,
//     valueCategory: "lvalue",
//     i_childrenToCreate : ["operand"],
//     i_childrenToConvert : {
//         operand : Types.Pointer.instance()
//     },
//     i_childrenToExecute : ["operand"],

//     i_createFromAST : function(ast, context) {
//         Arrow._parent.i_createFromAST.apply(this, arguments);
//         this.memberName = ast.member.identifier;
//     },

//     compile : function(compilationContext) {
//         this.i_paramTypes = compilationContext && compilationContext.paramTypes;
//         Expressions.Dot._parent.compile.apply(this, arguments);
//     },

//     typeCheck : function(){
//         if (!isA(this.operand.type, Types.Pointer) || !isA(this.operand.type.ptrTo, Types.Class)) {
//             this.addNote(CPPError.expr.arrow.class_pointer_type(this));
//             return false;
//         }

//         // Find out what this identifies
//         try{
//             this.entity = this.operand.type.ptrTo.classScope.requiredMemberLookup(this.memberName, {paramTypes: this.i_paramTypes, isThisConst:this.operand.type.ptrTo.isConst});
//             this.type = this.entity.type;
//         }
//         catch(e){
//             if (isA(e, SemanticExceptions.BadLookup)){
//                 this.addNote(CPPError.expr.arrow.memberLookup(this, this.operand.type.ptrTo, this.memberName));
//                 // this.addNote(e.annotation(this));
//             }
//             else{
//                 throw e;
//             }
//         }
//     },

//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){

//         if (inst.index == "operate"){
//             var addr = inst.childInstances.operand.evalResult;
//             if (Types.Pointer.isNull(addr.rawValue())){
//                 sim.crash("Ow! Your code just tried to use the arrow operator on a null pointer!");
//             }
//             inst.setObjectAccessedFrom(sim.memory.dereference(addr, this.operand.type.ptrTo));
//             inst.setEvalResult(this.entity.runtimeLookup(sim, inst));

//             this.done(sim, inst);
//             return true;
//         }
//     },

//     isTailChild : function(child){
//         return {isTail: false,
//             reason: "The arrow operation itself will happen after the recursive call returns.",
//             others: [this]
//         };
//     }
// });




// export var PREDEFINED_FUNCTIONS = {
//     rand : function(args, sim, inst){
//         return Value.instance(Math.floor(sim.nextRandom() * 32767), Types.Int.instance());
//     },
//     "assert" : function(args, sim, inst){
//         if(!args[0].evalResult.value){
//             sim.assertionFailure("Yikes! An assert failed! <br /><span class='code'>" + inst.model.getSourceText() + "</span> on line " + inst.model.getSourceText() + ".");
//         }
//         return Value.instance("", Types.Void.instance());
//     },
//     "pause" : function(args, sim, inst){
//         sim.pause();
//         return Value.instance("", Types.Void.instance());
//     },
//     "pauseIf" : function(args, sim, inst){
//         if(args[0].evalResult.value){
//             sim.pause();
//         }
//         return Value.instance("", Types.Void.instance());
//     }
// };


// TODO: move FunctionCall to its own module
// TODO: FunctionCall should not extend Expression

export class FunctionCall extends InstructionConstruct {
    
    public readonly func: FunctionEntity;
    public readonly receiver: ObjectEntity<ClassType>?;
    public readonly args: TypedExpression<ObjectType>[];
    public readonly argInitializers: CopyInitializer[];

    public readonly isRecursive: boolean;

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
    private constructor(context: ExecutableConstructContext, func: FunctionEntity, args: (TypedExpression<ObjectType>)[], receiver: ObjectEntity<ClassType>? = null) {
        super(context);

        this.func = func;
        this.args = clone(args);
        this.receiver = receiver;

        // Create initializers for each argument/parameter pair
        this.argInitializers = args.map((arg, i) => {
            return DirectInitializer.create(context, new ParameterEntity(arg.type, i), [arg]);
        });

        // TODO
        // this.isRecursive = this.func.definition === this.context.containingFunction;

        let returnType = this.func.type.returnType

        if (isA(this.type, Types.Reference)){
            this.returnByReference = true;
            this.valueCategory = "lvalue";
            // Adjust to T from reference to T
            this.type = this.type.refTo;
        }
        else {
            this.valueCategory = "prvalue";
            if (!isA(this.type, Types.Void)){
                this.returnByValue = true;
            }
        }


        // Check that we have the right number of parameters
        // Note: at the moment, this is not already "checked" by name lookup / overload resolution
        // TODO: I'm pretty sure this comment no longer applies, but I guess I should check
        if (this.argInitializers.length !== this.func.type.paramTypes.length){
            this.addNote(CPPError.expr.functionCall.numParams(this));
            return;
        }

        // Parameter passing is done by copy initialization, so create initializers.
        this.argInitializers.forEach(function(argInit, i) {
            argInit.compile(ParameterEntity.instance(self.func,i));
            argInit.initIndex = "afterChildren"; // These initializers expect their expression to already be evaluated
        });

        if (!isA(this.func.definition, MagicFunctionDefinition)){
            // If we are returning by value, then we need to create a temporary object to copy-initialize.
            // If we are returning by reference, the return object for inst.func will be bound to what we return.
            // Temporary references do not use extra space and won't be automatically destructed.
            if (!this.returnByReference && !isA(this.type, Types.Void)){
                this.returnObjectEntity = this.createTemporaryObject(this.func.type.returnType, (this.func.name || "unknown") + "() [return]");
            }

            if (!this.i_isMainCall && !this.isAuxiliary()){
                // Register as a function call in our function context
                this.containingFunction().calls.push(this); // TODO modifying calls is rude here. Instead have the containing function attach it

                // Register as a call in the translation unit (this is used during the linking process later)
                this.i_translationUnit.registerFunctionCall(this);
            }
        }

        return Expression.compile.apply(this, arguments);
    },

    checkLinkingProblems : function(){
        if (!this.func.isLinked()){
            if (this.func.isLibraryUnsupported()) {
                var note = CPPError.link.library_unsupported(this, this.func);
            }
            else {
                var note = CPPError.link.def_not_found(this, this.func);
            }
            this.addNote(note);
            return note;
        }
        return null;
    },

    tailRecursionCheck : function(){
        if (this.isTail !== undefined) {
            return;
        }

        var child = this;
        var parent = this.parent;
        var isTail = true;
        var reason = null;
        var others = [];
        var first = true;
        while(!isA(child, FunctionDefinition) && !isA(child, Statements.Return)) {
            var result = parent.isTailChild(child);
            if (!result.isTail) {
                isTail = false;
                reason = result.reason;
                others = result.others || [];
                break;
            }

            //if (!first && child.tempDeallocator){
            //    isTail = false;
            //    reason = "The full expression containing this recursive call has temporary objects that need to be deallocated after the call returns.";
            //    others = [];
            //    break;
            //}
            //first = false;


            reason = reason || result.reason;

            child = parent;
            parent = child.parent;
        }

        this.isTail = isTail;
        this.isTailReason = reason;
        this.isTailOthers = others;
        //this.containingFunction().isTailRecursive = this.containingFunction().isTailRecursive && isTail;

        this.canUseTCO = this.isRecursive && this.isTail;
    },

    createInstance : function(sim, parent, receiver){
        var inst = Expression.createInstance.apply(this, arguments);

        // For function pointers. It's a hack!
        if (parent && parent.pointedFunction) {
            inst.pointedFunction = parent.pointedFunction;
        }

        var funcDecl = inst.funcDeclModel = this.func.runtimeLookup(sim, inst).definition;

        if (isA(funcDecl, MagicFunctionDefinition)){
            return inst; //nothing more to do
        }

        if (this.canUseTCO){
            inst.func = inst.containingRuntimeFunction();
            //funcDecl.tailCallReset(sim, inst.func); // TODO why was this ever here?
            //inst.send("tailCalled", inst.func);
        }
        else{
            inst.func = funcDecl.createInstance(sim, inst);
            //inst.send("called", inst.func);
        }

        // Receiver should not be specified both at compile time and at runtime.
        // (Note it may not be specified at all yet)
        assert(!(receiver && this.receiver));
        if (receiver) {
            inst.func.setReceiver(receiver.runtimeLookup(sim, inst)); // TODO: remove the runtimeLookup when overloads are fixed so that they set the receiver as an object, not a runtime entity thing
        }
        else if (this.receiver) {
            inst.func.setReceiver(this.receiver.runtimeLookup(sim, inst));
        }
        // else there is no receiver i.e. a non-member function

        // Create argument initializer instances
        inst.argInits = this.argInitializers.map(function(argInit){
            argInit = argInit.createInstance(sim, inst);
            return argInit;
        });
        inst.func.model.setArguments(sim, inst.func, inst.argInits);

        if (this.canUseTCO) {
            // If we are using TCO, don't create a new return object. Just use the already existing one from the function.
            // NEW: since we just get it here, then assign it to our own inst.returnObject, I think this is unnecessary
            // since in the rest of the code I'm getting rid of our own inst.returnObject and always just going to
            // use funcDecl.getReturnObject(sim, inst.func)
            // inst.returnObject = inst.func.model.getReturnObject(sim, inst.func);
        }
        else{
            // If we are NOT using TCO, we need to create the return object.
            if (this.returnByValue) {
                // Return by value, create the instance of the returnObject and give it to the function we're calling.
                funcDecl.setReturnObject(sim, inst.func, this.returnObjectEntity.objectInstance(inst));
            }
            else if (this.returnByReference) {
                // UPDATE: Return by reference doesn't use a faked reference entity anymore. Instead, there is simply
                // no return object initially and then when the ReturnInitializer does its thing, it sets the return object.
            }
            // else it was void, so no need to set a return object
        }

        return inst;
    },

    upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        var self = this;
        if (inst.index === "arguments"){

            // If it's a magic function, just push expressions
            if (isA(inst.funcDeclModel, MagicFunctionDefinition)){
                inst.args = this.argInitializers.map(function(argInit){
                    return argInit.args[0].createAndPushInstance(sim, argInit.createInstance(sim, inst));
                });
            }
            else{
                // Push the expressions that evaluate our arguments.
                for(var i = this.argInitializers.length-1; i >= 0; --i){
                    this.argInitializers[i].pushChildInstances(sim, inst.argInits[i]); // expressions are children of initializers
                }
            }

            inst.index = "call";

            return true;
        }
        else if (inst.index == "return"){
            // Unless return type is void, we will have a return object
            if (this.returnByReference) {
                inst.setEvalResult(inst.funcDeclModel.getReturnObject(sim, inst.func).runtimeLookup(sim, inst)); // lookup here in case its a reference
            }
            else if (this.returnByValue){
                if (isA(this.type, Types.Class)) {
                    inst.setEvalResult(inst.funcDeclModel.getReturnObject(sim, inst.func).runtimeLookup(sim, inst));
                }
                else{
                    inst.setEvalResult(inst.funcDeclModel.getReturnObject(sim, inst.func).runtimeLookup(sim, inst).getValue());
                }
            }
            else {
                // nothing to do it must be void
                inst.setEvalResult(Value.instance("", Types.Void.instance()));
            }

            inst.func.loseControl();
            // TODO: for now, this if is a HACK to deal with the fact that the main function call has no containing function
            // That will eventually be changed, and then this won't be necessary anymore
            if (inst.containingRuntimeFunction()) {
                inst.containingRuntimeFunction().gainControl();
            }

            this.done(sim, inst);
            return true;
        }
    },

    stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        //if (this.func && this.func.decl && this.func.decl.isImplicit()){
        //    setTimeout(function(){
        //        while (inst.isActive){
        //            sim.stepForward();
        //        }
        //    },0);
        //}
        if (inst.index == "call"){

            // Handle magic functions as special case
            if (isA(inst.funcDeclModel, MagicFunctionDefinition)){
                var preFn = PREDEFINED_FUNCTIONS[inst.funcDeclModel.name];
                assert(preFn, "Cannot find internal implementation of magic function.");

                // Note: magic functions just want args, not initializers (because they're magic!)
                inst.setEvalResult(preFn(inst.args, sim, inst));
                this.done(sim, inst);
                return false;
            }

            if (inst.func.receiver) {
                inst.func.receiver.callReceived();
            }



            if (this.canUseTCO){
                inst.funcDeclModel.tailCallReset(sim, inst.func, inst);
                inst.send("tailCalled", inst.func);
            }
            else{
                // Push the stack frame
                inst.func.pushStackFrame();

                sim.push(inst.func);

                // TODO: for now, this if is a HACK to deal with the fact that the main function call has no containing function
                // That will eventually be changed, and then this won't be necessary anymore
                if (inst.containingRuntimeFunction()) {
                    inst.containingRuntimeFunction().loseControl();
                }
                inst.func.gainControl();
                inst.send("called", inst.func);
                inst.hasBeenCalled = true;
            }

            // Push initializers for function arguments, unless magic function
            for (var i = inst.argInits.length-1; i >= 0; --i){
                sim.push(inst.argInits[i]);
            }

            inst.index = "return";
        }
    },

    isTailChild : function(child){
        return {isTail: false,
            reason: "A quick rule is that a function call can never be tail recursive if it is an argument to another function call. The outer function call will always happen afterward!",
            others: [this]
        };
    },

    // TODO: what is this? should it be describeEvalResult? or explain? probably not just describe since that is for objects
    describe : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        var desc = {};
        desc.message = "a call to " + this.func.describe(sim).message;
        return desc;
    }
});

export var FunctionCallExpression  = Expression.extend({
    _name: "FunctionCallExpression",
    initIndex: "operand",

    i_createFromAST : function(ast, context) {
        FunctionCallExpression._parent.i_createFromAST.apply(this, arguments);
        this.operand = this.i_createChild(ast.operand);
    },

    compile : function() {
        var self = this;

        // Need to select function, so have to compile auxiliary arguments
        var auxArgs = this.ast.args.map(function(arg){
            var auxArg = CPPConstruct.create(arg, {parent: self, auxiliary: true});
            auxArg.tryCompile();
            return auxArg;
        });

        // If we already have errors from any auxiliary arguments, we cannot recover
        if (auxArgs.some(function(auxArg) {return auxArg.hasErrors()})){
            // Add the notes from the auxiliary arguments (they weren't added normally since they were auxiliary)
            auxArgs.forEach(function(auxArg){
                auxArg.getNotes().forEach(function(note) {
                    self.addNote(note);
                });
            });
            return;
        }

        var argTypes = auxArgs.map(function(arg){
            return arg.type;
        });

        this.operand.compile({paramTypes: argTypes});

        if (this.hasErrors()){
            return;
        }

        this.bindFunction(argTypes);

        if (this.hasErrors()){
            return;
        }

        var funcCall = this.funcCall = FunctionCall.instance({args: this.ast.args}, {parent:this});
        funcCall.compile({func: this.boundFunction});

        this.type = funcCall.type;
        this.valueCategory = funcCall.valueCategory;

        return Expression.compile.apply(this, arguments);
    },

    bindFunction : function(argTypes){
        var self = this;
        if (isA(this.operand.type, Types.Class)){
            // Check for function call operator and if so, find function
            // TODO: I think this breaks given multiple overloaded function call operators?

            try{
                this.callOp = this.operand.type.classScope.requiredMemberLookup("operator()", {paramTypes:argTypes, isThisConst: this.operand.type.isConst});
                this.boundFunction = this.callOp;
                this.type = noRef(this.callOp.type.returnType);
            }
            catch(e){
                if (isA(e, SemanticExceptions.BadLookup)){
                    this.addNote(CPPError.expr.functionCall.not_defined(this, this.operand.type, argTypes));
                    this.addNote(e.annotation(this));
                }
                else{
                    throw e;
                }
            }
        }
        else if (isA(this.operand.entity, FunctionEntity)){ // TODO: use of entity property here feels hacky
            // If it's an identifier, dot, arrow, etc. that denote an entity - just bind that
            this.staticFunction = this.operand.entity;
            this.staticFunctionType = this.staticFunction.type;
            this.boundFunction = this.operand.entity;
        }
        else if (isA(this.operand.type, Types.Pointer) && isA(this.operand.type.ptrTo, Types.Function)){
            this.staticFunctionType = this.operand.type.ptrTo;
            this.boundFunction = PointedFunctionEntity.instance(this.operand.type.ptrTo);
            this.operand = convertToPRValue(this.operand);
        }
        else if (isA(this.operand.type, Types.Function)){
            this.staticFunctionType = this.operand.type;
            this.boundFunction = PointedFunctionEntity.instance(this.operand.type);
        }
        else{
            this.addNote(CPPError.expr.functionCall.operand(this, this.operand));
        }

    },

    upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
        if (inst.index === "operand") {
            inst.operand = this.operand.createAndPushInstance(sim, inst);
            inst.index = "call";
            return true;
        }
        else if (inst.index === "call"){
            // If it's a function pointer, set info for evaluated operand function entity
            // TODO: 2nd part of OR is a hack to detect functions generated from function pointers
            // This is here because I don't have the expression attempt to implicitly convert its operand
            // to a function pointer. A cleaner implementation might be to include the conversion, but make
            // it not animate in most cases (since that would be annoying)
            if (isA(this.operand.type, Types.Pointer) && isA(this.operand.type.ptrTo, Types.Function) ||
                    !isA(this.operand.entity, FunctionEntity)){
                inst.pointedFunction = inst.operand.evalResult.rawValue();
            }
            // TODO: hack on next line has || inst.operand.evalResult
            // TODO: remember why that's a hack and not just the right thing to do
            if (isA(this.boundFunction, MemberFunctionEntity)) {
                if (isA(this.operand.type, Types.Class)) {
                    inst.funcCall = this.funcCall.createAndPushInstance(sim, inst, inst.operand.evalResult);
                }
                else {
                    inst.funcCall = this.funcCall.createAndPushInstance(sim, inst, inst.operand.contextualReceiver());
                }
            }
            else {
                inst.funcCall = this.funcCall.createAndPushInstance(sim, inst);
            }
            inst.wait();
            inst.index = "done";
            return true;
        }
        else {
            inst.setEvalResult(inst.funcCall.evalResult);
            this.done(sim, inst);
        }
        return true;
    },

    isTailChild : function(child){
        return {isTail: child === this.funcCall
        };
    }
});


// export var StaticCast = Unsupported.extend({
//     _name: "StaticCast",
//     englishName: "static_cast"
// });
// export var DynamicCast = Unsupported.extend({
//     _name: "DynamicCast",
//     englishName: "dynamic_cast"
// });
// export var ReinterpretCast = Unsupported.extend({
//     _name: "ReinterpretCast",
//     englishName: "reinterpret_cast"
// });
// export var ConstCast = Unsupported.extend({
//     _name: "ConstCast",
//     englishName: "const_cast"
// });
// export var Cast = Unsupported.extend({
//     _name: "Cast",
//     englishName: "C-Style Cast"
// });





// export var NewExpression = Expression.extend({
//     _name: "NewExpression",
//     valueCategory: "prvalue",
//     initIndex: "allocate",
//     compile : function(){

//         // Compile the type specifier
//         this.typeSpec = TypeSpecifier.instance(this.ast.specs, {parent:this});
//         this.typeSpec.compile();

//         this.heapType = this.typeSpec.type;

//         // Compile declarator if it exists
//         if(this.ast.declarator) {
//             this.declarator = Declarator.instance(this.ast.declarator, {parent: this});
//             this.declarator.compile({baseType: this.heapType});
//             this.heapType = this.declarator.type;
//         }

//         if (isA(this.heapType, Types.Array)){
//             // Note: this is Pointer, rather than ArrayPointer, since the latter should only be used in runtime contexts
//             this.type = Types.Pointer.instance(this.heapType.elemType);
//             if (this.declarator.dynamicLengthExpression){
//                 this.dynamicLength = this.i_createAndCompileChildExpr(this.declarator.dynamicLengthExpression, Types.Int.instance());
//                 this.initIndex = "length";
//             }
//         }
//         else {
//             this.type = Types.Pointer.instance(this.heapType);
//         }

//         var entity = NewObjectEntity.instance(this.heapType);

//         var initCode = this.ast.initializer || {args: []};
//         if (isA(this.heapType, Types.Class) || initCode.args.length == 1){
//             this.initializer = NewDirectInitializer.instance(initCode, {parent: this});
//             this.initializer.compile(entity);
//         }
//         else if (initCode.args.length == 0){
//             this.initializer = NewDefaultInitializer.instance(initCode, {parent: this});
//             this.initializer.compile(entity);
//         }
//         else{
//             this.addNote(CPPError.declaration.init.scalar_args(this, this.heapType));
//         }

//         this.compileTemporarires();
//     },


//     createInstance : function(sim, parent){
//         var inst = Expression.createInstance.apply(this, arguments);
//         inst.initializer = this.initializer.createInstance(sim, inst);
//         return inst;
//     },

//     upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index === "length"){
//             inst.dynamicLength = this.dynamicLength.createAndPushInstance(sim, inst);
//             inst.index = "allocate";
//             return true;
//         }
//         else if (inst.index === "init"){
//             sim.push(inst.initializer);
//             inst.index = "operate";
//             return true;
//         }
//     },

//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){

//         // Dynamic memory - doesn't get added to any scope, but we create on the heap

//         if (inst.index === "allocate") {
//             var heapType = this.heapType;

//             // If it's an array, we need to use the dynamic length
//             if (this.dynamicLength) {
//                 var len = inst.dynamicLength.evalResult.rawValue();
//                 if (len === 0){
//                     sim.alert("Sorry, but I can't allocate a dynamic array of zero length. I know there's technically an old C-style hack that uses zero-length arrays, but hey, I'm just a lobster. I'll go ahead and allocate an array of length 1 instead.");
//                     len = 1;
//                 }
//                 else if (len < 0){
//                     sim.undefinedBehavior("I can't allocate an array of negative length. That doesn't even make sense. I'll just allocate an array of length 1 instead.");
//                     len = 1;
//                 }
//                 heapType = Types.Array.instance(this.heapType.elemType, len);
//             }

//             var obj = DynamicObject.instance(heapType);

//             sim.memory.heap.allocateNewObject(obj);
//             sim.i_pendingNews.push(obj);
//             inst.i_allocatedObject = obj;
//             inst.initializer.setAllocatedObject(obj);
//             inst.index = "init"; // Always use an initializer. If there isn't one, then it will just be default
//             //if (this.initializer){
//             //    inst.index = "init";
//             //}
//             //else{
//             //    inst.index = "operate";
//             //}
//             //return true;
//         }
//         else if (inst.index === "operate") {
//             if (isA(this.heapType, Types.Array)){
//                 // RTTI for array pointer
//                 inst.setEvalResult(Value.instance(inst.i_allocatedObject.address, Types.ArrayPointer.instance(inst.i_allocatedObject)));
//             }
//             else{
//                 // RTTI for object pointer
//                 inst.setEvalResult(Value.instance(inst.i_allocatedObject.address, Types.ObjectPointer.instance(inst.i_allocatedObject)));
//             }
//             sim.i_pendingNews.pop();
//             this.done(sim, inst);
//         }

//     },
//     explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (this.initializer){
//             return {message: "A new object of type " + this.heapType.describe().name + " will be created on the heap. " + this.initializer.explain(sim, inst.initializer).message};
//         }
//         else{
//             return {message: "A new object of type " + this.heapType.describe().name + " will be created on the heap."};
//         }
//     }
// });




// export var Delete  = Expression.extend({
//     _name: "Delete",
//     valueCategory: "prvalue",
//     type: Types.Void.instance(),
//     i_childrenToCreate : ["operand"],
//     i_childrenToConvert : {
//         "operand" : Types.Pointer.instance()
//     },
//     i_childrenToExecute : ["operand"],

//     typeCheck : function(){

//         if (isA(this.operand.type.ptrTo, Types.Class)){
//             var classType = this.operand.type.ptrTo;
//             var dest = classType.destructor;
//             //TODO not found and ambiguous
//             if (isA(dest, FunctionEntity)){
//                 //this.assnOp = assnOp;
//                 //this.type = noRef(assnOp.type.returnType);
//                 // Attempt standard conversion of rhs to match lhs, without lvalue to rvalue
//                 //this.rhs = this.sub.rhs = standardConversion(this.rhs, this.lhs.type, {suppressLTR:true});

//                 this.funcCall = this.funcCall = FunctionCall.instance({args: []}, {parent:this});
//                 this.funcCall.compile({func: dest});
//                 this.type = this.funcCall.type;
//             }
//             else{
//                 this.addNote(CPPError.expr.delete.no_destructor(this, classType));
//             }
//         }

//         // Type check
//         if (!isA(this.operand.type, Types.Pointer)) {
//             this.addNote(CPPError.expr.delete.pointer(this, this.operand.type));
//         }
//         else if (!this.operand.type.ptrTo.isObjectType){
//             this.addNote(CPPError.expr.delete.pointerToObjectType(this, this.operand.type));
//         }
//     },
//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){

//         if (!inst.alreadyDestructed){
//             var ptr = inst.childInstances.operand.evalResult;
//             if (Types.Pointer.isNull(ptr.rawValue())){
//                 this.done(sim, inst);
//                 return;
//             }

//             // If it's an array pointer, just grab array object to delete from RTTI.
//             // Otherwise ask memory what object it's pointing to.
//             var obj;
//             if (isA(ptr.type, Types.ArrayPointer)){
//                 obj = ptr.type.arrObj;
//             }
//             else{
//                 obj = sim.memory.dereference(ptr);
//             }

//             if (!isA(obj, DynamicObject)) {
//                 if (isA(obj, AutoObject)) {
//                     sim.undefinedBehavior("Oh no! The pointer you gave to <span class='code'>delete</span> was pointing to something on the stack!");
//                 }
//                 else {
//                     sim.undefinedBehavior("Oh no! The pointer you gave to <span class='code'>delete</span> wasn't pointing to a valid heap object.");
//                 }
//                 this.done(sim, inst);
//                 return;
//             }

//             if (isA(obj.type, Types.Array)){
//                 sim.undefinedBehavior("You tried to delete an array object with a <span class='code'>delete</span> expression. Did you forget to use the delete[] syntax?");
//                 this.done(sim, inst);
//                 return;
//             }

//             //if (!similarType(obj.type, this.operand.type.ptrTo)) {
//             //    sim.alert("The type of the pointer you gave to <span class='code'>delete</span> is different than the type of the object I found on the heap - that's a bad thing!");
//             //    this.done(sim, inst);
//             //    return;
//             //}

//             if (!obj.isAlive()) {
//                 DeadObjectMessage.instance(obj, {fromDelete:true}).display(sim, inst);
//                 this.done(sim, inst);
//                 return;
//             }

//             inst.alreadyDestructed = true;
//             if(this.funcCall){
//                 // Set obj as receiver for virtual destructor lookup
//                 var dest = this.funcCall.createAndPushInstance(sim, inst, obj);
//             }
//             else{
//                 return true;
//             }
//         }
//         else{
//             var deleted = sim.memory.heap.deleteObject(inst.childInstances.operand.evalResult.value, inst);
//             this.done(sim, inst);
//         }

//     },

//     isTailChild : function(child){
//         return {isTail: false,
//             reason: "The delete operation will happen after the recursive call returns.",
//             others: [this]
//         };
//     }
// });

// //TODO: move to runtimeEnvironment or memory js modules?
// /**
//  *
//  * @param sim
//  * @param inst
//  * @param {Value | CPPObject} ptr
//  * @returns {CPPObject?}
//  */
// var deleteHeapArray = function(sim: Simulation, rtConstruct: RuntimeConstruct, ptr) {
//     if(Types.Pointer.isNull(ptr.rawValue())){
//         return;
//     }

//     // If it's an array pointer, just grab array object to delete from RTTI.
//     // Otherwise ask memory what object it's pointing to.
//     var obj;
//     if (isA(ptr.type, Types.ArrayPointer)){
//         obj = ptr.type.arrObj;
//         // if the address is not the same, it means we're deleting through an array pointer,
//         // but not one that is pointing to the beginning of the array. this causes undefined behavior
//         if (ptr.rawValue() !== obj.address) {
//             sim.undefinedBehavior("It looks like you used <span class='code'>delete[]</span> on a pointer to an array, but it wasn't pointing at the beginning of the array as is required for <span class='code'>delete[]</span>. This causes undefined behavior!");
//         }
//     }
//     else{
//         obj = sim.memory.dereference(ptr);
//     }

//     // Check to make sure we're deleting a valid heap object.
//     if (!isA(obj, DynamicObject)) {
//         if (isA(obj, AutoObject)) {
//             sim.undefinedBehavior("Oh no! The pointer you gave to <span class='code'>delete[]</span> was pointing to something on the stack!");
//         }
//         else {
//             sim.undefinedBehavior("Oh no! The pointer you gave to <span class='code'>delete[]</span> wasn't pointing to a valid heap object.");
//         }
//         return;
//     }

//     if (!isA(obj.type, Types.Array)) {
//         sim.undefinedBehavior("You tried to delete a non-array object with a <span class='code'>delete[]</span> expression. Oops!");
//         return;
//     }

//     //if (!similarType(obj.type.elemType, this.operand.type.ptrTo)) {
//     //    sim.alert("The type of the pointer you gave to <span class='code'>delete</span> is different than the element type of the array object I found on the heap - that's a bad thing!");
//     //    this.done(sim, inst);
//     //    return;
//     //}

//     if (!obj.isAlive()) {
//         DeadObjectMessage.instance(obj, {fromDelete:true}).display(sim, inst);
//         return;
//     }

//     return sim.memory.heap.deleteObject(ptr.rawValue(), inst);
// };

// // TODO: liskov suggests this shouldn't be a subtype. Use has-a instead?
// export var DeleteArray = Delete.extend({
//     _name: "DeleteArray",

//     stepForward: function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var ptr = inst.childInstances.operand.evalResult;
//         deleteHeapArray(sim, inst, ptr);
//         this.done(sim, inst);
//     },

//     isTailChild : function(child){
//         return {isTail: false,
//             reason: "The delete[] operation will happen after the recursive call returns.",
//             others: [this]
//         };
//     }
// });

// // TODO: This appears to work but I'm pretty sure I copy/pasted from NewExpression and never finished changing it.
// export var ConstructExpression = Expression.extend({
//     _name: "ConstructExpression",
//     valueCategory: "prvalue",
//     initIndex: "init",
//     compile : function(){

//         // Compile the type specifier
//         this.typeSpec = TypeSpecifier.instance([this.ast.type], {parent:this});
//         this.typeSpec.compile();

//         this.type = this.typeSpec.type;

//         // Compile declarator if it exists
//         if(this.ast.declarator) {
//             this.declarator = Declarator.instance(this.ast.declarator, {parent: this});
//             this.declarator.compile({baseType: this.heapType});
//             this.heapType = this.declarator.type;
//         }

//         this.entity = this.createTemporaryObject(this.type, "[temp " + this.type + "]");

//         if (isA(this.type, Types.Class) || this.ast.args.length == 1){
//             this.initializer = DirectInitializer.instance(this.ast, {parent: this});
//             this.initializer.compile(this.entity);
//         }
//         else{
//             this.addNote(CPPError.declaration.init.scalar_args(this, this.type));
//         }

//         this.compileTemporarires();
//     },

//     createInstance : function(sim, parent){
//         var inst = Expression.createInstance.apply(this, arguments);
//         inst.tempObject = this.entity.objectInstance(inst);
//         return inst;
//     },

//     upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index === "init"){
//             var initInst = this.initializer.createAndPushInstance(sim, inst);
//             inst.index = "done";
//             return true;
//         }
//         else{
//             if (isA(this.type, Types.class)){
//                 inst.setEvalResult(inst.tempObject);
//             }
//             else{
//                 inst.setEvalResult(inst.tempObject.readValue());
//             }
//             this.done(sim, inst);
//         }
//     }


// });



var identifierToText = function(qualId){
    if (Array.isArray(qualId)){ // If it's actually a qualified id
        return qualId.reduce(function(str,id,i){
            return str + (i > 0 ? "::" : "") + id.identifier;
        },"");
    }
    else{
        return qualId; // If it's an unqualified id
    }
};

export class Identifier extends Expression {

    public readonly entity: CPPEntity; // TODO: should this be NamedEntity? Does it make a difference?

    _name: "Identifier",
    valueCategory: "lvalue",
    initIndex: false,
    qualifiedNameString : function(names){
        if (!Array.isArray(names)){
            return names;
        }
        return names.map(function(id){return id.identifier}).join("::")
    },
    i_createFromAST: function(ast, context){

        Identifier._parent.i_createFromAST.apply(this, arguments);
        this.identifier = this.ast.identifier;
        this.identifierText = identifierToText(this.identifier);
    },

    compile : function(compilationContext) {
        this.i_paramTypes = compilationContext && compilationContext.paramTypes;
        Expressions.Identifier._parent.compile.apply(this, arguments);
    },

    typeCheck : function(){
        checkIdentifier(this, this.identifier, this);

		try{
            this.entity = this.contextualScope.requiredLookup(this.identifier, {paramTypes: this.i_paramTypes, isThisConst:this.containingFunction().type.isThisConst});

            if(isA(this.entity, CPPEntity)) {
                this.type = this.entity.type;
                if(isA(this.type, Types.IStream)){
                    this.addNote(CPPError.other.cin_not_supported(this));
                }
            }

            if (isA(this.type, Types.Reference)){
                this.type = this.type.refTo;
            }
        }
        catch(e){
            if (isA(e, SemanticExceptions.BadLookup)){
                this.addNote(e.annotation(this));
            }
            else{
                throw e;
            }
        }

	},

    upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        inst.setEvalResult(this.entity.runtimeLookup(sim, inst));

        this.done(sim, inst);
        return true;
    },

    describeEvalResult : function(depth, sim, inst){
        if (inst && inst.evalResult){
            return inst.evalResult.describe();
        }
        // Note don't care about depth since we always just use identifier
        else{
            return this.entity.describe(sim, inst);
        }
    },

    explain : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
        return {message: this.entity.name};
    }
}




// export var ThisExpression  = Expression.extend({
//     _name: "ThisExpression",
//     valueCategory: "prvalue",
//     compile : function(){
//         var func = this.containingFunction();
//         if (func.isMemberFunction){
//             this.type = Types.Pointer.instance(func.receiverType);
//         }
//         else{
//             this.addNote(CPPError.expr.thisExpr.memberFunc(this));
//         }
//     },
//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         // Set this pointer with RTTI to point to receiver
//         inst.setEvalResult(Value.instance(inst.contextualReceiver().address, Types.ObjectPointer.instance(inst.contextualReceiver())));
//         this.done(sim, inst);
//     }
// });

export var EntityExpression  = Expression.extend({
    _name: "EntityExpression",
    valueCategory: "lvalue",
    init : function(entity, ast, context){
        this.initParent(ast, context);
        this.entity = entity;
        this.type = this.entity.type;
    },
    compile : function(){

    },
    upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        inst.setEvalResult(this.entity.runtimeLookup(sim, inst));
        this.done(sim, inst);
    }
});



export var AuxiliaryExpression  = Expression.extend({
    _name: "AuxiliaryExpression",
    valueCategory: "prvalue",
    init : function(type){
        this.initParent(null, null);
        this.type = type
    },
    compile : function(){
        // Do nothing
    }
});





var parseCPPChar = function(litValue){
    return Util.escapeString(litValue).charCodeAt(0);
};

var literalJSParse = {
	"int": parseInt,
	"float": parseFloat,
    "double": parseFloat,
    "bool" : function(b) {return b ? 1 : 0;},
    "char": parseCPPChar,
    "string": Util.escapeString // TODO: is this still used?
};
var literalTypes = {
	"int": Types.Int.instance(),
	"float": Types.Double.instance(),
	"double": Types.Double.instance(),
    "bool": Types.Bool.instance(),
    "char" : Types.Char.instance()
};

export class Literal extends Expression {
    _name: "Literal",
    initIndex: false,
    compile : function(){

		
		var conv = literalJSParse[this.ast.type];
		var val = (conv ? conv(this.ast.value) : this.ast.value);
		
		var typeClass = literalTypes[this.ast.type];
        this.type = typeClass;

        this.value = Value.instance(val, this.type);  //TODO fix this (needs type?)
        this.valueCategory = "prvalue";
	},

    upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        inst.evalResult = this.value;
        this.done(sim, inst);
        return true;
    },

    describeEvalResult : function(depth, sim, inst){
        var str = this.value.toString();
        return {name: str, message: str};
    }
	
//	stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//		this.done(sim, inst);
//		return true;
//	}
});

// export class StringLiteral extends Expression {
//     public valueCategory: string;
//     public type: Type;
//     public createRuntimeExpression(parent: RuntimeConstruct<ExecutableConstruct>): RuntimeExpressionBase<Expression> {
//         throw new Error("Method not implemented.");
//     }
//     public describeEvalResult(depth: number): Description {
//         throw new Error("Method not implemented.");
//     }
//     _name: "StringLiteral",
//     initIndex: false,
//     compile : function(){

//         var conv = literalJSParse[this.ast.type];
//         var val = (conv ? conv(this.ast.value) : this.ast.value);

//         this.i_stringEntity = StringLiteralEntity.instance(val);
//         this.translationUnit.addStringLiteral(this.i_stringEntity);
//         this.i_isStringLiteral = true;
//         this.i_stringValue = val;
//         this.type = this.i_stringEntity.type;
//         this.valueCategory = "lvalue";

//     },

//     upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         inst.evalResult = this.i_stringEntity.runtimeLookup(sim, inst);
//         this.done(sim, inst);
//         return true;
//     },

//     describeEvalResult : function(depth, sim, inst){
//         return {name: "the string literal \"" + this.i_stringValue + "\"", message: "the string literal \"" + this.i_stringValue + "\""};
//     }

// //	stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
// //		this.done(sim, inst);
// //		return true;
// //	}
// }

export var Parentheses  = Expression.extend({
    _name: "Parentheses",
    i_childrenToCreate : ["subexpression"],
    i_childrenToExecute : ["subexpression"],

    typeCheck : function(){
        this.type = this.subexpression.type;
        this.valueCategory = this.subexpression.valueCategory;

    },

    upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
        if (inst.index == "subexpressions") {
            this.pushChildInstances(sim, inst);
            inst.index = "done";
            return true;
        }
        else {
            inst.setEvalResult(inst.childInstances.subexpression.evalResult);
            this.done(sim, inst);
        }
        return true;
    },

    isTailChild : function(child){
        return {isTail: true};
    }
});



// OLD EXPRESSION JUNK BELOW

// type Compiled<E extends Expression = Expression, T extends Type = Type, V extends ValueCategory = ValueCategory> = E & E["_t_compiledType"] & {
//     readonly type: T;
//     readonly valueCategory: V;
// };

// interface CompiledExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> {
//     readonly type: T;
//     readonly valueCategory: V;
//     readonly _t_isCompiled: true;
// }

// 
// type ExpressionPropertyNames<C extends Expression> = { [K in keyof C]: C[K] extends Expression ? K : never }[keyof C];
// type CompiledChildExpressions<E extends Expression, Ex extends keyof any> = {
//     [k in Exclude<ExpressionPropertyNames<E>,Ex>]: CompiledExpression<(E[k] extends Expression ? E[k] : never)>;
// };

// type CompiledExpression<E extends Expression = Expression,
//                         T extends Type = E["t_compiledType"]["type"],
//                         VC extends ValueCategory = E["t_compiledType"]["valueCategory"]>
//                         = Util.Overwrite<
//                             Util.Overwrite<
//                                 Util.Overwrite<E, E["t_compiledType"]>,
//                                 CompiledChildExpressions<E, keyof E["t_compiledType"]>>,
//                             {

//                                 // t_isCompiled is here to prevent (otherwise) structurally equivalent non-compiled expressions
//                                 // from being assignable to a compiled expression type
//                                 // TODO: maybe better to use a symbol here?
//                                 readonly t_isCompiled: "true"

//                                 // Add in the type and valueCategory properties from the template parameters with
//                                 // "last one wins" semantics, because they were omitted (with Omit) previously
//                                 readonly type: T;
//                                 readonly valueCategory: VC;
//                             }
//                         >;
