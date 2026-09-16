import { Player } from './player.js';

export type ObstacleType = 'SPIKE' | 'LASER' | 'BARRIER' | 'DOUBLE_BARRIER';

export interface Obstacle {
  id: string;
  type: ObstacleType;
  laneIndex: number; // 0, 1, or 2 (or -1 for multi-lane)
  lanes: number[];   // Array of affected lane indices
  x: number;
  width: number;
  height: number;
  hasCollided: boolean;
  hasPassed: boolean;
}

export class ObstacleManager {
  public obstacles: Obstacle[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 2.0; // seconds between obstacles
  private nextObstacleId: number = 1;

  public reset(): void {
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 2.0;
  }

  public update(
    dt: number,
    gameSpeed: number,
    canvasWidth: number,
    player: Player,
    onCollision: (obstacle: Obstacle) => void,
    onDodge: (obstacle: Obstacle) => void
  ): void {
    // Dynamic difficulty: interval decreases slightly as speed increases
    this.spawnInterval = Math.max(1.1, 2.2 - (gameSpeed - 300) / 600);

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnRandomObstacle(canvasWidth);
    }

    // Move and check collisions
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= gameSpeed * dt;

      // Check collision
      if (!obs.hasCollided && !obs.hasPassed) {
        if (this.checkCollision(player, obs)) {
          obs.hasCollided = true;
          onCollision(obs);
        } else if (obs.x + obs.width / 2 < player.currentX - player.width / 2) {
          obs.hasPassed = true;
          onDodge(obs);
        }
      }

      // Remove off-screen obstacles
      if (obs.x < -150) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private checkCollision(player: Player, obs: Obstacle): boolean {
    // 1. Check if player's lane is affected by this obstacle
    if (!obs.lanes.includes(player.laneIndex)) {
      return false;
    }

    // 2. Horizontal overlap check
    const xOverlap = Math.abs(player.currentX - obs.x) < (player.width + obs.width) * 0.42;
    if (!xOverlap) return false;

    // 3. Stance / vertical safety check
    if (obs.type === 'SPIKE') {
      // If jumping high enough, safe!
      if (player.isJumping && player.y < player.groundY - 42) {
        return false;
      }
      return true;
    }

    if (obs.type === 'LASER') {
      // If sliding on ground, safe!
      if (player.isSliding && !player.isJumping) {
        return false;
      }
      return true;
    }

    if (obs.type === 'BARRIER' || obs.type === 'DOUBLE_BARRIER') {
      // Solid wall: cannot jump over or slide under
      return true;
    }

    return false;
  }

  private spawnRandomObstacle(canvasWidth: number): void {
    const types: ObstacleType[] = ['SPIKE', 'LASER', 'BARRIER', 'DOUBLE_BARRIER'];
    const type = types[Math.floor(Math.random() * types.length)];
    const id = `obs-${this.nextObstacleId++}`;
    const spawnX = canvasWidth + 80;

    let lanes: number[] = [];
    let laneIndex = 0;

    if (type === 'DOUBLE_BARRIER') {
      // Pick 1 safe lane, block the other 2
      const safeLane = Math.floor(Math.random() * 3);
      lanes = [0, 1, 2].filter((l) => l !== safeLane);
      laneIndex = lanes[0];
    } else if (type === 'LASER') {
      // Laser can span 1 or 2 lanes
      if (Math.random() > 0.5) {
        laneIndex = Math.floor(Math.random() * 2);
        lanes = [laneIndex, laneIndex + 1];
      } else {
        laneIndex = Math.floor(Math.random() * 3);
        lanes = [laneIndex];
      }
    } else {
      // Single lane obstacle
      laneIndex = Math.floor(Math.random() * 3);
      lanes = [laneIndex];
    }

    let width = 50;
    let height = 65;

    if (type === 'SPIKE') {
      width = 46;
      height = 36;
    } else if (type === 'LASER') {
      width = 30;
      height = 50;
    } else if (type === 'BARRIER' || type === 'DOUBLE_BARRIER') {
      width = 40;
      height = 75;
    }

    this.obstacles.push({
      id,
      type,
      laneIndex,
      lanes,
      x: spawnX,
      width,
      height,
      hasCollided: false,
      hasPassed: false,
    });
  }

  public render(ctx: CanvasRenderingContext2D, laneCoordinates: number[]): void {
    for (const obs of this.obstacles) {
      ctx.save();

      for (const laneIdx of obs.lanes) {
        const laneY = laneCoordinates[laneIdx];
        if (laneY === undefined) continue;

        const drawX = obs.x;
        const drawY = laneY;

        switch (obs.type) {
          case 'SPIKE': {
            // Ground Spikes (Requires Jump)
            ctx.fillStyle = '#FF0055';
            ctx.shadowColor = '#FF0055';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(drawX - 22, drawY);
            ctx.lineTo(drawX - 10, drawY - 36);
            ctx.lineTo(drawX, drawY);
            ctx.lineTo(drawX + 12, drawY - 40);
            ctx.lineTo(drawX + 22, drawY);
            ctx.closePath();
            ctx.fill();

            // Warning label
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 10px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('▲ JUMP', drawX, drawY - 44);
            break;
          }

          case 'LASER': {
            // Overhead Laser Gate (Requires Slide)
            const laserY = drawY - 48;

            // Side pylons
            ctx.fillStyle = '#334155';
            ctx.fillRect(drawX - 20, drawY - 75, 8, 75);
            ctx.fillRect(drawX + 12, drawY - 75, 8, 75);

            // Glowing Laser Beam
            ctx.fillStyle = '#FFE600';
            ctx.shadowColor = '#FFE600';
            ctx.shadowBlur = 18;
            ctx.fillRect(drawX - 18, laserY - 6, 36, 12);

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(drawX - 16, laserY - 2, 32, 4);

            // Warning label
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#FFE600';
            ctx.font = 'bold 10px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('▼ SLIDE', drawX, drawY - 82);
            break;
          }

          case 'BARRIER':
          case 'DOUBLE_BARRIER': {
            // Roadblock wall (Requires Left / Right dodge)
            ctx.fillStyle = '#7928CA';
            ctx.strokeStyle = '#FF0080';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#FF0080';
            ctx.shadowBlur = 15;

            ctx.beginPath();
            ctx.roundRect(drawX - 18, drawY - 75, 36, 75, 6);
            ctx.fill();
            ctx.stroke();

            // Hazard stripes
            ctx.fillStyle = '#FFE600';
            ctx.beginPath();
            ctx.moveTo(drawX - 12, drawY - 60);
            ctx.lineTo(drawX + 12, drawY - 45);
            ctx.lineTo(drawX + 12, drawY - 35);
            ctx.lineTo(drawX - 12, drawY - 50);
            ctx.closePath();
            ctx.fill();

            // Warning label
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#FF0080';
            ctx.font = 'bold 10px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('◄ DODGE ►', drawX, drawY - 82);
            break;
          }
        }
      }

      ctx.restore();
    }
  }
}
