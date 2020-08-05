
import { AnalyticExpression, TypedExpressionKinds, CompiledExpressionKinds, TernaryExpression, TypedCommaExpression, AnalyticCompiledExpression, AnalyticTypedExpression, IdentifierExpression } from "./expressions";
import { ValueCategory } from "./expressionBase";
import { UnknownTypeDeclaration, VoidDeclaration, TypedUnknownBoundArrayDeclaration, FunctionDeclaration, TypedFunctionDeclaration, LocalVariableDefinition, TypedLocalVariableDefinition, GlobalVariableDefinition, TypedGlobalVariableDefinition, ParameterDeclaration, TypedParameterDeclaration, Declarator, TypedDeclarator, TypedFunctionDefinition, ClassDeclaration, TypedClassDeclaration, ClassDefinition, TypedClassDefinition, FunctionDefinition, AnalyticDeclaration, TypeSpecifier, StorageSpecifier, AnalyticTypedDeclaration, TypedDeclarationKinds, AnalyticCompiledDeclaration } from "./declarations";
import { Type, VoidType, ArrayOfUnknownBoundType, Bool, AtomicType, Int } from "./types";
import { DiscriminateUnion } from "../util/util";
import { AnalyticStatement } from "./statements";



export type ConstructKind<Cs extends {construct_type: string}> = Cs["construct_type"];

export type AnalyticConstruct = AnalyticDeclaration | TypeSpecifier | StorageSpecifier | AnalyticExpression | AnalyticStatement;

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

    export function byTypedExpression<NarrowedT extends Type, NarrowedVC extends ValueCategory>(typePredicate?: (o: Type) => o is NarrowedT, valueCategory?: NarrowedVC) {
        return </*¯\_(ツ)_/¯*/<OriginalT extends Type, Original extends AnalyticConstruct & {type?: OriginalT},
        Narrowed extends (Original extends AnalyticExpression ? AnalyticTypedExpression<Original, NarrowedT, NarrowedVC> : never)>(construct: Original) =>
            construct is (Narrowed extends Original ? Narrowed : never)> // TODO conditional on this line can probably be removed
                ((construct) => construct.type && (!typePredicate || typePredicate(construct.type)) && (<any>construct).valueCategory === valueCategory);
    }

    export function isTypedExpression<OriginalT extends Type, NarrowedT extends Type, NarrowedVC extends ValueCategory,
        Original extends AnalyticConstruct & {type?: OriginalT}, Narrowed extends (Original extends AnalyticExpression ? AnalyticTypedExpression<Original, NarrowedT, NarrowedVC> : never)>
        (construct: Original, typePredicate?: (o: Type) => o is NarrowedT, valueCategory?: NarrowedVC) : construct is (Narrowed extends Original ? Narrowed : never) { // TODO conditional on this line can probably be removed 
            return !!(construct.type && (!typePredicate || typePredicate(construct.type)) && (<any>construct).valueCategory === valueCategory);
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
                ((construct) => (construct instanceof LocalVariableDefinition || construct instanceof GlobalVariableDefinition) && construct.name === name);
    }

    export function byFunctionName(name: string) {
        return <(construct: AnalyticConstruct) => construct is FunctionDefinition>
                ((construct) => (construct instanceof FunctionDefinition) && construct.name === name);
    }

    export function byIdentifierName<N extends string>(name: N) {
        return <(construct: AnalyticConstruct) => construct is IdentifierExpression & {name: N}>
                ((construct) => (construct instanceof IdentifierExpression) && construct.name === name);
    }

    // export function byCompiled<Original extends AnalyticDeclaration>(construct: Original) : construct is AnalyticCompiledDeclaration<Original> {
    //     return construct.isSuccessfullyCompiled();
    // }

}