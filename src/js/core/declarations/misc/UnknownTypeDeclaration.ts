import { MemberSimpleDeclarationASTNode, SimpleDeclarationASTNode } from "../../../ast/ast_declarations";
import { SemanticContext, TranslationUnitContext } from "../../contexts";
import { CPPError } from "../../errors";
import { AnalyticConstruct } from "../../predicates";
import { StorageSpecifier } from "../StorageSpecifier";
import { TypeSpecifier } from "../TypeSpecifier";
import { SimpleDeclaration } from "../SimpleDeclaration";
import { OtherSpecifiers } from "../declarations";
import { Declarator } from "../Declarator";


export class UnknownTypeDeclaration extends SimpleDeclaration {
    public readonly construct_type = "unknown_type_declaration";

    public readonly type: undefined;
    public readonly declaredEntity: undefined;

    public constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode | MemberSimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        // Add an error, but only if the declarator doesn't have one for some reason.
        // It should already have one, assuming that's why there's no type.
        // This will probably never be used.
        if (!declarator.getContainedNotes().hasErrors) {
            this.addNote(CPPError.declaration.unknown_type(this));
        }
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type;
    }

}
