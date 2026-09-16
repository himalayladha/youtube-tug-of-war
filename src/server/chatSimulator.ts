export type MessageCallback = (user: string, text: string, avatar?: string) => void;

const FAKE_USERS = [
  'CyberKnight', 'PixelQueen', 'NeonViper', 'NovaGamer', 'RetroSamurai',
  'GlitchHunter', 'AeroBlast', 'SpeedyShadow', 'VortexRider', 'HyperDrive',
  'PulseFire', 'QuantumZero', 'SolarFlare', 'AstralAce', 'ZeroGravity',
  'LaserFox', 'TurboNinja', 'CosmicDrift', 'AlphaGhost', 'EchoStrike',
  'BlazeRunner', 'Starlight_99', 'CodeBreaker', 'ByteMaster', 'MatrixWalker',
];

const ACTIONS_POOL = [
  'jump', 'j', '1', 'up',
  'slide', 's', '2', 'down',
  'left', 'l', '3', 'a',
  'right', 'r', '4', 'd',
  'shield', 'boost', '5',
];

export class ChatSimulator {
  private intervalId: NodeJS.Timeout | null = null;
  private messageListeners: MessageCallback[] = [];

  public onMessage(callback: MessageCallback): void {
    this.messageListeners.push(callback);
  }

  private emit(user: string, text: string, avatar?: string): void {
    for (const listener of this.messageListeners) {
      listener(user, text, avatar);
    }
  }

  public trigger(user: string, text: string, avatar?: string): void {
    this.emit(user, text, avatar);
  }

  public burst(count: number = 20): void {
    for (let i = 0; i < count; i++) {
      const user = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
      const text = ACTIONS_POOL[Math.floor(Math.random() * ACTIONS_POOL.length)];
      this.emit(user, text);
    }
  }

  public start(msgsPerSec: number = 2): void {
    this.stop();
    if (msgsPerSec <= 0) return;

    const intervalMs = Math.max(20, Math.floor(1000 / msgsPerSec));
    this.intervalId = setInterval(() => {
      const user = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
      const text = ACTIONS_POOL[Math.floor(Math.random() * ACTIONS_POOL.length)];
      this.emit(user, text);
    }, intervalMs);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public isRunning(): boolean {
    return this.intervalId !== null;
  }
}
