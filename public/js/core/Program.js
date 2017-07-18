/**
 * @author James
 */

var Lobster = Lobster || {};
Lobster.CPP = Lobster.CPP || {};

/**
 *
 * The program also needs to know about all source files involved so that #include preprocessor
 * directives can be processed.
 */
var Program = Lobster.CPP.Program = Class.extend(Observable, {
    _name : "Program",

    init : function () {

        this.i_translationUnits = {};
        this.i_sourceFiles = {};

        this.globalScope = NamespaceScope.instance("", null, this);
        this.staticEntities = [];

        this.i_semanticProblems = SemanticProblems.instance(); // TODO NEW do I need this?
        this.linkerProblems = [];
    },

    addSourceFile : function(sourceFile) {
        assert(!this.i_sourceFiles[sourceFile.getName()]);
        this.i_sourceFiles[sourceFile.getName()] = sourceFile;
    },

    removeSourceFile : function(sourceFile) {
        if (typeof sourceFile !== "string"){
            sourceFile = sourceFile.getName();
        }
        if(this.i_sourceFiles[sourceFile]){
            delete this.i_sourceFiles[sourceFile];
        }

        // Also remove any associated translation unit (if it exists)
        this.removeTranslationUnit(sourceFile);
    },

    getSourceFile : function(name) {
        return this.i_sourceFiles[name];
    },

    createTranslationUnitForSourceFile : function(sourceFileName) {
        if (typeof sourceFileName !== "string"){
            sourceFileName = sourceFileName.getName();
        }
        assert(this.i_sourceFiles[sourceFileName]);
        assert(!this.i_translationUnits[sourceFileName]);

        var tu = TranslationUnit.instance(this, this.i_sourceFiles[sourceFileName]);
        this.i_translationUnits[tu.getName()] = tu;
        return tu;
    },

    removeTranslationUnit : function(translationUnit) {
        if (typeof translationUnit !== "string"){
            translationUnit = translationUnit.getName();
        }
        if(this.i_translationUnits[translationUnit]){
            delete this.i_translationUnits[translationUnit];
        }
    },

    clearTranslationUnits : function() {
        this.i_translationUnits = {};
    },

    addStaticEntity : function(obj){
        this.staticEntities.push(obj);
    },

    /**
     * Compiles all translation units that are part of this program.
     */
    compile : function () {
        this.i_semanticProblems.clear();
        for(var name in this.i_translationUnits) {
            var tu = this.i_translationUnits[name];
            // TODO take this out!!!
            // if (name === "file2") {
                this.i_semanticProblems.pushAll(tu.fullCompile());
            // }
        }
    },

    /**
     * Compiles all translation units that are part of this program and then links the program.
     */
    fullCompile : function() {
        this.compile();
        this.link();
        return this.i_semanticProblems;
    },

    link : function() {

        this.linkerProblems.clear();

        this.globalScope = NamespaceScope.instance("", null, this);
        this.staticEntities.clear();

        // Bring together stuff from all translation units
        // TODO NEW: Make reporting of linker errors more elegant
        var self = this;
        for(var name in this.i_translationUnits) {
            var tu = this.i_translationUnits[name];
            this.globalScope.merge(tu.globalScope, function(e) {
                if (isA(e, SemanticProblem)) {
                    console.log("Linker: " + e.getMessage());
                    self.linkerProblems.push(e);
                }
                else{
                    throw e;
                }
            });
        }


        //look for main
        try{
            this.i_main = this.globalScope.requiredLookup("main", {paramTypes: []});
        }
        catch(e){
            if (!isA(e, SemanticExceptions.BadLookup)){
                console.log(e.stack);
                throw e;
            }
        }

        console.log("linked successfully");
        this.send("linked", this.linkerProblems);

        // else if (decl.name === "main") {
        //     this.semanticProblems.push(CPPError.decl.prev_main(this, decl.name, otherFunc.decl));
        //     return null;
        // }
    },

    mainEntity : function() {
        return this.i_main;
    }
});

var SourceFile = Class.extend({

    init : function(name, sourceCode) {
        this.i_name = name;
        this.setSourceCode(sourceCode);
    },

    getName : function() {
        return this.i_name;
    },

    setSourceCode : function(codeStr) {
        this.i_sourceCode = codeStr;
    },

    getSourceCode : function() {
        return this.i_sourceCode;
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
 *   "compiled": after compilation is finished. data is a SemanticProblems object
 */
var TranslationUnit = Class.extend(Observable, {
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

            var codeStr = sourceFile.getSourceCode();

            codeStr = this.i_filterSourceCode(codeStr);

            this.i_includes = [];
            var currentIncludeOffset = 0;
            var currentIncludeLineNumber = 1;
            var originalIncludeLineNumber = 1;

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
                    mapping.startOffset = currentIncludeOffset;

                    currentIncludeOffset = offset + includeLine.length;

                    // // extract the filename from the #include line match
                    // // [1] yields only the match for the part of the regex in parentheses
                    // var filename = includeLine.match(/"(.*)"/)[1];

                    // Recursively preprocess the included file
                    assert(!alreadyIncluded[filename], "Recursive #include detected!");
                    var includedSourceFile = translationUnit.i_program.getSourceFile(filename);

                    var included = self._class.instance(translationUnit, includedSourceFile,
                        copyMixin(alreadyIncluded, {}));

                    mapping.numLines = included.numLines;
                    mapping.endLine = mapping.startLine + included.numLines;

                    mapping.lineDelta = included.numLines - 1;
                    mapping.lengthDelta = included.length - includeLine.length;
                    currentIncludeLineNumber += included.numLines - 1; // -1 since one line from original was replaced
                    mapping.included = included;
                    mapping.lineIncluded = originalIncludeLineNumber;

                    self.i_includes.push(mapping);

                    return included.getSourceCode();
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

            // Replace each with
        },

        getSourceCode : function() {
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
        this.initParent();

        this.i_originalSourceFile = sourceFile;

        this.i_program = program;

        this.globalScope = NamespaceScope.instance("", null, this);
        this.topLevelDeclarations = [];
        this.staticEntities = [];
        this.i_semanticProblems = SemanticProblems.instance();

        this.i_main = false;


        return this;
    },

    getName : function() {
        return this.i_originalSourceFile.getName();
    },

    getSemanticProblems : function() {
        return this.i_semanticProblems;
    },

    hasSemanticErrors : function(){
        return this.i_semanticProblems.errors.length > 0;
    },

    addStaticEntity : function(obj){
        this.staticEntities.push(obj);
    },

    fullCompile : function() {
        // codeStr += "\n"; // TODO NEW why was this needed?
		try{

            // TODO NEW omg what a hack
            //Use for building parser :p
            //console.log(PEG.buildParser(codeStr,{
            //    cache: true,
            //    allowedStartRules: ["start", "function_body", "member_declaration", "declaration"],
            //    output: "source"
            //}));
            //return;


            this.i_preprocess();

            // Ensure user defined classes are recognized as types.
            // TODO NEW not sure this is the best place for it, though.
            Types.userTypeNames = copyMixin(Types.defaultUserTypeNames);

            var parsed = Lobster.cPlusPlusParser.parse(this.i_preprocessedSource.getSourceCode());

            this.send("parsed");

            this.i_compile(parsed);

            this.send("compiled", this.i_semanticProblems);
            return this.i_semanticProblems;
            
		}
		catch(err){
			if (err.name == "SyntaxError"){
                this.send("parsingError", {ref: this.getSourceReference(err.line, err.column), message: err.message});
				this.i_semanticProblems.clear();
                return this.i_semanticProblems;
			}
			else{
                this.send("unknownError");
                console.log(err.stack);
				throw err;
			}
		}
	},

    i_preprocess : function(codeStr) {

        this.i_preprocessedSource = this.i_PreprocessedSource.instance(this, this.i_originalSourceFile);

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

    i_preprocessImpl : function(codeStr) {

        // NOTE: carriage returns should be filtered out previous to calling this function




        return codeStr;
    },

	i_compile : function(code){

        // Program.currentProgram = this;

        var self = this;
        //console.log("compiling");
		this.i_semanticProblems.clear();
		this.topLevelDeclarations.clear();
		this.globalScope = NamespaceScope.instance("", null, this);
        this.staticEntities.clear();

        // TODO NEW change
        this.send("clearAnnotations");

        this.i_createBuiltInGlobals();



        // TODO NEW the globalFunctionContext thing seems a bit hacky. why was this needed? (i.e. why can't it be null?)
        var globalFunctionContext = MagicFunctionDefinition.instance("globalFuncContext", Types.Function.instance(Types.Void.instance(), []));

        // First, compile ALL the declarations
        for(var i = 0; i < code.length; ++i){
            var decl = Declarations.create(code[i], {
                parent: null,
                translationUnit : this,
                func: globalFunctionContext
            });
            decl.tryCompileDeclaration(this.globalScope);
            decl.tryCompileDefinition(this.globalScope);
            this.i_semanticProblems.pushAll(decl.semanticProblems);
            this.topLevelDeclarations.push(decl);
        }

        // Linking
        // TODO Just get rid of this??
        // var linkingProblems = SemanticProblems.instance();
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
        this.globalScope.addEntity(StaticEntity.instance({name:"cout", type:Types.OStream.instance()}));
        this.globalScope.addEntity(StaticEntity.instance({name:"cin", type:Types.IStream.instance()}));

        // TODO NEW rework so that endlEntity doesn't have to be public (other parts of code look for it currently)
        this.endlEntity = StaticEntity.instance({name:"endl", type:Types.String.instance()});
        this.endlEntity.defaultValue = "\\n";
        this.globalScope.addEntity(this.endlEntity);


        var cassert = MagicFunctionEntity.instance(MagicFunctionDefinition.instance(
            "assert",
            Types.Function.instance(Types.Void.instance(), [Types.Bool.instance()])
        ));
        this.globalScope.addEntity(cassert);

        var pause = MagicFunctionEntity.instance(MagicFunctionDefinition.instance(
            "pause",
            Types.Function.instance(Types.Void.instance(), [])
        ));
        this.globalScope.addEntity(pause);


        var pauseIf = MagicFunctionEntity.instance(MagicFunctionDefinition.instance(
            "pauseIf",
            Types.Function.instance(Types.Void.instance(), [Types.Bool.instance()])
        ));
        this.globalScope.addEntity(pauseIf);


        this.globalScope.addEntity(MagicFunctionEntity.instance(
            MagicFunctionDefinition.instance("rand",
                Types.Function.instance(Types.Int.instance(), []))));



        // BELOW THIS LINE IS RANDOM 280 STUFF


        // for(var i = 0; i < Types.Rank.values.length; ++i){
        //     var enumLit = Types.Rank.values[i];
        //     var ent = StaticEntity.instance({name:enumLit, type:Types.Rank.instance()});
        //     ent.defaultValue = Types.Rank.valueMap[enumLit];
        //     this.globalScope.addEntity(ent);
        // }
        //
        // for(var i = 0; i < Types.Suit.values.length; ++i){
        //     var enumLit = Types.Suit.values[i];
        //     var ent = StaticEntity.instance({name:enumLit, type:Types.Suit.instance()});
        //     ent.defaultValue = Types.Suit.valueMap[enumLit];
        //     this.globalScope.addEntity(ent);
        // }
        //
        // var make_face = FunctionEntity.instance(MagicFunctionDefinition.instance(
        //     "make_face",
        //     Types.Function.instance(Types.Void.instance(), [Types.Pointer.instance(Types.Int.instance())])
        // ));
        // this.globalScope.addEntity(make_face);
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
        // this.globalScope.addEntity(list_make_empty);
        // this.globalScope.addEntity(list_make);
        // this.globalScope.addEntity(list_isEmpty);
        // this.globalScope.addEntity(list_first);
        // this.globalScope.addEntity(list_rest);
        // this.globalScope.addEntity(list_print);
        // this.globalScope.addEntity(list_magic_reverse);
        // this.globalScope.addEntity(list_magic_append);
        //
        //
        //
        // var emptyList = StaticEntity.instance({name:"EMPTY", type:Types.List_t.instance()});
        // emptyList.defaultValue = [];
        // this.globalScope.addEntity(emptyList);
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
        // this.globalScope.addEntity(tree_make_empty);
        // this.globalScope.addEntity(tree_make);
        // this.globalScope.addEntity(tree_isEmpty);
        // this.globalScope.addEntity(tree_elt);
        // this.globalScope.addEntity(tree_left);
        // this.globalScope.addEntity(tree_right);
        // this.globalScope.addEntity(tree_print);
    }
});
Lobster.CPP.TranslationUnit = TranslationUnit;
