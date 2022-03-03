import { MemberSimpleDeclarationASTNode } from "../../../ast/ast_declarations";
import { MemberSpecificationContext, SemanticContext, TranslationUnitContext } from "../../contexts";
import { CPPError } from "../../errors";
import { AnalyticConstruct } from "../../predicates";
import { IncompleteObjectType, sameType } from "../../types";
import { StorageSpecifier } from "../StorageSpecifier";
import { TypeSpecifier } from "../TypeSpecifier";
import { SimpleDeclaration } from "../SimpleDeclaration";
import { Declarator, TypedDeclarator } from "../Declarator";
import { OtherSpecifiers } from "../declarations";

/**
 * This class represents a declaration of a member variable with incomplete type. Such a declaration is
 * ill-formed, because necessary details (such as object size) are missing from an incomplete type.
 * As such, this class always compiles with an error and does not create any entities. In effect,
 * the attempted declaration of such a member variable is acknowledged, but the member variable
 * is otherwise ignored as if it was never declared.
 */


export class IncompleteTypeMemberVariableDeclaration extends SimpleDeclaration<TranslationUnitContext> {

    public readonly construct_type = "incomplete_type_member_variable_declaration";

    public readonly type: IncompleteObjectType;
    public readonly declaredEntity: undefined;

    public constructor(context: MemberSpecificationContext, ast: MemberSimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers, type: IncompleteObjectType) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        this.type = type;

        this.addNote(CPPError.declaration.member.incomplete_type_declaration_prohibited(this));
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && sameType(this.type, other.type);
    }
}

export interface TypedIncompleteTypeMemberVariableDeclaration<T extends IncompleteObjectType> extends IncompleteTypeMemberVariableDeclaration {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
}
