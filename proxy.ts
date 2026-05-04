import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerJwt } from '@/lib/auth/owner';
import { verifyViewerJwt } from '@/lib/auth/viewer';
import { OWNER_COOKIE, VIEWER_COOKIE } from '@/lib/constants';
import { supabaseServiceRole } from '@/lib/supabase/server';

export const config = {
  matcher: ['/feed/:path*', '/admin/:path*', '/api/admin/:path*'],
};

const OWNER_PUBLIC = new Set(['/admin/login', '/api/admin/login']);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ───── Owner-gated ─────
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (OWNER_PUBLIC.has(pathname)) return NextResponse.next();
    const cookie = req.cookies.get(OWNER_COOKIE)?.value;
    if (cookie) {
      try {
        await verifyOwnerJwt(cookie);
        return NextResponse.next();
      } catch {
        /* fall through */
      }
    }
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  // ───── Viewer-gated ─────
  if (pathname.startsWith('/feed')) {
    const cookie = req.cookies.get(VIEWER_COOKIE)?.value;
    if (!cookie) return redirectHome(req);
    try {
      const claims = await verifyViewerJwt(cookie);
      const sb = supabaseServiceRole();
      const { data } = await sb
        .from('viewer_codes')
        .select('revoked_at')
        .eq('id', claims.viewer_code_id)
        .single();
      if (!data || data.revoked_at) return redirectHome(req);
      return NextResponse.next();
    } catch {
      return redirectHome(req);
    }
  }

  return NextResponse.next();
}

function redirectHome(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = '/';
  const res = NextResponse.redirect(url);
  res.cookies.set(VIEWER_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
