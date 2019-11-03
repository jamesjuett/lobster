"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cpp_parser_1 = require("../parse/cpp_parser");
var errors_1 = require("./errors");
var util_1 = require("../util/util");
var declarations_1 = require("./declarations");
var entities_1 = require("./entities");
var observe_1 = require("../util/observe");
var constructs_1 = require("./constructs");
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
var NoteRecorder = /** @class */ (function () {
    function NoteRecorder() {
        this._allNotes = [];
        this.allNotes = this._allNotes;
        this.hasErrors = false;
        this.hasSyntaxErrors = false;
        this.hasWarnings = false;
    }
    NoteRecorder.prototype.addNote = function (note) {
        this._allNotes.push(note);
        var _this = this;
        if (note.kind === errors_1.NoteKind.ERROR) {
            _this.hasErrors = true;
            if (note instanceof errors_1.SyntaxNote) {
                _this.hasSyntaxErrors = true;
            }
        }
        else if (note.kind === errors_1.NoteKind.WARNING) {
            _this.hasWarnings = true;
        }
    };
    NoteRecorder.prototype.addNotes = function (notes) {
        var _this_1 = this;
        notes.forEach(function (note) { return _this_1.addNote(note); });
    };
    NoteRecorder.prototype.clearNotes = function () {
        this._allNotes.length = 0;
        var _this = this;
        _this.hasErrors = false;
        _this.hasSyntaxErrors = false;
        _this.hasWarnings = false;
    };
    return NoteRecorder;
}());
exports.NoteRecorder = NoteRecorder;
/**
 *
 * The program also needs to know about all source files involved so that #include preprocessor
 * directives can be processed.
 *
 */
var Program = /** @class */ (function () {
    function Program(translationUnits) {
        var _this_1 = this;
        // public readonly observable = new Observable(this);
        this.context = { program: this };
        this.isCompilationUpToDate = true;
        this.translationUnits = {};
        this.originalSourceFiles = {};
        this.includedSourceFiles = {};
        this.globalObjects = [];
        this.functionCalls = [];
        this.definitions = {};
        this.linkedEntities = [];
        this.notes = new NoteRecorder();
        translationUnits.forEach(function (tu) { _this_1.translationUnits[tu.name] = tu; });
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
    Program.prototype.fullCompile = function () {
        this.compilationProper();
        if (!this.notes.hasSyntaxErrors) {
            this.link();
        }
        this.isCompilationUpToDate = true;
    };
    /**
     * Presumes translation units are already compiled (not necessarily successfully).
     */
    Program.prototype.compilationProper = function () {
        // this.observable.send("compilationStarted");
        for (var tuName in this.translationUnits) {
            var tu = this.translationUnits[tuName];
            this.originalSourceFiles[tu.source.primarySourceFile.name] = tu.source.primarySourceFile;
            Object.assign(this.includedSourceFiles, tu.source.includedSourceFiles);
            this.notes.addNotes(tu.notes.allNotes);
            // TODO: why was this here?
            // if (this.notes.hasSyntaxErrors) {
            //     break;
            // }
        }
        // this.observable.send("compilationFinished");
    };
    Program.prototype.link = function () {
        // this.send("linkingStarted");
        var _this_1 = this;
        this.defineIntrinsics();
        // Provide definitions to each linked entity based on qualified name.
        // Note that the definition provided might not match at all or might
        // be undefined if there was no match for the qualified name. The entities
        // will take care of adding the appropriate linker errors in these cases.
        this.linkedEntities.forEach(function (le) {
            return le.link(_this_1.definitions[le.qualifiedName]);
        });
        var main = this.definitions["::main"];
        if (main instanceof declarations_1.FunctionDefinition) {
            this.mainFunction = main;
        }
        this.globalObjectAllocator = new constructs_1.GlobalObjectAllocator(this.context, this.globalObjects);
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
    };
    Program.prototype.defineIntrinsics = function () {
        // TODO
    };
    Program.prototype.registerLinkedEntity = function (entity) {
        util_1.asMutable(this.linkedEntities).push(entity);
    };
    Program.prototype.registerGlobalObjectDefinition = function (qualifiedName, def) {
        if (!this.definitions[qualifiedName]) {
            this.definitions[qualifiedName] = def;
            util_1.asMutable(this.globalObjects).push(def);
        }
        else {
            // One definition rule violation
            this.notes.addNote(errors_1.CPPError.link.multiple_def(def, qualifiedName));
        }
    };
    Program.prototype.registerFunctionDefinition = function (qualifiedName, def) {
        var prevDef = this.definitions[qualifiedName];
        if (!prevDef) {
            this.definitions[qualifiedName] = [def];
        }
        else if (!Array.isArray(prevDef)) {
            // Previous definition that isn't a function overload group
            this.notes.addNote(errors_1.CPPError.link.multiple_def(def, qualifiedName));
        }
        else {
            // Already some definitions for functions with this same name. Check if there's
            // a conflicting overload that violates ODR
            var conflictingDef = declarations_1.selectOverloadedDefinition(prevDef, def.declaration.type);
            if (conflictingDef) {
                this.notes.addNote(errors_1.CPPError.link.multiple_def(def, qualifiedName));
            }
            else {
                prevDef.push(def);
            }
        }
    };
    return Program;
}());
exports.Program = Program;
;
var SourceFile = /** @class */ (function () {
    function SourceFile(name, text) {
        this.observable = new observe_1.Observable(this);
        this.name = name;
        this.text = text;
    }
    return SourceFile;
}());
exports.SourceFile = SourceFile;
var SourceReference = /** @class */ (function () {
    function SourceReference(sourceFile, line, column, start, end) {
        this._includes = [];
        this.includes = this._includes;
        this.sourceFile = sourceFile;
        this.line = line;
        this.column = column;
        this.start = start;
        this.end = end;
    }
    /**
     * Creates a wrapper to represent a reference to source code that has been included in another file.
     */
    SourceReference.createIncluded = function (sourceFile, lineIncluded, originalReference) {
        var obj = new SourceReference(originalReference.sourceFile, originalReference.line, originalReference.column, originalReference.start, originalReference.end);
        obj._includes.push({
            sourceFile: sourceFile,
            lineIncluded: lineIncluded
        });
        originalReference.includes.forEach(function (inc) { return obj._includes.push(inc); });
        return obj;
    };
    Object.defineProperty(SourceReference.prototype, "isIncluded", {
        get: function () {
            return this.includes.length > 0;
        },
        enumerable: true,
        configurable: true
    });
    return SourceReference;
}());
exports.SourceReference = SourceReference;
var PreprocessedSource = /** @class */ (function () {
    function PreprocessedSource(sourceFile, availableToInclude, alreadyIncluded) {
        var _this_1 = this;
        if (alreadyIncluded === void 0) { alreadyIncluded = {}; }
        this.notes = new NoteRecorder();
        this._includes = [];
        this.includes = this._includes;
        this.includedSourceFiles = {};
        this.primarySourceFile = sourceFile;
        this.name = sourceFile.name;
        this.availableToInclude = availableToInclude;
        alreadyIncluded[this.primarySourceFile.name] = true;
        var codeStr = sourceFile.text;
        codeStr = this.filterSourceCode(codeStr);
        var currentIncludeOffset = 0;
        var currentIncludeLineNumber = 1;
        var originalIncludeLineNumber = 1;
        this.includedSourceFiles[this.primarySourceFile.name] = this.primarySourceFile;
        // Find and replace #include lines. Will also populate i_includes array.
        // [^\S\n] is a character class for all whitespace other than newlines
        this.preprocessedText = codeStr.replace(/#include[^\S\n]+"(.*)"/g, function (includeLine, filename, offset, original) {
            var mapping = {};
            // Find the line number of this include by adding up the number of newline characters
            // since the offset of the last match up to the current one. Add this to the line number.
            for (var i_1 = currentIncludeOffset; i_1 < offset; ++i_1) {
                if (original[i_1] === "\n") {
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
                _this_1.notes.addNote(errors_1.CPPError.preprocess.recursiveInclude(new SourceReference(sourceFile, currentIncludeLineNumber, 0, offset, currentIncludeOffset)));
                // replace the whole #include line with spaces. Can't just remove or it messes up offsets.
                return Array(includeLine.length + 1).join(" ");
            }
            // Recursively preprocess the included file
            var includedSourceFile = _this_1.availableToInclude[filename];
            //TODO: what happens if the file doesn't exist?
            var included = new PreprocessedSource(includedSourceFile, _this_1.availableToInclude, Object.assign({}, alreadyIncluded));
            Object.assign(_this_1.includedSourceFiles, included.includedSourceFiles);
            mapping.numLines = included.numLines;
            mapping.endLine = mapping.startLine + included.numLines;
            mapping.lineDelta = included.numLines - 1;
            mapping.lengthDelta = included.length - includeLine.length;
            currentIncludeLineNumber += included.numLines - 1; // -1 since one line from original was replaced
            mapping.included = included;
            mapping.lineIncluded = originalIncludeLineNumber;
            _this_1._includes.push(mapping); // TODO: remove cast
            return included.preprocessedText;
        });
        // Count lines for the rest of the file after any #includes
        for (var i = currentIncludeOffset; i < codeStr.length; ++i) {
            if (codeStr[i] === "\n") {
                ++currentIncludeLineNumber;
            }
        }
        this.numLines = currentIncludeLineNumber;
        this.length = this.preprocessedText.length;
    }
    PreprocessedSource.prototype.filterSourceCode = function (codeStr) {
        // remove carriage returns
        codeStr = codeStr.replace(/\r/g, "");
        if (codeStr.includes("#ifndef")) {
            codeStr = codeStr.replace(/#ifndef.*/g, function (match) {
                return Array(match.length + 1).join(" ");
            });
            // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
        }
        if (codeStr.includes("#define")) {
            codeStr = codeStr.replace(/#define.*/g, function (match) {
                return Array(match.length + 1).join(" ");
            });
            // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
        }
        if (codeStr.includes("#endif")) {
            codeStr = codeStr.replace(/#endif.*/g, function (match) {
                return Array(match.length + 1).join(" ");
            });
            // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
        }
        // if (codeStr.contains(/#include.*<.*>/g)){
        codeStr = codeStr.replace(/#include.*<.*>/g, function (match) {
            return Array(match.length + 1).join(" ");
        });
        // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
        // }
        if (codeStr.includes("using namespace")) {
            codeStr = codeStr.replace(/using namespace.*/g, function (match) {
                return Array(match.length + 1).join(" ");
            });
            // TODO NEW why is this commented?
            // this.send("otherError", "When writing code in lobster, you don't need to include using directives (e.g. <span class='code'>using namespace std;</span>).");
        }
        if (codeStr.includes("using std::")) {
            codeStr = codeStr.replace(/using std::.*/g, function (match) {
                return Array(match.length + 1).join(" ");
            });
            // this.send("otherError", "Lobster doesn't support using declarations at the moment.");
        }
        return codeStr;
    };
    PreprocessedSource.prototype.getSourceReference = function (line, column, start, end) {
        // Iterate through all includes and check if any would contain
        var offset = 0;
        var lineOffset = 1;
        for (var i = 0; i < this.includes.length; ++i) {
            var inc = this.includes[i];
            if (line < inc.startLine) {
                return new SourceReference(this.primarySourceFile, line - lineOffset + 1, column, start && start - offset, end && end - offset);
            }
            else if (inc.startLine <= line && line < inc.endLine) {
                return SourceReference.createIncluded(this.primarySourceFile, inc.lineIncluded, inc.included.getSourceReference(line - inc.startLine + 1, column, start && start - inc.startOffset, end && end - inc.startOffset));
            }
            offset += inc.lengthDelta;
            lineOffset += inc.lineDelta;
        }
        // If this line wasn't part of any of the includes, just return a regular source reference to the original
        // source file associated with this translation unit
        return new SourceReference(this.primarySourceFile, line - lineOffset + 1, column, start && start - offset, end && end - offset);
    };
    return PreprocessedSource;
}());
/**
 * TranslationUnit
 *
 * Events:
 *   "parsed": after parsing is finished *successfully*
 *   "syntaxError": if a syntax error is encountered during parsing. data contains properties line, column, and message
 *   "compilationFinished": after compilation is finished
 */
var TranslationUnit = /** @class */ (function () {
    /**
     * Attempts to compiled the given primary source file as a translation unit for a C++ program.
     * The compilation is attempted given the **current** state of the source files. If the primary
     * source or any of the files included via the preprocessor are changed in any way, a new `TranslationUnit`
     * should be constructed (it is not possible to "re-compile" a TranslationUnit object.)
     * @param primarySourceFile Contains the source code for this translation unit.
     * @param sourceFiles The set of files to be available for inclusion via #include directives.
     */
    function TranslationUnit(program, preprocessedSource) {
        // public readonly observable = new Observable(this);
        this.notes = new NoteRecorder();
        this.topLevelDeclarations = [];
        this.staticEntities = [];
        this.stringLiterals = [];
        this.functionCalls = [];
        this.program = program;
        this.source = preprocessedSource;
        this.globalScope = new entities_1.NamespaceScope(preprocessedSource.primarySourceFile.name + "_GLOBAL_SCOPE");
        this.name = preprocessedSource.name;
        this.context = constructs_1.createTranslationUnitContext(program.context, this, this.globalScope);
        try {
            // This is kind of a hack to communicate with the PEG.js generated parsing code.
            // This both "resets" the user-defined type names that exist for each translation
            // unit (e.g. so that Class names declared in another translation unit aren't hanging
            // around), and also ensures "default" user-defined type names like ostream, etc. are
            // recognized as such. Making a copy is important so that we don't modify the original
            // which will potentially be used by other translation units.
            // resetUserTypeNames(); //Object.assign({}, Types.defaultUserTypeNames); // TODO
            // Note this is not checked by the TS type system. We just have to manually ensure
            // the structure produced by the grammar/parser matches what we expect.
            var parsedAST = cpp_parser_1.parse(this.source.preprocessedText);
            this.parsedAST = parsedAST;
            this.createBuiltInGlobals();
            this.compileTopLevelDeclarations(this.parsedAST);
        }
        catch (err) {
            if (err.name == "SyntaxError") {
                this.notes.addNote(new errors_1.SyntaxNote(this.getSourceReference(err.location.start.line, err.location.start.column, err.location.start.offset, err.location.start.offset + 1), errors_1.NoteKind.ERROR, "syntax", err.message));
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
    TranslationUnit.prototype.createBuiltInGlobals = function () {
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
    };
    TranslationUnit.prototype.compileTopLevelDeclarations = function (ast) {
        var _this_1 = this;
        ast.declarations.forEach(function (declAST) {
            var declsOrFuncDef = declarations_1.createDeclarationFromAST(declAST, _this_1.context);
            if (Array.isArray(declsOrFuncDef)) {
                declsOrFuncDef.forEach(function (decl) { return util_1.asMutable(_this_1.topLevelDeclarations).push(decl); });
            }
            else {
                util_1.asMutable(_this_1.topLevelDeclarations).push(declsOrFuncDef);
            }
        });
    };
    TranslationUnit.prototype.addStringLiteral = function (literal) {
        util_1.asMutable(this.stringLiterals).push(literal);
    };
    TranslationUnit.prototype.registerFunctionCall = function (call) {
        util_1.asMutable(this.functionCalls).push(call);
    };
    TranslationUnit.prototype.getNearestSourceReferenceForConstruct = function (construct) {
        while (!construct.ast) {
        }
        var trackedConstruct = findNearestTrackedConstruct(construct); // will be source if that was tracked
        var trackedCode = trackedConstruct.code;
        return this.getSourceReference(trackedCode.line, trackedCode.column, trackedCode.start, trackedCode.end);
    };
    TranslationUnit.prototype.getSourceReference = function (line, column, start, end) {
        return this.source.getSourceReference(line, column, start, end);
    };
    return TranslationUnit;
}());
exports.TranslationUnit = TranslationUnit;
//# sourceMappingURL=Program.js.map