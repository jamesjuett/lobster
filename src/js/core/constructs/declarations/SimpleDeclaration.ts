import { SimpleDeclarationASTNode } from "../../../ast/ast_declarations";
import { assert } from "../../../util/util";
import { isClassContext, TranslationUnitContext } from "../../compilation/contexts";
import { CPPEntity } from "../../compilation/entities";
import { CPPError } from "../../compilation/errors";
import { getUnqualifiedName, isQualifiedName } from "../../compilation/lexical";
import { Type } from "../../compilation/types";
import { SuccessfullyCompiled } from "../CPPConstruct";
import { BasicCPPConstruct } from "../BasicCPPConstruct";
import { CompiledInitializer, Initializer } from "../initializers/Initializer";
import { OtherSpecifiers } from "./declarations";
import { CompiledDeclarator, Declarator } from "./Declarator";
import { CompiledStorageSpecifier, StorageSpecifier } from "./StorageSpecifier";
import { CompiledTypeSpecifier, TypeSpecifier } from "./TypeSpecifier";


export abstract class SimpleDeclaration<ContextType extends TranslationUnitContext = TranslationUnitContext> extends BasicCPPConstruct<ContextType, SimpleDeclarationASTNode> {
    // public readonly construct_type = "simple_declaration";
    public readonly typeSpecifier: TypeSpecifier;
    public readonly storageSpecifier: StorageSpecifier;
    public readonly declarator: Declarator;
    public readonly otherSpecifiers: OtherSpecifiers;

    public abstract readonly type?: Type;
    public readonly name: string;

    public readonly initializer?: Initializer;
    public abstract readonly declaredEntity?: CPPEntity;

    protected readonly allowsExtern: boolean = false;

    protected constructor(context: ContextType, ast: SimpleDeclarationASTNode | undefined, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {
        super(context, ast);

        this.attach(this.typeSpecifier = typeSpec);
        this.attach(this.storageSpecifier = storageSpec);
        this.otherSpecifiers = otherSpecs;

        assert(declarator.name, "Simple declarations must have a name.");
        this.attach(this.declarator = declarator);

        // It's an error to declare anything using a qualified name in the declarator.
        // This also prevents a variety of other silly issues, e.g. trying to
        // put a definition for some function from some other class inside a class
        // (i.e. you can't use a qualified name to go defining some random other thing)
        if (isQualifiedName(declarator.name)) {
            this.addNote(CPPError.declaration.qualified_name_prohibited(this));
        }

        // Even if we had a qualified name and there was an error above, we
        // can make a reasonable assumption to allow recovery for the puposes
        // of continuing compilation - assume they meant the unqualified version
        this.name = getUnqualifiedName(declarator.name);

        if (otherSpecs.virtual) {
            if (declarator.type?.isFunctionType() && isClassContext(context)) {
                // ok, it's a member function
            }
            else {
                this.addNote(CPPError.declaration.virtual_prohibited(this));
            }
        }

        if (this.storageSpecifier.extern && !this.allowsExtern) {
            this.addNote(CPPError.declaration.storage.extern_prohibited(this));
        }
    }

}

export interface TypedSimpleDeclaration<T extends Type> extends SimpleDeclaration {
    readonly type: T;
    readonly declaredEntity: CPPEntity<T>;
}

export interface CompiledSimpleDeclaration<T extends Type = Type> extends TypedSimpleDeclaration<T>, SuccessfullyCompiled {
    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly storageSpecifier: CompiledStorageSpecifier;
    readonly declarator: CompiledDeclarator;

    readonly initializer?: CompiledInitializer;
}
