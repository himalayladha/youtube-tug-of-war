import { CommandMessage } from '../../shared/types.js';

export class ChatTicker {
  private container: HTMLElement | null;
  private maxItems: number = 6;

  constructor() {
    this.container = document.getElementById('chat-ticker-container');
  }

  public addMessage(msg: CommandMessage): void {
    if (!this.container) return;

    const pill = document.createElement('div');
    pill.className = 'chat-ticker-pill';

    const userSpan = document.createElement('span');
    userSpan.className = 'ticker-user';
    userSpan.textContent = `@${msg.userName}`;

    const cmdSpan = document.createElement('span');
    cmdSpan.className = 'ticker-cmd';
    cmdSpan.textContent = msg.action;

    pill.appendChild(userSpan);
    pill.appendChild(cmdSpan);

    this.container.prepend(pill);

    // Prune older items
    while (this.container.children.length > this.maxItems) {
      const last = this.container.lastElementChild;
      if (last) this.container.removeChild(last);
    }
  }
}
