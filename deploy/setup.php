<?php
/**
 * YouTube Live Chat Runner - First-Time Setup Wizard
 */

session_start();
require_once __DIR__ . '/includes/db.php';

$configFile = __DIR__ . '/config.php';
$isInstalled = false;

if (file_exists($configFile)) {
    try {
        $pdo = getDbConnection();
        $val = getSetting($pdo, 'db_installed', '0');
        if ($val === '1') {
            $isInstalled = true;
        }
    } catch (Exception $e) {
        // config exists but connection failed, allow re-setup
    }
}

// AJAX endpoint for testing database connection
if (isset($_GET['action']) && $_GET['action'] === 'test_db') {
    header('Content-Type: application/json');
    $host = $_POST['db_host'] ?? 'localhost';
    $port = $_POST['db_port'] ?? '3306';
    $name = $_POST['db_name'] ?? 'youtube_runner';
    $user = $_POST['db_user'] ?? 'root';
    $pass = $_POST['db_pass'] ?? '';

    try {
        // Connect to MySQL server without database first
        $pdo = new PDO("mysql:host={$host};port={$port};charset=utf8mb4", $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        // Create database if not exists
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        // Reconnect with database selected
        $pdo->exec("USE `{$name}`");
        // Run migrations
        runSchemaMigration($pdo, __DIR__ . '/db/schema.sql');

        echo json_encode(['success' => true, 'message' => "Database `{$name}` connected and initialized successfully!"]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

// Handle final form submission
$error = null;
$success = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['finish_setup'])) {
    if ($isInstalled) {
        $error = "System is already installed. To reconfigure, remove config.php.";
    } else {
        $dbHost = trim($_POST['db_host'] ?? 'localhost');
        $dbPort = trim($_POST['db_port'] ?? '3306');
        $dbName = trim($_POST['db_name'] ?? 'youtube_runner');
        $dbUser = trim($_POST['db_user'] ?? 'root');
        $dbPass = $_POST['db_pass'] ?? '';

        $ytApiKey = trim($_POST['yt_api_key'] ?? '');
        $ytStreamKey = trim($_POST['yt_stream_key'] ?? '');
        $ytVideoId = trim($_POST['yt_video_id'] ?? '');
        $streamPreset = $_POST['stream_preset'] ?? '1080p';

        $adminUser = trim($_POST['admin_user'] ?? 'admin');
        $adminPass = $_POST['admin_pass'] ?? '';
        $adminPassConfirm = $_POST['admin_pass_confirm'] ?? '';

        if (empty($adminPass)) {
            $error = "Admin password cannot be empty.";
        } elseif ($adminPass !== $adminPassConfirm) {
            $error = "Admin passwords do not match.";
        } else {
            try {
                // 1. Connect and initialize DB
                $pdo = new PDO("mysql:host={$dbHost};port={$dbPort};charset=utf8mb4", $dbUser, $dbPass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
                ]);
                $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $pdo->exec("USE `{$dbName}`");
                runSchemaMigration($pdo, __DIR__ . '/db/schema.sql');

                // 2. Write config.php
                $configCode = "<?php\nreturn [\n"
                    . "    'db_host' => " . var_export($dbHost, true) . ",\n"
                    . "    'db_port' => " . var_export($dbPort, true) . ",\n"
                    . "    'db_name' => " . var_export($dbName, true) . ",\n"
                    . "    'db_user' => " . var_export($dbUser, true) . ",\n"
                    . "    'db_pass' => " . var_export($dbPass, true) . ",\n"
                    . "    'app_url' => 'http://' . (\$_SERVER['HTTP_HOST'] ?? 'localhost'),\n"
                    . "];\n";
                file_put_contents($configFile, $configCode);

                // 3. Store settings in database
                setSetting($pdo, 'admin_user', $adminUser);
                setSetting($pdo, 'admin_password_hash', password_hash($adminPass, PASSWORD_BCRYPT));
                setSetting($pdo, 'yt_api_key', $ytApiKey);
                setSetting($pdo, 'yt_stream_key', $ytStreamKey);
                setSetting($pdo, 'yt_video_id', $ytVideoId);
                setSetting($pdo, 'stream_resolution', $streamPreset === '720p' ? '1280x720' : '1920x1080');
                setSetting($pdo, 'stream_fps', '30');
                setSetting($pdo, 'stream_bitrate', $streamPreset === '720p' ? '2500k' : '4500k');
                setSetting($pdo, 'game_mode', 'auto');
                setSetting($pdo, 'db_installed', '1');

                $_SESSION['setup_complete'] = true;
                header("Location: admin/login.php?installed=1");
                exit;
            } catch (Exception $e) {
                $error = "Setup failed: " . $e->getMessage();
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YouTube Live Runner - Setup Wizard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #F8FAFC;
      --card-bg: rgba(255, 255, 255, 0.95);
      --border: rgba(15, 23, 42, 0.1);
      --text: #0F172A;
      --text-muted: #64748B;
      --blue: #0284C7;
      --blue-hover: #0369A1;
      --green: #059669;
      --red: #E11D48;
      --shadow: 0 10px 25px -4px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.03);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #F8FAFC 100%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .wizard-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      backdrop-filter: blur(16px);
      border-radius: 20px;
      padding: 36px 40px;
      max-width: 680px;
      width: 100%;
      box-shadow: var(--shadow);
    }
    .wizard-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .wizard-title {
      font-size: 26px;
      font-weight: 900;
      color: var(--text);
      letter-spacing: -0.5px;
    }
    .wizard-desc {
      font-size: 14px;
      color: var(--text-muted);
      margin-top: 6px;
    }
    .step-section {
      background: rgba(248, 250, 252, 0.7);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .step-title {
      font-size: 15px;
      font-weight: 800;
      color: var(--blue);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .form-group.full {
      grid-column: span 2;
    }
    label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    input, select {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--border);
      background: #FFFFFF;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      color: var(--text);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    input:focus, select:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 800;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .btn-primary {
      background: var(--blue);
      color: #FFFFFF;
      width: 100%;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.25);
    }
    .btn-primary:hover {
      background: var(--blue-hover);
    }
    .btn-secondary {
      background: #E2E8F0;
      color: var(--text);
      font-size: 12px;
      padding: 8px 14px;
    }
    .btn-secondary:hover {
      background: #CBD5E1;
    }
    .alert {
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .alert-error {
      background: #FFE4E6;
      border: 1px solid #FECDD3;
      color: var(--red);
    }
    .alert-success {
      background: #D1FAE5;
      border: 1px solid #A7F3D0;
      color: var(--green);
    }
    .locked-card {
      text-align: center;
      padding: 40px;
    }
    .locked-icon { font-size: 48px; margin-bottom: 12px; }
  </style>
</head>
<body>

  <div class="wizard-card">
    <?php if ($isInstalled): ?>
      <div class="locked-card">
        <div class="locked-icon">🔒</div>
        <h2 class="wizard-title">System Already Installed</h2>
        <p class="wizard-desc" style="margin-bottom: 24px;">The setup wizard is locked for security. To reconfigure, remove <code>config.php</code> or access the admin dashboard.</p>
        <a href="admin/login.php" class="btn btn-primary" style="display: inline-block; width: auto;">Go to Admin Dashboard</a>
      </div>
    <?php else: ?>
      <div class="wizard-header">
        <h1 class="wizard-title">🚀 First-Time Setup Wizard</h1>
        <p class="wizard-desc">Configure your server to live stream directly to YouTube without OBS.</p>
      </div>

      <?php if ($error): ?>
        <div class="alert alert-error"><?= htmlspecialchars($error) ?></div>
      <?php endif; ?>

      <form method="POST" action="setup.php">
        <!-- Step 1: Database Setup -->
        <div class="step-section">
          <div class="step-title">
            <span>1️⃣ Database Configuration</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>Host</label>
              <input type="text" name="db_host" id="db_host" value="localhost" required>
            </div>
            <div class="form-group">
              <label>Port</label>
              <input type="text" name="db_port" id="db_port" value="3306" required>
            </div>
            <div class="form-group">
              <label>Database Name</label>
              <input type="text" name="db_name" id="db_name" value="youtube_runner" required>
            </div>
            <div class="form-group">
              <label>Username</label>
              <input type="text" name="db_user" id="db_user" value="root" required>
            </div>
            <div class="form-group full">
              <label>Password</label>
              <input type="password" name="db_pass" id="db_pass" placeholder="(Leave blank if none)">
            </div>
            <div class="form-group full" style="display: flex; gap: 10px; align-items: center;">
              <button type="button" class="btn btn-secondary" onclick="testDbConnection()">⚡ Test Connection & Migrate Tables</button>
              <span id="db_test_status" style="font-size: 12px; font-weight: 700;"></span>
            </div>
          </div>
        </div>

        <!-- Step 2: YouTube Live Settings -->
        <div class="step-section">
          <div class="step-title">
            <span>2️⃣ YouTube Live Stream Configuration</span>
          </div>
          <div class="form-grid">
            <div class="form-group full">
              <label>YouTube Data API v3 Key</label>
              <input type="password" name="yt_api_key" placeholder="AIzaSy...">
              <small style="color: var(--text-muted); font-size: 11px;">From Google Cloud Console (used to read live comments).</small>
            </div>
            <div class="form-group full">
              <label>YouTube Live Stream Key</label>
              <input type="password" name="yt_stream_key" placeholder="xxxx-xxxx-xxxx-xxxx-xxxx">
              <small style="color: var(--text-muted); font-size: 11px;">From YouTube Studio Live Dashboard (RTMP key).</small>
            </div>
            <div class="form-group">
              <label>Live Video ID (Optional)</label>
              <input type="text" name="yt_video_id" placeholder="e.g. dQw4w9WgXcQ">
            </div>
            <div class="form-group">
              <label>Stream Preset</label>
              <select name="stream_preset">
                <option value="1080p">1080p 30fps (4500 kbps - High Quality)</option>
                <option value="720p">720p 30fps (2500 kbps - Lower CPU)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Step 3: Admin Security -->
        <div class="step-section">
          <div class="step-title">
            <span>3️⃣ Admin Dashboard Security</span>
          </div>
          <div class="form-grid">
            <div class="form-group full">
              <label>Admin Username</label>
              <input type="text" name="admin_user" value="admin" required>
            </div>
            <div class="form-group">
              <label>Admin Password</label>
              <input type="password" name="admin_pass" required>
            </div>
            <div class="form-group">
              <label>Confirm Password</label>
              <input type="password" name="admin_pass_confirm" required>
            </div>
          </div>
        </div>

        <button type="submit" name="finish_setup" class="btn btn-primary">
          Complete Setup & Launch Dashboard →
        </button>
      </form>
    <?php endif; ?>
  </div>

  <script>
    async function testDbConnection() {
      const statusEl = document.getElementById('db_test_status');
      statusEl.textContent = 'Testing connection...';
      statusEl.style.color = '#0284C7';

      const formData = new FormData();
      formData.append('db_host', document.getElementById('db_host').value);
      formData.append('db_port', document.getElementById('db_port').value);
      formData.append('db_name', document.getElementById('db_name').value);
      formData.append('db_user', document.getElementById('db_user').value);
      formData.append('db_pass', document.getElementById('db_pass').value);

      try {
        const res = await fetch('setup.php?action=test_db', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          statusEl.textContent = '✓ ' + data.message;
          statusEl.style.color = '#059669';
        } else {
          statusEl.textContent = '✗ ' + data.message;
          statusEl.style.color = '#E11D48';
        }
      } catch (err) {
        statusEl.textContent = '✗ Network/Server error testing database.';
        statusEl.style.color = '#E11D48';
      }
    }
  </script>
</body>
</html>
