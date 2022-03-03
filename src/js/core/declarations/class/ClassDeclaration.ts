import { ASTNode } from "../../../ast/ASTNode";
import { ClassKey } from "../../../ast/ast_declarations";
import { SemanticContext, TranslationUnitContext } from "../../contexts";
import { BasicCPPConstruct, SuccessfullyCompiled } from "../../constructs";
import { ClassEntity } from "../../entities";
import { getQualifiedName, getUnqualifiedName, LexicalIdentifier, QualifiedName } from "../../lexical";
import { AnalyticConstruct } from "../../predicates";
import { PotentiallyCompleteClassType } from "../../types";



export class ClassDeclaration extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    public readonly construct_type = "class_declaration";

    public readonly name: string;
    public readonly qualifiedName: QualifiedName;
    public readonly key: ClassKey;
    public readonly type: PotentiallyCompleteClassType;
    public readonly declaredEntity: ClassEntity;
    // public readonly isDuplicateDeclaration: boolean = false;
    public constructor(context: TranslationUnitContext, name: LexicalIdentifier, key: ClassKey) {
        super(context, undefined);

        this.name = getUnqualifiedName(name);
        this.qualifiedName = getQualifiedName(name);
        this.key = key;

        this.declaredEntity = new ClassEntity(this);

        let entityOrError = context.contextualScope.declareClassEntity(this.declaredEntity);

        if (entityOrError instanceof ClassEntity) {
            // if (entityOrError !== this.declaredEntity) {
            //     this.isDuplicateDeclaration = true;
            // }
            this.declaredEntity = entityOrError;
        }
        else {
            this.addNote(entityOrError);
        }


        this.type = this.declaredEntity.type;
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type;
        // TODO: semantic equivalence
    }
}

export interface TypedClassDeclaration<T extends PotentiallyCompleteClassType> extends ClassDeclaration, SuccessfullyCompiled {
    readonly type: T;
}

export interface CompiledClassDeclaration<T extends PotentiallyCompleteClassType = PotentiallyCompleteClassType> extends TypedClassDeclaration<T>, SuccessfullyCompiled {
}
