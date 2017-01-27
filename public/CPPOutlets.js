/**
 * @author James
 */

var UMichEBooks = UMichEBooks || {};
UMichEBooks.Outlets.CPP = UMichEBooks.Outlets.CPP || {};

var FADE_DURATION = 300;
var SLIDE_DURATION = 400;

var EVAL_FADE_DURATION = 1000;
var RESET_FADE_DURATION = 3000;

UMichEBooks.Outlets.CPP.CPP_ANIMATIONS = true;

var dmp = new diff_match_patch();

var diff = function(from, to){
    var d = dmp.diff_main(from, to);
    var changes = [];
    var curChar = 0;
    for (var i = 0; i < d.length; ++i){
        var type = d[i][0];
        var text = d[i][1];
        if (type === 0) {
            // an equality
            curChar += text.length;
        }
        else if (type === -1) {
            // a deletion
            changes.push(UserActions.ChangeCode.instance("delete", curChar, text));
        }
        else { // if (type === 1)
            // an insertion
            changes.push(UserActions.ChangeCode.instance("insert", curChar, text));
            curChar += text.length;
        }
    }
    return changes;
};

var UserActions = UMichEBooks.CPP.UserActions = {};

UMichEBooks.CPP.UserActions.Base = Class.extend({
    _name : "UserAction",

    // combine takes one parameter for the next action and returns false if this action can't
    // "absorb" that one. If they can be combined, it should modify this
    // action to "absorb" the other one and then return this
    combine : function(){
        return false; //default is can't combine actions
    },
    encode : Class._ABSTRACT
});


UMichEBooks.CPP.UserActions.ChangeCode = UserActions.Base.extend({
    _name : "UserActions.ChangeCode",
    init : function(type, at, text){
        this.type = type;
        this.at = at;
        this.text = text;
    },
    combine : function(next){
        // if both are insertions
        if (this.type === "insert" && next.type === "insert"){
            if(this.at + this.text.length === next.at){
                // we can combine them
                this.text += next.text;
                return this;
            }
        }

        // if both are deletions (using backspace)
        if (this.type === "delete" && next.type === "delete"){
            if(this.at - this.text.length === next.at){
                // we can combine them
                this.text = next.text + this.text;
                return this;
            }
        }

        // if both are deletions (using delete)
        if (this.type === "delete" && next.type === "delete"){
            if(this.at === next.at){
                // we can combine them
                this.text += next.text;
                return this;
            }
        }

        return false;
    },
    encode : function(){
        return {
            action: this.type + "Code",
            value: this.at + ":" + (this.type === "insert" ? this.text : this.text.length)
        };
    }
});

UMichEBooks.CPP.UserActions.LoadCode = UserActions.Base.extend({
    _name : "UserActions.LoadCode",
    init : function(code){
        this.code = code;
    },
    combine : function(next){
        return false;
    },
    encode : function(){
        return {
            action: "loadCode",
            value: this.code
        };
    }
});

UMichEBooks.CPP.UserActions.Simulate = UserActions.Base.extend({
    _name : "UserActions.Simulate",
    init : function(code){
        this.code = code;
    },
    combine : function(next){
        return false;
    },
    encode : function(){
        return {
            action: "simulate",
            value: ""
        };
    }
});

var UserLog = UMichEBooks.CPP.UserLog = DataPath.extend({
    _name : "UserLog",
    init : function(){
        this.initParent();
        this.actions = [];
        var self = this;
        self.logId = false;
        $.get("log/new", function(data){
            self.logId = data;
        });
        setInterval(function(){
            if(self.logId !== false) {
                self.compress();
                self.update()
            }
        }, 10000);
    },
    addAction : function(action){
        this.actions.push(action);
    },
    act : {
        userAction : function(msg){
            this.addAction(msg.data);
        }
    },
    compress : function(){

        // just return if there aren't multiple actions
        if (this.actions.length < 2){
            return;
        }

        var newActions = [];
        var prev = this.actions[0];
        for(var i = 1; i < this.actions.length; ++i){
            var act = this.actions[i];

            if (prev.combine(act)){
                continue;
            }

            newActions.push(prev);
            prev = this.actions[i];
        }

        newActions.push(prev);
        this.actions = newActions;
    },
    update : function(){
        // post actions to server
        for(var i = 0; i < this.actions.length; ++i){
            this.actions[i] = this.actions[i].encode();
        }

        if (this.actions.length !== 0) {
            debug(JSON.stringify(this.actions, null, 4), "log");
            $.post("log/update", {logId: this.logId, actions: JSON.stringify(this.actions)}, null);
        }
        this.actions.length = 0;
    }
});

var CodeList = UMichEBooks.Outlets.CPP.CodeList = WebOutlet.extend({
    _name: "CodeList",
    _instances : [],
    reloadLists : function(){
        for(var i = 0; i < this._instances.length; ++i){
            this._instances[i].loadList();
        }
    },
    init: function(element, url, editor, personal) {
        this.initParent(element);
        this._instances.push(this);
        element.addClass("codeList");

        this.editor = editor;
        this.editor.converse(this);

        this.personal = personal;
        if (personal){
            CodeList._personalList = this;
        }


        var self = this;
//        self.setList(["fact.cpp", "hailstone.cpp", "countDigits.cpp"]);
        this.url = url;
        this.programs = {};
        this.loadList();
    },

    loadList : function(){
        var self = this;
        $.ajax({
            type: "POST",
            url: this.url + "codeList",
            data: {idtoken: ID_TOKEN},
            success: function(data){
                self.setList(data);
                CodeList.ajaxSuccessful = true;
            },
            dataType: "json"
        });
    },

    setList : function(codeList){
        var self = this;

        // Was one active before?
//        this.element.find("")

        this.programs = {};

        this.element.empty();
        for(var i = 0; i < codeList.length; i++){
            var program = codeList[i];
            //console.log(JSON.stringify(program));
            var isPublic = false;
            if(typeof program !== "string"){
                isPublic = program.isPublic;
                program = program.name;
            }

            var item = $("<div></div>");
            if (this.personal){
                var checkbox = $('<input type="checkbox" name="isPublic" value="'+program+'" />');
                checkbox[0].checked = (isPublic === "1");
                item.append(checkbox);
                checkbox.change(function(){
                    //console.log(JSON.stringify({name: $(this).val(), isPublic: $(this)[0].checked}));
                    $.post("api/me/setCodePublic", {idtoken: ID_TOKEN, name: $(this).val(), isPublic: $(this)[0].checked}, function(){
                        console.log("success");
                    });
                });
            }
            var link = $('<span class="link">'+program+'</span>');
            item.append(link);
            link.click(function(){
                if(self.loadCode($(this).html())) {
                    $(this).addClass("active");
                }
            });

            this.element.append(item);
            this.programs[program] = true;
        }
    },

    loadCode : function(name, who){
        if(!this.editor.saved && !confirm("Your code has unsaved changes, and loading a file will overwrite them. Are you sure?")) {
            return;
        }
        if(!this.personal && CodeList._personalList && CodeList._personalList.programs[name] && !confirm("WARNING! Loading code from the class repository will overwrite your local copy of the same name! Are you sure?")){
            return;
        }
        var self = this;

        if (who) {
            $.ajax({
                type: "POST",
                url: "api/user/" + who + "/" + name,
                data: {idtoken: ID_TOKEN},
                success: function (data) {
                    if (!data){
                        alert("Program not found! (It is either private or doesn't exist.)")
                        return;
                    }
                    self.send("loadCode", {name: who + "_" + name, code: data});
                    document.title = name;
                    $(".codeList .active").removeClass("active");
                },
                dataType: "text"
            });

        }
        else{
            $.ajax({
                type: "POST",
                url: this.url + (this.personal ? "code/" : "course/code/eecs280f16/") + name,
                data: {idtoken: ID_TOKEN},
                success: function (data) {
                    if (!data){
                        if (name === "program.cpp"){
                            self.send("loadCode", {name: name, code: "int main(){\n  \n}"});
                            document.title = name;
                            $(".codeList .active").removeClass("active");
                        }
                        else{
                            alert("Program not found :(.");
                        }
                    }
                    self.send("loadCode", {name: name, code: data});
                    document.title = name;
                    $(".codeList .active").removeClass("active");
                },
                dataType: "text"
            });
        }
        return true;
    },
    act: {
        saved: function(){
            this.loadList();
        }
    }

});

UMichEBooks.Outlets.CPP.SimulationOutlet = WebOutlet.extend({
    _name: "SimulationOutlet",
    DEFAULT_CONFIG : {
        initCode: "int main(){\n  \n}"
    },
    init: function(element, sim, config) {
        this.config = makeDefaulted(config, Outlets.CPP.SimulationOutlet.DEFAULT_CONFIG);

        assert(element instanceof jQuery);
        assert(sim.isA(Simulation));

        this.initParent(element);

        this.sim = sim;
        this.listenTo(this.sim);

        if (this.config.log !== false){
            this.log = UserLog.instance();
        }

        var self = this;
//        $("#sim").load("component/sim/standard", function() {
            self.initSuboutlets();
            self.initListeners();

//        });


//        simulation.setCode(config.initCode);
    },

    initSuboutlets : function(){
        var element = this.element;
        var sim = this.sim;
        var elem;

        var self = this;

        // Set up simulation and source tabs
        var sourceTab = element.find(".sourceTab");
        var simTab = element.find(".simTab");
        var sourcePane = element.find(".sourcePane");
        var simPane = element.find(".simPane");

        sourceTab.click(function(){
            sourceTab.addClass("active");
            simTab.removeClass("active");
            sourcePane.css("display", "flex");
            simPane.css("display", "none");
            self.sim.annotate();
        });

        simTab.add(element.find(".runButton")).click(function(){
            simTab.addClass("active");
            sourceTab.removeClass("active");
            simPane.css("display", "flex");
            sourcePane.css("display", "none");
            self.saveFunc();
            self.send("userAction", UserActions.Simulate.instance());
            simPane.focus();
            if (self.sim.main && !self.sim.hasSemanticErrors()){
                self.sim.start();
            }
        });





        this.errorStatus = ValueEntity.instance();


        this.runningProgress = element.find(".runningProgress");
//        this.console = ValueEntity.instance();

        if ((elem = element.find(".codeMirrorEditor")).length !== 0) {
            this.editor = Outlets.CPP.CodeEditor.instance(elem, sim);
            this.listenTo(this.editor);
            this.sim.converse(this.editor);
            // Dismiss any annotation messages
            var self = this;
            elem.click(function(){
                self.hideAnnotationMessage();
            })
        }
        if ((elem = this.statusElem = element.find(".status")).length !== 0) {
            this.status = Outlets.HtmlOutlet.instance(elem, true).listenTo(this.errorStatus);
        }
        if ((elem = element.find(".console")).length !== 0) {
            this.consoleOutlet = Outlets.HtmlOutlet.instance(elem, true).listenTo(this.sim.console);
        }
        if ((elem = element.find(".semanticProblems")).length !== 0) {
            this.problemsElem = elem;
            //this.problems = Outlets.List.instance(elem, $("<li></li>")).listenTo(sim.semanticProblems);
        }
        if ((elem = element.find(".stackFrames")).length !== 0) {
            if (this.useSourceSimulation){
                this.stackFrames = Outlets.CPP.SourceSimulation.instance(elem, sim, this);
                this.listenTo(this.stackFrames);
            }
            else{
                this.stackFrames = Outlets.CPP.SimulationStack.instance(elem, sim, this);
                this.listenTo(this.stackFrames);
            }
        }
        //if ((elem = element.find(".stackFrames2")).length !== 0) {
        //    //this.stackFrames2 = Outlets.CPP.SimulationStack.instance(elem, sim, this);
        //    this.stackFrames2 = Outlets.CPP.SourceSimulation.instance(elem, sim, this);
        //    this.listenTo(this.stackFrames2);
        //}
        if ((elem = element.find(".memory")).length !== 0) {
            this.memory = Outlets.CPP.Memory.instance(elem, sim.memory);
        }
        // TODO REMOVE
        // if ((elem = element.find(".codeSelect")).length !== 0) {
        //
        //     this.codeName = ValueEntity.instance(false, "");
        //     this.codeName.addListener(Actor.instance(function(msg){
        //
        //         $.ajax({
        //             type: 'GET',
        //             url: '/api/user/jjuett/' + msg.data,
        //             dataType: 'text',
        //             success: function(text){
        //                 self.sim.code.setValue(text);
        //             }
        //
        //         });
        //
        //     }));
        //     this.codeSelect = Outlets.ValueOutlet.instance(elem).converse(this.codeName);
        // }

        this.runButton = element.find(".runButton");

        if (element.find(".saveName").length !== 0){
            var filenameRegex = /^[a-zA-Z0-9\._-]+$/;
            this.saveNameEnt = ValueEntity.instance("saveName", "program");
            ValueOutlet.instance(element.find(".saveName")).converse(this.saveNameEnt);
            this.saveButton = element.find(".saveButton");
            this.saveMessage = element.find(".saveMessage");

            this.saveFunc = function(suppressAlert){
                var name = self.saveNameEnt.value().trim();

                if (name.match(filenameRegex)){
                    self.saveMessage.html("Saving...").show();
                    $.post("api/me/save", {idtoken: ID_TOKEN, name: name, code: self.editor.source}, function(){
                        console.log("save successful");
                        self.saveMessage.html("Saved!").fadeOut(5000);
                        self.editor.saved = true;
                        CodeList.reloadLists();
                    });
                }
                else{
                    if(!suppressAlert) {
                        alert("Sorry, couldn't save the file. (Invalid file name.)");
                    }
                }
            };
            this.editor.saveFunc = this.saveFunc;

            this.saveButton.click(this.saveFunc);

        }




        var buttons = this.buttons = {};

        buttons.restart = element.find(".restart");
        buttons.restart.click(function(){
            self.restart();
        });
        var stepForwardNumEnt = ValueEntity.instance("stepForwardNum", "1");
        element.find(".stepForwardNum").length !== 0 && ValueOutlet.instance(element.find(".stepForwardNum")).converse(stepForwardNumEnt);

        buttons.stepForward = element.find(".stepForward");
        buttons.stepForward.click(function(){
            self.stepForward(parseInt(stepForwardNumEnt.value()));
        });

        buttons.stepOver = element.find("button.stepOver");
        buttons.stepOver.click(function(){
            self.stepOver();
        });

        buttons.stepOut = element.find("button.stepOut");
        buttons.stepOut.click(function(){
            self.stepOut();
        });

        buttons.skipToEnd = element.find("button.skipToEnd");
        buttons.skipToEnd.click(function(){
            self.skipToEnd();
        });

        buttons.runToEnd = element.find("button.runToEnd");
        buttons.runToEnd.click(function(){
            self.runToEnd();
        });

        buttons.pause = element.find("button.pause");
        buttons.pause.click(function(){
            self.pause();
        });
        this.skipFunctions = false;
        //element.find("input.stepInto").change(function(){
        //    self.skipFunctions = !$(this).is(":checked");
        //});


        if (element.find(".stepBackwardNum").length !== 0) {
            var stepBackwardNumEnt = ValueEntity.instance("stepBackwardNum", "1");
            ValueOutlet.instance(element.find(".stepBackwardNum")).converse(stepBackwardNumEnt);
            buttons.stepBackward = element.find(".stepBackward");
            buttons.stepBackward.click(function () {
                self.stepBackward(parseInt(stepBackwardNumEnt.value()));
            });
        }



        var self = this;
        element.find(".simPane").on("mousewheel", function(e){
            if (e.ctrlKey){
                self.mousewheel(e);
            }
            else{
                return true;
            }
        });

        element.find(".stackFrames").on("mousedown", function(e){
            element.find(".simPane").focus();
            //alert("hi");
        });

        element.find(".simPane").add(element.find(".stackFrames")).on("keydown", function(e){
            //console.log(e.which);
            if (element.find(".simPane").css("display") !== "none"){
                if (e.which == 39 || e.which == 83){
                    self.stepForward();
                }
                else if (e.which == 37){
                    self.stepBackward();
                }
                //else if (e.which == 40){
                //    self.stepOver();
                //}
                //else if (e.which == 38){
                //    self.stepOut();
                //}
            }
            e.preventDefault();
            e.stopPropagation();
        }).on("keypress", function(e){
            e.preventDefault();
            e.stopPropagation();
        });



        this.alerts = element.find(".alerts");
        this.alerts.find("button").click(function(){
            self.hideAlerts();
        });

        this.annotationMessages = element.find(".annotationMessages");
        this.annotationMessages.find("button").click(function(){
            self.hideAnnotationMessage();
        });
        this.afterAnnotation = [];
//        makeEventHandler(element.find("#simPane")[0], this, "mousewheel", true);
    },

    initListeners : function(){
        this.log && this.log.listenTo(this);
        this.log && this.log.listenTo(this.editor);
    },

    setEnabledButtons : function(enabled, def){
        def = def || false;
        for(var key in this.buttons){
            if (enabled.hasOwnProperty(key)){
                this.buttons[key].prop("disabled", !enabled[key]);
            }
            else{
                this.buttons[key].prop("disabled", !def);
            }
        }
    },

    restart : function(){
        this.setEnabledButtons({}, true);
        this.sim.restart();
    },

    stepForward : function(n){
        this.setAnimationsOn(true);
        this.runningProgress.css("visibility", "visible");
        var self = this;
        setTimeout(function(){
            self.sim.stepForward(n);
            self.runningProgress.css("visibility", "hidden");
        },1);
    },

    stepOver : function(){
        this.runningProgress.css("visibility", "visible");

        CPPCodeInstance.silent = true;
        this.setAnimationsOn(false);
        this.setEnabledButtons({"pause":true});

        this.sim.speed = Simulation.MAX_SPEED;
        var self = this;
        this.sim.stepOver({
            after : function(){
                CPPCodeInstance.silent = false;
                self.stackFrames.refresh();
                setTimeout(function(){self.setAnimationsOn(true);}, 10);
                self.runningProgress.css("visibility", "hidden");
                self.setEnabledButtons({
                    "pause": false
                }, true);
                self.element.find(".simPane").focus();
            }
        });
    },

    stepOut : function(){
        this.runningProgress.css("visibility", "visible");

        CPPCodeInstance.silent = true;
        this.setAnimationsOn(false);
        this.setEnabledButtons({"pause":true});

        this.sim.speed = Simulation.MAX_SPEED;
        var self = this;
        this.sim.stepOut({
            after : function(){
                CPPCodeInstance.silent = false;
                self.stackFrames.refresh();
                setTimeout(function(){self.setAnimationsOn(true);}, 10);
                self.runningProgress.css("visibility", "hidden");
                self.setEnabledButtons({
                    "pause": false
                }, true);
                self.element.find(".simPane").focus();
            }
        });
    },


    // TODO this has some bugs where the thing can get skipped over lol
    //runTo : function(data){
    //    this.runToEnd({stopIfTrue: function(sim){
    //        var topInst = sim.peek();
    //        return topInst.model === data.code && topInst.parent === data.parentInst;
    //    }});
    //},

    runToEnd : function(){
        this.runningProgress.css("visibility", "visible");

        //CPPCodeInstance.silent = true;
        this.setAnimationsOn(false);
        this.setEnabledButtons({"pause":true});

        var self = this;
        this.sim.speed = 1;
        this.sim.autoRun({after: function(){
            //CPPCodeInstance.silent = false;
            //self.stackFrames.refresh();
            setTimeout(function(){self.setAnimationsOn(true);}, 10);
            //self.setEnabledButtons({
            //    skipToEnd: true,
            //    restart: true
            //}, false);
            self.runningProgress.css("visibility", "hidden");
        }});
    },

    skipToEnd : function(){
        this.runningProgress.css("visibility", "visible");

        CPPCodeInstance.silent = true;
        this.setAnimationsOn(false);
        this.setEnabledButtons({"pause":true});

        var self = this;
        this.sim.speed = Simulation.MAX_SPEED;
        this.sim.autoRun({after: function(){
            CPPCodeInstance.silent = false;
            self.stackFrames.refresh();
            setTimeout(function(){self.setAnimationsOn(true);}, 10);
            //self.setEnabledButtons({
            //    skipToEnd: true,
            //    restart: true
            //}, false);
            self.runningProgress.css("visibility", "hidden");
        }});




    },

    pause : function(){
        this.sim.pause();
    },

    stepBackward : function(n){
        if (this.ignoreStepBackward){return;}

        this.runningProgress.css("visibility", "visible");
        var self = this;

        CPPCodeInstance.silent = true;
        this.setAnimationsOn(false);
        this.ignoreStepBackward = true;
        setTimeout(function(){
            self.sim.stepBackward(n);
            CPPCodeInstance.silent = false;
            self.stackFrames.refresh();
            setTimeout(function(){self.setAnimationsOn(true);}, 10);
            self.setEnabledButtons({
                "pause": false
            }, true);
            self.runningProgress.css("visibility", "hidden");
            self.ignoreStepBackward = false;
        }, 100);

    },

    loadCode : function(program){
        this.saveNameEnt.setValue(program.name);
    },

    setAnimationsOn : function(animOn){
        if (animOn){
            //CPPCodeInstance.silent = false;
//        this.silent = false;
            Outlets.CPP.CPP_ANIMATIONS = true;
            $.fx.off = false;
            this.alertsOff = false;
            this.explainOff = false;
            $("body").removeClass("noTransitions").height(); // .height() is to force reflow

        }
        else{
            $("body").addClass("noTransitions").height(); // .height() is to force reflow
            this.alertsOff = true;
            this.explainOff = true;
            $.fx.off = true;
            Outlets.CPP.CPP_ANIMATIONS = false; // TODO not sure I need this
//        this.silent = true;
//            CPPCodeInstance.silent = true;
        }
    },

    hideAlerts : function(){
        this.alerts.css("left", "450px");
        $(".codeInstance.current").removeClass("current");
    },

    hideAnnotationMessage : function(){
        this.annotationMessages.css("top", "125px");
        if (this.afterAnnotation.length > 0){
            this.afterAnnotation.forEach(function(fn){fn();})
            this.afterAnnotation.length = 0;
        }
    },

    act : {
        loadCode : "loadCode",
        runTo: "runTo",
        skipToEnd: "skipToEnd",
        compiled : function(msg){
            this.errorStatus.setValue("Compilation successful!");
            this.statusElem.removeClass("error");
            this.runButton.css("display", "inline-block");
            this.problemsElem.empty();
        },
        syntaxError : function(msg){
            var err = msg.data;
            this.errorStatus.setValue("Syntax error at line " + err.line + ", column " + err.column/* + ": " + err.message*/);
            this.statusElem.addClass("error");
            this.runButton.css("display", "none");
            this.problemsElem.empty();
        },
        semanticError : function(msg){
            this.errorStatus.setValue("Semantic error(s) detected.");
            this.statusElem.addClass("error");
            this.runButton.css("display", "none");
            this.problemsElem.empty();

            //var sp = msg.data;
            //for(var i = 0; i < sp.errors.length; ++i){
            //    this.problemsElem.append($("<li>" + sp.errors[i] + "</li>"));
            //}
            //for(var i = 0; i < sp.warnings.length; ++i){
            //    this.problemsElem.append($("<li>" + sp.warnings[i] + "</li>"));
            //}
        },
        otherError : function(msg){
            this.errorStatus.setValue(msg.data);
            this.statusElem.addClass("error");
            this.runButton.css("display", "none");
            this.problemsElem.empty();
        },
        unknownError : function(msg){
            this.errorStatus.setValue("Oops! Something went wrong. You may be trying to use an unsupported feature of C++. Or you may have stumbled upon a bug. Feel free to let me know at jjuett@umich.edu if you think something is wrong.");
            this.statusElem.addClass("error");
            this.runButton.css("display", "none");
            this.problemsElem.empty();
        },
        annotationMessage : function(msg){
            this.hideAnnotationMessage();
            var text = msg.data.text;
            if (msg.data.after){
                this.afterAnnotation.unshift(msg.data.after);
            }
            this.annotationMessages.find(".annotation-message").html(text);
            this.annotationMessages.css("top", "0px");
            if (msg.data.aboutRecursion){
                this.annotationMessages.find(".lobsterTeachingImage").css("display", "inline");
                this.annotationMessages.find(".lobsterRecursionImage").css("display", "none");
            }
            else{
                this.annotationMessages.find(".lobsterTeachingImage").css("display", "none");
                this.annotationMessages.find(".lobsterRecursionImage").css("display", "inline");
            }
        },

        alert : function(msg){
            msg = msg.data;
            this.pause();
            this.alerts.find(".alerts-message").html(msg);
            this.alerts.css("left", "0px");
        },
        explain : function(msg){
            msg = msg.data;
            this.alerts.find(".alerts-message").html(msg);
            this.alerts.css("left", "0px");
        },
        closeMessage : function(){
            this.hideAlerts();
        },
        started : function(msg){
            this.hideAlerts();
        },
        paused : function(msg){
            //this.paused = true;
            this.setEnabledButtons({
                "pause": false
            }, true);
            this.element.find(".simPane").focus();
            this.runningProgress.css("visibility", "hidden");
        },
        atEnded : function(msg){
            this.atEnd = true;
            this.setEnabledButtons({
                restart: true,
                stepBackward: true
            },false);
            this.runningProgress.css("visibility", "hidden");
        },
        beforeStepForward: function(msg){
//            if (data.inst.model.isA(Statements.Statement)){
            var oldGets = $(".code-memoryObject .get");
            var oldSets = $(".code-memoryObject .set");
            setTimeout(function() {
                oldGets.removeClass("get");
                oldSets.removeClass("set");
            }, 300);
//                alert("hi");
//            }
        }
    },

    mousewheel : function(ev){
        ev.preventDefault();
        if (ev.deltaY < 0){
            this.stepForward();
        }
        else{
//            this.stepBackward();
        }
    },

    freeze : function(){

    },

    unfreeze : function(){

    }

});




var CodeEditor = UMichEBooks.Outlets.CPP.CodeEditor = Outlet.extend({
    _name: "CodeEditor",
    DEFAULT_CONFIG : {
        initCode: "int main(){\n  \n}"
    },
    _instances : [],
    onbeforeunload : function(){
        if (CodeList.ajaxSuccessful){
            for(var i = 0; i < CodeEditor._instances.length; ++i){
                if (!CodeEditor._instances[i].saved){
                    return "The file (" + CodeEditor._instances[i].programName + ") has unsaved changes.";
                }
            }
        }
    },
    init: function(element, config) {
        assert(element instanceof jQuery);
        this.config = makeDefaulted(config, Outlets.CPP.CodeEditor.DEFAULT_CONFIG);
        this.initParent();

        this.source = "";
        this.annotations = [];
        this.gutterErrors = [];
        this.saved = true;

        var self = this;
        var codeMirror = this.codeMirror = CodeMirror(element[0], {
            value: this.config.initCode,
            mode: "text/x-c++src",
            theme: "monokai",
            height: "auto",
            lineNumbers: true,
            tabSize: 2,
            extraKeys: {
                "Ctrl-S" : function(){
                    self.saveFunc();
                }
            },
            gutters: ["CodeMirror-linenumbers", "errors"]
        });





        codeMirror.on("change", function(e){
            self.userEdit(codeMirror.getValue());
        });

        //this.loadCode({name: "program.cpp", code: this.config.initCode});
        CodeEditor._instances.push(this);
    },

//    userEdit: function(e){
//        console.log(JSON.stringify(e.data, null, 4));
//    },

    loadCode : function(program){
        this.programName = program.name;
        var code = program.code;
        this.codeMirror.setValue(code);
        this.setSource(code);
        this.saved = true; // setting source would have made this false
        this.send("userAction", UserActions.LoadCode.instance(code));
    },

    userEdit : function(newSource){
        // Figure out what the changes were by doing a diff
        var changes = diff(this.source, newSource);

        // Update source
        this.setSource(newSource);
        this.saved = false;

        // Send changes to logs as user actions
        for(var i = 0; i < changes.length; i++) {
            this.send("userAction", changes[i]);
        }


    },

    //refresh : function(){
    //    this.setSource(codeMirror.getValue());
    //},

    setSource : function(src){
        this.send("sourceCode", src);
        this.source = src;
    },

    addMark : function(code, cssClass){
        var codeMirror = this.codeMirror;
        var from = codeMirror.posFromIndex(code.start);
        var to = codeMirror.posFromIndex(code.end);
        return codeMirror.markText(from, to, {startStyle: "begin", endStyle: "end", className: "codeMark " + cssClass});
    },

    addGutterError : function(line, text){
        --line;
        var marker = this.gutterErrors[line];
        if (!marker){
            marker = this.gutterErrors[line] = {
                elem:$('<div class="gutterError">!<div></div></div>'),
                num: 0
            };
        }
        var elem = $('<div class="errorNote">'+text+'</div>');
        marker.elem.children("div").append(elem);
        ++marker.num;
        if (marker.num === 1){
            this.codeMirror.setGutterMarker(line, "errors", marker.elem[0]);
        }
        return elem;
    },

    removeGutterError : function(line){
        --line;
        var marker = this.gutterErrors[line];
        if (marker){
            --marker.num;
            if (marker.num == 0){
                this.codeMirror.setGutterMarker(line, "errors",null);
            }
        }
    },


    addWidget : function(code, elem){
        var codeMirror = this.codeMirror;
        var from = codeMirror.posFromIndex(code.start);

        codeMirror.addWidget(from, elem[0], false);
    },

	act : {
        loadCode: "loadCode",
        parsed : function(msg){
            if (this.syntaxErrorLineHandle) {
                this.codeMirror.removeLineClass(this.syntaxErrorLineHandle, "background", "syntaxError");
            }
        },
        syntaxError : function(msg){
            if (this.syntaxErrorLineHandle) {
                this.codeMirror.removeLineClass(this.syntaxErrorLineHandle, "background", "syntaxError");
            }
            var err = msg.data;
//            this.marks.push(this.codeMirror.markText({line: err.line-1, ch: err.column-1}, {line:err.line-1, ch:err.column},
//                {className: "syntaxError"}));
            this.syntaxErrorLineHandle = this.codeMirror.addLineClass(err.line-1, "background", "syntaxError");
            this.act.clearAnnotations.apply(this);
        },
        addAnnotation : function(msg) {
            var ann = msg.data;
            ann.onAdd(this);
            this.annotations.push(ann);
        },

        removeHighlight : function(msg){
//            var data = msg.data;
//
//			if (this.highlights[data.id]){
//
//				if (Outlets.CPP.CPP_ANIMATIONS){
//					this.highlights[data.id].fadeOut(FADE_DURATION, function(){
//						$(this).remove();
//					});
//				}
//				else{
//					this.highlights[data.id].remove();
//				}
//				delete this.highlights[data.id];
//			}
		},

        clearAnnotations : function(){
            for(var i = 0; i < this.annotations.length; ++i){
                this.annotations[i].onRemove(this);
            }

            this.annotations.length = 0;

            if (this.problemsElem) {
                this.problemsElem.empty();
            }
//            this.highlights = {};
//
//			if (Outlets.CPP.CPP_ANIMATIONS){
//				this.shadow.children("div").fadeOut(FADE_DURATION, function(){
//					$(this).remove();
//				});
//			}
//			else{
//				this.shadow.children("div").remove();
//			}
		}
	},
	
	createShadow : function(context, code, cssClass, style, zOffset){
//		var codeStr = context.text.replace(/[^\n]/g, " ");
//		var highlightedCodeStr = "";
//		this.highlightZ = this.highlightZ || 1;
//		zOffset = zOffset || 0;
//		var zIndexStr = "z-index:"+(zOffset + this.highlightZ++)+";";
//		var styleStr = "";
//		if (style){
//			for(var key in style){
//				styleStr += key + ": " + style[key] + ";";
//			}
//		}
//		highlightedCodeStr += "<div style=\""+zIndexStr+" display: none; position: absolute; background: none\">" +
//					 replaceHtmlEntities(codeStr.substring(0, code.start-context.start)) +
//					 "<span class=\"codeShadow "+cssClass+"\" style = \""+styleStr+"\">" +
//					 replaceHtmlEntities(codeStr.substring(code.start-context.start, code.end-context.start)) +
//					 "</span>" +
//					 replaceHtmlEntities(codeStr.substring(code.end-context.start)) +
//					 "</div>";
//		return highlightedCodeStr;
	}
});
$(window).on("beforeunload", CodeEditor.onbeforeunload);

var SVG_DEFS = {};


UMichEBooks.Outlets.CPP.Memory = WebOutlet.extend({
    init: function(element, memory){
        assert(isA(memory, Memory));

        this.initParent(element, true);

        this.memory = memory;
        this.listenTo(this.memory);

        this.svgElem = $('<div style="position: absolute; width: 100%; height: 100%; pointer-events: none; z-index: 10"></div>');
        this.svg = SVG(this.svgElem[0]);
        SVG_DEFS.arrowStart = this.svg.marker(6, 6, function(add){
                add.circle(5);
            }).style({
                stroke: "#000000",
                fill: "#FFFFFF",
                "stroke-width": "1px"
            });
        SVG_DEFS.arrowEnd = this.svg.marker(12, 12, function(add){
                add.path("M0,2 L0,11 L8,6 L0,2");
            }).style({
                stroke: "#000000",
                fill: "#FFFFFF",
                "stroke-width": "1px"
            });


        this.element.append(this.svgElem);

        var elem = $("<div></div>");
        Outlets.CPP.TemporaryObjects.instance(elem, this.memory, this);
        this.element.append(elem);

        elem = $("<div></div>");
        Outlets.CPP.StackFrames.instance(elem, this.memory, this);
        this.element.append(elem);

        elem = $("<div></div>");
        Outlets.CPP.Heap.instance(elem, this.memory, this);
        this.element.append(elem);

        this.element.addClass("memory");
    },

    updateArrow : function(arrow, start, end){
        start = start || arrow && arrow.oldStart;
        end = end || arrow && arrow.oldEnd;

        if (arrow && arrow.oldStart && arrow.oldEnd &&
            arrow.oldStart.left === start.left && arrow.oldStart.top === start.top &&
            arrow.oldEnd.left === end.left && arrow.oldEnd.top === end.top){
            return arrow;
        }

        var oldStart = {left:start.left,top:start.top};
        var oldEnd = {left:end.left, top:end.top};

        var off = this.svgElem.offset();
        start.left = start.left - off.left;
        start.top = start.top - off.top;
        end.left = end.left - off.left;
        end.top = end.top - off.top;
        if (arrow){
            // If arrow already exists, just update it
            if (Outlets.CPP.CPP_ANIMATIONS){
                arrow.animate(300).plot([[start.left,start.top],[end.left,end.top]]/*"M"+start.left+","+start.top+" L"+(end.left+50)+","+end.top*/);
            }
            else{
                arrow.plot([[start.left,start.top],[end.left,end.top]]/*"M"+start.left+","+start.top+" L"+(end.left+50)+","+end.top*/);
            }
        }
        else{
            arrow = this.svg.polyline([[start.left,start.top],[end.left,end.top]]/*"M"+start.left+","+start.top+" L"+end.left+","+end.top*/).style({
                stroke: "#ccccff",
                "stroke-width": "1px",
                fill: "none"
            });
            arrow.marker("start", SVG_DEFS.arrowStart);
            arrow.marker("end", SVG_DEFS.arrowEnd);
        }

        arrow.oldStart = oldStart;
        arrow.oldEnd = oldEnd;
        return arrow;
    },
    act : {
        reset : function(){
//            this.element.html(this.memory.toString());
        }

//        cleared : function(){
//            this.element.html("");
//        }
    }



});

UMichEBooks.Outlets.CPP.MemoryObject = WebOutlet.extend({
    _name: "MemoryObject",
    init: function(element, object, memoryOutlet)
    {
        this.initParent(element, true);

        this.object = object;
        this.listenTo(object);

        assert(memoryOutlet);
        this.memoryOutlet = memoryOutlet;

        this.element.addClass("code-memoryObject");
        var self = this;
        return this;
    },


    valueRead : function(){
//            this.element.html(this.object.address + ": " + this.object.toString());
        this.objElem.addClass("get");
    },
    byteRead : function(){
        this.objElem.addClass("get");
    },
    bytesRead : function(){
        this.objElem.addClass("get");
    },

    valueWritten : function(){
        this.updateObject();
        this.objElem.addClass("set");
    },
    byteWritten : function(){
        this.updateObject();
        this.objElem.addClass("set");
    },
    bytesWritten : function(){
        this.updateObject();
        this.objElem.addClass("set");
    },

//        allocated : function(){
//            this.addrElem.html("0x"+this.object.address);
////            this.objElem = $("<td><div class='entity'>"+(this.object.name || "")+
////                "</div><div class='code-memoryObject-object'>"+this.object.valueString()+
////                "</div></td>");
//            this.bytesWritten();
//        },
    allocated : function(){

    },
    deallocated : function(){
        this.element.addClass("deallocated");
    },
    leaked : function(){
        this.element.addClass("leaked");
    },
    unleaked : function(){
        //this.element.removeClass("leaked");
    },
    validitySet : function(valid){
        if (valid){
            this.objElem.removeClass("invalid");
        }
        else{
            this.objElem.addClass("invalid");
        }
    },
    callReceived : function(){
        this.element.addClass("receiver");
    },
    callEnded : function(){
        this.element.removeClass("receiver");
    },
    findOutlet : function(callback){
        callback(this);
    },

    useSVG : function(){
        this.svgElem = $('<div style="position: absolute; width: 100%; height: 100%; left: 0px; top: 0px; pointer-events: none"></div>');
        this.svg = SVG(this.svgElem[0]);
        this.element.append(this.svgElem);
    },

    //makeArrow : function(start, end){
    //    var off = this.svgElem.offset();
    //    start.left = start.left - off.left;
    //    start.top = start.top - off.top;
    //    end.left = end.left - off.left;
    //    end.top = end.top - off.top;
    //    if (!this.arrow){
    //        this.arrow = this.svg.polyline([[start.left,start.top],[end.left,end.top]]/*"M"+start.left+","+start.top+" L"+end.left+","+end.top*/).style({
    //            stroke: "#ccccff",
    //            "stroke-width": "1px",
    //            fill: "none"
    //        });
    //        this.arrow.marker("start", SVG_DEFS.arrowStart);
    //        this.arrow.marker("end", SVG_DEFS.arrowEnd);
    //    }
    //    else{
    //        if (Outlets.CPP.CPP_ANIMATIONS){
    //            this.arrow.animate(300).plot([[start.left,start.top],[end.left,end.top]]/*"M"+start.left+","+start.top+" L"+(end.left+50)+","+end.top*/);
    //        }
    //        else{
    //            this.arrow.plot([[start.left,start.top],[end.left,end.top]]/*"M"+start.left+","+start.top+" L"+(end.left+50)+","+end.top*/);
    //        }
    //    }
    //    return this.arrow;
    //},

    act : {
        valueRead : "valueRead",
        byteRead : "byteRead",
        bytesRead : "bytesRead",
        valueWritten : "valueWritten",
        byteWritten : "byteWritten",
        bytesWritten : "bytesWritten",
        allocated : "allocated",
        deallocated : "deallocated",
        leaked : "leaked",
        unleaked : "unleaked",
        callReceived : "callReceived",
        callEnded : "callEnded",
        findOutlet : "findOutlet",
        validitySet : "validitySet"

    },
    updateObject : Class._ABSTRACT

});

UMichEBooks.Outlets.CPP.SingleMemoryObject = Outlets.CPP.MemoryObject.extend({
    _name: "SingleMemoryObject",
    init: function(element, object, memoryOutlet)
    {
        this.initParent(element, object, memoryOutlet);
        this.element.addClass("code-memoryObjectSingle");

        this.addrElem = $("<div class='address'>0x"+this.object.address+"</div>");
        this.element.append(this.addrElem);

        this.objElem = $("<div class='code-memoryObject-object'>" + this.object.valueString() + "</div>");
        this.element.append(this.objElem);

        if (this.object.name) {
            this.element.append("<span> </span>");
            this.entityElem = $("<div class='entity'>" + (this.object.name || "") + "</div>");
        }
        //this.entityElem.append($("<div class='type'>" + this.object.type.englishString() + "</div>"));
        this.element.append(this.entityElem);

        this.initElement();
        this.updateObject();
        return this;
    },
    initElement : function(){

    },
    updateObject : function(){
        var elem = this.objElem;
        var str = this.object.valueString();
        if (isA(this.object.type, Types.Char)){
            str = str.substr(1,str.length-2);
        }
        elem.html(str);
        if (this.object.isValueValid()){
            elem.removeClass("invalid");
        }
        else{
            elem.addClass("invalid");
        }
    }
});

UMichEBooks.Outlets.CPP.TreeMemoryObject = Outlets.CPP.SingleMemoryObject.extend({
    _name: "TreeMemoryObject",

    init: function(element, object, memoryOutlet){
        this.initParent(element, object, memoryOutlet);
        this.objElem.css("white-space", "pre");
    },

    updateObject : function(){
        this.objElem.html(breadthFirstTree(this.object.rawValue()));
    }
});


UMichEBooks.Outlets.CPP.PointerMemoryObject = Outlets.CPP.SingleMemoryObject.extend({
    _name: "PointerMemoryObject",
    showPtdArray : true,
    pointerMemoryObjects : [],
    updateArrows : function(){
        var self = this;
        Outlets.CPP.PointerMemoryObject.pointerMemoryObjects = Outlets.CPP.PointerMemoryObject.pointerMemoryObjects.filter(function(ptrMemObj){
            if (jQuery.contains(document, ptrMemObj.element[0])) {
                ptrMemObj.updateArrow();
                return true;
            }
            else{ //Element is detached
                ptrMemObj.clearArrow();
                return false;
            }
        });
    },
    init: function(element, object, memoryOutlet){
        this.initParent(element, object, memoryOutlet);
        this.useSVG();
        var self = this;
        this.pointedObjectActor = Actor.instance({
            deallocated: function(msg){
                self.updateObject();
            }
        });
        this.pointerMemoryObjects.push(this);
    },

    initElement: function(){
        this.objElem.css("white-space", "pre");

        this.ptdArrayElem = $('<div class="ptd-array"></div>');
        this.element.append(this.ptdArrayElem);
    },

    updateArrow : function(){
        if (!this.pointedObject || !this.pointedObject.isAlive()) {
            this.clearArrow();
            return;
        }
        if (isA(this.object.type, Types.ArrayPointer)) {
            this.makeArrayPointerArrow();
            return;
        }
        if (isA(this.object.type, Types.ObjectPointer)){
            this.makeObjectPointerArrow();
        }
    },

    clearArrow : function(){
        this.arrow && this.arrow.remove();
        delete this.arrow;
    },

    updateObject : function(){
        var elem = this.objElem;

        var newPointedObject;
        if (isA(this.object.type, Types.ArrayPointer)){
            newPointedObject = this.object.type.getArrayObject();;
        }
        else if (isA(this.object.type, Types.ObjectPointer)){
            newPointedObject = this.object.type.getPointedObject();
        }

        if (this.pointedObject !== newPointedObject){
            if (this.pointedObject){
                this.pointedObject.removeListener(this.pointedObjectActor);
            }

            this.pointedObject = newPointedObject;

            if (this.pointedObject){
                this.pointedObject.addListener(this.pointedObjectActor);
            }
            else{
                this.clearArrow();
            }
        }

        elem.html(this.object.valueString());
        if (this.object.isValueValid()){
            elem.removeClass("invalid");
        }
        else{
            elem.addClass("invalid");
        }
    },

    setPtdArray : function(arrObj){
        //// If null, change to non-pointer array
        //if (arrObj === null){
        //    if (this.ptdArray !== null){
        //        this.ptdArrayElem.slideUp(function(){$(this).empty()});
        //    }
        //    this.arrow && this.arrow.remove();
        //    this.arrow = null;
        //    this.ptdArray = null;
        //    this.ptdArrayOutlet = null;
        //    return;
        //}
        //
        //var self = this;
        //// Not null here
        //if (this.ptdArray !== arrObj){
        //    if (!this.ptdArray){
        //        this.ptdArray = arrObj;
        //        this.ptdArrayOutlet = Outlets.CPP.ArrayMemoryObject.instance(this.ptdArrayElem, this.ptdArray, this.memoryOutlet);
        //        // Set arrow to point to appropriate place
        //
        //        this.ptdArrayElem.slideDown(function(){
        //            // Set arrow to point to appropriate place
        //            if (self.ptdArray) {
        //                self.makePointerArrow();
        //            }
        //        });
        //    }
        //    else{
        //        this.arrow && this.arrow.remove();
        //        this.arrow = null;
        //        this.ptdArrayElem.empty();
        //        this.ptdArray = arrObj;
        //        this.ptdArrayOutlet = Outlets.CPP.ArrayMemoryObject.instance(this.ptdArrayElem, this.ptdArray, this.memoryOutlet);
        //        // Set arrow to point to appropriate place
        //        if (self.ptdArray) {
        //            self.makePointerArrow();
        //        }
        //    }
        //}
        //else{
        //    if (self.ptdArray) {
        //        self.makePointerArrow();
        //    }
        //}


    },
    makeObjectPointerArrow : function(){
        if (!this.pointedObject){
            return;
        }
        var endOff;
        var pointedOutlet;
        if (this.pointedObject.isAlive()) {
            this.pointedObject.send("findOutlet", function (outlet) {
                pointedOutlet = pointedOutlet || outlet;
            });
            endOff = pointedOutlet.objElem.offset();
            endOff.left += pointedOutlet.objElem.outerWidth()/2;
            //endOff.top += pointedOutlet.objElem.outerHeight();
        }
        var startOff = this.objElem.offset();
        startOff.left += this.objElem.outerWidth()/2;

        // If start is below end (greater offset), we move top of end to bottom.
        if (startOff.top > endOff.top && pointedOutlet) {
            endOff.top += pointedOutlet.objElem.outerHeight();
        }
        else{
            startOff.top += this.objElem.outerHeight();
        }


        this.arrow = this.memoryOutlet.updateArrow(this.arrow, startOff, endOff);
    },
    makeArrayPointerArrow : function(){

        var value = this.object.rawValue();
        var type = this.object.type;
        var off;
        var arrayOutlet;
        var elem;

        if (this.pointedObject.isAlive()) {
            this.pointedObject.send("findOutlet", function(outlet){ arrayOutlet = arrayOutlet || outlet; });
            if (!arrayOutlet){
                // do nothing
            }
            else if (value < type.min()) {
                var first = arrayOutlet.elemOutlets[0].objElem;
                off = first.offset();
                var n = type.toIndex(value);
                off.left += (n + 0.5) * first.outerWidth() * 0.8;
            }
            else if (value === type.onePast()) {
                var last = elem = arrayOutlet.elemOutlets[type.arrObj.type.length - 1].objElem;
                off = last.offset();
                off.left += 0.5 * last.outerWidth() * 0.8;
                off.top += 1.5 * last.outerHeight() * 0.8;
            }
            else if (value > type.onePast()) {
                var last = elem = arrayOutlet.elemOutlets[type.arrObj.type.length - 1].objElem;
                off = last.offset();
                var n = type.toIndex(value) - type.arrObj.type.length;
                off.left += (n + 1.5) * last.outerWidth() * 0.8;
            }
            else {
                var index = type.toIndex(value);
                elem = arrayOutlet.elemOutlets[index].objElem;
                //elem.css("background-color", "red");
                off = elem.offset();
                off.left += elem.outerWidth() / 2 * 0.8;
            }
        }
        //off.top -= 2;
        var beginOff = this.objElem.offset();
        beginOff.left += this.objElem.outerWidth()/2;


        // If start is below end (greater offset), we move top of end to bottom.
        if (off && beginOff.top > off.top) {
            off.top += elem.outerHeight();
        }
        else{
            beginOff.top += this.objElem.outerHeight();
        }

        this.arrow = this.memoryOutlet.updateArrow(this.arrow, beginOff, off);
    }
});
setInterval(function(){
    var temp = Outlets.CPP.CPP_ANIMATIONS;
    Outlets.CPP.CPP_ANIMATIONS = false;
    Outlets.CPP.PointerMemoryObject.updateArrows();
    Outlets.CPP.CPP_ANIMATIONS = temp;
}, 20);

UMichEBooks.Outlets.CPP.ReferenceMemoryObject = Outlets.CPP.MemoryObject.extend({
    _name: "ReferenceMemoryObject",
    init: function(element, object, memoryOutlet)
    {
        this.initParent(element, object, memoryOutlet);
        this.element.addClass("code-memoryObjectSingle");

        this.addrElem = $("<td class='address'></td>");
        this.objElem = $("<td><div class='entity'>"+(this.object.name || "")+
        "</div><div class='code-memoryObject-object'>"+
        "</div></td>");
        this.element.append("<table><tr></tr></table>");
        this.element.find("tr").append(this.addrElem).append(this.objElem);
        this.objElem = this.objElem.find(".code-memoryObject-object");

        return this;
    },

    bound : function(){
        if (this.object.refersTo.name){
            this.objElem.html(this.object.refersTo.name);
        }
        else{
            this.objElem.html("@"+this.object.refersTo.address);
        }
//            this.objElem = $("<td><div class='entity'>"+(this.object.name || "")+
//                "</div><div class='code-memoryObject-object'>"+this.object.valueString()+
//                "</div></td>");
        this.bytesWritten();
    },

    updateObject : function(){
//        this.objElem.html(this.object.valueString());
    },
    act: copyMixin(Outlets.CPP.MemoryObject.act, {
        bound: "bound"
    })
});

UMichEBooks.Outlets.CPP.ArrayMemoryObject = Outlets.CPP.MemoryObject.extend({
    _name: "ArrayMemoryObject",
    init: function(element, object, memoryOutlet)
    {
        this.initParent(element, object, memoryOutlet);
        this.length = this.object.elemObjects.length;
        this.element.addClass("code-memoryObjectArray");

        this.addrElem = $("<div class='address' style='visibility: hidden;'>0x"+this.object.address+"</div>");
        this.nameElem = $('<div class="entity">'+(this.object.name || "")+'</div>');
        this.objElem = $("<div class='array'></div>");

        this.elemOutlets = [];
        for(var i = 0; i < this.length; ++i){
            var elemElem = $('<div></div>');
            var elemContainer = $('<div style="display: inline-block; margin-bottom: 5px; text-align: center" class="arrayElem"></div>');
            elemContainer.append(elemElem);
            elemContainer.append('<div style="line-height: 1ch; font-size: 6pt">'+i+'</div>');
            this.objElem.append(elemContainer);
            if (isA(this.object.type.elemType, Types.Class)){
                this.elemOutlets.push(createMemoryObjectOutlet(elemElem, this.object.elemObjects[i], this.memoryOutlet));
            }
            else{
                this.elemOutlets.push(Outlets.CPP.ArrayElemMemoryObject.instance(elemElem, this.object.elemObjects[i], this.memoryOutlet));
            }

            // 2D array
            if (isA(this.object.type.elemType, Types.Array)){
                this.objElem.append("<br />");
            }
            //else{
            //    this.objElem.append("<br />");
            //}
//            if (i % 10 == 9){
//                this.objElem.append("<br />");
            // }
        }
        this.updateObject();
        this.element.append(this.addrElem);
        this.element.append(this.nameElem).append(this.objElem);

        return this;
    },

    updateObject : function(){
//        var elemType = this.object.type.elemType;
//        var value = this.object.getValue();
//        for(var i = 0; i < this.length; ++i){
//            this.elemOutlets[i].updateObject();
//        }
    },

//    updateElems : function(addr, length, func){
//        var endAddr = addr + length;
//        var beginIndex = Math.floor(( addr - this.object.address ) / this.object.type.elemType.size);
//        var endIndex = Math.min(
//            beginIndex + Math.ceil(length / this.object.type.elemType.size),
//            this.object.type.length);
//
//        for(var i = beginIndex; i < endIndex; ++i){
//            var elem = this.elemObjects[i];
//            elem[func](Math.max(this.elemObject[i]));
//        }
//    },

    valueRead: function () {
//        this.element.find(".code-memoryObject-object").addClass("get");
    },
    byteRead: function (data) {
//        this.updateElems(data.addr, 1, "get")
    },
    bytesRead: function (data){
//        this.updateElems(data.addr, data.length, "get")
    },

    valueWritten: function () {
//        this.updateObject();
//        this.element.find(".code-memoryObject-object").addClass("set");
    },
    byteWritten: function (data) {
//        this.updateObject();
//        this.updateElems(data.addr, 1, "set")
    },
    bytesWritten: function (data) {
//        this.updateObject();
//        this.updateElems(data.addr, data.values.length, "set")
    }
});

UMichEBooks.Outlets.CPP.ArrayElemMemoryObject = Outlets.CPP.MemoryObject.extend({
    _name: "ArrayElemMemoryObject",
    init: function(element, object, memoryOutlet)
    {
        this.initParent(element, object, memoryOutlet);

        this.element.addClass("array");
        this.objElem = $('<span class="code-memoryObject-object"></span>');
        this.element.append(this.objElem);

        this.updateObject();
        return this;
    },

    updateObject : function(){
        var elem = this.objElem;
        var str = this.object.valueString();
        if (isA(this.object.type, Types.Char)){
            str = str.substr(1,str.length-2);
        }
        elem.html(str);
        if (this.object.isValueValid()){
            elem.removeClass("invalid");
        }
        else{
            elem.addClass("invalid");
        }
    }
});

UMichEBooks.Outlets.CPP.ClassMemoryObject = Outlets.CPP.MemoryObject.extend({
    _name: "ClassMemoryObject",
    init: function(element, object, memoryOutlet)
    {
        this.initParent(element, object, memoryOutlet);
        assert(isA(this.object.type, Types.Class));
        this.length = this.object.subobjects.length;
        this.element.addClass("code-memoryObjectClass");


        this.objElem = $("<div class='classObject'></div>");

        var className = this.object.type.className + (isA(this.object, BaseClassSubobject) ? " (base)" : "");
        this.classHeaderElem = $('<div class="classHeader"></div>');
        this.objElem.append(this.classHeaderElem);

        // Only show name and address for object if not a base class subobject
        if (!isA(this.object, BaseClassSubobject)){
            if (isA(this.object, DynamicObjectEntity)){
                this.addrElem = $("<td class='address'>0x"+this.object.address+"</td>");
                this.classHeaderElem.append(this.addrElem);
            }

            if (this.object.name){
                this.entityElem = $("<div class='entity'>" + (this.object.name || "") + "</div>");
                this.classHeaderElem.append(this.entityElem);
            }
        }

        this.classHeaderElem.append($('<span class="className">'+className+'</span>'));




        this.membersElem = $('<div class="members"></div>');

        this.memberOutlets = [];
        for(var i = 0; i < this.length; ++i){
            var elemElem = $("<div></div>");
            this.membersElem.append(elemElem);
            this.memberOutlets.push(createMemoryObjectOutlet(elemElem, this.object.subobjects[i], this.memoryOutlet));
//            if (i % 10 == 9){
//                this.objElem.append("<br />");
            // }
        }
        this.objElem.append(this.membersElem);


        this.element.append(this.objElem);

        return this;
    },

    valueRead: function () {
    },
    byteRead: function (data) {
    },
    bytesRead: function (data){
    },
    valueWritten: function () {
    },
    byteWritten: function (data) {
    },
    bytesWritten: function (data) {
    },
    updateObject : function(){}
});



var createMemoryObjectOutlet = function(elem, obj, memoryOutlet){
    if(isA(obj.type, Types.Reference)){
        return Outlets.CPP.ReferenceMemoryObject.instance(elem, obj, memoryOutlet);
    }
    else if(isA(obj.type, Types.Pointer)) {
        return Outlets.CPP.PointerMemoryObject.instance(elem, obj, memoryOutlet);
    }
    else if(isA(obj.type, Types.Array)) {
        return Outlets.CPP.ArrayMemoryObject.instance(elem, obj, memoryOutlet);
    }
    else if(isA(obj.type, Types.Tree_t)) {
        return Outlets.CPP.TreeMemoryObject.instance(elem, obj, memoryOutlet);
    }
    else if(isA(obj.type, Types.Class)) {
        return Outlets.CPP.ClassMemoryObject.instance(elem, obj, memoryOutlet);
    }
    else{
        return Outlets.CPP.SingleMemoryObject.instance(elem, obj, memoryOutlet);
    }
};

UMichEBooks.Outlets.CPP.StackFrame = WebOutlet.extend({
    init: function(element, frame, memoryOutlet)
    {
        this.initParent(element, true);
        this.frame = frame;
        this.listenTo(frame);

        this.memoryOutlet = memoryOutlet;

        this.customizations = OutletCustomizations.func[this.frame.func.entityId];
        if (!this.customizations){
            this.customizations = OutletCustomizations.func[this.frame.func.entityId] = {
                minimize: "show"
            };
        }


        this.element.addClass("code-stackFrame");

        this.header = $("<div class='header'></div>");
        this.element.append(this.header);

        this.body = $("<div class='body'></div>");
        this.element.append(this.body);

        this.minimizeButton = $("<span class='button'></span>");

        if(this.customizations.minimize === "show"){
            this.minimizeButton.html("hide");
        }
        else{
            this.minimizeButton.html("show");
            this.body.css("display", "none");
        }

        var self = this;
        this.minimizeButton.click(function(){
            self.body.slideToggle();
            if ($(this).html() === "hide"){
                $(this).html("show");
                self.customizations.minimize = "hide";
            }
            else{
                $(this).html("hide");
                self.customizations.minimize = "show";
            }
        });
        this.header.append(this.frame.func.name);
        this.header.append(this.minimizeButton);

        // REMOVE: this is taken care of by actually adding a memory object for the this pointer
        //if (this.frame.func.isMemberFunction){
        //    var elem = $("<div></div>");
        //    createMemoryObjectOutlet(elem, this.frame.objects[key], this.memoryOutlet);
        //    this.body.append(elem);
        //}

        for(var key in this.frame.objects){
            var elem = $("<div></div>");
            createMemoryObjectOutlet(elem, this.frame.objects[key], this.memoryOutlet);
            this.body.prepend(elem);
        }
        for(var key in this.frame.references){
            var elem = $("<div></div>");
            createMemoryObjectOutlet(elem, this.frame.references[key], this.memoryOutlet);
            this.body.prepend(elem);
        }

//        this.element.html(this.frame.toString());

        return this;
    }

});

var OutletCustomizations = {
    temporaryObjects : {
        minimize: "hide"
    },
    func:{

    }
};


UMichEBooks.Outlets.CPP.StackFrames = WebOutlet.extend({
    init: function(element, memory, memoryOutlet)
    {
        this.initParent(element, true);

        this.memory = memory;
        this.listenTo(memory);

        this.memoryOutlet = memoryOutlet;

        this.element.addClass("code-memoryStack");

        this.header = $("<div class='header'>The Stack</div>");
        this.element.append(this.header);

        this.frameElem = $('<div class="body"></div>');
        this.element.append(this.frameElem);

        this.count = 0;

        this.frames = [];
        // this.framesElement = this.element;



        return this;
    },

    /* Possible updates
     *
     */
    act : {
        framePushed: function(msg){
            //if (msg.data.func.context.implicit){
            //    return;
            //}
            var frame = msg.data;
            var frameElem = $("<div style=\"display: none\"></div>");
            Outlets.CPP.StackFrame.instance(frameElem, frame, this.memoryOutlet);

            this.frames.push(frameElem);
            this.frameElem.prepend(frameElem);
            if (Outlets.CPP.CPP_ANIMATIONS){
                (this.frames.length == 1 ? frameElem.fadeIn(FADE_DURATION) : frameElem.slideDown(SLIDE_DURATION));
            }
            else{
                frameElem.css({display: "block"});
            }
        },
        framePopped: function(msg){
            //if (msg.data.func.context.implicit){
            //    return;
            //}
//            if (this.frames.length == 1){
//                var popped = this.frames.last();
//                this.frames.pop();
//                popped.remove();
//            }
//            else{
                if (Outlets.CPP.CPP_ANIMATIONS){
                    var popped = this.frames.last();
                    this.frames.pop();
                    popped.slideUp(SLIDE_DURATION, function(){
                        $(this).remove();
                    });
                }
                else{
                    var popped = this.frames.last();
                    this.frames.pop();
                    popped.remove();
                }
//            }
        },
        reset: function(msg){
            this.frames.clear();
            this.frameElem.children("div").remove();
        }
    }
});


UMichEBooks.Outlets.CPP.Heap = WebOutlet.extend({
    init: function(element, memory, memoryOutlet)
    {
        this.initParent(element, true);
        this.element.addClass("code-memoryHeap");

        this.header = $("<div class='header'>The Heap</div>");
        this.element.append(this.header);

        this.objectElem = $("<div></div>");
        this.element.append(this.objectElem);

        this.memory = memory;
        this.listenTo(memory);

        this.memoryOutlet = memoryOutlet;

        this.objectElems = {};

        return this;
    },

    act : {
        heapObjectAllocated: function(msg){
            var obj = msg.data;
            var elem = $("<div style='display: none'></div>");
            createMemoryObjectOutlet(elem, obj, this.memoryOutlet);

            this.objectElems[obj.address] = elem;
            this.objectElem.prepend(elem);
            if (Outlets.CPP.CPP_ANIMATIONS){
                elem.slideDown(SLIDE_DURATION);
            }
            else{
                elem.css({display: "block"});
            }
        },
        heapObjectDeleted: function(msg){
            var addr = msg.data.address;
            if (this.objectElems[addr]) {
                this.objectElems[addr].fadeOut(function () {
                    $(this).remove();
                });
                delete this.objectElems[addr];
            }
        },
        reset: function(msg){
            this.objects = {};
            this.objectElem.children().remove();
        }
    }
});


UMichEBooks.Outlets.CPP.TemporaryObjects = WebOutlet.extend({
    init: function(element, memory, memoryOutlet)
    {
        this.initParent(element, true);
        this.element.addClass("code-memoryTemporaryObjects");

        this.customizations = OutletCustomizations.temporaryObjects;

        this.header = $("<div class='header'>Temporary Objects</div>");
        this.element.append(this.header);
        this.minimizeButton = $("<span class='button'></span>");


        this.objectElem = $("<div></div>");
        this.element.append(this.objectElem);

        if(this.customizations.minimize === "show"){
            this.minimizeButton.html("hide");
        }
        else{
            this.minimizeButton.html("show");
            this.objectElem.css("display", "none");
        }

        var self = this;
        this.minimizeButton.click(function(){
            self.objectElem.slideToggle();
            if ($(this).html() === "hide"){
                $(this).html("show");
                self.customizations.minimize = "hide";
            }
            else{
                $(this).html("hide");
                self.customizations.minimize = "show";
            }
        });
        this.header.append(this.minimizeButton);

        this.memory = memory;
        this.listenTo(memory);

        this.memoryOutlet = memoryOutlet;

        this.objectElems = {};

        return this;
    },

    act : {
        temporaryObjectAllocated: function(msg){
            var obj = msg.data;
            var elem = $("<div style='display: none'></div>");
            createMemoryObjectOutlet(elem, obj, this.memoryOutlet);

            this.objectElems[obj.address] = elem;
            this.objectElem.prepend(elem);
            if (Outlets.CPP.CPP_ANIMATIONS){
                elem.slideDown(SLIDE_DURATION);
            }
            else{
                elem.css({display: "block"});
            }
        },
        temporaryObjectDeallocated: function(msg){
            var addr = msg.data.address;
            if (this.objectElems[addr]) {
                this.objectElems[addr].fadeOut(function () {
                    $(this).remove();
                });
                delete this.objectElems[addr];
            }
        },
        reset: function(msg){
            this.objects = {};
            this.objectElem.children().remove();
        }
    }
});

UMichEBooks.Outlets.CPP.RunningCode = WebOutlet.extend({
    _name: "WebOutlet",
    init: function(element, sim, simOutlet){
        this.initParent(element, true);
        this.sim = sim;
        this.listenTo(sim);

        this.simOutlet = simOutlet;
    },
    pushed: function(codeInst){
        // main has no caller, so we have to handle creating the outlet here
        if (codeInst.model.context.mainCall) {
            this.mainCall = Outlets.CPP.FunctionCall.instance(codeInst, this);
        }

    },

    valueTransferOverlay : function(fromOutlet, toOutlet, html, duration, afterCallback){
        var from = fromOutlet.element;
        var to = toOutlet.element;
        if (Outlets.CPP.CPP_ANIMATIONS) {
            var simOff = this.element.offset();
            var fromOff = from.offset();
            var toOff = to.offset();
            var fromWidth = from.css("width");
            var toWidth = to.css("width");

            var over = $("<div class='code overlayValue'>" + html + "</div>");
            over.css({left: fromOff.left - simOff.left, top : fromOff.top - simOff.top + this.element[0].scrollTop});
            over.css({width: fromWidth});
            this.overlayElem.prepend(over);
            over.animate({
                left: toOff.left - simOff.left,
                top: toOff.top - simOff.top + this.element[0].scrollTop,
                width: toWidth
            }, duration, function () {
                if(afterCallback){
                    afterCallback();
                }
                $(this).remove();
            });
        }
        else{
            if (afterCallback){
                afterCallback();
            }
        }
    },
    afterFullStep : function(inst){
        if (!inst) { return; }
        var self = this;
        inst.identify("idCodeOutlet", function(codeOutlet){
            if (codeOutlet.simOutlet === self){
                self.scrollTo(codeOutlet)
            }
        });
    },
    scrollTo : Class._ABSTRACT,
    started : function(){
        $(".code-memoryObject .get").removeClass("get");
    },
    refresh : function(){
        this.cleared();
        this.mainCall.removeInstance();
        this.mainCall = Outlets.CPP.FunctionCall.instance(this.sim.mainInst, this);
        this.started();
        var last = this.sim._execStack.last();
        if (last) {
            last.send("upNext");
            last.funcContext.send("currentFunction");
        }
    },
    act : {
        pushed: true,
        started: true,
        cleared: true,
        afterFullStep: true
    }
});

UMichEBooks.Outlets.CPP.SimulationStack = Outlets.CPP.RunningCode.extend({
    _name: "SimulationStack",
    init: function(element, sim, simOutlet)
    {
        this.initParent(element, sim, simOutlet);

        this.overlayElem = $("<div class='overlays'></div>");
        this.stackFramesElem = $("<div class='code-simStack'></div>");

        this.element.append(this.overlayElem);
        this.element.append(this.stackFramesElem);

        this.element.addClass("code-simulation");

        this.count = 0;

        this.frames = [];
        // this.framesElement = this.element;


        return this;
    },

    pushFunction : function(funcInst, callOutlet){
        //if (funcInst.model.context.implicit){
        //    return;
        //}

        // Set up DOM element for outlet
        var frame = $("<div style= 'display: none'></div>");
        var functionElem = $("<div></div>");
        frame.append(functionElem);
        this.frames.push(frame);
        this.stackFramesElem.prepend(frame);

        // Create outlet using the element
        var funcOutlet = Outlets.CPP.Function.instance(functionElem, funcInst, this, callOutlet);

        // Animate!
        if (Outlets.CPP.CPP_ANIMATIONS){
            (this.frames.length == 1 ? frame.fadeIn(FADE_DURATION) : frame.slideDown({duration: SLIDE_DURATION, progress: function(){
//                elem.scrollTop = elem.scrollHeight;
            }}));
        }
        else{
            frame.css({display: "block"});
//            this.element[0].scrollTop = this.element[0].scrollHeight;
        }


        return funcOutlet;
    },

    popFunction : function(funcInst){
        //if (funcInst.model.context.implicit){
        //    return;
        //}
        var popped = this.frames.last();
        this.frames.pop();
        if (this.frames.length == 0 || !Outlets.CPP.CPP_ANIMATIONS){
            popped.remove();
        }
        else{
            popped.slideUp(SLIDE_DURATION, function(){
                $(this).remove();
            });
        }
    },
    cleared: function(){
        this.frames.clear();
        this.stackFramesElem.children().remove();
    },

    //refresh : Class.ADDITIONALLY(function(){
    //    this.frames.clear();
    //    this.stackFramesElem.children().remove();
    //}),

    scrollTo : function(codeOutlet){
        //var self = this;
        //var thisTop = this.element.offset().top;
        //var codeTop = codeOutlet.element.offset().top;
        //this.element.finish().animate({
        //    scrollTop: codeOutlet.element.offset().top - self.stackFramesElem.offset().top
        //}, 1000);
    }

});


UMichEBooks.Outlets.CPP.SourceSimulation = Outlets.CPP.RunningCode.extend({
    _name: "SourceSimulation",
    init: function(element, sim, simOutlet)
    {
        this.initParent(element, sim, simOutlet);

        this.overlayElem = $("<div class='overlays'></div>");
        this.functionsElem = $("<div class='code-simStack'></div>");

        this.element.append(this.overlayElem);
        this.element.append(this.functionsElem);

        this.element.addClass("code-simulation");

        this.functions = {};
        this.functionInstances = {};
        // this.framesElement = this.element;


        return this;
    },

    setUpTopLevelDeclarations : function(){
        var self = this;
        this.sim.topLevelDeclarations.forEach(function(decl){
            if (isA(decl, FunctionDefinition)){
                // Set up DOM element for outlet
                var elem = $("<div style= 'display: block'></div>");
                var functionElem = $("<div></div>");
                elem.append(functionElem);
                self.functionsElem.append(elem);

                // Create outlet using the element
                self.functions[decl.id] = Outlets.CPP.Function.instance(functionElem, decl, self);
                self.functionInstances[decl.id] = [];
            }
        });
    },

    pushFunction : function(funcInst, callOutlet){

        var instances = this.functionInstances[funcInst.model.id];

        if (instances){
            // Add instance to stack for each function.
            instances.push(funcInst);

            var funcOutlet = this.functions[funcInst.model.id];
            funcOutlet.setInstance(funcInst);

            return funcOutlet;
        }
    },

    popFunction : function(funcInst){

        var insts = this.functionInstances[funcInst.model.id];
        var funcOutlet = this.functions[funcInst.model.id];
        if (insts && funcOutlet){
            insts.pop();
            if (insts.length === 0){
                funcOutlet.removeInstance();
            }
            else{
                funcOutlet.setInstance(insts.last());
            }
        }
    },

    valueTransferOverlay : function(fromOutlet, toOutlet, html, duration, afterCallback){

        // Check to see if the first function parent of the outlets are the same. If they are, don't animate.
        // Actual check is done in big if below.
        var fromFuncOutlet = fromOutlet;
        var toFuncOutlet = toOutlet;
        while(fromFuncOutlet && !isA(fromFuncOutlet, Outlets.CPP.Function)){ fromFuncOutlet = fromFuncOutlet.parent;}
        while(toFuncOutlet && !isA(toFuncOutlet, Outlets.CPP.Function)){ toFuncOutlet = toFuncOutlet.parent;}

        if (fromFuncOutlet !== toFuncOutlet) {
            // Use parent implementation to show transfer and do callback
            Outlets.CPP.SourceSimulation._parent.valueTransferOverlay.apply(this, arguments);
        }
        else{
            // Just do callbacks (which might e.g. have parameter outlet show arg value)
            afterCallback && afterCallback();
        }
    },

    started: Class.ADDITIONALLY(function(){
        this.setUpTopLevelDeclarations();
        var self = this;
        this.sim.peek().identify("idCodeOutlet", function(codeOutlet){
            if (codeOutlet.simOutlet === self){
                self.scrollTo(codeOutlet)
            }
        });
    }),

    cleared : function(){
        this.functions = {};
        this.functionInstances = {};
        this.functionsElem.children().remove();
    },
    scrollTo : function(codeOutlet){
        var self = this;
        var thisTop = this.element.offset().top;
        var codeTop = codeOutlet.element.offset().top;
        var halfHeight = this.element.height() / 2;

        // scrollTop value which would put the codeoutlet right at the top.
        var scrollAtTop = codeOutlet.element.offset().top - self.functionsElem.offset().top;
        var scrollAtMiddle = scrollAtTop - halfHeight;

        // compute how much we're off from the middle
        var diff = scrollAtMiddle - this.element.scrollTop();

        // If diff, the offset from the middle, is within 30 px of the half height, then scroll to middle
        if (Math.abs(diff) > halfHeight-30){
            if (Outlets.CPP.CPP_ANIMATIONS){
                // TODO: change back to finish() and update local jquery
                this.element.clearQueue().animate({
                    scrollTop: scrollAtMiddle
                }, 1000);
            }
            else{
                this.element.scrollTop(scrollAtMiddle);
            }
        }

        // target


    }

});





UMichEBooks.Outlets.CPP.Code = WebOutlet.extend({
    _name: "Outlets.CPP.Code",
    init: function (element, code, simOutlet, parent) {
        this.initParent(element);

        this.simOutlet = simOutlet;

        if (code.isA(CPPCode)){
            this.code = code;
        }
        else if (code.isA(CPPCodeInstance)){
            this.code = code.model;
        }
        else{
            assert(false); // must be one of those two
        }

        if (parent){
            parent.addChild(this);
        }

        // children are stored by the ID of the CPPCode they display
        this.children = {};

        this.element.addClass("codeInstance");
        this.element.append("<span class=\"highlight\"></span>");
        this.menuElem = $('<span class="menu"></span>');
        this.element.append(this.menuElem);

        this.createElement();

        if (code.isA(CPPCodeInstance)){
            this.setInstance(code);
        }
    },

    createElement: function(){
        // hook
    },

    setInstance: function(inst){
        if (this.inst){
            this.removeInstance(this.inst);
            //this.inst.removeListener(this);
        }
        this.inst = inst;
        if (this.inst){
            inst.addListener(this);
        }
        //this.element.addClass("hasInst");
        this.instanceSet();
        for(var i = 0; i < this.inst.pushedChildren.length; ++i){
            this.childPushed(this.inst.pushedChildren[i]);
        }
//        console.log("instance set for " + this._name);
    },

    instanceSet : function(){
        this.element.removeClass("upNext");
        this.element.removeClass("wait");
    },

    removeInstance : function(){

        // Note: should be a fact that if I have no instance, neither do my children
        var inst = this.inst;
        if (this.inst){

            // Stop listening
            this.inst.removeListener(this);

            // First remove children instances (deepest children first)
            for (var c in this.children){
                this.children[c].removeInstance();
            }

            // TODO: This comment was here but I don't know why I made that choice??? I changed it back.
            // We don't actually delete the instance or stop listening to it here.
            // We only do that when a different instance is set.
            this.instanceRemoved(inst);
        }
        //this.element.removeClass("hasInst");
    },

    instanceRemoved : function(){
        this.element.removeClass("upNext");
        this.element.removeClass("wait");
    },

    addChild: function(child){
        this.children[child.code.id] = child;
        child.parent = this;
        return child;
    },

    upNext: function(){
        this.element.removeClass("wait");
        this.element.addClass("upNext");

        //// Find function outlet in ancestors and scroll so this is visible
        //if (!isA(this, Outlets.CPP.Statement) || isA(this, Outlets.CPP.Block)){
        //    return;
        //}
        //
        //var parent = this.element.closest(".codeInstance.function");
        //
        //if (parent){
        //    var parentTop = parent.offset().top;
        //    var top = this.element.offset().top;
        //    if(top != parentTop){
        //        var old = parent.scrollTop();
        //        if (Math.abs(old - (top - parentTop)) > 50){
        //            parent.scrollTop(top - parentTop);
        //        }
        //    }
        //}
    },

    wait: function(){
        this.element.removeClass("upNext");
        this.element.addClass("wait");
    },

    popped: function(){
        if (this.inst.stackType == "call"){
            this.simOutlet.popFunction(this.inst);
        }
        this.element.removeClass("upNext");
        this.element.removeClass("wait");
    },

    // Called when child instance is created under any instance this
    // outlet is listening to. Looks for a child outlet of this outlet
    // that is waiting for the code model associated with the instance.
    // Propagates the child instance upward through ancestors until one
    // is found that was waiting for it.
    childPushed : function(childInst){
        var childOutlet = this.children[childInst.model.id];
        if (childOutlet){
            childOutlet.setInstance(childInst);
            return;
        }

        if (this.parent){
            this.parent.childPushed(childInst);
        }
        else{
            // Just ignore it?
            console.log("WARNING! Child instance pushed for which no corresponding child outlet was found! (" + childInst.model.toString() + ")");
        }
    },

    setCurrent: function(isCurrent) {
        if (isCurrent){
            this.addClass("current");
        }
        else{
            this.removeClass("current");
        }
    },

    act: {
        childPushed: "childPushed",
        upNext: function(){
            this.upNext();
        },
        wait: function(){
            this.wait();
        },
        popped: function(){
            this.popped();
        },
        reset: function(){
            this.removeInstance();
        },
        current: "current",
        uncurrent: true,
        idCodeOutlet: DataPath._IDENTIFY
    }
});

UMichEBooks.Outlets.CPP.Function = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.Function",

    init: function(element, codeOrInst, simOutlet, parent){
        //assert(isA(callInst, CPPCodeInstance) && isA(callInst.model, FunctionCall));
        this.initParent(element, codeOrInst, simOutlet, parent);



    },
    createElement : function(){
        this.element.addClass("function");

        // Set up DOM and child outlets
        if (!isA(this.code, ConstructorDefinition) && !isA(this.code, DestructorDefinition)){ // Constructors/destructors use this outlet too for now and they don't have return type
            var returnTypeElem = $('<span class="code-returnType">' + this.code.type.returnType.toString() + "</span>");
            this.element.append(returnTypeElem);
            this.element.append(" ");
        }
        var nameElem = $('<span class="code-functionName">' + this.code.name + "</span>");


        this.element.append(nameElem);

        this.paramsElem = $("<span></span>");
        this.setUpParams();
        this.element.append(this.paramsElem);


        // ctor-initializer
        var memInits = this.code.sub.memberInitializers;
        if (memInits && memInits.length > 0){
            this.element.append("\n : ");
            for(var i = 0; i < memInits.length; ++i){
                var mem = memInits[i];
                this.element.append(htmlDecoratedName(mem.entity.name, mem.entity.type));
                var memElem = $("<span></span>");
                this.addChild(createOutlet(memElem, mem, this.simOutlet));
                this.element.append(memElem);
                if (i != memInits.length - 1){
                    this.element.append(", ");
                }
            }
        }

        var bodyElem = $("<span></span>");
        this.body = Outlets.CPP.Block.instance(bodyElem, this.code.body, this.simOutlet);
        this.element.append(bodyElem);
        this.addChild(this.body);

        var self = this;
        if (this.code.autosToDestruct){
            this.code.autosToDestruct.forEach(function(dest){
                self.addChild(Outlets.CPP.FunctionCall.instance(dest, self.simOutlet, self, []));
            });
        }
        if (this.code.membersToDestruct){
            this.code.membersToDestruct.forEach(function(dest){
                self.addChild(Outlets.CPP.FunctionCall.instance(dest, self.simOutlet, self, []));
            });
        }
        if (this.code.basesToDestruct){
            this.code.basesToDestruct.forEach(function(dest){
                self.addChild(Outlets.CPP.FunctionCall.instance(dest, self.simOutlet, self, []));
            });
        }

    },

    setUpParams : function(){
        var paramCodes = this.inst ? this.inst.caller.argInits : this.code.params;
        this.paramsElem.empty();
        this.paramsElem.append("(");
        //var paramElems = [];
        for(var i = 0; i < paramCodes.length; ++i) {
            var elem = $("<span></span>");
            var paramOutlet = Outlets.CPP.Parameter.instance(elem, paramCodes[i], this.simOutlet, this);
            //this.addChild(paramOutlet);
            //paramElems.push(elem);
            this.paramsElem.append(elem);
            if (i < paramCodes.length - 1) {
                this.paramsElem.append(", ");
            }
        }
        this.paramsElem.append(")");
    },

    instanceSet : function(){
        Outlets.CPP.Function._parent.instanceSet.apply(this, arguments);
        this.setUpParams();
    },

    act: mixin({}, Outlets.CPP.Code.act, {

        returned: function(msg){
            // Nothing for now
        },
        tailCalled : function(msg){
            this.setUpParams();
        },
        reset : function(msg){
            this.body.removeInstance();
        },
        paramsFinished : function(msg){
            if (this.inst && this.inst.reusedFrame){
                var inst  = this.inst;
                this.removeInstance();
                this.setInstance(inst);
            }
        },
        currentFunction : function(){
            this.simOutlet.element.find(".currentFunction").removeClass("currentFunction");
            this.element.addClass("currentFunction");
        }

    }, true)
});

var curlyOpen = "<span class=\"curly open\">{</span>";
var curlyClose = "<span class=\"curly close\">}</span>";

UMichEBooks.Outlets.CPP.Block = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.Block",

//    init: function(element, code, simOutlet){
//        this.initParent(element, code, simOutlet);
//    },

    createElement: function(){
        this.element.removeClass("codeInstance");
        this.element.addClass("braces");
        this.element.append(curlyOpen);
        this.element.append("<br />");
        var inner = this.innerElem = $("<span class=\"inner\"><span class=\"highlight\"></span></span>");
        inner.addClass("block");
        this.element.append(inner);

        this.gotoLinks = [];
        //var statementElems = [];
        for(var i = 0; i < this.code.statements.length; ++i){
            var lineElem = $('<span class="blockLine"></span>');
            var elem = $("<span></span>");
            var child = createOutlet(elem, this.code.statements[i], this.simOutlet);
            this.addChild(child);

            var gotoLink = $('<span class="gotoLink link">>></span>');
            lineElem.append(gotoLink);
            this.gotoLinks.push(gotoLink);
            //gotoLink.css("visibility", "hidden");
            var self = this;

            // wow this is really ugly lol. stupid closures
            gotoLink.click(
                function (x) {
                    return function () {
                        if (!self.inst){
                            return;
                        }

                        var me = $(this);
                        //if (self.gotoInProgress){
                        //    return;
                        //}
                        //self.gotoInProgress = true;
                        var temp = me.html();
                        if (me.html() == "&lt;&lt;"){
                            self.simOutlet.simOutlet.stepBackward(self.simOutlet.sim.stepsTaken - self.inst.childInstances.statements[x].stepsTaken);
                            return;
                        }


                        me.addClass("inProgress");

                        self.inst.pauses[x] = {pauseAtIndex: x, callback: function(){
                            //self.gotoInProgress = false;
                            me.removeClass("inProgress");
                        }};
                        //if (self.inst.pauses[x]){
                            self.simOutlet.send("skipToEnd");
                        //}
                    };
                }(i));

            lineElem.append(elem);
            inner.append(lineElem);
            inner.append("<br />");
        }
        this.element.append("<br />");
        this.element.append(curlyClose);

//        this.element.append("}");


    },

    instanceSet : function(){
        Outlets.CPP.Block._parent.instanceSet.apply(this, arguments);
        for(var i = 0; i < this.inst.index; ++i){
            this.gotoLinks[i].html("<<").css("visibility", "visible");
        }
        for(var i = this.inst.index; i < this.gotoLinks.length; ++i){
            this.gotoLinks[i].html(">>").css("visibility", "visible");
        }
    },
    instanceRemoved : function(){
        Outlets.CPP.Block._parent.instanceRemoved.apply(this, arguments);
        for(var i = 0; i < this.gotoLinks.length; ++i){
            this.gotoLinks[i].html(">>").css("visibility", "hidden");
        }
    },
    act: mixin({}, Outlets.CPP.Code.act, {

        index: function(msg){
            this.gotoLinks[msg.data].html("<<");
            //this.gotoLinks[msg.data].css("visibility", "hidden");
        }

    }, true)
});

UMichEBooks.Outlets.CPP.Statement = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.Statement",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("statement");
    },

    // Statements get reset after being popped
    setInstance : function(inst){
        if (!inst.hasBeenPopped){
            Outlets.CPP.Statement._parent.setInstance.apply(this, arguments);
        }
    }
});

UMichEBooks.Outlets.CPP.DeclarationStatement = Outlets.CPP.Statement.extend({
    _name: "Outlets.CPP.DeclarationStatement",

    createElement: function(){
        var elem = $("<span></span>")
        this.addChild(createOutlet(elem, this.code.declaration, this.simOutlet));
        this.element.append(elem);
        this.element.append(";");

    }
});

UMichEBooks.Outlets.CPP.ExpressionStatement = Outlets.CPP.Statement.extend({
    _name: "Outlets.CPP.ExpressionStatement",

    createElement: function(){
        var elem = $("<span></span>")
        this.addChild(createOutlet(elem, this.code.expression, this.simOutlet));
        this.element.append(elem);
        this.element.append(";");
    }
});

UMichEBooks.Outlets.CPP.Selection = Outlets.CPP.Statement.extend({
    _name: "Outlets.CPP.Selection",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("selection");
    },

    createElement: function(){
        this.element.append(htmlDecoratedKeyword("if"));
        this.element.append('(');

        var ifElem = $("<span></span>");
        this.addChild(createOutlet(ifElem, this.code["if"], this.simOutlet));
        this.element.append(ifElem);

        this.element.append(") ");

        var thenElem = $("<span></span>");
        this.addChild(createOutlet(thenElem, this.code.then, this.simOutlet));
        this.element.append(thenElem);

        if (this.code["else"]){
            this.element.append("<br />");
            this.element.append(htmlDecoratedKeyword("else"));
            this.element.append(" ");
            var elseElem = $("<span></span>");
            this.addChild(createOutlet(elseElem, this.code["else"], this.simOutlet));
            this.element.append(elseElem);
        }
    }
});

UMichEBooks.Outlets.CPP.While = Outlets.CPP.Statement.extend({
    _name: "Outlets.CPP.While",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-while");
    },

    createElement: function(){
        this.element.append(htmlDecoratedKeyword("while"));
        this.element.append("(");

        var condElem = $("<span></span>")
        this.addChild(this.cond = createOutlet(condElem, this.code.cond, this.simOutlet));
        this.element.append(condElem);

        this.element.append(") ");

        var bodyElem = $("<span></span>")
        this.addChild(this.body = createOutlet(bodyElem, this.code.body, this.simOutlet));
        this.element.append(bodyElem);

    },

    act: $.extend({}, Outlets.CPP.Statement.act, {
        reset: function(){
            this.cond.removeInstance();
            this.body.removeInstance();
        }
    })
});

UMichEBooks.Outlets.CPP.DoWhile = Outlets.CPP.Statement.extend({
    _name: "Outlets.CPP.DoWhile",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-doWhile");
    },

    createElement: function(){
        this.element.append(htmlDecoratedKeyword("do"));

        var bodyElem = $("<span></span>")
        this.addChild(this.body = createOutlet(bodyElem, this.code.body, this.simOutlet));
        this.element.append(bodyElem);

        this.element.append("\n" + htmlDecoratedKeyword("while") + "(");

        var condElem = $("<span></span>")
        this.addChild(this.cond = createOutlet(condElem, this.code.cond, this.simOutlet));
        this.element.append(condElem);

        this.element.append(") ");


    },

    act: $.extend({}, Outlets.CPP.Statement.act, {
        reset: function(){
            this.cond.removeInstance();
            this.body.removeInstance();
        }
    })
});



UMichEBooks.Outlets.CPP.For = Outlets.CPP.Statement.extend({
    _name: "Outlets.CPP.For",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-for");
    },

    createElement: function(){
        this.element.append(htmlDecoratedKeyword("for"));
        this.element.append("(");

        var initElem = $("<span></span>")
        this.addChild(this.forInit = createOutlet(initElem, this.code.forInit, this.simOutlet));
        this.element.append(initElem);

        this.element.append(" ");

        var condElem = $("<span></span>")
        this.addChild(this.cond = createOutlet(condElem, this.code.cond, this.simOutlet));
        this.element.append(condElem);

        this.element.append("; ");

        var postElem = $("<span></span>")
        this.addChild(this.post = createOutlet(postElem, this.code.post, this.simOutlet));
        this.element.append(postElem);

        this.element.append(") ");

        var bodyElem = $("<span></span>")
        this.addChild(this.body = createOutlet(bodyElem, this.code.body, this.simOutlet));
        this.element.append(bodyElem);

    },

    act: $.extend({}, Outlets.CPP.Statement.act, {
        reset: function(){
            this.cond.removeInstance();
            this.body.removeInstance();
            this.post.removeInstance();
        }
    })
});

UMichEBooks.Outlets.CPP.Return = Outlets.CPP.Statement.extend({
    _name: "Outlets.CPP.Return",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("return");
        this.argOutlets = [];
        this.element.append('<span class="code-keyword">return</span>');

        var exprElem = this.exprElem = $("<span></span>")
        if (this.code.sub.returnInit) {
            this.element.append(" ");
            this.argOutlets.push(this.expr = this.addChild(createOutlet(exprElem, this.code.sub.returnInit, this.simOutlet)));
        }
        this.element.append(exprElem);

        this.element.append(";");
    },

    act : mixin({}, Outlets.CPP.Code.act, {
        returned: function(msg){
            var data = msg.data;

            // If it's main just return
            if (this.code.context.func.isMain){
                return;
            }

            if (this.expr) {
                this.inst.funcContext.parent.send("returned", this.argOutlets[0]);
            }

        }
    }),

    createElement: function(){}
});

UMichEBooks.Outlets.CPP.Break = Outlets.CPP.Statement.extend({
    _name: "Outlets.CPP.Break",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("break");

        this.element.append(htmlDecoratedKeyword("break"));
        this.element.append(";");
    },

    createElement: function(){}
});

UMichEBooks.Outlets.CPP.Declaration = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.Declaration",

//    init: function(element, code, simOutlet){
//        this.initParent(element, code, simOutlet);
//    },

    createElement: function(){
        this.element.addClass("codeInstance");
        this.element.addClass("declaration");
        this.element.append(htmlDecoratedType(this.code.typeSpec.type));
        this.element.append(" ");

        var declaratorElems = this.declaratorElems = [];
        for(var i = 0; i < this.code.declarators.length; ++i){

            // Create element for declarator
            var decl = this.code.declarators[i];
            var declElem = $('<span class="codeInstance code-declarator"><span class="highlight"></span></span>');
            declaratorElems.push(declElem);
            declElem.append(decl.type.declaratorString(htmlDecoratedName(decl.name, decl.type)));
            this.element.append(declElem);

            // Create element for initializer, if there is one
            if(this.code.initializers[i]){
                var initElem = $("<span></span>");
                this.addChild(createOutlet(initElem, this.code.initializers[i], this.simOutlet));
                this.element.append(initElem);
            }

            // Add commas where needed
            if (i < this.code.declarators.length - 1){
                this.element.append(", ");
            }
        }

    },
    instanceRemoved : function(){
        this.setCurrentDeclaratorIndex(null);
    },
    setCurrentDeclaratorIndex : function(decl){
        // Remove from old
        if (this.currentDeclarator){
            this.currentDeclarator.removeClass("active");
        }

        // Set new or set to null
        if (decl || decl === 0){
            this.currentDeclarator = this.declaratorElems[decl];
            this.currentDeclarator.addClass("active");
        }
        else{
            this.currentDeclarator = null;
        }
    },
    act : mixin({}, Outlets.CPP.Code.act, {
        initializing: function(msg){
            this.setCurrentDeclaratorIndex(msg.data);
        }
    })
});

UMichEBooks.Outlets.CPP.Parameter = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.Parameter",

    init: function(element, code, simOutlet, parent){
        this.initParent(element, code, simOutlet, parent);
        //this.argOutlet = argOutlet;

        this.element.addClass("codeInstance");
        this.element.addClass("declaration");
        this.element.addClass("parameter");

        //if (this.code.funcCall){
        //    var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.funcCall, this.simOutlet, this, [this.argOutlet]);
        //    this.addChild(callOutlet);
        //}
        this.element.append(this.initValueElem = $("<div> </div>"));

        if(this.inst){
            // If it's associated with an instance of an initializer
            var obj = this.code.entity.lookup(this.simOutlet.simOutlet.sim, this.inst);
            this.element.append(obj.type.typeString(false, htmlDecoratedName(obj.name, obj.type), true));
        }
        else{
            // If it's associated with a non-instance parameter
            this.element.append(this.code.entity.type.typeString(false, htmlDecoratedName(this.code.entity.name, this.code.entity.type), true));
        }

        //this.element.append("<br />");

    },

    createElement: function(){

//          this.element.append(this.code.argument.evalValue.valueString());

    },
    instanceRemoved : function(){
        var x = 3;
    },

    act: copyMixin(Outlets.CPP.Code.act, {
        initialized: function(msg){
            var obj = msg.data;
            var val;
            if (isA(obj, ReferenceEntity)){
                val = "@"+obj.refersTo.nameString(); // TODO make a different animation for reference binding
            }
            else{
                val = obj.valueString();
            }
            val = htmlDecoratedValue(val);
            var argOutlet = this.inst.identify("idArgOutlet");
            if (argOutlet && argOutlet.simOutlet === this.simOutlet){
                var self = this;
                this.simOutlet.valueTransferOverlay(argOutlet, this, val, 500, function(){
                    // I decided that the parameter text shouldn't change. It already changes in memory display.
                    // Changed my mind again. Now it does display underneath.
                    self.initValueElem.html(val);
                });
            }
            else{
                this.initValueElem.html(val);
            }
        }
    })
});


UMichEBooks.Outlets.CPP.Initializer = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.Initializer",

    init: function (element, code, simOutlet) {
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-initializer");

        var exprElem = $("<span></span>");
        this.element.append(exprElem);
        this.addChild(createOutlet(exprElem, this.code.sub.initExpr, this.simOutlet));
    },
    act : copyMixin(Outlets.CPP.Code.act, {
        "idArgOutlet" : DataPath._IDENTIFY
    })
});

UMichEBooks.Outlets.CPP.InitializerList = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.InitializerList",

    init: function (element, code, simOutlet) {
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-initializerList");

        this.element.append("{");

        for (var i = 0; i < this.code.initializerListLength; ++i) {
            var argElem = $("<span></span>");
            this.addChild(createOutlet(argElem, this.code.sub["arg"+i], this.simOutlet));
            this.element.append(argElem);
            if (i < this.code.initializerListLength - 1) {
                this.element.append(", ");
            }
        }

        this.element.append("}");
    },
    act : copyMixin(Outlets.CPP.Code.act, {
        "idArgOutlet" : DataPath._IDENTIFY
    })
});


UMichEBooks.Outlets.CPP.DefaultInitializer = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.DefaultInitializer",

    init: function (element, code, simOutlet) {
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-defaultInitializer");

        var self = this;

        this.argOutlets = [];
        if (this.code.funcCall){
            this.addChild(Outlets.CPP.FunctionCall.instance(this.code.funcCall, this.simOutlet, this, this.argOutlets));
        }
        if (this.code.sub.arrayElemInitializers){
            this.code.sub.arrayElemInitializers.forEach(function(elemInit){
                self.addChild(Outlets.CPP.DefaultInitializer.instance(element, elemInit, simOutlet));
            });
        }

        if (this.code.temporariesToDestruct){
            this.code.temporariesToDestruct.forEach(function(tempDest){
                self.addChild(Outlets.CPP.FunctionCall.instance(tempDest, self.simOutlet, self, []));
            });
        }

        if (this.code.isMemberInitializer) {
            this.element.append("()");
        }
    },
    act : copyMixin(Outlets.CPP.Code.act, {
        "idArgOutlet" : DataPath._IDENTIFY
    })
});

UMichEBooks.Outlets.CPP.DirectInitializer = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.DirectInitializer",

    init: function (element, code, simOutlet) {
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-directInitializer");

        var length = this.code.numArgs;
        if (length > 0 || this.code.isMemberInitializer) {
            this.element.append("(");
        }

        var self = this;

        if (this.code.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.funcCall, this.simOutlet, this, this.argOutlets);
            this.addChild(callOutlet);

            this.argOutlets = callOutlet.argOutlets;
            this.argOutlets.forEach(function(argOutlet,i,arr){
                self.addChild(argOutlet);
                self.element.append(argOutlet.element);
                if (i < arr.length - 1) {
                    self.element.append(", ");
                }
            });
        }
        else{
            this.argOutlets = this.code.args.map(function(arg,i,arr){
                var argElem = $("<span></span>");
                var argOutlet = self.addChild(createOutlet(argElem, arg, self.simOutlet));
                self.element.append(argElem);
                if (i < arr.length - 1) {
                    self.element.append(", ");
                }
                return argOutlet;
            });
        }


        if (length > 0 || this.code.isMemberInitializer){
            this.element.append(")");
        }


        if (this.code.temporariesToDestruct){
            this.code.temporariesToDestruct.forEach(function(tempDest){
                self.addChild(Outlets.CPP.FunctionCall.instance(tempDest, self.simOutlet, self, []));
            });
        }

    },
    act : copyMixin(Outlets.CPP.Code.act, {
        "idArgOutlet" : DataPath._IDENTIFY
    })
});


UMichEBooks.Outlets.CPP.CopyInitializer = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.CopyInitializer",

    init: function (element, code, simOutlet, options) {
        options = options || {};
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-copyInitializer");

        if (isA(this.code.context.parent, Declaration)){
            this.element.append(" = ");
        }
        var self = this;
        if (this.code.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.funcCall, this.simOutlet, this, this.argOutlets);
            this.addChild(callOutlet);

            this.argOutlets = callOutlet.argOutlets;
            this.argOutlets.forEach(function(argOutlet,i,arr){
                self.addChild(argOutlet);
                self.element.append(argOutlet.element);
                if (i < arr.length - 1) {
                    self.element.append(", ");
                }
            });
        }
        else{
            this.argOutlets = this.code.args.map(function(arg,i,arr){
                var argElem = $("<span></span>");
                var argOutlet = self.addChild(createOutlet(argElem, arg, self.simOutlet));
                self.element.append(argElem);
                if (i < arr.length - 1) {
                    self.element.append(", ");
                }
                return argOutlet;
            });
        }


        if (this.code.temporariesToDestruct){
            this.code.temporariesToDestruct.forEach(function(tempDest){
                self.addChild(Outlets.CPP.FunctionCall.instance(tempDest, self.simOutlet, self, []));
            });
        }

    },
    act : copyMixin(Outlets.CPP.Code.act, {
        "idArgOutlet" : DataPath._IDENTIFY
    })
});


UMichEBooks.Outlets.CPP.ParameterInitializer = Outlets.CPP.CopyInitializer.extend({
    _name: "Outlets.CPP.ParameterInitializer"

});

UMichEBooks.Outlets.CPP.ReturnInitializer = Outlets.CPP.CopyInitializer.extend({
    _name: "Outlets.CPP.ReturnInitializer"
});



UMichEBooks.Outlets.CPP.Expression = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.Expression",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("expression");
        if (this.code.isFullExpression()) {this.element.addClass("fullExpression");}

        this.evalValueElem = $("<span class='hidden'></span>"); // TODO fix this ugly hack
        this.wrapper = $("<span class='wrapper'></span>");
        this.exprElem = $("<span class='expr'></span>"); // TODO fix this ugly hack
        this.wrapper.append(this.exprElem);
        this.wrapper.append(this.evalValueElem);

        this.element.append(this.wrapper);

        this.element.append("<span class='exprType'>" + (this.code.type ? this.code.type.toString() : "") + "</span>");

        if (this.code.temporariesToDestruct){
            var self = this;
            this.code.temporariesToDestruct.forEach(function(tempDest){
                self.addChild(Outlets.CPP.FunctionCall.instance(tempDest, self.simOutlet, self, []));
            });
        }

        //if (this.code.isFullExpression()){
        //    var self = this;
        //    this.exprElem.hover(function(){
        //        //alert("hi");
        //        self.element.addClass("current");
        //    },function(){
        //        //alert("hi");
        //        self.element.removeClass("current");
        //        //self.simOutlet.sim.closeMessage();
        //    }).click(function(){
        //        self.simOutlet.sim.explain(self.inst ? self.inst.explain() : self.code.explain(self.simOutlet.sim));
        //    });
        //}
    },

    createElement : function(){

    },

    setEvalValue : function(value, suppressAnimation){
        this.showingEvalValue = true;
        // If it's void, don't do anything
        if (value === undefined || isA(value.type, Types.Void)){
            return;
        }

        if (value.isA(ObjectEntity) || value.isA(FunctionEntity)){
            this.evalValueElem.html(value.nameString());
            this.evalValueElem.addClass("lvalue");
        }
        else{  // value.isA(Value)
            if (isA(value.type, Types.Tree_t)){
                this.evalValueElem.html(breadthFirstTree(value.rawValue()));
            }
            else{
                this.evalValueElem.html(value.valueString());
            }
            this.evalValueElem.addClass("rvalue");
            if (!value.isValueValid()){
                this.evalValueElem.addClass("invalid");
            }
        }

        if(Outlets.CPP.CPP_ANIMATIONS && !suppressAnimation) {
            this.wrapper.animate({
                width: this.evalValueElem.css("width")
            }, 500, function () {
                $(this).css("width", "auto");
            });
//                this.evalValueElem.animate({
//                    width: this.evalValueElem.css("width")
//                }, 500, function () {
//                    $(this).css("width", "auto");
//                });
        }

        //if (suppressAnimation){
        //    this.evalValueElem.addClass("noTransitions").height();
        //    this.exprElem.addClass("noTransitions").height();
        //}

        this.evalValueElem.removeClass("hidden");//.fadeTo(EVAL_FADE_DURATION, 1);
        this.exprElem.addClass("hidden");//.fadeTo(EVAL_FADE_DURATION, 0);

        //if (suppressAnimation){
        //    this.evalValueElem.removeClass("noTransitions").height();
        //    this.exprElem.removeClass("noTransitions").height();
        //}
    },

    removeEvalValue : function(){
        this.showingEvalValue = false;
//        if(Outlets.CPP.CPP_ANIMATIONS) {
//            this.wrapper.animate({
//                width: this.exprElem.css("width")
//            }, 500, function () {
//                $(this).css("width", "auto");
//            });
////                this.evalValueElem.animate({
////                    width: this.evalValueElem.css("width")
////                }, 500, function () {
////                    $(this).css("width", "auto");
////                });
//        }
        var self = this;
        //setTimeout(function() {
            self.exprElem.removeClass("hidden");//.fadeTo(RESET_FADE_DURATION, 1);
            self.evalValueElem.addClass("hidden");//.fadeTo(RESET_FADE_DURATION, 0);

            self.element.removeClass("rvalue");
            self.element.removeClass("lvalue");
            self.wrapper.css("width", "auto");
        //}, 2000);
    },

    instanceSet : function(){
        Outlets.CPP.Expression._parent.instanceSet.apply(this, arguments);
        if (this.inst.evalValue){
            this.setEvalValue(this.inst.evalValue, true);
        }
        else{
            this.removeEvalValue();
        }
    },

    instanceRemoved : function(inst){
        Outlets.CPP.Expression._parent.instanceSet.apply(this, arguments);
        this.removeEvalValue();
    },

    act: $.extend({}, Outlets.CPP.Code.act, {
        evaluated: function(msg){
            var value = msg.data;
            this.setEvalValue(value);


//            console.log("expression evaluated to " + value.value);
        },
        returned: function(msg){
            var value = msg.data;
            this.setEvalValue(value);

//            if(Outlets.CPP.CPP_ANIMATIONS) {
//                this.wrapper.animate({
//                    width: this.evalValueElem.css("width")
//                }, 500, function () {
//                    $(this).css("width", "auto");
//                });
//            }

            //this.evalValueElem.removeClass("hidden");//.fadeTo(EVAL_FADE_DURATION, 1);
            //this.exprElem.addClass("hidden");//.fadeTo(EVAL_FADE_DURATION, 0);

//            console.log("expression evaluated to " + value.value);
        }
    })




});

UMichEBooks.Outlets.CPP.Assignment = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Assignment",
    htmlOperator : htmlDecoratedOperator("=", "code-assignmentOp"),

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("assignment");


        var self = this;
        var lhsElem = $("<span></span>");
        this.addChild(createOutlet(lhsElem, this.code.sub.lhs, this.simOutlet));
        this.exprElem.append(lhsElem);

        this.exprElem.append(" " + this.htmlOperator + " ");

        if (this.code.sub.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.sub.funcCall, this.simOutlet, this);
            this.addChild(callOutlet);

            this.argOutlets = callOutlet.argOutlets;
            this.argOutlets.forEach(function(argOutlet,i,arr){
                self.addChild(argOutlet);
                self.exprElem.append(argOutlet.element);
                if (i < arr.length - 1) {
                    self.exprElem.append(", ");
                }
            });
        }
        else{
            var rhsElem = $("<span></span>");
            this.argOutlets = [];
            this.argOutlets.push(this.addChild(createOutlet(rhsElem, this.code.sub.rhs, this.simOutlet)));
            this.exprElem.append(rhsElem);
        }
    },

    act: mixin({}, Outlets.CPP.Expression.act, {

        returned: function(msg){
            var value = msg.data;
            this.setEvalValue(value);

//            if(Outlets.CPP.CPP_ANIMATIONS) {
//                this.wrapper.animate({
//                    width: this.evalValueElem.css("width")
//                }, 500, function () {
//                    $(this).css("width", "auto");
//                });
//            }

            this.evalValueElem.removeClass("hidden");//.fadeTo(EVAL_FADE_DURATION, 1);
            this.exprElem.addClass("hidden");//.fadeTo(EVAL_FADE_DURATION, 0);

//            console.log("expression evaluated to " + value.value);
        }

    }, true)
});

UMichEBooks.Outlets.CPP.Ternary = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Ternary",
    htmlOperator1 : htmlDecoratedOperator("?", "code-ternaryOp"),
    htmlOperator2 : htmlDecoratedOperator(":", "code-ternaryOp"),

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-ternary");

        var elem = $("<span></span>");
        this.addChild(createOutlet(elem, this.code.sub._if, this.simOutlet));
        this.exprElem.append(elem);

        this.exprElem.append(" " + this.htmlOperator1 + " ");

        elem = $("<span></span>");
        this.addChild(createOutlet(elem, this.code.sub.then, this.simOutlet));
        this.exprElem.append(elem);

        this.exprElem.append(" " + this.htmlOperator2 + " ");

        elem = $("<span></span>");
        this.addChild(createOutlet(elem, this.code.sub._else, this.simOutlet));
        this.exprElem.append(elem);
    }
});

UMichEBooks.Outlets.CPP.Comma = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Comma",
    htmlOperator: htmlDecoratedOperator(",", "code-binaryOp"),

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("code-comma");

        var elem = $("<span></span>");
        this.addChild(createOutlet(elem, this.code.sub.left, this.simOutlet));
        this.exprElem.append(elem);

        this.exprElem.append(" " + this.htmlOperator + " ");

        elem = $("<span></span>");
        this.addChild(createOutlet(elem, this.code.sub.right, this.simOutlet));
        this.exprElem.append(elem);
    }
});

UMichEBooks.Outlets.CPP.CompoundAssignment = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.CompoundAssignment",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.element.addClass("compoundAssignment");

        //var lhsElem = $("<span></span>");
        //this.addChild(createOutlet(lhsElem, this.code.rhs.left, this.simOutlet));
        //this.exprElem.append(lhsElem);
        //
        //this.exprElem.append(" " + htmlDecoratedOperator(this.code.op, "code-compoundAssignmentOp") + " ");

        var rhsElem = $("<span></span>");
        var rhsOutlet = createOutlet(rhsElem, this.code.rhs, this.simOutlet);
        this.addChild(rhsOutlet);
        this.exprElem.append(rhsElem);
        rhsElem.find(".code-binaryOp").first().replaceWith(htmlDecoratedOperator(this.code.op, "code-compoundAssignmentOp"));
    }
});

UMichEBooks.Outlets.CPP.FunctionCall = Outlets.CPP.Code.extend({
    _name: "Outlets.CPP.FunctionCall",

    init: function (code, simOutlet, returnOutlet) {
        var self = this;
        this.initParent(null, code, simOutlet);

        this.returnOutlet = returnOutlet;


        this.argOutlets = this.code.argInitializers.map(function(argInit){
            return createOutlet($("<span></span>"), argInit, self.simOutlet);
        });
    },

    instanceSet : Class.ADDITIONALLY(function(){
        if (this.inst.hasBeenCalled && !this.inst.func.hasBeenPopped){
            var funcOutlet = this.simOutlet.pushFunction(this.inst.func, this);
            funcOutlet && this.listenTo(funcOutlet);
        }
    }),

    act: mixin({}, Outlets.CPP.Code.act, {

        returned: function(msg){
            // This may be the case for main, constructors, destructors, etc.
            if (!this.returnOutlet){
                return;
            }
            var sourceOutlet = msg.data;

            var self = this;
            var data = sourceOutlet.inst && sourceOutlet.inst.childInstances && sourceOutlet.inst.childInstances.args && sourceOutlet.inst.childInstances.args[0] && sourceOutlet.inst.childInstances.args[0].evalValue;
            if (!data){
                return;
            }
            this.simOutlet.valueTransferOverlay(sourceOutlet, this.returnOutlet, htmlDecoratedValue(data.instanceString()), 500,
                function () {
                    if(self.returnOutlet) { // may have evaporated if we're moving too fast
                        self.returnOutlet.setEvalValue(data);
                    }
                });
        },
        tailCalled : function(msg){
            var callee = msg.data;
            callee.send("tailCalled", this);
        },
        called : function(msg){
            var callee = msg.data;
            assert(this.simOutlet);
            if (!this.simOutlet.simOutlet.autoRunning || !this.simOutlet.simOutlet.skipFunctions){
                var funcOutlet = this.simOutlet.pushFunction(this.inst.func, this);
                funcOutlet && this.listenTo(funcOutlet);
            }
        },
        idCodeOutlet: false // do nothing


    }, true)
});

UMichEBooks.Outlets.CPP.FunctionCallExpr = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.FunctionCallExpr",

    init: function (element, code, simOutlet) {
        var self = this;
        this.initParent(element, code, simOutlet);
        this.element.addClass("functionCall");

        if (this.code.funcCall.func.isVirtual()){
            this.element.addClass("virtual");
        }


        if (this.code.recursiveStatus === "recursive" && this.code.isTail) {
            this.element.addClass("tail");
        }

        var operandElem = $("<span></span>");
        this.addChild(createOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem);

//        if (this.code.operand.)
//        this.exprElem.append(this.code.operand.entity.name + "(");
        this.exprElem.append("(");

        var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.funcCall, this.simOutlet, this, this.argOutlets);
        this.addChild(callOutlet);

        this.argOutlets = callOutlet.argOutlets;
        this.argOutlets.forEach(function(argOutlet,i,arr){
            self.addChild(argOutlet);
            self.exprElem.append(argOutlet.element);
            if (i < arr.length - 1) {
                self.exprElem.append(", ");
            }
        });


        this.exprElem.append(")");
        if (this.code.funcCall.func.isVirtual()){
            this.exprElem.append("<sub>v</sub>");
        }
    },

    act: mixin({}, Outlets.CPP.Expression.act, {

//        calleeOutlet : function(callee, source){
//            this.addChild(callee);
//        },

        returned: function(msg){
            var value = msg.data;
            this.setEvalValue(value);

            this.evalValueElem.removeClass("hidden");
            this.exprElem.addClass("hidden");
        },
        tailCalled : function(msg){
            var callee = msg.data;
            callee.send("tailCalled", this);
        }

    }, true)
});

UMichEBooks.Outlets.CPP.BinaryOp = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.BinaryOp",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        if (this.code.sub.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.sub.funcCall, this.simOutlet, this);
            this.addChild(callOutlet);

            this.argOutlets = callOutlet.argOutlets;

            // If it's a member function call there will only be one argument and we need to add the left
            if (this.code.isMemberOverload){
                var elem = $("<span></span>");
                this.addChild(createOutlet(elem, this.code.left, this.simOutlet));
                this.exprElem.append(elem);
                this.exprElem.append(" " + htmlDecoratedOperator(this.code.op, "code-binaryOp") + " ");
            }

            var self = this;
            this.argOutlets.forEach(function(argOutlet,i,arr){
                self.addChild(argOutlet);
                self.exprElem.append(argOutlet.element);
                if (i < arr.length - 1) {
                    self.exprElem.append(" " + self.code.op + " ");
                }
            });
        }
        else{
            var elem = $("<span></span>");
            this.addChild(createOutlet(elem, this.code.left, this.simOutlet));
            this.exprElem.append(elem);

            this.exprElem.append(" <span class='codeInstance code-binaryOp'>" + this.code.op + "<span class='highlight'></span></span> ");

            var elem = $("<span></span>");
            this.addChild(createOutlet(elem, this.code.right, this.simOutlet));
            this.exprElem.append(elem);
        }
    },

    upNext: function(){
        Outlets.CPP.Expression.upNext.apply(this, arguments);
        this.element.find(".code-binaryOp").first().addClass("upNext");
    },

    wait: function(){
        this.element.find(".code-binaryOp").first().removeClass("upNext");
        Outlets.CPP.Expression.wait.apply(this, arguments);
    },

    instanceSet : function(){
        Outlets.CPP.BinaryOp._parent.instanceSet.apply(this, arguments);
        this.element.find(".code-binaryOp").first().removeClass("upNext");
    },

    instanceRemoved : function(){
        Outlets.CPP.BinaryOp._parent.instanceRemoved.apply(this, arguments);
        this.element.find(".code-binaryOp").first().removeClass("upNext");
    }
});

UMichEBooks.Outlets.CPP.UnaryOp = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.UnaryOp",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.exprElem.append(htmlDecoratedOperator(this.code.op, "code-unaryOp"));
        this.addSpace && this.exprElem.append(" ");

        if (this.code.sub.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.sub.funcCall, this.simOutlet, this);
            this.addChild(callOutlet);
            this.argOutlets = callOutlet.argOutlets;

            // If it's a member function call there will be no arguments and we need to add the operand
            if (this.code.isMemberOverload) {
                var elem = $("<span></span>");
                this.addChild(createOutlet(elem, this.code.operand, this.simOutlet));
                this.exprElem.append(elem)
            }
            else{
                this.addChild(this.argOutlets[0]);
                this.exprElem.append(this.argOutlets[0].element);
            }
        }
        else{
            var elem = $("<span></span>");
            this.addChild(createOutlet(elem, this.code.operand, this.simOutlet));
            this.exprElem.append(elem)
        }
    },
    upNext: function(){
        Outlets.CPP.Expression.upNext.apply(this, arguments);
        var temp = this.element.find(".code-unaryOp").first().addClass("upNext");
//        console.log("upNext for " + this.code.code.text);
    }
});

UMichEBooks.Outlets.CPP.NewExpression = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.NewExpression",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-newExpression");
        this.exprElem.append(htmlDecoratedOperator("new", "code-unaryOp"));
        this.exprElem.append(" ");

        if (isA(this.code.heapType, Types.Array) && this.code.dynamicLength){
            this.exprElem.append(this.code.heapType.elemType.typeString(false, '[<span class="dynamicLength"></span>]'));
            this.addChild(createOutlet(this.exprElem.find(".dynamicLength"), this.code.dynamicLength, this.simOutlet));
        }
        else{
            this.exprElem.append(htmlDecoratedType(this.code.heapType));
        }

        if (this.code.initializer) {
            var initElem = $("<span></span>");
            this.addChild(createOutlet(initElem, this.code.initializer, this.simOutlet));
            this.exprElem.append(initElem);
        }


    },
    upNext: function(){
        Outlets.CPP.Expression.upNext.apply(this, arguments);
        var temp = this.element.find(".code-unaryOp").first().addClass("upNext");
//        console.log("upNext for " + this.code.code.text);
    }
});

UMichEBooks.Outlets.CPP.Delete = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Delete",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-delete");
        this.exprElem.append(htmlDecoratedOperator("delete", "code-unaryOp"));
        this.exprElem.append(" ");
        var operandElem = $("<span></span>");
        this.addChild(createOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        if (this.code.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.funcCall, this.simOutlet, this, []);
            this.addChild(callOutlet);
        }
    }
});


UMichEBooks.Outlets.CPP.DeleteArray = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.DeleteArray",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-deleteArray");
        this.exprElem.append(htmlDecoratedOperator("delete[]", "code-unaryOp"));
        this.exprElem.append(" ");
        var operandElem = $("<span></span>");
        this.addChild(createOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem);


    }
});



UMichEBooks.Outlets.CPP.ConstructExpression = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.ConstructExpression",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-constructExpression");
        this.exprElem.append(htmlDecoratedType(this.code.type));

        if (this.code.initializer) {
            var initElem = $("<span></span>");
            this.addChild(createOutlet(initElem, this.code.initializer, this.simOutlet));
            this.exprElem.append(initElem);
        }
    }
});



UMichEBooks.Outlets.CPP.LogicalNot = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.LogicalNot",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-logicalNot");
        this.exprElem.append(htmlDecoratedOperator(this.code.op, "code-unaryOp"));
        var operandElem = $("<span></span>");
        this.addChild(createOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem)
    }
});

UMichEBooks.Outlets.CPP.Prefix = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Prefix",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-prefix");
        this.exprElem.append(htmlDecoratedOperator(this.code.op, "code-unaryOp"));
        var operandElem = $("<span></span>");
        this.addChild(createOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem)
    }
});

UMichEBooks.Outlets.CPP.Dereference = Outlets.CPP.UnaryOp.extend({
    _name: "Outlets.CPP.Dereference",
    textOp : "*",
    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-dereference");
    }
});


UMichEBooks.Outlets.CPP.Increment = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Increment",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        var operandElem = $("<span></span>");
        this.addChild(createOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        this.exprElem.append(htmlDecoratedOperator("++", "code-postfixOp"));
    }
});
UMichEBooks.Outlets.CPP.Decrement = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Decrement",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        var operandElem = $("<span></span>");
        this.addChild(createOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        this.exprElem.append(htmlDecoratedOperator("--", "code-postfixOp"));
    }
});


UMichEBooks.Outlets.CPP.Subscript = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Subscript",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        var operandElem = $("<span></span>");
        this.addChild(createOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        this.element.addClass("code-subscript");
        this.exprElem.append(htmlDecoratedOperator("[", "code-postfixOp"));


        if (this.code.sub.funcCall){
            var callOutlet = Outlets.CPP.FunctionCall.instance(this.code.sub.funcCall, this.simOutlet, this);
            this.addChild(callOutlet);

            this.argOutlets = callOutlet.argOutlets;
            this.addChild(this.argOutlets[0]);
            this.exprElem.append(this.argOutlets[0].element);
        }
        else{
            var offsetElem = $("<span></span>");
            this.addChild(createOutlet(offsetElem, this.code.offset, this.simOutlet));
            this.exprElem.append(offsetElem);
        }

        this.exprElem.append(htmlDecoratedOperator("]", "code-postfixOp"));
    }
});

UMichEBooks.Outlets.CPP.Dot = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Dot",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        var operandElem = $("<span></span>");
        this.addChild(createOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        this.element.addClass("code-dot");
        this.exprElem.append(htmlDecoratedOperator(".", "code-postfixOp"));

        this.exprElem.append(htmlDecoratedName(this.code.memberName, this.code.type));
    },

    setEvalValue : function(value) {

    }
});

UMichEBooks.Outlets.CPP.Arrow = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Arrow",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        var operandElem = $("<span></span>");
        this.addChild(createOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem);

        this.element.addClass("code-dot");
        this.exprElem.append(htmlDecoratedOperator("->", "code-postfixOp"));

        this.exprElem.append(htmlDecoratedName(this.code.memberName, this.code.type));
    },

    setEvalValue : function(value) {

    }
});

UMichEBooks.Outlets.CPP.AddressOf = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.AddressOf",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-addressOf");
        this.exprElem.append(htmlDecoratedOperator("&", "code-unaryOp"));
        var operandElem = $("<span></span>");
        this.addChild(createOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem)
    }
});

UMichEBooks.Outlets.CPP.UnaryPlus = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.UnaryPlus",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-unaryPlus");
        this.exprElem.append(htmlDecoratedOperator("+", "code-unaryOp"));
        var operandElem = $("<span></span>");
        this.addChild(createOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem)
    }
});

UMichEBooks.Outlets.CPP.UnaryMinus = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.UnaryMinus",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-unaryMinus");
        this.exprElem.append(htmlDecoratedOperator("-", "code-unaryOp"));
        var operandElem = $("<span></span>");
        this.addChild(createOutlet(operandElem, this.code.operand, this.simOutlet));
        this.exprElem.append(operandElem)
    }
});

UMichEBooks.Outlets.CPP.Parentheses = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Parentheses",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.exprElem.append("(");
        var elem = $("<span></span>");
        this.addChild(createOutlet(elem, this.code.subExpr, this.simOutlet));
        this.exprElem.append(elem)
        this.exprElem.append(")");
    }
});

UMichEBooks.Outlets.CPP.Identifier = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Identifier",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.exprElem.addClass("code-name");

        if (Array.isArray(this.code.identifier)){ // Qualified name
            this.exprElem.append(this.code.identifier.map(function(id){return id.identifier}).join("::"));
        }
        else{
            this.exprElem.append(this.code.identifier);
        }
    },

    setEvalValue : function(value) {

    }
});

UMichEBooks.Outlets.CPP.Literal = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.Literal",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.exprElem.addClass("code-literal");
        this.exprElem.append(this.code.value.valueString());
    }
});

UMichEBooks.Outlets.CPP.ThisExpression = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.ThisExpression",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);
        this.exprElem.addClass("code-this");
        this.exprElem.append("this");
    }
});

UMichEBooks.Outlets.CPP.ImplicitConversion = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.ImplicitConversion",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-implicitConversion");
        var fromElem = $("<span></span>");
        this.addChild(createOutlet(fromElem, this.code.from, this.simOutlet));
        this.exprElem.append(fromElem)
    }
});

UMichEBooks.Outlets.CPP.LValueToRValue = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.LValueToRValue",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-lValueToRValue");
        var fromElem = $("<span></span>");
        this.addChild(createOutlet(fromElem, this.code.from, this.simOutlet));
        this.exprElem.append(fromElem)
    }
});

UMichEBooks.Outlets.CPP.QualificationConversion = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.QualificationConversion",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-qualificationConversion");
        var fromElem = $("<span></span>");
        this.addChild(createOutlet(fromElem, this.code.from, this.simOutlet));
        this.exprElem.append(fromElem)
    }
});

UMichEBooks.Outlets.CPP.ArrayToPointer = Outlets.CPP.Expression.extend({
    _name: "Outlets.CPP.ArrayToPointer",

    init: function(element, code, simOutlet){
        this.initParent(element, code, simOutlet);

        this.element.addClass("code-arrayToPointer");
        var fromElem = $("<span></span>");
        this.addChild(createOutlet(fromElem, this.code.from, this.simOutlet));
        this.exprElem.append(fromElem)
    }
});

var createOutlet = function(element, code, simOutlet){
    assert(simOutlet);
    var outletClass = DEFAULT_CODE_OUTLETS[code._class];
    if (outletClass) {
        return outletClass.instance(element, code, simOutlet);
    }
    else if(code.isA(Expressions.BinaryOp)){
        return Outlets.CPP.BinaryOp.instance(element, code, simOutlet);
    }
    else if(code.isA(Conversions.ImplicitConversion)){
        return Outlets.CPP.ImplicitConversion.instance(element, code, simOutlet);
    }
    else if(code.isA(Expressions.Expression)){
        return Outlets.CPP.Expression.instance(element, code, simOutlet);
    }
    else{
        return Outlets.CPP.Code.instance(element, code, simOutlet);
    }

};

var DEFAULT_CODE_OUTLETS = {};
DEFAULT_CODE_OUTLETS[Statements.Compound] = Outlets.CPP.Block;
DEFAULT_CODE_OUTLETS[Statements.Declaration] = Outlets.CPP.DeclarationStatement;
DEFAULT_CODE_OUTLETS[Statements.Expression] = Outlets.CPP.ExpressionStatement;
DEFAULT_CODE_OUTLETS[Statements.Selection] = Outlets.CPP.Selection;
DEFAULT_CODE_OUTLETS[Statements.While] = Outlets.CPP.While;
DEFAULT_CODE_OUTLETS[Statements.DoWhile] = Outlets.CPP.DoWhile;
DEFAULT_CODE_OUTLETS[Statements.For] = Outlets.CPP.For;
DEFAULT_CODE_OUTLETS[Statements.Return] = Outlets.CPP.Return;
DEFAULT_CODE_OUTLETS[Statements.Break] = Outlets.CPP.Break;
DEFAULT_CODE_OUTLETS[Declarations.Declaration] = Outlets.CPP.Declaration;
DEFAULT_CODE_OUTLETS[Declarations.Parameter] = Outlets.CPP.Parameter;
//DEFAULT_CODE_OUTLETS[Initializer] = Outlets.CPP.Initializer;
DEFAULT_CODE_OUTLETS[DefaultInitializer] = Outlets.CPP.DefaultInitializer;
DEFAULT_CODE_OUTLETS[DefaultMemberInitializer] = Outlets.CPP.DefaultInitializer;
DEFAULT_CODE_OUTLETS[MemberInitializer] = Outlets.CPP.DirectInitializer;
DEFAULT_CODE_OUTLETS[DirectInitializer] = Outlets.CPP.DirectInitializer;
DEFAULT_CODE_OUTLETS[CopyInitializer] = Outlets.CPP.CopyInitializer;
DEFAULT_CODE_OUTLETS[ParameterInitializer] = Outlets.CPP.ParameterInitializer;
DEFAULT_CODE_OUTLETS[ReturnInitializer] = Outlets.CPP.ReturnInitializer;
DEFAULT_CODE_OUTLETS[InitializerList] = Outlets.CPP.InitializerList;
DEFAULT_CODE_OUTLETS[Expressions.Expression] = Outlets.CPP.Expression;
DEFAULT_CODE_OUTLETS[Expressions.BinaryOp] = Outlets.CPP.BinaryOp;
//DEFAULT_CODE_OUTLETS[Expressions.BINARY_OPS["+"]] = Outlets.CPP.BinaryOp;
DEFAULT_CODE_OUTLETS[Expressions.Assignment] = Outlets.CPP.Assignment;
DEFAULT_CODE_OUTLETS[Expressions.Ternary] = Outlets.CPP.Ternary;
DEFAULT_CODE_OUTLETS[Expressions.Comma] = Outlets.CPP.Comma;
DEFAULT_CODE_OUTLETS[Expressions.CompoundAssignment] = Outlets.CPP.CompoundAssignment;
DEFAULT_CODE_OUTLETS[Expressions.FunctionCall] = Outlets.CPP.FunctionCallExpr;
DEFAULT_CODE_OUTLETS[Expressions.Subscript] = Outlets.CPP.Subscript;
DEFAULT_CODE_OUTLETS[Expressions.Dot] = Outlets.CPP.Dot;
DEFAULT_CODE_OUTLETS[Expressions.Arrow] = Outlets.CPP.Arrow;
DEFAULT_CODE_OUTLETS[Expressions.Increment] = Outlets.CPP.Increment;
DEFAULT_CODE_OUTLETS[Expressions.Decrement] = Outlets.CPP.Decrement;
DEFAULT_CODE_OUTLETS[Expressions.NewExpression] = Outlets.CPP.NewExpression;
DEFAULT_CODE_OUTLETS[Expressions.Delete] = Outlets.CPP.Delete;
DEFAULT_CODE_OUTLETS[Expressions.DeleteArray] = Outlets.CPP.DeleteArray;
DEFAULT_CODE_OUTLETS[Expressions.Construct] = Outlets.CPP.ConstructExpression;
DEFAULT_CODE_OUTLETS[Expressions.LogicalNot] = Outlets.CPP.LogicalNot;
DEFAULT_CODE_OUTLETS[Expressions.Prefix] = Outlets.CPP.Prefix;
DEFAULT_CODE_OUTLETS[Expressions.Dereference] = Outlets.CPP.Dereference;
DEFAULT_CODE_OUTLETS[Expressions.AddressOf] = Outlets.CPP.AddressOf;
DEFAULT_CODE_OUTLETS[Expressions.UnaryPlus] = Outlets.CPP.UnaryPlus;
DEFAULT_CODE_OUTLETS[Expressions.UnaryMinus] = Outlets.CPP.UnaryMinus;
DEFAULT_CODE_OUTLETS[Expressions.Parentheses] = Outlets.CPP.Parentheses;
DEFAULT_CODE_OUTLETS[Expressions.Identifier] = Outlets.CPP.Identifier;
DEFAULT_CODE_OUTLETS[Expressions.Literal] = Outlets.CPP.Literal;
DEFAULT_CODE_OUTLETS[Expressions.ThisExpression] = Outlets.CPP.ThisExpression;


DEFAULT_CODE_OUTLETS[Conversions.ArrayToPointer] = Outlets.CPP.ArrayToPointer;
DEFAULT_CODE_OUTLETS[Conversions.LValueToRValue] = Outlets.CPP.LValueToRValue;
DEFAULT_CODE_OUTLETS[Conversions.QualificationConversion] = Outlets.CPP.QualificationConversion;
