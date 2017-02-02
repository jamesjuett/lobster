/**
 * @author James
 */

var UMichEBooks = UMichEBooks || {};
UMichEBooks.CPP = UMichEBooks.CPP || {};

var IDLE_MS_BEFORE_COMPILE = 1000;

var Simulation = UMichEBooks.CPP.Simulation = DataPath.extend({
    _name: "Simulation",

    MAX_SPEED: -13445, // lol

    init: function(){
        this.initParent();

        this.speed = Simulation.MAX_SPEED;
        this.performTCO = false;

        this.codeStr = "";
        this.actions = [];

        // Things that don't change while simulation is running
        // Only change when recompiled
        this.globalScope = NamespaceScope.instance("", null, this);
        this.topLevelDeclarations = [];
        this.semanticProblems = SemanticProblems.instance();
        this.staticObjects = [];
        this.staticIntializers = [];
        this.main = false;

        this.code = ValueEntity.instance("code", "");
        this.listenTo(this.code);


        // These things need be reset when the simulation is reset
        this.memory = Memory.instance();
        this._execStack = [];
        this.console = ValueEntity.instance("console", "");
        this.pendingNews = [];
        this.leakCheckIndex = 0;

        return this;
    },

    hasSemanticErrors : function(){
        return this.semanticProblems.errors.length > 0;
    },

    addStatic : function(obj){
        this.staticObjects.push(obj);
    },

    addStaticInitializer : function(decl){
        this.staticIntializers.push(decl);
    },

    setTCO : function(performTCO){
        this.performTCO = performTCO;
    },

    codeSet : function(codeStr){

        if(this.codeSetTimeout){
            clearTimeout(this.codeSetTimeout);
        }
        var self = this;
        this.codeSetTimeout = setTimeout(function(){
            self.setCodeStr(codeStr);
        }, IDLE_MS_BEFORE_COMPILE);
    },

    setCodeStr : function(codeStr){
        codeStr += "\n";
		try{
            this.codeStr = codeStr;
            this.clear();
			this.stepsTaken = 0;
            this.actions = [];

            var errMsg = false;
            if (codeStr.contains("#ifndef")){
                codeStr = codeStr.replace(/#ifndef.*/g, function(match){
                    return Array(match.length+1).join(" ");
                });
                errMsg = true;
                this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#include</span>). They aren't supported at the moement, but you shouldn't need them. Don't worry, you can still use <span class='code'>cout</span>.");
            }
            if (codeStr.contains("#define")){
                codeStr = codeStr.replace(/#define.*/g, function(match){
                    return Array(match.length+1).join(" ");
                });
                errMsg = true;
                this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#include</span>). They aren't supported at the moement, but you shouldn't need them. Don't worry, you can still use <span class='code'>cout</span>.");
            }
            if (codeStr.contains("#endif")){
                codeStr = codeStr.replace(/#endif.*/g, function(match){
                    return Array(match.length+1).join(" ");
                });
                errMsg = true;
                this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#include</span>). They aren't supported at the moement, but you shouldn't need them. Don't worry, you can still use <span class='code'>cout</span>.");
            }
            if (codeStr.contains("#include")){
                codeStr = codeStr.replace(/#include.*/g, function(match){
                    return Array(match.length+1).join(" ");
                });
               // errMsg = true;
               // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#include</span>). They aren't supported at the moement, but you shouldn't need them. Don't worry, you can still use <span class='code'>cout</span>.");
            }
            if (codeStr.contains("using namespace")){
                codeStr = codeStr.replace(/using namespace.*/g, function(match){
                    return Array(match.length+1).join(" ");
                });
               // errMsg = true;
               // this.send("otherError", "When writing code in lobster, you don't need to include using directives (e.g. <span class='code'>using namespace std;</span>).");
            }
            if (codeStr.contains("using std::")){
                codeStr = codeStr.replace(/using std::.*/g, function(match){
                    return Array(match.length+1).join(" ");
                });
                errMsg = true;
                this.send("otherError", "Lobster doesn't support using declarations at the moment.");
            }

            //console.log(codeStr);

            Types.userTypeNames = copyMixin(Types.defaultUserTypeNames);
            //console.log("before parsing");

            //Use for building parser :p
            //console.log(PEG.buildParser(codeStr,{
            //    cache: true,
            //    allowedStartRules: ["start", "function_body", "member_declaration", "declaration"],
            //    output: "source"
            //}));
            //return;

            var parsed = UMichEBooks.cPlusPlusParser.parse(codeStr);
            //console.log(JSON.stringify(parsed));

            if(!errMsg){this.send("parsed");}

            this.compile(parsed);

            if (!this.main){
                this.send("otherError", "<span class='code'>main</span> function not found. (Make sure you're using only the int main() version with no arguments.)");
            }
            else if (this.hasSemanticErrors()) {
                this.send("semanticError", this.semanticProblems);
            }
            else if (!errMsg){this.send("compiled");}



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
	compile : function(code){
        var self = this;
        //console.log("compiling");
		this.sourceCode = code;
		this.semanticProblems.clear();
		this.topLevelDeclarations.clear();
		this.globalScope = NamespaceScope.instance("", null, this);
        this.staticObjects.clear();
        this.staticIntializers.clear();
        this.calls = [];
		this.main = false;

        this.send("clearAnnotations");

        // Just in case, clear run thread
        this.pause();

        this.coutEntity = StaticObjectEntity.instance({name:"cout", type:Types.OStream.instance()});
        this.globalScope.addEntity(this.coutEntity);

        this.cinEntity = StaticObjectEntity.instance({name:"cin", type:Types.IStream.instance()});
        this.globalScope.addEntity(this.cinEntity);

        this.endlEntity = StaticObjectEntity.instance({name:"endl", type:Types.String.instance()});
        this.endlEntity.defaultValue = "\\n";
        this.globalScope.addEntity(this.endlEntity);

        for(var i = 0; i < Types.Rank.values.length; ++i){
            var enumLit = Types.Rank.values[i];
            var ent = StaticObjectEntity.instance({name:enumLit, type:Types.Rank.instance()});
            ent.defaultValue = Types.Rank.valueMap[enumLit];
            this.globalScope.addEntity(ent);
        }

        for(var i = 0; i < Types.Suit.values.length; ++i){
            var enumLit = Types.Suit.values[i];
            var ent = StaticObjectEntity.instance({name:enumLit, type:Types.Suit.instance()});
            ent.defaultValue = Types.Suit.valueMap[enumLit];
            this.globalScope.addEntity(ent);
        }

        var make_face = FunctionEntity.instance(MagicFunctionDefinition.instance(
            "make_face",
            Types.Function.instance(Types.Void.instance(), [Types.Pointer.instance(Types.Int.instance())])
        ));
        this.globalScope.addEntity(make_face);

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








        var list_make_empty = FunctionEntity.instance(MagicFunctionDefinition.instance("list_make", Types.Function.instance(Types.List_t.instance(), [])));
        var list_make = FunctionEntity.instance(MagicFunctionDefinition.instance("list_make", Types.Function.instance(Types.List_t.instance(), [Types.Int.instance(), Types.List_t.instance()])));
        var list_isEmpty = FunctionEntity.instance(MagicFunctionDefinition.instance("list_isEmpty", Types.Function.instance(Types.Bool.instance(), [Types.List_t.instance()])));
        var list_first = FunctionEntity.instance(MagicFunctionDefinition.instance("list_first", Types.Function.instance(Types.Int.instance(), [Types.List_t.instance()])));
        var list_rest = FunctionEntity.instance(MagicFunctionDefinition.instance("list_rest", Types.Function.instance(Types.List_t.instance(), [Types.List_t.instance()])));
        var list_print = FunctionEntity.instance(MagicFunctionDefinition.instance("list_print", Types.Function.instance(Types.Void.instance(), [Types.List_t.instance()])));
        var list_magic_reverse = FunctionEntity.instance(MagicFunctionDefinition.instance("list_magic_reverse", Types.Function.instance(Types.List_t.instance(), [Types.List_t.instance()])));
        var list_magic_append = FunctionEntity.instance(MagicFunctionDefinition.instance("list_magic_append", Types.Function.instance(Types.List_t.instance(), [Types.List_t.instance(), Types.List_t.instance()])));

        this.globalScope.addEntity(list_make_empty);
        this.globalScope.addEntity(list_make);
        this.globalScope.addEntity(list_isEmpty);
        this.globalScope.addEntity(list_first);
        this.globalScope.addEntity(list_rest);
        this.globalScope.addEntity(list_print);
        this.globalScope.addEntity(list_magic_reverse);
        this.globalScope.addEntity(list_magic_append);



        var emptyList = StaticObjectEntity.instance({name:"EMPTY", type:Types.List_t.instance()});
        emptyList.defaultValue = [];
        this.globalScope.addEntity(emptyList);
        this.addStatic(emptyList);


        var tree_make_empty = FunctionEntity.instance(MagicFunctionDefinition.instance("tree_make", Types.Function.instance(Types.Tree_t.instance(), [])));
        var tree_make = FunctionEntity.instance(MagicFunctionDefinition.instance("tree_make", Types.Function.instance(Types.Tree_t.instance(), [Types.Int.instance(), Types.Tree_t.instance(), Types.Tree_t.instance()])));
        var tree_isEmpty = FunctionEntity.instance(MagicFunctionDefinition.instance("tree_isEmpty", Types.Function.instance(Types.Bool.instance(), [Types.Tree_t.instance()])));
        var tree_elt = FunctionEntity.instance(MagicFunctionDefinition.instance("tree_elt", Types.Function.instance(Types.Int.instance(), [Types.Tree_t.instance()])));
        var tree_left = FunctionEntity.instance(MagicFunctionDefinition.instance("tree_left", Types.Function.instance(Types.Tree_t.instance(), [Types.Tree_t.instance()])));
        var tree_right = FunctionEntity.instance(MagicFunctionDefinition.instance("tree_right", Types.Function.instance(Types.Tree_t.instance(), [Types.Tree_t.instance()])));
        var tree_print = FunctionEntity.instance(MagicFunctionDefinition.instance("tree_print", Types.Function.instance(Types.Void.instance(), [Types.Tree_t.instance()])));

        this.globalScope.addEntity(tree_make_empty);
        this.globalScope.addEntity(tree_make);
        this.globalScope.addEntity(tree_isEmpty);
        this.globalScope.addEntity(tree_elt);
        this.globalScope.addEntity(tree_left);
        this.globalScope.addEntity(tree_right);
        this.globalScope.addEntity(tree_print);



        this.globalFunctionContext = MagicFunctionDefinition.instance("globalFuncContext", Types.Function.instance(Types.Void.instance(), []));
        for(var i = 0; i < code.length; ++i){
            var decl = Declarations.create(code[i], {parent: null, func: this.globalFunctionContext});
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
        this.calls.forEach(function(call){
            linkingProblems.pushAll(call.link());
        });
        this.semanticProblems.pushAll(linkingProblems);

        var annotatedCalls = {};
        // Tail Recursion Analysis
        for(var i = 0; i < this.topLevelDeclarations.length; ++i){
            decl = this.topLevelDeclarations[i];
            if (isA(decl, FunctionDefinition)){
                decl.tailRecursionAnalysis(annotatedCalls);
            }
            this.semanticProblems.pushAll(decl.semanticProblems);
        }

        this.annotate();

        //look for main
        try{
            this.main = this.globalScope.requiredLookup("main", {paramTypes: []});
        }
        catch(e){
            if (!isA(e, SemanticExceptions.BadLookup)){
                console.log(e.stack);
                throw e;
            }
        }

	},

    addCall : function(call){
        this.calls.push(call)
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

    restart : function(){
//        this.clear();
        this.pause();
        this.start();
    },

    clear : function(){
    },

	start : function(){
		this.stepsTaken = 0;
        this.seedRandom("random seed");
        this.actions = [];
        this.send("cleared");
        this._execStack.length = 0;
        this.console.setValue("");

		this.memory.reset(); //= Memory.instance(this.globalScope);

        this.pendingNews = [];
        this.leakCheckIndex = 0;



        this.currentFunction = null;
        var mainCall = this.mainCall = FunctionCall.instance(null, {mainCall:true});
        mainCall.compile(this.globalScope, this.main, []);
        this.mainInst = mainCall.createAndPushInstance(this, null);
		//var mainInst = this.main.decl.createAndPushInstance(this);

        for(var i = this.staticObjects.length - 1; i >= 0; --i){
            this.memory.allocateStatic(this.staticObjects[i]);
        }
        for(var i = this.staticIntializers.length - 1; i >= 0; --i){
            this.staticIntializers[i].createAndPushInstance(this, this.mainInst);
        }

		this.started = true;
        this.atEnd = false;
        this.send("started");

        // Needed for whatever is first on the execution stack
        this.upNext();

        // Get through all static initializers and stuff before main
        if (this.staticIntializers.length > 0){
            this.mainInst.setPauseWhenUpNext();
            this.paused = false;
            while (!this.paused){
                this.stepForward();
                this.stepsTaken = 0; // TODO remove hack. make outlet count user steps
            }
            this.paused = false;
        }

        this.stepsTaken = 0; // this is needed here as well since stepForward right below may spawn some instances that capture stepsTaken from simulation
        this.stepForward(); // To call main
        this.stepsTaken = 0;

	},
	
	push : function(codeInstance){
        // REMOVED: Instances should individually make themselves wait
        //if(codeInstance.parent){
        //    codeInstance.parent.wait();
        //}

		this._execStack.push(codeInstance);
		codeInstance.pushed(this);
		this.send("pushed", codeInstance, this);
	},

    popUntil : function(inst){
        while(this._execStack.length > 0 && this._execStack.last() !== inst){
            this.pop();
        }
    },
	
	// REQUIRES: query is either a string indicating a stackType
	//           or an instance on the stack.
	pop : function(query, returnArray){
		if (query){
			var poppedArr = [];
			var popped;
			while (this._execStack.length > 0){
				popped = this._execStack.pop();
				popped.popped(this);
                if (isA(popped.model, Statements.Statement)/* && !isA(popped.model, Statements.Return) && !isA(popped.model, Statements.Block) */|| isA(popped.model, FunctionDefinition)){
                    this.leakCheck();
                }

				poppedArr.push(popped);
				var current = (typeof query == "string" ? popped.stackType : popped);
				if (current == query){
					break;
				}
			}
			return (returnArray ? poppedArr : popped);
		}
		else{
			var popped = this._execStack.pop();
            popped.popped(this);
            if (isA(popped.model, Statements.Statement) /*&& !isA(popped.model, Statements.Return) && !isA(popped.model, Statements.Block) */|| isA(popped.model, FunctionDefinition)){
                this.leakCheck();
            }
			return popped;
		}
	},
	
	peek : function(query, returnArray, offset){
        if (this._execStack.length === 0){
            return null;
        }
		offset = offset || 0;
		if (query){
			var peekedArr = [];
			var peeked;
			for (var i = this._execStack.length - 1 - offset; i >= 0; --i){
				peeked = this._execStack[i];
				peekedArr.unshift(peeked);
                if (typeof query === "function"){
                    if (query(peeked)){
                        break;
                    }
                }
                else{
                    var current = (typeof query == "string" ? peeked.stackType : peeked);
                    if (current == query){
                        break;
                    }
                }
			}
			return (returnArray ? peekedArr : peeked);
		}
		else{
			return this._execStack.last();
		}
	},
	
	peeks : function(query, returnArray){
		var results = [];
		var offset = 0;
		while (offset < this._execStack.length){
			var p = this.peek(query, true, offset);
			offset += p.length;
			results.unshift(returnArray ? p : p[0]);
		}
		return results;
	},

    setAnimationsOn : function(animOn){
        if (animOn){
            //CPPCodeInstance.silent = false;
//        this.silent = false;
            Outlets.CPP.CPP_ANIMATIONS = true;
            $.fx.off = false;
            this.alertsOff = false;
            this.explainOff = false;
            $("body").removeClass("noTransitions").height(); // .height() is to force reflow

        }
        else{
            $("body").addClass("noTransitions").height(); // .height() is to force reflow
            this.alertsOff = true;
            this.explainOff = true;
            $.fx.off = true;
            Outlets.CPP.CPP_ANIMATIONS = false; // TODO not sure I need this
//        this.silent = true;
//            CPPCodeInstance.silent = true;
        }
    },

    clearRunThread: function(){
        if (this.runThread){
            this.runThreadClearedFlag = true;
            clearTimeout(this.runThread);
            this.runThread = null;
        }
    },

    startRunThread: function(func){
        this.runThread = setTimeout(func, 0);
    },

    autoRun : function(options){
        options = options || {};

        // Clear old thread
        this.clearRunThread();

        this.paused = false;

        var self = this;
        var func = function(){

            // Try to complete this.speed number of steps in 10ms.
            var startTime = Date.now();
            for(var num = 0; self.speed === Simulation.MAX_SPEED || num < self.speed; ++num){

                // Did we finish?
                if (self.atEnd){
                    self.send("finished");
                    options.onFinish && options.onFinish();
                    options.after && options.after();
                    return; // do not renew timeout
                }

                // Did we pause?
                if (self.paused || (options.pauseIf && options.pauseIf(self))){
                    self.send("paused");
                    options.onPause && options.onPause();
                    options.after && options.after();
                    return; // do not renew timeout
                }

                // Abort if we run out of time
                if (Date.now() - startTime >= (self.speed === Simulation.MAX_SPEED ? 10 : 100) ){
                    break; // will renew timeout
                }

                self.stepForward();
            }

            // Renew timeout
            if (self.speed === Simulation.MAX_SPEED){
                self.runThread = setTimeout(func, 0);
            }
            else{
                self.runThread = setTimeout(func, Math.max(0,100-(Date.now() - startTime)));
            }

        };

        // Start timeout
        this.startRunThread(func);
    },

    stepOver: function(options){
        var target = this.peek(function(inst){
            return isA(inst.model, Initializer) || isA(inst.model, Expressions.FunctionCallExpr) || !isA(inst.model, Expressions.Expression);
        });

        if (target) {
            this.autoRun(copyMixin(options, {
                pauseIf: function(){
                    return target.hasBeenPopped;
                }
            }));
        }
        else{
            this.stepForward();
            options.after && options.after();
        }
    },

    stepOut: function(options){
        var target = this._execStack.last().executionContext();

        if (target) {
            this.autoRun(copyMixin(options, {
                pauseIf: function(){
                    return target.hasBeenPopped;
                }
            }));
        }
        else{
            this.stepForward();
            options.after && options.after();
        }
    },

	stepForward : function(n){
        n = n || 1;

        for(var i = 0; !this.atEnd && i < n; ++i){
            this._stepForward();
        }

        this.send("afterFullStep", this._execStack.length > 0 && this._execStack.last());
	},

    _stepForward : function(){
        if(this._execStack.length > 0) {
            ++this.stepsTaken;
            this.actions.push("stepForward");
        }

        // Loop indefinitely until we find something that counts as a "step"
        var keepGoing = true;
        while(keepGoing){
            if (this._execStack.length > 0){
                // There are things to do, pop top instance
                var inst = this._execStack.last();

                // Call stepForward on inst, if returns truthy value it means keep going
                this.send("beforeStepForward", {inst: inst});
                keepGoing = inst.stepForward(this);
                this.send("afterStepForward", {inst: inst, keepGoing: keepGoing});

                // After each step call upNext
                this.upNext();
            }
            else{
                // We're done
                this.atEnded();
                break;
            }
        }
    },

	stepBackward : function(n){
        if (n === 0){
            return;
        }
        n = n || 1;
		$.fx.off = true;
		Outlets.CPP.CPP_ANIMATIONS = false; // TODO not sure I need this
        this.alertsOff = true;
        this.explainOff = true;
        $("body").addClass("noTransitions").height(); // .height() is to force reflow
        //CPPCodeInstance.silent = true;
		if (this.stepsTaken > 0){
			this.clear();
			var steps = this.stepsTaken-n;
            var actions = this.actions;
			this.start();
			for(var i = 0; i < steps; ++i){
//                if (actions[i] === "stepForward") {
                    this.stepForward();
//                }
			}
		}
        //CPPCodeInstance.silent = false;
        $("body").removeClass("noTransitions").height(); // .height() is to force reflow
        this.alertsOff = false;
        this.explainOff = false;
        Outlets.CPP.CPP_ANIMATIONS = true;
		$.fx.off = false;

	},
	
	upNext : function(){
        var inst = false;
		while(this._execStack.length > 0){
            if (this._execStack.last() === inst){
                break;
            }
            inst = this._execStack.last();
//            debug("calling upNext for " + inst.instanceString(), "Simulation");
            this.send("beforeUpNext", {inst: inst});
            var skip = inst.upNext(this);
            //this.explain(inst.explain());
            //debug(this._execStack.map(function(elem){return elem.model._name + ", " + elem.index;}).join("\n"), "execStack");
            this.send("afterUpNext", {inst: inst, skip: skip});

            if(!skip){
                break;
            }
		// else if (this.stmtStack.length > 0){
			// this.stmtStack.last().upNext(this);
		// }
		// else if (this.controlStack.length > 0){
			// this.controlStack.last().upNext(this);
		// }
		// else if (this.callStack.length > 0){
			// this.callStack.last().upNext(this);
		// }
		}
	},
    cout : function(value){
        if(isA(value.type, Types.Pointer) && isA(value.type.ptrTo, Types.Char)){
            var text = "";
            var addr = value.value;
            var c = this.memory.bytes[addr];
            while (c){
                text += Types.Char.coutString(c);
                c = this.memory.bytes[++addr];
            }
        }
        else{
            var text = escapeString(value.coutString());
        }
        this.console.setValue(this.console.value() + text);
    },
    cin : function(object){
        object.value = 4;
    },
    alert : function(message){
        if (!this.alertsOff){
            this.send("alert", message);
        }
    },
    crash : function(message){
        this.alert(message + "\n\n (Note: This is a nasty error and I may not be able to recover. Continue at your own risk.)");
    },
    explain : function(exp){
        //alert(exp.ignore);
        if (!this.explainOff){
            if (!exp.ignore) {
                this.send("explain", exp.message);
            }
        }
    },
    closeMessage : function(){
        this.send("closeMessage");
    },
    pause : function(){
        this.paused = true;
    },

    seedRandom : function(seed){
        Math.seedrandom(""+seed);
    },

    nextRandom : function(){
        return Math.random();
    },

    leakCheckChildren : function(obj){


        // If it's a pointer into an array, hypothetically we can get to anything else in the array,
        // so we need to add the whole thing to the frontier.
        // This also covers dynamic arrays - we never have a pointer to the array, but to elements in it.
        if (isA(obj.type, Types.ArrayPointer)){
            return [obj.type.arrObj];
        }
        else if (isA(obj.type, Types.Pointer)){
            var pointsTo = this.memory.getObject(obj);
            if (pointsTo && !isA(pointsTo, AnonObject)){
                return [pointsTo];
            }
        }
        else if (isA(obj.type, Types.Array)){
            return obj.elemObjects;
            //children.push(obj.elemObjects);
            //var elems = obj.rawValue();
            //var children = [];
            //for(var i = 0; i < elems.length; ++i){
            //    children.push(Value.instance(elems[i], obj.type.elemType));
            //}
            //return children;
        }
        else if (isA(obj.type, Types.Class)){
            return obj.subobjects;
            //var members = obj.subObjects;
            //var children = [];
            //for(var i = 0; i < members.length; ++i){
            //    children.push(Value.instance(elems[i]));
            //}
            //return children;
        }
        return [];
    },
    leakCheck : function(){
        //console.log("leak check running!");
        // Temporary place for testing leak check
        var heapObjectsMap = this.memory.heap.objectMap;
        for (var addr in heapObjectsMap) {
            var obj = heapObjectsMap[addr];
            if(this.leakCheckObj(obj)){
                obj.leaked(this);
            }
            else{
                obj.unleaked(this);
            }
        }
    },
    leakCheckObj : function(query) {
        ++this.leakCheckIndex;
        var frontier = [];
        for (var key in this.globalScope.entities) {
            var ent = this.globalScope.entities[key];
            if (isA(ent, ObjectEntity)){
                ent.leakCheckIndex = this.leakCheckIndex;
                frontier.push(ent);
            }
        }

        for(var i = 0; i < this.memory.stack.frames.length; ++i){
            var frameObjs = this.memory.stack.frames[i].objects;
            for (var key in frameObjs) {
                var ent = frameObjs[key];
                if (isA(ent, ObjectEntity)){
                    ent.leakCheckIndex = this.leakCheckIndex;
                    frontier.push(ent);
                }
            }
        }

        for(var i = 0; i < this.pendingNews.length; ++i){
            var obj = this.pendingNews[i];
            obj.leakCheckIndex = this.leakCheckIndex;
            frontier.push(obj);
        }

        for(var i = 0; i < this._execStack.length; ++i){
            var inst = this._execStack[i];
            var obj = inst.evalValue || (inst.func && inst.func.returnValue);
            if (obj && isA(obj, ObjectEntity)){
                obj.leakCheckIndex = this.leakCheckIndex;
                frontier.push(obj);
            }
            else if (obj && isA(obj, Value)){
                frontier.push(obj);
            }
        }

        for (var key in this.memory.temporaryObjects){
            var obj = this.memory.temporaryObjects[key];
            obj.leakCheckIndex = this.leakCheckIndex;
            frontier.push(obj);
        }

        while (frontier.length > 0) {
            var obj = frontier.shift();

            // Check if found
            if (obj === query){
                return false;
            }

            // Mark as visited
            obj.leakCheckIndex = this.leakCheckIndex;
            var children = this.leakCheckChildren(obj);
            for(var i = 0; i < children.length; ++i){
                var child = children[i];
                if (child.leakCheckIndex !== this.leakCheckIndex){
                    frontier.push(child);
                }
            }
        }
        return true;
    },
    atEnded : function(){
        this.atEnd = true;
        this.send("atEnded");
        //console.log("done!");
    },
    act : {
        sourceCode : "codeSet"
    }
});
