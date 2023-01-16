import { MemoryFrame } from "../../core/runtime/Memory";
import { listenTo, MessageResponses, messageResponse, Message } from "../../util/observe";
import { CPPObject } from "../../core/runtime/objects";
import { BoundReferenceEntity } from "../../core/compilation/entities";
import { RuntimeFunction } from "../../core/compilation/functions";
import { OutletCustomizations } from "../simOutlets";
import { ReferenceMemoryOutlet, createMemoryObjectOutlet } from "./MemoryObjectOutlets";
import { MemoryOutlet } from "./MemoryOutlet";


export class StackFrameOutlet {

    private readonly memoryOutlet: MemoryOutlet;

    private readonly element: JQuery;

    public readonly func: RuntimeFunction;
    public readonly frame: MemoryFrame;

    private readonly referenceOutletsByEntityId: { [index: number]: ReferenceMemoryOutlet; } = {};

    public _act!: MessageResponses;

    private readonly customizations: StackFrameCustomization;

    public constructor(element: JQuery, frame: MemoryFrame, memoryOutlet: MemoryOutlet) {
        this.element = element;
        this.frame = frame;
        this.func = frame.func;
        this.memoryOutlet = memoryOutlet;

        listenTo(this, frame);

        let funcId = this.frame.func.model.constructId;

        this.customizations = OutletCustomizations.func[funcId];
        if (!this.customizations) {
            this.customizations = OutletCustomizations.func[funcId] = {
                minimize: "show"
            };
        }

        this.element.addClass("code-stackFrame");

        let header = $("<div class='header'></div>");
        this.element.append(header);

        let body = $("<div></div>");
        this.element.append(body);

        let minimizeButton = $("<span class='button'></span>");

        if (this.customizations.minimize === "show") {
            minimizeButton.html("hide");
        }
        else {
            minimizeButton.html("show");
            body.css("display", "none");
        }

        minimizeButton.click(() => {
            body.slideToggle();
            if (minimizeButton.html() === "hide") {
                minimizeButton.html("show");
                this.customizations.minimize = "hide";
            }
            else {
                minimizeButton.html("hide");
                this.customizations.minimize = "show";
            }
        });

        header.append(this.func.model.declaration.name);
        header.append(minimizeButton);

        // REMOVE: this is taken care of by actually adding a memory object for the this pointer
        //if (this.frame.func.isMemberFunction) {
        //    var elem = $("<div></div>");
        //    createMemoryObjectOutlet(elem, this.frame.objects[key], this.memoryOutlet);
        //    body.append(elem);
        //}
        this.frame.localObjects.forEach(obj => {
            var elem = $("<div></div>");
            createMemoryObjectOutlet(elem, obj, this.memoryOutlet);
            body.prepend(elem);
        });

        this.func.model.context.functionLocals.localReferences.forEach(ref => {
            // this.referenceOutletsByEntityId[ref.entityId] = new ReferenceMemoryOutlet($("<div></div>").prependTo(body), ref);
        });
    }

    @messageResponse("referenceBound")
    private referenceBound(msg: Message<{ entity: BoundReferenceEntity; object: CPPObject; }>) {
        let { entity, object } = msg.data;
        // this.referenceOutletsByEntityId[entity.entityId].bind(object);
    }
}
export interface StackFrameCustomization {
    minimize: "show" | "hide";
}

export interface TemporaryObjectsCustomization {
    minimize: "show" | "hide";
}
