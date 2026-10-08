import { GameAction } from '../../shared/types.js';

export class StickmanPlayer {
  // Lane: 0 = Left, 1 = Center, 2 = Right
  public laneIndex: number = 1;
  public laneProgress: number = 0; // -1 = Left, 0 = Center, 1 = Right
  public targetLaneProgress: number = 0;

  // Jump physics
  public isJumping: boolean = false;
  public jumpAltitude: number = 0;
  private vy: number = 0;
  private gravity: number = 2400; // px/s^2
  private jumpPower: number = 960; // px/s

  // Hit & Invulnerability
  public isInvulnerable: boolean = false;
  private invulnerableTimer: number = 0;

  // Animation cycle
  private runAnimTimer: number = 0;
  public tiltAngle: number = 0;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.laneIndex = 1;
    this.laneProgress = 0;
    this.targetLaneProgress = 0;
    this.isJumping = false;
    this.jumpAltitude = 0;
    this.vy = 0;
    this.isInvulnerable = false;
    this.invulnerableTimer = 0;
    this.runAnimTimer = 0;
    this.tiltAngle = 0;
  }

  public handleAction(action: GameAction): void {
    switch (action) {
      case 'LEFT':
        if (this.laneIndex > 0) {
          this.laneIndex--;
          this.targetLaneProgress = this.laneIndex - 1;
        }
        break;

      case 'RIGHT':
        if (this.laneIndex < 2) {
          this.laneIndex++;
          this.targetLaneProgress = this.laneIndex - 1;
        }
        break;

      case 'JUMP':
        if (!this.isJumping) {
          this.isJumping = true;
          this.vy = this.jumpPower;
        }
        break;
    }
  }

  public triggerHit(): boolean {
    if (this.isInvulnerable) {
      return false;
    }
    this.triggerInvulnerability(2.0);
    return true;
  }

  public triggerInvulnerability(durationSec: number = 2.0): void {
    this.isInvulnerable = true;
    this.invulnerableTimer = durationSec;
  }

  public update(dt: number): void {
    // Smooth lane shift interpolation
    const laneDiff = this.targetLaneProgress - this.laneProgress;
    this.laneProgress += laneDiff * Math.min(1, dt * 18);

    // Dynamic body tilt when dodging
    this.tiltAngle = laneDiff * 0.35;

    // Jump physics
    if (this.isJumping) {
      this.jumpAltitude += this.vy * dt;
      this.vy -= this.gravity * dt;

      if (this.jumpAltitude <= 0) {
        this.jumpAltitude = 0;
        this.vy = 0;
        this.isJumping = false;
      }
    }

    // Invulnerability timer
    if (this.isInvulnerable) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
      }
    }

    // Running stride cycle
    this.runAnimTimer += dt * 16;
  }

  /**
   * Renders the Stickman from behind/above in daylight style
   */
  public render(
    ctx: CanvasRenderingContext2D,
    trackCenterX: number,
    trackLaneWidth: number,
    baseY: number
  ): void {
    // Flicker if invulnerable
    if (this.isInvulnerable && Math.floor(Date.now() / 90) % 2 === 0) {
      return;
    }

    const footX = trackCenterX + this.laneProgress * trackLaneWidth;
    const footY = baseY;
    const bodyY = footY - this.jumpAltitude;

    ctx.save();
    ctx.translate(footX, bodyY);
    ctx.rotate(this.tiltAngle);

    // 1. Drop Shadow on the track floor
    ctx.save();
    ctx.rotate(-this.tiltAngle);
    const shadowScale = Math.max(0.35, 1 - this.jumpAltitude / 420);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, this.jumpAltitude + 4, 32 * shadowScale, 11 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Stickman ink color & joints
    const stickColor = '#0F172A'; // High-contrast ink navy
    const capColor = '#EF4444';   // Vibrant red cap
    const shoeColor = '#2563EB';  // Vibrant blue sneakers

    ctx.strokeStyle = stickColor;
    ctx.fillStyle = stickColor;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 2. Legs & Running Stride (Seen from behind)
    const stride = Math.sin(this.runAnimTimer);
    const leftStrideY = stride * 22;
    const rightStrideY = -stride * 22;
    const hipY = -48;

    if (this.isJumping) {
      // Jump pose: athletic tuck
      // Left leg
      ctx.beginPath();
      ctx.moveTo(0, hipY);
      ctx.lineTo(-24, hipY + 18);
      ctx.lineTo(-14, hipY + 36);
      ctx.stroke();

      // Right leg
      ctx.beginPath();
      ctx.moveTo(0, hipY);
      ctx.lineTo(24, hipY + 18);
      ctx.lineTo(14, hipY + 36);
      ctx.stroke();

      // Sneakers
      ctx.fillStyle = shoeColor;
      ctx.fillRect(-22, hipY + 34, 15, 9);
      ctx.fillRect(10, hipY + 34, 15, 9);
      // White soles
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-22, hipY + 41, 15, 3);
      ctx.fillRect(10, hipY + 41, 15, 3);
    } else {
      // Running legs stride
      // Left Leg
      ctx.beginPath();
      ctx.moveTo(0, hipY);
      ctx.lineTo(-16, hipY + 24 + leftStrideY * 0.4);
      ctx.lineTo(-14, 0 + leftStrideY);
      ctx.stroke();

      // Right Leg
      ctx.beginPath();
      ctx.moveTo(0, hipY);
      ctx.lineTo(16, hipY + 24 + rightStrideY * 0.4);
      ctx.lineTo(14, 0 + rightStrideY);
      ctx.stroke();

      // Sneakers
      ctx.fillStyle = shoeColor;
      ctx.fillRect(-21, 0 + leftStrideY - 3, 14, 8);
      ctx.fillRect(9, 0 + rightStrideY - 3, 14, 8);
      // White soles
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-21, 0 + leftStrideY + 3, 14, 3);
      ctx.fillRect(9, 0 + rightStrideY + 3, 14, 3);
    }

    // 3. Spine / Torso
    const shoulderY = -100;
    ctx.strokeStyle = stickColor;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(0, shoulderY);
    ctx.stroke();

    // Colorful backpack on stickman's back
    ctx.fillStyle = '#F59E0B'; // Golden yellow backpack
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-10, shoulderY + 12, 20, 26, 4);
    ctx.fill();
    ctx.stroke();

    // 4. Arms (Pumping in running motion)
    ctx.strokeStyle = stickColor;
    ctx.lineWidth = 6;
    if (this.isJumping) {
      // Arms raised up
      ctx.beginPath();
      ctx.moveTo(0, shoulderY);
      ctx.lineTo(-32, shoulderY - 24);
      ctx.lineTo(-24, shoulderY - 50);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, shoulderY);
      ctx.lineTo(32, shoulderY - 24);
      ctx.lineTo(24, shoulderY - 50);
      ctx.stroke();
    } else {
      // Running arms counter-stride
      // Left Arm
      ctx.beginPath();
      ctx.moveTo(0, shoulderY);
      ctx.lineTo(-24, shoulderY + 20 - rightStrideY * 0.5);
      ctx.lineTo(-18, shoulderY + 38 - rightStrideY * 0.7);
      ctx.stroke();

      // Right Arm
      ctx.beginPath();
      ctx.moveTo(0, shoulderY);
      ctx.lineTo(24, shoulderY + 20 - leftStrideY * 0.5);
      ctx.lineTo(18, shoulderY + 38 - leftStrideY * 0.7);
      ctx.stroke();
    }

    // 5. Head & Cap
    const headY = shoulderY - 22;
    const headRadius = 19;

    // Head circle
    ctx.fillStyle = stickColor;
    ctx.beginPath();
    ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Backward Red Cap
    ctx.fillStyle = capColor;
    ctx.beginPath();
    ctx.arc(0, headY, headRadius + 2, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    // Cap backward brim
    ctx.fillRect(-14, headY - headRadius - 4, 28, 7);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-6, headY - headRadius - 2, 12, 3);

    ctx.restore();
  }
}
