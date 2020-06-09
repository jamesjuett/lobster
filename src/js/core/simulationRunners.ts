import { Simulation } from "./Simulation";
import { FunctionCall, RuntimeFunctionCall } from "./functionCall";
import { Mutable } from "../util/util";


export class SynchronousSimulationRunner {

    public readonly simulation: Simulation;

    public constructor(simulation: Simulation) {
        this.simulation = simulation;
    }

    /**
     * Resets the simulation.
     */
    public reset() {
        this.simulation.reset();
    }

    /**
     * Moves the simulation forward n steps.
     * @param n Number of steps to move forward. Default 1 step.
     */
    public stepForward(n: number = 1) {
        for (let i = 0; !this.simulation.atEnd && i < n; ++i) {
            this.simulation.stepForward();
        }
    }

    /**
     * Repeatedly steps forward until the simulation has ended.
     */
    public stepToEnd() {
        while (!this.simulation.atEnd) {
            this.simulation.stepForward();
        }
    }

    /**
     * If a function call is up next, repeatedly steps forward until the function call
     * has completely finished executing. Otherwise, equivalent to a stepForward(1).
     * Note that this does not skip over the evaluation of arguments for a function call,
     * since in that case the arguments themselves are "up next", not the call.
     * Basically, the idea is that you never "step into" a new function.
     */
    public stepOver() {

        let top = this.simulation.top();
        if (top instanceof FunctionCall) {
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
    public stepOut() {
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
    public stepBackward(n: number = 1) {
        if (n === 0 || this.simulation.stepsTaken === 0) {
            return;
        }

        let newSteps = this.simulation.stepsTaken - n;
        this.reset();
        this.stepForward(newSteps);
    }

}

export class AsynchronousSimulationRunner {

    public readonly simulation: Simulation;

    /**
     * When performing a run operation that involves several steps, this
     * is the delay (in milliseconds) between consecutive steps.
     */
    public readonly delay: number;

    /**
     * The handle returned by the call to setInterval() that was used to start
     * the current run thread, or undefined if there is no current run thread.
     */
    private rejectFn?: () => void;
    private timeoutHandle?: number;

    /**
     * Creates a new runner that can be used to control the given simulation.
     * @param simulation The simulation to control.
     * @param delay Delay between consecutive steps in milliseconds. Default 0 ms (i.e. as fast as possible)
     */
    public constructor(simulation: Simulation, delay: number = 0) {
        this.simulation = simulation;
        this.delay = delay;
    }

    public setSpeed(speed: number) {
        (<Mutable<this>>this).delay = Math.floor(1000 / speed);
    }

    /**
     * Sets the delay between steps for any run operation that involves
     * multiple steps (e.g. stepOver, stepToEnd, etc.)
     * @param delay The delay in milliseconds. Set to 0 to go as fast as possible.
     */
    public setDelay(delay: number) {
        (<Mutable<this>>this).delay = delay;
    }

    private takeOneStep(delay: number) {

        // If someone else was waiting on a step (or a sequence of steps),
        // we want to clear the timeout and call the stored reject function
        // to interrupt that and reject their promise. This will prevent
        // several "threads" running at the same time which could cause chaos.
        this.interrupt();

        return new Promise((resolve, reject) => {

            this.timeoutHandle = setTimeout(() => {
                this.simulation.stepForward();
                delete this.timeoutHandle;
                delete this.rejectFn;
                resolve();
            }, delay);

            this.rejectFn = reject;
        });
    }

    private interrupt() {
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
    public async reset() {
        this.interrupt();
        return new Promise(resolve => setTimeout(() => {
            this.simulation.reset();
            resolve();
        }, 0));
    }

    /**
     * Moves the simulation forward n steps, asynchronously.
     * @param n Number of steps to move forward. Default 1 step.
     */
    public async stepForward(n: number = 1, delay: number = this.delay) {
        if (n === 0) {
            return;
        }

        // Take first step with no delay
        await this.takeOneStep(0);

        // Take the rest of the steps with given delay
        for (let i = 1; !this.simulation.atEnd && i < n; ++i) {
            await this.takeOneStep(delay);
        }
    }

    /**
     * Repeatedly steps forward until the simulation has ended.
     */
    public async stepToEnd(delay: number = this.delay) {
        while (!this.simulation.atEnd) {
            await this.takeOneStep(delay);
        }
    }

    /**
     * If a function call is up next, repeatedly steps forward until the function call
     * has completely finished executing. Otherwise, equivalent to a stepForward(1).
     * Note that this does not skip over the evaluation of arguments for a function call,
     * since in that case the arguments themselves are "up next", not the call.
     * Basically, the idea is that you never "step into" a new function.
     */
    public async stepOver(delay: number = this.delay) {
        let top = this.simulation.top();
        if (top instanceof RuntimeFunctionCall) {
            while (!top.isDone) {
                await this.takeOneStep(delay);
            }
        }
        else {
            await this.stepForward();
        }
    }


    /**
     * Steps the simulation forward until the currently executing function has returned.
     * If there is no currently executing function (e.g. code in an initializer
     * expression for a global variable with static storage duration), equivalent
     * to stepForward(1).
     */
    public async stepOut(delay: number = this.delay) {
        let topFunc = this.simulation.topFunction();

        if (!topFunc) {
            await this.stepForward();
            return;
        }

        while (!topFunc.isDone) {
            await this.takeOneStep(delay);
        }
    }

    /**
     * Moves the simulation backward n steps. (In reality, this is done by resetting the
     * simulation and then stepping forward from the beginning to the point that would be
     * n steps backward from the current point in the simulation.)
     * @param n Number of steps backward.
     */
    public async stepBackward(n: number = 1) {
        if (n === 0 || this.simulation.stepsTaken === 0) {
            return;
        }

        let newSteps = this.simulation.stepsTaken - n;
        await this.reset();
        await this.stepForward(newSteps, 0);
    }

    /**
     * If the simulation is currently running (i.e. in the middle of an asynchronous
     * stepForward(n), stepToEnd(), stepOver(), etc.), immediately stops the simulation
     * at the current step. The call to that asynchronous operation will return a rejected
     * promise.
     */
    public pause() {
        this.interrupt();
    }
}

export async function asyncCloneSimulation(sim: Simulation, stepsTaken = sim.stepsTaken) {
    let newSim = new Simulation(sim.program);
    await (new AsynchronousSimulationRunner(newSim).stepForward(stepsTaken));
    return newSim;
}

export function synchronousCloneSimulation(sim: Simulation, stepsTaken = sim.stepsTaken) {
    let newSim = new Simulation(sim.program);
    new SynchronousSimulationRunner(newSim).stepForward(stepsTaken);
    return newSim;
}