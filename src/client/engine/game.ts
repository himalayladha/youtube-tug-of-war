import { GameAction } from '../../shared/types.js';
import { StickmanPlayer } from './player.js';
import { ObstacleManager, Obstacle3D, projectTrack3D } from './obstacleManager.js';
import { CollectibleManager, Collectible3D } from './collectibleManager.js';
import { ParticleSystem } from './particles.js';
import { SoundManager } from './sound.js';

export interface GameCallbacks {
  onScoreUpdate?: (score: number, distance: number, gems: number, multiplier: number) => void;
  onHealthUpdate?: (health: number, maxHealth: number) => void;
  onGameOver?: (finalDistance: number, finalScore: number) => void;
  onDodgeEvent?: (obstacle: Obstacle3D) => void;
}

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  public player: StickmanPlayer;
  public obstacleManager: ObstacleManager;
  public collectibleManager: CollectibleManager;
  public particleSystem: ParticleSystem;
  public soundManager: SoundManager;

  // Game state
  public isRunning: boolean = false;
  public isGameOver: boolean = false;
  public respawnCountdown: number = 0;

  // Speed and difficulty
  public baseSpeed: number = 380;
  public currentSpeed: number = 380;
  public maxSpeed: number = 850;

  // Stats
  public distanceMeters: number = 0;
  public score: number = 0;
  public coinsCollected: number = 0;
  public health: number = 3;
  public maxHealth: number = 3;

  // Track animation offset
  private trackOffset: number = 0;

  // City Skyline Silhouettes
  private buildings: Array<{ x: number; width: number; height: number; color: string }> = [];

  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private callbacks: GameCallbacks;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks = {}) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2D canvas context');
    this.ctx = context;
    this.callbacks = callbacks;

    // 1920x1080 resolution
    this.canvas.width = 1920;
    this.canvas.height = 1080;

    this.player = new StickmanPlayer();
    this.obstacleManager = new ObstacleManager();
    this.collectibleManager = new CollectibleManager();
    this.particleSystem = new ParticleSystem();
    this.soundManager = new SoundManager();

    this.initSkyline();
  }

  private initSkyline(): void {
    const colors = ['#0B0E1B', '#12182D', '#1A213D', '#232D52'];
    let x = -200;
    while (x < 2200) {
      const width = Math.random() * 90 + 40;
      const height = Math.random() * 160 + 80;
      this.buildings.push({
        x,
        width,
        height,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
      x += width + Math.random() * 10;
    }
  }

  public start(): void {
    this.reset();
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public reset(): void {
    this.isGameOver = false;
    this.respawnCountdown = 0;
    this.distanceMeters = 0;
    this.score = 0;
    this.coinsCollected = 0;
    this.health = 3;
    this.currentSpeed = this.baseSpeed;

    this.player.reset();
    this.obstacleManager.reset();
    this.collectibleManager.reset();
    this.particleSystem.reset();

    this.callbacks.onHealthUpdate?.(this.health, this.maxHealth);
    this.callbacks.onScoreUpdate?.(this.score, this.distanceMeters, this.coinsCollected, 1);
  }

  public executeAction(action: GameAction, actorName: string = 'Viewer'): void {
    if (this.isGameOver) return;

    this.player.handleAction(action);

    if (action === 'JUMP') {
      this.soundManager.playJump();
      this.particleSystem.addFloatingText(`▲ JUMP! (${actorName})`, 960, 720, '#00F0FF', 20);
    } else if (action === 'LEFT') {
      this.soundManager.playSlide();
      this.particleSystem.addFloatingText(`◄ LEFT (${actorName})`, 820, 740, '#FFE600', 18);
    } else if (action === 'RIGHT') {
      this.soundManager.playSlide();
      this.particleSystem.addFloatingText(`► RIGHT (${actorName})`, 1100, 740, '#FF0055', 18);
    }
  }

  private handleCollision(obstacle: Obstacle3D): void {
    const tookDamage = this.player.triggerHit();

    if (tookDamage) {
      this.soundManager.playHit();
      this.health = Math.max(0, this.health - 1);
      this.callbacks.onHealthUpdate?.(this.health, this.maxHealth);

      this.particleSystem.addBurst(960 + this.player.laneProgress * 320, 880, '#FF0055', 25);
      this.particleSystem.addFloatingText('CRASH! -1 HP', 960 + this.player.laneProgress * 320, 820, '#FF0055', 28);

      if (this.health <= 0) {
        this.triggerGameOver();
      }
    }
  }

  private handleDodge(obstacle: Obstacle3D): void {
    const bonus = 50;
    this.score += bonus;
    this.callbacks.onDodgeEvent?.(obstacle);
    this.particleSystem.addFloatingText(`+${bonus} DODGED!`, 960, 680, '#FFE600', 18);
  }

  private handleCollect(coin: Collectible3D): void {
    this.soundManager.playCollect();
    this.coinsCollected++;
    this.score += coin.value;

    this.callbacks.onScoreUpdate?.(this.score, Math.floor(this.distanceMeters), this.coinsCollected, 1);

    const proj = projectTrack3D(coin.laneIndex - 1, 40);
    this.particleSystem.addBurst(proj.x, proj.y, '#FFD700', 14);
    this.particleSystem.addFloatingText(`+${coin.value} 🪙`, proj.x, proj.y - 20, '#FFD700', 18);
  }

  private triggerGameOver(): void {
    this.isGameOver = true;
    this.respawnCountdown = 5.0;
    this.soundManager.playGameOver();
    this.callbacks.onGameOver?.(Math.floor(this.distanceMeters), this.score);
  }

  public update(dt: number): void {
    if (!this.isRunning) return;

    if (this.isGameOver) {
      this.respawnCountdown -= dt;
      if (this.respawnCountdown <= 0) {
        this.reset();
      }
      this.particleSystem.update(dt);
      return;
    }

    // Speed progression
    this.distanceMeters += (this.currentSpeed * dt) / 10;
    this.score += Math.floor(dt * 15);
    this.currentSpeed = Math.min(this.maxSpeed, this.baseSpeed + (this.distanceMeters / 100) * 15);

    // Track offset scrolling forward
    this.trackOffset = (this.trackOffset + this.currentSpeed * dt * 2.5) % 120;

    // Update player
    this.player.update(dt);

    // Update obstacles
    this.obstacleManager.update(
      dt,
      this.currentSpeed,
      this.player,
      (obs) => this.handleCollision(obs),
      (obs) => this.handleDodge(obs)
    );

    // Update coins
    this.collectibleManager.update(
      dt,
      this.currentSpeed,
      this.player,
      (c) => this.handleCollect(c)
    );

    // Update particles
    this.particleSystem.update(dt);

    this.callbacks.onScoreUpdate?.(
      this.score,
      Math.floor(this.distanceMeters),
      this.coinsCollected,
      1 + Math.floor(this.distanceMeters / 200) * 0.2
    );
  }

  public render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 1920, 1080);

    const horizonX = 960;
    const horizonY = 320;
    const bottomY = 1000;

    // 1. Sky & Backdrop (Night City Horizon)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, '#03050C');
    skyGrad.addColorStop(0.7, '#080F25');
    skyGrad.addColorStop(1, '#1A0C2E');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1920, horizonY);

    // Neon Cyber Sun / Moon at horizon
    const sunGrad = ctx.createRadialGradient(horizonX, horizonY - 40, 10, horizonX, horizonY - 40, 120);
    sunGrad.addColorStop(0, '#FF007F');
    sunGrad.addColorStop(0.5, '#7928CA');
    sunGrad.addColorStop(1, 'rgba(121, 40, 202, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(horizonX, horizonY - 40, 120, 0, Math.PI * 2);
    ctx.fill();

    // Skyline silhouettes
    for (const bldg of this.buildings) {
      ctx.fillStyle = bldg.color;
      ctx.fillRect(bldg.x, horizonY - bldg.height, bldg.width, bldg.height);
    }

    // 2. Ground & Subway Surfers Roadbed
    const groundGrad = ctx.createLinearGradient(0, horizonY, 0, 1080);
    groundGrad.addColorStop(0, '#0A0C16');
    groundGrad.addColorStop(1, '#020308');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY, 1920, 1080 - horizonY);

    // 3. Perspective Subway Track Surface
    // Vanishing track polygon
    const horizonTrackWidth = 140;
    const bottomTrackWidth = 1050;

    ctx.save();
    ctx.fillStyle = '#111526';
    ctx.beginPath();
    ctx.moveTo(horizonX - horizonTrackWidth / 2, horizonY);
    ctx.lineTo(horizonX + horizonTrackWidth / 2, horizonY);
    ctx.lineTo(horizonX + bottomTrackWidth / 2, bottomY);
    ctx.lineTo(horizonX - bottomTrackWidth / 2, bottomY);
    ctx.closePath();
    ctx.fill();

    // Track outer glowing neon borders
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00F0FF';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(horizonX - horizonTrackWidth / 2, horizonY);
    ctx.lineTo(horizonX - bottomTrackWidth / 2, bottomY);
    ctx.moveTo(horizonX + horizonTrackWidth / 2, horizonY);
    ctx.lineTo(horizonX + bottomTrackWidth / 2, bottomY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. Railway Sleepers / Cross-Ties (Rushing forward)
    // Draw 18 perspective cross ties
    for (let i = 0; i < 20; i++) {
      // Calculate depth t
      const baseT = (i * 50 + this.trackOffset) / 1000;
      if (baseT < 0 || baseT > 1) continue;

      const perspT = Math.pow(baseT, 1.4);
      const tieY = horizonY + perspT * (bottomY - horizonY);
      const tieWidth = horizonTrackWidth + perspT * (bottomTrackWidth - horizonTrackWidth);
      const tieThickness = Math.max(2, 8 * perspT);

      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 0, 127, 0.4)' : 'rgba(0, 240, 255, 0.35)';
      ctx.fillRect(horizonX - tieWidth / 2, tieY, tieWidth, tieThickness);
    }

    // 5. 3 Lane Dividing Rails
    [-0.5, 0.5].forEach((offset) => {
      const topX = horizonX + offset * (horizonTrackWidth / 3);
      const botX = horizonX + offset * (bottomTrackWidth / 3);
      ctx.strokeStyle = '#FFE600';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#FFE600';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(topX, horizonY);
      ctx.lineTo(botX, bottomY);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Overhead Subway Tunnel Arches
    for (let archZ = 800; archZ >= 200; archZ -= 300) {
      const currentZ = (archZ - this.trackOffset * 2 + 1000) % 1000;
      const projL = projectTrack3D(-1.5, currentZ);
      const projR = projectTrack3D(1.5, currentZ);
      const archH = 260 * projL.scale;

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.lineWidth = 3 * projL.scale;
      ctx.beginPath();
      ctx.moveTo(projL.x, projL.y);
      ctx.lineTo(projL.x, projL.y - archH);
      ctx.lineTo(projR.x, projR.y - archH);
      ctx.lineTo(projR.x, projR.y);
      ctx.stroke();
    }

    ctx.restore();

    // 6. Lane Indicators on Track Floor
    ctx.font = 'bold 16px "Inter", monospace';
    ctx.textAlign = 'center';
    const laneLabels = ['◄ LANE 1 (LEFT)', '▲ LANE 2 (CENTER)', '► LANE 3 (RIGHT)'];
    const trackLaneWidth = bottomTrackWidth / 3;

    [-1, 0, 1].forEach((laneOffset, idx) => {
      const x = horizonX + laneOffset * trackLaneWidth;
      ctx.fillStyle = this.player.laneIndex === idx ? '#00F0FF' : 'rgba(255, 255, 255, 0.25)';
      ctx.fillText(laneLabels[idx], x, bottomY + 36);
    });

    // 7. Render Collectibles (Coins)
    this.collectibleManager.render(ctx);

    // 8. Render 3D Obstacles (Hurdles & Walls)
    this.obstacleManager.render(ctx);

    // 9. Render Stickman Player (Subway Surfers View from behind/above)
    this.player.render(ctx, horizonX, trackLaneWidth, 900);

    // 10. Render Particles & Floating Feedback
    this.particleSystem.render(ctx);

    // 11. Game Over Overlay
    if (this.isGameOver) {
      ctx.save();
      ctx.fillStyle = 'rgba(5, 7, 17, 0.88)';
      ctx.fillRect(0, 0, 1920, 1080);

      ctx.fillStyle = '#FF0055';
      ctx.shadowColor = '#FF0055';
      ctx.shadowBlur = 30;
      ctx.font = '900 76px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RUN COMPLETED', 960, 440);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 34px "Inter", sans-serif';
      ctx.fillText(`Distance: ${Math.floor(this.distanceMeters)}m  •  Coins: ${this.coinsCollected} 🪙  •  Score: ${this.score}`, 960, 520);

      ctx.fillStyle = '#00F0FF';
      ctx.font = 'bold 24px "Inter", monospace';
      ctx.fillText(`Restarting live run in ${Math.ceil(this.respawnCountdown)}s...`, 960, 590);
      ctx.restore();
    }
  }

  private loop(timestamp: number): void {
    const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame((ts) => this.loop(ts));
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
