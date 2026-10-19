# 📱 Hosting on Android with TermuxPanel

This guide explains how to host **The Great Tug-of-War: Black vs. White** on an Android phone using [himalayladha/termux-hosting-panel](https://github.com/himalayladha/termux-hosting-panel).

---

## 🌟 Why This Works Flawlessly on TermuxPanel

1. **Zero Database Configuration**: Powered by pure **SQLite** (`data/database.sqlite`). You do not need to install, configure, or run MySQL or MariaDB on your phone!
2. **Cloudflare Zero Trust Tunnel**: Free HTTPS (`https://tugofwar.yourdomain.com`) with zero router port forwarding and automated DDoS protection.
3. **24/7 Mobile Uptime**: TermuxPanel's built-in 24/7 CPU WakeLock and self-healing watchdog keep the game live even when your phone's screen is turned off.
4. **Daylight Spectator Portal + Arena View**: Anyone with your link can view live scores, debate topics, team captains, and vote from any mobile or desktop browser.

---

## 🚀 Step-by-Step Deployment Guide

### Step 1: Open Termux and Run the Helper Script

Inside your Termux terminal on Android:
```bash
# Clone or copy the deploy folder to your device
cd /path/to/deploy

# Run the 1-tap helper
bash termux_setup.sh
```
This automatically installs `php`, `php-sqlite`, `sqlite`, and `ffmpeg`.

---

### Step 2: Create the Website in TermuxPanel

1. Open TermuxPanel on your phone:
   ```text
   http://127.0.0.1:9000
   ```
2. In the left navigation, click **Websites** → **+ Create Website**.
3. Fill in the website creation form:
   - **Site Name**: `tug-of-war`
   - **Runtime**: `PHP (Built-in Server)`
   - **Entry File**: `index.php`
   - **Domain**: `tugofwar.yourdomain.com` (or leave blank for local IP)
4. Click **Create & Launch**.
   - TermuxPanel will create the folder `~/termux-panel/storage/websites/tug-of-war/` and assign a dedicated local port (e.g. `8100`).

---

### Step 3: Copy Deploy Files to TermuxPanel Website Directory

In your Termux terminal, copy the contents of this `deploy/` folder into your TermuxPanel website directory:

```bash
cp -r /path/to/deploy/* ~/termux-panel/storage/websites/tug-of-war/
```

Or use the TermuxPanel **File Manager** tab to upload and extract the files directly in your browser.

---

### Step 4: Run the 1-Click SQLite Setup Wizard

1. In your browser, open the assigned port (e.g. `8100`):
   ```text
   http://127.0.0.1:8100/setup.php
   ```
2. Under **1️⃣ Database Engine Selection**, keep **📱 SQLite (Zero-Config / Termux / Android)** selected.
3. Click **⚡ Test Connection & Migrate Tables**.
   - The wizard creates `data/database.sqlite` with all required tables instantly!
4. Enter your YouTube Stream Key & Data API Key (if streaming) and set your Admin Password.
5. Click **Complete Setup & Launch Dashboard**.

---

### Step 5: (Optional) Public Remote Access via Cloudflare Tunnel

To make your game accessible to players worldwide over HTTPS:

1. In TermuxPanel, go to **Cloudflare Tunnel**.
2. Add a **Public Hostname Route**:
   - **Subdomain**: `tugofwar`
   - **Domain**: `yourdomain.com`
   - **Service Type**: `HTTP`
   - **URL**: `127.0.0.1:8100` (your website port)
3. Visit `https://tugofwar.yourdomain.com` from any phone or computer in the world!

---

### Step 6: Live Streaming Options

- **Option A (Zero-Lag Broadcast via OBS)**:
  Open `https://tugofwar.yourdomain.com/game/index.html` as an OBS Browser Source (1920x1080) on any PC, and broadcast to YouTube.
- **Option B (Server-Side Automated Streaming)**:
  In the Admin Dashboard (`/admin/`), click **[Start Streaming]** to let the background daemon broadcast directly to YouTube RTMP.
