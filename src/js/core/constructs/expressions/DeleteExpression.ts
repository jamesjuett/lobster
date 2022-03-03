import { DynamicObject } from "../../runtime/objects";
import { SimulationEvent } from "../../runtime/Simulation";
import { PointerType, BoundedArrayType, FunctionType, VoidType, isBoundedArrayType, isCompleteClassType, PointerToCompleteType as PointerToCompleteObjectType, isArrayPointerType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../constructs";
import { CPPError } from "../../compilation/errors";
import { assert, asMutable } from "../../../util/util";
import { Expression, CompiledExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { ConstructOutlet, DeleteExpressionOutlet, DeleteArrayExpressionOutlet } from "../../../view/codeOutlets";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { CompiledFunctionCall, FunctionCall, RuntimeFunctionCall } from "../FunctionCall";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";
import { convertToPRValue } from "./ImplicitConversion";
import { DeleteExpressionASTNode, DeleteArrayExpressionASTNode } from "../../../ast/ast_expressions";
import { NewObjectType } from "./NewExpression";


export class DeleteExpression extends Expression<DeleteExpressionASTNode> {
    public readonly construct_type = "delete_expression";

    public readonly type = VoidType.VOID;
    public readonly valueCategory = "prvalue";

    public readonly operand: Expression;
    public readonly dtor?: FunctionCall;

    public readonly operator = "delete";

    public constructor(context: ExpressionContext, ast: DeleteExpressionASTNode, operand: Expression) {
        super(context, ast);

        if (!operand.isWellTyped()) {
            this.attach(this.operand = operand);
            return;
        }

        if (!operand.type.isPointerType()) {
            this.addNote(CPPError.expr.delete.pointer(this, operand.type));
            this.attach(this.operand = operand);
            return;
        }

        if (!operand.type.isPointerToCompleteObjectType()) {
            this.addNote(CPPError.expr.delete.pointerToObjectType(this, operand.type));
            this.attach(this.operand = operand);
            return;
        }

        // Note that this comes after the pointer check, which is intentional
        operand = convertToPRValue(operand);
        this.operand = operand;

        // This should still be true, assertion for type system
        assert(operand.type?.isPointerToCompleteObjectType());

        let destroyedType = operand.type.ptrTo;
        if (destroyedType.isCompleteClassType()) {
            let dtor = destroyedType.classDefinition.destructor;
            if (dtor) {
                let dtorCall = new FunctionCall(context, dtor, [], destroyedType);
                this.attach(this.dtor = dtorCall);
            }
            else {
                this.addNote(CPPError.expr.delete.no_destructor(this, destroyedType));
            }
        }
    }

    public static createFromAST(ast: DeleteExpressionASTNode, context: ExpressionContext): DeleteExpression {
        return new DeleteExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }

    public createDefaultOutlet(this: CompiledDeleteExpression, element: JQuery, parent?: ConstructOutlet) {
        return new DeleteExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedDeleteExpression extends DeleteExpression, t_TypedExpression {
}

export interface CompiledDeleteExpression extends TypedDeleteExpression, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpression<PointerToCompleteObjectType, "prvalue">;
    readonly dtor?: CompiledFunctionCall<FunctionType<VoidType>>;
}

export class RuntimeDeleteExpression extends RuntimeExpression<VoidType, "prvalue", CompiledDeleteExpression> {

    public readonly operand: RuntimeExpression<PointerToCompleteObjectType, "prvalue">;
    public readonly dtor?: RuntimeFunctionCall<FunctionType<VoidType>>;

    public readonly destroyedObject?: DynamicObject<NewObjectType>;

    public constructor(model: CompiledDeleteExpression, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
    }

    protected upNextImpl() {
        if (!this.operand.isDone) {
            this.sim.push(this.operand);
        }
        else if (PointerType.isNull(this.operand.evalResult.rawValue)) {
            // delete on a null pointer does nothing
            this.startCleanup();
        }
        else if (!this.model.dtor || !this.dtor) {
            let obj = this.sim.memory.dereference(this.operand.evalResult);

            if (!obj.hasStorage("dynamic")) {
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "Invalid delete");
                this.startCleanup();
                return;
            }
            else if (!obj.isAlive) {
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "Double free");
                this.startCleanup();
                return;
            }
            else if (obj.isTyped(isBoundedArrayType)) {
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "Invalid use of regular delete on array");
                this.startCleanup();
                return;
            }
            else {
                asMutable(this).destroyedObject = <DynamicObject<NewObjectType>>obj;
                if (obj.isTyped(isCompleteClassType) && this.model.dtor) {
                    let dtor = this.model.dtor.createRuntimeFunctionCall(this, obj);
                    asMutable(this).dtor = dtor;
                    this.sim.push(dtor);
                }
            }


        }
    }

    protected stepForwardImpl() {
        this.sim.memory.heap.deleteObject(this.destroyedObject!);
        this.startCleanup();
    }

}



export class DeleteArrayExpression extends Expression<DeleteArrayExpressionASTNode> {
    public readonly construct_type = "delete_array_expression";

    public readonly type = VoidType.VOID;
    public readonly valueCategory = "prvalue";

    public readonly operand: Expression;
    public readonly elementDtor?: FunctionCall;

    public readonly operator = "delete";

    public constructor(context: ExpressionContext, ast: DeleteArrayExpressionASTNode, operand: Expression) {
        super(context, ast);

        if (!operand.isWellTyped()) {
            this.attach(this.operand = operand);
            return;
        }

        if (!operand.type.isPointerType()) {
            this.addNote(CPPError.expr.delete.pointer(this, operand.type));
            this.attach(this.operand = operand);
            return;
        }

        if (!operand.type.isPointerToCompleteObjectType()) {
            this.addNote(CPPError.expr.delete.pointerToObjectType(this, operand.type));
            this.attach(this.operand = operand);
            return;
        }

        if (!operand.type.ptrTo.isArrayElemType()) {
            this.addNote(CPPError.expr.delete.pointerToArrayElemType(this, operand.type));
            this.attach(this.operand = operand);
            return;
        }

        // Note that the prvalue conversion comes after type checking
        // An implication of this is you can't give an array directly to
        // delete, since it won't decay into a pointer. But there's really
        // no good reason you would ever do that, since any dynamically allocated
        // array will have already decayed to a pointer
        operand = convertToPRValue(operand);
        this.operand = operand;

        // This should still be true, assertion for type system
        assert(operand.type?.isPointerToCompleteObjectType());

        let destroyedType = operand.type.ptrTo;
        if (destroyedType.isCompleteClassType()) {
            let dtor = destroyedType.classDefinition.destructor;
            if (dtor) {
                let dtorCall = new FunctionCall(context, dtor, [], destroyedType);
                this.attach(this.elementDtor = dtorCall);
            }
            else {
                this.addNote(CPPError.expr.delete.no_destructor(this, destroyedType));
            }
        }
    }

    public static createFromAST(ast: DeleteArrayExpressionASTNode, context: ExpressionContext): DeleteArrayExpression {
        return new DeleteArrayExpression(context, ast, createExpressionFromAST(ast.operand, context));
    }

    public createDefaultOutlet(this: CompiledDeleteArrayExpression, element: JQuery, parent?: ConstructOutlet) {
        return new DeleteArrayExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedDeleteArrayExpression extends DeleteArrayExpression, t_TypedExpression {
}

export interface CompiledDeleteArrayExpression extends TypedDeleteArrayExpression, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly operand: CompiledExpression<PointerToCompleteObjectType, "prvalue">;
    readonly elementDtor?: CompiledFunctionCall<FunctionType<VoidType>>;
}

export class RuntimeDeleteArrayExpression extends RuntimeExpression<VoidType, "prvalue", CompiledDeleteArrayExpression> {

    private index = 0;

    public readonly operand: RuntimeExpression<PointerToCompleteObjectType, "prvalue">;
    public readonly dtors: readonly RuntimeFunctionCall<FunctionType<VoidType>>[] = [];

    public readonly targetArray?: DynamicObject<BoundedArrayType>;

    public constructor(model: CompiledDeleteArrayExpression, parent: RuntimeConstruct) {
        super(model, parent);
        this.operand = createRuntimeExpression(this.model.operand, this);
    }

    protected upNextImpl() {
        if (!this.operand.isDone) {
            this.sim.push(this.operand);
            return;
        }

        if (!this.targetArray) {
            if (PointerType.isNull(this.operand.evalResult.rawValue)) {
                // delete on a null pointer does nothing
                this.startCleanup();
                return;
            }

            let ptr = this.operand.evalResult;
            let targetObject = ptr.isTyped(isArrayPointerType)
                ? ptr.type.arrayObject
                : this.sim.memory.dereference(ptr);

            if (!targetObject.hasStorage("dynamic")) {
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "Invalid delete");
                this.startCleanup();
                return;
            }
            else if (!targetObject.isAlive) {
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "Double free");
                this.startCleanup();
                return;
            }
            else if (!targetObject.isTyped(isBoundedArrayType)) {
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "Invalid use of array delete[] on non-array");
                this.startCleanup();
                return;
            }

            asMutable(this).targetArray = targetObject;
        }

        if (this.targetArray && this.model.elementDtor && this.index < this.targetArray.type.numElems) {
            let elem = this.targetArray.getArrayElemSubobject(this.index++);
            if (elem.isTyped(isCompleteClassType)) {
                let dtor = this.model.elementDtor.createRuntimeFunctionCall(this, elem);
                asMutable(this.dtors).push(dtor);
                this.sim.push(dtor);
                return;
            }
        }
    }

    protected stepForwardImpl() {
        if (this.targetArray) {
            this.sim.memory.heap.deleteObject(this.targetArray);
            this.startCleanup();
        }
    }

}
