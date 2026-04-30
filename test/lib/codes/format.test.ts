import { describe, it, expect } from 'vitest';
import { generateCode, groupCode, isValidCodeFormat } from '@/lib/codes/format';

describe('generateCode', () => {
  it('returns a 10-character string', () => {
    expect(generateCode()).toHaveLength(10);
  });

  it('uses Crockford alphabet only (no 0 confusion letters I L O U)', () => {
    const allowed = /^[0-9A-HJKMNP-TV-Z]+$/;
    for (let i = 0; i < 100; i++) {
      const c = generateCode();
      expect(c).toMatch(allowed);
      expect(c).not.toMatch(/[OILU]/);
    }
  });

  it('returns different codes on successive calls', () => {
    const a = generateCode();
    const b = generateCode();
    expect(a).not.toEqual(b);
  });
});

describe('groupCode', () => {
  it('formats 10-char code as 5-5 with hyphen', () => {
    expect(groupCode('ABCDEFGHJK')).toBe('ABCDE-FGHJK');
  });

  it('throws on wrong length', () => {
    expect(() => groupCode('SHORT')).toThrow();
    expect(() => groupCode('ABCDEFGHJKL')).toThrow();
  });
});

describe('isValidCodeFormat', () => {
  it('accepts both grouped and ungrouped 10-char Crockford', () => {
    expect(isValidCodeFormat('ABCDEFGHJK')).toBe(true);
    expect(isValidCodeFormat('ABCDE-FGHJK')).toBe(true);
  });

  it('rejects wrong alphabet, wrong length, empty', () => {
    expect(isValidCodeFormat('ABCDEOGHJK')).toBe(false);
    expect(isValidCodeFormat('ABC')).toBe(false);
    expect(isValidCodeFormat('')).toBe(false);
  });

  it('is case-insensitive (lowercase normalized)', () => {
    expect(isValidCodeFormat('abcde-fghjk')).toBe(true);
  });
});
