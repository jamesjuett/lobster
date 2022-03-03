import { SimpleDeclarationASTNode } from "../../../ast/ast_declarations";
import { SemanticContext, TranslationUnitContext } from "../../contexts";
import { CPPError } from "../../errors";
import { AnalyticConstruct } from "../../predicates";
import { ArrayOfUnknownBoundType } from "../../types";
import { StorageSpecifier } from "../StorageSpecifier";
import { TypeSpecifier } from "../TypeSpecifier";
import { SimpleDeclaration } from "../SimpleDeclaration";
import { OtherSpecifiers } from "../declarations";
import { Declarator } from "../Declarator";


export class UnknownBoundArrayDeclaration extends SimpleDeclaration {
    public readonly construct_type = "unknown_array_bound_declaration";

    public readonly type: ArrayOfUnknownBoundType;
    public readonly declaredEntity: undefined;

    public constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers, type: ArrayOfUnknownBoundType) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        this.type = type;
        this.addNote(CPPError.declaration.array.length_required(this));
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type;
    }
}

export interface TypedUnknownBoundArrayDeclaration<T extends ArrayOfUnknownBoundType> extends UnknownBoundArrayDeclaration {
    readonly type: T;
}
