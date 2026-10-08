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

  // Daylight scenery (Clouds, Sunny Buildings)
  private clouds: Array<{ x: number; y: number; scale: number; speed: number }> = [];
  private buildings: Array<{ x: number; width: number; height: number; color: string; roofColor: string }> = [];

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

    this.initDaylightScenery();
  }

  private initDaylightScenery(): void {
    // Drifting fluffy clouds
    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        x: Math.random() * 2000,
        y: Math.random() * 140 + 30,
        scale: Math.random() * 0.7 + 0.8,
        speed: Math.random() * 15 + 12,
      });
    }

    // Sunny pastel buildings & city architecture
    const bodyColors = ['#F87171', '#FB923C', '#FBBF24', '#38BDF8', '#818CF8', '#A78BFA', '#34D399'];
    const roofColors = ['#DC2626', '#EA580C', '#D97706', '#0284C7', '#4F46E5', '#7C3AED', '#059669'];

    let x = -200;
    while (x < 2200) {
      const width = Math.random() * 80 + 50;
      const height = Math.random() * 150 + 90;
      const cIdx = Math.floor(Math.random() * bodyColors.length);
      this.buildings.push({
        x,
        width,
        height,
        color: bodyColors[cIdx],
        roofColor: roofColors[cIdx],
      });
      x += width + Math.random() * 14;
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
      this.particleSystem.addFloatingText(`▲ JUMP! (${actorName})`, 960, 720, '#0284C7', 22);
      this.particleSystem.addBurst(960 + this.player.laneProgress * 320, 900, '#E2E8F0', 10);
    } else if (action === 'LEFT') {
      this.soundManager.playSlide();
      this.particleSystem.addFloatingText(`◄ LEFT (${actorName})`, 800, 740, '#F43F5E', 20);
      this.particleSystem.addBurst(800, 900, '#F43F5E', 8);
    } else if (action === 'RIGHT') {
      this.soundManager.playSlide();
      this.particleSystem.addFloatingText(`► RIGHT (${actorName})`, 1120, 740, '#059669', 20);
      this.particleSystem.addBurst(1120, 900, '#059669', 8);
    }
  }

  private handleCollision(obstacle: Obstacle3D): void {
    const tookDamage = this.player.triggerHit();

    if (tookDamage) {
      this.soundManager.playHit();
      this.health = Math.max(0, this.health - 1);
      this.callbacks.onHealthUpdate?.(this.health, this.maxHealth);

      this.particleSystem.addBurst(960 + this.player.laneProgress * 320, 880, '#EF4444', 30);
      this.particleSystem.addFloatingText('CRASH! -1 HP', 960 + this.player.laneProgress * 320, 820, '#EF4444', 30);

      if (this.health <= 0) {
        this.triggerGameOver();
      }
    }
  }

  private handleDodge(obstacle: Obstacle3D): void {
    const bonus = 50;
    this.score += bonus;
    this.callbacks.onDodgeEvent?.(obstacle);
    this.particleSystem.addFloatingText(`+${bonus} DODGED!`, 960, 680, '#F59E0B', 20);
  }

  private handleCollect(coin: Collectible3D): void {
    this.soundManager.playCollect();
    this.coinsCollected++;
    this.score += coin.value;

    this.callbacks.onScoreUpdate?.(this.score, Math.floor(this.distanceMeters), this.coinsCollected, 1);

    const proj = projectTrack3D(coin.laneIndex - 1, 40);
    this.particleSystem.addBurst(proj.x, proj.y, '#F59E0B', 16);
    this.particleSystem.addFloatingText(`+${coin.value} 🪙`, proj.x, proj.y - 20, '#D97706', 20);
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

    // Cloud drifting
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x > 2100) cloud.x = -200;
    }

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

  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.arc(28, -8, 22, 0, Math.PI * 2);
    ctx.arc(52, 0, 20, 0, Math.PI * 2);
    ctx.arc(22, 10, 24, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  public render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 1920, 1080);

    const horizonX = 960;
    const horizonY = 320;
    const bottomY = 1000;

    // 1. Sunny Blue Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, '#38BDF8');   // Vivid Sky Blue
    skyGrad.addColorStop(0.6, '#7DD3FC'); // Light Cyan Sky
    skyGrad.addColorStop(1, '#E0F2FE');   // Warm Horizon Glow
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1920, horizonY);

    // Golden Sun
    const sunGrad = ctx.createRadialGradient(horizonX + 280, 120, 20, horizonX + 280, 120, 160);
    sunGrad.addColorStop(0, '#FEF08A');
    sunGrad.addColorStop(0.3, '#FBBF24');
    sunGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(horizonX + 280, 120, 160, 0, Math.PI * 2);
    ctx.fill();

    // Drifting Fluffy Clouds
    for (const cloud of this.clouds) {
      this.drawCloud(ctx, cloud.x, cloud.y, cloud.scale);
    }

    // Sunny City Skyline Silhouettes
    for (const bldg of this.buildings) {
      ctx.fillStyle = bldg.color;
      ctx.fillRect(bldg.x, horizonY - bldg.height, bldg.width, bldg.height);
      // Roof trim
      ctx.fillStyle = bldg.roofColor;
      ctx.fillRect(bldg.x - 2, horizonY - bldg.height - 4, bldg.width + 4, 6);
      // Windows
      ctx.fillStyle = '#FFFFFF';
      for (let r = 16; r < bldg.height - 20; r += 24) {
        for (let c = 8; c < bldg.width - 12; c += 16) {
          ctx.fillRect(bldg.x + c, horizonY - bldg.height + r, 8, 12);
        }
      }
    }

    // 2. Ground & Track Surroundings (Grass & Ballast)
    const groundGrad = ctx.createLinearGradient(0, horizonY, 0, 1080);
    groundGrad.addColorStop(0, '#86EFAC'); // Light green grass along horizon
    groundGrad.addColorStop(0.2, '#4ADE80');
    groundGrad.addColorStop(1, '#22C55E'); // Fresh vibrant green lawn
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY, 1920, 1080 - horizonY);

    // 3. 3D Railway Track Bed (Warm Gravel Ballast)
    const horizonTrackWidth = 140;
    const bottomTrackWidth = 1050;

    ctx.save();
    // Ballast trackbed polygon
    const ballastGrad = ctx.createLinearGradient(0, horizonY, 0, bottomY);
    ballastGrad.addColorStop(0, '#94A3B8'); // Slate ballast
    ballastGrad.addColorStop(1, '#64748B');
    ctx.fillStyle = ballastGrad;
    ctx.beginPath();
    ctx.moveTo(horizonX - horizonTrackWidth / 2 - 20, horizonY);
    ctx.lineTo(horizonX + horizonTrackWidth / 2 + 20, horizonY);
    ctx.lineTo(horizonX + bottomTrackWidth / 2 + 60, bottomY);
    ctx.lineTo(horizonX - bottomTrackWidth / 2 - 60, bottomY);
    ctx.closePath();
    ctx.fill();

    // 4. Wooden Railway Sleepers / Cross-Ties (Rushing forward)
    for (let i = 0; i < 22; i++) {
      const baseT = (i * 48 + this.trackOffset) / 1000;
      if (baseT < 0 || baseT > 1) continue;

      const perspT = Math.pow(baseT, 1.4);
      const tieY = horizonY + perspT * (bottomY - horizonY);
      const tieWidth = horizonTrackWidth + perspT * (bottomTrackWidth - horizonTrackWidth);
      const tieThickness = Math.max(3, 10 * perspT);

      // Oak wood sleepers with specular edge
      ctx.fillStyle = '#78350F'; // Rich Oak Brown
      ctx.fillRect(horizonX - tieWidth / 2, tieY, tieWidth, tieThickness);
      // Highlight on top of sleeper
      ctx.fillStyle = '#92400E';
      ctx.fillRect(horizonX - tieWidth / 2, tieY, tieWidth, Math.max(1, 2 * perspT));
    }

    // 5. Polished Steel Rails for each of the 3 Lanes
    // 3 lanes -> 6 steel rails (left and right rail for each track)
    const trackLaneWidth = bottomTrackWidth / 3;
    const horizonLaneWidth = horizonTrackWidth / 3;

    [-1, 0, 1].forEach((laneIdx) => {
      // Draw 2 steel rails per lane
      [-0.32, 0.32].forEach((railOffset) => {
        const topX = horizonX + (laneIdx + railOffset) * horizonLaneWidth;
        const botX = horizonX + (laneIdx + railOffset) * trackLaneWidth;

        // Steel rail shadow
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(topX, horizonY);
        ctx.lineTo(botX, bottomY);
        ctx.stroke();

        // Gleaming polished rail surface
        ctx.strokeStyle = '#F1F5F9';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(topX, horizonY);
        ctx.lineTo(botX, bottomY);
        ctx.stroke();
      });
    });

    // Track Boundary Safety Kerbs
    ctx.strokeStyle = '#FBBF24'; // Yellow safety curb line
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(horizonX - horizonTrackWidth / 2, horizonY);
    ctx.lineTo(horizonX - bottomTrackWidth / 2, bottomY);
    ctx.moveTo(horizonX + horizonTrackWidth / 2, horizonY);
    ctx.lineTo(horizonX + bottomTrackWidth / 2, bottomY);
    ctx.stroke();

    ctx.restore();

    // 6. Lane Indicators on Track Floor
    ctx.font = '900 18px "Inter", sans-serif';
    ctx.textAlign = 'center';
    const laneLabels = ['◄ LANE 1 (LEFT)', '▲ LANE 2 (CENTER)', '► LANE 3 (RIGHT)'];

    [-1, 0, 1].forEach((laneOffset, idx) => {
      const x = horizonX + laneOffset * trackLaneWidth;
      ctx.fillStyle = this.player.laneIndex === idx ? '#0284C7' : '#64748B';
      ctx.fillText(laneLabels[idx], x, bottomY + 38);
    });

    // 7. Render Collectibles (Coins)
    this.collectibleManager.render(ctx);

    // 8. Render 3D Obstacles (Daylight Hurdles & Red Trains)
    this.obstacleManager.render(ctx);

    // 9. Render Stickman Player (Daylight Stickman)
    this.player.render(ctx, horizonX, trackLaneWidth, 900);

    // 10. Render Particles & Floating Feedback
    this.particleSystem.render(ctx);

    // 11. Game Over Overlay (Light Theme Modal)
    if (this.isGameOver) {
      ctx.save();
      ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
      ctx.fillRect(0, 0, 1920, 1080);

      ctx.fillStyle = '#EF4444';
      ctx.shadowColor = 'rgba(239, 68, 68, 0.3)';
      ctx.shadowBlur = 20;
      ctx.font = '900 76px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RUN COMPLETED', 960, 440);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 34px "Inter", sans-serif';
      ctx.fillText(`Distance: ${Math.floor(this.distanceMeters)}m  •  Coins: ${this.coinsCollected} 🪙  •  Score: ${this.score}`, 960, 520);

      ctx.fillStyle = '#0284C7';
      ctx.font = '900 26px "Inter", sans-serif';
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
