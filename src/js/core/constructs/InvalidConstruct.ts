import { ASTNode } from "../../ast/ASTNode";
import { SemanticContext, TranslationUnitContext } from "../compilation/contexts";
import { Note } from "../compilation/errors";
import { AnalyticConstruct } from "../../analysis/predicates";
import { CPPConstruct } from "./CPPConstruct";
import { BasicCPPConstruct } from "./BasicCPPConstruct";


export class InvalidConstruct extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    public readonly construct_type = "invalid_construct";

    public readonly note: Note;
    public readonly type: undefined;

    public constructor(context: TranslationUnitContext, ast: ASTNode | undefined, errorFn: (construct: CPPConstruct) => Note, children?: readonly CPPConstruct[]) {
        super(context, ast);
        this.addNote(this.note = errorFn(this));
        children?.forEach(child => this.attach(child));
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && other.note.id === this.note.id
            && this.areChildrenSemanticallyEquivalent(other, equivalenceContext);
    }
}
