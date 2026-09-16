import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatSimulator } from '../src/server/chatSimulator';

describe('ChatSimulator', () => {
  let simulator: ChatSimulator;

  beforeEach(() => {
    simulator = new ChatSimulator();
  });

  it('should allow manual trigger of chat comments', () => {
    const received: Array<{ user: string; text: string }> = [];
    simulator.onMessage((user, text) => {
      received.push({ user, text });
    });

    simulator.trigger('Alex', 'jump');
    expect(received.length).toBe(1);
    expect(received[0].user).toBe('Alex');
    expect(received[0].text).toBe('jump');
  });

  it('should generate burst of messages', () => {
    const received: Array<{ user: string; text: string }> = [];
    simulator.onMessage((user, text) => {
      received.push({ user, text });
    });

    simulator.burst(15);
    expect(received.length).toBe(15);
    for (const msg of received) {
      expect(msg.user).toBeTruthy();
      expect(msg.text).toBeTruthy();
    }
  });

  it('should generate periodic messages when started', () => {
    vi.useFakeTimers();
    const received: Array<{ user: string; text: string }> = [];
    simulator.onMessage((user, text) => {
      received.push({ user, text });
    });

    simulator.start(5); // 5 messages per second -> interval 200ms
    vi.advanceTimersByTime(1000);
    simulator.stop();

    expect(received.length).toBeGreaterThanOrEqual(4);
    vi.useRealTimers();
  });
});
