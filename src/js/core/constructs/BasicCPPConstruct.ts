import { ASTNode } from "../../ast/ASTNode";
import { Mutable } from "../../util/util";
import { TranslationUnitContext } from "../compilation/contexts";
import { CPPConstruct } from "./CPPConstruct";






export abstract class BasicCPPConstruct<ContextType extends TranslationUnitContext, ASTType extends ASTNode> extends CPPConstruct<ContextType, ASTType> {

    public parent?: CPPConstruct;

    public constructor(context: ContextType, ast: ASTType | undefined) {
        super(context, ast);
    }

    public onAttach(parent: CPPConstruct) {
        (<Mutable<this>>this).parent = parent;
    }
}
