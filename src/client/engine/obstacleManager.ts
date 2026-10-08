import { StickmanPlayer } from './player.js';

export type ObstacleType = 'HURDLE' | 'WALL' | 'DOUBLE_WALL';

export interface Obstacle3D {
  id: string;
  type: ObstacleType;
  laneIndex: number; // 0 = Left, 1 = Center, 2 = Right
  lanes: number[];   // Array of affected lanes
  z: number;         // 1000 (horizon) down to 0 (camera)
  hasCollided: boolean;
  hasPassed: boolean;
}

export function projectTrack3D(
  laneOffset: number, // -1 (Left), 0 (Center), 1 (Right)
  z: number,          // 1000 -> 0
  altitude: number = 0
) {
  const horizonX = 960;
  const horizonY = 320;
  const bottomY = 960;

  const t = Math.max(0, Math.min(1, (1000 - z) / 1000));
  const perspT = Math.pow(t, 1.4);

  const screenY = horizonY + perspT * (bottomY - horizonY);
  const horizonTrackWidth = 140;
  const bottomTrackWidth = 1050;
  const trackWidth = horizonTrackWidth + perspT * (bottomTrackWidth - horizonTrackWidth);
  const laneWidth = trackWidth / 3;

  const screenX = horizonX + laneOffset * laneWidth;
  const scale = 0.12 + perspT * 0.88;

  return {
    x: screenX,
    y: screenY - altitude * scale,
    scale,
    laneWidth,
    t: perspT,
  };
}

export class ObstacleManager {
  public obstacles: Obstacle3D[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 2.2;
  private nextObstacleId: number = 1;

  public reset(): void {
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 2.2;
  }

  public update(
    dt: number,
    gameSpeed: number,
    player: StickmanPlayer,
    onCollision: (obstacle: Obstacle3D) => void,
    onDodge: (obstacle: Obstacle3D) => void
  ): void {
    // Dynamic difficulty: spawns faster as speed ramps up
    this.spawnInterval = Math.max(1.1, 2.3 - (gameSpeed - 300) / 600);

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnRandomObstacle();
    }

    // Move obstacles towards camera (z from 1000 to -100)
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.z -= (gameSpeed * 1.5) * dt;

      // Strike zone around player (player is at z = 40)
      if (!obs.hasCollided && !obs.hasPassed) {
        if (obs.z <= 65 && obs.z >= 15) {
          if (this.checkCollision(player, obs)) {
            obs.hasCollided = true;
            onCollision(obs);
          }
        } else if (obs.z < 15) {
          obs.hasPassed = true;
          onDodge(obs);
        }
      }

      // Remove obstacles that have passed the camera
      if (obs.z < -80) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private checkCollision(player: StickmanPlayer, obs: Obstacle3D): boolean {
    // Check if player is in any of the blocked lanes
    let inLane = false;
    for (const lane of obs.lanes) {
      const laneOffset = lane - 1; // 0->-1, 1->0, 2->1
      if (Math.abs(player.laneProgress - laneOffset) < 0.52) {
        inLane = true;
        break;
      }
    }
    if (!inLane) return false;

    // Check vertical / jump clearance
    if (obs.type === 'HURDLE') {
      // If stickman jumped high enough over the hurdle, safe!
      if (player.jumpAltitude > 55) {
        return false;
      }
      return true;
    }

    // High walls cannot be jumped over
    return true;
  }

  private spawnRandomObstacle(): void {
    const types: ObstacleType[] = ['HURDLE', 'WALL', 'DOUBLE_WALL'];
    const type = types[Math.floor(Math.random() * types.length)];
    const id = `obs-${this.nextObstacleId++}`;

    let lanes: number[] = [];
    let laneIndex = 0;

    if (type === 'DOUBLE_WALL') {
      // Pick 1 safe lane, block the other 2
      const safeLane = Math.floor(Math.random() * 3);
      lanes = [0, 1, 2].filter((l) => l !== safeLane);
      laneIndex = lanes[0];
    } else {
      laneIndex = Math.floor(Math.random() * 3);
      lanes = [laneIndex];
    }

    this.obstacles.push({
      id,
      type,
      laneIndex,
      lanes,
      z: 1000,
      hasCollided: false,
      hasPassed: false,
    });
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Render sorted by Z depth descending (farthest first)
    const sorted = [...this.obstacles].sort((a, b) => b.z - a.z);

    for (const obs of sorted) {
      if (obs.z > 980 || obs.z < -50) continue;

      for (const laneIdx of obs.lanes) {
        const laneOffset = laneIdx - 1; // -1, 0, 1
        const proj = projectTrack3D(laneOffset, obs.z);

        ctx.save();
        const baseWidth = 140 * proj.scale;

        if (obs.type === 'HURDLE') {
          // Low Barrier (Must Jump or Dodge)
          const hurdleHeight = 70 * proj.scale;
          const drawX = proj.x - baseWidth / 2;
          const drawY = proj.y - hurdleHeight;

          // Barrier Legs
          ctx.fillStyle = '#1A1D2E';
          ctx.fillRect(drawX + 8 * proj.scale, drawY, 8 * proj.scale, hurdleHeight);
          ctx.fillRect(drawX + baseWidth - 16 * proj.scale, drawY, 8 * proj.scale, hurdleHeight);

          // Striped Barrier Board
          ctx.fillStyle = '#FFE600';
          ctx.shadowColor = '#FFE600';
          ctx.shadowBlur = 10 * proj.scale;
          ctx.fillRect(drawX, drawY, baseWidth, 28 * proj.scale);
          ctx.shadowBlur = 0;

          // Black diagonal caution stripes
          ctx.fillStyle = '#000000';
          const stripeW = 16 * proj.scale;
          for (let s = 0; s < baseWidth; s += stripeW * 2) {
            ctx.beginPath();
            ctx.moveTo(drawX + s, drawY);
            ctx.lineTo(drawX + s + stripeW, drawY);
            ctx.lineTo(drawX + s + stripeW * 0.5, drawY + 28 * proj.scale);
            ctx.lineTo(drawX + s - stripeW * 0.5, drawY + 28 * proj.scale);
            ctx.closePath();
            ctx.fill();
          }

          // Jump indicator text if close enough
          if (proj.scale > 0.4) {
            ctx.fillStyle = '#00F0FF';
            ctx.font = `bold ${Math.round(18 * proj.scale)}px "Inter", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('▲ JUMP', proj.x, drawY - 8 * proj.scale);
          }
        } else {
          // Tall Roadblock / Subway Train Wall (Must Dodge Left/Right)
          const wallHeight = 180 * proj.scale;
          const drawX = proj.x - baseWidth / 2;
          const drawY = proj.y - wallHeight;

          // Wall Body
          ctx.fillStyle = '#0E1324';
          ctx.strokeStyle = '#FF0055';
          ctx.lineWidth = 4 * proj.scale;
          ctx.shadowColor = '#FF0055';
          ctx.shadowBlur = 16 * proj.scale;

          ctx.beginPath();
          ctx.roundRect(drawX, drawY, baseWidth, wallHeight, 8 * proj.scale);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Train/Wall headlights or warning glow
          ctx.fillStyle = '#FF0055';
          ctx.fillRect(drawX + 12 * proj.scale, drawY + 20 * proj.scale, 20 * proj.scale, 20 * proj.scale);
          ctx.fillRect(drawX + baseWidth - 32 * proj.scale, drawY + 20 * proj.scale, 20 * proj.scale, 20 * proj.scale);

          // Neon Hazard X
          ctx.strokeStyle = '#FFE600';
          ctx.lineWidth = 6 * proj.scale;
          ctx.beginPath();
          ctx.moveTo(drawX + 24 * proj.scale, drawY + 60 * proj.scale);
          ctx.lineTo(drawX + baseWidth - 24 * proj.scale, drawY + wallHeight - 20 * proj.scale);
          ctx.moveTo(drawX + baseWidth - 24 * proj.scale, drawY + 60 * proj.scale);
          ctx.lineTo(drawX + 24 * proj.scale, drawY + wallHeight - 20 * proj.scale);
          ctx.stroke();

          // Dodge indicator text
          if (proj.scale > 0.35) {
            ctx.fillStyle = '#FF0055';
            ctx.font = `bold ${Math.round(20 * proj.scale)}px "Inter", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('◄ DODGE ►', proj.x, drawY - 10 * proj.scale);
          }
        }

        ctx.restore();
      }
    }
  }
}
