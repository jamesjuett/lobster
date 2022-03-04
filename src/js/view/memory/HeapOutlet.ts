import { Memory } from "../../core/runtime/Memory";
import { listenTo, MessageResponses, messageResponse, Message } from "../../util/observe";
import { CPPObject, DynamicObject } from "../../core/runtime/objects";
import { CPP_ANIMATIONS } from "../constructs/common";
import { SLIDE_DURATION } from "../simOutlets";
import { createMemoryObjectOutlet } from "./MemoryObjectOutlet";
import { MemoryOutlet } from "./MemoryOutlet";



export class HeapOutlet {

    private readonly element: JQuery;
    private readonly memoryOutlet: MemoryOutlet;
    private readonly objectsElem: JQuery;
    private objectElems: { [index: number]: JQuery; } = {};

    public readonly memory: Memory;

    public _act!: MessageResponses;

    public constructor(element: JQuery, memory: Memory, memoryOutlet: MemoryOutlet) {
        this.element = element.addClass("code-memoryHeap");
        this.memory = memory;
        this.memoryOutlet = memoryOutlet;

        let header = $("<div class='header'>The Heap</div>");
        this.element.append(header);

        this.objectsElem = $("<div></div>");
        this.element.append(this.objectsElem);

        listenTo(this, memory);

        this.objectElems = {};

        for (let key in this.memory.heap.objectMap) {
            this.heapObjectAllocated(this.memory.heap.objectMap[key]);
        }
    }



    @messageResponse("heapObjectAllocated", "unwrap")
    private heapObjectAllocated(obj: DynamicObject) {
        var elem = $("<div style='display: none'></div>");
        createMemoryObjectOutlet(elem, obj, this.memoryOutlet);

        this.objectElems[obj.address] = elem;
        this.objectsElem.prepend(elem);
        if (CPP_ANIMATIONS) {
            elem.slideDown(SLIDE_DURATION);
        }
        else {
            elem.css({ display: "block" });
        }
    }

    @messageResponse("heapObjectDeleted")
    private heapObjectDeleted(msg: Message<CPPObject>) {
        var addr = msg.data.address;
        if (this.objectElems[addr]) {
            this.objectElems[addr].fadeOut(function () {
                $(this).remove();
            });
            delete this.objectElems[addr];
        }
    }

    @messageResponse("reset")
    private reset() {
        this.objectElems = {};
        this.objectsElem.children().remove();
    }
}
