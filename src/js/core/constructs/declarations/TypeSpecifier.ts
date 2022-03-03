import { ASTNode } from "../../../ast/ASTNode";
import { TypeSpecifierASTNode, TypeSpecifierKey } from "../../../ast/ast_declarations";
import { asMutable } from "../../../util/util";
import { SemanticContext, TranslationUnitContext } from "../../compilation/contexts";
import { CPPError } from "../../compilation/errors";
import { AnalyticConstruct } from "../../predicates";
import { builtInTypes, isBuiltInTypeName, sameType, Type } from "../../types";
import { BasicCPPConstruct, SuccessfullyCompiled } from "../constructs";



export class TypeSpecifier extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    public readonly construct_type = "type_specifier";

    public readonly const?: true;
    public readonly volatile?: true;
    public readonly signed?: true;
    public readonly unsigned?: true;
    public readonly enum?: true;

    public readonly typeName?: string;

    public readonly baseType?: Type;


    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && this.const === other.const
            && this.volatile === other.volatile
            && this.signed === other.signed
            && this.unsigned === other.unsigned
            && this.enum === other.enum
            && this.typeName === other.typeName
            && sameType(this.baseType, other.baseType);
    }

    public static createFromAST(ast: TypeSpecifierASTNode, context: TranslationUnitContext) {
        return new TypeSpecifier(context, ast);

    }

    public constructor(context: TranslationUnitContext, specs: TypeSpecifierASTNode) {
        super(context, undefined);

        let constCount = 0;
        let volatileCount = 0;

        specs.forEach((spec) => {

            if (spec instanceof Object && spec.construct_type === "elaborated_type_specifier") {
                this.addNote(CPPError.lobster.unsupported_feature(this, "class declarations or elaborated type specifiers"));
                return;
            }

            if (spec instanceof Object && spec.construct_type === "class_definition") {
                this.addNote(CPPError.lobster.unsupported_feature(this, "inline class definitions"));
                return;
            }

            if (spec === "enum") {
                asMutable(this).enum = true;
                this.addNote(CPPError.lobster.unsupported_feature(this, "mutable"));
                return;
            }

            // check to see if it's one of the possible type specifiers
            let possibleSpecs: readonly TypeSpecifierKey[] = ["const", "volatile", "signed", "unsigned", "enum"];
            let matchedSpec = possibleSpecs.find(s => s === spec);

            if (matchedSpec) { // found a type specifier
                if (this[matchedSpec]) {
                    // it was a duplicate
                    this.addNote(CPPError.declaration.typeSpecifier.once(this, matchedSpec));
                }
                else {
                    // first time this spec seen, set to true
                    asMutable(this)[matchedSpec] = true;
                }
            }
            else { // It's a typename
                if (this.typeName) { // already had a typename, this is a duplicate
                    this.addNote(CPPError.declaration.typeSpecifier.one_type(this, [this.typeName, spec]));
                }
                else {
                    asMutable(this).typeName = spec;
                }
            }
        });

        if (this.unsigned && this.signed) {
            this.addNote(CPPError.declaration.typeSpecifier.signed_unsigned(this));
        }

        // If unsigned/signed specifier is present and there is no type name, default to int
        if ((this.unsigned || this.signed) && !this.typeName) {
            this.typeName = "int";
        }

        // If we don't have a typeName by now, it means the declaration didn't specify a type.
        if (!this.typeName) {
            return;
        }

        // Check to see if type name is one of the built in types
        if (this.typeName && isBuiltInTypeName(this.typeName)) {
            asMutable(this).baseType = new builtInTypes[this.typeName](this.const, this.volatile);
            return;
        }

        // Otherwise, check to see if the type name is in scope
        let customType = this.context.contextualScope.lookup(this.typeName);
        if (customType?.declarationKind === "class") {
            asMutable(this).baseType = customType.type.cvQualified(this.const, this.volatile);
            return;
        }

        this.addNote(CPPError.type.typeNotFound(this, this.typeName));
    }
}
;

export interface CompiledTypeSpecifier<BaseType extends Type = Type> extends TypeSpecifier, SuccessfullyCompiled {
    readonly baseType?: BaseType;
}
