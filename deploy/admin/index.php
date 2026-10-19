<?php
/**
 * The Great Tug-of-War: Black vs White - Autonomous Stream & Arena Admin Suite
 * Multi-tab management for Broadcast Center, Arena & Debate Engine, Public Spectator Panel, Stream Configuration, and Account Security.
 */

session_start();
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

requireAdminAuth();

try {
    $pdo = getDbConnection();
} catch (Exception $e) {
    die("Database Connection Error: " . htmlspecialchars($e->getMessage()));
}

$isSqlite = ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite');
$settings = getAllSettings($pdo);
$adminUser = $_SESSION['admin_user'] ?? 'admin';
$serverHost = $_SERVER['HTTP_HOST'] ?? 'localhost';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Suite - The Great Tug-of-War</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0B0F17;
      --card-bg: rgba(18, 24, 38, 0.95);
      --card-bg-light: #1E293B;
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: #0284C7;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --blue: #0284C7;
      --blue-hover: #0369A1;
      --green: #10B981;
      --green-hover: #059669;
      --red: #F43F5E;
      --red-hover: #E11D48;
      --amber: #F59E0B;
      --shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
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
      background: rgba(15, 23, 42, 0.9);
      border-bottom: 1px solid var(--border);
      padding: 14px 28px;
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(12px);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand-section {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #0284C7, #0369A1);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFF;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
    }
    .brand-title {
      font-family: 'Chakra Petch', sans-serif;
      font-size: 19px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #FFF;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-badge {
      font-size: 10px;
      font-weight: 800;
      background: rgba(2, 132, 199, 0.2);
      border: 1px solid rgba(2, 132, 199, 0.4);
      color: #38BDF8;
      padding: 2px 7px;
      border-radius: 4px;
    }
    .server-pill {
      font-size: 11px;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 4px 10px;
      border-radius: 6px;
    }

    .nav-tabs {
      display: flex;
      gap: 6px;
      background: rgba(11, 15, 23, 0.8);
      padding: 4px;
      border-radius: 12px;
      border: 1px solid var(--border);
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 700;
      color: var(--text-muted);
      background: transparent;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      color: #FFF;
      background: rgba(255, 255, 255, 0.05);
    }
    .tab-btn.active {
      color: #FFF;
      background: var(--blue);
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);
    }

    .user-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 9px 16px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 6px; }
    .btn-primary { background: var(--blue); color: #FFF; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3); }
    .btn-primary:hover { background: var(--blue-hover); }
    .btn-success { background: var(--green); color: #FFF; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
    .btn-success:hover { background: var(--green-hover); }
    .btn-danger { background: var(--red); color: #FFF; box-shadow: 0 4px 12px rgba(244, 63, 94, 0.3); }
    .btn-danger:hover { background: var(--red-hover); }
    .btn-outline { background: rgba(255, 255, 255, 0.05); border-color: var(--border); color: var(--text); }
    .btn-outline:hover { background: rgba(255, 255, 255, 0.1); color: #FFF; }

    main {
      max-width: 1380px;
      width: 100%;
      margin: 28px auto;
      padding: 0 24px;
      flex: 1;
    }

    .tab-content {
      display: none;
      animation: fadeIn 0.2s ease-in-out;
    }
    .tab-content.active {
      display: block;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 26px 30px;
      box-shadow: var(--shadow);
      margin-bottom: 24px;
    }
    .card-title {
      font-size: 17px;
      font-weight: 800;
      color: #FFF;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .card-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 20px;
    }

    /* Broadcast Hero Controller Card */
    .hero-controller {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      background: linear-gradient(135deg, rgba(18, 24, 38, 0.95), rgba(30, 41, 59, 0.8));
    }
    .stream-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 30px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }
    .status-live {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #6EE7B7;
    }
    .status-offline {
      background: rgba(244, 63, 94, 0.15);
      border: 1px solid rgba(244, 63, 94, 0.4);
      color: #FDA4AF;
    }
    .status-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }
    .status-live .status-dot { background: var(--green); box-shadow: 0 0 8px var(--green); animation: pulse 1.5s infinite; }
    .status-offline .status-dot { background: var(--red); }

    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px 22px;
      box-shadow: var(--shadow);
    }
    .metric-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-muted);
      margin-bottom: 6px;
      display: block;
    }
    .metric-value {
      font-size: 24px;
      font-weight: 900;
      color: #FFF;
    }

    /* Split Section: Preview + Console */
    .split-section {
      display: grid;
      grid-template-columns: 1.25fr 0.75fr;
      gap: 24px;
    }
    @media (max-width: 1024px) {
      .split-section { grid-template-columns: 1fr; }
    }

    .preview-frame {
      width: 100%;
      aspect-ratio: 16 / 9;
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      background: #000;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    .console-card {
      background: #050811;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
    }
    .console-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .console-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #94A3B8;
    }
    .console-output {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      color: #CBD5E1;
      background: #02040A;
      padding: 14px;
      border-radius: 10px;
      height: 380px;
      overflow-y: auto;
      white-space: pre-wrap;
      line-height: 1.5;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }

    /* Form Controls */
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }
    .form-group {
      margin-bottom: 18px;
    }
    label {
      display: block;
      font-size: 11px;
      font-weight: 800;
      color: var(--text-muted);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    input[type="text"], input[type="password"], select, textarea {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid var(--border);
      background: rgba(11, 15, 23, 0.7);
      border-radius: 10px;
      font-size: 14px;
      font-family: inherit;
      color: #FFF;
      outline: none;
      transition: all 0.2s ease;
    }
    input:focus, select:focus, textarea:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2);
      background: rgba(11, 15, 23, 1);
    }
    textarea { resize: vertical; min-height: 90px; }

    .radio-pill-group {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 18px;
    }
    .radio-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      border-radius: 10px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
      color: var(--text-muted);
      transition: all 0.15s ease;
    }
    .radio-pill input { display: none; }
    .radio-pill.selected {
      background: rgba(2, 132, 199, 0.15);
      border-color: var(--blue);
      color: #FFF;
    }

    /* Live Topic Spotlight Banner */
    .spotlight-banner {
      background: linear-gradient(90deg, #18181B 0%, #0F172A 50%, #1E293B 100%);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 24px;
    }
    .spotlight-team {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .spotlight-badge {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Chakra Petch', sans-serif;
      font-size: 18px;
      font-weight: 900;
    }
    .badge-black { background: #000; color: #FFF; border: 1px solid #333; }
    .badge-white { background: #FFF; color: #000; border: 1px solid #DDD; }
    .spotlight-name {
      font-family: 'Chakra Petch', sans-serif;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }

    /* Toast Notification */
    #toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 14px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      color: #FFF;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 10px;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #toast.show {
      transform: translateY(0);
      opacity: 1;
    }
    #toast.toast-success { background: #065F46; border: 1px solid #10B981; }
    #toast.toast-error { background: #881337; border: 1px solid #F43F5E; }
  </style>
</head>
<body>

  <!-- Top Navigation Header -->
  <header>
    <div class="brand-section">
      <div class="brand-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <div>
        <div class="brand-title">
          Tug-of-War <span class="brand-badge">ADMIN SUITE</span>
        </div>
      </div>
      <span class="server-pill"><?= htmlspecialchars($serverHost) ?> &bull; <?= $isSqlite ? 'SQLite' : 'MySQL' ?></span>
    </div>

    <!-- Tab Buttons -->
    <nav class="nav-tabs">
      <button class="tab-btn active" onclick="switchTab('broadcast')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>
        <span>Broadcast</span>
      </button>
      <button class="tab-btn" onclick="switchTab('arena')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="17" x2="4" y2="20"/><line x1="3" y1="19" x2="5" y2="21"/></svg>
        <span>Arena &amp; Debate</span>
      </button>
      <button class="tab-btn" onclick="switchTab('public')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        <span>Public Panel</span>
      </button>
      <button class="tab-btn" onclick="switchTab('stream')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span>Stream Config</span>
      </button>
      <button class="tab-btn" onclick="switchTab('security')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span>Security</span>
      </button>
    </nav>

    <!-- User & Quick Nav -->
    <div class="user-actions">
      <a href="../index.php" target="_blank" class="btn btn-outline btn-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        <span>Public Hub</span>
      </a>
      <a href="logout.php" class="btn btn-outline btn-sm" style="color: #FDA4AF; border-color: rgba(244, 63, 94, 0.3);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span>Sign Out</span>
      </a>
    </div>
  </header>

  <main>

    <!-- ======================================================== -->
    <!-- TAB 1: BROADCAST CENTER                                  -->
    <!-- ======================================================== -->
    <section id="tab-broadcast" class="tab-content active">
      <!-- Hero Stream Controller -->
      <div class="card hero-controller">
        <div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
            <h2 style="font-size: 22px; font-weight: 900;">Server Stream Broadcast Engine</h2>
            <div id="stream_status_badge" class="stream-status-pill status-offline">
              <span class="status-dot"></span>
              <span id="stream_status_text">OFFLINE</span>
            </div>
          </div>
          <p style="font-size: 13px; color: var(--text-muted);">
            Broadcasts directly to YouTube RTMP 24/7 without OBS. Runs on Termux (Android) or Linux VPS.
          </p>
        </div>

        <div style="display: flex; gap: 12px; align-items: center;">
          <button id="btn_start_stream" class="btn btn-success" onclick="startStream()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Start Streaming</span>
          </button>
          <button id="btn_stop_stream" class="btn btn-danger" style="display: none;" onclick="stopStream()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            <span>Stop Streaming</span>
          </button>
        </div>
      </div>

      <!-- Live Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-label">STREAM UPTIME</span>
          <span id="metric_uptime" class="metric-value">00:00:00</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">CHAT VELOCITY</span>
          <span id="metric_velocity" class="metric-value" style="color: #38BDF8;">0 msgs/s</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">OUTPUT RESOLUTION</span>
          <span id="metric_res" class="metric-value" style="font-size: 20px;">1080p 60FPS</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">YOUTUBE API / CHAT</span>
          <span id="metric_api_status" class="metric-value" style="font-size: 20px; color: #34D399;">Active</span>
        </div>
      </div>

      <!-- Split Section: Game Preview & Stream Logs -->
      <div class="split-section">
        <!-- Live Game Preview -->
        <div class="card" style="padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              Live In-Stream Canvas Surface
            </h3>
            <button class="btn btn-sm btn-outline" onclick="reloadPreview()">Reload Canvas</button>
          </div>
          <div class="preview-frame">
            <iframe id="preview_frame" src="../game/index.html?v=fit" allow="autoplay; audio"></iframe>
          </div>
        </div>

        <!-- Real-Time Stream Console Logs -->
        <div class="console-card">
          <div class="console-header">
            <span class="console-title">Server Stream Logs</span>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-sm btn-outline" onclick="fetchLogs()">Refresh</button>
              <button class="btn btn-sm btn-outline" onclick="clearConsole()">Clear</button>
            </div>
          </div>
          <div id="console_output" class="console-output">[System] Waiting for stream activation or log stream...</div>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- TAB 2: ARENA & DEBATE TOPIC CONTROL                      -->
    <!-- ======================================================== -->
    <section id="tab-arena" class="tab-content">
      <!-- Active Topic Spotlight -->
      <div class="spotlight-banner">
        <div>
          <span style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.6px; display: block; margin-bottom: 6px;">
            Current Live Debate Battle
          </span>
          <div style="display: flex; align-items: center; gap: 20px;">
            <div class="spotlight-team">
              <div class="spotlight-badge badge-black">1</div>
              <div>
                <span style="font-size: 11px; color: #94A3B8; font-weight: 700;">TEAM BLACK</span>
                <div id="spotlight_left" class="spotlight-name">ANDROID</div>
              </div>
            </div>
            <span style="font-family: 'Chakra Petch', sans-serif; font-size: 20px; font-weight: 900; color: #F59E0B;">VS</span>
            <div class="spotlight-team">
              <div class="spotlight-badge badge-white">2</div>
              <div>
                <span style="font-size: 11px; color: #94A3B8; font-weight: 700;">TEAM WHITE</span>
                <div id="spotlight_right" class="spotlight-name">IPHONE</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Score Counters -->
        <div style="display: flex; gap: 16px; align-items: center;">
          <div style="text-align: center; background: rgba(0,0,0,0.4); padding: 10px 18px; border-radius: 12px; border: 1px solid var(--border);">
            <span style="font-size: 10px; font-weight: 800; color: var(--text-muted); display: block;">BLACK WINS</span>
            <span id="spotlight_wins_black" style="font-size: 24px; font-weight: 900; color: #FFF;">0</span>
          </div>
          <div style="text-align: center; background: rgba(0,0,0,0.4); padding: 10px 18px; border-radius: 12px; border: 1px solid var(--border);">
            <span style="font-size: 10px; font-weight: 800; color: var(--text-muted); display: block;">WHITE WINS</span>
            <span id="spotlight_wins_white" style="font-size: 24px; font-weight: 900; color: #FFF;">0</span>
          </div>
        </div>
      </div>

      <!-- Change Live Debate Topic Card -->
      <div class="card">
        <div class="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/></svg>
          Push New Debate Topic to Live Stream
        </div>
        <p class="card-desc">Instantly updates the debate topic shown in the broadcast and on the public spectator panel without restarting the stream.</p>

        <form id="topic_form" onsubmit="pushTopic(event)">
          <div class="radio-pill-group">
            <label id="pill_mode_preset" class="radio-pill selected" onclick="selectTopicMode('preset')">
              <input type="radio" name="topic_mode" value="preset" checked>
              <span>Quick Presets (20 Relatable Debates)</span>
            </label>
            <label id="pill_mode_custom" class="radio-pill" onclick="selectTopicMode('custom')">
              <input type="radio" name="topic_mode" value="custom">
              <span>Custom Debate Topic (Any Keywords)</span>
            </label>
          </div>

          <!-- Preset Selector -->
          <div id="section_preset" style="margin-bottom: 20px;">
            <label>Select Curated Debate Topic</label>
            <select id="preset_topic_select">
              <option value="0">#1: ANDROID vs IPHONE</option>
              <option value="1">#2: INTROVERT vs EXTROVERT</option>
              <option value="2">#3: DOGS vs CATS</option>
              <option value="3">#4: COFFEE vs TEA</option>
              <option value="4">#5: NIGHT OWL vs EARLY BIRD</option>
              <option value="5">#6: PIZZA vs BURGERS</option>
              <option value="6">#7: WORK FROM HOME vs OFFICE</option>
              <option value="7">#8: SUMMER vs WINTER</option>
              <option value="8">#9: TEXTING vs CALLING</option>
              <option value="9">#10: MONEY vs FREE TIME</option>
              <option value="10">#11: PLAYSTATION vs XBOX</option>
              <option value="11">#12: MOVIES vs SERIES</option>
              <option value="12">#13: BEACH vs MOUNTAINS</option>
              <option value="13">#14: SWEET vs SPICY</option>
              <option value="14">#15: INSTAGRAM vs TIKTOK</option>
              <option value="15">#16: CHESS vs VIDEO GAMES</option>
              <option value="16">#17: NETFLIX vs YOUTUBE</option>
              <option value="18">#18: BOOKS vs PODCASTS</option>
              <option value="19">#19: CARS vs MOTORBIKES</option>
              <option value="19">#20: SOLO TRAVEL vs GROUP TRIP</option>
            </select>
          </div>

          <!-- Custom Topic Inputs -->
          <div id="section_custom" style="display: none; margin-bottom: 20px;">
            <div class="form-grid">
              <div>
                <label>Team Black Topic (Pull Left / Vote 1)</label>
                <input type="text" id="custom_topic_left" placeholder="e.g. SPACEX, REAL MADRID, PC GAMING">
              </div>
              <div>
                <label>Team White Topic (Pull Right / Vote 2)</label>
                <input type="text" id="custom_topic_right" placeholder="e.g. NASA, BARCELONA, CONSOLE">
              </div>
            </div>
          </div>

          <button type="submit" class="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>Push Topic Live to Arena</span>
          </button>
        </form>
      </div>

      <!-- Match Score & Leaderboard Resets -->
      <div class="card">
        <div class="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          Arena Match Resets
        </div>
        <p class="card-desc">Reset match victories or clear viewer leaderboard points between stream sessions.</p>

        <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
          <button class="btn btn-outline" onclick="resetArenaScores(true, false, false)">
            <span>Reset Round Score (0 - 0)</span>
          </button>
          <button class="btn btn-danger" onclick="resetArenaScores(true, true, true)">
            <span>Reset Match + Clear Leaderboard &amp; Chat History</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- TAB 3: PUBLIC SPECTATOR PANEL MANAGER                    -->
    <!-- ======================================================== -->
    <section id="tab-public" class="tab-content">
      <div class="card">
        <div class="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          Public Spectator Panel Configuration
        </div>
        <p class="card-desc">Customize what visitors see on the public landing page (<code>/</code> and <code>/index.php</code>).</p>

        <form id="public_panel_form" onsubmit="savePublicPanel(event)">
          <!-- Announcement Banner -->
          <div class="form-group">
            <label>Live Urgent Announcement Banner</label>
            <input type="text" id="panel_announcement_banner" placeholder="e.g. 🔥 ROUND 3 STARTING NOW! TYPE 1 FOR DOGS, 2 FOR CATS! 🔥">
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">Appears as a prominent pulsating top alert on the spectator page.</p>
          </div>

          <div class="form-group" style="display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" id="panel_announcement_active" style="width: 18px; height: 18px;">
            <label for="panel_announcement_active" style="margin-bottom: 0; cursor: pointer;">Enable Announcement Banner on Public Page</label>
          </div>

          <div class="form-group" style="display: flex; align-items: center; gap: 10px; margin-top: 14px;">
            <input type="checkbox" id="panel_show_video_embed" style="width: 18px; height: 18px;">
            <label for="panel_show_video_embed" style="margin-bottom: 0; cursor: pointer;">Enable YouTube Live Video Player Embed Tab</label>
          </div>

          <div class="form-group" style="margin-top: 18px;">
            <label>Public Site Title &amp; Heading</label>
            <input type="text" id="panel_site_title" placeholder="The Great Tug-of-War: Black vs White (With vs Against)">
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top: 10px;">
            <span>Save Public Panel Settings</span>
          </button>
        </form>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- TAB 4: STREAM BROADCAST CONFIGURATION                    -->
    <!-- ======================================================== -->
    <section id="tab-stream" class="tab-content">
      <div class="card">
        <div class="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          YouTube Live &amp; Broadcast Engine Credentials
        </div>
        <p class="card-desc">Configure your RTMP ingest destination and YouTube Data API key for live chat polling.</p>

        <form id="stream_config_form" onsubmit="saveStreamConfig(event)">
          <div class="form-group">
            <label>YouTube RTMP Stream Key</label>
            <div style="position: relative;">
              <input type="password" id="cfg_yt_stream_key" placeholder="Enter new stream key to update (leave blank to keep current)">
              <button type="button" class="btn btn-sm btn-outline" style="position: absolute; right: 8px; top: 8px;" onclick="toggleSecretVisibility('cfg_yt_stream_key')">👁️</button>
            </div>
            <p id="cfg_stream_key_status" style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">Current key: (Loading...)</p>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>YouTube Data API Key (v3)</label>
              <input type="password" id="cfg_yt_api_key" placeholder="AIzaSy...">
            </div>
            <div class="form-group">
              <label>Live Video ID</label>
              <input type="text" id="cfg_yt_video_id" placeholder="e.g. dQw4w9WgXcQ">
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>Broadcast Resolution</label>
              <select id="cfg_stream_resolution">
                <option value="1920x1080">1920x1080 (1080p FHD)</option>
                <option value="1280x720">1280x720 (720p HD)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Target Bitrate</label>
              <select id="cfg_stream_bitrate">
                <option value="4500k">4500 kbps (Recommended for 1080p)</option>
                <option value="2500k">2500 kbps (Recommended for 720p / Mobile)</option>
                <option value="6000k">6000 kbps (High Fidelity)</option>
              </select>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top: 10px;">
            <span>Save Stream Broadcast Credentials</span>
          </button>
        </form>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- TAB 5: SECURITY & ACCOUNT                                -->
    <!-- ======================================================== -->
    <section id="tab-security" class="tab-content">
      <div class="card">
        <div class="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Administrator Account Security
        </div>
        <p class="card-desc">Update your admin username and master password. Passwords are encrypted with bcrypt.</p>

        <form id="security_form" onsubmit="saveCredentials(event)">
          <div class="form-group">
            <label>Admin Username</label>
            <input type="text" id="sec_admin_username" value="<?= htmlspecialchars($adminUser) ?>" required>
          </div>

          <div class="form-group">
            <label>Current Master Password (Required to make changes)</label>
            <input type="password" id="sec_old_password" required>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>New Password (Leave blank to keep current)</label>
              <input type="password" id="sec_new_password" placeholder="At least 6 characters">
            </div>
            <div class="form-group">
              <label>Confirm New Password</label>
              <input type="password" id="sec_new_password_confirm" placeholder="Repeat new password">
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top: 10px;">
            <span>Update Admin Credentials</span>
          </button>
        </form>
      </div>

      <!-- Server & Environment Diagnostics -->
      <div class="card">
        <div class="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
          Hosting &amp; Environment Diagnostics
        </div>
        <div class="form-grid">
          <div>
            <span class="metric-label">DATABASE ENGINE</span>
            <span style="font-size: 15px; font-weight: 700; color: #FFF;"><?= $isSqlite ? 'SQLite (Zero-Config / Termux / Android)' : 'MySQL / MariaDB' ?></span>
          </div>
          <div>
            <span class="metric-label">PHP RUNTIME</span>
            <span style="font-size: 15px; font-weight: 700; color: #FFF;"><?= PHP_VERSION ?> on <?= PHP_OS ?></span>
          </div>
          <div>
            <span class="metric-label">SETUP WIZARD STATUS</span>
            <span style="font-size: 15px; font-weight: 700; color: #34D399;">Locked &amp; Secured (db_installed = 1)</span>
          </div>
        </div>
      </div>
    </section>

  </main>

  <!-- Floating Toast Notification -->
  <div id="toast"></div>

  <script>
    let isStreaming = false;
    let streamStartTime = null;

    // Toast Notification Utility
    function showToast(type, message) {
      const toast = document.getElementById('toast');
      toast.className = `toast-${type} show`;
      toast.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <span>${message}</span>
      `;
      setTimeout(() => {
        toast.className = '';
      }, 4000);
    }

    // Tab Switching
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
      if (activeBtn) activeBtn.classList.add('active');

      const target = document.getElementById(`tab-${tabId}`);
      if (target) target.classList.add('active');
    }

    // Topic Mode Switching (Preset vs Custom)
    function selectTopicMode(mode) {
      const presetPill = document.getElementById('pill_mode_preset');
      const customPill = document.getElementById('pill_mode_custom');
      const presetSec = document.getElementById('section_preset');
      const customSec = document.getElementById('section_custom');

      if (mode === 'preset') {
        presetPill.classList.add('selected');
        customPill.classList.remove('selected');
        presetSec.style.display = 'block';
        customSec.style.display = 'none';
      } else {
        presetPill.classList.remove('selected');
        customPill.classList.add('selected');
        presetSec.style.display = 'none';
        customSec.style.display = 'block';
      }
    }

    // Toggle Secret Visibility
    function toggleSecretVisibility(fieldId) {
      const el = document.getElementById(fieldId);
      if (el) {
        el.type = el.type === 'password' ? 'text' : 'password';
      }
    }

    // Reload Preview Frame
    function reloadPreview() {
      const frame = document.getElementById('preview_frame');
      if (frame) frame.src = '../game/index.html?v=' + Date.now();
    }

    // Clear Console
    function clearConsole() {
      document.getElementById('console_output').textContent = '[Console cleared]';
    }

    // Load Initial Config
    async function loadConfig() {
      try {
        const res = await fetch('../api/admin.php?action=get_config');
        const data = await res.json();
        if (!data.success) return;

        // Arena spotlight
        if (data.arena) {
          if (data.arena.topic_left && data.arena.topic_right) {
            document.getElementById('spotlight_left').textContent = data.arena.topic_left;
            document.getElementById('spotlight_right').textContent = data.arena.topic_right;
          }
          document.getElementById('spotlight_wins_black').textContent = data.arena.wins_black;
          document.getElementById('spotlight_wins_white').textContent = data.arena.wins_white;
          document.getElementById('preset_topic_select').value = data.arena.active_topic_idx;
        }

        // Public Panel settings
        if (data.public_panel) {
          document.getElementById('panel_announcement_banner').value = data.public_panel.announcement_banner || '';
          document.getElementById('panel_announcement_active').checked = data.public_panel.announcement_active;
          document.getElementById('panel_show_video_embed').checked = data.public_panel.show_video_embed;
          document.getElementById('panel_site_title').value = data.public_panel.site_title || '';
        }

        // Stream Config
        if (data.stream) {
          document.getElementById('cfg_yt_video_id').value = data.stream.yt_video_id || '';
          document.getElementById('cfg_stream_resolution').value = data.stream.stream_resolution || '1920x1080';
          document.getElementById('cfg_stream_bitrate').value = data.stream.stream_bitrate || '4500k';
          document.getElementById('metric_res').textContent = `${data.stream.stream_resolution || '1080p'} 60FPS`;
          if (data.stream.yt_stream_key_masked) {
            document.getElementById('cfg_stream_key_status').textContent = `Current key: ${data.stream.yt_stream_key_masked}`;
          }
        }
      } catch (e) {
        console.error('Error loading config:', e);
      }
    }

    // Check Stream Status
    async function checkStreamStatus() {
      try {
        const res = await fetch('../api/stream.php?action=status');
        const data = await res.json();
        isStreaming = data.is_running;

        const badge = document.getElementById('stream_status_badge');
        const text = document.getElementById('stream_status_text');
        const startBtn = document.getElementById('btn_start_stream');
        const stopBtn = document.getElementById('btn_stop_stream');

        if (isStreaming) {
          badge.className = 'stream-status-pill status-live';
          text.textContent = `LIVE (PID: ${data.pid})`;
          startBtn.style.display = 'none';
          stopBtn.style.display = 'inline-flex';
          if (!streamStartTime && data.started_at) {
            streamStartTime = new Date(data.started_at).getTime();
          }
        } else {
          badge.className = 'stream-status-pill status-offline';
          text.textContent = 'OFFLINE';
          startBtn.style.display = 'inline-flex';
          stopBtn.style.display = 'none';
          streamStartTime = null;
          document.getElementById('metric_uptime').textContent = '00:00:00';
        }

        if (data.metrics) {
          document.getElementById('metric_velocity').textContent = `${data.metrics.velocity || 0} msgs/s`;
        }
      } catch (err) {
        console.error('Stream status poll error:', err);
      }
    }

    // Uptime ticker
    setInterval(() => {
      if (isStreaming && streamStartTime) {
        const diff = Math.floor((Date.now() - streamStartTime) / 1000);
        const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
        const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const secs = String(diff % 60).padStart(2, '0');
        document.getElementById('metric_uptime').textContent = `${hrs}:${mins}:${secs}`;
      }
    }, 1000);

    // Fetch Stream Logs
    async function fetchLogs() {
      try {
        const res = await fetch('../api/stream.php?action=logs');
        const data = await res.json();
        if (data.logs !== undefined) {
          const consoleEl = document.getElementById('console_output');
          consoleEl.textContent = data.logs || '[No logs yet]';
          consoleEl.scrollTop = consoleEl.scrollHeight;
        }
      } catch (e) {}
    }

    // Start Stream
    async function startStream() {
      if (!confirm('Start streaming directly to YouTube RTMP from this server?')) return;
      try {
        const res = await fetch('../api/stream.php?action=start', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('success', 'Server stream started successfully!');
          checkStreamStatus();
          fetchLogs();
        } else {
          showToast('error', data.error || 'Failed to start stream.');
        }
      } catch (e) {
        showToast('error', 'Network error starting stream.');
      }
    }

    // Stop Stream
    async function stopStream() {
      if (!confirm('Stop the live stream broadcast?')) return;
      try {
        const res = await fetch('../api/stream.php?action=stop', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('success', 'Stream stopped.');
          checkStreamStatus();
          fetchLogs();
        } else {
          showToast('error', data.error || 'Failed to stop stream.');
        }
      } catch (e) {
        showToast('error', 'Network error stopping stream.');
      }
    }

    // Push Topic Live
    async function pushTopic(e) {
      e.preventDefault();
      const isPreset = document.getElementById('pill_mode_preset').classList.contains('selected');
      const payload = {
        mode: isPreset ? 'preset' : 'custom',
        topic_idx: parseInt(document.getElementById('preset_topic_select').value),
        topic_left: document.getElementById('custom_topic_left').value.trim(),
        topic_right: document.getElementById('custom_topic_right').value.trim()
      };

      try {
        const res = await fetch('../api/admin.php?action=update_topic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast('success', data.message);
          loadConfig();
          reloadPreview();
        } else {
          showToast('error', data.error || 'Failed to push topic.');
        }
      } catch (err) {
        showToast('error', 'Network error updating topic.');
      }
    }

    // Reset Arena Scores
    async function resetArenaScores(resetRounds, clearLb, clearLogs) {
      if (!confirm('Are you sure you want to perform this arena reset?')) return;
      try {
        const res = await fetch('../api/admin.php?action=reset_scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reset_rounds: resetRounds,
            clear_leaderboard: clearLb,
            clear_chat_logs: clearLogs
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast('success', data.message);
          loadConfig();
          reloadPreview();
        } else {
          showToast('error', data.error || 'Failed to reset arena.');
        }
      } catch (e) {
        showToast('error', 'Network error performing reset.');
      }
    }

    // Save Public Spectator Panel Settings
    async function savePublicPanel(e) {
      e.preventDefault();
      const payload = {
        announcement_banner: document.getElementById('panel_announcement_banner').value.trim(),
        announcement_active: document.getElementById('panel_announcement_active').checked ? '1' : '0',
        show_video_embed: document.getElementById('panel_show_video_embed').checked ? '1' : '0',
        public_site_title: document.getElementById('panel_site_title').value.trim()
      };

      try {
        const res = await fetch('../api/admin.php?action=update_public_panel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast('success', data.message);
        } else {
          showToast('error', data.error || 'Failed to update public panel.');
        }
      } catch (err) {
        showToast('error', 'Network error saving public panel settings.');
      }
    }

    // Save Stream Configuration
    async function saveStreamConfig(e) {
      e.preventDefault();
      const payload = {
        yt_stream_key: document.getElementById('cfg_yt_stream_key').value.trim(),
        yt_api_key: document.getElementById('cfg_yt_api_key').value.trim(),
        yt_video_id: document.getElementById('cfg_yt_video_id').value.trim(),
        stream_resolution: document.getElementById('cfg_stream_resolution').value,
        stream_bitrate: document.getElementById('cfg_stream_bitrate').value
      };

      try {
        const res = await fetch('../api/admin.php?action=update_stream_settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast('success', data.message);
          document.getElementById('cfg_yt_stream_key').value = '';
          loadConfig();
        } else {
          showToast('error', data.error || 'Failed to update stream configuration.');
        }
      } catch (err) {
        showToast('error', 'Network error saving stream configuration.');
      }
    }

    // Save Admin Credentials
    async function saveCredentials(e) {
      e.preventDefault();
      const payload = {
        new_username: document.getElementById('sec_admin_username').value.trim(),
        old_password: document.getElementById('sec_old_password').value,
        new_password: document.getElementById('sec_new_password').value,
        new_password_confirm: document.getElementById('sec_new_password_confirm').value
      };

      try {
        const res = await fetch('../api/admin.php?action=change_credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast('success', data.message);
          document.getElementById('sec_old_password').value = '';
          document.getElementById('sec_new_password').value = '';
          document.getElementById('sec_new_password_confirm').value = '';
        } else {
          showToast('error', data.error || 'Failed to update credentials.');
        }
      } catch (err) {
        showToast('error', 'Network error updating credentials.');
      }
    }

    // Initialization
    loadConfig();
    checkStreamStatus();
    fetchLogs();
    setInterval(checkStreamStatus, 3000);
    setInterval(fetchLogs, 5000);
  </script>

</body>
</html>
