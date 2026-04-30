import { describe, it, expect } from 'vitest';
import { hashCode, verifyCode } from '@/lib/codes/hash';

describe('hashCode + verifyCode', () => {
  it('verifies a correct code', async () => {
    const code = 'ABCDEFGHJK';
    const hash = await hashCode(code);
    expect(hash).toMatch(/^\$argon2/);
    expect(await verifyCode(code, hash)).toBe(true);
  });

  it('rejects an incorrect code', async () => {
    const hash = await hashCode('ABCDEFGHJK');
    expect(await verifyCode('ZZZZZZZZZZ', hash)).toBe(false);
  });

  it('produces different hashes for the same input (salted)', async () => {
    const a = await hashCode('ABCDEFGHJK');
    const b = await hashCode('ABCDEFGHJK');
    expect(a).not.toEqual(b);
  });

  it('returns false on malformed hash without throwing', async () => {
    expect(await verifyCode('ABCDEFGHJK', 'not-a-hash')).toBe(false);
  });
});
