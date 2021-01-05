import { Simulation, SimulationAction } from "./Simulation";
export declare class SynchronousSimulationRunner {
    readonly simulation: Simulation;
    constructor(simulation: Simulation);
    /**
     * Resets the simulation.
     */
    reset(): void;
    /**
     * Moves the simulation forward n steps.
     * @param n Number of steps to move forward. Default 1 step.
     */
    stepForward(n?: number): void;
    /**
     * Submit some input into the Simulation's cin buffer
     * @param text The input typed before "pressing enter"
     */
    cinInput(text: string): void;
    /**
     * Advance the simulation by taking one action
     * @param action
     */
    takeAction(action: SimulationAction): void;
    /**
     * Advance the simulation by taking all the given actions
     * @param actions
     */
    takeActions(actions: readonly SimulationAction[]): void;
    /**
     * Moves the simulation forward until n steps have been taken.
     * @param n Target number of steps taken.
     */
    stepUntil(n: number): Promise<void>;
    /**
     * Repeatedly steps forward until the simulation has ended.
     */
    stepToEnd(): void;
    /**
     * If a function call is up next, repeatedly steps forward until the function call
     * has completely finished executing. Otherwise, equivalent to a stepForward(1).
     * Note that this does not skip over the evaluation of arguments for a function call,
     * since in that case the arguments themselves are "up next", not the call.
     * Basically, the idea is that you never "step into" a new function.
     */
    stepOver(): void;
    /**
     * Steps the simulation forward until the currently executing function has returned.
     * If there is no currently executing function (e.g. code in an initializer
     * expression for a global variable with static storage duration), equivalent
     * to stepForward(1).
     */
    stepOut(): void;
    /**
     * Moves the simulation backward n steps. (In reality, this is done by resetting the
     * simulation and then stepping forward from the beginning to the point that would be
     * n steps backward from the current point in the simulation.)
     * @param n Number of steps backward.
     */
    stepBackward(n?: number): void;
}
export declare class AsynchronousSimulationRunner {
    readonly simulation: Simulation;
    /**
     * When performing a run operation that involves several steps, this
     * is the delay (in milliseconds) between consecutive steps.
     */
    readonly delay: number;
    /**
     * The handle returned by the call to setInterval() that was used to start
     * the current run thread, or undefined if there is no current run thread.
     */
    private timeoutHandle?;
    private rejectFn?;
    /**
     * Creates a new runner that can be used to control the given simulation.
     * @param simulation The simulation to control.
     * @param delay Delay between consecutive steps in milliseconds. Default 0 ms (i.e. as fast as possible)
     */
    constructor(simulation: Simulation, delay?: number);
    setSpeed(speed: number): void;
    /**
     * Sets the delay between steps for any run operation that involves
     * multiple steps (e.g. stepOver, stepToEnd, etc.)
     * @param delay The delay in milliseconds. Set to 0 to go as fast as possible.
     */
    setDelay(delay: number): void;
    private takeOneAction;
    private interrupt;
    /**
     * Resets the simulation.
     */
    reset(): Promise<void>;
    /**
     * Moves the simulation forward n steps, asynchronously.
     * @param n Number of steps to move forward. Default 1 step.
     */
    stepForward(n?: number, delay?: number): Promise<void>;
    /**
     * Moves the simulation forward n steps, asynchronously.
     * @param n Number of steps to move forward. Default 1 step.
     */
    takeActions(actions: readonly SimulationAction[], delay?: number): Promise<void>;
    /**
     * Moves the simulation forward, asynchronously, until n steps have been taken.
     * @param n Target number of steps taken.
     */
    stepUntil(n: number, delay?: number): Promise<void>;
    /**
     * Repeatedly steps forward until the simulation has ended.
     */
    stepToEnd(delay?: number, stepLimit?: number, stopOnCinBlock?: boolean): Promise<void>;
    /**
     * If a function call is up next, repeatedly steps forward until the function call
     * has completely finished executing. Otherwise, equivalent to a stepForward(1).
     * Note that this does not skip over the evaluation of arguments for a function call,
     * since in that case the arguments themselves are "up next", not the call.
     * Basically, the idea is that you never "step into" a new function.
     */
    stepOver(delay?: number): Promise<void>;
    stepOverLibrary(delay?: number): Promise<void>;
    /**
     * Steps the simulation forward until the currently executing function has returned.
     * If there is no currently executing function (e.g. code in an initializer
     * expression for a global variable with static storage duration), equivalent
     * to stepForward(1).
     */
    stepOut(delay?: number): Promise<void>;
    /**
     * Moves the simulation backward n steps. (In reality, this is done by resetting the
     * simulation and then stepping forward from the beginning to the point that would be
     * n steps backward from the current point in the simulation.)
     * @param n Number of steps backward.
     */
    stepBackward(n?: number): Promise<void>;
    /**
     * If the simulation is currently running (i.e. in the middle of an asynchronous
     * stepForward(n), stepToEnd(), stepOver(), etc.), immediately stops the simulation
     * at the current step. The call to that asynchronous operation will return a rejected
     * promise.
     */
    pause(): void;
}
export declare function asyncCloneSimulation(sim: Simulation, stepsTaken?: number): Promise<Simulation>;
export declare function synchronousCloneSimulation(sim: Simulation, stepsTaken?: number): Simulation;
