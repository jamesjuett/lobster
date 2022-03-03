import { NonMemberSimpleDeclarationASTNode } from "../../../../ast/ast_declarations";
import { assert } from "../../../../util/util";
import { TranslationUnitContext } from "../../../compilation/contexts";
import { GlobalObjectEntity } from "../../../compilation/entities";
import { CPPError } from "../../../compilation/errors";
import { getQualifiedName, QualifiedName } from "../../../compilation/lexical";
import { CompleteObjectType, ReferenceType } from "../../../compilation/types";
import { SuccessfullyCompiled } from "../../constructs";
import { CompiledInitializer } from "../../initializers/Initializer";
import { OtherSpecifiers } from "../declarations";
import { CompiledDeclarator, Declarator, TypedDeclarator } from "../Declarator";
import { CompiledStorageSpecifier, StorageSpecifier } from "../StorageSpecifier";
import { CompiledTypeSpecifier, TypeSpecifier } from "../TypeSpecifier";
import { VariableDefinitionBase, VariableDefinitionType } from "./VariableDefinitionBase";



export class GlobalVariableDefinition extends VariableDefinitionBase<TranslationUnitContext> {

    public readonly construct_type = "global_variable_definition";

    public readonly type: VariableDefinitionType;
    public readonly declaredEntity!: GlobalObjectEntity<CompleteObjectType>; // TODO definite assignment assertion can be removed when global references are supported

    public readonly qualifiedName: QualifiedName;

    public constructor(context: TranslationUnitContext, ast: NonMemberSimpleDeclarationASTNode | undefined, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers, type: VariableDefinitionType) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        this.type = type;
        assert(declarator.name);
        this.qualifiedName = getQualifiedName(declarator.name);

        if (type.isReferenceType()) {
            this.addNote(CPPError.lobster.unsupported_feature(this, "globally scoped references"));
            return;
        }

        this.declaredEntity = new GlobalObjectEntity(type, this);

        let entityOrError = context.contextualScope.declareVariableEntity(this.declaredEntity);

        if (entityOrError instanceof GlobalObjectEntity) {
            this.declaredEntity = entityOrError;
            this.context.translationUnit.program.registerGlobalObjectDefinition(this.declaredEntity.qualifiedName, this);
        }
        else {
            this.addNote(entityOrError);
        }

    }

}

export interface TypedGlobalVariableDefinition<T extends VariableDefinitionType> extends GlobalVariableDefinition {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
    readonly declaredEntity: GlobalObjectEntity<Exclude<T, ReferenceType>>;
}

export interface CompiledGlobalVariableDefinition<T extends VariableDefinitionType = VariableDefinitionType> extends TypedGlobalVariableDefinition<T>, SuccessfullyCompiled {

    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly storageSpecifier: CompiledStorageSpecifier;
    readonly declarator: CompiledDeclarator<T>;

    readonly initializer?: CompiledInitializer<Exclude<T, ReferenceType>>;
}
