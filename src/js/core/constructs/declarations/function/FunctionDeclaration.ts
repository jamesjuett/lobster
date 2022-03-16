import { AnalyticConstruct } from "../../../../analysis/predicates";
import { SimpleDeclarationASTNode } from "../../../../ast/ast_declarations";
import { assert } from "../../../../util/util";
import { ClassContext, isClassContext, SemanticContext, TranslationUnitContext } from "../../../compilation/contexts";
import { FunctionEntity } from "../../../compilation/entities";
import { CPPError } from "../../../compilation/errors";
import { composeQualifiedName, getQualifiedName, QualifiedName } from "../../../compilation/lexical";
import { covariantType, FunctionType, VoidType } from "../../../compilation/types";
import { SuccessfullyCompiled } from "../../CPPConstruct";
import { OtherSpecifiers } from "../declarations";
import { CompiledDeclarator, Declarator, TypedDeclarator } from "../Declarator";
import { SimpleDeclaration } from "../SimpleDeclaration";
import { CompiledStorageSpecifier, StorageSpecifier } from "../StorageSpecifier";
import { CompiledTypeSpecifier, TypeSpecifier } from "../TypeSpecifier";
import { CompiledParameterDeclaration, ParameterDeclaration } from "./ParameterDeclaration";


export abstract class FunctionDeclaration extends SimpleDeclaration {
    public readonly construct_type = "function_declaration";

    public abstract readonly type: FunctionType;
    public abstract readonly qualifiedName: QualifiedName;
    public abstract readonly declaredEntity: FunctionEntity;
    public readonly initializer: undefined;

    public readonly parameterDeclarations: readonly ParameterDeclaration[];

    public abstract readonly isMemberFunction: boolean;
    public abstract readonly isVirtual: boolean;
    public abstract readonly isPureVirtual: boolean;
    public abstract readonly isOverride: boolean;
    public abstract readonly isConstructor: boolean;
    public abstract readonly isDestructor: boolean;
    public abstract readonly isStatic: boolean;
    

    public static create(context: ClassContext, ast: SimpleDeclarationASTNode | undefined, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) : MemberFunctionDeclaration;
    public static create(context: TranslationUnitContext, ast: SimpleDeclarationASTNode | undefined, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) : NonMemberFunctionDeclaration | MemberFunctionDeclaration;
    public static create(context: TranslationUnitContext, ast: SimpleDeclarationASTNode | undefined, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) : NonMemberFunctionDeclaration | MemberFunctionDeclaration {

        if (isClassContext(context)) {
            return new MemberFunctionDeclaration(context, ast, typeSpec, storageSpec, declarator, otherSpecs)
        }
        else {
            return new NonMemberFunctionDeclaration(context, ast, typeSpec, storageSpec, declarator, otherSpecs)
        }
    }

    protected constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode | undefined, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        assert(!!this.declarator.parameters, "The declarator for a function declaration must contain declarators for its parameters as well.");
        this.parameterDeclarations = this.declarator.parameters!;
    }

}

export class NonMemberFunctionDeclaration extends FunctionDeclaration {
    public readonly construct_type = "function_declaration";

    public readonly type: FunctionType;
    public readonly declaredEntity: FunctionEntity;
    public readonly qualifiedName: QualifiedName;

    public readonly isMemberFunction: boolean = false;
    public readonly isVirtual: boolean = false;
    public readonly isPureVirtual: boolean = false;
    public readonly isOverride: boolean = false;
    public readonly isConstructor: boolean = false;
    public readonly isDestructor: boolean = false;
    public readonly isStatic: boolean;

    public constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode | undefined, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        this.isStatic = !!storageSpec.static;

        assert(declarator.type?.isFunctionType())
        this.type = declarator.type;
        this.qualifiedName = getQualifiedName(this.name);

        this.declaredEntity = new FunctionEntity(this.type, this);

        // If main, should have no parameters
        // TODO: this check should probably be moved elsewhere?
        if (this.declaredEntity.isMain() && this.type.paramTypes.length > 0) {
            this.addNote(CPPError.declaration.func.mainParams(this.declarator));
        }

        let entityOrError = this.context.contextualScope.declareFunctionEntity(this.declaredEntity);

        if (entityOrError instanceof FunctionEntity) {
            this.declaredEntity = entityOrError;
        }
        else {
            this.addNote(entityOrError);
        }

        // A function declaration has linkage. The linkage is presumed to be external, because Lobster does not
        // support using the static keyword or unnamed namespaces to specify internal linkage.
        // It has linkage regardless of whether this is a namespace scope or a block scope.
        this.declaredEntity.registerWithLinker();
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && this.declaredEntity.isSemanticallyEquivalent(other.declaredEntity, equivalenceContext);
    }

}


export class MemberFunctionDeclaration extends FunctionDeclaration {
    public readonly construct_type = "function_declaration";

    public readonly type: FunctionType;
    public readonly declaredEntity: FunctionEntity;
    public readonly qualifiedName: QualifiedName;

    public readonly isMemberFunction: boolean = true;
    public readonly isVirtual: boolean;
    public readonly isPureVirtual: boolean;
    public readonly isOverride: boolean;
    public readonly isConstructor: boolean;
    public readonly isDestructor: boolean;
    public readonly isStatic: boolean;

    public constructor(context: ClassContext, ast: SimpleDeclarationASTNode | undefined, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        assert(declarator.type?.isFunctionType());
        assert(declarator.type.receiverType);
        
        this.qualifiedName = composeQualifiedName(context.containingClass.qualifiedName, this.name);

        this.isConstructor = !!this.declarator.declaratorName?.isConstructorName;
        this.isDestructor = !!this.declarator.declaratorName?.isDestructorName;

        // Handle constructors as a special case. Will return.
        if (this.isConstructor) {

            // If it's named as a constructor and was declared as static, virtual,
            // pure virtual, override, with a return type, or with a const receiver
            // type - we'll just assume those were mistakes, give an appropriate
            // error, and then discard them as if they weren't there.

            if (storageSpec.static) {
                this.notes.addNote(CPPError.declaration.ctor.static_prohibited(this));
            }
            this.isStatic = false;

            if (otherSpecs.virtual) {
                this.addNote(CPPError.declaration.ctor.virtual_prohibited(this));
            }
            this.isVirtual = false;

            if (declarator.isPureVirtual) {
                this.notes.addNote(CPPError.declaration.ctor.pure_virtual_prohibited(this));
            }
            this.isPureVirtual = false;
            
            if (declarator.isOverride) {
                this.notes.addNote(CPPError.declaration.ctor.override_prohibited(this));
            }
            this.isOverride = false;
            
            if (declarator.type.receiverType.isConst) {
                this.addNote(CPPError.declaration.ctor.const_prohibited(this));
            }
            if (this.declarator.baseType) {
                this.addNote(CPPError.declaration.ctor.return_type_prohibited(this));
            }
            this.type = new FunctionType(
                VoidType.VOID,
                declarator.type.paramTypes,
                declarator.type.receiverType.cvUnqualified()
            );
            
            // Note that constructors are NOT added to their scope. They technically
            // "have no name" and can't be found through name lookup. So, we create
            // the declaredEntity but we don't declare it into a scope
            this.declaredEntity = new FunctionEntity(this.type, this);

            // A function declaration has linkage. The linkage is presumed to be external, because Lobster does not
            // support using the static keyword or unnamed namespaces to specify internal linkage.
            // It has linkage regardless of whether this is a namespace scope or a block scope.
            this.declaredEntity.registerWithLinker();

            return; // end special case for constructors
        }

        
        // If it's named as a destructor, we discard static here to make sure
        // we enter the member function case below.
        if (this.isDestructor) {
            if (storageSpec.static) {
                this.notes.addNote(CPPError.declaration.dtor.static_prohibited(this));
            }
            this.isStatic = false;
        }
        else {
            this.isStatic = !!storageSpec.static;
        }

        // Split into cases for static vs. non-static member functions
        if (this.isStatic) { // Static member function

            // Ignore any keywords associated with virtual, but give appropriate error messages
            if (otherSpecs.virtual) {
                this.notes.addNote(CPPError.declaration.func.static_member_virtual_prohibited(this));
            }
            if (declarator.isPureVirtual) {
                this.notes.addNote(CPPError.declaration.func.static_member_pure_virtual_prohibited(this));
            }
            if (declarator.isOverride) {
                this.notes.addNote(CPPError.declaration.func.static_member_override_prohibited(this));
            }
            this.isVirtual = false;
            this.isPureVirtual = false;
            this.isOverride = false;

            // Declarator will have grabbed a receiver type based on context.
            // If there's a const on it from the declarator, that's an error.
            if (declarator.type.receiverType.isConst) {
                this.notes.addNote(CPPError.declaration.func.static_member_const_prohibited(this));
            }
            
            // Since this is a static function, we just discard the receiver
            // that the declarator picked up.
            this.type = declarator.type.discardedReceiverType();
            
            this.declaredEntity = new FunctionEntity(this.type, this);
            let entityOrError = this.context.contextualScope.declareFunctionEntity(this.declaredEntity);
            if (entityOrError instanceof FunctionEntity) {
                this.declaredEntity = entityOrError;
            }
            else {
                this.addNote(entityOrError);
            }

            // A member function declaration has linkage.
            this.declaredEntity.registerWithLinker();
        }
        else { // Non-static member function

            this.type = declarator.type;
            this.isMemberFunction = true;
            this.isVirtual = !!otherSpecs.virtual;
            this.isPureVirtual = !!declarator.isPureVirtual;
            this.isOverride = !!declarator.isOverride;

            let overrideTarget: FunctionEntity | undefined;
            
            // Check to see if virtual is inherited
            let base = context.baseClass?.type;
            while (base) {
                let matchInBase = base.classDefinition.memberFunctionEntities.find(
                    baseFunc => this.name === baseFunc.name && this.type.isPotentialOverriderOf(baseFunc.type)
                );

                if (matchInBase?.isVirtual) {
                    this.isVirtual = true;
                    // Check to make sure that the return types are covariant
                    if (covariantType(this.type.returnType, matchInBase.type.returnType)) {
                        overrideTarget = matchInBase;
                        break;
                    }
                    else {
                        this.addNote(CPPError.declaration.func.nonCovariantReturnType(this, this.type.returnType, matchInBase.type.returnType));
                    }
                }
                base = base.classDefinition.baseType;
            }

            if (this.isOverride && !overrideTarget) {
                this.addNote(CPPError.declaration.func.noOverrideTarget(this));
            }

            if (this.isDestructor) {
                if (this.type.receiverType?.isConst) {
                    this.addNote(CPPError.declaration.dtor.const_prohibited(this));
                }
                if (this.declarator.baseType) {
                    this.addNote(CPPError.declaration.dtor.return_type_prohibited(this));
                }
            }
            
            this.declaredEntity = new FunctionEntity(this.type, this);
            let entityOrError = this.context.contextualScope.declareFunctionEntity(this.declaredEntity);
            if (entityOrError instanceof FunctionEntity) {
                let actualDeclaredEntity = entityOrError;
                if (actualDeclaredEntity === this.declaredEntity) {
                    // if our newly declared entity actually got added to the scope
                    // (and we didn't get returned a different one that was already there)
                    if (overrideTarget) {
                        overrideTarget.registerOverrider(context.containingClass, actualDeclaredEntity);
                        actualDeclaredEntity.setOverrideTarget(overrideTarget);
                    }
                }
                this.declaredEntity = actualDeclaredEntity;
            }
            else {
                this.addNote(entityOrError);
            }

            // A member function declaration has linkage.
            this.declaredEntity.registerWithLinker();
        }
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
    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && this.declaredEntity.isSemanticallyEquivalent(other.declaredEntity, equivalenceContext);
    }

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
