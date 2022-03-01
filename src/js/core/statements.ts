import {
    BasicCPPConstruct,
    SuccessfullyCompiled,
    RuntimeConstruct,
    CPPConstruct,
    BlockContext,
    FunctionContext,
    InvalidConstruct,
    createLoopContext,
    createBlockContext,
    SemanticContext,
    areSemanticallyEquivalent,
    areAllSemanticallyEquivalent,
} from "./constructs";
import { CPPError } from "./errors";
import {
    createExpressionFromAST,
    createRuntimeExpression,
    standardConversion,
} from "./expressions";
import { ExpressionASTNode } from "../ast/ast_expressions";
import {
    FunctionDefinition,
    VariableDefinition,
    ClassDefinition,
    AnalyticCompiledDeclaration,
    LocalDeclaration,
    createLocalDeclarationFromAST,
    LocalSimpleDeclaration,
} from "./declarations";
import {
    DirectInitializer,
    CompiledDirectInitializer,
    RuntimeDirectInitializer,
} from "./initializers";
import {
    VoidType,
    ReferenceType,
    Bool,
    isType,
    Int,
    isCompleteObjectType,
    isReferenceType,
    BoundedArrayType,
} from "./types";
import {
    ReturnByReferenceEntity,
    ReturnObjectEntity,
    BlockScope,
    LocalReferenceEntity,
} from "./entities";
import { Mutable, asMutable, assertNever, assert } from "../util/util";
import {
    Expression,
    CompiledExpression,
    RuntimeExpression,
} from "./expressionBase";
import {
    StatementOutlet,
    ConstructOutlet,
    ExpressionStatementOutlet,
    NullStatementOutlet,
    DeclarationStatementOutlet,
    ReturnStatementOutlet,
    BlockOutlet,
    IfStatementOutlet,
    WhileStatementOutlet,
    ForStatementOutlet,
    BreakStatementOutlet,
} from "../view/codeOutlets";
import { RuntimeFunction } from "./functions";
import { AnalyticConstruct, Predicates } from "./predicates";
import { Value } from "./runtimeEnvironment";
import { RuntimePotentialFullExpression } from "./PotentialFullExpression";
import { ArraySubobject, AutoObject } from "./objects";
import {
    LabeledStatementASTNode,
    BlockASTNode,
    IfStatementASTNode,
    WhileStatementASTNode,
    DoWhileStatementASTNode,
    ForStatementASTNode,
    BreakStatementASTNode,
    ContinueStatementASTNode,
    ReturnStatementASTNode,
    DeclarationStatementASTNode,
    ExpressionStatementASTNode,
    NullStatementASTNode,
    StatementASTNode,
} from "../ast/ast_statements";
import {
    ObjectDeallocator,
    CompiledObjectDeallocator,
    createLocalDeallocator,
    RuntimeObjectDeallocator,
} from "./ObjectDeallocator";
import { AnythingConstructASTNode } from "../ast/ASTNode";

const StatementConstructsMap = {
    labeled_statement: (ast: LabeledStatementASTNode, context: BlockContext) =>
        new UnsupportedStatement(context, ast, "labeled statement"),
    block: (ast: BlockASTNode, context: BlockContext) =>
        Block.createFromAST(ast, context),
    if_statement: (ast: IfStatementASTNode, context: BlockContext) =>
        IfStatement.createFromAST(ast, context),
    while_statement: (ast: WhileStatementASTNode, context: BlockContext) =>
        WhileStatement.createFromAST(ast, context),
    dowhile_statement: (ast: DoWhileStatementASTNode, context: BlockContext) =>
        new UnsupportedStatement(context, ast, "do-while loop"),
    for_statement: (ast: ForStatementASTNode, context: BlockContext) =>
        ForStatement.createFromAST(ast, context),
    break_statement: (ast: BreakStatementASTNode, context: BlockContext) =>
        BreakStatement.createFromAST(ast, context),
    continue_statement: (
        ast: ContinueStatementASTNode,
        context: BlockContext
    ) => new UnsupportedStatement(context, ast, "continue statement"),
    return_statement: (ast: ReturnStatementASTNode, context: BlockContext) =>
        ReturnStatement.createFromAST(ast, context),
    declaration_statement: (
        ast: DeclarationStatementASTNode,
        context: BlockContext
    ) => DeclarationStatement.createFromAST(ast, context),
    expression_statement: (
        ast: ExpressionStatementASTNode,
        context: BlockContext
    ) => ExpressionStatement.createFromAST(ast, context),
    null_statement: (ast: NullStatementASTNode, context: BlockContext) =>
        new NullStatement(context, ast),
    anything_construct: (
        ast: AnythingConstructASTNode,
        context: BlockContext
    ) => new AnythingStatement(context, ast),
};

export function createStatementFromAST<ASTType extends StatementASTNode>(
    ast: ASTType,
    context: BlockContext
): ReturnType<typeof StatementConstructsMap[ASTType["construct_type"]]> {
    return <any>StatementConstructsMap[ast.construct_type](<any>ast, context);
}

export type CompiledStatementKinds = {
    unsupported_statement: UnsupportedStatement;
    // "labeled_statement" :
    block: CompiledBlock;
    if_statement: CompiledIfStatement;
    while_statement: CompiledWhileStatement;
    // "dowhile_statement" :
    for_statement: CompiledForStatement;
    break_statement: CompiledBreakStatement;
    // "continue_statement" :
    return_statement: CompiledReturnStatement;
    declaration_statement: CompiledDeclarationStatement;
    expression_statement: CompiledExpressionStatement;
    null_statement: CompiledNullStatement;
};

export type AnalyticCompiledStatement<C extends AnalyticStatement> =
    CompiledStatementKinds[C["construct_type"]];

const StatementConstructsRuntimeMap = {
    unsupported_statement: (
        construct: UnsupportedStatement,
        parent: RuntimeStatement
    ) => {
        throw new Error(
            "Cannot create a runtime instance of an unsupported construct."
        );
    },
    // "labeled_statement" : (construct: LabeledStatement, parent: RuntimeStatement) => new UnsupportedStatement(context, "labeled statement").setAST(ast),
    block: (
        construct: CompiledBlock,
        parent: RuntimeStatement | RuntimeFunction
    ) => new RuntimeBlock(construct, parent),
    if_statement: (construct: CompiledIfStatement, parent: RuntimeStatement) =>
        new RuntimeIfStatement(construct, parent),
    while_statement: (
        construct: CompiledWhileStatement,
        parent: RuntimeStatement
    ) => new RuntimeWhileStatement(construct, parent),
    // "dowhile_statement" : (construct: DoWhileStatement, parent: RuntimeStatement) => new UnsupportedStatement(context, "do-while loop").setAST(ast),
    for_statement: (
        construct: CompiledForStatement,
        parent: RuntimeStatement
    ) => new RuntimeForStatement(construct, parent),
    break_statement: (
        construct: CompiledBreakStatement,
        parent: RuntimeStatement
    ) => new RuntimeBreakStatement(construct, parent),
    // "continue_statement" : (construct: ContinueStatement, parent: RuntimeStatement) => new UnsupportedStatement(context, "continue statement").setAST(ast),
    return_statement: (
        construct: CompiledReturnStatement,
        parent: RuntimeStatement
    ) => new RuntimeReturnStatement(construct, parent),
    declaration_statement: (
        construct: CompiledDeclarationStatement,
        parent: RuntimeStatement
    ) => new RuntimeDeclarationStatement(construct, parent),
    expression_statement: (
        construct: CompiledExpressionStatement,
        parent: RuntimeStatement
    ) => new RuntimeExpressionStatement(construct, parent),
    null_statement: (
        construct: CompiledNullStatement,
        parent: RuntimeStatement
    ) => new RuntimeNullStatement(construct, parent),
};

export function createRuntimeStatement<ConstructType extends CompiledBlock>(
    construct: ConstructType,
    parent: RuntimeStatement | RuntimeFunction
): ReturnType<
    typeof StatementConstructsRuntimeMap[ConstructType["construct_type"]]
>;
export function createRuntimeStatement<
    ConstructType extends AnalyticStatement,
    CompiledConstructType extends AnalyticCompiledStatement<ConstructType>
>(
    construct: CompiledConstructType,
    parent: RuntimeConstruct
): ReturnType<
    typeof StatementConstructsRuntimeMap[CompiledConstructType["construct_type"]]
>;
export function createRuntimeStatement(
    construct: CompiledStatement,
    parent: RuntimeConstruct
): RuntimeStatement;
export function createRuntimeStatement<
    ConstructType extends AnalyticCompiledStatement<AnalyticStatement>
>(construct: ConstructType, parent: RuntimeStatement) {
    return <any>(
        StatementConstructsRuntimeMap[construct.construct_type](
            <any>construct,
            parent
        )
    );
}

export abstract class Statement<
    ASTType extends StatementASTNode = StatementASTNode
> extends BasicCPPConstruct<BlockContext, ASTType> {
    public abstract createDefaultOutlet(
        this: CompiledStatement,
        element: JQuery,
        parent?: ConstructOutlet
    ): StatementOutlet;

    public isBlock(): this is Block {
        return false;
    }
}

export interface CompiledStatement extends Statement, SuccessfullyCompiled {}

export type AnalyticStatement =
    //LabeledStatement |
    | Block
    | IfStatement
    | WhileStatement
    // DoWhileStatement |
    | ForStatement
    | BreakStatement
    // ContinueStatement |
    | ReturnStatement
    | DeclarationStatement
    | ExpressionStatement
    | NullStatement
    | UnsupportedStatement;

export abstract class RuntimeStatement<
    C extends CompiledStatement = CompiledStatement
> extends RuntimeConstruct<C> {
    public readonly containingRuntimeFunction: RuntimeFunction;

    public constructor(model: C, parent: RuntimeStatement | RuntimeFunction) {
        super(model, "statement", parent);
        if (parent instanceof RuntimeFunction) {
            this.containingRuntimeFunction = parent;
        } else {
            this.containingRuntimeFunction = parent.containingRuntimeFunction;
        }
    }
}

export class UnsupportedStatement extends Statement {
    public readonly construct_type = "unsupported_statement";

    public constructor(
        context: BlockContext,
        ast: StatementASTNode,
        unsupportedName: string
    ) {
        super(context, ast);
        this.addNote(
            CPPError.lobster.unsupported_feature(this, unsupportedName)
        );
    }

    public createDefaultOutlet(
        element: JQuery,
        parent?: ConstructOutlet
    ): never {
        throw new Error(
            "Cannot create an outlet for an unsupported construct."
        );
    }

    public isSemanticallyEquivalent_impl(
        other: AnalyticConstruct,
        equivalenceContext: SemanticContext
    ): boolean {
        return other.construct_type === this.construct_type;
    }
}

export class AnythingStatement extends Statement {
    public readonly construct_type = "anything_construct";

    public constructor(
        context: BlockContext,
        ast: AnythingConstructASTNode | undefined
    ) {
        super(context, ast);
        this.addNote(CPPError.lobster.anything_construct(this));
    }

    public createDefaultOutlet(
        element: JQuery,
        parent?: ConstructOutlet
    ): never {
        throw new Error(
            'Cannot create an outlet for an "anything" placeholder construct.'
        );
    }

    public isSemanticallyEquivalent_impl(
        other: AnalyticConstruct,
        equivalenceContext: SemanticContext
    ): boolean {
        return true;
    }
}

export class ExpressionStatement extends Statement<ExpressionStatementASTNode> {
    public readonly construct_type = "expression_statement";

    public readonly expression: Expression;

    public static createFromAST(
        ast: ExpressionStatementASTNode,
        context: BlockContext
    ) {
        return new ExpressionStatement(
            context,
            ast,
            createExpressionFromAST(ast.expression, context)
        );
    }

    public constructor(
        context: BlockContext,
        ast: ExpressionStatementASTNode,
        expression: Expression
    ) {
        super(context, ast);
        this.attach((this.expression = expression));
    }

    public createDefaultOutlet(
        this: CompiledExpressionStatement,
        element: JQuery,
        parent?: ConstructOutlet
    ) {
        return new ExpressionStatementOutlet(element, this, parent);
    }

    public isTailChild(child: CPPConstruct) {
        return { isTail: true };
    }

    public isSemanticallyEquivalent_impl(
        other: AnalyticConstruct,
        equivalenceContext: SemanticContext
    ): boolean {
        return (
            other.construct_type === this.construct_type &&
            areSemanticallyEquivalent(
                this.expression,
                other.expression,
                equivalenceContext
            )
        );
    }
}

export interface CompiledExpressionStatement
    extends ExpressionStatement,
        SuccessfullyCompiled {
    readonly expression: CompiledExpression;
}

export class RuntimeExpressionStatement extends RuntimeStatement<CompiledExpressionStatement> {
    public expression: RuntimeExpression;
    private index = "expr";

    public constructor(
        model: CompiledExpressionStatement,
        parent: RuntimeStatement
    ) {
        super(model, parent);
        this.expression = createRuntimeExpression(this.model.expression, this);
    }

    protected upNextImpl() {
        if (this.index === "expr") {
            this.sim.push(this.expression);
            this.index = "done";
        } else {
            this.startCleanup();
        }
    }

    protected stepForwardImpl() {}
}

export class NullStatement extends Statement<NullStatementASTNode> {
    public readonly construct_type = "null_statement";

    public createDefaultOutlet(
        this: CompiledNullStatement,
        element: JQuery,
        parent?: ConstructOutlet
    ) {
        return new NullStatementOutlet(element, this, parent);
    }

    public isTailChild(child: CPPConstruct) {
        return { isTail: true }; // Note: NullStatement will never actually have children, so this isn't used
    }

    public isSemanticallyEquivalent_impl(
        other: AnalyticConstruct,
        equivalenceContext: SemanticContext
    ): boolean {
        return other.construct_type === this.construct_type;
    }
}

export interface CompiledNullStatement
    extends NullStatement,
        SuccessfullyCompiled {}

export class RuntimeNullStatement extends RuntimeStatement<CompiledNullStatement> {
    public constructor(model: CompiledNullStatement, parent: RuntimeStatement) {
        super(model, parent);
    }

    public upNextImpl() {
        this.startCleanup();
    }

    public stepForwardImpl() {
        // nothing to do
    }
}

export class DeclarationStatement extends Statement<DeclarationStatementASTNode> {
    public readonly construct_type = "declaration_statement";

    public readonly declarations:
        | readonly LocalDeclaration[]
        | FunctionDefinition
        | ClassDefinition
        | InvalidConstruct;

    public static createFromAST(
        ast: DeclarationStatementASTNode,
        context: BlockContext
    ) {
        return new DeclarationStatement(
            context,
            ast,
            createLocalDeclarationFromAST(ast.declaration, context)
        );
    }

    public constructor(
        context: BlockContext,
        ast: DeclarationStatementASTNode,
        declarations:
            | readonly LocalDeclaration[]
            | FunctionDefinition
            | ClassDefinition
            | InvalidConstruct
    ) {
        super(context, ast);

        if (declarations instanceof InvalidConstruct) {
            this.attach((this.declarations = declarations));
            return;
        }

        if (declarations instanceof FunctionDefinition) {
            this.addNote(CPPError.stmt.function_definition_prohibited(this));
            this.attach((this.declarations = declarations));
            return;
        }

        if (declarations instanceof ClassDefinition) {
            this.addNote(
                CPPError.lobster.unsupported_feature(this, "local classes")
            );
            this.attach((this.declarations = declarations));
            return;
        }

        this.attachAll((this.declarations = declarations));
    }

    public createDefaultOutlet(
        this: CompiledDeclarationStatement,
        element: JQuery,
        parent?: ConstructOutlet
    ) {
        return new DeclarationStatementOutlet(element, this, parent);
    }

    public isTailChild(child: CPPConstruct) {
        return { isTail: true };
    }

    public isSemanticallyEquivalent_impl(
        other: AnalyticConstruct,
        equivalenceContext: SemanticContext
    ): boolean {
        return (
            other.construct_type === this.construct_type &&
            Array.isArray(this.declarations) &&
            Array.isArray(other.declarations) &&
            areAllSemanticallyEquivalent(
                this.declarations,
                other.declarations,
                equivalenceContext
            )
        );
    }
}

export interface CompiledDeclarationStatement
    extends DeclarationStatement,
        SuccessfullyCompiled {
    // narrows to compiled version and rules out a FunctionDefinition, ClassDefinition, or InvalidConstruct
    readonly declarations: readonly AnalyticCompiledDeclaration<LocalSimpleDeclaration>[];
}

export class RuntimeDeclarationStatement extends RuntimeStatement<CompiledDeclarationStatement> {
    public readonly currentDeclarationIndex: number | null = null;

    public constructor(
        model: CompiledDeclarationStatement,
        parent: RuntimeStatement
    ) {
        super(model, parent);
    }

    protected upNextImpl() {
        let nextIndex =
            this.currentDeclarationIndex === null
                ? 0
                : this.currentDeclarationIndex + 1;

        let initializers = this.model.declarations.map((d) => d.initializer);
        if (nextIndex < initializers.length) {
            (<Mutable<this>>this).currentDeclarationIndex = nextIndex;
            let init = initializers[nextIndex];
            if (init) {
                // Only declarations with an initializer (e.g. a variable definition) have something
                // to do at runtime. Others (e.g. typedefs) do nothing.
                this.observable.send("initializing", nextIndex);
                let runtimeInit = init.createRuntimeInitializer(this);
                this.sim.push(runtimeInit);
            }
        } else {
            this.startCleanup();
        }
    }

    public stepForwardImpl() {
        return false;
    }
}

export class BreakStatement extends Statement<BreakStatementASTNode> {
    public readonly construct_type = "break_statement";

    public static createFromAST(
        ast: BreakStatementASTNode,
        context: BlockContext
    ) {
        return new BreakStatement(context, ast);
    }

    public constructor(
        context: BlockContext,
        ast: BreakStatementASTNode,
        expression?: Expression
    ) {
        super(context, ast);

        if (!context.withinLoop) {
            this.addNote(CPPError.stmt.breakStatement.location(this));
        }
    }

    public createDefaultOutlet(
        this: CompiledBreakStatement,
        element: JQuery,
        parent?: ConstructOutlet
    ) {
        return new BreakStatementOutlet(element, this, parent);
    }

    // isTailChild : function(child){
    //     return {isTail: true,
    //         reason: "The recursive call is immediately followed by a return."};
    // }

    public isSemanticallyEquivalent_impl(
        other: AnalyticConstruct,
        equivalenceContext: SemanticContext
    ): boolean {
        return other.construct_type === this.construct_type;
    }
}

export interface CompiledBreakStatement
    extends BreakStatement,
        SuccessfullyCompiled {}

export class RuntimeBreakStatement extends RuntimeStatement<CompiledBreakStatement> {
    public constructor(
        model: CompiledBreakStatement,
        parent: RuntimeStatement
    ) {
        super(model, parent);
    }

    protected upNextImpl() {
        // nothing
    }

    public stepForwardImpl() {
        let construct: RuntimeConstruct = this;

        // start cleanup for everything on the way up to the loop
        while (
            construct.model.construct_type !== "while_statement" &&
            construct.model.construct_type !== "for_statement"
        ) {
            construct.startCleanup();
            construct = construct.parent!;
        }

        // start cleanup for the loop
        construct.startCleanup();
    }
}

export class ReturnStatement extends Statement<ReturnStatementASTNode> {
    public readonly construct_type = "return_statement";

    public readonly expression?: Expression;

    // TODO: Technically, this should be CopyInitializer
    public readonly returnInitializer?: DirectInitializer;

    public static createFromAST(
        ast: ReturnStatementASTNode,
        context: BlockContext
    ) {
        return ast.expression
            ? new ReturnStatement(
                  context,
                  ast,
                  createExpressionFromAST(ast.expression, context)
              )
            : new ReturnStatement(context, ast);
    }

    public constructor(
        context: BlockContext,
        ast: ReturnStatementASTNode,
        expression?: Expression
    ) {
        super(context, ast);

        let returnType = this.context.containingFunction.type.returnType;

        if (returnType instanceof VoidType) {
            if (expression) {
                // We have an expression to return, but the type is void, so that's bad
                this.addNote(CPPError.stmt.returnStatement.exprVoid(this));
                this.attach((this.expression = expression));
            }
            return;
        }

        // A return statement with no expression is only allowed in void functions.
        // At the moment, constructors/destructors are hacked to have void return type,
        // so this check is ok for return statements in a constructor.
        if (!expression) {
            this.addNote(CPPError.stmt.returnStatement.empty(this));
            return;
        }

        if (returnType.isIncompleteObjectType()) {
            this.addNote(
                CPPError.stmt.returnStatement.incomplete_type(this, returnType)
            );
            this.attach((this.expression = expression));
            return;
        }

        if (returnType.isReferenceType()) {
            this.returnInitializer = DirectInitializer.create(
                context,
                new ReturnByReferenceEntity(returnType),
                [expression],
                "copy"
            );
        } else if (returnType.isCompleteObjectType()) {
            this.returnInitializer = DirectInitializer.create(
                context,
                new ReturnObjectEntity(returnType),
                [expression],
                "copy"
            );
        } else {
            assertNever(returnType);
        }

        // Note: The expression is NOT attached directly here, since it's attached under the initializer.
        this.expression = expression;
        this.attach(this.returnInitializer);
    }

    public createDefaultOutlet(
        this: CompiledReturnStatement,
        element: JQuery,
        parent?: ConstructOutlet
    ) {
        return new ReturnStatementOutlet(element, this, parent);
    }

    // isTailChild : function(child){
    //     return {isTail: true,
    //         reason: "The recursive call is immediately followed by a return."};
    // }

    public isSemanticallyEquivalent_impl(
        other: AnalyticConstruct,
        equivalenceContext: SemanticContext
    ): boolean {
        return (
            other.construct_type === this.construct_type &&
            areSemanticallyEquivalent(
                this.expression,
                other.expression,
                equivalenceContext
            )
        );
    }
}

export interface CompiledReturnStatement
    extends ReturnStatement,
        SuccessfullyCompiled {
    readonly expression?: CompiledExpression;
    readonly returnInitializer?: CompiledDirectInitializer;
}

enum RuntimeReturnStatementIndices {
    PUSH_INITIALIZER,
    RETURN,
}

export class RuntimeReturnStatement extends RuntimeStatement<CompiledReturnStatement> {
    public readonly returnInitializer?: RuntimeDirectInitializer;

    private index = RuntimeReturnStatementIndices.PUSH_INITIALIZER;

    public constructor(
        model: CompiledReturnStatement,
        parent: RuntimeStatement
    ) {
        super(model, parent);
        if (model.returnInitializer) {
            this.returnInitializer =
                model.returnInitializer.createRuntimeInitializer(this);
        }
    }

    protected upNextImpl() {
        if (this.index === RuntimeReturnStatementIndices.PUSH_INITIALIZER) {
            if (this.returnInitializer) {
                this.sim.push(this.returnInitializer);
            }
            this.index = RuntimeReturnStatementIndices.RETURN;
        }
    }

    public stepForwardImpl() {
        if (this.index === RuntimeReturnStatementIndices.RETURN) {
            let func = this.containingRuntimeFunction;
            this.observable.send("returned", { call: func.caller });
            this.sim.startCleanupUntil(func);
        }
    }
}

export class Block extends Statement<BlockASTNode> {
    public readonly construct_type = "block";

    public readonly statements: readonly Statement[] = [];

    public readonly localDeallocator: ObjectDeallocator;

    public static createFromAST(
        ast: BlockASTNode,
        context: FunctionContext
    ): Block {
        let blockContext = createBlockContext(context);
        return new Block(
            blockContext,
            ast,
            ast.statements.map((s) => createStatementFromAST(s, blockContext))
        );
    }

    public constructor(
        context: BlockContext,
        ast: BlockASTNode,
        statements: readonly Statement[]
    ) {
        super(context, ast);
        this.attachAll((this.statements = statements));

        this.attach((this.localDeallocator = createLocalDeallocator(context)));
    }

    public isBlock(): this is Block {
        return true;
    }

    public createDefaultOutlet(
        this: CompiledBlock,
        element: JQuery,
        parent?: ConstructOutlet
    ) {
        return new BlockOutlet(element, this, parent);
    }

    // isTailChild : function(child){
    //     var last = this.statements.last();
    //     if (child !== last){
    //         if (child === this.statements[this.statements.length-2] && isA(last, Statements.Return) && !last.hasExpression){
    //             return {isTail: true,
    //                 reason: "The only thing after the recursive call is an empty return.",
    //                 others: [last]
    //             }
    //         }
    //         else{
    //             var others = [];
    //             for (var otherIndex = this.statements.length-1; this.statements[otherIndex] !== child && otherIndex >= 0; --otherIndex){
    //                 var other = this.statements[otherIndex];
    //                 if (!(isA(other, Statements.Return) && !other.expression)){
    //                     others.unshift(other);
    //                 }
    //             }
    //             return {isTail: false,
    //                 reason: "There are other statements in this block that will execute after the recursive call.",
    //                 others: others
    //             }
    //         }
    //     }
    //     else{
    //         return {isTail: true};
    //     }
    // }

    public isSemanticallyEquivalent_impl(
        other: AnalyticConstruct,
        ec: SemanticContext
    ): boolean {
        if (
            other.construct_type === this.construct_type &&
            areAllSemanticallyEquivalent(
                this.statements,
                other.statements,
                ec
            ) &&
            areSemanticallyEquivalent(
                this.localDeallocator,
                other.localDeallocator,
                ec
            )
        ) {
            return true;
        }

        if (other.construct_type === this.construct_type) {
            // Try identifying chunks that can be rearranged
            let chunks = this.getChunks();
            let otherChunks = other.getChunks();

            // Now our condition is just that each chunk is equivalent
            if (
                chunks.length === otherChunks.length &&
                chunks.every((c, i) =>
                    areChunksEquivalent(c, otherChunks[i], ec)
                ) &&
                areSemanticallyEquivalent(
                    this.localDeallocator,
                    other.localDeallocator,
                    ec
                )
            ) {
                return true;
            }
        }

        return false;
    }

    private getChunks() {
        let chunks: Statement[][] = [];
        let currentChunk:
            | { stmts: Statement[]; entitiesUsed: Set<number> }
            | undefined;
        (<AnalyticStatement[]>this.statements).forEach((stmt) => {
            if (
                stmt.construct_type === "declaration_statement" ||
                stmt.construct_type === "expression_statement"
            ) {
                if (currentChunk) {
                    if (
                        stmt
                            .entitiesUsed()
                            .some((e) =>
                                currentChunk!.entitiesUsed.has(e.entityId)
                            )
                    ) {
                        // some entity was used, start a new chunk
                        chunks.push(currentChunk.stmts);
                        currentChunk = {
                            stmts: [stmt],
                            entitiesUsed: new Set(
                                stmt.entitiesUsed().map((e) => e.entityId)
                            ),
                        };
                    } else {
                        currentChunk.stmts.push(stmt);
                        stmt.entitiesUsed().forEach((e) =>
                            currentChunk!.entitiesUsed.add(e.entityId)
                        );
                    }
                } else {
                    currentChunk = {
                        stmts: [stmt],
                        entitiesUsed: new Set(
                            stmt.entitiesUsed().map((e) => e.entityId)
                        ),
                    };
                }
            } else {
                // control flow statements
                if (currentChunk) {
                    chunks.push(currentChunk.stmts);
                    currentChunk = undefined;
                }
                chunks.push([stmt]);
            }
        });
        if (currentChunk) {
            chunks.push(currentChunk.stmts);
        }
        return chunks;
    }
}

function areChunksEquivalent(
    chunk1: Statement[],
    chunk2: Statement[],
    ec: SemanticContext
) {
    return (
        areAllSemanticallyEquivalent(chunk1, chunk2, ec) ||
        areAllSemanticallyEquivalent(chunk1, chunk2.slice().reverse(), ec)
    );
}

export interface CompiledBlock extends Block, SuccessfullyCompiled {
    readonly statements: readonly CompiledStatement[];
    readonly localDeallocator: CompiledObjectDeallocator;
}

export class RuntimeBlock extends RuntimeStatement<CompiledBlock> {
    public readonly statements: readonly RuntimeStatement[];

    public readonly localDeallocator: RuntimeObjectDeallocator;

    private index = 0;

    public constructor(
        model: CompiledBlock,
        parent: RuntimeStatement | RuntimeFunction
    ) {
        super(model, parent);
        this.statements = model.statements.map((stmt) =>
            createRuntimeStatement(stmt, this)
        );
        this.localDeallocator =
            model.localDeallocator.createRuntimeConstruct(this);
        this.setCleanupConstruct(this.localDeallocator);
    }

    protected upNextImpl() {
        if (this.index < this.statements.length) {
            this.observable.send("index", this.index);
            this.sim.push(this.statements[this.index++]);
        } else {
            this.startCleanup();
        }
    }

    public stepForwardImpl() {}

    // isTailChild : function(child){
    //     return {isTail: true,
    //         reason: "The recursive call is immediately followed by a return."};
    // }
}

// export class ArrayDeallocator extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
//     public readonly construct_type = "ArrayDeallocator";

//     public readonly target: ObjectEntity<BoundedArrayType>;
//     public readonly dtor?: FunctionCall;

//     public constructor(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>) {
//         super(context, undefined); // Has no AST

//         this.target = target;

//         if (target.type.elemType.isCompleteClassType()) {
//             let dtorFn = target.type.elemType.classDefinition.destructor;
//             if (dtorFn) {
//                 this.attach(this.dtor = new FunctionCall(context, dtorFn, [], target.type.elemType));
//             }
//             else {
//                 this.addNote(CPPError.declaration.dtor.no_destructor_array(this, target));
//             }
//         }

//     }

//     public createRuntimeConstruct(this: CompiledArrayDeallocator, parent: RuntimeConstruct) {
//         return new RuntimeArrayDeallocator(this, parent);
//     }

//     // public isTailChild(child: ExecutableConstruct) {
//     //     return {isTail: true};
//     // }
// }

// export interface CompiledArrayDeallocator extends ArrayDeallocator, SuccessfullyCompiled {

//     readonly dtor?: CompiledFunctionCall;

// }

// export class RuntimeArrayDeallocator extends RuntimeConstruct<CompiledArrayDeallocator> {

//     private index?: number;
//     private target?: CPPObject<BoundedArrayType>;
//     private justDestructed: ArraySubobject<CompleteClassType> | undefined = undefined;
//     public readonly parent!: RuntimeBlock | RuntimeForStatement; // narrows type from base class

//     public constructor(model: CompiledArrayDeallocator, parent: RuntimeConstruct) {
//         super(model, "cleanup", parent);
//     }

//     protected upNextImpl() {
//         if (this.justDestructed) {
//             this.sim.memory.killObject(this.justDestructed, this);
//             this.justDestructed = undefined;
//         }
//     }

//     public stepForwardImpl() {
//         if (!this.target) {
//             this.target = this.model.target.runtimeLookup(this);

//             // Find the index of the last allocated object still alive
//             let index = this.target.numArrayElemSubobjects() - 1;
//             while(!this.target.getArrayElemSubobject(index).isAlive) {
//                 --index;
//             }
//             this.index = index;
//         }

//         let locals = this.model.context.blockLocals.localVariables;
//         while(this.index >= 0) {
//             // Destroy local at given index
//             let local = locals[this.index];
//             let dtor = this.model.dtors[this.index];
//             --this.index;

//             if (local.variableKind === "reference") {

//                 // If the program is running, and this reference was bound
//                 // to some object, the referred type should have
//                 // been completed.
//                 assert(local.isTyped(isReferenceToCompleteType));

//                 // destroying a reference doesn't really require doing anything,
//                 // but we notify the referred object this reference has been removed
//                 local.runtimeLookup(this)?.onReferenceUnbound(local);
//             }
//             else if (local.isTyped(isCompleteClassType)) {
//                 // a local class-type object, so we call the dtor
//                 assert(dtor);
//                 let obj = local.runtimeLookup(this);
//                 this.sim.push(dtor.createRuntimeFunctionCall(this, obj));

//                 // need to destroy the object once dtor is done, so we keep track of it here
//                 this.justDestructed = obj;

//                 // return so that the dtor, which is now on top of the stack, can run instead
//                 return;
//             }
//             else {
//                 // a local non-class-type object, no dtor needed.
//                 this.sim.memory.killObject(local.runtimeLookup(this), this);
//             }
//         }

//         this.startCleanup();
//     }
// }

// export class StaticDeallocator extends BasicCPPConstruct<BlockContext, ASTNode> {
//     public readonly construct_type = "StaticDeallocator";

//     public readonly dtors: (FunctionCall | undefined)[];

//     public constructor(context: BlockContext) {
//         super(context, undefined); // Has no AST

//         let staticVariables = context.blockLocals.staticVariables;

//         this.dtors = staticVariables.map((stat) => {
//             if (stat.variableKind === "object" && stat.isTyped(isCompleteClassType)) {
//                 let dtor = stat.type.classDefinition.destructor;
//                 if (dtor) {
//                     let dtorCall = new FunctionCall(context, dtor, [], stat.type);
//                     this.attach(dtorCall);
//                     return dtorCall;
//                 }
//                 else{
//                     this.addNote(CPPError.declaration.dtor.no_destructor_static(stat.firstDeclaration, stat));
//                 }
//             }
//             return undefined;
//         });
//     }

//     public createRuntimeConstruct(this: CompiledStaticDeallocator, parent: RuntimeBlock | RuntimeForStatement) {
//         return new RuntimeStaticDeallocator(this, parent);
//     }

//     // public isTailChild(child: ExecutableConstruct) {
//     //     return {isTail: true};
//     // }
// }

// export interface CompiledStaticDeallocator extends StaticDeallocator, SuccessfullyCompiled {

//     readonly dtors: (CompiledFunctionCall | undefined)[];

// }

// export class RuntimeStaticDeallocator extends RuntimeConstruct<CompiledStaticDeallocator> {

//     private index;
//     private justDestructed: AutoObject<CompleteClassType> | undefined = undefined;
//     public readonly parent!: RuntimeBlock | RuntimeForStatement; // narrows type from base class

//     public constructor(model: CompiledStaticDeallocator, parent: RuntimeBlock | RuntimeForStatement) {
//         super(model, "expression", parent);
//         this.index = this.model.context.blockLocals.localVariables.length - 1;
//     }

//     protected upNextImpl() {
//         if (this.justDestructed) {
//             this.sim.memory.killObject(this.justDestructed, this);
//             this.justDestructed = undefined;
//         }
//     }

//     public stepForwardImpl() {
//         let locals = this.model.context.blockLocals.localVariables;
//         while(this.index >= 0) {
//             // Destroy local at given index
//             let local = locals[this.index];
//             let dtor = this.model.dtors[this.index];
//             --this.index;

//             if (local.variableKind === "reference") {

//                 // If the program is running, and this reference was bound
//                 // to some object, the referred type should have
//                 // been completed.
//                 assert(local.isTyped(isReferenceToCompleteType));

//                 // destroying a reference doesn't really require doing anything,
//                 // but we notify the referred object this reference has been removed
//                 local.runtimeLookup(this)?.onReferenceUnbound(local);
//             }
//             else if (local.isTyped(isCompleteClassType)) {
//                 // a local class-type object, so we call the dtor
//                 assert(dtor);
//                 let obj = local.runtimeLookup(this);
//                 this.sim.push(dtor.createRuntimeFunctionCall(this, obj));

//                 // need to destroy the object once dtor is done, so we keep track of it here
//                 this.justDestructed = obj;

//                 // return so that the dtor, which is now on top of the stack, can run instead
//                 return;
//             }
//             else {
//                 // a local non-class-type object, no dtor needed.
//                 this.sim.memory.killObject(local.runtimeLookup(this), this);
//             }
//         }

//         this.startCleanup();
//     }
// }

// export class OpaqueStatement extends StatementBase implements SuccessfullyCompiled {

//     public _t_isCompiled: never;

//     private readonly effects: (rtBlock: RuntimeOpaqueStatement) => void;

//     public constructor(context: BlockContext, effects: (rtBlock: RuntimeOpaqueStatement) => void) {
//         super(context);
//         this.effects = effects;
//     }

//     public createRuntimeStatement(parent: RuntimeStatement | RuntimeFunction) {
//         return new RuntimeOpaqueStatement(this, parent, this.effects);
//     }

// }

// export class RuntimeOpaqueStatement extends RuntimeStatement<OpaqueStatement> {

//     private effects: (rtBlock: RuntimeOpaqueStatement) => void;

//     public constructor (model: OpaqueStatement, parent: RuntimeStatement | RuntimeFunction, effects: (rtBlock: RuntimeOpaqueStatement) => void) {
//         super(model, parent);
//         this.effects = effects;
//     }

//     protected upNextImpl() {
//         // Nothing to do
//     }

//     public stepForwardImpl() {
//         this.effects(this);
//         this.startCleanup();
//     }

//     // isTailChild : function(child){
//     //     return {isTail: true,
//     //         reason: "The recursive call is immediately followed by a return."};
//     // }
// }

export class IfStatement extends Statement<IfStatementASTNode> {
    public readonly construct_type = "if_statement";

    public readonly condition: Expression;
    public readonly then: Block;
    public readonly otherwise?: Block;

    public static createFromAST(
        ast: IfStatementASTNode,
        context: BlockContext
    ): IfStatement {
        let condition = createExpressionFromAST(ast.condition, context);

        // If either of the substatements are not a block, they get their own implicit block context.
        // (If the substatement is a block, it creates its own block context, so we don't do that here.)
        let then =
            ast.then.construct_type === "block"
                ? createStatementFromAST(ast.then, context)
                : createStatementFromAST(
                      {
                          construct_type: "block",
                          source: ast.then.source,
                          statements: [ast.then],
                      },
                      context
                  );

        if (!ast.otherwise) {
            // no else branch
            return new IfStatement(context, ast, condition, then);
        } else {
            // else branch is present
            // See note above about substatement implicit block context
            let otherwise =
                ast.otherwise.construct_type === "block"
                    ? createStatementFromAST(ast.otherwise, context)
                    : createStatementFromAST(
                          {
                              construct_type: "block",
                              source: ast.then.source,
                              statements: [ast.otherwise],
                          },
                          context
                      );

            return new IfStatement(context, ast, condition, then, otherwise);
        }
    }

    public constructor(
        context: BlockContext,
        ast: IfStatementASTNode,
        condition: Expression,
        then: Block,
        otherwise?: Block
    ) {
        super(context, ast);

        if (condition.isWellTyped()) {
            this.attach(
                (this.condition = standardConversion(condition, Bool.BOOL))
            );
        } else {
            this.attach((this.condition = condition));
        }

        this.attach((this.then = then));
        if (otherwise) {
            this.attach((this.otherwise = otherwise));
        }

        if (
            this.condition.isWellTyped() &&
            !Predicates.isTypedExpression(this.condition, isType(Bool))
        ) {
            this.addNote(CPPError.stmt.if.condition_bool(this, this.condition));
        }
    }

    public createDefaultOutlet(
        this: CompiledIfStatement,
        element: JQuery,
        parent?: ConstructOutlet
    ) {
        return new IfStatementOutlet(element, this, parent);
    }

    //     isTailChild : function(child){
    //         if (child === this.condition){
    //             return {isTail: false,
    //                 reason: "After the function returns, one of the branches will run.",
    //                 others: [this.then, this.otherwise]
    //             }
    //         }
    //         else{
    //             if (this.otherwise){
    //                 //if (child === this.then){
    //                     return {isTail: true,
    //                         reason: "Only one branch in an if/else structure can ever execute, so don't worry about the code in the other branches."
    //                     };
    //                 //}
    //                 //else{
    //                 //    return {isTail: true,
    //                 //        reason: "Don't worry about the code in the if branch - if the recursive call even happened it means we took the else branch."
    //                 //    };
    //                 //}
    //             }
    //             else{
    //                 return {isTail: true
    //                 };
    //             }
    //         }
    //     }

    public isSemanticallyEquivalent_impl(
        other: AnalyticConstruct,
        equivalenceContext: SemanticContext
    ): boolean {
        return (
            other.construct_type === this.construct_type &&
            areSemanticallyEquivalent(
                this.condition,
                other.condition,
                equivalenceContext
            ) &&
            areSemanticallyEquivalent(
                this.then,
                other.then,
                equivalenceContext
            ) &&
            areSemanticallyEquivalent(
                this.otherwise,
                other.otherwise,
                equivalenceContext
            )
        );
    }
}

export interface CompiledIfStatement extends IfStatement, SuccessfullyCompiled {
    readonly condition: CompiledExpression<Bool, "prvalue">;
    readonly then: CompiledBlock;
    readonly otherwise?: CompiledBlock;
}

export class RuntimeIfStatement extends RuntimeStatement<CompiledIfStatement> {
    public readonly condition: RuntimeExpression<Bool, "prvalue">;
    public readonly then: RuntimeBlock;
    public readonly otherwise?: RuntimeBlock;

    private index = 0;

    public constructor(model: CompiledIfStatement, parent: RuntimeStatement) {
        super(model, parent);
        this.condition = createRuntimeExpression(model.condition, this);
        this.then = createRuntimeStatement(model.then, this);
        if (model.otherwise) {
            this.otherwise = createRuntimeStatement(model.otherwise, this);
        }
    }

    private static upNextFns = [
        (rt: RuntimeIfStatement) => {
            rt.sim.push(rt.condition);
        },
        (rt: RuntimeIfStatement) => {
            if (rt.condition.evalResult.rawValue) {
                rt.sim.push(rt.then);
            } else if (rt.otherwise) {
                rt.sim.push(rt.otherwise);
            }
        },
        (rt: RuntimeIfStatement) => {
            rt.startCleanup();
        },
    ];

    protected upNextImpl() {
        RuntimeIfStatement.upNextFns[this.index++](this);
    }

    public stepForwardImpl() {
        // Nothing to do here
    }
}

export class WhileStatement extends Statement<WhileStatementASTNode> {
    public readonly construct_type = "while_statement";

    public readonly condition: Expression;
    public readonly body: Statement;

    public static createFromAST(
        ast: WhileStatementASTNode,
        outerContext: BlockContext
    ): WhileStatement {
        let whileContext = createLoopContext(outerContext);

        // If the body substatement is not a block, it gets its own implicit block context.
        // (If the substatement is a block, it creates its own block context, so we don't do that here.)
        let body =
            ast.body.construct_type === "block"
                ? createStatementFromAST(ast.body, whileContext)
                : createStatementFromAST(
                      ast.body,
                      createBlockContext(whileContext)
                  );

        return new WhileStatement(
            whileContext,
            ast,
            createExpressionFromAST(ast.condition, whileContext),
            body
        );
    }

    public constructor(
        context: BlockContext,
        ast: WhileStatementASTNode,
        condition: Expression,
        body: Statement
    ) {
        super(context, ast);

        if (condition.isWellTyped()) {
            this.attach(
                (this.condition = standardConversion(condition, Bool.BOOL))
            );
        } else {
            this.attach((this.condition = condition));
        }

        this.attach((this.body = body));

        if (
            this.condition.isWellTyped() &&
            !Predicates.isTypedExpression(this.condition, isType(Bool))
        ) {
            this.addNote(
                CPPError.stmt.iteration.condition_bool(this, this.condition)
            );
        }
    }

    public createDefaultOutlet(
        this: CompiledWhileStatement,
        element: JQuery,
        parent?: ConstructOutlet
    ) {
        return new WhileStatementOutlet(element, this, parent);
    }

    public isSemanticallyEquivalent_impl(
        other: AnalyticConstruct,
        equivalenceContext: SemanticContext
    ): boolean {
        return (
            other.construct_type === this.construct_type &&
            areSemanticallyEquivalent(
                this.condition,
                other.condition,
                equivalenceContext
            ) &&
            areSemanticallyEquivalent(this.body, other.body, equivalenceContext)
        );
    }
}

export interface CompiledWhileStatement
    extends WhileStatement,
        SuccessfullyCompiled {
    readonly condition: CompiledExpression<Bool, "prvalue">;
    readonly body: CompiledStatement;
}

export class RuntimeWhileStatement extends RuntimeStatement<CompiledWhileStatement> {
    public readonly condition: RuntimeExpression<Bool, "prvalue">;
    public readonly body?: RuntimeStatement;

    private index = 0;

    public constructor(
        model: CompiledWhileStatement,
        parent: RuntimeStatement
    ) {
        super(model, parent);
        this.condition = createRuntimeExpression(model.condition, this);
        // Do not create body here, since it might not actually run
    }

    private static upNextFns = [
        (rt: RuntimeWhileStatement) => {
            rt.sim.push(rt.condition);
        },
        (rt: RuntimeWhileStatement) => {
            if (rt.condition.evalResult.rawValue === 1) {
                rt.sim.push(
                    (asMutable(rt).body = createRuntimeStatement(
                        rt.model.body,
                        rt
                    ))
                );
            } else {
                rt.startCleanup();
            }
        },
        (rt: RuntimeWhileStatement) => {
            // Do nothing, pass to stepForward, which will reset
        },
    ];

    protected upNextImpl() {
        RuntimeWhileStatement.upNextFns[this.index](this);
        this.index = (this.index + 1) % RuntimeWhileStatement.upNextFns.length;
    }

    public stepForwardImpl() {
        (<Mutable<this>>this).condition = createRuntimeExpression(
            this.model.condition,
            this
        );
        delete (<Mutable<this>>this).body;
    }

    //     isTailChild : function(child){
    //         return {
    //             isTail: false,
    //             reason: "If the loop goes around again, then that would be more work after the recursive call.",
    //             others: [this]
    //         };
    //     }
}

// The ForStatement class contains additional comments intended
// as a general tutorial included in the `core` README.md

// Generally, constructs provide a template parameter
// to indicate the type of AST node they are created from
export class ForStatement extends Statement<ForStatementASTNode> {
    // The discriminant here matches the one from ForStatementASTNode
    public readonly construct_type = "for_statement";

    // All child constructs, this will often (but not always)
    // be parallel to the structure in the AST Node
    public readonly initial:
        | ExpressionStatement
        | NullStatement
        | DeclarationStatement;
    public readonly condition: Expression;
    public readonly body: Statement;
    public readonly post?: Expression;

    // For cleanup of any objects declared in the init-statement in the loop
    // header. These have a different lifetime than objects in the actual body
    // of the loop and are only cleaned up when the loop finishes (not on each iteration).
    public readonly localDeallocator: ObjectDeallocator;

    // Constructors for language construct classes take
    // in a `context`, which provides contextual information
    // necessary for compilation (e.g. a scope where variables
    // can be looked up, the function that contains this code, etc.).
    // In addition, the child constructs are provided that
    // compose the construct. These children are presumed to
    // have already been constructed with the appropriate context
    // of their own. This is usually done by a createFromAST()
    // function (see below).
    public constructor(
        context: BlockContext,
        ast: ForStatementASTNode,
        initial: ExpressionStatement | NullStatement | DeclarationStatement,
        condition: Expression,
        body: Statement,
        post: Expression | undefined
    ) {
        super(context, ast);

        // Use .attach() to build the links in the construct tree
        this.attach((this.initial = initial));

        if (condition.isWellTyped()) {
            // If the condition has a type, we can attempt to convert
            // it to a boolean. If such a conversion can be made,
            // we should attach the conversion, which has the original
            // condition as a child. (If it can't be made,
            // standardConversion() just returns the original).
            this.attach(
                (this.condition = standardConversion(condition, Bool.BOOL))
            );
        } else {
            // If the condition wasn't well typed, we can't even try
            // the conversion, so we just attach the original condition.
            this.attach((this.condition = condition));
        }

        // If our condition is not a bool (and couldn't be converted)
        // to one earlier, give an error. However, if the condition
        // didn't have any type, we don't want error spam, so we won't
        // say anything. (Any non-well-typed exppression will already
        // have an error of its own.)
        if (
            this.condition.isWellTyped() &&
            !Predicates.isTypedExpression(this.condition, isType(Bool))
        ) {
            this.addNote(
                CPPError.stmt.iteration.condition_bool(this, this.condition)
            );
        }

        // Nothing in particular to check here, since as with
        // the initial, we don't care about types or anything.
        // Because of syntax rules baked into the nature of this
        // constructor, we're already guaranteed the body is a
        // statement and the post is an expression as they should be.
        this.attach((this.body = body));
        if (post) {
            this.attach((this.post = post));
        }

        this.attach((this.localDeallocator = createLocalDeallocator(context)));
    }

    // The constructor above poses a conundrum. It asks that
    // we pass in fully instantiated, ready-to-go child constructs
    // of which the `ForStatement` will be composed. However,
    // those children cannot be made in a context-insensitive
    // fashion. That's not how C++ works! The resolution is that
    // all context-sensitive stuff is extracted into the `context`
    // provided when constructing the constructs. Generally, this
    // will all be handled in a createFromAST function. It takes
    // in the pure syntax from the AST and does all the hard work
    // of building, situating, and connecting together all the
    // constructs correctly.
    public static createFromAST(
        ast: ForStatementASTNode,
        outerContext: BlockContext
    ): ForStatement {
        // The context parameter to this function tells us what
        // context the for loop originally occurs in. For example, in:
        // void func() {
        //   for(int i = 0; i < 10; ++i) {
        //     cout << i << endl;
        //   }
        // }
        // `context` refers to the function body block context for `func`
        // Below, we'll also consider the body block context of the inner
        // set of curly braces for the for loop.

        // For loops are kind of obnoxious when it comes to scopes and object lifetimes
        // because any variables declared in the init-statement part have a different
        // block lifetime but the same block scope as variables in the body of the loop.
        // For example:
        //   int i = 0;
        //   for(A a; i < 10; ++i) {
        //     int i; // allowed, different scope as previous i
        //     int a; // not allowed, same scope as earlier a
        //     B b;
        //     cout << i << endl;
        //   }
        //   In the above, even though A a; and B b; are in the same scope (as evidenced
        //   by not being allowed to declare the second a right above b), the A ctor/dtor
        //   will only run once, whereas there are 10 separate objects called b and the
        //   B ctor/dtor runs 10 times

        // Outer context for local variables including any declared in the init-statement or condition
        let loopBlockContext = createBlockContext(
            createLoopContext(outerContext)
        );

        let initial = createStatementFromAST(ast.initial, loopBlockContext);
        let condition = createExpressionFromAST(
            ast.condition,
            loopBlockContext
        );

        // Inner block context for local variables actually inside the loop body curly braces.
        // We always do this, even if the body isn't a block in the source code:
        //    for(...) stmt; is treated equivalently
        // to for(...) { stmt; } according to the C++ standard.
        // Note that this is a separate block context from the outer one for the loop, so variables
        // in here will have a different lifetime, but we share the same scope as the outer loop block context
        let bodyBlockContext = createBlockContext(
            loopBlockContext,
            loopBlockContext.contextualScope
        );

        // NOTE: the use of the body block context for all the children.
        // e.g. for(int i = 0; i < 10; ++i) { cout << i; }
        // All children (initial, condition, post, body) share the same block
        // context and scope where i is declared.

        // If the body is a block, we have to create it using the ctor rather than
        // the createFromAST function, because that function implicitly creates a
        // new block context, which we already did above for bodyBlockContext. And we
        // want it to use bodyBlockContext, not a new block context further nested within that.
        let body =
            ast.body.construct_type !== "block"
                ? createStatementFromAST(ast.body, bodyBlockContext)
                : new Block(
                      bodyBlockContext,
                      ast.body,
                      ast.body.statements.map((s) =>
                          createStatementFromAST(s, bodyBlockContext)
                      )
                  );

        let post =
            ast.post && createExpressionFromAST(ast.post, bodyBlockContext);

        return new ForStatement(
            loopBlockContext,
            ast,
            initial,
            condition,
            body,
            post
        );

        // It's crucial that we handled things this way. Because
        // all of the context-sensitive stuff is handled by the
        // contexts here, the children can all have access to e.g.
        // the correct scope for all their variable lookups.
    }

    // Creates an outlet, which will be part of the visualization,
    // for any code that is running with this `ForStatement` as its
    // original model. The specific runtime instance is not attached
    // until later. That's because we might need to display a "shell"
    // of this construct if e.g. the function it resides in gets called
    // and is displayed, but this construct hasn't started executing
    // yet (and may never, depending on control flow through that
    // function!).
    public createDefaultOutlet(
        this: CompiledForStatement,
        element: JQuery,
        parent?: ConstructOutlet
    ) {
        return new ForStatementOutlet(element, this, parent);
    }

    public isSemanticallyEquivalent_impl(
        other: AnalyticConstruct,
        equivalenceContext: SemanticContext
    ): boolean {
        return (
            other.construct_type === this.construct_type &&
            areSemanticallyEquivalent(
                this.initial,
                other.initial,
                equivalenceContext
            ) &&
            areSemanticallyEquivalent(
                this.condition,
                other.condition,
                equivalenceContext
            ) &&
            areSemanticallyEquivalent(
                this.body,
                other.body,
                equivalenceContext
            ) &&
            areSemanticallyEquivalent(this.post, other.post, equivalenceContext)
        );
    }
}

export interface CompiledForStatement
    extends ForStatement,
        SuccessfullyCompiled {
    readonly initial:
        | CompiledExpressionStatement
        | CompiledNullStatement
        | CompiledDeclarationStatement;
    readonly condition: CompiledExpression<Bool, "prvalue">;
    readonly body: CompiledStatement;
    readonly post?: CompiledExpression;
    readonly localDeallocator: CompiledObjectDeallocator;
}

export class RuntimeForStatement extends RuntimeStatement<CompiledForStatement> {
    public readonly initial:
        | RuntimeExpressionStatement
        | RuntimeNullStatement
        | RuntimeDeclarationStatement;
    public readonly condition: RuntimeExpression<Bool, "prvalue">;
    public readonly body?: RuntimeStatement;
    public readonly post?: RuntimeExpression;

    public readonly localDeallocator: RuntimeObjectDeallocator;

    private index = 0;

    private upNextFns: ((rt: RuntimeForStatement) => void)[];

    public constructor(model: CompiledForStatement, parent: RuntimeStatement) {
        super(model, parent);
        this.initial = createRuntimeStatement(model.initial, this);
        this.condition = createRuntimeExpression(model.condition, this);
        // Do not create body here, since it might not actually run
        if (model.post) {
            this.upNextFns = RuntimeForStatement.upNextFns;
        } else {
            // remove 4th step which is the post step
            this.upNextFns = RuntimeForStatement.upNextFns.slice();
            this.upNextFns.splice(3, 1);
        }
        this.localDeallocator =
            model.localDeallocator.createRuntimeConstruct(this);
        this.setCleanupConstruct(this.localDeallocator);
    }

    private static upNextFns = [
        (rt: RuntimeForStatement) => {
            rt.sim.push(rt.initial);
        },
        (rt: RuntimeForStatement) => {
            rt.sim.push(rt.condition);
        },
        (rt: RuntimeForStatement) => {
            if (rt.condition.evalResult.rawValue === 1) {
                rt.sim.push(
                    (asMutable(rt).body = createRuntimeStatement(
                        rt.model.body,
                        rt
                    ))
                );
            } else {
                rt.startCleanup();
            }
        },
        (rt: RuntimeForStatement) => {
            assert(rt.model.post);
            rt.sim.push(
                (asMutable(rt).post = createRuntimeExpression(
                    rt.model.post,
                    rt
                ))
            );
        },
        (rt: RuntimeForStatement) => {
            // Do nothing, pass to stepForward, which will reset
        },
    ];

    protected upNextImpl() {
        this.upNextFns[this.index++](this);
        if (this.index === this.upNextFns.length) {
            this.index = 1; // reset to 1 rather than 0, since 0 is the initial which only happens once
        }
    }

    public stepForwardImpl() {
        (<Mutable<this>>this).condition = createRuntimeExpression(
            this.model.condition,
            this
        );
        delete (<Mutable<this>>this).body;
        delete (<Mutable<this>>this).post;
    }

    //     isTailChild : function(child){
    //         return {
    //             isTail: false,
    //             reason: "If the loop goes around again, then that would be more work after the recursive call.",
    //             others: [this]
    //         };
    //     }
}

// export var Break = Statement.extend({
//     _name: "Break",

//     compile : function() {
//         // Theoretically this could be put into the i_createFromAST function since it only uses
//         // syntactic information to determine whether the break is inside an iteration statement,
//         // but it would feel weird to add an error note before the compile function even runs... :/

//         var container = this.parent;
//         while(container && !isA(container, Statements.Iteration)){
//             container = container.parent;
//         }

//         this.container = container;

//         // container should exist, otherwise this break is somewhere it shouldn't be
//         if (!container || !isA(container, Statements.Iteration)){
//             this.addNote(CPPError.stmt.breakStatement.location(this, this.condition));
//         }
//     },

//     createAndPushInstance : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var inst = RuntimeConstruct.instance(sim, this, "break", "stmt", inst);
//         sim.push(inst);
//         return inst;
//     },

//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index == "break"){
//             var containerInst = inst.findParentByModel(this.container);
// //            inst.send("returned", {call: func.parent});
//             containerInst.done(sim); // TODO: should be done with simulation stack instead of parent
//             // return true;
//         }
//     }
// });

// export var Continue = Unsupported.extend({
//     _name: "Statements.Continue",
//     englishName: "continue statement"
// });
