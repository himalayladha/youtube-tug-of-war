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
    const colors = winnerTeam === 'BLACK' ? ['#F59E0B', '#EF4444', '#38BDF8', '#FFFFFF'] : ['#F59E0B', '#06B6D4', '#10B981', '#FFFFFF'];
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

  // Apply Pull Action
  function applyPull(team, user = 'Viewer', pts = 10) {
    sound.init();
    sound.playPull();

    const impulseAmount = 15;
    if (team === 'BLACK') {
      physics.blackImpulse += impulseAmount;
      // Kick up floor sparks at Black's feet
      for (let i = 0; i < 6; i++) {
        addParticle(960 + physics.x - 130 + Math.random() * 40, 725, -90 - Math.random() * 90, -20 - Math.random() * 60, '#F59E0B', 4.5, 0.45);
      }
      addFloatingText(`◄ ${user} +${pts}`, 740, 560 + (Math.random() - 0.5) * 60, '#F59E0B');
    } else {
      physics.whiteImpulse += impulseAmount;
      // Kick up floor sparks at White's feet
      for (let i = 0; i < 6; i++) {
        addParticle(960 + physics.x + 130 + Math.random() * 40, 725, 90 + Math.random() * 90, -20 - Math.random() * 60, '#38BDF8', 4.5, 0.45);
      }
      addFloatingText(`${user} +${pts} ►`, 1180, 560 + (Math.random() - 0.5) * 60, '#38BDF8');
    }

    // Micro screen shake
    gameState.screenShake = Math.min(8, gameState.screenShake + 1.2);

    addTickerMessage(user, team);
  }

  // Add Live Ticker Pill to HUD
  function addTickerMessage(user, team) {
    const box = document.getElementById('chat-ticker-container');
    if (!box) return;
    const pill = document.createElement('div');
    pill.className = `ticker-pill ${team.toLowerCase()}`;
    const icon = team === 'BLACK' ? '⚔️' : '🛡️';
    pill.innerHTML = `<span>${icon}</span> <span><b>@${user}</b> pulled for <b>TEAM ${team}</b>!</span>`;
    box.prepend(pill);
    if (box.children.length > 5) {
      box.removeChild(box.lastChild);
    }
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
    wallGrad.addColorStop(0, '#1E293B');
    wallGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 430, 1920, 40);

    // Hazard Safety Striping on Wall Edge
    ctx.fillStyle = '#F59E0B';
    for (let x = 0; x < 1920; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 465);
      ctx.lineTo(x + 25, 465);
      ctx.lineTo(x + 10, 470);
      ctx.lineTo(x - 15, 470);
      ctx.closePath();
      ctx.fill();
    }

    // Volumetric Overhead Stadium Floodlights (Sweeping down from arena lights)
    drawVolumetricSpotlight(280, 0, 680, 720, 'rgba(239, 68, 68, 0.08)', Math.sin(t * 0.6) * 60);
    drawVolumetricSpotlight(1640, 0, 1240, 720, 'rgba(6, 182, 212, 0.08)', -Math.sin(t * 0.6) * 60);
    drawVolumetricSpotlight(960, 0, 960, 720, 'rgba(245, 158, 11, 0.09)', Math.cos(t * 0.8) * 80);

    // Arena Floor: Dual Faction Ground Plates
    // Left: Obsidian Battleground
    const floorBlackGrad = ctx.createLinearGradient(0, 470, 960, 1080);
    floorBlackGrad.addColorStop(0, '#0F172A');
    floorBlackGrad.addColorStop(1, '#080C16');
    ctx.fillStyle = floorBlackGrad;
    ctx.fillRect(0, 470, 960, 610);

    // Right: Platinum Battleground
    const floorWhiteGrad = ctx.createLinearGradient(960, 470, 1920, 1080);
    floorWhiteGrad.addColorStop(0, '#1E293B');
    floorWhiteGrad.addColorStop(1, '#0B1220');
    ctx.fillStyle = floorWhiteGrad;
    ctx.fillRect(960, 470, 960, 610);

    // Arena Floor Perspective Grid Plates
    ctx.lineWidth = 1.5;
    for (let i = -10; i <= 10; i++) {
      const topX = 960 + i * 50;
      const botX = 960 + i * 180;
      ctx.strokeStyle = i < 0 ? 'rgba(239, 68, 68, 0.14)' : i > 0 ? 'rgba(6, 182, 212, 0.14)' : 'rgba(245, 158, 11, 0.35)';
      ctx.beginPath();
      ctx.moveTo(topX, 470);
      ctx.lineTo(botX, 1080);
      ctx.stroke();
    }
    for (let y = 510; y < 1080; y += 70) {
      const normY = (y - 510) / 570;
      const w = 500 + normY * 1400;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.moveTo(960 - w / 2, y);
      ctx.lineTo(960 + w / 2, y);
      ctx.stroke();
    }

    // Large Faction Emblems Stenciled on Arena Floor
    ctx.font = '900 130px "Russo One", sans-serif';
    ctx.textAlign = 'center';

    // Left Floor Emblem
    ctx.fillStyle = 'rgba(239, 68, 68, 0.07)';
    ctx.fillText('TEAM BLACK', 500, 630);

    // Right Floor Emblem
    ctx.fillStyle = 'rgba(6, 182, 212, 0.07)';
    ctx.fillText('TEAM WHITE', 1420, 630);
  }

  // Draw Hanging Faction Stadium Banner
  function drawFactionBanner(x, y, w, h, team, text) {
    ctx.save();
    const isBlack = team === 'BLACK';
    const primary = isBlack ? '#7F1D1D' : '#0369A1';
    const secondary = isBlack ? '#1E1B4B' : '#0F172A';
    const border = isBlack ? '#EF4444' : '#06B6D4';

    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, primary);
    grad.addColorStop(1, secondary);

    ctx.fillStyle = grad;
    ctx.strokeStyle = border;
    ctx.lineWidth = 3;

    // Draped banner with pointed tail
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - 30);
    ctx.lineTo(x + w / 2, y + h);
    ctx.lineTo(x, y + h - 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Banner Text
    ctx.font = '900 16px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + w / 2, y + 80);

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

  // 2. Center Energy Rift & Win Thresholds
  function drawCenterEnergyRift() {
    const t = gameState.globalTime;

    // Central Laser Fault Line (Division)
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(960, 470);
    ctx.lineTo(960, 960);
    ctx.stroke();

    // Laser core outer glow
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(960, 470);
    ctx.lineTo(960, 960);
    ctx.stroke();

    // Crackling Plasma Lightning Arcs
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let currY = 470;
    ctx.moveTo(960, currY);
    while (currY < 960) {
      currY += 35 + Math.random() * 25;
      const arcX = 960 + (Math.random() - 0.5) * (18 + Math.sin(t * 10) * 10);
      ctx.lineTo(arcX, Math.min(960, currY));
    }
    ctx.stroke();

    // Win Threshold Goal Lines
    const leftGoal = 960 - physics.winThreshold;
    const rightGoal = 960 + physics.winThreshold;

    // Team Black Victory Line
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(leftGoal, 490);
    ctx.lineTo(leftGoal, 890);
    ctx.stroke();

    // Team White Victory Line
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
    ctx.beginPath();
    ctx.moveTo(rightGoal, 490);
    ctx.lineTo(rightGoal, 890);
    ctx.stroke();
    ctx.setLineDash([]);

    // Goal line warning beacons
    ctx.fillStyle = '#EF4444';
    ctx.beginPath(); ctx.arc(leftGoal, 490, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#06B6D4';
    ctx.beginPath(); ctx.arc(rightGoal, 490, 8, 0, Math.PI * 2); ctx.fill();
  }

  // 3. Heavy 3D Braided Cable & Tension
  function drawHeavyCable() {
    const ropeY = 675;
    const leftAnchorX = 260;
    const rightAnchorX = 1660;
    const centerKnotX = 960 + physics.x;

    // Dynamic tension deflection
    const tension = Math.min(1, Math.abs(physics.vx) / 10 + Math.abs(physics.x) / physics.winThreshold);
    const sag = 16 - tension * 12;

    // Cable Deep Floor Shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(leftAnchorX, ropeY + 42);
    ctx.quadraticCurveTo(centerKnotX, ropeY + 42 + sag, rightAnchorX, ropeY + 42);
    ctx.stroke();

    // Steel Cable Core
    const cableGrad = ctx.createLinearGradient(leftAnchorX, ropeY, rightAnchorX, ropeY);
    cableGrad.addColorStop(0, '#334155');
    cableGrad.addColorStop(0.35, tension > 0.6 ? '#DC2626' : '#64748B');
    cableGrad.addColorStop(0.5, tension > 0.6 ? '#F59E0B' : '#CBD5E1');
    cableGrad.addColorStop(0.65, tension > 0.6 ? '#0284C7' : '#64748B');
    cableGrad.addColorStop(1, '#334155');

    ctx.strokeStyle = cableGrad;
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(leftAnchorX, ropeY);
    ctx.quadraticCurveTo(centerKnotX, ropeY + sag, rightAnchorX, ropeY);
    ctx.stroke();

    // 3D Braided Helix Strands (Giving thick industrial cable spiral texture)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 14]);
    ctx.beginPath();
    ctx.moveTo(leftAnchorX, ropeY - 5);
    ctx.quadraticCurveTo(centerKnotX, ropeY - 5 + sag, rightAnchorX, ropeY - 5);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 14]);
    ctx.beginPath();
    ctx.moveTo(leftAnchorX, ropeY + 5);
    ctx.quadraticCurveTo(centerKnotX, ropeY + 5 + sag, rightAnchorX, ropeY + 5);
    ctx.stroke();
    ctx.setLineDash([]);

    // Incandescent Tension Heat under high strain
    if (tension > 0.35) {
      ctx.strokeStyle = `rgba(245, 158, 11, ${tension * 0.6})`;
      ctx.lineWidth = 40;
      ctx.beginPath();
      ctx.moveTo(centerKnotX - 220, ropeY);
      ctx.lineTo(centerKnotX + 220, ropeY);
      ctx.stroke();
    }

    // Championship Gilded Center Marker Clamp & Battle Flags
    ctx.save();
    ctx.translate(centerKnotX, ropeY + sag);

    // Gilded Center Ring Clamp
    ctx.fillStyle = '#F59E0B';
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Inner Glowing Core
    ctx.fillStyle = physics.x < -20 ? '#EF4444' : physics.x > 20 ? '#06B6D4' : '#0F172A';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    // Fluttering Faction Double Pennant Banner
    const wave = Math.sin(gameState.globalTime * 8) * 8;
    // Left Red Pennant
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(-26, 70 + wave);
    ctx.lineTo(0, 56);
    ctx.closePath();
    ctx.fill();

    // Right Blue Pennant
    ctx.fillStyle = '#06B6D4';
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(26, 70 - wave);
    ctx.lineTo(0, 56);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // 4. Draw Elite Armored Gladiator Pullers
  function drawGladiatorTeams() {
    const ropeY = 675;
    const centerKnotX = 960 + physics.x;

    // Team Black Gladiators (Pulling Left)
    pullers.black.forEach((p, idx) => {
      const baseX = centerKnotX + p.xOffset;
      drawGladiatorPuller(baseX, ropeY, 'BLACK', p.phase, p.isLeader);
    });

    // Team White Gladiators (Pulling Right)
    pullers.white.forEach((p, idx) => {
      const baseX = centerKnotX + p.xOffset;
      drawGladiatorPuller(baseX, ropeY, 'WHITE', p.phase, p.isLeader);
    });
  }

  // Draw Individual Heroic Gladiator Model
  function drawGladiatorPuller(x, y, team, phase, isLeader) {
    ctx.save();
    ctx.translate(x, y);

    const isBlack = team === 'BLACK';
    const heave = Math.sin(phase);
    // Deep athletic combat lean (approx 44 degrees back)
    const leanAngle = isBlack ? (-0.50 + heave * 0.12) : (0.50 - heave * 0.12);
    ctx.rotate(leanAngle);

    // Dynamic Color Palette
    const armorPlateColor = isBlack ? '#1E293B' : '#F1F5F9';
    const armorSecondaryColor = isBlack ? '#0F172A' : '#CBD5E1';
    const armorTrimColor = isBlack ? '#EF4444' : '#06B6D4';
    const visorGlowColor = isBlack ? '#F43F5E' : '#38BDF8';

    // 1. Planted Boots & Greaves (Deep floor traction)
    const hipY = 20;

    // Rear Leg (Dug deep into ground)
    const rearX = isBlack ? 36 : -36;
    ctx.fillStyle = armorPlateColor;
    ctx.strokeStyle = armorTrimColor;
    ctx.lineWidth = 3;

    // Leg Path
    ctx.beginPath();
    ctx.roundRect(rearX - 8, hipY + 12, 16, 50, 6);
    ctx.fill();
    ctx.stroke();

    // Heavy Plated Boot
    ctx.fillStyle = '#0B1120';
    ctx.fillRect(rearX - 12, hipY + 56, 26, 14);

    // Front Leg (Braced forward)
    const frontX = isBlack ? -22 : 22;
    ctx.fillStyle = armorPlateColor;
    ctx.beginPath();
    ctx.roundRect(frontX - 8, hipY + 12, 16, 50, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0B1120';
    ctx.fillRect(frontX - 12, hipY + 56, 26, 14);

    // 2. Heavy Armored Torso / Breastplate
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
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Center Chest Reactor Core / Faction Sigil
    ctx.fillStyle = visorGlowColor;
    ctx.shadowColor = visorGlowColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, (hipY + shoulderY) / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 3. Spiked Pauldrons (Shoulder Armor)
    ctx.fillStyle = isLeader ? '#F59E0B' : armorPlateColor;
    ctx.strokeStyle = isLeader ? '#FEF08A' : armorTrimColor;
    ctx.lineWidth = 3;

    // Left shoulder plate
    ctx.beginPath();
    ctx.ellipse(-32, shoulderY + 4, 16, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right shoulder plate
    ctx.beginPath();
    ctx.ellipse(32, shoulderY + 4, 16, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4. Armored Arms Gripping the Cable Firmly
    ctx.strokeStyle = armorTrimColor;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';

    // Arm pulling rope
    ctx.beginPath();
    ctx.moveTo(isBlack ? -20 : 20, shoulderY + 12);
    ctx.lineTo(isBlack ? -36 : 36, -8);
    ctx.lineTo(isBlack ? -10 : 10, 0);
    ctx.stroke();

    // Heavy Gauntlet Fist firmly gripping rope
    ctx.fillStyle = isLeader ? '#F59E0B' : armorTrimColor;
    ctx.beginPath();
    ctx.arc(isBlack ? -10 : 10, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // 5. Armored Combat Helmet & Visor
    const headY = shoulderY - 26;

    // Helmet Base
    ctx.fillStyle = armorPlateColor;
    ctx.strokeStyle = isLeader ? '#F59E0B' : armorTrimColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, headY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing Visor Eye Slit
    ctx.fillStyle = visorGlowColor;
    ctx.shadowColor = visorGlowColor;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.rect(isBlack ? -18 : 0, headY - 4, 18, 7);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Leader Crown / Championship Crest
    if (isLeader) {
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 12;
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

  // 6. Draw Floating Combat Text
  function drawFloatingCombatText() {
    for (const ft of floatingTexts) {
      const alpha = Math.min(1, ft.life / ft.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '900 24px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';

      // Drop shadow text
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillText(ft.text, ft.x + 2, ft.y + 2);

      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  // 7. Victory Overlay Banner
  function drawVictoryOverlay() {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.fillRect(0, 360, 1920, 240);

    const isBlack = gameState.roundWinner === 'BLACK';
    ctx.strokeStyle = isBlack ? '#EF4444' : '#06B6D4';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 360, 1920, 240);

    ctx.font = '900 76px "Russo One", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = isBlack ? '#EF4444' : '#38BDF8';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 30;

    const winText = isBlack ? '⚔️ TEAM BLACK VICTORIOUS! ⚔️' : '🛡️ TEAM WHITE VICTORIOUS! 🛡️';
    ctx.fillText(winText, 960, 475);
    ctx.shadowBlur = 0;

    ctx.font = '800 26px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#FEF08A';
    const countdown = Math.ceil(gameState.winnerAnnounceTimer);
    ctx.fillText(`NEXT DEBATE BATTLE COMMENCES IN ${countdown}s...`, 960, 545);

    ctx.restore();
  }

  // Update Dynamic Topic HUD
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

    const dispNorm = Math.max(-1, Math.min(1, physics.x / physics.winThreshold));
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
        lbBlack.innerHTML = '<div class="lb-empty">Type 1 or BLACK to claim #1!</div>';
      } else {
        data.leaderboards.black.forEach((item, idx) => {
          const row = document.createElement('div');
          row.className = `lb-item ${idx === 0 ? 'captain-highlight' : ''}`;
          const rankDisplay = idx === 0 ? '👑' : `#${idx + 1}`;
          const rankClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : '';
          row.innerHTML = `<span class="lb-rank ${rankClass}">${rankDisplay}</span><span class="lb-name">@${item.user_name}</span><span class="lb-score">${item.score}</span>`;
          lbBlack.appendChild(row);
        });
      }
    }

    const lbWhite = document.getElementById('lb-list-white');
    if (lbWhite && Array.isArray(data.leaderboards?.white)) {
      lbWhite.innerHTML = '';
      if (data.leaderboards.white.length === 0) {
        lbWhite.innerHTML = '<div class="lb-empty">Type 2 or WHITE to claim #1!</div>';
      } else {
        data.leaderboards.white.forEach((item, idx) => {
          const row = document.createElement('div');
          row.className = `lb-item ${idx === 0 ? 'captain-highlight' : ''}`;
          const rankDisplay = idx === 0 ? '👑' : `#${idx + 1}`;
          const rankClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : '';
          row.innerHTML = `<span class="lb-rank ${rankClass}">${rankDisplay}</span><span class="lb-name">@${item.user_name}</span><span class="lb-score">${item.score}</span>`;
          lbWhite.appendChild(row);
        });
      }
    }

    // 3. Velocity & Round Stats
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

  // Realistic mock roster for high-energy preview demonstrations
  const MOCK_BLACK_ROSTER = [
    { user_name: 'ShadowKing', score: 1420 },
    { user_name: 'DarkKnight', score: 980 },
    { user_name: 'Viper99', score: 750 },
    { user_name: 'GhostOps', score: 620 },
    { user_name: 'Raven', score: 510 },
    { user_name: 'OnyxClaw', score: 430 },
    { user_name: 'Eclipse', score: 370 },
    { user_name: 'VoidWalker', score: 290 },
    { user_name: 'PhantomX', score: 210 },
    { user_name: 'Obsidian', score: 160 }
  ];

  const MOCK_WHITE_ROSTER = [
    { user_name: 'Solaris', score: 1540 },
    { user_name: 'HyperNova', score: 1040 },
    { user_name: 'FrostBite', score: 790 },
    { user_name: 'BlazeCore', score: 680 },
    { user_name: 'AuraMaster', score: 560 },
    { user_name: 'Starlight', score: 470 },
    { user_name: 'Zenith', score: 380 },
    { user_name: 'Apollo', score: 320 },
    { user_name: 'CrystalPaladin', score: 240 },
    { user_name: 'Polaris', score: 190 }
  ];

  if (isPreviewMode) {
    gameState.winsBlack = 12;
    gameState.winsWhite = 14;

    updateCaptainsAndLeaderboards({
      captains: {
        black: MOCK_BLACK_ROSTER[0],
        white: MOCK_WHITE_ROSTER[0]
      },
      leaderboards: {
        black: MOCK_BLACK_ROSTER,
        white: MOCK_WHITE_ROSTER
      },
      velocity: 5.4
    });

    // Initial slight displacement for drama
    physics.x = -45;
    physics.vx = -3;

    // Simulate vibrant live chat activity
    setInterval(() => {
      if (gameState.isRoundOver) return;

      const isBlack = Math.random() < 0.5;
      const team = isBlack ? 'BLACK' : 'WHITE';
      const roster = isBlack ? MOCK_BLACK_ROSTER : MOCK_WHITE_ROSTER;
      const userObj = roster[Math.floor(Math.random() * roster.length)];
      userObj.score += 10;
      roster.sort((a, b) => b.score - a.score);

      applyPull(team, userObj.user_name, 10);

      updateCaptainsAndLeaderboards({
        captains: {
          black: MOCK_BLACK_ROSTER[0],
          white: MOCK_WHITE_ROSTER[0]
        },
        leaderboards: {
          black: MOCK_BLACK_ROSTER,
          white: MOCK_WHITE_ROSTER
        },
        velocity: (4.0 + Math.random() * 3.5).toFixed(1)
      });
    }, 1100);
  }

  updateTopicHUD();
  setInterval(pollServerChat, 1000);
  requestAnimationFrame(loop);
})();
