"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeDeleteArrayExpression = exports.DeleteArrayExpression = exports.RuntimeDeleteExpression = exports.DeleteExpression = exports.RuntimeNewArrayExpression = exports.NewArrayExpression = exports.RuntimeNewExpression = exports.NewExpression = exports.createNewExpressionFromAST = void 0;
const Simulation_1 = require("./Simulation");
const types_1 = require("./types");
const errors_1 = require("./errors");
const entities_1 = require("./entities");
const util_1 = require("../util/util");
const expressionBase_1 = require("./expressionBase");
const codeOutlets_1 = require("../view/codeOutlets");
const FunctionCall_1 = require("./FunctionCall");
const initializers_1 = require("./initializers");
const declarations_1 = require("./declarations");
const expressions_1 = require("./expressions");
function createNewExpressionFromAST(ast, context) {
    // Need to create TypeSpecifier first to get the base type for the declarator
    let typeSpec = declarations_1.TypeSpecifier.createFromAST(ast.specs, context);
    let baseType = typeSpec.baseType;
    // Create declarator and determine declared type
    let declarator = declarations_1.Declarator.createFromAST(ast.declarator, context, baseType);
    let createdType = declarator.type;
    if (createdType && types_1.isPotentiallyCompleteArrayType(createdType)) {
        // TODO new array expression
        return new NewArrayExpression(context, ast, typeSpec, declarator, createdType);
    }
    else {
        return new NewExpression(context, ast, typeSpec, declarator, createdType);
    }
}
exports.createNewExpressionFromAST = createNewExpressionFromAST;
class NewExpression extends expressionBase_1.Expression {
    constructor(context, ast, typeSpecifier, declarator, createdType) {
        super(context, ast);
        this.construct_type = "new_expression";
        this.valueCategory = "prvalue";
        util_1.assert(!createdType || !declarator.type || types_1.sameType(createdType, declarator.type));
        this.attach(this.typeSpecifier = typeSpecifier);
        this.attach(this.declarator = declarator);
        if (!createdType) {
            // If we don't have a viable type to create
            return;
        }
        if (!types_1.isCompleteObjectType(createdType)) {
            this.addNote(errors_1.CPPError.expr.new.unsupported_type(this, createdType));
            return;
        }
        this.createdType = createdType;
        this.type = new types_1.PointerType(createdType);
        let initAST = ast.initializer;
        let newEntity = new entities_1.NewObjectEntity(createdType);
        let initializer = !initAST ? initializers_1.DefaultInitializer.create(context, newEntity) :
            initAST.construct_type === "value_initializer" ? initializers_1.ValueInitializer.create(context, newEntity) :
                initAST.construct_type === "direct_initializer" ? initializers_1.DirectInitializer.create(context, newEntity, initAST.args.map((a) => expressions_1.createExpressionFromAST(a, context)), "direct") :
                    initAST.construct_type === "list_initializer" ? initializers_1.ListInitializer.create(context, newEntity, initAST.arg.elements.map((a) => expressions_1.createExpressionFromAST(a, context))) :
                        util_1.assertNever(initAST);
        if (initializer.construct_type !== "invalid_construct") {
            this.attach(this.initializer = initializer);
        }
        else {
            this.attach(initializer);
        }
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.NewExpressionOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.NewExpression = NewExpression;
class RuntimeNewExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.index = 0;
    }
    upNextImpl() {
        if (this.index === 1) {
            this.initializer && this.sim.push(this.initializer);
            ++this.index;
        }
    }
    stepForwardImpl() {
        var _a;
        if (this.index === 0) {
            this.allocatedObject = this.sim.memory.heap.allocateNewObject(this.model.createdType);
            this.initializer = (_a = this.model.initializer) === null || _a === void 0 ? void 0 : _a.createRuntimeInitializer(this);
            ++this.index;
        }
        else {
            this.setEvalResult(this.allocatedObject.getPointerTo());
            this.startCleanup();
        }
    }
}
exports.RuntimeNewExpression = RuntimeNewExpression;
class NewArrayExpression extends expressionBase_1.Expression {
    constructor(context, ast, typeSpecifier, declarator, createdType) {
        super(context, ast);
        this.construct_type = "new_array_expression";
        this.valueCategory = "prvalue";
        util_1.assert(!createdType || !declarator.type || types_1.sameType(createdType, declarator.type));
        this.attach(this.typeSpecifier = typeSpecifier);
        this.attach(this.declarator = declarator);
        this.createdType = createdType;
        this.type = createdType.adjustToPointerType();
        if (createdType.isArrayOfUnknownBoundType()) {
            if (createdType.sizeExpressionAST) {
                let sizeExp = expressions_1.createExpressionFromAST(createdType.sizeExpressionAST, context);
                if (sizeExp.isWellTyped()) {
                    let convertedSizeExp = expressions_1.standardConversion(sizeExp, types_1.Int.INT);
                    if (!types_1.isType(convertedSizeExp.type, types_1.Int)) {
                        convertedSizeExp.addNote(errors_1.CPPError.expr.new_array.integer_length_required(sizeExp));
                    }
                    this.attach(this.dynamicLengthExpression = convertedSizeExp);
                }
                else {
                    this.attach(this.dynamicLengthExpression = sizeExp);
                }
            }
            else {
                this.addNote(errors_1.CPPError.expr.new_array.length_required(this));
            }
        }
        this.allocatedArray = new entities_1.NewArrayEntity(createdType);
        let initAST = ast.initializer;
        if (!initAST) {
            this.fallbackElementInitializer = initializers_1.DefaultInitializer.create(context, new entities_1.DynamicLengthArrayNextElementEntity(this.allocatedArray));
            this.individualElementInitializers = [];
        }
        else if (initAST.construct_type === "direct_initializer") {
            this.addNote(errors_1.CPPError.expr.new_array.direct_initialization_prohibited(this));
        }
        else if (initAST.construct_type === "list_initializer") {
            // TODO: should be value-initialization
            this.fallbackElementInitializer = initializers_1.DefaultInitializer.create(context, new entities_1.DynamicLengthArrayNextElementEntity(this.allocatedArray));
            this.individualElementInitializers = initAST.arg.elements.map((arg, i) => initializers_1.DirectInitializer.create(context, new entities_1.DynamicLengthArrayNextElementEntity(this.allocatedArray), [expressions_1.createExpressionFromAST(arg, context)], "direct"));
        }
        this.fallbackElementInitializer && this.attach(this.fallbackElementInitializer);
        this.individualElementInitializers && this.attachAll(this.individualElementInitializers);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.NewArrayExpressionOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.NewArrayExpression = NewArrayExpression;
class RuntimeNewArrayExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.elemInitIndex = 0;
        if (this.model.dynamicLengthExpression) {
            this.dynamicLengthExpression = expressions_1.createRuntimeExpression(this.model.dynamicLengthExpression, this);
        }
    }
    upNextImpl() {
        var _a;
        if (this.dynamicLengthExpression && !this.dynamicLengthExpression.isDone) {
            this.sim.push(this.dynamicLengthExpression);
            return;
        }
        if (!this.allocatedObject) {
            return; // wait for a stepForward
        }
        if (this.elemInitIndex < this.allocatedObject.type.numElems) {
            util_1.asMutable(this).nextElemToInit = this.allocatedObject.getArrayElemSubobject(this.elemInitIndex);
            this.sim.push(this.elementInitializers[this.elemInitIndex]);
            ++this.elemInitIndex;
        }
        else {
            // All initializers must have finished
            (_a = this.allocatedObject) === null || _a === void 0 ? void 0 : _a.beginLifetime();
        }
    }
    stepForwardImpl() {
        if (this.elemInitIndex === 0) {
            let createdType = this.model.createdType.isBoundedArrayType()
                ? this.model.createdType
                : new types_1.BoundedArrayType(this.model.createdType.elemType, this.dynamicLengthExpression.evalResult.rawValue);
            this.allocatedObject = this.sim.memory.heap.allocateNewObject(createdType);
            let numInits = this.model.individualElementInitializers.length;
            let numElems = this.allocatedObject.type.numElems;
            if (numInits > numElems) {
                // I got a bad_alloc when I tried this in g++
                this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, `There are ${numInits} initializers, but only ${numElems} in the dynamically allocated array.`);
            }
            util_1.asMutable(this).elementInitializers = this.allocatedObject.getArrayElemSubobjects().map((elemObj, i) => i < numInits
                ? this.model.individualElementInitializers[i].createRuntimeInitializer(this)
                : this.model.fallbackElementInitializer.createRuntimeInitializer(this));
        }
        else {
            this.setEvalResult(this.allocatedObject.decayToPointer());
            this.startCleanup();
        }
    }
}
exports.RuntimeNewArrayExpression = RuntimeNewArrayExpression;
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
class DeleteExpression extends expressionBase_1.Expression {
    constructor(context, ast, operand) {
        var _a;
        super(context, ast);
        this.construct_type = "delete_expression";
        this.type = types_1.VoidType.VOID;
        this.valueCategory = "prvalue";
        this.operator = "delete";
        if (!operand.isWellTyped()) {
            this.attach(this.operand = operand);
            return;
        }
        if (!operand.type.isPointerType()) {
            this.addNote(errors_1.CPPError.expr.delete.pointer(this, operand.type));
            this.attach(this.operand = operand);
            return;
        }
        if (!operand.type.isPointerToCompleteObjectType()) {
            this.addNote(errors_1.CPPError.expr.delete.pointerToObjectType(this, operand.type));
            this.attach(this.operand = operand);
            return;
        }
        // Note that this comes after the pointer check, which is intentional
        operand = expressions_1.convertToPRValue(operand);
        this.operand = operand;
        // This should still be true, assertion for type system
        util_1.assert((_a = operand.type) === null || _a === void 0 ? void 0 : _a.isPointerToCompleteObjectType());
        let destroyedType = operand.type.ptrTo;
        if (destroyedType.isCompleteClassType()) {
            let dtor = destroyedType.classDefinition.destructor;
            if (dtor) {
                let dtorCall = new FunctionCall_1.FunctionCall(context, dtor, [], destroyedType);
                this.attach(this.dtor = dtorCall);
            }
            else {
                this.addNote(errors_1.CPPError.expr.delete.no_destructor(this, destroyedType));
            }
        }
    }
    static createFromAST(ast, context) {
        return new DeleteExpression(context, ast, expressions_1.createExpressionFromAST(ast.operand, context));
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.DeleteExpressionOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.DeleteExpression = DeleteExpression;
class RuntimeDeleteExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.operand = expressions_1.createRuntimeExpression(this.model.operand, this);
    }
    upNextImpl() {
        if (!this.operand.isDone) {
            this.sim.push(this.operand);
        }
        else if (types_1.PointerType.isNull(this.operand.evalResult.rawValue)) {
            // delete on a null pointer does nothing
            this.startCleanup();
        }
        else if (!this.model.dtor || !this.dtor) {
            let obj = this.sim.memory.dereference(this.operand.evalResult);
            if (!obj.hasStorage("dynamic")) {
                this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "Invalid delete");
                this.startCleanup();
                return;
            }
            else if (!obj.isAlive) {
                this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "Double free");
                this.startCleanup();
                return;
            }
            else if (obj.isTyped(types_1.isBoundedArrayType)) {
                this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "Invalid use of regular delete on array");
                this.startCleanup();
                return;
            }
            else {
                util_1.asMutable(this).destroyedObject = obj;
                if (obj.isTyped(types_1.isCompleteClassType) && this.model.dtor) {
                    let dtor = this.model.dtor.createRuntimeFunctionCall(this, obj);
                    util_1.asMutable(this).dtor = dtor;
                    this.sim.push(dtor);
                }
            }
        }
    }
    stepForwardImpl() {
        this.sim.memory.heap.deleteObject(this.destroyedObject);
        this.startCleanup();
    }
}
exports.RuntimeDeleteExpression = RuntimeDeleteExpression;
class DeleteArrayExpression extends expressionBase_1.Expression {
    constructor(context, ast, operand) {
        var _a;
        super(context, ast);
        this.construct_type = "delete_array_expression";
        this.type = types_1.VoidType.VOID;
        this.valueCategory = "prvalue";
        this.operator = "delete";
        if (!operand.isWellTyped()) {
            this.attach(this.operand = operand);
            return;
        }
        if (!operand.type.isPointerType()) {
            this.addNote(errors_1.CPPError.expr.delete.pointer(this, operand.type));
            this.attach(this.operand = operand);
            return;
        }
        if (!operand.type.isPointerToCompleteObjectType()) {
            this.addNote(errors_1.CPPError.expr.delete.pointerToObjectType(this, operand.type));
            this.attach(this.operand = operand);
            return;
        }
        if (!operand.type.ptrTo.isArrayElemType()) {
            this.addNote(errors_1.CPPError.expr.delete.pointerToArrayElemType(this, operand.type));
            this.attach(this.operand = operand);
            return;
        }
        // Note that the prvalue conversion comes after type checking
        // An implication of this is you can't give an array directly to
        // delete, since it won't decay into a pointer. But there's really
        // no good reason you would ever do that, since any dynamically allocated
        // array will have already decayed to a pointer
        operand = expressions_1.convertToPRValue(operand);
        this.operand = operand;
        // This should still be true, assertion for type system
        util_1.assert((_a = operand.type) === null || _a === void 0 ? void 0 : _a.isPointerToCompleteObjectType());
        let destroyedType = operand.type.ptrTo;
        if (destroyedType.isCompleteClassType()) {
            let dtor = destroyedType.classDefinition.destructor;
            if (dtor) {
                let dtorCall = new FunctionCall_1.FunctionCall(context, dtor, [], destroyedType);
                this.attach(this.elementDtor = dtorCall);
            }
            else {
                this.addNote(errors_1.CPPError.expr.delete.no_destructor(this, destroyedType));
            }
        }
    }
    static createFromAST(ast, context) {
        return new DeleteArrayExpression(context, ast, expressions_1.createExpressionFromAST(ast.operand, context));
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.DeleteArrayExpressionOutlet(element, this, parent);
    }
    describeEvalResult(depth) {
        throw new Error("Method not implemented.");
    }
}
exports.DeleteArrayExpression = DeleteArrayExpression;
class RuntimeDeleteArrayExpression extends expressionBase_1.RuntimeExpression {
    constructor(model, parent) {
        super(model, parent);
        this.index = 0;
        this.dtors = [];
        this.operand = expressions_1.createRuntimeExpression(this.model.operand, this);
    }
    upNextImpl() {
        if (!this.operand.isDone) {
            this.sim.push(this.operand);
            return;
        }
        if (!this.targetArray) {
            if (types_1.PointerType.isNull(this.operand.evalResult.rawValue)) {
                // delete on a null pointer does nothing
                this.startCleanup();
                return;
            }
            let ptr = this.operand.evalResult;
            let targetObject = ptr.isTyped(types_1.isArrayPointerType)
                ? ptr.type.arrayObject
                : this.sim.memory.dereference(ptr);
            if (!targetObject.hasStorage("dynamic")) {
                this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "Invalid delete");
                this.startCleanup();
                return;
            }
            else if (!targetObject.isAlive) {
                this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "Double free");
                this.startCleanup();
                return;
            }
            else if (!targetObject.isTyped(types_1.isBoundedArrayType)) {
                this.sim.eventOccurred(Simulation_1.SimulationEvent.UNDEFINED_BEHAVIOR, "Invalid use of array delete[] on non-array");
                this.startCleanup();
                return;
            }
            util_1.asMutable(this).targetArray = targetObject;
        }
        if (this.targetArray && this.model.elementDtor && this.index < this.targetArray.type.numElems) {
            let elem = this.targetArray.getArrayElemSubobject(this.index++);
            if (elem.isTyped(types_1.isCompleteClassType)) {
                let dtor = this.model.elementDtor.createRuntimeFunctionCall(this, elem);
                util_1.asMutable(this.dtors).push(dtor);
                this.sim.push(dtor);
                return;
            }
        }
    }
    stepForwardImpl() {
        if (this.targetArray) {
            this.sim.memory.heap.deleteObject(this.targetArray);
            this.startCleanup();
        }
    }
}
exports.RuntimeDeleteArrayExpression = RuntimeDeleteArrayExpression;
// If it's an array pointer, just grab array object to delete from RTTI.
//             // Otherwise ask memory what object it's pointing to.
//             var obj;
//             if (isA(ptr.type, Types.ArrayPointer)){
//                 obj = ptr.type.arrObj;
//             }
//             else{
//                 obj = sim.memory.dereference(ptr);
//             }
//             if (!isA(obj, DynamicObject)) {
//                 if (isA(obj, AutoObject)) {
//                     sim.undefinedBehavior("Oh no! The pointer you gave to <span class='code'>delete</span> was pointing to something on the stack!");
//                 }
//                 else {
//                     sim.undefinedBehavior("Oh no! The pointer you gave to <span class='code'>delete</span> wasn't pointing to a valid heap object.");
//                 }
//                 this.done(sim, inst);
//                 return;
//             }
//             if (isA(obj.type, Types.Array)){
//                 sim.undefinedBehavior("You tried to delete an array object with a <span class='code'>delete</span> expression. Did you forget to use the delete[] syntax?");
//                 this.done(sim, inst);
//                 return;
//             }
//             //if (!similarType(obj.type, this.operand.type.ptrTo)) {
//             //    sim.alert("The type of the pointer you gave to <span class='code'>delete</span> is different than the type of the object I found on the heap - that's a bad thing!");
//             //    this.done(sim, inst);
//             //    return;
//             //}
//             if (!obj.isAlive()) {
//                 DeadObjectMessage.instance(obj, {fromDelete:true}).display(sim, inst);
//                 this.done(sim, inst);
//                 return;
//             }
//             inst.alreadyDestructed = true;
//             if(this.funcCall){
//                 // Set obj as receiver for virtual destructor lookup
//                 var dest = this.funcCall.createAndPushInstance(sim, inst, obj);
//             }
//             else{
//                 return true;
//             }
//# sourceMappingURL=new_delete.js.map