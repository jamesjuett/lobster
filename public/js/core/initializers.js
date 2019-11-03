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
var entities_1 = require("./entities");
var types_1 = require("./types");
var util_1 = require("../util/util");
var errors_1 = require("./errors");
var standardConversions_1 = require("./standardConversions");
var Initializer = /** @class */ (function (_super) {
    __extends(Initializer, _super);
    function Initializer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Initializer.prototype.isTailChild = function (child) {
        return { isTail: true };
    };
    return Initializer;
}(constructs_1.PotentialFullExpression));
exports.Initializer = Initializer;
var RuntimeInitializer = /** @class */ (function (_super) {
    __extends(RuntimeInitializer, _super);
    function RuntimeInitializer(model, parent) {
        return _super.call(this, model, "initializer", parent) || this;
    }
    return RuntimeInitializer;
}(constructs_1.RuntimePotentialFullExpression));
exports.RuntimeInitializer = RuntimeInitializer;
var DefaultInitializer = /** @class */ (function (_super) {
    __extends(DefaultInitializer, _super);
    function DefaultInitializer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DefaultInitializer.create = function (context, target) {
        if (target.bindTo) {
            return new ReferenceDefaultInitializer(context, target);
        }
        else if (target.type instanceof types_1.AtomicType) {
            return new AtomicDefaultInitializer(context, target);
        }
        else if (target.type instanceof types_1.BoundedArrayType) {
            return new ArrayDefaultInitializer(context, target);
        }
        // else if (target.type instanceof ClassType) {
        //     return new ClassDefaultInitializer(context, <ObjectEntity<ClassType>> target);
        // }
        else {
            return util_1.assertFalse();
        }
    };
    return DefaultInitializer;
}(Initializer));
exports.DefaultInitializer = DefaultInitializer;
var RuntimeDefaultInitializer = /** @class */ (function (_super) {
    __extends(RuntimeDefaultInitializer, _super);
    function RuntimeDefaultInitializer(model, parent) {
        return _super.call(this, model, parent) || this;
    }
    return RuntimeDefaultInitializer;
}(RuntimeInitializer));
exports.RuntimeDefaultInitializer = RuntimeDefaultInitializer;
var ReferenceDefaultInitializer = /** @class */ (function (_super) {
    __extends(ReferenceDefaultInitializer, _super);
    function ReferenceDefaultInitializer(context, target) {
        var _this = _super.call(this, context) || this;
        _this.target = target;
        // Cannot default initialize a reference
        _this.addNote(errors_1.CPPError.declaration.init.referenceBind(_this));
        return _this;
    }
    ReferenceDefaultInitializer.prototype.createRuntimeInitializer = function (parent) {
        return util_1.assertFalse("A default initializer for a reference is not allowed.");
    };
    ReferenceDefaultInitializer.prototype.explain = function (sim, rtConstruct) {
        return util_1.assertFalse("A default initializer for a reference is not allowed.");
    };
    return ReferenceDefaultInitializer;
}(DefaultInitializer));
exports.ReferenceDefaultInitializer = ReferenceDefaultInitializer;
// Note: No CompiledReferenceDefaultInitializer or RuntimeReferenceDefaultInitializer classes since
//       default initialization of a reference is always ill-formed.
var AtomicDefaultInitializer = /** @class */ (function (_super) {
    __extends(AtomicDefaultInitializer, _super);
    function AtomicDefaultInitializer(context, target) {
        var _this = _super.call(this, context) || this;
        _this.target = target;
        return _this;
    }
    AtomicDefaultInitializer.prototype.createRuntimeInitializer = function (parent) {
        return new RuntimeAtomicDefaultInitializer(this, parent);
    };
    AtomicDefaultInitializer.prototype.explain = function (sim, rtConstruct) {
        var targetDesc = this.target.describe();
        return { message: "No initialization will take place. " + (targetDesc.name || targetDesc.message) + " will have a junk value." };
    };
    return AtomicDefaultInitializer;
}(DefaultInitializer));
exports.AtomicDefaultInitializer = AtomicDefaultInitializer;
var RuntimeAtomicDefaultInitializer = /** @class */ (function (_super) {
    __extends(RuntimeAtomicDefaultInitializer, _super);
    function RuntimeAtomicDefaultInitializer(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.target = _this.model.target.runtimeLookup(_this);
        return _this;
    }
    RuntimeAtomicDefaultInitializer.prototype.upNextImpl = function () {
        // No initialization. Object has junk value.
        this.observable.send("initialized", this.target);
        this.sim.pop();
    };
    RuntimeAtomicDefaultInitializer.prototype.stepForwardImpl = function () {
        // do nothing
    };
    return RuntimeAtomicDefaultInitializer;
}(RuntimeDefaultInitializer));
exports.RuntimeAtomicDefaultInitializer = RuntimeAtomicDefaultInitializer;
var ArrayDefaultInitializer = /** @class */ (function (_super) {
    __extends(ArrayDefaultInitializer, _super);
    function ArrayDefaultInitializer(context, target) {
        var _this = _super.call(this, context) || this;
        _this.target = target;
        // If it's an array of atomic types, do nothing.
        var type = _this.target.type;
        if (type.elemType instanceof types_1.AtomicType) {
            // Do nothing
        }
        else {
            _this.elementInitializers = [];
            for (var i = 0; i < type.length; ++i) {
                var elemInit = DefaultInitializer.create(context, new entities_1.ArraySubobjectEntity(_this.target, i));
                _this.elementInitializers.push(elemInit);
                _this.attach(elemInit);
                if (elemInit.hasErrors) {
                    _this.addNote(errors_1.CPPError.declaration.init.array_default_init(_this));
                    break;
                }
            }
        }
        return _this;
    }
    ArrayDefaultInitializer.prototype.createRuntimeInitializer = function (parent) {
        return new RuntimeArrayDefaultInitializer(this, parent);
    };
    ArrayDefaultInitializer.prototype.explain = function (sim, rtConstruct) {
        var targetDesc = this.target.describe();
        var targetType = this.target.type;
        if (targetType.length === 0) {
            return { message: "No initialization is performed for " + (targetDesc.name || targetDesc.message) + "because the array has length 0." };
        }
        else if (targetType.elemType instanceof types_1.AtomicType) {
            return { message: "No initialization will take place. The elements of " + (targetDesc.name || targetDesc.message) + " will have junk values." };
        }
        else {
            return { message: "Each element of " + (targetDesc.name || targetDesc.message) + " will be default-initialized. For example, " +
                    this.elementInitializers[0].explain(sim, rtConstruct) };
        }
    };
    return ArrayDefaultInitializer;
}(DefaultInitializer));
exports.ArrayDefaultInitializer = ArrayDefaultInitializer;
var RuntimeArrayDefaultInitializer = /** @class */ (function (_super) {
    __extends(RuntimeArrayDefaultInitializer, _super);
    function RuntimeArrayDefaultInitializer(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.index = 0;
        _this.target = _this.model.target.runtimeLookup(_this);
        if (_this.model.elementInitializers) {
            _this.elementInitializers = _this.model.elementInitializers.map(function (elemInit) {
                return elemInit.createRuntimeInitializer(_this);
            });
        }
        return _this;
    }
    RuntimeArrayDefaultInitializer.prototype.upNextImpl = function () {
        if (this.elementInitializers && this.index < this.elementInitializers.length) {
            this.sim.push(this.elementInitializers[this.index++]);
        }
        else {
            this.observable.send("initialized", this.target);
            this.sim.pop();
        }
    };
    RuntimeArrayDefaultInitializer.prototype.stepForwardImpl = function () {
        // do nothing
    };
    return RuntimeArrayDefaultInitializer;
}(RuntimeDefaultInitializer));
exports.RuntimeArrayDefaultInitializer = RuntimeArrayDefaultInitializer;
var DirectInitializer = /** @class */ (function (_super) {
    __extends(DirectInitializer, _super);
    function DirectInitializer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DirectInitializer.create = function (context, target, args) {
        if (target.bindTo) {
            return new ReferenceDirectInitializer(context, target, args);
        }
        else if (target.type instanceof types_1.AtomicType) {
            return new AtomicDirectInitializer(context, target, args);
        }
        // else if (target.type instanceof BoundedArrayType) {
        //     return new ArrayDirectInitializer(context, <ObjectEntity<BoundedArrayType>> target, args);
        // }
        // else if (target.type instanceof ClassType) {
        //     return new ClassDirectInitializer(context, <ObjectEntity<ClassType>> target, args);
        // }
        else {
            return util_1.assertFalse();
        }
    };
    return DirectInitializer;
}(Initializer));
exports.DirectInitializer = DirectInitializer;
var RuntimeDirectInitializer = /** @class */ (function (_super) {
    __extends(RuntimeDirectInitializer, _super);
    function RuntimeDirectInitializer(model, parent) {
        return _super.call(this, model, parent) || this;
    }
    return RuntimeDirectInitializer;
}(RuntimeInitializer));
exports.RuntimeDirectInitializer = RuntimeDirectInitializer;
var ReferenceDirectInitializer = /** @class */ (function (_super) {
    __extends(ReferenceDirectInitializer, _super);
    function ReferenceDirectInitializer(context, target, args) {
        var _this = _super.call(this, context) || this;
        _this.target = target;
        _this.args = args;
        args.forEach(function (a) { _this.attach(a); });
        // Note: With a reference, no conversions are done
        if (_this.args.length > 1) {
            _this.addNote(errors_1.CPPError.declaration.init.referenceBindMultiple(_this));
            return _this;
        }
        _this.arg = _this.args[0];
        if (!_this.arg.isWellTyped()) {
            return _this;
        }
        var targetType = target.type;
        if (!types_1.referenceCompatible(_this.arg.type, targetType)) {
            _this.addNote(errors_1.CPPError.declaration.init.referenceType(_this, _this.arg.type, targetType));
        }
        else if (_this.arg.valueCategory === "prvalue" && !targetType.isConst) {
            _this.addNote(errors_1.CPPError.declaration.init.referencePrvalueConst(_this));
        }
        else if (_this.arg.valueCategory === "prvalue") {
            _this.addNote(errors_1.CPPError.lobster.referencePrvalue(_this));
        }
        return _this;
    }
    ReferenceDirectInitializer.prototype.createRuntimeInitializer = function (parent) {
        return new RuntimeReferenceDirectInitializer(this, parent);
    };
    ReferenceDirectInitializer.prototype.explain = function (sim, rtConstruct) {
        var targetDesc = this.target.describe();
        var rhsDesc = this.args[0].describeEvalResult(0);
        return { message: (targetDesc.name || targetDesc.message) + " will be bound to " + (rhsDesc.name || rhsDesc.message) + "." };
    };
    return ReferenceDirectInitializer;
}(DirectInitializer));
exports.ReferenceDirectInitializer = ReferenceDirectInitializer;
var RuntimeReferenceDirectInitializer = /** @class */ (function (_super) {
    __extends(RuntimeReferenceDirectInitializer, _super);
    function RuntimeReferenceDirectInitializer(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.alreadyPushed = false;
        _this.arg = _this.model.arg.createRuntimeExpression(_this);
        return _this;
    }
    RuntimeReferenceDirectInitializer.prototype.upNextImpl = function () {
        if (!this.alreadyPushed) {
            this.sim.push(this.arg);
            this.alreadyPushed = true;
        }
    };
    RuntimeReferenceDirectInitializer.prototype.stepForwardImpl = function () {
        var rtRef = this.model.target.bindTo(this, this.arg.evalResult); //TODO not sure at all why this cast is necessary
        this.observable.send("initialized", rtRef);
        this.sim.pop();
    };
    return RuntimeReferenceDirectInitializer;
}(RuntimeDirectInitializer));
exports.RuntimeReferenceDirectInitializer = RuntimeReferenceDirectInitializer;
var AtomicDirectInitializer = /** @class */ (function (_super) {
    __extends(AtomicDirectInitializer, _super);
    function AtomicDirectInitializer(context, target, args) {
        var _this = _super.call(this, context) || this;
        _this.target = target;
        var targetType = target.type;
        _this.args = args;
        args.forEach(function (a) { _this.attach(a); });
        if (args.length > 1) {
            _this.addNote(errors_1.CPPError.declaration.init.scalar_args(_this, targetType));
            return _this;
        }
        _this.arg = args[0];
        //Attempt standard conversion to declared type, including lvalue to rvalue conversions
        if (!_this.arg.isWellTyped()) {
            return _this;
        }
        var typedArg = standardConversions_1.standardConversion(_this.arg, targetType);
        _this.arg = typedArg;
        if (!types_1.sameType(typedArg.type, targetType)) {
            _this.addNote(errors_1.CPPError.declaration.init.convert(_this, typedArg.type, targetType));
        }
        return _this;
        // TODO: need to check that the arg is a prvalue
    }
    AtomicDirectInitializer.prototype.createRuntimeInitializer = function (parent) {
        return new RuntimeAtomicDirectInitializer(this, parent);
    };
    // TODO; change explain everywhere to be separate between compile time and runtime constructs
    AtomicDirectInitializer.prototype.explain = function (sim, rtConstruct) {
        var targetDesc = this.target.runtimeLookup(rtConstruct).describe();
        var rhsDesc = this.args[0].describeEvalResult(0);
        return { message: (targetDesc.name || targetDesc.message) + " will be initialized with " + (rhsDesc.name || rhsDesc.message) + "." };
    };
    return AtomicDirectInitializer;
}(DirectInitializer));
exports.AtomicDirectInitializer = AtomicDirectInitializer;
var RuntimeAtomicDirectInitializer = /** @class */ (function (_super) {
    __extends(RuntimeAtomicDirectInitializer, _super);
    function RuntimeAtomicDirectInitializer(model, parent) {
        var _this = _super.call(this, model, parent) || this;
        _this.alreadyPushed = false;
        _this.target = _this.model.target.runtimeLookup(_this);
        _this.arg = _this.model.arg.createRuntimeExpression(_this);
        return _this;
    }
    RuntimeAtomicDirectInitializer.prototype.upNextImpl = function () {
        if (!this.alreadyPushed) {
            this.sim.push(this.arg);
            this.alreadyPushed = true;
        }
    };
    RuntimeAtomicDirectInitializer.prototype.stepForwardImpl = function () {
        this.target.writeValue(this.arg.evalResult);
        this.observable.send("initialized", this.target);
        this.sim.pop();
    };
    return RuntimeAtomicDirectInitializer;
}(RuntimeDirectInitializer));
exports.RuntimeAtomicDirectInitializer = RuntimeAtomicDirectInitializer;
// TODO: These should really be "class aliases" rather than derived classes, however
// it doesn't seem like Typescript has any proper mechanism for this.
var CopyInitializer = /** @class */ (function (_super) {
    __extends(CopyInitializer, _super);
    function CopyInitializer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return CopyInitializer;
}(DirectInitializer));
exports.CopyInitializer = CopyInitializer;
;
;
var RuntimeCopyInitializer = /** @class */ (function (_super) {
    __extends(RuntimeCopyInitializer, _super);
    function RuntimeCopyInitializer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return RuntimeCopyInitializer;
}(RuntimeDirectInitializer));
exports.RuntimeCopyInitializer = RuntimeCopyInitializer;
;
var ReferenceCopyInitializer = /** @class */ (function (_super) {
    __extends(ReferenceCopyInitializer, _super);
    function ReferenceCopyInitializer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ReferenceCopyInitializer;
}(ReferenceDirectInitializer));
exports.ReferenceCopyInitializer = ReferenceCopyInitializer;
;
;
var RuntimeReferenceCopyInitializer = /** @class */ (function (_super) {
    __extends(RuntimeReferenceCopyInitializer, _super);
    function RuntimeReferenceCopyInitializer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return RuntimeReferenceCopyInitializer;
}(RuntimeReferenceDirectInitializer));
exports.RuntimeReferenceCopyInitializer = RuntimeReferenceCopyInitializer;
;
var AtomicCopyInitializer = /** @class */ (function (_super) {
    __extends(AtomicCopyInitializer, _super);
    function AtomicCopyInitializer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return AtomicCopyInitializer;
}(AtomicDirectInitializer));
exports.AtomicCopyInitializer = AtomicCopyInitializer;
;
;
var RuntimeAtomicCopyInitializer = /** @class */ (function (_super) {
    __extends(RuntimeAtomicCopyInitializer, _super);
    function RuntimeAtomicCopyInitializer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return RuntimeAtomicCopyInitializer;
}(RuntimeAtomicDirectInitializer));
exports.RuntimeAtomicCopyInitializer = RuntimeAtomicCopyInitializer;
;
// export class ArrayCopyInitializer extends ArrayDirectInitializer { };
// export class RuntimeArrayCopyInitializer extends RuntimeArrayDirectInitializer { };
// export class ClassCopyInitializer extends ClassDirectInitializer { };
// export class RuntimeClassCopyInitializer extends RuntimeClassDirectInitializer { };
// /**
//  * Note: only use is in implicitly defined copy constructor
//  */
// export class ArrayMemberInitializer extends Initializer {
//      // Note: this are not MemberSubobjectEntity since they might need to apply to a nested array inside an array member
//     public readonly target: ObjectEntity<BoundedArrayType>;
//     public readonly otherMember: ObjectEntity<BoundedArrayType>;
//     public readonly elementInitializers: DirectInitializer[] = [];
//     public constructor(context: TranslationUnitContext, target: ObjectEntity<BoundedArrayType>,
//                        otherMember: ObjectEntity<BoundedArrayType>) {
//         super(context);
//         this.target = target;
//         this.otherMember = otherMember;
//         let targetType = target.type;
//         for(let i = 0; i < targetType.length; ++i) {
//             let elemInit;
//             // COMMENTED BELOW BECAUSE MULTIDIMENSIONAL ARRAYS ARE NOT ALLOWED
//             // if (targetType.elemType instanceof BoundedArrayType) {
//             //     elemInit = new ArrayMemberInitializer(context,
//             //         new ArraySubobjectEntity(target, i),
//             //         new ArraySubobjectEntity(<ObjectEntity<BoundedArrayType<BoundedArrayType>>>otherMember, i));
//             // }
//             // else {
//                 elemInit = DirectInitializer.create(context,
//                     new ArraySubobjectEntity(target, i),
//                     [new EntityExpression(context, new ArraySubobjectEntity(otherMember, i))]);
//             // }
//             this.elementInitializers.push(elemInit);
//             this.attach(elemInit);
//             if(elemInit.hasErrors) {
//                 this.addNote(CPPError.declaration.init.array_direct_init(this));
//                 break;
//             }
//         }
//     }
//     public createRuntimeInitializer(this: CompiledArrayMemberInitializer, parent: RuntimeConstruct) {
//         return new RuntimeArrayMemberInitializer(this, parent);
//     }
//     public explain(sim: Simulation, rtConstruct: RuntimeConstruct) : Explanation {
//         let targetDesc = this.target.describe();
//         let targetType = this.target.type;
//         let otherMemberDesc = this.otherMember.describe();
//         if (targetType.length === 0) {
//             return {message: "No initialization is performed for " + (targetDesc.name || targetDesc.message) + "because the array has length 0."};
//         }
//         else {
//             return {message: "Each element of " + (targetDesc.name || targetDesc.message) + " will be default-initialized with the value of the"
//                 + "corresponding element of " + (otherMemberDesc.name || otherMemberDesc.message) + ". For example, " +
//                 this.elementInitializers[0].explain(sim, rtConstruct) };
//         }
//     }
// }
// export interface CompiledArrayMemberInitializer extends ArrayMemberInitializer, SuccessfullyCompiled {
//     readonly elementInitializers: CompiledDirectInitializer[];
// }
// export class RuntimeArrayMemberInitializer extends RuntimeInitializer<CompiledArrayMemberInitializer> {
//     public readonly target: CPPObject<BoundedArrayType>;
//     public readonly elementInitializers: RuntimeDirectInitializer[];
//     private index = 0;
//     public constructor (model: CompiledArrayMemberInitializer, parent: RuntimeConstruct) {
//         super(model, parent);
//         this.target = this.model.target.runtimeLookup(this);
//         this.elementInitializers = this.model.elementInitializers.map((elemInit) => {
//             return elemInit.createRuntimeInitializer(this);
//         });
//     }
//     protected upNextImpl() {
//         if (this.elementInitializers && this.index < this.elementInitializers.length) {
//             this.sim.push(this.elementInitializers[this.index++])
//         }
//         else {
//             this.observable.send("initialized", this.target);
//             this.sim.pop();
//         }
//     }
//     public stepForwardImpl() {
//         // do nothing
//     }
// }
// export var ParameterInitializer = CopyInitializer.extend({
//     _name : "ParameterInitializer",
//     explain : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var exp = ParameterInitializer._parent.explain.apply(this, arguments);
//         exp.message = exp.message + "\n\n(Parameter passing is done by copy-initialization.)";
//         return exp;
//     }
// });
// export var ReturnInitializer = CopyInitializer.extend({
//     _name : "ReturnInitializer",
//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct) {
//         // Need to handle return-by-reference differently, since there is no actual reference that
//         // gets bound. (The runtimeLookup for the return entity would yield null). Instead, we just
//         // set the return object for the enclosing function to the evaluated argument (which should
//         // have yielded an object).
//         if (isA(this.entity.type, Types.Reference)) {
//             inst.containingRuntimeFunction().setReturnValue(inst.childInstances.args[0].evalResult);
//             this.done(sim, inst);
//             return;
//         }
//         return ReturnInitializer._parent.stepForward.apply(this, arguments);
//     }
// });
// export var MemberInitializer = DirectInitializer.extend({
//     _name : "MemberInitializer",
//     isMemberInitializer: true
// });
// export var DefaultMemberInitializer = DefaultInitializer.extend({
//     _name : "DefaultMemberInitializer",
//     isMemberInitializer: true
// });
// export var NewDirectInitializer = DirectInitializer.extend({
//     _name : "NewDirectInitializer",
//     i_runtimeConstructClass : RuntimeNewInitializer
// });
// export var NewDefaultInitializer = DefaultInitializer.extend({
//     _name : "NewDefaultInitializer",
//     i_runtimeConstructClass : RuntimeNewInitializer
// });
// export var InitializerList = CPPConstruct.extend({
//     _name : "InitializerList",
//     init: function(ast, context) {
//         this.initParent(ast, context);
//         this.initializerListLength = ast.args.length;
//     },
//     compile : function(entity){
//         assert(entity, "Initializer context must specify entity to be initialized!");
//         this.i_entityToInitialize = entity;
//         var ast = this.ast;
//         var type = this.i_entityToInitialize.type;
//         if (!isA(type, Types.Array)){
//             this.addNote(CPPError.declaration.init.list_array(this));
//         }
//         else if (type.length !== ast.args.length){
//             this.addNote(CPPError.declaration.init.list_length(this, type.length));
//         }
//         if (this.hasErrors()){ return; }
//         var list = ast.args;
//         //this.initializerList = [];
//         this.i_childrenToExecute = [];
//         for(var i = 0; i < list.length; ++i){
//             var initListElem = this["arg"+i] = this.i_createAndCompileChildExpr(list[i], type.elemType);
//             this.i_childrenToExecute.push("arg"+i);
//             if(!sameType(initListElem.type, type.elemType)){
//                 this.addNote(CPPError.declaration.init.convert(initListElem, initListElem.type, type.elemType));
//             }
//             else if (initListElem.isNarrowingConversion){
//                 // TODO: as of now, still need to add code that identifies certain conversions as narrowing
//                 this.addNote(CPPError.declaration.init.list_narrowing(initListElem, initListElem.from.type, type.elemType));
//             }
//             //this.initializerList.push(initListElem);
//         }
//         return;
//     },
//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index !== "afterChildren"){
//             return;
//         }
//         var obj = this.i_entityToInitialize.runtimeLookup(sim, inst);
//         var arr = [];
//         for(var i = 0; i < this.initializerListLength; ++i){
//             arr[i] = inst.childInstances["arg"+i].evalResult.getValue();
//         }
//         obj.writeValue(arr);
//         inst.index = "done";
//         this.done(sim, inst);
//     }
// });
//# sourceMappingURL=initializers.js.map