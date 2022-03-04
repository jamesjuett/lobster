import { StatementASTNode } from "../../../ast/ast_statements";
import { StatementOutlet } from "../../../view/constructs/StatementOutlets";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { BlockContext } from "../../compilation/contexts";
import { RuntimeFunction } from "../../compilation/functions";
import { RuntimeConstruct, SuccessfullyCompiled } from "../CPPConstruct";
import { BasicCPPConstruct } from "../BasicCPPConstruct";
import { Block } from "./Block";


export abstract class Statement<ASTType extends StatementASTNode = StatementASTNode> extends BasicCPPConstruct<BlockContext, ASTType> {

    public abstract createDefaultOutlet(this: CompiledStatement, element: JQuery, parent?: ConstructOutlet): StatementOutlet;

    public isBlock(): this is Block {
        return false;
    }

}

export interface CompiledStatement extends Statement, SuccessfullyCompiled {

}



export abstract class RuntimeStatement<C extends CompiledStatement = CompiledStatement> extends RuntimeConstruct<C> {

    public readonly containingRuntimeFunction: RuntimeFunction;

    public constructor(model: C, parent: RuntimeStatement | RuntimeFunction) {
        super(model, "statement", parent);
        if (parent instanceof RuntimeFunction) {
            this.containingRuntimeFunction = parent;
        }
        else {
            this.containingRuntimeFunction = parent.containingRuntimeFunction;
        }
    }

}
