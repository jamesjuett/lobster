import { CompiledArrayMemberInitializer, RuntimeArrayMemberInitializer } from "../../core/constructs/initializers/CtorInitializer";
import { CompiledArrayDefaultInitializer, CompiledClassDefaultInitializer, RuntimeArrayDefaultInitializer, RuntimeAtomicDefaultInitializer, RuntimeClassDefaultInitializer } from "../../core/constructs/initializers/DefaultInitializer";
import { CompiledArrayDirectInitializer, CompiledAtomicDirectInitializer, CompiledClassDirectInitializer, CompiledDirectInitializer, CompiledReferenceDirectInitializer, RuntimeArrayDirectInitializer, RuntimeAtomicDirectInitializer, RuntimeClassDirectInitializer, RuntimeDirectInitializer, RuntimeReferenceDirectInitializer } from "../../core/constructs/initializers/DirectInitializer";
import { CompiledInitializer, RuntimeInitializer } from "../../core/constructs/initializers/Initializer";
import { CompiledArrayAggregateInitializer, RuntimeArrayAggregateInitializer } from "../../core/constructs/initializers/ListInitializer";
import { CompiledArrayValueInitializer, CompiledClassValueInitializer, RuntimeArrayValueInitializer, RuntimeAtomicValueInitializer, RuntimeClassValueInitializer } from "../../core/constructs/initializers/ValueInitializer";
import { htmlDecoratedName } from "../../util/util";
import { ConstructOutlet } from "./ConstructOutlet";
import { PotentialFullExpressionOutlet } from "./PotentialFullExpressionOutlet";
import { addChildExpressionOutlet, ExpressionOutlet } from "./ExpressionOutlets";
import { FunctionCallOutlet } from "./FunctionCallOutlet";


export function createInitializerOutlet(element: JQuery, construct: CompiledInitializer, parent?: ConstructOutlet) {
    return construct.createDefaultOutlet(element, parent);
}

export class InitializerOutlet<RT extends RuntimeInitializer = RuntimeInitializer> extends PotentialFullExpressionOutlet<RT> {

    public constructor(element: JQuery, construct: CompiledInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);
        this.element.addClass("code-initializer-" + this.construct.kind);
    }

}

export function addChildInitializerOutlet(parentElement: JQuery, construct: CompiledInitializer, parent: ConstructOutlet) {
    return createInitializerOutlet($("<span></span>").appendTo(parentElement), construct, parent);
}

export class AtomicDefaultInitializerOutlet extends InitializerOutlet<RuntimeAtomicDefaultInitializer> {
}

export class ArrayDefaultInitializerOutlet extends InitializerOutlet<RuntimeArrayDefaultInitializer> {

    public readonly elementInitializerOutlets?: readonly InitializerOutlet[];

    public constructor(element: JQuery, construct: CompiledArrayDefaultInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);

        if (this.construct.elementInitializers) {
            this.elementInitializerOutlets = this.construct.elementInitializers.map(
                elemInit => createInitializerOutlet(element, elemInit, this)
            );
        }
    }

}


export class ClassDefaultInitializerOutlet extends InitializerOutlet<RuntimeClassDefaultInitializer> {

    public readonly ctorCallOutlet: FunctionCallOutlet;

    public constructor(element: JQuery, construct: CompiledClassDefaultInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);

        // this.element.append(htmlDecoratedType(construct.target.type.className));
        this.ctorCallOutlet = new FunctionCallOutlet($("<span></span>").appendTo(this.element), construct.ctorCall, this);
    }

}

export type DefaultInitializerOutlet =
    AtomicDefaultInitializerOutlet |
    ArrayDefaultInitializerOutlet |
    ClassDefaultInitializerOutlet;


export class AtomicValueInitializerOutlet extends InitializerOutlet<RuntimeAtomicValueInitializer> {
}

export class ArrayValueInitializerOutlet extends InitializerOutlet<RuntimeArrayValueInitializer> {

    public readonly elementInitializerOutlets?: readonly InitializerOutlet[];

    public constructor(element: JQuery, construct: CompiledArrayValueInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);

        if (this.construct.elementInitializers) {
            this.elementInitializerOutlets = this.construct.elementInitializers.map(
                elemInit => createInitializerOutlet(element, elemInit, this)
            );
        }
    }

}


export class ClassValueInitializerOutlet extends InitializerOutlet<RuntimeClassValueInitializer> {

    public readonly ctorCallOutlet: FunctionCallOutlet;

    public constructor(element: JQuery, construct: CompiledClassValueInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.ctorCallOutlet = new FunctionCallOutlet($("<span></span>").appendTo(this.element), construct.ctorCall, this);
    }

}

export type ValueInitializerOutlet =
    AtomicValueInitializerOutlet |
    ArrayValueInitializerOutlet |
    ClassValueInitializerOutlet;


export class AtomicDirectInitializerOutlet extends InitializerOutlet<RuntimeAtomicDirectInitializer> {

    public readonly argOutlet: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledAtomicDirectInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.argOutlet = addChildExpressionOutlet(this.element, construct.arg, this);

    }

}


export class ReferenceDirectInitializerOutlet extends InitializerOutlet<RuntimeReferenceDirectInitializer> {

    public readonly argOutlet: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledReferenceDirectInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.argOutlet = addChildExpressionOutlet(this.element, construct.arg, this);

    }

}


export class ArrayDirectInitializerOutlet extends InitializerOutlet<RuntimeArrayDirectInitializer> {

    public readonly argOutlet: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledArrayDirectInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);

        if (construct.kind === "direct") {
            this.argOutlet = addChildExpressionOutlet(this.element, construct.arg, this);
        }
        else {
            this.argOutlet = addChildExpressionOutlet(this.element, construct.arg, this);
        }

    }

}


export class ClassDirectInitializerOutlet extends InitializerOutlet<RuntimeClassDirectInitializer> {

    public readonly ctorCallOutlet: FunctionCallOutlet;

    public constructor(element: JQuery, construct: CompiledClassDirectInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.ctorCallOutlet = new FunctionCallOutlet($("<span></span>").appendTo(this.element), construct.ctorCall, this);
    }
}

export type DirectInitializerOutlet =
    AtomicDirectInitializerOutlet |
    ReferenceDirectInitializerOutlet |
    ArrayDirectInitializerOutlet |
    ClassDirectInitializerOutlet;



export abstract class CopyInitializerOutlet extends InitializerOutlet<RuntimeDirectInitializer> {

    public constructor(element: JQuery, construct: CompiledDirectInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);
        this.element.addClass("code-copyInitializer");
    }
}

export class AtomicCopyInitializerOutlet extends InitializerOutlet<RuntimeAtomicDirectInitializer> {

    public readonly argOutlet: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledAtomicDirectInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.argOutlet = addChildExpressionOutlet(this.element, construct.arg, this);
    }

}

export class ReferenceCopyInitializerOutlet extends InitializerOutlet<RuntimeReferenceDirectInitializer> {

    public readonly argOutlet: ExpressionOutlet;

    public constructor(element: JQuery, construct: CompiledReferenceDirectInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.argOutlet = addChildExpressionOutlet(this.element, construct.arg, this);
    }

}


export class ClassCopyInitializerOutlet extends InitializerOutlet<RuntimeClassDirectInitializer> {

    public readonly ctorCallOutlet: FunctionCallOutlet;

    public constructor(element: JQuery, construct: CompiledClassDirectInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);


        this.ctorCallOutlet = new FunctionCallOutlet($("<span></span>").appendTo(this.element), construct.ctorCall, this);
    }
}


export class ArrayAggregateInitializerOutlet extends InitializerOutlet<RuntimeArrayAggregateInitializer> {

    public readonly elemInitializerOutlets: readonly (DirectInitializerOutlet | ValueInitializerOutlet)[];

    public constructor(element: JQuery, construct: CompiledArrayAggregateInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.elemInitializerOutlets = construct.elemInitializers.map((elemInit, i) => {
            if (i > 0) {
                this.element.append(", ");
            }
            return <DirectInitializerOutlet | ValueInitializerOutlet>createInitializerOutlet($("<span></span>").appendTo(this.element), elemInit, this);
        });
    }
}



export class ArrayMemberInitializerOutlet extends InitializerOutlet<RuntimeArrayMemberInitializer> {

    public constructor(element: JQuery, construct: CompiledArrayMemberInitializer, parent?: ConstructOutlet) {
        super(element, construct, parent);

        this.element.append(htmlDecoratedName("other." + construct.target.name));

    }

}
