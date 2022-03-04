import { RuntimeConstruct } from "../../core/constructs/CPPConstruct";
import { listenTo, Message, messageResponse, MessageResponses, Observable, stopListeningTo } from "../../util/observe";
import { Mutable } from "../../util/util";

export abstract class ConstructOutlet<RTConstruct_type extends RuntimeConstruct = RuntimeConstruct> {

    protected readonly element: JQuery;
    protected readonly construct: RTConstruct_type["model"];

    public readonly parent?: ConstructOutlet;
    public readonly inst?: RTConstruct_type;

    public _act!: MessageResponses;
    public readonly observable = new Observable<ConstructOutletMessages>(this);

    private static _ID = 0;
    private outletID = ConstructOutlet._ID++;

    /**
     * Children are stored by the ID of the CPPConstruct they display.
     */
    protected readonly children: { [index: number]: ConstructOutlet; } = {};

    public constructor(element: JQuery, construct: RTConstruct_type["model"], parent?: ConstructOutlet) {
        this.element = element;
        this.construct = construct;

        if (parent) {
            parent.addChildOutlet(this);
        }

        this.element.addClass("codeInstance");
        this.element.append("<span class=\"lobster-highlight\"></span>");
    }

    public setRuntimeInstance(inst: RTConstruct_type) {
        if (this.inst) {
            this.removeInstance();
        }

        (<Mutable<this>>this).inst = inst;
        if (this.inst) {
            listenTo(this, inst);
        }

        for (let id in inst.children) {
            this.setChildInstance(inst.children[id]);
        }

        this.instanceSet(inst);
    }

    protected instanceSet(inst: RTConstruct_type) {
        this.element.toggleClass("upNext", inst.isUpNext);
        this.element.toggleClass("wait", inst.isWaiting);
    }

    public removeInstance() {

        // Note: should be a fact that if I have no instance, neither do my children
        if (this.inst) {

            // First remove children instances (deepest children first, due to recursion)
            for (let c in this.children) {
                this.children[c].removeInstance();
            }

            stopListeningTo(this, this.inst);
            let oldInst = this.inst;
            delete (<Mutable<this>>this).inst;

            this.instanceRemoved(oldInst);
        }
    }

    protected instanceRemoved(oldInst: RTConstruct_type) {
        this.element.removeClass("upNext");
        this.element.removeClass("wait");
    }

    private addChildOutlet(child: ConstructOutlet) {
        this.children[child.construct.constructId] = child;
        (<Mutable<ConstructOutlet>>child).parent = this;
        this.observable.send("childOutletAdded", { parent: this, child: child });
    }

    private setChildInstance(childInst: RuntimeConstruct) {
        let childOutlet = this.children[childInst.model.constructId];

        // If we have a child outlet waiting, go for it
        if (childOutlet) {
            childOutlet.setRuntimeInstance(childInst);
            return;
        }

        // TODO: took this out. not currently used. decide if I actually want this
        // Although we didn't find an outlet for this child construct here,
        // we should give its children a chance to get added here
        // for(let id in childInst.children) {
        //     this.setChildInstance(childInst.children[id]);
        // }
        // Otherwise, pass to parent that may have a suitable outlet
        if (this.parent) {
            this.parent.setChildInstance(childInst);
        }
        else {
            console.log("WARNING! Child instance pushed for which no corresponding child outlet was found! (" + childInst.model.constructId + ")");
        }
    }


    @messageResponse("upNext")
    private upNext() {
        this.element.removeClass("wait");
        this.element.addClass("upNext");
    }

    @messageResponse("wait")
    private wait() {
        this.element.removeClass("upNext");
        this.element.addClass("wait");
    }

    @messageResponse("popped")
    protected popped() {
        this.element.removeClass("upNext");
        this.element.removeClass("wait");
    }

    // Called when child instance is created under any instance this
    // outlet is listening to. Looks for a child outlet of this outlet
    // that is waiting for the code model associated with the instance.
    // Propagates the child instance upward through ancestors until one
    // is found that was waiting for it.
    @messageResponse("childInstanceCreated")
    private childInstanceCreated(msg: Message<RuntimeConstruct>) {
        this.setChildInstance(msg.data);
    }

    @messageResponse("current")
    private current() {
        this.element.addClass("current");
    }

    @messageResponse("uncurrent")
    private uncurrent() {
        this.element.removeClass("current");
    }

    @messageResponse("identifyCodeOutlet")
    private identifyCodeOutlet(msg: Message<(me: this) => void>) {
        msg.data(this);
    }
}
type ConstructOutletMessages = "childOutletAdded" | "parameterPassed" | "registerCallOutlet" | "returnPassed";
