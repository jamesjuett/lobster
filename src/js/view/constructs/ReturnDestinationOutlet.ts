import { RuntimeFunctionCallExpression } from "../../core/constructs/expressions/FunctionCallExpression";




export interface ReturnDestinationOutlet {
    readonly returnDestinationElement: JQuery;
    setReturnedResult(result: RuntimeFunctionCallExpression["evalResult"], suppressAnimation?: boolean): void;
}
