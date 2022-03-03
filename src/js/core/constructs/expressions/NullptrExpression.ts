import { Int } from "../../compilation/types";
import { ExpressionContext, ConstructDescription } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { Expression, t_TypedExpression } from "./Expression";
import { ConstructOutlet, NullptrExpressionOutlet } from "../../../view/codeOutlets";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { NullptrExpressionASTNode } from "../../../ast/ast_expressions";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";




export class NullptrExpression extends Expression<NullptrExpressionASTNode> {
    public readonly construct_type = "nullptr_expression";

    public readonly type = Int.INT;
    public readonly valueCategory = "prvalue";

    public constructor(context: ExpressionContext, ast: NullptrExpressionASTNode) {
        super(context, ast);
    }

    public static createFromAST(ast: NullptrExpressionASTNode, context: ExpressionContext): NullptrExpression {
        return new NullptrExpression(context, ast);
    }

    public createDefaultOutlet(this: CompiledNullptrExpression, element: JQuery, parent?: ConstructOutlet) {
        return new NullptrExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedNullptrExpression extends NullptrExpression, t_TypedExpression {
}

export interface CompiledNullptrExpression extends TypedNullptrExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export class RuntimeNullptrExpression extends SimpleRuntimeExpression<Int, "prvalue", CompiledNullptrExpression> {

    public constructor(model: CompiledNullptrExpression, parent: RuntimeConstruct) {
        super(model, parent);
    }

    protected operate() {
        this.setEvalResult(Int.ZERO);
    }

}
