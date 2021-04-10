"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeTemporaryDeallocator = exports.TemporaryDeallocator = exports.RuntimePotentialFullExpression = exports.PotentialFullExpression = void 0;
const entities_1 = require("./entities");
const util_1 = require("../util/util");
const types_1 = require("./types");
const constructs_1 = require("./constructs");
const errors_1 = require("./errors");
const FunctionCall_1 = require("./FunctionCall");
class PotentialFullExpression extends constructs_1.BasicCPPConstruct {
    constructor() {
        super(...arguments);
        this.temporaryObjects = [];
    }
    onAttach(parent) {
        this.parent = parent;
        // This may no longer be a full expression. If so, move temporary entities to
        // their new full expression.
        if (!this.isFullExpression()) {
            let fe = this.findFullExpression();
            this.temporaryObjects.forEach((tempEnt) => {
                fe.addTemporaryObject(tempEnt);
            });
            this.temporaryObjects.length = 0; // clear array
        }
        // Now that we are attached, the assumption is no more temporary entities
        // will be added to this construct or its attached children. (There's an
        // assert in addTemporaryObject() to prevent this.) That means it is now
        // safe to compile and add the temporary deallocator construct as a child.
        if (this.temporaryObjects.length > 0) {
            this.temporaryDeallocator = new TemporaryDeallocator(this.context, this.temporaryObjects);
            this.attach(this.temporaryDeallocator);
        }
    }
    isFullExpression() {
        return !this.parent || !(this.parent instanceof PotentialFullExpression);
    }
    // TODO: this function can probably be cleaned up so that it doesn't require these ugly runtime checks
    /**
     * Returns the nearest full expression containing this expression (possibly itself).
     * @param inst
     */
    findFullExpression() {
        if (this.isFullExpression()) {
            return this;
        }
        if (!this.parent || !(this.parent instanceof PotentialFullExpression)) {
            return util_1.assertFalse("failed to find full expression for " + this);
        }
        return this.parent.findFullExpression();
    }
    addTemporaryObject(tempObjEnt) {
        util_1.assert(!this.parent, "Temporary objects may not be added to a full expression after it has been attached.");
        this.temporaryObjects.push(tempObjEnt);
        tempObjEnt.setOwner(this);
    }
    createTemporaryObject(type, name) {
        let fe = this.findFullExpression();
        var tempObjEnt = new entities_1.TemporaryObjectEntity(type, this, fe, name);
        this.temporaryObjects[tempObjEnt.entityId] = tempObjEnt;
        return tempObjEnt;
    }
}
exports.PotentialFullExpression = PotentialFullExpression;
class RuntimePotentialFullExpression extends constructs_1.RuntimeConstruct {
    constructor(model, stackType, parent) {
        super(model, stackType, parent);
        this.temporaryObjects = {};
        if (this.model.temporaryDeallocator) {
            this.temporaryDeallocator = this.model.temporaryDeallocator.createRuntimeConstruct(this);
            this.setCleanupConstruct(this.temporaryDeallocator);
        }
        this.containingFullExpression = this.findFullExpression();
    }
    findFullExpression() {
        let rt = this;
        while (rt instanceof RuntimePotentialFullExpression && !rt.model.isFullExpression() && rt.parent) {
            rt = rt.parent;
        }
        if (rt instanceof RuntimePotentialFullExpression) {
            return rt;
        }
        else {
            return util_1.assertFalse();
        }
    }
}
exports.RuntimePotentialFullExpression = RuntimePotentialFullExpression;
class TemporaryDeallocator extends constructs_1.BasicCPPConstruct {
    constructor(context, temporaryObjects) {
        super(context, undefined); // Has no AST
        this.construct_type = "TemporaryDeallocator";
        this.temporaryObjects = temporaryObjects;
        this.dtors = temporaryObjects.map((temp) => {
            if (temp.isTyped(types_1.isCompleteClassType)) {
                let dtor = temp.type.classDefinition.destructor;
                if (dtor) {
                    let dtorCall = new FunctionCall_1.FunctionCall(context, dtor, [], temp.type);
                    this.attach(dtorCall);
                    return dtorCall;
                }
                else {
                    this.addNote(errors_1.CPPError.declaration.dtor.no_destructor_temporary(temp.owner, temp));
                }
            }
            return undefined;
        });
    }
    createRuntimeConstruct(parent) {
        return new RuntimeTemporaryDeallocator(this, parent);
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type;
        // TODO semantic equivalence
    }
}
exports.TemporaryDeallocator = TemporaryDeallocator;
class RuntimeTemporaryDeallocator extends constructs_1.RuntimeConstruct {
    constructor(model, parent) {
        super(model, "expression", parent);
        this.index = 0;
        this.justDestructed = undefined;
    }
    upNextImpl() {
        let tempObjects = this.model.temporaryObjects;
        if (this.justDestructed) {
            this.sim.memory.killObject(this.justDestructed, this);
            this.justDestructed = undefined;
        }
        while (this.index < tempObjects.length) {
            // Destroy temp at given index
            let temp = tempObjects[this.index];
            let dtor = this.model.dtors[this.index];
            ++this.index;
            if (temp.isTyped(types_1.isCompleteClassType)) {
                // a temp class-type object, so we call the dtor
                util_1.assert(dtor);
                let obj = temp.runtimeLookup(this.parent);
                if (!obj) {
                    // some obscure cases (e.g. non-evaluated operand of ternary operator)
                    // where the temporary object might not ever have been allocated
                    continue;
                }
                this.sim.push(dtor.createRuntimeFunctionCall(this, obj));
                // need to destroy the object once dtor is done, so we keep track of it here
                this.justDestructed = obj;
                // return so that the dtor, which is now on top of the stack, can run instead
                return;
            }
            else {
                let obj = temp.runtimeLookup(this.parent);
                if (!obj) {
                    // some obscure cases (e.g. non-evaluated operand of ternary operator)
                    // where the temporary object might not ever have been allocated
                    return;
                }
                // a temp non-class-type object, no dtor needed.
                this.sim.memory.deallocateTemporaryObject(obj, this);
            }
        }
        this.startCleanup();
    }
    stepForwardImpl() {
    }
}
exports.RuntimeTemporaryDeallocator = RuntimeTemporaryDeallocator;
//# sourceMappingURL=PotentialFullExpression.js.map