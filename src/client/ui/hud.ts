import { VoteTally, SystemStatus } from '../../shared/types.js';

export class StreamHUD {
  private scoreEl: HTMLElement | null;
  private distanceEl: HTMLElement | null;
  private gemsEl: HTMLElement | null;
  private heartsContainer: HTMLElement | null;
  private shieldBar: HTMLElement | null;
  private modeBadge: HTMLElement | null;
  private velocityEl: HTMLElement | null;
  private votingGaugesContainer: HTMLElement | null;
  private windowTimerFill: HTMLElement | null;

  // Percentage & bar elements
  private gaugeElements: Record<string, { pctEl: HTMLElement | null; barEl: HTMLElement | null }> = {};

  constructor() {
    this.scoreEl = document.getElementById('hud-score');
    this.distanceEl = document.getElementById('hud-distance');
    this.gemsEl = document.getElementById('hud-gems');
    this.heartsContainer = document.getElementById('hud-hearts');
    this.shieldBar = document.getElementById('hud-shield-fill');
    this.modeBadge = document.getElementById('hud-mode-badge');
    this.velocityEl = document.getElementById('hud-velocity');
    this.votingGaugesContainer = document.getElementById('voting-gauges-container');
    this.windowTimerFill = document.getElementById('window-timer-fill');

    ['jump', 'slide', 'left', 'right', 'shield'].forEach((act) => {
      this.gaugeElements[act] = {
        pctEl: document.getElementById(`gauge-pct-${act}`),
        barEl: document.getElementById(`gauge-bar-${act}`),
      };
    });
  }

  public updateScore(score: number, distanceMeters: number, gems: number): void {
    if (this.scoreEl) this.scoreEl.textContent = score.toLocaleString();
    if (this.distanceEl) this.distanceEl.textContent = `${distanceMeters}m`;
    if (this.gemsEl) this.gemsEl.textContent = gems.toString();
  }

  public updateHealth(health: number, maxHealth: number = 3): void {
    if (!this.heartsContainer) return;
    this.heartsContainer.innerHTML = '';
    for (let i = 0; i < maxHealth; i++) {
      const heart = document.createElement('span');
      heart.className = `heart ${i < health ? 'active' : 'lost'}`;
      heart.textContent = '❤️';
      this.heartsContainer.appendChild(heart);
    }
  }

  public updateShieldMeter(percent: number): void {
    if (this.shieldBar) {
      this.shieldBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
  }

  public updateStatus(status: SystemStatus): void {
    if (this.modeBadge) {
      this.modeBadge.className = `mode-badge ${status.currentMode}`;
      this.modeBadge.textContent =
        status.currentMode === 'anarchy'
          ? '⚡ Anarchy Mode (Instant)'
          : '🗳️ Democracy Mode (Voting)';
    }

    if (this.velocityEl) {
      this.velocityEl.textContent = `${status.chatVelocity} msgs/s`;
    }
  }

  public updateVoteTally(tally: VoteTally): void {
    // Window countdown timer bar
    if (this.windowTimerFill) {
      const remainingPct = Math.max(0, Math.min(100, (tally.windowMsRemaining / 1000) * 100));
      this.windowTimerFill.style.width = `${remainingPct}%`;
    }

    // Update gauge percentages and fill bars
    const map: Record<string, keyof typeof tally.percentages> = {
      jump: 'JUMP',
      slide: 'SLIDE',
      left: 'LEFT',
      right: 'RIGHT',
      shield: 'SHIELD',
    };

    for (const [key, act] of Object.entries(map)) {
      const pct = tally.percentages[act] || 0;
      const el = this.gaugeElements[key];
      if (el) {
        if (el.pctEl) el.pctEl.textContent = `${pct}%`;
        if (el.barEl) el.barEl.style.width = `${pct}%`;
      }
    }
  }
}
