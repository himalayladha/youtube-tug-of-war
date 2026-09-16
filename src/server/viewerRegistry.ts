import { ViewerStats } from '../shared/types.js';

export class ViewerRegistry {
  private viewers: Map<string, ViewerStats> = new Map();

  /**
   * Records a vote/command from a viewer, creating their record if new and adding base participation points.
   */
  public recordVote(userId: string, userName: string, userAvatar?: string): void {
    const existing = this.viewers.get(userId);
    const now = Date.now();

    if (existing) {
      existing.userName = userName;
      if (userAvatar) existing.userAvatar = userAvatar;
      existing.totalVotes += 1;
      existing.score += 10;
      existing.lastActive = now;
    } else {
      this.viewers.set(userId, {
        userId,
        userName,
        userAvatar,
        totalVotes: 1,
        successfulDodges: 0,
        score: 10,
        lastActive: now,
      });
    }
  }

  /**
   * Awards bonus points when a viewer's command helped avoid an obstacle.
   */
  public recordSuccessfulDodge(userId: string, points: number = 50): void {
    const existing = this.viewers.get(userId);
    if (existing) {
      existing.successfulDodges += 1;
      existing.score += points;
      existing.lastActive = Date.now();
    }
  }

  /**
   * Returns specific viewer statistics.
   */
  public getStats(userId: string): ViewerStats | undefined {
    return this.viewers.get(userId);
  }

  /**
   * Returns top N viewers sorted by score descending.
   */
  public getLeaderboard(limit: number = 5): ViewerStats[] {
    return Array.from(this.viewers.values())
      .sort((a, b) => b.score - a.score || b.successfulDodges - a.successfulDodges)
      .slice(0, limit);
  }

  /**
   * Returns the single MVP viewer with the highest score.
   */
  public getMVP(): ViewerStats | null {
    const leaderboard = this.getLeaderboard(1);
    return leaderboard.length > 0 ? leaderboard[0] : null;
  }

  /**
   * Clears all viewer stats (for session resets).
   */
  public reset(): void {
    this.viewers.clear();
  }
}
