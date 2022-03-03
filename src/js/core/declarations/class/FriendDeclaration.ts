import { SimpleDeclarationASTNode } from "../../../ast/ast_declarations";
import { SemanticContext, TranslationUnitContext } from "../../contexts";
import { CPPError } from "../../errors";
import { AnalyticConstruct } from "../../predicates";
import { StorageSpecifier } from "../StorageSpecifier";
import { TypeSpecifier } from "../TypeSpecifier";
import { SimpleDeclaration } from "../SimpleDeclaration";
import { OtherSpecifiers } from "../declarations";
import { Declarator } from "../Declarator";


export class FriendDeclaration extends SimpleDeclaration {
    public readonly construct_type = "friend_declaration";

    public readonly type: undefined; // will change when friend is implemented
    public readonly declaredEntity: undefined;

    public constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);
        this.addNote(CPPError.lobster.unsupported_feature(this, "friend"));

        // TODO: Add back in when classes are supported
        // if (!(this.contextualScope instanceof ClassScope)) {
        //     this.addNote(CPPError.declaration.friend.outside_class(this));
        // }
        if (otherSpecs.virtual) {
            this.addNote(CPPError.declaration.friend.virtual_prohibited(this));
        }
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type;
    }

}
