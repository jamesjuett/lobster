import { BlockASTNode } from "../../../ast/ast_statements";
import { BlockOutlet } from "../../../view/constructs/BlockOutlet";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { areAllSemanticallyEquivalent, areSemanticallyEquivalent, BlockContext, createBlockContext, FunctionContext, SemanticContext } from "../../compilation/contexts";
import { RuntimeFunction } from "../../compilation/functions";
import { AnalyticConstruct } from "../../../analysis/predicates";
import { SuccessfullyCompiled } from "../CPPConstruct";
import { CompiledObjectDeallocator, createLocalDeallocator, ObjectDeallocator, RuntimeObjectDeallocator } from "../ObjectDeallocator";
import { CompiledStatement, Statement, RuntimeStatement } from "./Statement";
import { createStatementFromAST, AnalyticStatement, createRuntimeStatement } from "./statements";


export class Block extends Statement<BlockASTNode> {
    public readonly construct_type = "block";

    public readonly statements: readonly Statement[] = [];

    public readonly localDeallocator: ObjectDeallocator;

    public static createFromAST(ast: BlockASTNode, context: FunctionContext): Block {
        let blockContext = createBlockContext(context);
        return new Block(blockContext, ast, ast.statements.map(s => createStatementFromAST(s, blockContext)));
    }

    public constructor(context: BlockContext, ast: BlockASTNode, statements: readonly Statement[]) {
        super(context, ast);
        this.attachAll(this.statements = statements);

        this.attach(this.localDeallocator = createLocalDeallocator(context));
    }

    public isBlock(): this is Block {
        return true;
    }

    public createDefaultOutlet(this: CompiledBlock, element: JQuery, parent?: ConstructOutlet) {
        return new BlockOutlet(element, this, parent);
    }

    // isTailChild : function(child){
    //     var last = this.statements.last();
    //     if (child !== last){
    //         if (child === this.statements[this.statements.length-2] && isA(last, Statements.Return) && !last.hasExpression){
    //             return {isTail: true,
    //                 reason: "The only thing after the recursive call is an empty return.",
    //                 others: [last]
    //             }
    //         }
    //         else{
    //             var others = [];
    //             for (var otherIndex = this.statements.length-1; this.statements[otherIndex] !== child && otherIndex >= 0; --otherIndex){
    //                 var other = this.statements[otherIndex];
    //                 if (!(isA(other, Statements.Return) && !other.expression)){
    //                     others.unshift(other);
    //                 }
    //             }
    //             return {isTail: false,
    //                 reason: "There are other statements in this block that will execute after the recursive call.",
    //                 others: others
    //             }
    //         }
    //     }
    //     else{
    //         return {isTail: true};
    //     }
    // }
    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        if (other.construct_type === this.construct_type
            && areAllSemanticallyEquivalent(this.statements, other.statements, ec)
            && areSemanticallyEquivalent(this.localDeallocator, other.localDeallocator, ec)) {
            return true;
        }


        if (other.construct_type === this.construct_type) {

            // Try identifying chunks that can be rearranged
            let chunks = this.getChunks();
            let otherChunks = other.getChunks();

            // Now our condition is just that each chunk is equivalent
            if (chunks.length === otherChunks.length && chunks.every((c, i) => areChunksEquivalent(c, otherChunks[i], ec))
                && areSemanticallyEquivalent(this.localDeallocator, other.localDeallocator, ec)) {
                return true;
            }
        }

        return false;
    }


    private getChunks() {
        let chunks: Statement[][] = [];
        let currentChunk: { stmts: Statement[]; entitiesUsed: Set<number>; } | undefined;
        (<AnalyticStatement[]>this.statements).forEach(stmt => {
            if (stmt.construct_type === "declaration_statement" || stmt.construct_type === "expression_statement") {
                if (currentChunk) {
                    if (stmt.entitiesUsed().some(e => currentChunk!.entitiesUsed.has(e.entityId))) {
                        // some entity was used, start a new chunk
                        chunks.push(currentChunk.stmts);
                        currentChunk = { stmts: [stmt], entitiesUsed: new Set(stmt.entitiesUsed().map(e => e.entityId)) };
                    }
                    else {
                        currentChunk.stmts.push(stmt);
                        stmt.entitiesUsed().forEach(e => currentChunk!.entitiesUsed.add(e.entityId));
                    }
                }
                else {
                    currentChunk = { stmts: [stmt], entitiesUsed: new Set(stmt.entitiesUsed().map(e => e.entityId)) };
                }
            }
            else {
                // control flow statements
                if (currentChunk) {
                    chunks.push(currentChunk.stmts);
                    currentChunk = undefined;
                }
                chunks.push([stmt]);
            }
        });
        if (currentChunk) {
            chunks.push(currentChunk.stmts);
        }
        return chunks;
    }
}
function areChunksEquivalent(chunk1: Statement[], chunk2: Statement[], ec: SemanticContext) {
    return areAllSemanticallyEquivalent(chunk1, chunk2, ec) || areAllSemanticallyEquivalent(chunk1, chunk2.slice().reverse(), ec);
}

export interface CompiledBlock extends Block, SuccessfullyCompiled {
    readonly statements: readonly CompiledStatement[];
    readonly localDeallocator: CompiledObjectDeallocator;
}

export class RuntimeBlock extends RuntimeStatement<CompiledBlock> {

    public readonly statements: readonly RuntimeStatement[];

    public readonly localDeallocator: RuntimeObjectDeallocator;

    private index = 0;

    public constructor(model: CompiledBlock, parent: RuntimeStatement | RuntimeFunction) {
        super(model, parent);
        this.statements = model.statements.map((stmt) => createRuntimeStatement(stmt, this));
        this.localDeallocator = model.localDeallocator.createRuntimeConstruct(this);
        this.setCleanupConstruct(this.localDeallocator);
    }

    protected upNextImpl() {
        if (this.index < this.statements.length) {
            this.observable.send("index", this.index);
            this.sim.push(this.statements[this.index++]);
        }
        else {
            this.startCleanup();
        }
    }

    public stepForwardImpl() {
    }


}
