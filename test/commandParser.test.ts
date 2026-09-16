import { describe, it, expect } from 'vitest';
import { parseCommand } from '../src/server/commandParser';

describe('commandParser', () => {
  it('should parse basic primary commands', () => {
    expect(parseCommand('jump')).toBe('JUMP');
    expect(parseCommand('slide')).toBe('SLIDE');
    expect(parseCommand('left')).toBe('LEFT');
    expect(parseCommand('right')).toBe('RIGHT');
    expect(parseCommand('shield')).toBe('SHIELD');
  });

  it('should handle case insensitivity and whitespace', () => {
    expect(parseCommand('  JUMP  ')).toBe('JUMP');
    expect(parseCommand('sLiDe')).toBe('SLIDE');
    expect(parseCommand('\n LEFT \t')).toBe('LEFT');
  });

  it('should handle exclamation mark prefixes', () => {
    expect(parseCommand('!jump')).toBe('JUMP');
    expect(parseCommand('!slide')).toBe('SLIDE');
    expect(parseCommand('!left')).toBe('LEFT');
    expect(parseCommand('!right')).toBe('RIGHT');
    expect(parseCommand('!shield')).toBe('SHIELD');
  });

  it('should handle single-letter and gaming key aliases', () => {
    // Jump aliases
    expect(parseCommand('j')).toBe('JUMP');
    expect(parseCommand('up')).toBe('JUMP');
    expect(parseCommand('u')).toBe('JUMP');
    expect(parseCommand('w')).toBe('JUMP');
    expect(parseCommand('hop')).toBe('JUMP');

    // Slide aliases
    expect(parseCommand('s')).toBe('SLIDE');
    expect(parseCommand('down')).toBe('SLIDE');
    expect(parseCommand('d')).toBe('SLIDE');
    expect(parseCommand('duck')).toBe('SLIDE');
    expect(parseCommand('crouch')).toBe('SLIDE');

    // Left aliases
    expect(parseCommand('l')).toBe('LEFT');
    expect(parseCommand('a')).toBe('LEFT');
    expect(parseCommand('lane1')).toBe('LEFT');

    // Right aliases
    expect(parseCommand('r')).toBe('RIGHT');
    expect(parseCommand('lane3')).toBe('RIGHT');

    // Shield aliases
    expect(parseCommand('boost')).toBe('SHIELD');
    expect(parseCommand('super')).toBe('SHIELD');
    expect(parseCommand('power')).toBe('SHIELD');
  });

  it('should handle number aliases', () => {
    expect(parseCommand('1')).toBe('JUMP');
    expect(parseCommand('2')).toBe('SLIDE');
    expect(parseCommand('3')).toBe('LEFT');
    expect(parseCommand('4')).toBe('RIGHT');
    expect(parseCommand('5')).toBe('SHIELD');
  });

  it('should return null for invalid commands or casual chat', () => {
    expect(parseCommand('hello world')).toBeNull();
    expect(parseCommand('poggers')).toBeNull();
    expect(parseCommand('gg')).toBeNull();
    expect(parseCommand('')).toBeNull();
    expect(parseCommand('   ')).toBeNull();
  });
});
