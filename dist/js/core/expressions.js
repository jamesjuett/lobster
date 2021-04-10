"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeFunctionArrowExpression = exports.RuntimeObjectArrowExpression = exports.ArrowExpression = exports.RuntimeFunctionDotExpression = exports.RuntimeObjectDotExpression = exports.DotExpression = exports.RuntimeSubscriptExpression = exports.SubscriptExpression = exports.RuntimeLogicalNotExpression = exports.LogicalNotExpression = exports.RuntimeUnaryMinusExpression = exports.UnaryMinusExpression = exports.RuntimeUnaryPlusExpression = exports.UnaryPlusExpression = exports.RuntimeAddressOfExpression = exports.AddressOfExpression = exports.RuntimeDereferenceExpression = exports.DereferenceExpression = exports.RuntimePrefixIncrementExpression = exports.PrefixIncrementExpression = exports.RuntimeLogicalBinaryOperatorExpression = exports.LogicalBinaryOperatorExpression = exports.RuntimePointerComparisonExpression = exports.PointerComparisonExpression = exports.RuntimeRelationalBinaryOperator = exports.RelationalBinaryOperatorExpression = exports.RuntimeInputOperatorExpression = exports.InputOperatorExpression = exports.RuntimeOutputOperatorExpression = exports.OutputOperatorExpression = exports.RuntimePointerOffset = exports.PointerOffsetExpression = exports.RuntimePointerDifference = exports.PointerDifferenceExpression = exports.RuntimeArithmeticBinaryOperator = exports.ArithmeticBinaryOperatorExpression = exports.RuntimeCompoundAssignment = exports.CompoundAssignmentExpression = exports.RuntimeAssignment = exports.AssignmentExpression = exports.RuntimeTernary = exports.TernaryExpression = exports.RuntimeComma = exports.CommaExpression = exports.SimpleRuntimeExpression = exports.InvalidExpression = exports.UnsupportedExpression = exports.createRuntimeExpression = exports.createExpressionFromAST = exports.readValueWithAlert = void 0;
exports.RuntimeNonMemberOperatorOverloadExpression = exports.NonMemberOperatorOverloadExpression = exports.selectOperatorOverload = exports.usualArithmeticConversions = exports.isConvertible = exports.isConvertibleToPointer = exports.isIntegerLiteralZero = exports.integralPromotion = exports.standardConversion = exports.qualificationConversion = exports.typeConversion = exports.convertToPRValue = exports.QualificationConversion = exports.FloatingToIntegralConversion = exports.IntegralToFloatingConversion = exports.FloatingPointConversion = exports.FloatingPointPromotion = exports.IntegralConversion = exports.IntegralPromotion = exports.IntegralToBooleanConversion = exports.FloatingToBooleanConversion = exports.PointerToBooleanConversion = exports.ToBooleanConversion = exports.PointerConversion = exports.NullPointerConversion = exports.StreamToBoolConversion = exports.ArrayToPointerConversion = exports.LValueToRValueConversion = exports.RuntimeImplicitConversion = exports.ImplicitConversion = exports.RuntimeMagicFunctionCallExpression = exports.MagicFunctionCallExpression = exports.overloadResolution = exports.AuxiliaryExpression = exports.RuntimeInitializerListExpression = exports.InitializerListExpression = exports.RuntimeParentheses = exports.ParenthesesExpression = exports.RuntimeStringLiteralExpression = exports.StringLiteralExpression = exports.RuntimeNumericLiteral = exports.NumericLiteralExpression = exports.RuntimeThisExpression = exports.ThisExpression = exports.RuntimeFunctionIdentifierExpression = exports.RuntimeObjectIdentifierExpression = exports.entityLookup = exports.IdentifierExpression = exports.RuntimePostfixIncrementExpression = exports.PostfixIncrementExpression = void 0;
exports.InvalidOperatorOverloadExpression = exports.RuntimeMemberOperatorOverloadExpression = exports.MemberOperatorOverloadExpression = void 0;
const objects_1 = require("./objects");
const Simulation_1 = require("./Simulation");
const types_1 = require("./types");
const constructs_1 = require("./constructs");
const errors_1 = require("./errors");
const entities_1 = require("./entities");
const runtimeEnvironment_1 = require("./runtimeEnvironment");
const util_1 = require("../util/util");
const lexical_1 = require("./lexical");
const FunctionCallExpression_1 = require("./FunctionCallExpression");
const expressionBase_1 = require("./expressionBase");
const codeOutlets_1 = require("../view/codeOutlets");
const predicates_1 = require("./predicates");
const opaqueExpression_1 = require("./opaqueExpression");
const FunctionCall_1 = require("./FunctionCall");
const new_delete_1 = require("./new_delete");
const ast_expressions_1 = require("../ast/ast_expressions");
const semantic_equivalence_1 = require("../analysis/semantic_equivalence");
function readValueWithAlert(obj, sim) {
    let value = obj.readValue();
    if (!value.isValid) {
        let objDesc = obj.describe();
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
const ExpressionConstructsMap = {
    "comma_expression": (ast, context) => CommaExpression.createFromAST(ast, context),
    "ternary_expression": (ast, context) => TernaryExpression.createFromAST(ast, context),
    "assignment_expression": (ast, context) => AssignmentExpression.createFromAST(ast, context),
    "compound_assignment_expression": (ast, context) => CompoundAssignmentExpression.createFromAST(ast, context),
    // binary operators
    "arithmetic_binary_operator_expression": (ast, context) => ArithmeticBinaryOperatorExpression.createFromAST(ast, context),
    "relational_binary_operator_expression": (ast, context) => RelationalBinaryOperatorExpression.createFromAST(ast, context),
    "logical_binary_operator_expression": (ast, context) => LogicalBinaryOperatorExpression.createFromAST(ast, context),
    "pointer_to_member_expression": (ast, context) => new UnsupportedExpression(context, ast, "pointer-to-member"),
    "c_style_cast_expression": (ast, context) => new UnsupportedExpression(context, ast, "c-style cast"),
    // prefix operators
    "prefix_increment_expression": (ast, context) => PrefixIncrementExpression.createFromAST(ast, context),
    "dereference_expression": (ast, context) => DereferenceExpression.createFromAST(ast, context),
    "address_of_expression": (ast, context) => AddressOfExpression.createFromAST(ast, context),
    "unary_plus_expression": (ast, context) => UnaryPlusExpression.createFromAST(ast, context),
    "unary_minus_expression": (ast, context) => UnaryMinusExpression.createFromAST(ast, context),
    "logical_not_expression": (ast, context) => LogicalNotExpression.createFromAST(ast, context),
    "bitwise_not_expression": (ast, context) => new UnsupportedExpression(context, ast, "bitwise not"),
    "sizeof_expression": (ast, context) => new UnsupportedExpression(context, ast, "sizeof"),
    "sizeof_type_expression": (ast, context) => new UnsupportedExpression(context, ast, "sizeof (type)"),
    "new_expression": (ast, context) => new_delete_1.createNewExpressionFromAST(ast, context),
    "delete_expression": (ast, context) => new_delete_1.DeleteExpression.createFromAST(ast, context),
    "delete_array_expression": (ast, context) => new_delete_1.DeleteArrayExpression.createFromAST(ast, context),
    // postfix operators
    "static_cast_expression": (ast, context) => new UnsupportedExpression(context, ast, "static cast"),
    "dynamic_cast_expression": (ast, context) => new UnsupportedExpression(context, ast, "dynamic cast"),
    "reinterpret_cast_expression": (ast, context) => new UnsupportedExpression(context, ast, "reinterpret cast"),
    "const_cast_expression": (ast, context) => new UnsupportedExpression(context, ast, "const cast"),
    "subscript_expression": (ast, context) => SubscriptExpression.createFromAST(ast, context),
    "function_call_expression": (ast, context) => FunctionCallExpression_1.FunctionCallExpression.createFromAST(ast, context),
    "dot_expression": (ast, context) => DotExpression.createFromAST(ast, context),
    "arrow_expression": (ast, context) => ArrowExpression.createFromAST(ast, context),
    "postfix_increment_expression": (ast, context) => PostfixIncrementExpression.createFromAST(ast, context),
    "construct_expression": (ast, context) => new UnsupportedExpression(context, ast, "construct expression"),
    "identifier_expression": (ast, context) => IdentifierExpression.createFromAST(ast, context),
    "this_expression": (ast, context) => ThisExpression.createFromAST(ast, context),
    "numeric_literal_expression": (ast, context) => NumericLiteralExpression.createFromAST(ast, context),
    "string_literal_expression": (ast, context) => StringLiteralExpression.createFromAST(ast, context),
    "parentheses_expression": (ast, context) => ParenthesesExpression.createFromAST(ast, context),
    "initializer_list_expression": (ast, context) => InitializerListExpression.createFromAST(ast, context),
    "opaque_expression": (ast, context) => opaqueExpression_1.OpaqueExpression.createFromAST(ast, context)
};
/**
 * Creates an expression construct based on a given expression AST node.
 * If the `ast` argument has a union type that is a subtype of `ExpressionASTNode`,
 * this function's return type is inferred as corresponding union of construct types.
 * @param ast An expression AST node.
 * @param context The context in which this expression occurs.
 */
function createExpressionFromAST(ast, context) {
    if (!ExpressionConstructsMap[ast.construct_type]) {
        console.log("Oops! Can't find expression construct type: " + ast.construct_type);
    }
    return ExpressionConstructsMap[ast.construct_type](ast, context);
}
exports.createExpressionFromAST = createExpressionFromAST;
const ExpressionConstructsRuntimeMap = {
    "unsupported_expression": (construct, parent) => { throw new Error("Cannot create a runtime instance of an unsupported construct."); },
    "invalid_operator_overload_expression": (construct, parent) => { throw new Error("Cannot create a runtime instance of an invalid operator overload expression."); },
    "comma_expression": (construct, parent) => new RuntimeComma(construct, parent),
    "ternary_expression": (construct, parent) => new RuntimeTernary(construct, parent),
    "assignment_expression": (construct, parent) => new RuntimeAssignment(construct, parent),
    "compound_assignment_expression": (construct, parent) => new RuntimeCompoundAssignment(construct, parent),
    "arithmetic_binary_operator_expression": (construct, parent) => new RuntimeArithmeticBinaryOperator(construct, parent),
    "pointer_difference_expression": (construct, parent) => new RuntimePointerDifference(construct, parent),
    "pointer_offset_expression": (construct, parent) => new RuntimePointerOffset(construct, parent),
    "output_operator_expression": (construct, parent) => new RuntimeOutputOperatorExpression(construct, parent),
    "input_operator_expression": (construct, parent) => new RuntimeInputOperatorExpression(construct, parent),
    "relational_binary_operator_expression": (construct, parent) => new RuntimeRelationalBinaryOperator(construct, parent),
    "pointer_comparison_expression": (construct, parent) => new RuntimePointerComparisonExpression(construct, parent),
    "logical_binary_operator_expression": (construct, parent) => new RuntimeLogicalBinaryOperatorExpression(construct, parent),
    "non_member_operator_overload_expression": (construct, parent) => new RuntimeNonMemberOperatorOverloadExpression(construct, parent),
    "member_operator_overload_expression": (construct, parent) => new RuntimeMemberOperatorOverloadExpression(construct, parent),
    "prefix_increment_expression": (construct, parent) => new RuntimePrefixIncrementExpression(construct, parent),
    "dereference_expression": (construct, parent) => new RuntimeDereferenceExpression(construct, parent),
    "address_of_expression": (construct, parent) => new RuntimeAddressOfExpression(construct, parent),
    "new_expression": (construct, parent) => new new_delete_1.RuntimeNewExpression(construct, parent),
    "new_array_expression": (construct, parent) => new new_delete_1.RuntimeNewArrayExpression(construct, parent),
    "delete_expression": (construct, parent) => new new_delete_1.RuntimeDeleteExpression(construct, parent),
    "delete_array_expression": (construct, parent) => new new_delete_1.RuntimeDeleteArrayExpression(construct, parent),
    "this_expression": (construct, parent) => new RuntimeThisExpression(construct, parent),
    "unary_plus_expression": (construct, parent) => new RuntimeUnaryPlusExpression(construct, parent),
    "unary_minus_expression": (construct, parent) => new RuntimeUnaryMinusExpression(construct, parent),
    "logical_not_expression": (construct, parent) => new RuntimeLogicalNotExpression(construct, parent),
    "postfix_increment_expression": (construct, parent) => new RuntimePostfixIncrementExpression(construct, parent),
    "subscript_expression": (construct, parent) => new RuntimeSubscriptExpression(construct, parent),
    "dot_expression": (construct, parent) => {
        if (construct.entity instanceof entities_1.FunctionEntity) {
            return new RuntimeFunctionDotExpression(construct, parent);
        }
        else {
            return new RuntimeObjectDotExpression(construct, parent);
        }
    },
    "arrow_expression": (construct, parent) => {
        if (construct.entity instanceof entities_1.FunctionEntity) {
            return new RuntimeFunctionArrowExpression(construct, parent);
        }
        else {
            return new RuntimeObjectArrowExpression(construct, parent);
        }
    },
    "identifier_expression": (construct, parent) => {
        if (construct.entity instanceof entities_1.FunctionEntity) {
            return new RuntimeFunctionIdentifierExpression(construct, parent);
        }
        else {
            return new RuntimeObjectIdentifierExpression(construct, parent);
        }
    },
    "numeric_literal_expression": (construct, parent) => new RuntimeNumericLiteral(construct, parent),
    "string_literal_expression": (construct, parent) => new RuntimeStringLiteralExpression(construct, parent),
    "parentheses_expression": (construct, parent) => new RuntimeParentheses(construct, parent),
    "initializer_list_expression": (construct, parent) => new RuntimeInitializerListExpression(construct, parent),
    "opaque_expression": (construct, parent) => new opaqueExpression_1.RuntimeOpaqueExpression(construct, parent),
    "auxiliary_expression": (construct, parent) => { throw new Error("Auxiliary expressions must never be instantiated at runtime."); },
    "magic_function_call_expression": (construct, parent) => new RuntimeMagicFunctionCallExpression(construct, parent),
    "function_call_expression": (construct, parent) => new FunctionCallExpression_1.RuntimeFunctionCallExpression(construct, parent),
    "ImplicitConversion": (construct, parent) => construct.createRuntimeExpression(parent)
};
function createRuntimeExpression(construct, parent) {
    return (ExpressionConstructsRuntimeMap[construct.construct_type])(construct, parent);
}
exports.createRuntimeExpression = createRuntimeExpression;
/**
 * An expression not currently supported by Lobster.
 */
class UnsupportedExpression extends expressionBase_1.Expression {
    constructor(context, ast, unsupportedName) {
        super(context, ast);
        this.construct_type = "unsupported_expression";
        this.type = undefined;
        this.valueCategory = undefined;
        this.unsupportedName = unsupportedName;
        this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, unsupportedName));
    }
    createDefaultOutlet(element, parent) {
        throw new Error("Cannot create an outlet for an unsupported construct.");
    }
    describeEvalResult(depth) {
        return {
            message: "an unsupported expression"
        };
    }
    isSemanticallyEquivalent_impl(other, ec) {
        return other.construct_type === this.construct_type
            && other.unsupportedName === this.unsupportedName;
    }
}
exports.UnsupportedExpression = UnsupportedExpression;
/**
 * A flawed expression
 */
class InvalidExpression extends expressionBase_1.Expression {
    constructor(context, ast) {
        super(context, ast);
    }
    createDefaultOutlet(element, parent) {
        throw new Error("Cannot create an outlet for an invalid expression.");
    }
    describeEvalResult(depth) {
        return {
            message: "an unsupported expression"
        };
    }
    isSemanticallyEquivalent_impl(other, ec) {
        return other.construct_type === this.construct_type;
    }
}
exports.InvalidExpression = InvalidExpression;
class SimpleRuntimeExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.index = 0;
        this.subexpressions = [];
    }
    setSubexpressions(subexpressions) {
        util_1.assert(subexpressions.every(subexp => subexp instanceof expressionBase_1.RuntimeExpression));
        this.subexpressions = subexpressions;
    }
    upNextImpl() {
        if (this.index === 0) { // subexpressions
            // push subexpressions in reverse order since it's a stack
            for (let i = this.subexpressions.length - 1; i >= 0; --i) {
                this.sim.push(this.subexpressions[i]);
            }
            this.index = 1; // operate
        }
    }
    stepForwardImpl() {
        this.operate();
        this.startCleanup();
    }
}
exports.SimpleRuntimeExpression = SimpleRuntimeExpression;
class CommaExpression extends expressionBase_1.Expression {
    constructor(context, ast, left, right) {
        super(context, ast);
        this.construct_type = "comma_expression";
        this.type = right.type;
        this.valueCategory = right.valueCategory;
        this.attach(this.left = left);
        this.attach(this.right = right);
    }
    static createFromAST(ast, context) {
        return new CommaExpression(context, ast, createExpressionFromAST(ast.left, context), createExpressionFromAST(ast.right, context));
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.CommaExpressionOutlet(element, this, parent);
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
    describeEvalResult(depth) {
        return this.right.describeEvalResult(depth);
    }
    isSemanticallyEquivalent_impl(other, ec) {
        return other.construct_type === this.construct_type
            && constructs_1.areSemanticallyEquivalent(this.left, other.left, ec)
            && constructs_1.areSemanticallyEquivalent(this.right, other.right, ec);
    }
}
exports.CommaExpression = CommaExpression;
class RuntimeComma extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.right = createRuntimeExpression(this.model.right, this);
        this.left = createRuntimeExpression(this.model.left, this);
        this.setSubexpressions([this.left, this.right]);
    }
    operate() {
        this.setEvalResult(this.right.evalResult);
    }
}
exports.RuntimeComma = RuntimeComma;
class TernaryExpression extends expressionBase_1.Expression {
    constructor(context, ast, condition, then, otherwise) {
        super(context, ast);
        this.construct_type = "ternary_expression";
        if (condition.isWellTyped()) {
            condition = this.compileCondition(condition);
        }
        if (then.isWellTyped() && otherwise.isWellTyped()) {
            ({ then, otherwise } = this.compileConsequences(then, otherwise));
        }
        this.attach(this.condition = condition);
        this.attach(this.then = then);
        this.attach(this.otherwise = otherwise);
        if (then.type && otherwise.type && types_1.sameType(then.type, otherwise.type)) {
            this.type = then.type;
        }
        if (then.valueCategory && then.valueCategory === otherwise.valueCategory) {
            this.valueCategory = then.valueCategory;
        }
    }
    static createFromAST(ast, context) {
        return new TernaryExpression(context, ast, createExpressionFromAST(ast.condition, context), createExpressionFromAST(ast.then, context), createExpressionFromAST(ast.otherwise, context));
    }
    compileCondition(condition) {
        condition = standardConversion(condition, new types_1.Bool());
        if (!types_1.isType(condition.type, types_1.Bool)) {
            this.addNote(errors_1.CPPError.expr.ternary.condition_bool(condition, condition.type));
        }
        return condition;
    }
    compileConsequences(then, otherwise) {
        // If one of the expressions is a prvalue, attempt to make the other one as well
        if (then.isPrvalue() && otherwise.isLvalue()) {
            otherwise = convertToPRValue(otherwise);
        }
        else if (otherwise.isPrvalue() && then.isLvalue()) {
            then = convertToPRValue(then);
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
        return { then, otherwise };
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.TernaryExpressionOutlet(element, this, parent);
    }
    // TODO
    describeEvalResult(depth) {
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
    isSemanticallyEquivalent_impl(other, ec) {
        return other.construct_type === this.construct_type
            && constructs_1.areSemanticallyEquivalent(this.condition, other.condition, ec)
            && constructs_1.areSemanticallyEquivalent(this.then, other.then, ec)
            && constructs_1.areSemanticallyEquivalent(this.otherwise, other.otherwise, ec);
        // TODO semantic equivalence (or reversed logic and switched consequences)
    }
}
exports.TernaryExpression = TernaryExpression;
class RuntimeTernary extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.index = "condition";
        this.condition = createRuntimeExpression(this.model.condition, this);
        this.then = createRuntimeExpression(this.model.then, this);
        this.otherwise = createRuntimeExpression(this.model.otherwise, this);
    }
    upNextImpl() {
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
    }
    stepForwardImpl() {
        this.setEvalResult(this.condition.evalResult.rawValue ? this.then.evalResult : this.otherwise.evalResult);
        this.startCleanup();
    }
}
exports.RuntimeTernary = RuntimeTernary;
class AssignmentExpression extends expressionBase_1.Expression {
    constructor(context, ast, lhs, rhs) {
        super(context, ast);
        this.construct_type = "assignment_expression";
        this.valueCategory = "lvalue";
        // If the rhs doesn't have a type or VC, the rest of the analysis doesn't make much sense.
        if (!lhs.isWellTyped() || !rhs.isWellTyped()) {
            this.attach(this.lhs = lhs);
            this.attach(this.rhs = rhs);
            return;
        }
        if (lhs.valueCategory != "lvalue") {
            this.addNote(errors_1.CPPError.expr.assignment.lhs_lvalue(this));
        }
        let lhsType = lhs.type;
        if (types_1.isPotentiallyCompleteClassType(lhsType)) {
            this.addNote(errors_1.CPPError.expr.assignment.classes_not_assignable(this, lhsType));
        }
        else if (types_1.isPotentiallyCompleteArrayType(lhsType)) {
            this.addNote(errors_1.CPPError.expr.assignment.arrays_not_assignable(this, lhsType));
        }
        else if (types_1.isAtomicType(lhsType)) {
            if (lhsType.isConst) {
                this.addNote(errors_1.CPPError.expr.assignment.lhs_const(this));
            }
        }
        else {
            this.addNote(errors_1.CPPError.expr.assignment.type_not_assignable(this, lhsType));
        }
        rhs = standardConversion(rhs, lhs.type.cvUnqualified());
        if (rhs.isWellTyped() && !types_1.sameType(rhs.type, lhs.type.cvUnqualified())) {
            this.addNote(errors_1.CPPError.expr.assignment.convert(this, lhs, rhs));
        }
        if (types_1.isAtomicType(lhsType)) {
            // A proper assignment may only have atomic type. Anything else is either
            // forbidden (e.g. array assignment) or would be handled by an operator
            // overload instead (e.g. class assignment)
            this.type = lhsType;
        }
        this.attach(this.lhs = lhs);
        this.attach(this.rhs = rhs);
    }
    static createFromAST(ast, context) {
        var _a;
        let lhs = createExpressionFromAST(ast.lhs, context);
        let rhs = createExpressionFromAST(ast.rhs, context);
        // Consider an assignment operator overload if the LHS is class type
        if (predicates_1.Predicates.isTypedExpression(lhs, types_1.isPotentiallyCompleteClassType)) {
            return (_a = selectOperatorOverload(context, ast, "=", [lhs, rhs])) !== null && _a !== void 0 ? _a : new InvalidOperatorOverloadExpression(context, ast, ast.operator, [lhs, rhs]);
        }
        return new AssignmentExpression(context, ast, lhs, rhs);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.AssignmentExpressionOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
    // public isTailChild(child: CPPConstruct) {
    //     return {
    //         isTail: false,
    //         reason: "The assignment itself will happen after the recursive call returns.",
    //         others: [this]
    //     };
    // }
    explain(sim, rtConstruct) {
        var lhs = this.lhs.describeEvalResult(0);
        var rhs = this.rhs.describeEvalResult(0);
        return { message: "The value of " + (rhs.name || rhs.message) + " will be assigned to " + (lhs.name || lhs.message) + "." };
    }
    isSemanticallyEquivalent_impl(other, ec) {
        if (other.construct_type === this.construct_type
            && this.areChildrenSemanticallyEquivalent(other, ec)) {
            return true;
        }
        else if (other.construct_type === "compound_assignment_expression") {
            return semantic_equivalence_1.assignmentEquivalence(this, other, ec);
        }
        return false;
    }
}
exports.AssignmentExpression = AssignmentExpression;
class RuntimeAssignment extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.lhs = createRuntimeExpression(this.model.lhs, this);
        this.rhs = createRuntimeExpression(this.model.rhs, this);
        this.setSubexpressions([this.rhs, this.lhs]);
    }
    operate() {
        this.lhs.evalResult.writeValue(this.rhs.evalResult);
        this.setEvalResult(this.lhs.evalResult);
    }
}
exports.RuntimeAssignment = RuntimeAssignment;
class CompoundAssignmentExpression extends expressionBase_1.Expression {
    constructor(context, ast, lhs, rhs) {
        super(context, ast);
        this.construct_type = "compound_assignment_expression";
        this.valueCategory = "lvalue";
        this.operator = ast.operator;
        this.equivalentBinaryOp = this.operator.slice(0, -1); // remove = which is last char of operator string
        // If the rhs doesn't have a type or VC, the rest of the analysis doesn't make much sense.
        if (!lhs.isWellTyped() || !rhs.isWellTyped()) {
            this.attach(this.lhs = lhs);
            this.attach(this.rhs = rhs);
            return;
        }
        // Arithmetic types are required
        if (!predicates_1.Predicates.isTypedExpression(lhs, types_1.isArithmeticType) || !predicates_1.Predicates.isTypedExpression(rhs, types_1.isArithmeticType)) {
            this.addNote(errors_1.CPPError.expr.binary.arithmetic_operands(this, this.operator, lhs, rhs));
            this.attach(this.lhs = lhs);
            this.attach(this.rhs = rhs);
            return;
        }
        // % operator and shift operators require integral operands
        if ((this.equivalentBinaryOp === "%" || this.equivalentBinaryOp === "<<" || this.equivalentBinaryOp == ">>") &&
            (!predicates_1.Predicates.isTypedExpression(lhs, types_1.isIntegralType) || !predicates_1.Predicates.isTypedExpression(rhs, types_1.isIntegralType))) {
            this.addNote(errors_1.CPPError.expr.binary.integral_operands(this, this.operator, lhs, rhs));
            this.attach(this.lhs = lhs);
            this.attach(this.rhs = rhs);
            return;
        }
        if (lhs.valueCategory != "lvalue") {
            this.addNote(errors_1.CPPError.expr.assignment.lhs_lvalue(this));
        }
        else if (lhs.type.isConst) {
            this.addNote(errors_1.CPPError.expr.assignment.lhs_const(this));
        }
        rhs = standardConversion(rhs, lhs.type.cvUnqualified());
        // TODO: add a check for a modifiable type (e.g. an array type is not modifiable)
        if (lhs.type.isConst) {
            this.addNote(errors_1.CPPError.expr.assignment.lhs_const(this));
        }
        if (rhs.isWellTyped() && !types_1.sameType(rhs.type, lhs.type.cvUnqualified())) {
            this.addNote(errors_1.CPPError.expr.assignment.convert(this, lhs, rhs));
        }
        // TODO: do we need to check that lhs is an AtomicType? or is that necessary given all the other checks?
        this.type = lhs.type;
        this.attach(this.lhs = lhs);
        this.attach(this.rhs = rhs);
    }
    static createFromAST(ast, context) {
        var _a;
        let lhs = createExpressionFromAST(ast.lhs, context);
        let rhs = createExpressionFromAST(ast.rhs, context);
        // Consider a compound assignment operator overload if the LHS is class type
        if (predicates_1.Predicates.isTypedExpression(lhs, types_1.isPotentiallyCompleteClassType)) {
            return (_a = selectOperatorOverload(context, ast, ast.operator, [lhs, rhs])) !== null && _a !== void 0 ? _a : new InvalidOperatorOverloadExpression(context, ast, ast.operator, [lhs, rhs]);
        }
        return new CompoundAssignmentExpression(context, ast, lhs, rhs);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.CompoundAssignmentExpressionOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
    // public isTailChild(child: CPPConstruct) {
    //     return {
    //         isTail: false,
    //         reason: "The compound assignment itself will happen after the recursive call returns.",
    //         others: [this]
    //     };
    // }
    explain(sim, rtConstruct) {
        var lhs = this.lhs.describeEvalResult(0);
        var rhs = this.rhs.describeEvalResult(0);
        return { message: `The value of ${lhs.name || lhs.message} ${this.equivalentBinaryOp} ${rhs.name || rhs.message} will be assigned to ${lhs.name || lhs.message}.` };
    }
    isSemanticallyEquivalent_impl(other, ec) {
        if (other.construct_type === this.construct_type
            && this.areChildrenSemanticallyEquivalent(other, ec)) {
            return true;
        }
        else if (other.construct_type === "assignment_expression") {
            return semantic_equivalence_1.assignmentEquivalence(other, this, ec);
        }
        return false;
    }
}
exports.CompoundAssignmentExpression = CompoundAssignmentExpression;
class RuntimeCompoundAssignment extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.lhs = createRuntimeExpression(this.model.lhs, this);
        this.rhs = createRuntimeExpression(this.model.rhs, this);
        this.setSubexpressions([this.rhs, this.lhs]);
    }
    operate() {
        let lhsObj = this.lhs.evalResult;
        let newVal = ARITHMETIC_BINARY_OPERATIONS[this.model.equivalentBinaryOp](this.lhs.evalResult.getValue(), this.rhs.evalResult);
        lhsObj.writeValue(newVal);
        this.setEvalResult(lhsObj);
    }
}
exports.RuntimeCompoundAssignment = RuntimeCompoundAssignment;
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
class BinaryOperatorExpression extends expressionBase_1.Expression {
    constructor(context, ast, operator) {
        super(context, ast);
        this.valueCategory = "prvalue";
        this.operator = operator;
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.BinaryOperatorExpressionOutlet(element, this, parent);
    }
}
function add(left, right) { return left + right; }
function sub(left, right) { return left - right; }
function mult(left, right) { return left * right; }
function intDiv(left, right) { return Math.trunc(left / right); }
;
function floatDiv(left, right) { return left / right; }
;
function mod(left, right) { return left - intDiv(left, right) * right; }
function bitAnd(left, right) { return left & right; }
function bitXor(left, right) { return left ^ right; }
function bitOr(left, right) { return left | right; }
function bitShiftLeft(left, right) { return left << right; }
function bitShiftRight(left, right) { return left >>> right; } // TODO: is the sign preserving bit shift right more consistent with C++?
// Note: AtomicType here is much wider than needed. T should theoretically only ever be Int, Double, or Float
const ARITHMETIC_BINARY_OPERATIONS = {
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
class ArithmeticBinaryOperatorExpression extends BinaryOperatorExpression {
    constructor(context, ast, left, right, operator) {
        super(context, ast, operator);
        this.construct_type = "arithmetic_binary_operator_expression";
        if (!left.isWellTyped() || !right.isWellTyped()) {
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }
        // Arithmetic types are required
        if (!predicates_1.Predicates.isTypedExpression(left, types_1.isArithmeticType) || !predicates_1.Predicates.isTypedExpression(right, types_1.isArithmeticType)) {
            this.addNote(errors_1.CPPError.expr.binary.arithmetic_operands(this, this.operator, left, right));
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }
        // % operator and shift operators require integral operands
        if ((operator === "%" || operator === "<<" || operator == ">>") &&
            (!predicates_1.Predicates.isTypedExpression(left, types_1.isIntegralType) || !predicates_1.Predicates.isTypedExpression(right, types_1.isIntegralType))) {
            this.addNote(errors_1.CPPError.expr.binary.integral_operands(this, this.operator, left, right));
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }
        let [convertedLeft, convertedRight] = usualArithmeticConversions(left, right);
        if (types_1.sameType(convertedLeft.type, convertedRight.type)) {
            this.type = convertedLeft.type;
        }
        else {
            this.addNote(errors_1.CPPError.expr.invalid_binary_operands(this, this.operator, convertedLeft, convertedRight));
        }
        this.attach(this.left = convertedLeft);
        this.attach(this.right = convertedRight);
    }
    static createFromAST(ast, context) {
        let left = createExpressionFromAST(ast.left, context);
        let right = createExpressionFromAST(ast.right, context);
        let op = ast.operator;
        // HACK: only consider operator overloads if both are class type.
        // TODO: eventually, all input/output expressions should probably
        // be implemented as overloaded operators. 
        if (predicates_1.Predicates.isTypedExpression(left, types_1.isPotentiallyCompleteClassType) && predicates_1.Predicates.isTypedExpression(right, types_1.isPotentiallyCompleteClassType)) {
            let overload = selectOperatorOverload(context, ast, op, [left, right]);
            if (overload) {
                return overload;
            }
        }
        // If operator is "<<" and the left operand is an ostream, treat as output operation
        if (op === "<<" && predicates_1.Predicates.isTypedExpression(left, types_1.isPotentiallyCompleteClassType) && left.type.className === "ostream" && left.isLvalue()) {
            return new OutputOperatorExpression(context, ast, left, right);
        }
        // If operator is ">>" and the left operand is an ostream, treat as output operation
        if (op === ">>" && predicates_1.Predicates.isTypedExpression(left, types_1.isPotentiallyCompleteClassType) && left.type.className === "istream" && left.isLvalue()) {
            return new InputOperatorExpression(context, ast, left, right);
        }
        // If operator is "-" and both are pointers or arrays, it's a pointer difference
        // Note that although integer 0 is convertible to a pointer, that conversion should
        // not be applied here since the 0 should just be interpreted as a pointer offset.
        if (op === "-" && (predicates_1.Predicates.isTypedExpression(left, types_1.isPointerType) || predicates_1.Predicates.isTypedExpression(left, types_1.isBoundedArrayType, "lvalue"))
            && (predicates_1.Predicates.isTypedExpression(right, types_1.isPointerType) || predicates_1.Predicates.isTypedExpression(right, types_1.isBoundedArrayType, "lvalue"))) {
            return new PointerDifferenceExpression(context, ast, convertToPRValue(left), convertToPRValue(right));
        }
        // If operator is "-" or "+" and it's a combination of pointer plus integer, it's a pointer offset
        if (op === "-" || op === "+") {
            if ((predicates_1.Predicates.isTypedExpression(left, types_1.isPointerType) || predicates_1.Predicates.isTypedExpression(left, types_1.isBoundedArrayType, "lvalue")) && predicates_1.Predicates.isTypedExpression(right, types_1.isIntegralType) ||
                (predicates_1.Predicates.isTypedExpression(right, types_1.isPointerType) || predicates_1.Predicates.isTypedExpression(right, types_1.isBoundedArrayType, "lvalue")) && predicates_1.Predicates.isTypedExpression(left, types_1.isIntegralType)) {
                return new PointerOffsetExpression(context, ast, convertToPRValue(left), convertToPRValue(right), op);
            }
        }
        return new ArithmeticBinaryOperatorExpression(context, ast, left, right, op);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
    isSemanticallyEquivalent_impl(other, ec) {
        if (other.construct_type !== this.construct_type) {
            return false;
        }
        if (other.operator === this.operator && constructs_1.areAllSemanticallyEquivalent(this.children, other.children, ec)) {
            return true;
        }
        // Commutative operators
        switch (this.operator) {
            // commutative operators
            case "+":
            case "*":
            case "&":
            case "|":
            case "^":
                if (other.operator === this.operator
                    && constructs_1.areSemanticallyEquivalent(this.left, other.right, ec)
                    && constructs_1.areSemanticallyEquivalent(this.right, other.left, ec)) {
                    return true;
                }
                break;
            case "-":
            case "/":
            case "%":
            case "<<":
            case ">>":
                return false;
                break;
            default:
                util_1.assertNever(this.operator);
        }
        return false;
    }
}
exports.ArithmeticBinaryOperatorExpression = ArithmeticBinaryOperatorExpression;
// TODO: rename this or maybe create two separate classes for Arithmetic and Logical
class RuntimeArithmeticBinaryOperator extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
        this.setSubexpressions([this.left, this.right]);
    }
    operate() {
        // Not sure why the cast here is necessary but apparently Typescript needs it
        this.setEvalResult(ARITHMETIC_BINARY_OPERATIONS[this.model.operator](this.left.evalResult, this.right.evalResult));
    }
}
exports.RuntimeArithmeticBinaryOperator = RuntimeArithmeticBinaryOperator;
class PointerDifferenceExpression extends BinaryOperatorExpression {
    constructor(context, ast, left, right) {
        super(context, ast, "-");
        this.construct_type = "pointer_difference_expression";
        this.valueCategory = "prvalue";
        // Not necessary assuming they come in as prvalues that are confirmed to have pointer type.
        // if (left.isWellTyped() && right.isWellTyped()) {
        //     left = convertToPRValue(left);
        //     right = convertToPRValue(right);
        // }
        util_1.assert(types_1.similarType(left.type, right.type));
        this.attach(this.left = left);
        this.attach(this.right = right);
        this.type = new types_1.Int();
        if (!left.type.isPointerToCompleteObjectType()) {
            this.addNote(errors_1.CPPError.expr.pointer_difference.incomplete_pointed_type(this, left.type));
        }
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
    // public createRuntimeExpression(this: CompiledPointerDifferenceExpression, parent: RuntimeConstruct) : RuntimePointerDifference;
    // public createRuntimeExpression<T extends PointerType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression(this: CompiledPointerDifferenceExpression, parent: RuntimeConstruct) : RuntimePointerDifference {
    //     return new RuntimePointerDifference(this, parent);
    // }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.PointerDifferenceExpression = PointerDifferenceExpression;
class RuntimePointerDifference extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
        this.setSubexpressions([this.left, this.right]);
    }
    operate() {
        let result = this.left.evalResult.pointerDifference(this.right.evalResult);
        let leftArr = this.left.model.type.isType(types_1.ArrayPointerType) ? this.left.model.type.arrayObject : null;
        let rightArr = this.right.model.type.isType(types_1.ArrayPointerType) ? this.right.model.type.arrayObject : null;
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
    }
}
exports.RuntimePointerDifference = RuntimePointerDifference;
class PointerOffsetExpression extends BinaryOperatorExpression {
    constructor(context, ast, left, right, operator) {
        super(context, ast, operator);
        this.construct_type = "pointer_offset_expression";
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
        if (predicates_1.Predicates.isTypedExpression(left, types_1.isPointerType) && predicates_1.Predicates.isTypedExpression(right, types_1.isIntegralType)) {
            this.pointerOnLeft = true;
            this.pointer = left;
            this.offset = right;
            this.type = this.pointer.type;
            if (!left.type.isPointerToCompleteObjectType()) {
                this.addNote(errors_1.CPPError.expr.pointer_offset.incomplete_pointed_type(this, left.type));
            }
        }
        else if (predicates_1.Predicates.isTypedExpression(left, types_1.isIntegralType) && predicates_1.Predicates.isTypedExpression(right, types_1.isPointerType)) {
            this.pointerOnLeft = false;
            this.pointer = right;
            this.offset = left;
            this.type = this.pointer.type;
            if (!right.type.isPointerToCompleteObjectType()) {
                this.addNote(errors_1.CPPError.expr.pointer_offset.incomplete_pointed_type(this, right.type));
            }
        }
        else {
            this.addNote(errors_1.CPPError.expr.invalid_binary_operands(this, this.operator, left, right));
        }
    }
    // public createRuntimeExpression<T extends PointerType>(this: CompiledPointerOffsetExpression<T>, parent: RuntimeConstruct) : RuntimePointerOffset<T>;
    // public createRuntimeExpression<T extends PointerType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends PointerType>(this: CompiledPointerOffsetExpression<T>, parent: RuntimeConstruct) : RuntimePointerOffset<T> {
    //     return new RuntimePointerOffset(this, parent);
    // }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.PointerOffsetExpression = PointerOffsetExpression;
class RuntimePointerOffset extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.pointer = createRuntimeExpression(this.model.pointer, this);
        this.offset = createRuntimeExpression(this.model.offset, this);
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
    operate() {
        // code below computes the new address after pointer addition, while preserving RTTI
        //   result = pointer + offset * pointerSize
        let result = this.pointer.evalResult.pointerOffset(this.offset.evalResult, this.model.operator === "-");
        this.setEvalResult(result); // not sure why cast is necessary here
        let resultType = result.type;
        if (resultType.isType(types_1.ArrayPointerType)) {
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
    }
}
exports.RuntimePointerOffset = RuntimePointerOffset;
class OutputOperatorExpression extends expressionBase_1.Expression {
    constructor(context, ast, left, right) {
        super(context, ast);
        this.construct_type = "output_operator_expression";
        this.valueCategory = "lvalue";
        this.operator = "<<";
        this.attach(this.left = left);
        this.type = this.left.type;
        // left is already well-typed via ctor parameter type
        if (!right.isWellTyped()) {
            this.attach(this.right = right);
            return;
        }
        if (right.isStringLiteralExpression()) {
            // Avoid array-to-pointer conversion which creates an
            // awkward extra step as the string literal turns into
            // a char* that is then just special cased by cout.
            this.attach(this.right = right);
        }
        else if (predicates_1.Predicates.isTypedExpression(right, types_1.isAtomicType) || predicates_1.Predicates.isTypedExpression(right, types_1.isBoundedArrayType)) {
            this.attach(this.right = convertToPRValue(right));
        }
        else {
            this.addNote(errors_1.CPPError.expr.output.unsupported_type(this, right.type));
            this.attach(this.right = right);
        }
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.OutputOperatorExpressionOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.OutputOperatorExpression = OutputOperatorExpression;
class RuntimeOutputOperatorExpression extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        if (this.model.right.isStringLiteralExpression()) {
            this.right = createRuntimeExpression(this.model.right, this);
        }
        else {
            this.right = createRuntimeExpression(this.model.right, this);
        }
        this.setSubexpressions([this.left, this.right]);
    }
    operate() {
        if (this.right instanceof RuntimeStringLiteralExpression) {
            this.sim.cout(new runtimeEnvironment_1.Value(this.right.evalResult.address, new types_1.ArrayPointerType(this.right.evalResult)));
        }
        else {
            this.sim.cout(this.right.evalResult);
        }
        this.setEvalResult(this.left.evalResult);
    }
}
exports.RuntimeOutputOperatorExpression = RuntimeOutputOperatorExpression;
class InputOperatorExpression extends expressionBase_1.Expression {
    constructor(context, ast, left, right) {
        super(context, ast);
        this.construct_type = "input_operator_expression";
        this.valueCategory = "lvalue";
        this.operator = ">>";
        this.attach(this.left = left);
        this.attach(this.right = right);
        this.type = this.left.type;
        // left is already well-typed via ctor parameter type
        if (!right.isWellTyped()) {
            return;
        }
        if (!right.isLvalue()) {
            this.addNote(errors_1.CPPError.expr.input.lvalue_required(this, right.type));
        }
        if (!predicates_1.Predicates.isTypedExpression(right, types_1.isArithmeticType)) {
            this.addNote(errors_1.CPPError.expr.input.unsupported_type(this, right.type));
        }
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.InputOperatorExpressionOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.InputOperatorExpression = InputOperatorExpression;
class RuntimeInputOperatorExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.index = 0;
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
    }
    upNextImpl() {
        switch (this.index) {
            case 0:
                this.sim.push(this.right);
                this.sim.push(this.left);
                ++this.index;
                break;
            case 1:
                this.sim.cin.skipws();
                if (this.sim.cin.buffer.length === 0) {
                    this.sim.blockUntilCin();
                }
                break;
            default:
                util_1.assertNever(this.index);
        }
    }
    stepForwardImpl() {
        let resultOrError = this.sim.cin.extractAndParseFromBuffer(this.right.evalResult.type);
        if (resultOrError.kind === "success") {
            this.right.evalResult.writeValue(resultOrError.result);
        }
        else {
            this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "input parsing error", true);
        }
        this.setEvalResult(this.left.evalResult);
        this.startCleanup();
    }
}
exports.RuntimeInputOperatorExpression = RuntimeInputOperatorExpression;
function lt(left, right) { return left < right; }
function gt(left, right) { return left > right; }
function lte(left, right) { return left <= right; }
function gte(left, right) { return left >= right; }
function eq(left, right) { return left == right; }
function ne(left, right) { return left != right; }
const RELATIONAL_BINARY_OPERATIONS = {
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
class RelationalBinaryOperatorExpression extends BinaryOperatorExpression {
    constructor(context, ast, left, right, operator) {
        super(context, ast, operator);
        this.construct_type = "relational_binary_operator_expression";
        this.type = types_1.Bool.BOOL;
        if (!left.isWellTyped() || !right.isWellTyped()) {
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }
        // Arithmetic types are required (note: pointer comparisons have their own PointerRelationalOperation class)
        if (!predicates_1.Predicates.isTypedExpression(left, types_1.isArithmeticType) || !predicates_1.Predicates.isTypedExpression(right, types_1.isArithmeticType)) {
            this.addNote(errors_1.CPPError.expr.binary.arithmetic_operands(this, this.operator, left, right));
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }
        let [convertedLeft, convertedRight] = usualArithmeticConversions(left, right);
        if (!types_1.sameType(convertedLeft.type, convertedRight.type)) {
            this.addNote(errors_1.CPPError.expr.invalid_binary_operands(this, this.operator, convertedLeft, convertedRight));
        }
        this.attach(this.left = convertedLeft);
        this.attach(this.right = convertedRight);
    }
    static createFromAST(ast, context) {
        let left = createExpressionFromAST(ast.left, context);
        let right = createExpressionFromAST(ast.right, context);
        let op = ast.operator;
        // If either one is a class type, we consider operator overloads
        if (predicates_1.Predicates.isTypedExpression(left, types_1.isPotentiallyCompleteClassType) || predicates_1.Predicates.isTypedExpression(right, types_1.isPotentiallyCompleteClassType)) {
            let overload = selectOperatorOverload(context, ast, op, [left, right]);
            if (overload) {
                return overload;
            }
        }
        if (predicates_1.Predicates.isTypedExpression(left, types_1.isPointerType) || predicates_1.Predicates.isTypedExpression(left, types_1.isBoundedArrayType, "lvalue")) {
            if (predicates_1.Predicates.isTypedExpression(right, types_1.isPointerType) || predicates_1.Predicates.isTypedExpression(right, types_1.isBoundedArrayType, "lvalue")) {
                return new PointerComparisonExpression(context, ast, convertToPRValue(left), convertToPRValue(right), op);
            }
            else if (isIntegerLiteralZero(right)) {
                let convertedLeft = convertToPRValue(left);
                return new PointerComparisonExpression(context, ast, convertedLeft, new NullPointerConversion(right, convertedLeft.type), op);
            }
        }
        else if (isIntegerLiteralZero(left) && (predicates_1.Predicates.isTypedExpression(right, types_1.isPointerType) || predicates_1.Predicates.isTypedExpression(right, types_1.isBoundedArrayType, "lvalue"))) {
            let convertedRight = convertToPRValue(right);
            return new PointerComparisonExpression(context, ast, new NullPointerConversion(left, convertedRight.type), convertedRight, op);
        }
        return new RelationalBinaryOperatorExpression(context, ast, left, right, ast.operator);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
    isSemanticallyEquivalent_impl(other, ec) {
        if (other.construct_type === this.construct_type) {
            return other.operator === this.operator
                && this.areChildrenSemanticallyEquivalent(other, ec);
        }
        if (other instanceof IntegralToBooleanConversion) {
            return semantic_equivalence_1.checkForZeroEquivalence(other, this, ec);
        }
        return false;
    }
}
exports.RelationalBinaryOperatorExpression = RelationalBinaryOperatorExpression;
class RuntimeRelationalBinaryOperator extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
        this.setSubexpressions([this.left, this.right]);
    }
    operate() {
        // Not sure why the cast here is necessary but apparently Typescript needs it
        this.setEvalResult(RELATIONAL_BINARY_OPERATIONS[this.model.operator](this.left.evalResult, this.right.evalResult));
    }
}
exports.RuntimeRelationalBinaryOperator = RuntimeRelationalBinaryOperator;
class PointerComparisonExpression extends BinaryOperatorExpression {
    constructor(context, ast, left, right, operator) {
        super(context, ast, operator);
        this.construct_type = "pointer_comparison_expression";
        this.valueCategory = "prvalue";
        this.attach(this.left = left);
        this.attach(this.right = right);
        this.type = new types_1.Bool();
        if (!(types_1.similarType(left.type, right.type) || types_1.subType(left.type, right.type) || types_1.subType(right.type, left.type))) {
            this.addNote(errors_1.CPPError.expr.pointer_comparison.same_pointer_type_required(this, left, right));
        }
        if (left instanceof NullPointerConversion || right instanceof NullPointerConversion) {
            if (this.operator === "==" || this.operator === "!=") {
                if (left instanceof ArrayToPointerConversion || right instanceof ArrayToPointerConversion) {
                    this.addNote(errors_1.CPPError.expr.pointer_comparison.null_literal_array_equality(this));
                }
            }
            else { // operator is <, <=, >, or >=
                this.addNote(errors_1.CPPError.expr.pointer_comparison.null_literal_comparison(this));
            }
        }
    }
    // public createRuntimeExpression(this: CompiledPointerComparisonExpression, parent: RuntimeConstruct) : RuntimePointerComparisonExpression;
    // public createRuntimeExpression<T extends PointerType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression(this: CompiledPointerComparisonExpression, parent: RuntimeConstruct) : RuntimePointerComparisonExpression {
    //     return new RuntimePointerComparisonExpression(this, parent);
    // }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
    isSemanticallyEquivalent_impl(other, ec) {
        if (other.construct_type === this.construct_type) {
            return other.operator === this.operator
                && this.areChildrenSemanticallyEquivalent(other, ec);
        }
        if (other instanceof PointerToBooleanConversion) {
            return semantic_equivalence_1.checkForNullptrEquivalence(other, this, ec);
        }
        return false;
    }
}
exports.PointerComparisonExpression = PointerComparisonExpression;
class RuntimePointerComparisonExpression extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
        this.setSubexpressions([this.left, this.right]);
    }
    operate() {
        let leftResult = this.left.evalResult;
        let rightResult = this.right.evalResult;
        if (this.model.operator !== "==" && this.model.operator !== "!=") {
            if (!leftResult.type.isArrayPointerType() || !rightResult.type.isArrayPointerType() || leftResult.type.arrayObject !== rightResult.type.arrayObject) {
                this.sim.eventOccurred(Simulation_1.SimulationEvent.UNSPECIFIED_BEHAVIOR, "It looks like you're trying to see which pointer comes before/after in memory, but this only makes sense if both pointers come from the same array. I don't think that's the case here.", true);
            }
        }
        let result = RELATIONAL_BINARY_OPERATIONS[this.model.operator](this.left.evalResult, this.right.evalResult);
        this.setEvalResult(result);
    }
}
exports.RuntimePointerComparisonExpression = RuntimePointerComparisonExpression;
class LogicalBinaryOperatorExpression extends BinaryOperatorExpression {
    constructor(context, ast, left, right, operator) {
        super(context, ast, operator);
        this.construct_type = "logical_binary_operator_expression";
        this.type = new types_1.Bool();
        if (left.isWellTyped() && right.isWellTyped()) {
            this.attach(this.left = this.compileLogicalSubexpression(left));
            this.attach(this.right = this.compileLogicalSubexpression(right));
        }
        else {
            this.attach(this.left = left);
            this.attach(this.right = right);
        }
    }
    compileLogicalSubexpression(subexpr) {
        subexpr = standardConversion(subexpr, types_1.Bool.BOOL);
        if (!types_1.isType(subexpr.type, types_1.Bool)) {
            this.addNote(errors_1.CPPError.expr.binary.boolean_operand(this, this.operator, subexpr));
        }
        return subexpr;
    }
    static createFromAST(ast, context) {
        let left = createExpressionFromAST(ast.left, context);
        let right = createExpressionFromAST(ast.right, context);
        // If either one is a class type, we consider operator overloads
        if (predicates_1.Predicates.isTypedExpression(left, types_1.isPotentiallyCompleteClassType) || predicates_1.Predicates.isTypedExpression(right, types_1.isPotentiallyCompleteClassType)) {
            let overload = selectOperatorOverload(context, ast, ast.operator, [left, right]);
            if (overload) {
                return overload;
            }
        }
        return new LogicalBinaryOperatorExpression(context, ast, left, right, ast.operator);
    }
    // public createRuntimeExpression(this: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct) : RuntimeLogicalBinaryOperatorExpression;
    // public createRuntimeExpression<T extends AtomicType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression(this: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct) : RuntimeLogicalBinaryOperatorExpression {
    //     return new RuntimeLogicalBinaryOperatorExpression(this, parent);
    // }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.LogicalBinaryOperatorExpression = LogicalBinaryOperatorExpression;
class RuntimeLogicalBinaryOperatorExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.index = "left";
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
    }
    upNextImpl() {
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
    stepForwardImpl() {
        if (this.hasShortCircuited) {
            this.setEvalResult(this.left.evalResult);
        }
        else {
            this.setEvalResult(this.operate(this.left.evalResult, this.right.evalResult));
        }
        this.startCleanup();
    }
    operate(left, right) {
        return left.combine(right, (a, b) => {
            return this.model.operator == "&&" ? a && b : a || b;
        });
    }
}
exports.RuntimeLogicalBinaryOperatorExpression = RuntimeLogicalBinaryOperatorExpression;
class UnaryOperatorExpression extends expressionBase_1.Expression {
    constructor(context, ast) {
        super(context, ast);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.UnaryOperatorExpressionOutlet(element, this, parent);
    }
}
class PrefixIncrementExpression extends UnaryOperatorExpression {
    constructor(context, ast, operand) {
        super(context, ast);
        this.construct_type = "prefix_increment_expression";
        this.valueCategory = "lvalue";
        this.operator = ast.operator;
        this.attach(this.operand = operand);
        if (!operand.isWellTyped()) {
            return;
        }
        if (!operand.isLvalue()) {
            this.addNote(errors_1.CPPError.expr.prefixIncrement.lvalue_required(this));
        }
        else if (this.operator === "--" && predicates_1.Predicates.isTypedExpression(operand, types_1.isType(types_1.Bool))) {
            this.addNote(errors_1.CPPError.expr.prefixIncrement.decrement_bool_prohibited(this));
        }
        else if (predicates_1.Predicates.isTypedExpression(operand, types_1.isArithmeticType) || predicates_1.Predicates.isTypedExpression(operand, types_1.isPointerToCompleteType)) {
            this.type = operand.type;
            if (operand.type.isConst) {
                this.addNote(errors_1.CPPError.expr.prefixIncrement.const_prohibited(this));
            }
        }
        else {
            this.addNote(errors_1.CPPError.expr.prefixIncrement.operand(this));
        }
    }
    static createFromAST(ast, context) {
        return new PrefixIncrementExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.PrefixIncrementExpression = PrefixIncrementExpression;
class RuntimePrefixIncrementExpression extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.setSubexpressions([this.operand]);
    }
    operate() {
        let obj = this.operand.evalResult;
        let prevValue = obj.getValue();
        // TODO: add alert if value is invalid??
        // e.g. readValueWithAlert(evalValue, sim, this.from, inst.childInstances.from);
        // Three cases below:
        //   - Special case. ++ on a boolean just makes it true
        //   - arithmetic types modify by a delta
        //   - pointers handled specially
        let delta = this.model.operator === "++" ? 1 : -1;
        let newValue = prevValue.isTyped(types_1.isType(types_1.Bool)) ? new runtimeEnvironment_1.Value(1, types_1.Bool.BOOL) :
            prevValue.isTyped(types_1.isArithmeticType) ? prevValue.modify(v => v + delta) :
                prevValue.pointerOffset(new runtimeEnvironment_1.Value(delta, types_1.Int.INT));
        obj.writeValue(newValue);
        this.setEvalResult(obj);
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
    }
}
exports.RuntimePrefixIncrementExpression = RuntimePrefixIncrementExpression;
class DereferenceExpression extends UnaryOperatorExpression {
    constructor(context, ast, operand) {
        super(context, ast);
        this.construct_type = "dereference_expression";
        this.valueCategory = "lvalue";
        this.operator = "*";
        if (!operand.isWellTyped()) {
            this.attach(this.operand = operand);
            return;
        }
        let convertedOperand = convertToPRValue(operand);
        this.attach(this.operand = convertedOperand);
        if (!predicates_1.Predicates.isTypedExpression(convertedOperand, types_1.isPointerType)) {
            this.addNote(errors_1.CPPError.expr.dereference.pointer(this, convertedOperand.type));
        }
        else if (!(convertedOperand.type.ptrTo.isCompleteObjectType())) {
            // Note: function pointers currently not allowed
            this.addNote(errors_1.CPPError.expr.dereference.pointerToObjectType(this, convertedOperand.type));
        }
        else {
            this.type = convertedOperand.type.ptrTo;
        }
    }
    static createFromAST(ast, context) {
        return new DereferenceExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }
    // public createRuntimeExpression<T extends ObjectType>(this: CompiledDereferenceExpression<T>, parent: RuntimeConstruct) : RuntimeDereferenceExpression<T>;
    // public createRuntimeExpression<T extends ObjectType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends ObjectType>(this: CompiledDereferenceExpression<T>, parent: RuntimeConstruct) : RuntimeDereferenceExpression<T> {
    //     return new RuntimeDereferenceExpression(this, parent);
    // }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.DereferenceExpression = DereferenceExpression;
class RuntimeDereferenceExpression extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.setSubexpressions([this.operand]);
    }
    operate() {
        // Note: function pointers not supported yet
        let ptr = this.operand.evalResult;
        let addr = ptr.rawValue;
        // If it's a null pointer, give message
        if (types_1.PointerType.isNull(addr)) {
            this.sim.eventOccurred(Simulation_1.SimulationEvent.CRASH, "Ow! Your code just dereferenced a null pointer!", true);
        }
        else if (types_1.PointerType.isNegative(addr)) {
            this.sim.eventOccurred(Simulation_1.SimulationEvent.CRASH, "Uh, wow. The pointer you're trying to dereference has a negative address.\nThanks a lot.", true);
        }
        else if (ptr.type.isArrayPointerType()) {
            // If it's an array pointer, make sure it's in bounds and not one-past
            if (addr < ptr.type.min()) {
                this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "That pointer has wandered off the beginning of its array. Dereferencing it might cause a segfault, or worse - you might just access/change other memory outside the array.", true);
            }
            else if (ptr.type.onePast() < addr) {
                this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "That pointer has wandered off the end of its array. Dereferencing it might cause a segfault, or worse - you might just access/change other memory outside the array.", true);
            }
            else if (addr == ptr.type.onePast()) {
                // TODO: technically this is not undefined behavior unless the result of the dereference undergoes an lvalue-to-rvalue conversion to look up the object
                this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "That pointer is one past the end of its array. Do you have an off-by-one error?. Dereferencing it might cause a segfault, or worse - you might just access/change other memory outside the array.", true);
            }
        }
        var obj = this.sim.memory.dereference(ptr);
        // Note: dead object is not necessarily invalid. Invalid has to do with the value
        // while dead/alive has to do with the object itself. Reading from dead object does
        // yield an invalid value though.
        // TODO: add this back in
        // if (!obj.isAlive()){
        //     DeadObjectMessage.instance(obj, {fromDereference:true}).display(sim, inst);
        // }
        this.setEvalResult(obj);
    }
}
exports.RuntimeDereferenceExpression = RuntimeDereferenceExpression;
class AddressOfExpression extends UnaryOperatorExpression {
    constructor(context, ast, operand) {
        super(context, ast);
        this.construct_type = "address_of_expression";
        this.valueCategory = "prvalue";
        this.operator = "&";
        this.attach(this.operand = operand);
        if (!operand.isWellTyped()) {
            return;
        }
        if (operand.valueCategory !== "lvalue") {
            this.addNote(errors_1.CPPError.expr.addressOf.lvalue_required(this));
        }
        if (predicates_1.Predicates.isTypedExpression(operand, types_1.isFunctionType)) {
            this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, "Function Pointers"));
            return;
        }
        if (!predicates_1.Predicates.isTypedExpression(operand, types_1.isCompleteObjectType)) {
            this.addNote(errors_1.CPPError.expr.addressOf.object_type_required(this));
            return;
        }
        this.type = new types_1.PointerType(operand.type);
    }
    static createFromAST(ast, context) {
        return new AddressOfExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }
    // public createRuntimeExpression<T extends ObjectType>(this: CompiledAddressOfExpression<T>, parent: RuntimeConstruct) : RuntimeAddressOfExpression<T>;
    // public createRuntimeExpression<T extends ObjectType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends ObjectType>(this: CompiledAddressOfExpression<T>, parent: RuntimeConstruct) : RuntimeAddressOfExpression<T> {
    //     return new RuntimeAddressOfExpression(this, parent);
    // }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.AddressOfExpression = AddressOfExpression;
class RuntimeAddressOfExpression extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.setSubexpressions([this.operand]);
    }
    operate() {
        this.setEvalResult(this.operand.evalResult.getPointerTo());
    }
}
exports.RuntimeAddressOfExpression = RuntimeAddressOfExpression;
class UnaryPlusExpression extends UnaryOperatorExpression {
    constructor(context, ast, operand) {
        super(context, ast);
        this.construct_type = "unary_plus_expression";
        this.valueCategory = "prvalue";
        this.operator = "+";
        if (!operand.isWellTyped()) {
            this.attach(this.operand = operand);
            return;
        }
        if (predicates_1.Predicates.isTypedExpression(operand, types_1.isIntegralType)) {
            let convertedOperand = integralPromotion(convertToPRValue(operand));
            this.type = convertedOperand.type;
            this.attach(this.operand = convertedOperand);
        }
        else if (predicates_1.Predicates.isTypedExpression(operand, types_1.isArithmeticType)) {
            let convertedOperand = convertToPRValue(operand);
            this.type = convertedOperand.type;
            this.attach(this.operand = convertedOperand);
        }
        else if (predicates_1.Predicates.isTypedExpression(operand, types_1.isBoundedArrayType, "lvalue")) {
            let convertedOperand = convertToPRValue(operand);
            this.type = convertedOperand.type;
            this.attach(this.operand = convertedOperand);
        }
        else if (predicates_1.Predicates.isTypedExpression(operand, types_1.isPointerType)) {
            let convertedOperand = convertToPRValue(operand);
            this.type = convertedOperand.type;
            this.attach(this.operand = convertedOperand);
        }
        else {
            this.addNote(errors_1.CPPError.expr.unaryPlus.operand(this));
            this.attach(this.operand = operand);
            return;
        }
    }
    static createFromAST(ast, context) {
        return new UnaryPlusExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.UnaryPlusExpression = UnaryPlusExpression;
class RuntimeUnaryPlusExpression extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.setSubexpressions([this.operand]);
    }
    operate() {
        this.setEvalResult(this.operand.evalResult);
    }
}
exports.RuntimeUnaryPlusExpression = RuntimeUnaryPlusExpression;
class UnaryMinusExpression extends UnaryOperatorExpression {
    constructor(context, ast, operand) {
        super(context, ast);
        this.construct_type = "unary_minus_expression";
        this.valueCategory = "prvalue";
        this.operator = "-";
        if (!operand.isWellTyped()) {
            this.attach(this.operand = operand);
            return;
        }
        if (predicates_1.Predicates.isTypedExpression(operand, types_1.isIntegralType)) {
            let convertedOperand = integralPromotion(convertToPRValue(operand));
            this.type = convertedOperand.type;
            this.attach(this.operand = convertedOperand);
        }
        else if (predicates_1.Predicates.isTypedExpression(operand, types_1.isArithmeticType)) {
            let convertedOperand = convertToPRValue(operand);
            this.type = convertedOperand.type;
            this.attach(this.operand = convertedOperand);
        }
        else {
            this.addNote(errors_1.CPPError.expr.unaryMinus.operand(this));
            this.attach(this.operand = operand);
            return;
        }
    }
    static createFromAST(ast, context) {
        return new UnaryMinusExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.UnaryMinusExpression = UnaryMinusExpression;
class RuntimeUnaryMinusExpression extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.setSubexpressions([this.operand]);
    }
    operate() {
        this.setEvalResult(this.operand.evalResult.arithmeticNegate());
    }
}
exports.RuntimeUnaryMinusExpression = RuntimeUnaryMinusExpression;
class LogicalNotExpression extends UnaryOperatorExpression {
    constructor(context, ast, operand) {
        super(context, ast);
        this.construct_type = "logical_not_expression";
        this.type = types_1.Bool.BOOL;
        this.valueCategory = "prvalue";
        this.operator = "!";
        if (!operand.isWellTyped()) {
            this.attach(this.operand = operand);
            return;
        }
        let convertedOperand = standardConversion(operand, types_1.Bool.BOOL);
        if (!predicates_1.Predicates.isTypedExpression(convertedOperand, types_1.isType(types_1.Bool))) {
            this.addNote(errors_1.CPPError.expr.logicalNot.operand_bool(this, operand));
            this.attach(this.operand = operand);
        }
        this.attach(this.operand = convertedOperand);
    }
    static createFromAST(ast, context) {
        return new LogicalNotExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.LogicalNotExpression = LogicalNotExpression;
class RuntimeLogicalNotExpression extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.setSubexpressions([this.operand]);
    }
    operate() {
        this.setEvalResult(this.operand.evalResult.logicalNot());
    }
}
exports.RuntimeLogicalNotExpression = RuntimeLogicalNotExpression;
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
class SubscriptExpression extends expressionBase_1.Expression {
    constructor(context, ast, operand, offset) {
        super(context, ast);
        this.construct_type = "subscript_expression";
        this.valueCategory = "lvalue";
        this.attach(this.operand = operand.isWellTyped() ? convertToPRValue(operand) : operand);
        this.attach(this.offset = offset.isWellTyped() ? standardConversion(offset, types_1.Int.INT) : offset);
        if (this.operand.isWellTyped()) {
            if (predicates_1.Predicates.isTypedExpression(this.operand, types_1.isPointerType)) {
                if (this.operand.type.isPointerToCompleteObjectType()) {
                    this.type = this.operand.type.ptrTo;
                }
                else {
                    this.addNote(errors_1.CPPError.expr.subscript.incomplete_element_type(this, this.operand.type));
                }
            }
            else {
                this.addNote(errors_1.CPPError.expr.subscript.invalid_operand_type(this, this.operand.type));
            }
        }
        if (this.offset.isWellTyped() && !predicates_1.Predicates.isTypedExpression(this.offset, types_1.isType(types_1.Int))) {
            this.addNote(errors_1.CPPError.expr.subscript.invalid_offset_type(this, this.offset.type));
        }
    }
    static createFromAST(ast, context) {
        var _a;
        let operand = createExpressionFromAST(ast.operand, context);
        let offset = createExpressionFromAST(ast.offset, context);
        // Consider an assignment operator overload if the LHS is class type
        if (predicates_1.Predicates.isTypedExpression(operand, types_1.isPotentiallyCompleteClassType)) {
            return (_a = selectOperatorOverload(context, ast, "[]", [operand, offset])) !== null && _a !== void 0 ? _a : new InvalidOperatorOverloadExpression(context, ast, "[]", [operand, offset]);
            ;
        }
        return new SubscriptExpression(context, ast, operand, offset);
    }
    // public createRuntimeExpression<T extends ObjectType>(this: CompiledSubscriptExpression<T>, parent: RuntimeConstruct) : RuntimeSubscriptExpression<T>;
    // public createRuntimeExpression<T extends ObjectType, V extends ValueCategory>(this: CompiledExpressionBase<T,V>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends ObjectType>(this: CompiledSubscriptExpression<T>, parent: RuntimeConstruct) : RuntimeSubscriptExpression<T> {
    //     return new RuntimeSubscriptExpression(this, parent);
    // }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.SubscriptExpressionOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.SubscriptExpression = SubscriptExpression;
class RuntimeSubscriptExpression extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.offset = createRuntimeExpression(this.model.offset, this);
        this.setSubexpressions([this.operand, this.offset]);
    }
    operate() {
        let operand = this.operand.evalResult;
        let offset = this.offset.evalResult;
        let ptr = operand.pointerOffset(offset);
        let addr = ptr.rawValue;
        if (types_1.PointerType.isNegative(addr)) {
            this.sim.eventOccurred(Simulation_1.SimulationEvent.CRASH, "Good work. You subscripted so far backwards off the beginning of the array you went to a negative address. -__-", true);
        }
        else if (ptr.type.isArrayPointerType()) {
            // If it's an array pointer, make sure it's in bounds and not one-past
            if (addr < ptr.type.min()) {
                this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "That subscript operation goes off the beginning of the array. This could cause a segfault, or worse - you might just access/change other memory outside the array.", true);
            }
            else if (ptr.type.onePast() < addr) {
                this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "That subscript operation goes off the end of the array. This could cause a segfault, or worse - you might just access/change other memory outside the array.", true);
            }
            else if (addr == ptr.type.onePast()) {
                // TODO: technically this is not undefined behavior unless the result of the dereference undergoes an lvalue-to-rvalue conversion to look up the object
                this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "That subscript accesses the element one past the end of the array. This could cause a segfault, or worse - you might just access/change other memory outside the array.", true);
            }
        }
        var obj = this.sim.memory.dereference(ptr);
        // // Note: dead object is not necessarily invalid. Invalid has to do with the value
        // // while dead/alive has to do with the object itself. Reading from dead object does
        // // yield an invalid value though.
        // // TODO: add this back in
        // if (!obj.isAlive()){
        //     DeadObjectMessage.instance(obj, {fromSubscript:true}).display(sim, inst);
        // }
        this.setEvalResult(obj);
    }
}
exports.RuntimeSubscriptExpression = RuntimeSubscriptExpression;
class DotExpression extends expressionBase_1.Expression {
    constructor(context, ast, operand, memberName) {
        var _a;
        super(context, ast);
        this.construct_type = "dot_expression";
        this.valueCategory = "lvalue";
        this.attach(this.operand = operand);
        this.memberName = memberName;
        if (!predicates_1.Predicates.isTypedExpression(this.operand, types_1.isPotentiallyCompleteClassType)) {
            this.addNote(errors_1.CPPError.expr.dot.class_type_only(this));
            return;
        }
        if (!predicates_1.Predicates.isTypedExpression(this.operand, types_1.isCompleteClassType)) {
            this.addNote(errors_1.CPPError.expr.dot.incomplete_class_type_prohibited(this));
            return;
        }
        if (this.operand instanceof IdentifierExpression) {
            this.functionCallReceiver = this.operand.getEntity();
        }
        let classType = this.operand.type;
        let lookupResult = typeof memberName === "string"
            ? classType.classScope.lookup(memberName, { kind: "normal", noParent: true })
            : this.context.translationUnit.qualifiedLookup(memberName);
        let entityOrError = entityLookup(this, lookupResult);
        switch (entityOrError) {
            case "not_found":
                this.addNote(errors_1.CPPError.expr.dot.no_such_member(this, classType, lexical_1.identifierToString(memberName)));
                break;
            case "ambiguous":
                this.addNote(errors_1.CPPError.expr.dot.ambiguous_member(this, lexical_1.identifierToString(memberName)));
                break;
            case "class_found":
                this.addNote(errors_1.CPPError.expr.dot.class_entity_found(this, lexical_1.identifierToString(memberName)));
                break;
            default:
                if (entityOrError.declarationKind === "function") {
                    this.entity = entityOrError;
                }
                else if (entityOrError.variableLocation === "member") {
                    this.entity = entityOrError;
                }
                else {
                    util_1.assertFalse("non-member variable found during member access lookup");
                }
                this.entity = entityOrError;
        }
        this.type = types_1.peelReference((_a = this.entity) === null || _a === void 0 ? void 0 : _a.type);
    }
    static createFromAST(ast, context) {
        var _a;
        let operand = createExpressionFromAST(ast.operand, context);
        let receiverContext = ((_a = operand.type) === null || _a === void 0 ? void 0 : _a.isCompleteClassType()) ?
            constructs_1.createExpressionContextWithReceiverType(context, operand.type) :
            context;
        return new DotExpression(receiverContext, ast, operand, lexical_1.astToIdentifier(ast.member));
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.DotExpressionOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
    //     isTailChild : function(child){
    //         return {isTail: false,
    //             reason: "The subscripting will happen after the recursive call returns.",
    //             others: [this]
    //         };
    //     }
    entitiesUsed() {
        return this.entity ? [this.entity] : [];
    }
}
exports.DotExpression = DotExpression;
class RuntimeObjectDotExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
    }
    upNextImpl() {
        if (!this.operand.isDone) {
            this.sim.push(this.operand);
        }
        else {
            this.setEvalResult(this.operand.evalResult.getMemberObject(this.model.entity.name));
            this.startCleanup();
        }
    }
    stepForwardImpl() {
        // do nothing
    }
}
exports.RuntimeObjectDotExpression = RuntimeObjectDotExpression;
class RuntimeFunctionDotExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
    }
    upNextImpl() {
        if (!this.operand.isDone) {
            this.sim.push(this.operand);
        }
        else {
            this.setEvalResult(this.model.entity);
            this.startCleanup();
        }
    }
    stepForwardImpl() {
        // do nothing
    }
    get contextualReceiver() {
        var _a;
        return (_a = this.operand.evalResult) !== null && _a !== void 0 ? _a : super.contextualReceiver;
    }
}
exports.RuntimeFunctionDotExpression = RuntimeFunctionDotExpression;
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
class ArrowExpression extends expressionBase_1.Expression {
    constructor(context, ast, operand, memberName) {
        var _a;
        super(context, ast);
        this.construct_type = "arrow_expression";
        this.valueCategory = "lvalue";
        this.attach(this.operand = operand);
        this.memberName = memberName;
        let operandType = this.operand.type;
        if (!((operandType === null || operandType === void 0 ? void 0 : operandType.isPointerType()) && operandType.ptrTo.isPotentiallyCompleteClassType())) {
            this.addNote(errors_1.CPPError.expr.arrow.class_pointer_type(this));
            return;
        }
        if (!operandType.ptrTo.isCompleteClassType()) {
            this.addNote(errors_1.CPPError.expr.arrow.incomplete_class_type_prohibited(this));
            return;
        }
        let classType = operandType.ptrTo;
        let lookupResult = typeof memberName === "string"
            ? classType.classScope.lookup(memberName, { kind: "normal", noParent: true })
            : this.context.translationUnit.qualifiedLookup(memberName);
        let entityOrError = entityLookup(this, lookupResult);
        switch (entityOrError) {
            case "not_found":
                this.addNote(errors_1.CPPError.expr.arrow.no_such_member(this, classType, lexical_1.identifierToString(memberName)));
                break;
            case "ambiguous":
                this.addNote(errors_1.CPPError.expr.arrow.ambiguous_member(this, lexical_1.identifierToString(memberName)));
                break;
            case "class_found":
                this.addNote(errors_1.CPPError.expr.arrow.class_entity_found(this, lexical_1.identifierToString(memberName)));
                break;
            default:
                if (entityOrError.declarationKind === "function") {
                    this.entity = entityOrError;
                }
                else if (entityOrError.variableLocation === "member") {
                    this.entity = entityOrError;
                }
                else {
                    util_1.assertFalse("non-member variable found during member access lookup");
                }
                this.entity = entityOrError;
        }
        this.type = types_1.peelReference((_a = this.entity) === null || _a === void 0 ? void 0 : _a.type);
    }
    static createFromAST(ast, context) {
        var _a;
        let operand = createExpressionFromAST(ast.operand, context);
        let receiverContext = ((_a = operand.type) === null || _a === void 0 ? void 0 : _a.isPointerType()) && operand.type.ptrTo.isCompleteClassType() ?
            constructs_1.createExpressionContextWithReceiverType(context, operand.type.ptrTo) :
            context;
        return new ArrowExpression(receiverContext, ast, operand, lexical_1.astToIdentifier(ast.member));
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.ArrowExpressionOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
    //     isTailChild : function(child){
    //         return {isTail: false,
    //             reason: "The subscripting will happen after the recursive call returns.",
    //             others: [this]
    //         };
    //     }
    entitiesUsed() {
        return this.entity ? [this.entity] : [];
    }
}
exports.ArrowExpression = ArrowExpression;
class RuntimeObjectArrowExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
    }
    upNextImpl() {
        if (!this.operand.isDone) {
            this.sim.push(this.operand);
        }
    }
    stepForwardImpl() {
        let evalResult = this.operand.evalResult;
        let addr = evalResult instanceof runtimeEnvironment_1.Value ? evalResult : evalResult.getValue();
        if (types_1.PointerType.isNull(addr.rawValue)) {
            this.sim.eventOccurred(Simulation_1.SimulationEvent.CRASH, "Ow! Your code just tried to use the arrow operator on a null pointer!", true);
        }
        let obj = this.sim.memory.dereference(addr);
        this.setEvalResult(obj.getMemberObject(this.model.entity.name));
        this.startCleanup();
    }
}
exports.RuntimeObjectArrowExpression = RuntimeObjectArrowExpression;
class RuntimeFunctionArrowExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
    }
    upNextImpl() {
        if (!this.operand.isDone) {
            this.sim.push(this.operand);
        }
    }
    stepForwardImpl() {
        let evalResult = this.operand.evalResult;
        let addr = evalResult instanceof runtimeEnvironment_1.Value ? evalResult : evalResult.getValue();
        if (types_1.PointerType.isNull(addr.rawValue)) {
            this.sim.eventOccurred(Simulation_1.SimulationEvent.CRASH, "Ow! Your code just tried to use the arrow operator on a null pointer!", true);
        }
        this.receiverCalledOn = this.sim.memory.dereference(addr);
        this.setEvalResult(this.model.entity);
        this.startCleanup();
    }
    get contextualReceiver() {
        var _a;
        return (_a = this.receiverCalledOn) !== null && _a !== void 0 ? _a : super.contextualReceiver;
    }
}
exports.RuntimeFunctionArrowExpression = RuntimeFunctionArrowExpression;
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
class PostfixIncrementExpression extends expressionBase_1.Expression {
    constructor(context, ast, operand) {
        super(context, ast);
        this.construct_type = "postfix_increment_expression";
        this.valueCategory = "prvalue";
        this.operator = ast.operator;
        this.attach(this.operand = operand);
        if (!operand.isWellTyped()) {
            return;
        }
        if (!operand.isLvalue()) {
            this.addNote(errors_1.CPPError.expr.postfixIncrement.lvalue_required(this));
        }
        else if (this.operator === "--" && predicates_1.Predicates.isTypedExpression(operand, types_1.isType(types_1.Bool))) {
            this.addNote(errors_1.CPPError.expr.postfixIncrement.decrement_bool_prohibited(this));
        }
        else if (predicates_1.Predicates.isTypedExpression(operand, types_1.isArithmeticType) || predicates_1.Predicates.isTypedExpression(operand, types_1.isPointerToCompleteType)) {
            // Use cv-unqualified type since result is a prvalue
            this.type = operand.type.cvUnqualified();
            if (operand.type.isConst) {
                this.addNote(errors_1.CPPError.expr.postfixIncrement.const_prohibited(this));
            }
        }
        else {
            this.addNote(errors_1.CPPError.expr.postfixIncrement.operand(this));
        }
    }
    static createFromAST(ast, context) {
        return new PostfixIncrementExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.PostfixIncrementExpressionOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.PostfixIncrementExpression = PostfixIncrementExpression;
class RuntimePostfixIncrementExpression extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.setSubexpressions([this.operand]);
    }
    operate() {
        let obj = this.operand.evalResult;
        let prevValue = obj.getValue();
        // TODO: add alert if value is invalid??
        // e.g. readValueWithAlert(evalValue, sim, this.from, inst.childInstances.from);
        // Three cases below:
        //   - Special case. ++ on a boolean just makes it true
        //   - arithmetic types modify by a delta
        //   - pointers handled specially
        let delta = this.model.operator === "++" ? 1 : -1;
        let newValue = prevValue.isTyped(types_1.isType(types_1.Bool)) ? new runtimeEnvironment_1.Value(1, types_1.Bool.BOOL) :
            prevValue.isTyped(types_1.isArithmeticType) ? prevValue.modify(v => v + delta) :
                prevValue.pointerOffset(new runtimeEnvironment_1.Value(delta, types_1.Int.INT));
        this.setEvalResult(prevValue);
        obj.writeValue(newValue);
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
    }
}
exports.RuntimePostfixIncrementExpression = RuntimePostfixIncrementExpression;
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
//             
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
class IdentifierExpression extends expressionBase_1.Expression {
    // i_createFromAST: function(ast, context){
    //     Identifier._parent.i_createFromAST.apply(this, arguments);
    //     this.identifier = this.ast.identifier;
    //     this.identifierText = qualifiedNameString(this.identifier);
    // },
    constructor(context, ast, name) {
        var _a;
        super(context, ast);
        this.construct_type = "identifier_expression";
        this.valueCategory = "lvalue";
        this.name = name;
        lexical_1.checkIdentifier(this, name, this);
        let lookupResult = typeof this.name === "string"
            ? this.context.contextualScope.lookup(this.name)
            : this.context.translationUnit.qualifiedLookup(this.name);
        let entityOrError = entityLookup(this, lookupResult);
        switch (entityOrError) {
            case "not_found":
                this.addNote(errors_1.CPPError.iden.not_found(this, lexical_1.identifierToString(this.name)));
                break;
            case "ambiguous":
                this.addNote(errors_1.CPPError.iden.ambiguous(this, lexical_1.identifierToString(this.name)));
                break;
            case "class_found":
                this.addNote(errors_1.CPPError.iden.class_entity_found(this, lexical_1.identifierToString(this.name)));
                break;
            default:
                this.entity = entityOrError;
        }
        this.type = types_1.peelReference((_a = this.entity) === null || _a === void 0 ? void 0 : _a.type);
    }
    static createFromAST(ast, context) {
        return new IdentifierExpression(context, ast, lexical_1.astToIdentifier(ast.identifier));
    }
    getEntity() {
        return this.entity;
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.IdentifierOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
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
    entitiesUsed() {
        return this.entity ? [this.entity] : [];
    }
}
exports.IdentifierExpression = IdentifierExpression;
/**
 * Used as a helper for IdentifierExpression, DotExpression, and ArrowExpression, and overloaded operators
 * @param scope
 * @param name
 * @param expression
 */
function entityLookup(expression, lookupResult) {
    if (!lookupResult) {
        return "not_found";
    }
    else if (lookupResult.declarationKind === "variable") {
        return lookupResult;
    }
    else if (lookupResult.declarationKind === "function") {
        if (lookupResult.overloads.length === 1) {
            // Only one function with that name found, so we just grab it.
            // Any errors will be detected later e.g. when a function call is attempted.
            return lookupResult.overloads[0];
        }
        else {
            // Need to perform overload resolution to select the appropriate function
            // from the function overload group. This depends on contextual parameter types.
            if (expression.context.contextualParameterTypes) {
                let overloadResult = overloadResolution(lookupResult.overloads, expression.context.contextualParameterTypes, expression.context.contextualReceiverType);
                if (overloadResult.selected) {
                    // If a best result has been selected, use that
                    return overloadResult.selected;
                }
                else {
                    // Otherwise, use the best candidate (it is sorted to the front of the candidates in the result)
                    // The errors that made it non-viable will be picked up later e.g. when a function call is attempted.
                    return overloadResult.candidates[0].candidate;
                }
            }
            else {
                return "ambiguous";
            }
        }
    }
    else if (lookupResult.declarationKind === "class") {
        return "class_found";
    }
    else {
        util_1.assertNever(lookupResult);
    }
}
exports.entityLookup = entityLookup;
class RuntimeObjectIdentifierExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
    }
    upNextImpl() {
        this.setEvalResult(entities_1.runtimeObjectLookup(this.model.entity, this));
        this.startCleanup();
    }
    stepForwardImpl() {
        // do nothing
    }
}
exports.RuntimeObjectIdentifierExpression = RuntimeObjectIdentifierExpression;
class RuntimeFunctionIdentifierExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
    }
    upNextImpl() {
        this.setEvalResult(this.model.entity);
        this.startCleanup();
    }
    stepForwardImpl() {
        // do nothing
    }
}
exports.RuntimeFunctionIdentifierExpression = RuntimeFunctionIdentifierExpression;
class ThisExpression extends expressionBase_1.Expression {
    constructor(context, ast) {
        super(context, ast);
        this.construct_type = "this_expression";
        this.valueCategory = "prvalue";
        if (constructs_1.isMemberFunctionContext(context)) {
            this.type = new types_1.PointerType(context.contextualReceiverType, true);
        }
        else {
            this.addNote(errors_1.CPPError.expr.thisExpression.nonStaticMemberFunc(this));
        }
    }
    static createFromAST(ast, context) {
        return new ThisExpression(context, ast);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.ThisExpressionOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.ThisExpression = ThisExpression;
class RuntimeThisExpression extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
    }
    operate() {
        this.setEvalResult(this.contextualReceiver.getPointerTo());
    }
}
exports.RuntimeThisExpression = RuntimeThisExpression;
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
const literalTypes = {
    "int": types_1.Int.INT,
    "float": types_1.Double.DOUBLE,
    "double": types_1.Double.DOUBLE,
    "bool": types_1.Bool.BOOL,
    "char": types_1.Char.CHAR
};
class NumericLiteralExpression extends expressionBase_1.Expression {
    // create from ast code:
    // TODO: are there some literal types without conversion functions? There shouldn't be...
    // var conv = literalJSParse[this.ast.type];
    // var val = (conv ? conv(this.ast.value) : this.ast.value);
    constructor(context, ast, type, value) {
        super(context, ast);
        this.construct_type = "numeric_literal_expression";
        this.valueCategory = "prvalue";
        this.type = type;
        this.value = new runtimeEnvironment_1.Value(value, this.type);
    }
    static createFromAST(ast, context) {
        return new NumericLiteralExpression(context, ast, literalTypes[ast.type], ast_expressions_1.parseNumericLiteralValueFromAST(ast));
    }
    // public createRuntimeExpression<T extends ArithmeticType>(this: CompiledNumericLiteralExpression<T>, parent: RuntimeConstruct) : RuntimeNumericLiteral<T>;
    // public createRuntimeExpression<T extends AtomicType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends ArithmeticType>(this: CompiledNumericLiteralExpression<T>, parent: RuntimeConstruct) : RuntimeNumericLiteral<T> {
    //     return new RuntimeNumericLiteral(this, parent);
    // }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.NumericLiteralOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
    isIntegerZero() {
        return;
    }
}
exports.NumericLiteralExpression = NumericLiteralExpression;
class RuntimeNumericLiteral extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
    }
    upNextImpl() {
        this.setEvalResult(this.model.value);
        this.startCleanup();
    }
    stepForwardImpl() {
        // Do nothing
    }
}
exports.RuntimeNumericLiteral = RuntimeNumericLiteral;
class StringLiteralExpression extends expressionBase_1.Expression {
    // create from ast code:
    // TODO: are there some literal types without conversion functions? There shouldn't be...
    // var conv = literalJSParse[this.ast.type];
    // var val = (conv ? conv(this.ast.value) : this.ast.value);
    constructor(context, ast, str) {
        super(context, ast);
        this.construct_type = "string_literal_expression";
        this.valueCategory = "lvalue";
        this.str = str;
        // type is const char
        this.type = new types_1.BoundedArrayType(new types_1.Char(true), str.length + 1);
        this.context.translationUnit.registerStringLiteral(this);
    }
    isStringLiteralExpression() {
        return true;
    }
    static createFromAST(ast, context) {
        return new StringLiteralExpression(context, ast, ast.value);
    }
    // public createRuntimeExpression(this: CompiledStringLiteralExpression, parent: RuntimeConstruct) : RuntimeStringLiteralExpression;
    // public createRuntimeExpression<T extends AtomicType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression(this: CompiledStringLiteralExpression, parent: RuntimeConstruct) : RuntimeStringLiteralExpression {
    //     return new RuntimeStringLiteralExpression(this, parent);
    // }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.StringLiteralExpressionOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.StringLiteralExpression = StringLiteralExpression;
class RuntimeStringLiteralExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
    }
    upNextImpl() {
        this.setEvalResult(this.sim.memory.getStringLiteral(this.model.str));
        this.startCleanup();
    }
    stepForwardImpl() {
        // Do nothing
    }
}
exports.RuntimeStringLiteralExpression = RuntimeStringLiteralExpression;
class ParenthesesExpression extends expressionBase_1.Expression {
    constructor(context, ast, subexpression) {
        super(context, ast);
        this.construct_type = "parentheses_expression";
        this.attach(this.subexpression = subexpression);
        this.type = subexpression.type;
        this.valueCategory = subexpression.valueCategory;
    }
    static createFromAST(ast, context) {
        return new ParenthesesExpression(context, ast, createExpressionFromAST(ast.subexpression, context));
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.ParenthesesOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.ParenthesesExpression = ParenthesesExpression;
const INDEX_PARENTHESES_SUBEXPRESSIONS = 0;
const INDEX_PARENTHESES_DONE = 1;
class RuntimeParentheses extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.index = INDEX_PARENTHESES_SUBEXPRESSIONS;
        this.subexpression = createRuntimeExpression(this.model.subexpression, this);
    }
    upNextImpl() {
        if (this.index === INDEX_PARENTHESES_SUBEXPRESSIONS) {
            this.sim.push(this.subexpression);
            this.index = INDEX_PARENTHESES_DONE;
        }
        else {
            this.setEvalResult(this.subexpression.evalResult);
            this.startCleanup();
        }
    }
    stepForwardImpl() {
        // Do nothing
    }
}
exports.RuntimeParentheses = RuntimeParentheses;
class InitializerListExpression extends expressionBase_1.Expression {
    constructor(context, ast, elements) {
        super(context, ast);
        this.construct_type = "initializer_list_expression";
        this.valueCategory = "lvalue";
        if (elements.length === 0) {
            this.addNote(errors_1.CPPError.declaration.init.list_empty(this));
            this.attachAll(this.elements = elements);
            return;
        }
        // If any arguments are not well typed, we can't select a constructor
        if (!expressionBase_1.allWellTyped(elements)) {
            this.attachAll(this.elements = elements);
            return;
        }
        let eltType = elements[0].type;
        if (!elements.every(arg => arg.type.sameType(eltType))) {
            this.addNote(errors_1.CPPError.declaration.init.list_same_type(this));
            this.attachAll(this.elements = elements);
            return;
        }
        if (!eltType.isArithmeticType()) {
            this.addNote(errors_1.CPPError.declaration.init.list_arithmetic_type(this));
            this.attachAll(this.elements = elements);
            return;
        }
        let typeEntity = context.contextualScope.lookup(`initializer_list<${eltType.simpleType}>`);
        util_1.assert((typeEntity === null || typeEntity === void 0 ? void 0 : typeEntity.declarationKind) === "class");
        util_1.assert(typeEntity.isComplete());
        this.type = typeEntity.type.cvUnqualified();
        this.initializerList = this.createTemporaryObject(this.type, "[initializer list]");
        this.elementsArray = this.createTemporaryObject(new types_1.BoundedArrayType(eltType.cvQualified(true), elements.length), "[initializer list array]");
        this.attachAll(this.elements = elements);
    }
    static createFromAST(ast, context) {
        return new InitializerListExpression(context, ast, ast.elements.map(eltAST => createExpressionFromAST(eltAST, context)));
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.InitializerListOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.InitializerListExpression = InitializerListExpression;
class RuntimeInitializerListExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.elementIndex = 0;
        this.elements = this.model.elements.map(element => createRuntimeExpression(element, this));
    }
    upNextImpl() {
        if (this.elementIndex < this.elements.length) {
            this.sim.push(this.elements[this.elementIndex++]);
        }
        else {
            this.elementsArray = this.model.elementsArray.objectInstance(this);
            this.elements.forEach((elem, i) => this.elementsArray.getArrayElemSubobject(i).setValue((elem.evalResult instanceof objects_1.CPPObject ? elem.evalResult.getValue() : elem.evalResult)));
            this.initializerList = this.model.initializerList.objectInstance(this);
            let eltsPointer = this.elementsArray.getArrayElemSubobject(0).getPointerTo();
            this.initializerList.getMemberObject("begin").setValue(eltsPointer);
            this.initializerList.getMemberObject("begin").setValue(eltsPointer.pointerOffsetRaw(this.elements.length));
            this.setEvalResult(this.initializerList);
            this.startCleanup();
        }
    }
    stepForwardImpl() {
        // Do nothing
    }
}
exports.RuntimeInitializerListExpression = RuntimeInitializerListExpression;
const AUXILIARY_EXPRESSION_CONTEXT = {
    program: undefined,
    translationUnit: undefined,
    contextualScope: undefined,
    isLibrary: false
};
class AuxiliaryExpression extends expressionBase_1.Expression {
    constructor(type, valueCategory) {
        super(AUXILIARY_EXPRESSION_CONTEXT, undefined);
        this.construct_type = "auxiliary_expression";
        this.type = type;
        this.valueCategory = valueCategory;
    }
    createDefaultOutlet(element, parent) {
        throw new Error("Cannot create an outlet for an auxiliary expression. (They should never be used at runtime.)");
    }
    describeEvalResult(depth) {
        throw new Error("Auxiliary expressions have no description");
    }
}
exports.AuxiliaryExpression = AuxiliaryExpression;
// TODO: see if we could move this to another module? Maybe entities.ts?
function overloadResolution(candidates, argTypes, receiverType) {
    // TODO: add these checks, and send errors back to construct that calls this if they aren't met
    // Should return the function selected as well as an array of object-typed params that contain
    // any implicit conversions necessary.
    // if (!allWellTyped(args)) {
    //     // If arguments are not well-typed, we can't continue onward to select a function
    //     // and create a function call, so instead just give up attach arguments here.
    //     this.attachAll(args);
    //     return;
    // }
    // if (!allObjectTyped(args)) {
    //     // Only object types may be passed as arguments to functions.
    //     this.addNote(CPPError.declaration.init.no_default_constructor(this, this.target)); // TODO: fix
    //     this.attachAll(args);
    //     return;
    // }
    // Find the constructor
    let viable = [];
    let resultCandidates = candidates.map((candidate) => {
        var _a;
        let tempArgs = [];
        var notes = [];
        // Check argument types against parameter types
        let candidateParamTypes = candidate.type.paramTypes;
        if (argTypes.length !== candidateParamTypes.length) {
            notes.push(errors_1.CPPError.param.numParams(candidate.firstDeclaration));
        }
        // TODO: add back in with member functions
        else if (candidate.isMemberFunction && (receiverType === null || receiverType === void 0 ? void 0 : receiverType.isConst) && !((_a = candidate.type.receiverType) === null || _a === void 0 ? void 0 : _a.isConst)) {
            notes.push(errors_1.CPPError.param.thisConst(candidate.firstDeclaration, receiverType));
        }
        else {
            argTypes.forEach((argType, i) => {
                if (!argType) {
                    return; // ignore undefined argType, assume it "works" since there will be an error elsewhere already
                }
                let candidateParamType = candidateParamTypes[i];
                if (candidateParamType.isReferenceType()) {
                    // tempArgs.push(args[i]);
                    if (!types_1.referenceCompatible(argType, candidateParamType)) {
                        notes.push(errors_1.CPPError.param.paramReferenceType(candidate.firstDeclaration, argType, candidateParamType));
                    }
                    //else if (args[i].valueCategory !== "lvalue"){
                    //    problems.push(CPPError.param.paramReferenceLvalue(args[i]));
                    //}
                }
                else {
                    // tempArgs.push(standardConversion(args[i], argTypes[i]));
                    // Attempt standard conversion of an auxiliary expression of the argument's type to the param type
                    let auxArg = new AuxiliaryExpression(argType, "lvalue");
                    let convertedArg = standardConversion(auxArg, candidateParamType);
                    if (!types_1.sameType(convertedArg.type, candidateParamType)) {
                        notes.push(errors_1.CPPError.param.paramType(candidate.firstDeclaration, argType, candidateParamType));
                    }
                }
            });
        }
        if (notes.length == 0) { // All notes in this function are errors, so if there are any it's not viable
            viable.push(candidate);
        }
        return { candidate: candidate, notes: notes };
    });
    // TODO: need to determine which of several viable overloads is the best option
    // TODO: need to detect when multiple viable overloads have the same total conversion length, which results in an ambiguity
    // let selected = viable.reduce((best, current) => {
    //     if (convLen(current.type.paramTypes) < convLen(best.type.paramTypes)) {
    //         return current;
    //     }
    //     else {
    //         return best;
    //     }
    // });
    let selected = viable[0] ? viable[0] : undefined;
    return {
        candidates: resultCandidates,
        viable: viable,
        selected: selected
    };
}
exports.overloadResolution = overloadResolution;
;
// TODO: add some RNG function?
const MAGIC_FUNCTIONS = {
    assert: {
        returnType: types_1.VoidType.VOID,
        valueCategory: "prvalue",
        paramTypes: [types_1.Bool.BOOL],
        operate: (rt) => {
            let arg = rt.args[0].evalResult;
            if (!arg.rawValue) {
                console.log("assertion failed");
                rt.sim.eventOccurred(Simulation_1.SimulationEvent.ASSERTION_FAILURE, `Assertion failed on line ${rt.model.getNearestSourceReference().line}.`, true);
            }
            else {
                console.log("assertion PASSED");
            }
        }
    },
    pause: {
        returnType: types_1.VoidType.VOID,
        valueCategory: "prvalue",
        paramTypes: [],
        operate: (rt) => {
            // rt.sim.pause();
        }
    },
    pauseIf: {
        returnType: types_1.VoidType.VOID,
        valueCategory: "prvalue",
        paramTypes: [types_1.Bool.BOOL],
        operate: (rt) => {
            let arg = rt.args[0].evalResult;
            if (arg) {
                // rt.sim.pause();
            }
        }
    }
};
class MagicFunctionCallExpression extends expressionBase_1.Expression {
    constructor(context, ast, functionName, args) {
        super(context, ast);
        this.construct_type = "magic_function_call_expression";
        this.functionName = functionName;
        let fn = this.functionImpl = MAGIC_FUNCTIONS[functionName];
        this.type = fn.returnType;
        this.valueCategory = fn.valueCategory;
        this.args = args.map((arg, i) => {
            if (!arg.isWellTyped()) {
                return arg;
            }
            let paramType = fn.paramTypes[i];
            if (paramType.isReferenceType()) {
                if (!types_1.referenceCompatible(arg.type, paramType)) {
                    arg.addNote(errors_1.CPPError.declaration.init.referenceType(this, arg.type, paramType));
                }
                return arg;
            }
            else {
                let convertedArg = standardConversion(arg, paramType);
                if (!types_1.sameType(convertedArg.type, fn.paramTypes[i])) {
                    arg.addNote(errors_1.CPPError.declaration.init.convert(arg, convertedArg.type, paramType));
                }
                return convertedArg;
            }
        });
        this.attachAll(this.args);
    }
    // public createRuntimeExpression<RT extends PotentialReturnType>(this: CompiledMagicFunctionCallExpression<RT>, parent: RuntimeConstruct) : RuntimeMagicFunctionCallExpression<RT>
    // public createRuntimeExpression<T extends ObjectType, V extends ValueCategory>(this: CompiledExpressionBase<T,V>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<RT extends PotentialReturnType>(this: CompiledMagicFunctionCallExpression<RT>, parent: RuntimeConstruct) : RuntimeMagicFunctionCallExpression<RT> {
    //     return new RuntimeMagicFunctionCallExpression(this, parent);
    // }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.MagicFunctionCallExpressionOutlet(element, this, parent);
    }
    // TODO
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.MagicFunctionCallExpression = MagicFunctionCallExpression;
class RuntimeMagicFunctionCallExpression extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.args = this.model.args.map(arg => createRuntimeExpression(arg, this));
        this.setSubexpressions(this.args);
    }
    operate() {
        this.model.functionImpl.operate(this);
    }
}
exports.RuntimeMagicFunctionCallExpression = RuntimeMagicFunctionCallExpression;
// Standard conversions
class ImplicitConversion extends expressionBase_1.Expression {
    constructor(from, toType, valueCategory) {
        super(from.context, undefined);
        this.construct_type = "ImplicitConversion";
        this.attach(this.from = from);
        this.type = toType;
        this.valueCategory = valueCategory;
        if (from instanceof ImplicitConversion) {
            this.conversionLength = from.conversionLength + 1;
        }
        else {
            this.conversionLength = 1;
        }
    }
    createRuntimeExpression(parent) {
        return new RuntimeImplicitConversion(this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.ImplicitConversion = ImplicitConversion;
class RuntimeImplicitConversion extends SimpleRuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.from = createRuntimeExpression(this.model.from, this);
        this.setSubexpressions([this.from]);
    }
    operate() {
        this.setEvalResult(this.model.operate(this.from.evalResult));
    }
}
exports.RuntimeImplicitConversion = RuntimeImplicitConversion;
// export type AnalyticImplicitConversion<FromType extends ObjectType = ObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends ObjectType = ObjectType, ToVC extends ValueCategory = ValueCategory> = 
//     LValueToRValueConversion<FromType> |
//     ArrayToPointerConversion |
//     TypeConversion |
//     QualificationConversion;
// Type 1 Conversions
// LValueToRValue, ArrayToPointer, FunctionToPointer
class LValueToRValueConversion extends ImplicitConversion {
    // public readonly construct_type = "LValueToRValueConversion";
    constructor(from) {
        super(from, from.type.cvUnqualified(), "prvalue");
    }
    operate(fromEvalResult) {
        return fromEvalResult.getValue(); // Cast technically necessary here
        // TODO: add alert if value is invalid
        // e.g. inst.setEvalResult(readValueWithAlert(evalValue, sim, this.from, inst.childInstances.from));
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.LValueToRValueOutlet(element, this, parent);
    }
}
exports.LValueToRValueConversion = LValueToRValueConversion;
class ArrayToPointerConversion extends ImplicitConversion {
    // public readonly construct_type = "ArrayToPointerConversion";
    constructor(from) {
        super(from, from.type.adjustToPointerType(), "prvalue");
    }
    operate(fromEvalResult) {
        return fromEvalResult.decayToPointer();
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.ArrayToPointerOutlet(element, this, parent);
    }
}
exports.ArrayToPointerConversion = ArrayToPointerConversion;
class StreamToBoolConversion extends ImplicitConversion {
    // public readonly construct_type = "StreamToBoolConversion";
    constructor(from) {
        super(from, types_1.Bool.BOOL, "prvalue");
    }
    operate(fromEvalResult) {
        return new runtimeEnvironment_1.Value(1, types_1.Bool.BOOL);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.StreamToBoolOutlet(element, this, parent);
    }
}
exports.StreamToBoolConversion = StreamToBoolConversion;
// /**
//  * A conversion that ensures a prvalue, which may or may not be an object, is
//  * "materialized" into an lvalue that is an object and to which a reference may be bound.
//  * 
//  * Note that Lobster handles "guaranteed copy elision" a bit differently than the
//  * standard. The standard (C++17 and beyond) basically says that prvalues don't ever
//  * create temporary objects, instead, a prvalue is simply an expression that has the
//  * ability to initialize an object or an operand to an operator. For example, in
//  * `int func(); int i = func();`, C++17 and beyond considers that there is no "temporary
//  * return object" that the return statement for `func()` initailizes. Rather, the call
//  * to `func()` is simply a prvalue that doesn't initialize anything until the compiler
//  * sees the context of `int i = ` and the return target becomes `i`.
//  * Lobster handles this differently. Lobster's concept of a prvalue is that it may itself
//  * already be a temporary object. It will go ahead and create the temporary return
//  * object in the above example and then simply elide the copy behind the scenes. (So that
//  * e.g. if it was a class-type object and not an int, there would be no extra copy ctor).
//  */
// export class TemporaryMaterializationConversion<T extends CompleteObjectType> extends ImplicitConversion<T, "prvalue", T, "lvalue"> {
//     public readonly materializedObject?: TemporaryObjectEntity<T>;
//     public readonly initializer: DirectInitializer;
//     public constructor(from: TypedExpression<T, "prvalue">) {
//         super(from, from.type, "lvalue");
//         // if the expression is of non-class type, 
//         this.materializedObject = this.createTemporaryObject(this.type, "[materialized temporary]");
//         this.initializer = DirectInitializer.create(this.context, this.materializedObject, [from], "direct");
//     }
//     public operate(fromEvalResult: VCResultTypes<T, "prvalue">) {
//         if (fromEvalResult instanceof Value) {
//             let materializedObject = this.materializedObject.objectInstance(this);
//         }
//         // this.materializedObject.setV
//         let eltsPointer = this.elementsArray!.getArrayElemSubobject(0).getPointerTo();
//         (<CPPObject<PointerType<ArithmeticType>>>this.materializedObject!.getMemberObject("begin")!).setValue(eltsPointer);
//         (<CPPObject<PointerType<ArithmeticType>>>this.materializedObject!.getMemberObject("begin")!).setValue(eltsPointer.pointerOffsetRaw(this.elements.length));
//         this.setEvalResult(<this["evalResult"]><unknown>this.materializedObject!);
//         return <VCResultTypes<T, "lvalue">>fromEvalResult.getValue(); // Cast technically necessary here
//         // TODO: add alert if value is invalid
//         // e.g. inst.setEvalResult(readValueWithAlert(evalValue, sim, this.from, inst.childInstances.from));
//     }
//     public createDefaultOutlet(this: CompiledTemporaryMaterializationConversion, element: JQuery, parent?: ConstructOutlet) {
//         return new TemporaryMaterializationOutlet(element, this, parent);
//     }
//     // describeEvalResult : function(depth, sim, inst){
//     //     if (inst && inst.evalResult){
//     //         return inst.evalResult.describe();
//     //     }
//     //     else if (depth == 0){
//     //         return {message: "the value of " + this.getSourceText()};
//     //     }
//     //     else{
//     //         return {message: "the value of " + this.from.describeEvalResult(depth-1,sim, inst && inst.childInstances && inst.childInstances.from).message};
//     //     }
//     // },
//     // explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//     //     return {message: "The value of " + this.from.describeEvalResult(0, sim, inst && inst.childInstances && inst.childInstances.from).message + " will be looked up."};
//     // }
// }
// export interface TypedTemporaryMaterializationConversion<T extends AtomicType = AtomicType> extends TemporaryMaterializationConversion<T>, t_TypedExpression {
// }
// export interface CompiledTemporaryMaterializationConversion<T extends AtomicType = AtomicType> extends TypedTemporaryMaterializationConversion<T>, SuccessfullyCompiled {
//     readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
//     readonly from: CompiledExpression<T, "lvalue">; // satisfies CompiledImplicitConversion and TemporaryMaterialization structure
// }
// export var FunctionToPointer = ImplicitConversion.extend({
//     _name: "FunctionToPointer",
//     init: function(from){
//         assert(isA(from.type, Types.Function));
//         this.initParent(from, Types.Pointer.instance(from.type), "prvalue");
//     },
//     operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var func = inst.childInstances.from.evalResult;
//         inst.setEvalResult(Value.instance(func, this.type));
//     },
//     explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         return {message: "Using the name of a function in an expression will yield a pointer to that function."};
//     }
// });
// Type 2 Conversions
/**
 * All type conversions ignore (top-level) cv-qualifications on the given destination
 * type. This is because type conversions only operate on prvalues of atomic type,
 * which cannot be cv-qualified. For convenience, the user may still specify a
 * cv-qualified type and the cv-unqualified version will be used instead.
 */
class TypeConversion extends ImplicitConversion {
    constructor(from, toType) {
        super(from, toType.cvUnqualified(), "prvalue");
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.TypeConversionOutlet(element, this, parent);
    }
}
class NoOpTypeConversion extends TypeConversion {
    constructor(from, toType) {
        super(from, toType);
    }
    operate(fromEvalResult) {
        return new runtimeEnvironment_1.Value(fromEvalResult.rawValue, this.type, fromEvalResult.isValid); // Cast technically necessary here
    }
}
class NullPointerConversion extends NoOpTypeConversion {
    constructor(from, toType) {
        super(from, toType);
        util_1.assert(from.value.rawValue === 0);
    }
}
exports.NullPointerConversion = NullPointerConversion;
class PointerConversion extends NoOpTypeConversion {
}
exports.PointerConversion = PointerConversion;
class ToBooleanConversion extends TypeConversion {
    constructor(from) {
        super(from, types_1.Bool.BOOL);
    }
    operate(fromEvalResult) {
        return new runtimeEnvironment_1.Value(fromEvalResult.rawValue === 0 ? 0 : 1, types_1.Bool.BOOL, fromEvalResult.isValid);
    }
}
exports.ToBooleanConversion = ToBooleanConversion;
class PointerToBooleanConversion extends ToBooleanConversion {
    // public readonly construct_type = "PointerToBooleanConversion";
    isSemanticallyEquivalent_impl(other, ec) {
        if (other.construct_type === this.construct_type) {
            return constructs_1.areSemanticallyEquivalent(this.from, other.from, ec);
        }
        if (other.construct_type === "pointer_comparison_expression") {
            return semantic_equivalence_1.checkForNullptrEquivalence(this, other, ec);
        }
        return false;
    }
}
exports.PointerToBooleanConversion = PointerToBooleanConversion;
class FloatingToBooleanConversion extends ToBooleanConversion {
}
exports.FloatingToBooleanConversion = FloatingToBooleanConversion;
class IntegralToBooleanConversion extends ToBooleanConversion {
    // public readonly construct_type = "IntegralToBooleanConversion";
    isSemanticallyEquivalent_impl(other, ec) {
        if (other.construct_type === this.construct_type) {
            return constructs_1.areSemanticallyEquivalent(this.from, other.from, ec);
        }
        if (other.construct_type === "relational_binary_operator_expression") {
            return semantic_equivalence_1.checkForZeroEquivalence(this, other, ec);
        }
        return false;
    }
}
exports.IntegralToBooleanConversion = IntegralToBooleanConversion;
class IntegralPromotion extends NoOpTypeConversion {
}
exports.IntegralPromotion = IntegralPromotion;
class IntegralConversion extends NoOpTypeConversion {
}
exports.IntegralConversion = IntegralConversion;
class FloatingPointPromotion extends NoOpTypeConversion {
    // public readonly construct_type = "FloatingPointPromotion";
    constructor(from) {
        super(from, types_1.Double.DOUBLE);
    }
}
exports.FloatingPointPromotion = FloatingPointPromotion;
class FloatingPointConversion extends NoOpTypeConversion {
}
exports.FloatingPointConversion = FloatingPointConversion;
class IntegralToFloatingConversion extends NoOpTypeConversion {
}
exports.IntegralToFloatingConversion = IntegralToFloatingConversion;
class FloatingToIntegralConversion extends TypeConversion {
    // public readonly construct_type = "FloatingToIntegralConversion";
    operate(fromEvalResult) {
        if (this.type.isType(types_1.Bool)) {
            return new runtimeEnvironment_1.Value(fromEvalResult.rawValue === 0 ? 0 : 1, types_1.Int.INT, fromEvalResult.isValid);
        }
        return new runtimeEnvironment_1.Value(Math.trunc(fromEvalResult.rawValue), types_1.Int.INT, fromEvalResult.isValid);
    }
}
exports.FloatingToIntegralConversion = FloatingToIntegralConversion;
// TODO: remove this. no longer needed now that we have real strings
// StringToCStringConversion = ImplicitConversion.extend({
//     _name: "StringToCStringConversion",
//     init: function(from, toType){
//         assert(from.valueCategory === "prvalue");
//         assert(isA(from.type, Types.String));
//         assert(isA(toType, Types.Array) && isA(toType.elemType, Types.Char));
//         this.initParent(from, toType, "prvalue");
//     },
//
//     operate : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         // I think only thing I really need here is to handle booleans gracefully
//         // Adding 0.0 should do the trick.
//         var cstr = inst.childInstances.from.evalResult.value;
//         inst.setEvalResult(Value.instance(cstr.split(""), Types.String));
//     }
// });
// Qualification conversions
class QualificationConversion extends ImplicitConversion {
    // public readonly construct_type = "QualificationConversion";
    constructor(from, toType) {
        super(from, toType, "prvalue");
        util_1.assert(types_1.similarType(from.type, toType));
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.QualificationConversionOutlet(element, this, parent);
    }
    operate(fromEvalResult) {
        return fromEvalResult.cvQualified(this.type.isConst, this.type.isVolatile);
    }
}
exports.QualificationConversion = QualificationConversion;
function convertToPRValue(from) {
    let analyticFrom = from;
    if (predicates_1.Predicates.isTypedExpression(analyticFrom, types_1.isBoundedArrayType, "lvalue")) {
        return new ArrayToPointerConversion(analyticFrom);
    }
    if (!predicates_1.Predicates.isTypedExpression(analyticFrom, types_1.isAtomicType)) {
        return analyticFrom;
    }
    // based on union input type, it must be atomic typed if we get to here
    if (analyticFrom.isPrvalue()) {
        return analyticFrom;
    }
    // must be an lvalue if we get to here
    // assert(x.isLvalue());
    // TODO: add back in for function pointers
    // if (from.type instanceof FunctionType) {
    //     return new FunctionToPointer(from);
    // }
    return new LValueToRValueConversion(analyticFrom);
}
exports.convertToPRValue = convertToPRValue;
;
function typeConversion(from, toType) {
    if (types_1.similarType(from.type, toType)) {
        return from;
    }
    if (toType.isPointerType() && isIntegerLiteralZero(from)) {
        return new NullPointerConversion(from, toType);
    }
    if (toType.isPointerType() && toType.ptrTo.isPotentiallyCompleteClassType() &&
        predicates_1.Predicates.isTypedExpression(from, types_1.isPointerType) && from.type.ptrTo.isPotentiallyCompleteClassType() &&
        types_1.subType(from.type.ptrTo, toType.ptrTo)) {
        // Note that cv qualifications on the new destination pointer type don't need to be set, since
        // they are ignored by the PointerConversion anyway (the result is always cv-unqualified).
        // However, we do need to preserve the cv-qualifications on the pointed-to type.
        return new PointerConversion(from, new types_1.PointerType(toType.ptrTo.cvQualified(from.type.ptrTo.isConst, from.type.ptrTo.isVolatile)));
    }
    if (toType.isType(types_1.Bool)) {
        if (predicates_1.Predicates.isTypedExpression(from, types_1.isPointerType)) {
            return new PointerToBooleanConversion(from);
        }
        else if (predicates_1.Predicates.isTypedExpression(from, types_1.isFloatingPointType)) {
            return new FloatingToBooleanConversion(from);
        }
        else if (predicates_1.Predicates.isTypedExpression(from, types_1.isIntegralType)) {
            return new IntegralToBooleanConversion(from);
        }
    }
    if (toType.isType(types_1.Double) && predicates_1.Predicates.isTypedExpression(from, types_1.isType(types_1.Float))) {
        return new FloatingPointPromotion(from);
    }
    if (toType.isIntegralType()) {
        if (predicates_1.Predicates.isTypedExpression(from, types_1.isIntegralType)) {
            return new IntegralConversion(from, toType);
        }
        if (predicates_1.Predicates.isTypedExpression(from, types_1.isFloatingPointType)) {
            return new FloatingToIntegralConversion(from, toType);
        }
    }
    if (toType.isFloatingPointType()) {
        if (predicates_1.Predicates.isTypedExpression(from, types_1.isIntegralType)) {
            return new IntegralToFloatingConversion(from, toType);
        }
        if (predicates_1.Predicates.isTypedExpression(from, types_1.isFloatingPointType)) {
            return new FloatingPointConversion(from, toType);
        }
    }
    return from;
}
exports.typeConversion = typeConversion;
;
function qualificationConversion(from, toType) {
    if (types_1.sameType(from.type, toType)) {
        return from;
    }
    if (from.valueCategory === "prvalue" && types_1.isCvConvertible(from.type, toType)) {
        return new QualificationConversion(from, toType);
    }
    return from;
}
exports.qualificationConversion = qualificationConversion;
;
/**
 * Attempts to generate a standard conversion sequence of the given expression to the given
 * destination type.
 * @param from The original expression
 * @param toType The destination type
 * @param options
 */
function standardConversion(from, toType, options = {}) {
    if (predicates_1.Predicates.isTypedExpression(from, types_1.isCompleteClassType, "lvalue") && (from.type.className === "ostream" || from.type.className === "istream")) {
        return new StreamToBoolConversion(from);
    }
    // Unless the object is atomic typed or is an array, Lobster currently doesn't support
    // any standard conversions. Note in particular this means user-defined converison functions
    // for class-typed objects are not supported.
    if (!(predicates_1.Predicates.isTypedExpression(from, types_1.isAtomicType) || predicates_1.Predicates.isTypedExpression(from, types_1.isBoundedArrayType, "lvalue"))) {
        return from;
    }
    if (!toType.isAtomicType()) {
        return options.suppressLTR ? from : convertToPRValue(from);
    }
    if (!options.suppressLTR) {
        let fromPrvalue = convertToPRValue(from);
        fromPrvalue = typeConversion(fromPrvalue, toType);
        fromPrvalue = qualificationConversion(fromPrvalue, toType);
        return fromPrvalue;
    }
    return from;
}
exports.standardConversion = standardConversion;
;
function integralPromotion(expr) {
    if (predicates_1.Predicates.isTypedExpression(expr, types_1.isIntegralType) && !predicates_1.Predicates.isTypedExpression(expr, types_1.isType(types_1.Int))) {
        return new IntegralPromotion(expr, types_1.Int.INT);
    }
    else {
        return expr;
    }
}
exports.integralPromotion = integralPromotion;
;
function isIntegerLiteralZero(from) {
    return from instanceof NumericLiteralExpression && types_1.isType(from.type, types_1.Int) && from.value.rawValue === 0;
}
exports.isIntegerLiteralZero = isIntegerLiteralZero;
function isConvertibleToPointer(from) {
    if (!from.isWellTyped()) {
        return false;
    }
    return predicates_1.Predicates.isTypedExpression(from, types_1.isPointerType) || predicates_1.Predicates.isTypedExpression(from, types_1.isBoundedArrayType, "lvalue") || isIntegerLiteralZero(from);
}
exports.isConvertibleToPointer = isConvertibleToPointer;
function isConvertible(from, toType, options = {}) {
    let aux = new AuxiliaryExpression(from.type, from.valueCategory);
    let converted = standardConversion(aux, toType, options);
    return types_1.sameType(converted.type, toType);
}
exports.isConvertible = isConvertible;
function usualArithmeticConversions(leftOrig, rightOrig) {
    let left = convertToPRValue(leftOrig);
    let right = convertToPRValue(rightOrig);
    // TODO If either has scoped enumeration type, no conversions are performed
    // TODO If either is long double, the other shall be converted to long double
    // If either is double, the other shall be converted to double
    if (predicates_1.Predicates.isTypedExpression(left, types_1.isType(types_1.Double))) {
        right = typeConversion(right, types_1.Double.DOUBLE);
        return [left, right];
    }
    if (predicates_1.Predicates.isTypedExpression(right, types_1.isType(types_1.Double))) {
        left = typeConversion(left, types_1.Double.DOUBLE);
        return [left, right];
    }
    // If either is float, the other shall be converted to float
    if (predicates_1.Predicates.isTypedExpression(left, types_1.isType(types_1.Float))) {
        right = typeConversion(right, types_1.Float.FLOAT);
        return [left, right];
    }
    if (predicates_1.Predicates.isTypedExpression(right, types_1.isType(types_1.Float))) {
        left = typeConversion(left, types_1.Float.FLOAT);
        return [left, right];
    }
    // Otherwise, do integral promotions
    if (predicates_1.Predicates.isTypedExpression(left, types_1.isIntegralType)) {
        left = integralPromotion(left);
    }
    if (predicates_1.Predicates.isTypedExpression(right, types_1.isIntegralType)) {
        right = integralPromotion(right);
    }
    // If both operands have the same type, no further conversion is needed
    if (types_1.sameType(left.type, right.type)) {
        return [left, right];
    }
    // TODO: Otherwise, if both operands have signed or both have unsigned types,
    // operand with type of lesser integer conversion rank shall be converted
    // to the type of the operand with greater rank
    return [left, right];
}
exports.usualArithmeticConversions = usualArithmeticConversions;
function selectOperatorOverload(context, ast, operator, originalArgs) {
    if (!expressionBase_1.allWellTyped(originalArgs)) {
        return undefined;
    }
    let leftmost = originalArgs[0];
    let operatorFunctionName = "operator" + operator;
    let lookupResult;
    let adjustedArgs;
    let receiverType;
    if (leftmost.type.isCompleteClassType()) {
        // Attempt member lookup for operator overload function
        adjustedArgs = originalArgs.slice(1);
        lookupResult = leftmost.type.classScope.lookup(operatorFunctionName, { kind: "normal", noParent: true });
        receiverType = leftmost.type;
    }
    // If we didn't find a member option
    if (!lookupResult) {
        lookupResult = context.contextualScope.lookup(operatorFunctionName, { kind: "normal" });
        adjustedArgs = originalArgs;
        receiverType = undefined;
    }
    // If we still don't have anything
    if (!lookupResult || !adjustedArgs) {
        return undefined;
    }
    // These are not possible since you can't have a variable or
    // class with a name of e.g. "operator+"
    util_1.assert(lookupResult.declarationKind !== "variable");
    util_1.assert(lookupResult.declarationKind !== "class");
    let selected = overloadResolution(lookupResult.overloads, adjustedArgs.map(arg => arg.type), receiverType).selected;
    if (selected) {
        if (selected.isMemberFunction) {
            return new MemberOperatorOverloadExpression(context, ast, operator, leftmost, adjustedArgs, selected);
        }
        else {
            return new NonMemberOperatorOverloadExpression(context, ast, operator, adjustedArgs, selected);
        }
    }
    else {
        return undefined;
    }
}
exports.selectOperatorOverload = selectOperatorOverload;
class NonMemberOperatorOverloadExpression extends expressionBase_1.Expression {
    constructor(context, ast, operator, args, selectedFunctionEntity) {
        super(context, ast);
        this.construct_type = "non_member_operator_overload_expression";
        this.operator = operator;
        this.originalArgs = args;
        // If any arguments are not well typed, we can't select a function.
        if (!expressionBase_1.allWellTyped(args)) {
            // type, valueCategory, and call remain undefined
            this.attachAll(args);
            return;
        }
        if (!selectedFunctionEntity.returnsCompleteType()) {
            this.addNote(errors_1.CPPError.expr.functionCall.incomplete_return_type(this, selectedFunctionEntity.type.returnType));
            this.attachAll(args);
            return;
        }
        let returnType = selectedFunctionEntity.type.returnType;
        this.type = types_1.peelReference(returnType);
        this.valueCategory = returnType instanceof types_1.ReferenceType ? "lvalue" : "prvalue";
        // If we get to here, we don't attach the args directly since they will be attached under the function call.
        this.attach(this.call = new FunctionCall_1.FunctionCall(context, selectedFunctionEntity, args, undefined));
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.NonMemberOperatorOverloadExpressionOutlet(element, this, parent);
    }
    // TODO
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.NonMemberOperatorOverloadExpression = NonMemberOperatorOverloadExpression;
class RuntimeNonMemberOperatorOverloadExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.call = this.model.call.createRuntimeFunctionCall(this, undefined);
    }
    upNextImpl() {
        if (!this.call.isDone) {
            this.sim.push(this.call);
        }
        else {
            // Note: cannot use this.model.type here, since that is the type of the function
            // call expression, which would have had the reference type removed if this was return
            // by reference. Instead, use the return type of the called function itself, which will have
            // the reference type intact.
            let returnType = this.model.call.func.type.returnType;
            // NOTE: below is copied from RuntimeFunctionCallExpresssion
            if (returnType.isVoidType()) {
                // this.setEvalResult(null); // TODO: type system won't allow this currently
            }
            else if (returnType.isReferenceType()) {
                // Return by reference is lvalue and yields the returned object
                let retObj = this.call.calledFunction.returnObject;
                this.setEvalResult(retObj);
            }
            else if (returnType.isAtomicType()) {
                // Return by value of atomic type. In this case, we can look up
                // the value of the return object and use that as the eval result
                let retObj = this.call.calledFunction.returnObject;
                this.setEvalResult(retObj.getValue());
            }
            else {
                // Return by value of a non-atomic type. In this case, it's still a prvalue
                // but is the temporary object rather than its value.
                let retObj = this.call.calledFunction.returnObject;
                this.setEvalResult(retObj);
            }
            this.startCleanup();
        }
    }
    stepForwardImpl() {
        // nothing to do
    }
}
exports.RuntimeNonMemberOperatorOverloadExpression = RuntimeNonMemberOperatorOverloadExpression;
class MemberOperatorOverloadExpression extends expressionBase_1.Expression {
    constructor(context, ast, operator, receiverExpression, args, selectedFunctionEntity) {
        super(context, ast);
        this.construct_type = "member_operator_overload_expression";
        this.operator = operator;
        this.attach(this.receiverExpression = receiverExpression);
        this.originalArgs = args;
        // If any arguments are not well typed, we can't select a function.
        if (!receiverExpression.isWellTyped() || !expressionBase_1.allWellTyped(args)) {
            // type, valueCategory, and call remain undefined
            this.attachAll(args);
            return;
        }
        if (!selectedFunctionEntity.returnsCompleteType()) {
            this.addNote(errors_1.CPPError.expr.functionCall.incomplete_return_type(this, selectedFunctionEntity.type.returnType));
            this.attachAll(args);
            return;
        }
        let returnType = selectedFunctionEntity.type.returnType;
        this.type = types_1.peelReference(returnType);
        this.valueCategory = returnType instanceof types_1.ReferenceType ? "lvalue" : "prvalue";
        // Attach the right as an argument of the function call.
        // Left is the receiver of that call and was already attached as a child.
        this.attach(this.call = new FunctionCall_1.FunctionCall(context, selectedFunctionEntity, args, receiverExpression.type));
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.MemberOperatorOverloadExpressionOutlet(element, this, parent);
    }
    // TODO
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.MemberOperatorOverloadExpression = MemberOperatorOverloadExpression;
class RuntimeMemberOperatorOverloadExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.receiverExpression = createRuntimeExpression(this.model.receiverExpression, this);
    }
    upNextImpl() {
        if (!this.receiverExpression.isDone) {
            this.sim.push(this.receiverExpression);
        }
        else if (!this.call) {
            this.call = this.model.call.createRuntimeFunctionCall(this, this.receiverExpression.evalResult);
            this.sim.push(this.call);
        }
        else {
            // Note: cannot use this.model.type here, since that is the type of the function
            // call expression, which would have had the reference type removed if this was return
            // by reference. Instead, use the return type of the called function itself, which will have
            // the reference type intact.
            let returnType = this.model.call.func.type.returnType;
            // NOTE: below is copied from RuntimeFunctionCallExpresssion
            if (returnType.isVoidType()) {
                // this.setEvalResult(null); // TODO: type system won't allow this currently
            }
            else if (returnType.isReferenceType()) {
                // Return by reference is lvalue and yields the returned object
                let retObj = this.call.calledFunction.returnObject;
                this.setEvalResult(retObj);
            }
            else if (returnType.isAtomicType()) {
                // Return by value of atomic type. In this case, we can look up
                // the value of the return object and use that as the eval result
                let retObj = this.call.calledFunction.returnObject;
                this.setEvalResult(retObj.getValue());
            }
            else {
                // Return by value of a non-atomic type. In this case, it's still a prvalue
                // but is the temporary object rather than its value.
                let retObj = this.call.calledFunction.returnObject;
                this.setEvalResult(retObj);
            }
            this.startCleanup();
        }
    }
    stepForwardImpl() {
        // nothing to do
    }
}
exports.RuntimeMemberOperatorOverloadExpression = RuntimeMemberOperatorOverloadExpression;
class InvalidOperatorOverloadExpression extends InvalidExpression {
    constructor(context, ast, op, originalArgs) {
        super(context, ast);
        this.construct_type = "invalid_operator_overload_expression";
        this.operator = op;
        if (expressionBase_1.allWellTyped(originalArgs)) {
            this.addNote(errors_1.CPPError.expr.operatorOverload.no_such_overload(this, op));
        }
        this.attachAll(this.originalArgs = originalArgs);
    }
    createDefaultOutlet(element, parent) {
        throw new Error("Cannot create an outlet for an invalid expression.");
    }
    describeEvalResult(depth) {
        return {
            message: "an unsupported expression"
        };
    }
}
exports.InvalidOperatorOverloadExpression = InvalidOperatorOverloadExpression;
//# sourceMappingURL=expressions.js.map