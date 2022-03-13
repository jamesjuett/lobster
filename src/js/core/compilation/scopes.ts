import { CompilerNote } from "./errors";
import { UnqualifiedName } from "./lexical";
import { TranslationUnit } from "./Program";
import { CompleteClassType, PotentialParameterType } from "./types";
import { assert } from "../../util/util";
import { CPPError } from "./errors";
import { VariableEntity, FunctionEntity, ClassEntity, FunctionOverloadGroup, GlobalObjectEntity } from "./entities";

interface NormalLookupOptions {
    readonly kind: "normal";
    readonly noParent?: boolean;
    readonly noBase?: boolean;
}
interface ExactLookupOptions {
    readonly kind: "exact";
    readonly noParent?: boolean;
    readonly noBase?: boolean;
    readonly paramTypes: readonly PotentialParameterType[];
    readonly receiverType?: CompleteClassType;
}

export type NameLookupOptions = NormalLookupOptions | ExactLookupOptions;
/**
 * Discriminated union over entities introduced into a scope by a declaration.
 * Discriminated by .declarationKind property.
 */


export type DeclaredEntity = VariableEntity | FunctionEntity | ClassEntity;
/**
 * Possible results of name lookup.
 */

export type DeclaredScopeEntry = VariableEntity | FunctionOverloadGroup | ClassEntity;


export class Scope {

    // private static HIDDEN = Symbol("HIDDEN");
    // private static NO_MATCH = Symbol("NO_MATCH");
    private readonly entities: { [index: string]: DeclaredScopeEntry | undefined; } = {};
    private readonly hiddenClassEntities: { [index: string]: ClassEntity | undefined; } = {};
    private readonly typeEntities: { [index: string]: ClassEntity | undefined; } = {};

    public readonly translationUnit: TranslationUnit;
    public readonly parents: readonly Scope[];
    public readonly name?: string;
    public readonly children: { [index: string]: NamedScope | undefined; } = {};

    public constructor(translationUnit: TranslationUnit, parent?: Scope) {
        // This assertion is no longer always true due to out-of-line function definitions
        // assert(!parent || translationUnit === parent.translationUnit);
        this.translationUnit = translationUnit;
        this.parents = parent ? [parent] : [];
    }

    public addChild(child: NamedScope) {
        this.children[child.name] = child;
    }

    /** Attempts to declare a variable in this scope.
     * @param newEntity The variable being declared.
     * @returns Either the entity that was added, or an existing one already there, assuming it was compatible.
     * If an error prevents the entity being added successfully, returns the error instead. (e.g. A previous
     * declaration with the same name but a different type.)
     */
    public declareVariableEntity<EntityT extends VariableEntity>(newEntity: EntityT): EntityT | CompilerNote {
        let entityName = newEntity.name;
        let existingEntity = this.entities[entityName];

        // No previous declaration for this name
        if (!existingEntity) {
            this.entities[entityName] = <any>newEntity; // HACK. <any> cast - this broke with TS 4.4.4
            this.variableEntityCreated(newEntity);
            newEntity.setSuccessfullyDeclared();
            return newEntity;
        }

        // If there is an existing class entity, it may be displaced and effectively hidden.
        if (existingEntity.declarationKind === "class") {
            // Note: because a class entity cannot displace another class entity, we can
            // assume that there is no hidden class entity already
            this.entities[entityName] = <any>newEntity; // HACK. <any> cast - this broke with TS 4.4.4
            this.hiddenClassEntities[entityName] = existingEntity;
            this.variableEntityCreated(newEntity);
            newEntity.setSuccessfullyDeclared();
            return newEntity;
        }

        // Previous declaration for this name, but different kind of symbol
        if (existingEntity.declarationKind !== "variable") {
            return CPPError.declaration.symbol_mismatch(newEntity.firstDeclaration, newEntity);
        }

        // Previous declaration of variable with same name, attempt to merge
        let entityOrError = newEntity.mergeInto(existingEntity);

        // If we didn't get an error, make sure the entity is marked as successfully declared
        if (!(entityOrError instanceof CompilerNote)) {
            entityOrError.setSuccessfullyDeclared();
        }

        // If we got the new entity back, it means it was added to the scope for the first time
        if (entityOrError === newEntity) {
            this.variableEntityCreated(newEntity);
        }

        // Cast below is based on trusting mergeInto will only ever return the
        // existing entity if the types and types of entities matched.
        return <EntityT | CompilerNote>entityOrError;
    }

    protected variableEntityCreated(newEntity: VariableEntity) {
        // Do nothing. Subclasses may choose to register entities.
        // e.g. Namespace scopes will register global object entities with linker.
    }

    /** Attempts to declare a function in this scope.
     * @param newEntity - The function being declared.
     * @returns Either the entity that was added, or an existing one already there, assuming it was compatible.
     * If an error prevents the entity being added successfully, returns the error instead. (e.g. A previous
     * function declaration with the same signature but a different return type.)
     */
    public declareFunctionEntity(newEntity: FunctionEntity) {
        let entityName = newEntity.name;
        let existingEntity = this.entities[entityName];

        // No previous declaration for this name
        if (!existingEntity) {
            this.entities[entityName] = new FunctionOverloadGroup([newEntity]);
            newEntity.setSuccessfullyDeclared();
            return newEntity;
        }

        // If there is an existing class entity, it may be displaced and effectively hidden.
        if (existingEntity.declarationKind === "class") {
            // Note: because a class entity cannot displace another class entity, we can
            // assume that there is no hidden class entity already
            this.hiddenClassEntities[entityName] = existingEntity;
            this.entities[entityName] = new FunctionOverloadGroup([newEntity]);
            newEntity.setSuccessfullyDeclared();
            return newEntity;
        }

        // Previous declaration for this name, but different kind of symbol
        if (!(existingEntity instanceof FunctionOverloadGroup)) {
            return CPPError.declaration.symbol_mismatch(newEntity.firstDeclaration, newEntity);
        }

        // Function overload group of previously existing functions, attempt to merge
        let entityOrError = newEntity.mergeInto(existingEntity);

        // If we didn't get an error, make sure the entity is marked as successfully declared
        if (!(entityOrError instanceof CompilerNote)) {
            entityOrError.setSuccessfullyDeclared();
        }

        return entityOrError;
    }

    /** Attempts to declare a class in this scope. TODO docs: this documentation is out of date
     * @param newEntity - The class being declared.
     * @returns Either the entity that was added, or an existing one already there, assuming it was compatible.
     * If an error prevents the entity being added successfully. (e.g. An error due to
     * multiple definitions of the same class within a single translation unit.)
     */
    public declareClassEntity(newEntity: ClassEntity) {
        let entityName = newEntity.name;
        let existingEntity = this.entities[entityName];

        // No previous declaration for this name
        if (!existingEntity) {
            this.entities[entityName] = newEntity;
            this.classEntityCreated(newEntity);
            newEntity.setSuccessfullyDeclared();
            return newEntity;
        }

        // Previous declaration for this name, but different kind of symbol
        if (!(existingEntity instanceof ClassEntity)) {
            return CPPError.declaration.symbol_mismatch(newEntity.firstDeclaration, newEntity);
        }

        // Note that we don't displace existing class entities as new variables or functions do.
        // Instead, either the new/existing class entities are compatible (i.e. they do result in
        // a multiple definition error), or they will generate an error.
        // There was a previous class declaration, attempt to merge
        let entityOrError = newEntity.mergeInto(existingEntity);
        
        // If we didn't get an error, make sure the entity is marked as successfully declared
        if (!(entityOrError instanceof CompilerNote)) {
            entityOrError.setSuccessfullyDeclared();
        }

        // If we got the new entity back, it means it was added to the scope for the first time
        if (entityOrError === newEntity) {
            this.classEntityCreated(newEntity);
        }

        return entityOrError;
    }

    protected classEntityCreated(newEntity: ClassEntity) {
        // A function declaration has linkage. The linkage is presumed to be external, because Lobster does not
        // support using the static keyword or unnamed namespaces to specify internal linkage.
        // It has linkage regardless of whether this is a namespace scope or a block scope.
        newEntity.registerWithLinker();
    }

    /**
     * Performs unqualified name lookup of a given name in this scope. Returns the entity found, or undefined
     * if no entity can be found. Note that the entity found may be a function overload group. Lookup may
     * may search through parent scopes. The lookup process can be customized by providing a set of `NameLookupOptions` (
     * see documentation for the `NameLookupOptions` type for more details.) If the entity found is not a
     * function overload group, "normal" lookup is the same as "exact lookup" (the contextual parameter types
     * and receiver type are ignored at that point even if provided.)
     * @param name An unqualified name to be looked up.
     * @param options A set of options to customize the lookup process.
     * @returns
     */
    public lookup(name: UnqualifiedName, options: NameLookupOptions = { kind: "normal" }): DeclaredScopeEntry | undefined {
        options = options || {};

        assert(!name.includes("::"), "Qualified name used with unqualified lookup function.");

        // Note: We do not need to check this.hiddenClassEntities here. If a class entity
        // is hidden by another entity of the same name in the same scope, the only way to
        // access it is through an elaborated type specifier
        let ent = this.entities[name];

        // If we don't have an entity in this scope and we didn't specify we
        // wanted an own entity, look in parent scopes (if there are any)
        if (!ent && !options.noParent && this.parents.length > 0) {
            return this.parentLookup(name, options)
        }

        // If we didn't find anything, return undefined
        if (!ent) {
            return undefined;
        }

        if (!(ent instanceof FunctionOverloadGroup)) {
            // If it's not an function overload group, it's a single entity so return it
            return ent;
        }
        else {
            let viable = ent.overloads; // a set of potentially viable function overloads


            // If we're looking for an exact match of parameter types
            if (options.kind === "exact") {
                const paramTypes = options.paramTypes;
                const receiverType = options.receiverType;
                viable = ent.overloads.filter((cand) => {

                    // Check that parameter types match
                    if (cand.type.sameParamTypes(paramTypes)) {
                        if (receiverType) {
                            // if receiver type is defined, candidate must also have
                            // a receiver and the presence/absence of const must match
                            // NOTE: the actual receiver type does not need to match, just the constness
                            return cand.type.receiverType && receiverType.isConst === cand.type.isConst;
                        }
                        else {
                            // if no receiver type is defined, candidate must not have a receiver
                            return !cand.type.receiverType;
                        }
                    }
                    else {
                        return false;
                    }
                });

                if (viable.length > 0) {
                    return new FunctionOverloadGroup(viable);
                }
                else {
                    return undefined;
                }
            }

            // // If we're looking for something that could be called with given parameter types, including conversions
            // else if (options.paramTypes) {
            //     // var params = options.params || options.paramTypes && fakeExpressionsFromTypes(options.paramTypes);
            //     viable = overloadResolution(ent, options.paramTypes, options.receiverType).viable || [];
            //     return viable[0];
            //     // TODO - should give error if there's multiple elements i.e. an ambiguity
            // }
            return new FunctionOverloadGroup(viable);

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
    }

    protected parentLookup(name: UnqualifiedName, options: NameLookupOptions = { kind: "normal" }): DeclaredScopeEntry | undefined {
        for(let i = 0; i < this.parents.length; ++i) {
            const res = this.parents[i].lookup(name, Object.assign({}, options));
            if (res) {
                return res;
            }
        }
        return undefined; // no parents yielded a result
    }

    public availableVars(): VariableEntity[] {
        let vars: VariableEntity[] = [];
        Object.values(this.entities).forEach(
            entity => entity?.declarationKind === "variable" && vars.push(entity)
        );
        return vars.concat(...this.parents.map(parent => parent.availableVars()));
    }

    public createAlternateParentProxy(newParent: Scope) {
        let proxy = Object.create(this);
        proxy.parent = newParent;
        return proxy;
    }
}

export class BlockScope extends Scope {
}


export class NamedScope extends Scope {

    public readonly name: string;

    public constructor(translationUnit: TranslationUnit, name: string, parent?: Scope) {
        super(translationUnit, parent);
        this.name = name;
        if (parent) {
            parent.addChild(this);
        }
    }
}

export class NamespaceScope extends NamedScope {

    public constructor(translationUnit: TranslationUnit, name: string, parent?: NamespaceScope) {
        super(translationUnit, name, parent);
    }

    protected variableEntityCreated(newEntity: VariableEntity) {
        super.variableEntityCreated(newEntity);
        if (newEntity instanceof GlobalObjectEntity) {
            this.translationUnit.context.program.registerGlobalObjectEntity(newEntity);
        }
    }
}

export class ClassScope extends NamedScope {

    public readonly base?: ClassScope;

    /**
     *
     * @param translationUnit
     * @param name The unqualified name of the class
     * @param parent
     * @param base
     */
    public constructor(translationUnit: TranslationUnit, name: string, parent?: Scope | ClassScope, base?: ClassScope) {
        super(translationUnit, name, parent);
        this.base = base;
    }

    protected variableEntityCreated(newEntity: VariableEntity) {
        super.variableEntityCreated(newEntity);
        // TODO: add linkage when static members are implemented
        // if (newEntity instanceof StaticMemberObjectEntity) {
        //     this.translationUnit.context.program.registerGlobalObjectEntity(newEntity);
        // }
    }

    /**
     * Performs unqualified name lookup of a given name in this class scope. The
     * behavior and customization options are similar to `lookup()` in the Scope
     * class, except that the base class scope (if it exists) will be searched
     * before parent scopes.
     * @param name An unqualified name to be looked up.
     * @param options A set of options to customize the lookup process.
     */
    public lookup(name: string, options: NameLookupOptions = { kind: "normal" }): DeclaredScopeEntry | undefined {
        let ownMember = super.lookup(name, Object.assign({}, options, { noBase: true, noParent: true }));
        if (ownMember) {
            return ownMember;
        }

        let baseMember = this.base && !options.noBase && this.base.lookup(name, Object.assign({}, options, { noParent: true }));
        if (baseMember) {
            return baseMember;
        }

        let parentMember = this.parents.length > 0 && !options.noParent && this.parentLookup(name, Object.assign({}, options, { noBase: true }));
        if (parentMember) {
            return parentMember;
        }

        return undefined;
    }
}
