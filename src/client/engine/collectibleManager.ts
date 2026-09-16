import { Player } from './player.js';

export interface Collectible {
  id: string;
  laneIndex: number;
  x: number;
  yOffset: number; // For floating hover bobbing
  collected: boolean;
  value: number;
}

export class CollectibleManager {
  public collectibles: Collectible[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 1.2;
  private nextId: number = 1;

  public reset(): void {
    this.collectibles = [];
    this.spawnTimer = 0;
  }

  public update(
    dt: number,
    gameSpeed: number,
    canvasWidth: number,
    player: Player,
    onCollect: (item: Collectible) => void
  ): void {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnItem(canvasWidth);
    }

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const item = this.collectibles[i];
      item.x -= gameSpeed * dt;

      if (!item.collected) {
        // Collision check with player
        if (
          item.laneIndex === player.laneIndex &&
          Math.abs(player.currentX - item.x) < 35
        ) {
          item.collected = true;
          onCollect(item);
        }
      }

      if (item.x < -50 || item.collected) {
        this.collectibles.splice(i, 1);
      }
    }
  }

  private spawnItem(canvasWidth: number): void {
    const laneIndex = Math.floor(Math.random() * 3);
    this.collectibles.push({
      id: `gem-${this.nextId++}`,
      laneIndex,
      x: canvasWidth + 50,
      yOffset: Math.random() * 20 - 10,
      collected: false,
      value: 25,
    });
  }

  public render(ctx: CanvasRenderingContext2D, laneCoordinates: number[]): void {
    const time = Date.now() / 200;

    for (const item of this.collectibles) {
      if (item.collected) continue;
      const laneY = laneCoordinates[item.laneIndex];
      if (laneY === undefined) continue;

      const drawX = item.x;
      const bob = Math.sin(time + item.x * 0.05) * 8;
      const drawY = laneY - 35 + bob + item.yOffset;

      ctx.save();
      ctx.fillStyle = '#00FFCC';
      ctx.shadowColor = '#00FFCC';
      ctx.shadowBlur = 15;

      // Diamond shape crystal
      ctx.beginPath();
      ctx.moveTo(drawX, drawY - 14);
      ctx.lineTo(drawX + 11, drawY);
      ctx.lineTo(drawX, drawY + 14);
      ctx.lineTo(drawX - 11, drawY);
      ctx.closePath();
      ctx.fill();

      // Inner highlight
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(drawX, drawY - 8);
      ctx.lineTo(drawX + 5, drawY);
      ctx.lineTo(drawX, drawY + 8);
      ctx.lineTo(drawX - 5, drawY);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }
}
