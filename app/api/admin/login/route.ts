import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { signOwnerJwt } from '@/lib/auth/owner';
import { ownerCookieOptions } from '@/lib/auth/cookies';
import { OWNER_COOKIE, OWNER_LOGIN_LIMIT } from '@/lib/constants';
import { checkAndRecord, hashIp } from '@/lib/codes/rate-limit';

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  return fwd.split(',')[0].trim() || '0.0.0.0';
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const ipH = hashIp(ip);
  const rl = await checkAndRecord(
    'owner_login',
    ipH,
    OWNER_LOGIN_LIMIT.count,
    OWNER_LOGIN_LIMIT.windowSec
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
      { status: 429, headers: { 'retry-after': String(rl.retryAfterSec) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = typeof body?.password === 'string' ? body.password : '';
  const expected = process.env.OWNER_PASSWORD ?? '';

  if (!expected || !constantTimeEqual(password, expected)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = await signOwnerJwt();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OWNER_COOKIE, token, ownerCookieOptions());
  return res;
}
