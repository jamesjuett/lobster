import { ArraySubobject, DynamicObject } from "./objects";
import { SimulationEvent } from "./Simulation";
import { AtomicType, PointerType, BoundedArrayType, FunctionType, isType, sameType, VoidType, Int, ArrayElemType, CompleteClassType, isBoundedArrayType, isCompleteObjectType, isCompleteClassType, Type, PointerToCompleteType as PointerToCompleteObjectType, isPotentiallyCompleteArrayType, PotentiallyCompleteArrayType } from "./types";
import { SuccessfullyCompiled, RuntimeConstruct, ExpressionContext, ConstructDescription } from "./constructs";
import { CPPError } from "./errors";
import { NewObjectEntity, NewArrayEntity, DynamicLengthArrayNextElementEntity } from "./entities";
import { assertNever, assert, Mutable, asMutable } from "../util/util";
import { RuntimeExpression, VCResultTypes, Expression, CompiledExpression, t_TypedExpression } from "./expressionBase";
import { ConstructOutlet, NewExpressionOutlet, DeleteExpressionOutlet, NewArrayExpressionOutlet } from "../view/codeOutlets";
import { CompiledTemporaryDeallocator } from "./PotentialFullExpression";
import { CompiledFunctionCall, FunctionCall, RuntimeFunctionCall } from "./FunctionCall";
import { CompiledDefaultInitializer, CompiledDirectInitializer, CompiledInitializer, DefaultInitializer, DirectInitializer, Initializer, ListInitializer, RuntimeDefaultInitializer, RuntimeDirectInitializer, RuntimeInitializer } from "./initializers";
import { CompiledDeclarator, CompiledTypeSpecifier, Declarator, TypeSpecifier } from "./declarations";
import { convertToPRValue, createExpressionFromAST, createRuntimeExpression, standardConversion } from "./expressions";
import { NewExpressionASTNode, DeleteExpressionASTNode } from "../ast/ast_expressions";



export function createNewExpressionFromAST(ast: NewExpressionASTNode, context: ExpressionContext) {

    // Need to create TypeSpecifier first to get the base type for the declarator
    let typeSpec = TypeSpecifier.createFromAST(ast.specs, context);
    let baseType = typeSpec.baseType;

    // Create declarator and determine declared type
    let declarator = Declarator.createFromAST(ast.declarator, context, baseType);
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
        let initializer = !initAST ?
            DefaultInitializer.create(context, newEntity) :
            initAST.construct_type === "direct_initializer" ?
                DirectInitializer.create(context, newEntity, initAST.args.map((a) => createExpressionFromAST(a, context)), "direct") :
                initAST.construct_type === "list_initializer" ?
                    ListInitializer.create(context, newEntity, initAST.arg.elements.map((a) => createExpressionFromAST(a, context))) :
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
        this.initializer = this.model.initializer?.createRuntimeInitializer(this);
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
// export var NewExpression = Expression.extend({
//     _name: "NewExpression",
//     valueCategory: "prvalue",
//     initIndex: "allocate",
//     compile : function(){
//         // Compile the type specifier
//         this.typeSpec = TypeSpecifier.instance(this.ast.specs, {parent:this});
//         this.typeSpec.compile();
//         this.heapType = this.typeSpec.type;
//         // Compile declarator if it exists
//         if(this.ast.declarator) {
//             this.declarator = Declarator.instance(this.ast.declarator, {parent: this});
//             this.declarator.compile({baseType: this.heapType});
//             this.heapType = this.declarator.type;
//         }
//         if (isA(this.heapType, Types.Array)){
//             // Note: this is Pointer, rather than ArrayPointer, since the latter should only be used in runtime contexts
//             this.type = Types.Pointer.instance(this.heapType.elemType);
//             if (this.declarator.dynamicLengthExpression){
//                 this.dynamicLength = this.i_createAndCompileChildExpr(this.declarator.dynamicLengthExpression, Types.Int.instance());
//                 this.initIndex = "length";
//             }
//         }
//         else {
//             this.type = Types.Pointer.instance(this.heapType);
//         }
//         var entity = NewObjectEntity.instance(this.heapType);
//         var initCode = this.ast.initializer || {args: []};
//         if (isA(this.heapType, Types.Class) || initCode.args.length == 1){
//             this.initializer = NewDirectInitializer.instance(initCode, {parent: this});
//             this.initializer.compile(entity);
//         }
//         else if (initCode.args.length == 0){
//             this.initializer = NewDefaultInitializer.instance(initCode, {parent: this});
//             this.initializer.compile(entity);
//         }
//         else{
//             this.addNote(CPPError.declaration.init.scalar_args(this, this.heapType));
//         }
//         this.compileTemporarires();
//     },
//     createInstance : function(sim, parent){
//         var inst = Expression.createInstance.apply(this, arguments);
//         inst.initializer = this.initializer.createInstance(sim, inst);
//         return inst;
//     },
//     upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index === "length"){
//             inst.dynamicLength = this.dynamicLength.createAndPushInstance(sim, inst);
//             inst.index = "allocate";
//             return true;
//         }
//         else if (inst.index === "init"){
//             sim.push(inst.initializer);
//             inst.index = "operate";
//             return true;
//         }
//     },
//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         // Dynamic memory - doesn't get added to any scope, but we create on the heap
//         if (inst.index === "allocate") {
//             var heapType = this.heapType;
//             // If it's an array, we need to use the dynamic length
//             if (this.dynamicLength) {
//                 var len = inst.dynamicLength.evalResult.rawValue();
//                 if (len === 0){
//                     sim.alert("Sorry, but I can't allocate a dynamic array of zero length. I know there's technically an old C-style hack that uses zero-length arrays, but hey, I'm just a lobster. I'll go ahead and allocate an array of length 1 instead.");
//                     len = 1;
//                 }
//                 else if (len < 0){
//                     sim.undefinedBehavior("I can't allocate an array of negative length. That doesn't even make sense. I'll just allocate an array of length 1 instead.");
//                     len = 1;
//                 }
//                 heapType = Types.Array.instance(this.heapType.elemType, len);
//             }
//             var obj = DynamicObject.instance(heapType);
//             sim.memory.heap.allocateNewObject(obj);
//             sim.i_pendingNews.push(obj);
//             inst.i_allocatedObject = obj;
//             inst.initializer.setAllocatedObject(obj);
//             inst.index = "init"; // Always use an initializer. If there isn't one, then it will just be default
//             //if (this.initializer){
//             //    inst.index = "init";
//             //}
//             //else{
//             //    inst.index = "operate";
//             //}
//             //return true;
//         }
//         else if (inst.index === "operate") {
//             if (isA(this.heapType, Types.Array)){
//                 // RTTI for array pointer
//                 inst.setEvalResult(Value.instance(inst.i_allocatedObject.address, Types.ArrayPointer.instance(inst.i_allocatedObject)));
//             }
//             else{
//                 // RTTI for object pointer
//                 inst.setEvalResult(Value.instance(inst.i_allocatedObject.address, Types.ObjectPointer.instance(inst.i_allocatedObject)));
//             }
//             sim.i_pendingNews.pop();
//             this.done(sim, inst);
//         }
//     },
//     explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (this.initializer){
//             return {message: "A new object of type " + this.heapType.describe().name + " will be created on the heap. " + this.initializer.explain(sim, inst.initializer).message};
//         }
//         else{
//             return {message: "A new object of type " + this.heapType.describe().name + " will be created on the heap."};
//         }
//     }
// });


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

    public operand: RuntimeExpression<PointerToCompleteObjectType, "prvalue">;
    public dtor?: RuntimeFunctionCall<FunctionType<VoidType>>;

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
        else if (this.model.dtor && !this.dtor) {
            let obj = this.sim.memory.dereference(this.operand.evalResult);

            if (obj.isAlive && obj instanceof DynamicObject && obj.isTyped(isCompleteClassType)) {
                this.sim.push(this.dtor = this.model.dtor.createRuntimeFunctionCall(this, obj));
            }
        }
    }

    protected stepForwardImpl(): void {
        let obj = this.sim.memory.dereference(this.operand.evalResult);

        if (!obj.hasStorage("dynamic")) {
            this.sim.eventOccurred(SimulationEvent.UNDEFINED_BEHAVIOR, "Invalid delete");
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
            this.sim.memory.heap.deleteObject(obj);
        }
        this.startCleanup();
    }

}
