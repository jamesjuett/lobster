import { SimpleDeclarationASTNode } from "../../../ast/ast_declarations";
import { SemanticContext, TranslationUnitContext } from "../../contexts";
import { CPPError } from "../../errors";
import { AnalyticConstruct } from "../../predicates";
import { StorageSpecifier } from "../StorageSpecifier";
import { TypeSpecifier } from "../TypeSpecifier";
import { SimpleDeclaration } from "../SimpleDeclaration";
import { OtherSpecifiers } from "../declarations";
import { Declarator } from "../Declarator";


export class TypedefDeclaration extends SimpleDeclaration {
    public readonly construct_type = "typedef_declaration";

    public readonly type: undefined; // will change when typedef is implemented
    public readonly declaredEntity: undefined;

    public constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);
        this.addNote(CPPError.lobster.unsupported_feature(this, "typedef"));


        // ADD THIS BACK IN WHEN TYPEDEFS ARE SUPPORTED
        // if (this.storageSpecifier.numSpecs > 0 && this.isTypedef) {
        //     this.addNote(CPPError.declaration.storage.typedef(this, this.storageSpec.ast))
        // }
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type;
    }

}
