import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AntiSpamLimiter } from '../src/server/antiSpam';

describe('AntiSpamLimiter', () => {
  let limiter: AntiSpamLimiter;

  beforeEach(() => {
    limiter = new AntiSpamLimiter({ userCooldownMs: 300, velocityWindowMs: 1000 });
  });

  it('should allow first message from a user', () => {
    expect(limiter.isAllowed('user1')).toBe(true);
  });

  it('should block rapid duplicate messages from same user within cooldown', () => {
    expect(limiter.isAllowed('user1')).toBe(true);
    expect(limiter.isAllowed('user1')).toBe(false);
  });

  it('should allow different users simultaneously', () => {
    expect(limiter.isAllowed('user1')).toBe(true);
    expect(limiter.isAllowed('user2')).toBe(true);
    expect(limiter.isAllowed('user3')).toBe(true);
  });

  it('should allow user again after cooldown expires', () => {
    vi.useFakeTimers();
    expect(limiter.isAllowed('user1')).toBe(true);
    expect(limiter.isAllowed('user1')).toBe(false);

    vi.advanceTimersByTime(350);
    expect(limiter.isAllowed('user1')).toBe(true);
    vi.useRealTimers();
  });

  it('should track chat message velocity (messages per second)', () => {
    vi.useFakeTimers();
    expect(limiter.getVelocity()).toBe(0);

    limiter.recordMessage();
    limiter.recordMessage();
    limiter.recordMessage();
    expect(limiter.getVelocity()).toBe(3);

    // After 1.1s, older messages roll out of the 1s window
    vi.advanceTimersByTime(1100);
    expect(limiter.getVelocity()).toBe(0);
    vi.useRealTimers();
  });
});
