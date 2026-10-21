# ⚔️ YouTube Live Interactive Tug-of-War (Debate Arena Edition)

[![24/7 Autonomous Streaming](https://img.shields.io/badge/Streaming-24%2F7%20Autonomous%20RTMP-red.svg)](https://github.com/himalayladha/youtube-tug-of-war)
[![Google Cloud GCE Ready](https://img.shields.io/badge/Google%20Cloud-Compute%20Engine%20Ready-4285F4.svg?logo=google-cloud&logoColor=white)](https://cloud.google.com/compute)
[![No OBS Required](https://img.shields.io/badge/OBS-Zero%20OBS%20Required-success.svg)](https://github.com/himalayladha/youtube-tug-of-war)
[![Dual Engine](https://img.shields.io/badge/Database-SQLite%20%7C%20MySQL-orange.svg)](https://github.com/himalayladha/youtube-tug-of-war)
[![Node.js 20 LTS](https://img.shields.io/badge/Node.js-20%20LTS-green.svg?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

An autonomous, 24/7 interactive **YouTube Live Tug-of-War & Debate Arena** game powered by **HTML5 Canvas, PHP 8.x, SQLite/MySQL, FFmpeg, Headless Chromium (Puppeteer), and the YouTube Data API v3**.

**NO OBS OR DESKTOP SOFTWARE REQUIRED** — Runs 100% autonomously in the cloud (Google Cloud GCE, VPS, or Docker), rendering the game canvas at 1080p 60fps and streaming directly to YouTube Live RTMP (`rtmp://a.rtmp.youtube.com/live2/...`) with zero human intervention needed.

---

## 🌟 Key Features

* **⚡ Zero OBS 24/7 Cloud Broadcast**: Stream directly from Google Cloud Compute Engine or any Linux VPS. Headless Chromium renders the 1080p game canvas with Web Audio SFX and pipes raw frames directly into FFmpeg H.264/AAC.
* **🔥 Dynamic Debate Topics (3-Round Cycles)**:
  * Generic team names are dynamically replaced by active debate topics (e.g. `ANDROID vs IPHONE`, `INTROVERT vs EXTROVERT`, `CAT vs DOG`, `MIND vs MONEY`).
  * Every 3 rounds, the arena celebrates the match champion, advances to the next debate topic, and resets round scores.
* **🏆 High-Contrast Thematic Leaderboards**:
  * **Team Left**: Sleek tactical black card with a stark white highlight strip for Captain (Rank #1).
  * **Team Right**: Crisp stark white card with a deep black highlight strip for Captain (Rank #1).
  * Real-time Top 5 chat MVPs, scores, and active contributors.
* **↔️ Dual Flowing Marquee Tickers**:
  * Top horizontal ticker scrolls Left towards Team 1.
  * Bottom horizontal ticker scrolls Right towards Team 2.
* **💬 Real-Time YouTube Chat Polling Engine**: Sub-second chat parser that supports both numeric shortcuts (`1`, `2`) and dynamic topic keywords (`android`, `iphone`).
* **🔄 Dual Database Support**: Works out of the box with zero-configuration **SQLite** (`data/database.sqlite`) or enterprise **MySQL / MariaDB**.
* **🎛️ Comprehensive Admin Dashboard (`/admin/`)**: Start/stop streams, monitor real-time FFmpeg logs, inspect chat velocity, edit debate topics, and configure stream bitrate.
* **🛡️ Self-Healing Auto-Restart**: Pre-configured for **PM2**, automatically reviving the stream within 3 seconds if network drops or after server reboots.

---

## 🏛️ System Architecture

```text
  ┌────────────────────────────────────────────────────────────────────────┐
  │                         YouTube Live Platform                          │
  └───────────────────▲────────────────────────────────┬───────────────────┘
                      │ RTMP Video Broadcast           │ Live Chat Messages
                      │ (1080p 60fps H.264 / AAC)      │ (Sub-second polling)
                      │                                ▼
  ┌───────────────────┴───────────────────┐  ┌─────────────────────────────┐
  │       streamer/stream_daemon.js       │  │        api/chat.php         │
  │     (Headless Chromium + FFmpeg)      │  │   (YouTube Data API v3)     │
  └───────────────────▲───────────────────┘  └──────────────┬──────────────┘
                      │ Puppeteer Screen Capture            │ Parse Votes (1/2,
                      │ (1920x1080 @ 60 FPS)                │ Android vs iPhone)
                      │                                     ▼
  ┌───────────────────┴───────────────────┐  ┌─────────────────────────────┐
  │            game/index.html            │  │   SQLite / MySQL Database   │
  │  (Interactive Tug-of-War Canvas Engine│  │ (Debate Topics & MVP Scores)│
  │   + Procedural Stickmen + SFX)        │  └──────────────▲──────────────┘
  └───────────────────────────────────────┘                 │
                                                            │
  ┌─────────────────────────────────────────────────────────┴──────────────┐
  │                 Web Admin Suite & Control Dashboard                     │
  │             (admin/index.php, setup.php, api/stream.php)               │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 🎮 How to Play via YouTube Live Chat

Viewers in the live stream chat type commands to pull the rope for their team:

| Team / Side | Numeric Command | Keyword Command | Action in Arena |
|:---:|:---:|:---:|---|
| **Left Team** (e.g. `ANDROID`) | `1` | `android` or `left` | Pulls rope toward the Left side; increases Team 1 pull momentum |
| **Right Team** (e.g. `IPHONE`) | `2` | `iphone` or `right` | Pulls rope toward the Right side; increases Team 2 pull momentum |

Every vote earns the viewer **+10 Score Points** and elevates their ranking on the Top 5 MVP leaderboard. The Rank #1 contributor is crowned **Team Captain**.

---

## ☁️ Deploy to Google Cloud GCE (24/7 Autonomous)

Run the game 24/7 on a Google Cloud Compute Engine virtual machine without keeping your computer on.

### 1. Launch a GCE VM Instance
1. Go to **Google Cloud Console ➔ Compute Engine ➔ VM instances ➔ Create instance**.
2. **Machine type**: `e2-standard-2` (2 vCPUs, 8 GB RAM).
3. **Boot disk**: **Ubuntu 22.04 LTS (x86/64)** (30 GB standard disk).
4. **Firewall**: Check both **☑ Allow HTTP traffic** and **☑ Allow HTTPS traffic**.
5. Click **Create**.

### 2. Run the 1-Command Automated Deploy
Click the **SSH** button next to your VM and run:

```bash
git clone https://github.com/himalayladha/youtube-tug-of-war.git
cd youtube-tug-of-war
sudo bash deploy_gcp.sh
```

### 3. Start Broadcasting 24/7
* **Web UI**: Open `http://<YOUR_VM_EXTERNAL_IP>/admin/` in your browser, enter your YouTube Live Stream Key, and click **[Start Live Stream]**.
* **PM2 Daemon (Auto-Restart on Reboot)**:
  ```bash
  pm2 start /var/www/html/streamer/stream_daemon.js --name "yt-stream" -- \
    --stream-key="YOUR_YOUTUBE_STREAM_KEY" \
    --url="http://localhost/game/index.html?stream=1" \
    --resolution=1920x1080 --fps=30 --bitrate=4500k
  pm2 startup && pm2 save
  ```

---

## 💻 Local Setup & Development (XAMPP / LAMP)

### Prerequisites
* **PHP 8.1+** (with `pdo_sqlite` or `pdo_mysql`, `curl`, `json`, `mbstring`)
* **Node.js 20 LTS** & `npm`
* **FFmpeg** installed and accessible in your system `PATH`

### Installation Steps
1. Clone the repository into your local web root:
   ```bash
   git clone https://github.com/himalayladha/youtube-tug-of-war.git
   cd youtube-tug-of-war
   ```
2. Install streamer dependencies:
   ```bash
   cd streamer
   npm install
   cd ..
   ```
3. Open your browser:
   * Game Canvas: `http://localhost/happy-oppenheimer/game/index.html`
   * Admin Panel: `http://localhost/happy-oppenheimer/admin/`
   * First-Time Setup Wizard: `http://localhost/happy-oppenheimer/setup.php`

---

## ⚙️ Configuration & Environment Variables

Settings can be managed either via the web Admin UI (`/admin/`) or directly in `config.php`:

```php
<?php
return [
    'db_driver' => 'sqlite', // 'sqlite' or 'mysql'
    'db_path'   => __DIR__ . '/data/database.sqlite',
    
    // Optional MySQL configuration (if db_driver is 'mysql')
    'db_host'   => 'localhost',
    'db_port'   => '3306',
    'db_name'   => 'youtube_runner',
    'db_user'   => 'root',
    'db_pass'   => '',
];
```

### In-Game Dynamic Debate Topics
Configured in `game/index.html` (under `ROUND_TOPICS`):
1. **ANDROID vs IPHONE**
2. **INTROVERT vs EXTROVERT**
3. **CAT vs DOG**
4. **MIND vs MONEY**
5. **EARLY BIRD vs NIGHT OWL**
6. **COFFEE vs TEA**
7. **WORK FROM HOME vs OFFICE**

---

## 🛠️ Project Directory Structure

```text
├── admin/                     # Protected Web Admin Control Suite
│   ├── index.php              # Stream controls, logs, metrics, debate manager
│   ├── login.php              # Secure authentication
│   └── logout.php             # Session destruction
├── api/                       # REST APIs
│   ├── chat.php               # Sub-second YouTube Live chat vote ingestion
│   ├── settings.php           # Dynamic game & stream configuration
│   └── stream.php             # FFmpeg/Puppeteer daemon lifecycle controller
├── data/                      # SQLite database storage (WAL mode)
│   └── database.sqlite
├── db/                        # Database schemas & migrations
│   ├── schema.sql             # MySQL schema
│   └── schema_sqlite.sql      # SQLite schema
├── game/                      # Interactive HTML5 Canvas Game Engine
│   ├── index.html             # High-contrast debate arena, stickmen, tickers, audio
│   └── js/                    # Core physics & rendering scripts
├── streamer/                  # Autonomous Headless Streaming Daemon
│   ├── stream_daemon.js       # Puppeteer CDP screencast -> FFmpeg RTMP pipe
│   └── package.json           # Puppeteer dependencies
├── deploy_gcp.sh              # 1-command Google Cloud GCE deployment script
├── GOOGLE_CLOUD_GCE_24_7.md   # Detailed Google Cloud setup guide
├── install.sh                 # Generic Ubuntu/Debian VPS installer
├── setup.php                  # Interactive 3-step setup wizard
└── index.php                  # Public spectator landing page
```

---

## 📜 License
This project is open-source and available under the [MIT License](LICENSE.md).
