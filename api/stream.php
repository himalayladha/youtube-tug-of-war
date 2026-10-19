<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

$lockFile = __DIR__ . '/../streamer/pid.lock';
$logFile = __DIR__ . '/../streamer/stream.log';

function isProcessRunning(int $pid): bool {
    if ($pid <= 0) return false;
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        $output = [];
        exec("tasklist /FI \"PID eq {$pid}\" 2>NUL", $output);
        return count($output) > 1 && strpos(implode("\n", $output), (string)$pid) !== false;
    } else {
        return file_exists("/proc/{$pid}");
    }
}

function getActiveStreamPid(string $lockFile): ?int {
    if (file_exists($lockFile)) {
        $pid = (int)trim(file_get_contents($lockFile));
        if ($pid > 0 && isProcessRunning($pid)) {
            return $pid;
        }
    }
    return null;
}

$action = $_GET['action'] ?? 'status';

try {
    $pdo = getDbConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}

// 1. Status action (Public / Dashboard status poller)
if ($action === 'status') {
    $activePid = getActiveStreamPid($lockFile);
    $isRunning = ($activePid !== null);

    $session = null;
    try {
        $stmt = $pdo->query("SELECT * FROM stream_sessions ORDER BY id DESC LIMIT 1");
        $session = $stmt->fetch();
    } catch (Exception $e) {}

    // Get live chat velocity and mode from settings
    $settings = getAllSettings($pdo);

    echo json_encode([
        'is_running' => $isRunning,
        'pid' => $activePid,
        'started_at' => ($isRunning && $session) ? $session['started_at'] : null,
        'metrics' => [
            'mode' => $settings['game_mode'] ?? 'auto',
            'velocity' => 0, // updated dynamically by chat poller
            'resolution' => $settings['stream_resolution'] ?? '1920x1080',
            'bitrate' => $settings['stream_bitrate'] ?? '4500k',
        ]
    ]);
    exit;
}

// Actions below require admin authentication
if (empty($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// 2. Start Stream
if ($action === 'start') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'POST required']);
        exit;
    }

    $activePid = getActiveStreamPid($lockFile);
    if ($activePid !== null) {
        echo json_encode(['success' => false, 'error' => "Stream is already running (PID: {$activePid})"]);
        exit;
    }

    $settings = getAllSettings($pdo);
    $streamKey = $settings['yt_stream_key'] ?? '';
    if (empty($streamKey)) {
        echo json_encode(['success' => false, 'error' => 'YouTube Live Stream Key is not configured. Please set it in Settings.']);
        exit;
    }

    $res = $settings['stream_resolution'] ?? '1920x1080';
    $fps = $settings['stream_fps'] ?? '30';
    $bitrate = $settings['stream_bitrate'] ?? '4500k';

    // Build Game URL dynamically based on current protocol, host, and install directory
    $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scriptDir = dirname(dirname($_SERVER['SCRIPT_NAME']));
    $baseUri = ($scriptDir === '/' || $scriptDir === '\\') ? '' : rtrim(str_replace('\\', '/', $scriptDir), '/');
    $gameUrl = "{$proto}://{$host}{$baseUri}/game/index.html?stream=1";

    $daemonScript = realpath(__DIR__ . '/../streamer/stream_daemon.js');
    if (!$daemonScript || !file_exists($daemonScript)) {
        echo json_encode(['success' => false, 'error' => 'stream_daemon.js not found']);
        exit;
    }

    // Launch background daemon
    $pid = 0;
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        $cmd = "node \"{$daemonScript}\" --stream-key=\"{$streamKey}\" --url=\"{$gameUrl}\" --resolution={$res} --fps={$fps} --bitrate={$bitrate} > \"{$logFile}\" 2>&1";
        $p = popen("start /B " . $cmd, "r");
        pclose($p);
        $pid = 9999; // Windows background popen stub
    } else {
        $cmd = "nohup node \"{$daemonScript}\" --stream-key=\"{$streamKey}\" --url=\"{$gameUrl}\" --resolution={$res} --fps={$fps} --bitrate={$bitrate} > \"{$logFile}\" 2>&1 & echo $!";
        $pid = (int)shell_exec($cmd);
    }

    file_put_contents($lockFile, (string)$pid);

    // Record session in DB
    $stmt = $pdo->prepare("INSERT INTO stream_sessions (pid, started_at, status, log_file) VALUES (:pid, NOW(), 'running', :log)");
    $stmt->execute([':pid' => $pid, ':log' => $logFile]);

    echo json_encode(['success' => true, 'pid' => $pid, 'message' => 'Stream started successfully']);
    exit;
}

// 3. Stop Stream
if ($action === 'stop') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'POST required']);
        exit;
    }

    $activePid = getActiveStreamPid($lockFile);
    if ($activePid) {
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            exec("taskkill /F /PID {$activePid} 2>NUL");
        } else {
            exec("kill -TERM {$activePid} 2>/dev/null; sleep 1; kill -9 {$activePid} 2>/dev/null");
        }
    }

    if (file_exists($lockFile)) {
        unlink($lockFile);
    }

    // Update DB session
    $pdo->exec("UPDATE stream_sessions SET stopped_at = NOW(), status = 'stopped' WHERE status = 'running'");

    echo json_encode(['success' => true, 'message' => 'Stream stopped successfully']);
    exit;
}

// 4. Logs
if ($action === 'logs') {
    $lines = '';
    if (file_exists($logFile)) {
        $all = file($logFile);
        $last = array_slice($all, -60);
        $lines = implode('', $last);
    } else {
        $lines = "[Log] No log file generated yet. Start the stream to begin logging.";
    }
    echo json_encode(['success' => true, 'logs' => $lines]);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Invalid action']);
