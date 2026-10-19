# 🏃 Autonomous 24/7 YouTube Live Chat Stickman Runner

An autonomous, 24/7 interactive **Stickman Subway Surfers-style runner** built with **PHP, MySQL, HTML5, CSS3, JavaScript, FFmpeg, and the YouTube Data API**.

**NO OBS OR DESKTOP SOFTWARE REQUIRED** — Stream directly from any Linux VPS, dedicated server, or local LAMP/XAMPP stack straight to YouTube Live RTMP (`rtmp://a.rtmp.youtube.com/live2/...`) with a single click from the web dashboard.

---

## 🌟 Key Highlights

- **⚡ Zero OBS Broadcast**: A server-side daemon renders the 60fps canvas inside headless Chromium and pipes raw audio and video frames directly into FFmpeg H.264/AAC for 24/7 RTMP streaming.
- **🧙 First-Time Setup Wizard (`setup.php`)**: Interactive 3-step setup wizard with 1-click database connection testing, automated table migrations (`db/schema.sql`), YouTube credential configuration, and an automatic installation security lock.
- **🎛️ Admin Control Dashboard (`admin/index.php`)**: Password-protected suite with **[Start Streaming]** and **[Stop Streaming]** controls, live stream uptime timer, real-time FFmpeg rolling logs, viewer velocity stats, and stream settings modal.
- **🎮 Public Spectator Hub (`index.php`)**: Clean daylight-themed landing page featuring real-time chat command voting bars, top chat MVPs leaderboard, how-to-play guide, and live video toggle.
- **💬 YouTube Live Chat Game Engine**: Sub-second chat poller that translates viewer messages into instant runner actions (`LEFT`, `JUMP`, `RIGHT`) with voting tallies and viewer scoring stored in MySQL.
- **🚀 1-Click VPS Installer (`install.sh`)**: Automated bash script to install Apache, PHP 8.x, MySQL, Node.js, and FFmpeg on Ubuntu or Debian.

---

## 🏛️ System Architecture

```text
  ┌────────────────────────────────────────────────────────┐
  │                 YouTube Live Platform                  │
  └───────────────▲──────────────────────────┬─────────────┘
                  │ RTMP Stream              │ Live Chat
                  │ (H.264 / AAC)            │ Messages
                  │                          ▼
  ┌───────────────┴───────────────┐  ┌─────────────────────┐
  │   streamer/stream_daemon.js   │  │   api/chat.php      │
  │   (Headless Chromium + FFmpeg)│  │ (YouTube Data API)  │
  └───────────────▲───────────────┘  └──────────┬──────────┘
                  │ Puppeteer Screen            │ Ingests Actions &
                  │ Capture (60 FPS)            │ Updates Leaderboard
                  │                             ▼
  ┌───────────────┴───────────────┐  ┌─────────────────────┐
  │        game/index.html        │  │   MySQL Database    │
  │ (HTML5 Canvas 3D Runner + SFX)│  │ (Settings & Scores) │
  └───────────────────────────────┘  └──────────▲──────────┘
                                                │
  ┌─────────────────────────────────────────────┴──────────┐
  │      Admin Dashboard & First-Time Setup Wizard         │
  │    (setup.php, admin/index.php, api/stream.php)        │
  └────────────────────────────────────────────────────────┘
```

---

## 🎮 How to Play via YouTube Live Chat

Viewers in the stream chat type any of the following 3 commands:

| Action | Chat Command | Numeric Alias | Shortcut | In-Game Effect |
|---|---|---|---|---|
| **◄ LEFT** | `left` or `lane1` | `1` | `l`, `a` | Shifts Stickman to the left lane |
| **▲ JUMP** | `jump` or `hop` | `2` | `j`, `w`, `u` | Leaps over barriers & low hurdles |
| **► RIGHT** | `right` or `lane3` | `3` | `r`, `d` | Shifts Stickman to the right lane |

---

## 🚀 Fast Deployment on Ubuntu / Debian VPS

### Step 1: Run the 1-Click Installer
SSH into your server and run:
```bash
sudo bash install.sh
```
This automatically installs and configures:
- **Apache2** with `mod_rewrite` enabled
- **PHP 8.x** with `pdo_mysql`, `curl`, `json`, `mbstring`
- **MySQL Server**
- **FFmpeg** with `libx264` and `aac` support
- **Node.js 20 LTS** & Chromium shared libraries
- Puppeteer headless streaming dependencies

### Step 2: Open the Setup Wizard
Open your web browser and navigate to:
```text
http://<YOUR_SERVER_IP>/setup.php
```

1. **Database Setup**: Enter MySQL host, database name (`youtube_runner`), username, and password. Click **Test & Migrate Database**.
2. **YouTube Live Configuration**:
   - **YouTube Data API Key**: Obtain from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with *YouTube Data API v3* enabled.
   - **YouTube RTMP Stream Key**: Copy from YouTube Studio (`live2` stream key).
   - **YouTube Live Video ID**: The 11-character video ID from your YouTube broadcast URL (`https://www.youtube.com/watch?v=VIDEO_ID`).
3. **Admin Security**: Set your admin username and secure password.
4. **Complete Setup**: The wizard writes `config.php`, sets the `db_installed = 1` lock, and redirects to the Admin Dashboard.

---

## 🖥️ Local Testing with XAMPP (Windows / Mac)

1. Clone or extract the repository into `C:\xampp\htdocs\happy-oppenheimer`.
2. Start **Apache** and **MySQL** in the XAMPP Control Panel.
3. Install the streamer dependencies:
   ```powershell
   cd streamer
   npm install
   ```
4. Verify FFmpeg is installed and added to your system `PATH`:
   ```powershell
   ffmpeg -version
   ```
5. Open your browser:
   ```text
   http://localhost/happy-oppenheimer/setup.php
   ```
6. Follow the wizard (Default MySQL Host: `localhost`, User: `root`, Password: ``).

---

## 🕹️ Admin Dashboard Guide (`admin/index.php`)

- **Start Streaming**: Spawns the autonomous background streaming daemon (`streamer/stream_daemon.js`) and connects to YouTube RTMP.
- **Stop Streaming**: Safely terminates the background daemon, closes Chromium, and flushes FFmpeg buffers.
- **Live Telemetry**: Displays stream uptime, chat command rate (messages/sec), live vote distribution, and top viewer MVP leaderboard.
- **Real-Time Logs**: View rolling output from FFmpeg and the Chromium rendering daemon directly in the browser console.
- **Update Settings**: Click **Stream Settings** in the top navigation to update your Stream Key or Video ID between broadcasts without re-running setup.

---

## 🔒 Security Best Practices

- **Installation Lock**: Once setup completes, `setup.php` automatically terminates with `HTTP 403 Forbidden` if `config.php` and `db_installed = 1` are detected.
- **Bcrypt Password Hashing**: Passwords are saved using standard PHP `password_hash(..., PASSWORD_BCRYPT)`.
- **Prepared Statements**: All database operations use PDO prepared statements to protect against SQL injection.
- **Process Isolation**: The background streaming process writes to a managed PID lockfile (`streamer/pid.lock`) and handles graceful termination upon server stop requests.

---

## 📄 License
MIT License. Free to use, modify, and stream!
