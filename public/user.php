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

$app->get('/user/:who/:name', function ($who, $name) use ($theuser) {

    $db = dbConnect();
  $stmt = $db->prepare('SELECT code, isPublic FROM user_code WHERE uniqname=:uniqname AND name=:name');
  $stmt->bindParam('uniqname', $who);
  $stmt->bindParam('name', $name);
  $stmt->execute();
  $res = $stmt->fetchObject();
  echo $res->code;
});




$app->get('/api/me/codeList', function () use ($theuser) {

    $db = dbConnect();
  $stmt = $db->prepare('SELECT name, isPublic FROM user_code WHERE uniqname=:uniqname');
  $stmt->bindParam('uniqname', $theuser);
  $stmt->execute();  

  $names = $stmt->fetchAll();
  echo json_encode($names);
});


$app->post('/api/me/save', function () use ($app, $theuser) {
  $name = $app->request->post('name');
  $code = $app->request->post('code');


    $db = dbConnect();
  $stmt = $db->prepare('INSERT INTO user_code (uniqname, name, code) VALUES(:uniqname, :name, :code) ON DUPLICATE KEY UPDATE uniqname=VALUES(uniqname), name=VALUES(name), code=VALUES(code)');
  $stmt->bindParam('name', $name);
  $stmt->bindParam('code', $code);
  $stmt->bindParam('uniqname', $theuser);
  $stmt->execute();  

});

$app->post('/api/me/setCodePublic', function () use ($app, $theuser) {
  $name = $app->request->post('name');
  $isPublic = $app->request->post('isPublic') == 'true';


    $db = dbConnect();
  $stmt = $db->prepare('UPDATE user_code SET isPublic = :isPublic where uniqname=:uniqname AND name=:name');
  $stmt->bindParam('name', $name);
  $stmt->bindParam('isPublic', $isPublic);
  $stmt->bindParam('uniqname', $theuser);
  $stmt->execute();  

});



$app->post('/api/log', function () use ($app, $theuser) {

  $actions = json_decode($app->request->post('data'), true);
  //error_log($app->request->post('data'));

  foreach($actions as $action){
  
    $actionName = $action['action'];
    $data = json_encode($action['value']);


    $db = dbConnect();
    $stmt = $db->prepare('insert into userActions values (NULL, :uniqname, :action, NULL, :data)');
    $stmt->bindParam('uniqname', $theuser);
    $stmt->bindParam('action', $actionName);
    $stmt->bindParam('data', $data);
    $stmt->execute();
  }
});

$app->run();

//phpinfo();

?>
