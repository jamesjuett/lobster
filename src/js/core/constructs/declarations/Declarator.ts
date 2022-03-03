import { DeclaratorASTNode, FunctionPostfixDeclaratorASTNode } from "../../../ast/ast_declarators";
import { parseNumericLiteralValueFromAST } from "../../../ast/ast_expressions";
import { asMutable, assertNever, Mutable } from "../../../util/util";
import { isClassContext, SemanticContext, TranslationUnitContext } from "../../compilation/contexts";
import { CPPError, NoteHandler } from "../../compilation/errors";
import { astToIdentifier, checkIdentifier, getUnqualifiedName, isQualifiedName, isUnqualifiedName, LexicalIdentifier, QualifiedName, UnqualifiedName } from "../../lexical";
import { AnalyticConstruct } from "../../predicates";
import { ArrayOfUnknownBoundType, BoundedArrayType, FunctionType, PointerType, PotentialParameterType, ReferenceType, sameType, Type, VoidType } from "../../types";
import { BasicCPPConstruct, SuccessfullyCompiled } from "../constructs";
import { CompiledParameterDeclaration, ParameterDeclaration } from "./function/ParameterDeclaration";



export class Declarator extends BasicCPPConstruct<TranslationUnitContext, DeclaratorASTNode> {

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type
            && sameType(this.type, other.type);
    }

    public readonly construct_type = "declarator";

    public readonly name?: UnqualifiedName | QualifiedName;
    public readonly type?: Type;

    public readonly baseType?: Type;

    public readonly isPureVirtual?: true;
    public readonly isOverride?: true;

    public readonly hasConstructorName: boolean = false;
    public readonly hasDestructorName: boolean = false;

    public readonly parameters?: readonly ParameterDeclaration[]; // defined if this is a declarator of function type

    public static createFromAST(ast: DeclaratorASTNode | undefined, context: TranslationUnitContext, baseType: Type | undefined) {
        return new Declarator(context, ast, baseType);
    }

    /**
     * `Declarator.createFromAST()` should always be used to create Declarators, which delegates
     * to this private constructor. Directly calling the constructor from the outside is not allowed.
     * Since declarators are largely about processing an AST, it doesn't make much sense to create
     * one without an AST.
     */
    private constructor(context: TranslationUnitContext, ast: DeclaratorASTNode | undefined, baseType: Type | undefined) {
        super(context, ast);
        this.baseType = baseType;

        if (!ast) {
            this.type = this.baseType;
            return;
        }

        // let isMember = isA(this.parent, Declarations.Member);
        if (ast.pureVirtual) { this.isPureVirtual = true; }
        if (ast.override) { this.isOverride = true; }

        this.determineNameAndType(ast);
    }

    private determineNameAndType(ast: DeclaratorASTNode) {

        let findName: DeclaratorASTNode | undefined = ast;
        let n: LexicalIdentifier;
        while (findName) {
            if (findName.name) {
                n = astToIdentifier(findName.name);
                if (isUnqualifiedName(n)) {
                    n = n.replace(/<.*>/g, ""); // remove template parameters
                }
                else {
                    let newComponents = n.components.map(component => component.replace(/<.*>/g, ""));
                    n = {
                        components: newComponents,
                        str: newComponents.join("::")
                    };
                }
                asMutable(this).name = n;
                checkIdentifier(this, n, this.notes);
                break;
            }
            findName = findName.pointer || findName.reference || findName.sub;
        }

        if (this.name && isQualifiedName(this.name)) {
            let le = this.context.program.getLinkedFunctionEntity(this.name);
            if (le && isClassContext(le.firstDeclaration.context)) {
                let className = le.firstDeclaration.context.containingClass.name;
                className = className.replace(/<.*>/g, ""); // remove template parameters
                if (getUnqualifiedName(this.name) === className) {
                    (<Mutable<this>>this).hasConstructorName = true;
                }
                else if (getUnqualifiedName(this.name) === "~" + className) {
                    (<Mutable<this>>this).hasDestructorName = true;
                }
            }
        }

        if (this.name && isClassContext(this.context)) {
            let className = this.context.containingClass.name;
            className = className.replace(/<.*>/g, ""); // remove template parameters
            if (this.name === className) {
                (<Mutable<this>>this).hasConstructorName = true;
            }
            else if (this.name === "~" + className) {
                (<Mutable<this>>this).hasDestructorName = true;
            }
        }

        let type: Type;

        // If it's a ctor or dtor, then we'll implicitly add void.
        // This is a bit of a Lobster hack, since technically in C++ ctors and dtors
        // don't have any return type at all, but the effects are mostly the same.
        if (this.baseType) {
            type = this.baseType;
        }
        else if (this.hasConstructorName) {
            type = VoidType.VOID;
        }
        else if (this.hasDestructorName) {
            type = VoidType.VOID;
        }
        else {
            // If there's no base type, we really can't do much.
            this.addNote(CPPError.declaration.missing_type_specifier(this));
            return;
        }


        let first = true;
        // let prevKind : "function" | "reference" | "pointer" | "array" | "none" = "none";
        let decl: DeclaratorASTNode | undefined = ast;



        while (decl) {

            if (decl.postfixes) {

                for (let i = decl.postfixes.length - 1; i >= 0; --i) {

                    // A postfix portion of a declarator is only innermost if it's the leftmost one,
                    // which would be closest to where the name would occur in the declarator. (Note
                    // that this is also the last one processed here, since we iterate backward down to 0.)
                    let postfix = decl.postfixes[i];

                    if (postfix.kind === "array") {
                        if (type.isBoundedArrayType()) {
                            this.addNote(CPPError.declaration.array.multidimensional_arrays_unsupported(this));
                            return;
                        }

                        if (!type.isArrayElemType()) {
                            this.addNote(CPPError.declaration.array.invalid_element_type(this, type));
                            return;
                        }

                        if (postfix.size) {

                            if (postfix.size.construct_type === "numeric_literal_expression") {
                                // If the size specified is a literal, just use its value as array length
                                type = new BoundedArrayType(type, parseNumericLiteralValueFromAST(postfix.size));
                            }
                            else {
                                // If a size is specified, that is not a literal, it must be an expression (via the grammar).
                                // This size expression could e.g. be used for a dynamically allocated array. In that case,
                                // we provide the AST of the size expression as part of the type so it can be used later by
                                // a new expression to construct the size subexpression for the allocated array.
                                type = new ArrayOfUnknownBoundType(type, postfix.size);

                                // TODO: It is also possible the size is a compile-time constant expression, in which case
                                // it should be evaluated to determine the size.
                            }

                            // TODO: move these errors elsewhere
                            // if (postfix.size.construct_type !== "literal" && !(isInnermost && isA(this.parent, Expressions.NewExpression))){
                            // //TODO need to evaluate size of array if it's a compile-time constant expression
                            //     this.addNote(CPPError.declaration.array.literal_length_only(this));
                            // }
                            // else if (postfix.size.construct_type === "literal" && postfix.size.value == 0 && !(innermost && isA(this.parent, Expressions.NewExpression))){
                            //     this.addNote(CPPError.declaration.array.zero_length(this));
                            // }
                            // else size was fine and nothing needs to be done
                        }
                        else {
                            type = new ArrayOfUnknownBoundType(type);
                        }

                    }
                    else if (postfix.kind === "function") {
                        let fnType = this.processFunctionDeclarator(postfix, type, this);
                        if (fnType) {
                            type = fnType;
                        }
                        else {
                            return;
                        }
                    }
                    else {
                        assertNever(postfix);
                    }

                    first = false;
                }
            }

            // Process pointers/references next
            // NOTE: this line should NOT be else if since the same AST node may
            // have both postfixes and a pointer/reference
            if (decl.pointer) {
                if (!type.isPotentiallyCompleteObjectType()) {
                    if (type.isReferenceType()) {
                        this.addNote(CPPError.declaration.pointer.reference(this));
                    }
                    else if (type.isVoidType()) {
                        this.addNote(CPPError.declaration.pointer.void(this));
                    }
                    else if (type.isFunctionType()) {
                        this.addNote(CPPError.lobster.unsupported_feature(this, "function pointers"));
                    }
                    else {
                        assertNever(type);
                    }
                    return;
                }
                type = new PointerType(type, decl["const"], decl["volatile"]);
                decl = decl.pointer;
            }
            else if (decl.reference) {
                if (!type.isPotentiallyCompleteObjectType()) {
                    if (type.isReferenceType()) {
                        this.addNote(CPPError.declaration.ref.ref(this));
                    }
                    else if (type.isVoidType() || type.isFunctionType()) {
                        this.addNote(CPPError.declaration.ref.invalid_referred_type(this, type));
                    }
                    else {
                        assertNever(type);
                    }
                    return;
                }
                type = new ReferenceType(type);
                decl = decl.reference;
            }
            else if (decl.hasOwnProperty("sub")) {
                decl = decl.sub;
            }
            else {
                break;
            }

            first = false;
        }

        (<Mutable<this>>this).type = type;

        // If it's not a function type, the recorded parameters aren't meaningful
        if (!type.isFunctionType()) {
            delete (<Mutable<this>>this).parameters;
        }

        // if there wasn't any base type and we don't end up with a function type
        // it means we have an attempt at declaring a member variable
        // with the same name as the class that got defaulted to void as if
        // it was a constructor without a type specifier, but then turned out
        // not to be a viable constructor from the rest of the syntax. In
        // this case, we want to add back in the missing type specifier
        if (!this.baseType && !this.type?.isFunctionType()) {
            delete (<Mutable<this>>this).type;
            this.addNote(CPPError.declaration.missing_type_specifier(this));
        }
    }

    private processFunctionDeclarator(postfix: FunctionPostfixDeclaratorASTNode, type: Type, notes: NoteHandler): FunctionType | undefined {

        if (type && !type.isPotentialReturnType()) {
            if (type.isFunctionType()) {
                notes.addNote(CPPError.declaration.func.return_func(this));
            }
            else if (type.isPotentiallyCompleteArrayType()) {
                notes.addNote(CPPError.declaration.func.return_array(this));
            }
            else {
                assertNever(type);
            }
            return;
        }

        let paramDeclarations = postfix.args.map((argAST) => ParameterDeclaration.createFromAST(argAST, this.context));
        (<Mutable<this>>this).parameters = paramDeclarations;
        this.attachAll(paramDeclarations);

        let paramTypes = paramDeclarations.map(decl => decl.type);

        // A parameter list of just (void) specifies no parameters
        if (paramTypes.length == 1 && paramTypes[0] && paramTypes[0].isVoidType()) {
            paramTypes = [];
        }
        else {
            // Otherwise void parameters are bad
            for (let j = 0; j < paramTypes.length; ++j) {
                let paramType = paramTypes[j];
                if (paramType && paramType.isVoidType()) {
                    notes.addNote(CPPError.declaration.func.void_param(paramDeclarations[j]));
                }
            }
        }

        if (!paramTypes.every(paramType => paramType)) {
            return; // if some paramTypes aren't defined, can't do anything
        }

        if (!paramTypes.every(paramType => paramType && paramType.isPotentialParameterType())) {
            notes.addNote(CPPError.declaration.func.some_invalid_parameter_types(this));
            return;
        }

        // TODO clean up error immediately above and get rid of yucky cast below
        return new FunctionType(type, <PotentialParameterType[]>paramTypes, this.context.containingClass?.type.cvQualified(!!postfix.const));
    }

}

export interface TypedDeclarator<T extends Type> extends Declarator {
    type: T;
}

export interface CompiledDeclarator<T extends Type = Type> extends TypedDeclarator<T>, SuccessfullyCompiled {
    readonly parameters?: readonly CompiledParameterDeclaration[]; // defined if this is a declarator of function type
}
