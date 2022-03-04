import { CopyInitializerASTNode, DirectInitializerASTNode, ListInitializerASTNode } from "../../../../ast/ast_initializers";
import { TranslationUnitContext } from "../../../compilation/contexts";
import { createExpressionFromAST } from "../../expressions/expressions";
import { MemberVariableDeclaration } from "../class/MemberVariableDeclaration";
import { GlobalVariableDefinition } from "./GlobalVariableDefinition";
import { LocalVariableDefinition } from "./LocalVariableDefinition";



export type VariableDefinition = LocalVariableDefinition | GlobalVariableDefinition;

export function setInitializerFromAST(declaration: VariableDefinition | MemberVariableDeclaration, initAST: DirectInitializerASTNode | CopyInitializerASTNode | ListInitializerASTNode | undefined, context: TranslationUnitContext) {
    if (!initAST) {
        declaration.setDefaultInitializer();
    }
    else if (initAST.construct_type === "direct_initializer") {
        declaration.setDirectInitializer(initAST.args.map((a) => createExpressionFromAST(a, context)));
    }
    else if (initAST.construct_type === "copy_initializer") {
        declaration.setCopyInitializer(initAST.args.map((a) => createExpressionFromAST(a, context)));
    }
    else if (initAST.construct_type === "list_initializer") {
        declaration.setInitializerList(initAST.arg.elements.map((a) => createExpressionFromAST(a, context)));
    }
}
