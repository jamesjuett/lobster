import { SimpleDeclarationASTNode } from "../../ast/ast_declarations";
import { assert } from "../../util/util";
import { isClassContext, TranslationUnitContext } from "../contexts";
import { BasicCPPConstruct, SuccessfullyCompiled } from "../constructs";
import { CPPEntity } from "../entities";
import { CPPError } from "../errors";
import { CompiledInitializer, Initializer } from "../initializers";
import { getUnqualifiedName } from "../lexical";
import { Type } from "../types";
import { StorageSpecifier, CompiledStorageSpecifier } from "./StorageSpecifier";
import { TypeSpecifier, CompiledTypeSpecifier } from "./TypeSpecifier";
import { OtherSpecifiers } from "./declarations";
import { Declarator, CompiledDeclarator } from "./Declarator";


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
