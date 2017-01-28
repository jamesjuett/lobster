var UMichEBooks = UMichEBooks || {};

// POLYFILLS ------------------------
// Extra methods for Array

if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
}
if (!Array.prototype.contains){
    Array.prototype.contains = function(elem){
        return this.indexOf(elem) != -1;
    };
}
if (!Array.prototype.remove){
    Array.prototype.remove = function (elem) {
        var index = this.indexOf(elem);
        if (index >= 0){
            this.splice(index, 1);
            return true;
        }
        else{
            return false;
        }
    };
}
if (!Array.prototype.pushAll){
    Array.prototype.pushAll = function (arr) {
        arr.forEach(function(elem) {this.push(elem);}, this);
        return this;
    };
}
if (!Array.prototype.unshiftAll){
    Array.prototype.unshiftAll = function (arr) {
        arr.forEach(function(elem) {this.unshift(elem);}, this);
        return this;
    };
}
if (!Array.prototype.clone){
    Array.prototype.clone = function() {
        return this.slice(0);
    };
}
if (!Array.prototype.clear){
    Array.prototype.clear = function() {
        this.length = 0;
    };
}
if (!Array.prototype.randomElement){
    Array.prototype.randomElement = function () {
        return this[Math.floor(Math.random() * this.length)];
    };
}

if ( !String.prototype.contains ) {
    String.prototype.contains = function() {
        return String.prototype.indexOf.apply( this, arguments ) !== -1;
    };
}

var zip = function(arr1,arr2,callback){
    var result = [];
    for(var i = 0; i < arr1.length; ++i){
        result.push(callback(arr1[i],arr2[i],i,arr1,arr2));
    }
    return result;
};



// Extra methods for String
String.prototype.repeat = function(count) {
    if (count < 1) return '';
    var result = '', pattern = this.valueOf();
    while (count > 0) {
        if (count & 1) result += pattern;
        count >>= 1, pattern += pattern;
    }
    return result;
};

String.isString = String.isString || function(obj){
        return typeof obj == 'string' || obj instanceof String;
    };

if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(searchString, position) {
        var subjectString = this.toString();
        if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
            position = subjectString.length;
        }
        position -= searchString.length;
        var lastIndex = subjectString.lastIndexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
    };
}

// END POLYFILLS -----------------------------------

function debug(message, category){
    if (category){
        console.log(category + ": " + message);
        $(".debug."+category).html(""+message); //""+ is to force conversion to string (via .toString if object)
    }
    else{
        console.log(message);
        $(".debug.debugAll").html(""+message); //""+ is to force conversion to string (via .toString if object)
    }
}

var assert = function(condition, message) {
    if (!condition)
        throw Error("Assert failed" + (typeof message !== "undefined" ? ": " + message : "."));
};


var mixin = function(args){
    var dest = arguments[0];
    assert(dest && typeof dest === "object", "Mixin destination must be an object.");
    var allowCollisions = false;
    // Last argument may be a boolean to indicate whether we allow name collisions
    var argLen = arguments.length;
    assert(arguments.length > 1, "Not enough arguments for mixin.");
    if (typeof arguments[argLen - 1] === "boolean"){
        allowCollisions = arguments[argLen - 1] || false;
        --argLen; // don't include the last one when processing additions
        assert(argLen > 1, "Not enough arguments for mixin.");
    }

    // Iterate through all additions and copy properties to destination
    for(var i = 1; i < argLen; ++i){
        var add = arguments[i];
//        if(!add){
//            continue; // skip empty mixins
//        }
        assert(add && typeof add === "object", "Mixin source must be an object.");
        for (var name in add) {
            if (add.hasOwnProperty(name)) {
                allowCollisions || assert(!dest.hasOwnProperty(name), "Name collision (\"" + name + "\") when creating class.");
                dest[name] = add[name];
            }
        }
    }

    return dest;
};

var makeDefaulted = function(obj, defaults){
    return mixin({}, defaults || {}, obj || {}, true);
};

var copyMixin = function(obj, add){
    return mixin({}, obj || {}, add || {}, true);
};


var isA = function(someObject, someClass){
    return someObject && someClass && (someClass.isPrototypeOf(someObject) || someClass === someObject);
};

var Class = {}; // Init with empty object quiets annoying warning.
(function(){

//    var makeReadOnlyGetter = function(me, name){
////        alert("making RO getter for " + name);
//        return function() {
//            assert(this._raw.hasOwnProperty(name), "Getter called for property \"" + name + "\" of object " + me + " that doesn't exist. Did you mess with _raw?");
//            return this._raw[name];
//        };
//    }
//
//    var makeReadOnlySetter = function(me, name){
////        alert("making RO setter for " + name);
//        return function () {
//            assert(this._raw.hasOwnProperty(name), "Setter called for property \"" + name + "\" that doesn't exist. Did you mess with _raw?");
//            assert("Cannot write to read only property " + name + " of object " + me);
//        };
//    }
//
//    var makeGetter = function(me, name){
////        alert("making getter for " + name);
//        return function () {
//            assert(this._raw.hasOwnProperty(name), "Getter called for property \"" + name + "\" of object " + me + " that doesn't exist. Did you mess with _raw?");
//            return this._raw[name];
//        };
//    }
//
//    var makeSetter = function(me, name){
////        alert("making setter for " + name);
//        alert("called setter for " + name);
//        return function (value) {
//            assert(this._raw.hasOwnProperty(name), "Setter called for property \"" + name + "\" that doesn't exist. Did you mess with _raw?");
//            this._raw[name] = value;
//        };
//    }

//    var addProps = function(me, props){
//        for (var name in props) {
            // Maybe later will think about adding this.  It's just syntactic sugar.
//            if (props[name] === null || typeof props[name] !== "object"){
//                props[name] = {value: props[name]};
//            }
//            alert("adding props " + name);
//            assert(!me.hasOwnProperty(name), "Cannot add property " + name + " to class " + me + " due to name collision.");
//            Object.defineProperty(me, name, {enumerable: true})
//            if (props[name].readOnly) {
//                Object.defineProperty(me, name, {
//                    get: makeReadOnlyGetter(me, name),
//                    set: makeReadOnlySetter(me, name),
//                    enumerable: true});
//            }
//            else {
//                Object.defineProperty(me, name, {
//                    get: makeGetter(me, name+""),
//                    set: makeSetter(me, name+""),
//                    enumerable: true});
//            }
//        }
//    };

//    var createProps = function(obj, props){
////        obj._raw = Object.create(obj);
////        for(var name in props){
////            alert("creating property " + name);
//        if(props) {
//            Object.defineProperties(obj, props);
//        }
////        }
//    };

//    var lockProps = function(obj, props){
////        obj._raw = Object.create(obj);
//        for(var name in props){
//            if (props && props[name].writable === "once") {
////            alert("creating property " + name);
//                Object.defineProperty(obj, name, {writable: false});
//            }
//        }
//    };
    var makePropertyGetter = function(propName){
        return function () {
            return this._props[propName];
        };
    };

    var makePropertySetter = function(propName, type){
        if (!type){
            return function (newValue) {
                this._props[propName] = newValue;
            };
        }
        else if (isA(type, Class)){
            return function (newValue) {
                assert(isA(newValue, type), "Can't set class-typed property \"" + propName + "\" (" + type + ") to " + newValue + ".");
                this._props[propName] = newValue;
            };
        }
        else if (String.isString(type) && type.toLowerCase() == "string") {
            return function (newValue) {
                assert(String.isString(newValue), "Can't set string-typed property \"" + propName + "\" to " + newValue + ".");
                this._props[propName] = newValue;
            };
        }
        else if (String.isString(type) && type.toLowerCase() == "array") {
            return function (newValue) {
                assert(Array.isArray(newValue), "Can't set array-typed property \"" + propName + "\" to " + newValue + ".");
                this._props[propName] = newValue;
            };
        }
        else if (typeof type === "function"){
            return function (newValue) {
                assert(type(newValue), "Can't set custom-typed property \"" + propName + "\" to " + newValue + ".");
                this._props[propName] = newValue;
            };
        }
        else {
            return function (newValue) {
                assert(typeof newValue === type, "Can't set typed property \"" + propName + "\" (" + type + ") to " + newValue + ".");
                this._props[propName] = newValue;
            };
        }
    };

    var findNextInitClass = function(someClass){
        while(!someClass.hasOwnProperty("init")){
            someClass = someClass._parent;
        }
        return someClass;
    };

//    var findSuperProp = function(someClass, prop){
//        while(!someClass.hasOwnProperty(prop) && someClass._parent){
//            someClass = someClass._parent;
//        }
//        return someClass.prop;
//    };

    Class = {};

    var additionally = {
        makeFunction : function(parentMethod){
            var subMethod = this.subMethod;
            return function(){
                var parentReturn = parentMethod.apply(this, arguments);
                var ret = subMethod.apply(this, arguments);
                return ret !== undefined ? ret : parentReturn;
            }
        }
    };
    var before = {
        makeFunction : function(parentMethod){
            var subMethod = this.subMethod;
            return function(){
                var subReturn = subMethod.apply(this, arguments);
                if (subReturn === false){ return; }
                return parentMethod.apply(this, arguments);
            }
        }
    };
    Object.defineProperties(Class, {
        _ABSTRACT : {  // used to indicate abstract properties (including functions)
            value: {}
        },
        _supers : {
            value: [Class]
        }

    });

    // used to "extend" rather than "override" a parent method.
    // basically, it calls the parent's method first with apply(this, arguments)
    Class.ADDITIONALLY = function(subMethod){
        var a = Object.create(additionally);
        a.subMethod = subMethod;
        return a;
    };

    // used to "extend" rather than "override" a parent method.
    // basically, it calls the parent's method first with apply(this, arguments)
    Class.BEFORE = function(subMethod){
        var b = Object.create(before);
        b.subMethod = subMethod;
        return b;
    };

    var nextClassId = 0;
    mixin(Class, {
        _name: "Class",
        _classId: 0,
        _isClass: true,
        _isInstance: false,

        extend: function(args){
            var additions = {};
            for(var i = 0; i < arguments.length; ++i){
                var ingredient = arguments[i];
                mixin(additions, ingredient);
            }

            var sub = Object.create(this);
            mixin(sub, additions, true);
            sub._classId = ++nextClassId;
            sub._class = sub;
            var parent = sub._parent = this;
            sub._supers = [sub].concat(this._supers);

            // Identify interface functions
            sub._interface = this._interface.clone();
            for(var prop in additions){
                if (additions[prop] instanceof Function) {
                    if (!sub._interface.contains(prop) && prop !== "init"){
                        sub._interface.push(prop);
                    }
                }
            }

            // Determine whether this class is abstract or not
            // Also add these special things that weren't caught as "functions"
            // to the interface
            sub._abstract = false;
            for(var prop in sub) {
                if (sub[prop] === Class._ABSTRACT) {
                    sub._abstract = true;
                    sub._interface.push(prop);
                }
                else if (isA(sub[prop], additionally)){
                    assert(parent[prop], "ADDITIONALLY method must add on to an existing parent class method");
                    sub[prop] = sub[prop].makeFunction(parent[prop]);
                    sub._interface.push(prop);
                }
                else if (isA(sub[prop], before)){
                    assert(parent[prop], "BEFORE method must add on to an existing parent class method");
                    sub[prop] = sub[prop].makeFunction(parent[prop]);
                    sub._interface.push(prop);
                }
            }

            // Define getters/setters for properties
            for(var propName in sub.props){
                Object.defineProperty(sub, propName, {
                    get: makePropertyGetter(propName),
                    set: makePropertySetter(propName, sub.props[propName].type)
                });
            }

            sub._isInstance = false;
            sub._isClass = true;
            return sub;
        },
        instance: function(args){

            var obj = Object.create(this);

            obj._isInstance = true;
            obj._isClass = false;

            // Call initializer

            // _initParent and _initClass properties are temporarily set for the object
            // and "magically" change as appropriate if any calls to initParent are made.
            // In any init function then, these will override the regular ones and it's
            // as if the object is the appropriate class that the constructor at a
            // particular level should expect.  (After all a superclass constructor shouldn't
            // know anything about the actual object being a subclass type.)

            obj._name = this._name || "unnamed";
            if (this.props){
                obj._props = {};
            }

            obj._initClass = findNextInitClass(obj._class);
            obj._initClass.init.apply(obj, arguments);

            assert(obj._initClass === Class || findNextInitClass(obj._initClass._parent) === Class, "Parent class chain not fully initialized for " + obj._initClass + ".");

//            // Create properties
//            for(var prop in this.props){
//                Object.defineProperty(obj, prop, {
//                    writable: true,
//                    configurable: true,
//                    enumerable: true,
//                    value: this.props[prop].value,
//                    set: (this.props[prop].type ? function(newValue){
//                        assert(isA(newValue, ))
//                    })
//                }.props[prop])
//            }

            obj._abstract = false;
            for(var prop in obj) {
                if (obj[prop] === Class._ABSTRACT) {
                    obj._abstract = true;
                    assert(false, "Cannot instantiate object - abstract property remains! (" + this._name + "." + prop + ").");
                    break;
                }
            }
            return obj;
        },

        /**
         *  If called on class, generates a proxy class. The instance function can
         *  be used on that class to create proxy instances with a particular target.
         *
         *  If called on an instance object, generates a proxy with that instance as
         *  its target, which essentially provides an extra level of indirection for
         *  its target object. All interface functions from the target's class can be
         *  called instead on the proxy, which will in turn call that function (with
         *  the target as this). The target of a proxy can be changed using
         *  setTarget(newTarget).
         *
         *  A proxy may also "override" functions from
         *  its target's interface. Provide overridden implementations of these
         *  functions for the overrides parameter. Each of the overridden functions
         *  will automatically be wrapped in a way that ensures the
         *  target will be used as this when it is called.
         *
         *  If many of the same kind of proxy must be made, it is more efficient to
         *  first generate a proxy class and then create several instances for the desired
         *  targets using .instance() rather than calling .proxy() directly on the targets.
         *  (Internally, calling .proxy() on an instance makes an anonymous proxy class first
         *  and then instantiates it.)
         */
        proxy: function(overrides) {

            // Proxy functions that in turn call interface functions on target
            var proxyFunctions = {};
            this._interface.forEach(function(funcName) {
                proxyFunctions[funcName] = function() {
                    // Looking up this._target[funcName] is needed here to enable
                    // subtype polymorphism (e.g. if we just formed a closure around
                    // the function now, we would always get the base class version)
                    return this._target[funcName].apply(this._target, arguments);
                }
            });

            // Proxy functions that call provided function override on target
            for (var funcName in overrides) {
                proxyFunctions[funcName] = function(fn){ return function(){
                    return fn.apply(this._target, arguments);
                };}(overrides[funcName]);
            }

            var proxyClass = Proxy.extend(proxyFunctions);
            proxyClass._targetClass = this;

            // If called on an instance object, .proxy() will set that instance as target
            if (this._isClass) {
                return proxyClass;
            }
            else{ // this._isInstance
                return proxyClass.instance(this);
            }
        },

        singleton : function(){
            assert(this._isClass);
            return this.proxy().instance();
        },

        init: function(){
            // do nothing
        },
        initParent: function(){
            // Assume initParent never called when this._initClass is Class
            // So then this._initClass._parent may not be undefined.
            this._initClass = findNextInitClass(this._initClass._parent);
            this._initClass.init.apply(this, arguments);
        },

        _interface : [
            "toString",
            "classString",
            "instanceString",
            "isA",
            "Asi",
            "ajax"
        ],
        toString: function(){
            if (this === this._class){
                return this.classString.apply(this, arguments);
            }
            else{
                return this.instanceString.apply(this, arguments);
            }
        },
        classString: function(){
            return this._name + "("+this._classId+")";
        },
        instanceString: function(){
            return "instance of " + this._name;
        },

//        _NO_EXTEND: function() {
//            assert(false, "Cannot extend this class.");
//        },
        isA: function(someClass){
            return someClass.isPrototypeOf(this) || someClass === this;
        },
        Asi: function(someObject){
            return someObject && (this.isPrototypeOf(someObject) || someObject === this);
        },
        initProp: function(value, type){
            assert("")
        },
        // A function that performs an ajax call and then
        // delegates to members (with the appropriate receiver object)
        // upon either success or error. Wraps around jQuery $.ajax, so
        // any options acceptable to that are fine here.
        ajax : function(options) {
            var self = this;
            if (options.success) {
                var success = options.success;
                options.success = function(){
                    success.apply(self, arguments);
                }
            }
            if (options.error) {
                var error = options.error;
                options.error = function(){
                    error.apply(self, arguments);
                }
            }
            var a = $.ajax(options);
            var prom = Promise.resolve(a);
            prom.abort = function() {
                a.abort();
            };
            return prom;
        }

    });
})();

var Proxy = Class.extend({
    _name: "Proxy",
    _isProxy: "true",

    init : function(target) {
        this.setTarget(target);
    },
    createTarget : function() {
        assert(this._isInstance);
        this._target = this._targetClass.instance.apply(this._targetClass, arguments);
        return this;
    },
    setTarget : function(target) {
        assert(this._isInstance);
        this._target = target;
        return this;
    },
    getTarget : function() {
        assert(this._isInstance);
        return this._target;
    }
});

function Singleton(singletonClass) {
    return singletonClass.singleton();
}


function replaceHtmlEntities(str){
	return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;").replace(/\n/g, "<br />");
}







var integerDivision = function(num, den){
    return Math.trunc(num / den);
};

var floatingDivision = function(num, den){
    return num / den;
};

var modulo = function(num, den){
    return num - integerDivision(num, den)*den;
}






function randomColor(seed){
	if (seed) { Math.seed = seed; }
	var color = toColor(""+Math.seed);
	Math.seed = (Math.seed * 9301 + 49297) % 233280;
	return color;
}

function toColor(obj) {

    var str = obj.toString();

    // str to hash
    for (var i = 0, hash = 0; i < str.length; hash = str.charCodeAt(i++) + ((hash << 5) - hash));

    // int/hash to hex
    for (var i = 0, color = "#"; i < 3; color += ("00" + ((hash >> i++ * 8) & 0xFF).toString(16)).slice(-2));

    return color;
}

// the initial seed
Math.seed = 6;
 
// in order to work 'Math.seed' must NOT be undefined,
// so in any case, you HAVE to provide a Math.seed
Math.seededRandom = function(seed, max, min) {
    max = max || 1;
    min = min || 0;
 
    Math.seed = (Math.seed * 9301 + 49297) % 233280;
    var rnd = Math.seed / 233280;
 
    return min + rnd * (max - min);
};

// I don't remmeber why I need this...
// function angleDiff(a1, a2){
// 	
	// var twoPi = 2 * Math.PI;
	// a1 = a1 % twoPi + (a1 < 0 ? twoPi : 0);
	// a2 = a2 % twoPi + (a2 < 0 ? twoPi : 0);
	// var temp = a2 - a1;
	// temp = temp % twoPi + (temp < 0 ? twoPi : 0);
	// if (temp > Math.PI){
		// temp = temp - Math.PI;
	// }
	// return Math.abs(Math.min(a2 - a1, a1 - a2));
// 	
// }

var Vector = UMichEBooks.Vector = Class.extend({
    init: function(x, y, z){

        this.x = x;
        this.y = y;
        this.z = z || 0;

        return this;
    },
    add : function(/*Vector*/ v) {
		return Vector.instance(this.x + v.x, this.y + v.y, this.z + v.z);
	},
	sub : function(/*Vector*/ v) {
		return Vector.instance(this.x - v.x, this.y - v.y, this.z - v.z);
	},
	mul : function(/*Vector*/ v) {
		return Vector.instance(this.x * v.x, this.y * v.y, this.z * v.z);
	},
	scale : function(/*Number*/ s) {
		return Vector.instance(this.x * s, this.y * s, this.z * s);
	},
	scaleTo : function(/*Number*/ length) {
		return this.unit().scale(length);
	},
	pow : function(/*Number*/ p) {
		return Vector.instance(Math.pow(this.x, p), Math.pow(this.y, p), Math.pow(this.z, p));
	},
	mag : function() {
		return Math.sqrt(this.mag2());
	},
	mag2 : function() {
		return this.dot(this);
	},
	dot : function(/*Vector*/ v) {
		return this.x * v.x + this.y * v.y + this.z * v.z;
	},
	proj : function(/*Vector*/ v) {
		var vUnit = v.unit();
		return vUnit.mul(this.dot(vUnit));
	},
	rej : function(/*Vector*/ v) {
		return this.sub(this.proj(v));
	},
	cross : function(/*Vector*/ v) {
		return Vector.instance(this.y*v.z - this.z*v.y, this.z*v.x - this.x*v.z, this.x*v.y - this.y*v.x);
	},
	rotate2D : function(/*Number*/ theta) {
		return Vector.instance(this.x*Math.cos(theta) - this.y*Math.sin(theta), this.x*Math.sin(theta) + this.y*Math.cos(theta), z);
	},
	rotate : function(/*Quat*/ q) {
		return q.mul(Quat(0, this)).mul(quat.inverse()).v;
	},
	perp : function() {
		return Vector.instance(-this.y, this.x);
	},
	unit : function() {
		var mag = this.mag();
		if (mag == 0){
			return Vector.instance(this.x, this.y);
		}
		else{
			return this.scale(1.0/mag());
		};
	},
	angle : function(/*Vector*/ other, /*Vector*/ up) {
		if (typeof up === "undefined"){
			return this.angle(v, Z_POS);
		};
		var v1 = this.unit();
		var v2 = other.unit()
		var cross = v1.cross(v2);
		if (up){
			if(up.dot(cross) < 0) {angle = -angle;}
		}
		else{
			angle = Math.abs(angle);
		}
		return angle;
	}
});


function RandomVector() {
	return Vector.instance(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5);
}
var X_POS = Vector.instance(1,0,0);
var X_NEG = Vector.instance(-1,0,0);
var Y_POS = Vector.instance(0,1,0);
var Y_NEG = Vector.instance(0,-1,0);
var Z_POS = Vector.instance(0,0,1);
var Z_NEG = Vector.instance(0,0,-1);

if (!Math.trunc) {
    Math.trunc = function truncate(x) {
        return x < 0 ? Math.ceil(x) : Math.floor(x);
    };
}

//jQuery.fn.extend({
//    insertAtCaret: function(myValue){
//        return this.each(function(i) {
//            if (document.selection) {
//                //For browsers like Internet Explorer
//                this.focus();
//                var sel = document.selection.createRange();
//                sel.text = myValue;
//                this.focus();
//            }
//            else if (this.selectionStart || this.selectionStart == '0') {
//                //For browsers like Firefox and Webkit based
//                var startPos = this.selectionStart;
//                var endPos = this.selectionEnd;
//                var scrollTop = this.scrollTop;
//                this.value = this.value.substring(0, startPos)+myValue+this.value.substring(endPos,this.value.length);
//                this.focus();
//                this.selectionStart = startPos + myValue.length;
//                this.selectionEnd = startPos + myValue.length;
//                this.scrollTop = scrollTop;
//            } else {
//                this.value += myValue;
//                this.focus();
//            }
//        });
//    }
//});

var escapes = ["\\\"", "\\'", "\\?", "\\\\", "\\a", "\\b", "\\f", "\\n", "\\r", "\\t", "\\v", "\\0"];
var escaped = ["\"", "\'", "", "\\", "", "\b", "\f", "\n", "\r", "\t", "\v", "\0"];

var escapeString = function(text){
    for(var i = 0; i < escapes.length; ++i){
        text = text.replace(escapes[i], escaped[i]);
    }
    return text;
};
var unescapeString = function(text){
    var newStr = "";
    for(var i = 0; i < text.length; ++i){
        var c = text[i];
        for(var j = 0; j < escaped.length; ++j){
            if (c === escaped[j]){
                c = escapes[j];
                break;
            }
        }
        newStr += c;
    }
    return newStr;
};

var Description = Class.extend({
    _name : "Description",
    init : function(){
        this.initParent();
    },
    generateSubject : function(){
        return '<span class="description">[?]</span>';
    },
    generateDirectObject : function(){
        return '<span class="description">[?]</span>';
    }
});

var EntityDescription = Class.extend({
    _name : "Description",
    init : function(){
        this.initParent();
    },
    html : function(){
        return '<span class="description">[?]</span>';
    }
});

function strip(html)
{
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}


// http://stackoverflow.com/questions/979975/how-to-get-the-value-from-the-get-parameters
function getQueryString() {
    // This function is anonymous, is executed immediately and
    // the return value is assigned to QueryString!
    var query_string = {};
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
        // If first entry with this name
        if (typeof query_string[pair[0]] === "undefined") {
            query_string[pair[0]] = decodeURIComponent(pair[1]);
            // If second entry with this name
        } else if (typeof query_string[pair[0]] === "string") {
            var arr = [ query_string[pair[0]],decodeURIComponent(pair[1]) ];
            query_string[pair[0]] = arr;
            // If third or later entry with this name
        } else {
            query_string[pair[0]].push(decodeURIComponent(pair[1]));
        }
    }
    return query_string;
}

var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
};

// From moustache.js
function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
        return entityMap[s];
    });
}