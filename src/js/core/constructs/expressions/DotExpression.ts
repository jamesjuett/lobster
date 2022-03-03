import { CompleteObjectType, FunctionType, peelReference, CompleteClassType, isPotentiallyCompleteClassType, isCompleteClassType, PotentiallyCompleteObjectType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription, createExpressionContextWithReceiverType, SemanticContext, areSemanticallyEquivalent } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { CPPError } from "../../compilation/errors";
import { FunctionEntity, MemberVariableEntity, areEntitiesSemanticallyEquivalent } from "../../compilation/entities";
import { entityLookup } from "./entityLookup";
import { assertFalse } from "../../../util/util";
import { LexicalIdentifier, identifierToString, astToIdentifier } from "../../compilation/lexical";
import { VCResultTypes, Expression, CompiledExpression, TypedExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { ConstructOutlet, DotExpressionOutlet } from "../../../view/codeOutlets";
import { AnalyticConstruct, Predicates } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { DotExpressionASTNode } from "../../../ast/ast_expressions";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";








export class DotExpression extends Expression<DotExpressionASTNode> {
    public readonly construct_type = "dot_expression";

    public readonly type?: PotentiallyCompleteObjectType | FunctionType;
    public readonly valueCategory = "lvalue";

    public readonly operand: Expression;
    public readonly memberName: LexicalIdentifier;

    public readonly entity?: MemberVariableEntity | FunctionEntity;

    public static createFromAST(ast: DotExpressionASTNode, context: ExpressionContext): DotExpression {
        let operand: Expression = createExpressionFromAST(ast.operand, context);
        let receiverContext = operand.type?.isCompleteClassType() ?
            createExpressionContextWithReceiverType(context, operand.type) :
            context;
        return new DotExpression(receiverContext, ast, operand, astToIdentifier(ast.member));
    }

    public constructor(context: ExpressionContext, ast: DotExpressionASTNode, operand: Expression, memberName: LexicalIdentifier) {
        super(context, ast);

        this.attach(this.operand = operand);
        this.memberName = memberName;

        if (!Predicates.isTypedExpression(this.operand, isPotentiallyCompleteClassType)) {
            this.addNote(CPPError.expr.dot.class_type_only(this));
            return;
        }

        if (!Predicates.isTypedExpression(this.operand, isCompleteClassType)) {
            this.addNote(CPPError.expr.dot.incomplete_class_type_prohibited(this));
            return;
        }

        let classType = this.operand.type;


        let lookupResult = typeof memberName === "string"
            ? classType.classScope.lookup(memberName, { kind: "normal", noParent: true })
            : this.context.translationUnit.qualifiedLookup(memberName);
        let entityOrError = entityLookup(this, lookupResult);
        switch (entityOrError) {
            case "not_found":
                this.addNote(CPPError.expr.dot.no_such_member(this, classType, identifierToString(memberName)));
                break;
            case "ambiguous":
                this.addNote(CPPError.expr.dot.ambiguous_member(this, identifierToString(memberName)));
                break;
            case "class_found":
                this.addNote(CPPError.expr.dot.class_entity_found(this, identifierToString(memberName)));
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

    public createDefaultOutlet(this: CompiledObjectDotExpression<CompleteObjectType> | CompiledFunctionDotExpression, element: JQuery, parent?: ConstructOutlet) {
        return new DotExpressionOutlet(element, this, parent);
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

export interface TypedObjectDotExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends DotExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: MemberVariableEntity<T>;
    readonly operand: TypedExpression<CompleteClassType>;
}

export interface CompiledObjectDotExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends TypedObjectDotExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly operand: CompiledExpression<CompleteClassType>;
}

export interface TypedFunctionDotExpression<T extends FunctionType = FunctionType> extends DotExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: FunctionEntity<T>;
    readonly operand: TypedExpression<CompleteClassType>;
}

export interface CompiledFunctionDotExpression<T extends FunctionType = FunctionType> extends TypedFunctionDotExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    readonly operand: CompiledExpression<CompleteClassType>;
}

export class RuntimeObjectDotExpression<T extends CompleteObjectType = CompleteObjectType> extends RuntimeExpression<T, "lvalue", CompiledObjectDotExpression<T>> {

    readonly operand: RuntimeExpression<CompleteClassType>;

    public constructor(model: CompiledObjectDotExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
    }

    protected upNextImpl() {
        if (!this.operand.isDone) {
            this.sim.push(this.operand);
        }
        else {
            this.setEvalResult(<VCResultTypes<T, "lvalue">>this.operand.evalResult.getMemberObject(this.model.entity.name)!);
            this.startCleanup();
        }
    }

    protected stepForwardImpl(): void {
        // do nothing
    }
}

export class RuntimeFunctionDotExpression extends RuntimeExpression<FunctionType, "lvalue", CompiledFunctionDotExpression> {

    readonly operand: RuntimeExpression<CompleteClassType>;

    public constructor(model: CompiledFunctionDotExpression, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
    }

    protected upNextImpl() {
        if (!this.operand.isDone) {
            this.sim.push(this.operand);
        }
        else {
            this.setEvalResult(this.model.entity);
            this.startCleanup();
        }
    }

    protected stepForwardImpl(): void {
        // do nothing
    }

    public get contextualReceiver() {
        return this.operand.evalResult ?? super.contextualReceiver;
    }
}
