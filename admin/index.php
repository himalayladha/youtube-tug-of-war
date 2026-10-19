<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

requireAdminAuth();

$pdo = getDbConnection();
$settings = getAllSettings($pdo);
$adminUser = $_SESSION['admin_user'] ?? 'admin';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard - YouTube Live Runner</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #F8FAFC;
      --card-bg: rgba(255, 255, 255, 0.95);
      --border: rgba(15, 23, 42, 0.09);
      --text: #0F172A;
      --text-muted: #64748B;
      --blue: #0284C7;
      --blue-hover: #0369A1;
      --green: #059669;
      --green-hover: #047857;
      --red: #E11D48;
      --red-hover: #BE123C;
      --amber: #D97706;
      --shadow: 0 10px 25px -4px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.03);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
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
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      font-weight: 900;
      color: var(--text);
    }
    .user-nav {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 800;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 8px; }
    .btn-primary { background: var(--blue); color: #FFF; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.2); }
    .btn-primary:hover { background: var(--blue-hover); }
    .btn-success { background: var(--green); color: #FFF; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25); font-size: 16px; padding: 14px 28px; }
    .btn-success:hover { background: var(--green-hover); }
    .btn-danger { background: var(--red); color: #FFF; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25); font-size: 16px; padding: 14px 28px; }
    .btn-danger:hover { background: var(--red-hover); }
    .btn-outline { background: #FFFFFF; border: 1px solid var(--border); color: var(--text); }
    .btn-outline:hover { background: #F1F5F9; }

    main {
      max-width: 1380px;
      width: 100%;
      margin: 28px auto;
      padding: 0 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Hero Stream Controller Card */
    .hero-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      backdrop-filter: blur(16px);
      border-radius: 20px;
      padding: 32px 36px;
      box-shadow: var(--shadow);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 24px;
    }
    .stream-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 8px 18px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .status-live {
      background: #D1FAE5;
      color: var(--green);
      border: 1px solid #A7F3D0;
    }
    .status-offline {
      background: #FFE4E6;
      color: var(--red);
      border: 1px solid #FECDD3;
    }
    .status-dot {
      width: 10px;
      height: 10px;
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
    }
    .metric-card {
      background: #FFFFFF;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px 22px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .metric-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-muted);
    }
    .metric-value {
      font-size: 26px;
      font-weight: 900;
      color: var(--text);
    }

    /* Split Section: Preview + Console */
    .split-section {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 24px;
    }
    @media (max-width: 1024px) {
      .split-section { grid-template-columns: 1fr; }
    }

    .preview-card {
      background: #FFFFFF;
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 20px;
      box-shadow: var(--shadow);
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
      background: #0F172A;
      color: #F8FAFC;
      border-radius: 20px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow);
    }
    .console-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 8px;
    }
    .console-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #94A3B8;
    }
    .console-output {
      font-family: monospace;
      font-size: 12px;
      color: #E2E8F0;
      background: #020617;
      padding: 14px;
      border-radius: 10px;
      height: 380px;
      overflow-y: auto;
      white-space: pre-wrap;
      line-height: 1.5;
    }

    /* Settings Modal */
    .modal-backdrop {
      display: none;
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(6px);
      z-index: 9999;
      align-items: center;
      justify-content: center;
    }
    .modal-card {
      background: #FFF;
      border-radius: 20px;
      padding: 32px;
      max-width: 540px;
      width: 90%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <span style="font-size: 24px;">🎮</span>
      <span>YouTube Live Runner <span style="font-size: 12px; font-weight: 600; color: var(--text-muted);">(Server Controller)</span></span>
    </div>
    <div class="user-nav">
      <span style="font-size: 13px; font-weight: 700; color: var(--text-muted);">Admin: <b style="color: var(--text);"><?= htmlspecialchars($adminUser) ?></b></span>
      <a href="logout.php" class="btn btn-outline btn-sm">Sign Out</a>
    </div>
  </header>

  <main>
    <!-- Hero Stream Control Card -->
    <div class="hero-card">
      <div>
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 8px;">
          <h2 style="font-size: 24px; font-weight: 900;">Autonomous Server Streamer</h2>
          <div id="stream_status_badge" class="stream-status-pill status-offline">
            <span class="status-dot"></span>
            <span id="stream_status_text">OFFLINE</span>
          </div>
        </div>
        <p style="font-size: 14px; color: var(--text-muted);">Broadcasts directly to YouTube RTMP 24/7. No OBS or personal computer needed.</p>
      </div>

      <div style="display: flex; gap: 14px; align-items: center;">
        <button id="btn_start_stream" class="btn btn-success" onclick="startStream()">
          ▶ Start Streaming
        </button>
        <button id="btn_stop_stream" class="btn btn-danger" style="display: none;" onclick="stopStream()">
          ⏹ Stop Streaming
        </button>
        <button class="btn btn-outline" onclick="openSettingsModal()">
          ⚙️ Settings
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
        <span id="metric_velocity" class="metric-value" style="color: var(--blue);">0 msgs/s</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">ACTIVE MODE</span>
        <span id="metric_mode" class="metric-value" style="color: var(--amber);">Auto</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">YOUTUBE API STATUS</span>
        <span id="metric_yt_status" class="metric-value" style="font-size: 18px; color: var(--green);">Connected</span>
      </div>
    </div>

    <!-- Split Section: Game Preview & Stream Logs -->
    <div class="split-section">
      <!-- Live Game Preview -->
      <div class="preview-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 14px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">Live Game Surface Preview</h3>
          <span style="font-size: 12px; color: var(--text-muted);">1080p 60FPS</span>
        </div>
        <div class="preview-frame">
          <iframe id="preview_frame" src="../game/index.html?preview=1"></iframe>
        </div>
      </div>

      <!-- Real-Time Stream Console Logs -->
      <div class="console-card">
        <div class="console-header">
          <span class="console-title">Live Server Stream Logs</span>
          <button class="btn btn-sm btn-outline" style="background: transparent; color: #94A3B8; border-color: rgba(255,255,255,0.2);" onclick="fetchLogs()">Refresh</button>
        </div>
        <div id="console_output" class="console-output">[System] Waiting for stream activation...</div>
      </div>
    </div>
  </main>

  <!-- Quick Settings Modal -->
  <div id="settings_modal" class="modal-backdrop">
    <div class="modal-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
        <h3 style="font-size: 18px; font-weight: 800;">⚙️ Stream Configuration</h3>
        <button class="btn btn-sm btn-outline" onclick="closeSettingsModal()">✕</button>
      </div>
      <form id="settings_form" onsubmit="saveSettings(event)">
        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-muted); margin-bottom: 5px;">YOUTUBE STREAM KEY (RTMP)</label>
          <input type="password" id="modal_yt_stream_key" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border);" required>
        </div>
        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-muted); margin-bottom: 5px;">YOUTUBE DATA API KEY</label>
          <input type="password" id="modal_yt_api_key" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border);">
        </div>
        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-muted); margin-bottom: 5px;">LIVE VIDEO ID</label>
          <input type="text" id="modal_yt_video_id" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border);" placeholder="e.g. dQw4w9WgXcQ">
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn btn-outline" onclick="closeSettingsModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Settings</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let isStreaming = false;
    let streamStartTime = null;

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
        }

        if (data.metrics) {
          document.getElementById('metric_velocity').textContent = `${data.metrics.velocity || 0} msgs/s`;
          document.getElementById('metric_mode').textContent = data.metrics.mode || 'Auto';
        }
      } catch (err) {
        console.error('Status check error:', err);
      }
    }

    async function startStream() {
      if (!confirm('Start streaming directly to YouTube Live?')) return;
      try {
        const res = await fetch('../api/stream.php?action=start', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          checkStreamStatus();
          fetchLogs();
        } else {
          alert('Failed to start stream: ' + data.error);
        }
      } catch (err) {
        alert('Network error starting stream.');
      }
    }

    async function stopStream() {
      if (!confirm('Are you sure you want to stop the live stream?')) return;
      try {
        const res = await fetch('../api/stream.php?action=stop', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          checkStreamStatus();
          fetchLogs();
        } else {
          alert('Failed to stop stream: ' + data.error);
        }
      } catch (err) {
        alert('Network error stopping stream.');
      }
    }

    async function fetchLogs() {
      try {
        const res = await fetch('../api/stream.php?action=logs');
        const data = await res.json();
        const consoleEl = document.getElementById('console_output');
        if (data.logs) {
          consoleEl.textContent = data.logs;
          consoleEl.scrollTop = consoleEl.scrollHeight;
        }
      } catch (e) {}
    }

    function updateUptime() {
      if (!isStreaming || !streamStartTime) {
        document.getElementById('metric_uptime').textContent = '00:00:00';
        return;
      }
      const diffSec = Math.floor((Date.now() - streamStartTime) / 1000);
      const h = String(Math.floor(diffSec / 3600)).padStart(2, '0');
      const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
      const s = String(diffSec % 60).padStart(2, '0');
      document.getElementById('metric_uptime').textContent = `${h}:${m}:${s}`;
    }

    async function openSettingsModal() {
      const res = await fetch('../api/settings.php');
      const data = await res.json();
      if (data.settings) {
        document.getElementById('modal_yt_stream_key').value = data.settings.yt_stream_key || '';
        document.getElementById('modal_yt_api_key').value = data.settings.yt_api_key || '';
        document.getElementById('modal_yt_video_id').value = data.settings.yt_video_id || '';
      }
      document.getElementById('settings_modal').style.display = 'flex';
    }

    function closeSettingsModal() {
      document.getElementById('settings_modal').style.display = 'none';
    }

    async function saveSettings(e) {
      e.preventDefault();
      const payload = {
        yt_stream_key: document.getElementById('modal_yt_stream_key').value,
        yt_api_key: document.getElementById('modal_yt_api_key').value,
        yt_video_id: document.getElementById('modal_yt_video_id').value,
      };

      const res = await fetch('../api/settings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('Settings saved successfully!');
        closeSettingsModal();
      } else {
        alert('Failed to save settings: ' + data.error);
      }
    }

    // Auto-poll intervals
    setInterval(checkStreamStatus, 3000);
    setInterval(updateUptime, 1000);
    setInterval(fetchLogs, 4000);

    checkStreamStatus();
    fetchLogs();
  </script>
</body>
</html>
