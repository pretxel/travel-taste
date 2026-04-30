// @vitest-environment node
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';

beforeAll(() => {
  process.env.OWNER_PASSWORD = 'correct-horse-battery';
  process.env.OWNER_JWT_SECRET = 'b'.repeat(43);
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
});

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

function makeReq(body: object, ip = '1.2.3.4'): Request {
  return new Request('http://localhost/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/login', () => {
  it('rejects wrong password with 401', async () => {
    vi.doMock('@/lib/codes/rate-limit', () => ({
      checkAndRecord: async () => ({ allowed: true, remaining: 4, retryAfterSec: 0 }),
      hashIp: () => 'ipx',
    }));
    const { POST } = await import('@/app/api/admin/login/route');
    const res = await POST(makeReq({ password: 'wrong' }));
    expect(res.status).toBe(401);
  });

  it('accepts correct password and sets owner cookie', async () => {
    vi.doMock('@/lib/codes/rate-limit', () => ({
      checkAndRecord: async () => ({ allowed: true, remaining: 4, retryAfterSec: 0 }),
      hashIp: () => 'ipx',
    }));
    const { POST } = await import('@/app/api/admin/login/route');
    const res = await POST(makeReq({ password: 'correct-horse-battery' }));
    expect(res.status).toBe(200);
    const sc = res.headers.get('set-cookie') ?? '';
    expect(sc).toMatch(/owner_session=/);
    expect(sc).toMatch(/HttpOnly/i);
  });

  it('rate-limits when exceeded', async () => {
    vi.doMock('@/lib/codes/rate-limit', () => ({
      checkAndRecord: async () => ({ allowed: false, remaining: 0, retryAfterSec: 30 }),
      hashIp: () => 'ipx',
    }));
    const { POST } = await import('@/app/api/admin/login/route');
    const res = await POST(makeReq({ password: 'whatever' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('30');
  });
});
