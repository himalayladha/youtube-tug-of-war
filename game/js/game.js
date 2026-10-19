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
    playPowerup() {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [523, 659, 784, 1046].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(f, t + i * 0.05);
        gain.gain.setValueAtTime(0.2, t + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.05 + 0.14);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.05);
        osc.stop(t + i * 0.05 + 0.14);
      });
    }
    playSpring() {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(1100, t + 0.2);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    }
    playWhistle() {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1700, t);
      osc.frequency.setValueAtTime(2200, t + 0.08);
      osc.frequency.setValueAtTime(1700, t + 0.16);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    }
  }

  const sound = new SoundManager();

  // Perspective 3D Projection (Framed cleanly above bottom HUD overlay)
  const horizonX = 960;
  const horizonY = 270;
  const bottomY = 760;
  const horizonTrackWidth = 130;
  const bottomTrackWidth = 960;
  const trackLaneWidth = bottomTrackWidth / 3;
  const horizonLaneWidth = horizonTrackWidth / 3;

  function projectTrack(laneOffset, z, altitude = 0) {
    const t = Math.max(0, Math.min(1, (1000 - z) / 1000));
    const perspT = Math.pow(t, 1.4);
    const screenY = horizonY + perspT * (bottomY - horizonY);
    const trackWidth = horizonTrackWidth + perspT * (bottomTrackWidth - horizonTrackWidth);
    const laneW = trackWidth / 3;
    const screenX = horizonX + laneOffset * laneW;
    const scale = 0.14 + perspT * 0.86;
    return { x: screenX, y: screenY - altitude * scale, scale, laneW, t: perspT };
  }

  // Anchor Z depth for the player on the 3D perspective track
  const PLAYER_Z = 120;

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
    powerup: null, // { type: 'MAGNET' | 'BOOTS' | 'JETPACK', timer: number, maxTimer: number }
    activatePowerup(type, duration) {
      this.powerup = { type, timer: duration, maxTimer: duration };
      sound.playPowerup();
      if (type === 'BOOTS') sound.playSpring();
      updatePowerupHUD();
      const col = type === 'MAGNET' ? '#F59E0B' : type === 'BOOTS' ? '#10B981' : '#8B5CF6';
      addFloatingText(`★ ${type} ACTIVATED!`, 960, 680, col);
      addBurst(960, 750, col, 20);
    },
    update(dt) {
      const diff = this.targetLane - this.laneProgress;
      if (Math.abs(diff) < 0.015) {
        this.laneProgress = this.targetLane;
        this.tiltAngle = 0;
      } else {
        this.laneProgress += diff * Math.min(1, dt * 22);
        this.tiltAngle = Math.max(-0.25, Math.min(0.25, diff * 0.4));
      }

      // Power-up countdown
      if (this.powerup) {
        this.powerup.timer -= dt;
        if (this.powerup.timer <= 0) {
          this.powerup = null;
          updatePowerupHUD();
        } else {
          updatePowerupHUD();
        }
      }

      // Jetpack flight mechanics
      if (this.powerup && this.powerup.type === 'JETPACK') {
        this.jumpAltitude += (165 - this.jumpAltitude) * dt * 8;
        this.isJumping = true;
        // spawn exhaust particles
        if (Math.random() > 0.3) {
          const foot = projectTrack(this.laneProgress, PLAYER_Z);
          addParticle(foot.x - 12, foot.y - this.jumpAltitude + 40, '#F97316', 0, 180, 0.3);
          addParticle(foot.x + 12, foot.y - this.jumpAltitude + 40, '#F97316', 0, 180, 0.3);
        }
      } else if (this.isJumping) {
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
      this.powerup = null;
      updatePowerupHUD();
    },
    action(act, user = 'Viewer') {
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
      } else if (act === 'JUMP') {
        if (!this.isJumping || (this.powerup && this.powerup.type === 'BOOTS' && this.jumpAltitude < 120)) {
          this.isJumping = true;
          if (this.powerup && this.powerup.type === 'BOOTS') {
            this.vy = 1520; // Super high leap!
            sound.playSpring();
            addFloatingText(`★ SUPER JUMP! (${user})`, 960, 720, '#10B981');
          } else {
            this.vy = this.jumpPower;
            sound.playJump();
            addFloatingText(`▲ JUMP! (${user})`, 960, 720, '#0284C7');
          }
        }
      }
    },
    render(ctx) {
      if (this.isInvulnerable && Math.floor(Date.now() / 90) % 2 === 0) return;

      const foot = projectTrack(this.laneProgress, PLAYER_Z);
      const footX = foot.x;
      const footY = foot.y;
      const bodyY = footY - this.jumpAltitude * foot.scale;

      ctx.save();
      ctx.translate(footX, bodyY);
      const pScale = foot.scale * 1.1;
      ctx.scale(pScale, pScale);
      ctx.rotate(this.tiltAngle);

      // Drop shadow (stays grounded on the track beneath the jumping stickman)
      ctx.save();
      ctx.rotate(-this.tiltAngle);
      const shadowScale = Math.max(0.35, 1 - this.jumpAltitude / 400);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, (this.jumpAltitude / 1.1) + 4, 34 * shadowScale, 11 * shadowScale, 0, 0, Math.PI * 2);
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
        const shoeColor = (this.powerup && this.powerup.type === 'BOOTS') ? '#10B981' : '#2563EB';
        ctx.fillStyle = shoeColor;
        ctx.fillRect(-22, hipY + 34, 15, 9);
        ctx.fillRect(10, hipY + 34, 15, 9);
      } else {
        const lY = stride * 22;
        const rY = -stride * 22;
        ctx.beginPath();
        ctx.moveTo(0, hipY); ctx.lineTo(-16, hipY + 24 + lY * 0.4); ctx.lineTo(-14, lY);
        ctx.moveTo(0, hipY); ctx.lineTo(16, hipY + 24 + rY * 0.4); ctx.lineTo(14, rY);
        ctx.stroke();
        const shoeColor = (this.powerup && this.powerup.type === 'BOOTS') ? '#10B981' : '#2563EB';
        ctx.fillStyle = shoeColor;
        ctx.fillRect(-21, lY - 3, 14, 8);
        ctx.fillRect(9, rY - 3, 14, 8);
      }

      // Torso & backpack/jetpack
      const shoulderY = -100;
      ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(0, shoulderY); ctx.stroke();
      
      if (this.powerup && this.powerup.type === 'JETPACK') {
        // Dual Jet Thrusters
        ctx.fillStyle = '#8B5CF6';
        ctx.fillRect(-18, shoulderY + 8, 10, 32);
        ctx.fillRect(8, shoulderY + 8, 10, 32);
        ctx.fillStyle = '#C4B5FD';
        ctx.fillRect(-15, shoulderY + 12, 4, 20);
        ctx.fillRect(11, shoulderY + 12, 4, 20);
        // Jet exhaust flame
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(-18, shoulderY + 40); ctx.lineTo(-13, shoulderY + 54 + Math.random() * 8); ctx.lineTo(-8, shoulderY + 40);
        ctx.moveTo(8, shoulderY + 40); ctx.lineTo(13, shoulderY + 54 + Math.random() * 8); ctx.lineTo(18, shoulderY + 40);
        ctx.fill();
      } else {
        ctx.fillStyle = '#F59E0B'; ctx.strokeStyle = '#D97706'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(-10, shoulderY + 12, 20, 26, 4); ctx.fill(); ctx.stroke();
      }

      // Magnet Aura
      if (this.powerup && this.powerup.type === 'MAGNET') {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, shoulderY + 10, 38 + Math.sin(Date.now() / 100) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }

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

  // Obstacles, Coins, Powerups
  let obstacles = [];
  let coins = [];
  let powerups = [];
  let floatingTexts = [];
  let particles = [];
  let spawnObsTimer = 0;
  let spawnCoinTimer = 0;
  let spawnPowerupTimer = 0;

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

  function addParticle(x, y, color, vx = 0, vy = 0, life = 0.5) {
    particles.push({ x, y, vx, vy, color, life });
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

  // Game State (Pure Endless Mode)
  const gameState = {
    distance: 0,
    score: 0,
    coins: 0,
    streak: 0,
    multiplier: 1.0,
    speed: 380,
  };

  // Keyboard test controls & debug triggers
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (e.key === 'ArrowLeft' || k === 'a' || e.key === '1') player.action('LEFT', 'Host');
    else if (e.key === 'ArrowUp' || k === 'w' || e.key === ' ' || e.key === '2') player.action('JUMP', 'Host');
    else if (e.key === 'ArrowRight' || k === 'd' || e.key === '3') player.action('RIGHT', 'Host');
    else if (k === 'm') player.activatePowerup('MAGNET', 10);
    else if (k === 'b') player.activatePowerup('BOOTS', 8);
    else if (k === 'j') player.activatePowerup('JETPACK', 6);
    else if (k === 't') obstacles.push({ type: 'TRAIN', lane: player.laneIndex, z: 650, hit: false, passed: false, cleared: false });
    else if (k === 'h') obstacles.push({ type: 'HURDLE', lane: player.laneIndex, z: 650, hit: false, passed: false, cleared: false });
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
    gameState.distance += (gameState.speed * dt) / 10;
    gameState.score += Math.floor(dt * 15 * gameState.multiplier);
    gameState.speed = Math.min(850, 380 + (gameState.distance / 100) * 15);
    trackOffset = (trackOffset + gameState.speed * dt * 2.5) % 48;

    // Clouds
    for (const c of clouds) {
      c.x += c.speed * dt;
      if (c.x > 2100) c.x = -200;
    }

    player.update(dt);

    // Spawning Obstacles (TRAIN, WALL, HURDLE)
    spawnObsTimer += dt;
    const interval = Math.max(1.1, 2.3 - (gameState.speed - 300) / 600);
    if (spawnObsTimer >= interval) {
      spawnObsTimer = 0;
      const r = Math.random();
      const type = r > 0.62 ? 'TRAIN' : r > 0.32 ? 'WALL' : 'HURDLE';
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

    // Spawning Power-Ups (MAGNET, BOOTS, JETPACK)
    spawnPowerupTimer += dt;
    if (spawnPowerupTimer >= 13.0) {
      spawnPowerupTimer = 0;
      const puTypes = ['MAGNET', 'BOOTS', 'JETPACK'];
      const puType = puTypes[Math.floor(Math.random() * puTypes.length)];
      const puLane = Math.floor(Math.random() * 3);
      powerups.push({ type: puType, lane: puLane, z: 1000, collected: false });
    }

    // Jetpack Sky Coins
    if (player.powerup && player.powerup.type === 'JETPACK' && Math.random() < 0.12) {
      coins.push({ lane: player.laneIndex, z: 900, collected: false, sky: true });
    }

    // Update Obstacles
    const playerFoot = projectTrack(player.laneProgress, PLAYER_Z);

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.z -= (gameState.speed * 1.5) * dt;

      if (!obs.hit && !obs.passed) {
        const dz = obs.z - PLAYER_Z;

        // Contact window
        if (dz <= 38 && dz >= -25) {
          const laneOffset = obs.lane - 1;
          if (Math.abs(player.laneProgress - laneOffset) < 0.48) {
            // Jetpack flies high above all obstacles!
            if (player.powerup && player.powerup.type === 'JETPACK') {
              if (!obs.cleared) {
                obs.cleared = true;
                gameState.streak++;
                gameState.multiplier = Math.min(4.0, 1.0 + Math.floor(gameState.streak / 4) * 0.5);
                const pts = Math.round(80 * gameState.multiplier);
                gameState.score += pts;
                addFloatingText(`FLYOVER! +${pts}`, playerFoot.x, playerFoot.y - player.jumpAltitude - 30, '#8B5CF6');
                updateHUD();
              }
            } else if (obs.type === 'HURDLE' && player.jumpAltitude > 45) {
              if (!obs.cleared) {
                obs.cleared = true;
                gameState.streak++;
                gameState.multiplier = Math.min(4.0, 1.0 + Math.floor(gameState.streak / 4) * 0.5);
                const pts = Math.round(75 * gameState.multiplier);
                gameState.score += pts;
                addFloatingText(`CLEAR! +${pts}`, playerFoot.x, playerFoot.y - player.jumpAltitude - 30, '#10B981');
                updateHUD();
              }
            } else if (obs.type === 'TRAIN' && player.jumpAltitude > 140) {
              // High leap with boots over train!
              if (!obs.cleared) {
                obs.cleared = true;
                gameState.streak++;
                gameState.multiplier = Math.min(4.0, 1.0 + Math.floor(gameState.streak / 4) * 0.5);
                const pts = Math.round(150 * gameState.multiplier);
                gameState.score += pts;
                addFloatingText(`TRAIN LEAP! +${pts}`, playerFoot.x, playerFoot.y - player.jumpAltitude - 30, '#10B981');
                updateHUD();
              }
            } else if (!obs.cleared) {
              obs.hit = true;
              if (!player.isInvulnerable) {
                sound.playHit();
                player.isInvulnerable = true;
                player.invulTimer = 2.0;
                gameState.streak = 0;
                gameState.multiplier = 1.0;
                gameState.score = Math.max(0, gameState.score - 50);
                addBurst(playerFoot.x, playerFoot.y, '#EF4444', 25);
                addFloatingText('STUMBLE! -50', playerFoot.x, playerFoot.y - 60, '#EF4444');
                updateHUD();
              }
            }
          }
        } else if (dz < -25) {
          obs.passed = true;
          if (!obs.cleared && !obs.hit) {
            gameState.streak++;
            gameState.multiplier = Math.min(4.0, 1.0 + Math.floor(gameState.streak / 4) * 0.5);
            gameState.score += Math.round((obs.type === 'TRAIN' ? 100 : 50) * gameState.multiplier);
            updateHUD();
          }
        }
      }

      if (obs.z < -80) obstacles.splice(i, 1);
    }

    // Update Coins (with Magnet suction)
    const isMagnetActive = (player.powerup && player.powerup.type === 'MAGNET');
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.z -= (gameState.speed * 1.5) * dt;

      // Magnet attraction
      if (isMagnetActive && !c.collected) {
        const distZ = Math.abs(c.z - PLAYER_Z);
        if (distZ < 260) {
          c.lane += ((player.laneIndex) - c.lane) * dt * 9;
        }
      }

      const dz = c.z - PLAYER_Z;
      if (!c.collected && dz <= 40 && dz >= -25) {
        const laneOffset = c.lane - 1;
        if (Math.abs(player.laneProgress - laneOffset) < (isMagnetActive ? 0.85 : 0.50)) {
          c.collected = true;
          gameState.coins++;
          gameState.score += 25;
          sound.playCoin();
          const p = projectTrack(laneOffset, PLAYER_Z, c.sky ? 140 : 0);
          addBurst(p.x, p.y, '#F59E0B', 12);
          addFloatingText('+25 🪙', p.x, p.y - 20, '#D97706');
          updateHUD();
        }
      }
      if (c.z < -40 || c.collected) coins.splice(i, 1);
    }

    // Update Power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      pu.z -= (gameState.speed * 1.5) * dt;
      const dz = pu.z - PLAYER_Z;
      if (!pu.collected && dz <= 38 && dz >= -25) {
        const laneOffset = pu.lane - 1;
        if (Math.abs(player.laneProgress - laneOffset) < 0.52) {
          pu.collected = true;
          const dur = pu.type === 'MAGNET' ? 10 : pu.type === 'BOOTS' ? 8 : 6;
          player.activatePowerup(pu.type, dur);
        }
      }
      if (pu.z < -40 || pu.collected) powerups.splice(i, 1);
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

    // Concrete Walls with Coping Stone Rims
    const wallLeftTop = horizonX - horizonTrackWidth / 2 - 20;
    const wallLeftBot = horizonX - bottomTrackWidth / 2 - 60;
    const wallRightTop = horizonX + horizonTrackWidth / 2 + 20;
    const wallRightBot = horizonX + bottomTrackWidth / 2 + 60;

    // Left wall
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.moveTo(wallLeftTop, horizonY);
    ctx.lineTo(wallLeftTop - 35, horizonY - 45);
    ctx.lineTo(wallLeftBot - 85, bottomY - 50);
    ctx.lineTo(wallLeftBot, bottomY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(wallLeftTop - 35, horizonY - 45); ctx.lineTo(wallLeftBot - 85, bottomY - 50); ctx.stroke();

    // Right wall
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.moveTo(wallRightTop, horizonY);
    ctx.lineTo(wallRightTop + 35, horizonY - 45);
    ctx.lineTo(wallRightBot + 85, bottomY - 50);
    ctx.lineTo(wallRightBot, bottomY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(wallRightTop + 35, horizonY - 45); ctx.lineTo(wallRightBot + 85, bottomY - 50); ctx.stroke();

    // Railway Ballast
    const ballast = ctx.createLinearGradient(0, horizonY, 0, bottomY);
    ballast.addColorStop(0, '#64748B'); ballast.addColorStop(1, '#475569');
    ctx.fillStyle = ballast;
    ctx.beginPath();
    ctx.moveTo(wallLeftTop, horizonY);
    ctx.lineTo(wallRightTop, horizonY);
    ctx.lineTo(wallRightBot, bottomY);
    ctx.lineTo(wallLeftBot, bottomY);
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

    // Helper to render Overhead Catenary Gantry Arch with Signals
    function drawGantry(z) {
      if (z > 980 || z < -20) return;
      const leftP = projectTrack(-1.6, z);
      const rightP = projectTrack(1.6, z);
      const beamH = 260 * leftP.scale;

      ctx.save();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = Math.max(2, 6 * leftP.scale);
      // Pylons
      ctx.beginPath(); ctx.moveTo(leftP.x, leftP.y); ctx.lineTo(leftP.x, leftP.y - beamH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rightP.x, rightP.y); ctx.lineTo(rightP.x, rightP.y - beamH); ctx.stroke();
      // Overhead Crossbeam
      ctx.lineWidth = Math.max(3, 8 * leftP.scale);
      ctx.beginPath(); ctx.moveTo(leftP.x, leftP.y - beamH); ctx.lineTo(rightP.x, rightP.y - beamH); ctx.stroke();

      // 3 Signal Lights for each lane
      [-1, 0, 1].forEach((laneIdx) => {
        const laneP = projectTrack(laneIdx, z);
        const sigX = laneP.x;
        const sigY = laneP.y - beamH;
        const danger = obstacles.some(o => o.lane === (laneIdx + 1) && o.z > z && o.z < z + 360);

        ctx.fillStyle = '#0F172A';
        ctx.fillRect(sigX - 8 * laneP.scale, sigY - 12 * laneP.scale, 16 * laneP.scale, 24 * laneP.scale);

        ctx.fillStyle = danger ? '#EF4444' : '#10B981';
        ctx.beginPath(); ctx.arc(sigX, sigY, 5 * laneP.scale, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = danger ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)';
        ctx.beginPath(); ctx.arc(sigX, sigY, 11 * laneP.scale, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }

    // Helper to render an obstacle (TRAIN, WALL, HURDLE)
    function drawObstacle(o) {
      if (o.z > 980 || o.z < -50) return;
      const p = projectTrack(o.lane - 1, o.z);
      const w = 150 * p.scale;
      ctx.save();

      if (o.type === 'TRAIN') {
        // 3D Subway Train Carriage
        const pBack = projectTrack(o.lane - 1, o.z + 160);
        const hFront = 220 * p.scale;
        const hBack = 220 * pBack.scale;
        const wBack = 150 * pBack.scale;

        // 1. Train Roof
        ctx.fillStyle = '#94A3B8';
        ctx.beginPath();
        ctx.moveTo(p.x - w / 2, p.y - hFront);
        ctx.lineTo(p.x + w / 2, p.y - hFront);
        ctx.lineTo(pBack.x + wBack / 2, pBack.y - hBack);
        ctx.lineTo(pBack.x - wBack / 2, pBack.y - hBack);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#64748B'; ctx.lineWidth = Math.max(1, 2 * p.scale); ctx.stroke();

        // 2. Train Side Wall (if perspective shows left or right flank)
        const laneIdx = o.lane - 1;
        if (laneIdx !== 0) {
          ctx.fillStyle = '#991B1B'; // Dark red carriage flank
          ctx.beginPath();
          if (laneIdx < 0) {
            ctx.moveTo(p.x + w / 2, p.y - hFront);
            ctx.lineTo(p.x + w / 2, p.y);
            ctx.lineTo(pBack.x + wBack / 2, pBack.y);
            ctx.lineTo(pBack.x + wBack / 2, pBack.y - hBack);
          } else {
            ctx.moveTo(p.x - w / 2, p.y - hFront);
            ctx.lineTo(p.x - w / 2, p.y);
            ctx.lineTo(pBack.x - wBack / 2, pBack.y);
            ctx.lineTo(pBack.x - wBack / 2, pBack.y - hBack);
          }
          ctx.closePath();
          ctx.fill();
        }

        // 3. Train Front Face
        ctx.fillStyle = '#DC2626'; // Vibrant subway red
        ctx.beginPath();
        ctx.roundRect(p.x - w / 2, p.y - hFront, w, hFront, 14 * p.scale);
        ctx.fill();

        // Windshield (Cabin glass)
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.roundRect(p.x - w / 2 + 12 * p.scale, p.y - hFront + 24 * p.scale, w - 24 * p.scale, 54 * p.scale, 6 * p.scale);
        ctx.fill();
        // Windshield blue reflection
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(p.x - w / 2 + 18 * p.scale, p.y - hFront + 30 * p.scale, (w - 36 * p.scale) / 2, 42 * p.scale);

        // Destination Banner
        ctx.fillStyle = '#FEF08A';
        ctx.font = `bold ${Math.round(11 * p.scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('SUBWAY EXPRESS', p.x, p.y - hFront + 16 * p.scale);

        // Silver Front Grille
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(p.x - w / 2 + 20 * p.scale, p.y - 70 * p.scale, w - 40 * p.scale, 35 * p.scale);
        ctx.fillStyle = '#334155';
        for (let g = 0; g < w - 46 * p.scale; g += 8 * p.scale) {
          ctx.fillRect(p.x - w / 2 + 24 * p.scale + g, p.y - 68 * p.scale, 4 * p.scale, 31 * p.scale);
        }

        // Dual Headlights
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath(); ctx.arc(p.x - w / 2 + 24 * p.scale, p.y - 25 * p.scale, 10 * p.scale, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(p.x + w / 2 - 24 * p.scale, p.y - 25 * p.scale, 10 * p.scale, 0, Math.PI * 2); ctx.fill();

        // Glowing Headlight Cones
        if (p.scale > 0.3) {
          const beam = ctx.createLinearGradient(p.x, p.y, p.x, p.y + 110 * p.scale);
          beam.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
          beam.addColorStop(1, 'rgba(254, 240, 138, 0)');
          ctx.fillStyle = beam;
          ctx.beginPath();
          ctx.moveTo(p.x - w / 2 + 12 * p.scale, p.y - 25 * p.scale);
          ctx.lineTo(p.x - w * 0.85, p.y + 110 * p.scale);
          ctx.lineTo(p.x + w * 0.85, p.y + 110 * p.scale);
          ctx.lineTo(p.x + w / 2 - 12 * p.scale, p.y - 25 * p.scale);
          ctx.fill();
        }
      } else if (o.type === 'HURDLE') {
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
      const p = projectTrack(c.lane - 1, c.z, c.sky ? 140 : 24);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(0, 0, 22 * p.scale, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FFA500'; ctx.lineWidth = 3 * p.scale; ctx.stroke();
      ctx.restore();
    }

    // Helper to render a power-up
    function drawPowerup(pu) {
      if (pu.collected || pu.z > 980 || pu.z < -20) return;
      const p = projectTrack(pu.lane - 1, pu.z, 28);
      ctx.save();
      ctx.translate(p.x, p.y);
      const bob = Math.sin(Date.now() / 150) * 8 * p.scale;
      ctx.translate(0, bob);

      // Glowing aura
      const auraColor = pu.type === 'MAGNET' ? 'rgba(245, 158, 11, 0.35)' : pu.type === 'BOOTS' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(139, 92, 246, 0.35)';
      ctx.fillStyle = auraColor;
      ctx.beginPath(); ctx.arc(0, 0, 36 * p.scale, 0, Math.PI * 2); ctx.fill();

      // Icon circle
      ctx.fillStyle = pu.type === 'MAGNET' ? '#F59E0B' : pu.type === 'BOOTS' ? '#10B981' : '#8B5CF6';
      ctx.beginPath(); ctx.arc(0, 0, 24 * p.scale, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3 * p.scale; ctx.stroke();

      ctx.font = `${Math.round(22 * p.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = pu.type === 'MAGNET' ? '🧲' : pu.type === 'BOOTS' ? '👟' : '🚀';
      ctx.fillText(icon, 0, 2 * p.scale);
      ctx.restore();
    }

    // Overhead Gantries
    [320, 680].forEach(drawGantry);

    // 3. Background Items (z > PLAYER_Z, sorted furthest to nearest)
    coins.filter(c => c.z > PLAYER_Z).forEach(drawCoin);
    powerups.filter(pu => pu.z > PLAYER_Z).forEach(drawPowerup);
    obstacles.filter(o => o.z > PLAYER_Z).sort((a, b) => b.z - a.z).forEach(drawObstacle);

    // 4. Stickman (at PLAYER_Z)
    player.render(ctx);

    // 5. Foreground Items (z <= PLAYER_Z, sorted furthest to nearest)
    coins.filter(c => c.z <= PLAYER_Z).forEach(drawCoin);
    powerups.filter(pu => pu.z <= PLAYER_Z).forEach(drawPowerup);
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
  }

  function updateHUD() {
    document.getElementById('hud-distance').textContent = `${Math.floor(gameState.distance)}m`;
    document.getElementById('hud-score').textContent = gameState.score.toLocaleString();
    document.getElementById('hud-coins').textContent = gameState.coins;

    const streakEl = document.getElementById('hud-streak');
    const multEl = document.getElementById('hud-multiplier');
    if (streakEl) streakEl.textContent = `${gameState.streak}`;
    if (multEl) multEl.textContent = `${gameState.multiplier.toFixed(1)}x`;
  }

  function updatePowerupHUD() {
    const card = document.getElementById('hud-powerup-card');
    if (!card) return;
    if (!player.powerup) {
      card.style.display = 'none';
      return;
    }
    card.style.display = 'flex';
    const iconEl = document.getElementById('hud-powerup-icon');
    const nameEl = document.getElementById('hud-powerup-name');
    const fillEl = document.getElementById('hud-powerup-fill');

    const iconMap = { MAGNET: '🧲', BOOTS: '👟', JETPACK: '🚀' };
    const colorMap = { MAGNET: '#F59E0B', BOOTS: '#10B981', JETPACK: '#8B5CF6' };

    if (iconEl) iconEl.textContent = iconMap[player.powerup.type] || '⚡';
    if (nameEl) nameEl.textContent = player.powerup.type;

    const pct = Math.max(0, Math.min(100, (player.powerup.timer / player.powerup.maxTimer) * 100));
    if (fillEl) {
      fillEl.style.width = `${pct}%`;
      fillEl.style.backgroundColor = colorMap[player.powerup.type] || '#D97706';
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

  // Instant Developer & Visual Test Preview Mode (?test=1)
  if (window.location.search.includes('test=1')) {
    setTimeout(() => {
      player.activatePowerup('MAGNET', 10);
      obstacles.push({ type: 'TRAIN', lane: 1, z: 460, hit: false, passed: false, cleared: false });
      obstacles.push({ type: 'HURDLE', lane: 0, z: 620, hit: false, passed: false, cleared: false });
      powerups.push({ type: 'BOOTS', lane: 2, z: 520, collected: false });
      coins.push({ lane: 1, z: 260, collected: false });
      coins.push({ lane: 1, z: 320, collected: false });
    }, 200);
  }

  setInterval(pollServerChat, 1000);
  requestAnimationFrame(loop);
})();
