import { Note, NoteHandler, NoteKind, SyntaxNote, CPPError, LinkerNote } from "./errors";
import { Mutable, asMutable } from "../util/util";
import { Observable } from "../util/observe";
import { StaticEntity, NamespaceScope, StringLiteralEntity, FunctionEntity, DeclaredEntity, LinkedEntity } from "./entities";
import { CPPConstruct, ASTNode, ConstructContext } from "./constructs";
import { SimpleDeclaration, FunctionDefinition, DeclarationASTNode, createDeclarationFromAST, Declaration, GlobalObjectDefinition, selectOverloadedDefinition, LinkedDefinition, CompiledFunctionDefinition, CompiledGlobalObjectDefinition } from "./declarations";
import { FunctionCall } from "./functions";
import { FunctionType } from "./types";
import {SyntaxError, parse as cpp_parse} from "../parse/cpp_parser";



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
}


/**
 *
 * The program also needs to know about all source files involved so that #include preprocessor
 * directives can be processed.
 *
 */
export class Program {
    
    // public readonly observable = new Observable(this);
    
    public readonly isCompilationUpToDate: boolean = true;

    public readonly translationUnits : { [index: string]: TranslationUnit } = {};
    public readonly originalSourceFiles : { [index: string]: SourceFile } = {};
    public readonly includedSourceFiles : { [index: string]: SourceFile } = {};
    
    public readonly globalObjects: readonly GlobalObjectDefinition[] = [];
    
    private readonly functionCalls: readonly FunctionCall[] = [];
    
    public readonly definitions: {
        [index: string] : LinkedDefinition
    } = {};

    public readonly linkedEntities: readonly LinkedEntity[] = [];

    public readonly notes = new NoteRecorder();

    public readonly mainFunction?: FunctionDefinition;


    public constructor(translationUnits: readonly TranslationUnit[]) {
        translationUnits.forEach((tu) => {this.translationUnits[tu.name] = tu;});

        this.fullCompile();
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

    /**
     * Links compiled translation units together.
     */
    private fullCompile() {
        this.compilationProper();

        if (!this.notes.hasSyntaxErrors) {
            this.link();
        }

        (<Mutable<this>>this).isCompilationUpToDate = true;
    }

    /**
     * Presumes translation units are already compiled (not necessarily successfully).
     */
    private compilationProper() {
        // this.observable.send("compilationStarted");

        for(let tuName in this.translationUnits) {
            let tu = this.translationUnits[tuName];

            this.originalSourceFiles[tu.source.primarySourceFile.name] = tu.source.primarySourceFile;
            Object.assign(this.includedSourceFiles, tu.source.includedSourceFiles);
            this.notes.addNotes(tu.notes.allNotes);

            // TODO: why was this here?
            // if (this.notes.hasSyntaxErrors) {
            //     break;
            // }
        }
        // this.observable.send("compilationFinished");
    }

    private link() {
        // this.send("linkingStarted");

        this.defineIntrinsics();

        // Provide definitions to each linked entity based on qualified name.
        // Note that the definition provided might not match at all or might
        // be undefined if there was no match for the qualified name. The entities
        // will take care of adding the appropriate linker errors in these cases.
        this.linkedEntities.forEach(le => 
            le.link(this.definitions[le.qualifiedName])
        );

        let main = this.definitions["::main"];
        if (main instanceof FunctionDefinition) {
            (<Mutable<this>>this).mainFunction = main;
        }
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
        // TODO
    }

    public registerLinkedEntity(entity: LinkedEntity) {
        asMutable(this.linkedEntities).push(entity);
    }

    public registerGlobalObjectDefinition(qualifiedName: string, def: GlobalObjectDefinition) {
        if (!this.definitions[qualifiedName]) {
            this.definitions[qualifiedName] = def;
            asMutable(this.globalObjects).push(def);
        }
        else {
            // One definition rule violation
            this.notes.addNote(CPPError.link.multiple_def(def, qualifiedName));
        }
    }

    public registerFunctionDefinition(qualifiedName: string, def: FunctionDefinition) {
        let prevDef = this.definitions[qualifiedName];
        if (!prevDef) {
            this.definitions[qualifiedName] = [def];
        }
        else if (!Array.isArray(prevDef)) {
            // Previous definition that isn't a function overload group
            this.notes.addNote(CPPError.link.multiple_def(def, qualifiedName));
        }
        else {
            // Already some definitions for functions with this same name. Check if there's
            // a conflicting overload that violates ODR
            let conflictingDef = selectOverloadedDefinition(prevDef, def.declaration.type);
            if (conflictingDef) {
                this.notes.addNote(CPPError.link.multiple_def(def, qualifiedName));
            }
            else {
                prevDef.push(def);
            }
        }
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
    readonly mainFunction: CompiledFunctionDefinition;
    readonly globalObjects: readonly CompiledGlobalObjectDefinition[];
}

export class SourceFile {

    public readonly observable = new Observable(this);

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
    startLine: number;
    startOffset: number;
    numLines: number;
    endLine: number;
    lineDelta: number;
    lengthDelta: number;
    included: PreprocessedSource;
    lineIncluded: number;
}

class PreprocessedSource {

    public readonly primarySourceFile: SourceFile;
    public readonly name: string;
    public readonly availableToInclude: {[index: string]: SourceFile};

    public readonly notes = new NoteRecorder();

    private readonly _includes: IncludeMapping[] = [];
    public readonly includes: readonly IncludeMapping[] = this._includes;

    public readonly includedSourceFiles: {[index: string]: SourceFile} = {};

    public readonly preprocessedText: string;
    public readonly numLines: number;
    public readonly length: number;

    public constructor(sourceFile: SourceFile, availableToInclude: {[index: string]: SourceFile}, alreadyIncluded: {[index: string]: boolean} = {}) {
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

                let mapping: Partial<IncludeMapping> = {};

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
                var includedSourceFile = this.availableToInclude[filename];
                //TODO: what happens if the file doesn't exist?

                var included = new PreprocessedSource(includedSourceFile, this.availableToInclude,
                    Object.assign({}, alreadyIncluded));

                Object.assign(this.includedSourceFiles, included.includedSourceFiles);


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
    
    // public readonly observable = new Observable(this);
    public readonly notes = new NoteRecorder();

    public readonly name: string;
    public readonly source: PreprocessedSource;
    public readonly program: Program;

    public readonly globalScope: NamespaceScope;
    
    public readonly topLevelDeclarations: readonly Declaration[] = [];
    public readonly staticEntities: readonly StaticEntity[] = [];
    public readonly stringLiterals: readonly StringLiteralEntity[] = [];
    public readonly functionCalls: readonly FunctionCall[] = [];

    public readonly parsedAST?: TranslationUnitAST;

    public readonly globalContext: ConstructContext;

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
        this.globalScope = new NamespaceScope(preprocessedSource.primarySourceFile.name + "_GLOBAL_SCOPE");
        this.name = preprocessedSource.name;
        this.globalContext = {
            translationUnit: this,
            contextualScope: this.globalScope
        };

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
				this.notes.addNote(new SyntaxNote(
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
            let declsOrFuncDef = createDeclarationFromAST(declAST, this.globalContext);
            if (Array.isArray(declsOrFuncDef)) {
                declsOrFuncDef.forEach(decl => asMutable(this.topLevelDeclarations).push(decl));
            }
            else {
                asMutable(this.topLevelDeclarations).push(declsOrFuncDef);
            }
        });
    }

    public addStringLiteral(literal: StringLiteralEntity) {
        asMutable(this.stringLiterals).push(literal);
    }

    public registerFunctionCall(call: FunctionCall) {
        asMutable(this.functionCalls).push(call);
    }

    public getNearestSourceReferenceForConstruct(construct: CPPConstruct) {
        while (!construct.ast) {
            
        }
        var trackedConstruct = findNearestTrackedConstruct(construct); // will be source if that was tracked
        var trackedCode = trackedConstruct.code;
        return this.getSourceReference(trackedCode.line, trackedCode.column, trackedCode.start, trackedCode.end);
    }

    public getSourceReference(line: number, column: number, start: number, end: number) {
        return this.source.getSourceReference(line, column, start, end);
    }
}


