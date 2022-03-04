import { PassByReferenceParameterEntity, PassByValueParameterEntity } from "../../core/compilation/entities";
import { RuntimeFunction } from "../../core/compilation/functions";
import { CompiledFunctionCall, RuntimeFunctionCall } from "../../core/constructs/FunctionCall";
import { CompiledDirectInitializer, RuntimeAtomicDirectInitializer, RuntimeDirectInitializer, RuntimeReferenceDirectInitializer } from "../../core/constructs/initializers/DirectInitializer";
import { messageResponse } from "../../util/observe";
import { htmlDecoratedName, htmlDecoratedValue } from "../../util/util";
import { ConstructOutlet } from "./ConstructOutlet";
import { getValueString } from "./common";
import { addChildExpressionOutlet, ExpressionOutlet } from "./ExpressionOutlets";
import { ReturnDestinationOutlet } from "./ReturnDestinationOutlet";


export class FunctionCallOutlet extends ConstructOutlet<RuntimeFunctionCall> {

    public readonly argInitializerOutlets: readonly ArgumentInitializerOutlet[];
    public readonly returnOutlet?: ReturnDestinationOutlet;

    public constructor(element: JQuery, construct: CompiledFunctionCall, parent: ConstructOutlet,
        returnOutlet?: ReturnDestinationOutlet,
        argumentSeparator: string = ", ") {
        super(element, construct, parent);
        this.returnOutlet = returnOutlet;

        this.argInitializerOutlets = construct.argInitializers.map((argInit, i) => {
            if (i > 0) {
                this.element.append(argumentSeparator);
            }
            return new ArgumentInitializerOutlet($("<span></span>").appendTo(this.element), argInit, this);
        });
    }

    protected instanceSet(inst: RuntimeFunctionCall) {
        // Only need to register if it's active. If it's not active it
        // either hasn't been called yet and will be registered when it is,
        // or it's already returned and been popped off the stack so it
        // doesn't need to be registered.
        if (inst.isActive) {
            this.registerCallOutlet(inst.calledFunction);
        }
    }

    @messageResponse("called", "unwrap")
    private registerCallOutlet(data: RuntimeFunction) {
        this.observable.send("registerCallOutlet", { outlet: this, func: data });
    }
}

export class ArgumentInitializerOutlet extends ConstructOutlet<RuntimeDirectInitializer> {

    public readonly expressionOutlet: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledDirectInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);
        this.element.addClass("code-argumentInitializer");

        this.expressionOutlet = addChildExpressionOutlet(this.element, construct.args[0], this);
    }

    @messageResponse("referenceInitialized", "unwrap")
    private referenceInitialized(data: RuntimeReferenceDirectInitializer) {
        let obj = data.args[0].evalResult;
        this.observable.send("parameterPassed", {
            num: (<PassByReferenceParameterEntity>data.model.target).num,
            start: this.element,
            html: htmlDecoratedName(obj.name ?? `@${obj.address}`)
        });
    }

    @messageResponse("atomicObjectInitialized", "unwrap")
    private atomicObjectInitialized(data: RuntimeAtomicDirectInitializer) {
        this.observable.send("parameterPassed", {
            num: (<PassByValueParameterEntity>data.model.target).num,
            start: this.element,
            html: htmlDecoratedValue(getValueString(data.args[0].evalResult))
        });
    }
}
