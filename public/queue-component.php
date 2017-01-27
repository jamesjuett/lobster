<?php

require 'Slim/Slim.php';
\Slim\Slim::registerAutoloader();

$app = new \Slim\Slim(array(
    'mode' => 'production'
));

// Only invoked if mode is "production"
$app->configureMode('production', function () use ($app) {
    $app->config(array(
        'log.enable' => true,
        'debug' => false
    ));
});

// Only invoked if mode is "development"
$app->configureMode('development', function () use ($app) {
    $app->config(array(
        'log.enable' => false,
        'debug' => true
    ));
});


$app->get('/queue-component/courseContent/eecs280', function(){
?>
  <img src="1695BBB.jpg" width="400px"/>
    <h4>Before asking a question at office hours…</h4>
   <ol>
       <li>
       Do a search on piazza for your problem and or question
       </li>
       <li>
           If it’s a coding question, narrow down where in your code your program is going wrong
           <ul>
               <li>
                   If you are using a debugger like­­ Xcode or visual studio, set breakpoints
               </li>
               <li>
                   Else use print statements
               </li>
           </ul>
       </li>
       <li>
           If you did step 1 and 2 and are still stuck OR have a question about how to do step 1 or 2 please feel free to ask us, we are here to help
       </li>
   </ol>
   <p><a class="adminOnly" href="https://docs.google.com/document/d/1ujhe_pKSgeUS4K3nl9PKx1R6RVT1r5wKx_USEtL5pn4/edit">OHFAQ</a></p>
   <p><a class="adminOnly" href="https://goo.gl/forms/UYAlhr5Dt2pz7TA03">Alex's Independent Study Form</a></p>

<?php

});



$app->get('/queue-component/courseContent/engr101', function(){
?>
    <h4>Welcome to ENGR101 Office Hours!</h4>

<?php

});

$app->get('/queue-component/courseContent/:courseId', function($courseId){
    echo "<p>Welcome to the help queue for $courseId!</p>";
});

$app->run();

?>
