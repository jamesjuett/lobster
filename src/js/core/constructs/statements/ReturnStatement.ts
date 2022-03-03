import { ReturnStatementASTNode } from "../../../ast/ast_statements";
import { assertNever } from "../../../util/util";
import { ConstructOutlet, ReturnStatementOutlet } from "../../../view/codeOutlets";
import { areSemanticallyEquivalent, BlockContext, SemanticContext } from "../../compilation/contexts";
import { ReturnByReferenceEntity, ReturnObjectEntity } from "../../compilation/entities";
import { CPPError } from "../../compilation/errors";
import { AnalyticConstruct } from "../../../analysis/predicates";
import { VoidType } from "../../compilation/types";
import { SuccessfullyCompiled } from "../constructs";
import { CompiledExpression, Expression } from "../expressions/Expression";
import { createExpressionFromAST } from "../expressions/expressions";
import { CompiledDirectInitializer, DirectInitializer, RuntimeDirectInitializer } from "../initializers/DirectInitializer";
import { Statement, RuntimeStatement } from "./Statement";


export class ReturnStatement extends Statement<ReturnStatementASTNode> {
    public readonly construct_type = "return_statement";

    public readonly expression?: Expression;

    // TODO: Technically, this should be CopyInitializer
    public readonly returnInitializer?: DirectInitializer;

    public static createFromAST(ast: ReturnStatementASTNode, context: BlockContext) {
        return ast.expression
            ? new ReturnStatement(context, ast, createExpressionFromAST(ast.expression, context))
            : new ReturnStatement(context, ast);
    }

    public constructor(context: BlockContext, ast: ReturnStatementASTNode, expression?: Expression) {
        super(context, ast);

        let returnType = this.context.containingFunction.type.returnType;

        if (returnType instanceof VoidType) {
            if (expression) {
                // We have an expression to return, but the type is void, so that's bad
                this.addNote(CPPError.stmt.returnStatement.exprVoid(this));
                this.attach(this.expression = expression);
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
            this.addNote(CPPError.stmt.returnStatement.incomplete_type(this, returnType));
            this.attach(this.expression = expression);
            return;
        }

        if (returnType.isReferenceType()) {
            this.returnInitializer = DirectInitializer.create(context, new ReturnByReferenceEntity(returnType), [expression], "copy");
        }
        else if (returnType.isCompleteObjectType()) {
            this.returnInitializer = DirectInitializer.create(context, new ReturnObjectEntity(returnType), [expression], "copy");
        }
        else {
            assertNever(returnType);
        }

        // Note: The expression is NOT attached directly here, since it's attached under the initializer.
        this.expression = expression;
        this.attach(this.returnInitializer);
    }



    public createDefaultOutlet(this: CompiledReturnStatement, element: JQuery, parent?: ConstructOutlet) {
        return new ReturnStatementOutlet(element, this, parent);
    }

    // isTailChild : function(child){
    //     return {isTail: true,
    //         reason: "The recursive call is immediately followed by a return."};
    // }
    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && areSemanticallyEquivalent(this.expression, other.expression, equivalenceContext);
    }
}

export interface CompiledReturnStatement extends ReturnStatement, SuccessfullyCompiled {
    readonly expression?: CompiledExpression;
    readonly returnInitializer?: CompiledDirectInitializer;
}
enum RuntimeReturnStatementIndices {
    PUSH_INITIALIZER,
    RETURN
}

export class RuntimeReturnStatement extends RuntimeStatement<CompiledReturnStatement> {

    public readonly returnInitializer?: RuntimeDirectInitializer;

    private index = RuntimeReturnStatementIndices.PUSH_INITIALIZER;

    public constructor(model: CompiledReturnStatement, parent: RuntimeStatement) {
        super(model, parent);
        if (model.returnInitializer) {
            this.returnInitializer = model.returnInitializer.createRuntimeInitializer(this);
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
