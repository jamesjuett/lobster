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
var Simulation_1 = require("./Simulation");
var types_1 = require("./types");
var constructs_1 = require("./constructs");
var errors_1 = require("./errors");
var entities_1 = require("./entities");
var runtimeEnvironment_1 = require("./runtimeEnvironment");
var util_1 = require("../util/util");
var functions_1 = require("./functions");
var standardConversions_1 = require("./standardConversions");
var lexical_1 = require("./lexical");
function readValueWithAlert(obj, sim) {
    var value = obj.readValue();
    if (!value.isValid) {
        var objDesc = obj.describe();
        var msg = "The value you just got out of " + (objDesc.name || objDesc.message) + " isn't valid. It might be uninitialized or it could have come from a dead object.";
        if (value.rawValue === 0) {
            msg += "\n\n(Note: The value just happens to be zero. Don't be fooled! Uninitialized memory isn't guaranteed to be zero.)";
        }
        sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, msg, true);
    }
    return value;
}
exports.readValueWithAlert = readValueWithAlert;
;
var ExpressionConstructsMap = {
    "comma_expression": function (ast, context) { return CommaExpression.createFromAST(ast, context); },
    "ternary_expression": function (ast, context) { return TernaryExpression.createFromAST(ast, context); },
    "assignment_expression": function (ast, context) { return AssignmentExpression.createFromAST(ast, context); },
    "compound_assignment_expression": function (ast, context) { return new UnsupportedExpression(context, "compound assignment").setAST(ast); },
    // binary operators
    "arithmetic_binary_operator_expression": function (ast, context) { return ArithmeticBinaryOperatorExpression.createFromAST(ast, context); },
    "relational_binary_operator_expression": function (ast, context) { return RelationalBinaryOperator.createFromAST(ast, context); },
    "logical_binary_operator_expression": function (ast, context) { return LogicalBinaryOperator.createFromAST(ast, context); },
    "pointer_to_member_expression": function (ast, context) { return new UnsupportedExpression(context, "pointer-to-member").setAST(ast); },
    "c_style_cast_expression": function (ast, context) { return new UnsupportedExpression(context, "c-style cast").setAST(ast); },
    // prefix operators
    "prefix_increment_expression": function (ast, context) { return new UnsupportedExpression(context, "prefix increment").setAST(ast); },
    "prefix_decrement_expression": function (ast, context) { return new UnsupportedExpression(context, "prefix decrement").setAST(ast); },
    "dereference_expression": function (ast, context) { return new UnsupportedExpression(context, "dereference").setAST(ast); },
    "address_of_expression": function (ast, context) { return new UnsupportedExpression(context, "address-of").setAST(ast); },
    "unary_plus_expression": function (ast, context) { return new UnsupportedExpression(context, "unary plus").setAST(ast); },
    "unary_minus_expression": function (ast, context) { return new UnsupportedExpression(context, "unary minus").setAST(ast); },
    "logical_not_expression": function (ast, context) { return new UnsupportedExpression(context, "logical not").setAST(ast); },
    "bitwise_not_expression": function (ast, context) { return new UnsupportedExpression(context, "bitwise not").setAST(ast); },
    "sizeof_expression": function (ast, context) { return new UnsupportedExpression(context, "sizeof").setAST(ast); },
    "sizeof_type_expression": function (ast, context) { return new UnsupportedExpression(context, "sizeof (type)").setAST(ast); },
    "new_expression": function (ast, context) { return new UnsupportedExpression(context, "new").setAST(ast); },
    "delete_expression": function (ast, context) { return new UnsupportedExpression(context, "delete").setAST(ast); },
    "delete_array_expression": function (ast, context) { return new UnsupportedExpression(context, "delete[]").setAST(ast); },
    // postfix operators
    "static_cast_expression": function (ast, context) { return new UnsupportedExpression(context, "static cast").setAST(ast); },
    "dynamic_cast_expression": function (ast, context) { return new UnsupportedExpression(context, "dynamic cast").setAST(ast); },
    "reinterpret_cast_expression": function (ast, context) { return new UnsupportedExpression(context, "reinterpret cast").setAST(ast); },
    "const_cast_expression": function (ast, context) { return new UnsupportedExpression(context, "const cast").setAST(ast); },
    "subscript_expression": function (ast, context) { return new UnsupportedExpression(context, "subscript").setAST(ast); },
    "function_call_expression": function (ast, context) { return FunctionCallExpression.createFromAST(ast, context); },
    "dot_expression": function (ast, context) { return new UnsupportedExpression(context, "dot operator").setAST(ast); },
    "arrow_expression": function (ast, context) { return new UnsupportedExpression(context, "arrow operator").setAST(ast); },
    "postfix_increment_expression": function (ast, context) { return new UnsupportedExpression(context, "postfix increment").setAST(ast); },
    "postfix_decrement_expression": function (ast, context) { return new UnsupportedExpression(context, "postfix decrement").setAST(ast); },
    "construct_expression": function (ast, context) { return new UnsupportedExpression(context, "construct expression").setAST(ast); },
    "identifier_expression": function (ast, context) { return IdentifierExpression.createFromAST(ast, context); },
    "this_expression": function (ast, context) { return new UnsupportedExpression(context, "this pointer").setAST(ast); },
    "numeric_literal": function (ast, context) { return NumericLiteral.createFromAST(ast, context); },
};
function createExpressionFromAST(ast, context) {
    return ExpressionConstructsMap[ast.construct_type](ast, context);
}
exports.createExpressionFromAST = createExpressionFromAST;
function createExpressionContext(context, contextualParameterTypes) {
    return Object.assign({}, context, { contextualParameterTypes: contextualParameterTypes });
}
exports.createExpressionContext = createExpressionContext;
var Expression = /** @class */ (function (_super) {
    __extends(Expression, _super);
    function Expression(context) {
        var _this = _super.call(this, context) || this;
        _this.conversionLength = 0;
        return _this;
    }
    Expression.prototype.isWellTyped = function () {
        return !!this.type && !!this.valueCategory;
    };
    Expression.prototype.isTyped = function (ctor) {
        return !!this.type && this.type.isType(ctor);
    };
    Expression.prototype.isObjectTyped = function () {
        return !!this.type && this.type.isObjectType();
    };
    Expression.prototype.isAtomicTyped = function () {
        return !!this.type && this.type.isAtomicType();
    };
    Expression.prototype.isArithmeticTyped = function () {
        return !!this.type && this.type.isArithmeticType();
    };
    Expression.prototype.isIntegralTyped = function () {
        return !!this.type && this.type.isIntegralType();
    };
    Expression.prototype.isFloatingPointTyped = function () {
        return !!this.type && this.type.isFloatingPointType();
    };
    Expression.prototype.isPointerTyped = function () {
        return !!this.type && this.type.isPointerType();
    };
    Expression.prototype.isReferenceTyped = function () {
        return !!this.type && this.type.isReferenceType();
    };
    Expression.prototype.isClassTyped = function () {
        return !!this.type && this.type.isClassType();
    };
    Expression.prototype.isBoundedArrayTyped = function () {
        return !!this.type && this.type.isBoundedArrayType();
    };
    Expression.prototype.isArrayOfUnknownBoundTyped = function () {
        return !!this.type && this.type.isArrayOfUnknownBoundType();
    };
    Expression.prototype.isGenericArrayTyped = function () {
        return !!this.type && this.type.isGenericArrayType();
    };
    Expression.prototype.isPrvalue = function () {
        return this.valueCategory === "prvalue";
    };
    Expression.prototype.isLvalue = function () {
        return this.valueCategory === "lvalue";
    };
    // public isSuccessfullyCompiled() : this is Compiled<this> {
    //     return !this.hasErrors;
    // }
    Expression.prototype.isTailChild = function (child) {
        return { isTail: false };
    };
    return Expression;
}(constructs_1.PotentialFullExpression));
exports.Expression = Expression;
function allWellTyped(expressions) {
    return expressions.every(function (expr) { return expr.isWellTyped(); });
}
exports.allWellTyped = allWellTyped;
function allObjectTyped(expressions) {
    return expressions.every(function (expr) { return expr.isObjectTyped(); });
}
exports.allObjectTyped = allObjectTyped;
// : { // Otherwise, T is NOT possibly an ObjectType. This could happen with e.g. an lvalue expression that yields a function
//     readonly prvalue: number;
//     readonly xvalue: number;
//     readonly lvalue: number;
// };
var RuntimeExpression = /** @class */ (function (_super) {
    __extends(RuntimeExpression, _super);
    function RuntimeExpression(model, parent) {
        return _super.call(this, model, "expression", parent) || this;
    }
    RuntimeExpression.prototype.setEvalResult = function (value) {
        this.evalResult = value;
    };
    return RuntimeExpression;
}(constructs_1.RuntimePotentialFullExpression));
exports.RuntimeExpression = RuntimeExpression;
var UnsupportedExpression = /** @class */ (function (_super) {
    __extends(UnsupportedExpression, _super);
    function UnsupportedExpression(context, unsupportedName) {
        var _this = _super.call(this, context) || this;
        _this.type = undefined;
        _this.valueCategory = undefined;
        _this.addNote(errors_1.CPPError.lobster.unsupported_feature(_this, unsupportedName));
        return _this;
    }
    // Will never be called since an UnsupportedExpression will always have errors and
    // never satisfy the required this context of CompiledExpression
    UnsupportedExpression.prototype.createRuntimeExpression = function (parent) {
        throw new Error("Cannot create a runtime instance of an unsupported construct.");
    };
    UnsupportedExpression.prototype.describeEvalResult = function (depth) {
        return {
            message: "an unsupported expression"
        };
    };
    return UnsupportedExpression;
}(Expression));
exports.UnsupportedExpression = UnsupportedExpression;
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
var SimpleRuntimeExpression = /** @class */ (function (_super) {
    __extends(SimpleRuntimeExpression, _super);
    function SimpleRuntimeExpression(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.index = 0;
        // Note: this is RuntimeConstruct rather than RuntimeExpression, because RuntimeExpression is implicitly
        //       RuntimeExpression<Type, ValueCategory> and particular instantiations may not
        _this.subexpressions = [];
        return _this;
    }
    SimpleRuntimeExpression.prototype.setSubexpressions = function (subexpressions) {
        this.subexpressions = subexpressions;
    };
    SimpleRuntimeExpression.prototype.upNextImpl = function () {
        if (this.index === 0) { // subexpressions
            // push subexpressions in reverse order since it's a stack
            for (var i = this.subexpressions.length - 1; i >= 0; --i) {
                this.sim.push(this.subexpressions[i]);
            }
            this.index = 1; // operate
        }
    };
    SimpleRuntimeExpression.prototype.stepForwardImpl = function () {
        this.operate();
        this.done();
        // TODO: how do expressions pop themselves?
    };
    return SimpleRuntimeExpression;
}(RuntimeExpression));
exports.SimpleRuntimeExpression = SimpleRuntimeExpression;
var CommaExpression = /** @class */ (function (_super) {
    __extends(CommaExpression, _super);
    function CommaExpression(context, left, right) {
        var _this = _super.call(this, context) || this;
        _this.type = right.type;
        _this.valueCategory = right.valueCategory;
        _this.attach(_this.left = left);
        _this.attach(_this.right = right);
        return _this;
    }
    CommaExpression.createFromAST = function (ast, context) {
        return new CommaExpression(context, createExpressionFromAST(ast.left, context), createExpressionFromAST(ast.right, context));
    };
    // public isSuccessfullyCompiled(): this is Comma<true> {
    //     return !this.hasErrors;
    // }
    CommaExpression.prototype.createRuntimeExpression = function (parent) {
        return new RuntimeComma(this, parent);
    };
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
    CommaExpression.prototype.describeEvalResult = function (depth) {
        return this.right.describeEvalResult(depth);
    };
    // TODO: what is this for?
    CommaExpression.constructKind = Symbol("Comma");
    return CommaExpression;
}(Expression));
exports.CommaExpression = CommaExpression;
var RuntimeComma = /** @class */ (function (_super) {
    __extends(RuntimeComma, _super);
    function RuntimeComma(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.right = _this.model.right.createRuntimeExpression(_this);
        _this.left = _this.model.left.createRuntimeExpression(_this);
        _this.setSubexpressions([_this.left, _this.right]);
        return _this;
    }
    RuntimeComma.prototype.operate = function () {
        this.setEvalResult(this.right.evalResult);
    };
    return RuntimeComma;
}(SimpleRuntimeExpression));
exports.RuntimeComma = RuntimeComma;
var TernaryExpression = /** @class */ (function (_super) {
    __extends(TernaryExpression, _super);
    function TernaryExpression(context, condition, then, otherwise) {
        var _a;
        var _this = _super.call(this, context) || this;
        if (condition.isWellTyped()) {
            condition = _this.compileCondition(condition);
        }
        if (then.isWellTyped() && otherwise.isWellTyped()) {
            (_a = _this.compileConsequences(then, otherwise), then = _a.then, otherwise = _a.otherwise);
        }
        _this.attach(_this.condition = condition);
        _this.attach(_this.then = then);
        _this.attach(_this.otherwise = otherwise);
        _this.type = then.type;
        _this.valueCategory = then.valueCategory;
        return _this;
    }
    TernaryExpression.createFromAST = function (ast, context) {
        return new TernaryExpression(context, createExpressionFromAST(ast.condition, context), createExpressionFromAST(ast.then, context), createExpressionFromAST(ast.otherwise, context));
    };
    TernaryExpression.prototype.compileCondition = function (condition) {
        condition = standardConversions_1.standardConversion(condition, new types_1.Bool());
        if (!types_1.isType(condition.type, types_1.Bool)) {
            this.addNote(errors_1.CPPError.expr.ternary.condition_bool(condition, condition.type));
        }
        return condition;
    };
    TernaryExpression.prototype.compileConsequences = function (then, otherwise) {
        // If one of the expressions is a prvalue, attempt to make the other one as well
        if (then.isPrvalue() && otherwise.isLvalue()) {
            otherwise = standardConversions_1.convertToPRValue(otherwise);
        }
        else if (otherwise.isPrvalue() && then.isLvalue()) {
            then = standardConversions_1.convertToPRValue(then);
        }
        if (!types_1.sameType(then.type, otherwise.type)) {
            this.addNote(errors_1.CPPError.lobster.ternarySameType(this, then.type, otherwise.type));
        }
        if (types_1.isType(then.type, types_1.VoidType) || types_1.isType(otherwise.type, types_1.VoidType)) {
            this.addNote(errors_1.CPPError.lobster.ternaryNoVoid(this));
        }
        if (then.valueCategory !== otherwise.valueCategory) {
            this.addNote(errors_1.CPPError.expr.ternary.sameValueCategory(this));
        }
        return { then: then, otherwise: otherwise };
    };
    TernaryExpression.prototype.createRuntimeExpression = function (parent) {
        return new RuntimeTernary(this, parent);
    };
    // TODO
    TernaryExpression.prototype.describeEvalResult = function (depth) {
        throw new Error("Method not implemented.");
    };
    return TernaryExpression;
}(Expression));
exports.TernaryExpression = TernaryExpression;
var RuntimeTernary = /** @class */ (function (_super) {
    __extends(RuntimeTernary, _super);
    function RuntimeTernary(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.index = "condition";
        _this.condition = _this.model.condition.createRuntimeExpression(_this);
        _this.then = _this.model.then.createRuntimeExpression(_this);
        _this.otherwise = _this.model.otherwise.createRuntimeExpression(_this);
        return _this;
    }
    RuntimeTernary.prototype.upNextImpl = function () {
        if (this.index === "condition") {
            this.sim.push(this.condition);
            this.index = "branch";
        }
        else if (this.index === "branch") {
            if (this.condition.evalResult.rawValue) {
                this.sim.push(this.then);
            }
            else {
                this.sim.push(this.otherwise);
            }
            this.index = "operate";
        }
    };
    RuntimeTernary.prototype.stepForwardImpl = function () {
        this.setEvalResult(this.then ? this.then.evalResult : this.otherwise.evalResult);
        this.sim.pop();
    };
    return RuntimeTernary;
}(RuntimeExpression));
exports.RuntimeTernary = RuntimeTernary;
var AssignmentExpression = /** @class */ (function (_super) {
    __extends(AssignmentExpression, _super);
    // public readonly _t_compiled!: CompiledAssignment;
    function AssignmentExpression(context, lhs, rhs) {
        var _this = _super.call(this, context) || this;
        _this.valueCategory = "lvalue";
        // If the lhs/rhs doesn't have a type or VC, the rest of the analysis doesn't make much sense.
        if (!lhs.isWellTyped() || !rhs.isWellTyped()) {
            _this.attach(_this.lhs = lhs);
            _this.attach(_this.rhs = rhs);
            return _this;
        }
        rhs = standardConversions_1.standardConversion(rhs, lhs.type.cvUnqualified());
        if (lhs.valueCategory && lhs.valueCategory != "lvalue") {
            _this.addNote(errors_1.CPPError.expr.assignment.lhs_lvalue(_this));
        }
        // TODO: add a check for a modifiable type (e.g. an array type is not modifiable)
        if (lhs.type.isConst) {
            _this.addNote(errors_1.CPPError.expr.assignment.lhs_const(_this));
        }
        if (rhs.isWellTyped() && !types_1.sameType(rhs.type, lhs.type.cvUnqualified())) {
            _this.addNote(errors_1.CPPError.expr.assignment.convert(_this, lhs, rhs));
        }
        // TODO: do we need to check that lhs is an AtomicType? or is that necessary given all the other checks?
        _this.type = lhs.type;
        _this.attach(_this.lhs = lhs);
        _this.attach(_this.rhs = rhs);
        return _this;
    }
    AssignmentExpression.createFromAST = function (ast, context) {
        return new AssignmentExpression(context, createExpressionFromAST(ast.lhs, context), createExpressionFromAST(ast.rhs, context));
    };
    AssignmentExpression.prototype.createRuntimeExpression = function (parent) {
        return new RuntimeAssignment(this, parent);
    };
    // TODO
    AssignmentExpression.prototype.describeEvalResult = function (depth) {
        throw new Error("Method not implemented.");
    };
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
    AssignmentExpression.prototype.isTailChild = function (child) {
        return { isTail: false,
            reason: "The assignment itself will happen after the recursive call returns.",
            others: [this]
        };
    };
    AssignmentExpression.prototype.explain = function (sim, rtConstruct) {
        var lhs = this.lhs.describeEvalResult(0);
        var rhs = this.rhs.describeEvalResult(0);
        return { message: "The value of " + (rhs.name || rhs.message) + " will be assigned to " + (lhs.name || lhs.message) + "." };
    };
    return AssignmentExpression;
}(Expression));
exports.AssignmentExpression = AssignmentExpression;
var RuntimeAssignment = /** @class */ (function (_super) {
    __extends(RuntimeAssignment, _super);
    function RuntimeAssignment(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.lhs = _this.model.lhs.createRuntimeExpression(_this);
        _this.rhs = _this.model.rhs.createRuntimeExpression(_this);
        _this.setSubexpressions([_this.rhs, _this.lhs]);
        return _this;
    }
    RuntimeAssignment.prototype.operate = function () {
        this.lhs.evalResult.writeValue(this.rhs.evalResult);
        this.setEvalResult(this.lhs.evalResult);
    };
    return RuntimeAssignment;
}(SimpleRuntimeExpression));
exports.RuntimeAssignment = RuntimeAssignment;
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
function add(left, right) {
    return left + right;
}
exports.add = add;
function sub(left, right) {
    return left - right;
}
exports.sub = sub;
function mult(left, right) {
    return left * right;
}
exports.mult = mult;
function intDiv(left, right) {
    return Math.trunc(left / right);
}
exports.intDiv = intDiv;
;
function floatDiv(left, right) {
    return left / right;
}
exports.floatDiv = floatDiv;
;
function mod(left, right) {
    return left - intDiv(left, right) * right;
}
exports.mod = mod;
function lt(left, right) {
    return left < right;
}
exports.lt = lt;
function gt(left, right) {
    return left > right;
}
exports.gt = gt;
function lte(left, right) {
    return left <= right;
}
exports.lte = lte;
function gte(left, right) {
    return left >= right;
}
exports.gte = gte;
function eq(left, right) {
    return left == right;
}
exports.eq = eq;
function ne(left, right) {
    return left == right;
}
exports.ne = ne;
function bitAnd(left, right) {
    return left & right;
}
exports.bitAnd = bitAnd;
function bitXor(left, right) {
    return left ^ right;
}
exports.bitXor = bitXor;
function bitOr(left, right) {
    return left | right;
}
exports.bitOr = bitOr;
function bitShiftLeft(left, right) {
    return left << right;
}
exports.bitShiftLeft = bitShiftLeft;
function bitShiftRight(left, right) {
    return left >>> right; // TODO: is the sign preserving bit shift right more consistent with C++?
}
exports.bitShiftRight = bitShiftRight;
var BinaryOperator = /** @class */ (function (_super) {
    __extends(BinaryOperator, _super);
    function BinaryOperator(context, operator) {
        var _this = _super.call(this, context) || this;
        _this.valueCategory = "prvalue";
        _this.operator = operator;
        return _this;
    }
    return BinaryOperator;
}(Expression));
exports.BinaryOperator = BinaryOperator;
// TODO: I think this class shouldn't exist. It should probably just be RuntimeArithmeticBinaryOperator.
// It gives the impression
// that this would be a base for all Runtime classes for binary operators, but it isn't for
// RuntimeLogicalBinaryOperator since that one runs differently to handle short-circuit behavior
// correctly.
var RuntimeBinaryOperator = /** @class */ (function (_super) {
    __extends(RuntimeBinaryOperator, _super);
    function RuntimeBinaryOperator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return RuntimeBinaryOperator;
}(SimpleRuntimeExpression));
exports.RuntimeBinaryOperator = RuntimeBinaryOperator;
// Note: AtomicType here is much wider than needed. T should theoretically only ever be Int, Double, or Float
var ARITHMETIC_BINARY_OPERATIONS = {
    "+": function (left, right) {
        return left.combine(right, add);
    },
    "-": function (left, right) {
        return left.combine(right, sub);
    },
    "*": function (left, right) {
        return left.combine(right, mult);
    },
    "/": function (left, right) {
        if (left.type.isIntegralType()) {
            return left.combine(right, intDiv);
        }
        else {
            return left.combine(right, floatDiv);
        }
    },
    "%": function (left, right) {
        return left.combine(right, mod);
    },
    "&": function (left, right) {
        return left.combine(right, bitAnd);
    },
    "^": function (left, right) {
        return left.combine(right, bitXor);
    },
    "|": function (left, right) {
        return left.combine(right, bitOr);
    },
    "<<": function (left, right) {
        return left.combine(right, bitShiftLeft);
    },
    ">>": function (left, right) {
        return left.combine(right, bitShiftRight);
    }
};
// TODO: make types more specific. ArithmeticBinaryOperator should only be used in cases where it has
// already been determined that both operands have arithmetic type. Either that or it should be used
// in cases where an operator requires arithmetic operands, but not sure. For example, what if someone
// tries to add a pointer type and a class type with the + operator (assuming overloads already checked
// and none found). What TS class do we want to get used, s that the error messages are as good as possible?
// Considering thie and LogicalBinaryOperator together, it actually seems best to create this in a way that
// is based on the operator used and actually allows for improper types. That should result in the most relevant
// error messages. (Of course, overloads are still checked for first, and the specific pointer offset and
// pointer difference cases should also be checked for first. So these are the fallback options.)
var ArithmeticBinaryOperatorExpression = /** @class */ (function (_super) {
    __extends(ArithmeticBinaryOperatorExpression, _super);
    function ArithmeticBinaryOperatorExpression(context, left, right, operator) {
        var _this = _super.call(this, context, operator) || this;
        if (!left.isWellTyped() || !right.isWellTyped()) {
            _this.attach(_this.left = left);
            _this.attach(_this.right = right);
            return _this;
        }
        // Arithmetic types are required
        if (!left.isArithmeticTyped() || !right.isArithmeticTyped()) {
            _this.addNote(errors_1.CPPError.expr.binary.arithmetic_operands(_this, _this.operator, left, right));
            _this.attach(_this.left = left);
            _this.attach(_this.right = right);
            return _this;
        }
        // % operator and shift operators require integral operands
        if ((operator === "%" || operator === "<<" || operator == ">>") &&
            (!left.isIntegralTyped() || !right.isIntegralTyped())) {
            _this.addNote(errors_1.CPPError.expr.binary.arithmetic_operands(_this, _this.operator, left, right));
            _this.attach(_this.left = left);
            _this.attach(_this.right = right);
            return _this;
        }
        var _a = standardConversions_1.usualArithmeticConversions(left, right), convertedLeft = _a[0], convertedRight = _a[1];
        if (!types_1.sameType(convertedLeft.type, convertedRight.type)) {
            _this.addNote(errors_1.CPPError.expr.invalid_binary_operands(_this, _this.operator, convertedLeft, convertedRight));
        }
        _this.type = convertedLeft.type;
        _this.attach(_this.left = convertedLeft);
        _this.attach(_this.right = convertedRight);
        return _this;
    }
    ArithmeticBinaryOperatorExpression.createFromAST = function (ast, context) {
        var left = createExpressionFromAST(ast.left, context);
        var right = createExpressionFromAST(ast.right, context);
        var op = ast.operator;
        // If operator is "-" and both are pointers, it's a pointer difference
        if (op === "-" && (left.isPointerTyped() || left.isBoundedArrayTyped()) && (right.isPointerTyped() || right.isBoundedArrayTyped())) {
            // casts below are necessary because convertToPRValue() overloads can't elegantly
            // handle the union between pointer and array types. Without the casts, we've have
            // to separate this out into the 4 different cases of array/array, array/pointer,
            // pointer/array, pointer/pointer, which would be annoying
            return new PointerDifference(context, standardConversions_1.convertToPRValue(left), standardConversions_1.convertToPRValue(right));
        }
        // If operator is "-" or "+" and it's a combination of pointer plus integer, it's a pointer offset
        if (op === "-" || op === "+") {
            if ((left.isPointerTyped() || left.isBoundedArrayTyped()) && right.isIntegralTyped() ||
                (right.isPointerTyped() || right.isBoundedArrayTyped()) && left.isIntegralTyped()) {
                return new PointerOffset(context, standardConversions_1.convertToPRValue(left), standardConversions_1.convertToPRValue(right));
            }
        }
        return new ArithmeticBinaryOperatorExpression(context, left, right, op);
    };
    ArithmeticBinaryOperatorExpression.prototype.createRuntimeExpression = function (parent) {
        return new RuntimeArithmeticBinaryOperator(this, parent);
    };
    ArithmeticBinaryOperatorExpression.prototype.describeEvalResult = function (depth) {
        throw new Error("Method not implemented.");
    };
    return ArithmeticBinaryOperatorExpression;
}(BinaryOperator));
// TODO: rename this or maybe create two separate classes for Arithmetic and Logical
var RuntimeArithmeticBinaryOperator = /** @class */ (function (_super) {
    __extends(RuntimeArithmeticBinaryOperator, _super);
    function RuntimeArithmeticBinaryOperator(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.left = _this.model.left.createRuntimeExpression(_this);
        _this.right = _this.model.right.createRuntimeExpression(_this);
        _this.setSubexpressions([_this.left, _this.right]);
        return _this;
    }
    RuntimeArithmeticBinaryOperator.prototype.operate = function () {
        // Not sure why the cast here is necessary but apparently Typescript needs it
        this.setEvalResult(ARITHMETIC_BINARY_OPERATIONS[this.model.operator](this.left.evalResult, this.right.evalResult));
    };
    return RuntimeArithmeticBinaryOperator;
}(RuntimeBinaryOperator));
exports.RuntimeArithmeticBinaryOperator = RuntimeArithmeticBinaryOperator;
var PointerDifference = /** @class */ (function (_super) {
    __extends(PointerDifference, _super);
    function PointerDifference(context, left, right) {
        var _this = _super.call(this, context, "-") || this;
        _this.valueCategory = "prvalue";
        // Not necessary assuming they come in as prvalues that are confirmed to have pointer type.
        // if (left.isWellTyped() && right.isWellTyped()) {
        //     left = convertToPRValue(left);
        //     right = convertToPRValue(right);
        // }
        _this.attach(_this.left = left);
        _this.attach(_this.right = right);
        _this.type = new types_1.Int();
        return _this;
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
    PointerDifference.prototype.createRuntimeExpression = function (parent) {
        return new RuntimePointerDifference(this, parent);
    };
    PointerDifference.prototype.describeEvalResult = function (depth) {
        throw new Error("Method not implemented.");
    };
    return PointerDifference;
}(BinaryOperator));
exports.PointerDifference = PointerDifference;
var RuntimePointerDifference = /** @class */ (function (_super) {
    __extends(RuntimePointerDifference, _super);
    function RuntimePointerDifference(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.left = _this.model.left.createRuntimeExpression(_this);
        _this.right = _this.model.right.createRuntimeExpression(_this);
        _this.setSubexpressions([_this.left, _this.right]);
        return _this;
    }
    RuntimePointerDifference.prototype.operate = function () {
        var result = this.left.evalResult.pointerDifference(this.right.evalResult);
        var leftArr = this.left.model.type.isType(types_1.ArrayPointer) ? this.left.model.type.arrayObject : null;
        var rightArr = this.right.model.type.isType(types_1.ArrayPointer) ? this.right.model.type.arrayObject : null;
        if (result.rawEquals(0)) {
            // If it's the same address, I guess we can let it slide...
        }
        else if (!leftArr && rightArr) {
            this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "The left pointer in this subtraction is not from an array, so the resulting difference is not meaningful.", true);
            result = result.invalidated();
        }
        else if (leftArr && !rightArr) {
            this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "The right pointer in this subtraction is not from an array, so the resulting difference is not meaningful.", true);
            result = result.invalidated();
        }
        else if (leftArr && rightArr && leftArr !== rightArr) {
            this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "The pointers in this subtraction are pointing into two different arrays, so the resulting difference is not meaningful.", true);
            result = result.invalidated();
        }
        this.setEvalResult(result);
    };
    return RuntimePointerDifference;
}(RuntimeBinaryOperator));
exports.RuntimePointerDifference = RuntimePointerDifference;
var PointerOffset = /** @class */ (function (_super) {
    __extends(PointerOffset, _super);
    function PointerOffset(context, left, right) {
        var _this = _super.call(this, context, "+") || this;
        // NOT NEEDED ASSUMING THEY COME IN ALREADY WELL TYPED AS APPROPRIATE FOR POINTER OFFSET
        // if (left.isWellTyped() && right.isWellTyped()) {
        //     left = convertToPRValue(left);
        //     right = convertToPRValue(right);
        // }
        _this.attach(_this.left = left);
        _this.attach(_this.right = right);
        if (!left.isWellTyped() || !right.isWellTyped()) {
            return _this;
        }
        if (left.isPointerTyped() && right.isIntegralTyped()) {
            _this.pointerOnLeft = true;
            _this.pointer = left;
            _this.offset = right;
            _this.type = _this.pointer.type;
        }
        else if (left.isIntegralTyped() && right.isPointerTyped()) {
            _this.pointerOnLeft = false;
            _this.pointer = right;
            _this.offset = left;
            _this.type = _this.pointer.type;
        }
        else {
            _this.addNote(errors_1.CPPError.expr.invalid_binary_operands(_this, _this.operator, left, right));
        }
        return _this;
    }
    PointerOffset.prototype.createRuntimeExpression = function (parent) {
        return new RuntimePointerOffset(this, parent);
    };
    PointerOffset.prototype.describeEvalResult = function (depth) {
        throw new Error("Method not implemented.");
    };
    return PointerOffset;
}(BinaryOperator));
exports.PointerOffset = PointerOffset;
var RuntimePointerOffset = /** @class */ (function (_super) {
    __extends(RuntimePointerOffset, _super);
    function RuntimePointerOffset(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.pointer = _this.model.pointer.createRuntimeExpression(_this);
        _this.offset = _this.model.offset.createRuntimeExpression(_this);
        if (model.pointerOnLeft) {
            _this.left = _this.pointer;
            _this.right = _this.offset;
        }
        else {
            _this.left = _this.offset;
            _this.right = _this.pointer;
        }
        _this.setSubexpressions([_this.left, _this.right]);
        return _this;
    }
    RuntimePointerOffset.prototype.operate = function () {
        // code below computes the new address after pointer addition, while preserving RTTI
        //   result = pointer + offset * pointerSize
        var result = this.pointer.evalResult.pointerOffset(this.offset.evalResult);
        this.setEvalResult(result); // not sure why cast is necessary here
        var resultType = result.type;
        if (resultType.isType(types_1.ArrayPointer)) {
            // Check that we haven't run off the array
            if (result.rawValue < resultType.min()) {
                //sim.alert("Oops. That pointer just wandered off the beginning of its array.");
            }
            else if (resultType.onePast() < result.rawValue) {
                //sim.alert("Oops. That pointer just wandered off the end of its array.");
            }
        }
        else {
            // If the RTTI works well enough, this should always be unsafe
            this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "Uh, I don't think you're supposed to do arithmetic with that pointer. It's not pointing into an array.", true);
        }
    };
    return RuntimePointerOffset;
}(RuntimeBinaryOperator));
exports.RuntimePointerOffset = RuntimePointerOffset;
var RELATIONAL_BINARY_OPERATIONS = {
    "<": function (left, right) {
        return left.compare(right, lt);
    },
    ">": function (left, right) {
        return left.compare(right, gt);
    },
    "<=": function (left, right) {
        return left.compare(right, lte);
    },
    ">=": function (left, right) {
        return left.compare(right, gte);
    },
    "==": function (left, right) {
        return left.compare(right, eq);
    },
    "!=": function (left, right) {
        return left.compare(right, ne);
    },
};
var RelationalBinaryOperator = /** @class */ (function (_super) {
    __extends(RelationalBinaryOperator, _super);
    function RelationalBinaryOperator(context, left, right, operator) {
        var _this = _super.call(this, context, operator) || this;
        _this.type = types_1.Bool.BOOL;
        if (!left.isWellTyped() || !right.isWellTyped()) {
            _this.attach(_this.left = left);
            _this.attach(_this.right = right);
            return _this;
        }
        // Arithmetic types are required (note: pointer comparisons have their own PointerRelationalOperation class)
        if (!left.isArithmeticTyped() || !right.isArithmeticTyped()) {
            _this.addNote(errors_1.CPPError.expr.binary.arithmetic_operands(_this, _this.operator, left, right));
            _this.attach(_this.left = left);
            _this.attach(_this.right = right);
            return _this;
        }
        var _a = standardConversions_1.usualArithmeticConversions(left, right), convertedLeft = _a[0], convertedRight = _a[1];
        if (!types_1.sameType(convertedLeft.type, convertedRight.type)) {
            _this.addNote(errors_1.CPPError.expr.invalid_binary_operands(_this, _this.operator, convertedLeft, convertedRight));
        }
        _this.attach(_this.left = convertedLeft);
        _this.attach(_this.right = convertedRight);
        return _this;
    }
    RelationalBinaryOperator.createFromAST = function (ast, context) {
        return new RelationalBinaryOperator(context, createExpressionFromAST(ast.left, context), createExpressionFromAST(ast.right, context), ast.operator);
    };
    RelationalBinaryOperator.prototype.createRuntimeExpression = function (parent) {
        return new RuntimeRelationalBinaryOperator(this, parent);
    };
    RelationalBinaryOperator.prototype.describeEvalResult = function (depth) {
        throw new Error("Method not implemented.");
    };
    return RelationalBinaryOperator;
}(BinaryOperator));
var RuntimeRelationalBinaryOperator = /** @class */ (function (_super) {
    __extends(RuntimeRelationalBinaryOperator, _super);
    function RuntimeRelationalBinaryOperator(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.left = _this.model.left.createRuntimeExpression(_this);
        _this.right = _this.model.right.createRuntimeExpression(_this);
        _this.setSubexpressions([_this.left, _this.right]);
        return _this;
    }
    RuntimeRelationalBinaryOperator.prototype.operate = function () {
        // Not sure why the cast here is necessary but apparently Typescript needs it
        this.setEvalResult(RELATIONAL_BINARY_OPERATIONS[this.model.operator](this.left.evalResult, this.right.evalResult));
    };
    return RuntimeRelationalBinaryOperator;
}(RuntimeBinaryOperator));
exports.RuntimeRelationalBinaryOperator = RuntimeRelationalBinaryOperator;
var LogicalBinaryOperator = /** @class */ (function (_super) {
    __extends(LogicalBinaryOperator, _super);
    function LogicalBinaryOperator(context, left, right, operator) {
        var _this = _super.call(this, context, operator) || this;
        _this.type = new types_1.Bool();
        if (left.isWellTyped() && right.isWellTyped()) {
            _this.attach(_this.left = _this.compileLogicalSubexpression(left));
            _this.attach(_this.right = _this.compileLogicalSubexpression(right));
        }
        else {
            _this.attach(_this.left = left);
            _this.attach(_this.right = right);
        }
        return _this;
    }
    LogicalBinaryOperator.prototype.compileLogicalSubexpression = function (subexpr) {
        subexpr = standardConversions_1.standardConversion(subexpr, types_1.Bool.BOOL);
        if (!types_1.isType(subexpr.type, types_1.Bool)) {
            this.addNote(errors_1.CPPError.expr.binary.boolean_operand(this, this.operator, subexpr));
        }
        return subexpr;
    };
    LogicalBinaryOperator.createFromAST = function (ast, context) {
        return new LogicalBinaryOperator(context, createExpressionFromAST(ast.left, context), createExpressionFromAST(ast.right, context), ast.operator);
    };
    LogicalBinaryOperator.prototype.createRuntimeExpression = function (parent) {
        return new RuntimeLogicalBinaryOperator(this, parent);
    };
    LogicalBinaryOperator.prototype.describeEvalResult = function (depth) {
        throw new Error("Method not implemented.");
    };
    return LogicalBinaryOperator;
}(BinaryOperator));
var RuntimeLogicalBinaryOperator = /** @class */ (function (_super) {
    __extends(RuntimeLogicalBinaryOperator, _super);
    function RuntimeLogicalBinaryOperator(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.index = "left";
        _this.left = _this.model.left.createRuntimeExpression(_this);
        _this.right = _this.model.right.createRuntimeExpression(_this);
        return _this;
    }
    RuntimeLogicalBinaryOperator.prototype.upNextImpl = function () {
        if (this.index === "left") {
            this.sim.push(this.left);
            this.index = "right";
        }
        else if (this.index === "right") {
            var shortCircuitReslt = this.model.operator === "&&" ? 0 : 1;
            this.hasShortCircuited = this.left.evalResult.rawEquals(shortCircuitReslt);
            if (!this.hasShortCircuited) {
                // only push right child if we have not short circuited
                this.sim.push(this.right);
            }
            this.index = "operate";
        }
    };
    RuntimeLogicalBinaryOperator.prototype.stepForwardImpl = function () {
        if (this.hasShortCircuited) {
            this.setEvalResult(this.left.evalResult);
        }
        else {
            this.setEvalResult(this.operate(this.left.evalResult, this.right.evalResult));
        }
        this.sim.pop();
    };
    RuntimeLogicalBinaryOperator.prototype.operate = function (left, right) {
        var _this = this;
        return left.combine(right, function (a, b) {
            return _this.model.operator == "&&" ? a && b : a || b;
        });
    };
    return RuntimeLogicalBinaryOperator;
}(RuntimeExpression));
exports.RuntimeLogicalBinaryOperator = RuntimeLogicalBinaryOperator;
// NOTE: when creating this from AST, operand must be created/compiled
// with addition context including the compiled types of the arguments.
var FunctionCallExpression = /** @class */ (function (_super) {
    __extends(FunctionCallExpression, _super);
    function FunctionCallExpression(context, operand, args) {
        var _this = _super.call(this, context) || this;
        _this.attach(_this.operand = operand);
        _this.args = args;
        args.forEach(function (arg) { return _this.attach(arg); });
        // If any arguments are not well typed, we can't select a function.
        if (!allWellTyped(args)) {
            return _this;
        }
        if (!(operand instanceof IdentifierExpression)) {
            _this.addNote(errors_1.CPPError.expr.functionCall.invalid_operand_expression(_this, operand));
            return _this;
        }
        if (!operand.entity) {
            return _this;
        }
        if (!(operand.entity instanceof entities_1.FunctionEntity)) {
            // type, valueCategory, and call remain undefined
            _this.addNote(errors_1.CPPError.expr.functionCall.operand(_this, operand.entity));
            return _this;
        }
        _this.type = types_1.noRef(operand.entity.type.returnType);
        _this.valueCategory = operand.entity.type.returnType instanceof types_1.ReferenceType ? "lvalue" : "prvalue";
        // If any of the arguments were not ObjectType, lookup wouldn't have found a function.
        // So the cast below should be fine.
        // TODO: allow member function calls. (or make them a separate class idk)
        _this.call = new functions_1.FunctionCall(context, operand.entity, args);
        return _this;
    }
    FunctionCallExpression.createFromAST = function (ast, context) {
        var args = ast.args.map(function (arg) { return createExpressionFromAST(arg, context); });
        var contextualParamTypes = args.map(function (arg) { return arg.type; });
        return new FunctionCallExpression(context, createExpressionFromAST(ast.operand, createExpressionContext(context, contextualParamTypes)), args);
    };
    FunctionCallExpression.prototype.createRuntimeExpression = function (parent) {
        return new RuntimeFunctionCallExpression(this, parent);
    };
    // TODO
    FunctionCallExpression.prototype.describeEvalResult = function (depth) {
        throw new Error("Method not implemented.");
    };
    return FunctionCallExpression;
}(Expression));
exports.FunctionCallExpression = FunctionCallExpression;
var INDEX_FUNCTION_CALL_EXPRESSION_OPERAND = 0;
var INDEX_FUNCTION_CALL_EXPRESSION_CALL = 1;
var INDEX_FUNCTION_CALL_EXPRESSION_RETURN = 2;
var RuntimeFunctionCallExpression = /** @class */ (function (_super) {
    __extends(RuntimeFunctionCallExpression, _super);
    function RuntimeFunctionCallExpression(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.index = INDEX_FUNCTION_CALL_EXPRESSION_OPERAND;
        _this.operand = _this.model.operand.createRuntimeExpression(_this);
        _this.args = _this.model.args.map(function (arg) { return arg.createRuntimeExpression(_this); });
        _this.call = _this.model.call.createRuntimeFunctionCall(_this);
        return _this;
    }
    RuntimeFunctionCallExpression.prototype.upNextImpl = function () {
        if (this.index === INDEX_FUNCTION_CALL_EXPRESSION_OPERAND) {
            this.sim.push(this.operand);
            this.index = INDEX_FUNCTION_CALL_EXPRESSION_CALL;
        }
        else if (this.index === INDEX_FUNCTION_CALL_EXPRESSION_CALL) {
            this.sim.push(this.call);
            this.index = INDEX_FUNCTION_CALL_EXPRESSION_RETURN;
            return true;
        }
        else if (this.index === INDEX_FUNCTION_CALL_EXPRESSION_RETURN) {
            if (this.model.type instanceof types_1.VoidType) {
                // this.setEvalResult(null); // TODO: type system won't allow this currently
            }
            if (this.model.isReferenceTyped()) {
                // Return by reference is lvalue and yields the returned object
                this.setEvalResult(this.call.calledFunction.returnObject);
            }
            else if (this.model.isAtomicTyped()) {
                // Return by value of atomic type. In this case, we can look up
                // the value of the return object and use that as the eval result
                var retObj = this.call.calledFunction.returnObject; // I don't understand why Typescript forces the hard cast here
                this.setEvalResult(retObj.getValue());
            }
            else {
                // Return by value of a non-atomic type. In this case, it's still a prvalue
                // but is the temporary object rather than its value.
                this.setEvalResult(this.call.calledFunction.returnObject);
            }
            this.sim.pop();
        }
    };
    RuntimeFunctionCallExpression.prototype.stepForwardImpl = function () {
        // nothing to do
    };
    return RuntimeFunctionCallExpression;
}(RuntimeExpression));
exports.RuntimeFunctionCallExpression = RuntimeFunctionCallExpression;
// TODO: maybe Identifier should be a non-executable construct and then have a 
// TODO: make separate classes for qualified and unqualified IDs?
var IdentifierExpression = /** @class */ (function (_super) {
    __extends(IdentifierExpression, _super);
    // i_createFromAST: function(ast, context){
    //     Identifier._parent.i_createFromAST.apply(this, arguments);
    //     this.identifier = this.ast.identifier;
    //     this.identifierText = qualifiedNameString(this.identifier);
    // },
    function IdentifierExpression(context, name) {
        var _this = _super.call(this, context) || this;
        _this.valueCategory = "lvalue";
        _this.name = name;
        lexical_1.checkIdentifier(_this, name, _this);
        var lookupResult = _this.context.contextualScope.lookup(_this.name);
        if (Array.isArray(lookupResult)) {
            if (lookupResult.length === 1) {
                // Only one function with that name found, so we just grab it.
                // Any errors will be detected later e.g. when a function call is attempted.
                _this.entity = lookupResult[0];
            }
            else {
                // Need to perform overload resolution to select the appropriate function
                // from the function overload group. This depends on contextual parameter types.
                if (_this.context.contextualParameterTypes) {
                    var overloadResult = entities_1.overloadResolution(lookupResult, _this.context.contextualParameterTypes, _this.context.contextualReceiverType);
                    if (overloadResult.selected) {
                        // If a best result has been selected, use that
                        _this.entity = overloadResult.selected;
                    }
                    else {
                        // Otherwise, use the best candidate (it is sorted to the front of the candidates in the result)
                        // The errors that made it non-viable will be picked up later e.g. when a function call is attempted.
                        _this.entity = overloadResult.candidates[0].candidate;
                    }
                }
                else {
                    _this.addNote(errors_1.CPPError.iden.ambiguous(_this, _this.name));
                }
            }
        }
        else {
            _this.entity = lookupResult;
        }
        _this.type = _this.entity && _this.entity.type;
        return _this;
    }
    IdentifierExpression.createFromAST = function (ast, context) {
        return new IdentifierExpression(context, ast.identifier);
    };
    IdentifierExpression.prototype.createRuntimeExpression = function (parent) {
        if (this.entity instanceof entities_1.FunctionEntity) {
            return new RuntimeFunctionIdentifier(this, parent);
        }
        else {
            return new RuntimeObjectIdentifier(this, parent);
        }
    };
    IdentifierExpression.prototype.describeEvalResult = function (depth) {
        throw new Error("Method not implemented.");
    };
    return IdentifierExpression;
}(Expression));
exports.IdentifierExpression = IdentifierExpression;
var RuntimeObjectIdentifier = /** @class */ (function (_super) {
    __extends(RuntimeObjectIdentifier, _super);
    function RuntimeObjectIdentifier(model, parent) {
        return _super.call(this, model, parent) || this;
    }
    RuntimeObjectIdentifier.prototype.upNextImpl = function () {
        this.setEvalResult(this.model.entity.runtimeLookup(this));
        this.sim.pop();
    };
    RuntimeObjectIdentifier.prototype.stepForwardImpl = function () {
        // do nothing
    };
    return RuntimeObjectIdentifier;
}(RuntimeExpression));
exports.RuntimeObjectIdentifier = RuntimeObjectIdentifier;
var RuntimeFunctionIdentifier = /** @class */ (function (_super) {
    __extends(RuntimeFunctionIdentifier, _super);
    function RuntimeFunctionIdentifier(model, parent) {
        return _super.call(this, model, parent) || this;
    }
    RuntimeFunctionIdentifier.prototype.upNextImpl = function () {
        this.setEvalResult(this.model.entity);
    };
    RuntimeFunctionIdentifier.prototype.stepForwardImpl = function () {
        // do nothing
    };
    return RuntimeFunctionIdentifier;
}(RuntimeExpression));
exports.RuntimeFunctionIdentifier = RuntimeFunctionIdentifier;
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
//         let receiver = inst.containingRuntimeFunction.receiver;
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
function parseCPPChar(litValue) {
    return util_1.escapeString(litValue).charCodeAt(0);
}
;
var literalJSParse = {
    "int": parseInt,
    "float": parseFloat,
    "double": parseFloat,
    "bool": function (b) { return (b ? 1 : 0); },
    "char": parseCPPChar
};
var literalTypes = {
    "int": types_1.Int.INT,
    "float": types_1.Double.DOUBLE,
    "double": types_1.Double.DOUBLE,
    "bool": types_1.Bool.BOOL,
    "char": types_1.Char.CHAR
};
function parseNumericLiteralValueFromAST(ast) {
    return literalJSParse[ast.type](ast.value);
}
exports.parseNumericLiteralValueFromAST = parseNumericLiteralValueFromAST;
var NumericLiteral = /** @class */ (function (_super) {
    __extends(NumericLiteral, _super);
    // create from ast code:
    // TODO: are there some literal types without conversion functions? There shouldn't be...
    // var conv = literalJSParse[this.ast.type];
    // var val = (conv ? conv(this.ast.value) : this.ast.value);
    function NumericLiteral(context, type, value) {
        var _this = _super.call(this, context) || this;
        _this.valueCategory = "prvalue";
        _this.type = type;
        _this.value = new runtimeEnvironment_1.Value(value, _this.type); //TODO fix this (maybe with a factory function for values?)
        return _this;
    }
    NumericLiteral.createFromAST = function (ast, context) {
        return new NumericLiteral(context, literalTypes[ast.type], parseNumericLiteralValueFromAST(ast));
    };
    NumericLiteral.prototype.createRuntimeExpression = function (parent) {
        return new RuntimeNumericLiteral(this, parent);
    };
    NumericLiteral.prototype.describeEvalResult = function (depth) {
        throw new Error("Method not implemented.");
    };
    return NumericLiteral;
}(Expression));
exports.NumericLiteral = NumericLiteral;
var RuntimeNumericLiteral = /** @class */ (function (_super) {
    __extends(RuntimeNumericLiteral, _super);
    function RuntimeNumericLiteral(model, parent) {
        return _super.call(this, model, parent) || this;
    }
    RuntimeNumericLiteral.prototype.upNextImpl = function () {
        this.setEvalResult(this.model.value);
        this.sim.pop();
    };
    RuntimeNumericLiteral.prototype.stepForwardImpl = function () {
        // Do nothing
    };
    return RuntimeNumericLiteral;
}(RuntimeExpression));
exports.RuntimeNumericLiteral = RuntimeNumericLiteral;
var Parentheses = /** @class */ (function (_super) {
    __extends(Parentheses, _super);
    function Parentheses(context, subexpression) {
        var _this = _super.call(this, context) || this;
        _this.attach(_this.subexpression = subexpression);
        _this.type = subexpression.type;
        _this.valueCategory = subexpression.valueCategory;
        return _this;
    }
    Parentheses.createFromAST = function (ast, context) {
        return new Parentheses(context, createExpressionFromAST(ast.subexpression, context));
    };
    Parentheses.prototype.createRuntimeExpression = function (parent) {
        return new RuntimeParentheses(this, parent);
    };
    Parentheses.prototype.describeEvalResult = function (depth) {
        throw new Error("Method not implemented.");
    };
    return Parentheses;
}(Expression));
exports.Parentheses = Parentheses;
var INDEX_PARENTHESES_SUBEXPRESSIONS = 0;
var INDEX_PARENTHESES_DONE = 1;
var RuntimeParentheses = /** @class */ (function (_super) {
    __extends(RuntimeParentheses, _super);
    function RuntimeParentheses(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.index = INDEX_PARENTHESES_SUBEXPRESSIONS;
        _this.subexpression = _this.model.subexpression.createRuntimeExpression(_this);
        return _this;
    }
    RuntimeParentheses.prototype.upNextImpl = function () {
        if (this.index === INDEX_PARENTHESES_SUBEXPRESSIONS) {
            this.sim.push(this.subexpression);
            this.index = INDEX_PARENTHESES_DONE;
        }
        else {
            this.setEvalResult(this.subexpression.evalResult);
            this.sim.pop();
        }
    };
    RuntimeParentheses.prototype.stepForwardImpl = function () {
        // Do nothing
    };
    return RuntimeParentheses;
}(RuntimeExpression));
exports.RuntimeParentheses = RuntimeParentheses;
var AUXILIARY_EXPRESSION_CONTEXT = {
    program: undefined,
    translationUnit: undefined,
    contextualScope: undefined
};
var AuxiliaryExpression = /** @class */ (function (_super) {
    __extends(AuxiliaryExpression, _super);
    function AuxiliaryExpression(type, valueCategory) {
        var _this = _super.call(this, AUXILIARY_EXPRESSION_CONTEXT) || this;
        _this.type = type;
        _this.valueCategory = valueCategory;
        return _this;
    }
    AuxiliaryExpression.prototype.createRuntimeExpression = function (parent) {
        throw new Error("Auxiliary expressions must never be instantiated at runtime.");
    };
    AuxiliaryExpression.prototype.describeEvalResult = function (depth) {
        throw new Error("Auxiliary expressions have no description");
    };
    return AuxiliaryExpression;
}(Expression));
exports.AuxiliaryExpression = AuxiliaryExpression;
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
//# sourceMappingURL=expressions.js.map