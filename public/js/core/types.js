
				
var vowels = ["a", "e", "i", "o", "u"];
var isVowel = function(c){
	return vowels.indexOf(c) != -1;
};

// REQUIRES: arr is an array
//           map is a function or an object dictionary
var arrayGroups = function(arr, map){
	groups = {};
	var isDict = !_.isFunction(map);
	for(var i = 0; i < arr.length; ++i){
		var elem = arr[i];
		var key = (map
			? (isDict ? map[elem] : map(elem))
			: elem);
		(groups[key] ? groups[key].push(elem) : groups[key] = [elem]);
	}
	
	// Fill in empty groups if it's a dictionary.
	if (isDict){
		for(var key in map){
			var group = map[key];
			groups[group] = groups[group] || [];
		}
	}
	
	return groups;
};

var TYPE_SPECIFIERS_GROUP_MAP = {
	"char" : "typeName",
	"short" : "typeName",
	"int" : "typeName",
	"bool" : "typeName",
	"long" : "typeName",
	"float" : "typeName",
	"double" : "typeName",
	"void" : "typeName",
	//"list_t" : "typeName",
	//"tree_t" : "typeName",
    "string" : "typeName",
	
	"signed" : "signed",
	"unsigned" : "unsigned",
	"const" : "const",
	"volatile" : "volatile",

    "register" : "storage",
    "static" : "storage",
    "thread_local" : "storage",
    "extern" : "storage",
    "mutable" : "storage"
	
};

var TYPE_SPECIFIERS_GROUP_FN = function(elem){
	if (elem.className){
		return "typeName";
	}
	else{
		return TYPE_SPECIFIERS_GROUP_MAP[elem];
	}
};


var TypeSpecifier = Lobster.TypeSpecifier = CPPCode.extend({
    _name: "TypeSpecifier",

//    init : function(code, context){
//        this.initParent(code, context);
//    },
    compile : function(scope){
//		var groups = arrayGroups(this.code, TYPE_SPECIFIERS_GROUP_MAP);
		
		var semanticProblems = this.semanticProblems;

        var constCount = 0;
        var volatileCount = 0;

        var specs = this.code;

        for(var i = 0; i < specs.length; ++i){
            var spec = specs[i];
            if(spec === "const"){
                if(this.isConst) {
                    semanticProblems.push(CPPError.type.const_once(this));
                }
                else{
                    this.isConst = true;
                }
            }
            else if(spec === "volatile"){
                if (this.volatile){
                    semanticProblems.push(CPPError.type.volatile_once(this));
                }
                else{
                    this.volatile = true;
                }
            }
            else if (spec === "unsigned"){
                if (this.unsigned){
                    semanticProblems.push(CPPError.type.unsigned_once(this));
                }
                else if (this.signed){
                    semanticProblems.push(CPPError.type.signed_unsigned(this));
                }
                else{
                    this.unsigned = true;
                }
            }
            else if (spec === "signed"){
                if (this.signed){
                    semanticProblems.push(CPPError.type.signed_once(this));
                }
                else if (this.unsigned){
                    semanticProblems.push(CPPError.type.signed_unsigned(this));
                }
                else{
                    this.signed = true;
                }
            }
            else{ // It's a typename
                if (this.typeName){
                    semanticProblems.push(CPPError.type.one_type(this));
                }
                else{
                    // TODO will need to look up the typename in scope to check it
                    this.typeName = spec;
                }
            }
        }

        // If we don't have a typeName by now, it means there wasn't a type specifier
        if (!this.typeName){
            semanticProblems.push(CPPError.decl.func.no_return_type(this));
            return semanticProblems;
        }

        if (this.unsigned){
            if (!this.typeName){
                this.typeName = "int";
            }
            semanticProblems.push(CPPError.type.unsigned_not_supported(this));
        }
        if (this.signed){
            if (!this.typeName){
                this.typeName = "int";
            }
        }
		
		if (this.typeName == "list_t"){
			this.type = Types.List_t.instance(this.isConst, this.isVolatile, this.isUnsigned, this.isSigned);
            return semanticProblems;
		}

		if (this.typeName == "tree_t"){
			this.type = Types.Tree_t.instance(this.isConst, this.isVolatile, this.isUnsigned, this.isSigned);
            return semanticProblems;
		}

        // NOTE: HARDCODED TYPEDEFS GO HERE

        //if (this.typeName == "Chicken"){
        //    this.type = Types.Pointer.instance(Types.Function.instance(Types.Void.instance(), [Types.Pointer.instance(Types.Int.instance()), Types.Int.instance()]));
        //    this.type.type = "Chicken";
        //    this.type.typeString = Types.SimpleType.typeString;
        //    this.type.englishString = Types.SimpleType.englishString;
        //    return semanticProblems;
        //}

        if (Types.builtInTypes[this.typeName]){
			this.type = Types.builtInTypes[this.typeName].instance(this.isConst, this.isVolatile, this.isUnsigned, this.isSigned);
            return semanticProblems;
		}

        var scopeType;
        if (scopeType = scope.lookup(this.typeName)){
            if (isA(scopeType, TypeEntity)){
                this.type = scopeType.type.instance(this.isConst, this.isVolatile, this.isUnsigned, this.isSigned);
                return semanticProblems;
            }
        }

        this.type = Types.Unknown.instance();
        semanticProblems.push(CPPError.type.typeNotFound(this, this.typeName));
        return semanticProblems;

	}
});



var Types = Lobster.Types = {
    maxSize : 0,
    userTypeNames : {},
    builtInTypes : {},
    defaultUserTypeNames : {
        list_t : true,
        tree_t : true,
        Rank : true,
        Suit : true,
        ostream : true
    }
};

var sameType = function(type1, type2){
    return type1 && type2 && type1.sameType(type2);
};

var similarType = function(type1, type2){
    return type1 && type2 && type1.similarType(type2);
};

// TODO subType function is dangerous :(
var subType = function(type1, type2){
    return isA(type1, Types.Class) && isA(type2, Types.Class) && type1.isDerivedFrom(type2);
};

var covariantType = function(derived, base){
    if (sameType(derived, base)){
        return true;
    }

    var dc;
    var bc;
    if (isA(derived, Types.Pointer) && isA(base, Types.Pointer)){
        dc = derived.ptrTo;
        bc = base.ptrTo;
    }
    else if (isA(derived, Types.Reference) && isA(base, Types.Reference)){
        dc = derived.refTo;
        bc = base.refTo;
    }
    else{
        return false; // not both pointers or both references
    }

    // Must be pointers or references to class type
    if (!isA(dc, Types.Class) || !isA(bc, Types.Class)){
        return false;
    }

    // dc must be derived from bc
    if (!dc.isDerivedFrom(bc)){
        return false;
    }

    // Pointers/References must have the same cv-qualification
    if (derived.isConst != base.isConst || derived.isVolatile != base.isVolatile){
        return false;
    }

    // dc must have same or less cv-qualification as bc
    if (dc.isConst && !bc.isConst || dc.isVolatile && !bc.isVolatile){
        return false;
    }

    // Yay we made it!
    return true;
};

var referenceCompatible = function(type1, type2){
    return type1 && type2 && type1.isReferenceCompatible(type2);
};

var noRef = function(type){
    if(isA(type, Types.Reference)){
        return type.refTo;
    }
    else{
        return type;
    }
};

var isCvConvertible = function(t1, t2){

    // t1 and t2 must be similar
    if (!similarType(t1,t2)){ return false; }

    // Discard 0th level of cv-qualification signatures, we don't care about them.
    // (It's essentially a value semantics thing, we're making a copy so top level const doesn't matter.)
    t1 = t1.compoundNext;
    t2 = t2.compoundNext;

    // check that t2 has const everywhere that t1 does
    // also if we ever find a difference, t2 needs const everywhere leading
    // up to it (but not including) (and not including discarded 0th level).
    var t2AllConst = true;
    while(t1 && t2){ //similar so they should run out at same time
        if (t1.isConst && !t2.isConst){
            return false;
        }
        else if (!t1.isConst && t2.isConst && !t2AllConst){
            return false;
        }

        // Update allConst
        t2AllConst = t2AllConst && t2.isConst;
        t1 = t1.compoundNext;
        t2 = t2.compoundNext;
    }

    // If no violations, t1 is convertable to t2
    return true;
};

var Type = Lobster.Types.Type = Class.extend({
    _name: "Type",
    size: Class._ABSTRACT,
    isObjectType : true,
    _cv : "",
    // Default instance properties
    compoundNext : null,

    init: function (isConst, isVolatile) {
        if (this.size > Types.maxSize){
            Types.maxSize = this.size;
        }
        this.isConst = isConst || false;
        // ignore volatile completely for now (and perhaps forever lol)
        this.isVolatile = false;// isVolatile || false;
        this._cv = ""+(this.isConst ? "const " : "") + (this.isVolatile ? "volatile " : "");
        return this;
    },

    describe : function(){
        var str = this.instanceString();
        return {name: str, message: str};
    },
    instanceString: function(){
        return this.typeString(false, "");
    },
    typeString : Class._ABSTRACT,
    englishString : Class._ABSTRACT,
    valueToString : Class._ABSTRACT,
    coutString : function(value){
        return this.valueToString(value);
    },
    declaratorString : function(varname){
        return this.typeString(true, varname);
    },
    isCVQualified : function() {
        return this.isConst || this.isVolatile;
    },
    sameType : Class._ABSTRACT,
    similarType : Class._ABSTRACT,

    bytesToValue : function(bytes){
        //TODO: this is a hack for now.
        return bytes[0];
    },
    valueToBytes : function(value){
        var bytes = [];
        bytes[0] = value;
        for(var i = 1; i < this.size-1; ++i){
            bytes.push(0);
        }
        return bytes;
    },
    isValueValid : function(value){
        return true;
    },
    precedence : Class._ABSTRACT,
    parenthesize : function(outside, str){
        return this.precedence < outside.precedence ? "(" + str + ")" : str;
    },
    isArithmetic : false,
    _isComplete: false,
    isComplete : function(){
        return !!this._isComplete;
    },
    cvUnqualified : function(){
        if (!this.isConst && !this.isVolatile){
            return this;
        }
        else{
            return this.proxy({
                isConst: false,
                isVolatile: false
            }, false);
        }
    },
    cvQualified : function(isConst, isVolatile){
        if (this.isConst == isConst && this.isVolatile == isVolatile){
            return this;
        }
        else{
            return this.proxy({
                isConst: isConst,
                isVolatile: isVolatile
            }, false);
        }
    },
    isReferenceRelated : function(other){
        return sameType(this.cvUnqualified(), other.cvUnqualified()) ||
            subType(this.cvUnqualified(),other.cvUnqualified());
    },
    isReferenceCompatible : function(other){
        return this.isReferenceRelated(other) && other && (other.isConst || !this.isConst) && (other.isVolatile || !this.isVolatile);

    }
});

// REQUIRES: type must be one of "int", "double", "bool", "char"
Lobster.Types.SimpleType = Type.extend({
    _name: "SimpleType",
    precedence: 0,
    type: Class._ABSTRACT,
    _isComplete: true,
    init: function(isConst, isVolatile, isUnsigned, isSigned) {
        this.initParent(isConst, isVolatile);
        this.isUnsigned = isUnsigned;
        this.isSigned = isSigned;
        return this;
    },
    sameType : function(other){
        return other && other.isA(Types.SimpleType)
            && other.type === this.type
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    },
    similarType : function(other){
        return other && other.isA(Types.SimpleType)
            && other.type === this.type;
    },
	typeString : function(excludeBase, varname, decorated){
        if (excludeBase) {
            return varname ? varname : "";
        }
        else{
            return this._cv + (decorated ? htmlDecoratedType(this.type) : this.type) + (varname ? " " + varname : "");
        }
	},
	englishString : function(plural){
		// no recursive calls to this.type.englishString() here
		// because this.type is just a string representing the type
        var word = this._cv + this.type;
		return (plural ? this.type+"s" : (isVowel(word.charAt(0)) ? "an " : "a ") + word);
	},
	valueToString : function(value){
		return ""+value;
	}
});

Types.builtInTypes["unknown"] =
Lobster.Types.Unknown = Types.SimpleType.extend({
    _name: "UnknownType",
    type: "unknown",
    isObjectType: false,
    size: 4,
    init: function(isConst, isVolatile){
        this.initParent(isConst, isVolatile);
        return this;
    }
});

Types.builtInTypes["void"] =
Lobster.Types.Void = Types.SimpleType.extend({
    _name: "Void",
    type: "void",
    isObjectType: false,
    size: 0,
    init: function(isConst, isVolatile){
        this.initParent(isConst, isVolatile);
        return this;
    }
});

Types.builtInTypes["char"] =
Lobster.Types.Char = Types.SimpleType.extend({
    _name: "Char",
    type: "char",
    size: 1,
    isArithmetic: true,
    isIntegral: true,
    init: function(isConst, isVolatile){
        this.initParent(isConst, isVolatile);
        return this;
    },
    valueToString : function(value){
        return "'" + unescapeString(String.fromCharCode(value)) + "'";//""+value;
    },
    coutString : function(value){
        return String.fromCharCode(value);
    }
});

Types.builtInTypes["int"] =
Lobster.Types.Int = Types.SimpleType.extend({
    _name: "Int",
    type: "int",
    size: 4,
    isArithmetic: true,
    isIntegral: true,
    init: function(isConst, isVolatile){
        this.initParent(isConst, isVolatile);
        return this;
    }
});

Types.builtInTypes["float"] =
    Lobster.Types.Float = Types.SimpleType.extend({
    _name: "Float",
    type: "float",
    size: 4,
    isArithmetic: true,
    isFloatingPoint: true,
    init: function (isConst, isVolatile) {
        this.initParent(isConst, isVolatile);
        return this;
    },
    valueToString : function(value){
        var str = ""+value;
        return str.indexOf(".") != -1 ? str : str + ".";
    }
});

Types.builtInTypes["double"] =
    Lobster.Types.Double = Types.SimpleType.extend({
    _name: "Double",
    type: "double",
    size: 8,
    isArithmetic: true,
    isFloatingPoint: true,
    init: function (isConst, isVolatile) {
        this.initParent(isConst, isVolatile);
        return this;
    },
    valueToString : function(value){
        var str = ""+value;
        return str.indexOf(".") != -1 ? str : str + ".";
    }
});

Types.builtInTypes["bool"] =
    Lobster.Types.Bool = Types.SimpleType.extend({
    _name: "Bool",
    type: "bool",
    size: 1,
    isArithmetic: true,
    isIntegral: true,
    init: function (isConst, isVolatile) {
        this.initParent(isConst, isVolatile);
    },
    bytesToValue : function(bytes){
        return (bytes[0] ? true : false);
    }
    //valueToString : function(value){
    //    return value ? "T" : "F";
    //}
});

Types.builtInTypes["string"] =
    Lobster.Types.String = Types.SimpleType.extend({
    _name: "String",
    type: "string",
    size: 4,
    defaultValue: "",
    init: function (isConst, isVolatile) {
        this.initParent(isConst, isVolatile);
    },
    valueToString : function(value){
        value = value.replace(/\n/g,"\\n");
        return '"' + value + '"';
    },
    coutString : function(value){
        return value;
    },
    bytesToValue : function(bytes){
        return ""+bytes[0];
    }
});

Lobster.Types.Enum = Types.SimpleType.extend({
    _name: "Enum",
    size: 4,
    isArithmetic: true,
    isIntegral: true,
    extend: function(){

        var sub = Types.SimpleType.extend.apply(this, arguments);
        assert(sub.values);
        sub.valueMap = {};
        for(var i = 0; i < sub.values.length; ++i) {
            sub.valueMap[sub.values[i]] = i;
        }

        return sub;
    },
    valueToString : function(value){
        return this.values[value];
    }
});

Types.builtInTypes["rank"] =
    Lobster.Types.Rank = Types.Enum.extend({
    type: "Rank",
    values: ["TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "JACK", "QUEEN", "KING", "ACE"]
});

Types.builtInTypes["suit"] =
    Lobster.Types.Suit = Types.Enum.extend({
    type: "Suit",
    values: ["SPADES", "HEARTS", "CLUBS", "DIAMONDS"]
});




Types.builtInTypes["list_t"] =
    Lobster.Types.List_t = Types.SimpleType.extend({
    _name: "List_t",
    type: "list_t",
    size: 4,
    init: function(isConst, isVolatile){
        this.initParent(isConst, isVolatile);
    },
    valueToString : function(value){
        return JSON.stringify(value);
    },
    bytesToValue : function(bytes){
        //TODO: this is a hack for now.
        return Array.isArray(bytes[0]) ? bytes[0] : [];
    }
});

//TODO haha I know of a much more efficient solution for this
var breadthFirstTree = function(tree){
    if (!tree || tree.elt === undefined){
        return ".";
    }
    var queue = [{tree: tree, row: 0, col: 0}];
    var lines = [];
    var minLeft = 0;
    var minRight = 0;
    while (queue.length > 0){
        var next = queue.pop();
        if (next.tree.elt === undefined){
            continue; // ignore empty trees
        }

        //is it a new line?
        if (lines.length <= next.row){
            lines.push({str:"", left:next.col});
            if (next.col < minLeft){
                minLeft = next.col;
            }
        }

        var line = lines[next.row];
        // add spaces to line until we get to next elt to be printed
        while (line.left + line.str.length < next.col){
            line.str += " ";
        }
        line.str += next.tree.elt; // print elt

        var left = next.tree.left;
        var right = next.tree.right;
        if (left){
            left = {tree: left, row: next.row+1, col: next.col-1};
            queue.unshift(left);
        }
        if (right){
            right = {tree: right, row: next.row+1, col: next.col+1};
            queue.unshift(right);
        }
    }

    //Adjust left sides. record max length to adjust right side
    var maxLength = 0;
    for(var i = 0; i < lines.length; ++i){
        var line = lines[i];
        for(var j = 0; j < line.left - minLeft; ++j){
            line.str = " " + line.str;
        }
        if (line.str.length > maxLength){
            maxLength = line.str.length;
        }
    }

    // Adjust right sides, which is just adjusting length since left is already done.
    for(var i = 0; i < lines.length; ++i){
        var line = lines[i];
        while (line.str.length < maxLength){
            line.str += " ";
        }
    }


    var str = "";
    for(var i = 0; i < lines.length; ++i){
        str += lines[i].str;
        str += "\n";
    }
    return str;
};

Types.builtInTypes["tree_t"] =
    Lobster.Types.Tree_t = Types.SimpleType.extend({
    _name: "Tree_t",
    type: "tree_t",
    size: 4,

    //depth: function(tree){
    //    var leftDepth = tree.left ? Types.Tree_t.depth(tree.left) : 0;
    //    var rightDepth = tree.right ? Types.Tree_t.depth(tree.right) : 0;
    //    var depth = tree.elt ? 1 : 0;
    //    depth += (leftDepth > rightDepth ? leftDepth : rightDepth);
    //    return depth;
    //},

    init: function(isConst, isVolatile){
        this.initParent(isConst, isVolatile);
    },
    valueToString : function(value){
        //if (value.left){
        //    return "{" + this.valueToString(value.left) + " " + value.elt + " " + this.valueToString(value.right) + "}";
        //}
        //else{
        //    return "{}";
        //}
        return breadthFirstTree(value);
    },
    bytesToValue : function(bytes){
        return typeof bytes[0] === "object" ? bytes[0] : {};
    }
});

Types.builtInTypes["ostream"] =
Lobster.Types.OStream = Types.SimpleType.extend({
    _name: "OStream",
    type: "ostream",
    size: 4,
    init: function(isConst, isVolatile){
        this.initParent(isConst, isVolatile);
    },
    valueToString : function(value){
        return JSON.stringify(value);
    }
});

Lobster.Types.IStream = Types.SimpleType.extend({
    _name: "iStream",
    type: "istream",
    size: 4,
    init: function(isConst, isVolatile){
        this.initParent(isConst, isVolatile);
    },
    valueToString : function(value){
        return JSON.stringify(value);
    }
});

// REQUIRES: ptrTo must be a type
Lobster.Types.Pointer = Type.extend({
    _name: "Pointer",
    size: 8,
    precedence: 1,
    _isComplete: true,

    isNull : function(value){
        return value === 0;
    },
    isNegative : function(value){
        return value < 0;
    },

    init: function(ptrTo, isConst, isVolatile){
        this.initParent(isConst, isVolatile);
        this.compoundNext = this.ptrTo = ptrTo;
        this.funcPtr = isA(this.ptrTo, Types.Function);
        return this;
    },
    sameType : function(other){
        return other && other.isA(Types.Pointer)
            && this.ptrTo.sameType(other.ptrTo)
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    },
    similarType : function(other){
        return other && other.isA(Types.Pointer)
            && this.ptrTo.similarType(other.ptrTo);
    },
    typeString : function(excludeBase, varname){
        return this.ptrTo.typeString(excludeBase, this.parenthesize(this.ptrTo, this._cv + "*" + varname));
    },
    englishString : function(plural){
        return (plural ? this._cv+"pointers to" : "a " +this._cv+"pointer to") + " " + this.ptrTo.englishString();
    },
    valueToString : function(value){
        if (isA(this.ptrTo, Types.Function) && value) {
            return value.name;
        }
        else{
            return "0x" + value;
        }
    }
});

Lobster.Types.ArrayPointer = Types.Pointer.extend({
    _name: "ArrayPointer",
    size: 8,
    precedence: 1,

    init: function(arrObj, isConst, isVolatile){
        this.initParent(arrObj.type.elemType, isConst, isVolatile);
        this.arrObj = arrObj;
    },
    getArrayObject : function(){
        return this.arrObj;
    },
    valueToString : function(value){
        return "0x" + value;
    },
    min : function(){
        return this.arrObj.address;
    },
    onePast : function(){
        return this.arrObj.address + this.arrObj.type.properSize;
    },
    isValueValid : function(value){
        if (!this.arrObj.isAlive()){
            return false;
        }
        var arrObj = this.arrObj;
        return arrObj.address <= value && value <= arrObj.address + arrObj.type.properSize;
    },
    toIndex : function(addr){
        return integerDivision(addr - this.arrObj.address, this.arrObj.type.elemType.size);
    }

});

Lobster.Types.ObjectPointer = Types.Pointer.extend({
    _name: "ObjectPointer",

    init: function(obj, isConst, isVolatile){
        this.initParent(obj.type, isConst, isVolatile);
        this.obj = obj;
    },
    getPointedObject : function(){
        return this.obj;
    },
    valueToString : function(value){
        //if (this.obj.name){
        //    return "0x" + value;
        //}
        //else{
            return "0x" + value;
        //}
    },
    isValueValid : function(value){
        return this.obj.isAlive() && this.obj.address === value;
    }

});


// REQUIRES: refTo must be a type
Lobster.Types.Reference = Type.extend({
    _name: "Reference",
    isObjectType: false,
    precedence: 1,
    _isComplete: true,

    init: function(refTo, isConst, isVolatile){
        // References have no notion of const (they can't be re-bound anyway)
        this.initParent(false, isVolatile);
        this.refTo = refTo;
        this.size = this.refTo.size;
        return this;
    },
    sameType : function(other){
        return other && other.isA(Types.Reference) && this.refTo.sameType(other.refTo);
    },
    //Note: I don't think similar types even make sense with references. See spec 4.4
    similarType : function(other){
        return other && other.isA(Types.Reference) && this.refTo.similarType(other.refTo);
    },
    typeString : function(excludeBase, varname){
		return this.refTo.typeString(excludeBase, this.parenthesize(this.refTo, this._cv + "&" + varname));
	},
	englishString : function(plural){
		return this._cv + (plural ? "references to" : "a reference to") + " " + this.refTo.englishString();
	},
	valueToString : function(value){
		return ""+value;
	}
});


// REQUIRES: elemType must be a type
Lobster.Types.Array = Type.extend({
    _name: "Array",
    precedence: 2,
    _isComplete: true, // Assume complete. If length is unknown, individual Array types set to false
    init: function(elemType, length, isConst, isVolatile){

        if (length === undefined){
            this._isComplete = false;
        }

        // Set size before initParent since that assumes size is what it should be when it runs
        this.properSize = elemType.size * length;
        this.size = Math.max(1, this.properSize);

        this.initParent(elemType.isConst, elemType.isVolatile);
        this.compoundNext = this.elemType = elemType;
        this.length = length;
        return this;
    },
    setLength : function(length){
        this.length = length;
        this.properSize = this.elemType.size * length;
        this.size = Math.max(1, this.properSize);
        if (this.size > Types.maxSize){
            Types.maxSize = this.size;
        }
    },
    sameType : function(other){
        return other && other.isA(Types.Array) && this.elemType.sameType(other.elemType) && this.length === other.length;
    },
    similarType : function(other){
        return other && other.isA(Types.Array) && this.elemType.similarType(other.elemType) && this.length === other.length;
    },
    typeString : function(excludeBase, varname){
		return this.elemType.typeString(excludeBase, varname +  "["+(this.length !== undefined ? this.length : "")+"]");
	},
	englishString : function(plural){
		return (plural ? "arrays of " : "an array of ") + this.length + " " + this.elemType.englishString(this.length > 1);
	},
	valueToString : function(value){
		return ""+value;
	},
    bytesToValue : function(bytes){
        var arr = [];
        var elemSize = this.elemType.size;
        for(var i = 0; i < bytes.length; i += elemSize){
            arr.push(this.elemType.bytesToValue(bytes.slice(i, i + elemSize)));
        }
        return arr;
    },
    valueToBytes : function(value){
        var bytes = [];
        for(var i = 0; i < value.length; ++i){
            bytes.pushAll(this.elemType.valueToBytes(value[i]));
        }
        return bytes;
    }
});



// REQUIRES: elemType must be a type
Lobster.Types.Class = Type.extend({
    _name: "Class",
    precedence: 0,
    className: Class._ABSTRACT,

    extend: function(){
        var sub = Type.extend.apply(this, arguments);
        sub.scope = sub.scope; // TODO does this do anything? I think it actually makes the class have it's own version of the scope instead of an alias
        sub.members = sub.members || [];
        sub.objectMembers = [];
        sub.constructors = [];
        sub.destructor = null;
        // Set size before initParent since that assumes size is what it should be when it runs
        sub.size = 0;
        sub.memberMap = {};
        if (sub.base === undefined){
            delete sub.base;
        }


        //this.type = Types.Class.extend({
        //    _name: this.name,
        //    className: this.name,
        //    members: [],
        //    scope: this.scope,
        //    base: this.base
        //});
        if (sub.base){
            sub.baseSubobjects = [BaseClassSubobjectEntity.instance(sub.base, this, "public")];
            sub.size += sub.base.size;
        }
        else{
            sub.baseSubobjects = [];
        }

        for(var i = 0; i < sub.members.length; ++i) {
            var mem = sub.members[i];
            sub.memberMap[mem.name] = mem;
            if(mem.type.isObjectType){
                sub.size += mem.type.size;
                mem.memberIndex = sub.objectMembers.length;
                sub.objectMembers.push(mem);
            }
        }
        if (sub.size === 0){
            sub.size = 1;
            sub.reallyZeroSize = true;
        }

        sub.subobjects = sub.baseSubobjects.concat(sub.objectMembers);

        return sub;
    },

    init: function(isConst, isVolatile){

        this.initParent(isConst, isVolatile);
        return this;
    },
    sameType : function(other){
        //alert(other && other.isA(this._class));
        return other && other.isA(this._class)
            && other.isConst === this.isConst
            && other.isVolatile === this.isVolatile;
    },
    similarType : function(other){
        //alert(other && other.isA(this._class));
        return other && other.isA(this._class);
    },
    classString : function(){
        return this.className;
    },
    typeString : function(excludeBase, varname, decorated){
        if (excludeBase) {
            return varname ? varname : "";
        }
        else{
            return this._cv + (decorated ? htmlDecoratedType(this.className) : this.className) + (varname ? " " + varname : "");
        }
    },
    englishString : function(plural){
        // no recursive calls to this.type.englishString() here
        // because this.type is just a string representing the type
        return this._cv + (plural ? this.className+"s" : (isVowel(this.className.charAt(0)) ? "an " : "a ") + this.className);
    },
    valueToString : function(value){
        return JSON.stringify(value, null, 2);
    },
    bytesToValue : function(bytes){
        var val = {};
        var b = 0;
        for(var i = 0; i < this.objectMembers.length; ++i) {
            var mem = this.objectMembers[i];
            val[mem.name] = mem.type.bytesToValue(bytes.slice(b, b + mem.type.size));
            b += mem.type.size;
        }
        return val;
    },
    valueToBytes : function(value){
        var bytes = [];
        for(var i = 0; i < this.objectMembers.length; ++i) {
            var mem = this.objectMembers[i];
            bytes.pushAll(mem.type.valueToBytes(value[mem.name]));
        }
        return bytes;
    },
    addMember : function(mem){
        assert(this._isClass);
        this.members.push(mem);
        this.memberMap[mem.name] = mem;
        if(mem.type.isObjectType){
            if (this.reallyZeroSize){
                this.size = 0;
                delete this.reallyZeroSize;
            }
            mem.memberIndex = this.objectMembers.length;
            this.objectMembers.push(mem);
            this.subobjects.push(mem);
            this.size += mem.type.size;
        }
    },
    addConstructor : function(con){
        this.constructors.push(con);
    },
    addDestructor : function(con){
        this.destructor = con;
    },
    getDestructor : function(){
        return this.scope.singleLookup("~"+this.className, {own:true, noBase:true});
    },
    getDefaultConstructor : function(scope){
        return this.scope.singleLookup(this.className+"\0", {
            own:true, noBase:true, exactMatch:true,
            paramTypes:[]});
    },
    getCopyConstructor : function(scope, requireConst){
        return this.scope.singleLookup(this.className+"\0", {
            own:true, noBase:true, exactMatch:true,
            paramTypes:[Types.Reference.instance(this.instance(true))]}) ||
            !requireConst &&
            this.scope.singleLookup(this.className+"\0", {
                own:true, noBase:true, exactMatch:true,
                paramTypes:[Types.Reference.instance(this.instance(false))]});
    },
    getAssignmentOperator : function(requireConst, isThisConst){
        return this.scope.singleLookup("operator=", {
            own:true, noBase:true, exactMatch:true,
            paramTypes:[this.instance()]}) ||
        this.scope.singleLookup("operator=", {
            own:true, noBase:true, exactMatch:true,
            paramTypes:[Types.Reference.instance(this.instance(true))]}) ||
            !requireConst &&
            this.scope.singleLookup("operator=", {
                own:true, noBase:true, exactMatch:true,
                paramTypes:[Types.Reference.instance(this.instance(false))]})

    },

    hasMember : function(name){
        return this.memberMap.hasOwnProperty(name);
    },
    /**
     *
     * @param name is a string
     */
    isDerivedFrom : function(potentialBase){
        var b = this.base;
        while(b){
            if (isA(potentialBase, b)){
                return true;
            }
            b = b.base;
        }
        return false;
    },
    isComplete : function(){
        return !!(this._isComplete || this._isTemporarilyComplete);
    },
    setTemporarilyComplete : function(){
        this._isTemporarilyComplete = true;
    },
    unsetTemporarilyComplete : function(){
        delete this._isTemporarilyComplete;
    }
});

//Lobster.Types.Card = Types.Class.extend({
//    _name: "Card",
//    className: "Card",
//    members: [
//        {name: "rank", type: Types.Rank.instance()},
//        {name: "suit", type: Types.Suit.instance()}
//    ]
//});
//
//Lobster.Types.Pack = Types.Class.extend({
//    _name: "Pack",
//    className: "Pack",
//    members: [
//        {name: "cards", type: Types.Array.instance(Types.Card.instance(),24)},
//        {name: "next", type: Types.Pointer.instance(Types.Card.instance())}
//    ]
//});
//
//Lobster.Types.Player = Types.Class.extend({
//    _name: "Player",
//    className: "Player",
//    members: [
//        {name: "name", type: Types.Array.instance(Types.Char.instance(),10)},
//        {name: "hand", type: Types.Array.instance(Types.Card.instance(),5)},
//        {name: "hand_size", type: Types.Int.instance()}
//    ]
//});
//
//
//
//Lobster.Types.Basket = Types.Class.extend({
//    _name: "Basket",
//    className: "Basket",
//    members: [
//        {name: "fruits", type: Types.Pointer.instance(Types.String.instance())},
//        {name: "num_fruits", type: Types.Int.instance()}
//    ]
//});
//
//
//Lobster.Types.Quote = Types.Class.extend({
//    _name: "Quote",
//    className: "Quote",
//    members: [
//        {name: "price", type: Types.Double.instance()},
//        {name: "time", type: Types.Int.instance()}
//    ]
//});
//Lobster.Types.Pricebook = Types.Class.extend({
//    _name: "Pricebook",
//    className: "Pricebook",
//    members: [
//        {name: "quotes", type: Types.Array.instance(Types.Quote.instance(), 5)},
//        {name: "size", type: Types.Int.instance()}
//    ]
//});

// REQUIRES: returnType must be a type
//           argTypes must be an array of types
Lobster.Types.Function = Type.extend({
    _name: "Function",
    isObjectType: false,
    precedence: 2,
    size: 0,
    init: function(returnType, paramTypes, isConst, isVolatile, isThisConst){
        this.initParent(isConst, isVolatile);

        if (isThisConst){
            this.isThisConst = true;
        }
        // Top-level const on return type is ignored for non-class types
        // (It's a value semantics thing.)
        // TODO not for poitners/refrences
        if(!(isA(returnType, Types.Class) || isA(returnType, Types.Pointer) || isA(returnType, Types.Reference))){
            this.returnType = returnType.cvUnqualified();
        }
        else{
            this.returnType = returnType;
        }

        this.paramTypes = paramTypes.map(function(ptype){
            return isA(ptype, Types.Class) ? ptype : ptype.cvUnqualified();
        });
        // Top-level const on parameter types is ignored for non-class types



        this.isFunction = true;

        this.paramStrType = "(";
        for (var i = 0; i < paramTypes.length; ++i){
            this.paramStrType += (i == 0 ? "" : ",") + paramTypes[i];
        }
        this.paramStrType += ")";

        this.paramStrEnglish = "(";
        for (var i = 0; i < paramTypes.length; ++i){
            this.paramStrEnglish += (i == 0 ? "" : ", ") + paramTypes[i].englishString();
        }
        this.paramStrEnglish += ")";
        return this;
    },
    sameType : function(other){
        if (!other){
            return false;
        }
        if (!other.isA(Types.Function)){
            return false;
        }
        if (!this.sameReturnType(other)){
            return false;
        }
        if (!this.sameParamTypes(other)){
            return false;
        }
        return true;
    },
    similarType : function(other){
        return this.sameType(other);
    },
    sameParamTypes : function(other){
        if (isA(other, Types.Function)){
            return this.sameParamTypes(other.paramTypes);
        }
        if (this.paramTypes.length !== other.length){
            return false;
        }
        for(var i = 0; i < this.paramTypes.length; ++i){
            if (!this.paramTypes[i].sameType(other[i])){
                return false;
            }
        }
        return true;
    },
    sameReturnType : function(other){
        return this.returnType.sameType(other.returnType);
    },
    typeString : function(excludeBase, varname){
		return this.returnType.typeString(excludeBase, varname + this.paramStrType);
	},
	englishString : function(plural){
		return (plural ? "functions that take " : "a function that takes ") + this.paramStrEnglish + " " +
			   (plural ? "and return " : "and returns ") + this.returnType.englishString();
	},
	valueToString : function(value){
		return ""+value;
	}
});











// kind will be one of either "pointer" ""
// Lobster.Type = function(kind, sub) {
	// this.kind = kind;
	// this.sub = sub;
	// this.typeSpec = typeSpec;
	// this.declarator = declarator;
// 	
	// this.size = 4; //TODO hack for now, fix later (shouldn't be constant)
// 	
	// this.semanticProblems = [];
// };
// var Type = Lobster.Type;
// Type.prototype = {
// 	
	// compile : function(scope){
// 		
		// var semanticProblems = this.semanticProblems;
// 		
		// var typeSpec = this.typeSpec;
		// var declarator = this.declarator;
// 		
		// // Determine base type (i.e. what do we have to store?)
		// this.baseType = declarator.baseType || typeSpec.typeName;
// 		
		// var str = this.declarator.sentence;
		// if (this.declarator.plural){
			// str += this.typeSpec.sentence + "s";
		// }
		// else{
			// str += (isVowel(this.typeSpec.sentence.charAt(0)) ? "an " : "a ") + this.typeSpec.sentence;
		// }
// 		
		// this.sentence = str;
		// return semanticProblems; // TODO add more semantic checking to this
	// },
	// isFunction : function(){
		// return this.baseType == "function";
	// },
	// toString : function(){
		// return this.sentence;
	// }
// }





// hack to make sure I don't mess up capitalization
// TODO wtf were you thinking please remove this
for (var key in Types){
    Types[key.toLowerCase()] = Types[key];
    delete Types["string"];
}