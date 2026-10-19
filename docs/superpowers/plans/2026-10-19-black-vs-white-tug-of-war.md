# The Great Tug-of-War: Black vs. White — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the stream game into "The Great Tug-of-War: Black vs. White" — a 2-sided, latency-proof live interactive tug-of-war with crowned Team Captains, dual Top-10 leaderboards, and rotating relatable debate topics.

**Architecture:** A split high-contrast 1080p canvas engine running spring-damper rope physics driven by cumulative chat impulses from YouTube live comments (`BLACK`/`1` vs `WHITE`/`2`), supported by a MySQL backend tracking team loyalty, dual Top-10 rankings, and dynamic Team Captain crowning.

**Tech Stack:** Vanilla JavaScript (HTML5 Canvas + Web Audio API), PHP 8.x (PDO MySQL), MySQL, Headless Chromium, FFmpeg RTMP.

**Spec:** `docs/superpowers/specs/2026-10-19-black-vs-white-tug-of-war-design.md`

## Global Constraints
- **Zero OBS Studio Requirement**: Runs 24/7 autonomously on the server via headless Chromium and FFmpeg.
- **Latency-Proof**: Physics must accumulate force over time without instant twitch reflexes.
- **Dual Captains**: #1 contributor from Team Black and #1 contributor from Team White must be prominently crowned.
- **Dual Top-10 Leaderboards**: Left panel for Team Black Top 10; Right panel for Team White Top 10.
- **High-Contrast Aesthetic**: Left half Deep Obsidian Black (`#0F172A`), Right half Brilliant White (`#F8FAFC`).

---

### Task 1: Database Schema & API Ingestion Update

**Files:**
- Modify: `includes/db.php`
- Modify: `api/chat.php`
- Modify: `db/schema.sql`

**Interfaces:**
- Produces: `api/chat.php?poll=1` returning `{ success: true, round: {...}, pulls: { black_votes, white_votes }, captains: { black: {...}, white: {...} }, leaderboards: { black: [...], white: [...] } }`

- [ ] **Step 1: Update database schema and migrations in `includes/db.php`**
  - Add migration to alter `leaderboard` and `chat_logs` tables to include `team ENUM('BLACK', 'WHITE') DEFAULT 'BLACK'`.
  - Add query helpers to fetch Top 10 contributors for Black and Top 10 contributors for White.

- [ ] **Step 2: Update `api/chat.php` for 2-team vote classification**
  - Map incoming chat messages:
    - Team Black: `black`, `1`, `b`, `left`, `with`
    - Team White: `white`, `2`, `w`, `right`, `against`
  - Record team alignment and points for each user in MySQL.
  - Return the #1 user from Black as `captains.black` and #1 user from White as `captains.white`.
  - Return the top 10 arrays for both teams.

- [ ] **Step 3: Verify API with test requests**
  - Run PowerShell `Invoke-WebRequest -Uri 'http://localhost:8080/happy-oppenheimer/api/chat.php?poll=1'`.
  - Verify JSON payload contains dual captains and dual leaderboard arrays.

- [ ] **Step 4: Commit changes**
  - `git add includes/ api/ db/ && git commit -m "feat(api): add 2-team vote parsing, dual captains, and dual leaderboards"`

---

### Task 2: HUD HTML & CSS Redesign

**Files:**
- Modify: `game/index.html`
- Modify: `game/css/styles.css`

**Interfaces:**
- Produces: High-contrast 1080p HUD layout with Team Black captain (top-left), Team White captain (top-right), center debate topic banner, left Top-10 Black card, right Top-10 White card, and bottom force ratio bar.

- [ ] **Step 1: Restructure `game/index.html`**
  - Header:
    - Left: `#captain-black-card` with golden crown icon, captain username, and score.
    - Center: `#topic-banner` displaying current debate (e.g., `ANDROID vs. IPHONE`) and round score counters (`#wins-black` vs. `#wins-white`).
    - Right: `#captain-white-card` with silver/emerald crown icon, captain username, and score.
  - Middle:
    - Left column: `#leaderboard-black` (Top 10 Team Black).
    - Center viewport: Open area for canvas tug-of-war rope and puller stickmen.
    - Right column: `#leaderboard-white` (Top 10 Team White).
  - Footer:
    - Central force balance gauge (`#pull-gauge-bar`) showing real-time Black % vs. White %.
    - Clear chat instructions: `💬 Type 1 / BLACK or 2 / WHITE in Live Chat to Pull!`.

- [ ] **Step 2: Update `game/css/styles.css` with high-contrast styling**
  - Add `.captain-card` with pulsing gold glow animation.
  - Add `.leaderboard-panel.black` with dark obsidian glassmorphism.
  - Add `.leaderboard-panel.white` with crisp light glassmorphism.
  - Add responsive grid layout for 1920×1080 broadcast framing.

- [ ] **Step 3: Verify HTML/CSS rendering**
  - Check local preview at `http://localhost:8080/happy-oppenheimer/game/index.html`.

- [ ] **Step 4: Commit changes**
  - `git add game/index.html game/css/styles.css && git commit -m "feat(ui): implement Black vs White dual captain and leaderboard HUD layout"`

---

### Task 3: Canvas Tug-of-War Engine & Spring-Damper Physics

**Files:**
- Modify: `game/js/game.js`

**Interfaces:**
- Consumes: `api/chat.php?poll=1` payload
- Produces: Standalone canvas 60FPS physics animation of the split arena, rope, puller crowds, debate topic manager, and procedural Web Audio SFX.

- [ ] **Step 1: Implement split arena canvas background**
  - Left half: Obsidian black (`#0F172A`) with subtle neon grid and team emblem.
  - Right half: Brilliant white (`#F8FAFC`) with sleek slate grid and team emblem.
  - Center: Glowing laser threshold line and energy abyss chasm.

- [ ] **Step 2: Implement spring-damper rope physics**
  - Calculate displacement $X$ based on net pulling impulses ($F_{\text{Black}}$ vs $F_{\text{White}}$).
  - Render catenary rope curve with dynamic tension coloring (cyan $\to$ amber $\to$ hot red).
  - Center glowing flag / laser marker showing exact displacement.

- [ ] **Step 3: Implement crowd puller stickmen**
  - Spawn animated stickmen on the left (Black team) and right (White team) gripping the rope and leaning back in synchronized pulling cadence.
  - Spawning rate scales with active team chat velocity.

- [ ] **Step 4: Implement debate topic rotation & round win cycle**
  - Curate 30+ viral debate pairs (Android vs iPhone, Cats vs Dogs, Coffee vs Tea, etc.).
  - 90-second round countdown timer or instant win when rope reaches threshold ($\pm 320\text{ px}$).
  - Confetti particle explosion, royal sound fanfare, team win increment, and automatic transition to the next topic.

- [ ] **Step 5: Implement Web Audio sound effects**
  - Rope creak strain sound.
  - Crowd cheer / team surge arpeggio.
  - Royal crown trumpets for Captain promotions.
  - Round victory gong / fanfare.

- [ ] **Step 6: Add developer test hotkeys & `?test=1` hook**
  - `1` / `ArrowLeft`: Pull Black.
  - `2` / `ArrowRight`: Pull White.
  - `T`: Next debate topic.
  - `?test=1`: Pre-populates dual captains, Top 10 mock players, and active rope tension for instant verification.

- [ ] **Step 7: Verify with `node -c game/js/game.js`**

- [ ] **Step 8: Commit changes**
  - `git add game/js/game.js && git commit -m "feat(game): implement spring-damper tug-of-war physics, crowd pullers, and topic rotation"`

---

### Task 4: End-to-End Verification & 1080p Screenshot

**Files:**
- Modify: `walkthrough.md`

- [ ] **Step 1: Execute test verification script**
  - Launch Chrome headless at 1920×1080 against `http://localhost:8080/happy-oppenheimer/game/index.html?test=1`.
  - Capture `game_tugofwar_1080p.png` and verify visual layout.

- [ ] **Step 2: Update `walkthrough.md`**
  - Document the Black vs. White Tug-of-War rules, dual captains, topics, chat commands, and embed the screenshot.

- [ ] **Step 3: Final Git Commit & Summary**
  - `git add . && git commit -m "docs: update walkthrough with Black vs White Tug-of-War interactive live game"`
