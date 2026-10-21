<?php
/**
 * The Great Tug-of-War: Black vs White - Live Chat Poller & Force Engine
 * Compatible with MySQL / MariaDB and SQLite (Termux & TermuxPanel)
 */

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = getDbConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}

$isSqlite = ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite');

// Helper to record a vote into the leaderboard
function recordVote(PDO $pdo, bool $isSqlite, string $userId, string $userName, string $team, string $rawText) {
    $stmt = $pdo->prepare("INSERT INTO chat_logs (user_name, raw_text, team) VALUES (:u, :t, :a)");
    $stmt->execute([':u' => $userName, ':t' => $rawText, ':a' => $team]);

    if ($isSqlite) {
        $stmt = $pdo->prepare(
            "INSERT INTO leaderboard (user_id, user_name, team, total_votes, score, last_active) 
             VALUES (:uid, :name, :team, 1, 10, datetime('now')) 
             ON CONFLICT(user_id) DO UPDATE SET team = :team2, total_votes = total_votes + 1, score = score + 10, last_active = datetime('now')"
        );
    } else {
        $stmt = $pdo->prepare(
            "INSERT INTO leaderboard (user_id, user_name, team, total_votes, score, last_active) 
             VALUES (:uid, :name, :team, 1, 10, NOW()) 
             ON DUPLICATE KEY UPDATE team = :team2, total_votes = total_votes + 1, score = score + 10, last_active = NOW()"
        );
    }
    $stmt->execute([':uid' => $userId, ':name' => $userName, ':team' => $team, ':team2' => $team]);
}

// Parse Chat Command for Team 1 (Left) vs Team 2 (Right)
function parseTeamVote(string $text, string $topicLeft = '', string $topicRight = ''): ?string {
    $clean = strtolower(trim($text));
    
    // Numeric shortcuts (1 = Team 1 / Left / Android, 2 = Team 2 / Right / iPhone)
    if ($clean === '1' || $clean === 'lane1' || $clean === 'left') return 'BLACK';
    if ($clean === '2' || $clean === 'lane2' || $clean === 'right') return 'WHITE';

    // Word triggers
    if (str_starts_with($clean, 'black') || str_starts_with($clean, 'with')) return 'BLACK';
    if (str_starts_with($clean, 'white') || str_starts_with($clean, 'against')) return 'WHITE';

    // Dynamic Debate Topic Triggers
    if (!empty($topicLeft) && (str_contains($clean, strtolower($topicLeft)))) return 'BLACK';
    if (!empty($topicRight) && (str_contains($clean, strtolower($topicRight)))) return 'WHITE';

    return null;
}

$settings = getAllSettings($pdo);
$topicLeft = $settings['topic_left'] ?? 'ANDROID';
$topicRight = $settings['topic_right'] ?? 'IPHONE';

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

        // Captain & scores must start from zero in each round
        $pdo->exec("UPDATE leaderboard SET score = 0, total_votes = 0");

        echo json_encode(['success' => true, 'winner' => $winningTeam, 'wins' => $curr + 1]);
        exit;
    }

    $user = trim($json['user'] ?? 'Viewer');
    $rawText = trim($json['text'] ?? '');
    $team = parseTeamVote($rawText, $topicLeft, $topicRight);

    if ($team) {
        $userId = 'sim-' . md5($user);
        recordVote($pdo, $isSqlite, $userId, $user, $team, $rawText);

        echo json_encode(['success' => true, 'team' => $team, 'user' => $user]);
        exit;
    }

    echo json_encode(['success' => false, 'error' => 'Unrecognized team command']);
    exit;
}

// Fast non-blocking HTTP fetcher with strict timeout
function fetchApiUrl(string $url, int $timeout = 2): ?string {
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_USERAGENT, 'YouTube-Live-TugOfWar/1.0');
        $res = curl_exec($ch);
        curl_close($ch);
        return ($res !== false) ? $res : null;
    }
    $ctx = stream_context_create(['http' => ['timeout' => $timeout]]);
    return @file_get_contents($url, false, $ctx) ?: null;
}

// 2. Poll Active YouTube Live Stream
$apiKey = $settings['yt_api_key'] ?? '';
$videoId = $settings['yt_video_id'] ?? '';
$liveChatId = $settings['yt_live_chat_id'] ?? '';
$pageToken = $settings['yt_page_token'] ?? '';

// Allow setting/updating video_id dynamically via query param (supports full URLs or video IDs)
if (!empty($_GET['set_video_id'])) {
    $rawVid = trim($_GET['set_video_id']);
    if (preg_match('/(?:live\/|v=|youtu\.be\/|^)([a-zA-Z0-9_-]{11})/', $rawVid, $m)) {
        $rawVid = $m[1];
    }
    setSetting($pdo, 'yt_video_id', $rawVid);
    setSetting($pdo, 'yt_live_chat_id', '');
    setSetting($pdo, 'yt_page_token', '');
    $videoId = $rawVid;
    $liveChatId = '';
    $pageToken = '';
}

// Auto-discover active live stream if videoId is missing
if (empty($videoId) && !empty($apiKey)) {
    $searchUrl = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&eventType=live&q=Digital+Himalay&maxResults=1&key=" . urlencode($apiKey);
    $searchRes = fetchApiUrl($searchUrl, 3);
    if ($searchRes) {
        $searchJson = json_decode($searchRes, true);
        if (!empty($searchJson['items'][0]['id']['videoId'])) {
            $videoId = $searchJson['items'][0]['id']['videoId'];
            setSetting($pdo, 'yt_video_id', $videoId);
            setSetting($pdo, 'yt_live_chat_id', '');
            setSetting($pdo, 'yt_page_token', '');
        }
    }
}

$incomingPulls = [];

if (!empty($apiKey) && !empty($videoId)) {
    // Resolve LiveChatId if missing
    if (empty($liveChatId)) {
        $videoApiUrl = "https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=" . urlencode($videoId) . "&key=" . urlencode($apiKey);
        $videoRes = fetchApiUrl($videoApiUrl, 3);
        if ($videoRes) {
            $videoData = json_decode($videoRes, true);
            $chatId = $videoData['items'][0]['liveStreamingDetails']['activeLiveChatId'] ?? null;
            if ($chatId) {
                $liveChatId = $chatId;
                setSetting($pdo, 'yt_live_chat_id', $liveChatId);
            }
        }
    }

    // Ingest new chat messages
    if (!empty($liveChatId)) {
        $chatApiUrl = "https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=" . urlencode($liveChatId) . "&part=snippet,authorDetails&key=" . urlencode($apiKey);
        if (!empty($pageToken)) {
            $chatApiUrl .= "&pageToken=" . urlencode($pageToken);
        }

        $chatRes = fetchApiUrl($chatApiUrl, 2);
        if ($chatRes) {
            $chatJson = json_decode($chatRes, true);
            if (!empty($chatJson['nextPageToken'])) {
                setSetting($pdo, 'yt_page_token', $chatJson['nextPageToken']);
            }

            if (!empty($chatJson['items'])) {
                foreach ($chatJson['items'] as $item) {
                    $rawMsg = $item['snippet']['displayMessage'] ?? '';
                    $author = $item['authorDetails']['displayName'] ?? 'Viewer';
                    $authorId = $item['authorDetails']['channelId'] ?? md5($author);

                    $team = parseTeamVote($rawMsg, $topicLeft, $topicRight);
                    if ($team) {
                        $incomingPulls[] = [
                            'team' => $team,
                            'user' => $author,
                            'text' => $rawMsg
                        ];
                        recordVote($pdo, $isSqlite, $authorId, $author, $team, $rawMsg);
                    }
                }
            }
        }
    }
}

// Fetch recent 10 seconds of logs for pulling force ratio
$timeQuery = $isSqlite ? "datetime('now', '-10 seconds')" : "NOW() - INTERVAL 10 SECOND";
$stmt = $pdo->query("SELECT team FROM chat_logs WHERE created_at >= {$timeQuery}");
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
$velTimeQuery = $isSqlite ? "datetime('now', '-2 seconds')" : "NOW() - INTERVAL 2 SECOND";
$stmt = $pdo->query("SELECT COUNT(*) FROM chat_logs WHERE created_at >= {$velTimeQuery}");
$velocity = (float)round(($stmt->fetchColumn() / 2), 1);

// Fetch Dual Leaderboards (only active within last 5 minutes, ordered by comments then score)
$fiveMinAgo = $isSqlite ? "datetime('now', '-5 minutes')" : "NOW() - INTERVAL 5 MINUTE";
$stmt = $pdo->query("SELECT user_name, score, total_votes FROM leaderboard WHERE team = 'BLACK' AND last_active >= {$fiveMinAgo} ORDER BY total_votes DESC, score DESC LIMIT 50");
$blackTop = $stmt->fetchAll();

$stmt = $pdo->query("SELECT user_name, score, total_votes FROM leaderboard WHERE team = 'WHITE' AND last_active >= {$fiveMinAgo} ORDER BY total_votes DESC, score DESC LIMIT 50");
$whiteTop = $stmt->fetchAll();

// Crown Captains (#1 on each team)
$captainBlack = !empty($blackTop) ? $blackTop[0] : null;
$captainWhite = !empty($whiteTop) ? $whiteTop[0] : null;

// Round wins
$winsBlack = (int)(getSetting($pdo, 'wins_black', '0'));
$winsWhite = (int)(getSetting($pdo, 'wins_white', '0'));
$activeTopicIdx = (int)(getSetting($pdo, 'active_topic_idx', '0'));
$topicLeft = getSetting($pdo, 'topic_left', '');
$topicRight = getSetting($pdo, 'topic_right', '');

echo json_encode([
    'success' => true,
    'incoming_pulls' => $incomingPulls,
    'force' => [
        'black_pct' => $blackPct,
        'white_pct' => $whitePct,
        'black_votes' => $blackVotes,
        'white_votes' => $whiteVotes,
    ],
    'velocity' => $velocity,
    'captains' => [
        'black' => $captainBlack,
        'white' => $captainWhite
    ],
    'leaderboards' => [
        'black' => $blackTop,
        'white' => $whiteTop
    ],
    'round' => [
        'wins_black' => $winsBlack,
        'wins_white' => $winsWhite,
        'topic_idx' => $activeTopicIdx,
        'topic_left' => $topicLeft,
        'topic_right' => $topicRight
    ]
]);
