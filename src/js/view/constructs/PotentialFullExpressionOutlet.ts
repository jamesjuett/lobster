import { RuntimePotentialFullExpression } from "../../core/constructs/RuntimePotentialFullExpression";
import { ConstructOutlet } from "./ConstructOutlet";


export class PotentialFullExpressionOutlet<RT extends RuntimePotentialFullExpression = RuntimePotentialFullExpression> extends ConstructOutlet<RT> {
    public constructor(element: JQuery, construct: RT["model"], parent?: ConstructOutlet) {
        super(element, construct, parent);
    }
}
