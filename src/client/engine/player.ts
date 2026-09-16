import { GameAction } from '../../shared/types.js';

export interface LaneInfo {
  laneIndex: number; // 0 = Left, 1 = Center, 2 = Right
  targetX: number;
  currentX: number;
}

export class Player {
  public laneIndex: number = 1; // Start in center lane
  public currentX: number = 0;
  public targetX: number = 0;
  public y: number = 0;
  public groundY: number = 0;

  // Dimensions
  public width: number = 44;
  public normalHeight: number = 70;
  public slideHeight: number = 34;
  public currentHeight: number = 70;

  // Jump physics
  public isJumping: boolean = false;
  private vy: number = 0;
  private gravity: number = 2200; // px/s^2
  private jumpVelocity: number = -850; // px/s

  // Slide state
  public isSliding: boolean = false;
  private slideTimer: number = 0;
  private slideDuration: number = 0.65; // seconds

  // Invulnerability / Shield
  public isShielded: boolean = false;
  public shieldTimer: number = 0;
  public isInvulnerable: boolean = false;
  private invulnerableTimer: number = 0;

  // Animation cycle
  private runAnimTimer: number = 0;
  public trailPositions: Array<{ x: number; y: number; alpha: number }> = [];

  constructor(groundY: number) {
    this.groundY = groundY;
    this.y = groundY;
  }

  public setLaneX(lanes: number[]): void {
    if (lanes[this.laneIndex] !== undefined) {
      this.targetX = lanes[this.laneIndex];
      if (this.currentX === 0) this.currentX = this.targetX;
    }
  }

  public handleAction(action: GameAction): void {
    switch (action) {
      case 'JUMP':
        if (!this.isJumping) {
          this.isJumping = true;
          this.vy = this.jumpVelocity;
          this.isSliding = false;
          this.currentHeight = this.normalHeight;
        }
        break;

      case 'SLIDE':
        if (!this.isJumping) {
          this.isSliding = true;
          this.slideTimer = this.slideDuration;
          this.currentHeight = this.slideHeight;
        } else {
          // Fast dive down if sliding mid-air
          this.vy = Math.max(this.vy, 1200);
        }
        break;

      case 'LEFT':
        if (this.laneIndex > 0) {
          this.laneIndex--;
        }
        break;

      case 'RIGHT':
        if (this.laneIndex < 2) {
          this.laneIndex++;
        }
        break;

      case 'SHIELD':
        this.activateShield(5.0);
        break;
    }
  }

  public activateShield(durationSec: number = 5.0): void {
    this.isShielded = true;
    this.shieldTimer = durationSec;
  }

  public triggerHit(): boolean {
    if (this.isShielded) {
      this.isShielded = false;
      this.triggerInvulnerability(1.5);
      return false; // Hit absorbed by shield
    }
    if (this.isInvulnerable) {
      return false; // Immune during i-frames
    }

    this.triggerInvulnerability(2.0);
    return true; // Took actual damage
  }

  public triggerInvulnerability(durationSec: number = 2.0): void {
    this.isInvulnerable = true;
    this.invulnerableTimer = durationSec;
  }

  public update(dt: number, laneCoordinates: number[]): void {
    // Smooth lane shift interpolation
    if (laneCoordinates[this.laneIndex] !== undefined) {
      this.targetX = laneCoordinates[this.laneIndex];
    }
    this.currentX += (this.targetX - this.currentX) * Math.min(1, dt * 18);

    // Jump physics
    if (this.isJumping) {
      this.vy += this.gravity * dt;
      this.y += this.vy * dt;

      if (this.y >= this.groundY) {
        this.y = this.groundY;
        this.vy = 0;
        this.isJumping = false;
      }
    }

    // Slide timer
    if (this.isSliding) {
      this.slideTimer -= dt;
      this.currentHeight = this.slideHeight;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
        this.currentHeight = this.normalHeight;
      }
    } else {
      this.currentHeight = this.normalHeight;
    }

    // Shield timer
    if (this.isShielded) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.isShielded = false;
      }
    }

    // Invulnerability timer
    if (this.isInvulnerable) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
      }
    }

    // Animation timer
    this.runAnimTimer += dt * 12;

    // Trail positions for motion blur
    this.trailPositions.unshift({ x: this.currentX, y: this.y, alpha: 0.6 });
    if (this.trailPositions.length > 5) this.trailPositions.pop();
    for (const trail of this.trailPositions) {
      trail.alpha -= dt * 3;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // If invulnerable, flicker
    if (this.isInvulnerable && Math.floor(Date.now() / 80) % 2 === 0) {
      return;
    }

    ctx.save();

    const drawX = this.currentX;
    const drawY = this.y - this.currentHeight;

    // Render motion trail
    for (let i = 0; i < this.trailPositions.length; i++) {
      const trail = this.trailPositions[i];
      if (trail.alpha > 0.05) {
        ctx.fillStyle = `rgba(0, 240, 255, ${trail.alpha * 0.25})`;
        ctx.fillRect(
          trail.x - this.width / 2,
          trail.y - this.currentHeight,
          this.width,
          this.currentHeight
        );
      }
    }

    // Draw Cyberpunk Runner Avatar
    const primaryColor = '#00F0FF';
    const secondaryColor = '#FF0055';
    const accentColor = '#FFE600';

    // Shadow on ground
    const shadowScale = Math.max(0.3, 1 - (this.groundY - this.y) / 300);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(this.currentX, this.groundY + 4, (this.width / 2) * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.isSliding) {
      // Sliding dash pose
      ctx.fillStyle = primaryColor;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.roundRect(drawX - this.width / 2 - 10, drawY + 8, this.width + 20, this.slideHeight - 8, 8);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Sliding visor/helmet
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(drawX + 8, drawY + 12, 14, 8);

      // Jet sparks from slide
      ctx.fillStyle = secondaryColor;
      ctx.fillRect(drawX - this.width / 2 - 18, drawY + 18, 10, 4);
    } else {
      // Torso / Suit
      ctx.fillStyle = '#1A1D2E';
      ctx.beginPath();
      ctx.roundRect(drawX - this.width / 2, drawY + 22, this.width, 30, 6);
      ctx.fill();

      // Glowing suit lines
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 10;
      ctx.strokeRect(drawX - this.width / 2 + 3, drawY + 25, this.width - 6, 24);
      ctx.shadowBlur = 0;

      // Helmet / Head
      ctx.fillStyle = '#0F111A';
      ctx.beginPath();
      ctx.roundRect(drawX - 16, drawY, 32, 22, 6);
      ctx.fill();

      // Visor
      ctx.fillStyle = primaryColor;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 12;
      ctx.fillRect(drawX - 12, drawY + 6, 24, 8);
      ctx.shadowBlur = 0;

      // Legs animation (running or jumping)
      if (this.isJumping) {
        // Tucked jump legs
        ctx.fillStyle = '#12141F';
        ctx.fillRect(drawX - 14, drawY + 52, 10, 14);
        ctx.fillRect(drawX + 4, drawY + 52, 10, 14);
        // Jetpack burst
        ctx.fillStyle = accentColor;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(drawX - 6, drawY + 50);
        ctx.lineTo(drawX + 6, drawY + 50);
        ctx.lineTo(drawX, drawY + 70 + Math.sin(this.runAnimTimer) * 8);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // Running legs
        const legOffset = Math.sin(this.runAnimTimer) * 12;
        ctx.fillStyle = '#12141F';
        ctx.fillRect(drawX - 14, drawY + 52, 10, 18 + legOffset);
        ctx.fillRect(drawX + 4, drawY + 52, 10, 18 - legOffset);

        // Boots
        ctx.fillStyle = secondaryColor;
        ctx.fillRect(drawX - 15, drawY + 66 + legOffset, 12, 6);
        ctx.fillRect(drawX + 3, drawY + 66 - legOffset, 12, 6);
      }
    }

    // Render Active Shield Bubble
    if (this.isShielded) {
      const pulse = Math.sin(Date.now() / 150) * 4;
      ctx.strokeStyle = '#00FF88';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00FF88';
      ctx.shadowBlur = 20;
      ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
      ctx.beginPath();
      ctx.arc(drawX, drawY + this.currentHeight / 2, this.currentHeight / 2 + 16 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
