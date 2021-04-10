"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLibraryHeader = exports.TranslationUnit = exports.SourceReference = exports.SourceFile = exports.SimpleProgram = exports.Program = void 0;
const cpp_parser_1 = require("../parse/cpp_parser");
const errors_1 = require("./errors");
const util_1 = require("../util/util");
const entities_1 = require("./entities");
const constructs_1 = require("./constructs");
const declarations_1 = require("./declarations");
const ObjectDeallocator_1 = require("./ObjectDeallocator");
/**
 *
 * The program also needs to know about all source files involved so that #include preprocessor
 * directives can be processed.
 *
 */
class Program {
    constructor(sourceFiles, translationUnits) {
        // public readonly observable = new Observable(this);
        this.context = { program: this };
        this.isCompilationUpToDate = true;
        this.sourceFiles = Object.assign({}, LIBRARY_FILES);
        this.translationUnits = {};
        this.staticObjects = [];
        this.functionCalls = [];
        this.linkedObjectDefinitions = {};
        this.linkedFunctionDefinitions = {};
        this.linkedClassDefinitions = {};
        this.linkedObjectEntities = [];
        this.linkedFunctionEntities = [];
        this.linkedClassEntities = [];
        this.notes = new errors_1.NoteRecorder();
        sourceFiles.forEach(file => {
            this.sourceFiles[file.name] = file;
        });
        translationUnits.forEach((tuName) => {
            util_1.assert(!!this.sourceFiles[tuName], `Source file ${tuName} not found.`);
            let tu = this.translationUnits[tuName] = new TranslationUnit(this, new PreprocessedSource(this.sourceFiles[tuName], this.sourceFiles));
        });
        if (!this.notes.hasSyntaxErrors) {
            this.link();
        }
        this.isCompilationUpToDate = true;
    }
    link() {
        // this.send("linkingStarted");
        this.defineIntrinsics();
        // Provide definitions to each linked entity based on qualified name.
        // Note that the definition provided might not match at all or might
        // be undefined if there was no match for the qualified name. The entities
        // will take care of adding the appropriate linker errors in these cases.
        // Note that "multiple definition" errors are handled when the definitions
        // are registered with the program, so we don't have to take care of them
        // here and thus don't even call "link" if there was a previous definition.
        this.linkedObjectEntities.forEach(le => { var _a; return (_a = le.definition) !== null && _a !== void 0 ? _a : le.link(this.linkedObjectDefinitions[le.qualifiedName.str]); });
        this.linkedFunctionEntities.forEach(le => { var _a; return (_a = le.definition) !== null && _a !== void 0 ? _a : le.link(this.linkedFunctionDefinitions[le.qualifiedName.str]); });
        this.linkedClassEntities.forEach(le => { var _a; return (_a = le.definition) !== null && _a !== void 0 ? _a : le.link(this.linkedClassDefinitions[le.qualifiedName.str]); });
        let mainLookup = this.linkedFunctionDefinitions["main"];
        if (mainLookup) {
            if (mainLookup.definitions.length === 1) {
                this.mainFunction = mainLookup.definitions[0];
            }
            else {
                mainLookup.definitions.forEach(mainDef => this.addNote(errors_1.CPPError.link.main_multiple_def(mainDef.declaration)));
            }
        }
        this.staticObjectAllocator = new constructs_1.GlobalObjectAllocator(this.context, this.staticObjects);
        if (this.mainFunction) {
            // Map from definitions to entities below to avoid any duplicates
            // (this.linkedObjectEntities might have duplicates)
            this.staticObjectDeallocator = ObjectDeallocator_1.createStaticDeallocator(this.mainFunction.context, this.staticObjects.map(def => def.declaredEntity));
        }
    }
    defineIntrinsics() {
        // let intrinsicsTU = new TranslationUnit(this, new PreprocessedSource(new SourceFile("_intrinsics.cpp", ""), {}));
        // let assertDecl = <FunctionDeclaration>createDeclarationFromAST(cpp_parse("void assert(bool);", {startRule: "declaration"}), intrinsicsTU.context)[0];
        // let functionContext = createFunctionContext(intrinsicsTU.context, assertDecl.declaredEntity);
        // let assertDef = new FunctionDefinition(this.context, assertDecl, 
        //     )
    }
    registerGlobalObjectEntity(entity) {
        util_1.asMutable(this.linkedObjectEntities).push(entity);
    }
    registerFunctionEntity(entity) {
        util_1.asMutable(this.linkedFunctionEntities).push(entity);
    }
    registerClassEntity(entity) {
        util_1.asMutable(this.linkedClassEntities).push(entity);
    }
    getLinkedFunctionEntity(qualifiedName) {
        return this.linkedFunctionEntities.find(le => le.qualifiedName.str === qualifiedName.str);
    }
    getLinkedObjectEntity(qualifiedName) {
        return this.linkedObjectEntities.find(le => le.qualifiedName.str === qualifiedName.str);
    }
    registerGlobalObjectDefinition(qualifiedName, def) {
        if (!this.linkedObjectDefinitions[qualifiedName.str]) {
            this.linkedObjectDefinitions[qualifiedName.str] = def;
            util_1.asMutable(this.staticObjects).push(def);
        }
        else {
            // One definition rule violation
            this.addNote(errors_1.CPPError.link.multiple_def(def, qualifiedName.str));
        }
    }
    registerFunctionDefinition(qualifiedName, def) {
        let prevDef = this.linkedFunctionDefinitions[qualifiedName.str];
        if (!prevDef) {
            this.linkedFunctionDefinitions[qualifiedName.str] = new declarations_1.FunctionDefinitionGroup([def]);
        }
        else {
            // Already some definitions for functions with this same name. Check if there's
            // a conflicting overload that violates ODR
            let conflictingDef = entities_1.selectOverloadedDefinition(prevDef.definitions, def.declaration.type);
            if (conflictingDef) {
                this.addNote(errors_1.CPPError.link.multiple_def(def, qualifiedName.str));
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
    registerClassDefinition(qualifiedName, def) {
        var _a, _b;
        let prevDef = this.linkedClassDefinitions[qualifiedName.str];
        if (!prevDef) {
            return this.linkedClassDefinitions[qualifiedName.str] = def;
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
            let prevDefText = (_a = prevDef.ast) === null || _a === void 0 ? void 0 : _a.source.text;
            let defText = (_b = def.ast) === null || _b === void 0 ? void 0 : _b.source.text;
            if (prevDefText && defText && prevDefText.replace(/\s/g, '') === defText.replace(/\s/g, '')) {
                return prevDef;
            }
            def.addNote(errors_1.CPPError.link.class_same_tokens(def, prevDef));
            return def;
        }
    }
    hasSyntaxErrors() {
        return this.notes.hasSyntaxErrors;
    }
    hasErrors() {
        return this.notes.hasErrors;
    }
    isCompiled() {
        return !this.notes.hasErrors;
    }
    isRunnable() {
        return this.isCompiled() && !!this.mainFunction;
    }
    addNote(note) {
        this.notes.addNote(note);
    }
}
exports.Program = Program;
;
class SimpleProgram extends Program {
    constructor(source) {
        super([new SourceFile("main.cpp", source)], new Set(["main.cpp"]));
    }
}
exports.SimpleProgram = SimpleProgram;
/**
 * A simple, immutable object that contains a filename and its text contents.
 * Because it is immutable, don't grab a reference to someone's source file
 * and expect it to update - changes to a file's context require a completely new object.
 */
class SourceFile {
    constructor(name, text, isLibrary = false) {
        this.name = name;
        this.text = text;
        this.isLibrary = isLibrary;
    }
}
exports.SourceFile = SourceFile;
class SourceReference {
    constructor(sourceFile, line, column, start, end) {
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
    static createIncluded(sourceFile, lineIncluded, originalReference) {
        var obj = new SourceReference(originalReference.sourceFile, originalReference.line, originalReference.column, originalReference.start, originalReference.end);
        obj._includes.push({
            sourceFile: sourceFile,
            lineIncluded: lineIncluded
        });
        originalReference.includes.forEach((inc) => obj._includes.push(inc));
        return obj;
    }
    get isIncluded() {
        return this.includes.length > 0;
    }
}
exports.SourceReference = SourceReference;
class PreprocessedSource {
    constructor(sourceFile, availableToInclude, alreadyIncluded = {}) {
        this.notes = new errors_1.NoteRecorder();
        this._includes = [];
        this.includes = this._includes;
        this.includedSourceFiles = {};
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
        this.preprocessedText = codeStr.replace(/#include[^\S\n]+["<](.*)[">]/g, (includeLine, filename, offset, original) => {
            let mapping = {};
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
                this.notes.addNote(errors_1.CPPError.preprocess.recursiveInclude(new SourceReference(sourceFile, currentIncludeLineNumber, 0, offset, currentIncludeOffset)));
                // replace the whole #include line with spaces. Can't just remove or it messes up offsets.
                return Array(includeLine.length + 1).join(" ");
            }
            // Recursively preprocess the included file
            let includedSourceFile = this.availableToInclude[filename];
            //TODO: what happens if the file doesn't exist?
            if (!includedSourceFile) {
                this.notes.addNote(errors_1.CPPError.preprocess.fileNotFound(new SourceReference(sourceFile, currentIncludeLineNumber, 0, offset, currentIncludeOffset), filename));
                // replace the whole #include line with spaces. Can't just remove or it messes up offsets.
                return Array(includeLine.length + 1).join(" ");
            }
            let included = new PreprocessedSource(includedSourceFile, this.availableToInclude, Object.assign({}, alreadyIncluded));
            Object.assign(this.includedSourceFiles, included.includedSourceFiles);
            this.notes.addNotes(included.notes.allNotes);
            mapping.numLines = included.numLines;
            mapping.endLine = mapping.startLine + included.numLines;
            mapping.lineDelta = included.numLines - 1;
            mapping.lengthDelta = included.length - includeLine.length;
            currentIncludeLineNumber += included.numLines - 1; // -1 since one line from original was replaced
            mapping.included = included;
            mapping.lineIncluded = originalIncludeLineNumber;
            this._includes.push(mapping); // TODO: remove cast
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
    filterSourceCode(codeStr) {
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
        // codeStr = codeStr.replace(/#include.*<.*>/g, function (match) {
        //     return Array(match.length + 1).join(" ");
        // });
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
    }
    getSourceReference(line, column, start, end) {
        // Iterate through all includes and check if any would contain
        let offset = 0;
        let lineOffset = 1;
        for (let i = 0; i < this.includes.length; ++i) {
            let inc = this.includes[i];
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
    }
}
/**
 * TranslationUnit
 *
 * Events:
 *   "parsed": after parsing is finished *successfully*
 *   "syntaxError": if a syntax error is encountered during parsing. data contains properties line, column, and message
 *   "compilationFinished": after compilation is finished
 */
class TranslationUnit {
    /**
     * Attempts to compiled the given primary source file as a translation unit for a C++ program.
     * The compilation is attempted given the **current** state of the source files. If the primary
     * source or any of the files included via the preprocessor are changed in any way, a new `TranslationUnit`
     * should be constructed (it is not possible to "re-compile" a TranslationUnit object.)
     * @param primarySourceFile Contains the source code for this translation unit.
     * @param sourceFiles The set of files to be available for inclusion via #include directives.
     */
    constructor(program, preprocessedSource) {
        // public readonly observable = new Observable(this);
        this.notes = new errors_1.NoteRecorder();
        this.topLevelDeclarations = [];
        this.staticEntities = [];
        this.stringLiterals = [];
        this.functionCalls = [];
        this.program = program;
        this.source = preprocessedSource;
        preprocessedSource.notes.allNotes.forEach(note => this.addNote(note)); // Don't use this.notes.addNotes here since that would miss adding them to the program as well
        this.globalScope = new entities_1.NamespaceScope(this, preprocessedSource.primarySourceFile.name + "_GLOBAL_SCOPE");
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
            let libAST = cpp_parser_1.parse(LIBRARY_FILES["_lobster_implicit"].text);
            this.compileTopLevelDeclarations(libAST);
            // Note this is not checked by the TS type system. We just have to manually ensure
            // the structure produced by the grammar/parser matches what we expect.
            let parsedAST = cpp_parser_1.parse(this.source.preprocessedText);
            this.parsedAST = parsedAST;
            this.createBuiltInGlobals();
            this.compileTopLevelDeclarations(this.parsedAST);
        }
        catch (err) {
            if (err.name == "SyntaxError") {
                this.addNote(new errors_1.SyntaxNote(this.getSourceReference(err.location.start.line, err.location.start.column, err.location.start.offset, err.location.start.offset + 1), errors_1.NoteKind.ERROR, "syntax", "A syntax error was detected on this line. If there doesn't appear to be an issue here, the error might have occurred on a previous line that caused the compiler to get off track."));
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
    createBuiltInGlobals() {
        // if (Types.userTypeNames["ostream"]) {
        //     this.i_globalScope.addEntity(StaticEntity.instance({name:"cout", type:Types.OStream.instance()}));
        //     this.i_globalScope.addEntity(StaticEntity.instance({name:"cin", type:Types.IStream.instance()}));
        // }
        // asMutable(this.topLevelDeclarations).push(createTopLevelDeclarationFromAST(
        //     <ClassDefinitionASTNode>cpp_parse("class ostream { };", {startRule: "declaration"}),
        //     this.context));
        // asMutable(this.topLevelDeclarations).push(createTopLevelDeclarationFromAST(
        //     <NonMemberSimpleDeclarationASTNode>{
        //         construct_type: "simple_declaration",
        //         declarators: [<DeclaratorASTNode>cpp_parse("cout", {startRule: "declarator"})],
        //         source: {column: 1, line: 1, end: 1, start: 1, text: "ostream cout;"},
        //         specs: {typeSpecs: ["ostream"], classSpecifiers: [], storageSpecs: [], elaboratedTypeSpecifiers: []},
        //     },
        //     this.context)[0]);
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
    compileTopLevelDeclarations(ast) {
        ast.declarations.forEach((declAST) => {
            let sourceRef = this.getSourceReferenceForAST(declAST);
            let topLevelContext = sourceRef.sourceFile.isLibrary
                ? constructs_1.createLibraryContext(this.context) : this.context;
            let declsOrFuncDef = declarations_1.createTopLevelDeclarationFromAST(declAST, topLevelContext);
            if (Array.isArray(declsOrFuncDef)) {
                declsOrFuncDef.forEach(decl => {
                    util_1.asMutable(this.topLevelDeclarations).push(decl);
                });
            }
            else {
                util_1.asMutable(this.topLevelDeclarations).push(declsOrFuncDef);
            }
        });
    }
    registerStringLiteral(literal) {
        util_1.asMutable(this.stringLiterals).push(literal);
    }
    registerFunctionCall(call) {
        util_1.asMutable(this.functionCalls).push(call);
    }
    getNearestSourceReferenceForConstruct(construct) {
        while (!construct.ast && construct.parent) {
            construct = construct.parent;
        }
        if (!construct.ast) {
            return util_1.assertFalse("Can't find source reference for construct");
        }
        let src = construct.ast.source;
        return this.getSourceReference(src.line, src.column, src.start, src.end);
    }
    getSourceReferenceForAST(ast) {
        let src = ast.source;
        return this.getSourceReference(src.line, src.column, src.start, src.end);
    }
    getSourceReference(line, column, start, end) {
        return this.source.getSourceReference(line, column, start, end);
    }
    addNote(note) {
        this.notes.addNote(note);
        this.program.addNote(note);
    }
    /**
     * An array of all of the identifiers that comprise the qualified name.
     * If you've got a string like "std::vector", just use .split("::"") to
     * get the corresponding array, like ["std", "vector"].
     */
    qualifiedLookup(name, options = { kind: "normal" }) {
        let comps = name.components;
        util_1.assert(comps.length > 0);
        var scope = this.globalScope;
        for (var i = 0; scope && i < comps.length - 1; ++i) {
            scope = scope.children[comps[i]];
        }
        if (!scope) {
            return undefined;
        }
        var unqualifiedName = comps[comps.length - 1];
        var result = scope.lookup(unqualifiedName, Object.assign({}, options, { noParent: true }));
        // Qualified lookup suppresses virtual function call mechanism, so if we
        // just looked up a MemberFunctionEntity, we create a proxy to do that.
        // if (Array.isArray(result)){
        //     result = result.map(function(elem){
        //         return elem instanceof MemberFunctionEntity ? elem.suppressedVirtualProxy() : elem;
        //     });
        // }
        return result;
    }
}
exports.TranslationUnit = TranslationUnit;
const LIBRARY_FILES = {
    _lobster_implicit: new SourceFile("_lobster_implicit.h", `
        class initializer_list<int> {
          const int *begin;
          const int *end;

          initializer_list(const initializer_list<int> &other)
           : begin(other.begin), end(other.end) {}
        };

        class initializer_list<double> {
          const double *begin;
          const double *end;

          initializer_list(const initializer_list<double> &other)
           : begin(other.begin), end(other.end) {}
        };

        class initializer_list<char> {
          const char *begin;
          const char *end;

          initializer_list(const initializer_list<char> &other)
           : begin(other.begin), end(other.end) {}
        };

        class initializer_list<bool> {
          const bool *begin;
          const bool *end;

          initializer_list(const initializer_list<bool> &other)
           : begin(other.begin), end(other.end) {}
        };
        
    `, true)
};
function registerLibraryHeader(name, file) {
    util_1.assert(!LIBRARY_FILES[name]);
    LIBRARY_FILES[name] = file;
}
exports.registerLibraryHeader = registerLibraryHeader;
//# sourceMappingURL=Program.js.map