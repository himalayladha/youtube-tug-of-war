// Stickman Subway Surfers - Autonomous Server Game Surface
(function () {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = 1920;
  canvas.height = 1080;

  // Sound Synthesizer via Web Audio
  class SoundManager {
    constructor() {
      this.ctx = null;
    }
    init() {
      if (!this.ctx && typeof AudioContext !== 'undefined') {
        this.ctx = new AudioContext();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
    playJump() {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(700, t + 0.15);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    }
    playSlide() {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.15);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    }
    playCoin() {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [659, 880].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(f, t + i * 0.05);
        gain.gain.setValueAtTime(0.15, t + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.05 + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.05);
        osc.stop(t + i * 0.05 + 0.12);
      });
    }
    playHit() {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.25);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    }
  }

  const sound = new SoundManager();

  // Perspective 3D Projection
  const horizonX = 960;
  const horizonY = 320;
  const bottomY = 1000;
  const horizonTrackWidth = 140;
  const bottomTrackWidth = 1050;
  const trackLaneWidth = bottomTrackWidth / 3;
  const horizonLaneWidth = horizonTrackWidth / 3;

  function projectTrack(laneOffset, z, altitude = 0) {
    const t = Math.max(0, Math.min(1, (1000 - z) / 1000));
    const perspT = Math.pow(t, 1.4);
    const screenY = horizonY + perspT * (bottomY - horizonY);
    const trackWidth = horizonTrackWidth + perspT * (bottomTrackWidth - horizonTrackWidth);
    const laneW = trackWidth / 3;
    const screenX = horizonX + laneOffset * laneW;
    const scale = 0.12 + perspT * 0.88;
    return { x: screenX, y: screenY - altitude * scale, scale, laneW, t: perspT };
  }

  // Anchor Z depth for the player on the 3D perspective track
  const PLAYER_Z = 130;

  // Stickman Player
  const player = {
    laneIndex: 1, // 0 = Left, 1 = Mid, 2 = Right
    laneProgress: 0,
    targetLane: 0,
    isJumping: false,
    jumpAltitude: 0,
    vy: 0,
    gravity: 2600,
    jumpPower: 1020,
    runTimer: 0,
    tiltAngle: 0,
    isInvulnerable: false,
    invulTimer: 0,
    update(dt) {
      const diff = this.targetLane - this.laneProgress;
      if (Math.abs(diff) < 0.015) {
        this.laneProgress = this.targetLane;
        this.tiltAngle = 0;
      } else {
        this.laneProgress += diff * Math.min(1, dt * 22);
        this.tiltAngle = Math.max(-0.25, Math.min(0.25, diff * 0.4));
      }

      if (this.isJumping) {
        this.jumpAltitude += this.vy * dt;
        this.vy -= this.gravity * dt;
        if (this.jumpAltitude <= 0) {
          this.jumpAltitude = 0;
          this.vy = 0;
          this.isJumping = false;
        }
      }

      if (this.isInvulnerable) {
        this.invulTimer -= dt;
        if (this.invulTimer <= 0) this.isInvulnerable = false;
      }
      this.runTimer += dt * 16;
    },
    reset() {
      this.laneIndex = 1;
      this.laneProgress = 0;
      this.targetLane = 0;
      this.isJumping = false;
      this.jumpAltitude = 0;
      this.vy = 0;
      this.runTimer = 0;
      this.tiltAngle = 0;
      this.isInvulnerable = false;
      this.invulTimer = 0;
    },
    action(act, user = 'Viewer') {
      if (gameState.isGameOver) return;
      if (act === 'LEFT' && this.laneIndex > 0) {
        this.laneIndex--;
        this.targetLane = this.laneIndex - 1;
        sound.playSlide();
        addFloatingText(`◄ LEFT (${user})`, 800, 740, '#F43F5E');
      } else if (act === 'RIGHT' && this.laneIndex < 2) {
        this.laneIndex++;
        this.targetLane = this.laneIndex - 1;
        sound.playSlide();
        addFloatingText(`► RIGHT (${user})`, 1120, 740, '#059669');
      } else if (act === 'JUMP' && !this.isJumping) {
        this.isJumping = true;
        this.vy = this.jumpPower;
        sound.playJump();
        addFloatingText(`▲ JUMP! (${user})`, 960, 720, '#0284C7');
      }
    },
    render(ctx) {
      if (this.isInvulnerable && Math.floor(Date.now() / 90) % 2 === 0) return;

      const foot = projectTrack(this.laneProgress, PLAYER_Z);
      const footX = foot.x;
      const footY = foot.y;
      const bodyY = footY - this.jumpAltitude;

      ctx.save();
      ctx.translate(footX, bodyY);
      ctx.rotate(this.tiltAngle);

      // Drop shadow
      ctx.save();
      ctx.rotate(-this.tiltAngle);
      const shadowScale = Math.max(0.35, 1 - this.jumpAltitude / 400) * foot.scale;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, this.jumpAltitude + 4, 34 * shadowScale, 11 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const stickColor = '#0F172A';
      ctx.strokeStyle = stickColor;
      ctx.fillStyle = stickColor;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const stride = Math.sin(this.runTimer);
      const hipY = -48;

      if (this.isJumping) {
        ctx.beginPath();
        ctx.moveTo(0, hipY); ctx.lineTo(-24, hipY + 18); ctx.lineTo(-14, hipY + 36);
        ctx.moveTo(0, hipY); ctx.lineTo(24, hipY + 18); ctx.lineTo(14, hipY + 36);
        ctx.stroke();
        ctx.fillStyle = '#2563EB';
        ctx.fillRect(-22, hipY + 34, 15, 9);
        ctx.fillRect(10, hipY + 34, 15, 9);
      } else {
        const lY = stride * 22;
        const rY = -stride * 22;
        ctx.beginPath();
        ctx.moveTo(0, hipY); ctx.lineTo(-16, hipY + 24 + lY * 0.4); ctx.lineTo(-14, lY);
        ctx.moveTo(0, hipY); ctx.lineTo(16, hipY + 24 + rY * 0.4); ctx.lineTo(14, rY);
        ctx.stroke();
        ctx.fillStyle = '#2563EB';
        ctx.fillRect(-21, lY - 3, 14, 8);
        ctx.fillRect(9, rY - 3, 14, 8);
      }

      // Torso & backpack
      const shoulderY = -100;
      ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(0, shoulderY); ctx.stroke();
      ctx.fillStyle = '#F59E0B'; ctx.strokeStyle = '#D97706'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-10, shoulderY + 12, 20, 26, 4); ctx.fill(); ctx.stroke();

      // Arms
      ctx.strokeStyle = stickColor; ctx.lineWidth = 6;
      if (this.isJumping) {
        ctx.beginPath();
        ctx.moveTo(0, shoulderY); ctx.lineTo(-32, shoulderY - 24); ctx.lineTo(-24, shoulderY - 50);
        ctx.moveTo(0, shoulderY); ctx.lineTo(32, shoulderY - 24); ctx.lineTo(24, shoulderY - 50);
        ctx.stroke();
      } else {
        const lArm = -stride * 22;
        ctx.beginPath();
        ctx.moveTo(0, shoulderY); ctx.lineTo(-24, shoulderY + 20 - lArm * 0.5); ctx.lineTo(-18, shoulderY + 38 - lArm * 0.7);
        ctx.moveTo(0, shoulderY); ctx.lineTo(24, shoulderY + 20 + lArm * 0.5); ctx.lineTo(18, shoulderY + 38 + lArm * 0.7);
        ctx.stroke();
      }

      // Head & Red Cap
      const headY = shoulderY - 22;
      ctx.fillStyle = stickColor;
      ctx.beginPath(); ctx.arc(0, headY, 19, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath(); ctx.arc(0, headY, 21, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
      ctx.fillRect(-14, headY - 23, 28, 7);

      ctx.restore();
    }
  };

  // Obstacles & Coins
  let obstacles = [];
  let coins = [];
  let floatingTexts = [];
  let particles = [];
  let spawnObsTimer = 0;
  let spawnCoinTimer = 0;

  function addFloatingText(text, x, y, color) {
    floatingTexts.push({ text, x, y, color, vy: -50, life: 1.2 });
  }

  function addBurst(x, y, color, count = 16) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * 200 + 40;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, life: 0.6 });
    }
  }

  // Scenery (Clouds, Buildings)
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    clouds.push({ x: Math.random() * 2000, y: Math.random() * 140 + 30, scale: Math.random() * 0.6 + 0.8, speed: Math.random() * 15 + 12 });
  }

  const buildings = [];
  const bColors = ['#F87171', '#FB923C', '#FBBF24', '#38BDF8', '#818CF8', '#A78BFA', '#34D399'];
  for (let x = -200; x < 2200; x += 110) {
    const c = bColors[Math.floor(Math.random() * bColors.length)];
    buildings.push({ x, w: 90, h: Math.random() * 140 + 90, color: c });
  }

  // Game State
  const gameState = {
    distance: 0,
    score: 0,
    coins: 0,
    health: 3,
    speed: 380,
    isGameOver: false,
    respawnTimer: 0,
  };

  // Keyboard test controls
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a' || e.key === '1') player.action('LEFT', 'Host');
    else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w' || e.key === ' ' || e.key === '2') player.action('JUMP', 'Host');
    else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd' || e.key === '3') player.action('RIGHT', 'Host');
  });

  // Main Loop
  let lastTime = performance.now();
  let trackOffset = 0;

  function loop(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (gameState.isGameOver) {
      gameState.respawnTimer -= dt;
      if (gameState.respawnTimer <= 0) {
        gameState.isGameOver = false;
        gameState.health = 3;
        gameState.distance = 0;
        gameState.score = 0;
        gameState.coins = 0;
        gameState.speed = 380;
        obstacles = [];
        coins = [];
        floatingTexts = [];
        particles = [];
        spawnObsTimer = 0;
        spawnCoinTimer = 0;
        trackOffset = 0;
        player.reset();
        updateHUD();
      }
      return;
    }

    gameState.distance += (gameState.speed * dt) / 10;
    gameState.score += Math.floor(dt * 15);
    gameState.speed = Math.min(850, 380 + (gameState.distance / 100) * 15);
    trackOffset = (trackOffset + gameState.speed * dt * 2.5) % 48;

    // Clouds
    for (const c of clouds) {
      c.x += c.speed * dt;
      if (c.x > 2100) c.x = -200;
    }

    player.update(dt);

    // Spawning Obstacles
    spawnObsTimer += dt;
    const interval = Math.max(1.1, 2.3 - (gameState.speed - 300) / 600);
    if (spawnObsTimer >= interval) {
      spawnObsTimer = 0;
      const type = Math.random() > 0.45 ? 'WALL' : 'HURDLE';
      const lane = Math.floor(Math.random() * 3);
      obstacles.push({ type, lane, z: 1000, hit: false, passed: false, cleared: false });
    }

    // Spawning Coins
    spawnCoinTimer += dt;
    if (spawnCoinTimer >= 1.0) {
      spawnCoinTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      for (let i = 0; i < 3; i++) {
        coins.push({ lane, z: 1000 + i * 75, collected: false });
      }
    }

    // Update Obstacles
    const playerFoot = projectTrack(player.laneProgress, PLAYER_Z);

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.z -= (gameState.speed * 1.5) * dt;

      if (!obs.hit && !obs.passed) {
        const dz = obs.z - PLAYER_Z;

        // Contact window perfectly centered around player 3D anchor
        if (dz <= 35 && dz >= -25) {
          const laneOffset = obs.lane - 1;
          if (Math.abs(player.laneProgress - laneOffset) < 0.48) {
            if (obs.type === 'HURDLE' && player.jumpAltitude > 45) {
              if (!obs.cleared) {
                obs.cleared = true;
                gameState.score += 75;
                addFloatingText('CLEAR! +75', playerFoot.x, playerFoot.y - player.jumpAltitude - 30, '#10B981');
              }
            } else if (!obs.cleared) {
              obs.hit = true;
              if (!player.isInvulnerable) {
                sound.playHit();
                gameState.health--;
                player.isInvulnerable = true;
                player.invulTimer = 2.0;
                addBurst(playerFoot.x, playerFoot.y, '#EF4444', 25);
                addFloatingText('CRASH! -1 HP', playerFoot.x, playerFoot.y - 60, '#EF4444');
                updateHUD();
                if (gameState.health <= 0) {
                  gameState.isGameOver = true;
                  gameState.respawnTimer = 5.0;
                }
              }
            }
          }
        } else if (dz < -25) {
          obs.passed = true;
          if (!obs.cleared && !obs.hit) {
            gameState.score += 50;
          }
        }
      }

      if (obs.z < -80) obstacles.splice(i, 1);
    }

    // Update Coins
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.z -= (gameState.speed * 1.5) * dt;
      const dz = c.z - PLAYER_Z;

      if (!c.collected && dz <= 35 && dz >= -25) {
        const laneOffset = c.lane - 1;
        if (Math.abs(player.laneProgress - laneOffset) < 0.50) {
          c.collected = true;
          gameState.coins++;
          gameState.score += 25;
          sound.playCoin();
          const p = projectTrack(laneOffset, PLAYER_Z);
          addBurst(p.x, p.y, '#F59E0B', 12);
          addFloatingText('+25 🪙', p.x, p.y - 20, '#D97706');
          updateHUD();
        }
      }
      if (c.z < -40 || c.collected) coins.splice(i, 1);
    }

    // Particles & Texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    updateHUD();
  }

  function render() {
    ctx.clearRect(0, 0, 1920, 1080);

    // 1. Sky & Sun
    const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, '#38BDF8'); sky.addColorStop(0.6, '#7DD3FC'); sky.addColorStop(1, '#E0F2FE');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 1920, horizonY);

    const sun = ctx.createRadialGradient(horizonX + 280, 120, 20, horizonX + 280, 120, 160);
    sun.addColorStop(0, '#FEF08A'); sun.addColorStop(0.3, '#FBBF24'); sun.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(horizonX + 280, 120, 160, 0, Math.PI * 2); ctx.fill();

    // Clouds
    for (const c of clouds) {
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(c.scale, c.scale);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.arc(28, -8, 22, 0, Math.PI * 2);
      ctx.arc(52, 0, 20, 0, Math.PI * 2); ctx.arc(22, 10, 24, 0, Math.PI * 2);
      ctx.fill(); ctx.restore();
    }

    // Skyline
    for (const b of buildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, horizonY - b.h, b.w, b.h);
      ctx.fillStyle = '#FFFFFF';
      for (let r = 16; r < b.h - 20; r += 24) {
        for (let c = 8; c < b.w - 12; c += 16) ctx.fillRect(b.x + c, horizonY - b.h + r, 8, 12);
      }
    }

    // 2. Lawn & Ballast Track
    const lawn = ctx.createLinearGradient(0, horizonY, 0, 1080);
    lawn.addColorStop(0, '#86EFAC'); lawn.addColorStop(1, '#22C55E');
    ctx.fillStyle = lawn; ctx.fillRect(0, horizonY, 1920, 1080 - horizonY);

    const ballast = ctx.createLinearGradient(0, horizonY, 0, bottomY);
    ballast.addColorStop(0, '#94A3B8'); ballast.addColorStop(1, '#64748B');
    ctx.fillStyle = ballast;
    ctx.beginPath();
    ctx.moveTo(horizonX - horizonTrackWidth / 2 - 20, horizonY);
    ctx.lineTo(horizonX + horizonTrackWidth / 2 + 20, horizonY);
    ctx.lineTo(horizonX + bottomTrackWidth / 2 + 60, bottomY);
    ctx.lineTo(horizonX - bottomTrackWidth / 2 - 60, bottomY);
    ctx.fill();

    // Railway Ties
    for (let i = 0; i < 22; i++) {
      const baseT = (i * 48 + trackOffset) / 1000;
      if (baseT < 0 || baseT > 1) continue;
      const perspT = Math.pow(baseT, 1.4);
      const tieY = horizonY + perspT * (bottomY - horizonY);
      const tieWidth = horizonTrackWidth + perspT * (bottomTrackWidth - horizonTrackWidth);
      ctx.fillStyle = '#78350F';
      ctx.fillRect(horizonX - tieWidth / 2, tieY, tieWidth, Math.max(3, 10 * perspT));
    }

    // 6 Steel Rails
    [-1, 0, 1].forEach((laneIdx) => {
      [-0.32, 0.32].forEach((offset) => {
        const topX = horizonX + (laneIdx + offset) * horizonLaneWidth;
        const botX = horizonX + (laneIdx + offset) * trackLaneWidth;
        ctx.strokeStyle = '#F1F5F9'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(topX, horizonY); ctx.lineTo(botX, bottomY); ctx.stroke();
      });
    });

    // Helper to render an obstacle
    function drawObstacle(o) {
      if (o.z > 980 || o.z < -50) return;
      const p = projectTrack(o.lane - 1, o.z);
      const w = 145 * p.scale;
      ctx.save();

      if (o.type === 'HURDLE') {
        const h = 72 * p.scale;
        ctx.fillStyle = '#FBBF24';
        ctx.fillRect(p.x - w / 2, p.y - h, w, 30 * p.scale);
        ctx.fillStyle = '#0F172A';
        for (let s = 0; s < w; s += 36 * p.scale) {
          ctx.fillRect(p.x - w / 2 + s, p.y - h, 18 * p.scale, 30 * p.scale);
        }
        if (p.scale > 0.4) {
          ctx.fillStyle = '#0284C7'; ctx.font = `900 ${Math.round(20 * p.scale)}px sans-serif`;
          ctx.textAlign = 'center'; ctx.fillText('▲ JUMP', p.x, p.y - h - 10 * p.scale);
        }
      } else {
        const h = 195 * p.scale;
        ctx.fillStyle = '#DC2626';
        ctx.beginPath(); ctx.roundRect(p.x - w / 2, p.y - h, w, h, 14 * p.scale); ctx.fill();
        ctx.fillStyle = '#E2E8F0'; ctx.fillRect(p.x - w / 2 + 4 * p.scale, p.y - h + 4 * p.scale, w - 8 * p.scale, 20 * p.scale);
        ctx.fillStyle = '#38BDF8'; ctx.fillRect(p.x - w / 2 + 16 * p.scale, p.y - h + 32 * p.scale, w - 32 * p.scale, 46 * p.scale);
        if (p.scale > 0.35) {
          ctx.fillStyle = '#FFFFFF'; ctx.font = `900 ${Math.round(22 * p.scale)}px sans-serif`;
          ctx.textAlign = 'center'; ctx.fillText('◄ DODGE ►', p.x, p.y - h - 12 * p.scale);
        }
      }
      ctx.restore();
    }

    // Helper to render a coin
    function drawCoin(c) {
      if (c.collected || c.z > 980 || c.z < -20) return;
      const p = projectTrack(c.lane - 1, c.z, 24);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(0, 0, 22 * p.scale, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FFA500'; ctx.lineWidth = 3 * p.scale; ctx.stroke();
      ctx.restore();
    }

    // 3. Background Coins & Obstacles (z > PLAYER_Z, sorted furthest to nearest)
    coins.filter(c => c.z > PLAYER_Z).forEach(drawCoin);
    obstacles.filter(o => o.z > PLAYER_Z).sort((a, b) => b.z - a.z).forEach(drawObstacle);

    // 4. Stickman (at PLAYER_Z)
    player.render(ctx);

    // 5. Foreground Coins & Obstacles (z <= PLAYER_Z, sorted furthest to nearest)
    coins.filter(c => c.z <= PLAYER_Z).forEach(drawCoin);
    obstacles.filter(o => o.z <= PLAYER_Z).sort((a, b) => b.z - a.z).forEach(drawObstacle);

    // 6. Particles & Text
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    for (const ft of floatingTexts) {
      ctx.fillStyle = ft.color; ctx.font = 'bold 20px "Inter", sans-serif';
      ctx.textAlign = 'center'; ctx.fillText(ft.text, ft.x, ft.y);
    }

    // 7. Game Over
    if (gameState.isGameOver) {
      ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
      ctx.fillRect(0, 0, 1920, 1080);
      ctx.fillStyle = '#EF4444'; ctx.font = '900 76px "Inter", sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('RUN COMPLETED', 960, 440);
      ctx.fillStyle = '#0F172A'; ctx.font = 'bold 34px "Inter", sans-serif';
      ctx.fillText(`Distance: ${Math.floor(gameState.distance)}m  •  Coins: ${gameState.coins} 🪙  •  Score: ${gameState.score}`, 960, 520);
      ctx.fillStyle = '#0284C7'; ctx.font = '900 26px "Inter", sans-serif';
      ctx.fillText(`Respawning in ${Math.ceil(gameState.respawnTimer)}s...`, 960, 590);
    }
  }

  function updateHUD() {
    document.getElementById('hud-distance').textContent = `${Math.floor(gameState.distance)}m`;
    document.getElementById('hud-score').textContent = gameState.score.toLocaleString();
    document.getElementById('hud-coins').textContent = gameState.coins;

    const heartsEl = document.getElementById('hud-hearts');
    heartsEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const h = document.createElement('span');
      h.className = `heart ${i < gameState.health ? 'active' : 'lost'}`;
      h.textContent = '❤️';
      heartsEl.appendChild(h);
    }
  }

  // Poll YouTube Live Chat API from server
  async function pollServerChat() {
    try {
      const res = await fetch('../api/chat.php?poll=1');
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.actions)) {
          for (const item of data.actions) {
            player.action(item.action, item.user);
            addTickerMessage(item.user, item.action);
          }
        }

        if (data.percentages) {
          document.getElementById('gauge-pct-left').textContent = `${data.percentages.LEFT}%`;
          document.getElementById('gauge-bar-left').style.width = `${data.percentages.LEFT}%`;
          document.getElementById('gauge-pct-jump').textContent = `${data.percentages.JUMP}%`;
          document.getElementById('gauge-bar-jump').style.width = `${data.percentages.JUMP}%`;
          document.getElementById('gauge-pct-right').textContent = `${data.percentages.RIGHT}%`;
          document.getElementById('gauge-bar-right').style.width = `${data.percentages.RIGHT}%`;
        }

        if (data.velocity !== undefined) {
          document.getElementById('hud-velocity').textContent = `${data.velocity} msgs/s`;
        }

        if (Array.isArray(data.top_viewers)) {
          const lb = document.getElementById('leaderboard-list');
          lb.innerHTML = '';
          data.top_viewers.forEach((v, idx) => {
            const row = document.createElement('div');
            row.className = 'leaderboard-item';
            row.innerHTML = `<span class="lb-rank">#${idx + 1}</span><span class="lb-name">${v.user_name}</span><span class="lb-score">${v.score} pts</span>`;
            lb.appendChild(row);
          });
        }
      }
    } catch (e) {}
  }

  function addTickerMessage(user, act) {
    const box = document.getElementById('chat-ticker-container');
    const pill = document.createElement('div');
    pill.className = 'chat-ticker-pill';
    pill.innerHTML = `<span class="ticker-user">@${user}</span><span class="ticker-cmd">${act}</span>`;
    box.prepend(pill);
    if (box.children.length > 6) box.removeChild(box.lastChild);
  }

  setInterval(pollServerChat, 1000);
  requestAnimationFrame(loop);
})();
