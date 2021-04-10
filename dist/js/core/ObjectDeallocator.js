"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMemberDeallocator = exports.createArrayDeallocator = exports.createStaticDeallocator = exports.createLocalDeallocator = exports.RuntimeObjectDeallocator = exports.ObjectDeallocator = void 0;
const constructs_1 = require("./constructs");
const errors_1 = require("./errors");
const types_1 = require("./types");
const entities_1 = require("./entities");
const util_1 = require("../util/util");
const FunctionCall_1 = require("./FunctionCall");
class ObjectDeallocator extends constructs_1.BasicCPPConstruct {
    constructor(context, targets) {
        super(context, undefined); // Has no AST
        this.construct_type = "ObjectDeallocator";
        this.objectTargets = targets.filter(t => t.variableKind === "object");
        this.referenceTargets = targets.filter(t => t.variableKind === "reference");
        this.compoundCleanupConstructs = this.objectTargets.map((obj) => {
            if (obj.isTyped(types_1.isCompleteClassType)) {
                // If it's a class type object, we need to call its destructor
                let dtor = obj.type.classDefinition.destructor;
                if (dtor) {
                    let dtorCall = new FunctionCall_1.FunctionCall(context, dtor, [], obj.type);
                    this.attach(dtorCall);
                    return dtorCall;
                }
                else {
                    this.addNoDestructorNote(obj);
                    return undefined;
                }
            }
            else if (obj.isTyped(types_1.isBoundedArrayType)) {
                // If it's an array, we recursively need to cleanup the elements
                return createArrayDeallocator(context, obj);
            }
            else {
                // object doesn't need any special cleanup (e.g. an atomic object)
                return undefined;
            }
        });
    }
    createRuntimeConstruct(parentOrSim) {
        return new RuntimeObjectDeallocator(this, parentOrSim);
    }
    addNoDestructorNote(obj) {
        this.addNote(errors_1.CPPError.declaration.dtor.no_destructor(this, obj));
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type;
        // TODO semantic equivalence
    }
}
exports.ObjectDeallocator = ObjectDeallocator;
class RuntimeObjectDeallocator extends constructs_1.RuntimeConstruct {
    constructor(model, parentOrSim) {
        super(model, "cleanup", parentOrSim);
    }
    upNextImpl() {
        var _a;
        if (this.index === undefined) {
            return;
        }
        // Cleanup previous target that has just finished its destructor
        // or array element cleanup
        if ((_a = this.currentObjectTarget) === null || _a === void 0 ? void 0 : _a.isAlive) {
            this.sim.memory.killObject(this.currentObjectTarget, this);
        }
        while (this.index > 0) {
            --this.index;
            this.currentObjectTarget = this.model.objectTargets[this.index].runtimeLookup(this);
            if (!this.currentObjectTarget.isAlive) {
                // skip any objects that aren't alive (i.e. weren't ever constructed)
                continue;
            }
            let ccc = this.model.compoundCleanupConstructs[this.index];
            if (!ccc) {
                // no compound cleanup construct, just destroy the object
                this.sim.memory.killObject(this.currentObjectTarget, this);
                continue;
            }
            if ((ccc === null || ccc === void 0 ? void 0 : ccc.construct_type) === "FunctionCall") {
                // call destructor
                util_1.assert(this.currentObjectTarget.isTyped(types_1.isCompleteClassType));
                this.sim.push(ccc.createRuntimeFunctionCall(this, this.currentObjectTarget));
                return; // leave so that dtor can run
            }
            else if ((ccc === null || ccc === void 0 ? void 0 : ccc.construct_type) === "ObjectDeallocator") {
                this.sim.push(ccc.createRuntimeConstruct(this));
                return; // leave so that array elem deallocator can run
            }
        }
        // Once we get here, all objects have been cleaned up and we
        // just have references left
        this.model.referenceTargets.forEach(refEntity => {
            var _a;
            // If the program is running, and this reference was bound
            // to some object, the referred type should have
            // been completed.
            util_1.assert(refEntity.isTyped(types_1.isReferenceToCompleteType));
            // destroying a reference doesn't really require doing anything,
            // but we notify the referred object this reference has been removed
            (_a = refEntity.runtimeLookup(this)) === null || _a === void 0 ? void 0 : _a.onReferenceUnbound(refEntity);
        });
        // Require at least one active step before leaving
        this.startCleanup();
    }
    stepForwardImpl() {
        // Require at least one stepforward before doing anything
        // intentionally 1 too large - gets adjusted in first upNextImpl
        this.index = this.model.objectTargets.length;
    }
}
exports.RuntimeObjectDeallocator = RuntimeObjectDeallocator;
class LocalDeallocator extends ObjectDeallocator {
    constructor(context) {
        super(context, context.blockLocals.localVariables);
    }
    addNoDestructorNote(obj) {
        this.addNote(errors_1.CPPError.declaration.dtor.no_destructor_local(this, obj));
    }
}
function createLocalDeallocator(context) {
    return new LocalDeallocator(context);
}
exports.createLocalDeallocator = createLocalDeallocator;
class StaticDeallocator extends ObjectDeallocator {
    addNoDestructorNote(obj) {
        this.addNote(errors_1.CPPError.declaration.dtor.no_destructor_static(this, obj));
    }
}
function createStaticDeallocator(context, staticVariables) {
    return new StaticDeallocator(context, staticVariables);
}
exports.createStaticDeallocator = createStaticDeallocator;
class ArrayDeallocator extends ObjectDeallocator {
    constructor(context, target) {
        let elems = [];
        for (let i = 0; i < target.type.numElems; ++i) {
            elems.push(new entities_1.ArraySubobjectEntity(target, i));
        }
        super(context, elems);
        this.addedDtorNote = false;
    }
    addNoDestructorNote(obj) {
        if (!this.addedDtorNote) {
            this.addNote(errors_1.CPPError.declaration.dtor.no_destructor_array(this, obj));
            this.addedDtorNote = true; // only add this note once per array
        }
    }
}
function createArrayDeallocator(context, target) {
    return new ArrayDeallocator(context, target);
}
exports.createArrayDeallocator = createArrayDeallocator;
class MemberDeallocator extends ObjectDeallocator {
    constructor(context, target) {
        let classDef = target.type.classDefinition;
        super(context, classDef.getBaseAndMemberEntities());
        this.addedDtorNote = false;
    }
    addNoDestructorNote(obj) {
        if (!this.addedDtorNote) {
            this.addNote(errors_1.CPPError.declaration.dtor.no_destructor_array(this, obj));
            this.addedDtorNote = true; // only add this note once per array
        }
    }
}
function createMemberDeallocator(context, target) {
    return new MemberDeallocator(context, target);
}
exports.createMemberDeallocator = createMemberDeallocator;
//# sourceMappingURL=ObjectDeallocator.js.map