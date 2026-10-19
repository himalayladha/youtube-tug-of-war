<?php
/**
 * The Great Tug-of-War: Black vs White (With vs Against)
 * Public Spectator Arena & Live Broadcast Hub
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
$siteTitle = $settings['public_site_title'] ?? 'The Great Tug-of-War: Black vs White (With vs Against)';
$videoId = $settings['yt_video_id'] ?? $settings['youtube_video_id'] ?? '';
$announcementBanner = $settings['announcement_banner'] ?? '';
$announcementActive = ($settings['announcement_active'] ?? '0') === '1' && !empty($announcementBanner);
$showVideoEmbed = ($settings['show_video_embed'] ?? '1') === '1' && !empty($videoId);

// Stream session status
$isStreaming = false;
try {
    $stmt = $pdo->query("SELECT * FROM stream_sessions WHERE status = 'running' ORDER BY id DESC LIMIT 1");
    $activeSession = $stmt->fetch();
    $isStreaming = ($activeSession !== false);
} catch (Exception $e) {}

// Match stats
$winsBlack = (int)($settings['wins_black'] ?? 0);
$winsWhite = (int)($settings['wins_white'] ?? 0);

// Captains (#1 score on each team)
$captainBlack = null;
$captainWhite = null;
$blackTop5 = [];
$whiteTop5 = [];

try {
    $stmt = $pdo->query("SELECT user_name, score FROM leaderboard WHERE team = 'BLACK' ORDER BY score DESC LIMIT 1");
    $captainBlack = $stmt->fetch();

    $stmt = $pdo->query("SELECT user_name, score FROM leaderboard WHERE team = 'WHITE' ORDER BY score DESC LIMIT 1");
    $captainWhite = $stmt->fetch();

    $stmt = $pdo->query("SELECT user_name, score FROM leaderboard WHERE team = 'BLACK' ORDER BY score DESC LIMIT 5");
    $blackTop5 = $stmt->fetchAll();

    $stmt = $pdo->query("SELECT user_name, score FROM leaderboard WHERE team = 'WHITE' ORDER BY score DESC LIMIT 5");
    $whiteTop5 = $stmt->fetchAll();
} catch (Exception $e) {}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($siteTitle) ?></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090D16;
      --card-bg: rgba(18, 24, 38, 0.95);
      --card-border: rgba(255, 255, 255, 0.08);
      --border-focus: #0284C7;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --blue: #0284C7;
      --blue-hover: #0369A1;
      --green: #10B981;
      --red: #F43F5E;
      --amber: #F59E0B;
      --shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      line-height: 1.5;
    }

    /* Announcement Banner */
    .announcement-bar {
      background: linear-gradient(90deg, #B91C1C 0%, #DC2626 50%, #B91C1C 100%);
      color: #FFF;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);
      animation: alertPulse 2s infinite ease-in-out;
    }
    @keyframes alertPulse {
      0% { opacity: 0.92; }
      50% { opacity: 1; }
      100% { opacity: 0.92; }
    }

    /* Top Sticky Header */
    header {
      background: rgba(15, 23, 42, 0.92);
      border-bottom: 1px solid var(--card-border);
      padding: 14px 28px;
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(12px);
    }
    .header-inner {
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: #FFF;
    }
    .brand-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #0284C7, #0369A1);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
    }
    .brand-text {
      font-family: 'Chakra Petch', sans-serif;
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1.1;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 700;
      color: #38BDF8;
      letter-spacing: 0.8px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .status-pill.live {
      background: rgba(16, 185, 129, 0.15);
      color: #6EE7B7;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .status-pill.offline {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-muted);
      border: 1px solid var(--card-border);
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 8px var(--green);
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      font-family: inherit;
    }
    .btn-admin {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--card-border);
      color: #FFF;
    }
    .btn-admin:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .btn-yt {
      background: #E11D48;
      color: #FFF;
      box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);
    }
    .btn-yt:hover {
      background: #BE123C;
    }

    /* Main Container */
    main {
      flex: 1;
      max-width: 1440px;
      width: 100%;
      margin: 24px auto;
      padding: 0 24px;
    }

    /* Stream Layout Grid */
    .stream-grid {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 24px;
      margin-bottom: 32px;
    }
    @media (max-width: 1100px) {
      .stream-grid { grid-template-columns: 1fr; }
    }

    /* Video & Game Viewport Card */
    .viewport-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
    }
    .viewport-header {
      padding: 14px 20px;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(11, 15, 23, 0.7);
    }
    .viewport-title {
      font-size: 14px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #FFF;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .view-toggle {
      display: flex;
      gap: 4px;
      background: rgba(255, 255, 255, 0.05);
      padding: 3px;
      border-radius: 8px;
      border: 1px solid var(--card-border);
    }
    .view-toggle button {
      border: none;
      background: transparent;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .view-toggle button.active {
      background: var(--blue);
      color: #FFF;
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.4);
    }

    .video-aspect {
      position: relative;
      width: 100%;
      padding-top: 56.25%; /* 16:9 widescreen */
      background: #000;
    }
    .video-aspect iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
    }

    .viewport-footer {
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(18, 24, 38, 0.95);
      border-top: 1px solid var(--card-border);
      flex-wrap: wrap;
      gap: 16px;
    }
    .stream-meta h1 {
      font-size: 18px;
      font-weight: 800;
      color: #FFF;
      margin-bottom: 4px;
    }
    .stream-meta p {
      font-size: 13px;
      color: var(--text-muted);
    }

    /* Right Sidebar */
    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 22px;
      box-shadow: var(--shadow);
    }
    .card-title {
      font-size: 14px;
      font-weight: 800;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #FFF;
    }

    /* Live Force Meter */
    .force-meter {
      background: rgba(11, 15, 23, 0.8);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .force-labels {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .force-bar-track {
      height: 16px;
      background: #18181B;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .force-bar-black {
      height: 100%;
      background: linear-gradient(90deg, #000, #3B82F6);
      transition: width 0.4s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      color: #FFF;
    }
    .force-bar-white {
      height: 100%;
      background: linear-gradient(90deg, #F8FAFC, #E2E8F0);
      transition: width 0.4s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 900;
      color: #000;
    }

    /* Captains Spotlight Cards */
    .captains-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .captain-card {
      background: rgba(11, 15, 23, 0.7);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .captain-badge {
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .captain-name {
      font-size: 14px;
      font-weight: 800;
      color: #FFF;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .captain-score {
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 700;
    }

    /* Chat Commands Guide */
    .command-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid var(--card-border);
      background: rgba(11, 15, 23, 0.6);
      margin-bottom: 8px;
    }
    .command-key {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 4px 10px;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 13px;
      font-weight: 800;
      color: #38BDF8;
    }
    .command-desc {
      font-size: 12px;
      font-weight: 700;
      color: #FFF;
    }

    /* Leaderboard Tables */
    .leaderboard-dual {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .lb-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .lb-table th {
      text-align: left;
      padding: 6px 8px;
      color: var(--text-muted);
      font-size: 10px;
      font-weight: 800;
      border-bottom: 1px solid var(--card-border);
      text-transform: uppercase;
    }
    .lb-table td {
      padding: 6px 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-weight: 600;
    }
    .lb-rank {
      font-weight: 800;
      color: var(--text-muted);
      width: 22px;
    }

    footer {
      background: rgba(15, 23, 42, 0.95);
      border-top: 1px solid var(--card-border);
      padding: 20px 28px;
      margin-top: auto;
      font-size: 13px;
      color: var(--text-muted);
    }
    .footer-inner {
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
  </style>
</head>
<body>

  <!-- Dynamic Announcement Banner -->
  <?php if ($announcementActive): ?>
    <div class="announcement-bar">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      <span><?= htmlspecialchars($announcementBanner) ?></span>
    </div>
  <?php endif; ?>

  <!-- Header -->
  <header>
    <div class="header-inner">
      <a href="index.php" class="brand">
        <div class="brand-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/>
            <line x1="13" y1="19" x2="19" y2="13"/>
            <line x1="16" y1="16" x2="20" y2="20"/>
            <line x1="19" y1="21" x2="21" y2="19"/>
          </svg>
        </div>
        <div>
          <div class="brand-text">Tug-of-War</div>
          <div class="brand-sub">BLACK VS WHITE &bull; WITH VS AGAINST</div>
        </div>
      </a>

      <div class="header-actions">
        <?php if ($isStreaming): ?>
          <span class="status-pill live">
            <span class="pulse-dot"></span>
            LIVE BROADCAST
          </span>
        <?php else: ?>
          <span class="status-pill offline">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #64748B;"></span>
            STANDBY / OFFLINE
          </span>
        <?php endif; ?>

        <?php if (!empty($videoId)): ?>
          <a href="https://www.youtube.com/watch?v=<?= urlencode($videoId) ?>" target="_blank" class="btn btn-yt">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            Watch on YouTube
          </a>
        <?php endif; ?>

        <a href="admin/login.php" class="btn btn-admin" title="Administrator Control Suite">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>Admin Suite</span>
        </a>
      </div>
    </div>
  </header>

  <!-- Main Grid -->
  <main>
    <div class="stream-grid">
      <!-- Left Column: Video & Game Viewport -->
      <div class="viewport-card">
        <div class="viewport-header">
          <div class="viewport-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2.5">
              <rect x="2" y="3" width="20" height="14" rx="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            Live Game Surface
          </div>
          <?php if ($showVideoEmbed): ?>
            <div class="view-toggle">
              <button id="btn-toggle-game" class="active" onclick="switchView('game')">Game Engine</button>
              <button id="btn-toggle-yt" onclick="switchView('youtube')">YouTube Stream</button>
            </div>
          <?php endif; ?>
        </div>

        <div class="video-aspect">
          <iframe id="game-frame" src="game/index.html?preview=1" allow="autoplay; audio"></iframe>
          <?php if ($showVideoEmbed): ?>
            <iframe id="yt-frame" src="https://www.youtube.com/embed/<?= htmlspecialchars($videoId) ?>?autoplay=1&mute=0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" style="display: none;"></iframe>
          <?php endif; ?>
        </div>

        <div class="viewport-footer">
          <div class="stream-meta">
            <h1><?= htmlspecialchars($siteTitle) ?></h1>
            <p>Interactive Tug-of-War Stream Engine &bull; 1080p 60fps &bull; Powered by PHP, SQLite &amp; FFmpeg</p>
          </div>
          <div style="display: flex; gap: 12px; align-items: center;">
            <span style="font-size: 11px; font-weight: 800; color: #94A3B8; background: rgba(255,255,255,0.06); padding: 6px 12px; border-radius: 6px; border: 1px solid var(--card-border);">
              Match Score: <b style="color: #FFF;"><?= $winsBlack ?></b> (Black) - <b style="color: #FFF;"><?= $winsWhite ?></b> (White)
            </span>
          </div>
        </div>
      </div>

      <!-- Right Column: Sidebar Stats & Commands -->
      <div class="sidebar">
        <!-- Live Force Balance -->
        <div class="card">
          <div class="card-title">
            <span>⚔️ Real-Time Pulling Force</span>
            <span id="chat_velocity" style="font-size: 11px; color: #38BDF8; font-weight: 800;">0 pulls/s</span>
          </div>

          <div class="force-meter">
            <div class="force-labels">
              <span id="label_topic_left" style="color: #93C5FD;">TEAM BLACK</span>
              <span id="label_topic_right" style="color: #F8FAFC;">TEAM WHITE</span>
            </div>
            <div class="force-bar-track">
              <div id="bar_black" class="force-bar-black" style="width: 50%;">50%</div>
              <div id="bar_white" class="force-bar-white" style="width: 50%;">50%</div>
            </div>
          </div>

          <!-- Team Captains -->
          <div class="captains-grid">
            <div class="captain-card">
              <span class="captain-badge" style="color: #60A5FA;">👑 BLACK CAPTAIN</span>
              <span id="capt_black_name" class="captain-name">@<?= htmlspecialchars($captainBlack['user_name'] ?? 'Recruiting...') ?></span>
              <span id="capt_black_score" class="captain-score"><?= htmlspecialchars($captainBlack['score'] ?? '0') ?> pts</span>
            </div>
            <div class="captain-card">
              <span class="captain-badge" style="color: #FACC15;">👑 WHITE CAPTAIN</span>
              <span id="capt_white_name" class="captain-name">@<?= htmlspecialchars($captainWhite['user_name'] ?? 'Recruiting...') ?></span>
              <span id="capt_white_score" class="captain-score"><?= htmlspecialchars($captainWhite['score'] ?? '0') ?> pts</span>
            </div>
          </div>
        </div>

        <!-- How to Play via Live Chat -->
        <div class="card">
          <div class="card-title">
            <span>🎮 How to Play in Live Chat</span>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
            Type in YouTube Live chat to pull the rope. Delay is buffered so your vote exerts immediate physics force:
          </p>

          <div class="command-box">
            <span class="command-key">1 / BLACK / WITH</span>
            <span class="command-desc">Pull Left (Team Black)</span>
          </div>
          <div class="command-box">
            <span class="command-key">2 / WHITE / AGAINST</span>
            <span class="command-desc">Pull Right (Team White)</span>
          </div>
        </div>

        <!-- Dual Top 5 Leaderboards -->
        <div class="card">
          <div class="card-title">
            <span>🏆 Dual Leaderboards</span>
          </div>

          <div class="leaderboard-dual">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: #93C5FD; margin-bottom: 6px;">TEAM BLACK TOP 5</div>
              <table class="lb-table">
                <tbody id="lb_black_body">
                  <?php if (!empty($blackTop5)): foreach ($blackTop5 as $i => $u): ?>
                    <tr>
                      <td class="lb-rank">#<?= $i + 1 ?></td>
                      <td>@<?= htmlspecialchars($u['user_name']) ?></td>
                      <td style="text-align: right; color: #93C5FD;"><?= $u['score'] ?></td>
                    </tr>
                  <?php endforeach; else: ?>
                    <tr><td colspan="3" style="color: var(--text-muted);">No pullers yet</td></tr>
                  <?php endif; ?>
                </tbody>
              </table>
            </div>

            <div>
              <div style="font-size: 11px; font-weight: 800; color: #F8FAFC; margin-bottom: 6px;">TEAM WHITE TOP 5</div>
              <table class="lb-table">
                <tbody id="lb_white_body">
                  <?php if (!empty($whiteTop5)): foreach ($whiteTop5 as $i => $u): ?>
                    <tr>
                      <td class="lb-rank">#<?= $i + 1 ?></td>
                      <td>@<?= htmlspecialchars($u['user_name']) ?></td>
                      <td style="text-align: right; color: #F8FAFC;"><?= $u['score'] ?></td>
                    </tr>
                  <?php endforeach; else: ?>
                    <tr><td colspan="3" style="color: var(--text-muted);">No pullers yet</td></tr>
                  <?php endif; ?>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <footer>
    <div class="footer-inner">
      <div>
        <b>The Great Tug-of-War: Black vs White</b> &bull; Autonomous 24/7 Server Stream Engine
      </div>
      <div>
        <a href="admin/login.php" style="color: var(--text-muted); text-decoration: none; font-weight: 700;">Admin Sign In</a>
      </div>
    </div>
  </footer>

  <script>
    function switchView(mode) {
      const gameBtn = document.getElementById('btn-toggle-game');
      const ytBtn = document.getElementById('btn-toggle-yt');
      const gameFrame = document.getElementById('game-frame');
      const ytFrame = document.getElementById('yt-frame');

      if (!ytFrame) return;

      if (mode === 'game') {
        gameBtn.classList.add('active');
        ytBtn.classList.remove('active');
        gameFrame.style.display = 'block';
        ytFrame.style.display = 'none';
      } else {
        ytBtn.classList.add('active');
        gameBtn.classList.remove('active');
        gameFrame.style.display = 'none';
        ytFrame.style.display = 'block';
      }
    }

    // Live poller for dynamic spectator sidebar updates
    async function pollLiveStats() {
      try {
        const res = await fetch('api/chat.php?poll=1');
        const data = await res.json();
        if (!data.success) return;

        // Force balance meter
        if (data.force) {
          const bp = data.force.black_pct || 50;
          const wp = data.force.white_pct || 50;
          const barB = document.getElementById('bar_black');
          const barW = document.getElementById('bar_white');
          if (barB && barW) {
            barB.style.width = `${bp}%`;
            barB.textContent = `${bp}%`;
            barW.style.width = `${wp}%`;
            barW.textContent = `${wp}%`;
          }
        }

        // Chat velocity
        if (data.velocity !== undefined) {
          const velEl = document.getElementById('chat_velocity');
          if (velEl) velEl.textContent = `${data.velocity} pulls/s`;
        }

        // Captains
        if (data.captains) {
          if (data.captains.black) {
            document.getElementById('capt_black_name').textContent = `@${data.captains.black.user_name}`;
            document.getElementById('capt_black_score').textContent = `${data.captains.black.score} pts`;
          }
          if (data.captains.white) {
            document.getElementById('capt_white_name').textContent = `@${data.captains.white.user_name}`;
            document.getElementById('capt_white_score').textContent = `${data.captains.white.score} pts`;
          }
        }

        // Topics
        if (data.round) {
          const leftTopic = data.round.topic_left || 'TEAM BLACK';
          const rightTopic = data.round.topic_right || 'TEAM WHITE';
          const labelLeft = document.getElementById('label_topic_left');
          const labelRight = document.getElementById('label_topic_right');
          if (labelLeft) labelLeft.textContent = leftTopic;
          if (labelRight) labelRight.textContent = rightTopic;
        }
      } catch (e) {}
    }

    setInterval(pollLiveStats, 2000);
  </script>

</body>
</html>
