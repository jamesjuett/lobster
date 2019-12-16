import { Observable } from "../util/observe";
import { RunnableProgram } from "./Program";
import { Memory, Value } from "./runtimeEnvironment";
import { RuntimeConstruct, RuntimeFunction } from "./constructs";
import { CPPRandom, Mutable, escapeString } from "../util/util";
import { DynamicObject, MainReturnObject } from "./objects";
import { Int, PointerType, Char, ObjectType, AtomicType } from "./types";
import { Initializer, RuntimeDirectInitializer } from "./initializers";
import { PassByReferenceParameterEntity, PassByValueParameterEntity } from "./entities";
import { CompiledExpression, RuntimeExpression } from "./expressionBase";


export enum SimulationEvent {
    UNDEFINED_BEHAVIOR = "undefined_behavior",
    UNSPECIFIED_BEHAVIOR = "unspecified_behavior",
    IMPLEMENTATION_DEFINED_BEHAVIOR = "implementation_defined_behavior",
    MEMORY_LEAK = "memory_leak",
    ASSERTION_FAILURE = "assertion_failure",
    CRASH = "crash",
}

export type SimulationMessages =
    "started" |
    "reset" |
    "mainCalled" |
    "pushed" |
    "popped" |
    "beforeUpNext" |
    "afterUpNext" |
    "beforeStepForward" |
    "afterStepForward" |
    "afterFullStep" |
    "atEnded" |
    "parameterPassedByReference" |
    "parameterPassedByAtomicValue" |
    "returnPassed" |
    "cout" |
    "eventOccurred";

// TODO: add observer stuff
export class Simulation {

    public readonly observable = new Observable<SimulationMessages>(this);

    public readonly program: RunnableProgram;

    public readonly memory: Memory;

    private readonly _execStack: RuntimeConstruct[];
    public readonly execStack: readonly RuntimeConstruct[];

    public readonly random = new CPPRandom();

    public readonly stepsTaken : number;

    public readonly isPaused: boolean;
    public readonly atEnd: boolean;

    private readonly pendingNews : DynamicObject[];
    private leakCheckIndex : number;

    // TODO: is this actually set anwhere?
    private alertsOff = false;

    private readonly _eventsOccurred : {
        [p in SimulationEvent]: string[];
    } = {
        "undefined_behavior" : [],
        "unspecified_behavior" : [],
        "implementation_defined_behavior" : [],
        "memory_leak" : [],
        "assertion_failure" : [],
        "crash" : []
    };
    
    public readonly eventsOccurred : {
        [p in SimulationEvent]: readonly string[];
    } = this._eventsOccurred;

    // MAX_SPEED: -13445, // lol TODO


    public readonly mainReturnObject!: MainReturnObject;
    public readonly mainFunction!: RuntimeFunction<Int>;

    constructor(program: RunnableProgram) {
        this.program = program;

        // TODO SimulationRunner this.speed = Simulation.MAX_SPEED;

        // These things need be reset when the simulation is reset
        this.memory = new Memory();
        // this.console = ValueEntity.instance("console", "");

        this.execStack = this._execStack = [];

        this.pendingNews = [];
        this.leakCheckIndex = 0;

        this.isPaused = true;
        this.stepsTaken = 0;
        this.atEnd = false;

        this.start();
    }

    public clone(stepsTaken = this.stepsTaken) {
        let newSim = new Simulation(this.program);
        for(let i = 0; i < stepsTaken; ++i) {
            newSim.stepForward();
        }
        return newSim;
    }

    public reset() {
        this.memory.reset();
        this._execStack.length = 0;

        this.pendingNews.length = 0;
        this.leakCheckIndex = 0;

        let _this = <Mutable<this>>this;
        _this.isPaused = true;
        _this.stepsTaken = 0;
        _this.atEnd = false;

        this.observable.send("reset");

        this.start();
    }

    private start() {
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
    }

    private callMain() {
        (<Mutable<this>>this).mainReturnObject = new MainReturnObject(this.memory);
        (<Mutable<this>>this).mainFunction = new RuntimeFunction(this.program.mainFunction, this, null);
        this.mainFunction.setReturnObject(this.mainReturnObject);
        this.mainFunction.pushStackFrame();
        this.push(this.mainFunction);
        this.observable.send("mainCalled", this.mainFunction);
        this.mainFunction.gainControl();
    }
    
    public push(rt: RuntimeConstruct) {
        
        // whatever was previously on top of the stack is now waiting
        let prevTop = this.top();
        if (prevTop) {
            prevTop.wait();
        }

        this._execStack.push(rt);
        this.observable.send("pushed", rt);
        rt.afterPushed();
    }
    
    public top() {
        if (this.execStack.length > 0) {
            return this.execStack[this.execStack.length - 1];
        }
    }

    /**
     * Removes the top runtime construct from the execution stack.
     * Does nothing if there's nothing on the execution stack.
     */
    public pop() {
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
    public popUntil(rt: RuntimeConstruct) {
        while(this._execStack.length > 0 && this._execStack[this._execStack.length - 1] !== rt) {
            this.pop();
        }
    }

    public topFunction() : RuntimeFunction | undefined {
        for (let i = this.execStack.length - 1; i >= 0; --i) {
            let runtimeConstruct = this.execStack[i];
            if (runtimeConstruct instanceof RuntimeFunction) {
                return runtimeConstruct;
            }
        }
    }

    private allocateStringLiterals() {
        let tus = this.program.translationUnits;
        for(let tuName in tus) {
            tus[tuName].stringLiterals.forEach((lit) => { this.memory.allocateStringLiteral(lit); });
        };
    }

	public stepForward() {

        // Top rt construct will do stuff
        let rt = this.top();

        if (!rt) {
            return;
        }

        // Step forward on the rt construct
        this.observable.send("beforeStepForward", rt);
        rt.stepForward();
        this.observable.send("afterStepForward", rt);

        ++(<Mutable<this>>this).stepsTaken;

        // After each step call upNext. Note that the "up next" construct may
        // be different if rt popped itself off the stack. upNext also checks
        // to see if the simulation is done.
        this.upNext();

        this.observable.send("afterFullStep", this.execStack.length > 0 && this.execStack[this.execStack.length - 1]);
    }

	private upNext() {

        while(true) {

            // Grab the rt construct that is on top of the execution stack and up next
            let rt = this.top();

            // Check to see if simulation is done
            if (!rt) {
                (<Mutable<this>>this).atEnd = true;
                this.observable.send("atEnded");
                return;
            }


            // up next on the rt construct
            this.observable.send("beforeUpNext", {rt: rt});
            rt.upNext();
            this.observable.send("afterUpNext", {inst: rt});

            // If the rt construct on top of the execution stack has changed, it needs
            // to be notified that it is now up next, so we should let the loop go again.
            // However, if rt is still on top, we presume it is waiting for the next
            // stepForward (and it hasn't added any children), so we just break the loop.
            // Note that if the execution stack becomes empty, we do not hit the break (because
            // we can assume at this point it was not empty previously) and will loop back to
            // the top where the check for an empty stack is performed.
            if(rt === this.top()) {
                break; // Note this will not occur when then 
            }
        }
    }
    
    public stepToEnd() {
        while (!this.atEnd) {
            this.stepForward();
        }
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

    public parameterPassedByReference<T extends ObjectType>(target: PassByReferenceParameterEntity<T>, arg: RuntimeExpression<T, "lvalue">) {
        this.observable.send("parameterPassedByReference", {target: target, arg: arg});
    }

    public parameterPassedByAtomicValue<T extends AtomicType>(target: PassByValueParameterEntity<T>, arg: RuntimeExpression<T, "prvalue">) {
        this.observable.send("parameterPassedByAtomicValue", {target: target, arg: arg});
    }

    public returnPassed(rt: RuntimeDirectInitializer) {
        this.observable.send("returnPassed", rt);
    }

    public cout(value: Value) {
        // TODO: when ostreams are implemented properly with overloaded <<, move the special case there
        let text = "";
        if(value.type instanceof PointerType && value.type.ptrTo instanceof Char) {
            let addr = value.rawValue;
            let c = this.memory.getByte(addr);
            while (!Char.isNullChar(c)) {
                text += value.type.ptrTo.valueToOstreamString(c);
                c = this.memory.getByte(++addr);
            }
        }
        else {
            text = escapeString(value.valueToOstreamString());
        }
        this.observable.send("cout", text);
    }

    public eventOccurred(event: SimulationEvent, message: string, showAlert: boolean) {
        this._eventsOccurred[event].push(message);
        
        this.observable.send("eventOccurred", {event, message});
    }

    public hasEventOccurred(event: SimulationEvent) {
        return this.eventsOccurred[event].length > 0;
    }
    
    public printState() {
        return JSON.stringify({
            memory: this.memory.printObjects(),
            execStackIds: this.execStack.map(rt => rt.model.constructId)
        }, null, 4);
    }

    // explain : function(exp){
    //     //alert(exp.ignore);
    //     if (!this.i_explainOff){
    //         if (!exp.ignore) {
    //             this.send("explain", exp.message);
    //         }
    //     }
    // },
    // closeMessage : function(){
    //     this.send("closeMessage");
    // },
    // pause : function(){
    //     this.i_paused = true;
    // },

    // nextRandom : function(){
    //     return Math.random();
    // },

    // mainCallInstance : function(){
    //     return this.i_mainCallInst;
    // },

    // leakCheckChildren : function(obj){


    //     // If it's a pointer into an array, hypothetically we can get to anything else in the array,
    //     // so we need to add the whole thing to the frontier.
    //     // This also covers dynamic arrays - we never have a pointer to the array, but to elements in it.
    //     if (isA(obj.type, Types.ArrayPointer)){
    //         return [obj.type.arrObj];
    //     }
    //     else if (isA(obj.type, Types.Pointer) && obj.type.isObjectPointer()){
    //         var pointsTo = this.memory.dereference(obj);
    //         if (pointsTo && !isA(pointsTo, AnonymousObject)){
    //             return [pointsTo];
    //         }
    //     }
    //     else if (isA(obj.type, Types.Array)){
    //         return obj.elemObjects;
    //         //children.push(obj.elemObjects);
    //         //var elems = obj.rawValue();
    //         //var children = [];
    //         //for(var i = 0; i < elems.length; ++i){
    //         //    children.push(Value.instance(elems[i], obj.type.elemType));
    //         //}
    //         //return children;
    //     }
    //     else if (isA(obj.type, Types.Class)){
    //         return obj.subobjects;
    //         //var members = obj.subObjects;
    //         //var children = [];
    //         //for(var i = 0; i < members.length; ++i){
    //         //    children.push(Value.instance(elems[i]));
    //         //}
    //         //return children;
    //     }
    //     return [];
    // },
    // leakCheck : function(){
    //     //console.log("leak check running!");
    //     // Temporary place for testing leak check
    //     var heapObjectsMap = this.memory.heap.objectMap;
    //     for (var addr in heapObjectsMap) {
    //         var obj = heapObjectsMap[addr];
    //         if(this.leakCheckObj(obj)){
    //             obj.leaked(this);
    //         }
    //         else{
    //             obj.unleaked(this);
    //         }
    //     }
    // },
    // leakCheckObj : function(query) {
    //     ++this.i_leakCheckIndex;
    //     var frontier = [];
    //     var globalScope = this.i_program.getGlobalScope();
    //     for (var key in globalScope.entities) {
    //         var ent = globalScope.entities[key];
    //         if (isA(ent, CPPObject)){
    //             ent.i_leakCheckIndex = this.i_leakCheckIndex;
    //             frontier.push(ent);
    //         }
    //     }

    //     for(var i = 0; i < this.memory.stack.frames.length; ++i){
    //         var frameObjs = this.memory.stack.frames[i].objects;
    //         for (var key in frameObjs) {
    //             var ent = frameObjs[key];
    //             if (isA(ent, CPPObject)){
    //                 ent.i_leakCheckIndex = this.i_leakCheckIndex;
    //                 frontier.push(ent);
    //             }
    //         }
    //     }

    //     for(var i = 0; i < this.i_pendingNews.length; ++i){
    //         var obj = this.i_pendingNews[i];
    //         obj.i_leakCheckIndex = this.i_leakCheckIndex;
    //         frontier.push(obj);
    //     }

    //     for(var i = 0; i < this.i_execStack.length; ++i){
    //         var inst = this.i_execStack[i];
    //         if (inst.evalResult) {
    //             obj = inst.evalResult;
    //         }
    //         else if (inst.func && !isA(inst.func.model.type.returnType, Types.Void)) {
    //             if (isA(inst.func.model.type.returnType, Types.Reference)) {
    //                 obj = inst.func.model.getReturnObject(this, inst.func);
    //             }
    //             else {
    //                 obj = inst.func.model.getReturnObject(this, inst.func).getValue();
    //             }
    //         }

    //         if (obj && isA(obj, CPPObject)){
    //             obj.i_leakCheckIndex = this.i_leakCheckIndex;
    //             frontier.push(obj);
    //         }
    //         else if (obj && isA(obj, Value)){
    //             frontier.push(obj);
    //         }
    //     }

    //     for (var key in this.memory.temporaryObjects){
    //         var obj = this.memory.temporaryObjects[key];
    //         obj.i_leakCheckIndex = this.i_leakCheckIndex;
    //         frontier.push(obj);
    //     }

    //     while (frontier.length > 0) {
    //         var obj = frontier.shift();

    //         // Check if found
    //         if (obj === query){
    //             return false;
    //         }

    //         // Mark as visited
    //         obj.i_leakCheckIndex = this.i_leakCheckIndex;
    //         var children = this.leakCheckChildren(obj);
    //         for(var i = 0; i < children.length; ++i){
    //             var child = children[i];
    //             if (child.i_leakCheckIndex !== this.i_leakCheckIndex){
    //                 frontier.push(child);
    //             }
    //         }
    //     }
    //     return true;
    // },
}
