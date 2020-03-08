import { CPPConstruct } from "./constructs";
import { SimpleDeclaration, TypedSimpleDeclaration, CompiledSimpleDeclaration, FunctionDefinition, TypedFunctionDefinition, CompiledFunctionDefinition, FunctionDeclaration, CompiledFunctionDeclaration, TypedFunctionDeclaration } from "./declarations";
import { Type, FunctionType } from "./types";


export namespace SimpleDeclarationPredicates {
    
    export const kind = <(decl: CPPConstruct) => decl is SimpleDeclaration>((decl) => decl instanceof SimpleDeclaration);

    export function typed<T extends Type>(typePredicate?: (o: Type) => o is T) {
        return </*¯\_(ツ)_/¯*/<OriginalT extends Type>(decl: CPPConstruct & {type?: OriginalT}) =>
            decl is (T extends OriginalT ? TypedSimpleDeclaration<T> : never)>
                ((decl) => kind(decl) && decl.type && decl.declaredEntity && (!typePredicate || typePredicate(decl.type)));
    }
    
    export function compiled<T extends Type>(typePredicate?: (o: Type) => o is T) {
        return </*¯\_(ツ)_/¯*/<OriginalT extends Type>(decl: CPPConstruct & {type?: OriginalT}) =>
            decl is (T extends OriginalT ? CompiledSimpleDeclaration<T> : never)>
                ((decl) => typed(typePredicate) && decl.isSuccessfullyCompiled());
    }
}

export namespace FunctionDeclarationPredicates {
    
    export const kind = </*¯\_(ツ)_/¯*/<OriginalC extends CPPConstruct, FD extends FunctionDeclaration>(decl: OriginalC) =>
        decl is (FD extends OriginalC ? FD : never)>((decl) => decl instanceof FunctionDeclaration);

    export function typed<T extends FunctionType>(typePredicate?: (o: Type) => o is T) {
        return </*¯\_(ツ)_/¯*/<OriginalT extends Type>(decl: CPPConstruct & {type?: OriginalT}) =>
            decl is (T extends OriginalT ? TypedFunctionDeclaration<T> : never)>
                ((decl) => kind(decl) && decl.type && decl.declaredEntity && (!typePredicate || typePredicate(decl.type)));
    }
    
    export function compiled<T extends FunctionType>(typePredicate?: (o: Type) => o is T) {
        return </*¯\_(ツ)_/¯*/<OriginalT extends Type>(decl: CPPConstruct & {type?: OriginalT}) =>
            decl is (T extends OriginalT ? CompiledFunctionDeclaration<T> : never)>
                ((decl) => typed(typePredicate) && decl.isSuccessfullyCompiled());
    }
}