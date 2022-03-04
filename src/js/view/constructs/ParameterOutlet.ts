import { CompiledParameterDeclaration } from "../../core/constructs/declarations/function/ParameterDeclaration";
import { htmlDecoratedName } from "../../util/util";


export class ParameterOutlet {

    private readonly element: JQuery;
    public readonly passedValueElem: JQuery;

    public constructor(element: JQuery, paramDef: CompiledParameterDeclaration) {
        this.element = element;

        this.element.addClass("codeInstance");
        this.element.addClass("declaration");
        this.element.addClass("parameter");

        this.element.append(this.passedValueElem = $("<div> </div>"));

        this.element.append(paramDef.type.typeString(false, htmlDecoratedName(paramDef.name || "", paramDef.type), true));

    }

    public setPassedContents(html: string) {
        this.passedValueElem.html(html);
    }
}
