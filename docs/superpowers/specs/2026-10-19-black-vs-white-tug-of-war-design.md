# The Great Tug-of-War: Black vs. White — System Design Spec

**Date**: 2026-10-19  
**Status**: Approved (Transitioning to Plan)  
**Target Platform**: 24/7 Autonomous YouTube Live Server Stream (Headless Chromium + FFmpeg RTMP)  

---

## 1. Executive Summary & Goals

This specification documents the complete architectural redesign of the 24/7 server-streamed live YouTube game from a twitch runner into **"The Great Tug-of-War: Black vs. White"** — a high-retention, tribal crowd-play game.

### Core Objectives
1. **Latency-Proof Playability**: Completely eliminate reliance on sub-second reaction timing. Momentum physics aggregate chat comments over time, making YouTube's standard 2–5 second broadcast delay an asset that builds anticipation rather than causing frustration.
2. **Tribal Rivalry & Relatable Debates**: Divide the audience into two distinct opposing teams (**⚫ TEAM BLACK** vs. **⚪ TEAM WHITE** / **WITH vs. AGAINST**) with continuously rotating viral, relatable debate topics (e.g. *Android vs. iPhone*, *Cats vs. Dogs*, *Introverts vs. Extroverts*).
3. **Crowned Team Captains**: Prominently display and crown the #1 most active contributor from each team as the **Team Captain** with custom gold crowns and live score displays.
4. **Dual Top-10 Leaderboards**: Flank the battlefield with two dedicated leaderboards tracking the Top 10 warriors from Team Black (left) and Team White (right).
5. **Zero OBS Dependency**: Autonomous server execution via existing headless Chromium screencasting, Web Audio synthesizer, and FFmpeg RTMP streaming to YouTube.

---

## 2. Gameplay & Physics Mechanics

### 2.1 The Split Arena & Tug-of-War Rope Physics
- **The Battlefield**: A 1920×1080 canvas split down the center:
  - **Left Territory**: Deep Obsidian Black (`#0F172A`) with subtle neon glow grid lines.
  - **Right Territory**: Crisp Brilliant White (`#F8FAFC`) with sleek slate grid lines.
  - **The Center Line**: An illuminated glowing threshold boundary with a central laser indicator.
- **Spring-Damper Rope Physics**:
  - A heavy energy rope / steel chain connects two team anchors across the bridge.
  - Position $X$ runs from $-400\text{ px}$ (Black Win) to $+400\text{ px}$ (White Win), with $0$ being neutral center.
  - Physics equation:
    $$\frac{d^2X}{dt^2} = \frac{F_{\text{White}} - F_{\text{Black}}}{M} - \gamma \frac{dX}{dt} - k X$$
    where $M$ is rope mass, $\gamma$ is damping friction, and $k$ is slight center-return tension to prevent runaway stalemates.
- **Pulling Impulses**:
  - Each chat vote for Black applies an instantaneous impulse force to $F_{\text{Black}}$.
  - Each chat vote for White applies an instantaneous impulse force to $F_{\text{White}}$.
  - Animated mini stickman pullers spawn dynamically along the rope on the corresponding side to visually tug in unison.

### 2.2 Relatable Debate Topics & Round Loop
- Every round is framed around an engaging, universally relatable dilemma displayed on an overhead stadium LED ribbon:
  1. `ANDROID vs. IPHONE`
  2. `INTROVERTS vs. EXTROVERTS`
  3. `DOGS vs. CATS`
  4. `COFFEE vs. TEA`
  5. `NIGHT OWL vs. EARLY BIRD`
  6. `PIZZA vs. BURGERS`
  7. `WORK FROM HOME vs. OFFICE`
  8. `SUMMER vs. WINTER`
  9. `TEXTING vs. CALLING`
  10. `MONEY vs. FREE TIME`
  *(30+ total curated pairs)*
- **Win Condition**:
  - When the center rope marker is pulled past the victory threshold line ($\pm 320\text{ px}$) or a 90-second round timer expires (side with majority territory wins).
  - Celebration sequence: Confetti cannon explosion in the winning team's colors, victorious royal gong/fanfare, team win count increments (`BLACK: 5 | WHITE: 3`), and a 5-second round transition to the next topic.

### 2.3 Team Surge Multiplier
- When a team reaches a chat velocity of $\ge 5\text{ msgs/s}$, a **TEAM SURGE** activates for 6 seconds:
  - Spawns a glowing giant golden warrior pulling on the team's anchor.
  - Multiplies pulling force by $1.75\times$.
  - Triggers an energetic audio synth arpeggio.

---

## 3. Visual & HUD Architecture (1080p 60FPS)

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  ⚫ TEAM BLACK                                                                        ⚪ TEAM WHITE     │
│  👑 CAPTAIN: @ShadowKing [1,240 pts]                               👑 CAPTAIN: @Solaris [1,410 pts]    │
│  WINS: 7                                                                           WINS: 9             │
├──────────────────────────┬───────────────────────────────────────────────┬─────────────────────────────┤
│  🏆 TOP 10 BLACK         │            🔥 TOPIC: ANDROID vs IPHONE        │   🏆 TOP 10 WHITE           │
│                          │                                               │                             │
│  #1 👑 @ShadowKing 1240  │   ⚫ 54% FORCE                  46% FORCE ⚪  │   #1 👑 @Solaris    1410    │
│  #2    @DarkKnight  890  │   [██████████████░░░░░░░░░░░░░░░░░░░░░░]          │   #2    @HyperNova   980    │
│  #3    @Viper99     640  │                                               │   #3    @FrostBite   720    │
│  #4    @Ghost       510  │             <--- [ ROPE & WARRIORS ] --->     │   #4    @Blaze       610    │
│  #5    @Raven       430  │                                               │   #5    @Aura        530    │
│  #6    @Onyx        380  │             👥 84 Pullers   👥 92 Pullers     │   #6    @Starlight   410    │
│  #7    @Eclipse     310  │                                               │   #7    @Zenith      340    │
│  #8    @Void        260  │                                               │   #8    @Apollo      290    │
│  #9    @Phantom     190  │   ROUND ENDS IN: 0:38                         │   #9    @Crystal     220    │
│  #10   @Obsidian    140  │   CHAT: Type 1 / BLACK or 2 / WHITE           │   #10   @Polaris     180    │
└──────────────────────────┴───────────────────────────────────────────────┴─────────────────────────────┘
```

### Visual Specifications
- **Left Panel (Top 10 Black)**:
  - Dark glassmorphism card (`background: rgba(15, 23, 42, 0.92); border: 1px solid #334155`).
  - Ranks #1 to #10 with gold/silver/bronze badges and live point tallies.
  - Top card crowns the **Team Captain** with pulsating golden border and crown icon.
- **Right Panel (Top 10 White)**:
  - Light glassmorphism card (`background: rgba(255, 255, 255, 0.92); border: 1px solid #CBD5E1`).
  - Ranks #1 to #10 with crisp contrast slate typography and point tallies.
  - Top card crowns the **Team Captain** with glowing emerald/gold border.
- **Center Canvas Battlefield**:
  - Clean vector graphics with high contrast.
  - Animated rope with physical catenary sagging and tension strain color shifts (Neutral Blue $\to$ High-Tension Amber $\to$ Critical Red).
  - Ticker pill stream on the bottom showing recent chat contributor votes.

---

## 4. Chat Commands & Server API Integration

### 4.1 Chat Ingestion
Viewers in YouTube live chat vote by typing:
- **For Team Black / Left**: `BLACK`, `1`, `B`, `LEFT`, `WITH`
- **For Team White / Right**: `WHITE`, `2`, `W`, `RIGHT`, `AGAINST`

### 4.2 Database Schema Update (`leaderboard` table)
Add a `team` column to track player alignment:
```sql
ALTER TABLE leaderboard ADD COLUMN team ENUM('BLACK', 'WHITE') NOT NULL DEFAULT 'BLACK';
CREATE INDEX idx_team_score ON leaderboard (team, score DESC);
```

### 4.3 `api/chat.php` Endpoint Contract
`GET /api/chat.php?poll=1` returns:
```json
{
  "success": true,
  "round": {
    "topic_left": "ANDROID",
    "topic_right": "IPHONE",
    "wins_black": 7,
    "wins_white": 9
  },
  "pulls": {
    "black_votes": 14,
    "white_votes": 11
  },
  "captains": {
    "black": { "user_name": "ShadowKing", "score": 1240 },
    "white": { "user_name": "Solaris", "score": 1410 }
  },
  "leaderboards": {
    "black": [
      { "rank": 1, "user_name": "ShadowKing", "score": 1240 },
      ...
    ],
    "white": [
      { "rank": 1, "user_name": "Solaris", "score": 1410 },
      ...
    ]
  },
  "recent_votes": [
    { "user": "NinjaX", "team": "BLACK" },
    { "user": "Aura", "team": "WHITE" }
  ]
}
```

---

## 5. Web Audio Synthesizer Specification

The standalone synthesizer generates all game audio procedurally without external audio assets:
1. **Rope Pull Strain**: Triangle wave low pitch sweep ($90\text{ Hz} \to 180\text{ Hz}$) with subtle white-noise creak.
2. **Team Surge**: Harmonic arpeggio ($C4 \to E4 \to G4 \to C5$) with reverb decay.
3. **Crown Transfer**: Royal chime sequence when a new Captain takes the #1 position.
4. **Victory Horn**: Resonant two-tone brass chime ($G4 \to C5$) on round win.

---

## 6. Verification & Testing Strategy

1. **Syntax Validation**: `node -c game/js/game.js` verified with zero errors.
2. **Backend API Validation**: Verify `api/chat.php?poll=1` returns structured dual leaderboards and captains with mock votes.
3. **Headless Chrome 1080p Screenshot**: Capture full 1920×1080 frame confirming:
   - Split Black vs. White arena rendering.
   - Dual Captain crowns and Top 10 leaderboards.
   - Tension rope, debate topic banner, and action gauges.
4. **Developer Hotkeys**:
   - `1` / `ArrowLeft`: Manual pull for Team Black.
   - `2` / `ArrowRight`: Manual pull for Team White.
   - `T`: Manually cycle to the next debate topic.
   - `?test=1` URL query parameter for automated testing.
