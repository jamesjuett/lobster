import { CPPObject, TemporaryObject } from "../../runtime/objects";
import { PointerType, BoundedArrayType, ArithmeticType, CompleteClassType, Double } from "../../compilation/types";
import { ExpressionContext, ConstructDescription } from "../../compilation/contexts";
import { SuccessfullyCompiled, RuntimeConstruct } from "../CPPConstruct";
import { CPPError } from "../../compilation/errors";
import { TemporaryObjectEntity } from "../../compilation/entities";
import { Value } from "../../runtime/Value";
import { assert, Mutable } from "../../../util/util";
import { Expression, CompiledExpression, TypedExpression, t_TypedExpression, allWellTyped } from "./Expression";
import { RuntimeExpression } from "./RuntimeExpression";
import { InitializerListOutlet as InitializerListExpressionOutlet } from "../../../view/constructs/ExpressionOutlets";
import { ConstructOutlet } from "../../../view/constructs/ConstructOutlet";
import { CompiledTemporaryDeallocator } from "../TemporaryDeallocator";
import { InitializerListExpressionASTNode } from "../../../ast/ast_expressions";
import { createExpressionFromAST, createRuntimeExpression } from "./expressions";
import { standardConversion } from "./ImplicitConversion";




export class InitializerListExpression extends Expression<InitializerListExpressionASTNode> {
    public readonly construct_type = "initializer_list_expression";

    public readonly type?: CompleteClassType;
    public readonly valueCategory = "lvalue";

    public readonly elements: readonly Expression[];
    public readonly elementType?: ArithmeticType;

    public readonly initializerList?: TemporaryObjectEntity<CompleteClassType>;
    public readonly elementsArray?: TemporaryObjectEntity<BoundedArrayType<ArithmeticType>>;

    public constructor(context: ExpressionContext, ast: InitializerListExpressionASTNode | undefined, elements: readonly Expression[]) {
        super(context, ast);

        if (elements.length === 0) {
            this.addNote(CPPError.declaration.init.list_empty(this));
            this.attachAll(this.elements = elements);
            return;
        }

        // If any arguments are not well typed, we can't select a constructor
        if (!allWellTyped(elements)) {
            this.attachAll(this.elements = elements);
            return;
        }

        let eltType = elements[0].type;
        if (!elements.every(arg => arg.type.similarType(eltType))) {
            // HACK - for differing types, just convert everything to double
            eltType = Double.DOUBLE;
            elements = elements.map(elt => elt.type.similarType(eltType) ? elt : standardConversion(elt, eltType))
            // this.addNote(CPPError.declaration.init.list_same_type(this));
            // this.attachAll(this.elements = elements);
            // return;
        }

        if (!eltType.isArithmeticType()) {
            this.addNote(CPPError.declaration.init.list_arithmetic_type(this));
            this.attachAll(this.elements = elements);
            return;
        }

        let typeEntity = context.contextualScope.lookup(`initializer_list<${eltType.simpleType}>`);
        assert(typeEntity?.declarationKind === "class");
        assert(typeEntity.isComplete());
        this.type = typeEntity.type.cvUnqualified();

        this.initializerList = this.createTemporaryObject(this.type, "[initializer list]");
        this.elementsArray = this.createTemporaryObject(new BoundedArrayType(eltType.cvQualified(true), elements.length), "[initializer list array]");


        this.attachAll(this.elements = elements);

    }

    public static createFromAST(ast: InitializerListExpressionASTNode, context: ExpressionContext): InitializerListExpression {
        return new InitializerListExpression(context, ast, ast.elements.map(eltAST => createExpressionFromAST(eltAST, context)));
    }

    public createDefaultOutlet(this: CompiledInitializerListExpression, element: JQuery, parent?: ConstructOutlet) {
        return new InitializerListExpressionOutlet(element, this, parent);
    }

    public describeEvalResult(depth: number): ConstructDescription {
        throw new Error("Method not implemented.");
    }

}

export interface TypedInitializerListExpression<T extends CompleteClassType = CompleteClassType> extends InitializerListExpression, t_TypedExpression {
    readonly type: T;

    readonly elements: readonly TypedExpression[];
    readonly elementType: ArithmeticType;
    readonly initializerList: TemporaryObjectEntity<CompleteClassType>;
    readonly elementsArray: TemporaryObjectEntity<BoundedArrayType<ArithmeticType>>;
}

export interface CompiledInitializerListExpression<T extends CompleteClassType = CompleteClassType> extends TypedInitializerListExpression<T>, SuccessfullyCompiled {

    readonly temporaryDeallocator?: CompiledTemporaryDeallocator; // to match CompiledPotentialFullExpression structure

    readonly elements: readonly CompiledExpression[];
}

export class RuntimeInitializerListExpression<T extends CompleteClassType = CompleteClassType> extends RuntimeExpression<T, "lvalue", CompiledInitializerListExpression<T>> {

    public elements: readonly RuntimeExpression[];
    readonly initializerList?: TemporaryObject<CompleteClassType>;
    readonly elementsArray?: TemporaryObject<BoundedArrayType<ArithmeticType>>;

    private elementIndex: number = 0;

    public constructor(model: CompiledInitializerListExpression<T>, parent: RuntimeConstruct) {
        super(model, parent);
        this.elements = this.model.elements.map(element => createRuntimeExpression(element, this));
    }

    protected upNextImpl() {
        if (this.elementIndex < this.elements.length) {
            this.sim.push(this.elements[this.elementIndex++]);
        }
        else {
            (<Mutable<this>>this).elementsArray = this.model.elementsArray.objectInstance(this);
            this.elements.forEach((elem, i) => this.elementsArray!.getArrayElemSubobject(i).setValue(
                <Value<ArithmeticType>>(elem.evalResult instanceof CPPObject ? elem.evalResult.getValue() : elem.evalResult)
            ));

            (<Mutable<this>>this).initializerList = this.model.initializerList.objectInstance(this);
            let eltsPointer = this.elementsArray!.getArrayElemSubobject(0).getPointerTo();
            (<CPPObject<PointerType<ArithmeticType>>>this.initializerList!.getMemberObject("begin")!).setValue(eltsPointer);
            (<CPPObject<PointerType<ArithmeticType>>>this.initializerList!.getMemberObject("begin")!).setValue(eltsPointer.pointerOffsetRaw(this.elements.length));
            this.setEvalResult(<this["evalResult"]><unknown>this.initializerList!);
            this.startCleanup();
        }
    }

    protected stepForwardImpl() {
        // Do nothing
    }
}
