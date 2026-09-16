import { GameAction } from '../shared/types.js';

const ACTION_MAP: Record<string, GameAction> = {
  // Jump
  'jump': 'JUMP',
  'j': 'JUMP',
  'up': 'JUMP',
  'u': 'JUMP',
  'w': 'JUMP',
  'hop': 'JUMP',
  '1': 'JUMP',

  // Slide
  'slide': 'SLIDE',
  's': 'SLIDE',
  'down': 'SLIDE',
  'd': 'SLIDE',
  'duck': 'SLIDE',
  'crouch': 'SLIDE',
  '2': 'SLIDE',

  // Left
  'left': 'LEFT',
  'l': 'LEFT',
  'a': 'LEFT',
  'lane1': 'LEFT',
  '3': 'LEFT',

  // Right
  'right': 'RIGHT',
  'r': 'RIGHT',
  'lane3': 'RIGHT',
  '4': 'RIGHT',

  // Shield
  'shield': 'SHIELD',
  'boost': 'SHIELD',
  'super': 'SHIELD',
  'power': 'SHIELD',
  '5': 'SHIELD',
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
