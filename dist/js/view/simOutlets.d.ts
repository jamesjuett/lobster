/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { Memory, MemoryFrame } from "../core/runtimeEnvironment";
import { MessageResponses } from "../util/observe";
import * as SVG from "@svgdotjs/svg.js";
import { CPPObject } from "../core/objects";
import { AtomicType, CompleteObjectType, PointerType, BoundedArrayType, ArrayElemType, CompleteClassType } from "../core/types";
import { Simulation, SimulationInputStream } from "../core/Simulation";
import { BoundReferenceEntity, UnboundReferenceEntity, NamedEntity } from "../core/entities";
import { FunctionOutlet, ConstructOutlet, FunctionCallOutlet } from "./codeOutlets";
import { RuntimeFunction } from "../core/functions";
import { Project } from "../core/Project";
export declare class SimulationOutlet {
    readonly sim?: Simulation;
    private simRunner?;
    private runnerDelay;
    readonly codeStackOutlet: CodeStackOutlet;
    readonly memoryOutlet: MemoryOutlet;
    readonly cinBufferOutlet: IstreamBufferOutlet;
    private readonly element;
    private readonly runningProgressElem;
    private readonly buttonElems;
    private readonly alertsElem;
    private readonly consoleContentsElem;
    private readonly cinEntryElem;
    private breadcrumbs;
    _act: MessageResponses;
    constructor(element: JQuery);
    setSimulation(sim: Simulation): void;
    clearSimulation(): void;
    private refreshSimulation;
    private setEnabledButtons;
    private restart;
    private stepForward;
    private leaveBreadcrumb;
    private stepOver;
    private stepOut;
    private runToEnd;
    private pause;
    private stepBackward;
    private hideAlerts;
    private cout;
    private onCinInput;
    private onEventOccurred;
    private reset;
    private atEnded;
}
export declare class DefaultLobsterOutlet {
    private projectEditor;
    private simulationOutlet;
    readonly project: Project;
    readonly sim?: Simulation;
    private readonly element;
    private readonly tabsElem;
    _act: MessageResponses;
    constructor(element: JQuery, project: Project);
    setSimulation(sim: Simulation): void;
    clearSimulation(): void;
    private requestFocus;
    private beforeStepForward;
}
export declare class MemoryOutlet {
    readonly memory?: Memory;
    readonly temporaryObjectsOutlet?: TemporaryObjectsOutlet;
    readonly stackFramesOutlet?: StackFramesOutlet;
    readonly heapOutlet?: HeapOutlet;
    private readonly element;
    readonly svgElem: JQuery;
    readonly svg: SVG.Svg;
    readonly SVG_DEFS: {
        [index: string]: SVG.Marker;
    };
    _act: MessageResponses;
    /**
     * Maps from object ID to the outlet that represents that object.
     */
    private objectOutlets;
    /**
     * Used to track SVG elements for pointer arrows. Maps from the object ID
     * for the pointer to the SVG element
     */
    private pointerSVGElems;
    private svgOverlays;
    private svgUpdateThread;
    constructor(element: JQuery);
    dispose(): void;
    setMemory(memory: Memory): void;
    clearMemory(): void;
    registerObjectOutlet(outlet: MemoryObjectOutlet): void;
    disposeObjectOutlet(outlet: MemoryObjectOutlet): void;
    getObjectOutletById(objectId: number): MemoryObjectOutlet<CompleteObjectType> | undefined;
    private addSVGOverlay;
    private updateSvg;
    private onObjectAllocated;
    private onReset;
}
export declare abstract class MemoryObjectOutlet<T extends CompleteObjectType = CompleteObjectType> {
    readonly object: CPPObject<T>;
    protected readonly memoryOutlet: MemoryOutlet;
    protected readonly element: JQuery;
    abstract readonly objElem: JQuery;
    private svgElem?;
    private svg?;
    _act: MessageResponses;
    readonly names: readonly string[];
    constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet, name?: string);
    disconnect(): void;
    protected abstract updateObject(): void;
    protected valueRead(): void;
    protected valueWritten(): void;
    protected onReferenceBoundToMe(refEntity: BoundReferenceEntity): void;
    protected onReferenceUnbound(refEntity: BoundReferenceEntity): void;
    protected abstract onNamesUpdate(): void;
    protected deallocated(): void;
    protected leaked(): void;
    protected unleaked(): void;
    protected validitySet(isValid: boolean): void;
    protected callReceived(): void;
    protected callEnded(): void;
    protected findOutlet(callback: (t: this) => void): void;
    protected useSVG(): void;
}
export declare class SingleMemoryObject<T extends AtomicType> extends MemoryObjectOutlet<T> {
    protected readonly addrElem: JQuery;
    readonly objElem: JQuery;
    protected readonly namesElem: JQuery;
    constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet);
    protected onNamesUpdate(): void;
    protected updateObject(): void;
}
export declare class PointerMemoryObjectOutlet<T extends PointerType<CompleteObjectType> = PointerType<CompleteObjectType>> extends SingleMemoryObject<T> {
    readonly pointedObject?: CPPObject<T["ptrTo"]>;
    private readonly ptdArrayElem;
    private arrow?;
    private pointedObjectListener;
    constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet);
    protected updateObject(): void;
}
export declare class ReferenceMemoryOutlet<T extends CompleteObjectType = CompleteObjectType> {
    readonly entity: (UnboundReferenceEntity | BoundReferenceEntity) & NamedEntity;
    readonly object?: CPPObject<T>;
    private readonly element;
    private readonly addrElem;
    private readonly objElem;
    constructor(element: JQuery, entity: UnboundReferenceEntity & NamedEntity);
    bind(object: CPPObject<T>): void;
}
export declare class ArrayMemoryObjectOutlet<T extends ArrayElemType = ArrayElemType> extends MemoryObjectOutlet<BoundedArrayType<T>> {
    readonly objElem: JQuery;
    readonly elemOutlets: MemoryObjectOutlet[];
    readonly onePast: JQuery;
    constructor(element: JQuery, object: CPPObject<BoundedArrayType<T>>, memoryOutlet: MemoryOutlet);
    protected updateObject(): void;
    protected onNamesUpdate(): void;
}
export declare class ArrayElemMemoryObjectOutlet<T extends AtomicType> extends MemoryObjectOutlet<T> {
    readonly objElem: JQuery;
    constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet);
    protected updateObject(): void;
    protected onNamesUpdate(): void;
}
export declare class ClassMemoryObjectOutlet<T extends CompleteClassType> extends MemoryObjectOutlet<T> {
    readonly objElem: JQuery;
    private readonly addrElem?;
    constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet);
    protected updateObject(): void;
    protected onNamesUpdate(): void;
}
export declare class StringMemoryObject<T extends CompleteClassType> extends MemoryObjectOutlet<T> {
    protected readonly addrElem: JQuery;
    readonly objElem: JQuery;
    constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet);
    protected updateObject(): void;
    protected onNamesUpdate(): void;
}
export declare class InlinePointedArrayOutlet extends MemoryObjectOutlet<PointerType> {
    readonly objElem: JQuery;
    private arrayOutlet?;
    constructor(element: JQuery, object: CPPObject<PointerType>, memoryOutlet: MemoryOutlet);
    private setArrayOutlet;
    protected updateObject(): void;
    protected onNamesUpdate(): void;
}
export declare class VectorMemoryObject<T extends CompleteClassType> extends MemoryObjectOutlet<T> {
    readonly objElem: JQuery;
    constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet);
    protected updateObject(): void;
    protected onNamesUpdate(): void;
}
export declare function createMemoryObjectOutlet(elem: JQuery, obj: CPPObject, memoryOutlet: MemoryOutlet): ArrayMemoryObjectOutlet<ArrayElemType> | StringMemoryObject<CompleteClassType> | VectorMemoryObject<CompleteClassType> | ClassMemoryObjectOutlet<CompleteClassType> | SingleMemoryObject<AtomicType>;
export declare class StackFrameOutlet {
    private readonly memoryOutlet;
    private readonly element;
    readonly func: RuntimeFunction;
    readonly frame: MemoryFrame;
    private readonly referenceOutletsByEntityId;
    _act: MessageResponses;
    private readonly customizations;
    constructor(element: JQuery, frame: MemoryFrame, memoryOutlet: MemoryOutlet);
    private referenceBound;
}
export declare class StackFramesOutlet {
    private readonly element;
    private readonly memoryOutlet;
    private readonly framesElem;
    private readonly frameElems;
    readonly memory: Memory;
    _act: MessageResponses;
    constructor(element: JQuery, memory: Memory, memoryOutlet: MemoryOutlet);
    private pushFrame;
    private framePushed;
    private popFrame;
    private framePopped;
    private reset;
}
export declare class HeapOutlet {
    private readonly element;
    private readonly memoryOutlet;
    private readonly objectsElem;
    private objectElems;
    readonly memory: Memory;
    _act: MessageResponses;
    constructor(element: JQuery, memory: Memory, memoryOutlet: MemoryOutlet);
    private heapObjectAllocated;
    private heapObjectDeleted;
    private reset;
}
export declare class TemporaryObjectsOutlet {
    private readonly element;
    private readonly memoryOutlet;
    private readonly objectsElem;
    private objectElems;
    readonly memory: Memory;
    private readonly customizations;
    _act: MessageResponses;
    constructor(element: JQuery, memory: Memory, memoryOutlet: MemoryOutlet);
    private temporaryObjectAllocated;
    private temporaryObjectDeallocated;
    private reset;
}
export declare abstract class RunningCodeOutlet {
    protected element: JQuery;
    protected overlayElem: JQuery;
    protected stackFramesElem: JQuery;
    readonly sim?: Simulation;
    _act: MessageResponses;
    constructor(element: JQuery);
    setSimulation(sim: Simulation): void;
    clearSimulation(): void;
    abstract pushFunction(rtFunc: RuntimeFunction): void;
    abstract popFunction(): void;
    valueTransferOverlay(from: JQuery, to: JQuery, html: string, afterCallback?: () => void, duration?: number): void;
    abstract refreshSimulation(): void;
    private reset;
    private pushed;
    private popped;
}
export declare class CodeStackOutlet extends RunningCodeOutlet {
    private frameElems;
    private functionOutlets;
    _act: MessageResponses;
    /**
     * Maps from runtime ID of a RuntimeFunction to the outlet
     * that represents the call to that function.
     */
    private callOutlets;
    constructor(element: JQuery);
    pushFunction(rtFunc: RuntimeFunction): FunctionOutlet;
    popFunction(): void;
    refreshSimulation(): void;
    protected childOutletAdded(data: {
        parent: ConstructOutlet;
        child: ConstructOutlet;
    }): void;
    protected valueTransferStart(data: {
        num: number;
        start: JQuery;
        html: string;
    }): void;
    protected functionCalled(data: {
        outlet: FunctionCallOutlet;
        func: RuntimeFunction;
    }): void;
    protected returnPassed(data: {
        func: RuntimeFunction;
        start: JQuery;
        html: string;
        result: any;
    }): void;
}
export declare class IstreamBufferOutlet {
    readonly name: string;
    readonly istream?: SimulationInputStream;
    private readonly element;
    private readonly bufferContentsElem;
    _act: MessageResponses;
    constructor(element: JQuery, name: string);
    setIstream(istream: SimulationInputStream): void;
    clearIstream(): void;
    protected onBufferUpdate(contents: string): void;
}
