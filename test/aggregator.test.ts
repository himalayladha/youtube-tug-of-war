import { describe, it, expect, beforeEach } from 'vitest';
import { CommandAggregator } from '../src/server/aggregator';

describe('CommandAggregator', () => {
  let aggregator: CommandAggregator;

  beforeEach(() => {
    aggregator = new CommandAggregator({
      windowDurationMs: 1000,
      autoSwitchThreshold: 5,
    });
  });

  describe('Anarchy Mode', () => {
    beforeEach(() => {
      aggregator.setMode('anarchy');
    });

    it('should immediately queue and trigger actions on tick', () => {
      aggregator.addVote('user1', 'JUMP');
      aggregator.addVote('user2', 'LEFT');

      const result = aggregator.tick(100, 1);
      expect(result.executedActions.length).toBeGreaterThan(0);
      expect(result.executedActions[0].action).toBe('JUMP');
      expect(result.executedActions[0].mode).toBe('anarchy');
    });
  });

  describe('Democracy Mode', () => {
    beforeEach(() => {
      aggregator.setMode('democracy');
    });

    it('should accumulate votes and calculate correct percentages for Left, Jump, Right', () => {
      aggregator.addVote('user1', 'JUMP');
      aggregator.addVote('user2', 'JUMP');
      aggregator.addVote('user3', 'LEFT');
      aggregator.addVote('user4', 'RIGHT');

      const tally = aggregator.getVoteTally();
      expect(tally.totalVotes).toBe(4);
      expect(tally.tallies.JUMP).toBe(2);
      expect(tally.tallies.LEFT).toBe(1);
      expect(tally.tallies.RIGHT).toBe(1);
      expect(tally.percentages.JUMP).toBe(50);
      expect(tally.percentages.LEFT).toBe(25);
      expect(tally.percentages.RIGHT).toBe(25);
      expect(tally.winningAction).toBe('JUMP');
    });

    it('should execute winning vote only when window expires', () => {
      aggregator.addVote('user1', 'RIGHT');
      aggregator.addVote('user2', 'RIGHT');
      aggregator.addVote('user3', 'JUMP');

      // Tick 500ms (window not expired yet)
      let result = aggregator.tick(500, 2);
      expect(result.executedActions.length).toBe(0);

      // Tick another 550ms (window expires at 1000ms)
      result = aggregator.tick(550, 2);
      expect(result.executedActions.length).toBe(1);
      expect(result.executedActions[0].action).toBe('RIGHT');
      expect(result.executedActions[0].mode).toBe('democracy');
      expect(result.executedActions[0].totalVotes).toBe(2);

      // Window should reset after execution
      const newTally = aggregator.getVoteTally();
      expect(newTally.totalVotes).toBe(0);
    });
  });

  describe('Auto Mode Switching', () => {
    it('should behave as anarchy when velocity < threshold and democracy when velocity >= threshold', () => {
      aggregator.setMode('auto');

      // Low velocity (2 msgs/sec) -> should be anarchy
      aggregator.tick(100, 2);
      expect(aggregator.getActiveMode()).toBe('anarchy');

      // High velocity (10 msgs/sec) -> should switch to democracy
      aggregator.tick(100, 10);
      expect(aggregator.getActiveMode()).toBe('democracy');
    });
  });
});
