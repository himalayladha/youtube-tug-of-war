<?php
require_once __DIR__ . '/../includes/auth.php';
logoutAdmin();
header('Location: login.php?logged_out=1');
exit;
