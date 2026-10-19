-- The Great Tug-of-War: Black vs White - SQLite Database Schema
-- Optimized for Termux, Android, SQLite3, and TermuxPanel

CREATE TABLE IF NOT EXISTS settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stream_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pid INTEGER,
  started_at DATETIME NOT NULL,
  stopped_at DATETIME,
  status TEXT DEFAULT 'running',
  peak_viewers INTEGER DEFAULT 0,
  total_commands INTEGER DEFAULT 0,
  log_file TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  user_name TEXT NOT NULL,
  team TEXT NOT NULL DEFAULT 'BLACK',
  total_votes INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  last_active DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_team_score ON leaderboard(team, score DESC);

CREATE TABLE IF NOT EXISTS chat_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  team TEXT NOT NULL DEFAULT 'BLACK',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS round_stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  wins_black INTEGER DEFAULT 0,
  wins_white INTEGER DEFAULT 0,
  current_topic_idx INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO round_stats (id, wins_black, wins_white, current_topic_idx) VALUES (1, 0, 0, 0);
