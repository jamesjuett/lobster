import { AccessSpecifier, BaseSpecifierASTNode } from "../../../ast/ast_declarations";
import { SemanticContext, TranslationUnitContext } from "../../contexts";
import { BasicCPPConstruct, SuccessfullyCompiled } from "../../constructs";
import { areEntitiesSemanticallyEquivalent, ClassEntity, CompleteClassEntity } from "../../entities";
import { CPPError } from "../../errors";
import { astToIdentifier, checkIdentifier, identifierToString, LexicalIdentifier } from "../../lexical";
import { AnalyticConstruct } from "../../predicates";



export class BaseSpecifier extends BasicCPPConstruct<TranslationUnitContext, BaseSpecifierASTNode> {

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && this.accessLevel === other.accessLevel
            && this.virtual === other.virtual
            && areEntitiesSemanticallyEquivalent(this.baseEntity, other.baseEntity, equivalenceContext);
    }

    public readonly construct_type = "base_specifier";

    public readonly name: LexicalIdentifier;
    public readonly accessLevel: AccessSpecifier;
    public readonly virtual: boolean;
    public readonly baseEntity?: ClassEntity;

    public constructor(context: TranslationUnitContext, ast: BaseSpecifierASTNode, defaultAccessLevel: AccessSpecifier) {
        super(context, ast);
        this.name = astToIdentifier(ast.name);
        this.accessLevel = ast.access ?? defaultAccessLevel;
        this.virtual = !!ast.virtual;

        if (this.virtual) {
            this.addNote(CPPError.class_def.virtual_inheritance(this));
        }

        checkIdentifier(this, this.name, this);

        let lookupResult = typeof this.name === "string"
            ? this.context.contextualScope.lookup(this.name)
            : this.context.translationUnit.qualifiedLookup(this.name);

        if (!lookupResult) {
            this.addNote(CPPError.iden.not_found(this, identifierToString(this.name)));
        }
        else if (lookupResult.declarationKind === "class") {
            this.baseEntity = lookupResult;

            if (!this.baseEntity.type.isComplete(context)) {
                this.addNote(CPPError.class_def.base_class_incomplete(this));
            }
        }
        else {
            this.addNote(CPPError.class_def.base_class_type(this));
        }
    }

    public static createFromAST(ast: BaseSpecifierASTNode, context: TranslationUnitContext, defaultAccessLevel: AccessSpecifier) {
        return new BaseSpecifier(context, ast, defaultAccessLevel);
    }

}

export interface CompiledBaseSpecifier extends BaseSpecifier, SuccessfullyCompiled {
    readonly baseEntity: CompleteClassEntity;
}
