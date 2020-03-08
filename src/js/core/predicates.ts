import { CPPConstruct } from "./constructs";
import { TypedSimpleDeclaration, CompiledSimpleDeclaration, FunctionDefinition, TypedFunctionDefinition, CompiledFunctionDefinition, FunctionDeclaration, CompiledFunctionDeclaration, TypedFunctionDeclaration, SimpleDeclaration, SimpleDeclaration, FunctionDeclaration } from "./declarations";
import { Type, FunctionType } from "./types";


export namespace Predicates {
    
    // export function SimpleDeclaration(decl: CPPConstruct) : decl is SimpleDeclaration {
    //     return decl instanceof SimpleDeclaration;
    // }

    export function SimpleDeclaration<Original extends CPPConstruct, Narrowed extends SimpleDeclaration>
        (decl: Original) : decl is Narrowed extends Original ? Narrowed : never {
        return decl instanceof SimpleDeclaration;
    }

    export namespace SimpleDeclaration {
        export function typed<T extends Type>(typePredicate?: (o: Type) => o is T) {
            return </*¯\_(ツ)_/¯*/<OriginalT extends Type, Original extends CPPConstruct & {type?: OriginalT}, Narrowed extends TypedSimpleDeclaration<T>>(decl: Original) =>
                decl is (Narrowed extends Original ? Narrowed : never)>
                    ((decl) => SimpleDeclaration(decl) && decl.type && decl.declaredEntity && (!typePredicate || typePredicate(decl.type)));
        }
        
        export function compiled<T extends Type>(typePredicate?: (o: Type) => o is T) {
            return </*¯\_(ツ)_/¯*/<OriginalT extends Type, Original extends CPPConstruct & {type?: OriginalT}, Narrowed extends CompiledSimpleDeclaration<T>>(decl: Original) =>
                decl is (Narrowed extends Original ? Narrowed : never)>
                    ((decl) => typed(typePredicate) && decl.isSuccessfullyCompiled());
        }
    }

    
    export function FunctionDeclaration<Original extends CPPConstruct, Narrowed extends FunctionDeclaration>
        (decl: Original) : decl is Narrowed extends Original ? Narrowed : never {
        return decl instanceof FunctionDeclaration;
    }

    export namespace FunctionDeclaration {
        export function typed<T extends FunctionType>(typePredicate?: (o: Type) => o is T) {
            return </*¯\_(ツ)_/¯*/<OriginalT extends Type, Original extends CPPConstruct & {type?: OriginalT}, Narrowed extends TypedFunctionDeclaration<T>>(decl: Original) =>
                decl is (Narrowed extends Original ? Narrowed : never)>
                    ((decl) => FunctionDeclaration(decl) && decl.type && decl.declaredEntity && (!typePredicate || typePredicate(decl.type)));
        }
        
        export function compiled<T extends FunctionType>(typePredicate?: (o: Type) => o is T) {
            return </*¯\_(ツ)_/¯*/<OriginalT extends Type, Original extends CPPConstruct & {type?: OriginalT}, Narrowed extends CompiledFunctionDeclaration<T>>(decl: Original) =>
                decl is (Narrowed extends Original ? Narrowed : never)>
                    ((decl) => typed(typePredicate) && decl.isSuccessfullyCompiled());
        }
    }

    type Blah<T extends Type> = {
        "function_declaration": T extends FunctionType ? TypedFunctionDeclaration<T> : never;
        "function_definition": T extends FunctionType ? TypedFunctionDefinition<T> : never;
        // [index: string] : any;
    }

    export function isTyped<OriginalT extends Type, NarrowedT extends Type,
                            Original extends FunctionDeclaration | FunctionDefinition & {type?: OriginalT}, Narrowed extends Blah<NarrowedT>[Original["construct_type"]]>
                            (decl: Original, typePredicate?: (o: Type) => o is NarrowedT) : decl is (Narrowed extends Original ? Narrowed : never) {
                            return true;
    }
}
