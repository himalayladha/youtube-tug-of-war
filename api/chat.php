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

// 2-Team Command Parser (Black vs. White)
function parseTeamVote(string $raw): ?string {
    $clean = strtolower(trim($raw));
    if (empty($clean)) return null;
    if (str_starts_with($clean, '!')) {
        $clean = trim(substr($clean, 1));
    }

    $blackAliases = ['black', '1', 'b', 'left', 'with', 'dark', 'blackteam', '#black', 'team1'];
    $whiteAliases = ['white', '2', 'w', 'right', 'against', 'light', 'whiteteam', '#white', 'team2'];

    if (in_array($clean, $blackAliases, true)) return 'BLACK';
    if (in_array($clean, $whiteAliases, true)) return 'WHITE';

    // Partial prefix matching for fast chat typers
    if (str_starts_with($clean, 'black') || str_starts_with($clean, 'with')) return 'BLACK';
    if (str_starts_with($clean, 'white') || str_starts_with($clean, 'against')) return 'WHITE';

    return null;
}

// 1. Simulation POST endpoint (e.g. from in-game Dev dock or Host input)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $json = json_decode(file_get_contents('php://input'), true);
    
    // Check if updating round wins
    if (isset($json['action']) && $json['action'] === 'round_win') {
        $winningTeam = ($json['team'] ?? '') === 'WHITE' ? 'WHITE' : 'BLACK';
        $key = $winningTeam === 'WHITE' ? 'wins_white' : 'wins_black';
        $curr = (int)(getSetting($pdo, $key, '0'));
        setSetting($pdo, $key, (string)($curr + 1));
        
        if (isset($json['topic_idx'])) {
            setSetting($pdo, 'active_topic_idx', (string)$json['topic_idx']);
        }
        echo json_encode(['success' => true, 'winner' => $winningTeam, 'wins' => $curr + 1]);
        exit;
    }

    $user = trim($json['user'] ?? 'Viewer');
    $rawText = trim($json['text'] ?? '');
    $team = parseTeamVote($rawText);

    if ($team) {
        $stmt = $pdo->prepare("INSERT INTO chat_logs (user_name, raw_text, team) VALUES (:u, :t, :a)");
        $stmt->execute([':u' => $user, ':t' => $rawText, ':a' => $team]);

        $userId = 'sim-' . md5($user);
        $stmt = $pdo->prepare(
            "INSERT INTO leaderboard (user_id, user_name, team, total_votes, score, last_active) 
             VALUES (:uid, :name, :team, 1, 10, NOW()) 
             ON DUPLICATE KEY UPDATE team = :team2, total_votes = total_votes + 1, score = score + 10, last_active = NOW()"
        );
        $stmt->execute([':uid' => $userId, ':name' => $user, ':team' => $team, ':team2' => $team]);

        echo json_encode(['success' => true, 'team' => $team, 'user' => $user]);
        exit;
    }

    echo json_encode(['success' => false, 'error' => 'Unrecognized team command']);
    exit;
}

// 2. Poll Endpoint (polled by the game canvas every 1000ms)
$settings = getAllSettings($pdo);
$apiKey = $settings['yt_api_key'] ?? '';
$videoId = $settings['yt_video_id'] ?? '';

$incomingPulls = [];

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
                $team = parseTeamVote($item['text']);
                if ($team) {
                    $incomingPulls[] = [
                        'team' => $team,
                        'user' => $item['user'],
                        'text' => $item['text']
                    ];

                    $stmt = $pdo->prepare("INSERT INTO chat_logs (user_name, raw_text, team) VALUES (:u, :t, :a)");
                    $stmt->execute([':u' => $item['user'], ':t' => $item['text'], ':a' => $team]);

                    $stmt = $pdo->prepare(
                        "INSERT INTO leaderboard (user_id, user_name, team, total_votes, score, last_active) 
                         VALUES (:uid, :name, :team, 1, 10, NOW()) 
                         ON DUPLICATE KEY UPDATE team = :team2, total_votes = total_votes + 1, score = score + 10, last_active = NOW()"
                    );
                    $stmt->execute([':uid' => $item['userId'], ':name' => $item['user'], ':team' => $team, ':team2' => $team]);
                }
            }
        }
    }
}

// Fetch recent 10 seconds of logs for pulling force ratio
$stmt = $pdo->query("SELECT team FROM chat_logs WHERE created_at >= NOW() - INTERVAL 10 SECOND");
$recentTeams = $stmt->fetchAll(PDO::FETCH_COLUMN);

$blackVotes = 0;
$whiteVotes = 0;
foreach ($recentTeams as $t) {
    if ($t === 'BLACK') $blackVotes++;
    else if ($t === 'WHITE') $whiteVotes++;
}
$totalPulls = $blackVotes + $whiteVotes;
$blackPct = $totalPulls > 0 ? (int)round(($blackVotes / $totalPulls) * 100) : 50;
$whitePct = 100 - $blackPct;

// Velocity (messages in the last 2 seconds)
$stmt = $pdo->query("SELECT COUNT(*) FROM chat_logs WHERE created_at >= NOW() - INTERVAL 2 SECOND");
$velocity = (float)round(($stmt->fetchColumn() / 2), 1);

// Fetch Dual Top 10 Leaderboards
$stmt = $pdo->query("SELECT user_name, score FROM leaderboard WHERE team = 'BLACK' ORDER BY score DESC LIMIT 10");
$blackTop10 = $stmt->fetchAll();

$stmt = $pdo->query("SELECT user_name, score FROM leaderboard WHERE team = 'WHITE' ORDER BY score DESC LIMIT 10");
$whiteTop10 = $stmt->fetchAll();

// Crown Captains (#1 on each team)
$captainBlack = !empty($blackTop10) ? $blackTop10[0] : null;
$captainWhite = !empty($whiteTop10) ? $whiteTop10[0] : null;

// Round wins
$winsBlack = (int)($settings['wins_black'] ?? 0);
$winsWhite = (int)($settings['wins_white'] ?? 0);
$activeTopicIdx = (int)($settings['active_topic_idx'] ?? 0);

echo json_encode([
    'success' => true,
    'incoming_pulls' => $incomingPulls,
    'tallies' => [
        'black_votes' => $blackVotes,
        'white_votes' => $whiteVotes,
        'total' => $totalPulls,
    ],
    'percentages' => [
        'BLACK' => $blackPct,
        'WHITE' => $whitePct,
    ],
    'velocity' => $velocity,
    'captains' => [
        'black' => $captainBlack,
        'white' => $captainWhite,
    ],
    'leaderboards' => [
        'black' => $blackTop10,
        'white' => $whiteTop10,
    ],
    'round' => [
        'wins_black' => $winsBlack,
        'wins_white' => $winsWhite,
        'topic_idx' => $activeTopicIdx,
    ],
]);
