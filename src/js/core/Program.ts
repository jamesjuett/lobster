import { Note, NoteHandler, NoteKind, SyntaxNote } from "./errors";
import { Mutable } from "../util/util";
import { Observable } from "../util/observe";
import { StaticEntity } from "./entities";



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

/**
 * @class
 * @extends NoteHandler
 */
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
 * Events:
 *  reset
 *  sourceFileAdded
 *  sourceFileRemoved
 *  translationUnitCreated
 *  translationUnitRemoved
 *  fullCompilationStarted
 *  fullCompilationFinished
 *  compilationStarted
 *  compilationFinished
 *  linkingStarted
 *  linkingFinished
 */
export class Program {
    
    public readonly observable = new Observable(this);

    public readonly notes = new NoteRecorder();

    private readonly _staticEntities: StaticEntity[] = [];
    public readonly staticEntities: readonly StaticEntity[] = this._staticEntities;

    public constructor() {
        
        this.i_isCompilationUpToDate = false;

        this.reset();
    }

    reset : function () {
        this.i_translationUnits = {};

        for (var fileName in this.i_sourceFiles) {
            this.stopListeningTo(this.i_sourceFiles[fileName]);
        }

        this.i_sourceFiles = {};

        this.staticEntities.clear();
        this.i_globalScope = NamespaceScope.instance("", null, this);
        this.i_functionCalls = [];

        this.i_includedSourceFiles = {};

        this.i_setCompilationUpToDate(true);
        this.send("reset");
    },

    addSourceFile : function(sourceFile) {
        assert(!this.i_sourceFiles[sourceFile.getName()]);
        this.i_sourceFiles[sourceFile.getName()] = sourceFile;
        this.listenTo(sourceFile);
        this.send("sourceFileAdded", sourceFile);
    },

    removeSourceFile : function(sourceFile) {
        if (typeof sourceFile !== "string"){
            sourceFile = sourceFile.getName();
        }
        if(this.i_sourceFiles[sourceFile]){
            delete this.i_sourceFiles[sourceFile];
        }

        this.stopListeningTo(sourceFile);

        // Also remove any associated translation unit (if it exists)
        this.removeTranslationUnit(sourceFile);
        this.send("sourceFileRemoved", sourceFile);
    },

    getSourceFile : function(name) {
        return this.i_sourceFiles[name];
    },

    getSourceFiles : function() {
        return this.i_sourceFiles;
    },

    createTranslationUnitForSourceFile : function(sourceFileName) {
        if (typeof sourceFileName !== "string"){
            sourceFileName = sourceFileName.getName();
        }
        assert(this.i_sourceFiles[sourceFileName]);
        assert(!this.i_translationUnits[sourceFileName]);

        var tu = TranslationUnit.instance(this, this.i_sourceFiles[sourceFileName]);
        this.i_translationUnits[tu.getName()] = tu;

        this.i_setCompilationUpToDate(false);

        this.send("translationUnitCreated", tu);
        return tu;
    },

    removeTranslationUnit : function(translationUnit) {
        if (typeof translationUnit !== "string"){
            translationUnit = translationUnit.getName();
        }
        if(this.i_translationUnits[translationUnit]){
            delete this.i_translationUnits[translationUnit];
        }

        this.i_setCompilationUpToDate(false);

        this.send("translationUnitRemoved", translationUnit);
    },

    getTranslationUnit : function(name) {
        return this.i_translationUnits[name];
    },

    getTranslationUnits : function() {
        return this.i_translationUnits;
    },

    addStaticEntity : function(ent){
        this.staticEntities.push(ent);
    },

    /**
     * Compiles all translation units that are part of this program and then links the program.
     */
    fullCompile : function() {
        this.send("fullCompilationStarted");
        this.compile();

        if (!this.hasSyntaxErrors()) {
            this.link();
        }


        this.i_setCompilationUpToDate(true);

        this.send("fullCompilationFinished");
    },

    /**
     * Compiles all translation units that are part of this program.
     */
    compile : function () {
        this.send("compilationStarted");
        this.clearNotes();
        this.i_functionCalls = [];
        this.i_includedSourceFiles = {};

        for(var name in this.i_translationUnits) {
            var tu = this.i_translationUnits[name];

            tu.fullCompile();
            mixin(this.i_includedSourceFiles, tu.getIncludedSourceFiles(), true);
            this.addNotes(tu.getNotes());

            if (this.hasSyntaxErrors()) {
                break;
            }
        }
        this.send("compilationFinished");
    },

    link : function() {
        this.send("linkingStarted");

        this.i_globalScope = NamespaceScope.instance("", null, this);
        this.staticEntities.clear();

        // Bring together stuff from all translation units
        // TODO NEW: Make reporting of linker errors more elegant
        var self = this;
        for(var name in this.i_translationUnits) {
            var tu = this.i_translationUnits[name];
            this.i_globalScope.merge(tu.getGlobalScope(), function(e) {
                if (isA(e, LinkerNote)) {
                    self.addNote(e);
                    console.log("Linker: " + e.getMessage());
                }
                else{
                    throw e;
                }
            });
        }

        this.i_defineIntrinsics();

        // Make sure all function calls have a definition
        var calls = this.getFunctionCalls();
        for(var i = 0; i < calls.length; ++i) {
            var note = calls[i].checkLinkingProblems();
            if (note) {
                this.addNote(note);
            }
        }


        //look for main
        try{
            this.i_main = this.i_globalScope.requiredLookup("main", {paramTypes: []});
        }
        catch(e){
            if (isA(e, SemanticExceptions.BadLookup)){
                this.addNote(e.annotation());
            }
            else{
                console.log(e.stack);
                throw e;
            }
        }

        this.send("linkingFinished");

        // else if (decl.name === "main") {
        //     this.semanticProblems.push(CPPError.declaration.prev_main(this, decl.name, otherFunc.decl));
        //     return null;
        // }
    },

    i_defineIntrinsics : function() {

    },

    getMainEntity : function() {
        return this.i_main;
    },

    getGlobalScope : function() {
        return this.i_globalScope;
    },

    getFunctionCalls : function(call) {
        return this.i_functionCalls;
    },

    registerFunctionCall : function(call) {
        this.i_functionCalls.push(call);
    },

    isCompilationUpToDate : function() {
        return this.i_isCompilationUpToDate;
    },

    i_setCompilationUpToDate : function(isUpToDate) {
        this.i_isCompilationUpToDate = isUpToDate;
        this.send("isCompilationUpToDate", isUpToDate);
    },

    _act : {
        textChanged : function(msg) {
            if (this.i_includedSourceFiles[msg.source.getName()]) {
                this.i_setCompilationUpToDate(false);
            }
        }
    }
});

export var SourceFile = Class.extend(Observable, {

    init : function(name, text) {
        this.i_name = name;
        this.setText(text);
    },

    getName : function() {
        return this.i_name;
    },

    setText : function(text) {
        this.i_text = text;
        this.send("textChanged");
    },

    getText : function() {
        return this.i_text;
    }

});

export class SourceReference {

    _name : "SourceReference",

    /**
     * Creates a wrapper to represent a reference to source code that has been included in another file.
     * @param {SourceFile} sourceFile
     * @param {Number} lineIncluded
     * @param {SourceReference} originalReference
     * @returns {SourceReference}
     */
    instanceIncluded : function(sourceFile, lineIncluded, originalReference) {
        var obj = this.instance(originalReference.sourceFile, originalReference.line, originalReference.column,
            originalReference.start, originalReference.end);
        obj.i_includes.pushAll(originalReference.i_includes);
        obj.i_includes.unshift({
            sourceFile: sourceFile,
            lineIncluded: lineIncluded
        });
        return obj;
    },

    /**
     * @param {SourceFile} sourceFile
     * @param line
     * @param column
     * @param start
     * @param end
     */
    init : function(sourceFile, line, column, start, end) {
        this.sourceFile = sourceFile;
        this.line = line;
        this.column = column;
        this.start = start;
        this.end = end;
        this.i_includes = [];
    },

    getIncludes : function() {
        return this.i_includes;
    },

    isIncluded : function() {
        return this.i_includes.length > 0;
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


/**
 * TranslationUnit
 *
 * Events:
 *   "parsed": after parsing is finished *successfully*
 *   "syntaxError": if a syntax error is encountered during parsing. data contains properties line, column, and message
 *   "compilationFinished": after compilation is finished
 */
export class TranslationUnit = Class.extend(Observable, NoteRecorder, {
    _name: "TranslationUnit",

    /**
     * An internal ADT used to make the code a bit more organized. TranslationUnit will delegate work here.
     */
    i_PreprocessedSource : Class.extend({
        _name: "PreprocessedSource",

        init : function(translationUnit, sourceFile, alreadyIncluded) {
            this.i_translationUnit = translationUnit;
            this.i_sourceFile = sourceFile;
            alreadyIncluded = alreadyIncluded || {};
            alreadyIncluded[this.i_sourceFile.getName()] = true;

            var codeStr = sourceFile.getText();

            codeStr = this.i_filterSourceCode(codeStr);

            this.i_includes = [];
            var currentIncludeOffset = 0;
            var currentIncludeLineNumber = 1;
            var originalIncludeLineNumber = 1;

            this.i_sourceFilesIncluded = {};
            this.i_sourceFilesIncluded[this.i_sourceFile.getName()] = true;

            // Find and replace #include lines. Will also populate i_includes array.
            // [^\S\n] is a character class for all whitespace other than newlines
            var self = this;
            this.i_sourceCode = codeStr.replace(/#include[^\S\n]+"(.*)"/g,
                function(includeLine, filename, offset, original) {


                    var mapping = {};

                    // Find the line number of this include by adding up the number of newline characters
                    // since the offset of the last match up to the current one. Add this to the line number.
                    for (var i = currentIncludeOffset; i < offset; ++i) {
                        if (original[i] === "\n") {
                            ++currentIncludeLineNumber;
                            ++originalIncludeLineNumber;
                        }
                    }
                    mapping.startLine = currentIncludeLineNumber;
                    mapping.startOffset = offset;

                    currentIncludeOffset = offset + includeLine.length;

                    // // extract the filename from the #include line match
                    // // [1] yields only the match for the part of the regex in parentheses
                    // var filename = includeLine.match(/"(.*)"/)[1];


                    // check for self inclusion
                    if (alreadyIncluded[filename]) {
                        self.i_translationUnit.addNote(CPPError.preprocess.recursiveInclude(
                            SourceReference.instance(sourceFile, currentIncludeLineNumber, 0, offset, currentIncludeOffset)));
                        return Array(includeLine.length + 1).join(" "); // replace with spaces
                    }

                    // Recursively preprocess the included file
                    var includedSourceFile = translationUnit.i_program.getSourceFile(filename);

                    var included = self._class.instance(translationUnit, includedSourceFile,
                        copyMixin(alreadyIncluded, {}));
                    mixin(self.i_sourceFilesIncluded, included.i_sourceFilesIncluded, true);


                    mapping.numLines = included.numLines;
                    mapping.endLine = mapping.startLine + included.numLines;

                    mapping.lineDelta = included.numLines - 1;
                    mapping.lengthDelta = included.length - includeLine.length;
                    currentIncludeLineNumber += included.numLines - 1; // -1 since one line from original was replaced
                    mapping.included = included;
                    mapping.lineIncluded = originalIncludeLineNumber;

                    self.i_includes.push(mapping);

                    return included.getText();
                }
            );

            // Count lines for the rest of the file after any #includes
            for (var i = currentIncludeOffset; i < codeStr.length; ++i) {
                if (codeStr[i] === "\n") {
                    ++currentIncludeLineNumber;
                }
            }

            this.numLines = currentIncludeLineNumber;
            this.length = this.i_sourceCode.length;
        },

        getText : function() {
            return this.i_sourceCode;
        },

        getIncludes : function() {
                return this.i_includes;
        },

        getSourceReference : function(line, column, start, end) {

            // Iterate through all includes and check if any would contain
            var offset = 0;
            var lineOffset = 1;
            for(var i = 0; i < this.i_includes.length; ++i) {
                var inc = this.i_includes[i];
                if (line < inc.startLine) {
                    return SourceReference.instance(this.i_sourceFile, line - lineOffset + 1, column, start && start - offset, end && end - offset);
                }
                else if (inc.startLine <= line && line < inc.endLine) {
                    return SourceReference.instanceIncluded(this.i_sourceFile, inc.lineIncluded,
                        inc.included.getSourceReference(line - inc.startLine + 1, column, start && start - inc.startOffset, end && end - inc.startOffset));
                }
                offset += inc.lengthDelta;
                lineOffset += inc.lineDelta;
            }

            // If this line wasn't part of any of the includes, just return a regular source reference to the original
            // source file associated with this translation unit
            return SourceReference.instance(this.i_sourceFile, line - lineOffset + 1, column, start && start - offset, end && end - offset);
        },

        i_filterSourceCode : function(codeStr) {

            codeStr = codeStr.replace("\r", "");

            if (codeStr.contains("#ifndef")){
                codeStr = codeStr.replace(/#ifndef.*/g, function(match){
                    return Array(match.length+1).join(" ");
                });
                // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
            }
            if (codeStr.contains("#define")){
                codeStr = codeStr.replace(/#define.*/g, function(match){
                    return Array(match.length+1).join(" ");
                });
                // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
            }
            if (codeStr.contains("#endif")){
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
            if (codeStr.contains("using namespace")){
                codeStr = codeStr.replace(/using namespace.*/g, function(match){
                    return Array(match.length+1).join(" ");
                });
                // TODO NEW why is this commented?
                // this.send("otherError", "When writing code in lobster, you don't need to include using directives (e.g. <span class='code'>using namespace std;</span>).");
            }
            if (codeStr.contains("using std::")){
                codeStr = codeStr.replace(/using std::.*/g, function(match){
                    return Array(match.length+1).join(" ");
                });
                // this.send("otherError", "Lobster doesn't support using declarations at the moment.");
            }
            return codeStr;
        }


    }),
    // *** end i_PreprocessedSource ***

    init: function(program, sourceFile){
        NoteRecorder.init.apply(this, arguments);

        this.i_originalSourceFile = sourceFile;

        this.i_program = program;

        this.i_globalScope = NamespaceScope.instance("", null, this);
        this.topLevelDeclarations = [];
        this.staticEntities = [];
        this.stringLiterals = [];
        this.i_functionCalls = [];

        this.i_main = false;


        return this;
    },

    getName : function() {
        return this.i_originalSourceFile.getName();
    },

    addStaticEntity : function(obj){
        this.staticEntities.push(obj);
    },

    addStringLiteral : function(lit) {
        this.stringLiterals.push(lit);
    },

    fullCompile : function() {
        this.send("tuFullCompilationStarted");
        // codeStr += "\n"; // TODO NEW why was this needed?
		try{


            this.clearNotes();

            this.i_preprocess();

            // This is kind of a hack to communicate with the PEG.js generated parsing code.
            // This both "resets" the user-defined type names that exist for each translation
            // unit (e.g. so that Class names declared in another translation unit aren't hanging
            // around), and also ensures "default" user-defined type names like ostream, etc. are
            // recognized as such. The copyMixin is important so that we don't modify the original
            // which will potentially be used by other translation units.
            Types.userTypeNames = copyMixin(Types.defaultUserTypeNames);

            var parsed = Lobster.cPlusPlusParser.parse(this.i_preprocessedSource.getText());

            this.send("parsed");

            this.i_compile(parsed);

		}
		catch(err){
			if (err.name == "SyntaxError"){
			    var note = SyntaxNote.instance(this.getSourceReference(err.location.start.line, err.location.start.column, err.location.start.offset, err.location.start.offset + 1), Note.TYPE_ERROR, "syntax", err.message);
				this.addNote(note);
			}
			else{
                this.send("unknownError");
                console.log(err.stack);
				throw err;
			}
		}
        this.send("tuFullCompilationFinished");
	},

    i_preprocess : function(codeStr) {

        this.i_preprocessedSource = this.i_PreprocessedSource.instance(this, this.i_originalSourceFile);

    },

    getIncludedSourceFiles : function() {
        if (!this.i_preprocessedSource) { return {}; }

        return this.i_preprocessedSource.i_sourceFilesIncluded;
    },

    getSourceReferenceForConstruct : function(construct) {
        assert(this.i_preprocessedSource, "Can't get source references until preprocessing has been done.");

        var trackedConstruct = findNearestTrackedConstruct(construct); // will be source if that was tracked
        var trackedCode = trackedConstruct.code;
        return this.i_preprocessedSource.getSourceReference(trackedCode.line, trackedCode.column, trackedCode.start, trackedCode.end);
    },

    getSourceReference : function(line, column, start, end) {
        return this.i_preprocessedSource.getSourceReference(line, column, start, end);
    },

	i_compile : function(ast){

        // Program.currentProgram = this;

        var self = this;
        //console.log("compiling");
		this.topLevelDeclarations.clear();
		this.i_globalScope = NamespaceScope.instance("", null, this);
        this.staticEntities.clear();
        this.stringLiterals.clear();
        this.i_functionCalls = [];

        // TODO NEW change
        this.send("clearAnnotations");

        this.i_createBuiltInGlobals();



        // TODO NEW the globalFunctionContext thing seems a bit hacky. why was this needed? (i.e. why can't it be null?)
        var globalFunctionContext = MagicFunctionDefinition.instance("globalFuncContext", Types.Function.instance(Types.Void.instance(), []));



        // First, compile ALL the declarations
        for(var i = 0; i < ast.length; ++i){
            var decl = Declaration.create(ast[i], {
                parent: null,
                scope : this.i_globalScope,
                translationUnit : this,
                func: globalFunctionContext
            });
            decl.tryCompileDeclaration();
            decl.tryCompileDefinition();
            this.topLevelDeclarations.push(decl);
            this.addNotes(decl.getNotes());
        }

        // Linking
        // TODO Just get rid of this??
        // this.i_calls.forEach(function(call){
        //     linkingProblems.pushAll(call.checkLinkingProblems());
        // });
        // this.i_semanticProblems.pushAll(linkingProblems);

        // TODO: move to Program level
        // Tail Recursion Analysis
        // for(var i = 0; i < this.topLevelDeclarations.length; ++i){
        //     decl = this.topLevelDeclarations[i];
        //     if (isA(decl, FunctionDefinition)){
        //         decl.tailRecursionAnalysis(annotatedCalls);
        //     }
        // }
	},

    i_createBuiltInGlobals : function() {
	    if (Types.userTypeNames["ostream"]) {
            this.i_globalScope.addEntity(StaticEntity.instance({name:"cout", type:Types.OStream.instance()}));
            this.i_globalScope.addEntity(StaticEntity.instance({name:"cin", type:Types.IStream.instance()}));
        }

        // TODO NEW rework so that endlEntity doesn't have to be public (other parts of code look for it currently)
        this.endlEntity = StaticEntity.instance({name:"endl", type:Types.Char.instance()});
        this.endlEntity.defaultValue = 10; // 10 is ascii code for \n
        this.i_globalScope.addEntity(this.endlEntity);


        var cassert = MagicFunctionEntity.instance(MagicFunctionDefinition.instance(
            "assert",
            Types.Function.instance(Types.Void.instance(), [Types.Bool.instance()])
        ));
        this.i_globalScope.addEntity(cassert);

        var pause = MagicFunctionEntity.instance(MagicFunctionDefinition.instance(
            "pause",
            Types.Function.instance(Types.Void.instance(), [])
        ));
        this.i_globalScope.addEntity(pause);


        var pauseIf = MagicFunctionEntity.instance(MagicFunctionDefinition.instance(
            "pauseIf",
            Types.Function.instance(Types.Void.instance(), [Types.Bool.instance()])
        ));
        this.i_globalScope.addEntity(pauseIf);


        this.i_globalScope.addEntity(MagicFunctionEntity.instance(
            MagicFunctionDefinition.instance("rand",
                Types.Function.instance(Types.Int.instance(), []))));



        // BELOW THIS LINE IS RANDOM 280 STUFF


        // for(var i = 0; i < Types.Rank.values.length; ++i){
        //     var enumLit = Types.Rank.values[i];
        //     var ent = StaticEntity.instance({name:enumLit, type:Types.Rank.instance()});
        //     ent.defaultValue = Types.Rank.valueMap[enumLit];
        //     this.i_globalScope.addEntity(ent);
        // }
        //
        // for(var i = 0; i < Types.Suit.values.length; ++i){
        //     var enumLit = Types.Suit.values[i];
        //     var ent = StaticEntity.instance({name:enumLit, type:Types.Suit.instance()});
        //     ent.defaultValue = Types.Suit.valueMap[enumLit];
        //     this.i_globalScope.addEntity(ent);
        // }
        //
        // var make_face = FunctionEntity.instance(MagicFunctionDefinition.instance(
        //     "make_face",
        //     Types.Function.instance(Types.Void.instance(), [Types.Pointer.instance(Types.Int.instance())])
        // ));
        // this.i_globalScope.addEntity(make_face);
        //
        //
        //
        // var list_make_empty = FunctionEntity.instance(MagicFunctionDefinition.instance("list_make", Types.Function.instance(Types.List_t.instance(), [])));
        // var list_make = FunctionEntity.instance(MagicFunctionDefinition.instance("list_make", Types.Function.instance(Types.List_t.instance(), [Types.Int.instance(), Types.List_t.instance()])));
        // var list_isEmpty = FunctionEntity.instance(MagicFunctionDefinition.instance("list_isEmpty", Types.Function.instance(Types.Bool.instance(), [Types.List_t.instance()])));
        // var list_first = FunctionEntity.instance(MagicFunctionDefinition.instance("list_first", Types.Function.instance(Types.Int.instance(), [Types.List_t.instance()])));
        // var list_rest = FunctionEntity.instance(MagicFunctionDefinition.instance("list_rest", Types.Function.instance(Types.List_t.instance(), [Types.List_t.instance()])));
        // var list_print = FunctionEntity.instance(MagicFunctionDefinition.instance("list_print", Types.Function.instance(Types.Void.instance(), [Types.List_t.instance()])));
        // var list_magic_reverse = FunctionEntity.instance(MagicFunctionDefinition.instance("list_magic_reverse", Types.Function.instance(Types.List_t.instance(), [Types.List_t.instance()])));
        // var list_magic_append = FunctionEntity.instance(MagicFunctionDefinition.instance("list_magic_append", Types.Function.instance(Types.List_t.instance(), [Types.List_t.instance(), Types.List_t.instance()])));
        //
        // this.i_globalScope.addEntity(list_make_empty);
        // this.i_globalScope.addEntity(list_make);
        // this.i_globalScope.addEntity(list_isEmpty);
        // this.i_globalScope.addEntity(list_first);
        // this.i_globalScope.addEntity(list_rest);
        // this.i_globalScope.addEntity(list_print);
        // this.i_globalScope.addEntity(list_magic_reverse);
        // this.i_globalScope.addEntity(list_magic_append);
        //
        //
        //
        // var emptyList = StaticEntity.instance({name:"EMPTY", type:Types.List_t.instance()});
        // emptyList.defaultValue = [];
        // this.i_globalScope.addEntity(emptyList);
        // this.addStaticEntity(emptyList);
        //
        //
        // var tree_make_empty = FunctionEntity.instance(MagicFunctionDefinition.instance("tree_make", Types.Function.instance(Types.Tree_t.instance(), [])));
        // var tree_make = FunctionEntity.instance(MagicFunctionDefinition.instance("tree_make", Types.Function.instance(Types.Tree_t.instance(), [Types.Int.instance(), Types.Tree_t.instance(), Types.Tree_t.instance()])));
        // var tree_isEmpty = FunctionEntity.instance(MagicFunctionDefinition.instance("tree_isEmpty", Types.Function.instance(Types.Bool.instance(), [Types.Tree_t.instance()])));
        // var tree_elt = FunctionEntity.instance(MagicFunctionDefinition.instance("tree_elt", Types.Function.instance(Types.Int.instance(), [Types.Tree_t.instance()])));
        // var tree_left = FunctionEntity.instance(MagicFunctionDefinition.instance("tree_left", Types.Function.instance(Types.Tree_t.instance(), [Types.Tree_t.instance()])));
        // var tree_right = FunctionEntity.instance(MagicFunctionDefinition.instance("tree_right", Types.Function.instance(Types.Tree_t.instance(), [Types.Tree_t.instance()])));
        // var tree_print = FunctionEntity.instance(MagicFunctionDefinition.instance("tree_print", Types.Function.instance(Types.Void.instance(), [Types.Tree_t.instance()])));
        //
        // this.i_globalScope.addEntity(tree_make_empty);
        // this.i_globalScope.addEntity(tree_make);
        // this.i_globalScope.addEntity(tree_isEmpty);
        // this.i_globalScope.addEntity(tree_elt);
        // this.i_globalScope.addEntity(tree_left);
        // this.i_globalScope.addEntity(tree_right);
        // this.i_globalScope.addEntity(tree_print);
    },

    getGlobalScope : function() {
	    return this.i_globalScope;
    },

    getFunctionCalls : function(call) {
	    return this.i_functionCalls;
    },

    registerFunctionCall : function(call) {
	    this.i_functionCalls.push(call);
	    this.i_program.registerFunctionCall(call);
    }
}
