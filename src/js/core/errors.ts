import { TranslationUnitConstruct, CPPConstruct } from "./constructs";
import { SourceReference } from "./Program";
import { ReferenceType, ObjectType, ClassType, Type, BoundedArrayType, ArrayOfUnknownBoundType, AtomicType, sameType, PotentialParameterType } from "./types";
import { CPPEntity, DeclaredEntity, ObjectEntity, LocalObjectEntity, TemporaryObjectEntity, FunctionEntity, GlobalObjectEntity, ClassEntity } from "./entities";
import { VoidDeclaration, StorageSpecifierKey, TypeSpecifierKey, SimpleTypeName, FunctionDeclaration, ClassDefinition, ClassDeclaration, StorageSpecifier, FunctionDefinition, VariableDefinition, ParameterDefinition, SimpleDeclaration } from "./declarations";
import { Expression, TypedExpression } from "./expressionBase";
import { Mutable } from "../util/util";
import { IdentifierExpression } from "./expressions";

export enum NoteKind {
    ERROR = "error",
    WARNING = "warning",
    STYLE = "style",
    OTHER = "other"
}

export abstract class Note {

    public readonly kind: NoteKind;
    public readonly id: string;
    public readonly message: string;

    public constructor(kind: NoteKind, id: string, message: string) {
        this.kind = kind;
        this.id = id;
        this.message = message;
    }

    /**
     * The primary source reference for this note, although more than one may exist.
     * Use the allSourceReferences property to retrieve an array of all source references.
     * May be undefined if the note doesn't concern any particular part of the source.
     */
    public abstract readonly primarySourceReference?: SourceReference;

    /**
     * An array of all source references for this note.
     * May be empty if the note doesn't concern any particular part of the source.
     */
    public abstract readonly allSourceReferences: readonly SourceReference[];


}



abstract class BasicNoteBase extends Note {

    public primarySourceReference: SourceReference;
    public allSourceReferences: readonly SourceReference[];

    public constructor(sourceRef: SourceReference, kind: NoteKind, id: string, message: string) {
        super(kind, id, message);
        this.primarySourceReference = sourceRef;
        this.allSourceReferences = [sourceRef];
    }
}

export class PreprocessorNote extends BasicNoteBase {

}

export class SyntaxNote extends BasicNoteBase {

}

class ConstructNoteBase extends Note {

    public primaryConstruct: TranslationUnitConstruct;
    public readonly constructs: readonly TranslationUnitConstruct[];

    /**
     * Initializes a note associated with the provided constructs.
     * @param constructs A single code construct or array of constructs.
     */
    public constructor(constructs: TranslationUnitConstruct | readonly TranslationUnitConstruct[], kind: NoteKind, id: string, message: string) {
        super(kind, id, message);
        this.constructs = constructs instanceof CPPConstruct ? [constructs] : constructs;
        this.primaryConstruct = this.constructs[0];
    }

    public get primarySourceReference() {
        return this.primaryConstruct.getNearestSourceReference();
    }

    public get allSourceReferences() {
        return this.constructs.map(c => c.getNearestSourceReference());
    }
}

export class CompilerNote extends ConstructNoteBase {

}

export class LinkerNote extends ConstructNoteBase {

}


//TODO: Remove this once I'm confident I don't need it
// var CompoundNoteHandler = NoteHandler.extend({
//     _name : "CompoundNoteHandler",
//
//     instance : function(handler1, handler2) {
//         if (!handler1) {
//             return handler2;
//         }
//         if (!handler2) {
//             return handler1;
//         }
//
//         return this._class._parent.instance.apply(this, arguments);
//     },
//
//     /**
//      *
//      * @param {NoteHandler} handler1
//      * @param {NoteHandler} handler2
//      */
//     init : function(handler1, handler2) {
//         this.i_handler1 = handler1;
//         this.i_handler2 = handler2;
//     },
//
//     /**
//      *
//      * @param {PreprocessorNote} note
//      */
//     preprocessorNote : function(note) {
//         this.i_handler1.preprocessorNote(note);
//         this.i_handler2.preprocessorNote(note);
//     },
//
//
//     /**
//      *
//      * @param {CompilerNote} note
//      */
//     compilerNote : function(note) {
//         this.i_handler1.compilerNote(note);
//         this.i_handler2.compilerNote(note);
//     },
//
//
//
//     /**
//      *
//      * @param {LinkerNote} note
//      */
//     linkerNote : function(note) {
//         this.i_handler1.linkerNote(note);
//         this.i_handler2.linkerNote(note);
//     }
//
//
// });

export class NoteRecorder implements NoteHandler {

    private readonly _allNotes: Note[] = [];
    public readonly allNotes: readonly Note[] = this._allNotes;

    public readonly hasErrors: boolean = false;
    public readonly hasSyntaxErrors: boolean = false;
    public readonly hasWarnings: boolean = false;

    private _numNotesByKind: { [K in NoteKind]: number } = {
        error: 0,
        warning: 0,
        style: 0,
        other: 0
    }

    public addNote(note: Note) {
        this._allNotes.push(note);

        let _this = (<Mutable<this>>this);

        if (note.kind === NoteKind.ERROR) {
            _this.hasErrors = true;

            if (note instanceof SyntaxNote) {
                _this.hasSyntaxErrors = true;
            }
        }
        else if (note.kind === NoteKind.WARNING) {
            _this.hasWarnings = true;
        }

        ++this._numNotesByKind[note.kind];
    }

    public addNotes(notes: readonly Note[]) {
        notes.forEach((note) => this.addNote(note));
    }

    public clearNotes() {
        this._allNotes.length = 0;
        let _this = (<Mutable<this>>this);
        _this.hasErrors = false;
        _this.hasSyntaxErrors = false;
        _this.hasWarnings = false;
    }

    public numNotes(kind?: NoteKind) {
        return kind ? this._numNotesByKind[kind] : this.allNotes.length;
    }
}

export const CPPError = {
    // attributeEmptyTo : function(problems, code) {
    // 	for(var key in problems) {
    // 		var prob = problems[key];
    // 		prob.code = prob.code || code;
    // 	}
    // },
    // summary : function(problems) {
    // 	var str = "";
    // 	for(var i = 0; i < problems.length; ++i) {
    // 		var prob = problems[i];
    // 		str += "<span style=\"background-color:"+prob.color+"\">"+prob.sentence + "</span><br />";
    // 	}
    // 	return str;
    // },
    other: {
        cin_not_supported: function (construct: TranslationUnitConstruct) {
            return new CompilerNote(construct, NoteKind.ERROR, "other.cin_not_supported", "Sorry, <span class='code'>cin</span> is not supported yet :(.");
        }
    },
    class_def: {
        prev_def: function (construct: TranslationUnitConstruct, name: string, prev: TranslationUnitConstruct) {
            return new CompilerNote(construct, NoteKind.ERROR, "class_def.prev_def", name + " cannot be defined more than once. Note that Lobster just puts all class names (i.e. types) in one global sort of namespace, so you can't ever have two classes of the same name.");
        },
        base_class_type: function (construct: TranslationUnitConstruct, name: string) {
            return new CompilerNote(construct, NoteKind.ERROR, "class_def.base_class_type", "I cannot find a suitable class called \"" + name + "\" to use as a base.");
        },
        big_three: function (construct: TranslationUnitConstruct, bigThreeYes: readonly string[], bigThreeNo: readonly string[]) {
            var yStr = bigThreeYes.join(" and ");
            var nStr = bigThreeNo.join(" and ");
            return new CompilerNote(construct, NoteKind.WARNING, "class_def.big_three", "This class does not follow the rule of the Big Three. It has a custom implementation for the " + yStr + " but not for the " + nStr + ". The compiler will provide implicit versions of the missing ones, but they will almost certainly work \"incorrectly\" (e.g. make shallow copies or neglect to delete dynamic memory).");
        },
        multiple_inheritance: function (construct: TranslationUnitConstruct) {
            return new CompilerNote(construct, NoteKind.ERROR, "class_def.multiple_inheritance", "Sorry, but Lobster does not support multiple inheritance.");
        },
        virtual_inheritance: function (construct: TranslationUnitConstruct) {
            return new CompilerNote(construct, NoteKind.ERROR, "class_def.virtual_inheritance", "Sorry, but Lobster does not support virtual inheritance.");
        },
        ctor_def: function (construct: TranslationUnitConstruct) {
            return new CompilerNote(construct, NoteKind.ERROR, "class_def.ctor_def", "Sorry, but for now Lobster only supports constructors that are defined inline. (i.e. You need a body.)");
        },
        dtor_def: function (construct: TranslationUnitConstruct) {
            return new CompilerNote(construct, NoteKind.ERROR, "class_def.dtor_def", "Sorry, but for now Lobster only supports destructors that are defined inline. (i.e. You need a body.)");
        }
    },
    declaration: {
        ctor: {
            copy: {
                pass_by_value: function (construct: TranslationUnitConstruct, type: ObjectType, name: string) {
                    var constRef = new ReferenceType(type.cvQualified(true));
                    return new CompilerNote(construct, NoteKind.ERROR, "declaration.ctor.copy.pass_by_value", "A copy constructor cannot take its parameter by value. Because pass-by-value itself uses the copy constructor, this would cause infinite recursion if it were allowed. Try passing by reference-to-const instead! (i.e. " + constRef.typeString(false, name, false) + ")");
                }
            },
            init: {
                no_such_member: function (construct: TranslationUnitConstruct, classType: ClassType, name: string) {
                    return new CompilerNote(construct, NoteKind.ERROR, "declaration.ctor.init.no_such_member", "Class " + classType.toString() + " has no member named " + name + ".");
                },
                improper_member: function (construct: TranslationUnitConstruct, classType: ClassType, name: string) {
                    return new CompilerNote(construct, NoteKind.ERROR, "declaration.ctor.init.improper_member", "A member initializer can only be used for non-static data members. There is no such member named " + name + " in the " + classType.className + " class.");
                },
                delegating_only: function (construct: TranslationUnitConstruct, classType: ClassType, name: string) {
                    return new CompilerNote(construct, NoteKind.ERROR, "declaration.ctor.init.delegating_only", "If a constructor's initializer list delegates to another constructor from the same class, that must be the only thing it does.");
                },
                multiple_base_inits: function (construct: TranslationUnitConstruct, classType: ClassType, name: string) {
                    return new CompilerNote(construct, NoteKind.ERROR, "declaration.ctor.init.multiple_base_inits", "A constructor's initializer list cannot specify more than one base class constructor to use.");
                }
            }
        },
        dtor: {
            no_destructor_auto: function (construct: TranslationUnitConstruct, entity: LocalObjectEntity) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.dtor.no_destructor_auto", "The local variable " + entity.name + " needs to be destroyed when it \"goes out of scope\", but I can't find a destructor for the " + entity.type + " class. The compiler sometimes provides one implicitly for you, but not if one of its members or its base class are missing a destructor. (Or, if you've violated the rule of the Big Three.)");
            },
            // no_destructor_member : function(construct: TranslationUnitConstruct, entity: ObjectEntity, containingClass) {
            //     return new CompilerNote(construct, NoteKind.ERROR, "declaration.dtor.no_destructor_member", "The member variable " + entity.name + " needs to be destroyed as part of the " + containingClass.className + " destructor, but I can't find a destructor for the " + entity.type + " class. The compiler sometimes provides one implicitly for you, but not if one of its members or its base class are missing a destructor. (Or, if you've violated the rule of the Big Three.)");
            // },
            // no_destructor_base : function(construct: TranslationUnitConstruct, entity, containingClass) {
            //     return new CompilerNote(construct, NoteKind.ERROR, "declaration.dtor.no_destructor_base", "The base class " + entity.name + " needs to be destroyed as part of the " + containingClass.className + " destructor, but I can't find a destructor for the " + entity.type + " class. The compiler sometimes provides one implicitly for you, but not if one of its members or its base class are missing a destructor. (Or, if you've violated the rule of the Big Three.)");
            // },
            no_destructor_temporary: function (construct: TranslationUnitConstruct, entity: TemporaryObjectEntity) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.dtor.no_destructor_temporary", "This expression creates a temporary object of type " + entity.type + " that needs to be destroyed, but I can't find a destructor for the " + entity.type + " class. The compiler sometimes provides one implicitly for you, but not if one of its members or its base class are missing a destructor. (Or, if you've violated the rule of the Big Three.)");
            }
            // TODO Add warning for non-virtual destructor if derived classes exist
        },
        // no_type : function(construct: TranslationUnitConstruct) {
        //     return new CompilerNote(construct, NoteKind.ERROR, "declaration.no_type", "ISO C++ forbids declaration with no type.");
        // },
        // prev_decl : function(construct: TranslationUnitConstruct, name, prev) {
        //     return new CompilerNote(construct, NoteKind.ERROR, "declaration.prev_decl", name + " cannot be declared more than once in this scope.");
        // },
        prev_def: function (construct: TranslationUnitConstruct, name: string) {
            return new CompilerNote(construct, NoteKind.ERROR, "declaration.prev_def", name + " cannot be defined more than once in this scope.");
        },
        prev_local: function (construct: TranslationUnitConstruct, name: string) {
            return new CompilerNote(construct, NoteKind.ERROR, "declaration.prev_local", `This declaration of a local variable ${name} conflicts with an earlier declaration of ${name} in the same scope.`);
        },
        // prev_main : function(construct: TranslationUnitConstruct, name, prev) {
        //     return new CompilerNote(construct, NoteKind.ERROR, "declaration.prev_main", name + " cannot be defined more than once in this scope.");
        // },
        func: {
            return_array: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.func.return_array", "Cannot declare a function that returns an array.");
            },
            return_func: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.func.return_func", "Cannot declare a function that returns a function. Try returning a function pointer?");
            },
            invalid_return_type: function (construct: TranslationUnitConstruct, type: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.func.invalid_return_type", `The type ${type.toString()} is not allowed as a return type.`);
            },
            some_invalid_parameter_types: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.func.some_invalid_parameter_types", `This function type contains some invalid parameter types.`);
            },
            array: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.func.array", "Cannot declare an array of functions.");
            },
            void_param: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.func.void_param", "Function parameters may not have void type.");
            },
            op_member: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.func.op_member", "This operator must be overloaded as a non-static member function.");
            },
            op_subscript_one_param: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.func.op_subscript_one_param", "An overloaded subscript ([]) operator must take exactly one parameter.");
            },
            returnTypesMatch: function (declarations: SimpleDeclaration[], name: string) {
                return new CompilerNote(declarations, NoteKind.ERROR, "declaration.func.returnTypesMatch", "Cannot redeclare function " + name + " with the same parameter types but a different return type.");
            },
            mainParams: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.func.mainParams", "Sorry, but for now command line arguments (and thus parameters for main) are not supported in Lobster.");
            },
            no_return_type: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.func.no_return_type", "You must specify a return type for this function. (Or if you meant it to be a constructor, did you misspell the name?)");
            },
            nonCovariantReturnType: function (construct: TranslationUnitConstruct, derived: Type, base: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.func.nonCovariantReturnType", "Return types in overridden virtual functions must either be the same or covariant (i.e. follow the Liskov Substitution Principle). Both return types must be pointers/references to class types, and the class type in the overriding function must be the same or a derived type. There are also restrictions on the cv-qualifications of the return types. In this case, returning a " + derived + " in place of a " + base + " violates covariance.");
            },
            definition_non_function_type: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.func.definition_non_function_type", "This appears to be a function definition, but the declarator does not indicate a function type. Maybe you forgot the parentheses?");
            },
            multiple_def: function (def: FunctionDefinition, prevDef: FunctionDefinition) {
                return new CompilerNote(def, NoteKind.ERROR, "declaration.func.multiple_def", `The function ${def.name} cannot be defined more than once.`);
            }
        },
        variable: {
            multiple_def: function (def: VariableDefinition | ParameterDefinition, prevDef: VariableDefinition | ParameterDefinition) {
                return new CompilerNote(def, NoteKind.ERROR, "declaration.variable.multiple_def", `The function ${def.name} cannot be defined more than once.`);
            }
        },
        classes: {
            multiple_def: function (construct: ClassDefinition, prev: ClassDefinition) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.classes.multiple_def", `The class ${construct.name} cannot be defined more than once.`);
            },
            storage_prohibited: function (construct: StorageSpecifier) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.classes.storage_prohibited", `Storage specifiers are not permitted in class declarations.`);
            }
        },
        pointer: {
            reference: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.pointer.reference", "Cannot declare a pointer to a reference.");
            },
            void: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.pointer.void", "Sorry, Lobster does not support void pointers.");
            },
            invalid_pointed_type: function (construct: TranslationUnitConstruct, type: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.pointer.invalid_pointed_type", `A pointer to type ${type.toString()} is not allowed.`);
            }
        },
        ref: {
            ref: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.ref.ref", "A reference to a reference is not allowed.");
            },
            // TODO: move this to array section instead
            array: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.ref.array", "Cannot declare an array of references.");
            },
            invalid_referred_type: function (construct: TranslationUnitConstruct, type: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.ref.invalid_referred_type", `A reference to type ${type.toString()} is not allowed.`);
            },
            memberNotSupported: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.ref.memberNotSupported", "Sorry, reference members are not supported at the moment.");
            }
        },
        array: {
            length_required: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.array.length_required", "Must specify length as an integer literal when declaring an array. (Sorry, but Lobster requires this for now even if it could hypothetically be deduced from the initializer.)");
            },
            zero_length: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.array.zero_length", "Although technically allowed in C++, arrays with zero length are prohibited in Lobster.");
            },
            multidimensional_arrays_unsupported: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.array.multidimensional_arrays_unsupported", "Sorry, Lobster currently doesn't support multidimensional arrays.");
            },
            invalid_element_type: function (construct: TranslationUnitConstruct, type: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.array.invalid_element_type", `The type ${type.toString()} is not allowed as an array parameter.`);
            }
        },
        init: {
            scalar_args: function (construct: TranslationUnitConstruct, declType: AtomicType) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.init.scalar_args", "Invalid initialization of scalar type " + declType + " from multiple values.");
            },
            array_string_literal: function (construct: TranslationUnitConstruct, targetType: BoundedArrayType | ArrayOfUnknownBoundType) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.init.array_string_literal", "Cannot direct/copy initialize an array of type " + targetType + ". The only allowed direct/copy initialization of an array is to initialize an array of char from a string literal.");
            },
            convert: function (construct: TranslationUnitConstruct, initType: Type, declType: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.init.convert", "Invalid conversion from " + initType + " to " + declType + ".");
            },
            list_narrowing: function (construct: TranslationUnitConstruct, initType: Type, declType: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.init.list_narrowing", "Implicit narrowing conversion from " + initType + " to " + declType + " is not allowed in initializer list.");
            },
            list_array: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.init.list_array", "Initializer list syntax only supported for arrays.");
            },
            list_length: function (construct: TranslationUnitConstruct, length: number) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.init.list_length", "Length of initializer list must match length of array (" + length + ").");
            },
            matching_constructor: function (construct: TranslationUnitConstruct, entity: ObjectEntity<ClassType>, argTypes: readonly Type[]) {
                var desc = entity.describe();
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.init.matching_constructor", "Trying to initialize " + (desc.name || desc.message) + ", but unable to find a matching constructor definition for the " + entity.type.className + " class using the given arguments (" + argTypes.join(", ") + ").");
            },
            no_default_constructor: function (construct: TranslationUnitConstruct, entity: ObjectEntity<ClassType>) {
                var desc = entity.describe();
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.init.no_default_constructor", "This calls for the default initialization of " + (desc.name || desc.message) + ", but I can't find a default constructor (i.e. taking no arguments) for the " + entity.type.className + " class. The compiler usually provides an implicit one for you, but not if you have declared other constructors (under the assumption you would want to use one of those).");
            },
            referencePrvalueConst: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.init.referencePrvalueConst", "You cannot bind a non-const reference to a prvalue (e.g. a temporary object).");
            },
            referenceType: function (construct: TranslationUnitConstruct, from: Type, to: ObjectType) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.init.referenceType", "A reference (of type " + to + ") cannot be bound to an object of a different type (" + from + ").");
            },
            referenceBind: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.init.referenceBind", "References must be bound to something when they are declared.");
            },
            referenceBindMultiple: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.init.referenceBindMultiple", "References cannot be bound to multiple objects.");
            },
            stringLiteralLength: function (construct: TranslationUnitConstruct, stringSize: number, arrSize: number) {
                if (arrSize === stringSize - 1) {
                    return new CompilerNote(construct, NoteKind.ERROR, "declaration.init.stringLiteralLength", "Your array is one element too short. Remember, when initializing a character array (i.e. a c-string) with a string literal, an extra \\0 (null character) is automatically appended.");
                }
                else if (arrSize > stringSize) {
                    return new CompilerNote(construct, NoteKind.WARNING, "declaration.init.stringLiteralLength", "Your array (length " + arrSize + ") is longer than it needs to be to hold the string literal (length " + stringSize + "). The remaining character elements will be zero-initialized.");
                }
                else {
                    return new CompilerNote(construct, NoteKind.ERROR, "declaration.init.stringLiteralLength", "The string literal used for initialization (length " + stringSize + ") cannot fit in the declared array (length " + arrSize + ").");
                }
            },
            uninitialized: function (construct: TranslationUnitConstruct, ent: ObjectEntity) {
                return new CompilerNote(construct, NoteKind.WARNING, "declaration.init.uninitialized", (ent.describe().name || ent.describe().message) + " is uninitialized, so it will start with whatever value happens to be in memory (i.e. memory junk). If you try to use this variable before initializing it, who knows what will happen!");
            },
            array_default_init: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.WARNING, "declaration.init.array_default_init", "Note: Default initialization of an array requires default initialization of each of its elements.");
            },
            array_direct_init: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.OTHER, "declaration.init.array_direct_init", "Note: initialization of an array requires initialization of each of its elements.");
            }

        },
        storage: {
            once: function (construct: TranslationUnitConstruct, spec: StorageSpecifierKey) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.storage.once", "Storage specifier (" + spec + ") may only be used once.");
            },
            incompatible: function (construct: TranslationUnitConstruct, specs: readonly StorageSpecifierKey[]) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.storage.incompatible", "Storage specifiers ( " + specs.join(" ") + ") are incompatible with each other.");
            },
            // typedef : function(construct: TranslationUnitConstruct, specs) {
            //     return new CompilerNote(construct, NoteKind.ERROR, "declaration.storage.typedef", "Storage specifiers may not be used in a typedef. (" + specs + " were found.)");
            // }
        },
        typeSpecifier: {
            once: function (construct: TranslationUnitConstruct, spec: TypeSpecifierKey) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.typeSpecifier.once", "Type specifier (" + spec + ") may only be used once.");
            },
            one_type: function (construct: TranslationUnitConstruct, typeNames: readonly SimpleTypeName[]) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.typeSpecifier.one_type", `Type specifier must only specify one type. Found: ${typeNames}.`);
            },
            signed_unsigned: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "type.signed_unsigned", "Type specifier may not indicate both signed and unsigned.");
            },
        },
        friend: {
            outside_class: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.friend.outside_class", "Friend declarations are not allowed here.");
            },
            virtual_prohibited: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.friend.virtual_prohibited", "A virtual function may not be declared as a friend.");
            }
        },
        parameter: {
            storage_prohibited: function (construct: StorageSpecifier) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.parameter.storage_prohibited", "Storage specifiers are not permitted in parameter declarations.");
            },
            invalid_parameter_type: function (construct: TranslationUnitConstruct, type: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.parameter.invalid_parameter_type", `The type ${type} is not a valid parameter type.`);
            },
            virtual_prohibited: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "declaration.friend.virtual_prohibited", "A virtual function may not be declared as a friend.");
            }
        },
        missing_type_specifier: function (construct: TranslationUnitConstruct) {
            return new CompilerNote(construct, NoteKind.ERROR, "declaration.missing_type_specifier", "This declaration appears to be missing a type specifier.");
        },
        unknown_type: function (construct: TranslationUnitConstruct) {
            return new CompilerNote(construct, NoteKind.ERROR, "declaration.unknown_type", "Unable to determine the type declared here.");
        },
        void_prohibited: function (construct: VoidDeclaration) {
            return new CompilerNote(construct, NoteKind.ERROR, "declaration.void_prohibited", `The variable ${construct.declarator.name || "here"} may not be declared as type void.`);
        },
        virtual_prohibited: function (construct: TranslationUnitConstruct) {
            return new CompilerNote(construct, NoteKind.ERROR, "declaration.virtual_prohibited", "The virtual keyword may only be used in member function declarations.");
        },
        type_mismatch: function (construct: TranslationUnitConstruct, newEntity: DeclaredEntity, existingEntity: DeclaredEntity) {
            return new CompilerNote(construct, NoteKind.ERROR, "declaration.type_mismatch", `Type mismatch. This declaration for ${newEntity.name} has type ${newEntity.type}, but a previous declaration of ${existingEntity.name} has type ${existingEntity.type}`);
        },
        symbol_mismatch: function (construct: TranslationUnitConstruct, newEntity: DeclaredEntity) {
            return new CompilerNote(construct, NoteKind.ERROR, "declaration.symbol_mismatch", `Cannot redeclare ${newEntity.name} as a different kind of symbol.`);
        }
    },
    type: {

        unsigned_not_supported: function (construct: TranslationUnitConstruct) {
            return new CompilerNote(construct, NoteKind.WARNING, "type.unsigned_not_supported", "Sorry, unsigned integral types are not supported yet. It will just be treated like a normal int.");
        },
        storage: function (construct: TranslationUnitConstruct) {
            return new CompilerNote(construct, NoteKind.WARNING, "type.storage", "Because of the way Lobster works, storage class specifiers (e.g. static) have no effect.");
        },
        typeNotFound: function (construct: TranslationUnitConstruct, typeName: string) {
            return new CompilerNote(construct, NoteKind.ERROR, "type.typeNotFound", "Oops, this is embarassing... I feel like " + typeName + " should be a type, but I can't figure out what it is.");
        }
    },
    expr: {
        // overloadLookup : function(construct: TranslationUnitConstruct, op) {
        //     return new CompilerNote(construct, NoteKind.ERROR, "expr.overloadLookup", "Trying to find a function implementing an overloaded " + op + " operator...");
        // },
        assignment: {
            lhs_lvalue: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.assignment.lhs_lvalue", "Lvalue required as left operand of assignment.");
            },
            lhs_not_assignable: function (construct: TranslationUnitConstruct, lhs: TypedExpression) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.assignment.lhs_not_assignable", `The left hand side of this expression has type ${lhs.type}, which is not assignable.`);
            },
            lhs_const: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.assignment.lhs_const", "Left hand side of assignment is not modifiable.");
            },
            convert: function (construct: TranslationUnitConstruct, lhs: TypedExpression, rhs: TypedExpression) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.assignment.convert", "Cannot convert " + rhs.type + " to " + lhs.type + " in assignment.");
            },
            self: function (construct: TranslationUnitConstruct, entity: ObjectEntity) {
                return new CompilerNote(construct, NoteKind.WARNING, "expr.assignment.self", "Self assignment from " + (entity.describe().name || entity.describe().message) + " to itself.");
            }
            // not_defined : function(construct: TranslationUnitConstruct, type) {
            //     return new CompilerNote(construct, NoteKind.ERROR, "expr.assignment.not_defined", "An assignment operator for the type " + type + " cannot be found.");
            // }

        },
        binary: {
            // overload_not_found : function(construct: TranslationUnitConstruct, op, operands) {
            //     return new CompilerNote(construct, NoteKind.ERROR, "expr.binary.overload_not_found", "An overloaded " + op + " operator for the types (" + operands.map((op)=>{return op.type;}).join(", ") + ") cannot be found.");
            // },
            arithmetic_operands: function (construct: TranslationUnitConstruct, operator: string, left: TypedExpression, right: TypedExpression) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.binary.arithmetic_operands", "Invalid operand types (" + left.type + ", " + right.type + ") for operator " + operator + ", which requires operands of arithmetic type.");
            },
            integral_operands: function (construct: TranslationUnitConstruct, operator: string, left: TypedExpression, right: TypedExpression) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.binary.integral_operands", "Invalid operand types (" + left.type + ", " + right.type + ") for operator " + operator + ", which requires operands of integral type.");
            },
            boolean_operand: function (construct: TranslationUnitConstruct, operator: string, operand: TypedExpression) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.binary.boolean_operand", "Invalid operand type (" + operand.type + ") for operator " + operator + ", which requires operands that may be converted to boolean type.");
            },
            arithmetic_common_type: function (construct: TranslationUnitConstruct, operator: string, left: TypedExpression, right: TypedExpression) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.binary.arithmetic_common_type", "Performing the usual arithmetic conversions yielded operands of types (" + left.type + ", " + right.type + ") for operator " + operator + ", but a common arithmetic type could not be found.");
            }
        },
        pointer_comparison: {
            same_pointer_type_required: function (construct: TranslationUnitConstruct, left: TypedExpression, right: TypedExpression) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.pointer_comparison.same_pointer_type_requried", `Comparing the addresses of pointers to different types is prohibited (${left.type} and ${right.type}).`);
            },
            null_literal_comparison: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.pointer_comparison.null_literal_comparison", `Comparing against a null pointer literal with <, <=, >, or >= is technically prohibited by the C++ language standard (although some compilers may allow it). If you're trying to check for a null pointer, use == or != instead.`);
            },
            null_literal_array_equality: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.WARNING, "expr.pointer_comparison.null_literal_array_equality", `The address at the start of an array will never be 0, so this comparison is not meaningful.`);
            },
        },
        unary: {
            // overload_not_found : function(construct: TranslationUnitConstruct, op, type) {
            //     return new CompilerNote(construct, NoteKind.ERROR, "expr.unary.overload_not_found", "An overloaded " + op + " operator for the type " + type + " cannot be found.");
            // }
        },
        delete: {
            no_destructor: function (construct: TranslationUnitConstruct, type: ClassType) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.delete.no_destructor", "I can't find a destructor for the " + type + " class. The compiler sometimes provides one implicitly for you, but not if one of its members or its base class are missing a destructor. (Or, if you've violated the rule of the Big Three.)");
            },
            pointer: function (construct: TranslationUnitConstruct, type: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.delete.pointer", "The delete operator requires an operand of pointer type. (Current operand is " + type + " ).");
            },
            pointerToObjectType: function (construct: TranslationUnitConstruct, type: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.delete.pointerToObjectType", "The delete operator cannot be used with a pointer to a non-object type (e.g. void pointers, function pointers). (Current operand is " + type + " ).");
            }
        },
        dereference: {
            pointer: function (construct: TranslationUnitConstruct, type: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.dereference.pointer", "The dereference operator (*) requires an operand of pointer type. (Current operand is " + type + " ).");
            },
            pointerToObjectType: function (construct: TranslationUnitConstruct, type: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.dereference.pointerToObjectType", "Pointers to a non-object, non-function type (e.g. void pointers) cannot be dereferenced. (Current operand is " + type + " ).");
            }
        },
        subscript: {
            invalid_operand_type: function (construct: TranslationUnitConstruct, type: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.subscript.invalid_operand_type", "Type " + type + " cannot be subscripted.");
            },
            invalid_offset_type: function (construct: TranslationUnitConstruct, type: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.subscript.invalid_offset_type", "Invalid type (" + type + ") for array subscript offset.");
            }
        },
        dot: {
            class_type: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.dot.class_type", "The dot operator can only be used to access members of an operand with class type.");
            },
            no_such_member: function (construct: TranslationUnitConstruct, classType: ClassType, name: string) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.dot.no_such_member", "Operand of type " + classType + " has no member named " + name + ".");
            },
            memberLookup: function (construct: TranslationUnitConstruct, classType: ClassType, name: string) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.dot.memberLookup", "Member lookup for " + name + " in class " + classType + " failed...");
            }
        },
        arrow: {
            class_pointer_type: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.arrow.class_pointer_type", "The arrow operator can only be used to access members of an operand with pointer-to-class type.");
            },
            no_such_member: function (construct: TranslationUnitConstruct, classType: ClassType, name: string) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.arrow.no_such_member", "Operand of type " + classType + " has no member named " + name + ".");
            },
            memberLookup: function (construct: TranslationUnitConstruct, classType: ClassType, name: string) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.arrow.memberLookup", "Member lookup for " + name + " in class " + classType + " failed...");
            }
        },
        invalid_operand: function (construct: TranslationUnitConstruct, operator: string, operand: TypedExpression) {
            return new CompilerNote(construct, NoteKind.ERROR, "expr.invalid_operand", "Invalid operand type (" + operand.type + ") for operator " + operator + ".");
        },
        lvalue_operand: function (construct: TranslationUnitConstruct, operator: string) {
            return new CompilerNote(construct, NoteKind.ERROR, "expr.lvalue_operand", "The " + operator + " operator requires an lvalue operand.");
        },
        invalid_binary_operands: function (construct: TranslationUnitConstruct, operator: string, left: TypedExpression, right: TypedExpression) {

            if (left.type.isPointerType() && sameType(left.type.ptrTo, right.type)) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.invalid_binary_operands", "The types of the operands used for the " + operator + " operator " +
                    "aren't quite compatible. The one on the right is " + right.type.englishString(false) + ", but the left is a pointer to that type. Think about whether you want to compare pointers (addresses) or the objects they point to.");
            }
            else if (right.type.isPointerType() && sameType(right.type.ptrTo, left.type)) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.invalid_binary_operands", "The types of the operands used for the " + operator + " operator " +
                    "aren't quite compatible. The one on the left is " + left.type.englishString(false) + ", but the right is a pointer to that type.  Think about whether you want to compare pointers (addresses) or the objects they point to.");
            }

            return new CompilerNote(construct, NoteKind.ERROR, "expr.invalid_binary_operands", "Invalid operand types (" + left.type + ", " + right.type + ") for operator " + operator + ".");
        },
        logicalNot: {
            operand_bool: function (construct: TranslationUnitConstruct, operand: TypedExpression) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.logicalNot.operand_bool", "Expression of type (" + operand.type + ") cannot be converted to boolean (as required for the operand of logical not).");
            }
        },
        addressOf: {
            lvalue_required: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.addressOf.lvalue_required", "Operand for address-of operator (&) must be an lvalue.");
            },
            object_type_required: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.addressOf.object_type_required", "The address-of operator (&) may not be applied to an operand of this type.");
            }
        },
        ternary: {
            condition_bool: function (construct: TranslationUnitConstruct, type: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.ternary.condition_bool", "Expression of type (" + type + ") cannot be converted to boolean condition.");
            },
            sameValueCategory: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.ternary.sameValueCategory", "The second and third operands of the ternary operator must yield a common value category.");
            }
        },
        unaryPlus: {
            operand: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.unaryPlus.operand", "The unary plus operator (+) requires an operand of arithmetic or pointer type.");
            }
        },
        unaryMinus: {
            operand: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.unaryMinus.operand", "The unary minus operator (-) requires an operand of arithmetic type.");
            }
        },
        functionCall: {
            main: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.functionCall.main", "You can't explicitly call main.");
            },
            numParams: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.functionCall.numParams", "Improper number of arguments for this function call.");
            },
            invalid_operand_expression: function (construct: TranslationUnitConstruct, operand: Expression) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.functionCall.invalid_operand_expression", "The expression " + operand + " cannot be called as a function.");
            },
            operand: function (construct: TranslationUnitConstruct, operand: CPPEntity) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.functionCall.operand", "Operand of type " + operand.type + " cannot be called as a function.");
            },
            paramType: function (construct: TranslationUnitConstruct, from: Type, to: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.functionCall.paramType", "Cannot convert " + from + " to " + to + " in function call parameter.");
            },
            paramReferenceType: function (construct: TranslationUnitConstruct, from: Type, to: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.functionCall.paramReferenceType", "The given argument (of type " + from + ") cannot be bound to a reference parameter of a different type (" + to + ").");
            },
            paramReferenceLvalue: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.functionCall.paramReferenceLvalue", "For now, you cannot bind a non-lvalue as a reference parameter in Lobster. (i.e. you have to bind a variable)");
            },
            not_defined: function (construct: TranslationUnitConstruct, type: Type, paramTypes: readonly PotentialParameterType[]) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.functionCall.not_defined", "A function call operator with parameters of types (" +
                    paramTypes.map(function (pt) {
                        return pt.toString();
                    }).join(", ")
                    + ") for the class type " + type + " has not been defined.");
            }
            //,
            //tail_recursive : function(construct: TranslationUnitConstruct, reason) {
            //    return WidgetAnnotation.instance(src, "tailRecursive", "This function call is tail recursive!" + (reason ? " "+reason : ""));
            //},
            //not_tail_recursive : function(construct: TranslationUnitConstruct, reason) {
            //    return WidgetAnnotation.instance(src, "recursive", "This function call is recursive, but NOT tail recursive!" + (reason ? " "+reason : ""));
            //}

        },
        thisExpr: {
            memberFunc: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "expr.thisExpr.memberFunc", "You may only use the </span class='code'>this</span> keyword in non-static member functions.");
            }
        }


    },
    iden: {
        ambiguous: function (construct: TranslationUnitConstruct, name: string) {
            return new CompilerNote(construct, NoteKind.ERROR, "iden.ambiguous", "\"" + name + "\" is ambiguous. (There is not enough contextual type information for name lookup to figure out which entity this identifier refers to.)");
        },
        no_match: function (construct: TranslationUnitConstruct, name: string) {
            return new CompilerNote(construct, NoteKind.ERROR, "iden.no_match", "No matching function found for call to \"" + name + "\" with these parameter types.");
        },
        class_entity_found: function (construct: TranslationUnitConstruct, name: string) {
            return new CompilerNote(construct, NoteKind.ERROR, "iden.class_entity_found", `The name "${name}" refers to a class type in this context. The class itself cannot be used in an expression.`);
        },
        // not_declared : function(construct: TranslationUnitConstruct, name) {
        //     return new CompilerNote(construct, NoteKind.ERROR, "iden.not_declared", "\""+name+"\" was not declared in this scope.");
        // },
        keyword: function (construct: TranslationUnitConstruct, name: string) {
            return new CompilerNote(construct, NoteKind.ERROR, "iden.keyword", "\"" + name + "\" is a C++ keyword and cannot be used as an identifier.");
        },
        alt_op: function (construct: TranslationUnitConstruct, name: string) {
            return new CompilerNote(construct, NoteKind.ERROR, "iden.alt_op", "\"" + name + "\" is a C++ operator and cannot be used as an identifier.");
        },
        not_found: function (construct: TranslationUnitConstruct, name: string) {
            return new CompilerNote(construct, NoteKind.ERROR, "iden.not_found", `Name lookup was unable to find "${name}" in this scope.`);
        }
    },
    param: {
        numParams: function (construct: TranslationUnitConstruct) {
            return new CompilerNote(construct, NoteKind.ERROR, "param.numParams", "Improper number of arguments.");
        },
        paramType: function (construct: TranslationUnitConstruct, from: Type, to: Type) {
            return new CompilerNote(construct, NoteKind.ERROR, "param.paramType", "Cannot convert " + from + " to a parameter of type " + to + ".");
        },
        paramReferenceType: function (construct: TranslationUnitConstruct, from: Type, to: Type) {
            return new CompilerNote(construct, NoteKind.ERROR, "param.paramReferenceType", "The given argument (of type " + from + ") cannot be bound to a reference parameter of a different type (" + to + ").");
        },
        paramReferenceLvalue: function (construct: TranslationUnitConstruct) {
            return new CompilerNote(construct, NoteKind.ERROR, "param.paramReferenceLvalue", "For now, you cannot bind a non-lvalue as a reference parameter in Lobster. (i.e. you have to bind a variable)");
        },
        // paramCopyConstructor : function(construct: TranslationUnitConstruct, type) {
        //     return new CompilerNote(construct, NoteKind.ERROR, "param.paramCopyConstructor", "Cannot find a copy constructor to pass a parameter of type " + type + " by value.");
        // },
        thisConst: function (construct: TranslationUnitConstruct, type: Type) {
            return new CompilerNote(construct, NoteKind.ERROR, "param.thisConst", "A non-const member function cannot be called on a const instance of the " + type + " class.");
        }
    },
    stmt: {
        function_definition_prohibited: function (construct: TranslationUnitConstruct) {
            return new CompilerNote(construct, NoteKind.ERROR, "stmt.function_definition_prohibited", "A function definition is prohibited here (i.e. inside a statement).");
        },
        if: {
            condition_bool: function (construct: TranslationUnitConstruct, expr: TypedExpression) {
                return new CompilerNote(expr, NoteKind.ERROR, "stmt.if.condition_bool", "Expression of type (" + expr.type + ") cannot be converted to boolean condition.");
            }
        },
        iteration: {
            condition_bool: function (construct: TranslationUnitConstruct, expr: TypedExpression) {
                return new CompilerNote(expr, NoteKind.ERROR, "stmt.iteration.condition_bool", "Expression of type (" + expr.type + ") cannot be converted to boolean condition.");
            }
        },
        breakStatement: {
            location: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "stmt.breakStatement.location", "Break statements may only occur inside loops or case statements.");
            }
        },
        returnStatement: {
            empty: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "stmt.returnStatement.empty", "A return statement without an expression is only allowed in void functions.");
            },
            exprVoid: function (construct: TranslationUnitConstruct) {
                return new CompilerNote(construct, NoteKind.ERROR, "stmt.returnStatement.exprVoid", "A return statement with an expression of non-void type is only allowed in a non-void function.");
            },
            convert: function (construct: TranslationUnitConstruct, from: Type, to: Type) {
                return new CompilerNote(construct, NoteKind.ERROR, "stmt.returnStatement.convert", "Cannot convert " + from + " to return type of " + to + " in return statement.");
            }
        }
    },
    link: {
        library_unsupported: function (construct: TranslationUnitConstruct, func: FunctionEntity) {
            return new LinkerNote(construct, NoteKind.ERROR, "link.library_unsupported", "I'm sorry, but this function (" + func + ") is a part of the standard library that isn't currently supported.");
        },
        multiple_def: function (construct: TranslationUnitConstruct, name: string) {
            return new LinkerNote(construct, NoteKind.ERROR, "link.multiple_def", "Multiple definitions found for " + name + ".");
        },
        type_mismatch: function (construct: TranslationUnitConstruct, ent1: DeclaredEntity, ent2: DeclaredEntity) {
            return new LinkerNote(construct, NoteKind.ERROR, "link.type_mismatch", "Multiple declarations found for " + ent1.name + ", but with different types.");
        },
        class_same_tokens: function (newDef: ClassDefinition, prevDef: ClassDefinition) {
            return new LinkerNote([newDef, prevDef], NoteKind.ERROR, "link.class_same_tokens", "Multiple class definitions are ok if they are EXACTLY the same in the source code. However, the multiple definitions found for " + newDef.name + " do not match exactly.");
        },
        func: {
            def_not_found: function (construct: FunctionDeclaration, func: FunctionEntity) {
                return new LinkerNote(construct, NoteKind.ERROR, "link.func.def_not_found", "Cannot find definition for function " + func.name + ". That is, the function is declared and I know what it is, but I can't find the actual code that implements it.");
            },
            no_matching_overload: function (construct: TranslationUnitConstruct, func: FunctionEntity) {
                return new LinkerNote(construct, NoteKind.ERROR, "link.func.no_matching_overload", `Although some definitions for a function named ${func.name} exist, I can't find one with the right signature to match this declaration.`);
            },
            returnTypesMatch: function (construct: TranslationUnitConstruct, func: FunctionEntity) {
                return new LinkerNote(construct, NoteKind.ERROR, "link.func.returnTypesMatch", "This declaration of the function " + func.name + " has a different return type than its definition.");
            }
        },
        classes: {
            def_not_found: function (construct: ClassDeclaration, c: ClassEntity) {
                return new LinkerNote(construct, NoteKind.ERROR, "link.classes.def_not_found", "Cannot find definition for class " + c.name + ". The class is declared, but I wasn't able to find the actual class definition to link to it.");
            },
        },
        def_not_found: function (construct: TranslationUnitConstruct, ent: GlobalObjectEntity) {
            return new LinkerNote(construct, NoteKind.ERROR, "link.def_not_found", "Cannot find definition for object " + ent.name + ". (It is declared, so I know it's a variable and what type it is, but it's never defined anywhere.)");
        },
        main_multiple_def: function (construct: TranslationUnitConstruct) {
            return new LinkerNote(construct, NoteKind.ERROR, "link.main_multiple_def", "Multiple definitions of main are not allowed.");
        },

    },
    // lookup : {
    //     // badLookup : function(construct: TranslationUnitConstruct, name) {
    //     //     name = Identifier.qualifiedNameString(name);
    //     //     return new CompilerNote(construct, NoteKind.ERROR, "lookup.badLookup", "Name lookup for \""+name+"\" was unsuccessful.)");
    //     // },
    //     ambiguous : function(construct: TranslationUnitConstruct, name) {
    //         name = Identifier.qualifiedNameString(name);
    //         return new CompilerNote(construct, NoteKind.ERROR, "lookup.ambiguous", "\""+name+"\" is ambiguous. (There is not enough contextual type information for name lookup to figure out which entity this identifier refers to.)");
    //     },
    //     no_match : function(construct: TranslationUnitConstruct, name, paramTypes, isThisConst) {
    //         name = Identifier.qualifiedNameString(name);
    //         return new CompilerNote(construct, NoteKind.ERROR, "lookup.no_match", "No matching function found for call to \""+name+"\" with parameter types (" +
    //         paramTypes.map(function(pt) {
    //             return pt.toString();
    //         }).join(", ") +
    //         ")" + (isThisConst ? " and that may be applied to a const object (or called from const member function)." : "."));
    //     },
    //     hidden : function(construct: TranslationUnitConstruct, name, paramTypes, isThisConst) {
    //         name = Identifier.qualifiedNameString(name);
    //         return new CompilerNote(construct, NoteKind.ERROR, "lookup.hidden", "No matching function found for call to \""+name+"\" with parameter types(" +
    //             paramTypes.map(function(pt) {
    //                 return pt.toString();
    //             }).join(", ") +
    //             ")" + (isThisConst ? " and that may be applied to a const object (or called from const member function)." : ".") + " (Actually, there is a match in a more distant scope, but it is hidden by an entity of the same name in a nearer scope.)");
    //     },
    //     not_found : function(construct: TranslationUnitConstruct, name) {
    //         name = Identifier.qualifiedNameString(name);
    //         return new CompilerNote(construct, NoteKind.ERROR, "lookup.not_found", "Cannot find declaration for \""+name+"\".");
    //     }
    // },
    preprocess: {
        recursiveInclude: function (sourceRef: SourceReference) {
            return new PreprocessorNote(sourceRef, NoteKind.WARNING, "preprocess.recursiveInclude", "Recursive #include detected. (i.e. A file #included itself, or #included a different file that then #includes the original, etc.)");
        },
        fileNotFound: function (sourceRef: SourceReference, name: string) {
            return new PreprocessorNote(sourceRef, NoteKind.ERROR, "preprocess.fileNotFound", `The file ${name} does not exist.`);
        }
    },
    lobster: {
        unsupported_feature: function (construct: TranslationUnitConstruct, feature: string) {
            return new CompilerNote(construct, NoteKind.ERROR, "lobster.unsupported_feature", "Sorry, you have used a C++ feature (" + feature + ") that is not currently supported in Lobster.");
        },
        referencePrvalue: function (construct: TranslationUnitConstruct) {
            return new CompilerNote(construct, NoteKind.ERROR, "lobster.referencePrvalue", "Sorry, Lobster does not yet support binding references (even if they are reference-to-const) to prvalues (e.g. temporary objects).");
        },
        ternarySameType: function (construct: TranslationUnitConstruct, type1: Type, type2: Type) {
            return new CompilerNote(construct, NoteKind.ERROR, "lobster.ternarySameType", "Lobster's ternary operator requires second and third operands of the same type. The given operands have types " + type1 + " and " + type2 + ".");
        },
        ternaryNoVoid: function (construct: TranslationUnitConstruct) {
            return new CompilerNote(construct, NoteKind.ERROR, "lobster.ternaryNoVoid", "Lobster's ternary operator does not allow void operands.");
        },
        keyword: function (construct: TranslationUnitConstruct, name: string) {
            return new CompilerNote(construct, NoteKind.ERROR, "lobster.keyword", "\"" + name + "\" is a special keyword used by the Lobster system and cannot be used as an identifier.");
        },
    }
};

export interface NoteHandler {
    addNote(note: Note): void;


}