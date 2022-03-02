import { assign } from 'lodash';
import { LocalObjectEntity, VariableEntity } from '../core/entities';
import { AnalyticExpression } from '../core/expressions';
import { CPPObject } from '../core/objects';
import { Program } from '../core/Program';
import { Project } from '../core/Project';
import { Simulation } from '../core/Simulation';
import { AsynchronousSimulationRunner } from '../core/simulationRunners';
import { ForStatement, WhileStatement } from '../core/statements';
import {
  BoundedArrayType,
  isArrayPointerToType,
  isBoundedArrayType,
  isPointerToCompleteObjectType,
  isPointerToType,
} from '../core/types';

export abstract class Checkpoint {
  public readonly name: string;

  public constructor(name: string) {
    this.name = name;
  }

  public abstract evaluate(project: Project): Promise<boolean>;
}

export class IsCompiledCheckpoint extends Checkpoint {
  public async evaluate(project: Project) {
    return project.program.isCompiled();
  }
}

export function removeWhitespace(str: string) {
  return str.replace(/\s+/g, '');
}

// TODO: reduce duplication with EndOfMainStateCheckpoint
export class OutputCheckpoint extends Checkpoint {
  public readonly input: string;
  public readonly stepLimit: number;

  private expected: (output: string, project: Project) => boolean;

  private runner?: AsynchronousSimulationRunner;

  public constructor(
    name: string,
    expected: (output: string, project: Project) => boolean,
    input: string = '',
    stepLimit: number = 1000
  ) {
    super(name);
    this.expected = expected;
    this.input = input;
    this.stepLimit = stepLimit;
  }

  // May throw if interrupted during async running
  public async evaluate(project: Project) {
    if (this.runner) {
      this.runner.pause();
      delete this.runner;
    }

    let program = project.program;

    if (!program.isRunnable()) {
      return false;
    }

    let sim = new Simulation(program);
    if (this.input !== '') {
      sim.cin.addToBuffer(this.input);
    }
    let runner = (this.runner = new AsynchronousSimulationRunner(sim));

    // may throw if interrupted
    await runner.stepToEnd(0, this.stepLimit, true);
    return sim.atEnd && this.expected(sim.allOutput, project);
  }
}

export function outputComparator(desiredOutput: string, ignoreWhitespace: boolean = false) {
  if (ignoreWhitespace) {
    return (output: string) => {
      return removeWhitespace(output) === removeWhitespace(desiredOutput);
    };
  } else {
    return (output: string) => {
      return output === desiredOutput;
    };
  }
}

export class EndOfMainStateCheckpoint extends Checkpoint {
  public readonly input: string;
  public readonly stepLimit: number;

  private criteria: (sim: Simulation) => boolean;

  private runner?: AsynchronousSimulationRunner;

  public constructor(
    name: string,
    criteria: (sim: Simulation) => boolean,
    input: string = '',
    stepLimit: number = 1000
  ) {
    super(name);
    this.criteria = criteria;
    this.input = input;
    this.stepLimit = stepLimit;
  }

  // May throw if interrupted during async running
  public async evaluate(project: Project) {
    if (this.runner) {
      this.runner.pause();
      delete this.runner;
    }

    let program = project.program;

    if (!program.isRunnable()) {
      return false;
    }

    let sim = new Simulation(program);
    if (this.input !== '') {
      sim.cin.addToBuffer(this.input);
    }
    let runner = (this.runner = new AsynchronousSimulationRunner(sim));

    // may throw if interrupted
    await runner.stepToEndOfMain(0, this.stepLimit, true);
    return sim.atEndOfMain() && this.criteria(sim);
  }
}

export class StaticAnalysisCheckpoint extends Checkpoint {
  private criterion: (program: Program, project: Project) => boolean;

  private runner?: AsynchronousSimulationRunner;

  public constructor(name: string, criterion: (program: Program, project: Project) => boolean) {
    super(name);
    this.criterion = criterion;
  }

  public async evaluate(project: Project) {
    return this.criterion(project.program, project);
  }
}
