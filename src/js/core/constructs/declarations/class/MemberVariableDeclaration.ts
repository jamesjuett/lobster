import { MemberSimpleDeclarationASTNode } from "../../../../ast/ast_declarations";
import { MemberSpecificationContext, SemanticContext } from "../../../compilation/contexts";
import { MemberObjectEntity, MemberReferenceEntity, MemberVariableEntity, ObjectEntityType } from "../../../compilation/entities";
import { CPPError } from "../../../compilation/errors";
import { AnalyticConstruct } from "../../../../analysis/predicates";
import { CompleteObjectType, ReferenceType } from "../../../compilation/types";
import { SuccessfullyCompiled } from "../../CPPConstruct";
import { DefaultInitializer } from "../../initializers/DefaultInitializer";
import { CompiledInitializer, Initializer } from "../../initializers/Initializer";
import { OtherSpecifiers } from "../declarations";
import { CompiledDeclarator, Declarator, TypedDeclarator } from "../Declarator";
import { CompiledStorageSpecifier, StorageSpecifier } from "../StorageSpecifier";
import { CompiledTypeSpecifier, TypeSpecifier } from "../TypeSpecifier";
import { VariableDefinitionBase } from "../variable/VariableDefinitionBase";



export class MemberVariableDeclaration extends VariableDefinitionBase<MemberSpecificationContext> {

    public readonly construct_type = "member_variable_declaration";

    public readonly type: CompleteObjectType | ReferenceType;
    public readonly declaredEntity: MemberVariableEntity;

    public constructor(context: MemberSpecificationContext, ast: MemberSimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers, type: CompleteObjectType | ReferenceType) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        this.type = type;

        this.declaredEntity =
            type.isReferenceType() ? new MemberReferenceEntity(type, this) : new MemberObjectEntity(type, this);

        // Attempt to add the declared entity to the scope. If it fails, note the error.
        let entityOrError = context.contextualScope.declareVariableEntity(this.declaredEntity);

        if (entityOrError instanceof MemberObjectEntity || entityOrError instanceof MemberReferenceEntity) {
            this.declaredEntity = entityOrError;

            // No need to "register" the member declaration here as we might "register" a local
            // variable definition with its containing function, since they will be accounted
            // for when the class definition is created from the list of member declarations
        }
        else {
            this.addNote(entityOrError);
        }
    }

    protected initializerWasSet(init: Initializer) {
        // Default initializers are allowed
        if (!(init instanceof DefaultInitializer)) {
            this.addNote(CPPError.lobster.unsupported_feature(this, "member variable initializers"));
        }
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type;
        // TODO semantic equivalence
    }
}

export interface TypedMemberVariableDeclaration<T extends ObjectEntityType> extends MemberVariableDeclaration {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
    readonly declaredEntity: MemberObjectEntity<Exclude<T, ReferenceType>> | MemberReferenceEntity<Extract<T, ReferenceType>>;
}

export interface CompiledMemberVariableDeclaration<T extends ObjectEntityType = ObjectEntityType> extends TypedMemberVariableDeclaration<T>, SuccessfullyCompiled {

    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly storageSpecifier: CompiledStorageSpecifier;
    readonly declarator: CompiledDeclarator<T>;

    readonly initializer?: CompiledInitializer<T>;
}
