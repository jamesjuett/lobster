<?php

//echo 'api.php';

//echo 'Hi there'.$_SERVER['REMOTE_USER'].'.';


require_once 'vendor/autoload.php';

$GLOBALS["config"] = parse_ini_file("../php/php.config");

require_once '../php/auth.php';

function dbConnect() {
    $db = new PDO('mysql:host=127.0.0.1;dbname=lobster', $GLOBALS["config"]["db_username"], $GLOBALS["config"]["db_password"]);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    return $db;
}

$app = new \Slim\Slim(array(
    'mode' => $GLOBALS["config"]["server_mode"]
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

// POST request for user code
$app->post('/api/user/:who/:name', function ($who, $name) use ($app) {
    $idtoken = $app->request->post('idtoken');
    $email = getEmailFromIdToken($idtoken);
    $theuser = $email;
    $db = dbConnect();
    if ($who == $theuser || $theuser == 'jjuett@umich.edu'){
    $stmt = $db->prepare('SELECT code FROM user_code WHERE uniqname=:uniqname AND name=:name');
    }
    else{
    $stmt = $db->prepare('SELECT code FROM user_code WHERE uniqname=:uniqname AND name=:name AND isPublic=1');
    }
    $stmt->bindParam('uniqname', $who);
    $stmt->bindParam('name', $name);
    $stmt->execute();
    $res = $stmt->fetchObject();
    if ($res){
        echo $res->code;
    }
});

$app->post('/api/codeList', function () use ($app) {

    $db = dbConnect();
    $stmt = $db->prepare('SELECT name FROM course_code');
    $stmt->execute();

    $names = $stmt->fetchAll();
    echo json_encode($names);
});

$app->get('/api/ping', function () {
  echo "pong";
});


$app->post('/api/whoami', function () use ($app){
    $idtoken = $app->request->post('idtoken');
    $email = getEmailFromIdToken($idtoken);
    $theuser = $email;
    
    $db = dbConnect();
    $stmt = $db->prepare('SELECT * FROM user_info WHERE uniqname=:uniqname');
    $stmt->bindParam('uniqname', $theuser);
    $stmt->execute();
    if ($stmt->rowCount() > 0){
        $res = $stmt->fetchObject();
        echo json_encode(array('uniqname'=>$theuser, 'lab2group'=>$res->lab2group, 'lastFile'=>$res->lastFile));
    }
    else{
        //    for($i = 0; $i < 800; $i = $i + 1){
        //    $tempUser = 'test'.$i;
        $newLab2Group = mt_rand(1,2);
        $stmt = $db->prepare('INSERT INTO user_info VALUES(:uniqname, "program.cpp", :lab2group)');
        $stmt->bindParam('uniqname', $theuser);
        $stmt->bindParam('lab2group', $newLab2Group);
        $stmt->execute();
        //}
        echo json_encode(array('uniqname'=>$theuser, 'lab2group'=>$newLab2Group, 'lastFile'=>"program.cpp"));

    }
});

$app->post('/api/course/codeList/:course', function () use ($app) {

//    $email = getEmailFromIdToken($app->request->post('idtoken'));
//    $theuser = $email;
    $db = $dbConnect();
    $stmt = $db->prepare('SELECT name FROM course_code WHERE course=:course');
    $stmt->bindParam('course', ':course');
    $stmt->execute();

    $names = $stmt->fetchAll();
    echo json_encode($names);
});


$app->post('/api/course/code/:course/:name', function ($course, $name) use ($app) {
//    $email = getEmailFromIdToken($app->request->post('idtoken'));
//    $theuser = $email;
    $db = dbConnect();
    $stmt = $db->prepare('SELECT code FROM course_code WHERE course=:course AND name=:name');
    $stmt->bindParam('course', $course);
    $stmt->bindParam('name', $name);
    $stmt->execute();
    $res = $stmt->fetchObject();
    echo $res->code;
});



// GET request for projects list
$app->get('/api/me/project/list', function () use ($app) {

    $email = getUserEmail();

    $db = dbConnect();
    $stmt = $db->prepare('SELECT project, isPublic FROM user_projects WHERE email=:email UNION DISTINCT SELECT project, 0 FROM starter_projects');
    $stmt->bindParam('email', $email);
    $stmt->execute();
    $res = $stmt->fetchAll(PDO::FETCH_CLASS);
    echo json_encode($res);
});

// GET request for project code
$app->get('/api/me/project/get/:project', function ($project) use ($app) {

    $email = getUserEmail();

    $db = dbConnect();
    $stmt = $db->prepare('SELECT * FROM user_project_files WHERE email=:email AND project=:project');
    $stmt->bindParam('email', $email);
    $stmt->bindParam('project', $project);
    $stmt->execute();

    if ($stmt->rowCount() != 0){
        $res = $stmt->fetchAll(PDO::FETCH_CLASS);
        echo json_encode($res);
    }
    else {
        // Instead grab values from starter projects table
        $stmt = $db->prepare('SELECT * FROM starter_project_files WHERE project=:project');
        $stmt->bindParam('project', $project);
        $stmt->execute();

        $res = $stmt->fetchAll(PDO::FETCH_CLASS);
        echo json_encode($res);
    }

    $stmt = $db->prepare('UPDATE user_info SET lastProject=:project WHERE uniqname=:email');
    $stmt->bindParam('email', $email);
    $stmt->bindParam('project', $project);
    $stmt->execute();
});



// POST request to save a project
$app->post('/api/me/project/save/:projectName', function ($projectName) use ($app) {

    $email = getUserEmail();

    $db = dbConnect();

    $stmt = $db->prepare('SELECT * FROM user_projects WHERE email=:email AND project=:project');
    $stmt->bindParam('email', $email);
    $stmt->bindParam('project', $projectName);
    $stmt->execute();

    if ($stmt->rowCount() == 0){

        // Create a new project since it didn't exist before
        $stmt = $db->prepare('INSERT INTO user_projects VALUES (:email, :project, false, NULL)');
        $stmt->bindParam('email', $email);
        $stmt->bindParam('project', $projectName);
        $stmt->execute();
    }

    //$files = json_decode($app->request->post('files'), true);
    $files = $app->request->post('files');
    //echo json_encode($files);
    foreach($files as $file){
        $name = $file['name'];
        $text = $file['text'];
        $isTranslationUnit = $file['isTranslationUnit'];

        $stmt = $db->prepare('INSERT INTO user_project_files VALUES (:email, :project, :name, :text, :isTranslationUnit, NULL) ON DUPLICATE KEY UPDATE code=:text, isTranslationUnit=:isTranslationUnit');
        $stmt->bindParam('email', $email);
        $stmt->bindParam('project', $projectName);
        $stmt->bindParam('name', $name);
        $stmt->bindParam('text', $text);
        $stmt->bindParam('isTranslationUnit', $isTranslationUnit);
        $stmt->execute();
    }

    echo json_encode(array(
        'success'=>'success'
    ));
});


$app->post('/api/me/code/:name', function ($name) use ($app) {

    $email = getEmailFromIdToken($app->request->post('idtoken'));
    $theuser = $email;

    $db = dbConnect();
    $stmt = $db->prepare('SELECT code FROM user_code WHERE uniqname=:uniqname AND name=:name');
    $stmt->bindParam('uniqname', $theuser);
    $stmt->bindParam('name', $name);
    $stmt->execute();
    $res = $stmt->fetchObject();
    echo $res->code;

    $stmt = $db->prepare('UPDATE user_info SET lastFile=:name WHERE uniqname=:uniqname');
    $stmt->bindParam('name', $name);
    $stmt->bindParam('uniqname', $theuser);
    $stmt->execute();
});



$app->post('/api/me/code/:name', function ($name) use ($app) {

    $email = getEmailFromIdToken($app->request->post('idtoken'));
    $theuser = $email;

    $db = dbConnect();
    $stmt = $db->prepare('SELECT code FROM user_code WHERE uniqname=:uniqname AND name=:name');
    $stmt->bindParam('uniqname', $theuser);
    $stmt->bindParam('name', $name);
    $stmt->execute();
    $res = $stmt->fetchObject();
    echo $res->code;

    $stmt = $db->prepare('UPDATE user_info SET lastFile=:name WHERE uniqname=:uniqname');
    $stmt->bindParam('name', $name);
    $stmt->bindParam('uniqname', $theuser);
    $stmt->execute();
});



$app->post('/api/me/codeList', function () use ($app) {
    $email = getEmailFromIdToken($app->request->post('idtoken'));
    $theuser = $email;

    $db = dbConnect();
    $stmt = $db->prepare('SELECT name, isPublic FROM user_code WHERE uniqname=:uniqname');
    $stmt->bindParam('uniqname', $theuser);
    $stmt->execute();

    $names = $stmt->fetchAll();
    echo json_encode($names);
});


$app->post('/api/me/save', function () use ($app) {
    $email = getEmailFromIdToken($app->request->post('idtoken'));
    $theuser = $email;

  $name = $app->request->post('name');
  $code = $app->request->post('code');

  if (strpos($name, "_") === 0 && ($theuser == 'jjuett@umich.edu' || $theuser == 'akamil@umich.edu')){

  $name = substr($name, 1);  

  $db = dbConnect();
  $stmt = $db->prepare('INSERT INTO course_code VALUES ("eecs280f16", :name, :code, 1, NULL) ON DUPLICATE KEY UPDATE name=VALUES(name), code=VALUES(code)');
  $stmt->bindParam('name', $name);
  $stmt->bindParam('code', $code);
  $stmt->execute();  
    
  }
  else{
  $db = dbConnect();
  $stmt = $db->prepare('INSERT INTO user_code (uniqname, name, code) VALUES(:uniqname, :name, :code) ON DUPLICATE KEY UPDATE uniqname=VALUES(uniqname), name=VALUES(name), code=VALUES(code)');
  $stmt->bindParam('name', $name);
  $stmt->bindParam('code', $code);
  $stmt->bindParam('uniqname', $theuser);
  $stmt->execute();

  $stmt = $db->prepare('UPDATE user_info SET lastFile=:name WHERE uniqname=:uniqname');
  $stmt->bindParam('name', $name);
  $stmt->bindParam('uniqname', $theuser);
  $stmt->execute();
  }
});


$app->post('/api/me/setCodePublic', function () use ($app) {

    $email = getEmailFromIdToken($app->request->post('idtoken'));
    $theuser = $email;

  $name = $app->request->post('name');
  $isPublic = $app->request->post('isPublic') == 'true';

  $db = $dbConnect();
  $stmt = $db->prepare('UPDATE user_code SET isPublic = :isPublic where uniqname=:uniqname AND name=:name');
  $stmt->bindParam('name', $name);
  $stmt->bindParam('isPublic', $isPublic);
  $stmt->bindParam('uniqname', $theuser);
  $stmt->execute();  

});



//$app->post('/api/log', function () use ($app, $theuser) {
//
//  $actions = json_decode($app->request->post('data'), true);
//  //error_log($app->request->post('data'));
//
//  foreach($actions as $action){
//
//    $actionName = $action['action'];
//    $data = json_encode($action['value']);
//
//    $db = dbConnect();
//    $stmt = $db->prepare('insert into userActions values (NULL, :uniqname, :action, NULL, :data)');
//    $stmt->bindParam('uniqname', $theuser);
//    $stmt->bindParam('action', $actionName);
//    $stmt->bindParam('data', $data);
//    $stmt->execute();
//  }
//});


//$app->post('/api/login', function () use ($app) {
//date_default_timezone_set('America/New_York');
//  $idtoken = $app->request->post('idtoken');
//  $client = new Google_Client();
//
//    $client_id = '355743019649-mrm7gtmkujj5gicc4rftl0ckm959ui7d.apps.googleusercontent.com';
//    $client_secret = '-yiX6z6rrdhLRbZjVW4LzcDI';
//    $client->setApplicationName('lobster');
//$client->setClientId($client_id);
//$client->setClientSecret($client_secret);
//$client->setScopes('email');
//    $ticket = $client->verifyIdToken($idtoken);
//
//    if ($ticket) {
//        $data = $ticket->getAttributes();
//        assert($data['payload']['aud'] == $client_id);
//        echo json_encode($data['payload']); // user ID
//      }
//      else {
//       echo "oh no poop";
//      }
//});

$app->run();

//phpinfo();

?>
