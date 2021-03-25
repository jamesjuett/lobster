import { escapeString } from "../util/util";
import { ASTNode } from "./ASTNode";
import { TypeSpecifierASTNode } from "./ast_declarations";
import { ArrayPostfixDeclaratorASTNode, FunctionPostfixDeclaratorASTNode } from "./ast_declarators";
import { IdentifierASTNode } from "./ast_identifiers";
import { NewInitializerASTNode } from "./ast_initializers";

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
    ParenthesesExpressionASTNode |
    InitializerListExpressionASTNode |
    OpaqueExpressionASTNode;

export interface CommaASTNode extends ASTNode {
    readonly construct_type: "comma_expression";
    readonly operator: ",";
    readonly left: ExpressionASTNode;
    readonly right: ExpressionASTNode;
    readonly associativity: "left";
}

export interface TernaryASTNode extends ASTNode {
    readonly construct_type: "ternary_expression";
    readonly condition: ExpressionASTNode;
    readonly then: ExpressionASTNode;
    readonly otherwise: ExpressionASTNode;
}

export interface AssignmentExpressionASTNode extends ASTNode {
    readonly construct_type: "assignment_expression";
    readonly lhs: ExpressionASTNode;
    readonly operator: "=";
    readonly rhs: ExpressionASTNode;
}


export type t_CompoundAssignmentOperators = "*=" | "/=" | "%=" | "+=" | "-=" | ">>=" | "<<=" | "&=" | "^=" | "|=";

export interface CompoundAssignmentExpressionASTNode extends ASTNode {
    readonly construct_type: "compound_assignment_expression";
    readonly lhs: ExpressionASTNode;
    readonly operator: t_CompoundAssignmentOperators;
    readonly rhs: ExpressionASTNode;
}








export type BinaryOperatorExpressionASTNode =
    ArithmeticBinaryOperatorExpressionASTNode |
    RelationalBinaryOperatorExpressionASTNode |
    LogicalBinaryOperatorExpressionASTNode;

export type t_BinaryOperators = t_ArithmeticBinaryOperators | t_RelationalBinaryOperators | t_LogicalBinaryOperators;


export interface ArithmeticBinaryOperatorExpressionASTNode extends ASTNode {
    readonly construct_type: "arithmetic_binary_operator_expression";
    readonly operator: t_ArithmeticBinaryOperators;
    readonly left: ExpressionASTNode;
    readonly right: ExpressionASTNode;
    readonly associativity: "left";
}

export type t_ArithmeticBinaryOperators = "+" | "-" | "*" | "/" | "%" | "&" | "^" | "|" | "<<" | ">>";



export interface RelationalBinaryOperatorExpressionASTNode extends ASTNode {
    readonly construct_type: "relational_binary_operator_expression";
    readonly operator: t_RelationalBinaryOperators;
    readonly left: ExpressionASTNode;
    readonly right: ExpressionASTNode;
    readonly associativity: "left";
}

export type t_RelationalBinaryOperators = "<" | ">" | "<=" | ">=" | "==" | "!=";


export interface LogicalBinaryOperatorExpressionASTNode extends ASTNode {
    readonly construct_type: "logical_binary_operator_expression";
    readonly operator: t_LogicalBinaryOperators;
    readonly left: ExpressionASTNode;
    readonly right: ExpressionASTNode;
    readonly associativity: "left";
}

export type t_LogicalBinaryOperators = "&&" | "||";








export interface PointerToMemberExpressionASTNode extends ASTNode {
    readonly construct_type: "pointer_to_member_expression";
}

export interface CStyleCastExpressionASTNode extends ASTNode {
    readonly construct_type: "c_style_cast_expression";
}

export type UnaryOperatorExpressionASTNode =
    PrefixIncrementExpressionASTNode |
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

export type t_UnaryOperators = "++" | "--" | "*" | "&" | "+" | "-" | "!" | "~" | "sizeof" | "new" | "delete" | "delete[]";


export interface PrefixIncrementExpressionASTNode extends ASTNode {
    readonly construct_type: "prefix_increment_expression";
    readonly operator: "++" | "--";
    readonly operand: ExpressionASTNode;
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





export interface NewDeclaratorASTNode extends ASTNode {
    readonly sub?: NewDeclaratorASTNode; // parentheses
    readonly pointer?: NewDeclaratorASTNode;
    readonly reference?: NewDeclaratorASTNode;
    readonly const?: boolean;
    readonly volatile?: boolean;
    readonly postfixes?: readonly (ArrayPostfixDeclaratorASTNode | FunctionPostfixDeclaratorASTNode)[];
}

export interface NewExpressionASTNode extends ASTNode {
    readonly construct_type: "new_expression";
    readonly specs: TypeSpecifierASTNode;
    readonly declarator?: NewDeclaratorASTNode;
    readonly initializer?: NewInitializerASTNode;
}

export interface DeleteExpressionASTNode extends ASTNode {
    readonly construct_type: "delete_expression";
    readonly operand: ExpressionASTNode;
}

export interface DeleteArrayExpressionASTNode extends ASTNode {
    readonly construct_type: "delete_array_expression";
    readonly operand: ExpressionASTNode;
}









export type PostfixExpressionASTNode =
    StaticCastExpressionASTNode |
    DynamicCastExpressionASTNode |
    ReinterpretCastExpressionASTNode |
    ConstCastExpressionASTNode |
    SubscriptExpressionASTNode |
    FunctionCallExpressionASTNode |
    DotExpressionASTNode |
    ArrowExpressionASTNode |
    PostfixIncrementExpressionASTNode;


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
    readonly member: IdentifierASTNode;
}

export interface ArrowExpressionASTNode extends ASTNode {
    readonly construct_type: "arrow_expression";
    readonly operand: ExpressionASTNode;
    readonly member: IdentifierASTNode;
}

export interface PostfixIncrementExpressionASTNode extends ASTNode {
    readonly construct_type: "postfix_increment_expression";
    readonly operand: ExpressionASTNode;
    readonly operator: "++" | "--";
}





export interface ConstructExpressionASTNode extends ASTNode {
    readonly construct_type: "construct_expression";
}







export interface IdentifierExpressionASTNode extends ASTNode {
    readonly construct_type: "identifier_expression";
    readonly identifier: IdentifierASTNode;
}







export interface ThisExpressionASTNode extends ASTNode {
    readonly construct_type: "this_expression";
}










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




export interface StringLiteralASTNode extends ASTNode {
    readonly construct_type: "string_literal_expression";
    readonly value: string;
}





export interface FunctionCallExpressionASTNode extends ASTNode {
    readonly construct_type: "function_call_expression";
    readonly operand: ExpressionASTNode;
    readonly args: readonly ExpressionASTNode[];
}






export interface ParenthesesExpressionASTNode extends ASTNode {
    readonly construct_type: "parentheses_expression";
    readonly subexpression: ExpressionASTNode;
}






export interface InitializerListExpressionASTNode extends ASTNode {
    readonly construct_type: "initializer_list_expression";
    readonly elements: ExpressionASTNode[];
}





export interface OpaqueExpressionASTNode extends ASTNode {
    readonly construct_type: "opaque_expression";
    readonly id: string;
}