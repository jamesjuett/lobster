import { CPPObject } from "./objects";
import { Simulation, SimulationEvent } from "./Simulation";
import { CompleteObjectType, AtomicType, IntegralType, PointerType, ReferenceType, BoundedArrayType, FunctionType, isType, PotentialReturnType, Bool, sameType, VoidType, ArithmeticType, ArrayPointerType, Int, PotentialParameterType, Float, Double, Char, PeelReference, peelReference, ArrayOfUnknownBoundType, referenceCompatible, similarType, subType, ArrayElemType, FloatingPointType, isCvConvertible, CompleteClassType, isAtomicType, isArithmeticType, isIntegralType, isPointerType, isBoundedArrayType, isFunctionType, isCompleteObjectType, isPotentiallyCompleteClassType, isCompleteClassType, isFloatingPointType, PotentiallyCompleteObjectType, ExpressionType, Type, CompleteReturnType, PointerToCompleteType, IncompleteClassType, PotentiallyCompleteClassType, isGenericArrayType } from "./types";
import { ASTNode, SuccessfullyCompiled as t_CompiledConstruct, RuntimeConstruct, CompiledTemporaryDeallocator, CPPConstruct, ExpressionContext, ConstructDescription, createExpressionContextWithReceiverType } from "./constructs";
import { Note, CPPError, NoteHandler } from "./errors";
import { FunctionEntity, ObjectEntity, Scope, VariableEntity, MemberVariableEntity, NameLookupOptions, BoundReferenceEntity, runtimeObjectLookup } from "./entities";
import { Value, RawValueType } from "./runtimeEnvironment";
import { escapeString, assertNever, assert, assertFalse } from "../util/util";
import { checkIdentifier, MAGIC_FUNCTION_NAMES } from "./lexical";
import { FunctionCallExpressionASTNode, FunctionCallExpression, TypedFunctionCallExpression, CompiledFunctionCallExpression, RuntimeFunctionCallExpression } from "./functionCall";
import { RuntimeExpression, VCResultTypes, ValueCategory, Expression, CompiledExpression, TypedExpression, SpecificTypedExpression, t_TypedExpression } from "./expressionBase";
import { ConstructOutlet, TernaryExpressionOutlet, CommaExpressionOutlet, AssignmentExpressionOutlet, BinaryOperatorExpressionOutlet, UnaryOperatorExpressionOutlet, SubscriptExpressionOutlet, IdentifierOutlet, NumericLiteralOutlet, ParenthesesOutlet, MagicFunctionCallExpressionOutlet, StringLiteralExpressionOutlet, LValueToRValueOutlet, ArrayToPointerOutlet, TypeConversionOutlet, QualificationConversionOutlet, DotExpressionOutlet, ArrowExpressionOutlet, OutputOperatorExpressionOutlet } from "../view/codeOutlets";
import { Predicates } from "./predicates";


export function readValueWithAlert(obj: CPPObject<AtomicType>, sim: Simulation) {
    let value = obj.readValue();
    if (!value.isValid) {
        let objDesc = obj.describe();
        var msg = "The value you just got out of " + (objDesc.name || objDesc.message) + " isn't valid. It might be uninitialized or it could have come from a dead object.";
        if (value.rawValue === 0) {
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

const ExpressionConstructsMap = {
    "comma_expression": (ast: CommaASTNode, context: ExpressionContext) => CommaExpression.createFromAST(ast, context),

    "ternary_expression": (ast: TernaryASTNode, context: ExpressionContext) => TernaryExpression.createFromAST(ast, context),

    "assignment_expression": (ast: AssignmentExpressionASTNode, context: ExpressionContext) => AssignmentExpression.createFromAST(ast, context),
    "compound_assignment_expression": (ast: CompoundAssignmentExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "compound assignment"),

    // binary operators
    "arithmetic_binary_operator_expression": (ast: ArithmeticBinaryOperatorExpressionASTNode, context: ExpressionContext) => ArithmeticBinaryOperatorExpression.createFromAST(ast, context),
    "relational_binary_operator_expression": (ast: RelationalBinaryOperatorExpressionASTNode, context: ExpressionContext) => RelationalBinaryOperatorExpression.createFromAST(ast, context),
    "logical_binary_operator_expression": (ast: LogicalBinaryOperatorExpressionASTNode, context: ExpressionContext) => LogicalBinaryOperatorExpression.createFromAST(ast, context),

    "pointer_to_member_expression": (ast: PointerToMemberExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "pointer-to-member"),

    "c_style_cast_expression": (ast: CStyleCastExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "c-style cast"),

    // prefix operators
    "prefix_increment_expression": (ast: PrefixIncrementExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "prefix increment"),
    "prefix_decrement_expression": (ast: PrefixDecrementExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "prefix decrement"),
    "dereference_expression": (ast: DereferenceExpressionASTNode, context: ExpressionContext) => DereferenceExpression.createFromAST(ast, context),
    "address_of_expression": (ast: AddressOfExpressionASTNode, context: ExpressionContext) => AddressOfExpression.createFromAST(ast, context),
    "unary_plus_expression": (ast: UnaryPlusExpressionASTNode, context: ExpressionContext) => UnaryPlusExpression.createFromAST(ast, context),
    "unary_minus_expression": (ast: UnaryMinusExpressionASTNode, context: ExpressionContext) => UnaryMinusExpression.createFromAST(ast, context),
    "logical_not_expression": (ast: LogicalNotExpressionASTNode, context: ExpressionContext) => LogicalNotExpression.createFromAST(ast, context),
    "bitwise_not_expression": (ast: BitwiseNotExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "bitwise not"),
    "sizeof_expression": (ast: SizeofExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "sizeof"),
    "sizeof_type_expression": (ast: SizeofTypeExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "sizeof (type)"),
    "new_expression": (ast: NewExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "new"),
    "delete_expression": (ast: DeleteExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "delete"),
    "delete_array_expression": (ast: DeleteArrayExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "delete[]"),

    // postfix operators
    "static_cast_expression": (ast: StaticCastExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "static cast"),
    "dynamic_cast_expression": (ast: DynamicCastExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "dynamic cast"),
    "reinterpret_cast_expression": (ast: ReinterpretCastExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "reinterpret cast"),
    "const_cast_expression": (ast: ConstCastExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "const cast"),
    "subscript_expression": (ast: SubscriptExpressionASTNode, context: ExpressionContext) => SubscriptExpression.createFromAST(ast, context),
    "function_call_expression": (ast: FunctionCallExpressionASTNode, context: ExpressionContext) => FunctionCallExpression.createFromAST(ast, context),
    "dot_expression": (ast: DotExpressionASTNode, context: ExpressionContext) => DotExpression.createFromAST(ast, context),
    "arrow_expression": (ast: ArrowExpressionASTNode, context: ExpressionContext) => ArrowExpression.createFromAST(ast, context),
    "postfix_increment_expression": (ast: PostfixIncrementExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "postfix increment"),
    "postfix_decrement_expression": (ast: PostfixDecrementExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "postfix decrement"),

    "construct_expression": (ast: ConstructExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "construct expression"),

    "identifier_expression": (ast: IdentifierExpressionASTNode, context: ExpressionContext) => IdentifierExpression.createFromAST(ast, context),

    "this_expression": (ast: ThisExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "this pointer"),

    "numeric_literal_expression": (ast: NumericLiteralASTNode, context: ExpressionContext) => NumericLiteralExpression.createFromAST(ast, context),
    "string_literal_expression": (ast: StringLiteralASTNode, context: ExpressionContext) => StringLiteralExpression.createFromAST(ast, context),
    "parentheses_expression": (ast: ParenthesesExpressionASTNode, context: ExpressionContext) => ParenthesesExpression.createFromAST(ast, context)
}

/**
 * Creates an expression construct based on a given expression AST node.
 * If the `ast` argument has a union type that is a subtype of `ExpressionASTNode`,
 * this function's return type is inferred as corresponding union of construct types.
 * @param ast An expression AST node.
 * @param context The context in which this expression occurs.
 */
export function createExpressionFromAST<ASTType extends ExpressionASTNode>(ast: ASTType, context: ExpressionContext): ReturnType<(typeof ExpressionConstructsMap)[ASTType["construct_type"]]> {
    return <any>ExpressionConstructsMap[ast.construct_type](<any>ast, context);
}



export type AnalyticExpression =
    CommaExpression |
    TernaryExpression |
    AssignmentExpression |
    // CompoundAssignmentExpression |
    AnalyticBinaryOperatorExpression |
    // PointerToMemberExpression |
    // CStyleCastExpression |
    AnalyticUnaryOperatorExpression |
    SubscriptExpression |
    DotExpression |
    ArrowExpression |
    FunctionCallExpression |
    // ConstructExpression |
    IdentifierExpression |
    // ThisExpression |
    NumericLiteralExpression |
    StringLiteralExpression |
    ParenthesesExpression |
    MagicFunctionCallExpression |
    AuxiliaryExpression |
    UnsupportedExpression |
    ImplicitConversion;

export type TypedExpressionKinds<T extends ExpressionType, V extends ValueCategory> = {
    "unsupported_expression": never;
    "comma_expression":
        T extends NonNullable<TypedCommaExpression["type"]> ? V extends NonNullable<TypedCommaExpression["valueCategory"]> ? TypedCommaExpression<T, V> : never :
        NonNullable<TypedCommaExpression["type"]> extends T ? V extends NonNullable<TypedCommaExpression["valueCategory"]> ? TypedCommaExpression : never : never;
    "ternary_expression":
        T extends NonNullable<TypedTernaryExpression["type"]> ? V extends NonNullable<TypedTernaryExpression["valueCategory"]> ? TypedTernaryExpression<T, V> : never :
        NonNullable<TypedTernaryExpression["type"]> extends T ? V extends NonNullable<TypedTernaryExpression["valueCategory"]> ? TypedTernaryExpression : never : never;
    "assignment_expression":
        T extends NonNullable<TypedAssignmentExpression["type"]> ? V extends NonNullable<TypedAssignmentExpression["valueCategory"]> ? TypedAssignmentExpression<T> : never :
        NonNullable<TypedAssignmentExpression["type"]> extends T ? V extends NonNullable<TypedAssignmentExpression["valueCategory"]> ? TypedAssignmentExpression : never : never;
    "arithmetic_binary_operator_expression":
        T extends NonNullable<TypedArithmeticBinaryOperatorExpression["type"]> ? V extends NonNullable<TypedArithmeticBinaryOperatorExpression["valueCategory"]> ? TypedArithmeticBinaryOperatorExpression<T> : never :
        NonNullable<TypedArithmeticBinaryOperatorExpression["type"]> extends T ? V extends NonNullable<TypedArithmeticBinaryOperatorExpression["valueCategory"]> ? TypedArithmeticBinaryOperatorExpression<ArithmeticType> : never : never;

    "pointer_diference_expression":
        T extends NonNullable<TypedPointerDifferenceExpression["type"]> ? V extends NonNullable<TypedPointerDifferenceExpression["valueCategory"]> ? TypedPointerDifferenceExpression : never :
        NonNullable<TypedPointerDifferenceExpression["type"]> extends T ? V extends NonNullable<TypedPointerDifferenceExpression["valueCategory"]> ? TypedPointerDifferenceExpression : never : never;
    "pointer_offset_expression":
        T extends NonNullable<TypedPointerOffsetExpression["type"]> ? V extends NonNullable<TypedPointerOffsetExpression["valueCategory"]> ? TypedPointerOffsetExpression<T> : never :
        NonNullable<TypedPointerOffsetExpression["type"]> extends T ? V extends NonNullable<TypedPointerOffsetExpression["valueCategory"]> ? TypedPointerOffsetExpression : never : never;
    "output_operator_expression":
        T extends NonNullable<TypedOutputOperatorExpression["type"]> ? V extends NonNullable<TypedOutputOperatorExpression["valueCategory"]> ? TypedOutputOperatorExpression : never :
        NonNullable<TypedOutputOperatorExpression["type"]> extends T ? V extends NonNullable<TypedOutputOperatorExpression["valueCategory"]> ? TypedOutputOperatorExpression : never : never;
    "relational_binary_operator_expression":
        T extends NonNullable<TypedRelationalBinaryOperatorExpression["type"]> ? V extends NonNullable<TypedRelationalBinaryOperatorExpression["valueCategory"]> ? TypedRelationalBinaryOperatorExpression : never :
        NonNullable<TypedRelationalBinaryOperatorExpression["type"]> extends T ? V extends NonNullable<TypedRelationalBinaryOperatorExpression["valueCategory"]> ? TypedRelationalBinaryOperatorExpression : never : never;
    "pointer_comparison_expression":
        T extends NonNullable<TypedPointerComparisonExpression["type"]> ? V extends NonNullable<TypedPointerComparisonExpression["valueCategory"]> ? TypedPointerComparisonExpression : never :
        NonNullable<TypedPointerComparisonExpression["type"]> extends T ? V extends NonNullable<TypedPointerComparisonExpression["valueCategory"]> ? TypedPointerComparisonExpression : never : never;
    "logical_binary_operator_expression":
        T extends NonNullable<TypedLogicalBinaryOperatorExpression["type"]> ? V extends NonNullable<TypedLogicalBinaryOperatorExpression["valueCategory"]> ? TypedLogicalBinaryOperatorExpression : never :
        NonNullable<TypedLogicalBinaryOperatorExpression["type"]> extends T ? V extends NonNullable<TypedLogicalBinaryOperatorExpression["valueCategory"]> ? TypedLogicalBinaryOperatorExpression : never : never;
    "dereference_expression":
        T extends NonNullable<TypedDereferenceExpression["type"]> ? V extends NonNullable<TypedDereferenceExpression["valueCategory"]> ? TypedDereferenceExpression<T> : never :
        NonNullable<TypedDereferenceExpression["type"]> extends T ? V extends NonNullable<TypedDereferenceExpression["valueCategory"]> ? TypedDereferenceExpression : never : never;
    "address_of_expression":
        T extends NonNullable<TypedAddressOfExpression["type"]> ? V extends NonNullable<TypedAddressOfExpression["valueCategory"]> ? TypedAddressOfExpression<T> : never :
        NonNullable<TypedAddressOfExpression["type"]> extends T ? V extends NonNullable<TypedAddressOfExpression["valueCategory"]> ? TypedAddressOfExpression : never : never;
    "unary_plus_expression":
        T extends NonNullable<TypedUnaryPlusExpression["type"]> ? V extends NonNullable<TypedUnaryPlusExpression["valueCategory"]> ? TypedUnaryPlusExpression<T> : never :
        NonNullable<TypedUnaryPlusExpression["type"]> extends T ? V extends NonNullable<TypedUnaryPlusExpression["valueCategory"]> ? TypedUnaryPlusExpression : never : never;
    "unary_minus_expression":
        T extends NonNullable<TypedUnaryMinusExpression["type"]> ? V extends NonNullable<TypedUnaryMinusExpression["valueCategory"]> ? TypedUnaryMinusExpression<T> : never :
        NonNullable<TypedUnaryMinusExpression["type"]> extends T ? V extends NonNullable<TypedUnaryMinusExpression["valueCategory"]> ? TypedUnaryMinusExpression : never : never;
    "logical_not_expression":
        T extends NonNullable<TypedLogicalNotExpression["type"]> ? V extends NonNullable<TypedLogicalNotExpression["valueCategory"]> ? TypedLogicalNotExpression : never :
        NonNullable<TypedLogicalNotExpression["type"]> extends T ? V extends NonNullable<TypedLogicalNotExpression["valueCategory"]> ? TypedLogicalNotExpression : never : never;
    "subscript_expression":
        T extends NonNullable<TypedSubscriptExpression["type"]> ? V extends NonNullable<TypedSubscriptExpression["valueCategory"]> ? TypedSubscriptExpression<T> : never :
        NonNullable<TypedSubscriptExpression["type"]> extends T ? V extends NonNullable<TypedSubscriptExpression["valueCategory"]> ? TypedSubscriptExpression : never : never;

    "dot_expression":
        V extends NonNullable<DotExpression["valueCategory"]> ? (
            T extends CompleteObjectType ? TypedObjectDotExpression<T> :
            T extends FunctionType ? TypedFunctionDotExpression<T> :
            CompleteObjectType extends T ? FunctionType extends T ? TypedObjectDotExpression | TypedFunctionDotExpression : never
            : never)
        : never;

    "arrow_expression":
        V extends NonNullable<ArrowExpression["valueCategory"]> ? (
            T extends CompleteObjectType ? TypedObjectArrowExpression<T> :
            T extends FunctionType ? TypedFunctionArrowExpression<T> :
            CompleteObjectType extends T ? FunctionType extends T ? TypedObjectArrowExpression | TypedFunctionArrowExpression : never
            : never)
        : never;

    "identifier_expression":
        V extends NonNullable<IdentifierExpression["valueCategory"]> ? (
            T extends CompleteObjectType ? TypedObjectIdentifierExpression<T> :
            T extends FunctionType ? TypedFunctionIdentifierExpression<T> :
            CompleteObjectType extends T ? FunctionType extends T ? TypedObjectIdentifierExpression | TypedFunctionIdentifierExpression : never
            : never)
        : never;

    "numeric_literal_expression":
        T extends NonNullable<TypedNumericLiteralExpression["type"]> ? V extends NonNullable<TypedNumericLiteralExpression["valueCategory"]> ? TypedNumericLiteralExpression<T> : never :
        NonNullable<TypedNumericLiteralExpression["type"]> extends T ? V extends NonNullable<TypedNumericLiteralExpression["valueCategory"]> ? TypedNumericLiteralExpression : never : never;
    "string_literal_expression":
        T extends NonNullable<TypedStringLiteralExpression["type"]> ? V extends NonNullable<TypedStringLiteralExpression["valueCategory"]> ? TypedStringLiteralExpression : never :
        NonNullable<TypedStringLiteralExpression["type"]> extends T ? V extends NonNullable<TypedStringLiteralExpression["valueCategory"]> ? TypedStringLiteralExpression : never : never;
    "parentheses_expression":
        T extends NonNullable<TypedParenthesesExpression["type"]> ? V extends NonNullable<TypedParenthesesExpression["valueCategory"]> ? TypedParenthesesExpression<T, V> : never :
        NonNullable<TypedParenthesesExpression["type"]> extends T ? V extends NonNullable<TypedParenthesesExpression["valueCategory"]> ? TypedParenthesesExpression : never : never;
    "auxiliary_expression":
        T extends NonNullable<TypedAuxiliaryExpression["type"]> ? V extends NonNullable<TypedAuxiliaryExpression["valueCategory"]> ? TypedAuxiliaryExpression<T, V> : never :
        NonNullable<TypedAuxiliaryExpression["type"]> extends T ? V extends NonNullable<TypedAuxiliaryExpression["valueCategory"]> ? TypedAuxiliaryExpression : never : never;
    "magic_function_call_expression":
        T extends NonNullable<TypedMagicFunctionCallExpression["type"]> ? V extends NonNullable<TypedMagicFunctionCallExpression["valueCategory"]> ? TypedMagicFunctionCallExpression<T, V> : never :
        NonNullable<TypedMagicFunctionCallExpression["type"]> extends T ? V extends NonNullable<TypedMagicFunctionCallExpression["valueCategory"]> ? TypedMagicFunctionCallExpression : never : never;
    "function_call_expression":
        T extends NonNullable<TypedFunctionCallExpression["type"]> ? V extends NonNullable<TypedFunctionCallExpression["valueCategory"]> ? TypedFunctionCallExpression<T, V> : never :
        NonNullable<TypedFunctionCallExpression["type"]> extends T ? V extends NonNullable<TypedFunctionCallExpression["valueCategory"]> ? TypedFunctionCallExpression : never : never;
    "ImplicitConversion":
        T extends NonNullable<TypedImplicitConversion["type"]> ? V extends NonNullable<TypedImplicitConversion["valueCategory"]> ? TypedImplicitConversion<CompleteObjectType, ValueCategory, T, V> : never :
        NonNullable<TypedImplicitConversion["type"]> extends T ? V extends NonNullable<TypedImplicitConversion["valueCategory"]> ? TypedImplicitConversion : never : never;
}

let x!: AnalyticTypedExpression<AssignmentExpression, Bool, ValueCategory>

export type CompiledExpressionKinds<T extends ExpressionType, V extends ValueCategory> = {
    "unsupported_expression": never;
    "comma_expression": T extends NonNullable<CompiledCommaExpression["type"]> ? V extends NonNullable<CompiledCommaExpression["valueCategory"]> ? CompiledCommaExpression<T, V> : never : never;
    "ternary_expression": T extends NonNullable<CompiledTernaryExpression["type"]> ? V extends NonNullable<CompiledTernaryExpression["valueCategory"]> ? CompiledTernaryExpression<T, V> : never : never;
    "assignment_expression": T extends NonNullable<CompiledAssignmentExpression["type"]> ? V extends NonNullable<CompiledAssignmentExpression["valueCategory"]> ? CompiledAssignmentExpression<T> : never : never;

    "arithmetic_binary_operator_expression":
        T extends NonNullable<CompiledArithmeticBinaryOperatorExpression["type"]> ? V extends NonNullable<CompiledArithmeticBinaryOperatorExpression["valueCategory"]> ? CompiledArithmeticBinaryOperatorExpression<T> : never :
        NonNullable<ArithmeticBinaryOperatorExpression["type"]> extends T ? V extends NonNullable<CompiledArithmeticBinaryOperatorExpression["valueCategory"]> ? CompiledArithmeticBinaryOperatorExpression<ArithmeticType> : never : never;

    "pointer_diference_expression": T extends NonNullable<CompiledPointerDifferenceExpression["type"]> ? V extends NonNullable<CompiledPointerDifferenceExpression["valueCategory"]> ? CompiledPointerDifferenceExpression : never : never;
    "pointer_offset_expression": T extends NonNullable<CompiledPointerOffsetExpression["type"]> ? V extends NonNullable<CompiledPointerOffsetExpression["valueCategory"]> ? CompiledPointerOffsetExpression<T> : never : never;
    "output_operator_expression": T extends NonNullable<CompiledOutputOperatorExpression["type"]> ? V extends NonNullable<CompiledOutputOperatorExpression["valueCategory"]> ? CompiledOutputOperatorExpression : never : never;
    "relational_binary_operator_expression": T extends NonNullable<CompiledRelationalBinaryOperatorExpression["type"]> ? V extends NonNullable<CompiledRelationalBinaryOperatorExpression["valueCategory"]> ? CompiledRelationalBinaryOperatorExpression : never : never;
    "pointer_comparison_expression": T extends NonNullable<CompiledPointerComparisonExpression["type"]> ? V extends NonNullable<CompiledPointerComparisonExpression["valueCategory"]> ? CompiledPointerComparisonExpression : never : never;
    "logical_binary_operator_expression": T extends NonNullable<CompiledLogicalBinaryOperatorExpression["type"]> ? V extends NonNullable<CompiledLogicalBinaryOperatorExpression["valueCategory"]> ? CompiledLogicalBinaryOperatorExpression : never : never;
    "dereference_expression": T extends NonNullable<CompiledDereferenceExpression["type"]> ? V extends NonNullable<CompiledDereferenceExpression["valueCategory"]> ? CompiledDereferenceExpression<T> : never : never;
    "address_of_expression": T extends NonNullable<CompiledAddressOfExpression["type"]> ? V extends NonNullable<CompiledAddressOfExpression["valueCategory"]> ? CompiledAddressOfExpression<T> : never : never;
    "unary_plus_expression": T extends NonNullable<CompiledUnaryPlusExpression["type"]> ? V extends NonNullable<CompiledUnaryPlusExpression["valueCategory"]> ? CompiledUnaryPlusExpression<T> : never : never;
    "unary_minus_expression": T extends NonNullable<CompiledUnaryMinusExpression["type"]> ? V extends NonNullable<CompiledUnaryMinusExpression["valueCategory"]> ? CompiledUnaryMinusExpression<T> : never : never;
    "logical_not_expression": T extends NonNullable<CompiledLogicalNotExpression["type"]> ? V extends NonNullable<CompiledLogicalNotExpression["valueCategory"]> ? CompiledLogicalNotExpression : never : never;
    "subscript_expression": T extends NonNullable<CompiledSubscriptExpression["type"]> ? V extends NonNullable<CompiledSubscriptExpression["valueCategory"]> ? CompiledSubscriptExpression<T> : never : never;
    "dot_expression": V extends NonNullable<DotExpression["valueCategory"]> ? (T extends CompleteObjectType ? CompiledObjectDotExpression<T> : T extends FunctionType ? CompiledFunctionDotExpression<T> : never) : never;
    "arrow_expression": V extends NonNullable<ArrowExpression["valueCategory"]> ? (T extends CompleteObjectType ? CompiledObjectArrowExpression<T> : T extends FunctionType ? CompiledFunctionArrowExpression<T> : never) : never;
    "identifier_expression": V extends NonNullable<IdentifierExpression["valueCategory"]> ? (T extends CompleteObjectType ? CompiledObjectIdentifierExpression<T> : T extends FunctionType ? CompiledFunctionIdentifierExpression<T> : never) : never;
    "numeric_literal_expression": T extends NonNullable<CompiledNumericLiteralExpression["type"]> ? V extends NonNullable<CompiledNumericLiteralExpression["valueCategory"]> ? CompiledNumericLiteralExpression<T> : never : never;
    "string_literal_expression": T extends NonNullable<CompiledStringLiteralExpression["type"]> ? V extends NonNullable<CompiledStringLiteralExpression["valueCategory"]> ? CompiledStringLiteralExpression : never : never;
    "parentheses_expression": T extends NonNullable<CompiledParenthesesExpression["type"]> ? V extends NonNullable<CompiledParenthesesExpression["valueCategory"]> ? CompiledParenthesesExpression<T, V> : never : never;
    "auxiliary_expression": T extends NonNullable<CompiledAuxiliaryExpression["type"]> ? V extends NonNullable<CompiledAuxiliaryExpression["valueCategory"]> ? CompiledAuxiliaryExpression<T, V> : never : never;
    "magic_function_call_expression": T extends NonNullable<CompiledMagicFunctionCallExpression["type"]> ? V extends NonNullable<CompiledMagicFunctionCallExpression["valueCategory"]> ? CompiledMagicFunctionCallExpression<T> : never : never;
    "function_call_expression": T extends NonNullable<CompiledFunctionCallExpression["type"]> ? V extends NonNullable<CompiledFunctionCallExpression["valueCategory"]> ? CompiledFunctionCallExpression<T> : never : never;
    "ImplicitConversion": T extends NonNullable<CompiledImplicitConversion["type"]> ? V extends NonNullable<CompiledImplicitConversion["valueCategory"]> ? CompiledImplicitConversion<T> : never : never;
}

export type AnalyticTypedExpression<C extends AnalyticExpression, T extends ExpressionType = NonNullable<C["type"]>, V extends ValueCategory = NonNullable<C["valueCategory"]>> = TypedExpressionKinds<T, V>[C["construct_type"]];
export type AnalyticCompiledExpression<C extends AnalyticExpression, T extends ExpressionType = NonNullable<C["type"]>, V extends ValueCategory = NonNullable<C["valueCategory"]>> = CompiledExpressionKinds<T, V>[C["construct_type"]];






const ExpressionConstructsRuntimeMap = {
    "unsupported_expression": (construct: UnsupportedExpression, parent: RuntimeConstruct) => { throw new Error("Cannot create a runtime instance of an unsupported construct."); },
    "comma_expression": <T extends CompiledCommaExpression["type"], V extends ValueCategory>(construct: CompiledCommaExpression<T, V>, parent: RuntimeConstruct) => new RuntimeComma(construct, parent),
    "ternary_expression": <T extends CompiledTernaryExpression["type"], V extends ValueCategory>(construct: CompiledTernaryExpression<T, V>, parent: RuntimeConstruct) => new RuntimeTernary(construct, parent),
    "assignment_expression": <T extends CompiledAssignmentExpression["type"]>(construct: CompiledAssignmentExpression<T>, parent: RuntimeConstruct) => new RuntimeAssignment(construct, parent),
    "arithmetic_binary_operator_expression": <T extends CompiledArithmeticBinaryOperatorExpression["type"]>(construct: CompiledArithmeticBinaryOperatorExpression<T>, parent: RuntimeConstruct) => new RuntimeArithmeticBinaryOperator(construct, parent),
    "pointer_diference_expression": (construct: CompiledPointerDifferenceExpression, parent: RuntimeConstruct) => new RuntimePointerDifference(construct, parent),
    "pointer_offset_expression": <T extends CompiledPointerOffsetExpression["type"]>(construct: CompiledPointerOffsetExpression<T>, parent: RuntimeConstruct) => new RuntimePointerOffset(construct, parent),
    "output_operator_expression": (construct: CompiledOutputOperatorExpression, parent: RuntimeConstruct) => new RuntimeOutputOperatorExpression(construct, parent),
    "relational_binary_operator_expression": <T extends CompiledRelationalBinaryOperatorExpression["type"]>(construct: CompiledRelationalBinaryOperatorExpression<T>, parent: RuntimeConstruct) => new RuntimeRelationalBinaryOperator(construct, parent),
    "pointer_comparison_expression": (construct: CompiledPointerComparisonExpression, parent: RuntimeConstruct) => new RuntimePointerComparisonExpression(construct, parent),
    "logical_binary_operator_expression": (construct: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct) => new RuntimeLogicalBinaryOperatorExpression(construct, parent),
    "dereference_expression": <T extends CompiledDereferenceExpression["type"]>(construct: CompiledDereferenceExpression<T>, parent: RuntimeConstruct) => new RuntimeDereferenceExpression(construct, parent),
    "address_of_expression": <T extends CompiledAddressOfExpression["type"]>(construct: CompiledAddressOfExpression<T>, parent: RuntimeConstruct) => new RuntimeAddressOfExpression(construct, parent),
    "unary_plus_expression": <T extends CompiledUnaryPlusExpression["type"]>(construct: CompiledUnaryPlusExpression<T>, parent: RuntimeConstruct) => new RuntimeUnaryPlusExpression(construct, parent),
    "unary_minus_expression": <T extends CompiledUnaryMinusExpression["type"]>(construct: CompiledUnaryMinusExpression<T>, parent: RuntimeConstruct) => new RuntimeUnaryMinusExpression(construct, parent),
    "logical_not_expression": <T extends CompiledLogicalNotExpression["type"]>(construct: CompiledLogicalNotExpression, parent: RuntimeConstruct) => new RuntimeLogicalNotExpression(construct, parent),
    "subscript_expression": <T extends CompiledSubscriptExpression["type"]>(construct: CompiledSubscriptExpression<T>, parent: RuntimeConstruct) => new RuntimeSubscriptExpression(construct, parent),
    "dot_expression": (construct: CompiledObjectDotExpression | CompiledFunctionDotExpression, parent: RuntimeConstruct) => {
        if (construct.entity instanceof FunctionEntity) {
            return new RuntimeFunctionDotExpression(<any>construct, parent);
        }
        else {
            return new RuntimeObjectDotExpression(<any>construct, parent);
        }
    },
    "arrow_expression": (construct: CompiledObjectArrowExpression | CompiledFunctionArrowExpression, parent: RuntimeConstruct) => {
        if (construct.entity instanceof FunctionEntity) {
            return new RuntimeFunctionArrowExpression(<any>construct, parent);
        }
        else {
            return new RuntimeObjectArrowExpression(<any>construct, parent);
        }
    },
    "identifier_expression": (construct: CompiledObjectIdentifierExpression | CompiledFunctionIdentifierExpression, parent: RuntimeConstruct) => {
        if (construct.entity instanceof FunctionEntity) {
            return new RuntimeFunctionIdentifierExpression(<any>construct, parent);
        }
        else {
            return new RuntimeObjectIdentifierExpression(<any>construct, parent);
        }
    },
    "numeric_literal_expression": <T extends CompiledNumericLiteralExpression["type"]>(construct: CompiledNumericLiteralExpression<T>, parent: RuntimeConstruct) => new RuntimeNumericLiteral(construct, parent),
    "string_literal_expression": (construct: CompiledStringLiteralExpression, parent: RuntimeConstruct) => new RuntimeStringLiteralExpression(construct, parent),
    "parentheses_expression": <T extends CompiledParenthesesExpression["type"], V extends ValueCategory>(construct: CompiledParenthesesExpression<T, V>, parent: RuntimeConstruct) => new RuntimeParentheses(construct, parent),
    "auxiliary_expression": <T extends CompiledExpression["type"] = CompiledExpression["type"], V extends ValueCategory = ValueCategory>(construct: CompiledExpression<T, V>, parent: RuntimeConstruct) => { throw new Error("Auxiliary expressions must never be instantiated at runtime.") },
    "magic_function_call_expression": <RT extends CompiledMagicFunctionCallExpression["type"]>(construct: CompiledMagicFunctionCallExpression<RT>, parent: RuntimeConstruct) => new RuntimeMagicFunctionCallExpression(construct, parent),
    "function_call_expression": <RT extends CompiledFunctionCallExpression["type"]>(construct: CompiledFunctionCallExpression<RT>, parent: RuntimeConstruct) => new RuntimeFunctionCallExpression(construct, parent),
    "ImplicitConversion": <FromType extends CompleteObjectType, FromVC extends ValueCategory, ToType extends CompleteObjectType, ToVC extends ValueCategory>(construct: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct) => construct.createRuntimeExpression(parent)
};

export function createRuntimeExpression(construct: UnsupportedExpression, parent: RuntimeConstruct): never;
export function createRuntimeExpression<T extends ExpressionType, V extends ValueCategory>(construct: CompiledCommaExpression<T, V>, parent: RuntimeConstruct): RuntimeComma<T, V>;
export function createRuntimeExpression<T extends ExpressionType, V extends ValueCategory>(construct: CompiledTernaryExpression<T, V>, parent: RuntimeConstruct): RuntimeTernary<T, V>;
export function createRuntimeExpression<T extends AtomicType>(construct: CompiledAssignmentExpression<T>, parent: RuntimeConstruct): RuntimeAssignment<T>;
export function createRuntimeExpression<T extends ArithmeticType>(construct: CompiledArithmeticBinaryOperatorExpression<T>, parent: RuntimeConstruct): RuntimeArithmeticBinaryOperator<T>;
export function createRuntimeExpression(construct: CompiledPointerDifferenceExpression, parent: RuntimeConstruct): RuntimePointerDifference;
export function createRuntimeExpression<T extends PointerToCompleteType>(construct: CompiledPointerOffsetExpression<T>, parent: RuntimeConstruct): RuntimePointerOffset<T>;
export function createRuntimeExpression(construct: CompiledPointerOffsetExpression, parent: RuntimeConstruct): RuntimePointerOffset;
export function createRuntimeExpression<T extends ArithmeticType>(construct: CompiledRelationalBinaryOperatorExpression<T>, parent: RuntimeConstruct): RuntimeRelationalBinaryOperator<T>;
export function createRuntimeExpression(construct: CompiledPointerComparisonExpression, parent: RuntimeConstruct): RuntimePointerComparisonExpression;
export function createRuntimeExpression(construct: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct): RuntimeLogicalBinaryOperatorExpression;
export function createRuntimeExpression<T extends CompleteObjectType>(construct: CompiledDereferenceExpression<T>, parent: RuntimeConstruct): RuntimeDereferenceExpression<T>;
export function createRuntimeExpression<T extends PointerType>(construct: CompiledAddressOfExpression<T>, parent: RuntimeConstruct): RuntimeAddressOfExpression<T>;
export function createRuntimeExpression<T extends ArithmeticType | PointerType>(construct: CompiledUnaryPlusExpression<T>, parent: RuntimeConstruct): RuntimeUnaryPlusExpression<T>;
export function createRuntimeExpression<T extends ArithmeticType>(construct: CompiledUnaryMinusExpression<T>, parent: RuntimeConstruct): RuntimeUnaryMinusExpression<T>;
export function createRuntimeExpression(construct: CompiledLogicalNotExpression, parent: RuntimeConstruct): RuntimeLogicalNotExpression;
export function createRuntimeExpression<T extends CompleteObjectType>(construct: CompiledSubscriptExpression<T>, parent: RuntimeConstruct): RuntimeSubscriptExpression<T>;
export function createRuntimeExpression(construct: CompiledObjectIdentifierExpression, parent: RuntimeConstruct): RuntimeObjectIdentifierExpression;
export function createRuntimeExpression(construct: CompiledFunctionIdentifierExpression, parent: RuntimeConstruct): RuntimeFunctionIdentifierExpression;
export function createRuntimeExpression(construct: CompiledObjectIdentifierExpression | CompiledFunctionIdentifierExpression, parent: RuntimeConstruct): RuntimeObjectIdentifierExpression | RuntimeFunctionIdentifierExpression;
export function createRuntimeExpression(construct: CompiledObjectDotExpression, parent: RuntimeConstruct): RuntimeObjectDotExpression;
export function createRuntimeExpression(construct: CompiledFunctionDotExpression, parent: RuntimeConstruct): RuntimeFunctionDotExpression;
export function createRuntimeExpression(construct: CompiledObjectDotExpression | CompiledFunctionDotExpression, parent: RuntimeConstruct): RuntimeObjectDotExpression | RuntimeFunctionDotExpression;
export function createRuntimeExpression(construct: CompiledObjectArrowExpression, parent: RuntimeConstruct): RuntimeObjectArrowExpression;
export function createRuntimeExpression(construct: CompiledFunctionArrowExpression, parent: RuntimeConstruct): RuntimeFunctionArrowExpression;
export function createRuntimeExpression(construct: CompiledObjectArrowExpression | CompiledFunctionArrowExpression, parent: RuntimeConstruct): RuntimeObjectArrowExpression | RuntimeFunctionDotExpression;
export function createRuntimeExpression<T extends ArithmeticType>(construct: CompiledNumericLiteralExpression<T>, parent: RuntimeConstruct): RuntimeNumericLiteral<T>;
export function createRuntimeExpression(construct: CompiledStringLiteralExpression, parent: RuntimeConstruct): RuntimeStringLiteralExpression;
export function createRuntimeExpression<T extends ExpressionType, V extends ValueCategory>(construct: CompiledParenthesesExpression<T, V>, parent: RuntimeConstruct): RuntimeParentheses<T, V>;
export function createRuntimeExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory>(construct: AuxiliaryExpression<T, V>, parent: RuntimeConstruct): never;
export function createRuntimeExpression<RT extends PeelReference<CompleteReturnType>>(construct: CompiledMagicFunctionCallExpression<RT>, parent: RuntimeConstruct): RuntimeMagicFunctionCallExpression<RT>;
export function createRuntimeExpression<RT extends PeelReference<CompleteReturnType>>(construct: CompiledFunctionCallExpression<RT>, parent: RuntimeConstruct): RuntimeFunctionCallExpression<RT>;
export function createRuntimeExpression<FromType extends CompleteObjectType, FromVC extends ValueCategory, ToType extends CompleteObjectType, ToVC extends ValueCategory>(construct: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct): RuntimeImplicitConversion<FromType, FromVC, ToType, ToVC>;
export function createRuntimeExpression<T extends ExpressionType, V extends ValueCategory, ConstructType extends AnalyticExpression, CompiledConstructType extends AnalyticCompiledExpression<ConstructType, T, V>>(construct: CompiledConstructType, parent: RuntimeConstruct): ReturnType<(typeof ExpressionConstructsRuntimeMap)[CompiledConstructType["construct_type"]]>;
export function createRuntimeExpression<T extends ExpressionType, V extends ValueCategory>(construct: CompiledExpression<T, V>, parent: RuntimeConstruct): RuntimeExpression<T, V>;
export function createRuntimeExpression<T extends ExpressionType, V extends ValueCategory, ConstructType extends CompiledExpression<T, V> | UnsupportedExpression>(construct: ConstructType, parent: RuntimeConstruct): RuntimeExpression<T, V> {
    return ((<any>ExpressionConstructsRuntimeMap)[construct.construct_type])(<any>construct, parent);
}

/**
 * An expression not currently supported by Lobster.
 */
export class UnsupportedExpression extends Expression<ExpressionASTNode> {
    public readonly construct_type = "unsupported_expression";

    public readonly type = undefined;
    public readonly valueCategory = undefined;

    public constructor(context: ExpressionContext, ast: ExpressionASTNode, unsupportedName: string) {
        super(context, ast);
        this.addNote(CPPError.lobster.unsupported_feature(this, unsupportedName));
    }

    public createDefaultOutlet(this: never, element: JQuery, parent?: ConstructOutlet): never {
        throw new Error("Cannot create an outlet for an unsupported construct.");
    }

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

export abstract class SimpleRuntimeExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory, C extends CompiledExpression<T, V> = CompiledExpression<T, V>> extends RuntimeExpression<T, V, C> {

    private index: 0 | 1 = 0;

    private subexpressions: readonly RuntimeExpression[] = [];

    public constructor(model: C, parent: RuntimeConstruct) {
        super(model, parent);
    }

    protected setSubexpressions(subexpressions: readonly RuntimeConstruct[]) {
        assert(subexpressions.every(subexp => subexp instanceof RuntimeExpression));
        this.subexpressions = <RuntimeExpression[]>subexpressions;
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

    protected abstract operate(): void;
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


export class CommaExpression extends Expression<CommaASTNode> {
    public readonly construct_type = "comma_expression";

    public readonly type?: ExpressionType;
    public readonly valueCategory?: ValueCategory;

    public readonly left: Expression;
    public readonly right: Expression;

    public constructor(context: ExpressionContext, ast: CommaASTNode, left: Expression, right: Expression) {
        super(context, ast);
        this.type = right.type;
        this.valueCategory = right.valueCategory;
        this.attach(this.left = left);
        this.attach(this.right = right);
    }

    public static createFromAST(ast: CommaASTNode, context: ExpressionContext): CommaExpression {
        return new CommaExpression(context, ast, createExpressionFromAST(ast.left, context), createExpressionFromAST(ast.right, context));
    }

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

    public describeEvalResult(depth: number): ConstructDescription {
        return this.right.describeEvalResult(depth);
    }
}

export interface TypedCommaExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends CommaExpression, t_TypedExpression {
    readonly type: T;
    readonly valueCategory: V;
    readonly right: TypedExpression<T, V>;
}

export interface CompiledCommaExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TypedCommaExpression<T, V>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly left: CompiledExpression;
    readonly right: CompiledExpression<T, V>;
}

export class RuntimeComma<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends SimpleRuntimeExpression<T, V, CompiledCommaExpression<T, V>> {

    public left: RuntimeExpression;
    public right: RuntimeExpression<T, V>;

    public constructor(model: CompiledCommaExpression<T, V>, parent: RuntimeConstruct) {
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

export class TernaryExpression extends Expression<TernaryASTNode> {
    public readonly construct_type = "ternary_expression";

    public readonly type?: ExpressionType;
    public readonly valueCategory?: ValueCategory;

    public readonly condition: Expression;
    public readonly then: Expression;
    public readonly otherwise: Expression;

    public constructor(context: ExpressionContext, ast: TernaryASTNode, condition: Expression, then: Expression, otherwise: Expression) {
        super(context, ast);

        if (condition.isWellTyped()) {
            condition = this.compileCondition(condition);
        }

        if (then.isWellTyped() && otherwise.isWellTyped()) {
            ({ then, otherwise } = this.compileConsequences(then, otherwise));
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

    public static createFromAST(ast: TernaryASTNode, context: ExpressionContext): TernaryExpression {
        return new TernaryExpression(context, ast,
            createExpressionFromAST(ast.condition, context),
            createExpressionFromAST(ast.then, context),
            createExpressionFromAST(ast.otherwise, context));
    }

    private compileCondition(condition: TypedExpression) {
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

        if (then.valueCategory !== otherwise.valueCategory) {
            this.addNote(CPPError.expr.ternary.sameValueCategory(this));
        }

        return { then, otherwise };
    }

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

export interface TypedTernaryExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TernaryExpression, t_TypedExpression {
    readonly type: T;
    readonly valueCategory: V;
    readonly then: TypedExpression<T, V>;
    readonly otherwise: TypedExpression<T, V>;
}

export interface CompiledTernaryExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TypedTernaryExpression<T, V>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly condition: CompiledExpression<Bool, "prvalue">;
    readonly then: CompiledExpression<T, V>;
    readonly otherwise: CompiledExpression<T, V>;
}

export class RuntimeTernary<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T, V, CompiledTernaryExpression<T, V>> {

    public condition: RuntimeExpression<Bool, "prvalue">;
    public then: RuntimeExpression<T, V>;
    public otherwise: RuntimeExpression<T, V>;

    private index = "condition";

    public constructor(model: CompiledTernaryExpression<T, V>, parent: RuntimeConstruct) {
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
            if (this.condition.evalResult.rawValue) {
                this.sim.push(this.then);
            }
            else {
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

export class AssignmentExpression extends Expression<AssignmentExpressionASTNode> {
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

    public readonly lhs: Expression;
    public readonly rhs: Expression;

    private constructor(context: ExpressionContext, ast: AssignmentExpressionASTNode, lhs: TypedExpression<AtomicType>, rhs: Expression) {
        super(context, ast);

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

    public static createFromAST(ast: AssignmentExpressionASTNode, context: ExpressionContext): AssignmentExpression | UnsupportedExpression {
        let lhs = createExpressionFromAST(ast.lhs, context);
        let rhs = createExpressionFromAST(ast.rhs, context);
        if (Predicates.isTypedExpression(lhs, isAtomicType)) {
            return new AssignmentExpression(context, ast, lhs, rhs);
        }
        else {
            return new UnsupportedExpression(context, ast, "Non-atomic assignment");
        }
    }

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
        return {
            isTail: false,
            reason: "The assignment itself will happen after the recursive call returns.",
            others: [this]
        };
    }

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
        var lhs = this.lhs.describeEvalResult(0);
        var rhs = this.rhs.describeEvalResult(0);
        return { message: "The value of " + (rhs.name || rhs.message) + " will be assigned to " + (lhs.name || lhs.message) + "." };
    }
}

export interface TypedAssignmentExpression<T extends AtomicType = AtomicType> extends AssignmentExpression, t_TypedExpression {
    readonly type: T;
    readonly lhs: TypedExpression<T>;
}


export interface CompiledAssignmentExpression<T extends AtomicType = AtomicType> extends TypedAssignmentExpression<T>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly lhs: CompiledExpression<T, "lvalue">;
    readonly rhs: CompiledExpression<T, "prvalue">;
}


export class RuntimeAssignment<T extends AtomicType = AtomicType> extends SimpleRuntimeExpression<T, "lvalue", CompiledAssignmentExpression<T>> {

    public readonly lhs: RuntimeExpression<T, "lvalue">;
    public readonly rhs: RuntimeExpression<T, "prvalue">;

    public constructor(model: CompiledAssignmentExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.lhs = createRuntimeExpression(this.model.lhs, this);
        this.rhs = createRuntimeExpression(this.model.rhs, this);
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




export type BinaryOperatorExpressionASTNode =
    ArithmeticBinaryOperatorExpressionASTNode |
    RelationalBinaryOperatorExpressionASTNode |
    LogicalBinaryOperatorExpressionASTNode;

type t_BinaryOperators = t_ArithmeticBinaryOperators | t_RelationalBinaryOperators | t_LogicalBinaryOperators;

abstract class BinaryOperatorExpression<ASTType extends BinaryOperatorExpressionASTNode = BinaryOperatorExpressionASTNode> extends Expression<ASTType> {

    public abstract readonly type?: AtomicType;
    public readonly valueCategory = "prvalue";

    public abstract readonly left: Expression;
    public abstract readonly right: Expression;

    public readonly operator: t_BinaryOperators;

    protected constructor(context: ExpressionContext, ast: ASTType | undefined, operator: t_BinaryOperators) {
        super(context, ast)
        this.operator = operator;
    }

    public createDefaultOutlet(this: CompiledBinaryOperatorExpression, element: JQuery, parent?: ConstructOutlet) {
        return new BinaryOperatorExpressionOutlet(element, this, parent);
    }
}

// export interface CompiledBinaryOperatorExpressionBase<T extends AtomicType = AtomicType>
export type AnalyticBinaryOperatorExpression =
    ArithmeticBinaryOperatorExpression |
    PointerDifferenceExpression |
    PointerOffsetExpression |
    OutputOperatorExpression |
    RelationalBinaryOperatorExpression |
    PointerComparisonExpression |
    LogicalBinaryOperatorExpression;

export interface TypedBinaryOperatorExpression<T extends AtomicType = AtomicType> extends BinaryOperatorExpression, t_TypedExpression {
    readonly type: T;
    readonly left: TypedExpression<AtomicType, "prvalue">;
    readonly right: TypedExpression<AtomicType, "prvalue">;
}

export interface CompiledBinaryOperatorExpression<T extends AtomicType = AtomicType> extends TypedBinaryOperatorExpression<T>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    // Note valueCategory is defined as "prvalue" in BinaryOperator
    readonly left: CompiledExpression<AtomicType, "prvalue">;
    readonly right: CompiledExpression<AtomicType, "prvalue">;
}

export interface RuntimeBinaryOperator extends RuntimeExpression<AtomicType, "prvalue", CompiledBinaryOperatorExpression<AtomicType>> {

    readonly left: RuntimeExpression<AtomicType, "prvalue">;
    readonly right: RuntimeExpression<AtomicType, "prvalue">;

}




export interface ArithmeticBinaryOperatorExpressionASTNode extends ASTNode {
    readonly construct_type: "arithmetic_binary_operator_expression";
    readonly operator: t_ArithmeticBinaryOperators;
    readonly left: ExpressionASTNode;
    readonly right: ExpressionASTNode;
    readonly associativity: "left";
}

type t_ArithmeticBinaryOperators = "+" | "-" | "*" | "/" | "%" | "&" | "^" | "|" | "<<" | ">>";

function add(left: number, right: number) { return left + right; }
function sub(left: number, right: number) { return left - right; }
function mult(left: number, right: number) { return left * right; }
function intDiv(left: number, right: number) { return Math.trunc(left / right); };
function floatDiv(left: number, right: number) { return left / right; };
function mod(left: number, right: number) { return left - intDiv(left, right) * right; }
function bitAnd(left: number, right: number) { return left & right; }
function bitXor(left: number, right: number) { return left ^ right; }
function bitOr(left: number, right: number) { return left | right; }
function bitShiftLeft(left: number, right: number) { return left << right; }
function bitShiftRight(left: number, right: number) { return left >>> right; } // TODO: is the sign preserving bit shift right more consistent with C++?

// Note: AtomicType here is much wider than needed. T should theoretically only ever be Int, Double, or Float
const ARITHMETIC_BINARY_OPERATIONS: { [k in t_ArithmeticBinaryOperators]: <T extends AtomicType>(left: Value<T>, right: Value<T>) => Value<T> }
    = {
    "+": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, add);
    },
    "-": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, sub);
    },
    "*": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, mult);
    },
    "/": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        if (left.type.isIntegralType()) {
            return left.combine(right, intDiv);
        }
        else {
            return left.combine(right, floatDiv);
        }
    },
    "%": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, mod);
    },
    "&": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, bitAnd);
    },
    "^": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, bitXor);
    },
    "|": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, bitOr);
    },
    "<<": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, bitShiftLeft);
    },
    ">>": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.combine(right, bitShiftRight);
    }
}

export class ArithmeticBinaryOperatorExpression extends BinaryOperatorExpression<ArithmeticBinaryOperatorExpressionASTNode> {
    public readonly construct_type = "arithmetic_binary_operator_expression";

    public readonly type?: ArithmeticType;

    public readonly left: Expression;
    public readonly right: Expression;

    public readonly operator!: t_ArithmeticBinaryOperators; // Narrows type from base

    protected constructor(context: ExpressionContext, ast: ArithmeticBinaryOperatorExpressionASTNode, left: Expression, right: Expression, operator: t_ArithmeticBinaryOperators) {
        super(context, ast, operator);

        if (!left.isWellTyped() || !right.isWellTyped()) {
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }

        // Arithmetic types are required
        if (!Predicates.isTypedExpression(left, isArithmeticType) || !Predicates.isTypedExpression(right, isArithmeticType)) {
            this.addNote(CPPError.expr.binary.arithmetic_operands(this, this.operator, left, right));
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }

        // % operator and shift operators require integral operands
        if ((operator === "%" || operator === "<<" || operator == ">>") &&
            (!Predicates.isTypedExpression(left, isIntegralType) || !Predicates.isTypedExpression(right, isIntegralType))) {
            this.addNote(CPPError.expr.binary.integral_operands(this, this.operator, left, right));
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

    public static createFromAST(ast: ArithmeticBinaryOperatorExpressionASTNode, context: ExpressionContext): ArithmeticBinaryOperatorExpression | PointerDifferenceExpression | PointerOffsetExpression | OutputOperatorExpression {
        let left: Expression = createExpressionFromAST(ast.left, context);
        let right: Expression = createExpressionFromAST(ast.right, context);
        let op = ast.operator;

        // If operator is "<<" and the left operand is an ostream, treat as output operation
        if (op === "<<" && Predicates.isTypedExpression(left, isPotentiallyCompleteClassType) && left.type.className === "ostream" && left.isLvalue()) {
            
            return new OutputOperatorExpression(context, ast, left, right);
        }

        // If operator is "-" and both are pointers or arrays, it's a pointer difference
        // Note that although integer 0 is convertible to a pointer, that conversion should
        // not be applied here since the 0 should just be interpreted as a pointer offset.
        if (op === "-" && (Predicates.isTypedExpression(left, isPointerType) || Predicates.isTypedExpression(left, isBoundedArrayType, "lvalue"))
                       && (Predicates.isTypedExpression(right, isPointerType) || Predicates.isTypedExpression(right, isBoundedArrayType, "lvalue"))) {

            return new PointerDifferenceExpression(context, ast,
                convertToPRValue(left),
                convertToPRValue(right));
        }

        // If operator is "-" or "+" and it's a combination of pointer plus integer, it's a pointer offset
        if (op === "-" || op === "+") {
            if ((Predicates.isTypedExpression(left, isPointerType) || Predicates.isTypedExpression(left, isBoundedArrayType, "lvalue")) && Predicates.isTypedExpression(right, isIntegralType) ||
                (Predicates.isTypedExpression(right, isPointerType) || Predicates.isTypedExpression(right, isBoundedArrayType, "lvalue")) && Predicates.isTypedExpression(left, isIntegralType)) {
                return new PointerOffsetExpression(context, ast,
                    <TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">>convertToPRValue(left),
                    <TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">>convertToPRValue(right));
            }
        }

        return new ArithmeticBinaryOperatorExpression(context, ast, left, right, op);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedArithmeticBinaryOperatorExpression<T extends ArithmeticType = ArithmeticType> extends ArithmeticBinaryOperatorExpression, t_TypedExpression {
    readonly type: T;
    readonly left: TypedExpression<T, "prvalue">;
    readonly right: TypedExpression<T, "prvalue">;
}

export interface CompiledArithmeticBinaryOperatorExpression<T extends ArithmeticType = ArithmeticType> extends TypedArithmeticBinaryOperatorExpression<T>, t_CompiledConstruct {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<T, "prvalue">;
    readonly right: CompiledExpression<T, "prvalue">;
}

// TODO: rename this or maybe create two separate classes for Arithmetic and Logical
export class RuntimeArithmeticBinaryOperator<T extends ArithmeticType = ArithmeticType> extends SimpleRuntimeExpression<T, "prvalue", CompiledArithmeticBinaryOperatorExpression<T>> {

    public readonly left: RuntimeExpression<T, "prvalue">;
    public readonly right: RuntimeExpression<T, "prvalue">;

    public constructor(model: CompiledArithmeticBinaryOperatorExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {
        // Not sure why the cast here is necessary but apparently Typescript needs it
        this.setEvalResult(<VCResultTypes<T, "prvalue">>ARITHMETIC_BINARY_OPERATIONS[this.model.operator](this.left.evalResult, this.right.evalResult));
    }
}

export class PointerDifferenceExpression extends BinaryOperatorExpression<ArithmeticBinaryOperatorExpressionASTNode> {
    public readonly construct_type = "pointer_diference_expression";

    public readonly type: Int;
    public readonly valueCategory = "prvalue";

    public readonly left: TypedExpression<PointerType, "prvalue">;
    public readonly right: TypedExpression<PointerType, "prvalue">;

    public readonly operator!: "-"; // Narrows type from base

    public constructor(context: ExpressionContext, ast: ArithmeticBinaryOperatorExpressionASTNode, left: TypedExpression<PointerType, "prvalue">, right: TypedExpression<PointerType, "prvalue">) {
        super(context, ast, "-");

        // Not necessary assuming they come in as prvalues that are confirmed to have pointer type.
        // if (left.isWellTyped() && right.isWellTyped()) {
        //     left = convertToPRValue(left);
        //     right = convertToPRValue(right);
        // }

        assert(similarType(left.type, right.type));

        this.attach(this.left = left);
        this.attach(this.right = right);

        this.type = new Int();

        if (!left.type.isPointerToCompleteType()) {
            this.addNote(CPPError.expr.pointer_difference.incomplete_pointed_type(this, left.type))
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

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedPointerDifferenceExpression extends PointerDifferenceExpression, t_TypedExpression {

}

export interface CompiledPointerDifferenceExpression extends TypedPointerDifferenceExpression, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<PointerToCompleteType, "prvalue">;
    readonly right: CompiledExpression<PointerToCompleteType, "prvalue">;
}

export class RuntimePointerDifference extends SimpleRuntimeExpression<Int, "prvalue", CompiledPointerDifferenceExpression> {

    public left: RuntimeExpression<PointerToCompleteType, "prvalue">;
    public right: RuntimeExpression<PointerToCompleteType, "prvalue">;

    public constructor(model: CompiledPointerDifferenceExpression, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
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

export class PointerOffsetExpression extends BinaryOperatorExpression<ArithmeticBinaryOperatorExpressionASTNode> {
    public readonly construct_type = "pointer_offset_expression";

    public readonly type?: PointerType;

    public readonly left: TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">;
    public readonly right: TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">;

    public readonly pointer?: TypedExpression<PointerType, "prvalue">;
    public readonly offset?: TypedExpression<IntegralType, "prvalue">;

    public readonly pointerOnLeft?: boolean;

    public readonly operator!: "+"; // Narrows type from base

    public constructor(context: ExpressionContext, ast: ArithmeticBinaryOperatorExpressionASTNode,
        left: TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">,
        right: TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">) {
        super(context, ast, "+");

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

        if (Predicates.isTypedExpression(left, isPointerType) && Predicates.isTypedExpression(right, isIntegralType)) {
            this.pointerOnLeft = true;
            this.pointer = left;
            this.offset = right;
            this.type = this.pointer.type;

            if (!left.type.isPointerToCompleteType()) {
                this.addNote(CPPError.expr.pointer_offset.incomplete_pointed_type(this, left.type))
            }
        }
        else if (Predicates.isTypedExpression(left, isIntegralType) && Predicates.isTypedExpression(right, isPointerType)) {
            this.pointerOnLeft = false;
            this.pointer = right;
            this.offset = left;
            this.type = this.pointer.type;

            if (!right.type.isPointerToCompleteType()) {
                this.addNote(CPPError.expr.pointer_offset.incomplete_pointed_type(this, right.type))
            }
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

export interface TypedPointerOffsetExpression<T extends PointerType = PointerType> extends PointerOffsetExpression, t_TypedExpression {
    readonly type: T;

    readonly left: TypedExpression<T, "prvalue"> | TypedExpression<IntegralType, "prvalue">;
    readonly right: TypedExpression<T, "prvalue"> | TypedExpression<IntegralType, "prvalue">;

    readonly pointer: TypedExpression<T, "prvalue">;
    readonly offset: TypedExpression<IntegralType, "prvalue">;
}

export interface CompiledPointerOffsetExpression<T extends PointerToCompleteType = PointerToCompleteType> extends TypedPointerOffsetExpression<T>, t_CompiledConstruct {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<T, "prvalue"> | CompiledExpression<IntegralType, "prvalue">;
    readonly right: CompiledExpression<T, "prvalue"> | CompiledExpression<IntegralType, "prvalue">;

    readonly pointer: CompiledExpression<T, "prvalue">;
    readonly offset: CompiledExpression<IntegralType, "prvalue">;

    readonly pointerOnLeft?: boolean;
}


export class RuntimePointerOffset<T extends PointerToCompleteType = PointerToCompleteType> extends SimpleRuntimeExpression<T, "prvalue", CompiledPointerOffsetExpression<T>> {

    public readonly left: RuntimeExpression<T, "prvalue"> | RuntimeExpression<IntegralType, "prvalue">;
    public readonly right: RuntimeExpression<T, "prvalue"> | RuntimeExpression<IntegralType, "prvalue">;

    public readonly pointer: RuntimeExpression<T, "prvalue">;
    public readonly offset: RuntimeExpression<IntegralType, "prvalue">;

    public constructor(model: CompiledPointerOffsetExpression<T>, parent: RuntimeConstruct) {
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

    public operate() {

        // code below computes the new address after pointer addition, while preserving RTTI
        //   result = pointer + offset * pointerSize
        let result = this.pointer.evalResult.pointerOffset(this.offset.evalResult);
        this.setEvalResult(<VCResultTypes<T, "prvalue">>result); // not sure why cast is necessary here

        let resultType = result.type;
        if (resultType.isType(ArrayPointerType)) {
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
            this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "Uh, I don't think you're supposed to do arithmetic with that pointer. It's not pointing into an array.", true);
        }
    }
}

export class OutputOperatorExpression extends Expression<ArithmeticBinaryOperatorExpressionASTNode> { // TODO: change to special Output AST?
    public readonly construct_type = "output_operator_expression";

    public readonly type : PotentiallyCompleteClassType;
    public readonly valueCategory = "lvalue";

    public readonly left: TypedExpression<PotentiallyCompleteClassType, "lvalue">;
    public readonly right: Expression;

    public readonly operator = "<<";

    public constructor(context: ExpressionContext, ast: ArithmeticBinaryOperatorExpressionASTNode,
        left: TypedExpression<PotentiallyCompleteClassType, "lvalue">,
        right: Expression) {
        super(context, ast);
        
        this.attach(this.left = left);
        this.type = this.left.type;

        // left is already well-typed via ctor parameter type
        if (!right.isWellTyped()) {
            this.attach(this.right = right);
            return;
        }

        if (! (Predicates.isTypedExpression(right, isAtomicType) || Predicates.isTypedExpression(right, isBoundedArrayType))) {
            this.addNote(CPPError.expr.output.unsupported_type(this, right.type));

            this.attach(this.right = right);
            return;
        }

        this.attach(this.right = convertToPRValue(right));
    }

    public createDefaultOutlet(this: CompiledOutputOperatorExpression, element: JQuery, parent?: ConstructOutlet) {
        return new OutputOperatorExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedOutputOperatorExpression extends OutputOperatorExpression, t_TypedExpression {

}

export interface CompiledOutputOperatorExpression extends TypedOutputOperatorExpression, t_CompiledConstruct {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<PotentiallyCompleteClassType, "lvalue">;
    readonly right: CompiledExpression<AtomicType, "prvalue">;
}


export class RuntimeOutputOperatorExpression extends SimpleRuntimeExpression<PotentiallyCompleteClassType, "lvalue", CompiledOutputOperatorExpression> {

    public readonly left: RuntimeExpression<PotentiallyCompleteClassType, "lvalue">;
    public readonly right: RuntimeExpression<AtomicType, "prvalue">;

    public constructor(model: CompiledOutputOperatorExpression, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {
        this.sim.cout(this.right.evalResult);
    }
}



// export class InputOperatorExpression extends Expression<ArithmeticBinaryOperatorExpressionASTNode> { // TODO: change to special Input AST?
//     public readonly construct_type = "input_operator_expression";

//     public readonly type : PotentiallyCompleteClassType;
//     public readonly valueCategory = "lvalue";

//     public readonly left: TypedExpression<PotentiallyCompleteClassType, "lvalue">;
//     public readonly right: Expression;

//     public readonly operator = ">>";

//     public constructor(context: ExpressionContext, ast: ArithmeticBinaryOperatorExpressionASTNode,
//         left: TypedExpression<PotentiallyCompleteClassType, "lvalue">,
//         right: Expression) {
//         super(context, ast);
        
//         this.attach(this.left = left);
//         this.attach(this.right = right);
//         this.type = this.left.type;

//         // left is already well-typed via ctor parameter type
//         if (!right.isWellTyped()) {
//             return;
//         }

//         if (!right.isLvalue()) {
//             this.addNote(CPPError.expr.input.lvalue_required(this, right.type));
//         }

//         if (!Predicates.isTypedExpression(right, isAtomicType)) {
//             this.addNote(CPPError.expr.input.unsupported_type(this, right.type));
//         }
//     }

//     public createDefaultOutlet(this: CompiledInputOperatorExpression, element: JQuery, parent?: ConstructOutlet) {
//         return new InputOperatorExpressionOutlet(element, this, parent);
//     }

//     public describeEvalResult(depth: number): ConstructDescription {
//         throw new Error("Method not implemented.");
//     }
// }

// export interface TypedInputOperatorExpression extends InputOperatorExpression, t_TypedExpression {

// }

// export interface CompiledInputOperatorExpression extends TypedInputOperatorExpression, t_CompiledConstruct {

//     readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

//     readonly left: CompiledExpression<PotentiallyCompleteClassType, "lvalue">;
//     readonly right: CompiledExpression<AtomicType, "lvalue">;
// }


// export class RuntimeInputOperatorExpression extends RuntimeExpression<PotentiallyCompleteClassType, "lvalue", CompiledInputOperatorExpression> {

//     public readonly left: RuntimeExpression<PotentiallyCompleteClassType, "lvalue">;
//     public readonly right: RuntimeExpression<AtomicType, "lvalue">;
    
//     private index: 0 | 1 = 0;

//     public constructor(model: CompiledInputOperatorExpression, parent: RuntimeConstruct) {
//         super(model, parent);
//         this.left = createRuntimeExpression(this.model.left, this);
//         this.right = createRuntimeExpression(this.model.right, this);
//     }

//     protected upNextImpl() {
//         switch(this.index) {
//             case 0:
//                 this.sim.push(this.right);
//                 this.sim.push(this.left);
//                 ++this.index;
//                 break;
//             case 1:
//                 break;
//             default:
//                 assertNever(this.index);
//         }
//     }

//     protected stepForwardImpl() {
//         this.operate();
//         this.startCleanup()
//     }
// }








export interface RelationalBinaryOperatorExpressionASTNode extends ASTNode {
    readonly construct_type: "relational_binary_operator_expression";
    readonly operator: t_RelationalBinaryOperators;
    readonly left: ExpressionASTNode;
    readonly right: ExpressionASTNode;
    readonly associativity: "left";
}

type t_RelationalBinaryOperators = "<" | ">" | "<=" | ">=" | "==" | "!=";

function lt(left: number, right: number) { return left < right; }
function gt(left: number, right: number) { return left > right; }
function lte(left: number, right: number) { return left <= right; }
function gte(left: number, right: number) { return left >= right; }
function eq(left: number, right: number) { return left == right; }
function ne(left: number, right: number) { return left != right; }

const RELATIONAL_BINARY_OPERATIONS: { [k in t_RelationalBinaryOperators]: <T extends AtomicType>(left: Value<T>, right: Value<T>) => Value<Bool> }
    = {
    "<": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, lt);
    },
    ">": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, gt);
    },
    "<=": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, lte);
    },
    ">=": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, gte);
    },
    "==": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, eq);
    },
    "!=": function <T extends AtomicType>(left: Value<T>, right: Value<T>) {
        return left.compare(right, ne);
    },
}

export class RelationalBinaryOperatorExpression extends BinaryOperatorExpression<RelationalBinaryOperatorExpressionASTNode> {
    public readonly construct_type = "relational_binary_operator_expression";

    public readonly type = Bool.BOOL;

    public readonly left: Expression;
    public readonly right: Expression;

    public readonly operator!: t_RelationalBinaryOperators; // Narrows type from base

    protected constructor(context: ExpressionContext, ast: RelationalBinaryOperatorExpressionASTNode, left: Expression, right: Expression, operator: t_RelationalBinaryOperators) {
        super(context, ast, operator);

        if (!left.isWellTyped() || !right.isWellTyped()) {
            this.attach(this.left = left);
            this.attach(this.right = right);
            return;
        }

        // Arithmetic types are required (note: pointer comparisons have their own PointerRelationalOperation class)
        if (!Predicates.isTypedExpression(left, isArithmeticType) || !Predicates.isTypedExpression(right, isArithmeticType)) {
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

    public static createFromAST(ast: RelationalBinaryOperatorExpressionASTNode, context: ExpressionContext): RelationalBinaryOperatorExpression | PointerComparisonExpression {

        let left: Expression = createExpressionFromAST(ast.left, context);
        let right: Expression = createExpressionFromAST(ast.right, context);
        let op = ast.operator;

        if (Predicates.isTypedExpression(left, isPointerType) || Predicates.isTypedExpression(left, isBoundedArrayType, "lvalue")) {
            if (Predicates.isTypedExpression(right, isPointerType) || Predicates.isTypedExpression(right, isBoundedArrayType, "lvalue")) {
                return new PointerComparisonExpression(context, ast, convertToPRValue(left), convertToPRValue(right), op);
            }
            else if (isIntegerLiteralZero(right)) {
                let convertedLeft = convertToPRValue(left);
                return new PointerComparisonExpression(context, ast, convertedLeft, new NullPointerConversion(right, convertedLeft.type), op);
            }
        }
        else if (isIntegerLiteralZero(left) && (Predicates.isTypedExpression(right, isPointerType) || Predicates.isTypedExpression(right, isBoundedArrayType, "lvalue"))) {
            let convertedRight = convertToPRValue(right);
            return new PointerComparisonExpression(context, ast, new NullPointerConversion(left, convertedRight.type), convertedRight, op);
        }

        return new RelationalBinaryOperatorExpression(context, ast, left, right, ast.operator);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedRelationalBinaryOperatorExpression extends RelationalBinaryOperatorExpression, t_TypedExpression {


}

export interface CompiledRelationalBinaryOperatorExpression<OperandT extends ArithmeticType = ArithmeticType> extends TypedRelationalBinaryOperatorExpression, t_CompiledConstruct {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<OperandT, "prvalue">;
    readonly right: CompiledExpression<OperandT, "prvalue">;
}

export class RuntimeRelationalBinaryOperator<OperandT extends ArithmeticType = ArithmeticType> extends SimpleRuntimeExpression<Bool, "prvalue", CompiledRelationalBinaryOperatorExpression<OperandT>> {

    public readonly left: RuntimeExpression<OperandT, "prvalue">;
    public readonly right: RuntimeExpression<OperandT, "prvalue">;

    public constructor(model: CompiledRelationalBinaryOperatorExpression<OperandT>, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {
        // Not sure why the cast here is necessary but apparently Typescript needs it
        this.setEvalResult(RELATIONAL_BINARY_OPERATIONS[this.model.operator](this.left.evalResult, this.right.evalResult));
    }
}



export class PointerComparisonExpression extends BinaryOperatorExpression<RelationalBinaryOperatorExpressionASTNode> {
    public readonly construct_type = "pointer_comparison_expression";

    public readonly type: Bool;
    public readonly valueCategory = "prvalue";

    public readonly left: TypedExpression<PointerType, "prvalue">;
    public readonly right: TypedExpression<PointerType, "prvalue">;

    public readonly operator!: t_RelationalBinaryOperators; // Narrows type from base

    public constructor(context: ExpressionContext, ast: RelationalBinaryOperatorExpressionASTNode | undefined, left: TypedExpression<PointerType, "prvalue">,
        right: TypedExpression<PointerType, "prvalue">, operator: t_RelationalBinaryOperators) {
        super(context, ast, operator);

        this.attach(this.left = left);
        this.attach(this.right = right);

        this.type = new Bool();

        if (!(similarType(left.type, right.type) || subType(left.type, right.type) || subType(right.type, left.type))) {
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

export interface TypedPointerComparisonExpression extends PointerComparisonExpression, t_TypedExpression {


}

export interface CompiledPointerComparisonExpression<OperandT extends PointerType = PointerType> extends TypedPointerComparisonExpression, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<OperandT, "prvalue">;
    readonly right: CompiledExpression<OperandT, "prvalue">;
}

export class RuntimePointerComparisonExpression<OperandT extends PointerType = PointerType> extends SimpleRuntimeExpression<Bool, "prvalue", CompiledPointerComparisonExpression<OperandT>> {

    public left: RuntimeExpression<OperandT, "prvalue">;
    public right: RuntimeExpression<OperandT, "prvalue">;

    public constructor(model: CompiledPointerComparisonExpression<OperandT>, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
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

export class LogicalBinaryOperatorExpression extends BinaryOperatorExpression<LogicalBinaryOperatorExpressionASTNode> {
    public readonly construct_type = "logical_binary_operator_expression";

    public readonly type = new Bool();

    public readonly left: Expression;
    public readonly right: Expression;

    public readonly operator!: t_LogicalBinaryOperators; // Narrows type from base

    protected constructor(context: ExpressionContext, ast: LogicalBinaryOperatorExpressionASTNode | undefined, left: Expression, right: Expression, operator: t_LogicalBinaryOperators) {
        super(context, ast, operator);

        if (left.isWellTyped() && right.isWellTyped()) {
            this.attach(this.left = this.compileLogicalSubexpression(left));
            this.attach(this.right = this.compileLogicalSubexpression(right));
        }
        else {
            this.attach(this.left = left);
            this.attach(this.right = right);
        }
    }

    private compileLogicalSubexpression(subexpr: TypedExpression) {
        subexpr = standardConversion(subexpr, Bool.BOOL);
        if (!isType(subexpr.type, Bool)) {
            this.addNote(CPPError.expr.binary.boolean_operand(this, this.operator, subexpr));
        }
        return subexpr;
    }

    public static createFromAST(ast: LogicalBinaryOperatorExpressionASTNode, context: ExpressionContext): LogicalBinaryOperatorExpression {
        return new LogicalBinaryOperatorExpression(context, ast,
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

export interface TypedLogicalBinaryOperatorExpression extends LogicalBinaryOperatorExpression, t_TypedExpression {


}

export interface CompiledLogicalBinaryOperatorExpression extends TypedLogicalBinaryOperatorExpression, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<Bool, "prvalue">;
    readonly right: CompiledExpression<Bool, "prvalue">;
}

export class RuntimeLogicalBinaryOperatorExpression extends RuntimeExpression<Bool, "prvalue", CompiledLogicalBinaryOperatorExpression> {

    public left: RuntimeExpression<Bool, "prvalue">;
    public right: RuntimeExpression<Bool, "prvalue">;

    private index = "left";

    private hasShortCircuited?: boolean;

    public constructor(model: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
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
    readonly operator: "+";
    readonly operand: ExpressionASTNode;
}

export interface UnaryMinusExpressionASTNode extends ASTNode {
    readonly construct_type: "unary_minus_expression";
    readonly operator: "-";
    readonly operand: ExpressionASTNode;
}

export interface LogicalNotExpressionASTNode extends ASTNode {
    readonly construct_type: "logical_not_expression";
    readonly operator: "!";
    readonly operand: ExpressionASTNode;
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

abstract class UnaryOperatorExpression<ASTType extends UnaryOperatorExpressionASTNode = UnaryOperatorExpressionASTNode> extends Expression<ASTType> {

    public abstract readonly type?: CompleteObjectType | VoidType; // VoidType is due to delete, delete[]

    public abstract readonly operand: Expression;

    public abstract readonly operator: t_UnaryOperators;

    protected constructor(context: ExpressionContext, ast: ASTType | undefined) {
        super(context, ast)
    }

    public createDefaultOutlet(this: CompiledUnaryOperatorExpression, element: JQuery, parent?: ConstructOutlet) {
        return new UnaryOperatorExpressionOutlet(element, this, parent);
    }

}

export type AnalyticUnaryOperatorExpression =
    DereferenceExpression |
    AddressOfExpression |
    UnaryPlusExpression |
    UnaryMinusExpression |
    LogicalNotExpression;

export interface TypedUnaryOperatorExpression<T extends CompleteObjectType | VoidType = CompleteObjectType | VoidType, V extends ValueCategory = ValueCategory> extends UnaryOperatorExpression, t_TypedExpression {
    readonly type: T;
    readonly valueCategory: ValueCategory;
}

export interface CompiledUnaryOperatorExpression<T extends CompleteObjectType | VoidType = CompleteObjectType | VoidType, V extends ValueCategory = ValueCategory> extends TypedUnaryOperatorExpression<T, V>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly operand: CompiledExpression;
}


export interface RuntimeUnaryOperatorExpression extends RuntimeExpression<CompleteObjectType | VoidType, ValueCategory, CompiledUnaryOperatorExpression<CompleteObjectType | VoidType>> {

    readonly operand: RuntimeExpression;

}

export class DereferenceExpression extends UnaryOperatorExpression<DereferenceExpressionASTNode> {
    public readonly construct_type = "dereference_expression";

    public readonly type?: CompleteObjectType;
    public readonly valueCategory = "lvalue";

    public readonly operand: Expression;

    public readonly operator = "*";

    public constructor(context: ExpressionContext, ast: DereferenceExpressionASTNode, operand: Expression) {
        super(context, ast);

        if (!operand.isWellTyped()) {
            this.attach(this.operand = operand);
            return;
        }

        let convertedOperand = convertToPRValue(operand);
        this.attach(this.operand = convertedOperand);

        if (!Predicates.isTypedExpression(convertedOperand, isPointerType)) {
            this.addNote(CPPError.expr.dereference.pointer(this, convertedOperand.type));
        }
        else if (!(convertedOperand.type.ptrTo.isCompleteObjectType())) {
            // Note: function pointers currently not allowed
            this.addNote(CPPError.expr.dereference.pointerToObjectType(this, convertedOperand.type));
        }
        else {
            this.type = convertedOperand.type.ptrTo;
        }
    }

    public static createFromAST(ast: DereferenceExpressionASTNode, context: ExpressionContext): DereferenceExpression {
        return new DereferenceExpression(context, ast, createExpressionFromAST(ast.operand, context));
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

export interface TypedDereferenceExpression<T extends CompleteObjectType = CompleteObjectType> extends DereferenceExpression, t_TypedExpression {
    readonly type: T;
    readonly operand: TypedExpression<PointerType<T>, "prvalue">;
}

export interface CompiledDereferenceExpression<T extends CompleteObjectType = CompleteObjectType> extends TypedDereferenceExpression<T>, t_CompiledConstruct {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpression<PointerType<T>, "prvalue">;
}

export class RuntimeDereferenceExpression<T extends CompleteObjectType> extends SimpleRuntimeExpression<T, "lvalue", CompiledDereferenceExpression<T>> {

    public operand: RuntimeExpression<PointerType<T>, "prvalue">;

    public constructor(model: CompiledDereferenceExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
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
            if (addr < ptr.type.min()) {
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "That pointer has wandered off the beginning of its array. Dereferencing it might cause a segfault, or worse - you might just access/change other memory outside the array.", true);
            }
            else if (ptr.type.onePast() < addr) {
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "That pointer has wandered off the end of its array. Dereferencing it might cause a segfault, or worse - you might just access/change other memory outside the array.", true);
            }
            else if (addr == ptr.type.onePast()) {
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


export class AddressOfExpression extends UnaryOperatorExpression<AddressOfExpressionASTNode> {
    public readonly construct_type = "address_of_expression";

    public readonly type?: PointerType;
    public readonly valueCategory = "prvalue";

    public readonly operand: Expression;

    public readonly operator = "&";

    public constructor(context: ExpressionContext, ast: AddressOfExpressionASTNode, operand: Expression) {
        super(context, ast);

        this.attach(this.operand = operand);

        if (!operand.isWellTyped()) {
            return;
        }

        if (operand.valueCategory !== "lvalue") {
            this.addNote(CPPError.expr.addressOf.lvalue_required(this));
        }

        if (Predicates.isTypedExpression(operand, isFunctionType)) {
            this.addNote(CPPError.lobster.unsupported_feature(this, "Function Pointers"));
            return;
        }

        if (!Predicates.isTypedExpression(operand, isCompleteObjectType)) {
            this.addNote(CPPError.expr.addressOf.object_type_required(this));
            return;
        }

        this.type = new PointerType(operand.type);
    }

    public static createFromAST(ast: AddressOfExpressionASTNode, context: ExpressionContext): AddressOfExpression {
        return new AddressOfExpression(context, ast, createExpressionFromAST(ast.operand, context));
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

export interface TypedAddressOfExpression<T extends PointerType = PointerType> extends AddressOfExpression, t_TypedExpression {
    readonly type: T;
    readonly operand: TypedExpression<T["ptrTo"]>;
}

export interface CompiledAddressOfExpression<T extends PointerType = PointerType> extends TypedAddressOfExpression<T>, t_CompiledConstruct {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpression<T["ptrTo"], "lvalue">;
}

export class RuntimeAddressOfExpression<T extends PointerType> extends SimpleRuntimeExpression<T, "prvalue", CompiledAddressOfExpression<T>> {

    public operand: RuntimeExpression<T["ptrTo"], "lvalue">;

    public constructor(model: CompiledAddressOfExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.setSubexpressions([this.operand]);
    }

    protected operate() {
        this.setEvalResult(<this["evalResult"]>this.operand.evalResult.getPointerTo());
    }

}



export class UnaryPlusExpression extends UnaryOperatorExpression<UnaryPlusExpressionASTNode> {
    public readonly construct_type = "unary_plus_expression";

    public readonly type?: ArithmeticType | PointerType;
    public readonly valueCategory = "prvalue";

    public readonly operand: Expression;

    public readonly operator = "+";

    public constructor(context: ExpressionContext, ast: UnaryPlusExpressionASTNode, operand: Expression) {
        super(context, ast);

        
        if (!operand.isWellTyped()) {
            this.attach(this.operand = operand);
            return;
        }

        if (Predicates.isTypedExpression(operand, isIntegralType)) {
            let convertedOperand = integralPromotion(convertToPRValue(operand));
            this.type = convertedOperand.type;
            this.attach(this.operand = convertedOperand);
        }
        else if (Predicates.isTypedExpression(operand, isArithmeticType)) {
            let convertedOperand = convertToPRValue(operand);
            this.type = convertedOperand.type;
            this.attach(this.operand = convertedOperand);
        }
        else if (Predicates.isTypedExpression(operand, isBoundedArrayType, "lvalue")) {
            let convertedOperand = convertToPRValue(operand);
            this.type = convertedOperand.type;
            this.attach(this.operand = convertedOperand);
        }
        else if (Predicates.isTypedExpression(operand, isPointerType)) {
            let convertedOperand = convertToPRValue(operand);
            this.type = convertedOperand.type;
            this.attach(this.operand = convertedOperand);
        }
        else {
            this.addNote(CPPError.expr.unaryPlus.operand(this));
            this.attach(this.operand = operand);
            return;
        }
    }

    public static createFromAST(ast: UnaryPlusExpressionASTNode, context: ExpressionContext): UnaryPlusExpression {
        return new UnaryPlusExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedUnaryPlusExpression<T extends ArithmeticType | PointerType = ArithmeticType | PointerType> extends UnaryPlusExpression, t_TypedExpression {
    readonly type: T;
    readonly operand: TypedExpression<T, "prvalue">;
}

export interface CompiledUnaryPlusExpression<T extends ArithmeticType | PointerType = ArithmeticType | PointerType> extends TypedUnaryPlusExpression<T>, t_CompiledConstruct {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpression<T, "prvalue">;
}

export class RuntimeUnaryPlusExpression<T extends ArithmeticType | PointerType> extends SimpleRuntimeExpression<T, "prvalue", CompiledUnaryPlusExpression<T>> {

    public operand: RuntimeExpression<T, "prvalue">;

    public constructor(model: CompiledUnaryPlusExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.setSubexpressions([this.operand]);
    }

    protected operate() {
        this.setEvalResult(this.operand.evalResult);
    }

}





export class UnaryMinusExpression extends UnaryOperatorExpression<UnaryMinusExpressionASTNode> {
    public readonly construct_type = "unary_minus_expression";

    public readonly type?: ArithmeticType;
    public readonly valueCategory = "prvalue";

    public readonly operand: Expression;

    public readonly operator = "-";

    public constructor(context: ExpressionContext, ast: UnaryMinusExpressionASTNode, operand: Expression) {
        super(context, ast);

        if (!operand.isWellTyped()) {
            this.attach(this.operand = operand);
            return;
        }

        if (Predicates.isTypedExpression(operand, isIntegralType)) {
            let convertedOperand = integralPromotion(convertToPRValue(operand));
            this.type = convertedOperand.type;
            this.attach(this.operand = convertedOperand);
        }
        else if (Predicates.isTypedExpression(operand, isArithmeticType)) {
            let convertedOperand = convertToPRValue(operand);
            this.type = convertedOperand.type;
            this.attach(this.operand = convertedOperand);
        }
        else {
            this.addNote(CPPError.expr.unaryMinus.operand(this));
            this.attach(this.operand = operand);
            return;
        }
    }

    public static createFromAST(ast: UnaryMinusExpressionASTNode, context: ExpressionContext): UnaryMinusExpression {
        return new UnaryMinusExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedUnaryMinusExpression<T extends ArithmeticType = ArithmeticType> extends UnaryMinusExpression, t_TypedExpression {
    readonly type: T;
    readonly operand: TypedExpression<T, "prvalue">;
}

export interface CompiledUnaryMinusExpression<T extends ArithmeticType = ArithmeticType> extends TypedUnaryMinusExpression<T>, t_CompiledConstruct {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpression<T, "prvalue">;
}

export class RuntimeUnaryMinusExpression<T extends ArithmeticType> extends SimpleRuntimeExpression<T, "prvalue", CompiledUnaryMinusExpression<T>> {

    public operand: RuntimeExpression<T, "prvalue">;

    public constructor(model: CompiledUnaryMinusExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.setSubexpressions([this.operand]);
    }

    protected operate() {
        this.setEvalResult(<this["evalResult"]>this.operand.evalResult.arithmeticNegate());
    }

}








export class LogicalNotExpression extends UnaryOperatorExpression<LogicalNotExpressionASTNode> {
    public readonly construct_type = "logical_not_expression";

    public readonly type = Bool.BOOL;
    public readonly valueCategory = "prvalue";

    public readonly operand: Expression;

    public readonly operator = "!";

    public constructor(context: ExpressionContext, ast: LogicalNotExpressionASTNode, operand: Expression) {
        super(context, ast);

        if (!operand.isWellTyped()) {
            this.attach(this.operand = operand);
            return;
        }

        let convertedOperand = standardConversion(operand, Bool.BOOL);

        if (!Predicates.isTypedExpression(convertedOperand, isType(Bool))) {
            this.addNote(CPPError.expr.logicalNot.operand_bool(this, operand));
            this.attach(this.operand = operand);
        }

        this.attach(this.operand = convertedOperand);
    }

    public static createFromAST(ast: LogicalNotExpressionASTNode, context: ExpressionContext): LogicalNotExpression {
        return new LogicalNotExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedLogicalNotExpression extends LogicalNotExpression, t_TypedExpression {
    readonly operand: TypedExpression<Bool, "prvalue">;
}

export interface CompiledLogicalNotExpression extends TypedLogicalNotExpression, t_CompiledConstruct {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpression<Bool, "prvalue">;
}

export class RuntimeLogicalNotExpression extends SimpleRuntimeExpression<Bool, "prvalue", CompiledLogicalNotExpression> {

    public operand: RuntimeExpression<Bool, "prvalue">;

    public constructor(model: CompiledLogicalNotExpression, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.setSubexpressions([this.operand]);
    }

    protected operate() {
        this.setEvalResult(this.operand.evalResult.logicalNot());
    }

}






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

export class SubscriptExpression extends Expression<SubscriptExpressionASTNode> {
    public readonly construct_type = "subscript_expression";

    public readonly type?: CompleteObjectType;
    public readonly valueCategory = "lvalue";

    public readonly operand: Expression;
    public readonly offset: Expression;

    public constructor(context: ExpressionContext, ast: SubscriptExpressionASTNode, operand: Expression, offset: Expression) {
        super(context, ast);

        this.attach(this.operand = operand.isWellTyped() ? convertToPRValue(operand) : operand);
        this.attach(this.offset = offset.isWellTyped() ? standardConversion(offset, Int.INT) : offset);

        if (this.operand.isWellTyped()) {
            if (Predicates.isTypedExpression(this.operand, isPointerType)) {
                if (this.operand.type.isPointerToCompleteType()) {
                    this.type = this.operand.type.ptrTo;
                }
                else {
                    this.addNote(CPPError.expr.subscript.incomplete_element_type(this, this.operand.type));
                }
            }
            else {
                this.addNote(CPPError.expr.subscript.invalid_operand_type(this, this.operand.type));
            }
        }

        if (this.offset.isWellTyped() && !Predicates.isTypedExpression(this.offset, isType(Int))) {
            this.addNote(CPPError.expr.subscript.invalid_offset_type(this, this.offset.type));
        }
    }

    public static createFromAST(ast: SubscriptExpressionASTNode, context: ExpressionContext): SubscriptExpression {
        return new SubscriptExpression(context, ast,
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

export interface TypedSubscriptExpression<T extends CompleteObjectType = CompleteObjectType> extends SubscriptExpression, t_TypedExpression {
    readonly type: T;

    readonly operand: TypedExpression<PointerType<T>, "prvalue">;
}

export interface CompiledSubscriptExpression<T extends CompleteObjectType = CompleteObjectType> extends TypedSubscriptExpression<T>, t_CompiledConstruct {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpression<PointerType<T>, "prvalue">;
    readonly offset: CompiledExpression<Int, "prvalue">;
}

export class RuntimeSubscriptExpression<T extends CompleteObjectType = CompleteObjectType> extends SimpleRuntimeExpression<T, "lvalue", CompiledSubscriptExpression<T>> {

    public operand: RuntimeExpression<PointerType<T>, "prvalue">;
    public offset: RuntimeExpression<Int, "prvalue">;

    public constructor(model: CompiledSubscriptExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
        this.offset = createRuntimeExpression(this.model.offset, this);
        this.setSubexpressions([this.operand, this.offset]);
    }

    protected operate() {

        let operand = <Value<PointerType<T>>>this.operand.evalResult;
        let offset = <Value<Int>>this.offset.evalResult;
        let ptr = operand.pointerOffset(offset);
        let addr = ptr.rawValue;

        if (PointerType.isNegative(addr)) {
            this.sim.eventOccurred(SimulationEvent.CRASH, "Good work. You subscripted so far backwards off the beginning of the array you went to a negative address. -__-", true);
        }
        else if (ptr.type.isArrayPointerType()) {
            // If it's an array pointer, make sure it's in bounds and not one-past
            if (addr < ptr.type.min()) {
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



export class DotExpression extends Expression<DotExpressionASTNode> {
    public readonly construct_type = "dot_expression";

    public readonly type?: PotentiallyCompleteObjectType | FunctionType;
    public readonly valueCategory = "lvalue";

    public readonly operand: Expression;
    public readonly memberName: string;

    public readonly entity?: MemberVariableEntity | FunctionEntity;
    public readonly functionCallReceiver?: ObjectEntity<CompleteClassType>

    public static createFromAST(ast: DotExpressionASTNode, context: ExpressionContext): DotExpression {
        let operand: Expression = createExpressionFromAST(ast.operand, context);
        let receiverContext = operand.type?.isCompleteClassType() ?
            createExpressionContextWithReceiverType(context, operand.type) :
            context;
        return new DotExpression(receiverContext, ast, operand, ast.member.identifier);
    }

    public constructor(context: ExpressionContext, ast: DotExpressionASTNode, operand: Expression, memberName: string) {
        super(context, ast);

        this.attach(this.operand = operand);
        this.memberName = memberName;

        if (!Predicates.isTypedExpression(this.operand, isPotentiallyCompleteClassType)) {
            this.addNote(CPPError.expr.dot.class_type_only(this));
            return;
        }

        if (!Predicates.isTypedExpression(this.operand, isCompleteClassType)) {
            this.addNote(CPPError.expr.dot.incomplete_class_type_prohibited(this));
            return;
        }

        if (this.operand instanceof IdentifierExpression) {
            this.functionCallReceiver = this.operand.getEntity();
        }

        let classType = this.operand.type;

        let entityOrError = entityLookup(this, memberName, classType.classScope, {kind: "normal", noParent: true})
        switch (entityOrError) {
            case "not_found":
                this.addNote(CPPError.expr.dot.no_such_member(this, classType, memberName));
                break;
            case "ambiguous":
                this.addNote(CPPError.expr.dot.ambiguous_member(this, memberName));
                break;
            case "class_found":
                this.addNote(CPPError.expr.dot.class_entity_found(this, memberName));
                break;
            default:
                if (entityOrError.declarationKind === "function") {
                    this.entity = entityOrError;
                }
                else if (entityOrError.variableLocation === "member") {
                    this.entity = entityOrError;
                    
                }
                else {
                    assertFalse("non-member variable found during member access lookup");
                }
                this.entity = entityOrError;
        }

        this.type = peelReference(this.entity?.type);
    }

    public createDefaultOutlet(this: CompiledObjectDotExpression<CompleteObjectType> | CompiledFunctionDotExpression, element: JQuery, parent?: ConstructOutlet) {
        return new DotExpressionOutlet(element, this, parent);
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

export interface TypedObjectDotExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends DotExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: MemberVariableEntity;
    readonly operand: TypedExpression<CompleteClassType>;
}

export interface CompiledObjectDotExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends TypedObjectDotExpression<T>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly operand: CompiledExpression<CompleteClassType>;
}

export interface TypedFunctionDotExpression<T extends FunctionType = FunctionType> extends DotExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: FunctionEntity<T>;
    readonly operand: TypedExpression<CompleteClassType>;
}

export interface CompiledFunctionDotExpression<T extends FunctionType = FunctionType> extends TypedFunctionDotExpression<T>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly operand: CompiledExpression<CompleteClassType>;}

export class RuntimeObjectDotExpression<T extends CompleteObjectType = CompleteObjectType> extends RuntimeExpression<T, "lvalue", CompiledObjectDotExpression<T>> {

    readonly operand: RuntimeExpression<CompleteClassType>;

    public constructor(model: CompiledObjectDotExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
    }

    protected upNextImpl() {
        if (!this.operand.isDone) {
            this.sim.push(this.operand);
        }
        else {
            this.setEvalResult(<VCResultTypes<T, "lvalue">>this.operand.evalResult.getMemberObject(this.model.entity.name)!);
            this.startCleanup();
        }
    }

    protected stepForwardImpl(): void {
        // do nothing
    }
}

export class RuntimeFunctionDotExpression extends RuntimeExpression<FunctionType, "lvalue", CompiledFunctionDotExpression> {

    readonly operand: RuntimeExpression<CompleteClassType>;

    public constructor(model: CompiledFunctionDotExpression, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
    }

    protected upNextImpl() {
        if (!this.operand.isDone) {
            this.sim.push(this.operand);
        }
        else {
            this.setEvalResult(this.model.entity);
            this.startCleanup();
        }
    }

    protected stepForwardImpl(): void {
        // do nothing
    }

    public get contextualReceiver() {
        return this.operand.evalResult ?? super.contextualReceiver;
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

export class ArrowExpression extends Expression<ArrowExpressionASTNode> {
    public readonly construct_type = "arrow_expression";

    public readonly type?: PotentiallyCompleteObjectType | FunctionType;
    public readonly valueCategory = "lvalue";

    public readonly operand: Expression;
    public readonly memberName: string;

    public readonly entity?: MemberVariableEntity | FunctionEntity;
    public readonly functionCallReceiver?: ObjectEntity<CompleteClassType>

    public static createFromAST(ast: ArrowExpressionASTNode, context: ExpressionContext): ArrowExpression {
        let operand: Expression = createExpressionFromAST(ast.operand, context);
        let receiverContext = operand.type?.isPointerType() && operand.type.ptrTo.isCompleteClassType() ?
            createExpressionContextWithReceiverType(context, operand.type.ptrTo) :
            context;
        return new ArrowExpression(receiverContext, ast, operand, ast.member.identifier);
    }

    public constructor(context: ExpressionContext, ast: ArrowExpressionASTNode, operand: Expression, memberName: string) {
        super(context, ast);

        this.attach(this.operand = operand);
        this.memberName = memberName;

        let operandType = this.operand.type;

        if ( ! ( operandType?.isPointerType() && operandType.ptrTo.isPotentiallyCompleteClassType() ) ) {
            this.addNote(CPPError.expr.arrow.class_pointer_type(this));
            return;
        }

        if (!operandType.ptrTo.isCompleteClassType()) {
            this.addNote(CPPError.expr.arrow.incomplete_class_type_prohibited(this));
            return;
        }

        let classType = operandType.ptrTo;

        let entityOrError = entityLookup(this, memberName, classType.classScope, {kind: "normal", noParent: true})
        switch (entityOrError) {
            case "not_found":
                this.addNote(CPPError.expr.arrow.no_such_member(this, classType, memberName));
                break;
            case "ambiguous":
                this.addNote(CPPError.expr.arrow.ambiguous_member(this, memberName));
                break;
            case "class_found":
                this.addNote(CPPError.expr.arrow.class_entity_found(this, memberName));
                break;
            default:
                if (entityOrError.declarationKind === "function") {
                    this.entity = entityOrError;
                }
                else if (entityOrError.variableLocation === "member") {
                    this.entity = entityOrError;
                    
                }
                else {
                    assertFalse("non-member variable found during member access lookup");
                }
                this.entity = entityOrError;
        }

        this.type = peelReference(this.entity?.type);
    }

    public createDefaultOutlet(this: CompiledObjectArrowExpression<CompleteObjectType> | CompiledFunctionArrowExpression, element: JQuery, parent?: ConstructOutlet) {
        return new ArrowExpressionOutlet(element, this, parent);
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

export interface TypedObjectArrowExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends ArrowExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: MemberVariableEntity;
    readonly operand: TypedExpression<PointerType<CompleteClassType>>;
}

export interface CompiledObjectArrowExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends TypedObjectArrowExpression<T>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly operand: CompiledExpression<PointerType<CompleteClassType>>;
}

export interface TypedFunctionArrowExpression<T extends FunctionType = FunctionType> extends ArrowExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: FunctionEntity<T>;
    readonly operand: TypedExpression<PointerType<CompleteClassType>>;
}

export interface CompiledFunctionArrowExpression<T extends FunctionType = FunctionType> extends TypedFunctionArrowExpression<T>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly operand: CompiledExpression<PointerType<CompleteClassType>>;}

export class RuntimeObjectArrowExpression<T extends CompleteObjectType = CompleteObjectType> extends RuntimeExpression<T, "lvalue", CompiledObjectArrowExpression<T>> {

    readonly operand: RuntimeExpression<PointerType<CompleteClassType>>;

    public constructor(model: CompiledObjectArrowExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
    }

    protected upNextImpl() {
        if (!this.operand.isDone) {
            this.sim.push(this.operand);
        }
    }

    protected stepForwardImpl() {

        let evalResult = this.operand.evalResult;
        let addr = evalResult instanceof Value ? evalResult : evalResult.getValue();

        if (PointerType.isNull(addr.rawValue)) {
            this.sim.eventOccurred(SimulationEvent.CRASH, "Ow! Your code just tried to use the arrow operator on a null pointer!", true);
        }

        let obj = this.sim.memory.dereference(addr);
        this.setEvalResult(<VCResultTypes<T, "lvalue">>obj.getMemberObject(this.model.entity.name)!);
        this.startCleanup();
    }
}

export class RuntimeFunctionArrowExpression extends RuntimeExpression<FunctionType, "lvalue", CompiledFunctionArrowExpression> {

    readonly operand: RuntimeExpression<PointerType<CompleteClassType>>;

    private receiverCalledOn?: CPPObject<CompleteClassType>;

    public constructor(model: CompiledFunctionArrowExpression, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
    }

    protected upNextImpl() {
        if (!this.operand.isDone) {
            this.sim.push(this.operand);
        }
    }

    protected stepForwardImpl() {
        let evalResult = this.operand.evalResult;
        let addr = evalResult instanceof Value ? evalResult : evalResult.getValue();

        if (PointerType.isNull(addr.rawValue)) {
            this.sim.eventOccurred(SimulationEvent.CRASH, "Ow! Your code just tried to use the arrow operator on a null pointer!", true);
        }

        this.receiverCalledOn = this.sim.memory.dereference(addr);
        this.setEvalResult(this.model.entity);
        this.startCleanup();
    }

    public get contextualReceiver() {
        return this.receiverCalledOn ?? super.contextualReceiver;
    }
}

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
    readonly operand: ExpressionASTNode;
    readonly member: IdentifierExpressionASTNode;
}

export interface ArrowExpressionASTNode extends ASTNode {
    readonly construct_type: "arrow_expression";
    readonly operand: ExpressionASTNode;
    readonly member: IdentifierExpressionASTNode;
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
export class IdentifierExpression extends Expression<IdentifierExpressionASTNode> {
    public readonly construct_type = "identifier_expression";

    public readonly type?: PotentiallyCompleteObjectType | FunctionType;
    public readonly valueCategory = "lvalue";

    public readonly name: string;

    public readonly entity?: ObjectEntity | BoundReferenceEntity | FunctionEntity;

    // i_createFromAST: function(ast, context){

    //     Identifier._parent.i_createFromAST.apply(this, arguments);
    //     this.identifier = this.ast.identifier;
    //     this.identifierText = qualifiedNameString(this.identifier);
    // },

    public constructor(context: ExpressionContext, ast: IdentifierExpressionASTNode | undefined, name: string) {
        super(context, ast);
        this.name = name;

        checkIdentifier(this, name, this);

        let entityOrError = entityLookup(this, this.name, this.context.contextualScope)
        switch (entityOrError) {
            case "not_found":
                this.addNote(CPPError.iden.not_found(this, this.name));
                break;
            case "ambiguous":
                this.addNote(CPPError.iden.ambiguous(this, this.name));
                break;
            case "class_found":
                this.addNote(CPPError.iden.class_entity_found(this, this.name));
                break;
            default:
                this.entity = entityOrError;
        }

        this.type = peelReference(this.entity?.type);
    }

    public static createFromAST(ast: IdentifierExpressionASTNode, context: ExpressionContext) {
        return new IdentifierExpression(context, ast, ast.identifier);
    }

    
    public getEntity<T extends CompleteObjectType>(this: TypedExpression<T>) : ObjectEntity<T>;
    public getEntity<T extends FunctionType>(this: TypedExpression<T>) : FunctionEntity<T>;
    public getEntity() {
        return this.entity;
    }

    public createDefaultOutlet(this: CompiledObjectIdentifierExpression<CompleteObjectType> | CompiledFunctionIdentifierExpression, element: JQuery, parent?: ConstructOutlet) {
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

type EntityLookupError = "not_found" | "ambiguous" | "class_found";

/**
 * Used as a helper for IdentifierExpression, DotExpression, and ArrowExpression
 * @param scope 
 * @param name 
 * @param expression 
 */
function entityLookup(expression: Expression, name: string, scope: Scope, options: NameLookupOptions = { kind: "normal" }) : VariableEntity | FunctionEntity | EntityLookupError {
    let lookupResult = scope.lookup(name, options);

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
        assertNever(lookupResult);
    }
}

export interface TypedObjectIdentifierExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends IdentifierExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: ObjectEntity<Extract<T, CompleteObjectType>> | BoundReferenceEntity<ReferenceType<T>>;
}

export interface CompiledObjectIdentifierExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends TypedObjectIdentifierExpression<T>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export interface TypedFunctionIdentifierExpression<T extends FunctionType = FunctionType> extends IdentifierExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: FunctionEntity<T>;
}

export interface CompiledFunctionIdentifierExpression<T extends FunctionType = FunctionType> extends TypedFunctionIdentifierExpression<T>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export class RuntimeObjectIdentifierExpression<T extends CompleteObjectType = CompleteObjectType> extends RuntimeExpression<T, "lvalue", CompiledObjectIdentifierExpression<T>> {

    public constructor(model: CompiledObjectIdentifierExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
    }

    protected upNextImpl() {
        this.setEvalResult(<VCResultTypes<T, "lvalue">>runtimeObjectLookup(this.model.entity, this));
        this.startCleanup();
    }

    protected stepForwardImpl(): void {
        // do nothing
    }
}

export class RuntimeFunctionIdentifierExpression extends RuntimeExpression<FunctionType, "lvalue", CompiledFunctionIdentifierExpression> {

    public constructor(model: CompiledFunctionIdentifierExpression, parent: RuntimeConstruct) {
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





function parseCPPChar(litValue: string) {
    return escapeString(litValue).charCodeAt(0);
};

const literalJSParse = {
    "int": parseInt,
    "float": parseFloat,
    "double": parseFloat,
    "bool": (b: boolean) => (b ? 1 : 0),
    "char": parseCPPChar
};

const literalTypes = {
    "int": Int.INT,
    "float": Double.DOUBLE,
    "double": Double.DOUBLE,
    "bool": Bool.BOOL,
    "char": Char.CHAR
};

export function parseNumericLiteralValueFromAST(ast: NumericLiteralASTNode) {
    return literalJSParse[ast.type](<any>ast.value);
}

export type NumericLiteralASTNode = FloatLiteralASTNode | IntLiteralASTNode | CharLiteralASTNode | BoolLiteralASTNode;

export interface FloatLiteralASTNode extends ASTNode {
    readonly construct_type: "numeric_literal_expression";
    readonly type: "float";
    readonly value: number;
}

export interface IntLiteralASTNode extends ASTNode {
    readonly construct_type: "numeric_literal_expression";
    readonly type: "int";
    readonly value: number;
}

export interface CharLiteralASTNode extends ASTNode {
    readonly construct_type: "numeric_literal_expression";
    readonly type: "char";
    readonly value: string;
}

export interface BoolLiteralASTNode extends ASTNode {
    readonly construct_type: "numeric_literal_expression";
    readonly type: "char";
    readonly value: boolean;
}

export class NumericLiteralExpression extends Expression<NumericLiteralASTNode> {
    public readonly construct_type = "numeric_literal_expression";

    public readonly type: ArithmeticType;
    public readonly valueCategory = "prvalue";

    public readonly value: Value<ArithmeticType>;

    // create from ast code:
    // TODO: are there some literal types without conversion functions? There shouldn't be...

    // var conv = literalJSParse[this.ast.type];
    // var val = (conv ? conv(this.ast.value) : this.ast.value);

    public constructor(context: ExpressionContext, ast: NumericLiteralASTNode | undefined, type: ArithmeticType, value: RawValueType) {
        super(context, ast);

        this.type = type;

        this.value = new Value(value, this.type);
    }

    public static createFromAST(ast: NumericLiteralASTNode, context: ExpressionContext) {
        return new NumericLiteralExpression(context, ast, literalTypes[ast.type], parseNumericLiteralValueFromAST(ast));
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

export interface TypedNumericLiteralExpression<T extends ArithmeticType = ArithmeticType> extends NumericLiteralExpression, t_TypedExpression {
    readonly type: T;

}

export interface CompiledNumericLiteralExpression<T extends ArithmeticType = ArithmeticType> extends TypedNumericLiteralExpression<T>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export class RuntimeNumericLiteral<T extends ArithmeticType = ArithmeticType> extends RuntimeExpression<T, "prvalue", CompiledNumericLiteralExpression<T>> {

    public constructor(model: CompiledNumericLiteralExpression<T>, parent: RuntimeConstruct) {
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
    readonly construct_type: "string_literal_expression";
    readonly value: string;
}

export class StringLiteralExpression extends Expression<StringLiteralASTNode> {
    public readonly construct_type = "string_literal_expression";

    public readonly type: BoundedArrayType<Char>;
    public readonly valueCategory = "lvalue";

    public readonly str: string;
    // create from ast code:
    // TODO: are there some literal types without conversion functions? There shouldn't be...

    // var conv = literalJSParse[this.ast.type];
    // var val = (conv ? conv(this.ast.value) : this.ast.value);

    public constructor(context: ExpressionContext, ast: StringLiteralASTNode | undefined, str: string) {
        super(context, ast);
        this.str = str;

        // type is const char
        this.type = new BoundedArrayType(new Char(true), str.length + 1);

        this.context.translationUnit.registerStringLiteral(this);
    }

    public isStringLiteralExpression() {
        return true;
    }

    public static createFromAST(ast: StringLiteralASTNode, context: ExpressionContext) {
        return new StringLiteralExpression(context, ast, ast.value);
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

export interface TypedStringLiteralExpression extends StringLiteralExpression, t_TypedExpression {


}

export interface CompiledStringLiteralExpression extends TypedStringLiteralExpression, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export class RuntimeStringLiteralExpression extends RuntimeExpression<BoundedArrayType<Char>, "lvalue", CompiledStringLiteralExpression> {

    public constructor(model: CompiledStringLiteralExpression, parent: RuntimeConstruct) {
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



export interface ParenthesesExpressionASTNode extends ASTNode {
    readonly construct_type: "parentheses_expression";
    readonly subexpression: ExpressionASTNode;
}

export class ParenthesesExpression extends Expression<ParenthesesExpressionASTNode> {
    public readonly construct_type = "parentheses_expression";

    public readonly type?: ExpressionType;
    public readonly valueCategory?: ValueCategory;

    public readonly subexpression: Expression;

    public constructor(context: ExpressionContext, ast: ParenthesesExpressionASTNode | undefined, subexpression: Expression) {
        super(context, ast);

        this.attach(this.subexpression = subexpression);
        this.type = subexpression.type;
        this.valueCategory = subexpression.valueCategory;

    }

    public static createFromAST(ast: ParenthesesExpressionASTNode, context: ExpressionContext): ParenthesesExpression {
        return new ParenthesesExpression(context, ast, createExpressionFromAST(ast.subexpression, context));
    }

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

export interface TypedParenthesesExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends ParenthesesExpression, t_TypedExpression {
    readonly type: T;
    readonly valueCategory: V;

    readonly subexpression: TypedExpression<T, V>;
}

export interface CompiledParenthesesExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TypedParenthesesExpression<T, V>, t_CompiledConstruct {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly subexpression: CompiledExpression<T, V>;
}

const INDEX_PARENTHESES_SUBEXPRESSIONS = 0;
const INDEX_PARENTHESES_DONE = 1;
export class RuntimeParentheses<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T, V, CompiledParenthesesExpression<T, V>> {

    public subexpression: RuntimeExpression<T, V>;

    private index: typeof INDEX_PARENTHESES_SUBEXPRESSIONS | typeof INDEX_PARENTHESES_DONE = INDEX_PARENTHESES_SUBEXPRESSIONS;

    public constructor(model: CompiledParenthesesExpression<T, V>, parent: RuntimeConstruct) {
        super(model, parent);
        this.subexpression = createRuntimeExpression(this.model.subexpression, this);
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



const AUXILIARY_EXPRESSION_CONTEXT: ExpressionContext = {
    program: <never>undefined,
    translationUnit: <never>undefined,
    contextualScope: <never>undefined
}

export class AuxiliaryExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends Expression<never> {
    public readonly construct_type = "auxiliary_expression";

    public readonly type: T;
    public readonly valueCategory: V;

    constructor(type: T, valueCategory: V) {
        super(AUXILIARY_EXPRESSION_CONTEXT, undefined);
        this.type = type;
        this.valueCategory = valueCategory;
    }

    public createDefaultOutlet(this: CompiledAuxiliaryExpression, element: JQuery, parent?: ConstructOutlet): never {
        throw new Error("Cannot create an outlet for an auxiliary expression. (They should never be used at runtime.)");
    }

    public describeEvalResult(depth: number): never {
        throw new Error("Auxiliary expressions have no description");
    }

}

export interface TypedAuxiliaryExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends AuxiliaryExpression<T, V>, t_TypedExpression {


}

export interface CompiledAuxiliaryExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TypedAuxiliaryExpression<T, V>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}








interface OverloadCandidateResult {
    readonly candidate: FunctionEntity;
    readonly notes: readonly Note[];
}

export interface OverloadResolutionResult<T extends FunctionType> {
    readonly candidates: readonly OverloadCandidateResult[];
    readonly viable: FunctionEntity<T>[];
    readonly selected?: FunctionEntity<T>;
}

// TODO: see if we could move this to another module? Maybe entities.ts?
export function overloadResolution<T extends FunctionType>(candidates: readonly FunctionEntity<T>[], argTypes: readonly (ExpressionType | undefined)[], receiverType?: CompleteClassType): OverloadResolutionResult<T> {

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
    let viable: FunctionEntity<T>[] = [];
    let resultCandidates: readonly OverloadCandidateResult[] = candidates.map((candidate) => {

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
        else {
            argTypes.forEach((argType, i) => {
                if (!argType) {
                    return; // ignore undefined argType, assume it "works" since there will be an error elsewhere already
                }
                let candidateParamType = candidateParamTypes[i];
                if (candidateParamType.isReferenceType()) {
                    // tempArgs.push(args[i]);
                    if (!referenceCompatible(argType, candidateParamType)) {
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

                    if (!sameType(convertedArg.type, candidateParamType)) {
                        notes.push(CPPError.param.paramType(candidate.firstDeclaration, argType, candidateParamType));
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
    }
};

interface MagicFunctionImpl {
    readonly returnType: CompleteObjectType | VoidType;
    readonly valueCategory: ValueCategory;
    readonly paramTypes: readonly PotentialParameterType[];
    readonly operate: (rt: RuntimeMagicFunctionCallExpression) => void;
}

// TODO: add some RNG function?
const MAGIC_FUNCTIONS: { [k in MAGIC_FUNCTION_NAMES]: MagicFunctionImpl } = {
    assert: {
        returnType: VoidType.VOID,
        valueCategory: "prvalue",
        paramTypes: [Bool.BOOL],
        operate: (rt: RuntimeMagicFunctionCallExpression) => {
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
        operate: (rt: RuntimeMagicFunctionCallExpression) => {
            // rt.sim.pause();
        }

    },
    pauseIf: {
        returnType: VoidType.VOID,
        valueCategory: "prvalue",
        paramTypes: [Bool.BOOL],
        operate: (rt: RuntimeMagicFunctionCallExpression) => {
            let arg = <Value<Bool>>rt.args[0].evalResult;
            if (arg) {
                // rt.sim.pause();
            }
        }
    }
}

export class MagicFunctionCallExpression extends Expression<FunctionCallExpressionASTNode> {
    public readonly construct_type = "magic_function_call_expression";

    public readonly type: PeelReference<CompleteReturnType>;
    public readonly valueCategory: ValueCategory;

    public readonly functionName: string;
    public readonly functionImpl: MagicFunctionImpl;
    public readonly args: readonly Expression[];

    public constructor(context: ExpressionContext, ast: FunctionCallExpressionASTNode | undefined, functionName: MAGIC_FUNCTION_NAMES, args: readonly Expression[]) {
        super(context, ast);

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
                if (!referenceCompatible(arg.type, paramType)) {
                    arg.addNote(CPPError.declaration.init.referenceType(this, arg.type, paramType));
                }
                return arg;
            }
            else {
                let convertedArg = standardConversion(arg, paramType);
    
                if (!sameType(convertedArg.type, fn.paramTypes[i])) {
                    arg.addNote(CPPError.declaration.init.convert(arg, convertedArg.type, paramType));
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


type FunctionResultType<RT extends CompleteReturnType> = PeelReference<RT>;
type ReturnTypeVC<RT extends CompleteReturnType> = RT extends ReferenceType ? "lvalue" : "prvalue";

export interface TypedMagicFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends MagicFunctionCallExpression, t_TypedExpression {
    readonly type: T;
    readonly valueCategory: V;
}

export interface CompiledMagicFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends TypedMagicFunctionCallExpression<T, V>, t_CompiledConstruct {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly args: readonly CompiledExpression[];
}

export class RuntimeMagicFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends SimpleRuntimeExpression<T, V, CompiledMagicFunctionCallExpression<T, V>> {

    public args: readonly RuntimeExpression[];

    public constructor(model: CompiledMagicFunctionCallExpression<T,V>, parent: RuntimeConstruct) {
        super(model, parent);
        this.args = this.model.args.map(arg => createRuntimeExpression(arg, this));
        this.setSubexpressions(this.args);
    }

    protected operate() {
        this.model.functionImpl.operate(<RuntimeMagicFunctionCallExpression><unknown>this);
    }

}










// Standard conversions

export abstract class ImplicitConversion<FromType extends CompleteObjectType = CompleteObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends CompleteObjectType = CompleteObjectType, ToVC extends ValueCategory = ValueCategory> extends Expression {
    public readonly construct_type = "ImplicitConversion";

    public readonly from: TypedExpression<FromType, FromVC>;
    public readonly type: ToType;
    public readonly valueCategory: ToVC;

    public readonly conversionLength: number;

    public constructor(from: TypedExpression<FromType, FromVC>, toType: ToType, valueCategory: ToVC) {
        super(from.context, undefined);
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

    public createRuntimeExpression<FromType extends CompleteObjectType, FromVC extends ValueCategory, ToType extends CompleteObjectType, ToVC extends ValueCategory>(this: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct): RuntimeImplicitConversion<FromType, FromVC, ToType, ToVC>;
    public createRuntimeExpression<T extends ExpressionType, V extends ValueCategory>(this: CompiledExpression<T, V>, parent: RuntimeConstruct): never;
    public createRuntimeExpression<FromType extends CompleteObjectType, FromVC extends ValueCategory, ToType extends CompleteObjectType, ToVC extends ValueCategory>(this: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct): RuntimeImplicitConversion<FromType, FromVC, ToType, ToVC> {
        return new RuntimeImplicitConversion(this, parent);
    }

    public abstract operate(fromEvalResult: VCResultTypes<FromType, FromVC>): VCResultTypes<ToType, ToVC>;


    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedImplicitConversion<FromType extends CompleteObjectType = CompleteObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends CompleteObjectType = CompleteObjectType, ToVC extends ValueCategory = ValueCategory> extends ImplicitConversion<FromType, FromVC, ToType, ToVC>, t_TypedExpression {


}

export interface CompiledImplicitConversion<FromType extends CompleteObjectType = CompleteObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends CompleteObjectType = CompleteObjectType, ToVC extends ValueCategory = ValueCategory> extends TypedImplicitConversion<FromType, FromVC, ToType, ToVC>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly from: CompiledExpression<FromType, FromVC>;
}

export class RuntimeImplicitConversion<FromType extends CompleteObjectType = CompleteObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends CompleteObjectType = CompleteObjectType, ToVC extends ValueCategory = ValueCategory>
    extends SimpleRuntimeExpression<ToType, ToVC, CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>> {

    public readonly from: RuntimeExpression<FromType, FromVC>;

    public constructor(model: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct) {
        super(model, parent);
        this.from = createRuntimeExpression(this.model.from, this);
        this.setSubexpressions([this.from]);
    }

    protected operate(): void {
        this.setEvalResult(this.model.operate(this.from.evalResult));
    }
    // isTailChild : function(child){
    //     return {isTail: false,
    //         reason: "An implicit conversion (" + (this.englishName || this._name) + ") takes place after the function call returns."
    //     };
    // }

}

// export type AnalyticImplicitConversion<FromType extends ObjectType = ObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends ObjectType = ObjectType, ToVC extends ValueCategory = ValueCategory> = 
//     LValueToRValueConversion<FromType> |
//     ArrayToPointerConversion |
//     TypeConversion |
//     QualificationConversion;



// Type 1 Conversions
// LValueToRValue, ArrayToPointer, FunctionToPointer


export class LValueToRValueConversion<T extends AtomicType> extends ImplicitConversion<T, "lvalue", T, "prvalue"> {
    // public readonly construct_type = "LValueToRValueConversion";

    public constructor(from: TypedExpression<T, "lvalue">) {
        super(from, from.type.cvUnqualified(), "prvalue");
    }

    public operate(fromEvalResult: VCResultTypes<T, "lvalue">) {
        return <VCResultTypes<T, "prvalue">>fromEvalResult.getValue(); // Cast technically necessary here
        // TODO: add alert if value is invalid
        // e.g. inst.setEvalResult(readValueWithAlert(evalValue, sim, this.from, inst.childInstances.from));
    }

    public createDefaultOutlet(this: CompiledLValueToRValueConversion, element: JQuery, parent?: ConstructOutlet) {
        return new LValueToRValueOutlet(element, this, parent);
    }

    // describeEvalResult : function(depth, sim, inst){
    //     if (inst && inst.evalResult){
    //         return inst.evalResult.describe();
    //     }
    //     else if (depth == 0){
    //         return {message: "the value of " + this.getSourceText()};
    //     }
    //     else{
    //         return {message: "the value of " + this.from.describeEvalResult(depth-1,sim, inst && inst.childInstances && inst.childInstances.from).message};
    //     }
    // },

    // explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //     return {message: "The value of " + this.from.describeEvalResult(0, sim, inst && inst.childInstances && inst.childInstances.from).message + " will be looked up."};
    // }

}
export interface TypedLValueToRValueConversion<T extends AtomicType = AtomicType> extends LValueToRValueConversion<T>, t_TypedExpression {

}

export interface CompiledLValueToRValueConversion<T extends AtomicType = AtomicType> extends TypedLValueToRValueConversion<T>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly from: CompiledExpression<T, "lvalue">; // satisfies CompiledImplicitConversion and LValueToRValue structure
}

export class ArrayToPointerConversion<T extends BoundedArrayType> extends ImplicitConversion<T, "lvalue", PointerType, "prvalue"> {
    // public readonly construct_type = "ArrayToPointerConversion";

    public constructor(from: TypedExpression<T, "lvalue">) {
        super(from, from.type.adjustToPointerType(), "prvalue");
    }

    public operate(fromEvalResult: VCResultTypes<BoundedArrayType, "lvalue">) {
        return new Value(fromEvalResult.address, new ArrayPointerType(fromEvalResult));
    }

    public createDefaultOutlet(this: CompiledArrayToPointerConversion, element: JQuery, parent?: ConstructOutlet) {
        return new ArrayToPointerOutlet(element, this, parent);
    }

    // explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //     return {message: "In this case (and most others), using the name of an array in an expression will yield a the address of its first element. That's what happens here."};
    // }
}

export interface TypedArrayToPointerConversion<T extends BoundedArrayType = BoundedArrayType> extends ArrayToPointerConversion<T>, t_TypedExpression {

}

export interface CompiledArrayToPointerConversion<T extends BoundedArrayType = BoundedArrayType> extends TypedArrayToPointerConversion<T>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly from: CompiledExpression<T, "lvalue">; // satisfies CompiledImplicitConversion and ArrayToPointer structure
}



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
abstract class TypeConversion<FromType extends AtomicType, ToType extends AtomicType>
    extends ImplicitConversion<FromType, "prvalue", ToType, "prvalue"> {

    public constructor(from: TypedExpression<FromType, "prvalue">, toType: ToType) {
        super(from, toType.cvUnqualified(), "prvalue");
    }

    public createDefaultOutlet(this: CompiledTypeConversion, element: JQuery, parent?: ConstructOutlet): TypeConversionOutlet {
        return new TypeConversionOutlet(element, this, parent);
    }

}

export interface TypedTypeConversion<FromType extends AtomicType = AtomicType, ToType extends AtomicType = AtomicType> extends TypeConversion<FromType, ToType>, t_TypedExpression {

}

export interface CompiledTypeConversion<FromType extends AtomicType = AtomicType, ToType extends AtomicType = AtomicType> extends TypedTypeConversion<FromType, ToType>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly from: CompiledExpression<FromType, "prvalue">; // satisfies CompiledImplicitConversion and TypeConversion structure
}

abstract class NoOpTypeConversion<FromType extends AtomicType, ToType extends AtomicType>
    extends TypeConversion<FromType, ToType> {

    public constructor(from: TypedExpression<FromType, "prvalue">, toType: ToType) {
        super(from, toType);
    }

    public operate(fromEvalResult: VCResultTypes<FromType, "prvalue">) {
        return <VCResultTypes<ToType, "prvalue">>new Value(fromEvalResult.rawValue, this.type, fromEvalResult.isValid); // Cast technically necessary here
    }
}

export interface IntegerLiteralZero extends CompiledNumericLiteralExpression {
    readonly type: Int;
    readonly value: Value<Int> & { rawValue: 0 };
}

export class NullPointerConversion<P extends PointerType> extends NoOpTypeConversion<Int, P> {
    // public readonly construct_type = "NullPointerConversion";

    readonly from!: IntegerLiteralZero; // narrows from base type

    public constructor(from: IntegerLiteralZero, toType: P) {
        super(from, toType);
        assert(from.value.rawValue === 0);
    }

}

export interface TypedNullPointerConversion<P extends PointerType> extends NullPointerConversion<P>, t_TypedExpression {
    
}

export interface CompiledNullPointerConversion<P extends PointerType> extends TypedNullPointerConversion<P>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly from: IntegerLiteralZero;
}


export class PointerConversion<FromType extends PointerType, ToType extends PointerType> extends NoOpTypeConversion<FromType, ToType> {
    // public readonly construct_type = "PointerConversion";

}

export interface TypedPointerConversion<FromType extends PointerType, ToType extends PointerType> extends TypedTypeConversion<FromType, ToType> {

}

export interface CompiledPointerConversion<FromType extends PointerType, ToType extends PointerType> extends CompiledTypeConversion<FromType, ToType> {

}

abstract class ToBooleanConversionBase<T extends AtomicType> extends TypeConversion<T, Bool> {

    public constructor(from: TypedExpression<T, "prvalue">) {
        super(from, Bool.BOOL);
    }

    public operate(fromEvalResult: VCResultTypes<T, "prvalue">) {
        return new Value(fromEvalResult.rawValue === 0 ? 0 : 1, Bool.BOOL, fromEvalResult.isValid);
    }
}

export class PointerToBooleanConversion<T extends PointerType> extends ToBooleanConversionBase<T> {
    // public readonly construct_type = "PointerToBooleanConversion";
}
export class FloatingToBooleanConversion<T extends FloatingPointType> extends ToBooleanConversionBase<T> {
    // public readonly construct_type = "FloatingToBooleanConversion";
}
export class IntegralToBooleanConversion<T extends IntegralType> extends ToBooleanConversionBase<T> {
    // public readonly construct_type = "IntegralToBooleanConversion";
}

export class IntegralPromotion<FromType extends IntegralType, ToType extends IntegralType> extends NoOpTypeConversion<FromType, ToType> {
    // public readonly construct_type = "IntegralPromotion";

}

export class IntegralConversion<FromType extends IntegralType, ToType extends IntegralType> extends NoOpTypeConversion<FromType, ToType> {
    // public readonly construct_type = "IntegralConversion";

}


export class FloatingPointPromotion extends NoOpTypeConversion<Float, Double> {
    // public readonly construct_type = "FloatingPointPromotion";
    public constructor(from: TypedExpression<Float, "prvalue">) {
        super(from, Double.DOUBLE);
    }
}

export class FloatingPointConversion<FromType extends FloatingPointType, ToType extends FloatingPointType> extends NoOpTypeConversion<FromType, ToType> {
    // public readonly construct_type = "FloatingPointConversion";

}

export class IntegralToFloatingConversion<FromType extends IntegralType, ToType extends FloatingPointType> extends NoOpTypeConversion<FromType, ToType> {
    // public readonly construct_type = "IntegralToFloatingConversion";

}


export class FloatingToIntegralConversion<T extends FloatingPointType> extends TypeConversion<T, IntegralType> {
    // public readonly construct_type = "FloatingToIntegralConversion";

    public operate(fromEvalResult: VCResultTypes<T, "prvalue">) {
        if (this.type.isType(Bool)) {
            return new Value(fromEvalResult.rawValue === 0 ? 0 : 1, Int.INT, fromEvalResult.isValid);
        }
        return new Value(Math.trunc(fromEvalResult.rawValue), Int.INT, fromEvalResult.isValid);
    }

}


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

export class QualificationConversion<T extends AtomicType = AtomicType> extends ImplicitConversion<T, "prvalue", T, "prvalue"> {
    // public readonly construct_type = "QualificationConversion";

    public constructor(from: TypedExpression<T, "prvalue">, toType: T) {
        super(from, toType, "prvalue");
        assert(similarType(from.type, toType));
    }

    public createDefaultOutlet(this: CompiledQualificationConversion, element: JQuery, parent?: ConstructOutlet) {
        return new QualificationConversionOutlet(element, this, parent);
    }

    public operate(fromEvalResult: VCResultTypes<T, "prvalue">) {
        return <VCResultTypes<T, "prvalue">>fromEvalResult.cvQualified(this.type.isConst, this.type.isVolatile);
    }

}

export interface TypedQualificationConversion<T extends AtomicType = AtomicType> extends QualificationConversion<T>, t_TypedExpression {
}

export interface CompiledQualificationConversion<T extends AtomicType = AtomicType> extends TypedQualificationConversion<T>, t_CompiledConstruct {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly from: CompiledExpression<T, "prvalue">; // satisfies CompiledImplicitConversion and QualificationConversion structure
}

export function convertToPRValue<T extends AtomicType>(from: SpecificTypedExpression<T>): TypedExpression<T, "prvalue">;
export function convertToPRValue<Elem_type extends ArrayElemType>(from: TypedExpression<BoundedArrayType<Elem_type>, "lvalue">): TypedExpression<PointerType<Elem_type>, "prvalue">;
export function convertToPRValue(from: SpecificTypedExpression<PointerType> | TypedExpression<BoundedArrayType, "lvalue">): TypedExpression<PointerType, "prvalue">;
export function convertToPRValue(from: SpecificTypedExpression<AtomicType> | TypedExpression<BoundedArrayType, "lvalue">): TypedExpression<AtomicType, "prvalue">;
export function convertToPRValue(from: TypedExpression): TypedExpression;
export function convertToPRValue(from: any): TypedExpression {

    let analyticFrom = <AnalyticTypedExpression<AnalyticExpression>>from;

    if (Predicates.isTypedExpression(analyticFrom, isBoundedArrayType, "lvalue")) {
        return new ArrayToPointerConversion(analyticFrom);
    }

    if (!Predicates.isTypedExpression(analyticFrom, isAtomicType)) {
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
};

export function typeConversion(from: TypedExpression<PointerType, "prvalue">, toType: Bool): TypedExpression<Bool, "prvalue">;
export function typeConversion(from: TypedExpression<Double, "prvalue">, toType: Float): TypedExpression<Float, "prvalue">;
export function typeConversion(from: TypedExpression<IntegralType, "prvalue">, toType: IntegralType): TypedExpression<IntegralType, "prvalue">;
export function typeConversion(from: TypedExpression<FloatingPointType, "prvalue">, toType: IntegralType): TypedExpression<IntegralType, "prvalue">;
export function typeConversion(from: TypedExpression<IntegralType, "prvalue">, toType: FloatingPointType): TypedExpression<FloatingPointType, "prvalue">;
export function typeConversion(from: TypedExpression<FloatingPointType, "prvalue">, toType: FloatingPointType): TypedExpression<FloatingPointType, "prvalue">;
export function typeConversion<SimilarType extends AtomicType>(from: TypedExpression<SimilarType, "prvalue">, toType: SimilarType): TypedExpression<SimilarType, "prvalue">;
export function typeConversion<FromType extends AtomicType, ToType extends AtomicType>(from: TypedExpression<FromType, "prvalue">, toType: ToType): TypedExpression<FromType, "prvalue"> | TypedExpression<ToType, "prvalue">;
export function typeConversion(from: TypedExpression<AtomicType, "prvalue">, toType: AtomicType) {

    if (similarType(from.type, toType)) {
        return from;
    }

    if (toType.isPointerType() && isIntegerLiteralZero(from)) {
        return new NullPointerConversion(from, toType);
    }

    if (toType.isPointerType() && toType.ptrTo.isPotentiallyCompleteClassType() &&
        Predicates.isTypedExpression(from, isPointerType) && from.type.ptrTo.isPotentiallyCompleteClassType() &&
        subType(from.type.ptrTo, toType.ptrTo)) {
        // Note that cv qualifications on the new destination pointer type don't need to be set, since
        // they are ignored by the PointerConversion anyway (the result is always cv-unqualified).
        // However, we do need to preserve the cv-qualifications on the pointed-to type.
        return new PointerConversion(from, new PointerType(toType.ptrTo.cvQualified(from.type.ptrTo.isConst, from.type.ptrTo.isVolatile)));
    }

    if (toType.isType(Bool)) {
        if (Predicates.isTypedExpression(from, isPointerType)) {
            return new PointerToBooleanConversion(from);
        }
        else if (Predicates.isTypedExpression(from, isFloatingPointType)) {
            return new FloatingToBooleanConversion(from);
        }
        else if (Predicates.isTypedExpression(from, isIntegralType)) {
            return new IntegralToBooleanConversion(from);
        }
    }

    if (toType.isType(Double) && Predicates.isTypedExpression(from, isType(Float))) {
        return new FloatingPointPromotion(from);
    }

    if (toType.isIntegralType()) {
        if (Predicates.isTypedExpression(from, isIntegralType)) {
            return new IntegralConversion(from, toType);
        }
        if (Predicates.isTypedExpression(from, isFloatingPointType)) {
            return new FloatingToIntegralConversion(from, toType);
        }
    }

    if (toType.isFloatingPointType()) {
        if (Predicates.isTypedExpression(from, isIntegralType)) {
            return new IntegralToFloatingConversion(from, toType);
        }
        if (Predicates.isTypedExpression(from, isFloatingPointType)) {
            return new FloatingPointConversion(from, toType);
        }
    }

    return from;
};

export function qualificationConversion(from: TypedExpression<AtomicType, "prvalue">, toType: AtomicType) {

    if (sameType(from.type, toType)) {
        return from;
    }

    if (from.valueCategory === "prvalue" && isCvConvertible(from.type, toType)) {
        return new QualificationConversion(from, toType);
    }

    return from;
};

export interface StandardConversionOptions {
    readonly suppressLTR?: true;
}

/**
 * Attempts to generate a standard conversion sequence of the given expression to the given
 * destination type. 
 * @param from The original expression
 * @param toType The destination type
 * @param options 
 */
export function standardConversion(from: TypedExpression, toType: ExpressionType, options: StandardConversionOptions = {}) {

    // Unless the object is atomic typed or is an array, Lobster currently doesn't support
    // any standard conversions. Note in particular this means user-defined converison functions
    // for class-typed objects are not supported.
    if (!(Predicates.isTypedExpression(from, isAtomicType) || Predicates.isTypedExpression(from, isBoundedArrayType, "lvalue"))) {
        return from;
    }

    if (!toType.isAtomicType()) {
        return from;
    }

    if (!options.suppressLTR) {
        let fromPrvalue = convertToPRValue(from);
        fromPrvalue = typeConversion(fromPrvalue, toType);
        fromPrvalue = qualificationConversion(fromPrvalue, toType);
        return fromPrvalue;
    }

    return from;
};

export function integralPromotion(expr: TypedExpression<IntegralType, "prvalue">) {
    if (Predicates.isTypedExpression(expr, isIntegralType) && !Predicates.isTypedExpression(expr, isType(Int))) {
        return new IntegralPromotion(expr, Int.INT);
    }
    else {
        return expr;
    }
};

export function isIntegerLiteralZero(from: Expression): from is IntegerLiteralZero {
    return from instanceof NumericLiteralExpression && isType(from.type, Int) && from.value.rawValue === 0;
}

export function isConvertibleToPointer(from: Expression): from is SpecificTypedExpression<PointerType> | TypedExpression<BoundedArrayType, "lvalue"> | IntegerLiteralZero {
    if (!from.isWellTyped()) {
        return false;
    }
    return Predicates.isTypedExpression(from, isPointerType) || Predicates.isTypedExpression(from, isBoundedArrayType, "lvalue") || isIntegerLiteralZero(from);
}

export function isConvertible(from: TypedExpression, toType: ExpressionType, options: StandardConversionOptions = {}) {
    let aux = new AuxiliaryExpression(from.type, from.valueCategory);
    let converted = standardConversion(aux, toType, options);
    return sameType(converted.type, toType);
}

export function usualArithmeticConversions(leftOrig: SpecificTypedExpression<ArithmeticType>, rightOrig: SpecificTypedExpression<ArithmeticType>) {

    let left = convertToPRValue(leftOrig);
    let right = convertToPRValue(rightOrig);

    // TODO If either has scoped enumeration type, no conversions are performed

    // TODO If either is long double, the other shall be converted to long double

    // If either is double, the other shall be converted to double
    if (Predicates.isTypedExpression(left, isType(Double))) {
        right = typeConversion(right, Double.DOUBLE);
        return [left, right];
    }
    if (Predicates.isTypedExpression(right, isType(Double))) {
        left = typeConversion(left, Double.DOUBLE);
        return [left, right];
    }
    // If either is float, the other shall be converted to float

    if (Predicates.isTypedExpression(left, isType(Float))) {
        right = typeConversion(right, Float.FLOAT);
        return [left, right];
    }
    if (Predicates.isTypedExpression(right, isType(Float))) {
        left = typeConversion(left, Float.FLOAT);
        return [left, right];
    }

    // Otherwise, do integral promotions
    if (Predicates.isTypedExpression(left, isIntegralType)) {
        left = integralPromotion(left);
    }
    if (Predicates.isTypedExpression(right, isIntegralType)) {
        right = integralPromotion(right);
    }

    // If both operands have the same type, no further conversion is needed
    if (sameType(left.type, right.type)) {
        return [left, right];
    }

    // TODO: Otherwise, if both operands have signed or both have unsigned types,
    // operand with type of lesser integer conversion rank shall be converted
    // to the type of the operand with greater rank
    return [left, right];
}

