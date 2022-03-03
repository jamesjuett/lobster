import { AnythingConstructASTNode } from "../../../ast/ASTNode";
import { ConstructOutlet } from "../../../view/codeOutlets";
import { BlockContext, SemanticContext } from "../../compilation/contexts";
import { CPPError } from "../../compilation/errors";
import { AnalyticConstruct } from "../../../analysis/predicates";
import { Statement } from "./Statement";


export class AnythingStatement extends Statement {
    public readonly construct_type = "anything_construct";

    public constructor(context: BlockContext, ast: AnythingConstructASTNode | undefined) {
        super(context, ast);
        this.addNote(CPPError.lobster.anything_construct(this));
    }

    public createDefaultOutlet(element: JQuery, parent?: ConstructOutlet): never {
        throw new Error("Cannot create an outlet for an \"anything\" placeholder construct.");
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return true;
    }
}
