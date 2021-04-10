"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeArrayAggregateInitializer = exports.ArrayAggregateInitializer = exports.RuntimeListInitializer = exports.ListInitializer = exports.RuntimeArrayMemberInitializer = exports.ArrayMemberInitializer = exports.RuntimeCtorInitializer = exports.CtorInitializer = exports.RuntimeClassDirectInitializer = exports.ClassDirectInitializer = exports.RuntimeArrayDirectInitializer = exports.ArrayDirectInitializer = exports.RuntimeAtomicDirectInitializer = exports.AtomicDirectInitializer = exports.RuntimeReferenceDirectInitializer = exports.ReferenceDirectInitializer = exports.RuntimeDirectInitializer = exports.DirectInitializer = exports.RuntimeClassValueInitializer = exports.ClassValueInitializer = exports.RuntimeArrayValueInitializer = exports.ArrayValueInitializer = exports.ReferenceValueInitializer = exports.RuntimeAtomicValueInitializer = exports.AtomicValueInitializer = exports.RuntimeValueInitializer = exports.ValueInitializer = exports.RuntimeClassDefaultInitializer = exports.ClassDefaultInitializer = exports.RuntimeArrayDefaultInitializer = exports.ArrayDefaultInitializer = exports.RuntimeAtomicDefaultInitializer = exports.AtomicDefaultInitializer = exports.ReferenceDefaultInitializer = exports.RuntimeDefaultInitializer = exports.DefaultInitializer = exports.RuntimeInitializer = exports.Initializer = void 0;
const constructs_1 = require("./constructs");
const PotentialFullExpression_1 = require("./PotentialFullExpression");
const FunctionCall_1 = require("./FunctionCall");
const expressions_1 = require("./expressions");
const entities_1 = require("./entities");
const types_1 = require("./types");
const util_1 = require("../util/util");
const errors_1 = require("./errors");
const expressionBase_1 = require("./expressionBase");
const codeOutlets_1 = require("../view/codeOutlets");
const runtimeEnvironment_1 = require("./runtimeEnvironment");
const opaqueExpression_1 = require("./opaqueExpression");
class Initializer extends PotentialFullExpression_1.PotentialFullExpression {
    isTailChild(child) {
        return { isTail: true };
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type;
        // TODO semantic equivalence
    }
}
exports.Initializer = Initializer;
class RuntimeInitializer extends PotentialFullExpression_1.RuntimePotentialFullExpression {
    constructor(model, parent) {
        super(model, "initializer", parent);
    }
}
exports.RuntimeInitializer = RuntimeInitializer;
class DefaultInitializer extends Initializer {
    constructor() {
        super(...arguments);
        this.kind = "default";
    }
    static create(context, target) {
        if (target.type.isReferenceType()) {
            return new ReferenceDefaultInitializer(context, target);
        }
        else if (target.type.isAtomicType()) {
            return new AtomicDefaultInitializer(context, target);
        }
        else if (target.type.isBoundedArrayType()) {
            return new ArrayDefaultInitializer(context, target);
        }
        else if (target.type.isCompleteClassType()) {
            return new ClassDefaultInitializer(context, target);
        }
        else {
            return util_1.assertNever(target.type);
        }
    }
}
exports.DefaultInitializer = DefaultInitializer;
class RuntimeDefaultInitializer extends RuntimeInitializer {
    constructor(model, parent) {
        super(model, parent);
    }
}
exports.RuntimeDefaultInitializer = RuntimeDefaultInitializer;
class ReferenceDefaultInitializer extends DefaultInitializer {
    constructor(context, target) {
        super(context, undefined);
        this.construct_type = "ReferenceDefaultInitializer";
        this.target = target;
        // Cannot default initialize a reference
        this.addNote(errors_1.CPPError.declaration.init.referenceBind(this));
    }
    createRuntimeInitializer(parent) {
        return util_1.assertFalse("A default initializer for a reference is not allowed.");
    }
    createDefaultOutlet(element, parent) {
        return util_1.assertFalse("Cannot create an outlet for a reference default initializer, since such an initializer is always ill-formed.");
    }
    explain(sim, rtConstruct) {
        let targetDesc = this.target.describe();
        return { message: "As a reference, " + (targetDesc.name || targetDesc.message) + " must be bound to something. (It cannot be left un-initialized.)" };
    }
}
exports.ReferenceDefaultInitializer = ReferenceDefaultInitializer;
// Note: No CompiledReferenceDefaultInitializer or RuntimeReferenceDefaultInitializer classes since
//       default initialization of a reference is always ill-formed.
class AtomicDefaultInitializer extends DefaultInitializer {
    constructor(context, target) {
        super(context, undefined);
        this.construct_type = "AtomicDefaultInitializer";
        this.target = target;
    }
    createRuntimeInitializer(parent) {
        return new RuntimeAtomicDefaultInitializer(this, parent);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.AtomicDefaultInitializerOutlet(element, this, parent);
    }
    explain(sim, rtConstruct) {
        let targetDesc = this.target.describe();
        return { message: "No initialization will take place. " + (targetDesc.name || targetDesc.message) + " will have a junk value." };
    }
}
exports.AtomicDefaultInitializer = AtomicDefaultInitializer;
class RuntimeAtomicDefaultInitializer extends RuntimeDefaultInitializer {
    constructor(model, parent) {
        super(model, parent);
    }
    upNextImpl() {
        // No initialization. Object has junk value.
        let target = this.model.target.runtimeLookup(this);
        target.beginLifetime();
        this.observable.send("atomicObjectInitialized", this);
        this.startCleanup();
    }
    stepForwardImpl() {
        // do nothing
    }
}
exports.RuntimeAtomicDefaultInitializer = RuntimeAtomicDefaultInitializer;
class ArrayDefaultInitializer extends DefaultInitializer {
    constructor(context, target) {
        super(context, undefined);
        this.construct_type = "ArrayDefaultInitializer";
        this.target = target;
        // If it's an array of atomic types, do nothing.
        let type = this.target.type;
        if (type.elemType instanceof types_1.AtomicType) {
            // Do nothing
            // TODO: should I create the DefaultInitializers anyway for analysis purposes?
        }
        else {
            this.elementInitializers = [];
            for (let i = 0; i < type.numElems; ++i) {
                let elemInit = DefaultInitializer.create(context, new entities_1.ArraySubobjectEntity(this.target, i));
                this.elementInitializers.push(elemInit);
                this.attach(elemInit);
                if (elemInit.notes.hasErrors) {
                    this.addNote(errors_1.CPPError.declaration.init.array_default_init(this));
                    break;
                }
            }
        }
    }
    createRuntimeInitializer(parent) {
        return new RuntimeArrayDefaultInitializer(this, parent);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.ArrayDefaultInitializerOutlet(element, this, parent);
    }
    explain(sim, rtConstruct) {
        let targetDesc = this.target.describe();
        let targetType = this.target.type;
        if (targetType.numElems === 0) {
            return { message: "No initialization is performed for " + (targetDesc.name || targetDesc.message) + "because the array has length 0." };
        }
        else if (targetType.elemType instanceof types_1.AtomicType) {
            return { message: "No initialization will take place. The elements of " + (targetDesc.name || targetDesc.message) + " will have junk values." };
        }
        else {
            return {
                message: "Each element of " + (targetDesc.name || targetDesc.message) + " will be default-initialized. For example, " +
                    this.elementInitializers[0].explain(sim, rtConstruct)
            };
        }
    }
}
exports.ArrayDefaultInitializer = ArrayDefaultInitializer;
class RuntimeArrayDefaultInitializer extends RuntimeDefaultInitializer {
    constructor(model, parent) {
        super(model, parent);
        this.index = 0;
        if (this.model.elementInitializers) {
            this.elementInitializers = this.model.elementInitializers.map((elemInit) => {
                return elemInit.createRuntimeInitializer(this);
            });
        }
    }
    upNextImpl() {
        if (this.elementInitializers && this.index < this.elementInitializers.length) {
            this.sim.push(this.elementInitializers[this.index++]);
        }
        else {
            let target = this.model.target.runtimeLookup(this);
            target.beginLifetime();
            this.observable.send("arrayObjectInitialized", this);
            this.startCleanup();
        }
    }
    stepForwardImpl() {
        // do nothing
    }
}
exports.RuntimeArrayDefaultInitializer = RuntimeArrayDefaultInitializer;
class ClassDefaultInitializer extends DefaultInitializer {
    constructor(context, target) {
        super(context, undefined);
        this.construct_type = "ClassDefaultInitializer";
        this.target = target;
        // Try to find default constructor. Not using lookup because constructors have no name.
        // TODO: do I need to tell overloadResolution what the receiver type is here? they're all ctors i guess
        let overloadResult = expressions_1.overloadResolution(target.type.classDefinition.constructors, []);
        if (!overloadResult.selected) {
            this.addNote(errors_1.CPPError.declaration.init.no_default_constructor(this, this.target));
            return;
        }
        this.ctor = overloadResult.selected;
        this.ctorCall = new FunctionCall_1.FunctionCall(context, this.ctor, [], target.type.cvUnqualified());
        this.attach(this.ctorCall);
        // this.args = this.ctorCall.args;
    }
    createRuntimeInitializer(parent) {
        return new RuntimeClassDefaultInitializer(this, parent);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.ClassDefaultInitializerOutlet(element, this, parent);
    }
    explain(sim, rtConstruct) {
        let targetDesc = this.target.describe();
        // TODO: what if there is an error that causes no ctor to be found/available
        return { message: (targetDesc.name || targetDesc.message) + " will be initialized using " + this.ctorCall.describe(sim, rtConstruct).message };
    }
}
exports.ClassDefaultInitializer = ClassDefaultInitializer;
class RuntimeClassDefaultInitializer extends RuntimeDefaultInitializer {
    constructor(model, parent) {
        super(model, parent);
        this.index = "callCtor";
        this.ctorCall = this.model.ctorCall.createRuntimeFunctionCall(this, this.model.target.runtimeLookup(this));
    }
    upNextImpl() {
        if (this.index === "callCtor") {
            this.sim.push(this.ctorCall);
            this.index = "done";
        }
        else {
            let target = this.model.target.runtimeLookup(this);
            target.beginLifetime();
            this.observable.send("classObjectInitialized", this);
            this.startCleanup();
        }
    }
    stepForwardImpl() {
        // do nothing
    }
}
exports.RuntimeClassDefaultInitializer = RuntimeClassDefaultInitializer;
class ValueInitializer extends Initializer {
    constructor() {
        super(...arguments);
        this.kind = "value";
    }
    static create(context, target) {
        if (target.type.isReferenceType()) {
            return new ReferenceValueInitializer(context, target);
        }
        else if (target.type.isAtomicType()) {
            return new AtomicValueInitializer(context, target);
        }
        else if (target.type.isBoundedArrayType()) {
            return new ArrayValueInitializer(context, target);
        }
        else if (target.type.isCompleteClassType()) {
            return new ClassValueInitializer(context, target);
        }
        else {
            return util_1.assertNever(target.type);
        }
    }
}
exports.ValueInitializer = ValueInitializer;
class RuntimeValueInitializer extends RuntimeInitializer {
    constructor(model, parent) {
        super(model, parent);
    }
}
exports.RuntimeValueInitializer = RuntimeValueInitializer;
// NOTE: NOT POSSIBLE TO VALUE-INITIALIZE A REFERENCE
class AtomicValueInitializer extends ValueInitializer {
    constructor(context, target) {
        super(context, undefined);
        this.construct_type = "AtomicValueInitializer";
        this.target = target;
    }
    createRuntimeInitializer(parent) {
        return new RuntimeAtomicValueInitializer(this, parent);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.AtomicValueInitializerOutlet(element, this, parent);
    }
    explain(sim, rtConstruct) {
        let targetDesc = this.target.describe();
        return { message: `${targetDesc.name || targetDesc.message} is "value-initialized" to the equivalent of a 0 value for its type.` };
    }
}
exports.AtomicValueInitializer = AtomicValueInitializer;
class RuntimeAtomicValueInitializer extends RuntimeValueInitializer {
    constructor(model, parent) {
        super(model, parent);
    }
    upNextImpl() {
        // Initialized to equivalent of 0 in target type
        let target = this.model.target.runtimeLookup(this);
        target.initializeValue(new runtimeEnvironment_1.Value(0, target.type));
        this.observable.send("atomicObjectInitialized", this);
        this.startCleanup();
    }
    stepForwardImpl() {
        // do nothing
    }
}
exports.RuntimeAtomicValueInitializer = RuntimeAtomicValueInitializer;
class ReferenceValueInitializer extends ValueInitializer {
    constructor(context, target) {
        super(context, undefined);
        this.construct_type = "ReferenceValueInitializer";
        this.target = target;
        // Cannot default initialize a reference
        this.addNote(errors_1.CPPError.declaration.init.referenceBind(this));
    }
    createRuntimeInitializer(parent) {
        return util_1.assertFalse("A default initializer for a reference is not allowed.");
    }
    createDefaultOutlet(element, parent) {
        return util_1.assertFalse("Cannot create an outlet for a reference default initializer, since such an initializer is always ill-formed.");
    }
    explain(sim, rtConstruct) {
        let targetDesc = this.target.describe();
        return { message: "As a reference, " + (targetDesc.name || targetDesc.message) + " must be bound to something. (It cannot be left un-initialized.)" };
    }
}
exports.ReferenceValueInitializer = ReferenceValueInitializer;
// Note: No CompiledReferenceValueInitializer or RuntimeReferenceValueInitializer classes since
//       default initialization of a reference is always ill-formed.
class ArrayValueInitializer extends ValueInitializer {
    constructor(context, target) {
        super(context, undefined);
        this.construct_type = "ArrayValueInitializer";
        this.target = target;
        // If it's an array of atomic types, do nothing.
        this.elementInitializers = [];
        for (let i = 0; i < target.type.numElems; ++i) {
            let elemInit = ValueInitializer.create(context, new entities_1.ArraySubobjectEntity(target, i));
            this.elementInitializers.push(elemInit);
            this.attach(elemInit);
            if (elemInit.notes.hasErrors) {
                this.addNote(errors_1.CPPError.declaration.init.array_value_init(this));
                break;
            }
        }
    }
    createRuntimeInitializer(parent) {
        return new RuntimeArrayValueInitializer(this, parent);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.ArrayValueInitializerOutlet(element, this, parent);
    }
    explain(sim, rtConstruct) {
        let targetDesc = this.target.describe();
        let targetType = this.target.type;
        if (targetType.numElems === 0) {
            return { message: "No initialization is performed for " + (targetDesc.name || targetDesc.message) + "because the array has length 0." };
        }
        else if (targetType.elemType instanceof types_1.AtomicType) {
            return { message: `The elements of ${targetDesc.name || targetDesc.message} will be "value-initialized" to the equivalent of a 0 value for their type.` };
        }
        else {
            return {
                message: "Each element of " + (targetDesc.name || targetDesc.message) + " will be value-initialized. For example, " +
                    this.elementInitializers[0].explain(sim, rtConstruct)
            };
        }
    }
}
exports.ArrayValueInitializer = ArrayValueInitializer;
class RuntimeArrayValueInitializer extends RuntimeValueInitializer {
    constructor(model, parent) {
        super(model, parent);
        this.index = 0;
        if (this.model.elementInitializers) {
            this.elementInitializers = this.model.elementInitializers.map((elemInit) => {
                return elemInit.createRuntimeInitializer(this);
            });
        }
    }
    upNextImpl() {
        if (this.elementInitializers && this.index < this.elementInitializers.length) {
            this.sim.push(this.elementInitializers[this.index++]);
        }
        else {
            let target = this.model.target.runtimeLookup(this);
            target.beginLifetime();
            this.observable.send("arrayObjectInitialized", this);
            this.startCleanup();
        }
    }
    stepForwardImpl() {
        // do nothing
    }
}
exports.RuntimeArrayValueInitializer = RuntimeArrayValueInitializer;
class ClassValueInitializer extends ValueInitializer {
    constructor(context, target) {
        super(context, undefined);
        this.construct_type = "ClassValueInitializer";
        this.target = target;
        // Try to find default constructor. Not using lookup because constructors have no name.
        // TODO: do I need to tell overloadResolution what the receiver type is here? they're all ctors i guess
        let overloadResult = expressions_1.overloadResolution(target.type.classDefinition.constructors, []);
        if (!overloadResult.selected) {
            this.addNote(errors_1.CPPError.declaration.init.no_default_constructor(this, this.target));
            return;
        }
        this.ctor = overloadResult.selected;
        this.ctorCall = new FunctionCall_1.FunctionCall(context, this.ctor, [], target.type.cvUnqualified());
        this.attach(this.ctorCall);
        // this.args = this.ctorCall.args;
    }
    createRuntimeInitializer(parent) {
        return new RuntimeClassValueInitializer(this, parent);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.ClassValueInitializerOutlet(element, this, parent);
    }
    explain(sim, rtConstruct) {
        let targetDesc = this.target.describe();
        // TODO: what if there is an error that causes no ctor to be found/available
        if (!this.ctor) {
            return { message: (targetDesc.name || targetDesc.message) + " cannot be initialized because the " + this.target.type + " class has no default constructor." };
        }
        else if (this.ctor.isImplicit) {
            return { message: (targetDesc.name || targetDesc.message) + " will be zero-initialized, followed by initialization using " + this.ctorCall.describe(sim, rtConstruct).message };
        }
        else {
            return { message: (targetDesc.name || targetDesc.message) + " will be initialized using " + this.ctorCall.describe(sim, rtConstruct).message };
        }
    }
}
exports.ClassValueInitializer = ClassValueInitializer;
class RuntimeClassValueInitializer extends RuntimeValueInitializer {
    constructor(model, parent) {
        super(model, parent);
        this.target = this.model.target.runtimeLookup(this);
        this.ctorCall = this.model.ctorCall.createRuntimeFunctionCall(this, this.target);
        this.index = this.model.ctor.isImplicit ? "zeroOut" : "callCtor";
    }
    upNextImpl() {
        if (this.index === "callCtor") {
            this.sim.push(this.ctorCall);
            this.index = "done";
        }
        else {
            let target = this.model.target.runtimeLookup(this);
            target.beginLifetime();
            this.observable.send("classObjectInitialized", this);
            this.startCleanup();
        }
    }
    stepForwardImpl() {
        if (this.index === "zeroOut") {
            this.target.zeroInitialize();
            this.index = "callCtor";
        }
    }
}
exports.RuntimeClassValueInitializer = RuntimeClassValueInitializer;
class DirectInitializer extends Initializer {
    constructor(context, kind) {
        super(context, undefined);
        this.kind = kind;
    }
    static create(context, target, args, kind) {
        if (target.type.isReferenceType()) { // check for presence of bindTo to detect reference entities
            return new ReferenceDirectInitializer(context, target, args, kind);
        }
        else if (target.type.isAtomicType()) {
            return new AtomicDirectInitializer(context, target, args, kind);
        }
        else if (target.type.isBoundedArrayType()) {
            return new ArrayDirectInitializer(context, target, args, kind);
        }
        else if (target.type.isCompleteClassType()) {
            return new ClassDirectInitializer(context, target, args, kind);
        }
        else {
            return util_1.assertNever(target.type);
        }
    }
}
exports.DirectInitializer = DirectInitializer;
class RuntimeDirectInitializer extends RuntimeInitializer {
    constructor(model, parent) {
        super(model, parent);
    }
}
exports.RuntimeDirectInitializer = RuntimeDirectInitializer;
class ReferenceDirectInitializer extends DirectInitializer {
    constructor(context, target, args, kind) {
        super(context, kind);
        this.construct_type = "ReferenceDirectInitializer";
        this.target = target;
        util_1.assert(args.length > 0, "Direct initialization must have at least one argument. (Otherwise it should be a default initialization.)");
        if (args.length > 1) {
            this.addNote(errors_1.CPPError.declaration.init.referenceBindMultiple(this));
            this.attachAll(this.args = args);
            return;
        }
        // Below this line, we can assume only one arg
        let arg = args[0];
        if (!arg.isWellTyped()) {
            this.attach(this.arg = arg);
            this.args = [arg];
            return;
        }
        let targetType = target.type;
        let isReferenceCompatible = types_1.referenceCompatible(arg.type, targetType);
        let isReferenceRelated = types_1.referenceRelated(arg.type, targetType);
        if (arg.valueCategory === "lvalue") {
            if (isReferenceCompatible) {
                // no further checking needed
            }
            else {
                if (isReferenceRelated) {
                    // If they are reference-related, the only thing preventing binding this
                    // reference was a matter of constness
                    this.addNote(errors_1.CPPError.declaration.init.referenceConstness(this, arg.type, targetType));
                }
                else {
                    // They are not reference-related, but a conversion and temporary might allow the
                    // binding if and only if the reference is const-qualified.
                    // For example (consts below are all necessary):
                    // int i = 2;
                    // const double &dr = i; // convert to int, apply temporary materialization
                    // const string &str = "hi"; // convert to string using ctor, apply temporary materialization
                    if (!targetType.refTo.isConst) {
                        // can't make non-const reference to a prvalue
                        this.addNote(errors_1.CPPError.declaration.init.referencePrvalueConst(this));
                    }
                    // Generic error for non-reference-compatible type
                    // Note that user-defined conversion functions might come into play here
                    this.addNote(errors_1.CPPError.declaration.init.referenceType(this, arg.type, targetType));
                }
            }
        }
        else { //arg.valueCategory === "prvalue"
            if (!targetType.refTo.isConst) {
                // can't make non-const reference to a prvalue
                this.addNote(errors_1.CPPError.declaration.init.referencePrvalueConst(this));
            }
            // can't bind to a prvalue. exception is that prvalues with class type must really be temporary objects
            // we'll allow this for now. note that the lifetimes don't get extended, which is still TODO
            else if (!arg.type.isCompleteClassType()) {
                this.addNote(errors_1.CPPError.lobster.referencePrvalue(this));
            }
        }
        this.attach(this.arg = arg);
        this.args = [arg];
    }
    createRuntimeInitializer(parent) {
        return new RuntimeReferenceDirectInitializer(this, parent);
    }
    createDefaultOutlet(element, parent) {
        return this.kind === "direct" ?
            new codeOutlets_1.ReferenceDirectInitializerOutlet(element, this, parent) :
            new codeOutlets_1.ReferenceCopyInitializerOutlet(element, this, parent);
    }
    explain(sim, rtConstruct) {
        let targetDesc = this.target.describe();
        let rhsDesc = this.args[0].describeEvalResult(0);
        return { message: (targetDesc.name || targetDesc.message) + " will be bound to " + (rhsDesc.name || rhsDesc.message) + "." };
    }
}
exports.ReferenceDirectInitializer = ReferenceDirectInitializer;
class RuntimeReferenceDirectInitializer extends RuntimeDirectInitializer {
    constructor(model, parent) {
        super(model, parent);
        this.alreadyPushed = false;
        this.arg = expressions_1.createRuntimeExpression(this.model.arg, this);
        this.args = [this.arg];
    }
    upNextImpl() {
        if (!this.alreadyPushed) {
            this.sim.push(this.arg);
            this.alreadyPushed = true;
        }
    }
    // private notifyPassing() {
    //     if (this.model.kind === "parameter") {
    //         this.observable.send("passByReference",
    //             {
    //                 target: <PassByReferenceParameterEntity<T>>this.model.target,
    //                 arg: this.arg
    //             });
    //     }
    //     else if (this.model.kind === "return") {
    //         this.observable.send("returnByReference",
    //             {
    //                 target: <ReturnByReferenceEntity<T>>this.model.target,
    //                 arg: this.arg
    //             });
    //     }
    // }
    stepForwardImpl() {
        this.model.target.bindTo(this, this.arg.evalResult); //TODO not sure at all why this cast is necessary
        // this.notifyPassing();
        this.observable.send("referenceInitialized", this);
        this.startCleanup();
    }
}
exports.RuntimeReferenceDirectInitializer = RuntimeReferenceDirectInitializer;
class AtomicDirectInitializer extends DirectInitializer {
    constructor(context, target, args, kind) {
        super(context, kind);
        this.construct_type = "AtomicDirectInitializer";
        this.target = target;
        let targetType = target.type;
        util_1.assert(args.length > 0, "Direct initialization must have at least one argument. (Otherwise it should be a default initialization.)");
        if (args.length > 1) {
            this.arg = args[0];
            this.attachAll(this.args = args);
            this.addNote(errors_1.CPPError.declaration.init.scalar_args(this, targetType));
            return;
        }
        let arg = args[0];
        //Attempt standard conversion to declared type, including lvalue to rvalue conversions
        if (!arg.isWellTyped()) {
            this.args = args;
            this.attach(this.arg = arg); // only need to attach this one, because we're guaranteed args.length === 1 at this point
            return;
        }
        let typedArg = expressions_1.standardConversion(arg, targetType);
        this.args = [typedArg];
        this.attach(this.arg = typedArg);
        if (!types_1.sameType(typedArg.type, targetType)) {
            this.addNote(errors_1.CPPError.declaration.init.convert(this, typedArg.type, targetType));
        }
        // TODO: need to check that the arg is a prvalue
    }
    createRuntimeInitializer(parent) {
        return new RuntimeAtomicDirectInitializer(this, parent);
    }
    createDefaultOutlet(element, parent) {
        return this.kind === "direct" ?
            new codeOutlets_1.AtomicDirectInitializerOutlet(element, this, parent) :
            new codeOutlets_1.AtomicCopyInitializerOutlet(element, this, parent);
    }
    // TODO; change explain everywhere to be separate between compile time and runtime constructs
    explain(sim, rtConstruct) {
        let targetDesc = this.target.runtimeLookup(rtConstruct).describe();
        let rhsDesc = this.args[0].describeEvalResult(0);
        return { message: (targetDesc.name || targetDesc.message) + " will be initialized with " + (rhsDesc.name || rhsDesc.message) + "." };
    }
}
exports.AtomicDirectInitializer = AtomicDirectInitializer;
class RuntimeAtomicDirectInitializer extends RuntimeDirectInitializer {
    constructor(model, parent) {
        super(model, parent);
        this.alreadyPushed = false;
        this.arg = expressions_1.createRuntimeExpression(this.model.arg, this);
        this.args = [this.arg];
    }
    upNextImpl() {
        if (!this.alreadyPushed) {
            this.sim.push(this.arg);
            this.alreadyPushed = true;
        }
    }
    // private notifyPassing() {
    //     if (this.model.kind === "parameter") {
    //     }
    //     else if (this.model.kind === "return") {
    //         this.observable.send("returnByAtomicValue",
    //             {
    //                 target: <ReturnObjectEntity<T>>this.model.target,
    //                 arg: this.arg
    //             });
    //     }
    // }
    stepForwardImpl() {
        let target = this.model.target.runtimeLookup(this);
        target.initializeValue(this.arg.evalResult);
        this.observable.send("atomicObjectInitialized", this);
        // this.notifyPassing();
        this.startCleanup();
    }
}
exports.RuntimeAtomicDirectInitializer = RuntimeAtomicDirectInitializer;
/**
 * Note: Only allowed use is to initialize a char array from a string literal, but this can readily be
 * created in the course of compiling a program if the code attempts to directly initialize an array. That's
 * desirable, because this class will give the appropriate error messages if it's anything other than a
 * char array initialized from a string literal.
 */
class ArrayDirectInitializer extends DirectInitializer {
    constructor(context, target, args, kind) {
        super(context, kind);
        this.construct_type = "ArrayDirectInitializer";
        this.target = target;
        this.args = args;
        args.forEach((a) => { this.attach(a); });
        // TS type system ensures target is array type, but need to check element type and that args are a single string literal
        let targetType = target.type;
        let firstArg = args[0];
        if (targetType.elemType.isType(types_1.Char) && args.length === 1 && firstArg.isStringLiteralExpression()) {
            this.arg = firstArg;
            if (firstArg.type.numElems > targetType.numElems) {
                this.addNote(errors_1.CPPError.declaration.init.stringLiteralLength(this, firstArg.type.numElems, targetType.numElems));
            }
        }
        else {
            this.addNote(errors_1.CPPError.declaration.init.array_string_literal(this, targetType));
        }
    }
    createRuntimeInitializer(parent) {
        return new RuntimeArrayDirectInitializer(this, parent);
    }
    createDefaultOutlet(element, parent) {
        return this.kind === "direct" ?
            new codeOutlets_1.AtomicDirectInitializerOutlet(element, this, parent) :
            new codeOutlets_1.AtomicCopyInitializerOutlet(element, this, parent);
    }
    // TODO; change explain everywhere to be separate between compile time and runtime constructs
    explain(sim, rtConstruct) {
        let targetDesc = this.target.runtimeLookup(rtConstruct).describe();
        let rhsDesc = this.args[0].describeEvalResult(0);
        return { message: (targetDesc.name || targetDesc.message) + " (a character array) will be initialized from the string literal " + rhsDesc + ". Remember that a null character is automatically appended!" };
    }
}
exports.ArrayDirectInitializer = ArrayDirectInitializer;
class RuntimeArrayDirectInitializer extends RuntimeDirectInitializer {
    constructor(model, parent) {
        super(model, parent);
        this.alreadyPushed = false;
        this.arg = expressions_1.createRuntimeExpression(this.model.arg, this);
        this.args = [this.arg];
    }
    upNextImpl() {
        if (!this.alreadyPushed) {
            this.sim.push(this.arg);
            this.alreadyPushed = true;
        }
    }
    stepForwardImpl() {
        let target = this.model.target.runtimeLookup(this);
        let charsToWrite = this.arg.evalResult.getValue();
        // pad with zeros
        while (charsToWrite.length < target.type.numElems) {
            charsToWrite.push(types_1.Char.NULL_CHAR);
        }
        let arrayElemSubobjects = target.getArrayElemSubobjects();
        // should be true if compilation was successful
        util_1.assert(charsToWrite.length == arrayElemSubobjects.length);
        charsToWrite.forEach((c, i) => arrayElemSubobjects[i].initializeValue(c));
        target.beginLifetime();
        this.observable.send("arrayObjectInitialized", this);
        this.startCleanup();
    }
}
exports.RuntimeArrayDirectInitializer = RuntimeArrayDirectInitializer;
// export class ClassDefaultInitializer extends DefaultInitializer {
//     public readonly construct_type = "ClassDefaultInitializer";
//     public readonly target: ObjectEntity<CompleteClassType>;
//     public readonly ctor?: FunctionEntity;
//     public readonly ctorCall?: FunctionCall;
//     public constructor(context: TranslationUnitContext, target: ObjectEntity<CompleteClassType>) {
//         super(context, undefined);
//         this.target = target;
//         // Try to find default constructor. Not using lookup because constructors have no name.
//         let overloadResult = overloadResolution(target.type.classDefinition.constructors, []);
//         if (!overloadResult.selected) {
//             this.addNote(CPPError.declaration.init.no_default_constructor(this, this.target));
//             return;
//         }
//         this.ctor = overloadResult.selected;
//         this.ctorCall = new FunctionCall(context, this.ctor, [], this.target);
//         this.attach(this.ctorCall);
//         // this.args = this.ctorCall.args;
//     }
//     public createRuntimeInitializer<T extends CompleteClassType>(this: CompiledClassDefaultInitializer<T>, parent: RuntimeConstruct) : RuntimeClassDefaultInitializer<T>;
//     public createRuntimeInitializer<T extends ObjectType>(this: CompiledDefaultInitializer<T>, parent: RuntimeConstruct) : never;
//     public createRuntimeInitializer<T extends CompleteClassType>(this: CompiledClassDefaultInitializer<T>, parent: RuntimeConstruct) : RuntimeClassDefaultInitializer<T> {
//         return new RuntimeClassDefaultInitializer(this, parent);
//     }
//     public createDefaultOutlet(this: CompiledClassDefaultInitializer, element: JQuery, parent?: ConstructOutlet): ClassDefaultInitializerOutlet {
//         return new ClassDefaultInitializerOutlet(element, this, parent);
//     }
//     public explain(sim: Simulation, rtConstruct: RuntimeConstruct) {
//         let targetDesc = this.target.describe();
//         // TODO: what if there is an error that causes no ctor to be found/available
//         return {message: (targetDesc.name || targetDesc.message) + " will be initialized using " + this.ctorCall!.describe(sim, rtConstruct).message};
//     }
// }
// export interface CompiledClassDefaultInitializer<T extends CompleteClassType = CompleteClassType> extends ClassDefaultInitializer, SuccessfullyCompiled {
//     readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
//     readonly target: ObjectEntity<T>;
//     readonly ctor: FunctionEntity<FunctionType<VoidType>>;
//     readonly ctorCall: CompiledFunctionCall<FunctionType<VoidType>>;
// }
class ClassDirectInitializer extends DirectInitializer {
    constructor(context, target, args, kind) {
        super(context, kind);
        this.construct_type = "ClassDirectInitializer";
        this.target = target;
        util_1.assert(args.length > 0, "Direct initialization must have at least one argument. (Otherwise it should be a default initialization.)");
        // If any arguments are not well typed, we can't select a constructor
        if (!expressionBase_1.allWellTyped(args)) {
            this.attachAll(this.args = args);
            // ctor and ctorCall remain undefined
            return;
        }
        // Try to find a matching constructor. Not using lookup because constructors have no name.
        let argTypes = args.map(arg => arg.type);
        let overloadResult = expressions_1.overloadResolution(target.type.classDefinition.constructors, argTypes);
        if (!overloadResult.selected) {
            this.addNote(errors_1.CPPError.declaration.init.matching_constructor(this, this.target, argTypes));
            this.attachAll(this.args = args);
            return;
        }
        this.ctor = overloadResult.selected;
        this.ctorCall = new FunctionCall_1.FunctionCall(context, this.ctor, args, target.type.cvUnqualified());
        this.attach(this.ctorCall);
        this.args = this.ctorCall.args;
    }
    createRuntimeInitializer(parent) {
        return new RuntimeClassDirectInitializer(this, parent);
    }
    createDefaultOutlet(element, parent) {
        return this.kind === "direct" ?
            new codeOutlets_1.ClassDirectInitializerOutlet(element, this, parent) :
            new codeOutlets_1.ClassCopyInitializerOutlet(element, this, parent);
    }
    // TODO; change explain everywhere to be separate between compile time and runtime constructs
    explain(sim, rtConstruct) {
        let targetDesc = this.target.runtimeLookup(rtConstruct).describe();
        let rhsDesc = this.args[0].describeEvalResult(0);
        return { message: (targetDesc.name || targetDesc.message) + " will be initialized with " + (rhsDesc.name || rhsDesc.message) + "." };
    }
}
exports.ClassDirectInitializer = ClassDirectInitializer;
class RuntimeClassDirectInitializer extends RuntimeDirectInitializer {
    constructor(model, parent) {
        super(model, parent);
        this.index = "callCtor";
    }
    upNextImpl() {
        if (this.index === "callCtor") {
            this.ctorCall = this.model.ctorCall.createRuntimeFunctionCall(this, this.model.target.runtimeLookup(this));
            this.sim.push(this.ctorCall);
            this.index = "done";
        }
        else {
            let target = this.model.target.runtimeLookup(this);
            target.beginLifetime();
            this.observable.send("classObjectInitialized", this);
            this.startCleanup();
        }
    }
    stepForwardImpl() {
        // do nothing
    }
}
exports.RuntimeClassDirectInitializer = RuntimeClassDirectInitializer;
class CtorInitializer extends constructs_1.BasicCPPConstruct {
    constructor(context, ast, components) {
        var _a, _b;
        super(context, ast);
        this.construct_type = "ctor_initializer";
        this.memberInitializers = [];
        this.memberInitializersByName = {};
        let receiverType = context.contextualReceiverType;
        this.target = new entities_1.ReceiverEntity(receiverType);
        let baseType = receiverType.classDefinition.baseType;
        util_1.assert(context.containingFunction.firstDeclaration.isConstructor);
        // Initial processing of ctor initializer components list
        for (let i = 0; i < components.length; ++i) {
            let comp = components[i];
            if (comp.kind === "delegatedConstructor") {
                let delegatedCtor = comp.args.length === 0
                    ? new ClassValueInitializer(context, this.target)
                    : new ClassDirectInitializer(context, this.target, comp.args, "direct");
                this.attach(delegatedCtor);
                if (this.delegatedConstructorInitializer) {
                    delegatedCtor.addNote(errors_1.CPPError.declaration.ctor.init.multiple_delegates(delegatedCtor));
                }
                else {
                    this.delegatedConstructorInitializer = delegatedCtor;
                    if (components.length > 1) {
                        // If there's a delegating constructor call, no other initializers are allowed
                        delegatedCtor.addNote(errors_1.CPPError.declaration.ctor.init.delegate_only(delegatedCtor));
                    }
                }
            }
            else if (comp.kind === "base") {
                // Theoretically we shouldn't have a base init provided if
                // there wasn't a base class to match the name of the init against
                util_1.assert(baseType);
                let baseInit = comp.args.length === 0
                    ? new ClassValueInitializer(context, new entities_1.BaseSubobjectEntity(this.target, baseType))
                    : new ClassDirectInitializer(context, new entities_1.BaseSubobjectEntity(this.target, baseType), comp.args, "direct");
                this.attach(baseInit);
                if (!this.baseInitializer) {
                    this.baseInitializer = baseInit;
                }
                else {
                    baseInit.addNote(errors_1.CPPError.declaration.ctor.init.multiple_base_inits(baseInit));
                }
            }
            else {
                let memName = comp.name;
                let memEntity = receiverType.classDefinition.memberVariableEntitiesByName[memName];
                if (memEntity) {
                    let memInit;
                    if (memEntity.isTyped(types_1.isBoundedArrayType) && comp.args.length === 1) {
                        let arg = comp.args[0];
                        if (arg.construct_type === "dot_expression"
                            && ((_a = arg.entity) === null || _a === void 0 ? void 0 : _a.declarationKind) === "variable"
                            && arg.entity.variableKind === "object"
                            && ((_b = arg.entity) === null || _b === void 0 ? void 0 : _b.isTyped(types_1.isBoundedArrayType))) {
                            // if it's e.g. of the form "other.arr"
                            memInit = new ArrayMemberInitializer(context, memEntity, arg.entity);
                        }
                    }
                    if (!memInit) {
                        memInit = comp.args.length === 0
                            ? ValueInitializer.create(context, memEntity)
                            : DirectInitializer.create(context, memEntity, comp.args, "direct");
                    }
                    this.attach(memInit);
                    if (!this.memberInitializersByName[memName]) {
                        this.memberInitializersByName[memName] = memInit;
                    }
                    else {
                        this.addNote(errors_1.CPPError.declaration.ctor.init.multiple_member_inits(this));
                    }
                }
                else {
                    this.addNote(errors_1.CPPError.declaration.ctor.init.improper_name(this, receiverType, memName));
                }
            }
        }
        // If there's a base class and no explicit base initializer, add a default one
        if (baseType && !this.baseInitializer) {
            this.baseInitializer = new ClassDefaultInitializer(constructs_1.createImplicitContext(context), new entities_1.BaseSubobjectEntity(this.target, baseType));
            this.attach(this.baseInitializer);
        }
        receiverType.classDefinition.memberVariableEntities.forEach(memEntity => {
            let memName = memEntity.name;
            let memInit = this.memberInitializersByName[memName];
            // If there wasn't an explicit initializer, we need to provide a default one
            if (!memInit) {
                memInit = DefaultInitializer.create(context, memEntity);
                this.attach(memInit);
                this.memberInitializersByName[memName] = memInit;
            }
            // Add to list of member initializers in order (same order as entities/declarations in class def)
            util_1.asMutable(this.memberInitializers).push(memInit);
        });
        // TODO out of order warnings
    }
    static createFromAST(ast, context) {
        return new CtorInitializer(context, ast, ast.initializers.map(memInitAST => {
            let receiverType = context.contextualReceiverType;
            let baseType = receiverType.classDefinition.baseType;
            let memName = memInitAST.member.identifier;
            let args = memInitAST.args.map(argAST => expressions_1.createExpressionFromAST(argAST, context));
            if (memName === receiverType.className) {
                return {
                    kind: "delegatedConstructor",
                    args: args
                };
            }
            else if (baseType && memName === baseType.className) {
                return {
                    kind: "base",
                    args: args
                };
            }
            else {
                return {
                    kind: "member",
                    name: memName,
                    args: args
                };
            }
        }));
    }
    createRuntimeCtorInitializer(parent) {
        return new RuntimeCtorInitializer(this, parent);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.CtorInitializerOutlet(element, this, parent);
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type;
        // TODO semantic equivalence
    }
}
exports.CtorInitializer = CtorInitializer;
const INDEX_CTOR_INITIALIZER_DELEGATE = 0;
const INDEX_CTOR_INITIALIZER_BASE = 1;
const INDEX_CTOR_INITIALIZER_MEMBERS = 2;
class RuntimeCtorInitializer extends constructs_1.RuntimeConstruct {
    constructor(model, parent) {
        var _a, _b, _c;
        super(model, "ctor-initializer", parent);
        this.memberIndex = 0;
        this.delegatedConstructorInitializer = (_a = this.model.delegatedConstructorInitializer) === null || _a === void 0 ? void 0 : _a.createRuntimeInitializer(this);
        // Dummy ternary needed by type system due to union and this parameter shenanagins
        this.baseInitializer = this.model.baseInitializer instanceof ClassDefaultInitializer ?
            (_b = this.model.baseInitializer) === null || _b === void 0 ? void 0 : _b.createRuntimeInitializer(this) :
            (_c = this.model.baseInitializer) === null || _c === void 0 ? void 0 : _c.createRuntimeInitializer(this);
        // Dummy ternary needed by type system due to union and this parameter shenanagins
        this.memberInitializers = this.model.memberInitializers.map(memInit => memInit instanceof DefaultInitializer ?
            memInit.createRuntimeInitializer(this) :
            memInit.createRuntimeInitializer(this));
        if (this.delegatedConstructorInitializer) {
            this.index = INDEX_CTOR_INITIALIZER_DELEGATE;
        }
        else if (this.baseInitializer) {
            this.index = INDEX_CTOR_INITIALIZER_BASE;
        }
        else {
            this.index = INDEX_CTOR_INITIALIZER_MEMBERS;
        }
    }
    upNextImpl() {
        if (this.index === INDEX_CTOR_INITIALIZER_DELEGATE) {
            // Non-null assertion due to the way index is set in constructor above
            this.sim.push(this.delegatedConstructorInitializer);
            if (this.baseInitializer) {
                this.index = INDEX_CTOR_INITIALIZER_BASE;
            }
            else {
                this.index = INDEX_CTOR_INITIALIZER_MEMBERS;
            }
        }
        else if (this.index === INDEX_CTOR_INITIALIZER_BASE) {
            // Non-null assertion due to the way index is set in constructor above
            this.sim.push(this.baseInitializer);
            this.index = INDEX_CTOR_INITIALIZER_MEMBERS;
        }
        else {
            if (this.memberIndex < this.memberInitializers.length) {
                this.sim.push(this.memberInitializers[this.memberIndex++]);
            }
            else {
                this.startCleanup();
            }
        }
    }
    stepForwardImpl() {
        // do nothing
    }
}
exports.RuntimeCtorInitializer = RuntimeCtorInitializer;
// export var ConstructorDefinition = FunctionDefinition.extend({
//     _name: "ConstructorDefinition",
//     i_childrenToExecute: ["memberInitializers", "body"], // TODO: why do regular functions have member initializers??
//     instance : function(ast, context){
//         assert(context);
//         assert(isA(context.containingClass, Types.Class));
//         assert(context.hasOwnProperty("access"));
//         // Make sure it's actually a constructor
//         if (ast.name.identifier !== context.containingClass.className){
//             // oops was actually a function with missing return type
//             return FunctionDefinition.instance(ast, context);
//         }
//         return ConstructorDefinition._parent.instance.apply(this, arguments);
//     },
//     compileDeclaration : function() {
//         FunctionDefinition.compileDeclaration.apply(this, arguments);
//         if (!this.hasErrors()){
//             this.i_containingClass.addConstructor(this.entity);
//         }
//     },
//     compileDeclarator : function(){
//         var ast = this.ast;
//         // NOTE: a constructor doesn't have a "name", and so we don't need to add it to any scope.
//         // However, to make lookup easier, we give all constructors their class name plus the null character. LOL
//         // TODO: this is silly. remove it pls :)
//         this.name = this.i_containingClass.className + "\0";
//         // Compile the parameters
//         var args = this.ast.args;
//         this.params = [];
//         this.paramTypes = [];
//         for (var j = 0; j < args.length; ++j) {
//             var paramDecl = Parameter.instance(args[j], {parent: this, scope: this.bodyScope});
//             paramDecl.compile();
//             this.params.push(paramDecl);
//             this.paramTypes.push(paramDecl.type);
//         }
//         this.isDefaultConstructor = this.params.length == 0;
//         this.isCopyConstructor = this.params.length == 1
//         && (isA(this.paramTypes[0], this.i_containingClass) ||
//         isA(this.paramTypes[0], Types.Reference) && isA(this.paramTypes[0].refTo, this.i_containingClass));
//         // Give error for copy constructor that passes by value
//         if (this.isCopyConstructor && isA(this.paramTypes[0], this.i_containingClass)){
//             this.addNote(CPPError.declaration.ctor.copy.pass_by_value(this.params[0], this.paramTypes[0], this.params[0].name));
//         }
//         // I know this is technically wrong but I think it makes things run smoother
//         this.type = Types.Function.instance(Types.Void.instance(), this.paramTypes);
//     },
//     compileDefinition : function(){
//         var self = this;
//         var ast = this.ast;
//         if (!ast.body){
//             this.addNote(CPPError.class_def.ctor_def(this));
//             return;
//         }
//         this.compileCtorInitializer();
//         // Call parent class version. Will handle body, automatic object destruction, etc.
//         FunctionDefinition.compileDefinition.apply(this, arguments);
//     },
//     compileCtorInitializer : function(){
//         var memInits = this.ast.initializer || [];
//         // First, check to see if this is a delegating constructor.
//         // TODO: check on whether someone could techinically declare a member variable with the same name
//         // as the class and how that affects the logic here.
//         var targetConstructor = null;
//         for(var i = 0; i < memInits.length; ++i){
//             if (memInits[i].member.identifier == this.i_containingClass.className){
//                 targetConstructor = i;
//                 break;
//             }
//         }
//         // It is a delegating constructor
//         if (targetConstructor !== null){
//             targetConstructor = memInits.splice(targetConstructor, 1)[0];
//             // If it is a delegating constructor, there can be no other memInits
//             if (memInits.length === 0){ // should be 0 since one removed
//                 var mem = MemberInitializer.instance(targetConstructor, {parent: this, scope: this.bodyScope});
//                 mem.compile(ReceiverEntity.instance(this.i_containingClass));
//                 this.memberInitializers.push(mem);
//             }
//             else{
//                 this.addNote(CPPError.declaration.ctor.init.delegating_only(this));
//             }
//             return;
//         }
//         // It is a non-delegating constructor
//         // If there is a base class subobject, initialize it
//         var base;
//         if (base = this.i_containingClass.getBaseClass()){
//             // Check to see if there is a base class initializer.
//             var baseInits = memInits.filter(function(memInit){
//                 return memInit.member.identifier === base.className;
//             });
//             memInits = memInits.filter(function(memInit){
//                 return memInit.member.identifier !== base.className;
//             });
//             if (baseInits.length > 1){
//                 this.addNote(CPPError.declaration.ctor.init.multiple_base_inits(this));
//             }
//             else if (baseInits.length === 1){
//                 var mem = MemberInitializer.instance(baseInits[0], {parent: this, scope: this.bodyScope});
//                 mem.compile(this.i_containingClass.baseClassEntities[0]);
//                 this.memberInitializers.push(mem);
//             }
//             else{
//                 var mem = DefaultMemberInitializer.instance(this.ast, {parent: this, scope: this.bodyScope});
//                 mem.compile(this.i_containingClass.baseClassEntities[0]);
//                 this.memberInitializers.push(mem);
//                 mem.isMemberInitializer = true;
//             }
//         }
//         // Initialize non-static data members of the class
//         // Create a map of name to initializer. Initially all initializers are null.
//         var initMap = {};
//         this.i_containingClass.memberSubobjectEntities.forEach(function(objMember){
//             initMap[objMember.name] = objMember;
//         });
//         // Iterate through all the member initializers and associate them with appropriate member
//         for(var i = 0; i < memInits.length; ++i){
//             var memInit = memInits[i];
//             // Make sure this type has a member of the given name
//             var memberName = memInit.member.identifier;
//             if (initMap.hasOwnProperty(memberName)) {
//                 var mem = MemberInitializer.instance(memInit, {parent: this, scope: this.bodyScope});
//                 mem.compile(initMap[memberName]);
//                 initMap[memberName] = mem;
//             }
//             else{
//                 this.addNote(CPPError.declaration.ctor.init.improper_member(this, this.i_containingClass, memberName));
//             }
//         }
//         // Now iterate through members again in declaration order. Add associated member initializer
//         // from above or default initializer if there wasn't one.
//         var self = this;
//         this.i_containingClass.memberSubobjectEntities.forEach(function(objMember){
//             if (isA(initMap[objMember.name], MemberInitializer)){
//                 self.memberInitializers.push(initMap[objMember.name]);
//             }
//             else if (isA(objMember.type, Types.Class) || isA(objMember.type, Types.Array)){
//                 var mem = DefaultMemberInitializer.instance(self.ast, {parent: self, scope: self.bodyScope});
//                 mem.compile(objMember);
//                 self.memberInitializers.push(mem);
//                 mem.isMemberInitializer = true;
//             }
//             else{
//                 // No need to do anything for non-class types since default initialization does nothing
//             }
//         });
//     },
//     isTailChild : function(child){
//         return {isTail: false};
//     },
//     describe : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var desc = {};
//         if (this.isDefaultConstructor){
//             desc.message = "the default constructor for the " + this.i_containingClass.className + " class";
//         }
//         else if (this.isCopyConstructor){
//             desc.message = "the copy constructor for the " + this.i_containingClass.className + " class";
//         }
//         else{
//             desc.message = "a constructor for the " + this.i_containingClass.className + " class";
//         }
//         return desc
//     }
// });
// TODO: These should really be "class aliases" rather than derived classes, however
// it doesn't seem like Typescript has any proper mechanism for this.
// export abstract class CopyInitializer extends DirectInitializer { };
// export interface CompiledCopyInitializer<T extends ObjectType = ObjectType> extends CompiledDirectInitializer<T> { };
// export abstract class RuntimeCopyInitializer extends RuntimeDirectInitializer { };
// export class ReferenceCopyInitializer extends ReferenceDirectInitializer { };
// export interface CompiledReferenceCopyInitializer<T extends ObjectType = ObjectType> extends CompiledReferenceDirectInitializer<T> { };
// export class RuntimeReferenceCopyInitializer extends RuntimeReferenceDirectInitializer { };
// export class AtomicCopyInitializer extends AtomicDirectInitializer { };
// export interface CompiledAtomicCopyInitializer<T extends AtomicType = AtomicType> extends CompiledAtomicDirectInitializer<T> { };
// export class RuntimeAtomicCopyInitializer extends RuntimeAtomicDirectInitializer { };
// export class ArrayCopyInitializer extends ArrayDirectInitializer { };
// export class RuntimeArrayCopyInitializer extends RuntimeArrayDirectInitializer { };
// export class ClassCopyInitializer extends ClassDirectInitializer { };
// export class RuntimeClassCopyInitializer extends RuntimeClassDirectInitializer { };
/**
 * Note: only use is in implicitly defined copy constructor
 */
class ArrayMemberInitializer extends Initializer {
    constructor(context, target, otherMember) {
        super(context, undefined);
        this.construct_type = "array_member_initializer";
        this.kind = "direct";
        this.elementInitializers = [];
        this.target = target;
        this.otherMember = otherMember;
        let targetType = target.type;
        for (let i = 0; i < targetType.numElems; ++i) {
            // let elemInit;
            // COMMENTED BELOW BECAUSE MULTIDIMENSIONAL ARRAYS ARE NOT ALLOWED
            // if (targetType.elemType instanceof BoundedArrayType) {
            //     elemInit = new ArrayMemberInitializer(context,
            //         new ArraySubobjectEntity(target, i),
            //         new ArraySubobjectEntity(<ObjectEntity<BoundedArrayType<BoundedArrayType>>>otherMember, i));
            // }
            // else {
            let otherEntity = new entities_1.ArraySubobjectEntity(otherMember, i);
            let elemInit = DirectInitializer.create(context, new entities_1.ArraySubobjectEntity(target, i), [
                new opaqueExpression_1.OpaqueExpression(context, {
                    type: otherEntity.type,
                    valueCategory: "lvalue",
                    operate: (rt) => otherEntity.runtimeLookup(rt)
                })
            ], 
            // [new EntityExpression(context, new ArraySubobjectEntity(otherMember, i))],
            "direct");
            // }
            this.elementInitializers.push(elemInit);
            this.attach(elemInit);
            if (!elemInit.isSuccessfullyCompiled()) {
                this.addNote(errors_1.CPPError.declaration.init.array_direct_init(this));
                break;
            }
        }
    }
    createRuntimeInitializer(parent) {
        return new RuntimeArrayMemberInitializer(this, parent);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.ArrayMemberInitializerOutlet(element, this, parent);
    }
}
exports.ArrayMemberInitializer = ArrayMemberInitializer;
class RuntimeArrayMemberInitializer extends RuntimeInitializer {
    constructor(model, parent) {
        super(model, parent);
        this.index = 0;
        this.elementInitializers = this.model.elementInitializers.map((elemInit) => {
            return elemInit.createRuntimeInitializer(this);
        });
    }
    upNextImpl() {
        if (this.elementInitializers && this.index < this.elementInitializers.length) {
            this.sim.push(this.elementInitializers[this.index++]);
        }
        else {
            let target = this.model.target.runtimeLookup(this);
            target.beginLifetime();
            this.observable.send("arrayObjectInitialized", this);
            this.startCleanup();
        }
    }
    stepForwardImpl() {
        // do nothing
    }
}
exports.RuntimeArrayMemberInitializer = RuntimeArrayMemberInitializer;
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
class ListInitializer extends Initializer {
    static create(context, target, args) {
        if (target.type.isReferenceType()) { // check for presence of bindTo to detect reference entities
            return new constructs_1.InvalidConstruct(context, undefined, errors_1.CPPError.declaration.init.list_reference_prohibited, args);
        }
        else if (target.type.isAtomicType()) {
            return new constructs_1.InvalidConstruct(context, undefined, errors_1.CPPError.declaration.init.list_atomic_prohibited, args);
        }
        else if (target.type.isBoundedArrayType()) {
            return new ArrayAggregateInitializer(context, target, args);
        }
        else if (target.type.isCompleteClassType()) {
            if (target.type.isAggregate()) {
                return new constructs_1.InvalidConstruct(context, undefined, errors_1.CPPError.declaration.init.aggregate_unsupported, args);
            }
            let initializerList = new expressions_1.InitializerListExpression(context, undefined, args);
            return new ClassDirectInitializer(context, target, [initializerList], "direct");
        }
        else {
            return util_1.assertNever(target.type);
        }
    }
    constructor(context) {
        super(context, undefined);
    }
}
exports.ListInitializer = ListInitializer;
class RuntimeListInitializer extends RuntimeInitializer {
    constructor(model, parent) {
        super(model, parent);
    }
}
exports.RuntimeListInitializer = RuntimeListInitializer;
class ArrayAggregateInitializer extends ListInitializer {
    constructor(context, target, args) {
        super(context);
        this.construct_type = "ArrayAggregateInitializer";
        this.kind = "list";
        this.target = target;
        let arraySize = target.type.numElems;
        if (args.length > arraySize) {
            // TODO: this seems like a weird error to give. why not something more specific?
            this.addNote(errors_1.CPPError.param.numParams(this));
            // No need to bail out, though. We can still generate initializers
            // for all of the arguments that do correspond to an in-bounds element.
        }
        // Note that the args are NOT attached as children to the array aggregate initializer.
        // Instead, they are attached to the initializers.
        // Create initializers for each explicitly-initialized element
        this.explicitElemInitializers = args.map((arg, i) => DirectInitializer.create(context, new entities_1.ArraySubobjectEntity(target, i), [arg], "copy"));
        let remainingElemInits = [];
        for (let i = args.length; i < arraySize; ++i) {
            remainingElemInits.push(ValueInitializer.create(context, new entities_1.ArraySubobjectEntity(target, i)));
        }
        this.implicitElemInitializers = remainingElemInits;
        this.elemInitializers = [];
        this.elemInitializers = this.elemInitializers.concat(this.explicitElemInitializers, this.implicitElemInitializers);
        this.attachAll(this.elemInitializers);
        // An array with all the final arguments (after conversions) for the explicitly-initialized array elements
        this.args = this.explicitElemInitializers.map(elemInit => elemInit.args[0]);
    }
    createRuntimeInitializer(parent) {
        return new RuntimeArrayAggregateInitializer(this, parent);
    }
    createDefaultOutlet(element, parent) {
        return new codeOutlets_1.ArrayAggregateInitializerOutlet(element, this, parent);
    }
    // TODO; change explain everywhere to be separate between compile time and runtime constructs
    explain(sim, rtConstruct) {
        let targetDesc = this.target.runtimeLookup(rtConstruct).describe();
        let rhsDesc = this.args[0].describeEvalResult(0);
        return { message: (targetDesc.name || targetDesc.message) + " will be initialized with " + (rhsDesc.name || rhsDesc.message) + "." };
    }
}
exports.ArrayAggregateInitializer = ArrayAggregateInitializer;
class RuntimeArrayAggregateInitializer extends RuntimeListInitializer {
    constructor(model, parent) {
        super(model, parent);
        this.index = 0;
        // Create argument initializer instances
        this.explicitElemInitializers = this.model.explicitElemInitializers.map(init => init.createRuntimeInitializer(this));
        this.implicitElemInitializers = this.model.implicitElemInitializers.map(init => init.createRuntimeInitializer(this));
        this.elemInitializers = [];
        this.elemInitializers = this.elemInitializers.concat(this.explicitElemInitializers, this.implicitElemInitializers);
    }
    upNextImpl() {
        if (this.index < this.model.elemInitializers.length) {
            this.sim.push(this.elemInitializers[this.index++]);
        }
        else {
            let target = this.model.target.runtimeLookup(this);
            this.observable.send("arrayObjectInitialized", this);
            this.startCleanup();
        }
    }
    stepForwardImpl() {
        // do nothing
    }
}
exports.RuntimeArrayAggregateInitializer = RuntimeArrayAggregateInitializer;
//# sourceMappingURL=initializers.js.map