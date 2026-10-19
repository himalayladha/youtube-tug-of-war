<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

// Ensure user is authenticated admin
if (empty($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

try {
    $pdo = getDbConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $settings = getAllSettings($pdo);
    // Mask sensitive keys for client-side display if needed
    echo json_encode([
        'success' => true,
        'settings' => [
            'yt_api_key' => $settings['yt_api_key'] ?? '',
            'yt_stream_key' => $settings['yt_stream_key'] ?? '',
            'yt_video_id' => $settings['yt_video_id'] ?? '',
            'stream_resolution' => $settings['stream_resolution'] ?? '1920x1080',
            'stream_fps' => $settings['stream_fps'] ?? '30',
            'stream_bitrate' => $settings['stream_bitrate'] ?? '4500k',
            'game_mode' => $settings['game_mode'] ?? 'auto',
        ]
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $allowed = ['yt_api_key', 'yt_stream_key', 'yt_video_id', 'stream_resolution', 'stream_fps', 'stream_bitrate', 'game_mode'];
    $data = $_POST;
    if (empty($data)) {
        $json = json_decode(file_get_contents('php://input'), true);
        if (is_array($json)) {
            $data = $json;
        }
    }

    $updated = [];
    foreach ($allowed as $key) {
        if (isset($data[$key])) {
            setSetting($pdo, $key, trim((string)$data[$key]));
            $updated[$key] = trim((string)$data[$key]);
        }
    }

    echo json_encode(['success' => true, 'message' => 'Settings updated successfully', 'updated' => $updated]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
