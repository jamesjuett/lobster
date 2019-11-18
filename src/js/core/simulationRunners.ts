import { Simulation } from "./Simulation";
import { FunctionCall } from "./functionCall";


export class SynchronousSimulationRunner {

    public readonly simulation: Simulation;

    public constructor(simulation: Simulation) {
        this.simulation = simulation;
    }

    /**
     * Reset the simulation.
     */
    public reset() {
        this.simulation.reset();
    }

    /**
     * Moves forward n steps in the simulation.
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
     * Steps forward until the currently executing function has returned.
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
     * Moves backward n steps in the simulation. (In reality, this is done by resetting the
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