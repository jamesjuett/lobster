import { ExpressionType } from "../../compilation/types";
import { RuntimeConstruct } from "../constructs";
import { assert } from "../../../util/util";
import { ValueCategory, CompiledExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";


export abstract class SimpleRuntimeExpression<T extends ExpressionType = ExpressionType, V extends ValueCategory = ValueCategory, C extends CompiledExpression<T, V> = CompiledExpression<T, V>> extends RuntimeExpression<T, V, C> {

    private index: 0 | 1 = 0;

    private subexpressions: readonly RuntimeExpression[] = [];

    public constructor(model: C, parent: RuntimeConstruct) {
        super(model, parent);
    }

    protected setSubexpressions(subexpressions: readonly RuntimeConstruct[]) {
        assert(subexpressions.every(subexp => subexp instanceof RuntimeExpression));
        this.subexpressions = <RuntimeExpression[]>subexpressions;
    }

    protected upNextImpl() {
        if (this.index === 0) { // subexpressions
            // push subexpressions in reverse order since it's a stack
            for (let i = this.subexpressions.length - 1; i >= 0; --i) {
                this.sim.push(this.subexpressions[i]);
            }
            this.index = 1; // operate
        }
    }

    protected stepForwardImpl() {
        this.operate();
        this.startCleanup();
    }

    protected abstract operate(): void;
}
