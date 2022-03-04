import { ParameterDeclarationASTNode } from "../../../../ast/ast_declarations";
import { Mutable } from "../../../../util/util";
import { BlockContext, SemanticContext, TranslationUnitContext } from "../../../compilation/contexts";
import { areEntitiesSemanticallyEquivalent, LocalObjectEntity, LocalReferenceEntity } from "../../../compilation/entities";
import { CPPError } from "../../../compilation/errors";
import { getUnqualifiedName, isQualifiedName } from "../../../compilation/lexical";
import { AnalyticConstruct } from "../../../../analysis/predicates";
import { PotentialParameterType } from "../../../compilation/types";
import { SuccessfullyCompiled } from "../../CPPConstruct";
import { BasicCPPConstruct } from "../../BasicCPPConstruct";
import { OtherSpecifiers } from "../declarations";
import { CompiledDeclarator, Declarator, TypedDeclarator } from "../Declarator";
import { CompiledStorageSpecifier, StorageSpecifier } from "../StorageSpecifier";
import { CompiledTypeSpecifier, TypeSpecifier } from "../TypeSpecifier";
import { ParameterDefinition } from "./ParameterDefinition";

/**
 * ParameterDeclarations are a bit different than other declarations because
 * they do not introduce an entity into their contextual scope. For example,
 * in the context of a function declaration that contains several parameter
 * declarations, there is no function body (as there would be for a function
 * definition) into whose scope the entities would even be introduced.
 * This contrasts to ParameterDefinitions that may introduce an entity.
 */


export class ParameterDeclaration extends BasicCPPConstruct<TranslationUnitContext, ParameterDeclarationASTNode> {

    public readonly construct_type = "parameter_declaration";

    public readonly typeSpecifier: TypeSpecifier;
    public readonly storageSpecifier: StorageSpecifier;
    public readonly declarator: Declarator;
    public readonly otherSpecifiers: OtherSpecifiers;

    public readonly name?: string; // parameter declarations need not provide a name
    public readonly type?: PotentialParameterType;
    public readonly declaredEntity?: LocalObjectEntity | LocalReferenceEntity;

    public constructor(context: TranslationUnitContext, ast: ParameterDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, ast);

        this.attach(this.typeSpecifier = typeSpec);
        this.attach(this.storageSpecifier = storageSpec);
        this.attach(this.declarator = declarator);
        this.otherSpecifiers = otherSpecs;

        this.name = declarator.name && getUnqualifiedName(declarator.name);

        if (declarator.name && isQualifiedName(declarator.name)) {
            storageSpec.addNote(CPPError.declaration.parameter.storage_prohibited(storageSpec));
        }

        if (!storageSpec.isEmpty) {
            storageSpec.addNote(CPPError.declaration.parameter.storage_prohibited(storageSpec));
        }

        let type = declarator.type;

        if (type?.isPotentiallyCompleteArrayType()) {
            type = type.adjustToPointerType();
        }

        if (type && !type.isPotentialParameterType()) {
            this.addNote(CPPError.declaration.parameter.invalid_parameter_type(this, type));
            return;
        }

        this.type = type;

        if (this.isPotentialParameterDefinition()) {
            (<Mutable<this>>this).declaredEntity =
                this.type.isReferenceType() ? new LocalReferenceEntity(this.type, this, true) :
                    new LocalObjectEntity(this.type, this, true);
        }

    }

    public static createFromAST(ast: ParameterDeclarationASTNode, context: TranslationUnitContext): ParameterDeclaration {

        let storageSpec = StorageSpecifier.createFromAST(ast.specs.storageSpecs, context);

        // Need to create TypeSpecifier first to get the base type first for the declarators
        let typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs, context);

        // Compile declarator for each parameter (of the function-type argument itself)
        let declarator = Declarator.createFromAST(ast.declarator, context, typeSpec.baseType);

        return new ParameterDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
    }

    public isPotentialParameterDefinition(): this is ParameterDefinition {
        return !!this.name && !!this.type && this.type.isPotentialParameterType();
    }

    public addEntityToScope(this: ParameterDefinition, context: BlockContext) {
        // If there's no type, we can't introduce an entity. If there's no name, we don't either.
        // A parameter in a function definition with no name is technically allowed (e.g. this may
        // indicate the programmer intends not to use the parameter in the function implementation).

        // Attempt to add the declared entity to the scope. If it fails, note the error.
        let entityOrError = context.contextualScope.declareVariableEntity(this.declaredEntity);

        if (entityOrError instanceof LocalObjectEntity || entityOrError instanceof LocalReferenceEntity) {
            (<Mutable<ParameterDefinition>>this).declaredEntity = entityOrError;
            context.blockLocals.registerLocalVariable(this.declaredEntity);
            context.functionLocals.registerLocalVariable(this.declaredEntity);
        }
        else {
            this.addNote(entityOrError);
        }
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && areEntitiesSemanticallyEquivalent(this.declaredEntity, other.declaredEntity, equivalenceContext);
    }
}

export interface TypedParameterDeclaration<T extends PotentialParameterType = PotentialParameterType> extends ParameterDeclaration {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
}

export interface CompiledParameterDeclaration<T extends PotentialParameterType = PotentialParameterType> extends TypedParameterDeclaration<T>, SuccessfullyCompiled {
    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly storageSpecifier: CompiledStorageSpecifier;
    readonly declarator: CompiledDeclarator<T>;

}
