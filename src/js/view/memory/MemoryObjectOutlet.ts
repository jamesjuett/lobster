import { listenTo, MessageResponses, messageResponse, stopListeningTo } from "../../util/observe";
import * as SVG from "@svgdotjs/svg.js";
import { CPPObject, ArraySubobject, BaseSubobject, DynamicObject } from "../../core/runtime/objects";
import { AtomicType, CompleteObjectType, Char, PointerType, BoundedArrayType, ArrayElemType, CompleteClassType, isCompleteClassType, isPointerType, isBoundedArrayType, toHexadecimalString, PointerToCompleteType, isArrayPointerToType } from "../../core/compilation/types";
import { Mutable, assert, asMutable } from "../../util/util";
import { BoundReferenceEntity, UnboundReferenceEntity, NamedEntity, MemberReferenceEntity } from "../../core/compilation/entities";
import { getValueString, cstringToString } from "../constructs/common";
import { MemoryOutlet, SVGPointerArrowMemoryOverlay } from "./MemoryOutlet";








export abstract class MemoryObjectOutlet<T extends CompleteObjectType = CompleteObjectType> {

    public readonly object: CPPObject<T>;

    protected readonly memoryOutlet: MemoryOutlet;

    protected readonly element: JQuery;
    public abstract readonly objElem: JQuery;
    private svgElem?: JQuery;
    private svg?: SVG.Dom;

    public _act!: MessageResponses;

    public readonly names: readonly string[];

    public constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet, name?: string) {
        this.element = element.addClass("code-memoryObject");
        this.object = object;
        this.memoryOutlet = memoryOutlet;
        memoryOutlet.registerObjectOutlet(this);

        this.names = name ? [name] : [];

        listenTo(this, object);
    }

    public disconnect() {
        stopListeningTo(this, this.object);
    }

    protected abstract updateObject(): void;

    @messageResponse("valueRead")
    @messageResponse("byteRead")
    @messageResponse("bytesRead")
    protected valueRead() {
        this.objElem.addClass("get");
    }

    @messageResponse("valueWritten")
    @messageResponse("byteWritten")
    @messageResponse("bytesWritten")
    protected valueWritten() {
        this.updateObject();
        this.objElem.addClass("set");
    }

    @messageResponse("referenceBoundToMe", "unwrap")
    protected onReferenceBoundToMe(refEntity: BoundReferenceEntity) {
        if (refEntity.name) {
            asMutable(this.names).push(refEntity.name);
            this.onNamesUpdate();
        }
    }

    @messageResponse("referenceUnbound", "unwrap")
    protected onReferenceUnbound(refEntity: BoundReferenceEntity) {
        if (refEntity.name) {
            let i = this.names.indexOf(refEntity.name);
            if (i !== -1) {
                asMutable(this.names).splice(i, 1);
            }
            this.onNamesUpdate();
        }
    }

    protected abstract onNamesUpdate(): void;

    @messageResponse("deallocated")
    protected deallocated() {
        this.element.addClass("deallocated");
    }

    @messageResponse("leaked")
    protected leaked() {
        this.element.addClass("leaked");
    }

    @messageResponse("unleaked")
    protected unleaked() {
        //this.element.removeClass("leaked"); // TODO: why is this commented?
    }

    @messageResponse("validitySet", "unwrap")
    protected validitySet(isValid: boolean) {
        if (isValid) {
            this.objElem.removeClass("invalid");
        }
        else {
            this.objElem.addClass("invalid");
        }
    }

    @messageResponse("callReceived")
    protected callReceived() {
        this.element.addClass("receiver");
    }

    @messageResponse("callEnded")
    protected callEnded() {
        this.element.removeClass("receiver");
    }

    @messageResponse("findOutlet")
    protected findOutlet(callback: (t: this) => void) {
        callback(this);
    }

    protected useSVG() {
        this.svgElem = $('<div style="position: absolute; width: 100%; height: 100%; left: 0px; top: 0px; pointer-events: none"></div>');
        this.svg = SVG.SVG(this.svgElem[0]);
        this.element.append(this.svgElem);
    }

}

export class SingleMemoryObject<T extends AtomicType> extends MemoryObjectOutlet<T> {

    protected readonly addrElem: JQuery;
    public readonly objElem: JQuery;
    protected readonly namesElem: JQuery;

    public constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet) {
        super(element, object, memoryOutlet, object.name);

        this.element.addClass("code-memoryObjectSingle");

        this.addrElem = $(`<div class='address'>${toHexadecimalString(this.object.address)}</div>`);
        this.element.append(this.addrElem);

        this.objElem = $("<div class='code-memoryObject-object'>" + this.object.getValue().valueString() + "</div>");
        this.element.append(this.objElem);

        this.element.append("<span> </span>");
        this.element.append(this.namesElem = $("<div class='entity'>" + (this.object.name || "") + "</div>"));

        this.updateObject();

    }

    protected onNamesUpdate() {
        this.namesElem.html(this.names.join(", "));
    }

    protected updateObject() {
        var elem = this.objElem;
        var str = this.object.getValue().valueString();
        if (this.object.type.isType(Char)) {
            str = str.substr(1, str.length - 2);
        }
        elem.html(str);
        if (this.object.isValueValid()) {
            elem.removeClass("invalid");
        }
        else {
            elem.addClass("invalid");
        }
    }
}
// TODO: should this really extends SingleMemoryObject? it completely overrides updateObject,
//       so the might not really be much useful that's inherited. Or maybe better, SingleMemoryObject
//       should make updateObject abstract and the default behavior there should move to a new subclass
//       like RegularMemoryObject or something like that.


export class PointerMemoryObjectOutlet<T extends PointerType<CompleteObjectType> = PointerType<CompleteObjectType>> extends SingleMemoryObject<T> {

    public readonly pointedObject?: CPPObject<T["ptrTo"]>;

    private readonly ptdArrayElem: JQuery;
    private arrow?: SVG.Polyline;

    private pointedObjectListener = {
        _act: {
            "deallocated": () => this.updateObject()
        }
    };

    public constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet) {
        super(element, object, memoryOutlet);

        this.useSVG();

        this.objElem.css("white-space", "pre");
        this.ptdArrayElem = $('<div class="ptd-array"></div>');
        this.element.append(this.ptdArrayElem);

    }

    // private updateArrow() {
    //     if (!this.pointedObject || !this.pointedObject.isAlive) {
    //         this.clearArrow();
    //     }
    //     else if (this.object.type.isArrayPointerType()) {
    //         // this.makeArrayPointerArrow();
    //     }
    //     else if (this.object.type.isObjectPointerType()) {
    //         // this.makeObjectPointerArrow();
    //     }
    // }
    // private clearArrow() {
    //     if (this.arrow) { this.arrow.remove(); }
    //     delete this.arrow;
    // }
    protected updateObject() {
        var elem = this.objElem;

        let newPointedObject: CPPObject | undefined;
        if (this.object.type.isArrayPointerType()) {
            newPointedObject = this.object.type.arrayObject;
        }
        else if (this.object.type.isObjectPointerType()) {
            newPointedObject = this.object.type.getPointedObject();
        }

        if (this.pointedObject !== newPointedObject) {
            if (this.pointedObject) {
                stopListeningTo(this.pointedObjectListener, this.pointedObject, "deallocated");
            }

            (<Mutable<this>>this).pointedObject = newPointedObject;

            if (newPointedObject) {
                listenTo(this.pointedObjectListener, newPointedObject, "deallocated");
            }
        }

        elem.html(this.object.getValue().valueString());

        if (this.object.isValueValid()) {
            elem.removeClass("invalid");
        }
        else {
            elem.addClass("invalid");
        }
    }

    @messageResponse("lifetimeBegan", "unwrap")
    private onAtomicObjectInitialized(object: CPPObject<PointerToCompleteType>) {
        this.memoryOutlet.addSVGOverlay(new SVGPointerArrowMemoryOverlay(object, this.memoryOutlet));
    }

}
// setInterval(function() {
//     var temp = Outlets.CPP.CPP_ANIMATIONS;
//     Outlets.CPP.CPP_ANIMATIONS = false;
//     Outlets.CPP.PointerMemoryObject.updateArrows();
//     Outlets.CPP.CPP_ANIMATIONS = temp;
// }, 20);

export class ReferenceMemoryOutlet<T extends CompleteObjectType = CompleteObjectType> {

    public readonly entity: (UnboundReferenceEntity | BoundReferenceEntity) & NamedEntity;
    public readonly object?: CPPObject<T>;

    private readonly element: JQuery;
    private readonly addrElem: JQuery;
    private readonly objElem: JQuery;

    public constructor(element: JQuery, entity: UnboundReferenceEntity & NamedEntity) {
        this.element = element.addClass("code-memoryObject");
        this.entity = entity;

        this.element.addClass("code-memoryObjectSingle");

        this.addrElem = $("<div>&nbsp;</div>").appendTo(element);
        $(`<div class='entity'>${entity.name || ""}</div>`).appendTo(element);
        this.objElem = $(`<div class="code-memoryObject-object"></div>`).appendTo(element);

        return this;
    }

    public bind(object: CPPObject<T>) {
        (<Mutable<this>>this).object = object;

        if (object.name) {
            this.objElem.html(object.name);
        }
        else {
            this.objElem.html("@" + object.address);
        }
    }
}

export class ArrayMemoryObjectOutlet<T extends ArrayElemType = ArrayElemType> extends MemoryObjectOutlet<BoundedArrayType<T>> {

    public readonly addrElem: JQuery;
    public readonly objElem: JQuery;

    public readonly elemOutlets: MemoryObjectOutlet[];
    public readonly onePast: JQuery;

    public constructor(element: JQuery, object: CPPObject<BoundedArrayType<T>>, memoryOutlet: MemoryOutlet) {
        super(element, object, memoryOutlet);

        this.element.addClass("code-memoryObject-array");

        let leftContainer = $('<div class="code-memoryObject-array-left"></div>').appendTo(this.element);

        this.addrElem = $(`<div class='address'>${toHexadecimalString(this.object.address)}</div>`);
        leftContainer.append(this.addrElem);

        if (this.object.name) {
            leftContainer.append($("<div class='entity'>" + (this.object.name || "") + "</div>"));
        }

        this.objElem = $("<div class='code-memoryObject-array-elements'></div>");

        this.elemOutlets = this.object.getArrayElemSubobjects().map((elemSubobject: ArraySubobject<T>, i: number) => {
            let elemElem = $('<div></div>');
            let elemContainer = $('<div style="display: inline-block; margin-bottom: 5px; text-align: center" class="arrayElem"></div>');
            elemContainer.append(elemElem);
            elemContainer.append('<div style="line-height: 1ch; font-size: 6pt">' + i + '</div>');
            this.objElem.append(elemContainer);
            if (elemSubobject.type.isPotentiallyCompleteClassType()) {
                return createMemoryObjectOutlet(elemElem, elemSubobject, this.memoryOutlet);
            }
            else {
                return new ArrayElemMemoryObjectOutlet(elemElem, <ArraySubobject<AtomicType>>elemSubobject, this.memoryOutlet);
            }
        });

        this.onePast = $(`
        <div style="display: inline-block; margin-bottom: 5px; text-align: center" class="arrayElem">
            <div class="code-memoryObject array"><span class="code-memoryObject-object" style="border-style: dashed;border-color: #7c3a3a;">&nbsp;</span></div>
            <div style="line-height: 1ch;font-size: 6pt;color: #c50000;">${this.object.type.numElems}</div>
        </div>`).appendTo(this.objElem);

        this.updateObject();
        this.element.append(this.objElem);
    }

    protected updateObject() {
        // I think nothing to do here, since the array subobjects should update themselves?
        //        var elemType = this.object.type.elemType;
        //        var value = this.object.getValue();
        //        for(var i = 0; i < this.length; ++i) {
        //            this.elemOutlets[i].updateObject();
        //        }
    }

    protected onNamesUpdate() {
        // TODO
    }

}

export class ArrayElemMemoryObjectOutlet<T extends AtomicType> extends MemoryObjectOutlet<T> {

    public readonly objElem: JQuery;

    public constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet) {
        super(element, object, memoryOutlet);

        this.element.addClass("array");
        this.objElem = $('<span class="code-memoryObject-object"></span>');
        this.element.append(this.objElem);

        this.updateObject();
    }

    protected updateObject() {
        let str = this.object.getValue().valueString();
        if (this.object.type.isType(Char)) {
            str = str.substr(1, str.length - 2);
        }
        this.objElem.html(str);
        if (this.object.isValueValid()) {
            this.objElem.removeClass("invalid");
        }
        else {
            this.objElem.addClass("invalid");
        }
    }

    protected onNamesUpdate() {
        // TODO
    }
}

export class ClassMemoryObjectOutlet<T extends CompleteClassType> extends MemoryObjectOutlet<T> {

    public readonly objElem: JQuery;
    private readonly addrElem?: JQuery;

    public constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet) {
        super(element, object, memoryOutlet);

        this.element.addClass("code-memoryObjectClass");

        this.objElem = $("<div class='classObject'></div>");

        var className = this.object.type.className + (this.object instanceof BaseSubobject ? " (base)" : "");
        let classHeaderElem = $('<div class="classHeader"></div>');
        this.objElem.append(classHeaderElem);

        // Only show name and address for object if not a base class subobject
        if (!(this.object instanceof BaseSubobject)) {
            if (this.object instanceof DynamicObject) {
                this.addrElem = $("<td class='address'>" + toHexadecimalString(this.object.address) + "</td>");
                classHeaderElem.append(this.addrElem);
            }

            if (this.object.name) {
                let entityElem = $("<div class='entity'>" + (this.object.name || "") + "</div>");
                classHeaderElem.append(entityElem);
            }
        }

        classHeaderElem.append($('<span class="className">' + className + '</span>'));


        let membersElem = $('<div class="members"></div>');

        let baseObj = this.object.getBaseSubobject();
        if (baseObj) {
            createMemoryObjectOutlet($("<div></div>").appendTo(membersElem), baseObj, this.memoryOutlet);
        }

        // let baseType: CompleteClassType | undefined = this.object.type;
        // while (baseType = baseType.classDefinition.baseClass) {
        //     baseType.classDefinition.memberVariableEntities.forEach(memEntity => {
        //         let memName = memEntity.name;
        //         if (memEntity instanceof MemberReferenceEntity) {
        //             new ReferenceMemoryOutlet($("<div></div>").appendTo(membersElem), memEntity);
        //         }
        //         else {
        //             createMemoryObjectOutlet($("<div></div>").appendTo(membersElem), this.object.getMemberObject(memName)!, this.memoryOutlet);
        //         }
        //     });
        // }
        this.object.type.classDefinition.memberVariableEntities.forEach(memEntity => {
            let memName = memEntity.name;
            if (memEntity instanceof MemberReferenceEntity) {
                new ReferenceMemoryOutlet($("<div></div>").appendTo(membersElem), memEntity);
            }
            else {
                createMemoryObjectOutlet($("<div></div>").appendTo(membersElem), this.object.getMemberObject(memName)!, this.memoryOutlet);
            }
        });

        this.objElem.append(membersElem);

        this.element.append(this.objElem);

        return this;
    }

    protected updateObject() {
        // nothing to do. member object outlets should handle stuff
    }

    protected onNamesUpdate() {
        // TODO
    }
}



export class StringMemoryObject<T extends CompleteClassType> extends MemoryObjectOutlet<T> {

    protected readonly addrElem: JQuery;
    public readonly objElem: JQuery;

    public constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet) {
        super(element, object, memoryOutlet);

        this.element.addClass("code-memoryObjectSingle");

        this.addrElem = $("<div class='address'>" + toHexadecimalString(this.object.address) + "</div>");
        this.element.append(this.addrElem);

        this.objElem = $("<div class='code-memoryObject-object'>" + getValueString((<CPPObject<PointerType<Char>>>this.object.getMemberObject("data_ptr")).getValue()) + "</div>");
        this.element.append(this.objElem);

        if (this.object.name) {
            this.element.append("<span> </span>");
            this.element.append($("<div class='entity'>" + (this.object.name || "") + "</div>"));
        }

        this.updateObject();

    }

    protected updateObject() {
        var elem = this.objElem;
        let dataPtrVal = (<CPPObject<PointerType<Char>>>this.object.getMemberObject("data_ptr")).getValue();
        var str = dataPtrVal.isTyped(isArrayPointerToType(Char)) ? cstringToString(dataPtrVal) : getValueString(dataPtrVal);
        if (this.object.type.isType(Char)) {
            str = str.substr(1, str.length - 2);
        }
        elem.html(str);
        if ((<CPPObject<PointerType<Char>>>this.object.getMemberObject("data_ptr")).isValueValid()) {
            elem.removeClass("invalid");
        }
        else {
            elem.addClass("invalid");
        }
    }

    protected onNamesUpdate() {
        // TODO
    }
}


export class InlinePointedArrayOutlet extends MemoryObjectOutlet<PointerType> {

    // protected readonly addrElem : JQuery;
    public readonly objElem: JQuery;

    private arrayOutlet?: ArrayMemoryObjectOutlet;
    // private dataPtr: 
    public constructor(element: JQuery, object: CPPObject<PointerType>, memoryOutlet: MemoryOutlet) {
        super(element, object, memoryOutlet);

        this.objElem = $("<span></span>").appendTo(this.element);

        // this.objElem = $("<div class='code-memoryObject-object'>" + getValueString((<CPPObject<PointerType<Char>>>this.object.getMemberObject("data_ptr")).getValue()) + "</div>");
        // this.element.append(this.objElem);
        // if (this.object.name) {
        //     this.element.append("<span> </span>");
        //     this.element.append($("<div class='entity'>" + (this.object.name || "") + "</div>"));
        // }
        this.updateObject();

    }

    private setArrayOutlet(arrayObject: CPPObject<BoundedArrayType> | undefined) {
        this.arrayOutlet?.disconnect();
        this.objElem.empty();
        delete this.arrayOutlet;
        if (arrayObject) {
            this.arrayOutlet = new ArrayMemoryObjectOutlet(this.objElem, arrayObject, this.memoryOutlet);
        }
    }

    protected updateObject() {

        let type = this.object.type;
        if (!type.isArrayPointerType()) {
            this.setArrayOutlet(undefined);
            return;
        }

        let pointedArr = type.arrayObject;

        if (pointedArr !== this.arrayOutlet?.object) {
            this.setArrayOutlet(pointedArr);
        }
    }

    protected onNamesUpdate() {
        // TODO
    }
}

export class VectorMemoryObject<T extends CompleteClassType> extends MemoryObjectOutlet<T> {

    public readonly objElem: JQuery;

    public constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet) {
        super(element, object, memoryOutlet);

        if (this.object.name) {
            this.element.append("<span> </span>");
            this.element.append($("<div class='entity'>" + (this.object.name || "") + "</div>"));
        }

        this.objElem = $("<div></div>").appendTo(this.element);

        new InlinePointedArrayOutlet(this.objElem, <CPPObject<PointerType>>this.object.getMemberObject("data_ptr")!, memoryOutlet);


    }

    protected updateObject() {
    }

    protected onNamesUpdate() {
        // TODO
    }
}
// export class VectorMemoryObject<T extends CompleteClassType> extends MemoryObjectOutlet<T> {
//     protected readonly addrElem : JQuery;
//     public readonly objElem : JQuery;
//     private arrayOutlet?: ArrayMemoryObjectOutlet<ArithmeticType>;
//     private dataPtr: 
//     public constructor(element: JQuery, object: CPPObject<T>, memoryOutlet: MemoryOutlet) {
//         super(element, object, memoryOutlet);
//         this.element.addClass("code-memoryObjectSingle");
//         this.addrElem = $("<div class='address'>"+toHexadecimalString(this.object.address)+"</div>");
//         this.element.append(this.addrElem);
//         this.objElem = $("<span></span>").appendTo(this.element);
//         // this.objElem = $("<div class='code-memoryObject-object'>" + getValueString((<CPPObject<PointerType<Char>>>this.object.getMemberObject("data_ptr")).getValue()) + "</div>");
//         // this.element.append(this.objElem);
//         // if (this.object.name) {
//         //     this.element.append("<span> </span>");
//         //     this.element.append($("<div class='entity'>" + (this.object.name || "") + "</div>"));
//         // }
//         this.updateObject();
//     }
//     protected updateObject() {
//         new ArrayMemoryObjectOutlet(this.objElem, (<CPPObject<ArrayPointerType>>object.getMemberObject("data_ptr")).type.arrayObject, memoryOutlet);
//         // var elem = this.objElem;
//         // var str = getValueString((<CPPObject<PointerType<Char>>>this.object.getMemberObject("data_ptr")).getValue());
//         // if (this.object.type.isType(Char)) {
//         //     str = str.substr(1,str.length-2);
//         // }
//         // elem.html(str);
//         // if ((<CPPObject<PointerType<Char>>>this.object.getMemberObject("data_ptr")).isValueValid()) {
//         //     elem.removeClass("invalid");
//         // }
//         // else{
//         //     elem.addClass("invalid");
//         // }
//     }
// }

export function createMemoryObjectOutlet(elem: JQuery, obj: CPPObject, memoryOutlet: MemoryOutlet) {
    if (obj.isTyped(isPointerType)) {
        assert(obj.type.ptrTo.isCompleteObjectType(), "pointers to incomplete types should not exist at runtime");
        return new PointerMemoryObjectOutlet(elem, <CPPObject<PointerType<CompleteObjectType>>>obj, memoryOutlet);
    }
    else if (obj.isTyped(isBoundedArrayType)) {
        return new ArrayMemoryObjectOutlet(elem, <CPPObject<BoundedArrayType>>obj, memoryOutlet);
    }
    else if (obj.isTyped(isCompleteClassType)) {
        if (obj.type.className === "string") {
            return new StringMemoryObject(elem, obj, memoryOutlet);
        }
        if (obj.type.className.indexOf("vector") !== -1) {
            return new VectorMemoryObject(elem, obj, memoryOutlet);
        }
        return new ClassMemoryObjectOutlet(elem, <CPPObject<CompleteClassType>>obj, memoryOutlet);
    }
    else {
        return new SingleMemoryObject(elem, <CPPObject<AtomicType>>obj, memoryOutlet);
    }
}
