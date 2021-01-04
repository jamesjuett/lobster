import { TranslationUnitConstruct } from "./constructs";
import { SourceReference } from "./Program";
import { ReferenceType, CompleteObjectType, Type, BoundedArrayType, ArrayOfUnknownBoundType, AtomicType, PotentialParameterType, CompleteClassType, PointerType, PotentiallyCompleteObjectType, IncompleteObjectType, PotentialReturnType } from "./types";
import { CPPEntity, DeclaredEntity, ObjectEntity, LocalObjectEntity, TemporaryObjectEntity, FunctionEntity, GlobalObjectEntity, ClassEntity } from "./entities";
import { VoidDeclaration, StorageSpecifierKey, TypeSpecifierKey, FunctionDeclaration, ClassDefinition, ClassDeclaration, StorageSpecifier, FunctionDefinition, ParameterDefinition, SimpleDeclaration, BaseSpecifier, IncompleteTypeVariableDefinition, IncompleteTypeMemberVariableDeclaration } from "./declarations";
import { Expression, TypedExpression } from "./expressionBase";
export declare enum NoteKind {
    ERROR = "error",
    WARNING = "warning",
    STYLE = "style",
    OTHER = "other"
}
export declare abstract class Note {
    readonly kind: NoteKind;
    readonly id: string;
    readonly message: string;
    constructor(kind: NoteKind, id: string, message: string);
    /**
     * The primary source reference for this note, although more than one may exist.
     * Use the allSourceReferences property to retrieve an array of all source references.
     * May be undefined if the note doesn't concern any particular part of the source.
     */
    abstract readonly primarySourceReference?: SourceReference;
    /**
     * An array of all source references for this note.
     * May be empty if the note doesn't concern any particular part of the source.
     */
    abstract readonly allSourceReferences: readonly SourceReference[];
}
declare abstract class BasicNoteBase extends Note {
    primarySourceReference: SourceReference;
    allSourceReferences: readonly SourceReference[];
    constructor(sourceRef: SourceReference, kind: NoteKind, id: string, message: string);
}
export declare class PreprocessorNote extends BasicNoteBase {
}
export declare class SyntaxNote extends BasicNoteBase {
}
declare class ConstructNoteBase extends Note {
    primaryConstruct: TranslationUnitConstruct;
    readonly constructs: readonly TranslationUnitConstruct[];
    /**
     * Initializes a note associated with the provided constructs.
     * @param constructs A single code construct or array of constructs.
     */
    constructor(constructs: TranslationUnitConstruct | readonly TranslationUnitConstruct[], kind: NoteKind, id: string, message: string);
    get primarySourceReference(): SourceReference;
    get allSourceReferences(): SourceReference[];
}
export declare class CompilerNote extends ConstructNoteBase {
}
export declare class LinkerNote extends ConstructNoteBase {
}
export declare class NoteRecorder implements NoteHandler {
    private readonly _allNotes;
    readonly allNotes: readonly Note[];
    readonly hasErrors: boolean;
    readonly hasSyntaxErrors: boolean;
    readonly hasWarnings: boolean;
    private _numNotesByKind;
    addNote(note: Note): void;
    addNotes(notes: readonly Note[]): void;
    clearNotes(): void;
    numNotes(kind?: NoteKind): number;
}
export declare const CPPError: {
    other: {
        cin_not_supported: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
    };
    class_def: {
        prev_def: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, name: string, prev: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        base_class_type: (construct: BaseSpecifier) => CompilerNote;
        base_class_incomplete: (construct: BaseSpecifier) => CompilerNote;
        big_three: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, bigThreeYes: readonly string[], bigThreeNo: readonly string[]) => CompilerNote;
        multiple_inheritance: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        virtual_inheritance: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        ctor_def: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        dtor_def: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
    };
    declaration: {
        ctor: {
            copy: {
                pass_by_value: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: CompleteObjectType, name: string) => CompilerNote;
            };
            init: {
                constructor_only: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
                improper_name: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, classType: CompleteClassType, name: string) => CompilerNote;
                delegate_only: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
                multiple_delegates: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
                multiple_base_inits: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
                multiple_member_inits: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            };
            return_type_prohibited: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            const_prohibited: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            previous_declaration: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        dtor: {
            no_destructor_auto: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, entity: LocalObjectEntity<CompleteObjectType>) => CompilerNote;
            no_destructor_temporary: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, entity: TemporaryObjectEntity<CompleteObjectType>) => CompilerNote;
            return_type_prohibited: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        prev_def: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, name: string) => CompilerNote;
        prev_local: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, name: string) => CompilerNote;
        prev_member: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, name: string) => CompilerNote;
        func: {
            return_array: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            return_func: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            invalid_return_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: Type) => CompilerNote;
            some_invalid_parameter_types: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            array: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            void_param: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            op_member: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            op_subscript_one_param: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            returnTypesMatch: (declarations: SimpleDeclaration<import("./constructs").TranslationUnitContext>[], name: string) => CompilerNote;
            mainParams: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            no_return_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            nonCovariantReturnType: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, derived: Type, base: Type) => CompilerNote;
            definition_non_function_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            multiple_def: (def: FunctionDefinition, prevDef: FunctionDefinition) => CompilerNote;
        };
        variable: {
            multiple_def: (def: import("./declarations").GlobalVariableDefinition | ParameterDefinition | import("./declarations").LocalVariableDefinition, prevDef: import("./declarations").GlobalVariableDefinition | ParameterDefinition | import("./declarations").LocalVariableDefinition) => CompilerNote;
        };
        classes: {
            multiple_def: (construct: ClassDefinition, prev: ClassDefinition) => CompilerNote;
            storage_prohibited: (construct: StorageSpecifier) => CompilerNote;
        };
        pointer: {
            reference: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            void: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            invalid_pointed_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: Type) => CompilerNote;
        };
        ref: {
            ref: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            array: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            invalid_referred_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: Type) => CompilerNote;
            memberNotSupported: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        array: {
            length_required: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            zero_length: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            multidimensional_arrays_unsupported: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            invalid_element_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: Type) => CompilerNote;
        };
        init: {
            scalar_args: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, declType: AtomicType) => CompilerNote;
            array_string_literal: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, targetType: BoundedArrayType<import("./types").ArrayElemType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>) => CompilerNote;
            convert: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, initType: Type, declType: Type) => CompilerNote;
            list_reference_prohibited: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            list_atomic_prohibited: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            list_array_unsupported: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            aggregate_unsupported: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            list_narrowing: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, initType: Type, declType: Type) => CompilerNote;
            list_array: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            list_length: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, length: number) => CompilerNote;
            list_empty: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            list_same_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            list_arithmetic_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            matching_constructor: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, entity: ObjectEntity<CompleteClassType>, argTypes: readonly Type[]) => CompilerNote;
            no_default_constructor: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, entity: ObjectEntity<CompleteClassType>) => CompilerNote;
            referencePrvalueConst: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            referenceType: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, from: Type, to: ReferenceType<PotentiallyCompleteObjectType>) => CompilerNote;
            referenceBind: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            referenceBindMultiple: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            stringLiteralLength: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, stringSize: number, arrSize: number) => CompilerNote;
            uninitialized: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, ent: ObjectEntity<CompleteObjectType>) => CompilerNote;
            array_default_init: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            array_direct_init: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        storage: {
            once: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, spec: StorageSpecifierKey) => CompilerNote;
            incompatible: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, specs: readonly StorageSpecifierKey[]) => CompilerNote;
        };
        typeSpecifier: {
            once: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, spec: TypeSpecifierKey) => CompilerNote;
            one_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, typeNames: readonly string[]) => CompilerNote;
            signed_unsigned: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        friend: {
            outside_class: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            virtual_prohibited: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        parameter: {
            storage_prohibited: (construct: StorageSpecifier) => CompilerNote;
            invalid_parameter_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: Type) => CompilerNote;
            virtual_prohibited: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        missing_type_specifier: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        unknown_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        void_prohibited: (construct: VoidDeclaration) => CompilerNote;
        incomplete_type_definition_prohibited: (construct: IncompleteTypeVariableDefinition) => CompilerNote;
        virtual_prohibited: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        type_mismatch: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, newEntity: DeclaredEntity, existingEntity: DeclaredEntity) => CompilerNote;
        symbol_mismatch: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, newEntity: DeclaredEntity) => CompilerNote;
        member: {
            incomplete_type_declaration_prohibited: (construct: IncompleteTypeMemberVariableDeclaration) => CompilerNote;
        };
    };
    type: {
        unsigned_not_supported: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        storage: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        typeNotFound: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, typeName: string) => CompilerNote;
    };
    expr: {
        assignment: {
            lhs_lvalue: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            lhs_not_assignable: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, lhs: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>) => CompilerNote;
            lhs_const: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            convert: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, lhs: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>, rhs: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>) => CompilerNote;
            self: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, entity: ObjectEntity<CompleteObjectType>) => CompilerNote;
        };
        binary: {
            arithmetic_operands: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, operator: string, left: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>, right: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>) => CompilerNote;
            integral_operands: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, operator: string, left: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>, right: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>) => CompilerNote;
            boolean_operand: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, operator: string, operand: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>) => CompilerNote;
            arithmetic_common_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, operator: string, left: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>, right: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>) => CompilerNote;
        };
        pointer_difference: {
            incomplete_pointed_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: PointerType<PotentiallyCompleteObjectType>) => CompilerNote;
        };
        pointer_offset: {
            incomplete_pointed_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: PointerType<PotentiallyCompleteObjectType>) => CompilerNote;
        };
        output: {
            unsupported_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>) => CompilerNote;
        };
        input: {
            unsupported_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>) => CompilerNote;
            lvalue_required: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>) => CompilerNote;
        };
        pointer_comparison: {
            same_pointer_type_required: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, left: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>, right: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>) => CompilerNote;
            null_literal_comparison: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            null_literal_array_equality: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        unary: {};
        delete: {
            no_destructor: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: CompleteClassType) => CompilerNote;
            pointer: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: Type) => CompilerNote;
            pointerToObjectType: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: Type) => CompilerNote;
        };
        dereference: {
            pointer: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: Type) => CompilerNote;
            pointerToObjectType: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: Type) => CompilerNote;
        };
        subscript: {
            invalid_operand_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: Type) => CompilerNote;
            incomplete_element_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: PointerType<PotentiallyCompleteObjectType>) => CompilerNote;
            invalid_offset_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: Type) => CompilerNote;
        };
        dot: {
            class_type_only: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            incomplete_class_type_prohibited: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            no_such_member: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, classType: CompleteClassType, name: string) => CompilerNote;
            ambiguous_member: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, name: string) => CompilerNote;
            class_entity_found: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, name: string) => CompilerNote;
        };
        arrow: {
            class_pointer_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            no_such_member: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, classType: CompleteClassType, name: string) => CompilerNote;
            ambiguous_member: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, name: string) => CompilerNote;
            class_entity_found: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, name: string) => CompilerNote;
            incomplete_class_type_prohibited: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        invalid_operand: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, operator: string, operand: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>) => CompilerNote;
        lvalue_operand: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, operator: string) => CompilerNote;
        invalid_binary_operands: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, operator: string, left: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>, right: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>) => CompilerNote;
        logicalNot: {
            operand_bool: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, operand: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>) => CompilerNote;
        };
        addressOf: {
            lvalue_required: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            object_type_required: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        ternary: {
            condition_bool: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: Type) => CompilerNote;
            sameValueCategory: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        unaryPlus: {
            operand: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        unaryMinus: {
            operand: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        prefixIncrement: {
            lvalue_required: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            operand: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            decrement_bool_prohibited: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            const_prohibited: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        postfixIncrement: {
            lvalue_required: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            operand: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            decrement_bool_prohibited: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            const_prohibited: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        functionCall: {
            main: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            numParams: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            invalid_operand_expression: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, operand: Expression<import("./expressions").ExpressionASTNode>) => CompilerNote;
            operand: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, operand: CPPEntity<Type>) => CompilerNote;
            paramType: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, from: Type, to: Type) => CompilerNote;
            paramReferenceType: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, from: Type, to: Type) => CompilerNote;
            paramReferenceLvalue: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            not_defined: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: Type, paramTypes: readonly PotentialParameterType[]) => CompilerNote;
            incomplete_return_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, returnType: PotentialReturnType) => CompilerNote;
        };
        thisExpr: {
            memberFunc: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        binaryOperatorOverload: {
            no_such_overload: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, operator: string) => CompilerNote;
            ambiguous_overload: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, operator: string) => CompilerNote;
            incomplete_return_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, returnType: PotentialReturnType) => CompilerNote;
        };
    };
    iden: {
        ambiguous: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, name: string) => CompilerNote;
        no_match: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, name: string) => CompilerNote;
        class_entity_found: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, name: string) => CompilerNote;
        keyword: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, name: string) => CompilerNote;
        alt_op: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, name: string) => CompilerNote;
        not_found: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, name: string) => CompilerNote;
    };
    param: {
        numParams: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        paramType: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, from: Type, to: Type) => CompilerNote;
        paramReferenceType: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, from: Type, to: Type) => CompilerNote;
        paramReferenceLvalue: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        thisConst: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: Type) => CompilerNote;
    };
    stmt: {
        function_definition_prohibited: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        if: {
            condition_bool: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, expr: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>) => CompilerNote;
        };
        iteration: {
            condition_bool: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, expr: TypedExpression<AtomicType | BoundedArrayType<import("./types").ArrayElemType> | CompleteClassType | import("./types").IncompleteClassType | import("./types").VoidType | import("./types").FunctionType<PotentialReturnType> | ArrayOfUnknownBoundType<import("./types").ArrayElemType>, import("./expressionBase").ValueCategory>) => CompilerNote;
        };
        breakStatement: {
            location: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        };
        returnStatement: {
            empty: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            exprVoid: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
            incomplete_type: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type: IncompleteObjectType) => CompilerNote;
            convert: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, from: Type, to: Type) => CompilerNote;
        };
    };
    link: {
        library_unsupported: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, func: FunctionEntity<import("./types").FunctionType<PotentialReturnType>>) => LinkerNote;
        multiple_def: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, name: string) => LinkerNote;
        type_mismatch: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, ent1: DeclaredEntity, ent2: DeclaredEntity) => LinkerNote;
        class_same_tokens: (newDef: ClassDefinition, prevDef: ClassDefinition) => LinkerNote;
        func: {
            def_not_found: (construct: FunctionDeclaration, func: FunctionEntity<import("./types").FunctionType<PotentialReturnType>>) => LinkerNote;
            no_matching_overload: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, func: FunctionEntity<import("./types").FunctionType<PotentialReturnType>>) => LinkerNote;
            returnTypesMatch: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, func: FunctionEntity<import("./types").FunctionType<PotentialReturnType>>) => LinkerNote;
        };
        classes: {
            def_not_found: (construct: ClassDeclaration, c: ClassEntity) => LinkerNote;
        };
        def_not_found: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, ent: GlobalObjectEntity<CompleteObjectType>) => LinkerNote;
        main_multiple_def: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => LinkerNote;
    };
    preprocess: {
        recursiveInclude: (sourceRef: SourceReference) => PreprocessorNote;
        fileNotFound: (sourceRef: SourceReference, name: string) => PreprocessorNote;
    };
    lobster: {
        unsupported_feature: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, feature: string) => CompilerNote;
        referencePrvalue: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        ternarySameType: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, type1: Type, type2: Type) => CompilerNote;
        ternaryNoVoid: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>) => CompilerNote;
        keyword: (construct: TranslationUnitConstruct<import("./constructs").ASTNode>, name: string) => CompilerNote;
    };
};
export interface NoteHandler {
    addNote(note: Note): void;
}
export {};
