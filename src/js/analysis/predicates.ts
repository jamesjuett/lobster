
import { containsConstruct, findFirstConstruct } from "./analysis";
import { DiscriminateUnion } from "../util/util";
import { CPPConstruct } from "../core/constructs/CPPConstruct";
import { AnalyticDeclaration, AnalyticTypedDeclaration } from "../core/constructs/declarations/analytics";
import { BaseSpecifier } from "../core/constructs/declarations/class/BaseSpecifier";
import { FunctionDefinition } from "../core/constructs/declarations/function/FunctionDefinition";
import { StorageSpecifier } from "../core/constructs/declarations/StorageSpecifier";
import { TypeSpecifier } from "../core/constructs/declarations/TypeSpecifier";
import { GlobalVariableDefinition } from "../core/constructs/declarations/variable/GlobalVariableDefinition";
import { LocalVariableDefinition } from "../core/constructs/declarations/variable/LocalVariableDefinition";
import { VariableEntity } from "../core/compilation/entities";
import { Expression, TypedExpression, ValueCategory } from "../core/constructs/expressions/Expression";
import { AnalyticExpression, AnalyticTypedExpression } from "../core/constructs/expressions/expressions";
import { t_OverloadableOperators } from "../core/constructs/expressions/selectOperatorOverload";
import { OperatorOverloadExpression } from "../core/constructs/expressions/OperatorOverloadExpression";
import { ImplicitConversion } from "../core/constructs/expressions/ImplicitConversion";
import { NumericLiteralExpression } from "../core/constructs/expressions/NumericLiteralExpression";
import { IdentifierExpression } from "../core/constructs/expressions/IdentifierExpression";
import { PostfixIncrementExpression } from "../core/constructs/expressions/PostfixIncrementExpression";
import { ArrowExpression } from "../core/constructs/expressions/ArrowExpression";
import { DotExpression } from "../core/constructs/expressions/DotExpression";
import { SubscriptExpression } from "../core/constructs/expressions/SubscriptExpression";
import { PrefixIncrementExpression } from "../core/constructs/expressions/PrefixIncrementExpression";
import { CompoundAssignmentExpression } from "../core/constructs/expressions/CompoundAssignmentExpression";
import { AssignmentExpression } from "../core/constructs/expressions/AssignmentExpression";
import { FunctionCall } from "../core/constructs/FunctionCall";
import { FunctionCallExpression } from "../core/constructs/expressions/FunctionCallExpression";
import { GlobalObjectAllocator } from "../core/constructs/GlobalObjectAllocator";
import { CtorInitializer } from "../core/constructs/initializers/CtorInitializer";
import { AtomicDirectInitializer } from "../core/constructs/initializers/DirectInitializer";
import { ObjectDeallocator } from "../core/constructs/ObjectDeallocator";
import { AnalyticStatement } from "../core/constructs/statements/statements";
import { TemporaryDeallocator } from "../core/constructs/TemporaryDeallocator";
import { ExpressionType, Type } from "../core/compilation/types";
import { AnalyticInitializer } from "../core/constructs/initializers/initializers";
import { DeclaratorName } from "../core/constructs/declarations/Declarator";



export type ConstructKind<Cs extends {construct_type: string}> = Cs["construct_type"];

export type AnalyticConstruct =
    AnalyticDeclaration |
    DeclaratorName |
    TypeSpecifier |
    StorageSpecifier |
    AnalyticExpression |
    AnalyticStatement |
    GlobalObjectAllocator |
    ObjectDeallocator |
    TemporaryDeallocator |
    BaseSpecifier |
    FunctionCall |
    AnalyticInitializer |
    CtorInitializer;

// type TypedKinds<T extends Type> = TypedDeclarationKinds<T> & TypedExpressionKinds<T, ValueCategory>;
// export type AnalyticTyped<C extends AnalyticConstruct, T extends Type = Type> =
//     C extends AnalyticDeclaration ? AnalyticTypedDeclaration<C, T> :
//     C extends AnalyticExpression ? AnalyticTypedExpression<C, T> : never;
// // export type AnalyticCompiledDeclaration<C extends AnalyticDeclaration, T extends AnalyticDeclaration["type"] = AnalyticDeclaration["type"]> = CompiledDeclarationKinds<T>[C["construct_type"]];

// export type AnalyticCompiled<C extends AnalyticConstruct> =
//     C extends AnalyticDeclaration ? AnalyticCompiledDeclaration<C> :
//     C extends AnalyticExpression ? AnalyticCompiledExpression<C> : never;
// let x!: AnalyticTyped<AnalyticTyped<TernaryExpression, Int>, Bool>;

export namespace Predicates {
    
        // export function compiled<T extends FunctionType>(typePredicate?: (o: Type) => o is T) {
        //     return </*¯\_(ツ)_/¯*/<OriginalT extends Type, Original extends CPPConstruct & {type?: OriginalT}, Narrowed extends CompiledFunctionDeclaration<T>>(decl: Original) =>
        //         decl is (Narrowed extends Original ? Narrowed : never)>
        //             ((decl) => typed(typePredicate) && decl.isSuccessfullyCompiled());
        // }


    
    // export function byKind<Original extends CPPConstruct, Narrowed extends CPPConstruct>
    //     (decl: Original) : decl is Narrowed extends Original ? Narrowed : never {
    //     return decl instanceof SimpleDeclaration;
    // }

    export function byKind<NarrowedKind extends ConstructKind<AnalyticConstruct>>(constructKind: NarrowedKind) {
        return </*¯\_(ツ)_/¯*/<Original extends {construct_type: string}, Narrowed extends DiscriminateUnion<Original, "construct_type", NarrowedKind>>(construct: Original) =>
            construct is (Narrowed extends Original ? Narrowed : never)>
                ((construct) => construct.construct_type === constructKind);
    }

    export function byKinds<NarrowedKind extends ConstructKind<AnalyticConstruct>>(constructKinds: readonly NarrowedKind[]) {
        return </*¯\_(ツ)_/¯*/<Original extends {construct_type: string}, Narrowed extends DiscriminateUnion<Original, "construct_type", NarrowedKind>>(construct: Original) =>
            construct is (Narrowed extends Original ? Narrowed : never)>
                ((construct) => (<readonly string[]>constructKinds).indexOf(construct.construct_type) !== -1);
    }

    // export function isTyped<OriginalT extends Type, NarrowedT extends Type,
    //     Original extends ConstructUnion & {type?: OriginalT},
    //     Narrowed extends TypedKinds<NarrowedT>[Original["construct_type"]]>
    //     (decl: Original, typePredicate?: (o: Type) => o is NarrowedT) : decl is (Narrowed extends Original ? Narrowed : never) {
    //     return !!decl.type && (!typePredicate || typePredicate(decl.type));
    // }

    export function byTypedExpression<NarrowedT extends ExpressionType, NarrowedVC extends ValueCategory>(typePredicate?: (o: ExpressionType) => o is NarrowedT, valueCategory?: NarrowedVC) {
        return </*¯\_(ツ)_/¯*/<OriginalT extends ExpressionType, Original extends AnalyticConstruct & {type?: OriginalT, valueCategory?: ValueCategory},
        Narrowed extends (Original extends AnalyticExpression ? AnalyticTypedExpression<Original, NarrowedT, NarrowedVC> : never)>(construct: Original) =>
            construct is (Narrowed extends Original ? Narrowed : never)> // TODO conditional on this line can probably be removed
                ((construct) => construct.type && (!typePredicate || typePredicate(construct.type)) && (!valueCategory || construct.valueCategory === valueCategory));
    }

    export function isTypedExpression<OriginalT extends ExpressionType, NarrowedT extends ExpressionType,
        Original extends AnalyticConstruct & {type?: OriginalT, valueCategory?: ValueCategory},
        NarrowedVC extends NonNullable<Original["valueCategory"]>,
        Narrowed extends (Original extends AnalyticExpression ? AnalyticTypedExpression<Original, NarrowedT, NarrowedVC> : never)>
        (construct: Original, typePredicate?: (o: ExpressionType) => o is NarrowedT, valueCategory?: NarrowedVC)
        : construct is (Narrowed extends Original ? Narrowed : Original extends Narrowed ? Original : never);
    export function isTypedExpression<OriginalT extends ExpressionType, NarrowedT extends ExpressionType,
        Original extends CPPConstruct & {type?: OriginalT, valueCategory?: ValueCategory},
        NarrowedVC extends NonNullable<Original["valueCategory"]>,
        Narrowed extends (Original extends Expression ? TypedExpression<NarrowedT, NarrowedVC> : never)>
        (construct: Original, typePredicate: (o: ExpressionType) => o is NarrowedT, valueCategory?: NarrowedVC)
        : construct is (Narrowed extends Original ? Narrowed : Original extends Narrowed ? Original : never);
    export function isTypedExpression<OriginalT extends ExpressionType, NarrowedT extends ExpressionType,
        Original extends AnalyticConstruct & {type?: OriginalT, valueCategory?: ValueCategory},
        NarrowedVC extends NonNullable<Original["valueCategory"]>,
        Narrowed extends (Original extends AnalyticExpression ? AnalyticTypedExpression<Original, NarrowedT, NarrowedVC> : never)>
        (construct: Original, typePredicate?: (o: ExpressionType) => o is NarrowedT, valueCategory?: NarrowedVC)
        : construct is (Narrowed extends Original ? Narrowed : Original extends Narrowed ? Original : never) {
            return !!(construct.type && (!typePredicate || typePredicate(construct.type)) && (!valueCategory || construct.valueCategory === valueCategory));
    }

    // Basically copies of above but with Declaration swapping in for Expression and ValueCategory removed
    export function byTypedDeclaration<NarrowedT extends Type>(typePredicate?: (o: Type) => o is NarrowedT) {
        return </*¯\_(ツ)_/¯*/<OriginalT extends Type, Original extends AnalyticConstruct & {type?: OriginalT},
        Narrowed extends (Original extends AnalyticDeclaration ? AnalyticTypedDeclaration<Original, NarrowedT> : never)>(construct: Original) =>
            construct is (Narrowed extends Original ? Narrowed : never)> // TODO conditional on this line can probably be removed
                ((construct) => construct.type && (!typePredicate || typePredicate(construct.type)));
    }

    export function isTypedDeclaration<OriginalT extends Type, NarrowedT extends Type,
        Original extends AnalyticConstruct & {type?: OriginalT}, Narrowed extends (Original extends AnalyticDeclaration ? AnalyticTypedDeclaration<Original, NarrowedT> : never)>
        (construct: Original, typePredicate?: (o: Type) => o is NarrowedT) : construct is (Narrowed extends Original ? Narrowed : never) { // TODO conditional on this line can probably be removed 
            return !!(construct.type && (!typePredicate || typePredicate(construct.type)));
    }

    export function byVariableName(name: string) {
        return <(construct: AnalyticConstruct) => construct is (LocalVariableDefinition | GlobalVariableDefinition)>
                ((construct) => (construct.construct_type === "local_variable_definition" || construct.construct_type === "global_variable_definition") && construct.name === name);
    }

    export function byVariableInitialValue(queryValue: number) {
        return <(construct: AnalyticConstruct) => construct is (LocalVariableDefinition | GlobalVariableDefinition)>
            ((construct) => {
                if (! (construct.construct_type === "local_variable_definition" || construct.construct_type === "global_variable_definition")) {
                    return false;
                }

                let init = <AnalyticInitializer>construct.initializer;
                if (! (init.construct_type === "AtomicDirectInitializer")) {
                    return false;
                }

                let expr = <AnalyticExpression>init.arg;
                while (expr.construct_type === "ImplicitConversion") {
                    expr = <AnalyticExpression>expr.from;
                }

                return expr.construct_type === "numeric_literal_expression" && expr.value.rawEquals(queryValue);

            });
    }

    // TODO: add compound assignment expressions once implemented
    export function byVariableUpdate(name: string) {
        return <(construct: AnalyticConstruct) => construct is (AssignmentExpression | PrefixIncrementExpression | PostfixIncrementExpression)>
            ((construct) => {
                if (Predicates.byKinds([
                    "prefix_increment_expression",
                    "postfix_increment_expression"
                ])(construct)) {
                    
                    // check for var
                    return !! findFirstConstruct(construct, Predicates.byIdentifierName(name));
                }

                if (Predicates.byKind("assignment_expression")(construct)) {
                    // check for var on lhs and rhs
                    return !! findFirstConstruct(construct.lhs, Predicates.byIdentifierName(name)) &&
                           !! findFirstConstruct(construct.rhs, Predicates.byIdentifierName(name));
                }
                
                return false;
            });
    }

    export function byFunctionName(name: string) {
        return <(construct: AnalyticConstruct) => construct is FunctionDefinition>
                ((construct) => (construct.construct_type === "function_definition") && construct.name === name);
    }

    export function byFunctionCallName<N extends string>(name: N) {
        return <(construct: AnalyticConstruct) => construct is FunctionCallExpression & {call: FunctionCall}>
                ((construct) => (construct.construct_type === "function_call_expression") && construct.call?.func.name === name);
    }

    export function byOperatorOverloadCall(operator: t_OverloadableOperators) {
        return <(construct: AnalyticConstruct) => construct is OperatorOverloadExpression>
                ((construct) => isOperatorOverload(construct) && construct.operator === operator);
    }

    export function byIdentifierName<N extends string>(name: N) {
        return <(construct: AnalyticConstruct) => construct is IdentifierExpression & {name: N}>
                ((construct) => (construct.construct_type === "identifier_expression") && construct.name === name);
    }

    export function byVariableIdentifier<VE extends VariableEntity>(v: VE) {
        return <(construct: AnalyticConstruct) => construct is IdentifierExpression & {entity: VE}>
                ((construct) => (construct.construct_type === "identifier_expression") && construct.entity === v);
    }

    export function byVariableAssignedTo<VE extends VariableEntity>(v: VE) {
        return <(construct: AnalyticConstruct) => construct is AssignmentExpression | CompoundAssignmentExpression>
                ((construct) => (construct.construct_type === "assignment_expression" || construct.construct_type === "compound_assignment_expression")
                                && containsConstruct(construct.lhs, Predicates.byVariableIdentifier(v))
                );
    }

    export function byVariableIncremented<VE extends VariableEntity>(v: VE) {
        return <(construct: AnalyticConstruct) => construct is PrefixIncrementExpression | PostfixIncrementExpression>
                ((construct) => (construct.construct_type === "prefix_increment_expression" || construct.construct_type === "postfix_increment_expression")
                                && containsConstruct(construct.operand, Predicates.byVariableIdentifier(v))
                );
    }

    export function byMemberAccessName<N extends string>(memberName: N) {
        return <(construct: AnalyticConstruct) => construct is DotExpression | ArrowExpression & {memberName: N}>
                ((construct) => (construct.construct_type === "dot_expression" || construct.construct_type === "arrow_expression") && construct.memberName === memberName);
    }

    // export function byCompiled<Original extends AnalyticDeclaration>(construct: Original) : construct is AnalyticCompiledDeclaration<Original> {
    //     return construct.isSuccessfullyCompiled();
    // }

    export const isLoop = Predicates.byKinds(["while_statement", "for_statement"]);
    export const isOperatorOverload = Predicates.byKinds(["non_member_operator_overload_expression", "member_operator_overload_expression", "invalid_operator_overload_expression"]);

    export function isIndexingOperation(construct: AnalyticConstruct) : construct is SubscriptExpression | OperatorOverloadExpression {
        return Predicates.byKind("subscript_expression")(construct) || Predicates.byOperatorOverloadCall("[]")(construct);
    }

    export const isBinaryOperatorExpression = Predicates.byKinds([
        "arithmetic_binary_operator_expression",
        "relational_binary_operator_expression",
        "logical_binary_operator_expression"
    ]);
}