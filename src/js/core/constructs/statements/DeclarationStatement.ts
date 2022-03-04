import { DeclarationStatementASTNode } from "../../../ast/ast_statements";
import { Mutable } from "../../../util/util";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { areAllSemanticallyEquivalent, BlockContext, SemanticContext } from "../../compilation/contexts";
import { CPPError } from "../../compilation/errors";
import { AnalyticConstruct } from "../../../analysis/predicates";
import { CPPConstruct, SuccessfullyCompiled } from "../CPPConstruct";
import { InvalidConstruct } from "../InvalidConstruct";
import { AnalyticCompiledDeclaration } from "../declarations/analytics";
import { ClassDefinition } from "../declarations/class/ClassDefinition";
import { createLocalDeclarationFromAST, LocalDeclaration, LocalSimpleDeclaration } from "../declarations/declarations";
import { FunctionDefinition } from "../declarations/function/FunctionDefinition";
import { Statement, RuntimeStatement } from "./Statement";
import { DeclarationStatementOutlet } from "../../../view/constructs/StatementOutlets";


export class DeclarationStatement extends Statement<DeclarationStatementASTNode> {
    public readonly construct_type = "declaration_statement";

    public readonly declarations: readonly LocalDeclaration[] | FunctionDefinition | ClassDefinition | InvalidConstruct;

    public static createFromAST(ast: DeclarationStatementASTNode, context: BlockContext) {
        return new DeclarationStatement(context, ast, createLocalDeclarationFromAST(ast.declaration, context));
    }

    public constructor(context: BlockContext, ast: DeclarationStatementASTNode, declarations: readonly LocalDeclaration[] | FunctionDefinition | ClassDefinition | InvalidConstruct) {
        super(context, ast);

        if (declarations instanceof InvalidConstruct) {
            this.attach(this.declarations = declarations);
            return;
        }

        if (declarations instanceof FunctionDefinition) {
            this.addNote(CPPError.stmt.function_definition_prohibited(this));
            this.attach(this.declarations = declarations);
            return;
        }

        if (declarations instanceof ClassDefinition) {
            this.addNote(CPPError.lobster.unsupported_feature(this, "local classes"));
            this.attach(this.declarations = declarations);
            return;
        }

        this.attachAll(this.declarations = declarations);
    }



    public createDefaultOutlet(this: CompiledDeclarationStatement, element: JQuery, parent?: ConstructOutlet) {
        return new DeclarationStatementOutlet(element, this, parent);
    }

    public isTailChild(child: CPPConstruct) {
        return { isTail: true };
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && Array.isArray(this.declarations) && Array.isArray(other.declarations)
            && areAllSemanticallyEquivalent(this.declarations, other.declarations, equivalenceContext);
    }
}

export interface CompiledDeclarationStatement extends DeclarationStatement, SuccessfullyCompiled {

    // narrows to compiled version and rules out a FunctionDefinition, ClassDefinition, or InvalidConstruct
    readonly declarations: readonly AnalyticCompiledDeclaration<LocalSimpleDeclaration>[];
}

export class RuntimeDeclarationStatement extends RuntimeStatement<CompiledDeclarationStatement> {

    public readonly currentDeclarationIndex: number | null = null;

    public constructor(model: CompiledDeclarationStatement, parent: RuntimeStatement) {
        super(model, parent);
    }

    protected upNextImpl() {
        let nextIndex = this.currentDeclarationIndex === null ? 0 : this.currentDeclarationIndex + 1;

        let initializers = this.model.declarations.map(d => d.initializer);
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
        }
        else {
            this.startCleanup();
        }
    }

    public stepForwardImpl() {
        return false;
    }
}
