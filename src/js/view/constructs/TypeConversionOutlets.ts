import { CompiledImplicitConversion, RuntimeImplicitConversion } from "../../core/constructs/expressions/ImplicitConversion";
import { ConstructOutlet } from "./ConstructOutlet";
import { addChildExpressionOutlet, ExpressionOutlet } from "./ExpressionOutlets";




export class TypeConversionOutlet extends ExpressionOutlet<RuntimeImplicitConversion> {

    public readonly from: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledImplicitConversion, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.element.addClass("code-implicitConversion");
        this.from = addChildExpressionOutlet(this.exprElem, this.construct.from, this);
    }
}

export class LValueToRValueOutlet extends ExpressionOutlet<RuntimeImplicitConversion> {

    public readonly from: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledImplicitConversion, parent?: ConstructOutlet) {
        super(element, construct, parent);
        this.element.addClass("code-lValueToRValue");
        this.from = addChildExpressionOutlet(this.exprElem, this.construct.from, this);
    }
}


export class ArrayToPointerOutlet extends ExpressionOutlet<RuntimeImplicitConversion> {

    public readonly from: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledImplicitConversion, parent?: ConstructOutlet) {
        super(element, construct, parent);
        this.element.addClass("code-arrayToPointer");
        this.from = addChildExpressionOutlet(this.exprElem, this.construct.from, this);
    }
}


export class StreamToBoolOutlet extends ExpressionOutlet<RuntimeImplicitConversion> {

    public readonly from: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledImplicitConversion, parent?: ConstructOutlet) {
        super(element, construct, parent);
        this.element.addClass("code-streamToBool");
        this.from = addChildExpressionOutlet(this.exprElem, this.construct.from, this);
    }
}

export class QualificationConversionOutlet extends ExpressionOutlet<RuntimeImplicitConversion> {

    public readonly from: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledImplicitConversion, parent?: ConstructOutlet) {
        super(element, construct, parent);
        this.element.addClass("code-qualificationConversion");
        this.from = addChildExpressionOutlet(this.exprElem, this.construct.from, this);
    }
}
