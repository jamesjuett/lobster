import { ArithmeticType, isArithmeticType, PotentiallyCompleteClassType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { CPPError } from "../../compilation/errors";
import { assertNever } from "../../../util/util";
import { Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { ConstructOutlet, InputOperatorExpressionOutlet } from "../../../view/codeOutlets";
import { Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { ArithmeticBinaryOperatorExpressionASTNode } from "../../../ast/ast_expressions";
import { createRuntimeExpression } from "./expressions";






export class InputOperatorExpression extends Expression<ArithmeticBinaryOperatorExpressionASTNode> {
    public readonly construct_type = "input_operator_expression";

    public readonly type: PotentiallyCompleteClassType;
    public readonly valueCategory = "lvalue";

    public readonly left: TypedExpression<PotentiallyCompleteClassType, "lvalue">;
    public readonly right: Expression;

    public readonly operator = ">>";

    public constructor(context: ExpressionContext, ast: ArithmeticBinaryOperatorExpressionASTNode,
        left: TypedExpression<PotentiallyCompleteClassType, "lvalue">,
        right: Expression) {
        super(context, ast);

        this.attach(this.left = left);
        this.attach(this.right = right);
        this.type = this.left.type;

        // left is already well-typed via ctor parameter type
        if (!right.isWellTyped()) {
            return;
        }

        if (!right.isLvalue()) {
            this.addNote(CPPError.expr.input.lvalue_required(this, right.type));
        }

        if (!Predicates.isTypedExpression(right, isArithmeticType)) {
            this.addNote(CPPError.expr.input.unsupported_type(this, right.type));
        }
    }

    public createDefaultOutlet(this: CompiledInputOperatorExpression, element: JQuery, parent?: ConstructOutlet) {
        return new InputOperatorExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedInputOperatorExpression extends InputOperatorExpression, t_TypedExpression {
}

export interface CompiledInputOperatorExpression extends TypedInputOperatorExpression, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<PotentiallyCompleteClassType, "lvalue">;
    readonly right: CompiledExpression<ArithmeticType, "lvalue">;
}


export class RuntimeInputOperatorExpression extends RuntimeExpression<PotentiallyCompleteClassType, "lvalue", CompiledInputOperatorExpression> {

    public readonly left: RuntimeExpression<PotentiallyCompleteClassType, "lvalue">;
    public readonly right: RuntimeExpression<ArithmeticType, "lvalue">;

    private index: 0 | 1 = 0;

    public constructor(model: CompiledInputOperatorExpression, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        this.right = createRuntimeExpression(this.model.right, this);
    }

    protected upNextImpl() {
        switch (this.index) {
            case 0:
                this.sim.push(this.right);
                this.sim.push(this.left);
                ++this.index;
                break;
            case 1:
                this.sim.cin.skipws();
                if (this.sim.cin.buffer.length === 0) {
                    this.sim.blockUntilCin();
                }
                break;
            default:
                assertNever(this.index);
        }
    }

    protected stepForwardImpl() {
        this.sim.cin.skipws();

        let result = this.sim.cin.extractAndParseFromBuffer(this.right.evalResult.type);

        if (result) {
            this.right.evalResult.writeValue(result.result);
        }
        this.setEvalResult(this.left.evalResult);
        this.startCleanup();
    }
}
