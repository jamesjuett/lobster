import { NonMemberSimpleDeclarationASTNode } from "../../../ast/ast_declarations";
import { assert } from "../../../util/util";
import { TranslationUnitContext } from "../../contexts";
import { SuccessfullyCompiled } from "../../constructs";
import { GlobalObjectEntity } from "../../entities";
import { CPPError } from "../../errors";
import { CompiledInitializer } from "../../initializers";
import { getQualifiedName, QualifiedName } from "../../lexical";
import { CompleteObjectType, ReferenceType } from "../../types";
import { StorageSpecifier, CompiledStorageSpecifier } from "../StorageSpecifier";
import { TypeSpecifier, CompiledTypeSpecifier } from "../TypeSpecifier";
import { VariableDefinitionBase, VariableDefinitionType } from "./VariableDefinitionBase";
import { OtherSpecifiers } from "../declarations";
import { Declarator, TypedDeclarator, CompiledDeclarator } from "../Declarator";



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
