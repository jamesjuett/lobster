import { CtorInitializerASTNode } from "../../../ast/ast_declarations";
import { asMutable, assert } from "../../../util/util";
import { ArrayMemberInitializerOutlet, ConstructOutlet, CtorInitializerOutlet } from "../../../view/codeOutlets";
import { areAllSemanticallyEquivalent, createImplicitContext, MemberBlockContext, SemanticContext, TranslationUnitContext } from "../../compilation/contexts";
import { ArraySubobjectEntity, BaseSubobjectEntity, MemberObjectEntity, ReceiverEntity } from "../../compilation/entities";
import { CPPError } from "../../compilation/errors";
import { CPPObject } from "../../objects";
import { OpaqueExpression } from "../../opaqueExpression";
import { AnalyticConstruct } from "../../predicates";
import { CompiledTemporaryDeallocator } from "../../TemporaryDeallocator";
import { AtomicType, BoundedArrayType, CompleteClassType, isBoundedArrayType } from "../../types";
import { BasicCPPConstruct, RuntimeConstruct, SuccessfullyCompiled } from "../constructs";
import { Expression } from "../expressions/Expression";
import { AnalyticExpression, createExpressionFromAST } from "../expressions/expressions";
import { ClassDefaultInitializer, CompiledClassDefaultInitializer, CompiledDefaultInitializer, DefaultInitializer, RuntimeClassDefaultInitializer, RuntimeDefaultInitializer } from "./DefaultInitializer";
import { ClassDirectInitializer, CompiledClassDirectInitializer, CompiledDirectInitializer, DirectInitializer, RuntimeClassDirectInitializer, RuntimeDirectInitializer } from "./DirectInitializer";
import { Initializer, RuntimeInitializer } from "./Initializer";
import { ClassValueInitializer, ValueInitializer } from "./ValueInitializer";

type DelegatedConstructorCtorInitializerComponent = {
    kind: "delegatedConstructor";
    args: readonly Expression[];
};
type BaseCtorInitializerComponent = {
    kind: "base";
    args: readonly Expression[];
};
type MemberCtorInitializerComponent = {
    kind: "member";
    name: string;
    args: readonly Expression[];
};
type CtorInitializerComponent =
    DelegatedConstructorCtorInitializerComponent |
    BaseCtorInitializerComponent |
    MemberCtorInitializerComponent;

export type MemberInitializer = DefaultInitializer | ValueInitializer | DirectInitializer | ArrayMemberInitializer;
type BaseOrDelegateInitializer = ClassDefaultInitializer | ClassValueInitializer | ClassDirectInitializer;

export class CtorInitializer extends BasicCPPConstruct<MemberBlockContext, CtorInitializerASTNode> {
    public readonly construct_type = "ctor_initializer";

    public readonly target: ReceiverEntity;

    public readonly delegatedConstructorInitializer?: BaseOrDelegateInitializer;
    public readonly baseInitializer?: BaseOrDelegateInitializer;
    public readonly memberInitializers: readonly MemberInitializer[] = [];
    public readonly memberInitializersByName: { [index: string]: MemberInitializer | undefined; } = {};

    public static createFromAST(ast: CtorInitializerASTNode, context: MemberBlockContext) {
        return new CtorInitializer(context, ast, ast.initializers.map(memInitAST => {
            let receiverType = context.contextualReceiverType;
            let baseType = receiverType.classDefinition.baseType;

            let memName = memInitAST.member.identifier;
            let args = memInitAST.args.map(argAST => createExpressionFromAST(argAST, context));

            if (memName === receiverType.className) {
                return <DelegatedConstructorCtorInitializerComponent>{
                    kind: "delegatedConstructor",
                    args: args
                };
            }
            else if (baseType && memName === baseType.className) {
                return <BaseCtorInitializerComponent>{
                    kind: "base",
                    args: args
                };
            }
            else {
                return <MemberCtorInitializerComponent>{
                    kind: "member",
                    name: memName,
                    args: args
                };
            }
        }));
    }

    public constructor(context: MemberBlockContext, ast: CtorInitializerASTNode | undefined, components: readonly CtorInitializerComponent[]) {
        super(context, ast);

        let receiverType = context.contextualReceiverType;

        this.target = new ReceiverEntity(receiverType);

        let baseType = receiverType.classDefinition.baseType;


        assert(context.containingFunction.firstDeclaration.isConstructor);

        // Initial processing of ctor initializer components list
        for (let i = 0; i < components.length; ++i) {
            let comp = components[i];
            if (comp.kind === "delegatedConstructor") {

                let delegatedCtor = comp.args.length === 0
                    ? new ClassValueInitializer(context, this.target)
                    : new ClassDirectInitializer(context, this.target, comp.args, "direct");
                this.attach(delegatedCtor);

                if (this.delegatedConstructorInitializer) {
                    delegatedCtor.addNote(CPPError.declaration.ctor.init.multiple_delegates(delegatedCtor));
                }
                else {
                    this.delegatedConstructorInitializer = delegatedCtor;
                    if (components.length > 1) {
                        // If there's a delegating constructor call, no other initializers are allowed
                        delegatedCtor.addNote(CPPError.declaration.ctor.init.delegate_only(delegatedCtor));
                    }
                }
            }
            else if (comp.kind === "base") {
                // Theoretically we shouldn't have a base init provided if
                // there wasn't a base class to match the name of the init against
                assert(baseType);

                let baseInit = comp.args.length === 0
                    ? new ClassValueInitializer(context, new BaseSubobjectEntity(this.target, baseType))
                    : new ClassDirectInitializer(context, new BaseSubobjectEntity(this.target, baseType), comp.args, "direct");
                this.attach(baseInit);

                if (!this.baseInitializer) {
                    this.baseInitializer = baseInit;
                }
                else {
                    baseInit.addNote(CPPError.declaration.ctor.init.multiple_base_inits(baseInit));
                }
            }
            else {
                let memName = comp.name;
                let memEntity = receiverType.classDefinition.memberVariableEntitiesByName[memName];
                if (memEntity) {
                    let memInit: MemberInitializer | undefined;
                    if (memEntity.isTyped(isBoundedArrayType) && comp.args.length === 1) {
                        let arg = <AnalyticExpression>comp.args[0];
                        if (arg.construct_type === "dot_expression"
                            && arg.entity?.declarationKind === "variable"
                            && arg.entity.variableKind === "object"
                            && arg.entity?.isTyped(isBoundedArrayType)) {
                            // if it's e.g. of the form "other.arr"
                            memInit = new ArrayMemberInitializer(
                                context,
                                memEntity,
                                arg.entity
                            );
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
                        this.addNote(CPPError.declaration.ctor.init.multiple_member_inits(this));
                    }
                }
                else {
                    this.addNote(CPPError.declaration.ctor.init.improper_name(this, receiverType, memName));
                }
            }
        }

        // If there's a base class and no explicit base initializer, add a default one
        if (baseType && !this.baseInitializer) {
            this.baseInitializer = new ClassDefaultInitializer(createImplicitContext(context), new BaseSubobjectEntity(this.target, baseType));
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
            asMutable(this.memberInitializers).push(memInit);
        });

        // TODO out of order warnings
    }

    public createRuntimeCtorInitializer(this: CompiledCtorInitializer, parent: RuntimeConstruct): RuntimeCtorInitializer {
        return new RuntimeCtorInitializer(this, parent);
    }

    public createDefaultOutlet(this: CompiledCtorInitializer, element: JQuery, parent?: ConstructOutlet) {
        return new CtorInitializerOutlet(element, this, parent);
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, ec: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && areAllSemanticallyEquivalent(this.children, other.children, ec);
        // TODO semantic equivalence
    }
}

export interface CompiledCtorInitializer extends CtorInitializer, SuccessfullyCompiled {

    readonly delegatedConstructorInitializer?: CompiledClassDirectInitializer;
    readonly baseInitializer?: CompiledClassDefaultInitializer | CompiledClassDirectInitializer;
    readonly memberInitializers: readonly (CompiledDefaultInitializer | CompiledDirectInitializer)[];
    readonly memberInitializersByName: { [index: string]: CompiledClassDefaultInitializer | CompiledDirectInitializer | undefined; };
}
const INDEX_CTOR_INITIALIZER_DELEGATE = 0;
const INDEX_CTOR_INITIALIZER_BASE = 1;
const INDEX_CTOR_INITIALIZER_MEMBERS = 2;
export class RuntimeCtorInitializer extends RuntimeConstruct<CompiledCtorInitializer> {

    public readonly delegatedConstructorInitializer?: RuntimeClassDirectInitializer;
    public readonly baseInitializer?: RuntimeClassDefaultInitializer | RuntimeClassDirectInitializer;
    public readonly memberInitializers: readonly (RuntimeDefaultInitializer | RuntimeDirectInitializer)[];

    private index: number;
    private memberIndex = 0;

    public constructor(model: CompiledCtorInitializer, parent: RuntimeConstruct) {
        super(model, "ctor-initializer", parent);
        this.delegatedConstructorInitializer = this.model.delegatedConstructorInitializer?.createRuntimeInitializer(this);

        // Dummy ternary needed by type system due to union and this parameter shenanagins
        this.baseInitializer = this.model.baseInitializer instanceof ClassDefaultInitializer ?
            this.model.baseInitializer?.createRuntimeInitializer(this) :
            this.model.baseInitializer?.createRuntimeInitializer(this);

        // Dummy ternary needed by type system due to union and this parameter shenanagins
        this.memberInitializers = this.model.memberInitializers.map(memInit => memInit instanceof DefaultInitializer ?
            memInit.createRuntimeInitializer(this) :
            memInit.createRuntimeInitializer(this)
        );

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

    protected upNextImpl() {
        if (this.index === INDEX_CTOR_INITIALIZER_DELEGATE) {

            // Non-null assertion due to the way index is set in constructor above
            this.sim.push(this.delegatedConstructorInitializer!);

            if (this.baseInitializer) {
                this.index = INDEX_CTOR_INITIALIZER_BASE;
            }
            else {
                this.index = INDEX_CTOR_INITIALIZER_MEMBERS;
            }
        }
        else if (this.index === INDEX_CTOR_INITIALIZER_BASE) {
            // Non-null assertion due to the way index is set in constructor above
            this.sim.push(this.baseInitializer!);
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

    public stepForwardImpl() {
        // do nothing
    }
}


/**
 * Note: only use is in implicitly defined copy constructor
 */
 export class ArrayMemberInitializer extends Initializer {
    public readonly construct_type = "array_member_initializer";
    public readonly kind = "direct";

     // Note: this are not MemberSubobjectEntity since they might need to apply to a nested array inside an array member
    public readonly target: MemberObjectEntity<BoundedArrayType>;
    public readonly otherMember: MemberObjectEntity<BoundedArrayType>;

    public readonly elementInitializers: DirectInitializer[] = [];

    public constructor(context: TranslationUnitContext, target: MemberObjectEntity<BoundedArrayType>,
                       otherMember: MemberObjectEntity<BoundedArrayType>) {
        super(context, undefined);

        this.target = target;
        this.otherMember = otherMember;
        let targetType = target.type;

        for(let i = 0; i < targetType.numElems; ++i) {
            // let elemInit;
            // COMMENTED BELOW BECAUSE MULTIDIMENSIONAL ARRAYS ARE NOT ALLOWED
            // if (targetType.elemType instanceof BoundedArrayType) {
            //     elemInit = new ArrayMemberInitializer(context,
            //         new ArraySubobjectEntity(target, i),
            //         new ArraySubobjectEntity(<ObjectEntity<BoundedArrayType<BoundedArrayType>>>otherMember, i));
            // }
            // else {
            let otherEntity = new ArraySubobjectEntity(otherMember, i);
            let elemInit = DirectInitializer.create(
                    context,
                    new ArraySubobjectEntity(target, i),
                    [
                        new OpaqueExpression(context, {
                            type: otherEntity.type,
                            valueCategory: "lvalue",
                            operate: (rt) => <CPPObject<CompleteClassType> | CPPObject<AtomicType>>otherEntity.runtimeLookup(rt)
                        })
                    ],
                    // [new EntityExpression(context, new ArraySubobjectEntity(otherMember, i))],
                    "direct"
                    );
            // }

            this.elementInitializers.push(elemInit);
            this.attach(elemInit);

            if(!elemInit.isSuccessfullyCompiled()) {
                this.addNote(CPPError.declaration.init.array_direct_init(this));
                break;
            }
        }

    }

    public createRuntimeInitializer(this: CompiledArrayMemberInitializer, parent: RuntimeConstruct) {
        return new RuntimeArrayMemberInitializer(this, parent);
    }
    
    public createDefaultOutlet(this: CompiledArrayMemberInitializer, element: JQuery, parent?: ConstructOutlet) {
        return new ArrayMemberInitializerOutlet(element, this, parent);
    }

    // public explain(sim: Simulation, rtConstruct: RuntimeConstruct) : Explanation {
    //     let targetDesc = this.target.describe();
    //     let targetType = this.target.type;
    //     let otherMemberDesc = this.otherMember.describe();

    //     if (targetType.length === 0) {
    //         return {message: "No initialization is performed for " + (targetDesc.name || targetDesc.message) + "because the array has length 0."};
    //     }
    //     else {
    //         return {message: "Each element of " + (targetDesc.name || targetDesc.message) + " will be default-initialized with the value of the"
    //             + "corresponding element of " + (otherMemberDesc.name || otherMemberDesc.message) + ". For example, " +
    //             this.elementInitializers[0].explain(sim, rtConstruct) };
    //     }
    // }
}

export interface CompiledArrayMemberInitializer extends ArrayMemberInitializer, SuccessfullyCompiled {
    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure
    
    readonly elementInitializers: CompiledDirectInitializer[];
}

export class RuntimeArrayMemberInitializer extends RuntimeInitializer<CompiledArrayMemberInitializer> {

    public readonly elementInitializers: RuntimeDirectInitializer[];

    private index = 0;

    public constructor (model: CompiledArrayMemberInitializer, parent: RuntimeConstruct) {
        super(model, parent);
        this.elementInitializers = this.model.elementInitializers.map((elemInit) => {
            return elemInit.createRuntimeInitializer(this);
        });
    }

    protected upNextImpl() {
        if (this.elementInitializers && this.index < this.elementInitializers.length) {
            this.sim.push(this.elementInitializers[this.index++])
        }
        else {
            let target = this.model.target.runtimeLookup(this);
            target.beginLifetime();
            this.observable.send("arrayObjectInitialized", this);
            this.startCleanup();
        }
    }

    public stepForwardImpl() {
        // do nothing
    }
}