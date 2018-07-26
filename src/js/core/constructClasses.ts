
import * as Statements from "./statements";
import * as Declarations from "./declarations";
import * as Initializers from "./initializers";
import * as Expressions from "./expressions";
import { ASTNode, ConstructContext, CPPConstruct } from "./constructs";

interface ConstructConstructor {
    new (ast: ASTNode, parent: CPPConstruct, context: ConstructContext) : CPPConstruct
}

export const CONSTRUCT_CLASSES: {[index:string]: any} = {
    labeled_statement : Statements.LabeledStatement,
    null_statement : Statements.NullStatement,
    expression_statement : Statements.ExpressionStatement,
    compound_statement : Statements.Block,
    opaque_function_body_block : Statements.OpaqueFunctionBodyBlock,
    selection_statement : Statements.Selection,
    switch_statement : Statements.SwitchStatement,
    while_statement : Statements.While,
    dowhile_statement : Statements.DoWhile,
    for_statement : Statements.For,
    break_statement : Statements.Break,
    continue_statement : Statements.Continue,
    return_statement : Statements.Return,
    declaration_statement : Statements.DeclarationStatement,
    simple_declaration : Declarations.Declaration,
    class_declaration : Declarations.ClassDeclaration,
    function_definition : Declarations.FunctionDefinition,
    constructor_definition : Declarations.ConstructorDefinition,
    destructor_definition : Declarations.DestructorDefinition,
    member_initializer : Initializers.MemberInitializer, // TODO: remove initializers from here?
    direct_initializer : Initializers.DirectInitializer,
    copy_initializer : Initializers.CopyInitializer,
    initializer_list : Initializers.InitializerList,
    declarator : Declarations.Declarator,
    parameter_declaration : Declarations.Parameter,
    assignment_expression : Expressions.Assignment,
    compound_assignment : Expressions.CompoundAssignment,
    ternary_expression : Expressions.Ternary,
    binary_expression : Expressions.BinaryOperator,
    cast_expression : Expressions.Cast,
    prefix_increment_expression : Expressions.Prefix,
    prefix_decrement_expression : Expressions.Prefix,
    sizeof_expression : Expressions.Unsupported,
    sizeof_type_expression : Expressions.Unsupported,
    dereference_expression : Expressions.Dereference,
    address_of_expression : Expressions.AddressOf,
    unary_plus_expression : Expressions.UnaryPlus,
    unary_minus_expression : Expressions.UnaryMinus,
    logical_not_expression : Expressions.LogicalNot,
    bitwise_not_expression : Expressions.BitwiseNot,
    new_expression : Expressions.NewExpression,
    delete_expression : Expressions.Delete,
    delete_array_expression : Expressions.DeleteArray,
    static_cast_expression : Expressions.StaticCast,
    dynamic_cast_expression : Expressions.DynamicCast,
    reinterpret_cast_expression : Expressions.ReinterpretCast,
    const_cast_expression : Expressions.ConstCast,
    subscript_expression : Expressions.Subscript,
    function_call_expression : Expressions.FunctionCallExpression,
    dot_expression : Expressions.Dot,
    arrow_expression : Expressions.Arrow,
    postfix_increment_expression : Expressions.Increment,
    postfix_decrement_expression : Expressions.Decrement,
    // construct_expression : Expressions.Construct,
    parentheses_expression : Expressions.Parentheses,
    this_expression : Expressions.ThisExpression,
    identifier_expression : Expressions.Identifier,
    literal : Expressions.Literal,
    string_literal : Expressions.StringLiteral,
    member_declaration : Declarations.MemberDeclaration
};
