/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { RuntimeConstruct } from "../core/constructs";
import { RuntimePotentialFullExpression } from "../core/PotentialFullExpression";
import { CompiledFunctionCall, RuntimeFunctionCall } from "../core/FunctionCall";
import { Message, MessageResponses, Observable, ObserverType } from "../util/observe";
import { CompiledParameterDeclaration } from "../core/declarations";
import { RuntimeBlock, CompiledBlock, RuntimeStatement, CompiledStatement, RuntimeDeclarationStatement, CompiledDeclarationStatement, RuntimeExpressionStatement, CompiledExpressionStatement, RuntimeIfStatement, CompiledIfStatement, RuntimeWhileStatement, CompiledWhileStatement, CompiledForStatement, RuntimeForStatement, RuntimeReturnStatement, CompiledReturnStatement, RuntimeNullStatement, CompiledNullStatement, RuntimeBreakStatement, CompiledBreakStatement } from "../core/statements";
import { RuntimeInitializer, CompiledInitializer, RuntimeAtomicDefaultInitializer, RuntimeArrayDefaultInitializer, CompiledArrayDefaultInitializer, RuntimeDirectInitializer, CompiledDirectInitializer, RuntimeAtomicDirectInitializer, CompiledAtomicDirectInitializer, CompiledReferenceDirectInitializer, RuntimeReferenceDirectInitializer, RuntimeArrayDirectInitializer, CompiledArrayDirectInitializer, RuntimeClassDefaultInitializer, CompiledClassDefaultInitializer, RuntimeClassDirectInitializer, CompiledClassDirectInitializer, RuntimeCtorInitializer, CompiledCtorInitializer, CompiledArrayAggregateInitializer, RuntimeArrayAggregateInitializer, CompiledArrayMemberInitializer, RuntimeArrayMemberInitializer, CompiledArrayValueInitializer, CompiledClassValueInitializer, RuntimeArrayValueInitializer, RuntimeAtomicValueInitializer, RuntimeClassValueInitializer } from "../core/initializers";
import { RuntimeExpression, CompiledExpression } from "../core/expressionBase";
import { Value } from "../core/runtimeEnvironment";
import { RuntimeAssignment as RuntimeAssignmentExpression, RuntimeTernary, CompiledAssignmentExpression, CompiledTernaryExpression, RuntimeComma, CompiledCommaExpression, CompiledUnaryOperatorExpression, RuntimeSubscriptExpression, CompiledSubscriptExpression, RuntimeParentheses, CompiledParenthesesExpression, RuntimeObjectIdentifierExpression, CompiledObjectIdentifierExpression, RuntimeNumericLiteral, CompiledNumericLiteralExpression, RuntimeFunctionIdentifierExpression, CompiledFunctionIdentifierExpression, RuntimeMagicFunctionCallExpression, CompiledMagicFunctionCallExpression, RuntimeStringLiteralExpression, CompiledStringLiteralExpression, RuntimeUnaryOperatorExpression, RuntimeBinaryOperator, CompiledBinaryOperatorExpression, RuntimeImplicitConversion, CompiledImplicitConversion, RuntimeObjectDotExpression, RuntimeFunctionDotExpression, CompiledObjectDotExpression, CompiledFunctionDotExpression, RuntimeObjectArrowExpression, RuntimeFunctionArrowExpression, CompiledObjectArrowExpression, CompiledFunctionArrowExpression, CompiledOutputOperatorExpression, RuntimeOutputOperatorExpression, RuntimePostfixIncrementExpression, CompiledPostfixIncrementExpression, RuntimeInputOperatorExpression, CompiledInputOperatorExpression, RuntimeNonMemberOperatorOverloadExpression, CompiledNonMemberOperatorOverloadExpression, RuntimeMemberOperatorOverloadExpression, CompiledMemberOperatorOverloadExpression, CompiledInitializerListExpression, RuntimeInitializerListExpression, CompiledCompoundAssignmentExpression, RuntimeCompoundAssignment as RuntimeCompoundAssignmentExpression, CompiledThisExpression, RuntimeThisExpression } from "../core/expressions";
import { CompiledNewExpression, RuntimeNewExpression, CompiledDeleteExpression, RuntimeDeleteExpression, RuntimeNewArrayExpression, CompiledNewArrayExpression, CompiledDeleteArrayExpression, RuntimeDeleteArrayExpression } from "../core/new_delete";
import { CompleteObjectType, Char, ArrayPointerType } from "../core/types";
import { RuntimeFunctionCallExpression, CompiledFunctionCallExpression } from "../core/FunctionCallExpression";
import { RuntimeFunction } from "../core/functions";
import { RuntimeOpaqueExpression, CompiledOpaqueExpression } from "../core/opaqueExpression";
export declare const CODE_ANIMATIONS = true;
export declare function getValueString(value: Value): string;
export declare function cstringToString(value: Value<ArrayPointerType<Char>>): string;
declare type ConstructOutletMessages = "childOutletAdded" | "parameterPassed" | "registerCallOutlet" | "returnPassed";
export declare abstract class ConstructOutlet<RTConstruct_type extends RuntimeConstruct = RuntimeConstruct> {
    protected readonly element: JQuery;
    protected readonly construct: RTConstruct_type["model"];
    readonly parent?: ConstructOutlet;
    readonly inst?: RTConstruct_type;
    _act: MessageResponses;
    readonly observable: Observable<ConstructOutletMessages>;
    private static _ID;
    private outletID;
    /**
     * Children are stored by the ID of the CPPConstruct they display.
     */
    protected readonly children: {
        [index: number]: ConstructOutlet;
    };
    constructor(element: JQuery, construct: RTConstruct_type["model"], parent?: ConstructOutlet);
    setRuntimeInstance(inst: RTConstruct_type): void;
    protected instanceSet(inst: RTConstruct_type): void;
    removeInstance(): void;
    protected instanceRemoved(oldInst: RTConstruct_type): void;
    private addChildOutlet;
    private setChildInstance;
    private upNext;
    private wait;
    protected popped(): void;
    private childInstanceCreated;
    private current;
    private uncurrent;
    private identifyCodeOutlet;
}
export declare class PotentialFullExpressionOutlet<RT extends RuntimePotentialFullExpression = RuntimePotentialFullExpression> extends ConstructOutlet<RT> {
    constructor(element: JQuery, construct: RT["model"], parent?: ConstructOutlet);
}
export declare class FunctionOutlet extends ConstructOutlet<RuntimeFunction> {
    readonly ctorInitializer?: CtorInitializerOutlet;
    readonly body: BlockOutlet;
    private readonly paramsElem;
    parameterOutlets: ParameterOutlet[];
    constructor(element: JQuery, rtFunc: RuntimeFunction, listener?: ObserverType);
    protected instanceSet(inst: RuntimeFunction): void;
    private gainControl;
    private loseControl;
    private valueWritten;
}
export declare class ParameterOutlet {
    private readonly element;
    readonly passedValueElem: JQuery;
    constructor(element: JQuery, paramDef: CompiledParameterDeclaration);
    setPassedContents(html: string): void;
}
export declare class CtorInitializerOutlet extends ConstructOutlet<RuntimeCtorInitializer> {
    readonly delegatedConstructorInitializer?: ClassDirectInitializerOutlet;
    readonly baseInitializer?: ClassDefaultInitializerOutlet | ClassDirectInitializerOutlet;
    readonly memberInitializers: readonly InitializerOutlet[];
    constructor(element: JQuery, construct: CompiledCtorInitializer, parent?: ConstructOutlet);
}
export declare class BlockOutlet extends ConstructOutlet<RuntimeBlock> {
    constructor(element: JQuery, construct: CompiledBlock, parent?: ConstructOutlet);
}
export declare class StatementOutlet<RTConstruct_type extends RuntimeStatement = RuntimeStatement> extends ConstructOutlet<RTConstruct_type> {
    constructor(element: JQuery, construct: RTConstruct_type["model"], parent?: ConstructOutlet);
}
export declare class DeclarationStatementOutlet extends StatementOutlet<RuntimeDeclarationStatement> {
    readonly initializerOutlets: readonly (InitializerOutlet | undefined)[];
    private declaratorElems;
    private currentDeclarationIndex;
    constructor(element: JQuery, construct: CompiledDeclarationStatement, parent?: ConstructOutlet);
    protected instanceSet(inst: RuntimeDeclarationStatement): void;
    protected instanceRemoved(oldInst: RuntimeDeclarationStatement): void;
    private setCurrentDeclarationIndex;
    private initializing;
    protected popped(): void;
}
export declare class ExpressionStatementOutlet extends StatementOutlet<RuntimeExpressionStatement> {
    readonly expression: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledExpressionStatement, parent?: ConstructOutlet);
    protected instanceSet(inst: RuntimeExpressionStatement): void;
    protected popped(): void;
}
export declare class NullStatementOutlet extends StatementOutlet<RuntimeNullStatement> {
    constructor(element: JQuery, construct: CompiledNullStatement, parent?: ConstructOutlet);
}
export declare class IfStatementOutlet extends StatementOutlet<RuntimeIfStatement> {
    readonly condition: ExpressionOutlet;
    readonly then: StatementOutlet;
    readonly otherwise?: StatementOutlet;
    constructor(element: JQuery, construct: CompiledIfStatement, parent?: ConstructOutlet);
}
export declare class WhileStatementOutlet extends StatementOutlet<RuntimeWhileStatement> {
    readonly condition: ExpressionOutlet;
    readonly body: StatementOutlet;
    constructor(element: JQuery, construct: CompiledWhileStatement, parent?: ConstructOutlet);
}
export declare class ForStatementOutlet extends StatementOutlet<RuntimeForStatement> {
    readonly initial: StatementOutlet;
    readonly condition: ExpressionOutlet;
    readonly post?: ExpressionOutlet;
    readonly body: StatementOutlet;
    constructor(element: JQuery, construct: CompiledForStatement, parent?: ConstructOutlet);
}
export declare class BreakStatementOutlet extends StatementOutlet<RuntimeBreakStatement> {
    constructor(element: JQuery, construct: CompiledBreakStatement, parent?: ConstructOutlet);
}
export declare class ReturnStatementOutlet extends StatementOutlet<RuntimeReturnStatement> {
    readonly returnInitializer?: ReturnInitializerOutlet;
    constructor(element: JQuery, construct: CompiledReturnStatement, parent?: ConstructOutlet);
}
export declare class ReturnInitializerOutlet extends ConstructOutlet<RuntimeDirectInitializer> {
    readonly expression: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledDirectInitializer, parent?: ConstructOutlet);
    private referenceInitialized;
    private atomicObjectInitialized;
}
export declare class InitializerOutlet<RT extends RuntimeInitializer = RuntimeInitializer> extends PotentialFullExpressionOutlet<RT> {
    constructor(element: JQuery, construct: CompiledInitializer, parent?: ConstructOutlet);
}
export declare class AtomicDefaultInitializerOutlet extends InitializerOutlet<RuntimeAtomicDefaultInitializer> {
}
export declare class ArrayDefaultInitializerOutlet extends InitializerOutlet<RuntimeArrayDefaultInitializer> {
    readonly elementInitializerOutlets?: readonly InitializerOutlet[];
    constructor(element: JQuery, construct: CompiledArrayDefaultInitializer, parent?: ConstructOutlet);
}
export declare class ClassDefaultInitializerOutlet extends InitializerOutlet<RuntimeClassDefaultInitializer> {
    readonly ctorCallOutlet: FunctionCallOutlet;
    constructor(element: JQuery, construct: CompiledClassDefaultInitializer, parent?: ConstructOutlet);
}
export declare type DefaultInitializerOutlet = AtomicDefaultInitializerOutlet | ArrayDefaultInitializerOutlet | ClassDefaultInitializerOutlet;
export declare class AtomicValueInitializerOutlet extends InitializerOutlet<RuntimeAtomicValueInitializer> {
}
export declare class ArrayValueInitializerOutlet extends InitializerOutlet<RuntimeArrayValueInitializer> {
    readonly elementInitializerOutlets?: readonly InitializerOutlet[];
    constructor(element: JQuery, construct: CompiledArrayValueInitializer, parent?: ConstructOutlet);
}
export declare class ClassValueInitializerOutlet extends InitializerOutlet<RuntimeClassValueInitializer> {
    readonly ctorCallOutlet: FunctionCallOutlet;
    constructor(element: JQuery, construct: CompiledClassValueInitializer, parent?: ConstructOutlet);
}
export declare type ValueInitializerOutlet = AtomicValueInitializerOutlet | ArrayValueInitializerOutlet | ClassValueInitializerOutlet;
export declare class AtomicDirectInitializerOutlet extends InitializerOutlet<RuntimeAtomicDirectInitializer> {
    readonly argOutlet: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledAtomicDirectInitializer, parent?: ConstructOutlet);
}
export declare class ReferenceDirectInitializerOutlet extends InitializerOutlet<RuntimeReferenceDirectInitializer> {
    readonly argOutlet: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledReferenceDirectInitializer, parent?: ConstructOutlet);
}
export declare class ArrayDirectInitializerOutlet extends InitializerOutlet<RuntimeArrayDirectInitializer> {
    readonly argOutlet: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledArrayDirectInitializer, parent?: ConstructOutlet);
}
export declare class ClassDirectInitializerOutlet extends InitializerOutlet<RuntimeClassDirectInitializer> {
    readonly ctorCallOutlet: FunctionCallOutlet;
    constructor(element: JQuery, construct: CompiledClassDirectInitializer, parent?: ConstructOutlet);
}
export declare type DirectInitializerOutlet = AtomicDirectInitializerOutlet | ReferenceDirectInitializerOutlet | ArrayDirectInitializerOutlet | ClassDirectInitializerOutlet;
export declare abstract class CopyInitializerOutlet extends InitializerOutlet<RuntimeDirectInitializer> {
    constructor(element: JQuery, construct: CompiledDirectInitializer, parent?: ConstructOutlet);
}
export declare class AtomicCopyInitializerOutlet extends InitializerOutlet<RuntimeAtomicDirectInitializer> {
    readonly argOutlet: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledAtomicDirectInitializer, parent?: ConstructOutlet);
}
export declare class ReferenceCopyInitializerOutlet extends InitializerOutlet<RuntimeReferenceDirectInitializer> {
    readonly argOutlet: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledReferenceDirectInitializer, parent?: ConstructOutlet);
}
export declare class ClassCopyInitializerOutlet extends InitializerOutlet<RuntimeClassDirectInitializer> {
    readonly ctorCallOutlet: FunctionCallOutlet;
    constructor(element: JQuery, construct: CompiledClassDirectInitializer, parent?: ConstructOutlet);
}
export declare class ArrayAggregateInitializerOutlet extends InitializerOutlet<RuntimeArrayAggregateInitializer> {
    readonly elemInitializerOutlets: readonly (DirectInitializerOutlet | ValueInitializerOutlet)[];
    constructor(element: JQuery, construct: CompiledArrayAggregateInitializer, parent?: ConstructOutlet);
}
export declare class ArrayMemberInitializerOutlet extends InitializerOutlet<RuntimeArrayMemberInitializer> {
    constructor(element: JQuery, construct: CompiledArrayMemberInitializer, parent?: ConstructOutlet);
}
export declare abstract class ExpressionOutlet<RT extends RuntimeExpression = RuntimeExpression> extends PotentialFullExpressionOutlet<RT> {
    readonly showingEvalResult: boolean;
    readonly animateEvaluation: boolean;
    protected readonly evalResultElem: JQuery;
    protected readonly wrapperElem: JQuery;
    protected readonly exprElem: JQuery;
    constructor(element: JQuery, construct: RT["model"], parent?: ConstructOutlet, animateEvaluation?: boolean);
    protected setEvalResult(result: RT["evalResult"], suppressAnimation?: boolean): void;
    showEvalResult(suppressAnimation?: boolean): void;
    removeEvalValue(): void;
    hideEvalValueRecursive(): void;
    protected instanceSet(inst: RT): void;
    protected instanceRemoved(oldInst: RT): void;
    protected evaluated(msg: Message<RT["evalResult"]>): void;
}
export declare class AssignmentExpressionOutlet extends ExpressionOutlet<RuntimeAssignmentExpression> {
    readonly lhs: ExpressionOutlet;
    readonly rhs: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledAssignmentExpression, parent?: ConstructOutlet);
}
export declare class CompoundAssignmentExpressionOutlet extends ExpressionOutlet<RuntimeCompoundAssignmentExpression> {
    readonly lhs: ExpressionOutlet;
    readonly rhs: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledCompoundAssignmentExpression, parent?: ConstructOutlet);
}
export declare class TernaryExpressionOutlet extends ExpressionOutlet<RuntimeTernary> {
    readonly condition: ExpressionOutlet;
    readonly then: ExpressionOutlet;
    readonly otherwise: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledTernaryExpression, parent?: ConstructOutlet);
}
export declare class CommaExpressionOutlet extends ExpressionOutlet<RuntimeComma> {
    readonly left: ExpressionOutlet;
    readonly right: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledCommaExpression, parent?: ConstructOutlet);
}
export interface ReturnDestinationOutlet {
    readonly returnDestinationElement: JQuery;
    setReturnedResult(result: RuntimeFunctionCallExpression["evalResult"], suppressAnimation?: boolean): void;
}
export declare class FunctionCallExpressionOutlet extends ExpressionOutlet<RuntimeFunctionCallExpression> implements ReturnDestinationOutlet {
    readonly operandOutlet: ExpressionOutlet;
    readonly callOutlet: FunctionCallOutlet;
    readonly returnDestinationElement: JQuery;
    constructor(element: JQuery, construct: CompiledFunctionCallExpression, parent?: ConstructOutlet);
    setReturnedResult(result: RuntimeFunctionCallExpression["evalResult"], suppressAnimation?: boolean): void;
}
export declare class FunctionCallOutlet extends ConstructOutlet<RuntimeFunctionCall> {
    readonly argInitializerOutlets: readonly ArgumentInitializerOutlet[];
    readonly returnOutlet?: ReturnDestinationOutlet;
    constructor(element: JQuery, construct: CompiledFunctionCall, parent: ConstructOutlet, returnOutlet?: ReturnDestinationOutlet, argumentSeparator?: string);
    protected instanceSet(inst: RuntimeFunctionCall): void;
    private registerCallOutlet;
}
export declare class ArgumentInitializerOutlet extends ConstructOutlet<RuntimeDirectInitializer> {
    readonly expressionOutlet: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledDirectInitializer, parent?: ConstructOutlet);
    private referenceInitialized;
    private atomicObjectInitialized;
}
export declare class MagicFunctionCallExpressionOutlet extends ExpressionOutlet<RuntimeMagicFunctionCallExpression> {
    readonly argOutlets: readonly ExpressionOutlet[];
    constructor(element: JQuery, construct: CompiledMagicFunctionCallExpression, parent?: ConstructOutlet);
}
export declare class NonMemberOperatorOverloadExpressionOutlet extends ExpressionOutlet<RuntimeNonMemberOperatorOverloadExpression> implements ReturnDestinationOutlet {
    readonly callOutlet: FunctionCallOutlet;
    readonly returnDestinationElement: JQuery;
    constructor(element: JQuery, construct: CompiledNonMemberOperatorOverloadExpression, parent?: ConstructOutlet);
    setReturnedResult(result: RuntimeNonMemberOperatorOverloadExpression["evalResult"], suppressAnimation?: boolean): void;
}
export declare class MemberOperatorOverloadExpressionOutlet extends ExpressionOutlet<RuntimeMemberOperatorOverloadExpression> implements ReturnDestinationOutlet {
    readonly receiverOutlet: ExpressionOutlet;
    readonly callOutlet: FunctionCallOutlet;
    readonly returnDestinationElement: JQuery;
    constructor(element: JQuery, construct: CompiledMemberOperatorOverloadExpression, parent?: ConstructOutlet);
    setReturnedResult(result: RuntimeMemberOperatorOverloadExpression["evalResult"], suppressAnimation?: boolean): void;
}
export declare class BinaryOperatorExpressionOutlet extends ExpressionOutlet<RuntimeBinaryOperator> {
    readonly left: ExpressionOutlet;
    readonly right: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledBinaryOperatorExpression, parent?: ConstructOutlet);
}
export declare class OutputOperatorExpressionOutlet extends ExpressionOutlet<RuntimeOutputOperatorExpression> {
    readonly left: ExpressionOutlet;
    readonly right: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledOutputOperatorExpression, parent?: ConstructOutlet);
}
export declare class InputOperatorExpressionOutlet extends ExpressionOutlet<RuntimeInputOperatorExpression> {
    readonly left: ExpressionOutlet;
    readonly right: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledInputOperatorExpression, parent?: ConstructOutlet);
}
export declare class UnaryOperatorExpressionOutlet extends ExpressionOutlet<RuntimeUnaryOperatorExpression> {
    readonly operand: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledUnaryOperatorExpression, parent?: ConstructOutlet);
}
export declare class NewExpressionOutlet extends ExpressionOutlet<RuntimeNewExpression> {
    readonly initializerOutlet?: InitializerOutlet;
    constructor(element: JQuery, construct: CompiledNewExpression, parent?: ConstructOutlet);
}
export declare class NewArrayExpressionOutlet extends ExpressionOutlet<RuntimeNewArrayExpression> {
    readonly individualElementInitializerOutlets: readonly InitializerOutlet[];
    readonly dynamicLengthExpression?: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledNewArrayExpression, parent?: ConstructOutlet);
}
export declare class DeleteExpressionOutlet extends ExpressionOutlet<RuntimeDeleteExpression> {
    readonly operand?: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledDeleteExpression, parent?: ConstructOutlet);
}
export declare class DeleteArrayExpressionOutlet extends ExpressionOutlet<RuntimeDeleteArrayExpression> {
    readonly operand?: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledDeleteArrayExpression, parent?: ConstructOutlet);
}
export declare class PostfixIncrementExpressionOutlet extends ExpressionOutlet<RuntimePostfixIncrementExpression> {
    readonly operand: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledPostfixIncrementExpression, parent?: ConstructOutlet);
}
export declare class SubscriptExpressionOutlet extends ExpressionOutlet<RuntimeSubscriptExpression> {
    readonly operand: ExpressionOutlet;
    readonly offset: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledSubscriptExpression, parent?: ConstructOutlet);
}
export declare class DotExpressionOutlet extends ExpressionOutlet<RuntimeObjectDotExpression | RuntimeFunctionDotExpression> {
    readonly operand: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledObjectDotExpression<CompleteObjectType> | CompiledFunctionDotExpression, parent?: ConstructOutlet);
}
export declare class ArrowExpressionOutlet extends ExpressionOutlet<RuntimeObjectArrowExpression | RuntimeFunctionArrowExpression> {
    readonly operand: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledObjectArrowExpression<CompleteObjectType> | CompiledFunctionArrowExpression, parent?: ConstructOutlet);
}
export declare class ParenthesesOutlet extends ExpressionOutlet<RuntimeParentheses> {
    readonly subexpression: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledParenthesesExpression, parent?: ConstructOutlet);
}
export declare class InitializerListOutlet extends ExpressionOutlet<RuntimeInitializerListExpression> {
    readonly elements: readonly ExpressionOutlet[];
    constructor(element: JQuery, construct: CompiledInitializerListExpression, parent?: ConstructOutlet);
}
export declare class IdentifierOutlet extends ExpressionOutlet<RuntimeObjectIdentifierExpression | RuntimeFunctionIdentifierExpression> {
    constructor(element: JQuery, construct: CompiledObjectIdentifierExpression<CompleteObjectType> | CompiledFunctionIdentifierExpression, parent?: ConstructOutlet);
}
export declare class NumericLiteralOutlet extends ExpressionOutlet<RuntimeNumericLiteral> {
    constructor(element: JQuery, construct: CompiledNumericLiteralExpression, parent?: ConstructOutlet);
}
export declare class StringLiteralExpressionOutlet extends ExpressionOutlet<RuntimeStringLiteralExpression> {
    constructor(element: JQuery, construct: CompiledStringLiteralExpression, parent?: ConstructOutlet);
}
export declare class OpaqueExpressionOutlet extends ExpressionOutlet<RuntimeOpaqueExpression> {
    constructor(element: JQuery, construct: CompiledOpaqueExpression, parent?: ConstructOutlet);
}
export declare class ThisExpressionOutlet extends ExpressionOutlet<RuntimeThisExpression> {
    constructor(element: JQuery, construct: CompiledThisExpression, parent?: ConstructOutlet);
}
export declare class TypeConversionOutlet extends ExpressionOutlet<RuntimeImplicitConversion> {
    readonly from: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledImplicitConversion, parent?: ConstructOutlet);
}
export declare class LValueToRValueOutlet extends ExpressionOutlet<RuntimeImplicitConversion> {
    readonly from: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledImplicitConversion, parent?: ConstructOutlet);
}
export declare class ArrayToPointerOutlet extends ExpressionOutlet<RuntimeImplicitConversion> {
    readonly from: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledImplicitConversion, parent?: ConstructOutlet);
}
export declare class StreamToBoolOutlet extends ExpressionOutlet<RuntimeImplicitConversion> {
    readonly from: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledImplicitConversion, parent?: ConstructOutlet);
}
export declare class QualificationConversionOutlet extends ExpressionOutlet<RuntimeImplicitConversion> {
    readonly from: ExpressionOutlet;
    constructor(element: JQuery, construct: CompiledImplicitConversion, parent?: ConstructOutlet);
}
export declare function createExpressionOutlet(element: JQuery, construct: CompiledExpression, parent?: ConstructOutlet): ExpressionOutlet<RuntimeExpression<import("../core/types").ExpressionType, import("../core/expressionBase").ValueCategory, CompiledExpression<import("../core/types").ExpressionType, import("../core/expressionBase").ValueCategory>>>;
export declare function createInitializerOutlet(element: JQuery, construct: CompiledInitializer, parent?: ConstructOutlet): InitializerOutlet<RuntimeInitializer<CompiledInitializer<import("../core/entities").ObjectEntityType>>>;
export declare function createStatementOutlet(element: JQuery, construct: CompiledStatement, parent?: ConstructOutlet): StatementOutlet<RuntimeStatement<CompiledStatement>>;
export declare function addChildExpressionOutlet(parentElement: JQuery, construct: CompiledExpression, parent: ConstructOutlet): ExpressionOutlet<RuntimeExpression<import("../core/types").ExpressionType, import("../core/expressionBase").ValueCategory, CompiledExpression<import("../core/types").ExpressionType, import("../core/expressionBase").ValueCategory>>>;
export declare function addChildInitializerOutlet(parentElement: JQuery, construct: CompiledInitializer, parent: ConstructOutlet): InitializerOutlet<RuntimeInitializer<CompiledInitializer<import("../core/entities").ObjectEntityType>>>;
export declare function addChildStatementOutlet(parentElement: JQuery, construct: CompiledStatement, parent: ConstructOutlet, indented?: boolean): StatementOutlet<RuntimeStatement<CompiledStatement>>;
export {};
