# 🏃 Stickman Subway Runner - YouTube Live Chat Controller

A simple, fast, and addictive **Stickman runner** with an above-camera perspective (like Subway Surfers) controlled entirely by YouTube Live Chat comments via OBS Studio.

---

## 🎮 How It Works

Viewers in your YouTube Live stream type **3 simple commands** to control the on-screen Stickman running forward down the tracks:

| Action | Recognized Live Chat Commands | In-Game Effect |
|---|---|---|
| **◄ LEFT** | `left`, `l`, `a`, `lane1`, `1` | Shifts Stickman to the left lane |
| **▲ JUMP** | `jump`, `j`, `w`, `up`, `u`, `hop`, `2` | Leaps into the air over low barriers & hurdles |
| **► RIGHT** | `right`, `r`, `d`, `lane3`, `3` | Shifts Stickman to the right lane |

---

## ✨ Features

- **🎥 Subway Surfers Above/Behind Camera POV**:
  - 3 dynamic tracks converging to a 3D horizon vanishing point.
  - High-speed track cross-ties and subway arches rushing forward.
  - Animated Stickman seen from behind/above with running strides, lane tilting, and mid-air jumps with track drop-shadows.
- **⚡ Dual Ingestion Modes**:
  - **Anarchy Mode**: Every comment triggers moves immediately (ideal for low-traffic streams).
  - **Democracy Mode**: Rolling 1-second voting window with live on-screen percentage bars: **LEFT** vs **JUMP** vs **RIGHT**.
  - **Auto-Switching**: Automatically toggles between Anarchy and Democracy as chat velocity increases.
- **🚧 Clear Obstacles & Mechanics**:
  - **Low Hurdles**: Must be jumped over (`JUMP`) or dodged (`LEFT`/`RIGHT`).
  - **High Walls / Trains**: Cannot be jumped over; must be avoided by switching lanes (`LEFT`/`RIGHT`).
  - **Double Barriers**: Blocks 2 lanes simultaneously, forcing chat to coordinate toward the single open lane.
  - **Gold Coins**: Collectible bonus points along tracks.
- **📺 OBS Studio 1080p Overlay Ready**:
  - Add `http://localhost:3000/?obs=true` as an OBS Browser Source for a clean broadcast overlay.
- **🛠️ Built-in Dev Simulator**:
  - Includes a bottom control bar with 1-click test buttons (`◄ Left`, `▲ Jump`, `► Right`), keyboard controls (`A`/`W`/`D` or Arrow keys), and simulated viewer crowd surges.

---

## 🚀 Quick Start

### 1. Start the Server
```bash
npm run dev
```

### 2. Open in Browser
- **Interactive Game & Dev Console:** [http://localhost:3000](http://localhost:3000)
- **Clean OBS Studio Overlay:** [http://localhost:3000/?obs=true](http://localhost:3000/?obs=true)

### 3. Connect to YouTube Live
1. Get a **YouTube Data API v3 Key** from Google Cloud Console.
2. In the bottom Controls Dock (press `H` if collapsed), paste your **API Key** and **Live Video ID**, then click **Connect Live**.
3. Viewers can now control the Stickman directly from YouTube chat!
