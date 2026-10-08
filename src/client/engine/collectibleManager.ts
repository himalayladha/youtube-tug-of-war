import { StickmanPlayer } from './player.js';
import { projectTrack3D } from './obstacleManager.js';

export interface Collectible3D {
  id: string;
  laneIndex: number; // 0, 1, or 2
  z: number;         // 1000 to 0
  collected: boolean;
  value: number;
}

export class CollectibleManager {
  public collectibles: Collectible3D[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 1.0;
  private nextId: number = 1;

  public reset(): void {
    this.collectibles = [];
    this.spawnTimer = 0;
  }

  public update(
    dt: number,
    gameSpeed: number,
    player: StickmanPlayer,
    onCollect: (item: Collectible3D) => void
  ): void {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnCoinPattern();
    }

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const item = this.collectibles[i];
      item.z -= (gameSpeed * 1.5) * dt;

      if (!item.collected) {
        // Check collection near player (z ≈ 40)
        if (item.z <= 60 && item.z >= 20) {
          const laneOffset = item.laneIndex - 1;
          if (Math.abs(player.laneProgress - laneOffset) < 0.45) {
            item.collected = true;
            onCollect(item);
          }
        }
      }

      if (item.z < -40 || item.collected) {
        this.collectibles.splice(i, 1);
      }
    }
  }

  private spawnCoinPattern(): void {
    const laneIndex = Math.floor(Math.random() * 3);
    // Spawn a trail of 3 coins
    for (let c = 0; c < 3; c++) {
      this.collectibles.push({
        id: `coin-${this.nextId++}`,
        laneIndex,
        z: 1000 + c * 80,
        collected: false,
        value: 25,
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const time = Date.now() / 250;

    for (const item of this.collectibles) {
      if (item.collected || item.z > 980 || item.z < 0) continue;

      const laneOffset = item.laneIndex - 1;
      const proj = projectTrack3D(laneOffset, item.z, 24);

      ctx.save();
      const radius = 22 * proj.scale;
      const spinScale = Math.cos(time + item.z * 0.05);

      ctx.translate(proj.x, proj.y);
      ctx.scale(spinScale, 1);

      // Gold Coin Outer
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFE600';
      ctx.shadowBlur = 12 * proj.scale;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner Coin Rim
      ctx.strokeStyle = '#FFA500';
      ctx.lineWidth = 3 * proj.scale;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      // Coin Star / Symbol
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(14 * proj.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', 0, 0);

      ctx.restore();
    }
  }
}
