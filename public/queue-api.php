<?php

require_once 'vendor/autoload.php';
require_once 'auth.php';

require 'Slim/Slim.php';
\Slim\Slim::registerAutoloader();

$app = new \Slim\Slim(array(
    'mode' => 'development'
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


function isQueue($db, $queueId) {
    $stmt = $db->prepare('SELECT * from queues WHERE queueId=:queueId');
    $stmt->bindParam('queueId', $queueId);

    $stmt->execute();
    return $stmt->rowCount() > 0;
}

function isCourse($db, $course) {
    $stmt = $db->prepare('SELECT * from queueCourses WHERE courseId=:course');
    $stmt->bindParam('course', $course);

    $stmt->execute();
    return $stmt->rowCount() > 0;
}

function isQueueAdmin($db, $email, $queueId) {
    $stmt = $db->prepare('SELECT * from queues, queueAdmins WHERE queueId=:queueId AND queues.courseId = queueAdmins.courseID AND email=:email');
    $stmt->bindParam('email', $email);
    $stmt->bindParam('queueId', $queueId);

    $stmt->execute();
    return $stmt->rowCount() > 0;
}

function isCourseAdmin($db, $email, $courseId) {
    $stmt = $db->prepare('SELECT * from queueAdmins WHERE courseId=:courseId AND email=:email');
    $stmt->bindParam('email', $email);
    $stmt->bindParam('courseId', $courseId);

    $stmt->execute();
    return $stmt->rowCount() > 0;
}

function getCurrentHalfHour() {
    return floor((60 * (int)date("H") + (int)date("i")) /  30); // intdiv not until php 7
}

// Returns a 48-character string that indicates the status of the queue
// for each half hour in the 7 days of the week. Returns an array of strings
// "o": open
// "c": closed
// "p": pre-open (can sign up, but not open yet)
function getQueueSchedule($db, $queueId) {

    $stmt = $db->prepare('SELECT schedule from queueSchedule WHERE queueId=:queueId ORDER BY day ASC');
    $stmt->bindParam('queueId', $queueId);

    $stmt->execute();

    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

// Returns a 48-character string that indicates the status of the queue
// for each half hour in the specified day.
// "o": open
// "c": closed
// "p": pre-open (can sign up, but not open yet)
function getQueueScheduleDay($db, $queueId, $day) {

    $stmt = $db->prepare('SELECT schedule from queueSchedule WHERE queueId=:queueId AND day = :day');
    $stmt->bindParam('queueId', $queueId);
    $stmt->bindParam('day', $day);

    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        $res = $stmt->fetch(PDO::FETCH_OBJ);
        return $res->schedule;
    }
    else {
        return str_repeat("o", 48);
    }

}

function getQueueScheduleToday($db, $queueId) {

    // Find day of the week 0-6
    $day = (int)date("w");

    return getQueueScheduleDay($db, $queueId, $day);
}

// Returns whether the queue is open for the current half hour (numbered 0-47).
// Will return true if the queue is either truly open or in a pre-open state.
function isQueueOpen($db, $queueId) {

    // get the schedule of half hours for today
    $schedule = getQueueScheduleToday($db, $queueId);

    // Find the "half-hour-index" where every half hour in the week is numbered 0-47
    $halfHour = getCurrentHalfHour();

    // check the current half hour and return
    return $schedule[$halfHour] == "o" || $schedule[$halfHour] == "p";
}




// POST request to login
$app->post('/queue-api/login', function () use ($app){

    $idtoken = $app->request->post('idtoken');
    loginUser($idtoken);

});



// POST request for sign up
$app->post('/queue-api/signUp', function () use ($app){

    //$idtoken = $app->request->post('idtoken');
    $email = getUserEmail();

    // Ensure it's an @umich.edu address
    $rightmostAtPos = strrpos($email, '@');
    if (!(substr($email, -10) == '@umich.edu')){
        echo json_encode(array(
            'fail'=>'fail',
            'reason'=>'Only @umich.edu accounts are allowed.'
        ));
        return;
    }

    $queueId = $app->request->post('queueId');

    // make courses case insensitive
    $name = $app->request->post('name');
    $location = $app->request->post('location');
    $description = $app->request->post('description');

    // Open database connection
    $db = new PDO('mysql:host=127.0.0.1;dbname=labster', 'labster', '***REMOVED***');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Ensure the queue exists
    assert(isQueue($db, $queueId));

    // Ensure the user is not already signed up (admins excluded)
    if (!isQueueAdmin($db, $email, $queueId)) {
        $stmt = $db->prepare('SELECT id FROM queue WHERE email=:email AND queueId=:queueId');
        $stmt->bindParam('email', $email);
        $stmt->bindParam('queueId', $queueId);
        $stmt->execute();

        if ($stmt->rowCount() != 0){
            echo json_encode(array(
                'fail'=>'fail',
                'reason'=>'You may not sign up more than once for the same course.'
            ));
            return;
        }
    }

    // Ensure the queue is open (admins excluded) TODO: actually exclude admins
    //if (!isQueueAdmin($db, $email, $queueId)) {
        if (!isQueueOpen($db, $queueId)){
            echo json_encode(array(
                'fail'=>'fail',
                'reason'=>'The queue is currently closed.'
            ));
            return;
        }
    //}

    // Sanitize input from the user
    $email = htmlspecialchars($email);
    $name = htmlspecialchars($name);
    $location = htmlspecialchars($location);
    $description = htmlspecialchars($description);

    $stmt = $db->prepare('INSERT INTO queue values (NULL, :email, :queueId, :name, :location, :description, NULL)');

    $stmt->bindParam('email', $email);
    $stmt->bindParam('queueId', $queueId);
    $stmt->bindParam('name', $name);
    $stmt->bindParam('location', $location);
    $stmt->bindParam('description', $description);

    $stmt->execute();

    echo json_encode(array(
        'success'=>'success'
    ));
    return;
});


// POST request to see which courses a user is an admin for
$app->post('/queue-api/adminCourses', function () use ($app){

    //$idtoken = $app->request->post('idtoken');
    $email = getUserEmail();

    $db = new PDO('mysql:host=127.0.0.1;dbname=labster', 'labster', '***REMOVED***');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $db->prepare('SELECT courseId FROM queueAdmins WHERE email=:email');
    $stmt->bindParam('email', $email);
    $stmt->execute();

    $res = $stmt->fetchAll(PDO::FETCH_OBJ);
    echo json_encode($res);
});



// POST request to remove from queue
$app->post('/queue-api/remove', function () use ($app){

    //$idtoken = $app->request->post('idtoken');
    $email = getUserEmail();

    $id = $app->request->post('id');

    $db = new PDO('mysql:host=127.0.0.1;dbname=labster', 'labster', '***REMOVED***');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $db->prepare('SELECT queueId from queue where id=:id');
    $stmt->bindParam('id', $id);
    $stmt->execute();

    if ($stmt->rowCount() != 0) {
        $res = $stmt->fetch(PDO::FETCH_OBJ);
        $queueId = $res->queueId;

        // Must be an admin for the course
        if (!isQueueAdmin($db, $email, $queueId)) {

            // or it's ok if they're removing themselves
            $stmt = $db->prepare('SELECT email from queue where id=:id');
            $stmt->bindParam('id', $id);
            $stmt->execute();
            $res = $stmt->fetch(PDO::FETCH_OBJ);
            $posterEmail = $res->email;

            if ($email != $posterEmail){
                $app->halt(403);
            }

        };

        $stmt = $db->prepare('INSERT INTO stack SELECT *, NULL from queue where id=:id');
        $stmt->bindParam('id', $id);
        $stmt->execute();

        $stmt = $db->prepare('DELETE FROM queue WHERE id=:id');
        $stmt->bindParam('id', $id);
        $stmt->execute();
    }
});

// POST request to send message to a user who has made a request
$app->post('/queue-api/sendMessage', function () use ($app){

    //$idtoken = $app->request->post('idtoken');
    $email = getUserEmail();

    $id = htmlspecialchars($app->request->post('id')); // Not really necessary
    $message = htmlspecialchars($app->request->post('message'));

    $db = new PDO('mysql:host=127.0.0.1;dbname=labster', 'labster', '***REMOVED***');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $db->prepare('SELECT queueId, email from queue where id=:id');
    $stmt->bindParam('id', $id);
    $stmt->execute();

    if ($stmt->rowCount() != 0) {
        $res = $stmt->fetch(PDO::FETCH_OBJ);
        $queueId = $res->queueId;
        $target = $res->email;

        // Must be an admin for the course
        if (!isQueueAdmin($db, $email, $queueId)) {
            $app->halt(403);
        }

        $stmt = $db->prepare('INSERT INTO queueMessages values (NULL, :postId, :sender, :target, :message, NULL)');
        $stmt->bindParam('postId', $id);
        $stmt->bindParam('sender', $email);
        $stmt->bindParam('target', $target);
        $stmt->bindParam('message', $message);
        $stmt->execute();
    }
});

// POST request to remove ALL requests from a queue
$app->post('/queue-api/clear', function () use ($app){

    //$idtoken = $app->request->post('idtoken');
    $email = getUserEmail();

    $queueId = $app->request->post('queueId');

    $db = new PDO('mysql:host=127.0.0.1;dbname=labster', 'labster', '***REMOVED***');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Must be an admin for the course
    if (!isQueueAdmin($db, $email, $queueId)) { $app->halt(403); };

    $stmt = $db->prepare('DELETE FROM queue WHERE queueId=:queueId');
    $stmt->bindParam('queueId', $queueId);
    $stmt->execute();
});

function getQueueList($db, $queueId) {
    if (isUserLoggedIn()){
        $email = getUserEmail();

        if (isQueueAdmin($db, $email, $queueId)) {
            $stmt = $db->prepare('SELECT id, email, name, location, description, UNIX_TIMESTAMP(ts) as ts FROM queue WHERE queueId=:queueId ORDER BY ts');
            $stmt->bindParam('queueId', $queueId);
            $stmt->execute();

            $res = $stmt->fetchAll(PDO::FETCH_OBJ);
            return $res;
        }
    }

    $stmt = $db->prepare('SELECT id, UNIX_TIMESTAMP(ts) as ts FROM queue WHERE queueId=:queueId ORDER BY ts');
    $stmt->bindParam('queueId', $queueId);
    $stmt->execute();

    $res = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (isUserLoggedIn()){
        $email = getUserEmail();

        // Add additional information for themselves
        $stmt = $db->prepare('SELECT id, email, name, location, description, UNIX_TIMESTAMP(ts) as ts FROM queue WHERE queueId=:queueId AND email=:email');
        $stmt->bindParam('queueId', $queueId);
        $stmt->bindParam('email', $email);
        $stmt->execute();

        if ($stmt->rowCount() != 0){
            $individual = $stmt->fetch(PDO::FETCH_ASSOC);
            for ($i = 0; $i < count($res); $i++) {
                if ($res[$i]['id'] == $individual['id']) {
                    $res[$i]['email'] = $individual['email'];
                    $res[$i]['name'] = $individual['name'];
                    $res[$i]['location'] = $individual['location'];
                    $res[$i]['description'] = $individual['description'];
                }
            }
        }

    }

    return $res;
}

// POST request for entries in a particular queue
// request description is only given to admins
$app->post('/queue-api/list/', function () use ($app) {

    $db = new PDO('mysql:host=127.0.0.1;dbname=labster', 'labster', '***REMOVED***');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $queueId = $app->request->post('queueId');

    // Ensure the queue exists
    assert(isQueue($db, $queueId));

    //$idtoken = $app->request->post('idtoken');
    $list = getQueueList($db, $queueId);
    $res = array("queue" => $list);

    // Check to see if they have any messages
    if (isUserLoggedIn()) {
        $email = getUserEmail();
        $stmt = $db->prepare('SELECT id, sender, message, UNIX_TIMESTAMP(ts) as ts FROM queueMessages WHERE target=:email ORDER BY ts LIMIT 1');
        $stmt->bindParam('email', $email);
        $stmt->execute();

        if ($stmt->rowCount() != 0) {
            $messageRes = $stmt->fetch(PDO::FETCH_OBJ);
            $res["message"] = $messageRes;

            // Also now remove that message
            $messageId = $messageRes->id;
            $stmt = $db->prepare('DELETE FROM queueMessages WHERE id=:id');
            $stmt->bindParam('id', $messageId);
            $stmt->execute();
        }
    }

    if (isUserLoggedIn()){
        $email = getUserEmail();

        if (isQueueAdmin($db, $email, $queueId)) {
            $stmt = $db->prepare('SELECT id, email, name, location, description, UNIX_TIMESTAMP(ts) as ts, UNIX_TIMESTAMP(tsRemoved) as tsRemoved FROM stack WHERE queueId=:queueId ORDER BY tsRemoved DESC LIMIT 20');
            $stmt->bindParam('queueId', $queueId);
            $stmt->execute();

            $stackRes = $stmt->fetchAll(PDO::FETCH_OBJ);
            $res["stack"] = $stackRes;
        }
    }

    // add the current schedule for today
    $res["schedule"] = getQueueScheduleToday($db, $queueId);
    $res["isOpen"] = isQueueOpen($db, $queueId);
    $res["halfHour"] = getCurrentHalfHour();


    echo json_encode($res);
});

// GET request for list of courses
$app->get('/queue-api/courseList', function () {

    $db = new PDO('mysql:host=127.0.0.1;dbname=labster', 'labster', '***REMOVED***');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $db->prepare('SELECT * FROM queueCourses ORDER BY courseId');
    $stmt->execute();

    $res = $stmt->fetchAll(PDO::FETCH_OBJ);
    echo json_encode($res);
});


// GET request for list of queues
$app->get('/queue-api/queueList/:courseId', function ($courseId) {

    $db = new PDO('mysql:host=127.0.0.1;dbname=labster', 'labster', '***REMOVED***');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $db->prepare('SELECT * FROM queues WHERE courseId=:courseId ORDER BY queueId');
    $stmt->bindParam('courseId', $courseId);

    $stmt->execute();

    $res = $stmt->fetchAll(PDO::FETCH_OBJ);
    echo json_encode($res);
});



// GET request for full schedule for one queue
$app->get('/queue-api/schedule/:queueId', function ($queueId) {

    // Ensure the queue exists - NOT NEEDED. let it fail if the request a bad one
    //assert(isQueue($db, $queueId));

    $db = new PDO('mysql:host=127.0.0.1;dbname=labster', 'labster', '***REMOVED***');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $res = getQueueSchedule($db, $queueId);
    echo json_encode($res);
});



// POST request to set schedule for a queue
$app->post('/queue-api/updateSchedule', function () use ($app){

    //$idtoken = $app->request->post('idtoken');
    $email = getUserEmail();

    $queueId = $app->request->post('queueId');

    $schedule = $app->request->post('schedule');
    for ($i = 0; $i < count($schedule); $i++) {
        $schedule[$i] = preg_replace("/[^a-z]+/", "", $schedule[$i]); // sanitize just in case
    }

    $db = new PDO('mysql:host=127.0.0.1;dbname=labster', 'labster', '***REMOVED***');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Must be an admin for the course
    if (!isQueueAdmin($db, $email, $queueId)) { $app->halt(403); };

    for ($i = 0; $i < count($schedule); $i++) {
        $daySchedule = $schedule[$i];
        $stmt = $db->prepare('UPDATE queueSchedule SET schedule=:schedule WHERE queueId=:queueId AND day=:day');
        $stmt->bindParam('queueId', $queueId);
        $stmt->bindParam('day', $i);
        $stmt->bindParam('schedule', $daySchedule);
        $stmt->execute();
    }
});

$app->run();

?>
