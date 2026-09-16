# YouTube Live Chat Controlled 2D Endless Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, production-ready, interactive YouTube Live Chat controlled 2D endless runner game with WebSocket backend, real YouTube API ingestion, dev simulation tools, Anarchy/Democracy voting mechanics, and an OBS Studio 1080p stream overlay.

**Architecture:** Node.js/TypeScript backend handles YouTube Data API v3 chat polling, anti-spam, alias parsing, and dynamic aggregation (Anarchy vs Democracy), streaming state via WebSockets to a hardware-accelerated HTML5 2D Canvas runner and stream HUD.

**Tech Stack:** TypeScript, Node.js, Express, `ws` (WebSockets), Vite, Vitest, HTML5 2D Canvas, Web Audio API.

**Spec:** `docs/superpowers/specs/2026-09-16-youtube-live-runner-design.md`

## Global Constraints
- **Platform:** Modern Chromium/OBS Browser Source compatible.
- **Resolution:** Designed for crisp 1920x1080 (16:9) streaming.
- **Dependencies:** Lightweight, zero external heavy game engine requirements; 100% runnable via `npm run dev`.
- **Testing:** Strict TDD for all backend business logic (command parser, anti-spam, aggregator, viewer registry).

---

### Task 1: Project Scaffolding & TypeScript Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/shared/types.ts`

**Interfaces:**
- Produces: `src/shared/types.ts` containing `GameAction`, `CommandMessage`, `VoteTally`, `ViewerContribution`, `ServerToClientEvent`, `ClientToServerEvent`.

- [ ] **Step 1: Create `package.json` with dependencies and scripts**
- [ ] **Step 2: Create `tsconfig.json` with modern ES/Node settings**
- [ ] **Step 3: Create `vite.config.ts` configured for dev server and WebSocket proxy**
- [ ] **Step 4: Create `src/shared/types.ts` with all core interfaces**
- [ ] **Step 5: Run `npm install` and verify dependencies install cleanly**
- [ ] **Step 6: Commit scaffolding files**

---

### Task 2: Backend Command Parser & Alias Grammar

**Files:**
- Create: `src/server/commandParser.ts`
- Test: `test/commandParser.test.ts`

**Interfaces:**
- Produces: `parseCommand(rawText: string): GameAction | null`

- [ ] **Step 1: Write failing unit test `test/commandParser.test.ts` for aliases (`jump`, `j`, `1`, `slide`, `s`, `left`, `right`, `shield`, whitespace/case insensitivity, unknown commands)**
- [ ] **Step 2: Run `npx vitest run test/commandParser.test.ts` (expect FAIL)**
- [ ] **Step 3: Implement `src/server/commandParser.ts`**
- [ ] **Step 4: Run `npx vitest run test/commandParser.test.ts` (expect PASS)**
- [ ] **Step 5: Commit `commandParser`**

---

### Task 3: Anti-Spam & Rate Limiting Module

**Files:**
- Create: `src/server/antiSpam.ts`
- Test: `test/antiSpam.test.ts`

**Interfaces:**
- Produces: `class AntiSpamLimiter { isAllowed(userId: string): boolean; getVelocity(): number; }`

- [ ] **Step 1: Write failing unit test `test/antiSpam.test.ts` verifying 300ms per-user cooldown, velocity tracking, and rate window calculations**
- [ ] **Step 2: Run `npx vitest run test/antiSpam.test.ts` (expect FAIL)**
- [ ] **Step 3: Implement `src/server/antiSpam.ts`**
- [ ] **Step 4: Run `npx vitest run test/antiSpam.test.ts` (expect PASS)**
- [ ] **Step 5: Commit `antiSpam`**

---

### Task 4: Aggregation Engine (Anarchy & Democracy Modes)

**Files:**
- Create: `src/server/aggregator.ts`
- Test: `test/aggregator.test.ts`

**Interfaces:**
- Produces: `class CommandAggregator { addVote(user: string, action: GameAction): void; setMode(mode: 'anarchy' | 'democracy' | 'auto'): void; tick(deltaMs: number): AggregatorTickResult; }`

- [ ] **Step 1: Write failing unit test `test/aggregator.test.ts` for Anarchy FIFO queue, Democracy 1.0s window voting tallies, tie-breaking, and auto-mode switching**
- [ ] **Step 2: Run `npx vitest run test/aggregator.test.ts` (expect FAIL)**
- [ ] **Step 3: Implement `src/server/aggregator.ts`**
- [ ] **Step 4: Run `npx vitest run test/aggregator.test.ts` (expect PASS)**
- [ ] **Step 5: Commit `aggregator`**

---

### Task 5: Viewer Registry & Scoring/MVP Engine

**Files:**
- Create: `src/server/viewerRegistry.ts`
- Test: `test/viewerRegistry.test.ts`

**Interfaces:**
- Produces: `class ViewerRegistry { recordVote(userId: string, userName: string): void; recordSuccessfulDodge(userId: string, points: number): void; getLeaderboard(limit?: number): ViewerStats[]; }`

- [ ] **Step 1: Write failing unit test `test/viewerRegistry.test.ts` for viewer stats, points accumulation, and top-N leaderboard**
- [ ] **Step 2: Run `npx vitest run test/viewerRegistry.test.ts` (expect FAIL)**
- [ ] **Step 3: Implement `src/server/viewerRegistry.ts`**
- [ ] **Step 4: Run `npx vitest run test/viewerRegistry.test.ts` (expect PASS)**
- [ ] **Step 5: Commit `viewerRegistry`**

---

### Task 6: YouTube Live Chat Poller & Dev Chat Simulator

**Files:**
- Create: `src/server/youtubePoller.ts`
- Create: `src/server/chatSimulator.ts`
- Test: `test/chatSimulator.test.ts`

**Interfaces:**
- Produces: `class YouTubePoller { start(): void; stop(): void; setCredentials(apiKey: string, videoId: string): void; }`
- Produces: `class ChatSimulator { start(msgsPerSec: number): void; stop(): void; burst(count: number): void; trigger(user: string, cmd: string): void; }`

- [ ] **Step 1: Write failing unit test `test/chatSimulator.test.ts` testing simulated message generation, burst mode, and manual triggers**
- [ ] **Step 2: Run `npx vitest run test/chatSimulator.test.ts` (expect FAIL)**
- [ ] **Step 3: Implement `src/server/chatSimulator.ts` and `src/server/youtubePoller.ts`**
- [ ] **Step 4: Run `npx vitest run test/chatSimulator.test.ts` (expect PASS)**
- [ ] **Step 5: Commit poller and simulator**

---

### Task 7: Express Server & WebSocket Dispatcher

**Files:**
- Create: `src/server/index.ts`

**Interfaces:**
- Produces: Express HTTP server serving static client + WebSocket endpoint at `/ws`.

- [ ] **Step 1: Create `src/server/index.ts` connecting Express, `ws`, `CommandParser`, `AntiSpamLimiter`, `CommandAggregator`, `ViewerRegistry`, `YouTubePoller`, and `ChatSimulator`**
- [ ] **Step 2: Verify server starts cleanly and accepts WebSocket connections**
- [ ] **Step 3: Commit server integration**

---

### Task 8: Frontend Game Engine - 2D Canvas Runner Core

**Files:**
- Create: `src/client/engine/player.ts`
- Create: `src/client/engine/obstacleManager.ts`
- Create: `src/client/engine/collectibleManager.ts`
- Create: `src/client/engine/particles.ts`
- Create: `src/client/engine/game.ts`

**Interfaces:**
- Produces: `class Game { start(): void; executeAction(action: GameAction, actorName: string): void; update(dt: number): void; render(ctx: CanvasRenderingContext2D): void; }`

- [ ] **Step 1: Implement `player.ts` with 3-lane positioning, jump arc physics, slide state, i-frames, and animated sprite rendering**
- [ ] **Step 2: Implement `obstacleManager.ts` with ground spikes, overhang lasers, and wall roadblocks**
- [ ] **Step 3: Implement `collectibleManager.ts` for glowing crystals, coin pickups, and super meter**
- [ ] **Step 4: Implement `particles.ts` for speed trails, dust kicks, sparkle pickups, and floating save text (`@Alex +50!` popup)**
- [ ] **Step 5: Implement `game.ts` coordinating loop, speed scaling, health system, score, and game over countdown**
- [ ] **Step 6: Commit game engine core**

---

### Task 9: Frontend Web Audio Synthesizer (Zero External Audio Assets)

**Files:**
- Create: `src/client/engine/sound.ts`

**Interfaces:**
- Produces: `class SoundManager { playJump(): void; playSlide(): void; playCollect(): void; playHit(): void; playPowerup(): void; playGameOver(): void; }`

- [ ] **Step 1: Implement `sound.ts` using Web Audio API oscillators and gain envelopes for retro synth sound effects**
- [ ] **Step 2: Integrate `SoundManager` into `game.ts`**
- [ ] **Step 3: Commit sound engine**

---

### Task 10: Stream HUD & Live Overlay Components

**Files:**
- Create: `src/client/ui/hud.ts`
- Create: `src/client/ui/chatTicker.ts`
- Create: `src/client/ui/leaderboard.ts`
- Create: `src/client/styles.css`

**Interfaces:**
- Produces: Visual vote gauge bars, mode banners, active chat feed ticker, and session MVP ranking cards.

- [ ] **Step 1: Create `src/client/styles.css` with cyberpunk / arcade neon broadcast styling**
- [ ] **Step 2: Implement `hud.ts` with real-time percentage bars for Democracy voting and distance/health/shield meters**
- [ ] **Step 3: Implement `chatTicker.ts` with smooth animated chat message pill feeds**
- [ ] **Step 4: Implement `leaderboard.ts` displaying top community players**
- [ ] **Step 5: Commit HUD overlay components**

---

### Task 11: Dev Control Dock & OBS Integration

**Files:**
- Create: `src/client/ui/devDock.ts`
- Create: `src/client/main.ts`
- Create: `src/client/index.html`

**Interfaces:**
- Produces: Collapsible testing dock with 1-click triggers, chatter bot speed sliders, YouTube credentials form, and auto-hide on `?obs=true`.

- [ ] **Step 1: Implement `devDock.ts` for interactive manual & synthetic testing**
- [ ] **Step 2: Implement `src/client/main.ts` establishing WebSocket connection and wiring UI to engine**
- [ ] **Step 3: Create `src/client/index.html` with 1080p responsive canvas container and HUD overlay**
- [ ] **Step 4: Verify `?obs=true` hides dev tools and maximizes overlay cleanliness**
- [ ] **Step 5: Commit Dev Dock and client bootstrap**

---

### Task 12: Full Verification, Documentation & Walkthrough

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run all unit tests (`npm test`) and verify 100% pass rate**
- [ ] **Step 2: Launch `npm run build` and `npm run dev` to verify complete execution**
- [ ] **Step 3: Write comprehensive `README.md` with OBS setup instructions, YouTube API setup, and hotkeys**
- [ ] **Step 4: Commit all final polish**
