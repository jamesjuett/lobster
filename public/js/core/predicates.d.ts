import { AnalyticExpression, TernaryExpression, AnalyticTypedExpression, IdentifierExpression, PointerDifferenceExpression, AssignmentExpression, NumericLiteralExpression, ImplicitConversion, PrefixIncrementExpression, PostfixIncrementExpression, OverloadableOperator, OperatorOverloadExpression, DotExpression, ArrowExpression } from "./expressions";
import { ValueCategory, Expression, TypedExpression } from "./expressionBase";
import { UnknownTypeDeclaration, VoidDeclaration, FunctionDeclaration, LocalVariableDefinition, GlobalVariableDefinition, ParameterDeclaration, Declarator, ClassDefinition, FunctionDefinition, AnalyticDeclaration, TypeSpecifier, StorageSpecifier, AnalyticTypedDeclaration } from "./declarations";
import { Type, VoidType, ArrayOfUnknownBoundType, AtomicType, ExpressionType } from "./types";
import { DiscriminateUnion } from "../util/util";
import { AnalyticStatement } from "./statements";
import { CPPConstruct } from "./constructs";
import { FunctionCallExpression, FunctionCall } from "./functionCall";
export declare type ConstructKind<Cs extends {
    construct_type: string;
}> = Cs["construct_type"];
export declare type AnalyticConstruct = AnalyticDeclaration | TypeSpecifier | StorageSpecifier | AnalyticExpression | AnalyticStatement;
export declare namespace Predicates {
    function byKind<NarrowedKind extends ConstructKind<AnalyticConstruct>>(constructKind: NarrowedKind): <Original extends {
        construct_type: string;
    }, Narrowed extends DiscriminateUnion<Original, "construct_type", NarrowedKind>>(construct: Original) => construct is Narrowed extends Original ? Narrowed : never;
    function byKinds<NarrowedKind extends ConstructKind<AnalyticConstruct>>(constructKinds: readonly NarrowedKind[]): <Original extends {
        construct_type: string;
    }, Narrowed extends DiscriminateUnion<Original, "construct_type", NarrowedKind>>(construct: Original) => construct is Narrowed extends Original ? Narrowed : never;
    function byTypedExpression<NarrowedT extends ExpressionType, NarrowedVC extends ValueCategory>(typePredicate?: (o: ExpressionType) => o is NarrowedT, valueCategory?: NarrowedVC): <OriginalT extends AtomicType | import("./types").BoundedArrayType<import("./types").ArrayElemType> | import("./types").CompleteClassType | import("./types").IncompleteClassType | VoidType | import("./types").FunctionType<import("./types").PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, Original extends (GlobalVariableDefinition & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./constructs").InvalidConstruct & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (TypeSpecifier & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (StorageSpecifier & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (Declarator & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (ParameterDeclaration & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (FunctionDefinition & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (FunctionDeclaration & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").StringLiteralExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./statements").Block & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (ClassDefinition & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (UnknownTypeDeclaration & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (VoidDeclaration & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./declarations").TypedefDeclaration & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./declarations").FriendDeclaration & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./declarations").UnknownBoundArrayDeclaration & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./declarations").IncompleteTypeVariableDefinition & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (LocalVariableDefinition & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./declarations").MemberVariableDeclaration & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./declarations").IncompleteTypeMemberVariableDeclaration & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").CommaExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (TernaryExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (AssignmentExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").ArithmeticBinaryOperatorExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (PointerDifferenceExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").PointerOffsetExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").OutputOperatorExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").InputOperatorExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").RelationalBinaryOperatorExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").PointerComparisonExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").LogicalBinaryOperatorExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").NonMemberOperatorOverloadExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").MemberOperatorOverloadExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").DereferenceExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").AddressOfExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").UnaryPlusExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").UnaryMinusExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").LogicalNotExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (PrefixIncrementExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (PostfixIncrementExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").SubscriptExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (DotExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (ArrowExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (FunctionCallExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (IdentifierExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (NumericLiteralExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").ParenthesesExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").InitializerListExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./opaqueExpression").OpaqueExpression<AtomicType | import("./types").BoundedArrayType<import("./types").ArrayElemType> | import("./types").CompleteClassType | import("./types").IncompleteClassType | VoidType | import("./types").FunctionType<import("./types").PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, ValueCategory> & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").MagicFunctionCallExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").AuxiliaryExpression<AtomicType | import("./types").BoundedArrayType<import("./types").ArrayElemType> | import("./types").CompleteClassType | import("./types").IncompleteClassType | VoidType | import("./types").FunctionType<import("./types").PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, ValueCategory> & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./expressions").UnsupportedExpression & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (ImplicitConversion<import("./types").CompleteObjectType, ValueCategory, import("./types").CompleteObjectType, ValueCategory> & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./statements").IfStatement & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./statements").WhileStatement & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./statements").ForStatement & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./statements").BreakStatement & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./statements").ReturnStatement & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./statements").DeclarationStatement & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./statements").ExpressionStatement & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./statements").NullStatement & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }) | (import("./statements").UnsupportedStatement & {
        type?: OriginalT | undefined;
        valueCategory?: "prvalue" | "lvalue" | undefined;
    }), Narrowed extends Original extends AnalyticExpression ? AnalyticTypedExpression<Original, NarrowedT, NarrowedVC> : never>(construct: Original) => construct is Narrowed extends Original ? Narrowed : never;
    function isTypedExpression<OriginalT extends ExpressionType, NarrowedT extends ExpressionType, Original extends AnalyticConstruct & {
        type?: OriginalT;
        valueCategory?: ValueCategory;
    }, NarrowedVC extends NonNullable<Original["valueCategory"]>, Narrowed extends (Original extends AnalyticExpression ? AnalyticTypedExpression<Original, NarrowedT, NarrowedVC> : never)>(construct: Original, typePredicate?: (o: ExpressionType) => o is NarrowedT, valueCategory?: NarrowedVC): construct is (Narrowed extends Original ? Narrowed : Original extends Narrowed ? Original : never);
    function isTypedExpression<OriginalT extends ExpressionType, NarrowedT extends ExpressionType, Original extends CPPConstruct & {
        type?: OriginalT;
        valueCategory?: ValueCategory;
    }, NarrowedVC extends NonNullable<Original["valueCategory"]>, Narrowed extends (Original extends Expression ? TypedExpression<NarrowedT, NarrowedVC> : never)>(construct: Original, typePredicate: (o: ExpressionType) => o is NarrowedT, valueCategory?: NarrowedVC): construct is (Narrowed extends Original ? Narrowed : Original extends Narrowed ? Original : never);
    function byTypedDeclaration<NarrowedT extends Type>(typePredicate?: (o: Type) => o is NarrowedT): <OriginalT extends Type, Original extends (GlobalVariableDefinition & {
        type?: OriginalT | undefined;
    }) | (import("./constructs").InvalidConstruct & {
        type?: OriginalT | undefined;
    }) | (TypeSpecifier & {
        type?: OriginalT | undefined;
    }) | (StorageSpecifier & {
        type?: OriginalT | undefined;
    }) | (Declarator & {
        type?: OriginalT | undefined;
    }) | (ParameterDeclaration & {
        type?: OriginalT | undefined;
    }) | (FunctionDefinition & {
        type?: OriginalT | undefined;
    }) | (FunctionDeclaration & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").StringLiteralExpression & {
        type?: OriginalT | undefined;
    }) | (import("./statements").Block & {
        type?: OriginalT | undefined;
    }) | (ClassDefinition & {
        type?: OriginalT | undefined;
    }) | (UnknownTypeDeclaration & {
        type?: OriginalT | undefined;
    }) | (VoidDeclaration & {
        type?: OriginalT | undefined;
    }) | (import("./declarations").TypedefDeclaration & {
        type?: OriginalT | undefined;
    }) | (import("./declarations").FriendDeclaration & {
        type?: OriginalT | undefined;
    }) | (import("./declarations").UnknownBoundArrayDeclaration & {
        type?: OriginalT | undefined;
    }) | (import("./declarations").IncompleteTypeVariableDefinition & {
        type?: OriginalT | undefined;
    }) | (LocalVariableDefinition & {
        type?: OriginalT | undefined;
    }) | (import("./declarations").MemberVariableDeclaration & {
        type?: OriginalT | undefined;
    }) | (import("./declarations").IncompleteTypeMemberVariableDeclaration & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").CommaExpression & {
        type?: OriginalT | undefined;
    }) | (TernaryExpression & {
        type?: OriginalT | undefined;
    }) | (AssignmentExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").ArithmeticBinaryOperatorExpression & {
        type?: OriginalT | undefined;
    }) | (PointerDifferenceExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").PointerOffsetExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").OutputOperatorExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").InputOperatorExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").RelationalBinaryOperatorExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").PointerComparisonExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").LogicalBinaryOperatorExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").NonMemberOperatorOverloadExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").MemberOperatorOverloadExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").DereferenceExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").AddressOfExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").UnaryPlusExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").UnaryMinusExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").LogicalNotExpression & {
        type?: OriginalT | undefined;
    }) | (PrefixIncrementExpression & {
        type?: OriginalT | undefined;
    }) | (PostfixIncrementExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").SubscriptExpression & {
        type?: OriginalT | undefined;
    }) | (DotExpression & {
        type?: OriginalT | undefined;
    }) | (ArrowExpression & {
        type?: OriginalT | undefined;
    }) | (FunctionCallExpression & {
        type?: OriginalT | undefined;
    }) | (IdentifierExpression & {
        type?: OriginalT | undefined;
    }) | (NumericLiteralExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").ParenthesesExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").InitializerListExpression & {
        type?: OriginalT | undefined;
    }) | (import("./opaqueExpression").OpaqueExpression<AtomicType | import("./types").BoundedArrayType<import("./types").ArrayElemType> | import("./types").CompleteClassType | import("./types").IncompleteClassType | VoidType | import("./types").FunctionType<import("./types").PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, ValueCategory> & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").MagicFunctionCallExpression & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").AuxiliaryExpression<AtomicType | import("./types").BoundedArrayType<import("./types").ArrayElemType> | import("./types").CompleteClassType | import("./types").IncompleteClassType | VoidType | import("./types").FunctionType<import("./types").PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, ValueCategory> & {
        type?: OriginalT | undefined;
    }) | (import("./expressions").UnsupportedExpression & {
        type?: OriginalT | undefined;
    }) | (ImplicitConversion<import("./types").CompleteObjectType, ValueCategory, import("./types").CompleteObjectType, ValueCategory> & {
        type?: OriginalT | undefined;
    }) | (import("./statements").IfStatement & {
        type?: OriginalT | undefined;
    }) | (import("./statements").WhileStatement & {
        type?: OriginalT | undefined;
    }) | (import("./statements").ForStatement & {
        type?: OriginalT | undefined;
    }) | (import("./statements").BreakStatement & {
        type?: OriginalT | undefined;
    }) | (import("./statements").ReturnStatement & {
        type?: OriginalT | undefined;
    }) | (import("./statements").DeclarationStatement & {
        type?: OriginalT | undefined;
    }) | (import("./statements").ExpressionStatement & {
        type?: OriginalT | undefined;
    }) | (import("./statements").NullStatement & {
        type?: OriginalT | undefined;
    }) | (import("./statements").UnsupportedStatement & {
        type?: OriginalT | undefined;
    }), Narrowed extends Original extends AnalyticDeclaration ? AnalyticTypedDeclaration<Original, NarrowedT> : never>(construct: Original) => construct is Narrowed extends Original ? Narrowed : never;
    function isTypedDeclaration<OriginalT extends Type, NarrowedT extends Type, Original extends AnalyticConstruct & {
        type?: OriginalT;
    }, Narrowed extends (Original extends AnalyticDeclaration ? AnalyticTypedDeclaration<Original, NarrowedT> : never)>(construct: Original, typePredicate?: (o: Type) => o is NarrowedT): construct is (Narrowed extends Original ? Narrowed : never);
    function byVariableName(name: string): (construct: AnalyticConstruct) => construct is GlobalVariableDefinition | LocalVariableDefinition;
    function byVariableInitialValue(queryValue: number): (construct: AnalyticConstruct) => construct is GlobalVariableDefinition | LocalVariableDefinition;
    function byVariableUpdate(name: string): (construct: AnalyticConstruct) => construct is AssignmentExpression | PrefixIncrementExpression | PostfixIncrementExpression;
    function byFunctionName(name: string): (construct: AnalyticConstruct) => construct is FunctionDefinition;
    function byFunctionCallName<N extends string>(name: N): (construct: AnalyticConstruct) => construct is FunctionCallExpression & {
        call: FunctionCall;
    };
    function byOperatorOverloadCall<N extends string>(operator: OverloadableOperator): (construct: AnalyticConstruct) => construct is OperatorOverloadExpression;
    function byIdentifierName<N extends string>(name: N): (construct: AnalyticConstruct) => construct is IdentifierExpression & {
        name: N;
    };
    function byMemberAccessName<N extends string>(memberName: N): (construct: AnalyticConstruct) => construct is DotExpression | (ArrowExpression & {
        memberName: N;
    });
}
