import { describe, it, expect } from 'vitest';
import { parseCommand } from '../src/server/commandParser';

describe('commandParser', () => {
  it('should parse 3 core Subway Surfers actions', () => {
    expect(parseCommand('left')).toBe('LEFT');
    expect(parseCommand('jump')).toBe('JUMP');
    expect(parseCommand('right')).toBe('RIGHT');
  });

  it('should handle case insensitivity and whitespace', () => {
    expect(parseCommand('  JUMP  ')).toBe('JUMP');
    expect(parseCommand('LeFt')).toBe('LEFT');
    expect(parseCommand('\n RIGHT \t')).toBe('RIGHT');
  });

  it('should handle exclamation mark prefixes', () => {
    expect(parseCommand('!left')).toBe('LEFT');
    expect(parseCommand('!jump')).toBe('JUMP');
    expect(parseCommand('!right')).toBe('RIGHT');
  });

  it('should handle single-letter and gaming key aliases', () => {
    // Left aliases
    expect(parseCommand('l')).toBe('LEFT');
    expect(parseCommand('a')).toBe('LEFT');
    expect(parseCommand('lane1')).toBe('LEFT');

    // Jump aliases
    expect(parseCommand('j')).toBe('JUMP');
    expect(parseCommand('up')).toBe('JUMP');
    expect(parseCommand('u')).toBe('JUMP');
    expect(parseCommand('w')).toBe('JUMP');
    expect(parseCommand('hop')).toBe('JUMP');

    // Right aliases
    expect(parseCommand('r')).toBe('RIGHT');
    expect(parseCommand('d')).toBe('RIGHT');
    expect(parseCommand('lane3')).toBe('RIGHT');
  });

  it('should map number aliases 1, 2, 3 to Left, Jump, Right', () => {
    expect(parseCommand('1')).toBe('LEFT');
    expect(parseCommand('2')).toBe('JUMP');
    expect(parseCommand('3')).toBe('RIGHT');
  });

  it('should return null for invalid commands or casual chat', () => {
    expect(parseCommand('hello world')).toBeNull();
    expect(parseCommand('poggers')).toBeNull();
    expect(parseCommand('gg')).toBeNull();
    expect(parseCommand('')).toBeNull();
    expect(parseCommand('   ')).toBeNull();
  });
});
