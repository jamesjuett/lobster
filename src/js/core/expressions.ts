import { CPPObject } from "./objects";
import { Simulation, SimulationEvent } from "./Simulation";
import { Type, ObjectType, AtomicType, IntegralType, PointerType, ReferenceType, ClassType, BoundedArrayType, FunctionType, isType, PotentialReturnType, Bool, sameType, VoidType, ArithmeticType, ArrayPointerType, Int, PotentialParameterType, Float, Double, Char, NoRefType, noRef, ArrayOfUnknownBoundType, referenceCompatible, similarType, subType, ArrayElemType } from "./types";
import { ASTNode, SuccessfullyCompiled, RuntimeConstruct, CompiledTemporaryDeallocator, CPPConstruct, ExpressionContext, ConstructDescription } from "./constructs";
import { Note, CPPError } from "./errors";
import { FunctionEntity, ObjectEntity } from "./entities";
import { Value, RawValueType } from "./runtimeEnvironment";
import { escapeString, assertNever } from "../util/util";
import { standardConversion, convertToPRValue, usualArithmeticConversions, isIntegerLiteralZero, NullPointerConversion, ArrayToPointerConversion } from "./standardConversions";
import { checkIdentifier, MAGIC_FUNCTION_NAMES } from "./lexical";
import { FunctionCallExpressionASTNode, FunctionCallExpression, TypedFunctionCallExpression, CompiledFunctionCallExpression, RuntimeFunctionCallExpression } from "./functionCall";
import { RuntimeExpression, VCResultTypes, ValueCategory, ExpressionBase, CompiledExpressionBase, TypedExpressionBase } from "./expressionBase";
import { ConstructOutlet, TernaryExpressionOutlet, CommaExpressionOutlet, AssignmentExpressionOutlet, BinaryOperatorExpressionOutlet, UnaryOperatorExpressionOutlet, SubscriptExpressionOutlet, IdentifierOutlet, NumericLiteralOutlet, ParenthesesOutlet, MagicFunctionCallExpressionOutlet, StringLiteralExpressionOutlet } from "../view/codeOutlets";
import { AnalyticCompiledExpression, AnalyticTypedExpression } from "./predicates";


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

/**
 * Union of potential expression AST types for a generic expression.
 */
export type ExpressionASTNode =
    CommaASTNode |
    TernaryASTNode |
    AssignmentExpressionASTNode |
    CompoundAssignmentExpressionASTNode |
    BinaryOperatorExpressionASTNode |
    PointerToMemberExpressionASTNode |
    CStyleCastExpressionASTNode |
    UnaryOperatorExpressionASTNode |
    PostfixExpressionASTNode |
    ConstructExpressionASTNode |
    IdentifierExpressionASTNode |
    ThisExpressionASTNode |
    NumericLiteralASTNode |
    StringLiteralASTNode |
    ParenthesesExpressionASTNode;

    
export type Expression =
    CommaExpression |
    TernaryExpression |
    AssignmentExpression |
    // CompoundAssignmentExpression |
    BinaryOperatorExpression |
    // PointerToMemberExpression |
    // CStyleCastExpression |
    UnaryOperatorExpression | // TODO change to union type
    SubscriptExpression |
    FunctionCallExpression |
    // ConstructExpression |
    IdentifierExpression |
    // ThisExpression |
    NumericLiteralExpression |
    StringLiteralExpression |
    ParenthesesExpression |
    MagicFunctionCallExpression |
    AuxiliaryExpression |
    UnsupportedExpression;

const ExpressionConstructsMap = {
    "comma_expression" : (ast: CommaASTNode, context: ExpressionContext) => CommaExpression.createFromAST(ast, context),
    
    "ternary_expression" : (ast: TernaryASTNode, context: ExpressionContext) => TernaryExpression.createFromAST(ast, context),
    
    "assignment_expression" : (ast: AssignmentExpressionASTNode, context: ExpressionContext) => AssignmentExpression.createFromAST(ast, context),
    "compound_assignment_expression" : (ast: CompoundAssignmentExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "compound assignment").setAST(ast),
    
    // binary operators
    "arithmetic_binary_operator_expression" : (ast: ArithmeticBinaryOperatorExpressionASTNode, context: ExpressionContext) => ArithmeticBinaryOperatorExpression.createFromAST(ast, context),
    "relational_binary_operator_expression" : (ast: RelationalBinaryOperatorExpressionASTNode, context: ExpressionContext) => RelationalBinaryOperatorExpression.createFromAST(ast, context),
    "logical_binary_operator_expression" : (ast: LogicalBinaryOperatorExpressionASTNode, context: ExpressionContext) => LogicalBinaryOperatorExpression.createFromAST(ast, context),
    
    "pointer_to_member_expression" : (ast: PointerToMemberExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "pointer-to-member").setAST(ast),
    
    "c_style_cast_expression" : (ast: CStyleCastExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "c-style cast").setAST(ast),
    
    // prefix operators
    "prefix_increment_expression" : (ast: PrefixIncrementExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "prefix increment").setAST(ast),
    "prefix_decrement_expression" : (ast: PrefixDecrementExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "prefix decrement").setAST(ast),
    "dereference_expression" : (ast: DereferenceExpressionASTNode, context: ExpressionContext) => DereferenceExpression.createFromAST(ast, context),
    "address_of_expression" : (ast: AddressOfExpressionASTNode, context: ExpressionContext) => AddressOfExpression.createFromAST(ast, context),
    "unary_plus_expression" : (ast: UnaryPlusExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "unary plus").setAST(ast),
    "unary_minus_expression" : (ast: UnaryMinusExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "unary minus").setAST(ast),
    "logical_not_expression" : (ast: LogicalNotExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "logical not").setAST(ast),
    "bitwise_not_expression" : (ast: BitwiseNotExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "bitwise not").setAST(ast),
    "sizeof_expression" : (ast: SizeofExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "sizeof").setAST(ast),
    "sizeof_type_expression" : (ast: SizeofTypeExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "sizeof (type)").setAST(ast),
    "new_expression" : (ast: NewExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "new").setAST(ast),
    "delete_expression" : (ast: DeleteExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "delete").setAST(ast),
    "delete_array_expression" : (ast: DeleteArrayExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "delete[]").setAST(ast),
    
    // postfix operators
    "static_cast_expression" : (ast: StaticCastExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "static cast").setAST(ast),
    "dynamic_cast_expression" : (ast: DynamicCastExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "dynamic cast").setAST(ast),
    "reinterpret_cast_expression" : (ast: ReinterpretCastExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "reinterpret cast").setAST(ast),
    "const_cast_expression" : (ast: ConstCastExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "const cast").setAST(ast),
    "subscript_expression" : (ast: SubscriptExpressionASTNode, context: ExpressionContext) => SubscriptExpression.createFromAST(ast, context),
    "function_call_expression" : (ast: FunctionCallExpressionASTNode, context: ExpressionContext) => FunctionCallExpression.createFromAST(ast, context),
    "dot_expression" : (ast: DotExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "dot operator").setAST(ast),
    "arrow_expression" : (ast: ArrowExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "arrow operator").setAST(ast),
    "postfix_increment_expression" : (ast: PostfixIncrementExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "postfix increment").setAST(ast),
    "postfix_decrement_expression" : (ast: PostfixDecrementExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "postfix decrement").setAST(ast),
    
    "construct_expression" : (ast: ConstructExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "construct expression").setAST(ast),
    
    "identifier_expression" : (ast: IdentifierExpressionASTNode, context: ExpressionContext) => IdentifierExpression.createFromAST(ast, context),
    
    "this_expression" : (ast: ThisExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, "this pointer").setAST(ast),

    "numeric_literal" : (ast: NumericLiteralASTNode, context: ExpressionContext) => NumericLiteralExpression.createFromAST(ast, context),
    "string_literal" : (ast: StringLiteralASTNode, context: ExpressionContext) => StringLiteralExpression.createFromAST(ast, context),
    "parentheses_expression" : (ast: ParenthesesExpressionASTNode, context: ExpressionContext) => ParenthesesExpression.createFromAST(ast, context)
}

/**
 * Creates an expression construct based on a given expression AST node.
 * If the `ast` argument has a union type that is a subtype of `ExpressionASTNode`,
 * this function's return type is inferred as corresponding union of construct types.
 * @param ast An expression AST node.
 * @param context The context in which this expression occurs.
 */
export function createExpressionFromAST<ASTType extends ExpressionASTNode>(ast: ASTType, context: ExpressionContext) : ReturnType<(typeof ExpressionConstructsMap)[ASTType["construct_type"]]> {
    return <any>ExpressionConstructsMap[ast.construct_type](<any>ast, context);
}


export type TypedExpressionKinds<T extends Type, V extends ValueCategory> = {
    "unsupported_expression": never;
    "comma_expression": T extends NonNullable<CommaExpression["type"]> ? V extends NonNullable<CommaExpression["valueCategory"]> ? TypedCommaExpression<T> : never : never;
    "ternary_expression": T extends NonNullable<TernaryExpression["type"]> ? V extends NonNullable<TernaryExpression["valueCategory"]> ? TypedTernaryExpression<T> : never : never;
    "assignment_expression": T extends NonNullable<AssignmentExpression["type"]> ? V extends NonNullable<AssignmentExpression["valueCategory"]> ? TypedAssignmentExpression<T> : never : never;
    "arithmetic_binary_operator_expression": T extends NonNullable<ArithmeticBinaryOperatorExpression["type"]> ? V extends NonNullable<ArithmeticBinaryOperatorExpression["valueCategory"]> ? TypedArithmeticBinaryOperatorExpression<T> : never : never;
    "pointer_diference_expression": T extends NonNullable<PointerDifferenceExpression["type"]> ? V extends NonNullable<PointerDifferenceExpression["valueCategory"]> ? TypedPointerDifferenceExpression : never : never;
    "pointer_offset_expression": T extends NonNullable<PointerOffsetExpression["type"]> ? V extends NonNullable<PointerOffsetExpression["valueCategory"]> ? TypedPointerOffsetExpression<T> : never : never;
    "relational_binary_operator_expression": T extends NonNullable<RelationalBinaryOperatorExpression["type"]> ? V extends NonNullable<RelationalBinaryOperatorExpression["valueCategory"]> ? TypedRelationalBinaryOperatorExpression : never : never;
    "pointer_comparison_expression": T extends NonNullable<PointerComparisonExpression["type"]> ? V extends NonNullable<PointerComparisonExpression["valueCategory"]> ? TypedPointerComparisonExpression : never : never;
    "logical_binary_operator_expression": T extends NonNullable<LogicalBinaryOperatorExpression["type"]> ? V extends NonNullable<LogicalBinaryOperatorExpression["valueCategory"]> ? TypedLogicalBinaryOperatorExpression : never : never;
    "dereference_expression": T extends NonNullable<DereferenceExpression["type"]> ? V extends NonNullable<DereferenceExpression["valueCategory"]> ? TypedDereferenceExpression<T> : never : never;
    "address_of_expression": T extends NonNullable<AddressOfExpression["type"]> ? V extends NonNullable<AddressOfExpression["valueCategory"]> ? TypedAddressOfExpression<T> : never : never;
    "subscript_expression": T extends NonNullable<SubscriptExpression["type"]> ? V extends NonNullable<SubscriptExpression["valueCategory"]> ? TypedSubscriptExpression<T> : never : never;
    "identifier_expression": V extends NonNullable<IdentifierExpression["valueCategory"]> ? (T extends ObjectType ? TypedObjectIdentifierExpression<T> : T extends FunctionType ? TypedFunctionIdentifierExpression<T> : never) : never;
    "numeric_literal": T extends NonNullable<NumericLiteralExpression["type"]> ? V extends NonNullable<NumericLiteralExpression["valueCategory"]> ? TypedNumericLiteralExpression<T> : never : never;
    "string_literal": T extends NonNullable<StringLiteralExpression["type"]> ? V extends NonNullable<StringLiteralExpression["valueCategory"]> ? TypedStringLiteralExpression : never : never;
    "parentheses_expression": T extends NonNullable<ParenthesesExpression["type"]> ? V extends NonNullable<ParenthesesExpression["valueCategory"]> ? TypedParenthesesExpression<T> : never : never;
    "auxiliary_expression": T extends NonNullable<AuxiliaryExpression["type"]> ? V extends NonNullable<AuxiliaryExpression["valueCategory"]> ? TypedAuxiliaryExpression<T> : never : never;
    "magic_function_call_expression": T extends NonNullable<MagicFunctionCallExpression["type"]> ? V extends NonNullable<MagicFunctionCallExpression["valueCategory"]> ? TypedMagicFunctionCallExpression<T> : never : never;
    "function_call_expression": T extends NonNullable<FunctionCallExpression["type"]> ? V extends NonNullable<FunctionCallExpression["valueCategory"]> ? TypedFunctionCallExpression<T> : never : never;
}

export type CompiledExpressionKinds<T extends Type, V extends ValueCategory> = {
    "unsupported_expression": never;
    "comma_expression": T extends NonNullable<CommaExpression["type"]> ? V extends NonNullable<CommaExpression["valueCategory"]> ? CompiledCommaExpression<T> : never : never;
    "ternary_expression": T extends NonNullable<TernaryExpression["type"]> ? V extends NonNullable<TernaryExpression["valueCategory"]> ? CompiledTernaryExpression<T> : never : never;
    "assignment_expression": T extends NonNullable<AssignmentExpression["type"]> ? V extends NonNullable<AssignmentExpression["valueCategory"]> ? CompiledAssignmentExpression<T> : never : never;
    "arithmetic_binary_operator_expression": T extends NonNullable<ArithmeticBinaryOperatorExpression["type"]> ? V extends NonNullable<ArithmeticBinaryOperatorExpression["valueCategory"]> ? CompiledArithmeticBinaryOperatorExpression<T> : never : never;
    "pointer_diference_expression": T extends NonNullable<PointerDifferenceExpression["type"]> ? V extends NonNullable<PointerDifferenceExpression["valueCategory"]> ? CompiledPointerDifferenceExpression : never : never;
    "pointer_offset_expression": T extends NonNullable<PointerOffsetExpression["type"]> ? V extends NonNullable<PointerOffsetExpression["valueCategory"]> ? CompiledPointerOffsetExpression<T> : never : never;
    "relational_binary_operator_expression": T extends NonNullable<RelationalBinaryOperatorExpression["type"]> ? V extends NonNullable<RelationalBinaryOperatorExpression["valueCategory"]> ? CompiledRelationalBinaryOperatorExpression : never : never;
    "pointer_comparison_expression": T extends NonNullable<PointerComparisonExpression["type"]> ? V extends NonNullable<PointerComparisonExpression["valueCategory"]> ? CompiledPointerComparisonExpression : never : never;
    "logical_binary_operator_expression": T extends NonNullable<LogicalBinaryOperatorExpression["type"]> ? V extends NonNullable<LogicalBinaryOperatorExpression["valueCategory"]> ? CompiledLogicalBinaryOperatorExpression : never : never;
    "dereference_expression": T extends NonNullable<DereferenceExpression["type"]> ? V extends NonNullable<DereferenceExpression["valueCategory"]> ? CompiledDereferenceExpression<T> : never : never;
    "address_of_expression": T extends NonNullable<AddressOfExpression["type"]> ? V extends NonNullable<AddressOfExpression["valueCategory"]> ? CompiledAddressOfExpression<T> : never : never;
    "subscript_expression": T extends NonNullable<SubscriptExpression["type"]> ? V extends NonNullable<SubscriptExpression["valueCategory"]> ? CompiledSubscriptExpression<T> : never : never;
    "identifier_expression": V extends NonNullable<IdentifierExpression["valueCategory"]> ? (T extends ObjectType ? CompiledObjectIdentifierExpression<T> : T extends FunctionType ? CompiledFunctionIdentifierExpression<T> : never) : never;
    "numeric_literal": T extends NonNullable<NumericLiteralExpression["type"]> ? V extends NonNullable<NumericLiteralExpression["valueCategory"]> ? CompiledNumericLiteralExpression<T> : never : never;
    "string_literal": T extends NonNullable<StringLiteralExpression["type"]> ? V extends NonNullable<StringLiteralExpression["valueCategory"]> ? CompiledStringLiteralExpression : never : never;
    "parentheses_expression": T extends NonNullable<ParenthesesExpression["type"]> ? V extends NonNullable<ParenthesesExpression["valueCategory"]> ? CompiledParenthesesExpression<T> : never : never;
    "auxiliary_expression": T extends NonNullable<AuxiliaryExpression["type"]> ? V extends NonNullable<AuxiliaryExpression["valueCategory"]> ? CompiledAuxiliaryExpression<T> : never : never;
    "magic_function_call_expression": T extends NonNullable<MagicFunctionCallExpression["type"]> ? V extends NonNullable<MagicFunctionCallExpression["valueCategory"]> ? CompiledMagicFunctionCallExpression<T> : never : never;
    "function_call_expression": T extends NonNullable<FunctionCallExpression["type"]> ? V extends NonNullable<FunctionCallExpression["valueCategory"]> ? CompiledFunctionCallExpression<T> : never : never;
}



























const ExpressionConstructsRuntimeMap = {
    "unsupported_expression": (construct: UnsupportedExpression, parent: RuntimeConstruct) => { throw new Error("Cannot create a runtime instance of an unsupported construct."); },
    "comma_expression": <T extends Type, V extends ValueCategory>(construct: CompiledCommaExpression < T, V >, parent: RuntimeConstruct) => new RuntimeComma(construct, parent),
    "ternary_expression": <T extends Type, V extends ValueCategory>(construct: CompiledTernaryExpression < T, V >, parent: RuntimeConstruct) => new RuntimeTernary(construct, parent),
    "assignment_expression": <T extends AtomicType>(construct: CompiledAssignmentExpression < T >, parent: RuntimeConstruct) => new RuntimeAssignment(construct, parent),
    "arithmetic_binary_operator_expression": <T extends ArithmeticType>(construct: CompiledArithmeticBinaryOperatorExpression < T >, parent: RuntimeConstruct) => new RuntimeArithmeticBinaryOperator(construct, parent),
    "pointer_diference_expression": (construct: CompiledPointerDifferenceExpression, parent: RuntimeConstruct) => new RuntimePointerDifference(construct, parent),
    "pointer_offset_expression": <T extends PointerType>(construct: CompiledPointerOffsetExpression < T >, parent: RuntimeConstruct) => new RuntimePointerOffset(construct, parent),
    "relational_binary_operator_expression": <T extends ArithmeticType>(construct: CompiledRelationalBinaryOperatorExpression < T >, parent: RuntimeConstruct) => new RuntimeRelationalBinaryOperator(construct, parent),
    "pointer_comparison_expression": (construct: CompiledPointerComparisonExpression, parent: RuntimeConstruct) => new RuntimePointerComparisonExpression(construct, parent),
    "logical_binary_operator_expression": (construct: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct) => new RuntimeLogicalBinaryOperatorExpression(construct, parent),
    "dereference_expression": <T extends ObjectType>(construct: CompiledDereferenceExpression < T >, parent: RuntimeConstruct) => new RuntimeDereferenceExpression(construct, parent),
    "address_of_expression": <T extends PointerType>(construct: CompiledAddressOfExpression < T >, parent: RuntimeConstruct) => new RuntimeAddressOfExpression(construct, parent),
    "subscript_expression": <T extends ObjectType>(construct: CompiledSubscriptExpression < T >, parent: RuntimeConstruct) => new RuntimeSubscriptExpression(construct, parent),
    "identifier_expression": (construct: CompiledObjectIdentifierExpression | CompiledFunctionIdentifierExpression, parent: RuntimeConstruct) => {
        if (construct.entity instanceof FunctionEntity) {
            return new RuntimeFunctionIdentifier(<any>construct, parent);
        }
        else {
            return new RuntimeObjectIdentifier(<any>construct, parent);
        }
    },
    "numeric_literal": <T extends ArithmeticType>(construct: CompiledNumericLiteralExpression < T >, parent: RuntimeConstruct) => new RuntimeNumericLiteral(construct, parent),
    "string_literal": (construct: CompiledStringLiteralExpression, parent: RuntimeConstruct) => new RuntimeStringLiteralExpression(construct, parent),
    "parentheses_expression": <T extends Type, V extends ValueCategory>(construct: CompiledParenthesesExpression < T, V >, parent: RuntimeConstruct) => new RuntimeParentheses(construct, parent),
    "auxiliary_expression":  < T extends Type = Type, V extends ValueCategory = ValueCategory > (construct: CompiledExpressionBase < T, V >, parent: RuntimeConstruct) => { throw new Error("Auxiliary expressions must never be instantiated at runtime.") },
    "magic_function_call_expression": <RT extends PotentialReturnType>(construct: CompiledMagicFunctionCallExpression < RT >, parent: RuntimeConstruct)  => new RuntimeMagicFunctionCallExpression(construct, parent),
    "function_call_expression": <RT extends PotentialReturnType>(construct: CompiledFunctionCallExpression < RT >, parent: RuntimeConstruct)  => new RuntimeFunctionCallExpression(construct, parent)
};

export function createRuntimeExpression(construct: UnsupportedExpression, parent: RuntimeConstruct) : never;
export function createRuntimeExpression<T extends Type, V extends ValueCategory>(construct: CompiledCommaExpression < T, V >, parent: RuntimeConstruct): RuntimeComma<T,V>;
export function createRuntimeExpression<T extends Type, V extends ValueCategory>(construct: CompiledTernaryExpression < T, V >, parent: RuntimeConstruct): RuntimeTernary<T,V>;
export function createRuntimeExpression<T extends AtomicType>(construct: CompiledAssignmentExpression < T >, parent: RuntimeConstruct): RuntimeAssignment<T>;
export function createRuntimeExpression<T extends ArithmeticType>(construct: CompiledArithmeticBinaryOperatorExpression < T >, parent: RuntimeConstruct): RuntimeArithmeticBinaryOperator<T>;
export function createRuntimeExpression(construct: CompiledPointerDifferenceExpression, parent: RuntimeConstruct): RuntimePointerDifference;
export function createRuntimeExpression<T extends PointerType>(construct: CompiledPointerOffsetExpression < T >, parent: RuntimeConstruct): RuntimePointerOffset<T>;
export function createRuntimeExpression<T extends ArithmeticType>(construct: CompiledRelationalBinaryOperatorExpression < T >, parent: RuntimeConstruct): RuntimeRelationalBinaryOperator<T>;
export function createRuntimeExpression(construct: CompiledPointerComparisonExpression, parent: RuntimeConstruct): RuntimePointerComparisonExpression;
export function createRuntimeExpression(construct: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct): RuntimeLogicalBinaryOperatorExpression;
export function createRuntimeExpression<T extends ObjectType>(construct: CompiledDereferenceExpression < T >, parent: RuntimeConstruct): RuntimeDereferenceExpression<T>;
export function createRuntimeExpression<T extends PointerType>(construct: CompiledAddressOfExpression < T >, parent: RuntimeConstruct): RuntimeAddressOfExpression<T>;
export function createRuntimeExpression<T extends ObjectType>(construct: CompiledSubscriptExpression < T >, parent: RuntimeConstruct): RuntimeSubscriptExpression<T>;
export function createRuntimeExpression(construct: CompiledObjectIdentifierExpression | CompiledFunctionIdentifierExpression, parent: RuntimeConstruct) : RuntimeObjectIdentifier | RuntimeFunctionIdentifier;
export function createRuntimeExpression<T extends ArithmeticType>(construct: CompiledNumericLiteralExpression < T >, parent: RuntimeConstruct): RuntimeNumericLiteral<T>;
export function createRuntimeExpression(construct: CompiledStringLiteralExpression, parent: RuntimeConstruct): RuntimeStringLiteralExpression;
export function createRuntimeExpression<T extends Type, V extends ValueCategory>(construct: CompiledParenthesesExpression < T, V >, parent: RuntimeConstruct): RuntimeParentheses<T,V>;
export function createRuntimeExpression < T extends Type = Type, V extends ValueCategory = ValueCategory > (construct: AuxiliaryExpression < T, V >, parent: RuntimeConstruct) : never;
export function createRuntimeExpression<RT extends PotentialReturnType>(construct: CompiledMagicFunctionCallExpression < RT >, parent: RuntimeConstruct) : RuntimeMagicFunctionCallExpression<RT>;
export function createRuntimeExpression<RT extends PotentialReturnType>(construct: CompiledFunctionCallExpression < RT >, parent: RuntimeConstruct) : RuntimeFunctionCallExpression<RT>
export function createRuntimeExpression<T extends Type, V extends ValueCategory, ConstructType extends CompiledExpressionBase<T, V> | UnsupportedExpression>(construct: ConstructType, parent: RuntimeExpression) : RuntimeExpression<T,V>;
export function createRuntimeExpression<T extends Type, V extends ValueCategory, ConstructType extends CompiledExpressionBase<T, V> | UnsupportedExpression>(construct: ConstructType, parent: RuntimeExpression) : RuntimeExpression<T,V> {
    return ((<any>ExpressionConstructsRuntimeMap)[construct.construct_type])(<any>construct, parent);
}

/**
 * An expression not currently supported by Lobster.
 */
export class UnsupportedExpression extends ExpressionBase<ExpressionASTNode> {
    public readonly construct_type = "unsupported_expression";

    public readonly type = undefined;
    public readonly valueCategory = undefined;

    public constructor(context: ExpressionContext, unsupportedName: string) {
        super(context);
        this.addNote(CPPError.lobster.unsupported_feature(this, unsupportedName));
    }

    // Will never be called since an UnsupportedExpression will always have errors and
    // never satisfy the required this context of Compiled<Expression
    // public createRuntimeExpression(this: CompiledExpressionBase<parent: RuntimeConstruct) : never {
    //     throw new Error("Cannot create a runtime instance of an unsupported construct.");
    // }
    
    // public createDefaultOutlet(this: CompiledExpressionBase<element: JQuery, parent?: ConstructOutlet) : never {
    //     throw new Error("Cannot create an outlet for an unsupported construct.");
    // }

    public describeEvalResult(depth: number): ConstructDescription {
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

export abstract class SimpleRuntimeExpression<T extends Type = Type, V extends ValueCategory = ValueCategory, C extends CompiledExpressionBase = CompiledExpressionBase> extends RuntimeExpression<T,V,C> {

    private index : 0 | 1 = 0;

    // Note: this is RuntimeConstruct rather than RuntimeExpression, because RuntimeExpression is implicitly
    //       RuntimeExpression<Type, ValueCategory> and particular instantiations may not
    private subexpressions: readonly RuntimeConstruct[] = [];

    public constructor (model: C, parent: RuntimeConstruct) {
        super(model, parent);
    }

    protected setSubexpressions(subexpressions: readonly RuntimeConstruct[]) {
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
        this.startCleanup()
    }

    protected abstract operate() : void;
}


type t_OverloadableOperators =
    "+" | "-" | "*" | "/" | "%" |
    "&" | "|" | "^" | "~" | "<<" | ">>" | "<" | ">" | "<=" |
    ">=" | "==" | "!=" | "&&" | "||" | "!" | "++" | "--" |
    "+=" | "-=" | "*=" | "/=" | "%=" | "&=" | "|=" | "^=" | "<<=" | ">>=" |
    "," | "->" | "->*" | "()" | "[]";


// export class OperatorOverload extends ExpressionBase {

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

//     private hasWellTypedOperands(operands: Expression[]) : operands is TypedExpressionBase[] {
//         return operands.every((expr) => { return expr.isWellTyped(); });
//     }

//     public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : RuntimeOperatorOverload<CompiledOperatorOverload<T,V>> {
//         return new RuntimeOperatorOverload(this, parent);
//     }
    
//     public describeEvalResult(depth: number): ConstructDescription {
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

//     public readonly operands: Compiled<Expression[];
    
//     public readonly isMemberOverload: boolean;
//     public readonly overloadFunctionCall: CompiledFunctionCall<T,V>; 
// }



// public readonly _t! : T extends NonNullable<IdentifierExpression["type"]> ? V extends NonNullable<IdentifierExpression["valueCategory"]> ? {
//     typed: TypedIdentifierExpression<T>;
//     compiled: T extends ObjectType ? CompiledObjectIdentifier<T> : T extends FunctionType ? CompiledFunctionIdentifier<T> : never; 
// } : never : never;



export interface CommaASTNode extends ASTNode {
    readonly construct_type: "comma_expression";
    readonly operator: ",";
    readonly left: ExpressionASTNode;
    readonly right: ExpressionASTNode;
    readonly associativity: "left";
}


export class CommaExpression extends ExpressionBase<CommaASTNode> {
    public readonly construct_type = "comma_expression";

    public readonly type?: Type;
    public readonly valueCategory?: ValueCategory;

    public readonly left: ExpressionBase;
    public readonly right: ExpressionBase;

    public constructor(context: ExpressionContext, left: ExpressionBase, right: ExpressionBase) {
        super(context);
        this.type = right.type;
        this.valueCategory = right.valueCategory;
        this.attach(this.left = left);
        this.attach(this.right = right);
    }

    public static createFromAST(ast: CommaASTNode, context: ExpressionContext) : CommaExpression {
        return new CommaExpression(context, createExpressionFromAST(ast.left, context), createExpressionFromAST(ast.right, context));
    }
    
    // public isSuccessfullyCompiled(): this is Comma<true> {
    //     return !this.hasErrors;
    // }

    // public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledCommaExpression<T,V>, parent: RuntimeConstruct) : RuntimeComma<T,V> {
    //     return new RuntimeComma(<CompiledCommaExpression<T,V>>this, parent);
    // }
    
    public createDefaultOutlet(this: CompiledCommaExpression, element: JQuery, parent?: ConstructOutlet) {
        return new CommaExpressionOutlet(element, this, parent);
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

    public describeEvalResult(depth: number) : ConstructDescription {
        return this.right.describeEvalResult(depth);
    }
}

export interface TypedCommaExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> extends CommaExpression {
    readonly type: T;
    readonly valueCategory: V;
    readonly right: TypedExpressionBase<T,V>;
}

function blah<T extends Type = Type, V extends ValueCategory = ValueCategory>() {
    let x!: AnalyticCompiledExpression<TernaryExpression,Bool,ValueCategory>;
    let y!: AnalyticTypedExpression<TernaryExpression,AtomicType,ValueCategory>;
    y = x;

    let a!: TypedCommaExpression<Int, ValueCategory> | TernaryExpression;
    a = x;

    let b!: Expression;
    b = x;
}

export interface CompiledCommaExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> extends TypedCommaExpression<T,V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly left: CompiledExpressionBase<T,V>;
    readonly right: CompiledExpressionBase<T,V>;
}

export class RuntimeComma<T extends Type = Type, V extends ValueCategory = ValueCategory> extends SimpleRuntimeExpression<T,V,CompiledCommaExpression<T,V>> {

    public left: RuntimeExpression;
    public right: RuntimeExpression<T,V>;

    public constructor (model: CompiledCommaExpression<T,V>, parent: RuntimeConstruct) {
        super(model, parent);
        this.right = createRuntimeExpression(this.model.right, this);
        this.left = createRuntimeExpression(this.model.left, this);
        this.setSubexpressions([this.left, this.right]);
    }

    protected operate() {
        this.setEvalResult(this.right.evalResult);
    }

}

export interface TernaryASTNode extends ASTNode {
    readonly construct_type: "ternary_expression";
    readonly condition: ExpressionASTNode;
    readonly then: ExpressionASTNode;
    readonly otherwise: ExpressionASTNode;
}

export class TernaryExpression extends ExpressionBase<TernaryASTNode> {
    public readonly construct_type = "ternary_expression";
    
    public readonly type?: Type;
    public readonly valueCategory?: ValueCategory;

    public readonly condition: ExpressionBase;
    public readonly then: ExpressionBase;
    public readonly otherwise: ExpressionBase;

    public constructor(context: ExpressionContext, condition: ExpressionBase, then: ExpressionBase, otherwise: ExpressionBase) {
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

        if (then.type && otherwise.type && sameType(then.type, otherwise.type)) {
            this.type = then.type;
        }
        if (then.valueCategory && then.valueCategory === otherwise.valueCategory) {
            this.valueCategory = then.valueCategory;
        }
    }
    
    public static createFromAST(ast: TernaryASTNode, context: ExpressionContext) : TernaryExpression {
        return new TernaryExpression(context,
            createExpressionFromAST(ast.condition, context),
            createExpressionFromAST(ast.then, context),
            createExpressionFromAST(ast.otherwise, context));
    }

    private compileCondition(condition : TypedExpressionBase) {
        condition = standardConversion(condition, new Bool());
        if (!isType(condition.type, Bool)) {
            this.addNote(CPPError.expr.ternary.condition_bool(condition, condition.type));
        }
        return condition;
    }

    private compileConsequences(then: TypedExpressionBase, otherwise: TypedExpressionBase) {
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

    // public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledTernaryExpression<T,V>, parent: RuntimeConstruct) : RuntimeTernary<T,V>;
    // public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledExpressionBase<T,V>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledTernaryExpression<T,V>, parent: RuntimeConstruct) : RuntimeTernary<T,V> {
    //     return new RuntimeTernary(this, parent);
    // }

    public createDefaultOutlet(this: CompiledTernaryExpression, element: JQuery, parent?: ConstructOutlet) {
        return new TernaryExpressionOutlet(element, this, parent);
    }

    // TODO
    public describeEvalResult(depth: number): ConstructDescription {
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

export interface TypedTernaryExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> extends TernaryExpression {
    readonly type: T;
    readonly valueCategory: V;
    readonly then: TypedExpressionBase<T,V>;
    readonly otherwise: TypedExpressionBase<T,V>;
}

export interface CompiledTernaryExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> extends TypedTernaryExpression<T,V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly condition: CompiledExpressionBase<Bool, "prvalue">;
    readonly then: CompiledExpressionBase<T,V>;
    readonly otherwise: CompiledExpressionBase<T,V>;
}

export class RuntimeTernary<T extends Type = Type, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T,V,CompiledTernaryExpression<T,V>> {

    public condition: RuntimeExpression<Bool, "prvalue">;
    public then: RuntimeExpression<T,V>;
    public otherwise: RuntimeExpression<T,V>;

    private index = "condition";

    public constructor (model: CompiledTernaryExpression<T,V>, parent: RuntimeConstruct) {
        super(model, parent);
        this.condition = createRuntimeExpression(this.model.condition, this);
        this.then = createRuntimeExpression(this.model.then, this);
        this.otherwise = createRuntimeExpression(this.model.otherwise, this);
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
        this.startCleanup();
	}
}


export interface AssignmentExpressionASTNode extends ASTNode {
    readonly construct_type: "assignment_expression";
    readonly lhs: ExpressionASTNode;
    readonly operator: "=";
    readonly rhs: ExpressionASTNode;
}

export class AssignmentExpression extends ExpressionBase<AssignmentExpressionASTNode> {
    public readonly construct_type = "assignment_expression";

    // public readonly 
    // valueCategory : "lvalue",
    // isOverload : false,
    // isMemberOverload : true,
    // i_childrenToCreate : ["lhs"],
    // i_childrenToExecute : ["lhs", "rhs"],
    // i_childrenToExecuteForOverload : ["lhs", "funcCall"], // does not include rhs because function call does that

    public readonly type?: AtomicType;
    public readonly valueCategory = "lvalue";

    public readonly lhs: ExpressionBase;
    public readonly rhs: ExpressionBase;

    private constructor(context: ExpressionContext, lhs: TypedExpressionBase<AtomicType>, rhs: ExpressionBase) {
        super(context);

        // If the lhs/rhs doesn't have a type or VC, the rest of the analysis doesn't make much sense.
        if (!lhs.isWellTyped() || !rhs.isWellTyped()) {
            this.attach(this.lhs = lhs);
            this.attach(this.rhs = rhs);
            return;
        }

        if (lhs.valueCategory != "lvalue") {
            this.addNote(CPPError.expr.assignment.lhs_lvalue(this));
        }
        else if (!lhs.type.areLValuesAssignable()) {
            this.addNote(CPPError.expr.assignment.lhs_not_assignable(this, lhs));
        }

        rhs = standardConversion(rhs, lhs.type.cvUnqualified());


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
    
    public static createFromAST(ast: AssignmentExpressionASTNode, context: ExpressionContext) : AssignmentExpression {
        return new AssignmentExpression(context,
            createExpressionFromAST(ast.lhs, context),
            createExpressionFromAST(ast.rhs, context));
    }

    // public createRuntimeExpression<T extends AtomicType>(this: CompiledAssignmentExpression<T>, parent: RuntimeConstruct) : RuntimeAssignment<T>;
    // public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledExpressionBase<T,V>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends AtomicType>(this: CompiledAssignmentExpression<T>, parent: RuntimeConstruct) : RuntimeAssignment<T> {
    //     return new RuntimeAssignment(this, parent);
    // }
    
    public createDefaultOutlet(this: CompiledAssignmentExpression, element: JQuery, parent?: ConstructOutlet) {
        return new AssignmentExpressionOutlet(element, this, parent);
    }
    
    // TODO
    public describeEvalResult(depth: number): ConstructDescription {
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

export interface TypedAssignmentExpression<T extends AtomicType = AtomicType> extends AssignmentExpression {
    readonly type: T;
    readonly lhs: TypedExpressionBase<T>;
}


export interface CompiledAssignmentExpression<T extends AtomicType = AtomicType> extends TypedAssignmentExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly lhs: CompiledExpressionBase<T, "lvalue">;
    readonly rhs: CompiledExpressionBase<T, "prvalue">;
}


export class RuntimeAssignment<T extends AtomicType = AtomicType> extends SimpleRuntimeExpression<T, "lvalue", CompiledAssignmentExpression<T>> {

    public readonly lhs: RuntimeExpression<T, "lvalue">;
    public readonly rhs: RuntimeExpression<T, "prvalue">;

    public constructor (model: CompiledAssignmentExpression<T>, parent: RuntimeConstruct) {
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

export type t_CompoundAssignmentOperators = "*=" | "/=" | "%=" | "+=" | "-=" | ">>=" | "<<=" | "&=" | "^=" | "|=";

export interface CompoundAssignmentExpressionASTNode extends ASTNode {
    readonly construct_type: "compound_assignment_expression";
    readonly lhs: ExpressionASTNode;
    readonly operator: t_CompoundAssignmentOperators;
    readonly rhs: ExpressionASTNode;
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
    return left != right;
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

export type BinaryOperatorExpressionASTNode =
    ArithmeticBinaryOperatorExpressionASTNode |
    RelationalBinaryOperatorExpressionASTNode |
    LogicalBinaryOperatorExpressionASTNode;

type t_BinaryOperators = t_ArithmeticBinaryOperators | t_RelationalBinaryOperators | t_LogicalBinaryOperators;

abstract class BinaryOperatorExpressionBase extends ExpressionBase<BinaryOperatorExpressionASTNode> {
    
    public abstract readonly type?: AtomicType;
    public readonly valueCategory = "prvalue";

    public abstract readonly left: Expression;
    public abstract readonly right: Expression;

    public readonly operator: t_BinaryOperators;

    protected constructor(context: ExpressionContext, operator: t_BinaryOperators) {
        super(context)
        this.operator = operator;
    }

    public createDefaultOutlet(this: CompiledBinaryOperatorExpression, element: JQuery, parent?: ConstructOutlet) {
        return new BinaryOperatorExpressionOutlet(element, this, parent);
    }
}

// export interface CompiledBinaryOperatorExpressionBase<T extends AtomicType = AtomicType>
export type BinaryOperatorExpression = 
    ArithmeticBinaryOperatorExpression |
    PointerDifferenceExpression |
    PointerOffsetExpression |
    RelationalBinaryOperatorExpression |
    PointerComparisonExpression |
    LogicalBinaryOperatorExpression;

// interface TypedBinaryOperatorExpressionBase<T extends AtomicType = AtomicType> extends BinaryOperatorExpressionBase {
//     readonly type: T;
//     readonly left: TypedExpressionBase<AtomicType, "prvalue">;
//     readonly right: TypedExpressionBase<AtomicType, "prvalue">;
// }

// interface CompiledBinaryOperatorExpressionBase<T extends AtomicType = AtomicType> extends TypedBinaryOperatorExpressionBase<T>, SuccessfullyCompiled {
//     readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
//     // Note valueCategory is defined as "prvalue" in BinaryOperator
//     readonly left: CompiledExpressionBase<AtomicType, "prvalue">;
//     readonly right: CompiledExpressionBase<AtomicType, "prvalue">;
// }

// interface RuntimeBinaryOperatorBase extends RuntimeExpression<AtomicType, "prvalue", CompiledBinaryOperatorExpressionBase<AtomicType>> {

//     readonly left: RuntimeExpression<AtomicType, "prvalue">;
//     readonly right: RuntimeExpression<AtomicType, "prvalue">;

// }




export interface ArithmeticBinaryOperatorExpressionASTNode extends ASTNode {
    readonly construct_type: "arithmetic_binary_operator_expression";
    readonly operator: t_ArithmeticBinaryOperators;
    readonly left: ExpressionASTNode;
    readonly right: ExpressionASTNode;
    readonly associativity: "left";
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

export class ArithmeticBinaryOperatorExpression extends BinaryOperatorExpressionBase {
    public readonly construct_type = "arithmetic_binary_operator_expression";
    
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

        
        if (sameType(convertedLeft.type!, convertedRight.type!)) {
            this.type = convertedLeft.type;
        }
        else {
            this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, convertedLeft, convertedRight));
        }

        this.attach(this.left = convertedLeft);
        this.attach(this.right = convertedRight);
    }
    
    public static createFromAST(ast: ArithmeticBinaryOperatorExpressionASTNode, context: ExpressionContext) : ArithmeticBinaryOperatorExpression | PointerDifferenceExpression | PointerOffsetExpression {
        let left : Expression = createExpressionFromAST(ast.left, context);
        let right : Expression = createExpressionFromAST(ast.right, context);
        let op = ast.operator;

        // If operator is "-" and both are pointers or arrays, it's a pointer difference
        // Note that although integer 0 is convertible to a pointer, that conversion should
        // not be applied here since the 0 should just be interpreted as a pointer offset.
        if (op === "-" && (left.isPointerTyped() || left.isBoundedArrayTyped()) && (right.isPointerTyped() || right.isBoundedArrayTyped())) {
            // casts below are necessary because convertToPRValue() overloads can't elegantly
            // handle the union between pointer and array types. Without the casts, we've have
            // to separate this out into the 4 different cases of array/array, array/pointer,
            // pointer/array, pointer/pointer, which would be annoying
            return new PointerDifferenceExpression(context,
                <TypedExpressionBase<PointerType, "prvalue">>convertToPRValue(left),
                <TypedExpressionBase<PointerType, "prvalue">>convertToPRValue(right));
        }

        // If operator is "-" or "+" and it's a combination of pointer plus integer, it's a pointer offset
        if (op === "-" || op === "+") {
            if((left.isPointerTyped() || left.isBoundedArrayTyped()) && right.isIntegralTyped() ||
               (right.isPointerTyped() || right.isBoundedArrayTyped()) && left.isIntegralTyped()) {
                return new PointerOffsetExpression(context,
                    <TypedExpressionBase<PointerType, "prvalue">>convertToPRValue(left),
                    <TypedExpressionBase<PointerType, "prvalue">>convertToPRValue(right));
            }
        }

        return new ArithmeticBinaryOperatorExpression(context, left, right, op);
    }

    // public createRuntimeExpression<T extends ArithmeticType>(this: CompiledArithmeticBinaryOperatorExpression<T>, parent: RuntimeConstruct) : RuntimeArithmeticBinaryOperator<T>;
    // public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends ArithmeticType>(this: CompiledArithmeticBinaryOperatorExpression<T>, parent: RuntimeConstruct) : RuntimeArithmeticBinaryOperator<T> {
    //     return new RuntimeArithmeticBinaryOperator(this, parent);
    // }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedArithmeticBinaryOperatorExpression<T extends ArithmeticType> extends ArithmeticBinaryOperatorExpression {
    readonly type: T;
    readonly left: TypedExpressionBase<T, "prvalue">;
    readonly right: TypedExpressionBase<T, "prvalue">;
}

export interface CompiledArithmeticBinaryOperatorExpression<T extends ArithmeticType> extends TypedArithmeticBinaryOperatorExpression<T>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpressionBase<T, "prvalue">;
    readonly right: CompiledExpressionBase<T, "prvalue">;
}

// TODO: rename this or maybe create two separate classes for Arithmetic and Logical
export class RuntimeArithmeticBinaryOperator<T extends ArithmeticType = ArithmeticType> extends SimpleRuntimeExpression<T, "prvalue", CompiledArithmeticBinaryOperatorExpression<T>> {
    
    public readonly left: RuntimeExpression<T, "prvalue">;
    public readonly right: RuntimeExpression<T, "prvalue">;

    public constructor (model: CompiledArithmeticBinaryOperatorExpression<T>, parent: RuntimeConstruct) {
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

export class PointerDifferenceExpression extends BinaryOperatorExpressionBase {
    public readonly construct_type = "pointer_diference_expression";
    
    public readonly type: Int;
    public readonly valueCategory = "prvalue";

    public readonly left: TypedExpressionBase<PointerType, "prvalue">;
    public readonly right: TypedExpressionBase<PointerType, "prvalue">;

    public readonly operator! : "-"; // Narrows type from base

    public constructor(context: ExpressionContext, left: TypedExpressionBase<PointerType, "prvalue">, right: TypedExpressionBase<PointerType, "prvalue">) {
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

    // public createRuntimeExpression(this: CompiledPointerDifferenceExpression, parent: RuntimeConstruct) : RuntimePointerDifference;
    // public createRuntimeExpression<T extends PointerType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression(this: CompiledPointerDifferenceExpression, parent: RuntimeConstruct) : RuntimePointerDifference {
    //     return new RuntimePointerDifference(this, parent);
    // }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedPointerDifferenceExpression extends PointerDifferenceExpression {

}

export interface CompiledPointerDifferenceExpression extends TypedPointerDifferenceExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpressionBase<PointerType, "prvalue">;
    readonly right: CompiledExpressionBase<PointerType, "prvalue">;
}

export class RuntimePointerDifference extends SimpleRuntimeExpression<Int, "prvalue", CompiledPointerDifferenceExpression> {

    public left: RuntimeExpression<PointerType, "prvalue">;
    public right: RuntimeExpression<PointerType, "prvalue">;

    public constructor (model: CompiledPointerDifferenceExpression, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = this.model.left.createRuntimeExpression(this);
        this.right = this.model.right.createRuntimeExpression(this);
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {
        
        let result = this.left.evalResult.pointerDifference(this.right.evalResult);

        let leftArr = this.left.model.type.isType(ArrayPointerType) ? this.left.model.type.arrayObject : null;
        let rightArr = this.right.model.type.isType(ArrayPointerType) ? this.right.model.type.arrayObject : null;

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

export class PointerOffsetExpression extends BinaryOperatorExpressionBase {
    public readonly construct_type = "pointer_offset_expression";
    
    public readonly type?: PointerType;

    public readonly left: TypedExpressionBase<PointerType, "prvalue"> | TypedExpressionBase<IntegralType, "prvalue">;
    public readonly right: TypedExpressionBase<PointerType, "prvalue"> | TypedExpressionBase<IntegralType, "prvalue">;

    public readonly pointer?: TypedExpressionBase<PointerType, "prvalue">;
    public readonly offset?: TypedExpressionBase<IntegralType, "prvalue">;

    public readonly pointerOnLeft?: boolean;

    public readonly operator! : "+"; // Narrows type from base

    public constructor(context: ExpressionContext,
            left: TypedExpressionBase<PointerType, "prvalue"> | TypedExpressionBase<IntegralType, "prvalue">,
            right: TypedExpressionBase<PointerType, "prvalue"> | TypedExpressionBase<IntegralType, "prvalue">) {
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
            this.pointer = left;
            this.offset = right;
            this.type = this.pointer.type;
        }
        else if (left.isIntegralTyped() && right.isPointerTyped()) {
            this.pointerOnLeft = false;
            this.pointer = right;
            this.offset = left;
            this.type = this.pointer.type;
        }
        else {
            this.addNote(CPPError.expr.invalid_binary_operands(this, this.operator, left, right));
        }
    }

    // public createRuntimeExpression<T extends PointerType>(this: CompiledPointerOffsetExpression<T>, parent: RuntimeConstruct) : RuntimePointerOffset<T>;
    // public createRuntimeExpression<T extends PointerType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends PointerType>(this: CompiledPointerOffsetExpression<T>, parent: RuntimeConstruct) : RuntimePointerOffset<T> {
    //     return new RuntimePointerOffset(this, parent);
    // }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedPointerOffsetExpression<T extends PointerType = PointerType> extends PointerOffsetExpression {
    readonly type: T;

    readonly left: TypedExpressionBase<T, "prvalue"> | TypedExpressionBase<IntegralType, "prvalue">;
    readonly right: TypedExpressionBase<T, "prvalue"> | TypedExpressionBase<IntegralType, "prvalue">;
    
    readonly pointer: TypedExpressionBase<T, "prvalue">;
    readonly offset: TypedExpressionBase<IntegralType, "prvalue">;
}

export interface CompiledPointerOffsetExpression<T extends PointerType = PointerType> extends TypedPointerOffsetExpression<T>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpressionBase<T, "prvalue"> | CompiledExpressionBase<IntegralType, "prvalue">;
    readonly right: CompiledExpressionBase<T, "prvalue"> | CompiledExpressionBase<IntegralType, "prvalue">;
    
    readonly pointer: CompiledExpressionBase<T, "prvalue">;
    readonly offset: CompiledExpressionBase<IntegralType, "prvalue">;
    
    readonly pointerOnLeft?: boolean;
}


export class RuntimePointerOffset<T extends PointerType = PointerType> extends SimpleRuntimeExpression<T, "prvalue", CompiledPointerOffsetExpression<T>> {

    public readonly left: RuntimeExpression<T, "prvalue"> | RuntimeExpression<IntegralType, "prvalue">; // narrows type of member in base class
    public readonly right: RuntimeExpression<T, "prvalue"> | RuntimeExpression<IntegralType, "prvalue">; // narrows type of member in base class

    public readonly pointer: RuntimeExpression<T, "prvalue">;
    public readonly offset: RuntimeExpression<IntegralType, "prvalue">;

    public constructor (model: CompiledPointerOffsetExpression<T>, parent: RuntimeConstruct) {
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
        if (resultType.isType(ArrayPointerType)){
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






export interface RelationalBinaryOperatorExpressionASTNode extends ASTNode {
    readonly construct_type: "relational_binary_operator_expression";
    readonly operator: t_RelationalBinaryOperators;
    readonly left: ExpressionASTNode;
    readonly right: ExpressionASTNode;
    readonly associativity: "left";
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

export class RelationalBinaryOperatorExpression extends BinaryOperatorExpressionBase {
    public readonly construct_type = "relational_binary_operator_expression";
    
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
    
    public static createFromAST(ast: RelationalBinaryOperatorExpressionASTNode, context: ExpressionContext) : RelationalBinaryOperatorExpression | PointerComparisonExpression {
        
        let left : Expression = createExpressionFromAST(ast.left, context);
        let right : Expression = createExpressionFromAST(ast.right, context);
        let op = ast.operator;

        if (left.isPointerTyped() || left.isBoundedArrayTyped()) {
            if (right.isPointerTyped() || right.isBoundedArrayTyped()) {
                return new PointerComparisonExpression(context, convertToPRValue(left), convertToPRValue(right), op);
            }
            else if (isIntegerLiteralZero(right)) {
                let convertedLeft = convertToPRValue(left);
                return new PointerComparisonExpression(context, convertedLeft, new NullPointerConversion(right, convertedLeft.type), op);
            }
        }
        else if (isIntegerLiteralZero(left) && (right.isPointerTyped() || right.isBoundedArrayTyped())) {
            let convertedRight = convertToPRValue(right);
            return new PointerComparisonExpression(context, new NullPointerConversion(left, convertedRight.type), convertedRight, op);
        }
        
        return new RelationalBinaryOperatorExpression(context, left, right, ast.operator);
    }

    // public createRuntimeExpression<T extends ArithmeticType>(this: CompiledRelationalBinaryOperatorExpression<T>, parent: RuntimeConstruct) : RuntimeRelationalBinaryOperator<T>;
    // public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledExpressionBase<T,V>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends ArithmeticType>(this: CompiledRelationalBinaryOperatorExpression<T>, parent: RuntimeConstruct) : RuntimeRelationalBinaryOperator<T> {
    //     return new RuntimeRelationalBinaryOperator(this, parent);
    // }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedRelationalBinaryOperatorExpression extends RelationalBinaryOperatorExpression {

}

export interface CompiledRelationalBinaryOperatorExpression<OperandT extends ArithmeticType = ArithmeticType> extends TypedRelationalBinaryOperatorExpression, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpressionBase<OperandT, "prvalue">;
    readonly right: CompiledExpressionBase<OperandT, "prvalue">;
}

export class RuntimeRelationalBinaryOperator<OperandT extends ArithmeticType = ArithmeticType> extends SimpleRuntimeExpression<Bool, "prvalue", CompiledRelationalBinaryOperatorExpression<OperandT>> {
    
    public readonly left: RuntimeExpression<OperandT, "prvalue">;
    public readonly right: RuntimeExpression<OperandT, "prvalue">;

    public constructor (model: CompiledRelationalBinaryOperatorExpression<OperandT>, parent: RuntimeConstruct) {
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



export class PointerComparisonExpression extends BinaryOperatorExpressionBase {
    public readonly construct_type = "pointer_comparison_expression";

    public readonly type: Bool;
    public readonly valueCategory = "prvalue";

    public readonly left: TypedExpressionBase<PointerType, "prvalue">;
    public readonly right: TypedExpressionBase<PointerType, "prvalue">;

    public readonly operator!: t_RelationalBinaryOperators; // Narrows type from base

    public constructor(context: ExpressionContext, left: TypedExpressionBase<PointerType, "prvalue">,
                       right: TypedExpressionBase<PointerType, "prvalue">, operator: t_RelationalBinaryOperators) {
        super(context, operator);

        this.attach(this.left = left);
        this.attach(this.right = right);

        this.type = new Bool();

        if(!(similarType(left.type, right.type) || subType(left.type, right.type) || subType(right.type, left.type))) {
            this.addNote(CPPError.expr.pointer_comparison.same_pointer_type_required(this, left, right));
        }

        if (left instanceof NullPointerConversion || right instanceof NullPointerConversion) {
            if (this.operator === "==" || this.operator === "!=") {
                if (left instanceof ArrayToPointerConversion || right instanceof ArrayToPointerConversion) {
                    this.addNote(CPPError.expr.pointer_comparison.null_literal_array_equality(this));
                }
            }
            else { // operator is <, <=, >, or >=
                this.addNote(CPPError.expr.pointer_comparison.null_literal_comparison(this));
            }
        }
        
    }

    // public createRuntimeExpression(this: CompiledPointerComparisonExpression, parent: RuntimeConstruct) : RuntimePointerComparisonExpression;
    // public createRuntimeExpression<T extends PointerType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression(this: CompiledPointerComparisonExpression, parent: RuntimeConstruct) : RuntimePointerComparisonExpression {
    //     return new RuntimePointerComparisonExpression(this, parent);
    // }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedPointerComparisonExpression extends PointerComparisonExpression {

}

export interface CompiledPointerComparisonExpression<OperandT extends PointerType = PointerType> extends TypedPointerComparisonExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpressionBase<OperandT, "prvalue">;
    readonly right: CompiledExpressionBase<OperandT, "prvalue">;
}

export class RuntimePointerComparisonExpression<OperandT extends PointerType = PointerType> extends SimpleRuntimeExpression<Bool, "prvalue", CompiledPointerComparisonExpression<OperandT>> {

    public left: RuntimeExpression<OperandT, "prvalue">;
    public right: RuntimeExpression<OperandT, "prvalue">;

    public constructor (model: CompiledPointerComparisonExpression<OperandT>, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = this.model.left.createRuntimeExpression(this);
        this.right = this.model.right.createRuntimeExpression(this);
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {
        let leftResult = this.left.evalResult;
        let rightResult = this.right.evalResult;

        if (this.model.operator !== "==" && this.model.operator !== "!=") {
            if (!leftResult.type.isArrayPointerType() || !rightResult.type.isArrayPointerType() || leftResult.type.arrayObject !== rightResult.type.arrayObject) {
                this.sim.eventOccurred(SimulationEvent.UNSPECIFIED_BEHAVIOR, "It looks like you're trying to see which pointer comes before/after in memory, but this only makes sense if both pointers come from the same array. I don't think that's the case here.", true);
            }
        }

        let result = RELATIONAL_BINARY_OPERATIONS[this.model.operator](this.left.evalResult, this.right.evalResult);
        this.setEvalResult(result);

    }
}

export interface LogicalBinaryOperatorExpressionASTNode extends ASTNode {
    readonly construct_type: "logical_binary_operator_expression";
    readonly operator: t_LogicalBinaryOperators;
    readonly left: ExpressionASTNode;
    readonly right: ExpressionASTNode;
    readonly associativity: "left";
}

type t_LogicalBinaryOperators = "&&" | "||";

export class LogicalBinaryOperatorExpression extends BinaryOperatorExpressionBase {
    public readonly construct_type = "logical_binary_operator_expression";
    
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

    private compileLogicalSubexpression(subexpr : TypedExpressionBase) {
        subexpr = standardConversion(subexpr, Bool.BOOL);
        if (!isType(subexpr.type, Bool)) {
            this.addNote(CPPError.expr.binary.boolean_operand(this, this.operator, subexpr));
        }
        return subexpr;
    }
    
    public static createFromAST(ast: LogicalBinaryOperatorExpressionASTNode, context: ExpressionContext) : LogicalBinaryOperatorExpression{
        return new LogicalBinaryOperatorExpression(context,
            createExpressionFromAST(ast.left, context),
            createExpressionFromAST(ast.right, context),
            ast.operator);
    }
    
    // public createRuntimeExpression(this: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct) : RuntimeLogicalBinaryOperatorExpression;
    // public createRuntimeExpression<T extends AtomicType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression(this: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct) : RuntimeLogicalBinaryOperatorExpression {
    //     return new RuntimeLogicalBinaryOperatorExpression(this, parent);
    // }

    public describeEvalResult(depth: number): ConstructDescription {
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

export interface TypedLogicalBinaryOperatorExpression extends LogicalBinaryOperatorExpression {

}

export interface CompiledLogicalBinaryOperatorExpression extends TypedLogicalBinaryOperatorExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpressionBase<Bool, "prvalue">;
    readonly right: CompiledExpressionBase<Bool, "prvalue">;
}

export class RuntimeLogicalBinaryOperatorExpression extends RuntimeExpression<Bool, "prvalue", CompiledLogicalBinaryOperatorExpression> {

    public left: RuntimeExpression<Bool, "prvalue">;
    public right: RuntimeExpression<Bool, "prvalue">;

    private index = "left";

    private hasShortCircuited?: boolean;

    public constructor (model: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct) {
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
        this.startCleanup();
    }
    
    private operate(left: Value<Bool>, right: Value<Bool>) {
        return left.combine(right, (a: RawValueType, b: RawValueType) => {
            return this.model.operator == "&&" ? a && b : a || b;
        });
    }
}

export interface PointerToMemberExpressionASTNode extends ASTNode {
    readonly construct_type: "pointer_to_member_expression";
}

export interface CStyleCastExpressionASTNode extends ASTNode {
    readonly construct_type: "c_style_cast_expression";
}

export type UnaryOperatorExpressionASTNode =
    PrefixIncrementExpressionASTNode |
    PrefixDecrementExpressionASTNode |
    DereferenceExpressionASTNode |
    AddressOfExpressionASTNode |
    UnaryPlusExpressionASTNode |
    UnaryMinusExpressionASTNode |
    LogicalNotExpressionASTNode |
    BitwiseNotExpressionASTNode |
    SizeofExpressionASTNode |
    SizeofTypeExpressionASTNode |
    NewExpressionASTNode |
    DeleteExpressionASTNode |
    DeleteArrayExpressionASTNode;

export interface PrefixIncrementExpressionASTNode extends ASTNode {
    readonly construct_type: "prefix_increment_expression";
}

export interface PrefixDecrementExpressionASTNode extends ASTNode {
    readonly construct_type: "prefix_decrement_expression";
}

export interface DereferenceExpressionASTNode extends ASTNode {
    readonly construct_type: "dereference_expression";
    readonly operator: "*";
    readonly operand: ExpressionASTNode;
}

export interface AddressOfExpressionASTNode extends ASTNode {
    readonly construct_type: "address_of_expression";
    readonly operator: "&";
    readonly operand: ExpressionASTNode;
}

export interface UnaryPlusExpressionASTNode extends ASTNode {
    readonly construct_type: "unary_plus_expression";
}

export interface UnaryMinusExpressionASTNode extends ASTNode {
    readonly construct_type: "unary_minus_expression";
}

export interface LogicalNotExpressionASTNode extends ASTNode {
    readonly construct_type: "logical_not_expression";
}

export interface BitwiseNotExpressionASTNode extends ASTNode {
    readonly construct_type: "bitwise_not_expression";
}

export interface SizeofExpressionASTNode extends ASTNode {
    readonly construct_type: "sizeof_expression";
}

export interface SizeofTypeExpressionASTNode extends ASTNode {
    readonly construct_type: "sizeof_type_expression";
}

export interface NewExpressionASTNode extends ASTNode {
    readonly construct_type: "new_expression";
}

export interface DeleteExpressionASTNode extends ASTNode {
    readonly construct_type: "delete_expression";
}

export interface DeleteArrayExpressionASTNode extends ASTNode {
    readonly construct_type: "delete_array_expression";
}

type t_UnaryOperators = "++" | "--" | "*" | "&" | "+" | "-" | "!" | "~" | "sizeof" | "new" | "delete" | "delete[]";

abstract class UnaryOperatorExpressionBase extends ExpressionBase<UnaryOperatorExpressionASTNode> {
    
    public abstract readonly type?: ObjectType | VoidType; // VoidType is due to delete, delete[]

    public abstract readonly operand: Expression;

    public abstract readonly operator: t_UnaryOperators;

    protected constructor(context: ExpressionContext) {
        super(context)
    }
    
    public createDefaultOutlet(this: CompiledUnaryOperatorExpression, element: JQuery, parent?: ConstructOutlet) {
        return new UnaryOperatorExpressionOutlet(element, this, parent);
    }

}

export type UnaryOperatorExpression =
    DereferenceExpression |
    AddressOfExpression;

// export interface CompiledUnaryOperatorExpression<T extends ObjectType | VoidType = ObjectType | VoidType> extends UnaryOperatorExpression, SuccessfullyCompiled {
//     readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
//     readonly type: T;
//     readonly valueCategory: ValueCategory;
//     readonly operand: Compiled<Expression;
// }


// export interface RuntimeUnaryOperator extends RuntimeExpression<ObjectType | VoidType, ValueCategory, CompiledUnaryOperatorExpression<ObjectType | VoidType>> {

//     readonly operand: RuntimeExpression;

// }

export class DereferenceExpression extends UnaryOperatorExpressionBase {
    public readonly construct_type = "dereference_expression";
    
    public readonly type?: ObjectType;
    public readonly valueCategory = "lvalue";

    public readonly operand: Expression;

    public readonly operator = "*";

    public constructor(context: ExpressionContext, operand: Expression) {
        super(context);

        if (!operand.isWellTyped()) {
            this.attach(this.operand = operand);
            return;
        }

        let convertedOperand = convertToPRValue(operand);
        this.attach(this.operand = convertedOperand);

        if (!convertedOperand.isPointerTyped()) {
            this.addNote(CPPError.expr.dereference.pointer(this, convertedOperand.type));
        }
        else if (!(convertedOperand.type.ptrTo.isObjectType())) {
            // Note: function pointers currently not allowed
            this.addNote(CPPError.expr.dereference.pointerToObjectType(this, convertedOperand.type));
        }
        else {
            this.type = convertedOperand.type.ptrTo;
        }
    }
    
    public static createFromAST(ast: DereferenceExpressionASTNode, context: ExpressionContext) : DereferenceExpression {
        return new DereferenceExpression(context, createExpressionFromAST(ast.operand, context));
    }

    // public createRuntimeExpression<T extends ObjectType>(this: CompiledDereferenceExpression<T>, parent: RuntimeConstruct) : RuntimeDereferenceExpression<T>;
    // public createRuntimeExpression<T extends ObjectType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends ObjectType>(this: CompiledDereferenceExpression<T>, parent: RuntimeConstruct) : RuntimeDereferenceExpression<T> {
    //     return new RuntimeDereferenceExpression(this, parent);
    // }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedDereferenceExpression<T extends ObjectType = ObjectType> extends DereferenceExpression {
    readonly type: T;
    readonly operand: TypedExpressionBase<PointerType<T>, "prvalue">;
}

export interface CompiledDereferenceExpression<T extends ObjectType = ObjectType> extends TypedDereferenceExpression<T>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpressionBase<PointerType<T>, "prvalue">;
}

export class RuntimeDereferenceExpression<T extends ObjectType> extends SimpleRuntimeExpression<T, "lvalue", CompiledDereferenceExpression<T>> {

    public operand: RuntimeExpression<PointerType<T>, "prvalue">;

    public constructor (model: CompiledDereferenceExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = this.model.operand.createRuntimeExpression(this);
        this.setSubexpressions([this.operand]);
    }

    protected operate() {

        // Note: function pointers not supported yet

        let ptr = <Value<PointerType<T>>>this.operand.evalResult;
        let addr = ptr.rawValue;

        // If it's a null pointer, give message
        if (PointerType.isNull(addr)) {
            this.sim.eventOccurred(SimulationEvent.CRASH, "Ow! Your code just dereferenced a null pointer!", true);
        }
        else if (PointerType.isNegative(addr)) {
            this.sim.eventOccurred(SimulationEvent.CRASH, "Uh, wow. The pointer you're trying to dereference has a negative address.\nThanks a lot.", true);
        }
        else if (ptr.type.isArrayPointerType()) {
            // If it's an array pointer, make sure it's in bounds and not one-past
            if (addr < ptr.type.min()){
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "That pointer has wandered off the beginning of its array. Dereferencing it might cause a segfault, or worse - you might just access/change other memory outside the array.", true);
            }
            else if (ptr.type.onePast() < addr){
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "That pointer has wandered off the end of its array. Dereferencing it might cause a segfault, or worse - you might just access/change other memory outside the array.", true);
            }
            else if (addr == ptr.type.onePast()){
                // TODO: technically this is not undefined behavior unless the result of the dereference undergoes an lvalue-to-rvalue conversion to look up the object
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "That pointer is one past the end of its array. Do you have an off-by-one error?. Dereferencing it might cause a segfault, or worse - you might just access/change other memory outside the array.", true);
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

        this.setEvalResult(<this["evalResult"]>obj);
    }


//     explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst && inst.childInstances && inst.childInstances.operand && inst.childInstances.operand.evalResult){
//             return {message: "We will find the object at address " + inst.childInstances.operand.evalResult.describe().message}
//         }
//         else{
//             return {message: "The result of " + this.operand.describeEvalResult(0, sim, inst && inst.childInstances && inst.childInstances.operand).message + " will be dereferenced. This is, the result is a pointer/address and we will follow the pointer to see what object lives there."};
//         }
//     }

    
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

}


export class AddressOfExpression extends UnaryOperatorExpressionBase {
    public readonly construct_type = "address_of_expression";
    
    public readonly type?: PointerType;
    public readonly valueCategory = "prvalue";

    public readonly operand: Expression;

    public readonly operator = "&";

    public constructor(context: ExpressionContext, operand: Expression) {
        super(context);

        this.attach(this.operand = operand);
        
        if (!operand.isWellTyped()) {
            return;
        }
        
        if(operand.valueCategory !== "lvalue") {
            this.addNote(CPPError.expr.addressOf.lvalue_required(this));
        }

        if (operand.isFunctionTyped()) {
            this.addNote(CPPError.lobster.unsupported_feature(this, "Function Pointers"));
            return;
        }

        if(!operand.isObjectTyped()) {
            this.addNote(CPPError.expr.addressOf.object_type_required(this));
            return;
        }

        this.type = new PointerType(operand.type);
    }
    
    public static createFromAST(ast: AddressOfExpressionASTNode, context: ExpressionContext) : AddressOfExpression {
        return new AddressOfExpression(context, createExpressionFromAST(ast.operand, context));
    }

    // public createRuntimeExpression<T extends ObjectType>(this: CompiledAddressOfExpression<T>, parent: RuntimeConstruct) : RuntimeAddressOfExpression<T>;
    // public createRuntimeExpression<T extends ObjectType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends ObjectType>(this: CompiledAddressOfExpression<T>, parent: RuntimeConstruct) : RuntimeAddressOfExpression<T> {
    //     return new RuntimeAddressOfExpression(this, parent);
    // }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedAddressOfExpression<T extends PointerType = PointerType> extends AddressOfExpression {
    readonly type: T;
    readonly operand: TypedExpressionBase<T["ptrTo"]>;
}

export interface CompiledAddressOfExpression<T extends PointerType = PointerType> extends TypedAddressOfExpression<T>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpressionBase<T["ptrTo"], "lvalue">;
}

export class RuntimeAddressOfExpression<T extends PointerType> extends SimpleRuntimeExpression<T, "prvalue", CompiledAddressOfExpression<T>> {

    public operand: RuntimeExpression<T["ptrTo"], "lvalue">;

    public constructor (model: CompiledAddressOfExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = this.model.operand.createRuntimeExpression(this);
        this.setSubexpressions([this.operand]);
    }

    protected operate() {
        this.setEvalResult(<this["evalResult"]>this.operand.evalResult.getPointerTo());
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
//     },

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

export class SubscriptExpression extends ExpressionBase<SubscriptExpressionASTNode> {
    public readonly construct_type = "subscript_expression";
    
    public readonly type?: ObjectType;
    public readonly valueCategory = "lvalue";

    public readonly operand: Expression;
    public readonly offset: Expression;

    public constructor(context: ExpressionContext, operand: Expression, offset: Expression) {
        super(context);

        this.attach(this.operand = operand.isWellTyped() ? convertToPRValue(operand) : operand);
        this.attach(this.offset = offset.isWellTyped() ? standardConversion(offset, Int.INT) : offset);

        if (this.operand.isWellTyped()) {
            if(this.operand.isPointerTyped()) {
                this.type = this.operand.type.ptrTo;
            }
            else {
                this.addNote(CPPError.expr.subscript.invalid_operand_type(this, this.operand.type));
            }
        }

        if (this.offset.isWellTyped() && !this.offset.isTyped(Int)) {
            this.addNote(CPPError.expr.subscript.invalid_offset_type(this, this.offset.type));
        }
    }
    
    public static createFromAST(ast: SubscriptExpressionASTNode, context: ExpressionContext) : SubscriptExpression {
        return new SubscriptExpression(context,
            createExpressionFromAST(ast.operand, context),
            createExpressionFromAST(ast.offset, context));
    }

    // public createRuntimeExpression<T extends ObjectType>(this: CompiledSubscriptExpression<T>, parent: RuntimeConstruct) : RuntimeSubscriptExpression<T>;
    // public createRuntimeExpression<T extends ObjectType, V extends ValueCategory>(this: CompiledExpressionBase<T,V>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends ObjectType>(this: CompiledSubscriptExpression<T>, parent: RuntimeConstruct) : RuntimeSubscriptExpression<T> {
    //     return new RuntimeSubscriptExpression(this, parent);
    // }
    
    public createDefaultOutlet(this: CompiledSubscriptExpression, element: JQuery, parent?: ConstructOutlet) {
        return new SubscriptExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
    
//     isTailChild : function(child){
//         return {isTail: false,
//             reason: "The subscripting will happen after the recursive call returns.",
//             others: [this]
//         };
//     }
}

export interface TypedSubscriptExpression<T extends ObjectType = ObjectType> extends SubscriptExpression {
    readonly type: T;

    readonly operand: TypedExpressionBase<PointerType<T>, "prvalue">;
}

export interface CompiledSubscriptExpression<T extends ObjectType = ObjectType> extends TypedSubscriptExpression<T>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpressionBase<PointerType<T>, "prvalue">;
    readonly offset: CompiledExpressionBase<Int, "prvalue">;
}

export class RuntimeSubscriptExpression<T extends ObjectType = ObjectType> extends SimpleRuntimeExpression<T, "lvalue", CompiledSubscriptExpression<T>> {

    public operand: RuntimeExpression<PointerType<T>, "prvalue">;
    public offset: RuntimeExpression<Int, "prvalue">;

    public constructor (model: CompiledSubscriptExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = this.model.operand.createRuntimeExpression(this);
        this.offset = this.model.offset.createRuntimeExpression(this);
        this.setSubexpressions([this.operand, this.offset]);
    }

    protected operate() {

        let operand = <Value<PointerType<T>>>this.operand.evalResult;
        let offset = <Value<Int>>this.offset.evalResult;
        let ptr = operand.pointerOffset(offset);
        let addr = ptr.rawValue;

        if (PointerType.isNegative(addr)){
            this.sim.eventOccurred(SimulationEvent.CRASH, "Good work. You subscripted so far backwards off the beginning of the array you went to a negative address. -__-", true);
        }
        else if (ptr.type.isArrayPointerType()) {
            // If it's an array pointer, make sure it's in bounds and not one-past
            if (addr < ptr.type.min()){
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "That subscript operation goes off the beginning of the array. This could cause a segfault, or worse - you might just access/change other memory outside the array.", true);
            }
            else if (ptr.type.onePast() < addr) {
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "That subscript operation goes off the end of the array. This could cause a segfault, or worse - you might just access/change other memory outside the array.", true);
            }
            else if (addr == ptr.type.onePast()) {
                // TODO: technically this is not undefined behavior unless the result of the dereference undergoes an lvalue-to-rvalue conversion to look up the object
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "That subscript accesses the element one past the end of the array. This could cause a segfault, or worse - you might just access/change other memory outside the array.", true);
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

        this.setEvalResult(<VCResultTypes<T, "lvalue">>obj);
    }



}


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

export type PostfixExpressionASTNode =
    StaticCastExpressionASTNode |
    DynamicCastExpressionASTNode |
    ReinterpretCastExpressionASTNode |
    ConstCastExpressionASTNode |
    SubscriptExpressionASTNode |
    FunctionCallExpressionASTNode |
    DotExpressionASTNode |
    ArrowExpressionASTNode |
    PostfixIncrementExpressionASTNode |
    PostfixDecrementExpressionASTNode;


export interface StaticCastExpressionASTNode extends ASTNode {
    readonly construct_type: "static_cast_expression";
}

export interface DynamicCastExpressionASTNode extends ASTNode {
    readonly construct_type: "dynamic_cast_expression";
}

export interface ReinterpretCastExpressionASTNode extends ASTNode {
    readonly construct_type: "reinterpret_cast_expression";
}

export interface ConstCastExpressionASTNode extends ASTNode {
    readonly construct_type: "const_cast_expression";
}

export interface SubscriptExpressionASTNode extends ASTNode {
    readonly construct_type: "subscript_expression";
    readonly operand: ExpressionASTNode;
    readonly offset: ExpressionASTNode;
}





export interface DotExpressionASTNode extends ASTNode {
    readonly construct_type: "dot_expression";
}

export interface ArrowExpressionASTNode extends ASTNode {
    readonly construct_type: "arrow_expression";
}

export interface PostfixIncrementExpressionASTNode extends ASTNode {
    readonly construct_type: "postfix_increment_expression";
}

export interface PostfixDecrementExpressionASTNode extends ASTNode {
    readonly construct_type: "postfix_decrement_expression";
}



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


export interface ConstructExpressionASTNode extends ASTNode {
    readonly construct_type: "construct_expression";
}

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

export interface IdentifierExpressionASTNode extends ASTNode {
    readonly construct_type: "identifier_expression";
    readonly identifier: string;
}

// TODO: maybe Identifier should be a non-executable construct and then have a 
// TODO: make separate classes for qualified and unqualified IDs?
export class IdentifierExpression extends ExpressionBase<IdentifierExpressionASTNode> {
    public readonly construct_type = "identifier_expression";

    public readonly type?: ObjectType | FunctionType;
    public readonly valueCategory = "lvalue";
    
    public readonly name: string;

    public readonly entity?: ObjectEntity | FunctionEntity; // TODO: should this be NamedEntity? Does it make a difference?

    // i_createFromAST: function(ast, context){

    //     Identifier._parent.i_createFromAST.apply(this, arguments);
    //     this.identifier = this.ast.identifier;
    //     this.identifierText = qualifiedNameString(this.identifier);
    // },

    public constructor(context: ExpressionContext, name: string) {
        super(context);
        this.name = name;
        checkIdentifier(this, name, this);

        let lookupResult = this.context.contextualScope.lookup(this.name);

        if (!lookupResult) {
            this.addNote(CPPError.iden.not_found(this, this.name));
        }
        else if (lookupResult.declarationKind === "variable") {
            this.entity = lookupResult;
        }
        else if (lookupResult.declarationKind === "function") {
            if (lookupResult.overloads.length === 1) {
                // Only one function with that name found, so we just grab it.
                // Any errors will be detected later e.g. when a function call is attempted.
                this.entity = lookupResult.overloads[0];
            }
            else {
                // Need to perform overload resolution to select the appropriate function
                // from the function overload group. This depends on contextual parameter types.
                if (this.context.contextualParameterTypes) {
                    let overloadResult = overloadResolution(lookupResult.overloads, this.context.contextualParameterTypes, this.context.contextualReceiverType);

                    if (overloadResult.selected) {
                        // If a best result has been selected, use that
                        this.entity = overloadResult.selected;
                    }
                    else {
                        // Otherwise, use the best candidate (it is sorted to the front of the candidates in the result)
                        // The errors that made it non-viable will be picked up later e.g. when a function call is attempted.
                        this.entity = overloadResult.candidates[0].candidate;
                    }
                }
                else {
                    this.addNote(CPPError.iden.ambiguous(this, this.name));
                }
            }
        }
        else if (lookupResult.declarationKind === "class") {
            this.addNote(CPPError.iden.class_entity_found(this, this.name));
        }
        else {
            assertNever(lookupResult);
        }

        this.type = this.entity?.type;
    }
    
    public static createFromAST(ast: IdentifierExpressionASTNode, context: ExpressionContext) {
        return new IdentifierExpression(context, ast.identifier).setAST(ast);
    }

    // public createRuntimeExpression<T extends ObjectType>(this: CompiledObjectIdentifierExpression<T>, parent: RuntimeConstruct) : RuntimeObjectIdentifier<T>;
    // public createRuntimeExpression<T extends FunctionType>(this: CompiledFunctionIdentifierExpression, parent: RuntimeConstruct) : RuntimeFunctionIdentifier;
    // public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledExpressionBase<T,V>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression(parent: RuntimeConstruct) {
    //     if (this.entity instanceof FunctionEntity) {
    //         return new RuntimeFunctionIdentifier(<any>this, parent);
    //     }
    //     else {
    //         return new RuntimeObjectIdentifier(<any>this, parent);
    //     }
    // }
    
    public createDefaultOutlet(this: CompiledObjectIdentifierExpression | CompiledFunctionIdentifierExpression, element: JQuery, parent?: ConstructOutlet) {
        return new IdentifierOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
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

export interface TypedObjectIdentifierExpression<T extends ObjectType = ObjectType> extends IdentifierExpression {
    readonly type: T;
    readonly entity: ObjectEntity<T>;
}

export interface CompiledObjectIdentifierExpression<T extends ObjectType = ObjectType> extends TypedObjectIdentifierExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export interface TypedFunctionIdentifierExpression<T extends FunctionType = FunctionType> extends IdentifierExpression {
    readonly type: T;
    readonly entity: FunctionEntity<T>;
}

export interface CompiledFunctionIdentifierExpression<T extends FunctionType = FunctionType> extends TypedFunctionIdentifierExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export class RuntimeObjectIdentifier<T extends ObjectType = ObjectType> extends RuntimeExpression<T, "lvalue", CompiledObjectIdentifierExpression<T>> {

    public constructor (model: CompiledObjectIdentifierExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
    }

	protected upNextImpl() {
        this.setEvalResult(<VCResultTypes<T, "lvalue">>this.model.entity.runtimeLookup(this));
        this.startCleanup();
    }

    protected stepForwardImpl(): void {
        // do nothing
    }
}

export class RuntimeFunctionIdentifier extends RuntimeExpression<FunctionType, "lvalue", CompiledFunctionIdentifierExpression> {

    public constructor (model: CompiledFunctionIdentifierExpression, parent: RuntimeConstruct) {
        super(model, parent);
    }

	protected upNextImpl() {
        this.setEvalResult(this.model.entity);
        this.startCleanup();
    }

    protected stepForwardImpl(): void {
        // do nothing
    }
}

export interface ThisExpressionASTNode extends ASTNode {
    readonly construct_type: "this_expression";
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





function parseCPPChar(litValue: string){
    return escapeString(litValue).charCodeAt(0);
};

const literalJSParse = {
	"int": parseInt,
	"float": parseFloat,
    "double": parseFloat,
    "bool" : (b: boolean) => (b ? 1 : 0),
    "char": parseCPPChar
};

const literalTypes = {
	"int": Int.INT,
	"float": Double.DOUBLE,
	"double": Double.DOUBLE,
    "bool": Bool.BOOL,
    "char" : Char.CHAR
};

export function parseNumericLiteralValueFromAST(ast: NumericLiteralASTNode) {
    return literalJSParse[ast.type](<any>ast.value);
}

export type NumericLiteralASTNode = FloatLiteralASTNode | IntLiteralASTNode | CharLiteralASTNode | BoolLiteralASTNode;

export interface FloatLiteralASTNode extends ASTNode {
    readonly construct_type: "numeric_literal";
    readonly type: "float";
    readonly value: number;
}

export interface IntLiteralASTNode extends ASTNode {
    readonly construct_type: "numeric_literal";
    readonly type: "int";
    readonly value: number;
}

export interface CharLiteralASTNode extends ASTNode {
    readonly construct_type: "numeric_literal";
    readonly type: "char";
    readonly value: string;
}

export interface BoolLiteralASTNode extends ASTNode {
    readonly construct_type: "numeric_literal";
    readonly type: "char";
    readonly value: boolean;
}

export class NumericLiteralExpression extends ExpressionBase<NumericLiteralASTNode> {
    public readonly construct_type = "numeric_literal";
    
    public readonly type: ArithmeticType;
    public readonly valueCategory = "prvalue";
    
    public readonly value: Value<ArithmeticType>;

    // create from ast code:
    // TODO: are there some literal types without conversion functions? There shouldn't be...

    // var conv = literalJSParse[this.ast.type];
    // var val = (conv ? conv(this.ast.value) : this.ast.value);

    public constructor(context: ExpressionContext, type: ArithmeticType, value: RawValueType) {
        super(context);

        this.type = type;

        this.value = new Value(value, this.type);
	}
    
    public static createFromAST(ast: NumericLiteralASTNode, context: ExpressionContext) {
        return new NumericLiteralExpression(context, literalTypes[ast.type], parseNumericLiteralValueFromAST(ast));
    }

    // public createRuntimeExpression<T extends ArithmeticType>(this: CompiledNumericLiteralExpression<T>, parent: RuntimeConstruct) : RuntimeNumericLiteral<T>;
    // public createRuntimeExpression<T extends AtomicType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends ArithmeticType>(this: CompiledNumericLiteralExpression<T>, parent: RuntimeConstruct) : RuntimeNumericLiteral<T> {
    //     return new RuntimeNumericLiteral(this, parent);
    // }
    
    public createDefaultOutlet(this: CompiledNumericLiteralExpression, element: JQuery, parent?: ConstructOutlet) {
        return new NumericLiteralOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

    public isIntegerZero() {
        return 
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

export interface TypedNumericLiteralExpression<T extends ArithmeticType = ArithmeticType> extends NumericLiteralExpression {
    readonly type: T;
}

export interface CompiledNumericLiteralExpression<T extends ArithmeticType = ArithmeticType> extends TypedNumericLiteralExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export class RuntimeNumericLiteral<T extends ArithmeticType = ArithmeticType> extends RuntimeExpression<T, "prvalue", CompiledNumericLiteralExpression<T>> {

    public constructor (model: CompiledNumericLiteralExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
    }

	protected upNextImpl() {
        this.setEvalResult(<VCResultTypes<T, "prvalue">>this.model.value);
        this.startCleanup();
	}
	
	protected stepForwardImpl() {
        // Do nothing
	}
}


export interface StringLiteralASTNode extends ASTNode {
    readonly construct_type: "string_literal";
    readonly value: string;
}

export class StringLiteralExpression extends ExpressionBase<StringLiteralASTNode> {
    public readonly construct_type = "string_literal";

    public readonly type: BoundedArrayType<Char>;
    public readonly valueCategory = "lvalue";

    public readonly str: string;
    // create from ast code:
    // TODO: are there some literal types without conversion functions? There shouldn't be...

    // var conv = literalJSParse[this.ast.type];
    // var val = (conv ? conv(this.ast.value) : this.ast.value);

    public constructor(context: ExpressionContext, str: string) {
        super(context);
        this.str = str;

        // type is const char
        this.type = new BoundedArrayType(new Char(true), str.length + 1);

        this.context.translationUnit.registerStringLiteral(this);
    }

    public isStringLiteralExpression() {
        return true;
    }
    
    public static createFromAST(ast: StringLiteralASTNode, context: ExpressionContext) {
        return new StringLiteralExpression(context, ast.value);
    }

    // public createRuntimeExpression(this: CompiledStringLiteralExpression, parent: RuntimeConstruct) : RuntimeStringLiteralExpression;
    // public createRuntimeExpression<T extends AtomicType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression(this: CompiledStringLiteralExpression, parent: RuntimeConstruct) : RuntimeStringLiteralExpression {
    //     return new RuntimeStringLiteralExpression(this, parent);
    // }
    
    public createDefaultOutlet(this: CompiledStringLiteralExpression, element: JQuery, parent?: ConstructOutlet) {
        return new StringLiteralExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedStringLiteralExpression extends StringLiteralExpression {

}

export interface CompiledStringLiteralExpression extends StringLiteralExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export class RuntimeStringLiteralExpression extends RuntimeExpression<BoundedArrayType<Char>, "lvalue", CompiledStringLiteralExpression> {

    public constructor (model: CompiledStringLiteralExpression, parent: RuntimeConstruct) {
        super(model, parent);
    }

	protected upNextImpl() {
        this.setEvalResult(this.sim.memory.getStringLiteral(this.model.str)!);
        this.startCleanup();
	}
	
	protected stepForwardImpl() {
        // Do nothing
	}
}


// export class StringLiteral extends ExpressionBase {
//     public valueCategory: string;
//     public type: Type;
//     public createRuntimeExpression(parent: RuntimeConstruct<CPPConstruct>): RuntimeExpressionBase<Expression> {
//         throw new Error("Method not implemented.");
//     }
//     public describeEvalResult(depth: number): ConstructDescription {
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

export interface ParenthesesExpressionASTNode extends ASTNode {
    readonly construct_type: "parentheses_expression";
    readonly subexpression: ExpressionASTNode;
}

export class ParenthesesExpression extends ExpressionBase<ParenthesesExpressionASTNode> {
    public readonly construct_type = "parentheses_expression";

    public readonly type?: Type;
    public readonly valueCategory?: ValueCategory;

    public readonly subexpression: Expression;

    public constructor(context: ExpressionContext, subexpression: Expression) {
        super(context);

        this.attach(this.subexpression = subexpression);
        this.type = subexpression.type;
        this.valueCategory = subexpression.valueCategory;

    }
    
    public static createFromAST(ast: ParenthesesExpressionASTNode, context: ExpressionContext) : ParenthesesExpression {
        return new ParenthesesExpression(context, createExpressionFromAST(ast.subexpression, context));
    }

    // public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledParenthesesExpression<T,V>, parent: RuntimeConstruct) : RuntimeParentheses<T,V>;
    // public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledExpressionBase<T,V>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends Type, V extends ValueCategory>(this: CompiledParenthesesExpression<T,V>, parent: RuntimeConstruct) : RuntimeParentheses<T,V> {
    //     return new RuntimeParentheses(this, parent);
    // }
    
    public createDefaultOutlet(this: CompiledParenthesesExpression, element: JQuery, parent?: ConstructOutlet) {
        return new ParenthesesOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

    // isTailChild : function(child){
    //     return {isTail: true};
    // }
}

export interface TypedParenthesesExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> extends ParenthesesExpression {
    readonly type: T;
    readonly valueCategory: V;
    
    readonly subexpression: TypedExpressionBase<T,V>;
}

export interface CompiledParenthesesExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> extends TypedParenthesesExpression<T,V>, SuccessfullyCompiled {
    
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly subexpression: CompiledExpressionBase<T,V>;
}

const INDEX_PARENTHESES_SUBEXPRESSIONS = 0;
const INDEX_PARENTHESES_DONE = 1;
export class RuntimeParentheses<T extends Type = Type, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T,V, CompiledParenthesesExpression<T,V>> {

    public subexpression: RuntimeExpression<T,V>;

    private index : typeof INDEX_PARENTHESES_SUBEXPRESSIONS | typeof INDEX_PARENTHESES_DONE = INDEX_PARENTHESES_SUBEXPRESSIONS;

    public constructor (model: CompiledParenthesesExpression<T,V>, parent: RuntimeConstruct) {
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
            this.startCleanup();
        }
	}
	
	protected stepForwardImpl() {
        // Do nothing
	}
}



const AUXILIARY_EXPRESSION_CONTEXT : ExpressionContext = {
    program: <never>undefined,
    translationUnit: <never>undefined,
    contextualScope: <never>undefined
}

export class AuxiliaryExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> extends ExpressionBase<never> {
    public readonly construct_type = "auxiliary_expression";

    public readonly type: T;
    public readonly valueCategory: V;

    constructor(type: T, valueCategory: V) {
        super(AUXILIARY_EXPRESSION_CONTEXT);
        this.type = type;
        this.valueCategory = valueCategory;
	}

    // public createRuntimeExpression<T extends Type = Type, V extends ValueCategory = ValueCategory>(this: CompiledExpressionBase<T,V>, parent: RuntimeConstruct) : never {
    //     throw new Error("Auxiliary expressions must never be instantiated at runtime.");
    // }
    
    public createDefaultOutlet(this: CompiledAuxiliaryExpression, element: JQuery, parent?: ConstructOutlet) : never {
        throw new Error("Cannot create an outlet for an auxiliary expression. (They should never be used at runtime.)");
    }

    public describeEvalResult(depth: number) : never {
        throw new Error("Auxiliary expressions have no description");
    }

}

export interface TypedAuxiliaryExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> extends AuxiliaryExpression<T,V>{

}

export interface CompiledAuxiliaryExpression<T extends Type = Type, V extends ValueCategory = ValueCategory> extends TypedAuxiliaryExpression<T,V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}








interface OverloadCandidateResult {
    readonly candidate: FunctionEntity;
    readonly notes: readonly Note[];
}

export interface OverloadResolutionResult {
    readonly candidates: readonly OverloadCandidateResult[];
    readonly viable: FunctionEntity[];
    readonly selected?: FunctionEntity;
}

export function overloadResolution(candidates: readonly FunctionEntity[], argTypes: readonly (Type|undefined)[], receiverType?: ClassType) : OverloadResolutionResult {

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
    let viable: FunctionEntity[] = [];
    let resultCandidates : readonly OverloadCandidateResult[] = candidates.map((candidate) => {

        let tempArgs = [];
        var notes: Note[] = [];

        // Check argument types against parameter types
        let candidateParamTypes = candidate.type.paramTypes;
        if (argTypes.length !== candidateParamTypes.length) {
            notes.push(CPPError.param.numParams(candidate.firstDeclaration));
        }
        // TODO: add back in with member functions
        // else if (receiverType.isConst && cand instanceof MemberFunctionEntity && !cand.type.isThisConst){
        //     problems.push(CPPError.param.thisConst(cand.declaration));
        // }
        else{
            argTypes.forEach((argType, i) => {
                if (!argType) {
                    return; // ignore undefined argType, assume it "works" since there will be an error elsewhere already
                }
                let candidateParamType = candidateParamTypes[i];
                if (candidateParamType.isReferenceType()) {
                    // tempArgs.push(args[i]);
                    if(!referenceCompatible(argType, candidateParamType.refTo)) {
                        notes.push(CPPError.param.paramReferenceType(candidate.firstDeclaration, argType, candidateParamType));
                    }
                    //else if (args[i].valueCategory !== "lvalue"){
                    //    problems.push(CPPError.param.paramReferenceLvalue(args[i]));
                    //}
                }
                else {
                    // tempArgs.push(standardConversion(args[i], argTypes[i]));

                    // Attempt standard conversion of an auxiliary expression of the argument's type to the param type
                    
                    let auxArg = new AuxiliaryExpression(argType, "prvalue");
                    let convertedArg = standardConversion(auxArg, candidateParamType);

                    if(!sameType(convertedArg.type, candidateParamType)) {
                        notes.push(CPPError.param.paramType(candidate.firstDeclaration, argType, candidateParamType));
                    }

                }
            });
        }

        if (notes.length == 0) { // All notes in this function are errors, so if there are any it's not viable
            viable.push(candidate);
        }

        return {candidate: candidate, notes: notes};
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
    }
};

interface MagicFunctionImpl {
    readonly returnType: ObjectType | VoidType;
    readonly valueCategory: ValueCategory;
    readonly paramTypes: readonly PotentialParameterType[];
    readonly operate: <RT extends PotentialReturnType>(rt: RuntimeMagicFunctionCallExpression<RT>) => void;
}

const MAGIC_FUNCTIONS : {[k in MAGIC_FUNCTION_NAMES]: MagicFunctionImpl} = {
    assert: {
        returnType: VoidType.VOID,
        valueCategory: "prvalue",
        paramTypes: [Bool.BOOL],
        operate: <RT extends PotentialReturnType>(rt: RuntimeMagicFunctionCallExpression<RT>) => {
            let arg = <Value<Bool>>rt.args[0].evalResult;
            if (!arg.rawValue) {
                rt.sim.eventOccurred(SimulationEvent.ASSERTION_FAILURE, "An assertion failed.", true);
            }
        }
    },
    pause: {
        returnType: VoidType.VOID,
        valueCategory: "prvalue",
        paramTypes: [],
        operate: <RT extends PotentialReturnType>(rt: RuntimeMagicFunctionCallExpression<RT>) => {
            // rt.sim.pause();
        }

    },
    pauseIf: {
        returnType: VoidType.VOID,
        valueCategory: "prvalue",
        paramTypes: [Bool.BOOL],
        operate: <RT extends PotentialReturnType>(rt: RuntimeMagicFunctionCallExpression<RT>) => {
            let arg = <Value<Bool>>rt.args[0].evalResult;
            if (arg) {
                // rt.sim.pause();
            }
        }
    }
}

export class MagicFunctionCallExpression extends ExpressionBase<never> {
    public readonly construct_type = "magic_function_call_expression";
    
    public readonly type: ObjectType | VoidType;
    public readonly valueCategory: ValueCategory;

    public readonly functionName: string;
    public readonly functionImpl: MagicFunctionImpl;
    public readonly args: readonly Expression[];

    public constructor(context: ExpressionContext, functionName: MAGIC_FUNCTION_NAMES, args: readonly Expression[]) {
        super(context);
        
        this.functionName = functionName;

        let fn = this.functionImpl = MAGIC_FUNCTIONS[functionName];
        this.type = fn.returnType;
        this.valueCategory = fn.valueCategory;

        this.args = args.map((arg, i) => {
            if (!arg.isWellTyped()) {
                return arg;
            }

            let targetType = fn.paramTypes[i];
            let convertedArg = standardConversion(arg, targetType);
            
            if (!sameType(convertedArg.type, fn.paramTypes[i])) {
                arg.addNote(CPPError.declaration.init.convert(arg, convertedArg.type, targetType));
            }

            return convertedArg;
        });
        this.attachAll(this.args);
    }
    
    // public createRuntimeExpression<RT extends PotentialReturnType>(this: CompiledMagicFunctionCallExpression<RT>, parent: RuntimeConstruct) : RuntimeMagicFunctionCallExpression<RT>
    // public createRuntimeExpression<T extends ObjectType, V extends ValueCategory>(this: CompiledExpressionBase<T,V>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<RT extends PotentialReturnType>(this: CompiledMagicFunctionCallExpression<RT>, parent: RuntimeConstruct) : RuntimeMagicFunctionCallExpression<RT> {
    //     return new RuntimeMagicFunctionCallExpression(this, parent);
    // }
    
    public createDefaultOutlet(this: CompiledMagicFunctionCallExpression, element: JQuery, parent?: ConstructOutlet) {
        return new MagicFunctionCallExpressionOutlet(element, this, parent);
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


type FunctionResultType<RT extends PotentialReturnType> = NoRefType<Exclude<RT,VoidType>>;
type ReturnTypeVC<RT extends PotentialReturnType> = RT extends ReferenceType ? "lvalue" : "prvalue";

export interface TypedMagicFunctionCallExpression<RT extends PotentialReturnType = PotentialReturnType> extends MagicFunctionCallExpression {
    readonly type: FunctionResultType<RT>;
    readonly valueCategory: ReturnTypeVC<RT>;
}

export interface CompiledMagicFunctionCallExpression<RT extends PotentialReturnType = PotentialReturnType> extends TypedMagicFunctionCallExpression<RT>, SuccessfullyCompiled {
    
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly args: readonly CompiledExpressionBase[];
}

export class RuntimeMagicFunctionCallExpression<RT extends PotentialReturnType = PotentialReturnType> extends SimpleRuntimeExpression<FunctionResultType<RT>, ReturnTypeVC<RT>, CompiledMagicFunctionCallExpression<RT>> {

    public args: readonly RuntimeExpression[];

    public constructor (model: CompiledMagicFunctionCallExpression<RT>, parent: RuntimeConstruct) {
        super(model, parent);
        this.args = this.model.args.map(arg => arg.createRuntimeExpression(this));
        this.setSubexpressions(this.args);
    }

    protected operate() {
        this.model.functionImpl.operate(this);
    }

}