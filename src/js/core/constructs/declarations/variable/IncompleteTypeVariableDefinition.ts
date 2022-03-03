import { NonMemberSimpleDeclarationASTNode } from "../../../../ast/ast_declarations";
import { SemanticContext, TranslationUnitContext } from "../../../compilation/contexts";
import { CPPError } from "../../../compilation/errors";
import { AnalyticConstruct } from "../../../predicates";
import { IncompleteObjectType, sameType } from "../../../types";
import { OtherSpecifiers } from "../declarations";
import { Declarator, TypedDeclarator } from "../Declarator";
import { SimpleDeclaration } from "../SimpleDeclaration";
import { StorageSpecifier } from "../StorageSpecifier";
import { TypeSpecifier } from "../TypeSpecifier";

/**
 * This class represents a definition of a variable with incomplete type. Such a definition is
 * ill-formed, because necessary details (such as object size) are missing from an incomplete type.
 * As such, this class always compiles with an error and does not create any entities. In effect,
 * the attempted definition of such a variable is acknowledged, but the variable is otherwise ignored
 * as if it was never declared.
 */


export class IncompleteTypeVariableDefinition extends SimpleDeclaration<TranslationUnitContext> {

    public readonly construct_type = "incomplete_type_variable_definition";

    public readonly type: IncompleteObjectType;
    public readonly declaredEntity: undefined;

    public constructor(context: TranslationUnitContext, ast: NonMemberSimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers, type: IncompleteObjectType) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        this.type = type;

        this.addNote(CPPError.declaration.incomplete_type_definition_prohibited(this));
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && sameType(this.type, other.type);
    }
}

export interface TypedIncompleteTypeVariableDefinition<T extends IncompleteObjectType> extends IncompleteTypeVariableDefinition {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
}
