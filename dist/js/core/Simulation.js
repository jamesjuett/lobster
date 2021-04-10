"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationInputStream = exports.Simulation = exports.SimulationOutputKind = exports.STEP_FORWARD_ACTION = exports.SimulationActionKind = exports.SimulationEvent = void 0;
const observe_1 = require("../util/observe");
const runtimeEnvironment_1 = require("./runtimeEnvironment");
const util_1 = require("../util/util");
const objects_1 = require("./objects");
const types_1 = require("./types");
const functions_1 = require("./functions");
const lodash_1 = require("lodash");
var SimulationEvent;
(function (SimulationEvent) {
    SimulationEvent["UNDEFINED_BEHAVIOR"] = "undefined_behavior";
    SimulationEvent["UNSPECIFIED_BEHAVIOR"] = "unspecified_behavior";
    SimulationEvent["IMPLEMENTATION_DEFINED_BEHAVIOR"] = "implementation_defined_behavior";
    SimulationEvent["MEMORY_LEAK"] = "memory_leak";
    SimulationEvent["ASSERTION_FAILURE"] = "assertion_failure";
    SimulationEvent["CRASH"] = "crash";
})(SimulationEvent = exports.SimulationEvent || (exports.SimulationEvent = {}));
var SimulationActionKind;
(function (SimulationActionKind) {
    SimulationActionKind[SimulationActionKind["STEP_FORWARD"] = 0] = "STEP_FORWARD";
    SimulationActionKind[SimulationActionKind["CIN_INPUT"] = 1] = "CIN_INPUT";
})(SimulationActionKind = exports.SimulationActionKind || (exports.SimulationActionKind = {}));
exports.STEP_FORWARD_ACTION = {
    kind: SimulationActionKind.STEP_FORWARD
};
var SimulationOutputKind;
(function (SimulationOutputKind) {
    SimulationOutputKind[SimulationOutputKind["COUT"] = 0] = "COUT";
    SimulationOutputKind[SimulationOutputKind["CIN_ECHO"] = 1] = "CIN_ECHO";
})(SimulationOutputKind = exports.SimulationOutputKind || (exports.SimulationOutputKind = {}));
const DEFAULT_SIMULATION_OPTIONS = {
    start: true
};
class Simulation {
    constructor(program, options = {}) {
        var _a;
        this.observable = new observe_1.Observable(this);
        this.random = new util_1.CPPRandom();
        this._actionsTaken = [];
        this.actionsTaken = this._actionsTaken;
        this.outputProduced = [];
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
        this.hasAnyEventOccurred = false;
        options = Object.assign({}, options, DEFAULT_SIMULATION_OPTIONS);
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
        this._actionsTaken.length = 0;
        this.atEnd = false;
        this.isBlockingUntilCin = false;
        this.allOutput = "";
        util_1.asMutable(this.outputProduced).length = 0;
        this.cin = (_a = options.cin) !== null && _a !== void 0 ? _a : new SimulationInputStream();
        this.rng = new util_1.CPPRandom();
        if (options.start) {
            this.start();
        }
    }
    clone(stepsTaken = this.stepsTaken) {
        let newSim = new Simulation(this.program);
        this.actionsTaken.slice(0, stepsTaken).forEach(action => newSim.takeAction(action));
        return newSim;
    }
    reset() {
        this.memory.reset();
        this._execStack.length = 0;
        this.pendingNews.length = 0;
        this.leakCheckIndex = 0;
        let _this = this;
        _this.isPaused = true;
        _this.stepsTaken = 0;
        this._actionsTaken.length = 0;
        _this.atEnd = false;
        _this.isBlockingUntilCin = false;
        this.allOutput = "";
        util_1.asMutable(this.outputProduced).length = 0;
        this.cin.reset();
        this.rng = new util_1.CPPRandom();
        this.observable.send("reset");
        this.start();
    }
    start() {
        this.allocateStringLiterals();
        // Change static initialization so it is wrapped up in its own construct and
        // runtime construct pair specifically for that purpose. That construct could
        // also optionally create and push the main call taking over what is currently
        // in this.callMain()
        this.callMain();
        this.globalAllocator = this.program.staticObjectAllocator.createRuntimeConstruct(this);
        this.push(this.globalAllocator);
        this.observable.send("started");
        // Needed for whatever is first on the execution stack
        this.upNext();
    }
    callMain() {
        this.mainReturnObject = new objects_1.MainReturnObject(this.memory);
        this.mainFunction = new functions_1.RuntimeFunction(this.program.mainFunction, this, null);
        this.mainFunction.setReturnObject(this.mainReturnObject);
        this.mainFunction.pushStackFrame();
        this.mainFunction.setCleanupConstruct(this.program.staticObjectDeallocator.createRuntimeConstruct(this));
        this.push(this.mainFunction);
        this.observable.send("mainCalled", this.mainFunction);
        this.mainFunction.gainControl();
    }
    push(rt) {
        // whatever was previously on top of the stack is now waiting
        let prevTop = this.top();
        if (prevTop) {
            prevTop.wait();
        }
        this._execStack.push(rt);
        this.observable.send("pushed", rt);
        rt.afterPushed();
    }
    top() {
        if (this.execStack.length > 0) {
            return this.execStack[this.execStack.length - 1];
        }
    }
    /**
     * Removes the top runtime construct from the execution stack.
     * Does nothing if there's nothing on the execution stack.
     */
    pop() {
        let popped = this._execStack.pop();
        if (popped) {
            popped.afterPopped();
            //     if (popped.stackType === "statement" || popped.stackType === "function") {
            //         this.leakCheck(); // TODO leak checking
            //     }
            this.observable.send("popped", popped);
        }
        return popped;
    }
    //TODO: this may be dangerous depending on whether there are cases this could skip temporary deallocators or destructors
    popUntil(rt) {
        while (this._execStack.length > 0 && this._execStack[this._execStack.length - 1] !== rt) {
            this.pop();
        }
    }
    startCleanupUntil(rt) {
        let toCleanUp = this._execStack.slice(this._execStack.indexOf(rt) + 1);
        toCleanUp.forEach(rt => rt.startCleanup());
    }
    topFunction() {
        for (let i = this.execStack.length - 1; i >= 0; --i) {
            let runtimeConstruct = this.execStack[i];
            if (runtimeConstruct instanceof functions_1.RuntimeFunction) {
                return runtimeConstruct;
            }
        }
    }
    allocateStringLiterals() {
        let tus = this.program.translationUnits;
        for (let tuName in tus) {
            tus[tuName].stringLiterals.forEach((lit) => { this.memory.allocateStringLiteral(lit.str); });
        }
        ;
    }
    takeAction(action) {
        switch (action.kind) {
            case SimulationActionKind.STEP_FORWARD:
                this.stepForward();
                break;
            case SimulationActionKind.CIN_INPUT:
                this.cinInput(action.text);
                break;
            default:
                util_1.assertNever(action);
        }
    }
    stepForward() {
        if (this.isBlockingUntilCin) {
            return;
        }
        ++this.stepsTaken;
        this._actionsTaken.push({ kind: SimulationActionKind.STEP_FORWARD });
        // Top rt construct will do stuff
        let rt = this.top();
        if (!rt) {
            return;
        }
        // Step forward on the rt construct
        this.observable.send("beforeStepForward", rt);
        rt.stepForward();
        this.observable.send("afterStepForward", rt);
        // After each step call upNext. Note that the "up next" construct may
        // be different if rt popped itself off the stack. upNext also checks
        // to see if the simulation is done.
        this.upNext();
        this.observable.send("afterFullStep", this.execStack.length > 0 && this.execStack[this.execStack.length - 1]);
    }
    upNext() {
        while (true) {
            // Grab the rt construct that is on top of the execution stack and up next
            let rt = this.top();
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
    }
    stepToEnd() {
        while (!this.atEnd && !this.isBlockingUntilCin) {
            this.stepForward();
        }
    }
    atEndOfMain() {
        var _a;
        return ((_a = this.top()) === null || _a === void 0 ? void 0 : _a.model) === this.program.mainFunction.body.localDeallocator;
    }
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
    parameterPassedByReference(target, arg) {
        this.observable.send("parameterPassedByReference", { target: target, arg: arg });
    }
    parameterPassedByAtomicValue(target, arg) {
        this.observable.send("parameterPassedByAtomicValue", { target: target, arg: arg });
    }
    returnPassed(rt) {
        this.observable.send("returnPassed", rt);
    }
    cinInput(text) {
        ++this.stepsTaken;
        this._actionsTaken.push({ kind: SimulationActionKind.CIN_INPUT, text: text });
        this.cin.addToBuffer(text);
        util_1.asMutable(this.outputProduced).push({ kind: SimulationOutputKind.CIN_ECHO, text: text });
        this.isBlockingUntilCin = false;
        this.observable.send("cinInput", text);
    }
    blockUntilCin() {
        this.isBlockingUntilCin = true;
    }
    cout(value) {
        // TODO: when ostreams are implemented properly with overloaded <<, move the special case there
        let text = "";
        if (value.type instanceof types_1.PointerType && value.type.ptrTo instanceof types_1.Char) {
            let addr = value.rawValue;
            let c = this.memory.getByte(addr);
            while (!types_1.Char.isNullChar(new runtimeEnvironment_1.Value(c, types_1.Char.CHAR))) {
                text += value.type.ptrTo.valueToOstreamString(c);
                c = this.memory.getByte(++addr);
            }
        }
        else {
            text = util_1.escapeString(value.valueToOstreamString());
        }
        this.allOutput += text;
        util_1.asMutable(this.outputProduced).push({ kind: SimulationOutputKind.COUT, text: text });
        this.observable.send("cout", text);
    }
    eventOccurred(event, message, showAlert = false) {
        this._eventsOccurred[event].push(message);
        this.hasAnyEventOccurred = true;
        this.observable.send("eventOccurred", { event, message });
    }
    hasEventOccurred(event) {
        return this.eventsOccurred[event].length > 0;
    }
    printState() {
        return JSON.stringify({
            memory: this.memory.printObjects(),
            execStackIds: this.execStack.map(rt => rt.model.constructId)
        }, null, 4);
    }
}
exports.Simulation = Simulation;
class SimulationInputStream {
    constructor() {
        this.observable = new observe_1.Observable(this);
        this.trimws = true;
        this.buffer = "";
        this.failbit = false;
    }
    // public readonly bufferAdditionRecord : readonly {readonly stepsTaken: number; readonly contents: string}[] = [];
    // public clone() {
    //     let dup = new SimulationInputStream();
    //     (<Mutable<SimulationInputStream>>dup).buffer = this.buffer;
    //     (<Mutable<SimulationInputStream>>dup).bufferAdditionRecord = clone(this.bufferAdditionRecord)
    //     return dup;
    // }
    reset() {
        this.updateBuffer("");
        // (<Mutable<this>>this).bufferAdditionRecord = [];
        return this;
    }
    // public rewind(stepsTaken: number) {
    //     let i = this.bufferAdditionRecord.length;
    //     while (i > 0 && this.bufferAdditionRecord[i-1].stepsTaken >= stepsTaken+1) {
    //         --i;
    //     }
    //     (<Mutable<this>>this).bufferAdditionRecord = this.bufferAdditionRecord.slice(0, i);
    //     this.updateBuffer(this.bufferAdditionRecord.map(record => record.contents).join(""));
    //     return this;
    // }
    addToBuffer(s) {
        this.updateBuffer(this.buffer + s);
        // asMutable(this.bufferAdditionRecord).push({stepsTaken:stepsTaken, contents: s});
        return this;
    }
    updateBuffer(contents) {
        this.buffer = contents;
        this.observable.send("bufferUpdated", this.buffer);
    }
    skipws() {
        this.buffer = lodash_1.trimStart(this.buffer);
    }
    extractAndParseFromBuffer(type) {
        if (types_1.isType(type, types_1.Char)) {
            return type.parse(this.extractCharFromBuffer());
        }
        else if (types_1.isIntegralType(type)) {
            return type.parse(this.extractIntFromBuffer());
        }
        else {
            return type.parse(this.extractWordFromBuffer());
        }
    }
    extractCharFromBuffer() {
        let c = this.buffer.charAt(0);
        this.updateBuffer(this.buffer.substring(1));
        return c;
    }
    extractIntFromBuffer() {
        let m = this.buffer.match(/^[0123456789+-]+/);
        if (m) {
            // match found
            this.updateBuffer(this.buffer.substring(m[0].length));
            return m[0];
        }
        else {
            // error, no viable int at start of stream buffer
            // (or stream buffer was empty)
            // buffer contents are not changed
            this.failbit = true;
            return "0"; // return so that we'll parse a 0 according to C++ standard
        }
    }
    extractWordFromBuffer() {
        let firstWhitespace = this.buffer.search(/\s/g);
        if (firstWhitespace === -1) {
            // no spaces, whole buffer is one word
            let word = this.buffer;
            this.updateBuffer("");
            return word;
        }
        else {
            // extract first word, up to but not including whitespace
            let word = this.buffer.substring(0, firstWhitespace);
            // remove from buffer, including space.
            this.updateBuffer(this.buffer.substring(firstWhitespace + 1));
            return word;
        }
    }
    extractLineFromBuffer() {
        let firstNewline = this.buffer.indexOf("\n");
        if (firstNewline === -1) {
            // no spaces, whole buffer is one word
            let word = this.buffer;
            this.updateBuffer("");
            return word;
        }
        else {
            // extract first word, up to but not including newline
            let word = this.buffer.substring(0, firstNewline);
            // remove from buffer, including space.
            this.updateBuffer(this.buffer.substring(firstNewline + 1));
            return word;
        }
    }
}
exports.SimulationInputStream = SimulationInputStream;
//# sourceMappingURL=Simulation.js.map