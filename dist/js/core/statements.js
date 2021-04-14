"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeForStatement = exports.ForStatement = exports.RuntimeWhileStatement = exports.WhileStatement = exports.RuntimeIfStatement = exports.IfStatement = exports.RuntimeBlock = exports.Block = exports.RuntimeReturnStatement = exports.ReturnStatement = exports.RuntimeBreakStatement = exports.BreakStatement = exports.RuntimeDeclarationStatement = exports.DeclarationStatement = exports.RuntimeNullStatement = exports.NullStatement = exports.RuntimeExpressionStatement = exports.ExpressionStatement = exports.AnythingStatement = exports.UnsupportedStatement = exports.RuntimeStatement = exports.Statement = exports.createRuntimeStatement = exports.createStatementFromAST = void 0;
const constructs_1 = require("./constructs");
const errors_1 = require("./errors");
const expressions_1 = require("./expressions");
const declarations_1 = require("./declarations");
const initializers_1 = require("./initializers");
const types_1 = require("./types");
const entities_1 = require("./entities");
const util_1 = require("../util/util");
const codeOutlets_1 = require("../view/codeOutlets");
const functions_1 = require("./functions");
const predicates_1 = require("./predicates");
const ObjectDeallocator_1 = require("./ObjectDeallocator");
const StatementConstructsMap = {
    "labeled_statement": (ast, context) => new UnsupportedStatement(context, ast, "labeled statement"),
    "block": (ast, context) => Block.createFromAST(ast, context),
    "if_statement": (ast, context) => IfStatement.createFromAST(ast, context),
    "while_statement": (ast, context) => WhileStatement.createFromAST(ast, context),
    "dowhile_statement": (ast, context) => new UnsupportedStatement(context, ast, "do-while loop"),
    "for_statement": (ast, context) => ForStatement.createFromAST(ast, context),
    "break_statement": (ast, context) => BreakStatement.createFromAST(ast, context),
    "continue_statement": (ast, context) => new UnsupportedStatement(context, ast, "continue statement"),
    "return_statement": (ast, context) => ReturnStatement.createFromAST(ast, context),
    "declaration_statement": (ast, context) => DeclarationStatement.createFromAST(ast, context),
    "expression_statement": (ast, context) => ExpressionStatement.createFromAST(ast, context),
    "null_statement": (ast, context) => new NullStatement(context, ast),
    "anything_construct": (ast, context) => new AnythingStatement(context, ast)
};
function createStatementFromAST(ast, context) {
    return StatementConstructsMap[ast.construct_type](ast, context);
}
exports.createStatementFromAST = createStatementFromAST;
const StatementConstructsRuntimeMap = {
    "unsupported_statement": (construct, parent) => { throw new Error("Cannot create a runtime instance of an unsupported construct."); },
    // "labeled_statement" : (construct: LabeledStatement, parent: RuntimeStatement) => new UnsupportedStatement(context, "labeled statement").setAST(ast),
    "block": (construct, parent) => new RuntimeBlock(construct, parent),
    "if_statement": (construct, parent) => new RuntimeIfStatement(construct, parent),
    "while_statement": (construct, parent) => new RuntimeWhileStatement(construct, parent),
    // "dowhile_statement" : (construct: DoWhileStatement, parent: RuntimeStatement) => new UnsupportedStatement(context, "do-while loop").setAST(ast),
    "for_statement": (construct, parent) => new RuntimeForStatement(construct, parent),
    "break_statement": (construct, parent) => new RuntimeBreakStatement(construct, parent),
    // "continue_statement" : (construct: ContinueStatement, parent: RuntimeStatement) => new UnsupportedStatement(context, "continue statement").setAST(ast),
    "return_statement": (construct, parent) => new RuntimeReturnStatement(construct, parent),
    "declaration_statement": (construct, parent) => new RuntimeDeclarationStatement(construct, parent),
    "expression_statement": (construct, parent) => new RuntimeExpressionStatement(construct, parent),
    "null_statement": (construct, parent) => new RuntimeNullStatement(construct, parent)
};
function createRuntimeStatement(construct, parent) {
    return StatementConstructsRuntimeMap[construct.construct_type](construct, parent);
}
exports.createRuntimeStatement = createRuntimeStatement;
class Statement extends constructs_1.BasicCPPConstruct {
    isBlock() {
        return false;
    }
}
exports.Statement = Statement;
class RuntimeStatement extends constructs_1.RuntimeConstruct {
    constructor(model, parent) {
        super(model, "statement", parent);
        if (parent instanceof functions_1.RuntimeFunction) {
            this.containingRuntimeFunction = parent;
        }
        else {
            this.containingRuntimeFunction = parent.containingRuntimeFunction;
        }
    }
}
exports.RuntimeStatement = RuntimeStatement;
class UnsupportedStatement extends Statement {
    constructor(context, ast, unsupportedName) {
        super(context, ast);
        this.construct_type = "unsupported_statement";
        this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, unsupportedName));
    }
    createDefaultOutlet(element, parent) {
        throw new Error("Cannot create an outlet for an unsupported construct.");
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type;
    }
}
exports.UnsupportedStatement = UnsupportedStatement;
class AnythingStatement extends Statement {
    constructor(context, ast) {
        super(context, ast);
        this.construct_type = "anything_construct";
        this.addNote(errors_1.CPPError.lobster.anything_construct(this));
    }
    createDefaultOutlet(element, parent) {
        throw new Error("Cannot create an outlet for an \"anything\" placeholder construct.");
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return true;
    }
}
exports.AnythingStatement = AnythingStatement;
class ExpressionStatement extends Statement {
    constructor(context, ast, expression) {
        super(context, ast);
        this.construct_type = "expression_statement";
        this.attach(this.expression = expression);
    }
    static createFromAST(ast, context) {
        return new ExpressionStatement(context, ast, expressions_1.createExpressionFromAST(ast.expression, context));
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.ExpressionStatementOutlet(element, this, parent);
    }
    isTailChild(child) {
        return { isTail: true };
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && constructs_1.areSemanticallyEquivalent(this.expression, other.expression, equivalenceContext);
    }
}
exports.ExpressionStatement = ExpressionStatement;
class RuntimeExpressionStatement extends RuntimeStatement {
    constructor(model, parent) {
        super(model, parent);
        this.index = "expr";
        this.expression = expressions_1.createRuntimeExpression(this.model.expression, this);
    }
    upNextImpl() {
        if (this.index === "expr") {
            this.sim.push(this.expression);
            this.index = "done";
        }
        else {
            this.startCleanup();
        }
    }
    stepForwardImpl() {
    }
}
exports.RuntimeExpressionStatement = RuntimeExpressionStatement;
class NullStatement extends Statement {
    constructor() {
        super(...arguments);
        this.construct_type = "null_statement";
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.NullStatementOutlet(element, this, parent);
    }
    isTailChild(child) {
        return { isTail: true }; // Note: NullStatement will never actually have children, so this isn't used
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type;
    }
}
exports.NullStatement = NullStatement;
class RuntimeNullStatement extends RuntimeStatement {
    constructor(model, parent) {
        super(model, parent);
    }
    upNextImpl() {
        this.startCleanup();
    }
    stepForwardImpl() {
        // nothing to do
    }
}
exports.RuntimeNullStatement = RuntimeNullStatement;
class DeclarationStatement extends Statement {
    constructor(context, ast, declarations) {
        super(context, ast);
        this.construct_type = "declaration_statement";
        if (declarations instanceof constructs_1.InvalidConstruct) {
            this.attach(this.declarations = declarations);
            return;
        }
        if (declarations instanceof declarations_1.FunctionDefinition) {
            this.addNote(errors_1.CPPError.stmt.function_definition_prohibited(this));
            this.attach(this.declarations = declarations);
            return;
        }
        if (declarations instanceof declarations_1.ClassDefinition) {
            this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, "local classes"));
            this.attach(this.declarations = declarations);
            return;
        }
        this.attachAll(this.declarations = declarations);
    }
    static createFromAST(ast, context) {
        return new DeclarationStatement(context, ast, declarations_1.createLocalDeclarationFromAST(ast.declaration, context));
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.DeclarationStatementOutlet(element, this, parent);
    }
    isTailChild(child) {
        return { isTail: true };
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && Array.isArray(this.declarations) && Array.isArray(other.declarations)
            && constructs_1.areAllSemanticallyEquivalent(this.declarations, other.declarations, equivalenceContext);
    }
}
exports.DeclarationStatement = DeclarationStatement;
class RuntimeDeclarationStatement extends RuntimeStatement {
    constructor(model, parent) {
        super(model, parent);
        this.currentDeclarationIndex = null;
    }
    upNextImpl() {
        let nextIndex = this.currentDeclarationIndex === null ? 0 : this.currentDeclarationIndex + 1;
        let initializers = this.model.declarations.map(d => d.initializer);
        if (nextIndex < initializers.length) {
            this.currentDeclarationIndex = nextIndex;
            let init = initializers[nextIndex];
            if (init) {
                // Only declarations with an initializer (e.g. a variable definition) have something
                // to do at runtime. Others (e.g. typedefs) do nothing.
                this.observable.send("initializing", nextIndex);
                let runtimeInit = init.createRuntimeInitializer(this);
                this.sim.push(runtimeInit);
            }
        }
        else {
            this.startCleanup();
        }
    }
    stepForwardImpl() {
        return false;
    }
}
exports.RuntimeDeclarationStatement = RuntimeDeclarationStatement;
class BreakStatement extends Statement {
    constructor(context, ast, expression) {
        super(context, ast);
        this.construct_type = "break_statement";
        if (!context.withinLoop) {
            this.addNote(errors_1.CPPError.stmt.breakStatement.location(this));
        }
    }
    static createFromAST(ast, context) {
        return new BreakStatement(context, ast);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.BreakStatementOutlet(element, this, parent);
    }
    // isTailChild : function(child){
    //     return {isTail: true,
    //         reason: "The recursive call is immediately followed by a return."};
    // }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type;
    }
}
exports.BreakStatement = BreakStatement;
class RuntimeBreakStatement extends RuntimeStatement {
    constructor(model, parent) {
        super(model, parent);
    }
    upNextImpl() {
        // nothing
    }
    stepForwardImpl() {
        let construct = this;
        // start cleanup for everything on the way up to the loop
        while (construct.model.construct_type !== "while_statement" && construct.model.construct_type !== "for_statement") {
            construct.startCleanup();
            construct = construct.parent;
        }
        // start cleanup for the loop
        construct.startCleanup();
    }
}
exports.RuntimeBreakStatement = RuntimeBreakStatement;
class ReturnStatement extends Statement {
    constructor(context, ast, expression) {
        super(context, ast);
        this.construct_type = "return_statement";
        let returnType = this.context.containingFunction.type.returnType;
        if (returnType instanceof types_1.VoidType) {
            if (expression) {
                // We have an expression to return, but the type is void, so that's bad
                this.addNote(errors_1.CPPError.stmt.returnStatement.exprVoid(this));
                this.attach(this.expression = expression);
            }
            return;
        }
        // A return statement with no expression is only allowed in void functions.
        // At the moment, constructors/destructors are hacked to have void return type,
        // so this check is ok for return statements in a constructor.
        if (!expression) {
            this.addNote(errors_1.CPPError.stmt.returnStatement.empty(this));
            return;
        }
        if (returnType.isIncompleteObjectType()) {
            this.addNote(errors_1.CPPError.stmt.returnStatement.incomplete_type(this, returnType));
            this.attach(this.expression = expression);
            return;
        }
        if (returnType.isReferenceType()) {
            this.returnInitializer = initializers_1.DirectInitializer.create(context, new entities_1.ReturnByReferenceEntity(returnType), [expression], "copy");
        }
        else if (returnType.isCompleteObjectType()) {
            this.returnInitializer = initializers_1.DirectInitializer.create(context, new entities_1.ReturnObjectEntity(returnType), [expression], "copy");
        }
        else {
            util_1.assertNever(returnType);
        }
        // Note: The expression is NOT attached directly here, since it's attached under the initializer.
        this.attach(this.returnInitializer);
    }
    static createFromAST(ast, context) {
        return ast.expression
            ? new ReturnStatement(context, ast, expressions_1.createExpressionFromAST(ast.expression, context))
            : new ReturnStatement(context, ast);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.ReturnStatementOutlet(element, this, parent);
    }
    // isTailChild : function(child){
    //     return {isTail: true,
    //         reason: "The recursive call is immediately followed by a return."};
    // }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && constructs_1.areSemanticallyEquivalent(this.expression, other.expression, equivalenceContext);
    }
}
exports.ReturnStatement = ReturnStatement;
var RuntimeReturnStatementIndices;
(function (RuntimeReturnStatementIndices) {
    RuntimeReturnStatementIndices[RuntimeReturnStatementIndices["PUSH_INITIALIZER"] = 0] = "PUSH_INITIALIZER";
    RuntimeReturnStatementIndices[RuntimeReturnStatementIndices["RETURN"] = 1] = "RETURN";
})(RuntimeReturnStatementIndices || (RuntimeReturnStatementIndices = {}));
class RuntimeReturnStatement extends RuntimeStatement {
    constructor(model, parent) {
        super(model, parent);
        this.index = RuntimeReturnStatementIndices.PUSH_INITIALIZER;
        if (model.returnInitializer) {
            this.returnInitializer = model.returnInitializer.createRuntimeInitializer(this);
        }
    }
    upNextImpl() {
        if (this.index === RuntimeReturnStatementIndices.PUSH_INITIALIZER) {
            if (this.returnInitializer) {
                this.sim.push(this.returnInitializer);
            }
            this.index = RuntimeReturnStatementIndices.RETURN;
        }
    }
    stepForwardImpl() {
        if (this.index === RuntimeReturnStatementIndices.RETURN) {
            let func = this.containingRuntimeFunction;
            this.observable.send("returned", { call: func.caller });
            this.sim.startCleanupUntil(func);
        }
    }
}
exports.RuntimeReturnStatement = RuntimeReturnStatement;
class Block extends Statement {
    constructor(context, ast, statements) {
        super(context, ast);
        this.construct_type = "block";
        this.statements = [];
        this.attachAll(this.statements = statements);
        this.attach(this.localDeallocator = ObjectDeallocator_1.createLocalDeallocator(context));
    }
    static createFromAST(ast, context) {
        let blockContext = constructs_1.createBlockContext(context);
        return new Block(blockContext, ast, ast.statements.map(s => createStatementFromAST(s, blockContext)));
    }
    isBlock() {
        return true;
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.BlockOutlet(element, this, parent);
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
    isSemanticallyEquivalent_impl(other, ec) {
        if (other.construct_type === this.construct_type
            && constructs_1.areAllSemanticallyEquivalent(this.statements, other.statements, ec)
            && constructs_1.areSemanticallyEquivalent(this.localDeallocator, other.localDeallocator, ec)) {
            return true;
        }
        if (other.construct_type === this.construct_type) {
            // Try identifying chunks that can be rearranged
            let chunks = this.getChunks();
            let otherChunks = other.getChunks();
            // Now our condition is just that each chunk is equivalent
            if (chunks.length === otherChunks.length && chunks.every((c, i) => areChunksEquivalent(c, otherChunks[i], ec))
                && constructs_1.areSemanticallyEquivalent(this.localDeallocator, other.localDeallocator, ec)) {
                return true;
            }
        }
        return false;
    }
    getChunks() {
        let chunks = [];
        let currentChunk;
        this.statements.forEach(stmt => {
            if (stmt.construct_type === "declaration_statement" || stmt.construct_type === "expression_statement") {
                if (currentChunk) {
                    if (stmt.entitiesUsed().some(e => currentChunk.entitiesUsed.has(e.entityId))) {
                        // some entity was used, start a new chunk
                        chunks.push(currentChunk.stmts);
                        currentChunk = { stmts: [stmt], entitiesUsed: new Set(stmt.entitiesUsed().map(e => e.entityId)) };
                    }
                    else {
                        currentChunk.stmts.push(stmt);
                        stmt.entitiesUsed().forEach(e => currentChunk.entitiesUsed.add(e.entityId));
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
exports.Block = Block;
function areChunksEquivalent(chunk1, chunk2, ec) {
    return constructs_1.areAllSemanticallyEquivalent(chunk1, chunk2, ec) || constructs_1.areAllSemanticallyEquivalent(chunk1, chunk2.slice().reverse(), ec);
}
class RuntimeBlock extends RuntimeStatement {
    constructor(model, parent) {
        super(model, parent);
        this.index = 0;
        this.statements = model.statements.map((stmt) => createRuntimeStatement(stmt, this));
        this.localDeallocator = model.localDeallocator.createRuntimeConstruct(this);
        this.setCleanupConstruct(this.localDeallocator);
    }
    upNextImpl() {
        if (this.index < this.statements.length) {
            this.observable.send("index", this.index);
            this.sim.push(this.statements[this.index++]);
        }
        else {
            this.startCleanup();
        }
    }
    stepForwardImpl() {
    }
}
exports.RuntimeBlock = RuntimeBlock;
// export class ArrayDeallocator extends BasicCPPConstruct<TranslationUnitContext, ASTNode> {
//     public readonly construct_type = "ArrayDeallocator";
//     public readonly target: ObjectEntity<BoundedArrayType>;
//     public readonly dtor?: FunctionCall;
//     public constructor(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>) {
//         super(context, undefined); // Has no AST
//         this.target = target;
//         if (target.type.elemType.isCompleteClassType()) {
//             let dtorFn = target.type.elemType.classDefinition.destructor;
//             if (dtorFn) {
//                 this.attach(this.dtor = new FunctionCall(context, dtorFn, [], target.type.elemType));
//             }
//             else {
//                 this.addNote(CPPError.declaration.dtor.no_destructor_array(this, target));
//             }
//         }
//     }
//     public createRuntimeConstruct(this: CompiledArrayDeallocator, parent: RuntimeConstruct) {
//         return new RuntimeArrayDeallocator(this, parent);
//     }
//     // public isTailChild(child: ExecutableConstruct) {
//     //     return {isTail: true};
//     // }
// }
// export interface CompiledArrayDeallocator extends ArrayDeallocator, SuccessfullyCompiled {
//     readonly dtor?: CompiledFunctionCall;
// }
// export class RuntimeArrayDeallocator extends RuntimeConstruct<CompiledArrayDeallocator> {
//     private index?: number;
//     private target?: CPPObject<BoundedArrayType>;
//     private justDestructed: ArraySubobject<CompleteClassType> | undefined = undefined;
//     public readonly parent!: RuntimeBlock | RuntimeForStatement; // narrows type from base class
//     public constructor(model: CompiledArrayDeallocator, parent: RuntimeConstruct) {
//         super(model, "cleanup", parent);
//     }
//     protected upNextImpl() {
//         if (this.justDestructed) {
//             this.sim.memory.killObject(this.justDestructed, this);
//             this.justDestructed = undefined;
//         }
//     }
//     public stepForwardImpl() {
//         if (!this.target) {
//             this.target = this.model.target.runtimeLookup(this);
//             // Find the index of the last allocated object still alive
//             let index = this.target.numArrayElemSubobjects() - 1;
//             while(!this.target.getArrayElemSubobject(index).isAlive) {
//                 --index;
//             }
//             this.index = index;
//         }
//         let locals = this.model.context.blockLocals.localVariables;
//         while(this.index >= 0) {
//             // Destroy local at given index
//             let local = locals[this.index];
//             let dtor = this.model.dtors[this.index];
//             --this.index;
//             if (local.variableKind === "reference") {
//                 // If the program is running, and this reference was bound
//                 // to some object, the referred type should have
//                 // been completed.
//                 assert(local.isTyped(isReferenceToCompleteType));
//                 // destroying a reference doesn't really require doing anything,
//                 // but we notify the referred object this reference has been removed
//                 local.runtimeLookup(this)?.onReferenceUnbound(local);
//             }
//             else if (local.isTyped(isCompleteClassType)) {
//                 // a local class-type object, so we call the dtor
//                 assert(dtor);
//                 let obj = local.runtimeLookup(this);
//                 this.sim.push(dtor.createRuntimeFunctionCall(this, obj));
//                 // need to destroy the object once dtor is done, so we keep track of it here
//                 this.justDestructed = obj;
//                 // return so that the dtor, which is now on top of the stack, can run instead
//                 return;
//             }
//             else {
//                 // a local non-class-type object, no dtor needed.
//                 this.sim.memory.killObject(local.runtimeLookup(this), this);
//             }
//         }
//         this.startCleanup();
//     }
// }
// export class StaticDeallocator extends BasicCPPConstruct<BlockContext, ASTNode> {
//     public readonly construct_type = "StaticDeallocator";
//     public readonly dtors: (FunctionCall | undefined)[];
//     public constructor(context: BlockContext) {
//         super(context, undefined); // Has no AST
//         let staticVariables = context.blockLocals.staticVariables;
//         this.dtors = staticVariables.map((stat) => {
//             if (stat.variableKind === "object" && stat.isTyped(isCompleteClassType)) {
//                 let dtor = stat.type.classDefinition.destructor;
//                 if (dtor) {
//                     let dtorCall = new FunctionCall(context, dtor, [], stat.type);
//                     this.attach(dtorCall);
//                     return dtorCall;
//                 }
//                 else{
//                     this.addNote(CPPError.declaration.dtor.no_destructor_static(stat.firstDeclaration, stat));
//                 }
//             }
//             return undefined;
//         });
//     }
//     public createRuntimeConstruct(this: CompiledStaticDeallocator, parent: RuntimeBlock | RuntimeForStatement) {
//         return new RuntimeStaticDeallocator(this, parent);
//     }
//     // public isTailChild(child: ExecutableConstruct) {
//     //     return {isTail: true};
//     // }
// }
// export interface CompiledStaticDeallocator extends StaticDeallocator, SuccessfullyCompiled {
//     readonly dtors: (CompiledFunctionCall | undefined)[];
// }
// export class RuntimeStaticDeallocator extends RuntimeConstruct<CompiledStaticDeallocator> {
//     private index;
//     private justDestructed: AutoObject<CompleteClassType> | undefined = undefined;
//     public readonly parent!: RuntimeBlock | RuntimeForStatement; // narrows type from base class
//     public constructor(model: CompiledStaticDeallocator, parent: RuntimeBlock | RuntimeForStatement) {
//         super(model, "expression", parent);
//         this.index = this.model.context.blockLocals.localVariables.length - 1;
//     }
//     protected upNextImpl() {
//         if (this.justDestructed) {
//             this.sim.memory.killObject(this.justDestructed, this);
//             this.justDestructed = undefined;
//         }
//     }
//     public stepForwardImpl() {
//         let locals = this.model.context.blockLocals.localVariables;
//         while(this.index >= 0) {
//             // Destroy local at given index
//             let local = locals[this.index];
//             let dtor = this.model.dtors[this.index];
//             --this.index;
//             if (local.variableKind === "reference") {
//                 // If the program is running, and this reference was bound
//                 // to some object, the referred type should have
//                 // been completed.
//                 assert(local.isTyped(isReferenceToCompleteType));
//                 // destroying a reference doesn't really require doing anything,
//                 // but we notify the referred object this reference has been removed
//                 local.runtimeLookup(this)?.onReferenceUnbound(local);
//             }
//             else if (local.isTyped(isCompleteClassType)) {
//                 // a local class-type object, so we call the dtor
//                 assert(dtor);
//                 let obj = local.runtimeLookup(this);
//                 this.sim.push(dtor.createRuntimeFunctionCall(this, obj));
//                 // need to destroy the object once dtor is done, so we keep track of it here
//                 this.justDestructed = obj;
//                 // return so that the dtor, which is now on top of the stack, can run instead
//                 return;
//             }
//             else {
//                 // a local non-class-type object, no dtor needed.
//                 this.sim.memory.killObject(local.runtimeLookup(this), this);
//             }
//         }
//         this.startCleanup();
//     }
// }
// export class OpaqueStatement extends StatementBase implements SuccessfullyCompiled {
//     public _t_isCompiled: never;
//     private readonly effects: (rtBlock: RuntimeOpaqueStatement) => void;
//     public constructor(context: BlockContext, effects: (rtBlock: RuntimeOpaqueStatement) => void) {
//         super(context);
//         this.effects = effects;
//     }
//     public createRuntimeStatement(parent: RuntimeStatement | RuntimeFunction) {
//         return new RuntimeOpaqueStatement(this, parent, this.effects);
//     }
// }
// export class RuntimeOpaqueStatement extends RuntimeStatement<OpaqueStatement> {
//     private effects: (rtBlock: RuntimeOpaqueStatement) => void;
//     public constructor (model: OpaqueStatement, parent: RuntimeStatement | RuntimeFunction, effects: (rtBlock: RuntimeOpaqueStatement) => void) {
//         super(model, parent);
//         this.effects = effects;
//     }
//     protected upNextImpl() {
//         // Nothing to do
//     }
//     public stepForwardImpl() {
//         this.effects(this);
//         this.startCleanup();
//     }
//     // isTailChild : function(child){
//     //     return {isTail: true,
//     //         reason: "The recursive call is immediately followed by a return."};
//     // }
// }
class IfStatement extends Statement {
    constructor(context, ast, condition, then, otherwise) {
        super(context, ast);
        this.construct_type = "if_statement";
        if (condition.isWellTyped()) {
            this.attach(this.condition = expressions_1.standardConversion(condition, types_1.Bool.BOOL));
        }
        else {
            this.attach(this.condition = condition);
        }
        this.attach(this.then = then);
        if (otherwise) {
            this.attach(this.otherwise = otherwise);
        }
        if (this.condition.isWellTyped() && !predicates_1.Predicates.isTypedExpression(this.condition, types_1.isType(types_1.Bool))) {
            this.addNote(errors_1.CPPError.stmt.if.condition_bool(this, this.condition));
        }
    }
    static createFromAST(ast, context) {
        let condition = expressions_1.createExpressionFromAST(ast.condition, context);
        // If either of the substatements are not a block, they get their own implicit block context.
        // (If the substatement is a block, it creates its own block context, so we don't do that here.)
        let then = ast.then.construct_type === "block" ?
            createStatementFromAST(ast.then, context) :
            createStatementFromAST({
                construct_type: "block",
                source: ast.then.source,
                statements: [ast.then]
            }, context);
        if (!ast.otherwise) { // no else branch
            return new IfStatement(context, ast, condition, then);
        }
        else { // else branch is present
            // See note above about substatement implicit block context
            let otherwise = ast.otherwise.construct_type === "block" ?
                createStatementFromAST(ast.otherwise, context) :
                createStatementFromAST({
                    construct_type: "block",
                    source: ast.then.source,
                    statements: [ast.otherwise]
                }, context);
            return new IfStatement(context, ast, condition, then, otherwise);
        }
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.IfStatementOutlet(element, this, parent);
    }
    //     isTailChild : function(child){
    //         if (child === this.condition){
    //             return {isTail: false,
    //                 reason: "After the function returns, one of the branches will run.",
    //                 others: [this.then, this.otherwise]
    //             }
    //         }
    //         else{
    //             if (this.otherwise){
    //                 //if (child === this.then){
    //                     return {isTail: true,
    //                         reason: "Only one branch in an if/else structure can ever execute, so don't worry about the code in the other branches."
    //                     };
    //                 //}
    //                 //else{
    //                 //    return {isTail: true,
    //                 //        reason: "Don't worry about the code in the if branch - if the recursive call even happened it means we took the else branch."
    //                 //    };
    //                 //}
    //             }
    //             else{
    //                 return {isTail: true
    //                 };
    //             }
    //         }
    //     }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && constructs_1.areSemanticallyEquivalent(this.condition, other.condition, equivalenceContext)
            && constructs_1.areSemanticallyEquivalent(this.then, other.then, equivalenceContext)
            && constructs_1.areSemanticallyEquivalent(this.otherwise, other.otherwise, equivalenceContext);
    }
}
exports.IfStatement = IfStatement;
class RuntimeIfStatement extends RuntimeStatement {
    constructor(model, parent) {
        super(model, parent);
        this.index = 0;
        this.condition = expressions_1.createRuntimeExpression(model.condition, this);
        this.then = createRuntimeStatement(model.then, this);
        if (model.otherwise) {
            this.otherwise = createRuntimeStatement(model.otherwise, this);
        }
    }
    upNextImpl() {
        RuntimeIfStatement.upNextFns[this.index++](this);
    }
    stepForwardImpl() {
        // Nothing to do here
    }
}
exports.RuntimeIfStatement = RuntimeIfStatement;
RuntimeIfStatement.upNextFns = [
    (rt) => {
        rt.sim.push(rt.condition);
    },
    (rt) => {
        if (rt.condition.evalResult.rawValue) {
            rt.sim.push(rt.then);
        }
        else if (rt.otherwise) {
            rt.sim.push(rt.otherwise);
        }
    },
    (rt) => {
        rt.startCleanup();
    },
];
class WhileStatement extends Statement {
    constructor(context, ast, condition, body) {
        super(context, ast);
        this.construct_type = "while_statement";
        if (condition.isWellTyped()) {
            this.attach(this.condition = expressions_1.standardConversion(condition, types_1.Bool.BOOL));
        }
        else {
            this.attach(this.condition = condition);
        }
        this.attach(this.body = body);
        if (this.condition.isWellTyped() && !predicates_1.Predicates.isTypedExpression(this.condition, types_1.isType(types_1.Bool))) {
            this.addNote(errors_1.CPPError.stmt.iteration.condition_bool(this, this.condition));
        }
    }
    static createFromAST(ast, outerContext) {
        let whileContext = constructs_1.createLoopContext(outerContext);
        // If the body substatement is not a block, it gets its own implicit block context.
        // (If the substatement is a block, it creates its own block context, so we don't do that here.)
        let body = ast.body.construct_type === "block" ?
            createStatementFromAST(ast.body, whileContext) :
            createStatementFromAST(ast.body, constructs_1.createBlockContext(whileContext));
        return new WhileStatement(whileContext, ast, expressions_1.createExpressionFromAST(ast.condition, whileContext), body);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.WhileStatementOutlet(element, this, parent);
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && constructs_1.areSemanticallyEquivalent(this.condition, other.condition, equivalenceContext)
            && constructs_1.areSemanticallyEquivalent(this.body, other.body, equivalenceContext);
    }
}
exports.WhileStatement = WhileStatement;
class RuntimeWhileStatement extends RuntimeStatement {
    constructor(model, parent) {
        super(model, parent);
        this.index = 0;
        this.condition = expressions_1.createRuntimeExpression(model.condition, this);
        // Do not create body here, since it might not actually run
    }
    upNextImpl() {
        RuntimeWhileStatement.upNextFns[this.index](this);
        this.index = (this.index + 1) % RuntimeWhileStatement.upNextFns.length;
    }
    stepForwardImpl() {
        this.condition = expressions_1.createRuntimeExpression(this.model.condition, this);
        delete this.body;
    }
}
exports.RuntimeWhileStatement = RuntimeWhileStatement;
RuntimeWhileStatement.upNextFns = [
    (rt) => {
        rt.sim.push(rt.condition);
    },
    (rt) => {
        if (rt.condition.evalResult.rawValue === 1) {
            rt.sim.push(util_1.asMutable(rt).body = createRuntimeStatement(rt.model.body, rt));
        }
        else {
            rt.startCleanup();
        }
    },
    (rt) => {
        // Do nothing, pass to stepForward, which will reset
    }
];
// The ForStatement class contains additional comments intended
// as a general tutorial included in the `core` README.md
// Generally, constructs provide a template parameter
// to indicate the type of AST node they are created from
class ForStatement extends Statement {
    // Constructors for language construct classes take
    // in a `context`, which provides contextual information
    // necessary for compilation (e.g. a scope where variables
    // can be looked up, the function that contains this code, etc.).
    // In addition, the child constructs are provided that
    // compose the construct. These children are presumed to
    // have already been constructed with the appropriate context
    // of their own. This is usually done by a createFromAST()
    // function (see below).
    constructor(context, ast, initial, condition, body, post) {
        super(context, ast);
        // The discriminant here matches the one from ForStatementASTNode
        this.construct_type = "for_statement";
        // Use .attach() to build the links in the construct tree
        this.attach(this.initial = initial);
        if (condition.isWellTyped()) {
            // If the condition has a type, we can attempt to convert
            // it to a boolean. If such a conversion can be made,
            // we should attach the conversion, which has the original
            // condition as a child. (If it can't be made,
            // standardConversion() just returns the original).
            this.attach(this.condition = expressions_1.standardConversion(condition, types_1.Bool.BOOL));
        }
        else {
            // If the condition wasn't well typed, we can't even try
            // the conversion, so we just attach the original condition.
            this.attach(this.condition = condition);
        }
        // If our condition is not a bool (and couldn't be converted)
        // to one earlier, give an error. However, if the condition
        // didn't have any type, we don't want error spam, so we won't
        // say anything. (Any non-well-typed exppression will already
        // have an error of its own.) 
        if (this.condition.isWellTyped() && !predicates_1.Predicates.isTypedExpression(this.condition, types_1.isType(types_1.Bool))) {
            this.addNote(errors_1.CPPError.stmt.iteration.condition_bool(this, this.condition));
        }
        // Nothing in particular to check here, since as with
        // the initial, we don't care about types or anything.
        // Because of syntax rules baked into the nature of this
        // constructor, we're already guaranteed the body is a
        // statement and the post is an expression as they should be.
        this.attach(this.body = body);
        if (post) {
            this.attach(this.post = post);
        }
        this.attach(this.localDeallocator = ObjectDeallocator_1.createLocalDeallocator(context));
    }
    // The constructor above poses a conundrum. It asks that
    // we pass in fully instantiated, ready-to-go child constructs
    // of which the `ForStatement` will be composed. However,
    // those children cannot be made in a context-insensitive
    // fashion. That's not how C++ works! The resolution is that
    // all context-sensitive stuff is extracted into the `context`
    // provided when constructing the constructs. Generally, this
    // will all be handled in a createFromAST function. It takes
    // in the pure syntax from the AST and does all the hard work
    // of building, situating, and connecting together all the
    // constructs correctly.
    static createFromAST(ast, outerContext) {
        // The context parameter to this function tells us what
        // context the for loop originally occurs in. For example, in:
        // void func() {
        //   for(int i = 0; i < 10; ++i) {
        //     cout << i << endl;
        //   }
        // }
        // `context` refers to the function body block context for `func`
        // Below, we'll also consider the body block context of the inner
        // set of curly braces for the for loop.
        // For loops are kind of obnoxious when it comes to scopes and object lifetimes
        // because any variables declared in the init-statement part have a different
        // block lifetime but the same block scope as variables in the body of the loop.
        // For example:
        //   int i = 0;
        //   for(A a; i < 10; ++i) {
        //     int i; // allowed, different scope as previous i
        //     int a; // not allowed, same scope as earlier a
        //     B b;
        //     cout << i << endl;
        //   }
        //   In the above, even though A a; and B b; are in the same scope (as evidenced
        //   by not being allowed to declare the second a right above b), the A ctor/dtor
        //   will only run once, whereas there are 10 separate objects called b and the
        //   B ctor/dtor runs 10 times
        // Outer context for local variables including any declared in the init-statement or condition
        let loopBlockContext = constructs_1.createBlockContext(constructs_1.createLoopContext(outerContext));
        let initial = createStatementFromAST(ast.initial, loopBlockContext);
        let condition = expressions_1.createExpressionFromAST(ast.condition, loopBlockContext);
        // Inner block context for local variables actually inside the loop body curly braces.
        // We always do this, even if the body isn't a block in the source code:
        //    for(...) stmt; is treated equivalently
        // to for(...) { stmt; } according to the C++ standard.
        // Note that this is a separate block context from the outer one for the loop, so variables
        // in here will have a different lifetime, but we share the same scope as the outer loop block context
        let bodyBlockContext = constructs_1.createBlockContext(loopBlockContext, loopBlockContext.contextualScope);
        // NOTE: the use of the body block context for all the children.
        // e.g. for(int i = 0; i < 10; ++i) { cout << i; }
        // All children (initial, condition, post, body) share the same block
        // context and scope where i is declared.
        // If the body is a block, we have to create it using the ctor rather than
        // the createFromAST function, because that function implicitly creates a
        // new block context, which we already did above for bodyBlockContext. And we
        // want it to use bodyBlockContext, not a new block context further nested within that.
        let body = ast.body.construct_type !== "block"
            ? createStatementFromAST(ast.body, bodyBlockContext)
            : new Block(bodyBlockContext, ast.body, ast.body.statements.map(s => createStatementFromAST(s, bodyBlockContext)));
        let post = ast.post && expressions_1.createExpressionFromAST(ast.post, bodyBlockContext);
        return new ForStatement(loopBlockContext, ast, initial, condition, body, post);
        // It's crucial that we handled things this way. Because
        // all of the context-sensitive stuff is handled by the
        // contexts here, the children can all have access to e.g.
        // the correct scope for all their variable lookups.
    }
    // Creates an outlet, which will be part of the visualization,
    // for any code that is running with this `ForStatement` as its
    // original model. The specific runtime instance is not attached
    // until later. That's because we might need to display a "shell"
    // of this construct if e.g. the function it resides in gets called
    // and is displayed, but this construct hasn't started executing
    // yet (and may never, depending on control flow through that
    // function!).
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.ForStatementOutlet(element, this, parent);
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && constructs_1.areSemanticallyEquivalent(this.initial, other.initial, equivalenceContext)
            && constructs_1.areSemanticallyEquivalent(this.condition, other.condition, equivalenceContext)
            && constructs_1.areSemanticallyEquivalent(this.body, other.body, equivalenceContext)
            && constructs_1.areSemanticallyEquivalent(this.post, other.post, equivalenceContext);
    }
}
exports.ForStatement = ForStatement;
class RuntimeForStatement extends RuntimeStatement {
    constructor(model, parent) {
        super(model, parent);
        this.index = 0;
        this.initial = createRuntimeStatement(model.initial, this);
        this.condition = expressions_1.createRuntimeExpression(model.condition, this);
        // Do not create body here, since it might not actually run
        if (model.post) {
            this.upNextFns = RuntimeForStatement.upNextFns;
        }
        else {
            // remove 4th step which is the post step
            this.upNextFns = RuntimeForStatement.upNextFns.slice();
            this.upNextFns.splice(3, 1);
        }
        this.localDeallocator = model.localDeallocator.createRuntimeConstruct(this);
        this.setCleanupConstruct(this.localDeallocator);
    }
    upNextImpl() {
        this.upNextFns[this.index++](this);
        if (this.index === this.upNextFns.length) {
            this.index = 1; // reset to 1 rather than 0, since 0 is the initial which only happens once
        }
    }
    stepForwardImpl() {
        this.condition = expressions_1.createRuntimeExpression(this.model.condition, this);
        delete this.body;
        delete this.post;
    }
}
exports.RuntimeForStatement = RuntimeForStatement;
RuntimeForStatement.upNextFns = [
    (rt) => {
        rt.sim.push(rt.initial);
    },
    (rt) => {
        rt.sim.push(rt.condition);
    },
    (rt) => {
        if (rt.condition.evalResult.rawValue === 1) {
            rt.sim.push(util_1.asMutable(rt).body = createRuntimeStatement(rt.model.body, rt));
        }
        else {
            rt.startCleanup();
        }
    },
    (rt) => {
        util_1.assert(rt.model.post);
        rt.sim.push(util_1.asMutable(rt).post = expressions_1.createRuntimeExpression(rt.model.post, rt));
    },
    (rt) => {
        // Do nothing, pass to stepForward, which will reset
    }
];
// export var Break = Statement.extend({
//     _name: "Break",
//     compile : function() {
//         // Theoretically this could be put into the i_createFromAST function since it only uses
//         // syntactic information to determine whether the break is inside an iteration statement,
//         // but it would feel weird to add an error note before the compile function even runs... :/
//         var container = this.parent;
//         while(container && !isA(container, Statements.Iteration)){
//             container = container.parent;
//         }
//         this.container = container;
//         // container should exist, otherwise this break is somewhere it shouldn't be
//         if (!container || !isA(container, Statements.Iteration)){
//             this.addNote(CPPError.stmt.breakStatement.location(this, this.condition));
//         }
//     },
//     createAndPushInstance : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var inst = RuntimeConstruct.instance(sim, this, "break", "stmt", inst);
//         sim.push(inst);
//         return inst;
//     },
//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index == "break"){
//             var containerInst = inst.findParentByModel(this.container);
// //            inst.send("returned", {call: func.parent});
//             containerInst.done(sim); // TODO: should be done with simulation stack instead of parent
//             // return true;
//         }
//     }
// });
// export var Continue = Unsupported.extend({
//     _name: "Statements.Continue",
//     englishName: "continue statement"
// });
//# sourceMappingURL=statements.js.map