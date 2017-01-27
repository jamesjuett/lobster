<?php

$theuser = $_SERVER['REMOTE_USER'];

require 'Slim/Slim.php';
\Slim\Slim::registerAutoloader();

$app = new \Slim\Slim();

$app->get('/user/:who/:name', function ($who, $name) use ($theuser) {
  $db = new PDO('mysql:host=127.0.0.1;dbname=labster', 'labster', '***REMOVED***');
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $stmt = $db->prepare('SELECT code, isPublic FROM user_code WHERE uniqname=:uniqname AND name=:name');
  $stmt->bindParam('uniqname', $who);
  $stmt->bindParam('name', $name);
  $stmt->execute();
  $res = $stmt->fetchObject();
  echo $res->code;
});




$app->get('/api/me/codeList', function () use ($theuser) {
  $db = new PDO('mysql:host=127.0.0.1;dbname=labster', 'labster', '***REMOVED***');
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $stmt = $db->prepare('SELECT name, isPublic FROM user_code WHERE uniqname=:uniqname');
  $stmt->bindParam('uniqname', $theuser);
  $stmt->execute();  

  $names = $stmt->fetchAll();
  echo json_encode($names);
});


$app->post('/api/me/save', function () use ($app, $theuser) {
  $name = $app->request->post('name');
  $code = $app->request->post('code');

  $db = new PDO('mysql:host=127.0.0.1;dbname=labster', 'labster', '***REMOVED***');
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $stmt = $db->prepare('INSERT INTO user_code (uniqname, name, code) VALUES(:uniqname, :name, :code) ON DUPLICATE KEY UPDATE uniqname=VALUES(uniqname), name=VALUES(name), code=VALUES(code)');
  $stmt->bindParam('name', $name);
  $stmt->bindParam('code', $code);
  $stmt->bindParam('uniqname', $theuser);
  $stmt->execute();  

});

$app->post('/api/me/setCodePublic', function () use ($app, $theuser) {
  $name = $app->request->post('name');
  $isPublic = $app->request->post('isPublic') == 'true';

  $db = new PDO('mysql:host=127.0.0.1;dbname=labster', 'labster', '***REMOVED***');
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
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

    $db = new PDO('mysql:host=127.0.0.1;dbname=labster', 'labster', '***REMOVED***');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
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
