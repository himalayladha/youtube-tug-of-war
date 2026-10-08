import { StickmanPlayer } from './player.js';

export type ObstacleType = 'HURDLE' | 'WALL' | 'DOUBLE_WALL';

export interface Obstacle3D {
  id: string;
  type: ObstacleType;
  laneIndex: number;
  lanes: number[];
  z: number;
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
    this.spawnInterval = Math.max(1.1, 2.3 - (gameSpeed - 300) / 600);

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnRandomObstacle();
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.z -= (gameSpeed * 1.5) * dt;

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

      if (obs.z < -80) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private checkCollision(player: StickmanPlayer, obs: Obstacle3D): boolean {
    let inLane = false;
    for (const lane of obs.lanes) {
      const laneOffset = lane - 1;
      if (Math.abs(player.laneProgress - laneOffset) < 0.52) {
        inLane = true;
        break;
      }
    }
    if (!inLane) return false;

    if (obs.type === 'HURDLE') {
      if (player.jumpAltitude > 55) {
        return false;
      }
      return true;
    }

    return true;
  }

  private spawnRandomObstacle(): void {
    const types: ObstacleType[] = ['HURDLE', 'WALL', 'DOUBLE_WALL'];
    const type = types[Math.floor(Math.random() * types.length)];
    const id = `obs-${this.nextObstacleId++}`;

    let lanes: number[] = [];
    let laneIndex = 0;

    if (type === 'DOUBLE_WALL') {
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
    const sorted = [...this.obstacles].sort((a, b) => b.z - a.z);

    for (const obs of sorted) {
      if (obs.z > 980 || obs.z < -50) continue;

      for (const laneIdx of obs.lanes) {
        const laneOffset = laneIdx - 1;
        const proj = projectTrack3D(laneOffset, obs.z);

        ctx.save();
        const baseWidth = 145 * proj.scale;

        if (obs.type === 'HURDLE') {
          // Low Barrier (Must Jump or Dodge)
          const hurdleHeight = 72 * proj.scale;
          const drawX = proj.x - baseWidth / 2;
          const drawY = proj.y - hurdleHeight;

          // Metal stanchion legs
          ctx.fillStyle = '#475569';
          ctx.fillRect(drawX + 8 * proj.scale, drawY, 8 * proj.scale, hurdleHeight);
          ctx.fillRect(drawX + baseWidth - 16 * proj.scale, drawY, 8 * proj.scale, hurdleHeight);

          // Orange warning flags on top of posts
          ctx.fillStyle = '#EA580C';
          ctx.beginPath();
          ctx.moveTo(drawX + 12 * proj.scale, drawY);
          ctx.lineTo(drawX + 30 * proj.scale, drawY - 14 * proj.scale);
          ctx.lineTo(drawX + 12 * proj.scale, drawY - 24 * proj.scale);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(drawX + baseWidth - 12 * proj.scale, drawY);
          ctx.lineTo(drawX + baseWidth + 6 * proj.scale, drawY - 14 * proj.scale);
          ctx.lineTo(drawX + baseWidth - 12 * proj.scale, drawY - 24 * proj.scale);
          ctx.closePath();
          ctx.fill();

          // Yellow Safety Barricade Board
          ctx.fillStyle = '#FBBF24';
          ctx.fillRect(drawX, drawY, baseWidth, 30 * proj.scale);

          // Black diagonal hazard stripes
          ctx.fillStyle = '#0F172A';
          const stripeW = 18 * proj.scale;
          for (let s = 0; s < baseWidth; s += stripeW * 2) {
            ctx.beginPath();
            ctx.moveTo(drawX + s, drawY);
            ctx.lineTo(drawX + s + stripeW, drawY);
            ctx.lineTo(drawX + s + stripeW * 0.5, drawY + 30 * proj.scale);
            ctx.lineTo(drawX + s - stripeW * 0.5, drawY + 30 * proj.scale);
            ctx.closePath();
            ctx.fill();
          }

          // Jump indicator text if close enough
          if (proj.scale > 0.4) {
            ctx.fillStyle = '#0284C7';
            ctx.font = `900 ${Math.round(20 * proj.scale)}px "Inter", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('▲ JUMP', proj.x, drawY - 10 * proj.scale);
          }
        } else {
          // Daylight Subway Surfers Train Car Obstacle (Must Dodge Left/Right)
          const trainHeight = 195 * proj.scale;
          const drawX = proj.x - baseWidth / 2;
          const drawY = proj.y - trainHeight;

          // Train Car Main Body (Bright Red/Orange with Silver Trim)
          ctx.fillStyle = '#DC2626'; // Vibrant Train Red
          ctx.beginPath();
          ctx.roundRect(drawX, drawY, baseWidth, trainHeight, [16 * proj.scale, 16 * proj.scale, 4 * proj.scale, 4 * proj.scale]);
          ctx.fill();

          // Train Silver Roof
          ctx.fillStyle = '#E2E8F0';
          ctx.beginPath();
          ctx.roundRect(drawX + 4 * proj.scale, drawY + 4 * proj.scale, baseWidth - 8 * proj.scale, 20 * proj.scale, 6 * proj.scale);
          ctx.fill();

          // Front Windshield (Blue Tint Glass)
          ctx.fillStyle = '#38BDF8';
          ctx.strokeStyle = '#0284C7';
          ctx.lineWidth = 3 * proj.scale;
          ctx.beginPath();
          ctx.roundRect(drawX + 16 * proj.scale, drawY + 32 * proj.scale, baseWidth - 32 * proj.scale, 46 * proj.scale, 8 * proj.scale);
          ctx.fill();
          ctx.stroke();

          // Glass Reflection highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.moveTo(drawX + 22 * proj.scale, drawY + 36 * proj.scale);
          ctx.lineTo(drawX + 48 * proj.scale, drawY + 36 * proj.scale);
          ctx.lineTo(drawX + 28 * proj.scale, drawY + 72 * proj.scale);
          ctx.lineTo(drawX + 18 * proj.scale, drawY + 72 * proj.scale);
          ctx.closePath();
          ctx.fill();

          // Round Glowing Headlights
          ctx.fillStyle = '#FEF08A';
          ctx.strokeStyle = '#CA8A04';
          ctx.lineWidth = 2 * proj.scale;
          const lightRadius = 9 * proj.scale;
          // Left light
          ctx.beginPath();
          ctx.arc(drawX + 24 * proj.scale, drawY + 105 * proj.scale, lightRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Right light
          ctx.beginPath();
          ctx.arc(drawX + baseWidth - 24 * proj.scale, drawY + 105 * proj.scale, lightRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Bottom Heavy Bumper / Grille
          ctx.fillStyle = '#334155';
          ctx.fillRect(drawX + 10 * proj.scale, drawY + 130 * proj.scale, baseWidth - 20 * proj.scale, 48 * proj.scale);

          // Yellow caution stripes on bumper
          ctx.fillStyle = '#FBBF24';
          for (let b = 12 * proj.scale; b < baseWidth - 24 * proj.scale; b += 16 * proj.scale) {
            ctx.fillRect(drawX + b, drawY + 144 * proj.scale, 8 * proj.scale, 24 * proj.scale);
          }

          // Dodge indicator text
          if (proj.scale > 0.35) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `900 ${Math.round(22 * proj.scale)}px "Inter", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('◄ DODGE ►', proj.x, drawY - 12 * proj.scale);
          }
        }

        ctx.restore();
      }
    }
  }
}
