import { SimpleDeclarationASTNode } from "../../../../ast/ast_declarations";
import { assert } from "../../../../util/util";
import { isClassContext, SemanticContext, TranslationUnitContext } from "../../../compilation/contexts";
import { ClassEntity, FunctionEntity } from "../../../compilation/entities";
import { CPPError } from "../../../compilation/errors";
import { composeQualifiedName, getQualifiedName, QualifiedName } from "../../../compilation/lexical";
import { AnalyticConstruct } from "../../../../analysis/predicates";
import { covariantType, FunctionType } from "../../../compilation/types";
import { SuccessfullyCompiled } from "../../CPPConstruct";
import { OtherSpecifiers } from "../declarations";
import { CompiledDeclarator, Declarator, TypedDeclarator } from "../Declarator";
import { SimpleDeclaration } from "../SimpleDeclaration";
import { CompiledStorageSpecifier, StorageSpecifier } from "../StorageSpecifier";
import { CompiledTypeSpecifier, TypeSpecifier } from "../TypeSpecifier";
import { CompiledParameterDeclaration, ParameterDeclaration } from "./ParameterDeclaration";


export class FunctionDeclaration extends SimpleDeclaration {
    public readonly construct_type = "function_declaration";

    public readonly type: FunctionType;
    public readonly declaredEntity: FunctionEntity;
    public readonly isDeclaredEntityValid: boolean;
    public readonly qualifiedName: QualifiedName;
    public readonly initializer: undefined;

    public readonly parameterDeclarations: readonly ParameterDeclaration[];

    public readonly isMemberFunction: boolean = false;
    public readonly isVirtual: boolean = false;
    public readonly isPureVirtual: boolean = false;
    public readonly isOverride: boolean = false;
    public readonly isConstructor: boolean = false;
    public readonly isDestructor: boolean = false;

    public constructor(context: TranslationUnitContext, ast: SimpleDeclarationASTNode | undefined, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers, type: FunctionType) {

        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);

        this.type = type;

        assert(declarator.name);

        let overrideTarget: FunctionEntity | undefined;
        let containingClass: ClassEntity | undefined;

        if (isClassContext(context)) {
            containingClass = context.containingClass;
            this.qualifiedName = composeQualifiedName(containingClass.qualifiedName, declarator.name);
            this.isMemberFunction = true;
            this.isVirtual = !!otherSpecs.virtual;
            this.isPureVirtual = !!declarator.isPureVirtual;
            this.isOverride = !!declarator.isOverride;
            this.isConstructor = this.declarator.hasConstructorName;
            this.isDestructor = this.declarator.hasDestructorName;

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
        }
        else {
            this.qualifiedName = getQualifiedName(declarator.name);
            // non-class context
        }

        if (this.isOverride && !overrideTarget) {
            this.addNote(CPPError.declaration.func.noOverrideTarget(this));
        }


        this.declaredEntity = new FunctionEntity(type, this);

        assert(!!this.declarator.parameters, "The declarator for a function declaration must contain declarators for its parameters as well.");
        this.parameterDeclarations = this.declarator.parameters!;

        // If main, should have no parameters
        // TODO: this check should be moved elsewhere
        if (this.declaredEntity.isMain() && this.type.paramTypes.length > 0) {
            this.addNote(CPPError.declaration.func.mainParams(this.declarator));
        }


        if (this.isConstructor) {
            // constructors are not added to their scope. they technically "have no name"
            // and can't be found through name lookup
            if (this.type.receiverType?.isConst) {
                this.addNote(CPPError.declaration.ctor.const_prohibited(this));
            }

            if (this.declarator.baseType) {
                this.addNote(CPPError.declaration.ctor.return_type_prohibited(this));
            }

            if (otherSpecs.virtual) { // use otherSpecs here since this.isVirtual depends on being a member fn
                this.addNote(CPPError.declaration.ctor.virtual_prohibited(this));
            }
            this.isDeclaredEntityValid = false;

        }
        else {
            let entityOrError = this.context.contextualScope.declareFunctionEntity(this.declaredEntity);

            if (entityOrError instanceof FunctionEntity) {
                let actualDeclaredEntity = entityOrError;
                if (actualDeclaredEntity === this.declaredEntity) {
                    // if our newly declared entity actually got added to the scope
                    // (and we didn't get returned a different one that was already there)
                    if (overrideTarget) {
                        overrideTarget.registerOverrider(containingClass!, actualDeclaredEntity);
                        actualDeclaredEntity.setOverrideTarget(overrideTarget);
                    }
                }
                this.declaredEntity = actualDeclaredEntity;
                this.isDeclaredEntityValid = true;
            }
            else {
                this.addNote(entityOrError);
                this.isDeclaredEntityValid = false;
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
