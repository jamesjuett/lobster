/**
 * @author James
 */

var Lobster = Lobster || {};
Lobster.Outlets.CPP = Lobster.Outlets.CPP || {};

var FADE_DURATION = 300;
var SLIDE_DURATION = 400;

Lobster.Outlets.CPP.CPP_ANIMATIONS = true;

var CodeList = Lobster.Outlets.CPP.CodeList = WebOutlet.extend({
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
        // this.editor.converse(this);

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
        // TODO NEW put something like this back in somewhere
        // if(!this.editor.isSaved() && !confirm("Your code has unsaved changes, and loading a file will overwrite them. Are you sure?")) {
        //     return;
        // }
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
    _act: {
        saved: function(){
            this.loadList();
        }
    }

});

var ProjectList = Lobster.Outlets.CPP.ProjectList = Class.extend(Observable, {
    _name: "ProjectList",

    API_URL : "/api/me/project/list",

    // element should be a jquery object
    init: function(element) {
        this.i_element = element;
        element.addClass("projectList");

        this.refresh();
    },

    refresh : function(){
        this.ajax({
            type: "GET",
            url: this.API_URL,
            success: function(data){
                this.i_setList(data);
            },
            dataType: "json"
        });
    },

    i_setList : function(projects) {
        var self = this;

        this.i_element.empty();

        for(var i = 0; i < projects.length; i++) {
            var project = projects[i];
            var item = $("<li></li>");
            var link = $('<a class="link" data-toggle="pill">' + project["project"] + '</a>');
            item.append(link);
            link.click(function(){
                self.send("loadProject", $(this).html());
            });

            this.i_element.append(item);
        }
    }

});

Lobster.Outlets.CPP.SimulationOutlet = WebOutlet.extend({
    _name: "SimulationOutlet",
    DEFAULT_CONFIG : {
        initCode: "int main(){\n  \n}"
    },
    init: function(element, config) {
        this.i_config = makeDefaulted(config, Outlets.CPP.SimulationOutlet.DEFAULT_CONFIG);

        assert(element instanceof jQuery);

        this.initParent(element);

        this.program = Program.instance();
        this.sim = Simulation.instance(this.program);
        this.listenTo(this.sim);

        if (this.i_config.log !== false){
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
        });

        simTab.add(element.find(".runButton")).click(function(){
            simTab.addClass("active");
            sourceTab.removeClass("active");
            simPane.css("display", "flex");
            sourcePane.css("display", "none");
            self.saveFunc();
            self.send("userAction", UserActions.Simulate.instance());
            simPane.focus();
            self.restart();
        });


        this.projectEditor = ProjectEditor.instance(sourcePane);


        this.errorStatus = ValueEntity.instance();


        this.runningProgress = element.find(".runningProgress");
//        this.console = ValueEntity.instance();

        // if ((elem = element.find(".codeMirrorEditor")).length !== 0) {
        //     this.editor = Outlets.CPP.FileEditor.instance(elem, this.program);
        //     this.listenTo(this.editor);
        //     this.listenTo(this.editor.getProgram());
        //     this.sim.converse(this.editor);
        //     // Dismiss any annotation messages
        //     var self = this;
        //     elem.click(function(){
        //         self.hideAnnotationMessage();
        //     })
        // }
        if ((elem = this.statusElem = element.find(".status")).length !== 0) {
            this.status = Outlets.HtmlOutlet.instance(elem, true).listenTo(this.errorStatus);
        }
        if ((elem = element.find(".console")).length !== 0) {
            this.consoleOutlet = Outlets.HtmlOutlet.instance(elem, true).listenTo(this.sim.console);
        }
        // if ((elem = element.find(".semanticProblems")).length !== 0) {
        //     this.problemsElem = elem;
        //     //this.problems = Outlets.List.instance(elem, $("<li></li>")).listenTo(sim.semanticProblems);
        // }
        if ((elem = element.find(".stackFrames")).length !== 0) {
            if (this.useSourceSimulation){
                this.stackFrames = Outlets.CPP.SourceSimulation.instance(elem, this.sim, this);
                this.listenTo(this.stackFrames);
            }
            else{
                this.stackFrames = Outlets.CPP.SimulationStack.instance(elem, this.sim, this);
                this.listenTo(this.stackFrames);
            }
        }
        //if ((elem = element.find(".stackFrames2")).length !== 0) {
        //    //this.stackFrames2 = Outlets.CPP.SimulationStack.instance(elem, sim, this);
        //    this.stackFrames2 = Outlets.CPP.SourceSimulation.instance(elem, sim, this);
        //    this.listenTo(this.stackFrames2);
        //}
        if ((elem = element.find(".memory")).length !== 0) {
            this.memory = Outlets.CPP.Memory.instance(elem, this.sim.memory);
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
                    self.projectEditor.saveProject();
                    // self.saveMessage.html("Saving...").show();
                    // $.post("api/me/save", {idtoken: ID_TOKEN, name: name, code: self.editor.getText()}, function(){
                    //     console.log("save successful");
                    //     self.saveMessage.html("Saved!").fadeOut(5000);
                    //     self.editor.save();
                    //     CodeList.reloadLists();
                    // });
                }
                else{
                    if(!suppressAlert) {
                        alert("Sorry, couldn't save the file. (Invalid file name.)");
                    }
                }
            };
            // this.editor.saveFunc = this.saveFunc;

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
        // this.log && this.log.listenTo(this);
        // this.log && this.log.listenTo(this.editor);
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

    loadProject : function(projectName){
        // TODO NEW: warn about losing unsaved changes

        this.projectEditor.loadProject(projectName);

    },

    restart : function(){
        this.setEnabledButtons({}, true);
        this.sim.start();
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
            $("body").removeClass("noTransitions").height(); // .height() is to force reflow

        }
        else{
            $("body").addClass("noTransitions").height(); // .height() is to force reflow
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

    _act : {
        loadCode : "loadCode",
        loadProject : "loadProject",
        runTo: "runTo",
        skipToEnd: "skipToEnd",
        compiled : function(msg){
            this.errorStatus.setValue("Compilation successful!");
            this.statusElem.removeClass("error");
            this.runButton.css("display", "inline-block");
        },
        syntaxError : function(msg){
            var err = msg.data;
            this.errorStatus.setValue("Syntax error at line " + err.line + ", column " + err.column/* + ": " + err.message*/);
            this.statusElem.addClass("error");
            this.runButton.css("display", "none");
        },
        semanticError : function(msg){
            this.errorStatus.setValue("Semantic error(s) detected.");
            this.statusElem.addClass("error");
            this.runButton.css("display", "none");

        },
        otherError : function(msg){
            this.errorStatus.setValue(msg.data);
            this.statusElem.addClass("error");
            this.runButton.css("display", "none");
        },
        unknownError : function(msg){
            this.errorStatus.setValue("Oops! Something went wrong. You may be trying to use an unsupported feature of C++. Or you may have stumbled upon a bug. Feel free to let me know at jjuett@umich.edu if you think something is wrong.");
            this.statusElem.addClass("error");
            this.runButton.css("display", "none");
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
            //this.i_paused = true;
            this.setEnabledButtons({
                "pause": false
            }, true);
            this.element.find(".simPane").focus();
            this.runningProgress.css("visibility", "hidden");
        },
        atEnded : function(msg){
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

var ProjectEditor = Lobster.Outlets.CPP.ProjectEditor = Class.extend(Observer, {
    _name : "ProjectEditor",

    API_URL_LOAD_PROJECT : "/api/me/project/get/",
    API_URL_SAVE_PROJECT : "/api/me/project/save/",

    init : function(element) {
        var self = this;

        this.i_filesElem = element.find(".project-files");
        this.i_fileEditors = {};
        this.i_program = Program.instance();
        this.i_translationUnits = {};

        this.i_codeMirror = CodeMirror(element.find(".codeMirrorEditor")[0], {
            mode: FileEditor.CODE_MIRROR_MODE,
            theme: "monokai",
            height: "auto",
            lineNumbers: true,
            tabSize: 2,
            extraKeys: {
                "Ctrl-S" : function(){
                    self.saveProject();
                }
            },
            gutters: ["CodeMirror-linenumbers", "errors"]
        });


    },

    loadProject : function(projectName){
        // TODO NEW: warn about losing unsaved changes

        this.ajax({
            type: "GET",
            url: this.API_URL_LOAD_PROJECT + projectName,
            success: function (data) {
                if (!data){
                    alert("Project not found! :(");
                    return;
                }
                this.i_projectName = projectName;
                this.i_setProject(data);
                document.title = projectName;
                this.i_isSaved = true;
            },
            dataType: "json"
        });

    },

    saveProject : function(projectName) {
        projectName = projectName || this.i_projectName;
        var projectFiles = [];
        for(var filename in this.i_fileEditors) {
            projectFiles.push({
                name: filename,
                text: this.i_fileEditors[filename].getText()
            });
        }

        this.ajax({
            type: "POST",
            url: this.API_URL_SAVE_PROJECT + projectName,
            data: {files: projectFiles},
            success: function(data){
                console.log("saved successfully");
                this.i_isSaved = true;
            },
            dataType: "json"
        });
    },

    isSaved : function() {
        return this.i_isSaved;
    },

    i_setProject : function(project){
        var self = this;

        this.i_clearProject();

        for(var i = 0; i < project.length; ++i) {
            var file = project[i];

            // Create tab for each file in the project
            var item = $('<li></li>');
            var link = $('<a href="" data-toggle="tab">' + file["name"] + '</a>');
            link.click(function(){
                self.i_selectFile($(this).html());
            });
            item.append(link);
            this.i_filesElem.append(item);

            var fileName = file["name"];
            // Create a program for each file.
            var translationUnit = this.i_translationUnits[fileName] = TranslationUnit.instance(this.i_program, file["code"]);

            // Create a CodeMirror document for each file in the project
            var fileEd = FileEditor.instance(fileName, translationUnit);
            this.listenTo(fileEd);
            this.i_fileEditors[fileName] = fileEd;
        }

        // Set first file to be active
        this.i_filesElem.children().first().addClass("active");
        this.i_selectFile(project[0]["name"]);

        this.i_program.fullCompile();
    },

    i_clearProject : function() {

        this.i_filesElem.empty();

        for (var filename in this.i_fileEditors) {
            this.i_fileEditors[filename].removeListener(this);
        }
        this.i_fileEditors = {};

        this.i_program = Program.instance();
        this.i_translationUnits = {};
    },

    i_selectFile : function(filename) {
        assert(this.i_fileEditors[filename]);
        this.i_codeMirror.swapDoc(this.i_fileEditors[filename].getDoc());
    },
    _act : {
        textChanged : function() {
            this.i_isSaved = false;

            console.log("Project editor knows about source changes.");
            this.i_program.fullCompile();
        }
    }


    // setSource : function(src){
    //     this.i_sourceCode = src;
    // },





});


var IDLE_MS_BEFORE_COMPILE = 1000;

var FileEditor = Lobster.Outlets.CPP.FileEditor = Outlet.extend({
    _name: "FileEditor",
    CODE_MIRROR_MODE : "text/x-c++src",
    DEFAULT_CONFIG : {
        initCode: "int main(){\n  \n}"
    },
    s_instances : [],
    s_onbeforeunload : function(){
        if (CodeList.ajaxSuccessful){
            for(var i = 0; i < FileEditor.s_instances.length; ++i){
                if (!FileEditor.s_instances[i].isSaved()){
                    return "The file (" + FileEditor.s_instances[i].getFileName() + ") has unsaved changes.";
                }
            }
        }
    },
    /**
     *
     * @param {String} fileName The name of the file.
     * @param {TranslationUnit} translationUnit The translation unit to be connected to this file.
     * @param config
     */
    init: function(fileName, translationUnit, config) {
        this.i_fileName = fileName;
        this.i_translationUnit = translationUnit;
        this.i_doc =  CodeMirror.Doc(translationUnit.getSourceCode(), this.CODE_MIRROR_MODE);
        this.listenTo(this.i_translationUnit);

        this.i_config = makeDefaulted(config, Outlets.CPP.FileEditor.DEFAULT_CONFIG);
        this.initParent();

        this.i_annotations = [];
        this.i_gutterErrors = [];
        this.i_isSaved = true;


        // TODO NEW is this still being used?
        var self = this;
        this.i_doc.on("change", function(e){
            self.i_onEdit();
        });


        //this.loadCode({name: "program.cpp", code: this.i_config.initCode});
        FileEditor.s_instances.push(this);
    },

    getTranslationUnit : function() {
        return this.i_translationUnit;
    },

    getDoc : function() {
        return this.i_doc;
    },

    getText : function() {
        return this.i_doc.getValue();
    },

    getFileName : function() {
        return this.i_fileName;
    },
    
    // loadCode : function(program){
    //     this.i_programName = program.name;
    //     var code = program.code;
    //     this.i_doc.setValue(code);
    //     this.setSource(code);
    //     this.i_isSaved = true; // setting source would have made this false
    //     this.send("userAction", UserActions.LoadCode.instance(code));
    // },

    i_onEdit : function() {
        var newText = this.getText();

        if(this.i_onEditTimeout){
            clearTimeout(this.i_onEditTimeout);
        }
        var self = this;
        this.i_onEditTimeout = setTimeout(function(){
            self.i_translationUnit.setSourceCode(self.getText());

            self.send("textChanged", newText);

            // analyze(self.i_translationUnit, self);
        }, IDLE_MS_BEFORE_COMPILE);
    },

    addMark : function(code, cssClass){
        var doc = this.i_doc;
        var from = doc.posFromIndex(code.start);
        var to = doc.posFromIndex(code.end);
        return doc.markText(from, to, {startStyle: "begin", endStyle: "end", className: "codeMark " + cssClass});
    },

    addGutterError : function(line, text){
        --line;
        var marker = this.i_gutterErrors[line];
        if (!marker){
            marker = this.i_gutterErrors[line] = {
                elem:$('<div class="gutterError">!<div></div></div>'),
                num: 0
            };
        }
        var elem = $('<div class="errorNote">'+text+'</div>');
        marker.elem.children("div").append(elem);
        ++marker.num;
        if (marker.num === 1){
            this.i_doc.setGutterMarker(line, "errors", marker.elem[0]);
        }
        return elem;
    },

    removeGutterError : function(line){
        --line;
        var marker = this.i_gutterErrors[line];
        if (marker){
            --marker.num;
            if (marker.num == 0){
                this.i_doc.setGutterMarker(line, "errors",null);
            }
        }
    },


    addWidget : function(code, elem){
        var from = this.i_doc.posFromIndex(code.start);

        this.i_doc.addWidget(from, elem[0], false);
    },

    addAnnotation : function(ann) {

        ann.onAdd(this);
        this.i_annotations.push(ann);
    },

    clearAnnotations : function(){
        for(var i = 0; i < this.i_annotations.length; ++i){
            this.i_annotations[i].onRemove(this);
        }

        this.i_annotations.length = 0;
    },



    _act : {
        // loadCode: "loadCode", // TODO NEW remove this?
        parsed : function(msg){
            if (this.syntaxErrorLineHandle) {
                this.i_doc.removeLineClass(this.syntaxErrorLineHandle, "background", "syntaxError");
            }
        },
        syntaxError : function(msg){
            if (this.syntaxErrorLineHandle) {
                this.i_doc.removeLineClass(this.syntaxErrorLineHandle, "background", "syntaxError");
            }
            var err = msg.data;
//            this.marks.push(this.i_doc.markText({line: err.line-1, ch: err.column-1}, {line:err.line-1, ch:err.column},
//                {className: "syntaxError"}));
            this.syntaxErrorLineHandle = this.i_doc.addLineClass(err.line-1, "background", "syntaxError");
            this.clearAnnotations();
        },
        semanticProblems : function(msg){
            this.clearAnnotations();

            var semanticProblems = msg.data;


            for(var i = 0; i < semanticProblems.errors.length; ++i){
                var problem = semanticProblems.errors[i];
                this.addAnnotation(GutterAnnotation.instance(
                    problem.getConstructs()[0],
                    isA(problem, SemanticError) ? "error" : "warning",
                    problem.getMessage()
                ));
            }
            for(var i = 0; i < semanticProblems.warnings.length; ++i){
                var problem = semanticProblems.warnings[i];
                this.addAnnotation(GutterAnnotation.instance(
                    problem.getConstructs()[0],
                    isA(problem, SemanticError) ? "error" : "warning",
                    problem.getMessage()
                ));
            }

            // TODO NEW Return support for widgets elsewhere.
            // Perhaps reimplement as a generic kind of SemanticNote class
            // for(var i = 0; i < this.i_semanticProblems.widgets.length; ++i){
            //     // alert(this.i_semanticProblems.get(i));
            //     this.send("addAnnotation", this.i_semanticProblems.widgets[i]);
            // }
        }
	}

});
$(window).on("beforeunload", FileEditor.s_onbeforeunload);

var SVG_DEFS = {};


Lobster.Outlets.CPP.Memory = WebOutlet.extend({
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
    _act : {
        reset : function(){
//            this.element.html(this.memory.toString());
        }

//        cleared : function(){
//            this.element.html("");
//        }
    }



});

Lobster.Outlets.CPP.MemoryObject = WebOutlet.extend({
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

    _act : {
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

Lobster.Outlets.CPP.SingleMemoryObject = Outlets.CPP.MemoryObject.extend({
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

Lobster.Outlets.CPP.TreeMemoryObject = Outlets.CPP.SingleMemoryObject.extend({
    _name: "TreeMemoryObject",

    init: function(element, object, memoryOutlet){
        this.initParent(element, object, memoryOutlet);
        this.objElem.css("white-space", "pre");
    },

    updateObject : function(){
        this.objElem.html(breadthFirstTree(this.object.rawValue()));
    }
});


Lobster.Outlets.CPP.PointerMemoryObject = Outlets.CPP.SingleMemoryObject.extend({
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

Lobster.Outlets.CPP.ReferenceMemoryObject = Outlets.CPP.MemoryObject.extend({
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
    _act: copyMixin(Outlets.CPP.MemoryObject._act, {
        bound: "bound"
    })
});

Lobster.Outlets.CPP.ArrayMemoryObject = Outlets.CPP.MemoryObject.extend({
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

Lobster.Outlets.CPP.ArrayElemMemoryObject = Outlets.CPP.MemoryObject.extend({
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

Lobster.Outlets.CPP.ClassMemoryObject = Outlets.CPP.MemoryObject.extend({
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

Lobster.Outlets.CPP.StackFrame = WebOutlet.extend({
    _name : "Outlets.CPP.StackFrame",
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


Lobster.Outlets.CPP.StackFrames = WebOutlet.extend({
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
    _act : {
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


Lobster.Outlets.CPP.Heap = WebOutlet.extend({
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

    _act : {
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


Lobster.Outlets.CPP.TemporaryObjects = WebOutlet.extend({
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

    _act : {
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

Lobster.Outlets.CPP.RunningCode = WebOutlet.extend({
    _name: "WebOutlet",
    init: function(element, sim, simOutlet){
        this.initParent(element, true);
        this.sim = sim;
        this.listenTo(sim);

        this.simOutlet = simOutlet;
    },
    pushed: function(codeInst){
        // main has no caller, so we have to handle creating the outlet here
        if (codeInst.model.context.isMainCall) {
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
        this.mainCall = Outlets.CPP.FunctionCall.instance(this.sim.mainCallInstance(), this);
        this.started();
        var last = this.sim.i_execStack.last();
        if (last) {
            last.send("upNext");
            last.funcContext.send("currentFunction");
        }
    },
    _act : {
        pushed: true,
        started: true,
        cleared: true,
        afterFullStep: true
    }
});

Lobster.Outlets.CPP.SimulationStack = Outlets.CPP.RunningCode.extend({
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


Lobster.Outlets.CPP.SourceSimulation = Outlets.CPP.RunningCode.extend({
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
        this.sim.i_topLevelDeclarations.forEach(function(decl){
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

