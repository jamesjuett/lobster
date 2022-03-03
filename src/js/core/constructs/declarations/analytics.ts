import { ArrayOfUnknownBoundType, Type, VoidType } from "../../types";
import { InvalidConstruct } from "../constructs";
import { ClassDeclaration, CompiledClassDeclaration, TypedClassDeclaration } from "./class/ClassDeclaration";
import { ClassDefinition, CompiledClassDefinition, TypedClassDefinition } from "./class/ClassDefinition";
import { IncompleteTypeMemberVariableDeclaration, TypedIncompleteTypeMemberVariableDeclaration } from "./class/IncompleteTypeMemberVariableDeclaration";
import { CompiledMemberVariableDeclaration, MemberVariableDeclaration, TypedMemberVariableDeclaration } from "./class/MemberVariableDeclaration";
import { Declaration } from "./declarations";
import { CompiledDeclarator, Declarator, TypedDeclarator } from "./Declarator";
import { CompiledFunctionDeclaration, FunctionDeclaration, TypedFunctionDeclaration } from "./function/FunctionDeclaration";
import { CompiledFunctionDefinition, TypedFunctionDefinition } from "./function/FunctionDefinition";
import { CompiledParameterDeclaration, ParameterDeclaration, TypedParameterDeclaration } from "./function/ParameterDeclaration";
import { TypedUnknownBoundArrayDeclaration } from "./misc/UnknownBoundArrayDeclaration";
import { UnknownTypeDeclaration } from "./misc/UnknownTypeDeclaration";
import { VoidDeclaration } from "./misc/VoidDeclaration";
import { CompiledGlobalVariableDefinition, GlobalVariableDefinition, TypedGlobalVariableDefinition } from "./variable/GlobalVariableDefinition";
import { IncompleteTypeVariableDefinition, TypedIncompleteTypeVariableDefinition } from "./variable/IncompleteTypeVariableDefinition";
import { CompiledLocalVariableDefinition, LocalVariableDefinition, TypedLocalVariableDefinition } from "./variable/LocalVariableDefinition";


export type AnalyticDeclaration = Declaration | Declarator | ParameterDeclaration;

export type TypedDeclarationKinds<T extends Type> = {
    "invalid_construct": T extends undefined ? InvalidConstruct : never;
    "unknown_type_declaration": T extends undefined ? UnknownTypeDeclaration : never;
    "void_declaration": T extends VoidType ? VoidDeclaration : never;
    "storage_specifier": never;
    "typedef_declaration": never;
    "friend_declaration": never;
    "unknown_array_bound_declaration": T extends ArrayOfUnknownBoundType ? TypedUnknownBoundArrayDeclaration<T> : never;
    "function_declaration": T extends FunctionDeclaration["type"] ? TypedFunctionDeclaration<T> : never;
    "global_variable_definition": T extends GlobalVariableDefinition["type"] ? TypedGlobalVariableDefinition<T> : never;
    "local_variable_definition": T extends LocalVariableDefinition["type"] ? TypedLocalVariableDefinition<T> : never;
    "incomplete_type_variable_definition": T extends IncompleteTypeVariableDefinition["type"] ? TypedIncompleteTypeVariableDefinition<T> : never;
    "parameter_declaration": T extends ParameterDeclaration["type"] ? TypedParameterDeclaration<T> : never;
    "declarator": T extends Declarator["type"] ? TypedDeclarator<T> : never;
    "function_definition": T extends FunctionDeclaration["type"] ? TypedFunctionDefinition<T> : never;
    "class_declaration": T extends ClassDeclaration["type"] ? TypedClassDeclaration<T> : never;
    "class_definition": T extends ClassDefinition["type"] ? TypedClassDefinition<T> : never;
    "member_variable_declaration": T extends MemberVariableDeclaration["type"] ? TypedMemberVariableDeclaration<T> : never;
    "incomplete_type_member_variable_declaration": T extends IncompleteTypeMemberVariableDeclaration["type"] ? TypedIncompleteTypeMemberVariableDeclaration<T> : never;

};


export type CompiledDeclarationKinds<T extends Type> = {
    "invalid_construct": never; // these never compile
    "unknown_type_declaration": never; // these never compile
    "void_declaration": never; // these never compile
    "storage_specifier": never; // currently unsupported
    "typedef_declaration": never; // currently unsupported
    "friend_declaration": never; // currently unsupported
    "unknown_array_bound_declaration": never; // TODO: should this ever be supported? Can you ever have one of these compile?
    "function_declaration": T extends FunctionDeclaration["type"] ? CompiledFunctionDeclaration<T> : never;
    "global_variable_definition": T extends GlobalVariableDefinition["type"] ? CompiledGlobalVariableDefinition<T> : never;
    "local_variable_definition": T extends LocalVariableDefinition["type"] ? CompiledLocalVariableDefinition<T> : never;
    "incomplete_type_variable_definition": never;
    "parameter_declaration": T extends ParameterDeclaration["type"] ? CompiledParameterDeclaration<T> : never;
    "declarator": T extends Declarator["type"] ? CompiledDeclarator<T> : never;
    "function_definition": T extends FunctionDeclaration["type"] ? CompiledFunctionDefinition<T> : never;
    "class_declaration": T extends ClassDeclaration["type"] ? CompiledClassDeclaration<T> : never;
    "class_definition": T extends ClassDefinition["type"] ? CompiledClassDefinition<T> : never;
    "member_variable_declaration": T extends MemberVariableDeclaration["type"] ? CompiledMemberVariableDeclaration<T> : never;
    "incomplete_type_member_variable_declaration": never;
};

export type AnalyticTypedDeclaration<C extends AnalyticDeclaration, T extends Type = NonNullable<C["type"]>> = TypedDeclarationKinds<T>[C["construct_type"]];
export type AnalyticCompiledDeclaration<C extends AnalyticDeclaration, T extends Type = NonNullable<C["type"]>> = CompiledDeclarationKinds<T>[C["construct_type"]];
