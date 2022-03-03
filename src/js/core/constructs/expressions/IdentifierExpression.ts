import { AnalyticConstruct } from "../../../analysis/predicates";
import { IdentifierExpressionASTNode } from "../../../ast/ast_expressions";
import { ConstructOutlet, IdentifierOutlet } from "../../../view/codeOutlets";
import { ConstructDescription, ExpressionContext, SemanticContext } from "../../compilation/contexts";
import { areEntitiesSemanticallyEquivalent, FunctionEntity, GlobalVariableEntity, LocalVariableEntity, MemberVariableEntity, runtimeObjectLookup } from "../../compilation/entities";
import { entityLookup } from "./entityLookup";
import { CPPError } from "../../compilation/errors";
import { astToIdentifier, checkIdentifier, identifierToString, LexicalIdentifier } from "../../compilation/lexical";
import { CompleteObjectType, FunctionType, peelReference, PotentiallyCompleteObjectType } from "../../compilation/types";
import { RuntimeConstruct, SuccessfullyCompiled } from "../constructs";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { Expression, TypedExpression, t_TypedExpression, VCResultTypes } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";

// TODO: maybe Identifier should be a non-executable construct and then have a 
// TODO: make separate classes for qualified and unqualified IDs?



export class IdentifierExpression extends Expression<IdentifierExpressionASTNode> {
    public readonly construct_type = "identifier_expression";

    public readonly type?: PotentiallyCompleteObjectType | FunctionType;
    public readonly valueCategory = "lvalue";

    public readonly name: LexicalIdentifier;

    public readonly entity?: LocalVariableEntity | GlobalVariableEntity | MemberVariableEntity | FunctionEntity;

    // i_createFromAST: function(ast, context){
    //     Identifier._parent.i_createFromAST.apply(this, arguments);
    //     this.identifier = this.ast.identifier;
    //     this.identifierText = qualifiedNameString(this.identifier);
    // },
    public constructor(context: ExpressionContext, ast: IdentifierExpressionASTNode | undefined, name: LexicalIdentifier) {
        super(context, ast);
        this.name = name;

        checkIdentifier(this, name, this);

        let lookupResult = typeof this.name === "string"
            ? this.context.contextualScope.lookup(this.name)
            : this.context.translationUnit.qualifiedLookup(this.name);
        let entityOrError = entityLookup(this, lookupResult);
        switch (entityOrError) {
            case "not_found":
                this.addNote(CPPError.iden.not_found(this, identifierToString(this.name)));
                break;
            case "ambiguous":
                this.addNote(CPPError.iden.ambiguous(this, identifierToString(this.name)));
                break;
            case "class_found":
                this.addNote(CPPError.iden.class_entity_found(this, identifierToString(this.name)));
                break;
            default:
                this.entity = entityOrError;
        }

        // Check if this is an implicit member access operation
        if (this.entity?.declarationKind === "variable"
            && this.entity.variableLocation === "member"
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

    public static createFromAST(ast: IdentifierExpressionASTNode, context: ExpressionContext) {
        return new IdentifierExpression(context, ast, astToIdentifier(ast.identifier));
    }


    public getEntity<T extends CompleteObjectType>(this: TypedExpression<T>): LocalVariableEntity<T> | GlobalVariableEntity<T> | MemberVariableEntity<T>;
    public getEntity<T extends FunctionType>(this: TypedExpression<T>): FunctionEntity<T>;
    public getEntity() {
        return this.entity;
    }

    public createDefaultOutlet(this: CompiledObjectIdentifierExpression<CompleteObjectType> | CompiledFunctionIdentifierExpression, element: JQuery, parent?: ConstructOutlet) {
        return new IdentifierOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

    // describeEvalResult : function(depth, sim, inst){
    //     if (inst && inst.evalResult){
    //         return inst.evalResult.describe();
    //     }
    //     // Note don't care about depth since we always just use identifier
    //     else{
    //         return this.entity.describe(sim, inst);
    //     }
    // },
    // explain : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
    //     return {message: this.entity.name};
    // }
    public entitiesUsed() {
        return this.entity ? [this.entity] : [];
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && areEntitiesSemanticallyEquivalent(this.entity, other.entity, ec);
    }
}


export interface TypedObjectIdentifierExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends IdentifierExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: LocalVariableEntity<T> | GlobalVariableEntity<T> | MemberVariableEntity<T>;
}

export interface CompiledObjectIdentifierExpression<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> extends TypedObjectIdentifierExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export interface TypedFunctionIdentifierExpression<T extends FunctionType = FunctionType> extends IdentifierExpression, t_TypedExpression {
    readonly type: T;
    readonly entity: FunctionEntity<T>;
}

export interface CompiledFunctionIdentifierExpression<T extends FunctionType = FunctionType> extends TypedFunctionIdentifierExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export class RuntimeObjectIdentifierExpression<T extends CompleteObjectType = CompleteObjectType> extends RuntimeExpression<T, "lvalue", CompiledObjectIdentifierExpression<T>> {

    public constructor(model: CompiledObjectIdentifierExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
    }

    protected upNextImpl() {
        this.setEvalResult(<VCResultTypes<T, "lvalue">>runtimeObjectLookup(this.model.entity, this));
        this.startCleanup();
    }

    protected stepForwardImpl(): void {
        // do nothing
    }
}

export class RuntimeFunctionIdentifierExpression extends RuntimeExpression<FunctionType, "lvalue", CompiledFunctionIdentifierExpression> {

    public constructor(model: CompiledFunctionIdentifierExpression, parent: RuntimeConstruct) {
        super(model, parent);
    }

    protected upNextImpl() {
        this.setEvalResult(this.model.entity);
        this.startCleanup();
    }

    protected stepForwardImpl(): void {
        // do nothing
    }
}
