"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Predicates = void 0;
const expressions_1 = require("./expressions");
const declarations_1 = require("./declarations");
const FunctionCallExpression_1 = require("./FunctionCallExpression");
const initializers_1 = require("./initializers");
const analysis_1 = require("../analysis/analysis");
// type TypedKinds<T extends Type> = TypedDeclarationKinds<T> & TypedExpressionKinds<T, ValueCategory>;
// export type AnalyticTyped<C extends AnalyticConstruct, T extends Type = Type> =
//     C extends AnalyticDeclaration ? AnalyticTypedDeclaration<C, T> :
//     C extends AnalyticExpression ? AnalyticTypedExpression<C, T> : never;
// // export type AnalyticCompiledDeclaration<C extends AnalyticDeclaration, T extends AnalyticDeclaration["type"] = AnalyticDeclaration["type"]> = CompiledDeclarationKinds<T>[C["construct_type"]];
// export type AnalyticCompiled<C extends AnalyticConstruct> =
//     C extends AnalyticDeclaration ? AnalyticCompiledDeclaration<C> :
//     C extends AnalyticExpression ? AnalyticCompiledExpression<C> : never;
// let x!: AnalyticTyped<AnalyticTyped<TernaryExpression, Int>, Bool>;
var Predicates;
(function (Predicates) {
    // export function compiled<T extends FunctionType>(typePredicate?: (o: Type) => o is T) {
    //     return </*¯\_(ツ)_/¯*/<OriginalT extends Type, Original extends CPPConstruct & {type?: OriginalT}, Narrowed extends CompiledFunctionDeclaration<T>>(decl: Original) =>
    //         decl is (Narrowed extends Original ? Narrowed : never)>
    //             ((decl) => typed(typePredicate) && decl.isSuccessfullyCompiled());
    // }
    // export function byKind<Original extends CPPConstruct, Narrowed extends CPPConstruct>
    //     (decl: Original) : decl is Narrowed extends Original ? Narrowed : never {
    //     return decl instanceof SimpleDeclaration;
    // }
    function byKind(constructKind) {
        return ((construct) => construct.construct_type === constructKind);
    }
    Predicates.byKind = byKind;
    function byKinds(constructKinds) {
        return ((construct) => constructKinds.indexOf(construct.construct_type) !== -1);
    }
    Predicates.byKinds = byKinds;
    // export function isTyped<OriginalT extends Type, NarrowedT extends Type,
    //     Original extends ConstructUnion & {type?: OriginalT},
    //     Narrowed extends TypedKinds<NarrowedT>[Original["construct_type"]]>
    //     (decl: Original, typePredicate?: (o: Type) => o is NarrowedT) : decl is (Narrowed extends Original ? Narrowed : never) {
    //     return !!decl.type && (!typePredicate || typePredicate(decl.type));
    // }
    function byTypedExpression(typePredicate, valueCategory) {
        return ((construct) => construct.type && (!typePredicate || typePredicate(construct.type)) && (!valueCategory || construct.valueCategory === valueCategory));
    }
    Predicates.byTypedExpression = byTypedExpression;
    function isTypedExpression(construct, typePredicate, valueCategory) {
        return !!(construct.type && (!typePredicate || typePredicate(construct.type)) && (!valueCategory || construct.valueCategory === valueCategory));
    }
    Predicates.isTypedExpression = isTypedExpression;
    // Basically copies of above but with Declaration swapping in for Expression and ValueCategory removed
    function byTypedDeclaration(typePredicate) {
        return ((construct) => construct.type && (!typePredicate || typePredicate(construct.type)));
    }
    Predicates.byTypedDeclaration = byTypedDeclaration;
    function isTypedDeclaration(construct, typePredicate) {
        return !!(construct.type && (!typePredicate || typePredicate(construct.type)));
    }
    Predicates.isTypedDeclaration = isTypedDeclaration;
    function byVariableName(name) {
        return ((construct) => (construct instanceof declarations_1.LocalVariableDefinition || construct instanceof declarations_1.GlobalVariableDefinition) && construct.name === name);
    }
    Predicates.byVariableName = byVariableName;
    function byVariableInitialValue(queryValue) {
        return ((construct) => {
            if (!(construct instanceof declarations_1.LocalVariableDefinition || construct instanceof declarations_1.GlobalVariableDefinition)) {
                return false;
            }
            let init = construct.initializer;
            if (!(init instanceof initializers_1.AtomicDirectInitializer)) {
                return false;
            }
            let expr = init.arg;
            while (expr instanceof expressions_1.ImplicitConversion) {
                expr = expr.from;
            }
            return expr instanceof expressions_1.NumericLiteralExpression && expr.value.rawEquals(queryValue);
        });
    }
    Predicates.byVariableInitialValue = byVariableInitialValue;
    // TODO: add compound assignment expressions once implemented
    function byVariableUpdate(name) {
        return ((construct) => {
            if (Predicates.byKinds([
                "prefix_increment_expression",
                "postfix_increment_expression"
            ])(construct)) {
                // check for var
                return !!analysis_1.findFirstConstruct(construct, Predicates.byIdentifierName(name));
            }
            if (Predicates.byKind("assignment_expression")(construct)) {
                // check for var on lhs and rhs
                return !!analysis_1.findFirstConstruct(construct.lhs, Predicates.byIdentifierName(name)) &&
                    !!analysis_1.findFirstConstruct(construct.rhs, Predicates.byIdentifierName(name));
            }
            return false;
        });
    }
    Predicates.byVariableUpdate = byVariableUpdate;
    function byFunctionName(name) {
        return ((construct) => (construct instanceof declarations_1.FunctionDefinition) && construct.name === name);
    }
    Predicates.byFunctionName = byFunctionName;
    function byFunctionCallName(name) {
        return ((construct) => { var _a; return (construct instanceof FunctionCallExpression_1.FunctionCallExpression) && ((_a = construct.call) === null || _a === void 0 ? void 0 : _a.func.name) === name; });
    }
    Predicates.byFunctionCallName = byFunctionCallName;
    function byOperatorOverloadCall(operator) {
        return ((construct) => Predicates.isOperatorOverload(construct) && construct.operator === operator);
    }
    Predicates.byOperatorOverloadCall = byOperatorOverloadCall;
    function byIdentifierName(name) {
        return ((construct) => (construct.construct_type === "identifier_expression") && construct.name === name);
    }
    Predicates.byIdentifierName = byIdentifierName;
    function byVariableIdentifier(v) {
        return ((construct) => (construct.construct_type === "identifier_expression") && construct.entity === v);
    }
    Predicates.byVariableIdentifier = byVariableIdentifier;
    function byVariableAssignedTo(v) {
        return ((construct) => (construct.construct_type === "assignment_expression" || construct.construct_type === "compound_assignment_expression")
            && analysis_1.containsConstruct(construct.lhs, Predicates.byVariableIdentifier(v)));
    }
    Predicates.byVariableAssignedTo = byVariableAssignedTo;
    function byVariableIncremented(v) {
        return ((construct) => (construct.construct_type === "prefix_increment_expression" || construct.construct_type === "postfix_increment_expression")
            && analysis_1.containsConstruct(construct.operand, Predicates.byVariableIdentifier(v)));
    }
    Predicates.byVariableIncremented = byVariableIncremented;
    function byMemberAccessName(memberName) {
        return ((construct) => (construct.construct_type === "dot_expression" || construct.construct_type === "arrow_expression") && construct.memberName === memberName);
    }
    Predicates.byMemberAccessName = byMemberAccessName;
    // export function byCompiled<Original extends AnalyticDeclaration>(construct: Original) : construct is AnalyticCompiledDeclaration<Original> {
    //     return construct.isSuccessfullyCompiled();
    // }
    Predicates.isLoop = Predicates.byKinds(["while_statement", "for_statement"]);
    Predicates.isOperatorOverload = Predicates.byKinds(["non_member_operator_overload_expression", "member_operator_overload_expression", "invalid_operator_overload_expression"]);
    function isIndexingOperation(construct) {
        return Predicates.byKind("subscript_expression")(construct) || Predicates.byOperatorOverloadCall("[]")(construct);
    }
    Predicates.isIndexingOperation = isIndexingOperation;
    Predicates.isBinaryOperatorExpression = Predicates.byKinds([
        "arithmetic_binary_operator_expression",
        "relational_binary_operator_expression",
        "logical_binary_operator_expression"
    ]);
})(Predicates = exports.Predicates || (exports.Predicates = {}));
//# sourceMappingURL=predicates.js.map