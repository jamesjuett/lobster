import { ASTNode } from "../../ast/ASTNode";
import { Observable } from "../../util/observe";
import { asMutable, assert, Mutable } from "../../util/util";
import { areAllSemanticallyEquivalent, ConstructDescription, ConstructExplanation, ProgramContext, SemanticContext, TranslationUnitContext } from "../compilation/contexts";
import { CPPEntity } from "../compilation/entities";
import { Note, NoteRecorder } from "../compilation/errors";
import { FunctionCall } from "./FunctionCall";
import { RuntimeFunction } from "../compilation/functions";
import { CPPObject } from "../runtime/objects";
import { PotentialFullExpression } from "./PotentialFullExpression";
import { AnalyticConstruct } from "../../analysis/predicates";
import { SourceReference } from "../compilation/Program";
import { Simulation } from "../runtime/Simulation";
import { CompleteClassType } from "../compilation/types";








export abstract class CPPConstruct<ContextType extends ProgramContext = ProgramContext, ASTType extends ASTNode = ASTNode> {
    public abstract readonly construct_type: string;
    public readonly t_analytic!: AnalyticConstruct;
    private static NEXT_ID = 0;

    public readonly constructId: number;

    public readonly notes = new NoteRecorder();

    public readonly context: ContextType;

    public readonly ast?: ASTType;
    public readonly sourceReference?: SourceReference;

    public abstract readonly parent?: CPPConstruct;
    public readonly children: readonly CPPConstruct[] = [];

    protected constructor(context: ContextType, ast: ASTType | undefined) {
        this.constructId = CPPConstruct.NEXT_ID++;

        this.context = context;

        if (ast) {
            this.ast = ast;

            assert(ast.source, "AST source is undefined. A track() call is likely missing in the grammar.");

            if (this.context.translationUnit) {
                asMutable(this).sourceReference = this.context.translationUnit.getSourceReference(ast.source.line, ast.source.column, ast.source.start, ast.source.end);
            }
        }
    }

    public attach(child: CPPConstruct) {
        asMutable(this.children).push(child);
        child.onAttach(this);
    }

    public attachAll(children: readonly CPPConstruct[]) {
        children.forEach((child) => this.attach(child));
    }

    protected abstract onAttach(parent: this["parent"]): void;

    public explain(sim: Simulation, rtConstruct: RuntimeConstruct): ConstructExplanation {
        return { message: "[No explanation available.]" };
    }

    public describe(sim: Simulation, rtConstruct: RuntimeConstruct): ConstructDescription {
        return { message: "[No description available.]" };
    }

    public addNote(note: Note) {
        this.notes.addNote(note);
        if (this.context.translationUnit) { this.context.translationUnit.addNote(note); }
        // if (this.parent && this.i_auxiliaryLevel === this.parent.i_auxiliaryLevel) {
        //     this.parent.addNote(note);
        // }
    }

    public getContainedNotes() {
        let allNotes = new NoteRecorder();
        allNotes.addNotes(this.notes.allNotes);
        this.children.forEach(child => allNotes.addNotes(child.getContainedNotes().allNotes));
        return allNotes;
    }

    // getNotes : function() {
    //     return this.i_notes;
    // },
    public getNearestSourceReference(this: CPPConstruct<TranslationUnitContext>) {
        let construct: CPPConstruct = this;
        while (!construct.sourceReference && construct.parent) {
            construct = construct.parent;
        }
        return construct.sourceReference || this.context.translationUnit.getSourceReference(0, 0, 0, 0);
    }

    // public abstract readonly _t: {
    //     compiled: CompiledConstruct
    // };
    public isSuccessfullyCompiled(): this is CompiledConstruct {
        return !this.getContainedNotes().hasErrors;
    }

    public isFullExpression() : boolean {
        return false;
    }

    public mayManageTemporaryLifetimes() : this is PotentialFullExpression | FunctionCall {
        return false;
    }

    public findFullExpression() : PotentialFullExpression | FunctionCall | undefined {
        return undefined;
    }

    public isSemanticallyEquivalent(other: CPPConstruct, equivalenceContext: SemanticContext): boolean {
        return this.isSemanticallyEquivalent_impl(<AnalyticConstruct>other, equivalenceContext);
    };

    public abstract isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean;

    public areChildrenSemanticallyEquivalent(other: CPPConstruct, equivalenceContext: SemanticContext): boolean {
        return areAllSemanticallyEquivalent(this.children, other.children, equivalenceContext);
    }

    public entitiesUsed(): CPPEntity[] {
        let ents: CPPEntity[] = [];
        this.children.forEach(c => c.entitiesUsed().forEach(e => ents.push(e)));
        return ents;
    }
}


export interface SuccessfullyCompiled {

    // _t_isCompiled is here to prevent (otherwise) structurally equivalent non-compiled constructs
    // from being assignable to a compiled expression type
    // TODO: maybe better to use a symbol here?
    readonly _t_isCompiled: never;
}


export interface CompiledConstruct extends CPPConstruct, SuccessfullyCompiled {
}



export type TranslationUnitConstruct<ASTType extends ASTNode = ASTNode> = CPPConstruct<TranslationUnitContext, ASTType>;






export type StackType = "statement" | "expression" | "function" | "initializer" | "call" | "ctor-initializer" | "cleanup";

export abstract class RuntimeConstruct<C extends CompiledConstruct = CompiledConstruct> {

    public readonly observable = new Observable(this);

    public readonly sim: Simulation;
    public readonly model: C;
    public readonly stackType: StackType;

    public readonly children: { [index: string]: RuntimeConstruct; } = {};

    public readonly parent?: RuntimeConstruct;

    private static NEXT_ID = 0;
    public readonly runtimeId: number = RuntimeConstruct.NEXT_ID++;

    /**
     * WARNING: The containingRuntimeFunction property may be undefined, even though it's type suggests it will always
     * be defined. In most places where it is accessed, there is an implicit assumption that a runtime construct
     * situated inside a function is being used (e.g. looking up an entity that depends on a local function) and the
     * client code would end up needing a non-null assertion anyway. Those non-null assertions are annoying, so
     * instead we trick the type system and trust that this property will be used appropriately by the programmer.
     */
    public readonly containingRuntimeFunction!: RuntimeFunction;
    private _contextualReceiver?: CPPObject<CompleteClassType>; 

    public readonly stepsTakenAtStart: number;
    public readonly isActive: boolean = false;
    public readonly isUpNext: boolean = false;
    public readonly isWaiting: boolean = false;
    public readonly isDone: boolean = false;

    private cleanupConstruct?: RuntimeConstruct;
    public readonly cleanupStarted: boolean = false;

    // TODO: refactor pauses. maybe move them to the implementation
    private pauses: { [index: string]: any; } = {}; // TODO: remove any type

    public constructor(model: C, stackType: StackType, parentOrSim: RuntimeConstruct | Simulation) {
        this.model = model;
        this.stackType = stackType;

        if (parentOrSim instanceof RuntimeConstruct) {
            assert(this.parent !== this, "Code instance may not be its own parent");

            this.sim = parentOrSim.sim;
            assert(parentOrSim.sim === this.sim, "Runtime construct may not belong to a different simulation than its parent.");

            this.parent = parentOrSim;
            this.parent.addChild(this);

            if (parentOrSim.containingRuntimeFunction) {
                this.containingRuntimeFunction = parentOrSim.containingRuntimeFunction;
            }
        }
        else {
            this.sim = parentOrSim;
        }

        this.stepsTakenAtStart = this.sim.stepsTaken;
    }

    protected setContainingRuntimeFunction(func: RuntimeFunction) {
        (<Mutable<this>>this).containingRuntimeFunction = func;
    }

    public setContextualReceiver(obj: CPPObject<CompleteClassType>) {
        this._contextualReceiver = obj;
    }

    /**
     * WARNING: The contextualReceiver property may be undefined, even though it's type suggests it will always
     * be defined. In most places where it is accessed, there is an implicit assumption that the runtime construct
     * for whom the lookup is being performed is situated in a context where there is a contextual receiver (e.g.
     * inside a member function) and the client code would end up needing a non-null assertion anyway. Those
     * non-null assertions are annoying, so instead we trick the type system and trust that this property will
     * be used appropriately by the programmer.
     */
    public get contextualReceiver() {
        return this._contextualReceiver ?? this.containingRuntimeFunction?.receiver! ?? this.parent?._contextualReceiver;
    }

    /**
     * REQUIRES: this instance is on the top of the execution stack
     */
    public stepForward() {
        this.observable.send("stepForward");
        return this.stepForwardImpl();
    }

    protected abstract stepForwardImpl(): void;

    public upNext() {
        (<Mutable<this>>this).isUpNext = true;
        this.observable.send("upNext");

        if (this.cleanupStarted) {
            if (this.cleanupConstruct && !this.cleanupConstruct.isDone) {
                this.sim.push(this.cleanupConstruct);
            }
            else {
                this.sim.pop();
            }
        }
        else {
            return this.upNextImpl();
        }
    }

    protected abstract upNextImpl(): void;

    public setPauseWhenUpNext() {
        this.pauses["upNext"] = { pauseWhenUpNext: true };
    }

    public wait() {
        (<Mutable<this>>this).isUpNext = false;
        (<Mutable<this>>this).isWaiting = true;
        this.observable.send("wait");
    }

    public afterPushed() {
        (<boolean>this.isActive) = true;
        this.observable.send("pushed");
    }

    public setCleanupConstruct(cleanupConstruct: RuntimeConstruct) {
        this.cleanupConstruct = cleanupConstruct;
    }

    public startCleanup() {

        (<Mutable<this>>this).cleanupStarted = true;

        // If we're on top of the stack, go ahead and start the cleanup
        // (otherwise, wait until the next time we're on top and receive an upNext)
        // We do need to do this now, since startCleanup() could be called from
        // somewhere where we don't immediately get another upNext()
        if (this === this.sim.top()) {
            if (this.cleanupConstruct) {
                this.sim.push(this.cleanupConstruct);
            }
            else {
                this.sim.pop();
            }
        }
    }

    public afterPopped() {
        (<Mutable<this>>this).isActive = false;
        (<Mutable<this>>this).isUpNext = false;
        (<Mutable<this>>this).isWaiting = false;
        (<Mutable<this>>this).isDone = true;
        this.observable.send("popped", this);
    }

    private addChild(child: RuntimeConstruct) {
        this.children[child.model.constructId] = child;
        this.observable.send("childInstanceCreated", child);
    }

    public findParentByStackType(stackType: StackType) {
        var parent = this.parent;
        while (parent && parent.stackType != stackType) {
            parent = parent.parent;
        }
        return parent;
    }

    public findParentByModel(model: CPPConstruct) {
        var parent = this.parent;
        while (parent && parent.model.constructId != model.constructId) {
            parent = parent.parent;
        }
        return parent;
    }

    public explain(): ConstructExplanation {
        return this.model.explain(this.sim, this);
    }
}






