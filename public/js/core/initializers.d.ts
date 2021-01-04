/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { ASTNode, SuccessfullyCompiled, TranslationUnitContext, RuntimeConstruct, CPPConstruct, CompiledTemporaryDeallocator, MemberFunctionContext, MemberBlockContext, BasicCPPConstruct, InvalidConstruct } from "./constructs";
import { PotentialFullExpression, RuntimePotentialFullExpression } from "./PotentialFullExpression";
import { ExpressionASTNode, StringLiteralExpression, CompiledStringLiteralExpression, RuntimeStringLiteralExpression, InitializerListExpressionASTNode } from "./expressions";
import { ObjectEntity, UnboundReferenceEntity, FunctionEntity, ReceiverEntity, ObjectEntityType } from "./entities";
import { CompleteObjectType, AtomicType, BoundedArrayType, Char, FunctionType, VoidType, CompleteClassType, ReferenceType, ReferredType } from "./types";
import { Simulation } from "./Simulation";
import { Expression, CompiledExpression, RuntimeExpression } from "./expressionBase";
import { InitializerOutlet, ConstructOutlet, AtomicDefaultInitializerOutlet, ArrayDefaultInitializerOutlet, ReferenceDirectInitializerOutlet, AtomicDirectInitializerOutlet, ClassDefaultInitializerOutlet, ClassDirectInitializerOutlet, CtorInitializerOutlet } from "../view/codeOutlets";
import { FunctionCall, CompiledFunctionCall, RuntimeFunctionCall } from "./functionCall";
import { CtorInitializerASTNode } from "./declarations";
export declare type InitializerASTNode = DirectInitializerASTNode | CopyInitializerASTNode | ListInitializerASTNode;
export declare type InitializerKind = "default" | DirectInitializerKind | "list";
export declare abstract class Initializer extends PotentialFullExpression {
    abstract readonly target: ObjectEntity | UnboundReferenceEntity;
    abstract createRuntimeInitializer(parent: RuntimeConstruct): RuntimeInitializer;
    abstract createDefaultOutlet(this: CompiledInitializer, element: JQuery, parent?: ConstructOutlet): InitializerOutlet;
    isTailChild(child: CPPConstruct): {
        isTail: boolean;
    };
    abstract readonly kind: InitializerKind;
}
export interface CompiledInitializer<T extends ObjectEntityType = ObjectEntityType> extends Initializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly target: ObjectEntity<Exclude<T, ReferenceType>> | UnboundReferenceEntity<Extract<T, ReferenceType>>;
}
export declare abstract class RuntimeInitializer<C extends CompiledInitializer = CompiledInitializer> extends RuntimePotentialFullExpression<C> {
    protected constructor(model: C, parent: RuntimeConstruct);
}
export declare abstract class DefaultInitializer extends Initializer {
    static create(context: TranslationUnitContext, target: UnboundReferenceEntity): ReferenceDefaultInitializer;
    static create(context: TranslationUnitContext, target: ObjectEntity<AtomicType>): AtomicDefaultInitializer;
    static create(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>): ArrayDefaultInitializer;
    static create(context: TranslationUnitContext, target: ObjectEntity<CompleteClassType>): ClassDefaultInitializer;
    static create(context: TranslationUnitContext, target: ObjectEntity<CompleteObjectType>): AtomicDefaultInitializer | ArrayDefaultInitializer | ClassDefaultInitializer;
    static create(context: TranslationUnitContext, target: ObjectEntity | UnboundReferenceEntity): ReferenceDefaultInitializer | AtomicDefaultInitializer | ArrayDefaultInitializer | ClassDefaultInitializer;
    readonly kind = "default";
    abstract createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledDefaultInitializer<T>, parent: RuntimeConstruct): RuntimeDefaultInitializer<T>;
}
export interface CompiledDefaultInitializer<T extends CompleteObjectType = CompleteObjectType> extends DefaultInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly target: ObjectEntity<T>;
}
export declare abstract class RuntimeDefaultInitializer<T extends CompleteObjectType = CompleteObjectType, C extends CompiledDefaultInitializer<T> = CompiledDefaultInitializer<T>> extends RuntimeInitializer<C> {
    protected constructor(model: C, parent: RuntimeConstruct);
}
export declare class ReferenceDefaultInitializer extends DefaultInitializer {
    readonly construct_type = "ReferenceDefaultInitializer";
    readonly target: UnboundReferenceEntity;
    constructor(context: TranslationUnitContext, target: UnboundReferenceEntity);
    createRuntimeInitializer(parent: RuntimeConstruct): never;
    createDefaultOutlet(element: JQuery, parent?: ConstructOutlet): never;
    explain(sim: Simulation, rtConstruct: RuntimeConstruct): never;
}
export declare class AtomicDefaultInitializer extends DefaultInitializer {
    readonly construct_type = "AtomicDefaultInitializer";
    readonly target: ObjectEntity<AtomicType>;
    constructor(context: TranslationUnitContext, target: ObjectEntity<AtomicType>);
    createRuntimeInitializer<T extends AtomicType>(this: CompiledAtomicDefaultInitializer<T>, parent: RuntimeConstruct): RuntimeAtomicDefaultInitializer<T>;
    createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledDefaultInitializer<T>, parent: RuntimeConstruct): never;
    createDefaultOutlet(this: CompiledAtomicDefaultInitializer, element: JQuery, parent?: ConstructOutlet): AtomicDefaultInitializerOutlet;
    explain(sim: Simulation, rtConstruct: RuntimeConstruct): {
        message: string;
    };
}
export interface CompiledAtomicDefaultInitializer<T extends AtomicType = AtomicType> extends AtomicDefaultInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly target: ObjectEntity<T>;
}
export declare class RuntimeAtomicDefaultInitializer<T extends AtomicType = AtomicType> extends RuntimeDefaultInitializer<T, CompiledAtomicDefaultInitializer<T>> {
    constructor(model: CompiledAtomicDefaultInitializer<T>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
export declare class ArrayDefaultInitializer extends DefaultInitializer {
    readonly construct_type = "ArrayDefaultInitializer";
    readonly target: ObjectEntity<BoundedArrayType>;
    readonly elementInitializers?: DefaultInitializer[];
    constructor(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>);
    createRuntimeInitializer<T extends BoundedArrayType>(this: CompiledArrayDefaultInitializer<T>, parent: RuntimeConstruct): RuntimeArrayDefaultInitializer<T>;
    createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledDefaultInitializer<T>, parent: RuntimeConstruct): never;
    createDefaultOutlet(this: CompiledArrayDefaultInitializer, element: JQuery, parent?: ConstructOutlet): ArrayDefaultInitializerOutlet;
    explain(sim: Simulation, rtConstruct: RuntimeConstruct): {
        message: string;
    };
}
export interface CompiledArrayDefaultInitializer<T extends BoundedArrayType = BoundedArrayType> extends ArrayDefaultInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly target: ObjectEntity<T>;
    readonly elementInitializers?: CompiledDefaultInitializer<T["elemType"]>[];
}
export declare class RuntimeArrayDefaultInitializer<T extends BoundedArrayType = BoundedArrayType> extends RuntimeDefaultInitializer<T, CompiledArrayDefaultInitializer<T>> {
    readonly elementInitializers?: RuntimeDefaultInitializer<T["elemType"]>[];
    private index;
    constructor(model: CompiledArrayDefaultInitializer<T>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
export declare class ClassDefaultInitializer extends DefaultInitializer {
    readonly construct_type = "ClassDefaultInitializer";
    readonly target: ObjectEntity<CompleteClassType>;
    readonly ctor?: FunctionEntity<FunctionType<VoidType>>;
    readonly ctorCall?: FunctionCall;
    constructor(context: TranslationUnitContext, target: ObjectEntity<CompleteClassType>);
    createRuntimeInitializer<T extends CompleteClassType>(this: CompiledClassDefaultInitializer<T>, parent: RuntimeConstruct): RuntimeClassDefaultInitializer<T>;
    createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledDefaultInitializer<T>, parent: RuntimeConstruct): never;
    createDefaultOutlet(this: CompiledClassDefaultInitializer, element: JQuery, parent?: ConstructOutlet): ClassDefaultInitializerOutlet;
    explain(sim: Simulation, rtConstruct: RuntimeConstruct): {
        message: string;
    };
}
export interface CompiledClassDefaultInitializer<T extends CompleteClassType = CompleteClassType> extends ClassDefaultInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly target: ObjectEntity<T>;
    readonly ctor: FunctionEntity<FunctionType<VoidType>>;
    readonly ctorCall: CompiledFunctionCall<FunctionType<VoidType>>;
}
export declare class RuntimeClassDefaultInitializer<T extends CompleteClassType = CompleteClassType> extends RuntimeDefaultInitializer<T, CompiledClassDefaultInitializer<T>> {
    readonly ctorCall: RuntimeFunctionCall<FunctionType<VoidType>>;
    private index;
    constructor(model: CompiledClassDefaultInitializer<T>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
export interface DirectInitializerASTNode extends ASTNode {
    construct_type: "direct_initializer";
    args: ExpressionASTNode[];
}
export declare type DirectInitializerKind = "direct" | "copy";
export declare abstract class DirectInitializer extends Initializer {
    static create(context: TranslationUnitContext, target: UnboundReferenceEntity, args: readonly Expression[], kind: DirectInitializerKind): ReferenceDirectInitializer;
    static create(context: TranslationUnitContext, target: ObjectEntity<AtomicType>, args: readonly Expression[], kind: DirectInitializerKind): AtomicDirectInitializer;
    static create(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>, args: readonly Expression[], kind: DirectInitializerKind): ArrayDirectInitializer;
    static create(context: TranslationUnitContext, target: ObjectEntity<CompleteClassType>, args: readonly Expression[], kind: DirectInitializerKind): ClassDirectInitializer;
    static create(context: TranslationUnitContext, target: ObjectEntity, args: readonly Expression[], kind: DirectInitializerKind): AtomicDirectInitializer | ArrayDirectInitializer | ClassDirectInitializer;
    static create(context: TranslationUnitContext, target: ObjectEntity | UnboundReferenceEntity, args: readonly Expression[], kind: DirectInitializerKind): ReferenceDirectInitializer | AtomicDirectInitializer | ArrayDirectInitializer | ClassDirectInitializer;
    abstract readonly target: ObjectEntity | UnboundReferenceEntity;
    abstract readonly args: readonly Expression[];
    readonly kind: DirectInitializerKind;
    constructor(context: TranslationUnitContext, kind: DirectInitializerKind);
    abstract createRuntimeInitializer<T extends ObjectEntityType>(this: CompiledDirectInitializer<T>, parent: RuntimeConstruct): RuntimeDirectInitializer<T>;
}
export interface CompiledDirectInitializer<T extends ObjectEntityType = ObjectEntityType> extends DirectInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly target: ObjectEntity<Exclude<T, ReferenceType>> | UnboundReferenceEntity<Extract<T, ReferenceType>>;
    readonly args: readonly CompiledExpression[];
}
export declare abstract class RuntimeDirectInitializer<T extends ObjectEntityType = ObjectEntityType, C extends CompiledDirectInitializer<T> = CompiledDirectInitializer<T>> extends RuntimeInitializer<C> {
    protected constructor(model: C, parent: RuntimeConstruct);
}
export declare class ReferenceDirectInitializer extends DirectInitializer {
    readonly construct_type = "ReferenceDirectInitializer";
    readonly target: UnboundReferenceEntity;
    readonly args: readonly Expression[];
    readonly arg?: Expression;
    constructor(context: TranslationUnitContext, target: UnboundReferenceEntity, args: readonly Expression[], kind: DirectInitializerKind);
    createRuntimeInitializer<T extends ReferenceType<CompleteObjectType>>(this: CompiledReferenceDirectInitializer<T>, parent: RuntimeConstruct): RuntimeReferenceDirectInitializer<T>;
    createRuntimeInitializer<T extends ReferenceType<CompleteObjectType>>(this: CompiledDirectInitializer<T>, parent: RuntimeConstruct): never;
    createDefaultOutlet(this: CompiledReferenceDirectInitializer, element: JQuery, parent?: ConstructOutlet): ReferenceDirectInitializerOutlet;
    explain(sim: Simulation, rtConstruct: RuntimeConstruct): {
        message: string;
    };
}
export interface CompiledReferenceDirectInitializer<T extends ReferenceType = ReferenceType> extends ReferenceDirectInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly target: UnboundReferenceEntity<Extract<T, ReferenceType>>;
    readonly args: readonly CompiledExpression[];
    readonly arg: CompiledExpression<ReferredType<T>, "lvalue">;
}
export declare class RuntimeReferenceDirectInitializer<T extends ReferenceType<CompleteObjectType> = ReferenceType<CompleteObjectType>> extends RuntimeDirectInitializer<T, CompiledReferenceDirectInitializer<T>> {
    readonly args: readonly RuntimeExpression<ReferredType<T>, "lvalue">[];
    readonly arg: RuntimeExpression<ReferredType<T>, "lvalue">;
    private alreadyPushed;
    constructor(model: CompiledReferenceDirectInitializer<T>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
export declare class AtomicDirectInitializer extends DirectInitializer {
    readonly construct_type = "AtomicDirectInitializer";
    readonly target: ObjectEntity<AtomicType>;
    readonly args: readonly Expression[];
    readonly arg: Expression;
    constructor(context: TranslationUnitContext, target: ObjectEntity<AtomicType>, args: readonly Expression[], kind: DirectInitializerKind);
    createRuntimeInitializer<T extends AtomicType>(this: CompiledAtomicDirectInitializer<T>, parent: RuntimeConstruct): RuntimeAtomicDirectInitializer<T>;
    createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledDirectInitializer<T>, parent: RuntimeConstruct): never;
    createDefaultOutlet(this: CompiledAtomicDirectInitializer, element: JQuery, parent?: ConstructOutlet): AtomicDirectInitializerOutlet;
    explain(sim: Simulation, rtConstruct: RuntimeConstruct): {
        message: string;
    };
}
export interface CompiledAtomicDirectInitializer<T extends AtomicType = AtomicType> extends AtomicDirectInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly target: ObjectEntity<Exclude<T, ReferenceType>>;
    readonly args: readonly CompiledExpression[];
    readonly arg: CompiledExpression<T, "prvalue">;
}
export declare class RuntimeAtomicDirectInitializer<T extends AtomicType = AtomicType> extends RuntimeDirectInitializer<T, CompiledAtomicDirectInitializer<T>> {
    readonly args: readonly RuntimeExpression<T, "prvalue">[];
    readonly arg: RuntimeExpression<T, "prvalue">;
    private alreadyPushed;
    constructor(model: CompiledAtomicDirectInitializer<T>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
/**
 * Note: Only allowed use is to initialize a char array from a string literal, but this can readily be
 * created in the course of compiling a program if the code attempts to directly initialize an array. That's
 * desirable, because this class will give the appropriate error messages if it's anything other than a
 * char array initialized from a string literal.
 */
export declare class ArrayDirectInitializer extends DirectInitializer {
    readonly construct_type = "ArrayDirectInitializer";
    readonly target: ObjectEntity<BoundedArrayType>;
    readonly args: readonly Expression[];
    readonly arg?: StringLiteralExpression;
    constructor(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>, args: readonly Expression[], kind: "direct" | "copy");
    createRuntimeInitializer(this: CompiledArrayDirectInitializer, parent: RuntimeConstruct): RuntimeArrayDirectInitializer;
    createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledDirectInitializer<T>, parent: RuntimeConstruct): never;
    createDefaultOutlet(this: CompiledAtomicDirectInitializer, element: JQuery, parent?: ConstructOutlet): AtomicDirectInitializerOutlet;
    explain(sim: Simulation, rtConstruct: RuntimeConstruct): {
        message: string;
    };
}
export interface CompiledArrayDirectInitializer extends ArrayDirectInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly target: ObjectEntity<BoundedArrayType<Char>>;
    readonly args: readonly CompiledStringLiteralExpression[];
    readonly arg: CompiledStringLiteralExpression;
}
export declare class RuntimeArrayDirectInitializer extends RuntimeDirectInitializer<BoundedArrayType<Char>, CompiledArrayDirectInitializer> {
    readonly arg: RuntimeStringLiteralExpression;
    readonly args: readonly RuntimeStringLiteralExpression[];
    private alreadyPushed;
    constructor(model: CompiledArrayDirectInitializer, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
export declare class ClassDirectInitializer extends DirectInitializer {
    readonly construct_type = "ClassDirectInitializer";
    readonly target: ObjectEntity<CompleteClassType>;
    readonly args: readonly Expression[];
    readonly ctor?: FunctionEntity<FunctionType<VoidType>>;
    readonly ctorCall?: FunctionCall;
    constructor(context: TranslationUnitContext, target: ObjectEntity<CompleteClassType>, args: readonly Expression[], kind: DirectInitializerKind);
    createRuntimeInitializer<T extends CompleteClassType>(this: CompiledClassDirectInitializer<T>, parent: RuntimeConstruct): RuntimeClassDirectInitializer<T>;
    createRuntimeInitializer<T extends CompleteObjectType>(this: CompiledDirectInitializer<T>, parent: RuntimeConstruct): never;
    createDefaultOutlet(this: CompiledClassDirectInitializer, element: JQuery, parent?: ConstructOutlet): ClassDirectInitializerOutlet;
    explain(sim: Simulation, rtConstruct: RuntimeConstruct): {
        message: string;
    };
}
export interface CompiledClassDirectInitializer<T extends CompleteClassType = CompleteClassType> extends ClassDirectInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly target: ObjectEntity<Exclude<T, ReferenceType>>;
    readonly args: readonly CompiledExpression[];
    readonly ctor: FunctionEntity<FunctionType<VoidType>>;
    readonly ctorCall: CompiledFunctionCall<FunctionType<VoidType>>;
}
export declare class RuntimeClassDirectInitializer<T extends CompleteClassType = CompleteClassType> extends RuntimeDirectInitializer<T, CompiledClassDirectInitializer<T>> {
    readonly ctorCall?: RuntimeFunctionCall<FunctionType<VoidType>>;
    private index;
    constructor(model: CompiledClassDirectInitializer<T>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
export interface CopyInitializerASTNode extends ASTNode {
    readonly construct_type: "copy_initializer";
    readonly args: ExpressionASTNode[];
}
declare type DelegatedConstructorCtorInitializerComponent = {
    kind: "delegatedConstructor";
    args: readonly Expression[];
};
declare type BaseCtorInitializerComponent = {
    kind: "base";
    args: readonly Expression[];
};
declare type MemberCtorInitializerComponent = {
    kind: "member";
    name: string;
    args: readonly Expression[];
};
declare type CtorInitializerComponent = DelegatedConstructorCtorInitializerComponent | BaseCtorInitializerComponent | MemberCtorInitializerComponent;
export declare class CtorInitializer extends BasicCPPConstruct<MemberBlockContext, CtorInitializerASTNode> {
    readonly construct_type = "ctor_initializer";
    readonly target: ReceiverEntity;
    readonly delegatedConstructorInitializer?: ClassDirectInitializer;
    readonly baseInitializer?: ClassDefaultInitializer | ClassDirectInitializer;
    readonly memberInitializers: readonly (DefaultInitializer | DirectInitializer)[];
    readonly memberInitializersByName: {
        [index: string]: DirectInitializer | DefaultInitializer | undefined;
    };
    static createFromAST(ast: CtorInitializerASTNode, context: MemberFunctionContext): CtorInitializer;
    constructor(context: MemberBlockContext, ast: CtorInitializerASTNode | undefined, components: readonly CtorInitializerComponent[]);
    createRuntimeCtorInitializer(this: CompiledCtorInitializer, parent: RuntimeConstruct): RuntimeCtorInitializer;
    createDefaultOutlet(this: CompiledCtorInitializer, element: JQuery, parent?: ConstructOutlet): CtorInitializerOutlet;
}
export interface CompiledCtorInitializer extends CtorInitializer, SuccessfullyCompiled {
    readonly delegatedConstructorInitializer?: CompiledClassDirectInitializer;
    readonly baseInitializer?: CompiledClassDefaultInitializer | CompiledClassDirectInitializer;
    readonly memberInitializers: readonly (CompiledDefaultInitializer | CompiledDirectInitializer)[];
    readonly memberInitializersByName: {
        [index: string]: CompiledClassDefaultInitializer | CompiledDirectInitializer | undefined;
    };
}
export declare class RuntimeCtorInitializer extends RuntimeConstruct<CompiledCtorInitializer> {
    readonly delegatedConstructorInitializer?: RuntimeClassDirectInitializer;
    readonly baseInitializer?: RuntimeClassDefaultInitializer | RuntimeClassDirectInitializer;
    readonly memberInitializers: readonly (RuntimeDefaultInitializer | RuntimeDirectInitializer)[];
    private index;
    private memberIndex;
    constructor(model: CompiledCtorInitializer, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    stepForwardImpl(): void;
}
export interface ListInitializerASTNode extends ASTNode {
    readonly construct_type: "list_initializer";
    readonly arg: InitializerListExpressionASTNode;
}
export declare abstract class ListInitializer extends Initializer {
    static create(context: TranslationUnitContext, target: UnboundReferenceEntity, args: readonly Expression[]): InvalidConstruct;
    static create(context: TranslationUnitContext, target: ObjectEntity<AtomicType>, args: readonly Expression[]): InvalidConstruct;
    static create(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>, args: readonly Expression[]): InvalidConstruct;
    static create(context: TranslationUnitContext, target: ObjectEntity<CompleteClassType>, args: readonly Expression[]): ClassDirectInitializer;
    static create(context: TranslationUnitContext, target: ObjectEntity, args: readonly Expression[]): ClassDirectInitializer | InvalidConstruct;
    static create(context: TranslationUnitContext, target: ObjectEntity | UnboundReferenceEntity, args: readonly Expression[]): ClassDirectInitializer | InvalidConstruct;
    abstract readonly target: ObjectEntity | UnboundReferenceEntity;
    abstract readonly args: readonly Expression[];
    constructor(context: TranslationUnitContext);
    abstract createRuntimeInitializer<T extends ObjectEntityType>(this: CompiledListInitializer<T>, parent: RuntimeConstruct): RuntimeListInitializer<T>;
}
export interface CompiledListInitializer<T extends ObjectEntityType = ObjectEntityType> extends ListInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly target: ObjectEntity<Exclude<T, ReferenceType>> | UnboundReferenceEntity<Extract<T, ReferenceType>>;
    readonly args: readonly CompiledExpression[];
}
export declare abstract class RuntimeListInitializer<T extends ObjectEntityType = ObjectEntityType, C extends CompiledListInitializer<T> = CompiledListInitializer<T>> extends RuntimeInitializer<C> {
    protected constructor(model: C, parent: RuntimeConstruct);
}
export {};
