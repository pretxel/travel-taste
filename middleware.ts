import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerJwt } from '@/lib/auth/owner';
import { OWNER_COOKIE } from '@/lib/constants';

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
  runtime: 'nodejs',
};

const OWNER_PUBLIC = new Set(['/admin/login', '/api/admin/login']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (OWNER_PUBLIC.has(pathname)) return NextResponse.next();

  const cookie = req.cookies.get(OWNER_COOKIE)?.value;
  if (cookie) {
    try {
      await verifyOwnerJwt(cookie);
      return NextResponse.next();
    } catch {
      // fall through
    }
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  return NextResponse.redirect(url);
}
