import { TranslationUnitConstruct } from "./constructs";
import { SourceReference } from "./Program";
import { ReferenceType, CompleteObjectType, Type, BoundedArrayType, ArrayOfUnknownBoundType, AtomicType, PotentialParameterType, CompleteClassType, PointerType, IncompleteObjectType, PotentialReturnType, ExpressionType } from "./types";
import { CPPEntity, DeclaredEntity, ObjectEntity, LocalObjectEntity, TemporaryObjectEntity, FunctionEntity, GlobalObjectEntity, ClassEntity } from "./entities";
import { VoidDeclaration, StorageSpecifierKey, TypeSpecifierKey, SimpleTypeName, FunctionDeclaration, ClassDefinition, ClassDeclaration, StorageSpecifier, FunctionDefinition, VariableDefinition, ParameterDefinition, SimpleDeclaration, BaseSpecifier, IncompleteTypeVariableDefinition, IncompleteTypeMemberVariableDeclaration } from "./declarations";
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
        cin_not_supported: (construct: TranslationUnitConstruct) => CompilerNote;
    };
    class_def: {
        prev_def: (construct: TranslationUnitConstruct, name: string, prev: TranslationUnitConstruct) => CompilerNote;
        base_class_type: (construct: BaseSpecifier) => CompilerNote;
        base_class_incomplete: (construct: BaseSpecifier) => CompilerNote;
        big_three: (construct: TranslationUnitConstruct, bigThreeYes: readonly string[], bigThreeNo: readonly string[]) => CompilerNote;
        multiple_inheritance: (construct: TranslationUnitConstruct) => CompilerNote;
        virtual_inheritance: (construct: TranslationUnitConstruct) => CompilerNote;
        ctor_def: (construct: TranslationUnitConstruct) => CompilerNote;
        dtor_def: (construct: TranslationUnitConstruct) => CompilerNote;
    };
    declaration: {
        ctor: {
            copy: {
                pass_by_value: (construct: TranslationUnitConstruct, type: CompleteObjectType, name: string) => CompilerNote;
            };
            init: {
                constructor_only: (construct: TranslationUnitConstruct) => CompilerNote;
                improper_name: (construct: TranslationUnitConstruct, classType: CompleteClassType, name: string) => CompilerNote;
                delegate_only: (construct: TranslationUnitConstruct) => CompilerNote;
                multiple_delegates: (construct: TranslationUnitConstruct) => CompilerNote;
                multiple_base_inits: (construct: TranslationUnitConstruct) => CompilerNote;
                multiple_member_inits: (construct: TranslationUnitConstruct) => CompilerNote;
            };
            return_type_prohibited: (construct: TranslationUnitConstruct) => CompilerNote;
            const_prohibited: (construct: TranslationUnitConstruct) => CompilerNote;
            previous_declaration: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        dtor: {
            no_destructor_auto: (construct: TranslationUnitConstruct, entity: LocalObjectEntity) => CompilerNote;
            no_destructor_temporary: (construct: TranslationUnitConstruct, entity: TemporaryObjectEntity) => CompilerNote;
            return_type_prohibited: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        prev_def: (construct: TranslationUnitConstruct, name: string) => CompilerNote;
        prev_local: (construct: TranslationUnitConstruct, name: string) => CompilerNote;
        prev_member: (construct: TranslationUnitConstruct, name: string) => CompilerNote;
        func: {
            return_array: (construct: TranslationUnitConstruct) => CompilerNote;
            return_func: (construct: TranslationUnitConstruct) => CompilerNote;
            invalid_return_type: (construct: TranslationUnitConstruct, type: Type) => CompilerNote;
            some_invalid_parameter_types: (construct: TranslationUnitConstruct) => CompilerNote;
            array: (construct: TranslationUnitConstruct) => CompilerNote;
            void_param: (construct: TranslationUnitConstruct) => CompilerNote;
            op_member: (construct: TranslationUnitConstruct) => CompilerNote;
            op_subscript_one_param: (construct: TranslationUnitConstruct) => CompilerNote;
            returnTypesMatch: (declarations: SimpleDeclaration[], name: string) => CompilerNote;
            mainParams: (construct: TranslationUnitConstruct) => CompilerNote;
            no_return_type: (construct: TranslationUnitConstruct) => CompilerNote;
            nonCovariantReturnType: (construct: TranslationUnitConstruct, derived: Type, base: Type) => CompilerNote;
            definition_non_function_type: (construct: TranslationUnitConstruct) => CompilerNote;
            multiple_def: (def: FunctionDefinition, prevDef: FunctionDefinition) => CompilerNote;
        };
        variable: {
            multiple_def: (def: VariableDefinition | ParameterDefinition, prevDef: VariableDefinition | ParameterDefinition) => CompilerNote;
        };
        classes: {
            multiple_def: (construct: ClassDefinition, prev: ClassDefinition) => CompilerNote;
            storage_prohibited: (construct: StorageSpecifier) => CompilerNote;
        };
        pointer: {
            reference: (construct: TranslationUnitConstruct) => CompilerNote;
            void: (construct: TranslationUnitConstruct) => CompilerNote;
            invalid_pointed_type: (construct: TranslationUnitConstruct, type: Type) => CompilerNote;
        };
        ref: {
            ref: (construct: TranslationUnitConstruct) => CompilerNote;
            array: (construct: TranslationUnitConstruct) => CompilerNote;
            invalid_referred_type: (construct: TranslationUnitConstruct, type: Type) => CompilerNote;
            memberNotSupported: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        array: {
            length_required: (construct: TranslationUnitConstruct) => CompilerNote;
            zero_length: (construct: TranslationUnitConstruct) => CompilerNote;
            multidimensional_arrays_unsupported: (construct: TranslationUnitConstruct) => CompilerNote;
            invalid_element_type: (construct: TranslationUnitConstruct, type: Type) => CompilerNote;
        };
        init: {
            scalar_args: (construct: TranslationUnitConstruct, declType: AtomicType) => CompilerNote;
            array_string_literal: (construct: TranslationUnitConstruct, targetType: BoundedArrayType | ArrayOfUnknownBoundType) => CompilerNote;
            convert: (construct: TranslationUnitConstruct, initType: Type, declType: Type) => CompilerNote;
            list_reference_prohibited: (construct: TranslationUnitConstruct) => CompilerNote;
            list_atomic_prohibited: (construct: TranslationUnitConstruct) => CompilerNote;
            list_array_unsupported: (construct: TranslationUnitConstruct) => CompilerNote;
            aggregate_unsupported: (construct: TranslationUnitConstruct) => CompilerNote;
            list_narrowing: (construct: TranslationUnitConstruct, initType: Type, declType: Type) => CompilerNote;
            list_array: (construct: TranslationUnitConstruct) => CompilerNote;
            list_length: (construct: TranslationUnitConstruct, length: number) => CompilerNote;
            list_empty: (construct: TranslationUnitConstruct) => CompilerNote;
            list_same_type: (construct: TranslationUnitConstruct) => CompilerNote;
            list_arithmetic_type: (construct: TranslationUnitConstruct) => CompilerNote;
            matching_constructor: (construct: TranslationUnitConstruct, entity: ObjectEntity<CompleteClassType>, argTypes: readonly Type[]) => CompilerNote;
            no_default_constructor: (construct: TranslationUnitConstruct, entity: ObjectEntity<CompleteClassType>) => CompilerNote;
            referencePrvalueConst: (construct: TranslationUnitConstruct) => CompilerNote;
            referenceType: (construct: TranslationUnitConstruct, from: Type, to: ReferenceType) => CompilerNote;
            referenceBind: (construct: TranslationUnitConstruct) => CompilerNote;
            referenceBindMultiple: (construct: TranslationUnitConstruct) => CompilerNote;
            stringLiteralLength: (construct: TranslationUnitConstruct, stringSize: number, arrSize: number) => CompilerNote;
            uninitialized: (construct: TranslationUnitConstruct, ent: ObjectEntity) => CompilerNote;
            array_default_init: (construct: TranslationUnitConstruct) => CompilerNote;
            array_direct_init: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        storage: {
            once: (construct: TranslationUnitConstruct, spec: StorageSpecifierKey) => CompilerNote;
            incompatible: (construct: TranslationUnitConstruct, specs: readonly StorageSpecifierKey[]) => CompilerNote;
        };
        typeSpecifier: {
            once: (construct: TranslationUnitConstruct, spec: TypeSpecifierKey) => CompilerNote;
            one_type: (construct: TranslationUnitConstruct, typeNames: readonly SimpleTypeName[]) => CompilerNote;
            signed_unsigned: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        friend: {
            outside_class: (construct: TranslationUnitConstruct) => CompilerNote;
            virtual_prohibited: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        parameter: {
            storage_prohibited: (construct: StorageSpecifier) => CompilerNote;
            invalid_parameter_type: (construct: TranslationUnitConstruct, type: Type) => CompilerNote;
            virtual_prohibited: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        missing_type_specifier: (construct: TranslationUnitConstruct) => CompilerNote;
        unknown_type: (construct: TranslationUnitConstruct) => CompilerNote;
        void_prohibited: (construct: VoidDeclaration) => CompilerNote;
        incomplete_type_definition_prohibited: (construct: IncompleteTypeVariableDefinition) => CompilerNote;
        virtual_prohibited: (construct: TranslationUnitConstruct) => CompilerNote;
        type_mismatch: (construct: TranslationUnitConstruct, newEntity: DeclaredEntity, existingEntity: DeclaredEntity) => CompilerNote;
        symbol_mismatch: (construct: TranslationUnitConstruct, newEntity: DeclaredEntity) => CompilerNote;
        member: {
            incomplete_type_declaration_prohibited: (construct: IncompleteTypeMemberVariableDeclaration) => CompilerNote;
        };
    };
    type: {
        unsigned_not_supported: (construct: TranslationUnitConstruct) => CompilerNote;
        storage: (construct: TranslationUnitConstruct) => CompilerNote;
        typeNotFound: (construct: TranslationUnitConstruct, typeName: string) => CompilerNote;
    };
    expr: {
        assignment: {
            lhs_lvalue: (construct: TranslationUnitConstruct) => CompilerNote;
            lhs_not_assignable: (construct: TranslationUnitConstruct, lhs: TypedExpression) => CompilerNote;
            lhs_const: (construct: TranslationUnitConstruct) => CompilerNote;
            convert: (construct: TranslationUnitConstruct, lhs: TypedExpression, rhs: TypedExpression) => CompilerNote;
            self: (construct: TranslationUnitConstruct, entity: ObjectEntity) => CompilerNote;
        };
        binary: {
            arithmetic_operands: (construct: TranslationUnitConstruct, operator: string, left: TypedExpression, right: TypedExpression) => CompilerNote;
            integral_operands: (construct: TranslationUnitConstruct, operator: string, left: TypedExpression, right: TypedExpression) => CompilerNote;
            boolean_operand: (construct: TranslationUnitConstruct, operator: string, operand: TypedExpression) => CompilerNote;
            arithmetic_common_type: (construct: TranslationUnitConstruct, operator: string, left: TypedExpression, right: TypedExpression) => CompilerNote;
        };
        pointer_difference: {
            incomplete_pointed_type: (construct: TranslationUnitConstruct, type: PointerType) => CompilerNote;
        };
        pointer_offset: {
            incomplete_pointed_type: (construct: TranslationUnitConstruct, type: PointerType) => CompilerNote;
        };
        output: {
            unsupported_type: (construct: TranslationUnitConstruct, type: ExpressionType) => CompilerNote;
        };
        input: {
            unsupported_type: (construct: TranslationUnitConstruct, type: ExpressionType) => CompilerNote;
            lvalue_required: (construct: TranslationUnitConstruct, type: ExpressionType) => CompilerNote;
        };
        pointer_comparison: {
            same_pointer_type_required: (construct: TranslationUnitConstruct, left: TypedExpression, right: TypedExpression) => CompilerNote;
            null_literal_comparison: (construct: TranslationUnitConstruct) => CompilerNote;
            null_literal_array_equality: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        unary: {};
        delete: {
            no_destructor: (construct: TranslationUnitConstruct, type: CompleteClassType) => CompilerNote;
            pointer: (construct: TranslationUnitConstruct, type: Type) => CompilerNote;
            pointerToObjectType: (construct: TranslationUnitConstruct, type: Type) => CompilerNote;
        };
        dereference: {
            pointer: (construct: TranslationUnitConstruct, type: Type) => CompilerNote;
            pointerToObjectType: (construct: TranslationUnitConstruct, type: Type) => CompilerNote;
        };
        subscript: {
            invalid_operand_type: (construct: TranslationUnitConstruct, type: Type) => CompilerNote;
            incomplete_element_type: (construct: TranslationUnitConstruct, type: PointerType) => CompilerNote;
            invalid_offset_type: (construct: TranslationUnitConstruct, type: Type) => CompilerNote;
        };
        dot: {
            class_type_only: (construct: TranslationUnitConstruct) => CompilerNote;
            incomplete_class_type_prohibited: (construct: TranslationUnitConstruct) => CompilerNote;
            no_such_member: (construct: TranslationUnitConstruct, classType: CompleteClassType, name: string) => CompilerNote;
            ambiguous_member: (construct: TranslationUnitConstruct, name: string) => CompilerNote;
            class_entity_found: (construct: TranslationUnitConstruct, name: string) => CompilerNote;
        };
        arrow: {
            class_pointer_type: (construct: TranslationUnitConstruct) => CompilerNote;
            no_such_member: (construct: TranslationUnitConstruct, classType: CompleteClassType, name: string) => CompilerNote;
            ambiguous_member: (construct: TranslationUnitConstruct, name: string) => CompilerNote;
            class_entity_found: (construct: TranslationUnitConstruct, name: string) => CompilerNote;
            incomplete_class_type_prohibited: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        invalid_operand: (construct: TranslationUnitConstruct, operator: string, operand: TypedExpression) => CompilerNote;
        lvalue_operand: (construct: TranslationUnitConstruct, operator: string) => CompilerNote;
        invalid_binary_operands: (construct: TranslationUnitConstruct, operator: string, left: TypedExpression, right: TypedExpression) => CompilerNote;
        logicalNot: {
            operand_bool: (construct: TranslationUnitConstruct, operand: TypedExpression) => CompilerNote;
        };
        addressOf: {
            lvalue_required: (construct: TranslationUnitConstruct) => CompilerNote;
            object_type_required: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        ternary: {
            condition_bool: (construct: TranslationUnitConstruct, type: Type) => CompilerNote;
            sameValueCategory: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        unaryPlus: {
            operand: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        unaryMinus: {
            operand: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        prefixIncrement: {
            lvalue_required: (construct: TranslationUnitConstruct) => CompilerNote;
            operand: (construct: TranslationUnitConstruct) => CompilerNote;
            decrement_bool_prohibited: (construct: TranslationUnitConstruct) => CompilerNote;
            const_prohibited: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        postfixIncrement: {
            lvalue_required: (construct: TranslationUnitConstruct) => CompilerNote;
            operand: (construct: TranslationUnitConstruct) => CompilerNote;
            decrement_bool_prohibited: (construct: TranslationUnitConstruct) => CompilerNote;
            const_prohibited: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        functionCall: {
            main: (construct: TranslationUnitConstruct) => CompilerNote;
            numParams: (construct: TranslationUnitConstruct) => CompilerNote;
            invalid_operand_expression: (construct: TranslationUnitConstruct, operand: Expression) => CompilerNote;
            operand: (construct: TranslationUnitConstruct, operand: CPPEntity) => CompilerNote;
            paramType: (construct: TranslationUnitConstruct, from: Type, to: Type) => CompilerNote;
            paramReferenceType: (construct: TranslationUnitConstruct, from: Type, to: Type) => CompilerNote;
            paramReferenceLvalue: (construct: TranslationUnitConstruct) => CompilerNote;
            not_defined: (construct: TranslationUnitConstruct, type: Type, paramTypes: readonly PotentialParameterType[]) => CompilerNote;
            incomplete_return_type: (construct: TranslationUnitConstruct, returnType: PotentialReturnType) => CompilerNote;
        };
        thisExpr: {
            memberFunc: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        binaryOperatorOverload: {
            no_such_overload: (construct: TranslationUnitConstruct, operator: string) => CompilerNote;
            ambiguous_overload: (construct: TranslationUnitConstruct, operator: string) => CompilerNote;
            incomplete_return_type: (construct: TranslationUnitConstruct, returnType: PotentialReturnType) => CompilerNote;
        };
    };
    iden: {
        ambiguous: (construct: TranslationUnitConstruct, name: string) => CompilerNote;
        no_match: (construct: TranslationUnitConstruct, name: string) => CompilerNote;
        class_entity_found: (construct: TranslationUnitConstruct, name: string) => CompilerNote;
        keyword: (construct: TranslationUnitConstruct, name: string) => CompilerNote;
        alt_op: (construct: TranslationUnitConstruct, name: string) => CompilerNote;
        not_found: (construct: TranslationUnitConstruct, name: string) => CompilerNote;
    };
    param: {
        numParams: (construct: TranslationUnitConstruct) => CompilerNote;
        paramType: (construct: TranslationUnitConstruct, from: Type, to: Type) => CompilerNote;
        paramReferenceType: (construct: TranslationUnitConstruct, from: Type, to: Type) => CompilerNote;
        paramReferenceLvalue: (construct: TranslationUnitConstruct) => CompilerNote;
        thisConst: (construct: TranslationUnitConstruct, type: Type) => CompilerNote;
    };
    stmt: {
        function_definition_prohibited: (construct: TranslationUnitConstruct) => CompilerNote;
        if: {
            condition_bool: (construct: TranslationUnitConstruct, expr: TypedExpression) => CompilerNote;
        };
        iteration: {
            condition_bool: (construct: TranslationUnitConstruct, expr: TypedExpression) => CompilerNote;
        };
        breakStatement: {
            location: (construct: TranslationUnitConstruct) => CompilerNote;
        };
        returnStatement: {
            empty: (construct: TranslationUnitConstruct) => CompilerNote;
            exprVoid: (construct: TranslationUnitConstruct) => CompilerNote;
            incomplete_type: (construct: TranslationUnitConstruct, type: IncompleteObjectType) => CompilerNote;
            convert: (construct: TranslationUnitConstruct, from: Type, to: Type) => CompilerNote;
        };
    };
    link: {
        library_unsupported: (construct: TranslationUnitConstruct, func: FunctionEntity) => LinkerNote;
        multiple_def: (construct: TranslationUnitConstruct, name: string) => LinkerNote;
        type_mismatch: (construct: TranslationUnitConstruct, ent1: DeclaredEntity, ent2: DeclaredEntity) => LinkerNote;
        class_same_tokens: (newDef: ClassDefinition, prevDef: ClassDefinition) => LinkerNote;
        func: {
            def_not_found: (construct: FunctionDeclaration, func: FunctionEntity) => LinkerNote;
            no_matching_overload: (construct: TranslationUnitConstruct, func: FunctionEntity) => LinkerNote;
            returnTypesMatch: (construct: TranslationUnitConstruct, func: FunctionEntity) => LinkerNote;
        };
        classes: {
            def_not_found: (construct: ClassDeclaration, c: ClassEntity) => LinkerNote;
        };
        def_not_found: (construct: TranslationUnitConstruct, ent: GlobalObjectEntity) => LinkerNote;
        main_multiple_def: (construct: TranslationUnitConstruct) => LinkerNote;
    };
    preprocess: {
        recursiveInclude: (sourceRef: SourceReference) => PreprocessorNote;
        fileNotFound: (sourceRef: SourceReference, name: string) => PreprocessorNote;
    };
    lobster: {
        unsupported_feature: (construct: TranslationUnitConstruct, feature: string) => CompilerNote;
        referencePrvalue: (construct: TranslationUnitConstruct) => CompilerNote;
        ternarySameType: (construct: TranslationUnitConstruct, type1: Type, type2: Type) => CompilerNote;
        ternaryNoVoid: (construct: TranslationUnitConstruct) => CompilerNote;
        keyword: (construct: TranslationUnitConstruct, name: string) => CompilerNote;
    };
};
export interface NoteHandler {
    addNote(note: Note): void;
}
export {};
