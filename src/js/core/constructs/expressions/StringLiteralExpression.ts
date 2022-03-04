import { BoundedArrayType, Char } from "../../compilation/types";
import { ExpressionContext, ConstructDescription, SemanticContext } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../CPPConstruct";
import { Expression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { StringLiteralExpressionOutlet } from "../../../view/constructs/ExpressionOutlets";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { AnalyticConstruct } from "../../../analysis/predicates";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { StringLiteralASTNode } from "../../../ast/ast_expressions";

// export var EntityExpression  = Expression.extend({
//     _name: "EntityExpression",
//     valueCategory: "lvalue",
//     init : function(entity, ast, context){
//         this.initParent(ast, context);
//         this.entity = entity;
//         this.type = this.entity.type;
//     },
//     compile : function(){
//     },
//     upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         inst.setEvalResult(this.entity.runtimeLookup(sim, inst));
//         this.done(sim, inst);
//     }
// });



export class StringLiteralExpression extends Expression<StringLiteralASTNode> {
    public readonly construct_type = "string_literal_expression";

    public readonly type: BoundedArrayType<Char>;
    public readonly valueCategory = "lvalue";

    public readonly str: string;
    // create from ast code:
    // TODO: are there some literal types without conversion functions? There shouldn't be...
    // var conv = literalJSParse[this.ast.type];
    // var val = (conv ? conv(this.ast.value) : this.ast.value);
    public constructor(context: ExpressionContext, ast: StringLiteralASTNode | undefined, str: string) {
        super(context, ast);
        this.str = str;

        // type is const char
        this.type = new BoundedArrayType(new Char(true), str.length + 1);

        this.context.translationUnit.registerStringLiteral(this);
    }

    public isStringLiteralExpression() {
        return true;
    }

    public static createFromAST(ast: StringLiteralASTNode, context: ExpressionContext) {
        return new StringLiteralExpression(context, ast, ast.value);
    }

    // public createRuntimeExpression(this: CompiledStringLiteralExpression, parent: RuntimeConstruct) : RuntimeStringLiteralExpression;
    // public createRuntimeExpression<T extends AtomicType, V extends ValueCategory>(this: Compiled<Expression<T,V>>, parent: RuntimeConstruct) : never;
    // public createRuntimeExpression(this: CompiledStringLiteralExpression, parent: RuntimeConstruct) : RuntimeStringLiteralExpression {
    //     return new RuntimeStringLiteralExpression(this, parent);
    // }
    public createDefaultOutlet(this: CompiledStringLiteralExpression, element: JQuery, parent?: ConstructOutlet) {
        return new StringLiteralExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && this.str === other.str;
    }
}

export interface TypedStringLiteralExpression extends StringLiteralExpression, t_TypedExpression {
}

export interface CompiledStringLiteralExpression extends TypedStringLiteralExpression, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
}

export class RuntimeStringLiteralExpression extends RuntimeExpression<BoundedArrayType<Char>, "lvalue", CompiledStringLiteralExpression> {

    public constructor(model: CompiledStringLiteralExpression, parent: RuntimeConstruct) {
        super(model, parent);
    }

    protected upNextImpl() {
        this.setEvalResult(this.sim.memory.getStringLiteral(this.model.str)!);
        this.startCleanup();
    }

    protected stepForwardImpl() {
        // Do nothing
    }
}
