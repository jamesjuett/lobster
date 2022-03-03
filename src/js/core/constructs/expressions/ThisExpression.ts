import { PointerType, CompleteClassType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription, isMemberFunctionContext } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { CPPError } from "../../compilation/errors";
import { Expression, t_TypedExpression } from "./Expression";
import { ConstructOutlet, ThisExpressionOutlet } from "../../../view/codeOutlets";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { ThisExpressionASTNode } from "../../../ast/ast_expressions";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";




export class ThisExpression extends Expression<ThisExpressionASTNode> {
    public readonly construct_type = "this_expression";

    public readonly type?: PointerType<CompleteClassType>;
    public readonly valueCategory = "prvalue";

    public constructor(context: ExpressionContext, ast: ThisExpressionASTNode) {
        super(context, ast);

        if (isMemberFunctionContext(context)) {
            this.type = new PointerType(context.contextualReceiverType, true);
        }
        else {
            this.addNote(CPPError.expr.thisExpression.nonStaticMemberFunc(this));
        }

    }

    public static createFromAST(ast: ThisExpressionASTNode, context: ExpressionContext): ThisExpression {
        return new ThisExpression(context, ast);
    }

    public createDefaultOutlet(this: CompiledThisExpression, element: JQuery, parent?: ConstructOutlet) {
        return new ThisExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedThisExpression<T extends PointerType<CompleteClassType> = PointerType<CompleteClassType>> extends ThisExpression, t_TypedExpression {
    readonly type: T;
}

export interface CompiledThisExpression<T extends PointerType<CompleteClassType> = PointerType<CompleteClassType>> extends TypedThisExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export class RuntimeThisExpression<T extends PointerType<CompleteClassType> = PointerType<CompleteClassType>> extends SimpleRuntimeExpression<T, "prvalue", CompiledThisExpression<T>> {

    public constructor(model: CompiledThisExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
    }

    protected operate() {
        this.setEvalResult(<this["evalResult"]>this.contextualReceiver.getPointerTo());
    }

}
