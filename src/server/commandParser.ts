import { GameAction } from '../shared/types.js';

const ACTION_MAP: Record<string, GameAction> = {
  // Left (1, l, a, left, lane1, arrow/key)
  'left': 'LEFT',
  'l': 'LEFT',
  'a': 'LEFT',
  'lane1': 'LEFT',
  '1': 'LEFT',

  // Jump (2, j, w, up, jump, hop)
  'jump': 'JUMP',
  'j': 'JUMP',
  'up': 'JUMP',
  'u': 'JUMP',
  'w': 'JUMP',
  'hop': 'JUMP',
  '2': 'JUMP',

  // Right (3, r, d, right, lane3)
  'right': 'RIGHT',
  'r': 'RIGHT',
  'd': 'RIGHT',
  'lane3': 'RIGHT',
  '3': 'RIGHT',
};

/**
 * Parses raw chat message text into a validated GameAction, or returns null if not a command.
 */
export function parseCommand(rawText: string): GameAction | null {
  if (!rawText) return null;

  // Trim and convert to lowercase
  let clean = rawText.trim().toLowerCase();
  if (!clean) return null;

  // Strip leading exclamation mark if present (e.g. !jump -> jump)
  if (clean.startsWith('!')) {
    clean = clean.slice(1).trim();
  }

  return ACTION_MAP[clean] || null;
}
