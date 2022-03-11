import { Observable } from "../../util/observe";
import { asMutable, assert, assertFalse, assertNever, Mutable } from "../../util/util";
import type { RuntimeConstruct } from "../constructs/CPPConstruct";
import type { ClassDeclaration } from "../constructs/declarations/class/ClassDeclaration";
import type { ClassDefinition } from "../constructs/declarations/class/ClassDefinition";
import type { MemberVariableDeclaration } from "../constructs/declarations/class/MemberVariableDeclaration";
import type { FunctionDefinitionGroup } from "../constructs/declarations/declarations";
import type { FunctionDeclaration } from "../constructs/declarations/function/FunctionDeclaration";
import type { FunctionDefinition } from "../constructs/declarations/function/FunctionDefinition";
import type { ParameterDefinition } from "../constructs/declarations/function/ParameterDefinition";
import type { GlobalVariableDefinition } from "../constructs/declarations/variable/GlobalVariableDefinition";
import type { LocalVariableDefinition } from "../constructs/declarations/variable/LocalVariableDefinition";
import type { CompilerNote } from "./errors";
import { CPPError } from "./errors";
import type { Expression } from "../constructs/expressions/Expression";
import type { FunctionCall } from "../constructs/FunctionCall";
import type { RuntimeFunction } from "./functions";
import type { QualifiedName } from "./lexical";
import type { NewObjectType, RuntimeNewArrayExpression, RuntimeNewExpression } from "../constructs/expressions/NewExpression";
import type { AutoObject, CPPObject, StaticObject, TemporaryObject } from "../runtime/objects";
import type { PotentialFullExpression } from "../constructs/PotentialFullExpression";
import { RuntimePotentialFullExpression } from "../constructs/RuntimePotentialFullExpression";
import type { ArrayElemType, ArrayOfUnknownBoundType, BoundedArrayType, CompleteClassType, CompleteObjectType, CompleteReturnType, FunctionType, PointerType, PotentiallyCompleteArrayType, PotentiallyCompleteClassType, PotentiallyCompleteObjectType, ReferenceType, Type, VoidType } from "./types";
import { createClassType, sameType } from "./types";
import type { SemanticContext } from "./contexts";
import { isClassContext } from "./contexts";
import { DeclaredEntity } from "./scopes";


export interface EntityDescription {
    name: string;
    message: string;
}

export type EntityID = number;

export abstract class CPPEntity<T extends Type = Type> {
    private static _nextEntityId = 0;

    public readonly observable = new Observable(this);

    public readonly entityId: number;
    public readonly type: T;


    /**
     * Most entities will have a natural type, but a few will not (e.g. namespaces). In this case,
     * I haven't decided what to do.
     * TODO: fix this - there should probably be a subtype or interface for a TypedEntity
     */
    public constructor(type: T) {
        this.entityId = CPPEntity._nextEntityId++;
        this.type = type;
    }

    public abstract isTyped<NarrowedT extends CompleteObjectType>(this: ObjectEntity, predicate: (t:Type) => t is NarrowedT) : this is ObjectEntity<NarrowedT>;
    public abstract isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is CPPEntity<NarrowedT>;

    public abstract describe(): EntityDescription;

    // // TODO: does this belong here?
    // public isLibraryConstruct() {
    //     return false
    // }

    // // TODO: does this belong here?
    // public isLibraryUnsupported() {
    //     return false;
    // }

    //TODO: function for isOdrUsed()?

    public isSemanticallyEquivalent(other: CPPEntity, equivalenceContext: SemanticContext): boolean {
        return sameType(other.type, this.type);
        // TODO semantic equivalence
    }
}

export function areEntitiesSemanticallyEquivalent(entity: CPPEntity | undefined, other: CPPEntity | undefined, equivalenceContext: SemanticContext) {
    return !!(entity === other // also handles case of both undefined
        || entity && other && entity.isSemanticallyEquivalent(other, equivalenceContext));
}

export abstract class NamedEntity<T extends Type = Type> extends CPPEntity<T> {

    public readonly name: string;

    /**
     * All NamedEntitys will have a name, but in some cases this might be "". e.g. an unnamed namespace.
     */
    public constructor(type: T, name: string) {
        super(type);
        this.name = name;
    }
}

export type DeclarationKind = "variable" | "function" | "class";

abstract class DeclaredEntityBase<T extends Type = Type> extends NamedEntity<T> {

    public abstract readonly declarationKind: DeclarationKind;

    public constructor(type: T, name: string) {
        super(type, name);
    }

};

/**
 * Attempts to merge definitions. If neither entity is defined, does nothing and returns
 * the existing entity. If exactly one entity is defined, sets the definition for the
 * other one to match and returns the existing entity. If both are defined, this is an error
 * condition, so does nothing and returns false.
 * @param newEntity 
 * @param existingEntity 
 */
function mergeDefinitionInto<T extends DeclaredEntity>(newEntity: T, existingEntity: T) {

    if (newEntity.definition && existingEntity.definition) {
        if (newEntity.definition === existingEntity.definition) {
            // literally the same definition, that's fine.
            return existingEntity;
        }
        else {
            // not literally same definition, so this is an error
            return undefined;
        }
    }

    // One of them may have a definition, if so copy it over
    if (newEntity.definition) {
        // we have a definition but they don't
        asMutable(existingEntity).definition = newEntity.definition;
    }
    else if (existingEntity.definition) {
        // they have a definition but we don't
        asMutable(newEntity).definition = existingEntity.definition;
    }
    return existingEntity;
}

export class FunctionOverloadGroup {
    public readonly declarationKind = "function";

    public readonly name: string;
    public readonly qualifiedName: QualifiedName;
    private readonly _overloads: FunctionEntity[];
    public readonly overloads: readonly FunctionEntity[];

    public constructor(overloads: readonly FunctionEntity[]) {
        this.name = overloads[0].name;
        this.qualifiedName = overloads[0].qualifiedName;
        this.overloads = this._overloads = overloads.slice();
    }

    public addOverload(overload: FunctionEntity) {
        this._overloads.push(overload);
    }

    /**
     * Selects a function from the given overload group based on the signature of
     * the provided function type. (Note there's no consideration of function names here.)
     * WARNING: This function does NOT perform overload resolution. For example, it does
     * not consider the possibility of implicit conversions, which is a part of full overload
     * resolution. It simply looks for an overload with a matching signature.
     */
    public selectOverloadBySignature(type: FunctionType): FunctionEntity | undefined {
        return this.overloads.find(func => type.sameSignature(func.type));
    }
}

export type ObjectEntityType = CompleteObjectType | ReferenceType;

export interface ObjectEntity<T extends CompleteObjectType = CompleteObjectType> extends CPPEntity<T> {
    runtimeLookup(rtConstruct: RuntimeConstruct): CPPObject<T>;
    readonly variableKind: "object";
}

export interface BoundReferenceEntity<T extends ReferenceType = ReferenceType> extends CPPEntity<T> {
    name?: string;
    runtimeLookup<X extends CompleteObjectType>(this: BoundReferenceEntity<ReferenceType<X>>, rtConstruct: RuntimeConstruct): CPPObject<X> | undefined;
    readonly variableKind: "reference";
}

export interface UnboundReferenceEntity<T extends ReferenceType = ReferenceType> extends CPPEntity<T> {
    name?: string;
    bindTo<X extends CompleteObjectType>(this: UnboundReferenceEntity<ReferenceType<X>>, rtConstruct: RuntimeConstruct, obj: CPPObject<X>): void;
}

export function runtimeObjectLookup<T extends CompleteObjectType>(entity: ObjectEntity<T> | BoundReferenceEntity<ReferenceType<T>>, rtConstruct: RuntimeConstruct) {
    if (entity.variableKind === "object") {
        return entity.runtimeLookup(rtConstruct);
    }
    else if (entity.variableKind === "reference") {
        return entity.runtimeLookup(rtConstruct) || assertFalse("Attempted to look up a reference before it was bound.");
    }
    else {
        assertNever(entity);
    }
}

abstract class VariableEntityBase<T extends ObjectEntityType = ObjectEntityType> extends DeclaredEntityBase<T> {
    public readonly declarationKind = "variable";
    public abstract readonly variableKind: "reference" | "object";
    public abstract readonly variableLocation: "local" | "global" | "member";
}

export class LocalObjectEntity<T extends CompleteObjectType = CompleteObjectType> extends VariableEntityBase<T> implements ObjectEntity<T> {
    public readonly variableKind = "object";
    public readonly variableLocation = "local";
    public readonly isParameter: boolean;

    public readonly firstDeclaration: LocalVariableDefinition | ParameterDefinition;
    public readonly declarations: readonly LocalVariableDefinition[] | readonly ParameterDefinition[];
    public readonly definition: LocalVariableDefinition | ParameterDefinition;

    public constructor(type: T, def: LocalVariableDefinition | ParameterDefinition, isParameter: boolean = false) {
        super(type, def.name);
        this.firstDeclaration = def;
        this.declarations = <readonly LocalVariableDefinition[] | readonly ParameterDefinition[]>[def];
        this.definition = def;

        this.isParameter = isParameter;
    }

    public toString() {
        return this.name + " (" + this.type + ")";
    }

    public mergeInto(existingEntity: VariableEntity) {
        // Redeclaration of local is never ok
        return CPPError.declaration.prev_local(this.firstDeclaration, this.name);
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct): AutoObject<T> {
        // TODO: revisit the non-null assertion below
        return rtConstruct.containingRuntimeFunction.stackFrame!.localObjectLookup(this);
    }

    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is LocalObjectEntity<NarrowedT>;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is LocalObjectEntity<NarrowedT> {
        return predicate(this.type);
    }

    public describe() {
        return { name: this.name, message: `the ${this.isParameter ? "parameter" : "local variable"} ${this.name}` };
    }
};

export class LocalReferenceEntity<T extends ReferenceType = ReferenceType> extends VariableEntityBase<T> implements BoundReferenceEntity<T>, UnboundReferenceEntity<T> {
    public readonly variableKind = "reference";
    public readonly variableLocation = "local";
    public readonly isParameter: boolean;

    public readonly firstDeclaration: LocalVariableDefinition | ParameterDefinition;
    public readonly declarations: readonly LocalVariableDefinition[] | readonly ParameterDefinition[];
    public readonly definition: LocalVariableDefinition | ParameterDefinition;
    public readonly name: string;

    public constructor(type: T, def: LocalVariableDefinition | ParameterDefinition, isParameter: boolean = false) {
        super(type, def.name);
        this.name = def.name;
        this.firstDeclaration = def;
        this.declarations = <readonly LocalVariableDefinition[] | readonly ParameterDefinition[]>[def];
        this.definition = def;

        this.isParameter = isParameter;
    }

    public mergeInto(existingEntity: VariableEntity) {
        // Redeclaration of local is never ok
        return CPPError.declaration.prev_local(this.firstDeclaration, this.name);
    }

    public bindTo<X extends CompleteObjectType>(this: LocalReferenceEntity<ReferenceType<X>>, rtConstruct: RuntimeConstruct, obj: CPPObject<X>) {
        rtConstruct.containingRuntimeFunction.stackFrame!.bindLocalReference(this, obj);
    }

    public runtimeLookup<X extends CompleteObjectType>(this: LocalReferenceEntity<ReferenceType<X>>, rtConstruct: RuntimeConstruct): CPPObject<X> | undefined {
        // TODO: revisit the non-null assertions below
        return rtConstruct.containingRuntimeFunction.stackFrame!.localReferenceLookup<X>(this);
    }

    public isTyped<NarrowedT extends ReferenceType>(predicate: (t:ReferenceType) => t is NarrowedT) : this is LocalReferenceEntity<NarrowedT>;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends ReferenceType>(predicate: (t:ReferenceType) => t is NarrowedT) : this is LocalReferenceEntity<NarrowedT> {
        return predicate(this.type);
    }

    public describe() {
        return { name: this.name, message: `the ${this.isParameter ? "reference parameter" : "reference"} ${this.name}` };
    }
};

export class GlobalObjectEntity<T extends CompleteObjectType = CompleteObjectType> extends VariableEntityBase<T> {
    public readonly variableKind = "object";
    public readonly variableLocation = "global";

    public readonly qualifiedName: QualifiedName;
    public readonly firstDeclaration: GlobalVariableDefinition;
    public readonly declarations: readonly GlobalVariableDefinition[];
    public readonly definition?: GlobalVariableDefinition;

    // storage: "static",
    constructor(type: T, decl: GlobalVariableDefinition) {
        super(type, decl.name);
        this.firstDeclaration = decl;
        this.declarations = [decl];
        // Note: this.definition is not set here because it is set later during the linking process.
        // Eventually, this constructor will take in a GlobalObjectDeclaration instead, but that would
        // require support for the extern keyword or static member variables (although that might be
        // a separate class entirely)
        this.qualifiedName = decl.qualifiedName;
    }

    public toString() {
        return this.name + " (" + this.type + ")";
    }

    public mergeInto(existingEntity: VariableEntity): VariableEntity | CompilerNote {
        if (!sameType(this.type, existingEntity.type)) {
            return CPPError.declaration.type_mismatch(this.firstDeclaration, this, existingEntity);
        }
        return mergeDefinitionInto(this, existingEntity) ??
            CPPError.declaration.variable.multiple_def(this.definition!, existingEntity.definition!);
    }

    public registerWithLinker() {
        this.firstDeclaration.context.translationUnit.program.registerGlobalObjectEntity(this);
    }

    public link(def: GlobalVariableDefinition | undefined) {
        assert(!this.definition, "link() should not be called for an entity that is already defined.");
        if (def) {
            (<Mutable<this>>this).definition = def;
        }
        else {
            this.declarations.forEach((decl) => decl.addNote(CPPError.link.def_not_found(decl, this)));
        }

    }

    public runtimeLookup(rtConstruct: RuntimeConstruct): StaticObject<T> {
        return rtConstruct.sim.memory.staticLookup(this);
    }

    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is GlobalObjectEntity<NarrowedT>;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is GlobalObjectEntity<NarrowedT> {
        return predicate(this.type);
    }

    public describe() {
        return { name: this.name, message: "the variable " + this.name };
    }
};


export type VariableEntity<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> = LocalVariableEntity<T> | GlobalVariableEntity<T> | MemberVariableEntity<T>;

export type LocalVariableEntity<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> =
    LocalObjectEntity<Extract<T,CompleteObjectType>> | LocalReferenceEntity<ReferenceType<T>>;
        
export type GlobalVariableEntity<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> =
    GlobalObjectEntity<Extract<T, CompleteObjectType>> | never /*GlobalReferenceEntity<ReferenceType<T>>*/;

export type MemberVariableEntity<T extends PotentiallyCompleteObjectType = PotentiallyCompleteObjectType> = 
    MemberObjectEntity<Extract<T, CompleteObjectType>> | MemberReferenceEntity<ReferenceType<T>>;


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
export class ReturnObjectEntity<T extends CompleteObjectType = CompleteObjectType> extends CPPEntity<T> implements ObjectEntity<T> {
    public readonly variableKind = "object";

    public runtimeLookup(rtConstruct: RuntimeConstruct): CPPObject<T> {
        let returnObject = rtConstruct.containingRuntimeFunction.returnObject;
        if (!returnObject) {
            throw "Error: Runtime lookup performed for the return object of a function, but the return object does not currently exist.";
        }
        return <CPPObject<T>>returnObject;
    }

    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is ReturnObjectEntity<NarrowedT>;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is ReturnObjectEntity<NarrowedT> {
        return predicate(this.type);
    }

    public describe() {
        // TODO: add info about which function? would need to be specified when the return value is created
        return { name: "[return]", message: "the return object" };
    }
};

export class ReturnByReferenceEntity<T extends ReferenceType = ReferenceType> extends CPPEntity<T> implements UnboundReferenceEntity<T> {

    public bindTo<X extends CompleteObjectType>(this: ReturnByReferenceEntity<ReferenceType<X>>, rtConstruct: RuntimeConstruct, obj: CPPObject<X>) {
        // Assume a ReturnByReferenceEntity will only be bound in the context of a return
        // for a return-by-reference function, thus the cast
        let func = <RuntimeFunction<FunctionType<ReferenceType<X>>>>rtConstruct.containingRuntimeFunction;
        func.setReturnObject(<any>obj);
    }

    public isTyped<NarrowedT extends ReferenceType>(predicate: (t:ReferenceType) => t is NarrowedT) : this is ReturnByReferenceEntity<NarrowedT>;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends ReferenceType>(predicate: (t:ReferenceType) => t is NarrowedT) : this is ReturnByReferenceEntity<NarrowedT> {
        return predicate(this.type);
    }

    public describe() {
        // TODO: add info about which function? would need to be specified when the return value is created
        return { name: "[&return]", message: "the object returned by reference" };
    }
};

// TODO: determine what should actually be the base class here
// TODO: I think this should be an object?
// TODO: I don't think this should be an object! Move to runtimeEnvironment.ts?
// TODO: Is this needed? Can wherever uses it just keep track of the actual objects?
// TODO: I added another TODO here because I thought it would be funny
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

export class PassByValueParameterEntity<T extends CompleteObjectType = CompleteObjectType> extends CPPEntity<T> implements ObjectEntity<T> {
    public readonly variableKind = "object";

    public readonly calledFunction: FunctionEntity;
    public readonly type: T;
    public readonly num: number;

    public constructor(calledFunction: FunctionEntity, type: T, num: number) {
        super(type);
        this.calledFunction = calledFunction;
        this.type = type;
        this.num = num;
        assert(sameType(calledFunction.type.paramTypes[num], type), "Inconsistent type for parameter entity.");
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) {

        let pendingCalledFunction = rtConstruct.sim.memory.stack.topFrame()?.func;
        assert(pendingCalledFunction);
        assert(pendingCalledFunction.model === this.calledFunction.definition);

        let paramObj = pendingCalledFunction.getParameterObject(this.num);
        assert(sameType(paramObj.type, this.type));
        return <AutoObject<T>>paramObj;
    }

    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is PassByValueParameterEntity<NarrowedT>;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is PassByValueParameterEntity<NarrowedT> {
        return predicate(this.type);
    }

    public describe() {
        let definition = this.calledFunction.definition;
        if (definition) {
            return definition.parameters[this.num].declaredEntity!.describe();
        }
        else {
            return { name: `Parameter #${this.num + 1}`, message: `Parameter #${this.num + 1} of the called function` };
        }
    }

};

export class PassByReferenceParameterEntity<T extends ReferenceType = ReferenceType> extends CPPEntity<T> implements UnboundReferenceEntity<T> {

    public readonly calledFunction: FunctionEntity;
    public readonly num: number;

    public constructor(calledFunction: FunctionEntity, type: T, num: number) {
        super(type);
        this.calledFunction = calledFunction;
        this.num = num;
        assert(sameType(calledFunction.type.paramTypes[num], type), "Inconsistent type for parameter entity.");
    }

    public bindTo<X extends CompleteObjectType>(this: PassByReferenceParameterEntity<ReferenceType<X>>, rtConstruct: RuntimeConstruct, obj: CPPObject<X>) {
        let pendingCalledFunction = rtConstruct.sim.memory.stack.topFrame()?.func;
        assert(pendingCalledFunction);
        assert(pendingCalledFunction.model === this.calledFunction.definition);

        pendingCalledFunction.bindReferenceParameter(this.num, obj);
    }

    public isTyped<NarrowedT extends ReferenceType>(predicate: (t:ReferenceType) => t is NarrowedT) : this is PassByReferenceParameterEntity<NarrowedT>;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends ReferenceType>(predicate: (t:ReferenceType) => t is NarrowedT) : this is PassByReferenceParameterEntity<NarrowedT> {
        return predicate(this.type);
    }

    public describe() {
        let definition = this.calledFunction.definition;
        if (definition) {
            return definition.parameters[this.num].declaredEntity!.describe();
        }
        else {
            return { name: `Parameter #${this.num + 1}`, message: `Parameter #${this.num + 1} of the called function` };
        }
    }
};

export class ReceiverEntity extends CPPEntity<CompleteClassType> implements ObjectEntity<CompleteClassType> {
    public readonly variableKind = "object";

    constructor(type: CompleteClassType) {
        super(type);
    }

    public toString() {
        return "function receiver (" + this.type + ")";
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) {
        return rtConstruct.contextualReceiver;
    }

    public isTyped<NarrowedT extends CompleteClassType>(predicate: (t:CompleteClassType) => t is NarrowedT) : this is ReceiverEntity;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends CompleteClassType>(predicate: (t:CompleteClassType) => t is NarrowedT) : this is ReceiverEntity {
        return predicate(this.type);
    }

    public describe() {
        // if (rtConstruct){
        //     return {message: "the receiver of this call to " + rtConstruct.containingRuntimeFunction().describe().message + " (i.e. *this) "};
        // }
        // else {
            return {name: "*this", message: "the receiver of this call (i.e. *this)"};
        // }
    }
};


export class NewObjectEntity<T extends NewObjectType = NewObjectType> extends CPPEntity<T> implements ObjectEntity<T> {

    public readonly variableKind = "object";

    public runtimeLookup(rtConstruct: RuntimeConstruct) {
        // no additional runtimeLookup() needed on the object since it will never be a reference
        while (rtConstruct.model.construct_type !== "new_expression" && rtConstruct.parent) {
            rtConstruct = rtConstruct.parent;
        }
        assert(rtConstruct.model.construct_type === "new_expression");
        let newRtConstruct = <RuntimeNewExpression<PointerType<T>>>rtConstruct;
        assert(newRtConstruct.allocatedObject);
        return newRtConstruct.allocatedObject;
    }

    public isTyped<NarrowedT extends NewObjectType>(predicate: (t:NewObjectType) => t is NarrowedT) : this is NewObjectEntity<NarrowedT>;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends NewObjectType>(predicate: (t:NewObjectType) => t is NarrowedT) : this is NewObjectEntity<NarrowedT> {
        return predicate(this.type);
    }

    public describe() {
        return {name: "a new heap object", message: "the dynamically allocated object (of type "+this.type+") created by new"};
    }

};

export class NewArrayEntity<T extends PotentiallyCompleteArrayType = PotentiallyCompleteArrayType> extends CPPEntity<T> {

    public readonly variableKind = "object";

    public runtimeLookup(rtConstruct: RuntimeConstruct) {
        while (rtConstruct.model.construct_type !== "new_array_expression" && rtConstruct.parent) {
            rtConstruct = rtConstruct.parent;
        }
        assert(rtConstruct.model.construct_type === "new_array_expression");
        let newRtConstruct = <RuntimeNewArrayExpression<PointerType<T["elemType"]>>>rtConstruct;
        return newRtConstruct.allocatedObject;
    }

    public isTyped<NarrowedT extends PotentiallyCompleteArrayType>(predicate: (t:PotentiallyCompleteArrayType) => t is NarrowedT) : this is NewArrayEntity<NarrowedT>;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends PotentiallyCompleteArrayType>(predicate: (t:PotentiallyCompleteArrayType) => t is NarrowedT) : this is NewArrayEntity<NarrowedT> {
        return predicate(this.type);
    }

    public describe() {
        return {name: "a new dynamically sized array", message: "the dynamically allocated/sized array (of element type "+this.type+") created by new"};
    }

};

export class ArraySubobjectEntity<T extends ArrayElemType = ArrayElemType> extends CPPEntity<T> implements ObjectEntity<T> {
    public readonly variableKind = "object";

    public readonly arrayEntity: ObjectEntity<BoundedArrayType<T>>;
    public readonly index: number;

    constructor(arrayEntity: ObjectEntity<BoundedArrayType<T>>, index: number) {
        super(arrayEntity.type.elemType);
        this.arrayEntity = arrayEntity;
        this.index = index;
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) {
        return this.arrayEntity.runtimeLookup(rtConstruct).getArrayElemSubobject(this.index);
    }

    public isTyped<NarrowedT extends ArrayElemType>(predicate: (t:ArrayElemType) => t is NarrowedT) : this is ArraySubobjectEntity<NarrowedT>;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends ArrayElemType>(predicate: (t:ArrayElemType) => t is NarrowedT) : this is ArraySubobjectEntity<NarrowedT> {
        return predicate(this.type);
    }

    public describe() {
        let arrDesc = this.arrayEntity.describe();
        return {
            name: arrDesc.name + "[" + this.index + "]",
            message: "element " + this.index + " of " + arrDesc.message
        };
    }
}


export class DynamicLengthArrayNextElementEntity<T extends ArrayElemType = ArrayElemType> extends CPPEntity<T> implements ObjectEntity<T> {
    public readonly variableKind = "object";

    public readonly arrayEntity: NewArrayEntity<ArrayOfUnknownBoundType<T>>;

    constructor(arrayEntity: NewArrayEntity<ArrayOfUnknownBoundType<T>>) {
        super(arrayEntity.type.elemType);
        this.arrayEntity = arrayEntity;
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) {
        while (rtConstruct.model.construct_type !== "new_array_expression" && rtConstruct.parent) {
            rtConstruct = rtConstruct.parent;
        }
        assert(rtConstruct.model.construct_type === "new_array_expression");
        let newRtConstruct = <RuntimeNewArrayExpression<PointerType<T>>>rtConstruct;
        return newRtConstruct.nextElemToInit!;
    }

    public isTyped<NarrowedT extends ArrayElemType>(predicate: (t:ArrayElemType) => t is NarrowedT) : this is ArraySubobjectEntity<NarrowedT>;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends ArrayElemType>(predicate: (t:ArrayElemType) => t is NarrowedT) : this is ArraySubobjectEntity<NarrowedT> {
        return predicate(this.type);
    }

    public describe() {
        let arrDesc = this.arrayEntity.describe();
        return {
            name: arrDesc.name + "[?]",
            message: "the next element of " + arrDesc.message + " to be initialized"
        };
    }
}

export class BaseSubobjectEntity extends CPPEntity<CompleteClassType> implements ObjectEntity<CompleteClassType> {
    public readonly variableKind = "object";

    public readonly containingEntity: ObjectEntity<CompleteClassType>;

    constructor(containingEntity: ObjectEntity<CompleteClassType>, type: CompleteClassType) {
        super(type);
        this.containingEntity = containingEntity;

        // This should always be true as long as we don't allow multiple inheritance
        assert(this.containingEntity.type.classDefinition.baseType?.similarType(type))
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) {
        return this.containingEntity.runtimeLookup(rtConstruct).getBaseSubobject()!;
    }

    public isTyped<NarrowedT extends CompleteClassType>(predicate: (t:CompleteClassType) => t is NarrowedT) : this is BaseSubobjectEntity;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends CompleteClassType>(predicate: (t:CompleteClassType) => t is NarrowedT) : this is BaseSubobjectEntity {
        return predicate(this.type);
    }

    public describe() {
        return {
            name: "the " + this.type.className + " base class of " + this.containingEntity.describe().name,
            message: "the " + this.type.className + " base class subobject of " + this.containingEntity.describe()
        };
    }
}

abstract class MemberVariableEntityBase<T extends ObjectEntityType = ObjectEntityType> extends VariableEntityBase<T> {

    public readonly variableLocation = "member";

    public readonly firstDeclaration: MemberVariableDeclaration;
    public readonly declarations: readonly MemberVariableDeclaration[];
    public readonly definition: undefined; // non-static member variables never have definitions

    public constructor(type: T, decl: MemberVariableDeclaration) {
        super(type, decl.name);
        this.firstDeclaration = decl;
        this.declarations = [decl];
    }

    public toString() {
        return this.name + " (" + this.type + ")";
    }

    public mergeInto(existingEntity: VariableEntity) {
        // Redeclaration of member variable is never ok
        return CPPError.declaration.prev_member(this.firstDeclaration, this.name);
    }

    public describe() {
        return { name: this.name, message: `the member ${this.name}` };
        // if (rtConstruct){
        //     var recObj = rtConstruct.contextualReceiver();
        //     if (recObj.name){
        //         return {message: recObj.name + "." + this.name};
        //     }
        //     else{
        //         return {message: "the member " + this.name + " of " + recObj.describe().message};
        //     }
        // }
        // else{
        //     return {
        //         name: this.memberOfType.className + "." + this.name,
        //         message: "the " + this.name + " member of the " + this.memberOfType.className + " class"
        //     };
        // }
    }
};

export class MemberObjectEntity<T extends CompleteObjectType = CompleteObjectType> extends MemberVariableEntityBase<T> {
    public readonly variableKind = "object";
    
    public runtimeLookup(rtConstruct: RuntimeConstruct) {
        // Cast below should be <CPPObject<T>>, NOT MemberSubobject<T>.
        // See return type and documentation for getMemberObject()
        return <CPPObject<T>>rtConstruct.contextualReceiver.getMemberObject(this.name);
    }

    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is MemberObjectEntity<NarrowedT>;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is MemberObjectEntity<NarrowedT> {
        return predicate(this.type);
    }

}

export class MemberReferenceEntity<T extends ReferenceType = ReferenceType> extends MemberVariableEntityBase<T> implements BoundReferenceEntity<T>, UnboundReferenceEntity<T> {

    public readonly variableKind = "reference";
    

    public runtimeLookup<X extends CompleteObjectType>(this: MemberReferenceEntity<ReferenceType<X>>, rtConstruct: RuntimeConstruct) {
        // Cast below should be <CPPObject<T>>, NOT MemberSubobject<T>.
        // See return type and documentation for getMemberObject()
        return <CPPObject<X>>rtConstruct.contextualReceiver.getMemberObject(this.name);
    }

    public bindTo<X extends CompleteObjectType>(this: MemberReferenceEntity<ReferenceType<X>>, rtConstruct: RuntimeConstruct, obj: CPPObject<X>) {
        rtConstruct.contextualReceiver.bindMemberReference(this.name, obj)
    }

    public isTyped<NarrowedT extends ReferenceType>(predicate: (t:ReferenceType) => t is NarrowedT) : this is MemberReferenceEntity<NarrowedT>;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends ReferenceType>(predicate: (t:ReferenceType) => t is NarrowedT) : this is MemberReferenceEntity<NarrowedT> {
        return predicate(this.type);
    }

};

export class TemporaryObjectEntity<T extends CompleteObjectType = CompleteObjectType> extends CPPEntity<T> implements ObjectEntity<T> {
    public readonly variableKind = "object";
    protected static readonly _name = "TemporaryObjectEntity";
    // storage: "temp",

    public readonly creator: PotentialFullExpression | FunctionCall;
    public readonly owner: PotentialFullExpression | FunctionCall;
    public readonly name: string;

    constructor(type: T, creator: PotentialFullExpression | FunctionCall, owner: PotentialFullExpression | FunctionCall, name: string) {
        super(type);
        this.creator = creator;
        this.owner = owner;
        this.name = name;
    }

    public setOwner(newOwner: PotentialFullExpression | FunctionCall) {
        (<Mutable<this>>this).owner = newOwner;
    }

    public objectInstance(creatorRt: RuntimePotentialFullExpression) {

        let objInst: TemporaryObject<T> = creatorRt.sim.memory.allocateTemporaryObject(this);

        let owner = creatorRt.containingFullExpression;
        owner.temporaryObjects[this.entityId] = objInst;
        return objInst;
    }

    public runtimeLookup(rtConstruct: RuntimeConstruct) {
        // Some hacky casts and assertions in this implementation
        // if (!(rtConstruct instanceof RuntimePotentialFullExpression)) { // removed since it causes an issue with a circular import dependency
        //     return assertFalse();
        // }
        return <TemporaryObject<T>>(<RuntimePotentialFullExpression>rtConstruct).containingFullExpression.temporaryObjects[this.entityId];
    }

    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is TemporaryObjectEntity<NarrowedT>;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends CompleteObjectType>(predicate: (t:CompleteObjectType) => t is NarrowedT) : this is TemporaryObjectEntity<NarrowedT> {
        return predicate(this.type);
    }

    public describe() {
        return { name: this.name, message: this.name }; // TOOD: eventually change implementation when I remove name
    }

}


let FE_overrideID = 0;
export class FunctionEntity<T extends FunctionType = FunctionType> extends DeclaredEntityBase<T> {
    public readonly declarationKind = "function";

    public readonly qualifiedName: QualifiedName;
    public readonly firstDeclaration: FunctionDeclaration;
    public readonly declarations: readonly FunctionDeclaration[];
    public readonly definition?: FunctionDefinition;

    public readonly isMemberFunction: boolean;
    public readonly isVirtual: boolean;
    public readonly isPureVirtual: boolean;
    public readonly isConstructor: boolean;
    public readonly isDestructor: boolean;

    public readonly isOdrUsed: boolean = false;

    public readonly isImplicit: boolean;
    public readonly isUserDefined: boolean;

    public readonly overrideID: number;

    public readonly overriders: {
        [index: string]: FunctionEntity;
    } = {};
    public readonly overrideTarget?: FunctionEntity;

    // storage: "static",
    constructor(type: T, decl: FunctionDeclaration) {
        super(type, decl.name);
        this.firstDeclaration = decl;
        this.declarations = [decl];
        this.isMemberFunction = decl.isMemberFunction;
        this.isVirtual = decl.isVirtual;
        this.isPureVirtual = false;
        this.isConstructor = decl.isConstructor;
        this.isDestructor = decl.isDestructor;
        this.qualifiedName = decl.qualifiedName;

        this.isImplicit = !!decl.context.implicit;
        this.isUserDefined = !decl.context.implicit;

        this.overrideID = FE_overrideID++;
        if (this.isMemberFunction) {
            assert(isClassContext(decl.context));
            this.overriders[decl.context.containingClass.qualifiedName.str] = this;
        }
    }

    public addDeclaration(decl: FunctionDeclaration) {
        asMutable(this.declarations).push(decl);
    }

    public addDeclarations(decls: readonly FunctionDeclaration[]) {
        decls.forEach((decl) => asMutable(this.declarations).push(decl));
    }

    public toString() {
        return this.name;
    }

    public registerOverrider(containingClass: ClassEntity, overrider: FunctionEntity) {
        this.overriders[containingClass.qualifiedName.str] = overrider;
        this.overrideTarget?.registerOverrider(containingClass, overrider);
    }

    public setOverrideTarget(target: FunctionEntity) {
        assert(!this.overrideTarget, "A single FunctionEntity may not have multiple override targets.")
        asMutable(this).overrideTarget = target;

    }

    public mergeInto(overloadGroup: FunctionOverloadGroup): FunctionEntity | CompilerNote {
        //check each other function found
        let matchingFunction = overloadGroup.selectOverloadBySignature(this.type);

        if (!matchingFunction) {
            // If none were found with the same signature, this is a new overload, so go ahead and add it
            overloadGroup.addOverload(this);
            return this;
        }

        // If they have mismatched return types, that's a problem.
        if (!this.type.sameReturnType(matchingFunction.type)) {
            return CPPError.declaration.func.returnTypesMatch([this.firstDeclaration, matchingFunction.firstDeclaration], this.name);
        }

        // As a sanity check, make sure they're the same type.
        // But this should already be true, given that they have the same signature and return type.
        if (!sameType(this.type, matchingFunction.type)) {
            return CPPError.declaration.type_mismatch(this.firstDeclaration, this, matchingFunction);
        }

        matchingFunction.addDeclarations(this.declarations);

        return mergeDefinitionInto(this, matchingFunction) ??
            CPPError.declaration.func.multiple_def(this.definition!, matchingFunction.definition!);
    }

    public setDefinition(def: FunctionDefinition) {
        if (!this.definition) {
            (<Mutable<this>>this).definition = def;
        }
        else {
            def.addNote(CPPError.declaration.func.multiple_def(def, this.definition));
        }
    }

    public registerWithLinker() {
        this.firstDeclaration.context.program.registerFunctionEntity(this);
    }

    public link(def: FunctionDefinitionGroup | undefined) {
        assert(!this.definition, "link() should not be called for an entity that is already defined.");

        if (def) {
            // found an overload group of function definitions, check for one
            // with matching signature to the given linked entity
            let overload = selectOverloadedDefinition(def.definitions, this.type);
            if (!overload) {
                if (this.isOdrUsed) {
                    this.declarations.forEach((decl) => decl.addNote(CPPError.link.func.no_matching_overload(decl, this)));
                }
                return;
            }

            // check return type
            if (!this.type.sameReturnType(overload.declaration.type)) {
                this.declarations.forEach((decl) => decl.addNote(CPPError.link.func.returnTypesMatch(decl, this)));
                return;
            }

            (<Mutable<this>>this).definition = overload;
        }
        else {
            if (this.isMemberFunction && this.isVirtual && !this.isPureVirtual) {
                // All (non-pure) virtual functions must have a definition
                this.declarations.forEach((decl) => decl.addNote(CPPError.link.func.virtual_def_required(decl, this)));
            }
            else if (this.isOdrUsed) {
                // Functions that are ODR-used must have a definition
                this.declarations.forEach((decl) => decl.addNote(CPPError.link.func.def_not_found(decl, this)));
            }
            // Otherwise, it's ok for the function to not have a definition because it is never used
        }

    }

    public isMain() {
        return this.qualifiedName.str === "main";
    }

    public getDynamicallyBoundFunction(receiver: CPPObject<CompleteClassType> | undefined) {
        if (!this.isVirtual) {
            assert(this.definition, "non virtual function must have a definition!");
            return this.definition;
        }
        else {
            assert(receiver, "virtual function dynamic binding requires a receiver");
            while (receiver.isBaseSubobject()) {
                receiver = receiver.containingObject;
            }
            let dynamicType: CompleteClassType | undefined = receiver.type;
            let finalOverrider: FunctionEntity | undefined;
            while (!finalOverrider && dynamicType) {
                finalOverrider = this.overriders[dynamicType.qualifiedName.str];
                dynamicType = dynamicType.classDefinition.baseType;
            }
            return finalOverrider?.definition || this.definition;
        }
    }

    public registerCall(call: FunctionCall) {
        (<Mutable<this>>this).isOdrUsed = true;
    }

    public returnsVoid() : this is FunctionEntity<FunctionType<VoidType>> {
        return this.type.returnType.isVoidType();
    }

    public returnsCompleteType() : this is FunctionEntity<FunctionType<CompleteReturnType>> {
        return this.type.returnType.isCompleteReturnType();
    }

    public isTyped<NarrowedT extends FunctionType>(predicate: (t:FunctionType) => t is NarrowedT) : this is FunctionEntity<NarrowedT>;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends FunctionType>(predicate: (t:FunctionType) => t is NarrowedT) : this is FunctionEntity<NarrowedT> {
        return predicate(this.type);
    }

    public describe(): EntityDescription {
        return {
            name: this.name,
            message: `the ${this.name} function`
        };
    }
}

export class ClassEntity extends DeclaredEntityBase<PotentiallyCompleteClassType> {
    public readonly declarationKind = "class";

    public readonly qualifiedName: QualifiedName;
    public readonly firstDeclaration: ClassDeclaration;
    public readonly declarations: readonly ClassDeclaration[];
    public readonly definition?: ClassDefinition;

    public constructor(decl: ClassDeclaration) {

        // Ask the type system for the appropriate type.
        // Because Lobster only supports mechanisms for class declaration that yield
        // classes with external linkage, it is sufficient to use the fully qualified
        // class name to distinguish types from each other.

        super(createClassType(decl.name, decl.qualifiedName), decl.name);
        this.firstDeclaration = decl;
        this.declarations = [decl];
        this.qualifiedName = decl.qualifiedName;
    }

    public isComplete() : this is CompleteClassEntity {
        return !!this.definition && this.type.isCompleteClassType();
    }

    public toString() {
        return this.name;
    }

    public addDeclaration(decl: ClassDeclaration) {
        asMutable(this.declarations).push(decl);
    }

    public addDeclarations(decls: readonly ClassDeclaration[]) {
        decls.forEach((decl) => asMutable(this.declarations).push(decl));
    }

    /**
     * Merge this class entity into a previous existing class entity.
     * If exactly one of the entities has a definition, the other one assumes
     * that definition as well. If both have a definition, an error is returned
     * unless the two are literally the same definition. (Note that an error
     * is thrown in the case of separate definitions with the same exact source
     * tokens, because the use of `mergeInto` means these definitions occur in the
     * same translation unit, which is prohibited.)
     * @param existingEntity
     */
    public mergeInto(existingEntity: ClassEntity) {

        existingEntity.addDeclarations(this.declarations);

        return mergeDefinitionInto(this, existingEntity) ??
            CPPError.declaration.classes.multiple_def(this.definition!, existingEntity.definition!);
    }

    public setDefinition(def: ClassDefinition) {
        if (!this.definition) {
            (<Mutable<this>>this).definition = def;
            this.type.setDefinition(def);
        }
        else {
            def.addNote(CPPError.declaration.classes.multiple_def(def, this.definition));
        }
    }

    public registerWithLinker() {
        this.firstDeclaration.context.translationUnit.program.registerClassEntity(this);
    }

    public link(def: ClassDefinition | undefined) {
        assert(!this.definition, "link() should not be called for an entity that is already defined.");
        if (def) {
            this.setDefinition(def);
        }
        else {
            this.declarations.forEach((decl) => decl.addNote(CPPError.link.classes.def_not_found(decl, this)));
        }
    }

    public isTyped<NarrowedT extends PotentiallyCompleteClassType>(predicate: (t:PotentiallyCompleteClassType) => t is NarrowedT) : this is ClassEntity;
    public isTyped<NarrowedT extends Type>(predicate: (t:Type) => t is NarrowedT) : this is never;
    public isTyped<NarrowedT extends PotentiallyCompleteClassType>(predicate: (t:PotentiallyCompleteClassType) => t is NarrowedT) : this is ClassEntity {
        return predicate(this.type);
    }

    public describe(): EntityDescription {
        return {
            name: this.name,
            message: `the ${this.name} function`
        };
    }
}

export interface CompleteClassEntity extends ClassEntity {
    readonly type: CompleteClassType;
    readonly definition: ClassDefinition;
}


// export class MagicFunctionEntity extends FunctionEntity {
//     public constructor(decl: SimpleDeclaration) {
//         super(decl);
//         this.setDefinition(decl);
//     }

//     public describe() {
//         return {message: "no description available"};
//     }
// }



function convLen(args: readonly Expression[]) {
    return args.reduce((res, exp) => res + exp.conversionLength, 0);
};

// Selects from candidates the function that is the best match
// for the arguments in the args array. Also modifies args so
// that each argument is amended with any implicit conversions
// necessary for the match.
// Options:
//   problems - an array that will be filled with an entry for each candidate
//              consisting of an array of any semantic problems that prevent it
//              from being chosen.






/**
 * Selects a function from the given overload group based on the signature of
 * the provided function type. (Note there's no consideration of function names here.)
 */
export function selectOverloadedDefinition(overloadGroup: readonly FunctionDefinition[], type: FunctionType) {
    return overloadGroup.find(func => type.sameSignature(func.declaration.type));
}




