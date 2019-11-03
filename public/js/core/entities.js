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
var types_1 = require("./types");
var errors_1 = require("./errors");
var util_1 = require("../util/util");
var observe_1 = require("../util/observe");
var constructs_1 = require("./constructs");
var declarations_1 = require("./declarations");
var objects_1 = require("./objects");
var expressions_1 = require("./expressions");
var standardConversions_1 = require("./standardConversions");
var Scope = /** @class */ (function () {
    function Scope(parent) {
        this.entities = {};
        this.parent = parent;
    }
    Scope.prototype.toString = function () {
        var str = "";
        for (var key in this.entities) {
            str += this.entities[key] + "\n";
        }
        return str;
    };
    // public allEntities() {
    //     var ents = [];
    //     for(var name in this.entities) {
    //         if (Array.isArray(this.entities[name])) {
    //             var e = <CPPEntity[]>this.entities[name];
    //             for(let i = 0; i < e.length; ++i) {
    //                 ents.push(e[i]);
    //             }
    //         }
    //         else{
    //             ents.push(this.entities[name]);
    //         }
    //     }
    //     return ents;
    // }
    // TODO NEW: this documentation is kind of messy (but hey, at least it exists!)
    /**
     * Attempts to add a new entity to this scope.
     * @param {DeclaredEntity} newEntity - The entity to attempt to add.
     * @returns {DeclaredEntity} Either the entity that was added, or an existing one already there, assuming it was compatible.
     * @throws  {SemanticException} If an error prevents the entity being added successfully. (e.g. Function declarations with
     * the same signature but a mismatch of return types)
     */
    Scope.prototype.addDeclaredEntity = function (newEntity) {
        var existingEntity = this.entities[newEntity.name];
        if (!existingEntity) { // No previous entity with this name, so just add it
            return this.entities[newEntity.name] = newEntity instanceof FunctionEntity ? [newEntity] : newEntity;
        }
        return newEntity.mergeInto(existingEntity);
    };
    // protected declaredEntityAdded(ent: DeclaredEntity) {
    // }
    // public singleLookup(name: string, options: NameLookupOptions) {
    //     var result = this.lookup(name, options);
    //     if (Array.isArray(result)){
    //         return result[0];
    //     }
    //     else{
    //         return result;
    //     }
    // }
    // public requiredLookup(name, options){
    //     return this.i_requiredLookupImpl(this.lookup(name, options), name, options);
    // }
    // private i_requiredLookupImpl(res, name, options) {
    //     options = options || {};
    //     if (!res){
    //         if (options.paramTypes || options.params){
    //             throw SemanticExceptions.NoMatch.instance(this, name,
    //                 options.paramTypes || options.params && options.params.map(function(p){return p.type;}),
    //                 options.isThisConst
    //             );
    //         }
    //         else{
    //             throw SemanticExceptions.NotFound.instance(this, name);
    //         }
    //     }
    //     else if(Array.isArray(res)){
    //         if (res === Scope.HIDDEN){
    //             throw SemanticExceptions.Hidden.instance(this, name,
    //                 options.paramTypes || options.params && options.params.map(function(p){return p.type;}),
    //                 options.isThisConst);
    //         }
    //         if (res.length === 0){
    //             throw SemanticExceptions.NoMatch.instance(this, name,
    //                 options.paramTypes || options.params && options.params.map(function(p){return p.type;}),
    //                 options.isThisConst
    //             );
    //         }
    //         if (res.length > 1){
    //             throw SemanticExceptions.Ambiguity.instance(this, name);
    //         }
    //         return res[0];
    //     }
    //     return res;
    // }
    // // TODO: this should be a member function of the Program class
    // public qualifiedLookup(names, options){
    //     assert(Array.isArray(names) && names.length > 0);
    //     var scope = this.sim.getGlobalScope();
    //     for(var i = 0; scope && i < names.length - 1; ++i){
    //         scope = scope.children[names[i].identifier];
    //     }
    //     if (!scope){
    //         return null;
    //     }
    //     var name = names.last().identifier;
    //     var result = scope.lookup(name, copyMixin(options, {qualified:true}));
    //     // Qualified lookup suppresses virtual function call mechanism, so if we
    //     // just looked up a MemberFunctionEntity, we create a proxy to do that.
    //     if (Array.isArray(result)){
    //         result = result.map(function(elem){
    //             return elem instanceof MemberFunctionEntity ? elem.suppressedVirtualProxy() : elem;
    //         });
    //     }
    //     return result;
    // }
    Scope.prototype.lookup = function (name, options) {
        if (options === void 0) { options = { kind: "normal" }; }
        options = options || {};
        util_1.assert(!name.includes("::"), "Qualified name used with unqualified loookup function.");
        var ent = this.entities[name];
        // If we don't have an entity in this scope and we didn't specify we
        // wanted an own entity, look in parent scope (if there is one)
        if (!ent && !options.own && this.parent) {
            return this.parent.lookup(name, options);
        }
        // If we didn't find anything, return null
        if (!ent) {
            return undefined;
        }
        if (!Array.isArray(ent)) {
            // If it's not an array, it's a single entity so return it
            return ent;
        }
        else {
            var viable = ent; // a set of potentially viable function overloads
            // If we're looking for an exact match of parameter types
            if (options.kind === "exact") {
                var paramTypes_1 = options.paramTypes;
                var receiverType_1 = options.receiverType;
                viable = ent.filter(function (cand) {
                    // Check that parameter types match
                    if (!cand.type.sameParamTypes(paramTypes_1))
                        if (receiverType_1) {
                            // if receiver type is defined, candidate must also have
                            // a receiver and the presence/absence of const must match
                            // NOTE: the actual receiver type does not need to match, just the constness
                            return cand.type.receiverType && receiverType_1.isConst === cand.type.isConst;
                        }
                        else {
                            // if no receiver type is defined, candidate must not have a receiver
                            return !cand.type.receiverType;
                        }
                    return cand.type.sameParamTypes(paramTypes_1);
                });
                return viable;
            }
            // // If we're looking for something that could be called with given parameter types, including conversions
            // else if (options.paramTypes) {
            //     // var params = options.params || options.paramTypes && fakeExpressionsFromTypes(options.paramTypes);
            //     viable = overloadResolution(ent, options.paramTypes, options.receiverType).viable || [];
            //     return viable[0];
            //     // TODO - should give error if there's multiple elements i.e. an ambiguity
            // }
            return viable;
            // // If viable is empty, not found.
            // if (viable && viable.length === 0){
            //     // Check to see if we could have found it except for name hiding
            //     if (!options.own && this.parent){
            //         var couldHave = this.parent.lookup(name, options);
            //         if (couldHave && (!Array.isArray(couldHave) || couldHave.length === 1 || couldHave === Scope.HIDDEN)){
            //             if (options.noNameHiding){
            //                 return couldHave;
            //             }
            //             else{
            //                 return Scope.HIDDEN;
            //             }
            //         }
            //     }
            //     return Scope.NO_MATCH;
            // }
            // else{
            //     return viable;
            // }
        }
    };
    return Scope;
}());
exports.Scope = Scope;
var BlockScope = /** @class */ (function (_super) {
    __extends(BlockScope, _super);
    function BlockScope() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return BlockScope;
}(Scope));
exports.BlockScope = BlockScope;
// export class FunctionBlockScope extends BlockScope {
//     _name: "FunctionBlockScope",
//     init: function(parent, sim){
//         this.initParent(parent, sim);
//         this.automaticObjects = [];
//         this.referenceObjects = [];
//     },
//     addAutomaticEntity : function(obj){
//         this.automaticObjects.push(obj);
//     },
//     addReferenceEntity : function(obj){
//         this.referenceObjects.push(obj);
//     },
//     addStaticEntity : function(ent) {
//         this.sim.addStaticEntity(ent);
//     }
// }
var NamespaceScope = /** @class */ (function (_super) {
    __extends(NamespaceScope, _super);
    function NamespaceScope(name, parent) {
        var _this = _super.call(this, parent) || this;
        util_1.assert(!parent || parent instanceof NamespaceScope);
        _this.name = name;
        _this.children = {};
        if (parent) {
            parent.addChild(_this);
        }
        return _this;
    }
    NamespaceScope.prototype.addChild = function (child) {
        if (child.name) {
            this.children[child.name] = child;
        }
    };
    return NamespaceScope;
}(Scope));
exports.NamespaceScope = NamespaceScope;
var CPPEntity = /** @class */ (function () {
    /**
     * Most entities will have a natural type, but a few will not (e.g. namespaces). In this case,
     * the type will be null.
     * TODO: fix this - there should probably be a subtype or interface for a TypedEntity or ObjectEntity
     */
    function CPPEntity(type) {
        this.observable = new observe_1.Observable(this);
        this.entityId = CPPEntity._nextEntityId++;
        this.type = type;
    }
    CPPEntity._nextEntityId = 0;
    return CPPEntity;
}());
exports.CPPEntity = CPPEntity;
;
var NamedEntity = /** @class */ (function (_super) {
    __extends(NamedEntity, _super);
    /**
     * All NamedEntitys will have a name, but in some cases this might be "". e.g. an unnamed namespace.
     */
    function NamedEntity(type, name) {
        var _this = _super.call(this, type) || this;
        _this.name = name;
        return _this;
    }
    return NamedEntity;
}(CPPEntity));
exports.NamedEntity = NamedEntity;
var DeclaredEntityBase = /** @class */ (function (_super) {
    __extends(DeclaredEntityBase, _super);
    // public readonly definition?: SimpleDeclaration;
    function DeclaredEntityBase(type, decl) {
        var _this = _super.call(this, type, decl.name) || this;
        _this.declaration = decl;
        return _this;
    }
    return DeclaredEntityBase;
}(NamedEntity));
exports.DeclaredEntityBase = DeclaredEntityBase;
;
var DeclaredObjectEntity = /** @class */ (function (_super) {
    __extends(DeclaredObjectEntity, _super);
    function DeclaredObjectEntity() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DeclaredObjectEntity.prototype.mergeInto = function (existingEntity) {
        if (Array.isArray(existingEntity)) { // an array indicates a function overload group was found
            throw errors_1.CPPError.declaration.type_mismatch(this.declaration, this, existingEntity[0]);
        }
        else {
            // both are non-functions, so check that the types are the same
            if (!types_1.sameType(this.type, existingEntity.type)) { // an array indicates a function overload group was found
                throw errors_1.CPPError.declaration.type_mismatch(this.declaration, this, existingEntity);
            }
            return existingEntity;
        }
    };
    return DeclaredObjectEntity;
}(DeclaredEntityBase));
exports.DeclaredObjectEntity = DeclaredObjectEntity;
var AutoEntity = /** @class */ (function (_super) {
    __extends(AutoEntity, _super);
    function AutoEntity(type, def, isParameter) {
        var _this = _super.call(this, type, def) || this;
        _this.definition = def;
        _this.isParameter = !!isParameter;
        return _this;
    }
    AutoEntity.prototype.toString = function () {
        return this.name + " (" + this.type + ")";
    };
    AutoEntity.prototype.mergeInto = function (existingEntity) {
        // Redeclaration of local is never ok
        throw errors_1.CPPError.declaration.prev_local(this.declaration, this.name);
    };
    AutoEntity.prototype.runtimeLookup = function (rtConstruct) {
        // TODO: revisit the non-null assertion below
        return rtConstruct.containingRuntimeFunction.stackFrame.getLocalObject(this);
    };
    AutoEntity.prototype.describe = function () {
        return { message: "the " + (this.isParameter ? "parameter" : "local variable") + " " + this.name };
    };
    return AutoEntity;
}(DeclaredObjectEntity));
exports.AutoEntity = AutoEntity;
;
var LocalReferenceEntity = /** @class */ (function (_super) {
    __extends(LocalReferenceEntity, _super);
    function LocalReferenceEntity(type, decl, isParameter) {
        if (isParameter === void 0) { isParameter = false; }
        var _this = _super.call(this, type, decl) || this;
        _this.isParameter = isParameter;
        return _this;
    }
    LocalReferenceEntity.prototype.mergeInto = function (existingEntity) {
        // Redeclaration of local is never ok
        throw errors_1.CPPError.declaration.prev_local(this.declaration, this.name);
    };
    LocalReferenceEntity.prototype.bindTo = function (rtConstruct, obj) {
        rtConstruct.containingRuntimeFunction.stackFrame.bindReference(this, obj);
    };
    LocalReferenceEntity.prototype.runtimeLookup = function (rtConstruct) {
        // TODO: revisit the non-null assertions below
        return rtConstruct.containingRuntimeFunction.stackFrame.referenceLookup(this);
    };
    LocalReferenceEntity.prototype.describe = function () {
        return { message: "the " + (this.isParameter ? "reference parameter" : "reference") + " " + this.name };
    };
    return LocalReferenceEntity;
}(DeclaredObjectEntity));
exports.LocalReferenceEntity = LocalReferenceEntity;
;
var StaticEntity = /** @class */ (function (_super) {
    __extends(StaticEntity, _super);
    // storage: "static",
    function StaticEntity(type, decl) {
        var _this = _super.call(this, type, decl) || this;
        _this.qualifiedName = "::" + _this.name;
        return _this;
    }
    StaticEntity.prototype.toString = function () {
        return this.name + " (" + this.type + ")";
    };
    StaticEntity.prototype.link = function (def) {
        if (!def || !(def instanceof declarations_1.GlobalObjectDefinition)) {
            // Either undefined, or linked against something other than a function overload group
            this.declaration.addNote(errors_1.CPPError.link.def_not_found(this.declaration, this));
            return;
        }
        this.definition = def;
    };
    StaticEntity.prototype.runtimeLookup = function (rtConstruct) {
        return rtConstruct.sim.memory.staticLookup(this);
    };
    StaticEntity.prototype.describe = function () {
        return { name: this.name, message: "the variable " + this.name };
    };
    return StaticEntity;
}(DeclaredObjectEntity));
exports.StaticEntity = StaticEntity;
;
// TODO: implement global references
// export class GlobalReferenceEntity<T extends ObjectType = ObjectType> extends DeclaredEntity<T> implements BoundReferenceEntity<T>, UnboundReferenceEntity<T> {
//     public bindTo(rtConstruct : RuntimeConstruct, obj: CPPObject<T>) {
//         rtConstruct.containingRuntimeFunction.stackFrame!.bindReference(this, obj);
//     }
//     public runtimeLookup(rtConstruct: RuntimeConstruct) : CPPObject<T> {
//         // TODO: revisit the non-null assertion below
//         return rtConstruct.containingRuntimeFunction.stackFrame!.referenceLookup(this);
//     }
//     public describe() {
//         if (this.decl instanceof Declarations.Parameter){
//             return {message: "the reference parameter " + this.name};
//         }
//         else{
//             return {message: "the reference " + this.name};
//         }
//     }
// };
/**
 * Looking this entity up at runtime yields the return object of the containing runtime function.
 * Note this is generally only something you would want in the context of a return-by-value
 * function, in which case the return object is a temporary object created to eventually be initialized
 * with the returned value. In a pass-by-reference function, the return object will only exist once the
 * return has been processed and it is set to the returned object. In void function, there is no return
 * object.
 * @throws Throws an exception if the return object does not exist.
 */
var ReturnObjectEntity = /** @class */ (function (_super) {
    __extends(ReturnObjectEntity, _super);
    function ReturnObjectEntity() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ReturnObjectEntity.prototype.runtimeLookup = function (rtConstruct) {
        var returnObject = rtConstruct.containingRuntimeFunction.returnObject;
        if (!returnObject) {
            throw "Error: Runtime lookup performed for the return object of a function, but the return object does not currently exist.";
        }
        return returnObject;
    };
    ReturnObjectEntity.prototype.describe = function () {
        // TODO: add info about which function? would need to be specified when the return value is created
        return { message: "the return object" };
    };
    return ReturnObjectEntity;
}(CPPEntity));
exports.ReturnObjectEntity = ReturnObjectEntity;
;
var ReturnByReferenceEntity = /** @class */ (function (_super) {
    __extends(ReturnByReferenceEntity, _super);
    function ReturnByReferenceEntity() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ReturnByReferenceEntity.prototype.bindTo = function (rtConstruct, obj) {
        // Assume a ReturnByReferenceEntity will only be bound in the context of a return
        // for a return-by-reference function, thus the cast
        var func = rtConstruct.containingRuntimeFunction;
        func.setReturnObject(obj);
    };
    ReturnByReferenceEntity.prototype.describe = function () {
        // TODO: add info about which function? would need to be specified when the return value is created
        return { message: "the object returned by reference" };
    };
    return ReturnByReferenceEntity;
}(CPPEntity));
exports.ReturnByReferenceEntity = ReturnByReferenceEntity;
;
// TODO: determine what should actually be the base class here
// TODO: I think this should be an object?
// TODO: I don't think this should be an object! Move to runtimeEnvironment.ts?
// TODO: Is this needed? Can wherever uses it just keep track of the actual objects?
// export class RuntimeReference<T extends ObjectType = ObjectType> {
//     public readonly observable = new Observable(this);
//     public readonly entity: BoundReferenceEntity<T>;
//     public readonly refersTo: CPPObject<T>;
//     public constructor(entity: BoundReferenceEntity<T>, refersTo: CPPObject<T>) {
//         this.entity = entity;
//         this.refersTo = refersTo;
//         // Initially refers to a dead object at address 0
//         // TODO: this is a bad idea, so I removed it
//         // this.refersTo = new AnonymousObject(this.entity.type, memory, 0);
//     }
//     // public bindTo(refersTo: CPPObject) {
//     //     (<typeof RuntimeReference.prototype.refersTo>this.refersTo) = refersTo;
//     //     this.observable.send("bound");
//     // }
//     public describe() {
//         if (this.refersTo) {
//             return {message: "the reference " + this.entity.name + " (which is bound to " + this.refersTo.describe().message + ")"};
//         }
//         else {
//             return {message: "the reference " + this.entity.name + " (which has not yet been bound to an object)"};
//         }
//     }
// };
var StringLiteralEntity = /** @class */ (function (_super) {
    __extends(StringLiteralEntity, _super);
    function StringLiteralEntity(str) {
        var _this = _super.call(this, new types_1.BoundedArrayType(new types_1.Char(true), str.length + 1)) || this;
        _this.str = str;
        return _this;
    }
    StringLiteralEntity.prototype.objectInstance = function (memory, address) {
        return new objects_1.StringLiteralObject(this.type, memory, address);
    };
    StringLiteralEntity.prototype.toString = function () {
        return "string literal \"" + util_1.unescapeString(this.str) + "\"";
    };
    StringLiteralEntity.prototype.runtimeLookup = function (rtConstruct) {
        return rtConstruct.sim.memory.getStringLiteral(this.str);
    };
    StringLiteralEntity.prototype.describe = function () {
        return { message: "the string literal \"" + util_1.unescapeString(this.str) + "\"" };
    };
    return StringLiteralEntity;
}(CPPEntity));
exports.StringLiteralEntity = StringLiteralEntity;
;
// TODO: will need to add a class for ReferenceParameterEntity
var PassByValueParameterEntity = /** @class */ (function (_super) {
    __extends(PassByValueParameterEntity, _super);
    function PassByValueParameterEntity(calledFunction, type, num) {
        var _this = _super.call(this, type) || this;
        _this.calledFunction = calledFunction;
        _this.type = type;
        _this.num = num;
        util_1.assert(types_1.sameType(calledFunction.type.paramTypes[num], type), "Inconsistent type for parameter entity.");
        return _this;
    }
    PassByValueParameterEntity.prototype.runtimeLookup = function (rtConstruct) {
        // Getting the function at runtime already takes care of polymorphism for virtual functions
        // Note: rtConstruct.containingRuntimeFunction is not correct here since the lookup would occur
        // in the context of the calling function, rather than the called function.
        var func = rtConstruct.sim.topFunction();
        // Look up the parameter (as a local variable) in the context of the top function on the stack.
        var param = func.model.parameters[this.num].declaredEntity;
        if (!(param instanceof AutoEntity)) {
            return util_1.assertFalse("Pass by value used with reference parameter.");
        }
        var paramObj = param.runtimeLookup(func);
        util_1.assert(types_1.sameType(paramObj.type, this.type));
        return paramObj;
    };
    PassByValueParameterEntity.prototype.describe = function () {
        var definition = this.calledFunction.definition;
        if (definition) {
            return definition.parameters[this.num].declaredEntity.describe();
        }
        else {
            return { message: "Parameter #" + (this.num + 1) + " of the called function" };
        }
    };
    return PassByValueParameterEntity;
}(CPPEntity));
exports.PassByValueParameterEntity = PassByValueParameterEntity;
;
var PassByReferenceParameterEntity = /** @class */ (function (_super) {
    __extends(PassByReferenceParameterEntity, _super);
    function PassByReferenceParameterEntity(calledFunction, type, num) {
        var _this = _super.call(this, type) || this;
        _this.calledFunction = calledFunction;
        _this.type = type;
        _this.num = num;
        util_1.assert(types_1.sameType(calledFunction.type.paramTypes[num], type), "Inconsistent type for parameter entity.");
        return _this;
    }
    PassByReferenceParameterEntity.prototype.bindTo = function (rtConstruct, obj) {
        // Getting the function at runtime already takes care of polymorphism for virtual functions
        // Note: rtConstruct.containingRuntimeFunction is not correct here since the lookup would occur
        // in the context of the calling function, rather than the called function.
        var func = rtConstruct.sim.topFunction();
        // Look up the parameter (as a local variable) in the context of the top function on the stack.
        var param = func.model.parameters[this.num].declaredEntity;
        if (!(param instanceof LocalReferenceEntity)) {
            return util_1.assertFalse("Pass by reference used with non-reference parameter.");
        }
        param.bindTo(func, obj);
    };
    PassByReferenceParameterEntity.prototype.describe = function () {
        var definition = this.calledFunction.definition;
        if (definition) {
            return definition.parameters[this.num].declaredEntity.describe();
        }
        else {
            return { message: "Parameter #" + (this.num + 1) + " of the called function" };
        }
    };
    return PassByReferenceParameterEntity;
}(CPPEntity));
exports.PassByReferenceParameterEntity = PassByReferenceParameterEntity;
;
// export class ReceiverEntity extends CPPEntity<ClassType> implements ObjectEntity<ClassType> {
//     protected static readonly _name: "ReceiverEntity";
//     // storage: "automatic",
//     constructor(type: T) {
//         super(type);
//     }
//     public toString() {
//         return "function receiver (" + this.type + ")";
//     }
//     public runtimeLookup(rtConstruct: RuntimeConstruct) {
//         return rtConstruct.contextualReceiver();
//     }
//     public describe() {
//         // if (rtConstruct){
//         //     return {message: "the receiver of this call to " + rtConstruct.containingRuntimeFunction().describe().message + " (i.e. *this) "};
//         // }
//         // else {
//             return {message: "the receiver of this call (i.e. *this)"};
//         // }
//     }
// };
// export class NewObjectEntity<T extends ObjectType = ObjectType> extends CPPEntity<T> implements ObjectEntity<T> {
//     protected static readonly _name = "NewObjectEntity";
//     // storage: "automatic",
//     public toString() {
//         return "object (" + this.type + ")";
//     }
//     public runtimeLookup(rtConstruct: RuntimeConstruct) {
//         // no additional runtimeLookup() needed on the object since it will never be a reference
//         return rtConstruct.getAllocatedObject();
//     }
//     public describe() {
//         return {message: "the dynamically allocated object (of type "+this.type+") created by new"};
//     }
// };
var ArraySubobjectEntity = /** @class */ (function (_super) {
    __extends(ArraySubobjectEntity, _super);
    function ArraySubobjectEntity(arrayEntity, index) {
        var _this = _super.call(this, arrayEntity.type.elemType) || this;
        _this.arrayEntity = arrayEntity;
        _this.index = index;
        return _this;
    }
    ArraySubobjectEntity.prototype.runtimeLookup = function (rtConstruct) {
        return this.arrayEntity.runtimeLookup(rtConstruct).getArrayElemSubobject(this.index);
    };
    ArraySubobjectEntity.prototype.describe = function () {
        var arrDesc = this.arrayEntity.describe();
        var desc = {
            message: "element " + this.index + " of " + arrDesc.message
        };
        if (arrDesc.name) {
            desc.name = arrDesc.name + "[" + this.index + "]";
        }
        return desc;
    };
    return ArraySubobjectEntity;
}(CPPEntity));
exports.ArraySubobjectEntity = ArraySubobjectEntity;
// export class BaseSubobjectEntity extends CPPEntity<ClassType> implements ObjectEntity<ClassType> {
//     public readonly containingEntity: ObjectEntity<ClassType>;
//     constructor(containingEntity: ObjectEntity<ClassType>, type: ClassType) {
//         super(type);
//         this.containingEntity = containingEntity;
//     }
//     public runtimeLookup(rtConstruct: RuntimeConstruct) {
//         // TODO: check on non-null assertion below
//         return this.containingEntity.runtimeLookup(rtConstruct).getBaseSubobject()!;
//     }
//     public describe() {
//         return {message: "the " + this.type.cppClass.name + " base class subobject of " + this.containingEntity.describe()};
//     }
// }
// export class MemberSubobjectEntity<T extends ObjectType = ObjectType> extends CPPEntity<T> implements ObjectEntity<T> {
//     public readonly containingEntity: ObjectEntity<ClassType>;
//     public readonly name: string;
//     constructor(containingEntity: ObjectEntity<ClassType>, type: T, name: string) {
//         super(type);
//         this.containingEntity = containingEntity;
//         this.name = name;
//     }
//     public runtimeLookup(rtConstruct: RuntimeConstruct) {
//         // TODO: check on cast below
//         return <MemberSubobject<T>>this.containingEntity.runtimeLookup(rtConstruct).getMemberSubobject(this.name);
//     }
//     public describe() {
//         let containingObjectDesc = this.containingEntity.describe();
//         let desc : Description = {
//             message: "the " + this.name + " member of " + containingObjectDesc.message
//         }
//         if (containingObjectDesc.name) {
//             desc.name = containingObjectDesc.name + "." + this.name
//         }
//         return desc;
//     }
// }
// export class BaseClassEntity extends CPPEntity<ClassType> implements ObjectEntity<ClassType> {
//     protected static readonly _name = "BaseClassEntity";
//     // storage: "none",
//     public readonly access: string;
//     public readonly memberOfType: ClassType;
//     constructor(type: ClassType, memberOfType: ClassType, access: string) {
//         super(type);
//         this.memberOfType = memberOfType;
//         this.access = access;
//     }
//     public toString() {
//         return "the " + this.type.className + " base object of " + this.memberOfType.className;
//     }
//     public runtimeLookup(rtConstruct: RuntimeConstruct) {
//         var recObj = rtConstruct.contextualReceiver();
//         while(recObj && !(recObj.type instanceof this.type)){ // TODO: this isA should probably be changed to a type function
//             recObj = recObj.type.getBaseClass() && recObj.i_baseSubobjects[0];
//         }
//         Util.assert(recObj, "Internal lookup failed to find subobject in class or base classes.");
//         return recObj;
//     }
//     public objectInstance(parentObj: CPPObject<ClassType>, memory: Memory, address: number) {
//         return new BaseSubobject(parentObj, this.type, memory, address);
//     }
//     public describe() {
//         return {message: "the " + this.type.className + " base object of " + this.memberOfType.className};
//     }
// };
// // TODO: need class for reference members
// export class MemberVariableEntity<T extends ObjectType = ObjectType> extends DeclaredEntity<T> implements ObjectEntity<T> {
//     protected static readonly _name = "MemberVariableEntity";
//     // storage: "none",
//     public readonly access: string;
//     public readonly memberOfType: Types.Class;
//     public constructor(decl: SimpleDeclaration, memberOfType: Types.Class) {
//         super(decl);
//         this.memberOfType = memberOfType;
//         this.access = decl.access;
//     }
//     public toString() {
//         return this.name + " (" + this.type + ")";
//     }
//     public runtimeLookup(rtConstruct: RuntimeConstruct) {
//         var recObj = rtConstruct.contextualReceiver();
//         while(recObj && !recObj.type.similarType(this.memberOfType)) {
//             recObj = recObj.type.getBaseClass() && recObj.i_baseSubobjects[0];
//         }
//         assert(recObj, "Internal lookup failed to find subobject in class or base classses.");
//         return recObj.getMemberSubobject(this.name);
//     }
//     public objectInstance(parentObj: CPPObject<ClassType>, memory: Memory, address: number) {
//         return new MemberSubobject(parentObj, this.type, this.name, memory, address);
//     }
//     public describe() {
//         if (rtConstruct){
//             var recObj = rtConstruct.contextualReceiver();
//             if (recObj.name){
//                 return {message: recObj.name + "." + this.name};
//             }
//             else{
//                 return {message: "the member " + this.name + " of " + recObj.describe().message};
//             }
//         }
//         else{
//             return {
//                 name: this.memberOfType.className + "." + this.name,
//                 message: "the " + this.name + " member of the " + this.memberOfType.className + " class"
//             };
//         }
//     }
// }
var TemporaryObjectEntity = /** @class */ (function (_super) {
    __extends(TemporaryObjectEntity, _super);
    function TemporaryObjectEntity(type, creator, owner, description) {
        var _this = _super.call(this, type) || this;
        _this.creator = creator;
        _this.owner = owner;
        _this.name = name; // TODO: change when I check over usages of .name and replace with description or something
        return _this;
    }
    TemporaryObjectEntity.prototype.setOwner = function (newOwner) {
        this.owner = newOwner;
    };
    TemporaryObjectEntity.prototype.objectInstance = function (creatorRt) {
        var objInst = creatorRt.sim.memory.allocateTemporaryObject(this);
        var owner = creatorRt.containingFullExpression;
        owner.temporaryObjects[this.entityId] = objInst;
        return objInst;
    };
    TemporaryObjectEntity.prototype.runtimeLookup = function (rtConstruct) {
        // Some hacky casts and assertions in this implementation
        if (!(rtConstruct instanceof constructs_1.RuntimePotentialFullExpression)) {
            return util_1.assertFalse();
        }
        return rtConstruct.containingFullExpression.temporaryObjects[this.entityId];
    };
    TemporaryObjectEntity.prototype.describe = function () {
        return { message: this.name }; // TOOD: eventually change implementation when I remove name
    };
    TemporaryObjectEntity._name = "TemporaryObjectEntity";
    return TemporaryObjectEntity;
}(CPPEntity));
exports.TemporaryObjectEntity = TemporaryObjectEntity;
var FunctionEntity = /** @class */ (function (_super) {
    __extends(FunctionEntity, _super);
    // storage: "static",
    function FunctionEntity(type, decl) {
        var _this = _super.call(this, type, decl) || this;
        _this.qualifiedName = "::" + _this.name;
        return _this;
    }
    FunctionEntity.prototype.isStaticallyBound = function () {
        return true;
    };
    Object.defineProperty(FunctionEntity.prototype, "isVirtual", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    FunctionEntity.prototype.toString = function () {
        return this.name;
    };
    FunctionEntity.prototype.nameString = function () {
        return this.name;
    };
    FunctionEntity.prototype.mergeInto = function (existingEntity) {
        if (!Array.isArray(existingEntity)) { // It's not a function overload group
            throw errors_1.CPPError.declaration.type_mismatch(this.declaration, this, existingEntity);
        }
        else { // It is a function overload group, check each other function found
            var matchingFunction = selectOverloadedEntity(existingEntity, this.type);
            if (!matchingFunction) {
                // If none were found with the same signature, this is a new overload, so go ahead and add it
                existingEntity.push(this);
                return this;
            }
            // If they have mismatched return types, that's a problem.
            if (!this.type.sameReturnType(matchingFunction.type)) {
                throw errors_1.CPPError.declaration.func.returnTypesMatch([this.declaration, matchingFunction.declaration], this.name);
            }
            // As a sanity check, make sure they're the same type.
            // But this should already be true, given that they have the same signature and return type.
            if (!types_1.sameType(this.type, matchingFunction.type)) { // an array indicates a function overload group was found
                throw errors_1.CPPError.declaration.type_mismatch(this.declaration, this, matchingFunction);
            }
            return matchingFunction;
        }
    };
    FunctionEntity.prototype.link = function (def) {
        if (!def || !Array.isArray(def)) {
            // Either undefined, or linked against something other than a function overload group
            this.declaration.addNote(errors_1.CPPError.link.func.def_not_found(this.declaration, this));
            return;
        }
        // found an overload group of function definitions, check for one
        // with matching signature to the given linked entity
        var overload = declarations_1.selectOverloadedDefinition(def, this.type);
        if (!overload) {
            this.declaration.addNote(errors_1.CPPError.link.func.no_matching_overload(this.declaration, this));
            return;
        }
        // check return type
        if (!this.type.sameReturnType(overload.declaration.type)) {
            this.declaration.addNote(errors_1.CPPError.link.func.returnTypesMatch(this.declaration, this));
            return;
        }
        this.definition = overload;
    };
    // TODO: check on what this is here for
    // public getPointerTo() {
    //     return new Value(this, this.type);
    // }
    FunctionEntity.prototype.isMain = function () {
        return this.qualifiedName === "::main";
    };
    FunctionEntity.prototype.describe = function () {
        throw new Error("Method not implemented.");
    };
    return FunctionEntity;
}(DeclaredEntityBase));
exports.FunctionEntity = FunctionEntity;
// export class MagicFunctionEntity extends FunctionEntity {
//     public constructor(decl: SimpleDeclaration) {
//         super(decl);
//         this.setDefinition(decl);
//     }
//     public describe() {
//         return {message: "no description available"};
//     }
// }
// export class MemberFunctionEntity extends FunctionEntity {
//     public readonly containingClass: Types.Class;
//     public readonly isVirtual: boolean;
//     public readonly pureVirtual: boolean;
//     constructor(decl: SimpleDeclaration, containingClass: Types.Class, isVirtual: boolean) {
//         super(decl);
//         this.containingClass = containingClass;
//         this.isVirtual = isVirtual;
//         this.pureVirtual = decl.pureVirtual;
//         // May also be set to virtual later if it's discovered to be an overrider
//         // for a virtual function in a base class
//         this.checkForOverride();
//     }
//     private checkForOverride() {
//         if (!this.containingClass.getBaseClass()) {
//             return;
//         }
//         // Find the nearest overrider of a hypothetical virtual function.
//         // If any are virtual, this one would have already been set to be
//         // also virtual by this same procedure, so checking this one is sufficient.
//         // If we override any virtual function, this one is too.
//         var overridden = this.containingClass.getBaseClass().classScope.singleLookup(this.name, {
//             paramTypes: this.type.paramTypes, isThisConst: this.type.isThisConst,
//             exactMatch:true, own:true, noNameHiding:true});
//         if (overridden && overridden instanceof FunctionEntity && overridden.isVirtual){
//             (<boolean>this.isVirtual) = true;
//             // Check to make sure that the return types are covariant
//             if (!covariantType(this.type.returnType, overridden.type.returnType)){
//                 throw SemanticExceptions.NonCovariantReturnTypes.instance(this, overridden);
//             }
//         }
//     }
//     public isStaticallyBound() {
//         return !this.isVirtual;
//     }
//     public isLinked() {
//         return this.virtual && this.pureVirtual || this.isDefined();
//     }
//     public runtimeLookup(sim: Simulation, rtConstruct: RuntimeConstruct) {
//         if (this.isVirtual){
//             // If it's a virtual function start from the class scope of the dynamic type
//             var receiver = rtConstruct.contextualReceiver();
//             Util.assert(receiver, "dynamic function lookup requires receiver");
//             var dynamicType = receiver.type;
//             // Sorry this is hacky :(
//             // If it's a destructor, we look instead for the destructor of the dynamic type
//             var func;
//             if (this.definition instanceof DestructorDefinition) {
//                 func = dynamicType.destructor;
//             }
//             else{
//                 func = dynamicType.classScope.singleLookup(this.name, {
//                     paramTypes: this.type.paramTypes, isThisConst: this.type.isThisConst,
//                     exactMatch:true, own:true, noNameHiding:true});
//             }
//             Util.assert(func, "Failed to find virtual function implementation during lookup.");
//             return func;
//         }
//         else{
//             return this;
//         }
//     }
//     public suppressedVirtualProxy() : MemberFunctionEntity {
//         var proxy = Object.create(this);
//         proxy.isVirtual = false;
//         return proxy;
//     }
// };
// export class ConstructorEntity extends MemberFunctionEntity {
// }
// export class PointedFunctionEntity extends CPPEntity {
//     protected static readonly _name = "FunctionEntity";
//     private readonly desc: string;
//     constructor(type: Type) {
//         super(type);
//         this.desc = "Unknown function of type " + type;
//     }
//     public isStaticallyBound() {
//         return true;
//     }
//     public toString() {
//         return this.desc;
//     }
//     public runtimeLookup(sim: Simulation, rtConstruct: RuntimeConstruct) {
//         return rtConstruct.pointedFunction.runtimeLookup(sim, rtConstruct);
//     }
//     public isLinked() {
//         return true;
//     }
//     public describe() {
//         return {message: "no description available"};
//     }
// }
// export class TypeEntity extends DeclaredEntity {
//     protected static readonly _name = "TypeEntity";
//     public toString() {
//         return "TypeEntity: " + this.type.instanceString();
//     }
//     public describe() {
//         return this.type.describe();
//     }
// };
function convLen(args) {
    return args.reduce(function (res, exp) { return res + exp.conversionLength; }, 0);
}
;
function overloadResolution(candidates, argTypes, receiverType) {
    // TODO: add these checks, and send errors back to construct that calls this if they aren't met
    // Should return the function selected as well as an array of object-typed params that contain
    // any implicit conversions necessary.
    // if (!allWellTyped(args)) {
    //     // If arguments are not well-typed, we can't continue onward to select a function
    //     // and create a function call, so instead just give up attach arguments here.
    //     this.attachAll(args);
    //     return;
    // }
    // if (!allObjectTyped(args)) {
    //     // Only object types may be passed as arguments to functions.
    //     this.addNote(CPPError.declaration.init.no_default_constructor(this, this.target)); // TODO: fix
    //     this.attachAll(args);
    //     return;
    // }
    // Find the constructor
    var viable = [];
    var resultCandidates = candidates.map(function (candidate) {
        var tempArgs = [];
        var notes = [];
        // Check argument types against parameter types
        var candidateParamTypes = candidate.type.paramTypes;
        if (argTypes.length !== candidateParamTypes.length) {
            notes.push(errors_1.CPPError.param.numParams(candidate.declaration));
        }
        // TODO: add back in with member functions
        // else if (receiverType.isConst && cand instanceof MemberFunctionEntity && !cand.type.isThisConst){
        //     problems.push(CPPError.param.thisConst(cand.declaration));
        // }
        else {
            argTypes.forEach(function (argType, i) {
                if (!argType) {
                    return; // ignore undefined argType, assume it "works" since there will be an error elsewhere already
                }
                var candidateParamType = candidateParamTypes[i];
                if (candidateParamType.isReferenceType()) {
                    // tempArgs.push(args[i]);
                    if (!types_1.referenceCompatible(argType, candidateParamType.refTo)) {
                        notes.push(errors_1.CPPError.param.paramReferenceType(candidate.declaration, argType, candidateParamType));
                    }
                    //else if (args[i].valueCategory !== "lvalue"){
                    //    problems.push(CPPError.param.paramReferenceLvalue(args[i]));
                    //}
                }
                else {
                    // tempArgs.push(standardConversion(args[i], argTypes[i]));
                    // Attempt standard conversion of an auxiliary expression of the argument's type to the param type
                    var auxArg = new expressions_1.AuxiliaryExpression(argType, "prvalue");
                    var convertedArg = standardConversions_1.standardConversion(auxArg, candidateParamType);
                    if (!types_1.sameType(convertedArg.type, candidateParamType)) {
                        notes.push(errors_1.CPPError.param.paramType(candidate.declaration, argType, candidateParamType));
                    }
                }
            });
        }
        if (notes.length == 0) { // All notes in this function are errors, so if there are any it's not viable
            viable.push(candidate);
        }
        return { candidate: candidate, notes: notes };
    });
    // TODO: need to determine which of several viable overloads is the best option
    // TODO: need to detect when multiple viable overloads have the same total conversion length, which results in an ambiguity
    // let selected = viable.reduce((best, current) => {
    //     if (convLen(current.type.paramTypes) < convLen(best.type.paramTypes)) {
    //         return current;
    //     }
    //     else {
    //         return best;
    //     }
    // });
    var selected = viable[0] ? viable[0] : undefined;
    return {
        candidates: resultCandidates,
        viable: viable,
        selected: selected
    };
}
exports.overloadResolution = overloadResolution;
;
/**
 * Selects a function from the given overload group based on the signature of
 * the provided function type. (Note there's no consideration of function names here.)
 */
function selectOverloadedEntity(overloadGroup, type) {
    return overloadGroup.find(function (func) { return type.sameSignature(func.type); });
}
exports.selectOverloadedEntity = selectOverloadedEntity;
//# sourceMappingURL=entities.js.map