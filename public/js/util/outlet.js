"use strict";
var Lobster = Lobster || {};
var _currentEditor;
var Outlets = Lobster.Outlets = {};
// function createOutlets(){
// for (var id in ALL_ENTITIES){
// ALL_ENTITIES[id].createOutlets();
// }
// }
function makeEventHandler(element, obj, eventName, preventDefault, stopPropagation) {
    element.addEventListener(Array.isArray(eventName) ? eventName[0] : eventName, function (ev) {
        obj[Array.isArray(eventName) ? eventName[1] : eventName].apply(obj, [ev, this]);
        if (preventDefault) {
            ev.preventDefault();
        }
        if (stopPropagation) {
            ev.stopPropagation();
        }
        // alert(eventName);
    }, false);
}
function createDefaultOutlets() {
    $("._outlet").each(function () {
        $(this).removeClass("_outlet");
        // $(this).addClass("outlet");
        var entId = $(this).html();
        // alert(entId);
        $(this).html("");
        // alert(ALL_ENTITIES[entId]);
        var out = ALL_ENTITIES[entId].createDefaultOutlet($(this), $(this).hasClass("readOnly"));
        //ALL_ENTITIES[entId].update({});
        //self.createOutlet($(this));
    });
}
var Outlet = Lobster.Outlets.Outlet = Class.extend(Observable, Observer, {
    _name: "Outlet",
    _nextId: 0,
    init: function () {
        // Each outlet has a unique ID
        this.initParent();
        this.id = "out_" + (Outlets.Outlet._nextId++);
    },
    converse: function (other) {
        this.listenTo(other);
        this.addListener(other);
    }
});
var WebOutlet = Lobster.Outlets.WebOutlet = Outlet.extend({
    init: function (element, readOnly) {
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
    htmlElement: function () {
        return this.element.get(0);
    },
    setUpDnD: function () {
        this.element.attr("draggable", "true");
        this.element.attr("contenteditable", "false");
        var elem = this.element;
        if (!this.readOnly) {
            elem.dblclick(function (ev) {
                elem.attr("draggable", "false");
                elem.attr("contenteditable", "true");
                ev.stopPropagation();
                if (_currentEditor && !_currentEditor.is($(this))) {
                    _currentEditor.blur();
                }
                _currentEditor = elem;
                elem.focus();
            });
            elem.on("focusin", function (ev) {
                //				console.log(elem.html() + " focus in");
                ev.stopPropagation();
                // ev.preventDefault();
            });
            var self = this;
            elem.on("focusout", function (ev) {
                //				console.log(elem.html() + " focus out");
                elem.attr("contenteditable", "false");
                elem.attr("draggable", "true");
                self._onInput(ev);
                ev.stopPropagation();
                // ev.preventDefault();
            });
        }
        if (!this.readOnly && !this.noDropsAllowed) {
            makeEventHandler(this.htmlElement(), this, "dragstart", false);
            makeEventHandler(this.htmlElement(), this, "dragover", false);
            makeEventHandler(this.htmlElement(), this, "dragenter", false);
            makeEventHandler(this.htmlElement(), this, "drop", false);
            makeEventHandler(this.htmlElement(), this, "dragleave", false);
        }
    },
    dragstart: function (ev) {
        // hook
        // ev.dataTransfer.setData("text", "");
        // ev.dataTransfer.setData("entity", "");
    },
    acceptsDropsFrom: function (ent) {
        return false;
    },
    dragenter: function (ev) {
        // alert(this.outletID);
        // var entID = ev.dataTransfer.getData("entity");
        // alert(entID + " dragenter");
        // alert(entID);
        // if(entID){
        // var ent = ALL_ENTITIES[entID];
        // if(this.acceptsDropFrom(ent)){
        // this.entityDragenter(ev, ent);
        // }
        // 			
        // }
        // ev.preventDefault();
        // ev.stopPropagation();
        ev.preventDefault();
    },
    dragover: function (ev) {
        // var entID = ev.dataTransfer.getData("entity");
        // // alert(entID + " dragover");
        // debug("dragover: " + entID);
        // if(entID){
        // var ent = ALL_ENTITIES[entID];
        // if(this.acceptsDropFrom(ent)){
        // this.entityDragover(ev, ent);
        // }
        // }
        ev.preventDefault();
        // ev.preventDefault();
        // ev.stopPropagation();
    },
    drop: function (ev) {
        // var entID = ev.dataTransfer.getData("entity");
        // if(entID){
        // var ent = ALL_ENTITIES[entID];
        // // alert(ent);
        // if(this.acceptsDropFrom(ent)){
        // this.entityDrop(ev, ent);
        // }
        // 			
        // }
        // ev.preventDefault();
        // ev.stopPropagation();
    },
    dragleave: function (ev) {
        // var entID = ev.dataTransfer.getData("entity");
        // 		
        // if(entID){
        // this.entityDragleave(ev, ALL_ENTITIES[entID]);
        // ev.preventDefault();
        // }
        // ev.preventDefault();
    },
    _onInput: function () {
        var oldTop = this.element.offset().top;
        var oldScrollTop = $(document).scrollTop();
        this.onInput(arguments);
        var top = this.element.offset().top;
        if (top != oldTop) {
            $(document).scrollTop(oldScrollTop + (top - oldTop));
        }
        // debug(oldTop + "<br />" + top + "<br />" + this.element.offset().top+ "<br />" + oldScrollTop+ "<br />" + $(document).scrollTop());
    }
});
var HtmlOutlet = Lobster.Outlets.HtmlOutlet = WebOutlet.extend({
    init: function (element, readOnly) {
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
    _act: function (msg) {
        //        if (category == "value"){
        this.element.html(msg.data.toString());
        this.element[0].scrollTop = this.element[0].scrollHeight;
        //        }
    },
    onInput: function () {
        // var oldTop = this.element.offset().top;
        this.send("value", this.element.html(), this);
        // this.entity.parseAndSetValue(this.element.html(), this);
        // var top = this.element.offset().top;
        // if(top != oldTop){
        // $(document).scrollTop($(document).scrollTop() + (top - oldTop));
        // }
    },
    keydown: function (ev) {
        if (ev.keyCode == 13) {
            this.element.focusout();
            ev.preventDefault();
        }
    }
});
var ValueOutlet = Lobster.Outlets.ValueOutlet = WebOutlet.extend({
    init: function (element, readOnly) {
        assert(element instanceof jQuery);
        this.initParent(element, readOnly);
        this.element.addClass("valueOutlet");
        if (!this.readOnly) {
            makeEventHandler(this.element.get(0), this, ["input", "_onInput"], false);
        }
        return this;
    },
    _act: function (msg) {
        //        if (msg.category == "value"){
        this.element.val(msg.data);
        //        }
        //        alert(JSON.stringify(data));
    },
    onInput: function () {
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
    init: function (elemen, property) {
        assert(element instanceof jQuery);
        assert(String.isString(property));
        this.initParent();
        this.property = property;
        this.noDropsAllowed = true;
        this.element.addClass("cssOutlet");
        return this;
    },
    _act: function (msg) {
        this.element.css(msg.data.property, msg.data.value);
    }
});
Lobster.Outlets.List = WebOutlet.extend({
    init: function (element, elementTag) {
        this.initParent(element, true);
        this.elementTag = elementTag;
        return this;
    },
    /* Possible updates
     */
    _act: function (msg) {
        var category = msg.category;
        var data = msg.data;
        if (category == "pushed") {
            var elem = this.elementTag.clone();
            elem.html(data.toString());
            this.element.append(elem);
        }
        else if (category == "popped") {
            this.element.children(":last-child").remove();
        }
        else if (category == "cleared") {
            this.element.empty();
        }
    }
});
//# sourceMappingURL=outlet.js.map