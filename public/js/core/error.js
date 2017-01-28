var RuntimeMessage = Class.extend({
    _name: "RuntimeMessage",
    text : Class._ABSTRACT
});

var DeadObjectMessage = RuntimeMessage.extend({
    _name: "DeadObjectMessage",
    init : function(deadObj, options){
        assert(isA(deadObj, ObjectEntity));
        this.deadObj = deadObj;

        // If we're working with a subobject, its lifetime is tied to that of its parent object
        while(isA(this.deadObj, Subobject)){
            this.deadObj = this.deadObj.parentObject();
        }

        this.options = options || {};
    },
    text : function(){
    },
    display : function(sim, inst){
        var text0;
        if (this.options.fromDereference){
            text0 = "I followed that pointer, but the object I found was dead!";
        }
        else if (this.options.fromSubscript){
            text0 = "The array you're trying to index into is dead.";
        }
        else if (this.options.fromDelete){
            text0 = "Uh...the object you're trying to delete is already dead...";
        }
        else{
            text0 = "Uh oh. It looks like the object you're trying to work with is dead.";
        }


        var text1;
        if (isA(this.deadObj, DynamicObjectEntity)){
            var killer = this.deadObj.obituary().killer;
            if (killer){
                var srcCode = findNearestTrackedConstruct(killer.model).code;
                killer.send("current");
                text1 = "It was dynamically allocated on the heap, but has since been deleted by line " + srcCode.line + ":\n<span class='code'>" + srcCode.text + "</span>";
            }
            else{
                text1 = "It was dynamically allocated on the heap, but has since been been deleted.";
            }
        }
        else if (isA(this.deadObj, AutoObjectInstance)){
            text1 = "It was a local variable declared at the highlighted line, but it already has gone out of scope.";
        }

        sim.alert(text0 + "\n\n" + text1);

    }
});

var findNearestTrackedConstruct = function(construct){
    if (construct && !construct.code && construct.start !== undefined && construct.line !== undefined){
        return {code: construct};
    }
    // We want to attribute it to the nearest thing that has associated code which is tracked
    while(construct && construct.context && construct.context.parent && (!construct.code || construct.code.start === undefined)){
        construct = construct.context.parent;
    }

    if (construct && construct.code){
        return construct;
    }
    else{
        return {code:{column: 0, line: 0, start: 0, end: 0, text: ""}};
    }
};

var Annotation = Class.extend({
    _name: "Annotation",
    _nextAnnotationId : 0,
    init : function(src){
        this.annotationId = Annotation._nextAnnotationId++;
        // We want to attribute it to the nearest thing that has associated code which is tracked
        this.src = findNearestTrackedConstruct(src);
        this.code = this.src.code;
    },

    onAdd : function(){

    },

    onRemove : function(){

    }

});

var SimpleAnnotation = Annotation.extend({
    _name: "SimpleAnnotation",
    init : function(src, cssClass, sentence){
        cssClass = cssClass || "";
        this.initParent(src);
        this.cssClass = cssClass;
        this.sentence = (typeof _ !== "undefined" ? _.escape(sentence) : sentence);
    },

    instanceString : function(){
        // return "<span style=\"background-color:"+this.color+"\">"+this.sentence + "</span>";
        return "<span>"+ "Line " + this.code.line + ": " + this.sentence + "</span>";
    },

    onAdd : function(outlet){
        this.mark = outlet.addMark(this.code, this.cssClass);
    },

    onRemove : function(outlet){
        this.mark && this.mark.clear();
    }


});



var ErrorAnnotation = SimpleAnnotation.extend({
    _name: "ErrorAnnotation",
    //init : function(src, cssClass, sentence){
    //    this.initParent(src, cssClass, sentence);
    //},

    onAdd : function(outlet){
        SimpleAnnotation.onAdd.apply(this, arguments);
        this.gutterMarker = outlet.addGutterError(this.code.line, this.toString());
    },

    onRemove : function(outlet){
        this.gutterMarker && this.gutterMarker.remove();
        outlet.removeGutterError(this.code.line);
        SimpleAnnotation.onRemove.apply(this, arguments);
    }


});

var WidgetAnnotation = Annotation.extend({
    _name: "WidgetAnnotation",
    init : function(src, cssClass){
        this.initParent(src);
        this.cssClass = cssClass;
    },

    instanceString : function(){
        // return "<span style=\"background-color:"+this.color+"\">"+this.sentence + "</span>";
        return "<span>"+ "Line " + this.code.line + ": " + this.sentence + "</span>";
    },

    onAdd : function(outlet){

        this.mark = outlet.addMark(this.code, "widget " + this.cssClass);

        var elem = this.elem = $('<span><span class="widgetHolder"><span class="widgetLink"></span></span></span>');
        var self = this;
        elem.find(".widgetLink").click(function(e){
            $(this).addClass("active");
            self.onClick(outlet);
            $(this).removeClass("active");
            //$(this).parent().removeClass("expanded");
            e.preventDefault();
            return false;
        });
        outlet.addWidget(this.code, elem);
    },

    onRemove : function(){
        this.mark.clear();
        this.elem && this.elem.remove();
    },

    onClick : function(){
        //alert(this.sentence);
    }

});

var RecursiveCallAnnotation = WidgetAnnotation.extend({
    _name: "RecursiveCallAnnotation",
    init : function(src, isTail, reason, others){
        this.initParent(src, isTail ? "tailRecursive" : "recursive");
        this.isTail = isTail;
        this.reason = reason;
        this.others = others || [];
    },

    onClick : function(outlet){
        var otherMarks = [];
        for(var i = 0; i < this.others.length; ++i){
            otherMarks.push(outlet.addMark(this.others[i].code, "current"));
        }
        var intro = this.isTail ? "This function call is tail recursive!" : "This function call is recursive, but NOT tail recursive!";
        outlet.send("annotationMessage", {
            text: this.reason ? intro + "\n\n" + this.reason : intro,
            after: function() {
                for (var i = 0; i < otherMarks.length; ++i) {
                    otherMarks[i].clear();
                }
            },
            aboutRecursion: true
        });
    }

});

var RecursiveFunctionAnnotation = WidgetAnnotation.extend({
    _name: "RecursiveFunctionAnnotation",
    init : function(src){
        this.initParent(src, src.constantStackSpace ? "tailRecursive" : "recursive");
        this.code = this.src.declarator.code;
    },

    onClick : function(outlet){

        var cycle = this.src.nonTailCycle;

        if (this.src.constantStackSpace){
            if (this.src.isRecursive){
                outlet.send("annotationMessage", {
                    text: "<span class='code'>" + this.src.name + "</span> is tail recursive!\n\nAll of the recursive calls it makes are in fact tail recursive. (And it doesn't call any non-tail recursive functions!)",
                    aboutRecursion: true
                });
            }
            else{
                outlet.send("annotationMessage", {
                    text: "<span class='code'>" + this.src.name + "</span> doesn't appear to use recursion at all.",
                    aboutRecursion: true
                });
            }

            //alert("This function uses other tail recursive functions, so we can call it \"tail recursive\".");
        }
        else{
            if (this.src.isRecursive){

                // Check to see if any of the calls are from this context.
                var self = this;
                var fromContext = this.src.nonTailCycleCalls.filter(function(call){
                    return call.context.func === self.src;
                });

                if (fromContext.length == 0){
                    //var others = this.src.nonTailCycleCalls || [];
                    var others = this.src.nonTailCycles.map(function(elem){
                        while (elem && elem.from){
                            elem = elem.from;
                        }
                        return elem.call;
                    });
                    var otherMarks = [];
                    for(var i = 0; i < others.length; ++i){
                        otherMarks.push(outlet.addMark(others[i].code, "current"));
                    }
                    var message = "<span class='code'>" + this.src.name + "</span> is NOT tail recursive.\n\nThe problem is it calls other functions (";
                    //for(var i = 0; i < others.length; ++i){
                    //    message += (i == 0 ? "" : ", ") + others.entity.name;
                    //}
                    message += "highlighted) that aren't tail recursive.";
                    outlet.send("annotationMessage", {
                        text: message,
                        after: function(){
                            for(var i = 0; i < otherMarks.length; ++i){
                                otherMarks[i].clear();
                            }
                        },
                        aboutRecursion: true
                    });
                }
                else{
                    var others = this.src.nonTailCycleCalls || [];
                    var otherMarks = [];
                    for(var i = 0; i < others.length; ++i){
                        otherMarks.push(outlet.addMark(others[i].code, "current"));
                    }
                    outlet.send("annotationMessage", {
                        text: "<span class='code'>" + this.src.name + "</span> is recursive, but NOT tail recursive!\n\nIn order for it to be tail recursive, all of the recursive calls it makes would need to be tail recursive. The ones that are not are highlighted.",
                        after: function(){
                            for(var i = 0; i < otherMarks.length; ++i){
                                otherMarks[i].clear();
                            }
                        },
                        aboutRecursion: true
                    });
                }
            }
        }
    }

});

var DeclarationAnnotation = WidgetAnnotation.extend({
    _name: "DeclarationAnnotation",
    init : function(src){
        this.initParent(src, "");
    },

    onClick : function(outlet){
        var str = "";
        var entities = this.src.entities || [this.src.entity];
        for(var i = 0; i < entities.length; ++i) {
            if (i !== 0){
                str += "\n\n";
            }
            var ent = entities[i];
            str += "<span class='code'>" + ent.name + "</span> is " + ent.type.englishString(false, true);
        }
        outlet.send("annotationMessage", {text : str});
    }

});

var makeError = function(src, type, sentence){
    //src = src || {context:{}};
    if (type === true){
        return ErrorAnnotation.instance(src, "warning", sentence);
    }
    else if (type === false){
        return ErrorAnnotation.instance(src, "error", sentence);
    }
};

var CPPError = {
	attributeEmptyTo : function(problems, code){
		for(var key in problems){
			var prob = problems[key];
			prob.code = prob.code || code;
		}
	},
	summary : function(problems){
		var str = "";
		for(var i = 0; i < problems.length; ++i){
			var prob = problems[i];
			str += "<span style=\"background-color:"+prob.color+"\">"+prob.sentence + "</span><br />";
		}
		return str;
	},
    classDef :{
        prev_def : function(src, name, prev){
            return makeError(src, false, name + " cannot be defined more than once. Note that Labster just puts all class names (i.e. types) in one global sort of namespace, so you can't ever have two classes of the same name.");
        },
        base_class_type : function(src, name){
            return makeError(src, false, "I cannot find a suitable class called \""+ name + "\" to use as a base.");
        },
        bigThree : function(src, bigThreeYes, bigThreeNo){
            var yStr = bigThreeYes.join(" and ");
            var nStr = bigThreeNo.join(" and ");
            return makeError(src, true, "This class does not follow the rule of the Big Three. It has a custom implementation for the " + yStr + " but not for the " + nStr + ". The compiler will provide implicit versions of the missing ones, but they will almost certainly work \"incorrectly\" (e.g. make shallow copies or neglect to delete dynamic memory).");
        },
        multiple_inheritance : function(src){
            return makeError(src, false, "Sorry, but Labster does not support multiple inheritance.");
        },
        virtual_inheritance : function(src){
            return makeError(src, false, "Sorry, but Labster does not support virtual inheritance.");
        },
        ctor_def : function(src){
            return makeError(src, false, "Sorry, but for now Labster only supports constructors that are defined inline. (i.e. You need a body.)");
        },
        dtor_def : function(src){
            return makeError(src, false, "Sorry, but for now Labster only supports destructors that are defined inline. (i.e. You need a body.)");
        }
    },
	decl : {
        ctor : {
            copy : {
                pass_by_value : function(src, type, name){
                    var constRef = Types.Reference.instance(type, true);
                    return makeError(src, false, "A copy constructor cannot take its parameter by value. Because pass-by-value itself uses the copy constructor, this would cause infinite recursion if it were allowed. Try passing by const reference instead! (i.e. "+constRef.typeString(false, name)+")");
                }
            },
            init : {
                no_such_member : function(src, classType, name){
                    return makeError(src, false, "Class " + classType.toString() + " has no member named " + name + ".");
                },
                improper_member : function(src, classType, name){
                    return makeError(src, false, "A member initializer can only be used for non-static data members.");
                },
                delegating_only : function(src, classType, name){
                    return makeError(src, false, "If a constructor's initializer list delegates to another constructor from the same class, that must be the only thing it does.");
                },
                multiple_base_inits : function(src, classType, name){
                    return makeError(src, false, "A constructor's initializer list cannot specify more than one base class constructor to use.");
                }
            }
        },
        dtor : {
            no_destructor_auto : function(src, entity){
                return makeError(src, false, "The local variable " + entity.name + " needs to be destroyed when it \"goes out of scope\", but I can't find a destructor for the " + entity.type + " class. The compiler sometimes provides one implicitly for you, but not if one of its members or its base class are missing a destructor. (Or, if you've violated the rule of the Big Three.)");
            },
            no_destructor_member : function(src, entity, memberOfClass){
                return makeError(src, false, "The member variable " + entity.name + " needs to be destroyed as part of the " + memberOfClass.className + " destructor, but I can't find a destructor for the " + entity.type + " class. The compiler sometimes provides one implicitly for you, but not if one of its members or its base class are missing a destructor. (Or, if you've violated the rule of the Big Three.)");
            },
            no_destructor_base : function(src, entity, memberOfClass){
                return makeError(src, false, "The base class " + entity.name + " needs to be destroyed as part of the " + memberOfClass.className + " destructor, but I can't find a destructor for the " + entity.type + " class. The compiler sometimes provides one implicitly for you, but not if one of its members or its base class are missing a destructor. (Or, if you've violated the rule of the Big Three.)");
            },
            no_destructor_temporary : function(src, entity){
                return makeError(src, false, "This expression creates a temporary object of type " + entity.type + " that needs to be destroyed, but I can't find a destructor for the " + entity.type + " class. The compiler sometimes provides one implicitly for you, but not if one of its members or its base class are missing a destructor. (Or, if you've violated the rule of the Big Three.)");
            }
            // TODO Add warning for non-virtual destructor if derived classes exist
        },
        no_type : function(src){
            return makeError(src, false, "ISO C++ forbids declaration with no type.");
        },
        prev_decl : function(src, name, prev){
            return makeError(src, false, name + " cannot be declared more than once in this scope.");
        },
        prev_def : function(src, name, prev){
            return makeError(src, false, name + " cannot be defined more than once in this scope.");
        },
        prev_main : function(src, name, prev){
            return makeError(src, false, name + " cannot be defined more than once in this scope.");
        },
		func : {
			return_array : function(src){
				return makeError(src, false, "Cannot declare a function that returns an array.");
			},
			return_func : function(src){
				return makeError(src, false, "Cannot declare a function that returns a function. Try returning a function pointer?");
			},
            array : function(src){
                return makeError(src, false, "Cannot declare an array of functions.");
            },
            void_param : function(src){
                return makeError(src, false, "Function parameters may not have void type.");
            },
            op_member : function(src){
                return makeError(src, false, "This operator must be overloaded as a non-static member function.");
            },
            op_subscript_one_param : function(src){
                return makeError(src, false, "An overloaded subscript ([]) operator must take exactly one parameter.");
            },
            returnTypesMatch : function(src, name){
                return makeError(src, false, "Cannot redeclare function " + name + " with the same parameter types but a different return type.");
            },
            mainParams : function(src){
                return makeError(src, false, "Sorry, but for now command line arguments (and thus parameters for main) are not supported in Labster.");
            },
            no_return_type : function(src){
                return makeError(src, false, "You must specify a return type for this function. (Or if you meant it to be a constructor, did you misspell the name?)");
            },
            virtual_member : function(src){
                return makeError(src, false, "Only member functions may be declared as virtual.");
            },
            nonCovariantReturnType : function(src, derived, base){
                return makeError(src, false, "Return types in overridden virtual functions must either be the same or covariant (i.e. follow the Liskov Substitution Principle). Both return types must be pointers/references to class types, and the class type in the overriding function must be the same or a derived type. There are also restrictions on the cv-qualifications of the return types. In this case, returning a " + derived + " in place of a " + base + " violates covariance.");
            }
		},
		ref : {
			ref : function(src){
				return makeError(src, false, "Cannot declare a reference to a reference.");
			},
            array : function(src){
                return makeError(src, false, "Cannot declare an array of references.");
            },
            pointer : function(src){
                return makeError(src, false, "Cannot declare a pointer to a reference.");
            },
            memberNotSupported : function(src){
                return makeError(src, false, "Sorry, reference members are not supported at the moment.");
            }
		},
        array : {
            length_required : function(src){
                return makeError(src, false, "Must specify length when declaring an array. (Sorry, but Labster requires this for now even if it could hypothetically be deduced from the initializer.)");
            },
            literal_length_only : function(src){
                return makeError(src, false, "At the moment, only literal array lengths are supported for non-dynamic arrays.");
            },
            zero_length : function(src){
                return makeError(src, false, "Statically allocated arrays with zero length are prohibited (and why would you want one?).");
            }
        },
        init : {
            scalar_args : function(src, declType){
                return makeError(src, false, "Invalid initialization of scalar type " + declType + " from multiple values.");
            },
            array_args : function(src, declType){
                return makeError(src, false, "Invalid initialization of array type " + declType + ".");
            },
            convert : function(src, initType, declType){
                return makeError(src, false, "Invalid conversion from " + initType + " to " + declType + ".");
            },
            list_narrowing : function(src, initType, declType){
                return makeError(src, false, "Implicit narrowing conversion from " + initType + " to " + declType + " is not allowed in initializer list.");
            },
            list_array : function(src){
                return makeError(src, false, "Initializer list syntax only supported for arrays.");
            },
            list_length : function(src, length){
                return makeError(src, false, "Length of initializer list must match length of array (" + length + ").");
            },
            matching_constructor : function(src, entity, argTypes){
                var desc = entity.describe();
                return makeError(src, false, "Trying to initialize " + (desc.name || desc.message) + ", but unable to find a matching constructor definition for the " + entity.type.className + " class using the given arguments (" + argTypes.join(", ") + ").");
            },
            no_default_constructor : function(src, entity){
                return makeError(src, false, "This calls for the default initialization of " + entity.name + ", but I can't find a default constructor (i.e. taking no arguments) for the " + entity.type.className + " class. The compiler usually provides an implicit one for you, but not if you have declared other constructors (under the assumption you would want to use one of those).");
            },
            referenceLvalue : function(src){
                return makeError(src, false, "For now, references cannot be bound to prvalues of non-class type in Labster.");
            },
            referencePrvalueConst : function(src){
                return makeError(src, false, "You cannot bind a non-const reference to a prvalue (e.g. a temporary object).");
            },
            referenceType : function(src, from, to){
                return makeError(src, false, "A reference (of type " + to + ") cannot be bound to an object of a different type (" + from.type + ").");
            },
            referenceBind : function(src){
                return makeError(src, false, "References must be bound to something when they are declared.");
            },
            referenceBindMultiple : function(src){
                return makeError(src, false, "References cannot be bound to multiple objects.");
            },
            stringLiteralLength : function(src, stringSize, arrSize){
                if (arrSize === stringSize - 1){
                    return makeError(src, false, "Your array is one element too short. Remember, when initializing a character array (i.e. a c-string) with a string literal, an extra \\0 (null character) is automatically appended.");
                }
                else if (arrSize > stringSize){
                    return makeError(src, true, "Your array (length " + arrSize +") is longer than it needs to be to hold the string literal (length " + stringSize + "). The remaining character elements will be zero-initialized.");
                }
                else{
                    return makeError(src, false, "The string literal used for initialization (length " + stringSize + ") cannot fit in the declared array (length " + arrSize +").");
                }
            },
            uninitialized : function(src, ent){
                return makeError(src, true, (ent.describe().name || ent.describe().message) + " is uninitialized, so it will start with whatever value happens to be in memory (i.e. memory junk). If you try to use this variable before initializing it, who knows what will happen!");
            },
            array_default_init : function(src){
                return makeError(src, true, "Note: Default initialization of an array requires default initialization of each of its elements.");
            },
            array_direct_init : function(src){
                return makeError(src, true, "Note: initialization of an array requires initialization of each of its elements.");
            }

        },
        storage : {
            once : function(src, spec){
                return makeError(src, false, "Storage specifier (" + spec + ") may only be used once.");
            },
            incompatible : function(src, specs){
                return makeError(src, false, "Storage specifiers (" + specs + ") are incompatible with each other.");
            },
            typedef : function(src, specs){
                return makeError(src, false, "Storage specifiers may not be used in a typedef. (" + specs + " were found.)");
            },
            unsupported : function(src, spec){
                return makeError(src, false, "Sorry, the " + spec + " storage specifier is not currently supported.");
            }
        }
	},
	type : {
		const_once : function(src){
			return makeError(src, false, "Type specifier may only include const once.");
		},
        volatile_once : function(src){
            return makeError(src, false, "Type specifier may only include volatile once.");
        },
        unsigned_once : function(src){
            return makeError(src, false, "Type specifier may only include unsigned once.");
        },
        signed_once : function(src){
            return makeError(src, false, "Type specifier may only include signed once.");
        },
        signed_unsigned : function(src){
            return makeError(src, false, "Type specifier may not indicate both signed and unsigned.");
        },
        unsigned_not_supported : function(src){
            return makeError(src, true, "Sorry, unsigned integral types are not supported yet. It will just be treated like a normal int.");
        },
		one_type : function(src, typeNames){
			return makeError(src, false, "Type specifier must only specify one type.");//  Found: [" + typeNames + "].");
		},
        storage : function(src){
            return makeError(src, true, "Because of the way Labster works, storage class specifiers (e.g. static) have no effect.");
        },
        typeNotFound : function(src, typeName){
            return makeError(src, false, "Oops, this is embarassing... I feel like " + typeName + " should be a type, but I can't figure out what it is.");
        }
	},
    expr : {
        unsupported : function(src, expressionName) {
            return makeError(src, false, "Sorry, you have used an expression " + expressionName + " that is not currently supported.");
        },
        overloadLookup : function(src, op){
            return makeError(src, false, "Trying to find a function implementing an overloaded " + op + " operator...");
        },
        array_operand : function(src, type){
            return makeError(src, false, "Type " + type + " cannot be subscripted.");
        },
        array_offset : function(src, type){
            return makeError(src, false, "Invalid type (" + type + ") for array subscript offset.");
        },
        assignment : {
            lhs_lvalue : function(src){
                return makeError(src, false, "Lvalue required as left operand of assignment.");
            },
            lhs_const : function(src){
                return makeError(src, false, "Left hand side of assignment is not modifiable.");
            },
            convert : function(src, lhs, rhs){
                return makeError(src, false, "Cannot convert " + rhs.type + " to " + lhs.type + " in assignment.");
            },
            self : function(src, entity){
                return makeError(src, true, "Self assignment from " + entity.name + " to itself.");
            },
            not_defined : function(src, type){
                return makeError(src, false, "An assignment operator for the type " + type + " cannot be found.");
            }

        },
        binary : {
            overload_not_found : function(src, op, leftType, rightType){
                return makeError(src, false, "An overloaded " + op + " operator for the types (" + leftType + ", " + rightType + ") cannot be found.");
            }
        },
        unary : {
            overload_not_found : function(src, op, type){
                return makeError(src, false, "An overloaded " + op + " operator for the type " + type + " cannot be found.");
            }
        },
        delete : {
            no_destructor : function(src, type){
                return makeError(src, false, "I can't find a destructor for the " + type + " class. The compiler sometimes provides one implicitly for you, but not if one of its members or its base class are missing a destructor. (Or, if you've violated the rule of the Big Three.)");
            },
            pointer : function(src, type){
                return makeError(src, false, "The delete operator requires an operand of pointer type. (Current operand is " + type + " ).");
            },
            pointerToObjectType : function(src, type){
                return makeError(src, false, "The delete operator cannot be used with a pointer to a non-object type (e.g. void pointers, function pointers). (Current operand is " + type + " ).");
            }
        },
        dereference : {
            pointer : function(src, type){
                return makeError(src, false, "The dereference operator (*) requires an operand of pointer type. (Current operand is " + type + " ).");
            },
            pointerToObjectType : function(src, type){
                return makeError(src, false, "Pointers to a non-object, non-function type (e.g. void pointers) cannot be dereferenced. (Current operand is " + type + " ).");
            }
        },
        dot : {
            class_type : function(src){
                return makeError(src, false, "The dot operator can only be used to access members of an operand with class type.");
            },
            no_such_member : function(src, classType, name){
                return makeError(src, false, "Operand of type " + classType + " has no member named " + name + ".");
            },
            memberLookup : function(src, classType, name){
                return makeError(src, false, "Member lookup for " + name + " in class " + classType + " failed...");
            }
        },
        arrow : {
            class_pointer_type : function(src){
                return makeError(src, false, "The arrow operator can only be used to access members of an operand with pointer-to-class type.");
            },
            no_such_member : function(src, classType, name){
                return makeError(src, false, "Operand of type " + classType + " has no member named " + name + ".");
            },
            memberLookup : function(src, classType, name){
                return makeError(src, false, "Member lookup for " + name + " in class " + classType + " failed...");
            }
        },
        invalid_operand : function(src, operator, operand){
            return makeError(src, false, "Invalid operand type (" + operand.type + ") for operator " + operator + ".");
        },
        lvalue_operand : function(src, operator){
            return makeError(src, false, "The " + operator + " operator requires an lvalue operand.");
        },
        invalid_binary_operands : function(src, operator, left, right){

            if (isA(left.type, Types.Pointer) && sameType(left.type.ptrTo, right.type)){
                return makeError(src, false, "The types of the operands used for the " + operator + " operator " +
                "aren't quite compatible. The one on the right is " + right.type.englishString() + ", but the left is a pointer to that type. Think about whether you want to compare pointers (addresses) or the objects they point to.");
            }
            else if (isA(right.type, Types.Pointer) && sameType(right.type.ptrTo, left.type)){
                return makeError(src, false, "The types of the operands used for the " + operator + " operator " +
                "aren't quite compatible. The one on the left is " + left.type.englishString() + ", but the right is a pointer to that type.  Think about whether you want to compare pointers (addresses) or the objects they point to.");
            }

            return makeError(src, false, "Invalid operand types (" + left.type + ", " + right.type + ") for operator " + operator + ".");
        },
        logicalNot : {
            operand_bool : function(src, operand){
                return makeError(src, false, "Expression of type (" + operand.type + ") cannot be converted to boolean (as required for the operand of logical not).");
            }
        },
        addressOf : {
            lvalue_required : function(src) {
                return makeError(src, false, "Operand for address-of operator (&) must be an lvalue.");
            }
        },
        ternary : {
            cond_bool : function(src, type){
                return makeError(src, false, "Expression of type (" + type + ") cannot be converted to boolean condition.");
            },
            sameType : function(src) {
                return makeError(src, false, "Labster's ternary operator requires second and third operands of the same type.");
            },
            noVoid : function(src) {
                return makeError(src, false, "Labster's ternary operator does not allow void operands.");
            },
            sameValueCategory : function(src) {
                return makeError(src, false, "The second and third operands of the ternary operator must yield a common value category.");
            }
        },
        unaryPlus : {
            operand : function(src) {
                return makeError(src, false, "The unary plus operator (+) requires an operand of arithmetic or pointer type.");
            }
        },
        unaryMinus : {
            operand : function(src) {
                return makeError(src, false, "The unary minus operator (-) requires an operand of arithmetic type.");
            }
        },
        functionCall : {
            main : function(src) {
                return makeError(src, false, "You can't explicitly call main.");
            },
            numParams : function(src) {
                return makeError(src, false, "Improper number of arguments for this function call.");
            },
            operand : function(src, operand) {
                return makeError(src, false, "Operand of type " + operand.type + " cannot be called as a function.");
            },
            paramType : function(src, from, to) {
                return makeError(src, false, "Cannot convert " + from + " to " + to + " in function call parameter.");
            },
            paramReferenceType : function(src, from, to) {
                return makeError(src, false, "The given argument (of type " + from + ") cannot be bound to a reference parameter of a different type ("+ to + ").");
            },
            paramReferenceLvalue : function(src) {
                return makeError(src, false, "For now, you cannot bind a non-lvalue as a reference parameter in Labster. (i.e. you have to bind a variable)");
            },
            not_defined : function(src, type){
                return makeError(src, false, "A function call operator for the type " + type + " has not been defined.");
            }
            //,
            //tail_recursive : function(src, reason){
            //    return WidgetAnnotation.instance(src, "tailRecursive", "This function call is tail recursive!" + (reason ? " "+reason : ""));
            //},
            //not_tail_recursive : function(src, reason){
            //    return WidgetAnnotation.instance(src, "recursive", "This function call is recursive, but NOT tail recursive!" + (reason ? " "+reason : ""));
            //}

        },
        this_memberFunc : function(src) {
            return makeError(src, false, "You may only use the </span class='code'>this</span> keyword in non-static member functions.");
        }


    },
	iden : {
        ambiguous : function(src, name){
            return makeError(src, false, "\""+name+"\" is ambiguous. (There is not enough contextual type information for name lookup to figure out which entity this identifier refers to.)");
        },
        no_match : function(src, name){
            return makeError(src, false, "No matching function found for call to \""+name+"\" with these parameter types.");
        },
        not_declared : function(src, name){
            return makeError(src, false, "\""+name+"\" was not declared in this scope.");
        },
        keyword : function(src, name){
            return makeError(src, false, "\""+name+"\" is a C++ keyword and cannot be used as an identifier.");
        },
        alt_op : function(src, name){
            return makeError(src, false, "\""+name+"\" is a C++ operator and cannot be used as an identifier.");
        }
	},
    param : {
        numParams : function(src) {
            return makeError(src, false, "Improper number of arguments.");
        },
        paramType : function(src, from, to) {
            return makeError(src, false, "Cannot convert " + from + " to a parameter of type " + to + ".");
        },
        paramReferenceType : function(src, from, to) {
            return makeError(src, false, "The given argument (of type " + from + ") cannot be bound to a reference parameter of a different type ("+ to + ").");
        },
        paramReferenceLvalue : function(src) {
            return makeError(src, false, "For now, you cannot bind a non-lvalue as a reference parameter in Labster. (i.e. you have to bind a variable)");
        },
        paramCopyConstructor : function(src, type) {
            return makeError(src, false, "Cannot find a copy constructor to pass a parameter of type " + type + " by value.");
        },
        thisConst : function(src, type) {
            return makeError(src, false, "A non-const member function cannot be called on a const instance of the " + type + " class.");
        }
    },
    stmt : {
        declaration : function(src, decl){
            return makeError(src, false, "Sorry, this kind of declaration (" + decl.describe().message + ") is not allowed here.");
        },
        selection : {
            cond_bool : function(src, expr){
                return makeError(expr, false, "Expression of type (" + expr.type + ") cannot be converted to boolean condition.");
            }
        },
        iteration: {
            cond_bool : function(src, expr){
                return makeError(expr, false, "Expression of type (" + expr.type + ") cannot be converted to boolean condition.");
            }
        },
        _break: {
            location: function (src) {
                return makeError(src, false, "Break statements may only occur inside loops or case statements.");
            }
        },
        _return: {
            empty: function (src) {
                return makeError(src, false, "A return statement without an expression is only allowed in void functions.");
            },
            exprVoid: function (src) {
                return makeError(src, false, "A return statement with an expression of non-void type is only allowed in a non-void function.");
            },
            convert : function(src, from, to) {
                return makeError(src, false, "Cannot convert " + from + " to return type of " + to + " in return statement.");
            }
        },
        unsupported : function(src, statementName) {
            return makeError(src, false, "Sorry, you have used a statement " + statementName + " that is not currently supported.");
        }
    },
    link : {
       def_not_found : function(src, func){
           return makeError(src, false, "Cannot find definition for function " + func + ". That is, the function is declared and I know what it is, but I can't find the actual code that implements it.");
       }
    },
    lookup : {
        badLookup : function(src, name){
            name = Identifier.qualifiedNameString(name);
            return makeError(src, false, "Name lookup for \""+name+"\" was unsuccessful.)");
        },
        ambiguous : function(src, name){
            name = Identifier.qualifiedNameString(name);
            return makeError(src, false, "\""+name+"\" is ambiguous. (There is not enough contextual type information for name lookup to figure out which entity this identifier refers to.)");
        },
        no_match : function(src, name, paramTypes, isThisConst){
            name = Identifier.qualifiedNameString(name);
            return makeError(src, false, "No matching function found for call to \""+name+"\" with these parameter types (" +
            paramTypes.map(function(pt){
                return pt.toString();
            }).join(", ") +
            ")" + (isThisConst ? " made from const member function." : "."));
        },
        hidden : function(src, name){
            name = Identifier.qualifiedNameString(name);
            return makeError(src, false, "No matching function found for call to \""+name+"\" with these parameter types. (Actually, there is a match, but it is hidden by an entity of the same name in a nearer scope.)");
        },
        not_found : function(src, name){
            name = Identifier.qualifiedNameString(name);
            return makeError(src, false, "Cannot find declaration for \""+name+"\".");
        }
    }
};

CPPError.stmt.iteration.cond_bool = CPPError.stmt.selection.cond_bool;

var CPPNote = {
    attributeEmptyTo: function (problems, code) {
        for (var key in problems) {
            var prob = problems[key];
            prob.code = prob.code || code;
        }
    },
    summary: function (problems) {
        var str = "";
        for (var i = 0; i < problems.length; ++i) {
            var prob = problems[i];
            str += "<span style=\"background-color:" + prob.color + "\">" + prob.sentence + "</span><br />";
        }
        return str;
    },
    classDef: {
        prev_def: function (src, name, prev) {
            return makeError(src, false, name + " cannot be defined more than once. Note that Labster just puts all class names (i.e. types) in one global sort of namespace, so you can't ever have two classes of the same name.");
        }
    }
};

var SemanticExceptions = {};

var SemanticException = Class.extend({
    _name: "SemanticException"
});

SemanticExceptions.BadLookup = SemanticException.extend({
    _name: "BadLookup",
    init : function(scope, name){
        this.scope = scope;
        this.name = name;
    },
    annotation : function(src){
        return this.errorFunc(src, this.name);
    }

});

SemanticExceptions.Ambiguity = SemanticExceptions.BadLookup.extend({
    _name: "Ambiguity",
    errorFunc: CPPError.lookup.ambiguous
});

SemanticExceptions.NoMatch = SemanticExceptions.BadLookup.extend({
    _name: "Ambiguity",
    errorFunc: CPPError.lookup.no_match,
    init : function(scope, name, paramTypes, isThisConst){
        this.initParent(scope, name);
        this.paramTypes = paramTypes;
        this.isThisConst = isThisConst;
    },
    annotation : function(src){
        return this.errorFunc(src, this.name, this.paramTypes, this.isThisConst);
    }

});

SemanticExceptions.Hidden = SemanticExceptions.BadLookup.extend({
    _name: "Hidden",
    errorFunc: CPPError.lookup.hidden
});

SemanticExceptions.NotFound = SemanticExceptions.BadLookup.extend({
    _name: "NotFound",
    errorFunc: CPPError.lookup.not_found
});

SemanticExceptions.NoSuchMember = SemanticExceptions.BadLookup.extend({
    _name: "NoSuchMember",
    errorFunc: CPPError.lookup.not_found
});



SemanticExceptions.NonCovariantReturnTypes = SemanticException.extend({
    _name: "NonCovariantReturnTypes",
    init : function(overrider, overridden){
        this.overrider = overrider;
        this.overridden = overridden;
    },
    annotation : function(src){
        return CPPError.decl.func.nonCovariantReturnType(src, this.overrider.type.returnType, this.overridden.type.returnType);
    }

});



var checkIdentifier = function(src, iden, semanticProblems){
    if (Array.isArray(iden)){
        iden.forEach(function(elem){
            checkIdentifier(src, elem.identifier, semanticProblems);
        });
    }
    // Check that identifier is not a keyword or an alternative representation for an operator
    if (KEYWORDS.contains(iden)){
        semanticProblems.push(CPPError.iden.keyword(src, iden));
    }
    if (ALT_OPS.contains(iden)){
        semanticProblems.push(CPPError.iden.alt_op(src, iden));
    }
}