// Note: this is probably used in some cases where it isn't needed because I forgot to track
// something in the parsing step, but it's also needed for cases where the construct generating
// the error doesn't exist in the source (e.g. implicitly defined default constructor errors get
// attributed to the containing class)
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
    init : function(sourceConstruct){
        this.i_sourceConstruct = sourceConstruct;
        this.i_trackedConstrct = findNearestTrackedConstruct(sourceConstruct); // will be source if that was tracked
        this.i_trackedCode = this.i_trackedConstrct.code;
    },

    onAdd : function(){

    },

    onRemove : function(){

    }

});

var SimpleAnnotation = Annotation.extend({
    _name: "SimpleAnnotation",
    init : function(sourceConstruct, cssClass, message){
        cssClass = cssClass || "";
        this.initParent(sourceConstruct);
        this._cssClass = cssClass;
        this.i_message = _.escape(message);
    },

    getMessage : function(){
        return "<span>"+ "Line " + this.i_trackedCode.line + ": " + this.i_message + "</span>";
    },

    onAdd : function(outlet){
        this.i_mark = outlet.addMark(this.i_trackedCode, this._cssClass);
    },

    onRemove : function(outlet){
        this.i_mark && this.i_mark.clear();
    }


});



var GutterAnnotation = SimpleAnnotation.extend({
    _name: "GutterAnnotation",

    onAdd : function(outlet){
        SimpleAnnotation.onAdd.apply(this, arguments);
        this.i_gutterMarker = outlet.addGutterError(this.i_trackedCode.line, this.getMessage());
    },

    onRemove : function(outlet){
        this.i_gutterMarker && this.i_gutterMarker.remove();
        outlet.removeGutterError(this.i_trackedCode.line);
        SimpleAnnotation.onRemove.apply(this, arguments);
    }


});

var WidgetAnnotation = Annotation.extend({
    _name: "WidgetAnnotation",
    init : function(sourceConstruct, cssClass){
        this.initParent(sourceConstruct);
        this._cssClass = cssClass;
    },

    onAdd : function(outlet){

        this.i_mark = outlet.addMark(this.i_trackedCode, "widget " + this._cssClass);

        var elem = this.i_elem = $('<span><span class="widgetHolder"><span class="widgetLink"></span></span></span>');
        var self = this;
        elem.find(".widgetLink").click(function(e){
            $(this).addClass("active");
            self.onClick(outlet);
            $(this).removeClass("active");
            //$(this).parent().removeClass("expanded");
            e.preventDefault();
            return false;
        });
        outlet.addWidget(this.i_trackedCode, elem);
    },

    onRemove : function(){
        this.i_mark.clear();
        this.i_elem && this.i_elem.remove();
    },

    onClick : Class._ABSTRACT

});

var RecursiveCallAnnotation = WidgetAnnotation.extend({
    _name: "RecursiveCallAnnotation",
    init : function(sourceConstruct, isTail, reason, others){
        this.initParent(sourceConstruct, isTail ? "tailRecursive" : "recursive");
        this.i_isTail = isTail;
        this.i_reason = reason;
        this.i_others = others || [];
    },

    onClick : function(outlet){
        var otherMarks = [];
        for(var i = 0; i < this.i_others.length; ++i){
            otherMarks.push(outlet.addMark(this.i_others[i].code, "current"));
        }
        var intro = this.i_isTail ? "This function call is tail recursive!" : "This function call is recursive, but NOT tail recursive!";
        outlet.send("annotationMessage", {
            text: this.i_reason ? intro + "\n\n" + this.i_reason : intro,
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
    init : function(sourceConstruct){
        this.initParent(sourceConstruct, sourceConstruct.constantStackSpace ? "tailRecursive" : "recursive");
        this.i_trackedConstruct = this.i_sourceConstruct.declarator;
        this.i_trackedCode = this.i_trackedConstruct.code;
    },

    onClick : function(outlet){

        var cycle = this.i_sourceConstruct.nonTailCycle;

        if (this.i_sourceConstruct.constantStackSpace){
            if (this.i_sourceConstruct.isRecursive){
                outlet.send("annotationMessage", {
                    text: "<span class='code'>" + this.i_sourceConstruct.name + "</span> is tail recursive!\n\nAll of the recursive calls it makes are in fact tail recursive. (And it doesn't call any non-tail recursive functions!)",
                    aboutRecursion: true
                });
            }
            else{
                outlet.send("annotationMessage", {
                    text: "<span class='code'>" + this.i_sourceConstruct.name + "</span> doesn't appear to use recursion at all.",
                    aboutRecursion: true
                });
            }

            //alert("This function uses other tail recursive functions, so we can call it \"tail recursive\".");
        }
        else{
            if (this.i_sourceConstruct.isRecursive){

                // Check to see if any of the calls are from this context.
                var self = this;
                var fromContext = this.i_sourceConstruct.nonTailCycleCalls.filter(function(call){
                    return call.context.func === selfi_sourceConstruct;
                });

                if (fromContext.length == 0){
                    //var others = this.i_sourceConstruct.nonTailCycleCalls || [];
                    var others = this.i_sourceConstruct.nonTailCycles.map(function(elem){
                        while (elem && elem.from){
                            elem = elem.from;
                        }
                        return elem.call;
                    });
                    var otherMarks = [];
                    for(var i = 0; i < others.length; ++i){
                        otherMarks.push(outlet.addMark(others[i].code, "current"));
                    }
                    var message = "<span class='code'>" + this.i_sourceConstruct.name + "</span> is NOT tail recursive.\n\nThe problem is it calls other functions (";
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
                    var others = this.i_sourceConstruct.nonTailCycleCalls || [];
                    var otherMarks = [];
                    for(var i = 0; i < others.length; ++i){
                        otherMarks.push(outlet.addMark(others[i].code, "current"));
                    }
                    outlet.send("annotationMessage", {
                        text: "<span class='code'>" + this.i_sourceConstruct.name + "</span> is recursive, but NOT tail recursive!\n\nIn order for it to be tail recursive, all of the recursive calls it makes would need to be tail recursive. The ones that are not are highlighted.",
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
    init : function(sourceConstruct){
        this.initParent(sourceConstruct, "");
    },

    onClick : function(outlet){
        var str = "";
        var entities = this.i_sourceConstruct.entities || [this.i_sourceConstruct.entity];
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



var ExpressionAnnotation = WidgetAnnotation.extend({
    _name: "ExpressionAnnotation",
    init : function(sourceConstruct){
        this.initParent(sourceConstruct, "");
    },

    onClick : function(outlet){
        outlet.send("annotationMessage", {text : this.i_sourceConstruct.explain().message});
    }

});