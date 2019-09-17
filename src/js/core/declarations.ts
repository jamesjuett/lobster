import { CPPConstruct, ExecutableConstruct, BasicCPPConstruct, ConstructContext, ASTNode, RuntimeConstruct, RuntimeFunction, FunctionCall, ExecutableConstructContext } from "./constructs";
import { FunctionEntity, CPPEntity, BlockScope, AutoEntity, LocalReferenceEntity, DeclaredEntity, StaticEntity, ArraySubobjectEntity, MemberFunctionEntity, TypeEntity, MemberVariableEntity, ReceiverEntity, ObjectEntity, ClassScope } from "./entities";
import { Initializer, DirectInitializer, CopyInitializer, DefaultInitializer, InitializerASTNode } from "./initializers";
import { TypeSpecifier, Type, ArrayOfUnknownBoundType, FunctionType, ArrayType, PotentialParameterType, PointerType, ReferenceType, ObjectType } from "./types";
import { CPPError, Note } from "./errors";
import { IdentifierASTNode, checkIdentifier } from "./lexical";
import { ExpressionASTNode, NumericLiteralASTNode, Expression } from "./expressions";
import { Mutable, assert } from "../util/util";
import { SemanticException } from "./semanticExceptions";
import { Simulation } from "./Simulation";
import { type } from "jquery";


// TODO:
export type StorageSpecifierASTNode = ReadonlyArray<{}>;

export class StorageSpecifier extends BasicCPPConstruct {

    // TODO: just here as an example. change to remove Block stuff
    // public static createFromAST(ast: StorageSpecifierASTNode, context: ExecutableConstructContext) {

    //     let blockScope = new BlockScope(context.contextualScope);
        
    //     let newContext = Object.assign({}, context, {contextualScope: blockScope});

    //     let statements = ast.statements.map((stmtAst) => Statement.createFromAST(stmtAst, newContext));
        
    //     return new Block(newContext, blockScope, statements);
    // }

    compile : function(){

        // TODO: ADD UNSUPPORTED_FEATURE ERROR FOR EXTERN

        this.numSpecs = 0;
        for(var i = 0; i < this.ast.length; ++i){
            if (this[this.ast[i]]){
                this.addNote(CPPError.declaration.storage.once(this, this.ast[i]));
            }
            else {
                this[this.ast[i]] = true;
                ++this.numSpecs;
                if (this.ast[i] != "static"){
                    this.addNote(CPPError.declaration.storage.unsupported(this, this.ast[i]));
                }
            }

        }
        if (this.ast.length < 2 ||
            this.ast.length == 2 && this.thread_local && (this.static || this.extern)){
            //ok
        }
        else{
            this.addNote(CPPError.declaration.storage.incompatible(this, this.ast));
        }
    }
}


var BaseDeclarationMixin = {
    tryCompileDeclaration : function(){
        try {
            return this.compileDeclaration.apply(this, arguments);
        }
        catch(e) {
            if (isA(e, Note)) {
                this.addNote(e);
            }
            else if (isA(e, SemanticException)){
                this.addNote(e.annotation(this));
            }
            else{
                console.log(e.stack);
                throw e;
            }
        }
    },

    tryCompileDefinition : function(){
        try {
            return this.compileDefinition.apply(this, arguments);
        }
        catch(e) {
            if (isA(e, Note)) {
                this.addNote(e);
            }
            else if (isA(e, SemanticException)){
                this.addNote(e.annotation(this));
            }
            else{
                console.log(e.stack);
                throw e;
            }
        }
    }
};

interface OtherSpecifiers {
    readonly virtual? : boolean;
    readonly typedef? : boolean;
    readonly friend? : boolean;
}

export interface DeclarationSpecifiersASTNode {
    readonly typeSpecs: TypeSpecifierASTNode;
    readonly storageSpecs: StorageSpecifierASTNode;
    readonly friend?: boolean;
    readonly typedef?: boolean;
    readonly inline?: boolean;
    readonly explicit?: boolean;
    readonly virtual?: boolean;
}

export type DeclarationASTNode = SimpleDeclarationASTNode; // TODO: | FunctionDefinitionASTNode | ClassDefinitionASTNode

interface SimpleDeclarationASTNode extends ASTNode {
    readonly construct_type: "simple_declaration";
    readonly specs: DeclarationSpecifiersASTNode;
    readonly declarators: readonly DeclaratorInitASTNode[];
}

// TODO: add base declaration mixin stuff
export class Declaration extends BasicCPPConstruct implements ExecutableConstruct {

    public readonly typeSpecifier: TypeSpecifier;
    public readonly storageSpecifier: StorageSpecifier;
    public readonly declarator: Declarator;
    public readonly initializer?: Initializer;
    public readonly otherSpecifiers: OtherSpecifiers;

    public readonly type?: Type;

    // public readonly storageDuration: "static" | "automatic"; // TODO: remove if not used
    // public readonly isDefinition: boolean; // TODO: remove if not used

    
    public readonly context!: ExecutableConstructContext; // See ctor. This declaration needed to narrow type from base class.
    
    // Allow subclasses to customize behavior
    protected abstract readonly initializerAllowed: boolean;
    public abstract readonly isDefinition: boolean;

    public static createFromAST(ast: DeclarationASTNode, context: ExecutableConstructContext) {

        // Need to create TypeSpecifier first to get the base type first for the declarators
        let typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs, context);
        let baseType = typeSpec.type;
        let storageSpec = StorageSpecifier.createFromAST(ast.specs.storageSpecs, context);

        // Use map to create an array of the individual declarations (since multiple on the same line
        // will result in a single AST node and need to be broken up)
        return ast.declarators.map((declAST) => {

            // Create declarator and determine declared type
            let declarator = Declarator.createFromAST(declAST, context, baseType);
            let declaredType = declarator.type;

            // Create the declaration itself. Which kind depends on the declared type
            let declaration: Declaration;
            if (!declaredType) {
                declaration = new UnknownTypeDeclaration(context, typeSpec, storageSpec, declarator, ast.specs);
            }
            else if (ast.specs.friend) {
                declaration = new FriendDeclaration(context, typeSpec, storageSpec, declarator, ast.specs);
            }
            else if (ast.specs.typedef) {
                declaration = new TypedefDeclaration(context, typeSpec, storageSpec, declarator, ast.specs);
            }
            else if (declaredType.isVoidType()) {
                declaration = new VoidDeclaration(context, typeSpec, storageSpec, declarator, ast.specs);
            }
            else if (declaredType.isFunctionType()) {
                declaration = new FunctionDeclaration(context, typeSpec, storageSpec, declarator, ast.specs);
            }
            else if (declaredType.isArrayOfUnknownBoundType()) {
                // TODO: it may be possible to determine the bound from the initializer
                declaration = new UnknownBoundArrayDeclaration(context, typeSpec, storageSpec, declarator, ast.specs);
            }
            else {
                // Determine the appropriate kind of declaration based on the contextual scope
                let ctor = context.contextualScope instanceof BlockScope ? LocalObjectDefinition : GlobalDeclaration;

                declaration = new ctor(
                    context,
                    typeSpec,
                    storageSpec,
                    declarator,
                    ast.specs
                )
            }

            // Set AST
            declaration.setAST(ast);

            // Set initializer
            let init = declAST.initializer;
            if (!init) {
                declaration.setDefaultInitializer();
            }
            else if (init.construct_type == "direct_initializer") {
                declaration.setDirectInitializer(init.args.map((a) => Expression.createFromAST(a, context)));
            }
            else if (init.construct_type == "copy_initializer") {
                declaration.setCopyInitializer(init.args.map((a) => Expression.createFromAST(a, context)));
            }
            else if (init.construct_type == "initializer_list") {
                declaration.setCopyInitializer(init.args.map((a) => Expression.createFromAST(a, context)));
            }

            return declaration;
        });
    }

    protected constructor(context: ExecutableConstructContext, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {
        super(context);

        this.typeSpecifier = typeSpec;
        this.storageSpecifier = storageSpec;
        this.otherSpecifiers = otherSpecs;

        this.declarator = declarator;

        this.type = declarator.type && this.adjustType(declarator.type);

        // None of the simple declarations are member function declarations
        // and thus none support the virtual keyword
        if (otherSpecs.virtual) {
            this.addNote(CPPError.declaration.virtual_prohibited(this));
        }
    }

    protected adjustType(type: Type) {
        return type;
    }

    protected setInitializer(init: Initializer) {
        assert(!this.initializer);
        (<Mutable<this>>this).initializer = init;
        return this;
    }

    public setDefaultInitializer() {
        return this.setInitializer(DefaultInitializer.create(this.context, this.declaredEntity!));
    }

    public setDirectInitializer(args: readonly Expression[]) {
        return this.setInitializer(DirectInitializer.create(this.context, this.declaredEntity!, args));
    }

    public setCopyInitializer(args: readonly Expression[]) {
        return this.setInitializer(CopyInitializer.create(this.context, this.declaredEntity!, args));
    }

    public setInitializerList(args: readonly Expression[]) {
        // TODO implement initializer lists
        this.addNote(CPPError.lobster.unsupported_feature(this, "initializer lists"));
        return this;
    }
}


export class UnknownTypeDeclaration extends Declaration {

    // If the declared type cannot be determined, we don't want to give
    // a meaningless error that an initializer is not allowed, so we set
    // this to true.
    protected readonly initializerAllowed = true;

    public readonly isDefinition = false;
    
    public constructor(context: ExecutableConstructContext, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, typeSpec, storageSpec, declarator, otherSpecs);
        this.addNote(CPPError.declaration.unknown_type(this));
    }
    
}

export class VoidDeclaration extends Declaration {

    // Suppress meaningless error, since a void declaration is
    // always ill-formed, whether or not it has an initializer.
    protected readonly initializerAllowed = true;

    public readonly isDefinition = false;
    
    public constructor(context: ExecutableConstructContext, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, typeSpec, storageSpec, declarator, otherSpecs);
        this.addNote(CPPError.declaration.void_prohibited(this));
    }
    
}

export class TypedefDeclaration extends Declaration {

    protected readonly initializerAllowed = false;
    public readonly isDefinition = false;
    
    public constructor(context: ExecutableConstructContext, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, typeSpec, storageSpec, declarator, otherSpecs);
        this.addNote(CPPError.lobster.unsupported_feature(this, "typedef"));


        // ADD THIS BACK IN WHEN TYPEDEFS ARE SUPPORTED
        // if (this.storageSpecifier.numSpecs > 0 && this.isTypedef) {
        //     this.addNote(CPPError.declaration.storage.typedef(this, this.storageSpec.ast))
        // }
    }
    
}

export class FriendDeclaration extends Declaration {

    protected readonly initializerAllowed = false;
    public readonly isDefinition = false;
    
    public constructor(context: ExecutableConstructContext, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, typeSpec, storageSpec, declarator, otherSpecs);
        this.addNote(CPPError.lobster.unsupported_feature(this, "friend"));

        if (!(this.contextualScope instanceof ClassScope)) {
            this.addNote(CPPError.declaration.friend.outside_class(this));
        }

        if (otherSpecs.virtual) {
            this.addNote(CPPError.declaration.friend.virtual_prohibited(this));
        }
    }
    
}

export class UnknownBoundArrayDeclaration extends Declaration {

    // This class should only be created in cases where the size of
    // the array cannot be determined from its initializer, which is
    // problematic, but the initializer itself is not prohibited.
    protected readonly initializerAllowed = true;

    public readonly isDefinition = false;
    
    public constructor(context: ExecutableConstructContext, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, typeSpec, storageSpec, declarator, otherSpecs);
        this.addNote(CPPError.declaration.array.length_required(this));
    }
    
}

export class FunctionDeclaration extends Declaration {

    protected readonly initializerAllowed = false;
    public readonly isDefinition = false;
    
    public constructor(context: ExecutableConstructContext, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, typeSpec, storageSpec, declarator, otherSpecs);
        this.addNote(CPPError.lobster.unsupported_feature(this, "function declaration"));
    }
    
}

export class LocalObjectDefinition extends Declaration {

    protected readonly initializerAllowed = true;
    public readonly isDefinition = true;

    public readonly declaredEntity?: AutoEntity<ObjectType> | LocalReferenceEntity<ObjectType> | StaticEntity<ObjectType>;
    
    public constructor(context: ExecutableConstructContext, typeSpec: TypeSpecifier, storageSpec: StorageSpecifier,
        declarator: Declarator, otherSpecs: OtherSpecifiers) {

        super(context, typeSpec, storageSpec, declarator, otherSpecs);

        if (!this.type) {
            return;
        }

        let declaredEntity = 
            // type.isFunctionType() ? new FunctionEntity(declarator) :
            this.type.isReferenceType() ? new LocalReferenceEntity(this) :
            new AutoEntity(this);


        // Note extern unsupported error is added in the base Declaration class, so no need to add here

        // All local declarations are also definitions, with the exception of a local declaration of a function
        // or a local declaration with the extern storage specifier, but those are not currently supported by Lobster.
        // This means a locally declared variable does not have linkage, and we don't need to do any linking stuff here.

        // Attempt to add the declared entity to the scope. If it fails, note the error.
        // (e.g. an entity with the same name was already declared in the same scope)
        try{
            this.contextualScope.addDeclaredEntity(declaredEntity);
            this.declaredEntity = declaredEntity;
        }
        catch(e) {
            if (e instanceof Note) {
                this.addNote(e);
            }
            else{
                throw e;
            }
        }
    }
}


export class GlobalDeclaration extends Declaration {
    protected initializerAllowed: boolean;
    public isDefinition: boolean;

            // this.context.translationUnit.registerDefinition(entity, this);
}


export class Parameter extends LocalObjectDefinition {
    protected initializerAllowed: boolean;
    
    protected adjustType(type: Type) {
        return type.isArrayType() ? new PointerType(type.elemType, type.isConst, type.isVolatile) : type;
    }

}


interface ArrayPostfixDeclaratorASTNode {
    readonly kind: "array";
    readonly size?: ExpressionASTNode;
}

export interface ArgumentDeclarationASTNode {
    readonly declarator: DeclaratorASTNode;
    readonly specs: DeclarationSpecifiersASTNode;
    readonly initializer?: InitializerASTNode;
}

interface FunctionPostfixDeclaratorASTNode {
    readonly kind: "function";
    readonly size: ExpressionASTNode;
    readonly args: readonly ArgumentDeclarationASTNode[];
    readonly const?: boolean;
}

interface DeclaratorASTNode extends ASTNode {
    readonly pureVirtual?: boolean;
    readonly sub?: DeclaratorASTNode; // parentheses
    readonly pointer?: DeclaratorASTNode;
    readonly reference?: DeclaratorASTNode;
    readonly const?: boolean;
    readonly volatile?: boolean;
    readonly name?: IdentifierASTNode;
    readonly postfixes?: readonly (ArrayPostfixDeclaratorASTNode | FunctionPostfixDeclaratorASTNode)[];
}

interface DeclaratorInitASTNode extends DeclaratorASTNode {
    readonly initializer?: InitializerASTNode;
}

// TODO: take baseType as a parameter to compile rather than init
export class Declarator extends BasicCPPConstruct {

    public readonly name?: string;
    public readonly type?: Type;

    // The innermost set of parameters found in this declarator. Only useful if the
    // declarator is used to specify a function type, in which cases this is an array
    // of the function's Parameters. (However, it may technically still be defined in
    // other cases, e.g. an array of function pointers.)
    public readonly params? : readonly Parameter[];

    public readonly baseType: Type;
    public readonly isPureVirtual?: boolean;

    public static createFromAST(ast: DeclaratorASTNode, context: ConstructContext, baseType: Type) {
        return new Declarator(context, ast, baseType); // Note .setAST(ast) is called in the ctor already
    }
    
    /**
     * `Declarator.createFromAST()` should always be used to create Declarators, which delegates
     * to this private constructor. Directly calling the constructor from the outside is not allowed.
     * Since declarators are largely about processing an AST, it doesn't make much sense to create
     * one without an AST.
     */
    private constructor(context: ConstructContext, ast: DeclaratorASTNode, baseType: Type) {
        super(context);
        this.setAST(ast);
        this.baseType = baseType;
        
        // let isMember = isA(this.parent, Declarations.Member);

        if (ast.pureVirtual) { this.isPureVirtual = true; }

        this.determineNameAndType(ast);
    }

    private determineNameAndType(ast: DeclaratorASTNode) {
        
        let type = this.baseType;

        let first = true;
        // let prevKind : "function" | "reference" | "pointer" | "array" | "none" = "none";
        
        let decl: DeclaratorASTNode | undefined = ast; // AST will always be present on Declarators
        while (decl) {

            // We want to check whether this is the innermost thing, but first we need to loop
            // to descend through any AST representation of parentheses within the declarator.
            let tempDecl = decl;
            while(tempDecl.sub) {
                tempDecl = tempDecl.sub;
            }

            let isInnermost = !(tempDecl.pointer || tempDecl.reference || tempDecl.sub);

            if (decl.name) {
                (<Mutable<this>>this).name = decl.name.identifier;
                this.name && checkIdentifier(this, this.name, this);
            }

            if (decl.postfixes) {

                let arePostfixesInnermost = isInnermost;
                for(let i = decl.postfixes.length-1; i >= 0; --i) {

                    // A postfix portion of a declarator is only innermost if it's the leftmost one,
                    // which would be closest to where the name would occur in the declarator. (Note
                    // that this is also the last one processed here, since we iterate backward down to 0.)
                    let postfix = decl.postfixes[i];
                    isInnermost = arePostfixesInnermost && i === 0;

                    if(postfix.kind === "array") {
                        if (type.isArrayType()) {
                            this.addNote(CPPError.declaration.array.multidimensional_arrays_unsupported(this));
                            return;
                        }

                        if (!type.isArrayElemType()) {
                            this.addNote(CPPError.declaration.array.invalid_element_type(this, type));
                            return;
                        }
                        
                        // If it's a parameter and it's an array, adjust to pointer
                        // TODO: move this to Parameter Declaration class instead of here so that a Declarator
                        // doesn't need information about its context (i.e. whether it's in a parameter) to do its job.
                        // if (isParam && innermost && i == decl.postfixes.length - 1) {
                        //     prev = "pointer"; // Don't think this is necessary
                        //     type = Types.Pointer.instance(type, decl["const"], decl["volatile"]);
                        // }
                        
                        if (postfix.size) {

                            if (postfix.size.construct_type === "literal") {
                                // If the size specified is a literal, just use its value as array length
                                type = new ArrayType(type, (<NumericLiteralASTNode>postfix.size).value);
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

                        if (!type.isPotentialReturnType()) {
                            if (type.isFunctionType()) {
                                this.addNote(CPPError.declaration.func.return_func(this));
                            }
                            else if (type.isArrayType()){
                                this.addNote(CPPError.declaration.func.return_array(this));
                            }
                            else {
                                this.addNote(CPPError.declaration.func.invalid_return_type(this, type));
                            }
                            return;
                        }

                        let paramDeclarators = postfix.args.map((argAST) => {
                            
                            // Need to create TypeSpecifier first to get the base type first for the declarators
                            let typeSpec = TypeSpecifier.createFromAST(argAST.specs.typeSpecs, this.context);
                            
                            // Compile declarator for each parameter (of the function-type argument itself)
                            return Declarator.createFromAST(argAST.declarator, this.context, typeSpec.type);
                        });
                        
                        let paramTypes = paramDeclarators.map(decl => decl.type);

                        // A parameter list of just (void) specifies no parameters
                        if (paramTypes.length == 1 && paramTypes[0] && paramTypes[0].isVoidType()) {
                            paramTypes = [];
                        }
                        else {
                            // Otherwise void parameters are bad
                            for (let j = 0; j < paramTypes.length; ++j) {
                                let paramType = paramTypes[j];
                                if (paramType && paramType.isVoidType()) {
                                    this.addNote(CPPError.declaration.func.void_param(paramDeclarators[j]));
                                }
                            }
                        }

                        if (!paramTypes.every(paramType => paramType && paramType.isPotentialParameterType())) {
                            this.addNote(CPPError.declaration.func.some_invalid_parameter_types(this));
                        }

                        // TODO clean up error immediately above and get rid of yucky cast below
                        type = new FunctionType(type, <PotentialParameterType[]>paramTypes, decl.const, decl.volatile, this.context.containingClass && this.context.containingClass.cvQualified(!!postfix.const));
                    }

                    first = false;
                }
            }

            // Process pointers/references next
            // NOTE: this line should NOT be else if since the same AST node may
            // have both postfixes and a pointer/reference
            if (decl.pointer) {
                if (!type.isObjectType()) {
                    if (type.isReferenceType()){
                        this.addNote(CPPError.declaration.pointer.reference(this));
                    }
                    else if (type.isVoidType()) {
                        this.addNote(CPPError.declaration.pointer.void(this))
                    }
                    else {
                        this.addNote(CPPError.declaration.pointer.invalid_pointed_type(this, type));
                    }
                    return;
                }
                type = new PointerType(type, decl["const"], decl["volatile"]);
                decl = decl.pointer;
            }
            else if (decl.reference) {
                if (!type.isObjectType()) {
                    if (type.isReferenceType()){
                        this.addNote(CPPError.declaration.ref.ref(this));
                    }
                    else {
                        this.addNote(CPPError.declaration.ref.invalid_referred_type(this, type));
                    }
                    return;
                }
                type = new ReferenceType(type, decl["const"], decl["volatile"]);
                decl = decl.reference;
            }
            else if (decl.hasOwnProperty("sub")) {
                decl = decl.sub;
            }
            else{
                break;
            }

            first = false;
        }

        (<Mutable<this>>this).type = type;
    
        TODO // move this error somewhere else
        if (isMember && isA(this.type, Types.reference)){
            this.addNote(CPPError.declaration.ref.memberNotSupported(this));
        }
    }
}

var OVERLOADABLE_OPS = {};

["new[]"
    , "delete[]"
    , "new"
    , "delete"
    , "->*", ">>=", "<<="
    , "+=", "-=", "*=", ",=", "%=", "^="
    , "&=", "|=", "<<", ">>", "==", "!="
    , "<=", ">=", "&&", "||", "++", "--"
    , "->", "()", "[]"
    , "+", "-", "*", "/", "%", "^", "&"
    , "|", "~", "!", "=", "<", ">", ","].forEach(function (op) {
        OVERLOADABLE_OPS["operator" + op] = true;
    });

    // TODO: Add BaseDeclarationMixin stuff
export class FunctionDefinition extends CPPConstruct implements ExecutableConstruct {
    public onAttach(parent: CPPConstruct): void {
        throw new Error("Method not implemented.");
    }

    public readonly parent?: ExecutableConstruct;
    public readonly containingFunction: FunctionEntity = this;

    _name: "FunctionDefinition",
    isDefinition: true,
    i_childrenToExecute: ["memberInitializers", "body"], // TODO: why do regular functions have member initializers??
    instType: "function",
    i_runtimeConstructClass : RuntimeFunction,

    init : function(ast, context){
        ast.specs = ast.specs || {typeSpecs: [], storageSpecs: []};
        this.initParent(ast, context);
    },

    attach : function(context) {
        FunctionDefinition._parent.attach.call(this, copyMixin(context, {func: this}));
    },

    i_createFromAST : function(ast, context) {
        FunctionDefinition._parent.i_createFromAST.apply(this, arguments);
        this.calls = [];

        // Check if it's a member function
        if (context.containingClass) {
            this.isMemberFunction = true;
            this.isInlineMemberFunction = true;
            this.i_containingClass = context.containingClass;
            this.receiverType = this.parent.type.instance();
        }
        this.memberInitializers = [];
        this.autosToDestruct = [];

        this.body = CPPConstruct.create(this.ast.body, {func: this, parent: this}, Statements.FunctionBodyBlock);
    },

    compile : function(){
        this.compileDeclaration();
        this.compileDefinition();
    },

    // EFFECTS: returns an array of errors
    compileDeclaration : function(){
        var ast = this.ast;


        // This function's scope (actually scope used for its body block)
        this.bodyScope = this.body.blockScope;

        this.compileDeclarator();
        if (this.hasErrors()){
            return;
        }

        // Add entity to scope
        try{
            if (!this.makeEntity()) {
                return;
            }

            // If main, should have no parameters
            if (this.isMain && this.params.length > 0){
                this.addNote(CPPError.declaration.func.mainParams(this.params[0]));
            }

            if (this.isMemberFunction){
                this.i_containingClass.addMember(this.entity);
            }


            if (!this.isMemberFunction && this.virtual){
                this.addNote(CPPError.declaration.func.virtual_not_allowed(this));
            }

            this.checkOverloadSemantics();

        }
        catch(e){
            if (isA(e, SemanticException)){
                this.addNote(e.annotation(this));
                return;
            }
            else{
                console.log(e.stack);
                throw e;
            }
        }
    },

    // Responsible for setting the type, params, and paramTypes properties
    compileDeclarator : function(){
        // Compile the type specifier
        var typeSpec = TypeSpecifier.instance(this.ast.specs.typeSpecs, {parent: this});
        typeSpec.compile();
        if (this.hasErrors()){
            return;
        }

        this.virtual = !!this.ast.specs.virtual;

        // Compile the declarator
        var decl = this.declarator = Declarator.instance(this.ast.declarator, {parent: this, scope: this.bodyScope});
        decl.compile({baseType: typeSpec.type});
        this.name = decl.name;
        this.isMain = this.name === "main";
        this.type = decl.type;

        this.params = this.declarator.params || [];
        this.paramTypes = this.params.map(function(param){
            return param.type;
        });
    },

    compileDefinition : function(){
        var self = this;
        if (this.hasErrors()){
            return;
        }

        // Compile the body
        this.body.compile();

        if (this.hasErrors()){return;}

        // this.semanticProblems.addWidget(DeclarationAnnotation.instance(this));

        this.autosToDestruct = this.bodyScope.automaticObjects.filter(function(obj){
            return isA(obj.type, Types.Class);
        });

        this.bodyScope.automaticObjects.filter(function(obj){
          return isA(obj.type, Types.Array) && isA(obj.type.elemType, Types.Class);
        }).map(function(arr){
          for(var i = 0; i < arr.type.length; ++i){
            self.autosToDestruct.push(ArraySubobjectEntity.instance(arr, i));
          }
        });

        this.autosToDestruct = this.autosToDestruct.map(function(entityToDestruct){
            var dest = entityToDestruct.type.destructor;
            if (dest){
                var call = FunctionCall.instance({args: []}, {parent: self, scope: self.bodyScope});
                call.compile({
                    func: dest,
                    receiver: entityToDestruct});
                return call;
            }
            else{
                self.addNote(CPPError.declaration.dtor.no_destructor_auto(entityToDestruct.decl, entityToDestruct));
            }

        });
    },

    checkOverloadSemantics : function(){
        if (this.name === "operator=" || this.name === "operator()" || this.name === "operator[]"){
            if (!this.isMemberFunction){
                this.addNote(CPPError.declaration.func.op_member(this));
            }
        }

        if (this.name === "operator[]" && this.params.length !== 1){
            this.addNote(CPPError.declaration.func.op_subscript_one_param(this));
        }
    },

    emptyBody : function(){
        return this.ast.body.statements.length === 0;
    },

    callSearch : function(callback, options){
        options = options || {};
        // this.calls will be filled when the body is being compiled
        // We assume this has already been done for all functions.

        this.callClosure = {};

        var queue = [];
        queue.unshiftAll(this.calls.map(function(call){
            return {call: call, from: null};
        }));

        var search = {
            chain: []
        };
        while (queue.length > 0){
            var next = (options.searchType === "dfs" ? queue.pop() : queue.shift());
            var call = next.call;
            search.chain = next;
            if (search.stop){
                break;
            }
            else if (search.skip){

            }
            else if (call.func.isLinked() && call.func.isStaticallyBound()){

                if (call.staticFunction.decl === this){
                    search.cycle = true;
                }
                else{
                    search.cycle = false;
                    for(var c = next.from; c; c = c.from){
                        if (c.call.staticFunction.entityId === call.staticFunction.entityId){
                            search.cycle = true;
                            break;
                        }
                    }
                }

                callback && callback(search);

                // If there's no cycle, we can push children
                if (!search.cycle && isA(call.staticFunction.decl, FunctionDefinition)) {
                    for(var i = call.staticFunction.decl.calls.length-1; i >= 0; --i){
                        queue.push({call: call.staticFunction.decl.calls[i], from: next});
                    }
                }

                this.callClosure[call.staticFunction.entityId] = true;
            }

        }
    },

    tailRecursionAnalysis : function(annotatedCalls){

        // Assume not recursive at first, will be set to true if it is
        this.isRecursive = false;

        // Assume we can use constant stack space at first, will be set to false if not
        this.constantStackSpace = true;

        //from = from || {start: this, from: null};

        // The from parameter sort of represents all functions which, if seen again, constitute recursion


        //console.log("tail recursion analysis for: " + this.name);
        var self = this;
        this.callSearch(function(search){

            // Ignore non-cycles
            if (!search.cycle){
                return;
            }

            var str = " )";
            var chain = search.chain;
            var cycleStart = chain.call;
            var first = true;
            var inCycle = true;
            var tailCycle = true;
            var nonTailCycleCalls = [];
            var firstCall = chain.call;
            while (chain){
                var call = chain.call;

                // Mark all calls in the cycle as part of a cycle, except the original
                if (chain.from || first){
                    call.isPartOfCycle = true;
                }

                // Make sure we know whether it's a tail call
                call.tailRecursionCheck();

                // At time of writing, this will always be true due to the way call search works
                if (call.staticFunction){
                    // If we know what the call is calling


                    str = (call.staticFunction.name + ", ") + str;
                    if (call.isTail){
                        str = "t-" + str;
                    }
                    if (!first && call.staticFunction === cycleStart.staticFunction){
                        inCycle = false;
                        str = "( " + str;
                    }

                    // This comes after possible change in inCycle because first part of cycle doesn't have to be tail
                    if (inCycle){
                        if (!annotatedCalls[call.id]){
                            // TODO: fix this to not use semanticProblems
                            // self.semanticProblems.addWidget(RecursiveCallAnnotation.instance(call, call.isTail, call.isTailReason, call.isTailOthers));
                            annotatedCalls[call.id] = true;
                        }
                    }
                    if (inCycle && !call.isTail){
                        tailCycle = false;
                        nonTailCycleCalls.push(call);
                    }
                }
                else if (call.staticFunctionType){
                    // Ok at least we know the type we're calling

                }
                else{
                    // Uhh we don't know anything. This really shouldn't happen.
                }
                first = false;
                chain = chain.from;
            }
            //console.log(str + (tailCycle ? " tail" : " non-tail"));

            // We found a cycle so it's certainly recursive
            self.isRecursive = true;

            // If we found a non-tail cycle, it's not tail recursive
            if (!tailCycle){
                self.constantStackSpace = false;
                if (!self.nonTailCycles){
                    self.nonTailCycles = [];
                }
                self.nonTailCycles.push(search.chain);
                self.nonTailCycle = search.chain;
                self.nonTailCycleReason = str;

                if(!self.nonTailCycleCalls){
                    self.nonTailCycleCalls = [];
                }
                self.nonTailCycleCalls.pushAll(nonTailCycleCalls);
            }
        },{
            searchType: "dfs"
        });
        //console.log("");
        //console.log("");

        self.tailRecursionAnalysisDone = true;


        // TODO: fix this to not use semanticProblems
        // this.semanticProblems.addWidget(RecursiveFunctionAnnotation.instance(this));
    },

    makeEntity : function(){
        var entity;
        if (this.isMemberFunction){
            entity = MemberFunctionEntity.instance(this, this.i_containingClass, this.virtual);
        }
        else{
            entity = FunctionEntity.instance(this);
        }


        entity.setDefinition(this);

        this.entity = entity;

        if (!this.isMemberFunction) {
            try {
                this.contextualScope.addDeclaredEntity(entity);
            }
            catch(e) {
                this.addNote(e);
                return null;
            }
        }
        return entity;
    },

    setArguments : function(sim: Simulation, rtConstruct: RuntimeConstruct, args){
        inst.argInitializers = args;
    },


    isTailChild : function(child){
        if (child !== this.body){
            return {isTail: false};
        }
        else if (this.autosToDestruct.length > 0){
            return {
                isTail: false,
                reason: "The highlighted local variables ("

                +
                this.bodyScope.automaticObjects.filter(function(obj){
                    return isA(obj.type, Types.Class);
                }).map(function(obj){

                    return obj.name;

                }).join(",")
                    +

                ") have destructors that will run at the end of the function body (i.e. after any possible recursive call).",
                others: this.bodyScope.automaticObjects.filter(function(obj){
                    return isA(obj.type, Types.Class);
                }).map(function(obj){

                    var decl = obj.decl;
                    if (isA(decl, Declarator)){
                        decl = decl.parent;
                    }
                    return decl;

                })
            }
        }
        else {
            return {isTail: true};
        }
    },
    describe : function(){
        var exp = {};
        exp.message = "a function definition";
        return exp;
    }
}

// TODO: this should be called ClassDefinition
export var ClassDeclaration = CPPConstruct.extend(BaseDeclarationMixin, {
    _name: "ClassDeclaration",

    compile : function(){
        assert(false, "Must use compileDeclaration and compileDefinition separately for a ClassDeclaration.");
    },

    compileDeclaration : function(){
        var ast = this.ast;


        this.key = ast.head.key;
        this.name = ast.head.name.identifier;
        this.members = [];


        // Base classes

        if (this.ast.head.bases && this.ast.head.bases.length > 0){
            if (this.ast.head.bases.length > 1){
                this.addNote(CPPError.class_def.multiple_inheritance(this));
                return;
            }

            try{
                var baseCode = this.ast.head.bases[0];

                // TODO NEW: Use an actual Identifier expression for this
                this.base = this.contextualScope.requiredLookup(baseCode.name.identifier);

                if (!isA(this.base, TypeEntity) || !isA(this.base.type, Types.Class)){
                    this.addNote(CPPError.class_def.base_class_type({ast:baseCode.name}, baseCode.name.identifier));
                }

                if (baseCode.virtual){
                    this.addNote(CPPError.class_def.virtual_inheritance({ast:baseCode.name}, baseCode.name.identifier));
                }
            }
            catch(e){
                if (isA(e, SemanticExceptions.BadLookup)){
                    this.addNote(e.annotation(this));
                }
                else{
                    throw e;
                }
            }
        }



        // Check that no other type with the same name already exists
        try {
//            console.log("addingEntity " + this.name);
            // class type. will be incomplete initially, but made complete at end of class declaration
            this.type = Types.Class.createClassType(this.name, this.contextualScope, this.base && this.base.type, []);
            this.classTypeClass = this.type;

            this.classScope = this.type.classScope;

            this.entity = TypeEntity.instance(this);

            this.entity.setDefinition(this); // TODO add exception that allows a class to be defined more than once

            this.contextualScope.addDeclaredEntity(this.entity);
        }
        catch(e){
            if (isA(e, Note)){
                this.addNote(e);
                return;
            }
            else {
                throw e;
            }
        }




        // Compile the members


        var memDecls = this.memDecls = [];
        for(var i = 0; i < ast.member_specs.length; ++i){
            var spec = ast.member_specs[i];
            var access = spec.access || "private";
            for(var j = 0; j < spec.members.length; ++j){
                spec.members[j].access = access;
                var memDecl = Declaration.create(spec.members[j], {parent:this, scope: this.classScope, containingClass: this.type, access:access});

                // Within member function definitions, class is considered as complete even though it isn't yet
                if (isA(memDecl, FunctionDefinition)){
                    this.type.setTemporarilyComplete();
                }

                memDecl.compileDeclaration();

                // Remove temporarily complete
                this.type.unsetTemporarilyComplete();

                memDecls.push(memDecl);
            }
        }

        // If there are no constructors, then we need an implicit default constructor
        if(this.type.constructors.length == 0){
            var idc = this.createImplicitDefaultConstructor();
            if (idc){
                idc.compile();
                assert(!idc.hasErrors());
            }
        }

        let hasCopyConstructor = false;
        for(var i = 0; i < this.type.constructors.length; ++i){
            if (this.type.constructors[i].decl.isCopyConstructor){
                hasCopyConstructor = true;
                break;
            }
        }


        var hasUserDefinedAssignmentOperator = this.type.hasMember("operator=", {paramTypes: [this.type], isThisConst:false});

        // Rule of the Big Three
        var bigThreeYes = [];
        var bigThreeNo = [];
        (hasCopyConstructor ? bigThreeYes : bigThreeNo).push("copy constructor");
        (hasUserDefinedAssignmentOperator ? bigThreeYes : bigThreeNo).push("assignment operator");
        (this.type.destructor ? bigThreeYes : bigThreeNo).push("destructor");

        if (0 < bigThreeYes.length && bigThreeYes.length < 3){
            // If it's only because of an empty destructor, suppress warning
            if (bigThreeYes.length === 1 && this.type.destructor && this.type.destructor.decl.emptyBody()){

            }
            else{
                this.addNote(CPPError.class_def.big_three(this, bigThreeYes, bigThreeNo));
            }
        }

        this.customBigThree = bigThreeYes.length > 0;

        if (!hasCopyConstructor) {
            // Create implicit copy constructor
            var icc = this.createImplicitCopyConstructor();
            if (icc) {
                icc.compile();
                assert(!icc.hasErrors());
            }
        }

        if (!this.type.destructor) {
            // Create implicit destructor
            var idd = this.createImplicitDestructor();
            if (idd) {
                idd.compile();
                assert(!idd.hasErrors());
            }
        }
        if (!hasUserDefinedAssignmentOperator){

            // Create implicit assignment operator
            var iao = this.createImplicitAssignmentOperator();
            if (iao){
                iao.compile();
                assert(!iao.hasErrors());
            }
        }
    },

    compileDefinition : function() {
        if (this.hasErrors()){
            return;
        }
        for(var i = 0; i < this.memDecls.length; ++i){
            this.memDecls[i].compileDefinition();
        }
    },


    createImplicitDefaultConstructor : function(){
        var self = this;

        // If any data members are of reference type, do not create the implicit default constructor
        if (!this.type.memberSubobjectEntities.every(function(subObj){
                return !isA(subObj.type, Types.Reference);
            })){
            return;
        }

        // If any const data members do not have a user-provided default constructor
        if (!this.type.memberSubobjectEntities.every(function(subObj){
                if (!isA(subObj.type, Types.Class) || !subObj.type.isConst){
                    return true;
                }
                var defCon = subObj.type.getDefaultConstructor();
                return defCon && !defCon.decl.isImplicit();
            })){
            return;
        }

        // If any subobjects do not have a default constructor or destructor
        if (!this.type.subobjectEntities.every(function(subObj){
                return !isA(subObj.type, Types.Class) ||
                    subObj.type.getDefaultConstructor() &&
                    subObj.type.destructor;
            })){
            return;
        }


        var src = this.name + "() {}";
        //TODO: initialize members (i.e. that are classes)
        src = Lobster.cPlusPlusParser.parse(src, {startRule:"member_declaration"});
        return ConstructorDefinition.instance(src, {parent:this, scope: this.classScope, containingClass: this.type, access:"public", implicit:true});
    },

    createImplicitCopyConstructor : function(){
        var self = this;
        // If any subobjects are missing a copy constructor, do not create implicit copy ctor
        if (!this.type.subobjectEntities.every(function(subObj){
                return !isA(subObj.type, Types.Class) ||
                    subObj.type.getCopyConstructor(subObj.type.isConst);
            })){
            return;
        }

        // If any subobjects are missing a destructor, do not create implicit copy ctor
        if (!this.type.subobjectEntities.every(function(subObj){
                return !isA(subObj.type, Types.Class) ||
                    subObj.type.destructor;
            })){
            return;
        }

        var src = this.name + "(const " + this.name + " &other)";

        if (this.type.subobjectEntities.length > 0){
            src += "\n : ";
        }
        src += this.type.baseClassEntities.map(function(subObj){
            return subObj.type.className + "(other)";
        }).concat(this.type.memberEntities.map(function(subObj){
            return subObj.name + "(other." + subObj.name + ")";
        })).join(", ");

        src += " {}";
        src = Lobster.cPlusPlusParser.parse(src, {startRule:"member_declaration"});

        return ConstructorDefinition.instance(src, {parent:this, scope: this.classScope, containingClass: this.type, access:"public", implicit:true});
    },

    createImplicitAssignmentOperator : function () {
        var self = this;
        // Parameter will only be const if all subobjects have assignment ops that take const params
        var canMakeConst = this.type.subobjectEntities.every(function(subObj){
            return !isA(subObj.type, Types.Class) ||
                subObj.type.getAssignmentOperator(true);
        });

        var canMakeNonConst = canMakeConst || this.type.subobjectEntities.every(function(subObj){
            return !isA(subObj.type, Types.Class) ||
                subObj.type.getAssignmentOperator(false);
        });

        // If we can't make non-const, we also can't make const, and we can't make any implicit assignment op
        if (!canMakeNonConst){
            return;
        }
        var constPart = canMakeConst ? "const " : "";

        // If any data member is a reference, we can't make implicit assignment operator
        if (!this.type.memberSubobjectEntities.every(function(subObj){
                return !isA(subObj.type, Types.Reference);
            })){
            return;
        }

        // If any non-class member is const (or array thereof), we can't make implicit assignment operator
        if (!this.type.memberSubobjectEntities.every(function(subObj){
                //return (isA(subObj.type, Types.Class) || !subObj.type.isConst)
                //    && (!isA(subObj.type, Types.Array) || isA(subObj.type.elemType, Types.Class) || !subObj.type.elemType.isConst);
                return !subObj.type.isConst
                    && (!isA(subObj.type, Types.Array) || !subObj.type.elemType.isConst);
            })){
            return;
        }

        var src = this.name + " &operator=(" + constPart + this.name + " &rhs){";

        src += this.type.baseClassEntities.map(function(subObj){
            return subObj.type.className + "::operator=(rhs);";
        }).join("\n");

        var mems = this.type.memberSubobjectEntities;
        for(var i = 0; i < mems.length; ++i){
            var mem = mems[i];
            if (isA(mem.type, Types.Array)){
                var tempType = mem.type;
                var subscriptNum = isA(tempType.elemType, Types.Array) ? 1 : "";
                var subscripts = "";
                var closeBrackets = "";
                while(isA(tempType, Types.Array)){
                    src += "for(int i"+subscriptNum+"=0; i"+subscriptNum+"<"+tempType.length+"; ++i"+subscriptNum+"){";
                    subscripts += "[i"+subscriptNum+"]";
                    closeBrackets += "}";
                    tempType = tempType.elemType;
                    subscriptNum += 1;
                }
                src += mem.name + subscripts + " = rhs." + mem.name + "" + subscripts + ";";
                src += closeBrackets;
            }
            else{
                src += mems[i].name + " = rhs." + mems[i].name + ";";
            }
        }
        src += "return *this;}";
        src = Lobster.cPlusPlusParser.parse(src, {startRule:"member_declaration"});
        return FunctionDefinition.instance(src, {parent:this, scope: this.classScope, containingClass: this.type, access:"public", implicit:true});
    },

    createImplicitDestructor : function(){
        var self = this;
        // If any subobjects are missing a destructor, do not create implicit destructor
        if (!this.type.subobjectEntities.every(function(subObj){
                return !isA(subObj.type, Types.Class) ||
                    subObj.type.destructor;
            })){
            return;
        }

        var src = "~" + this.type.name + "(){}";
        src = Lobster.cPlusPlusParser.parse(src, {startRule:"member_declaration"});
        return DestructorDefinition.instance(src, {parent:this, scope: this.classScope, containingClass: this.type, access:"public", implicit:true});
    },

    createInstance : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        return RuntimeConstruct.instance(sim, this, {decl:0, step:"decl"}, "stmt", inst);
    },

    upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){

    },

    stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){

    }
});

export var MemberDeclaration = Declaration.extend({
    _name: "MemberDeclaration",
    init: function(ast, context){
        assert(context);
        assert(isA(context.containingClass, Types.Class));
        assert(context.hasOwnProperty("access"));
        this.initParent(ast, context);
    },

    i_createFromAST : function(ast, context) {
        MemberDeclaration._parent.i_createFromAST.apply(this, arguments);
        this.access = context.access;
        this.i_containingClass = context.containingClass;
    },

    i_determineStorage : function(){
        // Determine storage duration based on the kind of scope in which the declaration
        // occurs and any storage specifiers.
        if(this.storageSpec.static){
            this.storageDuration = "static";
        }
        else{
            this.storageDuration = "automatic";
        }
    },

    makeEntity: function(decl){

        // Note: we know it's not a function definition because that goes to the FunctionDefinition
        // class.  Thus any functions are not definitions.
        // Don't have to check for classes, for similar reasons.
        var isDefinition = !isA(decl.type, Types.Function)
            && !(this.storageSpec.extern && !(decl.initializer || decl.initializerList))
            && !this.typedef;

        this.isDefinition = isDefinition;

        var entity;
        if (isA(decl.type, Types.Function)){
            entity = MemberFunctionEntity.instance(decl, this.i_containingClass, this.virtual);
        }
        else if (this.storageDuration === "static"){
            entity = StaticEntity.instance(decl);
        }
        else{
            entity = MemberVariableEntity.instance(decl, this.i_containingClass);
            this.isDefinition = false; // TODO NEW: This is a hack. Since implementing a proper linking phase, static stuff may be broken.
        }

        if (this.isDefinition) {
            entity.setDefinition(this);
        }

        try {
            this.entities.push(entity);
            var options = {own: true};
            if (isA(entity, MemberFunctionEntity)) {
                options.paramTypes = entity.type.paramTypes;
                options.exactMatch = true;
                options.noBase = true;
            }
            if ((isA(entity, MemberVariableEntity) || isA(entity, MemberFunctionEntity))){
                // We don't check if a conflicting member already exists here - that will be
                // done inside addMember and an exception will be thrown if there is a conflict
                this.i_containingClass.addMember(entity); // this internally adds it to the class scope
            }
            return entity;
        }
        catch(e) {
            if (isA(e, Note)){
                this.addNote(e);
                return null;
            }
            else {
                throw e;
            }
        }
    }
});


export var ConstructorDefinition = FunctionDefinition.extend({
    _name: "ConstructorDefinition",

    i_childrenToExecute: ["memberInitializers", "body"], // TODO: why do regular functions have member initializers??


    instance : function(ast, context){
        assert(context);
        assert(isA(context.containingClass, Types.Class));
        assert(context.hasOwnProperty("access"));
        // Make sure it's actually a constructor
        if (ast.name.identifier !== context.containingClass.className){
            // oops was actually a function with missing return type
            return FunctionDefinition.instance(ast, context);
        }

        return ConstructorDefinition._parent.instance.apply(this, arguments);
    },

    compileDeclaration : function() {
        FunctionDefinition.compileDeclaration.apply(this, arguments);

        if (!this.hasErrors()){
            this.i_containingClass.addConstructor(this.entity);
        }
    },

    compileDeclarator : function(){
        var ast = this.ast;


        // NOTE: a constructor doesn't have a "name", and so we don't need to add it to any scope.
        // However, to make lookup easier, we give all constructors their class name plus the null character. LOL
        // TODO: this is silly. remove it pls :)
        this.name = this.i_containingClass.className + "\0";

        // Compile the parameters
        var args = this.ast.args;
        this.params = [];
        this.paramTypes = [];
        for (var j = 0; j < args.length; ++j) {
            var paramDecl = Parameter.instance(args[j], {parent: this, scope: this.bodyScope});
            paramDecl.compile();
            this.params.push(paramDecl);
            this.paramTypes.push(paramDecl.type);
        }
        this.isDefaultConstructor = this.params.length == 0;

        this.isCopyConstructor = this.params.length == 1
        && (isA(this.paramTypes[0], this.i_containingClass) ||
        isA(this.paramTypes[0], Types.Reference) && isA(this.paramTypes[0].refTo, this.i_containingClass));


        // Give error for copy constructor that passes by value
        if (this.isCopyConstructor && isA(this.paramTypes[0], this.i_containingClass)){
            this.addNote(CPPError.declaration.ctor.copy.pass_by_value(this.params[0], this.paramTypes[0], this.params[0].name));
        }

        // I know this is technically wrong but I think it makes things run smoother
        this.type = Types.Function.instance(Types.Void.instance(), this.paramTypes);
    },

    compileDefinition : function(){
        var self = this;
        var ast = this.ast;

        if (!ast.body){
            this.addNote(CPPError.class_def.ctor_def(this));
            return;
        }

        this.compileCtorInitializer();

        // Call parent class version. Will handle body, automatic object destruction, etc.
        FunctionDefinition.compileDefinition.apply(this, arguments);
    },

    compileCtorInitializer : function(){
        var memInits = this.ast.initializer || [];

        // First, check to see if this is a delegating constructor.
        // TODO: check on whether someone could techinically declare a member variable with the same name
        // as the class and how that affects the logic here.
        var targetConstructor = null;
        for(var i = 0; i < memInits.length; ++i){
            if (memInits[i].member.identifier == this.i_containingClass.className){
                targetConstructor = i;
                break;
            }
        }

        // It is a delegating constructor
        if (targetConstructor !== null){
            targetConstructor = memInits.splice(targetConstructor, 1)[0];
            // If it is a delegating constructor, there can be no other memInits
            if (memInits.length === 0){ // should be 0 since one removed
                var mem = MemberInitializer.instance(targetConstructor, {parent: this, scope: this.bodyScope});
                mem.compile(ReceiverEntity.instance(this.i_containingClass));
                this.memberInitializers.push(mem);
            }
            else{
                this.addNote(CPPError.declaration.ctor.init.delegating_only(this));
            }
            return;
        }

        // It is a non-delegating constructor

        // If there is a base class subobject, initialize it
        var base;
        if (base = this.i_containingClass.getBaseClass()){
            // Check to see if there is a base class initializer.
            var baseInits = memInits.filter(function(memInit){
                return memInit.member.identifier === base.className;
            });
            memInits = memInits.filter(function(memInit){
                return memInit.member.identifier !== base.className;
            });

            if (baseInits.length > 1){
                this.addNote(CPPError.declaration.ctor.init.multiple_base_inits(this));
            }
            else if (baseInits.length === 1){
                var mem = MemberInitializer.instance(baseInits[0], {parent: this, scope: this.bodyScope});
                mem.compile(this.i_containingClass.baseClassEntities[0]);
                this.memberInitializers.push(mem);
            }
            else{
                var mem = DefaultMemberInitializer.instance(this.ast, {parent: this, scope: this.bodyScope});
                mem.compile(this.i_containingClass.baseClassEntities[0]);
                this.memberInitializers.push(mem);
                mem.isMemberInitializer = true;
            }
        }

        // Initialize non-static data members of the class

        // Create a map of name to initializer. Initially all initializers are null.
        var initMap = {};
        this.i_containingClass.memberSubobjectEntities.forEach(function(objMember){
            initMap[objMember.name] = objMember;
        });

        // Iterate through all the member initializers and associate them with appropriate member
        for(var i = 0; i < memInits.length; ++i){
            var memInit = memInits[i];

            // Make sure this type has a member of the given name
            var memberName = memInit.member.identifier;
            if (initMap.hasOwnProperty(memberName)) {
                var mem = MemberInitializer.instance(memInit, {parent: this, scope: this.bodyScope});
                mem.compile(initMap[memberName]);
                initMap[memberName] = mem;
            }
            else{
                this.addNote(CPPError.declaration.ctor.init.improper_member(this, this.i_containingClass, memberName));
            }
        }

        // Now iterate through members again in declaration order. Add associated member initializer
        // from above or default initializer if there wasn't one.

        var self = this;
        this.i_containingClass.memberSubobjectEntities.forEach(function(objMember){
            if (isA(initMap[objMember.name], MemberInitializer)){
                self.memberInitializers.push(initMap[objMember.name]);
            }
            else if (isA(objMember.type, Types.Class) || isA(objMember.type, Types.Array)){
                var mem = DefaultMemberInitializer.instance(self.ast, {parent: self, scope: self.bodyScope});
                mem.compile(objMember);
                self.memberInitializers.push(mem);
                mem.isMemberInitializer = true;
            }
            else{
                // No need to do anything for non-class types since default initialization does nothing
            }
        });
    },

    isTailChild : function(child){
        return {isTail: false};
    },

    describe : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        var desc = {};
        if (this.isDefaultConstructor){
            desc.message = "the default constructor for the " + this.i_containingClass.className + " class";
        }
        else if (this.isCopyConstructor){
            desc.message = "the copy constructor for the " + this.i_containingClass.className + " class";
        }
        else{
            desc.message = "a constructor for the " + this.i_containingClass.className + " class";
        }
        return desc
    }
});







export var DestructorDefinition = FunctionDefinition.extend({
    _name: "DestructorDefinition",

    init : function(ast, context){
        assert(context);
        assert(isA(context.containingClass, Types.Class));
        assert(context.hasOwnProperty("access"));
        this.initParent(ast, context);
        this.access = context.access;
        this.i_containingClass = context.containingClass;
    },

    compileDeclaration : function() {
        FunctionDefinition.compileDeclaration.apply(this, arguments);
        this.i_containingClass.addDestructor(this.entity);
    },

    compileDeclarator : function() {
        var ast = this.ast;


        // Destructors do have names and can be found via name lookup
        this.name = "~" + this.i_containingClass.className;

        this.virtual = this.ast.virtual;

        // There are no parameters for a destructor
        this.params = [];
        this.paramTypes = [];

        // I know this is technically wrong but I think it makes things run smoother
        this.type = Types.Function.instance(Types.Void.instance(), this.paramTypes);
    },

    compileDefinition: function(){
        var self = this;
        var ast = this.ast;


        if (!ast.body){
            this.addNote(CPPError.class_def.dtor_def(this));
            return;
        }

        // Call parent class version. Will handle body, automatic object destruction, etc.
        FunctionDefinition.compileDefinition.apply(this, arguments);

        this.membersToDestruct = this.i_containingClass.memberSubobjectEntities.filter(function(entity){
            return isA(entity.type, Types.Class);
        }).map(function(entityToDestruct){
            var dest = entityToDestruct.type.destructor;
            if (dest){
                var call = FunctionCall.instance({args: []}, {parent: self});
                call.compile({
                    func: dest,
                    receiver: entityToDestruct});
                return call;
            }
            else{
                self.addNote(CPPError.declaration.dtor.no_destructor_member(entityToDestruct.decl, entityToDestruct, self.i_containingClass));
            }

        });

        this.basesToDestruct = this.i_containingClass.baseClassEntities.map(function(entityToDestruct){
            var dest = entityToDestruct.type.destructor;
            if (dest){
                var call = FunctionCall.instance({args: []}, {parent: self});
                call.compile({
                    func: dest,
                    receiver: entityToDestruct});
                return call;
            }
            else{
                self.addNote(CPPError.declaration.dtor.no_destructor_base(entityToDestruct.decl, entityToDestruct, self.i_containingClass));
            }

        });
    },

    upNext : Class.BEFORE(function(sim: Simulation, rtConstruct: RuntimeConstruct){
        if (inst.index === "afterChildren") {
            // These are pushed on a stack and so end up happening
            // in reverse order of the order they are pushed here.
            // Autos first, then members, then bases.
            this.basesToDestruct.forEach(function (dest){
                dest.createAndPushInstance(sim, inst);
            });
            this.membersToDestruct.forEach(function (dest){
                dest.createAndPushInstance(sim, inst);
            });
            // Auto destructors are handled in parent class
        }
    }),

    stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
        if (inst.index === "afterDestructors"){
            inst.index = "done";
        }
    },

    isTailChild : function(child){
        return {isTail: false};
    }
});

