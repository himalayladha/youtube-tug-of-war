<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/youtube.php';

try {
    $pdo = getDbConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

// 3-Action Subway Surfers Command Parser
function parseChatMessage(string $raw): ?string {
    $clean = strtolower(trim($raw));
    if (empty($clean)) return null;
    if (str_starts_with($clean, '!')) {
        $clean = trim(substr($clean, 1));
    }

    $map = [
        'left' => 'LEFT', 'l' => 'LEFT', 'a' => 'LEFT', '1' => 'LEFT', 'lane1' => 'LEFT',
        'jump' => 'JUMP', 'j' => 'JUMP', 'w' => 'JUMP', 'up' => 'JUMP', 'u' => 'JUMP', 'hop' => 'JUMP', '2' => 'JUMP',
        'right' => 'RIGHT', 'r' => 'RIGHT', 'd' => 'RIGHT', '3' => 'RIGHT', 'lane3' => 'RIGHT',
    ];

    return $map[$clean] ?? null;
}

// 1. Simulation POST endpoint (e.g. from in-game Dev dock or Host input)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $json = json_decode(file_get_contents('php://input'), true);
    $user = trim($json['user'] ?? 'Viewer');
    $rawText = trim($json['text'] ?? '');
    $action = parseChatMessage($rawText);

    if ($action) {
        // Record in chat logs
        $stmt = $pdo->prepare("INSERT INTO chat_logs (user_name, raw_text, action_executed) VALUES (:u, :t, :a)");
        $stmt->execute([':u' => $user, ':t' => $rawText, ':a' => $action]);

        // Record in leaderboard
        $userId = 'sim-' . md5($user);
        $stmt = $pdo->prepare(
            "INSERT INTO leaderboard (user_id, user_name, total_votes, score, last_active) 
             VALUES (:uid, :name, 1, 10, NOW()) 
             ON DUPLICATE KEY UPDATE total_votes = total_votes + 1, score = score + 10, last_active = NOW()"
        );
        $stmt->execute([':uid' => $userId, ':name' => $user]);

        echo json_encode(['success' => true, 'action' => $action, 'user' => $user]);
        exit;
    }

    echo json_encode(['success' => false, 'error' => 'Unrecognized command']);
    exit;
}

// 2. Poll Endpoint (polled by the game canvas every 1000ms)
$settings = getAllSettings($pdo);
$apiKey = $settings['yt_api_key'] ?? '';
$videoId = $settings['yt_video_id'] ?? '';
$mode = $settings['game_mode'] ?? 'auto';

$incomingActions = [];

// If YouTube API is configured, poll live chat
if (!empty($apiKey) && !empty($videoId)) {
    $chatId = $settings['yt_active_chat_id'] ?? '';
    if (empty($chatId)) {
        $resolved = resolveLiveChatId($apiKey, $videoId);
        if ($resolved['success']) {
            $chatId = $resolved['liveChatId'];
            setSetting($pdo, 'yt_active_chat_id', $chatId);
        }
    }

    if (!empty($chatId)) {
        $pageToken = $settings['yt_page_token'] ?? null;
        $chatData = fetchLiveChatMessages($apiKey, $chatId, $pageToken);
        if ($chatData['success']) {
            if (!empty($chatData['nextPageToken'])) {
                setSetting($pdo, 'yt_page_token', $chatData['nextPageToken']);
            }

            foreach ($chatData['items'] as $item) {
                $act = parseChatMessage($item['text']);
                if ($act) {
                    $incomingActions[] = [
                        'action' => $act,
                        'user' => $item['user'],
                        'text' => $item['text']
                    ];

                    // Save log
                    $stmt = $pdo->prepare("INSERT INTO chat_logs (user_name, raw_text, action_executed) VALUES (:u, :t, :a)");
                    $stmt->execute([':u' => $item['user'], ':t' => $item['text'], ':a' => $act]);

                    // Update leaderboard
                    $stmt = $pdo->prepare(
                        "INSERT INTO leaderboard (user_id, user_name, total_votes, score, last_active) 
                         VALUES (:uid, :name, 1, 10, NOW()) 
                         ON DUPLICATE KEY UPDATE total_votes = total_votes + 1, score = score + 10, last_active = NOW()"
                    );
                    $stmt->execute([':uid' => $item['userId'], ':name' => $item['user']]);
                }
            }
        }
    }
}

// Fetch recent 10 logs for voting tallies & HUD
$stmt = $pdo->query("SELECT action_executed FROM chat_logs WHERE created_at >= NOW() - INTERVAL 10 SECOND");
$recentActions = $stmt->fetchAll(PDO::FETCH_COLUMN);

$tallies = ['LEFT' => 0, 'JUMP' => 0, 'RIGHT' => 0];
foreach ($recentActions as $act) {
    if (isset($tallies[$act])) {
        $tallies[$act]++;
    }
}
$totalVotes = array_sum($tallies);
$percentages = [
    'LEFT' => $totalVotes > 0 ? (int)round(($tallies['LEFT'] / $totalVotes) * 100) : 0,
    'JUMP' => $totalVotes > 0 ? (int)round(($tallies['JUMP'] / $totalVotes) * 100) : 0,
    'RIGHT' => $totalVotes > 0 ? (int)round(($tallies['RIGHT'] / $totalVotes) * 100) : 0,
];

// Fetch Top 5 Leaderboard
$stmt = $pdo->query("SELECT user_name, score FROM leaderboard ORDER BY score DESC LIMIT 5");
$topViewers = $stmt->fetchAll();

echo json_encode([
    'success' => true,
    'actions' => $incomingActions,
    'tallies' => $tallies,
    'percentages' => $percentages,
    'mode' => $mode,
    'velocity' => count($recentActions),
    'top_viewers' => $topViewers,
]);
