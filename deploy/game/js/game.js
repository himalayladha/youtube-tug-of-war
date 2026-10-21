(() => {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = 1920;
    canvas.height = 1080;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Procedural Web Audio Synthesizer
  class SoundManager {
    constructor() {
      this.ctx = null;
    }
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
    playPull() {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.12);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    }
    playCrown() {
      this.init();
      if (!this.ctx) return;
      const chords = [523.25, 659.25, 783.99, 1046.5];
      chords.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.08;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.38);
      });
    }
    playWin() {
      this.init();
      if (!this.ctx) return;
      const fanfares = [392.0, 523.25, 659.25, 783.99, 1046.5];
      fanfares.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.12;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    }
  }

  const sound = new SoundManager();

  // Curated Relatable Debate Topics
  const DEBATE_TOPICS = [
    { left: 'ANDROID', right: 'IPHONE' },
    { left: 'INTROVERT', right: 'EXTROVERT' },
    { left: 'DOGS', right: 'CATS' },
    { left: 'COFFEE', right: 'TEA' },
    { left: 'NIGHT OWL', right: 'EARLY BIRD' },
    { left: 'PIZZA', right: 'BURGERS' },
    { left: 'WORK FROM HOME', right: 'OFFICE' },
    { left: 'SUMMER', right: 'WINTER' },
    { left: 'TEXTING', right: 'CALLING' },
    { left: 'MONEY', right: 'FREE TIME' },
    { left: 'PLAYSTATION', right: 'XBOX' },
    { left: 'MOVIES', right: 'SERIES' },
    { left: 'BEACH', right: 'MOUNTAINS' },
    { left: 'SWEET', right: 'SPICY' },
    { left: 'INSTAGRAM', right: 'TIKTOK' },
    { left: 'CHESS', right: 'VIDEO GAMES' },
    { left: 'NETFLIX', right: 'YOUTUBE' },
    { left: 'BOOKS', right: 'PODCASTS' },
    { left: 'CARS', right: 'MOTORBIKES' },
    { left: 'SOLO TRAVEL', right: 'GROUP TRIP' }
  ];

  // Game State
  const gameState = {
    currentTopicIdx: 0,
    roundTimeRemaining: 90.0,
    roundDuration: 90.0,
    isRoundOver: false,
    winnerAnnounceTimer: 0,
    roundWinner: null,
    winsBlack: 0,
    winsWhite: 0,
    captainBlack: null,
    captainWhite: null,
    lastCaptainBlackName: '',
    lastCaptainWhiteName: '',
    leaderboardBlack: [],
    leaderboardWhite: [],
    velocity: 0,
    pctBlack: 50,
    pctWhite: 50,
    screenShake: 0,
    globalTime: 0
  };

  // Rope Spring-Damper Physics
  const physics = {
    x: 0, // Displacement from center (px): negative = Black wins, positive = White wins
    vx: 0,
    mass: 14.0,
    damping: 0.88,
    centeringSpring: 0.045, // Mild pull to center to maintain competitive tension
    winThreshold: 310, // Pixels displacement to trigger round victory
    blackImpulse: 0,
    whiteImpulse: 0,
  };

  // 5 Elite Armored Gladiators per side with staggered spacing
  const pullers = {
    black: [
      { xOffset: -130, phase: 0.0, force: 1.2, isLeader: true },
      { xOffset: -220, phase: 0.7, force: 1.0, isLeader: false },
      { xOffset: -310, phase: 1.4, force: 1.0, isLeader: false },
      { xOffset: -400, phase: 2.1, force: 1.0, isLeader: false },
      { xOffset: -490, phase: 2.8, force: 1.1, isLeader: false },
    ],
    white: [
      { xOffset: 130, phase: 0.0, force: 1.2, isLeader: true },
      { xOffset: 220, phase: 0.7, force: 1.0, isLeader: false },
      { xOffset: 310, phase: 1.4, force: 1.0, isLeader: false },
      { xOffset: 400, phase: 2.1, force: 1.0, isLeader: false },
      { xOffset: 490, phase: 2.8, force: 1.1, isLeader: false },
    ],
  };

  // Particle System (Sparks, Confetti, Dust)
  let particles = [];
  function addParticle(x, y, vx, vy, color, size, life, isGravity = true) {
    particles.push({ x, y, vx, vy, color, size, life, maxLife: life, isGravity });
  }

  function spawnConfetti(winnerTeam) {
    const colors = ['#FFFFFF', '#0A0D14', '#F59E0B', '#CBD5E1', '#E2E8F0'];
    for (let i = 0; i < 240; i++) {
      const x = 960 + (Math.random() - 0.5) * 900;
      const y = 200 + Math.random() * 250;
      const vx = (Math.random() - 0.5) * 700;
      const vy = -200 - Math.random() * 500;
      const color = colors[Math.floor(Math.random() * colors.length)];
      addParticle(x, y, vx, vy, color, Math.random() * 10 + 4, Math.random() * 2.8 + 1.6, true);
    }
  }

  // Floating Combat Damage/Pull Texts
  let floatingTexts = [];
  function addFloatingText(text, x, y, color) {
    floatingTexts.push({ text, x, y, color, life: 1.3, maxLife: 1.3 });
  }

  // Apply Pull Action (Tactical Command Execution)
  function applyPull(team, user = 'Viewer', pts = 10) {
    sound.init();
    sound.playPull();

    const impulseAmount = 15;
    if (team === 'BLACK') {
      physics.blackImpulse += impulseAmount;
      // Kick up tactical floor friction sparks at Black's feet
      for (let i = 0; i < 6; i++) {
        addParticle(960 + physics.x - 130 + Math.random() * 40, 725, -90 - Math.random() * 90, -20 - Math.random() * 60, '#E2E8F0', 3.5, 0.45);
      }
      addFloatingText(`◄ [ORDER EXEC] ${user} +${pts}`, 740, 560 + (Math.random() - 0.5) * 60, '#FFFFFF');
    } else {
      physics.whiteImpulse += impulseAmount;
      // Kick up tactical floor friction sparks at White's feet
      for (let i = 0; i < 6; i++) {
        addParticle(960 + physics.x + 130 + Math.random() * 40, 725, 90 + Math.random() * 90, -20 - Math.random() * 60, '#CBD5E1', 3.5, 0.45);
      }
      addFloatingText(`[ORDER EXEC] ${user} +${pts} ►`, 1180, 560 + (Math.random() - 0.5) * 60, '#FFFFFF');
    }

    // Micro screen shake
    gameState.screenShake = Math.min(8, gameState.screenShake + 1.2);

    registerChatParticipant(user, team, pts);
  }

  // 15-member benchmark rosters initialized with 0 round score & active timestamps
  const nowInit = Date.now();
  const MOCK_BLACK_ROSTER = [
    { user_name: 'ShadowKing', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'DarkKnight', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'Viper99', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'GhostOps', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'Raven', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'OnyxClaw', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'Eclipse', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'VoidWalker', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'PhantomX', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'Obsidian', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'NightStalker', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'Dreadnought', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'DoomBringer', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'IronFang', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'HellRider', score: 0, roundComments: 0, lastCommentAt: nowInit }
  ];

  const MOCK_WHITE_ROSTER = [
    { user_name: 'Solaris', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'HyperNova', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'FrostBite', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'BlazeCore', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'AuraMaster', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'Starlight', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'Zenith', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'Apollo', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'CrystalPaladin', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'Polaris', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'Valkyrie', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'SunBurst', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'RadiantKnight', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'LightBringer', score: 0, roundComments: 0, lastCommentAt: nowInit },
    { user_name: 'Celestial', score: 0, roundComments: 0, lastCommentAt: nowInit }
  ];

  // Active roster state initialized with full rosters
  let currentBlackRoster = MOCK_BLACK_ROSTER.map(item => ({ ...item }));
  let currentWhiteRoster = MOCK_WHITE_ROSTER.map(item => ({ ...item }));
  const liveChatters = [];

  // Reset round scores for captain and participants (starts at 0 in each round)
  function resetRoundCaptainScores() {
    currentBlackRoster.forEach(p => {
      p.score = 0;
      p.roundComments = 0;
    });
    currentWhiteRoster.forEach(p => {
      p.score = 0;
      p.roundComments = 0;
    });
    liveChatters.forEach(c => {
      c.score = 0;
      c.roundComments = 0;
    });

    const capBlackScore = document.getElementById('captain-black-score');
    const capWhiteScore = document.getElementById('captain-white-score');
    if (capBlackScore) capBlackScore.textContent = '0 pts';
    if (capWhiteScore) capWhiteScore.textContent = '0 pts';

    updateLeaderboardDOM('lb-list-black', currentBlackRoster.slice(0, 5), 'BLACK');
    updateLeaderboardDOM('lb-list-white', currentWhiteRoster.slice(0, 5), 'WHITE');
    refreshHorizontalScroller();
  }

  // Register Live Chat Participant: track comment count & 5-minute activity
  function registerChatParticipant(user, team, pts = 10) {
    if (!user) return;
    const now = Date.now();
    const roster = team === 'BLACK' ? currentBlackRoster : currentWhiteRoster;

    let p = roster.find(item => item.user_name === user);
    if (!p) {
      p = {
        user_name: user,
        team: team,
        score: pts,
        roundComments: 1,
        lastCommentAt: now
      };
      roster.push(p);
    } else {
      p.team = team;
      p.score = (p.score || 0) + pts;
      p.roundComments = (p.roundComments || 0) + 1;
      p.lastCommentAt = now;
    }

    // Sort roster: player with most comments becomes captain (Rank #1), score breaks tie
    roster.sort((a, b) => {
      const diffComments = (b.roundComments || 0) - (a.roundComments || 0);
      if (diffComments !== 0) return diffComments;
      return (b.score || 0) - (a.score || 0);
    });

    // Update Captain Card immediately
    const capCardName = document.getElementById(team === 'BLACK' ? 'captain-black-name' : 'captain-white-name');
    const capCardScore = document.getElementById(team === 'BLACK' ? 'captain-black-score' : 'captain-white-score');
    if (capCardName) capCardName.textContent = `@${roster[0].user_name}`;
    if (capCardScore) capCardScore.textContent = `${roster[0].score || 0} pts`;

    // Also update live chatters list
    let chatter = liveChatters.find(c => c.user_name === user && c.team === team);
    if (!chatter) {
      chatter = { user_name: user, team: team, score: pts, roundComments: 1, lastCommentAt: now };
      liveChatters.unshift(chatter);
      if (liveChatters.length > 50) liveChatters.pop();
    } else {
      chatter.score += pts;
      chatter.roundComments = (chatter.roundComments || 0) + 1;
      chatter.lastCommentAt = now;
    }

    // In-place leaderboard update without wiping/blinking
    updateLeaderboardDOM(team === 'BLACK' ? 'lb-list-black' : 'lb-list-white', roster.slice(0, 5), team);
    refreshHorizontalScroller();
  }

  // Refresh Horizontal Marquee Ribbon: strictly excludes inactive users (> 5 min)
  let lastMarqueeSig = '';
  function refreshHorizontalScroller() {
    const track = document.getElementById('roster-marquee-track');
    if (!track) return;

    const now = Date.now();
    const FIVE_MIN_MS = 5 * 60 * 1000; // 300,000 ms

    // Filter participants active within 5 minutes
    const isRecentlyActive = (item) => {
      if (!item || !item.lastCommentAt) return false;
      return (now - item.lastCommentAt) <= FIVE_MIN_MS;
    };

    const activeBlack = currentBlackRoster.filter(isRecentlyActive);
    const activeWhite = currentWhiteRoster.filter(isRecentlyActive);

    const blackRest = activeBlack.slice(5).map((item, idx) => ({
      team: 'BLACK',
      rank: idx + 6,
      user_name: item.user_name,
      score: item.score
    }));

    const whiteRest = activeWhite.slice(5).map((item, idx) => ({
      team: 'WHITE',
      rank: idx + 6,
      user_name: item.user_name,
      score: item.score
    }));

    // Interleave black and white rank 6+ supporters
    const combined = [];
    const maxLen = Math.max(blackRest.length, whiteRest.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < blackRest.length) combined.push(blackRest[i]);
      if (i < whiteRest.length) combined.push(whiteRest[i]);
    }

    // Include recent chatters active within 5 minutes who are not in Top 5 of either team
    for (const chatter of liveChatters) {
      if (!isRecentlyActive(chatter)) continue;
      const inTop5Black = activeBlack.slice(0, 5).some(u => u.user_name === chatter.user_name);
      const inTop5White = activeWhite.slice(0, 5).some(u => u.user_name === chatter.user_name);
      const alreadyInCombined = combined.some(u => u.user_name === chatter.user_name);
      if (!inTop5Black && !inTop5White && !alreadyInCombined) {
        combined.push({
          team: chatter.team,
          rank: 'LIVE',
          user_name: chatter.user_name,
          score: chatter.score
        });
      }
    }

    // Generate signature to detect real changes and prevent CSS marquee re-trigger / blink
    const currentSig = combined.map(item => `${item.team}:${item.user_name}:${item.score}:${item.rank}`).join('|');
    if (currentSig === lastMarqueeSig) return;
    lastMarqueeSig = currentSig;

    if (combined.length === 0) {
      track.innerHTML = `
        <div class="roster-chip black"><span class="chip-rank">JOIN</span><span class="chip-name">Chat 1 for Black</span><span class="chip-score">+10 pts</span></div>
        <span class="roster-chip-sep">•</span>
        <div class="roster-chip white"><span class="chip-rank">JOIN</span><span class="chip-name">Chat 2 for White</span><span class="chip-score">+10 pts</span></div>
        <span class="roster-chip-sep">•</span>
      `;
      return;
    }

    const chipsHtml = combined.map(item => `
      <div class="roster-chip ${item.team.toLowerCase()}">
        <span class="chip-rank">#${item.rank}</span>
        <span class="chip-name">@${item.user_name}</span>
        <span class="chip-score">${item.score} pts</span>
      </div>
      <span class="roster-chip-sep">•</span>
    `).join('');

    // Duplicate 3x to guarantee seamless infinite scroll across all screen widths
    track.innerHTML = chipsHtml + chipsHtml + chipsHtml;
  }

  // Next Debate Topic Cycle
  function nextTopic() {
    gameState.currentTopicIdx = (gameState.currentTopicIdx + 1) % DEBATE_TOPICS.length;
    physics.x = 0;
    physics.vx = 0;
    physics.blackImpulse = 0;
    physics.whiteImpulse = 0;
    gameState.roundTimeRemaining = gameState.roundDuration;
    gameState.isRoundOver = false;
    gameState.roundWinner = null;
    gameState.winnerAnnounceTimer = 0;
    // Captain & scores must start from zero in each round
    resetRoundCaptainScores();
    updateTopicHUD();
  }

  // Trigger Round Victory
  async function triggerRoundWin(winnerTeam) {
    if (gameState.isRoundOver) return;
    gameState.isRoundOver = true;
    gameState.roundWinner = winnerTeam;
    gameState.winnerAnnounceTimer = 4.5;
    gameState.screenShake = 16;

    if (winnerTeam === 'BLACK') gameState.winsBlack++;
    else gameState.winsWhite++;

    sound.playWin();
    spawnConfetti(winnerTeam);

    // Persist round win to server
    try {
      await fetch('../api/chat.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'round_win',
          team: winnerTeam,
          topic_idx: (gameState.currentTopicIdx + 1) % DEBATE_TOPICS.length
        })
      });
    } catch (e) {}

    updateTopicHUD();
  }

  // Keyboard Dev Controls
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (e.key === 'ArrowLeft' || e.key === '1' || k === 'a') {
      applyPull('BLACK', 'CaptainBlack', 15);
    } else if (e.key === 'ArrowRight' || e.key === '2' || k === 'd') {
      applyPull('WHITE', 'CaptainWhite', 15);
    } else if (k === 't') {
      nextTopic();
    }
  });

  // Main Game Loop
  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.08, (now - lastTime) / 1000);
    lastTime = now;
    gameState.globalTime += dt;

    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    // Screen shake decay
    if (gameState.screenShake > 0) {
      gameState.screenShake = Math.max(0, gameState.screenShake - dt * 24);
    }

    // Round Timer Countdown
    if (!gameState.isRoundOver) {
      gameState.roundTimeRemaining -= dt;
      if (gameState.roundTimeRemaining <= 0) {
        // Overtime winner: side with advantage
        const winner = physics.x < 0 ? 'BLACK' : physics.x > 0 ? 'WHITE' : (Math.random() > 0.5 ? 'BLACK' : 'WHITE');
        triggerRoundWin(winner);
      }
    } else {
      gameState.winnerAnnounceTimer -= dt;
      if (gameState.winnerAnnounceTimer <= 0) {
        nextTopic();
      }
    }

    // Physics Update
    const netForce = (physics.whiteImpulse - physics.blackImpulse) - (physics.x * physics.centeringSpring);
    physics.blackImpulse *= 0.84;
    physics.whiteImpulse *= 0.84;

    const ax = netForce / physics.mass;
    physics.vx = (physics.vx + ax) * physics.damping;
    physics.x += physics.vx * dt * 60;

    // Boundary check
    if (!gameState.isRoundOver) {
      if (physics.x <= -physics.winThreshold) {
        triggerRoundWin('BLACK');
      } else if (physics.x >= physics.winThreshold) {
        triggerRoundWin('WHITE');
      }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.isGravity) p.vy += 380 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update Floating Text
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 42 * dt;
      ft.life -= dt;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    // Animate Pullers cadence
    const effortSpeed = 3.6 + Math.abs(physics.vx) * 0.08;
    pullers.black.forEach(p => { p.phase += dt * effortSpeed; });
    pullers.white.forEach(p => { p.phase += dt * effortSpeed; });

    // Center plasma particle generation
    if (Math.random() < 0.4) {
      const knotX = 960 + physics.x;
      addParticle(knotX + (Math.random() - 0.5) * 50, 680, (Math.random() - 0.5) * 70, -30 - Math.random() * 70, '#F59E0B', 3.5, 0.45, true);
    }

    updateHUDGauges();
  }

  // ----------------------------------------------------
  // HIGH-OCTANE ESPORTS ARENA CANVAS RENDERER
  // ----------------------------------------------------
  function render() {
    ctx.save();

    // Screen Shake Offset
    if (gameState.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * gameState.screenShake;
      const shakeY = (Math.random() - 0.5) * gameState.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    ctx.clearRect(0, 0, 1920, 1080);

    // 1. Draw Colosseum Arena Architecture
    drawColosseumArena();

    // 2. Draw Center Plasma Rift & Win Thresholds
    drawCenterEnergyRift();

    // 3. Draw Heavy 3D Braided Cable & Strain
    drawHeavyCable();

    // 4. Draw Elite Armored Gladiator Pullers
    drawGladiatorTeams();

    // 5. Draw Particles (Sparks, Confetti, Smoke)
    drawParticles();

    // 6. Draw Floating Combat Pull Text
    drawFloatingCombatText();

    // 7. Victory Banner Overlay
    if (gameState.isRoundOver) {
      drawVictoryOverlay();
    }

    ctx.restore();
  }

  // 1. Colosseum Arena Architecture
  function drawColosseumArena() {
    const t = gameState.globalTime;

    // Stadium Skybox Gradient
    const bgGrad = ctx.createLinearGradient(960, 0, 960, 1080);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.42, '#0B132B');
    bgGrad.addColorStop(1, '#050A18');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1920, 1080);

    // Grand Arena Hanging Faction Banners in the rafters
    drawFactionBanner(180, 100, 140, 260, 'BLACK', '⚔️ DEFIANCE');
    drawFactionBanner(1600, 100, 140, 260, 'WHITE', '🛡️ SUPREMACY');

    // Upper Grandstands / Spectator Tiers (Seated crowd with waving light sticks)
    ctx.fillStyle = '#060B18';
    ctx.fillRect(0, 270, 1920, 170);

    // Cheering Crowd Light Sticks
    for (let x = 40; x < 1920; x += 32) {
      const stickTeam = x < 960 ? '#EF4444' : '#06B6D4';
      const wave = Math.sin(t * 3.5 + x * 0.04) * 12;
      const glow = Math.abs(Math.sin(t * 2 + x * 0.02));
      ctx.fillStyle = stickTeam;
      ctx.globalAlpha = 0.35 + glow * 0.35;
      ctx.fillRect(x, 345 + wave, 4, 18);
      // Light tip glow
      ctx.beginPath();
      ctx.arc(x + 2, 345 + wave, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Stadium Balustrade / Retaining Wall with Metallic Edge
    const wallGrad = ctx.createLinearGradient(0, 430, 0, 470);
    wallGrad.addColorStop(0, '#161C26');
    wallGrad.addColorStop(1, '#090D14');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 430, 1920, 40);

    // Monochrome Tactical Chevron Hazard Striping on Wall Edge
    ctx.fillStyle = '#E2E8F0';
    for (let x = 0; x < 1920; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 465);
      ctx.lineTo(x + 25, 465);
      ctx.lineTo(x + 10, 470);
      ctx.lineTo(x - 15, 470);
      ctx.closePath();
      ctx.fill();
    }

    // Overhead Tactical Stadium Floodlights (Monochrome with Amber Tension)
    drawVolumetricSpotlight(280, 0, 680, 720, 'rgba(255, 255, 255, 0.05)', Math.sin(t * 0.6) * 60);
    drawVolumetricSpotlight(1640, 0, 1240, 720, 'rgba(255, 255, 255, 0.05)', -Math.sin(t * 0.6) * 60);
    drawVolumetricSpotlight(960, 0, 960, 720, 'rgba(245, 158, 11, 0.07)', Math.cos(t * 0.8) * 80);

    // =========================================================================
    // LIVING CHESSBOARD BATTLEFIELD (PERSPECTIVE 3D GRANDMASTER GRID)
    // =========================================================================
    const horizonY = 470;
    const bottomY = 1080;
    const numRanks = 8;
    const numFiles = 8;
    const fileLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    // Precalculate rank Y coordinates using non-linear perspective spacing
    const rankYs = [];
    for (let r = 0; r <= numRanks; r++) {
      const p = r / numRanks;
      const y = horizonY + (bottomY - horizonY) * Math.pow(p, 1.35);
      rankYs.push(y);
    }

    // Helper to calculate file X on perspective projection
    function getFileX(fileIdx, y) {
      const normY = (y - horizonY) / (bottomY - horizonY);
      const topWidth = 920;
      const botWidth = 2200;
      const totalWidth = topWidth + normY * (botWidth - topWidth);
      const startX = 960 - totalWidth / 2;
      return startX + (fileIdx / numFiles) * totalWidth;
    }

    // Render 64 Alternating Tactical Chessboard Squares
    for (let r = 0; r < numRanks; r++) {
      const yTop = rankYs[r];
      const yBot = rankYs[r + 1];

      for (let f = 0; f < numFiles; f++) {
        const xTL = getFileX(f, yTop);
        const xTR = getFileX(f + 1, yTop);
        const xBL = getFileX(f, yBot);
        const xBR = getFileX(f + 1, yBot);

        const isDarkSquare = (r + f) % 2 === 1;
        if (isDarkSquare) {
          ctx.fillStyle = f < 4 ? '#080B10' : '#0B0F18';
        } else {
          ctx.fillStyle = f < 4 ? '#121722' : '#1A2130';
        }

        ctx.beginPath();
        ctx.moveTo(xTL, yTop);
        ctx.lineTo(xTR, yTop);
        ctx.lineTo(xBR, yBot);
        ctx.lineTo(xBL, yBot);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Render File Notation Along Front Rank Boundary
    ctx.font = '800 13px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    const labelY = 1060;
    for (let f = 0; f < numFiles; f++) {
      const xMid = (getFileX(f, labelY) + getFileX(f + 1, labelY)) / 2;
      ctx.fillStyle = f < 4 ? '#94A3B8' : '#CBD5E1';
      ctx.fillText(`[ ${fileLabels[f]} ]`, xMid, labelY);
    }

    // Render Rank Notation Along Left & Right Flank
    ctx.font = '700 11px "Chakra Petch", sans-serif';
    for (let r = 0; r < numRanks; r++) {
      const midY = (rankYs[r] + rankYs[r + 1]) / 2;
      const leftX = getFileX(0, midY) - 24;
      const rightX = getFileX(numFiles, midY) + 24;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(`R${8 - r}`, leftX, midY + 4);
      ctx.fillText(`R${8 - r}`, rightX, midY + 4);
    }

    // Large Faction Emblems Stenciled on Chessboard
    ctx.font = '900 120px "Russo One", sans-serif';
    ctx.textAlign = 'center';

    // Left Floor Faction
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillText('BLACK LEGION', 500, 630);

    // Right Floor Faction
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillText('WHITE PHALANX', 1420, 630);
  }

  // Draw Hanging Faction Stadium Banner (Monochrome Tactical)
  function drawFactionBanner(x, y, w, h, team, text) {
    ctx.save();
    const isBlack = team === 'BLACK';
    const primary = isBlack ? '#111722' : '#FFFFFF';
    const secondary = isBlack ? '#06080D' : '#E2E8F0';
    const border = isBlack ? '#475569' : '#94A3B8';

    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, primary);
    grad.addColorStop(1, secondary);

    ctx.fillStyle = grad;
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;

    // Draped banner with pointed tail
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - 26);
    ctx.lineTo(x + w / 2, y + h);
    ctx.lineTo(x, y + h - 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Banner Text
    ctx.font = '900 15px "Chakra Petch", sans-serif';
    ctx.fillStyle = isBlack ? '#FFFFFF' : '#050810';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + w / 2, y + 78);

    ctx.restore();
  }

  // Draw Soft Volumetric Spotlight Cone
  function drawVolumetricSpotlight(sourceX, sourceY, targetX, targetY, color, sweepOffset) {
    ctx.save();
    const beamGrad = ctx.createRadialGradient(sourceX, sourceY, 10, targetX + sweepOffset, targetY, 400);
    beamGrad.addColorStop(0, color);
    beamGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(sourceX - 20, sourceY);
    ctx.lineTo(sourceX + 20, sourceY);
    ctx.lineTo(targetX + sweepOffset + 240, targetY + 200);
    ctx.lineTo(targetX + sweepOffset - 240, targetY + 200);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 2. Center Tactical Demarcation Line & Checkmate Thresholds
  function drawCenterEnergyRift() {
    // Center Division: FILE D || FILE E Line
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(960, 470);
    ctx.lineTo(960, 960);
    ctx.stroke();

    // Secondary tactical dashed track
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(952, 470);
    ctx.lineTo(952, 960);
    ctx.moveTo(968, 470);
    ctx.lineTo(968, 960);
    ctx.stroke();
    ctx.setLineDash([]);

    // File Boundary Center Badge
    ctx.save();
    ctx.fillStyle = '#0A0E17';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(960 - 55, 500, 110, 22);
    ctx.fill();
    ctx.stroke();

    ctx.font = '900 11px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('FILE D ❖ FILE E', 960, 515);
    ctx.restore();

    // Checkmate / Victory Threshold Lines
    const leftGoal = 960 - physics.winThreshold;
    const rightGoal = 960 + physics.winThreshold;

    // Black Checkmate Threshold
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(leftGoal, 490);
    ctx.lineTo(leftGoal, 890);
    ctx.stroke();

    // White Checkmate Threshold
    ctx.beginPath();
    ctx.moveTo(rightGoal, 490);
    ctx.lineTo(rightGoal, 890);
    ctx.stroke();
    ctx.setLineDash([]);

    // Boundary marker chevrons
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(leftGoal, 490, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(rightGoal, 490, 6, 0, Math.PI * 2); ctx.fill();
  }

  // 3. Heavy Segmented Tactical Cable & Tension
  function drawHeavyCable() {
    const ropeY = 675;
    const leftAnchorX = 260;
    const rightAnchorX = 1660;
    const centerKnotX = 960 + physics.x;

    const tension = Math.min(1, Math.abs(physics.vx) / 10 + Math.abs(physics.x) / physics.winThreshold);
    const sag = 16 - tension * 12;

    // Cable Floor Shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(leftAnchorX, ropeY + 40);
    ctx.quadraticCurveTo(centerKnotX, ropeY + 40 + sag, rightAnchorX, ropeY + 40);
    ctx.stroke();

    // Tactical Cable Base (Dark Slate)
    ctx.strokeStyle = '#1E2532';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(leftAnchorX, ropeY);
    ctx.quadraticCurveTo(centerKnotX, ropeY + sag, rightAnchorX, ropeY);
    ctx.stroke();

    // Segmented Magnetic High-Tension Links (Black & White alternating)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6;
    ctx.setLineDash([16, 16]);
    ctx.beginPath();
    ctx.moveTo(leftAnchorX, ropeY - 3);
    ctx.quadraticCurveTo(centerKnotX, ropeY - 3 + sag, rightAnchorX, ropeY - 3);
    ctx.stroke();

    ctx.strokeStyle = '#050810';
    ctx.lineWidth = 6;
    ctx.setLineDash([16, 16]);
    ctx.lineDashOffset = 16;
    ctx.beginPath();
    ctx.moveTo(leftAnchorX, ropeY + 3);
    ctx.quadraticCurveTo(centerKnotX, ropeY + 3 + sag, rightAnchorX, ropeY + 3);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tension Warning Indicator (10% Gold highlight under high force)
    if (tension > 0.4) {
      ctx.strokeStyle = `rgba(245, 158, 11, ${tension * 0.5})`;
      ctx.lineWidth = 34;
      ctx.beginPath();
      ctx.moveTo(centerKnotX - 200, ropeY);
      ctx.lineTo(centerKnotX + 200, ropeY);
      ctx.stroke();
    }

    // High-Contrast Tactical Reticle Center Ring Clamp & Battle Pennants
    ctx.save();
    ctx.translate(centerKnotX, ropeY + sag);

    // Gilded Tactical Center Reticle (The 10% signal highlight)
    ctx.fillStyle = '#F59E0B';
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // High-Contrast Outer White Rim
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Inner Reticle Crosshair
    ctx.fillStyle = '#050810';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.lineTo(16, 0);
    ctx.moveTo(0, -16); ctx.lineTo(0, 16);
    ctx.stroke();

    // Fluttering Tactical Double Pennants
    const wave = Math.sin(gameState.globalTime * 8) * 8;
    // Left Obsidian Pennant
    ctx.fillStyle = '#0A0D14';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(-24, 68 + wave);
    ctx.lineTo(0, 54);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Alabaster Pennant
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#050810';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(24, 68 - wave);
    ctx.lineTo(0, 54);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // 4. Draw Cyber-Chessmen Gladiators (Obsidian vs Alabaster)
  function drawGladiatorTeams() {
    const ropeY = 675;
    const centerKnotX = 960 + physics.x;

    pullers.black.forEach((p) => {
      const baseX = centerKnotX + p.xOffset;
      drawGladiatorPuller(baseX, ropeY, 'BLACK', p.phase, p.isLeader);
    });

    pullers.white.forEach((p) => {
      const baseX = centerKnotX + p.xOffset;
      drawGladiatorPuller(baseX, ropeY, 'WHITE', p.phase, p.isLeader);
    });
  }

  function drawGladiatorPuller(x, y, team, phase, isLeader) {
    ctx.save();
    ctx.translate(x, y);

    const isBlack = team === 'BLACK';
    const heave = Math.sin(phase);
    const leanAngle = isBlack ? (-0.50 + heave * 0.12) : (0.50 - heave * 0.12);
    ctx.rotate(leanAngle);

    // 90% Monochrome High-Contrast Tactical Armor
    const armorPlateColor = isBlack ? '#0E131C' : '#FFFFFF';
    const armorSecondaryColor = isBlack ? '#06080D' : '#E2E8F0';
    const armorTrimColor = isBlack ? '#CBD5E1' : '#1E2532';
    const visorGlowColor = isBlack ? '#FFFFFF' : '#050810';

    const hipY = 20;

    // Rear Leg (Planted Deep in Chessboard)
    const rearX = isBlack ? 36 : -36;
    ctx.fillStyle = armorPlateColor;
    ctx.strokeStyle = armorTrimColor;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.roundRect(rearX - 8, hipY + 12, 16, 50, 4);
    ctx.fill();
    ctx.stroke();

    // Heavy Plated Boot
    ctx.fillStyle = isBlack ? '#05070B' : '#1A2130';
    ctx.fillRect(rearX - 12, hipY + 56, 26, 14);

    // Front Leg (Braced forward)
    const frontX = isBlack ? -22 : 22;
    ctx.fillStyle = armorPlateColor;
    ctx.beginPath();
    ctx.roundRect(frontX - 8, hipY + 12, 16, 50, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isBlack ? '#05070B' : '#1A2130';
    ctx.fillRect(frontX - 12, hipY + 56, 26, 14);

    // Torso / Chess Knight-Rook Breastplate
    const shoulderY = -62;
    const chestGrad = ctx.createLinearGradient(-30, shoulderY, 30, hipY);
    chestGrad.addColorStop(0, armorPlateColor);
    chestGrad.addColorStop(1, armorSecondaryColor);

    ctx.fillStyle = chestGrad;
    ctx.beginPath();
    ctx.moveTo(-22, hipY);
    ctx.lineTo(22, hipY);
    ctx.lineTo(32, shoulderY);
    ctx.lineTo(-32, shoulderY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = armorTrimColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Chest Faction Insignia / Core
    ctx.fillStyle = isLeader ? '#F59E0B' : (isBlack ? '#FFFFFF' : '#050810');
    ctx.beginPath();
    ctx.arc(0, (hipY + shoulderY) / 2, 7, 0, Math.PI * 2);
    ctx.fill();

    // Pauldrons (Sculpted Chess Armor Shoulders)
    ctx.fillStyle = isLeader ? '#F59E0B' : armorPlateColor;
    ctx.strokeStyle = isLeader ? '#FFFFFF' : armorTrimColor;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.ellipse(-32, shoulderY + 4, 16, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(32, shoulderY + 4, 16, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Arm Gripping Cable
    ctx.strokeStyle = armorTrimColor;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(isBlack ? -20 : 20, shoulderY + 12);
    ctx.lineTo(isBlack ? -36 : 36, -8);
    ctx.lineTo(isBlack ? -10 : 10, 0);
    ctx.stroke();

    // Gauntlet Fist
    ctx.fillStyle = isLeader ? '#F59E0B' : armorTrimColor;
    ctx.beginPath();
    ctx.arc(isBlack ? -10 : 10, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Cyber-Chess Helmet & Visor
    const headY = shoulderY - 26;

    ctx.fillStyle = armorPlateColor;
    ctx.strokeStyle = isLeader ? '#F59E0B' : armorTrimColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, headY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = visorGlowColor;
    ctx.beginPath();
    ctx.rect(isBlack ? -18 : 0, headY - 4, 18, 6);
    ctx.fill();

    // Grandmaster King Crown (Leader)
    if (isLeader) {
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(-20, headY - 20);
      ctx.lineTo(-14, headY - 38);
      ctx.lineTo(-5, headY - 24);
      ctx.lineTo(0, headY - 42);
      ctx.lineTo(5, headY - 24);
      ctx.lineTo(14, headY - 38);
      ctx.lineTo(20, headY - 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  // 5. Draw Active Particles
  function drawParticles() {
    for (const p of particles) {
      const alpha = Math.min(1, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  // 6. Draw Floating Combat Text (Tactical Military Telemetry)
  function drawFloatingCombatText() {
    for (const ft of floatingTexts) {
      const alpha = Math.min(1, ft.life / ft.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '900 22px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';

      // Drop shadow text
      ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
      ctx.fillText(ft.text, ft.x + 2, ft.y + 2);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  // 7. Victory Overlay Banner (Sports Broadcast Chyron Victory)
  function drawVictoryOverlay() {
    ctx.save();
    ctx.fillStyle = 'rgba(3, 7, 18, 0.95)';
    ctx.fillRect(0, 360, 1920, 240);

    const isBlack = gameState.roundWinner === 'BLACK';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 360, 1920, 240);

    ctx.font = '900 68px "Russo One", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';

    const winText = isBlack ? '⚔️ CHECKMATE // BLACK BATTALION VICTORIOUS ⚔️' : '🛡️ CHECKMATE // WHITE PHALANX VICTORIOUS 🛡️';
    ctx.fillText(winText, 960, 475);

    ctx.font = '800 24px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#F59E0B';
    const countdown = Math.ceil(gameState.winnerAnnounceTimer);
    ctx.fillText(`NEXT ROUND ENGAGEMENT COMMENCES IN ${countdown}S...`, 960, 545);

    ctx.restore();
  }

  // Update Dynamic Topic HUD & Sports Broadcast Scoreboard
  function updateTopicHUD() {
    let leftText = '';
    let rightText = '';
    if (gameState.customTopic && gameState.customTopic.left && gameState.customTopic.right) {
      leftText = gameState.customTopic.left;
      rightText = gameState.customTopic.right;
    } else {
      const topic = DEBATE_TOPICS[gameState.currentTopicIdx % DEBATE_TOPICS.length];
      leftText = topic.left;
      rightText = topic.right;
    }

    const leftEl = document.getElementById('topic-left');
    const rightEl = document.getElementById('topic-right');
    if (leftEl) leftEl.textContent = leftText;
    if (rightEl) rightEl.textContent = rightText;

    const ctaLeft = document.getElementById('cta-left-name');
    const ctaRight = document.getElementById('cta-right-name');
    if (ctaLeft) ctaLeft.textContent = leftText;
    if (ctaRight) ctaRight.textContent = rightText;

    const winsBlackEl = document.getElementById('wins-black-count');
    const winsWhiteEl = document.getElementById('wins-white-count');
    if (winsBlackEl) winsBlackEl.textContent = gameState.winsBlack;
    if (winsWhiteEl) winsWhiteEl.textContent = gameState.winsWhite;

    const tallyEl = document.getElementById('scoreboard-live-tally');
    if (tallyEl) tallyEl.textContent = `${gameState.winsBlack} — ${gameState.winsWhite}`;
  }

  // Update Dynamic HUD Gauges & Timer
  function updateHUDGauges() {
    const timerEl = document.getElementById('round-timer-text');
    if (timerEl) {
      const mins = Math.floor(Math.max(0, gameState.roundTimeRemaining) / 60);
      const secs = Math.floor(Math.max(0, gameState.roundTimeRemaining) % 60);
      timerEl.textContent = `PERIOD 1 // ${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    const pctBlackEl = document.getElementById('pct-black');
    const pctWhiteEl = document.getElementById('pct-white');
    const barBlack = document.getElementById('tug-bar-black');
    const barWhite = document.getElementById('tug-bar-white');

    const dispNorm = Math.max(-1, Math.min(1, physics.x / physics.winThreshold));
    const blackShare = Math.round(50 - dispNorm * 50);
    const whiteShare = 100 - blackShare;

    if (pctBlackEl) pctBlackEl.textContent = `${blackShare}%`;
    if (pctWhiteEl) pctWhiteEl.textContent = `${whiteShare}%`;
    if (barBlack) barBlack.style.width = `${blackShare}%`;
    if (barWhite) barWhite.style.width = `${whiteShare}%`;
  }

  // In-place DOM update for Top 5 leaderboard: zero blinking, zero reflow flashing
  function updateLeaderboardDOM(containerId, top5List, team) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!top5List || top5List.length === 0) {
      if (container.dataset.state !== 'empty') {
        container.innerHTML = `<div class="lb-empty">Type ${team === 'BLACK' ? '1 or BLACK' : '2 or WHITE'} to claim #1!</div>`;
        container.dataset.state = 'empty';
      }
      return;
    }

    if (container.dataset.state === 'empty') {
      container.innerHTML = '';
      container.dataset.state = 'list';
    }

    const crownSvg = `<svg style="width:13px;height:13px;fill:#F59E0B;filter:drop-shadow(0 0 4px rgba(245,158,11,0.8));margin-right:2px;" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5m14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>`;

    // Remove excess children if list has shrunk
    while (container.children.length > top5List.length) {
      container.removeChild(container.lastElementChild);
    }

    top5List.forEach((dataItem, idx) => {
      let row = container.children[idx];
      if (!row || !row.classList.contains('lb-item')) {
        row = document.createElement('div');
        row.className = 'lb-item';
        row.innerHTML = `<span class="lb-rank"></span><span class="lb-name"></span><span class="lb-score"></span>`;
        container.appendChild(row);
      }

      if (idx === 0) {
        if (!row.classList.contains('captain-highlight')) row.classList.add('captain-highlight');
      } else {
        if (row.classList.contains('captain-highlight')) row.classList.remove('captain-highlight');
      }

      const rankSpan = row.children[0];
      const nameSpan = row.children[1];
      const scoreSpan = row.children[2];

      const rankClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : '';
      const desiredRankClass = `lb-rank ${rankClass}`.trim();
      if (rankSpan.className !== desiredRankClass) rankSpan.className = desiredRankClass;

      if (idx === 0) {
        if (rankSpan.dataset.isCrown !== 'true') {
          rankSpan.innerHTML = crownSvg;
          rankSpan.dataset.isCrown = 'true';
        }
      } else {
        const rankText = `#${idx + 1}`;
        if (rankSpan.textContent !== rankText) {
          rankSpan.textContent = rankText;
          rankSpan.dataset.isCrown = 'false';
        }
      }

      const nameText = `@${dataItem.user_name || 'Player'}`;
      if (nameSpan.textContent !== nameText) {
        nameSpan.textContent = nameText;
      }

      const scoreText = `${dataItem.score || 0}`;
      if (scoreSpan.textContent !== scoreText) {
        scoreSpan.textContent = scoreText;
      }
    });
  }

  // Update Dual Captains & Top 5 Leaderboards & Marquee without blinking
  function updateCaptainsAndLeaderboards(data) {
    if (!data) return;

    // 1. Dual Captains (Most comments = Captain)
    const capBlack = data.captains?.black || (currentBlackRoster.length > 0 ? currentBlackRoster[0] : null);
    const capWhite = data.captains?.white || (currentWhiteRoster.length > 0 ? currentWhiteRoster[0] : null);

    const capBlackName = document.getElementById('captain-black-name');
    const capBlackScore = document.getElementById('captain-black-score');
    if (capBlack && capBlackName && capBlackScore) {
      const bName = `@${capBlack.user_name}`;
      const bScore = `${capBlack.score || 0} pts`;
      if (capBlackName.textContent !== bName) capBlackName.textContent = bName;
      if (capBlackScore.textContent !== bScore) capBlackScore.textContent = bScore;
      if (gameState.lastCaptainBlackName && gameState.lastCaptainBlackName !== capBlack.user_name) {
        sound.playCrown();
      }
      gameState.lastCaptainBlackName = capBlack.user_name;
    }

    const capWhiteName = document.getElementById('captain-white-name');
    const capWhiteScore = document.getElementById('captain-white-score');
    if (capWhite && capWhiteName && capWhiteScore) {
      const wName = `@${capWhite.user_name}`;
      const wScore = `${capWhite.score || 0} pts`;
      if (capWhiteName.textContent !== wName) capWhiteName.textContent = wName;
      if (capWhiteScore.textContent !== wScore) capWhiteScore.textContent = wScore;
      if (gameState.lastCaptainWhiteName && gameState.lastCaptainWhiteName !== capWhite.user_name) {
        sound.playCrown();
      }
      gameState.lastCaptainWhiteName = capWhite.user_name;
    }

    // Save roster for Rank 6+ scroller
    if (Array.isArray(data.leaderboards?.black)) {
      currentBlackRoster = data.leaderboards.black;
    }
    if (Array.isArray(data.leaderboards?.white)) {
      currentWhiteRoster = data.leaderboards.white;
    }

    // 2. Dual Top 5 Leaderboards without blinking
    const top5Black = currentBlackRoster.slice(0, 5);
    updateLeaderboardDOM('lb-list-black', top5Black, 'BLACK');

    const top5White = currentWhiteRoster.slice(0, 5);
    updateLeaderboardDOM('lb-list-white', top5White, 'WHITE');

    // 3. Refresh Rank 6+ & Live Chat Marquee Scroller (filtered by 5-min activity)
    refreshHorizontalScroller();

    // 4. Velocity & Round Stats
    const velVal = document.getElementById('velocity-val');
    if (velVal && data.velocity !== undefined) {
      velVal.textContent = data.velocity;
    }

    if (data.round) {
      gameState.winsBlack = data.round.wins_black;
      gameState.winsWhite = data.round.wins_white;
      if (data.round.topic_left && data.round.topic_right) {
        gameState.customTopic = {
          left: data.round.topic_left,
          right: data.round.topic_right
        };
      } else {
        gameState.customTopic = null;
        if (typeof data.round.topic_idx === 'number') {
          gameState.currentTopicIdx = data.round.topic_idx;
        }
      }
      updateTopicHUD();
    }
  }

  // Poll YouTube Live Chat API from Server
  async function pollServerChat() {
    try {
      const res = await fetch('../api/chat.php?poll=1');
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.incoming_pulls)) {
          for (const item of data.incoming_pulls) {
            applyPull(item.team, item.user);
          }
        }
        updateCaptainsAndLeaderboards(data);
      }
    } catch (e) {}
  }

  // ----------------------------------------------------
  // HIGH-ENGAGEMENT AUTOPLAY / PREVIEW & STREAM SIMULATOR
  // ----------------------------------------------------
  const isPreviewMode = window.location.search.includes('preview=1') || window.location.search.includes('test=1');

  // Periodically check and prune inactive participants from the scroll bar (5-minute inactivity rule)
  setInterval(refreshHorizontalScroller, 5000);

  // Immediately render initial topic, Top 5 leaderboards, and bottom marquee ribbon at 0 pts
  updateTopicHUD();
  resetRoundCaptainScores();

  if (isPreviewMode) {
    gameState.winsBlack = 12;
    gameState.winsWhite = 14;

    // Initial slight displacement for drama
    physics.x = -45;
    physics.vx = -3;

    // Simulate vibrant live chat activity starting from 0 pts
    setInterval(() => {
      if (gameState.isRoundOver) return;

      const isBlack = Math.random() < 0.5;
      const team = isBlack ? 'BLACK' : 'WHITE';
      const roster = isBlack ? currentBlackRoster : currentWhiteRoster;
      const userObj = roster[Math.floor(Math.random() * roster.length)];

      applyPull(team, userObj.user_name, 10);

      updateCaptainsAndLeaderboards({
        captains: {
          black: currentBlackRoster[0],
          white: currentWhiteRoster[0]
        },
        leaderboards: {
          black: currentBlackRoster,
          white: currentWhiteRoster
        },
        velocity: (4.0 + Math.random() * 3.5).toFixed(1)
      });
    }, 1100);
  }

  setInterval(pollServerChat, 1000);
  requestAnimationFrame(loop);
})();
