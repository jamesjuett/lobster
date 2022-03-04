import { Memory } from "../../core/runtime/Memory";
import { listenTo, MessageResponses, messageResponse, stopListeningTo } from "../../util/observe";
import * as SVG from "@svgdotjs/svg.js";
import { CPPObject } from "../../core/runtime/objects";
import { PointerToCompleteType } from "../../core/compilation/types";
import { Mutable } from "../../util/util";
import { StackFramesOutlet } from "./StackFramesOutlet";
import { TemporaryObjectsOutlet } from "./TemporaryObjectsOutlet";
import { HeapOutlet } from "./HeapOutlet";
import { MemoryObjectOutlet, ArrayMemoryObjectOutlet } from "./MemoryObjectOutlet";








export class MemoryOutlet {

    public readonly memory?: Memory;

    public readonly temporaryObjectsOutlet?: TemporaryObjectsOutlet;
    public readonly stackFramesOutlet?: StackFramesOutlet;
    public readonly heapOutlet?: HeapOutlet;

    private readonly element: JQuery;
    public readonly svgElem: JQuery;
    public readonly svg: SVG.Svg;
    public readonly SVG_DEFS: { [index: string]: SVG.Marker; };

    public _act!: MessageResponses;

    /**
     * Maps from object ID to the outlet that represents that object.
     */
    private objectOutlets: { [index: number]: MemoryObjectOutlet | undefined; } = {};

    /**
     * Used to track SVG elements for pointer arrows. Maps from the object ID
     * for the pointer to the SVG element
     */
    private pointerSVGElems: { [index: number]: SVGPointerArrowMemoryOverlay | undefined; } = {};


    private svgOverlays: SVGMemoryOverlay[] = [];

    // public static updateArrows() {
    //     this.instances = this.instances.filter((ptrMemObj) => {
    //         if (jQuery.contains($("body")[0], ptrMemObj.element[0])) {
    //             ptrMemObj.updateArrow();
    //             return true;
    //         }
    //         else{ //Element is detached
    //             ptrMemObj.clearArrow();
    //             return false;
    //         }
    //     });
    // }
    private svgUpdateThread: number;


    public constructor(element: JQuery) {

        this.element = element.addClass("lobster-memory");

        this.svgElem = $('<div style="position: absolute; left:0; right:0; top: 0; bottom: 0; pointer-events: none; z-index: 10"></div>');
        this.svg = SVG.SVG().addTo(this.svgElem[0]);
        this.SVG_DEFS = {
            arrowStart: this.svg.marker(3, 3, function (add) {
                add.circle(3).fill({ color: '#fff' });
            }),

            arrowEnd: this.svg.marker(6, 6, function (add) {
                add.path("M0,1 L0,5.5 L4,3 L0,1").fill({ color: '#fff' });
            })
        };

        this.element.append(this.svgElem);

        this.svgUpdateThread = window.setInterval(() => this.updateSvg(), 20);
    }

    public dispose() {
        clearInterval(this.svgUpdateThread);
    }

    public setMemory(memory: Memory) {
        this.clearMemory();
        (<Mutable<this>>this).memory = memory;
        listenTo(this, memory);

        (<Mutable<this>>this).temporaryObjectsOutlet = new TemporaryObjectsOutlet($("<div></div>").appendTo(this.element), memory, this);
        (<Mutable<this>>this).stackFramesOutlet = new StackFramesOutlet($("<div></div>").appendTo(this.element), memory, this);
        (<Mutable<this>>this).heapOutlet = new HeapOutlet($("<div></div>").appendTo(this.element), memory, this);

        // Since the simulation has already started, some objects will already be allocated
        memory.allLiveObjects().forEach(obj => this.onObjectAllocated(obj));
    }

    public clearMemory() {
        delete (<Mutable<this>>this).temporaryObjectsOutlet;
        delete (<Mutable<this>>this).stackFramesOutlet;
        delete (<Mutable<this>>this).heapOutlet;

        this.element.children().filter((index, element) => element !== this.svgElem[0]).remove();

        this.onReset();

        if (this.memory) {
            stopListeningTo(this, this.memory);
        }
        delete (<Mutable<this>>this).memory;
    }

    public registerObjectOutlet(outlet: MemoryObjectOutlet) {
        this.objectOutlets[outlet.object.objectId] = outlet;
    }

    public disposeObjectOutlet(outlet: MemoryObjectOutlet) {
        delete this.objectOutlets[outlet.object.objectId];
    }

    public getObjectOutletById(objectId: number) {
        return this.objectOutlets[objectId];
    }

    public addSVGOverlay(overlay: SVGMemoryOverlay) {
        this.svgOverlays.push(overlay);
    }

    private updateSvg() {
        this.svgOverlays = this.svgOverlays.filter(svgOverlay => svgOverlay.update());
    }

    // @messageResponse("pointerPointed")
    // private pointerPointed(msg: Message<{pointer: BoundReferenceEntity, pointee: CPPObject}>) {
    //     let {pointer, pointee} = msg.data;
    // }
    // private updateArrow : function(arrow, start, end) {
    //     start = start || arrow && arrow.oldStart;
    //     end = end || arrow && arrow.oldEnd;
    //     if (arrow && arrow.oldStart && arrow.oldEnd &&
    //         arrow.oldStart.left === start.left && arrow.oldStart.top === start.top &&
    //         arrow.oldEnd.left === end.left && arrow.oldEnd.top === end.top) {
    //         return arrow;
    //     }
    //     var oldStart = {left:start.left,top:start.top};
    //     var oldEnd = {left:end.left, top:end.top};
    //     var off = this.svgElem.offset();
    //     start.left = start.left - off.left;
    //     start.top = start.top - off.top;
    //     end.left = end.left - off.left;
    //     end.top = end.top - off.top;
    //     if (arrow) {
    //         // If arrow already exists, just update it
    //         if (Outlets.CPP.CPP_ANIMATIONS) {
    //             arrow.animate(300).plot([[start.left,start.top],[end.left,end.top]]/*"M"+start.left+","+start.top+" L"+(end.left+50)+","+end.top*/);
    //         }
    //         else{
    //             arrow.plot([[start.left,start.top],[end.left,end.top]]/*"M"+start.left+","+start.top+" L"+(end.left+50)+","+end.top*/);
    //         }
    //     }
    //     else{
    //         arrow = this.svg.polyline([[start.left,start.top],[end.left,end.top]]/*"M"+start.left+","+start.top+" L"+end.left+","+end.top*/).style({
    //             stroke: "#ccccff",
    //             "stroke-width": "1px",
    //             fill: "none"
    //         });
    //         arrow.marker("start", SVG_DEFS.arrowStart);
    //         arrow.marker("end", SVG_DEFS.arrowEnd);
    //     }
    //     arrow.oldStart = oldStart;
    //     arrow.oldEnd = oldEnd;
    //     return arrow;
    // },
    @messageResponse("objectAllocated", "unwrap")
    private onObjectAllocated(object: CPPObject) {
        if (object.type.isPointerToCompleteObjectType()) {
            this.addSVGOverlay(new SVGPointerArrowMemoryOverlay(
                <CPPObject<PointerToCompleteType>>object, this));
        }
    }

    @messageResponse("reset")
    private onReset() {
        this.objectOutlets = {};

        Object.values(this.pointerSVGElems).forEach(line => line?.remove());
        this.pointerSVGElems = {};

        this.svgOverlays.forEach(overlay => overlay.remove());
        this.svgOverlays = [];
    }
}


abstract class SVGMemoryOverlay {

    protected memoryOutlet: MemoryOutlet;

    protected constructor(memoryOutlet: MemoryOutlet) {
        this.memoryOutlet = memoryOutlet;
    }

    public abstract update(): boolean;
    public abstract remove(): void;

}
export class SVGPointerArrowMemoryOverlay extends SVGMemoryOverlay {

    public readonly object: CPPObject<PointerToCompleteType>;

    private line: SVG.Line;

    public constructor(object: CPPObject<PointerToCompleteType>, memoryOutlet: MemoryOutlet) {
        super(memoryOutlet);
        this.object = object;

        this.line = memoryOutlet.svg.line(0, 0, 0, 0)
            .stroke({ color: '#fff', width: 1 });
        this.line.marker("start", memoryOutlet.SVG_DEFS.arrowStart);
        this.line.marker("end", memoryOutlet.SVG_DEFS.arrowEnd);
        this.update();
    }

    public update() {
        if (!this.object.isAlive) {
            this.line.remove();
            return false;
        }

        let pointerElem = this.memoryOutlet.getObjectOutletById(this.object.objectId)?.objElem;

        let targetElem: JQuery | undefined;
        if (this.object.type.isArrayPointerType()) {
            let targetIndex = this.object.type.toIndex(this.object.rawValue());
            let arr = this.object.type.arrayObject;
            let numElems = arr.type.numElems;
            let arrOutlet = <ArrayMemoryObjectOutlet | undefined>this.memoryOutlet.getObjectOutletById(arr.objectId);
            if (0 <= targetIndex && targetIndex < numElems) {
                targetElem = arrOutlet?.elemOutlets[targetIndex].objElem;
            }
            else if (targetIndex === numElems) {
                targetElem = arrOutlet?.onePast;
            }
        }
        else if (this.object.type.isObjectPointerType()) {
            let targetObject = this.object.type.getPointedObject();
            if (targetObject && targetObject.isAlive) {
                targetElem = this.memoryOutlet.getObjectOutletById(targetObject.objectId)?.objElem;
            }
        }

        if (!pointerElem || !targetElem) {
            this.line.hide();
            return true;
        }

        let { startOffset, endOffset } = this.getPointerArrowOffsets(pointerElem, targetElem);

        this.line.plot(startOffset.left, startOffset.top, endOffset.left, endOffset.top);
        // this.line.marker("start", this.memoryOutlet.SVG_DEFS.arrowStart);
        // this.line.marker("end", this.memoryOutlet.SVG_DEFS.arrowEnd);
        this.line.show();

        return true;
    }

    private getPointerArrowOffsets(pointerElem: JQuery, targetElem: JQuery) {

        let endOffset = targetElem.offset()!;
        endOffset.left += targetElem.outerWidth()! / 2;
        //endOffset.top += targetElem.outerHeight();
        let startOffset = pointerElem.offset()!;
        startOffset.left += pointerElem.outerWidth()! / 2;

        // If start is below end (greater offset), we move top of end to bottom.
        if (startOffset.top > endOffset.top) {
            endOffset.top += targetElem.outerHeight()!;
        }
        else {
            startOffset.top += pointerElem.outerHeight()!;
        }

        let svgElemOffset = this.memoryOutlet.svgElem.offset()!;
        startOffset.left -= svgElemOffset.left;
        startOffset.top -= svgElemOffset.top;
        endOffset.left -= svgElemOffset.left;
        endOffset.top -= svgElemOffset.top;

        return { startOffset, endOffset };
    }

    public remove(): void {
        this.line.remove();
    }
}
