import { encode } from "he";
import { FunctionEntity } from "../../core/compilation/entities";
import { RuntimeExpression } from "../../core/constructs/expressions/RuntimeExpression";
import { CompiledInitializerListExpression, RuntimeInitializerListExpression } from "../../core/constructs/expressions/InitializerListExpression";
import { CompiledParenthesesExpression, RuntimeParentheses } from "../../core/constructs/expressions/ParenthesesExpression";
import { CompiledStringLiteralExpression, RuntimeStringLiteralExpression } from "../../core/constructs/expressions/StringLiteralExpression";
import { CompiledNumericLiteralExpression, RuntimeNumericLiteral } from "../../core/constructs/expressions/NumericLiteralExpression";
import { CompiledNullptrExpression, RuntimeNullptrExpression } from "../../core/constructs/expressions/NullptrExpression";
import { CompiledThisExpression, RuntimeThisExpression } from "../../core/constructs/expressions/ThisExpression";
import { CompiledFunctionIdentifierExpression, CompiledObjectIdentifierExpression, RuntimeFunctionIdentifierExpression, RuntimeObjectIdentifierExpression } from "../../core/constructs/expressions/IdentifierExpression";
import { CompiledPostfixIncrementExpression, RuntimePostfixIncrementExpression } from "../../core/constructs/expressions/PostfixIncrementExpression";
import { CompiledFunctionArrowExpression, CompiledObjectArrowExpression, RuntimeFunctionArrowExpression, RuntimeObjectArrowExpression } from "../../core/constructs/expressions/ArrowExpression";
import { CompiledFunctionDotExpression, CompiledObjectDotExpression, RuntimeFunctionDotExpression, RuntimeObjectDotExpression } from "../../core/constructs/expressions/DotExpression";
import { CompiledSubscriptExpression, RuntimeSubscriptExpression } from "../../core/constructs/expressions/SubscriptExpression";
import { CompiledUnaryOperatorExpression, RuntimeUnaryOperatorExpression } from "../../core/constructs/expressions/UnaryOperatorExpression";
import { CompiledInputOperatorExpression, RuntimeInputOperatorExpression } from "../../core/constructs/expressions/InputOperatorExpression";
import { CompiledOutputOperatorExpression, RuntimeOutputOperatorExpression } from "../../core/constructs/expressions/OutputOperatorExpression";
import { CompiledBinaryOperatorExpression, RuntimeBinaryOperator } from "../../core/constructs/expressions/BinaryOperatorExpression";
import { CompiledCompoundAssignmentExpression, RuntimeCompoundAssignment as RuntimeCompoundAssignmentExpression } from "../../core/constructs/expressions/CompoundAssignmentExpression";
import { CompiledAssignmentExpression, RuntimeAssignment as RuntimeAssignmentExpression } from "../../core/constructs/expressions/AssignmentExpression";
import { CompiledCommaExpression, CompiledTernaryExpression, RuntimeComma, RuntimeTernary } from "../../core/constructs/expressions/CommaExpression";
import { CompiledNewArrayExpression, CompiledNewExpression, RuntimeNewArrayExpression, RuntimeNewExpression } from "../../core/constructs/expressions/NewExpression";
import { CompiledDeleteArrayExpression, CompiledDeleteExpression, RuntimeDeleteArrayExpression, RuntimeDeleteExpression } from "../../core/constructs/expressions/DeleteExpression";
import { identifierToString } from "../../core/compilation/lexical";
import { CPPObject } from "../../core/runtime/objects";
import { CompiledOpaqueExpression, RuntimeOpaqueExpression } from "../../core/constructs/expressions/OpaqueExpression";
import { Value } from "../../core/runtime/Value";
import { CompleteObjectType, isAtomicType } from "../../core/compilation/types";
import { Message, messageResponse } from "../../util/observe";
import { assertFalse, assertNever, htmlDecoratedKeyword, htmlDecoratedName, htmlDecoratedOperator, htmlDecoratedType, Mutable } from "../../util/util";
import { ConstructOutlet } from "./ConstructOutlet";
import { PotentialFullExpressionOutlet } from "./PotentialFullExpressionOutlet";
import { createInitializerOutlet, InitializerOutlet } from "./InitializerOutlet";
import { getObjectString, getValueString, CPP_ANIMATIONS, EVAL_FADE_DURATION, RESET_FADE_DURATION } from "./common";
import { RuntimeFunctionCallExpression, CompiledFunctionCallExpression } from "../../core/constructs/expressions/FunctionCallExpression";
import { RuntimeNonMemberOperatorOverloadExpression, CompiledNonMemberOperatorOverloadExpression, RuntimeMemberOperatorOverloadExpression, CompiledMemberOperatorOverloadExpression } from "../../core/constructs/expressions/OperatorOverloadExpression";
import { FunctionCallOutlet } from "./FunctionCallOutlet";
import { ReturnDestinationOutlet } from "./ReturnDestinationOutlet";
import { RuntimeMagicFunctionCallExpression, CompiledMagicFunctionCallExpression } from "../../core/constructs/expressions/MagicFunctionCallExpression";
import { CompiledExpression } from "../../core/constructs/expressions/Expression";



export function createExpressionOutlet(element: JQuery, construct: CompiledExpression, parent?: ConstructOutlet) {
    return construct.createDefaultOutlet(element, parent);
}

export abstract class ExpressionOutlet<RT extends RuntimeExpression = RuntimeExpression> extends PotentialFullExpressionOutlet<RT> {

    public readonly showingEvalResult: boolean = false;
    public readonly animateEvaluation: boolean;

    protected readonly evalResultElem: JQuery;
    protected readonly wrapperElem: JQuery;
    protected readonly exprElem: JQuery;

    public constructor(element: JQuery, construct: RT["model"], parent?: ConstructOutlet, animateEvaluation = true) {
        super(element, construct, parent);

        this.animateEvaluation = animateEvaluation;

        this.element.addClass("expression");
        if (this.construct.isFullExpression()) { this.element.addClass("fullExpression"); }

        this.evalResultElem = $("<span class='lobster-hidden-expression' style='opacity:0'></span>"); // TODO fix this ugly hack
        this.wrapperElem = $("<span class='lobster-expression-wrapper'></span>");
        this.exprElem = $("<span class='expr'></span>"); // TODO fix this ugly hack
        this.wrapperElem.append(this.exprElem);
        this.wrapperElem.append(this.evalResultElem);

        this.element.append(this.wrapperElem);

        this.element.append("<span class='exprType'>" + encode(this.construct.type.toString()) + "</span>");

    }

    protected setEvalResult(result: RT["evalResult"], suppressAnimation: boolean = false) {

        if (result instanceof FunctionEntity) {
            this.evalResultElem.html(result.describe().message);
            this.evalResultElem.addClass("lvalue");
        }
        else if (result instanceof CPPObject && result.type.isCompleteObjectType()) {
            let r = <CPPObject<CompleteObjectType>>result;
            this.evalResultElem.html(getObjectString(r));
            this.evalResultElem.addClass("lvalue");
            if (!r.isAlive || r.isTyped(isAtomicType) && !r.isValueValid()) {
                this.evalResultElem.find(".code-object").addClass("invalid");
            }
        }
        else if (result instanceof Value) { // result.isA(Value)
            this.evalResultElem.html(getValueString(result));
            this.evalResultElem.addClass("rvalue");
            if (!result.isValid) {
                this.evalResultElem.addClass("invalid");
            }
        }
        else {
            assertFalse("unexpected evalResult type for expression outlet");
        }

        this.showEvalResult(suppressAnimation);
    }

    public showEvalResult(suppressAnimation: boolean = false) {

        if (this.showingEvalResult) {
            return;
        }

        (<Mutable<this>>this).showingEvalResult = true;

        if (!this.animateEvaluation) {
            return;
        }

        if (CPP_ANIMATIONS && !suppressAnimation) {
            this.wrapperElem.animate({
                width: this.evalResultElem.css("width")
            }, 500, function () {
                $(this).css("width", "auto");
            });
        }

        this.evalResultElem.removeClass("lobster-hidden-expression").fadeTo(EVAL_FADE_DURATION, 1);
        this.exprElem.addClass("lobster-hidden-expression").fadeTo(EVAL_FADE_DURATION, 0);
    }

    public removeEvalValue() {
        (<Mutable<this>>this).showingEvalResult = false;

        if (!this.animateEvaluation) {
            return;
        }
        //        if(CPP_ANIMATIONS) {
        //            this.wrapperElem.animate({
        //                width: this.exprElem.css("width")
        //            }, 500, function () {
        //                $(this).css("width", "auto");
        //            });
        ////                this.evalResultElem.animate({
        ////                    width: this.evalResultElem.css("width")
        ////                }, 500, function () {
        ////                    $(this).css("width", "auto");
        ////                });
        //        }
        //setTimeout(function() {
        this.exprElem.removeClass("lobster-hidden-expression").fadeTo(RESET_FADE_DURATION, 1).finish();
        this.evalResultElem.addClass("lobster-hidden-expression").fadeTo(RESET_FADE_DURATION, 0).finish();

        this.element.removeClass("rvalue");
        this.element.removeClass("lvalue");
        this.wrapperElem.css("width", "auto");
        //}, 2000);
    }

    public hideEvalValueRecursive() {
        this.removeEvalValue();
        for (let cKey in this.children) {
            let c = this.children[cKey];
            if (c instanceof ExpressionOutlet) {
                c.hideEvalValueRecursive();
            }
        }
    }

    protected instanceSet(inst: RT) {
        super.instanceSet(inst);
        if (inst.evalResult) {
            this.setEvalResult(inst.evalResult, true);
        }
        else {
            this.removeEvalValue();
        }
    }

    protected instanceRemoved(oldInst: RT) {
        this.removeEvalValue();
        super.instanceRemoved(oldInst);
    }

    @messageResponse("evaluated")
    protected evaluated(msg: Message<RT["evalResult"]>) {
        this.setEvalResult(msg.data);
    }
}

export function addChildExpressionOutlet(parentElement: JQuery, construct: CompiledExpression, parent: ConstructOutlet) {
    return createExpressionOutlet($("<span></span>").appendTo(parentElement), construct, parent);
}

const ASSIGNMENT_OP_HTML = htmlDecoratedOperator("=", "code-assignmentOp");

export class AssignmentExpressionOutlet extends ExpressionOutlet<RuntimeAssignmentExpression> {

    public readonly lhs: ExpressionOutlet;
    public readonly rhs: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledAssignmentExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.element.addClass("assignment");

        this.lhs = addChildExpressionOutlet(this.exprElem, this.construct.lhs, this);

        this.exprElem.append(" " + ASSIGNMENT_OP_HTML + " ");

        this.rhs = addChildExpressionOutlet(this.exprElem, this.construct.rhs, this);
    }

}

export class CompoundAssignmentExpressionOutlet extends ExpressionOutlet<RuntimeCompoundAssignmentExpression> {

    public readonly lhs: ExpressionOutlet;
    public readonly rhs: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledCompoundAssignmentExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.element.addClass("compound-assignment");

        this.lhs = addChildExpressionOutlet(this.exprElem, this.construct.lhs, this);

        this.exprElem.append(" " + htmlDecoratedOperator(this.construct.operator, "code-compoundAssignmentOp") + " ");

        this.rhs = addChildExpressionOutlet(this.exprElem, this.construct.rhs, this);
    }

}
const TERNARY_OP_HTML1 = htmlDecoratedOperator("?", "code-ternaryOp");
const TERNARY_OP_HTML2 = htmlDecoratedOperator(":", "code-ternaryOp");


export class TernaryExpressionOutlet extends ExpressionOutlet<RuntimeTernary> {

    public readonly condition: ExpressionOutlet;
    public readonly then: ExpressionOutlet;
    public readonly otherwise: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledTernaryExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.element.addClass("code-ternary");

        this.condition = addChildExpressionOutlet(this.exprElem, this.construct.condition, this);

        this.exprElem.append(" " + TERNARY_OP_HTML1 + " ");

        this.then = addChildExpressionOutlet(this.exprElem, this.construct.then, this);

        this.exprElem.append(" " + TERNARY_OP_HTML2 + " ");

        this.otherwise = addChildExpressionOutlet(this.exprElem, this.construct.otherwise, this);
    }
}
const COMMA_OP_HTML = htmlDecoratedOperator(",", "code-binaryOp");

export class CommaExpressionOutlet extends ExpressionOutlet<RuntimeComma> {

    public readonly left: ExpressionOutlet;
    public readonly right: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledCommaExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.element.addClass("code-comma");

        this.left = addChildExpressionOutlet(this.exprElem, this.construct.left, this);

        this.exprElem.append(" " + COMMA_OP_HTML + " ");

        this.right = addChildExpressionOutlet(this.exprElem, this.construct.right, this);
    }
}


export class BinaryOperatorExpressionOutlet extends ExpressionOutlet<RuntimeBinaryOperator> {

    public readonly left: ExpressionOutlet;
    public readonly right: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledBinaryOperatorExpression,
        parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.left = addChildExpressionOutlet(this.exprElem, this.construct.left, this);
        this.exprElem.append(" <span class='codeInstance code-binaryOp'>" + this.construct.operator + "<span class='lobster-highlight'></span></span> ");
        this.right = addChildExpressionOutlet(this.exprElem, this.construct.right, this);
    }
}



export class OutputOperatorExpressionOutlet extends ExpressionOutlet<RuntimeOutputOperatorExpression> {

    public readonly left: ExpressionOutlet;
    public readonly right: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledOutputOperatorExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.left = addChildExpressionOutlet(this.exprElem, this.construct.left, this);
        this.exprElem.append(" <span class='codeInstance code-binaryOp'>" + this.construct.operator + "<span class='lobster-highlight'></span></span> ");
        this.right = addChildExpressionOutlet(this.exprElem, this.construct.right, this);
    }
}


export class InputOperatorExpressionOutlet extends ExpressionOutlet<RuntimeInputOperatorExpression> {

    public readonly left: ExpressionOutlet;
    public readonly right: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledInputOperatorExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.left = addChildExpressionOutlet(this.exprElem, this.construct.left, this);
        this.exprElem.append(" <span class='codeInstance code-binaryOp'>" + this.construct.operator + "<span class='lobster-highlight'></span></span> ");
        this.right = addChildExpressionOutlet(this.exprElem, this.construct.right, this);
    }
}

export class UnaryOperatorExpressionOutlet extends ExpressionOutlet<RuntimeUnaryOperatorExpression> {

    public readonly operand: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledUnaryOperatorExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.exprElem.append(htmlDecoratedOperator(this.construct.operator, "code-unaryOp"));

        this.operand = addChildExpressionOutlet(this.exprElem, this.construct.operand, this);
    }
}



export class NewExpressionOutlet extends ExpressionOutlet<RuntimeNewExpression> {

    public readonly initializerOutlet?: InitializerOutlet;

    public constructor(element: JQuery, construct: CompiledNewExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.exprElem.append(htmlDecoratedOperator("new", "code-unaryOp"));
        this.exprElem.append(" ");
        this.exprElem.append(htmlDecoratedType(this.construct.createdType.toString()));

        if (this.construct.initializer) {
            switch (this.construct.initializer.kind) {
                case "direct": this.exprElem.append("("); break;
                case "list": this.exprElem.append("{ "); break;
                case "value": this.exprElem.append("("); break;
                case "default": break;
                case "copy": break;
                default: assertNever(this.construct.initializer.kind);
            }
            this.initializerOutlet = createInitializerOutlet($("<span></span>").appendTo(this.exprElem), this.construct.initializer, this);
            switch (this.construct.initializer.kind) {
                case "direct": this.exprElem.append(")"); break;
                case "list": this.exprElem.append(" }"); break;
                case "value": this.exprElem.append(")"); break;
                case "default": break;
                case "copy": break;
                default: assertNever(this.construct.initializer.kind);
            }
        }
    }
}


export class NewArrayExpressionOutlet extends ExpressionOutlet<RuntimeNewArrayExpression> {

    public readonly individualElementInitializerOutlets: readonly InitializerOutlet[];
    public readonly dynamicLengthExpression?: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledNewArrayExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.exprElem.append(htmlDecoratedOperator("new", "code-unaryOp"));
        this.exprElem.append(" ");

        if (this.construct.createdType.isBoundedArrayType()) {
            this.exprElem.append(htmlDecoratedType(this.construct.createdType.toString()));
        }
        else {
            this.exprElem.append(htmlDecoratedType(this.construct.createdType.elemType.toString()));
            this.exprElem.append("[");
            this.dynamicLengthExpression = addChildExpressionOutlet(this.exprElem, this.construct.dynamicLengthExpression!, this);
            this.exprElem.append("]");
        }

        if (this.construct.individualElementInitializers.length > 0) {
            this.exprElem.append("{ ");
            this.individualElementInitializerOutlets = this.construct.individualElementInitializers.map(
                elemInit => createInitializerOutlet($("<span></span>").appendTo(this.exprElem), elemInit, this)
            );
            this.exprElem.append(" }");
        }
        else {
            this.individualElementInitializerOutlets = [];
        }
    }
}


export class DeleteExpressionOutlet extends ExpressionOutlet<RuntimeDeleteExpression> {

    public readonly operand?: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledDeleteExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.exprElem.append(htmlDecoratedOperator("delete", "code-unaryOp"));
        this.exprElem.append(" ");

        this.operand = addChildExpressionOutlet(this.exprElem, this.construct.operand, this);
    }
}


export class DeleteArrayExpressionOutlet extends ExpressionOutlet<RuntimeDeleteArrayExpression> {

    public readonly operand?: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledDeleteArrayExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.exprElem.append(htmlDecoratedOperator("delete[]", "code-unaryOp"));
        this.exprElem.append(" ");

        this.operand = addChildExpressionOutlet(this.exprElem, this.construct.operand, this);
    }
}

export class PostfixIncrementExpressionOutlet extends ExpressionOutlet<RuntimePostfixIncrementExpression> {

    public readonly operand: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledPostfixIncrementExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.operand = addChildExpressionOutlet(this.exprElem, this.construct.operand, this);
        this.exprElem.append(htmlDecoratedOperator(this.construct.operator, "code-unaryOp"));
    }
}


export class SubscriptExpressionOutlet extends ExpressionOutlet<RuntimeSubscriptExpression> {

    public readonly operand: ExpressionOutlet;
    public readonly offset: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledSubscriptExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.element.addClass("code-subscript");

        this.operand = addChildExpressionOutlet(this.exprElem, this.construct.operand, this);
        this.exprElem.append(htmlDecoratedOperator("[", "code-postfixOp"));
        this.offset = addChildExpressionOutlet(this.exprElem, this.construct.offset, this);
        this.exprElem.append(htmlDecoratedOperator("]", "code-postfixOp"));
    }
}


export class DotExpressionOutlet extends ExpressionOutlet<RuntimeObjectDotExpression | RuntimeFunctionDotExpression> {

    public readonly operand: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledObjectDotExpression<CompleteObjectType> | CompiledFunctionDotExpression, parent?: ConstructOutlet) {
        super(element, construct, parent, false);
        this.operand = addChildExpressionOutlet(this.exprElem, this.construct.operand, this);
        this.exprElem.append(htmlDecoratedOperator(".", "code-postfixOp"));
        this.exprElem.append(htmlDecoratedName(construct.entity.name, construct.entity.type));

    }

}


export class ArrowExpressionOutlet extends ExpressionOutlet<RuntimeObjectArrowExpression | RuntimeFunctionArrowExpression> {

    public readonly operand: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledObjectArrowExpression<CompleteObjectType> | CompiledFunctionArrowExpression, parent?: ConstructOutlet) {
        super(element, construct, parent, false);
        this.operand = addChildExpressionOutlet(this.exprElem, this.construct.operand, this);
        this.exprElem.append(htmlDecoratedOperator("->", "code-postfixOp"));
        this.exprElem.append(construct.entity.name);

    }

}

export class ParenthesesOutlet extends ExpressionOutlet<RuntimeParentheses> {

    public readonly subexpression: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledParenthesesExpression, parent?: ConstructOutlet) {
        super(element, construct, parent, false);

        this.exprElem.append("(");
        this.subexpression = addChildExpressionOutlet(this.exprElem, this.construct.subexpression, this);
        this.exprElem.append(")");
    }
}

export class InitializerListOutlet extends ExpressionOutlet<RuntimeInitializerListExpression> {

    public readonly elements: readonly ExpressionOutlet[];

    public constructor(element: JQuery, construct: CompiledInitializerListExpression, parent?: ConstructOutlet) {
        super(element, construct, parent, false);

        this.exprElem.append("{");

        this.elements = construct.elements.map((elem, i) => {
            if (i > 0) {
                this.exprElem.append(", ");
            }
            return addChildExpressionOutlet(this.exprElem, elem, this);
        });

        this.exprElem.append("}");
    }
}

export class IdentifierOutlet extends ExpressionOutlet<RuntimeObjectIdentifierExpression | RuntimeFunctionIdentifierExpression> {

    public constructor(element: JQuery, construct: CompiledObjectIdentifierExpression<CompleteObjectType> | CompiledFunctionIdentifierExpression, parent?: ConstructOutlet) {
        super(element, construct, parent, false);
        this.exprElem.addClass("code-name");

        this.exprElem.append(identifierToString(this.construct.name));
    }

}

export class NumericLiteralOutlet extends ExpressionOutlet<RuntimeNumericLiteral> {

    public constructor(element: JQuery, construct: CompiledNumericLiteralExpression, parent?: ConstructOutlet) {
        super(element, construct, parent, false);

        this.exprElem.addClass("code-literal");
        this.exprElem.append(getValueString(this.construct.value));
    }

}



export class StringLiteralExpressionOutlet extends ExpressionOutlet<RuntimeStringLiteralExpression> {

    public constructor(element: JQuery, construct: CompiledStringLiteralExpression, parent?: ConstructOutlet) {
        super(element, construct, parent, false);

        this.exprElem.addClass("code-string-literal");
        this.exprElem.append(`"${this.construct.str}"`);
    }

}

export class OpaqueExpressionOutlet extends ExpressionOutlet<RuntimeOpaqueExpression> {

    public constructor(element: JQuery, construct: CompiledOpaqueExpression, parent?: ConstructOutlet) {
        super(element, construct, parent, false);

        this.exprElem.addClass("code-opaque-expression");
        this.exprElem.append("/* IMPLEMENTATION NOT SHOWN */");
    }

}

export class ThisExpressionOutlet extends ExpressionOutlet<RuntimeThisExpression> {

    public constructor(element: JQuery, construct: CompiledThisExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);
        this.exprElem.append(htmlDecoratedKeyword("this"));
    }

}

export class NullptrExpressionOutlet extends ExpressionOutlet<RuntimeNullptrExpression> {

    public constructor(element: JQuery, construct: CompiledNullptrExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);
        this.exprElem.append(htmlDecoratedKeyword("nullptr"));
    }

}


export class FunctionCallExpressionOutlet extends ExpressionOutlet<RuntimeFunctionCallExpression> implements ReturnDestinationOutlet {

    public readonly operandOutlet: ExpressionOutlet;
    public readonly callOutlet: FunctionCallOutlet;
    public readonly returnDestinationElement: JQuery;

    public constructor(element: JQuery, construct: CompiledFunctionCallExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);
        this.element.addClass("functionCall");
        this.returnDestinationElement = this.exprElem;

        // if (this.construct.funcCall.func.isVirtual()){
        //     this.element.addClass("virtual");
        // }
        // if (this.construct.recursiveStatus === "recursive" && this.construct.isTail) {
        //     this.element.addClass("tail");
        // }
        this.operandOutlet = createExpressionOutlet($('<span class="functionCall-operand"></span>').appendTo(this.exprElem), construct.operand, this);

        this.exprElem.append("(");

        this.callOutlet = new FunctionCallOutlet($("<span></span>").appendTo(this.exprElem), construct.call, this, this);

        this.exprElem.append(")");
        // if (this.construct.funcCall.func.isVirtual()){
        //     this.exprElem.append("<sub>v</sub>");
        // }
    }

    public setReturnedResult(result: RuntimeFunctionCallExpression["evalResult"], suppressAnimation: boolean = false) {
        this.setEvalResult(result);
    }

}




export class NonMemberOperatorOverloadExpressionOutlet extends ExpressionOutlet<RuntimeNonMemberOperatorOverloadExpression> implements ReturnDestinationOutlet {

    public readonly callOutlet: FunctionCallOutlet;
    public readonly returnDestinationElement: JQuery;

    public constructor(element: JQuery, construct: CompiledNonMemberOperatorOverloadExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);
        this.element.addClass("functionCall");
        this.returnDestinationElement = this.exprElem;

        this.callOutlet = new FunctionCallOutlet($("<span></span>").appendTo(this.exprElem), construct.call, this, this, ` ${this.construct.operator} `);
    }

    public setReturnedResult(result: RuntimeNonMemberOperatorOverloadExpression["evalResult"], suppressAnimation: boolean = false) {
        this.setEvalResult(result);
    }
}

export class MemberOperatorOverloadExpressionOutlet extends ExpressionOutlet<RuntimeMemberOperatorOverloadExpression> implements ReturnDestinationOutlet {

    public readonly receiverOutlet: ExpressionOutlet;
    public readonly callOutlet: FunctionCallOutlet;
    public readonly returnDestinationElement: JQuery;

    public constructor(element: JQuery, construct: CompiledMemberOperatorOverloadExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);
        this.element.addClass("functionCall");
        this.returnDestinationElement = this.exprElem;

        if (this.construct.operator === "[]") {
            this.receiverOutlet = addChildExpressionOutlet(this.exprElem, this.construct.receiverExpression, this);
            this.exprElem.append("<span class='codeInstance code-binaryOp'>[<span class='lobster-highlight'></span></span>");
            this.callOutlet = new FunctionCallOutlet($("<span></span>").appendTo(this.exprElem), construct.call, this, this);
            this.exprElem.append("<span class='codeInstance code-binaryOp'>]<span class='lobster-highlight'></span></span>");
        }
        else {
            this.receiverOutlet = addChildExpressionOutlet(this.exprElem, this.construct.receiverExpression, this);
            this.exprElem.append(" <span class='codeInstance code-binaryOp'>" + this.construct.operator + "<span class='lobster-highlight'></span></span> ");
            this.callOutlet = new FunctionCallOutlet($("<span></span>").appendTo(this.exprElem), construct.call, this, this, ` ${this.construct.operator} `);
        }
    }

    public setReturnedResult(result: RuntimeMemberOperatorOverloadExpression["evalResult"], suppressAnimation: boolean = false) {
        this.setEvalResult(result);
    }
}





export class MagicFunctionCallExpressionOutlet extends ExpressionOutlet<RuntimeMagicFunctionCallExpression> {

    public readonly argOutlets: readonly ExpressionOutlet[];

    public constructor(element: JQuery, construct: CompiledMagicFunctionCallExpression, parent?: ConstructOutlet) {
        super(element, construct, parent);
        this.element.addClass("functionCall");

        this.exprElem.append(htmlDecoratedName(this.construct.functionName) + "(");

        this.argOutlets = this.construct.args.map((argInit, i) => {
            if (i > 0) {
                this.exprElem.append(", ");
            }
            return addChildExpressionOutlet(this.exprElem, argInit, this);
        });

        this.exprElem.append(")");
        // if (this.construct.funcCall.func.isVirtual()){
        //     this.exprElem.append("<sub>v</sub>");
        // }
    }

}
