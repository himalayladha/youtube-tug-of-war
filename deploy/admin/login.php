<?php
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
    $message = "Installation completed successfully! Please log in to your admin dashboard.";
}
if (isset($_GET['logged_out'])) {
    $message = "You have been logged out.";
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
            $error = "Invalid username or password.";
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
  <title>Admin Login - YouTube Live Runner</title>
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
    .login-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      backdrop-filter: blur(16px);
      border-radius: 20px;
      padding: 36px 40px;
      max-width: 440px;
      width: 100%;
      box-shadow: var(--shadow);
    }
    .login-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .login-title {
      font-size: 24px;
      font-weight: 900;
      color: var(--text);
      letter-spacing: -0.5px;
    }
    .login-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 6px;
    }
    .form-group {
      margin-bottom: 18px;
    }
    label {
      display: block;
      font-size: 11px;
      font-weight: 800;
      color: var(--text-muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid var(--border);
      background: #FFFFFF;
      border-radius: 10px;
      font-size: 14px;
      font-family: inherit;
      color: var(--text);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    input:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }
    .btn-login {
      background: var(--blue);
      color: #FFFFFF;
      width: 100%;
      padding: 12px;
      font-size: 14px;
      font-weight: 800;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      margin-top: 6px;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.25);
      transition: background 0.15s;
    }
    .btn-login:hover {
      background: var(--blue-hover);
    }
    .alert {
      padding: 12px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 18px;
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
  </style>
</head>
<body>

  <div class="login-card">
    <div class="login-header">
      <div style="font-size: 38px; margin-bottom: 8px;">🎮</div>
      <h1 class="login-title">Stream Control Login</h1>
      <p class="login-desc">Sign in to control YouTube Live server streaming</p>
    </div>

    <?php if ($message): ?>
      <div class="alert alert-success"><?= htmlspecialchars($message) ?></div>
    <?php endif; ?>

    <?php if ($error): ?>
      <div class="alert alert-error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <form method="POST" action="login.php">
      <div class="form-group">
        <label>Username</label>
        <input type="text" name="username" value="admin" required autofocus>
      </div>

      <div class="form-group">
        <label>Password</label>
        <input type="password" name="password" required>
      </div>

      <button type="submit" class="btn-login">Sign In to Dashboard →</button>
    </form>
  </div>

</body>
</html>
