import { RuntimeFunction } from "../../core/compilation/functions";
import { AtomicType } from "../../core/compilation/types";
import { listenTo, Message, messageResponse, ObserverType } from "../../util/observe";
import { ConstructOutlet } from "./ConstructOutlet";
import { BlockOutlet } from "./BlockOutlet";
import { CtorInitializerOutlet } from "./CtorInitializerOutlet";
import { ParameterOutlet } from "./ParameterOutlet";


export class FunctionOutlet extends ConstructOutlet<RuntimeFunction> {

    public readonly ctorInitializer?: CtorInitializerOutlet;
    public readonly body: BlockOutlet;

    private readonly paramsElem: JQuery;
    public parameterOutlets: ParameterOutlet[] = [];

    public constructor(element: JQuery, rtFunc: RuntimeFunction, listener?: ObserverType) {
        super(element, rtFunc.model);
        listener && listenTo(listener, this);
        this.element.addClass("function");

        // Constructors/destructors have a dummy return type of void in the representation,
        // but we don't want to show that in the visualization.
        if (!this.construct.declaration.isConstructor) {
            var returnTypeElem = $('<span class="code-returnType">' + this.construct.type.returnType.toString() + "</span>");
            this.element.append(returnTypeElem);
            this.element.append(" ");
        }
        var nameElem = $('<span class="code-functionName">' + this.construct.name + "</span>");
        this.element.append(nameElem);

        this.paramsElem = $("<span>()</span>");
        this.element.append(this.paramsElem);

        if (this.construct.ctorInitializer) {
            this.element.append("<br />");
            this.ctorInitializer = new CtorInitializerOutlet(
                $("<span></span>").appendTo(this.element),
                this.construct.ctorInitializer,
                this);
        }

        let bodyElem = $("<span></span>").appendTo(this.element);
        this.body = new BlockOutlet(bodyElem, this.construct.body, this);

        this.setRuntimeInstance(rtFunc);

    }

    protected instanceSet(inst: RuntimeFunction) {
        super.instanceSet(inst);

        if (inst.hasControl) {
            this.element.addClass("hasControl");
        }

        if (!inst.caller) {
            // special case - if no caller, it must be the main function
            this.paramsElem.html("()");
            return;
        }

        // Set up parameter outlets
        this.paramsElem.empty();
        this.paramsElem.append("(");
        //let paramElems = [];
        let paramDefs = inst.model.parameters;

        this.parameterOutlets = paramDefs.map((paramDef, i) => {
            let elem = $("<span></span>");
            let paramOutlet = new ParameterOutlet(elem, paramDef);
            //this.addChildOutlet(paramOutlet);
            //paramElems.push(elem);
            this.paramsElem.append(elem);
            if (i < paramDefs.length - 1) {
                this.paramsElem.append(", ");
            }
            return paramOutlet;
        });
        this.paramsElem.append(")");
    }

    @messageResponse("gainControl")
    private gainControl() {
        this.element.addClass("hasControl");
    }

    @messageResponse("loseControl")
    private loseControl() {
        this.element.removeClass("hasControl");
    }

    @messageResponse("valueWritten")
    private valueWritten(msg: Message<AtomicType>) {
    }
}
