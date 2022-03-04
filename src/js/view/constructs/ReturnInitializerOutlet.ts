import { CompiledDirectInitializer, RuntimeAtomicDirectInitializer, RuntimeDirectInitializer, RuntimeReferenceDirectInitializer } from "../../core/constructs/initializers/DirectInitializer";
import { messageResponse } from "../../util/observe";
import { htmlDecoratedName, htmlDecoratedValue } from "../../util/util";
import { ConstructOutlet } from "./ConstructOutlet";
import { getValueString } from "./common";
import { addChildExpressionOutlet, ExpressionOutlet } from "./ExpressionOutlets";




export class ReturnInitializerOutlet extends ConstructOutlet<RuntimeDirectInitializer> {

    public readonly expression: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledDirectInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);
        this.expression = addChildExpressionOutlet(element, construct.args[0], this);
    }


    @messageResponse("referenceInitialized", "unwrap")
    private referenceInitialized(data: RuntimeReferenceDirectInitializer) {
        let obj = data.args[0].evalResult;
        this.observable.send("returnPassed", {
            func: data.containingRuntimeFunction,
            start: this.element,
            html: htmlDecoratedName(obj.name ?? `@${obj.address}`),
            result: obj
        });
    }

    @messageResponse("atomicObjectInitialized", "unwrap")
    private atomicObjectInitialized(data: RuntimeAtomicDirectInitializer) {
        let value = data.args[0].evalResult;
        this.observable.send("returnPassed", {
            func: data.containingRuntimeFunction,
            start: this.element,
            html: htmlDecoratedValue(getValueString(value)),
            result: value
        });
    }
}
