
import { parse as cpp_parse} from "../parse/cpp_parser";
import { NoteKind, SyntaxNote, CPPError, NoteRecorder, Note } from "./errors";
import { Mutable, asMutable, assertFalse, assert } from "../util/util";
import { GlobalVariableDefinition, LinkedDefinition, FunctionDefinition, CompiledFunctionDefinition, CompiledGlobalVariableDefinition, DeclarationASTNode, TopLevelDeclaration, createDeclarationFromAST, FunctionDeclaration, TypeSpecifier, StorageSpecifier, Declarator, SimpleDeclaration, createSimpleDeclarationFromAST, FunctionDefinitionGroup, ClassDefinition } from "./declarations";
import { NamespaceScope, GlobalObjectEntity, selectOverloadedDefinition, FunctionEntity, ClassEntity } from "./entities";
import { Observable } from "../util/observe";
import { TranslationUnitContext, CPPConstruct, createTranslationUnitContext, ProgramContext, GlobalObjectAllocator, CompiledGlobalObjectAllocator } from "./constructs";
import { FunctionCall } from "./functionCall";
import { StringLiteralExpression } from "./expressions";


/**
 *
 * The program also needs to know about all source files involved so that #include preprocessor
 * directives can be processed.
 *
 */
export class Program {
    
    // public readonly observable = new Observable(this);
    
    public readonly context: ProgramContext = {program: this};
    
    public readonly isCompilationUpToDate: boolean = true;

    public readonly sourceFiles : { [index: string]: SourceFile } = {};
    public readonly translationUnits : { [index: string]: TranslationUnit } = {};
    
    public readonly globalObjects: readonly GlobalVariableDefinition[] = [];
    public readonly globalObjectAllocator!: GlobalObjectAllocator;
    
    private readonly functionCalls: readonly FunctionCall[] = [];
    
    public readonly linkedObjectDefinitions: {[index: string] : GlobalVariableDefinition | undefined} = {};
    public readonly linkedFunctionDefinitions: {[index: string] : FunctionDefinitionGroup | undefined} = {};
    public readonly linkedClassDefinitions: {[index: string] : ClassDefinition | undefined} = {};

    public readonly linkedObjectEntities: readonly GlobalObjectEntity[] = [];
    public readonly linkedFunctionEntities: readonly FunctionEntity[] = [];
    public readonly linkedClassEntities: readonly ClassEntity[] = [];

    public readonly notes = new NoteRecorder();

    public readonly mainFunction?: FunctionDefinition;


    public constructor(sourceFiles: readonly SourceFile[], translationUnits: readonly string[]) {

        sourceFiles.forEach(file => {
            this.sourceFiles[file.name] = file;
        });

        translationUnits.forEach((tuName) => {
            assert(!!this.sourceFiles[tuName], `Source file ${tuName} not found.`);

            let tu = this.translationUnits[tuName] = new TranslationUnit(this,
                new PreprocessedSource(this.sourceFiles[tuName], this.sourceFiles));
        });
        
        if (!this.notes.hasSyntaxErrors) {
            this.link();
        }

        (<Mutable<this>>this).isCompilationUpToDate = true;
    }

    // addSourceFile : function(sourceFile) {
    //     assert(!this.i_sourceFiles[sourceFile.getName()]);
    //     this.i_sourceFiles[sourceFile.getName()] = sourceFile;
    //     this.listenTo(sourceFile);
    //     this.send("sourceFileAdded", sourceFile);
    // },

    // removeSourceFile : function(sourceFile) {
    //     if (typeof sourceFile !== "string"){
    //         sourceFile = sourceFile.getName();
    //     }
    //     if(this.i_sourceFiles[sourceFile]){
    //         delete this.i_sourceFiles[sourceFile];
    //     }

    //     this.stopListeningTo(sourceFile);

    //     // Also remove any associated translation unit (if it exists)
    //     this.removeTranslationUnit(sourceFile);
    //     this.send("sourceFileRemoved", sourceFile);
    // },

    // getSourceFile : function(name) {
    //     return this.i_sourceFiles[name];
    // },

    // getSourceFiles : function() {
    //     return this.i_sourceFiles;
    // },

    // createTranslationUnitForSourceFile : function(sourceFileName) {
    //     if (typeof sourceFileName !== "string") {
    //         sourceFileName = sourceFileName.getName();
    //     }
    //     assert(this.i_sourceFiles[sourceFileName]);
    //     assert(!this.i_translationUnits[sourceFileName]);

    //     var tu = TranslationUnit.instance(this, this.i_sourceFiles[sourceFileName]);
    //     this.i_translationUnits[tu.getName()] = tu;

    //     this.i_setCompilationUpToDate(false);

    //     this.send("translationUnitCreated", tu);
    //     return tu;
    // },

    // removeTranslationUnit : function(translationUnit) {
    //     if (typeof translationUnit !== "string"){
    //         translationUnit = translationUnit.getName();
    //     }
    //     if(this.i_translationUnits[translationUnit]){
    //         delete this.i_translationUnits[translationUnit];
    //     }

    //     this.i_setCompilationUpToDate(false);

    //     this.send("translationUnitRemoved", translationUnit);
    // },

    // getTranslationUnit : function(name) {
    //     return this.i_translationUnits[name];
    // },

    // getTranslationUnits : function() {
    //     return this.i_translationUnits;
    // },

    // addStaticEntity : function(ent){
    //     this.staticEntities.push(ent);
    // },

    private link() {
        // this.send("linkingStarted");

        this.defineIntrinsics();

        // Provide definitions to each linked entity based on qualified name.
        // Note that the definition provided might not match at all or might
        // be undefined if there was no match for the qualified name. The entities
        // will take care of adding the appropriate linker errors in these cases.
        this.linkedObjectEntities.forEach(le =>
            le.definition ?? le.link(this.linkedObjectDefinitions[le.qualifiedName])
        );
        this.linkedFunctionEntities.forEach(le =>
            le.definition ?? le.link(this.linkedFunctionDefinitions[le.qualifiedName])
        );
        this.linkedClassEntities.forEach(le =>
            le.definition ?? le.link(this.linkedClassDefinitions[le.qualifiedName])
        );

        let mainLookup = this.linkedFunctionDefinitions["::main"];
        if (mainLookup) {
            if (mainLookup.definitions.length === 1) {
                (<Mutable<this>>this).mainFunction = mainLookup.definitions[0];
            }
            else {
                mainLookup.definitions.forEach(mainDef => this.addNote(CPPError.link.main_multiple_def(mainDef.declaration)));
            }
        }

        (<Mutable<this>>this).globalObjectAllocator = new GlobalObjectAllocator(this.context, this.globalObjects);
        //look for main - TODO: this should just be a prerequisite for actually simulating.
        // I think it's a bit annoying that a program without main necessarily has this error.
        // try{
        //     this.i_main = this.i_globalScope.requiredLookup("main", {paramTypes: []});
        // }
        // catch(e){
        //     if (isA(e, SemanticExceptions.BadLookup)){
        //         this.addNote(e.annotation());
        //     }
        //     else{
        //         console.log(e.stack);
        //         throw e;
        //     }
        // }

        // this.send("linkingFinished");

    }

    private defineIntrinsics() {
        
        // let intrinsicsTU = new TranslationUnit(this, new PreprocessedSource(new SourceFile("_intrinsics.cpp", ""), {}));

        // let assertDecl = <FunctionDeclaration>createDeclarationFromAST(cpp_parse("void assert(bool);", {startRule: "declaration"}), intrinsicsTU.context)[0];
        // let functionContext = createFunctionContext(intrinsicsTU.context, assertDecl.declaredEntity);
        // let assertDef = new FunctionDefinition(this.context, assertDecl, 
        //     )

    }

    public registerGlobalObjectEntity(entity: GlobalObjectEntity) {
        asMutable(this.linkedObjectEntities).push(entity);
    }

    public registerFunctionEntity(entity: FunctionEntity) {
        asMutable(this.linkedFunctionEntities).push(entity);
    }
    
    public registerClassEntity(entity: ClassEntity) {
        asMutable(this.linkedClassEntities).push(entity);
    }

    public registerGlobalObjectDefinition(qualifiedName: string, def: GlobalVariableDefinition) {
        if (!this.linkedObjectDefinitions[qualifiedName]) {
            this.linkedObjectDefinitions[qualifiedName] = def;
            asMutable(this.globalObjects).push(def);
        }
        else {
            // One definition rule violation
            this.addNote(CPPError.link.multiple_def(def, qualifiedName));
        }
    }

    public registerFunctionDefinition(qualifiedName: string, def: FunctionDefinition) {
        let prevDef = this.linkedFunctionDefinitions[qualifiedName];
        if (!prevDef) {
            this.linkedFunctionDefinitions[qualifiedName] = new FunctionDefinitionGroup([def]);
        }
        else {
            // Already some definitions for functions with this same name. Check if there's
            // a conflicting overload that violates ODR
            let conflictingDef = selectOverloadedDefinition(prevDef.definitions, def.declaration.type);
            if (conflictingDef) {
                this.addNote(CPPError.link.multiple_def(def, qualifiedName));
            }
            else {
                prevDef.addDefinition(def);
            }
        }
    }

    /**
     * TODO: reword this more nicely. registers definition. if there was already one, returns that.
     * this is important since the code attempting to register the duplicate defintion can instead
     * use the existing one, to avoid multiple instances of identical definitions. If there was a
     * conflict, returns the newly added definition.
     * @param qualifiedName 
     * @param def 
     */
    public registerClassDefinition(qualifiedName: string, def: ClassDefinition) {
        let prevDef = this.linkedClassDefinitions[qualifiedName];
        if (!prevDef) {
            return this.linkedClassDefinitions[qualifiedName] = def;
        }
        else {
            // Multiple definitions. If they are from the same translation unit, this is always
            // prohibited, but the error will be generated by the scope in that translation unit,
            // so we do not need to handle it here. However, multiple definitions in different
            // translation units are only allowed if the definitions consist of exactly the same tokens.

            // Literally same definition object - ok
            if (def === prevDef) {
                return prevDef;
            }

            // Same tokens - ok
            let prevDefText = prevDef.ast?.source.text;
            let defText = def.ast?.source.text;
            if (prevDefText && defText && prevDefText.replace(/\s/g,'') === defText.replace(/\s/g,'')) {
                return prevDef;
            }

            def.addNote(CPPError.link.class_same_tokens(def, prevDef));
            return def;
        }
    }

    public isCompiled() : this is CompiledProgram {
        return !this.notes.hasErrors;
    }

    public isRunnable() : this is RunnableProgram {
        return this.isCompiled() && !!this.mainFunction;
    }

    public addNote(note: Note) {
        this.notes.addNote(note);
    }

    // //TODO: Program itself should just register all the function calls in its translation units.
    // //      However, don't spend time on this until figuring out where the list of function calls
    // //      is used. I think it was used as part of linking to ensure all function calls are defined,
    // //      but when linking is more properly implemented, I really need to check that everything with
    // //      linkage (that is odr-used) actually has a definition.
    // registerFunctionCall : function(call) {
    //     this.i_functionCalls.push(call);
    // },

    // _act : {
    //     textChanged : function(msg) {
    //         if (this.i_includedSourceFiles[msg.source.getName()]) {
    //             this.i_setCompilationUpToDate(false);
    //         }
    //     }
    // }
};

export interface CompiledProgram extends Program {
    readonly mainFunction?: CompiledFunctionDefinition;
    readonly globalObjects: readonly CompiledGlobalVariableDefinition[];
    readonly globalObjectAllocator: CompiledGlobalObjectAllocator;
}

export interface RunnableProgram extends CompiledProgram {
    readonly mainFunction: CompiledFunctionDefinition;
}

/**
 * A simple, immutable object that contains a filename and its text contents.
 * Because it is immutable, don't grab a reference to someone's source file
 * and expect it to update - changes to a file's context require a completely new object.
 */
export class SourceFile {
    
    public readonly name: string;
    public readonly text: string;

    public constructor(name: string, text: string) {
        this.name = name;
        this.text = text;
    }

    // setText : function(text) {
    //     this.i_text = text;
    //     this.send("textChanged");
    // },

}

interface SourceReferenceInclude {
    sourceFile: SourceFile;
    lineIncluded: number;
}

export class SourceReference {

    /**
     * Creates a wrapper to represent a reference to source code that has been included in another file.
     */
    public static createIncluded(sourceFile: SourceFile, lineIncluded: number, originalReference: SourceReference) {
        var obj = new SourceReference(originalReference.sourceFile, originalReference.line, originalReference.column,
            originalReference.start, originalReference.end);
        obj._includes.push({
            sourceFile: sourceFile,
            lineIncluded: lineIncluded
        });
        originalReference.includes.forEach((inc) => obj._includes.push(inc));
        return obj;
    }

    public readonly sourceFile: SourceFile;
    public readonly line: number;
    public readonly column: number;
    public readonly start: number;
    public readonly end: number;

    private readonly _includes: SourceReferenceInclude[] = [];
    public readonly includes: readonly SourceReferenceInclude[] = this._includes;

    public constructor(sourceFile: SourceFile, line: number, column: number, start: number, end: number) {
        this.sourceFile = sourceFile;
        this.line = line;
        this.column = column;
        this.start = start;
        this.end = end;
    }

    get isIncluded() {
        return this.includes.length > 0;
    }

    // getIncludePrelude : function() {
    //     var str = "";
    //     var prevInclude = this.sourceFile;
    //     this.i_includes.forEach(function(include) {
    //         str += "In file \"" + include.sourceFile.getName() + "\" included from " + prevInclude.getName() + "\""
    //
    //     });
    // }

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

class PreprocessedSource {

    public readonly primarySourceFile: SourceFile;
    public readonly name: string;
    public readonly availableToInclude: {[index: string]: SourceFile | undefined};

    public readonly notes = new NoteRecorder();

    private readonly _includes: IncludeMapping[] = [];
    public readonly includes: readonly IncludeMapping[] = this._includes;

    public readonly includedSourceFiles: {[index: string]: SourceFile} = {};

    public readonly preprocessedText: string;
    public readonly numLines: number;
    public readonly length: number;

    public constructor(sourceFile: SourceFile, availableToInclude: {[index: string]: SourceFile | undefined}, alreadyIncluded: {[index: string]: boolean} = {}) {
        this.primarySourceFile = sourceFile;
        this.name = sourceFile.name;
        this.availableToInclude = availableToInclude;

        alreadyIncluded[this.primarySourceFile.name] = true;

        let codeStr = sourceFile.text;

        codeStr = this.filterSourceCode(codeStr);

        let currentIncludeOffset = 0;
        let currentIncludeLineNumber = 1;
        let originalIncludeLineNumber = 1;

        this.includedSourceFiles[this.primarySourceFile.name] = this.primarySourceFile;

        // Find and replace #include lines. Will also populate i_includes array.
        // [^\S\n] is a character class for all whitespace other than newlines
        this.preprocessedText = codeStr.replace(/#include[^\S\n]+"(.*)"/g,
            (includeLine, filename, offset, original) => {

                let mapping: Mutable<Partial<IncludeMapping>> = {};

                // Find the line number of this include by adding up the number of newline characters
                // since the offset of the last match up to the current one. Add this to the line number.
                for (let i = currentIncludeOffset; i < offset; ++i) {
                    if (original[i] === "\n") {
                        ++currentIncludeLineNumber;
                        ++originalIncludeLineNumber;
                    }
                }

                mapping.startLine = currentIncludeLineNumber;
                mapping.startOffset = offset;

                currentIncludeOffset = offset + includeLine.length;

                // TODO: I think this is not needed because the filename was a part of the original match
                //       and is thus passed in to the function used for replacement.
                // // extract the filename from the #include line match
                // // [1] yields only the match for the part of the regex in parentheses
                // var filename = includeLine.match(/"(.*)"/)[1];

                // check for self inclusion
                if (alreadyIncluded[filename]) {
                    this.notes.addNote(CPPError.preprocess.recursiveInclude(
                        new SourceReference(sourceFile, currentIncludeLineNumber, 0, offset, currentIncludeOffset)));

                    // replace the whole #include line with spaces. Can't just remove or it messes up offsets.
                    return Array(includeLine.length + 1).join(" ");
                }

                // Recursively preprocess the included file
                let includedSourceFile = this.availableToInclude[filename];
                //TODO: what happens if the file doesn't exist?
                if (!includedSourceFile) {
                    this.notes.addNote(CPPError.preprocess.fileNotFound(
                        new SourceReference(sourceFile, currentIncludeLineNumber, 0, offset, currentIncludeOffset), filename));

                    // replace the whole #include line with spaces. Can't just remove or it messes up offsets.
                    return Array(includeLine.length + 1).join(" ");
                }

                let included = new PreprocessedSource(includedSourceFile, this.availableToInclude,
                    Object.assign({}, alreadyIncluded));

                Object.assign(this.includedSourceFiles, included.includedSourceFiles);
                this.notes.addNotes(included.notes.allNotes);

                mapping.numLines = included.numLines;
                mapping.endLine = mapping.startLine + included.numLines;

                mapping.lineDelta = included.numLines - 1;
                mapping.lengthDelta = included.length - includeLine.length;
                currentIncludeLineNumber += included.numLines - 1; // -1 since one line from original was replaced
                mapping.included = included;
                mapping.lineIncluded = originalIncludeLineNumber;

                this._includes.push(<IncludeMapping>mapping); // TODO: remove cast

                return included.preprocessedText;
            }
        );

        // Count lines for the rest of the file after any #includes
        for (var i = currentIncludeOffset; i < codeStr.length; ++i) {
            if (codeStr[i] === "\n") {
                ++currentIncludeLineNumber;
            }
        }

        this.numLines = currentIncludeLineNumber;
        this.length = this.preprocessedText.length;
    }
    
    private filterSourceCode(codeStr: string) {

        // remove carriage returns
        codeStr = codeStr.replace(/\r/g, "");

        if (codeStr.includes("#ifndef")){
            codeStr = codeStr.replace(/#ifndef.*/g, function(match){
                return Array(match.length+1).join(" ");
            });
            // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
        }
        if (codeStr.includes("#define")){
            codeStr = codeStr.replace(/#define.*/g, function(match){
                return Array(match.length+1).join(" ");
            });
            // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
        }
        if (codeStr.includes("#endif")){
            codeStr = codeStr.replace(/#endif.*/g, function(match){
                return Array(match.length+1).join(" ");
            });
            // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
        }
        // if (codeStr.contains(/#include.*<.*>/g)){
            codeStr = codeStr.replace(/#include.*<.*>/g, function(match){
                return Array(match.length+1).join(" ");
            });
            // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
        // }
        if (codeStr.includes("using namespace")){
            codeStr = codeStr.replace(/using namespace.*/g, function(match){
                return Array(match.length+1).join(" ");
            });
            // TODO NEW why is this commented?
            // this.send("otherError", "When writing code in lobster, you don't need to include using directives (e.g. <span class='code'>using namespace std;</span>).");
        }
        if (codeStr.includes("using std::")){
            codeStr = codeStr.replace(/using std::.*/g, function(match){
                return Array(match.length+1).join(" ");
            });
            // this.send("otherError", "Lobster doesn't support using declarations at the moment.");
        }
        return codeStr;
    }

    public getSourceReference(line: number, column: number, start: number, end: number) : SourceReference {

        // Iterate through all includes and check if any would contain
        let offset = 0;
        let lineOffset = 1;
        for(let i = 0; i < this.includes.length; ++i) {
            let inc = this.includes[i];
            if (line < inc.startLine) {
                return new SourceReference(this.primarySourceFile, line - lineOffset + 1, column, start && start - offset, end && end - offset);
            }
            else if (inc.startLine <= line && line < inc.endLine) {
                return SourceReference.createIncluded(this.primarySourceFile, inc.lineIncluded,
                    inc.included.getSourceReference(line - inc.startLine + 1, column, start && start - inc.startOffset, end && end - inc.startOffset));
            }
            offset += inc.lengthDelta;
            lineOffset += inc.lineDelta;
        }

        // If this line wasn't part of any of the includes, just return a regular source reference to the original
        // source file associated with this translation unit
        return new SourceReference(this.primarySourceFile, line - lineOffset + 1, column, start && start - offset, end && end - offset);
    }

}


export interface TranslationUnitAST {
    readonly construct_type: "translation_unit";
    readonly declarations: readonly DeclarationASTNode[];
}

/**
 * TranslationUnit
 *
 * Events:
 *   "parsed": after parsing is finished *successfully*
 *   "syntaxError": if a syntax error is encountered during parsing. data contains properties line, column, and message
 *   "compilationFinished": after compilation is finished
 */
export class TranslationUnit {
    
    public readonly context: TranslationUnitContext;

    // public readonly observable = new Observable(this);
    public readonly notes = new NoteRecorder();

    public readonly name: string;
    public readonly source: PreprocessedSource;
    public readonly program: Program;

    public readonly globalScope: NamespaceScope;
    
    public readonly topLevelDeclarations: readonly TopLevelDeclaration[] = [];
    public readonly staticEntities: readonly GlobalObjectEntity[] = [];
    public readonly stringLiterals: readonly StringLiteralExpression[] = [];
    public readonly functionCalls: readonly FunctionCall[] = [];

    public readonly parsedAST?: TranslationUnitAST;

    /**
     * Attempts to compiled the given primary source file as a translation unit for a C++ program.
     * The compilation is attempted given the **current** state of the source files. If the primary
     * source or any of the files included via the preprocessor are changed in any way, a new `TranslationUnit`
     * should be constructed (it is not possible to "re-compile" a TranslationUnit object.)
     * @param primarySourceFile Contains the source code for this translation unit.
     * @param sourceFiles The set of files to be available for inclusion via #include directives.
     */
    public constructor(program: Program, preprocessedSource: PreprocessedSource) {
        this.program = program;
        this.source = preprocessedSource;
        preprocessedSource.notes.allNotes.forEach(note => this.addNote(note)); // Don't use this.notes.addNotes here since that would miss adding them to the program as well
        this.globalScope = new NamespaceScope(this, preprocessedSource.primarySourceFile.name + "_GLOBAL_SCOPE");
        this.name = preprocessedSource.name;
        this.context = createTranslationUnitContext(program.context, this, this.globalScope);

        try{
            // This is kind of a hack to communicate with the PEG.js generated parsing code.
            // This both "resets" the user-defined type names that exist for each translation
            // unit (e.g. so that Class names declared in another translation unit aren't hanging
            // around), and also ensures "default" user-defined type names like ostream, etc. are
            // recognized as such. Making a copy is important so that we don't modify the original
            // which will potentially be used by other translation units.
            // resetUserTypeNames(); //Object.assign({}, Types.defaultUserTypeNames); // TODO

            // Note this is not checked by the TS type system. We just have to manually ensure
            // the structure produced by the grammar/parser matches what we expect.
            let parsedAST : TranslationUnitAST = cpp_parse(this.source.preprocessedText);
            this.parsedAST = parsedAST;

            this.createBuiltInGlobals();
            this.compileTopLevelDeclarations(this.parsedAST);
		}
		catch(err) {
			if (err.name == "SyntaxError"){
				this.addNote(new SyntaxNote(
                    this.getSourceReference(err.location.start.line, err.location.start.column, 
                                            err.location.start.offset, err.location.start.offset + 1),
                    NoteKind.ERROR,
                    "syntax",
                    err.message));
			}
			else {
                console.log(err.stack);
				throw err;
			}
		}
    }

    // TODO: figure out where this stuff should really go between here and the program creating
    // compiler intrinsics. Something will need to be done at the TranslationUnit level to ensure
    // the appropriate names are declared and in the right scopes, but that might just be a matter
    // of having library #includes actually implemented in a reasonable way.
    private createBuiltInGlobals() {
	    // if (Types.userTypeNames["ostream"]) {
        //     this.i_globalScope.addEntity(StaticEntity.instance({name:"cout", type:Types.OStream.instance()}));
        //     this.i_globalScope.addEntity(StaticEntity.instance({name:"cin", type:Types.IStream.instance()}));
        // }

        // // TODO NEW rework so that endlEntity doesn't have to be public (other parts of code look for it currently)
        // this.endlEntity = StaticEntity.instance({name:"endl", type:Types.Char.instance()});
        // this.endlEntity.defaultValue = 10; // 10 is ascii code for \n
        // this.i_globalScope.addEntity(this.endlEntity);


        // var cassert = MagicFunctionEntity.instance(MagicFunctionDefinition.instance(
        //     "assert",
        //     Types.Function.instance(Types.Void.instance(), [Types.Bool.instance()])
        // ));
        // this.i_globalScope.addEntity(cassert);

        // var pause = MagicFunctionEntity.instance(MagicFunctionDefinition.instance(
        //     "pause",
        //     Types.Function.instance(Types.Void.instance(), [])
        // ));
        // this.i_globalScope.addEntity(pause);


        // var pauseIf = MagicFunctionEntity.instance(MagicFunctionDefinition.instance(
        //     "pauseIf",
        //     Types.Function.instance(Types.Void.instance(), [Types.Bool.instance()])
        // ));
        // this.i_globalScope.addEntity(pauseIf);


        // this.i_globalScope.addEntity(MagicFunctionEntity.instance(
        //     MagicFunctionDefinition.instance("rand",
        //         Types.Function.instance(Types.Int.instance(), []))));

    }
    
    private compileTopLevelDeclarations(ast: TranslationUnitAST) {
        ast.declarations.forEach((declAST) => {
            let declsOrFuncDef = createDeclarationFromAST(declAST, this.context);
            if (Array.isArray(declsOrFuncDef)) {
                declsOrFuncDef.forEach(decl => {
                    asMutable(this.topLevelDeclarations).push(decl);
                });
            }
            else {
                asMutable(this.topLevelDeclarations).push(declsOrFuncDef);
            }
        });
    }

    public registerStringLiteral(literal: StringLiteralExpression) {
        asMutable(this.stringLiterals).push(literal);
    }

    public registerFunctionCall(call: FunctionCall) {
        asMutable(this.functionCalls).push(call);
    }

    public getNearestSourceReferenceForConstruct(construct: CPPConstruct) {
        while (!construct.ast && construct.parent) {
            construct = construct.parent;
        }
        if (!construct.ast) {
            return assertFalse("Can't find source reference for construct");
        }
        let src = construct.ast.source;
        return this.getSourceReference(src.line, src.column, src.start, src.end);
    }

    public getSourceReference(line: number, column: number, start: number, end: number) {
        return this.source.getSourceReference(line, column, start, end);
    }

    public addNote(note: Note) {
        this.notes.addNote(note);
        this.program.addNote(note);
    }
}


