# ⚔️ The Great Tug-of-War: Black vs. White — 24/7 Autonomous YouTube Live Stream

An autonomous, 24/7 interactive **Tug-of-War YouTube Live Chat Battle** built with **PHP 8.x, MySQL, HTML5 Canvas, Vanilla JavaScript, FFmpeg, and the YouTube Data API v3**.

**NO OBS OR DESKTOP SOFTWARE REQUIRED** — Runs 100% autonomously in the cloud or on any local server, rendering a 60fps broadcast canvas inside headless Chromium and piping video directly to YouTube Live RTMP (`rtmp://a.rtmp.youtube.com/live2/...`).

---

## 🌟 Key Features

- **👑 Dual Crowned Captains**: The #1 most active commenter on each side is prominently displayed as Team Captain (`👑 CAPTAIN OF BLACK` & `👑 CAPTAIN OF WHITE`) with live crown takeover alerts.
- **🏆 Dual Top 10 Leaderboards**: Flanking the arena, live scores track the top 10 warriors from both sides.
- **🔥 Relatable Debate Topics**: Over 20 engaging debate topics (*Android vs. iPhone*, *Introverts vs. Extroverts*, *Cats vs. Dogs*, *Work From Home vs. Office*) with sudden-death overtime mechanics.
- **⚡ Broadcast Colosseum Visuals**: Volumetric arena floodlights, cheering crowd silhouettes with glowing light sticks, 10 armored cyber-gladiators with 45° athletic combat lean, 3D braided steel cable, and center plasma energy rift.
- **💬 YouTube Chat Ingestion**: Sub-second polling ingests `1` / `BLACK` and `2` / `WHITE` votes and translates them into cable physics tension.
- **🎛️ Admin Control Dashboard (`admin/index.php`)**: 1-click **[Start Streaming]** and **[Stop Streaming]**, real-time FFmpeg logs, and stream resolution/bitrate settings.
- **🧙 Interactive Setup Wizard (`setup.php`)**: 1-click database connection testing, automated table migration, and configuration generation.

---

## 🚀 Quick Deployment Guide

### Option 1: Linux VPS (Ubuntu 20.04 / 22.04 / 24.04 or Debian 11 / 12)

1. Upload or clone this folder onto your VPS (e.g. `/var/www/html/tugofwar`).
2. Run the 1-click installer:
   ```bash
   sudo bash install.sh
   ```
3. Open your browser and navigate to:
   ```text
   http://YOUR_SERVER_IP/setup.php
   ```
4. Follow the 3-step setup wizard to connect MySQL and enter your YouTube Stream Key & Data API Key.
5. In the Admin Dashboard (`/admin/`), click **[Start Streaming]** to go live!

---

### Option 2: Local Server (XAMPP / WAMP / MAMP)

1. Copy this folder into your web root (e.g. `C:\xampp\htdocs\tugofwar`).
2. Start **Apache** and **MySQL** in your control panel.
3. Install the streamer dependencies:
   ```powershell
   cd streamer
   npm install
   ```
4. Open your browser to:
   ```text
   http://localhost/tugofwar/setup.php
   ```
5. Complete the setup wizard and start streaming or test in preview mode:
   ```text
   http://localhost/tugofwar/game/index.html?preview=1
   ```

---

## 🎮 How Viewers Play in YouTube Live Chat

Viewers participate directly by sending either command in the YouTube Live chat:

| Team | Chat Command | Numeric Alias | In-Game Effect |
|---|---|---|---|
| **⚫ TEAM BLACK** | `black` or `1` | `1` | Heaves the cable towards Team Black |
| **⚪ TEAM WHITE** | `white` or `2` | `2` | Heaves the cable towards Team White |

---

## 📂 Directory Structure

```text
deploy/
├── admin/               # Password-protected admin dashboard
│   ├── index.php        # Start/stop stream, stream settings & logs
│   └── login.php        # Secure admin login
├── api/                 # REST APIs
│   ├── chat.php         # YouTube live chat poller & voting engine
│   └── stream.php       # Background FFmpeg stream manager
├── db/                  # Database migration schemas
│   └── schema.sql       # MySQL schema for leaderboards, chat logs & settings
├── game/                # HTML5 interactive broadcast arena
│   ├── index.html       # Broadcast game view with inlined zero-cache styling
│   ├── css/styles.css   # High-voltage esports styling
│   └── js/game.js       # Colosseum arena, cyber-gladiators & rope physics
├── includes/            # Helper libraries
│   ├── auth.php         # Session management & CSRF protection
│   └── db.php           # PDO database connection & settings helper
├── streamer/            # Server-side headless broadcaster
│   ├── stream_daemon.js # Puppeteer + FFmpeg 60fps streaming daemon
│   └── package.json     # Node.js dependencies (puppeteer)
├── config.sample.php    # Sample configuration template
├── index.php            # Public spectator landing page
├── install.sh           # Automated 1-click Linux VPS installer
├── setup.php            # 1-click web setup & database migration wizard
└── README.md            # Deployment and operational documentation
```
