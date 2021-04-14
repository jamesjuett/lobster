import { BasicCPPConstruct, SuccessfullyCompiled, InvalidConstruct, TranslationUnitContext, FunctionContext, BlockContext, ClassContext, MemberSpecificationContext, SemanticContext } from "./constructs";
import { ASTNode } from "../ast/ASTNode";
import { Type, VoidType, ArrayOfUnknownBoundType, FunctionType, CompleteObjectType, ReferenceType, PotentialParameterType, CompleteClassType, PotentiallyCompleteClassType, PotentiallyCompleteObjectType, CompleteParameterType, IncompleteObjectType, CompleteReturnType } from "./types";
import { CPPObject } from "./objects";
import { Expression } from "./expressionBase";
import { RuntimeFunction } from "./functions";
import { RuntimeFunctionCall } from "./FunctionCall";
import { StorageSpecifierASTNode, StorageSpecifierKey, TypeSpecifierASTNode, NonMemberSimpleDeclarationASTNode, FunctionDefinitionASTNode, ClassDefinitionASTNode, TopLevelDeclarationASTNode, LocalDeclarationASTNode, MemberSimpleDeclarationASTNode, MemberDeclarationASTNode, SimpleDeclarationASTNode, ParameterDeclarationASTNode, ClassKey, AccessSpecifier, BaseSpecifierASTNode } from "../ast/ast_declarations";
import { DeclaratorASTNode } from "../ast/ast_declarators";
import { CPPEntity, FunctionEntity, ClassEntity, VariableEntity, LocalObjectEntity, LocalReferenceEntity, GlobalObjectEntity, MemberVariableEntity, MemberObjectEntity, MemberReferenceEntity, CompleteClassEntity, ObjectEntityType, BaseSubobjectEntity } from "./entities";
import { QualifiedName, UnqualifiedName, LexicalIdentifier } from "./lexical";
import { Block, CompiledBlock } from "./statements";
import { DirectInitializerASTNode, CopyInitializerASTNode, ListInitializerASTNode } from "../ast/ast_initializers";
import { Initializer, CompiledInitializer, CtorInitializer, CompiledCtorInitializer } from "./initializers";
import { CompiledObjectDeallocator, ObjectDeallocator } from "./ObjectDeallocator";
import { AnalyticConstruct } from "./predicates";
export declare class StorageSpecifier extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    readonly construct_type = "storage_specifier";
    readonly register?: true;
    readonly static?: true;
    readonly thread_local?: true;
    readonly extern?: true;
    readonly mutable?: true;
    readonly isEmpty: boolean;
    static createFromAST(ast: StorageSpecifierASTNode, context: TranslationUnitContext): StorageSpecifier;
    constructor(context: TranslationUnitContext, specs: readonly StorageSpecifierKey[]);
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export interface CompiledStorageSpecifier extends StorageSpecifier, SuccessfullyCompiled {
}
export declare class TypeSpecifier extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    readonly construct_type = "type_specifier";
    readonly const?: true;
    readonly volatile?: true;
    readonly signed?: true;
    readonly unsigned?: true;
    readonly enum?: true;
    readonly typeName?: string;
    readonly baseType?: Type;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
    static createFromAST(ast: TypeSpecifierASTNode, context: TranslationUnitContext): TypeSpecifier;
    constructor(context: TranslationUnitContext, specs: TypeSpecifierASTNode);
}
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
export declare type Declaration = TopLevelSimpleDeclaration | LocalSimpleDeclaration | MemberDeclaration | FunctionDefinition | ClassDeclaration | ClassDefinition | InvalidConstruct;
export declare type TopLevelDeclaration = TopLevelSimpleDeclaration | FunctionDefinition | ClassDefinition | InvalidConstruct;
export declare type TopLevelSimpleDeclaration = NonObjectDeclaration | GlobalVariableDefinition | IncompleteTypeVariableDefinition;
export declare type LocalDeclaration = LocalSimpleDeclaration | FunctionDefinition | ClassDefinition | InvalidConstruct;
export declare type LocalSimpleDeclaration = NonObjectDeclaration | LocalVariableDefinition | IncompleteTypeVariableDefinition;
export declare type MemberDeclaration = MemberSimpleDeclaration | FunctionDefinition | ClassDefinition | InvalidConstruct;
export declare type MemberSimpleDeclaration = NonObjectDeclaration | MemberVariableDeclaration | IncompleteTypeMemberVariableDeclaration;
export declare type NonObjectDeclaration = UnknownTypeDeclaration | VoidDeclaration | TypedefDeclaration | FriendDeclaration | UnknownBoundArrayDeclaration | FunctionDeclaration;
export declare type VariableDefinition = LocalVariableDefinition | GlobalVariableDefinition;
declare const TopLevelDeclarationConstructsMap: {
    simple_declaration: (ast: NonMemberSimpleDeclarationASTNode, context: TranslationUnitContext) => TopLevelSimpleDeclaration[];
    function_definition: (ast: FunctionDefinitionASTNode, context: TranslationUnitContext) => FunctionDefinition | InvalidConstruct;
    class_definition: (ast: ClassDefinitionASTNode, context: TranslationUnitContext) => ClassDefinition;
};
export declare function createTopLevelDeclarationFromAST<ASTType extends TopLevelDeclarationASTNode>(ast: ASTType, context: TranslationUnitContext): ReturnType<(typeof TopLevelDeclarationConstructsMap)[ASTType["construct_type"]]>;
export declare function setInitializerFromAST(declaration: VariableDefinition | MemberVariableDeclaration, initAST: DirectInitializerASTNode | CopyInitializerASTNode | ListInitializerASTNode | undefined, context: TranslationUnitContext): void;
declare const LocalDeclarationConstructsMap: {
    simple_declaration: (ast: NonMemberSimpleDeclarationASTNode, context: BlockContext) => LocalSimpleDeclaration[];
    function_definition: (ast: FunctionDefinitionASTNode, context: BlockContext) => FunctionDefinition | InvalidConstruct;
    class_definition: (ast: ClassDefinitionASTNode, context: BlockContext) => ClassDefinition;
};
export declare function createLocalDeclarationFromAST<ASTType extends LocalDeclarationASTNode>(ast: ASTType, context: BlockContext): ReturnType<(typeof LocalDeclarationConstructsMap)[ASTType["construct_type"]]>;
export declare function createLocalSimpleDeclarationFromAST(ast: NonMemberSimpleDeclarationASTNode, context: TranslationUnitContext): LocalSimpleDeclaration[];
declare const MemberDeclarationConstructsMap: {
    simple_member_declaration: (ast: MemberSimpleDeclarationASTNode, context: MemberSpecificationContext) => MemberSimpleDeclaration[];
    function_definition: (ast: FunctionDefinitionASTNode, context: MemberSpecificationContext) => FunctionDeclaration | InvalidConstruct;
};
export declare function createMemberDeclarationFromAST<ASTType extends MemberDeclarationASTNode>(ast: ASTType, context: MemberSpecificationContext): ReturnType<(typeof MemberDeclarationConstructsMap)[ASTType["construct_type"]]>;
export declare function createMemberSimpleDeclarationFromAST(ast: MemberSimpleDeclarationASTNode, context: MemberSpecificationContext): MemberSimpleDeclaration[];
export declare type AnalyticDeclaration = Declaration | Declarator | ParameterDeclaration;
export declare type TypedDeclarationKinds<T extends Type> = {
    "invalid_construct": T extends undefined ? InvalidConstruct : never;
    "unknown_type_declaration": T extends undefined ? UnknownTypeDeclaration : never;
    "void_declaration": T extends VoidType ? VoidDeclaration : never;
    "storage_specifier": never;
    "typedef_declaration": never;
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
};
export declare type CompiledDeclarationKinds<T extends Type> = {
    "invalid_construct": never;
    "unknown_type_declaration": never;
    "void_declaration": never;
    "storage_specifier": never;
    "typedef_declaration": never;
    "friend_declaration": never;
    "unknown_array_bound_declaration": never;
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
};
export declare type AnalyticTypedDeclaration<C extends AnalyticDeclaration, T extends Type = NonNullable<C["type"]>> = TypedDeclarationKinds<T>[C["construct_type"]];
export declare type AnalyticCompiledDeclaration<C extends AnalyticDeclaration, T extends Type = NonNullable<C["type"]>> = CompiledDeclarationKinds<T>[C["construct_type"]];
export declare abstract class SimpleDeclaration<ContextType extends TranslationUnitContext = TranslationUnitContext> extends BasicCPPConstruct<ContextType, SimpleDeclarationASTNode> {
    readonly typeSpecifier: TypeSpecifier;
    readonly storageSpecifier: StorageSpecifier;
    readonly declarator: Declarator;
    readonly otherSpecifiers: OtherSpecifiers;
    abstract readonly type?: Type;
    readonly name: string;
    readonly initializer?: Initializer;
    abstract readonly declaredEntity?: CPPEntity;
    protected readonly allowsExtern: boolean;
    protected constructor(context: ContextType, ast: SimpleDeclarationASTNode | undefined, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier, declarator: Declarator, otherSpecs: OtherSpecifiers);
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
export declare class UnknownTypeDeclaration extends SimpleDeclaration {
    readonly construct_type = "unknown_type_declaration";
    readonly type: undefined;
    readonly declaredEntity: undefined;
    constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode | MemberSimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier, declarator: Declarator, otherSpecs: OtherSpecifiers);
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export declare class VoidDeclaration extends SimpleDeclaration {
    readonly construct_type = "void_declaration";
    readonly type: VoidType;
    readonly declaredEntity: undefined;
    constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier, declarator: Declarator, otherSpecs: OtherSpecifiers);
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export declare class TypedefDeclaration extends SimpleDeclaration {
    readonly construct_type = "typedef_declaration";
    readonly type: undefined;
    readonly declaredEntity: undefined;
    constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier, declarator: Declarator, otherSpecs: OtherSpecifiers);
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export declare class FriendDeclaration extends SimpleDeclaration {
    readonly construct_type = "friend_declaration";
    readonly type: undefined;
    readonly declaredEntity: undefined;
    constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier, declarator: Declarator, otherSpecs: OtherSpecifiers);
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export declare class UnknownBoundArrayDeclaration extends SimpleDeclaration {
    readonly construct_type = "unknown_array_bound_declaration";
    readonly type: ArrayOfUnknownBoundType;
    readonly declaredEntity: undefined;
    constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier, declarator: Declarator, otherSpecs: OtherSpecifiers, type: ArrayOfUnknownBoundType);
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export interface TypedUnknownBoundArrayDeclaration<T extends ArrayOfUnknownBoundType> extends UnknownBoundArrayDeclaration {
    readonly type: T;
}
export declare class FunctionDeclaration extends SimpleDeclaration {
    readonly construct_type = "function_declaration";
    readonly type: FunctionType;
    readonly declaredEntity: FunctionEntity;
    readonly qualifiedName: QualifiedName;
    readonly initializer: undefined;
    readonly parameterDeclarations: readonly ParameterDeclaration[];
    readonly isMemberFunction: boolean;
    readonly isVirtual: boolean;
    readonly isPureVirtual: boolean;
    readonly isOverride: boolean;
    readonly isConstructor: boolean;
    readonly isDestructor: boolean;
    constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode | undefined, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier, declarator: Declarator, otherSpecs: OtherSpecifiers, type: FunctionType);
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
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
export declare type VariableDefinitionType = CompleteObjectType | ReferenceType;
declare abstract class VariableDefinitionBase<ContextType extends TranslationUnitContext = TranslationUnitContext> extends SimpleDeclaration<ContextType> {
    readonly initializer?: Initializer;
    abstract readonly type: VariableDefinitionType;
    abstract readonly declaredEntity: VariableEntity;
    private setInitializer;
    protected initializerWasSet(init: Initializer): void;
    setDefaultInitializer(): this;
    setDirectInitializer(args: readonly Expression[]): this;
    setCopyInitializer(args: readonly Expression[]): this;
    setInitializerList(args: readonly Expression[]): this | undefined;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
    entitiesUsed(): VariableEntity<PotentiallyCompleteObjectType>[];
}
export declare class LocalVariableDefinition extends VariableDefinitionBase<BlockContext> {
    readonly construct_type = "local_variable_definition";
    readonly type: VariableDefinitionType;
    readonly declaredEntity: LocalObjectEntity | LocalReferenceEntity;
    constructor(context: BlockContext, ast: NonMemberSimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier, declarator: Declarator, otherSpecs: OtherSpecifiers, type: VariableDefinitionType);
}
export interface TypedLocalVariableDefinition<T extends VariableDefinitionType> extends LocalVariableDefinition {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
    readonly declaredEntity: LocalObjectEntity<Exclude<T, ReferenceType>> | LocalReferenceEntity<Extract<T, ReferenceType>>;
}
export interface CompiledLocalVariableDefinition<T extends VariableDefinitionType = VariableDefinitionType> extends TypedLocalVariableDefinition<T>, SuccessfullyCompiled {
    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly storageSpecifier: CompiledStorageSpecifier;
    readonly declarator: CompiledDeclarator<T>;
    readonly initializer?: CompiledInitializer<T>;
}
export declare class GlobalVariableDefinition extends VariableDefinitionBase<TranslationUnitContext> {
    readonly construct_type = "global_variable_definition";
    readonly type: VariableDefinitionType;
    readonly declaredEntity: GlobalObjectEntity<CompleteObjectType>;
    readonly qualifiedName: QualifiedName;
    constructor(context: TranslationUnitContext, ast: NonMemberSimpleDeclarationASTNode | undefined, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier, declarator: Declarator, otherSpecs: OtherSpecifiers, type: VariableDefinitionType);
}
export interface TypedGlobalVariableDefinition<T extends VariableDefinitionType> extends GlobalVariableDefinition {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
    readonly declaredEntity: GlobalObjectEntity<Exclude<T, ReferenceType>>;
}
export interface CompiledGlobalVariableDefinition<T extends VariableDefinitionType = VariableDefinitionType> extends TypedGlobalVariableDefinition<T>, SuccessfullyCompiled {
    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly storageSpecifier: CompiledStorageSpecifier;
    readonly declarator: CompiledDeclarator<T>;
    readonly initializer?: CompiledInitializer<Exclude<T, ReferenceType>>;
}
/**
 * ParameterDeclarations are a bit different than other declarations because
 * they do not introduce an entity into their contextual scope. For example,
 * in the context of a function declaration that contains several parameter
 * declarations, there is no function body (as there would be for a function
 * definition) into whose scope the entities would even be introduced.
 * This contrasts to ParameterDefinitions that may introduce an entity.
 */
export declare class ParameterDeclaration extends BasicCPPConstruct<TranslationUnitContext, ParameterDeclarationASTNode> {
    readonly construct_type = "parameter_declaration";
    readonly typeSpecifier: TypeSpecifier;
    readonly storageSpecifier: StorageSpecifier;
    readonly declarator: Declarator;
    readonly otherSpecifiers: OtherSpecifiers;
    readonly name?: string;
    readonly type?: PotentialParameterType;
    readonly declaredEntity?: LocalObjectEntity | LocalReferenceEntity;
    constructor(context: TranslationUnitContext, ast: ParameterDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier, declarator: Declarator, otherSpecs: OtherSpecifiers);
    static createFromAST(ast: ParameterDeclarationASTNode, context: TranslationUnitContext): ParameterDeclaration;
    isPotentialParameterDefinition(): this is ParameterDefinition;
    addEntityToScope(this: ParameterDefinition, context: BlockContext): void;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export interface TypedParameterDeclaration<T extends PotentialParameterType = PotentialParameterType> extends ParameterDeclaration {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
}
export interface CompiledParameterDeclaration<T extends PotentialParameterType = PotentialParameterType> extends TypedParameterDeclaration<T>, SuccessfullyCompiled {
    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly storageSpecifier: CompiledStorageSpecifier;
    readonly declarator: CompiledDeclarator<T>;
}
export interface ParameterDefinition extends ParameterDeclaration {
    readonly name: string;
    readonly type: CompleteParameterType;
    readonly declaredEntity: LocalObjectEntity | LocalReferenceEntity;
}
export interface TypedParameterDefinition<T extends CompleteParameterType = CompleteParameterType> extends ParameterDeclaration {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
    readonly declaredEntity: LocalObjectEntity<Exclude<T, ReferenceType>> | LocalReferenceEntity<Extract<T, ReferenceType>>;
}
export interface CompiledParameterDefinition<T extends CompleteParameterType = CompleteParameterType> extends TypedParameterDefinition<T>, SuccessfullyCompiled {
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
export declare class IncompleteTypeVariableDefinition extends SimpleDeclaration<TranslationUnitContext> {
    readonly construct_type = "incomplete_type_variable_definition";
    readonly type: IncompleteObjectType;
    readonly declaredEntity: undefined;
    constructor(context: TranslationUnitContext, ast: NonMemberSimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier, declarator: Declarator, otherSpecs: OtherSpecifiers, type: IncompleteObjectType);
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export interface TypedIncompleteTypeVariableDefinition<T extends IncompleteObjectType> extends IncompleteTypeVariableDefinition {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
}
export declare class Declarator extends BasicCPPConstruct<TranslationUnitContext, DeclaratorASTNode> {
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
    readonly construct_type = "declarator";
    readonly name?: UnqualifiedName | QualifiedName;
    readonly type?: Type;
    readonly baseType?: Type;
    readonly isPureVirtual?: true;
    readonly isOverride?: true;
    readonly hasConstructorName: boolean;
    readonly hasDestructorName: boolean;
    readonly parameters?: readonly ParameterDeclaration[];
    static createFromAST(ast: DeclaratorASTNode | undefined, context: TranslationUnitContext, baseType: Type | undefined): Declarator;
    /**
     * `Declarator.createFromAST()` should always be used to create Declarators, which delegates
     * to this private constructor. Directly calling the constructor from the outside is not allowed.
     * Since declarators are largely about processing an AST, it doesn't make much sense to create
     * one without an AST.
     */
    private constructor();
    private determineNameAndType;
    private processFunctionDeclarator;
}
export interface TypedDeclarator<T extends Type> extends Declarator {
    type: T;
}
export interface CompiledDeclarator<T extends Type = Type> extends TypedDeclarator<T>, SuccessfullyCompiled {
    readonly parameters?: readonly CompiledParameterDeclaration[];
}
export declare class FunctionDefinition extends BasicCPPConstruct<FunctionContext, FunctionDefinitionASTNode> {
    readonly construct_type = "function_definition";
    readonly kind = "FunctionDefinition";
    readonly declaration: FunctionDeclaration;
    readonly name: string;
    readonly type: FunctionType;
    readonly parameters: readonly ParameterDeclaration[];
    readonly ctorInitializer?: CtorInitializer | InvalidConstruct;
    readonly body: Block;
    /**
     * Only defined for destructors. A deallocator for the member
     * variables of the receiver that will run after the destructor itself.
     */
    readonly memberDeallocator?: ObjectDeallocator;
    static createFromAST(ast: FunctionDefinitionASTNode, context: TranslationUnitContext, declaration: FunctionDeclaration): FunctionDefinition;
    static createFromAST(ast: FunctionDefinitionASTNode, context: TranslationUnitContext, declaration?: FunctionDeclaration): FunctionDefinition | InvalidConstruct;
    constructor(context: FunctionContext, ast: FunctionDefinitionASTNode, declaration: FunctionDeclaration, parameters: readonly ParameterDeclaration[], ctorInitializer: CtorInitializer | InvalidConstruct | undefined, body: Block);
    createRuntimeFunction<T extends FunctionType<CompleteReturnType>>(this: CompiledFunctionDefinition<T>, parent: RuntimeFunctionCall, receiver?: CPPObject<CompleteClassType>): RuntimeFunction<T>;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export interface TypedFunctionDefinition<T extends FunctionType> extends FunctionDefinition {
    readonly type: T;
    readonly declaration: TypedFunctionDeclaration<T>;
}
export interface CompiledFunctionDefinition<T extends FunctionType = FunctionType> extends TypedFunctionDefinition<T>, SuccessfullyCompiled {
    readonly declaration: CompiledFunctionDeclaration<T>;
    readonly name: string;
    readonly parameters: readonly CompiledParameterDeclaration[];
    readonly ctorInitializer?: CompiledCtorInitializer;
    readonly body: CompiledBlock;
    readonly memberDeallocator?: CompiledObjectDeallocator;
}
export declare class ClassDeclaration extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
    readonly construct_type = "class_declaration";
    readonly name: string;
    readonly qualifiedName: QualifiedName;
    readonly key: ClassKey;
    readonly type: PotentiallyCompleteClassType;
    readonly declaredEntity: ClassEntity;
    constructor(context: TranslationUnitContext, name: LexicalIdentifier, key: ClassKey);
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export interface TypedClassDeclaration<T extends PotentiallyCompleteClassType> extends ClassDeclaration, SuccessfullyCompiled {
    readonly type: T;
}
export interface CompiledClassDeclaration<T extends PotentiallyCompleteClassType = PotentiallyCompleteClassType> extends TypedClassDeclaration<T>, SuccessfullyCompiled {
}
export declare class ClassDefinition extends BasicCPPConstruct<ClassContext, ClassDefinitionASTNode> {
    readonly construct_type = "class_definition";
    readonly declaration: ClassDeclaration;
    readonly name: string;
    readonly type: CompleteClassType;
    readonly baseSpecifiers: readonly BaseSpecifier[];
    readonly memberDeclarations: readonly MemberDeclaration[];
    readonly memberDeclarationsByName: {
        [index: string]: MemberDeclaration | undefined;
    };
    readonly constructorDeclarations: readonly FunctionDeclaration[];
    readonly baseType?: CompleteClassType;
    readonly memberFunctionEntities: readonly FunctionEntity[];
    readonly memberVariableEntities: readonly MemberVariableEntity[];
    readonly memberObjectEntities: readonly MemberObjectEntity[];
    readonly memberReferenceEntities: readonly MemberReferenceEntity[];
    readonly memberVariableEntitiesByName: {
        [index: string]: MemberVariableEntity | undefined;
    };
    readonly defaultConstructor?: FunctionEntity<FunctionType<VoidType>>;
    readonly constCopyConstructor?: FunctionEntity<FunctionType<VoidType>>;
    readonly nonConstCopyConstructor?: FunctionEntity<FunctionType<VoidType>>;
    readonly constructors: readonly FunctionEntity<FunctionType<VoidType>>[];
    readonly destructor?: FunctionEntity<FunctionType<VoidType>>;
    readonly objectSize: number;
    readonly inlineMemberFunctionDefinitions: readonly FunctionDefinition[];
    private readonly implicitPublicContext;
    static createFromAST(ast: ClassDefinitionASTNode, tuContext: TranslationUnitContext): ClassDefinition;
    constructor(context: ClassContext, ast: ClassDefinitionASTNode | undefined, declaration: ClassDeclaration, baseSpecs: readonly BaseSpecifier[], memberDeclarations: readonly MemberDeclaration[]);
    attachInlineFunctionDefinition(def: FunctionDefinition): void;
    private createImplicitlyDefinedDefaultConstructorIfAppropriate;
    private createImplicitlyDefinedCopyConstructorIfAppropriate;
    lookupAssignmentOperator(requireConstParam: boolean, isReceiverConst: boolean): import("./entities").DeclaredScopeEntry | undefined;
    private createImplicitlyDefinedCopyAssignmentOperatorIfAppropriate;
    private createImplicitlyDefinedDestructorIfAppropriate;
    getBaseAndMemberEntities(): readonly MemberVariableEntity<PotentiallyCompleteObjectType>[] | (MemberVariableEntity<PotentiallyCompleteObjectType> | BaseSubobjectEntity)[];
    isSuccessfullyCompiled(): this is CompiledClassDefinition;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export interface TypedClassDefinition<T extends CompleteClassType> extends ClassDefinition, SuccessfullyCompiled {
    readonly type: T;
    readonly declaration: TypedClassDeclaration<T>;
}
export interface CompiledClassDefinition<T extends CompleteClassType = CompleteClassType> extends TypedClassDefinition<T>, SuccessfullyCompiled {
    readonly declaration: CompiledClassDeclaration<T>;
    readonly baseSpecifiers: readonly CompiledBaseSpecifier[];
}
export declare class BaseSpecifier extends BasicCPPConstruct<TranslationUnitContext, BaseSpecifierASTNode> {
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
    readonly construct_type = "base_specifier";
    readonly name: LexicalIdentifier;
    readonly accessLevel: AccessSpecifier;
    readonly virtual: boolean;
    readonly baseEntity?: ClassEntity;
    constructor(context: TranslationUnitContext, ast: BaseSpecifierASTNode, defaultAccessLevel: AccessSpecifier);
    static createFromAST(ast: BaseSpecifierASTNode, context: TranslationUnitContext, defaultAccessLevel: AccessSpecifier): BaseSpecifier;
}
export interface CompiledBaseSpecifier extends BaseSpecifier, SuccessfullyCompiled {
    readonly baseEntity: CompleteClassEntity;
}
export declare class MemberVariableDeclaration extends VariableDefinitionBase<MemberSpecificationContext> {
    readonly construct_type = "member_variable_declaration";
    readonly type: CompleteObjectType | ReferenceType;
    readonly declaredEntity: MemberVariableEntity;
    constructor(context: MemberSpecificationContext, ast: MemberSimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier, declarator: Declarator, otherSpecs: OtherSpecifiers, type: CompleteObjectType | ReferenceType);
    protected initializerWasSet(init: Initializer): void;
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export interface TypedMemberVariableDeclaration<T extends ObjectEntityType> extends MemberVariableDeclaration {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
    readonly declaredEntity: MemberObjectEntity<Exclude<T, ReferenceType>> | MemberReferenceEntity<Extract<T, ReferenceType>>;
}
export interface CompiledMemberVariableDeclaration<T extends ObjectEntityType = ObjectEntityType> extends TypedMemberVariableDeclaration<T>, SuccessfullyCompiled {
    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly storageSpecifier: CompiledStorageSpecifier;
    readonly declarator: CompiledDeclarator<T>;
    readonly initializer?: CompiledInitializer<T>;
}
/**
 * This class represents a declaration of a member variable with incomplete type. Such a declaration is
 * ill-formed, because necessary details (such as object size) are missing from an incomplete type.
 * As such, this class always compiles with an error and does not create any entities. In effect,
 * the attempted declaration of such a member variable is acknowledged, but the member variable
 * is otherwise ignored as if it was never declared.
 */
export declare class IncompleteTypeMemberVariableDeclaration extends SimpleDeclaration<TranslationUnitContext> {
    readonly construct_type = "incomplete_type_member_variable_declaration";
    readonly type: IncompleteObjectType;
    readonly declaredEntity: undefined;
    constructor(context: MemberSpecificationContext, ast: MemberSimpleDeclarationASTNode, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier, declarator: Declarator, otherSpecs: OtherSpecifiers, type: IncompleteObjectType);
    isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;
}
export interface TypedIncompleteTypeMemberVariableDeclaration<T extends IncompleteObjectType> extends IncompleteTypeMemberVariableDeclaration {
    readonly type: T;
    readonly declarator: TypedDeclarator<T>;
}
export declare class FunctionDefinitionGroup {
    readonly name: string;
    private readonly _definitions;
    readonly definitions: readonly FunctionDefinition[];
    constructor(definitions: readonly FunctionDefinition[]);
    addDefinition(overload: FunctionDefinition): void;
}
export declare type LinkedDefinition = GlobalVariableDefinition | FunctionDefinitionGroup | ClassDefinition;
export {};
