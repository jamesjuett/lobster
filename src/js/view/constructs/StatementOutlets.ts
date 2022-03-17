import { CompiledSimpleDeclaration } from "../../core/constructs/declarations/SimpleDeclaration";
import { CompiledLocalVariableDefinition } from "../../core/constructs/declarations/variable/LocalVariableDefinition";
import { RuntimeBreakStatement, CompiledBreakStatement } from "../../core/constructs/statements/BreakStatement";
import { RuntimeDeclarationStatement, CompiledDeclarationStatement } from "../../core/constructs/statements/DeclarationStatement";
import { RuntimeExpressionStatement, CompiledExpressionStatement } from "../../core/constructs/statements/ExpressionStatement";
import { RuntimeForStatement, CompiledForStatement } from "../../core/constructs/statements/ForStatement";
import { RuntimeIfStatement, CompiledIfStatement } from "../../core/constructs/statements/IfStatement";
import { RuntimeNullStatement, CompiledNullStatement } from "../../core/constructs/statements/NullStatement";
import { RuntimeReturnStatement, CompiledReturnStatement } from "../../core/constructs/statements/ReturnStatement";
import { CompiledStatement, RuntimeStatement } from "../../core/constructs/statements/Statement";
import { RuntimeWhileStatement, CompiledWhileStatement } from "../../core/constructs/statements/WhileStatement";
import { messageResponse, Message } from "../../util/observe";
import { htmlDecoratedType, htmlDecoratedName, assertNever, asMutable, htmlDecoratedKeyword } from "../../util/util";
import { ConstructOutlet } from "./ConstructOutlet";
import { addChildExpressionOutlet, ExpressionOutlet } from "./ExpressionOutlets";
import { createInitializerOutlet, InitializerOutlet } from "./InitializerOutlet";
import { ReturnInitializerOutlet } from "./ReturnInitializerOutlet";



export function createStatementOutlet(element: JQuery, construct: CompiledStatement, parent?: ConstructOutlet) {
    return construct.createDefaultOutlet(element, parent);
}

export class StatementOutlet<RTConstruct_type extends RuntimeStatement = RuntimeStatement> extends ConstructOutlet<RTConstruct_type> {

    public constructor(element: JQuery, construct: RTConstruct_type["model"], parent?: ConstructOutlet) {
        super(element, construct, parent);
        this.element.addClass("statement");
    }

}


export function addChildStatementOutlet(parentElement: JQuery, construct: CompiledStatement, parent: ConstructOutlet, indented: boolean = true) {
    let childElem = $("<span></span>");
    if (!construct.isBlock() && construct.parent?.construct_type === "block") {
        parentElement.append("<br />");
        childElem.addClass("code-indentedBlockBody")
    }
    return createStatementOutlet(childElem.appendTo(parentElement), construct, parent);
}


export class NullStatementOutlet extends StatementOutlet<RuntimeNullStatement> {

    public constructor(element: JQuery, construct: CompiledNullStatement, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.element.append(";");
    }

}

export class ExpressionStatementOutlet extends StatementOutlet<RuntimeExpressionStatement> {

    public readonly expression: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledExpressionStatement, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.expression = addChildExpressionOutlet(this.element, this.construct.expression, this);
        this.element.append(";");
    }

    protected instanceSet(inst: RuntimeExpressionStatement) {
        super.instanceSet(inst);
        if (!inst.isActive) {
            this.expression.hideEvalValueRecursive();
        }
    }

    @messageResponse("popped")
    protected popped() {
        super.popped();
        this.expression.hideEvalValueRecursive();
    }
}



export class DeclarationStatementOutlet extends StatementOutlet<RuntimeDeclarationStatement> {

    public readonly initializerOutlets: readonly (InitializerOutlet | undefined)[] = [];

    private declaratorElems: JQuery[] = [];
    private currentDeclarationIndex: number | null = null;

    public constructor(element: JQuery, construct: CompiledDeclarationStatement, parent?: ConstructOutlet) {
        super(element, construct, parent);

        let declarationElem = $("<span></span>");

        declarationElem.addClass("codeInstance");
        declarationElem.addClass("declaration");

        const declarations = this.construct.declarations;

        // Non-null assertion below because type specifier's baseType must be defined if
        // the declarator of this variable definition got created.
        declarationElem.append(htmlDecoratedType(declarations[0].typeSpecifier.baseType!.toString()));

        declarationElem.append(" ");

        declarations.forEach((declaration, i) => {

            // Create element for declarator
            let declElem = $('<span class="codeInstance code-declarator"><span class="lobster-highlight"></span></span>');
            this.declaratorElems.push(declElem);
            declElem.append(declaration.type.declaratorString(htmlDecoratedName(declaration.name, declaration.type)));
            declarationElem.append(declElem);

            // Create element for initializer, if there is one
            if (declaration.initializer) {
                switch (declaration.initializer.kind) {
                    case "direct": declarationElem.append("("); break;
                    case "copy": declarationElem.append(" = "); break;
                    case "list": declarationElem.append(" = { "); break;
                    case "value": declarationElem.append("{"); break;
                    case "default": break;
                    default: assertNever(declaration.initializer.kind); break;
                }
                asMutable(this.initializerOutlets).push(
                    createInitializerOutlet($("<span></span>").appendTo(declarationElem), declaration.initializer, this)
                );
                switch (declaration.initializer.kind) {
                    case "direct": declarationElem.append(")"); break;
                    case "copy": break;
                    case "list": declarationElem.append(" }"); break;
                    case "value": declarationElem.append("}"); break;
                    case "default": break;
                    default: assertNever(declaration.initializer.kind); break;
                }
            }
            else {
                asMutable(this.initializerOutlets).push(undefined);
            }

            // Add commas where needed
            if (i < declarations.length - 1) {
                declarationElem.append(", ");
            }
        });

        this.element.append(declarationElem);
        this.element.append(";");
    }

    protected instanceSet(inst: RuntimeDeclarationStatement) {
        super.instanceSet(inst);
        this.setCurrentDeclarationIndex(inst.isActive ? inst.currentDeclarationIndex : null);
    }

    protected instanceRemoved(oldInst: RuntimeDeclarationStatement) {
        this.setCurrentDeclarationIndex(null);
        super.instanceRemoved(oldInst);
    }

    private setCurrentDeclarationIndex(current: number | null) {

        // Remove from previous current
        if (this.currentDeclarationIndex !== null) {
            this.declaratorElems[this.currentDeclarationIndex].removeClass("active");
        }

        // Set new or set to null
        this.currentDeclarationIndex = current;
        if (current !== null) {
            this.declaratorElems[current].addClass("active");
        }
    }

    @messageResponse("initializing")
    private initializing(msg: Message<number>) {
        this.setCurrentDeclarationIndex(msg.data);
    }

    @messageResponse("popped")
    protected popped() {
        super.popped();
        this.setCurrentDeclarationIndex(null);
    }
}

function allLocalVariableDefinitions(declarations: readonly CompiledSimpleDeclaration[]): declarations is CompiledLocalVariableDefinition[] {
    return declarations.every(decl => decl.construct_type === "local_variable_definition");
}





export class IfStatementOutlet extends StatementOutlet<RuntimeIfStatement> {

    public readonly condition: ExpressionOutlet;
    public readonly then: StatementOutlet;
    public readonly otherwise?: StatementOutlet;

    public constructor(element: JQuery, construct: CompiledIfStatement, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.element.addClass("selection");

        this.element.append(htmlDecoratedKeyword("if"));
        this.element.append('(');

        this.condition = addChildExpressionOutlet(this.element, construct.condition, this);

        this.element.append(")");

        this.then = addChildStatementOutlet(this.element, this.construct.then, this);

        if (this.construct.otherwise) {
            this.element.append("<br />");
            this.element.append(htmlDecoratedKeyword("else"));
            this.otherwise = addChildStatementOutlet(this.element, this.construct.otherwise, this);
        }
    }
}



export class WhileStatementOutlet extends StatementOutlet<RuntimeWhileStatement> {

    public readonly condition: ExpressionOutlet;
    public readonly body: StatementOutlet;

    public constructor(element: JQuery, construct: CompiledWhileStatement, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.element.addClass("code-while");

        this.element.append(htmlDecoratedKeyword("while"));
        this.element.append("(");

        this.condition = addChildExpressionOutlet(this.element, construct.condition, this);

        this.element.append(") ");

        this.body = addChildStatementOutlet(this.element, construct.body, this);
    }
}



export class ForStatementOutlet extends StatementOutlet<RuntimeForStatement> {

    public readonly initial: StatementOutlet;
    public readonly condition: ExpressionOutlet;
    public readonly post?: ExpressionOutlet;
    public readonly body: StatementOutlet;

    public constructor(element: JQuery, construct: CompiledForStatement, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.element.addClass("code-for");

        this.element.append(htmlDecoratedKeyword("for"));
        this.element.append("(");

        this.initial = addChildStatementOutlet(this.element, construct.initial, this);

        this.element.append(" ");

        this.condition = addChildExpressionOutlet(this.element, construct.condition, this);

        this.element.append("; ");

        this.post = construct.post && addChildExpressionOutlet(this.element, construct.post, this);

        this.element.append(") ");

        this.body = addChildStatementOutlet(this.element, construct.body, this);

    }
}

export class BreakStatementOutlet extends StatementOutlet<RuntimeBreakStatement> {

    public constructor(element: JQuery, construct: CompiledBreakStatement, parent?: ConstructOutlet) {
        super(element, construct, parent);
        element.append('<span class="code-keyword">break</span>');
        element.append(";");
    }

}



export class ReturnStatementOutlet extends StatementOutlet<RuntimeReturnStatement> {

    public readonly returnInitializer?: ReturnInitializerOutlet;

    public constructor(element: JQuery, construct: CompiledReturnStatement, parent?: ConstructOutlet) {
        super(element, construct, parent);
        element.addClass("return");
        element.append('<span class="code-keyword">return</span>');

        if (construct.returnInitializer) {
            element.append(" ");
            this.returnInitializer = new ReturnInitializerOutlet(
                $("<span></span>").appendTo(element), construct.returnInitializer, this);
        }

        element.append(";");
    }

}