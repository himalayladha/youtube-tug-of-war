<?php
/**
 * The Great Tug-of-War: Black vs White - Protected Admin Controller API
 * Strict session authentication required for all mutating endpoints.
 * Compatible with SQLite and MySQL/MariaDB (Cloud VM / VPS / Docker / XAMPP).
 */

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

try {
    $pdo = getDbConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Verify Admin Session (supports session or persistent auth token cookie across containers)
if (!isAdminLoggedIn($pdo)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Admin session required. Please sign in at /admin/login.php']);
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

// Find Python binary path reliably across Windows (XAMPP) and Linux (Cloud VM / VPS)
function getPythonBinary(): string {
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        $userProfile = getenv('USERPROFILE') ?: 'C:\\Users\\USER';
        $candidates = [
            $userProfile . '\\AppData\\Local\\Programs\\Python\\Python310\\python.exe',
            $userProfile . '\\AppData\\Local\\Python\\bin\\python.exe',
            'C:\\Users\\USER\\AppData\\Local\\Programs\\Python\\Python310\\python.exe',
            'C:\\Python310\\python.exe',
            'C:\\Program Files\\Python310\\python.exe'
        ];
        foreach ($candidates as $c) {
            if (file_exists($c)) return escapeshellarg($c);
        }
        return 'python';
    }
    return 'python3';
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

    // Check Python Live Poller daemon status
    $baseDir = dirname(__DIR__);
    $secretExists = file_exists($baseDir . '/backend/client_secret.json');
    $tokenExists = file_exists($baseDir . '/backend/token.json');
    $pidFile = $baseDir . '/streamer/python_poller.pid';
    
    $isPollerRunning = false;
    $pollerPid = null;
    if (file_exists($pidFile)) {
        $pid = trim(file_get_contents($pidFile));
        if (!empty($pid)) {
            $pollerPid = $pid;
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                $check = shell_exec("tasklist /FI \"PID eq {$pid}\" 2>NUL");
                $isPollerRunning = (stripos($check, (string)$pid) !== false);
            } else {
                $isPollerRunning = file_exists("/proc/{$pid}");
            }
        }
    }

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
        'yt_studio' => [
            'has_secret' => $secretExists,
            'has_token' => $tokenExists,
            'poller_running' => $isPollerRunning,
            'poller_pid' => $pollerPid
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

if ($action === 'yt_studio_status') {
    $baseDir = dirname(__DIR__);
    $secretExists = file_exists($baseDir . '/backend/client_secret.json');
    $tokenExists = file_exists($baseDir . '/backend/token.json');
    $pidFile = $baseDir . '/streamer/python_poller.pid';
    $logFile = $baseDir . '/logs/python_poller.log';
    
    $isRunning = false;
    $pollerPid = null;
    if (file_exists($pidFile)) {
        $pid = trim(file_get_contents($pidFile));
        if (!empty($pid)) {
            $pollerPid = $pid;
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                $check = shell_exec("tasklist /FI \"PID eq {$pid}\" 2>NUL");
                $isRunning = (stripos($check, (string)$pid) !== false);
            } else {
                $isRunning = file_exists("/proc/{$pid}");
            }
        }
    }
    
    $recentLogs = '';
    if (file_exists($logFile)) {
        $lines = file($logFile);
        $recentLogs = implode("", array_slice($lines, -15));
    }
    
    echo json_encode([
        'success' => true,
        'has_secret' => $secretExists,
        'has_token' => $tokenExists,
        'poller_running' => $isRunning,
        'poller_pid' => $pollerPid,
        'recent_logs' => $recentLogs
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
// 6. YOUTUBE STUDIO AUTOMATION & PYTHON CHAT POLLER
// ----------------------------------------------------
if ($action === 'yt_studio_status') {
    $baseDir = dirname(__DIR__);
    $secretExists = file_exists($baseDir . '/backend/client_secret.json');
    $tokenExists = file_exists($baseDir . '/backend/token.json');
    $pidFile = $baseDir . '/streamer/python_poller.pid';
    $logFile = $baseDir . '/logs/python_poller.log';
    
    $isRunning = false;
    $pollerPid = null;
    if (file_exists($pidFile)) {
        $pid = trim(file_get_contents($pidFile));
        if (!empty($pid)) {
            $pollerPid = $pid;
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                $check = shell_exec("tasklist /FI \"PID eq {$pid}\" 2>NUL");
                $isRunning = (stripos($check, (string)$pid) !== false);
            } else {
                $isRunning = file_exists("/proc/{$pid}");
            }
        }
    }
    
    // Read recent log lines
    $recentLogs = '';
    if (file_exists($logFile)) {
        $lines = file($logFile);
        $recentLogs = implode("", array_slice($lines, -15));
    }
    
    echo json_encode([
        'success' => true,
        'has_secret' => $secretExists,
        'has_token' => $tokenExists,
        'poller_running' => $isRunning,
        'poller_pid' => $pollerPid,
        'recent_logs' => $recentLogs
    ]);
    exit;
}

if ($action === 'yt_daemon_start') {
    $baseDir = dirname(__DIR__);
    $script = $baseDir . '/backend/youtube_manager.py';
    $logFile = $baseDir . '/logs/python_poller.log';
    $pidFile = $baseDir . '/streamer/python_poller.pid';
    @mkdir($baseDir . '/logs', 0777, true);
    @mkdir($baseDir . '/streamer', 0777, true);
    
    // Check if already running
    if (file_exists($pidFile)) {
        $existingPid = trim(file_get_contents($pidFile));
        if (!empty($existingPid)) {
            $isRunning = false;
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                $check = shell_exec("tasklist /FI \"PID eq {$existingPid}\" 2>NUL");
                $isRunning = (stripos($check, (string)$existingPid) !== false);
            } else {
                $isRunning = file_exists("/proc/{$existingPid}");
            }
            if ($isRunning) {
                echo json_encode(['success' => false, 'error' => "Python Live Poller is already active (PID: {$existingPid})"]);
                exit;
            }
        }
    }
    
    $py = getPythonBinary();
    $descriptors = [
        0 => ["pipe", "r"],
        1 => ["file", $logFile, "a"],
        2 => ["file", $logFile, "a"]
    ];
    $cmd = "{$py} \"{$script}\" --poll-chat";
    $proc = proc_open($cmd, $descriptors, $pipes, $baseDir);
    
    if (is_resource($proc)) {
        $status = proc_get_status($proc);
        $pid = $status['pid'] ?? 0;
        file_put_contents($pidFile, (string)$pid);
        if (isset($pipes[0]) && is_resource($pipes[0])) {
            fclose($pipes[0]);
        }
        echo json_encode(['success' => true, 'message' => "Python Live Chat Poller started! (PID: {$pid})", 'pid' => $pid]);
        exit;
    }
    
    echo json_encode(['success' => false, 'error' => 'Failed to spawn Python process.']);
    exit;
}

if ($action === 'yt_daemon_stop') {
    $baseDir = dirname(__DIR__);
    $pidFile = $baseDir . '/streamer/python_poller.pid';
    if (file_exists($pidFile)) {
        $pid = trim(file_get_contents($pidFile));
        if (!empty($pid)) {
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                exec("taskkill /F /PID {$pid} 2>&1");
            } else {
                exec("kill -9 {$pid} 2>&1");
            }
        }
        @unlink($pidFile);
    }
    echo json_encode(['success' => true, 'message' => 'Python Live Chat Poller stopped.']);
    exit;
}

if ($action === 'yt_create_stream') {
    $baseDir = dirname(__DIR__);
    $title = escapeshellarg(trim($input['title'] ?? 'The Great Tug-of-War: Live Arena'));
    $desc = escapeshellarg(trim($input['description'] ?? 'Interactive YouTube Live Stream'));
    $privacy = escapeshellarg(trim($input['privacy'] ?? 'unlisted'));
    $resolution = escapeshellarg(trim($input['resolution'] ?? '1080p'));
    $fps = escapeshellarg(trim($input['fps'] ?? '60fps'));
    
    $script = escapeshellarg($baseDir . '/backend/youtube_manager.py');
    $pyCmd = getPythonBinary();
    $cmd = "{$pyCmd} {$script} --create-stream --title {$title} --desc {$desc} --privacy {$privacy} --resolution {$resolution} --fps {$fps}";
    
    $output = shell_exec($cmd);
    
    // Check if JSON returned
    $matches = [];
    if (preg_match('/\{[\s\S]*"success":\s*true[\s\S]*\}/', $output, $matches)) {
        $resultData = json_decode($matches[0], true);
        echo json_encode(['success' => true, 'data' => $resultData, 'raw' => $output]);
        exit;
    }
    
    echo json_encode([
        'success' => false,
        'error' => 'Stream creation finished with output: ' . ($output ?: 'No output. Ensure OAuth client_secret.json is configured.')
    ]);
    exit;
}

if ($action === 'yt_save_secret') {
    $secretContent = $input['client_secret_json'] ?? '';
    if (empty($secretContent)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No client_secret JSON content provided.']);
        exit;
    }
    
    // Validate JSON
    $decoded = json_decode($secretContent, true);
    if (!$decoded || (!isset($decoded['installed']) && !isset($decoded['web']))) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid Google OAuth client_secret format. Expecting "installed" or "web" credentials JSON.']);
        exit;
    }
    
    $baseDir = dirname(__DIR__);
    @mkdir($baseDir . '/backend', 0777, true);
    file_put_contents($baseDir . '/backend/client_secret.json', json_encode($decoded, JSON_PRETTY_PRINT));
    
    echo json_encode(['success' => true, 'message' => 'OAuth client_secret.json saved successfully!']);
    exit;
}

// ----------------------------------------------------
// 7. UPDATE ADMIN CREDENTIALS (USERNAME & PASSWORD)
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
