<?php
session_cache_limiter(false);
session_start();

date_default_timezone_set('America/New_York');

function getEmailFromIdToken($idtoken) {
  try{

    $client = new Google_Client();
    $client_id = $GLOBALS['config']['client_id'];
    $client_secret = $GLOBALS['config']['client_id'];
    $client->setApplicationName($GLOBALS['config']['application_name']);
    $client->setClientId($client_id);
    $client->setClientSecret($client_secret);
    $client->setScopes('email');

    $ticket = $client->verifyIdToken($idtoken);

    assert($ticket);
    $data = $ticket->getAttributes();
    assert($data['payload']['aud'] == $client_id);

    // TODO HACK
    $_SESSION['email'] = $data['payload']['email'];

    return $data['payload']['email']; // user ID
  }
  catch (Exception $e) {
    return getUserEmail();
  }
}

function loginUser($idtoken) {
  $_SESSION["email"] = getEmailFromIdToken($idtoken);
  session_regenerate_id();
}

function isUserLoggedIn() {
  return isset($_SESSION["email"]);
}

function getUserEmail() {
  assert(isUserLoggedIn());
  return $_SESSION["email"];
}

?>
