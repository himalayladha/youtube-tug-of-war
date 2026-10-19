<?php
/**
 * Authentication and Session Helper
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';

function requireAdminAuth(): void {
    if (empty($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
        $loginUrl = '../admin/login.php';
        if (file_exists(__DIR__ . '/../admin/login.php') && basename($_SERVER['PHP_SELF']) === 'index.php' && strpos($_SERVER['PHP_SELF'], 'admin') !== false) {
            $loginUrl = 'login.php';
        }
        header("Location: {$loginUrl}");
        exit;
    }
}

function verifyAdminLogin(PDO $pdo, string $username, string $password): bool {
    $storedUser = getSetting($pdo, 'admin_user', 'admin');
    $storedHash = getSetting($pdo, 'admin_password_hash', '');

    if (empty($storedHash)) {
        return false;
    }

    if (hash_equals($storedUser, $username) && password_verify($password, $storedHash)) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_user'] = $username;
        $_SESSION['login_time'] = time();
        return true;
    }

    return false;
}

function logoutAdmin(): void {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params["path"],
            $params["domain"],
            $params["secure"],
            $params["httponly"]
        );
    }
    session_destroy();
}
