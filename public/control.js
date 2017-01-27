var UMichEBooks = UMichEBooks || {};

UMichEBooks.Control = {};

var Control = UMichEBooks.Control;


//Control.Compound = Control.Block = CPPCode.extend({
//    _name: "Block",
//    init: function (code) {
//        this.initParent(code);
//        this.length = this.code.statements.length;
//    },
//    compile : function(parentScope){
//
//		this.scope = Scope.instance(parentScope);
//
//		// Compile all the statements
//		this.statements = [];
//		for(var i = 0; i < this.length; ++i){
//			var stmt = this.statements[i] = Statements.create(this.code.statements[i]);
//			this.semanticProblems.pushAll(stmt.compile(this.scope));
//		}
//
//		return this.semanticProblems;
//	},
//
//
//
//    done : function(sim, inst){
//        inst.removeHighlight(this.highlight);
//
//        sim.memory.stack.popFrame();
//        sim.pop(inst);
//    },
//
//    upNext : function(sim, inst){
//        if (inst.index >= this.statements.length){
//            this.done(sim, inst);
//        }
//        else{
//            var nextStmt = this.statements[inst.index++];
//            nextStmt.createAndPushInstance(sim, inst);
//        }
//        return true;
//    },
//
//	stepForward : function(sim, inst){
//		// No work to be done here? Should be enough to delegate to statements
//        // via upNext.
//	}
//});




//Control.While = function(code, sim, parentScope) {
//	this.code = code;
//	this.sim = sim;
//	this.scope = {vars:{}, parent:parentScope};
//	this.index = "cond";
//};
//
//Control.While.prototype = {
//	stepForward : function(){
//		var sim = this.sim;
//	// index of -1 indicates we are testing the condition
//		if (this.index == "cond") {
//			var cond = this.code["while"];
//			if (!sim.evaluateExpression(cond, this.scope)){
//				sim.pop(inst); // don't enter the body again
//			}
//			else{
//				// else just leave on stack and next time enter body
//				this.index = 0;
//			}
//			sim.highlightCodeShadow(cond.start, cond.end);
//			return;
//		}
//
//		sim.runStatement(this.code.body[this.index], this.scope);
//		this.index++;
//		if (this.index >= this.code.body.length){
//			this.index = "cond";
//		}
//	}
//};

Control.For = function(code, sim, parentScope) {
	// alert(JSON.stringify(code, null, 4));
	this.code = code;
	this.sim = sim;
	this.scope = {vars:{}, parent:parentScope};
	this.index = "init";
};
	
Control.For.prototype = {
	stepForward : function(){
		var sim = this.sim;
	// index of -1 indicates we are testing the condition
		if (this.index == "init") {
			var init = this.code.init;
			
			if (!init){
			}
			else if (init.declaration){
				sim.runStatement(init, this.scope);
			}
			else if (init.expr){
				sim.evaluateExpression(init, this.scope);
				sim.highlightCodeShadow(init.expr.start, init.expr.end);
			}
			this.index = "cond"
		}
		else if (this.index == "cond"){
			var cond = this.code["for"];
			if (!sim.evaluateExpression(cond, this.scope)){
				sim.pop(inst); // don't enter the body again
			}
			else{
				// else just leave on stack and next time enter body
				this.index = 0;
			}
			sim.highlightCodeShadow(cond.start, cond.end);
		}
		else if (this.index == "post"){
			var post = this.code.post;
			sim.evaluateExpression(post, this.scope);
			sim.highlightCodeShadow(post.start, post.end);
			this.index = "cond";
		}
		else { // index must be numeric
			var body = this.code.body;
			sim.runStatement(body[this.index], this.scope);
			this.index++;
			if (this.index >= body.length){
				this.index = "post";
			}
		}
	}
};