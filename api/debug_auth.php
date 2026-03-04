<?php
require 'config.php';
header('Content-Type: text/plain');
echo 'AUTHHEADER=' . ($_SERVER['HTTP_AUTHORIZATION'] ?? 'none') . "\n";
echo 'GETTOKEN=' . ($_GET['token'] ?? 'none') . "\n";
echo 'AUTH = ' . (getAuthenticatedUser() ? 'OK' : 'FAIL') . "\n";
