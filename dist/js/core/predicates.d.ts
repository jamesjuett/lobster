import { AnalyticExpression, AnalyticTypedExpression, IdentifierExpression, AssignmentExpression, PrefixIncrementExpression, PostfixIncrementExpression, t_OverloadableOperators, OperatorOverloadExpression, DotExpression, ArrowExpression, SubscriptExpression, CompoundAssignmentExpression } from "./expressions";
import { ValueCategory, Expression, TypedExpression } from "./expressionBase";
import { LocalVariableDefinition, GlobalVariableDefinition, FunctionDefinition, AnalyticDeclaration, TypeSpecifier, StorageSpecifier, AnalyticTypedDeclaration, BaseSpecifier } from "./declarations";
import { Type, ExpressionType } from "./types";
import { DiscriminateUnion } from "../util/util";
import { AnalyticStatement } from "./statements";
import { CPPConstruct, GlobalObjectAllocator } from "./constructs";
import { FunctionCallExpression } from "./FunctionCallExpression";
import { CtorInitializer } from "./initializers";
import { VariableEntity } from "./entities";
import { FunctionCall } from "./FunctionCall";
import { ObjectDeallocator } from "./ObjectDeallocator";
import { TemporaryDeallocator } from "./PotentialFullExpression";
export declare type ConstructKind<Cs extends {
    construct_type: string;
}> = Cs["construct_type"];
export declare type AnalyticConstruct = AnalyticDeclaration | TypeSpecifier | StorageSpecifier | AnalyticExpression | AnalyticStatement | GlobalObjectAllocator | ObjectDeallocator | TemporaryDeallocator | BaseSpecifier | FunctionCall | CtorInitializer;
export declare namespace Predicates {
    function byKind<NarrowedKind extends ConstructKind<AnalyticConstruct>>(constructKind: NarrowedKind): <Original extends {
        construct_type: string;
    }, Narrowed extends DiscriminateUnion<Original, "construct_type", NarrowedKind>>(construct: Original) => construct is Narrowed extends Original ? Narrowed : never;
    function byKinds<NarrowedKind extends ConstructKind<AnalyticConstruct>>(constructKinds: readonly NarrowedKind[]): <Original extends {
        construct_type: string;
    }, Narrowed extends DiscriminateUnion<Original, "construct_type", NarrowedKind>>(construct: Original) => construct is Narrowed extends Original ? Narrowed : never;
    function byTypedExpression<NarrowedT extends ExpressionType, NarrowedVC extends ValueCategory>(typePredicate?: (o: ExpressionType) => o is NarrowedT, valueCategory?: NarrowedVC): <OriginalT extends ExpressionType, Original extends AnalyticConstruct & {
        type?: OriginalT | undefined;
        valueCategory?: ValueCategory | undefined;
    }, Narrowed extends Original extends AnalyticExpression ? AnalyticTypedExpression<Original, NarrowedT, NarrowedVC> : never>(construct: Original) => construct is Narrowed extends Original ? Narrowed : never;
    function isTypedExpression<OriginalT extends ExpressionType, NarrowedT extends ExpressionType, Original extends AnalyticConstruct & {
        type?: OriginalT;
        valueCategory?: ValueCategory;
    }, NarrowedVC extends NonNullable<Original["valueCategory"]>, Narrowed extends (Original extends AnalyticExpression ? AnalyticTypedExpression<Original, NarrowedT, NarrowedVC> : never)>(construct: Original, typePredicate?: (o: ExpressionType) => o is NarrowedT, valueCategory?: NarrowedVC): construct is (Narrowed extends Original ? Narrowed : Original extends Narrowed ? Original : never);
    function isTypedExpression<OriginalT extends ExpressionType, NarrowedT extends ExpressionType, Original extends CPPConstruct & {
        type?: OriginalT;
        valueCategory?: ValueCategory;
    }, NarrowedVC extends NonNullable<Original["valueCategory"]>, Narrowed extends (Original extends Expression ? TypedExpression<NarrowedT, NarrowedVC> : never)>(construct: Original, typePredicate: (o: ExpressionType) => o is NarrowedT, valueCategory?: NarrowedVC): construct is (Narrowed extends Original ? Narrowed : Original extends Narrowed ? Original : never);
    function byTypedDeclaration<NarrowedT extends Type>(typePredicate?: (o: Type) => o is NarrowedT): <OriginalT extends Type, Original extends AnalyticConstruct & {
        type?: OriginalT | undefined;
    }, Narrowed extends Original extends AnalyticDeclaration ? AnalyticTypedDeclaration<Original, NarrowedT> : never>(construct: Original) => construct is Narrowed extends Original ? Narrowed : never;
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
    function byOperatorOverloadCall(operator: t_OverloadableOperators): (construct: AnalyticConstruct) => construct is OperatorOverloadExpression;
    function byIdentifierName<N extends string>(name: N): (construct: AnalyticConstruct) => construct is IdentifierExpression & {
        name: N;
    };
    function byVariableIdentifier<VE extends VariableEntity>(v: VE): (construct: AnalyticConstruct) => construct is IdentifierExpression & {
        entity: VE;
    };
    function byVariableAssignedTo<VE extends VariableEntity>(v: VE): (construct: AnalyticConstruct) => construct is AssignmentExpression | CompoundAssignmentExpression;
    function byVariableIncremented<VE extends VariableEntity>(v: VE): (construct: AnalyticConstruct) => construct is PrefixIncrementExpression | PostfixIncrementExpression;
    function byMemberAccessName<N extends string>(memberName: N): (construct: AnalyticConstruct) => construct is DotExpression | (ArrowExpression & {
        memberName: N;
    });
    const isLoop: <Original extends {
        construct_type: string;
    }, Narrowed extends DiscriminateUnion<Original, "construct_type", "while_statement" | "for_statement">>(construct: Original) => construct is Narrowed extends Original ? Narrowed : never;
    const isOperatorOverload: <Original extends {
        construct_type: string;
    }, Narrowed extends DiscriminateUnion<Original, "construct_type", "non_member_operator_overload_expression" | "member_operator_overload_expression" | "invalid_operator_overload_expression">>(construct: Original) => construct is Narrowed extends Original ? Narrowed : never;
    function isIndexingOperation(construct: AnalyticConstruct): construct is SubscriptExpression | OperatorOverloadExpression;
    const isBinaryOperatorExpression: <Original extends {
        construct_type: string;
    }, Narrowed extends DiscriminateUnion<Original, "construct_type", "arithmetic_binary_operator_expression" | "relational_binary_operator_expression" | "logical_binary_operator_expression">>(construct: Original) => construct is Narrowed extends Original ? Narrowed : never;
}
