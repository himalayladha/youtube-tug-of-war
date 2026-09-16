import { ViewerStats } from '../../shared/types.js';

export class LeaderboardOverlay {
  private listEl: HTMLElement | null;

  constructor() {
    this.listEl = document.getElementById('leaderboard-list');
  }

  public updateLeaderboard(viewers: ViewerStats[]): void {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';

    if (viewers.length === 0) {
      this.listEl.innerHTML = '<div style="font-size: 11px; color: #666; font-style: italic;">No active players yet</div>';
      return;
    }

    viewers.forEach((v, index) => {
      const item = document.createElement('div');
      item.className = 'leaderboard-item';

      let rankClass = '';
      if (index === 0) rankClass = 'gold';
      else if (index === 1) rankClass = 'silver';
      else if (index === 2) rankClass = 'bronze';

      item.innerHTML = `
        <span class="lb-rank ${rankClass}">#${index + 1}</span>
        <span class="lb-name" title="${v.userName}">${v.userName}</span>
        <span class="lb-score">${v.score} pts</span>
      `;

      this.listEl?.appendChild(item);
    });
  }
}
