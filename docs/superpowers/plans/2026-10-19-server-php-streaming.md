# Server-Side YouTube Live Streamer with PHP, MySQL & Setup Wizard - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete server-side YouTube Live livestreaming system with PHP, MySQL, a 3-step First-Time Setup Wizard, a protected Admin Dashboard with Start/Stop streaming controls, and an autonomous Headless Chromium + FFmpeg streaming daemon that broadcasts directly to YouTube 24/7 without OBS.

**Architecture:** A PHP web hub provides the setup wizard and admin dashboard, storing credentials and stream logs in MySQL. When "Start Streaming" is triggered, PHP spawns a background Node.js streaming daemon that renders the HTML5 Stickman game in Headless Chromium and pipes 1080p video directly into FFmpeg targeting YouTube's RTMP server.

**Tech Stack:** PHP 8.x, MySQL 8.x / MariaDB, Node.js, Puppeteer (Chromium), FFmpeg, HTML5 2D Canvas, Web Audio API, Vanilla CSS (Frosted Light Theme).

**Spec:** `docs/superpowers/specs/2026-10-19-server-php-streaming-design.md`

## Global Constraints
- **Platform:** Linux VPS (Ubuntu/Debian) & Local XAMPP/PHP development environments.
- **Language / Runtime:** PHP 8.x (PDO MySQL), Node.js (for headless stream daemon), FFmpeg.
- **Security:** Bcrypt password hashing, session-based auth, PDO prepared statements, setup lock prevention.
- **Dependencies:** Self-contained; provides `install.sh` for Ubuntu/Debian server provisioning.

---

### Task 1: Database Schema & Migration Foundation

**Files:**
- Create: `db/schema.sql`
- Create: `includes/db.php`
- Test: `test/db_test.php`

**Interfaces:**
- Produces: `getDbConnection(array $config): PDO`
- Produces: `runSchemaMigration(PDO $pdo, string $sqlPath): bool`

- [x] **Step 1: Create `db/schema.sql` defining `settings`, `stream_sessions`, `leaderboard`, and `chat_logs` tables**
- [x] **Step 2: Create `includes/db.php` with robust PDO connection logic and schema migration helper**
- [x] **Step 3: Create automated verification script `test/db_test.php`**
- [x] **Step 4: Run `C:\xampp\php\php.exe test/db_test.php` to verify database connection and table creation**
- [x] **Step 5: Commit Task 1**

---

### Task 2: First-Time Setup Wizard

**Files:**
- Create: `setup.php`
- Create: `config.sample.php`
- Modify: `includes/db.php`

**Interfaces:**
- Produces: `setup.php` (3-step wizard: Database setup -> YouTube API & Stream Key -> Admin security)
- Produces: `config.php` (written dynamically upon wizard completion)

- [x] **Step 1: Create `config.sample.php` as template for dynamic config generation**
- [x] **Step 2: Implement `setup.php` with clean, modern frosted-light UI, responsive cards, and live AJAX connection test**
- [x] **Step 3: Add Step 1 (DB test & table creation), Step 2 (YouTube API Key, RTMP Stream Key, Video ID), and Step 3 (Admin account & bcrypt password hash)**
- [x] **Step 4: Enforce lock file / `db_installed` check so `setup.php` cannot be run twice**
- [x] **Step 5: Verify setup wizard execution and commit Task 2**

---

### Task 3: Admin Authentication & Session Security

**Files:**
- Create: `includes/auth.php`
- Create: `admin/login.php`
- Create: `admin/logout.php`

**Interfaces:**
- Produces: `verifyAdminLogin(string $password): bool`
- Produces: `requireAdminAuth(): void`
- Produces: `logoutAdmin(): void`

- [x] **Step 1: Implement `includes/auth.php` with session initiation, bcrypt verification, and redirection gates**
- [x] **Step 2: Implement `admin/login.php` with frosted light theme card and error feedback**
- [x] **Step 3: Implement `admin/logout.php` cleanly destroying sessions and redirecting to login**
- [x] **Step 4: Verify authentication flow and commit Task 3**

---

### Task 4: Admin Dashboard & Stream Controls

**Files:**
- Create: `admin/index.php`
- Create: `api/settings.php`

**Interfaces:**
- Produces: `admin/index.php` (Stream Status Badge, [▶ Start Streaming] and [⏹ Stop Streaming] buttons, stats, log viewer)
- Produces: `api/settings.php` (REST endpoint for updating Stream Key, Video ID, and stream presets)

- [x] **Step 1: Implement `api/settings.php` handling GET/POST for stream configurations**
- [x] **Step 2: Implement `admin/index.php` dashboard with live status pill, action buttons, telemetry cards, and embedded game preview**
- [x] **Step 3: Add real-time log viewer streaming the latest output from `streamer/stream.log`**
- [x] **Step 4: Verify dashboard UI rendering and commit Task 4**

---

### Task 5: Server-Side Headless Streaming Engine & Process Controller

**Files:**
- Create: `streamer/package.json`
- Create: `streamer/stream_daemon.js`
- Create: `api/stream.php`

**Interfaces:**
- Produces: `api/stream.php?action=start` (spawns background streaming daemon)
- Produces: `api/stream.php?action=stop` (terminates daemon & FFmpeg)
- Produces: `api/stream.php?action=status` (returns PID, uptime, active status)
- Produces: `stream_daemon.js` (Headless Chromium -> FFmpeg -> YouTube RTMP)

- [x] **Step 1: Create `streamer/package.json` with Puppeteer dependency**
- [x] **Step 2: Implement `streamer/stream_daemon.js` using Chromium screencast and piping raw frames directly to FFmpeg**
- [x] **Step 3: Implement `api/stream.php` managing process lifecycle (start, stop, status, logs)**
- [x] **Step 4: Test process spawning and status reporting, then commit Task 5**

---

### Task 6: YouTube Live Chat API Ingestion & Game Bridge

**Files:**
- Create: `includes/youtube.php`
- Create: `api/chat.php`

**Interfaces:**
- Produces: `pollLiveChatMessages(string $apiKey, string $videoId): array`
- Produces: `api/chat.php` (returns recent commands and current voting tallies)

- [x] **Step 1: Implement `includes/youtube.php` querying YouTube Data API v3 `liveChatMessages.list` and caching `nextPageToken`**
- [x] **Step 2: Implement `api/chat.php` delivering JSON feed of chat commands to the game canvas**
- [x] **Step 3: Add viewer scoring updates into MySQL `leaderboard` and `chat_logs`**
- [x] **Step 4: Verify chat poller logic and commit Task 6**

---

### Task 7: Game Canvas & Public Stream Landing Page

**Files:**
- Create: `game/index.html`
- Create: `game/js/game.js`
- Create: `index.php`

**Interfaces:**
- Produces: `game/index.html` (light theme Subway Surfers stickman game rendered by the headless stream daemon)
- Produces: `index.php` (public landing page with live status and stream embed)

- [x] **Step 1: Package the lightweight 3-lane stickman game inside `game/` with auto-polling of `../api/chat.php`**
- [x] **Step 2: Create `index.php` as the public landing page showing live stream preview, player stats, and instructions**
- [x] **Step 3: Test game loading in standalone browser and commit Task 7**

---

### Task 8: Server Installation Script & Final Verification

**Files:**
- Create: `install.sh`
- Modify: `README.md`

**Interfaces:**
- Produces: Automated single-command installation for Ubuntu/Debian VPS
- Produces: Comprehensive setup and usage documentation

- [x] **Step 1: Create `install.sh` installing Apache, PHP 8.x, MySQL, Node.js, and FFmpeg**
- [x] **Step 2: Update `README.md` with complete step-by-step VPS hosting instructions**
- [x] **Step 3: Perform full end-to-end verification of setup wizard, database migration, and dashboard**
- [x] **Step 4: Commit all final files**
