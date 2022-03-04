import { Memory, MemoryFrame } from "../../core/runtime/Memory";
import { listenTo, MessageResponses, messageResponse, Message } from "../../util/observe";
import { CPP_ANIMATIONS } from "../constructs/common";
import { FADE_DURATION, SLIDE_DURATION } from "../simOutlets";
import { MemoryOutlet } from "./MemoryOutlet";
import { StackFrameOutlet } from "./StackFrameOutlet";



export class StackFramesOutlet {

    private readonly element: JQuery;
    private readonly memoryOutlet: MemoryOutlet;
    private readonly framesElem: JQuery;
    private readonly frameElems: JQuery[] = [];

    public readonly memory: Memory;

    public _act!: MessageResponses;

    public constructor(element: JQuery, memory: Memory, memoryOutlet: MemoryOutlet) {
        this.element = element;
        this.memoryOutlet = memoryOutlet;
        this.memory = memory;

        listenTo(this, memory);

        this.memoryOutlet = memoryOutlet;

        this.element.addClass("code-memoryStack");

        let header = $("<div class='header'>The Stack</div>");
        this.element.append(header);

        this.framesElem = $('<div></div>');
        this.element.append(this.framesElem);

        this.memory.stack.frames.forEach(frame => this.pushFrame(frame));
    }

    private pushFrame(frame: MemoryFrame) {


        let frameElem = $("<div style=\"display: none\"></div>");
        new StackFrameOutlet(frameElem, frame, this.memoryOutlet);

        this.frameElems.push(frameElem);
        this.framesElem.prepend(frameElem);
        if (frame.func.model.context.isLibrary) {
            // leave display as none
        }
        else if (CPP_ANIMATIONS) {
            (this.frameElems.length == 1 ? frameElem.fadeIn(FADE_DURATION) : frameElem.slideDown(SLIDE_DURATION));
        }
        else {
            frameElem.css({ display: "block" });
        }
    }

    @messageResponse("framePushed")
    private framePushed(msg: Message<MemoryFrame>) {
        this.pushFrame(msg.data);
    }

    private popFrame() {
        if (CPP_ANIMATIONS) {
            let popped = this.frameElems.pop()!;
            popped.slideUp(SLIDE_DURATION, function () {
                $(this).remove();
            });
        }
        else {
            let popped = this.frameElems.pop()!;
            popped.remove();
        }
    }

    @messageResponse("framePopped")
    private framePopped() {
        this.popFrame();
    }

    @messageResponse("reset")
    private reset() {
        this.frameElems.length = 0;
        this.framesElem.children("div").remove();
    }
}
