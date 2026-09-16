import { GameEngine } from './engine/game.js';
import { StreamHUD } from './ui/hud.js';
import { ChatTicker } from './ui/chatTicker.js';
import { LeaderboardOverlay } from './ui/leaderboard.js';
import { DevDock } from './ui/devDock.js';
import {
  ServerToClientMessage,
  ClientToServerMessage,
} from '../shared/types.js';

window.addEventListener('DOMContentLoaded', () => {
  // Check OBS Mode from query params (?obs=true)
  const urlParams = new URLSearchParams(window.location.search);
  const isObsMode = urlParams.get('obs') === 'true';
  if (isObsMode) {
    document.body.classList.add('obs-mode');
  }

  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('Could not find canvas element');

  // UI Components
  const hud = new StreamHUD();
  const ticker = new ChatTicker();
  const leaderboard = new LeaderboardOverlay();

  // WebSocket connection
  let ws: WebSocket | null = null;

  const sendWs = (msg: ClientToServerMessage) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  // Initialize Game Engine
  const game = new GameEngine(canvas, {
    onScoreUpdate: (score, distance) => {
      hud.updateScore(score, distance, game.gemsCollected);
    },
    onHealthUpdate: (health, maxHealth) => {
      hud.updateHealth(health, maxHealth);
    },
    onShieldMeterUpdate: (percent) => {
      hud.updateShieldMeter(percent);
    },
    onDodgeEvent: (obs) => {
      sendWs({
        type: 'REPORT_DODGE',
        playerAction: game.player.isJumping ? 'JUMP' : game.player.isSliding ? 'SLIDE' : 'LEFT',
        obstacleType: obs.type,
      });
    },
  });

  // Initialize Dev Control Dock
  new DevDock(sendWs);

  // Establish WebSocket connection with auto-reconnect
  function connectWebSocket(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Connected to YouTube Live Chat Runner backend');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerToClientMessage;
        switch (msg.type) {
          case 'ACTION_TRIGGERED':
            game.executeAction(msg.action, msg.triggeredBy);
            break;

          case 'VOTE_UPDATE':
            hud.updateVoteTally(msg.tally);
            break;

          case 'CHAT_FEED':
            ticker.addMessage(msg.message);
            break;

          case 'LEADERBOARD_UPDATE':
            leaderboard.updateLeaderboard(msg.topViewers);
            break;

          case 'STATUS_UPDATE':
            hud.updateStatus(msg.status);
            break;
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.warn('⚠️ WebSocket disconnected. Reconnecting in 2 seconds...');
      setTimeout(connectWebSocket, 2000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket encountered error:', err);
      ws?.close();
    };
  }

  connectWebSocket();
  game.start();
});
