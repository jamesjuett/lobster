import { NonMemberSimpleDeclarationASTNode } from "../../../../ast/ast_declarations";
import { BlockContext } from "../../../compilation/contexts";
import { LocalObjectEntity, LocalReferenceEntity } from "../../../compilation/entities";
import { ReferenceType } from "../../../types";
import { SuccessfullyCompiled } from "../../constructs";
import { CompiledInitializer } from "../../initializers/Initializer";
import { OtherSpecifiers } from "../declarations";
import { CompiledDeclarator, Declarator, TypedDeclarator } from "../Declarator";
import { CompiledStorageSpecifier, StorageSpecifier } from "../StorageSpecifier";
import { CompiledTypeSpecifier, TypeSpecifier } from "../TypeSpecifier";
import { VariableDefinitionBase, VariableDefinitionType } from "./VariableDefinitionBase";

// interface CompiledVariableDefinitionBase<ContextType extends TranslationUnitContext = TranslationUnitContext, T extends ObjectType | ReferenceType = ObjectType | ReferenceType> extends VariableDefinitionBase<ContextType>, SuccessfullyCompiled {
//     readonly typeSpecifier: CompiledTypeSpecifier;
//     readonly storageSpecifier: CompiledStorageSpecifier;
//     readonly declarator: CompiledDeclarator<T>;
//     readonly declaredEntity: VariableEntity<NoRefType<T>>;
//     readonly initializer?: CompiledInitializer<NoRefType<T>>;
// }


export class LocalVariableDefinition extends VariableDefinitionBase<BlockContext> {

    public readonly construct_type = "local_variable_definition";

    public readonly type: VariableDefinitionType;
    public readonly declaredEntity: LocalObjectEntity | LocalReferenceEntity;

    // public static predicate() : (decl: LocalVariableDefinition) => decl is TypedLocalVariableDefinition<T> {
    //     return <(decl: CPPConstruct) => decl is TypedLocalVariableDefinition<T>>((decl) => decl instanceof LocalVariableDefinition);
    // }
    // public static typedPredicate<T extends VariableDefinitionType>(typePredicate: (o: VariableDefinitionType) => o is T) {
    //     return <(decl: CPPConstruct) => decl is TypedLocalVariableDefinition<T>>((decl) => decl instanceof LocalVariableDefinition && !!decl.type && !!decl.declaredEntity && typePredicate(decl.type));
    // }
    public constructor(context: BlockContext, ast: NonMemberSimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers, type: VariableDefinitionType) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        this.type = type;

        this.declaredEntity =
            type.isReferenceType() ? new LocalReferenceEntity(type, this) : new LocalObjectEntity(type, this);


        // Note extern unsupported error is added in the base Declaration class, so no need to add here
        // All local declarations are also definitions, with the exception of a local declaration of a function
        // or a local declaration with the extern storage specifier, but those are not currently supported by Lobster.
        // This means a locally declared variable does not have linkage, and we don't need to do any linking stuff here.
        // Attempt to add the declared entity to the scope. If it fails, note the error.
        let entityOrError = context.contextualScope.declareVariableEntity(this.declaredEntity);

        if (entityOrError instanceof LocalObjectEntity || entityOrError instanceof LocalReferenceEntity) {
            this.declaredEntity = entityOrError;
            context.blockLocals.registerLocalVariable(this.declaredEntity);
            context.functionLocals.registerLocalVariable(this.declaredEntity);
        }
        else {
            this.addNote(entityOrError);
        }
    }


}

export interface TypedLocalVariableDefinition<T extends VariableDefinitionType> extends LocalVariableDefinition {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
    readonly declaredEntity: LocalObjectEntity<Exclude<T, ReferenceType>> | LocalReferenceEntity<Extract<T, ReferenceType>>;
}

export interface CompiledLocalVariableDefinition<T extends VariableDefinitionType = VariableDefinitionType> extends TypedLocalVariableDefinition<T>, SuccessfullyCompiled {

    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly storageSpecifier: CompiledStorageSpecifier;
    readonly declarator: CompiledDeclarator<T>;

    readonly initializer?: CompiledInitializer<T>;
}
