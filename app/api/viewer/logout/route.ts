import { NextResponse } from 'next/server';
import { VIEWER_COOKIE } from '@/lib/constants';
import { expiredCookieOptions } from '@/lib/auth/cookies';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VIEWER_COOKIE, '', expiredCookieOptions());
  return res;
}
