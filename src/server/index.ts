import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { parseCommand } from './commandParser.js';
import { AntiSpamLimiter } from './antiSpam.js';
import { CommandAggregator } from './aggregator.js';
import { ViewerRegistry } from './viewerRegistry.js';
import { YouTubePoller } from './youtubePoller.js';
import { ChatSimulator } from './chatSimulator.js';
import {
  ClientToServerMessage,
  ServerToClientMessage,
  CommandMessage,
  SystemStatus,
} from '../shared/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Core Server Services
const antiSpam = new AntiSpamLimiter({ userCooldownMs: 250, velocityWindowMs: 1000 });
const aggregator = new CommandAggregator({ windowDurationMs: 1000, autoSwitchThreshold: 5 });
const viewerRegistry = new ViewerRegistry();
const simulator = new ChatSimulator();
const youtubePoller = new YouTubePoller(
  process.env.YOUTUBE_API_KEY,
  process.env.YOUTUBE_VIDEO_ID
);

app.use(express.json());

// Broadcast helper
function broadcast(message: ServerToClientMessage): void {
  const data = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function getSystemStatus(): SystemStatus {
  return {
    youtubeConnected: youtubePoller.isRunning(),
    streamTitle: youtubePoller.getStreamTitle() || 'YouTube Live Runner',
    activeViewers: wss.clients.size + (simulator.isRunning() ? 10 : 0),
    currentMode: aggregator.getActiveMode(),
    configuredMode: aggregator.getConfiguredMode(),
    chatVelocity: antiSpam.getVelocity(),
  };
}

// Ingestion Pipeline for any message (YouTube, Simulator, or Dev UI)
function handleRawChatMessage(
  userId: string,
  userName: string,
  rawText: string,
  userAvatar?: string
): void {
  if (!rawText) return;

  const action = parseCommand(rawText);
  if (!action) return; // Ignore casual comments

  if (!antiSpam.isAllowed(userId)) {
    return; // Rate limited
  }

  antiSpam.recordMessage();
  viewerRegistry.recordVote(userId, userName, userAvatar);

  const cmdMsg: CommandMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    userName,
    userAvatar,
    rawText,
    action,
    timestamp: Date.now(),
  };

  // Broadcast chat feed
  broadcast({ type: 'CHAT_FEED', message: cmdMsg });

  // Add vote to aggregator
  aggregator.addVote(userName, action);

  // Broadcast updated leaderboard
  broadcast({
    type: 'LEADERBOARD_UPDATE',
    topViewers: viewerRegistry.getLeaderboard(5),
  });
}

// Hook up YouTube Poller
youtubePoller.onMessage((msg) => {
  handleRawChatMessage(msg.authorId, msg.authorName, msg.text, msg.authorAvatar);
});

youtubePoller.onStatus((connected, title, err) => {
  console.log(`[YouTube Poller status]: connected=${connected} title="${title || ''}" error="${err || ''}"`);
  broadcast({ type: 'STATUS_UPDATE', status: getSystemStatus() });
});

// Hook up Chat Simulator
simulator.onMessage((user, text, avatar) => {
  handleRawChatMessage(`sim-${user}`, user, text, avatar);
});

// WebSocket Client Connection Handler
wss.on('connection', (ws) => {
  // Send initial state
  ws.send(JSON.stringify({ type: 'STATUS_UPDATE', status: getSystemStatus() }));
  ws.send(JSON.stringify({ type: 'VOTE_UPDATE', tally: aggregator.getVoteTally() }));
  ws.send(
    JSON.stringify({
      type: 'LEADERBOARD_UPDATE',
      topViewers: viewerRegistry.getLeaderboard(5),
    })
  );

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString()) as ClientToServerMessage;
      switch (msg.type) {
        case 'SIMULATE_COMMAND':
          handleRawChatMessage(`user-${msg.user}`, msg.user, msg.text);
          break;

        case 'SET_MODE':
          aggregator.setMode(msg.mode);
          broadcast({ type: 'STATUS_UPDATE', status: getSystemStatus() });
          break;

        case 'SET_SIMULATOR_SPEED':
          if (msg.msgsPerSec > 0) {
            simulator.start(msg.msgsPerSec);
          } else {
            simulator.stop();
          }
          broadcast({ type: 'STATUS_UPDATE', status: getSystemStatus() });
          break;

        case 'TRIGGER_BURST':
          simulator.burst(msg.count || 15);
          break;

        case 'UPDATE_YOUTUBE_CONFIG':
          youtubePoller.setCredentials(msg.apiKey, msg.videoId);
          youtubePoller.start();
          break;

        case 'REPORT_DODGE':
          // Reward latest active voters
          const topContributors = viewerRegistry.getLeaderboard(3).map((v) => v.userId);
          for (const uid of topContributors) {
            viewerRegistry.recordSuccessfulDodge(uid, 50);
          }
          broadcast({
            type: 'OBSTACLE_DODGED',
            dodgedBy: topContributors.map((uid) => viewerRegistry.getStats(uid)?.userName || 'Player'),
            obstacleType: msg.obstacleType,
            scoreBonus: 50,
          });
          broadcast({
            type: 'LEADERBOARD_UPDATE',
            topViewers: viewerRegistry.getLeaderboard(5),
          });
          break;
      }
    } catch (e) {
      console.error('[WS error handling message]:', e);
    }
  });
});

// Main High-Frequency Server Loop (Every 50ms)
let lastTickTime = Date.now();
let statusTickCounter = 0;

setInterval(() => {
  const now = Date.now();
  const deltaMs = now - lastTickTime;
  lastTickTime = now;

  const currentVelocity = antiSpam.getVelocity();
  const result = aggregator.tick(deltaMs, currentVelocity);

  // Broadcast executed actions
  for (const actionItem of result.executedActions) {
    broadcast({
      type: 'ACTION_TRIGGERED',
      action: actionItem.action,
      triggeredBy: actionItem.triggeredBy,
      mode: actionItem.mode,
      totalVotes: actionItem.totalVotes,
    });
  }

  // Broadcast Democracy vote updates if in democracy or votes exist
  if (result.activeMode === 'democracy' || result.currentTally.totalVotes > 0) {
    broadcast({
      type: 'VOTE_UPDATE',
      tally: result.currentTally,
    });
  }

  // Periodic status update (every 1 second)
  statusTickCounter++;
  if (statusTickCounter >= 20) {
    statusTickCounter = 0;
    broadcast({ type: 'STATUS_UPDATE', status: getSystemStatus() });
  }
}, 50);

// Setup Vite dev server middleware or static distribution
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.resolve(__dirname, '../client'),
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, '../client')));
  }

  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🎮 YouTube Live Chat Runner is live at http://localhost:${PORT}`);
    console.log(`📺 OBS Studio Browser Source: http://localhost:${PORT}/?obs=true`);
    console.log(`📡 WebSocket endpoint at ws://localhost:${PORT}/ws`);
    console.log(`======================================================\n`);
  });
}

startServer();
