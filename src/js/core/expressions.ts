import { CPPObject } from "./objects";
import { Simulation, SimulationEvent } from "./Simulation";
import { Type, ObjectType, AtomicType, IntegralType, FloatingPointType, PointerType, ReferenceType, ClassType, BoundedArrayType, FunctionType, isType, PotentialReturnType, Bool, sameType, VoidType, ArithmeticType, ArrayPointer, Int, PotentialParameterType, Float, Double, Char, NoRefType, noRef } from "./types";
import { ASTNode, PotentialFullExpression, ConstructContext, SuccessfullyCompiled, RuntimePotentialFullExpression, RuntimeConstruct, CompiledTemporaryDeallocator, CPPConstruct, Description } from "./constructs";
import { CPPError } from "./errors";
import { FunctionEntity, ObjectEntity, CPPEntity } from "./entities";
import { Value, RawValueType } from "./runtimeEnvironment";
import { Mutable, Constructor, assert, escapeString } from "../util/util";
import { FunctionCall, CompiledFunctionCall, RuntimeFunctionCall } from "./functions";
import { standardConversion, convertToPRValue, usualArithmeticConversions } from "./standardConversions";
import { checkIdentifier } from "./lexical";


export function readValueWithAlert(obj: CPPObject<AtomicType>, sim: Simulation) {
    let value = obj.readValue();
    if(!value.isValid) {
        let objDesc = obj.describe();
        var msg = "The value you just got out of " + (objDesc.name || objDesc.message) + " isn't valid. It might be uninitialized or it could have come from a dead object.";
        if (value.rawValue === 0){
            msg += "\n\n(Note: The value just happens to be zero. Don't be fooled! Uninitialized memory isn't guaranteed to be zero.)";
        }
        sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, msg, true);
    }
    return value;
};

// TODO: ensure that an expression is never considered compiled unless its children are compiled

/**
 * TODO: this comment is out of date
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
export type ValueCategory = "prvalue" | "lvalue";


export interface WellTyped<T extends Type = Type, V extends ValueCategory = ValueCategory> {
    readonly type: T;
    readonly valueCategory: V;
}

export interface TypedExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> extends Expression {
    readonly type: T;
    readonly valueCategory: V;
}

export type SpecificTypedExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> = V extends ValueCategory ? TypedExpression<T,V> : never;

// export interface TypedAndCompiled<T extends Type = Type, V extends ValueCategory = ValueCategory> extends Expression<T,V>, SuccessfullyCompiled {

// }

// type CompiledExpressionBase<E extends Expression, T extends Type, V extends ValueCategory> = E & TypedAndCompiled<T,V>;

// TODO: is this used anymore?
type SimilarTypedCompiledExpression<CE extends CompiledExpression> = CompiledExpression<CE["type"], CE["valueCategory"]>;


export interface ExpressionASTNode extends ASTNode {

}

export interface ExpressionContext extends ConstructContext {

}

export abstract class Expression extends PotentialFullExpression {

    public static createFromAST(ast: ExpressionASTNode, context: ExpressionContext) : Expression {
        // TODO: implement this. Should not just call super
        return super.createFromAST(ast, context);
    }

    public abstract readonly type?: Type;
    public abstract readonly valueCategory?: ValueCategory;
    public readonly conversionLength: number = 0;

    protected constructor(context: ExpressionContext) {
        super(context);
    }

    public abstract createRuntimeExpression<T extends Type = Type, V extends ValueCategory = ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : RuntimeExpression<T,V>;

    public isWellTyped() : this is SpecificTypedExpression<Type,ValueCategory> {
        return !!this.type && !!this.valueCategory;
    }

    public isTyped<T extends Type>(ctor: Constructor<T>) : this is SpecificTypedExpression<T, ValueCategory> {
        return !!this.type && this.type.isType(ctor);
    }

    public isObjectTyped() : this is SpecificTypedExpression<ObjectType, ValueCategory> {
        return !!this.type && this.type.isObjectType();
    }

    public isAtomicTyped() : this is SpecificTypedExpression<AtomicType, ValueCategory> {
        return !!this.type && this.type.isAtomicType();
    }

    public isArithmeticTyped() : this is SpecificTypedExpression<ArithmeticType, ValueCategory> {
        return !!this.type && this.type.isArithmeticType();
    }

    public isIntegralTyped() : this is SpecificTypedExpression<IntegralType, ValueCategory> {
        return !!this.type && this.type.isIntegralType();
    }

    public isFloatingPointTyped() : this is SpecificTypedExpression<FloatingPointType, ValueCategory> {
        return !!this.type && this.type.isFloatingPointType();
    }

    public isPointerTyped() : this is SpecificTypedExpression<PointerType, ValueCategory> {
        return !!this.type && this.type.isPointerType();
    }

    public isReferenceTyped() : this is SpecificTypedExpression<ReferenceType, ValueCategory> {
        return !!this.type && this.type.isReferenceType();
    }

    public isClassTyped() : this is SpecificTypedExpression<ClassType, ValueCategory> {
        return !!this.type && this.type.isClassType();
    }

    public isBoundedArrayTyped() : this is SpecificTypedExpression<BoundedArrayType, "lvalue"> {
        return !!this.type && this.type.isBoundedArrayType();
    }

    public isPrvalue<T extends Type, V extends ValueCategory>(this: TypedExpression<T,V>) : this is TypedExpression<T,"prvalue"> {
        return this.valueCategory === "prvalue";
    }

    public isLvalue<T extends Type, V extends ValueCategory>(this: TypedExpression<T,V>) : this is TypedExpression<T,"lvalue"> {
        return this.valueCategory === "lvalue";
    }

    // public isSuccessfullyCompiled() : this is Compiled<this> {
    //     return !this.hasErrors;
    // }

    public isTailChild(child: CPPConstruct) {
        return {isTail: false};
    }

    public abstract describeEvalResult(depth: number) : Description;
}

export interface CompiledExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> extends Expression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly type: T;
    readonly valueCategory: V;
}

export type SpecificCompiledExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> = V extends ValueCategory ? CompiledExpression<T,V> : never;


export function allWellTyped(expressions: Expression[]): expressions is TypedExpression[];
export function allWellTyped(expressions: readonly Expression[]): expressions is readonly TypedExpression[];
export function allWellTyped(expressions: readonly Expression[]): expressions is readonly TypedExpression[] {
    return expressions.every((expr) => { return expr.isWellTyped(); });
}

export function allObjectTyped(expressions: Expression[]): expressions is TypedExpression<ObjectType>[];
export function allObjectTyped(expressions: readonly Expression[]): expressions is readonly TypedExpression<ObjectType>[];
export function allObjectTyped(expressions: readonly Expression[]): expressions is readonly TypedExpression<ObjectType>[] {
    return expressions.every((expr) => { return expr.isObjectTyped(); });
}

export type VCResultTypes<T extends Type, V extends ValueCategory> =
    T extends FunctionType ? (
        V extends "prvalue" ? never :
        V extends "xvalue" ? never :
        FunctionEntity // lvalue
    )
    : T extends AtomicType ? (
        V extends "prvalue" ? Value<T> :
        V extends "xvalue" ? CPPObject<T> :
        CPPObject<T> // lvalue
    )
    : T extends ObjectType ? (
        
        // e.g. If T is actually ObjectType, then it could be an AtomicType and we go with the first option Value<AtomicType> | CPPObject<T>.
        //      However, if T is actually ClassType, then it can't be an AtomicType and we go with the second option of only CPPObject<T>
        V extends "prvalue" ? (AtomicType extends T ? Value<AtomicType> | CPPObject<T> : CPPObject<T>) :
        V extends "xvalue" ? CPPObject<T> :
        CPPObject<T> // lvalue
    )
    : /*ObjectType extends T ?*/ ( // That is, T is more general, so it's possible T is an AtomicType or an ObjectType
        V extends "prvalue" ? Value<AtomicType> | CPPObject<ObjectType> :
        V extends "xvalue" ? CPPObject<ObjectType> :
        CPPObject<ObjectType> // lvalue
    )
    // : { // Otherwise, T is NOT possibly an ObjectType. This could happen with e.g. an lvalue expression that yields a function
    //     readonly prvalue: number;
    //     readonly xvalue: number;
    //     readonly lvalue: number;
    // };

export abstract class RuntimeExpression<T extends Type = Type, V extends ValueCategory = ValueCategory, C extends CompiledExpression<T,V> = CompiledExpression<T,V>> extends RuntimePotentialFullExpression<C> {
    
    /**
     * WARNING: The evalResult property may be undefined, even though it's type suggests it will always
     * be defined. In most places where it is accessed, there is an implicit assumption that the expression
     * will already have been evaluated and the client code would end up needing a non-null assertion anyway.
     * However, those non-null assertions actually introduce some tricky complications with VCResultTypes,
     * which cause type errors and are a huge pain. So instead we tell the type system to trust us.
     */
    public readonly evalResult!: VCResultTypes<T,V>;

    public constructor(model: C, parent: RuntimeConstruct) {
        super(model, "expression", parent);
    }

    protected setEvalResult(value: VCResultTypes<T,V>) {
        (<Mutable<this>>this).evalResult = value;
    }
}


export class UnsupportedExpression extends Expression {

    public readonly type = undefined;
    public readonly valueCategory = undefined;

    public constructor(context: ExpressionContext, unsupportedName: string) {
        super(context);
        this.addNote(CPPError.lobster.unsupported_feature(this, unsupportedName));
    }

    // Will never be called since an UnsupportedExpression will always have errors and
    // never satisfy the required this context of CompiledExpression
    public createRuntimeExpression(this: CompiledExpression, parent: RuntimeConstruct) : never {
        throw new Error("Cannot create a runtime instance of an unsupported construct.");
    }

    public describeEvalResult(depth: number): Description {
        return {
            message: "an unsupported expression"
        }
    }
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



export abstract class SimpleRuntimeExpression<T extends Type = Type, V extends ValueCategory = ValueCategory, C extends CompiledExpression<T,V> = CompiledExpression<T,V>> extends RuntimeExpression<T,V,C> {

    private index : 0 | 1 = 0;

    // Note: this is RuntimeConstruct rather than RuntimeExpression, because RuntimeExpression is implicitly
    //       RuntimeExpression<Type, ValueCategory> and particular instantiations may not
    private subexpressions: RuntimeConstruct[] = [];

    public constructor (model: C, parent: RuntimeConstruct) {
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
        // TODO: how do expressions pop themselves?
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


// export class OperatorOverload extends Expression {

//     public readonly type?: Type;
//     public readonly valueCategory?: ValueCategory;

//     public readonly operator: t_OverloadableOperators;
//     public readonly operands: Expression[];
    
//     public readonly isMemberOverload?: boolean;
//     public readonly overloadFunctionCall?: FunctionCall;

//     private constructor(context: ExpressionContext, operands: Expression[], operator: t_OverloadableOperators) {
//         super(context);

//         this.operator = operator;
//         this.operands = operands; // These may go through conversions when attached to a function call, but this member contains the "raw" versions

//         // If any of the operands are not well-typed, can't compile
//         if (!this.hasWellTypedOperands(operands)) {
//             this.type = null;
//             this.valueCategory = null;

//             // In this case, attach operands directly as children.
//             operands.forEach((expr) => {this.attach(expr);});
//             return;
//         }

//         // Sanity check that at least one of the operands has class-type
//         assert(operands.length > 0, "Operator overload must have at least one operand.");
//         assert(operands.some((expr) => {return isType(expr.type, ClassType);}), "At least one operand in a non-member overload must have class-type.");


//         let overloadFunction : FunctionEntity? = null;

//         // If the leftmost operand is class-type, we can look for a member overload
//         let leftmost = operands[0];
//         if (isType(leftmost.type, ClassType)) {
//             let entity = leftmost.type.cppClass.scope.singleLookup("operator" + this.operator, {
//                 own:true, params:[operands.slice(1)], isThisConst : leftmost.type.isConst
//             });
            
//             Util.assert(entity instanceof FunctionEntity, "Non-function entity found for operator overload name lookup.");
//             overloadFunction = <FunctionEntity>entity;
//         }
        
//         // If we didn't find a member overload, next look for a non-member overload
//         if (!overloadFunction) {
//             let entity = this.contextualScope.singleLookup("operator" + this.operator, {
//                 params: operands
//             });
            
//             Util.assert(entity instanceof FunctionEntity, "Non-function entity found for operator overload name lookup.");
//             overloadFunction = <FunctionEntity>entity;
//         }


//         if (overloadFunction) {
//             this.isMemberOverload = overloadFunction instanceof MemberFunctionEntity;


//             if (this.isMemberOverload) {
//                 // Member overload means leftmost operand is our directly attached child, other operands are arguments to function call.
//                 this.attach(operands[0]);
//                 this.attach(this.overloadFunctionCall = new FunctionCall(context, overloadFunction, operands.slice(1)));
//                 // The receiver of the function call is set at runtime after the operand is evaluated
//             }
//             else{
//                 // Non-member overload means all operands are arguments of the function call
//                 this.attach(this.overloadFunctionCall = new FunctionCall(context, overloadFunction, operands));
//             }

//             this.type = this.overloadFunctionCall.func.type.returnType;
//             this.valueCategory = this.overloadFunctionCall.valueCategory;
//         }
//         else{
//             // TODO: add in notes from attempted lookup operations for the member and non-member overloads
//             this.addNote(CPPError.expr.binary.overload_not_found(this, operator, operands));

//             this.type = null;
//             this.valueCategory = null;

//             // If we didn't find a function to use, just attach operands directly as children.
//             operands.forEach((expr) => {this.attach(expr);});
//         }
//     }

//     private hasWellTypedOperands(operands: Expression[]) : operands is TypedExpression[] {
//         return operands.every((expr) => { return expr.isWellTyped(); });
//     }

//     public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : RuntimeOperatorOverload<CompiledOperatorOverload<T,V>> {
//         return new RuntimeOperatorOverload(this, parent);
//     }
    
//     public describeEvalResult(depth: number): Description {
//         throw new Error("Method not implemented.");
//     }



//     // upNext : Class.ADDITIONALLY(function(sim: Simulation, rtConstruct: RuntimeConstruct){
//     //     if (this.funcCall){
//     //         inst.childInstances.funcCall.getRuntimeFunction().setReceiver(EvaluationResultRuntimeEntity.instance(this.lhs.type, inst.childInstances.lhs));
//     //     }
//     // }),

//     // stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){

//     //     if (inst.index == "operate"){

//     //         if (this.funcCall){
//     //             // Assignment operator function call has already taken care of the "assignment".
//     //             // Just evaluate to returned value from assignment operator.
//     //             inst.setEvalResult(inst.childInstances.funcCall.evalResult);
//     //             this.done(sim, inst);
//     //             //return true;
//     //         }
//     //         else{
//     //         }
//     //     }
//     // },

// }

// export interface CompiledOperatorOverload<T extends PotentialReturnType = PotentialReturnType, V extends ValueCategory = ValueCategory> extends OperatorOverload, SuccessfullyCompiled {
    
//     public readonly type: T;
//     public readonly valueCategory: V;

//     public readonly operands: CompiledExpression[];
    
//     public readonly isMemberOverload: boolean;
//     public readonly overloadFunctionCall: CompiledFunctionCall<T,V>; 
// }


export class Comma extends Expression {
    
    // TODO: what is this for?
    public static readonly constructKind = Symbol("Comma");

    public readonly type?: Type;
    public readonly valueCategory?: ValueCategory;

    public readonly left: Expression;
    public readonly right: Expression;

    public constructor(context: ExpressionContext, left: Expression, right: Expression) {
        super(context);
        this.type = right.type;
        this.valueCategory = right.valueCategory;
        this.attach(this.left = left);
        this.attach(this.right = right);
    }
    
    // public isSuccessfullyCompiled(): this is Comma<true> {
    //     return !this.hasErrors;
    // }

    public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledComma<T,V>, parent: RuntimeConstruct) : RuntimeComma<T,V> {
        return new RuntimeComma(<CompiledComma<T,V>>this, parent);
    }

    // public isTailChild(child: CPPConstruct) {
    //     if (child === this.right){
    //         return {isTail: true,
    //             reason: "The recursive call is on the right side of the comma, so it is guaranteed to be evaluated last."
    //         };
    //     }
    //     else{
    //         return {isTail: false,
    //             reason: "The expression on the right of the comma will be evaluated after the recursive call.",
    //             others: [this.right]
    //         };
    //     }
    // }

    public describeEvalResult(depth: number) {
        return this.right.describeEvalResult(depth);
    }
}


export interface CompiledComma<T extends Type = Type, V extends ValueCategory = ValueCategory> extends Comma, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly type: T;
    readonly valueCategory: V;
    readonly left: CompiledExpression;
    readonly right: CompiledExpression<T,V>;
}

export class RuntimeComma<T extends Type, V extends ValueCategory> extends SimpleRuntimeExpression<T,V,CompiledComma<T,V>> {

    public left: RuntimeExpression;
    public right: RuntimeExpression<T,V>;

    public constructor (model: CompiledComma<T,V>, parent: RuntimeConstruct) {
        super(model, parent);
        this.right = this.model.right.createRuntimeExpression(this);
        this.left = this.model.left.createRuntimeExpression(this);
        this.setSubexpressions([this.left, this.right]);
    }

    protected operate() {
        this.setEvalResult(this.right.evalResult);
    }

}


export class Ternary extends Expression {
    
    public readonly type?: Type;
    public readonly valueCategory?: ValueCategory;

    public readonly condition: Expression;
    public readonly then: Expression;
    public readonly otherwise: Expression;
    
    public readonly _t_compiled!: CompiledTernary;

    public constructor(context: ExpressionContext, condition: Expression, then: Expression, otherwise: Expression) {
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
        if (then.isPrvalue() && otherwise.isLvalue()) {
            otherwise = convertToPRValue(otherwise);
        }
        else if (otherwise.isPrvalue() && then.isLvalue()) {
            then = convertToPRValue(then);
        }
    

        if (!sameType(then.type, otherwise.type)) {
            this.addNote(CPPError.lobster.ternarySameType(this, then.type, otherwise.type));
        }
        if (isType(then.type, VoidType) || isType(otherwise.type, VoidType)) {
            this.addNote(CPPError.lobster.ternaryNoVoid(this));
        }
        
        if (then.valueCategory !== otherwise.valueCategory){
            this.addNote(CPPError.expr.ternary.sameValueCategory(this));
        }
        
        return {then, otherwise};
    }

    public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledTernary<T,V>, parent: RuntimeConstruct) : RuntimeTernary<T,V>;
    public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : never;
    public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledTernary<T,V>, parent: RuntimeConstruct) : RuntimeTernary<T,V> {
        return new RuntimeTernary(this, parent);
    }

    // TODO
    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }

    

    // public isTailChild(child: CPPConstruct) {
    //     if (child === this.condition){
    //         return {isTail: false,
    //             reason: "One of the two subexpressions in the ternary operator will be evaluated after the function call.",
    //             others: [this.then, this.otherwise]
    //         };
    //     }
    //     else{
    //         return {isTail: true};
    //     }
    // }
}

export interface CompiledTernary<T extends Type = Type, V extends ValueCategory = ValueCategory> extends Ternary, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly type: T;
    readonly valueCategory: V;
    readonly condition: CompiledExpression<Bool, "prvalue">;
    readonly then: CompiledExpression<T,V>;
    readonly otherwise: CompiledExpression<T,V>;
}

export class RuntimeTernary<T extends Type = Type, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T,V,CompiledTernary<T,V>> {

    public condition: RuntimeExpression<Bool, "prvalue">;
    public then: RuntimeExpression<T,V>;
    public otherwise: RuntimeExpression<T,V>;

    private index = "condition";

    public constructor (model: CompiledTernary<T,V>, parent: RuntimeConstruct) {
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
            if(this.condition.evalResult.rawValue) {
                this.sim.push(this.then);
            }
            else{
                this.sim.push(this.otherwise)
            }
            this.index = "operate";
        }
	}
	
	protected stepForwardImpl() {
        this.setEvalResult(this.then ? this.then.evalResult : this.otherwise.evalResult);
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

    public readonly type?: Type;
    public readonly valueCategory = "lvalue";

    public readonly lhs: Expression;
    public readonly rhs: Expression;
    
    // public readonly _t_compiled!: CompiledAssignment;

    private constructor(context: ExpressionContext, lhs: Expression, rhs: Expression) {
        super(context);

        // If the lhs/rhs doesn't have a type or VC, the rest of the analysis doesn't make much sense.
        if (!lhs.isWellTyped() || !rhs.isWellTyped()) {
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

        if (rhs.isWellTyped() && !sameType(rhs.type, lhs.type.cvUnqualified())) {
            this.addNote(CPPError.expr.assignment.convert(this, lhs, rhs));
        }

        // TODO: do we need to check that lhs is an AtomicType? or is that necessary given all the other checks?

        this.type = lhs.type;
        this.attach(this.lhs = lhs);
        this.attach(this.rhs = rhs);
    }

    public createRuntimeExpression<T extends AtomicType>(this: CompiledAssignment<T>, parent: RuntimeConstruct) : RuntimeAssignment<T>;
    public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : never;
    public createRuntimeExpression<T extends AtomicType>(this: CompiledAssignment<T>, parent: RuntimeConstruct) : RuntimeAssignment<T> {
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

    public isTailChild(child: CPPConstruct) {
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

export interface CompiledAssignment<T extends AtomicType = AtomicType> extends Assignment, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly type: T;
    readonly lhs: CompiledExpression<T, "lvalue">;
    readonly rhs: CompiledExpression<T, "prvalue">;
}


export class RuntimeAssignment<T extends AtomicType = AtomicType> extends SimpleRuntimeExpression<T,"lvalue", CompiledAssignment<T>> {

    public readonly lhs: RuntimeExpression<T, "lvalue">;
    public readonly rhs: RuntimeExpression<T, "prvalue">;

    public constructor (model: CompiledAssignment<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.lhs = this.model.lhs.createRuntimeExpression(this);
        this.rhs = this.model.rhs.createRuntimeExpression(this);
        this.setSubexpressions([this.rhs, this.lhs]);
    }

	protected operate() {
        this.lhs.evalResult.writeValue(this.rhs.evalResult);
        this.setEvalResult(this.lhs.evalResult);
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


type t_BinaryOperators = t_ArithmeticBinaryOperators | t_RelationalBinaryOperators | t_LogicalBinaryOperators;

export abstract class BinaryOperator extends Expression {
    
    public abstract readonly type?: AtomicType;
    public readonly valueCategory = "prvalue";

    public abstract readonly left: Expression;
    public abstract readonly right: Expression;

    public readonly operator: t_BinaryOperators;
    
    public readonly _t_compiled!: CompiledBinaryOperator;

    protected constructor(context: ExpressionContext, operator: t_BinaryOperators) {
        super(context)
        this.operator = operator;
    }

    public abstract createRuntimeExpression<T extends AtomicType>(this: CompiledBinaryOperator<T>, parent: RuntimeConstruct) : RuntimeBinaryOperator<T>;
    public abstract createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : never;
}

export interface CompiledBinaryOperator<T extends AtomicType = AtomicType> extends BinaryOperator, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly type: T;
    readonly left: CompiledExpression<AtomicType, "prvalue">
    readonly right: CompiledExpression<AtomicType, "prvalue">
}

// TODO: I think this class shouldn't exist. It should probably just be RuntimeArithmeticBinaryOperator.
// It gives the impression
// that this would be a base for all Runtime classes for binary operators, but it isn't for
// RuntimeLogicalBinaryOperator since that one runs differently to handle short-circuit behavior
// correctly.
export abstract class RuntimeBinaryOperator<T extends AtomicType = AtomicType, C extends CompiledBinaryOperator<T> = CompiledBinaryOperator<T>> extends SimpleRuntimeExpression<T, "prvalue", C> {

}

type t_ArithmeticBinaryOperators = "+" | "-" | "*" | "/" | "%" | "&" | "^" | "|" | "<<" | ">>" | "<" | ">" | "<=" | ">=" | "==" | "!=";

// Note: AtomicType here is much wider than needed. T should theoretically only ever be Int, Double, or Float
const ARITHMETIC_BINARY_OPERATIONS : {[index:string]: <T extends AtomicType>(left: Value<T>, right: Value<T>) => Value<T>}
    = {
    "+" : function<T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, add);
    },
    "-" : function<T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, sub);
    },
    "*" : function<T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, mult);
    },
    "/" : function<T extends AtomicType>(left: Value<T>, right: Value<T>) {
        if (left.type.isIntegralType()) {
            return left.combine(right, intDiv);
        }
        else {
            return left.combine(right, floatDiv);
        }
    },
    "%" : function<T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, mod);
    },
    "&" : function<T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, bitAnd);
    },
    "^" : function<T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, bitXor);
    },
    "|" : function<T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, bitOr);
    },
    "<<" : function<T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, bitShiftLeft);
    },
    ">>" : function<T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, bitShiftRight);
    }
}

// TODO: make types more specific. ArithmeticBinaryOperator should only be used in cases where it has
// already been determined that both operands have arithmetic type. Either that or it should be used
// in cases where an operator requires arithmetic operands, but not sure. For example, what if someone
// tries to add a pointer type and a class type with the + operator (assuming overloads already checked
// and none found). What TS class do we want to get used, s that the error messages are as good as possible?
// Considering thie and LogicalBinaryOperator together, it actually seems best to create this in a way that
// is based on the operator used and actually allows for improper types. That should result in the most relevant
// error messages. (Of course, overloads are still checked for first, and the specific pointer offset and
// pointer difference cases should also be checked for first. So these are the fallback options.)
class ArithmeticBinaryOperator extends BinaryOperator {
    
    public readonly type?: ArithmeticType;

    public readonly left: Expression;
    public readonly right: Expression;

    public readonly operator!: t_ArithmeticBinaryOperators; // Narrows type from base

    protected constructor(context: ExpressionContext, left: Expression, right: Expression, operator: t_ArithmeticBinaryOperators) {
        super(context, operator);

        if (!left.isWellTyped() || !right.isWellTyped()) {
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }
        
        // Arithmetic types are required
        if (!left.isArithmeticTyped() || !right.isArithmeticTyped()) {
            this.addNote(CPPError.expr.binary.arithmetic_operands(this, this.operator, left, right));
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }

        // % operator and shift operators require integral operands
        if ((operator === "%" || operator === "<<" || operator == ">>") &&
            (!left.isIntegralTyped() || !right.isIntegralTyped())) {
            this.addNote(CPPError.expr.binary.arithmetic_operands(this, this.operator, left, right));
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }

        let [convertedLeft, convertedRight] = usualArithmeticConversions(left, right);

        
        if (!sameType(convertedLeft.type!, convertedRight.type!)) {
            this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, convertedLeft, convertedRight));
        }

        this.type = convertedLeft.type;
        this.attach(this.left = convertedLeft);
        this.attach(this.right = convertedRight);
    }

    public createRuntimeExpression<T extends ArithmeticType>(this: CompiledArithmeticBinaryOperator<T>, parent: RuntimeConstruct) : RuntimeArithmeticBinaryOperator<T>;
    public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : never;
    public createRuntimeExpression<T extends ArithmeticType>(this: CompiledArithmeticBinaryOperator<T>, parent: RuntimeConstruct) : RuntimeArithmeticBinaryOperator<T> {
        return new RuntimeArithmeticBinaryOperator(this, parent);
    }

    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }
}

export interface CompiledArithmeticBinaryOperator<T extends ArithmeticType> extends ArithmeticBinaryOperator, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly type: T;

    readonly left: CompiledExpression<T,"prvalue">;
    readonly right: CompiledExpression<T,"prvalue">;
}

// TODO: rename this or maybe create two separate classes for Arithmetic and Logical
export class RuntimeArithmeticBinaryOperator<T extends ArithmeticType> extends RuntimeBinaryOperator<T, CompiledArithmeticBinaryOperator<T>> {
    
    public readonly left: RuntimeExpression<T, "prvalue">;
    public readonly right: RuntimeExpression<T, "prvalue">;

    public constructor (model: CompiledArithmeticBinaryOperator<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = this.model.left.createRuntimeExpression(this);
        this.right = this.model.right.createRuntimeExpression(this);
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {
        // Not sure why the cast here is necessary but apparently Typescript needs it
        this.setEvalResult(<VCResultTypes<T,"prvalue">>ARITHMETIC_BINARY_OPERATIONS[this.model.operator](this.left.evalResult, this.right.evalResult));
    }
}

type t_RelationalBinaryOperators = "<" | ">" | "<=" | ">=" | "==" | "!=";

const RELATIONAL_BINARY_OPERATIONS : {[index:string]: <T extends AtomicType>(left: Value<T>, right: Value<T>) => Value<Bool>}
    = {
    "<" : function<T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, lt);
    },
    ">" : function<T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, gt);
    },
    "<=" : function<T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, lte);
    },
    ">=" : function<T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, gte);
    },
    "==" : function<T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, eq);
    },
    "!=" : function<T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, ne);
    },
}

class RelationalBinaryOperator extends BinaryOperator {
    
    public readonly type = Bool.BOOL;

    public readonly left: Expression;
    public readonly right: Expression;

    public readonly operator!: t_RelationalBinaryOperators; // Narrows type from base

    protected constructor(context: ExpressionContext, left: Expression, right: Expression, operator: t_RelationalBinaryOperators) {
        super(context, operator);

        if (!left.isWellTyped() || !right.isWellTyped()) {
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }
        
        // Arithmetic types are required (note: pointer comparisons have their own PointerRelationalOperation class)
        if (!left.isArithmeticTyped() || !right.isArithmeticTyped()) {
            this.addNote(CPPError.expr.binary.arithmetic_operands(this, this.operator, left, right));
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }

        let [convertedLeft, convertedRight] = usualArithmeticConversions(left, right);
        
        if (!sameType(convertedLeft.type!, convertedRight.type!)) {
            this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, convertedLeft, convertedRight));
        }

        this.attach(this.left = convertedLeft);
        this.attach(this.right = convertedRight);
    }

    public createRuntimeExpression<T extends ArithmeticType>(this: CompiledRelationalBinaryOperator<T>, parent: RuntimeConstruct) : RuntimeRelationalBinaryOperator<T>;
    public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : never;
    public createRuntimeExpression<T extends ArithmeticType>(this: CompiledRelationalBinaryOperator<T>, parent: RuntimeConstruct) : RuntimeRelationalBinaryOperator<T> {
        return new RuntimeRelationalBinaryOperator(this, parent);
    }

    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }
}

export interface CompiledRelationalBinaryOperator<T extends ArithmeticType> extends RelationalBinaryOperator, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<T,"prvalue">;
    readonly right: CompiledExpression<T,"prvalue">;
}

export class RuntimeRelationalBinaryOperator<T extends ArithmeticType> extends RuntimeBinaryOperator<Bool, CompiledRelationalBinaryOperator<T>> {
    
    public readonly left: RuntimeExpression<T, "prvalue">;
    public readonly right: RuntimeExpression<T, "prvalue">;

    public constructor (model: CompiledRelationalBinaryOperator<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = this.model.left.createRuntimeExpression(this);
        this.right = this.model.right.createRuntimeExpression(this);
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {
        // Not sure why the cast here is necessary but apparently Typescript needs it
        this.setEvalResult(RELATIONAL_BINARY_OPERATIONS[this.model.operator](this.left.evalResult, this.right.evalResult));
    }
}



class PointerOffset extends BinaryOperator {
    
    public readonly type?: PointerType;

    public readonly left: TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">;
    public readonly right: TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">;

    public readonly pointer?: TypedExpression<PointerType, "prvalue">;
    public readonly offset?: TypedExpression<IntegralType, "prvalue">;

    public readonly pointerOnLeft?: boolean;

    public readonly operator! : "+"; // Narrows type from base

    protected constructor(context: ExpressionContext,
            left: TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">,
            right: TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">) {
        super(context, "+");

        // NOT NEEDED ASSUMING THEY COME IN ALREADY WELL TYPED AS APPROPRIATE FOR POINTER OFFSET
        // if (left.isWellTyped() && right.isWellTyped()) {
        //     left = convertToPRValue(left);
        //     right = convertToPRValue(right);
        // }


        this.attach(this.left = left);
        this.attach(this.right = right);

        if (!left.isWellTyped() || !right.isWellTyped()) {
            return;
        }
            
        if (left.isPointerTyped() && right.isIntegralTyped()) {
            this.pointerOnLeft = true;
            this.pointer = <TypedExpression<PointerType, "prvalue">> left;
            this.offset = <TypedExpression<IntegralType, "prvalue">> right;
            this.type = this.pointer.type;
        }
        else if (left.isIntegralTyped() && right.isPointerTyped()) {
            this.pointerOnLeft = false;
            this.pointer = <TypedExpression<PointerType, "prvalue">> right;
            this.offset = <TypedExpression<IntegralType, "prvalue">> left;
            this.type = this.pointer.type;
        }
        else {
            this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, left, right));
        }
    }

    public createRuntimeExpression<T extends PointerType>(this: CompiledPointerOffset<T>, parent: RuntimeConstruct) : RuntimePointerOffset<T>;
    public createRuntimeExpression<T extends PointerType, V extends ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : never;
    public createRuntimeExpression<T extends PointerType>(this: CompiledPointerOffset<T>, parent: RuntimeConstruct) : RuntimePointerOffset<T> {
        return new RuntimePointerOffset(this, parent);
    }

    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }
}

export interface CompiledPointerOffset<T extends PointerType = PointerType> extends PointerOffset, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly type: T;

    readonly left: CompiledExpression<T, "prvalue"> | CompiledExpression<IntegralType, "prvalue">;
    readonly right: CompiledExpression<T, "prvalue"> | CompiledExpression<IntegralType, "prvalue">;
    
    readonly pointer: CompiledExpression<T, "prvalue">;
    readonly offset: CompiledExpression<IntegralType, "prvalue">;
    
    readonly pointerOnLeft?: boolean;
}


export class RuntimePointerOffset<T extends PointerType = PointerType> extends RuntimeBinaryOperator<T, CompiledPointerOffset<T>> {

    public readonly left: RuntimeExpression<T, "prvalue"> | RuntimeExpression<IntegralType, "prvalue">; // narrows type of member in base class
    public readonly right: RuntimeExpression<T, "prvalue"> | RuntimeExpression<IntegralType, "prvalue">; // narrows type of member in base class

    public readonly pointer: RuntimeExpression<T, "prvalue">;
    public readonly offset: RuntimeExpression<IntegralType, "prvalue">;

    public constructor (model: CompiledPointerOffset<T>, parent: RuntimeConstruct) {
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
        let result = this.pointer.evalResult.pointerOffset(this.offset.evalResult);
        this.setEvalResult(<VCResultTypes<T,"prvalue">>result); // not sure why cast is necessary here

        let resultType = result.type;
        if (resultType.isType(ArrayPointer)){
            // Check that we haven't run off the array
            if (result.rawValue < resultType.min()){
                //sim.alert("Oops. That pointer just wandered off the beginning of its array.");
            }
            else if (resultType.onePast() < result.rawValue){
                //sim.alert("Oops. That pointer just wandered off the end of its array.");
            }
        }
        else{
            // If the RTTI works well enough, this should always be unsafe
            this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "Uh, I don't think you're supposed to do arithmetic with that pointer. It's not pointing into an array.", true);
        }
    }
}


class PointerDifference extends BinaryOperator {
    
    public readonly type: Int;
    public readonly valueCategory = "prvalue";

    public readonly left: TypedExpression<PointerType, "prvalue">;
    public readonly right: TypedExpression<PointerType, "prvalue">;

    public readonly operator! : "-"; // Narrows type from base

    protected constructor(context: ExpressionContext, left: TypedExpression<PointerType, "prvalue">, right: TypedExpression<PointerType, "prvalue">) {
        super(context, "-");

        // Not necessary assuming they come in as prvalues that are confirmed to have pointer type.
        // if (left.isWellTyped() && right.isWellTyped()) {
        //     left = convertToPRValue(left);
        //     right = convertToPRValue(right);
        // }

        this.attach(this.left = left);
        this.attach(this.right = right);

        this.type = new Int();

        
        // Not necessary assuming they come in as prvalues that are confirmed to have pointer type.
        // if (left.isWellTyped() && right.isWellTyped()) {
            
        //     if (left.type.isType(Pointer) && right.type.isType(Pointer)) {
        //         this.type = new Int();
        //     }
        //     else {
        //         this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, left, right));
        //         this.type = null;
        //     }
        // }
        // else {
        //     this.type = null;
        // }
    }

    public createRuntimeExpression(this: CompiledPointerDifference, parent: RuntimeConstruct) : RuntimePointerDifference;
    public createRuntimeExpression<T extends PointerType, V extends ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : never;
    public createRuntimeExpression(this: CompiledPointerDifference, parent: RuntimeConstruct) : RuntimePointerDifference {
        return new RuntimePointerDifference(this, parent);
    }

    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }
}

export interface CompiledPointerDifference extends PointerDifference, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<PointerType, "prvalue">;
    readonly right: CompiledExpression<PointerType, "prvalue">;
}

export class RuntimePointerDifference extends RuntimeBinaryOperator<Int, CompiledPointerDifference> {

    public left: RuntimeExpression<PointerType, "prvalue">;
    public right: RuntimeExpression<PointerType, "prvalue">;

    public constructor (model: CompiledPointerDifference, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = this.model.left.createRuntimeExpression(this);
        this.right = this.model.right.createRuntimeExpression(this);
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {
        
        let result = this.left.evalResult.pointerDifference(this.right.evalResult);

        let leftArr = this.left.model.type.isType(ArrayPointer) ? this.left.model.type.arrayObject : null;
        let rightArr = this.right.model.type.isType(ArrayPointer) ? this.right.model.type.arrayObject : null;

        if (result.rawEquals(0)) {
            // If it's the same address, I guess we can let it slide...
        }
        else if (!leftArr && rightArr) {
            this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "The left pointer in this subtraction is not from an array, so the resulting difference is not meaningful.", true);
            result = result.invalidated();
        }
        else if (leftArr && !rightArr) {
            this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "The right pointer in this subtraction is not from an array, so the resulting difference is not meaningful.", true);
            result = result.invalidated();
        }
        else if (leftArr && rightArr && leftArr !== rightArr) {
            this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "The pointers in this subtraction are pointing into two different arrays, so the resulting difference is not meaningful.", true);
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

type t_LogicalBinaryOperators = "&&" | "||";

class LogicalBinaryOperator extends BinaryOperator {
    
    public readonly type = new Bool();

    public readonly left: Expression;
    public readonly right: Expression;

    public readonly operator!: t_LogicalBinaryOperators; // Narrows type from base

    protected constructor(context: ExpressionContext, left: Expression, right: Expression, operator: t_LogicalBinaryOperators) {
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
    
    public createRuntimeExpression(this: CompiledLogicalBinaryOperator, parent: RuntimeConstruct) : RuntimeLogicalBinaryOperator;
    public createRuntimeExpression<T extends AtomicType, V extends ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : never;
    public createRuntimeExpression(this: CompiledLogicalBinaryOperator, parent: RuntimeConstruct) : RuntimeLogicalBinaryOperator {
        return new RuntimeLogicalBinaryOperator(this, parent);
    }

    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }
    
    // public isTailChild(child: CPPConstruct) {
    //     if (child === this.left){
    //         return {isTail: false,
    //             reason: "The right operand of the " + this.operator + " operator may need to be checked if it does not short circuit.",
    //             others: [this.right]
    //         };
    //     }
    //     else{
    //         return {isTail: true,
    //             reason: "Because the " + this.operator + " operator short circuits, the right operand is guaranteed to be evaluated last and its result is used directly (no combination with left side needed)."
    //         };
    //     }
    // }
}


export interface CompiledLogicalBinaryOperator extends LogicalBinaryOperator, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<Bool, "prvalue">
    readonly right: CompiledExpression<Bool, "prvalue">
}

export class RuntimeLogicalBinaryOperator extends RuntimeExpression<Bool, "prvalue", CompiledLogicalBinaryOperator> {

    public left: RuntimeExpression<Bool, "prvalue">;
    public right: RuntimeExpression<Bool, "prvalue">;

    private index = "left";

    private hasShortCircuited?: boolean;

    public constructor (model: CompiledLogicalBinaryOperator, parent: RuntimeConstruct) {
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
            this.hasShortCircuited = this.left.evalResult.rawEquals(shortCircuitReslt);

            if (!this.hasShortCircuited) {
                // only push right child if we have not short circuited
                this.sim.push(this.right);
            }
            this.index = "operate";
        }
	}
	
	protected stepForwardImpl() {
        if (this.hasShortCircuited) {
            this.setEvalResult(this.left.evalResult);
        }
        else {
            this.setEvalResult(this.operate(this.left.evalResult, this.right.evalResult));
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
//         if (this.operand.isIntegralTyped()){
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
//         if (this.operand.isIntegralTyped()){
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

type FunctionResultType<RT extends PotentialReturnType> = NoRefType<Exclude<RT,VoidType>>;
type FunctionVC<RT extends PotentialReturnType> = RT extends ReferenceType ? "lvalue" : "prvalue";

// NOTE: when creating this from AST, operand must be created/compiled
// with addition context including the compiled types of the arguments.
export class FunctionCallExpression extends Expression {
    
    public readonly type?: ObjectType | VoidType;
    public readonly valueCategory?: ValueCategory;

    public readonly operand: Identifier
    public readonly args: readonly Expression[];
    public readonly call?: FunctionCall;

    public constructor(context: ExpressionContext, operand: Identifier, args: readonly Expression[]) {
        super(context);
        
        this.attach(this.operand = operand);
        this.args = args;
        args.forEach((arg) => this.attach(arg))

        // If any arguments are not well typed, we can't select a function.
        if (!allWellTyped(args)) {
            // type, valueCategory, and call remain undefined
            return;
        }

        // Note: contextual parameter and receiver types will have already been set for the operand

        if (!operand.entity) {
            // type, valueCategory, and call remain undefined
            return;
        }

        if (!(operand.entity instanceof FunctionEntity)) {
            // type, valueCategory, and call remain undefined
            this.addNote(CPPError.expr.functionCall.operand(this, operand.entity));
            return;
        }

        this.type = noRef(operand.entity.type.returnType);        

        this.valueCategory = operand.entity.type.returnType instanceof ReferenceType ? "lvalue" : "prvalue";

        // If any of the arguments were not ObjectType, lookup wouldn't have found a function.
        // So the cast below should be fine.
        // TODO: allow member function calls. (or make them a separate class idk)
        this.call = new FunctionCall(context, operand.entity, <readonly TypedExpression<ObjectType, ValueCategory>[]>args);
    }
    
    public createRuntimeExpression<RT extends PotentialReturnType>(this: CompiledFunctionCallExpression<RT>, parent: RuntimeConstruct) : RuntimeFunctionCallExpression<RT>
    public createRuntimeExpression<T extends ObjectType, V extends ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : never;
    public createRuntimeExpression<RT extends PotentialReturnType>(this: CompiledFunctionCallExpression<RT>, parent: RuntimeConstruct) : RuntimeFunctionCallExpression<RT> {
        return new RuntimeFunctionCallExpression(this, parent);
    }

    // TODO
    public describeEvalResult(depth: number): Description {
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
    readonly call: CompiledFunctionCall<RT,FunctionVC<RT>>;
}

const INDEX_FUNCTION_CALL_EXPRESSION_OPERAND = 0;
const INDEX_FUNCTION_CALL_EXPRESSION_CALL = 1;
const INDEX_FUNCTION_CALL_EXPRESSION_RETURN = 2;
export class RuntimeFunctionCallExpression<RT extends PotentialReturnType = PotentialReturnType> extends RuntimeExpression<FunctionResultType<RT>, FunctionVC<RT>, CompiledFunctionCallExpression<RT>> {

    public readonly operand: RuntimeFunctionIdentifier;
    public readonly args: readonly RuntimeExpression[];
    public readonly call: RuntimeFunctionCall<RT,FunctionVC<RT>>;

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
            if (this.model.type instanceof VoidType) {
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
            this.sim.pop();
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



// function identifierToText(unqualifiedId: string) : string;
// function identifierToText(qualId: readonly {identifier: string}[]) : string;
//     function identifierToText(qualId: string | readonly {identifier: string}[]) : string {
//     if (typeof qualId === "string") {
//         return qualId; // If it's an unqualified id
//     }
//     else {
//         return qualId.reduce(function(str,id,i){
//             return str + (i > 0 ? "::" : "") + id.identifier;
//         },"");
//     }
// };

// function qualifiedNameString(names) {
//     if (!Array.isArray(names)){
//         return names;
//     }
//     return names.map(function(id){return id.identifier}).join("::")
// }

// TODO: maybe Identifier should be a non-executable construct and then have a 
// TODO: make separate classes for qualified and unqualified IDs?
export class Identifier extends Expression {

    public readonly type?: ObjectType | FunctionType;
    public readonly valueCategory = "lvalue";
    
    public readonly name: string;
    public readonly contextualParameterTypes?: readonly PotentialParameterType[];
    public readonly contextualReceiverType?: ClassType;

    public readonly entity?: ObjectEntity | FunctionEntity; // TODO: should this be NamedEntity? Does it make a difference?

    public _t_compiled!: CompiledObjectIdentifier | CompiledFunctionIdentifier;

    // i_createFromAST: function(ast, context){

    //     Identifier._parent.i_createFromAST.apply(this, arguments);
    //     this.identifier = this.ast.identifier;
    //     this.identifierText = qualifiedNameString(this.identifier);
    // },

    public constructor(context: ExpressionContext, name: string, contextualParameterTypes?: readonly PotentialParameterType[],
            contextualReceiverType?: ClassType) {
        super(context);
        this.name = name;
        this.contextualParameterTypes = contextualParameterTypes;
        this.contextualReceiverType = contextualReceiverType;
        checkIdentifier(this, name, this);

        this.entity = this.contextualScope.lookup(this.name, {
            kind: "normal",
            paramTypes: this.contextualParameterTypes,
            receiverType: this.contextualReceiverType
        });
        this.type = this.entity && this.entity.type;
    }

    public createRuntimeExpression<T extends ObjectType>(this: CompiledObjectIdentifier<T>, parent: RuntimeConstruct) : RuntimeObjectIdentifier<T>;
    public createRuntimeExpression<T extends FunctionType>(this: CompiledFunctionIdentifier, parent: RuntimeConstruct) : RuntimeFunctionIdentifier;
    public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : never;
    public createRuntimeExpression(parent: RuntimeConstruct) {
        if (this.entity instanceof FunctionEntity) {
            return new RuntimeFunctionIdentifier(<any>this, parent);
        }
        else {
            return new RuntimeObjectIdentifier(<any>this, parent);
        }
    }

    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }

    // describeEvalResult : function(depth, sim, inst){
    //     if (inst && inst.evalResult){
    //         return inst.evalResult.describe();
    //     }
    //     // Note don't care about depth since we always just use identifier
    //     else{
    //         return this.entity.describe(sim, inst);
    //     }
    // },

    // explain : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
    //     return {message: this.entity.name};
    // }
}

export interface CompiledObjectIdentifier<T extends ObjectType = ObjectType> extends Identifier, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly type: T;
    readonly valueCategory: "lvalue";
    readonly entity: ObjectEntity<T>;
}

export interface CompiledFunctionIdentifier extends Identifier, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly type: FunctionType;
    readonly valueCategory: "lvalue";
    readonly entity: FunctionEntity;
}


export class RuntimeObjectIdentifier<T extends ObjectType> extends RuntimeExpression<T, "lvalue", CompiledObjectIdentifier<T>> {

    public constructor (model: CompiledObjectIdentifier<T>, parent: RuntimeConstruct) {
        super(model, parent);
    }

	protected upNextImpl() {
        this.setEvalResult(<VCResultTypes<T, "lvalue">>this.model.entity.runtimeLookup(this));
        this.sim.pop();
    }

    protected stepForwardImpl(): void {
        // do nothing
    }
}

export class RuntimeFunctionIdentifier extends RuntimeExpression<FunctionType, "lvalue", CompiledFunctionIdentifier> {

    public constructor (model: CompiledFunctionIdentifier, parent: RuntimeConstruct) {
        super(model, parent);
    }

	protected upNextImpl() {
        this.setEvalResult(this.model.entity);
    }

    protected stepForwardImpl(): void {
        // do nothing
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
//         let receiver = inst.containingRuntimeFunction!.receiver;
//         inst.setEvalResult(Value.instance(receiver.address, Types.ObjectPointer.instance(receiver)));
//         this.done(sim, inst);
//     }
// });

// export var EntityExpression  = Expression.extend({
//     _name: "EntityExpression",
//     valueCategory: "lvalue",
//     init : function(entity, ast, context){
//         this.initParent(ast, context);
//         this.entity = entity;
//         this.type = this.entity.type;
//     },
//     compile : function(){

//     },
//     upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         inst.setEvalResult(this.entity.runtimeLookup(sim, inst));
//         this.done(sim, inst);
//     }
// });



// export var AuxiliaryExpression  = Expression.extend({
//     _name: "AuxiliaryExpression",
//     valueCategory: "prvalue",
//     init : function(type){
//         this.initParent(null, null);
//         this.type = type
//     },
//     compile : function(){
//         // Do nothing
//     }
// });





function parseCPPChar(litValue: string){
    return escapeString(litValue).charCodeAt(0);
};

var literalJSParse : {[index:string]: (a: any) => RawValueType}= {
	"int": parseInt,
	"float": parseFloat,
    "double": parseFloat,
    "bool" : function(b) {return b ? 1 : 0;},
    "char": parseCPPChar
};

var literalTypes = {
	"int": Int,
	"float": Float,
	"double": Double,
    "bool": Bool,
    "char" : Char
};

export interface NumericLiteralASTNode extends ExpressionASTNode {
    value: number
}

export class NumericLiteral<T extends ArithmeticType = ArithmeticType> extends Expression {
    

    public readonly type: T;
    public readonly valueCategory = "prvalue";


    
    public readonly value: Value<T>;

    // create from ast code:
    // TODO: are there some literal types without conversion functions? There shouldn't be...

    // var conv = literalJSParse[this.ast.type];
    // var val = (conv ? conv(this.ast.value) : this.ast.value);


    constructor(context: ExpressionContext, type: T, value: RawValueType) {
        super(context);

        this.type = type;

        this.value = new Value(value, this.type);  //TODO fix this (maybe with a factory function for values?)
	}

    public createRuntimeExpression<T extends ArithmeticType>(this: CompiledNumericLiteral<T>, parent: RuntimeConstruct) : RuntimeNumericLiteral<T>;
    public createRuntimeExpression<T extends AtomicType, V extends ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : never;
    public createRuntimeExpression<T extends ArithmeticType>(this: CompiledNumericLiteral<T>, parent: RuntimeConstruct) : RuntimeNumericLiteral<T> {
        return new RuntimeNumericLiteral(this, parent);
    }

    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }


    // describeEvalResult : function(depth, sim, inst){
    //     var str = this.value.toString();
    //     return {name: str, message: str};
    // }
	
//	stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//		this.done(sim, inst);
//		return true;
//	}
}

export interface CompiledNumericLiteral<T extends ArithmeticType = ArithmeticType> extends NumericLiteral<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export class RuntimeNumericLiteral<T extends ArithmeticType = ArithmeticType> extends RuntimeExpression<T, "prvalue", CompiledNumericLiteral<T>> {

    public constructor (model: CompiledNumericLiteral<T>, parent: RuntimeConstruct) {
        super(model, parent);
    }

	protected upNextImpl() {
        this.setEvalResult(<VCResultTypes<T, "prvalue">>this.model.value);
        this.sim.pop();
	}
	
	protected stepForwardImpl() {
        // Do nothing
	}
}

// export class StringLiteral extends Expression {
//     public valueCategory: string;
//     public type: Type;
//     public createRuntimeExpression(parent: RuntimeConstruct<CPPConstruct>): RuntimeExpressionBase<Expression> {
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

export class Parentheses extends Expression {

    public readonly type?: Type;
    public readonly valueCategory?: ValueCategory;

    public readonly subexpression: Expression;

    public readonly _t_compiled!: CompiledParentheses;

    public constructor(context: ExpressionContext, subexpression: Expression) {
        super(context);

        this.attach(this.subexpression = subexpression);
        this.type = subexpression.type;
        this.valueCategory = subexpression.valueCategory;

    }


    public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledParentheses<T,V>, parent: RuntimeConstruct) : RuntimeParentheses<T,V>;
    public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledExpression<T,V>, parent: RuntimeConstruct) : never;
    public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledParentheses<T,V>, parent: RuntimeConstruct) : RuntimeParentheses<T,V> {
        return new RuntimeParentheses(this, parent);
    }

    public describeEvalResult(depth: number): Description {
        throw new Error("Method not implemented.");
    }

    // isTailChild : function(child){
    //     return {isTail: true};
    // }
}


// TODO: should these interface definitions have "public" in them? what is best style?
export interface CompiledParentheses<T extends Type = Type, V extends ValueCategory = ValueCategory> extends Parentheses, SuccessfullyCompiled {
    
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly type: T;
    readonly valueCategory: V;

    readonly subexpression: CompiledExpression<T,V>;
}

const INDEX_PARENTHESES_SUBEXPRESSIONS = 0;
const INDEX_PARENTHESES_DONE = 1;
export class RuntimeParentheses<T extends Type = Type, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T,V, CompiledParentheses<T,V>> {

    public subexpression: RuntimeExpression<T,V>;

    private index : typeof INDEX_PARENTHESES_SUBEXPRESSIONS | typeof INDEX_PARENTHESES_DONE = INDEX_PARENTHESES_SUBEXPRESSIONS;

    public constructor (model: CompiledParentheses<T,V>, parent: RuntimeConstruct) {
        super(model, parent);
        this.subexpression = this.model.subexpression.createRuntimeExpression(this);
    }

	protected upNextImpl() {
        if (this.index === INDEX_PARENTHESES_SUBEXPRESSIONS) {
            this.sim.push(this.subexpression);
            this.index = INDEX_PARENTHESES_DONE;
        }
        else {
            this.setEvalResult(this.subexpression.evalResult);
            this.sim.pop();
        }
	}
	
	protected stepForwardImpl() {
        // Do nothing
	}
}

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
