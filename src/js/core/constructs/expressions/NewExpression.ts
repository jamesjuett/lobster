import { ArraySubobject, CPPObject, DynamicObject } from "../../runtime/objects";
import { SimulationEvent } from "../../runtime/Simulation";
import { AtomicType, PointerType, BoundedArrayType, isType, sameType, Int, ArrayElemType, CompleteClassType, isCompleteObjectType, Type, isPotentiallyCompleteArrayType, PotentiallyCompleteArrayType } from "../../compilation/types";
import { ExpressionContext, ConstructDescription } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../CPPConstruct";
import { CPPError } from "../../compilation/errors";
import { NewObjectEntity, NewArrayEntity, DynamicLengthArrayNextElementEntity } from "../../compilation/entities";
import { assertNever, assert, Mutable, asMutable } from "../../../util/util";
import { VCResultTypes, Expression, CompiledExpression, t_TypedExpression } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { NewExpressionOutlet, NewArrayExpressionOutlet } from "../../../view/constructs/ExpressionOutlets";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { CompiledInitializer, Initializer, RuntimeInitializer } from "../initializers/Initializer";
import { ListInitializer } from "../initializers/ListInitializer";
import { CompiledDirectInitializer, DirectInitializer, RuntimeDirectInitializer } from "../initializers/DirectInitializer";
import { ValueInitializer } from "../initializers/ValueInitializer";
import { CompiledDefaultInitializer, DefaultInitializer, RuntimeDefaultInitializer } from "../initializers/DefaultInitializer";
import { CompiledDeclarator, Declarator } from "../declarations/Declarator";
import { CompiledTypeSpecifier, TypeSpecifier } from "../declarations/TypeSpecifier";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";
import { standardConversion } from "./ImplicitConversion";
import { NewExpressionASTNode } from "../../../ast/ast_expressions";



export function createNewExpressionFromAST(ast: NewExpressionASTNode, context: ExpressionContext) {

    // Need to create TypeSpecifier first to get the base type for the declarator
    let typeSpec = TypeSpecifier.createFromAST(ast.specs, context);
    let baseType = typeSpec.baseType;

    // Create declarator and determine declared type
    let declarator = Declarator.createFromAST(ast.declarator ?? {}, context, baseType);
    let createdType = declarator.type;

    if (createdType && isPotentiallyCompleteArrayType(createdType)) {
        // TODO new array expression
        return new NewArrayExpression(context, ast, typeSpec, declarator, createdType);
    }
    else {
        return new NewExpression(context, ast, typeSpec, declarator, createdType);
    }
}

export type NewObjectType = AtomicType | CompleteClassType;

export class NewExpression extends Expression<NewExpressionASTNode> {
    public readonly construct_type = "new_expression";

    public readonly type?: PointerType<NewObjectType>;
    public readonly createdType?: NewObjectType;
    public readonly valueCategory = "prvalue";

    public readonly typeSpecifier: TypeSpecifier;
    public readonly declarator: Declarator;
    public readonly initializer?: Initializer;

    public constructor(context: ExpressionContext, ast: NewExpressionASTNode, typeSpecifier: TypeSpecifier, declarator: Declarator, createdType: Exclude<Type, PotentiallyCompleteArrayType> | undefined) {
        super(context, ast);
        assert(!createdType || !declarator.type || sameType(createdType, declarator.type));

        this.attach(this.typeSpecifier = typeSpecifier);
        this.attach(this.declarator = declarator);

        if (!createdType) {
            // If we don't have a viable type to create
            return;
        }

        if (!isCompleteObjectType(createdType)) {
            this.addNote(CPPError.expr.new.unsupported_type(this, createdType));
            return;
        }

        this.createdType = createdType;
        this.type = new PointerType(createdType);

        let initAST = ast.initializer;
        let newEntity = new NewObjectEntity(createdType);
        let initializer =
            !initAST ? DefaultInitializer.create(context, newEntity) :
            initAST.construct_type === "value_initializer" ? ValueInitializer.create(context, newEntity) :
            initAST.construct_type === "direct_initializer" ? DirectInitializer.create(context, newEntity, initAST.args.map((a) => createExpressionFromAST(a, context)), "direct") :
            initAST.construct_type === "list_initializer" ? ListInitializer.create(context, newEntity, initAST.arg.elements.map((a) => createExpressionFromAST(a, context))) :
            assertNever(initAST);

        if (initializer.construct_type !== "invalid_construct") {
            this.attach(this.initializer = initializer);
        }
        else {
            this.attach(initializer);
        }
    }

    public createDefaultOutlet(this: CompiledNewExpression, element: JQuery, parent?: ConstructOutlet) {
        return new NewExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedNewExpression<T extends PointerType<NewObjectType> = PointerType<NewObjectType>> extends NewExpression, t_TypedExpression {
    readonly type: T;
    readonly createdType: T["ptrTo"];
}

export interface CompiledNewExpression<T extends PointerType<NewObjectType> = PointerType<NewObjectType>> extends TypedNewExpression<T>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly declarator: CompiledDeclarator<T["ptrTo"]>;
    readonly initializer?: CompiledInitializer<T["ptrTo"]>;
}

export class RuntimeNewExpression<T extends PointerType<NewObjectType> = PointerType<NewObjectType>> extends RuntimeExpression<T, "prvalue", CompiledNewExpression<T>> {

    private index = 0;

    public readonly initializer?: RuntimeInitializer;

    public readonly allocatedObject?: DynamicObject<T["ptrTo"]>;

    public constructor(model: CompiledNewExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
    }

    protected upNextImpl() {
        if (this.index === 1) {
            this.initializer && this.sim.push(this.initializer);
            ++this.index;
        }
    }

    protected stepForwardImpl(): void {
        if (this.index === 0) {
            (<Mutable<this>>this).allocatedObject = this.sim.memory.heap.allocateNewObject(this.model.createdType);
            (<Mutable<this>>this).initializer = this.model.initializer?.createRuntimeInitializer(this);
            ++this.index;
        }
        else {
            this.setEvalResult(<VCResultTypes<T, "prvalue">>this.allocatedObject!.getPointerTo());
            this.startCleanup();
        }
    }
}



export class NewArrayExpression extends Expression<NewExpressionASTNode> {
    public readonly construct_type = "new_array_expression";

    public readonly type?: PointerType<ArrayElemType>;
    public readonly createdType?: PotentiallyCompleteArrayType;
    public readonly valueCategory = "prvalue";

    public readonly typeSpecifier: TypeSpecifier;
    public readonly declarator: Declarator;
    public readonly allocatedArray: NewArrayEntity;
    public readonly individualElementInitializers?: readonly DirectInitializer[];
    public readonly fallbackElementInitializer?: DefaultInitializer; //  | ValueInitializer;

    public readonly dynamicLengthExpression?: Expression;

    public constructor(context: ExpressionContext, ast: NewExpressionASTNode, typeSpecifier: TypeSpecifier, declarator: Declarator, createdType: PotentiallyCompleteArrayType) {
        super(context, ast);
        assert(!createdType || !declarator.type || sameType(createdType, declarator.type));

        this.attach(this.typeSpecifier = typeSpecifier);
        this.attach(this.declarator = declarator);

        this.createdType = createdType;
        this.type = createdType.adjustToPointerType();

        if (createdType.isArrayOfUnknownBoundType()) {
            if (createdType.sizeExpressionAST) {
                let sizeExp = createExpressionFromAST(createdType.sizeExpressionAST, context);
                if (sizeExp.isWellTyped()) {
                    let convertedSizeExp = standardConversion(sizeExp, Int.INT);
                    if (!isType(convertedSizeExp.type, Int)) {
                        convertedSizeExp.addNote(CPPError.expr.new_array.integer_length_required(sizeExp));
                    }
                    this.attach(this.dynamicLengthExpression = convertedSizeExp);
                }
                else {
                    this.attach(this.dynamicLengthExpression = sizeExp);
                }
            }
            else {
                this.addNote(CPPError.expr.new_array.length_required(this));
            }
        }

        this.allocatedArray = new NewArrayEntity(createdType);

        let initAST = ast.initializer;
        if (!initAST) {
            this.fallbackElementInitializer = DefaultInitializer.create(context, new DynamicLengthArrayNextElementEntity(this.allocatedArray));
            this.individualElementInitializers = [];
        }
        else if (initAST.construct_type === "direct_initializer") {
            this.addNote(CPPError.expr.new_array.direct_initialization_prohibited(this));
        }
        else if (initAST.construct_type === "list_initializer") {
            // TODO: should be value-initialization
            this.fallbackElementInitializer = DefaultInitializer.create(context, new DynamicLengthArrayNextElementEntity(this.allocatedArray));
            this.individualElementInitializers = initAST.arg.elements.map(
                (arg, i) => DirectInitializer.create(context, new DynamicLengthArrayNextElementEntity(this.allocatedArray), [createExpressionFromAST(arg, context)], "direct")
            );
        }

        this.fallbackElementInitializer && this.attach(this.fallbackElementInitializer);
        this.individualElementInitializers && this.attachAll(this.individualElementInitializers);
    }

    public createDefaultOutlet(this: CompiledNewArrayExpression, element: JQuery, parent?: ConstructOutlet) {
        return new NewArrayExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }
}

export interface TypedNewArrayExpression<T extends PointerType<ArrayElemType> = PointerType<ArrayElemType>> extends NewArrayExpression, t_TypedExpression {

    readonly type: T;
    readonly createdType: PotentiallyCompleteArrayType<T["ptrTo"]>;

    readonly allocatedArray: NewArrayEntity<PotentiallyCompleteArrayType<T["ptrTo"]>>;
}

export interface CompiledNewArrayExpression<T extends PointerType<ArrayElemType> = PointerType<ArrayElemType>> extends TypedNewArrayExpression<T>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly typeSpecifier: CompiledTypeSpecifier;
    readonly declarator: CompiledDeclarator;
    readonly individualElementInitializers: readonly CompiledDirectInitializer[];
    readonly fallbackElementInitializer: CompiledDefaultInitializer; //  | CompiledValueInitializer;

    readonly dynamicLengthExpression?: CompiledExpression<Int, "prvalue">;
}

export class RuntimeNewArrayExpression<T extends PointerType<ArrayElemType> = PointerType<ArrayElemType>> extends RuntimeExpression<T, "prvalue", CompiledNewArrayExpression<T>> {

    private elemInitIndex = 0;

    public readonly dynamicLengthExpression?: RuntimeExpression<Int, "prvalue">;

    public readonly elementInitializers?: readonly (RuntimeDefaultInitializer /* | RuntimeValueInitializer */ | RuntimeDirectInitializer)[];

    public readonly allocatedObject?: DynamicObject<BoundedArrayType<T["ptrTo"]>>;
    public readonly nextElemToInit?: ArraySubobject<T["ptrTo"]>;

    public constructor(model: CompiledNewArrayExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        if (this.model.dynamicLengthExpression) {
            this.dynamicLengthExpression = createRuntimeExpression(this.model.dynamicLengthExpression, this);
        }
    }

    protected upNextImpl() {
        if (this.dynamicLengthExpression && !this.dynamicLengthExpression.isDone) {
            this.sim.push(this.dynamicLengthExpression);
            return;
        }

        if (!this.allocatedObject) {
            return; // wait for a stepForward
        }

        if (this.elemInitIndex < this.allocatedObject.type.numElems) {
            asMutable(this).nextElemToInit = this.allocatedObject.getArrayElemSubobject(this.elemInitIndex);
            this.sim.push(this.elementInitializers![this.elemInitIndex]);
            ++this.elemInitIndex;
        }
        else {
            // All initializers must have finished
            this.allocatedObject?.beginLifetime();
        }
    }

    protected stepForwardImpl(): void {
        if (this.elemInitIndex === 0) {
            let createdType = this.model.createdType.isBoundedArrayType()
                ? this.model.createdType
                : new BoundedArrayType(this.model.createdType.elemType, this.dynamicLengthExpression!.evalResult.rawValue);
            (<Mutable<this>>this).allocatedObject = this.sim.memory.heap.allocateNewObject(createdType);

            let numInits = this.model.individualElementInitializers.length;
            let numElems = this.allocatedObject!.type.numElems;
            if (numInits > numElems) {
                // I got a bad_alloc when I tried this in g++
                this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, `There are ${numInits} initializers, but only ${numElems} in the dynamically allocated array.`);
            }

            asMutable(this).elementInitializers = this.allocatedObject!.getArrayElemSubobjects().map(
                (elemObj, i) => i < numInits
                    ? this.model.individualElementInitializers[i].createRuntimeInitializer(this)
                    : this.model.fallbackElementInitializer.createRuntimeInitializer(this)
            );
        }
        else {
            this.setEvalResult(<VCResultTypes<T, "prvalue">><unknown>this.allocatedObject!.decayToPointer());
            this.startCleanup();
        }
    }
}

