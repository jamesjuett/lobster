/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { CPPObject, TemporaryObject } from "./objects";
import { Simulation } from "./Simulation";
import { CompleteObjectType, AtomicType, IntegralType, PointerType, ReferenceType, BoundedArrayType, FunctionType, PotentialReturnType, Bool, VoidType, ArithmeticType, ArrayPointerType, Int, PotentialParameterType, Float, Double, Char, PeelReference, ArrayElemType, FloatingPointType, CompleteClassType, PotentiallyCompleteObjectType, ExpressionType, CompleteReturnType, PointerToCompleteType as PointerToCompleteObjectType, PotentiallyCompleteClassType } from "./types";
import { SuccessfullyCompiled, RuntimeConstruct, ExpressionContext, ConstructDescription, SemanticContext } from "./constructs";
import { AnythingConstructASTNode } from "../ast/ASTNode";
import { Note } from "./errors";
import { FunctionEntity, ObjectEntity, VariableEntity, MemberVariableEntity, BoundReferenceEntity, DeclaredScopeEntry, TemporaryObjectEntity } from "./entities";
import { Value, RawValueType } from "./runtimeEnvironment";
import { MAGIC_FUNCTION_NAMES, LexicalIdentifier } from "./lexical";
import { FunctionCallExpression, TypedFunctionCallExpression, CompiledFunctionCallExpression, RuntimeFunctionCallExpression } from "./FunctionCallExpression";
import { RuntimeExpression, VCResultTypes, ValueCategory, Expression, CompiledExpression, TypedExpression, SpecificTypedExpression, t_TypedExpression } from "./expressionBase";
import { ConstructOutlet, TernaryExpressionOutlet, CommaExpressionOutlet, AssignmentExpressionOutlet, BinaryOperatorExpressionOutlet, UnaryOperatorExpressionOutlet, SubscriptExpressionOutlet, IdentifierOutlet, NumericLiteralOutlet, ParenthesesOutlet, MagicFunctionCallExpressionOutlet, StringLiteralExpressionOutlet, LValueToRValueOutlet, ArrayToPointerOutlet, TypeConversionOutlet, QualificationConversionOutlet, DotExpressionOutlet, ArrowExpressionOutlet, OutputOperatorExpressionOutlet, PostfixIncrementExpressionOutlet, InputOperatorExpressionOutlet, StreamToBoolOutlet, NonMemberOperatorOverloadExpressionOutlet, MemberOperatorOverloadExpressionOutlet, InitializerListOutlet as InitializerListExpressionOutlet, CompoundAssignmentExpressionOutlet, ThisExpressionOutlet, NullptrExpressionOutlet } from "../view/codeOutlets";
import { AnalyticConstruct } from "./predicates";
import { OpaqueExpression, RuntimeOpaqueExpression, TypedOpaqueExpression, CompiledOpaqueExpression } from "./opaqueExpression";
import { CompiledTemporaryDeallocator } from "./PotentialFullExpression";
import { CompiledFunctionCall, FunctionCall, RuntimeFunctionCall, TypedFunctionCall } from "./FunctionCall";
import { DeleteExpression, NewExpression, TypedNewExpression, TypedDeleteExpression, CompiledNewExpression, CompiledDeleteExpression, RuntimeNewExpression, RuntimeDeleteExpression, NewObjectType, NewArrayExpression, CompiledNewArrayExpression, RuntimeNewArrayExpression, TypedNewArrayExpression, DeleteArrayExpression, CompiledDeleteArrayExpression, RuntimeDeleteArrayExpression, TypedDeleteArrayExpression } from "./new_delete";
import { AddressOfExpressionASTNode, ArithmeticBinaryOperatorExpressionASTNode, ArrowExpressionASTNode, AssignmentExpressionASTNode, BinaryOperatorExpressionASTNode, BitwiseNotExpressionASTNode, CommaASTNode, CompoundAssignmentExpressionASTNode, ConstCastExpressionASTNode, ConstructExpressionASTNode, CStyleCastExpressionASTNode, DeleteArrayExpressionASTNode, DeleteExpressionASTNode, DereferenceExpressionASTNode, DotExpressionASTNode, DynamicCastExpressionASTNode, ExpressionASTNode, FunctionCallExpressionASTNode, IdentifierExpressionASTNode, InitializerListExpressionASTNode, LogicalBinaryOperatorExpressionASTNode, LogicalNotExpressionASTNode, NewExpressionASTNode, NullptrExpressionASTNode, NumericLiteralASTNode, OpaqueExpressionASTNode, ParenthesesExpressionASTNode, PointerToMemberExpressionASTNode, PostfixIncrementExpressionASTNode, PrefixIncrementExpressionASTNode, ReinterpretCastExpressionASTNode, RelationalBinaryOperatorExpressionASTNode, SizeofExpressionASTNode, SizeofTypeExpressionASTNode, StaticCastExpressionASTNode, StringLiteralASTNode, SubscriptExpressionASTNode, TernaryASTNode, ThisExpressionASTNode, t_ArithmeticBinaryOperators, t_BinaryOperators, t_CompoundAssignmentOperators, t_LogicalBinaryOperators, t_RelationalBinaryOperators, t_UnaryOperators, UnaryMinusExpressionASTNode, UnaryOperatorExpressionASTNode, UnaryPlusExpressionASTNode } from "../ast/ast_expressions";
export declare function readValueWithAlert(obj: CPPObject<AtomicType>, sim: Simulation): Value<AtomicType>;
declare const ExpressionConstructsMap: {
    comma_expression: (ast: CommaASTNode, context: ExpressionContext) => CommaExpression;
    ternary_expression: (ast: TernaryASTNode, context: ExpressionContext) => TernaryExpression;
    assignment_expression: (ast: AssignmentExpressionASTNode, context: ExpressionContext) => OperatorOverloadExpression | AssignmentExpression;
    compound_assignment_expression: (ast: CompoundAssignmentExpressionASTNode, context: ExpressionContext) => OperatorOverloadExpression | CompoundAssignmentExpression;
    arithmetic_binary_operator_expression: (ast: ArithmeticBinaryOperatorExpressionASTNode, context: ExpressionContext) => OperatorOverloadExpression | ArithmeticBinaryOperatorExpression | PointerDifferenceExpression | PointerOffsetExpression | OutputOperatorExpression | InputOperatorExpression;
    relational_binary_operator_expression: (ast: RelationalBinaryOperatorExpressionASTNode, context: ExpressionContext) => OperatorOverloadExpression | RelationalBinaryOperatorExpression | PointerComparisonExpression;
    logical_binary_operator_expression: (ast: LogicalBinaryOperatorExpressionASTNode, context: ExpressionContext) => OperatorOverloadExpression | LogicalBinaryOperatorExpression;
    pointer_to_member_expression: (ast: PointerToMemberExpressionASTNode, context: ExpressionContext) => UnsupportedExpression;
    c_style_cast_expression: (ast: CStyleCastExpressionASTNode, context: ExpressionContext) => UnsupportedExpression;
    prefix_increment_expression: (ast: PrefixIncrementExpressionASTNode, context: ExpressionContext) => PrefixIncrementExpression;
    dereference_expression: (ast: DereferenceExpressionASTNode, context: ExpressionContext) => DereferenceExpression;
    address_of_expression: (ast: AddressOfExpressionASTNode, context: ExpressionContext) => AddressOfExpression;
    unary_plus_expression: (ast: UnaryPlusExpressionASTNode, context: ExpressionContext) => UnaryPlusExpression;
    unary_minus_expression: (ast: UnaryMinusExpressionASTNode, context: ExpressionContext) => UnaryMinusExpression;
    logical_not_expression: (ast: LogicalNotExpressionASTNode, context: ExpressionContext) => LogicalNotExpression;
    bitwise_not_expression: (ast: BitwiseNotExpressionASTNode, context: ExpressionContext) => UnsupportedExpression;
    sizeof_expression: (ast: SizeofExpressionASTNode, context: ExpressionContext) => UnsupportedExpression;
    sizeof_type_expression: (ast: SizeofTypeExpressionASTNode, context: ExpressionContext) => UnsupportedExpression;
    new_expression: (ast: NewExpressionASTNode, context: ExpressionContext) => NewExpression | NewArrayExpression;
    delete_expression: (ast: DeleteExpressionASTNode, context: ExpressionContext) => DeleteExpression;
    delete_array_expression: (ast: DeleteArrayExpressionASTNode, context: ExpressionContext) => DeleteArrayExpression;
    static_cast_expression: (ast: StaticCastExpressionASTNode, context: ExpressionContext) => UnsupportedExpression;
    dynamic_cast_expression: (ast: DynamicCastExpressionASTNode, context: ExpressionContext) => UnsupportedExpression;
    reinterpret_cast_expression: (ast: ReinterpretCastExpressionASTNode, context: ExpressionContext) => UnsupportedExpression;
    const_cast_expression: (ast: ConstCastExpressionASTNode, context: ExpressionContext) => UnsupportedExpression;
    subscript_expression: (ast: SubscriptExpressionASTNode, context: ExpressionContext) => OperatorOverloadExpression | SubscriptExpression;
    function_call_expression: (ast: FunctionCallExpressionASTNode, context: ExpressionContext) => FunctionCallExpression | MagicFunctionCallExpression;
    dot_expression: (ast: DotExpressionASTNode, context: ExpressionContext) => DotExpression;
    arrow_expression: (ast: ArrowExpressionASTNode, context: ExpressionContext) => ArrowExpression;
    postfix_increment_expression: (ast: PostfixIncrementExpressionASTNode, context: ExpressionContext) => PostfixIncrementExpression;
    construct_expression: (ast: ConstructExpressionASTNode, context: ExpressionContext) => UnsupportedExpression;
    identifier_expression: (ast: IdentifierExpressionASTNode, context: ExpressionContext) => IdentifierExpression;
    this_expression: (ast: ThisExpressionASTNode, context: ExpressionContext) => ThisExpression;
    nullptr_expression: (ast: NullptrExpressionASTNode, context: ExpressionContext) => NullptrExpression;
    numeric_literal_expression: (ast: NumericLiteralASTNode, context: ExpressionContext) => NumericLiteralExpression;
    string_literal_expression: (ast: StringLiteralASTNode, context: ExpressionContext) => StringLiteralExpression;
    parentheses_expression: (ast: ParenthesesExpressionASTNode, context: ExpressionContext) => ParenthesesExpression;
    initializer_list_expression: (ast: InitializerListExpressionASTNode, context: ExpressionContext) => InitializerListExpression;
    opaque_expression: (ast: OpaqueExpressionASTNode, context: ExpressionContext) => OpaqueExpression<ExpressionType, ValueCategory>;
    anything_construct: (ast: AnythingConstructASTNode, context: ExpressionContext) => AnythingExpression;
};
/**
 * Creates an expression construct based on a given expression AST node.
 * If the `ast` argument has a union type that is a subtype of `ExpressionASTNode`,
 * this function's return type is inferred as corresponding union of construct types.
 * @param ast An expression AST node.
 * @param context The context in which this expression occurs.
 */
export declare function createExpressionFromAST<ASTType extends ExpressionASTNode>(ast: ASTType, context: ExpressionContext): ReturnType<(typeof ExpressionConstructsMap)[ASTType["construct_type"]]>;
export declare type AnalyticExpression = OperatorOverloadExpression | CommaExpression | TernaryExpression | AssignmentExpression | CompoundAssignmentExpression | AnalyticBinaryOperatorExpression | AnalyticUnaryOperatorExpression | NewExpression | NewArrayExpression | DeleteExpression | DeleteArrayExpression | PostfixIncrementExpression | SubscriptExpression | DotExpression | ArrowExpression | FunctionCallExpression | IdentifierExpression | ThisExpression | NullptrExpression | NumericLiteralExpression | StringLiteralExpression | ParenthesesExpression | InitializerListExpression | OpaqueExpression | MagicFunctionCallExpression | AuxiliaryExpression | UnsupportedExpression | ImplicitConversion;
export declare type TypedExpressionKinds<T extends ExpressionType, V extends ValueCategory> = {
    "unsupported_expression": never;
    "anything_construct": never;
    "invalid_operator_overload_expression": never;
    "comma_expression": T extends NonNullable<TypedCommaExpression["type"]> ? V extends NonNullable<TypedCommaExpression["valueCategory"]> ? TypedCommaExpression<T, V> : never : NonNullable<TypedCommaExpression["type"]> extends T ? V extends NonNullable<TypedCommaExpression["valueCategory"]> ? TypedCommaExpression : never : never;
    "ternary_expression": T extends NonNullable<TypedTernaryExpression["type"]> ? V extends NonNullable<TypedTernaryExpression["valueCategory"]> ? TypedTernaryExpression<T, V> : never : NonNullable<TypedTernaryExpression["type"]> extends T ? V extends NonNullable<TypedTernaryExpression["valueCategory"]> ? TypedTernaryExpression : never : never;
    "assignment_expression": T extends NonNullable<TypedAssignmentExpression["type"]> ? V extends NonNullable<TypedAssignmentExpression["valueCategory"]> ? TypedAssignmentExpression<T> : never : NonNullable<TypedAssignmentExpression["type"]> extends T ? V extends NonNullable<TypedAssignmentExpression["valueCategory"]> ? TypedAssignmentExpression : never : never;
    "compound_assignment_expression": T extends NonNullable<TypedCompoundAssignmentExpression["type"]> ? V extends NonNullable<TypedCompoundAssignmentExpression["valueCategory"]> ? TypedCompoundAssignmentExpression<T> : never : NonNullable<TypedCompoundAssignmentExpression["type"]> extends T ? V extends NonNullable<TypedCompoundAssignmentExpression["valueCategory"]> ? TypedCompoundAssignmentExpression : never : never;
    "arithmetic_binary_operator_expression": T extends NonNullable<TypedArithmeticBinaryOperatorExpression["type"]> ? V extends NonNullable<TypedArithmeticBinaryOperatorExpression["valueCategory"]> ? TypedArithmeticBinaryOperatorExpression<T> : never : NonNullable<TypedArithmeticBinaryOperatorExpression["type"]> extends T ? V extends NonNullable<TypedArithmeticBinaryOperatorExpression["valueCategory"]> ? TypedArithmeticBinaryOperatorExpression<ArithmeticType> : never : never;
    "pointer_difference_expression": T extends NonNullable<TypedPointerDifferenceExpression["type"]> ? V extends NonNullable<TypedPointerDifferenceExpression["valueCategory"]> ? TypedPointerDifferenceExpression : never : NonNullable<TypedPointerDifferenceExpression["type"]> extends T ? V extends NonNullable<TypedPointerDifferenceExpression["valueCategory"]> ? TypedPointerDifferenceExpression : never : never;
    "pointer_offset_expression": T extends NonNullable<TypedPointerOffsetExpression["type"]> ? V extends NonNullable<TypedPointerOffsetExpression["valueCategory"]> ? TypedPointerOffsetExpression<T> : never : NonNullable<TypedPointerOffsetExpression["type"]> extends T ? V extends NonNullable<TypedPointerOffsetExpression["valueCategory"]> ? TypedPointerOffsetExpression : never : never;
    "output_operator_expression": T extends NonNullable<TypedOutputOperatorExpression["type"]> ? V extends NonNullable<TypedOutputOperatorExpression["valueCategory"]> ? TypedOutputOperatorExpression : never : NonNullable<TypedOutputOperatorExpression["type"]> extends T ? V extends NonNullable<TypedOutputOperatorExpression["valueCategory"]> ? TypedOutputOperatorExpression : never : never;
    "input_operator_expression": T extends NonNullable<TypedInputOperatorExpression["type"]> ? V extends NonNullable<TypedInputOperatorExpression["valueCategory"]> ? TypedInputOperatorExpression : never : NonNullable<TypedInputOperatorExpression["type"]> extends T ? V extends NonNullable<TypedInputOperatorExpression["valueCategory"]> ? TypedInputOperatorExpression : never : never;
    "relational_binary_operator_expression": T extends NonNullable<TypedRelationalBinaryOperatorExpression["type"]> ? V extends NonNullable<TypedRelationalBinaryOperatorExpression["valueCategory"]> ? TypedRelationalBinaryOperatorExpression : never : NonNullable<TypedRelationalBinaryOperatorExpression["type"]> extends T ? V extends NonNullable<TypedRelationalBinaryOperatorExpression["valueCategory"]> ? TypedRelationalBinaryOperatorExpression : never : never;
    "pointer_comparison_expression": T extends NonNullable<TypedPointerComparisonExpression["type"]> ? V extends NonNullable<TypedPointerComparisonExpression["valueCategory"]> ? TypedPointerComparisonExpression : never : NonNullable<TypedPointerComparisonExpression["type"]> extends T ? V extends NonNullable<TypedPointerComparisonExpression["valueCategory"]> ? TypedPointerComparisonExpression : never : never;
    "logical_binary_operator_expression": T extends NonNullable<TypedLogicalBinaryOperatorExpression["type"]> ? V extends NonNullable<TypedLogicalBinaryOperatorExpression["valueCategory"]> ? TypedLogicalBinaryOperatorExpression : never : NonNullable<TypedLogicalBinaryOperatorExpression["type"]> extends T ? V extends NonNullable<TypedLogicalBinaryOperatorExpression["valueCategory"]> ? TypedLogicalBinaryOperatorExpression : never : never;
    "non_member_operator_overload_expression": T extends NonNullable<TypedNonMemberOperatorOverloadExpression["type"]> ? V extends NonNullable<TypedNonMemberOperatorOverloadExpression["valueCategory"]> ? TypedNonMemberOperatorOverloadExpression<T, V> : never : NonNullable<TypedNonMemberOperatorOverloadExpression["type"]> extends T ? V extends NonNullable<TypedNonMemberOperatorOverloadExpression["valueCategory"]> ? TypedNonMemberOperatorOverloadExpression : never : never;
    "member_operator_overload_expression": T extends NonNullable<TypedMemberOperatorOverloadExpression["type"]> ? V extends NonNullable<TypedMemberOperatorOverloadExpression["valueCategory"]> ? TypedMemberOperatorOverloadExpression<T, V> : never : NonNullable<TypedMemberOperatorOverloadExpression["type"]> extends T ? V extends NonNullable<TypedMemberOperatorOverloadExpression["valueCategory"]> ? TypedMemberOperatorOverloadExpression : never : never;
    "prefix_increment_expression": T extends NonNullable<TypedPrefixIncrementExpression["type"]> ? V extends NonNullable<TypedPrefixIncrementExpression["valueCategory"]> ? TypedPrefixIncrementExpression<T> : never : NonNullable<TypedPrefixIncrementExpression["type"]> extends T ? V extends NonNullable<TypedPrefixIncrementExpression["valueCategory"]> ? TypedPrefixIncrementExpression : never : never;
    "dereference_expression": T extends NonNullable<TypedDereferenceExpression["type"]> ? V extends NonNullable<TypedDereferenceExpression["valueCategory"]> ? TypedDereferenceExpression<T> : never : NonNullable<TypedDereferenceExpression["type"]> extends T ? V extends NonNullable<TypedDereferenceExpression["valueCategory"]> ? TypedDereferenceExpression : never : never;
    "address_of_expression": T extends NonNullable<TypedAddressOfExpression["type"]> ? V extends NonNullable<TypedAddressOfExpression["valueCategory"]> ? TypedAddressOfExpression<T> : never : NonNullable<TypedAddressOfExpression["type"]> extends T ? V extends NonNullable<TypedAddressOfExpression["valueCategory"]> ? TypedAddressOfExpression : never : never;
    "new_expression": T extends NonNullable<TypedNewExpression["type"]> ? V extends NonNullable<TypedNewExpression["valueCategory"]> ? TypedNewExpression<T> : never : NonNullable<TypedNewExpression["type"]> extends T ? V extends NonNullable<TypedNewExpression["valueCategory"]> ? TypedNewExpression : never : never;
    "new_array_expression": T extends NonNullable<TypedNewArrayExpression["type"]> ? V extends NonNullable<TypedNewArrayExpression["valueCategory"]> ? TypedNewArrayExpression<T> : never : NonNullable<TypedNewArrayExpression["type"]> extends T ? V extends NonNullable<TypedNewArrayExpression["valueCategory"]> ? TypedNewArrayExpression : never : never;
    "delete_expression": T extends NonNullable<TypedDeleteExpression["type"]> ? V extends NonNullable<TypedDeleteExpression["valueCategory"]> ? TypedDeleteExpression : never : NonNullable<TypedDeleteExpression["type"]> extends T ? V extends NonNullable<TypedDeleteExpression["valueCategory"]> ? TypedDeleteExpression : never : never;
    "delete_array_expression": T extends NonNullable<TypedDeleteArrayExpression["type"]> ? V extends NonNullable<TypedDeleteArrayExpression["valueCategory"]> ? TypedDeleteArrayExpression : never : NonNullable<TypedDeleteArrayExpression["type"]> extends T ? V extends NonNullable<TypedDeleteArrayExpression["valueCategory"]> ? TypedDeleteArrayExpression : never : never;
    "this_expression": T extends NonNullable<TypedThisExpression["type"]> ? V extends NonNullable<TypedThisExpression["valueCategory"]> ? TypedThisExpression<T> : never : NonNullable<TypedThisExpression["type"]> extends T ? V extends NonNullable<TypedThisExpression["valueCategory"]> ? TypedThisExpression : never : never;
    "nullptr_expression": T extends NonNullable<TypedNullptrExpression["type"]> ? V extends NonNullable<TypedNullptrExpression["valueCategory"]> ? TypedNullptrExpression : never : NonNullable<TypedNullptrExpression["type"]> extends T ? V extends NonNullable<TypedNullptrExpression["valueCategory"]> ? TypedNullptrExpression : never : never;
    "unary_plus_expression": T extends NonNullable<TypedUnaryPlusExpression["type"]> ? V extends NonNullable<TypedUnaryPlusExpression["valueCategory"]> ? TypedUnaryPlusExpression<T> : never : NonNullable<TypedUnaryPlusExpression["type"]> extends T ? V extends NonNullable<TypedUnaryPlusExpression["valueCategory"]> ? TypedUnaryPlusExpression : never : never;
    "unary_minus_expression": T extends NonNullable<TypedUnaryMinusExpression["type"]> ? V extends NonNullable<TypedUnaryMinusExpression["valueCategory"]> ? TypedUnaryMinusExpression<T> : never : NonNullable<TypedUnaryMinusExpression["type"]> extends T ? V extends NonNullable<TypedUnaryMinusExpression["valueCategory"]> ? TypedUnaryMinusExpression : never : never;
    "logical_not_expression": T extends NonNullable<TypedLogicalNotExpression["type"]> ? V extends NonNullable<TypedLogicalNotExpression["valueCategory"]> ? TypedLogicalNotExpression : never : NonNullable<TypedLogicalNotExpression["type"]> extends T ? V extends NonNullable<TypedLogicalNotExpression["valueCategory"]> ? TypedLogicalNotExpression : never : never;
    "postfix_increment_expression": T extends NonNullable<TypedPostfixIncrementExpression["type"]> ? V extends NonNullable<TypedPostfixIncrementExpression["valueCategory"]> ? TypedPostfixIncrementExpression<T> : never : NonNullable<TypedPostfixIncrementExpression["type"]> extends T ? V extends NonNullable<TypedPostfixIncrementExpression["valueCategory"]> ? TypedPostfixIncrementExpression : never : never;
    "subscript_expression": T extends NonNullable<TypedSubscriptExpression["type"]> ? V extends NonNullable<TypedSubscriptExpression["valueCategory"]> ? TypedSubscriptExpression<T> : never : NonNullable<TypedSubscriptExpression["type"]> extends T ? V extends NonNullable<TypedSubscriptExpression["valueCategory"]> ? TypedSubscriptExpression : never : never;
    "dot_expression": V extends NonNullable<DotExpression["valueCategory"]> ? (T extends CompleteObjectType ? TypedObjectDotExpression<T> : T extends FunctionType ? TypedFunctionDotExpression<T> : CompleteObjectType extends T ? FunctionType extends T ? TypedObjectDotExpression | TypedFunctionDotExpression : never : never) : never;
    "arrow_expression": V extends NonNullable<ArrowExpression["valueCategory"]> ? (T extends CompleteObjectType ? TypedObjectArrowExpression<T> : T extends FunctionType ? TypedFunctionArrowExpression<T> : CompleteObjectType extends T ? FunctionType extends T ? TypedObjectArrowExpression | TypedFunctionArrowExpression : never : never) : never;
    "identifier_expression": V extends NonNullable<IdentifierExpression["valueCategory"]> ? (T extends CompleteObjectType ? TypedObjectIdentifierExpression<T> : T extends FunctionType ? TypedFunctionIdentifierExpression<T> : CompleteObjectType extends T ? FunctionType extends T ? TypedObjectIdentifierExpression | TypedFunctionIdentifierExpression : never : never) : never;
    "numeric_literal_expression": T extends NonNullable<TypedNumericLiteralExpression["type"]> ? V extends NonNullable<TypedNumericLiteralExpression["valueCategory"]> ? TypedNumericLiteralExpression<T> : never : NonNullable<TypedNumericLiteralExpression["type"]> extends T ? V extends NonNullable<TypedNumericLiteralExpression["valueCategory"]> ? TypedNumericLiteralExpression : never : never;
    "string_literal_expression": T extends NonNullable<TypedStringLiteralExpression["type"]> ? V extends NonNullable<TypedStringLiteralExpression["valueCategory"]> ? TypedStringLiteralExpression : never : NonNullable<TypedStringLiteralExpression["type"]> extends T ? V extends NonNullable<TypedStringLiteralExpression["valueCategory"]> ? TypedStringLiteralExpression : never : never;
    "parentheses_expression": T extends NonNullable<TypedParenthesesExpression["type"]> ? V extends NonNullable<TypedParenthesesExpression["valueCategory"]> ? TypedParenthesesExpression<T, V> : never : NonNullable<TypedParenthesesExpression["type"]> extends T ? V extends NonNullable<TypedParenthesesExpression["valueCategory"]> ? TypedParenthesesExpression : never : never;
    "initializer_list_expression": T extends NonNullable<TypedInitializerListExpression["type"]> ? V extends NonNullable<TypedInitializerListExpression["valueCategory"]> ? TypedInitializerListExpression<T> : never : NonNullable<TypedInitializerListExpression["type"]> extends T ? V extends NonNullable<TypedInitializerListExpression["valueCategory"]> ? TypedInitializerListExpression : never : never;
    "opaque_expression": T extends NonNullable<TypedOpaqueExpression["type"]> ? V extends NonNullable<TypedOpaqueExpression["valueCategory"]> ? TypedOpaqueExpression<T, V> : never : NonNullable<TypedOpaqueExpression["type"]> extends T ? V extends NonNullable<TypedOpaqueExpression["valueCategory"]> ? TypedOpaqueExpression : never : never;
    "auxiliary_expression": T extends NonNullable<TypedAuxiliaryExpression["type"]> ? V extends NonNullable<TypedAuxiliaryExpression["valueCategory"]> ? TypedAuxiliaryExpression<T, V> : never : NonNullable<TypedAuxiliaryExpression["type"]> extends T ? V extends NonNullable<TypedAuxiliaryExpression["valueCategory"]> ? TypedAuxiliaryExpression : never : never;
    "magic_function_call_expression": T extends NonNullable<TypedMagicFunctionCallExpression["type"]> ? V extends NonNullable<TypedMagicFunctionCallExpression["valueCategory"]> ? TypedMagicFunctionCallExpression<T, V> : never : NonNullable<TypedMagicFunctionCallExpression["type"]> extends T ? V extends NonNullable<TypedMagicFunctionCallExpression["valueCategory"]> ? TypedMagicFunctionCallExpression : never : never;
    "function_call_expression": T extends NonNullable<TypedFunctionCallExpression["type"]> ? V extends NonNullable<TypedFunctionCallExpression["valueCategory"]> ? TypedFunctionCallExpression<T, V> : never : NonNullable<TypedFunctionCallExpression["type"]> extends T ? V extends NonNullable<TypedFunctionCallExpression["valueCategory"]> ? TypedFunctionCallExpression : never : never;
    "ImplicitConversion": T extends NonNullable<TypedImplicitConversion["type"]> ? V extends NonNullable<TypedImplicitConversion["valueCategory"]> ? TypedImplicitConversion<CompleteObjectType, ValueCategory, T, V> : never : NonNullable<TypedImplicitConversion["type"]> extends T ? V extends NonNullable<TypedImplicitConversion["valueCategory"]> ? TypedImplicitConversion : never : never;
};
export declare type CompiledExpressionKinds<T extends ExpressionType, V extends ValueCategory> = {
    "unsupported_expression": never;
    "anything_construct": never;
    "invalid_operator_overload_expression": never;
    "comma_expression": T extends NonNullable<CompiledCommaExpression["type"]> ? V extends NonNullable<CompiledCommaExpression["valueCategory"]> ? CompiledCommaExpression<T, V> : never : never;
    "ternary_expression": T extends NonNullable<CompiledTernaryExpression["type"]> ? V extends NonNullable<CompiledTernaryExpression["valueCategory"]> ? CompiledTernaryExpression<T, V> : never : never;
    "assignment_expression": T extends NonNullable<CompiledAssignmentExpression["type"]> ? V extends NonNullable<CompiledAssignmentExpression["valueCategory"]> ? CompiledAssignmentExpression<T> : never : never;
    "compound_assignment_expression": T extends NonNullable<CompiledCompoundAssignmentExpression["type"]> ? V extends NonNullable<CompiledCompoundAssignmentExpression["valueCategory"]> ? CompiledCompoundAssignmentExpression<T> : never : never;
    "arithmetic_binary_operator_expression": T extends NonNullable<CompiledArithmeticBinaryOperatorExpression["type"]> ? V extends NonNullable<CompiledArithmeticBinaryOperatorExpression["valueCategory"]> ? CompiledArithmeticBinaryOperatorExpression<T> : never : NonNullable<ArithmeticBinaryOperatorExpression["type"]> extends T ? V extends NonNullable<CompiledArithmeticBinaryOperatorExpression["valueCategory"]> ? CompiledArithmeticBinaryOperatorExpression<ArithmeticType> : never : never;
    "pointer_difference_expression": T extends NonNullable<CompiledPointerDifferenceExpression["type"]> ? V extends NonNullable<CompiledPointerDifferenceExpression["valueCategory"]> ? CompiledPointerDifferenceExpression : never : never;
    "pointer_offset_expression": T extends NonNullable<CompiledPointerOffsetExpression["type"]> ? V extends NonNullable<CompiledPointerOffsetExpression["valueCategory"]> ? CompiledPointerOffsetExpression<T> : never : never;
    "output_operator_expression": T extends NonNullable<CompiledOutputOperatorExpression["type"]> ? V extends NonNullable<CompiledOutputOperatorExpression["valueCategory"]> ? CompiledOutputOperatorExpression : never : never;
    "input_operator_expression": T extends NonNullable<CompiledInputOperatorExpression["type"]> ? V extends NonNullable<CompiledInputOperatorExpression["valueCategory"]> ? CompiledInputOperatorExpression : never : never;
    "relational_binary_operator_expression": T extends NonNullable<CompiledRelationalBinaryOperatorExpression["type"]> ? V extends NonNullable<CompiledRelationalBinaryOperatorExpression["valueCategory"]> ? CompiledRelationalBinaryOperatorExpression : never : never;
    "pointer_comparison_expression": T extends NonNullable<CompiledPointerComparisonExpression["type"]> ? V extends NonNullable<CompiledPointerComparisonExpression["valueCategory"]> ? CompiledPointerComparisonExpression : never : never;
    "logical_binary_operator_expression": T extends NonNullable<CompiledLogicalBinaryOperatorExpression["type"]> ? V extends NonNullable<CompiledLogicalBinaryOperatorExpression["valueCategory"]> ? CompiledLogicalBinaryOperatorExpression : never : never;
    "non_member_operator_overload_expression": T extends NonNullable<CompiledNonMemberOperatorOverloadExpression["type"]> ? V extends NonNullable<CompiledNonMemberOperatorOverloadExpression["valueCategory"]> ? CompiledNonMemberOperatorOverloadExpression<T, V> : never : never;
    "member_operator_overload_expression": T extends NonNullable<CompiledMemberOperatorOverloadExpression["type"]> ? V extends NonNullable<CompiledMemberOperatorOverloadExpression["valueCategory"]> ? CompiledMemberOperatorOverloadExpression<T, V> : never : never;
    "prefix_increment_expression": T extends NonNullable<CompiledPrefixIncrementExpression["type"]> ? V extends NonNullable<CompiledPrefixIncrementExpression["valueCategory"]> ? CompiledPrefixIncrementExpression<T> : never : never;
    "dereference_expression": T extends NonNullable<CompiledDereferenceExpression["type"]> ? V extends NonNullable<CompiledDereferenceExpression["valueCategory"]> ? CompiledDereferenceExpression<T> : never : never;
    "address_of_expression": T extends NonNullable<CompiledAddressOfExpression["type"]> ? V extends NonNullable<CompiledAddressOfExpression["valueCategory"]> ? CompiledAddressOfExpression<T> : never : never;
    "new_expression": T extends NonNullable<CompiledNewExpression["type"]> ? V extends NonNullable<CompiledNewExpression["valueCategory"]> ? CompiledNewExpression<T> : never : never;
    "new_array_expression": T extends NonNullable<CompiledNewArrayExpression["type"]> ? V extends NonNullable<CompiledNewArrayExpression["valueCategory"]> ? CompiledNewArrayExpression<T> : never : never;
    "delete_expression": T extends NonNullable<CompiledDeleteExpression["type"]> ? V extends NonNullable<CompiledDeleteExpression["valueCategory"]> ? CompiledDeleteExpression : never : never;
    "delete_array_expression": T extends NonNullable<CompiledDeleteArrayExpression["type"]> ? V extends NonNullable<CompiledDeleteArrayExpression["valueCategory"]> ? CompiledDeleteArrayExpression : never : never;
    "this_expression": T extends NonNullable<CompiledThisExpression["type"]> ? V extends NonNullable<CompiledThisExpression["valueCategory"]> ? CompiledThisExpression<T> : never : never;
    "nullptr_expression": T extends NonNullable<CompiledNullptrExpression["type"]> ? V extends NonNullable<CompiledNullptrExpression["valueCategory"]> ? CompiledNullptrExpression : never : never;
    "unary_plus_expression": T extends NonNullable<CompiledUnaryPlusExpression["type"]> ? V extends NonNullable<CompiledUnaryPlusExpression["valueCategory"]> ? CompiledUnaryPlusExpression<T> : never : never;
    "unary_minus_expression": T extends NonNullable<CompiledUnaryMinusExpression["type"]> ? V extends NonNullable<CompiledUnaryMinusExpression["valueCategory"]> ? CompiledUnaryMinusExpression<T> : never : never;
    "logical_not_expression": T extends NonNullable<CompiledLogicalNotExpression["type"]> ? V extends NonNullable<CompiledLogicalNotExpression["valueCategory"]> ? CompiledLogicalNotExpression : never : never;
    "postfix_increment_expression": T extends NonNullable<CompiledPostfixIncrementExpression["type"]> ? V extends NonNullable<CompiledPostfixIncrementExpression["valueCategory"]> ? CompiledPrefixIncrementExpression<T> : never : never;
    "subscript_expression": T extends NonNullable<CompiledSubscriptExpression["type"]> ? V extends NonNullable<CompiledSubscriptExpression["valueCategory"]> ? CompiledSubscriptExpression<T> : never : never;
    "dot_expression": V extends NonNullable<DotExpression["valueCategory"]> ? (T extends CompleteObjectType ? CompiledObjectDotExpression<T> : T extends FunctionType ? CompiledFunctionDotExpression<T> : never) : never;
    "arrow_expression": V extends NonNullable<ArrowExpression["valueCategory"]> ? (T extends CompleteObjectType ? CompiledObjectArrowExpression<T> : T extends FunctionType ? CompiledFunctionArrowExpression<T> : never) : never;
    "identifier_expression": V extends NonNullable<IdentifierExpression["valueCategory"]> ? (T extends CompleteObjectType ? CompiledObjectIdentifierExpression<T> : T extends FunctionType ? CompiledFunctionIdentifierExpression<T> : never) : never;
    "numeric_literal_expression": T extends NonNullable<CompiledNumericLiteralExpression["type"]> ? V extends NonNullable<CompiledNumericLiteralExpression["valueCategory"]> ? CompiledNumericLiteralExpression<T> : never : never;
    "string_literal_expression": T extends NonNullable<CompiledStringLiteralExpression["type"]> ? V extends NonNullable<CompiledStringLiteralExpression["valueCategory"]> ? CompiledStringLiteralExpression : never : never;
    "parentheses_expression": T extends NonNullable<CompiledParenthesesExpression["type"]> ? V extends NonNullable<CompiledParenthesesExpression["valueCategory"]> ? CompiledParenthesesExpression<T, V> : never : never;
    "initializer_list_expression": T extends NonNullable<CompiledInitializerListExpression["type"]> ? V extends NonNullable<CompiledInitializerListExpression["valueCategory"]> ? CompiledInitializerListExpression<T> : never : never;
    "opaque_expression": T extends NonNullable<CompiledOpaqueExpression["type"]> ? V extends NonNullable<CompiledOpaqueExpression["valueCategory"]> ? CompiledOpaqueExpression<T, V> : never : never;
    "auxiliary_expression": T extends NonNullable<CompiledAuxiliaryExpression["type"]> ? V extends NonNullable<CompiledAuxiliaryExpression["valueCategory"]> ? CompiledAuxiliaryExpression<T, V> : never : never;
    "magic_function_call_expression": T extends NonNullable<CompiledMagicFunctionCallExpression["type"]> ? V extends NonNullable<CompiledMagicFunctionCallExpression["valueCategory"]> ? CompiledMagicFunctionCallExpression<T> : never : never;
    "function_call_expression": T extends NonNullable<CompiledFunctionCallExpression["type"]> ? V extends NonNullable<CompiledFunctionCallExpression["valueCategory"]> ? CompiledFunctionCallExpression<T> : never : never;
    "ImplicitConversion": T extends NonNullable<CompiledImplicitConversion["type"]> ? V extends NonNullable<CompiledImplicitConversion["valueCategory"]> ? CompiledImplicitConversion<T> : never : never;
};
export declare type AnalyticTypedExpression<C extends AnalyticExpression, T extends ExpressionType = NonNullable<C["type"]>, V extends ValueCategory = NonNullable<C["valueCategory"]>> = TypedExpressionKinds<T, V>[C["construct_type"]];
export declare type AnalyticCompiledExpression<C extends AnalyticExpression, T extends ExpressionType = NonNullable<C["type"]>, V extends ValueCategory = NonNullable<C["valueCategory"]>> = CompiledExpressionKinds<T, V>[C["construct_type"]];
declare const ExpressionConstructsRuntimeMap: {
    unsupported_expression: (construct: UnsupportedExpression, parent: RuntimeConstruct) => never;
    anything_construct: (construct: AnythingExpression, parent: RuntimeConstruct) => never;
    invalid_operator_overload_expression: (construct: UnsupportedExpression, parent: RuntimeConstruct) => never;
    comma_expression: <T extends ExpressionType, V extends ValueCategory>(construct: CompiledCommaExpression<T, V>, parent: RuntimeConstruct) => RuntimeComma<T, V>;
    ternary_expression: <T_1 extends ExpressionType, V_1 extends ValueCategory>(construct: CompiledTernaryExpression<T_1, V_1>, parent: RuntimeConstruct) => RuntimeTernary<T_1, V_1>;
    assignment_expression: <T_2 extends AtomicType>(construct: CompiledAssignmentExpression<T_2>, parent: RuntimeConstruct) => RuntimeAssignment<T_2>;
    compound_assignment_expression: <T_3 extends AtomicType>(construct: CompiledCompoundAssignmentExpression<T_3>, parent: RuntimeConstruct) => RuntimeCompoundAssignment<T_3>;
    arithmetic_binary_operator_expression: <T_4 extends ArithmeticType>(construct: CompiledArithmeticBinaryOperatorExpression<T_4>, parent: RuntimeConstruct) => RuntimeArithmeticBinaryOperator<T_4>;
    pointer_difference_expression: (construct: CompiledPointerDifferenceExpression, parent: RuntimeConstruct) => RuntimePointerDifference;
    pointer_offset_expression: <T_5 extends PointerToCompleteObjectType>(construct: CompiledPointerOffsetExpression<T_5>, parent: RuntimeConstruct) => RuntimePointerOffset<T_5>;
    output_operator_expression: (construct: CompiledOutputOperatorExpression, parent: RuntimeConstruct) => RuntimeOutputOperatorExpression;
    input_operator_expression: (construct: CompiledInputOperatorExpression, parent: RuntimeConstruct) => RuntimeInputOperatorExpression;
    relational_binary_operator_expression: <T_6 extends Bool>(construct: CompiledRelationalBinaryOperatorExpression<T_6>, parent: RuntimeConstruct) => RuntimeRelationalBinaryOperator<T_6>;
    pointer_comparison_expression: (construct: CompiledPointerComparisonExpression, parent: RuntimeConstruct) => RuntimePointerComparisonExpression<PointerType<PotentiallyCompleteObjectType>>;
    logical_binary_operator_expression: (construct: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct) => RuntimeLogicalBinaryOperatorExpression;
    non_member_operator_overload_expression: <T_7 extends VoidType | PotentiallyCompleteObjectType, V_2 extends ValueCategory>(construct: CompiledNonMemberOperatorOverloadExpression<T_7, V_2>, parent: RuntimeConstruct) => RuntimeNonMemberOperatorOverloadExpression<T_7, V_2>;
    member_operator_overload_expression: <T_8 extends VoidType | PotentiallyCompleteObjectType, V_3 extends ValueCategory>(construct: CompiledMemberOperatorOverloadExpression<T_8, V_3>, parent: RuntimeConstruct) => RuntimeMemberOperatorOverloadExpression<T_8, V_3>;
    prefix_increment_expression: <T_9 extends ArithmeticType | PointerToCompleteObjectType>(construct: CompiledPrefixIncrementExpression<T_9>, parent: RuntimeConstruct) => RuntimePrefixIncrementExpression<T_9>;
    dereference_expression: <T_10 extends CompleteObjectType>(construct: CompiledDereferenceExpression<T_10>, parent: RuntimeConstruct) => RuntimeDereferenceExpression<T_10>;
    address_of_expression: <T_11 extends PointerType<PotentiallyCompleteObjectType>>(construct: CompiledAddressOfExpression<T_11>, parent: RuntimeConstruct) => RuntimeAddressOfExpression<T_11>;
    new_expression: <T_12 extends PointerType<NewObjectType>>(construct: CompiledNewExpression<T_12>, parent: RuntimeConstruct) => RuntimeNewExpression<T_12>;
    new_array_expression: <T_13 extends PointerType<ArrayElemType>>(construct: CompiledNewArrayExpression<T_13>, parent: RuntimeConstruct) => RuntimeNewArrayExpression<T_13>;
    delete_expression: (construct: CompiledDeleteExpression, parent: RuntimeConstruct) => RuntimeDeleteExpression;
    delete_array_expression: (construct: CompiledDeleteArrayExpression, parent: RuntimeConstruct) => RuntimeDeleteArrayExpression;
    this_expression: <T_14 extends PointerType<CompleteClassType>>(construct: CompiledThisExpression<T_14>, parent: RuntimeConstruct) => RuntimeThisExpression<T_14>;
    nullptr_expression: (construct: CompiledNullptrExpression, parent: RuntimeConstruct) => RuntimeNullptrExpression;
    unary_plus_expression: <T_15 extends ArithmeticType | PointerType<PotentiallyCompleteObjectType>>(construct: CompiledUnaryPlusExpression<T_15>, parent: RuntimeConstruct) => RuntimeUnaryPlusExpression<T_15>;
    unary_minus_expression: <T_16 extends ArithmeticType>(construct: CompiledUnaryMinusExpression<T_16>, parent: RuntimeConstruct) => RuntimeUnaryMinusExpression<T_16>;
    logical_not_expression: (construct: CompiledLogicalNotExpression, parent: RuntimeConstruct) => RuntimeLogicalNotExpression;
    postfix_increment_expression: <T_17 extends ArithmeticType | PointerToCompleteObjectType>(construct: CompiledPostfixIncrementExpression<T_17>, parent: RuntimeConstruct) => RuntimePostfixIncrementExpression<T_17>;
    subscript_expression: <T_18 extends CompleteObjectType>(construct: CompiledSubscriptExpression<T_18>, parent: RuntimeConstruct) => RuntimeSubscriptExpression<T_18>;
    dot_expression: (construct: CompiledObjectDotExpression | CompiledFunctionDotExpression, parent: RuntimeConstruct) => RuntimeObjectDotExpression<CompleteObjectType> | RuntimeFunctionDotExpression;
    arrow_expression: (construct: CompiledObjectArrowExpression | CompiledFunctionArrowExpression, parent: RuntimeConstruct) => RuntimeObjectArrowExpression<CompleteObjectType> | RuntimeFunctionArrowExpression;
    identifier_expression: (construct: CompiledObjectIdentifierExpression | CompiledFunctionIdentifierExpression, parent: RuntimeConstruct) => RuntimeObjectIdentifierExpression<CompleteObjectType> | RuntimeFunctionIdentifierExpression;
    numeric_literal_expression: <T_19 extends ArithmeticType>(construct: CompiledNumericLiteralExpression<T_19>, parent: RuntimeConstruct) => RuntimeNumericLiteral<T_19>;
    string_literal_expression: (construct: CompiledStringLiteralExpression, parent: RuntimeConstruct) => RuntimeStringLiteralExpression;
    parentheses_expression: <T_20 extends ExpressionType, V_4 extends ValueCategory>(construct: CompiledParenthesesExpression<T_20, V_4>, parent: RuntimeConstruct) => RuntimeParentheses<T_20, V_4>;
    initializer_list_expression: <T_21 extends CompleteClassType>(construct: CompiledInitializerListExpression<T_21>, parent: RuntimeConstruct) => RuntimeInitializerListExpression<T_21>;
    opaque_expression: <T_22 extends ExpressionType, V_5 extends ValueCategory>(construct: CompiledOpaqueExpression<T_22, V_5>, parent: RuntimeConstruct) => RuntimeOpaqueExpression<T_22, V_5>;
    auxiliary_expression: <T_23 extends ExpressionType = ExpressionType, V_6 extends ValueCategory = ValueCategory>(construct: CompiledExpression<T_23, V_6>, parent: RuntimeConstruct) => never;
    magic_function_call_expression: <RT extends VoidType | PotentiallyCompleteObjectType>(construct: CompiledMagicFunctionCallExpression<RT, ValueCategory>, parent: RuntimeConstruct) => RuntimeMagicFunctionCallExpression<RT, ValueCategory>;
    function_call_expression: <RT_1 extends VoidType | PotentiallyCompleteObjectType>(construct: CompiledFunctionCallExpression<RT_1, ValueCategory>, parent: RuntimeConstruct) => RuntimeFunctionCallExpression<RT_1, ValueCategory>;
    ImplicitConversion: <FromType extends CompleteObjectType, FromVC extends ValueCategory, ToType extends CompleteObjectType, ToVC extends ValueCategory>(construct: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct) => RuntimeImplicitConversion<FromType, FromVC, ToType, ToVC>;
};
export declare function createRuntimeExpression(construct: UnsupportedExpression, parent: RuntimeConstruct): never;
export declare function createRuntimeExpression(construct: AnythingExpression, parent: RuntimeConstruct): never;
export declare function createRuntimeExpression(construct: InvalidOperatorOverloadExpression, parent: RuntimeConstruct): never;
export declare function createRuntimeExpression<T extends ExpressionType, V extends ValueCategory>(construct: CompiledCommaExpression<T, V>, parent: RuntimeConstruct): RuntimeComma<T, V>;
export declare function createRuntimeExpression<T extends ExpressionType, V extends ValueCategory>(construct: CompiledTernaryExpression<T, V>, parent: RuntimeConstruct): RuntimeTernary<T, V>;
export declare function createRuntimeExpression<T extends AtomicType>(construct: CompiledAssignmentExpression<T>, parent: RuntimeConstruct): RuntimeAssignment<T>;
export declare function createRuntimeExpression<T extends AtomicType>(construct: CompiledCompoundAssignmentExpression<T>, parent: RuntimeConstruct): RuntimeCompoundAssignment<T>;
export declare function createRuntimeExpression<T extends ArithmeticType>(construct: CompiledArithmeticBinaryOperatorExpression<T>, parent: RuntimeConstruct): RuntimeArithmeticBinaryOperator<T>;
export declare function createRuntimeExpression(construct: CompiledPointerDifferenceExpression, parent: RuntimeConstruct): RuntimePointerDifference;
export declare function createRuntimeExpression<T extends PointerToCompleteObjectType>(construct: CompiledPointerOffsetExpression<T>, parent: RuntimeConstruct): RuntimePointerOffset<T>;
export declare function createRuntimeExpression(construct: CompiledPointerOffsetExpression, parent: RuntimeConstruct): RuntimePointerOffset;
export declare function createRuntimeExpression<T extends ArithmeticType>(construct: CompiledRelationalBinaryOperatorExpression<T>, parent: RuntimeConstruct): RuntimeRelationalBinaryOperator<T>;
export declare function createRuntimeExpression(construct: CompiledPointerComparisonExpression, parent: RuntimeConstruct): RuntimePointerComparisonExpression;
export declare function createRuntimeExpression(construct: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct): RuntimeLogicalBinaryOperatorExpression;
export declare function createRuntimeExpression(construct: CompiledNonMemberOperatorOverloadExpression, parent: RuntimeConstruct): RuntimeNonMemberOperatorOverloadExpression;
export declare function createRuntimeExpression(construct: CompiledMemberOperatorOverloadExpression, parent: RuntimeConstruct): RuntimeMemberOperatorOverloadExpression;
export declare function createRuntimeExpression(construct: CompiledOutputOperatorExpression, parent: RuntimeConstruct): RuntimeOutputOperatorExpression;
export declare function createRuntimeExpression(construct: CompiledInputOperatorExpression, parent: RuntimeConstruct): RuntimeInputOperatorExpression;
export declare function createRuntimeExpression<T extends ArithmeticType | PointerToCompleteObjectType>(construct: CompiledPrefixIncrementExpression<T>, parent: RuntimeConstruct): RuntimePrefixIncrementExpression<T>;
export declare function createRuntimeExpression<T extends CompleteObjectType>(construct: CompiledDereferenceExpression<T>, parent: RuntimeConstruct): RuntimeDereferenceExpression<T>;
export declare function createRuntimeExpression<T extends PointerType>(construct: CompiledAddressOfExpression<T>, parent: RuntimeConstruct): RuntimeAddressOfExpression<T>;
export declare function createRuntimeExpression<T extends PointerType<NewObjectType>>(construct: CompiledNewExpression<T>, parent: RuntimeConstruct): RuntimeNewExpression<T>;
export declare function createRuntimeExpression<T extends PointerType<ArrayElemType>>(construct: CompiledNewArrayExpression<T>, parent: RuntimeConstruct): RuntimeNewArrayExpression<T>;
export declare function createRuntimeExpression(construct: CompiledDeleteArrayExpression, parent: RuntimeConstruct): RuntimeDeleteArrayExpression;
export declare function createRuntimeExpression<T extends PointerType<CompleteClassType>>(construct: CompiledThisExpression<T>, parent: RuntimeConstruct): RuntimeThisExpression<T>;
export declare function createRuntimeExpression(construct: CompiledNullptrExpression, parent: RuntimeConstruct): RuntimeNullptrExpression;
export declare function createRuntimeExpression<T extends ArithmeticType | PointerType>(construct: CompiledUnaryPlusExpression<T>, parent: RuntimeConstruct): RuntimeUnaryPlusExpression<T>;
export declare function createRuntimeExpression<T extends ArithmeticType>(construct: CompiledUnaryMinusExpression<T>, parent: RuntimeConstruct): RuntimeUnaryMinusExpression<T>;
export declare function createRuntimeExpression(construct: CompiledLogicalNotExpression, parent: RuntimeConstruct): RuntimeLogicalNotExpression;
export declare function createRuntimeExpression<T extends ArithmeticType | PointerToCompleteObjectType>(construct: CompiledPostfixIncrementExpression<T>, parent: RuntimeConstruct): RuntimePostfixIncrementExpression<T>;
export declare function createRuntimeExpression<T extends CompleteObjectType>(construct: CompiledSubscriptExpression<T>, parent: RuntimeConstruct): RuntimeSubscriptExpression<T>;
export declare function createRuntimeExpression(construct: CompiledObjectIdentifierExpression, parent: RuntimeConstruct): RuntimeObjectIdentifierExpression;
export declare function createRuntimeExpression(construct: CompiledFunctionIdentifierExpression, parent: RuntimeConstruct): RuntimeFunctionIdentifierExpression;
export declare function createRuntimeExpression(construct: CompiledObjectIdentifierExpression | CompiledFunctionIdentifierExpression, parent: RuntimeConstruct): RuntimeObjectIdentifierExpression | RuntimeFunctionIdentifierExpression;
export declare function createRuntimeExpression(construct: CompiledObjectDotExpression, parent: RuntimeConstruct): RuntimeObjectDotExpression;
export declare function createRuntimeExpression(construct: CompiledFunctionDotExpression, parent: RuntimeConstruct): RuntimeFunctionDotExpression;
export declare function createRuntimeExpression(construct: CompiledObjectDotExpression | CompiledFunctionDotExpression, parent: RuntimeConstruct): RuntimeObjectDotExpression | RuntimeFunctionDotExpression;
export declare function createRuntimeExpression(construct: CompiledObjectArrowExpression, parent: RuntimeConstruct): RuntimeObjectArrowExpression;
export declare function createRuntimeExpression(construct: CompiledFunctionArrowExpression, parent: RuntimeConstruct): RuntimeFunctionArrowExpression;
export declare function createRuntimeExpression(construct: CompiledObjectArrowExpression | CompiledFunctionArrowExpression, parent: RuntimeConstruct): RuntimeObjectArrowExpression | RuntimeFunctionDotExpression;
export declare function createRuntimeExpression<T extends ArithmeticType>(construct: CompiledNumericLiteralExpression<T>, parent: RuntimeConstruct): RuntimeNumericLiteral<T>;
export declare function createRuntimeExpression(construct: CompiledStringLiteralExpression, parent: RuntimeConstruct): RuntimeStringLiteralExpression;
export declare function createRuntimeExpression<T extends ExpressionType, V extends ValueCategory>(construct: CompiledParenthesesExpression<T, V>, parent: RuntimeConstruct): RuntimeParentheses<T, V>;
export declare function createRuntimeExpression<T extends CompleteClassType>(construct: CompiledInitializerListExpression<T>, parent: RuntimeConstruct): RuntimeInitializerListExpression<T>;
export declare function createRuntimeExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory>(construct: AuxiliaryExpression<T, V>, parent: RuntimeConstruct): never;
export declare function createRuntimeExpression<RT extends PeelReference<CompleteReturnType>>(construct: CompiledMagicFunctionCallExpression<RT>, parent: RuntimeConstruct): RuntimeMagicFunctionCallExpression<RT>;
export declare function createRuntimeExpression<RT extends PeelReference<CompleteReturnType>>(construct: CompiledFunctionCallExpression<RT>, parent: RuntimeConstruct): RuntimeFunctionCallExpression<RT>;
export declare function createRuntimeExpression<FromType extends CompleteObjectType, FromVC extends ValueCategory, ToType extends CompleteObjectType, ToVC extends ValueCategory>(construct: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct): RuntimeImplicitConversion<FromType, FromVC, ToType, ToVC>;
export declare function createRuntimeExpression<T extends ExpressionType, V extends ValueCategory, ConstructType extends AnalyticExpression, CompiledConstructType extends AnalyticCompiledExpression<ConstructType, T, V>>(construct: CompiledConstructType, parent: RuntimeConstruct): ReturnType<(typeof ExpressionConstructsRuntimeMap)[CompiledConstructType["construct_type"]]>;
export declare function createRuntimeExpression<T extends ExpressionType, V extends ValueCategory>(construct: CompiledExpression<T, V>, parent: RuntimeConstruct): RuntimeExpression<T, V>;
/**
 * An expression not currently supported by Lobster.
 */
export declare class UnsupportedExpression extends Expression<ExpressionASTNode> {
    readonly construct_type = "unsupported_expression";
    readonly type: undefined;
    readonly valueCategory: undefined;
    private readonly unsupportedName;
    constructor(context: ExpressionContext, ast: ExpressionASTNode, unsupportedName: string);
    createDefaultOutlet(this: never, element: JQuery, parent?: ConstructOutlet): never;
    describeEvalResult(depth: number): ConstructDescription;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean;
}
/**
 * A flawed expression
 */
export declare abstract class InvalidExpression extends Expression<ExpressionASTNode> {
    readonly type: undefined;
    readonly valueCategory: undefined;
    constructor(context: ExpressionContext, ast: ExpressionASTNode);
    createDefaultOutlet(this: never, element: JQuery, parent?: ConstructOutlet): never;
    describeEvalResult(depth: number): ConstructDescription;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean;
}
export declare class AnythingExpression extends Expression {
    readonly construct_type = "anything_construct";
    readonly type: undefined;
    readonly valueCategory: undefined;
    constructor(context: ExpressionContext, ast: AnythingConstructASTNode | undefined);
    createDefaultOutlet(element: JQuery, parent?: ConstructOutlet): never;
    describeEvalResult(depth: number): ConstructDescription;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export declare abstract class SimpleRuntimeExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory, C extends CompiledExpression<T, V> = CompiledExpression<T, V>> extends RuntimeExpression<T, V, C> {
    private index;
    private subexpressions;
    constructor(model: C, parent: RuntimeConstruct);
    protected setSubexpressions(subexpressions: readonly RuntimeConstruct[]): void;
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
    protected abstract operate(): void;
}
export declare class CommaExpression extends Expression<CommaASTNode> {
    readonly construct_type = "comma_expression";
    readonly type?: ExpressionType;
    readonly valueCategory?: ValueCategory;
    readonly left: Expression;
    readonly right: Expression;
    constructor(context: ExpressionContext, ast: CommaASTNode, left: Expression, right: Expression);
    static createFromAST(ast: CommaASTNode, context: ExpressionContext): CommaExpression;
    createDefaultOutlet(this: CompiledCommaExpression, element: JQuery, parent?: ConstructOutlet): CommaExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean;
}
export interface TypedCommaExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends CommaExpression, t_TypedExpression {
    readonly type: T;
    readonly valueCategory: V;
    readonly right: TypedExpression<T, V>;
}
export interface CompiledCommaExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TypedCommaExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly left: CompiledExpression;
    readonly right: CompiledExpression<T, V>;
}
export declare class RuntimeComma<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends SimpleRuntimeExpression<T, V, CompiledCommaExpression<T, V>> {
    left: RuntimeExpression;
    right: RuntimeExpression<T, V>;
    constructor(model: CompiledCommaExpression<T, V>, parent: RuntimeConstruct);
    protected operate(): void;
}
export declare class TernaryExpression extends Expression<TernaryASTNode> {
    readonly construct_type = "ternary_expression";
    readonly type?: ExpressionType;
    readonly valueCategory?: ValueCategory;
    readonly condition: Expression;
    readonly then: Expression;
    readonly otherwise: Expression;
    constructor(context: ExpressionContext, ast: TernaryASTNode, condition: Expression, then: Expression, otherwise: Expression);
    static createFromAST(ast: TernaryASTNode, context: ExpressionContext): TernaryExpression;
    private compileCondition;
    private compileConsequences;
    createDefaultOutlet(this: CompiledTernaryExpression, element: JQuery, parent?: ConstructOutlet): TernaryExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean;
}
export interface TypedTernaryExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TernaryExpression, t_TypedExpression {
    readonly type: T;
    readonly valueCategory: V;
    readonly then: TypedExpression<T, V>;
    readonly otherwise: TypedExpression<T, V>;
}
export interface CompiledTernaryExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TypedTernaryExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly condition: CompiledExpression<Bool, "prvalue">;
    readonly then: CompiledExpression<T, V>;
    readonly otherwise: CompiledExpression<T, V>;
}
export declare class RuntimeTernary<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T, V, CompiledTernaryExpression<T, V>> {
    condition: RuntimeExpression<Bool, "prvalue">;
    then: RuntimeExpression<T, V>;
    otherwise: RuntimeExpression<T, V>;
    private index;
    constructor(model: CompiledTernaryExpression<T, V>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
export declare class AssignmentExpression extends Expression<AssignmentExpressionASTNode> {
    readonly construct_type = "assignment_expression";
    readonly type?: AtomicType;
    readonly valueCategory = "lvalue";
    readonly lhs: Expression;
    readonly rhs: Expression;
    private constructor();
    static createFromAST(ast: AssignmentExpressionASTNode, context: ExpressionContext): AssignmentExpression | OperatorOverloadExpression;
    createDefaultOutlet(this: CompiledAssignmentExpression, element: JQuery, parent?: ConstructOutlet): AssignmentExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
    explain(sim: Simulation, rtConstruct: RuntimeConstruct): {
        message: string;
    };
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean;
}
export interface TypedAssignmentExpression<T extends AtomicType = AtomicType> extends AssignmentExpression, t_TypedExpression {
    readonly type: T;
    readonly lhs: TypedExpression<T>;
}
export interface CompiledAssignmentExpression<T extends AtomicType = AtomicType> extends TypedAssignmentExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly lhs: CompiledExpression<T, "lvalue">;
    readonly rhs: CompiledExpression<T, "prvalue">;
}
export declare class RuntimeAssignment<T extends AtomicType = AtomicType> extends SimpleRuntimeExpression<T, "lvalue", CompiledAssignmentExpression<T>> {
    readonly lhs: RuntimeExpression<T, "lvalue">;
    readonly rhs: RuntimeExpression<T, "prvalue">;
    constructor(model: CompiledAssignmentExpression<T>, parent: RuntimeConstruct);
    protected operate(): void;
}
export declare class CompoundAssignmentExpression extends Expression<CompoundAssignmentExpressionASTNode> {
    readonly construct_type = "compound_assignment_expression";
    readonly type?: AtomicType;
    readonly valueCategory = "lvalue";
    readonly lhs: Expression;
    readonly rhs: Expression;
    readonly operator: t_CompoundAssignmentOperators;
    readonly equivalentBinaryOp: t_ArithmeticBinaryOperators;
    private constructor();
    static createFromAST(ast: CompoundAssignmentExpressionASTNode, context: ExpressionContext): CompoundAssignmentExpression | OperatorOverloadExpression;
    createDefaultOutlet(this: CompiledCompoundAssignmentExpression, element: JQuery, parent?: ConstructOutlet): CompoundAssignmentExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
    explain(sim: Simulation, rtConstruct: RuntimeConstruct): {
        message: string;
    };
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean;
}
export interface TypedCompoundAssignmentExpression<T extends AtomicType = AtomicType> extends CompoundAssignmentExpression, t_TypedExpression {
    readonly type: T;
    readonly lhs: TypedExpression<T>;
}
export interface CompiledCompoundAssignmentExpression<T extends AtomicType = AtomicType> extends TypedCompoundAssignmentExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly lhs: CompiledExpression<T, "lvalue">;
    readonly rhs: CompiledExpression<T, "prvalue">;
}
export declare class RuntimeCompoundAssignment<T extends AtomicType = AtomicType> extends SimpleRuntimeExpression<T, "lvalue", CompiledCompoundAssignmentExpression<T>> {
    readonly lhs: RuntimeExpression<T, "lvalue">;
    readonly rhs: RuntimeExpression<T, "prvalue">;
    constructor(model: CompiledCompoundAssignmentExpression<T>, parent: RuntimeConstruct);
    protected operate(): void;
}
declare abstract class BinaryOperatorExpression<ASTType extends BinaryOperatorExpressionASTNode = BinaryOperatorExpressionASTNode> extends Expression<ASTType> {
    abstract readonly construct_type: "arithmetic_binary_operator_expression" | "relational_binary_operator_expression" | "logical_binary_operator_expression" | "pointer_offset_expression" | "pointer_difference_expression" | "pointer_comparison_expression";
    abstract readonly type?: AtomicType;
    readonly valueCategory = "prvalue";
    abstract readonly left: Expression;
    abstract readonly right: Expression;
    readonly operator: t_BinaryOperators;
    protected constructor(context: ExpressionContext, ast: ASTType | undefined, operator: t_BinaryOperators);
    createDefaultOutlet(this: CompiledBinaryOperatorExpression, element: JQuery, parent?: ConstructOutlet): BinaryOperatorExpressionOutlet;
}
export declare type AnalyticBinaryOperatorExpression = ArithmeticBinaryOperatorExpression | PointerDifferenceExpression | PointerOffsetExpression | OutputOperatorExpression | InputOperatorExpression | RelationalBinaryOperatorExpression | PointerComparisonExpression | LogicalBinaryOperatorExpression;
export interface TypedBinaryOperatorExpression<T extends AtomicType = AtomicType> extends BinaryOperatorExpression, t_TypedExpression {
    readonly type: T;
    readonly left: TypedExpression<AtomicType, "prvalue">;
    readonly right: TypedExpression<AtomicType, "prvalue">;
}
export interface CompiledBinaryOperatorExpression<T extends AtomicType = AtomicType> extends TypedBinaryOperatorExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly left: CompiledExpression<AtomicType, "prvalue">;
    readonly right: CompiledExpression<AtomicType, "prvalue">;
}
export interface RuntimeBinaryOperator extends RuntimeExpression<AtomicType, "prvalue", CompiledBinaryOperatorExpression<AtomicType>> {
    readonly left: RuntimeExpression<AtomicType, "prvalue">;
    readonly right: RuntimeExpression<AtomicType, "prvalue">;
}
export declare class ArithmeticBinaryOperatorExpression extends BinaryOperatorExpression<ArithmeticBinaryOperatorExpressionASTNode> {
    readonly construct_type = "arithmetic_binary_operator_expression";
    readonly type?: ArithmeticType;
    readonly left: Expression;
    readonly right: Expression;
    readonly operator: t_ArithmeticBinaryOperators;
    protected constructor(context: ExpressionContext, ast: ArithmeticBinaryOperatorExpressionASTNode, left: Expression, right: Expression, operator: t_ArithmeticBinaryOperators);
    static createFromAST(ast: ArithmeticBinaryOperatorExpressionASTNode, context: ExpressionContext): ArithmeticBinaryOperatorExpression | PointerDifferenceExpression | PointerOffsetExpression | OutputOperatorExpression | InputOperatorExpression | OperatorOverloadExpression;
    describeEvalResult(depth: number): ConstructDescription;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean;
}
export interface TypedArithmeticBinaryOperatorExpression<T extends ArithmeticType = ArithmeticType> extends ArithmeticBinaryOperatorExpression, t_TypedExpression {
    readonly type: T;
    readonly left: TypedExpression<T, "prvalue">;
    readonly right: TypedExpression<T, "prvalue">;
}
export interface CompiledArithmeticBinaryOperatorExpression<T extends ArithmeticType = ArithmeticType> extends TypedArithmeticBinaryOperatorExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly left: CompiledExpression<T, "prvalue">;
    readonly right: CompiledExpression<T, "prvalue">;
}
export declare class RuntimeArithmeticBinaryOperator<T extends ArithmeticType = ArithmeticType> extends SimpleRuntimeExpression<T, "prvalue", CompiledArithmeticBinaryOperatorExpression<T>> {
    readonly left: RuntimeExpression<T, "prvalue">;
    readonly right: RuntimeExpression<T, "prvalue">;
    constructor(model: CompiledArithmeticBinaryOperatorExpression<T>, parent: RuntimeConstruct);
    operate(): void;
}
export declare class PointerDifferenceExpression extends BinaryOperatorExpression<ArithmeticBinaryOperatorExpressionASTNode> {
    readonly construct_type = "pointer_difference_expression";
    readonly type: Int;
    readonly valueCategory = "prvalue";
    readonly left: TypedExpression<PointerType, "prvalue">;
    readonly right: TypedExpression<PointerType, "prvalue">;
    readonly operator: "-";
    constructor(context: ExpressionContext, ast: ArithmeticBinaryOperatorExpressionASTNode, left: TypedExpression<PointerType, "prvalue">, right: TypedExpression<PointerType, "prvalue">);
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedPointerDifferenceExpression extends PointerDifferenceExpression, t_TypedExpression {
}
export interface CompiledPointerDifferenceExpression extends TypedPointerDifferenceExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly left: CompiledExpression<PointerToCompleteObjectType, "prvalue">;
    readonly right: CompiledExpression<PointerToCompleteObjectType, "prvalue">;
}
export declare class RuntimePointerDifference extends SimpleRuntimeExpression<Int, "prvalue", CompiledPointerDifferenceExpression> {
    left: RuntimeExpression<PointerToCompleteObjectType, "prvalue">;
    right: RuntimeExpression<PointerToCompleteObjectType, "prvalue">;
    constructor(model: CompiledPointerDifferenceExpression, parent: RuntimeConstruct);
    operate(): void;
}
export declare class PointerOffsetExpression extends BinaryOperatorExpression<ArithmeticBinaryOperatorExpressionASTNode> {
    readonly construct_type = "pointer_offset_expression";
    readonly type?: PointerType;
    readonly left: TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">;
    readonly right: TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">;
    readonly pointer?: TypedExpression<PointerType, "prvalue">;
    readonly offset?: TypedExpression<IntegralType, "prvalue">;
    readonly pointerOnLeft?: boolean;
    readonly operator: "+" | "-";
    constructor(context: ExpressionContext, ast: ArithmeticBinaryOperatorExpressionASTNode, left: TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">, right: TypedExpression<PointerType, "prvalue"> | TypedExpression<IntegralType, "prvalue">, operator: "+" | "-");
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedPointerOffsetExpression<T extends PointerType = PointerType> extends PointerOffsetExpression, t_TypedExpression {
    readonly type: T;
    readonly left: TypedExpression<T, "prvalue"> | TypedExpression<IntegralType, "prvalue">;
    readonly right: TypedExpression<T, "prvalue"> | TypedExpression<IntegralType, "prvalue">;
    readonly pointer: TypedExpression<T, "prvalue">;
    readonly offset: TypedExpression<IntegralType, "prvalue">;
}
export interface CompiledPointerOffsetExpression<T extends PointerToCompleteObjectType = PointerToCompleteObjectType> extends TypedPointerOffsetExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly left: CompiledExpression<T, "prvalue"> | CompiledExpression<IntegralType, "prvalue">;
    readonly right: CompiledExpression<T, "prvalue"> | CompiledExpression<IntegralType, "prvalue">;
    readonly pointer: CompiledExpression<T, "prvalue">;
    readonly offset: CompiledExpression<IntegralType, "prvalue">;
    readonly pointerOnLeft?: boolean;
}
export declare class RuntimePointerOffset<T extends PointerToCompleteObjectType = PointerToCompleteObjectType> extends SimpleRuntimeExpression<T, "prvalue", CompiledPointerOffsetExpression<T>> {
    readonly left: RuntimeExpression<T, "prvalue"> | RuntimeExpression<IntegralType, "prvalue">;
    readonly right: RuntimeExpression<T, "prvalue"> | RuntimeExpression<IntegralType, "prvalue">;
    readonly pointer: RuntimeExpression<T, "prvalue">;
    readonly offset: RuntimeExpression<IntegralType, "prvalue">;
    constructor(model: CompiledPointerOffsetExpression<T>, parent: RuntimeConstruct);
    operate(): void;
}
export declare class OutputOperatorExpression extends Expression<ArithmeticBinaryOperatorExpressionASTNode> {
    readonly construct_type = "output_operator_expression";
    readonly type: PotentiallyCompleteClassType;
    readonly valueCategory = "lvalue";
    readonly left: TypedExpression<PotentiallyCompleteClassType, "lvalue">;
    readonly right: Expression;
    readonly operator = "<<";
    constructor(context: ExpressionContext, ast: ArithmeticBinaryOperatorExpressionASTNode, left: TypedExpression<PotentiallyCompleteClassType, "lvalue">, right: Expression);
    createDefaultOutlet(this: CompiledOutputOperatorExpression, element: JQuery, parent?: ConstructOutlet): OutputOperatorExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedOutputOperatorExpression extends OutputOperatorExpression, t_TypedExpression {
}
export interface CompiledOutputOperatorExpression extends TypedOutputOperatorExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly left: CompiledExpression<PotentiallyCompleteClassType, "lvalue">;
    readonly right: CompiledExpression<AtomicType, "prvalue"> | CompiledStringLiteralExpression;
}
export declare class RuntimeOutputOperatorExpression extends SimpleRuntimeExpression<PotentiallyCompleteClassType, "lvalue", CompiledOutputOperatorExpression> {
    readonly left: RuntimeExpression<PotentiallyCompleteClassType, "lvalue">;
    readonly right: RuntimeExpression<AtomicType, "prvalue"> | RuntimeStringLiteralExpression;
    constructor(model: CompiledOutputOperatorExpression, parent: RuntimeConstruct);
    operate(): void;
}
export declare class InputOperatorExpression extends Expression<ArithmeticBinaryOperatorExpressionASTNode> {
    readonly construct_type = "input_operator_expression";
    readonly type: PotentiallyCompleteClassType;
    readonly valueCategory = "lvalue";
    readonly left: TypedExpression<PotentiallyCompleteClassType, "lvalue">;
    readonly right: Expression;
    readonly operator = ">>";
    constructor(context: ExpressionContext, ast: ArithmeticBinaryOperatorExpressionASTNode, left: TypedExpression<PotentiallyCompleteClassType, "lvalue">, right: Expression);
    createDefaultOutlet(this: CompiledInputOperatorExpression, element: JQuery, parent?: ConstructOutlet): InputOperatorExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedInputOperatorExpression extends InputOperatorExpression, t_TypedExpression {
}
export interface CompiledInputOperatorExpression extends TypedInputOperatorExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly left: CompiledExpression<PotentiallyCompleteClassType, "lvalue">;
    readonly right: CompiledExpression<ArithmeticType, "lvalue">;
}
export declare class RuntimeInputOperatorExpression extends RuntimeExpression<PotentiallyCompleteClassType, "lvalue", CompiledInputOperatorExpression> {
    readonly left: RuntimeExpression<PotentiallyCompleteClassType, "lvalue">;
    readonly right: RuntimeExpression<ArithmeticType, "lvalue">;
    private index;
    constructor(model: CompiledInputOperatorExpression, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
export declare class RelationalBinaryOperatorExpression extends BinaryOperatorExpression<RelationalBinaryOperatorExpressionASTNode> {
    readonly construct_type = "relational_binary_operator_expression";
    readonly type: Bool;
    readonly left: Expression;
    readonly right: Expression;
    readonly operator: t_RelationalBinaryOperators;
    protected constructor(context: ExpressionContext, ast: RelationalBinaryOperatorExpressionASTNode, left: Expression, right: Expression, operator: t_RelationalBinaryOperators);
    static createFromAST(ast: RelationalBinaryOperatorExpressionASTNode, context: ExpressionContext): RelationalBinaryOperatorExpression | PointerComparisonExpression | OperatorOverloadExpression;
    describeEvalResult(depth: number): ConstructDescription;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean;
}
export interface TypedRelationalBinaryOperatorExpression extends RelationalBinaryOperatorExpression, t_TypedExpression {
}
export interface CompiledRelationalBinaryOperatorExpression<OperandT extends ArithmeticType = ArithmeticType> extends TypedRelationalBinaryOperatorExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly left: CompiledExpression<OperandT, "prvalue">;
    readonly right: CompiledExpression<OperandT, "prvalue">;
}
export declare class RuntimeRelationalBinaryOperator<OperandT extends ArithmeticType = ArithmeticType> extends SimpleRuntimeExpression<Bool, "prvalue", CompiledRelationalBinaryOperatorExpression<OperandT>> {
    readonly left: RuntimeExpression<OperandT, "prvalue">;
    readonly right: RuntimeExpression<OperandT, "prvalue">;
    constructor(model: CompiledRelationalBinaryOperatorExpression<OperandT>, parent: RuntimeConstruct);
    operate(): void;
}
export declare class PointerComparisonExpression extends BinaryOperatorExpression<RelationalBinaryOperatorExpressionASTNode> {
    readonly construct_type = "pointer_comparison_expression";
    readonly type: Bool;
    readonly valueCategory = "prvalue";
    readonly left: TypedExpression<PointerType, "prvalue">;
    readonly right: TypedExpression<PointerType, "prvalue">;
    readonly operator: t_RelationalBinaryOperators;
    constructor(context: ExpressionContext, ast: RelationalBinaryOperatorExpressionASTNode | undefined, left: TypedExpression<PointerType, "prvalue">, right: TypedExpression<PointerType, "prvalue">, operator: t_RelationalBinaryOperators);
    describeEvalResult(depth: number): ConstructDescription;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean;
}
export interface TypedPointerComparisonExpression extends PointerComparisonExpression, t_TypedExpression {
}
export interface CompiledPointerComparisonExpression<OperandT extends PointerType = PointerType> extends TypedPointerComparisonExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly left: CompiledExpression<OperandT, "prvalue">;
    readonly right: CompiledExpression<OperandT, "prvalue">;
}
export declare class RuntimePointerComparisonExpression<OperandT extends PointerType = PointerType> extends SimpleRuntimeExpression<Bool, "prvalue", CompiledPointerComparisonExpression<OperandT>> {
    left: RuntimeExpression<OperandT, "prvalue">;
    right: RuntimeExpression<OperandT, "prvalue">;
    constructor(model: CompiledPointerComparisonExpression<OperandT>, parent: RuntimeConstruct);
    operate(): void;
}
export declare class LogicalBinaryOperatorExpression extends BinaryOperatorExpression<LogicalBinaryOperatorExpressionASTNode> {
    readonly construct_type = "logical_binary_operator_expression";
    readonly type: Bool;
    readonly left: Expression;
    readonly right: Expression;
    readonly operator: t_LogicalBinaryOperators;
    protected constructor(context: ExpressionContext, ast: LogicalBinaryOperatorExpressionASTNode | undefined, left: Expression, right: Expression, operator: t_LogicalBinaryOperators);
    private compileLogicalSubexpression;
    static createFromAST(ast: LogicalBinaryOperatorExpressionASTNode, context: ExpressionContext): LogicalBinaryOperatorExpression | OperatorOverloadExpression;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedLogicalBinaryOperatorExpression extends LogicalBinaryOperatorExpression, t_TypedExpression {
}
export interface CompiledLogicalBinaryOperatorExpression extends TypedLogicalBinaryOperatorExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly left: CompiledExpression<Bool, "prvalue">;
    readonly right: CompiledExpression<Bool, "prvalue">;
}
export declare class RuntimeLogicalBinaryOperatorExpression extends RuntimeExpression<Bool, "prvalue", CompiledLogicalBinaryOperatorExpression> {
    left: RuntimeExpression<Bool, "prvalue">;
    right: RuntimeExpression<Bool, "prvalue">;
    private index;
    private hasShortCircuited?;
    constructor(model: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
    private operate;
}
declare abstract class UnaryOperatorExpression<ASTType extends UnaryOperatorExpressionASTNode = UnaryOperatorExpressionASTNode> extends Expression<ASTType> {
    abstract readonly type?: CompleteObjectType | VoidType;
    abstract readonly operand: Expression;
    abstract readonly operator: t_UnaryOperators;
    protected constructor(context: ExpressionContext, ast: ASTType | undefined);
    createDefaultOutlet(this: CompiledUnaryOperatorExpression, element: JQuery, parent?: ConstructOutlet): UnaryOperatorExpressionOutlet;
}
export declare type AnalyticUnaryOperatorExpression = DereferenceExpression | AddressOfExpression | UnaryPlusExpression | UnaryMinusExpression | LogicalNotExpression | PrefixIncrementExpression;
export interface TypedUnaryOperatorExpression<T extends CompleteObjectType | VoidType = CompleteObjectType | VoidType, V extends ValueCategory = ValueCategory> extends UnaryOperatorExpression, t_TypedExpression {
    readonly type: T;
    readonly valueCategory: ValueCategory;
}
export interface CompiledUnaryOperatorExpression<T extends CompleteObjectType | VoidType = CompleteObjectType | VoidType, V extends ValueCategory = ValueCategory> extends TypedUnaryOperatorExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly operand: CompiledExpression;
}
export interface RuntimeUnaryOperatorExpression extends RuntimeExpression<CompleteObjectType | VoidType, ValueCategory, CompiledUnaryOperatorExpression<CompleteObjectType | VoidType>> {
    readonly operand: RuntimeExpression;
}
export declare class PrefixIncrementExpression extends UnaryOperatorExpression<PrefixIncrementExpressionASTNode> {
    readonly construct_type = "prefix_increment_expression";
    readonly type?: ArithmeticType | PointerToCompleteObjectType;
    readonly valueCategory = "lvalue";
    readonly operand: Expression;
    readonly operator: "++" | "--";
    constructor(context: ExpressionContext, ast: PrefixIncrementExpressionASTNode, operand: Expression);
    static createFromAST(ast: PrefixIncrementExpressionASTNode, context: ExpressionContext): PrefixIncrementExpression;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedPrefixIncrementExpression<T extends ArithmeticType | PointerToCompleteObjectType = ArithmeticType | PointerToCompleteObjectType> extends PrefixIncrementExpression, t_TypedExpression {
    readonly type: T;
    readonly operand: TypedExpression<T, "lvalue">;
}
export interface CompiledPrefixIncrementExpression<T extends ArithmeticType | PointerToCompleteObjectType = ArithmeticType | PointerToCompleteObjectType> extends TypedPrefixIncrementExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly operand: CompiledExpression<T, "lvalue">;
}
export declare class RuntimePrefixIncrementExpression<T extends ArithmeticType | PointerToCompleteObjectType> extends SimpleRuntimeExpression<T, "lvalue", CompiledPrefixIncrementExpression<T>> {
    operand: RuntimeExpression<T, "lvalue">;
    constructor(model: CompiledPrefixIncrementExpression<T>, parent: RuntimeConstruct);
    protected operate(): void;
}
export declare class DereferenceExpression extends UnaryOperatorExpression<DereferenceExpressionASTNode> {
    readonly construct_type = "dereference_expression";
    readonly type?: CompleteObjectType;
    readonly valueCategory = "lvalue";
    readonly operand: Expression;
    readonly operator = "*";
    constructor(context: ExpressionContext, ast: DereferenceExpressionASTNode, operand: Expression);
    static createFromAST(ast: DereferenceExpressionASTNode, context: ExpressionContext): DereferenceExpression;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedDereferenceExpression<T extends CompleteObjectType = CompleteObjectType> extends DereferenceExpression, t_TypedExpression {
    readonly type: T;
    readonly operand: TypedExpression<PointerType<T>, "prvalue">;
}
export interface CompiledDereferenceExpression<T extends CompleteObjectType = CompleteObjectType> extends TypedDereferenceExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly operand: CompiledExpression<PointerType<T>, "prvalue">;
}
export declare class RuntimeDereferenceExpression<T extends CompleteObjectType> extends SimpleRuntimeExpression<T, "lvalue", CompiledDereferenceExpression<T>> {
    operand: RuntimeExpression<PointerType<T>, "prvalue">;
    constructor(model: CompiledDereferenceExpression<T>, parent: RuntimeConstruct);
    protected operate(): void;
}
export declare class AddressOfExpression extends UnaryOperatorExpression<AddressOfExpressionASTNode> {
    readonly construct_type = "address_of_expression";
    readonly type?: PointerType;
    readonly valueCategory = "prvalue";
    readonly operand: Expression;
    readonly operator = "&";
    constructor(context: ExpressionContext, ast: AddressOfExpressionASTNode, operand: Expression);
    static createFromAST(ast: AddressOfExpressionASTNode, context: ExpressionContext): AddressOfExpression;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedAddressOfExpression<T extends PointerType = PointerType> extends AddressOfExpression, t_TypedExpression {
    readonly type: T;
    readonly operand: TypedExpression<T["ptrTo"]>;
}
export interface CompiledAddressOfExpression<T extends PointerType = PointerType> extends TypedAddressOfExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly operand: CompiledExpression<T["ptrTo"], "lvalue">;
}
export declare class RuntimeAddressOfExpression<T extends PointerType> extends SimpleRuntimeExpression<T, "prvalue", CompiledAddressOfExpression<T>> {
    operand: RuntimeExpression<T["ptrTo"], "lvalue">;
    constructor(model: CompiledAddressOfExpression<T>, parent: RuntimeConstruct);
    protected operate(): void;
}
export declare class UnaryPlusExpression extends UnaryOperatorExpression<UnaryPlusExpressionASTNode> {
    readonly construct_type = "unary_plus_expression";
    readonly type?: ArithmeticType | PointerType;
    readonly valueCategory = "prvalue";
    readonly operand: Expression;
    readonly operator = "+";
    constructor(context: ExpressionContext, ast: UnaryPlusExpressionASTNode, operand: Expression);
    static createFromAST(ast: UnaryPlusExpressionASTNode, context: ExpressionContext): UnaryPlusExpression;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedUnaryPlusExpression<T extends ArithmeticType | PointerType = ArithmeticType | PointerType> extends UnaryPlusExpression, t_TypedExpression {
    readonly type: T;
    readonly operand: TypedExpression<T, "prvalue">;
}
export interface CompiledUnaryPlusExpression<T extends ArithmeticType | PointerType = ArithmeticType | PointerType> extends TypedUnaryPlusExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly operand: CompiledExpression<T, "prvalue">;
}
export declare class RuntimeUnaryPlusExpression<T extends ArithmeticType | PointerType> extends SimpleRuntimeExpression<T, "prvalue", CompiledUnaryPlusExpression<T>> {
    operand: RuntimeExpression<T, "prvalue">;
    constructor(model: CompiledUnaryPlusExpression<T>, parent: RuntimeConstruct);
    protected operate(): void;
}
export declare class UnaryMinusExpression extends UnaryOperatorExpression<UnaryMinusExpressionASTNode> {
    readonly construct_type = "unary_minus_expression";
    readonly type?: ArithmeticType;
    readonly valueCategory = "prvalue";
    readonly operand: Expression;
    readonly operator = "-";
    constructor(context: ExpressionContext, ast: UnaryMinusExpressionASTNode, operand: Expression);
    static createFromAST(ast: UnaryMinusExpressionASTNode, context: ExpressionContext): UnaryMinusExpression;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedUnaryMinusExpression<T extends ArithmeticType = ArithmeticType> extends UnaryMinusExpression, t_TypedExpression {
    readonly type: T;
    readonly operand: TypedExpression<T, "prvalue">;
}
export interface CompiledUnaryMinusExpression<T extends ArithmeticType = ArithmeticType> extends TypedUnaryMinusExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly operand: CompiledExpression<T, "prvalue">;
}
export declare class RuntimeUnaryMinusExpression<T extends ArithmeticType> extends SimpleRuntimeExpression<T, "prvalue", CompiledUnaryMinusExpression<T>> {
    operand: RuntimeExpression<T, "prvalue">;
    constructor(model: CompiledUnaryMinusExpression<T>, parent: RuntimeConstruct);
    protected operate(): void;
}
export declare class LogicalNotExpression extends UnaryOperatorExpression<LogicalNotExpressionASTNode> {
    readonly construct_type = "logical_not_expression";
    readonly type: Bool;
    readonly valueCategory = "prvalue";
    readonly operand: Expression;
    readonly operator = "!";
    constructor(context: ExpressionContext, ast: LogicalNotExpressionASTNode, operand: Expression);
    static createFromAST(ast: LogicalNotExpressionASTNode, context: ExpressionContext): LogicalNotExpression;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedLogicalNotExpression extends LogicalNotExpression, t_TypedExpression {
    readonly operand: TypedExpression<Bool, "prvalue">;
}
export interface CompiledLogicalNotExpression extends TypedLogicalNotExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly operand: CompiledExpression<Bool, "prvalue">;
}
export declare class RuntimeLogicalNotExpression extends SimpleRuntimeExpression<Bool, "prvalue", CompiledLogicalNotExpression> {
    operand: RuntimeExpression<Bool, "prvalue">;
    constructor(model: CompiledLogicalNotExpression, parent: RuntimeConstruct);
    protected operate(): void;
}
export declare class SubscriptExpression extends Expression<SubscriptExpressionASTNode> {
    readonly construct_type = "subscript_expression";
    readonly type?: CompleteObjectType;
    readonly valueCategory = "lvalue";
    readonly operand: Expression;
    readonly offset: Expression;
    constructor(context: ExpressionContext, ast: SubscriptExpressionASTNode, operand: Expression, offset: Expression);
    static createFromAST(ast: SubscriptExpressionASTNode, context: ExpressionContext): SubscriptExpression | OperatorOverloadExpression;
    createDefaultOutlet(this: CompiledSubscriptExpression, element: JQuery, parent?: ConstructOutlet): SubscriptExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedSubscriptExpression<T extends CompleteObjectType = CompleteObjectType> extends SubscriptExpression, t_TypedExpression {
    readonly type: T;
    readonly operand: TypedExpression<PointerType<T>, "prvalue">;
}
export interface CompiledSubscriptExpression<T extends CompleteObjectType = CompleteObjectType> extends TypedSubscriptExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly operand: CompiledExpression<PointerType<T>, "prvalue">;
    readonly offset: CompiledExpression<Int, "prvalue">;
}
export declare class RuntimeSubscriptExpression<T extends CompleteObjectType = CompleteObjectType> extends SimpleRuntimeExpression<T, "lvalue", CompiledSubscriptExpression<T>> {
    operand: RuntimeExpression<PointerType<T>, "prvalue">;
    offset: RuntimeExpression<Int, "prvalue">;
    constructor(model: CompiledSubscriptExpression<T>, parent: RuntimeConstruct);
    protected operate(): void;
}
export declare class DotExpression extends Expression<DotExpressionASTNode> {
    readonly construct_type = "dot_expression";
    readonly type?: PotentiallyCompleteObjectType | FunctionType;
    readonly valueCategory = "lvalue";
    readonly operand: Expression;
    readonly memberName: LexicalIdentifier;
    readonly entity?: MemberVariableEntity | FunctionEntity;
    readonly functionCallReceiver?: ObjectEntity<CompleteClassType>;
    static createFromAST(ast: DotExpressionASTNode, context: ExpressionContext): DotExpression;
    constructor(context: ExpressionContext, ast: DotExpressionASTNode, operand: Expression, memberName: LexicalIdentifier);
    createDefaultOutlet(this: CompiledObjectDotExpression<CompleteObjectType> | CompiledFunctionDotExpression, element: JQuery, parent?: ConstructOutlet): DotExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
    entitiesUsed(): (FunctionEntity<FunctionType<PotentialReturnType>> | MemberVariableEntity<PotentiallyCompleteObjectType>)[];
}
export interface TypedObjectDotExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends DotExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: MemberVariableEntity;
    readonly operand: TypedExpression<CompleteClassType>;
}
export interface CompiledObjectDotExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends TypedObjectDotExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly operand: CompiledExpression<CompleteClassType>;
}
export interface TypedFunctionDotExpression<T extends FunctionType = FunctionType> extends DotExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: FunctionEntity<T>;
    readonly operand: TypedExpression<CompleteClassType>;
}
export interface CompiledFunctionDotExpression<T extends FunctionType = FunctionType> extends TypedFunctionDotExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly operand: CompiledExpression<CompleteClassType>;
}
export declare class RuntimeObjectDotExpression<T extends CompleteObjectType = CompleteObjectType> extends RuntimeExpression<T, "lvalue", CompiledObjectDotExpression<T>> {
    readonly operand: RuntimeExpression<CompleteClassType>;
    constructor(model: CompiledObjectDotExpression<T>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
export declare class RuntimeFunctionDotExpression extends RuntimeExpression<FunctionType, "lvalue", CompiledFunctionDotExpression> {
    readonly operand: RuntimeExpression<CompleteClassType>;
    constructor(model: CompiledFunctionDotExpression, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
    get contextualReceiver(): CPPObject<CompleteClassType>;
}
export declare class ArrowExpression extends Expression<ArrowExpressionASTNode> {
    readonly construct_type = "arrow_expression";
    readonly type?: PotentiallyCompleteObjectType | FunctionType;
    readonly valueCategory = "lvalue";
    readonly operand: Expression;
    readonly memberName: LexicalIdentifier;
    readonly entity?: MemberVariableEntity | FunctionEntity;
    readonly functionCallReceiver?: ObjectEntity<CompleteClassType>;
    static createFromAST(ast: ArrowExpressionASTNode, context: ExpressionContext): ArrowExpression;
    constructor(context: ExpressionContext, ast: ArrowExpressionASTNode, operand: Expression, memberName: LexicalIdentifier);
    createDefaultOutlet(this: CompiledObjectArrowExpression<CompleteObjectType> | CompiledFunctionArrowExpression, element: JQuery, parent?: ConstructOutlet): ArrowExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
    entitiesUsed(): (FunctionEntity<FunctionType<PotentialReturnType>> | MemberVariableEntity<PotentiallyCompleteObjectType>)[];
}
export interface TypedObjectArrowExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends ArrowExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: MemberVariableEntity;
    readonly operand: TypedExpression<PointerType<CompleteClassType>>;
}
export interface CompiledObjectArrowExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends TypedObjectArrowExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly operand: CompiledExpression<PointerType<CompleteClassType>>;
}
export interface TypedFunctionArrowExpression<T extends FunctionType = FunctionType> extends ArrowExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: FunctionEntity<T>;
    readonly operand: TypedExpression<PointerType<CompleteClassType>>;
}
export interface CompiledFunctionArrowExpression<T extends FunctionType = FunctionType> extends TypedFunctionArrowExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly operand: CompiledExpression<PointerType<CompleteClassType>>;
}
export declare class RuntimeObjectArrowExpression<T extends CompleteObjectType = CompleteObjectType> extends RuntimeExpression<T, "lvalue", CompiledObjectArrowExpression<T>> {
    readonly operand: RuntimeExpression<PointerType<CompleteClassType>>;
    constructor(model: CompiledObjectArrowExpression<T>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
export declare class RuntimeFunctionArrowExpression extends RuntimeExpression<FunctionType, "lvalue", CompiledFunctionArrowExpression> {
    readonly operand: RuntimeExpression<PointerType<CompleteClassType>>;
    private receiverCalledOn?;
    constructor(model: CompiledFunctionArrowExpression, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
    get contextualReceiver(): CPPObject<CompleteClassType>;
}
export declare class PostfixIncrementExpression extends Expression<PostfixIncrementExpressionASTNode> {
    readonly construct_type = "postfix_increment_expression";
    readonly type?: ArithmeticType | PointerToCompleteObjectType;
    readonly valueCategory = "prvalue";
    readonly operand: Expression;
    readonly operator: "++" | "--";
    constructor(context: ExpressionContext, ast: PostfixIncrementExpressionASTNode, operand: Expression);
    static createFromAST(ast: PostfixIncrementExpressionASTNode, context: ExpressionContext): PostfixIncrementExpression;
    createDefaultOutlet(this: CompiledPostfixIncrementExpression, element: JQuery, parent?: ConstructOutlet): PostfixIncrementExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedPostfixIncrementExpression<T extends ArithmeticType | PointerToCompleteObjectType = ArithmeticType | PointerToCompleteObjectType> extends PostfixIncrementExpression, t_TypedExpression {
    readonly type: T;
    readonly operand: TypedExpression<T, "lvalue">;
}
export interface CompiledPostfixIncrementExpression<T extends ArithmeticType | PointerToCompleteObjectType = ArithmeticType | PointerToCompleteObjectType> extends TypedPostfixIncrementExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly operand: CompiledExpression<T, "lvalue">;
}
export declare class RuntimePostfixIncrementExpression<T extends ArithmeticType | PointerToCompleteObjectType = ArithmeticType | PointerToCompleteObjectType> extends SimpleRuntimeExpression<T, "prvalue", CompiledPostfixIncrementExpression<T>> {
    operand: RuntimeExpression<T, "lvalue">;
    constructor(model: CompiledPostfixIncrementExpression<T>, parent: RuntimeConstruct);
    protected operate(): void;
}
export declare class IdentifierExpression extends Expression<IdentifierExpressionASTNode> {
    readonly construct_type = "identifier_expression";
    readonly type?: PotentiallyCompleteObjectType | FunctionType;
    readonly valueCategory = "lvalue";
    readonly name: LexicalIdentifier;
    readonly entity?: ObjectEntity | BoundReferenceEntity | FunctionEntity;
    constructor(context: ExpressionContext, ast: IdentifierExpressionASTNode | undefined, name: LexicalIdentifier);
    static createFromAST(ast: IdentifierExpressionASTNode, context: ExpressionContext): IdentifierExpression;
    getEntity<T extends CompleteObjectType>(this: TypedExpression<T>): ObjectEntity<T>;
    getEntity<T extends FunctionType>(this: TypedExpression<T>): FunctionEntity<T>;
    createDefaultOutlet(this: CompiledObjectIdentifierExpression<CompleteObjectType> | CompiledFunctionIdentifierExpression, element: JQuery, parent?: ConstructOutlet): IdentifierOutlet;
    describeEvalResult(depth: number): ConstructDescription;
    entitiesUsed(): (FunctionEntity<FunctionType<PotentialReturnType>> | BoundReferenceEntity<ReferenceType<PotentiallyCompleteObjectType>> | ObjectEntity<CompleteObjectType>)[];
}
declare type EntityLookupError = "not_found" | "ambiguous" | "class_found";
/**
 * Used as a helper for IdentifierExpression, DotExpression, and ArrowExpression, and overloaded operators
 * @param scope
 * @param name
 * @param expression
 */
export declare function entityLookup(expression: Expression, lookupResult: DeclaredScopeEntry | undefined): VariableEntity | FunctionEntity | EntityLookupError;
export interface TypedObjectIdentifierExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends IdentifierExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: ObjectEntity<Extract<T, CompleteObjectType>> | BoundReferenceEntity<ReferenceType<T>>;
}
export interface CompiledObjectIdentifierExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends TypedObjectIdentifierExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
}
export interface TypedFunctionIdentifierExpression<T extends FunctionType = FunctionType> extends IdentifierExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: FunctionEntity<T>;
}
export interface CompiledFunctionIdentifierExpression<T extends FunctionType = FunctionType> extends TypedFunctionIdentifierExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
}
export declare class RuntimeObjectIdentifierExpression<T extends CompleteObjectType = CompleteObjectType> extends RuntimeExpression<T, "lvalue", CompiledObjectIdentifierExpression<T>> {
    constructor(model: CompiledObjectIdentifierExpression<T>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
export declare class RuntimeFunctionIdentifierExpression extends RuntimeExpression<FunctionType, "lvalue", CompiledFunctionIdentifierExpression> {
    constructor(model: CompiledFunctionIdentifierExpression, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
export declare class ThisExpression extends Expression<ThisExpressionASTNode> {
    readonly construct_type = "this_expression";
    readonly type?: PointerType<CompleteClassType>;
    readonly valueCategory = "prvalue";
    constructor(context: ExpressionContext, ast: ThisExpressionASTNode);
    static createFromAST(ast: ThisExpressionASTNode, context: ExpressionContext): ThisExpression;
    createDefaultOutlet(this: CompiledThisExpression, element: JQuery, parent?: ConstructOutlet): ThisExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedThisExpression<T extends PointerType<CompleteClassType> = PointerType<CompleteClassType>> extends ThisExpression, t_TypedExpression {
    readonly type: T;
}
export interface CompiledThisExpression<T extends PointerType<CompleteClassType> = PointerType<CompleteClassType>> extends TypedThisExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
}
export declare class RuntimeThisExpression<T extends PointerType<CompleteClassType> = PointerType<CompleteClassType>> extends SimpleRuntimeExpression<T, "prvalue", CompiledThisExpression<T>> {
    constructor(model: CompiledThisExpression<T>, parent: RuntimeConstruct);
    protected operate(): void;
}
export declare class NullptrExpression extends Expression<NullptrExpressionASTNode> {
    readonly construct_type = "nullptr_expression";
    readonly type: Int;
    readonly valueCategory = "prvalue";
    constructor(context: ExpressionContext, ast: NullptrExpressionASTNode);
    static createFromAST(ast: NullptrExpressionASTNode, context: ExpressionContext): NullptrExpression;
    createDefaultOutlet(this: CompiledNullptrExpression, element: JQuery, parent?: ConstructOutlet): NullptrExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedNullptrExpression extends NullptrExpression, t_TypedExpression {
}
export interface CompiledNullptrExpression extends TypedNullptrExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
}
export declare class RuntimeNullptrExpression extends SimpleRuntimeExpression<Int, "prvalue", CompiledNullptrExpression> {
    constructor(model: CompiledNullptrExpression, parent: RuntimeConstruct);
    protected operate(): void;
}
export declare class NumericLiteralExpression extends Expression<NumericLiteralASTNode> {
    readonly construct_type = "numeric_literal_expression";
    readonly type: ArithmeticType;
    readonly valueCategory = "prvalue";
    readonly value: Value<ArithmeticType>;
    constructor(context: ExpressionContext, ast: NumericLiteralASTNode | undefined, type: ArithmeticType, value: RawValueType);
    static createFromAST(ast: NumericLiteralASTNode, context: ExpressionContext): NumericLiteralExpression;
    createDefaultOutlet(this: CompiledNumericLiteralExpression, element: JQuery, parent?: ConstructOutlet): NumericLiteralOutlet;
    describeEvalResult(depth: number): ConstructDescription;
    isIntegerZero(): void;
}
export interface TypedNumericLiteralExpression<T extends ArithmeticType = ArithmeticType> extends NumericLiteralExpression, t_TypedExpression {
    readonly type: T;
}
export interface CompiledNumericLiteralExpression<T extends ArithmeticType = ArithmeticType> extends TypedNumericLiteralExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
}
export declare class RuntimeNumericLiteral<T extends ArithmeticType = ArithmeticType> extends RuntimeExpression<T, "prvalue", CompiledNumericLiteralExpression<T>> {
    constructor(model: CompiledNumericLiteralExpression<T>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
export declare class StringLiteralExpression extends Expression<StringLiteralASTNode> {
    readonly construct_type = "string_literal_expression";
    readonly type: BoundedArrayType<Char>;
    readonly valueCategory = "lvalue";
    readonly str: string;
    constructor(context: ExpressionContext, ast: StringLiteralASTNode | undefined, str: string);
    isStringLiteralExpression(): boolean;
    static createFromAST(ast: StringLiteralASTNode, context: ExpressionContext): StringLiteralExpression;
    createDefaultOutlet(this: CompiledStringLiteralExpression, element: JQuery, parent?: ConstructOutlet): StringLiteralExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedStringLiteralExpression extends StringLiteralExpression, t_TypedExpression {
}
export interface CompiledStringLiteralExpression extends TypedStringLiteralExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
}
export declare class RuntimeStringLiteralExpression extends RuntimeExpression<BoundedArrayType<Char>, "lvalue", CompiledStringLiteralExpression> {
    constructor(model: CompiledStringLiteralExpression, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
export declare class ParenthesesExpression extends Expression<ParenthesesExpressionASTNode> {
    readonly construct_type = "parentheses_expression";
    readonly type?: ExpressionType;
    readonly valueCategory?: ValueCategory;
    readonly subexpression: Expression;
    constructor(context: ExpressionContext, ast: ParenthesesExpressionASTNode | undefined, subexpression: Expression);
    static createFromAST(ast: ParenthesesExpressionASTNode, context: ExpressionContext): ParenthesesExpression;
    createDefaultOutlet(this: CompiledParenthesesExpression, element: JQuery, parent?: ConstructOutlet): ParenthesesOutlet;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedParenthesesExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends ParenthesesExpression, t_TypedExpression {
    readonly type: T;
    readonly valueCategory: V;
    readonly subexpression: TypedExpression<T, V>;
}
export interface CompiledParenthesesExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TypedParenthesesExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly subexpression: CompiledExpression<T, V>;
}
export declare class RuntimeParentheses<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T, V, CompiledParenthesesExpression<T, V>> {
    subexpression: RuntimeExpression<T, V>;
    private index;
    constructor(model: CompiledParenthesesExpression<T, V>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
export declare class InitializerListExpression extends Expression<InitializerListExpressionASTNode> {
    readonly construct_type = "initializer_list_expression";
    readonly type?: CompleteClassType;
    readonly valueCategory = "lvalue";
    readonly elements: readonly Expression[];
    readonly elementType?: ArithmeticType;
    readonly initializerList?: TemporaryObjectEntity<CompleteClassType>;
    readonly elementsArray?: TemporaryObjectEntity<BoundedArrayType<ArithmeticType>>;
    constructor(context: ExpressionContext, ast: InitializerListExpressionASTNode | undefined, elements: readonly Expression[]);
    static createFromAST(ast: InitializerListExpressionASTNode, context: ExpressionContext): InitializerListExpression;
    createDefaultOutlet(this: CompiledInitializerListExpression, element: JQuery, parent?: ConstructOutlet): InitializerListExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedInitializerListExpression<T extends CompleteClassType = CompleteClassType> extends InitializerListExpression, t_TypedExpression {
    readonly type: T;
    readonly elements: readonly TypedExpression[];
    readonly elementType: ArithmeticType;
    readonly initializerList: TemporaryObjectEntity<CompleteClassType>;
    readonly elementsArray: TemporaryObjectEntity<BoundedArrayType<ArithmeticType>>;
}
export interface CompiledInitializerListExpression<T extends CompleteClassType = CompleteClassType> extends TypedInitializerListExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly elements: readonly CompiledExpression[];
}
export declare class RuntimeInitializerListExpression<T extends CompleteClassType = CompleteClassType> extends RuntimeExpression<T, "lvalue", CompiledInitializerListExpression<T>> {
    elements: readonly RuntimeExpression[];
    readonly initializerList?: TemporaryObject<CompleteClassType>;
    readonly elementsArray?: TemporaryObject<BoundedArrayType<ArithmeticType>>;
    private elementIndex;
    constructor(model: CompiledInitializerListExpression<T>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
export declare class AuxiliaryExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends Expression<never> {
    readonly construct_type = "auxiliary_expression";
    readonly type: T;
    readonly valueCategory: V;
    constructor(type: T, valueCategory: V);
    createDefaultOutlet(this: CompiledAuxiliaryExpression, element: JQuery, parent?: ConstructOutlet): never;
    describeEvalResult(depth: number): never;
}
export interface TypedAuxiliaryExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends AuxiliaryExpression<T, V>, t_TypedExpression {
}
export interface CompiledAuxiliaryExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TypedAuxiliaryExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
}
interface OverloadCandidateResult {
    readonly candidate: FunctionEntity;
    readonly notes: readonly Note[];
}
export interface OverloadResolutionResult<T extends FunctionType = FunctionType> {
    readonly candidates: readonly OverloadCandidateResult[];
    readonly viable: FunctionEntity<T>[];
    readonly selected?: FunctionEntity<T>;
}
export declare function overloadResolution<T extends FunctionType>(candidates: readonly FunctionEntity<T>[], argTypes: readonly (ExpressionType | undefined)[], receiverType?: CompleteClassType): OverloadResolutionResult<T>;
interface MagicFunctionImpl {
    readonly returnType: CompleteObjectType | VoidType;
    readonly valueCategory: ValueCategory;
    readonly paramTypes: readonly PotentialParameterType[];
    readonly operate: (rt: RuntimeMagicFunctionCallExpression) => void;
}
export declare class MagicFunctionCallExpression extends Expression<FunctionCallExpressionASTNode> {
    readonly construct_type = "magic_function_call_expression";
    readonly type: PeelReference<CompleteReturnType>;
    readonly valueCategory: ValueCategory;
    readonly functionName: string;
    readonly functionImpl: MagicFunctionImpl;
    readonly args: readonly Expression[];
    constructor(context: ExpressionContext, ast: FunctionCallExpressionASTNode | undefined, functionName: MAGIC_FUNCTION_NAMES, args: readonly Expression[]);
    createDefaultOutlet(this: CompiledMagicFunctionCallExpression, element: JQuery, parent?: ConstructOutlet): MagicFunctionCallExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedMagicFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends MagicFunctionCallExpression, t_TypedExpression {
    readonly type: T;
    readonly valueCategory: V;
}
export interface CompiledMagicFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends TypedMagicFunctionCallExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly args: readonly CompiledExpression[];
}
export declare class RuntimeMagicFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends SimpleRuntimeExpression<T, V, CompiledMagicFunctionCallExpression<T, V>> {
    args: readonly RuntimeExpression[];
    constructor(model: CompiledMagicFunctionCallExpression<T, V>, parent: RuntimeConstruct);
    protected operate(): void;
}
export declare abstract class ImplicitConversion<FromType extends CompleteObjectType = CompleteObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends CompleteObjectType = CompleteObjectType, ToVC extends ValueCategory = ValueCategory> extends Expression {
    readonly construct_type = "ImplicitConversion";
    readonly from: TypedExpression<FromType, FromVC>;
    readonly type: ToType;
    readonly valueCategory: ToVC;
    readonly conversionLength: number;
    constructor(from: TypedExpression<FromType, FromVC>, toType: ToType, valueCategory: ToVC);
    createRuntimeExpression<FromType extends CompleteObjectType, FromVC extends ValueCategory, ToType extends CompleteObjectType, ToVC extends ValueCategory>(this: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct): RuntimeImplicitConversion<FromType, FromVC, ToType, ToVC>;
    createRuntimeExpression<T extends ExpressionType, V extends ValueCategory>(this: CompiledExpression<T, V>, parent: RuntimeConstruct): never;
    abstract operate(fromEvalResult: VCResultTypes<FromType, FromVC>): VCResultTypes<ToType, ToVC>;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedImplicitConversion<FromType extends CompleteObjectType = CompleteObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends CompleteObjectType = CompleteObjectType, ToVC extends ValueCategory = ValueCategory> extends ImplicitConversion<FromType, FromVC, ToType, ToVC>, t_TypedExpression {
}
export interface CompiledImplicitConversion<FromType extends CompleteObjectType = CompleteObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends CompleteObjectType = CompleteObjectType, ToVC extends ValueCategory = ValueCategory> extends TypedImplicitConversion<FromType, FromVC, ToType, ToVC>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly from: CompiledExpression<FromType, FromVC>;
}
export declare class RuntimeImplicitConversion<FromType extends CompleteObjectType = CompleteObjectType, FromVC extends ValueCategory = ValueCategory, ToType extends CompleteObjectType = CompleteObjectType, ToVC extends ValueCategory = ValueCategory> extends SimpleRuntimeExpression<ToType, ToVC, CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>> {
    readonly from: RuntimeExpression<FromType, FromVC>;
    constructor(model: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct);
    protected operate(): void;
}
export declare class LValueToRValueConversion<T extends AtomicType> extends ImplicitConversion<T, "lvalue", T, "prvalue"> {
    constructor(from: TypedExpression<T, "lvalue">);
    operate(fromEvalResult: VCResultTypes<T, "lvalue">): VCResultTypes<T, "prvalue">;
    createDefaultOutlet(this: CompiledLValueToRValueConversion, element: JQuery, parent?: ConstructOutlet): LValueToRValueOutlet;
}
export interface TypedLValueToRValueConversion<T extends AtomicType = AtomicType> extends LValueToRValueConversion<T>, t_TypedExpression {
}
export interface CompiledLValueToRValueConversion<T extends AtomicType = AtomicType> extends TypedLValueToRValueConversion<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly from: CompiledExpression<T, "lvalue">;
}
export declare class ArrayToPointerConversion<T extends BoundedArrayType> extends ImplicitConversion<T, "lvalue", PointerType, "prvalue"> {
    constructor(from: TypedExpression<T, "lvalue">);
    operate(fromEvalResult: VCResultTypes<BoundedArrayType, "lvalue">): Value<ArrayPointerType<ArrayElemType>>;
    createDefaultOutlet(this: CompiledArrayToPointerConversion, element: JQuery, parent?: ConstructOutlet): ArrayToPointerOutlet;
}
export interface TypedArrayToPointerConversion<T extends BoundedArrayType = BoundedArrayType> extends ArrayToPointerConversion<T>, t_TypedExpression {
}
export interface CompiledArrayToPointerConversion<T extends BoundedArrayType = BoundedArrayType> extends TypedArrayToPointerConversion<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly from: CompiledExpression<T, "lvalue">;
}
export declare class StreamToBoolConversion extends ImplicitConversion<CompleteClassType, "lvalue", Bool, "prvalue"> {
    constructor(from: TypedExpression<CompleteClassType, "lvalue">);
    operate(fromEvalResult: VCResultTypes<CompleteClassType, "lvalue">): Value<Bool>;
    createDefaultOutlet(this: CompiledStreamToBoolConversion, element: JQuery, parent?: ConstructOutlet): StreamToBoolOutlet;
}
export interface TypedStreamToBoolConversion extends StreamToBoolConversion, t_TypedExpression {
}
export interface CompiledStreamToBoolConversion extends TypedStreamToBoolConversion, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly from: CompiledExpression<CompleteClassType, "lvalue">;
}
/**
 * All type conversions ignore (top-level) cv-qualifications on the given destination
 * type. This is because type conversions only operate on prvalues of atomic type,
 * which cannot be cv-qualified. For convenience, the user may still specify a
 * cv-qualified type and the cv-unqualified version will be used instead.
 */
declare abstract class TypeConversion<FromType extends AtomicType, ToType extends AtomicType> extends ImplicitConversion<FromType, "prvalue", ToType, "prvalue"> {
    constructor(from: TypedExpression<FromType, "prvalue">, toType: ToType);
    createDefaultOutlet(this: CompiledTypeConversion, element: JQuery, parent?: ConstructOutlet): TypeConversionOutlet;
}
export interface TypedTypeConversion<FromType extends AtomicType = AtomicType, ToType extends AtomicType = AtomicType> extends TypeConversion<FromType, ToType>, t_TypedExpression {
}
export interface CompiledTypeConversion<FromType extends AtomicType = AtomicType, ToType extends AtomicType = AtomicType> extends TypedTypeConversion<FromType, ToType>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly from: CompiledExpression<FromType, "prvalue">;
}
declare abstract class NoOpTypeConversion<FromType extends AtomicType, ToType extends AtomicType> extends TypeConversion<FromType, ToType> {
    constructor(from: TypedExpression<FromType, "prvalue">, toType: ToType);
    operate(fromEvalResult: VCResultTypes<FromType, "prvalue">): VCResultTypes<ToType, "prvalue">;
}
export declare type IntegerLiteralZero = CompiledNumericLiteralExpression<Int> & {
    value: Value<Int> & {
        rawValue: 0;
    };
} | CompiledNullptrExpression;
export declare class NullPointerConversion<P extends PointerType> extends NoOpTypeConversion<Int, P> {
    readonly from: IntegerLiteralZero;
    constructor(from: IntegerLiteralZero, toType: P);
}
export interface TypedNullPointerConversion<P extends PointerType> extends NullPointerConversion<P>, t_TypedExpression {
}
export interface CompiledNullPointerConversion<P extends PointerType> extends TypedNullPointerConversion<P>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly from: IntegerLiteralZero;
}
export declare class PointerConversion<FromType extends PointerType, ToType extends PointerType> extends NoOpTypeConversion<FromType, ToType> {
}
export interface TypedPointerConversion<FromType extends PointerType, ToType extends PointerType> extends TypedTypeConversion<FromType, ToType> {
}
export interface CompiledPointerConversion<FromType extends PointerType, ToType extends PointerType> extends CompiledTypeConversion<FromType, ToType> {
}
export declare abstract class ToBooleanConversion<T extends AtomicType = AtomicType> extends TypeConversion<T, Bool> {
    constructor(from: TypedExpression<T, "prvalue">);
    operate(fromEvalResult: VCResultTypes<T, "prvalue">): Value<Bool>;
}
export declare class PointerToBooleanConversion<T extends PointerType = PointerType> extends ToBooleanConversion<T> {
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean;
}
export declare class FloatingToBooleanConversion<T extends FloatingPointType = FloatingPointType> extends ToBooleanConversion<T> {
}
export declare class IntegralToBooleanConversion<T extends IntegralType = IntegralType> extends ToBooleanConversion<T> {
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean;
}
export declare class IntegralPromotion<FromType extends IntegralType, ToType extends IntegralType> extends NoOpTypeConversion<FromType, ToType> {
}
export declare class IntegralConversion<FromType extends IntegralType, ToType extends IntegralType> extends NoOpTypeConversion<FromType, ToType> {
}
export declare class FloatingPointPromotion extends NoOpTypeConversion<Float, Double> {
    constructor(from: TypedExpression<Float, "prvalue">);
}
export declare class FloatingPointConversion<FromType extends FloatingPointType, ToType extends FloatingPointType> extends NoOpTypeConversion<FromType, ToType> {
}
export declare class IntegralToFloatingConversion<FromType extends IntegralType, ToType extends FloatingPointType> extends NoOpTypeConversion<FromType, ToType> {
}
export declare class FloatingToIntegralConversion<T extends FloatingPointType> extends TypeConversion<T, IntegralType> {
    operate(fromEvalResult: VCResultTypes<T, "prvalue">): Value<Int>;
}
export declare class QualificationConversion<T extends AtomicType = AtomicType> extends ImplicitConversion<T, "prvalue", T, "prvalue"> {
    constructor(from: TypedExpression<T, "prvalue">, toType: T);
    createDefaultOutlet(this: CompiledQualificationConversion, element: JQuery, parent?: ConstructOutlet): QualificationConversionOutlet;
    operate(fromEvalResult: VCResultTypes<T, "prvalue">): VCResultTypes<T, "prvalue">;
}
export interface TypedQualificationConversion<T extends AtomicType = AtomicType> extends QualificationConversion<T>, t_TypedExpression {
}
export interface CompiledQualificationConversion<T extends AtomicType = AtomicType> extends TypedQualificationConversion<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly from: CompiledExpression<T, "prvalue">;
}
export declare function convertToPRValue<T extends AtomicType>(from: SpecificTypedExpression<T>): TypedExpression<T, "prvalue">;
export declare function convertToPRValue<Elem_type extends ArrayElemType>(from: TypedExpression<BoundedArrayType<Elem_type>, "lvalue">): TypedExpression<PointerType<Elem_type>, "prvalue">;
export declare function convertToPRValue(from: SpecificTypedExpression<PointerType> | TypedExpression<BoundedArrayType, "lvalue">): TypedExpression<PointerType, "prvalue">;
export declare function convertToPRValue(from: SpecificTypedExpression<AtomicType> | TypedExpression<BoundedArrayType, "lvalue">): TypedExpression<AtomicType, "prvalue">;
export declare function convertToPRValue(from: TypedExpression): TypedExpression;
export declare function typeConversion(from: TypedExpression<PointerType, "prvalue">, toType: Bool): TypedExpression<Bool, "prvalue">;
export declare function typeConversion(from: TypedExpression<Double, "prvalue">, toType: Float): TypedExpression<Float, "prvalue">;
export declare function typeConversion(from: TypedExpression<IntegralType, "prvalue">, toType: IntegralType): TypedExpression<IntegralType, "prvalue">;
export declare function typeConversion(from: TypedExpression<FloatingPointType, "prvalue">, toType: IntegralType): TypedExpression<IntegralType, "prvalue">;
export declare function typeConversion(from: TypedExpression<IntegralType, "prvalue">, toType: FloatingPointType): TypedExpression<FloatingPointType, "prvalue">;
export declare function typeConversion(from: TypedExpression<FloatingPointType, "prvalue">, toType: FloatingPointType): TypedExpression<FloatingPointType, "prvalue">;
export declare function typeConversion<SimilarType extends AtomicType>(from: TypedExpression<SimilarType, "prvalue">, toType: SimilarType): TypedExpression<SimilarType, "prvalue">;
export declare function typeConversion<FromType extends AtomicType, ToType extends AtomicType>(from: TypedExpression<FromType, "prvalue">, toType: ToType): TypedExpression<FromType, "prvalue"> | TypedExpression<ToType, "prvalue">;
export declare function qualificationConversion(from: TypedExpression<AtomicType, "prvalue">, toType: AtomicType): TypedExpression<AtomicType, "prvalue">;
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
export declare function standardConversion(from: TypedExpression, toType: ExpressionType, options?: StandardConversionOptions): TypedExpression<ExpressionType, ValueCategory>;
export declare function integralPromotion(expr: TypedExpression<IntegralType, "prvalue">): TypedExpression<Int, "prvalue">;
export declare function isIntegerLiteralZero(from: Expression): from is IntegerLiteralZero;
export declare function isConvertibleToPointer(from: Expression): from is SpecificTypedExpression<PointerType> | TypedExpression<BoundedArrayType, "lvalue"> | IntegerLiteralZero;
export declare function isConvertible(from: TypedExpression, toType: ExpressionType, options?: StandardConversionOptions): boolean;
export declare function usualArithmeticConversions(leftOrig: SpecificTypedExpression<ArithmeticType>, rightOrig: SpecificTypedExpression<ArithmeticType>): TypedExpression<ArithmeticType, "prvalue">[];
export declare function selectOperatorOverload(context: ExpressionContext, ast: ExpressionASTNode, operator: t_OverloadableOperators, originalArgs: Expression[]): NonMemberOperatorOverloadExpression | MemberOperatorOverloadExpression | undefined;
export declare type t_OverloadableOperators = t_CompoundAssignmentOperators | t_BinaryOperators | "=" | "+=" | "[]";
export declare class NonMemberOperatorOverloadExpression extends Expression<ExpressionASTNode> {
    readonly construct_type = "non_member_operator_overload_expression";
    readonly type?: PeelReference<CompleteReturnType>;
    readonly valueCategory?: ValueCategory;
    readonly operator: t_OverloadableOperators;
    readonly originalArgs: readonly Expression[];
    readonly call?: FunctionCall;
    constructor(context: ExpressionContext, ast: ExpressionASTNode | undefined, operator: t_OverloadableOperators, args: readonly Expression[], selectedFunctionEntity: FunctionEntity);
    createDefaultOutlet(this: CompiledNonMemberOperatorOverloadExpression, element: JQuery, parent?: ConstructOutlet): NonMemberOperatorOverloadExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedNonMemberOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends NonMemberOperatorOverloadExpression {
    readonly type: T;
    readonly valueCategory: V;
    readonly call: TypedFunctionCall<FunctionType<CompleteReturnType>>;
}
export interface CompiledNonMemberOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends TypedNonMemberOperatorOverloadExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly originalArgs: readonly CompiledExpression[];
    readonly call: CompiledFunctionCall<FunctionType<CompleteReturnType>>;
}
export declare class RuntimeNonMemberOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T, V, CompiledNonMemberOperatorOverloadExpression<T, V>> {
    readonly call: RuntimeFunctionCall<FunctionType<CompleteReturnType>>;
    constructor(model: CompiledNonMemberOperatorOverloadExpression<T, V>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
export declare class MemberOperatorOverloadExpression extends Expression<ExpressionASTNode> {
    readonly construct_type = "member_operator_overload_expression";
    readonly type?: PeelReference<CompleteReturnType>;
    readonly valueCategory?: ValueCategory;
    readonly operator: t_OverloadableOperators;
    readonly originalArgs: readonly Expression[];
    readonly receiverExpression: TypedExpression<CompleteClassType>;
    readonly call?: FunctionCall;
    constructor(context: ExpressionContext, ast: ExpressionASTNode | undefined, operator: t_OverloadableOperators, receiverExpression: TypedExpression<CompleteClassType>, args: readonly Expression[], selectedFunctionEntity: FunctionEntity);
    createDefaultOutlet(this: CompiledMemberOperatorOverloadExpression, element: JQuery, parent?: ConstructOutlet): MemberOperatorOverloadExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedMemberOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends MemberOperatorOverloadExpression {
    readonly type: T;
    readonly valueCategory: V;
    readonly call: TypedFunctionCall<FunctionType<CompleteReturnType>>;
}
export interface CompiledMemberOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends TypedMemberOperatorOverloadExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly originalArgs: readonly CompiledExpression[];
    readonly receiverExpression: CompiledExpression<CompleteClassType>;
    readonly call: CompiledFunctionCall<FunctionType<CompleteReturnType>>;
}
export declare class RuntimeMemberOperatorOverloadExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends RuntimeExpression<T, V, CompiledMemberOperatorOverloadExpression<T, V>> {
    readonly receiverExpression: RuntimeExpression<CompleteClassType>;
    readonly call?: RuntimeFunctionCall<FunctionType<CompleteReturnType>>;
    constructor(model: CompiledMemberOperatorOverloadExpression<T, V>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
export declare type OperatorOverloadExpression = NonMemberOperatorOverloadExpression | MemberOperatorOverloadExpression | InvalidOperatorOverloadExpression;
export declare class InvalidOperatorOverloadExpression extends InvalidExpression {
    readonly construct_type = "invalid_operator_overload_expression";
    readonly operator: t_OverloadableOperators;
    readonly originalArgs: readonly Expression[];
    constructor(context: ExpressionContext, ast: ExpressionASTNode, op: t_OverloadableOperators, originalArgs: readonly Expression[]);
    createDefaultOutlet(this: never, element: JQuery, parent?: ConstructOutlet): never;
    describeEvalResult(depth: number): ConstructDescription;
}
export {};
