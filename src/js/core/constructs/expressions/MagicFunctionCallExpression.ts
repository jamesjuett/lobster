import { ReferenceType, sameType, PeelReference, referenceCompatible, CompleteReturnType, Bool, CompleteObjectType, PotentialParameterType, VoidType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { CPPError } from "../../compilation/errors";
import { MAGIC_FUNCTION_NAMES } from "../../compilation/lexical";
import { ValueCategory, Expression, CompiledExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { ConstructOutlet, MagicFunctionCallExpressionOutlet } from "../../../view/codeOutlets";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { FunctionCallExpressionASTNode } from "../../../ast/ast_expressions";
import { SimpleRuntimeExpression } from "./SimpleRuntimeExpression";
import { SimulationEvent } from "../../runtime/Simulation";
import { Value } from "../../runtime/Value";
import { createRuntimeExpression } from "./expressions";
import { standardConversion } from "./ImplicitConversion";



interface MagicFunctionImpl {
  readonly returnType: CompleteObjectType | VoidType;
  readonly valueCategory: ValueCategory;
  readonly paramTypes: readonly PotentialParameterType[];
  readonly operate: (rt: RuntimeMagicFunctionCallExpression) => void;
}

// TODO: add some RNG function?
const MAGIC_FUNCTIONS: { [k in MAGIC_FUNCTION_NAMES]: MagicFunctionImpl } = {
  assert: {
      returnType: VoidType.VOID,
      valueCategory: "prvalue",
      paramTypes: [Bool.BOOL],
      operate: (rt: RuntimeMagicFunctionCallExpression) => {
          let arg = <Value<Bool>>rt.args[0].evalResult;
          if (!arg.rawValue) {
              console.log("assertion failed");
              rt.sim.eventOccurred(SimulationEvent.ASSERTION_FAILURE, `Assertion failed on line ${rt.model.getNearestSourceReference().line}.`, true);
          }
          else {
              console.log("assertion PASSED");
          }
      }
  },
  pause: {
      returnType: VoidType.VOID,
      valueCategory: "prvalue",
      paramTypes: [],
      operate: (rt: RuntimeMagicFunctionCallExpression) => {
          // rt.sim.pause();
      }

  },
  pauseIf: {
      returnType: VoidType.VOID,
      valueCategory: "prvalue",
      paramTypes: [Bool.BOOL],
      operate: (rt: RuntimeMagicFunctionCallExpression) => {
          let arg = <Value<Bool>>rt.args[0].evalResult;
          if (arg) {
              // rt.sim.pause();
          }
      }
  }
}

export class MagicFunctionCallExpression extends Expression<FunctionCallExpressionASTNode> {
    public readonly construct_type = "magic_function_call_expression";

    public readonly type: PeelReference<CompleteReturnType>;
    public readonly valueCategory: ValueCategory;

    public readonly functionName: string;
    public readonly functionImpl: MagicFunctionImpl;
    public readonly args: readonly Expression[];

    public constructor(context: ExpressionContext, ast: FunctionCallExpressionASTNode | undefined, functionName: MAGIC_FUNCTION_NAMES, args: readonly Expression[]) {
        super(context, ast);

        this.functionName = functionName;

        let fn = this.functionImpl = MAGIC_FUNCTIONS[functionName];
        this.type = fn.returnType;
        this.valueCategory = fn.valueCategory;

        this.args = args.map((arg, i) => {
            if (!arg.isWellTyped()) {
                return arg;
            }

            let paramType = fn.paramTypes[i];

            if (paramType.isReferenceType()) {
                if (!referenceCompatible(arg.type, paramType)) {
                    arg.addNote(CPPError.declaration.init.referenceType(this, arg.type, paramType));
                }
                return arg;
            }
            else {
                let convertedArg = standardConversion(arg, paramType);

                if (!sameType(convertedArg.type, fn.paramTypes[i])) {
                    arg.addNote(CPPError.declaration.init.convert(arg, convertedArg.type, paramType));
                }
                return convertedArg;
            }

        });
        this.attachAll(this.args);
    }

    // public createRuntimeExpression<RT extends PotentialReturnType>(this: CompiledMagicFunctionCallExpression<RT>, parent: RuntimeConstruct) : RuntimeMagicFunctionCallExpression<RT>
    // public createRuntimeExpression<T extends ObjectType, V extends ValueCategory>(this: CompiledExpressionBase<T,V>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression<RT extends PotentialReturnType>(this: CompiledMagicFunctionCallExpression<RT>, parent: RuntimeConstruct) : RuntimeMagicFunctionCallExpression<RT> {
    //     return new RuntimeMagicFunctionCallExpression(this, parent);
    // }
    public createDefaultOutlet(this: CompiledMagicFunctionCallExpression, element: JQuery, parent?: ConstructOutlet) {
        return new MagicFunctionCallExpressionOutlet(element, this, parent);
    }

    // TODO
    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }




}
type FunctionResultType<RT extends CompleteReturnType> = PeelReference<RT>;
type ReturnTypeVC<RT extends CompleteReturnType> = RT extends ReferenceType ? "lvalue" : "prvalue";

export interface TypedMagicFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends MagicFunctionCallExpression, t_TypedExpression {
    readonly type: T;
    readonly valueCategory: V;
}

export interface CompiledMagicFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends TypedMagicFunctionCallExpression<T, V>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly args: readonly CompiledExpression[];
}

export class RuntimeMagicFunctionCallExpression<T extends PeelReference<CompleteReturnType> = PeelReference<CompleteReturnType>, V extends ValueCategory = ValueCategory> extends SimpleRuntimeExpression<T, V, CompiledMagicFunctionCallExpression<T, V>> {

    public args: readonly RuntimeExpression[];

    public constructor(model: CompiledMagicFunctionCallExpression<T, V>, parent: RuntimeConstruct) {
        super(model, parent);
        this.args = this.model.args.map(arg => createRuntimeExpression(arg, this));
        this.setSubexpressions(this.args);
    }

    protected operate() {
        this.model.functionImpl.operate(<RuntimeMagicFunctionCallExpression><unknown>this);
    }

}
