var Lobster = Lobster || {};

Lobster.Highlights = {
	
	
	
};
var Highlights = Lobster.Highlights;

var NEXT_HIGHLIGHT_ID = 0;

var Highlight = Highlights.Highlight = Class.extend({
    init: function(code, cssClass, style){
        this.code = code;
        this._cssClass = cssClass || "";
        this.style = style || {};

        this.id = NEXT_HIGHLIGHT_ID++;
    },
	toString : function(){
		return this.id;
	}
});