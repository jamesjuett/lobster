import { ASTNode } from "../../ast/ASTNode";
import { StorageSpecifierASTNode, StorageSpecifierKey } from "../../ast/ast_declarations";
import { asMutable } from "../../util/util";
import { SemanticContext, TranslationUnitContext } from "../contexts";
import { BasicCPPConstruct, SuccessfullyCompiled } from "../constructs";
import { CPPError } from "../errors";
import { AnalyticConstruct } from "../predicates";



export class StorageSpecifier extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    public readonly construct_type = "storage_specifier";

    public readonly register?: true;
    public readonly static?: true;
    public readonly thread_local?: true;
    public readonly extern?: true;
    public readonly mutable?: true;

    public readonly isEmpty: boolean;

    public static createFromAST(ast: StorageSpecifierASTNode, context: TranslationUnitContext) {
        return new StorageSpecifier(context, ast);

    }

    public constructor(context: TranslationUnitContext, specs: readonly StorageSpecifierKey[]) {
        super(context, undefined);

        let numSpecs = 0; // count specs separately to get a count without duplicates
        specs.forEach((spec) => {
            if (this[spec]) {
                // If it was already true, we must be processing a duplicate
                this.addNote(CPPError.declaration.storage.once(this, spec));
            }
            else {
                asMutable(this)[spec] = true;
                ++numSpecs;
            }
        });

        if (this.static) {
            this.addNote(CPPError.lobster.unsupported_feature(this, "static"));
        }

        if (this.thread_local) {
            this.addNote(CPPError.lobster.unsupported_feature(this, "thread_local"));
        }

        if (this.register) {
            this.addNote(CPPError.lobster.unsupported_feature(this, "register"));
        }

        if (this.mutable) {
            this.addNote(CPPError.lobster.unsupported_feature(this, "mutable"));
        }

        // 0 specifiers is ok
        // 1 specifier is ok
        // 2 specifiers only ok if one is thread_local and the other is static/extern
        // 3 or more specifiers are always incompatible
        if (numSpecs < 2 ||
            numSpecs == 2 && this.thread_local && (this.static || this.extern)) {
            //ok
        }
        else {
            this.addNote(CPPError.declaration.storage.incompatible(this, specs));
        }

        this.isEmpty = (numSpecs === 0);
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && this.register === other.register
            && this.static === other.static
            && this.thread_local === other.thread_local
            && this.extern === other.extern
            && this.mutable === other.mutable
            && this.isEmpty === other.isEmpty;
    }
}

export interface CompiledStorageSpecifier extends StorageSpecifier, SuccessfullyCompiled {
}
