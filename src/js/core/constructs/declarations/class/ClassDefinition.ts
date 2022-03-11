import { AccessSpecifier, ClassDefinitionASTNode, FunctionDefinitionASTNode, MemberDeclarationASTNode, MemberSimpleDeclarationASTNode, SimpleDeclarationASTNode } from "../../../../ast/ast_declarations";
import { parseFunctionDefinition } from "../../../../parse/cpp_parser_util";
import { asMutable, assert, Mutable } from "../../../../util/util";
import { ClassContext, createClassContext, createImplicitContext, createMemberSpecificationContext, MemberSpecificationContext, SemanticContext, TranslationUnitContext } from "../../../compilation/contexts";
import { BaseSubobjectEntity, CPPEntity, FunctionEntity, MemberObjectEntity, MemberReferenceEntity, MemberVariableEntity, ReceiverEntity } from "../../../compilation/entities";
import { CPPError } from "../../../compilation/errors";
import { AnalyticConstruct } from "../../../../analysis/predicates";
import { AtomicType, CompleteClassType, FunctionType, isAtomicType, isBoundedArrayType, ReferenceType, VoidType } from "../../../compilation/types";
import { SuccessfullyCompiled } from "../../CPPConstruct";
import { BasicCPPConstruct } from "../../BasicCPPConstruct";
import { MemberDeclaration, MemberSimpleDeclaration } from "../declarations";
import { FunctionDeclaration } from "../function/FunctionDeclaration";
import { FunctionDefinition } from "../function/FunctionDefinition";
import { TypeSpecifier } from "../TypeSpecifier";
import { BaseSpecifier, CompiledBaseSpecifier } from "./BaseSpecifier";
import { ClassDeclaration, CompiledClassDeclaration, TypedClassDeclaration } from "./ClassDeclaration";
import { InvalidConstruct } from "../../InvalidConstruct";
import { Declarator } from "../Declarator";
import { TypedefDeclaration } from "../misc/TypedefDeclaration";
import { UnknownBoundArrayDeclaration } from "../misc/UnknownBoundArrayDeclaration";
import { UnknownTypeDeclaration } from "../misc/UnknownTypeDeclaration";
import { VoidDeclaration } from "../misc/VoidDeclaration";
import { StorageSpecifier } from "../StorageSpecifier";
import { setInitializerFromAST } from "../variable/common";
import { FriendDeclaration } from "./FriendDeclaration";
import { IncompleteTypeMemberVariableDeclaration } from "./IncompleteTypeMemberVariableDeclaration";
import { MemberVariableDeclaration } from "./MemberVariableDeclaration";



export class ClassDefinition extends BasicCPPConstruct<ClassContext, ClassDefinitionASTNode> {

    public readonly construct_type = "class_definition";

    // public readonly name: number = 2;
    public readonly declaration: ClassDeclaration;
    public readonly name: string;
    public readonly type: CompleteClassType;

    public readonly baseSpecifiers: readonly BaseSpecifier[];
    public readonly memberDeclarations: readonly MemberDeclaration[];
    public readonly memberDeclarationsByName: { [index: string]: MemberDeclaration | undefined; } = {};
    public readonly constructorDeclarations: readonly FunctionDeclaration[] = [];

    public readonly baseType?: CompleteClassType;

    public readonly memberFunctionEntities: readonly FunctionEntity[] = [];
    public readonly memberVariableEntities: readonly MemberVariableEntity[] = [];
    public readonly memberObjectEntities: readonly MemberObjectEntity[] = [];
    public readonly memberReferenceEntities: readonly MemberReferenceEntity[] = [];
    public readonly memberVariableEntitiesByName: { [index: string]: MemberVariableEntity | undefined; } = {};

    public readonly defaultConstructor?: FunctionEntity<FunctionType<VoidType>>;
    public readonly constCopyConstructor?: FunctionEntity<FunctionType<VoidType>>;
    public readonly nonConstCopyConstructor?: FunctionEntity<FunctionType<VoidType>>;
    public readonly constructors: readonly FunctionEntity<FunctionType<VoidType>>[];

    public readonly destructor?: FunctionEntity<FunctionType<VoidType>>;

    public readonly objectSize: number;

    public readonly inlineMemberFunctionDefinitions: readonly FunctionDefinition[] = [];

    private readonly implicitPublicContext: MemberSpecificationContext;

    //     public readonly members: MemberVariableDeclaration | MemberFunctionDeclaration | MemberFunctionDefinition;
    public static createFromAST(ast: ClassDefinitionASTNode, tuContext: TranslationUnitContext) {

        let classKey = ast.head.classKey;

        // Default access level is private for class, public for struct
        let defaultAccessLevel: AccessSpecifier = (classKey === "class" ? "private" : "public");

        // Base specifiers are NOT created in the class context, since the base class
        // entity it refers to is looked up without regard to what follows in the class.
        // (And if it were dependent on the class scope, which is dependent on the base
        // class scope, etc. there's circular problems.)
        let bases = <CompiledBaseSpecifier[]>ast.head.bases.map(baseAST => {
            let base = BaseSpecifier.createFromAST(baseAST, tuContext, defaultAccessLevel);
            if (base.isSuccessfullyCompiled()) {
                return <CompiledBaseSpecifier>base;
            }
            else {
                return undefined;
            }
        }).filter(base => base);

        let declaration = new ClassDeclaration(tuContext, ast.head.name.identifier, classKey);
        if (declaration.declaredEntity.isComplete()) {
            return declaration.declaredEntity.definition;
        }


        let templateType: AtomicType | undefined = undefined;
        let tpMatch = ast.head.name.identifier.match(/<.*>/);
        if (tpMatch) {
            let templateParameter = tpMatch[0].slice(1, -1); // remove the < >
            let t = new TypeSpecifier(tuContext, [templateParameter]).baseType;
            if (t && isAtomicType(t)) {
                templateType = t;
            }
        }

        // Create class context based on class entity from the declaration
        let classContext = createClassContext(tuContext, declaration.declaredEntity, bases[0]?.baseEntity, templateType);

        let memDecls: MemberDeclaration[] = [];
        let functionDefsToCompile: [FunctionDefinitionASTNode, MemberSpecificationContext, FunctionDeclaration][] = [];

        // Create and compile declarations for all members
        ast.memberSpecs.forEach(memSpec => {
            // This outer forEach goes through all "sections" of public, private, etc.
            // Access level is as specified or the default
            let accessLevel = memSpec.access ?? defaultAccessLevel;
            let memberSpecContext = createMemberSpecificationContext(classContext, accessLevel);

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

    public constructor(context: ClassContext, ast: ClassDefinitionASTNode | undefined, declaration: ClassDeclaration, baseSpecs: readonly BaseSpecifier[], memberDeclarations: readonly MemberDeclaration[]) {
        super(context, ast);

        this.name = declaration.name;
        this.implicitPublicContext = createImplicitContext(createMemberSpecificationContext(context, "public"));

        this.attach(this.declaration = declaration);

        this.attachAll(this.baseSpecifiers = baseSpecs);

        if (baseSpecs.length > 0 && baseSpecs[0].baseEntity?.isComplete()) {
            this.baseType = baseSpecs[0].baseEntity.type;
        }

        if (baseSpecs.length > 1) {
            this.addNote(CPPError.class_def.multiple_inheritance(this));
        }

        this.attachAll(this.memberDeclarations = memberDeclarations);

        // Identify member objects and member references
        memberDeclarations.forEach(decl => {

            
            
            if (decl.construct_type === "member_variable_declaration") {
                // Only record entities for valid entities
                if (!decl.isDeclaredEntityValid) {
                    return;
                }

                addMemberEntity(this.memberVariableEntities, decl.declaredEntity);

                if (decl.declaredEntity instanceof MemberObjectEntity) {
                    addMemberEntity(this.memberObjectEntities, decl.declaredEntity);
                }
                else {
                    addMemberEntity(this.memberReferenceEntities, decl.declaredEntity);
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
                addMemberEntity(this.memberFunctionEntities, decl.declaredEntity);
            }
        });

        // CONSTRUCTORS and DESTRUCTOR
        this.constructors = [];
        memberDeclarations.forEach(mem => {
            if (mem.construct_type === "function_declaration" && mem.isConstructor) {
                asMutable(this.constructorDeclarations).push(mem);
                // Need to check for redeclaration here since the constructors don't get
                // added to a scope where we would normally detect that.
                if (this.constructors.some(prevCtor => prevCtor.type.sameSignature(mem.type))) {
                    mem.addNote(CPPError.declaration.ctor.previous_declaration(mem));
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
                        asMutable(this.constructors).push(ctorEntity);

                        if (ctorEntity.type.paramTypes.length === 0) {
                            (<Mutable<this>>this).defaultConstructor = ctorEntity;
                        }
                        else if (ctorEntity.type.sameParamTypes([new ReferenceType(this.declaration.type.cvQualified(true))])) {
                            (<Mutable<this>>this).constCopyConstructor = ctorEntity;
                        }
                        else if (ctorEntity.type.sameParamTypes([new ReferenceType(this.declaration.type.cvUnqualified())])) {
                            (<Mutable<this>>this).nonConstCopyConstructor = ctorEntity;
                        }
                    }
                }
            }
            else if (mem.construct_type === "function_declaration" && mem.isDestructor) {
                let dtorEntity = mem.declaredEntity;

                if (dtorEntity.returnsVoid()) {
                    // If it doesn't have a void (dummy) return type, it's
                    // not a valid dtor and we don't add it to the class
                    asMutable(this).destructor = dtorEntity;
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
        assert(declaration.type.isCompleteClassType());
        this.type = declaration.type;

        // These need to happen after setting the definition on the entity above
        this.createImplicitlyDefinedDefaultConstructorIfAppropriate();
        this.createImplicitlyDefinedCopyConstructorIfAppropriate();
        this.createImplicitlyDefinedCopyAssignmentOperatorIfAppropriate();
        this.createImplicitlyDefinedDestructorIfAppropriate();

        this.context.program.registerClassDefinition(this.declaration.declaredEntity.qualifiedName, this);
    }

    public attachInlineFunctionDefinition(def: FunctionDefinition) {
        asMutable(this.inlineMemberFunctionDefinitions).push(def);
        this.attach(def);
    }

    private createImplicitlyDefinedDefaultConstructorIfAppropriate() {

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
        let iddc = <FunctionDefinition>FunctionDefinition.createFromAST(
            parseFunctionDefinition(src),
            this.implicitPublicContext);
        this.attach(iddc);
        let declEntity = iddc.declaration.declaredEntity;
        assert(declEntity.returnsVoid());
        (<Mutable<this>>this).defaultConstructor = declEntity;
        asMutable(this.constructors).push(declEntity);
    }


    private createImplicitlyDefinedCopyConstructorIfAppropriate() {

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
        let refParamCanBeConst: boolean;
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
        let memInits: string[] = this.memberVariableEntities.map(mem => `${mem.name}(other.${mem.name})`);
        if (this.baseType) {
            memInits.unshift(this.baseType.className + "(other)");
        }
        if (memInits.length > 0) {
            src += `\n : ${memInits.join(", ")}`;
        }
        src += " { }";

        let idcc = <FunctionDefinition>FunctionDefinition.createFromAST(
            parseFunctionDefinition(src),
            this.implicitPublicContext);
        this.attach(idcc);
        let declEntity = idcc.declaration.declaredEntity;
        assert(declEntity.returnsVoid()); // check cast above with assertion
        if (refParamCanBeConst) {
            (<Mutable<this>>this).constCopyConstructor = declEntity;
        }
        else {
            (<Mutable<this>>this).nonConstCopyConstructor = declEntity;
        }
        asMutable(this.constructors).push(declEntity);
    }


    public lookupAssignmentOperator(requireConstParam: boolean, isReceiverConst: boolean) {
        return this.context.contextualScope.lookup("operator=", {
            kind: "exact", noParent: true, noBase: true,
            paramTypes: [this.type.cvQualified(requireConstParam)],
            receiverType: this.type.cvQualified(isReceiverConst)
        });
    }

    private createImplicitlyDefinedCopyAssignmentOperatorIfAppropriate() {

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
        let refParamCanBeConst: boolean;
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
        src += this.memberObjectEntities.map(
            mem => mem.isTyped(isBoundedArrayType)
                ? `  for(int i = 0; i < ${mem.type.numElems}; ++i) {\n    ${mem.name}[i] = rhs.${mem.name}[i];\n  }\n`
                : `  ${mem.name} = rhs.${mem.name};\n`
        ).join("");
        src += "  return *this;\n}";

        let idao = <FunctionDefinition>FunctionDefinition.createFromAST(
            parseFunctionDefinition(src),
            this.implicitPublicContext);
        this.attach(idao);
        // Compiling the declaration already put the implicitly defined operator in
        // the right scope, so nothing more we need to do here (unlike for ctors)
    }



    private createImplicitlyDefinedDestructorIfAppropriate() {

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
        let idd = <FunctionDefinition>FunctionDefinition.createFromAST(
            parseFunctionDefinition(src),
            this.implicitPublicContext);
        this.attach(idd);
        let declEntity = idd.declaration.declaredEntity;
        assert(declEntity.returnsVoid());
        (<Mutable<this>>this).destructor = declEntity;
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
    public getBaseAndMemberEntities() {
        return this.baseType
            ? [new BaseSubobjectEntity(new ReceiverEntity(this.type), this.baseType), ...this.memberVariableEntities]
            : this.memberVariableEntities;
    }

    public isSuccessfullyCompiled(): this is CompiledClassDefinition {
        return super.isSuccessfullyCompiled();
    }

    public isSemanticallyEquivalent_impl(other: AnalyticConstruct, equivalenceContext: SemanticContext): boolean {
        return other.construct_type === this.construct_type;
        // TODO semantic equivalence
    }
}

export interface TypedClassDefinition<T extends CompleteClassType> extends ClassDefinition, SuccessfullyCompiled {
    readonly type: T;
    readonly declaration: TypedClassDeclaration<T>;
}

export interface CompiledClassDefinition<T extends CompleteClassType = CompleteClassType> extends TypedClassDefinition<T>, SuccessfullyCompiled {
    readonly declaration: CompiledClassDeclaration<T>;
    readonly baseSpecifiers: readonly CompiledBaseSpecifier[];
}



const MemberDeclarationConstructsMap = {
    "simple_member_declaration": (ast: MemberSimpleDeclarationASTNode, context: MemberSpecificationContext) => createMemberSimpleDeclarationFromAST(ast, context),
    "function_definition": (ast: FunctionDefinitionASTNode, context: MemberSpecificationContext) => createMemberFunctionDeclarationFromDefinitionAST(ast, context)
    // Note: function_definition includes ctor and dtor definitions
};

function createMemberDeclarationFromAST<ASTType extends MemberDeclarationASTNode>(ast: ASTType, context: MemberSpecificationContext) : ReturnType<(typeof MemberDeclarationConstructsMap)[ASTType["construct_type"]]>{
    return <any>MemberDeclarationConstructsMap[ast.construct_type](<any>ast, context);
}

function createMemberSimpleDeclarationFromAST(ast: MemberSimpleDeclarationASTNode, context: MemberSpecificationContext) {
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
    if (baseType?.sameType(context.containingClass.type)) {
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
        let declaration: MemberSimpleDeclaration;
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

function createMemberFunctionDeclarationFromDefinitionAST(ast: FunctionDefinitionASTNode, context: TranslationUnitContext) {

    // Need to create TypeSpecifier first to get the base type for the declarators
    const typeSpec = TypeSpecifier.createFromAST(ast.specs.typeSpecs, context);
    const baseType = typeSpec.baseType;
    const storageSpec = StorageSpecifier.createFromAST(ast.specs.storageSpecs, context);

    const declarator = Declarator.createFromAST(ast.declarator, context, baseType);
    const declaredType = declarator.type;

    if (!declarator.name) {
        return new InvalidConstruct(context, ast, CPPError.declaration.missing_name);
    }
    
    if (!declaredType?.isFunctionType()) {
        return new InvalidConstruct(context, ast, CPPError.declaration.func.definition_non_function_type);
    }
    
    const declAST: SimpleDeclarationASTNode = {
        construct_type: "simple_declaration",
        declarators: [ast.declarator],
        specs: ast.specs,
        source: ast.declarator.source
    };

    return new FunctionDeclaration(context, declAST, typeSpec, storageSpec, declarator, ast.specs, declaredType);
}

function addMemberEntity<T extends CPPEntity>(entities: readonly T[], new_entity: T) {
    if (!entities.find(ent => ent.entityId === new_entity.entityId)) {
        asMutable(entities).push(new_entity);
    }
}