var Outlet = Lobster.Outlets.Outlet = Class.extend(Observable, Observer, {
    _name: "Outlet",
    _nextId: 0,

    init: function() {
        // Each outlet has a unique ID
        this.initParent();

        this.id = "out_" + (Outlets.Outlet._nextId++);
    },

	converse : function(other) {
    	this.listenTo(other);
    	this.addListener(other);
	}
});

var WebOutlet = Lobster.Outlets.WebOutlet = Outlet.extend({

    init : function(element, readOnly){
		element = element || $("<span></span>");
        assert(element instanceof jQuery);
        this.initParent();

        this.element = element;
        this.element.addClass("outlet");


        this.readOnly = readOnly;
        this.element.addClass(this.readOnly ? "readOnly" : "readWrite");

        // this.setUpDnD();
        // if (!readOnly){
        // makeEventHandler(this.element.get(0), this, ["input", "_onInput"], false);
        // // this.element.attr("ondragstart", "ALL_ENTITIES['"+this.entity.id()+"'].dragstart(event);");
        // }

        // makeEventHandler(this.element.get(0), this, "keydown", false);

        return this;
    },

	htmlElement : function(){
		return this.element.get(0);
	},

});



var HtmlOutlet = Lobster.Outlets.HtmlOutlet = WebOutlet.extend({

    init: function (element, readOnly){
        assert(element instanceof jQuery);
        this.initParent(element, readOnly);

//        this.element.addClass("htmlOutlet");

        // this.setUpDnD();

        if (!this.readOnly) {
            makeEventHandler(this.element.get(0), this, ["input", "_onInput"], false);
            this.element.attr("contenteditable", true);
            // this.element.attr("ondragstart", "ALL_ENTITIES['"+this.entity.id()+"'].dragstart(event);");
        }

        makeEventHandler(this.element.get(0), this, "keydown", false);

        return this;
    },

    _act : function(msg){
//        if (category == "value"){
            this.element.html(msg.data.toString());
            this.element[0].scrollTop = this.element[0].scrollHeight;
//        }
    },

    onInput : function(){
        // var oldTop = this.element.offset().top;
        this.send("value", this.element.html(), this);
        // this.entity.parseAndSetValue(this.element.html(), this);
        // var top = this.element.offset().top;
        // if(top != oldTop){
        // $(document).scrollTop($(document).scrollTop() + (top - oldTop));
        // }
    },

    keydown : function(ev){
        if(ev.keyCode == 13){
            this.element.focusout();
            ev.preventDefault();
        }
    }
});


var ValueOutlet = Lobster.Outlets.ValueOutlet = WebOutlet.extend({

    init: function (element, readOnly){
        assert(element instanceof jQuery);
        this.initParent(element, readOnly);

        this.element.addClass("valueOutlet");

        if (!this.readOnly) {
            makeEventHandler(this.element.get(0), this, ["input", "_onInput"], false);
        }

        return this;
    },

    _act : function(msg){
//        if (msg.category == "value"){
            this.element.val(msg.data);
//        }
//        alert(JSON.stringify(data));
    },

    onInput : function(){
        // var oldTop = this.element.offset().top;
        this.send("value", this.element.val(), this);
        // this.entity.parseAndSetValue(this.element.html(), this);
        // var top = this.element.offset().top;
        // if(top != oldTop){
        // $(document).scrollTop($(document).scrollTop() + (top - oldTop));
        // }
    }
});

//Lobster.NumberOutlet = function(element, readOnly, entity) {
//	assert(element instanceof jQuery);
//	assert(entity.isA(Entity));
//	HtmlOutlet.call(this, element, readOnly, entity);
//
//	this.element.addClass("numberOutlet");
//
//	if(!this.readOnly){
//		makeEventHandler(this.htmlElement(), this, "mousewheel", true);
//	}
//	return this;
//};
//var NumberOutlet = Lobster.NumberOutlet;
//extend(NumberOutlet, HtmlOutlet);
//$.extend(NumberOutlet.prototype, {
//
//	mousewheel : function(ev){
//
//		var oldTop = this.element.offset().top;
//		this.entity.setValue(this.entity.value() + (ev.wheelDelta > 0 ? 1 : -1));
//		var top = this.element.offset().top;
//		if(top != oldTop){
//			$(document).scrollTop($(document).scrollTop() + (top - oldTop));
//		}
//	},
//
//	acceptsDropFrom : function(ent){
//		return ent.isA(Variable);
//	},
//
//	entityDrop : function(ev, ent){
//		this.entity.setValue(ent.value());
//		ev.stopPropagation();
//	}
//});


////TODO what is this for???
//Lobster.FuncOutlet = function(element, entity) {
//	HtmlOutlet.call(this, element, true, entity);
//
//	this.element.addClass("funcOutlet");
//
//	//Interaction
//	//this.element.addClass
//
//	return this;
//};
//var FuncOutlet = Lobster.FuncOutlet;
//extend(FuncOutlet, HtmlOutlet);

var CssOutlet = Lobster.Outlets.CssOutlet = Outlet.extend({

    init : function(elemen, property) {
        assert(element instanceof jQuery);
        assert(String.isString(property));

        this.initParent();

        this.property = property;

        this.noDropsAllowed = true;
        this.element.addClass("cssOutlet");

        return this;
    },

    _act : function(msg){
		this.element.css(msg.data.property, msg.data.value);
	}
});



Lobster.Outlets.List = WebOutlet.extend({
    init : function(element, elementTag)
    {
        this.initParent(element, true);

        this.elementTag = elementTag;



        return this;
    },
	
	/* Possible updates
	 */
    _act : function(msg){
        var category = msg.category;
        var data = msg.data;
		if (category == "pushed"){
			var elem = this.elementTag.clone();
			elem.html(data.toString());
			this.element.append(elem);
		}
		else if (category == "popped"){
			this.element.children(":last-child").remove();
		}
		else if (category == "cleared"){
			this.element.empty();
		}
	}
});
















