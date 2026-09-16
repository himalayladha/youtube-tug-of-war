import { GameAction } from '../../shared/types.js';
import { Player } from './player.js';
import { ObstacleManager, Obstacle } from './obstacleManager.js';
import { CollectibleManager, Collectible } from './collectibleManager.js';
import { ParticleSystem } from './particles.js';
import { SoundManager } from './sound.js';

export interface GameCallbacks {
  onScoreUpdate?: (score: number, distance: number, gems: number, multiplier: number) => void;
  onHealthUpdate?: (health: number, maxHealth: number) => void;
  onShieldMeterUpdate?: (percent: number) => void;
  onGameOver?: (finalDistance: number, finalScore: number) => void;
  onDodgeEvent?: (obstacle: Obstacle) => void;
}

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  public player: Player;
  public obstacleManager: ObstacleManager;
  public collectibleManager: CollectibleManager;
  public particleSystem: ParticleSystem;
  public soundManager: SoundManager;

  // Track & Lane coordinates
  public laneYCoordinates: number[] = [600, 720, 840];
  public playerX: number = 280;

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
  public gemsCollected: number = 0;
  public health: number = 3;
  public maxHealth: number = 3;
  public shieldMeter: number = 0; // 0 to 100

  // Parallax background layers
  private stars: Array<{ x: number; y: number; size: number; speed: number }> = [];
  private buildings: Array<{ x: number; width: number; height: number; color: string; windows: Array<{ x: number; y: number }> }> = [];
  private gridOffset: number = 0;

  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private callbacks: GameCallbacks;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks = {}) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2D canvas context');
    this.ctx = context;
    this.callbacks = callbacks;

    // 1920x1080 fixed virtual coordinate space
    this.canvas.width = 1920;
    this.canvas.height = 1080;

    this.player = new Player(this.laneYCoordinates[1]);
    this.player.currentX = this.playerX;
    this.player.targetX = this.playerX;

    this.obstacleManager = new ObstacleManager();
    this.collectibleManager = new CollectibleManager();
    this.particleSystem = new ParticleSystem();
    this.soundManager = new SoundManager();

    this.initParallax();
  }

  private initParallax(): void {
    // Starfield
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: Math.random() * 1920,
        y: Math.random() * 450,
        size: Math.random() * 2.5 + 1,
        speed: Math.random() * 20 + 10,
      });
    }

    // Skyline buildings
    const colors = ['#0D1117', '#161B22', '#1C2128', '#21262D'];
    let currentX = 0;
    while (currentX < 2400) {
      const width = Math.random() * 120 + 60;
      const height = Math.random() * 220 + 120;
      const windows: Array<{ x: number; y: number }> = [];

      for (let r = 0; r < height - 30; r += 20) {
        for (let c = 10; c < width - 15; c += 18) {
          if (Math.random() > 0.4) {
            windows.push({ x: c, y: r });
          }
        }
      }

      this.buildings.push({
        x: currentX,
        width,
        height,
        color: colors[Math.floor(Math.random() * colors.length)],
        windows,
      });
      currentX += width + Math.random() * 15;
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
    this.gemsCollected = 0;
    this.health = 3;
    this.shieldMeter = 0;
    this.currentSpeed = this.baseSpeed;

    this.player = new Player(this.laneYCoordinates[1]);
    this.player.currentX = this.playerX;
    this.player.targetX = this.playerX;
    this.player.laneIndex = 1;

    this.obstacleManager.reset();
    this.collectibleManager.reset();
    this.particleSystem.reset();

    this.callbacks.onHealthUpdate?.(this.health, this.maxHealth);
    this.callbacks.onShieldMeterUpdate?.(this.shieldMeter);
    this.callbacks.onScoreUpdate?.(this.score, this.distanceMeters, this.gemsCollected, 1);
  }

  public executeAction(action: GameAction, actorName: string = 'Viewer'): void {
    if (this.isGameOver) return;

    if (action === 'SHIELD') {
      if (this.shieldMeter >= 100) {
        this.shieldMeter = 0;
        this.player.activateShield(6.0);
        this.soundManager.playShield();
        this.particleSystem.addFloatingText(`🛡️ SHIELD ACTIVE! (${actorName})`, this.playerX, this.player.y - 80, '#00FF88', 22);
        this.callbacks.onShieldMeterUpdate?.(this.shieldMeter);
      } else {
        this.particleSystem.addFloatingText(`Shield charging... ${Math.round(this.shieldMeter)}%`, this.playerX, this.player.y - 80, '#888888', 16);
      }
      return;
    }

    this.player.handleAction(action);

    if (action === 'JUMP') {
      this.soundManager.playJump();
      this.particleSystem.addBurst(this.playerX, this.player.groundY, '#00F0FF', 8);
    } else if (action === 'SLIDE') {
      this.soundManager.playSlide();
      this.particleSystem.addBurst(this.playerX, this.player.groundY, '#FFE600', 8);
    } else if (action === 'LEFT' || action === 'RIGHT') {
      this.soundManager.playSlide();
      this.particleSystem.addBurst(this.playerX, this.player.groundY, '#FF0055', 6);
    }
  }

  private handleCollision(obstacle: Obstacle): void {
    const tookDamage = this.player.triggerHit();

    if (tookDamage) {
      this.soundManager.playHit();
      this.health = Math.max(0, this.health - 1);
      this.callbacks.onHealthUpdate?.(this.health, this.maxHealth);

      this.particleSystem.addBurst(this.playerX, this.player.y - 30, '#FF0055', 30);
      this.particleSystem.addFloatingText('CRASH! -1 HP', this.playerX, this.player.y - 70, '#FF0055', 24);

      if (this.health <= 0) {
        this.triggerGameOver();
      }
    } else {
      // Absorbed by shield or i-frames
      this.soundManager.playHit();
      this.particleSystem.addBurst(this.playerX, this.player.y - 30, '#00FF88', 20);
      this.particleSystem.addFloatingText('SHIELD BLOCKED!', this.playerX, this.player.y - 70, '#00FF88', 22);
    }
  }

  private handleDodge(obstacle: Obstacle): void {
    const bonus = 50;
    this.score += bonus;
    this.callbacks.onDodgeEvent?.(obstacle);
    this.particleSystem.addFloatingText(`+${bonus} DODGE!`, this.playerX + 40, this.player.y - 60, '#FFE600', 16);
  }

  private handleCollect(gem: Collectible): void {
    this.soundManager.playCollect();
    this.gemsCollected++;
    this.score += gem.value;
    this.shieldMeter = Math.min(100, this.shieldMeter + 10);

    this.callbacks.onShieldMeterUpdate?.(this.shieldMeter);
    this.callbacks.onScoreUpdate?.(this.score, Math.floor(this.distanceMeters), this.gemsCollected, 1);

    this.particleSystem.addBurst(gem.x, this.player.y - 35, '#00FFCC', 16);
    this.particleSystem.addFloatingText(`+${gem.value} 💎`, gem.x, this.player.y - 60, '#00FFCC', 18);
  }

  private triggerGameOver(): void {
    this.isGameOver = true;
    this.respawnCountdown = 5.0; // 5 second restart timer
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

    // Update target groundY based on lane
    const currentGroundY = this.laneYCoordinates[this.player.laneIndex];
    if (currentGroundY !== undefined) {
      this.player.groundY = currentGroundY;
      if (!this.player.isJumping) {
        this.player.y = currentGroundY;
      }
    }

    this.player.update(dt, [this.playerX, this.playerX, this.playerX]);

    // Update obstacles
    this.obstacleManager.update(
      dt,
      this.currentSpeed,
      1920,
      this.player,
      (obs) => this.handleCollision(obs),
      (obs) => this.handleDodge(obs)
    );

    // Update collectibles
    this.collectibleManager.update(
      dt,
      this.currentSpeed,
      1920,
      this.player,
      (gem) => this.handleCollect(gem)
    );

    // Update particles
    this.particleSystem.update(dt);

    // Parallax background updates
    this.gridOffset = (this.gridOffset + this.currentSpeed * dt) % 80;

    for (const star of this.stars) {
      star.x -= star.speed * dt;
      if (star.x < 0) star.x = 1920;
    }

    for (const bldg of this.buildings) {
      bldg.x -= this.currentSpeed * 0.15 * dt;
      if (bldg.x + bldg.width < 0) {
        // Wrap around to right
        const maxX = Math.max(...this.buildings.map((b) => b.x + b.width));
        bldg.x = maxX + Math.random() * 15;
      }
    }

    this.callbacks.onScoreUpdate?.(
      this.score,
      Math.floor(this.distanceMeters),
      this.gemsCollected,
      1 + Math.floor(this.distanceMeters / 200) * 0.2
    );
  }

  public render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 1920, 1080);

    // 1. Dark Cyberpunk Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 520);
    skyGrad.addColorStop(0, '#050711');
    skyGrad.addColorStop(0.6, '#0B0F24');
    skyGrad.addColorStop(1, '#1A0B2E');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1920, 520);

    // 2. Neon Moon / Sun
    const sunGrad = ctx.createRadialGradient(960, 260, 20, 960, 260, 140);
    sunGrad.addColorStop(0, '#FF007F');
    sunGrad.addColorStop(0.5, '#7928CA');
    sunGrad.addColorStop(1, 'rgba(121, 40, 202, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(960, 260, 140, 0, Math.PI * 2);
    ctx.fill();

    // 3. Starfield
    ctx.fillStyle = '#FFFFFF';
    for (const star of this.stars) {
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    // 4. City Skyline Silhouettes
    for (const bldg of this.buildings) {
      ctx.fillStyle = bldg.color;
      ctx.fillRect(bldg.x, 520 - bldg.height, bldg.width, bldg.height);

      // Glowing windows
      ctx.fillStyle = 'rgba(255, 230, 0, 0.4)';
      for (const win of bldg.windows) {
        ctx.fillRect(bldg.x + win.x, 520 - bldg.height + win.y, 6, 8);
      }
    }

    // 5. 3-Lane Neon Roadway
    const roadGrad = ctx.createLinearGradient(0, 520, 0, 1080);
    roadGrad.addColorStop(0, '#080A14');
    roadGrad.addColorStop(1, '#020308');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, 520, 1920, 560);

    // Perspective Track Separator Lines
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00F0FF';
    ctx.shadowBlur = 8;

    // Top Horizon boundary
    ctx.beginPath();
    ctx.moveTo(0, 520);
    ctx.lineTo(1920, 520);
    ctx.stroke();

    // Lane dividing lines
    [540, 660, 780, 900].forEach((y, idx) => {
      ctx.strokeStyle = idx === 0 || idx === 3 ? '#00F0FF' : 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = idx === 0 || idx === 3 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1920, y);
      ctx.stroke();
    });

    // Speed Grid Vertical Lines (moving left)
    ctx.strokeStyle = 'rgba(255, 0, 128, 0.18)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    for (let x = -this.gridOffset; x < 1920; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 520);
      ctx.lineTo(x, 900);
      ctx.stroke();
    }

    // Lane Badges on Left
    const laneLabels = ['LANE 1 (UP)', 'LANE 2 (MID)', 'LANE 3 (DOWN)'];
    ctx.font = 'bold 12px "Inter", monospace';
    ctx.textAlign = 'left';
    this.laneYCoordinates.forEach((y, idx) => {
      ctx.fillStyle = this.player.laneIndex === idx ? '#00F0FF' : 'rgba(255, 255, 255, 0.3)';
      ctx.fillText(laneLabels[idx], 40, y - 45);
    });

    // 6. Render Collectibles & Obstacles
    this.collectibleManager.render(ctx, this.laneYCoordinates);
    this.obstacleManager.render(ctx, this.laneYCoordinates);

    // 7. Render Player
    this.player.render(ctx);

    // 8. Render Particles & Floating Text
    this.particleSystem.render(ctx);

    // 9. Game Over Overlay
    if (this.isGameOver) {
      ctx.save();
      ctx.fillStyle = 'rgba(5, 7, 17, 0.85)';
      ctx.fillRect(0, 0, 1920, 1080);

      ctx.fillStyle = '#FF0055';
      ctx.shadowColor = '#FF0055';
      ctx.shadowBlur = 30;
      ctx.font = '900 72px "Inter", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RUN COMPLETED', 960, 440);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px "Inter", sans-serif';
      ctx.fillText(`Distance Survived: ${Math.floor(this.distanceMeters)}m  •  Final Score: ${this.score}`, 960, 520);

      ctx.fillStyle = '#00F0FF';
      ctx.font = 'bold 24px "Inter", monospace';
      ctx.fillText(`Auto-respawning community in ${Math.ceil(this.respawnCountdown)}s...`, 960, 590);
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
