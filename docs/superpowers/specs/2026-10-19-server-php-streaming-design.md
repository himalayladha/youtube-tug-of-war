# Server-Side YouTube Live Streamer with PHP, MySQL & Setup Wizard - Design Spec

**Date:** 2026-10-19  
**Status:** Approved  
**Target Environment:** Linux VPS / Server (Ubuntu / Debian / LAMP) & Local PHP/MySQL (XAMPP)  
**Primary Tech Stack:** PHP 8.x, MySQL 8.x / MariaDB, HTML5/CSS3/JavaScript, YouTube Data API v3, Headless Chromium, FFmpeg  

---

## 1. System Overview

This system allows a content creator or streamer to host and broadcast an interactive YouTube Live Chat-controlled game (Subway Surfers-style Stickman runner) **directly from a server 24/7 without needing OBS Studio or keeping a personal computer running**.

### Core Components
1. **First-Time Setup Wizard (`setup.php`)**:
   - 3-step setup: MySQL database connection & automatic table creation → YouTube Live Stream Key & API credentials → Admin account setup.
   - Generates `config.php` and sets a security lock flag.
2. **Admin Dashboard (`admin/index.php`)**:
   - Password-protected management dashboard with real-time **Start Streaming** and **Stop Streaming** buttons.
   - Live stream health monitor, uptime counter, chat velocity, viewer counts, and recent game activity.
   - Stream diagnostics log viewer showing live FFmpeg output and YouTube API poll status.
3. **Server-Side Autonomous Streaming Daemon (`streamer/stream_daemon.js`)**:
   - Managed directly by the PHP backend via process lifecycle APIs (`api/stream.php`).
   - Launches Headless Chromium, loads the game at 1080p, captures frames, and pipes them directly into `ffmpeg`.
   - FFmpeg encodes high-definition H.264 video with AAC audio and pushes directly to YouTube's RTMP ingest server (`rtmp://a.rtmp.youtube.com/live2/<STREAM_KEY>`).
4. **Interactive Stickman Subway Runner (`game/`)**:
   - 3-lane perspective Subway Surfers stickman runner with daytime light theme.
   - Fully controllable via YouTube Live Chat comments (`LEFT`, `JUMP`, `RIGHT` or `1`, `2`, `3`).
   - Dynamic Anarchy vs Democracy voting window aggregation.
5. **Automated Server Installation Script (`install.sh`)**:
   - Single-command bash installer for Ubuntu/Debian server provisioning (installs Apache/Nginx, PHP 8.x, MySQL, Node.js, and FFmpeg).

---

## 2. Database Architecture (MySQL)

### Tables
1. **`settings`**:
   - Key-value configuration store.
   - Columns: `setting_key` VARCHAR(64) PRIMARY KEY, `setting_value` TEXT, `updated_at` TIMESTAMP.
   - Initial Seeded Keys:
     - `db_installed`: `'1'`
     - `admin_password_hash`: Bcrypt hash of admin password
     - `yt_api_key`: Google Cloud YouTube Data API v3 Key
     - `yt_stream_key`: YouTube Live RTMP Stream Key
     - `yt_video_id`: YouTube Live Broadcast Video ID
     - `stream_resolution`: `'1920x1080'` (or `'1280x720'`)
     - `stream_fps`: `'30'`
     - `stream_bitrate`: `'4500k'`
     - `game_mode`: `'auto'` (`'anarchy'` / `'democracy'`)

2. **`stream_sessions`**:
   - Tracks streaming history and active PIDs.
   - Columns:
     - `id` INT AUTO_INCREMENT PRIMARY KEY
     - `pid` INT
     - `started_at` DATETIME NOT NULL
     - `stopped_at` DATETIME NULL
     - `status` ENUM('running', 'stopped', 'error') DEFAULT 'running'
     - `peak_viewers` INT DEFAULT 0
     - `total_commands` INT DEFAULT 0
     - `log_file` VARCHAR(255) NULL

3. **`leaderboard`**:
   - Persistent viewer scoring and contribution rankings.
   - Columns:
     - `id` INT AUTO_INCREMENT PRIMARY KEY
     - `user_id` VARCHAR(128) UNIQUE
     - `user_name` VARCHAR(128) NOT NULL
     - `total_votes` INT DEFAULT 0
     - `successful_dodges` INT DEFAULT 0
     - `score` INT DEFAULT 0
     - `last_active` DATETIME NOT NULL

4. **`chat_logs`**:
   - Records processed commands.
   - Columns:
     - `id` BIGINT AUTO_INCREMENT PRIMARY KEY
     - `user_name` VARCHAR(128) NOT NULL
     - `raw_text` VARCHAR(255) NOT NULL
     - `action_executed` ENUM('LEFT', 'JUMP', 'RIGHT') NOT NULL
     - `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

---

## 3. First-Time Setup Wizard Flow (`setup.php`)

```
Step 1: Database Setup
  ├── Inputs: DB Host, DB Name, DB User, DB Password
  ├── Action: Test PDO connection, create database if needed, execute schema.sql
  └── Result: Save db credentials to config.php

Step 2: YouTube Live Configuration
  ├── Inputs: YouTube Data API v3 Key, YouTube Stream Key, Video ID
  └── Result: Insert settings into database table `settings`

Step 3: Admin Security
  ├── Inputs: Admin Username, Admin Password, Confirm Password
  ├── Action: Hash password with password_hash(PASSWORD_BCRYPT)
  ├── Lock: Create lock file or set db_installed = 1
  └── Result: Redirect to /admin/login.php with success notification
```

Security: If `config.php` exists and `db_installed = 1`, `setup.php` automatically terminates with HTTP 403 Forbidden to prevent unauthorized reconfiguration.

---

## 4. Admin Dashboard Specifications (`admin/index.php`)

### Authentication
- Session-based authentication via `admin/login.php`.
- Protected pages check `$_SESSION['admin_logged_in'] === true`.

### Dashboard Controls & Metrics
1. **Live Stream Control Banner**:
   - Large Status Badge: `🟢 STREAMING LIVE` (with pulse animation) or `🔴 STREAM OFFLINE`.
   - **"Start Streaming" Button**: Calls `api/stream.php?action=start`.
   - **"Stop Streaming" Button**: Calls `api/stream.php?action=stop`.
2. **Real-Time Stream Telemetry**:
   - Active stream duration timer (`HH:MM:SS`).
   - YouTube Chat velocity gauge (messages per second).
   - Plurality vote distribution (`LEFT %` vs `JUMP %` vs `RIGHT %`).
   - Active viewer counter and Top 5 MVP viewers.
3. **Live Game Preview**:
   - Embedded iframe or preview canvas of `game/index.html?preview=1` showing real-time stickman running.
4. **Console Log Viewer**:
   - Real-time rolling log of FFmpeg output, process status, and YouTube chat poller diagnostics.
5. **Quick Settings Modal**:
   - Quick updates for Stream Key or Video ID when starting a new YouTube Live broadcast without re-running setup.

---

## 5. Server-Side Autonomous Streaming Daemon

### Architecture (`streamer/stream_daemon.js`)
- Executed via background child process spawned by PHP (`exec` / `proc_open`):
  `node streamer/stream_daemon.js --stream-key=<KEY> --resolution=1920x1080 --fps=30 > streamer/stream.log 2>&1 &`
- **Headless Browser Pipeline**:
  - Launches Puppeteer / Chromium with `--no-sandbox`, `--disable-setuid-sandbox`, `--use-gl=swiftshader` or GPU acceleration.
  - Opens `http://localhost/game/index.html?obs=true&stream=1`.
  - Captures video frames using Chromium screencast API at 30/60 FPS.
- **FFmpeg RTMP Pipeline**:
  - Pipes raw frames directly to `ffmpeg`:
    ```bash
    ffmpeg -y -f image2pipe -vcodec png -r 30 -i - \
           -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 \
           -c:v libx264 -preset veryfast -b:v 4500k -maxrate 5000k -bufsize 9000k \
           -pix_fmt yuv420p -g 60 -c:a aac -b:a 128k \
           -f flv rtmp://a.rtmp.youtube.com/live2/<STREAM_KEY>
    ```
- **Process Management**:
  - PID saved to `streamer/pid.lock` and `stream_sessions` table.
  - On stop request, sends `SIGTERM` / `SIGKILL` to cleanly tear down Chromium and FFmpeg.

---

## 6. Verification & Testing Strategy

1. **Setup Wizard Verification**:
   - Test clean installation flow on fresh MySQL database.
   - Verify table creation, bcrypt password hashing, and config file generation.
   - Verify post-install lock prevents re-running wizard.
2. **Admin Authentication & Dashboard Verification**:
   - Test login with valid/invalid credentials.
   - Verify dashboard telemetry API endpoints (`api/stream.php`, `api/settings.php`).
3. **Streaming Daemon Verification**:
   - Test starting and stopping stream daemon, confirming PID lock creation and cleanup.
   - Test mock/real RTMP stream output into FFmpeg.
4. **Live Chat Poller & Game State Verification**:
   - Verify comments trigger `LEFT`, `JUMP`, `RIGHT` actions in the game engine.
