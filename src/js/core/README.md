# Language Constructs

A language construct is represented by several different classes/types that represent that construct in different contexts. Generally, in each of the contexts, the construct is situated within a tree-like structure or other language constructs (e.g. a Node in an AST, or a runtime expression with subexpressions and a parent).

For example, consider the types associated with a `for` loop:

 - `ForStatementASTNode` - An `interface` that specifies the syntactic structureof a foor loop as part of an AST
 - `ForStatement` - A `class` that represents a for loop as a semantic construct. Encapsulates everything known about the construct at compile-time (e.g. type system, compile errors, static analysis, child constructs, etc.). Part of an "abstract semantic tree" (technically a "forest") for the `Program` overall.
   - `CompiledForStatement` - An `interface` that extends `ForStatement` with properties known to be true for a `for` loop that compiles without error (e.g. all child constructs are also successfully compiled, the condition construct is specifically a `CompiledExpression<Bool,"prvalue">`, etc.)
   - analytic type unions
 - `RuntimeForStatement` - A `class` that represents a specific "instantiation" of a for loop at runtime. Refers back to a compile-time `ForStatement` as its "**model**". Controls step-by-step execution, creates child runtime constructs for sub-statements/sub-expressions, is part of a "runtime tree". When executing, this sort of construct is part of the execution stack managed by a `Simulation`.
 - `ForStatementOutlet` - An "outlet" or view (à la MVC pattern) that attaches to a `RuntimeForStatement` and participates as part of a "visualization tree" of constructs currently on a `Simulation`'s execution stack. In principle, several different kinds of outlets might exist for a particular language construct that one could pick and choose from using factory functions, but currently there is only one type created with a `createDefaultOutlet` function.

Let's look through a few examples of currently implemented language constructs in more detail.
## Statement Example `for` loops:


### `ForStatementASTNode` in `statements.ts`

The AST node interface for a `for` loop lets you know what to expect syntactically from a `for` loop that has parsed successfully. Note that union types are quite common in these interface declarations, since they naturally arise from unions in the language grammar, e.g. the initial part of a `for` loop may be a declaration, expression, or empty (a null statement);

```typescript
export interface ForStatementASTNode extends ASTNode {

    // A discriminant property used to match up against
    // the other types/classes representing different
    // aspects of for loops. This is a string literal type.
    readonly construct_type: "for_statement";

    // Each of the child language constructs you expect
    // to find under a for loop in the AST
    readonly condition: ExpressionASTNode;
    readonly initial: ExpressionStatementASTNode | NullStatementASTNode | DeclarationStatementASTNode;
    readonly post: ExpressionASTNode;
    readonly body: StatementASTNode;
}
```

### `ForStatement` in `statements.ts`

The code below is augmented with additional comments.

```typescript
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
  public readonly post: Expression;

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
    condition: Expression, body: Statement, post: Expression) {

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
    if (this.condition.isWellTyped() && !this.condition.isTyped(Bool)) {
      this.addNote(CPPError.stmt.iteration.condition_bool(this, this.condition));
    }

    // Nothing in particular to check here, since as with
    // the initial, we don't care about types or anything.
    // Because of syntax rules baked into the nature of this
    // constructor, we're already guaranteed the body is a
    // statement and the post is an expression as they should be.
    this.attach(this.body = body);
    this.attach(this.post = post);
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
  public static createFromAST(ast: ForStatementASTNode, context: BlockContext): ForStatement {

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

    // Let's create the body first. But there's one quick exception:
    // Basically, for(...) stmt; is treated equivalently
    // to for(...) { stmt; } according to the C++ standard.

    // If the body substatement is not a block, it gets its own implicit block context.
    // (If the substatement is a block, it will create its own block context, so we don't do that here.)
    let body = ast.body.construct_type === "block" ?
      createStatementFromAST(ast.body, context) :
      createStatementFromAST(ast.body, createBlockContext(context));

    // NOTE the use of body block context for all the children.
    // e.g. for(int i = 0; i < 10; ++i) { cout << i; }
    // All children (initial, condition, post, body) share the same block
    // context and scope where i is declared.
    return new ForStatement(context, ast,
      createStatementFromAST(ast.initial, body.context),
      createExpressionFromAST(ast.condition, body.context),
      body,
      createExpressionFromAST(ast.post, body.context));

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

}
```
