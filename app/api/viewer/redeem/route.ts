import { NextResponse } from 'next/server';
import { isValidCodeFormat, normalizeCode } from '@/lib/codes/format';
import { verifyCode } from '@/lib/codes/hash';
import { signViewerJwt } from '@/lib/auth/viewer';
import { viewerCookieOptions } from '@/lib/auth/cookies';
import { VIEWER_COOKIE, VIEWER_REDEEM_LIMIT } from '@/lib/constants';
import { checkAndRecord, hashIp } from '@/lib/codes/rate-limit';
import { supabaseServiceRole } from '@/lib/supabase/server';

function clientIp(req: Request) {
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  return fwd.split(',')[0].trim() || '0.0.0.0';
}

const GENERIC_INVALID = () => NextResponse.json({ error: 'Invalid code' }, { status: 401 });

export async function POST(req: Request) {
  const ipH = hashIp(clientIp(req));
  const rl = await checkAndRecord(
    'viewer_redeem',
    ipH,
    VIEWER_REDEEM_LIMIT.count,
    VIEWER_REDEEM_LIMIT.windowSec
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
      { status: 429, headers: { 'retry-after': String(rl.retryAfterSec) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const codeRaw = typeof body?.code === 'string' ? body.code : '';
  if (!isValidCodeFormat(codeRaw)) return GENERIC_INVALID();
  const code = normalizeCode(codeRaw);

  const sb = supabaseServiceRole();
  const { data, error } = await sb
    .from('viewer_codes')
    .select('id, label, code_hash')
    .is('revoked_at', null)
    .limit(200);
  if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 });

  let match: { id: string; label: string } | null = null;
  for (const row of data ?? []) {
    if (await verifyCode(code, row.code_hash)) {
      match = { id: row.id, label: row.label };
      break;
    }
  }
  if (!match) return GENERIC_INVALID();

  await sb
    .from('viewer_codes')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', match.id);
  await sb.from('viewer_sessions').insert({
    code_id: match.id,
    ip_hash: ipH,
    user_agent: req.headers.get('user-agent') ?? '',
  });

  const token = await signViewerJwt({ viewer_code_id: match.id, label: match.label });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VIEWER_COOKIE, token, viewerCookieOptions());
  return res;
}
