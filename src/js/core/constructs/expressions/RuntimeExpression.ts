import { Mutable } from "../../../util/util";
import { ExpressionType } from "../../compilation/types";
import { RuntimeConstruct } from "../CPPConstruct";
import { RuntimePotentialFullExpression } from "../RuntimePotentialFullExpression";
import { ValueCategory, CompiledExpression, VCResultTypes } from "./Expression";

// : { // Otherwise, T is NOT possibly an ObjectType. This could happen with e.g. an lvalue expression that yields a function
//     readonly prvalue: number;
//     readonly xvalue: number;
//     readonly lvalue: number;
// };
export abstract class RuntimeExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory, C extends CompiledExpression<T, V> = CompiledExpression<T, V>> extends RuntimePotentialFullExpression<C> {

    /**
     * WARNING: The evalResult property may be undefined, even though it's type suggests it will always
     * be defined. In most places where it is accessed, there is an implicit assumption that the expression
     * will already have been evaluated and the client code would end up needing a non-null assertion anyway.
     * However, those non-null assertions actually introduce some tricky complications with VCResultTypes,
     * which cause type errors and are a huge pain. So instead we tell the type system to trust us.
     */
    public readonly evalResult!: VCResultTypes<T, V>;

    public constructor(model: C, parent: RuntimeConstruct) {
        super(model, "expression", parent);
    }

    protected setEvalResult(value: VCResultTypes<T, V>) {
        (<Mutable<this>>this).evalResult = value;
        this.observable.send("evaluated", value);
    }
}
