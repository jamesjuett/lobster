var UMichEBooks = UMichEBooks || {};

//TODO: make mechanism by which we can determine which values are compatible with which entities

var Entities = UMichEBooks.Entities = {

};

var ArrMap = function(arr){
    return function(key){
        return arr[key];
    }
};

var DataPath = Entities.DataPath = Class.extend({
    _name: "DataPath",
    _IDENTIFY : function(msg){
        msg.data(this);
    },

    init: function() {
        // Properties
        this.categoryMap = {};
        this.listeners = {};
        this.universalListeners = [];
        this.bubble = false;

        return this;
    },

    recv: function(msg){
        //var msg = category; // if single message object was passed
        //if (typeof category === "string"){
        //    // if category, data, source were actually passed separately
        //    msg = {
        //        category: category,
        //        data: data,
        //        source: source,
        //        target: target
        //    }
        //}
        //assert(typeof msg === "object");

        // Modify message coming in by category mapping and translating data
        //if (this.interpret) {
        //    msg = this.interpret(msg) || msg;
        //}
//        data = this.interpretData(category, data, source);

        // Call the "act" function for this data path
        var bubbledMsg;
        if (typeof this.act === "function") {
            bubbledMsg = this.act(msg);
        }
        else{
            var catAct = this.act[msg.category];
            if (catAct === true){
                bubbledMsg = this[msg.category].call(this, msg.data, msg.source);
            }
            else if (typeof catAct === "string"){
                bubbledMsg = this[catAct].call(this, msg.data, msg.source);
            }
            else if (catAct){
                bubbledMsg = catAct.call(this, msg);
            }
            else if (this.act._default){
                bubbledMsg = this.act._default.call(this, msg);
            }
        }

        // Rebroadcast the message if we are supposed to bubble.
        // If the act function returns either true or false, this overrides default bubbling
        //if (bubbledMsg){
        //    this.send(bubbledMsg);
        //}
        //else if (this.bubble){
        //    this.send(msg);
        //}
    },

    act : {
//        _default: function(category, data, source){}
    },
//    act : function(category, data, source){
////        if (this.actor){
////            this.actor.act(category, data, source);
////        }
//    },
    send : function(category, data, source, target) {
        if (this.silent){
            return;
        }
        var msg = category; // if single message object was passed
        if (typeof category === "string"){
            // if category, data, source were actually passed separately
            msg = {
                category: category,
                data: data,
                source: source || this,
                target: target
            }
        }
        msg.source = msg.source || this;

        var noSend = msg.from;
        msg.from = this;

        if (this.translate) {
            msg = this.translate(msg) || msg;
        }

        if (target) {
            // If there is a specific target, send only to them
            target.recv(msg);
        }
        else { // Otherwise, broadcast
            //if (!this.listeners[msg.category]){
            //    this.listeners[msg.category] = [];
            //}
            var listeners = this.listeners[msg.category];
            if (listeners){
                for (var i = 0; i < listeners.length; ++i) {
                    var listener = listeners[i];
                    if (listener !== noSend) {
                        listeners[i].recv(msg);
                    }
                }
            }

            for (var i = 0; i < this.universalListeners.length; ++i){
                var univListener = this.universalListeners[i];
                if (univListener !== noSend){
                    univListener.recv(msg);
                }
            }
        }
    },

//    mapCategory: function(category, data, source){
//        return this.categoryMap[category] || category;
//    },
//
//    interpretData: function(category, data, source){
//        var interp = this.interpreters[category];
//        return interp ? interp(data) : data;
//    },
//
//    translateData: function(category, data, source){
//        var trans = this.translators[category];
//        return trans ? trans(data) : data;
//    },

    /**
     * @param {object} listen
     */
    addListener : function(listen, category) {
        assert(listen !== this, "Can't listen to yourself!");
        if (category){
            assert(!Array.isArray(category) || category.length > 0, "Listener may not specify empty category list.");
            if (Array.isArray(category)) {
                // If there's an array of categories, add to all individually
                for (var i = 0; i < category.length; ++i) {
                    this.addListener(listen, category[i]);
                }
            }
            else {
                assert(String.isString(category), "Category must be a string! (or array of strings)");
                // Create list for that category if necessary and push
                if (!this.listeners[category]){
                    this.listeners[category] = [];
                }
                this.listeners[category].push(listen);
                this.listenerAdded(listen, category);
            }
        }
        else{
            // if no category, intent is to listen to everything
            this.universalListeners.push(listen);
            this.listenerAdded(listen, category);
        }
        return this;
    },

    listenTo : function(other, category){
        other.addListener(this, category);
        return this;
    },

    converse : function(other, send, recv){
        this.addListener(other, send);
        this.listenTo(other, recv);
        return this;
    },
    /*
    Note: to remove a universal listener, you must call this with category==false.
    If a listener is universal, removing it from a particular category won't do anything.
     */
    removeListener : function(listen, category){
        assert(category !== false && category !== null);
        if(category){
            // Remove from the list for a specific category (if list exists)
            if (!this.listeners[category]){
                this.listeners[category] = [];
            }
            this.listeners[category].remove(listen);
            this.listenerRemoved(listen, category);
        }
        else{
            // Remove from all categories
            for(var cat in this.listeners){
                this.removeListener(listen, cat);
            }

            // Also remove from universal listeners
            this.universalListeners.remove(listen);
        }
    },
    listenerAdded : function(listener, category){},
    listenerRemoved : function(listener, category){},

    identify : function(category, func){
        var other;
        this.send(category, func || function(o){other = o;});
        return other;
    }
});

var Actor = Entities.Actor = DataPath.extend({
   init: function(act){
       this.initParent();
       this.act = act;
   }
});

var Entity = Entities.Entity = DataPath.extend({
    _name: "Entity",
    ALL_ENTITIES: {},
    _nextId: 0,
    getEntityById: function(id) {
        return this.ALL_ENTITIES[id];
    },

    init: function() {
        this.id = /*id || */"ent_" + (this._nextId++);
        this.initParent();

//        this.update = DataPath.instance();

        this.ALL_ENTITIES[this.id] = this;

        return this;
    },

    toString: function(){
        return "" + this.id;
    },

    createDefaultOutlet : function(elem, readOnly){
		var jq = elem || $("<span></span>");
		HtmlOutlet.instance(jq, readOnly, this);
		return jq;
	}
});


var ValueEntity = Entities.ValueEntity = Entity.extend({
    init : function(categoryName, value) {
        this.initParent();
        this.categoryName = categoryName || "value";
//        this.bubble = true;

        this.setValue(value);

        return this;
    },

	value : function(){
		return this._value;
	},

    act: function(msg){
        this.prevValue = this._value;
        this._value = msg.data;
        return copyMixin(msg, {category: this.categoryName});
    },

	setValue : function(val, cause) {
        this.prevValue = this._value;
		this._value = val;
		//this.refreshOutlets();
		this.send(this.categoryName, this._value, cause);
		return val;
	},

	parseValue : function(string){
		return string;
	},

	parseAndSetValue : function(string, cause){
		this.setValue(this.parseValue(string), cause);
	},

	listenerAdded : function(listener, category){
		if (category === "value"){
			this.send("value", this._value, this);
		}
	}
});

/**
 * List
 * UPDATES:
 *   pushed
 *   popped
 *   cleared
 * @param {Object} id
 */
var List = UMichEBooks.Entities.List = Entity.extend({
    init: function(id) {
        this.initParent(id);
        this.arr = [];
    },
    createDefaultOutlet : function(elem, readOnly){
		var jq = elem || $("<span></span>");
		ListOutlet.instance(jq, this, true);
		return jq;
	},
	size : function(){
		return this.arr.length;
	},
	get : function(i){
		return this.arr[i];
	},
	last : function(){
		return this.arr.last();
	},
	push : function(elem){
		this.arr.push(elem);
		this.send("pushed", elem, this);
        this.send("value", this.arr, this);
	},
	pushAll : function(elems){
	    elems.forEach(function(elem) {
            this.arr.push(elem);
            this.send("pushed", elem, this);
        }, this);
        this.send("value", this.arr, this);
	},
	pop : function(){
		var p = this.arr.pop();
		this.send("popped", p, this);
        this.send("value", this.arr, this);
		return p;
	},
	clear : function(){
		this.arr.length = 0;
		this.send("cleared", null, this);
        this.send("value", this.arr, this);
	}
});
