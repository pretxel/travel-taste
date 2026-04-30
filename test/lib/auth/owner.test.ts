// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { signOwnerJwt, verifyOwnerJwt } from '@/lib/auth/owner';

beforeAll(() => {
  process.env.OWNER_JWT_SECRET = 'b'.repeat(43);
});

describe('owner JWT', () => {
  it('signs and verifies', async () => {
    const t = await signOwnerJwt();
    const claims = await verifyOwnerJwt(t);
    expect(claims.role).toBe('owner');
  });

  it('rejects expired', async () => {
    const t = await signOwnerJwt({ expiresInSec: -1 });
    await expect(verifyOwnerJwt(t)).rejects.toThrow();
  });

  it('rejects token signed with viewer secret', async () => {
    process.env.VIEWER_JWT_SECRET = 'a'.repeat(43);
    const { signViewerJwt } = await import('@/lib/auth/viewer');
    const viewerToken = await signViewerJwt({ viewer_code_id: 'x', label: 'y' });
    await expect(verifyOwnerJwt(viewerToken)).rejects.toThrow();
  });
});
