import { MemberVariableEntity } from "../../core/compilation/entities";
import { CompiledCtorInitializer, RuntimeCtorInitializer } from "../../core/constructs/initializers/CtorInitializer";
import { htmlDecoratedName } from "../../util/util";
import { ConstructOutlet } from "./ConstructOutlet";
import { ClassDirectInitializerOutlet, ClassDefaultInitializerOutlet, InitializerOutlet } from "./InitializerOutlet";


export class CtorInitializerOutlet extends ConstructOutlet<RuntimeCtorInitializer> {

    public readonly delegatedConstructorInitializer?: ClassDirectInitializerOutlet;
    public readonly baseInitializer?: ClassDefaultInitializerOutlet | ClassDirectInitializerOutlet;
    public readonly memberInitializers: readonly InitializerOutlet[];

    public constructor(element: JQuery, construct: CompiledCtorInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.element.addClass("code-ctor-initializer");

        this.element.append(" : ");

        if (construct.delegatedConstructorInitializer) {
            this.element.append(construct.delegatedConstructorInitializer.target.type.className);
            this.element.append("(");
            this.delegatedConstructorInitializer = construct.delegatedConstructorInitializer?.createDefaultOutlet(
                $("<span></span>").appendTo(this.element),
                this
            );
            this.element.append(")");
        }

        let first = !this.delegatedConstructorInitializer;

        if (construct.baseInitializer?.kind === "default") {
            if (!first) {
                this.element.append(", ");
            }
            else {
                first = false;
            }
            this.element.append(htmlDecoratedName(construct.baseInitializer.target.type.className));
            this.element.append("(");
            this.baseInitializer = construct.baseInitializer.createDefaultOutlet(
                $("<span></span>").appendTo(this.element),
                this
            );
            this.element.append(")");
        }
        else if (construct.baseInitializer?.kind === "direct") {
            if (!first) {
                this.element.append(", ");
            }
            else {
                first = false;
            }
            this.element.append(htmlDecoratedName(construct.baseInitializer.target.type.className));
            this.element.append("(");
            this.baseInitializer = construct.baseInitializer.createDefaultOutlet(
                $("<span></span>").appendTo(this.element),
                this
            );
            this.element.append(")");

        }

        this.memberInitializers = construct.memberInitializers.map(memInit => {
            if (!first) {
                this.element.append(", ");
            }
            else {
                first = false;
            }
            this.element.append(htmlDecoratedName((<MemberVariableEntity>(memInit.target)).name));
            this.element.append("(");
            let memInitOutlet = memInit.createDefaultOutlet($("<span></span>").appendTo(this.element), this);
            this.element.append(")");
            return memInitOutlet;

        });

        this.element.append(" ");
    }
}
