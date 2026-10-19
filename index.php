<?php
/**
 * Stickman Live Runner - Public Spectator Landing Page
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
$videoTitle = $settings['youtube_stream_title'] ?? 'YouTube Live Chat Plays Stickman Runner 24/7';
$videoId = $settings['youtube_video_id'] ?? '';
$streamMode = $settings['stream_mode'] ?? 'anarchy';

// Check if there is an active stream session
$stmt = $pdo->query("SELECT * FROM stream_sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1");
$activeSession = $stmt->fetch();
$isStreaming = ($activeSession !== false);

// Top contributors from leaderboard
$leadStmt = $pdo->query("SELECT username, score, commands_count, last_action FROM leaderboard ORDER BY score DESC, commands_count DESC LIMIT 5");
$topViewers = $leadStmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($videoTitle) ?></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #F8FAFC;
      --card-bg: #FFFFFF;
      --border: rgba(15, 23, 42, 0.08);
      --border-focus: #0284C7;
      --text: #0F172A;
      --text-muted: #64748B;
      --blue: #0284C7;
      --blue-hover: #0369A1;
      --blue-light: #E0F2FE;
      --green: #059669;
      --green-light: #D1FAE5;
      --red: #E11D48;
      --red-light: #FFE4E6;
      --amber: #D97706;
      --amber-light: #FEF3C7;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow: 0 10px 25px -4px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.03);
      --shadow-lg: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 10px 10px -5px rgba(15, 23, 42, 0.04);
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
    header {
      background: #FFFFFF;
      border-bottom: 1px solid var(--border);
      padding: 16px 32px;
      position: sticky;
      top: 0;
      z-index: 50;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
    }
    .header-inner {
      max-width: 1360px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 19px;
      font-weight: 900;
      color: var(--text);
      text-decoration: none;
    }
    .brand-icon {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #0284C7, #0369A1);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .status-pill.live {
      background: var(--red-light);
      color: var(--red);
      border: 1px solid rgba(225, 29, 72, 0.2);
    }
    .status-pill.offline {
      background: #F1F5F9;
      color: var(--text-muted);
      border: 1px solid var(--border);
    }
    .pulse-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.7);
      animation: pulse 1.6s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(225, 29, 72, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); }
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
    }
    .btn-admin {
      background: #FFFFFF;
      border: 1px solid var(--border);
      color: var(--text);
    }
    .btn-admin:hover {
      background: #F8FAFC;
      border-color: #CBD5E1;
    }
    .btn-yt {
      background: #FF0000;
      color: #FFFFFF;
    }
    .btn-yt:hover {
      background: #CC0000;
    }

    main {
      flex: 1;
      max-width: 1360px;
      width: 100%;
      margin: 32px auto;
      padding: 0 24px;
    }

    /* Grid Layout */
    .stream-grid {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 28px;
      margin-bottom: 32px;
    }
    @media (max-width: 1024px) {
      .stream-grid { grid-template-columns: 1fr; }
    }

    /* Video Viewport */
    .viewport-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
    }
    .viewport-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FAFAFA;
    }
    .viewport-title {
      font-size: 15px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .view-toggle {
      display: flex;
      gap: 4px;
      background: #F1F5F9;
      padding: 3px;
      border-radius: 8px;
    }
    .view-toggle button {
      border: none;
      background: transparent;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .view-toggle button.active {
      background: #FFFFFF;
      color: var(--blue);
      box-shadow: var(--shadow-sm);
    }
    .video-aspect {
      position: relative;
      width: 100%;
      padding-top: 56.25%; /* 16:9 ratio */
      background: #0F172A;
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
      background: #FFFFFF;
      flex-wrap: gap;
      gap: 16px;
    }
    .stream-meta h1 {
      font-size: 18px;
      font-weight: 800;
      color: var(--text);
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
      gap: 24px;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      box-shadow: var(--shadow);
    }
    .card-title {
      font-size: 15px;
      font-weight: 800;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      letter-spacing: -0.01em;
    }

    /* Chat Command Controls */
    .commands-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .command-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: #F8FAFC;
      transition: all 0.15s ease;
    }
    .command-box:hover {
      border-color: #CBD5E1;
      background: #F1F5F9;
    }
    .command-key {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      padding: 4px 10px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 13px;
      font-weight: 800;
      color: var(--blue);
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .command-desc {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }

    /* Live Vote Bar */
    .vote-bar-card {
      margin-top: 16px;
      padding: 14px;
      background: #F8FAFC;
      border: 1px solid var(--border);
      border-radius: 10px;
    }
    .vote-bar-header {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .vote-track {
      height: 12px;
      background: #E2E8F0;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
    }
    .vote-segment {
      height: 100%;
      transition: width 0.4s ease;
    }
    .vote-segment.left { background: #0284C7; }
    .vote-segment.jump { background: #059669; }
    .vote-segment.right { background: #D97706; }

    .vote-legend {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 12px;
      font-weight: 700;
    }
    .vote-legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .legend-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    /* Leaderboard */
    .leaderboard-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .leaderboard-table th {
      text-align: left;
      padding: 8px 12px;
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 700;
      border-bottom: 1px solid var(--border);
      text-transform: uppercase;
    }
    .leaderboard-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      font-weight: 600;
    }
    .rank-cell {
      font-weight: 800;
      color: var(--text-muted);
      width: 32px;
    }
    .rank-cell.top-1 { color: #D97706; }
    .rank-cell.top-2 { color: #64748B; }
    .rank-cell.top-3 { color: #B45309; }
    .score-badge {
      display: inline-block;
      padding: 2px 8px;
      background: #FEF3C7;
      color: #92400E;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
    }

    /* Features 3-Col Section */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-top: 12px;
    }
    @media (max-width: 850px) {
      .features-grid { grid-template-columns: 1fr; }
    }
    .feature-card {
      background: #FFFFFF;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      box-shadow: var(--shadow-sm);
    }
    .feature-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
    }
    .feature-title {
      font-size: 15px;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .feature-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    footer {
      background: #FFFFFF;
      border-top: 1px solid var(--border);
      padding: 24px 32px;
      margin-top: auto;
      font-size: 13px;
      color: var(--text-muted);
    }
    .footer-inner {
      max-width: 1360px;
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

  <!-- Header -->
  <header>
    <div class="header-inner">
      <a href="index.php" class="brand">
        <div class="brand-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="5" r="3"></circle>
            <path d="M6.5 9h11L15 15l3 6M9 15l-3 6M12 9v6"></path>
          </svg>
        </div>
        <span>Stickman Live Runner</span>
      </a>

      <div class="header-actions">
        <?php if ($isStreaming): ?>
          <span class="status-pill live">
            <span class="pulse-dot"></span>
            LIVE ON YOUTUBE
          </span>
        <?php else: ?>
          <span class="status-pill offline">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #94A3B8;"></span>
            STANDBY / OFFLINE
          </span>
        <?php endif; ?>

        <?php if (!empty($videoId)): ?>
          <a href="https://www.youtube.com/watch?v=<?= urlencode($videoId) ?>" target="_blank" class="btn btn-yt">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            Watch Stream
          </a>
        <?php endif; ?>

        <a href="admin/index.php" class="btn btn-admin">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Admin Dashboard
        </a>
      </div>
    </div>
  </header>

  <!-- Main Body -->
  <main>
    <div class="stream-grid">
      <!-- Left Column: Video Surface -->
      <div class="viewport-card">
        <div class="viewport-header">
          <div class="viewport-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2.5">
              <rect x="2" y="3" width="20" height="14" rx="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            Live Game Surface
          </div>
          <div class="view-toggle">
            <button id="btn-toggle-game" class="active" onclick="switchView('game')">Live Game Engine</button>
            <?php if (!empty($videoId)): ?>
              <button id="btn-toggle-yt" onclick="switchView('youtube')">YouTube Stream</button>
            <?php endif; ?>
          </div>
        </div>

        <div class="video-aspect">
          <!-- Game Canvas Frame -->
          <iframe id="game-frame" src="game/index.html?preview=1" allow="autoplay; audio"></iframe>
          
          <!-- Optional YouTube Stream Frame -->
          <?php if (!empty($videoId)): ?>
            <iframe id="yt-frame" src="https://www.youtube.com/embed/<?= htmlspecialchars($videoId) ?>?autoplay=1&mute=0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" style="display: none;"></iframe>
          <?php endif; ?>
        </div>

        <div class="viewport-footer">
          <div class="stream-meta">
            <h1><?= htmlspecialchars($videoTitle) ?></h1>
            <p>Direct Autonomous Server Broadcast &bull; 1080p 60fps &bull; Powered by PHP, MySQL &amp; FFmpeg</p>
          </div>
          <div>
            <span style="font-size: 12px; font-weight: 700; color: var(--text-muted); background: #F1F5F9; padding: 6px 12px; border-radius: 6px;">
              Engine: HTML5 Canvas 3D
            </span>
          </div>
        </div>
      </div>

      <!-- Right Column: How to Play & Stats -->
      <div class="sidebar">
        <!-- How To Play -->
        <div class="card">
          <div class="card-title">
            <span>🎮 How to Play via Live Chat</span>
            <span style="font-size: 11px; font-weight: 700; color: var(--blue); background: var(--blue-light); padding: 2px 8px; border-radius: 4px;">
              <?= strtoupper(htmlspecialchars($streamMode)) ?> MODE
            </span>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
            Type any of the following commands in the YouTube Live stream chat to control the stickman runner in real-time:
          </p>

          <div class="commands-container">
            <div class="command-box">
              <span class="command-key">LEFT &nbsp;<span style="color: #94A3B8;">or 1</span></span>
              <span class="command-desc">Move Left Lane</span>
            </div>
            <div class="command-box">
              <span class="command-key" style="color: var(--green);">JUMP &nbsp;<span style="color: #94A3B8;">or 2</span></span>
              <span class="command-desc">Leap Obstacles</span>
            </div>
            <div class="command-box">
              <span class="command-key" style="color: var(--amber);">RIGHT &nbsp;<span style="color: #94A3B8;">or 3</span></span>
              <span class="command-desc">Move Right Lane</span>
            </div>
          </div>

          <!-- Real-Time Voting Bar -->
          <div class="vote-bar-card">
            <div class="vote-bar-header">
              <span>Live Chat Vote Distribution</span>
              <span id="vote-total-count">0 votes</span>
            </div>
            <div class="vote-track">
              <div id="vote-bar-left" class="vote-segment left" style="width: 33.3%;"></div>
              <div id="vote-bar-jump" class="vote-segment jump" style="width: 33.3%;"></div>
              <div id="vote-bar-right" class="vote-segment right" style="width: 33.4%;"></div>
            </div>
            <div class="vote-legend">
              <div class="vote-legend-item">
                <span class="legend-indicator" style="background: #0284C7;"></span>
                <span>LEFT: <span id="pct-left">33%</span></span>
              </div>
              <div class="vote-legend-item">
                <span class="legend-indicator" style="background: #059669;"></span>
                <span>JUMP: <span id="pct-jump">33%</span></span>
              </div>
              <div class="vote-legend-item">
                <span class="legend-indicator" style="background: #D97706;"></span>
                <span>RIGHT: <span id="pct-right">34%</span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Leaderboard -->
        <div class="card">
          <div class="card-title">
            <span>🏆 Top Chat MVPs</span>
            <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Points &amp; Actions</span>
          </div>

          <table class="leaderboard-table">
            <thead>
              <tr>
                <th style="width: 32px;">#</th>
                <th>Viewer</th>
                <th style="text-align: right;">Score</th>
              </tr>
            </thead>
            <tbody id="leaderboard-tbody">
              <?php if (empty($topViewers)): ?>
                <tr>
                  <td colspan="3" style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 20px 0;">
                    Waiting for first live chat commands...
                  </td>
                </tr>
              <?php else: ?>
                <?php foreach ($topViewers as $idx => $v): ?>
                  <tr>
                    <td class="rank-cell top-<?= $idx + 1 ?>">#<?= $idx + 1 ?></td>
                    <td><?= htmlspecialchars($v['username']) ?></td>
                    <td style="text-align: right;">
                      <span class="score-badge"><?= number_format($v['score']) ?> pts</span>
                    </td>
                  </tr>
                <?php endforeach; ?>
              <?php endif; ?>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- System Highlights Section -->
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon" style="background: #E0F2FE; color: #0284C7;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="2" y="2" width="20" height="8" rx="2"></rect>
            <rect x="2" y="14" width="20" height="8" rx="2"></rect>
            <line x1="6" y1="6" x2="6.01" y2="6"></line>
            <line x1="6" y1="18" x2="6.01" y2="18"></line>
          </svg>
        </div>
        <div class="feature-title">Autonomous Server Broadcast</div>
        <div class="feature-desc">
          Zero OBS or desktop streaming software required. The headless engine and FFmpeg pipe video and audio directly from your server 24/7.
        </div>
      </div>

      <div class="feature-card">
        <div class="feature-icon" style="background: #D1FAE5; color: #059669;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div class="feature-title">Real-Time Chat Telemetry</div>
        <div class="feature-desc">
          High-performance polling ingests viewer chat commands at sub-second speeds, tracking individual scores and command velocities in MySQL.
        </div>
      </div>

      <div class="feature-card">
        <div class="feature-icon" style="background: #FEF3C7; color: #D97706;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </div>
        <div class="feature-title">Setup Wizard &amp; Control Suite</div>
        <div class="feature-desc">
          Automated multi-step configuration for database, credentials, and YouTube RTMP stream keys with 1-click start/stop streaming controls.
        </div>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer>
    <div class="footer-inner">
      <div>
        &copy; <?= date('Y') ?> Stickman Live Runner &bull; Autonomous Server-Streamed Interactive Game
      </div>
      <div style="display: flex; gap: 16px;">
        <a href="admin/index.php" style="color: var(--blue); text-decoration: none; font-weight: 600;">Control Dashboard</a>
        <a href="setup.php" style="color: var(--text-muted); text-decoration: none;">Setup Wizard</a>
      </div>
    </div>
  </footer>

  <script>
    function switchView(view) {
      const gameFrame = document.getElementById('game-frame');
      const ytFrame = document.getElementById('yt-frame');
      const btnGame = document.getElementById('btn-toggle-game');
      const btnYt = document.getElementById('btn-toggle-yt');

      if (view === 'game') {
        gameFrame.style.display = 'block';
        if (ytFrame) ytFrame.style.display = 'none';
        btnGame.classList.add('active');
        if (btnYt) btnYt.classList.remove('active');
      } else {
        gameFrame.style.display = 'none';
        if (ytFrame) ytFrame.style.display = 'block';
        if (btnYt) btnYt.classList.add('active');
        btnGame.classList.remove('active');
      }
    }

    // Live Voting & Leaderboard Poller
    async function updateLiveMetrics() {
      try {
        const res = await fetch('api/chat.php');
        if (!res.ok) return;
        const data = await res.json();
        
        if (data && data.tallies) {
          const l = data.tallies.LEFT || 0;
          const j = data.tallies.JUMP || 0;
          const r = data.tallies.RIGHT || 0;
          const total = l + j + r;

          document.getElementById('vote-total-count').innerText = `${total} votes`;

          if (total > 0) {
            const pL = Math.round((l / total) * 100);
            const pJ = Math.round((j / total) * 100);
            const pR = 100 - pL - pJ;

            document.getElementById('vote-bar-left').style.width = pL + '%';
            document.getElementById('vote-bar-jump').style.width = pJ + '%';
            document.getElementById('vote-bar-right').style.width = pR + '%';

            document.getElementById('pct-left').innerText = pL + '%';
            document.getElementById('pct-jump').innerText = pJ + '%';
            document.getElementById('pct-right').innerText = pR + '%';
          }
        }

        if (data && data.leaderboard && data.leaderboard.length > 0) {
          const tbody = document.getElementById('leaderboard-tbody');
          let html = '';
          data.leaderboard.slice(0, 5).forEach((item, idx) => {
            html += `<tr>
              <td class="rank-cell top-${idx + 1}">#${idx + 1}</td>
              <td>${escapeHtml(item.username)}</td>
              <td style="text-align: right;">
                <span class="score-badge">${Number(item.score).toLocaleString()} pts</span>
              </td>
            </tr>`;
          });
          tbody.innerHTML = html;
        }
      } catch (err) {
        // Silent fail on network error
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.innerText = text;
      return div.innerHTML;
    }

    setInterval(updateLiveMetrics, 3000);
    updateLiveMetrics();
  </script>
</body>
</html>
