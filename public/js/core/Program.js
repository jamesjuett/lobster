/**
 * @author James
 */

var Lobster = Lobster || {};
Lobster.CPP = Lobster.CPP || {};

var Program = Lobster.CPP.Program = Class.extend(Observable, {

});

var TranslationUnit = Lobster.CPP.TranslationUnit = Class.extend(Observable, {
    _name: "TranslationUnit",

    init: function( ){
        this.initParent();

        // Things that don't change while simulation is running
        // Only change when recompiled
        this.globalScope = NamespaceScope.instance("", null, this);
        this.topLevelDeclarations = [];
        this.semanticProblems = SemanticProblems.instance(); // TODO NEW make this non-public

        this.staticEntities = [];
        this.i_main = false;

        return this;
    },

    hasSemanticErrors : function(){
        return this.semanticProblems.errors.length > 0;
    },

    addStaticEntity : function(obj){
        this.staticEntities.push(obj);
    },

    setSourceCode : function(codeStr){
        codeStr += "\n";
		try{
            this.i_sourceCode = codeStr;

            codeStr = this.i_filterSourceCode(codeStr);

            // Ensure user defined classes are recognized as types.
            // TODO NEW not sure this is the best place for it, though.
            Types.userTypeNames = copyMixin(Types.defaultUserTypeNames);

            // TODO NEW omg what a hack
            //Use for building parser :p
            //console.log(PEG.buildParser(codeStr,{
            //    cache: true,
            //    allowedStartRules: ["start", "function_body", "member_declaration", "declaration"],
            //    output: "source"
            //}));
            //return;

            var parsed = Lobster.cPlusPlusParser.parse(codeStr);

            // TODO NEW keep this?
            // this.send("parsed");

            this.compile(parsed);

            if (!this.i_main){
                this.send("otherError", "<span class='code'>main</span> function not found. (Make sure you're using only the int main() version with no arguments.)");
            }
            else if (this.hasSemanticErrors()) {
                this.send("semanticError", this.semanticProblems);
            }

            this.send("compiled");



		}
		catch(err){
			if (err.name == "SyntaxError"){
                this.send("syntaxError", {line: err.line, column: err.column, message: err.message});
				this.semanticProblems.clear();
			}
			else{
                this.send("unknownError");
                console.log(err.stack);
				throw err;
			}
		}
	},

    i_filterSourceCode : function(codeStr) {
        if (codeStr.contains("#ifndef")){
            codeStr = codeStr.replace(/#ifndef.*/g, function(match){
                return Array(match.length+1).join(" ");
            });
            this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#include</span>). They aren't supported at the moement, but you shouldn't need them. Don't worry, you can still use <span class='code'>cout</span>.");
        }
        if (codeStr.contains("#define")){
            codeStr = codeStr.replace(/#define.*/g, function(match){
                return Array(match.length+1).join(" ");
            });
            this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#include</span>). They aren't supported at the moement, but you shouldn't need them. Don't worry, you can still use <span class='code'>cout</span>.");
        }
        if (codeStr.contains("#endif")){
            codeStr = codeStr.replace(/#endif.*/g, function(match){
                return Array(match.length+1).join(" ");
            });
            this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#include</span>). They aren't supported at the moement, but you shouldn't need them. Don't worry, you can still use <span class='code'>cout</span>.");
        }
        if (codeStr.contains("#include")){
            codeStr = codeStr.replace(/#include.*/g, function(match){
                return Array(match.length+1).join(" ");
            });
            // TODO NEW why is this commented?
            // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#include</span>). They aren't supported at the moement, but you shouldn't need them. Don't worry, you can still use <span class='code'>cout</span>.");
        }
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

	compile : function(code){

        // Program.currentProgram = this;

        var self = this;
        //console.log("compiling");
		this.semanticProblems.clear();
		this.topLevelDeclarations.clear();
		this.globalScope = NamespaceScope.instance("", null, this);
        this.staticEntities.clear();
		this.i_main = null;

		// List of calls. Currently this is just here so they can be checked later to see if they're all linked.
        this.i_calls = [];

        // TODO NEW change
        this.send("clearAnnotations");

        this.i_createBuiltInGlobals();



        var globalFunctionContext = MagicFunctionDefinition.instance("globalFuncContext", Types.Function.instance(Types.Void.instance(), []));
        for(var i = 0; i < code.length; ++i){
            var decl = Declarations.create(code[i], {parent: null, func: globalFunctionContext});
            //console.log(decl.name);
            var declProblems = decl.tryCompileDeclaration(this.globalScope);
            this.topLevelDeclarations.push(decl);
        }

        for(var i = 0; i < this.topLevelDeclarations.length; ++i){
            decl = this.topLevelDeclarations[i];
            decl.tryCompileDefinition(this.globalScope);
        }

        // Linking
        var linkingProblems = SemanticProblems.instance();
        this.i_calls.forEach(function(call){
            linkingProblems.pushAll(call.checkLinkingProblems());
        });
        this.semanticProblems.pushAll(linkingProblems);

        var annotatedCalls = {};
        // Tail Recursion Analysis
        for(var i = 0; i < this.topLevelDeclarations.length; ++i){
            decl = this.topLevelDeclarations[i];
            // if (isA(decl, FunctionDefinition)){
            //     decl.tailRecursionAnalysis(annotatedCalls);
            // }
            this.semanticProblems.pushAll(decl.semanticProblems);
        }

        this.annotate();

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
    },

    annotate : function(){
        this.send("clearAnnotations");

        for(var i = 0; i < this.semanticProblems.errors.length; ++i){
            // alert(this.semanticProblems.get(i));
            this.send("addAnnotation", this.semanticProblems.errors[i]);
        }
        for(var i = 0; i < this.semanticProblems.warnings.length; ++i){
            // alert(this.semanticProblems.get(i));
            this.send("addAnnotation", this.semanticProblems.warnings[i]);
        }

        for(var i = 0; i < this.semanticProblems.widgets.length; ++i){
            // alert(this.semanticProblems.get(i));
            this.send("addAnnotation", this.semanticProblems.widgets[i]);
        }
    },

    mainEntity : function() {
        return this.i_main;
    }
});
