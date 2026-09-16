export interface AntiSpamOptions {
  userCooldownMs?: number;
  velocityWindowMs?: number;
}

export class AntiSpamLimiter {
  private userLastActionTime: Map<string, number> = new Map();
  private messageTimestamps: number[] = [];
  private userCooldownMs: number;
  private velocityWindowMs: number;

  constructor(options?: AntiSpamOptions) {
    this.userCooldownMs = options?.userCooldownMs ?? 300;
    this.velocityWindowMs = options?.velocityWindowMs ?? 1000;
  }

  /**
   * Checks if a user is allowed to send a command right now based on per-user cooldown.
   * If allowed, updates their last action timestamp.
   */
  public isAllowed(userId: string): boolean {
    const now = Date.now();
    const lastTime = this.userLastActionTime.get(userId);

    if (lastTime !== undefined && now - lastTime < this.userCooldownMs) {
      return false;
    }

    this.userLastActionTime.set(userId, now);
    this.cleanupOldUsers(now);
    return true;
  }

  /**
   * Records that a chat message arrived (for velocity measurement).
   */
  public recordMessage(): void {
    const now = Date.now();
    this.messageTimestamps.push(now);
    this.pruneVelocityWindow(now);
  }

  /**
   * Returns current message velocity (messages per second).
   */
  public getVelocity(): number {
    const now = Date.now();
    this.pruneVelocityWindow(now);
    return this.messageTimestamps.length;
  }

  private pruneVelocityWindow(now: number): void {
    const cutoff = now - this.velocityWindowMs;
    // Remove timestamps older than velocityWindowMs
    while (this.messageTimestamps.length > 0 && this.messageTimestamps[0] < cutoff) {
      this.messageTimestamps.shift();
    }
  }

  private cleanupOldUsers(now: number): void {
    // Periodically clean up entries older than 1 minute to prevent unbounded memory growth
    if (this.userLastActionTime.size > 1000) {
      const maxAge = now - 60000;
      for (const [uid, time] of this.userLastActionTime.entries()) {
        if (time < maxAge) {
          this.userLastActionTime.delete(uid);
        }
      }
    }
  }
}
