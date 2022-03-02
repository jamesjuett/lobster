import { AccessSpecifier } from "../ast/ast_declarations";
import { asMutable, assert } from "../util/util";
import { CPPConstruct } from "./CPPConstruct";
import { BlockScope, ClassEntity, ClassScope, CompleteClassEntity, FunctionEntity, LocalObjectEntity, LocalReferenceEntity, LocalVariableEntity, Scope } from "./entities";
import { AnalyticConstruct } from "./predicates";
import { Program, TranslationUnit } from "./Program";
import { AtomicType, CompleteClassType, ExpressionType } from "./types";

export interface ConstructDescription {
    name?: string;
    message: string;
}

export interface ConstructExplanation {
    message: string;
}

export interface ProgramContext {
    readonly program: Program;
    readonly translationUnit?: TranslationUnit;
    readonly implicit?: boolean;
    readonly libraryId?: number;
    readonly libraryUnsupported?: boolean;
}

export function createImplicitContext<ContextType extends ProgramContext>(context: ContextType): ContextType {
    return Object.assign({}, context, { implicit: true });
}


export interface TranslationUnitContext extends ProgramContext {
    readonly translationUnit: TranslationUnit;
    readonly contextualScope: Scope;
    readonly containingClass?: ClassEntity;
    readonly isLibrary: boolean;
}

export function createTranslationUnitContext(parentContext: ProgramContext, translationUnit: TranslationUnit, contextualScope: Scope): TranslationUnitContext {
    return Object.assign({}, parentContext, { translationUnit: translationUnit, contextualScope: contextualScope, isLibrary: false });
}

export function createLibraryContext(parentContext: TranslationUnitContext): TranslationUnitContext {
    return Object.assign({}, parentContext, { isLibrary: true });
}

export interface ExpressionContext extends TranslationUnitContext {
    readonly contextualParameterTypes?: readonly (ExpressionType | undefined)[];
    readonly contextualReceiverType?: CompleteClassType;
}

export function createExpressionContextWithParameterTypes(parentContext: TranslationUnitContext, contextualParameterTypes: readonly (ExpressionType | undefined)[]): ExpressionContext {
    return Object.assign({}, parentContext, { contextualParameterTypes: contextualParameterTypes });
}

export function createExpressionContextWithReceiverType(parentContext: TranslationUnitContext, contextualReceiverType: CompleteClassType): ExpressionContext {
    return Object.assign({}, parentContext, { contextualReceiverType: contextualReceiverType });
}

export interface FunctionContext extends TranslationUnitContext {
    readonly containingFunction: FunctionEntity;
    readonly functionLocals: ContextualLocals;
    readonly contextualReceiverType?: CompleteClassType;
}

export function isFunctionContext(context: TranslationUnitContext) : context is FunctionContext {
    return !!((context as FunctionContext).containingFunction);
}

export function createFunctionContext(parentContext: TranslationUnitContext, containingFunction: FunctionEntity, contextualReceiverType: CompleteClassType): MemberFunctionContext;
export function createFunctionContext(parentContext: TranslationUnitContext, containingFunction: FunctionEntity, contextualReceiverType?: CompleteClassType): FunctionContext;
export function createFunctionContext(parentContext: TranslationUnitContext, containingFunction: FunctionEntity, contextualReceiverType?: CompleteClassType): FunctionContext {
    return Object.assign({}, parentContext, {
        containingFunction: containingFunction,
        functionLocals: new ContextualLocals(),
        contextualReceiverType: contextualReceiverType
    });
}

export function isMemberFunctionContext(context: TranslationUnitContext) : context is MemberFunctionContext {
    return isFunctionContext(context) && !!context.contextualReceiverType;
}

export interface MemberFunctionContext extends FunctionContext {
    readonly contextualReceiverType: CompleteClassType;
}

export interface BlockContext extends FunctionContext {
    readonly contextualScope: BlockScope;
    readonly blockLocals: ContextualLocals;
    readonly withinLoop?: true;
}

export function createBlockContext(parentContext: FunctionContext, sharedScope?: BlockScope): BlockContext {
    return Object.assign({}, parentContext, {
        contextualScope: sharedScope || new BlockScope(parentContext.translationUnit, parentContext.contextualScope),
        blockLocals: new ContextualLocals()
    });
}

export function isMemberBlockContext(context: BlockContext) : context is MemberBlockContext {
    return !!context.contextualReceiverType;
}

export interface MemberBlockContext extends BlockContext {
    readonly contextualReceiverType: CompleteClassType;
}

export function isBlockContext(context: TranslationUnitContext): context is BlockContext {
    return context.contextualScope instanceof BlockScope;
}

export function createLoopContext<C extends BlockContext>(parentContext: C) {
    return Object.assign({}, parentContext, {
        withinLoop: true
    });
}

export function isClassContext(context: TranslationUnitContext) : context is ClassContext {
    return !!(context as ClassContext).containingClass; // && !!(context as ClassContext).classMembers;
}

export interface ClassContext extends TranslationUnitContext {
    readonly contextualScope: ClassScope;
    readonly baseClass?: CompleteClassEntity;
    readonly containingClass: ClassEntity;
    readonly templateType?: AtomicType;
}

export function createClassContext(
    parentContext: TranslationUnitContext, classEntity: ClassEntity,
    baseClass?: CompleteClassEntity, templateType?: AtomicType): ClassContext {
    return Object.assign({}, parentContext, {
        contextualScope: new ClassScope(parentContext.translationUnit, classEntity.name, parentContext.contextualScope, baseClass?.definition?.context.contextualScope),
        baseClass: baseClass,
        containingClass: classEntity,
        templateType: templateType
    });
}

export function isMemberSpecificationContext(context: TranslationUnitContext) : context is MemberSpecificationContext {
    return isClassContext(context) && !!(context as MemberSpecificationContext).accessLevel;
}

export function createOutOfLineFunctionDefinitionContext(declarationContext: MemberSpecificationContext, newParent: TranslationUnitContext) {
    return Object.assign({}, declarationContext, {
        contextualScope: declarationContext.contextualScope.createAlternateParentProxy(newParent.contextualScope),
        translationUnit: newParent.translationUnit
    });
}

export interface MemberSpecificationContext extends ClassContext {
    readonly accessLevel: AccessSpecifier;
}

export function createMemberSpecificationContext(classContext: ClassContext, accessLevel: AccessSpecifier): MemberSpecificationContext {
    return Object.assign({}, classContext, {
        accessLevel: accessLevel
    });
}

export type SemanticContext = {

};

export function areAllSemanticallyEquivalent(constructs: readonly CPPConstruct[], others: readonly CPPConstruct[], equivalenceContext: SemanticContext) : boolean{

    // Don't care about deallocators in semantic analysis
    constructs = constructs.filter(c => c.construct_type !== "TemporaryDeallocator" && c.construct_type !== "LocalDeallocator");
    others = others.filter(c => c.construct_type !== "TemporaryDeallocator" && c.construct_type !== "LocalDeallocator");

    return all_equiv_helper(constructs, others, equivalenceContext);
}

function all_equiv_helper(constructs: readonly CPPConstruct[], others: readonly CPPConstruct[], ec: SemanticContext) : boolean {
    if (constructs.length === 0 && others.length === 0) {
        return true;
    }
    else if (constructs.length === 0) {
        return others.every(o => isAnythingConstruct(o));
    }
    else if (others.length === 0) {
        return constructs.every(c => isAnythingConstruct(c));
    }
    else {
        return areSemanticallyEquivalent(constructs[0], others[0], ec) && all_equiv_helper(constructs.slice(1), others.slice(1), ec)
            || isAnythingConstruct(constructs[0]) && all_equiv_helper(constructs.slice(1), others, ec)
            || isAnythingConstruct(others[0]) && all_equiv_helper(constructs, others.slice(1), ec);
    }
}

export function isAnythingConstruct(construct: CPPConstruct | undefined) : boolean {
    if (construct?.construct_type === "anything_construct") {
        return true;
    }
    
    let ac = <AnalyticConstruct>construct;
    if (ac?.construct_type === "block" && ac.statements.length === 1 && isAnythingConstruct(ac.statements[0])) {
        return true;
    }

    return false;
}

export function areSemanticallyEquivalent(construct: CPPConstruct | undefined, other: CPPConstruct | undefined, equivalenceContext: SemanticContext) : boolean{
    return !!(construct === other // also handles case of both undefined
        || isAnythingConstruct(construct)
        || isAnythingConstruct(other)
        || construct && other && construct.isSemanticallyEquivalent(other, equivalenceContext)
        || construct && other && other.isSemanticallyEquivalent(construct, equivalenceContext));
}





export class ContextualLocals {

    public readonly localVariables: readonly LocalVariableEntity[] = [];
    public readonly localObjects: readonly LocalObjectEntity[] = [];
    public readonly localReferences: readonly LocalReferenceEntity[] = [];
    
    public readonly localVariablesByEntityId: {
        [index: number]: LocalVariableEntity
    } = {};

    public registerLocalVariable(local: LocalVariableEntity) {
        assert(!this.localVariablesByEntityId[local.entityId]);
        this.localVariablesByEntityId[local.entityId] = local;
        asMutable(this.localVariables).push(local);
        if (local.variableKind === "object") {
            asMutable(this.localObjects).push(local);
        }
        else {
            asMutable(this.localReferences).push(local);
        }
    }
}








