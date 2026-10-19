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
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.12);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    }
    playSurge() {
      this.init();
      if (!this.ctx) return;
      const notes = [261.63, 329.63, 392.0, 523.25];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.06;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      });
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
        gain.gain.setValueAtTime(0.2, t);
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
      const fanfares = [392.0, 523.25, 659.25, 783.99];
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
  };

  // Rope Spring-Damper Physics
  const physics = {
    x: 0, // Displacement from center (px): negative = Black wins, positive = White wins
    vx: 0,
    mass: 14.0,
    damping: 0.88,
    centeringSpring: 0.045, // Mild pull to center to avoid instant blowout
    winThreshold: 310, // Pixels displacement to trigger instant win
    blackImpulse: 0,
    whiteImpulse: 0,
  };

  // Animated Pullers (Stickmen)
  const pullers = {
    black: [
      { xOffset: -120, phase: 0, force: 1 },
      { xOffset: -190, phase: 0.8, force: 1 },
      { xOffset: -260, phase: 1.6, force: 1 },
      { xOffset: -330, phase: 2.4, force: 1 },
      { xOffset: -400, phase: 3.2, force: 1 },
    ],
    white: [
      { xOffset: 120, phase: 0, force: 1 },
      { xOffset: 190, phase: 0.8, force: 1 },
      { xOffset: 260, phase: 1.6, force: 1 },
      { xOffset: 330, phase: 2.4, force: 1 },
      { xOffset: 400, phase: 3.2, force: 1 },
    ],
  };

  // Particle System (Dust, Sparks, Confetti)
  let particles = [];
  function addParticle(x, y, vx, vy, color, size, life) {
    particles.push({ x, y, vx, vy, color, size, life, maxLife: life });
  }

  function spawnConfetti(winnerTeam) {
    const colors = winnerTeam === 'BLACK' ? ['#F59E0B', '#38BDF8', '#64748B', '#FFFFFF'] : ['#F59E0B', '#10B981', '#0F172A', '#38BDF8'];
    for (let i = 0; i < 180; i++) {
      const x = 960 + (Math.random() - 0.5) * 600;
      const y = 300 + Math.random() * 200;
      const vx = (Math.random() - 0.5) * 500;
      const vy = -150 - Math.random() * 400;
      const color = colors[Math.floor(Math.random() * colors.length)];
      addParticle(x, y, vx, vy, color, Math.random() * 8 + 4, Math.random() * 2.5 + 1.5);
    }
  }

  // Floating Combat Texts
  let floatingTexts = [];
  function addFloatingText(text, x, y, color) {
    floatingTexts.push({ text, x, y, color, life: 1.4, maxLife: 1.4 });
  }

  // Apply Pull Vote
  function applyPull(team, user = 'Viewer', pts = 10) {
    sound.init();
    sound.playPull();

    const impulseAmount = 14;
    if (team === 'BLACK') {
      physics.blackImpulse += impulseAmount;
      addParticle(960 + physics.x - 40, 620, -60, -30, '#F59E0B', 4, 0.4);
      addFloatingText(`◄ ${user}`, 720, 560 + Math.random() * 40, '#F59E0B');
    } else {
      physics.whiteImpulse += impulseAmount;
      addParticle(960 + physics.x + 40, 620, 60, -30, '#38BDF8', 4, 0.4);
      addFloatingText(`${user} ►`, 1200, 560 + Math.random() * 40, '#38BDF8');
    }

    addTickerMessage(user, team);
  }

  // Add Ticker Pill to HUD
  function addTickerMessage(user, team) {
    const box = document.getElementById('chat-ticker-container');
    if (!box) return;
    const pill = document.createElement('div');
    pill.className = `ticker-pill ${team.toLowerCase()}`;
    const icon = team === 'BLACK' ? '⚫' : '⚪';
    pill.innerHTML = `<span>${icon}</span> <span><b>@${user}</b> pulled for <b>${team}</b>!</span>`;
    box.prepend(pill);
    if (box.children.length > 5) {
      box.removeChild(box.lastChild);
    }
  }

  // Next Topic Cycle
  function nextTopic() {
    gameState.currentTopicIdx = (gameState.currentTopicIdx + 1) % DEBATE_TOPICS.length;
    physics.x = 0;
    physics.vx = 0;
    gameState.roundTimeRemaining = gameState.roundDuration;
    gameState.isRoundOver = false;
    gameState.roundWinner = null;
    gameState.winnerAnnounceTimer = 0;
    updateTopicHUD();
  }

  // Trigger Round Win
  async function triggerRoundWin(winnerTeam) {
    if (gameState.isRoundOver) return;
    gameState.isRoundOver = true;
    gameState.roundWinner = winnerTeam;
    gameState.winnerAnnounceTimer = 4.0;

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

  // Keyboard Test Controls & Dev Hotkeys
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (e.key === 'ArrowLeft' || e.key === '1' || k === 'a') {
      applyPull('BLACK', 'Host', 10);
    } else if (e.key === 'ArrowRight' || e.key === '2' || k === 'd') {
      applyPull('WHITE', 'Host', 10);
    } else if (k === 't') {
      nextTopic();
    }
  });

  // Main Game Loop
  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    // Round Timer Countdown
    if (!gameState.isRoundOver) {
      gameState.roundTimeRemaining -= dt;
      if (gameState.roundTimeRemaining <= 0) {
        // Sudden-death overtime decision: side with majority displacement wins
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
    physics.blackImpulse *= 0.82;
    physics.whiteImpulse *= 0.82;

    const ax = netForce / physics.mass;
    physics.vx = (physics.vx + ax) * physics.damping;
    physics.x += physics.vx * dt * 60;

    // Check Win Threshold
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
      p.vy += 320 * dt; // Gravity
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update Floating Text
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 38 * dt;
      ft.life -= dt;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    // Animate Pullers cadence
    pullers.black.forEach(p => { p.phase += dt * (3.5 + Math.abs(physics.vx) * 0.05); });
    pullers.white.forEach(p => { p.phase += dt * (3.5 + Math.abs(physics.vx) * 0.05); });

    updateHUDGauges();
  }

  // Render Arena & Mechanics
  function render() {
    ctx.clearRect(0, 0, 1920, 1080);

    // 1. Split Arena Background
    // Left Half: Obsidian Black Realm
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 960, 1080);

    // Right Half: Brilliant Pearl White Realm
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(960, 0, 960, 1080);

    // Floor Perspective Grid Lines
    ctx.lineWidth = 1.5;
    for (let i = -8; i <= 8; i++) {
      const topX = 960 + i * 40;
      const botX = 960 + i * 140;
      ctx.strokeStyle = i < 0 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)';
      ctx.beginPath(); ctx.moveTo(topX, 480); ctx.lineTo(botX, 1080); ctx.stroke();
    }
    for (let y = 520; y < 1080; y += 60) {
      const t = (y - 520) / 560;
      const w = 400 + t * 1400;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.beginPath(); ctx.moveTo(960 - w / 2, y); ctx.lineTo(960 + w / 2, y); ctx.stroke();
    }

    // Center Energy Abyss / Laser Division Line
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(960, 200); ctx.lineTo(960, 950); ctx.stroke();

    // Laser glow line
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(960, 200); ctx.lineTo(960, 950); ctx.stroke();

    // Win Threshold Boundaries
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(960 - physics.winThreshold, 460); ctx.lineTo(960 - physics.winThreshold, 860); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(960 + physics.winThreshold, 460); ctx.lineTo(960 + physics.winThreshold, 860); ctx.stroke();
    ctx.setLineDash([]);

    // Large Team Watermark Emblems
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.font = '900 140px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚫ BLACK', 480, 540);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.035)';
    ctx.fillText('WHITE ⚪', 1440, 540);

    // 2. Heavy Rope & Strain Physics
    const ropeY = 660;
    const leftAnchorX = 320;
    const rightAnchorX = 1600;
    const centerKnotX = 960 + physics.x;

    // Cable Shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(leftAnchorX, ropeY + 45);
    ctx.quadraticCurveTo(centerKnotX, ropeY + 58, rightAnchorX, ropeY + 45);
    ctx.stroke();

    // Rope Tension Strain Color
    const tension = Math.min(1, Math.abs(physics.vx) / 12 + Math.abs(physics.x) / physics.winThreshold);
    const ropeGrad = ctx.createLinearGradient(leftAnchorX, ropeY, rightAnchorX, ropeY);
    ropeGrad.addColorStop(0, '#94A3B8');
    ropeGrad.addColorStop(0.5, tension > 0.6 ? '#EF4444' : '#F59E0B');
    ropeGrad.addColorStop(1, '#94A3B8');

    ctx.strokeStyle = ropeGrad;
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(leftAnchorX, ropeY);
    ctx.quadraticCurveTo(centerKnotX, ropeY + 12 - tension * 8, rightAnchorX, ropeY);
    ctx.stroke();

    // Steel Rope Strands
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(leftAnchorX, ropeY);
    ctx.quadraticCurveTo(centerKnotX, ropeY + 12 - tension * 8, rightAnchorX, ropeY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center Ribbon Marker
    ctx.save();
    ctx.translate(centerKnotX, ropeY + 8);
    // Pulsing indicator ring
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4; ctx.stroke();

    // Center Marker Flag
    ctx.fillStyle = physics.x < -20 ? '#EF4444' : physics.x > 20 ? '#10B981' : '#0F172A';
    ctx.beginPath();
    ctx.moveTo(-16, -18);
    ctx.lineTo(16, -18);
    ctx.lineTo(0, -42);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3. Render Stickman Crowd Pullers
    // Team Black Pullers (Pulling Left)
    pullers.black.forEach((p, idx) => {
      const baseX = centerKnotX + p.xOffset;
      const pullAngle = -0.32 + Math.sin(p.phase) * 0.08;
      drawPuller(baseX, ropeY, pullAngle, '#0F172A', '#F59E0B', p.phase, true);
    });

    // Team White Pullers (Pulling Right)
    pullers.white.forEach((p, idx) => {
      const baseX = centerKnotX + p.xOffset;
      const pullAngle = 0.32 - Math.sin(p.phase) * 0.08;
      drawPuller(baseX, ropeY, pullAngle, '#FFFFFF', '#0284C7', p.phase, false);
    });

    // 4. Render Particles
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2); ctx.fill();
    }

    // 5. Render Floating Combat Text
    for (const ft of floatingTexts) {
      const alpha = Math.min(1, ft.life / ft.maxLife);
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = alpha;
      ctx.font = '900 20px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.globalAlpha = 1.0;
    }

    // 6. Victory Overlay Announcement
    if (gameState.isRoundOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 360, 1920, 220);

      ctx.fillStyle = '#FEF08A';
      ctx.font = '900 68px "Inter", sans-serif';
      ctx.textAlign = 'center';
      const winnerName = gameState.roundWinner === 'BLACK' ? '⚫ TEAM BLACK WINS!' : '⚪ TEAM WHITE WINS!';
      ctx.fillText(winnerName, 960, 460);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px "Inter", sans-serif';
      ctx.fillText(`Next debate topic loading in ${Math.ceil(gameState.winnerAnnounceTimer)}s...`, 960, 520);
    }
  }

  // Draw a Single Stylized Stickman Puller
  function drawPuller(x, y, angle, bodyColor, teamColor, phase, isFacingLeft) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Ground Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath(); ctx.ellipse(0, 45, 26, 8, 0, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = bodyColor;
    ctx.fillStyle = bodyColor;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const hipY = 8;
    const shoulderY = -48;
    const stride = Math.sin(phase);

    // Legs (Dug deep into the floor)
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(isFacingLeft ? 22 : -22, hipY + 26);
    ctx.lineTo(isFacingLeft ? 38 + stride * 4 : -38 - stride * 4, hipY + 44);
    ctx.moveTo(0, hipY);
    ctx.lineTo(isFacingLeft ? -14 : 14, hipY + 26);
    ctx.lineTo(isFacingLeft ? -24 - stride * 4 : 24 + stride * 4, hipY + 44);
    ctx.stroke();

    // Torso
    ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(0, shoulderY); ctx.stroke();

    // Arms Gripping the Rope
    ctx.beginPath();
    ctx.moveTo(0, shoulderY);
    ctx.lineTo(isFacingLeft ? -24 : 24, -12);
    ctx.lineTo(isFacingLeft ? -14 : 14, 0);
    ctx.stroke();

    // Head
    const headY = shoulderY - 20;
    ctx.beginPath(); ctx.arc(0, headY, 17, 0, Math.PI * 2); ctx.fill();

    // Team Armband
    ctx.fillStyle = teamColor;
    ctx.fillRect(isFacingLeft ? -12 : 6, shoulderY + 8, 6, 8);

    ctx.restore();
  }

  // Update Topic HUD
  function updateTopicHUD() {
    const topic = DEBATE_TOPICS[gameState.currentTopicIdx];
    const topicTitleEl = document.getElementById('topic-title');
    if (topicTitleEl) {
      topicTitleEl.textContent = `${topic.left} vs ${topic.right}`;
    }

    const winsBlackEl = document.getElementById('wins-black-count');
    const winsWhiteEl = document.getElementById('wins-white-count');
    if (winsBlackEl) winsBlackEl.textContent = gameState.winsBlack;
    if (winsWhiteEl) winsWhiteEl.textContent = gameState.winsWhite;
  }

  // Update Dynamic HUD Gauges & Timer
  function updateHUDGauges() {
    const timerEl = document.getElementById('round-timer-text');
    if (timerEl) {
      const mins = Math.floor(Math.max(0, gameState.roundTimeRemaining) / 60);
      const secs = Math.floor(Math.max(0, gameState.roundTimeRemaining) % 60);
      timerEl.textContent = `ROUND TIME: ${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    const pctBlackEl = document.getElementById('pct-black');
    const pctWhiteEl = document.getElementById('pct-white');
    const barBlack = document.getElementById('tug-bar-black');
    const barWhite = document.getElementById('tug-bar-white');

    // Calculate percentage based on current displacement
    const dispNorm = Math.max(-1, Math.min(1, physics.x / physics.winThreshold));
    // dispNorm = -1 (100% Black) to +1 (100% White)
    const blackShare = Math.round(50 - dispNorm * 50);
    const whiteShare = 100 - blackShare;

    if (pctBlackEl) pctBlackEl.textContent = `${blackShare}%`;
    if (pctWhiteEl) pctWhiteEl.textContent = `${whiteShare}%`;
    if (barBlack) barBlack.style.width = `${blackShare}%`;
    if (barWhite) barWhite.style.width = `${whiteShare}%`;
  }

  // Update Dual Captains & Leaderboards
  function updateCaptainsAndLeaderboards(data) {
    if (!data) return;

    // 1. Captains
    const capBlack = data.captains?.black;
    const capWhite = data.captains?.white;

    const capBlackName = document.getElementById('captain-black-name');
    const capBlackScore = document.getElementById('captain-black-score');
    if (capBlack && capBlackName && capBlackScore) {
      capBlackName.textContent = `@${capBlack.user_name}`;
      capBlackScore.textContent = `${capBlack.score} pts`;
      if (gameState.lastCaptainBlackName && gameState.lastCaptainBlackName !== capBlack.user_name) {
        sound.playCrown();
      }
      gameState.lastCaptainBlackName = capBlack.user_name;
    }

    const capWhiteName = document.getElementById('captain-white-name');
    const capWhiteScore = document.getElementById('captain-white-score');
    if (capWhite && capWhiteName && capWhiteScore) {
      capWhiteName.textContent = `@${capWhite.user_name}`;
      capWhiteScore.textContent = `${capWhite.score} pts`;
      if (gameState.lastCaptainWhiteName && gameState.lastCaptainWhiteName !== capWhite.user_name) {
        sound.playCrown();
      }
      gameState.lastCaptainWhiteName = capWhite.user_name;
    }

    // 2. Dual Top 10 Leaderboards
    const lbBlack = document.getElementById('lb-list-black');
    if (lbBlack && Array.isArray(data.leaderboards?.black)) {
      lbBlack.innerHTML = '';
      if (data.leaderboards.black.length === 0) {
        lbBlack.innerHTML = '<div class="lb-empty">Type 1 or BLACK to join!</div>';
      } else {
        data.leaderboards.black.forEach((item, idx) => {
          const row = document.createElement('div');
          row.className = `lb-item ${idx === 0 ? 'captain-highlight' : ''}`;
          const rankDisplay = idx === 0 ? '👑' : `#${idx + 1}`;
          row.innerHTML = `<span class="lb-rank ${idx === 0 ? 'gold' : ''}">${rankDisplay}</span><span class="lb-name">@${item.user_name}</span><span class="lb-score">${item.score}</span>`;
          lbBlack.appendChild(row);
        });
      }
    }

    const lbWhite = document.getElementById('lb-list-white');
    if (lbWhite && Array.isArray(data.leaderboards?.white)) {
      lbWhite.innerHTML = '';
      if (data.leaderboards.white.length === 0) {
        lbWhite.innerHTML = '<div class="lb-empty">Type 2 or WHITE to join!</div>';
      } else {
        data.leaderboards.white.forEach((item, idx) => {
          const row = document.createElement('div');
          row.className = `lb-item ${idx === 0 ? 'captain-highlight' : ''}`;
          const rankDisplay = idx === 0 ? '👑' : `#${idx + 1}`;
          row.innerHTML = `<span class="lb-rank ${idx === 0 ? 'gold' : ''}">${rankDisplay}</span><span class="lb-name">@${item.user_name}</span><span class="lb-score">${item.score}</span>`;
          lbWhite.appendChild(row);
        });
      }
    }

    // 3. Velocity & Round Stats
    const velEl = document.getElementById('hud-velocity');
    if (velEl && data.velocity !== undefined) {
      velEl.textContent = `${data.velocity} msgs/s`;
    }

    if (data.round) {
      gameState.winsBlack = data.round.wins_black;
      gameState.winsWhite = data.round.wins_white;
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

  // Instant Developer & Visual Test Preview Mode (?test=1)
  if (window.location.search.includes('test=1')) {
    setTimeout(() => {
      gameState.winsBlack = 7;
      gameState.winsWhite = 9;
      updateCaptainsAndLeaderboards({
        captains: {
          black: { user_name: 'ShadowKing', score: 1240 },
          white: { user_name: 'Solaris', score: 1410 }
        },
        leaderboards: {
          black: [
            { user_name: 'ShadowKing', score: 1240 },
            { user_name: 'DarkKnight', score: 890 },
            { user_name: 'Viper99', score: 640 },
            { user_name: 'Ghost', score: 510 },
            { user_name: 'Raven', score: 430 },
            { user_name: 'Onyx', score: 380 },
            { user_name: 'Eclipse', score: 310 },
            { user_name: 'Void', score: 260 },
            { user_name: 'Phantom', score: 190 },
            { user_name: 'Obsidian', score: 140 }
          ],
          white: [
            { user_name: 'Solaris', score: 1410 },
            { user_name: 'HyperNova', score: 980 },
            { user_name: 'FrostBite', score: 720 },
            { user_name: 'Blaze', score: 610 },
            { user_name: 'Aura', score: 530 },
            { user_name: 'Starlight', score: 410 },
            { user_name: 'Zenith', score: 340 },
            { user_name: 'Apollo', score: 290 },
            { user_name: 'Crystal', score: 220 },
            { user_name: 'Polaris', score: 180 }
          ]
        },
        velocity: 4.8
      });

      // Apply initial displacement for visual demonstration
      physics.x = -65;
      physics.vx = -4;
      addTickerMessage('ShadowKing', 'BLACK');
      addTickerMessage('Solaris', 'WHITE');
      addTickerMessage('Viper99', 'BLACK');
    }, 250);
  }

  updateTopicHUD();
  setInterval(pollServerChat, 1000);
  requestAnimationFrame(loop);
})();
