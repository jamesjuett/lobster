<?php

require_once 'vendor/autoload.php';
require_once 'auth.php';

$GLOBALS["config"] = parse_ini_file("../php/php.config");

function dbConnect() {
    $db = new PDO('mysql:host=127.0.0.1;dbname=lobster', $GLOBALS["config"]["db_username"], $GLOBALS["config"]["db_password"]);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    return $db;
}

$app = new \Slim\Slim(array(
    'mode' => $GLOBALS["server_mode"]
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

$app->get('/log/new', function () use ($app, $theuser) {


    $db = dbConnect();
    $stmt = $db->prepare('insert into logs values (NULL, :uniqname, NULL)');
    $stmt->bindParam('uniqname', $theuser);
    $stmt->execute();
    echo $db->lastInsertId();
});


$app->post('/log/update', function () use ($app, $theuser) {

  $logId = $app->request->post('logId');
  $actions = json_decode($app->request->post('actions'), true);
  //error_log($app->request->post('data'));

  foreach($actions as $action){
  
    $actionName = $action['action'];
    $data = json_encode($action['value']);


    $db = dbConnect();
    $stmt = $db->prepare('insert into logActions values (NULL, :logId, :action, NULL, :data)');
    $stmt->bindParam('logId', $logId);
    $stmt->bindParam('action', $actionName);
    $stmt->bindParam('data', $data);
    $stmt->execute();
  }
});

$app->get('/log/get/:logId', function ($logId) use ($app, $theuser) {

  // Only James :)
  if ($theuser != 'jjuett') { return; }



    $db = dbConnect();
  $stmt = $db->prepare('select * from logs, logActions where logs.logId = :logId AND logs.logId = logActions.logId');
  $stmt->bindParam('logId', $logId);
  $stmt->execute();

  $result = $stmt->fetchAll();
  echo json_encode($result);
});

function getUsers($db){
  $stmt = $db->prepare('SELECT DISTINCT(uniqname) AS uniqname FROM logs ORDER BY uniqname');
  $stmt->execute();
  return $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
}

function userTime($stamps){

  $count = 0;
  $diffs = array();
  $total = 0;
  for($i = 1; $i < count($stamps); $i++){
    $count = $count + 1;
    $diff = ($stamps[$i] - $stamps[$i-1]);
    $diffs[] = $diff;
    if ($diff < 60 * 10) {
      // If less than 10 minute difference, count it
      $total = $total + $diff;
    }
    //echo $diff;
    //echo '<br />';
  }
  return $total;
}

$app->get('/log/view(/:begin(/:end))', function ($begin=0, $end=2000000000) use ($app, $theuser) {

  

  // Only James :)
  if ($theuser != 'jjuett') { return; }


    $db = dbConnect();

  $users = getUsers($db);

  $who = "bleh";
//  $stmt = $db->prepare('select UNIX_TIMESTAMP(logActions.ts) from logs, logActions where logs.uniqname = :who AND logs.logId = logActions.logId ORDER BY logActions.actionId');
  $stmt = $db->prepare('select UNIX_TIMESTAMP(logActions.ts) from logs, logActions where logs.uniqname = :who AND UNIX_TIMESTAMP(logActions.ts) > :begin AND UNIX_TIMESTAMP(logActions.ts) < :end AND logs.logId = logActions.logId ORDER BY logActions.actionId');
  $stmt->bindParam('who', $who);
  $stmt->bindParam('begin', $begin);
  $stmt->bindParam('end', $end);

  $stmt2 = $db->prepare('select count(*) from logs, logActions where logs.uniqname = :who AND UNIX_TIMESTAMP(logActions.ts) > :begin AND UNIX_TIMESTAMP(logActions.ts) < :end AND logs.logId = logActions.logId AND logActions.action="simulate"');
  $stmt2->bindParam('who', $who);
  $stmt2->bindParam('begin', $begin);
  $stmt2->bindParam('end', $end);
  
  for($i = 0; $i < count($users); $i++){
    $who = $users[$i];
    $stmt->execute();

    $stamps = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);

    $stmt2->execute();

    echo $users[$i].", ".userTime($stamps).", ".$stmt2->fetchColumn().'<br />';
  }

});


$app->get('/log/view/:who', function ($who) use ($app, $theuser) {

  // Only James :)
  if ($theuser != 'jjuett') { return; }



    $db = dbConnect();
  $stmt = $db->prepare('select UNIX_TIMESTAMP(logActions.ts) from logs, logActions where logs.uniqname = :who AND logs.logId = logActions.logId ORDER BY logActions.actionId');
  $stmt->bindParam('who', $who);
  $stmt->execute();

  $stamps = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);

  echo userTime($stamps);

});



$app->run();

//phpinfo();

?>
