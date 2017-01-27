/**
 * Created by James Juett on 8/12/2016.
 */

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
    Class._AFTER = Class._ADDITIONALLY = Class.ADDITIONALLY = function(subMethod){
        var a = Object.create(additionally);
        a.subMethod = subMethod;
        return a;
    };

    // used to "extend" rather than "override" a parent method.
    // basically, it calls the parent's method first with apply(this, arguments)
    Class._BEFORE = Class.BEFORE = function(subMethod){
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
        _delegating: false,
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

            // See comment in instance function about delegation
            if (!sub.hasOwnProperty("delegate")){
                sub.delegate = null;
            }


            // Determine whether this class is abstract or not
            sub._abstract = false;
            for(var prop in sub) {
                if (sub[prop] === Class._ABSTRACT) {
                    sub._abstract = true;
                    break;
                }
                if (isA(sub[prop], additionally)){
                    assert(parent[prop], "ADDITIONALLY method must add on to an existing parent class method");
                    sub[prop] = sub[prop].makeFunction(parent[prop]);
                }
                if (isA(sub[prop], before)){
                    assert(parent[prop], "BEFORE method must add on to an existing parent class method");
                    sub[prop] = sub[prop].makeFunction(parent[prop]);
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
        instance: function(){

            // If we have a delegate function and we're not already coming
            // back up to the base instance version as indicated by _delegated.
            // Every class is given a dedicated _delegated property elsewhere
            // to ensure is not picked up from the superclass prototype, which
            // would prematurely end cascading delegation.
            if (this.delegate) {
                var del = this.delegate.apply(this, arguments);

                if (del) { // ONLY delegate if something was returned.
                    // Sanity check - not sure if this needs to be enforced but idk
                    assert(isA(del, this), "delegate() function for " + this.toString() + " selected a non-subclass");

                    return del.instance.apply(del, arguments);
                }

            }

            var obj = Object.create(this);

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

            assert(obj._initClass === Class || findNextInitClass(obj._initClass._parent) === Class, "Parent class chain not fully initialized for " + obj + ".");

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

            obj._isInstance = true;
            obj._isClass = false;
            return obj;
        },
        proxy: function(props, extend){
            var source = this;
            if (this._isProxy && !extend){
                source = source._source;
            }
            var obj = Object.create(source);

            obj._source = source;
            obj._isProxy = true;
            mixin(obj, props);
            return obj;
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
        }

    });
})();

var isA = function(someObject, someClass){
    return someObject && someClass && (someClass.isPrototypeOf(someObject) || someClass === someObject);
};

var MagicMap = Class.extend({
    init: function(){
        this.map = {};
    },

    createDefault: function(key){
        return {};
    },

    get: function(key){
        assert(key != "get", "Cannot use \"get\" as a key into a MagicMap.");
        assert(key != "set", "Cannot use \"set\" as a key into a MagicMap.");
        return (this.map.hasOwnProperty(key) ? this.map[key] : this.map[key] = this.createDefault())
    },

    set: function(key, value){
        assert(key != "get", "Cannot use \"get\" as a key into a MagicMap.");
        assert(key != "set", "Cannot use \"set\" as a key into a MagicMap.");
        this.map[key] = value;
    }
});

var MagicMap_array = MagicMap.extend({
    createDefault: function(){
        return [];
    }
});

//TODO: is this kinda useless?
var MagicMap_true = MagicMap.extend({
    createDefault: function(){
        return true;
    }
});


// TODO remove this pathetic excuse for a programming pattern
//function extend(child, parent){
//    assert(false, "This object oriented style is crap. Remove every use of it.");
//	var temp = function(){};
//	temp.prototype = parent.prototype;
//	child.prototype = new temp();
//	child.prototype.constructor = child;
//}

function makeEventHandler(element, obj, eventName, preventDefault, stopPropagation){
    element.addEventListener(Array.isArray(eventName) ? eventName[0] : eventName,
        function(ev){
            obj[Array.isArray(eventName) ? eventName[1] : eventName].apply(obj, [ev, this]);
            if (preventDefault){
                ev.preventDefault();
            }
            if (stopPropagation){
                ev.stopPropagation();
            }
            // alert(eventName);
        }, false);
}

function replaceHtmlEntities(str){
    return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;").replace(/\n/g, "<br />");
};



var htmlDecoratedOperator = function(operator, cssClass){
    return "<span class='codeInstance " + (cssClass || "") + "'>" + operator + "<span class='highlight'></span></span>";
};

var htmlDecoratedKeyword = function(keyword){
    return '<span class="code-keyword">' + keyword + '</span>';
};

var htmlDecoratedType = function(type){
    return '<span class="code-type">' + type.toString() + '</span>';
};

var htmlDecoratedName = function(name, type){
    return '<span class="code-name"><span class = "highlight"></span><span class="type">' + type.englishString() + '</span>' + name + '</span>';
};

var htmlDecoratedValue = function(value){
    return '<span class="code-literal">' + value + '</span>';
};

// Extra methods for Array
// wat you can do this wat??? lol
if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};
if (!Array.prototype.contains){
    Array.prototype.contains = function(elem){
        return this.indexOf(elem) != -1;
    };
};
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






var integerDivision = function(num, den){
    return Math.trunc(num / den);
};

var floatingDivision = function(num, den){
    return num / den;
};

var modulo = function(num, den){
    return num - integerDivision(num, den)*den;
};







function randomColor(seed, letters) {

    if(seed || seed === 0) {
        Math.seed = seed;
    }

    // http://stackoverflow.com/questions/1484506/random-color-generator-in-javascript
    letters = letters || "0123456789ABCDEF";
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.seededRandom() * letters.length)];
    }
    return color;
}

function toColor(obj, letters) {

    var str = obj.toString();

    // str to hash
    for (var i = 0, hash = 0; i < str.length; hash = str.charCodeAt(i++) + ((hash << 5) - hash));

    // use hash as seed for RNG
    return randomColor(Math.abs(hash), letters);

    // // int/hash to hex
    // for (var i = 0, color = "#"; i < 3; color += ("00" + ((hash >> i++ * 8) & 0xFF).toString(16)).slice(-2));
    //
    // return color;
}

// the initial seed
Math.seed = 6;

// in order to work 'Math.seed' must NOT be undefined,
// so in any case, you HAVE to provide a Math.seed
Math.seededRandom = function(max, min) {
    max = max || 1;
    min = min || 0;

    Math.seed = (Math.seed * 9301 + 49297) % 233280;
    var rnd = Math.seed / 233280;

    rnd = min + rnd * (max - min);
    rnd = Math.max(min, Math.min(max, rnd));
    return rnd;
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
