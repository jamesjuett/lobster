import { CPPConstruct, ConstructUnion } from "./constructs";
import { TypedSimpleDeclaration, CompiledSimpleDeclaration, FunctionDefinition, TypedFunctionDefinition, CompiledFunctionDefinition, FunctionDeclaration, CompiledFunctionDeclaration, TypedFunctionDeclaration, SimpleDeclarationBase, SimpleDeclarationBase, FunctionDeclaration, UnknownTypeDeclaration, VoidDeclaration, TypedUnknownBoundArrayDeclaration, TypedLocalVariableDefinition, LocalVariableDefinition, GlobalVariableDefinition, FunctionDeclaration, ParameterDeclaration, Declarator, TypedDeclarator, FunctionDeclaration, ClassDeclaration, ClassDefinition, TypedGlobalVariableDefinition, TypedParameterDeclaration, TypedClassDeclaration, TypedClassDefinition } from "./declarations";
import { Type, FunctionType, VoidType, ArrayOfUnknownBoundType, ObjectType, ReferenceType } from "./types";
import { LocalObjectEntity } from "./entities";
import { Constructor, DiscriminateUnion } from "../util/util";


export namespace Predicates {
    
    // export function SimpleDeclaration(decl: CPPConstruct) : decl is SimpleDeclaration {
    //     return decl instanceof SimpleDeclaration;
    // }

    export function SimpleDeclaration<Original extends CPPConstruct, Narrowed extends SimpleDeclarationBase>
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


    
    // export function byKind<Original extends CPPConstruct, Narrowed extends CPPConstruct>
    //     (decl: Original) : decl is Narrowed extends Original ? Narrowed : never {
    //     return decl instanceof SimpleDeclaration;
    // }
    export function byKind<NarrowedKind extends ConstructUnion["construct_type"]>(constructKind: NarrowedKind) {
        return </*¯\_(ツ)_/¯*/<Original extends {construct_type: string}, Narrowed extends DiscriminateUnion<Original, "construct_type", NarrowedKind>>(construct: Original) =>
            construct is (Narrowed extends Original ? Narrowed : never)>
                ((construct) => construct.construct_type === constructKind);
    }

    type TypedKinds<T extends Type> = {
        "unknown_type_declaration" : T extends undefined ? UnknownTypeDeclaration : never;
        "void_declaration" : T extends VoidType ? VoidDeclaration : never;
        "storage_specifier" : never;
        "friend_declaration" : never;
        "unknown_array_bound_declaration" : T extends ArrayOfUnknownBoundType ? TypedUnknownBoundArrayDeclaration<T> : never;
        "function_declaration" : T extends FunctionDeclaration["type"] ? TypedFunctionDeclaration<T> : never;
        "local_variable_definition" : T extends LocalVariableDefinition["type"] ? TypedLocalVariableDefinition<T> : never;
        "global_variable_definition" : T extends GlobalVariableDefinition["type"] ? TypedGlobalVariableDefinition<T> : never;
        "parameter_declaration" : T extends ParameterDeclaration["type"] ? TypedParameterDeclaration<T> : never;
        "declarator" : T extends Declarator["type"] ? TypedDeclarator<T> : never;
        "function_definition" : T extends FunctionDeclaration["type"] ? TypedFunctionDefinition<T> : never;
        "class_declaration" : T extends ClassDeclaration["type"] ? TypedClassDeclaration<T> : never;
        "class_definition" : T extends ClassDefinition["type"] ? TypedClassDefinition<T> : never;
        // TODO: add rest of discriminants and their types
    };

    // export function isTyped<OriginalT extends Type, NarrowedT extends Type,
    //     Original extends ConstructUnion & {type?: OriginalT},
    //     Narrowed extends TypedKinds<NarrowedT>[Original["construct_type"]]>
    //     (decl: Original, typePredicate?: (o: Type) => o is NarrowedT) : decl is (Narrowed extends Original ? Narrowed : never) {
    //     return !!decl.type && (!typePredicate || typePredicate(decl.type));
    // }

    export function byType<NarrowedT extends Type>(typePredicate?: (o: Type) => o is NarrowedT) {
        return </*¯\_(ツ)_/¯*/<OriginalT extends Type, Original extends ConstructUnion & {type?: OriginalT},
        Narrowed extends TypedKinds<NarrowedT>[Original["construct_type"]]>(construct: Original) =>
            construct is (Narrowed extends Original ? Narrowed : never)>
                ((construct) => construct.type && (!typePredicate || typePredicate(construct.type)));
    }
}
