/**
 * @author James
 */

var Lobster = Lobster || {};
Lobster.CPP = Lobster.CPP || {};

var NoteHandler = Class.extend({
    _name : "NoteHandler",

    /**
     *
     * @param {Note} note
     */
    addNote : function() {}


});

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
var NoteRecorder = NoteHandler.extend({
    _name : "NoteRecorder",

    init : function() {
        // this.i_preprocessorNotes = [];
        // this.i_compilerNotes = [];
        // this.i_linkerNotes = [];
        this.i_allNotes = [];
        this.i_hasErrors = false;
        this.i_hasSyntaxErrors = false;
        this.i_hasWarnings = false;
    },

    /**
     *
     * @param {Note} note
     */
    addNote : function(note) {
        this.i_allNotes.push(note);
        if (note.getType() === Note.TYPE_ERROR) {
            this.i_hasErrors = true;
            if (isA(note, SyntaxNote)) {
                this.i_hasSyntaxErrors = true;
            }
        }
        else if (note.getType() === Note.TYPE_WARNING) {
            this.i_hasWarnings = true;
        }
        // this.i_preprocessorNotes.push(note);
    },

    addNotes : function(notes) {
        for(var i = 0; i < notes.length; ++i) {
            this.addNote(notes[i]);
        }
    },

    // /**
    //  * @returns {PreprocessorNote[]}
    //  */
    // getPreprocessorNotes : function() {
    //     return this.i_preprocessorNotes;
    // },
    //
    //
    // /**
    //  * @returns {CompilerNote[]}
    //  */
    // getCompilerNotes : function() {
    //     return this.i_compilerNotes;
    // },
    //
    //
    // /**
    //  * @returns {LinkerNote[]}
    //  */
    // getLinkerNotes : function() {
    //     return this.i_linkerNotes;
    // },

    /**
     * @returns {LinkerNote[]}
     */
    getNotes : function() {
        return this.i_allNotes;
    },

    clearNotes : function() {
        this.i_allNotes = [];
        this.i_hasErrors = false;
        this.i_hasSyntaxErrors = false;
        this.i_hasWarnings = false;
        // this.i_preprocessorNotes = [];
        // this.i_compilerNotes = [];
        // this.i_linkerNotes = [];
    },
    hasErrors : function() {
        return this.i_hasErrors;
    },
    hasSyntaxErrors : function() {
        return this.i_hasSyntaxErrors;
    },
    hasWarnings : function() {
        return this.i_hasWarnings;
    }
});

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
var Program = Lobster.CPP.Program = Class.extend(Observable, Observer, NoteRecorder, {
    _name : "Program",

    init : function () {
        NoteRecorder.init.apply(this, arguments);

        this.staticEntities = [];
        this.i_isCompilationUpToDate = false;

        this.reset();
    },

    reset : function () {
        this.i_translationUnits = {};

        for (var fileName in this.i_sourceFiles) {
            this.stopListeningTo(this.i_sourceFiles[fileName]);
        }

        this.i_sourceFiles = {};

        this.staticEntities.length = 0;
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

    addStaticEntity : function(obj){
        this.staticEntities.push(obj);
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

var SourceFile = Class.extend(Observable, {

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

var SourceReference = Class.extend({

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

});


/**
 * TranslationUnit
 *
 * Events:
 *   "parsed": after parsing is finished *successfully*
 *   "syntaxError": if a syntax error is encountered during parsing. data contains properties line, column, and message
 *   "compilationFinished": after compilation is finished
 */
var TranslationUnit = Class.extend(Observable, NoteRecorder, {
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
        this.i_functionCalls = [];

        // TODO NEW change
        this.send("clearAnnotations");

        this.i_createBuiltInGlobals();



        // TODO NEW the globalFunctionContext thing seems a bit hacky. why was this needed? (i.e. why can't it be null?)
        var globalFunctionContext = MagicFunctionDefinition.instance("globalFuncContext", Types.Function.instance(Types.Void.instance(), []));

        // Add in special includes
        // For now, just add strang
        var initialStrangCapacity = 8;
        var strangAst = {
            construct_type : "class_declaration",
            library_id : "strang",
            head : {
                bases : null,
                key : "class",
                name : {
                    identifier : "strang"
                }
            },
            member_specs : [
                {
                    access : "public",
                    members : [
                        Lobster.cPlusPlusParser.parse("size_t _size;", {startRule : "member_declaration"}),
                        Lobster.cPlusPlusParser.parse("size_t _capacity;", {startRule : "member_declaration"}),
                        Lobster.cPlusPlusParser.parse("char * data_ptr;", {startRule : "member_declaration"}),

                        // Default ctor
                        {
                            construct_type : "constructor_definition",
                            args : [],
                            initializer : null,
                            name : { identifier : "strang"},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    this.blockScope.requiredLookup("_capacity").lookup(sim, inst).writeValue(initialStrangCapacity);
                                    this.blockScope.requiredLookup("_size").lookup(sim, inst).writeValue(0);


                                    var arrType = Types.Array.instance(Types.Char.instance(), initialStrangCapacity);
                                    var obj = DynamicObject.instance(arrType);
                                    sim.memory.heap.allocateNewObject(obj);

                                    var addr = Value.instance(obj.address, Types.ArrayPointer.instance(obj));
                                    this.blockScope.requiredLookup("data_ptr").lookup(sim, inst).writeValue(addr);
                                }
                            }, null)
                        },

                        // Copy ctor
                        {
                            construct_type : "constructor_definition",
                            args : Lobster.cPlusPlusParser.parse("const strang &other", {startRule : "argument_declaration_list"}),
                            initializer : null,
                            name : { identifier : "strang"},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    var rec = ReceiverEntity.instance(this.containingFunction().receiverType).lookup(sim, inst);
                                    var other = this.blockScope.requiredLookup("other").lookup(sim, inst);
                                    rec.writeValue(other.getValue());
                                }
                            }, null)
                        },

                        // Substring ctor (with 3rd argument provided)
                        {
                            construct_type : "constructor_definition",
                            args : Lobster.cPlusPlusParser.parse("const strang &other, size_t pos, size_t len", {startRule : "argument_declaration_list"}),
                            initializer : null,
                            name : { identifier : "strang"},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    var str = this.blockScope.requiredLookup("data").lookup(sim, inst);
                                    var other = this.blockScope.requiredLookup("other").lookup(sim, inst);
                                    var pos = this.blockScope.requiredLookup("pos").lookup(sim, inst).rawValue();
                                    var len = this.blockScope.requiredLookup("len").lookup(sim, inst).rawValue();

                                    if (pos > other.rawValue()[0].length) {
                                        sim.exception("The start position you requested in this string constructor is greater than the length of the other string.");
                                    }
                                    else {
                                        str.writeValue(other.rawValue()[0].substring(pos, pos + len));
                                    }

                                }
                            }, null)
                        },

                        // Substring ctor (without 3rd argument, so use default)
                        {
                            construct_type : "constructor_definition",
                            args : Lobster.cPlusPlusParser.parse("const strang &other, size_t pos", {startRule : "argument_declaration_list"}),
                            initializer : null,
                            name : { identifier : "strang"},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    var str = this.blockScope.requiredLookup("data").lookup(sim, inst);
                                    var other = this.blockScope.requiredLookup("other").lookup(sim, inst);
                                    var pos = this.blockScope.requiredLookup("pos").lookup(sim, inst).rawValue();

                                    if (pos > other.rawValue()[0].length) {
                                        sim.exception("The start position you requested in this string constructor is greater than the length of the other string.");
                                    }
                                    else {
                                        str.writeValue(other.rawValue()[0].substring(pos));
                                    }
                                }
                            }, null)
                        },


                        // ctor from cstring
                        {
                            construct_type : "constructor_definition",
                            args : Lobster.cPlusPlusParser.parse("const char *cstr", {startRule : "argument_declaration_list"}),
                            initializer : null,
                            name : { identifier : "strang"},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    var str = this.blockScope.requiredLookup("data").lookup(sim, inst);
                                    var ptrValue = this.blockScope.requiredLookup("cstr").lookup(sim, inst).getValue();



                                    var text = "";
                                    var c = sim.memory.getObject(ptrValue).rawValue();
                                    while (ptrValue.type.isValueDereferenceable(ptrValue.rawValue()) && !Types.Char.isNullChar(c)) {
                                        text += Types.Char.valueToOstreamString(c);
                                        ptrValue.setRawValue(ptrValue.rawValue() + ptrValue.type.ptrTo.size);
                                        c = sim.memory.getObject(ptrValue).rawValue();
                                    }

                                    if (!ptrValue.type.isValueDereferenceable(ptrValue.rawValue())) {
                                        // We stopped previously because the pointer was no longer safely dereferenceable, so
                                        // now we'll go ahead and let the pointer keep going, but stop it after a while to prevent
                                        // an infinite loop.
                                        var count = 0;
                                        var limit = 100;
                                        while (count < limit && !Types.Char.isNullChar(c)) {
                                            text += Types.Char.valueToOstreamString(c);
                                            ptrValue.setRawValue(ptrValue.rawValue() + ptrValue.type.ptrTo.size);
                                            c = sim.memory.getObject(ptrValue).rawValue();
                                            ++count;
                                        }

                                        if (!isA(ptrValue.type, Types.ArrayPointer)) {
                                            if (count === limit) {
                                                sim.undefinedBehavior("This string constructor expects the char* you give it to be pointing into an array, otherwise you get undefined behavior with the pointer running off through random memory. I let it go for a while, but stopped it after copying " + limit + " junk values.");
                                            }
                                            else if (count > 0) {
                                                sim.undefinedBehavior("This string constructor expects the char* you give it to be pointing into an array, otherwise you get undefined behavior with the pointer running off through random memory. It looks like it happened to hit a null byte in memory and stopped " + count + " characters past the end of the array.");
                                            }
                                            else {
                                                sim.undefinedBehavior("This string constructor expects the char* you give it to be pointing into an array, otherwise you get undefined behavior with the pointer running off through random memory. Somehow you got lucky and the first random thing it hit was a null byte, which stopped it. Don't count on this.");
                                            }
                                        }
                                        else {
                                            if (count === limit) {
                                                sim.undefinedBehavior("This string constructor was trying to read from an array through the char* you gave it, but it ran off the end of the array before finding a null character! I let it run through memory for a while, but stopped it after copying " + limit + " junk values.");
                                            }
                                            else if (count > 0) {
                                                sim.undefinedBehavior("This string constructor was trying to read from an array through the char* you gave it, but it ran off the end of the array before finding a null character! It looks like it happened to hit a null byte in memory and stopped " + count + " characters past the end of the array.");
                                            }
                                            else {
                                                sim.undefinedBehavior("This string constructor was trying to read from an array through the char* you gave it, but it ran off the end of the array before finding a null character! Somehow you got lucky and the first random thing it hit was a null byte, which stopped it. Don't count on this.");
                                            }
                                        }
                                    }
                                    else {
                                        if (!isA(ptrValue.type, Types.ArrayPointer)) {
                                            sim.undefinedBehavior("This string constructor expects the char* you give it to be pointing into an array. That doesn't appear to be the case here, which can lead to undefined behavior.");
                                        }
                                    }

                                    str.writeValue(text);
                                }
                            }, null)
                        },

                        // ctor from cstring with n
                        {
                            construct_type : "constructor_definition",
                            args : Lobster.cPlusPlusParser.parse("const char *cstr, size_t n", {startRule : "argument_declaration_list"}),
                            initializer : null,
                            name : { identifier : "strang"},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    var str = this.blockScope.requiredLookup("data").lookup(sim, inst);
                                    var ptrValue = this.blockScope.requiredLookup("cstr").lookup(sim, inst).getValue();
                                    var n = this.blockScope.requiredLookup("n").lookup(sim, inst).rawValue();



                                    var text = "";
                                    var c = sim.memory.getObject(ptrValue).rawValue();
                                    var copiedInvalidChar = false;
                                    while (n > 0) {
                                        text += Types.Char.valueToOstreamString(c);
                                        if (!copiedInvalidChar && !ptrValue.type.isValueDereferenceable(ptrValue.rawValue())) {
                                            copiedInvalidChar = true;
                                        }
                                        ptrValue.setRawValue(ptrValue.rawValue() + ptrValue.type.ptrTo.size);
                                        c = sim.memory.getObject(ptrValue).rawValue();
                                        --n;
                                    }

                                    if (copiedInvalidChar) {
                                        if (!isA(ptrValue.type, Types.ArrayPointer)) {
                                            sim.undefinedBehavior("You passed a pointer to a single character (rather than an array) to this string constructor, but also asked for more than one char to be copied, which means some memory junk was used to initialize the string.");
                                        }
                                        else{
                                            sim.undefinedBehavior("You asked for more characters to be copied than were in the original source array, which means some memory junk was used to initialize the string.");
                                        }
                                    }

                                    str.writeValue(text);
                                }
                            }, null)
                        },

                        // fill ctor
                        {
                            construct_type : "constructor_definition",
                            args : Lobster.cPlusPlusParser.parse("size_t n, char c", {startRule : "argument_declaration_list"}),
                            initializer : null,
                            name : { identifier : "strang"},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    var str = this.blockScope.requiredLookup("data").lookup(sim, inst);
                                    var n = this.blockScope.requiredLookup("n").lookup(sim, inst);
                                    var c = this.blockScope.requiredLookup("c").lookup(sim, inst);

                                    str.writeValue(String.fromCharCode(c.rawValue()).repeat(n.rawValue()));
                                }
                            }, null)
                        },

                        // destructor
                        {
                            construct_type : "destructor_definition",
                            name : {identifier: "~strang"},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {

                                }
                            }, null)
                        },

                        // Copy assignment operator
                        {
                            construct_type : "function_definition",
                            declarator : Lobster.cPlusPlusParser.parse("&operator=(const strang &rhs)", {startRule : "declarator"}),
                            specs : {storageSpecs : [], typeSpecs : ["strang"]},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    var rec = ReceiverEntity.instance(this.containingFunction().receiverType).lookup(sim, inst);
                                    var other = this.blockScope.requiredLookup("rhs").lookup(sim, inst);
                                    rec.writeValue(other.getValue());

                                    var retType = this.containingFunction().type.returnType;
                                    var re = ReturnEntity.instance(retType);
                                    re.lookup(sim, inst).bindTo(rec);
                                    re.lookup(sim, inst).initialized();
                                }
                            }, null)
                        },

                        // cstring assignment operator
                        {
                            construct_type : "function_definition",
                            declarator : Lobster.cPlusPlusParser.parse("&operator=(const char *cstr)", {startRule : "declarator"}),
                            specs : {storageSpecs : [], typeSpecs : ["strang"]},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    // TODO: this is almost all a duplicate of the cstring constructor code (except for the return at the end)
                                    var str = this.blockScope.requiredLookup("data").lookup(sim, inst);
                                    var ptrValue = this.blockScope.requiredLookup("cstr").lookup(sim, inst).getValue();



                                    var text = "";
                                    var c = sim.memory.getObject(ptrValue).rawValue();
                                    while (ptrValue.type.isValueDereferenceable(ptrValue.rawValue()) && !Types.Char.isNullChar(c)) {
                                        text += Types.Char.valueToOstreamString(c);
                                        ptrValue.setRawValue(ptrValue.rawValue() + ptrValue.type.ptrTo.size);
                                        c = sim.memory.getObject(ptrValue).rawValue();
                                    }

                                    if (!ptrValue.type.isValueDereferenceable(ptrValue.rawValue())) {
                                        // We stopped previously because the pointer was no longer safely dereferenceable, so
                                        // now we'll go ahead and let the pointer keep going, but stop it after a while to prevent
                                        // an infinite loop.
                                        var count = 0;
                                        var limit = 100;
                                        while (count < limit && !Types.Char.isNullChar(c)) {
                                            text += Types.Char.valueToOstreamString(c);
                                            ptrValue.setRawValue(ptrValue.rawValue() + ptrValue.type.ptrTo.size);
                                            c = sim.memory.getObject(ptrValue).rawValue();
                                            ++count;
                                        }

                                        if (!isA(ptrValue.type, Types.ArrayPointer)) {
                                            if (count === limit) {
                                                sim.undefinedBehavior("This string constructor expects the char* you give it to be pointing into an array, otherwise you get undefined behavior with the pointer running off through random memory. I let it go for a while, but stopped it after copying " + limit + " junk values.");
                                            }
                                            else if (count > 0) {
                                                sim.undefinedBehavior("This string constructor expects the char* you give it to be pointing into an array, otherwise you get undefined behavior with the pointer running off through random memory. It looks like it happened to hit a null byte in memory and stopped " + count + " characters past the end of the array.");
                                            }
                                            else {
                                                sim.undefinedBehavior("This string constructor expects the char* you give it to be pointing into an array, otherwise you get undefined behavior with the pointer running off through random memory. Somehow you got lucky and the first random thing it hit was a null byte, which stopped it. Don't count on this.");
                                            }
                                        }
                                        else {
                                            if (count === limit) {
                                                sim.undefinedBehavior("This string constructor was trying to read from an array through the char* you gave it, but it ran off the end of the array before finding a null character! I let it run through memory for a while, but stopped it after copying " + limit + " junk values.");
                                            }
                                            else if (count > 0) {
                                                sim.undefinedBehavior("This string constructor was trying to read from an array through the char* you gave it, but it ran off the end of the array before finding a null character! It looks like it happened to hit a null byte in memory and stopped " + count + " characters past the end of the array.");
                                            }
                                            else {
                                                sim.undefinedBehavior("This string constructor was trying to read from an array through the char* you gave it, but it ran off the end of the array before finding a null character! Somehow you got lucky and the first random thing it hit was a null byte, which stopped it. Don't count on this.");
                                            }
                                        }
                                    }
                                    else {
                                        if (!isA(ptrValue.type, Types.ArrayPointer)) {
                                            sim.undefinedBehavior("This string constructor expects the char* you give it to be pointing into an array. That doesn't appear to be the case here, which can lead to undefined behavior.");
                                        }
                                    }

                                    str.writeValue(text);

                                    var rec = ReceiverEntity.instance(this.containingFunction().receiverType).lookup(sim, inst);
                                    var re = ReturnEntity.instance(this.containingFunction().type.returnType);
                                    re.lookup(sim, inst).bindTo(rec);
                                    re.lookup(sim, inst).initialized();
                                }
                            }, null)
                        },

                        // single char assignment operator
                        {
                            construct_type : "function_definition",
                            declarator : Lobster.cPlusPlusParser.parse("&operator=(char c)", {startRule : "declarator"}),
                            specs : {storageSpecs : [], typeSpecs : ["strang"]},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    var str = this.blockScope.requiredLookup("data").lookup(sim, inst);
                                    var c = this.blockScope.requiredLookup("c").lookup(sim, inst);

                                    str.writeValue(String.fromCharCode(c.rawValue()));

                                    var rec = ReceiverEntity.instance(this.containingFunction().receiverType).lookup(sim, inst);
                                    var re = ReturnEntity.instance(this.containingFunction().type.returnType);
                                    re.lookup(sim, inst).bindTo(rec);
                                    re.lookup(sim, inst).initialized();
                                }
                            }, null)
                        },

                        // Iterator functions - unsupported
                        mixin(Lobster.cPlusPlusParser.parse("void begin();", {startRule: "member_declaration"}),
                            {library_unsupported : true}),
                        mixin(Lobster.cPlusPlusParser.parse("void end();", {startRule: "member_declaration"}),
                            {library_unsupported : true}),
                        mixin(Lobster.cPlusPlusParser.parse("void rbegin();", {startRule: "member_declaration"}),
                            {library_unsupported : true}),
                        mixin(Lobster.cPlusPlusParser.parse("void rend();", {startRule: "member_declaration"}),
                            {library_unsupported : true}),
                        mixin(Lobster.cPlusPlusParser.parse("void cbegin() const;", {startRule: "member_declaration"}),
                            {library_unsupported : true}),
                        mixin(Lobster.cPlusPlusParser.parse("void cend() const;", {startRule: "member_declaration"}),
                            {library_unsupported : true}),
                        mixin(Lobster.cPlusPlusParser.parse("void crbegin() const;", {startRule: "member_declaration"}),
                            {library_unsupported : true}),
                        mixin(Lobster.cPlusPlusParser.parse("void crend() const;", {startRule: "member_declaration"}),
                            {library_unsupported : true}),

                        // function size()
                        {
                            construct_type : "function_definition",
                            declarator : Lobster.cPlusPlusParser.parse("size() const", {startRule : "declarator"}),
                            specs : {storageSpecs : [], typeSpecs : ["size_t"]},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    var str = this.blockScope.requiredLookup("data").lookup(sim, inst);
                                    var retType = this.containingFunction().type.returnType;
                                    var re = ReturnEntity.instance(retType);
                                    re.lookup(sim, inst).writeValue(str.rawValue().length);
                                    re.lookup(sim, inst).initialized();
                                }
                            }, null)
                        },

                        // function length()
                        {
                            construct_type : "function_definition",
                            declarator : Lobster.cPlusPlusParser.parse("length() const", {startRule : "declarator"}),
                            specs : {storageSpecs : [], typeSpecs : ["size_t"]},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    var str = this.blockScope.requiredLookup("data").lookup(sim, inst);
                                    var retType = this.containingFunction().type.returnType;
                                    var re = ReturnEntity.instance(retType);
                                    re.lookup(sim, inst).writeValue(str.rawValue().length);
                                    re.lookup(sim, inst).initialized();
                                }
                            }, null)
                        },

                        // function max_size() - unsupported
                        mixin(Lobster.cPlusPlusParser.parse("size_t max_size() const;", {startRule: "member_declaration"}),
                            {library_unsupported : true}),

                        // function resize(size_t n, char c)
                        {
                            construct_type : "function_definition",
                            declarator : Lobster.cPlusPlusParser.parse("resize(size_t n, char c)", {startRule : "declarator"}),
                            specs : {storageSpecs : [], typeSpecs : ["void"]},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    var str = this.blockScope.requiredLookup("data").lookup(sim, inst);
                                    var n = this.blockScope.requiredLookup("n").lookup(sim, inst);
                                    var c = this.blockScope.requiredLookup("c").lookup(sim, inst);

                                    var rawN = n.rawValue();
                                    var rawStr = str.rawValue();
                                    if (rawN < rawStr.length) {
                                        // Reduce to only first n characters
                                        str.writeValue(rawStr.substring(0,rawN));
                                    }
                                    else if (rawN > rawStr.length) {
                                        // pad with c to get to n characters
                                        str.writeValue(rawStr + String.fromCharCode(c.rawValue()).repeat(rawN-rawStr.length))
                                    }
                                    // else do nothing since it was the right length to start with
                                }
                            }, null)
                        },


                        // function resize(size_t n)
                        {
                            construct_type : "function_definition",
                            declarator : Lobster.cPlusPlusParser.parse("resize(size_t n)", {startRule : "declarator"}),
                            specs : {storageSpecs : [], typeSpecs : ["void"]},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    var str = this.blockScope.requiredLookup("data").lookup(sim, inst);
                                    var n = this.blockScope.requiredLookup("n").lookup(sim, inst);

                                    var rawN = n.rawValue();
                                    var rawStr = str.rawValue();
                                    if (rawN < rawStr.length) {
                                        // Reduce to only first n characters
                                        str.writeValue(rawStr.substring(0,rawN));
                                    }
                                    else if (rawN > rawStr.length) {
                                        // pad with c to get to n characters
                                        str.writeValue(rawStr + String.fromCharCode(0).repeat(rawN-rawStr.length))
                                    }
                                    // else do nothing since it was the right length to start with
                                }
                            }, null)
                        },

                        // function capacity() - unsupported
                        mixin(Lobster.cPlusPlusParser.parse("size_t capacity() const;", {startRule: "member_declaration"}),
                            {library_unsupported : true}),

                        // function reserve() - unsupported
                        mixin(Lobster.cPlusPlusParser.parse("void reserve();", {startRule: "member_declaration"}),
                            {library_unsupported : true}),
                        mixin(Lobster.cPlusPlusParser.parse("void reserve(size_t n);", {startRule: "member_declaration"}),
                            {library_unsupported : true}),

                        // function clear()
                        {
                            construct_type : "function_definition",
                            declarator : Lobster.cPlusPlusParser.parse("clear()", {startRule : "declarator"}),
                            specs : {storageSpecs : [], typeSpecs : ["void"]},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    var str = this.blockScope.requiredLookup("data").lookup(sim, inst);
                                    str.writeValue("");
                                }
                            }, null)
                        },

                        // function empty()
                        {
                            construct_type : "function_definition",
                            declarator : Lobster.cPlusPlusParser.parse("empty() const", {startRule : "declarator"}),
                            specs : {storageSpecs : [], typeSpecs : ["bool"]},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    var str = this.blockScope.requiredLookup("data").lookup(sim, inst);
                                    var retType = this.containingFunction().type.returnType;
                                    var re = ReturnEntity.instance(retType);
                                    re.lookup(sim, inst).writeValue(str.rawValue().length === 0);
                                    re.lookup(sim, inst).initialized();
                                }
                            }, null)
                        },

                        // function shrink_to_fit() - unsupported
                        mixin(Lobster.cPlusPlusParser.parse("void shrink_to_fit();", {startRule: "member_declaration"}),
                            {library_unsupported : true}),

                        {
                            construct_type : "function_definition",
                            declarator : Lobster.cPlusPlusParser.parse("size()", {startRule : "declarator"}),
                            specs : {storageSpecs : [], typeSpecs : ["size_t"]},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    var x = this.blockScope.requiredLookup("x").lookup(sim, inst).rawValue();
                                    var y = this.blockScope.requiredLookup("y").lookup(sim, inst).rawValue();
                                    var rec = ReceiverEntity.instance(this.containingFunction().receiverType).lookup(sim, inst);
                                    rec.secretStrangData.str = "blah";
                                    this.blockScope.requiredLookup("data").lookup(sim, inst).writeValue(rec.secretStrangData.str);
                                    var retType = this.containingFunction().type.returnType;
                                    var re = ReturnEntity.instance(retType);
                                    re.lookup(sim, inst).writeValue(Value.instance(x + y + rec.secretStrangData.test, retType));
                                    re.lookup(sim, inst).initialized();
                                }
                            }, null)
                        },

                        // function operator[]
                        {
                            construct_type : "function_definition",
                            declarator : Lobster.cPlusPlusParser.parse("&operator[](size_t pos)", {startRule : "declarator"}),
                            specs : {storageSpecs : [], typeSpecs : ["char"]},
                            body : Statements.OpaqueFunctionBodyBlock.instance({
                                effects : function(sim, inst) {
                                    var ptr = this.blockScope.requiredLookup("data_ptr").lookup(sim, inst).getValue();
                                    var pos = this.blockScope.requiredLookup("pos").lookup(sim, inst);
                                    ptr.setRawValue(ptr.rawValue() + pos.rawValue() * ptr.type.ptrTo.size);
                                    var obj = sim.memory.getObject(ptr);

                                    var returnRef = ReturnEntity.instance(this.containingFunction().type.returnType).lookup(sim, inst);
                                    returnRef.bindTo(obj);
                                    returnRef.initialized();


                                }
                            }, null)
                        }
                    ]
                }
            ]
        };

        var strangDefinition = ClassDeclaration.instance(strangAst, {
            parent: null,
            scope : this.i_globalScope,
            translationUnit : this,
            func: globalFunctionContext
        });
        strangDefinition.tryCompileDeclaration();
        strangDefinition.tryCompileDefinition();
        this.topLevelDeclarations.push(strangDefinition);
        this.addNotes(strangDefinition.getNotes());
        strangDefinition.classTypeClass.valueToString = function() {

        };

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
        this.i_globalScope.addEntity(StaticEntity.instance({name:"cout", type:Types.OStream.instance()}));
        this.i_globalScope.addEntity(StaticEntity.instance({name:"cin", type:Types.IStream.instance()}));

        // TODO NEW rework so that endlEntity doesn't have to be public (other parts of code look for it currently)
        this.endlEntity = StaticEntity.instance({name:"endl", type:Types.String.instance()});
        this.endlEntity.defaultValue = "\\n";
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
});
Lobster.CPP.TranslationUnit = TranslationUnit;
