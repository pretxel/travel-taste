// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { signViewerJwt, verifyViewerJwt } from '@/lib/auth/viewer';

beforeAll(() => {
  process.env.VIEWER_JWT_SECRET = 'a'.repeat(43);
});

describe('viewer JWT', () => {
  it('signs and verifies a token', async () => {
    const token = await signViewerJwt({ viewer_code_id: 'uuid-123', label: 'Mom' });
    const claims = await verifyViewerJwt(token);
    expect(claims.viewer_code_id).toBe('uuid-123');
    expect(claims.label).toBe('Mom');
  });

  it('rejects tampered tokens', async () => {
    const token = await signViewerJwt({ viewer_code_id: 'uuid-123', label: 'Mom' });
    const bad = token.slice(0, -2) + 'AA';
    await expect(verifyViewerJwt(bad)).rejects.toThrow();
  });

  it('rejects expired tokens', async () => {
    const token = await signViewerJwt(
      { viewer_code_id: 'uuid-123', label: 'Mom' },
      { expiresInSec: -10 }
    );
    await expect(verifyViewerJwt(token)).rejects.toThrow();
  });
});
