# Language Constructs

A language construct is represented by several different classes/types that represent that construct in different contexts. Generally, in each of the contexts, the construct is situated within a tree-like structure or other language constructs (e.g. a Node in an AST, or a runtime expression with subexpressions and a parent).

For example, consider the types associated with a `for` loop:

 - `ForStatementASTNode` - An `interface` that specifies the syntactic structureof a foor loop as part of an AST
 - `ForStatement` - A `class` that represents a for loop as a semantic construct. Encapsulates everything known about the construct at compile-time (e.g. type system, compile errors, static analysis, child constructs, etc.). Part of an "abstract semantic tree" (technically a "forest") for the `Program` overall.
   - `CompiledForStatement` - An `interface` that extends `ForStatement` with properties known to be true for a `for` loop that compiles without error (e.g. all child constructs are also successfully compiled, the condition construct is specifically a `CompiledExpression<Bool,"prvalue">`, etc.)
   - analytic type unions
 - `RuntimeForStatement` - A `class` that represents a specific "instantiation" of a for loop at runtime. Refers back to a compile-time `ForStatement` as its "**model**". Controls step-by-step execution, creates child runtime constructs for sub-statements/sub-expressions, is part of a "runtime tree". When executing, this sort of construct is part of the execution stack managed by a `Simulation`.
 - `ForStatementOutlet` - An "outlet" or view (à la MVC pattern) that attaches to a `RuntimeForStatement` and participates as part of a "visualization tree" of constructs currently on a `Simulation`'s execution stack. In principle, several different kinds of outlets might exist for a particular language construct that one could pick and choose from using factory functions, but currently there is only one type created with a `createDefaultOutlet` function.

## Statement Example `for` loops:

We'll look through a few examples of currently implemented language constructs.

### `ForStatementASTNode` in `statements.ts`

```typescript
export interface ForStatementASTNode extends ASTNode {
    readonly construct_type: "for_statement";
    readonly condition: ExpressionASTNode;
    readonly initial: ExpressionStatementASTNode | NullStatementASTNode | DeclarationStatementASTNode;
    readonly post: ExpressionASTNode;
    readonly body: StatementASTNode;
}
```