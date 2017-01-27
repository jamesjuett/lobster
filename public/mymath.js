
math.options.precision = 2;

//Yeah I know this is probably evil.
var oldGet = math.expr.Scope.prototype.get;
math.expr.Scope.prototype.get = function(name){
	var value = oldGet.call(this, name);
	if (value.isA(Entity)){
		value = value.value();
	}
	return value;
}

function VariableScope(args){
	math.expr.Scope.apply(this, arguments);
}

VariableScope.prototype = new math.expr.Scope();


math.expr.VariableScope = VariableScope

VariableScope.prototype.createSubScope = function(){
	// alert("sub scope uh oh!");
	var subScope = new math.expr.Scope(this);
	//subScope.parentScope = this;
	if (!this.subScopes){
		this.subScopes = [];
	}
	this.subScopes.push(subScope);
	return subScope;
}

VariableScope.prototype.get = function(name){
	var v = math.expr.Scope.prototype.get.call(this, name);
	if (v.isA(Entity)){
		// alert("getting " + name + " and returning " + v.value());
		return v.value();
	}
	else{
		// alert("getting " + name + " and returning " + v);
		return v;
	}
}

VariableScope.prototype.set = function(name, value){
	if (!this.has(name)){
		// alert(name + ": variable created and value set to " + value);
		
		if (value.isA(Function)){
			return math.expr.Scope.prototype.set.call(this, name, Func.instance(name, value, name)).value();
		}
		else{
			return math.expr.Scope.prototype.set.call(this, name, Variable.instance(name, value, name)).value();
		}
		
	}
	else{
		if (this.symbols[name] instanceof Entity){
			this.symbols[name].setValue(value);
		}
		// else if (this.symbols[name] instanceof Func){
			// this.symbols[name].setValue(value);
		// }
		else{
			this.symbols[name] = value;
		}
	}
}

VariableScope.prototype.remove = function(name){
	var vari = math.expr.Scope.prototype.get.call(this, name).setValue(value);
	math.expr.Scope.prototype.remove.call(this, name);
}

//A hack to make function toString reasonable
// var oldFunctionNode = math.expr.node.FunctionNode;
// // alert(FunctionNode);
// math.expr.node.FunctionNode = FunctionNode = function(name, variables, expr, functionScope, scope){
	// alert("hello!");
	// oldFunctionNode.call(this, name, variables, expr, functionScope, scope);
	// var exprString = expr.toString();
	// this.fn.toString = function(){
		// return name + "(" + variables.join(", ") + ") = " + exprString;
	// }
// }

function initMathExprs(){
	$(".mathExpr").attr("draggable", "true");
	$(".mathExpr").on("dragstart", function(ev){
		ev.originalEvent.dataTransfer.setData("Text", $(this).html().replace(/\s{2,}/g, ' ').replace(/<br>/g, "\n").replace(/\s*\n\s*/g, "\n").trim() + "\n");
	});//bind("drag");
	$(".mathExpr").click(function(ev){
		$("#eval_input").val($(this).html().replace(/\s{2,}/g, ' ').replace(/<br>/g, "\n").replace(/\s*\n\s*/g, "\n").trim() + "\n");
		$("#eval_button").trigger("click");
	});
}

// dragStart : function(ev){
		// ev.dataTransfer.setData("Text", this.id());
		// // ev.dataTransfer.setDragImage($(".ent-0").get(0),0,0);
	// },
	// dragleave : function(ev, outlet){
		// this.refreshOutlet(outlet);
	// },
	// dragover : function (ev, outlet){
		// var trans = ev.dataTransfer.getData("Text");
		// //ev.dataTransfer.setDragImage(0,0,0);
		// if(ev.shiftKey){
			// this.insRightMarker(outlet);
		// }
		// else{
			// this.insLeftMarker(outlet);
		// }
	// },
	// drop : function(ev, outlet){
		// if(ev.shiftKey){
			// this.insRight(outlet, ALL_ENTITIES[ev.dataTransfer.getData("Text")]);
		// }
		// else{
			// this.insLeft(outlet, ALL_ENTITIES[ev.dataTransfer.getData("Text")]);
		// }
	// }