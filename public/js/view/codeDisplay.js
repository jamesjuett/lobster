var UMichEBooks = UMichEBooks || {};

UMichEBooks.Highlights = {
	
	
	
};
var Highlights = UMichEBooks.Highlights;

var NEXT_HIGHLIGHT_ID = 0;

var Highlight = Highlights.Highlight = Class.extend({
    init: function(code, cssClass, style){
        this.code = code;
        this.cssClass = cssClass || "";
        this.style = style || {};

        this.id = NEXT_HIGHLIGHT_ID++;
    },
	toString : function(){
		return this.id;
	}
});