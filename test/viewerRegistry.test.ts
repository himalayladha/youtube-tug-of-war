import { describe, it, expect, beforeEach } from 'vitest';
import { ViewerRegistry } from '../src/server/viewerRegistry';

describe('ViewerRegistry', () => {
  let registry: ViewerRegistry;

  beforeEach(() => {
    registry = new ViewerRegistry();
  });

  it('should track votes and award base points to viewers', () => {
    registry.recordVote('user1', 'PixelGamer');
    registry.recordVote('user1', 'PixelGamer');

    const stats = registry.getStats('user1');
    expect(stats).toBeDefined();
    expect(stats?.userName).toBe('PixelGamer');
    expect(stats?.totalVotes).toBe(2);
    expect(stats?.score).toBe(20); // 10 pts per vote
  });

  it('should award bonus points and track successful obstacle dodges', () => {
    registry.recordVote('user1', 'PixelGamer');
    registry.recordSuccessfulDodge('user1', 50);

    const stats = registry.getStats('user1');
    expect(stats?.successfulDodges).toBe(1);
    expect(stats?.score).toBe(60); // 10 + 50
  });

  it('should calculate top-N leaderboard sorted by score descending', () => {
    registry.recordVote('user1', 'PlayerOne');
    registry.recordVote('user2', 'PlayerTwo');
    registry.recordVote('user2', 'PlayerTwo');
    registry.recordVote('user3', 'PlayerThree');
    registry.recordSuccessfulDodge('user3', 100);

    const leaderboard = registry.getLeaderboard(2);
    expect(leaderboard.length).toBe(2);
    expect(leaderboard[0].userName).toBe('PlayerThree'); // 110 pts
    expect(leaderboard[1].userName).toBe('PlayerTwo');   // 20 pts
  });

  it('should identify the session MVP', () => {
    expect(registry.getMVP()).toBeNull();

    registry.recordVote('u1', 'Alpha');
    registry.recordVote('u2', 'Beta');
    registry.recordSuccessfulDodge('u2', 50);

    expect(registry.getMVP()?.userName).toBe('Beta');
  });
});
