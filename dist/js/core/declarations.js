"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionDefinitionGroup = exports.IncompleteTypeMemberVariableDeclaration = exports.MemberVariableDeclaration = exports.BaseSpecifier = exports.ClassDefinition = exports.ClassDeclaration = exports.FunctionDefinition = exports.Declarator = exports.IncompleteTypeVariableDefinition = exports.ParameterDeclaration = exports.GlobalVariableDefinition = exports.LocalVariableDefinition = exports.FunctionDeclaration = exports.UnknownBoundArrayDeclaration = exports.FriendDeclaration = exports.TypedefDeclaration = exports.VoidDeclaration = exports.UnknownTypeDeclaration = exports.SimpleDeclaration = exports.createMemberSimpleDeclarationFromAST = exports.createMemberDeclarationFromAST = exports.createLocalSimpleDeclarationFromAST = exports.createLocalDeclarationFromAST = exports.setInitializerFromAST = exports.createTopLevelDeclarationFromAST = exports.TypeSpecifier = exports.StorageSpecifier = void 0;
const constructs_1 = require("./constructs");
const errors_1 = require("./errors");
const util_1 = require("../util/util");
const types_1 = require("./types");
const functions_1 = require("./functions");
const cpp_parser_util_1 = require("../parse/cpp_parser_util");
const ast_expressions_1 = require("../ast/ast_expressions");
const entities_1 = require("./entities");
const expressions_1 = require("./expressions");
const lexical_1 = require("./lexical");
const statements_1 = require("./statements");
const initializers_1 = require("./initializers");
const ObjectDeallocator_1 = require("./ObjectDeallocator");
class StorageSpecifier extends constructs_1.BasicCPPConstruct {
    constructor(context, specs) {
        super(context, undefined);
        this.construct_type = "storage_specifier";
        let numSpecs = 0; // count specs separately to get a count without duplicates
        specs.forEach((spec) => {
            if (this[spec]) {
                // If it was already true, we must be processing a duplicate
                this.addNote(errors_1.CPPError.declaration.storage.once(this, spec));
            }
            else {
                util_1.asMutable(this)[spec] = true;
                ++numSpecs;
            }
        });
        if (this.static) {
            this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, "static"));
        }
        if (this.thread_local) {
            this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, "thread_local"));
        }
        if (this.register) {
            this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, "register"));
        }
        if (this.mutable) {
            this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, "mutable"));
        }
        // 0 specifiers is ok
        // 1 specifier is ok
        // 2 specifiers only ok if one is thread_local and the other is static/extern
        // 3 or more specifiers are always incompatible
        if (numSpecs < 2 ||
            numSpecs == 2 && this.thread_local && (this.static || this.extern)) {
            //ok
        }
        else {
            this.addNote(errors_1.CPPError.declaration.storage.incompatible(this, specs));
        }
        this.isEmpty = (numSpecs === 0);
    }
    static createFromAST(ast, context) {
        return new StorageSpecifier(context, ast);
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && this.register === other.register
            && this.static === other.static
            && this.thread_local === other.thread_local
            && this.extern === other.extern
            && this.mutable === other.mutable
            && this.isEmpty === other.isEmpty;
    }
}
exports.StorageSpecifier = StorageSpecifier;
class TypeSpecifier extends constructs_1.BasicCPPConstruct {
    constructor(context, specs) {
        super(context, undefined);
        this.construct_type = "type_specifier";
        let constCount = 0;
        let volatileCount = 0;
        specs.forEach((spec) => {
            if (spec instanceof Object && spec.construct_type === "elaborated_type_specifier") {
                this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, "class declarations or elaborated type specifiers"));
                return;
            }
            if (spec instanceof Object && spec.construct_type === "class_definition") {
                this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, "inline class definitions"));
                return;
            }
            if (spec === "enum") {
                util_1.asMutable(this).enum = true;
                this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, "mutable"));
                return;
            }
            // check to see if it's one of the possible type specifiers
            let possibleSpecs = ["const", "volatile", "signed", "unsigned", "enum"];
            let matchedSpec = possibleSpecs.find(s => s === spec);
            if (matchedSpec) { // found a type specifier
                if (this[matchedSpec]) {
                    // it was a duplicate
                    this.addNote(errors_1.CPPError.declaration.typeSpecifier.once(this, matchedSpec));
                }
                else {
                    // first time this spec seen, set to true
                    util_1.asMutable(this)[matchedSpec] = true;
                }
            }
            else { // It's a typename
                if (this.typeName) { // already had a typename, this is a duplicate
                    this.addNote(errors_1.CPPError.declaration.typeSpecifier.one_type(this, [this.typeName, spec]));
                }
                else {
                    util_1.asMutable(this).typeName = spec;
                }
            }
        });
        if (this.unsigned && this.signed) {
            this.addNote(errors_1.CPPError.declaration.typeSpecifier.signed_unsigned(this));
        }
        // If unsigned/signed specifier is present and there is no type name, default to int
        if ((this.unsigned || this.signed) && !this.typeName) {
            this.typeName = "int";
        }
        // If we don't have a typeName by now, it means the declaration didn't specify a type.
        if (!this.typeName) {
            return;
        }
        // Check to see if type name is one of the built in types
        if (this.typeName && types_1.isBuiltInTypeName(this.typeName)) {
            util_1.asMutable(this).baseType = new types_1.builtInTypes[this.typeName](this.const, this.volatile);
            return;
        }
        // Otherwise, check to see if the type name is in scope
        let customType = this.context.contextualScope.lookup(this.typeName);
        if ((customType === null || customType === void 0 ? void 0 : customType.declarationKind) === "class") {
            util_1.asMutable(this).baseType = customType.type.cvQualified(this.const, this.volatile);
            return;
        }
        this.addNote(errors_1.CPPError.type.typeNotFound(this, this.typeName));
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && this.const === other.const
            && this.volatile === other.volatile
            && this.signed === other.signed
            && this.unsigned === other.unsigned
            && this.enum === other.enum
            && this.typeName === other.typeName
            && types_1.sameType(this.baseType, other.baseType);
    }
    static createFromAST(ast, context) {
        return new TypeSpecifier(context, ast);
    }
}
exports.TypeSpecifier = TypeSpecifier;
;
const TopLevelDeclarationConstructsMap = {
    "simple_declaration": (ast, context) => createTopLevelSimpleDeclarationFromAST(ast, context),
    "function_definition": (ast, context) => {
        return FunctionDefinition.createFromAST(ast, context);
    },
    "class_definition": (ast, context) => ClassDefinition.createFromAST(ast, context)
};
function createTopLevelDeclarationFromAST(ast, context) {
    return TopLevelDeclarationConstructsMap[ast.construct_type](ast, context);
}
exports.createTopLevelDeclarationFromAST = createTopLevelDeclarationFromAST;
function createTopLevelSimpleDeclarationFromAST(ast, context) {
    util_1.assert(!constructs_1.isBlockContext(context), "Cannot create a top level declaration in a block context.");
    util_1.assert(!constructs_1.isClassContext(context), "Cannot create a top level declaration in a class context.");
    // Need to create TypeSpecifier first to get the base type for the declarators
    let typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs, context);
    let baseType = typeSpec.baseType;
    let storageSpec = StorageSpecifier.createFromAST(ast.specs.storageSpecs, context);
    // Create an array of the individual declarations (multiple on the same line
    // will be parsed as a single AST node and need to be broken up)
    return ast.declarators.map((declAST) => {
        // Create declarator and determine declared type
        let declarator = Declarator.createFromAST(declAST, context, baseType);
        let declaredType = declarator.type;
        // Create the declaration itself. Which kind depends on the declared type
        let declaration;
        if (!declaredType) {
            declaration = new UnknownTypeDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (ast.specs.friend) {
            declaration = new FriendDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (ast.specs.typedef) {
            declaration = new TypedefDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (declaredType.isVoidType()) {
            declaration = new VoidDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (declaredType.isFunctionType()) {
            declaration = new FunctionDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        else if (declaredType.isArrayOfUnknownBoundType()) {
            // TODO: it may be possible to determine the bound from the initializer
            declaration = new UnknownBoundArrayDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        else if (declaredType.isCompleteObjectType() || declaredType.isReferenceType()) {
            declaration = new GlobalVariableDefinition(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
            setInitializerFromAST(declaration, declAST.initializer, context);
        }
        else {
            declaration = new IncompleteTypeVariableDefinition(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        return declaration;
    });
}
function setInitializerFromAST(declaration, initAST, context) {
    if (!initAST) {
        declaration.setDefaultInitializer();
    }
    else if (initAST.construct_type === "direct_initializer") {
        declaration.setDirectInitializer(initAST.args.map((a) => expressions_1.createExpressionFromAST(a, context)));
    }
    else if (initAST.construct_type === "copy_initializer") {
        declaration.setCopyInitializer(initAST.args.map((a) => expressions_1.createExpressionFromAST(a, context)));
    }
    else if (initAST.construct_type === "list_initializer") {
        declaration.setInitializerList(initAST.arg.elements.map((a) => expressions_1.createExpressionFromAST(a, context)));
    }
}
exports.setInitializerFromAST = setInitializerFromAST;
const LocalDeclarationConstructsMap = {
    "simple_declaration": (ast, context) => createLocalSimpleDeclarationFromAST(ast, context),
    "function_definition": (ast, context) => FunctionDefinition.createFromAST(ast, context),
    "class_definition": (ast, context) => ClassDefinition.createFromAST(ast, context)
};
function createLocalDeclarationFromAST(ast, context) {
    return LocalDeclarationConstructsMap[ast.construct_type](ast, context);
}
exports.createLocalDeclarationFromAST = createLocalDeclarationFromAST;
function createLocalSimpleDeclarationFromAST(ast, context) {
    util_1.assert(constructs_1.isBlockContext(context), "A local declaration must be created in a block context.");
    // Need to create TypeSpecifier first to get the base type for the declarators
    let typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs, context);
    let baseType = typeSpec.baseType;
    let storageSpec = StorageSpecifier.createFromAST(ast.specs.storageSpecs, context);
    // Create an array of the individual declarations (multiple on the same line
    // will be parsed as a single AST node and need to be broken up)
    return ast.declarators.map((declAST) => {
        // Create declarator and determine declared type
        let declarator = Declarator.createFromAST(declAST, context, baseType);
        let declaredType = declarator.type;
        // Create the declaration itself. Which kind depends on the declared type
        let declaration;
        if (!declaredType) {
            declaration = new UnknownTypeDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (ast.specs.friend) {
            declaration = new FriendDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (ast.specs.typedef) {
            declaration = new TypedefDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (declaredType.isVoidType()) {
            declaration = new VoidDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (declaredType.isFunctionType()) {
            declaration = new FunctionDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        else if (declaredType.isArrayOfUnknownBoundType()) {
            // TODO: it may be possible to determine the bound from the initializer
            declaration = new UnknownBoundArrayDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        else if (declaredType.isCompleteObjectType() || declaredType.isReferenceType()) {
            declaration = new LocalVariableDefinition(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
            setInitializerFromAST(declaration, declAST.initializer, context);
        }
        else {
            declaration = new IncompleteTypeVariableDefinition(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        return declaration;
    });
}
exports.createLocalSimpleDeclarationFromAST = createLocalSimpleDeclarationFromAST;
const MemberDeclarationConstructsMap = {
    "simple_member_declaration": (ast, context) => createMemberSimpleDeclarationFromAST(ast, context),
    "function_definition": (ast, context) => createFunctionDeclarationFromDefinitionAST(ast, context)
    // Note: function_definition includes ctor and dtor definitions
};
function createMemberDeclarationFromAST(ast, context) {
    return MemberDeclarationConstructsMap[ast.construct_type](ast, context);
}
exports.createMemberDeclarationFromAST = createMemberDeclarationFromAST;
function createMemberSimpleDeclarationFromAST(ast, context) {
    // assert(isMemberSpecificationContext(context), "A Member declaration must be created in a member specification context.");
    // Need to create TypeSpecifier first to get the base type for the declarators
    let typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs, context);
    let baseType = typeSpec.baseType;
    let storageSpec = StorageSpecifier.createFromAST(ast.specs.storageSpecs, context);
    // A constructor may have been parsed incorrectly due to an ambiguity in the grammar.
    // For example, A(); might have been parsed as a function returning an A with a declarator
    // that is missing its name. In that case, A would be the type specifier.
    // So, we check the first declarator. If it has no name, and the type specifier
    // identified the contextual class type, we know this mistake has occurred and we fix it.
    if (baseType === null || baseType === void 0 ? void 0 : baseType.sameType(context.containingClass.type)) {
        let testDeclarator = Declarator.createFromAST(ast.declarators[0], context, baseType);
        if (!testDeclarator.name) {
            typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs.filter(spec => spec !== context.containingClass.name), context);
        }
    }
    // Create an array of the individual declarations (multiple on the same line
    // will be parsed as a single AST node and need to be broken up)
    return ast.declarators.map((declAST) => {
        // Create declarator and determine declared type
        let declarator = Declarator.createFromAST(declAST, context, baseType);
        let declaredType = declarator.type;
        // Create the declaration itself. Which kind depends on the declared type
        let declaration;
        if (!declaredType) {
            declaration = new UnknownTypeDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (ast.specs.friend) {
            declaration = new FriendDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (ast.specs.typedef) {
            declaration = new TypedefDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (declaredType.isVoidType()) {
            declaration = new VoidDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
        }
        else if (declaredType.isFunctionType()) {
            declaration = new FunctionDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        else if (declaredType.isArrayOfUnknownBoundType()) {
            // TODO: it may be possible to determine the bound from the initializer
            declaration = new UnknownBoundArrayDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        else if (declaredType.isCompleteObjectType() || declaredType.isReferenceType()) {
            declaration = new MemberVariableDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
            if (declAST.initializer) {
                // member variables don't get anything set for a default initializer,
                // so this if keeps us from doing anything unless there's an explicit
                // initialization in the AST
                setInitializerFromAST(declaration, declAST.initializer, context);
            }
        }
        else {
            declaration = new IncompleteTypeMemberVariableDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        return declaration;
    });
}
exports.createMemberSimpleDeclarationFromAST = createMemberSimpleDeclarationFromAST;
class SimpleDeclaration extends constructs_1.BasicCPPConstruct {
    constructor(context, ast, typeSpec, storageSpec, declarator, otherSpecs) {
        var _a;
        super(context, ast);
        this.allowsExtern = false;
        this.attach(this.typeSpecifier = typeSpec);
        this.attach(this.storageSpecifier = storageSpec);
        this.otherSpecifiers = otherSpecs;
        util_1.assert(declarator.name, "Simple declarations must have a name.");
        this.attach(this.declarator = declarator);
        this.name = lexical_1.getUnqualifiedName(declarator.name);
        if (otherSpecs.virtual) {
            if (((_a = declarator.type) === null || _a === void 0 ? void 0 : _a.isFunctionType()) && constructs_1.isClassContext(context)) {
                // ok, it's a member function
            }
            else {
                this.addNote(errors_1.CPPError.declaration.virtual_prohibited(this));
            }
        }
        if (this.storageSpecifier.extern && !this.allowsExtern) {
            this.addNote(errors_1.CPPError.declaration.storage.extern_prohibited(this));
        }
    }
}
exports.SimpleDeclaration = SimpleDeclaration;
class UnknownTypeDeclaration extends SimpleDeclaration {
    constructor(context, ast, typeSpec, storageSpec, declarator, otherSpecs) {
        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);
        this.construct_type = "unknown_type_declaration";
        // Add an error, but only if the declarator doesn't have one for some reason.
        // It should already have one, assuming that's why there's no type.
        // This will probably never be used.
        if (!declarator.getContainedNotes().hasErrors) {
            this.addNote(errors_1.CPPError.declaration.unknown_type(this));
        }
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type;
    }
}
exports.UnknownTypeDeclaration = UnknownTypeDeclaration;
class VoidDeclaration extends SimpleDeclaration {
    constructor(context, ast, typeSpec, storageSpec, declarator, otherSpecs) {
        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);
        this.construct_type = "void_declaration";
        this.type = types_1.VoidType.VOID;
        this.addNote(errors_1.CPPError.declaration.void_prohibited(this));
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type;
    }
}
exports.VoidDeclaration = VoidDeclaration;
class TypedefDeclaration extends SimpleDeclaration {
    constructor(context, ast, typeSpec, storageSpec, declarator, otherSpecs) {
        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);
        this.construct_type = "typedef_declaration";
        this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, "typedef"));
        // ADD THIS BACK IN WHEN TYPEDEFS ARE SUPPORTED
        // if (this.storageSpecifier.numSpecs > 0 && this.isTypedef) {
        //     this.addNote(CPPError.declaration.storage.typedef(this, this.storageSpec.ast))
        // }
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type;
    }
}
exports.TypedefDeclaration = TypedefDeclaration;
class FriendDeclaration extends SimpleDeclaration {
    constructor(context, ast, typeSpec, storageSpec, declarator, otherSpecs) {
        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);
        this.construct_type = "friend_declaration";
        this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, "friend"));
        // TODO: Add back in when classes are supported
        // if (!(this.contextualScope instanceof ClassScope)) {
        //     this.addNote(CPPError.declaration.friend.outside_class(this));
        // }
        if (otherSpecs.virtual) {
            this.addNote(errors_1.CPPError.declaration.friend.virtual_prohibited(this));
        }
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type;
    }
}
exports.FriendDeclaration = FriendDeclaration;
class UnknownBoundArrayDeclaration extends SimpleDeclaration {
    constructor(context, ast, typeSpec, storageSpec, declarator, otherSpecs, type) {
        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);
        this.construct_type = "unknown_array_bound_declaration";
        this.type = type;
        this.addNote(errors_1.CPPError.declaration.array.length_required(this));
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type;
    }
}
exports.UnknownBoundArrayDeclaration = UnknownBoundArrayDeclaration;
class FunctionDeclaration extends SimpleDeclaration {
    constructor(context, ast, typeSpec, storageSpec, declarator, otherSpecs, type) {
        var _a, _b;
        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);
        this.construct_type = "function_declaration";
        this.isMemberFunction = false;
        this.isVirtual = false;
        this.isPureVirtual = false;
        this.isOverride = false;
        this.isConstructor = false;
        this.isDestructor = false;
        this.type = type;
        util_1.assert(declarator.name);
        let overrideTarget;
        let containingClass;
        if (constructs_1.isClassContext(context)) {
            containingClass = context.containingClass;
            this.qualifiedName = lexical_1.composeQualifiedName(containingClass.qualifiedName, declarator.name);
            this.isMemberFunction = true;
            this.isVirtual = !!otherSpecs.virtual;
            this.isPureVirtual = !!declarator.isPureVirtual;
            this.isOverride = !!declarator.isOverride;
            this.isConstructor = this.declarator.hasConstructorName;
            this.isDestructor = this.declarator.hasDestructorName;
            // Check to see if virtual is inherited
            let base = (_a = context.baseClass) === null || _a === void 0 ? void 0 : _a.type;
            while (base) {
                let matchInBase = base.classDefinition.memberFunctionEntities.find(baseFunc => this.name === baseFunc.name && this.type.isPotentialOverriderOf(baseFunc.type));
                if (matchInBase === null || matchInBase === void 0 ? void 0 : matchInBase.isVirtual) {
                    this.isVirtual = true;
                    // Check to make sure that the return types are covariant
                    if (types_1.covariantType(this.type.returnType, matchInBase.type.returnType)) {
                        overrideTarget = matchInBase;
                        break;
                    }
                    else {
                        this.addNote(errors_1.CPPError.declaration.func.nonCovariantReturnType(this, this.type.returnType, matchInBase.type.returnType));
                    }
                }
                base = base.classDefinition.baseType;
            }
        }
        else {
            this.qualifiedName = lexical_1.getQualifiedName(declarator.name);
            // non-class context
        }
        if (this.isOverride && !overrideTarget) {
            this.addNote(errors_1.CPPError.declaration.func.noOverrideTarget(this));
        }
        this.declaredEntity = new entities_1.FunctionEntity(type, this);
        util_1.assert(!!this.declarator.parameters, "The declarator for a function declaration must contain declarators for its parameters as well.");
        this.parameterDeclarations = this.declarator.parameters;
        // If main, should have no parameters
        // TODO: this check should be moved elsewhere
        if (this.declaredEntity.isMain() && this.type.paramTypes.length > 0) {
            this.addNote(errors_1.CPPError.declaration.func.mainParams(this.declarator));
        }
        if (this.isConstructor) {
            // constructors are not added to their scope. they technically "have no name"
            // and can't be found through name lookup
            if ((_b = this.type.receiverType) === null || _b === void 0 ? void 0 : _b.isConst) {
                this.addNote(errors_1.CPPError.declaration.ctor.const_prohibited(this));
            }
            if (this.declarator.baseType) {
                this.addNote(errors_1.CPPError.declaration.ctor.return_type_prohibited(this));
            }
            if (otherSpecs.virtual) { // use otherSpecs here since this.isVirtual depends on being a member fn
                this.addNote(errors_1.CPPError.declaration.ctor.virtual_prohibited(this));
            }
        }
        else {
            let entityOrError = this.context.contextualScope.declareFunctionEntity(this.declaredEntity);
            if (entityOrError instanceof entities_1.FunctionEntity) {
                let actualDeclaredEntity = entityOrError;
                if (actualDeclaredEntity === this.declaredEntity) {
                    // if our newly declared entity actually got added to the scope
                    // (and we didn't get returned a different one that was already there)
                    if (overrideTarget) {
                        overrideTarget.registerOverrider(containingClass, actualDeclaredEntity);
                        actualDeclaredEntity.setOverrideTarget(overrideTarget);
                    }
                }
                this.declaredEntity = actualDeclaredEntity;
            }
            else {
                this.addNote(entityOrError);
            }
        }
        // A function declaration has linkage. The linkage is presumed to be external, because Lobster does not
        // support using the static keyword or unnamed namespaces to specify internal linkage.
        // It has linkage regardless of whether this is a namespace scope or a block scope.
        this.declaredEntity.registerWithLinker();
        // if (!this.isMemberFunction && this.virtual){
        //     this.addNote(CPPError.declaration.func.virtual_not_allowed(this));
        // }
        // this.checkOverloadSemantics();
    }
    // checkOverloadSemantics : function(){
    //     if (this.name === "operator=" || this.name === "operator()" || this.name === "operator[]"){
    //         if (!this.isMemberFunction){
    //             this.addNote(CPPError.declaration.func.op_member(this));
    //         }
    //     }
    //     if (this.name === "operator[]" && this.params.length !== 1){
    //         this.addNote(CPPError.declaration.func.op_subscript_one_param(this));
    //     }
    // },
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && this.declaredEntity.isSemanticallyEquivalent(other.declaredEntity, equivalenceContext);
    }
}
exports.FunctionDeclaration = FunctionDeclaration;
class VariableDefinitionBase extends SimpleDeclaration {
    setInitializer(init) {
        util_1.assert(!this.initializer); // should only be called once
        this.initializer = init;
        this.attach(init);
        this.initializerWasSet(init);
        return this;
    }
    initializerWasSet(init) {
        // hook for subclasses
    }
    setDefaultInitializer() {
        return this.setInitializer(initializers_1.DefaultInitializer.create(this.context, this.declaredEntity));
    }
    setDirectInitializer(args) {
        return this.setInitializer(initializers_1.DirectInitializer.create(this.context, this.declaredEntity, args, "direct"));
    }
    setCopyInitializer(args) {
        return this.setInitializer(initializers_1.DirectInitializer.create(this.context, this.declaredEntity, args, "copy"));
    }
    setInitializerList(args) {
        // TODO implement initializer lists
        let init = initializers_1.ListInitializer.create(this.context, this.declaredEntity, args);
        if (init instanceof constructs_1.InvalidConstruct) {
            this.attach(init);
            return;
        }
        return this.setInitializer(init);
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return this.construct_type === other.construct_type && other instanceof VariableDefinitionBase
            && entities_1.areEntitiesSemanticallyEquivalent(this.declaredEntity, other.declaredEntity, equivalenceContext)
            && constructs_1.areSemanticallyEquivalent(this.initializer, other.initializer, equivalenceContext);
    }
    entitiesUsed() {
        return [this.declaredEntity];
    }
}
// interface CompiledVariableDefinitionBase<ContextType extends TranslationUnitContext = TranslationUnitContext, T extends ObjectType | ReferenceType = ObjectType | ReferenceType> extends VariableDefinitionBase<ContextType>, SuccessfullyCompiled {
//     readonly typeSpecifier: CompiledTypeSpecifier;
//     readonly storageSpecifier: CompiledStorageSpecifier;
//     readonly declarator: CompiledDeclarator<T>;
//     readonly declaredEntity: VariableEntity<NoRefType<T>>;
//     readonly initializer?: CompiledInitializer<NoRefType<T>>;
// }
class LocalVariableDefinition extends VariableDefinitionBase {
    // public static predicate() : (decl: LocalVariableDefinition) => decl is TypedLocalVariableDefinition<T> {
    //     return <(decl: CPPConstruct) => decl is TypedLocalVariableDefinition<T>>((decl) => decl instanceof LocalVariableDefinition);
    // }
    // public static typedPredicate<T extends VariableDefinitionType>(typePredicate: (o: VariableDefinitionType) => o is T) {
    //     return <(decl: CPPConstruct) => decl is TypedLocalVariableDefinition<T>>((decl) => decl instanceof LocalVariableDefinition && !!decl.type && !!decl.declaredEntity && typePredicate(decl.type));
    // }
    constructor(context, ast, typeSpec, storageSpec, declarator, otherSpecs, type) {
        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);
        this.construct_type = "local_variable_definition";
        this.type = type;
        this.declaredEntity =
            type.isReferenceType() ? new entities_1.LocalReferenceEntity(type, this) : new entities_1.LocalObjectEntity(type, this);
        // Note extern unsupported error is added in the base Declaration class, so no need to add here
        // All local declarations are also definitions, with the exception of a local declaration of a function
        // or a local declaration with the extern storage specifier, but those are not currently supported by Lobster.
        // This means a locally declared variable does not have linkage, and we don't need to do any linking stuff here.
        // Attempt to add the declared entity to the scope. If it fails, note the error.
        let entityOrError = context.contextualScope.declareVariableEntity(this.declaredEntity);
        if (entityOrError instanceof entities_1.LocalObjectEntity || entityOrError instanceof entities_1.LocalReferenceEntity) {
            this.declaredEntity = entityOrError;
            context.blockLocals.registerLocalVariable(this.declaredEntity);
            context.functionLocals.registerLocalVariable(this.declaredEntity);
        }
        else {
            this.addNote(entityOrError);
        }
    }
}
exports.LocalVariableDefinition = LocalVariableDefinition;
class GlobalVariableDefinition extends VariableDefinitionBase {
    constructor(context, ast, typeSpec, storageSpec, declarator, otherSpecs, type) {
        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);
        this.construct_type = "global_variable_definition";
        this.type = type;
        util_1.assert(declarator.name);
        this.qualifiedName = lexical_1.getQualifiedName(declarator.name);
        if (type.isReferenceType()) {
            this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, "globally scoped references"));
            return;
        }
        this.declaredEntity = new entities_1.GlobalObjectEntity(type, this);
        let entityOrError = context.contextualScope.declareVariableEntity(this.declaredEntity);
        if (entityOrError instanceof entities_1.GlobalObjectEntity) {
            this.declaredEntity = entityOrError;
            this.context.translationUnit.program.registerGlobalObjectDefinition(this.declaredEntity.qualifiedName, this);
        }
        else {
            this.addNote(entityOrError);
        }
    }
}
exports.GlobalVariableDefinition = GlobalVariableDefinition;
/**
 * ParameterDeclarations are a bit different than other declarations because
 * they do not introduce an entity into their contextual scope. For example,
 * in the context of a function declaration that contains several parameter
 * declarations, there is no function body (as there would be for a function
 * definition) into whose scope the entities would even be introduced.
 * This contrasts to ParameterDefinitions that may introduce an entity.
 */
class ParameterDeclaration extends constructs_1.BasicCPPConstruct {
    constructor(context, ast, typeSpec, storageSpec, declarator, otherSpecs) {
        super(context, ast);
        this.construct_type = "parameter_declaration";
        this.attach(this.typeSpecifier = typeSpec);
        this.attach(this.storageSpecifier = storageSpec);
        this.attach(this.declarator = declarator);
        this.otherSpecifiers = otherSpecs;
        this.name = declarator.name && lexical_1.getUnqualifiedName(declarator.name);
        if (declarator.name && lexical_1.isQualifiedName(declarator.name)) {
            storageSpec.addNote(errors_1.CPPError.declaration.parameter.storage_prohibited(storageSpec));
        }
        if (!storageSpec.isEmpty) {
            storageSpec.addNote(errors_1.CPPError.declaration.parameter.storage_prohibited(storageSpec));
        }
        let type = declarator.type;
        if (type === null || type === void 0 ? void 0 : type.isPotentiallyCompleteArrayType()) {
            type = type.adjustToPointerType();
        }
        if (type && !type.isPotentialParameterType()) {
            this.addNote(errors_1.CPPError.declaration.parameter.invalid_parameter_type(this, type));
            return;
        }
        this.type = type;
        if (this.isPotentialParameterDefinition()) {
            this.declaredEntity =
                this.type.isReferenceType() ? new entities_1.LocalReferenceEntity(this.type, this, true) :
                    new entities_1.LocalObjectEntity(this.type, this, true);
        }
    }
    static createFromAST(ast, context) {
        let storageSpec = StorageSpecifier.createFromAST(ast.specs.storageSpecs, context);
        // Need to create TypeSpecifier first to get the base type first for the declarators
        let typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs, context);
        // Compile declarator for each parameter (of the function-type argument itself)
        let declarator = Declarator.createFromAST(ast.declarator, context, typeSpec.baseType);
        return new ParameterDeclaration(context, ast, typeSpec, storageSpec, declarator, ast.specs);
    }
    isPotentialParameterDefinition() {
        return !!this.name && !!this.type && this.type.isPotentialParameterType();
    }
    addEntityToScope(context) {
        // If there's no type, we can't introduce an entity. If there's no name, we don't either.
        // A parameter in a function definition with no name is technically allowed (e.g. this may
        // indicate the programmer intends not to use the parameter in the function implementation).
        // Attempt to add the declared entity to the scope. If it fails, note the error.
        let entityOrError = context.contextualScope.declareVariableEntity(this.declaredEntity);
        if (entityOrError instanceof entities_1.LocalObjectEntity || entityOrError instanceof entities_1.LocalReferenceEntity) {
            this.declaredEntity = entityOrError;
            context.blockLocals.registerLocalVariable(this.declaredEntity);
            context.functionLocals.registerLocalVariable(this.declaredEntity);
        }
        else {
            this.addNote(entityOrError);
        }
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && entities_1.areEntitiesSemanticallyEquivalent(this.declaredEntity, other.declaredEntity, equivalenceContext);
    }
}
exports.ParameterDeclaration = ParameterDeclaration;
/**
 * This class represents a definition of a variable with incomplete type. Such a definition is
 * ill-formed, because necessary details (such as object size) are missing from an incomplete type.
 * As such, this class always compiles with an error and does not create any entities. In effect,
 * the attempted definition of such a variable is acknowledged, but the variable is otherwise ignored
 * as if it was never declared.
 */
class IncompleteTypeVariableDefinition extends SimpleDeclaration {
    constructor(context, ast, typeSpec, storageSpec, declarator, otherSpecs, type) {
        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);
        this.construct_type = "incomplete_type_variable_definition";
        this.type = type;
        this.addNote(errors_1.CPPError.declaration.incomplete_type_definition_prohibited(this));
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && types_1.sameType(this.type, other.type);
    }
}
exports.IncompleteTypeVariableDefinition = IncompleteTypeVariableDefinition;
// TODO: take baseType as a parameter to compile rather than init
class Declarator extends constructs_1.BasicCPPConstruct {
    /**
     * `Declarator.createFromAST()` should always be used to create Declarators, which delegates
     * to this private constructor. Directly calling the constructor from the outside is not allowed.
     * Since declarators are largely about processing an AST, it doesn't make much sense to create
     * one without an AST.
     */
    constructor(context, ast, baseType) {
        super(context, ast);
        this.construct_type = "declarator";
        this.hasConstructorName = false;
        this.hasDestructorName = false;
        this.baseType = baseType;
        if (!ast) {
            this.type = this.baseType;
            return;
        }
        // let isMember = isA(this.parent, Declarations.Member);
        if (ast.pureVirtual) {
            this.isPureVirtual = true;
        }
        if (ast.override) {
            this.isOverride = true;
        }
        this.determineNameAndType(ast);
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && types_1.sameType(this.type, other.type);
    }
    static createFromAST(ast, context, baseType) {
        return new Declarator(context, ast, baseType);
    }
    determineNameAndType(ast) {
        var _a;
        let findName = ast;
        let n;
        while (findName) {
            if (findName.name) {
                n = lexical_1.astToIdentifier(findName.name);
                if (lexical_1.isUnqualifiedName(n)) {
                    n = n.replace(/<.*>/g, ""); // remove template parameters
                }
                else {
                    let newComponents = n.components.map(component => component.replace(/<.*>/g, ""));
                    n = {
                        components: newComponents,
                        str: newComponents.join("::")
                    };
                }
                util_1.asMutable(this).name = n;
                lexical_1.checkIdentifier(this, n, this.notes);
                break;
            }
            findName = findName.pointer || findName.reference || findName.sub;
        }
        if (this.name && lexical_1.isQualifiedName(this.name)) {
            let le = this.context.program.getLinkedFunctionEntity(this.name);
            if (le && constructs_1.isClassContext(le.firstDeclaration.context)) {
                let className = le.firstDeclaration.context.containingClass.name;
                className = className.replace(/<.*>/g, ""); // remove template parameters
                if (lexical_1.getUnqualifiedName(this.name) === className) {
                    this.hasConstructorName = true;
                }
                else if (lexical_1.getUnqualifiedName(this.name) === "~" + className) {
                    this.hasDestructorName = true;
                }
            }
        }
        if (this.name && constructs_1.isClassContext(this.context)) {
            let className = this.context.containingClass.name;
            className = className.replace(/<.*>/g, ""); // remove template parameters
            if (this.name === className) {
                this.hasConstructorName = true;
            }
            else if (this.name === "~" + className) {
                this.hasDestructorName = true;
            }
        }
        let type;
        // If it's a ctor or dtor, then we'll implicitly add void.
        // This is a bit of a Lobster hack, since technically in C++ ctors and dtors
        // don't have any return type at all, but the effects are mostly the same.
        if (this.baseType) {
            type = this.baseType;
        }
        else if (this.hasConstructorName) {
            type = types_1.VoidType.VOID;
        }
        else if (this.hasDestructorName) {
            type = types_1.VoidType.VOID;
        }
        else {
            // If there's no base type, we really can't do much.
            this.addNote(errors_1.CPPError.declaration.missing_type_specifier(this));
            return;
        }
        let first = true;
        // let prevKind : "function" | "reference" | "pointer" | "array" | "none" = "none";
        let decl = ast;
        while (decl) {
            if (decl.postfixes) {
                for (let i = decl.postfixes.length - 1; i >= 0; --i) {
                    // A postfix portion of a declarator is only innermost if it's the leftmost one,
                    // which would be closest to where the name would occur in the declarator. (Note
                    // that this is also the last one processed here, since we iterate backward down to 0.)
                    let postfix = decl.postfixes[i];
                    if (postfix.kind === "array") {
                        if (type.isBoundedArrayType()) {
                            this.addNote(errors_1.CPPError.declaration.array.multidimensional_arrays_unsupported(this));
                            return;
                        }
                        if (!type.isArrayElemType()) {
                            this.addNote(errors_1.CPPError.declaration.array.invalid_element_type(this, type));
                            return;
                        }
                        if (postfix.size) {
                            if (postfix.size.construct_type === "numeric_literal_expression") {
                                // If the size specified is a literal, just use its value as array length
                                type = new types_1.BoundedArrayType(type, ast_expressions_1.parseNumericLiteralValueFromAST(postfix.size));
                            }
                            else {
                                // If a size is specified, that is not a literal, it must be an expression (via the grammar).
                                // This size expression could e.g. be used for a dynamically allocated array. In that case,
                                // we provide the AST of the size expression as part of the type so it can be used later by
                                // a new expression to construct the size subexpression for the allocated array.
                                type = new types_1.ArrayOfUnknownBoundType(type, postfix.size);
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
                            type = new types_1.ArrayOfUnknownBoundType(type);
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
                        util_1.assertNever(postfix);
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
                        this.addNote(errors_1.CPPError.declaration.pointer.reference(this));
                    }
                    else if (type.isVoidType()) {
                        this.addNote(errors_1.CPPError.declaration.pointer.void(this));
                    }
                    else if (type.isFunctionType()) {
                        this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, "function pointers"));
                    }
                    else {
                        util_1.assertNever(type);
                    }
                    return;
                }
                type = new types_1.PointerType(type, decl["const"], decl["volatile"]);
                decl = decl.pointer;
            }
            else if (decl.reference) {
                if (!type.isPotentiallyCompleteObjectType()) {
                    if (type.isReferenceType()) {
                        this.addNote(errors_1.CPPError.declaration.ref.ref(this));
                    }
                    else if (type.isVoidType() || type.isFunctionType()) {
                        this.addNote(errors_1.CPPError.declaration.ref.invalid_referred_type(this, type));
                    }
                    else {
                        util_1.assertNever(type);
                    }
                    return;
                }
                type = new types_1.ReferenceType(type);
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
        this.type = type;
        // If it's not a function type, the recorded parameters aren't meaningful
        if (!type.isFunctionType()) {
            delete this.parameters;
        }
        // if there wasn't any base type and we don't end up with a function type
        // it means we have an attempt at declaring a member variable
        // with the same name as the class that got defaulted to void as if
        // it was a constructor without a type specifier, but then turned out
        // not to be a viable constructor from the rest of the syntax. In
        // this case, we want to add back in the missing type specifier
        if (!this.baseType && !((_a = this.type) === null || _a === void 0 ? void 0 : _a.isFunctionType())) {
            delete this.type;
            this.addNote(errors_1.CPPError.declaration.missing_type_specifier(this));
        }
    }
    processFunctionDeclarator(postfix, type, notes) {
        var _a;
        if (type && !type.isPotentialReturnType()) {
            if (type.isFunctionType()) {
                notes.addNote(errors_1.CPPError.declaration.func.return_func(this));
            }
            else if (type.isPotentiallyCompleteArrayType()) {
                notes.addNote(errors_1.CPPError.declaration.func.return_array(this));
            }
            else {
                util_1.assertNever(type);
            }
            return;
        }
        let paramDeclarations = postfix.args.map((argAST) => ParameterDeclaration.createFromAST(argAST, this.context));
        this.parameters = paramDeclarations;
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
                    notes.addNote(errors_1.CPPError.declaration.func.void_param(paramDeclarations[j]));
                }
            }
        }
        if (!paramTypes.every(paramType => paramType)) {
            return; // if some paramTypes aren't defined, can't do anything
        }
        if (!paramTypes.every(paramType => paramType && paramType.isPotentialParameterType())) {
            notes.addNote(errors_1.CPPError.declaration.func.some_invalid_parameter_types(this));
            return;
        }
        // TODO clean up error immediately above and get rid of yucky cast below
        return new types_1.FunctionType(type, paramTypes, (_a = this.context.containingClass) === null || _a === void 0 ? void 0 : _a.type.cvQualified(!!postfix.const));
    }
}
exports.Declarator = Declarator;
let OVERLOADABLE_OPS = {};
["new[]",
    "delete[]",
    "new",
    "delete",
    "->*", ">>=", "<<=",
    "+=", "-=", "*=", ",=", "%=", "^=",
    "&=", "|=", "<<", ">>", "==", "!=",
    "<=", ">=", "&&", "||", "++", "--",
    "->", "()", "[]",
    "+", "-", "*", "/", "%", "^", "&",
    "|", "~", "!", "=", "<", ">", ","].forEach(function (op) {
    OVERLOADABLE_OPS["operator" + op] = true;
});
class FunctionDefinition extends constructs_1.BasicCPPConstruct {
    // i_childrenToExecute: ["memberInitializers", "body"], // TODO: why do regular functions have member initializers??
    constructor(context, ast, declaration, parameters, ctorInitializer, body) {
        super(context, ast);
        this.construct_type = "function_definition";
        this.kind = "FunctionDefinition";
        this.attach(this.declaration = declaration);
        this.attachAll(this.parameters = parameters);
        if (ctorInitializer) {
            this.attach(this.ctorInitializer = ctorInitializer);
        }
        this.attach(this.body = body);
        this.name = declaration.name;
        this.type = declaration.type;
        if (this.declaration.isDestructor) {
            // TODO: the cast on the line below seems kinda sus
            //       At this point (in a member function DEFINITION)
            //       I believe the receiver type should always be complete.
            //       Should that be ensured elsewhere? 
            this.attach(this.memberDeallocator = ObjectDeallocator_1.createMemberDeallocator(context, new entities_1.ReceiverEntity(this.type.receiverType)));
        }
        this.declaration.declaredEntity.setDefinition(this);
        this.context.translationUnit.program.registerFunctionDefinition(this.declaration.declaredEntity.qualifiedName, this);
    }
    static createFromAST(ast, context, declaration) {
        var _a;
        if (!declaration) {
            let decl = createFunctionDeclarationFromDefinitionAST(ast, context);
            if (!(decl.construct_type === "function_declaration")) {
                return decl;
            }
            declaration = decl;
        }
        // Consider "out-of-line" definitions as if they were in the class scope.
        // Need to change the parent to the context in which the definition occurs, though.
        if (constructs_1.isMemberSpecificationContext(declaration.context) && !constructs_1.isMemberSpecificationContext(context)) {
            context = constructs_1.createOutOfLineFunctionDefinitionContext(declaration.context, context);
        }
        // Create implementation and body block (before params and body statements added yet)
        let receiverType;
        if (declaration.isMemberFunction) {
            util_1.assert((_a = context.containingClass) === null || _a === void 0 ? void 0 : _a.isComplete(), "Member function definitions may not be compiled until their containing class definition has been completed.");
            receiverType = context.containingClass.type;
        }
        let functionContext = constructs_1.createFunctionContext(context, declaration.declaredEntity, receiverType);
        let bodyContext = constructs_1.createBlockContext(functionContext);
        // Add declared entities from the parameters to the body block's context.
        // As the context refers back to the implementation, local objects/references will be registerd there.
        declaration.parameterDeclarations.forEach(paramDecl => {
            if (paramDecl.isPotentialParameterDefinition()) {
                paramDecl.addEntityToScope(bodyContext);
            }
            else {
                paramDecl.addNote(errors_1.CPPError.lobster.unsupported_feature(paramDecl, "Unnamed parameter definitions."));
            }
        });
        let ctorInitializer;
        if (declaration.isConstructor && constructs_1.isMemberBlockContext(bodyContext)) {
            if (ast.ctor_initializer) {
                ctorInitializer = initializers_1.CtorInitializer.createFromAST(ast.ctor_initializer, bodyContext);
            }
            else {
                ctorInitializer = new initializers_1.CtorInitializer(bodyContext, undefined, []);
            }
        }
        else {
            if (ast.ctor_initializer) {
                ctorInitializer = new constructs_1.InvalidConstruct(bodyContext, ast.ctor_initializer, errors_1.CPPError.declaration.ctor.init.constructor_only);
            }
        }
        // Create the body "manually" using the ctor so we can give it the bodyContext create earlier.
        // We can't use the createFromAST function for the body Block, because that would create a new, nested block context.
        let body = new statements_1.Block(bodyContext, ast.body, ast.body.statements.map(s => statements_1.createStatementFromAST(s, bodyContext)));
        return new FunctionDefinition(functionContext, ast, declaration, declaration.parameterDeclarations, ctorInitializer, body);
    }
    createRuntimeFunction(parent, receiver) {
        return new functions_1.RuntimeFunction(this, parent.sim, parent, receiver);
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && constructs_1.areSemanticallyEquivalent(this.declaration, other.declaration, equivalenceContext)
            && constructs_1.areAllSemanticallyEquivalent(this.parameters, other.parameters, equivalenceContext)
            && constructs_1.areSemanticallyEquivalent(this.ctorInitializer, other.ctorInitializer, equivalenceContext)
            && constructs_1.areSemanticallyEquivalent(this.body, other.body, equivalenceContext);
    }
}
exports.FunctionDefinition = FunctionDefinition;
/**
 * Attempts to create a `FunctionDeclaration` from the given function definition AST. Note this may
 * return an InvalidConstrucct if the given AST was malformed such that the declarator didn't actually specify
 * a function (e.g. missing parentheses). This is unfortunately allowed by the language grammar, so
 * we have to account for it.
 * @param ast
 * @param context
 */
function createFunctionDeclarationFromDefinitionAST(ast, context) {
    // Need to create TypeSpecifier first to get the base type for the declarators
    let typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs, context);
    let baseType = typeSpec.baseType;
    let storageSpec = StorageSpecifier.createFromAST(ast.specs.storageSpecs, context);
    let declarator = Declarator.createFromAST(ast.declarator, context, baseType);
    let declaredType = declarator.type;
    // if the declarator has a qualified name, we need to check to see if a previous
    // declaration for the function already exists, and if so, use that one
    if (declarator.name && lexical_1.isQualifiedName(declarator.name)) {
        let prevEntity = context.program.getLinkedFunctionEntity(declarator.name);
        if (prevEntity) {
            return prevEntity.firstDeclaration;
        }
    }
    if (!(declaredType === null || declaredType === void 0 ? void 0 : declaredType.isFunctionType())) {
        return new constructs_1.InvalidConstruct(context, ast, errors_1.CPPError.declaration.func.definition_non_function_type);
    }
    let declAST = {
        construct_type: "simple_declaration",
        declarators: [ast.declarator],
        specs: ast.specs,
        source: ast.declarator.source
    };
    // if (declarator.hasConstructorName) {
    //     assert(declaredType.isFunctionType());
    //     assert(declaredType.returnType.isVoidType());
    //     return new ConstructorDeclaration(context, declAST, typeSpec, storageSpec, declarator, ast.specs, <FunctionType<VoidType>>declaredType);
    // }
    // else {
    return new FunctionDeclaration(context, declAST, typeSpec, storageSpec, declarator, ast.specs, declaredType);
    // }
}
class ClassDeclaration extends constructs_1.BasicCPPConstruct {
    // public readonly isDuplicateDeclaration: boolean = false;
    constructor(context, name, key) {
        super(context, undefined);
        this.construct_type = "class_declaration";
        this.name = lexical_1.getUnqualifiedName(name);
        this.qualifiedName = lexical_1.getQualifiedName(name);
        this.key = key;
        this.declaredEntity = new entities_1.ClassEntity(this);
        let entityOrError = context.contextualScope.declareClassEntity(this.declaredEntity);
        if (entityOrError instanceof entities_1.ClassEntity) {
            // if (entityOrError !== this.declaredEntity) {
            //     this.isDuplicateDeclaration = true;
            // }
            this.declaredEntity = entityOrError;
        }
        else {
            this.addNote(entityOrError);
        }
        this.type = this.declaredEntity.type;
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return true;
        // TODO: semantic equivalence
    }
}
exports.ClassDeclaration = ClassDeclaration;
class ClassDefinition extends constructs_1.BasicCPPConstruct {
    constructor(context, ast, declaration, baseSpecs, memberDeclarations) {
        var _a;
        super(context, ast);
        this.construct_type = "class_definition";
        this.memberDeclarationsByName = {};
        this.constructorDeclarations = [];
        this.memberFunctionEntities = [];
        this.memberVariableEntities = [];
        this.memberObjectEntities = [];
        this.memberReferenceEntities = [];
        this.memberVariableEntitiesByName = {};
        this.inlineMemberFunctionDefinitions = [];
        this.name = declaration.name;
        this.implicitPublicContext = constructs_1.createImplicitContext(constructs_1.createMemberSpecificationContext(context, "public"));
        this.attach(this.declaration = declaration);
        this.attachAll(this.baseSpecifiers = baseSpecs);
        if (baseSpecs.length > 0 && ((_a = baseSpecs[0].baseEntity) === null || _a === void 0 ? void 0 : _a.isComplete())) {
            this.baseType = baseSpecs[0].baseEntity.type;
        }
        if (baseSpecs.length > 1) {
            this.addNote(errors_1.CPPError.class_def.multiple_inheritance(this));
        }
        this.attachAll(this.memberDeclarations = memberDeclarations);
        // Identify member objects and member references
        memberDeclarations.forEach(decl => {
            if (decl.construct_type === "member_variable_declaration") {
                util_1.asMutable(this.memberVariableEntities).push(decl.declaredEntity);
                if (decl.declaredEntity instanceof entities_1.MemberObjectEntity) {
                    util_1.asMutable(this.memberObjectEntities).push(decl.declaredEntity);
                }
                else {
                    util_1.asMutable(this.memberReferenceEntities).push(decl.declaredEntity);
                }
                // It's possible we have multiple declarations with the same name (if so,
                // an error is generated elsewhere when they are added to the same scope).
                // Here we only record the first one we find.
                if (!this.memberDeclarationsByName[decl.name]) {
                    this.memberDeclarationsByName[decl.name] = decl;
                    this.memberVariableEntitiesByName[decl.name] = decl.declaredEntity;
                }
            }
            else if (decl.construct_type === "function_declaration") {
                // Note that only identifying function declarations and NOT definitions
                // in here is intentional
                util_1.asMutable(this.memberFunctionEntities).push(decl.declaredEntity);
            }
        });
        // CONSTRUCTORS and DESTRUCTOR
        this.constructors = [];
        memberDeclarations.forEach(mem => {
            if (mem.construct_type === "function_declaration" && mem.isConstructor) {
                util_1.asMutable(this.constructorDeclarations).push(mem);
                // Need to check for redeclaration here since the constructors don't get
                // added to a scope where we would normally detect that.
                if (this.constructors.some(prevCtor => prevCtor.type.sameSignature(mem.type))) {
                    mem.addNote(errors_1.CPPError.declaration.ctor.previous_declaration(mem));
                }
                else {
                    // Only add the unique ones to the list of constructors.
                    // If we allowed duplicates with the same signature, it might
                    // cause headaches later when e.g. this list is used as a set
                    // of candidates for overload resolution.
                    let ctorEntity = mem.declaredEntity;
                    if (ctorEntity.returnsVoid()) {
                        // If it doesn't have a void (dummy) return type, it's
                        // not a valid ctor and we don't add it to the ctor entities
                        util_1.asMutable(this.constructors).push(ctorEntity);
                        if (ctorEntity.type.paramTypes.length === 0) {
                            this.defaultConstructor = ctorEntity;
                        }
                        else if (ctorEntity.type.sameParamTypes([new types_1.ReferenceType(this.declaration.type.cvQualified(true))])) {
                            this.constCopyConstructor = ctorEntity;
                        }
                        else if (ctorEntity.type.sameParamTypes([new types_1.ReferenceType(this.declaration.type.cvUnqualified())])) {
                            this.nonConstCopyConstructor = ctorEntity;
                        }
                    }
                }
            }
            else if (mem.construct_type === "function_declaration" && mem.isDestructor) {
                let dtorEntity = mem.declaredEntity;
                if (dtorEntity.returnsVoid()) {
                    // If it doesn't have a void (dummy) return type, it's
                    // not a valid dtor and we don't add it to the class
                    util_1.asMutable(this).destructor = dtorEntity;
                }
            }
        });
        // Compute size of objects of this class
        let size = 0;
        if (this.baseType) {
            size += this.baseType.size;
        }
        this.memberObjectEntities.forEach(mem => size += mem.type.size);
        this.objectSize = size;
        // Set the definition for our declared entity
        this.declaration.declaredEntity.setDefinition(this);
        util_1.assert(declaration.type.isCompleteClassType());
        this.type = declaration.type;
        // These need to happen after setting the definition on the entity above
        this.createImplicitlyDefinedDefaultConstructorIfAppropriate();
        this.createImplicitlyDefinedCopyConstructorIfAppropriate();
        this.createImplicitlyDefinedCopyAssignmentOperatorIfAppropriate();
        this.createImplicitlyDefinedDestructorIfAppropriate();
        this.context.program.registerClassDefinition(this.declaration.declaredEntity.qualifiedName, this);
    }
    //     public readonly members: MemberVariableDeclaration | MemberFunctionDeclaration | MemberFunctionDefinition;
    static createFromAST(ast, tuContext) {
        var _a;
        let classKey = ast.head.classKey;
        // Default access level is private for class, public for struct
        let defaultAccessLevel = (classKey === "class" ? "private" : "public");
        // Base specifiers are NOT created in the class context, since the base class
        // entity it refers to is looked up without regard to what follows in the class.
        // (And if it were dependent on the class scope, which is dependent on the base
        // class scope, etc. there's circular problems.)
        let bases = ast.head.bases.map(baseAST => {
            let base = BaseSpecifier.createFromAST(baseAST, tuContext, defaultAccessLevel);
            if (base.isSuccessfullyCompiled()) {
                return base;
            }
            else {
                return undefined;
            }
        }).filter(base => base);
        let declaration = new ClassDeclaration(tuContext, ast.head.name.identifier, classKey);
        if (declaration.declaredEntity.isComplete()) {
            return declaration.declaredEntity.definition;
        }
        let templateType = undefined;
        let tpMatch = ast.head.name.identifier.match(/<.*>/);
        if (tpMatch) {
            let templateParameter = tpMatch[0].slice(1, -1); // remove the < >
            let t = new TypeSpecifier(tuContext, [templateParameter]).baseType;
            if (t && types_1.isAtomicType(t)) {
                templateType = t;
            }
        }
        // Create class context based on class entity from the declaration
        let classContext = constructs_1.createClassContext(tuContext, declaration.declaredEntity, (_a = bases[0]) === null || _a === void 0 ? void 0 : _a.baseEntity, templateType);
        let memDecls = [];
        let functionDefsToCompile = [];
        // Create and compile declarations for all members
        ast.memberSpecs.forEach(memSpec => {
            // This outer forEach goes through all "sections" of public, private, etc.
            var _a;
            // Access level is as specified or the default
            let accessLevel = (_a = memSpec.access) !== null && _a !== void 0 ? _a : defaultAccessLevel;
            let memberSpecContext = constructs_1.createMemberSpecificationContext(classContext, accessLevel);
            // Compilation of a class definition occurs in two phases. First, declarations are
            // compiled from top to bottom, such that order of declaration is significant. However,
            // the definitions for functions that are defined inline are not compiled at this point
            // and are instead compiled in a second phase. This allows the order of declaration of
            // members to not matter with respect to places they are used inside the definition of
            // other members, e.g. calling one member function within another member function's body.
            // Phase 1: Initially create member declarations. This will NOT create/compile definitions.
            memSpec.members.forEach((memberAST) => {
                let decls = createMemberDeclarationFromAST(memberAST, memberSpecContext);
                if (Array.isArray(decls)) {
                    decls.forEach(memDecl => memDecls.push(memDecl));
                }
                else {
                    memDecls.push(decls);
                    if (decls.construct_type === "function_declaration" && memberAST.construct_type === "function_definition") {
                        functionDefsToCompile.push([memberAST, memberSpecContext, decls]);
                    }
                }
            });
        });
        // Create the actual class definition. This should exist before compiling member
        // function definitions, in line with the treatment of the class type as complete
        // inside those definitions.
        let classDef = new ClassDefinition(classContext, ast, declaration, bases, memDecls);
        // Phase 2: Go back through and compile member function definitions, and let the
        // class know about them
        functionDefsToCompile.forEach(([defAST, memberSpecContext, decl]) => {
            classDef.attachInlineFunctionDefinition(FunctionDefinition.createFromAST(defAST, memberSpecContext, decl));
        });
        return classDef;
    }
    attachInlineFunctionDefinition(def) {
        util_1.asMutable(this.inlineMemberFunctionDefinitions).push(def);
        this.attach(def);
    }
    createImplicitlyDefinedDefaultConstructorIfAppropriate() {
        // If there are any user-provided ctors, do not create the implicit
        // default constructor.
        if (this.constructors.some(ctor => !ctor.firstDeclaration.context.implicit)) {
            return;
        }
        // If any data members are of reference type, do not create the
        // implicit default constructor. (This would need to change if
        // member variable initializers are added.)
        if (this.memberReferenceEntities.length > 0) {
            return;
        }
        let subobjectTypes = this.baseType
            ? [this.baseType, ...this.memberObjectEntities.map(e => e.type)]
            : this.memberObjectEntities.map(e => e.type);
        // All subobjects (bases and members) must be default constructible and destructible
        if (!subobjectTypes.every(t => t.isDefaultConstructible() && t.isDestructible())) {
            return;
        }
        // If any const data members do not have a user-provided
        // default constructor, do not create the implicitly default constructor
        // (this includes const non-class type objects).
        // ^That's the language from the standard. But the basic idea of it is that
        // we don't want any const members being default-initialized unless it's
        // done in a way the user specified (e.g. atomic objects are initialized
        // with junk, which is permanent since they're const).
        if (this.memberObjectEntities.some(memObj => memObj.type.isConst && !memObj.type.isDefaultConstructible(true))) {
            return;
        }
        let src = `${this.name}() {}`;
        let iddc = FunctionDefinition.createFromAST(cpp_parser_util_1.parseFunctionDefinition(src), this.implicitPublicContext);
        this.attach(iddc);
        let declEntity = iddc.declaration.declaredEntity;
        util_1.assert(declEntity.returnsVoid());
        this.defaultConstructor = declEntity;
        util_1.asMutable(this.constructors).push(declEntity);
    }
    createImplicitlyDefinedCopyConstructorIfAppropriate() {
        // If there are any user-provided copy ctors, do not create the implicit copy ctor.
        if (this.constCopyConstructor || this.nonConstCopyConstructor) {
            return;
        }
        // If the base class has no destructor, don't create the implicit copy ctor
        if (this.baseType && !this.baseType.isDestructible()) {
            return;
        }
        let subobjectTypes = this.baseType
            ? [this.baseType, ...this.memberObjectEntities.map(e => e.type)]
            : this.memberObjectEntities.map(e => e.type);
        // Can we create a copy ctor with a const &T param?
        // All subobjects (bases and members) must have a copy ctor with a similarly const param
        let refParamCanBeConst;
        if (subobjectTypes.every(t => t.isCopyConstructible(true))) {
            refParamCanBeConst = true;
        }
        else if (subobjectTypes.every(t => t.isCopyConstructible(false))) {
            refParamCanBeConst = false;
        }
        else {
            return;
        }
        // The //@className=${this.name} is hack to let the parser know that the class name
        // here may be parsed as a class name (because C++ parsing is dumb). Normally, the
        // class name would be recognized when the parser previously encounters the class head,
        // but that doesn't happen since this is an isolated call to the parser for just the
        // implicitly defined copy ctor. Specifically, this is necessary because the grammar
        // is ambiguous for the parameter to the copy ctor (the actual "name" of the ctor would be ok)
        let src = `//@className=${this.name}\n${this.name}(${refParamCanBeConst ? "const " : ""}${this.name} &other)`;
        let memInits = this.memberVariableEntities.map(mem => `${mem.name}(other.${mem.name})`);
        if (this.baseType) {
            memInits.unshift(this.baseType.className + "(other)");
        }
        if (memInits.length > 0) {
            src += `\n : ${memInits.join(", ")}`;
        }
        src += " { }";
        let idcc = FunctionDefinition.createFromAST(cpp_parser_util_1.parseFunctionDefinition(src), this.implicitPublicContext);
        this.attach(idcc);
        let declEntity = idcc.declaration.declaredEntity;
        util_1.assert(declEntity.returnsVoid()); // check cast above with assertion
        if (refParamCanBeConst) {
            this.constCopyConstructor = declEntity;
        }
        else {
            this.nonConstCopyConstructor = declEntity;
        }
        util_1.asMutable(this.constructors).push(declEntity);
    }
    lookupAssignmentOperator(requireConstParam, isReceiverConst) {
        return this.context.contextualScope.lookup("operator=", {
            kind: "exact", noParent: true, noBase: true,
            paramTypes: [this.type.cvQualified(requireConstParam)],
            receiverType: this.type.cvQualified(isReceiverConst)
        });
    }
    createImplicitlyDefinedCopyAssignmentOperatorIfAppropriate() {
        // If there are any user-provided assignment operators, do not create an implicit one
        if (this.lookupAssignmentOperator(false, false)) {
            return;
        }
        // If any data member is a reference, we can't make implicit copy assignment operator
        if (this.memberReferenceEntities.length > 0) {
            return;
        }
        let subobjectTypes = this.baseType
            ? [this.baseType, ...this.memberObjectEntities.map(e => e.type)]
            : this.memberObjectEntities.map(e => e.type);
        // All member objects must be copy-assignable
        // This cover the following language from the standard where we can't make a copy assignment operator:
        //  - T has a non-static data member of non-class type (or array thereof) that is const
        //  - T has a non-static data member or a direct or virtual base class that cannot be copy-assigned
        let refParamCanBeConst;
        if (subobjectTypes.every(t => t.isCopyAssignable(true))) {
            refParamCanBeConst = true;
        }
        else if (subobjectTypes.every(t => t.isCopyAssignable(false))) {
            refParamCanBeConst = false;
        }
        else {
            return;
        }
        // The //@className=${this.name} is hack to let the parser know that the class name
        // here may be parsed as a class name (because C++ parsing is dumb). Normally, the
        // class name would be recognized when the parser previously encounters the class head,
        // but that doesn't happen since this is an isolated call to the parser for just the
        // implicitly defined assn op. Specifically, this is necessary because the grammar
        // is ambiguous for the parameter to the assn op (the actual "name" of the ctor would be ok)
        let src = `//@className=${this.name}\n${this.name} &operator=(${refParamCanBeConst ? "const " : ""}${this.name} &rhs) {\n`;
        src += "  if (this == &rhs) { return *this; }\n";
        if (this.baseType) {
            src += `  ${this.baseType.className}::operator=(rhs);\n`;
        }
        src += this.memberObjectEntities.map(mem => mem.isTyped(types_1.isBoundedArrayType)
            ? `  for(int i = 0; i < ${mem.type.numElems}; ++i) {\n    ${mem.name}[i] = rhs.${mem.name}[i];\n  }\n`
            : `  ${mem.name} = rhs.${mem.name};\n`).join("");
        src += "  return *this;\n}";
        let idao = FunctionDefinition.createFromAST(cpp_parser_util_1.parseFunctionDefinition(src), this.implicitPublicContext);
        this.attach(idao);
        // Compiling the declaration already put the implicitly defined operator in
        // the right scope, so nothing more we need to do here (unlike for ctors)
    }
    createImplicitlyDefinedDestructorIfAppropriate() {
        // If there is a user-provided dtor, do not create the implicitly-defined dtor
        if (this.destructor) {
            return;
        }
        let subobjectTypes = this.baseType
            ? [this.baseType, ...this.memberObjectEntities.map(e => e.type)]
            : this.memberObjectEntities.map(e => e.type);
        // All subobjects (bases and members) must be destructible
        if (!subobjectTypes.every(t => t.isDestructible())) {
            return;
        }
        // The //@className=${this.name} is hack to let the parser know that the class name
        // here may be parsed as a class name (because C++ parsing is dumb). Normally, the
        // class name would be recognized when the parser previously encounters the class head,
        // but that doesn't happen since this is an isolated call to the parser.
        let src = `//@className=${this.name}\n~${this.name}() {}`;
        let idd = FunctionDefinition.createFromAST(cpp_parser_util_1.parseFunctionDefinition(src), this.implicitPublicContext);
        this.attach(idd);
        let declEntity = idd.declaration.declaredEntity;
        util_1.assert(declEntity.returnsVoid());
        this.destructor = declEntity;
    }
    //     compileDeclaration : function(){
    //         var ast = this.ast;
    //         // Check that no other type with the same name already exists
    //         try {
    // //            console.log("addingEntity " + this.name);
    //             // class type. will be incomplete initially, but made complete at end of class declaration
    //             this.type = Types.Class.createClassType(this.name, this.contextualScope, this.base && this.base.type, []);
    //             this.classTypeClass = this.type;
    //             this.classScope = this.type.classScope;
    //             this.entity = TypeEntity.instance(this);
    //             this.entity.setDefinition(this); // TODO add exception that allows a class to be defined more than once
    //             this.contextualScope.addDeclaredEntity(this.entity);
    //         }
    //         catch(e){
    //             if (isA(e, Note)){
    //                 this.addNote(e);
    //                 return;
    //             }
    //             else {
    //                 throw e;
    //             }
    //         }
    //         // Compile the members
    //         // If there are no constructors, then we need an implicit default constructor
    //         if(this.type.constructors.length == 0){
    //             var idc = this.createImplicitDefaultConstructor();
    //             if (idc){
    //                 idc.compile();
    //                 assert(!idc.hasErrors());
    //             }
    //         }
    //         let hasCopyConstructor = false;
    //         for(var i = 0; i < this.type.constructors.length; ++i){
    //             if (this.type.constructors[i].decl.isCopyConstructor){
    //                 hasCopyConstructor = true;
    //                 break;
    //             }
    //         }
    //         var hasUserDefinedAssignmentOperator = this.type.hasMember("operator=", {paramTypes: [this.type], isThisConst:false});
    //         // Rule of the Big Three
    //         var bigThreeYes = [];
    //         var bigThreeNo = [];
    //         (hasCopyConstructor ? bigThreeYes : bigThreeNo).push("copy constructor");
    //         (hasUserDefinedAssignmentOperator ? bigThreeYes : bigThreeNo).push("assignment operator");
    //         (this.type.destructor ? bigThreeYes : bigThreeNo).push("destructor");
    //         if (0 < bigThreeYes.length && bigThreeYes.length < 3){
    //             // If it's only because of an empty destructor, suppress warning
    //             if (bigThreeYes.length === 1 && this.type.destructor && this.type.destructor.decl.emptyBody()){
    //             }
    //             else{
    //                 this.addNote(CPPError.class_def.big_three(this, bigThreeYes, bigThreeNo));
    //             }
    //         }
    //         this.customBigThree = bigThreeYes.length > 0;
    //         if (!hasCopyConstructor) {
    //             // Create implicit copy constructor
    //             var icc = this.createImplicitCopyConstructor();
    //             if (icc) {
    //                 icc.compile();
    //                 assert(!icc.hasErrors());
    //             }
    //         }
    //         if (!this.type.destructor) {
    //             // Create implicit destructor
    //             var idd = this.createImplicitDestructor();
    //             if (idd) {
    //                 idd.compile();
    //                 assert(!idd.hasErrors());
    //             }
    //         }
    //         if (!hasUserDefinedAssignmentOperator){
    //             // Create implicit assignment operator
    //             var iao = this.createImplicitAssignmentOperator();
    //             if (iao){
    //                 iao.compile();
    //                 assert(!iao.hasErrors());
    //             }
    //         }
    //     },
    //     createImplicitAssignmentOperator : function () {
    //         var self = this;
    //         // Parameter will only be const if all subobjects have assignment ops that take const params
    //         var canMakeConst = this.type.subobjectEntities.every(function(subObj){
    //             return !isA(subObj.type, Types.Class) ||
    //                 subObj.type.getAssignmentOperator(true);
    //         });
    //         var canMakeNonConst = canMakeConst || this.type.subobjectEntities.every(function(subObj){
    //             return !isA(subObj.type, Types.Class) ||
    //                 subObj.type.getAssignmentOperator(false);
    //         });
    //         // If we can't make non-const, we also can't make const, and we can't make any implicit assignment op
    //         if (!canMakeNonConst){
    //             return;
    //         }
    //         var constPart = canMakeConst ? "const " : "";
    //         var src = this.name + " &operator=(" + constPart + this.name + " &rhs){";
    //         src += this.type.baseClassEntities.map(function(subObj){
    //             return subObj.type.className + "::operator=(rhs);";
    //         }).join("\n");
    //         var mems = this.type.memberSubobjectEntities;
    //         for(var i = 0; i < mems.length; ++i){
    //             var mem = mems[i];
    //             if (isA(mem.type, Types.Array)){
    //                 var tempType = mem.type;
    //                 var subscriptNum = isA(tempType.elemType, Types.Array) ? 1 : "";
    //                 var subscripts = "";
    //                 var closeBrackets = "";
    //                 while(isA(tempType, Types.Array)){
    //                     src += "for(int i"+subscriptNum+"=0; i"+subscriptNum+"<"+tempType.length+"; ++i"+subscriptNum+"){";
    //                     subscripts += "[i"+subscriptNum+"]";
    //                     closeBrackets += "}";
    //                     tempType = tempType.elemType;
    //                     subscriptNum += 1;
    //                 }
    //                 src += mem.name + subscripts + " = rhs." + mem.name + "" + subscripts + ";";
    //                 src += closeBrackets;
    //             }
    //             else{
    //                 src += mems[i].name + " = rhs." + mems[i].name + ";";
    //             }
    //         }
    //         src += "return *this;}";
    //         src = Lobster.cPlusPlusParser.parse(src, {startRule:"member_declaration"});
    //         return FunctionDefinition.instance(src, {parent:this, scope: this.classScope, containingClass: this.type, access:"public", implicit:true});
    //     },
    //     createInstance : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //         return RuntimeConstruct.instance(sim, this, {decl:0, step:"decl"}, "stmt", inst);
    //     },
    //     upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //     },
    //     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
    //     }
    getBaseAndMemberEntities() {
        return this.baseType
            ? [new entities_1.BaseSubobjectEntity(new entities_1.ReceiverEntity(this.type), this.baseType), ...this.memberVariableEntities]
            : this.memberVariableEntities;
    }
    isSuccessfullyCompiled() {
        return super.isSuccessfullyCompiled();
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return true;
        // TODO semantic equivalence
    }
}
exports.ClassDefinition = ClassDefinition;
class BaseSpecifier extends constructs_1.BasicCPPConstruct {
    constructor(context, ast, defaultAccessLevel) {
        var _a;
        super(context, ast);
        this.construct_type = "base_specifier";
        this.name = lexical_1.astToIdentifier(ast.name);
        this.accessLevel = (_a = ast.access) !== null && _a !== void 0 ? _a : defaultAccessLevel;
        this.virtual = !!ast.virtual;
        if (this.virtual) {
            this.addNote(errors_1.CPPError.class_def.virtual_inheritance(this));
        }
        lexical_1.checkIdentifier(this, this.name, this);
        let lookupResult = typeof this.name === "string"
            ? this.context.contextualScope.lookup(this.name)
            : this.context.translationUnit.qualifiedLookup(this.name);
        if (!lookupResult) {
            this.addNote(errors_1.CPPError.iden.not_found(this, lexical_1.identifierToString(this.name)));
        }
        else if (lookupResult.declarationKind === "class") {
            this.baseEntity = lookupResult;
            if (!this.baseEntity.type.isComplete(context)) {
                this.addNote(errors_1.CPPError.class_def.base_class_incomplete(this));
            }
        }
        else {
            this.addNote(errors_1.CPPError.class_def.base_class_type(this));
        }
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && this.accessLevel === other.accessLevel
            && this.virtual === other.virtual
            && entities_1.areEntitiesSemanticallyEquivalent(this.baseEntity, other.baseEntity, equivalenceContext);
    }
    static createFromAST(ast, context, defaultAccessLevel) {
        return new BaseSpecifier(context, ast, defaultAccessLevel);
    }
}
exports.BaseSpecifier = BaseSpecifier;
class MemberVariableDeclaration extends VariableDefinitionBase {
    constructor(context, ast, typeSpec, storageSpec, declarator, otherSpecs, type) {
        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);
        this.construct_type = "member_variable_declaration";
        this.type = type;
        this.declaredEntity =
            type.isReferenceType() ? new entities_1.MemberReferenceEntity(type, this) : new entities_1.MemberObjectEntity(type, this);
        // Attempt to add the declared entity to the scope. If it fails, note the error.
        let entityOrError = context.contextualScope.declareVariableEntity(this.declaredEntity);
        if (entityOrError instanceof entities_1.MemberObjectEntity || entityOrError instanceof entities_1.MemberReferenceEntity) {
            this.declaredEntity = entityOrError;
            // No need to "register" the member declaration here as we might "register" a local
            // variable definition with its containing function, since they will be accounted
            // for when the class definition is created from the list of member declarations
        }
        else {
            this.addNote(entityOrError);
        }
    }
    initializerWasSet(init) {
        // Default initializers are allowed
        if (!(init instanceof initializers_1.DefaultInitializer)) {
            this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, "member variable initializers"));
        }
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return true;
        // TODO semantic equivalence
    }
}
exports.MemberVariableDeclaration = MemberVariableDeclaration;
/**
 * This class represents a declaration of a member variable with incomplete type. Such a declaration is
 * ill-formed, because necessary details (such as object size) are missing from an incomplete type.
 * As such, this class always compiles with an error and does not create any entities. In effect,
 * the attempted declaration of such a member variable is acknowledged, but the member variable
 * is otherwise ignored as if it was never declared.
 */
class IncompleteTypeMemberVariableDeclaration extends SimpleDeclaration {
    constructor(context, ast, typeSpec, storageSpec, declarator, otherSpecs, type) {
        super(context, ast, typeSpec, storageSpec, declarator, otherSpecs);
        this.construct_type = "incomplete_type_member_variable_declaration";
        this.type = type;
        this.addNote(errors_1.CPPError.declaration.member.incomplete_type_declaration_prohibited(this));
    }
    isSemanticallyEquivalent_impl(other, equivalenceContext) {
        return other.construct_type === this.construct_type
            && types_1.sameType(this.type, other.type);
    }
}
exports.IncompleteTypeMemberVariableDeclaration = IncompleteTypeMemberVariableDeclaration;
// export var MemberDeclaration = SimpleDeclaration.extend({
//     _name: "MemberDeclaration",
//     init: function(ast, context){
//         assert(context);
//         assert(isA(context.containingClass, Types.Class));
//         assert(context.hasOwnProperty("access"));
//         this.initParent(ast, context);
//     },
//     i_createFromAST : function(ast, context) {
//         MemberDeclaration._parent.i_createFromAST.apply(this, arguments);
//         this.access = context.access;
//         this.i_containingClass = context.containingClass;
//     },
//     i_determineStorage : function(){
//         // Determine storage duration based on the kind of scope in which the declaration
//         // occurs and any storage specifiers.
//         if(this.storageSpec.static){
//             this.storageDuration = "static";
//         }
//         else{
//             this.storageDuration = "automatic";
//         }
//     },
//     makeEntity: function(decl){
//         // Note: we know it's not a function definition because that goes to the FunctionDefinition
//         // class.  Thus any functions are not definitions.
//         // Don't have to check for classes, for similar reasons.
//         var isDefinition = !isA(decl.type, Types.Function)
//             && !(this.storageSpec.extern && !(decl.initializer || decl.initializerList))
//             && !this.typedef;
//         this.isDefinition = isDefinition;
//         var entity;
//         if (isA(decl.type, Types.Function)){
//             entity = MemberFunctionEntity.instance(decl, this.i_containingClass, this.virtual);
//         }
//         else if (this.storageDuration === "static"){
//             entity = StaticEntity.instance(decl);
//         }
//         else{
//             entity = MemberVariableEntity.instance(decl, this.i_containingClass);
//             this.isDefinition = false; // TODO NEW: This is a hack. Since implementing a proper linking phase, static stuff may be broken.
//         }
//         if (this.isDefinition) {
//             entity.setDefinition(this);
//         }
//         try {
//             this.entities.push(entity);
//             var options = {own: true};
//             if (isA(entity, MemberFunctionEntity)) {
//                 options.paramTypes = entity.type.paramTypes;
//                 options.exactMatch = true;
//                 options.noBase = true;
//             }
//             if ((isA(entity, MemberVariableEntity) || isA(entity, MemberFunctionEntity))){
//                 // We don't check if a conflicting member already exists here - that will be
//                 // done inside addMember and an exception will be thrown if there is a conflict
//                 this.i_containingClass.addMember(entity); // this internally adds it to the class scope
//             }
//             return entity;
//         }
//         catch(e) {
//             if (isA(e, Note)){
//                 this.addNote(e);
//                 return null;
//             }
//             else {
//                 throw e;
//             }
//         }
//     }
// });
// export var ConstructorDefinition = FunctionDefinition.extend({
//     _name: "ConstructorDefinition",
//     i_childrenToExecute: ["memberInitializers", "body"], // TODO: why do regular functions have member initializers??
//     instance : function(ast, context){
//         assert(context);
//         assert(isA(context.containingClass, Types.Class));
//         assert(context.hasOwnProperty("access"));
//         // Make sure it's actually a constructor
//         if (ast.name.identifier !== context.containingClass.className){
//             // oops was actually a function with missing return type
//             return FunctionDefinition.instance(ast, context);
//         }
//         return ConstructorDefinition._parent.instance.apply(this, arguments);
//     },
//     compileDeclaration : function() {
//         FunctionDefinition.compileDeclaration.apply(this, arguments);
//         if (!this.hasErrors()){
//             this.i_containingClass.addConstructor(this.entity);
//         }
//     },
//     compileDeclarator : function(){
//         var ast = this.ast;
//         // NOTE: a constructor doesn't have a "name", and so we don't need to add it to any scope.
//         // However, to make lookup easier, we give all constructors their class name plus the null character. LOL
//         // TODO: this is silly. remove it pls :)
//         this.name = this.i_containingClass.className + "\0";
//         // Compile the parameters
//         var args = this.ast.args;
//         this.params = [];
//         this.paramTypes = [];
//         for (var j = 0; j < args.length; ++j) {
//             var paramDecl = Parameter.instance(args[j], {parent: this, scope: this.bodyScope});
//             paramDecl.compile();
//             this.params.push(paramDecl);
//             this.paramTypes.push(paramDecl.type);
//         }
//         this.isDefaultConstructor = this.params.length == 0;
//         this.isCopyConstructor = this.params.length == 1
//         && (isA(this.paramTypes[0], this.i_containingClass) ||
//         isA(this.paramTypes[0], Types.Reference) && isA(this.paramTypes[0].refTo, this.i_containingClass));
//         // Give error for copy constructor that passes by value
//         if (this.isCopyConstructor && isA(this.paramTypes[0], this.i_containingClass)){
//             this.addNote(CPPError.declaration.ctor.copy.pass_by_value(this.params[0], this.paramTypes[0], this.params[0].name));
//         }
//         // I know this is technically wrong but I think it makes things run smoother
//         this.type = Types.Function.instance(Types.Void.instance(), this.paramTypes);
//     },
//     compileDefinition : function(){
//         var self = this;
//         var ast = this.ast;
//         if (!ast.body){
//             this.addNote(CPPError.class_def.ctor_def(this));
//             return;
//         }
//         this.compileCtorInitializer();
//         // Call parent class version. Will handle body, automatic object destruction, etc.
//         FunctionDefinition.compileDefinition.apply(this, arguments);
//     },
//     compileCtorInitializer : function(){
//         var memInits = this.ast.initializer || [];
//         // First, check to see if this is a delegating constructor.
//         // TODO: check on whether someone could techinically declare a member variable with the same name
//         // as the class and how that affects the logic here.
//         var targetConstructor = null;
//         for(var i = 0; i < memInits.length; ++i){
//             if (memInits[i].member.identifier == this.i_containingClass.className){
//                 targetConstructor = i;
//                 break;
//             }
//         }
//         // It is a delegating constructor
//         if (targetConstructor !== null){
//             targetConstructor = memInits.splice(targetConstructor, 1)[0];
//             // If it is a delegating constructor, there can be no other memInits
//             if (memInits.length === 0){ // should be 0 since one removed
//                 var mem = MemberInitializer.instance(targetConstructor, {parent: this, scope: this.bodyScope});
//                 mem.compile(ReceiverEntity.instance(this.i_containingClass));
//                 this.memberInitializers.push(mem);
//             }
//             else{
//                 this.addNote(CPPError.declaration.ctor.init.delegating_only(this));
//             }
//             return;
//         }
//         // It is a non-delegating constructor
//         // If there is a base class subobject, initialize it
//         var base;
//         if (base = this.i_containingClass.getBaseClass()){
//             // Check to see if there is a base class initializer.
//             var baseInits = memInits.filter(function(memInit){
//                 return memInit.member.identifier === base.className;
//             });
//             memInits = memInits.filter(function(memInit){
//                 return memInit.member.identifier !== base.className;
//             });
//             if (baseInits.length > 1){
//                 this.addNote(CPPError.declaration.ctor.init.multiple_base_inits(this));
//             }
//             else if (baseInits.length === 1){
//                 var mem = MemberInitializer.instance(baseInits[0], {parent: this, scope: this.bodyScope});
//                 mem.compile(this.i_containingClass.baseClassEntities[0]);
//                 this.memberInitializers.push(mem);
//             }
//             else{
//                 var mem = DefaultMemberInitializer.instance(this.ast, {parent: this, scope: this.bodyScope});
//                 mem.compile(this.i_containingClass.baseClassEntities[0]);
//                 this.memberInitializers.push(mem);
//                 mem.isMemberInitializer = true;
//             }
//         }
//         // Initialize non-static data members of the class
//         // Create a map of name to initializer. Initially all initializers are null.
//         var initMap = {};
//         this.i_containingClass.memberSubobjectEntities.forEach(function(objMember){
//             initMap[objMember.name] = objMember;
//         });
//         // Iterate through all the member initializers and associate them with appropriate member
//         for(var i = 0; i < memInits.length; ++i){
//             var memInit = memInits[i];
//             // Make sure this type has a member of the given name
//             var memberName = memInit.member.identifier;
//             if (initMap.hasOwnProperty(memberName)) {
//                 var mem = MemberInitializer.instance(memInit, {parent: this, scope: this.bodyScope});
//                 mem.compile(initMap[memberName]);
//                 initMap[memberName] = mem;
//             }
//             else{
//                 this.addNote(CPPError.declaration.ctor.init.improper_member(this, this.i_containingClass, memberName));
//             }
//         }
//         // Now iterate through members again in declaration order. Add associated member initializer
//         // from above or default initializer if there wasn't one.
//         var self = this;
//         this.i_containingClass.memberSubobjectEntities.forEach(function(objMember){
//             if (isA(initMap[objMember.name], MemberInitializer)){
//                 self.memberInitializers.push(initMap[objMember.name]);
//             }
//             else if (isA(objMember.type, Types.Class) || isA(objMember.type, Types.Array)){
//                 var mem = DefaultMemberInitializer.instance(self.ast, {parent: self, scope: self.bodyScope});
//                 mem.compile(objMember);
//                 self.memberInitializers.push(mem);
//                 mem.isMemberInitializer = true;
//             }
//             else{
//                 // No need to do anything for non-class types since default initialization does nothing
//             }
//         });
//     },
//     isTailChild : function(child){
//         return {isTail: false};
//     },
//     describe : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         var desc = {};
//         if (this.isDefaultConstructor){
//             desc.message = "the default constructor for the " + this.i_containingClass.className + " class";
//         }
//         else if (this.isCopyConstructor){
//             desc.message = "the copy constructor for the " + this.i_containingClass.className + " class";
//         }
//         else{
//             desc.message = "a constructor for the " + this.i_containingClass.className + " class";
//         }
//         return desc
//     }
// });
// export var DestructorDefinition = FunctionDefinition.extend({
//     _name: "DestructorDefinition",
//     init : function(ast, context){
//         assert(context);
//         assert(isA(context.containingClass, Types.Class));
//         assert(context.hasOwnProperty("access"));
//         this.initParent(ast, context);
//         this.access = context.access;
//         this.i_containingClass = context.containingClass;
//     },
//     compileDeclaration : function() {
//         FunctionDefinition.compileDeclaration.apply(this, arguments);
//         this.i_containingClass.addDestructor(this.entity);
//     },
//     compileDeclarator : function() {
//         var ast = this.ast;
//         // Destructors do have names and can be found via name lookup
//         this.name = "~" + this.i_containingClass.className;
//         this.virtual = this.ast.virtual;
//         // There are no parameters for a destructor
//         this.params = [];
//         this.paramTypes = [];
//         // I know this is technically wrong but I think it makes things run smoother
//         this.type = Types.Function.instance(Types.Void.instance(), this.paramTypes);
//     },
//     compileDefinition: function(){
//         var self = this;
//         var ast = this.ast;
//         if (!ast.body){
//             this.addNote(CPPError.class_def.dtor_def(this));
//             return;
//         }
//         // Call parent class version. Will handle body, automatic object destruction, etc.
//         FunctionDefinition.compileDefinition.apply(this, arguments);
//         this.membersToDestruct = this.i_containingClass.memberSubobjectEntities.filter(function(entity){
//             return isA(entity.type, Types.Class);
//         }).map(function(entityToDestruct){
//             var dest = entityToDestruct.type.destructor;
//             if (dest){
//                 var call = FunctionCall.instance({args: []}, {parent: self});
//                 call.compile({
//                     func: dest,
//                     receiver: entityToDestruct});
//                 return call;
//             }
//             else{
//                 self.addNote(CPPError.declaration.dtor.no_destructor_member(entityToDestruct.decl, entityToDestruct, self.i_containingClass));
//             }
//         });
//         this.basesToDestruct = this.i_containingClass.baseClassEntities.map(function(entityToDestruct){
//             var dest = entityToDestruct.type.destructor;
//             if (dest){
//                 var call = FunctionCall.instance({args: []}, {parent: self});
//                 call.compile({
//                     func: dest,
//                     receiver: entityToDestruct});
//                 return call;
//             }
//             else{
//                 self.addNote(CPPError.declaration.dtor.no_destructor_base(entityToDestruct.decl, entityToDestruct, self.i_containingClass));
//             }
//         });
//     },
//     upNext : Class.BEFORE(function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index === "afterChildren") {
//             // These are pushed on a stack and so end up happening
//             // in reverse order of the order they are pushed here.
//             // Autos first, then members, then bases.
//             this.basesToDestruct.forEach(function (dest){
//                 dest.createAndPushInstance(sim, inst);
//             });
//             this.membersToDestruct.forEach(function (dest){
//                 dest.createAndPushInstance(sim, inst);
//             });
//             // Auto destructors are handled in parent class
//         }
//     }),
//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         if (inst.index === "afterDestructors"){
//             inst.index = "done";
//         }
//     },
//     isTailChild : function(child){
//         return {isTail: false};
//     }
// });
class FunctionDefinitionGroup {
    constructor(definitions) {
        this.name = definitions[0].name;
        this.definitions = this._definitions = definitions.slice();
    }
    addDefinition(overload) {
        this._definitions.push(overload);
    }
}
exports.FunctionDefinitionGroup = FunctionDefinitionGroup;
//# sourceMappingURL=declarations.js.map