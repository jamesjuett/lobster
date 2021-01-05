/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { BasicCPPConstruct, SuccessfullyCompiled, RuntimeConstruct, ASTNode, CPPConstruct, BlockContext, FunctionContext, InvalidConstruct } from "./constructs";
import { ExpressionASTNode } from "./expressions";
import { FunctionDefinition, ClassDefinition, AnalyticCompiledDeclaration, LocalDeclaration, LocalDeclarationASTNode, LocalSimpleDeclaration } from "./declarations";
import { DirectInitializer, CompiledDirectInitializer, RuntimeDirectInitializer } from "./initializers";
import { Bool } from "./types";
import { Expression, CompiledExpression, RuntimeExpression } from "./expressionBase";
import { StatementOutlet, ConstructOutlet, ExpressionStatementOutlet, NullStatementOutlet, DeclarationStatementOutlet, ReturnStatementOutlet, BlockOutlet, IfStatementOutlet, WhileStatementOutlet, ForStatementOutlet, BreakStatementOutlet } from "../view/codeOutlets";
import { RuntimeFunction } from "./functions";
export declare type StatementASTNode = LabeledStatementASTNode | BlockASTNode | IfStatementASTNode | IterationStatementASTNode | JumpStatementASTNode | DeclarationStatementASTNode | ExpressionStatementASTNode | NullStatementASTNode;
declare const StatementConstructsMap: {
    labeled_statement: (ast: LabeledStatementASTNode, context: BlockContext) => UnsupportedStatement;
    block: (ast: BlockASTNode, context: BlockContext) => Block;
    if_statement: (ast: IfStatementASTNode, context: BlockContext) => IfStatement;
    while_statement: (ast: WhileStatementASTNode, context: BlockContext) => WhileStatement;
    dowhile_statement: (ast: DoWhileStatementASTNode, context: BlockContext) => UnsupportedStatement;
    for_statement: (ast: ForStatementASTNode, context: BlockContext) => ForStatement;
    break_statement: (ast: BreakStatementASTNode, context: BlockContext) => BreakStatement;
    continue_statement: (ast: ContinueStatementASTNode, context: BlockContext) => UnsupportedStatement;
    return_statement: (ast: ReturnStatementASTNode, context: BlockContext) => ReturnStatement;
    declaration_statement: (ast: DeclarationStatementASTNode, context: BlockContext) => DeclarationStatement;
    expression_statement: (ast: ExpressionStatementASTNode, context: BlockContext) => ExpressionStatement;
    null_statement: (ast: NullStatementASTNode, context: BlockContext) => NullStatement;
};
export declare function createStatementFromAST<ASTType extends StatementASTNode>(ast: ASTType, context: BlockContext): ReturnType<(typeof StatementConstructsMap)[ASTType["construct_type"]]>;
export declare type CompiledStatementKinds = {
    "unsupported_statement": UnsupportedStatement;
    "block": CompiledBlock;
    "if_statement": CompiledIfStatement;
    "while_statement": CompiledWhileStatement;
    "for_statement": CompiledForStatement;
    "break_statement": CompiledBreakStatement;
    "return_statement": CompiledReturnStatement;
    "declaration_statement": CompiledDeclarationStatement;
    "expression_statement": CompiledExpressionStatement;
    "null_statement": CompiledNullStatement;
};
export declare type AnalyticCompiledStatement<C extends AnalyticStatement> = CompiledStatementKinds[C["construct_type"]];
declare const StatementConstructsRuntimeMap: {
    unsupported_statement: (construct: UnsupportedStatement, parent: RuntimeStatement) => never;
    block: (construct: CompiledBlock, parent: RuntimeStatement | RuntimeFunction) => RuntimeBlock;
    if_statement: (construct: CompiledIfStatement, parent: RuntimeStatement) => RuntimeIfStatement;
    while_statement: (construct: CompiledWhileStatement, parent: RuntimeStatement) => RuntimeWhileStatement;
    for_statement: (construct: CompiledForStatement, parent: RuntimeStatement) => RuntimeForStatement;
    break_statement: (construct: CompiledBreakStatement, parent: RuntimeStatement) => RuntimeBreakStatement;
    return_statement: (construct: CompiledReturnStatement, parent: RuntimeStatement) => RuntimeReturnStatement;
    declaration_statement: (construct: CompiledDeclarationStatement, parent: RuntimeStatement) => RuntimeDeclarationStatement;
    expression_statement: (construct: CompiledExpressionStatement, parent: RuntimeStatement) => RuntimeExpressionStatement;
    null_statement: (construct: CompiledNullStatement, parent: RuntimeStatement) => RuntimeNullStatement;
};
export declare function createRuntimeStatement<ConstructType extends CompiledBlock>(construct: ConstructType, parent: RuntimeStatement | RuntimeFunction): ReturnType<(typeof StatementConstructsRuntimeMap)[ConstructType["construct_type"]]>;
export declare function createRuntimeStatement<ConstructType extends AnalyticStatement, CompiledConstructType extends AnalyticCompiledStatement<ConstructType>>(construct: CompiledConstructType, parent: RuntimeConstruct): ReturnType<(typeof StatementConstructsRuntimeMap)[CompiledConstructType["construct_type"]]>;
export declare function createRuntimeStatement(construct: CompiledStatement, parent: RuntimeConstruct): RuntimeStatement;
export declare abstract class Statement<ASTType extends StatementASTNode = StatementASTNode> extends BasicCPPConstruct<BlockContext, ASTType> {
    abstract createDefaultOutlet(this: CompiledStatement, element: JQuery, parent?: ConstructOutlet): StatementOutlet;
    isBlock(): this is Block;
}
export interface CompiledStatement extends Statement, SuccessfullyCompiled {
}
export declare type AnalyticStatement = Block | IfStatement | WhileStatement | ForStatement | BreakStatement | ReturnStatement | DeclarationStatement | ExpressionStatement | NullStatement | UnsupportedStatement;
export declare abstract class RuntimeStatement<C extends CompiledStatement = CompiledStatement> extends RuntimeConstruct<C> {
    readonly containingRuntimeFunction: RuntimeFunction;
    constructor(model: C, parent: RuntimeStatement | RuntimeFunction);
}
export declare class UnsupportedStatement extends Statement {
    readonly construct_type = "unsupported_statement";
    constructor(context: BlockContext, ast: StatementASTNode, unsupportedName: string);
    createDefaultOutlet(element: JQuery, parent?: ConstructOutlet): never;
}
export interface ExpressionStatementASTNode extends ASTNode {
    readonly construct_type: "expression_statement";
    readonly expression: ExpressionASTNode;
}
export declare class ExpressionStatement extends Statement<ExpressionStatementASTNode> {
    readonly construct_type = "expression_statement";
    readonly expression: Expression;
    static createFromAST(ast: ExpressionStatementASTNode, context: BlockContext): ExpressionStatement;
    constructor(context: BlockContext, ast: ExpressionStatementASTNode, expression: Expression);
    createDefaultOutlet(this: CompiledExpressionStatement, element: JQuery, parent?: ConstructOutlet): ExpressionStatementOutlet;
    isTailChild(child: CPPConstruct): {
        isTail: boolean;
    };
}
export interface CompiledExpressionStatement extends ExpressionStatement, SuccessfullyCompiled {
    readonly expression: CompiledExpression;
}
export declare class RuntimeExpressionStatement extends RuntimeStatement<CompiledExpressionStatement> {
    expression: RuntimeExpression;
    private index;
    constructor(model: CompiledExpressionStatement, parent: RuntimeStatement);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
export interface NullStatementASTNode extends ASTNode {
    readonly construct_type: "null_statement";
}
export declare class NullStatement extends Statement<NullStatementASTNode> {
    readonly construct_type = "null_statement";
    createDefaultOutlet(this: CompiledNullStatement, element: JQuery, parent?: ConstructOutlet): NullStatementOutlet;
    isTailChild(child: CPPConstruct): {
        isTail: boolean;
    };
}
export interface CompiledNullStatement extends NullStatement, SuccessfullyCompiled {
}
export declare class RuntimeNullStatement extends RuntimeStatement<CompiledNullStatement> {
    constructor(model: CompiledNullStatement, parent: RuntimeStatement);
    upNextImpl(): void;
    stepForwardImpl(): void;
}
export interface DeclarationStatementASTNode extends ASTNode {
    readonly construct_type: "declaration_statement";
    readonly declaration: LocalDeclarationASTNode;
}
export declare class DeclarationStatement extends Statement<DeclarationStatementASTNode> {
    readonly construct_type = "declaration_statement";
    readonly declarations: readonly LocalDeclaration[] | FunctionDefinition | ClassDefinition | InvalidConstruct;
    static createFromAST(ast: DeclarationStatementASTNode, context: BlockContext): DeclarationStatement;
    constructor(context: BlockContext, ast: DeclarationStatementASTNode, declarations: readonly LocalDeclaration[] | FunctionDefinition | ClassDefinition | InvalidConstruct);
    createDefaultOutlet(this: CompiledDeclarationStatement, element: JQuery, parent?: ConstructOutlet): DeclarationStatementOutlet;
    isTailChild(child: CPPConstruct): {
        isTail: boolean;
    };
}
export interface CompiledDeclarationStatement extends DeclarationStatement, SuccessfullyCompiled {
    readonly declarations: readonly AnalyticCompiledDeclaration<LocalSimpleDeclaration>[];
}
export declare class RuntimeDeclarationStatement extends RuntimeStatement<CompiledDeclarationStatement> {
    readonly currentDeclarationIndex: number | null;
    constructor(model: CompiledDeclarationStatement, parent: RuntimeStatement);
    protected upNextImpl(): void;
    stepForwardImpl(): boolean;
}
export declare type JumpStatementASTNode = BreakStatementASTNode | ContinueStatementASTNode | ReturnStatementASTNode;
export interface BreakStatementASTNode extends ASTNode {
    readonly construct_type: "break_statement";
}
export declare class BreakStatement extends Statement<BreakStatementASTNode> {
    readonly construct_type = "break_statement";
    static createFromAST(ast: BreakStatementASTNode, context: BlockContext): BreakStatement;
    constructor(context: BlockContext, ast: BreakStatementASTNode, expression?: Expression);
    createDefaultOutlet(this: CompiledBreakStatement, element: JQuery, parent?: ConstructOutlet): BreakStatementOutlet;
}
export interface CompiledBreakStatement extends BreakStatement, SuccessfullyCompiled {
}
export declare class RuntimeBreakStatement extends RuntimeStatement<CompiledBreakStatement> {
    constructor(model: CompiledBreakStatement, parent: RuntimeStatement);
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
export interface ContinueStatementASTNode extends ASTNode {
    readonly construct_type: "continue_statement";
}
export interface ReturnStatementASTNode extends ASTNode {
    readonly construct_type: "return_statement";
    readonly expression: ExpressionASTNode;
}
export declare class ReturnStatement extends Statement<ReturnStatementASTNode> {
    readonly construct_type = "return_statement";
    readonly expression?: Expression;
    readonly returnInitializer?: DirectInitializer;
    static createFromAST(ast: ReturnStatementASTNode, context: BlockContext): ReturnStatement;
    constructor(context: BlockContext, ast: ReturnStatementASTNode, expression?: Expression);
    createDefaultOutlet(this: CompiledReturnStatement, element: JQuery, parent?: ConstructOutlet): ReturnStatementOutlet;
}
export interface CompiledReturnStatement extends ReturnStatement, SuccessfullyCompiled {
    readonly expression?: CompiledExpression;
    readonly returnInitializer?: CompiledDirectInitializer;
}
export declare class RuntimeReturnStatement extends RuntimeStatement<CompiledReturnStatement> {
    readonly returnInitializer?: RuntimeDirectInitializer;
    private index;
    constructor(model: CompiledReturnStatement, parent: RuntimeStatement);
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
export interface BlockASTNode extends ASTNode {
    readonly construct_type: "block";
    readonly statements: readonly StatementASTNode[];
}
export declare class Block extends Statement<BlockASTNode> {
    readonly construct_type = "block";
    readonly statements: readonly Statement[];
    static createFromAST(ast: BlockASTNode, context: FunctionContext): Block;
    constructor(context: FunctionContext, ast: BlockASTNode);
    isBlock(): this is Block;
    addStatement(statement: Statement): void;
    createDefaultOutlet(this: CompiledBlock, element: JQuery, parent?: ConstructOutlet): BlockOutlet;
}
export interface CompiledBlock extends Block, SuccessfullyCompiled {
    readonly statements: readonly CompiledStatement[];
}
export declare class RuntimeBlock extends RuntimeStatement<CompiledBlock> {
    readonly statements: readonly RuntimeStatement[];
    private index;
    constructor(model: CompiledBlock, parent: RuntimeStatement | RuntimeFunction);
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
export interface IfStatementASTNode extends ASTNode {
    readonly construct_type: "if_statement";
    readonly condition: ExpressionASTNode;
    readonly then: StatementASTNode;
    readonly otherwise?: StatementASTNode;
}
export declare class IfStatement extends Statement<IfStatementASTNode> {
    readonly construct_type = "if_statement";
    readonly condition: Expression;
    readonly then: Statement;
    readonly otherwise?: Statement;
    static createFromAST(ast: IfStatementASTNode, context: BlockContext): IfStatement;
    constructor(context: BlockContext, ast: IfStatementASTNode, condition: Expression, then: Statement, otherwise?: Statement);
    createDefaultOutlet(this: CompiledIfStatement, element: JQuery, parent?: ConstructOutlet): IfStatementOutlet;
}
export interface CompiledIfStatement extends IfStatement, SuccessfullyCompiled {
    readonly condition: CompiledExpression<Bool, "prvalue">;
    readonly then: CompiledStatement;
    readonly otherwise?: CompiledStatement;
}
export declare class RuntimeIfStatement extends RuntimeStatement<CompiledIfStatement> {
    readonly condition: RuntimeExpression<Bool, "prvalue">;
    readonly then: RuntimeStatement;
    readonly otherwise?: RuntimeStatement;
    private index;
    constructor(model: CompiledIfStatement, parent: RuntimeStatement);
    private static upNextFns;
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
export declare type IterationStatementASTNode = WhileStatementASTNode | DoWhileStatementASTNode | ForStatementASTNode;
export interface WhileStatementASTNode extends ASTNode {
    readonly construct_type: "while_statement";
    readonly condition: ExpressionASTNode;
    readonly body: StatementASTNode;
}
export declare class WhileStatement extends Statement<WhileStatementASTNode> {
    readonly construct_type = "while_statement";
    readonly condition: Expression;
    readonly body: Statement;
    static createFromAST(ast: WhileStatementASTNode, outerContext: BlockContext): WhileStatement;
    constructor(context: BlockContext, ast: WhileStatementASTNode, condition: Expression, body: Statement);
    createDefaultOutlet(this: CompiledWhileStatement, element: JQuery, parent?: ConstructOutlet): WhileStatementOutlet;
}
export interface CompiledWhileStatement extends WhileStatement, SuccessfullyCompiled {
    readonly condition: CompiledExpression<Bool, "prvalue">;
    readonly body: CompiledStatement;
}
export declare class RuntimeWhileStatement extends RuntimeStatement<CompiledWhileStatement> {
    readonly condition: RuntimeExpression<Bool, "prvalue">;
    readonly body?: RuntimeStatement;
    private index;
    constructor(model: CompiledWhileStatement, parent: RuntimeStatement);
    private static upNextFns;
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
export interface DoWhileStatementASTNode extends ASTNode {
    readonly construct_type: "dowhile_statement";
    readonly condition: ExpressionASTNode;
    readonly body: StatementASTNode;
}
export interface ForStatementASTNode extends ASTNode {
    readonly construct_type: "for_statement";
    readonly condition: ExpressionASTNode;
    readonly initial: ExpressionStatementASTNode | NullStatementASTNode | DeclarationStatementASTNode;
    readonly post?: ExpressionASTNode;
    readonly body: StatementASTNode;
}
export declare class ForStatement extends Statement<ForStatementASTNode> {
    readonly construct_type = "for_statement";
    readonly initial: ExpressionStatement | NullStatement | DeclarationStatement;
    readonly condition: Expression;
    readonly body: Statement;
    readonly post?: Expression;
    constructor(context: BlockContext, ast: ForStatementASTNode, initial: ExpressionStatement | NullStatement | DeclarationStatement, condition: Expression, body: Statement, post: Expression | undefined);
    static createFromAST(ast: ForStatementASTNode, outerContext: BlockContext): ForStatement;
    createDefaultOutlet(this: CompiledForStatement, element: JQuery, parent?: ConstructOutlet): ForStatementOutlet;
}
export interface CompiledForStatement extends ForStatement, SuccessfullyCompiled {
    readonly initial: CompiledExpressionStatement | CompiledNullStatement | CompiledDeclarationStatement;
    readonly condition: CompiledExpression<Bool, "prvalue">;
    readonly body: CompiledStatement;
    readonly post?: CompiledExpression;
}
export declare class RuntimeForStatement extends RuntimeStatement<CompiledForStatement> {
    readonly initial: RuntimeExpressionStatement | RuntimeNullStatement | RuntimeDeclarationStatement;
    readonly condition: RuntimeExpression<Bool, "prvalue">;
    readonly body?: RuntimeStatement;
    readonly post?: RuntimeExpression;
    private index;
    private upNextFns;
    constructor(model: CompiledForStatement, parent: RuntimeStatement);
    private static upNextFns;
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
export interface LabeledStatementASTNode extends ASTNode {
    readonly construct_type: "labeled_statement";
}
export interface SwitchStatementASTNode extends ASTNode {
    readonly construct_type: "switch_statement";
}
export {};
