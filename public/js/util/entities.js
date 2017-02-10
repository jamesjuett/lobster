var Lobster = Lobster || {};

//TODO: make mechanism by which we can determine which values are compatible with which entities

var Entities = Lobster.Entities = {

};

var Mixins = Mixins || {};

var Observer = Mixins.Observer = {

    _IDENTIFY : function(msg){
        msg.data(this);
    },

    recv: function(msg){

        // Call the "_act" function for this
        if (typeof this._act === "function") {
            this._act(msg);
        }
        else{
            var catAct = this._act[msg.category];
            if (catAct === true){
                this[msg.category].call(this, msg.data, msg.source);
            }
            else if (typeof catAct === "string"){
                this[catAct].call(this, msg.data, msg.source);
            }
            else if (catAct){
                catAct.call(this, msg);
            }
            else if (this._act._default){
                this._act._default.call(this, msg);
            }
        }

    },
    _act : {},

    listenTo : function(other, category){
        other.addListener(this, category);
        return this;
    },

    stopListeningTo : function(other, category){
        other.removeListener(this, category);
        return this;
    }


};

var Observable = Mixins.Observable = {

    _initListenerArrays : function() {
        this._universalListeners = [];
        this._listeners = {};
    },

    send : function(category, data, source, target) {
        if (this.silent){
            return;
        }
        if (!this._listeners) { this._initListenerArrays(); }

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
            //if (!this._listeners[msg.category]){
            //    this._listeners[msg.category] = [];
            //}
            var listeners = this._listeners[msg.category];
            if (listeners){
                for (var i = 0; i < listeners.length; ++i) {
                    var listener = listeners[i];
                    if (listener !== noSend) {
                        listeners[i].recv(msg);
                    }
                }
            }

            for (var i = 0; i < this._universalListeners.length; ++i){
                var univListener = this._universalListeners[i];
                if (univListener !== noSend){
                    univListener.recv(msg);
                }
            }
        }
    },

    /**
     * @param {object} listen
     */
    addListener : function(listen, category) {
        assert(listen !== this, "Can't listen to yourself!");
        if (!this._listeners) { this._initListenerArrays(); }
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

                if (!this._listeners[category]){
                    this._listeners[category] = [];
                }
                this._listeners[category].push(listen);
                this.listenerAdded(listen, category);
            }
        }
        else{
            // if no category, intent is to listen to everything
            this._universalListeners.push(listen);
            this.listenerAdded(listen, category);
        }
        return this;
    },

    // converse : function(other, send, recv){
    //     this.addListener(other, send);
    //     this.listenTo(other, recv);
    //     return this;
    // },
    /*
    Note: to remove a universal listener, you must call this with category==false.
    If a listener is universal, removing it from a particular category won't do anything.
     */
    removeListener : function(listen, category){
        assert(category !== false && category !== null);
        if (!this._listeners) { this._initListenerArrays(); }
        if(category){
            // Remove from the list for a specific category (if list exists)
            if (!this._listeners[category]){
                this._listeners[category] = [];
            }
            this._listeners[category].remove(listen);
            this.listenerRemoved(listen, category);
        }
        else{
            // Remove from all categories
            for(var cat in this._listeners){
                this.removeListener(listen, cat);
            }

            // Also remove from universal listeners
            this._universalListeners.remove(listen);
        }
    },
    listenerAdded : function(listener, category){},
    listenerRemoved : function(listener, category){},

    identify : function(category, func){
        var other;
        this.send(category, func || function(o){other = o;});
        return other;
    }
};

var Actor = Entities.Actor = Class.extend(Observer, {
   init: function(act){
       this.initParent();
       this._act = act;
   }
});

var Entity = Entities.Entity = Class.extend(Observable, Observer, {
    _name: "Entity",
    ALL_ENTITIES: {},
    _nextId: 0,
    getEntityById: function(id) {
        return this.ALL_ENTITIES[id];
    },

    init: function() {
        this.id = /*id || */"ent_" + (this._nextId++);
        this.initParent();

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

    _act: function(msg){
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
var List = Lobster.Entities.List = Entity.extend({
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
