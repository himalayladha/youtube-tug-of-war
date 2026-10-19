# Implementation Plan: Subway Surfers Deluxe Engine Upgrade

**Goal**: Upgrade the 24/7 autonomous server game engine with 3D Subway Trains, Railway Environment & Signals, Power-Ups (Magnet, Super Boots, Jetpack), and a Pursuing Police Inspector.

---

### Task 1: Power-Up System & Particle FX Engine
- **Files**:
  - `game/js/game.js`
  - `game/index.html`
  - `game/css/styles.css`
- **Interfaces**:
  - `powerups`: Array of active power-up tokens on tracks `{ type, lane, z, collected }`
  - `player.powerupState`: `{ type: 'MAGNET'|'BOOTS'|'JETPACK'|null, timer, maxTimer }`
  - Coin magnet attractor: Pulls coins from all lanes towards `(footX, footY)` when magnet is active.
  - Super Boots: Increases jump power to `1500 px/s` with bouncy sound and spring animation.
  - Jetpack: Elevates player to flight altitude, spawns dual jet thruster particles, and disables ground obstacle collisions.
  - HUD Power-up Meter: Displays glowing icon and countdown bar.

---

### Task 2: 3D Subway Train Carriages & Railway Environment
- **Files**:
  - `game/js/game.js`
- **Interfaces**:
  - New obstacle type: `TRAIN`
  - 3D perspective box rendering with front grill, windshield, illuminated side windows, and roof walkway.
  - Overhead steel catenary gantry arches with 3-lane railway traffic lights (🔴 / 🟢).
  - Side concrete retaining walls with street graffiti motifs.

---

### Task 3: Pursuing Police Inspector & Dog
- **Files**:
  - `game/js/game.js`
- **Interfaces**:
  - `inspector`: Tracks behind the player ($Z \approx 60$).
  - Runs in sync with track speed; surges closer on crash/trip with whistle sound effect, retreats during sustained clean runs.

---

### Task 4: End-to-End Verification & Commit
- Verify JavaScript syntax with Node.js.
- Verify live execution and HUD on XAMPP Apache (`http://localhost:8080/happy-oppenheimer/game/index.html?preview=1`).
- Commit changes to Git.
