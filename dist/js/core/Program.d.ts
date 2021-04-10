import { NoteRecorder, Note } from "./errors";
import { NamespaceScope, GlobalObjectEntity, FunctionEntity, ClassEntity, NameLookupOptions } from "./entities";
import { TranslationUnitContext, CPPConstruct, ProgramContext, GlobalObjectAllocator, CompiledGlobalObjectAllocator } from "./constructs";
import { ASTNode } from "../ast/ASTNode";
import { StringLiteralExpression } from "./expressions";
import { FunctionType, Int } from "./types";
import { FunctionCall } from "./FunctionCall";
import { QualifiedName } from "./lexical";
import { TranslationUnitAST } from "../ast/ast_program";
import { GlobalVariableDefinition, FunctionDefinitionGroup, ClassDefinition, FunctionDefinition, CompiledFunctionDefinition, CompiledGlobalVariableDefinition, TopLevelDeclaration } from "./declarations";
import { CompiledObjectDeallocator, ObjectDeallocator } from "./ObjectDeallocator";
/**
 *
 * The program also needs to know about all source files involved so that #include preprocessor
 * directives can be processed.
 *
 */
export declare class Program {
    readonly context: ProgramContext;
    readonly isCompilationUpToDate: boolean;
    readonly sourceFiles: {
        [index: string]: SourceFile;
    };
    readonly translationUnits: {
        [index: string]: TranslationUnit;
    };
    readonly staticObjects: readonly GlobalVariableDefinition[];
    readonly staticObjectAllocator?: GlobalObjectAllocator;
    readonly staticObjectDeallocator?: ObjectDeallocator;
    private readonly functionCalls;
    readonly linkedObjectDefinitions: {
        [index: string]: GlobalVariableDefinition | undefined;
    };
    readonly linkedFunctionDefinitions: {
        [index: string]: FunctionDefinitionGroup | undefined;
    };
    readonly linkedClassDefinitions: {
        [index: string]: ClassDefinition | undefined;
    };
    readonly linkedObjectEntities: readonly GlobalObjectEntity[];
    readonly linkedFunctionEntities: readonly FunctionEntity[];
    readonly linkedClassEntities: readonly ClassEntity[];
    readonly notes: NoteRecorder;
    readonly mainFunction?: FunctionDefinition;
    constructor(sourceFiles: readonly SourceFile[], translationUnits: Set<string>);
    private link;
    private defineIntrinsics;
    registerGlobalObjectEntity(entity: GlobalObjectEntity): void;
    registerFunctionEntity(entity: FunctionEntity): void;
    registerClassEntity(entity: ClassEntity): void;
    getLinkedFunctionEntity(qualifiedName: QualifiedName): FunctionEntity<FunctionType<import("./types").PotentialReturnType>> | undefined;
    getLinkedObjectEntity(qualifiedName: QualifiedName): GlobalObjectEntity<import("./types").CompleteObjectType> | undefined;
    registerGlobalObjectDefinition(qualifiedName: QualifiedName, def: GlobalVariableDefinition): void;
    registerFunctionDefinition(qualifiedName: QualifiedName, def: FunctionDefinition): void;
    /**
     * TODO: reword this more nicely. registers definition. if there was already one, returns that.
     * this is important since the code attempting to register the duplicate defintion can instead
     * use the existing one, to avoid multiple instances of identical definitions. If there was a
     * conflict, returns the newly added definition.
     * @param qualifiedName
     * @param def
     */
    registerClassDefinition(qualifiedName: QualifiedName, def: ClassDefinition): ClassDefinition;
    hasSyntaxErrors(): boolean;
    hasErrors(): boolean;
    isCompiled(): this is CompiledProgram;
    isRunnable(): this is RunnableProgram;
    addNote(note: Note): void;
}
export interface CompiledProgram extends Program {
    readonly mainFunction?: CompiledFunctionDefinition;
    readonly staticObjects: readonly CompiledGlobalVariableDefinition[];
    readonly staticObjectAllocator: CompiledGlobalObjectAllocator;
    readonly staticObjectDeallocator: CompiledObjectDeallocator;
}
export interface RunnableProgram extends CompiledProgram {
    readonly mainFunction: CompiledFunctionDefinition<FunctionType<Int>>;
}
export declare class SimpleProgram extends Program {
    constructor(source: string);
}
/**
 * A simple, immutable object that contains a filename and its text contents.
 * Because it is immutable, don't grab a reference to someone's source file
 * and expect it to update - changes to a file's context require a completely new object.
 */
export declare class SourceFile {
    readonly name: string;
    readonly text: string;
    readonly isLibrary: boolean;
    constructor(name: string, text: string, isLibrary?: boolean);
}
interface SourceReferenceInclude {
    sourceFile: SourceFile;
    lineIncluded: number;
}
export declare class SourceReference {
    /**
     * Creates a wrapper to represent a reference to source code that has been included in another file.
     */
    static createIncluded(sourceFile: SourceFile, lineIncluded: number, originalReference: SourceReference): SourceReference;
    readonly sourceFile: SourceFile;
    readonly line: number;
    readonly column: number;
    readonly start: number;
    readonly end: number;
    private readonly _includes;
    readonly includes: readonly SourceReferenceInclude[];
    constructor(sourceFile: SourceFile, line: number, column: number, start: number, end: number);
    get isIncluded(): boolean;
}
interface IncludeMapping {
    readonly startLine: number;
    readonly startOffset: number;
    readonly numLines: number;
    readonly endLine: number;
    readonly lineDelta: number;
    readonly lengthDelta: number;
    readonly included: PreprocessedSource;
    readonly lineIncluded: number;
}
declare class PreprocessedSource {
    readonly primarySourceFile: SourceFile;
    readonly name: string;
    readonly availableToInclude: {
        [index: string]: SourceFile | undefined;
    };
    readonly notes: NoteRecorder;
    private readonly _includes;
    readonly includes: readonly IncludeMapping[];
    readonly includedSourceFiles: {
        [index: string]: SourceFile;
    };
    readonly preprocessedText: string;
    readonly numLines: number;
    readonly length: number;
    constructor(sourceFile: SourceFile, availableToInclude: {
        [index: string]: SourceFile | undefined;
    }, alreadyIncluded?: {
        [index: string]: boolean;
    });
    private filterSourceCode;
    getSourceReference(line: number, column: number, start: number, end: number): SourceReference;
}
/**
 * TranslationUnit
 *
 * Events:
 *   "parsed": after parsing is finished *successfully*
 *   "syntaxError": if a syntax error is encountered during parsing. data contains properties line, column, and message
 *   "compilationFinished": after compilation is finished
 */
export declare class TranslationUnit {
    readonly context: TranslationUnitContext;
    readonly notes: NoteRecorder;
    readonly name: string;
    readonly source: PreprocessedSource;
    readonly program: Program;
    readonly globalScope: NamespaceScope;
    readonly topLevelDeclarations: readonly TopLevelDeclaration[];
    readonly staticEntities: readonly GlobalObjectEntity[];
    readonly stringLiterals: readonly StringLiteralExpression[];
    readonly functionCalls: readonly FunctionCall[];
    readonly parsedAST?: TranslationUnitAST;
    /**
     * Attempts to compiled the given primary source file as a translation unit for a C++ program.
     * The compilation is attempted given the **current** state of the source files. If the primary
     * source or any of the files included via the preprocessor are changed in any way, a new `TranslationUnit`
     * should be constructed (it is not possible to "re-compile" a TranslationUnit object.)
     * @param primarySourceFile Contains the source code for this translation unit.
     * @param sourceFiles The set of files to be available for inclusion via #include directives.
     */
    constructor(program: Program, preprocessedSource: PreprocessedSource);
    private createBuiltInGlobals;
    private compileTopLevelDeclarations;
    registerStringLiteral(literal: StringLiteralExpression): void;
    registerFunctionCall(call: FunctionCall): void;
    getNearestSourceReferenceForConstruct(construct: CPPConstruct): SourceReference;
    getSourceReferenceForAST(ast: ASTNode): SourceReference;
    getSourceReference(line: number, column: number, start: number, end: number): SourceReference;
    addNote(note: Note): void;
    /**
     * An array of all of the identifiers that comprise the qualified name.
     * If you've got a string like "std::vector", just use .split("::"") to
     * get the corresponding array, like ["std", "vector"].
     */
    qualifiedLookup(name: QualifiedName, options?: NameLookupOptions): import("./entities").DeclaredScopeEntry | undefined;
}
export declare function registerLibraryHeader(name: string, file: SourceFile): void;
export {};
