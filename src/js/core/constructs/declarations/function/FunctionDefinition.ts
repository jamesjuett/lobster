import { FunctionDefinitionASTNode, SimpleDeclarationASTNode } from "../../../../ast/ast_declarations";
import { assert } from "../../../../util/util";
import { areAllSemanticallyEquivalent, areSemanticallyEquivalent, createBlockContext, createFunctionContext, createOutOfLineFunctionDefinitionContext, FunctionContext, isMemberBlockContext, isMemberSpecificationContext, SemanticContext, TranslationUnitContext } from "../../../compilation/contexts";
import { ReceiverEntity } from "../../../compilation/entities";
import { CPPError } from "../../../compilation/errors";
import { RuntimeFunction } from "../../../compilation/functions";
import { isQualifiedName } from "../../../compilation/lexical";
import { CPPObject } from "../../../runtime/objects";
import { AnalyticConstruct } from "../../../../analysis/predicates";
import { createStatementFromAST } from "../../statements/statements";
import { Block, CompiledBlock } from "../../statements/Block";
import { CompleteClassType, CompleteReturnType, FunctionType } from "../../../compilation/types";
import { SuccessfullyCompiled } from "../../CPPConstruct";
import { BasicCPPConstruct } from "../../BasicCPPConstruct";
import { InvalidConstruct } from "../../InvalidConstruct";
import { RuntimeFunctionCall } from "../../FunctionCall";
import { CompiledCtorInitializer, CtorInitializer } from "../../initializers/CtorInitializer";
import { CompiledObjectDeallocator, createMemberDeallocator, ObjectDeallocator } from "../../ObjectDeallocator";
import { Declarator } from "../Declarator";
import { StorageSpecifier } from "../StorageSpecifier";
import { TypeSpecifier } from "../TypeSpecifier";
import { CompiledFunctionDeclaration, FunctionDeclaration, TypedFunctionDeclaration } from "./FunctionDeclaration";
import { CompiledParameterDeclaration, ParameterDeclaration } from "./ParameterDeclaration";



export class FunctionDefinition extends BasicCPPConstruct<FunctionContext, FunctionDefinitionASTNode> {

    public readonly construct_type = "function_definition";
    public readonly kind = "FunctionDefinition";

    public readonly declaration: FunctionDeclaration;
    public readonly name: string;
    public readonly type: FunctionType;
    public readonly parameters: readonly ParameterDeclaration[];
    public readonly ctorInitializer?: CtorInitializer | InvalidConstruct;
    public readonly body: Block;

    public isOutOfLineMemberFunctionDefinition: boolean;

    /**
     * Only defined for destructors. A deallocator for the member
     * variables of the receiver that will run after the destructor itself.
     */
    public readonly memberDeallocator?: ObjectDeallocator;

    public static createFromAST(ast: FunctionDefinitionASTNode, context: TranslationUnitContext, declaration: FunctionDeclaration): FunctionDefinition;
    public static createFromAST(ast: FunctionDefinitionASTNode, context: TranslationUnitContext, declaration?: FunctionDeclaration): FunctionDefinition | InvalidConstruct;
    public static createFromAST(ast: FunctionDefinitionASTNode, context: TranslationUnitContext, declaration?: FunctionDeclaration) {

        if (!declaration) {
            let decl = createFunctionDeclarationFromDefinitionAST(ast, context);
            if (!(decl.construct_type === "function_declaration")) {
                return decl;
            }
            declaration = decl;
        }

        let outOfLine = false;
        // Consider "out-of-line" definitions as if they were in the class scope.
        // Need to change the parent to the context in which the definition occurs, though.
        if (isMemberSpecificationContext(declaration.context) && !isMemberSpecificationContext(context)) {
            context = createOutOfLineFunctionDefinitionContext(declaration.context, context);
            outOfLine = true;
        }

        // Create implementation and body block (before params and body statements added yet)
        let receiverType: CompleteClassType | undefined;
        if (declaration.isMemberFunction) {
            assert(declaration.type.receiverType?.isComplete(), "Member function definitions may not be compiled until their containing class definition has been completed.");
            receiverType = declaration.type.receiverType;
        }

        let functionContext = createFunctionContext(context, declaration.declaredEntity, receiverType);
        let bodyContext = createBlockContext(functionContext);

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

        let ctorInitializer: CtorInitializer | InvalidConstruct | undefined;
        if (declaration.isConstructor && isMemberBlockContext(bodyContext)) {
            if (ast.ctor_initializer) {
                ctorInitializer = CtorInitializer.createFromAST(ast.ctor_initializer, bodyContext);
            }
            else {
                ctorInitializer = new CtorInitializer(bodyContext, undefined, []);
            }
        }
        else {
            if (ast.ctor_initializer) {
                ctorInitializer = new InvalidConstruct(bodyContext, ast.ctor_initializer, CPPError.declaration.ctor.init.constructor_only);
            }
        }


        // Create the body "manually" using the ctor so we can give it the bodyContext create earlier.
        // We can't use the createFromAST function for the body Block, because that would create a new, nested block context.
        let body = new Block(bodyContext, ast.body, ast.body.statements.map(s => createStatementFromAST(s, bodyContext)));

        return new FunctionDefinition(functionContext, ast, declaration, declaration.parameterDeclarations, ctorInitializer, body, outOfLine);
    }

    // i_childrenToExecute: ["memberInitializers", "body"], // TODO: why do regular functions have member initializers??
    public constructor(context: FunctionContext, ast: FunctionDefinitionASTNode, declaration: FunctionDeclaration, parameters: readonly ParameterDeclaration[], ctorInitializer: CtorInitializer | InvalidConstruct | undefined, body: Block, outOfLineMemberFunction: boolean) {
        super(context, ast);

        this.attach(this.declaration = declaration);
        this.attachAll(this.parameters = parameters);
        if (ctorInitializer) {
            this.attach(this.ctorInitializer = ctorInitializer);
        }
        this.attach(this.body = body);

        this.name = declaration.name;
        this.type = declaration.type;
        this.isOutOfLineMemberFunctionDefinition = outOfLineMemberFunction;

        if (this.declaration.isDestructor) {
            // TODO: the cast on the line below seems kinda sus
            //       At this point (in a member function DEFINITION)
            //       I believe the receiver type should always be complete.
            //       Should that be ensured elsewhere? 
            this.attach(this.memberDeallocator = createMemberDeallocator(context, new ReceiverEntity(<CompleteClassType>this.type.receiverType)));
        }

        this.declaration.declaredEntity.setDefinition(this);

        this.context.translationUnit.program.registerFunctionDefinition(this.declaration.declaredEntity.qualifiedName, this);
    }

    public createRuntimeFunction<T extends FunctionType<CompleteReturnType>>(this: CompiledFunctionDefinition<T>, parent: RuntimeFunctionCall, receiver?: CPPObject<CompleteClassType>): RuntimeFunction<T> {
        return new RuntimeFunction(this, parent.sim, parent, receiver);
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && areSemanticallyEquivalent(this.declaration, other.declaration, equivalenceContext)
            && areAllSemanticallyEquivalent(this.parameters, other.parameters, equivalenceContext)
            && areSemanticallyEquivalent(this.ctorInitializer, other.ctorInitializer, equivalenceContext)
            && areSemanticallyEquivalent(this.body, other.body, equivalenceContext);
    }

}
/**
 * Attempts to create a `FunctionDeclaration` from the given function definition AST. Note this may
 * return an InvalidConstrucct if the given AST was malformed such that the declarator didn't actually specify
 * a function (e.g. missing parentheses). This is unfortunately allowed by the language grammar, so
 * we have to account for it.
 * @param ast
 * @param context
 */
export function createFunctionDeclarationFromDefinitionAST(ast: FunctionDefinitionASTNode, context: TranslationUnitContext) {

    // Need to create TypeSpecifier first to get the base type for the declarators
    let typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs, context);
    let baseType = typeSpec.baseType;
    let storageSpec = StorageSpecifier.createFromAST(ast.specs.storageSpecs, context);

    let declarator = Declarator.createFromAST(ast.declarator, context, baseType);
    let declaredType = declarator.type;

    // if the declarator has a qualified name, we need to check to see if a previous
    // declaration for the function already exists, and if so, use that one
    if (declarator.name && isQualifiedName(declarator.name)) {
        let prevEntity = context.program.getLinkedFunctionEntity(declarator.name);
        if (prevEntity) {
            return prevEntity.firstDeclaration;
        }
    }

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
    readonly ctorInitializer?: CompiledCtorInitializer;
    readonly body: CompiledBlock;

    readonly memberDeallocator?: CompiledObjectDeallocator;
}
