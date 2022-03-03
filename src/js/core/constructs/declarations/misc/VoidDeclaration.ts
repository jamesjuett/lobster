import { SimpleDeclarationASTNode } from "../../../../ast/ast_declarations";
import { SemanticContext, TranslationUnitContext } from "../../../compilation/contexts";
import { CPPError } from "../../../compilation/errors";
import { AnalyticConstruct } from "../../../predicates";
import { VoidType } from "../../../types";
import { OtherSpecifiers } from "../declarations";
import { Declarator } from "../Declarator";
import { SimpleDeclaration } from "../SimpleDeclaration";
import { StorageSpecifier } from "../StorageSpecifier";
import { TypeSpecifier } from "../TypeSpecifier";


export class VoidDeclaration extends SimpleDeclaration {
    public readonly construct_type = "void_declaration";

    public readonly type = VoidType.VOID;
    public readonly declaredEntity: undefined;

    public constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);
        this.addNote(CPPError.declaration.void_prohibited(this));
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type;
    }
}
