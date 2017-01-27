<?php

require 'Slim/Slim.php';
\Slim\Slim::registerAutoloader();

$app = new \Slim\Slim();

$app->get('/component/sim/standard', function(){
?>
    <input type="text" class="codeSelect" name="codeSelect" />
    <table><tr>
      <td>
        <h1>Write your code in the box below.</h1>
        <div class="status" style = "width: auto;"></div>
	<div class="tabs"></div>
        <div class="codeArea boxSizing" style = "position: relative; min-height: 400px; width: auto">
          <textarea style="position: absolute"></textarea>
        </div>
        <div>
          <button class = "stepBackward">Step Backward</button>
          <button class = "stepForward">Step Forward</button>
        </div>
      </td>
      <td>
        <ul class = "problems" style = "width: 400px;"></ul>
        <div class = "stackFrames readOnly" style="min-width: 400px; text-wrap: avoid; position: relative; white-space: nowrap;"> </div>
      </td>
      <td>
        <div class = "memory readOnly" style="position: relative;"> </div>
      </td>
    </tr></table>

<?php

});

$app->run();

?>
