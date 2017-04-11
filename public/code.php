<?php          require 'Slim/Slim.php';
	  \Slim\Slim::registerAutoloader();
	
	  $app = new \Slim\Slim();
	  $app->get('/code/:name', function ($name) {
	    ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />

    <!--<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>-->
    <script src="/codemirror.js"></script>
    <script src="/jquery-1.8.3.min.js"></script>
    <script src="/jquery.mousewheel.min.js"></script>
    <script src="/peg-0.8.0.min.js"></script>
    <script src="/svg.min.js"></script>
    <!-- Always force latest IE rendering engine (even in intranet) & Chrome Frame
    Remove this if you use the .htaccess -->
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />

    <title>EECS280 Labster</title>
    <meta name="description" content="" />
    <meta name="author" content="James" />

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Replace favicon.ico & apple-touch-icon.png in the root of your domain and delete these references -->
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="stylesheet" href="/codemirror.css">
    <link rel="stylesheet" href="/monokai.css">
    <link rel="stylesheet" href="/lobster.css">
    <link rel="stylesheet" href="/main.css">
    <link rel="stylesheet" href="/code.css">

    <script src = "/diff_match_patch.js"></script>
    <script src = "/underscore-min.js"></script>
    <script src = "/math.min.js"></script>
    <script src = "/util.js"></script>
    <script src = "/entities.js"></script>
    <script src = "/outlet.js"></script>
    <script src = "/internals.js"></script>
    <script src = "/annotations.js"></script>
    <script src = "/error.js"></script>
    <script src = "/types.js"></script>
    <script src = "/expressions.js"></script>
    <script src = "/declarations.js"></script>
    <script src = "/statements.js"></script>
    <script src = "/Program.js"></script>
    <script src = "js/core/Simulation.js"></script>
    <script src = "/simOutlets.js"></script>
    <script src = "/codeOutlets.js"></script>
    <script src = "/parsing.js"></script>
    <script src = "/parsing2.js"></script>
    <script src = "js/core/analysis.js"></script>

</head>

<body>

<div id="main_area" style = "left: 0px;">
    <div style="text-align: center">
        <h2>EECS 280 Labster</h2>
    </div>
    <table><tr>
        <td style="vertical-align: top; width: 100%">
            <!-- <div  class="codeArea" style = "display: block; position: absolute; min-height: 300px; width: 300px;">
                <div id = "codeAreaShadow" style = "background: none; border: none; display: block; position: relative; margin: 0; padding: 0;"></div>
            </div> -->
            <div class="tabs">
                <span id="sourceTab" class="active">Source Code</span>
                <span id="simTab">Simulation</span>
            </div>
            <div class = "tabPanes" style="position: relative; min-width: 700px; background-color: ghostwhite">
                <div id="sourcePane" style="display: block; position: relative; width: 100%">
		    <div style="display:none">
		      <input class="saveName" type="text" maxLength="30" value="program.cpp" />
		      <button class="saveButton">Save</button>
		      <span class="saveMessage" style="">Saving...</span>
		    </div>
                    <div style = "height: 22px; padding: 2px; background-color: lightgray">
                        <button class = "runButton" style="display: inline-block">Simulate</button>
                        <span class="status"></span>
                    </div>
                    <ul class = "semanticProblems" style = "width: 100%; max-height: 100px; overflow-y: auto; box-sizing: border-box;"></ul>
                    <div id="codeMirrorEditor" style = "position: relative; height: 500px; overflow-y: auto">
                        <!--<textarea style="position: absolute; overflow-y: hidden; height: 2000px; color: black"></textarea>-->
                        <!--<div style="height: 400px;"></div>-->
                    </div>
                </div>
                <div id="simPane" style="display: none; position: relative; width: 100%; min-height: 300px;">
                <!-- <p style = "width: 394px; padding: 5px;" class = "_outlet readOnly memory">memory</p> -->
                    <table><tr>
                        <td style="vertical-align: top">
                            <div style = "text-align: center">Memory</div>
                            <div class = "memory readOnly"> </div>
                        </td>
                        <td style="position: relative; vertical-align: top; width: 100%;">
                            <div>
                                <button class = "restart">Restart</button>
                                <!--<span style = "display: inline-block; width: 4ch"></span>-->
                                <input type="text" style="display: none; width: 4ch" class="stepForwardNum" value="1" />
                                <button class = "stepForward">Step Forward</button>
                                <button class = "stepOver" style="display:none;" >Step Over</button>
                                <button class = "stepOut" style="display:none;">Step Out</button>
                                <button class = "runToEnd" style="display:none;">Run</button>
                                <button class = "pause" style="display:none;">Pause</button>
                                <button class = "skipToEnd" style="display:none;" >Skip to End (FAST)</button>

                                <!--Show Functions<input type="checkbox" class="stepInto"/>-->
                                <button class = "stepBackward" >Step Backward</button>
                                <input type="text" style="display:none;" width: 4ch" class="stepBackwardNum" value="1" />
                            </div>
                            <div>
                                <div class="runningProgress">Thinking...<progress></progress></div>
				<div class="alerts-container">
				    <div class="alerts">
					<div style="display:inline-block; padding: 5px">
					    <div style="height: 100px; margin-left: 5px; float: right;">
						<img src="/lobster.png" style="height: 80px; margin-left: 5px;"/>
						<div style="padding-right: 5px; text-align: right"><button>Sorry, my bad...</button></div>
					    </div>
					    <table style="height: 110px"><tr><td><div class="alerts-message"></div></td></tr></table>
					</div>
				    </div>
				</div>
                                <div>Console</div>
                                <div class="console"></div></div>
                            <div class = "stackFrames readOnly" style="display: block; overflow-y: auto; min-width: 400px; text-wrap: avoid; position: relative; white-space: nowrap;"> </div>
                        </td>
                        </tr>
                    </table>

                    <!-- <p style = "width: 394px; padding: 5px;" class = "_outlet readOnly memory">memory</p> -->

                </div>
            </div>
        </td>
    </tr></table>
</div>

<script>

    var simulation = Simulation.instance();

    $(document).ready(function() {

        var sourceTab = $("#sourceTab");
        var simTab = $("#simTab");
        var sourcePane = $("#sourcePane");
        var simPane = $("#simPane");


        var simOutlet = Outlets.CPP.SimulationOutlet.instance($("#main_area"), simulation, {log:false});

        sourceTab.click(function(){
            sourceTab.addClass("active");
            simTab.removeClass("active");
            sourcePane.css("display", "block");
            simPane.css("display", "none");
            simOutlet.sim.annotate();
        });

        simTab.add(".runButton").click(function(){
            simTab.addClass("active");
            sourceTab.removeClass("active");
            simPane.css("display", "block");
            sourcePane.css("display", "none");
            simOutlet.saveFunc();
            simOutlet.send("userAction", UserActions.Simulate.instance());
        });

        var elem = $(".codeListAll");
        var codeList = CodeList.instance(elem, "/api/", simOutlet.editor, false);
        simOutlet.listenTo(codeList);

        codeList.loadCode(<?php echo '"'.$name.'"'; ?>);

        createDefaultOutlets();

    });



</script>
</body>
</html>
<?php 
	  });

	  $app->run();
	  
?>
