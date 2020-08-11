import { BasicCPPConstruct, ASTNode, CPPConstruct, SuccessfullyCompiled, InvalidConstruct, TranslationUnitContext, FunctionContext, createFunctionContext, isBlockContext, BlockContext, createClassContext, ClassContext, isClassContext, createMemberSpecificationContext, MemberSpecificationContext, isMemberSpecificationContext, createImplicitContext } from "./constructs";
import { CPPError, Note, CompilerNote, NoteHandler } from "./errors";
import { asMutable, assertFalse, assert, Mutable, Constructor, assertNever, DiscriminateUnion } from "../util/util";
import { Type, VoidType, ArrayOfUnknownBoundType, FunctionType, ObjectType, ReferenceType, PotentialParameterType, BoundedArrayType, PointerType, builtInTypes, isBuiltInTypeName, PotentialReturnType, NoRefType, AtomicType, ArithmeticType, IntegralType, FloatingPointType, CompleteClassType, PotentiallyCompleteClassType, IncompleteClassType, IncompleteType } from "./types";
import { Initializer, DefaultInitializer, DirectInitializer, InitializerASTNode, CompiledInitializer, DirectInitializerASTNode, CopyInitializerASTNode, InitializerListASTNode } from "./initializers";
import { LocalObjectEntity, LocalReferenceEntity, GlobalObjectEntity, NamespaceScope, VariableEntity, CPPEntity, FunctionEntity, BlockScope, ClassEntity, MemberObjectEntity, MemberReferenceEntity } from "./entities";
import { ExpressionASTNode, NumericLiteralASTNode, createExpressionFromAST, parseNumericLiteralValueFromAST } from "./expressions";
import { BlockASTNode, Block, createStatementFromAST, CompiledBlock } from "./statements";
import { IdentifierASTNode, checkIdentifier } from "./lexical";
import { CPPObject, ArraySubobject } from "./objects";
import { RuntimeFunctionCall } from "./functionCall";
import { Expression } from "./expressionBase";
import { RuntimeFunction } from "./functions";
import { parseDeclarator, parseFunctionDefinition } from "../parse/cpp_parser_util";

export type StorageSpecifierKey = "register" | "static" | "thread_local" | "extern" | "mutable";

export type StorageSpecifierASTNode = readonly StorageSpecifierKey[];

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
        super(context, undefined)

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

        if (this.extern) {
            this.addNote(CPPError.lobster.unsupported_feature(this, "extern"));
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
}

export interface CompiledStorageSpecifier extends StorageSpecifier, SuccessfullyCompiled {

}

export type SimpleTypeName = string | "char" | "short" | "int" | "bool" | "long" | "signed" | "unsigned" | "float" | "double" | "void";
export type TypeSpecifierKey = "const" | "volatile" | "signed" | "unsigned" | "enum";

export type TypeSpecifierASTNode = readonly (TypeSpecifierKey | SimpleTypeName | ElaboratedTypeSpecifierASTNode | ClassDefinitionASTNode)[];

export class TypeSpecifier extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    public readonly construct_type = "type_specifier";

    public readonly const?: true;
    public readonly volatile?: true;
    public readonly signed?: true;
    public readonly unsigned?: true;
    public readonly enum?: true;

    public readonly typeName?: string;

    public readonly baseType?: Type;

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
        })

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
};

export interface CompiledTypeSpecifier<BaseType extends Type = Type> extends TypeSpecifier, SuccessfullyCompiled {
    readonly baseType?: BaseType;
}

interface OtherSpecifiers {
    readonly friend?: boolean;
    readonly typedef?: boolean;
    readonly inline?: boolean;
    readonly explicit?: boolean;
    readonly virtual?: boolean;
}

export interface DeclarationSpecifiersASTNode {
    readonly typeSpecs: TypeSpecifierASTNode;
    readonly storageSpecs: StorageSpecifierASTNode;
    readonly elaboratedTypeSpecifiers: readonly ElaboratedTypeSpecifierASTNode[];
    readonly classSpecifiers: readonly ClassDefinitionASTNode[];
    readonly friend?: boolean;
    readonly typedef?: boolean;
    readonly inline?: boolean;
    readonly explicit?: boolean;
    readonly virtual?: boolean;
}

export type DeclarationASTNode = TopLevelDeclarationASTNode | MemberDeclarationASTNode;

export type TopLevelDeclarationASTNode = NonMemberSimpleDeclarationASTNode | FunctionDefinitionASTNode | ClassDefinitionASTNode;

export type LocalDeclarationASTNode = NonMemberSimpleDeclarationASTNode | FunctionDefinitionASTNode | ClassDefinitionASTNode;

export type SimpleDeclarationASTNode = NonMemberSimpleDeclarationASTNode | MemberSimpleDeclarationASTNode;

export type Declaration = TopLevelSimpleDeclaration | LocalSimpleDeclaration | MemberDeclaration | FunctionDefinition | ClassDefinition | InvalidConstruct;

export type TopLevelDeclaration = TopLevelSimpleDeclaration | FunctionDefinition | ClassDefinition | InvalidConstruct;

export type TopLevelSimpleDeclaration =
    NonObjectDeclaration |
    GlobalVariableDefinition |
    IncompleteTypeVariableDefinition;

export type LocalDeclaration = LocalSimpleDeclaration | FunctionDefinition | ClassDefinition | InvalidConstruct;

export type LocalSimpleDeclaration =
    NonObjectDeclaration |
    LocalVariableDefinition |
    IncompleteTypeVariableDefinition;

export type MemberDeclaration = MemberSimpleDeclaration | FunctionDefinition | ClassDefinition | InvalidConstruct;

export type MemberSimpleDeclaration =
    NonObjectDeclaration |
    MemberVariableDeclaration |
    IncompleteTypeMemberVariableDeclaration;// |
    // ConstructorDeclaration |
    // DestructorDeclaration;

export type NonObjectDeclaration = 
    UnknownTypeDeclaration |
    VoidDeclaration |
    TypedefDeclaration |
    FriendDeclaration |
    UnknownBoundArrayDeclaration |
    FunctionDeclaration;

export type VariableDefinition = LocalVariableDefinition | GlobalVariableDefinition;



const TopLevelDeclarationConstructsMap = {
    "simple_declaration": (ast: NonMemberSimpleDeclarationASTNode, context: TranslationUnitContext) => createTopLevelSimpleDeclarationFromAST(ast, context),
    "function_definition": (ast: FunctionDefinitionASTNode, context: TranslationUnitContext) => {
        return FunctionDefinition.createFromAST(ast, context);
    },
    "class_definition": (ast: ClassDefinitionASTNode, context: TranslationUnitContext) => ClassDefinition.createFromAST(ast, context)
};

export function createTopLevelDeclarationFromAST<ASTType extends TopLevelDeclarationASTNode>(ast: ASTType, context: TranslationUnitContext) : ReturnType<(typeof TopLevelDeclarationConstructsMap)[ASTType["construct_type"]]> {
    return <any>TopLevelDeclarationConstructsMap[ast.construct_type](<any>ast, context);
}

function createTopLevelSimpleDeclarationFromAST(ast: NonMemberSimpleDeclarationASTNode, context: TranslationUnitContext) {
    assert(!isBlockContext(context), "Cannot create a top level declaration in a block context.");
    assert(!isClassContext(context), "Cannot create a top level declaration in a class context.");

    // Need to create TypeSpecifier first to get the base type for the declarators
    let typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs, context);
    let baseType = typeSpec.baseType;
    let storageSpec = StorageSpecifier.createFromAST(ast.specs.storageSpecs, context);

    // Create an array of the individual declarations (multiple on the same line
    // will be parsed as a single AST node and need to be broken up)
    return ast.declarators.map((declAST) => {

        // Create declarator and determine declared type
        let declarator = Declarator.createFromAST(declAST, context, baseType);
        let declaredType = declarator.type;

        // Create the declaration itself. Which kind depends on the declared type
        let declaration: TopLevelSimpleDeclaration;
        if (!declaredType) {
            declaration = new UnknownTypeDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (ast.specs.friend) {
            declaration = new FriendDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (ast.specs.typedef) {
            declaration = new TypedefDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (declaredType.isVoidType()) {
            declaration = new VoidDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (declaredType.isFunctionType()) {
            declaration = new FunctionDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        else if (declaredType.isArrayOfUnknownBoundType()) {
            // TODO: it may be possible to determine the bound from the initializer
            declaration = new UnknownBoundArrayDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        else if (declaredType.isObjectType() || declaredType.isReferenceType()) {
            declaration = new GlobalVariableDefinition(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
            setInitializerFromAST(declaration, declAST.initializer, context);
        }
        else {
            declaration = new IncompleteTypeVariableDefinition(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }

        return declaration;
    });
}

export function setInitializerFromAST(declaration: VariableDefinition | MemberVariableDeclaration, initAST: DirectInitializerASTNode | CopyInitializerASTNode | InitializerListASTNode | undefined, context: TranslationUnitContext) {
    if (!initAST) {
        declaration.setDefaultInitializer();
    }
    else if (initAST.construct_type == "direct_initializer") {
        declaration.setDirectInitializer(initAST.args.map((a) => createExpressionFromAST(a, context)));
    }
    else if (initAST.construct_type == "copy_initializer") {
        declaration.setCopyInitializer(initAST.args.map((a) => createExpressionFromAST(a, context)));
    }
    else if (initAST.construct_type == "initializer_list") {
        declaration.setInitializerList(initAST.args.map((a) => createExpressionFromAST(a, context)));
    }
}

const LocalDeclarationConstructsMap = {
    "simple_declaration": (ast: NonMemberSimpleDeclarationASTNode, context: BlockContext) => createLocalSimpleDeclarationFromAST(ast, context),
    "function_definition": (ast: FunctionDefinitionASTNode, context: BlockContext) => FunctionDefinition.createFromAST(ast, context),
    "class_definition": (ast: ClassDefinitionASTNode, context: BlockContext) => ClassDefinition.createFromAST(ast, context)
};

export function createLocalDeclarationFromAST<ASTType extends LocalDeclarationASTNode>(ast: ASTType, context: BlockContext) : ReturnType<(typeof LocalDeclarationConstructsMap)[ASTType["construct_type"]]>{
    return <any>LocalDeclarationConstructsMap[ast.construct_type](<any>ast, context);
}

export function createLocalSimpleDeclarationFromAST(ast: NonMemberSimpleDeclarationASTNode, context: TranslationUnitContext) {
    assert(isBlockContext(context), "A local declaration must be created in a block context.");

    // Need to create TypeSpecifier first to get the base type for the declarators
    let typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs, context);
    let baseType = typeSpec.baseType;
    let storageSpec = StorageSpecifier.createFromAST(ast.specs.storageSpecs, context);

    // Create an array of the individual declarations (multiple on the same line
    // will be parsed as a single AST node and need to be broken up)
    return ast.declarators.map((declAST) => {

        // Create declarator and determine declared type
        let declarator = Declarator.createFromAST(declAST, context, baseType);
        let declaredType = declarator.type;

        // Create the declaration itself. Which kind depends on the declared type
        let declaration: LocalSimpleDeclaration;
        if (!declaredType) {
            declaration = new UnknownTypeDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (ast.specs.friend) {
            declaration = new FriendDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (ast.specs.typedef) {
            declaration = new TypedefDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (declaredType.isVoidType()) {
            declaration = new VoidDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (declaredType.isFunctionType()) {
            declaration = new FunctionDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        else if (declaredType.isArrayOfUnknownBoundType()) {
            // TODO: it may be possible to determine the bound from the initializer
            declaration = new UnknownBoundArrayDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        else if (declaredType.isObjectType() || declaredType.isReferenceType()) {
            declaration = new LocalVariableDefinition(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
            setInitializerFromAST(declaration, declAST.initializer, context);
        }
        else {
            declaration = new IncompleteTypeVariableDefinition(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }

        return declaration;
    });
}

const MemberDeclarationConstructsMap = {
    "simple_member_declaration": (ast: MemberSimpleDeclarationASTNode, context: MemberSpecificationContext) => createMemberSimpleDeclarationFromAST(ast, context),
    "function_definition": (ast: FunctionDefinitionASTNode, context: MemberSpecificationContext) => createFunctionDeclarationFromDefinitionAST(ast, context)
    // Note: function_definition includes ctor and dtor definitions
};

export function createMemberDeclarationFromAST<ASTType extends MemberDeclarationASTNode>(ast: ASTType, context: MemberSpecificationContext) : ReturnType<(typeof MemberDeclarationConstructsMap)[ASTType["construct_type"]]>{
    return <any>MemberDeclarationConstructsMap[ast.construct_type](<any>ast, context);
}

export function createMemberSimpleDeclarationFromAST(ast: MemberSimpleDeclarationASTNode, context: MemberSpecificationContext) {
    // assert(isMemberSpecificationContext(context), "A Member declaration must be created in a member specification context.");

    // Need to create TypeSpecifier first to get the base type for the declarators
    let typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs, context);
    let baseType = typeSpec.baseType;
    let storageSpec = StorageSpecifier.createFromAST(ast.specs.storageSpecs, context);

    // A constructor may have been parsed incorrectly due to an ambiguity in the grammar.
    // For example, A(); might have been parsed as a function returning an A with a declarator
    // that is missing its name. In that case, A would be the type specifier.
    // So, we check the first declarator. If it has no name, and the type specifier
    // identified the contextual class type, we know this mistake has occurred and we fix it.
    if (baseType?.sameType(context.containingClass.type)) {
        let testDeclarator = Declarator.createFromAST(ast.declarators[0], context, baseType);
        if (!testDeclarator.name) {
            typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs.filter(spec => spec !== context.containingClass.name), context);
        }
    }


    // Create an array of the individual declarations (multiple on the same line
    // will be parsed as a single AST node and need to be broken up)
    return ast.declarators.map((declAST) => {

        // Create declarator and determine declared type
        let declarator = Declarator.createFromAST(declAST, context, baseType);
        let declaredType = declarator.type;

        // Create the declaration itself. Which kind depends on the declared type
        let declaration: MemberSimpleDeclaration;
        if (!declaredType) {
            declaration = new UnknownTypeDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (ast.specs.friend) {
            declaration = new FriendDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (ast.specs.typedef) {
            declaration = new TypedefDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (declaredType.isVoidType()) {
            declaration = new VoidDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (declaredType.isFunctionType()) {
            declaration = new FunctionDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        else if (declaredType.isArrayOfUnknownBoundType()) {
            // TODO: it may be possible to determine the bound from the initializer
            declaration = new UnknownBoundArrayDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        else if (declaredType.isObjectType() || declaredType.isReferenceType()) {
            declaration = new MemberVariableDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
            if (declAST.initializer) {
                // member variables don't get anything set for a default initializer,
                // so this if keeps us from doing anything unless there's an explicit
                // initialization in the AST
                setInitializerFromAST(declaration, declAST.initializer, context);
            }
        }
        else {
            declaration = new IncompleteTypeMemberVariableDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }

        return declaration;
    });
}

export type AnalyticDeclaration = Declaration | Declarator | ParameterDeclaration;

export type TypedDeclarationKinds<T extends Type> = {
    "invalid_construct": T extends undefined ? InvalidConstruct : never
    "unknown_type_declaration": T extends undefined ? UnknownTypeDeclaration : never;
    "void_declaration": T extends VoidType ? VoidDeclaration : never;
    "storage_specifier": never;
    "friend_declaration": never;
    "unknown_array_bound_declaration": T extends ArrayOfUnknownBoundType ? TypedUnknownBoundArrayDeclaration<T> : never;
    "function_declaration": T extends FunctionDeclaration["type"] ? TypedFunctionDeclaration<T> : never;
    "global_variable_definition": T extends GlobalVariableDefinition["type"] ? TypedGlobalVariableDefinition<T> : never;
    "local_variable_definition": T extends LocalVariableDefinition["type"] ? TypedLocalVariableDefinition<T> : never;
    "incomplete_type_variable_definition": T extends IncompleteTypeVariableDefinition["type"] ? TypedIncompleteTypeVariableDefinition<T> : never;
    "parameter_declaration": T extends ParameterDeclaration["type"] ? TypedParameterDeclaration<T> : never;
    "declarator": T extends Declarator["type"] ? TypedDeclarator<T> : never;
    "function_definition": T extends FunctionDeclaration["type"] ? TypedFunctionDefinition<T> : never;
    "class_declaration": T extends ClassDeclaration["type"] ? TypedClassDeclaration<T> : never;
    "class_definition": T extends ClassDefinition["type"] ? TypedClassDefinition<T> : never;
    "member_variable_declaration": T extends MemberVariableDeclaration["type"] ? TypedMemberVariableDeclaration<T> : never;
    "incomplete_type_member_variable_declaration": T extends IncompleteTypeMemberVariableDeclaration["type"] ? TypedIncompleteTypeMemberVariableDeclaration<T> : never;
    
    // TODO: add rest of discriminants and their types
};

export type CompiledDeclarationKinds<T extends Type> = {
    "invalid_construct": never; // these never compile
    "unknown_type_declaration": never; // these never compile
    "void_declaration": never; // these never compile
    "storage_specifier": never; // currently unsupported
    "friend_declaration": never; // currently unsupported
    "unknown_array_bound_declaration": never;  // TODO: should this ever be supported? Can you ever have one of these compile?
    "function_declaration": T extends FunctionDeclaration["type"] ? CompiledFunctionDeclaration<T> : never;
    "global_variable_definition": T extends GlobalVariableDefinition["type"] ? CompiledGlobalVariableDefinition<T> : never;
    "local_variable_definition": T extends LocalVariableDefinition["type"] ? CompiledLocalVariableDefinition<T> : never;
    "incomplete_type_variable_definition": never;
    "parameter_declaration": T extends ParameterDeclaration["type"] ? CompiledParameterDeclaration<T> : never;
    "declarator": T extends Declarator["type"] ? CompiledDeclarator<T> : never;
    "function_definition": T extends FunctionDeclaration["type"] ? CompiledFunctionDefinition<T> : never;
    "class_declaration": T extends ClassDeclaration["type"] ? CompiledClassDeclaration<T> : never;
    "class_definition": T extends ClassDefinition["type"] ? CompiledClassDefinition<T> : never;
    "member_variable_declaration": T extends MemberVariableDeclaration["type"] ? CompiledMemberVariableDeclaration<T> : never;
    "incomplete_type_member_variable_declaration": never;
    // TODO: add rest of discriminants and their types
};

export type AnalyticTypedDeclaration<C extends AnalyticDeclaration, T extends Type = NonNullable<C["type"]>> = TypedDeclarationKinds<T>[C["construct_type"]];
export type AnalyticCompiledDeclaration<C extends AnalyticDeclaration, T extends Type = NonNullable<C["type"]>> = CompiledDeclarationKinds<T>[C["construct_type"]];



export interface NonMemberSimpleDeclarationASTNode extends ASTNode {
    readonly construct_type: "simple_declaration";
    readonly specs: DeclarationSpecifiersASTNode;
    readonly declarators: readonly DeclaratorInitASTNode[];
}

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

    protected constructor(context: ContextType, ast: SimpleDeclarationASTNode | undefined, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {
        super(context, ast);

        this.attach(this.typeSpecifier = typeSpec);
        this.attach(this.storageSpecifier = storageSpec);
        this.otherSpecifiers = otherSpecs;
        this.attach(this.declarator = declarator);

        this.name = declarator.name!; // TODO: remove non-null assertion here once typescript supports assert based control flow analysis (soon)
        if (!declarator.name) {
            return assertFalse("Simple declarations must have a name.");
        }

        // None of the simple declarations are member function declarations
        // and thus none support the virtual keyword
        if (otherSpecs.virtual) {
            this.addNote(CPPError.declaration.virtual_prohibited(this));
        }
    }

}

export interface TypedSimpleDeclaration<T extends Type> extends SimpleDeclaration {
    readonly type: T;
    readonly declaredEntity: CPPEntity<NoRefType<T>>;
}

export interface CompiledSimpleDeclaration<T extends Type = Type> extends TypedSimpleDeclaration<T>, SuccessfullyCompiled {
    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly storageSpecifier: CompiledStorageSpecifier;
    readonly declarator: CompiledDeclarator;

    readonly initializer?: CompiledInitializer;
}

export class UnknownTypeDeclaration extends SimpleDeclaration {
    public readonly construct_type = "unknown_type_declaration";

    public readonly type: undefined;
    public readonly declaredEntity: undefined;

    public constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode | MemberSimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        // Add an error, but only if the declarator doesn't have one for some reason.
        // It should already have one, assuming that's why there's no type.
        // This will probably never be used.
        if (!declarator.getContainedNotes().hasErrors) {
            this.addNote(CPPError.declaration.unknown_type(this));
        }
    }

}

export class VoidDeclaration extends SimpleDeclaration {
    public readonly construct_type = "void_declaration";

    public readonly type = VoidType.VOID;
    public readonly declaredEntity: undefined;

    public constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);
        this.addNote(CPPError.declaration.void_prohibited(this));
    }

}

export class TypedefDeclaration extends SimpleDeclaration {
    public readonly construct_type = "storage_specifier";

    public readonly type: undefined; // will change when typedef is implemented
    public readonly declaredEntity: undefined;

    public constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);
        this.addNote(CPPError.lobster.unsupported_feature(this, "typedef"));


        // ADD THIS BACK IN WHEN TYPEDEFS ARE SUPPORTED
        // if (this.storageSpecifier.numSpecs > 0 && this.isTypedef) {
        //     this.addNote(CPPError.declaration.storage.typedef(this, this.storageSpec.ast))
        // }
    }

}

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

}

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

}

export interface TypedUnknownBoundArrayDeclaration<T extends ArrayOfUnknownBoundType> extends UnknownBoundArrayDeclaration {
    readonly type: T;
}

export class FunctionDeclaration extends SimpleDeclaration {
    public readonly construct_type = "function_declaration";

    public readonly type: FunctionType;
    public readonly declaredEntity: FunctionEntity;
    public readonly initializer: undefined;

    public readonly parameterDeclarations: readonly ParameterDeclaration[];

    public readonly isConstructor: boolean = false;
    public readonly isDestructor: boolean = false;

    public constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode | undefined, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers, type: FunctionType) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        this.type = type;
        this.declaredEntity = new FunctionEntity(type, this);

        assert(!!this.declarator.parameters, "The declarator for a function declaration must contain declarators for its parameters as well.");
        this.parameterDeclarations = this.declarator.parameters!;

        // If main, should have no parameters
        // TODO: this check should be moved elsewhere
        if (this.declaredEntity.isMain() && this.type.paramTypes.length > 0) {
            this.addNote(CPPError.declaration.func.mainParams(this.declarator));
        }


        if (this.declarator.hasConstructorName) {
            // constructors are not added to their scope. they technically "have no name"
            // and can't be found through name lookup
            this.isConstructor = true;

            if (this.type.receiverType?.isConst) {
                this.addNote(CPPError.declaration.ctor.const_prohibited(this));
            }

            if (this.declarator.baseType) {
                this.addNote(CPPError.declaration.ctor.return_type_prohibited(this));
            }


        }
        else {

            if (this.declarator.hasDestructorName) {
                this.isDestructor = true;
            }

            let entityOrError = this.context.contextualScope.declareFunctionEntity(this.declaredEntity);

            if (entityOrError instanceof FunctionEntity) {
                this.declaredEntity = entityOrError;
            }
            else {
                this.addNote(entityOrError);
            }
        }

        
        // A function declaration has linkage. The linkage is presumed to be external, because Lobster does not
        // support using the static keyword or unnamed namespaces to specify internal linkage.
        // It has linkage regardless of whether this is a namespace scope or a block scope.
        this.declaredEntity.registerWithLinker();

        // if (!this.isMemberFunction && this.virtual){
        //     this.addNote(CPPError.declaration.func.virtual_not_allowed(this));
        // }

        // this.checkOverloadSemantics();

        
    }



    // checkOverloadSemantics : function(){
    //     if (this.name === "operator=" || this.name === "operator()" || this.name === "operator[]"){
    //         if (!this.isMemberFunction){
    //             this.addNote(CPPError.declaration.func.op_member(this));
    //         }
    //     }

    //     if (this.name === "operator[]" && this.params.length !== 1){
    //         this.addNote(CPPError.declaration.func.op_subscript_one_param(this));
    //     }
    // },

}

export interface TypedFunctionDeclaration<T extends FunctionType> extends FunctionDeclaration {
    readonly type: T;
    readonly declaredEntity: FunctionEntity<T>;
    readonly declarator: TypedDeclarator<T>;
}

export interface CompiledFunctionDeclaration<T extends FunctionType = FunctionType> extends TypedFunctionDeclaration<T>, SuccessfullyCompiled {
    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly storageSpecifier: CompiledStorageSpecifier;

    readonly declarator: CompiledDeclarator<T>;

    readonly parameterDeclarations: readonly CompiledParameterDeclaration[];
}


        // constructors are not added to their scope. they technically "have no name"
        // and can't be found through name lookup. Lobster achieves that by not adding
        // them to the scope.


// export class ConstructorDeclaration extends SimpleDeclaration implements FunctionDeclaration {
//     public readonly construct_type = "function_declaration";

//     public readonly type: FunctionType<VoidType>;
//     public readonly declaredEntity: FunctionEntity;
//     public readonly initializer: undefined;

//     public readonly parameterDeclarations: readonly ParameterDeclaration[];

//     public constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
//         declarator: Declarator, otherSpecs: OtherSpecifiers, type: FunctionType<VoidType>) {

//         super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

//         this.type = type;
//         this.declaredEntity = new FunctionEntity(type, this);

//         assert(this.declarator.hasConstructorName);
        
//         assert(!!this.declarator.parameters, "The declarator for a constructor declaration must contain declarators for its parameters as well.");
//         this.parameterDeclarations = this.declarator.parameters!;

//         // constructors are not added to their scope. they technically "have no name"
//         // and can't be found through name lookup
//     }

// }

// export interface TypedConstructorDeclaration extends ConstructorDeclaration {
//     readonly type: FunctionType<VoidType>;
//     readonly declaredEntity: FunctionEntity<FunctionType<VoidType>>;
//     readonly declarator: TypedDeclarator<FunctionType<VoidType>>;
// }

// export interface CompiledConstructorDeclaration extends TypedConstructorDeclaration, SuccessfullyCompiled {
//     readonly typeSpecifier: CompiledTypeSpecifier;
//     readonly storageSpecifier: CompiledStorageSpecifier;
    
//     readonly declarator: CompiledDeclarator<FunctionType<VoidType>>;

//     readonly parameterDeclarations: readonly CompiledParameterDeclaration[];
// }


export type VariableDefinitionType = ObjectType | ReferenceType;

abstract class VariableDefinitionBase<ContextType extends TranslationUnitContext = TranslationUnitContext> extends SimpleDeclaration<ContextType> {

    public readonly initializer?: Initializer;

    public abstract readonly type: VariableDefinitionType;
    public abstract readonly declaredEntity: VariableEntity;

    private setInitializer(init: Initializer) {
        assert(!this.initializer); // should only be called once
        (<Mutable<this>>this).initializer = init;
        this.attach(init);
        this.initializerWasSet(init);
        return this;
    }

    protected initializerWasSet(init: Initializer) {
        // hook for subclasses
    }

    public setDefaultInitializer() {
        return this.setInitializer(DefaultInitializer.create(this.context, this.declaredEntity));
    }

    public setDirectInitializer(args: readonly Expression[]) {
        return this.setInitializer(DirectInitializer.create(this.context, this.declaredEntity, args, "direct"));
    }

    public setCopyInitializer(args: readonly Expression[]) {
        return this.setInitializer(DirectInitializer.create(this.context, this.declaredEntity, args, "copy"));
    }

    public setInitializerList(args: readonly Expression[]) {
        // TODO implement initializer lists
        this.addNote(CPPError.lobster.unsupported_feature(this, "initializer lists"));
        return this;
    }
}

// interface CompiledVariableDefinitionBase<ContextType extends TranslationUnitContext = TranslationUnitContext, T extends ObjectType | ReferenceType = ObjectType | ReferenceType> extends VariableDefinitionBase<ContextType>, SuccessfullyCompiled {

//     readonly typeSpecifier: CompiledTypeSpecifier;
//     readonly storageSpecifier: CompiledStorageSpecifier;
//     readonly declarator: CompiledDeclarator<T>;

//     readonly declaredEntity: VariableEntity<NoRefType<T>>;
//     readonly initializer?: CompiledInitializer<NoRefType<T>>;
// }


export class LocalVariableDefinition extends VariableDefinitionBase<BlockContext> {
    public readonly construct_type = "local_variable_definition";


    public readonly type: VariableDefinitionType;
    public readonly declaredEntity: LocalObjectEntity<ObjectType> | LocalReferenceEntity<ObjectType>;

    // public static predicate() : (decl: LocalVariableDefinition) => decl is TypedLocalVariableDefinition<T> {
    //     return <(decl: CPPConstruct) => decl is TypedLocalVariableDefinition<T>>((decl) => decl instanceof LocalVariableDefinition);
    // }

    // public static typedPredicate<T extends VariableDefinitionType>(typePredicate: (o: VariableDefinitionType) => o is T) {
    //     return <(decl: CPPConstruct) => decl is TypedLocalVariableDefinition<T>>((decl) => decl instanceof LocalVariableDefinition && !!decl.type && !!decl.declaredEntity && typePredicate(decl.type));
    // }

    public constructor(context: BlockContext, ast: NonMemberSimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers, type: VariableDefinitionType) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        this.type = type;

        this.declaredEntity =
            type.isReferenceType() ? new LocalReferenceEntity(type.refTo, this) : new LocalObjectEntity(type, this);


        // Note extern unsupported error is added in the base Declaration class, so no need to add here

        // All local declarations are also definitions, with the exception of a local declaration of a function
        // or a local declaration with the extern storage specifier, but those are not currently supported by Lobster.
        // This means a locally declared variable does not have linkage, and we don't need to do any linking stuff here.

        // Attempt to add the declared entity to the scope. If it fails, note the error.
        let entityOrError = context.contextualScope.declareVariableEntity(this.declaredEntity);

        if (entityOrError instanceof LocalObjectEntity || entityOrError instanceof LocalReferenceEntity) {
            this.declaredEntity = entityOrError;
            this.context.functionLocals.registerLocalVariable(this.declaredEntity);
        }
        else {
            this.addNote(entityOrError);
        }
    }


    // public static kindPredicate = <(decl: CPPConstruct) => decl is LocalVariableDefinition>((decl) => decl instanceof LocalVariableDefinition);

}

export interface TypedLocalVariableDefinition<T extends VariableDefinitionType> extends LocalVariableDefinition {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
    readonly declaredEntity: LocalObjectEntity<NoRefType<T>> | LocalReferenceEntity<NoRefType<T>>;
}

export interface CompiledLocalVariableDefinition<T extends VariableDefinitionType = VariableDefinitionType> extends TypedLocalVariableDefinition<T>, SuccessfullyCompiled {

    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly storageSpecifier: CompiledStorageSpecifier;
    readonly declarator: CompiledDeclarator<T>;

    readonly declaredEntity: LocalObjectEntity<NoRefType<T>> | LocalReferenceEntity<NoRefType<T>>
    readonly initializer?: CompiledInitializer<NoRefType<T>>;
}


export class GlobalVariableDefinition extends VariableDefinitionBase<TranslationUnitContext> {
    public readonly construct_type = "global_variable_definition";

    public readonly type: VariableDefinitionType;
    public readonly declaredEntity!: GlobalObjectEntity<ObjectType>; // TODO definite assignment assertion can be removed when global references are supported

    public constructor(context: TranslationUnitContext, ast: NonMemberSimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers, type: VariableDefinitionType) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        this.type = type;

        if (type.isReferenceType()) {
            this.addNote(CPPError.lobster.unsupported_feature(this, "globally scoped references"));
            return;
        }

        this.declaredEntity = new GlobalObjectEntity(type, this);

        let entityOrError = context.contextualScope.declareVariableEntity(this.declaredEntity);

        if (entityOrError instanceof GlobalObjectEntity) {
            this.declaredEntity = entityOrError;
            this.context.translationUnit.program.registerGlobalObjectDefinition(this.declaredEntity.qualifiedName, this);
        }
        else {
            this.addNote(entityOrError);
        }

    }

}

export interface TypedGlobalVariableDefinition<T extends VariableDefinitionType> extends GlobalVariableDefinition {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
    readonly declaredEntity: GlobalObjectEntity<NoRefType<T>>;
}

export interface CompiledGlobalVariableDefinition<T extends VariableDefinitionType = VariableDefinitionType> extends TypedGlobalVariableDefinition<T>, SuccessfullyCompiled {

    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly storageSpecifier: CompiledStorageSpecifier;
    readonly declarator: CompiledDeclarator<T>;

    readonly initializer?: CompiledInitializer<NoRefType<T>>;
}

/**
 * ParameterDeclarations are a bit different than other declarations because
 * they do not introduce an entity into their contextual scope. For example,
 * in the context of a function declaration that contains several parameter
 * declarations, there is no function body (as there would be for a function
 * definition) into whose scope the entities would even be introduced.
 * This contrasts to ParameterDefinitions that may introduce an entity.
 */
export class ParameterDeclaration extends BasicCPPConstruct<TranslationUnitContext, ParameterDeclarationASTNode> {
    public readonly construct_type = "parameter_declaration";

    public readonly typeSpecifier: TypeSpecifier;
    public readonly storageSpecifier: StorageSpecifier;
    public readonly declarator: Declarator;
    public readonly otherSpecifiers: OtherSpecifiers;

    public readonly name?: string; // parameter declarations need not provide a name
    public readonly type?: PotentialParameterType;
    public readonly declaredEntity?: LocalObjectEntity<ObjectType> | LocalReferenceEntity<ObjectType>;

    public constructor(context: TranslationUnitContext, ast: ParameterDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, ast);

        this.attach(this.typeSpecifier = typeSpec);
        this.attach(this.storageSpecifier = storageSpec);
        this.attach(this.declarator = declarator);
        this.otherSpecifiers = otherSpecs;

        this.name = declarator.name;

        if (!storageSpec.isEmpty) {
            storageSpec.addNote(CPPError.declaration.parameter.storage_prohibited(storageSpec));
        }

        let type = declarator.type;

        if (type && !type.isPotentialParameterType()) {
            this.addNote(CPPError.declaration.parameter.invalid_parameter_type(this, type));
            return;
        }

        this.type = type;

        if (this.isPotentialParameterDefinition()) {
            (<Mutable<this>>this).declaredEntity =
                this.type.isReferenceType() ? new LocalReferenceEntity(this.type.refTo, this, true) :
                    new LocalObjectEntity(this.type, this, true);
        }

    }

    public static createFromAST(ast: ParameterDeclarationASTNode, context: TranslationUnitContext): ParameterDeclaration {

        let storageSpec = StorageSpecifier.createFromAST(ast.specs.storageSpecs, context);

        // Need to create TypeSpecifier first to get the base type first for the declarators
        let typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs, context);

        // Compile declarator for each parameter (of the function-type argument itself)
        let declarator = Declarator.createFromAST(ast.declarator, context, typeSpec.baseType);

        return new ParameterDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
    }

    public isPotentialParameterDefinition(): this is ParameterDefinition {
        return !!this.name && !!this.type && this.type.isPotentialParameterType();
    }

    public addEntityToScope(this: ParameterDefinition, context: BlockContext) {

        // If there's no type, we can't introduce an entity. If there's no name, we don't either.
        // A parameter in a function definition with no name is technically allowed (e.g. this may
        // indicate the programmer intends not to use the parameter in the function implementation).


        // Attempt to add the declared entity to the scope. If it fails, note the error.
        let entityOrError = context.contextualScope.declareVariableEntity(this.declaredEntity);

        if (entityOrError instanceof LocalObjectEntity || entityOrError instanceof LocalReferenceEntity) {
            (<Mutable<ParameterDefinition>>this).declaredEntity = entityOrError;
            context.functionLocals.registerLocalVariable(this.declaredEntity);
        }
        else {
            this.addNote(entityOrError);
        }
    }
}

export interface TypedParameterDeclaration<T extends PotentialParameterType> extends ParameterDeclaration {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
    readonly declaredEntity?: LocalObjectEntity<NoRefType<T>> | LocalReferenceEntity<NoRefType<T>>;
}

export interface CompiledParameterDeclaration<T extends PotentialParameterType = PotentialParameterType> extends TypedParameterDeclaration<T>, SuccessfullyCompiled {
    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly storageSpecifier: CompiledStorageSpecifier;
    readonly declarator: CompiledDeclarator<T>;

}

export interface ParameterDefinition extends ParameterDeclaration {
    readonly name: string;
    readonly type: PotentialParameterType;
    readonly declaredEntity: LocalObjectEntity<ObjectType> | LocalReferenceEntity<ObjectType>;
}

export interface TypedParameterDefinition<T extends PotentialParameterType> extends ParameterDeclaration {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
    readonly declaredEntity: LocalObjectEntity<NoRefType<T>> | LocalReferenceEntity<NoRefType<T>>;
}

export interface CompiledParameterDefinition<T extends PotentialParameterType = PotentialParameterType> extends TypedParameterDefinition<T>, SuccessfullyCompiled {
    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly storageSpecifier: CompiledStorageSpecifier;
    readonly declarator: CompiledDeclarator<T>;
}




/**
 * This class represents a definition of a variable with incomplete type. Such a definition is
 * ill-formed, because necessary details (such as object size) are missing from an incomplete type.
 * As such, this class always compiles with an error and does not create any entities. In effect,
 * the attempted definition of such a variable is acknowledged, but the variable is otherwise ignored
 * as if it was never declared.
 */
export class IncompleteTypeVariableDefinition extends SimpleDeclaration<TranslationUnitContext> {
    public readonly construct_type = "incomplete_type_variable_definition";

    public readonly type: IncompleteType;
    public readonly declaredEntity: undefined;

    public constructor(context: TranslationUnitContext, ast: NonMemberSimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers, type: IncompleteType) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        this.type = type;

        this.addNote(CPPError.declaration.incomplete_type_definition_prohibited(this));
    }
}

export interface TypedIncompleteTypeVariableDefinition<T extends IncompleteType> extends IncompleteTypeVariableDefinition {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
}




interface ArrayPostfixDeclaratorASTNode {
    readonly kind: "array";
    readonly size?: ExpressionASTNode;
}

export interface ParameterDeclarationASTNode extends ASTNode {
    readonly declarator: DeclaratorASTNode;
    readonly specs: DeclarationSpecifiersASTNode;
    readonly initializer?: InitializerASTNode;
}

interface FunctionPostfixDeclaratorASTNode {
    readonly kind: "function";
    readonly size: ExpressionASTNode;
    readonly args: readonly ParameterDeclarationASTNode[];
    readonly const?: boolean;
}

export interface DeclaratorASTNode extends ASTNode {
    readonly pureVirtual?: boolean;
    readonly sub?: DeclaratorASTNode; // parentheses
    readonly pointer?: DeclaratorASTNode;
    readonly reference?: DeclaratorASTNode;
    readonly const?: boolean;
    readonly volatile?: boolean;
    readonly name?: IdentifierASTNode;
    readonly postfixes?: readonly (ArrayPostfixDeclaratorASTNode | FunctionPostfixDeclaratorASTNode)[];
}

interface DeclaratorInitASTNode extends DeclaratorASTNode {
    readonly initializer?: InitializerASTNode;
}

// TODO: take baseType as a parameter to compile rather than init
export class Declarator extends BasicCPPConstruct<TranslationUnitContext, DeclaratorASTNode> {
    public readonly construct_type = "declarator";

    public readonly name?: string;
    public readonly type?: Type;

    public readonly baseType?: Type;
    public readonly isPureVirtual?: true;

    public readonly hasConstructorName : boolean = false;
    public readonly hasDestructorName : boolean = false;

    public readonly parameters?: readonly ParameterDeclaration[]; // defined if this is a declarator of function type

    public static createFromAST(ast: DeclaratorASTNode, context: TranslationUnitContext, baseType: Type | undefined) {
        return new Declarator(context, ast, baseType);
    }

    /**
     * `Declarator.createFromAST()` should always be used to create Declarators, which delegates
     * to this private constructor. Directly calling the constructor from the outside is not allowed.
     * Since declarators are largely about processing an AST, it doesn't make much sense to create
     * one without an AST.
     */
    private constructor(context: TranslationUnitContext, ast: DeclaratorASTNode, baseType: Type | undefined) {
        super(context, ast);
        this.baseType = baseType;

        // let isMember = isA(this.parent, Declarations.Member);

        if (ast.pureVirtual) { this.isPureVirtual = true; }

        this.determineNameAndType(ast);
    }

    private determineNameAndType(ast: DeclaratorASTNode) {

        let findName: DeclaratorASTNode | undefined = ast;
        while (findName) {
            if (findName.name) {
                (<Mutable<this>>this).name = findName.name.identifier;
                checkIdentifier(this, findName.name.identifier, this.notes);
                break;
            }
            findName = findName.pointer || findName.reference || findName.sub;
        }

        if (this.name && isClassContext(this.context)) {
            let className = this.context.containingClass.name;
            if (this.name === className) {
                (<Mutable<this>>this).hasConstructorName = true;
            }
            else if (this.name === "~" + className){
                (<Mutable<this>>this).hasDestructorName = true;
            }
        }

        let type: Type;

        // If it's a ctor or dtor, then we'll implicitly add void.
        // This is a bit of a Lobster hack, since technically in C++ ctors and dtors
        // don't have any return type at all, but the effects are mostly the same.
        if (this.baseType) {
            type = this.baseType;
        }
        else if (this.hasConstructorName) {
            type = VoidType.VOID;
        }
        else if (this.hasDestructorName) {
            type = VoidType.VOID;
        }
        else {
            // If there's no base type, we really can't do much.
            this.addNote(CPPError.declaration.missing_type_specifier(this));
            return;
        }

        
        let first = true;
        // let prevKind : "function" | "reference" | "pointer" | "array" | "none" = "none";

        let decl: DeclaratorASTNode | undefined = ast;



        while (decl) {

            // We want to check whether this is the innermost thing, but first we need to loop
            // to descend through any AST representation of parentheses within the declarator.
            let tempDecl = decl;
            while (tempDecl.sub) {
                tempDecl = tempDecl.sub;
            }

            if (decl.postfixes) {

                for (let i = decl.postfixes.length - 1; i >= 0; --i) {

                    // A postfix portion of a declarator is only innermost if it's the leftmost one,
                    // which would be closest to where the name would occur in the declarator. (Note
                    // that this is also the last one processed here, since we iterate backward down to 0.)
                    let postfix = decl.postfixes[i];

                    if (postfix.kind === "array") {
                        if (type.isBoundedArrayType()) {
                            this.addNote(CPPError.declaration.array.multidimensional_arrays_unsupported(this));
                            return;
                        }

                        if (!type.isArrayElemType()) {
                            this.addNote(CPPError.declaration.array.invalid_element_type(this, type));
                            return;
                        }

                        if (postfix.size) {

                            if (postfix.size.construct_type === "numeric_literal_expression") {
                                // If the size specified is a literal, just use its value as array length
                                type = new BoundedArrayType(type, parseNumericLiteralValueFromAST(postfix.size));
                            }
                            else {
                                // If a size is specified, that is not a literal, it must be an expression (via the grammar).
                                // This size expression could e.g. be used for a dynamically allocated array. In that case,
                                // we provide the AST of the size expression as part of the type so it can be used later by
                                // a new expression to construct the size subexpression for the allocated array.
                                type = new ArrayOfUnknownBoundType(type, postfix.size);

                                // TODO: It is also possible the size is a compile-time constant expression, in which case
                                // it should be evaluated to determine the size.
                            }

                            // TODO: move these errors elsewhere
                            // if (postfix.size.construct_type !== "literal" && !(isInnermost && isA(this.parent, Expressions.NewExpression))){
                            // //TODO need to evaluate size of array if it's a compile-time constant expression
                            //     this.addNote(CPPError.declaration.array.literal_length_only(this));
                            // }
                            // else if (postfix.size.construct_type === "literal" && postfix.size.value == 0 && !(innermost && isA(this.parent, Expressions.NewExpression))){
                            //     this.addNote(CPPError.declaration.array.zero_length(this));
                            // }
                            // else size was fine and nothing needs to be done
                        }
                        else {
                            type = new ArrayOfUnknownBoundType(type);
                        }



                    }
                    else if (postfix.kind === "function") {
                        let fnType = this.processFunctionDeclarator(postfix, type, this);
                        if (fnType) {
                            type = fnType;
                        }
                        else {
                            return;
                        }
                    }

                    first = false;
                }
            }

            // Process pointers/references next
            // NOTE: this line should NOT be else if since the same AST node may
            // have both postfixes and a pointer/reference
            if (decl.pointer) {
                if (!type.isObjectType()) {
                    if (type.isReferenceType()) {
                        this.addNote(CPPError.declaration.pointer.reference(this));
                    }
                    else if (type.isVoidType()) {
                        this.addNote(CPPError.declaration.pointer.void(this))
                    }
                    else {
                        this.addNote(CPPError.declaration.pointer.invalid_pointed_type(this, type));
                    }
                    return;
                }
                type = new PointerType(type, decl["const"], decl["volatile"]);
                decl = decl.pointer;
            }
            else if (decl.reference) {
                if (!type.isObjectType()) {
                    if (type.isReferenceType()) {
                        this.addNote(CPPError.declaration.ref.ref(this));
                    }
                    else {
                        this.addNote(CPPError.declaration.ref.invalid_referred_type(this, type));
                    }
                    return;
                }
                type = new ReferenceType(type);
                decl = decl.reference;
            }
            else if (decl.hasOwnProperty("sub")) {
                decl = decl.sub;
            }
            else {
                break;
            }

            first = false;
        }

        (<Mutable<this>>this).type = type;

        // If it's not a function type, the recorded parameters aren't meaningful
        if (!type.isFunctionType()) {
            delete (<Mutable<this>>this).parameters;
        }

        // if there wasn't any base type and we don't end up with a function type
        // it means we have an attempt at declaring a member variable
        // with the same name as the class that got defaulted to void as if
        // it was a constructor without a type specifier, but then turned out
        // not to be a viable constructor from the rest of the syntax. In
        // this case, we want to add back in the missing type specifier
        if (!this.baseType && !this.type?.isFunctionType()) {
            delete (<Mutable<this>>this).type;
            this.addNote(CPPError.declaration.missing_type_specifier(this));
        }
    }

    private processFunctionDeclarator(postfix: FunctionPostfixDeclaratorASTNode, type: Type, notes: NoteHandler) : FunctionType | undefined {

        if (type && !type.isPotentialReturnType()) {
            if (type.isFunctionType()) {
                notes.addNote(CPPError.declaration.func.return_func(this));
            }
            else if (type.isBoundedArrayType()) {
                notes.addNote(CPPError.declaration.func.return_array(this));
            }
            else {
                notes.addNote(CPPError.declaration.func.invalid_return_type(this, type));
            }
            return;
        }

        let paramDeclarations = postfix.args.map((argAST) => ParameterDeclaration.createFromAST(argAST, this.context));
        (<Mutable<this>>this).parameters = paramDeclarations;
        this.attachAll(paramDeclarations);

        let paramTypes = paramDeclarations.map(decl => {
            if (!decl.type) { return decl.type; }
            if (!decl.type.isBoundedArrayType()) { return decl.type; }
            return decl.type.adjustToPointerType();
        });

        // A parameter list of just (void) specifies no parameters
        if (paramTypes.length == 1 && paramTypes[0] && paramTypes[0].isVoidType()) {
            paramTypes = [];
        }
        else {
            // Otherwise void parameters are bad
            for (let j = 0; j < paramTypes.length; ++j) {
                let paramType = paramTypes[j];
                if (paramType && paramType.isVoidType()) {
                    notes.addNote(CPPError.declaration.func.void_param(paramDeclarations[j]));
                }
            }
        }

        if (!paramTypes.every(paramType => paramType)) {
            return; // if some paramTypes aren't defined, can't do anything
        }

        if (!paramTypes.every(paramType => paramType && paramType.isPotentialParameterType())) {
            notes.addNote(CPPError.declaration.func.some_invalid_parameter_types(this));
            return;
        }

        // TODO clean up error immediately above and get rid of yucky cast below
        return new FunctionType(type, <PotentialParameterType[]>paramTypes, this.context.containingClass && this.context.containingClass.type.cvQualified(!!postfix.const));
    }

}

export interface TypedDeclarator<T extends Type> extends Declarator {
    type: T;
}

export interface CompiledDeclarator<T extends Type = Type> extends TypedDeclarator<T>, SuccessfullyCompiled {
    readonly parameters?: readonly CompiledParameterDeclaration[]; // defined if this is a declarator of function type
}


let OVERLOADABLE_OPS: { [index: string]: true | undefined } = {};

["new[]"
    , "delete[]"
    , "new"
    , "delete"
    , "->*", ">>=", "<<="
    , "+=", "-=", "*=", ",=", "%=", "^="
    , "&=", "|=", "<<", ">>", "==", "!="
    , "<=", ">=", "&&", "||", "++", "--"
    , "->", "()", "[]"
    , "+", "-", "*", "/", "%", "^", "&"
    , "|", "~", "!", "=", "<", ">", ","].forEach(function (op) {
        OVERLOADABLE_OPS["operator" + op] = true;
    });

export type FunctionBodyASTNode = BlockASTNode;

export interface FunctionDefinitionASTNode extends ASTNode {
    readonly construct_type: "function_definition";
    readonly specs: DeclarationSpecifiersASTNode;
    readonly declarator: DeclaratorASTNode;
    readonly ctor_initializer: CtorInitializerASTNode;
    readonly body: FunctionBodyASTNode;
}

export class FunctionDefinition extends BasicCPPConstruct<FunctionContext, FunctionDefinitionASTNode> {
    public readonly construct_type = "function_definition";
    public readonly kind = "FunctionDefinition";

    public readonly declaration: FunctionDeclaration;
    public readonly name: string;
    public readonly type: FunctionType;
    public readonly parameters: readonly ParameterDeclaration[];
    public readonly body: Block;

    public static createFromAST(ast: FunctionDefinitionASTNode, context: TranslationUnitContext, declaration: FunctionDeclaration) : FunctionDefinition;
    public static createFromAST(ast: FunctionDefinitionASTNode, context: TranslationUnitContext, declaration?: FunctionDeclaration) : FunctionDefinition | InvalidConstruct;
    public static createFromAST(ast: FunctionDefinitionASTNode, context: TranslationUnitContext, declaration?: FunctionDeclaration) {

        if (!declaration) {
            let decl = createFunctionDeclarationFromDefinitionAST(ast, context);
            if (!(decl.construct_type === "function_declaration")) {
                return new InvalidConstruct(context, ast, CPPError.declaration.func.definition_non_function_type);
            }
            declaration = decl;
        }

        // Create implementation and body block (before params and body statements added yet)
        let functionContext = createFunctionContext(context, declaration.declaredEntity);
        let body = new Block(functionContext, ast.body);
        let bodyContext = body.context;

        // Add declared entities from the parameters to the body block's context.
        // As the context refers back to the implementation, local objects/references will be registerd there.
        declaration.parameterDeclarations.forEach(paramDecl => {
            if (paramDecl.isPotentialParameterDefinition()) {
                paramDecl.addEntityToScope(bodyContext);
            }
            else {
                paramDecl.addNote(CPPError.lobster.unsupported_feature(paramDecl, "Unnamed parameter definitions."));
            }
        });

        // Manually add statements to body. (This hasn't been done because the body block was crated manually, not
        // from the AST through the Block.createFromAST function. And we wait until now to do it so they will be
        // added after the parameters.)
        ast.body.statements.forEach(sNode => body.addStatement(createStatementFromAST(sNode, bodyContext)));

        return new FunctionDefinition(functionContext, ast, declaration, declaration.parameterDeclarations, body);
    }

    // i_childrenToExecute: ["memberInitializers", "body"], // TODO: why do regular functions have member initializers??

    public constructor(context: FunctionContext, ast: FunctionDefinitionASTNode, declaration: FunctionDeclaration, parameters: readonly ParameterDeclaration[], body: Block) {
        super(context, ast);

        this.attach(this.declaration = declaration);
        this.attachAll(this.parameters = parameters);
        this.attach(this.body = body);

        this.name = declaration.name;
        this.type = declaration.type;

        this.declaration.declaredEntity.setDefinition(this);

        this.context.translationUnit.program.registerFunctionDefinition(this.declaration.declaredEntity.qualifiedName, this);

        // TODO CLASSES: Add destructors, but this should be moved to Block, not just FunctionDefinition
        // this.autosToDestruct = this.bodyScope.automaticObjects.filter(function(obj){
        //     return isA(obj.type, Types.Class);
        // });

        // this.bodyScope.automaticObjects.filter(function(obj){
        //   return isA(obj.type, Types.Array) && isA(obj.type.elemType, Types.Class);
        // }).map(function(arr){
        //   for(var i = 0; i < arr.type.length; ++i){
        //     self.autosToDestruct.push(ArraySubobjectEntity.instance(arr, i));
        //   }
        // });

        // this.autosToDestruct = this.autosToDestruct.map(function(entityToDestruct){
        //     var dest = entityToDestruct.type.destructor;
        //     if (dest){
        //         var call = FunctionCall.instance({args: []}, {parent: self, scope: self.bodyScope});
        //         call.compile({
        //             func: dest,
        //             receiver: entityToDestruct});
        //         return call;
        //     }
        //     else{
        //         self.addNote(CPPError.declaration.dtor.no_destructor_auto(entityToDestruct.decl, entityToDestruct));
        //     }

        // });
    }

    public createRuntimeFunction<T extends FunctionType>(this: CompiledFunctionDefinition<T>, parent: RuntimeFunctionCall, receiver?: CPPObject<CompleteClassType>): RuntimeFunction<T> {
        return new RuntimeFunction(this, parent.sim, parent, receiver);
    }

    // callSearch : function(callback, options){
    //     options = options || {};
    //     // this.calls will be filled when the body is being compiled
    //     // We assume this has already been done for all functions.

    //     this.callClosure = {};

    //     var queue = [];
    //     queue.unshiftAll(this.calls.map(function(call){
    //         return {call: call, from: null};
    //     }));

    //     var search = {
    //         chain: []
    //     };
    //     while (queue.length > 0){
    //         var next = (options.searchType === "dfs" ? queue.pop() : queue.shift());
    //         var call = next.call;
    //         search.chain = next;
    //         if (search.stop){
    //             break;
    //         }
    //         else if (search.skip){

    //         }
    //         else if (call.func.isLinked() && call.func.isStaticallyBound()){

    //             if (call.staticFunction.decl === this){
    //                 search.cycle = true;
    //             }
    //             else{
    //                 search.cycle = false;
    //                 for(var c = next.from; c; c = c.from){
    //                     if (c.call.staticFunction.entityId === call.staticFunction.entityId){
    //                         search.cycle = true;
    //                         break;
    //                     }
    //                 }
    //             }

    //             callback && callback(search);

    //             // If there's no cycle, we can push children
    //             if (!search.cycle && isA(call.staticFunction.decl, FunctionDefinition)) {
    //                 for(var i = call.staticFunction.decl.calls.length-1; i >= 0; --i){
    //                     queue.push({call: call.staticFunction.decl.calls[i], from: next});
    //                 }
    //             }

    //             this.callClosure[call.staticFunction.entityId] = true;
    //         }

    //     }
    // },

    // tailRecursionAnalysis : function(annotatedCalls){

    //     // Assume not recursive at first, will be set to true if it is
    //     this.isRecursive = false;

    //     // Assume we can use constant stack space at first, will be set to false if not
    //     this.constantStackSpace = true;

    //     //from = from || {start: this, from: null};

    //     // The from parameter sort of represents all functions which, if seen again, constitute recursion


    //     //console.log("tail recursion analysis for: " + this.name);
    //     var self = this;
    //     this.callSearch(function(search){

    //         // Ignore non-cycles
    //         if (!search.cycle){
    //             return;
    //         }

    //         var str = " )";
    //         var chain = search.chain;
    //         var cycleStart = chain.call;
    //         var first = true;
    //         var inCycle = true;
    //         var tailCycle = true;
    //         var nonTailCycleCalls = [];
    //         var firstCall = chain.call;
    //         while (chain){
    //             var call = chain.call;

    //             // Mark all calls in the cycle as part of a cycle, except the original
    //             if (chain.from || first){
    //                 call.isPartOfCycle = true;
    //             }

    //             // Make sure we know whether it's a tail call
    //             call.tailRecursionCheck();

    //             // At time of writing, this will always be true due to the way call search works
    //             if (call.staticFunction){
    //                 // If we know what the call is calling


    //                 str = (call.staticFunction.name + ", ") + str;
    //                 if (call.isTail){
    //                     str = "t-" + str;
    //                 }
    //                 if (!first && call.staticFunction === cycleStart.staticFunction){
    //                     inCycle = false;
    //                     str = "( " + str;
    //                 }

    //                 // This comes after possible change in inCycle because first part of cycle doesn't have to be tail
    //                 if (inCycle){
    //                     if (!annotatedCalls[call.id]){
    //                         // TODO: fix this to not use semanticProblems
    //                         // self.semanticProblems.addWidget(RecursiveCallAnnotation.instance(call, call.isTail, call.isTailReason, call.isTailOthers));
    //                         annotatedCalls[call.id] = true;
    //                     }
    //                 }
    //                 if (inCycle && !call.isTail){
    //                     tailCycle = false;
    //                     nonTailCycleCalls.push(call);
    //                 }
    //             }
    //             else if (call.staticFunctionType){
    //                 // Ok at least we know the type we're calling

    //             }
    //             else{
    //                 // Uhh we don't know anything. This really shouldn't happen.
    //             }
    //             first = false;
    //             chain = chain.from;
    //         }
    //         //console.log(str + (tailCycle ? " tail" : " non-tail"));

    //         // We found a cycle so it's certainly recursive
    //         self.isRecursive = true;

    //         // If we found a non-tail cycle, it's not tail recursive
    //         if (!tailCycle){
    //             self.constantStackSpace = false;
    //             if (!self.nonTailCycles){
    //                 self.nonTailCycles = [];
    //             }
    //             self.nonTailCycles.push(search.chain);
    //             self.nonTailCycle = search.chain;
    //             self.nonTailCycleReason = str;

    //             if(!self.nonTailCycleCalls){
    //                 self.nonTailCycleCalls = [];
    //             }
    //             self.nonTailCycleCalls.pushAll(nonTailCycleCalls);
    //         }
    //     },{
    //         searchType: "dfs"
    //     });
    //     //console.log("");
    //     //console.log("");

    //     self.tailRecursionAnalysisDone = true;


    //     // TODO: fix this to not use semanticProblems
    //     // this.semanticProblems.addWidget(RecursiveFunctionAnnotation.instance(this));
    // },

    // isTailChild : function(child){
    //     if (child !== this.body){
    //         return {isTail: false};
    //     }
    //     else if (this.autosToDestruct.length > 0){
    //         return {
    //             isTail: false,
    //             reason: "The highlighted local variables ("

    //             +
    //             this.bodyScope.automaticObjects.filter(function(obj){
    //                 return isA(obj.type, Types.Class);
    //             }).map(function(obj){

    //                 return obj.name;

    //             }).join(",")
    //                 +

    //             ") have destructors that will run at the end of the function body (i.e. after any possible recursive call).",
    //             others: this.bodyScope.automaticObjects.filter(function(obj){
    //                 return isA(obj.type, Types.Class);
    //             }).map(function(obj){

    //                 var decl = obj.decl;
    //                 if (isA(decl, Declarator)){
    //                     decl = decl.parent;
    //                 }
    //                 return decl;

    //             })
    //         }
    //     }
    //     else {
    //         return {isTail: true};
    //     }
    // },
    // describe : function(){
    //     var exp = {};
    //     exp.message = "a function definition";
    //     return exp;
    // }
}

/**
 * Attempts to create a `FunctionDeclaration` from the given function definition AST. Note this may
 * return an InvalidConstrucct if the given AST was malformed such that the declarator didn't actually specify
 * a function (e.g. missing parentheses). This is unfortunately allowed by the language grammar, so
 * we have to account for it.
 * @param ast 
 * @param context 
 */
function createFunctionDeclarationFromDefinitionAST(ast: FunctionDefinitionASTNode, context: TranslationUnitContext) {

    // Need to create TypeSpecifier first to get the base type for the declarators
    let typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs, context);
    let baseType = typeSpec.baseType;
    let storageSpec = StorageSpecifier.createFromAST(ast.specs.storageSpecs, context);

    let declarator = Declarator.createFromAST(ast.declarator, context, baseType);
    let declaredType = declarator.type;

    if (!declaredType?.isFunctionType()) {
        return new InvalidConstruct(context, ast, CPPError.declaration.func.definition_non_function_type);
    }
    
    let declAST: SimpleDeclarationASTNode = {
        construct_type: "simple_declaration",
        declarators: [ast.declarator],
        specs: ast.specs,
        source: ast.declarator.source
    };

    // if (declarator.hasConstructorName) {
    //     assert(declaredType.isFunctionType());
    //     assert(declaredType.returnType.isVoidType());
    //     return new ConstructorDeclaration(context, declAST, typeSpec, storageSpec, declarator, ast.specs, <FunctionType<VoidType>>declaredType);
    // }
    // else {
        return new FunctionDeclaration(context, declAST, typeSpec, storageSpec, declarator, ast.specs, declaredType);
    // }

}

export interface TypedFunctionDefinition<T extends FunctionType> extends FunctionDefinition {
    readonly type: T;
    readonly declaration: TypedFunctionDeclaration<T>;
}


export interface CompiledFunctionDefinition<T extends FunctionType = FunctionType> extends TypedFunctionDefinition<T>, SuccessfullyCompiled {
    readonly declaration: CompiledFunctionDeclaration<T>;
    readonly name: string;
    readonly parameters: readonly CompiledParameterDeclaration[];
    readonly body: CompiledBlock;
}




export class ClassDeclaration extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    public readonly construct_type = "class_declaration";

    public readonly name: string;
    public readonly key: ClassKey;
    public readonly type: PotentiallyCompleteClassType;
    public readonly declaredEntity: ClassEntity;

    public constructor(context: TranslationUnitContext, name: string, key: ClassKey) {
        super(context, undefined);

        this.name = name;
        this.key = key;

        this.declaredEntity = new ClassEntity(this);
        this.type = this.declaredEntity.type;

        let entityOrError = context.contextualScope.declareClassEntity(this.declaredEntity);

        if (entityOrError instanceof ClassEntity) {
            this.declaredEntity = entityOrError;
        }
        else {
            this.addNote(entityOrError);
        }


    }
}

export interface TypedClassDeclaration<T extends PotentiallyCompleteClassType> extends ClassDeclaration, SuccessfullyCompiled {
    readonly type: T;
}

export interface CompiledClassDeclaration<T extends PotentiallyCompleteClassType = PotentiallyCompleteClassType> extends TypedClassDeclaration<T>, SuccessfullyCompiled {

}


export type ClassKey = "struct" | "class";
export interface ElaboratedTypeSpecifierASTNode extends ASTNode {
    readonly construct_type: "elaborated_type_specifier";
    readonly classKey: ClassKey;
    readonly name: IdentifierASTNode;
}

export interface ClassHeadASTNode extends ASTNode {
    readonly construct_type: "class_head";
    readonly classKey: ClassKey;
    readonly name: IdentifierASTNode;
    readonly bases: readonly BaseSpecifierASTNode[];
}

export interface BaseSpecifierASTNode extends ASTNode {
    readonly name: string;
    readonly virtual?: true;
    readonly access?: AccessSpecifier;
}

export interface ClassDefinitionASTNode extends ASTNode {
    readonly construct_type: "class_definition";
    readonly head: ClassHeadASTNode;
    readonly memberSpecs: readonly MemberSpecificationASTNode[];
}

export type AccessSpecifier = "private" | "protected" | "public";
export interface MemberSpecificationASTNode extends ASTNode {
    readonly construct_type: "member_specification";
    readonly access?: AccessSpecifier;
    readonly members: readonly MemberDeclarationASTNode[];
}

export type MemberDeclarationASTNode =
    MemberSimpleDeclarationASTNode |
    FunctionDefinitionASTNode;

export interface MemberSimpleDeclarationASTNode extends ASTNode {
    readonly construct_type: "simple_member_declaration";
    readonly specs: DeclarationSpecifiersASTNode;
    readonly declarators: readonly DeclaratorInitASTNode[];
}

export interface CtorInitializerASTNode extends ASTNode {
    readonly construct_type: "ctor_initializer";
    readonly initializers: readonly MemberInitializerASTNode[];
}

export interface MemberInitializerASTNode extends ASTNode {
    readonly construct_type: "member_initializer";
    readonly member: IdentifierASTNode;
    readonly args: readonly ExpressionASTNode[];
}

export class ClassDefinition extends BasicCPPConstruct<ClassContext, ClassDefinitionASTNode> {
    public readonly construct_type = "class_definition";

    // public readonly name: number = 2;
    public readonly declaration: ClassDeclaration;
    public readonly name: string;
    public readonly type: CompleteClassType;

    public readonly baseSpecifiers: readonly BaseSpecifier[];
    public readonly memberDeclarations: readonly MemberDeclaration[];
    
    public readonly baseClass?: CompleteClassType;
    
    public readonly memberObjects: readonly MemberObjectEntity[] = [];
    public readonly memberReferences: readonly MemberReferenceEntity[] = [];
    
    public readonly constructors: readonly FunctionEntity[];
    public readonly defaultConstructor?: FunctionEntity;

    public readonly destructor?: FunctionEntity;
    
    public readonly objectSize: number;

    public readonly inlineMemberFunctionDefinitions: readonly FunctionDefinition[] = [];

    private readonly implicitPublicContext: MemberSpecificationContext;
    
    //     public readonly members: MemberVariableDeclaration | MemberFunctionDeclaration | MemberFunctionDefinition;


    // export interface SimpleDeclarationASTNode extends ASTNode {
    //     readonly construct_type: "simple_declaration";
    //     readonly specs: DeclarationSpecifiersASTNode;
    //     readonly declarators: readonly DeclaratorInitASTNode[];
    // }

    public static createFromAST(ast: ClassDefinitionASTNode, tuContext: TranslationUnitContext) {

        let classKey = ast.head.classKey;

        // Default access level is private for class, public for struct
        let defaultAccessLevel: AccessSpecifier = (classKey === "class" ? "private" : "public");

        // Base specifiers are NOT created in the class context, since the base class
        // entity it refers to is looked up without regard to what follows in the class.
        // (And if it were dependent on the class scope, which is dependent on the base
        // class scope, etc. there's circular problems.)
        let bases = ast.head.bases.map(
            baseAST => BaseSpecifier.createFromAST(baseAST, tuContext, defaultAccessLevel));

        let declaration = new ClassDeclaration(tuContext, ast.head.name.identifier, classKey);

        // Create class context based on class entity from the declaration
        let classContext = createClassContext(tuContext, declaration.declaredEntity, bases[0]?.baseEntity);

        let memDecls : MemberDeclaration[] = []
        let functionDefsToCompile : [FunctionDefinitionASTNode, MemberSpecificationContext, FunctionDeclaration][] = [];

        // Create and compile declarations for all members
        ast.memberSpecs.forEach(memSpec => {
            // This outer forEach goes through all "sections" of public, private, etc.

            // Access level is as specified or the default
            let accessLevel = memSpec.access ?? defaultAccessLevel;
            let memberSpecContext = createMemberSpecificationContext(classContext, accessLevel);

            // Compilation of a class definition occurs in two phases. First, declarations are
            // compiled from top to bottom, such that order of declaration is significant. However,
            // the definitions for functions that are defined inline are not compiled at this point
            // and are instead compiled in a second phase. This allows the order of declaration of
            // members to not matter with respect to places they are used inside the definition of
            // other members, e.g. calling one member function within another member function's body.

            // Phase 1: Initially create member declarations. This will NOT create/compile definitions.

            memSpec.members.forEach((memberAST) => {
                let decls = createMemberDeclarationFromAST(memberAST, memberSpecContext);
                if (Array.isArray(decls)) {
                    decls.forEach(memDecl => memDecls.push(memDecl))
                }
                else {
                    memDecls.push(decls);
                    if (decls.construct_type === "function_declaration" && memberAST.construct_type === "function_definition") {
                        functionDefsToCompile.push([memberAST, memberSpecContext, decls]);
                    }
                }
            });

        });

        // Create the actual class definition. This should exist before compiling member
        // function definitions, in line with the treatment of the class type as complete
        // inside those definitions.
        let classDef = new ClassDefinition(classContext, ast, declaration, bases, memDecls);

        // Phase 2: Go back through and compile member function definitions, and let the
        // class know about them
        functionDefsToCompile.forEach(([defAST, memberSpecContext, decl]) => {
           classDef.attachInlineFunctionDefinition(FunctionDefinition.createFromAST(defAST, memberSpecContext, decl));
        });

        return classDef;
    }

    public constructor(context: ClassContext, ast: ClassDefinitionASTNode | undefined, declaration: ClassDeclaration, baseSpecs: readonly BaseSpecifier[], memberDeclarations: readonly MemberDeclaration[]) {
        super(context, ast);

        this.name = declaration.name;
        this.implicitPublicContext = createImplicitContext(createMemberSpecificationContext(context, "public"));

        this.attach(this.declaration = declaration);

        this.attachAll(this.baseSpecifiers = baseSpecs);
        
        if (baseSpecs.length > 0 && baseSpecs[0].baseEntity?.isComplete()) {
            this.baseClass = baseSpecs[0].baseEntity.type;
        }

        if (baseSpecs.length > 1) {
            this.addNote(CPPError.class_def.multiple_inheritance(this));
        }

        this.attachAll(this.memberDeclarations = memberDeclarations);

        // Identify member objects and member references
        this.memberDeclarations.forEach(decl => {
            if (decl.construct_type === "member_variable_declaration") {
                if (decl.declaredEntity instanceof MemberObjectEntity) {
                    asMutable(this.memberObjects).push(decl.declaredEntity);
                }
                else {
                    asMutable(this.memberReferences).push(decl.declaredEntity);
                }
            }
        });

        // CONSTRUCTORS
        this.constructors = [];
        memberDeclarations.forEach(mem => {
            if (mem.construct_type === "function_declaration" && mem.isConstructor) {
                // Need to check for redeclaration here since the constructors don't get
                // added to a scope where we would normally detect that.
                if (this.constructors.some(prevCtor => prevCtor.type.sameSignature(mem.type))) {
                    mem.addNote(CPPError.declaration.ctor.previous_declaration(mem));
                }
                else {
                    let ctorEntity = mem.declaredEntity;
                    // Only add the unique ones to the list of constructors.
                    // If we allowed duplicates with the same signature, it might
                    // cause headaches later when e.g. this list is used as a set
                    // of candidates for overload resolution.
                    asMutable(this.constructors).push(ctorEntity);

                    if (ctorEntity.type.paramTypes.length === 0) {
                        (<Mutable<this>>this).defaultConstructor = ctorEntity;
                    }
                }
            }
        });

        this.createImplicitlyDefinedDefaultConstructorIfAppropriate();


        // Compute size of objects of this class
        let size = 0;
        if (this.baseClass) {
            size += this.baseClass.size;
        }
        this.memberObjects.forEach(mem => size += mem.type.size);
        this.objectSize = size;

        // Set the definition for our declared entity, which also 
        this.declaration.declaredEntity.setDefinition(this);
        assert(declaration.type.isCompleteClassType());
        this.type = declaration.type;

        this.context.program.registerClassDefinition(this.declaration.declaredEntity.qualifiedName, this);
    }

    public attachInlineFunctionDefinition(def: FunctionDefinition) {
        asMutable(this.inlineMemberFunctionDefinitions).push(def);
        this.attach(def);
    }

    private createImplicitlyDefinedDefaultConstructorIfAppropriate() {

        // If there are any user-provided ctors, do not create the implicit
        // default constructor.
        if (this.constructors.some(ctor => !ctor.firstDeclaration.context.implicit)) {
            return;
        }

        // If any data members are of reference type, do not create the
        // implicit default constructor. (This would need to change if
        // member variable initializers are added.)
        if (this.memberReferences.length > 0) {
            return;
        }

        // If base class is not default constructible
        if (this.baseClass && !this.baseClass.isDefaultConstructible()) {
            return;
        }

        // If base class is not default destructible
        if (this.baseClass && !this.baseClass.isDestructible()) {
            return;
        }

        // If any members are not default constructible
        if (this.memberObjects.some(memObj => !memObj.type.isDefaultConstructible())) {
            return;
        }

        // If any members are not destructible
        if (this.memberObjects.some(memObj => !memObj.type.isDefaultConstructible())) {
            return;
        }
        

        // If any const data members do not have a user-provided
        // default constructor, do not create the implicitly default constructor
        // (this includes const non-class type objects).
        // ^That's the language from the spec. But the basic idea of it is that
        // we don't want any const members being default-initialized unless it's
        // done in a way the user specified (e.g. atomic objects are initialized
        // with junk, which is permanent since they're const).
        if (this.memberObjects.some(memObj => !memObj.type.isDefaultConstructible(true))) {
            return;
        }

        let src = `${this.name}() {}`;
        let iddc = <FunctionDefinition>FunctionDefinition.createFromAST(
            parseFunctionDefinition(src),
            this.implicitPublicContext);
        this.attach(iddc);
        (<Mutable<this>>this).defaultConstructor = iddc.declaration.declaredEntity;
        asMutable(this.constructors).push(iddc.declaration.declaredEntity);
    }

    //     compileDeclaration : function(){
    //         var ast = this.ast;


    //         // Check that no other type with the same name already exists
    //         try {
    // //            console.log("addingEntity " + this.name);
    //             // class type. will be incomplete initially, but made complete at end of class declaration
    //             this.type = Types.Class.createClassType(this.name, this.contextualScope, this.base && this.base.type, []);
    //             this.classTypeClass = this.type;

    //             this.classScope = this.type.classScope;

    //             this.entity = TypeEntity.instance(this);

    //             this.entity.setDefinition(this); // TODO add exception that allows a class to be defined more than once

    //             this.contextualScope.addDeclaredEntity(this.entity);
    //         }
    //         catch(e){
    //             if (isA(e, Note)){
    //                 this.addNote(e);
    //                 return;
    //             }
    //             else {
    //                 throw e;
    //             }
    //         }




    //         // Compile the members



    //         // If there are no constructors, then we need an implicit default constructor
    //         if(this.type.constructors.length == 0){
    //             var idc = this.createImplicitDefaultConstructor();
    //             if (idc){
    //                 idc.compile();
    //                 assert(!idc.hasErrors());
    //             }
    //         }

    //         let hasCopyConstructor = false;
    //         for(var i = 0; i < this.type.constructors.length; ++i){
    //             if (this.type.constructors[i].decl.isCopyConstructor){
    //                 hasCopyConstructor = true;
    //                 break;
    //             }
    //         }


    //         var hasUserDefinedAssignmentOperator = this.type.hasMember("operator=", {paramTypes: [this.type], isThisConst:false});

    //         // Rule of the Big Three
    //         var bigThreeYes = [];
    //         var bigThreeNo = [];
    //         (hasCopyConstructor ? bigThreeYes : bigThreeNo).push("copy constructor");
    //         (hasUserDefinedAssignmentOperator ? bigThreeYes : bigThreeNo).push("assignment operator");
    //         (this.type.destructor ? bigThreeYes : bigThreeNo).push("destructor");

    //         if (0 < bigThreeYes.length && bigThreeYes.length < 3){
    //             // If it's only because of an empty destructor, suppress warning
    //             if (bigThreeYes.length === 1 && this.type.destructor && this.type.destructor.decl.emptyBody()){

    //             }
    //             else{
    //                 this.addNote(CPPError.class_def.big_three(this, bigThreeYes, bigThreeNo));
    //             }
    //         }

    //         this.customBigThree = bigThreeYes.length > 0;

    //         if (!hasCopyConstructor) {
    //             // Create implicit copy constructor
    //             var icc = this.createImplicitCopyConstructor();
    //             if (icc) {
    //                 icc.compile();
    //                 assert(!icc.hasErrors());
    //             }
    //         }

    //         if (!this.type.destructor) {
    //             // Create implicit destructor
    //             var idd = this.createImplicitDestructor();
    //             if (idd) {
    //                 idd.compile();
    //                 assert(!idd.hasErrors());
    //             }
    //         }
    //         if (!hasUserDefinedAssignmentOperator){

    //             // Create implicit assignment operator
    //             var iao = this.createImplicitAssignmentOperator();
    //             if (iao){
    //                 iao.compile();
    //                 assert(!iao.hasErrors());
    //             }
    //         }
    //     },





    //     createImplicitCopyConstructor : function(){
    //         var self = this;
    //         // If any subobjects are missing a copy constructor, do not create implicit copy ctor
    //         if (!this.type.subobjectEntities.every(function(subObj){
    //                 return !isA(subObj.type, Types.Class) ||
    //                     subObj.type.getCopyConstructor(subObj.type.isConst);
    //             })){
    //             return;
    //         }

    //         // If any subobjects are missing a destructor, do not create implicit copy ctor
    //         if (!this.type.subobjectEntities.every(function(subObj){
    //                 return !isA(subObj.type, Types.Class) ||
    //                     subObj.type.destructor;
    //             })){
    //             return;
    //         }

    //         var src = this.name + "(const " + this.name + " &other)";

    //         if (this.type.subobjectEntities.length > 0){
    //             src += "\n : ";
    //         }
    //         src += this.type.baseClassEntities.map(function(subObj){
    //             return subObj.type.className + "(other)";
    //         }).concat(this.type.memberEntities.map(function(subObj){
    //             return subObj.name + "(other." + subObj.name + ")";
    //         })).join(", ");

    //         src += " {}";
    //         src = Lobster.cPlusPlusParser.parse(src, {startRule:"member_declaration"});

    //         return ConstructorDefinition.instance(src, {parent:this, scope: this.classScope, containingClass: this.type, access:"public", implicit:true});
    //     },

    //     createImplicitAssignmentOperator : function () {
    //         var self = this;
    //         // Parameter will only be const if all subobjects have assignment ops that take const params
    //         var canMakeConst = this.type.subobjectEntities.every(function(subObj){
    //             return !isA(subObj.type, Types.Class) ||
    //                 subObj.type.getAssignmentOperator(true);
    //         });

    //         var canMakeNonConst = canMakeConst || this.type.subobjectEntities.every(function(subObj){
    //             return !isA(subObj.type, Types.Class) ||
    //                 subObj.type.getAssignmentOperator(false);
    //         });

    //         // If we can't make non-const, we also can't make const, and we can't make any implicit assignment op
    //         if (!canMakeNonConst){
    //             return;
    //         }
    //         var constPart = canMakeConst ? "const " : "";

    //         // If any data member is a reference, we can't make implicit assignment operator
    //         if (!this.type.memberSubobjectEntities.every(function(subObj){
    //                 return !isA(subObj.type, Types.Reference);
    //             })){
    //             return;
    //         }

    //         // If any non-class member is const (or array thereof), we can't make implicit assignment operator
    //         if (!this.type.memberSubobjectEntities.every(function(subObj){
    //                 //return (isA(subObj.type, Types.Class) || !subObj.type.isConst)
    //                 //    && (!isA(subObj.type, Types.Array) || isA(subObj.type.elemType, Types.Class) || !subObj.type.elemType.isConst);
    //                 return !subObj.type.isConst
    //                     && (!isA(subObj.type, Types.Array) || !subObj.type.elemType.isConst);
    //             })){
    //             return;
    //         }

    //         var src = this.name + " &operator=(" + constPart + this.name + " &rhs){";

    //         src += this.type.baseClassEntities.map(function(subObj){
    //             return subObj.type.className + "::operator=(rhs);";
    //         }).join("\n");

    //         var mems = this.type.memberSubobjectEntities;
    //         for(var i = 0; i < mems.length; ++i){
    //             var mem = mems[i];
    //             if (isA(mem.type, Types.Array)){
    //                 var tempType = mem.type;
    //                 var subscriptNum = isA(tempType.elemType, Types.Array) ? 1 : "";
    //                 var subscripts = "";
    //                 var closeBrackets = "";
    //                 while(isA(tempType, Types.Array)){
    //                     src += "for(int i"+subscriptNum+"=0; i"+subscriptNum+"<"+tempType.length+"; ++i"+subscriptNum+"){";
    //                     subscripts += "[i"+subscriptNum+"]";
    //                     closeBrackets += "}";
    //                     tempType = tempType.elemType;
    //                     subscriptNum += 1;
    //                 }
    //                 src += mem.name + subscripts + " = rhs." + mem.name + "" + subscripts + ";";
    //                 src += closeBrackets;
    //             }
    //             else{
    //                 src += mems[i].name + " = rhs." + mems[i].name + ";";
    //             }
    //         }
    //         src += "return *this;}";
    //         src = Lobster.cPlusPlusParser.parse(src, {startRule:"member_declaration"});
    //         return FunctionDefinition.instance(src, {parent:this, scope: this.classScope, containingClass: this.type, access:"public", implicit:true});
    //     },

    //     createImplicitDestructor : function(){
    //         var self = this;
    //         // If any subobjects are missing a destructor, do not create implicit destructor
    //         if (!this.type.subobjectEntities.every(function(subObj){
    //                 return !isA(subObj.type, Types.Class) ||
    //                     subObj.type.destructor;
    //             })){
    //             return;
    //         }

    //         var src = "~" + this.type.name + "(){}";
    //         src = Lobster.cPlusPlusParser.parse(src, {startRule:"member_declaration"});
    //         return DestructorDefinition.instance(src, {parent:this, scope: this.classScope, containingClass: this.type, access:"public", implicit:true});
    //     },

    //     createInstance : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //         return RuntimeConstruct.instance(sim, this, {decl:0, step:"decl"}, "stmt", inst);
    //     },

    //     upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){

    //     },

    //     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){

    //     }

    public isSuccessfullyCompiled() : this is CompiledClassDefinition {
        return super.isSuccessfullyCompiled()
    }
}

export interface TypedClassDefinition<T extends CompleteClassType> extends ClassDefinition, SuccessfullyCompiled {
    readonly type: T;
    readonly declaration: TypedClassDeclaration<T>;
}

export interface CompiledClassDefinition<T extends CompleteClassType = CompleteClassType> extends TypedClassDefinition<T>, SuccessfullyCompiled {
    readonly declaration: CompiledClassDeclaration<T>;
    readonly baseSpecifiers: readonly CompiledBaseSpecifier[];
    // readonly memberDeclarations: readonly CompiledMemberDeclaration[]; // TODO
}

export class BaseSpecifier extends BasicCPPConstruct<TranslationUnitContext, BaseSpecifierASTNode> {
    public readonly construct_type = "base_specifier";

    public readonly name: string;
    public readonly accessLevel: AccessSpecifier;
    public readonly virtual: boolean;
    public readonly baseEntity?: ClassEntity;

    public constructor(context: TranslationUnitContext, ast: BaseSpecifierASTNode, defaultAccessLevel: AccessSpecifier) {
        super(context, ast);
        this.name = ast.name;
        this.accessLevel = ast.access ?? defaultAccessLevel;
        this.virtual = !!ast.virtual;

        if (this.virtual) {
            this.addNote(CPPError.class_def.virtual_inheritance(this));
        }

        checkIdentifier(this, name, this);

        let lookupResult = this.context.contextualScope.lookup(this.name);

        if (!lookupResult) {
            this.addNote(CPPError.iden.not_found(this, this.name));
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
    readonly baseEntity: ClassEntity;
}

export class MemberVariableDeclaration extends VariableDefinitionBase<MemberSpecificationContext> {
    public readonly construct_type = "member_variable_declaration";

    public readonly type: ObjectType | ReferenceType;
    public readonly declaredEntity: MemberObjectEntity<ObjectType> | MemberReferenceEntity<ObjectType>;

    public constructor(context: MemberSpecificationContext, ast: MemberSimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers, type: ObjectType | ReferenceType) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        this.type = type;

        this.declaredEntity =
            type.isReferenceType() ? new MemberReferenceEntity(type.refTo, this) : new MemberObjectEntity(type, this);

        // Attempt to add the declared entity to the scope. If it fails, note the error.
        let entityOrError = context.contextualScope.declareVariableEntity(this.declaredEntity);

        if (entityOrError instanceof MemberObjectEntity || entityOrError instanceof MemberReferenceEntity) {
            this.declaredEntity = entityOrError;
            
            // No need to "register" the member declaration here as we might "register" a local
            // variable definition with its containing function, since they will be accounted
            // for when the class definition is created from the list of member declarations
        }
        else {
            this.addNote(entityOrError);
        }
    }

    protected initializerWasSet(init: Initializer) {
        // Default initializers are allowed
        if (!(init instanceof DefaultInitializer)) {
            this.addNote(CPPError.lobster.unsupported_feature(this, "member variable initializers"));
        }
    }

}

export interface TypedMemberVariableDeclaration<T extends ObjectType | ReferenceType> extends MemberVariableDeclaration {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
    readonly declaredEntity: MemberObjectEntity<NoRefType<T>> | MemberReferenceEntity<NoRefType<T>>;
}

export interface CompiledMemberVariableDeclaration<T extends ObjectType | ReferenceType = ObjectType | ReferenceType> extends TypedMemberVariableDeclaration<T>, SuccessfullyCompiled {

    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly storageSpecifier: CompiledStorageSpecifier;
    readonly declarator: CompiledDeclarator<T>;

    readonly initializer?: CompiledInitializer<NoRefType<T>>;
}



/**
 * This class represents a declaration of a member variable with incomplete type. Such a declaration is
 * ill-formed, because necessary details (such as object size) are missing from an incomplete type.
 * As such, this class always compiles with an error and does not create any entities. In effect,
 * the attempted declaration of such a member variable is acknowledged, but the member variable
 * is otherwise ignored as if it was never declared.
 */
export class IncompleteTypeMemberVariableDeclaration extends SimpleDeclaration<TranslationUnitContext> {
    public readonly construct_type = "incomplete_type_member_variable_declaration";

    public readonly type: IncompleteType;
    public readonly declaredEntity: undefined;

    public constructor(context: MemberSpecificationContext, ast: MemberSimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers, type: IncompleteType) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        this.type = type;

        this.addNote(CPPError.declaration.member.incomplete_type_declaration_prohibited(this));
    }
}

export interface TypedIncompleteTypeMemberVariableDeclaration<T extends IncompleteType> extends IncompleteTypeMemberVariableDeclaration {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
}

// export var MemberDeclaration = SimpleDeclaration.extend({
//     _name: "MemberDeclaration",
//     init: function(ast, context){
//         assert(context);
//         assert(isA(context.containingClass, Types.Class));
//         assert(context.hasOwnProperty("access"));
//         this.initParent(ast, context);
//     },

//     i_createFromAST : function(ast, context) {
//         MemberDeclaration._parent.i_createFromAST.apply(this, arguments);
//         this.access = context.access;
//         this.i_containingClass = context.containingClass;
//     },

//     i_determineStorage : function(){
//         // Determine storage duration based on the kind of scope in which the declaration
//         // occurs and any storage specifiers.
//         if(this.storageSpec.static){
//             this.storageDuration = "static";
//         }
//         else{
//             this.storageDuration = "automatic";
//         }
//     },

//     makeEntity: function(decl){

//         // Note: we know it's not a function definition because that goes to the FunctionDefinition
//         // class.  Thus any functions are not definitions.
//         // Don't have to check for classes, for similar reasons.
//         var isDefinition = !isA(decl.type, Types.Function)
//             && !(this.storageSpec.extern && !(decl.initializer || decl.initializerList))
//             && !this.typedef;

//         this.isDefinition = isDefinition;

//         var entity;
//         if (isA(decl.type, Types.Function)){
//             entity = MemberFunctionEntity.instance(decl, this.i_containingClass, this.virtual);
//         }
//         else if (this.storageDuration === "static"){
//             entity = StaticEntity.instance(decl);
//         }
//         else{
//             entity = MemberVariableEntity.instance(decl, this.i_containingClass);
//             this.isDefinition = false; // TODO NEW: This is a hack. Since implementing a proper linking phase, static stuff may be broken.
//         }

//         if (this.isDefinition) {
//             entity.setDefinition(this);
//         }

//         try {
//             this.entities.push(entity);
//             var options = {own: true};
//             if (isA(entity, MemberFunctionEntity)) {
//                 options.paramTypes = entity.type.paramTypes;
//                 options.exactMatch = true;
//                 options.noBase = true;
//             }
//             if ((isA(entity, MemberVariableEntity) || isA(entity, MemberFunctionEntity))){
//                 // We don't check if a conflicting member already exists here - that will be
//                 // done inside addMember and an exception will be thrown if there is a conflict
//                 this.i_containingClass.addMember(entity); // this internally adds it to the class scope
//             }
//             return entity;
//         }
//         catch(e) {
//             if (isA(e, Note)){
//                 this.addNote(e);
//                 return null;
//             }
//             else {
//                 throw e;
//             }
//         }
//     }
// });


// export var ConstructorDefinition = FunctionDefinition.extend({
//     _name: "ConstructorDefinition",

//     i_childrenToExecute: ["memberInitializers", "body"], // TODO: why do regular functions have member initializers??


//     instance : function(ast, context){
//         assert(context);
//         assert(isA(context.containingClass, Types.Class));
//         assert(context.hasOwnProperty("access"));
//         // Make sure it's actually a constructor
//         if (ast.name.identifier !== context.containingClass.className){
//             // oops was actually a function with missing return type
//             return FunctionDefinition.instance(ast, context);
//         }

//         return ConstructorDefinition._parent.instance.apply(this, arguments);
//     },

//     compileDeclaration : function() {
//         FunctionDefinition.compileDeclaration.apply(this, arguments);

//         if (!this.hasErrors()){
//             this.i_containingClass.addConstructor(this.entity);
//         }
//     },

//     compileDeclarator : function(){
//         var ast = this.ast;


//         // NOTE: a constructor doesn't have a "name", and so we don't need to add it to any scope.
//         // However, to make lookup easier, we give all constructors their class name plus the null character. LOL
//         // TODO: this is silly. remove it pls :)
//         this.name = this.i_containingClass.className + "\0";

//         // Compile the parameters
//         var args = this.ast.args;
//         this.params = [];
//         this.paramTypes = [];
//         for (var j = 0; j < args.length; ++j) {
//             var paramDecl = Parameter.instance(args[j], {parent: this, scope: this.bodyScope});
//             paramDecl.compile();
//             this.params.push(paramDecl);
//             this.paramTypes.push(paramDecl.type);
//         }
//         this.isDefaultConstructor = this.params.length == 0;

//         this.isCopyConstructor = this.params.length == 1
//         && (isA(this.paramTypes[0], this.i_containingClass) ||
//         isA(this.paramTypes[0], Types.Reference) && isA(this.paramTypes[0].refTo, this.i_containingClass));


//         // Give error for copy constructor that passes by value
//         if (this.isCopyConstructor && isA(this.paramTypes[0], this.i_containingClass)){
//             this.addNote(CPPError.declaration.ctor.copy.pass_by_value(this.params[0], this.paramTypes[0], this.params[0].name));
//         }

//         // I know this is technically wrong but I think it makes things run smoother
//         this.type = Types.Function.instance(Types.Void.instance(), this.paramTypes);
//     },

//     compileDefinition : function(){
//         var self = this;
//         var ast = this.ast;

//         if (!ast.body){
//             this.addNote(CPPError.class_def.ctor_def(this));
//             return;
//         }

//         this.compileCtorInitializer();

//         // Call parent class version. Will handle body, automatic object destruction, etc.
//         FunctionDefinition.compileDefinition.apply(this, arguments);
//     },

//     compileCtorInitializer : function(){
//         var memInits = this.ast.initializer || [];

//         // First, check to see if this is a delegating constructor.
//         // TODO: check on whether someone could techinically declare a member variable with the same name
//         // as the class and how that affects the logic here.
//         var targetConstructor = null;
//         for(var i = 0; i < memInits.length; ++i){
//             if (memInits[i].member.identifier == this.i_containingClass.className){
//                 targetConstructor = i;
//                 break;
//             }
//         }

//         // It is a delegating constructor
//         if (targetConstructor !== null){
//             targetConstructor = memInits.splice(targetConstructor, 1)[0];
//             // If it is a delegating constructor, there can be no other memInits
//             if (memInits.length === 0){ // should be 0 since one removed
//                 var mem = MemberInitializer.instance(targetConstructor, {parent: this, scope: this.bodyScope});
//                 mem.compile(ReceiverEntity.instance(this.i_containingClass));
//                 this.memberInitializers.push(mem);
//             }
//             else{
//                 this.addNote(CPPError.declaration.ctor.init.delegating_only(this));
//             }
//             return;
//         }

//         // It is a non-delegating constructor

//         // If there is a base class subobject, initialize it
//         var base;
//         if (base = this.i_containingClass.getBaseClass()){
//             // Check to see if there is a base class initializer.
//             var baseInits = memInits.filter(function(memInit){
//                 return memInit.member.identifier === base.className;
//             });
//             memInits = memInits.filter(function(memInit){
//                 return memInit.member.identifier !== base.className;
//             });

//             if (baseInits.length > 1){
//                 this.addNote(CPPError.declaration.ctor.init.multiple_base_inits(this));
//             }
//             else if (baseInits.length === 1){
//                 var mem = MemberInitializer.instance(baseInits[0], {parent: this, scope: this.bodyScope});
//                 mem.compile(this.i_containingClass.baseClassEntities[0]);
//                 this.memberInitializers.push(mem);
//             }
//             else{
//                 var mem = DefaultMemberInitializer.instance(this.ast, {parent: this, scope: this.bodyScope});
//                 mem.compile(this.i_containingClass.baseClassEntities[0]);
//                 this.memberInitializers.push(mem);
//                 mem.isMemberInitializer = true;
//             }
//         }

//         // Initialize non-static data members of the class

//         // Create a map of name to initializer. Initially all initializers are null.
//         var initMap = {};
//         this.i_containingClass.memberSubobjectEntities.forEach(function(objMember){
//             initMap[objMember.name] = objMember;
//         });

//         // Iterate through all the member initializers and associate them with appropriate member
//         for(var i = 0; i < memInits.length; ++i){
//             var memInit = memInits[i];

//             // Make sure this type has a member of the given name
//             var memberName = memInit.member.identifier;
//             if (initMap.hasOwnProperty(memberName)) {
//                 var mem = MemberInitializer.instance(memInit, {parent: this, scope: this.bodyScope});
//                 mem.compile(initMap[memberName]);
//                 initMap[memberName] = mem;
//             }
//             else{
//                 this.addNote(CPPError.declaration.ctor.init.improper_member(this, this.i_containingClass, memberName));
//             }
//         }

//         // Now iterate through members again in declaration order. Add associated member initializer
//         // from above or default initializer if there wasn't one.

//         var self = this;
//         this.i_containingClass.memberSubobjectEntities.forEach(function(objMember){
//             if (isA(initMap[objMember.name], MemberInitializer)){
//                 self.memberInitializers.push(initMap[objMember.name]);
//             }
//             else if (isA(objMember.type, Types.Class) || isA(objMember.type, Types.Array)){
//                 var mem = DefaultMemberInitializer.instance(self.ast, {parent: self, scope: self.bodyScope});
//                 mem.compile(objMember);
//                 self.memberInitializers.push(mem);
//                 mem.isMemberInitializer = true;
//             }
//             else{
//                 // No need to do anything for non-class types since default initialization does nothing
//             }
//         });
//     },

//     isTailChild : function(child){
//         return {isTail: false};
//     },

//     describe : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var desc = {};
//         if (this.isDefaultConstructor){
//             desc.message = "the default constructor for the " + this.i_containingClass.className + " class";
//         }
//         else if (this.isCopyConstructor){
//             desc.message = "the copy constructor for the " + this.i_containingClass.className + " class";
//         }
//         else{
//             desc.message = "a constructor for the " + this.i_containingClass.className + " class";
//         }
//         return desc
//     }
// });







// export var DestructorDefinition = FunctionDefinition.extend({
//     _name: "DestructorDefinition",

//     init : function(ast, context){
//         assert(context);
//         assert(isA(context.containingClass, Types.Class));
//         assert(context.hasOwnProperty("access"));
//         this.initParent(ast, context);
//         this.access = context.access;
//         this.i_containingClass = context.containingClass;
//     },

//     compileDeclaration : function() {
//         FunctionDefinition.compileDeclaration.apply(this, arguments);
//         this.i_containingClass.addDestructor(this.entity);
//     },

//     compileDeclarator : function() {
//         var ast = this.ast;


//         // Destructors do have names and can be found via name lookup
//         this.name = "~" + this.i_containingClass.className;

//         this.virtual = this.ast.virtual;

//         // There are no parameters for a destructor
//         this.params = [];
//         this.paramTypes = [];

//         // I know this is technically wrong but I think it makes things run smoother
//         this.type = Types.Function.instance(Types.Void.instance(), this.paramTypes);
//     },

//     compileDefinition: function(){
//         var self = this;
//         var ast = this.ast;


//         if (!ast.body){
//             this.addNote(CPPError.class_def.dtor_def(this));
//             return;
//         }

//         // Call parent class version. Will handle body, automatic object destruction, etc.
//         FunctionDefinition.compileDefinition.apply(this, arguments);

//         this.membersToDestruct = this.i_containingClass.memberSubobjectEntities.filter(function(entity){
//             return isA(entity.type, Types.Class);
//         }).map(function(entityToDestruct){
//             var dest = entityToDestruct.type.destructor;
//             if (dest){
//                 var call = FunctionCall.instance({args: []}, {parent: self});
//                 call.compile({
//                     func: dest,
//                     receiver: entityToDestruct});
//                 return call;
//             }
//             else{
//                 self.addNote(CPPError.declaration.dtor.no_destructor_member(entityToDestruct.decl, entityToDestruct, self.i_containingClass));
//             }

//         });

//         this.basesToDestruct = this.i_containingClass.baseClassEntities.map(function(entityToDestruct){
//             var dest = entityToDestruct.type.destructor;
//             if (dest){
//                 var call = FunctionCall.instance({args: []}, {parent: self});
//                 call.compile({
//                     func: dest,
//                     receiver: entityToDestruct});
//                 return call;
//             }
//             else{
//                 self.addNote(CPPError.declaration.dtor.no_destructor_base(entityToDestruct.decl, entityToDestruct, self.i_containingClass));
//             }

//         });
//     },

//     upNext : Class.BEFORE(function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index === "afterChildren") {
//             // These are pushed on a stack and so end up happening
//             // in reverse order of the order they are pushed here.
//             // Autos first, then members, then bases.
//             this.basesToDestruct.forEach(function (dest){
//                 dest.createAndPushInstance(sim, inst);
//             });
//             this.membersToDestruct.forEach(function (dest){
//                 dest.createAndPushInstance(sim, inst);
//             });
//             // Auto destructors are handled in parent class
//         }
//     }),

//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index === "afterDestructors"){
//             inst.index = "done";
//         }
//     },

//     isTailChild : function(child){
//         return {isTail: false};
//     }
// });



export class FunctionDefinitionGroup {
    public readonly name: string;
    private readonly _definitions: FunctionDefinition[];
    public readonly definitions: readonly FunctionDefinition[];

    public constructor(definitions: readonly FunctionDefinition[]) {
        this.name = definitions[0].name;
        this.definitions = this._definitions = definitions.slice();
    }

    public addDefinition(overload: FunctionDefinition) {
        this._definitions.push(overload);
    }
}

export type LinkedDefinition = GlobalVariableDefinition | FunctionDefinitionGroup | ClassDefinition;