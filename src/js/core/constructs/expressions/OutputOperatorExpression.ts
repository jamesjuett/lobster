import { AtomicType, ArrayPointerType, isAtomicType, isBoundedArrayType, PotentiallyCompleteClassType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { CPPError } from "../../compilation/errors";
import { Value } from "../../runtime/Value";
import { Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { ConstructOutlet, OutputOperatorExpressionOutlet } from "../../../view/codeOutlets";
import { Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { ArithmeticBinaryOperatorExpressionASTNode } from "../../../ast/ast_expressions";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { createRuntimeExpression } from "./expressions";
import { convertToPRValue,  } from "./ImplicitConversion";
import { CompiledStringLiteralExpression, RuntimeStringLiteralExpression } from "./StringLiteralExpression";






export class OutputOperatorExpression extends Expression<ArithmeticBinaryOperatorExpressionASTNode> {
    public readonly construct_type = "output_operator_expression";

    public readonly type: PotentiallyCompleteClassType;
    public readonly valueCategory = "lvalue";

    public readonly left: TypedExpression<PotentiallyCompleteClassType, "lvalue">;
    public readonly right: Expression;

    public readonly operator = "<<";

    public constructor(context: ExpressionContext, ast: ArithmeticBinaryOperatorExpressionASTNode,
        left: TypedExpression<PotentiallyCompleteClassType, "lvalue">,
        right: Expression) {
        super(context, ast);

        this.attach(this.left = left);
        this.type = this.left.type;

        // left is already well-typed via ctor parameter type
        if (!right.isWellTyped()) {
            this.attach(this.right = right);
            return;
        }

        if (right.isStringLiteralExpression()) {
            // Avoid array-to-pointer conversion which creates an
            // awkward extra step as the string literal turns into
            // a char* that is then just special cased by cout.
            this.attach(this.right = right);
        }
        else if (Predicates.isTypedExpression(right, isAtomicType) || Predicates.isTypedExpression(right, isBoundedArrayType)) {
            this.attach(this.right = convertToPRValue(right));
        }
        else {
            this.addNote(CPPError.expr.output.unsupported_type(this, right.type));
            this.attach(this.right = right);
        }

    }

    public createDefaultOutlet(this: CompiledOutputOperatorExpression, element: JQuery, parent?: ConstructOutlet) {
        return new OutputOperatorExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedOutputOperatorExpression extends OutputOperatorExpression, t_TypedExpression {
}

export interface CompiledOutputOperatorExpression extends TypedOutputOperatorExpression, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly left: CompiledExpression<PotentiallyCompleteClassType, "lvalue">;
    readonly right: CompiledExpression<AtomicType, "prvalue"> | CompiledStringLiteralExpression;
}


export class RuntimeOutputOperatorExpression extends SimpleRuntimeExpression<PotentiallyCompleteClassType, "lvalue", CompiledOutputOperatorExpression> {

    public readonly left: RuntimeExpression<PotentiallyCompleteClassType, "lvalue">;
    public readonly right: RuntimeExpression<AtomicType, "prvalue"> | RuntimeStringLiteralExpression;

    public constructor(model: CompiledOutputOperatorExpression, parent: RuntimeConstruct) {
        super(model, parent);
        this.left = createRuntimeExpression(this.model.left, this);
        if (this.model.right.isStringLiteralExpression()) {
            this.right = createRuntimeExpression(this.model.right, this);
        }
        else {
            this.right = createRuntimeExpression(this.model.right, this);
        }
        this.setSubexpressions([this.left, this.right]);
    }

    public operate() {
        if (this.right instanceof RuntimeStringLiteralExpression) {
            this.sim.cout(new Value(this.right.evalResult.address, new ArrayPointerType(this.right.evalResult)));
        }
        else {
            this.sim.cout(this.right.evalResult);
        }
        this.setEvalResult(this.left.evalResult);
    }
}
