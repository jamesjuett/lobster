import { ClassDefinitionASTNode, FunctionDefinitionASTNode, LocalDeclarationASTNode, MemberDeclarationASTNode, MemberSimpleDeclarationASTNode, NonMemberSimpleDeclarationASTNode, TopLevelDeclarationASTNode } from "../../../ast/ast_declarations";
import { assert } from "../../../util/util";
import { BlockContext, isBlockContext, isClassContext, MemberSpecificationContext, TranslationUnitContext } from "../../compilation/contexts";
import { InvalidConstruct } from "../InvalidConstruct";
import { ClassDeclaration } from "./class/ClassDeclaration";
import { ClassDefinition } from "./class/ClassDefinition";
import { FriendDeclaration } from "./class/FriendDeclaration";
import { IncompleteTypeMemberVariableDeclaration } from "./class/IncompleteTypeMemberVariableDeclaration";
import { MemberVariableDeclaration } from "./class/MemberVariableDeclaration";
import { Declarator } from "./Declarator";
import { FunctionDeclaration } from "./function/FunctionDeclaration";
import { createFunctionDeclarationFromDefinitionAST, FunctionDefinition } from "./function/FunctionDefinition";
import { TypedefDeclaration } from "./misc/TypedefDeclaration";
import { UnknownBoundArrayDeclaration } from "./misc/UnknownBoundArrayDeclaration";
import { UnknownTypeDeclaration } from "./misc/UnknownTypeDeclaration";
import { VoidDeclaration } from "./misc/VoidDeclaration";
import { StorageSpecifier } from "./StorageSpecifier";
import { TypeSpecifier } from "./TypeSpecifier";
import { setInitializerFromAST } from "./variable/common";
import { GlobalVariableDefinition } from "./variable/GlobalVariableDefinition";
import { IncompleteTypeVariableDefinition } from "./variable/IncompleteTypeVariableDefinition";
import { LocalVariableDefinition } from "./variable/LocalVariableDefinition";


export interface OtherSpecifiers {
    readonly friend?: boolean;
    readonly typedef?: boolean;
    readonly inline?: boolean;
    readonly explicit?: boolean;
    readonly virtual?: boolean;
}

export type Declaration = TopLevelSimpleDeclaration | LocalSimpleDeclaration | MemberDeclaration | FunctionDefinition | ClassDeclaration | ClassDefinition | InvalidConstruct;

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
        else if (declaredType.isCompleteObjectType() || declaredType.isReferenceType()) {
            declaration = new GlobalVariableDefinition(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
            setInitializerFromAST(declaration, declAST.initializer, context);
        }
        else {
            declaration = new IncompleteTypeVariableDefinition(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }

        return declaration;
    });
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
        else if (declaredType.isCompleteObjectType() || declaredType.isReferenceType()) {
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
        else if (declaredType.isCompleteObjectType() || declaredType.isReferenceType()) {
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