"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var observe_1 = require("../util/observe");
var runtimeEnvironment_1 = require("./runtimeEnvironment");
var util_1 = require("../util/util");
var objects_1 = require("./objects");
var functions_1 = require("./functions");
var types_1 = require("./types");
var SimulationEvent;
(function (SimulationEvent) {
    SimulationEvent["UNDEFINED_BEHAVIOR"] = "undefined_behavior";
    SimulationEvent["UNSPECIFIED_BEHAVIOR"] = "unspecified_behavior";
    SimulationEvent["IMPLEMENTATION_DEFINED_BEHAVIOR"] = "implementation_defined_behavior";
    SimulationEvent["MEMORY_LEAK"] = "memory_leak";
    SimulationEvent["ASSERTION_FAILURE"] = "assertion_failure";
    SimulationEvent["CRASH"] = "crash";
})(SimulationEvent = exports.SimulationEvent || (exports.SimulationEvent = {}));
// TODO: add observer stuff
var Simulation = /** @class */ (function () {
    function Simulation(program) {
        this.observable = new observe_1.Observable(this);
        this.random = new util_1.CPPRandom();
        // TODO: is this actually set anwhere?
        this.alertsOff = false;
        this._eventsOccurred = {
            "undefined_behavior": [],
            "unspecified_behavior": [],
            "implementation_defined_behavior": [],
            "memory_leak": [],
            "assertion_failure": [],
            "crash": []
        };
        this.eventsOccurred = this._eventsOccurred;
        this.isPaused = true;
        this.program = program;
        // TODO SimulationRunner this.speed = Simulation.MAX_SPEED;
        // These things need be reset when the simulation is reset
        this.memory = new runtimeEnvironment_1.Memory();
        // this.console = ValueEntity.instance("console", "");
        this.execStack = this._execStack = [];
        this.pendingNews = [];
        this.leakCheckIndex = 0;
        this.isPaused = true;
        this.stepsTaken = 0;
        this.atEnd = false;
        this.start();
    }
    Simulation.prototype.start = function () {
        this.allocateStringLiterals();
        // Change static initialization so it is wrapped up in its own construct and
        // runtime construct pair specifically for that purpose. That construct could
        // also optionally create and push the main call taking over what is currently
        // in this.callMain()
        this.callMain();
        this.push(this.program.globalObjectAllocator.createRuntimeConstruct(this));
        this.observable.send("started");
        // Needed for whatever is first on the execution stack
        this.upNext();
    };
    Simulation.prototype.callMain = function () {
        this.mainReturnObject = new objects_1.MainReturnObject(this.memory);
        this.mainFunction = new functions_1.RuntimeFunction(this.program.mainFunction, this);
        this.mainFunction.setReturnObject(this.mainReturnObject);
        this.mainFunction.pushStackFrame();
        this.push(this.mainFunction);
        this.mainFunction.gainControl();
    };
    Simulation.prototype.push = function (rt) {
        this._execStack.push(rt);
        rt.pushed();
        this.observable.send("pushed", rt);
    };
    Simulation.prototype.top = function () {
        if (this.execStack.length > 0) {
            return this.execStack[this.execStack.length - 1];
        }
    };
    /**
     * Removes the top runtime construct from the execution stack.
     * Does nothing if there's nothing on the execution stack.
     */
    Simulation.prototype.pop = function () {
        var popped = this._execStack.pop();
        // if (popped) {
        //     popped.popped();
        //     if (popped.stackType === "statement" || popped.stackType === "function") {
        //         this.leakCheck(); // TODO leak checking
        //     }
        // }
        return popped;
    };
    //TODO: this may be dangerous depending on whether there are cases this could skip temporary deallocators or destructors
    Simulation.prototype.popUntil = function (rt) {
        while (this._execStack.length > 0 && this._execStack[this._execStack.length - 1] !== rt) {
            this.pop();
        }
    };
    Simulation.prototype.topFunction = function () {
        for (var i = this.execStack.length - 1; i >= 0; --i) {
            var runtimeConstruct = this.execStack[i];
            if (runtimeConstruct instanceof functions_1.RuntimeFunction) {
                return runtimeConstruct;
            }
        }
    };
    Simulation.prototype.allocateStringLiterals = function () {
        var _this = this;
        var tus = this.program.translationUnits;
        for (var tuName in tus) {
            tus[tuName].stringLiterals.forEach(function (lit) { _this.memory.allocateStringLiteral(lit); });
        }
        ;
    };
    Simulation.prototype.stepForward = function (n) {
        if (n === void 0) { n = 1; }
        for (var i = 0; !this.atEnd && i < n; ++i) {
            this._stepForward();
        }
        this.observable.send("afterFullStep", this.execStack.length > 0 && this.execStack[this.execStack.length - 1]);
    };
    Simulation.prototype._stepForward = function () {
        // Top rt construct will do stuff
        var rt = this.top();
        if (!rt) {
            return;
        }
        // Step forward on the rt construct
        this.observable.send("beforeStepForward", { rt: rt });
        rt.stepForward();
        this.observable.send("afterStepForward", { rt: rt });
        ++this.stepsTaken;
        // After each step call upNext. Note that the "up next" construct may
        // be different if rt popped itself off the stack. upNext also checks
        // to see if the simulation is done.
        this.upNext();
    };
    Simulation.prototype.upNext = function () {
        while (true) {
            // Grab the rt construct that is on top of the execution stack and up next
            var rt = this.top();
            // Check to see if simulation is done
            if (!rt) {
                this.atEnd = true;
                this.observable.send("atEnded");
                return;
            }
            // up next on the rt construct
            this.observable.send("beforeUpNext", { rt: rt });
            rt.upNext();
            this.observable.send("afterUpNext", { inst: rt });
            // If the rt construct on top of the execution stack has changed, it needs
            // to be notified that it is now up next, so we should let the loop go again.
            // However, if rt is still on top, we presume it is waiting for the next
            // stepForward (and it hasn't added any children), so we just break the loop.
            // Note that if the execution stack becomes empty, we do not hit the break (because
            // we can assume at this point it was not empty previously) and will loop back to
            // the top where the check for an empty stack is performed.
            if (rt === this.top()) {
                break; // Note this will not occur when then 
            }
        }
    };
    Simulation.prototype.stepToEnd = function () {
        while (!this.atEnd) {
            this.stepForward();
        }
    };
    // stepOver: function(options){
    //     var target = this.peek(function(inst){
    //         return isA(inst.model, Initializer) || isA(inst.model, Expressions.FunctionCallExpression) || !isA(inst.model, Expressions.Expression);
    //     });
    //     if (target) {
    //         this.autoRun(copyMixin(options, {
    //             pauseIf: function(){
    //                 return !target.isActive;
    //             }
    //         }));
    //     }
    //     else{
    //         this.stepForward();
    //         options.after && options.after();
    //     }
    // },
    // stepOut: function(options){
    //     var target = this.i_execStack.last().containingFunction();
    //     if (target) {
    //         this.autoRun(copyMixin(options, {
    //             pauseIf: function(){
    //                 return !target.isActive;
    //             }
    //         }));
    //     }
    //     else{
    //         this.stepForward();
    //         options.after && options.after();
    //     }
    // },
    // stepBackward : function(n){
    //     if (n === 0){
    //         return;
    //     }
    //     n = n || 1;
    // 	$.fx.off = true;
    // 	Outlets.CPP.CPP_ANIMATIONS = false; // TODO not sure I need this
    //     this.i_alertsOff = true;
    //     this.i_explainOff = true;
    //     $("body").addClass("noTransitions").height(); // .height() is to force reflow
    //     //RuntimeConstruct.prototype.silent = true;
    // 	if (this.i_stepsTaken > 0){
    // 		this.clear();
    // 		var steps = this.i_stepsTaken-n;
    // 		this.start();
    // 		for(var i = 0; i < steps; ++i){
    //             this.stepForward();
    // 		}
    // 	}
    //     //RuntimeConstruct.prototype.silent = false;
    //     $("body").removeClass("noTransitions").height(); // .height() is to force reflow
    //     this.i_alertsOff = false;
    //     this.i_explainOff = false;
    //     Outlets.CPP.CPP_ANIMATIONS = true;
    // 	$.fx.off = false;
    // },
    // peek : function(query, returnArray, offset){
    //     if (this.i_execStack.length === 0){
    //         return null;
    //     }
    // 	offset = offset || 0;
    // 	if (query){
    // 		var peekedArr = [];
    // 		var peeked;
    // 		for (var i = this.i_execStack.length - 1 - offset; i >= 0; --i){
    // 			peeked = this.i_execStack[i];
    // 			peekedArr.unshift(peeked);
    //             if (typeof query === "function"){
    //                 if (query(peeked)){
    //                     break;
    //                 }
    //             }
    //             else{
    //                 var current = (typeof query == "string" ? peeked.stackType : peeked);
    //                 if (current == query){
    //                     break;
    //                 }
    //             }
    // 		}
    // 		return (returnArray ? peekedArr : peeked);
    // 	}
    // 	else{
    // 		return this.i_execStack.last();
    // 	}
    // },
    // peeks : function(query, returnArray){
    // 	var results = [];
    // 	var offset = 0;
    // 	while (offset < this.i_execStack.length){
    // 		var p = this.peek(query, true, offset);
    // 		offset += p.length;
    // 		results.unshift(returnArray ? p : p[0]);
    // 	}
    // 	return results;
    // },
    // clearRunThread: function(){
    //     if (this.runThread){
    //         this.runThreadClearedFlag = true;
    //         clearTimeout(this.runThread);
    //         this.runThread = null;
    //     }
    // },
    // startRunThread: function(func){
    //     this.runThread = setTimeout(func, 0);
    // },
    // autoRun : function(options){
    //     options = options || {};
    //     // Clear old thread
    //     this.clearRunThread();
    //     this.i_paused = false;
    //     var self = this;
    //     var func = function(){
    //         // Try to complete this.speed number of steps in 10ms.
    //         var startTime = Date.now();
    //         for(var num = 0; self.speed === Simulation.MAX_SPEED || num < self.speed; ++num){
    //             // Did we finish?
    //             if (self.i_atEnd){
    //                 self.send("finished");
    //                 options.onFinish && options.onFinish();
    //                 options.after && options.after();
    //                 return; // do not renew timeout
    //             }
    //             // Did we pause?
    //             if (self.i_paused || (options.pauseIf && options.pauseIf(self))){
    //                 self.send("paused");
    //                 options.onPause && options.onPause();
    //                 options.after && options.after();
    //                 return; // do not renew timeout
    //             }
    //             // Abort if we run out of time
    //             if (Date.now() - startTime >= (self.speed === Simulation.MAX_SPEED ? 10 : 100) ){
    //                 break; // will renew timeout
    //             }
    //             self.stepForward();
    //         }
    //         // Renew timeout
    //         if (self.speed === Simulation.MAX_SPEED){
    //             self.runThread = setTimeout(func, 0);
    //         }
    //         else{
    //             self.runThread = setTimeout(func, Math.max(0,100-(Date.now() - startTime)));
    //         }
    //     };
    //     // Start timeout
    //     this.startRunThread(func);
    // },
    Simulation.prototype.cout = function (value) {
        // TODO: when ostreams are implemented properly with overloaded <<, move the special case there
        var text = "";
        if (value.type instanceof types_1.PointerType && value.type.ptrTo instanceof types_1.Char) {
            var addr = value.rawValue;
            var c = this.memory.getByte(addr);
            while (!types_1.Char.isNullChar(c)) {
                text += value.type.ptrTo.valueToOstreamString(c);
                c = this.memory.getByte(++addr);
            }
        }
        else {
            text = util_1.escapeString(value.valueToOstreamString());
        }
        console.log("cout: " + text);
        // this.console.setValue(this.console.value() + text);
    };
    // public undefinedBehavior : function(message) {
    //     this.eventOccurred(Simulation.EVENT_UNDEFINED_BEHAVIOR, message, true);
    // },
    // implementationDefinedBehavior : function(message) {
    //     this.eventOccurred(Simulation.EVENT_IMPLEMENTATION_DEFINED_BEHAVIOR, message, true);
    // },
    // unspecifiedBehavior : function(message) {
    //     this.eventOccurred(Simulation.EVENT_UNSPECIFIED_BEHAVIOR, message, true);
    // },
    // memoryLeaked : function(message) {
    //     this.eventOccurred(Simulation.EVENT_MEMORY_LEAK, message, true);
    // },
    // assertionFailure : function(message) {
    //     this.eventOccurred(Simulation.EVENT_ASSERTION_FAILURE, message, true);
    // },
    // crash : function(message){
    //     this.eventOccurred(Simulation.EVENT_CRASH, message + "\n\n (Note: This is a nasty error and I may not be able to recover. Continue at your own risk.)", true);
    // }
    Simulation.prototype.eventOccurred = function (event, message, showAlert) {
        this._eventsOccurred[event].push(message);
        if (showAlert) {
            this.alert(message);
        }
    };
    Simulation.prototype.hasEventOccurred = function (event) {
        return this.eventsOccurred[event].length > 0;
    };
    Simulation.prototype.alert = function (message) {
        if (!this.alertsOff) {
            this.observable.send("alert", message);
        }
    };
    return Simulation;
}());
exports.Simulation = Simulation;
//# sourceMappingURL=Simulation.js.map