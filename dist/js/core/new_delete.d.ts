/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { ArraySubobject, DynamicObject } from "./objects";
import { AtomicType, PointerType, BoundedArrayType, FunctionType, VoidType, Int, ArrayElemType, CompleteClassType, Type, PointerToCompleteType as PointerToCompleteObjectType, PotentiallyCompleteArrayType } from "./types";
import { SuccessfullyCompiled, RuntimeConstruct, ExpressionContext, ConstructDescription } from "./constructs";
import { NewArrayEntity } from "./entities";
import { RuntimeExpression, Expression, CompiledExpression, t_TypedExpression } from "./expressionBase";
import { ConstructOutlet, NewExpressionOutlet, DeleteExpressionOutlet, NewArrayExpressionOutlet, DeleteArrayExpressionOutlet } from "../view/codeOutlets";
import { CompiledTemporaryDeallocator } from "./PotentialFullExpression";
import { CompiledFunctionCall, FunctionCall, RuntimeFunctionCall } from "./FunctionCall";
import { CompiledDefaultInitializer, CompiledDirectInitializer, CompiledInitializer, DefaultInitializer, DirectInitializer, Initializer, RuntimeDefaultInitializer, RuntimeDirectInitializer, RuntimeInitializer } from "./initializers";
import { CompiledDeclarator, CompiledTypeSpecifier, Declarator, TypeSpecifier } from "./declarations";
import { NewExpressionASTNode, DeleteExpressionASTNode, DeleteArrayExpressionASTNode } from "../ast/ast_expressions";
export declare function createNewExpressionFromAST(ast: NewExpressionASTNode, context: ExpressionContext): NewExpression | NewArrayExpression;
export declare type NewObjectType = AtomicType | CompleteClassType;
export declare class NewExpression extends Expression<NewExpressionASTNode> {
    readonly construct_type = "new_expression";
    readonly type?: PointerType<NewObjectType>;
    readonly createdType?: NewObjectType;
    readonly valueCategory = "prvalue";
    readonly typeSpecifier: TypeSpecifier;
    readonly declarator: Declarator;
    readonly initializer?: Initializer;
    constructor(context: ExpressionContext, ast: NewExpressionASTNode, typeSpecifier: TypeSpecifier, declarator: Declarator, createdType: Exclude<Type, PotentiallyCompleteArrayType> | undefined);
    createDefaultOutlet(this: CompiledNewExpression, element: JQuery, parent?: ConstructOutlet): NewExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedNewExpression<T extends PointerType<NewObjectType> = PointerType<NewObjectType>> extends NewExpression, t_TypedExpression {
    readonly type: T;
    readonly createdType: T["ptrTo"];
}
export interface CompiledNewExpression<T extends PointerType<NewObjectType> = PointerType<NewObjectType>> extends TypedNewExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly declarator: CompiledDeclarator<T["ptrTo"]>;
    readonly initializer?: CompiledInitializer<T["ptrTo"]>;
}
export declare class RuntimeNewExpression<T extends PointerType<NewObjectType> = PointerType<NewObjectType>> extends RuntimeExpression<T, "prvalue", CompiledNewExpression<T>> {
    private index;
    readonly initializer?: RuntimeInitializer;
    readonly allocatedObject?: DynamicObject<T["ptrTo"]>;
    constructor(model: CompiledNewExpression<T>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
export declare class NewArrayExpression extends Expression<NewExpressionASTNode> {
    readonly construct_type = "new_array_expression";
    readonly type?: PointerType<ArrayElemType>;
    readonly createdType?: PotentiallyCompleteArrayType;
    readonly valueCategory = "prvalue";
    readonly typeSpecifier: TypeSpecifier;
    readonly declarator: Declarator;
    readonly allocatedArray: NewArrayEntity;
    readonly individualElementInitializers?: readonly DirectInitializer[];
    readonly fallbackElementInitializer?: DefaultInitializer;
    readonly dynamicLengthExpression?: Expression;
    constructor(context: ExpressionContext, ast: NewExpressionASTNode, typeSpecifier: TypeSpecifier, declarator: Declarator, createdType: PotentiallyCompleteArrayType);
    createDefaultOutlet(this: CompiledNewArrayExpression, element: JQuery, parent?: ConstructOutlet): NewArrayExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedNewArrayExpression<T extends PointerType<ArrayElemType> = PointerType<ArrayElemType>> extends NewArrayExpression, t_TypedExpression {
    readonly type: T;
    readonly createdType: PotentiallyCompleteArrayType<T["ptrTo"]>;
    readonly allocatedArray: NewArrayEntity<PotentiallyCompleteArrayType<T["ptrTo"]>>;
}
export interface CompiledNewArrayExpression<T extends PointerType<ArrayElemType> = PointerType<ArrayElemType>> extends TypedNewArrayExpression<T>, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly declarator: CompiledDeclarator;
    readonly individualElementInitializers: readonly CompiledDirectInitializer[];
    readonly fallbackElementInitializer: CompiledDefaultInitializer;
    readonly dynamicLengthExpression?: CompiledExpression<Int, "prvalue">;
}
export declare class RuntimeNewArrayExpression<T extends PointerType<ArrayElemType> = PointerType<ArrayElemType>> extends RuntimeExpression<T, "prvalue", CompiledNewArrayExpression<T>> {
    private elemInitIndex;
    readonly dynamicLengthExpression?: RuntimeExpression<Int, "prvalue">;
    readonly elementInitializers?: readonly (RuntimeDefaultInitializer | RuntimeDirectInitializer)[];
    readonly allocatedObject?: DynamicObject<BoundedArrayType<T["ptrTo"]>>;
    readonly nextElemToInit?: ArraySubobject<T["ptrTo"]>;
    constructor(model: CompiledNewArrayExpression<T>, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
export declare class DeleteExpression extends Expression<DeleteExpressionASTNode> {
    readonly construct_type = "delete_expression";
    readonly type: VoidType;
    readonly valueCategory = "prvalue";
    readonly operand: Expression;
    readonly dtor?: FunctionCall;
    readonly operator = "delete";
    constructor(context: ExpressionContext, ast: DeleteExpressionASTNode, operand: Expression);
    static createFromAST(ast: DeleteExpressionASTNode, context: ExpressionContext): DeleteExpression;
    createDefaultOutlet(this: CompiledDeleteExpression, element: JQuery, parent?: ConstructOutlet): DeleteExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedDeleteExpression extends DeleteExpression, t_TypedExpression {
}
export interface CompiledDeleteExpression extends TypedDeleteExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly operand: CompiledExpression<PointerToCompleteObjectType, "prvalue">;
    readonly dtor?: CompiledFunctionCall<FunctionType<VoidType>>;
}
export declare class RuntimeDeleteExpression extends RuntimeExpression<VoidType, "prvalue", CompiledDeleteExpression> {
    readonly operand: RuntimeExpression<PointerToCompleteObjectType, "prvalue">;
    readonly dtor?: RuntimeFunctionCall<FunctionType<VoidType>>;
    readonly destroyedObject?: DynamicObject<NewObjectType>;
    constructor(model: CompiledDeleteExpression, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
export declare class DeleteArrayExpression extends Expression<DeleteArrayExpressionASTNode> {
    readonly construct_type = "delete_array_expression";
    readonly type: VoidType;
    readonly valueCategory = "prvalue";
    readonly operand: Expression;
    readonly elementDtor?: FunctionCall;
    readonly operator = "delete";
    constructor(context: ExpressionContext, ast: DeleteArrayExpressionASTNode, operand: Expression);
    static createFromAST(ast: DeleteArrayExpressionASTNode, context: ExpressionContext): DeleteArrayExpression;
    createDefaultOutlet(this: CompiledDeleteArrayExpression, element: JQuery, parent?: ConstructOutlet): DeleteArrayExpressionOutlet;
    describeEvalResult(depth: number): ConstructDescription;
}
export interface TypedDeleteArrayExpression extends DeleteArrayExpression, t_TypedExpression {
}
export interface CompiledDeleteArrayExpression extends TypedDeleteArrayExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator;
    readonly operand: CompiledExpression<PointerToCompleteObjectType, "prvalue">;
    readonly elementDtor?: CompiledFunctionCall<FunctionType<VoidType>>;
}
export declare class RuntimeDeleteArrayExpression extends RuntimeExpression<VoidType, "prvalue", CompiledDeleteArrayExpression> {
    private index;
    readonly operand: RuntimeExpression<PointerToCompleteObjectType, "prvalue">;
    readonly dtors: readonly RuntimeFunctionCall<FunctionType<VoidType>>[];
    readonly targetArray?: DynamicObject<BoundedArrayType>;
    constructor(model: CompiledDeleteArrayExpression, parent: RuntimeConstruct);
    protected upNextImpl(): void;
    protected stepForwardImpl(): void;
}
