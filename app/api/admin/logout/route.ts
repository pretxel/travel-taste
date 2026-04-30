import { NextResponse } from 'next/server';
import { OWNER_COOKIE } from '@/lib/constants';
import { expiredCookieOptions } from '@/lib/auth/cookies';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OWNER_COOKIE, '', expiredCookieOptions());
  return res;
}
