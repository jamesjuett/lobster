"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var constructs_1 = require("./constructs");
var errors_1 = require("./errors");
var expressions_1 = require("./expressions");
var declarations_1 = require("./declarations");
var initializers_1 = require("./initializers");
var types_1 = require("./types");
var entities_1 = require("./entities");
var functions_1 = require("./functions");
var util_1 = require("../util/util");
var StatementConstructsMap = {
    "labeled_statement": function (ast, context) { return new UnsupportedStatement(context, "labeled statement").setAST(ast); },
    "compound_statement": function (ast, context) { return Block.createFromAST(ast, context); },
    "selection_statement": function (ast, context) { return new UnsupportedStatement(context, "selection statement").setAST(ast); },
    "while_statement": function (ast, context) { return new UnsupportedStatement(context, "while loop").setAST(ast); },
    "dowhile_statement": function (ast, context) { return new UnsupportedStatement(context, "do-while loop").setAST(ast); },
    "for_statement": function (ast, context) { return new UnsupportedStatement(context, "for loop").setAST(ast); },
    "break_statement": function (ast, context) { return new UnsupportedStatement(context, "break statement").setAST(ast); },
    "continue_statement": function (ast, context) { return new UnsupportedStatement(context, "continue statement").setAST(ast); },
    "return_statement": function (ast, context) { return ReturnStatement.createFromAST(ast, context); },
    "declaration_statement": function (ast, context) { return DeclarationStatement.createFromAST(ast, context); },
    "expression_statement": function (ast, context) { return ExpressionStatement.createFromAST(ast, context); },
    "null_statement": function (ast, context) { return new NullStatement(context).setAST(ast); }
};
function createStatementFromAST(ast, context) {
    return StatementConstructsMap[ast.construct_type](ast, context);
}
exports.createStatementFromAST = createStatementFromAST;
var Statement = /** @class */ (function (_super) {
    __extends(Statement, _super);
    function Statement() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Statement;
}(constructs_1.BasicCPPConstruct));
exports.Statement = Statement;
var RuntimeStatement = /** @class */ (function (_super) {
    __extends(RuntimeStatement, _super);
    function RuntimeStatement(model, parent) {
        var _this = _super.call(this, model, "statement", parent) || this;
        if (parent instanceof functions_1.RuntimeFunction) {
            _this.containingRuntimeFunction = parent;
        }
        else {
            _this.containingRuntimeFunction = parent.containingRuntimeFunction;
        }
        return _this;
    }
    RuntimeStatement.prototype.popped = function () {
        _super.prototype.popped.call(this);
        this.observable.send("reset");
    };
    return RuntimeStatement;
}(constructs_1.RuntimeConstruct));
exports.RuntimeStatement = RuntimeStatement;
var UnsupportedStatement = /** @class */ (function (_super) {
    __extends(UnsupportedStatement, _super);
    function UnsupportedStatement(context, unsupportedName) {
        var _this = _super.call(this, context) || this;
        _this.addNote(errors_1.CPPError.lobster.unsupported_feature(_this, unsupportedName));
        return _this;
    }
    // Will never be called since an UnsupportedStatement will always have errors and
    // never satisfy the required this context of CompiledStatement
    UnsupportedStatement.prototype.createRuntimeStatement = function (parent) {
        throw new Error("Cannot create a runtime instance of an unsupported construct.");
    };
    return UnsupportedStatement;
}(Statement));
exports.UnsupportedStatement = UnsupportedStatement;
var ExpressionStatement = /** @class */ (function (_super) {
    __extends(ExpressionStatement, _super);
    function ExpressionStatement(context, expression) {
        var _this = _super.call(this, context) || this;
        _this.attach(_this.expression = expression);
        return _this;
    }
    ExpressionStatement.createFromAST = function (ast, context) {
        return new ExpressionStatement(context, expressions_1.createExpressionFromAST(ast.expression, context)).setAST(ast);
    };
    ExpressionStatement.prototype.createRuntimeStatement = function (parent) {
        return new RuntimeExpressionStatement(this, parent);
    };
    ExpressionStatement.prototype.isTailChild = function (child) {
        return { isTail: true };
    };
    return ExpressionStatement;
}(Statement));
exports.ExpressionStatement = ExpressionStatement;
var RuntimeExpressionStatement = /** @class */ (function (_super) {
    __extends(RuntimeExpressionStatement, _super);
    function RuntimeExpressionStatement(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.index = "expr";
        _this.expression = _this.model.expression.createRuntimeExpression(_this);
        return _this;
    }
    RuntimeExpressionStatement.prototype.upNextImpl = function () {
        if (this.index === "expr") {
            this.sim.push(this.expression);
            this.index = "done";
        }
        return true;
    };
    RuntimeExpressionStatement.prototype.stepForwardImpl = function () {
        this.sim.pop();
        return false;
    };
    return RuntimeExpressionStatement;
}(RuntimeStatement));
exports.RuntimeExpressionStatement = RuntimeExpressionStatement;
var NullStatement = /** @class */ (function (_super) {
    __extends(NullStatement, _super);
    function NullStatement() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NullStatement.prototype.createRuntimeStatement = function (parent) {
        return new RuntimeNullStatement(this, parent);
    };
    NullStatement.prototype.isTailChild = function (child) {
        return { isTail: true }; // Note: NullStatement will never actually have children, so this isn't used
    };
    return NullStatement;
}(Statement));
exports.NullStatement = NullStatement;
var RuntimeNullStatement = /** @class */ (function (_super) {
    __extends(RuntimeNullStatement, _super);
    function RuntimeNullStatement(model, parent) {
        return _super.call(this, model, parent) || this;
    }
    RuntimeNullStatement.prototype.upNextImpl = function () {
        return false;
    };
    RuntimeNullStatement.prototype.stepForwardImpl = function () {
        return false;
    };
    return RuntimeNullStatement;
}(RuntimeStatement));
exports.RuntimeNullStatement = RuntimeNullStatement;
var DeclarationStatement = /** @class */ (function (_super) {
    __extends(DeclarationStatement, _super);
    function DeclarationStatement(context, declarations /* | ClassDefinition*/) {
        var _this = _super.call(this, context) || this;
        if (declarations instanceof declarations_1.FunctionDefinition) {
            _this.addNote(errors_1.CPPError.stmt.function_definition_prohibited(_this));
            _this.attach(_this.declarations = declarations);
            return _this;
        }
        _this.attachAll(_this.declarations = declarations);
        return _this;
        // else if (declaration instanceof ClassDefinition) {
        //     this.addNote(CPPError.lobster.unsupported_feature(this, "local classes"));
        // }
    }
    DeclarationStatement.createFromAST = function (ast, context) {
        return new DeclarationStatement(context, declarations_1.createDeclarationFromAST(ast.declaration, context)).setAST(ast);
    };
    DeclarationStatement.prototype.createRuntimeStatement = function (parent) {
        return new RuntimeDeclarationStatement(this, parent);
    };
    DeclarationStatement.prototype.isTailChild = function (child) {
        return { isTail: true };
    };
    return DeclarationStatement;
}(Statement));
exports.DeclarationStatement = DeclarationStatement;
var RuntimeDeclarationStatement = /** @class */ (function (_super) {
    __extends(RuntimeDeclarationStatement, _super);
    function RuntimeDeclarationStatement(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.index = 0;
        return _this;
    }
    RuntimeDeclarationStatement.prototype.upNextImpl = function () {
        var initializers = this.model.declarations.map(function (d) { return d.initializer; });
        if (this.index < initializers.length) {
            var init = initializers[this.index];
            if (init) {
                // Only declarations with an initializer (e.g. a variable definition) have something
                // to do at runtime. Others (e.g. typedefs) do nothing.
                this.observable.send("initializing", this.index);
                var runtimeInit = init.createRuntimeInitializer(this);
                this.sim.push(runtimeInit);
            }
            ++this.index;
            this.wait();
        }
        else {
            this.sim.pop();
        }
    };
    RuntimeDeclarationStatement.prototype.stepForwardImpl = function () {
        return false;
    };
    return RuntimeDeclarationStatement;
}(RuntimeStatement));
exports.RuntimeDeclarationStatement = RuntimeDeclarationStatement;
var ReturnStatement = /** @class */ (function (_super) {
    __extends(ReturnStatement, _super);
    function ReturnStatement(context, expression) {
        var _this = _super.call(this, context) || this;
        _this.expression = expression;
        var returnType = _this.context.containingFunction.type.returnType;
        if (returnType instanceof types_1.VoidType) {
            if (expression) {
                // We have an expression to return, but the type is void, so that's bad
                _this.addNote(errors_1.CPPError.stmt.returnStatement.exprVoid(_this));
            }
            return _this;
        }
        // A return statement with no expression is only allowed in void functions.
        // At the moment, constructors/destructors are hacked to have void return type,
        // so this check is ok for return statements in a constructor.
        if (!expression) {
            _this.addNote(errors_1.CPPError.stmt.returnStatement.empty(_this));
            return _this;
        }
        if (returnType instanceof types_1.ReferenceType) {
            _this.returnInitializer = initializers_1.DirectInitializer.create(context, new entities_1.ReturnByReferenceEntity(returnType.refTo), [expression]);
        }
        else {
            _this.returnInitializer = initializers_1.DirectInitializer.create(context, new entities_1.ReturnObjectEntity(returnType), [expression]);
        }
        // Note: The expression is NOT attached directly here, since it's attached under the initializer.
        _this.attach(_this.returnInitializer);
        return _this;
    }
    ReturnStatement.createFromAST = function (ast, context) {
        return ast.expression
            ? new ReturnStatement(context, expressions_1.createExpressionFromAST(ast.expression, context)).setAST(ast)
            : new ReturnStatement(context).setAST(ast);
    };
    ReturnStatement.prototype.createRuntimeStatement = function (parent) {
        return new RuntimeReturnStatement(this, parent);
    };
    return ReturnStatement;
}(Statement));
exports.ReturnStatement = ReturnStatement;
var RuntimeReturnStatementIndices;
(function (RuntimeReturnStatementIndices) {
    RuntimeReturnStatementIndices[RuntimeReturnStatementIndices["PUSH_INITIALIZER"] = 0] = "PUSH_INITIALIZER";
    RuntimeReturnStatementIndices[RuntimeReturnStatementIndices["RETURN"] = 1] = "RETURN";
})(RuntimeReturnStatementIndices || (RuntimeReturnStatementIndices = {}));
var RuntimeReturnStatement = /** @class */ (function (_super) {
    __extends(RuntimeReturnStatement, _super);
    function RuntimeReturnStatement(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.index = RuntimeReturnStatementIndices.PUSH_INITIALIZER;
        if (model.returnInitializer) {
            _this.returnInitializer = model.returnInitializer.createRuntimeInitializer(_this);
        }
        return _this;
    }
    RuntimeReturnStatement.prototype.upNextImpl = function () {
        if (this.index === RuntimeReturnStatementIndices.PUSH_INITIALIZER) {
            if (this.returnInitializer) {
                this.sim.push(this.returnInitializer);
            }
            this.index = RuntimeReturnStatementIndices.RETURN;
        }
    };
    RuntimeReturnStatement.prototype.stepForwardImpl = function () {
        if (this.index === RuntimeReturnStatementIndices.RETURN) {
            var func = this.containingRuntimeFunction;
            this.observable.send("returned", { call: func.caller });
            this.sim.popUntil(func);
        }
    };
    return RuntimeReturnStatement;
}(RuntimeStatement));
exports.RuntimeReturnStatement = RuntimeReturnStatement;
function createBlockContext(context) {
    return Object.assign({}, context, {
        contextualScope: new entities_1.BlockScope(context.contextualScope),
        localObjects: [],
        localReferences: []
    });
}
function isBlockContext(context) {
    return context.contextualScope instanceof entities_1.BlockScope;
}
exports.isBlockContext = isBlockContext;
var Block = /** @class */ (function (_super) {
    __extends(Block, _super);
    function Block(context) {
        var _this = _super.call(this, context) || this;
        _this.statements = [];
        _this.blockContext = createBlockContext(context);
        return _this;
    }
    Block.createFromAST = function (ast, context) {
        var block = new Block(context).setAST(ast);
        ast.statements.forEach(function (stmtAst) { return block.addStatement(createStatementFromAST(stmtAst, context)); });
        return block;
    };
    Block.prototype.addStatement = function (statement) {
        util_1.asMutable(this.statements).push(statement);
        this.attach(statement);
    };
    Block.prototype.createRuntimeStatement = function (parent) {
        return new RuntimeBlock(this, parent);
    };
    return Block;
}(Statement));
exports.Block = Block;
var RuntimeBlock = /** @class */ (function (_super) {
    __extends(RuntimeBlock, _super);
    function RuntimeBlock(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.index = 0;
        _this.statements = model.statements.map(function (stmt) { return stmt.createRuntimeStatement(_this); });
        return _this;
    }
    RuntimeBlock.prototype.upNextImpl = function () {
        if (this.index < this.statements.length) {
            this.observable.send("index", this.index);
            this.sim.push(this.statements[this.index++]);
        }
        else {
            this.sim.pop();
        }
    };
    RuntimeBlock.prototype.stepForwardImpl = function () {
        // Nothing to do here, block doesn't actually do anything but run individual statements.
        // TODO: However, something will ultimately need to be added to run destructors when a
        // block finishes, rather than just when a function finishes.
    };
    return RuntimeBlock;
}(RuntimeStatement));
exports.RuntimeBlock = RuntimeBlock;
//# sourceMappingURL=statements.js.map