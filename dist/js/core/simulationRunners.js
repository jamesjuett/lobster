"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.synchronousCloneSimulation = exports.asyncCloneSimulation = exports.AsynchronousSimulationRunner = exports.SynchronousSimulationRunner = void 0;
const Simulation_1 = require("./Simulation");
const CPP_ANIMATIONS_1 = require("../view/CPP_ANIMATIONS");
const initializers_1 = require("./initializers");
const entities_1 = require("./entities");
const FunctionCall_1 = require("./FunctionCall");
class SynchronousSimulationRunner {
    constructor(simulation) {
        this.simulation = simulation;
    }
    /**
     * Resets the simulation.
     */
    reset() {
        this.simulation.reset();
    }
    /**
     * Moves the simulation forward n steps.
     * @param n Number of steps to move forward. Default 1 step.
     */
    stepForward(n = 1) {
        for (let i = 0; !this.simulation.atEnd && i < n; ++i) {
            this.simulation.stepForward();
        }
    }
    /**
     * Submit some input into the Simulation's cin buffer
     * @param text The input typed before "pressing enter"
     */
    cinInput(text) {
        this.simulation.cinInput(text);
    }
    /**
     * Advance the simulation by taking one action
     * @param action
     */
    takeAction(action) {
        this.simulation.takeAction(action);
    }
    /**
     * Advance the simulation by taking all the given actions
     * @param actions
     */
    takeActions(actions) {
        actions.forEach(a => this.takeAction(a));
    }
    /**
     * Moves the simulation forward until n steps have been taken.
     * @param n Target number of steps taken.
     */
    stepUntil(n) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.stepForward(n - this.simulation.stepsTaken);
        });
    }
    /**
     * Repeatedly steps forward until the simulation has ended.
     */
    stepToEnd(stepLimit, stopOnCinBlock = false) {
        let stepsTaken = 0;
        while (!this.simulation.atEnd
            && (!stopOnCinBlock || !this.simulation.isBlockingUntilCin)
            && (stepLimit === undefined || stepsTaken < stepLimit)) {
            this.stepForward();
            ++stepsTaken;
        }
    }
    /**
     * Repeatedly steps forward until just before main will exit
     */
    stepToEndOfMain(stepLimit, stopOnCinBlock = false) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let stepsTaken = 0;
            while (((_a = this.simulation.top()) === null || _a === void 0 ? void 0 : _a.model) !== this.simulation.program.mainFunction.body.localDeallocator
                && (!stopOnCinBlock || !this.simulation.isBlockingUntilCin)
                && (stepLimit === undefined || stepsTaken < stepLimit)) {
                this.stepForward();
                ++stepsTaken;
            }
        });
    }
    /**
     * If a function call is up next, repeatedly steps forward until the function call
     * has completely finished executing. Otherwise, equivalent to a stepForward(1).
     * Note that this does not skip over the evaluation of arguments for a function call,
     * since in that case the arguments themselves are "up next", not the call.
     * Basically, the idea is that you never "step into" a new function.
     */
    stepOver() {
        let top = this.simulation.top();
        if (top instanceof FunctionCall_1.FunctionCall) {
            while (!top.isDone) {
                this.simulation.stepForward();
            }
        }
        else {
            this.stepForward(1);
        }
    }
    /**
     * Steps the simulation forward until the currently executing function has returned.
     * If there is no currently executing function (e.g. code in an initializer
     * expression for a global variable with static storage duration), equivalent
     * to stepForward(1).
     */
    stepOut() {
        let topFunc = this.simulation.topFunction();
        if (!topFunc) {
            this.stepForward(1);
            return;
        }
        while (!topFunc.isDone) {
            this.simulation.stepForward();
        }
    }
    /**
     * Moves the simulation backward n steps. (In reality, this is done by resetting the
     * simulation and then stepping forward from the beginning to the point that would be
     * n steps backward from the current point in the simulation.)
     * @param n Number of steps backward.
     */
    stepBackward(n = 1) {
        if (n === 0 || this.simulation.stepsTaken === 0) {
            return;
        }
        let newStepTarget = this.simulation.stepsTaken - n;
        let actions = this.simulation.actionsTaken.slice(0, newStepTarget);
        this.reset();
        this.takeActions(actions);
    }
}
exports.SynchronousSimulationRunner = SynchronousSimulationRunner;
class AsynchronousSimulationRunner {
    /**
     * Creates a new runner that can be used to control the given simulation.
     * @param simulation The simulation to control.
     * @param delay Delay between consecutive steps in milliseconds. Default 0 ms (i.e. as fast as possible)
     */
    constructor(simulation, delay = 0) {
        this.simulation = simulation;
        this.delay = delay;
    }
    setSpeed(speed) {
        this.delay = Math.floor(1000 / speed);
    }
    /**
     * Sets the delay between steps for any run operation that involves
     * multiple steps (e.g. stepOver, stepToEnd, etc.)
     * @param delay The delay in milliseconds. Set to 0 to go as fast as possible.
     */
    setDelay(delay) {
        this.delay = delay;
    }
    takeOneAction(action, delay) {
        // If someone else was waiting on a step (or a sequence of steps),
        // we want to clear the timeout and call the stored reject function
        // to interrupt that and reject their promise. This will prevent
        // several "threads" running at the same time which could cause chaos.
        this.interrupt();
        return new Promise((resolve, reject) => {
            this.timeoutHandle = window.setTimeout(() => {
                this.simulation.takeAction(action);
                delete this.timeoutHandle;
                delete this.rejectFn;
                resolve();
            }, delay);
            this.rejectFn = reject;
        });
    }
    interrupt() {
        if (this.rejectFn) {
            clearTimeout(this.timeoutHandle);
            delete this.timeoutHandle;
            let rejectFn = this.rejectFn;
            delete this.rejectFn;
            rejectFn();
        }
    }
    /**
     * Resets the simulation.
     */
    reset() {
        return __awaiter(this, void 0, void 0, function* () {
            this.interrupt();
            return new Promise(resolve => setTimeout(() => {
                this.simulation.reset();
                resolve();
            }, 0));
        });
    }
    /**
     * Moves the simulation forward n steps, asynchronously.
     * @param n Number of steps to move forward. Default 1 step.
     */
    stepForward(n = 1, delay = this.delay) {
        return __awaiter(this, void 0, void 0, function* () {
            if (n <= 0) {
                return;
            }
            // Take first step with no delay
            yield this.takeOneAction(Simulation_1.STEP_FORWARD_ACTION, 0);
            // Take the rest of the steps with given delay
            for (let i = 1; !this.simulation.atEnd && i < n; ++i) {
                yield this.takeOneAction(Simulation_1.STEP_FORWARD_ACTION, delay);
            }
        });
    }
    /**
     * Moves the simulation forward n steps, asynchronously.
     * @param n Number of steps to move forward. Default 1 step.
     */
    takeActions(actions, delay = this.delay) {
        return __awaiter(this, void 0, void 0, function* () {
            if (actions.length === 0) {
                return;
            }
            // Take first step with no delay
            yield this.takeOneAction(actions[0], 0);
            // Take the rest of the steps with given delay
            for (let i = 1; !this.simulation.atEnd && i < actions.length; ++i) {
                yield this.takeOneAction(actions[i], delay);
            }
        });
    }
    /**
     * Moves the simulation forward, asynchronously, until n steps have been taken.
     * @param n Target number of steps taken.
     */
    stepUntil(n, delay = this.delay) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.stepForward(n - this.simulation.stepsTaken);
        });
    }
    /**
     * Repeatedly steps forward until the simulation has ended.
     */
    stepToEnd(delay = this.delay, stepLimit, stopOnCinBlock = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let stepsTaken = 0;
            while (!this.simulation.atEnd && (!stopOnCinBlock || !this.simulation.isBlockingUntilCin)
                && (stepLimit === undefined || stepsTaken < stepLimit)) {
                yield this.takeOneAction(Simulation_1.STEP_FORWARD_ACTION, delay);
                ++stepsTaken;
            }
        });
    }
    /**
     * Repeatedly steps forward until just before main will exit
     */
    stepToEndOfMain(delay = this.delay, stepLimit, stopOnCinBlock = false) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let stepsTaken = 0;
            while (((_a = this.simulation.top()) === null || _a === void 0 ? void 0 : _a.model) !== this.simulation.program.mainFunction.body.localDeallocator
                && (!stopOnCinBlock || !this.simulation.isBlockingUntilCin)
                && (stepLimit === undefined || stepsTaken < stepLimit)) {
                yield this.takeOneAction(Simulation_1.STEP_FORWARD_ACTION, delay);
                ++stepsTaken;
            }
        });
    }
    /**
     * If a function call is up next, repeatedly steps forward until the function call
     * has completely finished executing. Otherwise, equivalent to a stepForward(1).
     * Note that this does not skip over the evaluation of arguments for a function call,
     * since in that case the arguments themselves are "up next", not the call.
     * Basically, the idea is that you never "step into" a new function.
     */
    stepOver(delay = this.delay) {
        return __awaiter(this, void 0, void 0, function* () {
            let top = this.simulation.top();
            if (!top) {
                return;
            }
            // if (top instanceof RuntimeFunctionCall) {
            while (!top.isDone) {
                yield this.takeOneAction(Simulation_1.STEP_FORWARD_ACTION, delay);
            }
            // }
            // else {
            //     await this.stepForward();
            // }
        });
    }
    stepOverLibrary(delay = this.delay) {
        return __awaiter(this, void 0, void 0, function* () {
            let top = this.simulation.top();
            let originalTop = top;
            if (!top || !originalTop) {
                return;
            }
            // Take first step with no delay
            // if (top instanceof RuntimeFunctionCall && top.model.func.firstDeclaration.context.isLibrary) {
            if (top.model.context.isLibrary) {
                CPP_ANIMATIONS_1.setCPP_ANIMATIONS(false);
            }
            yield this.takeOneAction(Simulation_1.STEP_FORWARD_ACTION, 0);
            if (top.model.context.isLibrary) {
                CPP_ANIMATIONS_1.setCPP_ANIMATIONS(false);
            }
            // if (top instanceof RuntimeFunctionCall) {
            top = this.simulation.top();
            while (top && !originalTop.isDone && (top.model.context.isLibrary
                || (top instanceof FunctionCall_1.RuntimeFunctionCall && top.calledFunction.model.context.isLibrary)
                || (top instanceof initializers_1.RuntimeDirectInitializer && top.model.target instanceof entities_1.PassByReferenceParameterEntity && top.model.target.calledFunction.firstDeclaration.context.isLibrary)
                || (top instanceof initializers_1.RuntimeDirectInitializer && top.model.target instanceof entities_1.PassByValueParameterEntity && top.model.target.calledFunction.firstDeclaration.context.isLibrary))) {
                yield this.takeOneAction(Simulation_1.STEP_FORWARD_ACTION, delay);
                top = this.simulation.top();
            }
            CPP_ANIMATIONS_1.setCPP_ANIMATIONS(true);
            // }
            // else {
            //     await this.stepForward();
            // }
        });
    }
    /**
     * Steps the simulation forward until the currently executing function has returned.
     * If there is no currently executing function (e.g. code in an initializer
     * expression for a global variable with static storage duration), equivalent
     * to stepForward(1).
     */
    stepOut(delay = this.delay) {
        return __awaiter(this, void 0, void 0, function* () {
            let topFunc = this.simulation.topFunction();
            if (!topFunc) {
                yield this.stepForward();
                return;
            }
            while (!topFunc.isDone) {
                yield this.takeOneAction(Simulation_1.STEP_FORWARD_ACTION, delay);
            }
        });
    }
    /**
     * Moves the simulation backward n steps. (In reality, this is done by resetting the
     * simulation and then stepping forward from the beginning to the point that would be
     * n steps backward from the current point in the simulation.)
     * @param n Number of steps backward.
     */
    stepBackward(n = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            if (n === 0 || this.simulation.stepsTaken === 0) {
                return;
            }
            let newStepTarget = this.simulation.stepsTaken - n;
            let actions = this.simulation.actionsTaken.slice(0, newStepTarget);
            yield this.reset();
            yield this.takeActions(actions);
        });
    }
    /**
     * If the simulation is currently running (i.e. in the middle of an asynchronous
     * stepForward(n), stepToEnd(), stepOver(), etc.), immediately stops the simulation
     * at the current step. The call to that asynchronous operation will return a rejected
     * promise.
     */
    pause() {
        this.interrupt();
    }
}
exports.AsynchronousSimulationRunner = AsynchronousSimulationRunner;
function asyncCloneSimulation(sim, stepsTaken = sim.stepsTaken) {
    return __awaiter(this, void 0, void 0, function* () {
        let newSim = new Simulation_1.Simulation(sim.program);
        yield (new AsynchronousSimulationRunner(newSim).takeActions(sim.actionsTaken.slice(0, stepsTaken)));
        return newSim;
    });
}
exports.asyncCloneSimulation = asyncCloneSimulation;
function synchronousCloneSimulation(sim, stepsTaken = sim.stepsTaken) {
    let newSim = new Simulation_1.Simulation(sim.program);
    new SynchronousSimulationRunner(newSim).takeActions(sim.actionsTaken.slice(0, stepsTaken));
    return newSim;
}
exports.synchronousCloneSimulation = synchronousCloneSimulation;
//# sourceMappingURL=simulationRunners.js.map