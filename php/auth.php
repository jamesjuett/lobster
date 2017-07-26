<?php
session_cache_limiter(false);
session_start();

date_default_timezone_set('America/New_York');

function getEmailFromIdToken($idtoken) {
  try{

    $client = new Google_Client();
    $client_id = '355743019649-mrm7gtmkujj5gicc4rftl0ckm959ui7d.apps.googleusercontent.com';
    $client_secret = '-yiX6z6rrdhLRbZjVW4LzcDI';
    $client->setApplicationName('lobster');
    $client->setClientId($client_id);
    $client->setClientSecret($client_secret);
    $client->setScopes('email');

    $ticket = $client->verifyIdToken($idtoken);

    assert($ticket);
    $data = $ticket->getAttributes();
    assert($data['payload']['aud'] == $client_id);

    // TODO HACK
    $_SESSION["email"] = $data['payload']['email'];

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
