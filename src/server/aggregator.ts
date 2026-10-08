import { GameAction, GameMode, VoteTally } from '../shared/types.js';

export interface AggregatorOptions {
  windowDurationMs?: number;
  autoSwitchThreshold?: number;
  anarchyMinActionIntervalMs?: number;
}

export interface ExecutedAction {
  action: GameAction;
  triggeredBy: string;
  mode: 'anarchy' | 'democracy';
  totalVotes?: number;
}

export interface AggregatorTickResult {
  executedActions: ExecutedAction[];
  currentTally: VoteTally;
  activeMode: 'anarchy' | 'democracy';
}

const ALL_ACTIONS: GameAction[] = ['LEFT', 'RIGHT', 'JUMP'];

export class CommandAggregator {
  private configuredMode: GameMode = 'auto';
  private activeMode: 'anarchy' | 'democracy' = 'anarchy';
  private windowDurationMs: number;
  private autoSwitchThreshold: number;
  private anarchyMinActionIntervalMs: number;

  // Democracy window state
  private windowTimer: number = 0;
  private tallies: Record<GameAction, number>;
  private totalVotesInWindow: number = 0;
  private votersInWindow: Map<string, GameAction> = new Map();

  // Anarchy FIFO queue state
  private anarchyQueue: Array<{ user: string; action: GameAction }> = [];
  private lastAnarchyActionTime: number = 0;

  constructor(options?: AggregatorOptions) {
    this.windowDurationMs = options?.windowDurationMs ?? 1000;
    this.autoSwitchThreshold = options?.autoSwitchThreshold ?? 5;
    this.anarchyMinActionIntervalMs = options?.anarchyMinActionIntervalMs ?? 150;
    this.tallies = this.createEmptyTallies();
  }

  private createEmptyTallies(): Record<GameAction, number> {
    return {
      LEFT: 0,
      RIGHT: 0,
      JUMP: 0,
    };
  }

  public setMode(mode: GameMode): void {
    this.configuredMode = mode;
    if (mode === 'anarchy' || mode === 'democracy') {
      this.activeMode = mode;
    }
  }

  public getConfiguredMode(): GameMode {
    return this.configuredMode;
  }

  public getActiveMode(): 'anarchy' | 'democracy' {
    return this.activeMode;
  }

  public addVote(user: string, action: GameAction): void {
    if (this.activeMode === 'anarchy') {
      this.anarchyQueue.push({ user, action });
    } else {
      // In democracy mode, tally the vote
      this.tallies[action] = (this.tallies[action] || 0) + 1;
      this.totalVotesInWindow++;
      this.votersInWindow.set(user, action);
    }
  }

  public getVoteTally(): VoteTally {
    const percentages: Record<GameAction, number> = {
      LEFT: 0,
      RIGHT: 0,
      JUMP: 0,
    };

    let maxVotes = 0;
    let winningAction: GameAction | null = null;

    for (const action of ALL_ACTIONS) {
      const count = this.tallies[action];
      if (this.totalVotesInWindow > 0) {
        percentages[action] = Math.round((count / this.totalVotesInWindow) * 100);
      }
      if (count > maxVotes) {
        maxVotes = count;
        winningAction = action;
      }
    }

    const remaining = Math.max(0, this.windowDurationMs - this.windowTimer);

    return {
      totalVotes: this.totalVotesInWindow,
      tallies: { ...this.tallies },
      percentages,
      windowMsRemaining: remaining,
      winningAction,
    };
  }

  public tick(deltaMs: number, currentVelocity: number = 0): AggregatorTickResult {
    // Check auto mode switching if in auto mode
    if (this.configuredMode === 'auto') {
      const newActive = currentVelocity >= this.autoSwitchThreshold ? 'democracy' : 'anarchy';
      if (newActive !== this.activeMode) {
        this.activeMode = newActive;
      }
    }

    const executedActions: ExecutedAction[] = [];

    if (this.activeMode === 'anarchy') {
      // Drain anarchy queue with throttle
      const now = Date.now();
      if (this.anarchyQueue.length > 0 && now - this.lastAnarchyActionTime >= this.anarchyMinActionIntervalMs) {
        const item = this.anarchyQueue.shift()!;
        executedActions.push({
          action: item.action,
          triggeredBy: item.user,
          mode: 'anarchy',
        });
        this.lastAnarchyActionTime = now;
      }
    } else {
      // Advance democracy timer
      this.windowTimer += deltaMs;

      if (this.windowTimer >= this.windowDurationMs) {
        // Window expired, evaluate winner
        const tally = this.getVoteTally();
        if (tally.winningAction && tally.totalVotes > 0) {
          // Find a representative voter for credit
          let voter = 'Community';
          for (const [u, act] of this.votersInWindow.entries()) {
            if (act === tally.winningAction) {
              voter = u;
              break;
            }
          }

          executedActions.push({
            action: tally.winningAction,
            triggeredBy: voter,
            mode: 'democracy',
            totalVotes: tally.tallies[tally.winningAction],
          });
        }

        // Reset democracy window
        this.windowTimer = 0;
        this.tallies = this.createEmptyTallies();
        this.totalVotesInWindow = 0;
        this.votersInWindow.clear();
      }
    }

    return {
      executedActions,
      currentTally: this.getVoteTally(),
      activeMode: this.activeMode,
    };
  }
}
