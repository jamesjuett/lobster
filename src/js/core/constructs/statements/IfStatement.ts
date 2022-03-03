import { IfStatementASTNode } from "../../../ast/ast_statements";
import { ConstructOutlet, IfStatementOutlet } from "../../../view/codeOutlets";
import { areSemanticallyEquivalent, BlockContext, SemanticContext } from "../../compilation/contexts";
import { CPPError } from "../../compilation/errors";
import { AnalyticConstruct, Predicates } from "../../../analysis/predicates";
import { Bool, isType } from "../../compilation/types";
import { SuccessfullyCompiled } from "../constructs";
import { CompiledExpression, Expression } from "../expressions/Expression";
import { RuntimeExpression } from "../expressions/RuntimeExpression";
import { createExpressionFromAST, createRuntimeExpression } from "../expressions/expressions";
import { standardConversion } from "../expressions/ImplicitConversion";
import { Block, CompiledBlock, RuntimeBlock } from "./Block";
import { Statement, RuntimeStatement } from "./Statement";
import { createStatementFromAST, createRuntimeStatement } from "./statements";


export class IfStatement extends Statement<IfStatementASTNode> {
    public readonly construct_type = "if_statement";

    public readonly condition: Expression;
    public readonly then: Block;
    public readonly otherwise?: Block;

    public static createFromAST(ast: IfStatementASTNode, context: BlockContext): IfStatement {

        let condition = createExpressionFromAST(ast.condition, context);

        // If either of the substatements are not a block, they get their own implicit block context.
        // (If the substatement is a block, it creates its own block context, so we don't do that here.)
        let then = ast.then.construct_type === "block" ?
            createStatementFromAST(ast.then, context) :
            createStatementFromAST({
                construct_type: "block",
                source: ast.then.source,
                statements: [ast.then]
            }, context);

        if (!ast.otherwise) { // no else branch
            return new IfStatement(context, ast, condition, then);
        }
        else { // else branch is present
            // See note above about substatement implicit block context
            let otherwise = ast.otherwise.construct_type === "block" ?
                createStatementFromAST(ast.otherwise, context) :
                createStatementFromAST({
                    construct_type: "block",
                    source: ast.then.source,
                    statements: [ast.otherwise]
                }, context);

            return new IfStatement(context, ast, condition, then, otherwise);
        }
    }

    public constructor(context: BlockContext, ast: IfStatementASTNode, condition: Expression, then: Block, otherwise?: Block) {
        super(context, ast);

        if (condition.isWellTyped()) {
            this.attach(this.condition = standardConversion(condition, Bool.BOOL));
        }
        else {
            this.attach(this.condition = condition);
        }

        this.attach(this.then = then);
        if (otherwise) {
            this.attach(this.otherwise = otherwise);
        }

        if (this.condition.isWellTyped() && !Predicates.isTypedExpression(this.condition, isType(Bool))) {
            this.addNote(CPPError.stmt.if.condition_bool(this, this.condition));
        }
    }



    public createDefaultOutlet(this: CompiledIfStatement, element: JQuery, parent?: ConstructOutlet) {
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
    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && areSemanticallyEquivalent(this.condition, other.condition, equivalenceContext)
            && areSemanticallyEquivalent(this.then, other.then, equivalenceContext)
            && areSemanticallyEquivalent(this.otherwise, other.otherwise, equivalenceContext);
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
            }
            else if (rt.otherwise) {
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
