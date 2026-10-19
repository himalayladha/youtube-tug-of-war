<?php
/**
 * The Great Tug-of-War: Black vs White - Protected Admin Controller API
 * Strict session authentication required for all mutating endpoints.
 * Compatible with SQLite (Termux/Android) and MySQL/MariaDB (VPS/Docker/XAMPP).
 */

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

// Verify Admin Session
if (empty($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Admin session required']);
    exit;
}

try {
    $pdo = getDbConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

$isSqlite = ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite');
$action = $_GET['action'] ?? '';

// Helper to mask sensitive stream key (e.g. ••••••••abcd)
function maskSecret(string $secret): string {
    $len = strlen($secret);
    if ($len <= 4) return '••••';
    return str_repeat('•', max(4, $len - 4)) . substr($secret, -4);
}

// ----------------------------------------------------
// 1. GET CONFIGURATION & SYSTEM STATE
// ----------------------------------------------------
if ($action === 'get_config') {
    $settings = getAllSettings($pdo);
    
    // Check active stream session
    $stmt = $pdo->query("SELECT * FROM stream_sessions WHERE status = 'running' ORDER BY id DESC LIMIT 1");
    $activeSession = $stmt->fetch();
    $isStreaming = ($activeSession !== false);

    echo json_encode([
        'success' => true,
        'stream' => [
            'is_running' => $isStreaming,
            'yt_video_id' => $settings['yt_video_id'] ?? '',
            'yt_api_key_set' => !empty($settings['yt_api_key']),
            'yt_stream_key_masked' => !empty($settings['yt_stream_key']) ? maskSecret($settings['yt_stream_key']) : '',
            'stream_resolution' => $settings['stream_resolution'] ?? '1920x1080',
            'stream_fps' => $settings['stream_fps'] ?? '30',
            'stream_bitrate' => $settings['stream_bitrate'] ?? '4500k',
            'game_mode' => $settings['game_mode'] ?? 'auto'
        ],
        'arena' => [
            'active_topic_idx' => (int)($settings['active_topic_idx'] ?? 0),
            'topic_left' => $settings['topic_left'] ?? '',
            'topic_right' => $settings['topic_right'] ?? '',
            'wins_black' => (int)($settings['wins_black'] ?? 0),
            'wins_white' => (int)($settings['wins_white'] ?? 0)
        ],
        'public_panel' => [
            'site_title' => $settings['public_site_title'] ?? 'The Great Tug-of-War: Black vs White (With vs Against)',
            'announcement_banner' => $settings['announcement_banner'] ?? '',
            'announcement_active' => ($settings['announcement_active'] ?? '0') === '1',
            'show_video_embed' => ($settings['show_video_embed'] ?? '1') === '1'
        ],
        'admin_user' => $_SESSION['admin_user'] ?? 'admin',
        'system' => [
            'driver' => $isSqlite ? 'SQLite' : 'MySQL/MariaDB',
            'php_version' => PHP_VERSION,
            'os' => PHP_OS,
            'server_host' => $_SERVER['HTTP_HOST'] ?? 'localhost'
        ]
    ]);
    exit;
}

// Mutating endpoints require POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed. POST required.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

// ----------------------------------------------------
// 2. UPDATE LIVE DEBATE TOPIC ON THE FLY
// ----------------------------------------------------
if ($action === 'update_topic') {
    $mode = $input['mode'] ?? 'preset';

    if ($mode === 'preset') {
        $topicIdx = max(0, (int)($input['topic_idx'] ?? 0));
        setSetting($pdo, 'active_topic_idx', (string)$topicIdx);
        setSetting($pdo, 'topic_left', '');
        setSetting($pdo, 'topic_right', '');
        echo json_encode(['success' => true, 'message' => "Preset topic #{$topicIdx} pushed live!"]);
        exit;
    }

    if ($mode === 'custom') {
        $left = strtoupper(trim($input['topic_left'] ?? ''));
        $right = strtoupper(trim($input['topic_right'] ?? ''));

        if (empty($left) || empty($right)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Both Left and Right topic labels are required for a custom debate.']);
            exit;
        }

        setSetting($pdo, 'topic_left', $left);
        setSetting($pdo, 'topic_right', $right);
        echo json_encode(['success' => true, 'message' => "Custom debate '{$left}' vs '{$right}' pushed live to the arena!"]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid mode. Must be preset or custom.']);
    exit;
}

// ----------------------------------------------------
// 3. RESET MATCH SCORES & LEADERBOARD
// ----------------------------------------------------
if ($action === 'reset_scores') {
    $resetRounds = !isset($input['reset_rounds']) || $input['reset_rounds'] === true || $input['reset_rounds'] === '1';
    $clearLeaderboard = !empty($input['clear_leaderboard']);
    $clearChatLogs = !empty($input['clear_chat_logs']);

    if ($resetRounds) {
        setSetting($pdo, 'wins_black', '0');
        setSetting($pdo, 'wins_white', '0');
    }

    if ($clearLeaderboard) {
        $pdo->exec("DELETE FROM leaderboard");
    }

    if ($clearChatLogs) {
        $pdo->exec("DELETE FROM chat_logs");
    }

    echo json_encode([
        'success' => true,
        'message' => 'Arena scores and stats updated successfully!',
        'reset_rounds' => $resetRounds,
        'cleared_leaderboard' => $clearLeaderboard,
        'cleared_chat_logs' => $clearChatLogs
    ]);
    exit;
}

// ----------------------------------------------------
// 4. UPDATE PUBLIC SPECTATOR PANEL CONFIGURATION
// ----------------------------------------------------
if ($action === 'update_public_panel') {
    if (isset($input['announcement_banner'])) {
        setSetting($pdo, 'announcement_banner', trim($input['announcement_banner']));
    }
    if (isset($input['announcement_active'])) {
        $activeVal = (!empty($input['announcement_active']) && $input['announcement_active'] !== '0' && $input['announcement_active'] !== false) ? '1' : '0';
        setSetting($pdo, 'announcement_active', $activeVal);
    }
    if (isset($input['show_video_embed'])) {
        $embedVal = (!empty($input['show_video_embed']) && $input['show_video_embed'] !== '0' && $input['show_video_embed'] !== false) ? '1' : '0';
        setSetting($pdo, 'show_video_embed', $embedVal);
    }
    if (!empty($input['public_site_title'])) {
        setSetting($pdo, 'public_site_title', trim($input['public_site_title']));
    }

    echo json_encode(['success' => true, 'message' => 'Public spectator panel settings updated!']);
    exit;
}

// ----------------------------------------------------
// 5. UPDATE YOUTUBE & STREAM BROADCAST CREDENTIALS
// ----------------------------------------------------
if ($action === 'update_stream_settings') {
    if (!empty($input['yt_stream_key'])) {
        setSetting($pdo, 'yt_stream_key', trim($input['yt_stream_key']));
    }
    if (isset($input['yt_api_key'])) {
        setSetting($pdo, 'yt_api_key', trim($input['yt_api_key']));
    }
    if (isset($input['yt_video_id'])) {
        setSetting($pdo, 'yt_video_id', trim($input['yt_video_id']));
    }
    if (!empty($input['stream_resolution'])) {
        setSetting($pdo, 'stream_resolution', trim($input['stream_resolution']));
    }
    if (!empty($input['stream_fps'])) {
        setSetting($pdo, 'stream_fps', trim($input['stream_fps']));
    }
    if (!empty($input['stream_bitrate'])) {
        setSetting($pdo, 'stream_bitrate', trim($input['stream_bitrate']));
    }

    echo json_encode(['success' => true, 'message' => 'Stream broadcast settings saved successfully!']);
    exit;
}

// ----------------------------------------------------
// 6. UPDATE ADMIN CREDENTIALS (USERNAME & PASSWORD)
// ----------------------------------------------------
if ($action === 'change_credentials') {
    $oldPass = $input['old_password'] ?? '';
    $newPass = $input['new_password'] ?? '';
    $newPassConfirm = $input['new_password_confirm'] ?? '';
    $newUsername = trim($input['new_username'] ?? '');

    $storedHash = getSetting($pdo, 'admin_password_hash', '');
    $currentAdminUser = getSetting($pdo, 'admin_user', 'admin');

    // Verify current password
    if (empty($oldPass) || !password_verify($oldPass, $storedHash)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Incorrect current password.']);
        exit;
    }

    // Update username if requested
    if (!empty($newUsername) && $newUsername !== $currentAdminUser) {
        setSetting($pdo, 'admin_user', $newUsername);
        $_SESSION['admin_user'] = $newUsername;
    }

    // Update password if provided
    if (!empty($newPass)) {
        if (strlen($newPass) < 6) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'New password must be at least 6 characters long.']);
            exit;
        }
        if ($newPass !== $newPassConfirm) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'New password and confirmation do not match.']);
            exit;
        }
        $newHash = password_hash($newPass, PASSWORD_BCRYPT);
        setSetting($pdo, 'admin_password_hash', $newHash);
    }

    echo json_encode(['success' => true, 'message' => 'Admin credentials updated successfully!']);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => "Unknown action '{$action}'"]);
