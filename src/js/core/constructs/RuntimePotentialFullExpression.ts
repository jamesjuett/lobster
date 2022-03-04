import { assertFalse } from "../../util/util";
import { TemporaryObject } from "../runtime/objects";
import { RuntimeConstruct, StackType } from "./CPPConstruct";
import { RuntimeTemporaryDeallocator } from "./TemporaryDeallocator";
import { CompiledPotentialFullExpression } from "./PotentialFullExpression";


export abstract class RuntimePotentialFullExpression<C extends CompiledPotentialFullExpression = CompiledPotentialFullExpression> extends RuntimeConstruct<C> {
    public readonly temporaryDeallocator?: RuntimeTemporaryDeallocator;

    public readonly temporaryObjects: {
        [index: number]: TemporaryObject | undefined;
    } = {};

    public readonly containingFullExpression: RuntimePotentialFullExpression;

    public constructor(model: C, stackType: StackType, parent: RuntimeConstruct) {
        super(model, stackType, parent);
        if (this.model.temporaryDeallocator) {
            this.temporaryDeallocator = this.model.temporaryDeallocator.createRuntimeConstruct(this);
            this.setCleanupConstruct(this.temporaryDeallocator);
        }
        this.containingFullExpression = this.findFullExpression();
    }

    private findFullExpression(): RuntimePotentialFullExpression {
        let rt: RuntimeConstruct = this;
        while (!rt.model.isFullExpression() && rt.parent) {
            rt = rt.parent;
        }
        if (rt instanceof RuntimePotentialFullExpression) {
            return rt;
        }
        else {
            return assertFalse();
        }
    }
}
