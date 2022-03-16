import { FunctionDefinitionASTNode, SimpleDeclarationASTNode } from "../../../../ast/ast_declarations";
import { assert } from "../../../../util/util";
import { areAllSemanticallyEquivalent, areSemanticallyEquivalent, createBlockContext, createFunctionContext, createQualifiedContext, FunctionContext, isMemberBlockContext, isMemberSpecificationContext, MemberSpecificationContext, SemanticContext, TranslationUnitContext } from "../../../compilation/contexts";
import { FunctionEntity, ReceiverEntity } from "../../../compilation/entities";
import { CPPError } from "../../../compilation/errors";
import { RuntimeFunction } from "../../../compilation/functions";
import { getQualifiedName, getUnqualifiedName, isQualifiedName, isUnqualifiedName, QualifiedName, UnqualifiedName } from "../../../compilation/lexical";
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
import { Declarator, QualifiedDeclarator, UnqualifiedDeclarator } from "../Declarator";
import { StorageSpecifier } from "../StorageSpecifier";
import { TypeSpecifier } from "../TypeSpecifier";
import { CompiledFunctionDeclaration, FunctionDeclaration, TypedFunctionDeclaration } from "./FunctionDeclaration";
import { CompiledParameterDeclaration, ParameterDeclaration } from "./ParameterDeclaration";
import { overloadResolution } from "../../../compilation/overloads";



export class FunctionDefinition extends BasicCPPConstruct<FunctionContext, FunctionDefinitionASTNode> {

    public readonly construct_type = "function_definition";
    public readonly kind = "FunctionDefinition";

    public readonly typeSpecifier: TypeSpecifier;
    public readonly storageSpecifier: StorageSpecifier;
    public readonly declarator: Declarator;
    public readonly declaration?: FunctionDeclaration;
    public readonly name: UnqualifiedName;
    public readonly qualifiedName: QualifiedName;
    public readonly type: FunctionType;
    public readonly parameters: readonly ParameterDeclaration[];
    public readonly ctorInitializer?: CtorInitializer | InvalidConstruct;
    public readonly body: Block;
    
    public readonly isConstructor: boolean;
    public readonly isDestructor: boolean;

    /**
     * Only defined for destructors. A deallocator for the member
     * variables of the receiver that will run after the destructor itself.
     */
    public readonly memberDeallocator?: ObjectDeallocator;

    public static createInlineMemberFunctionDefinition(ast: FunctionDefinitionASTNode, context: TranslationUnitContext, declaration: FunctionDeclaration) : FunctionDefinition {
        assert(declaration.declarator.isUnqualifiedDeclarator() || declaration.declarator.isQualifiedDeclarator());
        return this.createFromASTHelper(ast, context, declaration.typeSpecifier, declaration.storageSpecifier, declaration.declarator, declaration, declaration.type);
    }

    public static createFromAST(ast: FunctionDefinitionASTNode, context: TranslationUnitContext, declaration?: FunctionDeclaration) : FunctionDefinition | InvalidConstruct{

        const typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs, context);
        const storageSpec = StorageSpecifier.createFromAST(ast.specs.storageSpecs, context);
        const declarator = Declarator.createFromAST(ast.declarator, context, typeSpec.baseType);

        if (!(declarator.isQualifiedDeclarator() || declarator.isUnqualifiedDeclarator())) {
            return new InvalidConstruct(context, ast, CPPError.declaration.missing_name);
        }
        
        if (!declarator.type?.isFunctionType()) {
            return new InvalidConstruct(context, ast, CPPError.declaration.func.definition_non_function_type);
        }

        let functionType = declarator.type;

        if (!declaration && declarator.isQualifiedDeclarator()) {
            // If it's a qualified name, we attempt to match against some other declaration out there
            let other = context.translationUnit.qualifiedLookup(declarator.name);

            if (!other) {
                declarator.addNote(CPPError.definition.func.no_declaration(declarator));
            }
            else if (other.declarationKind !== "function") {
                declarator.addNote(CPPError.definition.symbol_mismatch(declarator, other));
            }
            else {
                let prevEntity = declarator.type && other.selectOverloadBySignature(declarator.type);
    
                // The declaration we found by matching signature may have been a static function.
                // If so, the receiver type the declarator got by default should be discarded, and
                // we can do that by just using the type from prevEntity.
                if (prevEntity) {
                    declaration = prevEntity.firstDeclaration;
                    context = createQualifiedContext(context, prevEntity.firstDeclaration.context);
                    functionType = prevEntity.type;

                    // If there was a const on that receiver type, we should also give an error.
                    if (prevEntity.firstDeclaration.isStatic && declarator.type.receiverType?.isConst) {
                        declarator.notes.addNote(CPPError.definition.func.static_member_const_prohibited(declarator));
                    }
                    
                }
            }
        }

        return this.createFromASTHelper(ast, context, typeSpec, storageSpec, declarator, declaration, functionType);

    }
    
    private static createFromASTHelper(
        ast: FunctionDefinitionASTNode,
        context: TranslationUnitContext,
        typeSpecifier: TypeSpecifier,
        storageSpecifier: StorageSpecifier,
        declarator: UnqualifiedDeclarator | QualifiedDeclarator,
        declaration: FunctionDeclaration | undefined,
        functionType: FunctionType
    ) : FunctionDefinition {

        // If it's a definition on an incomplete class, the best we can do is just
        // drop the receiver type here.
        const receiverType = functionType.receiverType?.isComplete() ? functionType.receiverType : undefined;

        const functionContext = createFunctionContext(context, functionType, receiverType);
        const bodyContext = createBlockContext(functionContext);

        // Add declared entities from the parameters to the body block's context.
        // As the context refers back to the implementation, local objects/references will be registerd there.
        const parameters = declarator.parameters ?? [];
        parameters!.forEach(paramDecl => {
            if (paramDecl.isPotentialParameterDefinition()) {
                paramDecl.addEntityToScope(bodyContext);
            }
            else {
                paramDecl.addNote(CPPError.lobster.unsupported_feature(paramDecl, "Unnamed parameter definitions."));
            }
        });

        let ctorInitializer: CtorInitializer | InvalidConstruct | undefined;
        if (declarator.declaratorName.isConstructorName && isMemberBlockContext(bodyContext)) {
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
        const body: Block = new Block(bodyContext, ast.body, ast.body.statements.map(s => createStatementFromAST(s, bodyContext)));

        return new FunctionDefinition(
            functionContext,
            ast,
            functionType,
            typeSpecifier,
            storageSpecifier,
            declarator,
            declaration,
            parameters,
            ctorInitializer,
            body
        );
    }

    public constructor(
        context: FunctionContext,
        ast: FunctionDefinitionASTNode,
        type: FunctionType,
        typeSpecifier: TypeSpecifier,
        storageSpecifier: StorageSpecifier,
        declarator: UnqualifiedDeclarator | QualifiedDeclarator,
        declaration: FunctionDeclaration | undefined,
        parameters: readonly ParameterDeclaration[],
        ctorInitializer: CtorInitializer | InvalidConstruct | undefined,
        body: Block
    ) {
        super(context, ast);

        if (declaration) {
            // Using an extenerally provided declaration. Don't attach it.
            // We need to attach the type specifier, storage specifier, and declarator
            // here because they won't be attached anywhere else.
            this.declaration = declaration;
            this.attach(this.typeSpecifier = typeSpecifier);
            this.attach(this.storageSpecifier = storageSpecifier);
            this.attach(this.declarator = declarator);
        }
        else if (declarator.isUnqualifiedDeclarator()) {
            // If we don't have a provided declaration that this definition is supposed to match
            // against, we can create one of our own as long as the declarator did not use a
            // qualified name
            let declAST: SimpleDeclarationASTNode = {
                construct_type: "simple_declaration",
                declarators: [ast.declarator],
                specs: ast.specs,
                source: ast.declarator.source
            };

            declaration = FunctionDeclaration.create(context, declAST, typeSpecifier, storageSpecifier, declarator, ast.specs);
            this.attach(this.declaration = declaration);

            // Don't attach type specifier, storage specifier, or declarator because they
            // will be attached under the declaration we just created
            this.typeSpecifier = typeSpecifier;
            this.storageSpecifier = storageSpecifier;
            this.declarator = declarator;
        }
        else {
            // No externally provided declaration and we're not allowed to create one.
            // this.declaration remains undefined
            this.attach(this.typeSpecifier = typeSpecifier);
            this.attach(this.storageSpecifier = storageSpecifier);
            this.attach(this.declarator = declarator);
        }

        this.name = getUnqualifiedName(declarator.name);
        this.qualifiedName = declaration?.qualifiedName ?? getQualifiedName(declarator.name);
        this.type = type;
        this.isConstructor = declarator.declaratorName.isConstructorName;
        this.isDestructor = declarator.declaratorName.isDestructorName;

        this.attachAll(this.parameters = parameters);
        if (ctorInitializer) {
            this.attach(this.ctorInitializer = ctorInitializer);
        }
        this.attach(this.body = body);

        if (this.isDestructor) {
            // TODO: the cast on the line below seems kinda sus
            //       At this point (in a member function DEFINITION)
            //       I believe the receiver type should always be complete.
            //       Should that be ensured elsewhere? 
            this.attach(this.memberDeallocator = createMemberDeallocator(context, new ReceiverEntity(<CompleteClassType>this.type.receiverType)));
        }

        if (this.declaration) {
            this.declaration.declaredEntity.setDefinition(this);
        }

        this.context.translationUnit.program.registerFunctionDefinition(this.qualifiedName, this);
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
