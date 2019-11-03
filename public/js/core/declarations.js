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
var constructs_1 = require("./constructs");
var errors_1 = require("./errors");
var util_1 = require("../util/util");
var types_1 = require("./types");
var initializers_1 = require("./initializers");
var entities_1 = require("./entities");
var expressions_1 = require("./expressions");
var statements_1 = require("./statements");
var lexical_1 = require("./lexical");
var functions_1 = require("./functions");
var StorageSpecifier = /** @class */ (function (_super) {
    __extends(StorageSpecifier, _super);
    function StorageSpecifier(context, specs) {
        var _this = _super.call(this, context) || this;
        var numSpecs = 0; // count specs separately to get a count without duplicates
        specs.forEach(function (spec) {
            if (_this[spec]) {
                // If it was already true, we must be processing a duplicate
                _this.addNote(errors_1.CPPError.declaration.storage.once(_this, spec));
            }
            else {
                util_1.asMutable(_this)[spec] = true;
                ++numSpecs;
            }
        });
        if (_this.static) {
            _this.addNote(errors_1.CPPError.lobster.unsupported_feature(_this, "static"));
        }
        if (_this.extern) {
            _this.addNote(errors_1.CPPError.lobster.unsupported_feature(_this, "extern"));
        }
        if (_this.thread_local) {
            _this.addNote(errors_1.CPPError.lobster.unsupported_feature(_this, "thread_local"));
        }
        if (_this.register) {
            _this.addNote(errors_1.CPPError.lobster.unsupported_feature(_this, "register"));
        }
        if (_this.mutable) {
            _this.addNote(errors_1.CPPError.lobster.unsupported_feature(_this, "mutable"));
        }
        // 0 specifiers is ok
        // 1 specifier is ok
        // 2 specifiers only ok if one is thread_local and the other is static/extern
        // 3 or more specifiers are always incompatible
        if (numSpecs < 2 ||
            numSpecs == 2 && _this.thread_local && (_this.static || _this.extern)) {
            //ok
        }
        else {
            _this.addNote(errors_1.CPPError.declaration.storage.incompatible(_this, specs));
        }
        _this.isEmpty = (numSpecs === 0);
        return _this;
    }
    StorageSpecifier.createFromAST = function (ast, context) {
        return new StorageSpecifier(context, ast);
    };
    return StorageSpecifier;
}(constructs_1.BasicCPPConstruct));
exports.StorageSpecifier = StorageSpecifier;
var TypeSpecifier = /** @class */ (function (_super) {
    __extends(TypeSpecifier, _super);
    function TypeSpecifier(context, specs) {
        var _this = _super.call(this, context) || this;
        var constCount = 0;
        var volatileCount = 0;
        specs.forEach(function (spec) {
            if (spec === "enum") {
                util_1.asMutable(_this).enum = true;
                _this.addNote(errors_1.CPPError.lobster.unsupported_feature(_this, "mutable"));
                return;
            }
            // check to see if it's one of the possible type specifiers
            var possibleSpecs = ["const", "volatile", "signed", "unsigned", "enum"];
            var matchedSpec = possibleSpecs.find(function (s) { return s === spec; });
            if (matchedSpec) { // found a type specifier
                if (_this[matchedSpec]) {
                    // it was a duplicate
                    _this.addNote(errors_1.CPPError.declaration.typeSpecifier.once(_this, matchedSpec));
                }
                else {
                    // first time this spec seen, set to true
                    util_1.asMutable(_this)[matchedSpec] = true;
                }
            }
            else { // It's a typename
                if (_this.typeName) { // already had a typename, this is a duplicate
                    _this.addNote(errors_1.CPPError.declaration.typeSpecifier.one_type(_this, [_this.typeName, spec]));
                }
                else {
                    util_1.asMutable(_this).typeName = spec;
                }
            }
        });
        if (_this.unsigned && _this.signed) {
            _this.addNote(errors_1.CPPError.declaration.typeSpecifier.signed_unsigned(_this));
        }
        // If unsigned/signed specifier is present and there is no type name, default to int
        if ((_this.unsigned || _this.signed) && !_this.typeName) {
            _this.typeName = "int";
        }
        // If we don't have a typeName by now, it means there wasn't one.
        // This (old) code presumes the only time this would be parsed successfully
        // and make it here is in the context of a function declaration. I don't think
        // that's quite correct.
        // TODO: probably get rid of this and just let the function declaration check for this
        if (!_this.typeName) {
            _this.addNote(errors_1.CPPError.declaration.func.no_return_type(_this));
            return _this;
        }
        // Check to see if type name is one of the built in types
        if (types_1.isBuiltInTypeName(_this.typeName)) {
            util_1.asMutable(_this).type = new types_1.builtInTypes[_this.typeName](_this.const, _this.volatile);
            return _this;
        }
        // Otherwise, check to see if the type name is in scope
        // TODO: add back in when classes are added
        // var scopeType;
        // if (scopeType = this.contextualScope.lookup(this.typeName)){
        //     if (scopeType instanceof TypeEntity){
        //         this.type = new scopeType.type(this.const, this.volatile);
        //         return;
        //     }
        // }
        _this.addNote(errors_1.CPPError.type.typeNotFound(_this, _this.typeName));
        return _this;
    }
    TypeSpecifier.createFromAST = function (ast, context) {
        return new TypeSpecifier(context, ast);
    };
    return TypeSpecifier;
}(constructs_1.BasicCPPConstruct));
exports.TypeSpecifier = TypeSpecifier;
;
function createDeclarationFromAST(ast, context) {
    if (ast.construct_type === "simple_declaration") {
        return createSimpleDeclarationFromAST(ast, context);
    }
    else {
        return FunctionDefinition.createFromAST(ast, context);
    }
}
exports.createDeclarationFromAST = createDeclarationFromAST;
function createSimpleDeclarationFromAST(ast, context) {
    // Need to create TypeSpecifier first to get the base type first for the declarators
    var typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs, context);
    var baseType = typeSpec.type;
    var storageSpec = StorageSpecifier.createFromAST(ast.specs.storageSpecs, context);
    // Use map to create an array of the individual declarations (since multiple on the same line
    // will result in a single AST node and need to be broken up)
    return ast.declarators.map(function (declAST) {
        // Create declarator and determine declared type
        var declarator = Declarator.createFromAST(declAST, context, baseType);
        var declaredType = declarator.type;
        // Create the declaration itself. Which kind depends on the declared type
        var declaration;
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
            declaration = new FunctionDeclaration(context, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        else if (declaredType.isArrayOfUnknownBoundType()) {
            // TODO: it may be possible to determine the bound from the initializer
            declaration = new UnknownBoundArrayDeclaration(context, typeSpec, storageSpec, declarator, ast.specs, declaredType);
        }
        else {
            // Determine the appropriate kind of object definition based on the contextual scope
            var decl = void 0;
            if (statements_1.isBlockContext(context)) {
                decl = new LocalVariableDefinition(context, typeSpec, storageSpec, declarator, ast.specs, declaredType);
            }
            else {
                decl = new GlobalObjectDefinition(context, typeSpec, storageSpec, declarator, ast.specs, declaredType);
            }
            declaration = decl;
            // Set initializer
            var init = declAST.initializer;
            if (!init) {
                decl.setDefaultInitializer();
            }
            else if (init.construct_type == "direct_initializer") {
                decl.setDirectInitializer(init.args.map(function (a) { return expressions_1.createExpressionFromAST(a, context); }));
            }
            else if (init.construct_type == "copy_initializer") {
                decl.setCopyInitializer(init.args.map(function (a) { return expressions_1.createExpressionFromAST(a, context); }));
            }
            // else if (init.construct_type == "initializer_list") {
            //     // decl.setCopyInitializer(init.args.map((a) => Expression.createFromAST(a, context)));
            // }
        }
        // Set AST
        declaration.setAST(ast);
        return declaration;
    });
}
exports.createSimpleDeclarationFromAST = createSimpleDeclarationFromAST;
var SimpleDeclaration = /** @class */ (function (_super) {
    __extends(SimpleDeclaration, _super);
    function SimpleDeclaration(context, typeSpec, storageSpec, declarator, otherSpecs) {
        var _this = _super.call(this, context) || this;
        _this.typeSpecifier = typeSpec;
        _this.storageSpecifier = storageSpec;
        _this.otherSpecifiers = otherSpecs;
        _this.declarator = declarator;
        _this.name = declarator.name; // TODO: remove non-null assertion here once typescript supports assert based control flow analysis (soon)
        if (!declarator.name) {
            return util_1.assertFalse("Simple declarations must have a name.");
        }
        // None of the simple declarations are member function declarations
        // and thus none support the virtual keyword
        if (otherSpecs.virtual) {
            _this.addNote(errors_1.CPPError.declaration.virtual_prohibited(_this));
        }
        return _this;
    }
    return SimpleDeclaration;
}(constructs_1.BasicCPPConstruct));
exports.SimpleDeclaration = SimpleDeclaration;
var UnknownTypeDeclaration = /** @class */ (function (_super) {
    __extends(UnknownTypeDeclaration, _super);
    function UnknownTypeDeclaration(context, typeSpec, storageSpec, declarator, otherSpecs) {
        var _this = _super.call(this, context, typeSpec, storageSpec, declarator, otherSpecs) || this;
        // If the declared type cannot be determined, we don't want to give
        // a meaningless error that an initializer is not allowed, so we set
        // this to true.
        _this.initializerAllowed = true;
        _this.isDefinition = false;
        _this.addNote(errors_1.CPPError.declaration.unknown_type(_this));
        return _this;
    }
    return UnknownTypeDeclaration;
}(SimpleDeclaration));
exports.UnknownTypeDeclaration = UnknownTypeDeclaration;
var VoidDeclaration = /** @class */ (function (_super) {
    __extends(VoidDeclaration, _super);
    function VoidDeclaration(context, typeSpec, storageSpec, declarator, otherSpecs) {
        var _this = _super.call(this, context, typeSpec, storageSpec, declarator, otherSpecs) || this;
        // Suppress meaningless error, since a void declaration is
        // always ill-formed, whether or not it has an initializer.
        _this.initializerAllowed = true;
        _this.isDefinition = false;
        _this.type = types_1.VoidType.VOID;
        _this.addNote(errors_1.CPPError.declaration.void_prohibited(_this));
        return _this;
    }
    return VoidDeclaration;
}(SimpleDeclaration));
exports.VoidDeclaration = VoidDeclaration;
var TypedefDeclaration = /** @class */ (function (_super) {
    __extends(TypedefDeclaration, _super);
    function TypedefDeclaration(context, typeSpec, storageSpec, declarator, otherSpecs) {
        var _this = _super.call(this, context, typeSpec, storageSpec, declarator, otherSpecs) || this;
        _this.initializerAllowed = false;
        _this.isDefinition = false;
        _this.addNote(errors_1.CPPError.lobster.unsupported_feature(_this, "typedef"));
        return _this;
        // ADD THIS BACK IN WHEN TYPEDEFS ARE SUPPORTED
        // if (this.storageSpecifier.numSpecs > 0 && this.isTypedef) {
        //     this.addNote(CPPError.declaration.storage.typedef(this, this.storageSpec.ast))
        // }
    }
    return TypedefDeclaration;
}(SimpleDeclaration));
exports.TypedefDeclaration = TypedefDeclaration;
var FriendDeclaration = /** @class */ (function (_super) {
    __extends(FriendDeclaration, _super);
    function FriendDeclaration(context, typeSpec, storageSpec, declarator, otherSpecs) {
        var _this = _super.call(this, context, typeSpec, storageSpec, declarator, otherSpecs) || this;
        _this.initializerAllowed = false;
        _this.isDefinition = false;
        _this.addNote(errors_1.CPPError.lobster.unsupported_feature(_this, "friend"));
        // TODO: Add back in when classes are supported
        // if (!(this.contextualScope instanceof ClassScope)) {
        //     this.addNote(CPPError.declaration.friend.outside_class(this));
        // }
        if (otherSpecs.virtual) {
            _this.addNote(errors_1.CPPError.declaration.friend.virtual_prohibited(_this));
        }
        return _this;
    }
    return FriendDeclaration;
}(SimpleDeclaration));
exports.FriendDeclaration = FriendDeclaration;
var UnknownBoundArrayDeclaration = /** @class */ (function (_super) {
    __extends(UnknownBoundArrayDeclaration, _super);
    function UnknownBoundArrayDeclaration(context, typeSpec, storageSpec, declarator, otherSpecs, type) {
        var _this = _super.call(this, context, typeSpec, storageSpec, declarator, otherSpecs) || this;
        // This class should only be created in cases where the size of
        // the array cannot be determined from its initializer, which is
        // problematic, but the initializer itself is not prohibited.
        _this.initializerAllowed = true;
        _this.isDefinition = false;
        _this.type = type;
        _this.addNote(errors_1.CPPError.declaration.array.length_required(_this));
        return _this;
    }
    return UnknownBoundArrayDeclaration;
}(SimpleDeclaration));
exports.UnknownBoundArrayDeclaration = UnknownBoundArrayDeclaration;
var FunctionDeclaration = /** @class */ (function (_super) {
    __extends(FunctionDeclaration, _super);
    function FunctionDeclaration(context, typeSpec, storageSpec, declarator, otherSpecs, type) {
        var _this = _super.call(this, context, typeSpec, storageSpec, declarator, otherSpecs) || this;
        _this.initializerAllowed = false;
        _this.isDefinition = false;
        _this.type = type;
        _this.declaredEntity = new entities_1.FunctionEntity(type, _this);
        util_1.assert(!!_this.declarator.parameters, "The declarator for a function declaration must contain declarators for its parameters as well.");
        _this.parameterDeclarators = _this.declarator.parameters;
        // If main, should have no parameters
        if (_this.declaredEntity.isMain() && _this.type.paramTypes.length > 0) {
            _this.addNote(errors_1.CPPError.declaration.func.mainParams(_this.declarator));
        }
        // if (this.isMemberFunction){
        //     this.i_containingClass.addMember(this.entity);
        // }
        // if (!this.isMemberFunction && this.virtual){
        //     this.addNote(CPPError.declaration.func.virtual_not_allowed(this));
        // }
        // this.checkOverloadSemantics();
        try {
            _this.context.contextualScope.addDeclaredEntity(_this.declaredEntity);
        }
        catch (e) {
            if (e instanceof errors_1.Note) {
                _this.addNote(e);
            }
            else {
                throw e;
            }
        }
        // A function declaration has linkage, unless it is a local function declaration in a block scope
        // (which has no linkage). The linkage is presumed to be external, because Lobster does not
        // support using the static keyword to specify internal linkage.
        if (_this.context.contextualScope instanceof entities_1.NamespaceScope) {
            _this.context.translationUnit.program.registerLinkedEntity(_this.declaredEntity);
        }
        return _this;
    }
    return FunctionDeclaration;
}(SimpleDeclaration));
exports.FunctionDeclaration = FunctionDeclaration;
var VariableDefinition = /** @class */ (function (_super) {
    __extends(VariableDefinition, _super);
    function VariableDefinition() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    VariableDefinition.prototype.setInitializer = function (init) {
        util_1.assert(!this.initializer);
        this.initializer = init;
        return this;
    };
    VariableDefinition.prototype.setDefaultInitializer = function () {
        return this.setInitializer(initializers_1.DefaultInitializer.create(this.context, this.declaredEntity));
    };
    VariableDefinition.prototype.setDirectInitializer = function (args) {
        return this.setInitializer(initializers_1.DirectInitializer.create(this.context, this.declaredEntity, args));
    };
    VariableDefinition.prototype.setCopyInitializer = function (args) {
        return this.setInitializer(initializers_1.CopyInitializer.create(this.context, this.declaredEntity, args));
    };
    VariableDefinition.prototype.setInitializerList = function (args) {
        // TODO implement initializer lists
        this.addNote(errors_1.CPPError.lobster.unsupported_feature(this, "initializer lists"));
        return this;
    };
    return VariableDefinition;
}(SimpleDeclaration));
exports.VariableDefinition = VariableDefinition;
var LocalVariableDefinition = /** @class */ (function (_super) {
    __extends(LocalVariableDefinition, _super);
    function LocalVariableDefinition(context, typeSpec, storageSpec, declarator, otherSpecs, type) {
        var _this = _super.call(this, context, typeSpec, storageSpec, declarator, otherSpecs) || this;
        _this.initializerAllowed = true;
        _this.isDefinition = true;
        _this.type = type;
        _this.declaredEntity =
            type.isReferenceType() ? new entities_1.LocalReferenceEntity(type.refTo, _this) : new entities_1.AutoEntity(type, _this);
        // Note extern unsupported error is added in the base Declaration class, so no need to add here
        // All local declarations are also definitions, with the exception of a local declaration of a function
        // or a local declaration with the extern storage specifier, but those are not currently supported by Lobster.
        // This means a locally declared variable does not have linkage, and we don't need to do any linking stuff here.
        // Attempt to add the declared entity to the scope. If it fails, note the error.
        // (e.g. an entity with the same name was already declared in the same scope)
        try {
            _this.context.contextualScope.addDeclaredEntity(_this.declaredEntity);
            _this.context.functionLocals.registerLocalVariable(_this.declaredEntity);
        }
        catch (e) {
            if (e instanceof errors_1.Note) {
                _this.addNote(e);
            }
            else {
                throw e;
            }
        }
        return _this;
    }
    return LocalVariableDefinition;
}(VariableDefinition));
exports.LocalVariableDefinition = LocalVariableDefinition;
var GlobalObjectDefinition = /** @class */ (function (_super) {
    __extends(GlobalObjectDefinition, _super);
    function GlobalObjectDefinition(context, typeSpec, storageSpec, declarator, otherSpecs, type) {
        var _this = _super.call(this, context, typeSpec, storageSpec, declarator, otherSpecs) || this;
        _this.initializerAllowed = true;
        _this.isDefinition = true;
        _this.type = type;
        if (type.isReferenceType()) {
            _this.addNote(errors_1.CPPError.lobster.unsupported_feature(_this, "globally scoped references"));
            return _this;
        }
        _this.declaredEntity = new entities_1.StaticEntity(type, _this);
        // Attempt to add the declared entity to the scope. If it fails, note the error.
        // (e.g. an entity with the same name was already declared in the same scope)
        try {
            _this.context.contextualScope.addDeclaredEntity(_this.declaredEntity);
        }
        catch (e) {
            if (e instanceof errors_1.Note) {
                _this.addNote(e);
            }
            else {
                throw e;
            }
        }
        _this.context.translationUnit.program.registerGlobalObjectDefinition(_this.declaredEntity.qualifiedName, _this);
        return _this;
    }
    return GlobalObjectDefinition;
}(VariableDefinition));
exports.GlobalObjectDefinition = GlobalObjectDefinition;
var ParameterDefinition = /** @class */ (function (_super) {
    __extends(ParameterDefinition, _super);
    function ParameterDefinition(context, typeSpec, storageSpec, declarator, otherSpecs, type) {
        var _this = _super.call(this, context, typeSpec, storageSpec, declarator, otherSpecs) || this;
        _this.initializerAllowed = true;
        _this.isDefinition = true;
        _this.type = type;
        _this.declaredEntity =
            _this.type.isReferenceType() ? new entities_1.LocalReferenceEntity(_this.type.refTo, _this, true) :
                new entities_1.AutoEntity(_this.type, _this, true);
        // Attempt to add the declared entity to the scope. If it fails, note the error.
        // (e.g. an entity with the same name was already declared in the same scope)
        try {
            _this.context.contextualScope.addDeclaredEntity(_this.declaredEntity);
            // Register the defined local object/reference
            context.functionLocals.registerLocalVariable(_this.declaredEntity);
        }
        catch (e) {
            if (e instanceof errors_1.Note) {
                _this.addNote(e);
            }
            else {
                throw e;
            }
        }
        return _this;
    }
    return ParameterDefinition;
}(SimpleDeclaration));
exports.ParameterDefinition = ParameterDefinition;
// TODO: take baseType as a parameter to compile rather than init
var Declarator = /** @class */ (function (_super) {
    __extends(Declarator, _super);
    /**
     * `Declarator.createFromAST()` should always be used to create Declarators, which delegates
     * to this private constructor. Directly calling the constructor from the outside is not allowed.
     * Since declarators are largely about processing an AST, it doesn't make much sense to create
     * one without an AST.
     */
    function Declarator(context, ast, baseType) {
        var _this = _super.call(this, context) || this;
        _this.setAST(ast);
        _this.baseType = baseType;
        // let isMember = isA(this.parent, Declarations.Member);
        if (ast.pureVirtual) {
            _this.isPureVirtual = true;
        }
        _this.determineNameAndType(ast);
        return _this;
    }
    Declarator.createFromAST = function (ast, context, baseType) {
        return new Declarator(context, ast, baseType); // Note .setAST(ast) is called in the ctor already
    };
    Declarator.prototype.determineNameAndType = function (ast) {
        var _this = this;
        if (!this.baseType) { // If there's no base type, we really can't do much
            return;
        }
        var type = this.baseType;
        var first = true;
        // let prevKind : "function" | "reference" | "pointer" | "array" | "none" = "none";
        var decl = ast; // AST will always be present on Declarators
        while (decl) {
            // We want to check whether this is the innermost thing, but first we need to loop
            // to descend through any AST representation of parentheses within the declarator.
            var tempDecl = decl;
            while (tempDecl.sub) {
                tempDecl = tempDecl.sub;
            }
            var isInnermost = !(tempDecl.pointer || tempDecl.reference || tempDecl.sub);
            if (decl.name) {
                this.name = decl.name.identifier;
                lexical_1.checkIdentifier(this, decl.name.identifier, this);
            }
            if (decl.postfixes) {
                var arePostfixesInnermost = isInnermost;
                for (var i = decl.postfixes.length - 1; i >= 0; --i) {
                    // A postfix portion of a declarator is only innermost if it's the leftmost one,
                    // which would be closest to where the name would occur in the declarator. (Note
                    // that this is also the last one processed here, since we iterate backward down to 0.)
                    var postfix = decl.postfixes[i];
                    isInnermost = arePostfixesInnermost && i === 0;
                    if (postfix.kind === "array") {
                        if (type.isBoundedArrayType()) {
                            this.addNote(errors_1.CPPError.declaration.array.multidimensional_arrays_unsupported(this));
                            return;
                        }
                        if (!type.isArrayElemType()) {
                            this.addNote(errors_1.CPPError.declaration.array.invalid_element_type(this, type));
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
                            if (postfix.size.construct_type === "numeric_literal") {
                                // If the size specified is a literal, just use its value as array length
                                type = new types_1.BoundedArrayType(type, expressions_1.parseNumericLiteralValueFromAST(postfix.size));
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
                        if (!type.isPotentialReturnType()) {
                            if (type.isFunctionType()) {
                                this.addNote(errors_1.CPPError.declaration.func.return_func(this));
                            }
                            else if (type.isBoundedArrayType()) {
                                this.addNote(errors_1.CPPError.declaration.func.return_array(this));
                            }
                            else {
                                this.addNote(errors_1.CPPError.declaration.func.invalid_return_type(this, type));
                            }
                            return;
                        }
                        var paramDeclarators = postfix.args.map(function (argAST) {
                            var storageSpec = StorageSpecifier.createFromAST(argAST.specs.storageSpecs, _this.context);
                            _this.attach(storageSpec);
                            if (!storageSpec.isEmpty) {
                                storageSpec.addNote(errors_1.CPPError.declaration.parameter.storage_prohibited(_this));
                            }
                            // Need to create TypeSpecifier first to get the base type first for the declarators
                            var typeSpec = TypeSpecifier.createFromAST(argAST.specs.typeSpecs, _this.context);
                            _this.attach(typeSpec);
                            // Compile declarator for each parameter (of the function-type argument itself)
                            return Declarator.createFromAST(argAST.declarator, _this.context, typeSpec.type);
                        });
                        this.parameters = paramDeclarators;
                        var paramTypes = paramDeclarators.map(function (decl) {
                            if (!decl.type) {
                                return decl.type;
                            }
                            if (!decl.type.isBoundedArrayType()) {
                                return decl.type;
                            }
                            else {
                                return decl.type.adjustToPointerType();
                            }
                        });
                        // A parameter list of just (void) specifies no parameters
                        if (paramTypes.length == 1 && paramTypes[0] && paramTypes[0].isVoidType()) {
                            paramTypes = [];
                        }
                        else {
                            // Otherwise void parameters are bad
                            for (var j = 0; j < paramTypes.length; ++j) {
                                var paramType = paramTypes[j];
                                if (paramType && paramType.isVoidType()) {
                                    this.addNote(errors_1.CPPError.declaration.func.void_param(paramDeclarators[j]));
                                }
                            }
                        }
                        if (!paramTypes.every(function (paramType) { return paramType && paramType.isPotentialParameterType(); })) {
                            this.addNote(errors_1.CPPError.declaration.func.some_invalid_parameter_types(this));
                        }
                        // TODO clean up error immediately above and get rid of yucky cast below
                        type = new types_1.FunctionType(type, paramTypes, decl.const, decl.volatile, this.context.containingClass && this.context.containingClass.cvQualified(!!postfix.const));
                    }
                    first = false;
                }
            }
            // Process pointers/references next
            // NOTE: this line should NOT be else if since the same AST node may
            // have both postfixes and a pointer/reference
            if (decl.pointer) {
                if (!type.isObjectType()) {
                    if (type.isReferenceType()) {
                        this.addNote(errors_1.CPPError.declaration.pointer.reference(this));
                    }
                    else if (type.isVoidType()) {
                        this.addNote(errors_1.CPPError.declaration.pointer.void(this));
                    }
                    else {
                        this.addNote(errors_1.CPPError.declaration.pointer.invalid_pointed_type(this, type));
                    }
                    return;
                }
                type = new types_1.PointerType(type, decl["const"], decl["volatile"]);
                decl = decl.pointer;
            }
            else if (decl.reference) {
                if (!type.isObjectType()) {
                    if (type.isReferenceType()) {
                        this.addNote(errors_1.CPPError.declaration.ref.ref(this));
                    }
                    else {
                        this.addNote(errors_1.CPPError.declaration.ref.invalid_referred_type(this, type));
                    }
                    return;
                }
                type = new types_1.ReferenceType(type, decl["const"], decl["volatile"]);
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
    };
    return Declarator;
}(constructs_1.BasicCPPConstruct));
exports.Declarator = Declarator;
var OVERLOADABLE_OPS = {};
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
var FunctionDefinition = /** @class */ (function (_super) {
    __extends(FunctionDefinition, _super);
    // i_childrenToExecute: ["memberInitializers", "body"], // TODO: why do regular functions have member initializers??
    function FunctionDefinition(context, declaration, parameters, body) {
        var _this = _super.call(this, context) || this;
        _this.attach(_this.declaration = declaration);
        _this.attachAll(_this.parameters = parameters);
        _this.attach(_this.body = body);
        _this.context.translationUnit.program.registerFunctionDefinition(_this.declaration.declaredEntity.qualifiedName, _this);
        return _this;
        // this.autosToDestruct = this.bodyScope.automaticObjects.filter(function(obj){
        //     return isA(obj.type, Types.Class);
        // });
        // this.bodyScope.automaticObjects.filter(function(obj){
        //   return isA(obj.type, Types.Array) && isA(obj.type.elemType, Types.Class);
        // }).map(function(arr){
        //   for(var i = 0; i < arr.type.length; ++i){
        //     self.autosToDestruct.push(ArraySubobjectEntity.instance(arr, i));
        //   }
        // });
        // this.autosToDestruct = this.autosToDestruct.map(function(entityToDestruct){
        //     var dest = entityToDestruct.type.destructor;
        //     if (dest){
        //         var call = FunctionCall.instance({args: []}, {parent: self, scope: self.bodyScope});
        //         call.compile({
        //             func: dest,
        //             receiver: entityToDestruct});
        //         return call;
        //     }
        //     else{
        //         self.addNote(CPPError.declaration.dtor.no_destructor_auto(entityToDestruct.decl, entityToDestruct));
        //     }
        // });
    }
    FunctionDefinition.createFromAST = function (ast, context) {
        var declaration = createSimpleDeclarationFromAST({
            construct_type: "simple_declaration",
            declarators: [ast.declarator],
            specs: ast.specs,
            source: ast.declarator.source
        }, context)[0];
        if (!(declaration instanceof FunctionDeclaration)) {
            return new constructs_1.InvalidConstruct(context, errors_1.CPPError.declaration.func.definition_non_function_type);
        }
        // Create implementation and body block (before params and body statements added yet)
        var functionContext = functions_1.createFunctionContext(context, declaration.declaredEntity);
        var body = new statements_1.Block(functionContext);
        var bodyContext = body.blockContext;
        // Create parameters, which are given the body block's context to add declared entities to.
        // As the context refers back to the implementation, local objects/references will be registerd there.
        var parameters = declaration.parameterDeclarators.map(function (paramDeclarator) {
            return new ParameterDefinition(bodyContext, TypeSpecifier.createFromAST([], bodyContext), StorageSpecifier.createFromAST([], bodyContext), paramDeclarator, {}, paramDeclarator.type); // TODO: hacky cast, can be elimited when parameter declarations are upgraded to their own construct
        });
        // Manually add statements to body. (This hasn't been done because the body block was crated manually, not
        // from the AST through the Block.createFromAST function. And we wait until now to do it so they will be
        // added after the parameters.)
        ast.body.statements.forEach(function (sNode) { return body.addStatement(statements_1.createStatementFromAST(sNode, bodyContext)); });
        return new FunctionDefinition(functionContext, declaration, parameters, body);
    };
    FunctionDefinition.prototype.createRuntimeFunction = function (parent, receiver) {
        return new functions_1.RuntimeFunction(this, parent, receiver);
    };
    return FunctionDefinition;
}(constructs_1.BasicCPPConstruct));
exports.FunctionDefinition = FunctionDefinition;
// TODO: this should be called ClassDefinition
// export var ClassDeclaration = CPPConstruct.extend(BaseDeclarationMixin, {
//     _name: "ClassDeclaration",
//     compile : function(){
//         assert(false, "Must use compileDeclaration and compileDefinition separately for a ClassDeclaration.");
//     },
//     compileDeclaration : function(){
//         var ast = this.ast;
//         this.key = ast.head.key;
//         this.name = ast.head.name.identifier;
//         this.members = [];
//         // Base classes
//         if (this.ast.head.bases && this.ast.head.bases.length > 0){
//             if (this.ast.head.bases.length > 1){
//                 this.addNote(CPPError.class_def.multiple_inheritance(this));
//                 return;
//             }
//             try{
//                 var baseCode = this.ast.head.bases[0];
//                 // TODO NEW: Use an actual Identifier expression for this
//                 this.base = this.contextualScope.requiredLookup(baseCode.name.identifier);
//                 if (!isA(this.base, TypeEntity) || !isA(this.base.type, Types.Class)){
//                     this.addNote(CPPError.class_def.base_class_type({ast:baseCode.name}, baseCode.name.identifier));
//                 }
//                 if (baseCode.virtual){
//                     this.addNote(CPPError.class_def.virtual_inheritance({ast:baseCode.name}, baseCode.name.identifier));
//                 }
//             }
//             catch(e){
//                 if (isA(e, SemanticExceptions.BadLookup)){
//                     this.addNote(e.annotation(this));
//                 }
//                 else{
//                     throw e;
//                 }
//             }
//         }
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
//         var memDecls = this.memDecls = [];
//         for(var i = 0; i < ast.member_specs.length; ++i){
//             var spec = ast.member_specs[i];
//             var access = spec.access || "private";
//             for(var j = 0; j < spec.members.length; ++j){
//                 spec.members[j].access = access;
//                 var memDecl = SimpleDeclaration.create(spec.members[j], {parent:this, scope: this.classScope, containingClass: this.type, access:access});
//                 // Within member function definitions, class is considered as complete even though it isn't yet
//                 if (isA(memDecl, FunctionDefinition)){
//                     this.type.setTemporarilyComplete();
//                 }
//                 memDecl.compileDeclaration();
//                 // Remove temporarily complete
//                 this.type.unsetTemporarilyComplete();
//                 memDecls.push(memDecl);
//             }
//         }
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
//     compileDefinition : function() {
//         if (this.hasErrors()){
//             return;
//         }
//         for(var i = 0; i < this.memDecls.length; ++i){
//             this.memDecls[i].compileDefinition();
//         }
//     },
//     createImplicitDefaultConstructor : function(){
//         var self = this;
//         // If any data members are of reference type, do not create the implicit default constructor
//         if (!this.type.memberSubobjectEntities.every(function(subObj){
//                 return !isA(subObj.type, Types.Reference);
//             })){
//             return;
//         }
//         // If any const data members do not have a user-provided default constructor
//         if (!this.type.memberSubobjectEntities.every(function(subObj){
//                 if (!isA(subObj.type, Types.Class) || !subObj.type.isConst){
//                     return true;
//                 }
//                 var defCon = subObj.type.getDefaultConstructor();
//                 return defCon && !defCon.decl.isImplicit();
//             })){
//             return;
//         }
//         // If any subobjects do not have a default constructor or destructor
//         if (!this.type.subobjectEntities.every(function(subObj){
//                 return !isA(subObj.type, Types.Class) ||
//                     subObj.type.getDefaultConstructor() &&
//                     subObj.type.destructor;
//             })){
//             return;
//         }
//         var src = this.name + "() {}";
//         //TODO: initialize members (i.e. that are classes)
//         src = Lobster.cPlusPlusParser.parse(src, {startRule:"member_declaration"});
//         return ConstructorDefinition.instance(src, {parent:this, scope: this.classScope, containingClass: this.type, access:"public", implicit:true});
//     },
//     createImplicitCopyConstructor : function(){
//         var self = this;
//         // If any subobjects are missing a copy constructor, do not create implicit copy ctor
//         if (!this.type.subobjectEntities.every(function(subObj){
//                 return !isA(subObj.type, Types.Class) ||
//                     subObj.type.getCopyConstructor(subObj.type.isConst);
//             })){
//             return;
//         }
//         // If any subobjects are missing a destructor, do not create implicit copy ctor
//         if (!this.type.subobjectEntities.every(function(subObj){
//                 return !isA(subObj.type, Types.Class) ||
//                     subObj.type.destructor;
//             })){
//             return;
//         }
//         var src = this.name + "(const " + this.name + " &other)";
//         if (this.type.subobjectEntities.length > 0){
//             src += "\n : ";
//         }
//         src += this.type.baseClassEntities.map(function(subObj){
//             return subObj.type.className + "(other)";
//         }).concat(this.type.memberEntities.map(function(subObj){
//             return subObj.name + "(other." + subObj.name + ")";
//         })).join(", ");
//         src += " {}";
//         src = Lobster.cPlusPlusParser.parse(src, {startRule:"member_declaration"});
//         return ConstructorDefinition.instance(src, {parent:this, scope: this.classScope, containingClass: this.type, access:"public", implicit:true});
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
//         // If any data member is a reference, we can't make implicit assignment operator
//         if (!this.type.memberSubobjectEntities.every(function(subObj){
//                 return !isA(subObj.type, Types.Reference);
//             })){
//             return;
//         }
//         // If any non-class member is const (or array thereof), we can't make implicit assignment operator
//         if (!this.type.memberSubobjectEntities.every(function(subObj){
//                 //return (isA(subObj.type, Types.Class) || !subObj.type.isConst)
//                 //    && (!isA(subObj.type, Types.Array) || isA(subObj.type.elemType, Types.Class) || !subObj.type.elemType.isConst);
//                 return !subObj.type.isConst
//                     && (!isA(subObj.type, Types.Array) || !subObj.type.elemType.isConst);
//             })){
//             return;
//         }
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
//     createImplicitDestructor : function(){
//         var self = this;
//         // If any subobjects are missing a destructor, do not create implicit destructor
//         if (!this.type.subobjectEntities.every(function(subObj){
//                 return !isA(subObj.type, Types.Class) ||
//                     subObj.type.destructor;
//             })){
//             return;
//         }
//         var src = "~" + this.type.name + "(){}";
//         src = Lobster.cPlusPlusParser.parse(src, {startRule:"member_declaration"});
//         return DestructorDefinition.instance(src, {parent:this, scope: this.classScope, containingClass: this.type, access:"public", implicit:true});
//     },
//     createInstance : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//         return RuntimeConstruct.instance(sim, this, {decl:0, step:"decl"}, "stmt", inst);
//     },
//     upNext : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//     },
//     stepForward : function(sim: Simulation, rtConstruct: RuntimeConstruct){
//     }
// });
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
/**
 * Selects a function from the given overload group based on the signature of
 * the provided function type. (Note there's no consideration of function names here.)
 */
function selectOverloadedDefinition(overloadGroup, type) {
    return overloadGroup.find(function (func) { return type.sameSignature(func.declaration.type); });
}
exports.selectOverloadedDefinition = selectOverloadedDefinition;
//# sourceMappingURL=declarations.js.map