export type GameAction = 'JUMP' | 'SLIDE' | 'LEFT' | 'RIGHT' | 'SHIELD';

export type GameMode = 'anarchy' | 'democracy' | 'auto';

export interface CommandMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rawText: string;
  action: GameAction;
  timestamp: number;
}

export interface VoteTally {
  totalVotes: number;
  tallies: Record<GameAction, number>;
  percentages: Record<GameAction, number>;
  windowMsRemaining: number;
  winningAction: GameAction | null;
}

export interface ViewerStats {
  userId: string;
  userName: string;
  userAvatar?: string;
  totalVotes: number;
  successfulDodges: number;
  score: number;
  lastActive: number;
}

export interface SystemStatus {
  youtubeConnected: boolean;
  streamTitle?: string;
  activeViewers: number;
  currentMode: 'anarchy' | 'democracy';
  configuredMode: GameMode;
  chatVelocity: number; // messages per second
}

// Server to Client WebSocket Events
export type ServerToClientMessage =
  | { type: 'ACTION_TRIGGERED'; action: GameAction; triggeredBy: string; mode: 'anarchy' | 'democracy'; totalVotes?: number }
  | { type: 'VOTE_UPDATE'; tally: VoteTally }
  | { type: 'CHAT_FEED'; message: CommandMessage }
  | { type: 'LEADERBOARD_UPDATE'; topViewers: ViewerStats[] }
  | { type: 'STATUS_UPDATE'; status: SystemStatus }
  | { type: 'OBSTACLE_DODGED'; dodgedBy: string[]; obstacleType: string; scoreBonus: number }
  | { type: 'GAME_OVER'; runDistance: number; mvp: ViewerStats | null };

// Client to Server WebSocket Events
export type ClientToServerMessage =
  | { type: 'SIMULATE_COMMAND'; user: string; text: string }
  | { type: 'SET_MODE'; mode: GameMode }
  | { type: 'SET_SIMULATOR_SPEED'; msgsPerSec: number }
  | { type: 'TRIGGER_BURST'; count: number }
  | { type: 'UPDATE_YOUTUBE_CONFIG'; apiKey: string; videoId: string }
  | { type: 'REPORT_DODGE'; playerAction: GameAction; obstacleType: string };
