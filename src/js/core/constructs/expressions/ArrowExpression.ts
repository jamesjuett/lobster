import { CPPObject } from "../../runtime/objects";
import { SimulationEvent } from "../../runtime/Simulation";
import { CompleteObjectType, PointerType, FunctionType, peelReference, CompleteClassType, PotentiallyCompleteObjectType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription, createExpressionContextWithReceiverType, SemanticContext, areSemanticallyEquivalent } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { CPPError } from "../../compilation/errors";
import { FunctionEntity, MemberVariableEntity, areEntitiesSemanticallyEquivalent } from "../../compilation/entities";
import { entityLookup } from "./entityLookup";
import { Value } from "../../runtime/Value";
import { assertFalse } from "../../../util/util";
import { LexicalIdentifier, identifierToString, astToIdentifier } from "../../compilation/lexical";
import { VCResultTypes, Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { ConstructOutlet, ArrowExpressionOutlet } from "../../../view/codeOutlets";
import { AnalyticConstruct } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { ArrowExpressionASTNode } from "../../../ast/ast_expressions";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";








export class ArrowExpression extends Expression<ArrowExpressionASTNode> {
    public readonly construct_type = "arrow_expression";

    public readonly type?: PotentiallyCompleteObjectType | FunctionType;
    public readonly valueCategory = "lvalue";

    public readonly operand: Expression;
    public readonly memberName: LexicalIdentifier;

    public readonly entity?: MemberVariableEntity | FunctionEntity;

    public static createFromAST(ast: ArrowExpressionASTNode, context: ExpressionContext): ArrowExpression {
        let operand: Expression = createExpressionFromAST(ast.operand, context);
        let receiverContext = operand.type?.isPointerType() && operand.type.ptrTo.isCompleteClassType() ?
            createExpressionContextWithReceiverType(context, operand.type.ptrTo) :
            context;
        return new ArrowExpression(receiverContext, ast, operand, astToIdentifier(ast.member));
    }

    public constructor(context: ExpressionContext, ast: ArrowExpressionASTNode, operand: Expression, memberName: LexicalIdentifier) {
        super(context, ast);

        this.attach(this.operand = operand);
        this.memberName = memberName;

        let operandType = this.operand.type;

        if (!(operandType?.isPointerType() && operandType.ptrTo.isPotentiallyCompleteClassType())) {
            this.addNote(CPPError.expr.arrow.class_pointer_type(this));
            return;
        }

        if (!operandType.ptrTo.isCompleteClassType()) {
            this.addNote(CPPError.expr.arrow.incomplete_class_type_prohibited(this));
            return;
        }

        let classType = operandType.ptrTo;

        let lookupResult = typeof memberName === "string"
            ? classType.classScope.lookup(memberName, { kind: "normal", noParent: true })
            : this.context.translationUnit.qualifiedLookup(memberName);
        let entityOrError = entityLookup(this, lookupResult);
        switch (entityOrError) {
            case "not_found":
                this.addNote(CPPError.expr.arrow.no_such_member(this, classType, identifierToString(memberName)));
                break;
            case "ambiguous":
                this.addNote(CPPError.expr.arrow.ambiguous_member(this, identifierToString(memberName)));
                break;
            case "class_found":
                this.addNote(CPPError.expr.arrow.class_entity_found(this, identifierToString(memberName)));
                break;
            default:
                if (entityOrError.declarationKind === "function") {
                    this.entity = entityOrError;
                }
                else if (entityOrError.variableLocation === "member") {
                    this.entity = entityOrError;

                }
                else {
                    assertFalse("non-member variable found during member access lookup");
                }
                this.entity = entityOrError;
        }

        // Check if this is an implicit member access operation
        if (this.entity?.declarationKind === "variable"
            && this.entity.variableKind === "object"
            && this.context.contextualReceiverType?.isConst) {
            // A non-reference member variable will inherit const from the
            // receiver of a member access operation.
            this.type = peelReference(this.entity.type.cvQualified(true));
        }
        else {
            this.type = peelReference(this.entity?.type);
        }
    }

    public createDefaultOutlet(this: CompiledObjectArrowExpression<CompleteObjectType> | CompiledFunctionArrowExpression, element: JQuery, parent?: ConstructOutlet) {
        return new ArrowExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

    //     isTailChild : function(child){
    //         return {isTail: false,
    //             reason: "The subscripting will happen after the recursive call returns.",
    //             others: [this]
    //         };
    //     }
    public entitiesUsed() {
        return this.entity ? [this.entity] : [];
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && this.memberName === other.memberName
            && areSemanticallyEquivalent(this.operand, other.operand, ec)
            && areEntitiesSemanticallyEquivalent(this.entity, other.entity, ec);
    }
}

export interface TypedObjectArrowExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends ArrowExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: MemberVariableEntity<T>;
    readonly operand: TypedExpression<PointerType<CompleteClassType>>;
}

export interface CompiledObjectArrowExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends TypedObjectArrowExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly operand: CompiledExpression<PointerType<CompleteClassType>>;
}

export interface TypedFunctionArrowExpression<T extends FunctionType = FunctionType> extends ArrowExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: FunctionEntity<T>;
    readonly operand: TypedExpression<PointerType<CompleteClassType>>;
}

export interface CompiledFunctionArrowExpression<T extends FunctionType = FunctionType> extends TypedFunctionArrowExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly operand: CompiledExpression<PointerType<CompleteClassType>>;
}

export class RuntimeObjectArrowExpression<T extends CompleteObjectType = CompleteObjectType> extends RuntimeExpression<T, "lvalue", CompiledObjectArrowExpression<T>> {

    readonly operand: RuntimeExpression<PointerType<CompleteClassType>>;

    public constructor(model: CompiledObjectArrowExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
    }

    protected upNextImpl() {
        if (!this.operand.isDone) {
            this.sim.push(this.operand);
        }
    }

    protected stepForwardImpl() {

        let evalResult = this.operand.evalResult;
        let addr = evalResult instanceof Value ? evalResult : evalResult.getValue();

        if (PointerType.isNull(addr.rawValue)) {
            this.sim.eventOccurred(SimulationEvent.CRASH, "Ow! Your code just tried to use the arrow operator on a null pointer!", true);
        }

        let obj = this.sim.memory.dereference(addr);
        this.setEvalResult(<VCResultTypes<T, "lvalue">>obj.getMemberObject(this.model.entity.name)!);
        this.startCleanup();
    }
}

export class RuntimeFunctionArrowExpression extends RuntimeExpression<FunctionType, "lvalue", CompiledFunctionArrowExpression> {

    readonly operand: RuntimeExpression<PointerType<CompleteClassType>>;

    private receiverCalledOn?: CPPObject<CompleteClassType>;

    public constructor(model: CompiledFunctionArrowExpression, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
    }

    protected upNextImpl() {
        if (!this.operand.isDone) {
            this.sim.push(this.operand);
        }
    }

    protected stepForwardImpl() {
        let evalResult = this.operand.evalResult;
        let addr = evalResult instanceof Value ? evalResult : evalResult.getValue();

        if (PointerType.isNull(addr.rawValue)) {
            this.sim.eventOccurred(SimulationEvent.CRASH, "Ow! Your code just tried to use the arrow operator on a null pointer!", true);
        }

        this.receiverCalledOn = this.sim.memory.dereference(addr);
        this.setEvalResult(this.model.entity);
        this.startCleanup();
    }

    public get contextualReceiver() {
        return this.receiverCalledOn ?? super.contextualReceiver;
    }
}
