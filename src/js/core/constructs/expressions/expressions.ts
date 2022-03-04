import { AnythingConstructASTNode } from "../../../ast/ASTNode";
import { AddressOfExpressionASTNode, ArithmeticBinaryOperatorExpressionASTNode, ArrowExpressionASTNode, AssignmentExpressionASTNode, BitwiseNotExpressionASTNode, CommaASTNode, CompoundAssignmentExpressionASTNode, ConstCastExpressionASTNode, ConstructExpressionASTNode, CStyleCastExpressionASTNode, DeleteArrayExpressionASTNode, DeleteExpressionASTNode, DereferenceExpressionASTNode, DotExpressionASTNode, DynamicCastExpressionASTNode, ExpressionASTNode, FunctionCallExpressionASTNode, IdentifierExpressionASTNode, InitializerListExpressionASTNode, LogicalBinaryOperatorExpressionASTNode, LogicalNotExpressionASTNode, NewExpressionASTNode, NullptrExpressionASTNode, NumericLiteralASTNode, OpaqueExpressionASTNode, ParenthesesExpressionASTNode, PointerToMemberExpressionASTNode, PostfixIncrementExpressionASTNode, PrefixIncrementExpressionASTNode, ReinterpretCastExpressionASTNode, RelationalBinaryOperatorExpressionASTNode, SizeofExpressionASTNode, SizeofTypeExpressionASTNode, StaticCastExpressionASTNode, StringLiteralASTNode, SubscriptExpressionASTNode, TernaryASTNode, ThisExpressionASTNode, UnaryMinusExpressionASTNode, UnaryPlusExpressionASTNode } from "../../../ast/ast_expressions";
import { ExpressionContext } from "../../compilation/contexts";
import { ArithmeticType, ArrayElemType, AtomicType, CompleteClassType, CompleteObjectType, CompleteReturnType, ExpressionType, FunctionType, PeelReference, PointerToCompleteType as PointerToCompleteObjectType, PointerType } from "../../compilation/types";
import { RuntimeConstruct } from "../CPPConstruct";
import { AddressOfExpression, CompiledAddressOfExpression, RuntimeAddressOfExpression, TypedAddressOfExpression } from "./AddressOfExpression";
import { AnythingExpression } from "./AnythingExpression";
import { ArithmeticBinaryOperatorExpression, CompiledArithmeticBinaryOperatorExpression, RuntimeArithmeticBinaryOperator, TypedArithmeticBinaryOperatorExpression } from "./ArithmeticBinaryOperatorExpression";
import { ArrowExpression, CompiledFunctionArrowExpression, CompiledObjectArrowExpression, RuntimeFunctionArrowExpression, RuntimeObjectArrowExpression, TypedFunctionArrowExpression, TypedObjectArrowExpression } from "./ArrowExpression";
import { AssignmentExpression, CompiledAssignmentExpression, RuntimeAssignment, TypedAssignmentExpression } from "./AssignmentExpression";
import { AuxiliaryExpression, CompiledAuxiliaryExpression, TypedAuxiliaryExpression } from "./AuxiliaryExpression";
import { AnalyticBinaryOperatorExpression } from "./BinaryOperatorExpression";
import { CommaExpression, CompiledCommaExpression, CompiledTernaryExpression, RuntimeComma, RuntimeTernary, TernaryExpression, TypedCommaExpression, TypedTernaryExpression } from "./CommaExpression";
import { CompiledCompoundAssignmentExpression, CompoundAssignmentExpression, RuntimeCompoundAssignment, TypedCompoundAssignmentExpression } from "./CompoundAssignmentExpression";
import { CompiledDeleteArrayExpression, CompiledDeleteExpression, DeleteArrayExpression, DeleteExpression, RuntimeDeleteArrayExpression, RuntimeDeleteExpression, TypedDeleteArrayExpression, TypedDeleteExpression } from "./DeleteExpression";
import { CompiledDereferenceExpression, DereferenceExpression, RuntimeDereferenceExpression, TypedDereferenceExpression } from "./DereferenceExpression";
import { CompiledFunctionDotExpression, CompiledObjectDotExpression, DotExpression, RuntimeFunctionDotExpression, RuntimeObjectDotExpression, TypedFunctionDotExpression, TypedObjectDotExpression } from "./DotExpression";
import { CompiledExpression, ValueCategory } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { CompiledFunctionCallExpression, FunctionCallExpression, RuntimeFunctionCallExpression, TypedFunctionCallExpression } from "./FunctionCallExpression";
import { CompiledFunctionIdentifierExpression, CompiledObjectIdentifierExpression, IdentifierExpression, RuntimeFunctionIdentifierExpression, RuntimeObjectIdentifierExpression, TypedFunctionIdentifierExpression, TypedObjectIdentifierExpression } from "./IdentifierExpression";
import { CompiledImplicitConversion, ImplicitConversion, RuntimeImplicitConversion, TypedImplicitConversion } from "./ImplicitConversion";
import { CompiledInitializerListExpression, InitializerListExpression, RuntimeInitializerListExpression, TypedInitializerListExpression } from "./InitializerListExpression";
import { CompiledInputOperatorExpression, RuntimeInputOperatorExpression, TypedInputOperatorExpression } from "./InputOperatorExpression";
import { CompiledLogicalBinaryOperatorExpression, LogicalBinaryOperatorExpression, RuntimeLogicalBinaryOperatorExpression, TypedLogicalBinaryOperatorExpression } from "./LogicalBinaryOperatorExpression";
import { CompiledLogicalNotExpression, LogicalNotExpression, RuntimeLogicalNotExpression, TypedLogicalNotExpression } from "./LogicalNotExpression";
import { CompiledMagicFunctionCallExpression, MagicFunctionCallExpression, RuntimeMagicFunctionCallExpression, TypedMagicFunctionCallExpression } from "./MagicFunctionCallExpression";
import { CompiledNewArrayExpression, CompiledNewExpression, createNewExpressionFromAST, NewArrayExpression, NewExpression, NewObjectType, RuntimeNewArrayExpression, RuntimeNewExpression, TypedNewArrayExpression, TypedNewExpression } from "./NewExpression";
import { CompiledMemberOperatorOverloadExpression, CompiledNonMemberOperatorOverloadExpression, InvalidOperatorOverloadExpression, OperatorOverloadExpression, RuntimeMemberOperatorOverloadExpression, RuntimeNonMemberOperatorOverloadExpression, TypedMemberOperatorOverloadExpression, TypedNonMemberOperatorOverloadExpression } from "./OperatorOverloadExpression";
import { CompiledNullptrExpression, NullptrExpression, RuntimeNullptrExpression, TypedNullptrExpression } from "./NullptrExpression";
import { CompiledNumericLiteralExpression, NumericLiteralExpression, RuntimeNumericLiteral, TypedNumericLiteralExpression } from "./NumericLiteralExpression";
import { CompiledOpaqueExpression, OpaqueExpression, RuntimeOpaqueExpression, TypedOpaqueExpression } from "./OpaqueExpression";
import { CompiledOutputOperatorExpression, RuntimeOutputOperatorExpression, TypedOutputOperatorExpression } from "./OutputOperatorExpression";
import { CompiledParenthesesExpression, ParenthesesExpression, RuntimeParentheses, TypedParenthesesExpression } from "./ParenthesesExpression";
import { CompiledPointerComparisonExpression, RuntimePointerComparisonExpression, TypedPointerComparisonExpression } from "./PointerComparisonExpression";
import { CompiledPointerDifferenceExpression, RuntimePointerDifference, TypedPointerDifferenceExpression } from "./PointerDifferenceExpression";
import { CompiledPointerOffsetExpression, RuntimePointerOffset, TypedPointerOffsetExpression } from "./PointerOffsetExpression";
import { CompiledPostfixIncrementExpression, PostfixIncrementExpression, RuntimePostfixIncrementExpression, TypedPostfixIncrementExpression } from "./PostfixIncrementExpression";
import { CompiledPrefixIncrementExpression, PrefixIncrementExpression, RuntimePrefixIncrementExpression, TypedPrefixIncrementExpression } from "./PrefixIncrementExpression";
import { CompiledRelationalBinaryOperatorExpression, RelationalBinaryOperatorExpression, RuntimeRelationalBinaryOperator, TypedRelationalBinaryOperatorExpression } from "./RelationalBinaryOperatorExpression";
import { CompiledStringLiteralExpression, RuntimeStringLiteralExpression, StringLiteralExpression, TypedStringLiteralExpression } from "./StringLiteralExpression";
import { CompiledSubscriptExpression, RuntimeSubscriptExpression, SubscriptExpression, TypedSubscriptExpression } from "./SubscriptExpression";
import { CompiledThisExpression, RuntimeThisExpression, ThisExpression, TypedThisExpression } from "./ThisExpression";
import { CompiledUnaryMinusExpression, RuntimeUnaryMinusExpression, TypedUnaryMinusExpression, UnaryMinusExpression } from "./UnaryMinusExpression";
import { AnalyticUnaryOperatorExpression } from "./UnaryOperatorExpression";
import { CompiledUnaryPlusExpression, RuntimeUnaryPlusExpression, TypedUnaryPlusExpression, UnaryPlusExpression } from "./UnaryPlusExpression";
import { UnsupportedExpression } from "./UnsupportedExpression";


const ExpressionConstructsMap = {
    "comma_expression": (ast: CommaASTNode, context: ExpressionContext) => CommaExpression.createFromAST(ast, context),

    "ternary_expression": (ast: TernaryASTNode, context: ExpressionContext) => TernaryExpression.createFromAST(ast, context),

    "assignment_expression": (ast: AssignmentExpressionASTNode, context: ExpressionContext) => AssignmentExpression.createFromAST(ast, context),
    "compound_assignment_expression": (ast: CompoundAssignmentExpressionASTNode, context: ExpressionContext) => CompoundAssignmentExpression.createFromAST(ast, context),

    // binary operators
    "arithmetic_binary_operator_expression": (ast: ArithmeticBinaryOperatorExpressionASTNode, context: ExpressionContext) => ArithmeticBinaryOperatorExpression.createFromAST(ast, context),
    "relational_binary_operator_expression": (ast: RelationalBinaryOperatorExpressionASTNode, context: ExpressionContext) => RelationalBinaryOperatorExpression.createFromAST(ast, context),
    "logical_binary_operator_expression": (ast: LogicalBinaryOperatorExpressionASTNode, context: ExpressionContext) => LogicalBinaryOperatorExpression.createFromAST(ast, context),

    "pointer_to_member_expression": (ast: PointerToMemberExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "pointer-to-member"),

    "c_style_cast_expression": (ast: CStyleCastExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "c-style cast"),

    // prefix operators
    "prefix_increment_expression": (ast: PrefixIncrementExpressionASTNode, context: ExpressionContext) => PrefixIncrementExpression.createFromAST(ast, context),
    "dereference_expression": (ast: DereferenceExpressionASTNode, context: ExpressionContext) => DereferenceExpression.createFromAST(ast, context),
    "address_of_expression": (ast: AddressOfExpressionASTNode, context: ExpressionContext) => AddressOfExpression.createFromAST(ast, context),
    "unary_plus_expression": (ast: UnaryPlusExpressionASTNode, context: ExpressionContext) => UnaryPlusExpression.createFromAST(ast, context),
    "unary_minus_expression": (ast: UnaryMinusExpressionASTNode, context: ExpressionContext) => UnaryMinusExpression.createFromAST(ast, context),
    "logical_not_expression": (ast: LogicalNotExpressionASTNode, context: ExpressionContext) => LogicalNotExpression.createFromAST(ast, context),
    "bitwise_not_expression": (ast: BitwiseNotExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "bitwise not"),
    "sizeof_expression": (ast: SizeofExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "sizeof"),
    "sizeof_type_expression": (ast: SizeofTypeExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "sizeof (type)"),
    "new_expression": (ast: NewExpressionASTNode, context: ExpressionContext) => createNewExpressionFromAST(ast, context),
    "delete_expression": (ast: DeleteExpressionASTNode, context: ExpressionContext) => DeleteExpression.createFromAST(ast, context),
    "delete_array_expression": (ast: DeleteArrayExpressionASTNode, context: ExpressionContext) => DeleteArrayExpression.createFromAST(ast, context),

    // postfix operators
    "static_cast_expression": (ast: StaticCastExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "static cast"),
    "dynamic_cast_expression": (ast: DynamicCastExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "dynamic cast"),
    "reinterpret_cast_expression": (ast: ReinterpretCastExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "reinterpret cast"),
    "const_cast_expression": (ast: ConstCastExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "const cast"),
    "subscript_expression": (ast: SubscriptExpressionASTNode, context: ExpressionContext) => SubscriptExpression.createFromAST(ast, context),
    "function_call_expression": (ast: FunctionCallExpressionASTNode, context: ExpressionContext) => FunctionCallExpression.createFromAST(ast, context),
    "dot_expression": (ast: DotExpressionASTNode, context: ExpressionContext) => DotExpression.createFromAST(ast, context),
    "arrow_expression": (ast: ArrowExpressionASTNode, context: ExpressionContext) => ArrowExpression.createFromAST(ast, context),
    "postfix_increment_expression": (ast: PostfixIncrementExpressionASTNode, context: ExpressionContext) => PostfixIncrementExpression.createFromAST(ast, context),

    "construct_expression": (ast: ConstructExpressionASTNode, context: ExpressionContext) => new UnsupportedExpression(context, ast, "construct expression"),

    "identifier_expression": (ast: IdentifierExpressionASTNode, context: ExpressionContext) => IdentifierExpression.createFromAST(ast, context),

    "this_expression": (ast: ThisExpressionASTNode, context: ExpressionContext) => ThisExpression.createFromAST(ast, context),
    "nullptr_expression": (ast: NullptrExpressionASTNode, context: ExpressionContext) => NullptrExpression.createFromAST(ast, context),

    "numeric_literal_expression": (ast: NumericLiteralASTNode, context: ExpressionContext) => NumericLiteralExpression.createFromAST(ast, context),
    "string_literal_expression": (ast: StringLiteralASTNode, context: ExpressionContext) => StringLiteralExpression.createFromAST(ast, context),
    "parentheses_expression": (ast: ParenthesesExpressionASTNode, context: ExpressionContext) => ParenthesesExpression.createFromAST(ast, context),
    "initializer_list_expression": (ast: InitializerListExpressionASTNode, context: ExpressionContext) => InitializerListExpression.createFromAST(ast, context),
    "opaque_expression": (ast: OpaqueExpressionASTNode, context: ExpressionContext) => OpaqueExpression.createFromAST(ast, context),
    "anything_construct": (ast: AnythingConstructASTNode, context: ExpressionContext) => new AnythingExpression(context, ast)
}

/**
 * Creates an expression construct based on a given expression AST node.
 * If the `ast` argument has a union type that is a subtype of `ExpressionASTNode`,
 * this function's return type is inferred as corresponding union of construct types.
 * @param ast An expression AST node.
 * @param context The context in which this expression occurs.
 */
export function createExpressionFromAST<ASTType extends ExpressionASTNode>(ast: ASTType, context: ExpressionContext): ReturnType<(typeof ExpressionConstructsMap)[ASTType["construct_type"]]> {
    if (!ExpressionConstructsMap[ast.construct_type]) {
        console.log("Oops! Can't find expression construct type: " + ast.construct_type);
    }
    return <any>ExpressionConstructsMap[ast.construct_type](<any>ast, context);
}



export type AnalyticExpression =
    OperatorOverloadExpression |
    CommaExpression |
    TernaryExpression |
    AssignmentExpression |
    CompoundAssignmentExpression |
    AnalyticBinaryOperatorExpression |
    // PointerToMemberExpression |
    // CStyleCastExpression |
    AnalyticUnaryOperatorExpression |
    NewExpression |
    NewArrayExpression |
    DeleteExpression |
    DeleteArrayExpression |
    PostfixIncrementExpression |
    SubscriptExpression |
    DotExpression |
    ArrowExpression |
    FunctionCallExpression |
    // ConstructExpression |
    IdentifierExpression |
    ThisExpression |
    NullptrExpression |
    NumericLiteralExpression |
    StringLiteralExpression |
    ParenthesesExpression |
    InitializerListExpression |
    OpaqueExpression |
    MagicFunctionCallExpression |
    AuxiliaryExpression |
    UnsupportedExpression |
    ImplicitConversion;

export type TypedExpressionKinds<T extends ExpressionType, V extends ValueCategory> = {
    "unsupported_expression": never;
    "anything_construct": never;
    "invalid_operator_overload_expression": never;
    "comma_expression":
    T extends NonNullable<TypedCommaExpression["type"]> ? V extends NonNullable<TypedCommaExpression["valueCategory"]> ? TypedCommaExpression<T, V> : never :
    NonNullable<TypedCommaExpression["type"]> extends T ? V extends NonNullable<TypedCommaExpression["valueCategory"]> ? TypedCommaExpression : never : never;
    "ternary_expression":
    T extends NonNullable<TypedTernaryExpression["type"]> ? V extends NonNullable<TypedTernaryExpression["valueCategory"]> ? TypedTernaryExpression<T, V> : never :
    NonNullable<TypedTernaryExpression["type"]> extends T ? V extends NonNullable<TypedTernaryExpression["valueCategory"]> ? TypedTernaryExpression : never : never;
    "assignment_expression":
    T extends NonNullable<TypedAssignmentExpression["type"]> ? V extends NonNullable<TypedAssignmentExpression["valueCategory"]> ? TypedAssignmentExpression<T> : never :
    NonNullable<TypedAssignmentExpression["type"]> extends T ? V extends NonNullable<TypedAssignmentExpression["valueCategory"]> ? TypedAssignmentExpression : never : never;
    "compound_assignment_expression":
    T extends NonNullable<TypedCompoundAssignmentExpression["type"]> ? V extends NonNullable<TypedCompoundAssignmentExpression["valueCategory"]> ? TypedCompoundAssignmentExpression<T> : never :
    NonNullable<TypedCompoundAssignmentExpression["type"]> extends T ? V extends NonNullable<TypedCompoundAssignmentExpression["valueCategory"]> ? TypedCompoundAssignmentExpression : never : never;
    "arithmetic_binary_operator_expression":
    T extends NonNullable<TypedArithmeticBinaryOperatorExpression["type"]> ? V extends NonNullable<TypedArithmeticBinaryOperatorExpression["valueCategory"]> ? TypedArithmeticBinaryOperatorExpression<T> : never :
    NonNullable<TypedArithmeticBinaryOperatorExpression["type"]> extends T ? V extends NonNullable<TypedArithmeticBinaryOperatorExpression["valueCategory"]> ? TypedArithmeticBinaryOperatorExpression<ArithmeticType> : never : never;

    "pointer_difference_expression":
    T extends NonNullable<TypedPointerDifferenceExpression["type"]> ? V extends NonNullable<TypedPointerDifferenceExpression["valueCategory"]> ? TypedPointerDifferenceExpression : never :
    NonNullable<TypedPointerDifferenceExpression["type"]> extends T ? V extends NonNullable<TypedPointerDifferenceExpression["valueCategory"]> ? TypedPointerDifferenceExpression : never : never;
    "pointer_offset_expression":
    T extends NonNullable<TypedPointerOffsetExpression["type"]> ? V extends NonNullable<TypedPointerOffsetExpression["valueCategory"]> ? TypedPointerOffsetExpression<T> : never :
    NonNullable<TypedPointerOffsetExpression["type"]> extends T ? V extends NonNullable<TypedPointerOffsetExpression["valueCategory"]> ? TypedPointerOffsetExpression : never : never;
    "output_operator_expression":
    T extends NonNullable<TypedOutputOperatorExpression["type"]> ? V extends NonNullable<TypedOutputOperatorExpression["valueCategory"]> ? TypedOutputOperatorExpression : never :
    NonNullable<TypedOutputOperatorExpression["type"]> extends T ? V extends NonNullable<TypedOutputOperatorExpression["valueCategory"]> ? TypedOutputOperatorExpression : never : never;
    "input_operator_expression":
    T extends NonNullable<TypedInputOperatorExpression["type"]> ? V extends NonNullable<TypedInputOperatorExpression["valueCategory"]> ? TypedInputOperatorExpression : never :
    NonNullable<TypedInputOperatorExpression["type"]> extends T ? V extends NonNullable<TypedInputOperatorExpression["valueCategory"]> ? TypedInputOperatorExpression : never : never;
    "relational_binary_operator_expression":
    T extends NonNullable<TypedRelationalBinaryOperatorExpression["type"]> ? V extends NonNullable<TypedRelationalBinaryOperatorExpression["valueCategory"]> ? TypedRelationalBinaryOperatorExpression : never :
    NonNullable<TypedRelationalBinaryOperatorExpression["type"]> extends T ? V extends NonNullable<TypedRelationalBinaryOperatorExpression["valueCategory"]> ? TypedRelationalBinaryOperatorExpression : never : never;
    "pointer_comparison_expression":
    T extends NonNullable<TypedPointerComparisonExpression["type"]> ? V extends NonNullable<TypedPointerComparisonExpression["valueCategory"]> ? TypedPointerComparisonExpression : never :
    NonNullable<TypedPointerComparisonExpression["type"]> extends T ? V extends NonNullable<TypedPointerComparisonExpression["valueCategory"]> ? TypedPointerComparisonExpression : never : never;
    "logical_binary_operator_expression":
    T extends NonNullable<TypedLogicalBinaryOperatorExpression["type"]> ? V extends NonNullable<TypedLogicalBinaryOperatorExpression["valueCategory"]> ? TypedLogicalBinaryOperatorExpression : never :
    NonNullable<TypedLogicalBinaryOperatorExpression["type"]> extends T ? V extends NonNullable<TypedLogicalBinaryOperatorExpression["valueCategory"]> ? TypedLogicalBinaryOperatorExpression : never : never;
    "non_member_operator_overload_expression":
    T extends NonNullable<TypedNonMemberOperatorOverloadExpression["type"]> ? V extends NonNullable<TypedNonMemberOperatorOverloadExpression["valueCategory"]> ? TypedNonMemberOperatorOverloadExpression<T,V> : never :
    NonNullable<TypedNonMemberOperatorOverloadExpression["type"]> extends T ? V extends NonNullable<TypedNonMemberOperatorOverloadExpression["valueCategory"]> ? TypedNonMemberOperatorOverloadExpression : never : never;
    "member_operator_overload_expression":
    T extends NonNullable<TypedMemberOperatorOverloadExpression["type"]> ? V extends NonNullable<TypedMemberOperatorOverloadExpression["valueCategory"]> ? TypedMemberOperatorOverloadExpression<T,V> : never :
    NonNullable<TypedMemberOperatorOverloadExpression["type"]> extends T ? V extends NonNullable<TypedMemberOperatorOverloadExpression["valueCategory"]> ? TypedMemberOperatorOverloadExpression : never : never;
    "prefix_increment_expression":
    T extends NonNullable<TypedPrefixIncrementExpression["type"]> ? V extends NonNullable<TypedPrefixIncrementExpression["valueCategory"]> ? TypedPrefixIncrementExpression<T> : never :
    NonNullable<TypedPrefixIncrementExpression["type"]> extends T ? V extends NonNullable<TypedPrefixIncrementExpression["valueCategory"]> ? TypedPrefixIncrementExpression : never : never;
    "dereference_expression":
    T extends NonNullable<TypedDereferenceExpression["type"]> ? V extends NonNullable<TypedDereferenceExpression["valueCategory"]> ? TypedDereferenceExpression<T> : never :
    NonNullable<TypedDereferenceExpression["type"]> extends T ? V extends NonNullable<TypedDereferenceExpression["valueCategory"]> ? TypedDereferenceExpression : never : never;
    "address_of_expression":
    T extends NonNullable<TypedAddressOfExpression["type"]> ? V extends NonNullable<TypedAddressOfExpression["valueCategory"]> ? TypedAddressOfExpression<T> : never :
    NonNullable<TypedAddressOfExpression["type"]> extends T ? V extends NonNullable<TypedAddressOfExpression["valueCategory"]> ? TypedAddressOfExpression : never : never;
    "new_expression":
    T extends NonNullable<TypedNewExpression["type"]> ? V extends NonNullable<TypedNewExpression["valueCategory"]> ? TypedNewExpression<T> : never :
    NonNullable<TypedNewExpression["type"]> extends T ? V extends NonNullable<TypedNewExpression["valueCategory"]> ? TypedNewExpression : never : never;
    "new_array_expression":
    T extends NonNullable<TypedNewArrayExpression["type"]> ? V extends NonNullable<TypedNewArrayExpression["valueCategory"]> ? TypedNewArrayExpression<T> : never :
    NonNullable<TypedNewArrayExpression["type"]> extends T ? V extends NonNullable<TypedNewArrayExpression["valueCategory"]> ? TypedNewArrayExpression : never : never;
    "delete_expression":
    T extends NonNullable<TypedDeleteExpression["type"]> ? V extends NonNullable<TypedDeleteExpression["valueCategory"]> ? TypedDeleteExpression : never :
    NonNullable<TypedDeleteExpression["type"]> extends T ? V extends NonNullable<TypedDeleteExpression["valueCategory"]> ? TypedDeleteExpression : never : never;
    "delete_array_expression":
    T extends NonNullable<TypedDeleteArrayExpression["type"]> ? V extends NonNullable<TypedDeleteArrayExpression["valueCategory"]> ? TypedDeleteArrayExpression : never :
    NonNullable<TypedDeleteArrayExpression["type"]> extends T ? V extends NonNullable<TypedDeleteArrayExpression["valueCategory"]> ? TypedDeleteArrayExpression : never : never;
    "this_expression":
    T extends NonNullable<TypedThisExpression["type"]> ? V extends NonNullable<TypedThisExpression["valueCategory"]> ? TypedThisExpression<T> : never :
    NonNullable<TypedThisExpression["type"]> extends T ? V extends NonNullable<TypedThisExpression["valueCategory"]> ? TypedThisExpression : never : never;
    "nullptr_expression":
    T extends NonNullable<TypedNullptrExpression["type"]> ? V extends NonNullable<TypedNullptrExpression["valueCategory"]> ? TypedNullptrExpression : never :
    NonNullable<TypedNullptrExpression["type"]> extends T ? V extends NonNullable<TypedNullptrExpression["valueCategory"]> ? TypedNullptrExpression : never : never;
    "unary_plus_expression":
    T extends NonNullable<TypedUnaryPlusExpression["type"]> ? V extends NonNullable<TypedUnaryPlusExpression["valueCategory"]> ? TypedUnaryPlusExpression<T> : never :
    NonNullable<TypedUnaryPlusExpression["type"]> extends T ? V extends NonNullable<TypedUnaryPlusExpression["valueCategory"]> ? TypedUnaryPlusExpression : never : never;
    "unary_minus_expression":
    T extends NonNullable<TypedUnaryMinusExpression["type"]> ? V extends NonNullable<TypedUnaryMinusExpression["valueCategory"]> ? TypedUnaryMinusExpression<T> : never :
    NonNullable<TypedUnaryMinusExpression["type"]> extends T ? V extends NonNullable<TypedUnaryMinusExpression["valueCategory"]> ? TypedUnaryMinusExpression : never : never;
    "logical_not_expression":
    T extends NonNullable<TypedLogicalNotExpression["type"]> ? V extends NonNullable<TypedLogicalNotExpression["valueCategory"]> ? TypedLogicalNotExpression : never :
    NonNullable<TypedLogicalNotExpression["type"]> extends T ? V extends NonNullable<TypedLogicalNotExpression["valueCategory"]> ? TypedLogicalNotExpression : never : never;
    "postfix_increment_expression":
    T extends NonNullable<TypedPostfixIncrementExpression["type"]> ? V extends NonNullable<TypedPostfixIncrementExpression["valueCategory"]> ? TypedPostfixIncrementExpression<T> : never :
    NonNullable<TypedPostfixIncrementExpression["type"]> extends T ? V extends NonNullable<TypedPostfixIncrementExpression["valueCategory"]> ? TypedPostfixIncrementExpression : never : never;
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
    "initializer_list_expression":
    T extends NonNullable<TypedInitializerListExpression["type"]> ? V extends NonNullable<TypedInitializerListExpression["valueCategory"]> ? TypedInitializerListExpression<T> : never :
    NonNullable<TypedInitializerListExpression["type"]> extends T ? V extends NonNullable<TypedInitializerListExpression["valueCategory"]> ? TypedInitializerListExpression : never : never;
    "opaque_expression":
    T extends NonNullable<TypedOpaqueExpression["type"]> ? V extends NonNullable<TypedOpaqueExpression["valueCategory"]> ? TypedOpaqueExpression<T, V> : never :
    NonNullable<TypedOpaqueExpression["type"]> extends T ? V extends NonNullable<TypedOpaqueExpression["valueCategory"]> ? TypedOpaqueExpression : never : never;
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

export type CompiledExpressionKinds<T extends ExpressionType, V extends ValueCategory> = {
    "unsupported_expression": never;
    "anything_construct": never;
    "invalid_operator_overload_expression": never;
    "comma_expression": T extends NonNullable<CompiledCommaExpression["type"]> ? V extends NonNullable<CompiledCommaExpression["valueCategory"]> ? CompiledCommaExpression<T, V> : never : never;
    "ternary_expression": T extends NonNullable<CompiledTernaryExpression["type"]> ? V extends NonNullable<CompiledTernaryExpression["valueCategory"]> ? CompiledTernaryExpression<T, V> : never : never;
    "assignment_expression": T extends NonNullable<CompiledAssignmentExpression["type"]> ? V extends NonNullable<CompiledAssignmentExpression["valueCategory"]> ? CompiledAssignmentExpression<T> : never : never;
    "compound_assignment_expression": T extends NonNullable<CompiledCompoundAssignmentExpression["type"]> ? V extends NonNullable<CompiledCompoundAssignmentExpression["valueCategory"]> ? CompiledCompoundAssignmentExpression<T> : never : never;

    "arithmetic_binary_operator_expression":
    T extends NonNullable<CompiledArithmeticBinaryOperatorExpression["type"]> ? V extends NonNullable<CompiledArithmeticBinaryOperatorExpression["valueCategory"]> ? CompiledArithmeticBinaryOperatorExpression<T> : never :
    NonNullable<ArithmeticBinaryOperatorExpression["type"]> extends T ? V extends NonNullable<CompiledArithmeticBinaryOperatorExpression["valueCategory"]> ? CompiledArithmeticBinaryOperatorExpression<ArithmeticType> : never : never;

    "pointer_difference_expression": T extends NonNullable<CompiledPointerDifferenceExpression["type"]> ? V extends NonNullable<CompiledPointerDifferenceExpression["valueCategory"]> ? CompiledPointerDifferenceExpression : never : never;
    "pointer_offset_expression": T extends NonNullable<CompiledPointerOffsetExpression["type"]> ? V extends NonNullable<CompiledPointerOffsetExpression["valueCategory"]> ? CompiledPointerOffsetExpression<T> : never : never;
    "output_operator_expression": T extends NonNullable<CompiledOutputOperatorExpression["type"]> ? V extends NonNullable<CompiledOutputOperatorExpression["valueCategory"]> ? CompiledOutputOperatorExpression : never : never;
    "input_operator_expression": T extends NonNullable<CompiledInputOperatorExpression["type"]> ? V extends NonNullable<CompiledInputOperatorExpression["valueCategory"]> ? CompiledInputOperatorExpression : never : never;
    "relational_binary_operator_expression": T extends NonNullable<CompiledRelationalBinaryOperatorExpression["type"]> ? V extends NonNullable<CompiledRelationalBinaryOperatorExpression["valueCategory"]> ? CompiledRelationalBinaryOperatorExpression : never : never;
    "pointer_comparison_expression": T extends NonNullable<CompiledPointerComparisonExpression["type"]> ? V extends NonNullable<CompiledPointerComparisonExpression["valueCategory"]> ? CompiledPointerComparisonExpression : never : never;
    "logical_binary_operator_expression": T extends NonNullable<CompiledLogicalBinaryOperatorExpression["type"]> ? V extends NonNullable<CompiledLogicalBinaryOperatorExpression["valueCategory"]> ? CompiledLogicalBinaryOperatorExpression : never : never;
    "non_member_operator_overload_expression": T extends NonNullable<CompiledNonMemberOperatorOverloadExpression["type"]> ? V extends NonNullable<CompiledNonMemberOperatorOverloadExpression["valueCategory"]> ? CompiledNonMemberOperatorOverloadExpression<T,V> : never : never;
    "member_operator_overload_expression": T extends NonNullable<CompiledMemberOperatorOverloadExpression["type"]> ? V extends NonNullable<CompiledMemberOperatorOverloadExpression["valueCategory"]> ? CompiledMemberOperatorOverloadExpression<T,V> : never : never;
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
}

export type AnalyticTypedExpression<C extends AnalyticExpression, T extends ExpressionType = NonNullable<C["type"]>, V extends ValueCategory = NonNullable<C["valueCategory"]>> = TypedExpressionKinds<T, V>[C["construct_type"]];
export type AnalyticCompiledExpression<C extends AnalyticExpression, T extends ExpressionType = NonNullable<C["type"]>, V extends ValueCategory = NonNullable<C["valueCategory"]>> = CompiledExpressionKinds<T, V>[C["construct_type"]];






const ExpressionConstructsRuntimeMap = {
    "unsupported_expression": (construct: UnsupportedExpression, parent: RuntimeConstruct) => { throw new Error("Cannot create a runtime instance of an unsupported construct."); },
    "anything_construct": (construct: AnythingExpression, parent: RuntimeConstruct) => { throw new Error("Cannot create a runtime instance of an \"anything\" placeholder construct."); },
    "invalid_operator_overload_expression": (construct: UnsupportedExpression, parent: RuntimeConstruct) => { throw new Error("Cannot create a runtime instance of an invalid operator overload expression."); },
    "comma_expression": <T extends CompiledCommaExpression["type"], V extends ValueCategory>(construct: CompiledCommaExpression<T, V>, parent: RuntimeConstruct) => new RuntimeComma(construct, parent),
    "ternary_expression": <T extends CompiledTernaryExpression["type"], V extends ValueCategory>(construct: CompiledTernaryExpression<T, V>, parent: RuntimeConstruct) => new RuntimeTernary(construct, parent),
    "assignment_expression": <T extends CompiledAssignmentExpression["type"]>(construct: CompiledAssignmentExpression<T>, parent: RuntimeConstruct) => new RuntimeAssignment(construct, parent),
    "compound_assignment_expression": <T extends CompiledCompoundAssignmentExpression["type"]>(construct: CompiledCompoundAssignmentExpression<T>, parent: RuntimeConstruct) => new RuntimeCompoundAssignment(construct, parent),
    "arithmetic_binary_operator_expression": <T extends CompiledArithmeticBinaryOperatorExpression["type"]>(construct: CompiledArithmeticBinaryOperatorExpression<T>, parent: RuntimeConstruct) => new RuntimeArithmeticBinaryOperator(construct, parent),
    "pointer_difference_expression": (construct: CompiledPointerDifferenceExpression, parent: RuntimeConstruct) => new RuntimePointerDifference(construct, parent),
    "pointer_offset_expression": <T extends CompiledPointerOffsetExpression["type"]>(construct: CompiledPointerOffsetExpression<T>, parent: RuntimeConstruct) => new RuntimePointerOffset(construct, parent),
    "output_operator_expression": (construct: CompiledOutputOperatorExpression, parent: RuntimeConstruct) => new RuntimeOutputOperatorExpression(construct, parent),
    "input_operator_expression": (construct: CompiledInputOperatorExpression, parent: RuntimeConstruct) => new RuntimeInputOperatorExpression(construct, parent),
    "relational_binary_operator_expression": <T extends CompiledRelationalBinaryOperatorExpression["type"]>(construct: CompiledRelationalBinaryOperatorExpression<T>, parent: RuntimeConstruct) => new RuntimeRelationalBinaryOperator(construct, parent),
    "pointer_comparison_expression": (construct: CompiledPointerComparisonExpression, parent: RuntimeConstruct) => new RuntimePointerComparisonExpression(construct, parent),
    "logical_binary_operator_expression": (construct: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct) => new RuntimeLogicalBinaryOperatorExpression(construct, parent),
    "non_member_operator_overload_expression": <T extends CompiledNonMemberOperatorOverloadExpression["type"], V extends ValueCategory>(construct: CompiledNonMemberOperatorOverloadExpression<T, V>, parent: RuntimeConstruct) => new RuntimeNonMemberOperatorOverloadExpression(construct, parent),
    "member_operator_overload_expression": <T extends CompiledMemberOperatorOverloadExpression["type"], V extends ValueCategory>(construct: CompiledMemberOperatorOverloadExpression<T, V>, parent: RuntimeConstruct) => new RuntimeMemberOperatorOverloadExpression(construct, parent),
    "prefix_increment_expression": <T extends CompiledPrefixIncrementExpression["type"]>(construct: CompiledPrefixIncrementExpression<T>, parent: RuntimeConstruct) => new RuntimePrefixIncrementExpression(construct, parent),
    "dereference_expression": <T extends CompiledDereferenceExpression["type"]>(construct: CompiledDereferenceExpression<T>, parent: RuntimeConstruct) => new RuntimeDereferenceExpression(construct, parent),
    "address_of_expression": <T extends CompiledAddressOfExpression["type"]>(construct: CompiledAddressOfExpression<T>, parent: RuntimeConstruct) => new RuntimeAddressOfExpression(construct, parent),
    "new_expression": <T extends CompiledNewExpression["type"]>(construct: CompiledNewExpression<T>, parent: RuntimeConstruct) => new RuntimeNewExpression(construct, parent),
    "new_array_expression": <T extends CompiledNewArrayExpression["type"]>(construct: CompiledNewArrayExpression<T>, parent: RuntimeConstruct) => new RuntimeNewArrayExpression(construct, parent),
    "delete_expression": (construct: CompiledDeleteExpression, parent: RuntimeConstruct) => new RuntimeDeleteExpression(construct, parent),
    "delete_array_expression": (construct: CompiledDeleteArrayExpression, parent: RuntimeConstruct) => new RuntimeDeleteArrayExpression(construct, parent),
    "this_expression": <T extends CompiledThisExpression["type"]>(construct: CompiledThisExpression<T>, parent: RuntimeConstruct) => new RuntimeThisExpression(construct, parent),
    "nullptr_expression": (construct: CompiledNullptrExpression, parent: RuntimeConstruct) => new RuntimeNullptrExpression(construct, parent),
    "unary_plus_expression": <T extends CompiledUnaryPlusExpression["type"]>(construct: CompiledUnaryPlusExpression<T>, parent: RuntimeConstruct) => new RuntimeUnaryPlusExpression(construct, parent),
    "unary_minus_expression": <T extends CompiledUnaryMinusExpression["type"]>(construct: CompiledUnaryMinusExpression<T>, parent: RuntimeConstruct) => new RuntimeUnaryMinusExpression(construct, parent),
    "logical_not_expression": (construct: CompiledLogicalNotExpression, parent: RuntimeConstruct) => new RuntimeLogicalNotExpression(construct, parent),
    "postfix_increment_expression": <T extends CompiledPostfixIncrementExpression["type"]>(construct: CompiledPostfixIncrementExpression<T>, parent: RuntimeConstruct) => new RuntimePostfixIncrementExpression(construct, parent),
    "subscript_expression": <T extends CompiledSubscriptExpression["type"]>(construct: CompiledSubscriptExpression<T>, parent: RuntimeConstruct) => new RuntimeSubscriptExpression(construct, parent),
    "dot_expression": (construct: CompiledObjectDotExpression | CompiledFunctionDotExpression, parent: RuntimeConstruct) => {
        if (construct.entity.declarationKind === "function") {
            return new RuntimeFunctionDotExpression(<any>construct, parent);
        }
        else {
            return new RuntimeObjectDotExpression(<any>construct, parent);
        }
    },
    "arrow_expression": (construct: CompiledObjectArrowExpression | CompiledFunctionArrowExpression, parent: RuntimeConstruct) => {
        if (construct.entity.declarationKind === "function") {
            return new RuntimeFunctionArrowExpression(<any>construct, parent);
        }
        else {
            return new RuntimeObjectArrowExpression(<any>construct, parent);
        }
    },
    "identifier_expression": (construct: CompiledObjectIdentifierExpression | CompiledFunctionIdentifierExpression, parent: RuntimeConstruct) => {
        if (construct.entity.declarationKind === "function") {
            return new RuntimeFunctionIdentifierExpression(<any>construct, parent);
        }
        else {
            return new RuntimeObjectIdentifierExpression(<any>construct, parent);
        }
    },
    "numeric_literal_expression": <T extends CompiledNumericLiteralExpression["type"]>(construct: CompiledNumericLiteralExpression<T>, parent: RuntimeConstruct) => new RuntimeNumericLiteral(construct, parent),
    "string_literal_expression": (construct: CompiledStringLiteralExpression, parent: RuntimeConstruct) => new RuntimeStringLiteralExpression(construct, parent),
    "parentheses_expression": <T extends CompiledParenthesesExpression["type"], V extends ValueCategory>(construct: CompiledParenthesesExpression<T, V>, parent: RuntimeConstruct) => new RuntimeParentheses(construct, parent),
    "initializer_list_expression": <T extends CompiledInitializerListExpression["type"]>(construct: CompiledInitializerListExpression<T>, parent: RuntimeConstruct) => new RuntimeInitializerListExpression(construct, parent),
    "opaque_expression": <T extends CompiledOpaqueExpression["type"], V extends ValueCategory>(construct: CompiledOpaqueExpression<T, V>, parent: RuntimeConstruct) => new RuntimeOpaqueExpression(construct, parent),
    "auxiliary_expression": <T extends CompiledExpression["type"] = CompiledExpression["type"], V extends ValueCategory = ValueCategory>(construct: CompiledExpression<T, V>, parent: RuntimeConstruct) => { throw new Error("Auxiliary expressions must never be instantiated at runtime.") },
    "magic_function_call_expression": <RT extends CompiledMagicFunctionCallExpression["type"]>(construct: CompiledMagicFunctionCallExpression<RT>, parent: RuntimeConstruct) => new RuntimeMagicFunctionCallExpression(construct, parent),
    "function_call_expression": <RT extends CompiledFunctionCallExpression["type"]>(construct: CompiledFunctionCallExpression<RT>, parent: RuntimeConstruct) => new RuntimeFunctionCallExpression(construct, parent),
    "ImplicitConversion": <FromType extends CompleteObjectType, FromVC extends ValueCategory, ToType extends CompleteObjectType, ToVC extends ValueCategory>(construct: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct) => construct.createRuntimeExpression(parent)
};

export function createRuntimeExpression(construct: UnsupportedExpression, parent: RuntimeConstruct): never;
export function createRuntimeExpression(construct: AnythingExpression, parent: RuntimeConstruct): never;
export function createRuntimeExpression(construct: InvalidOperatorOverloadExpression, parent: RuntimeConstruct): never;
export function createRuntimeExpression<T extends ExpressionType, V extends ValueCategory>(construct: CompiledCommaExpression<T, V>, parent: RuntimeConstruct): RuntimeComma<T, V>;
export function createRuntimeExpression<T extends ExpressionType, V extends ValueCategory>(construct: CompiledTernaryExpression<T, V>, parent: RuntimeConstruct): RuntimeTernary<T, V>;
export function createRuntimeExpression<T extends AtomicType>(construct: CompiledAssignmentExpression<T>, parent: RuntimeConstruct): RuntimeAssignment<T>;
export function createRuntimeExpression<T extends ArithmeticType | PointerToCompleteObjectType>(construct: CompiledCompoundAssignmentExpression<T>, parent: RuntimeConstruct): RuntimeCompoundAssignment<T>;
export function createRuntimeExpression<T extends ArithmeticType>(construct: CompiledArithmeticBinaryOperatorExpression<T>, parent: RuntimeConstruct): RuntimeArithmeticBinaryOperator<T>;
export function createRuntimeExpression(construct: CompiledPointerDifferenceExpression, parent: RuntimeConstruct): RuntimePointerDifference;
export function createRuntimeExpression<T extends PointerToCompleteObjectType>(construct: CompiledPointerOffsetExpression<T>, parent: RuntimeConstruct): RuntimePointerOffset<T>;
export function createRuntimeExpression(construct: CompiledPointerOffsetExpression, parent: RuntimeConstruct): RuntimePointerOffset;
export function createRuntimeExpression<T extends ArithmeticType>(construct: CompiledRelationalBinaryOperatorExpression<T>, parent: RuntimeConstruct): RuntimeRelationalBinaryOperator<T>;
export function createRuntimeExpression(construct: CompiledPointerComparisonExpression, parent: RuntimeConstruct): RuntimePointerComparisonExpression;
export function createRuntimeExpression(construct: CompiledLogicalBinaryOperatorExpression, parent: RuntimeConstruct): RuntimeLogicalBinaryOperatorExpression;
export function createRuntimeExpression(construct: CompiledNonMemberOperatorOverloadExpression, parent: RuntimeConstruct): RuntimeNonMemberOperatorOverloadExpression;
export function createRuntimeExpression(construct: CompiledMemberOperatorOverloadExpression, parent: RuntimeConstruct): RuntimeMemberOperatorOverloadExpression;
export function createRuntimeExpression(construct: CompiledOutputOperatorExpression, parent: RuntimeConstruct): RuntimeOutputOperatorExpression;
export function createRuntimeExpression(construct: CompiledInputOperatorExpression, parent: RuntimeConstruct): RuntimeInputOperatorExpression;
export function createRuntimeExpression<T extends ArithmeticType | PointerToCompleteObjectType>(construct: CompiledPrefixIncrementExpression<T>, parent: RuntimeConstruct): RuntimePrefixIncrementExpression<T>;
export function createRuntimeExpression<T extends CompleteObjectType>(construct: CompiledDereferenceExpression<T>, parent: RuntimeConstruct): RuntimeDereferenceExpression<T>;
export function createRuntimeExpression<T extends PointerType>(construct: CompiledAddressOfExpression<T>, parent: RuntimeConstruct): RuntimeAddressOfExpression<T>;
export function createRuntimeExpression<T extends PointerType<NewObjectType>>(construct: CompiledNewExpression<T>, parent: RuntimeConstruct): RuntimeNewExpression<T>;
export function createRuntimeExpression<T extends PointerType<ArrayElemType>>(construct: CompiledNewArrayExpression<T>, parent: RuntimeConstruct): RuntimeNewArrayExpression<T>;
export function createRuntimeExpression(construct: CompiledDeleteArrayExpression, parent: RuntimeConstruct): RuntimeDeleteArrayExpression;
export function createRuntimeExpression<T extends PointerType<CompleteClassType>>(construct: CompiledThisExpression<T>, parent: RuntimeConstruct): RuntimeThisExpression<T>;
export function createRuntimeExpression(construct: CompiledNullptrExpression, parent: RuntimeConstruct): RuntimeNullptrExpression;
export function createRuntimeExpression<T extends ArithmeticType | PointerType>(construct: CompiledUnaryPlusExpression<T>, parent: RuntimeConstruct): RuntimeUnaryPlusExpression<T>;
export function createRuntimeExpression<T extends ArithmeticType>(construct: CompiledUnaryMinusExpression<T>, parent: RuntimeConstruct): RuntimeUnaryMinusExpression<T>;
export function createRuntimeExpression(construct: CompiledLogicalNotExpression, parent: RuntimeConstruct): RuntimeLogicalNotExpression;
export function createRuntimeExpression<T extends ArithmeticType | PointerToCompleteObjectType>(construct: CompiledPostfixIncrementExpression<T>, parent: RuntimeConstruct): RuntimePostfixIncrementExpression<T>;
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
export function createRuntimeExpression<T extends CompleteClassType>(construct: CompiledInitializerListExpression<T>, parent: RuntimeConstruct): RuntimeInitializerListExpression<T>;
export function createRuntimeExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory>(construct: AuxiliaryExpression<T, V>, parent: RuntimeConstruct): never;
export function createRuntimeExpression<RT extends PeelReference<CompleteReturnType>>(construct: CompiledMagicFunctionCallExpression<RT>, parent: RuntimeConstruct): RuntimeMagicFunctionCallExpression<RT>;
export function createRuntimeExpression<RT extends PeelReference<CompleteReturnType>>(construct: CompiledFunctionCallExpression<RT>, parent: RuntimeConstruct): RuntimeFunctionCallExpression<RT>;
export function createRuntimeExpression<FromType extends CompleteObjectType, FromVC extends ValueCategory, ToType extends CompleteObjectType, ToVC extends ValueCategory>(construct: CompiledImplicitConversion<FromType, FromVC, ToType, ToVC>, parent: RuntimeConstruct): RuntimeImplicitConversion<FromType, FromVC, ToType, ToVC>;
export function createRuntimeExpression<T extends ExpressionType, V extends ValueCategory, ConstructType extends AnalyticExpression, CompiledConstructType extends AnalyticCompiledExpression<ConstructType, T, V>>(construct: CompiledConstructType, parent: RuntimeConstruct): ReturnType<(typeof ExpressionConstructsRuntimeMap)[CompiledConstructType["construct_type"]]>;
export function createRuntimeExpression<T extends ExpressionType, V extends ValueCategory>(construct: CompiledExpression<T, V>, parent: RuntimeConstruct): RuntimeExpression<T, V>;
export function createRuntimeExpression<T extends ExpressionType, V extends ValueCategory, ConstructType extends CompiledExpression<T, V> | UnsupportedExpression>(construct: ConstructType, parent: RuntimeConstruct): RuntimeExpression<T, V> {
    return ((<any>ExpressionConstructsRuntimeMap)[construct.construct_type])(<any>construct, parent);
}





