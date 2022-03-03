import { sameType, ArithmeticType, Int, Double, Bool, Char } from "../../compilation/types";
import { ExpressionContext, ConstructDescription, SemanticContext } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { Value, RawValueType } from "../../runtime/Value";
import { VCResultTypes, Expression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { ConstructOutlet, NumericLiteralOutlet } from "../../../view/codeOutlets";
import { AnalyticConstruct } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { NumericLiteralASTNode, parseNumericLiteralValueFromAST } from "../../../ast/ast_expressions";


const literalTypes = {
  "int": Int.INT,
  "float": Double.DOUBLE,
  "double": Double.DOUBLE,
  "bool": Bool.BOOL,
  "char": Char.CHAR
};

export class NumericLiteralExpression extends Expression<NumericLiteralASTNode> {
    public readonly construct_type = "numeric_literal_expression";

    public readonly type: ArithmeticType;
    public readonly valueCategory = "prvalue";

    public readonly value: Value<ArithmeticType>;

    // create from ast code:
    // TODO: are there some literal types without conversion functions? There shouldn't be...
    // var conv = literalJSParse[this.ast.type];
    // var val = (conv ? conv(this.ast.value) : this.ast.value);
    public constructor(context: ExpressionContext, ast: NumericLiteralASTNode | undefined, type: ArithmeticType, value: RawValueType) {
        super(context, ast);

        this.type = type;

        this.value = new Value(value, this.type);
    }

    public static createFromAST(ast: NumericLiteralASTNode, context: ExpressionContext) {
        return new NumericLiteralExpression(context, ast, literalTypes[ast.type], parseNumericLiteralValueFromAST(ast));
    }

    // public createRuntimeExpression<T extends ArithmeticType>(this: CompiledNumericLiteralExpression<T>, parent: RuntimeConstruct) : RuntimeNumericLiteral<T>;
    // public createRuntimeExpression<T extends AtomicType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<T extends ArithmeticType>(this: CompiledNumericLiteralExpression<T>, parent: RuntimeConstruct) : RuntimeNumericLiteral<T> {
    //     return new RuntimeNumericLiteral(this, parent);
    // }
    public createDefaultOutlet(this: CompiledNumericLiteralExpression, element: JQuery, parent?: ConstructOutlet) {
        return new NumericLiteralOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && sameType(this.type, other.type)
            && this.value.rawValue === other.value.rawValue;
    }
}

export interface TypedNumericLiteralExpression<T extends ArithmeticType = ArithmeticType> extends NumericLiteralExpression, t_TypedExpression {
    readonly type: T;

}

export interface CompiledNumericLiteralExpression<T extends ArithmeticType = ArithmeticType> extends TypedNumericLiteralExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export class RuntimeNumericLiteral<T extends ArithmeticType = ArithmeticType> extends RuntimeExpression<T, "prvalue", CompiledNumericLiteralExpression<T>> {

    public constructor(model: CompiledNumericLiteralExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
    }

    protected upNextImpl() {
        this.setEvalResult(<VCResultTypes<T, "prvalue">>this.model.value);
        this.startCleanup();
    }

    protected stepForwardImpl() {
        // Do nothing
    }
}
