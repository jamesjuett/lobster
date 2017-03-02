/**
 * @author James
 */

var Lobster = Lobster || {};
Lobster.CPP = Lobster.CPP || {};

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
    },

    getSourceFile : function(name) {
        return this.i_sourceFiles[name];
    },

    addTranslationUnit : function(translationUnit) {
        assert(!this.i_translationUnits[translationUnit.getName()]);
        this.i_translationUnits[translationUnit.getName()] = translationUnit;
    },

    removeTranslationUnit : function(translationUnit) {
        if (typeof translationUnit !== "string"){
            translationUnit = translationUnit.getName();
        }
        if(this.i_translationUnits[translationUnit]){
            delete this.i_translationUnits[translationUnit];
        }
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
            this.i_semanticProblems.pushAll(tu.fullCompile());
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

    init: function(program, sourceFile){
        this.initParent();

        this.i_originalSourceFile = sourceFile;

        // TODO: Better design would probably require the Program to spawn an new TranslationUnit for us.
        this.i_program = program;
        this.i_program.addTranslationUnit(this);

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
            this.i_sourceCode = this.i_originalSourceFile.getSourceCode();

            this.i_sourceCode = this.i_filterSourceCode(this.i_sourceCode);


            // TODO NEW omg what a hack
            //Use for building parser :p
            //console.log(PEG.buildParser(codeStr,{
            //    cache: true,
            //    allowedStartRules: ["start", "function_body", "member_declaration", "declaration"],
            //    output: "source"
            //}));
            //return;


            this.i_sourceCode = this.i_preprocess(this.i_sourceCode);

            // Ensure user defined classes are recognized as types.
            // TODO NEW not sure this is the best place for it, though.
            Types.userTypeNames = copyMixin(Types.defaultUserTypeNames);

            var parsed = Lobster.cPlusPlusParser.parse(this.i_sourceCode);

            this.send("parsed");

            this.i_compile(parsed);

            this.send("compiled", this.i_semanticProblems);
            return this.i_semanticProblems;
            
		}
		catch(err){
			if (err.name == "SyntaxError"){
                this.send("parsed", {line: err.line, column: err.column, message: err.message});
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

    i_filterSourceCode : function(codeStr) {

        codeStr = codeStr.replace("\r", "");

        if (codeStr.contains("#ifndef")){
            codeStr = codeStr.replace(/#ifndef.*/g, function(match){
                return Array(match.length+1).join(" ");
            });
            this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
        }
        if (codeStr.contains("#define")){
            codeStr = codeStr.replace(/#define.*/g, function(match){
                return Array(match.length+1).join(" ");
            });
            this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
        }
        if (codeStr.contains("#endif")){
            codeStr = codeStr.replace(/#endif.*/g, function(match){
                return Array(match.length+1).join(" ");
            });
            this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
        }
        // if (codeStr.contains("#include")){
        //     codeStr = codeStr.replace(/#include.*/g, function(match){
        //         return Array(match.length+1).join(" ");
        //     });
        //     // TODO NEW why is this commented?
        //     // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
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
            this.send("otherError", "Lobster doesn't support using declarations at the moment.");
        }
        return codeStr;
    },

    i_preprocess : function(codeStr) {
        this.i_includeMapping = [];
        this.i_currentIncludeOffset = 0;
        this.i_currentIncludeLineNumber = 1;
    },

    i_preprocessImpl : function(codeStr) {

        // NOTE: carriage returns should be filtered out previously to calling this function

        var currentIncludeOffset = 0;
        var currentIncludeLineNumber = 1;

        // TODO NEW implement this!
        // Find array of included filenames
        // [^\S\n] is a character class for all whitespace other than newlines
        codeStr = codeStr.replace(/#include[^\S\n]+"(.*)"/g,
            function(includeLine, offset, original) {

                var mapping = {};

                // Find the line number of this include by adding up the number of newline characters
                // since the offset of the last match up to the current one. Add this to the line number.
                for(var i = currentIncludeOffset; i < offset; ++i) {
                    if (original[i] === "\n") {
                        ++currentIncludeLineNumber;
                    }
                }
                currentIncludeOffset = offset;
                mapping.startLine = currentIncludeLineNumber;

                // extract the filename from the #include line match
                // [1] yields only the match for the part of the regex in parentheses
                var filename = includeLine.match(/"(.*)"/)[1];

                // filter and preprocess the include recursively
                var includedSource = this.i_program.getSourceFile(filename).getSourceCode();
                includedSource = this.i_filterSourceCode(includedSource);
                includeResults = this.i_preprocessImpl(includedSource);
                includeSource = includeResults.source;

                // count the number of lines in the included source
                for(var i = 0)


                // count number of included lines and update





            }
        );

        // Replace each with


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

		// List of calls. Currently this is just here so they can be checked later to see if they're all linked.
        // TODO NEW I believe other code breaks the interface to get at this. Fix that.
        this.i_calls = [];

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


        var cassert = FunctionEntity.instance(MagicFunctionDefinition.instance(
            "assert",
            Types.Function.instance(Types.Void.instance(), [Types.Bool.instance()])
        ));
        this.globalScope.addEntity(cassert);

        var pause = FunctionEntity.instance(MagicFunctionDefinition.instance(
            "pause",
            Types.Function.instance(Types.Void.instance(), [])
        ));
        this.globalScope.addEntity(pause);


        var pauseIf = FunctionEntity.instance(MagicFunctionDefinition.instance(
            "pauseIf",
            Types.Function.instance(Types.Void.instance(), [Types.Bool.instance()])
        ));
        this.globalScope.addEntity(pauseIf);


        this.globalScope.addEntity(FunctionEntity.instance(
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
    },

    addCall : function(call){
        this.i_calls.push(call)
    }
});
Lobster.CPP.TranslationUnit = TranslationUnit;
