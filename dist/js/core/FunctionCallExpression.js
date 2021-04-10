"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeFunctionCallExpression = exports.INDEX_FUNCTION_CALL_EXPRESSION_RETURN = exports.INDEX_FUNCTION_CALL_EXPRESSION_CALL = exports.INDEX_FUNCTION_CALL_EXPRESSION_OPERAND = exports.FunctionCallExpression = void 0;
const constructs_1 = require("./constructs");
const FunctionCall_1 = require("./FunctionCall");
const entities_1 = require("./entities");
const expressions_1 = require("./expressions");
const types_1 = require("./types");
const errors_1 = require("./errors");
const expressionBase_1 = require("./expressionBase");
const lexical_1 = require("./lexical");
const codeOutlets_1 = require("../view/codeOutlets");
// type FunctionResultType<T extends FunctionType> = NoRefType<Exclude<T["returnType"], VoidType>>; // TODO: this isn't used? should I use it somewhere?
// type ReturnTypeVC<RT extends PotentialReturnType> = RT extends ReferenceType ? "lvalue" : "prvalue";
class FunctionCallExpression extends expressionBase_1.Expression {
    constructor(context, ast, operand, args) {
        super(context, ast);
        this.construct_type = "function_call_expression";
        this.attach(this.operand = operand);
        this.originalArgs = args;
        // If any arguments are not well typed, we can't select a function.
        if (!expressionBase_1.allWellTyped(args)) {
            // type, valueCategory, and call remain undefined
            this.attachAll(args);
            return;
        }
        if (!(operand instanceof expressions_1.IdentifierExpression || operand instanceof expressions_1.DotExpression || operand instanceof expressions_1.ArrowExpression)) {
            this.addNote(errors_1.CPPError.expr.functionCall.invalid_operand_expression(this, operand));
            this.attachAll(args);
            return;
        }
        if (!operand.entity) {
            // type, valueCategory, and call remain undefined
            // operand will already have an error about the failed lookup
            this.attachAll(args);
            return;
        }
        if (!(operand.entity instanceof entities_1.FunctionEntity)) {
            // type, valueCategory, and call remain undefined
            this.addNote(errors_1.CPPError.expr.functionCall.operand(this, operand.entity));
            this.attachAll(args);
            return;
        }
        if (!operand.entity.returnsCompleteType()) {
            this.attachAll(args);
            this.addNote(errors_1.CPPError.expr.functionCall.incomplete_return_type(this, operand.entity.type.returnType));
            return;
        }
        let returnType = operand.entity.type.returnType;
        this.type = types_1.peelReference(returnType);
        this.valueCategory = returnType instanceof types_1.ReferenceType ? "lvalue" : "prvalue";
        // let staticReceiver: ObjectEntity<CompleteClassType> | undefined;
        // if (operand instanceof DotExpression) {
        //     staticReceiver = operand.functionCallReceiver;
        // }
        // If we get to here, we don't attach the args directly since they will be attached under the function call.
        this.attach(this.call = new FunctionCall_1.FunctionCall(context, operand.entity, args, operand.context.contextualReceiverType));
    }
    static createFromAST(ast, context) {
        let args = ast.args.map(arg => expressions_1.createExpressionFromAST(arg, context));
        if (ast.operand.construct_type === "identifier_expression") {
            let identifierStr = lexical_1.identifierToString(lexical_1.astToIdentifier(ast.operand.identifier));
            if (lexical_1.LOBSTER_MAGIC_FUNCTIONS.has(identifierStr)) {
                return new expressions_1.MagicFunctionCallExpression(context, ast, identifierStr, args);
            }
        }
        let contextualParamTypes = args.map(arg => arg.type);
        return new FunctionCallExpression(context, ast, expressions_1.createExpressionFromAST(ast.operand, constructs_1.createExpressionContextWithParameterTypes(context, contextualParamTypes)), args);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.FunctionCallExpressionOutlet(element, this, parent);
    }
    // TODO
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.FunctionCallExpression = FunctionCallExpression;
exports.INDEX_FUNCTION_CALL_EXPRESSION_OPERAND = 0;
exports.INDEX_FUNCTION_CALL_EXPRESSION_CALL = 1;
exports.INDEX_FUNCTION_CALL_EXPRESSION_RETURN = 2;
class RuntimeFunctionCallExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.index = exports.INDEX_FUNCTION_CALL_EXPRESSION_OPERAND;
        this.operand = expressions_1.createRuntimeExpression(this.model.operand, this);
    }
    upNextImpl() {
        if (this.index === exports.INDEX_FUNCTION_CALL_EXPRESSION_OPERAND) {
            this.sim.push(this.operand);
            this.index = exports.INDEX_FUNCTION_CALL_EXPRESSION_CALL;
        }
        else if (this.index === exports.INDEX_FUNCTION_CALL_EXPRESSION_CALL) {
            // We check the contextual receiver here since it changes after the operand is evaluated.
            this.call = this.model.call.createRuntimeFunctionCall(this, this.operand.contextualReceiver);
            this.sim.push(this.call);
            this.index = exports.INDEX_FUNCTION_CALL_EXPRESSION_RETURN;
        }
        else if (this.index === exports.INDEX_FUNCTION_CALL_EXPRESSION_RETURN) {
            // Note: cannot use this.model.type here, since that is the type of the function
            // call expression, which would have had the reference type removed if this was return
            // by reference. Instead, use the return type of the called function itself, which will have
            // the reference type intact.
            let returnType = this.model.call.func.type.returnType;
            if (returnType.isVoidType()) {
                // this.setEvalResult(null); // TODO: type system won't allow this currently
            }
            else if (returnType.isReferenceType()) {
                // Return by reference is lvalue and yields the returned object
                let retObj = this.call.calledFunction.returnObject;
                this.setEvalResult(retObj);
            }
            else if (returnType.isAtomicType()) {
                // Return by value of atomic type. In this case, we can look up
                // the value of the return object and use that as the eval result
                let retObj = this.call.calledFunction.returnObject;
                this.setEvalResult(retObj.getValue());
            }
            else {
                // Return by value of a non-atomic type. In this case, it's still a prvalue
                // but is the temporary object rather than its value.
                let retObj = this.call.calledFunction.returnObject;
                this.setEvalResult(retObj);
            }
            this.startCleanup();
        }
    }
    stepForwardImpl() {
        // nothing to do
    }
}
exports.RuntimeFunctionCallExpression = RuntimeFunctionCallExpression;
//# sourceMappingURL=FunctionCallExpression.js.map