# YouTube Live Chat Controlled 2D Endless Runner - System Design Spec

**Date:** 2026-09-16  
**Status:** Approved  
**Target Platform:** Web (Node.js + WebSockets + HTML5 2D Canvas + OBS Studio Browser Source)  

---

## 1. System Overview

This project is an interactive, crowd-controlled 2D endless runner designed to be broadcast 24/7 on YouTube Live via OBS Studio. Viewers in YouTube Live Chat control the in-game character in real time by typing short chat commands (e.g., `jump`, `slide`, `left`, `right`).

The system consists of:
1. **Chat Ingestion & Pipeline Hub (Node.js/TypeScript backend)**:
   - **YouTube Data API v3 Poller**: Periodically fetches chat messages via `liveChatMessages.list`.
   - **Built-in Dev Simulator**: Generates synthetic viewer chatter, burst floods, and manual test triggers for 100% offline development and tuning.
   - **Command Normalizer & Anti-Spam**: Sanitizes inputs, maps command aliases, and prevents spam flooding.
   - **Dynamic Aggregation Engine**:
     - *Anarchy Mode*: FIFO action queue with smoothing for low traffic.
     - *Democracy Mode*: 1.0-second rolling voting window with on-screen visual tally gauges for high traffic.
   - **Viewer Registry & Scoring**: Tracks MVP contributors, save streaks, and community scores.
   - **WebSocket Server**: Broadcasts state, actions, vote tallies, and leaderboards to the frontend at `ws://localhost:3000/ws`.

2. **Frontend Stream Client (HTML5 2D Canvas + Web Audio + OBS HUD)**:
   - **Runner Game Engine**: 60 FPS deterministic 3-lane obstacle runner with procedural hazard generation, dynamic parallax scrolling, collision detection, and coin/crystal pickups.
   - **Stream Overlay HUD**: 1080p layout with live vote bars, chat ticker, MVP contributor podium, community distance score, and mode banner.
   - **Dev Control Dock**: Collapsible side/top dock (hidden automatically when `?obs=true` is in the URL) for local testing without YouTube credentials.

---

## 2. Command Dictionary & Alias Grammar

The parser supports case-insensitive, whitespace-trimmed commands:

| Action | Primary Aliases | Behavior |
|---|---|---|
| **JUMP** | `jump`, `j`, `up`, `u`, `w`, `hop`, `1` | Character jumps over ground obstacles (spikes, rocks, pits). |
| **SLIDE** | `slide`, `s`, `down`, `d`, `duck`, `crouch`, `2` | Character slides under low-hanging beams, laser gates, and flying drones. |
| **LEFT** | `left`, `l`, `a`, `lane1`, `3` | Shifts character left across the 3 lanes (Left, Center, Right). |
| **RIGHT** | `right`, `r`, `lane3`, `4` | Shifts character right across the 3 lanes. |
| **SHIELD** | `shield`, `boost`, `super`, `power`, `5` | Triggers invulnerability when community gem gauge hits 100%. |

---

## 3. Gameplay Mechanics

1. **3-Lane Track (Left, Center, Right)**:
   - The runner moves forward along 3 lanes.
   - Lane positions: Left (`x = 0.25 * width`), Center (`x = 0.50 * width`), Right (`x = 0.75 * width`).
2. **Obstacle Types**:
   - **Ground Hazard (Spikes/Boulders)**: Must be dodged by `JUMP` or lane shift.
   - **Overhang Hazard (Laser Gates/Pipes)**: Must be dodged by `SLIDE` or lane shift.
   - **Wall Blockades**: Blocks 1 or 2 lanes completely; must be avoided by switching to an open lane with `LEFT`/`RIGHT`.
   - **Gems & Crystals**: Collectibles floating in lanes to fill the Community Super Gauge and award bonus points.
3. **Speed Progression**:
   - Starting base speed: `300 px/sec`.
   - Gradually ramps up with distance traveled (`+10 px/sec` per 100 meters, capped at `850 px/sec`).
4. **Health & Respawn**:
   - 3 Hearts / Health points.
   - Invulnerability frames (i-frames) on hit (1.5s flash).
   - On death: 5-second community countdown before auto-restart, preserving session high scores and MVP stats.

---

## 4. Aggregation & Anti-Spam Modes

1. **Anarchy Mode (Low Chat Rate, < 5 msgs/sec)**:
   - Commands are pushed into a short FIFO queue.
   - Cooldown: 300ms per individual viewer ID.
   - Executes commands sequentially with a minimum action interval (200ms) to maintain fluid animation.
2. **Democracy Mode (High Chat Rate, >= 5 msgs/sec or manual lock)**:
   - Fixed 1000ms rolling voting tick.
   - During the 1000ms window, all viewer votes are tallied into:
     - `JUMP`: count & %
     - `SLIDE`: count & %
     - `LEFT`: count & %
     - `RIGHT`: count & %
     - `SHIELD`: count & %
   - At window expiry, the plurality winner action is executed immediately.
   - Real-time gauge updates are broadcast to clients every 100ms.

---

## 5. Architecture & File Structure

```
happy-oppenheimer/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── shared/
│   │   └── types.ts                 # Shared WebSocket schemas, commands, and game state types
│   ├── server/
│   │   ├── index.ts                 # Server entry point (Express + ws)
│   │   ├── commandParser.ts         # Command normalization & alias resolution
│   │   ├── antiSpam.ts              # Rate limiting & cooldown management
│   │   ├── aggregator.ts            # Anarchy queue & Democracy voting window engine
│   │   ├── viewerRegistry.ts        # Viewer scores, MVP calculation, contribution tracking
│   │   ├── youtubePoller.ts         # YouTube Data API v3 liveChatMessages poller
│   │   └── chatSimulator.ts         # Virtual viewer chat generator for offline testing
│   └── client/
│       ├── index.html               # Main stream canvas & OBS overlay
│       ├── styles.css               # Stream HUD styling, vote bars, ticker, dev panel
│       ├── main.ts                  # Client bootstrapping & WebSocket manager
│       ├── engine/
│       │   ├── game.ts              # Main 60 FPS loop, state machine, speed ramping
│       │   ├── player.ts            # Player physics, lane transitions, jump/slide animations
│       │   ├── obstacleManager.ts   # Procedural obstacle spawning & pooling
│       │   ├── collectibleManager.ts# Gem and power-up spawning & collision
│       │   ├── particles.ts         # Visual FX, dust, speed lines, floating popups
│       │   └── sound.ts             # Web Audio API procedural sound synthesizer (no external assets required)
│       └── ui/
│           ├── hud.ts               # Vote gauge meters, score, health, mode banner
│           ├── chatTicker.ts        # Floating chat action feed
│           ├── leaderboard.ts       # Top MVP viewers display
│           └── devDock.ts           # Collapsible interactive test console (hidden with ?obs=true)
└── test/
    ├── commandParser.test.ts
    ├── antiSpam.test.ts
    ├── aggregator.test.ts
    └── viewerRegistry.test.ts
```

---

## 6. Verification & Test Plan

1. **Unit Tests (Vitest / Node Test Runner)**:
   - `commandParser.test.ts`: Verify alias mapping, case insensitivity, number matching, and invalid input rejection.
   - `antiSpam.test.ts`: Verify per-user cooldown enforcement and burst prevention.
   - `aggregator.test.ts`: Verify Anarchy queue draining and Democracy voting window tallies/tie-breaking.
   - `viewerRegistry.test.ts`: Verify contributor score accumulation and top-N ranking.
2. **Manual & OBS Integration Verification**:
   - Launch server with `npm run dev`.
   - Open browser at `http://localhost:3000`.
   - Verify Dev Dock triggers simulate viewer comments (`JUMP`, `SLIDE`, `LEFT`, `RIGHT`) with instant player reaction.
   - Open simulated flood mode (100 chatters/sec) -> confirm seamless auto-switch to Democracy mode with live percentage bars.
   - Verify `http://localhost:3000/?obs=true` hides dev tools and presents a clean 1080p broadcast stream overlay.
