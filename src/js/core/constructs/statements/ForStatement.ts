import { ForStatementASTNode } from "../../../ast/ast_statements";
import { asMutable, assert, Mutable } from "../../../util/util";
import { ConstructOutlet, ForStatementOutlet } from "../../../view/codeOutlets";
import { areSemanticallyEquivalent, BlockContext, createBlockContext, createLoopContext, SemanticContext } from "../../compilation/contexts";
import { CPPError } from "../../compilation/errors";
import { AnalyticConstruct, Predicates } from "../../../analysis/predicates";
import { Bool, isType } from "../../compilation/types";
import { SuccessfullyCompiled } from "../constructs";
import { CompiledExpression, Expression } from "../expressions/Expression";
import { RuntimeExpression } from "../expressions/RuntimeExpression";
import { createExpressionFromAST, createRuntimeExpression } from "../expressions/expressions";
import { standardConversion } from "../expressions/ImplicitConversion";
import { CompiledObjectDeallocator, createLocalDeallocator, ObjectDeallocator, RuntimeObjectDeallocator } from "../ObjectDeallocator";
import { Block } from "./Block";
import { DeclarationStatement, CompiledDeclarationStatement, RuntimeDeclarationStatement } from "./DeclarationStatement";
import { ExpressionStatement, CompiledExpressionStatement, RuntimeExpressionStatement } from "./ExpressionStatement";
import { NullStatement, CompiledNullStatement, RuntimeNullStatement } from "./NullStatement";
import { CompiledStatement, Statement, RuntimeStatement } from "./Statement";
import { createStatementFromAST, createRuntimeStatement } from "./statements";

// The ForStatement class contains additional comments intended
// as a general tutorial included in the `core` README.md
// Generally, constructs provide a template parameter
// to indicate the type of AST node they are created from

export class ForStatement extends Statement<ForStatementASTNode> {

    // The discriminant here matches the one from ForStatementASTNode
    public readonly construct_type = "for_statement";

    // All child constructs, this will often (but not always)
    // be parallel to the structure in the AST Node
    public readonly initial: ExpressionStatement | NullStatement | DeclarationStatement;
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
    public constructor(context: BlockContext, ast: ForStatementASTNode, initial: ExpressionStatement | NullStatement | DeclarationStatement,
        condition: Expression, body: Statement, post: Expression | undefined) {

        super(context, ast);

        // Use .attach() to build the links in the construct tree
        this.attach(this.initial = initial);

        if (condition.isWellTyped()) {
            // If the condition has a type, we can attempt to convert
            // it to a boolean. If such a conversion can be made,
            // we should attach the conversion, which has the original
            // condition as a child. (If it can't be made,
            // standardConversion() just returns the original).
            this.attach(this.condition = standardConversion(condition, Bool.BOOL));
        }
        else {
            // If the condition wasn't well typed, we can't even try
            // the conversion, so we just attach the original condition.
            this.attach(this.condition = condition);
        }

        // If our condition is not a bool (and couldn't be converted)
        // to one earlier, give an error. However, if the condition
        // didn't have any type, we don't want error spam, so we won't
        // say anything. (Any non-well-typed exppression will already
        // have an error of its own.) 
        if (this.condition.isWellTyped() && !Predicates.isTypedExpression(this.condition, isType(Bool))) {
            this.addNote(CPPError.stmt.iteration.condition_bool(this, this.condition));
        }

        // Nothing in particular to check here, since as with
        // the initial, we don't care about types or anything.
        // Because of syntax rules baked into the nature of this
        // constructor, we're already guaranteed the body is a
        // statement and the post is an expression as they should be.
        this.attach(this.body = body);
        if (post) {
            this.attach(this.post = post);
        }

        this.attach(this.localDeallocator = createLocalDeallocator(context));
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
    public static createFromAST(ast: ForStatementASTNode, outerContext: BlockContext): ForStatement {
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
        let loopBlockContext = createBlockContext(createLoopContext(outerContext));

        let initial = createStatementFromAST(ast.initial, loopBlockContext);
        let condition = createExpressionFromAST(ast.condition, loopBlockContext);

        // Inner block context for local variables actually inside the loop body curly braces.
        // We always do this, even if the body isn't a block in the source code:
        //    for(...) stmt; is treated equivalently
        // to for(...) { stmt; } according to the C++ standard.
        // Note that this is a separate block context from the outer one for the loop, so variables
        // in here will have a different lifetime, but we share the same scope as the outer loop block context
        let bodyBlockContext = createBlockContext(loopBlockContext, loopBlockContext.contextualScope);

        // NOTE: the use of the body block context for all the children.
        // e.g. for(int i = 0; i < 10; ++i) { cout << i; }
        // All children (initial, condition, post, body) share the same block
        // context and scope where i is declared.
        // If the body is a block, we have to create it using the ctor rather than
        // the createFromAST function, because that function implicitly creates a
        // new block context, which we already did above for bodyBlockContext. And we
        // want it to use bodyBlockContext, not a new block context further nested within that.
        let body = ast.body.construct_type !== "block"
            ? createStatementFromAST(ast.body, bodyBlockContext)
            : new Block(bodyBlockContext, ast.body, ast.body.statements.map(s => createStatementFromAST(s, bodyBlockContext)));

        let post = ast.post && createExpressionFromAST(ast.post, bodyBlockContext);


        return new ForStatement(loopBlockContext, ast, initial, condition, body, post);

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
    public createDefaultOutlet(this: CompiledForStatement, element: JQuery, parent?: ConstructOutlet) {
        return new ForStatementOutlet(element, this, parent);
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && areSemanticallyEquivalent(this.initial, other.initial, equivalenceContext)
            && areSemanticallyEquivalent(this.condition, other.condition, equivalenceContext)
            && areSemanticallyEquivalent(this.body, other.body, equivalenceContext)
            && areSemanticallyEquivalent(this.post, other.post, equivalenceContext);
    }
}

export interface CompiledForStatement extends ForStatement, SuccessfullyCompiled {
    readonly initial: CompiledExpressionStatement | CompiledNullStatement | CompiledDeclarationStatement;
    readonly condition: CompiledExpression<Bool, "prvalue">;
    readonly body: CompiledStatement;
    readonly post?: CompiledExpression;
    readonly localDeallocator: CompiledObjectDeallocator;
}

export class RuntimeForStatement extends RuntimeStatement<CompiledForStatement> {

    public readonly initial: RuntimeExpressionStatement | RuntimeNullStatement | RuntimeDeclarationStatement;
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
        }
        else {
            // remove 4th step which is the post step
            this.upNextFns = RuntimeForStatement.upNextFns.slice();
            this.upNextFns.splice(3, 1);
        }
        this.localDeallocator = model.localDeallocator.createRuntimeConstruct(this);
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
                rt.sim.push(asMutable(rt).body = createRuntimeStatement(rt.model.body, rt));
            }
            else {
                rt.startCleanup();
            }
        },
        (rt: RuntimeForStatement) => {
            assert(rt.model.post);
            rt.sim.push(asMutable(rt).post = createRuntimeExpression(rt.model.post, rt));
        },
        (rt: RuntimeForStatement) => {
            // Do nothing, pass to stepForward, which will reset
        }
    ];

    protected upNextImpl() {
        this.upNextFns[this.index++](this);
        if (this.index === this.upNextFns.length) {
            this.index = 1; // reset to 1 rather than 0, since 0 is the initial which only happens once
        }
    }

    public stepForwardImpl() {
        (<Mutable<this>>this).condition = createRuntimeExpression(this.model.condition, this);
        delete (<Mutable<this>>this).body;
        delete (<Mutable<this>>this).post;

    }

}
