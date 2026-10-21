# 🚀 24/7 YouTube Live Streamer on Google Cloud (Compute Engine GCE)

This guide walks you through deploying your **YouTube Live Interactive Tug-of-War** to **Google Cloud Compute Engine (GCE)** so it streams to YouTube **24 hours a day, 7 days a week, 365 days a year autonomously**, without needing your personal computer to be turned on.

---

## 📋 What You Get
* **Zero PC Uptime**: You can turn off your laptop or desktop; Google Cloud streams directly to YouTube.
* **1000+ Mbps Fiber Bandwidth**: Zero buffering, zero dropped frames on YouTube Live.
* **Automatic Recovery**: If the stream ever drops, PM2 automatically restarts it in 3 seconds.
* **Full Web Admin Access**: Control debate topics, view live player rankings, and tweak stream settings from your phone or browser at `http://<YOUR_VM_IP>/admin/`.

---

## 🛠️ Phase 1: Create & Push to GitHub (1 Minute)

### Step 1.1: Create Repository on GitHub
1. On the GitHub page you currently have open ([https://github.com/new](https://github.com/new)):
   - **Repository name**: `youtube-tug-of-war` (or any name you like)
   - **Visibility**: Choose **Public** (recommended for simplest 1-command cloning) or **Private**
   - **Do NOT check** "Add a README", "Add .gitignore", or "Choose a license" (the project already has all of these).
   - Click the green **"Create repository"** button.

### Step 1.2: Push Local Files to GitHub
Open your local terminal in this project folder and run:

```bash
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/youtube-tug-of-war.git
git push -u origin main
```
*(Replace `<YOUR_GITHUB_USERNAME>` with your actual GitHub username).*

---

## ☁️ Phase 2: Create Google Cloud VM (2 Minutes)

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. In the search bar at the top, type **VM instances** and select it (or go to **Compute Engine > VM instances**).
   *(If prompted, click "Enable Compute Engine API" and wait ~30 seconds).*
3. Click **"Create Instance"**.
4. Configure these recommended settings:
   - **Name**: `yt-streamer`
   - **Region / Zone**: Choose the region closest to you (e.g. `us-central1`, `asia-south1`, etc.)
   - **Machine configuration**:
     - Series: **E2**
     - Machine type: **e2-standard-2** (2 vCPU, 8 GB memory) — *Recommended for smooth 1080p 30/60fps rendering*.
   - **Boot disk**:
     - Click **Change**.
     - Operating System: **Ubuntu**
     - Version: **Ubuntu 22.04 LTS (x86/64)**
     - Size: **30 GB** (Standard persistent disk)
     - Click **Select**.
   - **Firewall** (Crucial):
     - Check **☑ Allow HTTP traffic**
     - Check **☑ Allow HTTPS traffic**
5. Click **"Create"** at the bottom.
6. Within 30 seconds, your VM will show a green checkmark and display an **External IP** (e.g. `34.123.45.67`).

---

## ⚡ Phase 3: 1-Command Automated Deployment (3 Minutes)

1. Next to your VM in the Google Cloud Console, click the **"SSH"** button. A browser terminal window will pop up.
2. In the SSH terminal, paste this single command and press **Enter**:

```bash
git clone https://github.com/<YOUR_GITHUB_USERNAME>/youtube-tug-of-war.git && cd youtube-tug-of-war && sudo bash deploy_gcp.sh
```

The script will automatically:
- Install Apache2, PHP 8.x, SQLite, MySQL, and FFmpeg
- Install Node.js 20 LTS, PM2 Process Manager, and Headless Chromium
- Configure web directories and permissions
- Set up everything ready for 24/7 broadcasting

---

## 🔴 Phase 4: Start 24/7 Live Streaming

Once the deployment completes, your server is live!

### Option A: Via Web Admin Panel (Easiest)
1. In your browser, open:
   ```
   http://<YOUR_VM_EXTERNAL_IP>/admin/
   ```
2. Navigate to **Settings**:
   - **YouTube Data API Key**: Enter your YouTube Data API v3 key
   - **YouTube Stream Key**: Paste your stream key from [YouTube Studio](https://studio.youtube.com/channel/UC/livestreaming)
   - Click **Save Settings**
3. Click the green **[Start Live Stream]** button on the dashboard.
4. Your stream is now broadcasting live on YouTube!

---

### Option B: Via PM2 (Ultra-Resilient Background Daemon)
If you want the stream to run in the background and **automatically restart itself if the Google Cloud VM ever reboots**, run this in your VM's SSH terminal:

```bash
# 1. Start the 24/7 autonomous stream
pm2 start /var/www/html/streamer/stream_daemon.js --name "yt-stream" -- \
  --stream-key="YOUR_YOUTUBE_STREAM_KEY" \
  --url="http://localhost/game/index.html?stream=1" \
  --resolution=1920x1080 --fps=30 --bitrate=4500k

# 2. Make it auto-start whenever the VM powers on
pm2 startup
pm2 save
```

### Useful PM2 Commands:
- Check stream status: `pm2 status`
- View live video encoding logs: `pm2 logs yt-stream`
- Stop the stream: `pm2 stop yt-stream`
- Restart the stream: `pm2 restart yt-stream`

---

## 🎮 How the 24/7 Autonomous Stream Operates

1. **Debate Topics**: Cycles dynamically every 3 rounds (e.g. `ANDROID vs IPHONE` ➔ `INTROVERT vs EXTROVERT` ➔ `CAT vs DOG`).
2. **Chat Votes**: Viewers type `1` or `android` to pull Left; `2` or `iphone` to pull Right.
3. **Live Leaderboard**: The Top 5 active players appear in real-time cards on the sides, with the Captain highlighted in a solid contrast strip.
4. **Sound & Animations**: Procedural stickmen, victory crowns, dynamic scores, and dual moving team banners render in 1080p.
