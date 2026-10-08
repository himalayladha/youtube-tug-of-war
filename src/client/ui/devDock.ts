import { GameMode, ClientToServerMessage } from '../../shared/types.js';

export class DevDock {
  private sendWs: (msg: ClientToServerMessage) => void;
  private dockEl: HTMLElement | null;
  private toggleBtn: HTMLElement | null;

  constructor(sendWs: (msg: ClientToServerMessage) => void) {
    this.sendWs = sendWs;
    this.dockEl = document.getElementById('dev-dock');
    this.toggleBtn = document.getElementById('dev-dock-toggle');
    this.initEvents();
  }

  private initEvents(): void {
    // Dock collapse toggle
    if (this.toggleBtn && this.dockEl) {
      this.toggleBtn.addEventListener('click', () => {
        this.dockEl?.classList.toggle('collapsed');
      });
    }

    // Hotkey 'H' to toggle dock
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key.toLowerCase() === 'h') {
        this.dockEl?.classList.toggle('collapsed');
      }
    });

    // 1-Click Action Buttons (Left, Jump, Right)
    const actionBtns: Array<{ id: string; cmd: string }> = [
      { id: 'btn-cmd-left', cmd: 'left' },
      { id: 'btn-cmd-jump', cmd: 'jump' },
      { id: 'btn-cmd-right', cmd: 'right' },
    ];

    actionBtns.forEach(({ id, cmd }) => {
      document.getElementById(id)?.addEventListener('click', () => {
        this.sendWs({
          type: 'SIMULATE_COMMAND',
          user: 'Streamer',
          text: cmd,
        });
      });
    });

    // Keyboard controls for streamer test play (Left, Jump, Right)
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      let cmd: string | null = null;
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a' || e.key === '1') cmd = 'left';
      else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w' || e.key === ' ' || e.key === '2') cmd = 'jump';
      else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd' || e.key === '3') cmd = 'right';

      if (cmd) {
        this.sendWs({
          type: 'SIMULATE_COMMAND',
          user: 'Host',
          text: cmd,
        });
      }
    });

    // Custom comment sender
    const customInput = document.getElementById('custom-chat-input') as HTMLInputElement | null;
    const customBtn = document.getElementById('btn-send-custom');
    const sendCustom = () => {
      if (!customInput || !customInput.value.trim()) return;
      this.sendWs({
        type: 'SIMULATE_COMMAND',
        user: 'Host',
        text: customInput.value.trim(),
      });
      customInput.value = '';
    };

    customBtn?.addEventListener('click', sendCustom);
    customInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendCustom();
    });

    // Mode Selector buttons
    const modeBtns: Array<{ id: string; mode: GameMode }> = [
      { id: 'btn-mode-auto', mode: 'auto' },
      { id: 'btn-mode-anarchy', mode: 'anarchy' },
      { id: 'btn-mode-democracy', mode: 'democracy' },
    ];

    modeBtns.forEach(({ id, mode }) => {
      document.getElementById(id)?.addEventListener('click', () => {
        modeBtns.forEach((m) => document.getElementById(m.id)?.classList.remove('active'));
        document.getElementById(id)?.classList.add('active');
        this.sendWs({ type: 'SET_MODE', mode });
      });
    });

    // Simulator Frequency Buttons
    const simRates: Array<{ id: string; rate: number }> = [
      { id: 'btn-sim-off', rate: 0 },
      { id: 'btn-sim-slow', rate: 1 },
      { id: 'btn-sim-med', rate: 5 },
      { id: 'btn-sim-fast', rate: 15 },
      { id: 'btn-sim-flood', rate: 50 },
    ];

    simRates.forEach(({ id, rate }) => {
      document.getElementById(id)?.addEventListener('click', () => {
        simRates.forEach((r) => document.getElementById(r.id)?.classList.remove('active'));
        document.getElementById(id)?.classList.add('active');
        this.sendWs({ type: 'SET_SIMULATOR_SPEED', msgsPerSec: rate });
      });
    });

    // Burst Button
    document.getElementById('btn-sim-burst')?.addEventListener('click', () => {
      this.sendWs({ type: 'TRIGGER_BURST', count: 25 });
    });

    // YouTube Live Credentials form
    const ytKeyInput = document.getElementById('yt-api-key') as HTMLInputElement | null;
    const ytVideoInput = document.getElementById('yt-video-id') as HTMLInputElement | null;
    const ytConnectBtn = document.getElementById('btn-yt-connect');

    ytConnectBtn?.addEventListener('click', () => {
      const apiKey = ytKeyInput?.value.trim() || '';
      const videoId = ytVideoInput?.value.trim() || '';
      if (!apiKey || !videoId) {
        alert('Please enter both YouTube API Key and Video ID');
        return;
      }
      this.sendWs({
        type: 'UPDATE_YOUTUBE_CONFIG',
        apiKey,
        videoId,
      });
    });
  }
}
