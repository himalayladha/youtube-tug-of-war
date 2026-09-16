# 🎮 YouTube Live Chat Controlled 2D Endless Runner

An interactive, crowd-controlled 2D cyber runner designed for 24/7 YouTube Live broadcasts via OBS Studio. Viewers in your live chat collectively control the runner in real time by typing simple commands (`jump`, `slide`, `left`, `right`, `shield`).

---

## ✨ Features

- **⚡ Dual Aggregation Modes**:
  - **Anarchy Mode**: Instant FIFO queue with per-user anti-spam (ideal for early streams / 1–15 viewers).
  - **Democracy Mode**: 1.0-second rolling voting window with on-screen visual tally gauges and plurality execution (ideal for high-traffic raids & active chatters).
  - **Auto-Switching**: Automatically transitions between Anarchy and Democracy based on real-time chat velocity (messages/sec).
- **🕹️ 3-Lane Deterministic Gameplay**:
  - Ground Spikes (requires `JUMP` / `1` / `W`)
  - Overhead Laser Beams (requires `SLIDE` / `2` / `S`)
  - Roadblocks & Double-Barriers (requires `LEFT` / `3` / `A` or `RIGHT` / `4` / `D`)
  - Glowing Energy Crystals to fill the Community Super Shield meter.
- **🏆 Viewer Gamification & Leaderboard**:
  - Live on-screen chat ticker.
  - Session MVP & Top Contributors leaderboard.
  - Floating credit popups when a viewer's move dodges an obstacle (`@User +50 Save!`).
- **📺 OBS Studio Ready**:
  - Dedicated `?obs=true` mode for a clean 1080p broadcast overlay without developer toolbars.
- **🧪 Built-In Dev Simulator**:
  - Full offline simulation bar: 1-click test buttons, custom chat sender, bot crowd generator (1/s, 5/s, 15/s, 50/s flood), and live YouTube API connector.
- **🔊 Zero-Asset Web Audio Synthesizer**:
  - Procedurally generated retro 8-bit sound effects using the Web Audio API.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```

Open your browser to:
- **Interactive Game & Dev Console:** [http://localhost:3000](http://localhost:3000)
- **Clean OBS Browser Source Overlay:** [http://localhost:3000/?obs=true](http://localhost:3000/?obs=true)

---

## 📺 OBS Studio Setup Guide

1. Open **OBS Studio**.
2. Under **Sources**, click **`+`** and choose **Browser**.
3. Name it `YouTube Live Chat Runner`.
4. Configure the source:
   - **URL**: `http://localhost:3000/?obs=true`
   - **Width**: `1920`
   - **Height**: `1080`
   - **Custom Frame Rate**: `60`
   - Check **"Control audio via OBS"** or **"Shutdown source when not visible"** as preferred.
5. Click **OK**. The game will render cleanly at full 1080p 60FPS.

---

## 🔴 Connecting to Real YouTube Live Chat

1. Obtain a **YouTube Data API v3 Key** from the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or schedule a Live Stream on YouTube Studio.
3. Grab the **Video ID** from your stream URL (e.g., `https://youtube.com/watch?v=YOUR_VIDEO_ID`).
4. In the Dev Control Dock on [http://localhost:3000](http://localhost:3000):
   - Enter your **API Key** and **Video ID**.
   - Click **Connect Live**.
   - *(Optional)* Set `YOUTUBE_API_KEY` and `YOUTUBE_VIDEO_ID` in a `.env` file to connect automatically on launch.

---

## 💬 Chat Commands & Aliases

| Action | Recognized Commands | Description |
|---|---|---|
| **JUMP** | `jump`, `j`, `up`, `u`, `w`, `hop`, `1` | Leap over ground spikes and pits |
| **SLIDE** | `slide`, `s`, `down`, `d`, `duck`, `crouch`, `2` | Slide under overhead laser barriers |
| **LEFT** | `left`, `l`, `a`, `lane1`, `3` | Move 1 lane to the left |
| **RIGHT** | `right`, `r`, `lane3`, `4` | Move 1 lane to the right |
| **SHIELD** | `shield`, `boost`, `super`, `power`, `5` | Trigger invulnerability when crystal bar is charged |

---

## 🧪 Running Tests

```bash
npm test
```
Runs the full Vitest suite testing command parsing, anti-spam rate limiting, Anarchy/Democracy aggregation, and viewer scoring.
