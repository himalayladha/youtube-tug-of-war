<?php
/**
 * The Great Tug-of-War: Black vs White - Public Spectator Portal
 */

$configFile = __DIR__ . '/config.php';
$isInstalled = false;

if (file_exists($configFile)) {
    require_once __DIR__ . '/includes/db.php';
    try {
        $pdo = getDbConnection();
        $val = getSetting($pdo, 'db_installed', '0');
        if ($val === '1') {
            $isInstalled = true;
        }
    } catch (Exception $e) {
        $isInstalled = false;
    }
}

if (!$isInstalled) {
    header('Location: setup.php');
    exit;
}

$settings = getAllSettings($pdo);
$videoTitle = $settings['youtube_stream_title'] ?? 'The Great Tug-of-War: Black vs White | Live YouTube Chat Battle';
$videoId = $settings['yt_video_id'] ?? '';

// Check if stream daemon is running
$stmt = $pdo->query("SELECT * FROM stream_sessions WHERE status = 'running' ORDER BY id DESC LIMIT 1");
$activeSession = $stmt->fetch();
$isStreaming = ($activeSession !== false);

// Fetch Team Captains
$capBlackStmt = $pdo->query("SELECT user_name, score FROM leaderboard WHERE team = 'BLACK' ORDER BY score DESC LIMIT 1");
$capBlack = $capBlackStmt->fetch();

$capWhiteStmt = $pdo->query("SELECT user_name, score FROM leaderboard WHERE team = 'WHITE' ORDER BY score DESC LIMIT 1");
$capWhite = $capWhiteStmt->fetch();

// Dual Top 5 Leaderboards
$leadBlack = $pdo->query("SELECT user_name, score FROM leaderboard WHERE team = 'BLACK' ORDER BY score DESC LIMIT 5")->fetchAll();
$leadWhite = $pdo->query("SELECT user_name, score FROM leaderboard WHERE team = 'WHITE' ORDER BY score DESC LIMIT 5")->fetchAll();

// Round Stats
$roundStats = $pdo->query("SELECT * FROM round_stats WHERE id = 1")->fetch() ?: ['wins_black' => 0, 'wins_white' => 0];
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($videoTitle) ?></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700;800;900&family=Inter:wght@400;500;600;700;800;900&family=Russo+One&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #F8FAFC;
      --card-bg: #FFFFFF;
      --border: rgba(15, 23, 42, 0.08);
      --border-focus: #F59E0B;
      --text: #0F172A;
      --text-muted: #64748B;
      --accent-gold: #F59E0B;
      --team-black: #0F172A;
      --team-black-accent: #EF4444;
      --team-white: #FFFFFF;
      --team-white-accent: #0284C7;
      --shadow: 0 10px 25px -4px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.03);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: #FFFFFF;
      border-bottom: 1px solid var(--border);
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 50;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      font-weight: 900;
      font-family: 'Russo One', sans-serif;
      letter-spacing: 0.5px;
    }
    .brand-badge {
      background: #0F172A;
      color: #F59E0B;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 13px;
    }
    .live-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 800;
      font-family: 'Chakra Petch', sans-serif;
    }
    .live-status.active {
      background: #FEF2F2;
      color: #DC2626;
      border: 1px solid #FECACA;
    }
    .live-status.offline {
      background: #F1F5F9;
      color: #64748B;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #DC2626;
      box-shadow: 0 0 10px #DC2626;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }
    main {
      flex: 1;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .hero-banner {
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      border-radius: 24px;
      padding: 36px 40px;
      color: #FFFFFF;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2);
    }
    .hero-left h1 {
      font-family: 'Russo One', sans-serif;
      font-size: 32px;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      color: #FFFFFF;
    }
    .hero-left p {
      color: #94A3B8;
      font-size: 15px;
      max-width: 620px;
      line-height: 1.5;
    }
    .btn-play {
      background: #F59E0B;
      color: #0F172A;
      font-family: 'Chakra Petch', sans-serif;
      font-size: 16px;
      font-weight: 900;
      padding: 14px 28px;
      border-radius: 14px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
      transition: all 0.2s ease;
    }
    .btn-play:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(245, 158, 11, 0.5);
    }
    .captains-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .captain-box {
      border-radius: 20px;
      padding: 24px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: var(--shadow);
    }
    .captain-box.black {
      background: #0F172A;
      color: #FFFFFF;
      border: 2px solid #EF4444;
    }
    .captain-box.white {
      background: #FFFFFF;
      color: #0F172A;
      border: 2px solid #0284C7;
    }
    .captain-badge {
      font-family: 'Chakra Petch', sans-serif;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 1px;
      color: #F59E0B;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .captain-username {
      font-family: 'Russo One', sans-serif;
      font-size: 26px;
    }
    .captain-score-tally {
      font-family: 'Chakra Petch', sans-serif;
      font-size: 24px;
      font-weight: 900;
      color: #F59E0B;
      text-align: right;
    }
    .victories-badge {
      font-size: 12px;
      font-weight: 700;
      opacity: 0.8;
      letter-spacing: 0.5px;
    }
    .commands-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 28px;
      box-shadow: var(--shadow);
    }
    .section-title {
      font-family: 'Russo One', sans-serif;
      font-size: 20px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .command-rows {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .cmd-item {
      padding: 16px 20px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .cmd-item.black {
      background: #0F172A;
      color: #FFFFFF;
      border: 1.5px solid #EF4444;
    }
    .cmd-item.white {
      background: #F8FAFC;
      color: #0F172A;
      border: 1.5px solid #0284C7;
    }
    .cmd-keys {
      display: flex;
      gap: 8px;
    }
    .key-badge {
      background: #F59E0B;
      color: #0F172A;
      font-family: 'Chakra Petch', sans-serif;
      font-weight: 900;
      padding: 4px 12px;
      border-radius: 8px;
      font-size: 14px;
    }
    .leaderboards-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .lb-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
      box-shadow: var(--shadow);
    }
    .lb-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    .lb-table th, .lb-table td {
      padding: 10px 12px;
      text-align: left;
      font-size: 14px;
    }
    .lb-table th {
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 800;
      border-bottom: 1px solid var(--border);
    }
    .lb-table td {
      border-bottom: 1px solid rgba(15, 23, 42, 0.04);
      font-weight: 600;
    }
    .lb-rank {
      font-family: 'Chakra Petch', sans-serif;
      font-weight: 800;
      color: var(--text-muted);
      width: 35px;
    }
    .lb-rank.gold { color: #F59E0B; }
    .lb-score-col {
      text-align: right;
      font-family: 'Chakra Petch', sans-serif;
      font-weight: 900;
      color: #0284C7;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span class="brand-badge">LIVE 24/7</span>
      <span>THE GREAT TUG-OF-WAR</span>
    </div>
    <div class="header-right">
      <?php if ($isStreaming): ?>
        <div class="live-status active">
          <span class="pulse-dot"></span>
          <span>BROADCASTING LIVE</span>
        </div>
      <?php else: ?>
        <div class="live-status offline">
          <span>● STREAM READY</span>
        </div>
      <?php endif; ?>
    </div>
  </header>

  <main>
    <div class="hero-banner">
      <div class="hero-left">
        <h1>⚔️ THE GREAT TUG-OF-WAR: BLACK vs WHITE</h1>
        <p>Type in the live YouTube chat to pull the cable! No twitch reflexes needed—every vote accumulates force. Crown yourself Captain and climb the Top 10 Leaderboard!</p>
      </div>
      <div>
        <a href="game/index.html?preview=1" target="_blank" class="btn-play">
          <span>🎮 Launch Arena View</span>
        </a>
      </div>
    </div>

    <!-- Dual Captain Cards -->
    <div class="captains-grid">
      <div class="captain-box black">
        <div>
          <div class="captain-badge">👑 CAPTAIN OF BLACK</div>
          <div class="captain-username"><?= htmlspecialchars($capBlack ? '@' . $capBlack['user_name'] : '@BeTheFirst') ?></div>
          <div class="victories-badge">VICTORIES: <?= (int)$roundStats['wins_black'] ?></div>
        </div>
        <div class="captain-score-tally">
          <div><?= (int)($capBlack['score'] ?? 0) ?> pts</div>
        </div>
      </div>

      <div class="captain-box white">
        <div>
          <div class="captain-badge">👑 CAPTAIN OF WHITE</div>
          <div class="captain-username"><?= htmlspecialchars($capWhite ? '@' . $capWhite['user_name'] : '@BeTheFirst') ?></div>
          <div class="victories-badge">VICTORIES: <?= (int)$roundStats['wins_white'] ?></div>
        </div>
        <div class="captain-score-tally">
          <div><?= (int)($capWhite['score'] ?? 0) ?> pts</div>
        </div>
      </div>
    </div>

    <!-- How to Play / Chat Commands -->
    <div class="commands-card">
      <div class="section-title">💬 Live YouTube Chat Commands</div>
      <div class="command-rows">
        <div class="cmd-item black">
          <div>
            <b>Pull for TEAM BLACK</b>
            <div style="font-size: 13px; opacity: 0.8; margin-top: 2px;">Heaves the cable to the left!</div>
          </div>
          <div class="cmd-keys">
            <span class="key-badge">1</span>
            <span class="key-badge">BLACK</span>
          </div>
        </div>

        <div class="cmd-item white">
          <div>
            <b>Pull for TEAM WHITE</b>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">Heaves the cable to the right!</div>
          </div>
          <div class="cmd-keys">
            <span class="key-badge">2</span>
            <span class="key-badge">WHITE</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Dual Top 5 Leaderboards -->
    <div class="leaderboards-split">
      <div class="lb-card">
        <div class="section-title" style="color: #0F172A;">⚫ Top 5 Team Black</div>
        <table class="lb-table">
          <thead>
            <tr><th>#</th><th>Player</th><th style="text-align: right;">Points</th></tr>
          </thead>
          <tbody>
            <?php if (empty($leadBlack)): ?>
              <tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">Type 1 or BLACK in chat to claim the crown!</td></tr>
            <?php else: ?>
              <?php foreach ($leadBlack as $i => $row): ?>
                <tr>
                  <td class="lb-rank <?= $i === 0 ? 'gold' : '' ?>"><?= $i === 0 ? '👑' : ($i + 1) ?></td>
                  <td>@<?= htmlspecialchars($row['user_name']) ?></td>
                  <td class="lb-score-col" style="color: #EF4444;"><?= (int)$row['score'] ?></td>
                </tr>
              <?php endforeach; ?>
            <?php endif; ?>
          </tbody>
        </table>
      </div>

      <div class="lb-card">
        <div class="section-title" style="color: #0284C7;">⚪ Top 5 Team White</div>
        <table class="lb-table">
          <thead>
            <tr><th>#</th><th>Player</th><th style="text-align: right;">Points</th></tr>
          </thead>
          <tbody>
            <?php if (empty($leadWhite)): ?>
              <tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">Type 2 or WHITE in chat to claim the crown!</td></tr>
            <?php else: ?>
              <?php foreach ($leadWhite as $i => $row): ?>
                <tr>
                  <td class="lb-rank <?= $i === 0 ? 'gold' : '' ?>"><?= $i === 0 ? '👑' : ($i + 1) ?></td>
                  <td>@<?= htmlspecialchars($row['user_name']) ?></td>
                  <td class="lb-score-col"><?= (int)$row['score'] ?></td>
                </tr>
              <?php endforeach; ?>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</body>
</html>
