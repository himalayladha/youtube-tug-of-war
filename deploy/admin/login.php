<?php
/**
 * The Great Tug-of-War: Black vs White - Protected Admin Authentication
 */

session_start();
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

// Redirect if already logged in
if (!empty($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    header('Location: index.php');
    exit;
}

$error = null;
$message = null;

if (isset($_GET['installed'])) {
    $message = "Setup completed successfully! Sign in to access your administrative suite.";
}
if (isset($_GET['logged_out'])) {
    $message = "You have been logged out securely.";
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = trim($_POST['username'] ?? '');
    $pass = $_POST['password'] ?? '';

    try {
        $pdo = getDbConnection();
        if (verifyAdminLogin($pdo, $user, $pass)) {
            header('Location: index.php');
            exit;
        } else {
            $error = "Invalid administrator username or password.";
        }
    } catch (Exception $e) {
        $error = "Database connection error. Has setup been completed? " . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Suite Sign In - The Great Tug-of-War</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0B0F17;
      --card-bg: rgba(18, 24, 38, 0.95);
      --border: rgba(255, 255, 255, 0.1);
      --border-focus: #0284C7;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --blue: #0284C7;
      --blue-hover: #0369A1;
      --green: #10B981;
      --red: #F43F5E;
      --shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: radial-gradient(circle at 50% 20%, #172554 0%, #0B0F17 70%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .login-container {
      max-width: 440px;
      width: 100%;
    }
    .brand-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .brand-icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #0284C7, #0369A1);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFF;
      box-shadow: 0 4px 16px rgba(2, 132, 199, 0.4);
    }
    .brand-title {
      font-family: 'Chakra Petch', sans-serif;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #FFF;
      text-transform: uppercase;
    }
    .brand-badge {
      font-size: 10px;
      font-weight: 800;
      background: rgba(2, 132, 199, 0.2);
      border: 1px solid rgba(2, 132, 199, 0.5);
      color: #38BDF8;
      padding: 2px 6px;
      border-radius: 4px;
      vertical-align: middle;
      margin-left: 6px;
    }
    .login-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      backdrop-filter: blur(20px);
      border-radius: 20px;
      padding: 36px 36px 40px;
      box-shadow: var(--shadow);
    }
    .login-header {
      margin-bottom: 24px;
      text-align: center;
    }
    .login-title {
      font-size: 20px;
      font-weight: 800;
      color: #FFF;
      letter-spacing: -0.3px;
    }
    .login-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 6px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-size: 11px;
      font-weight: 800;
      color: var(--text-muted);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .input-wrapper {
      position: relative;
    }
    input {
      width: 100%;
      padding: 13px 16px;
      border: 1px solid var(--border);
      background: rgba(11, 15, 23, 0.8);
      border-radius: 10px;
      font-size: 14px;
      font-family: inherit;
      color: #FFF;
      outline: none;
      transition: all 0.2s ease;
    }
    input:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.25);
      background: rgba(11, 15, 23, 1);
    }
    .btn-login {
      background: linear-gradient(135deg, #0284C7, #0369A1);
      color: #FFFFFF;
      width: 100%;
      padding: 14px;
      font-size: 14px;
      font-weight: 800;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      margin-top: 8px;
      box-shadow: 0 4px 16px rgba(2, 132, 199, 0.35);
      transition: all 0.2s;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-login:hover {
      background: linear-gradient(135deg, #0369A1, #075985);
      transform: translateY(-1px);
    }
    .alert {
      padding: 12px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .alert-error {
      background: rgba(244, 63, 94, 0.15);
      border: 1px solid rgba(244, 63, 94, 0.4);
      color: #FDA4AF;
    }
    .alert-success {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #6EE7B7;
    }
    .back-link {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      text-decoration: none;
      margin-top: 24px;
      transition: color 0.15s;
    }
    .back-link:hover {
      color: #38BDF8;
    }
  </style>
</head>
<body>

  <div class="login-container">
    <div class="brand-bar">
      <div class="brand-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <div class="brand-title">
        Tug-of-War <span class="brand-badge">ADMIN</span>
      </div>
    </div>

    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">Administrator Authentication</h1>
        <p class="login-desc">Sign in to manage live broadcast and spectator arena</p>
      </div>

      <?php if ($message): ?>
        <div class="alert alert-success">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span><?= htmlspecialchars($message) ?></span>
        </div>
      <?php endif; ?>

      <?php if ($error): ?>
        <div class="alert alert-error">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span><?= htmlspecialchars($error) ?></span>
        </div>
      <?php endif; ?>

      <form method="POST" action="login.php">
        <div class="form-group">
          <label>Administrator Username</label>
          <div class="input-wrapper">
            <input type="text" name="username" value="admin" autocomplete="username" required autofocus>
          </div>
        </div>

        <div class="form-group">
          <label>Master Password</label>
          <div class="input-wrapper">
            <input type="password" name="password" autocomplete="current-password" required>
          </div>
        </div>

        <button type="submit" class="btn-login">
          <span>Sign In to Admin Suite</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </form>
    </div>

    <a href="../index.php" class="back-link">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
      <span>Return to Public Spectator Arena</span>
    </a>
  </div>

</body>
</html>
