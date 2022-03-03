import { ExpressionType } from "../../compilation/types";
import { SuccessfullyCompiled } from "../constructs";
import { ValueCategory, Expression, t_TypedExpression } from "./Expression";
import { ConstructOutlet } from "../../../view/codeOutlets";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { ExpressionContext } from "../../compilation/contexts";


const AUXILIARY_EXPRESSION_CONTEXT: ExpressionContext = {
  program: <never>undefined,
  translationUnit: <never>undefined,
  contextualScope: <never>undefined,
  isLibrary: false
}

export class AuxiliaryExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends Expression<never> {
    public readonly construct_type = "auxiliary_expression";

    public readonly type: T;
    public readonly valueCategory: V;

    constructor(type: T, valueCategory: V) {
        super(AUXILIARY_EXPRESSION_CONTEXT, undefined);
        this.type = type;
        this.valueCategory = valueCategory;
    }

    public createDefaultOutlet(this: CompiledAuxiliaryExpression, element: JQuery, parent?: ConstructOutlet): never {
        throw new Error("Cannot create an outlet for an auxiliary expression. (They should never be used at runtime.)");
    }

    public describeEvalResult(depth: number): never {
        throw new Error("Auxiliary expressions have no description");
    }

}

export interface TypedAuxiliaryExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends AuxiliaryExpression<T, V>, t_TypedExpression {
}

export interface CompiledAuxiliaryExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory> extends TypedAuxiliaryExpression<T, V>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}
